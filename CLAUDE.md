# EventPlaner — Project Context for Claude

## Project Structure

Monorepo with two apps:
- `apps/server` — Fastify + Socket.IO + SQLite (Prisma), port 3001
- `apps/web` — React 18 + Vite + React Router v6 + Zustand + Socket.IO client

Root-level `docker-compose.yml` orchestrates both. Existing `apps/web/nginx.conf` is used inside the web container only.

## VPS: orb-xr.com (178.16.131.88)

- **OS:** AlmaLinux 8.10 (RHEL-based — no `sites-available`, uses `/etc/nginx/conf.d/`)
- **Nginx config:** `/etc/nginx/conf.d/nft.conf`
- **SSL:** Let's Encrypt for `orb-xr.com` and `www.orb-xr.com`
- **Node.js:** v20.19.3 — **PM2:** 5.3.0 — **Docker:** 26.1.3 — **Docker Compose:** v2.27.0

### Running services (DO NOT TOUCH)
| Container | Image | Port | Nginx location |
|-----------|-------|------|----------------|
| `onlyoffice-docs` | `onlyoffice/documentserver:9.0.3` | `127.0.0.1:8888:80` | `location /` |
| `collabora` | `collabora/code` | `127.0.0.1:9980:9980` | `location /collabora/` |

**CRITICAL:** OnlyOffice uses `/api/2.0/` paths from the browser. Never add a top-level `location /api/` or `location /socket.io/` to the outer nginx — it will silently break OnlyOffice document editing.

## Deployment Target: orb-xr.com/events

### Architecture

```
Browser → /events/...           → nginx → /var/www/html/events/ (static SPA)
Browser → /events-api/...       → nginx → 127.0.0.1:3001 (Fastify, strips prefix)
Browser → /events-socket.io/... → nginx → 127.0.0.1:3001/socket.io/ (WS proxy)
OnlyOffice stays at /           → 127.0.0.1:8888  ← untouched
```

Unique prefixes `/events-api/` and `/events-socket.io/` avoid any conflict with OnlyOffice.

### Required Code Changes (not yet applied)

1. **`apps/web/vite.config.ts`** — add `base: '/events'`
2. **`apps/web/src/app.tsx`** — add `basename="/events"` to `<BrowserRouter>`
3. **`apps/web/src/api/socket.ts`** — decouple socket path from `VITE_API_URL`:
   - Change `io(API_URL, { auth })` → `io('', { auth, path: import.meta.env.VITE_SOCKET_PATH ?? '/socket.io' })`
4. **`apps/web/Dockerfile`** — switch `ENV VITE_API_URL=""` to build args:
   ```dockerfile
   ARG VITE_API_URL=""
   ARG VITE_SOCKET_PATH="/socket.io"
   ENV VITE_API_URL=$VITE_API_URL
   ENV VITE_SOCKET_PATH=$VITE_SOCKET_PATH
   ```
5. **Create `docker-compose.prod.yml`** — server only, exposed on localhost:
   ```yaml
   services:
     server:
       ports:
         - "127.0.0.1:3001:3001"
     web:
       profiles: ["disabled"]
   ```

### Nginx block to add (inside `server { listen 443 ssl; }` in `/etc/nginx/conf.d/nft.conf`)

```nginx
# ── Event Planner ──────────────────────────────────────────────────────────────
location = /events {
    return 301 https://$host/events/;
}
location /events/ {
    root /var/www/html;
    try_files $uri $uri/ /events/index.html;
}
location /events-api/ {
    proxy_pass         http://127.0.0.1:3001/;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}
location /events-socket.io/ {
    proxy_pass         http://127.0.0.1:3001/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade    $http_upgrade;
    proxy_set_header   Connection "upgrade";
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}
```

### Build env vars (production)
```
VITE_API_URL=/events-api
VITE_SOCKET_PATH=/events-socket.io
```

### Server .env (create on VPS, never commit)
```
JWT_SECRET=<strong-random-secret>
ADMIN_CREATE_KEY=<strong-random-key>
CORS_ORIGIN=https://orb-xr.com
LOG_LEVEL=info
DATABASE_URL=file:/data/app.db
```

### Deployment steps (once code changes are applied)
1. rsync project to VPS
2. On VPS: `mkdir -p /var/www/html/events`
3. On VPS: `cd apps/web && npm ci && VITE_API_URL=/events-api VITE_SOCKET_PATH=/events-socket.io npm run build`
4. On VPS: `cp -r apps/web/dist/* /var/www/html/events/`
5. On VPS: create `.env` with secrets (see above)
6. On VPS: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d server`
7. On VPS: add nginx block, then `nginx -t && systemctl reload nginx`

## Key App Internals

- `http.ts` line 19: `const API_URL = import.meta.env.VITE_API_URL ?? ''` — prepended to all `/api/...` fetch calls
- `socket.ts` line 11: same `API_URL` used as Socket.IO server URL — must be decoupled for sub-path deploy
- `app.tsx`: `BrowserRouter` needs `basename="/events"` for correct SPA routing under sub-path
- Server `CORS_ORIGIN` env var controls both Fastify CORS and Socket.IO CORS
- SQLite data persists in Docker volume `sqlite-data` at `/data/app.db`
- Server runs migrations automatically on startup (`prisma:migrate:deploy`)
