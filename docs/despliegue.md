# Despliegue — SuMando

Una sola app en Coolify sobre el VPS propio: **`sumando.com.mx`**, construida desde la rama `main` con el `Dockerfile`
del repo (`github.com/Koopapi/SuMando`). No hay app de pruebas aparte (decisión del dueño, 12 de noviembre de 2026):
lo nuevo se prueba en local y con la CI, y al mergear a `main` se publica.

## Qué hace la imagen

- `Dockerfile` (raíz): instala con pnpm, compila Next en modo `standalone` (`NEXT_OUTPUT=standalone`) y deja una
  imagen pequeña con `node apps/web/server.js`, un usuario sin privilegios y un `HEALTHCHECK` contra `/api/setup`.
- Al arrancar, `apps/web/src/instrumentation.ts` aplica las migraciones de `apps/web/drizzle` si `MIGRATE_ON_START=1`
  (ya viene puesto en la imagen). Si una migración falla, el contenedor no levanta y Coolify deja corriendo la
  versión anterior.
- Probar la imagen en local: `docker build -t mando .` y, con un Postgres a mano,
  `docker run --rm -p 3000:3000 -e DATABASE_URL=postgres://usuario:clave@host:5432/mando -e COOKIE_SECURE=0 mando`;
  `curl -s http://localhost:3000/api/setup` responde `{"needed":true}`.

## Pasos en Coolify

1. **Base de datos**: *Resources → New → PostgreSQL 16*. Anota la URL interna (`postgres://…@<servicio>:5432/postgres`).
   Activa *Backups* programados (diarios) en el recurso: desde el primer día hay datos reales.
2. **Aplicación**: *New resource → Application → Public Repository*, `https://github.com/Koopapi/SuMando`, rama
   `main`, *Build Pack: Dockerfile* (está en la raíz; contexto `/`). Puerto `3000`.
3. **Almacenamiento persistente** (spec 008, documentos de empleados): en la app, *Persistent Storage → Volume*,
   destino `/app/data`. La imagen ya trae `FILES_DIR=/app/data/files`. Sin el volumen, los documentos se pierden en
   cada despliegue. El volumen entra en los respaldos del servidor; la spec 013 formaliza su restauración.
4. **Variables de entorno** (ninguna hace falta en compilación):
   - `DATABASE_URL`: la URL interna de la base de datos del paso 1.
   - `COOKIE_SECURE=1` (hay HTTPS). `MIGRATE_ON_START=1` ya viene en la imagen.
   - **Nunca** `DEV_ENDPOINTS=1`: abre las rutas de siembra y reinicio de la base de datos.
5. **Dominio**: `sumando.com.mx` (registrado en HostGator el 11 de noviembre de 2026).
   - En el administrador de DNS de HostGator (Zone Editor), registros **A** para `@` (la raíz) y `www` apuntando a la
     IPv4 pública del VPS, con TTL corto (300). Sin proxy ni redirección de HostGator: Let's Encrypt necesita llegar
     directo al VPS. Si ya hay un registro A de la raíz hacia el hosting de HostGator, se cambia por la IP del VPS.
   - Esperar la propagación: `dig +short A sumando.com.mx` debe devolver la IP del VPS.
   - En Coolify, *Domains* de la app: `https://sumando.com.mx,https://www.sumando.com.mx`. Coolify (Traefik) pide y
     renueva el certificado solo. Si se desplegó antes de que el DNS apuntara al VPS, volver a desplegar.
6. **Despliegue automático**: activar *Auto Deploy* (webhook de GitHub) para que cada merge a `main` publique.
7. **Primer arranque**: abrir `https://sumando.com.mx` → aparece «Crear la cuenta del dueño» (solo mientras no haya
   cuentas). Crearla de inmediato. Después, instalar SuMando en el teléfono desde el menú del navegador («Añadir a
   pantalla de inicio»).

## Comprobación tras cada despliegue

- `/api/setup` responde 200; la pantalla de entrada carga con estilos; iniciar sesión funciona.
- En el teléfono: abrir la app instalada, activar modo avión y recargar: aparece la página «Sin conexión».
