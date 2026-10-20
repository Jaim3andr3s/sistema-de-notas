import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool, transaccion } from '../db.js'
import { autenticar, permitir, ErrorHttp } from '../auth.js'
import { entero, requerido } from '../validar.js'
import { subirImagen } from '../archivos.js'
import { notificar, familiasDeGrado } from '../notificaciones.js'

const router = Router()
router.use(autenticar, permitir('administrador'))

const ROLES = ['estudiante', 'docente', 'administrador', 'acudiente']

// ---------- Usuarios ----------
router.get('/usuarios', async (req, res) => {
  const { rol, q } = req.query
  const filtros = []
  const params = []
  if (rol) { filtros.push('u.rol = ?'); params.push(rol) }
  if (q) { filtros.push("(u.documento LIKE ? OR CONCAT(u.nombres, ' ', u.apellidos) LIKE ?)"); params.push(`%${q}%`, `%${q}%`) }

  const [filas] = await pool.query(
    `SELECT u.id, u.documento, u.rol, u.nombres, u.apellidos, u.email, u.telefono, u.activo, u.creado_en,
            s.id AS estudiante_id,
            (SELECT g.nombre FROM matriculas m JOIN grados g ON g.id = m.grado_id
              WHERE m.estudiante_id = s.id ORDER BY m.anio DESC LIMIT 1) AS grado
       FROM usuarios u
       LEFT JOIN estudiantes s ON s.usuario_id = u.id
      ${filtros.length ? 'WHERE ' + filtros.join(' AND ') : ''}
      ORDER BY u.apellidos, u.nombres
      LIMIT 500`,
    params
  )
  res.json(filas)
})

// Crea un usuario; si es estudiante y se envía grado_id, lo matricula de una vez
router.post('/usuarios', async (req, res) => {
  requerido(req.body, ['documento', 'clave', 'rol', 'nombres', 'apellidos'])
  const { documento, clave, rol, nombres, apellidos, email, telefono, grado_id, acudiente_nombre, acudiente_telefono } = req.body
  if (!ROLES.includes(rol)) throw new ErrorHttp(400, 'Rol inválido')
  if (String(clave).length < 8) throw new ErrorHttp(400, 'La contraseña debe tener al menos 8 caracteres')

  const id = await transaccion(async (conn) => {
    const [r] = await conn.query(
      'INSERT INTO usuarios (documento, clave_hash, rol, nombres, apellidos, email, telefono) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [String(documento).trim(), await bcrypt.hash(String(clave), 10), rol, nombres, apellidos, email || null, telefono || null]
    )
    if (rol === 'estudiante') {
      const [e] = await conn.query(
        'INSERT INTO estudiantes (usuario_id, acudiente_nombre, acudiente_telefono) VALUES (?, ?, ?)',
        [r.insertId, acudiente_nombre || null, acudiente_telefono || null]
      )
      if (grado_id) {
        await conn.query(
          'INSERT INTO matriculas (estudiante_id, grado_id, anio) SELECT ?, id, anio FROM grados WHERE id = ?',
          [e.insertId, entero(grado_id, 'Grado')]
        )
      }
    }
    return r.insertId
  })
  res.status(201).json({ id })
})

// ---------- Acudientes ----------
router.get('/acudientes/:id', async (req, res) => {
  const [filas] = await pool.query(
    `SELECT e.id AS estudiante_id, u.documento, u.nombres, u.apellidos, a.parentesco,
            (SELECT g.nombre FROM matriculas m JOIN grados g ON g.id = m.grado_id
              WHERE m.estudiante_id = e.id ORDER BY m.anio DESC LIMIT 1) AS grado
       FROM acudientes a JOIN estudiantes e ON e.id = a.estudiante_id JOIN usuarios u ON u.id = e.usuario_id
      WHERE a.acudiente_id = ? ORDER BY u.nombres`,
    [entero(req.params.id, 'Acudiente')]
  )
  res.json(filas)
})

