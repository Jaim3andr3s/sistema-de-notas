// Piezas comunes del muro, los mensajes y los comentarios de tareas
import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { ConDatos, Icono, useApi } from '../componentes/ui.jsx'
import { ROLES, fechaHora } from '../util.js'

export function Avatar({ nombre = '', rol, pequeno }) {
  const iniciales = nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
  return <span className={`avatar-persona ${rol ?? ''} ${pequeno ? 'pequeno' : ''}`} aria-hidden="true">{iniciales || '?'}</span>
}

export function EtiquetaRol({ rol }) {
  if (rol === 'estudiante') return null
  return <span className={`chip rol-${rol}`}>{ROLES[rol]}</span>
}

// Cuadro de texto con botón de enviar; Enter envía y Shift+Enter hace salto de línea
export function Redactor({ placeholder, onEnviar, filas = 1, textoBoton }) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function enviar(e) {
    e?.preventDefault()
    if (!texto.trim() || enviando) return
    setEnviando(true)
    setError('')
    try {
      await onEnviar(texto.trim())
      setTexto('')
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="redactor" onSubmit={enviar}>
      <textarea
        rows={filas}
        value={texto}
        placeholder={placeholder}
        maxLength={2000}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && enviar(e)}
      />
      <button className="btn-enviar" disabled={!texto.trim() || enviando} aria-label="Enviar">
        {textoBoton ?? <Icono nombre="send" />}
      </button>
      {error && <p className="texto-error redactor-error">{error}</p>}
    </form>
  )
}

// Conversación en burbujas; "mio" alinea a la derecha
export function Burbujas({ mensajes, mostrarAutor = true }) {
  const fin = useRef(null)
  useEffect(() => {
    fin.current?.scrollIntoView({ block: 'nearest' })
  }, [mensajes.length])

  return (
    <ul className="burbujas">
      {mensajes.map((m) => (
        <li key={m.id} className={m.mio ? 'mia' : ''}>
          {mostrarAutor && !m.mio && <Avatar nombre={m.autor} rol={m.autor_rol} pequeno />}
          <div className="burbuja">
            {mostrarAutor && !m.mio && <strong>{m.autor}</strong>}
            <p>{m.texto}</p>
            <time>{fechaHora(m.creado_en)}</time>
          </div>
        </li>
      ))}
      <li ref={fin} className="burbujas-fin" />
    </ul>
  )
}

// Conversación privada estudiante-docente sobre una actividad
// El estudiante no envía matriculaId (es la suya); el docente sí
export function ComentariosTarea({ actividadId, matriculaId, para }) {
  const base = `/interaccion/actividades/${actividadId}/comentarios`
  const consulta = useApi(matriculaId ? `${base}?matricula=${matriculaId}` : base)

  return (
    <section className="hilo">
      <h3><Icono nombre="lock" /> Comentarios privados</h3>
      <p className="texto-suave">Solo {para ?? 'tú y tu docente'} pueden ver esta conversación.</p>
      <ConDatos consulta={consulta}>
        {(lista) => lista.length === 0
          ? <p className="texto-suave hilo-vacio">Aún no hay comentarios. ¿Tienes una duda sobre esta actividad?</p>
          : <Burbujas mensajes={lista} />}
      </ConDatos>
      <Redactor
        placeholder="Escribe un comentario privado…"
        onEnviar={async (texto) => {
          await api(base, { method: 'POST', body: { texto, matricula_id: matriculaId } })
          consulta.recargar()
        }}
      />
    </section>
  )
}

// Vuelve a consultar cada `ms` mientras el componente esté visible
export function useSondeo(recargar, ms) {
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && recargar(), ms)
    return () => clearInterval(t)
  }, [recargar, ms])
}
