# Videos Web (embeds externos)

Sitio en Next.js + Prisma (SQLite) para publicar videos vía embeds externos
(YouTube, Vimeo, etc.), con categorías, búsqueda simple y panel `/admin`.

## Desarrollo local (VSCode)

```bash
npm install
npx prisma migrate dev   # crea/actualiza la base SQLite local
npm run seed              # opcional: agrega un video de ejemplo
npm run dev                # http://localhost:3000
```

Edita `ADMIN_KEY` en `.env` antes de usar `/admin` (esa clave se manda en el
header `x-admin-key` al agregar videos).

## Subir cambios a GitHub

```bash
git init
git add .
git commit -m "Proyecto inicial"
git branch -M main
git remote add origin <URL_DE_TU_REPO>
git push -u origin main
```

`.gitignore` ya excluye `node_modules`, `.next` y `dev.db` (no subas tu base
de datos local a git — en el VPS se crea la suya propia).

## Primer despliegue en el VPS

```bash
ssh usuario@tu-vps
mkdir -p /opt/videos-web && cd /opt/videos-web
git clone <URL_DE_TU_REPO> .
npm install
npx prisma migrate deploy    # aplica las migraciones sin preguntar nada
npm run build
pm2 start npm --name videos-web -- start -- -p 3001
pm2 save
```

Ajusta el puerto (`-p 3001`) para que no choque con tus otros proyectos en
el VPS (panel SEO, descargador de YouTube).

## Actualizar el VPS tras nuevos cambios

```bash
cd /opt/videos-web
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 restart videos-web
```

## Configuración de Nginx (server block)

```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Luego:

```bash
sudo ln -s /etc/nginx/sites-available/videos-web /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
```

## Estructura del proyecto

- `prisma/schema.prisma` — modelos `Video` y `Category`.
- `src/app/page.tsx` — home con grid de videos y categorías.
- `src/app/video/[slug]/page.tsx` — página de reproducción + SEO (JSON-LD).
- `src/app/categoria/[slug]/page.tsx` — listado filtrado por categoría.
- `src/app/api/videos/route.ts` — API interna (GET público, POST protegido).
- `src/app/admin/page.tsx` — formulario simple para agregar videos.

## Pendiente / ideas para seguir iterando

- Buscador con debounce en el home.
- Autenticación real para `/admin` (hoy es solo una clave compartida).
- Botón para desactivar un embed roto sin borrar el registro (`published`).
