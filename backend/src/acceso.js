// Consultas de permisos compartidas por varias rutas
import { pool } from './db.js'
import { ErrorHttp } from './auth.js'

// Matrícula más reciente del estudiante que inició sesión
export async function matriculaActual(usuarioId) {
  const [[m]] = await pool.query(
    `SELECT m.id, m.anio, m.estado, g.id AS grado_id, g.nombre AS grado, g.jornada,
            CONCAT(d.nombres, ' ', d.apellidos) AS director
       FROM matriculas m
       JOIN estudiantes e ON e.id = m.estudiante_id
       JOIN grados g      ON g.id = m.grado_id
       LEFT JOIN usuarios d ON d.id = g.director_id
      WHERE e.usuario_id = ?
      ORDER BY m.anio DESC
      LIMIT 1`,
    [usuarioId]
  )
  if (!m) throw new ErrorHttp(404, 'No tienes una matrícula registrada')
  return m
}

// La carga existe y es del docente (el administrador puede todas)
export async function cargaPermitida(usuario, cargaId) {
  const [[carga]] = await pool.query(
    `SELECT c.id, c.grado_id, c.docente_id, g.nombre AS grado, g.anio, a.nombre AS asignatura
       FROM cargas c
       JOIN grados g      ON g.id = c.grado_id
       JOIN asignaturas a ON a.id = c.asignatura_id
      WHERE c.id = ?`,
    [cargaId]
  )
  if (!carga) throw new ErrorHttp(404, 'Carga académica no encontrada')
  if (usuario.rol !== 'administrador' && carga.docente_id !== usuario.id) {
    throw new ErrorHttp(403, 'Esta asignatura no está asignada a ti')
  }
  return carga
}

// Un docente puede ver un grado si es su director o dicta alguna asignatura allí
export async function gradoPermitido(usuario, gradoId) {
  const [[grado]] = await pool.query(
    `SELECT g.id, g.nombre, g.nivel, g.jornada, g.anio, g.director_id,
            CONCAT(d.nombres, ' ', d.apellidos) AS director
       FROM grados g LEFT JOIN usuarios d ON d.id = g.director_id
      WHERE g.id = ?`,
    [gradoId]
  )
  if (!grado) throw new ErrorHttp(404, 'Grado no encontrado')
  if (usuario.rol === 'administrador' || grado.director_id === usuario.id) return grado
  const [[c]] = await pool.query('SELECT 1 FROM cargas WHERE grado_id = ? AND docente_id = ? LIMIT 1', [gradoId, usuario.id])
  if (!c) throw new ErrorHttp(403, 'No tienes acceso a este grado')
  return grado
}

export async function matriculaPermitida(usuario, matriculaId) {
  const [[m]] = await pool.query('SELECT id, grado_id FROM matriculas WHERE id = ?', [matriculaId])
  if (!m) throw new ErrorHttp(404, 'Matrícula no encontrada')
  await gradoPermitido(usuario, m.grado_id)
  return m
}

export async function periodoDelAnio(periodoId, anio) {
  const [[periodo]] = await pool.query('SELECT id, numero, nombre, anio, cerrado FROM periodos WHERE id = ?', [periodoId])
  if (!periodo || periodo.anio !== anio) throw new ErrorHttp(400, 'El periodo no corresponde al año del grado')
  return periodo
}

export function exigirPeriodoAbierto(periodo, usuario) {
  if (periodo.cerrado && usuario.rol !== 'administrador') {
    throw new ErrorHttp(409, `El ${periodo.nombre} está cerrado; solicita la reapertura a coordinación`)
  }
}
