import { Router } from 'express'
import { pool } from '../db.js'
import { autenticar, permitir, ErrorHttp } from '../auth.js'
import { matriculaActual } from '../acceso.js'
import { boletin, ponderado, semaforoGrado } from '../academico.js'
import { subir } from '../archivos.js'
import { entero } from '../validar.js'
import { codigoMatricula } from '../verificacion.js'

// Las consultas trabajan sobre req.estudianteUid: el propio estudiante, o el hijo que elige un acudiente
export const vistasEstudiante = Router({ mergeParams: true })
const router = vistasEstudiante

router.get('/perfil', async (req, res) => {
  const [[perfil]] = await pool.query(
    `SELECT u.documento, u.nombres, u.apellidos, u.email, u.telefono,
            e.fecha_nacimiento, e.acudiente_nombre, e.acudiente_telefono
       FROM usuarios u JOIN estudiantes e ON e.usuario_id = u.id
      WHERE u.id = ?`,
    [req.estudianteUid]
  )
  res.json({ ...perfil, matricula: await matriculaActual(req.estudianteUid) })
})

// Notas por asignatura con un arreglo alineado a los periodos del año
router.get('/notas', async (req, res) => {
  const m = await matriculaActual(req.estudianteUid)

  const [periodos] = await pool.query(
    'SELECT id, numero, nombre, porcentaje, cerrado FROM periodos WHERE anio = ? ORDER BY numero',
    [m.anio]
  )
  const [cargas] = await pool.query(
    `SELECT c.id, a.nombre AS asignatura, a.area, c.intensidad_horaria AS ih,
            CONCAT(u.nombres, ' ', u.apellidos) AS docente
       FROM cargas c
       JOIN asignaturas a ON a.id = c.asignatura_id
       LEFT JOIN usuarios u ON u.id = c.docente_id
      WHERE c.grado_id = ?
      ORDER BY a.nombre`,
    [m.grado_id]
  )
  const [notas] = await pool.query(
    'SELECT carga_id, periodo_id, nota, observacion FROM notas WHERE matricula_id = ?',
    [m.id]
  )
  const [fallas] = await pool.query(
    `SELECT carga_id, SUM(tipo = 'falla') AS fallas, SUM(tipo = 'retardo') AS retardos, SUM(justificada) AS justificadas
       FROM inasistencias WHERE matricula_id = ? GROUP BY carga_id`,
    [m.id]
  )

  const asignaturas = cargas.map((c) => {
    const f = fallas.find((x) => x.carga_id === c.id)
    const porPeriodo = periodos.map((p) => notas.find((n) => n.carga_id === c.id && n.periodo_id === p.id)?.nota ?? null)
    const acum = ponderado(periodos.map((p, i) => ({ valor: porPeriodo[i], peso: p.porcentaje })))
    return {
      ...c,
      notas: porPeriodo,
      acumulado: acum == null ? null : Math.round(acum * 10) / 10,
      fallas: Number(f?.fallas ?? 0),
      retardos: Number(f?.retardos ?? 0),
      justificadas: Number(f?.justificadas ?? 0),
    }
  })

  res.json({ anio: m.anio, grado: m.grado, periodos, asignaturas })
})

router.get('/horario', async (req, res) => {
  const m = await matriculaActual(req.estudianteUid)
  const [bloques] = await pool.query(
    `SELECT h.dia, TIME_FORMAT(h.hora_inicio, '%H:%i') AS inicio, TIME_FORMAT(h.hora_fin, '%H:%i') AS fin,
            a.nombre AS asignatura, CONCAT(u.nombres, ' ', u.apellidos) AS docente
       FROM horarios h
       JOIN cargas c      ON c.id = h.carga_id
       JOIN asignaturas a ON a.id = c.asignatura_id
       LEFT JOIN usuarios u ON u.id = c.docente_id
      WHERE c.grado_id = ?
      ORDER BY h.hora_inicio, h.dia`,
    [m.grado_id]
  )
  res.json({ grado: m.grado, bloques })
})

router.get('/inasistencias', async (req, res) => {
  const m = await matriculaActual(req.estudianteUid)
  const [filas] = await pool.query(
    `SELECT i.id, i.fecha, i.tipo, i.justificada, i.observacion, a.nombre AS asignatura
       FROM inasistencias i
       JOIN cargas c      ON c.id = i.carga_id
       JOIN asignaturas a ON a.id = c.asignatura_id
      WHERE i.matricula_id = ?
      ORDER BY i.fecha DESC`,
    [m.id]
  )
  res.json(filas)
})

router.get('/anuncios', async (req, res) => {
  const m = await matriculaActual(req.estudianteUid)
  const [filas] = await pool.query(
    `SELECT id, titulo, texto, fecha FROM anuncios
      WHERE grado_id IS NULL OR grado_id = ?
      ORDER BY fecha DESC LIMIT 20`,
    [m.grado_id]
  )
  res.json(filas)
})

