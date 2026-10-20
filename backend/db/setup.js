// Crea la base de datos, las tablas y carga datos de prueba.
// OJO: borra y recrea todas las tablas. Uso: npm run db:setup
import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

const ANIO = 2026
const DB = process.env.DB_NAME
const CLAVE_DEMO = 'demo1234'

if (!/^\w+$/.test(DB || '')) throw new Error('DB_NAME inválido en .env')

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
})

await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
await conn.query(`USE \`${DB}\``)
await conn.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'))
console.log(`✓ Base "${DB}" y tablas creadas`)

// ---------- Datos de prueba ----------
const hashDemo = await bcrypt.hash(CLAVE_DEMO, 10)

async function insertar(tabla, fila) {
  const [r] = await conn.query(`INSERT INTO ${tabla} SET ?`, [fila])
  return r.insertId
}

const usuario = (documento, rol, nombres, apellidos, email = null) =>
  insertar('usuarios', { documento, clave_hash: hashDemo, rol, nombres, apellidos, email })

// Usuarios demo (uno por rol)
const adminId = await usuario('3333333333', 'administrador', 'Administrador', 'Demo', 'coordinacion@iemm.edu.co')
const docentes = { Demo: await usuario('2222222222', 'docente', 'Docente', 'Demo', 'docente.demo@iemm.edu.co') }

for (const [doc, nombres, apellidos] of [
  ['2000000002', 'Ana', 'Gómez'],
  ['2000000003', 'Laura', 'Díaz'],
  ['2000000004', 'Jorge', 'Castro'],
  ['2000000005', 'Pedro', 'Mejía'],
  ['2000000006', 'Luis', 'Torres'],
  ['2000000007', 'Sandra', 'Rojas'],
  ['2000000008', 'Rosa', 'Herrera'],
]) {
  docentes[apellidos] = await usuario(doc, 'docente', nombres, apellidos)
}

const g10a = await insertar('grados', { nombre: '10°A', nivel: 10, jornada: 'Mañana', anio: ANIO, director_id: docentes.Demo })
const g11a = await insertar('grados', { nombre: '11°A', nivel: 11, jornada: 'Mañana', anio: ANIO, director_id: docentes.Castro })

const periodos = []
for (const [numero, inicio, fin, cerrado] of [
  [1, '2026-01-26', '2026-04-03', true],
  [2, '2026-04-13', '2026-06-19', true],
  [3, '2026-07-06', '2026-09-18', true],
  [4, '2026-09-21', '2026-11-27', false],
]) {
  periodos.push(await insertar('periodos', {
    anio: ANIO, numero, nombre: `Periodo ${numero}`, porcentaje: 25, fecha_inicio: inicio, fecha_fin: fin, cerrado,
  }))
}
const P4 = periodos[3]

// asignatura, área, docente, intensidad horaria
const PLAN = [
  ['Matemáticas', 'Matemáticas', 'Demo', 5],
  ['Lengua Castellana', 'Humanidades', 'Gómez', 4],
  ['Inglés', 'Humanidades', 'Díaz', 3],
  ['Ciencias Naturales', 'Ciencias Naturales', 'Castro', 4],
  ['Ciencias Sociales', 'Ciencias Sociales', 'Mejía', 3],
  ['Educación Física', 'Educación Física', 'Torres', 2],
  ['Tecnología e Informática', 'Tecnología', 'Rojas', 2],
  ['Ética y Valores', 'Ética', 'Herrera', 1],
  ['Química', 'Ciencias Naturales', 'Demo', 3],
]

const cargas = { [g10a]: {}, [g11a]: {} }
for (const [nombre, area, docente, ih] of PLAN) {
  const asignaturaId = await insertar('asignaturas', { nombre, area })
  for (const gradoId of [g10a, g11a]) {
    cargas[gradoId][nombre] = await insertar('cargas', {
      grado_id: gradoId, asignatura_id: asignaturaId, docente_id: docentes[docente], intensidad_horaria: ih,
    })
  }
}

