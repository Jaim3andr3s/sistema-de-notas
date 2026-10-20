// Consolidados, boletines y observador — compartidos por docentes y administrador
import { Router } from 'express'
import { pool } from '../db.js'
import { autenticar, permitir, ErrorHttp } from '../auth.js'
import { gradoPermitido, matriculaPermitida } from '../acceso.js'
import { consolidado, boletin } from '../academico.js'
import { entero, requerido } from '../validar.js'
import { notificar, familias } from '../notificaciones.js'

const router = Router()
router.use(autenticar, permitir('docente', 'administrador'))

const TIPOS_OBS = ['positiva', 'academica', 'convivencia', 'compromiso', 'citacion']
const TIPIFICACIONES = ['ninguna', 'tipo_i', 'tipo_ii', 'tipo_iii']

// Grados a los que tiene acceso el usuario
router.get('/grados', async (req, res) => {
  const esAdmin = req.usuario.rol === 'administrador'
  const [filas] = await pool.query(
    `SELECT g.id, g.nombre, g.jornada, g.anio, g.director_id = ? AS soy_director,
            (SELECT COUNT(*) FROM matriculas m WHERE m.grado_id = g.id AND m.estado = 'activa') AS estudiantes
       FROM grados g
      WHERE ? OR g.director_id = ? OR EXISTS (SELECT 1 FROM cargas c WHERE c.grado_id = g.id AND c.docente_id = ?)
      ORDER BY g.anio DESC, g.nivel, g.nombre`,
    [req.usuario.id, esAdmin, req.usuario.id, req.usuario.id]
  )
  res.json(filas)
})

router.get('/grados/:id/estudiantes', async (req, res) => {
  const grado = await gradoPermitido(req.usuario, entero(req.params.id, 'Grado'))
  const [filas] = await pool.query(
    `SELECT m.id AS matricula_id, u.documento, u.nombres, u.apellidos, s.acudiente_nombre, s.acudiente_telefono,
            (SELECT COUNT(*) FROM observaciones o WHERE o.matricula_id = m.id) AS observaciones
       FROM matriculas m
       JOIN estudiantes s ON s.id = m.estudiante_id
       JOIN usuarios u    ON u.id = s.usuario_id
      WHERE m.grado_id = ? AND m.estado = 'activa'
      ORDER BY u.apellidos, u.nombres`,
    [grado.id]
  )
  res.json({ grado, estudiantes: filas })
})

// ?periodo=<id> para un periodo; sin periodo = acumulado del año
router.get('/grados/:id/consolidado', async (req, res) => {
  const grado = await gradoPermitido(req.usuario, entero(req.params.id, 'Grado'))
  const periodo = req.query.periodo ? entero(req.query.periodo, 'Periodo') : null
  res.json(await consolidado(grado.id, periodo))
})

router.get('/boletin/:matricula', async (req, res) => {
  const m = await matriculaPermitida(req.usuario, entero(req.params.matricula, 'Matrícula'))
  res.json(await boletin(m.id, entero(req.query.periodo, 'Periodo')))
})

// ---------- Observador ----------
router.get('/observador/:matricula', async (req, res) => {
  const m = await matriculaPermitida(req.usuario, entero(req.params.matricula, 'Matrícula'))
  const [[estudiante]] = await pool.query(
    `SELECT u.documento, u.nombres, u.apellidos, g.nombre AS grado, s.acudiente_nombre, s.acudiente_telefono
       FROM matriculas m JOIN estudiantes s ON s.id = m.estudiante_id JOIN usuarios u ON u.id = s.usuario_id
       JOIN grados g ON g.id = m.grado_id WHERE m.id = ?`,
    [m.id]
  )
  const [observaciones] = await pool.query(
    `SELECT o.id, o.fecha, o.tipo, o.tipificacion, o.descripcion, o.accion, o.descargos, o.descargos_en,
            o.notificado_acudiente, o.autor_id, CONCAT(u.nombres, ' ', u.apellidos) AS autor
       FROM observaciones o LEFT JOIN usuarios u ON u.id = o.autor_id
      WHERE o.matricula_id = ? ORDER BY o.fecha DESC, o.id DESC`,
    [m.id]
  )
  res.json({ estudiante, observaciones })
})

function leerObservacion(body) {
  requerido(body, ['fecha', 'tipo', 'descripcion'])
  if (!TIPOS_OBS.includes(body.tipo)) throw new ErrorHttp(400, 'Tipo de observación inválido')
  const tipificacion = body.tipificacion || 'ninguna'
  if (!TIPIFICACIONES.includes(tipificacion)) throw new ErrorHttp(400, 'Tipificación inválida')
  return {
    fecha: body.fecha,
    tipo: body.tipo,
    tipificacion: body.tipo === 'convivencia' ? tipificacion : 'ninguna',
    descripcion: String(body.descripcion).trim(),
    accion: body.accion?.trim() || null,
    notificado_acudiente: Boolean(body.notificado_acudiente),
  }
}

router.post('/observador/:matricula', async (req, res) => {
  const m = await matriculaPermitida(req.usuario, entero(req.params.matricula, 'Matrícula'))
  const datos = leerObservacion(req.body)
  const [r] = await pool.query('INSERT INTO observaciones SET ?', [{ ...datos, matricula_id: m.id, autor_id: req.usuario.id }])
  notificar(await familias([m.id]), {
    tipo: 'observador',
    titulo: datos.tipo === 'positiva' ? 'Nuevo reconocimiento en el observador' : 'Nueva anotación en el observador',
    texto: datos.descripcion,
    vista: 'observador',
  })
  res.status(201).json({ id: r.insertId })
})

// Solo el autor (o el administrador) puede editar o borrar una observación
async function observacionPropia(usuario, id) {
  const [[o]] = await pool.query('SELECT id, autor_id, matricula_id FROM observaciones WHERE id = ?', [id])
  if (!o) throw new ErrorHttp(404, 'Observación no encontrada')
  if (usuario.rol !== 'administrador' && o.autor_id !== usuario.id) throw new ErrorHttp(403, 'Solo el autor puede modificar esta observación')
  return o
}

router.put('/observaciones/:id', async (req, res) => {
  const o = await observacionPropia(req.usuario, entero(req.params.id, 'Observación'))
  await pool.query('UPDATE observaciones SET ? WHERE id = ?', [leerObservacion(req.body), o.id])
  res.json({ ok: true })
})

router.delete('/observaciones/:id', async (req, res) => {
  const o = await observacionPropia(req.usuario, entero(req.params.id, 'Observación'))
  await pool.query('DELETE FROM observaciones WHERE id = ?', [o.id])
  res.json({ ok: true })
})

export default router
