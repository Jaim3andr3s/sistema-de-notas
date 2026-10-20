// Planes de mejoramiento: el docente los asigna a quienes perdieron el periodo y luego los evalúa
import { useState } from 'react'
import { api, descargar } from '../api.js'
import { Aviso, Caja, Campo, ConDatos, Icono, Modal, Nota, Vacio, useApi } from '../componentes/ui.jsx'
import { ESTADOS_PLAN } from '../estudiante/Mejoramiento.jsx'
import { fecha, fechaHora } from '../util.js'

export default function MejoramientoDocente({ seleccion: s, Selector }) {
  const ruta = s.cargaId && s.periodoId ? `/docente/cargas/${s.cargaId}/mejoramiento?periodo=${s.periodoId}` : null
  const consulta = useApi(ruta)
  const [elegidos, setElegidos] = useState([])
  const [creando, setCreando] = useState(false)
  const [evaluando, setEvaluando] = useState(null)

  const alternar = (id) => setElegidos(elegidos.includes(id) ? elegidos.filter((x) => x !== id) : [...elegidos, id])

  return (
    <Caja titulo="Planes de mejoramiento" acciones={<Selector seleccion={s} />}>
      <p className="texto-suave intro-seccion">
        Marca a los estudiantes que necesitan recuperar (los que van en Bajo aparecen primero) y crea el plan. Cuando lo entreguen, evalúalo desde aquí.
      </p>
      <ConDatos consulta={consulta}>
        {({ estudiantes, periodo }) => estudiantes.length === 0 ? <Vacio icono="groups">No hay estudiantes.</Vacio> : (
          <>
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Estudiante</th><th>Nota {periodo.nombre}</th><th>Plan</th><th /></tr></thead>
                <tbody>
                  {estudiantes.map((e) => (
                    <tr key={e.matricula_id}>
                      <td>
                        <label className="check">
                          {!e.plan_id && <input type="checkbox" checked={elegidos.includes(e.matricula_id)} onChange={() => alternar(e.matricula_id)} />}
                          <strong>{e.nombre}</strong>
                        </label>
                      </td>
                      <td><Nota valor={e.nota} /></td>
                      <td>
                        {e.plan_id
                          ? <><span className={`chip ${ESTADOS_PLAN[e.estado].clase}`}>{ESTADOS_PLAN[e.estado].texto}</span><small>Hasta el {fecha(e.fecha_limite)}</small></>
                          : <span className="texto-suave">{e.nota != null && e.nota < 3 ? 'Necesita plan' : '—'}</span>}
                      </td>
                      <td className="acciones-fila">
                        {e.plan_id && (
                          <button className="btn-secundario" onClick={() => setEvaluando({ ...e, cerrado: periodo.cerrado })}>
                            {['aprobado', 'no_aprobado'].includes(e.estado) ? 'Ver' : 'Evaluar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="form-acciones">
              <button className="btn-secundario" onClick={() => setElegidos(estudiantes.filter((e) => !e.plan_id && e.nota != null && e.nota < 3).map((e) => e.matricula_id))}>
                Marcar los que van en Bajo
              </button>
              <button className="btn-primario" disabled={!elegidos.length} onClick={() => setCreando(true)}>
                <Icono nombre="add" /> Crear plan ({elegidos.length})
              </button>
            </div>
          </>
        )}
      </ConDatos>
      {creando && (
        <NuevoPlan s={s} matriculas={elegidos} onCerrar={(ok) => { setCreando(false); if (ok) { setElegidos([]); consulta.recargar() } }} />
      )}
      {evaluando && <EvaluarPlan plan={evaluando} onCerrar={(ok) => { setEvaluando(null); if (ok) consulta.recargar() }} />}
    </Caja>
  )
}

function NuevoPlan({ s, matriculas, onCerrar }) {
  const [f, setF] = useState({ descripcion: '', fecha_limite: '' })
  const [error, setError] = useState('')
  async function guardar(e) {
    e.preventDefault()
    try {
      await api(`/docente/cargas/${s.cargaId}/mejoramiento`, { method: 'POST', body: { ...f, periodo_id: s.periodoId, matriculas } })
      onCerrar(true)
    } catch (err) {
      setError(err.message)
    }
  }
  return (
    <Modal titulo={`Plan de mejoramiento · ${s.carga?.asignatura} ${s.carga?.grado}`} onCerrar={() => onCerrar(false)}>
      <form className="form" onSubmit={guardar}>
        <p className="texto-suave">Se asignará a {matriculas.length} {matriculas.length === 1 ? 'estudiante' : 'estudiantes'} del {s.periodo?.nombre}. Ellos y sus acudientes recibirán un aviso.</p>
        <Campo etiqueta="¿Qué debe hacer el estudiante?">
          <textarea rows={4} required value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} placeholder="Ej: Resolver el taller de refuerzo y presentar una sustentación oral." />
        </Campo>
        <Campo etiqueta="Fecha límite">
          <input type="date" required value={f.fecha_limite} onChange={(e) => setF({ ...f, fecha_limite: e.target.value })} />
        </Campo>
        <Aviso>{error}</Aviso>
        <div className="form-acciones"><button className="btn-primario">Crear plan</button></div>
      </form>
    </Modal>
  )
}

function EvaluarPlan({ plan: p, onCerrar }) {
  const evaluado = ['aprobado', 'no_aprobado'].includes(p.estado)
  const [f, setF] = useState({ estado: p.estado === 'no_aprobado' ? 'no_aprobado' : 'aprobado', nota_recuperacion: p.nota_recuperacion ?? '', observacion_docente: p.observacion_docente ?? '', actualizar_nota: false })
  const [error, setError] = useState('')
  async function guardar(e) {
    e.preventDefault()
    try {
      await api(`/docente/mejoramiento/${p.plan_id}`, {
        method: 'PUT', body: { ...f, nota_recuperacion: f.nota_recuperacion === '' ? null : Number(f.nota_recuperacion) },
      })
      onCerrar(true)
    } catch (err) {
      setError(err.message)
    }
  }
  return (
    <Modal titulo={`Plan de ${p.nombre}`} onCerrar={() => onCerrar(false)}>
      <p className="descripcion">{p.descripcion}</p>
      {p.entregado_en ? (
        <div className="entrega-detalle">
          <small>Entregado el {fechaHora(p.entregado_en)}</small>
          {p.entrega_texto && <p>{p.entrega_texto}</p>}
          {p.entrega_archivo && <button className="btn-secundario" onClick={() => descargar(p.entrega_archivo, p.entrega_archivo_nombre)}><Icono nombre="attach_file" /> {p.entrega_archivo_nombre}</button>}
        </div>
      ) : <Aviso tipo="info">El estudiante aún no lo ha entregado en la plataforma (puede ser una sustentación presencial).</Aviso>}
      <form className="form" onSubmit={guardar}>
        <div className="form-fila">
          <Campo etiqueta="Resultado">
            <select value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })}>
              <option value="aprobado">Aprobado</option>
              <option value="no_aprobado">No aprobado</option>
            </select>
          </Campo>
          <Campo etiqueta="Nota de recuperación">
            <input type="number" step="0.1" min="1" max="5" value={f.nota_recuperacion} onChange={(e) => setF({ ...f, nota_recuperacion: e.target.value })} />
          </Campo>
        </div>
        <Campo etiqueta="Observación para el estudiante">
          <textarea rows={2} value={f.observacion_docente} onChange={(e) => setF({ ...f, observacion_docente: e.target.value })} />
        </Campo>
        <label className="check">
          <input type="checkbox" checked={f.actualizar_nota} disabled={p.cerrado} onChange={(e) => setF({ ...f, actualizar_nota: e.target.checked })} />
          Reemplazar la nota del periodo con la nota de recuperación
        </label>
        {p.cerrado && <small className="texto-suave">El periodo está cerrado: para cambiar la nota, coordinación debe reabrirlo.</small>}
        <Aviso>{error}</Aviso>
        <div className="form-acciones"><button className="btn-primario">{evaluado ? 'Actualizar evaluación' : 'Guardar evaluación'}</button></div>
      </form>
    </Modal>
  )
}