// Estudiantes: documento, nombres, apellidos, grado
const ESTUDIANTES = [
  ['1111111111', 'Estudiante', 'Demo', g10a],
  ['1001000002', 'Santiago', 'López Barrios', g10a],
  ['1001000003', 'Isabella', 'Herrera Polo', g10a],
  ['1001000004', 'Mateo', 'Charris Ospino', g10a],
  ['1001000007', 'Valentina', 'Martínez Rocha', g10a],
  ['1001000008', 'Juan José', 'Navarro Fontalvo', g10a],
  ['1001000005', 'Sofía', 'De la Hoz Arrieta', g11a],
  ['1001000006', 'Samuel', 'Pertuz Molina', g11a],
  ['1001000009', 'Mariana', 'Ortega Salcedo', g11a],
]

// Generador determinista para que los datos sean siempre los mismos
let semilla = 7
const azar = () => (semilla = (semilla * 9301 + 49297) % 233280) / 233280
const notaAzar = (base, dispersion = 1.8) => Math.min(5, Math.max(1, Math.round((base + (azar() - 0.5) * dispersion) * 10) / 10))

const matriculas = { [g10a]: [], [g11a]: [] }
for (const [i, [documento, nombres, apellidos, gradoId]] of ESTUDIANTES.entries()) {
  const uid = await usuario(documento, 'estudiante', nombres, apellidos)
  const estId = await insertar('estudiantes', {
    usuario_id: uid,
    fecha_nacimiento: `${gradoId === g11a ? 2009 : 2010}-0${(i % 9) + 1}-15`,
    acudiente_nombre: `Acudiente de ${nombres}`,
    acudiente_telefono: `300000${String(i).padStart(4, '0')}`,
  })
  const mId = await insertar('matriculas', { estudiante_id: estId, grado_id: gradoId, anio: ANIO })
  matriculas[gradoId].push(mId)

  const base = 3.2 + azar() * 1.4
  for (const cargaId of Object.values(cargas[gradoId])) {
    // Notas definitivas de los periodos 1 a 3; el 4 está en curso
    for (const periodoId of periodos.slice(0, 3)) {
      await insertar('notas', { matricula_id: mId, carga_id: cargaId, periodo_id: periodoId, nota: notaAzar(base) })
    }
    const fallas = Math.floor(azar() * 4)
    for (let f = 0; f < fallas; f++) {
      await conn.query('INSERT IGNORE INTO inasistencias SET ?', [{
        matricula_id: mId, carga_id: cargaId, fecha: `2026-0${3 + f * 2}-1${f}`,
        tipo: azar() < 0.25 ? 'retardo' : 'falla', justificada: azar() < 0.3,
      }])
    }
  }
}

// Actividades del periodo 4 en Matemáticas y Química de 10°A (docente demo)
const ACTIVIDADES = [
  ['Matemáticas', { titulo: 'Taller de funciones trigonométricas', tipo: 'taller', porcentaje: 20, fecha_entrega: '2026-10-10 23:59:00',
    descripcion: 'Resolver los ejercicios 1 al 15 de la guía. Mostrar todo el procedimiento.' }, true],
  ['Matemáticas', { titulo: 'Quiz: identidades trigonométricas', tipo: 'cuestionario', porcentaje: 15, fecha_entrega: '2026-10-17 23:59:00',
    descripcion: 'Cuestionario de 4 preguntas. Solo tienes un intento.',
    preguntas: JSON.stringify([
      { enunciado: '¿Cuánto es sen²(x) + cos²(x)?', opciones: ['0', '1', 'tan(x)', '2'], correcta: 1 },
      { enunciado: 'tan(x) es igual a…', opciones: ['cos(x)/sen(x)', 'sen(x)·cos(x)', 'sen(x)/cos(x)', '1/sen(x)'], correcta: 2 },
      { enunciado: '¿Cuánto vale sen(90°)?', opciones: ['0', '1/2', '1', '√2/2'], correcta: 2 },
      { enunciado: 'sec(x) es igual a…', opciones: ['1/cos(x)', '1/sen(x)', '1/tan(x)', 'cos(x)'], correcta: 0 },
    ]) }, true],
  ['Matemáticas', { titulo: 'Proyecto: trigonometría en la vida real', tipo: 'proyecto', porcentaje: 25, fecha_entrega: '2026-11-07 23:59:00',
    descripcion: 'En grupos de 3, midan la altura de un edificio del colegio usando trigonometría. Entregar informe en PDF con fotos.' }, false],
  ['Matemáticas', { titulo: 'Evaluación final de periodo', tipo: 'evaluacion', porcentaje: 40, fecha_entrega: '2026-11-20 07:00:00',
    descripcion: 'Evaluación escrita presencial.', entrega_en_linea: false }, false],
  ['Química', { titulo: 'Informe de laboratorio: reacciones químicas', tipo: 'tarea', porcentaje: 30, fecha_entrega: '2026-10-24 23:59:00',
    descripcion: 'Informe con objetivos, procedimiento, resultados y conclusiones.' }, true],
  ['Química', { titulo: 'Exposición: tabla periódica', tipo: 'exposicion', porcentaje: 20, fecha_entrega: '2026-11-14 07:00:00',
    descripcion: 'Exposición grupal de 10 minutos sobre una familia de elementos.', entrega_en_linea: false }, false],
]

