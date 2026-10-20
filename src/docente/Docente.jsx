import { useEffect, useState } from 'react'
import Layout from '../componentes/Layout.jsx'
import { Accesos, Caja, ConDatos, Nota, Etiqueta, Escala, Icono, Aviso, Vacio, useApi } from '../componentes/ui.jsx'
import { Consolidado, Boletines } from '../compartido/Reportes.jsx'
import Observador from '../compartido/Observador.jsx'
import Perfil from '../compartido/Perfil.jsx'
import ActividadesDocente from './Actividades.jsx'
import Clases from '../compartido/Clases.jsx'
import Mensajes from '../compartido/Mensajes.jsx'
import { SemaforoDocente } from '../compartido/Semaforo.jsx'
import Calendario from '../compartido/Calendario.jsx'
import MejoramientoDocente from './Mejoramiento.jsx'
import { api } from '../api.js'
import { hoy, promedio } from '../util.js'

const MENU = [
  { id: 'inicio', nombre: 'Inicio', icono: 'home' },
  { id: 'notas', nombre: 'Planilla de notas', icono: 'grading' },
  { id: 'actividades', nombre: 'Actividades', icono: 'assignment' },
  { id: 'mejoramiento', nombre: 'Mejoramiento', icono: 'trending_up' },
  { id: 'clases', nombre: 'Mis clases', icono: 'forum' },
  { id: 'mensajes', nombre: 'Mensajes', icono: 'chat' },
  { id: 'semaforo', nombre: 'Semáforo', icono: 'traffic' },
  { id: 'calendario', nombre: 'Calendario', icono: 'event' },
  { id: 'asistencia', nombre: 'Asistencia', icono: 'how_to_reg' },
  { id: 'observador', nombre: 'Observador', icono: 'fact_check' },
  { id: 'consolidados', nombre: 'Consolidados', icono: 'table_chart' },
  { id: 'boletines', nombre: 'Boletines', icono: 'description' },
  { id: 'perfil', nombre: 'Mi perfil', icono: 'person' },
]

export default function Docente({ usuario, onSalir }) {
  const [vista, setVista] = useState('inicio')
  // La carga y el periodo elegidos se conservan al cambiar de sección
  const seleccion = useSeleccion()

  let contenido
  if (vista === 'inicio') contenido = <Inicio usuario={usuario} seleccion={seleccion} ir={setVista} />
  if (vista === 'notas') contenido = <Planilla seleccion={seleccion} />
  if (vista === 'actividades') contenido = <ActividadesDocente seleccion={seleccion} Selector={SelectorCargaPeriodo} />
  if (vista === 'clases') contenido = <Clases usuario={usuario} />
  if (vista === 'mensajes') contenido = <Mensajes usuario={usuario} />
  if (vista === 'semaforo') contenido = <SemaforoDocente />
  if (vista === 'mejoramiento') contenido = <MejoramientoDocente seleccion={seleccion} Selector={SelectorCargaPeriodo} />
  if (vista === 'calendario') contenido = <Calendario />
  if (vista === 'asistencia') contenido = <Asistencia seleccion={seleccion} />
  if (vista === 'observador') contenido = <Observador usuario={usuario} />
  if (vista === 'consolidados') contenido = <Consolidado />
  if (vista === 'boletines') contenido = <Boletines />
  if (vista === 'perfil') contenido = <Perfil usuario={usuario} />

  return (
    <Layout menu={MENU} vista={vista} onVista={setVista} usuario={usuario} onSalir={onSalir}>
      {contenido}
    </Layout>
  )
}

