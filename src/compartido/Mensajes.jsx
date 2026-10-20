// Mensajes privados uno a uno entre estudiantes, docentes y coordinación
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { ConDatos, Icono, Modal, Vacio, useApi } from '../componentes/ui.jsx'
import { Avatar, Burbujas, EtiquetaRol, Redactor, useSondeo } from './Interaccion.jsx'
import { ROLES, fechaHora, nombreCompleto } from '../util.js'

export default function Mensajes({ usuario }) {
  const conversaciones = useApi('/interaccion/mensajes')
  useSondeo(conversaciones.recargar, 20000)
  const [abierta, setAbierta] = useState(null) // { id, nombres, apellidos, rol }
  const [eligiendo, setEligiendo] = useState(false)

  return (
    <section className={abierta ? 'chat con-conversacion' : 'chat'}>
      <aside className="chat-lista">
        <div className="chat-lista-titulo">
          <h2>Conversaciones</h2>
          <button className="btn-primario" onClick={() => setEligiendo(true)}><Icono nombre="edit" /> Nuevo</button>
        </div>
        <ConDatos consulta={conversaciones}>
          {(lista) => lista.length === 0 ? (
            <Vacio icono="chat">
              {usuario.rol === 'estudiante' ? 'Escríbele a tus docentes cuando tengas una duda.' : 'Aún no tienes conversaciones.'}
            </Vacio>
          ) : (
            <ul>
              {lista.map((c) => (
                <li key={c.id}>
                  <button className={abierta?.id === c.id ? 'activa' : ''} onClick={() => setAbierta(c)}>
                    <Avatar nombre={nombreCompleto(c)} rol={c.rol} />
                    <span className="chat-resumen">
                      <strong>{nombreCompleto(c)}</strong>
                      <small>{c.mio ? 'Tú: ' : ''}{c.ultimo}</small>
                    </span>
                    <span className="chat-meta">
                      <time>{fechaHora(c.fecha)}</time>
                      {c.sin_leer > 0 && <span className="insignia">{c.sin_leer}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ConDatos>
      </aside>

      <div className="chat-conversacion">
        {abierta ? (
          <Conversacion key={abierta.id} otro={abierta} onVolver={() => setAbierta(null)} onCambio={conversaciones.recargar} />
        ) : (
          <Vacio icono="forum">Elige una conversación o empieza una nueva.</Vacio>
        )}
      </div>

      {eligiendo && (
        <ElegirContacto
          onCerrar={() => setEligiendo(false)}
          onElegir={(c) => {
            setAbierta(c)
            setEligiendo(false)
          }}
        />
      )}
    </section>
  )
}

function Conversacion({ otro, onVolver, onCambio }) {
  const consulta = useApi(`/interaccion/mensajes/${otro.id}`)
  useSondeo(consulta.recargar, 10000)

  // Cada carga marca como leídos los mensajes recibidos: se actualizan la lista y el contador del menú
  const recibidos = consulta.datos?.mensajes.filter((m) => !m.mio).length ?? 0
  useEffect(() => {
    if (!recibidos) return
    onCambio()
    window.dispatchEvent(new Event('mensajes-leidos'))
  }, [recibidos, onCambio])

  return (
    <>
      <header className="chat-cabecera">
        <button className="btn-icono chat-volver" onClick={onVolver} aria-label="Volver"><Icono nombre="arrow_back" /></button>
        <Avatar nombre={nombreCompleto(otro)} rol={otro.rol} />
        <div>
          <strong>{nombreCompleto(otro)}</strong>
          <small>{otro.detalle || ROLES[otro.rol]}</small>
        </div>
      </header>
      <div className="chat-mensajes">
        <ConDatos consulta={consulta}>
          {({ mensajes }) => mensajes.length === 0
            ? <Vacio icono="waving_hand">Escribe el primer mensaje.</Vacio>
            : <Burbujas mensajes={mensajes} mostrarAutor={false} />}
        </ConDatos>
      </div>
      <Redactor
        placeholder="Escribe un mensaje…"
        onEnviar={async (texto) => {
          await api(`/interaccion/mensajes/${otro.id}`, { method: 'POST', body: { texto } })
          consulta.recargar()
          onCambio()
        }}
      />
    </>
  )
}

function ElegirContacto({ onCerrar, onElegir }) {
  const consulta = useApi('/interaccion/contactos')
  const [buscar, setBuscar] = useState('')
  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    return (consulta.datos ?? []).filter((c) => !q || `${nombreCompleto(c)} ${c.detalle ?? ''}`.toLowerCase().includes(q))
  }, [consulta.datos, buscar])

  return (
    <Modal titulo="Nuevo mensaje" onCerrar={onCerrar} ancho={520}>
      <input className="buscador ancho" autoFocus placeholder="Buscar por nombre, grado o asignatura…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
      <ConDatos consulta={consulta}>
        {() => filtrados.length === 0 ? <Vacio icono="person_search">No hay contactos con ese nombre.</Vacio> : (
          <ul className="contactos">
            {filtrados.map((c) => (
              <li key={c.id}>
                <button onClick={() => onElegir(c)}>
                  <Avatar nombre={nombreCompleto(c)} rol={c.rol} />
                  <span className="crece">
                    <strong>{nombreCompleto(c)}</strong> <EtiquetaRol rol={c.rol} />
                    <small>{c.detalle || ROLES[c.rol]}</small>
                  </span>
                  <Icono nombre="chevron_right" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </ConDatos>
    </Modal>
  )
}
