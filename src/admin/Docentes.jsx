// Rectoría: equipo docente, disponibilidad (hora libre) y directores de grupo
import { useState } from 'react'
import { api } from '../api.js'
import { Caja, ConDatos, Icono, Modal, Aviso, Vacio, useApi } from '../componentes/ui.jsx'
import TablaHorario from '../compartido/TablaHorario.jsx'
import { Avatar } from '../compartido/Interaccion.jsx'
import { DIAS, nombreCompleto } from '../util.js'

const MAX_GRUPOS = 2

export default function Docentes() {
  const [pestana, setPestana] = useState('disponibilidad')
  return (
    <>
      <div className="pestanas">
        <button className={pestana === 'disponibilidad' ? 'activa' : ''} onClick={() => setPestana('disponibilidad')}>
          <Icono nombre="schedule" /> ¿Quién está libre?
        </button>
        <button className={pestana === 'directores' ? 'activa' : ''} onClick={() => setPestana('directores')}>
          <Icono nombre="supervisor_account" /> Directores de grupo
        </button>
      </div>
      {pestana === 'disponibilidad' ? <Disponibilidad /> : <Directores />}
    </>
  )
}

function Disponibilidad() {
  const [filtro, setFiltro] = useState({ dia: '', hora: '' }) // vacío = ahora
  const ruta = filtro.dia ? `/admin/disponibilidad?dia=${filtro.dia}&hora=${filtro.hora}` : '/admin/disponibilidad'
  const consulta = useApi(ruta)
  const [verDocente, setVerDocente] = useState(null)

  return (
    <ConDatos consulta={consulta}>
      {(d) => {
        const libres = d.docentes.filter((x) => !x.clase)
        const enClase = d.docentes.filter((x) => x.clase)
        const franja = d.franjas.find((f) => f.inicio <= d.hora && d.hora < f.fin)
        return (
          <>
            <Caja
              titulo={d.en_vivo ? 'En este momento' : `${d.nombre_dia} · ${franja ? `${franja.inicio}–${franja.fin}` : d.hora}`}
              acciones={
                <>
                  <select value={d.dia} onChange={(e) => setFiltro({ dia: e.target.value, hora: d.hora })} aria-label="Día">
                    {DIAS.map((nombre, i) => <option key={nombre} value={i + 1}>{nombre}</option>)}
                  </select>
                  <select value={franja?.inicio ?? ''} onChange={(e) => setFiltro({ dia: d.dia, hora: e.target.value })} aria-label="Hora">
                    {!franja && <option value="">{d.hora}</option>}
                    {d.franjas.map((f) => <option key={f.inicio} value={f.inicio}>{f.inicio}–{f.fin}</option>)}
                  </select>
                  {filtro.dia && <button className="btn-secundario" onClick={() => setFiltro({ dia: '', hora: '' })}><Icono nombre="update" /> Ahora</button>}
                </>
              }
            >
              {!d.en_vivo && !filtro.dia && (
                <Aviso tipo="info">Ahora no hay clases; se muestra la primera hora del {d.nombre_dia.toLowerCase()}. Elige otro día u hora para consultar.</Aviso>
              )}
              <div className="resumen-disponibilidad">
                <span className="chip ok"><Icono nombre="free_breakfast" /> {libres.length} en hora libre</span>
                <span className="chip info"><Icono nombre="co_present" /> {enClase.length} en clase</span>
              </div>
            </Caja>

            <div className="columnas columnas-iguales">
              <Caja titulo="En hora libre">
                {libres.length === 0 ? <Vacio icono="event_busy">Todos los docentes están en clase.</Vacio> : (
                  <ul className="lista-docentes">
                    {libres.map((x) => (
                      <FilaDocente key={x.id} docente={x} onVer={() => setVerDocente(x)}>
                        <small>
                          {x.siguiente
                            ? <>Próxima clase: {x.siguiente.inicio} · {x.siguiente.asignatura} {x.siguiente.grado}</>
                            : x.clases_dia ? 'No tiene más clases este día' : 'No tiene clases este día'}
                        </small>
                      </FilaDocente>
                    ))}
                  </ul>
                )}
              </Caja>
              <Caja titulo="En clase">
                {enClase.length === 0 ? <Vacio icono="free_breakfast">Nadie está dictando clase en esta hora.</Vacio> : (
                  <ul className="lista-docentes">
                    {enClase.map((x) => (
                      <FilaDocente key={x.id} docente={x} onVer={() => setVerDocente(x)} ocupado>
                        <small>{x.clase.asignatura} · <strong>{x.clase.grado}</strong> · hasta las {x.clase.fin}</small>
                      </FilaDocente>
                    ))}
                  </ul>
                )}
              </Caja>
            </div>
            {verDocente && <HorarioDocente docente={verDocente} onCerrar={() => setVerDocente(null)} />}
          </>
        )
      }}
    </ConDatos>
  )
}