function useSeleccion() {
  const cargas = useApi('/docente/cargas')
  const periodos = useApi('/docente/periodos')
  const [cargaId, setCargaId] = useState(null)
  const [periodoId, setPeriodoId] = useState(null)

  const carga = cargas.datos?.cargas.find((c) => c.id === cargaId) ?? null
  const delAnio = periodos.datos?.filter((p) => p.anio === carga?.anio) ?? []

  useEffect(() => {
    if (!cargaId && cargas.datos?.cargas.length) setCargaId(cargas.datos.cargas[0].id)
  }, [cargas.datos, cargaId])

  // Por defecto, el primer periodo abierto del año de la carga
  useEffect(() => {
    if (!carga || !periodos.datos) return
    if (!delAnio.some((p) => p.id === periodoId)) {
      setPeriodoId((delAnio.find((p) => !p.cerrado) ?? delAnio[delAnio.length - 1])?.id ?? null)
    }
  }, [carga, periodos.datos, periodoId, delAnio])

  return {
    cargas,
    carga,
    cargaId,
    setCargaId,
    periodos: delAnio,
    periodo: delAnio.find((p) => p.id === periodoId) ?? null,
    periodoId,
    setPeriodoId,
  }
}

function SelectorCargaPeriodo({ seleccion: s, sinPeriodo }) {
  return (
    <>
      <select value={s.cargaId ?? ''} onChange={(e) => s.setCargaId(Number(e.target.value))}>
        {s.cargas.datos?.cargas.map((c) => (
          <option key={c.id} value={c.id}>{c.asignatura} · {c.grado}</option>
        ))}
      </select>
      {!sinPeriodo && (
        <select value={s.periodoId ?? ''} onChange={(e) => s.setPeriodoId(Number(e.target.value))}>
          {s.periodos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}{p.cerrado ? ' (cerrado)' : ''}</option>
          ))}
        </select>
      )}
    </>
  )
}

