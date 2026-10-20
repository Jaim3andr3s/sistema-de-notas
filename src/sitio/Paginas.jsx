// Páginas del sitio: admisiones, transparencia, galería, directorio y política de datos
import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Icono, useApi } from '../componentes/ui.jsx'
import { fecha } from '../util.js'
import { Titulo } from './comun.jsx'
import { COLEGIO, SEDES, DIRECTIVOS, GRADOS_ADMISION, PASOS_ADMISION, REQUISITOS, CATEGORIAS_DOC } from './contenido.js'

function usarTitulo(titulo) {
  useEffect(() => {
    document.title = `${titulo} · IEMM`
    window.scrollTo(0, 0)
  }, [titulo])
}

function Cabecera({ etiqueta, titulo, texto }) {
  return (
    <section className="s-cabecera-pagina">
      <div className="s-contenedor">
        <span className="s-etiqueta">{etiqueta}</span>
        <h1>{titulo}</h1>
        {texto && <p>{texto}</p>}
      </div>
    </section>
  )
}

const PorConfirmar = () => <span className="s-pendiente">Por confirmar</span>

// Casilla de aceptación de la política de datos (obligatoria en los formularios)
export function AceptaDatos({ valor, onCambio }) {
  return (
    <label className="s-acepta">
      <input type="checkbox" checked={valor} onChange={(e) => onCambio(e.target.checked)} required />
      <span>Autorizo el tratamiento de mis datos personales según la <a href="/privacidad" target="_blank" rel="noreferrer">política de tratamiento de datos</a> de la institución.</span>
    </label>
  )
}

// ---------- Admisiones ----------
const PREINSCRIPCION = {
  estudiante_nombre: '', estudiante_documento: '', fecha_nacimiento: '', grado_aspira: '', sede: '',
  colegio_procedencia: '', acudiente_nombre: '', acudiente_telefono: '', acudiente_correo: '', observaciones: '', acepta_datos: false,
}

