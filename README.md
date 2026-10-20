# Sistema de Notas · IEMM

Plataforma académica de la Institución Educativa Máximo Mercado: notas, actividades y tareas en línea, asistencia, observador del estudiante, consolidados y boletines.

- **Frontend:** React + Vite (carpeta raíz)
- **Backend:** Node.js + Express (carpeta `backend/`)
- **Base de datos:** MySQL 8

## Funciones por rol

| Rol | Puede |
|---|---|
| Estudiante | Ver notas por periodo y acumulado, entregar tareas (texto o archivo), presentar cuestionarios con calificación automática, ver horario, asistencia, su observador (y escribir descargos) e imprimir boletines. Participar en el muro de cada asignatura, escribirles mensajes privados a sus docentes y comentar en privado cada tarea |
| Docente | Planilla de notas por periodo (con nota sugerida a partir de las actividades), crear actividades/tareas/cuestionarios y calificarlas, tomar asistencia, registrar en el observador, ver consolidados e imprimir boletines de sus grados. Publicar avisos y material en el muro de sus clases, responder mensajes privados y los comentarios de cada tarea |
| Administrador (rectoría) | Estadísticas, usuarios, grados, asignaturas y carga académica, abrir/cerrar periodos, anuncios, consolidados, boletines y observador de toda la institución. **Equipo docente:** ver qué docentes están en hora libre o en clase en cualquier día y hora, el horario de cada uno, y asignar o cambiar los directores de grupo (máximo 2 grupos por docente). Mensajes privados con cualquier usuario. **Puede consultar las notas, pero no registrarlas ni modificarlas**: eso solo lo hace el docente |

## Interacción estudiante-docente

Reemplaza lo que en la universidad se hace por Teams:

- **Mis clases (muro):** cada asignatura de un grado tiene su muro. El docente publica avisos, guías y archivos (y puede fijarlos arriba); los estudiantes preguntan y comentan. Solo lo ven el grado y su docente.
- **Mensajes:** chat privado uno a uno. El estudiante puede escribirles a sus docentes y a su director de grupo; el docente, a los estudiantes de sus grados y a coordinación. El menú muestra cuántos mensajes hay sin leer.
- **Comentarios privados en tareas:** dentro de cada actividad, una conversación entre el estudiante y el docente sobre esa entrega. Al calificar, el docente ve quién dejó comentarios.

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
| Administrador | 3333333333 |

En la pantalla de inicio de sesión también está el botón **"Entrar con cuenta demo"**.
