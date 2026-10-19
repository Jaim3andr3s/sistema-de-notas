import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool, transaccion } from '../db.js'
import { autenticar, permitir, ErrorHttp } from '../auth.js'
import { entero, requerido } from '../validar.js'

const router = Router()
router.use(autenticar, permitir('administrador'))

const ROLES = ['estudiante', 'docente', 'administrador']

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

router.post('/grados', async (req, res) => {
  requerido(req.body, ['nombre', 'nivel', 'anio'])
  const { nombre, nivel, jornada = 'Mañana', anio, director_id } = req.body
  const [r] = await pool.query(
    'INSERT INTO grados (nombre, nivel, jornada, anio, director_id) VALUES (?, ?, ?, ?, ?)',
    [nombre, nivel, jornada, anio, director_id || null]
  )
  res.status(201).json({ id: r.insertId })
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
  const { titulo, texto, fecha, grado_id } = req.body
  const [r] = await pool.query(
    'INSERT INTO anuncios (titulo, texto, fecha, grado_id, autor_id) VALUES (?, ?, ?, ?, ?)',
    [titulo, texto, fecha, grado_id || null, req.usuario.id]
  )
  res.status(201).json({ id: r.insertId })
})

router.delete('/anuncios/:id', async (req, res) => {
  await pool.query('DELETE FROM anuncios WHERE id = ?', [entero(req.params.id, 'Anuncio')])
  res.json({ ok: true })
})

router.get('/anuncios', async (req, res) => {
  const [filas] = await pool.query(
    `SELECT a.id, a.titulo, a.texto, a.fecha, a.grado_id, g.nombre AS grado
       FROM anuncios a LEFT JOIN grados g ON g.id = a.grado_id
      ORDER BY a.fecha DESC LIMIT 100`
  )
  res.json(filas)
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