for (const [asignatura, datos, calificar] of ACTIVIDADES) {
  const actividadId = await insertar('actividades', {
    entrega_en_linea: true, ...datos, carga_id: cargas[g10a][asignatura], periodo_id: P4, creado_por: docentes.Demo,
  })
  if (!calificar) continue
  // El estudiante demo deja una actividad sin entregar para que se vea el flujo de entrega
  for (const [j, mId] of matriculas[g10a].entries()) {
    if (j === 0 && datos.tipo !== 'taller') continue
    const nota = notaAzar(3.9, 2.2)
    await insertar('entregas', {
      actividad_id: actividadId, matricula_id: mId,
      texto: datos.tipo === 'cuestionario' ? null : 'Entrega realizada desde la plataforma.',
      respuestas: datos.tipo === 'cuestionario' ? JSON.stringify([1, 2, 2, 0]) : null,
      entregado_en: '2026-10-09 18:30:00', nota,
      retroalimentacion: nota >= 4 ? '¡Buen trabajo!' : 'Revisa los ejercicios con errores y repasa el tema.',
      calificado_en: '2026-10-12 10:00:00',
    })
  }
}

// Observador
const OBSERVACIONES = [
  [0, { fecha: '2026-03-12', tipo: 'positiva', descripcion: 'Representó a la institución en las Olimpiadas de Matemáticas, obteniendo el segundo lugar.' }],
  [0, { fecha: '2026-08-21', tipo: 'convivencia', tipificacion: 'tipo_i', descripcion: 'Uso del celular durante la clase después de varios llamados de atención.',
    accion: 'Diálogo con el estudiante y compromiso verbal de no repetir la conducta.' }],
  [1, { fecha: '2026-05-06', tipo: 'academica', descripcion: 'Bajo rendimiento en Química durante el periodo 2.',
    accion: 'Plan de mejoramiento con talleres de refuerzo.', notificado_acudiente: true }],
  [2, { fecha: '2026-09-02', tipo: 'compromiso', descripcion: 'Se compromete a entregar a tiempo las actividades pendientes de Inglés.' }],
  [3, { fecha: '2026-07-15', tipo: 'citacion', descripcion: 'Citación al acudiente por inasistencias reiteradas.', notificado_acudiente: true }],
]
for (const [indice, obs] of OBSERVACIONES) {
  await insertar('observaciones', { ...obs, matricula_id: matriculas[g10a][indice], autor_id: docentes.Demo })
}

// Horario de 10°A (lunes a viernes)
const HORARIO = [
  ['06:30', '07:25', ['Matemáticas', 'Lengua Castellana', 'Química', 'Matemáticas', 'Inglés']],
  ['07:25', '08:20', ['Matemáticas', 'Ciencias Sociales', 'Química', 'Ciencias Naturales', 'Lengua Castellana']],
  ['08:20', '09:15', ['Inglés', 'Ciencias Naturales', 'Tecnología e Informática', 'Lengua Castellana', 'Educación Física']],
  ['09:45', '10:40', ['Ciencias Naturales', 'Matemáticas', 'Ciencias Sociales', 'Inglés', 'Educación Física']],
  ['10:40', '11:35', ['Lengua Castellana', 'Tecnología e Informática', 'Matemáticas', 'Ciencias Sociales', 'Química']],
  ['11:35', '12:30', ['Ética y Valores', 'Ciencias Naturales', 'Lengua Castellana', 'Ciencias Sociales', 'Matemáticas']],
]
for (const [inicio, fin, dias] of HORARIO) {
  for (const [d, asignatura] of dias.entries()) {
    await insertar('horarios', { carga_id: cargas[g10a][asignatura], dia: d + 1, hora_inicio: inicio, hora_fin: fin })
  }
}

