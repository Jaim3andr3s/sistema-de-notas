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
  // WhatsApp de secretaría con indicativo, sin espacios ni +, ej. 573001234567. Vacío = no se muestra el botón
  whatsapp: '',
  horarioAtencion: '', // ej. Lunes a viernes, 7:00 a. m. a 12:00 m.
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

// PENDIENTE: dirección exacta de cada sede (se usa también para el mapa)
export const SEDES = [
  { nombre: 'Sede Principal', texto: 'Básica secundaria y media académica. Secretaría y rectoría.', direccion: '' },
  { nombre: 'Sede Simón Bolívar', texto: 'Preescolar y básica primaria.', direccion: '' },
  { nombre: 'Sede Acción Comunal', texto: 'Preescolar y básica primaria.', direccion: '' },
]

// PENDIENTE: nombres y correos del equipo directivo
export const DIRECTIVOS = [
  { cargo: 'Rector(a)', nombre: '', correo: '', icono: 'account_balance' },
  { cargo: 'Coordinación académica', nombre: '', correo: '', icono: 'school' },
  { cargo: 'Coordinación de convivencia', nombre: '', correo: '', icono: 'diversity_3' },
  { cargo: 'Secretaría', nombre: '', correo: '', icono: 'badge', detalle: 'Matrículas, certificados y constancias' },
  { cargo: 'Orientación escolar', nombre: '', correo: '', icono: 'psychology' },
]

// ---------- Admisiones ----------
export const GRADOS_ADMISION = ['Transición', '1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°', '9°', '10°', '11°']

export const PASOS_ADMISION = [
  { icono: 'edit_note', titulo: 'Preinscripción', texto: 'Llena el formulario en línea con los datos del aspirante y del acudiente.' },
  { icono: 'call', titulo: 'Te contactamos', texto: 'Secretaría revisa los cupos disponibles y te llama para confirmar.' },
  { icono: 'folder_open', titulo: 'Entrega de documentos', texto: 'Llevas los documentos a la secretaría de la Sede Principal.' },
  { icono: 'how_to_reg', titulo: 'Matrícula', texto: 'Se registra al estudiante en el SIMAT y recibe su usuario de la plataforma.' },
]

// PENDIENTE: confirmar con secretaría
export const REQUISITOS = [
  'Copia del registro civil de nacimiento o de la tarjeta de identidad del estudiante',
  'Copia de la cédula del acudiente',
  'Certificado de notas del último grado cursado (desde 2° en adelante)',
  'Retiro del SIMAT de la institución anterior (si viene de otro colegio)',
  'Dos fotos tamaño documento',
  'Certificado de afiliación a EPS o SISBÉN',
  'Carné de vacunas (preescolar y primaria)',
]

// ---------- Transparencia (Ley 1712 de 2014) ----------
export const CATEGORIAS_DOC = {
  institucional: { nombre: 'Información institucional', icono: 'account_balance', texto: 'PEI, manual de convivencia, SIEE, misión, visión y organigrama.' },
  planeacion: { nombre: 'Planeación', icono: 'insights', texto: 'Plan de mejoramiento institucional y plan operativo anual.' },
  presupuesto: { nombre: 'Presupuesto y contratación', icono: 'payments', texto: 'Presupuesto del Fondo de Servicios Educativos, ejecución y contratos.' },
  normatividad: { nombre: 'Normatividad', icono: 'gavel', texto: 'Resoluciones, acuerdos del consejo directivo y circulares.' },
  calendario: { nombre: 'Calendario académico', icono: 'event', texto: 'Calendario escolar del año y fechas de periodos.' },
  informes: { nombre: 'Informes y rendición de cuentas', icono: 'summarize', texto: 'Informes de gestión, rendición de cuentas y resultados Saber.' },
}

export const CATEGORIAS = {
  logros: { nombre: 'Logros', icono: 'emoji_events' },
  eventos: { nombre: 'Eventos', icono: 'event' },
  academico: { nombre: 'Académico', icono: 'auto_stories' },
  cultura: { nombre: 'Cultura', icono: 'theater_comedy' },
  deportes: { nombre: 'Deportes', icono: 'sports_soccer' },
  institucional: { nombre: 'Institucional', icono: 'account_balance' },
}
