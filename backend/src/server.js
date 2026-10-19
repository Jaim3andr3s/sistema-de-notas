import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { pool } from './db.js'
import { ErrorHttp } from './auth.js'
import rutasAuth from './rutas/auth.js'
import rutasEstudiante from './rutas/estudiante.js'
import rutasDocente from './rutas/docente.js'
import rutasAdmin from './rutas/admin.js'
import rutasReportes from './rutas/reportes.js'
import { autenticar } from './auth.js'
import { CARPETA_ARCHIVOS } from './archivos.js'

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en backend/.env')
  process.exit(1)
}

const app = express()
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/salud', async (req, res) => {
  await pool.query('SELECT 1')
  res.json({ ok: true })
})

app.use('/api/auth', rutasAuth)
app.use('/api/estudiante', rutasEstudiante)
app.use('/api/docente', rutasDocente)
app.use('/api/admin', rutasAdmin)
app.use('/api/reportes', rutasReportes)

// Adjuntos de actividades y entregas (nombres aleatorios generados al subir)
app.get('/api/archivos/:nombre', autenticar, (req, res) => {
  if (!/^[a-f0-9]{32}\.[a-z0-9]+$/.test(req.params.nombre)) throw new ErrorHttp(400, 'Archivo inválido')
  res.sendFile(req.params.nombre, { root: CARPETA_ARCHIVOS }, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'Archivo no encontrado' })
  })
})

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }))

// Express 5 envía aquí los errores de las rutas async
app.use((err, req, res, next) => {
  if (err instanceof ErrorHttp) return res.status(err.status).json({ error: err.message })
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) return res.status(400).json({ error: 'JSON inválido' })
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'El archivo supera el límite de 10 MB' })
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El registro ya existe' })
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'Hace referencia a un registro que no existe' })
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') return res.status(400).json({ error: 'Valor fuera del rango permitido' })
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

const puerto = Number(process.env.PORT || 4000)
app.listen(puerto, () => console.log(`API del Sistema de Notas en http://localhost:${puerto}`))