// Horario de 11°A: se reparte la intensidad horaria sin cruzar a ningún docente con su clase en 10°A
const docenteDe = Object.fromEntries(PLAN.map(([nombre, , docente]) => [nombre, docente]))
const pendientes = Object.fromEntries(PLAN.map(([nombre, , , ih]) => [nombre, ih]))
for (let d = 0; d < 5; d++) {
  const hoy = {}
  for (const [inicio, fin, dias] of HORARIO) {
    const ocupado = docenteDe[dias[d]]
    const asignatura = Object.keys(pendientes)
      .filter((a) => pendientes[a] > 0 && docenteDe[a] !== ocupado && (hoy[a] ?? 0) < 2)
      .sort((a, b) => pendientes[b] - pendientes[a])[0]
    if (!asignatura) continue // hora libre del grupo
    pendientes[asignatura]--
    hoy[asignatura] = (hoy[asignatura] ?? 0) + 1
    await insertar('horarios', { carga_id: cargas[g11a][asignatura], dia: d + 1, hora_inicio: inicio, hora_fin: fin })
  }
}

for (const [titulo, texto, fecha, gradoId, publico] of [
  ['Cierre de notas del Periodo 4', 'Los docentes deben registrar las notas definitivas antes del cierre.', '2026-11-27', null, false],
  ['Entrega de boletines del Periodo 3', 'Reunión de padres de familia y acudientes a las 7:00 a.m. en cada sede.', '2026-10-31', null, true],
  ['Inicio de recuperaciones', 'Aplica para estudiantes con asignaturas en desempeño Bajo.', '2026-11-10', null, true],
  ['Proceso de matrículas 2027', 'Inscripciones para estudiantes nuevos en la secretaría de la Sede Principal.', '2026-11-17', null, true],
  ['Salida pedagógica 10°A', 'Visita al Museo del Caribe. Traer autorización firmada.', '2026-11-05', g10a, false],
]) {
  await insertar('anuncios', { titulo, texto, fecha, grado_id: gradoId, publico, autor_id: adminId })
}

// Noticias del sitio web (basadas en las publicaciones del colegio en Facebook)
const NOTICIAS = [
  ['logros', '2026-09-25', true, 'Excelentes resultados en las Pruebas Saber 11 – 2026',
    'Nuestros estudiantes de grado once obtuvieron puntajes sobresalientes, con un mejor resultado de 295 puntos.',
    'La comunidad maximista celebra los resultados de las Pruebas Saber 11 – 2026. Los mejores puntajes de la institución superaron los 275 puntos, y el más alto llegó a 295.\n\nEste logro es fruto del esfuerzo de los estudiantes, el acompañamiento de las familias y el compromiso de nuestros docentes. ¡Caminamos hacia la excelencia!'],
  ['cultura', '2026-10-04', false, 'Nuestra cumbia brilló en el Reinado Intercolegial',
    'Nuestra representante en la categoría Preinfantil realizó su primera presentación oficial en la preliminar del Reinado Intercolegial de la Cumbia.',
    'Con alegría, talento y amor por nuestra cumbia, nuestra representante en la categoría Preinfantil se presentó ante el jurado en la preliminar del Reinado Intercolegial de la Cumbia, dejando en alto el nombre de la Institución Educativa Máximo Mercado.\n\nInvitamos a toda la comunidad a seguir acompañándola en las próximas etapas de la competencia.'],
  ['academico', '2026-10-01', false, 'Atla and Tico Week: una semana para vivir el inglés',
    'Todas las sedes celebraron la Semana del Inglés con concursos de canto, baile, deletreo y el English Day.',
    'La Semana del Inglés comenzó en la Sede Principal y recorrió las demás sedes de la institución. Los estudiantes participaron en concursos de canto y baile, en el concurso de deletreo y en el reto «¿Cuánto conoces a tu profesor?».\n\nEn el English Day de las sedes Simón Bolívar y Acción Comunal, los más pequeños presentaron con entusiasmo temas como su familia, su colegio, sus comidas y animales favoritos. También reconocimos a los estudiantes destacados en inglés.'],
  ['institucional', '2026-10-05', false, 'Feliz Día del Directivo Docente',
    'Reconocemos a quienes, con liderazgo y vocación de servicio, orientan el rumbo de nuestra institución.',
    'En el Día del Directivo Docente, la comunidad maximista agradece a sus directivos por liderar con responsabilidad, escuchar, acompañar y hacer posible que la Institución Educativa Máximo Mercado siga creciendo y construyendo oportunidades para sus estudiantes.'],
  ['eventos', '2026-09-15', false, 'Semana de la Convivencia Escolar',
    'Actividades para aprender a respetar las diferencias y resolver los conflictos de forma pacífica.',
    'Durante la Semana de la Convivencia Escolar, estudiantes y docentes participaron en actividades que promueven el respeto por las diferencias, el diálogo y la solución pacífica de conflictos, pilares de nuestro manual de convivencia.'],
]
for (const [categoria, fecha, destacada, titulo, resumen, contenido] of NOTICIAS) {
  await insertar('noticias', { categoria, fecha, destacada, titulo, resumen, contenido, autor_id: adminId })
}
await insertar('mensajes_contacto', {
  nombre: 'Madre de familia (ejemplo)', telefono: '3000000000', asunto: 'Información de matrículas',
  mensaje: 'Buenas tardes, quisiera saber qué documentos necesito para matricular a mi hijo en sexto grado.',
})

