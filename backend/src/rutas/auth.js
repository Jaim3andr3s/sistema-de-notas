import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import { firmarToken, autenticar, ErrorHttp } from '../auth.js'
import { requerido } from '../validar.js'

const router = Router()

router.post('/login', async (req, res) => {
  requerido(req.body, ['documento', 'clave'])
  const { documento, clave, rol } = req.body

  const [[usuario]] = await pool.query(
    'SELECT id, documento, clave_hash, rol, nombres, apellidos, activo FROM usuarios WHERE documento = ?',
    [String(documento).trim()]
  )
  // Mismo mensaje si no existe o la clave falla, para no revelar qué documentos existen
  if (!usuario || !(await bcrypt.compare(String(clave), usuario.clave_hash))) {
    throw new ErrorHttp(401, 'Documento o contraseña incorrectos')
  }
  if (!usuario.activo) throw new ErrorHttp(403, 'Usuario inactivo, comunícate con la institución')
  if (rol && rol.toLowerCase() !== usuario.rol) {
    throw new ErrorHttp(403, `Este usuario no tiene acceso como ${rol}`)
  }

  delete usuario.clave_hash
  res.json({ token: firmarToken(usuario), usuario })
})

router.get('/yo', autenticar, async (req, res) => {
  const [[usuario]] = await pool.query(
    'SELECT id, documento, rol, nombres, apellidos, email, telefono FROM usuarios WHERE id = ? AND activo',
    [req.usuario.id]
  )
  if (!usuario) throw new ErrorHttp(401, 'Usuario no disponible')
  res.json(usuario)
})

router.post('/cambiar-clave', autenticar, async (req, res) => {
  requerido(req.body, ['actual', 'nueva'])
  const { actual, nueva } = req.body
  if (String(nueva).length < 8) throw new ErrorHttp(400, 'La nueva contraseña debe tener al menos 8 caracteres')

  const [[u]] = await pool.query('SELECT clave_hash FROM usuarios WHERE id = ?', [req.usuario.id])
  if (!(await bcrypt.compare(String(actual), u.clave_hash))) throw new ErrorHttp(400, 'La contraseña actual no es correcta')

  await pool.query('UPDATE usuarios SET clave_hash = ? WHERE id = ?', [await bcrypt.hash(String(nueva), 10), req.usuario.id])
  res.json({ ok: true })
})

export default router
