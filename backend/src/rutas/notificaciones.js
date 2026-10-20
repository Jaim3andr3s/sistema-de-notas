import { Router } from 'express'
import { pool } from '../db.js'
import { autenticar } from '../auth.js'
import { entero } from '../validar.js'

const router = Router()
router.use(autenticar)

router.get('/', async (req, res) => {
  const [lista] = await pool.query(
    `SELECT id, tipo, titulo, texto, vista, leida_en, creado_en FROM notificaciones
      WHERE usuario_id = ? ORDER BY id DESC LIMIT 30`,
    [req.usuario.id]
  )
  const [[{ sin_leer }]] = await pool.query('SELECT COUNT(*) AS sin_leer FROM notificaciones WHERE usuario_id = ? AND leida_en IS NULL', [req.usuario.id])
  res.json({ sin_leer, lista })
})

router.post('/leidas', async (req, res) => {
  await pool.query('UPDATE notificaciones SET leida_en = NOW() WHERE usuario_id = ? AND leida_en IS NULL', [req.usuario.id])
  res.json({ ok: true })
})

router.post('/:id/leida', async (req, res) => {
  await pool.query('UPDATE notificaciones SET leida_en = NOW() WHERE id = ? AND usuario_id = ? AND leida_en IS NULL', [entero(req.params.id, 'Notificación'), req.usuario.id])
  res.json({ ok: true })
})

export default router