// ---------- Actividades ----------
const CAMPOS_ACTIVIDAD = `a.id, a.titulo, a.descripcion, a.tipo, a.porcentaje, a.fecha_entrega, a.entrega_en_linea,
  a.archivo, a.archivo_nombre, a.creado_en, p.nombre AS periodo, p.id AS periodo_id, s.nombre AS asignatura,
  CONCAT(u.nombres, ' ', u.apellidos) AS docente`

const JOIN_ACTIVIDAD = `FROM actividades a
  JOIN cargas c      ON c.id = a.carga_id
  JOIN asignaturas s ON s.id = c.asignatura_id
  JOIN periodos p    ON p.id = a.periodo_id
  LEFT JOIN usuarios u ON u.id = c.docente_id`

router.get('/actividades', async (req, res) => {
  const m = await matriculaActual(req.estudianteUid)
  const [filas] = await pool.query(
    `SELECT ${CAMPOS_ACTIVIDAD}, e.entregado_en, e.nota, e.calificado_en,
            JSON_LENGTH(a.preguntas) AS num_preguntas
       ${JOIN_ACTIVIDAD}
       LEFT JOIN entregas e ON e.actividad_id = a.id AND e.matricula_id = ?
      WHERE c.grado_id = ?
      ORDER BY (a.fecha_entrega IS NULL), a.fecha_entrega DESC, a.id DESC`,
    [m.id, m.grado_id]
  )
  res.json(filas)
})

async function actividadDelEstudiante(usuarioId, actividadId) {
  const m = await matriculaActual(usuarioId)
  const [[a]] = await pool.query(
    `SELECT ${CAMPOS_ACTIVIDAD}, a.preguntas, p.cerrado AS periodo_cerrado ${JOIN_ACTIVIDAD} WHERE a.id = ? AND c.grado_id = ?`,
    [actividadId, m.grado_id]
  )
  if (!a) throw new ErrorHttp(404, 'Actividad no encontrada')
  return { m, a }
}

router.get('/actividades/:id', async (req, res) => {
  const { m, a } = await actividadDelEstudiante(req.estudianteUid, entero(req.params.id, 'Actividad'))
  const [[entrega]] = await pool.query(
    `SELECT texto, archivo, archivo_nombre, respuestas, entregado_en, nota, retroalimentacion, calificado_en
       FROM entregas WHERE actividad_id = ? AND matricula_id = ?`,
    [a.id, m.id]
  )
  // Las respuestas correctas solo se muestran después de presentar el cuestionario
  const preguntas = a.preguntas?.map((p) => ({
    enunciado: p.enunciado,
    opciones: p.opciones,
    ...(entrega?.entregado_en ? { correcta: p.correcta } : {}),
  }))
  res.json({ ...a, preguntas: preguntas ?? null, entrega: entrega ?? null })
})

router.post('/actividades/:id/entrega', subir.single('archivo'), async (req, res) => {
  const { m, a } = await actividadDelEstudiante(req.estudianteUid, entero(req.params.id, 'Actividad'))
  if (!a.entrega_en_linea) throw new ErrorHttp(400, 'Esta actividad se entrega de forma presencial')
  if (a.periodo_cerrado) throw new ErrorHttp(409, 'El periodo de esta actividad ya está cerrado')

  const [[previa]] = await pool.query(
    'SELECT id, entregado_en, calificado_en FROM entregas WHERE actividad_id = ? AND matricula_id = ?',
    [a.id, m.id]
  )
  if (previa?.calificado_en) throw new ErrorHttp(409, 'La actividad ya fue calificada; no se puede volver a entregar')

  let texto = req.body.texto?.trim() || null
  let respuestas = null
  let nota = null

  if (a.tipo === 'cuestionario') {
    if (previa?.entregado_en) throw new ErrorHttp(409, 'Ya presentaste este cuestionario')
    respuestas = JSON.parse(req.body.respuestas || '[]')
    if (!Array.isArray(respuestas) || respuestas.length !== a.preguntas.length) {
      throw new ErrorHttp(400, 'Debes responder todas las preguntas')
    }
    // Calificación automática: 1.0 + 4.0 × (aciertos / total)
    const aciertos = a.preguntas.filter((p, i) => Number(respuestas[i]) === p.correcta).length
    nota = Math.round((1 + (4 * aciertos) / a.preguntas.length) * 10) / 10
  } else if (!texto && !req.file) {
    throw new ErrorHttp(400, 'Escribe una respuesta o adjunta un archivo')
  }

  await pool.query(
    `INSERT INTO entregas (actividad_id, matricula_id, texto, archivo, archivo_nombre, respuestas, entregado_en, nota, calificado_en)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)
     ON DUPLICATE KEY UPDATE texto = VALUES(texto),
       archivo = COALESCE(VALUES(archivo), archivo), archivo_nombre = COALESCE(VALUES(archivo_nombre), archivo_nombre),
       respuestas = VALUES(respuestas), entregado_en = NOW(), nota = VALUES(nota), calificado_en = VALUES(calificado_en)`,
    [
      a.id, m.id, texto, req.file?.filename ?? null, req.file?.originalname ?? null,
      respuestas ? JSON.stringify(respuestas) : null, nota, nota != null ? new Date() : null,
    ]
  )
  res.status(201).json({ ok: true, nota })
})

