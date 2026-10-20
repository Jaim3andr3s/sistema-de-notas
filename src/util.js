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
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100
}

export const ROLES = { estudiante: 'Estudiante', docente: 'Docente', administrador: 'Administrador', acudiente: 'Acudiente' }

export const TIPOS_ACTIVIDAD = {
  tarea: 'Tarea',
  taller: 'Taller',
  cuestionario: 'Cuestionario',
  evaluacion: 'Evaluación',
  exposicion: 'Exposición',
  proyecto: 'Proyecto',
}

export const TIPOS_OBSERVACION = {
  positiva: 'Positiva / reconocimiento',
  academica: 'Académica',
  convivencia: 'Convivencia',
  compromiso: 'Compromiso',
  citacion: 'Citación al acudiente',
}

export const TIPIFICACIONES = {
  ninguna: 'Sin tipificar',
  tipo_i: 'Situación tipo I',
  tipo_ii: 'Situación tipo II',
  tipo_iii: 'Situación tipo III',
}

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

// Fechas que llegan de MySQL como 'AAAA-MM-DD' o 'AAAA-MM-DD HH:MM:SS'
function aFecha(valor) {
  if (!valor) return null
  return new Date(String(valor).replace(' ', 'T').length === 10 ? valor + 'T00:00' : String(valor).replace(' ', 'T'))
}

export function fecha(valor, opciones = { day: '2-digit', month: 'short', year: 'numeric' }) {
  const d = aFecha(valor)
  return d ? d.toLocaleDateString('es-CO', opciones) : '—'
}

export function fechaHora(valor) {
  const d = aFecha(valor)
  return d ? d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—'
}

export const hoy = () => new Date().toLocaleDateString('en-CA')

export const vencida = (fechaEntrega) => Boolean(fechaEntrega) && aFecha(fechaEntrega) < new Date()

export const nombreCompleto = (u) => (u ? `${u.nombres} ${u.apellidos}` : '')

// Ícono de Material Icons según el nombre de la asignatura
const ICONOS_ASIGNATURA = [
  [/matem/i, 'calculate'], [/qu[ií]mica/i, 'science'], [/f[ií]sica(?!.*educ)/i, 'bolt'], [/natural|biolog/i, 'eco'],
  [/social|historia|geograf/i, 'public'], [/ingl[eé]s|idioma/i, 'translate'], [/lengua|castellan|lectura/i, 'menu_book'],
  [/educaci[oó]n f[ií]sica|deporte/i, 'sports_soccer'], [/tecnolog|inform[aá]tica/i, 'computer'], [/[eé]tica|valores/i, 'diversity_3'],
  [/art[ií]stica|arte|m[uú]sica/i, 'palette'], [/religi/i, 'auto_stories'], [/filosof/i, 'psychology'],
]
export const iconoAsignatura = (nombre = '') => ICONOS_ASIGNATURA.find(([re]) => re.test(nombre))?.[1] ?? 'class'
