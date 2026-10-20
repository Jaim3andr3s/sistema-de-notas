// Copia de seguridad de la base de datos y de los archivos subidos. Uso: npm run db:respaldo
// En el servidor conviene programarla todos los días con cron (ver docs/DESPLIEGUE.md)
import 'dotenv/config'
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'

const raiz = path.resolve(import.meta.dirname, '..')
const carpeta = path.resolve(process.env.CARPETA_RESPALDOS || path.join(raiz, 'respaldos'))
const conservar = Number(process.env.RESPALDOS_A_CONSERVAR || 30)
const sello = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')
await mkdir(carpeta, { recursive: true })

function ejecutar(comando, args, destino, env = {}) {
  const proceso = spawn(comando, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'inherit'] })
  const fin = new Promise((ok, falla) => {
    proceso.on('error', falla)
    proceso.on('close', (codigo) => (codigo === 0 ? ok() : falla(new Error(`${comando} terminó con código ${codigo}`))))
  })
  return Promise.all([pipeline(proceso.stdout, createGzip(), createWriteStream(destino)), fin])
}

const base = path.join(carpeta, `${process.env.DB_NAME}-${sello}.sql.gz`)
await ejecutar(process.env.MYSQLDUMP || 'mysqldump', [
  '-h', process.env.DB_HOST, '-P', String(process.env.DB_PORT || 3306), '-u', process.env.DB_USER,
  '--single-transaction', '--routines', '--default-character-set=utf8mb4', process.env.DB_NAME,
], base, { MYSQL_PWD: process.env.DB_PASSWORD ?? '' })
console.log(`✓ Base de datos: ${base}`)

const archivos = path.join(carpeta, `archivos-${sello}.tar.gz`)
await ejecutar('tar', ['-cf', '-', '-C', raiz, 'uploads'], archivos)
console.log(`✓ Archivos subidos: ${archivos}`)

// Se conservan solo las copias más recientes
for (const prefijo of [`${process.env.DB_NAME}-`, 'archivos-']) {
  const viejos = (await readdir(carpeta)).filter((f) => f.startsWith(prefijo)).sort().slice(0, -conservar)
  for (const f of viejos) await rm(path.join(carpeta, f))
}
