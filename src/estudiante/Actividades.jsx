import { useState } from 'react'
import { useVistaEstudiante } from './contexto.js'
import { api, descargar } from '../api.js'
import { Caja, ConDatos, Nota, Icono, Modal, Aviso, Vacio, Campo, useApi } from '../componentes/ui.jsx'
import { TIPOS_ACTIVIDAD, fechaHora, vencida } from '../util.js'
import { ComentariosTarea } from '../compartido/Interaccion.jsx'

const FILTROS = {
  pendientes: (a) => !a.entregado_en && a.nota == null,
  entregadas: (a) => a.entregado_en && a.nota == null,
  calificadas: (a) => a.nota != null,
  todas: () => true,
}

function estadoActividad(a) {
  if (a.nota != null) return { texto: 'Calificada', clase: 'ok' }
  if (a.entregado_en) return { texto: 'Entregada', clase: 'info' }
  if (!a.entrega_en_linea) return { texto: 'Presencial', clase: '' }
  if (vencida(a.fecha_entrega)) return { texto: 'Vencida', clase: 'alerta' }
  return { texto: 'Pendiente', clase: 'pendiente' }
}

export default function Actividades() {
  const { base } = useVistaEstudiante()
  const consulta = useApi(`${base}/actividades`)
  const [filtro, setFiltro] = useState('pendientes')
  const [asignatura, setAsignatura] = useState('')
  const [abierta, setAbierta] = useState(null)

  return (
    <Caja
      titulo="Actividades y tareas"
      acciones={
        <select value={asignatura} onChange={(e) => setAsignatura(e.target.value)}>
          <option value="">Todas las asignaturas</option>
          {[...new Set(consulta.datos?.map((a) => a.asignatura))].map((a) => <option key={a}>{a}</option>)}
        </select>
      }
    >
      <div className="pestanas">
        {Object.keys(FILTROS).map((f) => (
          <button key={f} className={filtro === f ? 'activa' : ''} onClick={() => setFiltro(f)}>
            {f[0].toUpperCase() + f.slice(1)}
            {consulta.datos && <span>{consulta.datos.filter(FILTROS[f]).length}</span>}
          </button>
        ))}
      </div>
      <ConDatos consulta={consulta}>
        {(lista) => {
          const visibles = lista.filter(FILTROS[filtro]).filter((a) => !asignatura || a.asignatura === asignatura)
          if (!visibles.length) return <Vacio icono="task_alt">No hay actividades en esta sección.</Vacio>
          return (
            <ul className="tarjetas-actividad">
              {visibles.map((a) => {
                const e = estadoActividad(a)
                return (
                  <li key={a.id}>
                    <button onClick={() => setAbierta(a.id)}>
                      <div className="act-cabecera">
                        <span className="act-tipo">{TIPOS_ACTIVIDAD[a.tipo]}</span>
                        <span className={`chip ${e.clase}`}>{e.texto}</span>
                      </div>
                      <strong>{a.titulo}</strong>
                      <small>{a.asignatura} · {a.periodo} · {a.porcentaje}%</small>
                      <div className="act-pie">
                        <span><Icono nombre="schedule" /> {a.fecha_entrega ? fechaHora(a.fecha_entrega) : 'Sin fecha'}</span>
                        {a.nota != null && <Nota valor={a.nota} />}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )
        }}
      </ConDatos>
      {abierta && <DetalleActividad id={abierta} onCerrar={() => { setAbierta(null); consulta.recargar() }} />}
    </Caja>
  )
}

function DetalleActividad({ id, onCerrar }) {
  const { base, soloLectura } = useVistaEstudiante()
  const consulta = useApi(`${base}/actividades/${id}`)
  return (
    <Modal titulo={consulta.datos?.titulo ?? 'Actividad'} onCerrar={onCerrar} ancho={680}>
      <ConDatos consulta={consulta}>
        {(a) => (
          <div className="detalle-actividad">
            <div className="chips">
              <span className="chip">{TIPOS_ACTIVIDAD[a.tipo]}</span>
              <span className="chip">{a.asignatura}</span>
              <span className="chip">{a.periodo} · {a.porcentaje}%</span>
              <span className="chip"><Icono nombre="schedule" /> {a.fecha_entrega ? fechaHora(a.fecha_entrega) : 'Sin fecha'}</span>
            </div>
            <p className="texto-suave">Docente: {a.docente}</p>
            {a.descripcion && <p className="descripcion">{a.descripcion}</p>}
            {a.archivo && (
              <button className="btn-secundario" onClick={() => descargar(a.archivo, a.archivo_nombre)}>
                <Icono nombre="attach_file" /> {a.archivo_nombre}
              </button>
            )}
            <hr />
            {soloLectura ? (
              <ResumenEntrega actividad={a} />
            ) : a.tipo === 'cuestionario' ? (
              <Cuestionario actividad={a} onListo={consulta.recargar} />
            ) : (
              <Entrega actividad={a} onListo={consulta.recargar} />
            )}
            {!soloLectura && (
              <>
                <hr />
                <ComentariosTarea actividadId={a.id} />
              </>
            )}
          </div>
        )}
      </ConDatos>
    </Modal>
  )
}

// Lo que ve el acudiente: si entregó, cuándo y con qué nota, sin poder entregar
function ResumenEntrega({ actividad: a }) {
  const e = a.entrega
  return (
    <>
      <h3>Entrega del estudiante</h3>
      {!a.entrega_en_linea && <Aviso tipo="info">Esta actividad se realiza de forma presencial.</Aviso>}
      {a.entrega_en_linea && (e?.entregado_en
        ? <p className="texto-suave">Entregada el {fechaHora(e.entregado_en)}</p>
        : <Aviso tipo={vencida(a.fecha_entrega) ? 'error' : 'info'}>{vencida(a.fecha_entrega) ? 'No la entregó y la fecha ya pasó.' : 'Todavía no la ha entregado.'}</Aviso>)}
      <Calificacion entrega={e} />
    </>
  )
}

function Calificacion({ entrega }) {
  if (entrega?.nota == null) return null
  return (
    <div className="calificacion">
      <div><span>Calificación</span><Nota valor={entrega.nota} /></div>
      {entrega.retroalimentacion && <p><strong>Retroalimentación:</strong> {entrega.retroalimentacion}</p>}
    </div>
  )
}

function Entrega({ actividad: a, onListo }) {
  const { base } = useVistaEstudiante()
  const [texto, setTexto] = useState(a.entrega?.texto ?? '')
  const [archivo, setArchivo] = useState(null)
  const [msg, setMsg] = useState({ tipo: '', texto: '' })
  const [enviando, setEnviando] = useState(false)
  const e = a.entrega

  if (!a.entrega_en_linea) {
    return (
      <>
        <Aviso tipo="info">Esta actividad se realiza de forma presencial; no requiere entrega en la plataforma.</Aviso>
        <Calificacion entrega={e} />
      </>
    )
  }

  async function entregar(ev) {
    ev.preventDefault()
    const form = new FormData()
    form.append('texto', texto)
    if (archivo) form.append('archivo', archivo)
    setEnviando(true)
    try {
      await api(`${base}/actividades/${a.id}/entrega`, { method: 'POST', body: form })
      setMsg({ tipo: 'exito', texto: '¡Entrega enviada!' })
      setArchivo(null)
      onListo()
    } catch (err) {
      setMsg({ tipo: 'error', texto: err.message })
    }
    setEnviando(false)
  }

  return (
    <>
      <h3>Mi entrega</h3>
      {e?.entregado_en && (
        <p className="texto-suave">
          Entregada el {fechaHora(e.entregado_en)}
          {a.fecha_entrega && new Date(e.entregado_en.replace(' ', 'T')) > new Date(a.fecha_entrega.replace(' ', 'T')) && <span className="chip alerta">Tardía</span>}
        </p>
      )}
      {e?.archivo && (
        <button className="btn-secundario" onClick={() => descargar(e.archivo, e.archivo_nombre)}>
          <Icono nombre="description" /> {e.archivo_nombre}
        </button>
      )}
      <Calificacion entrega={e} />
      {e?.nota == null && !a.periodo_cerrado && (
        <form className="form" onSubmit={entregar}>
          <Campo etiqueta="Respuesta o comentario">
            <textarea rows={5} value={texto} onChange={(ev) => setTexto(ev.target.value)} placeholder="Escribe tu respuesta…" />
          </Campo>
          <Campo etiqueta="Adjuntar archivo (opcional)" ayuda="PDF, Word, Excel, PowerPoint, imágenes o ZIP. Máximo 10 MB.">
            <input type="file" onChange={(ev) => setArchivo(ev.target.files[0] ?? null)} />
          </Campo>
          {vencida(a.fecha_entrega) && <Aviso tipo="info">La fecha de entrega ya pasó; tu entrega quedará marcada como tardía.</Aviso>}
          <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>
          <div className="form-acciones">
            <button className="btn-primario" disabled={enviando || (!texto.trim() && !archivo)}>
              {enviando ? 'Enviando…' : e?.entregado_en ? 'Actualizar entrega' : 'Entregar'}
            </button>
          </div>
        </form>
      )}
    </>
  )
}

function Cuestionario({ actividad: a, onListo }) {
  const { base } = useVistaEstudiante()
  const [respuestas, setRespuestas] = useState(() => a.preguntas.map(() => null))
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const presentado = Boolean(a.entrega?.entregado_en)
  const elegidas = presentado ? a.entrega.respuestas : respuestas

  async function presentar() {
    if (respuestas.some((r) => r == null)) return setError('Responde todas las preguntas antes de enviar')
    if (!window.confirm('¿Enviar tus respuestas? Solo tienes un intento.')) return
    const form = new FormData()
    form.append('respuestas', JSON.stringify(respuestas))
    setEnviando(true)
    try {
      await api(`${base}/actividades/${a.id}/entrega`, { method: 'POST', body: form })
      onListo()
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <>
      <h3>{presentado ? 'Resultado' : `Cuestionario · ${a.preguntas.length} preguntas`}</h3>
      <Calificacion entrega={a.entrega} />
      <ol className="cuestionario">
        {a.preguntas.map((p, i) => (
          <li key={i}>
            <p>{p.enunciado}</p>
            {p.opciones.map((op, j) => {
              let clase = 'opcion'
              if (presentado && j === p.correcta) clase += ' correcta'
              else if (presentado && j === Number(elegidas?.[i])) clase += ' incorrecta'
              return (
                <label key={j} className={clase}>
                  <input
                    type="radio"
                    name={`p${i}`}
                    checked={Number(elegidas?.[i]) === j && elegidas?.[i] != null}
                    disabled={presentado}
                    onChange={() => setRespuestas(respuestas.map((r, k) => (k === i ? j : r)))}
                  />
                  {op}
                </label>
              )
            })}
          </li>
        ))}
      </ol>
      {!presentado && (
        a.periodo_cerrado ? <Aviso tipo="info">El periodo está cerrado.</Aviso> : (
          <>
            <Aviso>{error}</Aviso>
            <div className="form-acciones">
              <button className="btn-primario" onClick={presentar} disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar respuestas'}</button>
            </div>
          </>
        )
      )}
    </>
  )
}
