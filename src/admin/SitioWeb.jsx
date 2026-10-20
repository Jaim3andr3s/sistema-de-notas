// Administración del sitio público: noticias, publicaciones de Facebook y mensajes de contacto
import { useState } from 'react'
import { api } from '../api.js'
import { Caja, ConDatos, Icono, Modal, Campo, Aviso, Vacio, useApi } from '../componentes/ui.jsx'
import { CATEGORIAS, CATEGORIAS_DOC, GRADOS_ADMISION } from '../sitio/contenido.js'
import { fecha, fechaHora, hoy } from '../util.js'

export default function SitioWeb() {
  const [pestana, setPestana] = useState('noticias')
  const mensajes = useApi('/admin/mensajes')
  const preinscripciones = useApi('/admin/preinscripciones')
  const sinLeer = mensajes.datos?.filter((m) => !m.leido).length ?? 0
  const nuevas = preinscripciones.datos?.filter((p) => p.estado === 'nueva').length ?? 0

  return (
    <>
      <div className="pestanas">
        <button className={pestana === 'noticias' ? 'activa' : ''} onClick={() => setPestana('noticias')}>Noticias</button>
        <button className={pestana === 'facebook' ? 'activa' : ''} onClick={() => setPestana('facebook')}>Facebook</button>
        <button className={pestana === 'galeria' ? 'activa' : ''} onClick={() => setPestana('galeria')}>Galería</button>
        <button className={pestana === 'documentos' ? 'activa' : ''} onClick={() => setPestana('documentos')}>Transparencia</button>
        <button className={pestana === 'preinscripciones' ? 'activa' : ''} onClick={() => setPestana('preinscripciones')}>
          Preinscripciones {nuevas > 0 && <span>{nuevas}</span>}
        </button>
        <button className={pestana === 'mensajes' ? 'activa' : ''} onClick={() => setPestana('mensajes')}>
          Mensajes de contacto {sinLeer > 0 && <span>{sinLeer}</span>}
        </button>
        <a className="btn-secundario ver-sitio" href="/" target="_blank" rel="noreferrer"><Icono nombre="open_in_new" /> Ver sitio</a>
      </div>
      {pestana === 'noticias' && <Noticias />}
      {pestana === 'facebook' && <Facebook />}
      {pestana === 'galeria' && <Galeria />}
      {pestana === 'documentos' && <Documentos />}
      {pestana === 'preinscripciones' && <Preinscripciones consulta={preinscripciones} />}
      {pestana === 'mensajes' && <Mensajes consulta={mensajes} />}
    </>
  )
}

