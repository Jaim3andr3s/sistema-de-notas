-- Publicaciones públicas de Facebook que se muestran insertadas en el sitio
-- (el colegio usa un perfil personal, que Facebook no deja mostrar como muro automático)
CREATE TABLE IF NOT EXISTS publicaciones_facebook (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  url          VARCHAR(500) NOT NULL,
  descripcion  VARCHAR(200) NULL,       -- nota interna para reconocerla en el panel
  autor_id     INT UNSIGNED NULL,
  creado_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_facebook_url (url(255)),
  CONSTRAINT fk_facebook_autor FOREIGN KEY (autor_id) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
