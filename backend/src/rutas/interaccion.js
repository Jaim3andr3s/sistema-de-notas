// Interacción estudiante-docente: muro por asignatura, mensajes privados
// y comentarios privados sobre cada actividad
import { Router } from 'express'
import { pool } from '../db.js'
import { autenticar, ErrorHttp } from '../auth.js'
import { matriculaActual, cargaPermitida } from '../acceso.js'
import { subir } from '../archivos.js'
import { entero } from '../validar.js'
import { notificar } from '../notificaciones.js'

const router = Router()
router.use(autenticar)

const AUTOR = `CONCAT(u.nombres, ' ', u.apellidos) AS autor, u.rol AS autor_rol`

function textoValido(valor, max = 5000) {
  const t = String(valor ?? '').trim()
  if (!t) throw new ErrorHttp(400, 'Escribe un mensaje')
  if (t.length > max) throw new ErrorHttp(400, `El texto no puede superar ${max} caracteres`)
  return t
}

// ---------- Cursos (asignatura de un grado) ----------

// El estudiante ve las asignaturas de su grado; el docente las suyas; el administrador todas
async function cursoPermitido(usuario, cargaId) {
  if (usuario.rol !== 'estudiante') return cargaPermitida(usuario, cargaId)
  const m = await matriculaActual(usuario.id)
  const [[carga]] = await pool.query(
    `SELECT c.id, c.grado_id, c.docente_id, g.nombre AS grado, g.anio, a.nombre AS asignatura
       FROM cargas c
       JOIN grados g      ON g.id = c.grado_id
       JOIN asignaturas a ON a.id = c.asignatura_id
      WHERE c.id = ? AND c.grado_id = ?`,
    [cargaId, m.grado_id]
  )
  if (!carga) throw new ErrorHttp(404, 'Asignatura no encontrada')
  return carga
}

const puedeModerar = (usuario, curso) => usuario.rol === 'administrador' || curso.docente_id === usuario.id

router.get('/cursos', async (req, res) => {
  const u = req.usuario
  const [filtro, valores] =
    u.rol === 'estudiante' ? ['c.grado_id = ?', [(await matriculaActual(u.id)).grado_id]]
    : u.rol === 'docente' ? ['c.docente_id = ?', [u.id]]
    : ['g.anio = (SELECT MAX(anio) FROM grados)', []]
  const [filas] = await pool.query(
    `SELECT c.id, a.nombre AS asignatura, g.nombre AS grado, CONCAT(d.nombres, ' ', d.apellidos) AS docente,
            (SELECT COUNT(*) FROM publicaciones p WHERE p.carga_id = c.id) AS publicaciones,
            (SELECT MAX(p.creado_en) FROM publicaciones p WHERE p.carga_id = c.id) AS ultima
       FROM cargas c
       JOIN grados g      ON g.id = c.grado_id
       JOIN asignaturas a ON a.id = c.asignatura_id
       LEFT JOIN usuarios d ON d.id = c.docente_id
      WHERE ${filtro}
      ORDER BY g.nivel, g.nombre, a.nombre`,
    valores
  )
  res.json(filas)
})

// ---------- Muro ----------

