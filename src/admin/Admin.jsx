import { useEffect, useState } from 'react'
import Layout from '../componentes/Layout.jsx'
import { Caja, ConDatos, Nota, Icono, Modal, Campo, Aviso, Vacio, useApi } from '../componentes/ui.jsx'
import { Consolidado, Boletines } from '../compartido/Reportes.jsx'
import Observador from '../compartido/Observador.jsx'
import Perfil from '../compartido/Perfil.jsx'
import SitioWeb from './SitioWeb.jsx'
import Mensajes from '../compartido/Mensajes.jsx'
import Docentes from './Docentes.jsx'
import { api } from '../api.js'
import { ROLES, fecha, hoy } from '../util.js'

const MENU = [
  { id: 'inicio', nombre: 'Inicio', icono: 'dashboard' },
  { id: 'docentes', nombre: 'Equipo docente', icono: 'badge' },
  { id: 'usuarios', nombre: 'Usuarios', icono: 'group' },
  { id: 'academico', nombre: 'Grados y asignaturas', icono: 'school' },
  { id: 'periodos', nombre: 'Periodos', icono: 'date_range' },
  { id: 'consolidados', nombre: 'Consolidados', icono: 'table_chart' },
  { id: 'boletines', nombre: 'Boletines', icono: 'description' },
  { id: 'observador', nombre: 'Observador', icono: 'fact_check' },
  { id: 'anuncios', nombre: 'Anuncios', icono: 'campaign' },
  { id: 'mensajes', nombre: 'Mensajes', icono: 'chat' },
  { id: 'sitio', nombre: 'Sitio web', icono: 'language' },
  { id: 'perfil', nombre: 'Mi perfil', icono: 'person' },
]

export default function Admin({ usuario, onSalir }) {
  const [vista, setVista] = useState('inicio')
  const VISTAS = {
    inicio: <Inicio ir={setVista} />,
    docentes: <Docentes />,
    usuarios: <Usuarios />,
    academico: <Academico />,
    periodos: <Periodos />,
    consolidados: <Consolidado />,
    boletines: <Boletines />,
    observador: <Observador usuario={usuario} />,
    anuncios: <Anuncios />,
    mensajes: <Mensajes usuario={usuario} />,
    sitio: <SitioWeb />,
    perfil: <Perfil usuario={usuario} />,
  }
  return (
    <Layout menu={MENU} vista={vista} onVista={setVista} usuario={usuario} onSalir={onSalir}>
      {VISTAS[vista]}
    </Layout>
  )
}

// Ejecuta una acción de la API y devuelve el error como texto
function useAccion() {
  const [msg, setMsg] = useState({ tipo: '', texto: '' })
  async function ejecutar(fn, exito) {
    try {
      await fn()
      setMsg({ tipo: 'exito', texto: exito })
      return true
    } catch (err) {
      setMsg({ tipo: 'error', texto: err.message })
      return false
    }
  }
  return { msg, ejecutar, limpiar: () => setMsg({ tipo: '', texto: '' }) }
}