// Vincula un estudiante (por su documento) a un acudiente
router.post('/acudientes', async (req, res) => {
  requerido(req.body, ['acudiente_id', 'documento_estudiante'])
  const acudienteId = entero(req.body.acudiente_id, 'Acudiente')
  const [[a]] = await pool.query("SELECT 1 FROM usuarios WHERE id = ? AND rol = 'acudiente'", [acudienteId])
  if (!a) throw new ErrorHttp(400, 'El usuario no es acudiente')
  const [[e]] = await pool.query(
    'SELECT e.id FROM estudiantes e JOIN usuarios u ON u.id = e.usuario_id WHERE u.documento = ?',
    [String(req.body.documento_estudiante).trim()]
  )
  if (!e) throw new ErrorHttp(404, 'No hay un estudiante con ese documento')
  await pool.query(
    'INSERT INTO acudientes (acudiente_id, estudiante_id, parentesco) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE parentesco = VALUES(parentesco)',
    [acudienteId, e.id, req.body.parentesco?.trim().slice(0, 40) || null]
  )
  res.status(201).json({ ok: true })
})

router.delete('/acudientes/:acudiente/:estudiante', async (req, res) => {
  await pool.query('DELETE FROM acudientes WHERE acudiente_id = ? AND estudiante_id = ?', [
    entero(req.params.acudiente, 'Acudiente'), entero(req.params.estudiante, 'Estudiante'),
  ])
  res.json({ ok: true })
})

router.patch('/usuarios/:id', async (req, res) => {
  const id = entero(req.params.id, 'Usuario')
  const permitidos = ['nombres', 'apellidos', 'email', 'telefono', 'activo']
  const cambios = {}
  for (const c of permitidos) if (c in req.body) cambios[c] = req.body[c]
  if (req.body.clave) {
    if (String(req.body.clave).length < 8) throw new ErrorHttp(400, 'La contraseña debe tener al menos 8 caracteres')
    cambios.clave_hash = await bcrypt.hash(String(req.body.clave), 10)
  }
  if (!Object.keys(cambios).length) throw new ErrorHttp(400, 'No hay cambios')

  const [r] = await pool.query('UPDATE usuarios SET ? WHERE id = ?', [cambios, id])
  if (!r.affectedRows) throw new ErrorHttp(404, 'Usuario no encontrado')
  res.json({ ok: true })
})

// ---------- Grados ----------
router.get('/grados', async (req, res) => {
  const [filas] = await pool.query(
    `SELECT g.id, g.nombre, g.nivel, g.jornada, g.anio, g.director_id,
            CONCAT(d.nombres, ' ', d.apellidos) AS director,
            (SELECT COUNT(*) FROM matriculas m WHERE m.grado_id = g.id AND m.estado = 'activa') AS estudiantes
       FROM grados g LEFT JOIN usuarios d ON d.id = g.director_id
      WHERE (? IS NULL OR g.anio = ?)
      ORDER BY g.anio DESC, g.nivel, g.nombre`,
    [req.query.anio ?? null, req.query.anio ?? null]
  )
  res.json(filas)
})

// ---------- Directores de grupo ----------
// El director de grupo es el docente que responde por los estudiantes de ese grado
const MAX_GRUPOS_DIRECTOR = 2

async function validarDirector(directorId, anio, gradoId = 0) {
  if (!directorId) return null
  const id = entero(directorId, 'Director')
  const [[d]] = await pool.query("SELECT nombres, apellidos FROM usuarios WHERE id = ? AND rol = 'docente' AND activo", [id])
  if (!d) throw new ErrorHttp(400, 'El director de grupo debe ser un docente activo')
  const [grupos] = await pool.query('SELECT nombre FROM grados WHERE director_id = ? AND anio = ? AND id <> ?', [id, anio, gradoId])
  if (grupos.length >= MAX_GRUPOS_DIRECTOR) {
    throw new ErrorHttp(409,
      `${d.nombres} ${d.apellidos} ya es director(a) de ${grupos.map((g) => g.nombre).join(' y ')}. ` +
      `Un docente puede dirigir máximo ${MAX_GRUPOS_DIRECTOR} grupos; quítale uno antes de asignarle otro.`)
  }
  return id
}

router.post('/grados', async (req, res) => {
  requerido(req.body, ['nombre', 'nivel', 'anio'])
  const { nombre, nivel, jornada = 'Mañana', anio, director_id } = req.body
  const director = await validarDirector(director_id, anio)
  const [r] = await pool.query(
    'INSERT INTO grados (nombre, nivel, jornada, anio, director_id) VALUES (?, ?, ?, ?, ?)',
    [nombre, nivel, jornada, anio, director]
  )
  res.status(201).json({ id: r.insertId })
})

