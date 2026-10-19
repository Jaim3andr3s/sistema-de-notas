# Sistema de Notas · IEMM

Plataforma académica de la Institución Educativa Máximo Mercado: notas, actividades y tareas en línea, asistencia, observador del estudiante, consolidados y boletines.

- **Frontend:** React + Vite (carpeta raíz)
- **Backend:** Node.js + Express (carpeta `backend/`)
- **Base de datos:** MySQL 8

## Funciones por rol

| Rol | Puede |
|---|---|
| Estudiante | Ver notas por periodo y acumulado, entregar tareas (texto o archivo), presentar cuestionarios con calificación automática, ver horario, asistencia, su observador (y escribir descargos) e imprimir boletines |
| Docente | Planilla de notas por periodo (con nota sugerida a partir de las actividades), crear actividades/tareas/cuestionarios y calificarlas, tomar asistencia, registrar en el observador, ver consolidados e imprimir boletines de sus grados |
| Administrador | Estadísticas, usuarios, grados, asignaturas y carga académica, abrir/cerrar periodos, anuncios, consolidados, boletines y observador de toda la institución |

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