router.get('/cursos/:id/publicaciones', async (req, res) => {
  const curso = await cursoPermitido(req.usuario, entero(req.params.id, 'Asignatura'))
  const [publicaciones] = await pool.query(
    `SELECT p.id, p.texto, p.archivo, p.archivo_nombre, p.fijada, p.creado_en, p.autor_id, ${AUTOR}
       FROM publicaciones p JOIN usuarios u ON u.id = p.autor_id
      WHERE p.carga_id = ?
      ORDER BY p.fijada DESC, p.creado_en DESC, p.id DESC
      LIMIT 50`,
    [curso.id]
  )
  const ids = publicaciones.map((p) => p.id)
  const [comentarios] = ids.length
    ? await pool.query(
        `SELECT c.id, c.publicacion_id, c.texto, c.creado_en, c.autor_id, ${AUTOR}
           FROM comentarios c JOIN usuarios u ON u.id = c.autor_id
          WHERE c.publicacion_id IN (?)
          ORDER BY c.creado_en, c.id`,
        [ids]
      )
    : [[]]
  const moderador = puedeModerar(req.usuario, curso)
  res.json({
    curso: { ...curso, moderador },
    publicaciones: publicaciones.map((p) => ({
      ...p,
      puede_borrar: moderador || p.autor_id === req.usuario.id,
      comentarios: comentarios
        .filter((c) => c.publicacion_id === p.id)
        .map((c) => ({ ...c, puede_borrar: moderador || c.autor_id === req.usuario.id })),
    })),
  })
})

router.post('/cursos/:id/publicaciones', subir.single('archivo'), async (req, res) => {
  const curso = await cursoPermitido(req.usuario, entero(req.params.id, 'Asignatura'))
  const fijada = puedeModerar(req.usuario, curso) && ['true', '1', true].includes(req.body.fijada)
  const [r] = await pool.query('INSERT INTO publicaciones SET ?', [{
    carga_id: curso.id,
    autor_id: req.usuario.id,
    texto: textoValido(req.body.texto),
    archivo: req.file?.filename ?? null,
    archivo_nombre: req.file?.originalname ?? null,
    fijada,
  }])
  // Lo que publica el docente les llega a los estudiantes del grado
  if (puedeModerar(req.usuario, curso)) {
    const [estudiantes] = await pool.query(
      "SELECT e.usuario_id AS id FROM matriculas m JOIN estudiantes e ON e.id = m.estudiante_id WHERE m.grado_id = ? AND m.estado = 'activa'",
      [curso.grado_id]
    )
    notificar(estudiantes.map((e) => e.id), {
      tipo: 'muro', titulo: `Nueva publicación en ${curso.asignatura}`, texto: req.body.texto.trim().slice(0, 140), vista: 'clases',
    })
  }
  res.status(201).json({ id: r.insertId })
})

async function publicacionPermitida(usuario, id) {
  const [[p]] = await pool.query('SELECT id, carga_id, autor_id FROM publicaciones WHERE id = ?', [id])
  if (!p) throw new ErrorHttp(404, 'Publicación no encontrada')
  return { p, curso: await cursoPermitido(usuario, p.carga_id) }
}

router.patch('/publicaciones/:id/fijar', async (req, res) => {
  const { p, curso } = await publicacionPermitida(req.usuario, entero(req.params.id, 'Publicación'))
  if (!puedeModerar(req.usuario, curso)) throw new ErrorHttp(403, 'Solo el docente puede fijar publicaciones')
  await pool.query('UPDATE publicaciones SET fijada = NOT fijada WHERE id = ?', [p.id])
  res.json({ ok: true })
})

router.delete('/publicaciones/:id', async (req, res) => {
  const { p, curso } = await publicacionPermitida(req.usuario, entero(req.params.id, 'Publicación'))
  if (!puedeModerar(req.usuario, curso) && p.autor_id !== req.usuario.id) {
    throw new ErrorHttp(403, 'No puedes borrar esta publicación')
  }
  await pool.query('DELETE FROM publicaciones WHERE id = ?', [p.id])
  res.json({ ok: true })
})

router.post('/publicaciones/:id/comentarios', async (req, res) => {
  const { p } = await publicacionPermitida(req.usuario, entero(req.params.id, 'Publicación'))
  const [r] = await pool.query('INSERT INTO comentarios SET ?', [{
    publicacion_id: p.id, autor_id: req.usuario.id, texto: textoValido(req.body.texto, 2000),
  }])
  res.status(201).json({ id: r.insertId })
})