// Cambia (o quita, con null) el director de un grado
router.patch('/grados/:id/director', async (req, res) => {
  const [[grado]] = await pool.query('SELECT id, anio FROM grados WHERE id = ?', [entero(req.params.id, 'Grado')])
  if (!grado) throw new ErrorHttp(404, 'Grado no encontrado')
  const director = await validarDirector(req.body.director_id, grado.anio, grado.id)
  await pool.query('UPDATE grados SET director_id = ? WHERE id = ?', [director, grado.id])
  res.json({ ok: true })
})

// ---------- Disponibilidad docente ----------
const DIAS_SEMANA = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

// Quién está en clase y quién en hora libre en un día y hora: ?dia=1..5&hora=HH:MM
// Sin parámetros usa el momento actual (o el lunes a primera hora si no hay clases ahora)
router.get('/disponibilidad', async (req, res) => {
  const [[{ anio }]] = await pool.query('SELECT COALESCE(MAX(anio), YEAR(CURDATE())) AS anio FROM grados')
  const ahora = new Date()
  const horaActual = ahora.toTimeString().slice(0, 5)
  let dia = req.query.dia ? entero(req.query.dia, 'Día') : ahora.getDay()
  let hora = req.query.hora ?? horaActual
  if (dia < 1 || dia > 5) {
    if (req.query.dia) throw new ErrorHttp(400, 'El día debe estar entre 1 (lunes) y 5 (viernes)')
    dia = 1
  }
  if (!/^\d{2}:\d{2}$/.test(hora)) throw new ErrorHttp(400, 'Hora inválida, usa HH:MM')

  const [bloques] = await pool.query(
    `SELECT c.docente_id, TIME_FORMAT(h.hora_inicio, '%H:%i') AS inicio, TIME_FORMAT(h.hora_fin, '%H:%i') AS fin,
            g.nombre AS grado, a.nombre AS asignatura
       FROM horarios h
       JOIN cargas c      ON c.id = h.carga_id
       JOIN grados g      ON g.id = c.grado_id
       JOIN asignaturas a ON a.id = c.asignatura_id
      WHERE g.anio = ? AND h.dia = ?
      ORDER BY h.hora_inicio`,
    [anio, dia]
  )
  const franjas = [...new Map(bloques.map((b) => [b.inicio, { inicio: b.inicio, fin: b.fin }])).values()]

  // Fuera de la jornada se muestra la primera franja para que la consulta sea útil
  const enJornada = franjas.some((f) => f.inicio <= hora && hora < f.fin)
  const enVivo = !req.query.dia && !req.query.hora && enJornada && dia === ahora.getDay()
  if (!req.query.hora && !enVivo && franjas.length) hora = franjas[0].inicio

  const [docentes] = await pool.query(
    `SELECT u.id, u.nombres, u.apellidos,
            (SELECT GROUP_CONCAT(g.nombre ORDER BY g.nivel, g.nombre SEPARATOR ', ') FROM grados g WHERE g.director_id = u.id AND g.anio = ?) AS direccion
       FROM usuarios u
      WHERE u.rol = 'docente' AND u.activo
      ORDER BY u.nombres, u.apellidos`,
    [anio]
  )
  const lista = docentes.map((d) => {
    const suyos = bloques.filter((b) => b.docente_id === d.id)
    const clase = suyos.find((b) => b.inicio <= hora && hora < b.fin) ?? null
    const siguiente = suyos.find((b) => b.inicio > hora) ?? null
    return { ...d, clase, siguiente, clases_dia: suyos.length }
  })
  res.json({ dia, nombre_dia: DIAS_SEMANA[dia], hora, en_vivo: enVivo, franjas, docentes: lista })
})

