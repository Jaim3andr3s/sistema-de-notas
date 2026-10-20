// Administración del sitio público: noticias, publicaciones de Facebook y mensajes de contacto
import { useState } from 'react'
import { api } from '../api.js'
import { Caja, ConDatos, Icono, Modal, Campo, Aviso, Vacio, useApi } from '../componentes/ui.jsx'
import { CATEGORIAS } from '../sitio/contenido.js'
import { fecha, fechaHora, hoy } from '../util.js'

export default function SitioWeb() {
  const [pestana, setPestana] = useState('noticias')
  const mensajes = useApi('/admin/mensajes')
  const sinLeer = mensajes.datos?.filter((m) => !m.leido).length ?? 0

  return (
    <>
      <div className="pestanas">
        <button className={pestana === 'noticias' ? 'activa' : ''} onClick={() => setPestana('noticias')}>Noticias</button>
        <button className={pestana === 'facebook' ? 'activa' : ''} onClick={() => setPestana('facebook')}>Facebook</button>
        <button className={pestana === 'mensajes' ? 'activa' : ''} onClick={() => setPestana('mensajes')}>
          Mensajes de contacto {sinLeer > 0 && <span>{sinLeer}</span>}
        </button>
        <a className="btn-secundario ver-sitio" href="/" target="_blank" rel="noreferrer"><Icono nombre="open_in_new" /> Ver sitio</a>
      </div>
      {pestana === 'noticias' && <Noticias />}
      {pestana === 'facebook' && <Facebook />}
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
