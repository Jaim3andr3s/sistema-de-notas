import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Icono, useApi } from '../componentes/ui.jsx'
import { fecha } from '../util.js'
import { COLEGIO, PILARES, MISION, VISION, NIVELES, SEDES, CATEGORIAS } from './contenido.js'
import './sitio.css'

const ENLACES = [
  ['inicio', 'Inicio'],
  ['nosotros', 'Nosotros'],
  ['niveles', 'Oferta educativa'],
  ['noticias', 'Noticias'],
  ['plataforma', 'Plataforma'],
  ['contacto', 'Contacto'],
]

const imagen = (n) => `/api/publico/imagenes/${n}`

export default function Sitio({ ruta }) {
  const noticiaId = ruta.match(/^\/noticias\/(\d+)/)?.[1]
  return (
    <div className="sitio">
      <Encabezado />
      {noticiaId ? <DetalleNoticia id={noticiaId} /> : <Portada />}
      <Pie />
    </div>
  )
}

function Encabezado() {
  const [abierto, setAbierto] = useState(false)
  return (
    <header className="s-encabezado">
      <div className="s-franja-superior">
        <div className="s-contenedor">
          <span><Icono nombre="place" /> {COLEGIO.ciudad}</span>
          <span className="s-lema-sup">{COLEGIO.lema}</span>
        </div>
      </div>
      <div className="s-contenedor s-nav">
        <a href="/" className="s-marca">
          <img src="/escudo.jpeg" alt="" />
          <span>
            <strong>Máximo Mercado</strong>
            <small>Institución Educativa</small>
          </span>
        </a>
        <button className="s-btn-menu" onClick={() => setAbierto(!abierto)} aria-label="Menú" aria-expanded={abierto}>
          <Icono nombre={abierto ? 'close' : 'menu'} />
        </button>
        <nav className={abierto ? 'abierto' : ''}>
          {ENLACES.map(([id, nombre]) => (
            <a key={id} href={`/#${id}`} onClick={() => setAbierto(false)}>{nombre}</a>
          ))}
          <a href="/plataforma" className="s-btn-plataforma"><Icono nombre="login" /> Ingresar</a>
        </nav>
      </div>
    </header>
  )
}

