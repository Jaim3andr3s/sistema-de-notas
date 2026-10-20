// Planes de mejoramiento del estudiante (el acudiente los ve sin poder entregar)
import { useState } from 'react'
import { api, descargar } from '../api.js'
import { Aviso, Caja, Campo, ConDatos, Icono, Nota, Vacio, useApi } from '../componentes/ui.jsx'
import { useVistaEstudiante } from './contexto.js'
import { fecha, fechaHora, vencida } from '../util.js'

export const ESTADOS_PLAN = {
  pendiente: { texto: 'Pendiente', clase: 'pendiente' },
  entregado: { texto: 'Entregado', clase: 'info' },
  aprobado: { texto: 'Aprobado', clase: 'ok' },
  no_aprobado: { texto: 'No aprobado', clase: 'alerta' },
}

export default function Mejoramiento() {
  const { base, soloLectura } = useVistaEstudiante()
  const consulta = useApi(`${base}/mejoramiento`)
  return (
    <Caja titulo="Planes de mejoramiento">
      <p className="texto-suave intro-seccion">
        Cuando una asignatura se pierde en un periodo, el docente asigna un plan de mejoramiento (recuperación).
        {soloLectura ? ' El estudiante lo entrega desde su cuenta.' : ' Entrégalo antes de la fecha límite.'}
      </p>
      <ConDatos consulta={consulta}>
        {(planes) => planes.length === 0 ? <Vacio icono="task_alt">No hay planes de mejoramiento. ¡Muy bien!</Vacio> : (
          <div className="planes">
            {planes.map((p) => <Plan key={p.id} plan={p} soloLectura={soloLectura} base={base} onListo={consulta.recargar} />)}
          </div>
        )}
      </ConDatos>
    </Caja>
  )
}

function Plan({ plan: p, soloLectura, base, onListo }) {
  const [texto, setTexto] = useState(p.entrega_texto ?? '')
  const [archivo, setArchivo] = useState(null)
  const [msg, setMsg] = useState({ tipo: '', texto: '' })
  const [enviando, setEnviando] = useState(false)
  const evaluado = ['aprobado', 'no_aprobado'].includes(p.estado)
  const estado = ESTADOS_PLAN[p.estado]

  async function entregar(e) {
    e.preventDefault()
    const form = new FormData()
    form.append('texto', texto)
    if (archivo) form.append('archivo', archivo)
    setEnviando(true)
    try {
      await api(`${base}/mejoramiento/${p.id}/entrega`, { method: 'POST', body: form })
      setMsg({ tipo: 'exito', texto: '¡Plan entregado!' })
      onListo()
    } catch (err) {
      setMsg({ tipo: 'error', texto: err.message })
    }
    setEnviando(false)
  }

  return (
    <article className={`plan ${p.estado}`}>
      <header>
        <div className="crece">
          <strong>{p.asignatura} · {p.periodo}</strong>
          <small>Docente: {p.docente ?? '—'} · Nota del periodo <Nota valor={p.nota_periodo} /></small>
        </div>
        <span className={`chip ${estado.clase}`}>{estado.texto}</span>
      </header>
      <p className="descripcion">{p.descripcion}</p>
      <p className={`texto-suave ${!evaluado && vencida(`${p.fecha_limite} 23:59`) ? 'texto-error' : ''}`}>
        <Icono nombre="event" /> Fecha límite: {fecha(p.fecha_limite, { day: 'numeric', month: 'long' })}
      </p>
      {p.entregado_en && (
        <div className="entrega-detalle">
          <small>Entregado el {fechaHora(p.entregado_en)}</small>
          {p.entrega_texto && <p>{p.entrega_texto}</p>}
          {p.entrega_archivo && (
            <button className="btn-secundario" onClick={() => descargar(p.entrega_archivo, p.entrega_archivo_nombre)}>
              <Icono nombre="attach_file" /> {p.entrega_archivo_nombre}
            </button>
          )}
        </div>
      )}
      {evaluado && (
        <div className="calificacion">
          <div><span>Nota de recuperación</span><Nota valor={p.nota_recuperacion} /></div>
          {p.observacion_docente && <p><strong>Observación:</strong> {p.observacion_docente}</p>}
        </div>
      )}
      {!evaluado && !soloLectura && (
        <form className="form" onSubmit={entregar}>
          <Campo etiqueta={p.entregado_en ? 'Actualizar mi entrega' : 'Mi entrega'}>
            <textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe tu respuesta o un comentario para el docente…" />
          </Campo>
          <Campo etiqueta="Adjuntar archivo (opcional)">
            <input type="file" onChange={(e) => setArchivo(e.target.files[0] ?? null)} />
          </Campo>
          <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>
          <div className="form-acciones">
            <button className="btn-primario" disabled={enviando || (!texto.trim() && !archivo)}>{enviando ? 'Enviando…' : 'Entregar plan'}</button>
          </div>
        </form>
      )}
    </article>
  )
}
