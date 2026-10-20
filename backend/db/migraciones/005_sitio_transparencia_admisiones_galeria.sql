-- ---------- Sitio web: transparencia, admisiones y galería ----------

-- Documentos públicos (Ley 1712 de transparencia): PEI, manual de convivencia, presupuesto, circulares…
CREATE TABLE IF NOT EXISTS documentos (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo          VARCHAR(200) NOT NULL,
  descripcion     VARCHAR(300) NULL,
  categoria       ENUM('institucional', 'planeacion', 'presupuesto', 'normatividad', 'calendario', 'informes') NOT NULL,
  archivo         VARCHAR(100) NOT NULL,
  archivo_nombre  VARCHAR(200) NOT NULL,
  fecha           DATE NOT NULL,
  publicado       BOOLEAN NOT NULL DEFAULT TRUE,
  autor_id        INT UNSIGNED NULL,
  creado_en       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_documentos_categoria (publicado, categoria, fecha),
  CONSTRAINT fk_documentos_autor FOREIGN KEY (autor_id) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Preinscripciones de estudiantes nuevos desde el sitio
CREATE TABLE IF NOT EXISTS preinscripciones (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estudiante_nombre     VARCHAR(150) NOT NULL,
  estudiante_documento  VARCHAR(20)  NULL,
  fecha_nacimiento      DATE NULL,
  grado_aspira          VARCHAR(30)  NOT NULL,
  sede                  VARCHAR(80)  NULL,
  colegio_procedencia   VARCHAR(150) NULL,
  acudiente_nombre      VARCHAR(150) NOT NULL,
  acudiente_telefono    VARCHAR(30)  NOT NULL,
  acudiente_correo      VARCHAR(120) NULL,
  observaciones         TEXT NULL,
  estado                ENUM('nueva', 'contactada', 'admitida', 'no_admitida') NOT NULL DEFAULT 'nueva',
  acepta_datos_en       DATETIME NOT NULL,     -- aceptó la política de tratamiento de datos
  creado_en             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_preinscripciones_estado (estado, creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Álbumes de fotos por evento
CREATE TABLE IF NOT EXISTS galerias (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo       VARCHAR(150) NOT NULL,
  descripcion  VARCHAR(300) NULL,
  fecha        DATE NOT NULL,
  publicada    BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS galeria_fotos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  galeria_id  INT UNSIGNED NOT NULL,
  archivo     VARCHAR(100) NOT NULL,
  orden       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  INDEX idx_fotos_galeria (galeria_id, orden),
  CONSTRAINT fk_fotos_galeria FOREIGN KEY (galeria_id) REFERENCES galerias (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
