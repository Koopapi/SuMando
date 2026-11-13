# AGENTS.md — Mando

## Proyecto
PWA para llevar el control administrativo de varios negocios que operan las mismas personas: nómina, inventarios,
requisiciones y reportes, cada negocio con su información y cada persona con su rol en cada negocio.
Monorepo pnpm: `apps/web` (Next.js + TypeScript + Tailwind), PostgreSQL 16 con Drizzle. Despliegue con Coolify en
el VPS propio.

## Proceso (desarrollo guiado por specs)
1. **Entrevista y spec**: con la skill `spec-generator` (preguntas de una en una, máximo 6), `specs/NNN-nombre/spec.md`
   con requisitos en EARS (RF-1, RF-2…). Se pide aprobación explícita al dueño.
2. **Plan**: `plan.md` con `docs/templates/plan-template.md`, respetando `docs/constitution.md` y `docs/architecture.md`.
3. **Tareas**: `tasks.md` con `docs/templates/tasks-template.md`: tareas de 20 a 30 minutos, con RF, «Depende de» y
   «Hecho cuando», agrupadas en entregas, y su tabla de cobertura.
4. **Implementación** tarea a tarea, con el test antes que el código.
5. **Validación** RF por RF (`scripts/rf-coverage.mjs`, escribe `validation.md`) y E2E de la spec en verde.
6. **Pull request** a `main`; el dueño revisa, prueba y mergea (al mergear se publica en `sumando.com.mx`).

## Comandos
Desde `apps/web` (pnpm 10 por corepack, Node 24; PostgreSQL 16 local de Homebrew: `pg_ctl -D /opt/homebrew/var/postgresql@16 start`):
- `pnpm dev` (puerto 3400; `.env.local` se copia de `.env.example` y apunta a la BD `mando_dev`), `pnpm typecheck`, `pnpm lint`
- `pnpm test` (Vitest: proyecto `unit` en `src/**/*.test.ts` y `integration` en `tests/integration`, que recrea la BD
  `mando_test` y aplica las migraciones en cada ejecución)
- `pnpm e2e` (compila en `.next-e2e` y corre Playwright contra `next start` en el puerto 3500 con la BD `mando_e2e`,
  que se recrea; proyectos `chromium-desktop`, `pixel-7` e `iphone-14` tras un paso `warmup`). `pnpm e2e:desktop` solo
  escritorio. Un proyecto suelto, con la compilación ya hecha: `pnpm exec playwright test --project=iphone-14`.
  Cada test empieza con la BD vacía (`e2e/fixtures.ts`) y el reloj de pruebas en la hora real.
- `pnpm db:generate --name <nombre>` y `pnpm db:migrate` (sobre `mando_dev`; `DATABASE_URL` para otra)
- `node ../../scripts/rf-coverage.mjs ../../specs/NNN-nombre` (escribe `validation.md`)
- Reloj de pruebas: `POST /api/dev/clock {"advanceHours": 2}` adelanta la hora del servidor y `DELETE` la devuelve;
  solo con `DEV_ENDPOINTS=1` (desarrollo y E2E; nunca en producción). Usa `now()` de `src/server/clock.ts`, nunca
  `new Date()`, en todo lo que dependa de la hora; los servicios reciben el reloj como puerto (`src/server/ports`).
- `/sistema`: catálogo del sistema de diseño (`src/ui`) y pantallas tipo en `/sistema/tabla`, `/sistema/captura` y
  `/sistema/asistente`; solo con `DEV_ENDPOINTS=1` (en producción, 404). Diseño en Pencil: `recursos/sumando.pen`.
- Diseño (spec 002, dirección «Tablero»): tokens en `src/ui/tokens.css` (claro en `:root`, oscuro por
  `prefers-color-scheme`); las pantallas usan solo componentes de `src/ui` (lo vigila `src/ui/theme/styles.test.ts`).
  Nombre visible «SuMando» desde `es.common.appName`. El barrido `e2e/qa-sweep.spec.ts` corre en claro y oscuro con axe.
- Textos de la interfaz: nunca literales en componentes; van en `src/i18n/es/<área>.ts`. Errores de negocio:
  `new AppError("codigo", params)` (`src/server/errors.ts`) con su mensaje en `src/i18n/es/errors.ts`;
  `src/i18n/i18n.test.ts` falla si hay texto suelto o un código sin mensaje.
- PWA: `src/app/manifest.ts`, iconos en `public/icons` y `src/app` (se regeneran desde la perilla de `src/ui/brand/logo-svg.ts` con
  `node scripts/make-icons.mjs`) y `public/sw.js`
  (solo la página `/offline` y los estáticos ya vistos; nada de captura sin conexión).
- Imagen de producción: `docker build -t mando .` desde la raíz; migra sola al arrancar (`MIGRATE_ON_START=1`, ver
  `src/instrumentation.ts`). Pasos de Coolify en `docs/despliegue.md`.
- CI: `.github/workflows/ci.yml` corre lint, tipos, Vitest y el E2E de escritorio en cada pull request y en `main`.
- Next 16 genera `apps/web/AGENTS.md` con sus avisos de cambios; sus guías están en `node_modules/next/dist/docs/`.

## Estilo y convenciones
- TypeScript estricto. Server Components por defecto; `"use client"` solo donde hay interacción.
- Identificadores en inglés; textos al usuario, documentación y specs en español.
- Capas: `domain/` no importa nada del resto; `services/` solo `domain/` y `ports/`; los handlers de `app/api`
  traducen HTTP y no contienen reglas; `features/` no calcula resultados ni permisos.
- Tests nombrados `test_sNNN_rfN_<qué comprueba>`; cada E2E declara su spec en la primera línea y nombra sus pasos
  con «RF-N».

## Reglas
- Lee `docs/constitution.md`, `docs/architecture.md` y la spec activa en `specs/` antes de tocar código.
- Cualquier cambio de comportamiento entra primero por la spec. No modifiques `specs/` salvo petición explícita.
- Se cierra una spec antes de abrir la siguiente, en el orden de `docs/roadmap.md`.
- No añadas dependencias sin justificarlas antes en el plan de la spec.
- No cambies el esquema de la base de datos fuera de una migración de Drizzle.
- Toda consulta filtra por el negocio activo; todo permiso se comprueba en el servidor.
- Git: `main` es lo publicado en `sumando.com.mx` (un solo servidor, sin app de pruebas). Cada spec o arreglo en su
  rama desde `main` y por pull request con la CI en verde. Nunca se sube directamente a `main`; solo el dueño mergea.
- Hay datos reales en producción: toda migración conserva los datos existentes (nada de borrar columnas o tablas
  con información sin un paso de traslado en la misma migración).
- Secretos solo en `.env` (fuera de git) y en Coolify. Nunca contraseñas ni tokens en el repositorio ni en el chat.
- Sin nombres de personas reales en textos, specs ni código: usar roles («el dueño», «un encargado»).
- La suite E2E completa satura la Mac: preguntar antes de correrla; en el día a día, escritorio y las E2E afectadas.
- Al terminar una tarea se informa el resultado real de los tests, también lo que falla.

## Al terminar cualquier tarea
- Ejecuta `pnpm test` (y las E2E afectadas si tocaste la interfaz) y confirma en tu respuesta qué pasa y qué no.

## Reglas de negocio
`docs/reglas-de-negocio.md` resume las reglas acordadas, con la spec de origen de cada una. Al aprobar o terminar
una spec, actualízalo en la misma tarea (estado «Aprobada» → «Vigente»). Si choca con una spec, manda la spec.
