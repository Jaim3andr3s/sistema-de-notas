import { useState } from 'react'
import { PERIODOS, ESTUDIANTE, NOTAS, HORARIO, ANUNCIOS, desempeno, promedio } from './datos.js'
import './panel.css'

const MENU = [
  { id: 'inicio', nombre: 'Inicio', icono: 'home' },
  { id: 'notas', nombre: 'Mis notas', icono: 'grading' },
  { id: 'horario', nombre: 'Horario', icono: 'calendar_month' },
  { id: 'asistencia', nombre: 'Asistencia', icono: 'event_available' },
  { id: 'boletines', nombre: 'Boletines', icono: 'description' },
  { id: 'perfil', nombre: 'Mi perfil', icono: 'person' },
]

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

function Icono({ nombre }) {
  return <span className="material-icons" aria-hidden="true">{nombre}</span>
}

function Nota({ valor }) {
  if (valor == null) return <span className="nota vacia">—</span>
  const d = desempeno(valor)
  return <span className={`nota ${d.clase}`}>{valor.toFixed(1)}</span>
}

function Etiqueta({ valor }) {
  const d = desempeno(valor)
  if (!d) return <span className="etiqueta vacia">Pendiente</span>
  return <span className={`etiqueta ${d.clase}`}>{d.nombre}</span>
}

