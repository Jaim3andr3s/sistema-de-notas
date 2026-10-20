// Acudientes (padres de familia): consultan todo lo de sus hijos, sin poder modificar nada
import { Router } from 'express'
import { pool } from '../db.js'
import { autenticar, permitir, ErrorHttp } from '../auth.js'
import { entero } from '../validar.js'
import { vistasEstudiante } from './estudiante.js'

const router = Router()
router.use(autenticar, permitir('acudiente'))

router.get('/hijos', async (req, res) => {
  const [filas] = await pool.query(
    `SELECT u.id, u.nombres, u.apellidos, a.parentesco,
            (SELECT g.nombre FROM matriculas m JOIN grados g ON g.id = m.grado_id
              WHERE m.estudiante_id = e.id ORDER BY m.anio DESC LIMIT 1) AS grado
       FROM acudientes a
       JOIN estudiantes e ON e.id = a.estudiante_id
       JOIN usuarios u    ON u.id = e.usuario_id
      WHERE a.acudiente_id = ? AND u.activo
      ORDER BY u.nombres`,
    [req.usuario.id]
  )
  res.json(filas)
})

// /api/acudiente/hijos/:hijo/... responde lo mismo que /api/estudiante/... para ese hijo
router.use('/hijos/:hijo', async (req, res, next) => {
  if (req.method !== 'GET') throw new ErrorHttp(403, 'Los acudientes pueden consultar, pero las entregas y descargos los hace el estudiante')
  const hijo = entero(req.params.hijo, 'Estudiante')
  const [[vinculo]] = await pool.query(
    'SELECT 1 FROM acudientes a JOIN estudiantes e ON e.id = a.estudiante_id WHERE a.acudiente_id = ? AND e.usuario_id = ?',
    [req.usuario.id, hijo]
  )
  if (!vinculo) throw new ErrorHttp(404, 'Estudiante no encontrado')
  req.estudianteUid = hijo
  next()
}, vistasEstudiante)

export default router
