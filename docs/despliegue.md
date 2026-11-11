# Despliegue — Mando

Dos apps en Coolify sobre el VPS propio: **pruebas** (rama `pruebas`) y, más adelante (spec 010), **producción**
(rama `main`). Las dos se construyen con el `Dockerfile` del repo y migran la base de datos al arrancar.

## Qué hace la imagen

- `Dockerfile` (raíz): instala con pnpm, compila Next en modo `standalone` (`NEXT_OUTPUT=standalone`) y deja una
  imagen pequeña con `node apps/web/server.js`, un usuario sin privilegios y un `HEALTHCHECK` contra `/api/setup`.
- Al arrancar, `apps/web/src/instrumentation.ts` aplica las migraciones de `apps/web/drizzle` si `MIGRATE_ON_START=1`
  (ya viene puesto en la imagen). Si una migración falla, el contenedor no levanta: Coolify lo marca en rojo.
- Probar la imagen en local: `docker build -t mando .` y, con un Postgres a mano,
  `docker run --rm -p 3000:3000 -e DATABASE_URL=postgres://usuario:clave@host:5432/mando -e COOKIE_SECURE=0 mando`;
  `curl -s http://localhost:3000/api/setup` responde `{"needed":true}`.

## Pasos en Coolify (app de pruebas)

1. **Base de datos**: *Resources → New → PostgreSQL 16*. Anota la URL interna (`postgres://…@<servicio>:5432/postgres`)
   o crea una base `mando_pruebas`.
2. **Aplicación**: *New resource → Application → Public/Private repository*, repositorio de Mando, rama `pruebas`,
   *Build Pack: Dockerfile* (está en la raíz; dejar el contexto en `/`). Puerto `3000`.
3. **Variables de entorno** (marcar las secretas como *Build variable* solo si hiciera falta en compilación; aquí
   ninguna lo necesita):
   - `DATABASE_URL`: la URL interna de la base de datos del paso 1.
   - `COOKIE_SECURE=1` (hay HTTPS). `MIGRATE_ON_START=1` ya viene en la imagen.
   - **Nunca** `DEV_ENDPOINTS=1` fuera de desarrollo y E2E.
4. **Dominio**: mientras no haya dominio, usar el provisional que genera Coolify (`*.sslip.io`) con HTTPS automático
   (Let's Encrypt). Cuando exista el dominio, cambiarlo en *Domains* y Coolify renueva el certificado; la app no
   cambia.
5. **Despliegue automático**: activar *Auto Deploy* (webhook o la app de GitHub de Coolify) para que cada push a
   `pruebas` publique.
6. **Primer arranque**: abrir la dirección → aparece «Crear la cuenta del dueño» (solo mientras no haya cuentas).
   Después, instalar Mando en el teléfono desde el menú del navegador («Añadir a pantalla de inicio»).

## Comprobación tras cada despliegue

- `/api/setup` responde 200; la pantalla de entrada carga con estilos; iniciar sesión funciona.
- En el teléfono: abrir la app instalada, activar modo avión y recargar: aparece la página «Sin conexión».
