// Muro de cada asignatura: el docente publica avisos y material, la clase comenta
import { useState } from 'react'
import { api, descargar } from '../api.js'
import { Caja, ConDatos, Icono, Aviso, Vacio, useApi } from '../componentes/ui.jsx'
import { Avatar, EtiquetaRol, Redactor, useSondeo } from './Interaccion.jsx'
import { fecha, fechaHora, iconoAsignatura } from '../util.js'

export default function Clases({ usuario }) {
  const [curso, setCurso] = useState(null)
  if (curso) return <Muro curso={curso} usuario={usuario} onVolver={() => setCurso(null)} />
  return <ListaCursos usuario={usuario} onAbrir={setCurso} />
}

function ListaCursos({ usuario, onAbrir }) {
  const consulta = useApi('/interaccion/cursos')
  const docente = usuario.rol !== 'estudiante'
  return (
    <Caja titulo={docente ? 'Mis clases' : 'Mis clases y docentes'}>
      <p className="texto-suave intro-seccion">
        {docente
          ? 'Cada asignatura tiene su muro: publica avisos, guías y material, y responde las preguntas de tus estudiantes.'
          : 'Entra a cada asignatura para ver los avisos de tu docente, descargar material y hacer preguntas a la clase.'}
      </p>
      <ConDatos consulta={consulta}>
        {(cursos) => cursos.length === 0 ? <Vacio icono="forum">No tienes asignaturas asignadas.</Vacio> : (
          <ul className="accesos">
            {cursos.map((c) => (
              <li key={c.id}>
                <button onClick={() => onAbrir(c)}>
                  <span className="acceso-icono"><Icono nombre={iconoAsignatura(c.asignatura)} /></span>
                  <span className="acceso-texto">
                    <strong>{c.asignatura}</strong>
                    <small>{docente ? c.grado : c.docente ?? 'Sin docente'}</small>
                  </span>
                  <span className="acceso-pie">
                    {c.publicaciones > 0
                      ? <>{c.publicaciones} {c.publicaciones === 1 ? 'publicación' : 'publicaciones'} · {fecha(c.ultima, { day: 'numeric', month: 'short' })}</>
                      : 'Sin publicaciones'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ConDatos>
    </Caja>
  )
}

function Muro({ curso, usuario, onVolver }) {
  const consulta = useApi(`/interaccion/cursos/${curso.id}/publicaciones`)
  useSondeo(consulta.recargar, 30000)
  const [error, setError] = useState('')

  async function accion(ruta, opciones, confirmar) {
    if (confirmar && !window.confirm(confirmar)) return
    setError('')
    try {
      await api(ruta, opciones)
      consulta.recargar()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <div className="muro-cabecera">
        <button className="btn-icono" onClick={onVolver} aria-label="Volver a mis clases"><Icono nombre="arrow_back" /></button>
        <span className="acceso-icono"><Icono nombre={iconoAsignatura(curso.asignatura)} /></span>
        <div>
          <h2>{curso.asignatura} · {curso.grado}</h2>
          {curso.docente && <p className="texto-suave">Docente: {curso.docente}</p>}
        </div>
      </div>

      <ConDatos consulta={consulta}>
        {({ curso: info, publicaciones }) => (
          <div className="muro">
            <NuevaPublicacion cursoId={curso.id} moderador={info.moderador} rol={usuario.rol} onListo={consulta.recargar} />
            <Aviso>{error}</Aviso>
            {publicaciones.length === 0 && <Vacio icono="forum">Todavía no hay publicaciones en esta clase.</Vacio>}
            {publicaciones.map((p) => (
              <article key={p.id} className={p.fijada ? 'publicacion fijada' : 'publicacion'}>
                <header>
                  <Avatar nombre={p.autor} rol={p.autor_rol} />
                  <div className="crece">
                    <strong>{p.autor}</strong> <EtiquetaRol rol={p.autor_rol} />
                    <small>{fechaHora(p.creado_en)}</small>
                  </div>
                  {Boolean(p.fijada) && <span className="chip"><Icono nombre="push_pin" /> Fijada</span>}
                  {info.moderador && (
                    <button className="btn-icono" title={p.fijada ? 'Desfijar' : 'Fijar arriba'}
                      onClick={() => accion(`/interaccion/publicaciones/${p.id}/fijar`, { method: 'PATCH' })}>
                      <Icono nombre={p.fijada ? 'location_off' : 'push_pin'} />
                    </button>
                  )}
                  {p.puede_borrar && (
                    <button className="btn-icono peligro" title="Borrar"
                      onClick={() => accion(`/interaccion/publicaciones/${p.id}`, { method: 'DELETE' }, '¿Borrar esta publicación y sus comentarios?')}>
                      <Icono nombre="delete" />
                    </button>
                  )}
                </header>
                <p className="publicacion-texto">{p.texto}</p>
                {p.archivo && (
                  <button className="adjunto" onClick={() => descargar(p.archivo, p.archivo_nombre).catch((e) => setError(e.message))}>
                    <Icono nombre="description" /> {p.archivo_nombre}
                  </button>
                )}

                <div className="comentarios">
                  {p.comentarios.map((c) => (
                    <div key={c.id} className="comentario">
                      <Avatar nombre={c.autor} rol={c.autor_rol} pequeno />
                      <div className="comentario-cuerpo">
                        <strong>{c.autor}</strong> <EtiquetaRol rol={c.autor_rol} />
                        <p>{c.texto}</p>
                        <small>{fechaHora(c.creado_en)}</small>
                      </div>
                      {c.puede_borrar && (
                        <button className="btn-icono pequeno" title="Borrar comentario"
                          onClick={() => accion(`/interaccion/comentarios/${c.id}`, { method: 'DELETE' }, '¿Borrar este comentario?')}>
                          <Icono nombre="close" />
                        </button>
                      )}
                    </div>
                  ))}
                  <Redactor
                    placeholder="Escribe un comentario para la clase…"
                    onEnviar={async (texto) => {
                      await api(`/interaccion/publicaciones/${p.id}/comentarios`, { method: 'POST', body: { texto } })
                      consulta.recargar()
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </ConDatos>
    </>
  )
}

function NuevaPublicacion({ cursoId, moderador, rol, onListo }) {
  const [texto, setTexto] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [fijada, setFijada] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [clave, setClave] = useState(0) // reinicia el input de archivo

  async function publicar(e) {
    e.preventDefault()
    setEnviando(true)
    setError('')
    const datos = new FormData()
    datos.append('texto', texto)
    if (archivo) datos.append('archivo', archivo)
    if (fijada) datos.append('fijada', 'true')
    try {
      await api(`/interaccion/cursos/${cursoId}/publicaciones`, { method: 'POST', body: datos })
      setTexto('')
      setArchivo(null)
      setFijada(false)
      setClave((k) => k + 1)
      onListo()
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="publicacion nueva" onSubmit={publicar}>
      <textarea
        rows={3}
        value={texto}
        maxLength={5000}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={rol === 'estudiante' ? 'Haz una pregunta o comparte algo con tu clase…' : 'Publica un aviso, una guía o una pregunta para la clase…'}
      />
      <div className="nueva-acciones">
        <label className="btn-secundario adjuntar">
          <Icono nombre="attach_file" /> {archivo ? archivo.name : 'Adjuntar archivo'}
          <input key={clave} type="file" hidden onChange={(e) => setArchivo(e.target.files[0] ?? null)} />
        </label>
        {moderador && (
          <label className="check">
            <input type="checkbox" checked={fijada} onChange={(e) => setFijada(e.target.checked)} /> Fijar arriba
          </label>
        )}
        <span className="crece" />
        <button className="btn-primario" disabled={!texto.trim() || enviando}>
          <Icono nombre="send" /> {enviando ? 'Publicando…' : 'Publicar'}
        </button>
      </div>
      <Aviso>{error}</Aviso>
    </form>
  )
}
