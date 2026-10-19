// Cálculos académicos: consolidados (sábana de notas) y boletines
import { pool } from './db.js'
import { ErrorHttp } from './auth.js'

// Escala de valoración nacional (Decreto 1290)
export function desempeno(nota) {
  if (nota == null) return null
  if (nota >= 4.6) return 'Superior'
  if (nota >= 4.0) return 'Alto'
  if (nota >= 3.0) return 'Básico'
  return 'Bajo'
}

const redondear = (n, d = 1) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d)

// Promedio ponderado de [{ valor, peso }] ignorando los vacíos
export function ponderado(items) {
  const v = items.filter((i) => i.valor != null && i.peso > 0)
  const pesos = v.reduce((a, i) => a + i.peso, 0)
  return pesos ? v.reduce((a, i) => a + i.valor * i.peso, 0) / pesos : null
}

function promedioSimple(valores) {
  const v = valores.filter((n) => n != null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

// Puesto con empates compartidos (1, 2, 2, 4…)
function asignarPuestos(filas) {
  const orden = filas.filter((f) => f.promedio != null).sort((a, b) => b.promedio - a.promedio)
  orden.forEach((f, i) => {
    f.puesto = i > 0 && f.promedio === orden[i - 1].promedio ? orden[i - 1].puesto : i + 1
  })
}

async function datosGrado(gradoId) {
  const [[grado]] = await pool.query(
    `SELECT g.id, g.nombre, g.jornada, g.anio, CONCAT(d.nombres, ' ', d.apellidos) AS director
       FROM grados g LEFT JOIN usuarios d ON d.id = g.director_id WHERE g.id = ?`,
    [gradoId]
  )
  if (!grado) throw new ErrorHttp(404, 'Grado no encontrado')
  const [periodos] = await pool.query(
    'SELECT id, numero, nombre, porcentaje, fecha_inicio, fecha_fin, cerrado FROM periodos WHERE anio = ? ORDER BY numero',
    [grado.anio]
  )
  const [asignaturas] = await pool.query(
    `SELECT c.id AS carga_id, a.nombre AS asignatura, a.area, c.intensidad_horaria AS ih,
            CONCAT(u.nombres, ' ', u.apellidos) AS docente
       FROM cargas c JOIN asignaturas a ON a.id = c.asignatura_id LEFT JOIN usuarios u ON u.id = c.docente_id
      WHERE c.grado_id = ? ORDER BY a.nombre`,
    [gradoId]
  )
  return { grado, periodos, asignaturas }
}

// periodoId = null → acumulado del año (ponderado por el porcentaje de cada periodo)
export async function consolidado(gradoId, periodoId = null) {
  const { grado, periodos, asignaturas } = await datosGrado(gradoId)
  const periodo = periodoId ? periodos.find((p) => p.id === periodoId) : null
  if (periodoId && !periodo) throw new ErrorHttp(400, 'El periodo no corresponde al año del grado')

  const [estudiantes] = await pool.query(
    `SELECT m.id AS matricula_id, u.documento, CONCAT(u.apellidos, ' ', u.nombres) AS nombre
       FROM matriculas m JOIN estudiantes e ON e.id = m.estudiante_id JOIN usuarios u ON u.id = e.usuario_id
      WHERE m.grado_id = ? AND m.estado = 'activa'
      ORDER BY u.apellidos, u.nombres`,
    [gradoId]
  )
  const [notas] = await pool.query(
    `SELECT n.matricula_id, n.carga_id, n.periodo_id, n.nota
       FROM notas n JOIN matriculas m ON m.id = n.matricula_id WHERE m.grado_id = ?`,
    [gradoId]
  )
  const [fallas] = await pool.query(
    `SELECT i.matricula_id, COUNT(*) AS total
       FROM inasistencias i JOIN matriculas m ON m.id = i.matricula_id
      WHERE m.grado_id = ? AND i.tipo = 'falla' AND (? IS NULL OR i.fecha BETWEEN ? AND ?)
      GROUP BY i.matricula_id`,
    [gradoId, periodo?.id ?? null, periodo?.fecha_inicio ?? null, periodo?.fecha_fin ?? null]
  )

  const notaDe = (mId, cId, pId) => notas.find((n) => n.matricula_id === mId && n.carga_id === cId && n.periodo_id === pId)?.nota ?? null

  const filas = estudiantes.map((e) => {
    const valores = {}
    for (const a of asignaturas) {
      valores[a.carga_id] = periodo
        ? notaDe(e.matricula_id, a.carga_id, periodo.id)
        : redondear(ponderado(periodos.map((p) => ({ valor: notaDe(e.matricula_id, a.carga_id, p.id), peso: p.porcentaje }))))
    }
    const lista = Object.values(valores)
    return {
      ...e,
      notas: valores,
      promedio: redondear(promedioSimple(lista), 2),
      en_bajo: lista.filter((n) => n != null && n < 3).length,
      fallas: Number(fallas.find((f) => f.matricula_id === e.matricula_id)?.total ?? 0),
      puesto: null,
    }
  })
  asignarPuestos(filas)

  const porAsignatura = Object.fromEntries(
    asignaturas.map((a) => {
      const v = filas.map((f) => f.notas[a.carga_id])
      return [a.carga_id, { promedio: redondear(promedioSimple(v), 2), en_bajo: v.filter((n) => n != null && n < 3).length }]
    })
  )

  return {
    grado,
    periodos,
    periodo,
    asignaturas,
    estudiantes: filas,
    resumen: {
      promedio_grado: redondear(promedioSimple(filas.map((f) => f.promedio)), 2),
      estudiantes_en_riesgo: filas.filter((f) => f.en_bajo > 0).length,
      por_asignatura: porAsignatura,
    },
  }
}

export async function boletin(matriculaId, periodoId) {
  const [[m]] = await pool.query(
    `SELECT m.id, m.grado_id, u.documento, u.nombres, u.apellidos
       FROM matriculas m JOIN estudiantes e ON e.id = m.estudiante_id JOIN usuarios u ON u.id = e.usuario_id
      WHERE m.id = ?`,
    [matriculaId]
  )
  if (!m) throw new ErrorHttp(404, 'Matrícula no encontrada')

  const c = await consolidado(m.grado_id, periodoId)
  const fila = c.estudiantes.find((e) => e.matricula_id === m.id)
  if (!fila) throw new ErrorHttp(404, 'El estudiante no está activo en el grado')

  const [notas] = await pool.query('SELECT carga_id, periodo_id, nota, observacion FROM notas WHERE matricula_id = ?', [m.id])
  const [fallas] = await pool.query(
    `SELECT carga_id, SUM(tipo = 'falla') AS fallas, SUM(tipo = 'retardo') AS retardos
       FROM inasistencias WHERE matricula_id = ? AND fecha BETWEEN ? AND ? GROUP BY carga_id`,
    [m.id, c.periodo.fecha_inicio, c.periodo.fecha_fin]
  )
  const [observaciones] = await pool.query(
    `SELECT fecha, tipo, descripcion FROM observaciones
      WHERE matricula_id = ? AND fecha BETWEEN ? AND ? ORDER BY fecha`,
    [m.id, c.periodo.fecha_inicio, c.periodo.fecha_fin]
  )

  const asignaturas = c.asignaturas.map((a) => {
    const porPeriodo = c.periodos.map((p) => notas.find((n) => n.carga_id === a.carga_id && n.periodo_id === p.id)?.nota ?? null)
    const actual = notas.find((n) => n.carga_id === a.carga_id && n.periodo_id === c.periodo.id)
    const acumulado = redondear(ponderado(c.periodos.map((p, i) => ({ valor: porPeriodo[i], peso: p.porcentaje }))))
    const f = fallas.find((x) => x.carga_id === a.carga_id)
    return {
      ...a,
      notas: porPeriodo,
      nota: actual?.nota ?? null,
      desempeno: desempeno(actual?.nota ?? null),
      observacion: actual?.observacion ?? null,
      acumulado,
      fallas: Number(f?.fallas ?? 0),
      retardos: Number(f?.retardos ?? 0),
    }
  })

  return {
    estudiante: { documento: m.documento, nombres: m.nombres, apellidos: m.apellidos },
    grado: c.grado,
    periodos: c.periodos,
    periodo: c.periodo,
    asignaturas,
    promedio: fila.promedio,
    desempeno: desempeno(fila.promedio),
    puesto: fila.puesto,
    total_estudiantes: c.estudiantes.length,
    observaciones,
  }
}