// ---------- Carnet y constancia de estudio ----------
router.get('/carnet', async (req, res) => {
  const m = await matriculaActual(req.estudianteUid)
  const [[u]] = await pool.query('SELECT documento, nombres, apellidos FROM usuarios WHERE id = ?', [req.estudianteUid])
  res.json({ ...u, grado: m.grado, jornada: m.jornada, anio: m.anio, estado: m.estado, director: m.director, codigo: codigoMatricula(m.id) })
})

// ---------- Planes de mejoramiento ----------
router.get('/mejoramiento', async (req, res) => {
  const m = await matriculaActual(req.estudianteUid)
  const [planes] = await pool.query(
    `SELECT p.id, p.descripcion, p.fecha_limite, p.estado, p.entrega_texto, p.entrega_archivo, p.entrega_archivo_nombre, p.entregado_en,
            p.nota_recuperacion, p.observacion_docente, p.evaluado_en, s.nombre AS asignatura, pe.nombre AS periodo,
            CONCAT(u.nombres, ' ', u.apellidos) AS docente, n.nota AS nota_periodo
       FROM planes_mejoramiento p
       JOIN cargas c ON c.id = p.carga_id JOIN asignaturas s ON s.id = c.asignatura_id JOIN periodos pe ON pe.id = p.periodo_id
       LEFT JOIN usuarios u ON u.id = c.docente_id
       LEFT JOIN notas n ON n.matricula_id = p.matricula_id AND n.carga_id = p.carga_id AND n.periodo_id = p.periodo_id
      WHERE p.matricula_id = ?
      ORDER BY (p.estado IN ('aprobado', 'no_aprobado')), p.fecha_limite`,
    [m.id]
  )
  res.json(planes)
})

router.post('/mejoramiento/:id/entrega', subir.single('archivo'), async (req, res) => {
  const m = await matriculaActual(req.estudianteUid)
  const [[plan]] = await pool.query('SELECT id, estado FROM planes_mejoramiento WHERE id = ? AND matricula_id = ?', [entero(req.params.id, 'Plan'), m.id])
  if (!plan) throw new ErrorHttp(404, 'Plan no encontrado')
  if (['aprobado', 'no_aprobado'].includes(plan.estado)) throw new ErrorHttp(409, 'Este plan ya fue evaluado')
  const texto = req.body.texto?.trim() || null
  if (!texto && !req.file) throw new ErrorHttp(400, 'Escribe una respuesta o adjunta un archivo')
  await pool.query(
    `UPDATE planes_mejoramiento SET estado = 'entregado', entrega_texto = ?, entregado_en = NOW(),
            entrega_archivo = COALESCE(?, entrega_archivo), entrega_archivo_nombre = COALESCE(?, entrega_archivo_nombre)
      WHERE id = ?`,
    [texto, req.file?.filename ?? null, req.file?.originalname ?? null, plan.id]
  )
  res.json({ ok: true })
})

// ---------- Semáforo ----------
router.get('/semaforo', async (req, res) => {
  const m = await matriculaActual(req.estudianteUid)
  const { periodo, umbrales, estudiantes } = await semaforoGrado(m.grado_id)
  const propio = estudiantes.find((e) => e.matricula_id === m.id)
  if (!propio) throw new ErrorHttp(404, 'No tienes una matrícula activa')
  res.json({ periodo, umbrales, ...propio })
})

// ---------- Observador ----------
router.get('/observador', async (req, res) => {
  const m = await matriculaActual(req.estudianteUid)
  const [filas] = await pool.query(
    `SELECT o.id, o.fecha, o.tipo, o.tipificacion, o.descripcion, o.accion, o.descargos, o.descargos_en,
            o.notificado_acudiente, CONCAT(u.nombres, ' ', u.apellidos) AS autor
       FROM observaciones o LEFT JOIN usuarios u ON u.id = o.autor_id
      WHERE o.matricula_id = ?
      ORDER BY o.fecha DESC, o.id DESC`,
    [m.id]
  )
  res.json(filas)
})

// El estudiante deja su versión (descargos) una sola vez
router.post('/observador/:id/descargos', async (req, res) => {
  const m = await matriculaActual(req.estudianteUid)
  const texto = req.body.descargos?.trim()
  if (!texto) throw new ErrorHttp(400, 'Escribe tus descargos')
  const [r] = await pool.query(
    'UPDATE observaciones SET descargos = ?, descargos_en = NOW() WHERE id = ? AND matricula_id = ? AND descargos IS NULL',
    [texto, entero(req.params.id, 'Observación'), m.id]
  )
  if (!r.affectedRows) throw new ErrorHttp(409, 'Esta observación no existe o ya tiene descargos')
  res.json({ ok: true })
})

// ---------- Boletín ----------
router.get('/boletin', async (req, res) => {
  const m = await matriculaActual(req.estudianteUid)
  res.json(await boletin(m.id, entero(req.query.periodo, 'Periodo')))
})

const rutas = Router()
rutas.use(autenticar, permitir('estudiante'), (req, res, next) => {
  req.estudianteUid = req.usuario.id
  next()
}, vistasEstudiante)

export default rutas
