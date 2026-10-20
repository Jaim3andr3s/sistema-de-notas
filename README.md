# Sistema de Notas · IEMM

Sitio web y plataforma académica de la Institución Educativa Máximo Mercado: notas, tareas en línea, asistencia, observador, boletines, semáforo académico, mensajería, panel para padres de familia, carnet digital y app instalable.

- **Frontend:** React + Vite (carpeta raíz)
- **Backend:** Node.js + Express (carpeta `backend/`)
- **Base de datos:** MySQL 8

## Funciones por rol

| Rol | Puede |
|---|---|
| Estudiante | Ver notas por periodo y acumulado, entregar tareas (texto o archivo), presentar cuestionarios con calificación automática, ver horario, asistencia, su observador (y escribir descargos) e imprimir boletines. Participar en el muro de cada asignatura, escribirles mensajes privados a sus docentes y comentar en privado cada tarea. Ver su **semáforo académico**, su **calendario**, entregar **planes de mejoramiento** y descargar su **carnet digital** y **constancia de estudio** |
| Docente | Planilla de notas por periodo (con nota sugerida a partir de las actividades), crear actividades/tareas/cuestionarios y calificarlas, tomar asistencia, registrar en el observador, ver consolidados e imprimir boletines de sus grados. Publicar avisos y material en el muro de sus clases, responder mensajes privados (también de acudientes) y los comentarios de cada tarea. Ver el **semáforo** de sus grados, asignar y evaluar **planes de mejoramiento** y consultar su **calendario** |
| Administrador (rectoría) | Estadísticas, usuarios, grados, asignaturas y carga académica, abrir/cerrar periodos, anuncios, consolidados, boletines y observador de toda la institución. **Equipo docente:** ver qué docentes están en hora libre o en clase en cualquier día y hora, el horario de cada uno, y asignar o cambiar los directores de grupo (máximo 2 grupos por docente). Mensajes privados con cualquier usuario. **Alerta temprana** de toda la institución, calendario, cuentas de acudientes y administración del sitio (noticias, Facebook, galería, transparencia y preinscripciones). **Puede consultar las notas, pero no registrarlas ni modificarlas**: eso solo lo hace el docente |
| Acudiente (padre de familia) | Ver, en solo lectura, todo lo de sus hijos (notas, tareas, semáforo, asistencia, observador, boletines, mejoramiento, carnet) y escribirles al director de grupo y a los docentes. Si tiene varios hijos, elige cuál ver |

## Novedades para estudiantes y familias

- **Notificaciones (campanita):** nueva tarea, calificación, falla, anotación en el observador, plan de mejoramiento y anuncios. Si se configura un correo (`SMTP_*` en `backend/.env`), también llegan por email.
- **Semáforo académico:** alerta temprana por asignatura con la nota del periodo en curso, las de periodos anteriores, las fallas sin justificar y las tareas vencidas. Los umbrales están en `UMBRALES` (`backend/src/academico.js`).
- **Carnet digital y constancia de estudio** con un código QR que cualquiera puede verificar en `/verificar/…`, sin necesidad de iniciar sesión.
- **App instalable (PWA):** desde el celular, "Agregar a la pantalla de inicio".

## Interacción estudiante-docente

Reemplaza lo que en la universidad se hace por Teams:

- **Mis clases (muro):** cada asignatura de un grado tiene su muro. El docente publica avisos, guías y archivos (y puede fijarlos arriba); los estudiantes preguntan y comentan. Solo lo ven el grado y su docente.
- **Mensajes:** chat privado uno a uno. El estudiante puede escribirles a sus docentes y a su director de grupo; el docente, a los estudiantes de sus grados y a coordinación. El menú muestra cuántos mensajes hay sin leer.
- **Comentarios privados en tareas:** dentro de cada actividad, una conversación entre el estudiante y el docente sobre esa entrega. Al calificar, el docente ve quién dejó comentarios.

## Sitio web y Facebook

El sitio público (`/`) muestra noticias, agenda y publicaciones de Facebook. El Facebook del colegio es un **perfil personal**, y Facebook no permite mostrar el muro de un perfil en otra página. Por eso las publicaciones se agregan una por una desde **Sitio web → Facebook** en el panel del administrador: se pega el enlace de una publicación pública y el sitio la muestra.

Si el colegio crea una **página de Facebook**, basta con poner su enlace en `facebookPagina` (`src/sitio/contenido.js`) y el sitio mostrará el muro completo automáticamente.

## Lo que debe completar el colegio

En `src/sitio/contenido.js` hay datos marcados como **PENDIENTE**: dirección de cada sede, equipo directivo, horario de atención, correo, teléfono, número de WhatsApp (sin él no aparece el botón) y requisitos de matrícula. La política de datos (`/privacidad`) es un texto base que debe aprobar el consejo directivo.

## Instalación

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env      # y completar DB_PASSWORD y JWT_SECRET
npm run db:setup          # crea la base "sistema_notas" con datos de prueba (¡borra lo que exista!)
npm run dev               # API en http://localhost:4000

# 2. Frontend (en otra terminal, desde la raíz)
npm install
npm run dev               # http://localhost:5173
```

## Usuarios demo

Contraseña para todos: `demo1234`

| Rol | Documento |
|---|---|
| Estudiante (10°A) | 1111111111 |
| Docente (Matemáticas y Química, director de 10°A) | 2222222222 |
| Administrador (entrar por «Acceso administrativo») | 3333333333 |
| Acudiente (madre del estudiante demo y de Santiago) | 4444444444 |

En la pantalla de inicio de sesión también está el botón **"Entrar con cuenta demo"**.

El botón **"Entrar con cuenta demo"** solo aparece en desarrollo (`npm run dev`); en la versión compilada no se muestra.

## Actualizar una base con datos reales

`npm run db:setup` **borra todo**. Para actualizar las tablas sin perder datos, usa `npm run db:migrate`, que aplica los archivos nuevos de `backend/db/migraciones/`. Las copias de seguridad se hacen con `npm run db:respaldo`. Para publicar en un servidor con HTTPS, consulta [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).
