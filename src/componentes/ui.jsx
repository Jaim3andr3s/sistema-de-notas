import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { desempeno } from '../util.js'

export function Icono({ nombre }) {
  return <span className="material-icons" aria-hidden="true">{nombre}</span>
}

export function Nota({ valor }) {
  if (valor == null) return <span className="nota vacia">—</span>
  const d = desempeno(valor)
  return <span className={`nota ${d.clase}`}>{Number(valor).toFixed(1)}</span>
}

export function Etiqueta({ valor, vacio = 'Pendiente' }) {
  const d = desempeno(valor)
  if (!d) return <span className="etiqueta vacia">{vacio}</span>
  return <span className={`etiqueta ${d.clase}`}>{d.nombre}</span>
}

export function Escala() {
  return (
    <div className="escala">
      <span className="etiqueta superior">Superior 4.6 – 5.0</span>
      <span className="etiqueta alto">Alto 4.0 – 4.5</span>
      <span className="etiqueta basico">Básico 3.0 – 3.9</span>
      <span className="etiqueta bajo">Bajo 1.0 – 2.9</span>
    </div>
  )
}

export function Cargando() {
  return <div className="estado-carga"><span className="girador" /> Cargando…</div>
}

export function Aviso({ tipo = 'error', children }) {
  if (!children) return null
  return <p className={`aviso ${tipo}`}>{children}</p>
}

export function Vacio({ icono = 'inbox', children }) {
  return (
    <div className="vacio">
      <Icono nombre={icono} />
      <p>{children}</p>
    </div>
  )
}

export function Caja({ titulo, acciones, children, className = '' }) {
  return (
    <section className={`caja ${className}`}>
      {(titulo || acciones) && (
        <div className="caja-titulo">
          {titulo && <h2>{titulo}</h2>}
          {acciones && <div className="caja-acciones">{acciones}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Modal({ titulo, onCerrar, children, ancho = 560 }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])

  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal" style={{ maxWidth: ancho }} role="dialog" aria-modal="true">
        <div className="modal-titulo">
          <h2>{titulo}</h2>
          <button className="btn-icono" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="close" /></button>
        </div>
        <div className="modal-cuerpo">{children}</div>
      </div>
    </div>
  )
}

export function Campo({ etiqueta, children, ayuda }) {
  return (
    <label className="campo-form">
      <span>{etiqueta}</span>
      {children}
      {ayuda && <small>{ayuda}</small>}
    </label>
  )
}

// Carga datos de la API; ruta = null no carga nada
export function useApi(ruta) {
  const [estado, setEstado] = useState({ datos: null, error: '', cargando: Boolean(ruta) })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!ruta) {
      setEstado({ datos: null, error: '', cargando: false })
      return
    }
    let vigente = true
    setEstado((e) => ({ ...e, cargando: true, error: '' }))
    api(ruta)
      .then((datos) => vigente && setEstado({ datos, error: '', cargando: false }))
      .catch((err) => vigente && setEstado({ datos: null, error: err.message, cargando: false }))
    return () => {
      vigente = false
    }
  }, [ruta, version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  return { ...estado, recargar }
}

// Muestra carga/error y solo renderiza children cuando hay datos
export function ConDatos({ consulta, children }) {
  if (consulta.cargando && !consulta.datos) return <Cargando />
  if (consulta.error) return <Aviso>{consulta.error}</Aviso>
  if (!consulta.datos) return null
  return children(consulta.datos)
}