function Inicio({ ir }) {
  const consulta = useApi('/admin/estadisticas')
  return (
    <ConDatos consulta={consulta}>
      {(e) => (
        <>
          <section className="tarjetas">
            <div className="tarjeta azul"><Icono nombre="groups" /><span>Estudiantes activos</span><strong>{e.usuarios.estudiante ?? 0}</strong></div>
            <div className="tarjeta amarilla"><Icono nombre="co_present" /><span>Docentes</span><strong>{e.usuarios.docente ?? 0}</strong></div>
            <div className="tarjeta roja"><Icono nombre="report" /><span>Anotaciones de convivencia</span><strong>{e.observaciones.convivencia}</strong></div>
            <div className="tarjeta blanca"><Icono nombre="assignment" /><span>Actividades publicadas</span><strong>{e.actividades.actividades}</strong></div>
          </section>

          <div className="columnas">
            <Caja titulo={`Rendimiento por periodo · ${e.anio}`}>
              <ul className="barras">
                {e.por_periodo.map((p) => (
                  <li key={p.id}>
                    <span>{p.nombre} {p.cerrado ? '🔒' : ''}</span>
                    <div className="barra-fondo"><div className="barra-valor" style={{ width: `${((p.promedio ?? 0) / 5) * 100}%` }} /></div>
                    <Nota valor={p.promedio} />
                  </li>
                ))}
              </ul>
              <p className="texto-suave">Promedio institucional de todas las notas registradas en cada periodo.</p>
            </Caja>
            <Caja titulo="Grados" acciones={<button className="enlace" onClick={() => ir('consolidados')}>Ver consolidados</button>}>
              <div className="tabla-scroll">
                <table className="tabla">
                  <thead><tr><th>Grado</th><th>Estudiantes</th><th>Promedio</th><th>Con notas en Bajo</th></tr></thead>
                  <tbody>
                    {e.por_grado.map((g) => (
                      <tr key={g.id}>
                        <td><strong>{g.nombre}</strong></td>
                        <td>{g.estudiantes}</td>
                        <td><Nota valor={g.promedio} /></td>
                        <td>{g.en_riesgo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Caja>
          </div>
        </>
      )}
    </ConDatos>
  )
}

// ---------- Usuarios ----------
const USUARIO_VACIO = { documento: '', nombres: '', apellidos: '', rol: 'estudiante', clave: '', email: '', telefono: '', grado_id: '', acudiente_nombre: '', acudiente_telefono: '' }

function Usuarios() {
  const [rol, setRol] = useState('')
  const [q, setQ] = useState('')
  const [buscar, setBuscar] = useState('')
  const consulta = useApi(`/admin/usuarios?rol=${rol}&q=${encodeURIComponent(buscar)}`)
  const [nuevo, setNuevo] = useState(false)
  const [clave, setClave] = useState(null)
  const accion = useAccion()

  useEffect(() => {
    const t = setTimeout(() => setBuscar(q), 300)
    return () => clearTimeout(t)
  }, [q])

  async function alternar(u) {
    if (await accion.ejecutar(() => api(`/admin/usuarios/${u.id}`, { method: 'PATCH', body: { activo: !u.activo } }), u.activo ? 'Usuario desactivado' : 'Usuario activado')) {
      consulta.recargar()
    }
  }

  return (
    <Caja
      titulo="Usuarios"
      acciones={
        <>
          <input className="buscador" placeholder="Buscar por nombre o documento…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-primario" onClick={() => setNuevo(true)}><Icono nombre="person_add" /> Nuevo</button>
        </>
      }
    >
      <div className="pestanas">
        {[['', 'Todos'], ...Object.entries(ROLES)].map(([k, v]) => (
          <button key={k} className={rol === k ? 'activa' : ''} onClick={() => setRol(k)}>{v}</button>
        ))}
      </div>
      <Aviso tipo={accion.msg.tipo}>{accion.msg.texto}</Aviso>
      <ConDatos consulta={consulta}>
        {(lista) => lista.length === 0 ? <Vacio icono="person_search">No se encontraron usuarios.</Vacio> : (
          <div className="tabla-scroll">
            <table className="tabla">
              <thead><tr><th>Nombre</th><th>Documento</th><th>Rol</th><th>Grado</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {lista.map((u) => (
                  <tr key={u.id} className={u.activo ? '' : 'inactivo'}>
                    <td><strong>{u.apellidos} {u.nombres}</strong>{u.email && <small>{u.email}</small>}</td>
                    <td>{u.documento}</td>
                    <td>{ROLES[u.rol]}</td>
                    <td>{u.grado ?? '—'}</td>
                    <td><span className={u.activo ? 'chip ok' : 'chip alerta'}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td className="acciones-fila">
                      <button className="btn-icono" title="Restablecer contraseña" onClick={() => setClave(u)}><Icono nombre="key" /></button>
                      <button className="btn-icono" title={u.activo ? 'Desactivar' : 'Activar'} onClick={() => alternar(u)}>
                        <Icono nombre={u.activo ? 'block' : 'check_circle'} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConDatos>
      {nuevo && <NuevoUsuario onCerrar={(ok) => { setNuevo(false); if (ok) consulta.recargar() }} />}
      {clave && <RestablecerClave usuario={clave} onCerrar={() => setClave(null)} />}
    </Caja>
  )
}

function NuevoUsuario({ onCerrar }) {
  const [f, setF] = useState(USUARIO_VACIO)
  const grados = useApi('/admin/grados')
  const accion = useAccion()
  const cambiar = (campo) => (e) => setF({ ...f, [campo]: e.target.value })

  async function guardar(e) {
    e.preventDefault()
    if (await accion.ejecutar(() => api('/admin/usuarios', { method: 'POST', body: { ...f, grado_id: f.grado_id || null } }), 'Usuario creado')) onCerrar(true)
  }

  return (
    <Modal titulo="Nuevo usuario" onCerrar={() => onCerrar(false)}>
      <form className="form" onSubmit={guardar}>
        <div className="form-fila">
          <Campo etiqueta="Rol">
            <select value={f.rol} onChange={cambiar('rol')}>
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Documento"><input value={f.documento} onChange={cambiar('documento')} required /></Campo>
        </div>
        <div className="form-fila">
          <Campo etiqueta="Nombres"><input value={f.nombres} onChange={cambiar('nombres')} required /></Campo>
          <Campo etiqueta="Apellidos"><input value={f.apellidos} onChange={cambiar('apellidos')} required /></Campo>
        </div>
        <div className="form-fila">
          <Campo etiqueta="Correo (opcional)"><input type="email" value={f.email} onChange={cambiar('email')} /></Campo>
          <Campo etiqueta="Teléfono (opcional)"><input value={f.telefono} onChange={cambiar('telefono')} /></Campo>
        </div>
        <Campo etiqueta="Contraseña inicial" ayuda="Mínimo 8 caracteres. El usuario puede cambiarla desde su perfil.">
          <input value={f.clave} onChange={cambiar('clave')} minLength={8} required />
        </Campo>
        {f.rol === 'estudiante' && (
          <>
            <Campo etiqueta="Matricular en el grado">
              <select value={f.grado_id} onChange={cambiar('grado_id')}>
                <option value="">Sin matrícula por ahora</option>
                {grados.datos?.map((g) => <option key={g.id} value={g.id}>{g.nombre} · {g.anio}</option>)}
              </select>
            </Campo>
            <div className="form-fila">
              <Campo etiqueta="Nombre del acudiente"><input value={f.acudiente_nombre} onChange={cambiar('acudiente_nombre')} /></Campo>
              <Campo etiqueta="Teléfono del acudiente"><input value={f.acudiente_telefono} onChange={cambiar('acudiente_telefono')} /></Campo>
            </div>
          </>
        )}
        <Aviso tipo={accion.msg.tipo}>{accion.msg.texto}</Aviso>
        <div className="form-acciones">
          <button type="button" className="btn-secundario" onClick={() => onCerrar(false)}>Cancelar</button>
          <button className="btn-primario">Crear usuario</button>
        </div>
      </form>
    </Modal>
  )
}

function RestablecerClave({ usuario, onCerrar }) {
  const [clave, setClave] = useState('')
  const accion = useAccion()
  return (
    <Modal titulo={`Restablecer contraseña · ${usuario.nombres} ${usuario.apellidos}`} onCerrar={onCerrar} ancho={440}>
      <form className="form" onSubmit={async (e) => {
        e.preventDefault()
        await accion.ejecutar(() => api(`/admin/usuarios/${usuario.id}`, { method: 'PATCH', body: { clave } }), 'Contraseña actualizada')
      }}>
        <Campo etiqueta="Nueva contraseña" ayuda="Mínimo 8 caracteres">
          <input value={clave} onChange={(e) => setClave(e.target.value)} minLength={8} required />
        </Campo>
        <Aviso tipo={accion.msg.tipo}>{accion.msg.texto}</Aviso>
        <div className="form-acciones">
          <button type="button" className="btn-secundario" onClick={onCerrar}>Cerrar</button>
          <button className="btn-primario">Guardar</button>
        </div>
      </form>
    </Modal>
  )
}

// ---------- Grados, asignaturas y carga académica ----------
function Academico() {
  const grados = useApi('/admin/grados')
  const asignaturas = useApi('/admin/asignaturas')
  const docentes = useApi('/admin/usuarios?rol=docente')
  const [gradoId, setGradoId] = useState(null)
  const cargas = useApi(gradoId ? `/admin/grados/${gradoId}/cargas` : null)
  const [nuevoGrado, setNuevoGrado] = useState(null)
  const [nuevaAsig, setNuevaAsig] = useState({ nombre: '', area: '' })
  const [nuevaCarga, setNuevaCarga] = useState({ asignatura_id: '', docente_id: '', intensidad_horaria: 1 })
  const accion = useAccion()

  useEffect(() => {
    if (!gradoId && grados.datos?.length) setGradoId(grados.datos[0].id)
  }, [grados.datos, gradoId])

  const libres = asignaturas.datos?.filter((a) => !cargas.datos?.some((c) => c.asignatura === a.nombre)) ?? []
  const listaDocentes = docentes.datos?.filter((d) => d.activo) ?? []

  async function cambiarDocente(carga, docenteId) {
    if (await accion.ejecutar(() => api(`/admin/cargas/${carga.id}`, { method: 'PATCH', body: { docente_id: docenteId ? Number(docenteId) : null } }), 'Docente asignado')) cargas.recargar()
  }

  async function agregarCarga(e) {
    e.preventDefault()
    const ok = await accion.ejecutar(() => api('/admin/cargas', {
      method: 'POST',
      body: { grado_id: gradoId, asignatura_id: Number(nuevaCarga.asignatura_id), docente_id: nuevaCarga.docente_id ? Number(nuevaCarga.docente_id) : null, intensidad_horaria: Number(nuevaCarga.intensidad_horaria) },
    }), 'Asignatura agregada al grado')
    if (ok) { setNuevaCarga({ asignatura_id: '', docente_id: '', intensidad_horaria: 1 }); cargas.recargar() }
  }

  async function crearAsignatura(e) {
    e.preventDefault()
    if (await accion.ejecutar(() => api('/admin/asignaturas', { method: 'POST', body: nuevaAsig }), 'Asignatura creada')) {
      setNuevaAsig({ nombre: '', area: '' })
      asignaturas.recargar()
    }
  }

  async function crearGrado(e) {
    e.preventDefault()
    const ok = await accion.ejecutar(() => api('/admin/grados', {
      method: 'POST', body: { ...nuevoGrado, nivel: Number(nuevoGrado.nivel), anio: Number(nuevoGrado.anio), director_id: nuevoGrado.director_id || null },
    }), 'Grado creado')
    if (ok) { setNuevoGrado(null); grados.recargar() }
  }

  const grado = grados.datos?.find((g) => g.id === gradoId)
  return (
    <>
      <Aviso tipo={accion.msg.tipo}>{accion.msg.texto}</Aviso>
      <div className="columnas columnas-invertidas">
        <Caja titulo="Grados" acciones={<button className="btn-primario" onClick={() => setNuevoGrado({ nombre: '', nivel: 6, jornada: 'Mañana', anio: new Date().getFullYear(), director_id: '' })}><Icono nombre="add" /> Nuevo</button>}>
          <ConDatos consulta={grados}>
            {(lista) => (
              <ul className="lista-seleccion">
                {lista.map((g) => (
                  <li key={g.id}>
                    <button className={g.id === gradoId ? 'activo' : ''} onClick={() => setGradoId(g.id)}>
                      <strong>{g.nombre} · {g.anio}</strong>
                      <small>{g.jornada} · {g.estudiantes} estudiantes · Dir. {g.director || '—'}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ConDatos>
        </Caja>

        <Caja titulo={grado ? `Carga académica · ${grado.nombre}` : 'Carga académica'}>
          <ConDatos consulta={cargas}>
            {(lista) => (
              <>
                <div className="tabla-scroll">
                  <table className="tabla">
                    <thead><tr><th>Asignatura</th><th>IH</th><th>Docente</th></tr></thead>
                    <tbody>
                      {lista.map((c) => (
                        <tr key={c.id}>
                          <td><strong>{c.asignatura}</strong></td>
                          <td>{c.ih}</td>
                          <td>
                            <select value={c.docente_id ?? ''} onChange={(e) => cambiarDocente(c, e.target.value)}>
                              <option value="">Sin asignar</option>
                              {listaDocentes.map((d) => <option key={d.id} value={d.id}>{d.nombres} {d.apellidos}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {libres.length > 0 && (
                  <form className="fila-form" onSubmit={agregarCarga}>
                    <select value={nuevaCarga.asignatura_id} onChange={(e) => setNuevaCarga({ ...nuevaCarga, asignatura_id: e.target.value })} required>
                      <option value="">Agregar asignatura…</option>
                      {libres.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                    <select value={nuevaCarga.docente_id} onChange={(e) => setNuevaCarga({ ...nuevaCarga, docente_id: e.target.value })}>
                      <option value="">Docente…</option>
                      {listaDocentes.map((d) => <option key={d.id} value={d.id}>{d.nombres} {d.apellidos}</option>)}
                    </select>
                    <input type="number" min="1" max="10" title="Intensidad horaria" className="input-nota" value={nuevaCarga.intensidad_horaria}
                      onChange={(e) => setNuevaCarga({ ...nuevaCarga, intensidad_horaria: e.target.value })} />
                    <button className="btn-secundario"><Icono nombre="add" /> Agregar</button>
                  </form>
                )}
              </>
            )}
          </ConDatos>
        </Caja>
      </div>

      <Caja titulo="Asignaturas de la institución">
        <ConDatos consulta={asignaturas}>
          {(lista) => (
            <div className="chips">
              {lista.map((a) => <span key={a.id} className="chip">{a.nombre}{a.area ? ` · ${a.area}` : ''}</span>)}
            </div>
          )}
        </ConDatos>
        <form className="fila-form" onSubmit={crearAsignatura}>
          <input placeholder="Nueva asignatura" value={nuevaAsig.nombre} onChange={(e) => setNuevaAsig({ ...nuevaAsig, nombre: e.target.value })} required />
          <input placeholder="Área (opcional)" value={nuevaAsig.area} onChange={(e) => setNuevaAsig({ ...nuevaAsig, area: e.target.value })} />
          <button className="btn-secundario"><Icono nombre="add" /> Crear</button>
        </form>
      </Caja>

      {nuevoGrado && (
        <Modal titulo="Nuevo grado" onCerrar={() => setNuevoGrado(null)} ancho={480}>
          <form className="form" onSubmit={crearGrado}>
            <div className="form-fila">
              <Campo etiqueta="Nombre" ayuda="Ej: 6°B"><input value={nuevoGrado.nombre} onChange={(e) => setNuevoGrado({ ...nuevoGrado, nombre: e.target.value })} required /></Campo>
              <Campo etiqueta="Nivel (0-11)"><input type="number" min="0" max="11" value={nuevoGrado.nivel} onChange={(e) => setNuevoGrado({ ...nuevoGrado, nivel: e.target.value })} /></Campo>
            </div>
            <div className="form-fila">
              <Campo etiqueta="Jornada">
                <select value={nuevoGrado.jornada} onChange={(e) => setNuevoGrado({ ...nuevoGrado, jornada: e.target.value })}>
                  <option>Mañana</option><option>Tarde</option><option>Única</option>
                </select>
              </Campo>
              <Campo etiqueta="Año"><input type="number" value={nuevoGrado.anio} onChange={(e) => setNuevoGrado({ ...nuevoGrado, anio: e.target.value })} /></Campo>
            </div>
            <Campo etiqueta="Director de grupo">
              <select value={nuevoGrado.director_id} onChange={(e) => setNuevoGrado({ ...nuevoGrado, director_id: e.target.value })}>
                <option value="">Sin asignar</option>
                {listaDocentes.map((d) => <option key={d.id} value={d.id}>{d.nombres} {d.apellidos}</option>)}
              </select>
            </Campo>
            <div className="form-acciones">
              <button type="button" className="btn-secundario" onClick={() => setNuevoGrado(null)}>Cancelar</button>
              <button className="btn-primario">Crear grado</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

// ---------- Periodos ----------
function Periodos() {
  const consulta = useApi('/admin/periodos')
  const accion = useAccion()
  const [nuevo, setNuevo] = useState(null)

  async function alternar(p) {
    const verbo = p.cerrado ? 'reabrir' : 'cerrar'
    if (!window.confirm(`¿Seguro que deseas ${verbo} el ${p.nombre} de ${p.anio}?${p.cerrado ? '' : ' Los docentes ya no podrán modificar notas ni actividades.'}`)) return
    if (await accion.ejecutar(() => api(`/admin/periodos/${p.id}`, { method: 'PATCH', body: { cerrado: !p.cerrado } }), `Periodo ${p.cerrado ? 'reabierto' : 'cerrado'}`)) consulta.recargar()
  }

  async function crear(e) {
    e.preventDefault()
    const ok = await accion.ejecutar(() => api('/admin/periodos', {
      method: 'POST', body: { ...nuevo, anio: Number(nuevo.anio), numero: Number(nuevo.numero), porcentaje: Number(nuevo.porcentaje) },
    }), 'Periodo creado')
    if (ok) { setNuevo(null); consulta.recargar() }
  }

  return (
    <Caja titulo="Periodos académicos" acciones={
      <button className="btn-primario" onClick={() => setNuevo({ anio: new Date().getFullYear() + 1, numero: 1, nombre: 'Periodo 1', porcentaje: 25, fecha_inicio: '', fecha_fin: '' })}>
        <Icono nombre="add" /> Nuevo
      </button>
    }>
      <Aviso tipo={accion.msg.tipo}>{accion.msg.texto}</Aviso>
      <ConDatos consulta={consulta}>
        {(lista) => (
          <div className="tabla-scroll">
            <table className="tabla">
              <thead><tr><th>Año</th><th>Periodo</th><th>Fechas</th><th>%</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id}>
                    <td>{p.anio}</td>
                    <td><strong>{p.nombre}</strong></td>
                    <td>{fecha(p.fecha_inicio)} – {fecha(p.fecha_fin)}</td>
                    <td>{p.porcentaje}%</td>
                    <td><span className={p.cerrado ? 'chip alerta' : 'chip ok'}>{p.cerrado ? 'Cerrado' : 'Abierto'}</span></td>
                    <td>
                      <button className="btn-secundario" onClick={() => alternar(p)}>
                        <Icono nombre={p.cerrado ? 'lock_open' : 'lock'} /> {p.cerrado ? 'Reabrir' : 'Cerrar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConDatos>
      {nuevo && (
        <Modal titulo="Nuevo periodo" onCerrar={() => setNuevo(null)} ancho={480}>
          <form className="form" onSubmit={crear}>
            <div className="form-fila">
              <Campo etiqueta="Año"><input type="number" value={nuevo.anio} onChange={(e) => setNuevo({ ...nuevo, anio: e.target.value })} /></Campo>
              <Campo etiqueta="Número (1-4)">
                <input type="number" min="1" max="4" value={nuevo.numero}
                  onChange={(e) => setNuevo({ ...nuevo, numero: e.target.value, nombre: `Periodo ${e.target.value}` })} />
              </Campo>
              <Campo etiqueta="Porcentaje"><input type="number" min="0" max="100" value={nuevo.porcentaje} onChange={(e) => setNuevo({ ...nuevo, porcentaje: e.target.value })} /></Campo>
            </div>
            <div className="form-fila">
              <Campo etiqueta="Inicio"><input type="date" value={nuevo.fecha_inicio} onChange={(e) => setNuevo({ ...nuevo, fecha_inicio: e.target.value })} required /></Campo>
              <Campo etiqueta="Fin"><input type="date" value={nuevo.fecha_fin} onChange={(e) => setNuevo({ ...nuevo, fecha_fin: e.target.value })} required /></Campo>
            </div>
            <div className="form-acciones">
              <button type="button" className="btn-secundario" onClick={() => setNuevo(null)}>Cancelar</button>
              <button className="btn-primario">Crear periodo</button>
            </div>
          </form>
        </Modal>
      )}
    </Caja>
  )
}

// ---------- Anuncios ----------
function Anuncios() {
  const consulta = useApi('/admin/anuncios')
  const grados = useApi('/admin/grados')
  const [f, setF] = useState({ titulo: '', texto: '', fecha: hoy(), grado_id: '', publico: false })
  const accion = useAccion()

  async function publicar(e) {
    e.preventDefault()
    if (await accion.ejecutar(() => api('/admin/anuncios', { method: 'POST', body: { ...f, grado_id: f.grado_id || null } }), 'Anuncio publicado')) {
      setF({ titulo: '', texto: '', fecha: hoy(), grado_id: '', publico: false })
      consulta.recargar()
    }
  }

  async function borrar(a) {
    if (!window.confirm(`¿Eliminar el anuncio "${a.titulo}"?`)) return
    if (await accion.ejecutar(() => api(`/admin/anuncios/${a.id}`, { method: 'DELETE' }), 'Anuncio eliminado')) consulta.recargar()
  }

  return (
    <div className="columnas">
      <Caja titulo="Publicar anuncio">
        <form className="form" onSubmit={publicar}>
          <Campo etiqueta="Título"><input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} required /></Campo>
          <Campo etiqueta="Mensaje"><textarea rows={4} value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} required /></Campo>
          <div className="form-fila">
            <Campo etiqueta="Fecha del evento"><input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} required /></Campo>
            <Campo etiqueta="Dirigido a">
              <select value={f.grado_id} onChange={(e) => setF({ ...f, grado_id: e.target.value })}>
                <option value="">Toda la institución</option>
                {grados.datos?.map((g) => <option key={g.id} value={g.id}>{g.nombre} · {g.anio}</option>)}
              </select>
            </Campo>
          </div>
          {!f.grado_id && (
            <label className="check">
              <input type="checkbox" checked={f.publico} onChange={(e) => setF({ ...f, publico: e.target.checked })} />
              Mostrar también en la agenda del sitio web
            </label>
          )}
          <Aviso tipo={accion.msg.tipo}>{accion.msg.texto}</Aviso>
          <div className="form-acciones"><button className="btn-primario">Publicar</button></div>
        </form>
      </Caja>
      <Caja titulo="Anuncios publicados">
        <ConDatos consulta={consulta}>
          {(lista) => lista.length === 0 ? <Vacio icono="campaign">No hay anuncios.</Vacio> : (
            <ul className="anuncios">
              {lista.map((a) => (
                <li key={a.id}>
                  <time>{fecha(a.fecha, { day: '2-digit', month: 'short' })}</time>
                  <div className="crece">
                    <strong>{a.titulo}</strong>
                    <p>{a.texto}</p>
                    <small className="texto-suave">{a.grado ?? 'Toda la institución'}{a.publico ? ' · Visible en el sitio web' : ''}</small>
                  </div>
                  <button className="btn-icono peligro" title="Eliminar" onClick={() => borrar(a)}><Icono nombre="delete" /></button>
                </li>
              ))}
            </ul>
          )}
        </ConDatos>
      </Caja>
    </div>
  )
}
