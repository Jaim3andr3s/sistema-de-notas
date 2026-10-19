import { useState } from 'react'

const ROLES = ['Estudiante', 'Docente', 'Administrador']

export default function Login({ onLogin }) {
  const [rol, setRol] = useState(ROLES[0])
  const [documento, setDocumento] = useState('')
  const [clave, setClave] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!documento.trim() || !clave) {
      setError('Ingresa tu documento y contraseña.')
      return
    }
    setCargando(true)
    // TODO: reemplazar por la llamada real al backend de autenticación
    await new Promise((r) => setTimeout(r, 800))
    setCargando(false)
    onLogin({ documento: documento.trim(), rol })
  }

  return (
    <div className="login-page">
      <div className="franjas" aria-hidden="true">
        <span className="franja amarilla" />
        <span className="franja azul" />
        <span className="franja roja" />
      </div>

      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <img src="/escudo.jpeg" alt="Escudo Institución Educativa Máximo Mercado" className="escudo" />

        <h1 className="titulo">Sistema de Notas</h1>
        <p className="subtitulo">Institución Educativa Máximo Mercado</p>
        <p className="lema">Estudio · Libertad · Paz</p>

        <div className="roles" role="tablist">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={rol === r}
              className={rol === r ? 'rol activo' : 'rol'}
              onClick={() => setRol(r)}
            >
              {r}
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

        <a href="#" className="olvido" onClick={(e) => e.preventDefault()}>
          ¿Olvidaste tu contraseña?
        </a>
      </form>

      <footer className="pie">© {new Date().getFullYear()} IEMM · Sistema de Notas</footer>
    </div>
  )
}
