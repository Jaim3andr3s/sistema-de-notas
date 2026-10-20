import { useState } from 'react'
import Layout from '../componentes/Layout.jsx'
import { Accesos, Caja, ConDatos, Nota, Etiqueta, Escala, Icono, Vacio, useApi } from '../componentes/ui.jsx'
import { ListaObservaciones } from '../compartido/Observador.jsx'
import TablaHorario from '../compartido/TablaHorario.jsx'
import Boletin from '../compartido/Boletin.jsx'
import Perfil from '../compartido/Perfil.jsx'
import Actividades from './Actividades.jsx'
import Clases from '../compartido/Clases.jsx'
import Mensajes from '../compartido/Mensajes.jsx'
import SemaforoPropio from '../compartido/Semaforo.jsx'
import Calendario from '../compartido/Calendario.jsx'
import Mejoramiento from './Mejoramiento.jsx'
import { VistaEstudiante, useVistaEstudiante } from './contexto.js'
import { api } from '../api.js'
import { promedio, fecha, fechaHora, vencida, TIPOS_ACTIVIDAD } from '../util.js'

const MENU = [
  { id: 'inicio', nombre: 'Inicio', icono: 'home' },
  { id: 'notas', nombre: 'Mis notas', icono: 'grading' },
  { id: 'semaforo', nombre: 'Semáforo', icono: 'traffic' },
  { id: 'actividades', nombre: 'Actividades y tareas', icono: 'assignment' },
  { id: 'mejoramiento', nombre: 'Mejoramiento', icono: 'trending_up' },
  { id: 'clases', nombre: 'Mis clases', icono: 'forum' },
  { id: 'mensajes', nombre: 'Mensajes', icono: 'chat' },
  { id: 'calendario', nombre: 'Calendario', icono: 'event' },
  { id: 'horario', nombre: 'Horario', icono: 'calendar_month' },
  { id: 'asistencia', nombre: 'Asistencia', icono: 'event_available' },
  { id: 'observador', nombre: 'Observador', icono: 'fact_check' },
  { id: 'boletines', nombre: 'Boletines', icono: 'description' },
  { id: 'perfil', nombre: 'Mi perfil', icono: 'person' },
]

// También las usa el panel del acudiente
export const VISTAS = { inicio: Inicio, notas: Notas, semaforo: SemaforoPropio, calendario: Calendario, mejoramiento: Mejoramiento, actividades: Actividades, clases: Clases, mensajes: Mensajes, horario: Horario, asistencia: Asistencia, observador: Observador, boletines: Boletines, perfil: MiPerfil }

export default function Estudiante({ usuario, onSalir }) {
  const [vista, setVista] = useState('inicio')
  const Vista = VISTAS[vista]
  return (
    <VistaEstudiante.Provider value={{ base: '/estudiante', soloLectura: false, menu: MENU }}>
      <Layout menu={MENU} vista={vista} onVista={setVista} usuario={usuario} onSalir={onSalir}>
        <Vista usuario={usuario} ir={setVista} />
      </Layout>
    </VistaEstudiante.Provider>
  )
}

