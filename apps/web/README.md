# Mando — aplicación web

Next.js 16 (App Router) + TypeScript estricto + Tailwind 4, PostgreSQL 16 con Drizzle. Los comandos y las
convenciones están en `AGENTS.md` (raíz del repo); aquí solo el arranque.

## Arranque local

1. PostgreSQL 16 en marcha (`pg_ctl -D /opt/homebrew/var/postgresql@16 start`) y la BD creada: `createdb mando_dev`.
2. `cp .env.example .env.local` (ya apunta a `mando_dev` y activa las rutas de desarrollo).
3. Desde la raíz del repo, `pnpm install`; desde `apps/web`, `pnpm db:migrate` y `pnpm dev` (puerto 3400).

## Carpetas

```
src/
  domain/      reglas puras (sin Next ni BD)
  server/
    ports/     Clock, PasswordHasher, RandomSource
    adapters/  reloj del sistema, Argon2id, aleatorio de node:crypto
    services/  casos de uso
    clock.ts   now() con el reloj de pruebas; errors.ts (AppError); http.ts (handlers)
  app/         páginas y app/api (handlers finos)
  features/    pantallas
  ui/          componentes base y tokens.css
  i18n/        textos en español
  db/          schema.ts y client.ts
drizzle/       migraciones
tests/         integration/ (BD real) y fakes/ (reloj, hasher y aleatorio falsos)
e2e/           Playwright contra la versión compilada
```
