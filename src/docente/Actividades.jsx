import { useEffect, useState } from 'react'
import { api, descargar } from '../api.js'
import { Caja, ConDatos, Nota, Icono, Modal, Campo, Aviso, Vacio, useApi } from '../componentes/ui.jsx'
import { TIPOS_ACTIVIDAD, fechaHora } from '../util.js'
import { ComentariosTarea } from '../compartido/Interaccion.jsx'

export default function ActividadesDocente({ seleccion: s, Selector }) {
  const ruta = s.cargaId && s.periodoId ? `/docente/cargas/${s.cargaId}/actividades?periodo=${s.periodoId}` : null
  const consulta = useApi(ruta)
  const [formulario, setFormulario] = useState(null) // null | 'nueva' | id
  const [calificando, setCalificando] = useState(null)

  const total = consulta.datos?.reduce((a, x) => a + x.porcentaje, 0) ?? 0
  const cerrado = s.periodo?.cerrado

  async function borrar(a) {
    if (!window.confirm(`¿Eliminar "${a.titulo}"? También se borran sus entregas y calificaciones.`)) return
    try {
      await api(`/docente/actividades/${a.id}`, { method: 'DELETE' })
      consulta.recargar()
    } catch (err) {
      window.alert(err.message)
    }
  }

  return (
    <Caja
      titulo="Actividades del periodo"
      acciones={
        <>
          <Selector seleccion={s} />
          {!cerrado && <button className="btn-primario" onClick={() => setFormulario('nueva')}><Icono nombre="add" /> Nueva</button>}
        </>
      }
    >
      <ConDatos consulta={consulta}>
        {(lista) => (
          <>
            <div className="planilla-info">
              <span>{lista.length} actividades</span>
              <span className={total === 100 ? 'texto-ok' : 'texto-alerta'}>
                Suma de porcentajes: <strong>{total}%</strong>{total !== 100 && ' (debería sumar 100%)'}
              </span>
            </div>
            {lista.length === 0 ? <Vacio icono="assignment">Aún no has creado actividades para este periodo.</Vacio> : (
              <div className="tabla-scroll">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Actividad</th>
                      <th>Tipo</th>
                      <th>%</th>
                      <th>Entrega</th>
                      <th>Entregadas</th>
                      <th>Calificadas</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((a) => (
                      <tr key={a.id}>
                        <td><strong>{a.titulo}</strong>{!a.entrega_en_linea && <small>Presencial</small>}</td>
                        <td>{TIPOS_ACTIVIDAD[a.tipo]}{a.num_preguntas ? <small>{a.num_preguntas} preguntas</small> : null}</td>
                        <td>{a.porcentaje}%</td>
                        <td>{a.fecha_entrega ? fechaHora(a.fecha_entrega) : '—'}</td>
                        <td>{a.entrega_en_linea ? a.entregadas : '—'}</td>
                        <td>{a.calificadas}</td>
                        <td className="acciones-fila">
                          <button className="btn-secundario" onClick={() => setCalificando(a.id)}><Icono nombre="rate_review" /> Calificar</button>
                          {!cerrado && (
                            <>
                              <button className="btn-icono" title="Editar" onClick={() => setFormulario(a.id)}><Icono nombre="edit" /></button>
                              <button className="btn-icono peligro" title="Eliminar" onClick={() => borrar(a)}><Icono nombre="delete" /></button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </ConDatos>

      {formulario && (
        <FormActividad
          id={formulario === 'nueva' ? null : formulario}
          seleccion={s}
          onCerrar={(cambio) => { setFormulario(null); if (cambio) consulta.recargar() }}
        />
      )}
      {calificando && (
        <Calificar id={calificando} cerrado={cerrado} onCerrar={() => { setCalificando(null); consulta.recargar() }} />
      )}
    </Caja>
  )
}

const VACIA = { titulo: '', tipo: 'tarea', porcentaje: 10, fecha_entrega: '', entrega_en_linea: true, descripcion: '', preguntas: [] }
const PREGUNTA = () => ({ enunciado: '', opciones: ['', '', '', ''], correcta: 0 })

function FormActividad({ id, seleccion: s, onCerrar }) {
  const existente = useApi(id ? `/docente/actividades/${id}` : null)
  const [f, setF] = useState(VACIA)
  const [archivo, setArchivo] = useState(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const a = existente.datos?.actividad
    if (a) setF({ ...a, fecha_entrega: a.fecha_entrega?.slice(0, 16).replace(' ', 'T') ?? '', descripcion: a.descripcion ?? '', preguntas: a.preguntas ?? [] })
  }, [existente.datos])

  const cambiar = (campo) => (e) => setF({ ...f, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const cambiarPregunta = (i, cambios) => setF({ ...f, preguntas: f.preguntas.map((p, k) => (k === i ? { ...p, ...cambios } : p)) })

  async function guardar(e) {
    e.preventDefault()
    const form = new FormData()
    form.append('periodo_id', s.periodoId)
    for (const campo of ['titulo', 'tipo', 'porcentaje', 'fecha_entrega', 'descripcion']) form.append(campo, f[campo] ?? '')
    form.append('entrega_en_linea', f.entrega_en_linea)
    if (f.tipo === 'cuestionario') form.append('preguntas', JSON.stringify(f.preguntas))
    if (archivo) form.append('archivo', archivo)

    setGuardando(true)
    try {
      if (id) await api(`/docente/actividades/${id}`, { method: 'PUT', body: form })
      else await api(`/docente/cargas/${s.cargaId}/actividades`, { method: 'POST', body: form })
      onCerrar(true)
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={id ? 'Editar actividad' : `Nueva actividad · ${s.carga?.asignatura} ${s.carga?.grado}`} onCerrar={() => onCerrar(false)} ancho={720}>
      {id && existente.cargando ? null : (
        <form className="form" onSubmit={guardar}>
          <Campo etiqueta="Título"><input value={f.titulo} onChange={cambiar('titulo')} required maxLength={150} /></Campo>
          <div className="form-fila">
            <Campo etiqueta="Tipo">
              <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value, preguntas: e.target.value === 'cuestionario' && !f.preguntas.length ? [PREGUNTA()] : f.preguntas })}>
                {Object.entries(TIPOS_ACTIVIDAD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Porcentaje del periodo">
              <input type="number" min="0" max="100" value={f.porcentaje} onChange={cambiar('porcentaje')} required />
            </Campo>
            <Campo etiqueta="Fecha límite">
              <input type="datetime-local" value={f.fecha_entrega} onChange={cambiar('fecha_entrega')} />
            </Campo>
          </div>
          <Campo etiqueta="Instrucciones">
            <textarea rows={4} value={f.descripcion} onChange={cambiar('descripcion')} />
          </Campo>
          <div className="form-fila">
            <Campo etiqueta="Adjuntar guía o material (opcional)" ayuda={f.archivo_nombre ? `Actual: ${f.archivo_nombre}` : 'Máximo 10 MB'}>
              <input type="file" onChange={(e) => setArchivo(e.target.files[0] ?? null)} />
            </Campo>
            {f.tipo !== 'cuestionario' && (
              <label className="check">
                <input type="checkbox" checked={f.entrega_en_linea} onChange={cambiar('entrega_en_linea')} />
                Los estudiantes entregan por la plataforma
              </label>
            )}
          </div>

          {f.tipo === 'cuestionario' && (
            <div className="constructor">
              <h3>Preguntas <small>(se califican automáticamente: 1.0 + 4.0 × aciertos/total)</small></h3>
              {f.preguntas.map((p, i) => (
                <fieldset key={i} className="pregunta">
                  <legend>Pregunta {i + 1}</legend>
                  <input placeholder="Enunciado" value={p.enunciado} onChange={(e) => cambiarPregunta(i, { enunciado: e.target.value })} required />
                  {p.opciones.map((op, j) => (
                    <div key={j} className="opcion-editor">
                      <input type="radio" name={`correcta${i}`} checked={p.correcta === j} onChange={() => cambiarPregunta(i, { correcta: j })} title="Respuesta correcta" />
                      <input placeholder={`Opción ${j + 1}`} value={op}
                        onChange={(e) => cambiarPregunta(i, { opciones: p.opciones.map((o, k) => (k === j ? e.target.value : o)) })} />
                    </div>
                  ))}
                  <button type="button" className="enlace" onClick={() => setF({ ...f, preguntas: f.preguntas.filter((_, k) => k !== i) })}>Quitar pregunta</button>
                </fieldset>
              ))}
              <button type="button" className="btn-secundario" onClick={() => setF({ ...f, preguntas: [...f.preguntas, PREGUNTA()] })}>
                <Icono nombre="add" /> Agregar pregunta
              </button>
              <small className="texto-suave">Marca el círculo de la opción correcta. Las opciones vacías se ignoran.</small>
            </div>
          )}

          <Aviso>{error}</Aviso>
          <div className="form-acciones">
            <button type="button" className="btn-secundario" onClick={() => onCerrar(false)}>Cancelar</button>
            <button className="btn-primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar actividad'}</button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function Calificar({ id, cerrado, onCerrar }) {
  const consulta = useApi(`/docente/actividades/${id}`)
  const [filas, setFilas] = useState([])
  const [abierta, setAbierta] = useState(null)
  const [hilo, setHilo] = useState(null)
  const [msg, setMsg] = useState({ tipo: '', texto: '' })

  useEffect(() => {
    setFilas(consulta.datos?.estudiantes.map((e) => ({ ...e, nota: e.nota ?? '', retroalimentacion: e.retroalimentacion ?? '' })) ?? [])
  }, [consulta.datos])

  const cambiar = (i, campo, valor) => setFilas(filas.map((f, k) => (k === i ? { ...f, [campo]: valor } : f)))

  async function guardar() {
    try {
      await api(`/docente/actividades/${id}/calificaciones`, {
        method: 'PUT',
        body: { calificaciones: filas.map((f) => ({ matricula_id: f.matricula_id, nota: f.nota === '' ? null : Number(f.nota), retroalimentacion: f.retroalimentacion })) },
      })
      setMsg({ tipo: 'exito', texto: 'Calificaciones guardadas' })
      consulta.recargar()
    } catch (err) {
      setMsg({ tipo: 'error', texto: err.message })
    }
  }

  const a = consulta.datos?.actividad
  return (
    <Modal titulo={a ? `Calificar · ${a.titulo}` : 'Calificar'} onCerrar={onCerrar} ancho={900}>
      <ConDatos consulta={consulta}>
        {() => (
          <>
            {a.tipo === 'cuestionario' && <Aviso tipo="info">Los cuestionarios se califican solos al presentarse. Puedes ajustar la nota si lo necesitas.</Aviso>}
            <div className="tabla-scroll">
              <table className="tabla planilla">
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Entrega</th>
                    <th>Nota</th>
                    <th>Retroalimentación</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f, i) => (
                    <tr key={f.matricula_id}>
                      <td><strong>{f.nombre}</strong><small>{f.documento}</small></td>
                      <td>
                        {f.entregado_en ? (
                          <>
                            <span className="chip info">{fechaHora(f.entregado_en)}</span>
                            {(f.texto || f.archivo) && (
                              <button className="enlace" onClick={() => setAbierta(abierta === i ? null : i)}>{abierta === i ? 'Ocultar' : 'Ver entrega'}</button>
                            )}
                            {abierta === i && (
                              <div className="entrega-detalle">
                                {f.texto && <p>{f.texto}</p>}
                                {f.archivo && (
                                  <button className="btn-secundario" onClick={() => descargar(f.archivo, f.archivo_nombre)}>
                                    <Icono nombre="attach_file" /> {f.archivo_nombre}
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="texto-suave">{a.entrega_en_linea ? 'Sin entregar' : 'Presencial'}</span>
                        )}
                        <button className={f.comentarios > 0 ? 'enlace-comentarios con' : 'enlace-comentarios'} onClick={() => setHilo(f)}>
                          <Icono nombre="chat_bubble_outline" /> {f.comentarios > 0 ? f.comentarios : 'Comentar'}
                        </button>
                      </td>
                      <td>
                        <input className="input-nota" type="number" step="0.1" min="1" max="5" value={f.nota} disabled={cerrado}
                          onChange={(e) => cambiar(i, 'nota', e.target.value)} />
                      </td>
                      <td>
                        <input className="input-obs" value={f.retroalimentacion} disabled={cerrado} placeholder="Comentario para el estudiante"
                          onChange={(e) => cambiar(i, 'retroalimentacion', e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filas.length === 0 && <Vacio icono="groups">No hay estudiantes.</Vacio>}
            <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>
            {!cerrado && (
              <div className="form-acciones">
                <button className="btn-primario" onClick={guardar}>Guardar calificaciones</button>
              </div>
            )}
          </>
        )}
      </ConDatos>
      {hilo && (
        <Modal titulo={`Comentarios · ${hilo.nombre}`} onCerrar={() => { setHilo(null); consulta.recargar() }} ancho={560}>
          <ComentariosTarea actividadId={id} matriculaId={hilo.matricula_id} para="tú y este estudiante" />
        </Modal>
      )}
    </Modal>
  )
}