router.delete('/comentarios/:id', async (req, res) => {
  const [[c]] = await pool.query('SELECT id, publicacion_id, autor_id FROM comentarios WHERE id = ?', [entero(req.params.id, 'Comentario')])
  if (!c) throw new ErrorHttp(404, 'Comentario no encontrado')
  const { curso } = await publicacionPermitida(req.usuario, c.publicacion_id)
  if (!puedeModerar(req.usuario, curso) && c.autor_id !== req.usuario.id) {
    throw new ErrorHttp(403, 'No puedes borrar este comentario')
  }
  await pool.query('DELETE FROM comentarios WHERE id = ?', [c.id])
  res.json({ ok: true })
})

// ---------- Mensajes privados ----------

// Docentes y director de los grados indicados
async function docentesDeGrados(grados) {
  if (!grados.length) return []
  const [docentes] = await pool.query(
    `SELECT u.id, u.nombres, u.apellidos, u.rol,
            CONCAT_WS(' · ', IF(MAX(g.director_id = u.id), CONCAT('Director(a) de ', GROUP_CONCAT(DISTINCT IF(g.director_id = u.id, g.nombre, NULL))), NULL),
                      GROUP_CONCAT(DISTINCT CONCAT(a.nombre, ' ', g.nombre) ORDER BY a.nombre SEPARATOR ', ')) AS detalle
       FROM usuarios u
       JOIN grados g ON g.id IN (?)
       LEFT JOIN cargas c      ON c.docente_id = u.id AND c.grado_id = g.id
       LEFT JOIN asignaturas a ON a.id = c.asignatura_id
      WHERE u.activo AND (c.id IS NOT NULL OR g.director_id = u.id)
      GROUP BY u.id
      ORDER BY u.nombres, u.apellidos`,
    [grados]
  )
  return docentes
}

const coordinacion = async () =>
  (await pool.query("SELECT id, nombres, apellidos, rol, 'Coordinación' AS detalle FROM usuarios WHERE rol = 'administrador' AND activo"))[0]

// Con quién puede iniciar una conversación cada rol
async function contactos(usuario) {
  if (usuario.rol === 'acudiente') {
    const [grados] = await pool.query(
      `SELECT DISTINCT m.grado_id FROM acudientes a
         JOIN matriculas m ON m.estudiante_id = a.estudiante_id AND m.estado = 'activa'
        WHERE a.acudiente_id = ?`,
      [usuario.id]
    )
    return [...(await coordinacion()), ...(await docentesDeGrados(grados.map((g) => g.grado_id)))]
  }
  if (usuario.rol === 'estudiante') {
    return docentesDeGrados([(await matriculaActual(usuario.id)).grado_id])
  }
  if (usuario.rol === 'docente') {
    const [estudiantes] = await pool.query(
      `SELECT u.id, u.nombres, u.apellidos, u.rol, GROUP_CONCAT(DISTINCT g.nombre) AS detalle
         FROM matriculas m
         JOIN estudiantes e ON e.id = m.estudiante_id
         JOIN usuarios u    ON u.id = e.usuario_id
         JOIN grados g      ON g.id = m.grado_id
        WHERE m.estado = 'activa' AND u.activo
          AND (g.director_id = ? OR EXISTS (SELECT 1 FROM cargas c WHERE c.grado_id = g.id AND c.docente_id = ?))
        GROUP BY u.id
        ORDER BY u.apellidos, u.nombres`,
      [usuario.id, usuario.id]
    )
    const [acudientes] = await pool.query(
      `SELECT u.id, u.nombres, u.apellidos, u.rol,
              CONCAT('Acudiente de ', GROUP_CONCAT(DISTINCT CONCAT(eu.nombres, ' (', g.nombre, ')') SEPARATOR ', ')) AS detalle
         FROM acudientes ac
         JOIN usuarios u     ON u.id = ac.acudiente_id
         JOIN estudiantes e  ON e.id = ac.estudiante_id
         JOIN usuarios eu    ON eu.id = e.usuario_id
         JOIN matriculas m   ON m.estudiante_id = e.id AND m.estado = 'activa'
         JOIN grados g       ON g.id = m.grado_id
        WHERE u.activo
          AND (g.director_id = ? OR EXISTS (SELECT 1 FROM cargas c WHERE c.grado_id = g.id AND c.docente_id = ?))
        GROUP BY u.id
        ORDER BY u.apellidos, u.nombres`,
      [usuario.id, usuario.id]
    )
    return [...(await coordinacion()), ...estudiantes, ...acudientes]
  }
  const [todos] = await pool.query(
    'SELECT id, nombres, apellidos, rol, NULL AS detalle FROM usuarios WHERE activo AND id <> ? ORDER BY rol, apellidos, nombres',
    [usuario.id]
  )
  return todos
}

