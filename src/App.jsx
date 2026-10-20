import { useEffect, useState } from 'react'
import { api, guardarToken, hayToken } from './api.js'
import { Cargando } from './componentes/ui.jsx'
import Login from './Login.jsx'
import Sitio from './sitio/Sitio.jsx'
import Estudiante from './estudiante/Estudiante.jsx'
import Docente from './docente/Docente.jsx'
import Admin from './admin/Admin.jsx'
import Acudiente from './acudiente/Acudiente.jsx'

const PANELES = { estudiante: Estudiante, docente: Docente, administrador: Admin, acudiente: Acudiente }

// El sitio público vive en "/" y la plataforma académica en "/plataforma"
export default function App() {
  const ruta = window.location.pathname
  if (!ruta.startsWith('/plataforma')) return <Sitio ruta={ruta} />
  return <Plataforma />
}

function Plataforma() {
  const [usuario, setUsuario] = useState(null)
  const [restaurando, setRestaurando] = useState(hayToken())

  // Si quedó una sesión guardada, la recupera
  useEffect(() => {
    document.title = 'Plataforma · IEMM'
    if (!hayToken()) return
    api('/auth/yo')
      .then(setUsuario)
      .catch(() => guardarToken(null))
      .finally(() => setRestaurando(false))
  }, [])

  useEffect(() => {
    const vencida = () => setUsuario(null)
    window.addEventListener('sesion-vencida', vencida)
    return () => window.removeEventListener('sesion-vencida', vencida)
  }, [])

  function salir() {
    guardarToken(null)
    setUsuario(null)
  }

  if (restaurando) return <div className="pantalla-carga"><Cargando /></div>
  if (!usuario) return <Login onLogin={setUsuario} />

  const Panel = PANELES[usuario.rol]
  return <Panel usuario={usuario} onSalir={salir} />
}