function Portada() {
  const cifras = useApi('/publico/cifras')
  const c = cifras.datos

  // Al llegar con /#seccion, desplazarse cuando el contenido ya cargó
  useEffect(() => {
    if (window.location.hash) setTimeout(() => document.querySelector(window.location.hash)?.scrollIntoView(), 300)
  }, [])

  return (
    <main>
      <section id="inicio" className="s-heroe">
        <div className="s-heroe-franjas" aria-hidden="true"><span /><span /><span /></div>
        <div className="s-contenedor s-heroe-grid">
          <div>
            <p className="s-etiqueta">{COLEGIO.ciudad}</p>
            <h1>Institución Educativa <span>Máximo Mercado</span></h1>
            <p className="s-heroe-eslogan">{COLEGIO.eslogan}</p>
            <blockquote>“{COLEGIO.frase}”</blockquote>
            <div className="s-heroe-acciones">
              <a href="/plataforma" className="s-btn s-btn-amarillo"><Icono nombre="grading" /> Consultar notas</a>
              <a href="/#nosotros" className="s-btn s-btn-borde">Conócenos</a>
            </div>
          </div>
          <div className="s-heroe-escudo">
            <img src="/escudo.jpeg" alt="Escudo de la Institución Educativa Máximo Mercado" />
          </div>
        </div>
      </section>

      <section className="s-contenedor s-cifras">
        <div><Icono nombre="groups" /><strong>{c?.estudiantes ?? '—'}</strong><span>Estudiantes</span></div>
        <div><Icono nombre="co_present" /><strong>{c?.docentes ?? '—'}</strong><span>Docentes</span></div>
        <div><Icono nombre="apartment" /><strong>{SEDES.length}</strong><span>Sedes</span></div>
        <div className="destacado"><Icono nombre="emoji_events" /><strong>295</strong><span>Mejor puntaje Saber 11 · 2026</span></div>
      </section>

      <section id="nosotros" className="s-seccion">
        <div className="s-contenedor">
          <Titulo etiqueta="Nosotros" titulo="Comunidad Maximista" texto="Nuestro escudo resume lo que somos: el libro del estudio, la antorcha de la libertad y la paloma de la paz." />
          <div className="s-pilares">
            {PILARES.map((p) => (
              <article key={p.titulo}>
                <span className="s-icono-circulo"><Icono nombre={p.icono} /></span>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </article>
            ))}
          </div>
          <div className="s-mision">
            <article>
              <h3><Icono nombre="flag" /> Misión</h3>
              <p>{MISION}</p>
            </article>
            <article>
              <h3><Icono nombre="visibility" /> Visión</h3>
              <p>{VISION}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="niveles" className="s-seccion s-fondo-azul">
        <div className="s-contenedor">
          <Titulo etiqueta="Oferta educativa" titulo="Del preescolar a la media académica" claro />
          <div className="s-niveles">
            {NIVELES.map((n) => (
              <article key={n.titulo}>
                <Icono nombre={n.icono} />
                <h3>{n.titulo}</h3>
                <p>{n.texto}</p>
              </article>
            ))}
          </div>
          <h3 className="s-subtitulo-claro">Nuestras sedes</h3>
          <div className="s-sedes">
            {SEDES.map((s) => (
              <article key={s.nombre}>
                <Icono nombre="location_city" />
                <div>
                  <strong>{s.nombre}</strong>
                  <p>{s.texto}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Noticias />
      <Eventos />
      <Plataforma />
      <Contacto />
    </main>
  )
}

function Titulo({ etiqueta, titulo, texto, claro }) {
  return (
    <div className={claro ? 's-titulo claro' : 's-titulo'}>
      <span className="s-etiqueta">{etiqueta}</span>
      <h2>{titulo}</h2>
      {texto && <p>{texto}</p>}
    </div>
  )
}

function Portadilla({ noticia, grande }) {
  const cat = CATEGORIAS[noticia.categoria]
  if (noticia.imagen) return <img className="s-noticia-img" src={imagen(noticia.imagen)} alt="" loading="lazy" />
  return (
    <div className={`s-noticia-img s-cat-${noticia.categoria}`}>
      <Icono nombre={cat.icono} />
      {grande && <img src="/escudo.jpeg" alt="" className="s-marca-agua" />}
    </div>
  )
}

function Noticias() {
  const consulta = useApi('/publico/noticias?limite=7')
  const lista = consulta.datos ?? []
  const [principal, ...resto] = lista

  return (
    <section id="noticias" className="s-seccion">
      <div className="s-contenedor">
        <Titulo etiqueta="Noticias" titulo="Lo que pasa en el Máximo" />
        {consulta.error && <p className="s-vacio">No pudimos cargar las noticias en este momento.</p>}
        {!consulta.error && !consulta.cargando && lista.length === 0 && <p className="s-vacio">Pronto publicaremos novedades.</p>}
        {principal && (
          <div className="s-noticias">
            <a href={`/noticias/${principal.id}`} className="s-noticia principal">
              <Portadilla noticia={principal} grande />
              <div>
                <span className="s-chip">{CATEGORIAS[principal.categoria].nombre}</span>
                <h3>{principal.titulo}</h3>
                <p>{principal.resumen}</p>
                <time>{fecha(principal.fecha)}</time>
              </div>
            </a>
            {resto.map((n) => (
              <a key={n.id} href={`/noticias/${n.id}`} className="s-noticia">
                <Portadilla noticia={n} />
                <div>
                  <span className="s-chip">{CATEGORIAS[n.categoria].nombre}</span>
                  <h3>{n.titulo}</h3>
                  <time>{fecha(n.fecha)}</time>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function Eventos() {
  const consulta = useApi('/publico/eventos')
  if (!consulta.datos?.length) return null
  return (
    <section className="s-seccion s-fondo-suave">
      <div className="s-contenedor">
        <Titulo etiqueta="Agenda" titulo="Próximos eventos" />
        <div className="s-eventos">
          {consulta.datos.map((e) => {
            const d = new Date(e.fecha + 'T00:00')
            return (
              <article key={e.id}>
                <div className="s-fecha">
                  <strong>{d.getDate()}</strong>
                  <span>{d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}</span>
                </div>
                <div>
                  <h3>{e.titulo}</h3>
                  <p>{e.texto}</p>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const FUNCIONES = [
  { icono: 'grading', titulo: 'Notas en línea', texto: 'Consulta las calificaciones de cada periodo y el acumulado del año.' },
  { icono: 'assignment', titulo: 'Tareas y actividades', texto: 'Recibe tareas, entrégalas desde casa y presenta cuestionarios en línea.' },
  { icono: 'event_available', titulo: 'Asistencia', texto: 'Revisa fallas y retardos por asignatura.' },
  { icono: 'description', titulo: 'Boletines', texto: 'Descarga e imprime el boletín de cada periodo.' },
  { icono: 'fact_check', titulo: 'Observador', texto: 'Seguimiento académico y de convivencia del estudiante.' },
  { icono: 'campaign', titulo: 'Anuncios', texto: 'Entérate de reuniones, cierres de periodo y eventos.' },
]

function Plataforma() {
  return (
    <section id="plataforma" className="s-seccion">
      <div className="s-contenedor s-plataforma">
        <div>
          <Titulo etiqueta="Plataforma académica" titulo="Sistema de Notas IEMM" texto="Estudiantes, familias y docentes conectados en un solo lugar. Ingresa con tu número de documento." />
          <div className="s-roles">
            <a href="/plataforma" className="s-btn s-btn-azul"><Icono nombre="login" /> Ingresar a la plataforma</a>
            <span><Icono nombre="info" /> ¿Olvidaste tu contraseña? Comunícate con coordinación académica.</span>
          </div>
        </div>
        <div className="s-funciones">
          {FUNCIONES.map((f) => (
            <article key={f.titulo}>
              <Icono nombre={f.icono} />
              <div>
                <strong>{f.titulo}</strong>
                <p>{f.texto}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

const VACIO = { nombre: '', correo: '', telefono: '', asunto: '', mensaje: '' }

function Contacto() {
  const [f, setF] = useState(VACIO)
  const [estado, setEstado] = useState({ tipo: '', texto: '' })
  const [enviando, setEnviando] = useState(false)
  const cambiar = (c) => (e) => setF({ ...f, [c]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    try {
      await api('/publico/contacto', { method: 'POST', body: f })
      setF(VACIO)
      setEstado({ tipo: 'exito', texto: '¡Gracias! Recibimos tu mensaje y te responderemos pronto.' })
    } catch (err) {
      setEstado({ tipo: 'error', texto: err.message })
    }
    setEnviando(false)
  }

  return (
    <section id="contacto" className="s-seccion s-fondo-azul">
      <div className="s-contenedor s-contacto">
        <div>
          <Titulo etiqueta="Contacto" titulo="Escríbenos" texto="Matrículas, certificados, información general o cualquier inquietud: con gusto te atendemos." claro />
          <ul className="s-datos-contacto">
            <li><Icono nombre="place" /> {COLEGIO.direccion}</li>
            {COLEGIO.telefono && <li><Icono nombre="call" /> {COLEGIO.telefono}</li>}
            {COLEGIO.correo && <li><Icono nombre="mail" /> {COLEGIO.correo}</li>}
            <li><Icono nombre="thumb_up" /> <a href={COLEGIO.facebook} target="_blank" rel="noreferrer">Síguenos en Facebook</a></li>
          </ul>
        </div>
        <form className="s-form" onSubmit={enviar}>
          <div className="s-form-fila">
            <label>Nombre<input value={f.nombre} onChange={cambiar('nombre')} required maxLength={120} /></label>
            <label>Asunto<input value={f.asunto} onChange={cambiar('asunto')} required maxLength={150} placeholder="Ej: Matrículas" /></label>
          </div>
          <div className="s-form-fila">
            <label>Correo<input type="email" value={f.correo} onChange={cambiar('correo')} maxLength={120} /></label>
            <label>Teléfono<input type="tel" value={f.telefono} onChange={cambiar('telefono')} maxLength={30} /></label>
          </div>
          <label>Mensaje<textarea rows={5} value={f.mensaje} onChange={cambiar('mensaje')} required maxLength={3000} /></label>
          <small>Déjanos al menos un correo o un teléfono para responderte.</small>
          {estado.texto && <p className={`s-aviso ${estado.tipo}`}>{estado.texto}</p>}
          <button className="s-btn s-btn-amarillo" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar mensaje'}</button>
        </form>
      </div>
    </section>
  )
}

function DetalleNoticia({ id }) {
  const consulta = useApi(`/publico/noticias/${id}`)
  const otras = useApi('/publico/noticias?limite=4')
  const n = consulta.datos

  useEffect(() => {
    if (n) document.title = `${n.titulo} · IEMM`
  }, [n])

  return (
    <main className="s-seccion">
      <div className="s-contenedor s-articulo-grid">
        <article className="s-articulo">
          <a href="/#noticias" className="s-volver"><Icono nombre="arrow_back" /> Volver a noticias</a>
          {consulta.cargando && <p className="s-vacio">Cargando…</p>}
          {consulta.error && <p className="s-vacio">{consulta.error}</p>}
          {n && (
            <>
              <span className="s-chip">{CATEGORIAS[n.categoria].nombre}</span>
              <h1>{n.titulo}</h1>
              <time>{fecha(n.fecha, { day: 'numeric', month: 'long', year: 'numeric' })}</time>
              <Portadilla noticia={n} grande />
              <p className="s-resumen">{n.resumen}</p>
              {n.contenido.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
            </>
          )}
        </article>
        <aside className="s-lateral">
          <h3>Más noticias</h3>
          {otras.datos?.filter((o) => String(o.id) !== String(id)).slice(0, 3).map((o) => (
            <a key={o.id} href={`/noticias/${o.id}`}>
              <strong>{o.titulo}</strong>
              <time>{fecha(o.fecha)}</time>
            </a>
          ))}
          <a href="/plataforma" className="s-btn s-btn-azul"><Icono nombre="login" /> Plataforma académica</a>
        </aside>
      </div>
    </main>
  )
}

function Pie() {
  return (
    <footer className="s-pie">
      <div className="s-pie-franjas" aria-hidden="true"><span /><span /><span /></div>
      <div className="s-contenedor s-pie-grid">
        <div className="s-pie-marca">
          <img src="/escudo.jpeg" alt="" />
          <div>
            <strong>{COLEGIO.nombre}</strong>
            <span>{COLEGIO.lema}</span>
          </div>
        </div>
        <nav>
          {ENLACES.map(([id, nombre]) => <a key={id} href={`/#${id}`}>{nombre}</a>)}
        </nav>
        <div>
          <a href="/plataforma" className="s-btn s-btn-amarillo"><Icono nombre="login" /> Plataforma</a>
        </div>
      </div>
      <p className="s-copy">© {new Date().getFullYear()} {COLEGIO.nombre} · {COLEGIO.ciudad}</p>
    </footer>
  )
}