// Interacción estudiante-docente: muro de Matemáticas 10°A, mensajes y comentarios en una tarea
const idUsuario = async (documento) => (await conn.query('SELECT id FROM usuarios WHERE documento = ?', [documento]))[0][0].id
const estDemo = await idUsuario('1111111111')
const estSantiago = await idUsuario('1001000002')

const bienvenida = await insertar('publicaciones', {
  carga_id: cargas[g10a]['Matemáticas'], autor_id: docentes.Demo, fijada: true, creado_en: '2026-09-22 07:00:00',
  texto: '¡Bienvenidos al Periodo 4! Aquí publicaré las guías, avisos y fechas de entrega. Si tienen dudas sobre un tema, pregunten en los comentarios para que todos aprendamos.',
})
const recordatorio = await insertar('publicaciones', {
  carga_id: cargas[g10a]['Matemáticas'], autor_id: docentes.Demo, creado_en: '2026-10-14 15:20:00',
  texto: 'Recuerden que el proyecto de trigonometría se entrega el 7 de noviembre. Ya pueden ir formando los grupos de 3.',
})
await insertar('publicaciones', {
  carga_id: cargas[g10a]['Matemáticas'], autor_id: estSantiago, creado_en: '2026-10-15 19:05:00',
  texto: 'Profe, ¿para el proyecto podemos medir la cancha en lugar de un edificio?',
})
for (const [publicacion_id, autor_id, texto, creado_en] of [
  [bienvenida, estDemo, '¡Gracias, profe!', '2026-09-22 08:10:00'],
  [recordatorio, estDemo, '¿El informe puede ser en Word o tiene que ser PDF?', '2026-10-14 18:40:00'],
  [recordatorio, docentes.Demo, 'Preferiblemente PDF, pero si solo tienen Word también lo recibo.', '2026-10-14 20:02:00'],
]) {
  await insertar('comentarios', { publicacion_id, autor_id, texto, creado_en })
}

for (const [remitente_id, destinatario_id, texto, creado_en, leido_en] of [
  [estDemo, docentes.Demo, 'Buenas tardes profe, mañana no puedo asistir porque tengo cita médica. ¿Cómo hago para ponerme al día?', '2026-10-16 16:30:00', '2026-10-16 18:00:00'],
  [docentes.Demo, estDemo, 'Tranquilo. Revisa la guía en el muro de Matemáticas y trae la excusa médica el lunes.', '2026-10-16 18:02:00', null],
]) {
  await insertar('mensajes', { remitente_id, destinatario_id, texto, creado_en, leido_en })
}

const [[informe]] = await conn.query("SELECT id FROM actividades WHERE titulo LIKE 'Informe de laboratorio%'")
await insertar('comentarios_entrega', {
  actividad_id: informe.id, matricula_id: matriculas[g10a][0], autor_id: estDemo, creado_en: '2026-10-17 10:15:00',
  texto: 'Profe, ¿el informe lleva marco teórico o solo los resultados?',
})

await conn.end()

console.log('✓ Datos de prueba cargados\n')
console.log(`Usuarios demo (contraseña para todos: ${CLAVE_DEMO})`)
console.log('  Estudiante     1111111111   (10°A)')
console.log('  Docente        2222222222   (Matemáticas y Química, director de 10°A)')
console.log('  Administrador  3333333333')
