import { Router } from 'express'
import { pool, transaccion } from '../db.js'
import { autenticar, permitir, ErrorHttp } from '../auth.js'
import { cargaPermitida, periodoDelAnio, exigirPeriodoAbierto } from '../acceso.js'
import { ponderado } from '../academico.js'
import { subir } from '../archivos.js'
import { entero, nota as validarNota, requerido } from '../validar.js'

const router = Router()
router.use(autenticar, permitir('docente', 'administrador'))

// La rectoría consulta, pero las notas, actividades y asistencia solo las registra el docente
router.use((req, res, next) => {
  if (req.method !== 'GET' && req.usuario.rol !== 'docente') {
    throw new ErrorHttp(403, 'La rectoría puede consultar las notas, pero solo el docente puede registrarlas o modificarlas')
  }
  next()
})

const TIPOS = ['tarea', 'taller', 'cuestionario', 'evaluacion', 'exposicion', 'proyecto']

async function matriculasActivas(gradoId) {
  const [filas] = await pool.query("SELECT id FROM matriculas WHERE grado_id = ? AND estado = 'activa'", [gradoId])
  return new Set(filas.map((m) => m.id))
}

// Asignaturas y grados que dicta el docente, más los grados que dirige
router.get('/cargas', async (req, res) => {
  const [cargas] = await pool.query(
    `SELECT c.id, g.id AS grado_id, g.nombre AS grado, g.jornada, g.anio, a.nombre AS asignatura, c.intensidad_horaria AS ih,
            (SELECT COUNT(*) FROM matriculas m WHERE m.grado_id = g.id AND m.estado = 'activa') AS estudiantes,
            (SELECT COUNT(*) FROM actividades x WHERE x.carga_id = c.id) AS actividades
       FROM cargas c
       JOIN grados g      ON g.id = c.grado_id
       JOIN asignaturas a ON a.id = c.asignatura_id
      WHERE c.docente_id = ?
      ORDER BY g.anio DESC, g.nivel, g.nombre, a.nombre`,
    [req.usuario.id]
  )
  const [direccion] = await pool.query('SELECT id, nombre, anio FROM grados WHERE director_id = ? ORDER BY anio DESC', [req.usuario.id])
  res.json({ cargas, direccion })
})

router.get('/periodos', async (req, res) => {
  const [filas] = await pool.query('SELECT id, anio, numero, nombre, porcentaje, fecha_inicio, fecha_fin, cerrado FROM periodos ORDER BY anio DESC, numero')
  res.json(filas)
})

// ---------- Planilla de notas del periodo ----------
router.get('/cargas/:id/notas', async (req, res) => {
  const carga = await cargaPermitida(req.usuario, entero(req.params.id, 'Carga'))
  const periodo = await periodoDelAnio(entero(req.query.periodo, 'Periodo'), carga.anio)

  const [estudiantes] = await pool.query(
    `SELECT m.id AS matricula_id, u.documento, u.apellidos, u.nombres, n.nota, n.observacion,
            (SELECT COUNT(*) FROM inasistencias i WHERE i.matricula_id = m.id AND i.carga_id = ? AND i.tipo = 'falla') AS fallas
       FROM matriculas m
       JOIN estudiantes e ON e.id = m.estudiante_id
       JOIN usuarios u    ON u.id = e.usuario_id
       LEFT JOIN notas n  ON n.matricula_id = m.id AND n.carga_id = ? AND n.periodo_id = ?
      WHERE m.grado_id = ? AND m.estado = 'activa'
      ORDER BY u.apellidos, u.nombres`,
    [carga.id, carga.id, periodo.id, carga.grado_id]
  )

  // Nota sugerida = promedio ponderado de las actividades calificadas del periodo
  const [calificaciones] = await pool.query(
    `SELECT e.matricula_id, e.nota, a.porcentaje
       FROM entregas e JOIN actividades a ON a.id = e.actividad_id
      WHERE a.carga_id = ? AND a.periodo_id = ? AND e.nota IS NOT NULL`,
    [carga.id, periodo.id]
  )
  for (const est of estudiantes) {
    const s = ponderado(calificaciones.filter((c) => c.matricula_id === est.matricula_id).map((c) => ({ valor: c.nota, peso: c.porcentaje })))
    est.sugerida = s == null ? null : Math.max(1, Math.round(s * 10) / 10)
  }
  res.json({ carga, periodo, estudiantes })
})

