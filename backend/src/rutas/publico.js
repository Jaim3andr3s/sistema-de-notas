// Endpoints sin sesión que consume el sitio web del colegio
import { Router } from 'express'
import { pool } from '../db.js'
import { ErrorHttp } from '../auth.js'
import { CARPETA_ARCHIVOS } from '../archivos.js'
import { entero, requerido } from '../validar.js'
import { matriculaDeCodigo } from '../verificacion.js'

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

// Verificación pública del carnet o de una constancia (lo que muestra el QR)
router.get('/verificar/:codigo', async (req, res) => {
  const id = matriculaDeCodigo(req.params.codigo)
  if (!id) throw new ErrorHttp(404, 'Código de verificación inválido')
  const [[m]] = await pool.query(
    `SELECT u.nombres, u.apellidos, u.documento, g.nombre AS grado, g.jornada, m.anio, m.estado
       FROM matriculas m JOIN estudiantes e ON e.id = m.estudiante_id JOIN usuarios u ON u.id = e.usuario_id JOIN grados g ON g.id = m.grado_id
      WHERE m.id = ?`,
    [id]
  )
  if (!m) throw new ErrorHttp(404, 'Código de verificación inválido')
  // El documento se muestra parcialmente para proteger los datos del estudiante
  res.json({ ...m, documento: `••••${m.documento.slice(-4)}` })
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

// Límite sencillo contra spam: 5 envíos por hora por IP en cada formulario
const envios = new Map()
function limitarEnvios(req, formulario) {
  const clave = `${formulario}:${req.ip}`
  const ahora = Date.now()
  const recientes = (envios.get(clave) ?? []).filter((t) => ahora - t < 3600_000)
  if (recientes.length >= 5) throw new ErrorHttp(429, 'Has enviado varios formularios. Intenta de nuevo más tarde.')
  envios.set(clave, [...recientes, ahora])
}

router.post('/contacto', async (req, res) => {

  requerido(req.body, ['nombre', 'asunto', 'mensaje'])
  const { nombre, correo, telefono, asunto, mensaje } = req.body
  if (!correo && !telefono) throw new ErrorHttp(400, 'Déjanos un correo o un teléfono para responderte')
  if (!req.body.acepta_datos) throw new ErrorHttp(400, 'Debes aceptar la política de tratamiento de datos')
  if (String(mensaje).length > 3000) throw new ErrorHttp(400, 'El mensaje es demasiado largo')
  limitarEnvios(req, 'contacto')

  await pool.query(
    'INSERT INTO mensajes_contacto (nombre, correo, telefono, asunto, mensaje) VALUES (?, ?, ?, ?, ?)',
    [String(nombre).trim().slice(0, 120), correo?.trim().slice(0, 120) || null, telefono?.trim().slice(0, 30) || null,
      String(asunto).trim().slice(0, 150), String(mensaje).trim()]
  )
  res.status(201).json({ ok: true })
})

// ---------- Transparencia ----------
router.get('/documentos', async (req, res) => {
  const [filas] = await pool.query(
    'SELECT id, titulo, descripcion, categoria, archivo, archivo_nombre, fecha FROM documentos WHERE publicado ORDER BY categoria, fecha DESC, id DESC'
  )
  res.json(filas)
})

router.get('/documentos/:archivo', async (req, res) => {
  const [[d]] = await pool.query('SELECT archivo_nombre FROM documentos WHERE archivo = ? AND publicado', [req.params.archivo])
  if (!d) throw new ErrorHttp(404, 'Documento no encontrado')
  res.set('Cache-Control', 'public, max-age=3600')
  res.download(req.params.archivo, d.archivo_nombre, { root: CARPETA_ARCHIVOS })
})

// ---------- Admisiones ----------
router.post('/preinscripciones', async (req, res) => {
  requerido(req.body, ['estudiante_nombre', 'grado_aspira', 'acudiente_nombre', 'acudiente_telefono'])
  if (!req.body.acepta_datos) throw new ErrorHttp(400, 'Debes aceptar la política de tratamiento de datos')
  if (req.body.fecha_nacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(req.body.fecha_nacimiento)) throw new ErrorHttp(400, 'Fecha de nacimiento inválida')
  limitarEnvios(req, 'preinscripcion')
  const texto = (campo, max) => (req.body[campo] ? String(req.body[campo]).trim().slice(0, max) || null : null)
  await pool.query('INSERT INTO preinscripciones SET ?', [{
    estudiante_nombre: texto('estudiante_nombre', 150),
    estudiante_documento: texto('estudiante_documento', 20),
    fecha_nacimiento: req.body.fecha_nacimiento || null,
    grado_aspira: texto('grado_aspira', 30),
    sede: texto('sede', 80),
    colegio_procedencia: texto('colegio_procedencia', 150),
    acudiente_nombre: texto('acudiente_nombre', 150),
    acudiente_telefono: texto('acudiente_telefono', 30),
    acudiente_correo: texto('acudiente_correo', 120),
    observaciones: texto('observaciones', 2000),
    acepta_datos_en: new Date(),
  }])
  res.status(201).json({ ok: true })
})

// ---------- Galería ----------
router.get('/galerias', async (req, res) => {
  const [filas] = await pool.query(
    `SELECT g.id, g.titulo, g.descripcion, g.fecha, COUNT(f.id) AS fotos,
            (SELECT archivo FROM galeria_fotos WHERE galeria_id = g.id ORDER BY orden, id LIMIT 1) AS portada
       FROM galerias g JOIN galeria_fotos f ON f.galeria_id = g.id
      WHERE g.publicada GROUP BY g.id ORDER BY g.fecha DESC`
  )
  res.json(filas)
})

router.get('/galerias/:id', async (req, res) => {
  const [[g]] = await pool.query('SELECT id, titulo, descripcion, fecha FROM galerias WHERE id = ? AND publicada', [entero(req.params.id, 'Álbum')])
  if (!g) throw new ErrorHttp(404, 'Álbum no encontrado')
  const [fotos] = await pool.query('SELECT id, archivo FROM galeria_fotos WHERE galeria_id = ? ORDER BY orden, id', [g.id])
  res.json({ ...g, fotos })
})

router.get('/fotos/:archivo', async (req, res) => {
  const [[f]] = await pool.query(
    'SELECT 1 FROM galeria_fotos f JOIN galerias g ON g.id = f.galeria_id WHERE f.archivo = ? AND g.publicada LIMIT 1',
    [req.params.archivo]
  )
  if (!f) throw new ErrorHttp(404, 'Foto no encontrada')
  res.set('Cache-Control', 'public, max-age=86400')
  res.sendFile(req.params.archivo, { root: CARPETA_ARCHIVOS })
})

export default router