// Se puede escribir a un contacto, o responder a quien ya escribió primero
async function exigirPuedeEscribir(usuario, otroId) {
  if (otroId === usuario.id) throw new ErrorHttp(400, 'No puedes escribirte a ti mismo')
  if ((await contactos(usuario)).some((c) => c.id === otroId)) return
  const [[previo]] = await pool.query('SELECT 1 FROM mensajes WHERE remitente_id = ? AND destinatario_id = ? LIMIT 1', [otroId, usuario.id])
  if (!previo) throw new ErrorHttp(403, 'No puedes enviar mensajes a este usuario')
}

router.get('/contactos', async (req, res) => {
  res.json(await contactos(req.usuario))
})

router.get('/mensajes', async (req, res) => {
  const yo = req.usuario.id
  const [filas] = await pool.query(
    `SELECT t.otro_id AS id, u.nombres, u.apellidos, u.rol, t.sin_leer,
            m.texto AS ultimo, m.creado_en AS fecha, m.remitente_id = ? AS mio
       FROM (SELECT IF(remitente_id = ?, destinatario_id, remitente_id) AS otro_id,
                    MAX(id) AS ultimo_id,
                    SUM(destinatario_id = ? AND leido_en IS NULL) AS sin_leer
               FROM mensajes
              WHERE remitente_id = ? OR destinatario_id = ?
              GROUP BY otro_id) t
       JOIN mensajes m ON m.id = t.ultimo_id
       JOIN usuarios u ON u.id = t.otro_id
      ORDER BY m.id DESC`,
    [yo, yo, yo, yo, yo]
  )
  res.json(filas.map((f) => ({ ...f, sin_leer: Number(f.sin_leer), mio: Boolean(f.mio) })))
})

router.get('/mensajes/no-leidos', async (req, res) => {
  const [[r]] = await pool.query('SELECT COUNT(*) AS total FROM mensajes WHERE destinatario_id = ? AND leido_en IS NULL', [req.usuario.id])
  res.json(r)
})

router.get('/mensajes/:id', async (req, res) => {
  const yo = req.usuario.id
  const otroId = entero(req.params.id, 'Usuario')
  const [[otro]] = await pool.query('SELECT id, nombres, apellidos, rol FROM usuarios WHERE id = ?', [otroId])
  if (!otro) throw new ErrorHttp(404, 'Usuario no encontrado')
  const [mensajes] = await pool.query(
    `SELECT id, texto, creado_en, leido_en, remitente_id = ? AS mio
       FROM (SELECT * FROM mensajes
              WHERE (remitente_id = ? AND destinatario_id = ?) OR (remitente_id = ? AND destinatario_id = ?)
              ORDER BY id DESC LIMIT 200) t
      ORDER BY id`,
    [yo, yo, otroId, otroId, yo]
  )
  await pool.query('UPDATE mensajes SET leido_en = NOW() WHERE remitente_id = ? AND destinatario_id = ? AND leido_en IS NULL', [otroId, yo])
  res.json({ otro, mensajes: mensajes.map((m) => ({ ...m, mio: Boolean(m.mio) })) })
})

