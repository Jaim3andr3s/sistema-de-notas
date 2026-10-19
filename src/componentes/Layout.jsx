import { useState } from 'react'
import { Icono } from './ui.jsx'
import { ROLES, nombreCompleto } from '../util.js'

// Estructura común: menú lateral + barra superior + contenido
export default function Layout({ menu, vista, onVista, usuario, onSalir, children }) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const actual = menu.find((m) => m.id === vista)

  function ir(id) {
    onVista(id)
    setMenuAbierto(false)
    window.scrollTo(0, 0)
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
          {menu.map((item) => (
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
          <h1>{actual?.nombre}</h1>
          <div className="barra-usuario">
            <div className="barra-datos">
              <strong>{nombreCompleto(usuario)}</strong>
              <span>{ROLES[usuario.rol]} · Doc. {usuario.documento}</span>
            </div>
            <div className="avatar">{usuario.nombres[0]}</div>
          </div>
        </header>
        <main className="cuerpo">{children}</main>
      </div>
    </div>
  )
}
