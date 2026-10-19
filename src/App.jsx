import { useState } from 'react'
import Login from './Login.jsx'

export default function App() {
  const [usuario, setUsuario] = useState(null)

  if (!usuario) return <Login onLogin={setUsuario} />

  return (
    <main className="bienvenida">
      <img src="/escudo.jpeg" alt="Escudo IEMM" className="bienvenida-escudo" />
      <h1>Bienvenido, {usuario.documento}</h1>
      <p>Ingresaste como <strong>{usuario.rol}</strong>.</p>
      <button className="btn-primario" onClick={() => setUsuario(null)}>
        Cerrar sesión
      </button>
    </main>
  )
}
