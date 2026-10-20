// Textos fijos del sitio web. Las noticias y los eventos se administran desde la plataforma (rol Administrador).
// PENDIENTE: reemplazar misión, visión, sedes y datos de contacto por los oficiales del PEI.

export const COLEGIO = {
  nombre: 'Institución Educativa Máximo Mercado',
  sigla: 'IEMM',
  ciudad: 'Sabanalarga, Atlántico',
  lema: 'Estudio · Libertad · Paz',
  eslogan: 'Caminamos hacia la excelencia',
  frase: 'Nunca te rindas, sonríe, sueña, aprende y triunfarás',
  facebook: 'https://www.facebook.com/iemaximomercado.desabanalarga.9',
  // Si el colegio crea una página de Facebook (no un perfil), poner aquí su enlace y el sitio mostrará el muro automáticamente
  facebookPagina: '',
  correo: '',      // ej. contacto@iemm.edu.co
  telefono: '',    // ej. (605) 000 0000
  direccion: 'Sabanalarga, Atlántico',
}

export const PILARES = [
  { icono: 'menu_book', titulo: 'Estudio', texto: 'Formamos estudiantes curiosos y disciplinados, que encuentran en el conocimiento la herramienta para transformar su vida y su comunidad.' },
  { icono: 'local_fire_department', titulo: 'Libertad', texto: 'Como la antorcha de nuestro escudo, promovemos el pensamiento crítico, la autonomía y la responsabilidad con las propias decisiones.' },
  { icono: 'volunteer_activism', titulo: 'Paz', texto: 'Construimos una convivencia basada en el respeto, el diálogo y la solución pacífica de los conflictos.' },
]

export const MISION = 'Brindar una educación integral y de calidad a niños, niñas y jóvenes de Sabanalarga, desde el preescolar hasta la media académica, formando personas competentes, con valores y comprometidas con la construcción de una sociedad en paz.'

export const VISION = 'Ser reconocidos como una institución líder en la región por la excelencia académica de sus egresados, la calidad humana de su comunidad y su aporte al desarrollo cultural del Atlántico.'

export const NIVELES = [
  { icono: 'child_care', titulo: 'Preescolar', texto: 'Transición: aprendizaje a través del juego, el arte y la exploración.' },
  { icono: 'backpack', titulo: 'Básica primaria', texto: 'De 1° a 5°: bases sólidas en lectura, matemáticas, ciencias e inglés.' },
  { icono: 'science', titulo: 'Básica secundaria', texto: 'De 6° a 9°: desarrollo de competencias y proyectos transversales.' },
  { icono: 'school', titulo: 'Media académica', texto: '10° y 11°: preparación para las Pruebas Saber 11 y la educación superior.' },
]

export const SEDES = [
  { nombre: 'Sede Principal', texto: 'Básica secundaria y media académica. Secretaría y rectoría.' },
  { nombre: 'Sede Simón Bolívar', texto: 'Preescolar y básica primaria.' },
  { nombre: 'Sede Acción Comunal', texto: 'Preescolar y básica primaria.' },
]

export const CATEGORIAS = {
  logros: { nombre: 'Logros', icono: 'emoji_events' },
  eventos: { nombre: 'Eventos', icono: 'event' },
  academico: { nombre: 'Académico', icono: 'auto_stories' },
  cultura: { nombre: 'Cultura', icono: 'theater_comedy' },
  deportes: { nombre: 'Deportes', icono: 'sports_soccer' },
  institucional: { nombre: 'Institucional', icono: 'account_balance' },
}
