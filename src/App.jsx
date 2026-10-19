import { useState } from 'react'
import Login from './Login.jsx'
import Panel from './Panel.jsx'

export default function App() {
  const [usuario, setUsuario] = useState(null)

  if (!usuario) return <Login onLogin={setUsuario} />

  return <Panel usuario={usuario} onSalir={() => setUsuario(null)} />
}
