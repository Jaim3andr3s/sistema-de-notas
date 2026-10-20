// Campanita de avisos en la barra superior
import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { Icono, useApi } from './ui.jsx'
import { useSondeo } from '../compartido/Interaccion.jsx'
import { fechaHora } from '../util.js'

const ICONOS = {
  actividad: 'assignment', calificacion: 'grading', falla: 'event_busy', observador: 'fact_check',
  anuncio: 'campaign', muro: 'forum', comentario: 'chat_bubble', mejoramiento: 'trending_up',
}

export default function Campanita({ menu, onIr }) {
  const consulta = useApi('/notificaciones')
  useSondeo(consulta.recargar, 60000)
  const [abierta, setAbierta] = useState(false)
  const caja = useRef(null)

  // Se cierra al tocar fuera
  useEffect(() => {
    if (!abierta) return
    const fuera = (e) => !caja.current?.contains(e.target) && setAbierta(false)
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierta])

  const { sin_leer: sinLeer = 0, lista = [] } = consulta.datos ?? {}

  async function abrir(n) {
    setAbierta(false)
    if (!n.leida_en) await api(`/notificaciones/${n.id}/leida`, { method: 'POST' }).catch(() => {})
    consulta.recargar()
    if (n.vista && menu.some((m) => m.id === n.vista)) onIr(n.vista)
  }

  async function leerTodas() {
    await api('/notificaciones/leidas', { method: 'POST' }).catch(() => {})
    consulta.recargar()
  }

  return (
    <div className="campanita" ref={caja}>
      <button className="btn-campanita" onClick={() => setAbierta(!abierta)} aria-label={`Notificaciones${sinLeer ? `: ${sinLeer} sin leer` : ''}`} aria-expanded={abierta}>
        <Icono nombre={sinLeer ? 'notifications_active' : 'notifications'} />
        {sinLeer > 0 && <span className="insignia">{sinLeer > 9 ? '9+' : sinLeer}</span>}
      </button>
      {abierta && (
        <div className="panel-avisos" role="dialog" aria-label="Notificaciones">
          <div className="panel-avisos-titulo">
            <strong>Notificaciones</strong>
            {sinLeer > 0 && <button className="enlace" onClick={leerTodas}>Marcar todas como leídas</button>}
          </div>
          {lista.length === 0 ? (
            <p className="texto-suave panel-avisos-vacio">No tienes notificaciones.</p>
          ) : (
            <ul>
              {lista.map((n) => (
                <li key={n.id}>
                  <button className={n.leida_en ? '' : 'nueva'} onClick={() => abrir(n)}>
                    <span className={`aviso-icono ${n.tipo}`}><Icono nombre={ICONOS[n.tipo] ?? 'notifications'} /></span>
                    <span className="crece">
                      <strong>{n.titulo}</strong>
                      {n.texto && <small>{n.texto}</small>}
                      <time>{fechaHora(n.creado_en)}</time>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
