// Códigos de verificación del carnet y las constancias: el número de matrícula firmado,
// para que nadie pueda inventar uno válido
import { createHmac, timingSafeEqual } from 'node:crypto'

const clave = () => process.env.VERIFICACION_SECRET || process.env.JWT_SECRET
const firma = (id) => createHmac('sha256', clave()).update(`matricula:${id}`).digest('hex').slice(0, 16)

export const codigoMatricula = (id) => `${id}-${firma(id)}`

export function matriculaDeCodigo(codigo) {
  const m = /^(\d+)-([a-f0-9]{16})$/.exec(String(codigo))
  if (!m) return null
  return timingSafeEqual(Buffer.from(firma(m[1])), Buffer.from(m[2])) ? Number(m[1]) : null
}