// Horario semanal y carga de un docente
router.get('/docentes/:id/horario', async (req, res) => {
  const id = entero(req.params.id, 'Docente')
  const [[docente]] = await pool.query("SELECT id, nombres, apellidos, email, telefono FROM usuarios WHERE id = ? AND rol = 'docente'", [id])
  if (!docente) throw new ErrorHttp(404, 'Docente no encontrado')
  const [[{ anio }]] = await pool.query('SELECT COALESCE(MAX(anio), YEAR(CURDATE())) AS anio FROM grados')
  const [bloques] = await pool.query(
    `SELECT h.dia, TIME_FORMAT(h.hora_inicio, '%H:%i') AS inicio, TIME_FORMAT(h.hora_fin, '%H:%i') AS fin,
            CONCAT(a.nombre, ' · ', g.nombre) AS asignatura
       FROM horarios h
       JOIN cargas c      ON c.id = h.carga_id
       JOIN grados g      ON g.id = c.grado_id
       JOIN asignaturas a ON a.id = c.asignatura_id
      WHERE c.docente_id = ? AND g.anio = ?
      ORDER BY h.hora_inicio, h.dia`,
    [id, anio]
  )
  const [cargas] = await pool.query(
    `SELECT a.nombre AS asignatura, g.nombre AS grado, c.intensidad_horaria AS ih
       FROM cargas c JOIN grados g ON g.id = c.grado_id JOIN asignaturas a ON a.id = c.asignatura_id
      WHERE c.docente_id = ? AND g.anio = ?
      ORDER BY g.nivel, g.nombre, a.nombre`,
    [id, anio]
  )
  const [direccion] = await pool.query('SELECT nombre FROM grados WHERE director_id = ? AND anio = ? ORDER BY nivel, nombre', [id, anio])
  res.json({ docente, bloques, cargas, direccion: direccion.map((g) => g.nombre) })
})

// ---------- Asignaturas y cargas ----------
router.get('/asignaturas', async (req, res) => {
  const [filas] = await pool.query('SELECT id, nombre, area FROM asignaturas ORDER BY nombre')
  res.json(filas)
})

router.post('/asignaturas', async (req, res) => {
  requerido(req.body, ['nombre'])
  const [r] = await pool.query('INSERT INTO asignaturas (nombre, area) VALUES (?, ?)', [req.body.nombre, req.body.area || null])
  res.status(201).json({ id: r.insertId })
})

router.get('/grados/:id/cargas', async (req, res) => {
  const [filas] = await pool.query(
    `SELECT c.id, a.nombre AS asignatura, c.intensidad_horaria AS ih, c.docente_id,
            CONCAT(u.nombres, ' ', u.apellidos) AS docente
       FROM cargas c
       JOIN asignaturas a ON a.id = c.asignatura_id
       LEFT JOIN usuarios u ON u.id = c.docente_id
      WHERE c.grado_id = ?
      ORDER BY a.nombre`,
    [entero(req.params.id, 'Grado')]
  )
  res.json(filas)
})

router.post('/cargas', async (req, res) => {
  requerido(req.body, ['grado_id', 'asignatura_id'])
  const { grado_id, asignatura_id, docente_id, intensidad_horaria = 1 } = req.body
  if (docente_id) {
    const [[d]] = await pool.query('SELECT rol FROM usuarios WHERE id = ?', [docente_id])
    if (d?.rol !== 'docente') throw new ErrorHttp(400, 'El usuario asignado no es docente')
  }
  const [r] = await pool.query(
    'INSERT INTO cargas (grado_id, asignatura_id, docente_id, intensidad_horaria) VALUES (?, ?, ?, ?)',
    [grado_id, asignatura_id, docente_id || null, intensidad_horaria]
  )
  res.status(201).json({ id: r.insertId })
})

router.patch('/cargas/:id', async (req, res) => {
  const cambios = {}
  for (const c of ['docente_id', 'intensidad_horaria']) if (c in req.body) cambios[c] = req.body[c]
  if (!Object.keys(cambios).length) throw new ErrorHttp(400, 'No hay cambios')
  await pool.query('UPDATE cargas SET ? WHERE id = ?', [cambios, entero(req.params.id, 'Carga')])
  res.json({ ok: true })
})

// ---------- Matrículas ----------
router.post('/matriculas', async (req, res) => {
  requerido(req.body, ['estudiante_id', 'grado_id'])
  const [r] = await pool.query(
    'INSERT INTO matriculas (estudiante_id, grado_id, anio) SELECT ?, id, anio FROM grados WHERE id = ?',
    [entero(req.body.estudiante_id, 'Estudiante'), entero(req.body.grado_id, 'Grado')]
  )
  if (!r.affectedRows) throw new ErrorHttp(404, 'Grado no encontrado')
  res.status(201).json({ id: r.insertId })
})