// Publicaciones de Facebook que se muestran insertadas en el sitio
function Facebook() {
  const consulta = useApi('/admin/facebook')
  const [nueva, setNueva] = useState({ url: '', descripcion: '' })
  const [msg, setMsg] = useState({ tipo: '', texto: '' })

  async function agregar(e) {
    e.preventDefault()
    try {
      await api('/admin/facebook', { method: 'POST', body: nueva })
      setNueva({ url: '', descripcion: '' })
      setMsg({ tipo: 'exito', texto: 'Publicación agregada al sitio' })
      consulta.recargar()
    } catch (err) {
      setMsg({ tipo: 'error', texto: err.message })
    }
  }

  async function quitar(p) {
    if (!window.confirm('¿Quitar esta publicación del sitio? (En Facebook no se borra)')) return
    await api(`/admin/facebook/${p.id}`, { method: 'DELETE' })
    consulta.recargar()
  }

  return (
    <div className="columnas">
      <Caja titulo="Publicaciones de Facebook en el sitio">
        <ConDatos consulta={consulta}>
          {(lista) => lista.length === 0 ? <Vacio icono="thumb_up">Aún no hay publicaciones. Agrega la primera con el formulario.</Vacio> : (
            <ul className="lista-simple">
              {lista.map((p) => (
                <li key={p.id}>
                  <div>
                    <strong>{p.descripcion || 'Publicación de Facebook'}</strong>
                    <small>{p.url}</small>
                    <small>Agregada el {fecha(p.creado_en)}</small>
                  </div>
                  <span className="acciones-fila">
                    <a className="btn-icono" title="Abrir en Facebook" href={p.url} target="_blank" rel="noreferrer"><Icono nombre="open_in_new" /></a>
                    <button className="btn-icono peligro" title="Quitar del sitio" onClick={() => quitar(p)}><Icono nombre="delete" /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ConDatos>
        <p className="texto-suave">El sitio muestra las 6 más recientes.</p>
      </Caja>

      <Caja titulo="Agregar publicación">
        <form className="form" onSubmit={agregar}>
          <Campo etiqueta="Enlace de la publicación" ayuda="En Facebook abre la publicación, toca ⋯ y elige «Copiar enlace». La publicación debe ser pública (ícono 🌎).">
            <input value={nueva.url} onChange={(e) => setNueva({ ...nueva, url: e.target.value })} placeholder="https://www.facebook.com/.../posts/..." required />
          </Campo>
          <Campo etiqueta="Descripción (opcional)" ayuda="Solo para reconocerla aquí; no se muestra en el sitio.">
            <input value={nueva.descripcion} maxLength={200} onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })} placeholder="Ej: Resultados Saber 11" />
          </Campo>
          <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>
          <div className="form-acciones"><button className="btn-primario"><Icono nombre="add" /> Agregar al sitio</button></div>
        </form>
        <Aviso tipo="info">
          El Facebook del colegio es un perfil personal, y Facebook no deja mostrar automáticamente el muro de un perfil en otra página.
          Si el colegio crea una <strong>página de Facebook</strong>, el sitio puede mostrar todas las publicaciones solo, sin agregarlas una por una.
        </Aviso>
      </Caja>
    </div>
  )
}

const VACIA = { titulo: '', resumen: '', contenido: '', categoria: 'institucional', fecha: hoy(), destacada: false, publicada: true }

function Noticias() {
  const consulta = useApi('/admin/noticias')
  const [editando, setEditando] = useState(null)

  async function borrar(n) {
    if (!window.confirm(`¿Eliminar la noticia "${n.titulo}"?`)) return
    await api(`/admin/noticias/${n.id}`, { method: 'DELETE' })
    consulta.recargar()
  }

  return (
    <Caja titulo="Noticias del sitio web" acciones={<button className="btn-primario" onClick={() => setEditando(VACIA)}><Icono nombre="add" /> Nueva noticia</button>}>
      <ConDatos consulta={consulta}>
        {(lista) => lista.length === 0 ? <Vacio icono="newspaper">No hay noticias publicadas.</Vacio> : (
          <div className="tabla-scroll">
            <table className="tabla">
              <thead><tr><th>Noticia</th><th>Categoría</th><th>Fecha</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {lista.map((n) => (
                  <tr key={n.id} className={n.publicada ? '' : 'inactivo'}>
                    <td><strong>{n.titulo}</strong><small>{n.resumen}</small></td>
                    <td>{CATEGORIAS[n.categoria].nombre}</td>
                    <td>{fecha(n.fecha)}</td>
                    <td>
                      <span className={n.publicada ? 'chip ok' : 'chip'}>{n.publicada ? 'Publicada' : 'Borrador'}</span>
                      {n.destacada ? <span className="chip pendiente">Destacada</span> : null}
                    </td>
                    <td className="acciones-fila">
                      {n.publicada ? <a className="btn-icono" title="Ver en el sitio" href={`/noticias/${n.id}`} target="_blank" rel="noreferrer"><Icono nombre="visibility" /></a> : null}
                      <button className="btn-icono" title="Editar" onClick={() => setEditando({ ...n, destacada: Boolean(n.destacada), publicada: Boolean(n.publicada) })}><Icono nombre="edit" /></button>
                      <button className="btn-icono peligro" title="Eliminar" onClick={() => borrar(n)}><Icono nombre="delete" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConDatos>
      {editando && <FormNoticia inicial={editando} onCerrar={(ok) => { setEditando(null); if (ok) consulta.recargar() }} />}
    </Caja>
  )
}

function FormNoticia({ inicial, onCerrar }) {
  const [f, setF] = useState(inicial)
  const [imagen, setImagen] = useState(null)
  const [quitar, setQuitar] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const cambiar = (c) => (e) => setF({ ...f, [c]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function guardar(e) {
    e.preventDefault()
    const form = new FormData()
    for (const c of ['titulo', 'resumen', 'contenido', 'categoria', 'fecha', 'destacada', 'publicada']) form.append(c, f[c])
    if (imagen) form.append('imagen', imagen)
    if (quitar) form.append('quitar_imagen', 'true')
    setGuardando(true)
    try {
      if (f.id) await api(`/admin/noticias/${f.id}`, { method: 'PUT', body: form })
      else await api('/admin/noticias', { method: 'POST', body: form })
      onCerrar(true)
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={f.id ? 'Editar noticia' : 'Nueva noticia'} onCerrar={() => onCerrar(false)} ancho={720}>
      <form className="form" onSubmit={guardar}>
        <Campo etiqueta="Título"><input value={f.titulo} onChange={cambiar('titulo')} required maxLength={180} /></Campo>
        <div className="form-fila">
          <Campo etiqueta="Categoría">
            <select value={f.categoria} onChange={cambiar('categoria')}>
              {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Fecha"><input type="date" value={f.fecha} onChange={cambiar('fecha')} required /></Campo>
        </div>
        <Campo etiqueta="Resumen" ayuda="Aparece en la tarjeta de la portada (máx. 300 caracteres)">
          <textarea rows={2} value={f.resumen} onChange={cambiar('resumen')} required maxLength={300} />
        </Campo>
        <Campo etiqueta="Contenido" ayuda="Separa los párrafos con un salto de línea">
          <textarea rows={8} value={f.contenido} onChange={cambiar('contenido')} required />
        </Campo>
        <Campo etiqueta="Imagen (opcional)" ayuda="JPG, PNG o WEBP de hasta 5 MB. Sin imagen se muestra un fondo con los colores del colegio.">
          <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setImagen(e.target.files[0] ?? null)} />
        </Campo>
        {f.imagen && !imagen && (
          <label className="check"><input type="checkbox" checked={quitar} onChange={(e) => setQuitar(e.target.checked)} /> Quitar la imagen actual</label>
        )}
        <div className="form-fila">
          <label className="check"><input type="checkbox" checked={f.publicada} onChange={cambiar('publicada')} /> Publicada en el sitio</label>
          <label className="check"><input type="checkbox" checked={f.destacada} onChange={cambiar('destacada')} /> Destacada en la portada</label>
        </div>
        <Aviso>{error}</Aviso>
        <div className="form-acciones">
          <button type="button" className="btn-secundario" onClick={() => onCerrar(false)}>Cancelar</button>
          <button className="btn-primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  )
}

function Mensajes({ consulta }) {
  async function marcar(m) {
    await api(`/admin/mensajes/${m.id}`, { method: 'PATCH', body: { leido: !m.leido } })
    consulta.recargar()
  }
  async function borrar(m) {
    if (!window.confirm('¿Eliminar este mensaje?')) return
    await api(`/admin/mensajes/${m.id}`, { method: 'DELETE' })
    consulta.recargar()
  }

  return (
    <Caja titulo="Mensajes recibidos desde el sitio web">
      <ConDatos consulta={consulta}>
        {(lista) => lista.length === 0 ? <Vacio icono="mail">No hay mensajes.</Vacio> : (
          <ul className="observaciones">
            {lista.map((m) => (
              <li key={m.id} className={`obs ${m.leido ? '' : 'citacion'}`}>
                <div className="obs-cabecera">
                  <strong>{m.asunto}</strong>
                  {!m.leido && <span className="chip pendiente">Nuevo</span>}
                  <time>{fechaHora(m.creado_en)}</time>
                </div>
                <p>{m.mensaje}</p>
                <div className="obs-pie">
                  <span><Icono nombre="person" /> {m.nombre}</span>
                  {m.telefono && <span><Icono nombre="call" /> {m.telefono}</span>}
                  {m.correo && <a href={`mailto:${m.correo}`}><Icono nombre="mail" /> {m.correo}</a>}
                  <span className="obs-botones">
                    <button className="enlace" onClick={() => marcar(m)}>{m.leido ? 'Marcar como no leído' : 'Marcar como leído'}</button>
                    <button className="enlace" onClick={() => borrar(m)}>Eliminar</button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ConDatos>
    </Caja>
  )
}

// ---------- Galería de fotos ----------
function Galeria() {
  const consulta = useApi('/admin/galerias')
  const [nuevo, setNuevo] = useState({ titulo: '', descripcion: '', fecha: hoy() })
  const [msg, setMsg] = useState({ tipo: '', texto: '' })
  const [subiendo, setSubiendo] = useState(null)

  async function accion(fn, exito) {
    setMsg({ tipo: '', texto: '' })
    try {
      await fn()
      if (exito) setMsg({ tipo: 'exito', texto: exito })
      consulta.recargar()
      return true
    } catch (err) {
      setMsg({ tipo: 'error', texto: err.message })
      return false
    }
  }

  async function crear(e) {
    e.preventDefault()
    if (await accion(() => api('/admin/galerias', { method: 'POST', body: nuevo }), 'Álbum creado. Ahora súbele fotos.')) setNuevo({ titulo: '', descripcion: '', fecha: hoy() })
  }

  async function subir(g, archivos) {
    if (!archivos.length) return
    const form = new FormData()
    for (const a of archivos) form.append('fotos', a)
    setSubiendo(g.id)
    await accion(() => api(`/admin/galerias/${g.id}/fotos`, { method: 'POST', body: form }), `${archivos.length} fotos subidas a "${g.titulo}"`)
    setSubiendo(null)
  }

  return (
    <div className="columnas columnas-invertidas">
      <Caja titulo="Nuevo álbum">
        <form className="form" onSubmit={crear}>
          <Campo etiqueta="Título"><input required maxLength={150} value={nuevo.titulo} onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })} placeholder="Ej: Feria de la ciencia 2026" /></Campo>
          <Campo etiqueta="Descripción (opcional)"><input maxLength={300} value={nuevo.descripcion} onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} /></Campo>
          <Campo etiqueta="Fecha del evento"><input type="date" required value={nuevo.fecha} onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })} /></Campo>
          <div className="form-acciones"><button className="btn-primario"><Icono nombre="add" /> Crear álbum</button></div>
        </form>
        <Aviso tipo="info">Las fotos deben ser JPG, PNG o WebP de máximo 5 MB. Evita publicar fotos de estudiantes sin la autorización de sus acudientes.</Aviso>
      </Caja>
      <Caja titulo="Álbumes">
        <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>
        <ConDatos consulta={consulta}>
          {(lista) => lista.length === 0 ? <Vacio icono="photo_library">Aún no hay álbumes.</Vacio> : (
            <ul className="lista-albumes">
              {lista.map((g) => (
                <li key={g.id} className={g.publicada ? '' : 'inactivo'}>
                  <div className="lista-albumes-cabecera">
                    <div>
                      <strong>{g.titulo}</strong>
                      <small>{fecha(g.fecha)} · {g.fotos.length} fotos {g.publicada ? '' : '· oculto'}</small>
                    </div>
                    <span className="acciones-fila">
                      <label className="btn-secundario" title="Subir fotos">
                        <Icono nombre="add_photo_alternate" /> {subiendo === g.id ? 'Subiendo…' : 'Subir fotos'}
                        <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => subir(g, [...e.target.files])} />
                      </label>
                      {g.fotos.length > 0 && <a className="btn-icono" title="Ver en el sitio" href={`/galeria/${g.id}`} target="_blank" rel="noreferrer"><Icono nombre="visibility" /></a>}
                      <button className="btn-icono" title={g.publicada ? 'Ocultar' : 'Publicar'} onClick={() => accion(() => api(`/admin/galerias/${g.id}`, { method: 'PATCH', body: { publicada: !g.publicada } }))}>
                        <Icono nombre={g.publicada ? 'visibility_off' : 'public'} />
                      </button>
                      <button className="btn-icono peligro" title="Eliminar álbum" onClick={() => window.confirm(`¿Eliminar el álbum "${g.titulo}" y sus fotos?`) && accion(() => api(`/admin/galerias/${g.id}`, { method: 'DELETE' }))}>
                        <Icono nombre="delete" />
                      </button>
                    </span>
                  </div>
                  {g.fotos.length > 0 && (
                    <div className="miniaturas">
                      {g.fotos.map((f) => (
                        <figure key={f.id}>
                          <img src={`/api/publico/fotos/${f.archivo}`} alt="" loading="lazy" />
                          <button title="Quitar foto" onClick={() => accion(() => api(`/admin/fotos/${f.id}`, { method: 'DELETE' }))}><Icono nombre="close" /></button>
                        </figure>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ConDatos>
      </Caja>
    </div>
  )
}

// ---------- Transparencia: documentos ----------
const DOCUMENTO_VACIO = { titulo: '', descripcion: '', categoria: 'institucional', fecha: hoy() }

function Documentos() {
  const consulta = useApi('/admin/documentos')
  const [f, setF] = useState(DOCUMENTO_VACIO)
  const [archivo, setArchivo] = useState(null)
  const [clave, setClave] = useState(0)
  const [msg, setMsg] = useState({ tipo: '', texto: '' })

  async function subir(e) {
    e.preventDefault()
    const form = new FormData()
    for (const [k, v] of Object.entries(f)) form.append(k, v)
    if (archivo) form.append('archivo', archivo)
    try {
      await api('/admin/documentos', { method: 'POST', body: form })
      setF(DOCUMENTO_VACIO)
      setArchivo(null)
      setClave((k) => k + 1)
      setMsg({ tipo: 'exito', texto: 'Documento publicado en la página de Transparencia' })
      consulta.recargar()
    } catch (err) {
      setMsg({ tipo: 'error', texto: err.message })
    }
  }

  async function cambiar(d, accion) {
    if (accion === 'borrar' && !window.confirm(`¿Eliminar "${d.titulo}"?`)) return
    await api(`/admin/documentos/${d.id}`, accion === 'borrar' ? { method: 'DELETE' } : { method: 'PATCH', body: { publicado: !d.publicado } })
    consulta.recargar()
  }

  return (
    <div className="columnas columnas-invertidas">
      <Caja titulo="Publicar documento">
        <form className="form" onSubmit={subir}>
          <Campo etiqueta="Título"><input required maxLength={200} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Ej: Manual de convivencia 2026" /></Campo>
          <Campo etiqueta="Sección">
            <select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
              {Object.entries(CATEGORIAS_DOC).map(([k, c]) => <option key={k} value={k}>{c.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Descripción (opcional)"><input maxLength={300} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></Campo>
          <Campo etiqueta="Fecha del documento"><input type="date" required value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Campo>
          <Campo etiqueta="Archivo" ayuda="PDF de preferencia. Máximo 10 MB."><input key={clave} type="file" required onChange={(e) => setArchivo(e.target.files[0] ?? null)} /></Campo>
          <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>
          <div className="form-acciones"><button className="btn-primario"><Icono nombre="upload" /> Publicar</button></div>
        </form>
        <Aviso tipo="info">
          Por la Ley 1712, un colegio oficial debe publicar al menos: PEI, manual de convivencia, SIEE, calendario académico, presupuesto del Fondo de Servicios Educativos y su ejecución, contratos, y el informe de rendición de cuentas.
        </Aviso>
      </Caja>
      <Caja titulo="Documentos publicados" acciones={<a className="btn-secundario" href="/transparencia" target="_blank" rel="noreferrer"><Icono nombre="open_in_new" /> Ver página</a>}>
        <ConDatos consulta={consulta}>
          {(lista) => lista.length === 0 ? <Vacio icono="folder_open">Aún no hay documentos.</Vacio> : (
            <ul className="lista-simple">
              {lista.map((d) => (
                <li key={d.id} className={d.publicado ? '' : 'inactivo'}>
                  <div>
                    <strong>{d.titulo}</strong>
                    <small>{CATEGORIAS_DOC[d.categoria].nombre} · {fecha(d.fecha)} · {d.archivo_nombre}{d.publicado ? '' : ' · oculto'}</small>
                  </div>
                  <span className="acciones-fila">
                    <button className="btn-icono" title={d.publicado ? 'Ocultar' : 'Publicar'} onClick={() => cambiar(d, 'alternar')}><Icono nombre={d.publicado ? 'visibility_off' : 'public'} /></button>
                    <button className="btn-icono peligro" title="Eliminar" onClick={() => cambiar(d, 'borrar')}><Icono nombre="delete" /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ConDatos>
      </Caja>
    </div>
  )
}

// ---------- Admisiones: preinscripciones ----------
const ESTADOS_PRE = { nueva: ['Nueva', 'pendiente'], contactada: ['Contactada', 'info'], admitida: ['Admitida', 'ok'], no_admitida: ['No admitida', 'alerta'] }

function Preinscripciones({ consulta }) {
  const [grado, setGrado] = useState('')
  async function cambiar(p, estado) {
    await api(`/admin/preinscripciones/${p.id}`, { method: 'PATCH', body: { estado } })
    consulta.recargar()
  }
  async function borrar(p) {
    if (!window.confirm(`¿Eliminar la preinscripción de ${p.estudiante_nombre}?`)) return
    await api(`/admin/preinscripciones/${p.id}`, { method: 'DELETE' })
    consulta.recargar()
  }
  return (
    <Caja
      titulo="Preinscripciones del sitio web"
      acciones={
        <select value={grado} onChange={(e) => setGrado(e.target.value)} aria-label="Filtrar por grado">
          <option value="">Todos los grados</option>
          {GRADOS_ADMISION.map((g) => <option key={g}>{g}</option>)}
        </select>
      }
    >
      <ConDatos consulta={consulta}>
        {(lista) => {
          const filtrada = lista.filter((p) => !grado || p.grado_aspira === grado)
          return filtrada.length === 0 ? <Vacio icono="how_to_reg">No hay preinscripciones.</Vacio> : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Aspirante</th><th>Grado</th><th>Acudiente</th><th>Recibida</th><th>Estado</th><th /></tr></thead>
                <tbody>
                  {filtrada.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.estudiante_nombre}</strong>
                        <small>{[p.estudiante_documento && `Doc. ${p.estudiante_documento}`, p.colegio_procedencia, p.sede].filter(Boolean).join(' · ')}</small>
                        {p.observaciones && <small>{p.observaciones}</small>}
                      </td>
                      <td>{p.grado_aspira}</td>
                      <td>
                        {p.acudiente_nombre}
                        <small><a href={`tel:${p.acudiente_telefono}`}>{p.acudiente_telefono}</a>{p.acudiente_correo && <> · <a href={`mailto:${p.acudiente_correo}`}>{p.acudiente_correo}</a></>}</small>
                      </td>
                      <td>{fechaHora(p.creado_en)}</td>
                      <td>
                        <select value={p.estado} onChange={(e) => cambiar(p, e.target.value)} aria-label="Estado" className={`chip ${ESTADOS_PRE[p.estado][1]}`}>
                          {Object.entries(ESTADOS_PRE).map(([k, [nombre]]) => <option key={k} value={k}>{nombre}</option>)}
                        </select>
                      </td>
                      <td className="acciones-fila"><button className="btn-icono peligro" title="Eliminar" onClick={() => borrar(p)}><Icono nombre="delete" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }}
      </ConDatos>
    </Caja>
  )
}
