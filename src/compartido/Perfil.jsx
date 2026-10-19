import { useState } from 'react'
import { api } from '../api.js'
import { Caja, Campo, Aviso } from '../componentes/ui.jsx'
import { ROLES, nombreCompleto } from '../util.js'

export default function Perfil({ usuario, extra }) {
  const [f, setF] = useState({ actual: '', nueva: '', repetir: '' })
  const [msg, setMsg] = useState({ tipo: '', texto: '' })

  async function cambiar(e) {
    e.preventDefault()
    if (f.nueva !== f.repetir) return setMsg({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden' })
    try {
      await api('/auth/cambiar-clave', { method: 'POST', body: { actual: f.actual, nueva: f.nueva } })
      setF({ actual: '', nueva: '', repetir: '' })
      setMsg({ tipo: 'exito', texto: 'Contraseña actualizada' })
    } catch (err) {
      setMsg({ tipo: 'error', texto: err.message })
    }
  }

  return (
    <div className="columnas">
      <Caja titulo="Mis datos">
        <dl className="perfil">
          <dt>Nombre</dt><dd>{nombreCompleto(usuario)}</dd>
          <dt>Documento</dt><dd>{usuario.documento}</dd>
          <dt>Rol</dt><dd>{ROLES[usuario.rol]}</dd>
          {usuario.email && <><dt>Correo</dt><dd>{usuario.email}</dd></>}
          {extra}
        </dl>
      </Caja>
      <Caja titulo="Cambiar contraseña">
        <form className="form" onSubmit={cambiar}>
          <Campo etiqueta="Contraseña actual">
            <input type="password" value={f.actual} onChange={(e) => setF({ ...f, actual: e.target.value })} required />
          </Campo>
          <Campo etiqueta="Nueva contraseña" ayuda="Mínimo 8 caracteres">
            <input type="password" minLength={8} value={f.nueva} onChange={(e) => setF({ ...f, nueva: e.target.value })} required />
          </Campo>
          <Campo etiqueta="Repite la nueva contraseña">
            <input type="password" value={f.repetir} onChange={(e) => setF({ ...f, repetir: e.target.value })} required />
          </Campo>
          <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>
          <div className="form-acciones">
            <button className="btn-primario">Actualizar contraseña</button>
          </div>
        </form>
      </Caja>
    </div>
  )
}
