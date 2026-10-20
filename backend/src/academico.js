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

// ---------- Semáforo académico (alerta temprana) ----------
// Umbrales: se pueden ajustar según el SIEE del colegio
export const UMBRALES = { notaRoja: 3.0, notaAmarilla: 3.5, fallasRojas: 8, fallasAmarillas: 4, vencidasRojas: 3 }
const NIVEL = { verde: 0, amarillo: 1, rojo: 2 }
const peor = (colores) => colores.reduce((a, c) => (NIVEL[c] > NIVEL[a] ? c : a), 'verde')

function colorAsignatura(a) {
  const motivos = []
  let color = 'verde'
  const marcar = (c, motivo) => {
    motivos.push(motivo)
    color = peor([color, c])
  }
  // [nota, mensaje si está en rojo, mensaje si está en amarillo]
  for (const [valor, enRojo, enAmarillo] of [
    [a.parcial, 'Va perdiendo el periodo en curso', 'Va justo en el periodo en curso'],
    [a.nota_reciente, 'Perdió el último periodo', 'Pasó el último periodo con lo mínimo'],
    [a.acumulado, 'Acumulado del año en Bajo', 'Acumulado del año apenas en Básico'],
  ]) {
    if (valor == null) continue
    if (valor < UMBRALES.notaRoja) marcar('rojo', `${enRojo} (${valor.toFixed(1)})`)
    else if (valor < UMBRALES.notaAmarilla) marcar('amarillo', `${enAmarillo} (${valor.toFixed(1)})`)
  }
  if (a.fallas >= UMBRALES.fallasRojas) marcar('rojo', `${a.fallas} fallas sin justificar`)
  else if (a.fallas >= UMBRALES.fallasAmarillas) marcar('amarillo', `${a.fallas} fallas sin justificar`)
  if (a.vencidas >= UMBRALES.vencidasRojas) marcar('rojo', `${a.vencidas} tareas vencidas sin entregar`)
  else if (a.vencidas > 0) marcar('amarillo', `${a.vencidas} ${a.vencidas === 1 ? 'tarea vencida' : 'tareas vencidas'} sin entregar`)
  return { color, motivos }
}

// Semáforo de todos los estudiantes activos de un grado
export async function semaforoGrado(gradoId) {
  const { grado, periodos, asignaturas } = await datosGrado(gradoId)
  const abierto = periodos.find((p) => !p.cerrado) ?? null

  const [estudiantes] = await pool.query(
    `SELECT m.id AS matricula_id, e.usuario_id, u.documento, CONCAT(u.apellidos, ' ', u.nombres) AS nombre
       FROM matriculas m JOIN estudiantes e ON e.id = m.estudiante_id JOIN usuarios u ON u.id = e.usuario_id
      WHERE m.grado_id = ? AND m.estado = 'activa' ORDER BY u.apellidos, u.nombres`,
    [gradoId]
  )
  const [notas] = await pool.query(
    'SELECT n.matricula_id, n.carga_id, n.periodo_id, n.nota FROM notas n JOIN matriculas m ON m.id = n.matricula_id WHERE m.grado_id = ?',
    [gradoId]
  )
  const [fallas] = await pool.query(
    `SELECT i.matricula_id, i.carga_id, COUNT(*) AS total FROM inasistencias i JOIN matriculas m ON m.id = i.matricula_id
      WHERE m.grado_id = ? AND i.tipo = 'falla' AND NOT i.justificada GROUP BY i.matricula_id, i.carga_id`,
    [gradoId]
  )
  // Actividades del periodo en curso con sus entregas
  const [actividades] = abierto
    ? await pool.query(
        `SELECT a.id, a.carga_id, a.porcentaje, a.entrega_en_linea, a.fecha_entrega < NOW() AS vencida
           FROM actividades a JOIN cargas c ON c.id = a.carga_id WHERE c.grado_id = ? AND a.periodo_id = ?`,
        [gradoId, abierto.id]
      )
    : [[]]
  const [entregas] = actividades.length
    ? await pool.query('SELECT actividad_id, matricula_id, entregado_en, nota FROM entregas WHERE actividad_id IN (?)', [actividades.map((a) => a.id)])
    : [[]]

  const lista = estudiantes.map((e) => {
    const porAsignatura = asignaturas.map((c) => {
      const suyas = periodos.map((p) => notas.find((n) => n.matricula_id === e.matricula_id && n.carga_id === c.carga_id && n.periodo_id === p.id)?.nota ?? null)
      const ultima = [...suyas].reverse().find((n) => n != null) ?? null
      const acts = actividades.filter((a) => a.carga_id === c.carga_id)
      const entregaDe = (a) => entregas.find((x) => x.actividad_id === a.id && x.matricula_id === e.matricula_id)
      const parcial = ponderado(acts.map((a) => ({ valor: entregaDe(a)?.nota ?? null, peso: a.porcentaje })))
      const datos = {
        carga_id: c.carga_id,
        asignatura: c.asignatura,
        docente: c.docente,
        parcial: redondear(parcial),
        nota_reciente: ultima,
        acumulado: redondear(ponderado(periodos.map((p, i) => ({ valor: suyas[i], peso: p.porcentaje })))),
        fallas: Number(fallas.find((f) => f.matricula_id === e.matricula_id && f.carga_id === c.carga_id)?.total ?? 0),
        vencidas: acts.filter((a) => a.entrega_en_linea && a.vencida && !entregaDe(a)?.entregado_en && entregaDe(a)?.nota == null).length,
      }
      return { ...datos, ...colorAsignatura(datos) }
    })
    const color = peor(porAsignatura.map((a) => a.color))
    return {
      ...e,
      color,
      rojas: porAsignatura.filter((a) => a.color === 'rojo').length,
      amarillas: porAsignatura.filter((a) => a.color === 'amarillo').length,
      asignaturas: porAsignatura,
    }
  })
  return { grado, periodo: abierto, umbrales: UMBRALES, estudiantes: lista }
}
