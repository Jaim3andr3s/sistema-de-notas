# Publicar la plataforma en internet

Guía para poner el sitio y la plataforma en un servidor propio con HTTPS. Sirve cualquier VPS con Ubuntu 22.04 o superior (DigitalOcean, Hetzner, AWS Lightsail, Contabo…). Con 2 GB de RAM alcanza para un colegio.

## 1. Lo que hay que tener antes

- **Dominio** del colegio, por ejemplo `iemaximomercado.edu.co`. Los `.edu.co` se tramitan ante el registrador de .CO y piden un documento de la institución.
- **Servidor** con Ubuntu y acceso SSH.
- **Correo** para enviar notificaciones, por ejemplo una cuenta de Google Workspace for Education (es gratis para colegios) con una contraseña de aplicación.

## 2. Instalar lo necesario

```bash
sudo apt update && sudo apt install -y nginx mysql-server git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm install -g pm2
sudo mysql_secure_installation
```

Crear una base y un usuario solo para la plataforma (nunca usar root):

```sql
CREATE DATABASE sistema_notas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'iemm'@'localhost' IDENTIFIED BY 'una-clave-larga-y-unica';
GRANT ALL PRIVILEGES ON sistema_notas.* TO 'iemm'@'localhost';
```

## 3. Código y configuración

```bash
cd /srv && sudo git clone https://github.com/Jaim3andr3s/sistema-de-notas.git && cd sistema-de-notas
cd backend && npm ci && cp .env.example .env
```

En `backend/.env`:

| Variable | Valor en el servidor |
|---|---|
| `NODE_ENV` | `production` (impide que `db:setup` borre la base) |
| `DB_USER` / `DB_PASSWORD` | el usuario `iemm` creado arriba |
| `JWT_SECRET` | una cadena aleatoria: `openssl rand -hex 32` |
| `CORS_ORIGIN` / `URL_PUBLICA` | `https://iemaximomercado.edu.co` |
| `TRUST_PROXY` | `1` (la API queda detrás de Nginx) |
| `SMTP_*` | los datos del correo de notificaciones |

Crear las tablas **la primera vez** (sin datos de prueba) y compilar el sitio:

```bash
mysql -u iemm -p sistema_notas < db/schema.sql
for f in db/migraciones/*.sql; do mysql -u iemm -p sistema_notas -e "INSERT INTO migraciones (nombre) VALUES ('$(basename $f)')"; done
cd .. && npm ci && npm run build      # genera la carpeta dist/
```

Después hay que crear el primer administrador directamente en la base; se puede pedir ayuda para generar el hash de la clave.

## 4. Mantener la API encendida

```bash
cd /srv/sistema-de-notas/backend
pm2 start src/server.js --name iemm-api
pm2 save && pm2 startup     # que arranque sola si el servidor se reinicia
```

## 5. Nginx y HTTPS

`/etc/nginx/sites-available/iemm`:

```nginx
server {
  server_name iemaximomercado.edu.co www.iemaximomercado.edu.co;
  root /srv/sistema-de-notas/dist;
  client_max_body_size 12m;

  location /api/ { proxy_pass http://127.0.0.1:4000; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
  location / { try_files $uri /index.html; }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/iemm /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d iemaximomercado.edu.co -d www.iemaximomercado.edu.co
```

Certbot instala el certificado HTTPS gratis y lo renueva solo.

## 6. Actualizar a una versión nueva

```bash
cd /srv/sistema-de-notas && git pull
cd backend && npm ci && npm run db:migrate     # aplica cambios de tablas SIN borrar datos
cd .. && npm ci && npm run build
pm2 restart iemm-api
```

**Nunca** ejecutar `npm run db:setup` en el servidor: borra todo y carga datos de prueba.

## 7. Copias de seguridad

`npm run db:respaldo` guarda la base y los archivos subidos en `backend/respaldos/` (o en `CARPETA_RESPALDOS`) y conserva las últimas 30. Programarla todos los días a las 2 a. m.:

```bash
crontab -e
0 2 * * * cd /srv/sistema-de-notas/backend && npm run db:respaldo >> /var/log/iemm-respaldo.log 2>&1
```

Es importante copiar también esa carpeta **fuera del servidor**, por ejemplo a Google Drive con `rclone`, porque si el servidor se daña se pierden las copias que están dentro de él.

Para restaurar una copia: `gunzip -c respaldo.sql.gz | mysql -u iemm -p sistema_notas`.

## 8. Lista de seguridad antes de abrirla a estudiantes

- [ ] `NODE_ENV=production` y un `JWT_SECRET` nuevo y largo
- [ ] HTTPS activo (candado en el navegador)
- [ ] Las cuentas demo **no** existen (no se ejecutó `db:setup`)
- [ ] Cada usuario cambió la clave inicial al primer ingreso
- [ ] La copia diaria funciona y hay una copia fuera del servidor
- [ ] Se publicó la política de tratamiento de datos (`/privacidad`)
- [ ] Firewall: solo los puertos 22, 80 y 443 abiertos (`sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable`)