router.patch('/matriculas/:id', async (req, res) => {
  const { estado, grado_id } = req.body
  const cambios = {}
  if (estado) cambios.estado = estado
  if (grado_id) cambios.grado_id = entero(grado_id, 'Grado')
  if (!Object.keys(cambios).length) throw new ErrorHttp(400, 'No hay cambios')
  await pool.query('UPDATE matriculas SET ? WHERE id = ?', [cambios, entero(req.params.id, 'Matrícula')])
  res.json({ ok: true })
})

// ---------- Periodos ----------
router.get('/periodos', async (req, res) => {
  const [filas] = await pool.query('SELECT * FROM periodos ORDER BY anio DESC, numero')
  res.json(filas)
})

router.post('/periodos', async (req, res) => {
  requerido(req.body, ['anio', 'numero', 'nombre', 'fecha_inicio', 'fecha_fin'])
  const { anio, numero, nombre, porcentaje = 25, fecha_inicio, fecha_fin } = req.body
  const [r] = await pool.query(
    'INSERT INTO periodos (anio, numero, nombre, porcentaje, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?, ?, ?)',
    [anio, numero, nombre, porcentaje, fecha_inicio, fecha_fin]
  )
  res.status(201).json({ id: r.insertId })
})

// Cerrar / reabrir un periodo: { cerrado: true|false }
router.patch('/periodos/:id', async (req, res) => {
  if (typeof req.body.cerrado !== 'boolean') throw new ErrorHttp(400, 'cerrado debe ser true o false')
  await pool.query('UPDATE periodos SET cerrado = ? WHERE id = ?', [req.body.cerrado, entero(req.params.id, 'Periodo')])
  res.json({ ok: true })
})

// ---------- Anuncios ----------
router.post('/anuncios', async (req, res) => {
  requerido(req.body, ['titulo', 'texto', 'fecha'])
  const { titulo, texto, fecha, grado_id, publico } = req.body
  const [r] = await pool.query(
    'INSERT INTO anuncios (titulo, texto, fecha, grado_id, publico, autor_id) VALUES (?, ?, ?, ?, ?, ?)',
    // Solo los anuncios para toda la institución pueden mostrarse en el sitio web
    [titulo, texto, fecha, grado_id || null, !grado_id && Boolean(publico), req.usuario.id]
  )
  // Anuncio de un grado: a sus familias y docentes; general: a toda la comunidad
  const [destinos] = grado_id
    ? await pool.query(
        `SELECT docente_id AS id FROM cargas WHERE grado_id = ? AND docente_id IS NOT NULL
         UNION SELECT director_id FROM grados WHERE id = ? AND director_id IS NOT NULL`,
        [grado_id, grado_id]
      )
    : await pool.query("SELECT id FROM usuarios WHERE activo AND rol <> 'administrador'")
  notificar([...destinos.map((d) => d.id), ...(grado_id ? await familiasDeGrado(grado_id) : [])], {
    tipo: 'anuncio', titulo: `Anuncio: ${titulo}`, texto, vista: 'inicio',
  })
  res.status(201).json({ id: r.insertId })
})

// ---------- Sitio web: noticias ----------
const CATEGORIAS = ['logros', 'eventos', 'academico', 'cultura', 'deportes', 'institucional']
const siNo = (v) => v === true || v === 'true' || v === '1' || v === 1

function leerNoticia(body) {
  requerido(body, ['titulo', 'resumen', 'contenido', 'fecha'])
  const categoria = body.categoria || 'institucional'
  if (!CATEGORIAS.includes(categoria)) throw new ErrorHttp(400, 'Categoría inválida')
  return {
    titulo: String(body.titulo).trim(),
    resumen: String(body.resumen).trim().slice(0, 300),
    contenido: String(body.contenido).trim(),
    categoria,
    fecha: body.fecha,
    destacada: siNo(body.destacada),
    publicada: body.publicada === undefined ? true : siNo(body.publicada),
  }
}

router.get('/noticias', async (req, res) => {
  const [filas] = await pool.query(
    'SELECT id, titulo, resumen, contenido, categoria, imagen, fecha, destacada, publicada FROM noticias ORDER BY fecha DESC, id DESC'
  )
  res.json(filas)
})

router.post('/noticias', subirImagen.single('imagen'), async (req, res) => {
  const [r] = await pool.query('INSERT INTO noticias SET ?', [{ ...leerNoticia(req.body), imagen: req.file?.filename ?? null, autor_id: req.usuario.id }])
  res.status(201).json({ id: r.insertId })
})

