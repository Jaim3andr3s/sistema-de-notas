-- Sistema de Notas IEMM — esquema MySQL 8
-- Ejecutar con: npm run db:setup (crea la base, las tablas y los datos de prueba)

SET NAMES utf8mb4;

DROP TABLE IF EXISTS publicaciones_facebook;
DROP TABLE IF EXISTS mensajes_contacto;
DROP TABLE IF EXISTS comentarios_entrega;
DROP TABLE IF EXISTS mensajes;
DROP TABLE IF EXISTS comentarios;
DROP TABLE IF EXISTS publicaciones;
DROP TABLE IF EXISTS noticias;
DROP TABLE IF EXISTS observaciones;
DROP TABLE IF EXISTS entregas;
DROP TABLE IF EXISTS actividades;
DROP TABLE IF EXISTS anuncios;
DROP TABLE IF EXISTS horarios;
DROP TABLE IF EXISTS inasistencias;
DROP TABLE IF EXISTS notas;
DROP TABLE IF EXISTS matriculas;
DROP TABLE IF EXISTS cargas;
DROP TABLE IF EXISTS asignaturas;
DROP TABLE IF EXISTS periodos;
DROP TABLE IF EXISTS grados;
DROP TABLE IF EXISTS estudiantes;
DROP TABLE IF EXISTS usuarios;

