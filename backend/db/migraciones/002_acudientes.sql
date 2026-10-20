ALTER TABLE usuarios MODIFY rol ENUM('estudiante', 'docente', 'administrador', 'acudiente') NOT NULL;

-- Padres de familia o acudientes con cuenta en la plataforma; un acudiente puede tener varios estudiantes a cargo
CREATE TABLE IF NOT EXISTS acudientes (
  acudiente_id   INT UNSIGNED NOT NULL,
  estudiante_id  INT UNSIGNED NOT NULL,
  parentesco     VARCHAR(40) NULL,
  PRIMARY KEY (acudiente_id, estudiante_id),
  CONSTRAINT fk_acudientes_usuario    FOREIGN KEY (acudiente_id)  REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_acudientes_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