export default function Panel({ usuario, onSalir }) {
  const [vista, setVista] = useState('inicio')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [periodo, setPeriodo] = useState(2)

  const notasPeriodo = NOTAS.map((m) => m.notas[periodo])
  const promPeriodo = promedio(notasPeriodo)
  const promGeneral = promedio(NOTAS.map((m) => promedio(m.notas)))
  const enRiesgo = NOTAS.filter((m) => (m.notas[periodo] ?? 5) < 3)
  const totalFallas = NOTAS.reduce((a, m) => a + m.fallas, 0)

  function ir(id) {
    setVista(id)
    setMenuAbierto(false)
  }

  return (
    <div className="panel">
      <aside className={menuAbierto ? 'lateral abierto' : 'lateral'}>
        <div className="lateral-marca">
          <img src="/escudo.jpeg" alt="Escudo IEMM" />
          <div>
            <strong>IEMM</strong>
            <span>Sistema de Notas</span>
          </div>
        </div>
        <nav>
          {MENU.map((item) => (
            <button
              key={item.id}
              className={vista === item.id ? 'menu-item activo' : 'menu-item'}
              onClick={() => ir(item.id)}
            >
              <Icono nombre={item.icono} />
              {item.nombre}
            </button>
          ))}
        </nav>
        <button className="menu-item salir" onClick={onSalir}>
          <Icono nombre="logout" />
          Cerrar sesión
        </button>
      </aside>
      {menuAbierto && <div className="velo" onClick={() => setMenuAbierto(false)} />}

      <div className="contenido">
        <header className="barra">
          <button className="btn-menu" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú">
            <Icono nombre="menu" />
          </button>
          <h1>{MENU.find((m) => m.id === vista).nombre}</h1>
          <div className="barra-usuario">
            <div className="barra-datos">
              <strong>{ESTUDIANTE.nombre}</strong>
              <span>{usuario.rol} · Doc. {usuario.documento}</span>
            </div>
            <div className="avatar">{ESTUDIANTE.nombre[0]}</div>
          </div>
        </header>

        <main className="cuerpo">
          {vista === 'inicio' && (
            <>
              <section className="bienvenida-card">
                <div>
                  <p className="saludo">¡Hola, {ESTUDIANTE.nombre.split(' ')[0]}!</p>
                  <p>
                    Grado <strong>{ESTUDIANTE.grado}</strong> · Jornada {ESTUDIANTE.jornada} · Año lectivo {ESTUDIANTE.anio}
                  </p>
                  <p>Director de grupo: {ESTUDIANTE.director}</p>
                </div>
                <img src="/escudo.jpeg" alt="" />
              </section>

              <section className="tarjetas">
                <div className="tarjeta azul">
                  <Icono nombre="school" />
                  <span>Promedio general</span>
                  <strong>{promGeneral?.toFixed(1)}</strong>
                </div>
                <div className="tarjeta amarilla">
                  <Icono nombre="trending_up" />
                  <span>Promedio {PERIODOS[periodo]}</span>
                  <strong>{promPeriodo?.toFixed(1) ?? '—'}</strong>
                </div>
                <div className="tarjeta roja">
                  <Icono nombre="warning" />
                  <span>Asignaturas en Bajo</span>
                  <strong>{enRiesgo.length}</strong>
                </div>
                <div className="tarjeta blanca">
                  <Icono nombre="event_busy" />
                  <span>Fallas acumuladas</span>
                  <strong>{totalFallas}</strong>
                </div>
              </section>

              <div className="columnas">
                <section className="caja">
                  <div className="caja-titulo">
                    <h2>Notas · {PERIODOS[periodo]}</h2>
                    <button className="enlace" onClick={() => ir('notas')}>Ver todas</button>
                  </div>
                  <ul className="lista-notas">
                    {NOTAS.map((m) => (
                      <li key={m.asignatura}>
                        <span>{m.asignatura}</span>
                        <Nota valor={m.notas[periodo]} />
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="caja">
                  <div className="caja-titulo">
                    <h2>Anuncios</h2>
                  </div>
                  <ul className="anuncios">
                    {ANUNCIOS.map((a) => (
                      <li key={a.titulo}>
                        <time>
                          {new Date(a.fecha + 'T00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                        </time>
                        <div>
                          <strong>{a.titulo}</strong>
                          <p>{a.texto}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </>
          )}

          {vista === 'notas' && (
            <section className="caja">
              <div className="caja-titulo">
                <h2>Calificaciones {ESTUDIANTE.anio}</h2>
                <select value={periodo} onChange={(e) => setPeriodo(Number(e.target.value))}>
                  {PERIODOS.map((p, i) => (
                    <option key={p} value={i}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="tabla-scroll">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Asignatura</th>
                      <th>IH</th>
                      {PERIODOS.map((p, i) => (
                        <th key={p} className={i === periodo ? 'col-activa' : ''}>P{i + 1}</th>
                      ))}
                      <th>Acumulado</th>
                      <th>Desempeño</th>
                      <th>Fallas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {NOTAS.map((m) => {
                      const acum = promedio(m.notas)
                      return (
                        <tr key={m.asignatura}>
                          <td>
                            <strong>{m.asignatura}</strong>
                            <small>{m.docente}</small>
                          </td>
                          <td>{m.ih}</td>
                          {m.notas.map((n, i) => (
                            <td key={i} className={i === periodo ? 'col-activa' : ''}><Nota valor={n} /></td>
                          ))}
                          <td><Nota valor={acum} /></td>
                          <td><Etiqueta valor={acum} /></td>
                          <td>{m.fallas}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="escala">
                <span className="etiqueta superior">Superior 4.6 – 5.0</span>
                <span className="etiqueta alto">Alto 4.0 – 4.5</span>
                <span className="etiqueta basico">Básico 3.0 – 3.9</span>
                <span className="etiqueta bajo">Bajo 1.0 – 2.9</span>
              </div>
            </section>
          )}

          {vista === 'horario' && (
            <section className="caja">
              <div className="caja-titulo">
                <h2>Horario de clases · {ESTUDIANTE.grado}</h2>
              </div>
              <div className="tabla-scroll">
                <table className="tabla horario">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      {DIAS.map((d) => <th key={d}>{d}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {HORARIO.map((fila) => (
                      <tr key={fila.hora} className={fila.dias[0] === 'Descanso' ? 'descanso' : ''}>
                        <td><strong>{fila.hora}</strong></td>
                        {fila.dias.map((c, i) => <td key={i}>{c}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {vista === 'asistencia' && (
            <section className="caja">
              <div className="caja-titulo">
                <h2>Inasistencias por asignatura</h2>
              </div>
              <ul className="barras">
                {NOTAS.map((m) => (
                  <li key={m.asignatura}>
                    <span>{m.asignatura}</span>
                    <div className="barra-fondo">
                      <div
                        className={m.fallas >= 4 ? 'barra-valor alerta' : 'barra-valor'}
                        style={{ width: `${Math.min(m.fallas * 20, 100)}%` }}
                      />
                    </div>
                    <strong>{m.fallas}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {vista === 'boletines' && (
            <section className="caja">
              <div className="caja-titulo">
                <h2>Boletines</h2>
              </div>
              <ul className="boletines">
                {PERIODOS.map((p, i) => {
                  const listo = NOTAS.every((m) => m.notas[i] != null)
                  return (
                    <li key={p}>
                      <Icono nombre="picture_as_pdf" />
                      <span>Boletín {p} · {ESTUDIANTE.anio}</span>
                      <button className="btn-secundario" disabled={!listo}>
                        {listo ? 'Descargar' : 'No disponible'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {vista === 'perfil' && (
            <section className="caja">
              <div className="caja-titulo">
                <h2>Datos del estudiante</h2>
              </div>
              <dl className="perfil">
                <dt>Nombre</dt><dd>{ESTUDIANTE.nombre}</dd>
                <dt>Documento</dt><dd>{usuario.documento}</dd>
                <dt>Grado</dt><dd>{ESTUDIANTE.grado}</dd>
                <dt>Jornada</dt><dd>{ESTUDIANTE.jornada}</dd>
                <dt>Director de grupo</dt><dd>{ESTUDIANTE.director}</dd>
                <dt>Año lectivo</dt><dd>{ESTUDIANTE.anio}</dd>
              </dl>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