function Inicio({ usuario, seleccion, ir }) {
  const { cargas } = seleccion
  return (
    <>
      <section className="bienvenida-card">
        <div>
          <p className="saludo">¡Hola, <span>{usuario.nombres.split(' ')[0]}</span>!</p>
          <p>Bienvenido(a) al Sistema de Notas de la IEMM.</p>
          {cargas.datos?.direccion.length > 0 && (
            <p>Director(a) de grupo: <strong>{cargas.datos.direccion.map((g) => g.nombre).join(', ')}</strong></p>
          )}
        </div>
        <img src="/escudo.jpeg" alt="" />
      </section>

      <Caja titulo="Accesos rápidos">
        <Accesos items={MENU.filter((m) => !['inicio', 'perfil'].includes(m.id))} onIr={ir} />
      </Caja>

      <Caja titulo="Mis asignaturas">
        <ConDatos consulta={cargas}>
          {({ cargas: lista }) => lista.length === 0 ? <Vacio icono="menu_book">No tienes asignaturas asignadas.</Vacio> : (
            <ul className="tarjetas-carga">
              {lista.map((c) => (
                <li key={c.id}>
                  <div className="carga-cabecera">
                    <strong>{c.asignatura}</strong>
                    <span className="chip">{c.grado}</span>
                  </div>
                  <small>{c.estudiantes} estudiantes · {c.ih} h semanales · {c.actividades} actividades</small>
                  <div className="carga-acciones">
                    <button className="btn-secundario" onClick={() => { seleccion.setCargaId(c.id); ir('notas') }}><Icono nombre="grading" /> Notas</button>
                    <button className="btn-secundario" onClick={() => { seleccion.setCargaId(c.id); ir('actividades') }}><Icono nombre="assignment" /> Actividades</button>
                    <button className="btn-secundario" onClick={() => { seleccion.setCargaId(c.id); ir('asistencia') }}><Icono nombre="how_to_reg" /> Asistencia</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ConDatos>
      </Caja>
    </>
  )
}

function Planilla({ seleccion: s }) {
  const ruta = s.cargaId && s.periodoId ? `/docente/cargas/${s.cargaId}/notas?periodo=${s.periodoId}` : null
  const consulta = useApi(ruta)
  const [filas, setFilas] = useState([])
  const [msg, setMsg] = useState({ tipo: '', texto: '' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    setFilas(consulta.datos?.estudiantes.map((e) => ({ ...e, nota: e.nota ?? '', observacion: e.observacion ?? '' })) ?? [])
    setMsg({ tipo: '', texto: '' })
  }, [consulta.datos])

  const cerrado = consulta.datos?.periodo.cerrado
  const cambiar = (i, campo, valor) => setFilas(filas.map((f, k) => (k === i ? { ...f, [campo]: valor } : f)))
  const invalida = (n) => n !== '' && (isNaN(n) || n < 1 || n > 5 || Math.round(n * 10) !== n * 10)

  function usarSugeridas() {
    setFilas(filas.map((f) => (f.sugerida != null ? { ...f, nota: f.sugerida } : f)))
  }

  async function guardar() {
    if (filas.some((f) => invalida(Number(f.nota)) && f.nota !== '')) {
      return setMsg({ tipo: 'error', texto: 'Hay notas inválidas. Usa valores entre 1.0 y 5.0 con un decimal.' })
    }
    setGuardando(true)
    try {
      await api(`/docente/cargas/${s.cargaId}/notas`, {
        method: 'PUT',
        body: {
          periodo_id: s.periodoId,
          notas: filas.map((f) => ({ matricula_id: f.matricula_id, nota: f.nota === '' ? null : Number(f.nota), observacion: f.observacion })),
        },
      })
      setMsg({ tipo: 'exito', texto: 'Notas guardadas correctamente' })
      consulta.recargar()
    } catch (err) {
      setMsg({ tipo: 'error', texto: err.message })
    }
    setGuardando(false)
  }

  const valores = filas.map((f) => (f.nota === '' ? null : Number(f.nota)))
  return (
    <Caja titulo="Planilla de notas" acciones={<SelectorCargaPeriodo seleccion={s} />}>
      <ConDatos consulta={consulta}>
        {({ carga, periodo }) => (
          <>
            <div className="planilla-info">
              <span><strong>{carga.asignatura}</strong> · {carga.grado} · {periodo.nombre}</span>
              <span>Promedio: <Nota valor={promedio(valores)} /></span>
              <span>En Bajo: <strong>{valores.filter((v) => v != null && v < 3).length}</strong></span>
              <span>Sin nota: <strong>{valores.filter((v) => v == null).length}</strong></span>
            </div>
            {cerrado && <Aviso tipo="info">Este periodo está cerrado. Para modificar notas solicita la reapertura a coordinación.</Aviso>}
            {filas.length === 0 ? <Vacio icono="groups">No hay estudiantes en este grado.</Vacio> : (
              <div className="tabla-scroll">
                <table className="tabla planilla">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Estudiante</th>
                      <th title="Promedio ponderado de las actividades calificadas">Actividades</th>
                      <th>Nota periodo</th>
                      <th>Desempeño</th>
                      <th>Fallas</th>
                      <th>Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, i) => (
                      <tr key={f.matricula_id}>
                        <td>{i + 1}</td>
                        <td><strong>{f.apellidos} {f.nombres}</strong><small>{f.documento}</small></td>
                        <td><Nota valor={f.sugerida} /></td>
                        <td>
                          <input
                            className={invalida(Number(f.nota)) && f.nota !== '' ? 'input-nota invalida' : 'input-nota'}
                            type="number" step="0.1" min="1" max="5" value={f.nota} disabled={cerrado}
                            onChange={(e) => cambiar(i, 'nota', e.target.value)}
                          />
                        </td>
                        <td><Etiqueta valor={f.nota === '' ? null : Number(f.nota)} /></td>
                        <td>{f.fallas}</td>
                        <td>
                          <input className="input-obs" value={f.observacion} disabled={cerrado} placeholder="Opcional"
                            onChange={(e) => cambiar(i, 'observacion', e.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>
            {!cerrado && filas.length > 0 && (
              <div className="form-acciones">
                <button className="btn-secundario" onClick={usarSugeridas}><Icono nombre="calculate" /> Usar promedio de actividades</button>
                <button className="btn-primario" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar notas'}</button>
              </div>
            )}
            <Escala />
          </>
        )}
      </ConDatos>
    </Caja>
  )
}

const ESTADOS = [
  { id: 'presente', letra: 'P', titulo: 'Presente' },
  { id: 'falla', letra: 'F', titulo: 'Falla' },
  { id: 'retardo', letra: 'R', titulo: 'Retardo' },
]

function Asistencia({ seleccion: s }) {
  const [dia, setDia] = useState(hoy())
  const consulta = useApi(s.cargaId ? `/docente/cargas/${s.cargaId}/asistencia?fecha=${dia}` : null)
  const [filas, setFilas] = useState([])
  const [msg, setMsg] = useState({ tipo: '', texto: '' })

  useEffect(() => {
    setFilas(consulta.datos?.estudiantes.map((e) => ({ ...e, justificada: Boolean(e.justificada) })) ?? [])
    setMsg({ tipo: '', texto: '' })
  }, [consulta.datos])

  const cambiar = (i, campos) => setFilas(filas.map((f, k) => (k === i ? { ...f, ...campos } : f)))

  async function guardar() {
    try {
      await api(`/docente/cargas/${s.cargaId}/asistencia`, {
        method: 'PUT',
        body: { fecha: dia, registros: filas.map((f) => ({ matricula_id: f.matricula_id, estado: f.estado, justificada: f.justificada })) },
      })
      setMsg({ tipo: 'exito', texto: 'Asistencia guardada' })
      consulta.recargar()
    } catch (err) {
      setMsg({ tipo: 'error', texto: err.message })
    }
  }

  const conteo = (estado) => filas.filter((f) => f.estado === estado).length
  return (
    <Caja
      titulo="Tomar asistencia"
      acciones={
        <>
          <SelectorCargaPeriodo seleccion={s} sinPeriodo />
          <input type="date" value={dia} max={hoy()} onChange={(e) => setDia(e.target.value)} />
        </>
      }
    >
      <ConDatos consulta={consulta}>
        {() => filas.length === 0 ? <Vacio icono="groups">No hay estudiantes en este grado.</Vacio> : (
          <>
            <div className="planilla-info">
              <span>Presentes: <strong>{conteo('presente')}</strong></span>
              <span>Fallas: <strong>{conteo('falla')}</strong></span>
              <span>Retardos: <strong>{conteo('retardo')}</strong></span>
              <button className="enlace" onClick={() => setFilas(filas.map((f) => ({ ...f, estado: 'presente', justificada: false })))}>Marcar todos presentes</button>
            </div>
            <ul className="lista-asistencia">
              {filas.map((f, i) => (
                <li key={f.matricula_id} className={f.estado}>
                  <div>
                    <strong>{f.nombre}</strong>
                    <small>{f.total_fallas} fallas en el año</small>
                  </div>
                  <div className="botones-asistencia">
                    {ESTADOS.map((e) => (
                      <button key={e.id} title={e.titulo} className={f.estado === e.id ? `activo ${e.id}` : ''}
                        onClick={() => cambiar(i, { estado: e.id, justificada: e.id === 'presente' ? false : f.justificada })}>
                        {e.letra}
                      </button>
                    ))}
                  </div>
                  {f.estado !== 'presente' && (
                    <label className="check">
                      <input type="checkbox" checked={f.justificada} onChange={(e) => cambiar(i, { justificada: e.target.checked })} />
                      Con excusa
                    </label>
                  )}
                </li>
              ))}
            </ul>
            <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>
            <div className="form-acciones">
              <button className="btn-primario" onClick={guardar}>Guardar asistencia</button>
            </div>
          </>
        )}
      </ConDatos>
    </Caja>
  )
}