export function Admisiones() {
  usarTitulo('Admisiones')
  const [f, setF] = useState(PREINSCRIPCION)
  const [estado, setEstado] = useState({ tipo: '', texto: '' })
  const [enviando, setEnviando] = useState(false)
  const cambiar = (c) => (e) => setF({ ...f, [c]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    try {
      await api('/publico/preinscripciones', { method: 'POST', body: f })
      setF(PREINSCRIPCION)
      setEstado({ tipo: 'exito', texto: '¡Recibimos la preinscripción! La secretaría se comunicará contigo para confirmar el cupo.' })
    } catch (err) {
      setEstado({ tipo: 'error', texto: err.message })
    }
    setEnviando(false)
  }

  return (
    <main>
      <Cabecera etiqueta="Admisiones" titulo={`Matrículas ${new Date().getFullYear() + 1}`} texto="Te contamos cómo ingresar a la comunidad maximista, del preescolar a la media académica." />
      <section className="s-seccion">
        <div className="s-contenedor">
          <Titulo etiqueta="Proceso" titulo="¿Cómo es el proceso?" />
          <ol className="s-pasos">
            {PASOS_ADMISION.map((p, i) => (
              <li key={p.titulo}>
                <span className="s-paso-numero">{i + 1}</span>
                <Icono nombre={p.icono} />
                <strong>{p.titulo}</strong>
                <p>{p.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="s-seccion s-fondo-suave">
        <div className="s-contenedor s-contacto">
          <div>
            <Titulo etiqueta="Requisitos" titulo="Documentos para la matrícula" texto="Llévalos a la secretaría de la Sede Principal cuando te confirmemos el cupo." />
            <ul className="s-requisitos">
              {REQUISITOS.map((r) => <li key={r}><Icono nombre="check_circle" /> {r}</li>)}
            </ul>
            <p className="s-nota">La educación en la institución es gratuita. {COLEGIO.horarioAtencion ? `Horario de atención: ${COLEGIO.horarioAtencion}.` : ''}</p>
          </div>
          <form className="s-form" onSubmit={enviar}>
            <h3 className="s-form-titulo">Preinscripción en línea</h3>
            <label>Nombre completo del aspirante<input value={f.estudiante_nombre} onChange={cambiar('estudiante_nombre')} required maxLength={150} /></label>
            <div className="s-form-fila">
              <label>Documento del aspirante<input value={f.estudiante_documento} onChange={cambiar('estudiante_documento')} maxLength={20} /></label>
              <label>Fecha de nacimiento<input type="date" value={f.fecha_nacimiento} onChange={cambiar('fecha_nacimiento')} /></label>
            </div>
            <div className="s-form-fila">
              <label>Grado al que aspira
                <select value={f.grado_aspira} onChange={cambiar('grado_aspira')} required>
                  <option value="">Elige…</option>
                  {GRADOS_ADMISION.map((g) => <option key={g}>{g}</option>)}
                </select>
              </label>
              <label>Sede de preferencia
                <select value={f.sede} onChange={cambiar('sede')}>
                  <option value="">Cualquiera</option>
                  {SEDES.map((s) => <option key={s.nombre}>{s.nombre}</option>)}
                </select>
              </label>
            </div>
            <label>Colegio de procedencia<input value={f.colegio_procedencia} onChange={cambiar('colegio_procedencia')} maxLength={150} /></label>
            <div className="s-form-fila">
              <label>Nombre del acudiente<input value={f.acudiente_nombre} onChange={cambiar('acudiente_nombre')} required maxLength={150} /></label>
              <label>Teléfono / WhatsApp<input type="tel" value={f.acudiente_telefono} onChange={cambiar('acudiente_telefono')} required maxLength={30} /></label>
            </div>
            <label>Correo del acudiente<input type="email" value={f.acudiente_correo} onChange={cambiar('acudiente_correo')} maxLength={120} /></label>
            <label>Observaciones<textarea rows={3} value={f.observaciones} onChange={cambiar('observaciones')} maxLength={2000} placeholder="Necesidades especiales, hermanos en el colegio, jornada que prefieres…" /></label>
            <AceptaDatos valor={f.acepta_datos} onCambio={(v) => setF({ ...f, acepta_datos: v })} />
            {estado.texto && <p className={`s-aviso ${estado.tipo}`}>{estado.texto}</p>}
            <button className="s-btn s-btn-azul" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar preinscripción'}</button>
          </form>
        </div>
      </section>
    </main>
  )
}

// ---------- Transparencia ----------
export function Transparencia() {
  usarTitulo('Transparencia')
  const consulta = useApi('/publico/documentos')
  const docs = consulta.datos ?? []
  return (
    <main>
      <Cabecera
        etiqueta="Transparencia y acceso a la información pública"
        titulo="Transparencia"
        texto="En cumplimiento de la Ley 1712 de 2014, publicamos la información institucional, de planeación, presupuesto y normatividad de la institución."
      />
      <section className="s-seccion">
        <div className="s-contenedor s-transparencia">
          {Object.entries(CATEGORIAS_DOC).map(([clave, cat]) => {
            const lista = docs.filter((d) => d.categoria === clave)
            return (
              <article key={clave} id={clave}>
                <header>
                  <span className="s-acceso-icono"><Icono nombre={cat.icono} /></span>
                  <div>
                    <h2>{cat.nombre}</h2>
                    <p>{cat.texto}</p>
                  </div>
                </header>
                {consulta.cargando ? <p className="s-vacio">Cargando…</p> : lista.length === 0 ? (
                  <p className="s-vacio">Aún no se han publicado documentos en esta sección.</p>
                ) : (
                  <ul>
                    {lista.map((d) => (
                      <li key={d.id}>
                        <a href={`/api/publico/documentos/${d.archivo}`}>
                          <Icono nombre="description" />
                          <span>
                            <strong>{d.titulo}</strong>
                            <small>{d.descripcion ? `${d.descripcion} · ` : ''}{fecha(d.fecha)}</small>
                          </span>
                          <Icono nombre="download" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            )
          })}
          <p className="s-nota">
            ¿Necesitas información que no está aquí? Puedes solicitarla por el <a href="/#contacto">formulario de contacto</a>. La institución responde las solicitudes de información en los plazos de ley.
          </p>
        </div>
      </section>
    </main>
  )
}

// ---------- Galería ----------
const foto = (archivo) => `/api/publico/fotos/${archivo}`

export function Galerias() {
  usarTitulo('Galería')
  const consulta = useApi('/publico/galerias')
  return (
    <main>
      <Cabecera etiqueta="Galería" titulo="Momentos maximistas" texto="Eventos, actos culturales, deportes y la vida diaria de nuestras sedes." />
      <section className="s-seccion">
        <div className="s-contenedor">
          {consulta.cargando && <p className="s-vacio">Cargando…</p>}
          {consulta.datos?.length === 0 && (
            <a href={COLEGIO.facebook} target="_blank" rel="noreferrer" className="s-facebook-vacio">
              <Icono nombre="photo_library" />
              <span><strong>Pronto publicaremos los álbumes aquí</strong><small>Mientras tanto, mira las fotos en nuestro Facebook</small></span>
              <Icono nombre="arrow_forward" />
            </a>
          )}
          <div className="s-albumes">
            {consulta.datos?.map((g) => (
              <a key={g.id} href={`/galeria/${g.id}`} className="s-album">
                <img src={foto(g.portada)} alt="" loading="lazy" />
                <div>
                  <strong>{g.titulo}</strong>
                  <small>{fecha(g.fecha)} · {g.fotos} fotos</small>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export function Album({ id }) {
  const consulta = useApi(`/publico/galerias/${id}`)
  const g = consulta.datos
  const [abierta, setAbierta] = useState(null)
  usarTitulo(g?.titulo ?? 'Galería')

  useEffect(() => {
    if (abierta == null || !g) return
    const teclas = (e) => {
      if (e.key === 'Escape') setAbierta(null)
      if (e.key === 'ArrowRight') setAbierta((i) => (i + 1) % g.fotos.length)
      if (e.key === 'ArrowLeft') setAbierta((i) => (i - 1 + g.fotos.length) % g.fotos.length)
    }
    window.addEventListener('keydown', teclas)
    return () => window.removeEventListener('keydown', teclas)
  }, [abierta, g])

  return (
    <main className="s-seccion">
      <div className="s-contenedor">
        <a href="/galeria" className="s-volver"><Icono nombre="arrow_back" /> Volver a la galería</a>
        {consulta.error && <p className="s-vacio">{consulta.error}</p>}
        {g && (
          <>
            <Titulo etiqueta={fecha(g.fecha, { day: 'numeric', month: 'long', year: 'numeric' })} titulo={g.titulo} texto={g.descripcion} />
            <div className="s-fotos">
              {g.fotos.map((f, i) => (
                <button key={f.id} onClick={() => setAbierta(i)} aria-label={`Ver foto ${i + 1}`}>
                  <img src={foto(f.archivo)} alt="" loading="lazy" />
                </button>
              ))}
            </div>
            {abierta != null && (
              <div className="s-visor" role="dialog" aria-label="Foto ampliada" onClick={(e) => e.target === e.currentTarget && setAbierta(null)}>
                <button className="s-visor-cerrar" onClick={() => setAbierta(null)} aria-label="Cerrar"><Icono nombre="close" /></button>
                <button className="s-visor-ant" onClick={() => setAbierta((abierta - 1 + g.fotos.length) % g.fotos.length)} aria-label="Anterior"><Icono nombre="chevron_left" /></button>
                <img src={foto(g.fotos[abierta].archivo)} alt={`Foto ${abierta + 1} de ${g.fotos.length}`} />
                <button className="s-visor-sig" onClick={() => setAbierta((abierta + 1) % g.fotos.length)} aria-label="Siguiente"><Icono nombre="chevron_right" /></button>
                <span className="s-visor-contador">{abierta + 1} / {g.fotos.length}</span>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

// ---------- Directorio ----------
export function Directorio() {
  usarTitulo('Directorio')
  return (
    <main>
      <Cabecera etiqueta="Directorio" titulo="¿Con quién hablar?" texto="Equipo directivo, sedes y horarios de atención." />
      <section className="s-seccion">
        <div className="s-contenedor">
          <Titulo etiqueta="Equipo directivo" titulo="Directivos y dependencias" />
          <div className="s-directivos">
            {DIRECTIVOS.map((d) => (
              <article key={d.cargo}>
                <span className="s-acceso-icono"><Icono nombre={d.icono} /></span>
                <div>
                  <small>{d.cargo}</small>
                  <strong>{d.nombre || <PorConfirmar />}</strong>
                  {d.detalle && <p>{d.detalle}</p>}
                  {d.correo && <a href={`mailto:${d.correo}`}>{d.correo}</a>}
                </div>
              </article>
            ))}
          </div>
          <p className="s-nota">
            <Icono nombre="schedule" /> Horario de atención al público: {COLEGIO.horarioAtencion || <PorConfirmar />}
          </p>
        </div>
      </section>
      <section className="s-seccion s-fondo-suave">
        <div className="s-contenedor">
          <Titulo etiqueta="Sedes" titulo="Dónde estamos" />
          <div className="s-sedes-mapa">
            {SEDES.map((s) => {
              const lugar = `${s.direccion || s.nombre}, Institución Educativa Máximo Mercado, Sabanalarga, Atlántico`
              return (
                <article key={s.nombre}>
                  <iframe
                    title={`Mapa de la ${s.nombre}`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(lugar)}&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <div>
                    <strong>{s.nombre}</strong>
                    <p>{s.texto}</p>
                    <p><Icono nombre="place" /> {s.direccion || <PorConfirmar />}</p>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lugar)}`} target="_blank" rel="noreferrer">Cómo llegar</a>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}

// ---------- Política de tratamiento de datos (Ley 1581 de 2012) ----------
export function Privacidad() {
  usarTitulo('Política de tratamiento de datos')
  const contacto = COLEGIO.correo || 'la secretaría de la institución'
  return (
    <main>
      <Cabecera etiqueta="Protección de datos personales" titulo="Política de tratamiento de datos" texto="Ley 1581 de 2012 y Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015)." />
      <section className="s-seccion">
        <div className="s-contenedor s-legal">
          <p className="s-aviso-legal"><Icono nombre="info" /> Texto base. Debe ser revisado y adoptado por el consejo directivo de la institución.</p>

          <h2>1. Responsable del tratamiento</h2>
          <p>{COLEGIO.nombre}, establecimiento educativo oficial ubicado en {COLEGIO.ciudad}. Contacto: {contacto}.</p>

          <h2>2. Datos que tratamos</h2>
          <p>Datos de identificación y contacto de estudiantes, acudientes, docentes y directivos; información académica (notas, asistencia, actividades, observador), y los datos que se envían por los formularios del sitio web (contacto y preinscripción).</p>

          <h2>3. Finalidades</h2>
          <ul>
            <li>Prestar el servicio educativo: matrícula, registro de calificaciones, asistencia, boletines y certificados.</li>
            <li>Comunicarnos con estudiantes y familias sobre su proceso académico y de convivencia.</li>
            <li>Atender solicitudes, preinscripciones y mensajes enviados por el sitio web.</li>
            <li>Cumplir obligaciones legales ante la Secretaría de Educación y el Ministerio de Educación (SIMAT, reportes oficiales).</li>
          </ul>

          <h2>4. Datos de niños, niñas y adolescentes</h2>
          <p>Los datos de menores de edad se tratan respetando su interés superior y sus derechos fundamentales, con la autorización de sus padres o representantes legales, y solo para las finalidades educativas descritas.</p>

          <h2>5. Derechos de los titulares</h2>
          <p>Como titular puedes conocer, actualizar y rectificar tus datos; solicitar prueba de la autorización; ser informado sobre el uso que se les da; revocar la autorización o pedir la supresión cuando no exista un deber legal de conservarlos, y presentar quejas ante la Superintendencia de Industria y Comercio.</p>

          <h2>6. Cómo ejercer tus derechos</h2>
          <p>Escribe a {contacto} o acércate a la secretaría. Las consultas se responden en un máximo de diez (10) días hábiles y los reclamos en un máximo de quince (15) días hábiles, según la ley.</p>

          <h2>7. Seguridad</h2>
          <p>La plataforma usa contraseñas cifradas, acceso por roles (cada persona ve solo lo que le corresponde) y copias de seguridad. Los documentos de los estudiantes no se comparten con terceros salvo obligación legal.</p>

          <h2>8. Vigencia</h2>
          <p>Esta política rige desde su publicación y mientras la institución trate datos personales. Cualquier cambio se publicará en esta página.</p>
        </div>
      </section>
    </main>
  )
}

// ---------- Botón flotante de WhatsApp (solo si el colegio configuró el número) ----------
export function BotonWhatsApp() {
  if (!COLEGIO.whatsapp) return null
  const texto = encodeURIComponent('Hola, quisiera información sobre la Institución Educativa Máximo Mercado.')
  return (
    <a className="s-whatsapp" href={`https://wa.me/${COLEGIO.whatsapp}?text=${texto}`} target="_blank" rel="noreferrer" aria-label="Escríbenos por WhatsApp">
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path fill="currentColor" d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.9-1.6l-.4-.2-3.8 1.2 1.2-3.7-.3-.4a10.6 10.6 0 0 1-1.7-5.8C5.1 10 10 5.2 16 5.2s10.9 4.8 10.9 10.6S22 26.4 16 26.4zm6-7.9c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.7-1.7-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.5c-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 2-.8 2.2-1.6.3-.8.3-1.5.2-1.6-.1-.2-.3-.3-.6-.4z" /></svg>
    </a>
  )
}
