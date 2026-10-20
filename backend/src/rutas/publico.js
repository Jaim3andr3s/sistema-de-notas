// Endpoints sin sesión que consume el sitio web del colegio
import { Router } from 'express'
import { pool } from '../db.js'
import { ErrorHttp } from '../auth.js'
import { CARPETA_ARCHIVOS } from '../archivos.js'
import { entero, requerido } from '../validar.js'

const router = Router()

// Cifras para la portada
router.get('/cifras', async (req, res) => {
  const [[c]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM usuarios WHERE rol = 'estudiante' AND activo) AS estudiantes,
            (SELECT COUNT(*) FROM usuarios WHERE rol = 'docente' AND activo) AS docentes,
            (SELECT COUNT(*) FROM grados WHERE anio = (SELECT MAX(anio) FROM grados)) AS grados`
  )
  res.json(c)
})

router.get('/noticias', async (req, res) => {
  const limite = Math.min(Number(req.query.limite) || 9, 50)
  const [filas] = await pool.query(
    `SELECT id, titulo, resumen, categoria, imagen, fecha, destacada
       FROM noticias WHERE publicada AND (? IS NULL OR categoria = ?)
      ORDER BY destacada DESC, fecha DESC, id DESC LIMIT ?`,
    [req.query.categoria ?? null, req.query.categoria ?? null, limite]
  )
  res.json(filas)
})

router.get('/noticias/:id', async (req, res) => {
  const [[n]] = await pool.query(
    'SELECT id, titulo, resumen, contenido, categoria, imagen, fecha FROM noticias WHERE id = ? AND publicada',
    [entero(req.params.id, 'Noticia')]
  )
  if (!n) throw new ErrorHttp(404, 'Noticia no encontrada')
  res.json(n)
})

// Anuncios marcados como públicos desde el sistema de notas
router.get('/eventos', async (req, res) => {
  const [filas] = await pool.query(
    `SELECT id, titulo, texto, fecha FROM anuncios
      WHERE publico AND fecha >= CURDATE() - INTERVAL 7 DAY
      ORDER BY fecha LIMIT 6`
  )
  res.json(filas)
})

// Publicaciones de Facebook que el sitio muestra insertadas
router.get('/facebook', async (req, res) => {
  const [filas] = await pool.query('SELECT id, url FROM publicaciones_facebook ORDER BY id DESC LIMIT 6')
  res.json(filas)
})

// Solo se sirven imágenes asociadas a noticias publicadas
router.get('/imagenes/:nombre', async (req, res) => {
  const [[n]] = await pool.query('SELECT 1 FROM noticias WHERE imagen = ? AND publicada LIMIT 1', [req.params.nombre])
  if (!n) throw new ErrorHttp(404, 'Imagen no encontrada')
  res.set('Cache-Control', 'public, max-age=86400')
  res.sendFile(req.params.nombre, { root: CARPETA_ARCHIVOS })
})

// Límite sencillo contra spam: 5 mensajes por hora por IP
const envios = new Map()
router.post('/contacto', async (req, res) => {
  const ahora = Date.now()
  const recientes = (envios.get(req.ip) ?? []).filter((t) => ahora - t < 3600_000)
  if (recientes.length >= 5) throw new ErrorHttp(429, 'Has enviado varios mensajes. Intenta de nuevo más tarde.')

  requerido(req.body, ['nombre', 'asunto', 'mensaje'])
  const { nombre, correo, telefono, asunto, mensaje } = req.body
  if (!correo && !telefono) throw new ErrorHttp(400, 'Déjanos un correo o un teléfono para responderte')
  if (String(mensaje).length > 3000) throw new ErrorHttp(400, 'El mensaje es demasiado largo')

  await pool.query(
    'INSERT INTO mensajes_contacto (nombre, correo, telefono, asunto, mensaje) VALUES (?, ?, ?, ?, ?)',
    [String(nombre).trim().slice(0, 120), correo?.trim().slice(0, 120) || null, telefono?.trim().slice(0, 30) || null,
      String(asunto).trim().slice(0, 150), String(mensaje).trim()]
  )
  envios.set(req.ip, [...recientes, ahora])
  res.status(201).json({ ok: true })
})

export default router
