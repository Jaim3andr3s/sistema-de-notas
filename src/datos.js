// Datos de ejemplo — reemplazar por la respuesta del backend
export const PERIODOS = ['Periodo 1', 'Periodo 2', 'Periodo 3', 'Periodo 4']

export const ESTUDIANTE = {
  nombre: 'Estudiante de Prueba',
  grado: '10°A',
  jornada: 'Mañana',
  director: 'Lic. María Pérez',
  anio: 2026,
}

export const NOTAS = [
  { asignatura: 'Matemáticas', docente: 'Carlos Ruiz', ih: 5, notas: [4.2, 3.8, 4.5, null], fallas: 2 },
  { asignatura: 'Lengua Castellana', docente: 'Ana Gómez', ih: 4, notas: [4.6, 4.8, 4.7, null], fallas: 0 },
  { asignatura: 'Inglés', docente: 'Laura Díaz', ih: 3, notas: [3.5, 3.9, 4.1, null], fallas: 1 },
  { asignatura: 'Ciencias Naturales', docente: 'Jorge Castro', ih: 4, notas: [3.2, 2.8, 3.6, null], fallas: 3 },
  { asignatura: 'Ciencias Sociales', docente: 'Pedro Mejía', ih: 3, notas: [4.0, 4.3, 4.4, null], fallas: 0 },
  { asignatura: 'Educación Física', docente: 'Luis Torres', ih: 2, notas: [5.0, 4.9, 4.8, null], fallas: 0 },
  { asignatura: 'Tecnología e Informática', docente: 'Sandra Rojas', ih: 2, notas: [4.5, 4.7, 4.9, null], fallas: 1 },
  { asignatura: 'Ética y Valores', docente: 'Rosa Herrera', ih: 1, notas: [4.4, 4.2, 4.6, null], fallas: 0 },
  { asignatura: 'Química', docente: 'Jorge Castro', ih: 3, notas: [2.9, 3.4, 3.1, null], fallas: 4 },
]

export const HORARIO = [
  { hora: '6:30 – 7:25', dias: ['Matemáticas', 'Lengua Castellana', 'Química', 'Matemáticas', 'Inglés'] },
  { hora: '7:25 – 8:20', dias: ['Matemáticas', 'Ciencias Sociales', 'Química', 'Ciencias Naturales', 'Lengua Castellana'] },
  { hora: '8:20 – 9:15', dias: ['Inglés', 'Ciencias Naturales', 'Tecnología e Informática', 'Lengua Castellana', 'Educación Física'] },
  { hora: '9:15 – 9:45', dias: ['Descanso', 'Descanso', 'Descanso', 'Descanso', 'Descanso'] },
  { hora: '9:45 – 10:40', dias: ['Ciencias Naturales', 'Matemáticas', 'Ciencias Sociales', 'Inglés', 'Educación Física'] },
  { hora: '10:40 – 11:35', dias: ['Lengua Castellana', 'Tecnología e Informática', 'Matemáticas', 'Ciencias Sociales', 'Química'] },
  { hora: '11:35 – 12:30', dias: ['Ética y Valores', 'Ciencias Naturales', 'Lengua Castellana', 'Ciencias Sociales', 'Matemáticas'] },
]

export const ANUNCIOS = [
  { fecha: '2026-10-24', titulo: 'Cierre de notas del Periodo 3', texto: 'Los docentes publican las notas definitivas del periodo.' },
  { fecha: '2026-10-31', titulo: 'Entrega de boletines', texto: 'Reunión de padres de familia a las 7:00 a.m.' },
  { fecha: '2026-11-10', titulo: 'Inicio de recuperaciones', texto: 'Aplica para asignaturas con desempeño Bajo.' },
]

// Escala de valoración nacional (Decreto 1290)
export function desempeno(nota) {
  if (nota == null) return null
  if (nota >= 4.6) return { nombre: 'Superior', clase: 'superior' }
  if (nota >= 4.0) return { nombre: 'Alto', clase: 'alto' }
  if (nota >= 3.0) return { nombre: 'Básico', clase: 'basico' }
  return { nombre: 'Bajo', clase: 'bajo' }
}

export function promedio(valores) {
  const v = valores.filter((n) => n != null)
  if (!v.length) return null
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10
}