router.post('/mensajes/:id', async (req, res) => {
  const otroId = entero(req.params.id, 'Usuario')
  await exigirPuedeEscribir(req.usuario, otroId)
  const [r] = await pool.query('INSERT INTO mensajes SET ?', [{
    remitente_id: req.usuario.id, destinatario_id: otroId, texto: textoValido(req.body.texto, 2000),
  }])
  res.status(201).json({ id: r.insertId })
})

// ---------- Comentarios privados sobre una actividad ----------

// Devuelve la actividad y la matrícula cuya conversación se consulta
async function hiloPermitido(usuario, actividadId, matriculaParam) {
  const [[a]] = await pool.query(
    'SELECT a.id, a.carga_id, c.grado_id FROM actividades a JOIN cargas c ON c.id = a.carga_id WHERE a.id = ?',
    [actividadId]
  )
  if (!a) throw new ErrorHttp(404, 'Actividad no encontrada')
  if (usuario.rol === 'estudiante') {
    const m = await matriculaActual(usuario.id)
    if (m.grado_id !== a.grado_id) throw new ErrorHttp(404, 'Actividad no encontrada')
    return { a, matriculaId: m.id }
  }
  const carga = await cargaPermitida(usuario, a.carga_id)
  const matriculaId = entero(matriculaParam, 'Matrícula')
  const [[m]] = await pool.query("SELECT id FROM matriculas WHERE id = ? AND grado_id = ? AND estado = 'activa'", [matriculaId, carga.grado_id])
  if (!m) throw new ErrorHttp(400, `La matrícula no pertenece a ${carga.grado}`)
  return { a, matriculaId }
}

router.get('/actividades/:id/comentarios', async (req, res) => {
  const { a, matriculaId } = await hiloPermitido(req.usuario, entero(req.params.id, 'Actividad'), req.query.matricula)
  const [filas] = await pool.query(
    `SELECT c.id, c.texto, c.creado_en, c.autor_id = ? AS mio, ${AUTOR}
       FROM comentarios_entrega c JOIN usuarios u ON u.id = c.autor_id
      WHERE c.actividad_id = ? AND c.matricula_id = ?
      ORDER BY c.creado_en, c.id`,
    [req.usuario.id, a.id, matriculaId]
  )
  res.json(filas.map((f) => ({ ...f, mio: Boolean(f.mio) })))
})

router.post('/actividades/:id/comentarios', async (req, res) => {
  const { a, matriculaId } = await hiloPermitido(req.usuario, entero(req.params.id, 'Actividad'), req.body.matricula_id)
  const texto = textoValido(req.body.texto, 2000)
  const [r] = await pool.query('INSERT INTO comentarios_entrega SET ?', [{
    actividad_id: a.id, matricula_id: matriculaId, autor_id: req.usuario.id, texto,
  }])
  // Avisa a la otra parte de la conversación
  const [[info]] = await pool.query(
    `SELECT x.titulo, c.docente_id, e.usuario_id AS estudiante_id, CONCAT(u.nombres, ' ', u.apellidos) AS estudiante
       FROM actividades x JOIN cargas c ON c.id = x.carga_id
       JOIN matriculas m ON m.id = ? JOIN estudiantes e ON e.id = m.estudiante_id JOIN usuarios u ON u.id = e.usuario_id
      WHERE x.id = ?`,
    [matriculaId, a.id]
  )
  const esEstudiante = req.usuario.rol === 'estudiante'
  notificar([esEstudiante ? info.docente_id : info.estudiante_id], {
    tipo: 'comentario',
    titulo: esEstudiante ? `${info.estudiante} comentó una actividad` : 'Tu docente respondió tu comentario',
    texto: `${info.titulo}: ${texto.slice(0, 120)}`,
    vista: 'actividades',
  })
  res.status(201).json({ id: r.insertId })
})

export default router
