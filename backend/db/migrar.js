// Aplica los cambios de esquema pendientes sin borrar datos. Uso: npm run db:migrate
// Cada cambio nuevo va en db/migraciones/NNN_descripcion.sql (y también en schema.sql para instalaciones nuevas)
import 'dotenv/config'
import { readFile, readdir } from 'node:fs/promises'
import mysql from 'mysql2/promise'

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
})

await conn.query(`CREATE TABLE IF NOT EXISTS migraciones (
  nombre VARCHAR(150) PRIMARY KEY,
  aplicada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

const [hechas] = await conn.query('SELECT nombre FROM migraciones')
const aplicadas = new Set(hechas.map((m) => m.nombre))
const archivos = (await readdir(new URL('./migraciones/', import.meta.url))).filter((f) => f.endsWith('.sql')).sort()
const pendientes = archivos.filter((f) => !aplicadas.has(f))

if (!pendientes.length) console.log('✓ La base ya está al día')
for (const nombre of pendientes) {
  try {
    await conn.query(await readFile(new URL(`./migraciones/${nombre}`, import.meta.url), 'utf8'))
    await conn.query('INSERT INTO migraciones (nombre) VALUES (?)', [nombre])
    console.log(`✓ ${nombre}`)
  } catch (err) {
    console.error(`✗ ${nombre}: ${err.message}`)
    console.error('Se detuvo la migración; corrige el error y vuelve a ejecutar npm run db:migrate')
    process.exitCode = 1
    break
  }
}
await conn.end()
