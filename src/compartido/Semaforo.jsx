// Semáforo académico: alerta temprana por asignatura (estudiante y acudiente),
// por grado (docentes y director de grupo) y de toda la institución (rectoría)
import { useEffect, useState } from 'react'
import { Caja, ConDatos, Icono, Nota, Vacio, useApi } from '../componentes/ui.jsx'
import { useVistaEstudiante } from '../estudiante/contexto.js'

const TEXTOS = {
  verde: { titulo: 'Va bien', texto: 'No hay alertas en ninguna asignatura. ¡A seguir así!' },
  amarillo: { titulo: 'Atención', texto: 'Hay asignaturas que conviene reforzar antes de que terminen en Bajo.' },
  rojo: { titulo: 'En riesgo', texto: 'Hay asignaturas en riesgo de perderse. Es importante hablar con los docentes y ponerse al día.' },
}

export function Luz({ color, grande }) {
  return <span className={`luz ${color} ${grande ? 'grande' : ''}`} role="img" aria-label={TEXTOS[color].titulo} />
}

function TablaAsignaturas({ asignaturas }) {
  const orden = { rojo: 0, amarillo: 1, verde: 2 }
  return (
    <ul className="semaforo-asignaturas">
      {[...asignaturas].sort((a, b) => orden[a.color] - orden[b.color] || a.asignatura.localeCompare(b.asignatura)).map((a) => (
        <li key={a.carga_id} className={a.color}>
          <Luz color={a.color} />
          <div className="crece">
            <strong>{a.asignatura}</strong>
            <small>{a.docente ?? 'Sin docente'}</small>
            {a.motivos.length > 0 && <ul className="motivos">{a.motivos.map((m) => <li key={m}>{m}</li>)}</ul>}
          </div>
          <div className="semaforo-datos">
            <span title="Parcial del periodo en curso (actividades calificadas)">Periodo <Nota valor={a.parcial} /></span>
            <span title="Acumulado del año">Año <Nota valor={a.acumulado} /></span>
            <span title="Fallas sin justificar"><Icono nombre="event_busy" /> {a.fallas}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

// Estudiante o acudiente: el semáforo propio
export default function SemaforoPropio() {
  const { base, soloLectura } = useVistaEstudiante()
  const consulta = useApi(`${base}/semaforo`)
  return (
    <ConDatos consulta={consulta}>
      {(d) => (
        <>
          <section className={`semaforo-estado ${d.color}`}>
            <Luz color={d.color} grande />
            <div>
              <h2>{TEXTOS[d.color].titulo}</h2>
              <p>{TEXTOS[d.color].texto}</p>
              <p className="texto-suave">
                {d.rojas} en rojo · {d.amarillas} en amarillo{d.periodo ? ` · ${d.periodo.nombre} en curso` : ''}
              </p>
            </div>
          </section>
          <Caja titulo="Por asignatura">
            <p className="texto-suave intro-seccion">
              {soloLectura ? 'El semáforo' : 'Tu semáforo'} se calcula con las notas de las actividades del periodo en curso, las notas de periodos anteriores,
              las fallas sin justificar y las tareas vencidas sin entregar.
            </p>
            <TablaAsignaturas asignaturas={d.asignaturas} />
          </Caja>
        </>
      )}
    </ConDatos>
  )
}

// Docente o rectoría: todos los estudiantes de un grado
export function SemaforoGrado({ gradoId }) {
  const consulta = useApi(gradoId ? `/reportes/grados/${gradoId}/semaforo` : null)
  const [abierto, setAbierto] = useState(null)
  const orden = { rojo: 0, amarillo: 1, verde: 2 }
  return (
    <ConDatos consulta={consulta}>
      {(d) => (
        <>
          <div className="resumen-disponibilidad">
            {['rojo', 'amarillo', 'verde'].map((c) => (
              <span key={c} className={`chip semaforo-chip ${c}`}><Luz color={c} /> {d.estudiantes.filter((e) => e.color === c).length} {TEXTOS[c].titulo.toLowerCase()}</span>
            ))}
          </div>
          {d.estudiantes.length === 0 ? <Vacio icono="groups">No hay estudiantes activos.</Vacio> : (
            <ul className="semaforo-estudiantes">
              {[...d.estudiantes].sort((a, b) => orden[a.color] - orden[b.color] || b.rojas - a.rojas).map((e) => (
                <li key={e.matricula_id}>
                  <button onClick={() => setAbierto(abierto === e.matricula_id ? null : e.matricula_id)} aria-expanded={abierto === e.matricula_id}>
                    <Luz color={e.color} />
                    <span className="crece">
                      <strong>{e.nombre}</strong>
                      <small>{e.rojas} en rojo · {e.amarillas} en amarillo</small>
                    </span>
                    <Icono nombre={abierto === e.matricula_id ? 'expand_less' : 'expand_more'} />
                  </button>
                  {abierto === e.matricula_id && <TablaAsignaturas asignaturas={e.asignaturas} />}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </ConDatos>
  )
}

// Docente: sus grados, empezando por el que dirige
export function SemaforoDocente() {
  const cargas = useApi('/docente/cargas')
  const [gradoId, setGradoId] = useState(null)
  const grados = cargas.datos
    ? [...new Map([...cargas.datos.direccion.map((g) => [g.id, `${g.nombre} (director)`]), ...cargas.datos.cargas.map((c) => [c.grado_id, c.grado])]).entries()]
    : []
  useEffect(() => {
    if (!gradoId && grados.length) setGradoId(grados[0][0])
  }, [grados, gradoId])

  return (
    <Caja
      titulo="Semáforo académico"
      acciones={grados.length > 0 && (
        <select value={gradoId ?? ''} onChange={(e) => setGradoId(Number(e.target.value))} aria-label="Grado">
          {grados.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
        </select>
      )}
    >
      <p className="texto-suave intro-seccion">Alerta temprana: estudiantes con asignaturas en riesgo por notas, fallas o tareas vencidas. Toca un estudiante para ver el detalle.</p>
      <ConDatos consulta={cargas}>{() => (grados.length ? <SemaforoGrado gradoId={gradoId} /> : <Vacio icono="groups">No tienes grados asignados.</Vacio>)}</ConDatos>
    </Caja>
  )
}

// Rectoría: resumen de todos los grados
export function SemaforoInstitucional() {
  const consulta = useApi('/admin/semaforo')
  const [gradoId, setGradoId] = useState(null)
  return (
    <ConDatos consulta={consulta}>
      {(grados) => (
        <>
          <Caja titulo="Alerta temprana por grado">
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Grado</th><th>🟢 Bien</th><th>🟡 Atención</th><th>🔴 En riesgo</th><th /></tr></thead>
                <tbody>
                  {grados.map((g) => (
                    <tr key={g.grado.id}>
                      <td><strong>{g.grado.nombre}</strong><small>Dir. {g.grado.director ?? '—'}</small></td>
                      <td>{g.conteo.verde}</td>
                      <td>{g.conteo.amarillo}</td>
                      <td><strong className={g.conteo.rojo ? 'texto-error' : ''}>{g.conteo.rojo}</strong></td>
                      <td className="acciones-fila"><button className="btn-secundario" onClick={() => setGradoId(g.grado.id)}>Ver grado</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Caja>
          <Caja titulo="Estudiantes en riesgo">
            {grados.every((g) => !g.en_rojo.length) ? <Vacio icono="sentiment_satisfied">No hay estudiantes en rojo.</Vacio> : (
              <ul className="lista-simple">
                {grados.flatMap((g) => g.en_rojo.map((e) => (
                  <li key={e.matricula_id}>
                    <div>
                      <strong><Luz color="rojo" /> {e.nombre} · {g.grado.nombre}</strong>
                      {e.motivos.map((m) => <small key={m}>{m}</small>)}
                    </div>
                  </li>
                )))}
              </ul>
            )}
          </Caja>
          {gradoId && (
            <Caja titulo={`Detalle · ${grados.find((g) => g.grado.id === gradoId)?.grado.nombre}`} acciones={<button className="btn-icono" onClick={() => setGradoId(null)} aria-label="Cerrar"><Icono nombre="close" /></button>}>
              <SemaforoGrado gradoId={gradoId} />
            </Caja>
          )}
        </>
      )}
    </ConDatos>
  )
}
