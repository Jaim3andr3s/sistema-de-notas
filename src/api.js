const BASE = import.meta.env.VITE_API_URL || '/api'
const CLAVE_TOKEN = 'iemm_token'

function leerToken() {
  try {
    return localStorage.getItem(CLAVE_TOKEN)
  } catch {
    return null
  }
}

let token = leerToken()

export function guardarToken(nuevo) {
  token = nuevo
  try {
    if (nuevo) localStorage.setItem(CLAVE_TOKEN, nuevo)
    else localStorage.removeItem(CLAVE_TOKEN)
  } catch {
    // sin almacenamiento la sesión dura lo que dure la pestaña
  }
}

export const hayToken = () => Boolean(token)

// api('/ruta', { method, body })  — body JSON, o FormData para subir archivos
export async function api(ruta, { method = 'GET', body } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  let cuerpo
  if (body instanceof FormData) cuerpo = body
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    cuerpo = JSON.stringify(body)
  }

  let r
  try {
    r = await fetch(BASE + ruta, { method, headers, body: cuerpo })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }
  if (r.status === 401 && token) {
    guardarToken(null)
    window.dispatchEvent(new Event('sesion-vencida'))
  }
  const datos = r.headers.get('content-type')?.includes('application/json') ? await r.json() : null
  if (!r.ok) throw new Error(datos?.error || `Error ${r.status}`)
  return datos
}

// Los adjuntos requieren token, así que se descargan con fetch y se entregan como blob
export async function descargar(archivo, nombre) {
  const r = await fetch(`${BASE}/archivos/${archivo}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) throw new Error('No se pudo descargar el archivo')
  const url = URL.createObjectURL(await r.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = nombre || archivo
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