function FilaDocente({ docente, ocupado, onVer, children }) {
  return (
    <li>
      <button onClick={onVer}>
        <span className={ocupado ? 'punto ocupado' : 'punto libre'} aria-hidden="true" />
        <Avatar nombre={nombreCompleto(docente)} rol="docente" />
        <span className="crece">
          <strong>{nombreCompleto(docente)}</strong>
          {docente.direccion && <span className="chip rol-docente">Director(a) {docente.direccion}</span>}
          {children}
        </span>
        <Icono nombre="chevron_right" />
      </button>
    </li>
  )
}

function HorarioDocente({ docente, onCerrar }) {
  const consulta = useApi(`/admin/docentes/${docente.id}/horario`)
  return (
    <Modal titulo={nombreCompleto(docente)} onCerrar={onCerrar} ancho={860}>
      <ConDatos consulta={consulta}>
        {(d) => (
          <>
            <div className="chips">
              {d.direccion.length > 0
                ? <span className="chip rol-docente"><Icono nombre="supervisor_account" /> Director(a) de {d.direccion.join(' y ')}</span>
                : <span className="chip">Sin dirección de grupo</span>}
              {d.cargas.map((c) => <span key={`${c.asignatura}-${c.grado}`} className="chip">{c.asignatura} {c.grado} · {c.ih} h</span>)}
              {d.docente.telefono && <span className="chip"><Icono nombre="call" /> {d.docente.telefono}</span>}
            </div>
            <TablaHorario bloques={d.bloques} />
          </>
        )}
      </ConDatos>
    </Modal>
  )
}

function Directores() {
  const grados = useApi('/admin/grados')
  const docentes = useApi('/admin/usuarios?rol=docente')
  const [msg, setMsg] = useState({ tipo: '', texto: '' })

  const anio = grados.datos?.[0]?.anio
  const delAnio = grados.datos?.filter((g) => g.anio === anio) ?? []
  const activos = docentes.datos?.filter((d) => d.activo) ?? []
  const gruposDe = (id) => delAnio.filter((g) => g.director_id === id)

  async function cambiar(grado, directorId) {
    setMsg({ tipo: '', texto: '' })
    try {
      await api(`/admin/grados/${grado.id}/director`, { method: 'PATCH', body: { director_id: directorId ? Number(directorId) : null } })
      setMsg({ tipo: 'exito', texto: `Director(a) de ${grado.nombre} actualizado` })
      grados.recargar()
    } catch (err) {
      setMsg({ tipo: 'error', texto: err.message })
    }
  }

  return (
    <ConDatos consulta={grados}>
      {() => (
        <>
          <Caja titulo={`Directores de grupo · ${anio ?? ''}`}>
            <p className="texto-suave intro-seccion">
              El director de grupo responde por los estudiantes de su grado: es a quien se busca cuando algo pasa con ellos.
              Cada docente puede dirigir máximo {MAX_GRUPOS} grupos.
            </p>
            <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Grado</th><th>Jornada</th><th>Estudiantes</th><th>Director(a) de grupo</th></tr></thead>
                <tbody>
                  {delAnio.map((g) => (
                    <tr key={g.id}>
                      <td><strong>{g.nombre}</strong></td>
                      <td>{g.jornada}</td>
                      <td>{g.estudiantes}</td>
                      <td>
                        <select value={g.director_id ?? ''} onChange={(e) => cambiar(g, e.target.value)} aria-label={`Director de ${g.nombre}`}>
                          <option value="">— Sin director —</option>
                          {activos.map((d) => {
                            const n = gruposDe(d.id).length
                            const lleno = n >= MAX_GRUPOS && d.id !== g.director_id
                            return (
                              <option key={d.id} value={d.id} disabled={lleno}>
                                {nombreCompleto(d)} {n > 0 ? `(${n}/${MAX_GRUPOS})` : ''}{lleno ? ' · completo' : ''}
                              </option>
                            )
                          })}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Caja>

          <Caja titulo="Docentes y sus grupos">
            <ul className="lista-simple">
              {activos.map((d) => {
                const grupos = gruposDe(d.id)
                return (
                  <li key={d.id}>
                    <div>
                      <strong>{nombreCompleto(d)}</strong>
                      <small>{grupos.length ? `Director(a) de ${grupos.map((g) => g.nombre).join(' y ')}` : 'Sin dirección de grupo'}</small>
                    </div>
                    <span className={grupos.length >= MAX_GRUPOS ? 'chip pendiente' : grupos.length ? 'chip info' : 'chip'}>
                      {grupos.length}/{MAX_GRUPOS}
                    </span>
                  </li>
                )
              })}
            </ul>
          </Caja>
        </>
      )}
    </ConDatos>
  )
}
