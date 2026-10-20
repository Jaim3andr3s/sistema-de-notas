// Calendario académico del mes: entregas, anuncios y cierres de periodo
import { useState } from 'react'
import { Caja, ConDatos, Icono, Vacio, useApi } from '../componentes/ui.jsx'
import { TIPOS_ACTIVIDAD, hoy } from '../util.js'

const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const ICONOS = { actividad: 'assignment', anuncio: 'campaign', periodo: 'flag' }

function desplazar(mes, n) {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function Calendario() {
  const [mes, setMes] = useState(hoy().slice(0, 7))
  const [dia, setDia] = useState(hoy())
  const consulta = useApi(`/calendario?mes=${mes}`)

  const [anio, m] = mes.split('-').map(Number)
  const primero = new Date(anio, m - 1, 1)
  const diasMes = new Date(anio, m, 0).getDate()
  const relleno = (primero.getDay() + 6) % 7 // la semana empieza el lunes
  const celdas = [...Array(relleno).fill(null), ...Array.from({ length: diasMes }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`)]
  const titulo = primero.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  const eventos = consulta.datos?.eventos ?? []
  const delDia = (f) => eventos.filter((e) => String(e.fecha).slice(0, 10) === f)
  const seleccionados = delDia(dia)

  return (
    <div className="columnas calendario-grid">
      <Caja
        titulo={titulo.charAt(0).toUpperCase() + titulo.slice(1)}
        acciones={
          <>
            <button className="btn-icono" onClick={() => setMes(desplazar(mes, -1))} aria-label="Mes anterior"><Icono nombre="chevron_left" /></button>
            <button className="btn-secundario" onClick={() => { setMes(hoy().slice(0, 7)); setDia(hoy()) }}>Hoy</button>
            <button className="btn-icono" onClick={() => setMes(desplazar(mes, 1))} aria-label="Mes siguiente"><Icono nombre="chevron_right" /></button>
          </>
        }
      >
        <div className="calendario">
          {DIAS_CORTOS.map((d) => <span key={d} className="cal-cabecera">{d}</span>)}
          {celdas.map((f, i) => {
            if (!f) return <span key={`v${i}`} />
            const evs = delDia(f)
            return (
              <button
                key={f}
                className={['cal-dia', f === hoy() && 'hoy', f === dia && 'elegido', evs.length && 'con-eventos'].filter(Boolean).join(' ')}
                onClick={() => setDia(f)}
                aria-label={`${Number(f.slice(8))}: ${evs.length} eventos`}
              >
                <span className="cal-numero">{Number(f.slice(8))}</span>
                <span className="cal-puntos">{evs.slice(0, 4).map((e, k) => <i key={k} className={e.tipo} />)}</span>
              </button>
            )
          })}
        </div>
        <div className="cal-leyenda">
          <span><i className="actividad" /> Entregas</span>
          <span><i className="anuncio" /> Anuncios</span>
          <span><i className="periodo" /> Periodos</span>
        </div>
      </Caja>

      <Caja titulo={new Date(dia + 'T12:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}>
        <ConDatos consulta={consulta}>
          {() => seleccionados.length === 0 ? <Vacio icono="event_available">Nada programado este día.</Vacio> : (
            <ul className="cal-eventos">
              {seleccionados.map((e, i) => (
                <li key={i} className={e.tipo}>
                  <span className="aviso-icono"><Icono nombre={ICONOS[e.tipo]} /></span>
                  <div className="crece">
                    <strong>{e.titulo}</strong>
                    {e.detalle && <small>{e.detalle}</small>}
                    {e.tipo === 'actividad' && (
                      <small>
                        {TIPOS_ACTIVIDAD[e.subtipo]} · {String(e.fecha).slice(11, 16)}
                        {e.entregada === true && <span className="chip ok">Entregada</span>}
                        {e.entregada === false && <span className="chip pendiente">Pendiente</span>}
                      </small>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ConDatos>
        <h3 className="cal-subtitulo">Próximos en el mes</h3>
        <ul className="cal-proximos">
          {eventos.filter((e) => String(e.fecha).slice(0, 10) > dia).slice(0, 6).map((e, i) => (
            <li key={i}>
              <button onClick={() => setDia(String(e.fecha).slice(0, 10))}>
                <time>{new Date(String(e.fecha).slice(0, 10) + 'T12:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</time>
                <span>{e.titulo}</span>
              </button>
            </li>
          ))}
        </ul>
      </Caja>
    </div>
  )
}
