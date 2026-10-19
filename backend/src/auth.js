import jwt from 'jsonwebtoken'

export class ErrorHttp extends Error {
  constructor(status, mensaje) {
    super(mensaje)
    this.status = status
  }
}

export function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, rol: usuario.rol, documento: usuario.documento },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRA || '8h' }
  )
}

// Exige un token válido en "Authorization: Bearer <token>"
export function autenticar(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ')
  if (tipo !== 'Bearer' || !token) throw new ErrorHttp(401, 'Sesión requerida')
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    throw new ErrorHttp(401, 'Sesión vencida o inválida')
  }
  next()
}

export function permitir(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) throw new ErrorHttp(403, 'No tienes permiso para esta acción')
    next()
  }
}