// Guarda la planilla completa: { periodo_id, notas: [{ matricula_id, nota, observacion? }] }
router.put('/cargas/:id/notas', async (req, res) => {
  const carga = await cargaPermitida(req.usuario, entero(req.params.id, 'Carga'))
  requerido(req.body, ['periodo_id', 'notas'])
  const periodo = await periodoDelAnio(entero(req.body.periodo_id, 'Periodo'), carga.anio)
  exigirPeriodoAbierto(periodo)
  if (!Array.isArray(req.body.notas)) throw new ErrorHttp(400, 'notas debe ser una lista')

  const validos = await matriculasActivas(carga.grado_id)
  const filas = req.body.notas.map((n) => {
    const matriculaId = entero(n.matricula_id, 'Matrícula')
    if (!validos.has(matriculaId)) throw new ErrorHttp(400, `La matrícula ${matriculaId} no pertenece a ${carga.grado}`)
    return { matriculaId, nota: validarNota(n.nota), observacion: n.observacion?.trim() || null }
  })

  await transaccion(async (conn) => {
    for (const f of filas) {
      if (f.nota === null) {
        await conn.query('DELETE FROM notas WHERE matricula_id = ? AND carga_id = ? AND periodo_id = ?', [f.matriculaId, carga.id, periodo.id])
      } else {
        await conn.query(
          `INSERT INTO notas (matricula_id, carga_id, periodo_id, nota, observacion, actualizado_por)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE nota = VALUES(nota), observacion = VALUES(observacion), actualizado_por = VALUES(actualizado_por)`,
          [f.matriculaId, carga.id, periodo.id, f.nota, f.observacion, req.usuario.id]
        )
      }
    }
  })
  res.json({ ok: true, guardadas: filas.length })
})

// ---------- Actividades ----------
router.get('/cargas/:id/actividades', async (req, res) => {
  const carga = await cargaPermitida(req.usuario, entero(req.params.id, 'Carga'))
  const [filas] = await pool.query(
    `SELECT a.id, a.titulo, a.tipo, a.porcentaje, a.fecha_entrega, a.entrega_en_linea, a.periodo_id,
            JSON_LENGTH(a.preguntas) AS num_preguntas,
            (SELECT COUNT(*) FROM entregas e WHERE e.actividad_id = a.id AND e.entregado_en IS NOT NULL) AS entregadas,
            (SELECT COUNT(*) FROM entregas e WHERE e.actividad_id = a.id AND e.nota IS NOT NULL) AS calificadas
       FROM actividades a
      WHERE a.carga_id = ? AND (? IS NULL OR a.periodo_id = ?)
      ORDER BY a.fecha_entrega DESC, a.id DESC`,
    [carga.id, req.query.periodo ?? null, req.query.periodo ?? null]
  )
  res.json(filas)
})

function leerActividad(body) {
  requerido(body, ['titulo', 'periodo_id'])
  const tipo = body.tipo || 'tarea'
  if (!TIPOS.includes(tipo)) throw new ErrorHttp(400, 'Tipo de actividad inválido')
  const porcentaje = Number(body.porcentaje ?? 10)
  if (!Number.isInteger(porcentaje) || porcentaje < 0 || porcentaje > 100) throw new ErrorHttp(400, 'El porcentaje debe estar entre 0 y 100')

  let preguntas = null
  if (tipo === 'cuestionario') {
    preguntas = typeof body.preguntas === 'string' ? JSON.parse(body.preguntas || '[]') : body.preguntas
    if (!Array.isArray(preguntas) || !preguntas.length) throw new ErrorHttp(400, 'El cuestionario necesita al menos una pregunta')
    preguntas = preguntas.map((p, i) => {
      const opciones = (p.opciones || []).map((o) => String(o).trim()).filter(Boolean)
      if (!String(p.enunciado || '').trim() || opciones.length < 2) throw new ErrorHttp(400, `La pregunta ${i + 1} necesita enunciado y al menos 2 opciones`)
      const correcta = Number(p.correcta)
      if (!Number.isInteger(correcta) || correcta < 0 || correcta >= opciones.length) throw new ErrorHttp(400, `Marca la respuesta correcta de la pregunta ${i + 1}`)
      return { enunciado: String(p.enunciado).trim(), opciones, correcta }
    })
  }

  const enLinea = tipo === 'cuestionario' || !['false', false, '0', 0].includes(body.entrega_en_linea)
  return {
    periodo_id: entero(body.periodo_id, 'Periodo'),
    titulo: String(body.titulo).trim(),
    descripcion: body.descripcion?.trim() || null,
    tipo,
    porcentaje,
    fecha_entrega: body.fecha_entrega || null,
    entrega_en_linea: enLinea,
    preguntas: preguntas ? JSON.stringify(preguntas) : null,
  }
}