router.put('/noticias/:id', subirImagen.single('imagen'), async (req, res) => {
  const datos = leerNoticia(req.body)
  if (req.file) datos.imagen = req.file.filename
  else if (siNo(req.body.quitar_imagen)) datos.imagen = null
  const [r] = await pool.query('UPDATE noticias SET ? WHERE id = ?', [datos, entero(req.params.id, 'Noticia')])
  if (!r.affectedRows) throw new ErrorHttp(404, 'Noticia no encontrada')
  res.json({ ok: true })
})

router.delete('/noticias/:id', async (req, res) => {
  await pool.query('DELETE FROM noticias WHERE id = ?', [entero(req.params.id, 'Noticia')])
  res.json({ ok: true })
})

// ---------- Sitio web: mensajes de contacto ----------
router.get('/mensajes', async (req, res) => {
  const [filas] = await pool.query('SELECT * FROM mensajes_contacto ORDER BY leido, creado_en DESC LIMIT 200')
  res.json(filas)
})

router.patch('/mensajes/:id', async (req, res) => {
  await pool.query('UPDATE mensajes_contacto SET leido = ? WHERE id = ?', [Boolean(req.body.leido), entero(req.params.id, 'Mensaje')])
  res.json({ ok: true })
})

router.delete('/mensajes/:id', async (req, res) => {
  await pool.query('DELETE FROM mensajes_contacto WHERE id = ?', [entero(req.params.id, 'Mensaje')])
  res.json({ ok: true })
})

router.delete('/anuncios/:id', async (req, res) => {
  await pool.query('DELETE FROM anuncios WHERE id = ?', [entero(req.params.id, 'Anuncio')])
  res.json({ ok: true })
})

router.get('/anuncios', async (req, res) => {
  const [filas] = await pool.query(
    `SELECT a.id, a.titulo, a.texto, a.fecha, a.grado_id, a.publico, g.nombre AS grado
       FROM anuncios a LEFT JOIN grados g ON g.id = a.grado_id
      ORDER BY a.fecha DESC LIMIT 100`
  )
  res.json(filas)
})

// ---------- Publicaciones de Facebook ----------
const HOSTS_FACEBOOK = ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com']
const PARAMETROS_FACEBOOK = ['story_fbid', 'id', 'fbid', 'v', 'set']

// Acepta solo enlaces de facebook.com y deja únicamente los parámetros que identifican la publicación
function enlaceFacebook(valor) {
  let u
  try {
    u = new URL(String(valor ?? '').trim())
  } catch {
    throw new ErrorHttp(400, 'Pega el enlace completo de la publicación (empieza por https://www.facebook.com/...)')
  }
  if (u.protocol !== 'https:' || !HOSTS_FACEBOOK.includes(u.hostname)) {
    throw new ErrorHttp(400, 'El enlace debe ser de una publicación de facebook.com')
  }
  const limpio = new URL(`https://www.facebook.com${u.pathname.replace(/\/+$/, '')}`)
  for (const p of PARAMETROS_FACEBOOK) if (u.searchParams.has(p)) limpio.searchParams.set(p, u.searchParams.get(p))
  if (limpio.pathname.split('/').filter(Boolean).length < 2 && !limpio.search) {
    throw new ErrorHttp(400, 'Ese enlace es de un perfil, no de una publicación. Abre la publicación y copia su enlace.')
  }
  return limpio.toString()
}

router.get('/facebook', async (req, res) => {
  const [filas] = await pool.query('SELECT id, url, descripcion, creado_en FROM publicaciones_facebook ORDER BY id DESC')
  res.json(filas)
})

router.post('/facebook', async (req, res) => {
  const url = enlaceFacebook(req.body.url)
  const descripcion = req.body.descripcion?.trim().slice(0, 200) || null
  const [r] = await pool.query('INSERT INTO publicaciones_facebook (url, descripcion, autor_id) VALUES (?, ?, ?)', [url, descripcion, req.usuario.id])
  res.status(201).json({ id: r.insertId, url })
})

router.delete('/facebook/:id', async (req, res) => {
  await pool.query('DELETE FROM publicaciones_facebook WHERE id = ?', [entero(req.params.id, 'Publicación')])
  res.json({ ok: true })
})