-- Todas las personas que inician sesión
CREATE TABLE usuarios (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  documento     VARCHAR(20)  NOT NULL UNIQUE,
  clave_hash    VARCHAR(100) NOT NULL,
  rol           ENUM('estudiante', 'docente', 'administrador') NOT NULL,
  nombres       VARCHAR(80)  NOT NULL,
  apellidos     VARCHAR(80)  NOT NULL,
  email         VARCHAR(120) NULL,
  telefono      VARCHAR(20)  NULL,
  activo        BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usuarios_rol (rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos propios del estudiante (1 a 1 con usuarios)
CREATE TABLE estudiantes (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id          INT UNSIGNED NOT NULL UNIQUE,
  fecha_nacimiento    DATE         NULL,
  acudiente_nombre    VARCHAR(120) NULL,
  acudiente_telefono  VARCHAR(20)  NULL,
  CONSTRAINT fk_estudiantes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Grupos por año lectivo (ej. 10°A 2026)
CREATE TABLE grados (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(20)  NOT NULL,
  nivel        TINYINT UNSIGNED NOT NULL,          -- 0 = transición, 1..11
  jornada      ENUM('Mañana', 'Tarde', 'Única') NOT NULL DEFAULT 'Mañana',
  anio         SMALLINT UNSIGNED NOT NULL,
  director_id  INT UNSIGNED NULL,
  UNIQUE KEY uq_grados (nombre, jornada, anio),
  CONSTRAINT fk_grados_director FOREIGN KEY (director_id) REFERENCES usuarios (id) ON DELETE SET NULL,
  CONSTRAINT chk_grados_nivel CHECK (nivel BETWEEN 0 AND 11)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Periodos académicos del año
CREATE TABLE periodos (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  anio          SMALLINT UNSIGNED NOT NULL,
  numero        TINYINT UNSIGNED  NOT NULL,
  nombre        VARCHAR(30)  NOT NULL,
  porcentaje    TINYINT UNSIGNED NOT NULL DEFAULT 25,  -- peso en la nota final
  fecha_inicio  DATE NOT NULL,
  fecha_fin     DATE NOT NULL,
  cerrado       BOOLEAN NOT NULL DEFAULT FALSE,        -- cerrado = los docentes ya no pueden editar
  UNIQUE KEY uq_periodos (anio, numero),
  CONSTRAINT chk_periodos_numero CHECK (numero BETWEEN 1 AND 4),
  CONSTRAINT chk_periodos_fechas CHECK (fecha_fin >= fecha_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE asignaturas (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(80) NOT NULL UNIQUE,
  area    VARCHAR(80) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Carga académica: qué asignatura se dicta en qué grado y quién la dicta
CREATE TABLE cargas (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  grado_id            INT UNSIGNED NOT NULL,
  asignatura_id       INT UNSIGNED NOT NULL,
  docente_id          INT UNSIGNED NULL,
  intensidad_horaria  TINYINT UNSIGNED NOT NULL DEFAULT 1,
  UNIQUE KEY uq_cargas (grado_id, asignatura_id),
  CONSTRAINT fk_cargas_grado      FOREIGN KEY (grado_id)      REFERENCES grados (id) ON DELETE CASCADE,
  CONSTRAINT fk_cargas_asignatura FOREIGN KEY (asignatura_id) REFERENCES asignaturas (id),
  CONSTRAINT fk_cargas_docente    FOREIGN KEY (docente_id)    REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Un estudiante pertenece a un grado por año
CREATE TABLE matriculas (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estudiante_id  INT UNSIGNED NOT NULL,
  grado_id       INT UNSIGNED NOT NULL,
  anio           SMALLINT UNSIGNED NOT NULL,
  estado         ENUM('activa', 'retirada', 'graduada') NOT NULL DEFAULT 'activa',
  fecha          DATE NOT NULL DEFAULT (CURRENT_DATE),
  UNIQUE KEY uq_matriculas (estudiante_id, anio),
  CONSTRAINT fk_matriculas_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes (id) ON DELETE CASCADE,
  CONSTRAINT fk_matriculas_grado      FOREIGN KEY (grado_id)      REFERENCES grados (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nota definitiva de un estudiante en una asignatura por periodo (escala 1.0 – 5.0)
CREATE TABLE notas (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  matricula_id     INT UNSIGNED NOT NULL,
  carga_id         INT UNSIGNED NOT NULL,
  periodo_id       INT UNSIGNED NOT NULL,
  nota             DECIMAL(2,1) NOT NULL,
  observacion      VARCHAR(255) NULL,
  actualizado_por  INT UNSIGNED NULL,
  actualizado_en   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_notas (matricula_id, carga_id, periodo_id),
  CONSTRAINT fk_notas_matricula FOREIGN KEY (matricula_id)    REFERENCES matriculas (id) ON DELETE CASCADE,
  CONSTRAINT fk_notas_carga     FOREIGN KEY (carga_id)        REFERENCES cargas (id) ON DELETE CASCADE,
  CONSTRAINT fk_notas_periodo   FOREIGN KEY (periodo_id)      REFERENCES periodos (id),
  CONSTRAINT fk_notas_usuario   FOREIGN KEY (actualizado_por) REFERENCES usuarios (id) ON DELETE SET NULL,
  CONSTRAINT chk_notas_rango CHECK (nota BETWEEN 1.0 AND 5.0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inasistencias (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  matricula_id  INT UNSIGNED NOT NULL,
  carga_id      INT UNSIGNED NOT NULL,
  fecha         DATE NOT NULL,
  tipo          ENUM('falla', 'retardo') NOT NULL DEFAULT 'falla',
  justificada   BOOLEAN NOT NULL DEFAULT FALSE,
  observacion   VARCHAR(255) NULL,
  UNIQUE KEY uq_inasistencias (matricula_id, carga_id, fecha),
  CONSTRAINT fk_inasistencias_matricula FOREIGN KEY (matricula_id) REFERENCES matriculas (id) ON DELETE CASCADE,
  CONSTRAINT fk_inasistencias_carga     FOREIGN KEY (carga_id)     REFERENCES cargas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bloques de clase de cada carga (dia: 1 = lunes … 5 = viernes)
CREATE TABLE horarios (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  carga_id     INT UNSIGNED NOT NULL,
  dia          TINYINT UNSIGNED NOT NULL,
  hora_inicio  TIME NOT NULL,
  hora_fin     TIME NOT NULL,
  CONSTRAINT fk_horarios_carga FOREIGN KEY (carga_id) REFERENCES cargas (id) ON DELETE CASCADE,
  CONSTRAINT chk_horarios_dia CHECK (dia BETWEEN 1 AND 5),
  CONSTRAINT chk_horarios_horas CHECK (hora_fin > hora_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- grado_id NULL = anuncio para toda la institución
CREATE TABLE anuncios (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo     VARCHAR(150) NOT NULL,
  texto      TEXT NOT NULL,
  fecha      DATE NOT NULL,
  grado_id   INT UNSIGNED NULL,
  publico    BOOLEAN NOT NULL DEFAULT FALSE,   -- también aparece en el sitio web
  autor_id   INT UNSIGNED NULL,
  creado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_anuncios_grado FOREIGN KEY (grado_id) REFERENCES grados (id) ON DELETE CASCADE,
  CONSTRAINT fk_anuncios_autor FOREIGN KEY (autor_id) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tareas, talleres, cuestionarios, etc. que el docente publica para una carga en un periodo
CREATE TABLE actividades (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  carga_id          INT UNSIGNED NOT NULL,
  periodo_id        INT UNSIGNED NOT NULL,
  titulo            VARCHAR(150) NOT NULL,
  descripcion       TEXT NULL,
  tipo              ENUM('tarea', 'taller', 'cuestionario', 'evaluacion', 'exposicion', 'proyecto') NOT NULL DEFAULT 'tarea',
  porcentaje        TINYINT UNSIGNED NOT NULL DEFAULT 10,   -- peso dentro de la nota del periodo
  fecha_entrega     DATETIME NULL,
  entrega_en_linea  BOOLEAN NOT NULL DEFAULT TRUE,          -- el estudiante entrega desde la plataforma
  preguntas         JSON NULL,                              -- solo cuestionarios: [{enunciado, opciones[], correcta}]
  archivo           VARCHAR(100) NULL,                      -- adjunto del docente (guía, taller)
  archivo_nombre    VARCHAR(200) NULL,
  creado_por        INT UNSIGNED NULL,
  creado_en         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_actividades_carga (carga_id, periodo_id),
  CONSTRAINT fk_actividades_carga   FOREIGN KEY (carga_id)   REFERENCES cargas (id) ON DELETE CASCADE,
  CONSTRAINT fk_actividades_periodo FOREIGN KEY (periodo_id) REFERENCES periodos (id),
  CONSTRAINT fk_actividades_autor   FOREIGN KEY (creado_por) REFERENCES usuarios (id) ON DELETE SET NULL,
  CONSTRAINT chk_actividades_porcentaje CHECK (porcentaje BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Entrega del estudiante y su calificación (también se usa para calificar actividades presenciales)
CREATE TABLE entregas (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actividad_id       INT UNSIGNED NOT NULL,
  matricula_id       INT UNSIGNED NOT NULL,
  texto              TEXT NULL,
  archivo            VARCHAR(100) NULL,
  archivo_nombre     VARCHAR(200) NULL,
  respuestas         JSON NULL,
  entregado_en       DATETIME NULL,
  nota               DECIMAL(2,1) NULL,
  retroalimentacion  TEXT NULL,
  calificado_en      DATETIME NULL,
  UNIQUE KEY uq_entregas (actividad_id, matricula_id),
  CONSTRAINT fk_entregas_actividad FOREIGN KEY (actividad_id) REFERENCES actividades (id) ON DELETE CASCADE,
  CONSTRAINT fk_entregas_matricula FOREIGN KEY (matricula_id) REFERENCES matriculas (id) ON DELETE CASCADE,
  CONSTRAINT chk_entregas_nota CHECK (nota IS NULL OR nota BETWEEN 1.0 AND 5.0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Observador del estudiante (tipificación según Ley 1620 de convivencia escolar)
CREATE TABLE observaciones (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  matricula_id          INT UNSIGNED NOT NULL,
  autor_id              INT UNSIGNED NULL,
  fecha                 DATE NOT NULL,
  tipo                  ENUM('positiva', 'academica', 'convivencia', 'compromiso', 'citacion') NOT NULL,
  tipificacion          ENUM('ninguna', 'tipo_i', 'tipo_ii', 'tipo_iii') NOT NULL DEFAULT 'ninguna',
  descripcion           TEXT NOT NULL,
  accion                TEXT NULL,          -- acción pedagógica o correctivo acordado
  descargos             TEXT NULL,          -- versión del estudiante
  descargos_en          DATETIME NULL,
  notificado_acudiente  BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_observaciones_matricula (matricula_id, fecha),
  CONSTRAINT fk_observaciones_matricula FOREIGN KEY (matricula_id) REFERENCES matriculas (id) ON DELETE CASCADE,
  CONSTRAINT fk_observaciones_autor     FOREIGN KEY (autor_id)     REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Interacción estudiante-docente ----------

-- Muro de cada asignatura de un grado (como un canal de Teams)
CREATE TABLE publicaciones (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  carga_id        INT UNSIGNED NOT NULL,
  autor_id        INT UNSIGNED NOT NULL,
  texto           TEXT NOT NULL,
  archivo         VARCHAR(100) NULL,
  archivo_nombre  VARCHAR(200) NULL,
  fijada          BOOLEAN NOT NULL DEFAULT FALSE,   -- el docente la deja de primera
  creado_en       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_publicaciones_carga (carga_id, creado_en),
  CONSTRAINT fk_publicaciones_carga FOREIGN KEY (carga_id) REFERENCES cargas (id) ON DELETE CASCADE,
  CONSTRAINT fk_publicaciones_autor FOREIGN KEY (autor_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE comentarios (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  publicacion_id  INT UNSIGNED NOT NULL,
  autor_id        INT UNSIGNED NOT NULL,
  texto           TEXT NOT NULL,
  creado_en       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_comentarios_publicacion (publicacion_id, creado_en),
  CONSTRAINT fk_comentarios_publicacion FOREIGN KEY (publicacion_id) REFERENCES publicaciones (id) ON DELETE CASCADE,
  CONSTRAINT fk_comentarios_autor       FOREIGN KEY (autor_id)       REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mensajes privados uno a uno
CREATE TABLE mensajes (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  remitente_id     INT UNSIGNED NOT NULL,
  destinatario_id  INT UNSIGNED NOT NULL,
  texto            TEXT NOT NULL,
  leido_en         DATETIME NULL,
  creado_en        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mensajes_destinatario (destinatario_id, leido_en),
  INDEX idx_mensajes_par (remitente_id, destinatario_id, creado_en),
  CONSTRAINT fk_mensajes_remitente    FOREIGN KEY (remitente_id)    REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_mensajes_destinatario FOREIGN KEY (destinatario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Conversación privada entre un estudiante y el docente sobre una actividad
CREATE TABLE comentarios_entrega (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actividad_id  INT UNSIGNED NOT NULL,
  matricula_id  INT UNSIGNED NOT NULL,
  autor_id      INT UNSIGNED NOT NULL,
  texto         TEXT NOT NULL,
  creado_en     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_comentarios_entrega (actividad_id, matricula_id, creado_en),
  CONSTRAINT fk_coment_entrega_actividad FOREIGN KEY (actividad_id) REFERENCES actividades (id) ON DELETE CASCADE,
  CONSTRAINT fk_coment_entrega_matricula FOREIGN KEY (matricula_id) REFERENCES matriculas (id) ON DELETE CASCADE,
  CONSTRAINT fk_coment_entrega_autor     FOREIGN KEY (autor_id)     REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Sitio web público ----------

CREATE TABLE noticias (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo      VARCHAR(180) NOT NULL,
  resumen     VARCHAR(300) NOT NULL,
  contenido   TEXT NOT NULL,
  categoria   ENUM('logros', 'eventos', 'academico', 'cultura', 'deportes', 'institucional') NOT NULL DEFAULT 'institucional',
  imagen      VARCHAR(100) NULL,
  fecha       DATE NOT NULL,
  destacada   BOOLEAN NOT NULL DEFAULT FALSE,
  publicada   BOOLEAN NOT NULL DEFAULT TRUE,
  autor_id    INT UNSIGNED NULL,
  creado_en   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_noticias_fecha (publicada, fecha),
  CONSTRAINT fk_noticias_autor FOREIGN KEY (autor_id) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mensajes del formulario de contacto del sitio
CREATE TABLE mensajes_contacto (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(120) NOT NULL,
  correo     VARCHAR(120) NULL,
  telefono   VARCHAR(30)  NULL,
  asunto     VARCHAR(150) NOT NULL,
  mensaje    TEXT NOT NULL,
  leido      BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Publicaciones públicas de Facebook que se muestran insertadas en el sitio
-- (el colegio usa un perfil personal, que Facebook no deja mostrar como muro automático)
CREATE TABLE publicaciones_facebook (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  url          VARCHAR(500) NOT NULL,
  descripcion  VARCHAR(200) NULL,       -- nota interna para reconocerla en el panel
  autor_id     INT UNSIGNED NULL,
  creado_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_facebook_url (url(255)),
  CONSTRAINT fk_facebook_autor FOREIGN KEY (autor_id) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
