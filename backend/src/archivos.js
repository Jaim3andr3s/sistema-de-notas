import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import { ErrorHttp } from './auth.js'

export const CARPETA_ARCHIVOS = path.resolve(import.meta.dirname, '..', 'uploads')
mkdirSync(CARPETA_ARCHIVOS, { recursive: true })

const PERMITIDAS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.jpg', '.jpeg', '.png', '.zip']

// Nombre aleatorio en disco; el nombre original se guarda en la base para mostrarlo
export const subir = multer({
  storage: multer.diskStorage({
    destination: CARPETA_ARCHIVOS,
    filename: (req, file, cb) => cb(null, randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (PERMITIDAS.includes(path.extname(file.originalname).toLowerCase())) cb(null, true)
    else cb(new ErrorHttp(400, `Tipo de archivo no permitido. Usa: ${PERMITIDAS.join(' ')}`))
  },
})