router.post('/cargas/:id/actividades', subir.single('archivo'), async (req, res) => {
  const carga = await cargaPermitida(req.usuario, entero(req.params.id, 'Carga'))
  const datos = leerActividad(req.body)
  exigirPeriodoAbierto(await periodoDelAnio(datos.periodo_id, carga.anio))

  const [r] = await pool.query('INSERT INTO actividades SET ?', [{
    ...datos,
    carga_id: carga.id,
    archivo: req.file?.filename ?? null,
    archivo_nombre: req.file?.originalname ?? null,
    creado_por: req.usuario.id,
  }])
  res.status(201).json({ id: r.insertId })
})

async function actividadPermitida(usuario, id) {
  const [[a]] = await pool.query('SELECT * FROM actividades WHERE id = ?', [id])
  if (!a) throw new ErrorHttp(404, 'Actividad no encontrada')
  const carga = await cargaPermitida(usuario, a.carga_id)
  return { a, carga }
}

router.get('/actividades/:id', async (req, res) => {
  const { a, carga } = await actividadPermitida(req.usuario, entero(req.params.id, 'Actividad'))
  const [estudiantes] = await pool.query(
    `SELECT m.id AS matricula_id, u.documento, CONCAT(u.apellidos, ' ', u.nombres) AS nombre,
            e.id AS entrega_id, e.texto, e.archivo, e.archivo_nombre, e.respuestas, e.entregado_en,
            e.nota, e.retroalimentacion, e.calificado_en,
            (SELECT COUNT(*) FROM comentarios_entrega ce WHERE ce.actividad_id = ? AND ce.matricula_id = m.id) AS comentarios
       FROM matriculas m
       JOIN estudiantes s ON s.id = m.estudiante_id
       JOIN usuarios u    ON u.id = s.usuario_id
       LEFT JOIN entregas e ON e.actividad_id = ? AND e.matricula_id = m.id
      WHERE m.grado_id = ? AND m.estado = 'activa'
      ORDER BY u.apellidos, u.nombres`,
    [a.id, a.id, carga.grado_id]
  )
  res.json({ actividad: a, carga, estudiantes })
})

router.put('/actividades/:id', subir.single('archivo'), async (req, res) => {
  const { a, carga } = await actividadPermitida(req.usuario, entero(req.params.id, 'Actividad'))
  const datos = leerActividad({ ...req.body, periodo_id: req.body.periodo_id ?? a.periodo_id })
  exigirPeriodoAbierto(await periodoDelAnio(datos.periodo_id, carga.anio))
  if (req.file) Object.assign(datos, { archivo: req.file.filename, archivo_nombre: req.file.originalname })
  await pool.query('UPDATE actividades SET ? WHERE id = ?', [datos, a.id])
  res.json({ ok: true })
})

router.delete('/actividades/:id', async (req, res) => {
  const { a, carga } = await actividadPermitida(req.usuario, entero(req.params.id, 'Actividad'))
  exigirPeriodoAbierto(await periodoDelAnio(a.periodo_id, carga.anio))
  await pool.query('DELETE FROM actividades WHERE id = ?', [a.id])
  res.json({ ok: true })
})