function Inicio({ usuario, ir }) {
  const { base, menu, soloLectura } = useVistaEstudiante()
  const perfil = useApi(`${base}/perfil`)
  const notas = useApi(`${base}/notas`)
  const actividades = useApi(`${base}/actividades`)
  const anuncios = useApi(`${base}/anuncios`)

  const n = notas.datos
  // Último periodo que ya tiene alguna nota
  const iUltimo = n ? n.periodos.map((_, i) => i).filter((i) => n.asignaturas.some((a) => a.notas[i] != null)).pop() : null
  const promGeneral = n ? promedio(n.asignaturas.map((a) => a.acumulado)) : null
  const promUltimo = n && iUltimo != null ? promedio(n.asignaturas.map((a) => a.notas[iUltimo])) : null
  const enBajo = n && iUltimo != null ? n.asignaturas.filter((a) => a.notas[iUltimo] != null && a.notas[iUltimo] < 3).length : 0
  const fallas = n ? n.asignaturas.reduce((s, a) => s + a.fallas, 0) : 0
  const pendientes = actividades.datos?.filter((a) => a.entrega_en_linea && !a.entregado_en && !vencida(a.fecha_entrega)) ?? []

  const m = perfil.datos?.matricula
  return (
    <>
      <section className="bienvenida-card">
        <div>
          <p className="saludo">¡Hola, <span>{usuario.nombres.split(' ')[0]}</span>!</p>
          {soloLectura && perfil.datos && <p>Estás viendo a <strong>{perfil.datos.nombres} {perfil.datos.apellidos}</strong></p>}
          {m && (
            <>
              <p>Grado <strong>{m.grado}</strong> · Jornada {m.jornada} · Año lectivo {m.anio}</p>
              <p>Director de grupo: {m.director || '—'}</p>
            </>
          )}
        </div>
        <img src="/escudo.jpeg" alt="" />
      </section>

      <section className="tarjetas">
        <div className="tarjeta azul">
          <Icono nombre="school" />
          <span>Promedio acumulado</span>
          <strong>{promGeneral?.toFixed(1) ?? '—'}</strong>
        </div>
        <div className="tarjeta amarilla">
          <Icono nombre="trending_up" />
          <span>Promedio {iUltimo != null ? n.periodos[iUltimo].nombre : 'del periodo'}</span>
          <strong>{promUltimo?.toFixed(1) ?? '—'}</strong>
        </div>
        <div className="tarjeta roja">
          <Icono nombre="warning" />
          <span>Asignaturas en Bajo</span>
          <strong>{enBajo}</strong>
        </div>
        <div className="tarjeta blanca">
          <Icono nombre="assignment_late" />
          <span>Actividades pendientes</span>
          <strong>{pendientes.length}</strong>
        </div>
      </section>

      <Caja titulo="Accesos rápidos">
        <Accesos items={menu.filter((m) => !['inicio', 'perfil'].includes(m.id))} onIr={ir} />
      </Caja>

      <div className="columnas">
        <Caja titulo="Actividades por entregar" acciones={<button className="enlace" onClick={() => ir('actividades')}>Ver todas</button>}>
          {pendientes.length === 0 ? (
            <Vacio icono="task_alt">¡Estás al día! No tienes actividades pendientes.</Vacio>
          ) : (
            <ul className="lista-simple">
              {pendientes.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <div>
                    <strong>{a.titulo}</strong>
                    <small>{a.asignatura} · {TIPOS_ACTIVIDAD[a.tipo]}</small>
                  </div>
                  <span className="chip">{a.fecha_entrega ? fechaHora(a.fecha_entrega) : 'Sin fecha'}</span>
                </li>
              ))}
            </ul>
          )}
        </Caja>

        <Caja titulo="Anuncios">
          <ConDatos consulta={anuncios}>
            {(lista) => lista.length === 0 ? <Vacio icono="campaign">No hay anuncios.</Vacio> : (
              <ul className="anuncios">
                {lista.map((a) => (
                  <li key={a.id}>
                    <time>{fecha(a.fecha, { day: '2-digit', month: 'short' })}</time>
                    <div>
                      <strong>{a.titulo}</strong>
                      <p>{a.texto}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ConDatos>
        </Caja>
      </div>

      {fallas > 0 && <p className="texto-suave">{soloLectura ? 'Lleva' : 'Llevas'} {fallas} fallas en el año. <button className="enlace" onClick={() => ir('asistencia')}>Ver detalle</button></p>}
    </>
  )
}

function Notas() {
  const { base } = useVistaEstudiante()
  const consulta = useApi(`${base}/notas`)
  return (
    <ConDatos consulta={consulta}>
      {({ anio, grado, periodos, asignaturas }) => (
        <Caja titulo={`Calificaciones ${anio} · ${grado}`}>
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Asignatura</th>
                  <th>IH</th>
                  {periodos.map((p) => <th key={p.id}>P{p.numero}</th>)}
                  <th>Acumulado</th>
                  <th>Desempeño</th>
                  <th>Fallas</th>
                </tr>
              </thead>
              <tbody>
                {asignaturas.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.asignatura}</strong>
                      <small>{a.docente}</small>
                    </td>
                    <td>{a.ih}</td>
                    {a.notas.map((n, i) => <td key={i}><Nota valor={n} /></td>)}
                    <td><Nota valor={a.acumulado} /></td>
                    <td><Etiqueta valor={a.acumulado} /></td>
                    <td>{a.fallas}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Promedio</strong></td>
                  {periodos.map((p, i) => <td key={p.id}><Nota valor={promedio(asignaturas.map((a) => a.notas[i]))} /></td>)}
                  <td><Nota valor={promedio(asignaturas.map((a) => a.acumulado))} /></td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="texto-suave">El acumulado pondera cada periodo según su porcentaje ({periodos.map((p) => `${p.porcentaje}%`).join(' · ')}).</p>
          <Escala />
        </Caja>
      )}
    </ConDatos>
  )
}

function Horario() {
  const { base } = useVistaEstudiante()
  const consulta = useApi(`${base}/horario`)
  return (
    <ConDatos consulta={consulta}>
      {({ grado, bloques }) => (
        <Caja titulo={`Horario de clases · ${grado}`}>
          <TablaHorario bloques={bloques} />
        </Caja>
      )}
    </ConDatos>
  )
}

function Asistencia() {
  const { base } = useVistaEstudiante()
  const notas = useApi(`${base}/notas`)
  const detalle = useApi(`${base}/inasistencias`)
  return (
    <div className="columnas">
      <Caja titulo="Fallas por asignatura">
        <ConDatos consulta={notas}>
          {({ asignaturas }) => (
            <ul className="barras">
              {asignaturas.map((a) => (
                <li key={a.id}>
                  <span>{a.asignatura}</span>
                  <div className="barra-fondo">
                    <div className={a.fallas >= 4 ? 'barra-valor alerta' : 'barra-valor'} style={{ width: `${Math.min(a.fallas * 15, 100)}%` }} />
                  </div>
                  <strong>{a.fallas}</strong>
                </li>
              ))}
            </ul>
          )}
        </ConDatos>
      </Caja>
      <Caja titulo="Detalle">
        <ConDatos consulta={detalle}>
          {(lista) => lista.length === 0 ? <Vacio icono="event_available">No tienes inasistencias registradas.</Vacio> : (
            <ul className="lista-simple">
              {lista.map((i) => (
                <li key={i.id}>
                  <div>
                    <strong>{i.asignatura}</strong>
                    <small>{fecha(i.fecha)}{i.observacion ? ` · ${i.observacion}` : ''}</small>
                  </div>
                  <span className={`chip ${i.tipo}`}>{i.tipo === 'falla' ? 'Falla' : 'Retardo'}{i.justificada ? ' · Justificada' : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </ConDatos>
      </Caja>
    </div>
  )
}

function Observador() {
  const { base, soloLectura } = useVistaEstudiante()
  const consulta = useApi(`${base}/observador`)
  const [escribiendo, setEscribiendo] = useState(null)
  const [texto, setTexto] = useState('')
  const [error, setError] = useState('')

  async function enviar(id) {
    try {
      await api(`${base}/observador/${id}/descargos`, { method: 'POST', body: { descargos: texto } })
      setEscribiendo(null)
      setTexto('')
      consulta.recargar()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Caja titulo={soloLectura ? 'Observador' : 'Mi observador'}>
      <p className="texto-suave">
        {soloLectura
          ? 'Anotaciones académicas y de convivencia registradas por los docentes. Los descargos los escribe el estudiante desde su cuenta.'
          : 'Aquí ves las anotaciones que tus docentes registran. Puedes dejar tus descargos (tu versión) una sola vez por anotación.'}
      </p>
      <ConDatos consulta={consulta}>
        {(lista) => (
          <ListaObservaciones
            observaciones={lista}
            acciones={(o) =>
              !soloLectura && !o.descargos && o.tipo !== 'positiva' && (
                escribiendo === o.id ? (
                  <div className="descargos-form">
                    <textarea rows={3} placeholder="Escribe tu versión de los hechos…" value={texto} onChange={(e) => setTexto(e.target.value)} />
                    {error && <small className="texto-error">{error}</small>}
                    <div className="form-acciones">
                      <button className="btn-secundario" onClick={() => setEscribiendo(null)}>Cancelar</button>
                      <button className="btn-primario" onClick={() => enviar(o.id)} disabled={!texto.trim()}>Enviar descargos</button>
                    </div>
                  </div>
                ) : (
                  <button className="enlace" onClick={() => { setEscribiendo(o.id); setError('') }}>Escribir descargos</button>
                )
              )
            }
          />
        )}
      </ConDatos>
    </Caja>
  )
}

function Boletines() {
  const { base } = useVistaEstudiante()
  const notas = useApi(`${base}/notas`)
  const [periodo, setPeriodo] = useState(null)
  const boletin = useApi(periodo ? `${base}/boletin?periodo=${periodo}` : null)

  return (
    <>
      <Caja titulo="Boletines" className="no-imprimir">
        <ConDatos consulta={notas}>
          {({ periodos }) => (
            <ul className="boletines">
              {periodos.map((p) => (
                <li key={p.id}>
                  <Icono nombre="picture_as_pdf" />
                  <span>Boletín {p.nombre}{p.cerrado ? '' : ' (periodo en curso)'}</span>
                  <button className="btn-secundario" onClick={() => setPeriodo(p.id)}>Ver</button>
                </li>
              ))}
            </ul>
          )}
        </ConDatos>
      </Caja>
      {periodo && (
        <ConDatos consulta={boletin}>
          {(datos) => (
            <>
              <div className="no-imprimir acciones-derecha">
                <button className="btn-primario" onClick={() => window.print()}><Icono nombre="print" /> Imprimir / Guardar PDF</button>
              </div>
              <Boletin datos={datos} />
            </>
          )}
        </ConDatos>
      )}
    </>
  )
}

function MiPerfil({ usuario }) {
  const { base } = useVistaEstudiante()
  const perfil = useApi(`${base}/perfil`)
  const p = perfil.datos
  return (
    <Perfil
      usuario={usuario}
      extra={p && (
        <>
          <dt>Grado</dt><dd>{p.matricula.grado} · {p.matricula.jornada}</dd>
          <dt>Director de grupo</dt><dd>{p.matricula.director || '—'}</dd>
          <dt>Acudiente</dt><dd>{p.acudiente_nombre || '—'}</dd>
          <dt>Tel. acudiente</dt><dd>{p.acudiente_telefono || '—'}</dd>
        </>
      )}
    />
  )
}
