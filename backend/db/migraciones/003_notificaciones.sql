-- Avisos de la campanita: nueva tarea, calificación, falla, anotación en el observador…
CREATE TABLE IF NOT EXISTS notificaciones (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT UNSIGNED NOT NULL,
  tipo        VARCHAR(30)  NOT NULL,
  titulo      VARCHAR(150) NOT NULL,
  texto       VARCHAR(300) NULL,
  vista       VARCHAR(30)  NULL,        -- sección de la plataforma que abre el aviso
  leida_en    DATETIME     NULL,
  creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notificaciones_usuario (usuario_id, leida_en),
  CONSTRAINT fk_notificaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