// Califica varias entregas a la vez: { calificaciones: [{ matricula_id, nota, retroalimentacion? }] }
// Sirve también para actividades presenciales (crea la fila de entrega si no existe)
router.put('/actividades/:id/calificaciones', async (req, res) => {
  const { a, carga } = await actividadPermitida(req.usuario, entero(req.params.id, 'Actividad'))
  exigirPeriodoAbierto(await periodoDelAnio(a.periodo_id, carga.anio))
  if (!Array.isArray(req.body.calificaciones)) throw new ErrorHttp(400, 'calificaciones debe ser una lista')

  const validos = await matriculasActivas(carga.grado_id)
  const filas = req.body.calificaciones.map((c) => {
    const matriculaId = entero(c.matricula_id, 'Matrícula')
    if (!validos.has(matriculaId)) throw new ErrorHttp(400, `La matrícula ${matriculaId} no pertenece a ${carga.grado}`)
    return { matriculaId, nota: validarNota(c.nota), retro: c.retroalimentacion?.trim() || null }
  })

  await transaccion(async (conn) => {
    for (const f of filas) {
      await conn.query(
        `INSERT INTO entregas (actividad_id, matricula_id, nota, retroalimentacion, calificado_en)
         VALUES (?, ?, ?, ?, IF(? IS NULL, NULL, NOW()))
         ON DUPLICATE KEY UPDATE nota = VALUES(nota), retroalimentacion = VALUES(retroalimentacion), calificado_en = VALUES(calificado_en)`,
        [a.id, f.matriculaId, f.nota, f.retro, f.nota]
      )
    }
  })
  res.json({ ok: true })
})

// ---------- Asistencia ----------
router.get('/cargas/:id/asistencia', async (req, res) => {
  const carga = await cargaPermitida(req.usuario, entero(req.params.id, 'Carga'))
  const fecha = validarFecha(req.query.fecha)
  const [estudiantes] = await pool.query(
    `SELECT m.id AS matricula_id, u.documento, CONCAT(u.apellidos, ' ', u.nombres) AS nombre,
            COALESCE(i.tipo, 'presente') AS estado, COALESCE(i.justificada, 0) AS justificada, i.observacion,
            (SELECT COUNT(*) FROM inasistencias x WHERE x.matricula_id = m.id AND x.carga_id = ? AND x.tipo = 'falla') AS total_fallas
       FROM matriculas m
       JOIN estudiantes s ON s.id = m.estudiante_id
       JOIN usuarios u    ON u.id = s.usuario_id
       LEFT JOIN inasistencias i ON i.matricula_id = m.id AND i.carga_id = ? AND i.fecha = ?
      WHERE m.grado_id = ? AND m.estado = 'activa'
      ORDER BY u.apellidos, u.nombres`,
    [carga.id, carga.id, fecha, carga.grado_id]
  )
  res.json({ carga, fecha, estudiantes })
})

function validarFecha(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) throw new ErrorHttp(400, 'Fecha inválida (AAAA-MM-DD)')
  return fecha
}

// Guarda la lista del día: { fecha, registros: [{ matricula_id, estado: presente|falla|retardo, justificada?, observacion? }] }
router.put('/cargas/:id/asistencia', async (req, res) => {
  const carga = await cargaPermitida(req.usuario, entero(req.params.id, 'Carga'))
  const fecha = validarFecha(req.body.fecha)
  if (!Array.isArray(req.body.registros)) throw new ErrorHttp(400, 'registros debe ser una lista')

  const validos = await matriculasActivas(carga.grado_id)
  const filas = req.body.registros.map((r) => {
    const matriculaId = entero(r.matricula_id, 'Matrícula')
    if (!validos.has(matriculaId)) throw new ErrorHttp(400, `La matrícula ${matriculaId} no pertenece a ${carga.grado}`)
    if (!['presente', 'falla', 'retardo'].includes(r.estado)) throw new ErrorHttp(400, 'Estado de asistencia inválido')
    return { matriculaId, estado: r.estado, justificada: Boolean(r.justificada), observacion: r.observacion?.trim() || null }
  })

  await transaccion(async (conn) => {
    for (const f of filas) {
      if (f.estado === 'presente') {
        await conn.query('DELETE FROM inasistencias WHERE matricula_id = ? AND carga_id = ? AND fecha = ?', [f.matriculaId, carga.id, fecha])
      } else {
        await conn.query(
          `INSERT INTO inasistencias (matricula_id, carga_id, fecha, tipo, justificada, observacion) VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE tipo = VALUES(tipo), justificada = VALUES(justificada), observacion = VALUES(observacion)`,
          [f.matriculaId, carga.id, fecha, f.estado, f.justificada, f.observacion]
        )
      }
    }
  })
  res.json({ ok: true })
})

export default router