// ---------- Horarios ----------
router.get('/grados/:id/horario', async (req, res) => {
  const [filas] = await pool.query(
    `SELECT h.id, h.carga_id, h.dia, TIME_FORMAT(h.hora_inicio, '%H:%i') AS inicio, TIME_FORMAT(h.hora_fin, '%H:%i') AS fin,
            a.nombre AS asignatura
       FROM horarios h JOIN cargas c ON c.id = h.carga_id JOIN asignaturas a ON a.id = c.asignatura_id
      WHERE c.grado_id = ? ORDER BY h.hora_inicio, h.dia`,
    [entero(req.params.id, 'Grado')]
  )
  res.json(filas)
})

router.post('/horarios', async (req, res) => {
  requerido(req.body, ['carga_id', 'dia', 'hora_inicio', 'hora_fin'])
  const { carga_id, dia, hora_inicio, hora_fin } = req.body
  const [r] = await pool.query(
    'INSERT INTO horarios (carga_id, dia, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)',
    [entero(carga_id, 'Carga'), entero(dia, 'Día'), hora_inicio, hora_fin]
  )
  res.status(201).json({ id: r.insertId })
})

router.delete('/horarios/:id', async (req, res) => {
  await pool.query('DELETE FROM horarios WHERE id = ?', [entero(req.params.id, 'Bloque')])
  res.json({ ok: true })
})

// ---------- Asistencia ----------
// Justificar una falla con excusa: { justificada: true, observacion? }
router.patch('/inasistencias/:id', async (req, res) => {
  await pool.query('UPDATE inasistencias SET justificada = ?, observacion = COALESCE(?, observacion) WHERE id = ?', [
    Boolean(req.body.justificada), req.body.observacion?.trim() || null, entero(req.params.id, 'Inasistencia'),
  ])
  res.json({ ok: true })
})

// ---------- Estadísticas para el inicio ----------
router.get('/estadisticas', async (req, res) => {
  const [roles] = await pool.query('SELECT rol, COUNT(*) AS total FROM usuarios WHERE activo GROUP BY rol')
  const [[{ anio }]] = await pool.query('SELECT COALESCE(MAX(anio), YEAR(CURDATE())) AS anio FROM grados')
  const [porPeriodo] = await pool.query(
    `SELECT p.id, p.nombre, p.cerrado, ROUND(AVG(n.nota), 2) AS promedio, SUM(n.nota < 3) AS notas_en_bajo, COUNT(n.id) AS notas
       FROM periodos p LEFT JOIN notas n ON n.periodo_id = p.id
      WHERE p.anio = ? GROUP BY p.id ORDER BY p.numero`,
    [anio]
  )
  const [porGrado] = await pool.query(
    `SELECT g.id, g.nombre, ROUND(AVG(n.nota), 2) AS promedio,
            COUNT(DISTINCT m.id) AS estudiantes,
            COUNT(DISTINCT CASE WHEN n.nota < 3 THEN m.id END) AS en_riesgo
       FROM grados g
       LEFT JOIN matriculas m ON m.grado_id = g.id AND m.estado = 'activa'
       LEFT JOIN notas n ON n.matricula_id = m.id
      WHERE g.anio = ? GROUP BY g.id ORDER BY g.nivel, g.nombre`,
    [anio]
  )
  const [[obs]] = await pool.query(
    `SELECT COUNT(*) AS total, SUM(tipo = 'convivencia') AS convivencia, SUM(tipo = 'positiva') AS positivas
       FROM observaciones WHERE YEAR(fecha) = ?`,
    [anio]
  )
  const [[act]] = await pool.query(
    `SELECT COUNT(DISTINCT a.id) AS actividades, COUNT(e.entregado_en) AS entregas
       FROM actividades a JOIN periodos p ON p.id = a.periodo_id LEFT JOIN entregas e ON e.actividad_id = a.id
      WHERE p.anio = ?`,
    [anio]
  )
  res.json({
    anio,
    usuarios: Object.fromEntries(roles.map((r) => [r.rol, r.total])),
    por_periodo: porPeriodo,
    por_grado: porGrado,
    observaciones: { total: obs.total, convivencia: Number(obs.convivencia ?? 0), positivas: Number(obs.positivas ?? 0) },
    actividades: act,
  })
})

export default router
