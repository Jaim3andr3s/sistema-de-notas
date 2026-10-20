// Avisos dentro de la plataforma (campanita) y, si hay servidor de correo configurado, también por email
import { pool } from './db.js'

let transporte
async function correo() {
  if (!process.env.SMTP_HOST) return null
  if (!transporte) {
    const { default: nodemailer } = await import('nodemailer')
    const puerto = Number(process.env.SMTP_PORT || 465)
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: puerto,
      secure: puerto === 465,
      auth: { user: process.env.SMTP_USUARIO, pass: process.env.SMTP_CLAVE },
    })
  }
  return transporte
}

async function enviarCorreos(ids, { titulo, texto }) {
  const t = await correo()
  if (!t) return
  const [destinos] = await pool.query("SELECT email FROM usuarios WHERE id IN (?) AND activo AND email IS NOT NULL AND email <> ''", [ids])
  const enlace = `${process.env.URL_PUBLICA || 'http://localhost:5173'}/plataforma`
  for (const { email } of destinos) {
    await t.sendMail({
      from: process.env.SMTP_REMITENTE || process.env.SMTP_USUARIO,
      to: email,
      subject: `IEMM · ${titulo}`,
      text: `${texto ?? ''}\n\nIngresa a la plataforma para ver el detalle: ${enlace}\n\n— Institución Educativa Máximo Mercado`,
    })
  }
}

// vista: sección del menú que se abre al tocar el aviso (actividades, notas, observador…)
// Nunca hace fallar la acción que la origina: los errores solo se registran en el log
export async function notificar(usuarios, { tipo, titulo, texto = null, vista = null }) {
  const ids = [...new Set(usuarios.filter(Boolean))]
  if (!ids.length) return
  try {
    await pool.query('INSERT INTO notificaciones (usuario_id, tipo, titulo, texto, vista) VALUES ?', [
      ids.map((id) => [id, tipo, titulo.slice(0, 150), texto?.slice(0, 300) ?? null, vista]),
    ])
  } catch (err) {
    console.error('No se pudo guardar la notificación:', err.message)
    return
  }
  enviarCorreos(ids, { titulo, texto }).catch((err) => console.error('No se pudo enviar el correo:', err.message))
}

// Estudiantes y sus acudientes a partir de matrículas
export async function familias(matriculaIds) {
  if (!matriculaIds.length) return []
  const [filas] = await pool.query(
    `SELECT e.usuario_id AS id FROM matriculas m JOIN estudiantes e ON e.id = m.estudiante_id WHERE m.id IN (?)
     UNION
     SELECT a.acudiente_id FROM matriculas m JOIN acudientes a ON a.estudiante_id = m.estudiante_id WHERE m.id IN (?)`,
    [matriculaIds, matriculaIds]
  )
  return filas.map((f) => f.id)
}

export async function familiasDeGrado(gradoId) {
  const [m] = await pool.query("SELECT id FROM matriculas WHERE grado_id = ? AND estado = 'activa'", [gradoId])
  return familias(m.map((x) => x.id))
}

// Solo los acudientes de unas matrículas (p. ej. para avisar una falla)
export async function acudientesDe(matriculaIds) {
  if (!matriculaIds.length) return []
  const [filas] = await pool.query(
    'SELECT a.acudiente_id AS id FROM matriculas m JOIN acudientes a ON a.estudiante_id = m.estudiante_id WHERE m.id IN (?)',
    [matriculaIds]
  )
  return filas.map((f) => f.id)
}

// '2026-10-24 23:59:00' → '24 oct'
export const fechaCorta = (valor) =>
  new Date(String(valor).replace(' ', 'T').slice(0, 10) + 'T12:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
