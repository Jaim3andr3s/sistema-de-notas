import { useState } from 'react'
import { api } from '../api.js'
import { Caja, ConDatos, Icono, Modal, Campo, Aviso, Vacio, useApi } from '../componentes/ui.jsx'
import { SelectorGrado } from './Reportes.jsx'
import { TIPOS_OBSERVACION, TIPIFICACIONES, fecha, fechaHora, hoy } from '../util.js'

// Lista de anotaciones (la usa también el estudiante)
export function ListaObservaciones({ observaciones, acciones }) {
  if (!observaciones.length) return <Vacio icono="fact_check">No hay anotaciones en el observador.</Vacio>
  return (
    <ul className="observaciones">
      {observaciones.map((o) => (
        <li key={o.id} className={`obs ${o.tipo}`}>
          <div className="obs-cabecera">
            <span className={`obs-tipo ${o.tipo}`}>{TIPOS_OBSERVACION[o.tipo]}</span>
            {o.tipificacion !== 'ninguna' && <span className="obs-tipificacion">{TIPIFICACIONES[o.tipificacion]}</span>}
            <time>{fecha(o.fecha)}</time>
          </div>
          <p>{o.descripcion}</p>
          {o.accion && <p className="obs-detalle"><strong>Acción pedagógica:</strong> {o.accion}</p>}
          {o.descargos && (
            <p className="obs-detalle descargos"><strong>Descargos del estudiante ({fechaHora(o.descargos_en)}):</strong> {o.descargos}</p>
          )}
          <div className="obs-pie">
            <span>Registró: {o.autor || '—'}</span>
            {o.notificado_acudiente ? <span className="chip"><Icono nombre="mark_email_read" /> Acudiente notificado</span> : null}
            {acciones?.(o)}
          </div>
        </li>
      ))}
    </ul>
  )
}

const VACIA = { fecha: hoy(), tipo: 'academica', tipificacion: 'ninguna', descripcion: '', accion: '', notificado_acudiente: false }

function FormObservacion({ inicial, onGuardar, onCancelar }) {
  const [f, setF] = useState(inicial)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const cambiar = (campo) => (e) => setF({ ...f, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      await onGuardar(f)
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <form className="form" onSubmit={enviar}>
      <div className="form-fila">
        <Campo etiqueta="Fecha"><input type="date" value={f.fecha} onChange={cambiar('fecha')} required /></Campo>
        <Campo etiqueta="Tipo">
          <select value={f.tipo} onChange={cambiar('tipo')}>
            {Object.entries(TIPOS_OBSERVACION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Campo>
      </div>
      {f.tipo === 'convivencia' && (
        <Campo etiqueta="Tipificación (Ley 1620)">
          <select value={f.tipificacion} onChange={cambiar('tipificacion')}>
            {Object.entries(TIPIFICACIONES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Campo>
      )}
      <Campo etiqueta="Descripción de la situación">
        <textarea rows={4} value={f.descripcion} onChange={cambiar('descripcion')} required />
      </Campo>
      <Campo etiqueta="Acción pedagógica / compromiso (opcional)">
        <textarea rows={2} value={f.accion ?? ''} onChange={cambiar('accion')} />
      </Campo>
      <label className="check">
        <input type="checkbox" checked={Boolean(f.notificado_acudiente)} onChange={cambiar('notificado_acudiente')} />
        Se notificó al acudiente
      </label>
      <Aviso>{error}</Aviso>
      <div className="form-acciones">
        <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  )
}

function ObservadorEstudiante({ matriculaId, usuario, onCerrar }) {
  const consulta = useApi(`/reportes/observador/${matriculaId}`)
  const [editando, setEditando] = useState(null)

  async function guardar(f) {
    if (f.id) await api(`/reportes/observaciones/${f.id}`, { method: 'PUT', body: f })
    else await api(`/reportes/observador/${matriculaId}`, { method: 'POST', body: f })
    setEditando(null)
    consulta.recargar()
  }

  async function borrar(o) {
    if (!window.confirm('¿Eliminar esta anotación del observador?')) return
    await api(`/reportes/observaciones/${o.id}`, { method: 'DELETE' })
    consulta.recargar()
  }

  const titulo = consulta.datos ? `${consulta.datos.estudiante.apellidos} ${consulta.datos.estudiante.nombres} · ${consulta.datos.estudiante.grado}` : 'Observador'
  return (
    <Modal titulo={titulo} onCerrar={onCerrar} ancho={720}>
      <ConDatos consulta={consulta}>
        {({ estudiante, observaciones }) => (
          <>
            <p className="texto-suave">
              Acudiente: {estudiante.acudiente_nombre || '—'} · Tel. {estudiante.acudiente_telefono || '—'}
            </p>
            {editando ? (
              <FormObservacion inicial={editando} onGuardar={guardar} onCancelar={() => setEditando(null)} />
            ) : (
              <>
                <button className="btn-primario" onClick={() => setEditando(VACIA)}>
                  <Icono nombre="add" /> Nueva anotación
                </button>
                <ListaObservaciones
                  observaciones={observaciones}
                  acciones={(o) =>
                    (usuario.rol === 'administrador' || o.autor_id === usuario.id) && (
                      <span className="obs-botones">
                        <button className="enlace" onClick={() => setEditando({ ...o, accion: o.accion ?? '' })}>Editar</button>
                        <button className="enlace" onClick={() => borrar(o)}>Eliminar</button>
                      </span>
                    )
                  }
                />
              </>
            )}
          </>
        )}
      </ConDatos>
    </Modal>
  )
}

export default function Observador({ usuario }) {
  const [gradoId, setGradoId] = useState(null)
  const [abierto, setAbierto] = useState(null)
  const [filtro, setFiltro] = useState('')
  const consulta = useApi(gradoId ? `/reportes/grados/${gradoId}/estudiantes` : null)

  return (
    <Caja
      titulo="Observador del estudiante"
      acciones={
        <>
          <input className="buscador" placeholder="Buscar estudiante…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
          <SelectorGrado valor={gradoId} onCambio={setGradoId} />
        </>
      }
    >
      <ConDatos consulta={consulta}>
        {({ estudiantes }) => (
          <ul className="lista-estudiantes">
            {estudiantes
              .filter((e) => `${e.apellidos} ${e.nombres} ${e.documento}`.toLowerCase().includes(filtro.toLowerCase()))
              .map((e) => (
                <li key={e.matricula_id}>
                  <button onClick={() => setAbierto(e.matricula_id)}>
                    <div className="avatar chico">{e.nombres[0]}</div>
                    <div>
                      <strong>{e.apellidos} {e.nombres}</strong>
                      <small>Doc. {e.documento}</small>
                    </div>
                    <span className={e.observaciones ? 'contador activo' : 'contador'}>{e.observaciones}</span>
                    <Icono nombre="chevron_right" />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </ConDatos>
      {abierto && (
        <ObservadorEstudiante
          matriculaId={abierto}
          usuario={usuario}
          onCerrar={() => {
            setAbierto(null)
            consulta.recargar()
          }}
        />
      )}
    </Caja>
  )
}
