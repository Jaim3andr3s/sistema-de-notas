import { ErrorHttp } from './auth.js'

export function requerido(obj, campos) {
  const faltan = campos.filter((c) => obj[c] == null || obj[c] === '')
  if (faltan.length) throw new ErrorHttp(400, `Faltan campos: ${faltan.join(', ')}`)
}

export function entero(valor, nombre) {
  const n = Number(valor)
  if (!Number.isInteger(n) || n <= 0) throw new ErrorHttp(400, `${nombre} inválido`)
  return n
}

// Nota en escala 1.0 – 5.0 con un decimal; null significa "borrar nota"
export function nota(valor) {
  if (valor === null || valor === '') return null
  const n = Number(valor)
  if (!Number.isFinite(n) || n < 1 || n > 5 || Math.round(n * 10) !== n * 10) {
    throw new ErrorHttp(400, `Nota inválida: ${valor}. Debe estar entre 1.0 y 5.0 con un decimal`)
  }
  return n
}
