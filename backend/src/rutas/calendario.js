// Calendario académico del mes: entregas de actividades, anuncios y cierres de periodo
// Cada rol ve lo suyo: el estudiante su grado, el acudiente los grados de sus hijos,
// el docente sus asignaturas y grupos, y la rectoría todo
import { Router } from 'express'
import { pool } from '../db.js'
import { autenticar, ErrorHttp } from '../auth.js'

const router = Router()
router.use(autenticar)

async function gradosDelUsuario(u) {
  if (u.rol === 'administrador') return null // todos
  const consultas = {
    estudiante: `SELECT m.grado_id AS id, NULL AS hijo, m.id AS matricula_id FROM matriculas m JOIN estudiantes e ON e.id = m.estudiante_id
                  WHERE e.usuario_id = ? AND m.estado = 'activa'`,
    acudiente: `SELECT m.grado_id AS id, us.nombres AS hijo, m.id AS matricula_id FROM acudientes a
                  JOIN matriculas m ON m.estudiante_id = a.estudiante_id AND m.estado = 'activa'
                  JOIN estudiantes e ON e.id = a.estudiante_id JOIN usuarios us ON us.id = e.usuario_id
                 WHERE a.acudiente_id = ?`,
    docente: `SELECT grado_id AS id, NULL AS hijo, NULL AS matricula_id FROM cargas WHERE docente_id = ?
              UNION SELECT id, NULL, NULL FROM grados WHERE director_id = ?`,
  }
  const [filas] = await pool.query(consultas[u.rol], [u.id, u.id])
  return filas
}

router.get('/', async (req, res) => {
  const mes = String(req.query.mes ?? new Date().toISOString().slice(0, 7))
  if (!/^\d{4}-\d{2}$/.test(mes)) throw new ErrorHttp(400, 'Mes inválido (AAAA-MM)')
  const desde = `${mes}-01`
  const u = req.usuario
  const grados = await gradosDelUsuario(u)
  const ids = grados ? [...new Set(grados.map((g) => g.id))] : null
  const eventos = []

  // Entregas de actividades
  if (!ids || ids.length) {
    const filtro = u.rol === 'docente' ? 'c.docente_id = ?' : ids ? 'c.grado_id IN (?)' : '1 = 1'
    const [acts] = await pool.query(
      `SELECT a.id, a.titulo, a.tipo, a.fecha_entrega, s.nombre AS asignatura, g.nombre AS grado, c.grado_id
         FROM actividades a JOIN cargas c ON c.id = a.carga_id JOIN asignaturas s ON s.id = c.asignatura_id JOIN grados g ON g.id = c.grado_id
        WHERE a.fecha_entrega >= ? AND a.fecha_entrega < ? + INTERVAL 1 MONTH AND ${filtro}
        ORDER BY a.fecha_entrega`,
      [desde, desde, ...(u.rol === 'docente' ? [u.id] : ids ? [ids] : [])]
    )
    // Para estudiantes y acudientes se marca si ya se entregó
    const matriculas = grados?.filter((g) => g.matricula_id) ?? []
    const [entregas] = matriculas.length && acts.length
      ? await pool.query('SELECT actividad_id, matricula_id FROM entregas WHERE entregado_en IS NOT NULL AND actividad_id IN (?) AND matricula_id IN (?)',
          [acts.map((a) => a.id), matriculas.map((m) => m.matricula_id)])
      : [[]]
    for (const a of acts) {
      const deEseGrado = matriculas.filter((m) => m.id === a.grado_id)
      const base = { tipo: 'actividad', subtipo: a.tipo, fecha: a.fecha_entrega, titulo: a.titulo, detalle: `${a.asignatura} · ${a.grado}` }
      if (!deEseGrado.length) eventos.push(base)
      for (const m of deEseGrado) {
        eventos.push({
          ...base,
          detalle: m.hijo ? `${m.hijo} · ${a.asignatura}` : a.asignatura,
          entregada: entregas.some((x) => x.actividad_id === a.id && x.matricula_id === m.matricula_id),
        })
      }
    }
  }

  // Anuncios generales y de los grados del usuario
  const [anuncios] = await pool.query(
    `SELECT a.titulo, a.texto, a.fecha, g.nombre AS grado FROM anuncios a LEFT JOIN grados g ON g.id = a.grado_id
      WHERE a.fecha >= ? AND a.fecha < ? + INTERVAL 1 MONTH AND (a.grado_id IS NULL ${ids ? (ids.length ? 'OR a.grado_id IN (?)' : '') : 'OR 1 = 1'})
      ORDER BY a.fecha`,
    [desde, desde, ...(ids?.length ? [ids] : [])]
  )
  for (const a of anuncios) eventos.push({ tipo: 'anuncio', fecha: a.fecha, titulo: a.titulo, detalle: a.grado ? `${a.grado} · ${a.texto}` : a.texto })

  // Inicio y cierre de periodos
  const [periodos] = await pool.query(
    `SELECT nombre, fecha_inicio, fecha_fin FROM periodos
      WHERE (fecha_inicio >= ? AND fecha_inicio < ? + INTERVAL 1 MONTH) OR (fecha_fin >= ? AND fecha_fin < ? + INTERVAL 1 MONTH)`,
    [desde, desde, desde, desde]
  )
  for (const p of periodos) {
    if (p.fecha_inicio >= desde && p.fecha_inicio.slice(0, 7) === mes) eventos.push({ tipo: 'periodo', fecha: p.fecha_inicio, titulo: `Inicia el ${p.nombre}` })
    if (p.fecha_fin.slice(0, 7) === mes) eventos.push({ tipo: 'periodo', fecha: p.fecha_fin, titulo: `Cierre del ${p.nombre}`, detalle: 'Último día para registrar notas' })
  }

  eventos.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
  res.json({ mes, eventos })
})

export default router
