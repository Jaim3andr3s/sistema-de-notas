import { useState } from 'react'
import { api, guardarToken } from './api.js'

const ROLES = [
  { id: 'estudiante', nombre: 'Estudiante' },
  { id: 'docente', nombre: 'Docente' },
  { id: 'administrador', nombre: 'Administrador' },
]

// Cuentas demo creadas por `npm run db:setup` en el backend
const DEMO = { estudiante: '1111111111', docente: '2222222222', administrador: '3333333333' }
const CLAVE_DEMO = 'demo1234'

export default function Login({ onLogin }) {
  const [rol, setRol] = useState(ROLES[0].id)
  const [documento, setDocumento] = useState('')
  const [clave, setClave] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function entrar(doc, pass) {
    setError('')
    if (!doc.trim() || !pass) {
      setError('Ingresa tu documento y contraseña.')
      return
    }
    setCargando(true)
    try {
      const { token, usuario } = await api('/auth/login', { method: 'POST', body: { documento: doc.trim(), clave: pass, rol } })
      guardarToken(token)
      onLogin(usuario)
    } catch (err) {
      setError(err.message)
      setCargando(false)
    }
  }

  function usarDemo() {
    setDocumento(DEMO[rol])
    setClave(CLAVE_DEMO)
    entrar(DEMO[rol], CLAVE_DEMO)
  }

  return (
    <div className="login-page">
      <div className="franjas" aria-hidden="true">
        <span className="franja amarilla" />
        <span className="franja azul" />
        <span className="franja roja" />
      </div>

      <form className="login-card" onSubmit={(e) => { e.preventDefault(); entrar(documento, clave) }} noValidate>
        <img src="/escudo.jpeg" alt="Escudo Institución Educativa Máximo Mercado" className="escudo" />

        <h1 className="titulo">Sistema de Notas</h1>
        <p className="subtitulo">Institución Educativa Máximo Mercado</p>
        <p className="lema">Estudio · Libertad · Paz</p>

        <div className="roles" role="tablist">
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={rol === r.id}
              className={rol === r.id ? 'rol activo' : 'rol'}
              onClick={() => setRol(r.id)}
            >
              {r.nombre}
            </button>
          ))}
        </div>

        <label className="campo">
          <span>Documento de identidad</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="username"
            placeholder="Ej: 1001234567"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
          />
        </label>

        <label className="campo">
          <span>Contraseña</span>
          <div className="input-clave">
            <input
              type={verClave ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
            <button
              type="button"
              className="ver-clave"
              onClick={() => setVerClave((v) => !v)}
              aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {verClave ? 'Ocultar' : 'Ver'}
            </button>
          </div>
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn-primario" disabled={cargando}>
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>

        <button type="button" className="btn-demo" onClick={usarDemo} disabled={cargando}>
          Entrar con cuenta demo de {ROLES.find((r) => r.id === rol).nombre}
        </button>

        <p className="olvido-texto">¿Olvidaste tu contraseña? Comunícate con coordinación académica.</p>
      </form>

      <footer className="pie">© {new Date().getFullYear()} IEMM · Sistema de Notas</footer>
    </div>
  )
}
