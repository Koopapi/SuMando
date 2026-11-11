# Tareas — Spec 001

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código. Rama `spec/001-esqueleto-cuentas-y-negocios`
desde `pruebas`; al cerrar, pull request a `pruebas`.

## Entrega 1 — Esqueleto técnico

- [ ] **T1 — Monorepo y aplicación vacía**
  - RF: NF (stack)
  - Depende de: —
  - Hecho cuando: `pnpm-workspace.yaml`, `apps/web` con Next 16, TypeScript estricto, Tailwind 4, `next.config.ts`
    (`distDir` por variable, `output: "standalone"`, cabeceras de seguridad), `.env.example`; `pnpm dev --port 3400`
    sirve una página con el texto «Mando», y `pnpm lint` y `pnpm typecheck` pasan.
- [ ] **T2 — Esquema y migración inicial**
  - RF: modelo de datos (sección 2 del plan)
  - Depende de: T1
  - Hecho cuando: `src/db/schema.ts` con las seis tablas, `drizzle.config.ts`, `pnpm db:generate --name esqueleto`
    produce `drizzle/0000_esqueleto.sql` y `pnpm db:migrate` la aplica en `mando_dev` (las seis tablas existen en `psql`).
- [ ] **T3 — Vitest: unidad e integración con BD recreada**
  - RF: NF (tests)
  - Depende de: T2
  - Hecho cuando: `vitest.config.ts` con proyectos `unit` y `integration`; `tests/integration/global-setup.ts`
    recrea `mando_test` y migra; un test de integración comprueba que existen las seis tablas; `pnpm test` en verde.
- [ ] **T4 — Playwright contra la versión compilada**
  - RF: NF (tests)
  - Depende de: T1, T2
  - Hecho cuando: `playwright.config.ts` (puerto 3500, `.next-e2e`, BD `mando_e2e`, proyectos `warmup`,
    `chromium-desktop`, `pixel-7`, `iphone-14`), `e2e/reset-db.mjs`, `e2e/fixtures.ts` (vacía las tablas antes de
    cada test), `e2e/warm.ts`; un E2E trivial abre `/` y `pnpm exec playwright test --project=chromium-desktop` pasa.
- [ ] **T5 — Diccionario en español y errores de aplicación**
  - RF: NF idioma
  - Depende de: T1
  - Hecho cuando: `src/i18n/es/*.ts` tipado con `t()`; `AppError(code, params)` en `src/server/errors.ts` con su
    traducción; `src/i18n/i18n.test.ts` falla si hay texto en español fuera del diccionario o un código sin
    mensaje; `pnpm test` en verde.
- [ ] **T6 — Puertos y adaptadores: reloj, hasher, aleatorio y reloj de pruebas**
  - RF: transversal (RF-6, RF-7, RF-11)
  - Depende de: T3
  - Hecho cuando: `server/ports/{clock,password-hasher,random}.ts`; adaptadores reales (`now()` con desfase,
    Argon2id, `node:crypto`) y falsos para tests; `POST/DELETE /api/dev/clock` solo con `DEV_ENDPOINTS=1`
    (404 si no); tests `test_s001_rf7_reloj_de_pruebas_adelanta_y_vuelve` y del 404 en verde.
- [ ] **T7 — Componentes base y tokens**
  - RF: NF móvil primero
  - Depende de: T1, T5
  - Hecho cuando: `src/ui/tokens.css` y componentes `Button`, `TextField`, `PasswordField`, `Alert`, `Card`,
    `PageShell`, `Dialog`, `EmptyState` con nombre accesible y estados (cargando, error); una página `/sistema`
    (solo con `DEV_ENDPOINTS=1`) los muestra; `pnpm typecheck` y `pnpm lint` pasan.
- [ ] **T8 — Comandos anotados**
  - RF: proceso
  - Depende de: T3, T4
  - Hecho cuando: `AGENTS.md` (sección Comandos) y `apps/web/README.md` describen los comandos reales, los puertos,
    las tres bases de datos y cómo arrancar Postgres; `docs/architecture.md` incorpora lo general del plan.

## Entrega 2 — Primer arranque y sesión

- [ ] **T9 — Reglas puras de texto y contraseñas**
  - RF: RF-6, RF-7, RF-9, RF-10, RF-11, RF-19, RF-20
  - Depende de: T6
  - Hecho cuando: `domain/text` (normalizar correo y nombre, clave de unicidad, límites) y `domain/auth` (política
    de 8 caracteres, temporal de 10 sin ambiguos, bloqueo 5 → 15 min, caducidad 30 días) con tests unitarios
    `test_s001_rf6_*`, `rf7_*`, `rf9_*`, `rf10_*`, `rf11_*`, `rf19_*`, `rf20_*` en verde.
- [ ] **T10 — Servicio de primer arranque**
  - RF: RF-1, RF-2, RF-3
  - Depende de: T9
  - Hecho cuando: `services/setup` (`isSetupNeeded`, `createFirstOwner`) con tests de integración: crea al dueño
    con hash y rol `owner`; con una cuenta existente responde `setup_done`; dos peticiones simultáneas solo crean una.
- [ ] **T11 — Servicio de entrada y sesiones**
  - RF: RF-4, RF-5, RF-6, RF-7, RF-8, RF-9
  - Depende de: T10
  - Hecho cuando: `services/auth` (`login`, `logout`, repositorio de sesiones con hash de token) con tests de
    integración: entra con correo en mayúsculas; mismo mensaje para correo inexistente, contraseña mala y cuenta
    inactiva; 5 fallos bloquean 15 min aunque la sexta sea correcta y el reloj falso desbloquea; sesión caduca a los
    30 días sin uso y se desliza con uso; `logout` solo revoca esa sesión.
- [ ] **T12 — Sesión en cada petición y redirecciones**
  - RF: RF-4, RF-7, RF-12
  - Depende de: T11
  - Hecho cuando: `requireSession()` (cookie → sesión válida → usuario activo, deslizamiento si pasó una hora) y
    `proxy.ts` (sin cuentas → `/setup`; sin sesión → `/login`; con temporal → `/cambiar-contrasena`); con
    `must_change_password` cualquier otra API responde `password_change_required`; tests de integración en verde.
- [ ] **T13 — Cambio y restablecimiento de contraseña**
  - RF: RF-13, RF-14, RF-15, RF-16
  - Depende de: T11
  - Hecho cuando: `changePassword` (actual + nueva; `password_mismatch`; quita `must_change_password`) y
    `resetPassword` (temporal nueva, revoca todas las sesiones de la persona, exige cambio) con tests de integración
    `test_s001_rf13_*`, `rf14_*`, `rf15_*`, `rf16_*` en verde.
- [ ] **T14 — Handlers de arranque, entrada, salida y contraseña**
  - RF: RF-1 a RF-8, RF-10, RF-12 a RF-16
  - Depende de: T12, T13
  - Hecho cuando: `GET/POST /api/setup`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/password`,
    `GET /api/me` con zod, cookie y códigos del contrato; tests de integración que llaman a los handlers con `Request`
    (incluido el `423` con minutos y el `422` de validación).
- [ ] **T15 — Pantallas de arranque, entrada y cambio de contraseña**
  - RF: RF-1, RF-2, RF-4, RF-5, RF-8, RF-12, RF-13
  - Depende de: T7, T14
  - Hecho cuando: `/setup`, `/login`, `/cambiar-contrasena` con `features/auth`; E2E `e2e/acceso.spec.ts` con
    pasos «RF-1», «RF-2», «RF-4», «RF-5», «RF-8», «RF-12», «RF-13» en verde en escritorio y en móvil (360 px sin
    desplazamiento lateral).

## Entrega 3 — Negocios y sucursales

- [ ] **T16 — Registro de cambios**
  - RF: RF-42
  - Depende de: T6
  - Hecho cuando: `services/audit` escribe `audit_log` dentro de la transacción del cambio (autor, fecha, antes y
    después sin hashes); test de integración: un cambio que falla no deja fila; un alta deja `before = null`.
- [ ] **T17 — Servicio de negocios y sucursales: alta y renombrar**
  - RF: RF-17, RF-18, RF-19, RF-20
  - Depende de: T9, T16
  - Hecho cuando: `services/businesses` (`createBusiness` con primera sucursal, `addBranch`, `renameBusiness`,
    `renameBranch`) con tests de integración: duplicados ignorando mayúsculas y espacios (negocio global, sucursal
    por negocio), «Centro» en dos negocios distintos permitido, nombre vacío o de 61 caracteres rechazado, auditoría.
- [ ] **T18 — Archivar y reactivar**
  - RF: RF-21, RF-22
  - Depende de: T17
  - Hecho cuando: `archiveBusiness` (archiva sus sucursales), `archiveBranch`, `reactivateBusiness`,
    `reactivateBranch`; nada se borra; tests de integración en verde.
- [ ] **T19 — Handlers de negocios y sucursales con guardia de dueño**
  - RF: RF-17 a RF-22, RF-31
  - Depende de: T14, T18
  - Hecho cuando: rutas `GET/POST /api/businesses`, `PATCH /api/businesses/[id]`, `archive`, `reactivate`,
    `POST /api/businesses/[id]/branches`, `PATCH /api/branches/[id]`, `archive`, `reactivate`; `requireOwner()` en
    cada una; test de integración: un administrador recibe `forbidden` en todas aunque llame directo.
- [ ] **T20 — Pantalla de negocios**
  - RF: RF-17, RF-18, RF-21, RF-22
  - Depende de: T7, T19
  - Hecho cuando: `/negocios` lista negocios con sus sucursales (archivados aparte), crea negocio con primera
    sucursal, añade sucursal, renombra, archiva y reactiva, con errores de duplicado visibles; E2E
    `e2e/negocios.spec.ts` con pasos «RF-17», «RF-18», «RF-19», «RF-21», «RF-22» en verde.

## Entrega 4 — Personas y accesos

- [ ] **T21 — Servicio de personas: alta, rol y sucursales**
  - RF: RF-11, RF-23, RF-24, RF-25, RF-26, RF-27
  - Depende de: T13, T16, T18
  - Hecho cuando: `services/people` (`createPerson` devuelve la temporal una sola vez, `updatePerson` cambia rol y
    sucursales) con tests de integración: correo duplicado (activo o inactivo) rechazado; la temporal no queda en
    claro en BD; un dueño accede a una sucursal creada después sin membresía.
- [ ] **T22 — Desactivar, reactivar, restablecer y último dueño**
  - RF: RF-14, RF-28, RF-29, RF-30
  - Depende de: T21
  - Hecho cuando: `deactivatePerson` (revoca sesiones, rechaza entrada, conserva nombre), `reactivatePerson`
    (temporal nueva, conserva rol y sucursales), `resetPassword`; `last_owner` al desactivar o degradar al único
    dueño activo; tests de integración en verde.
- [ ] **T23 — Reglas de acceso y test de aislamiento**
  - RF: RF-25, RF-26, RF-31, RF-37
  - Depende de: T21
  - Hecho cuando: `domain/access` (`canAccessBranch`, `isOwnerAction`, `lastOwnerGuard`) con tests unitarios;
    `requireBranchAccess()` responde `not_found` igual para sucursal ajena e inexistente; test de integración
    `test_s001_rf37_un_administrador_no_ve_sucursales_ajenas` en verde.
- [ ] **T24 — Handlers de personas**
  - RF: RF-23 a RF-31
  - Depende de: T19, T22, T23
  - Hecho cuando: `GET/POST /api/people`, `PATCH /api/people/[id]`, `deactivate`, `reactivate`, `reset-password`
    con `requireOwner()`; tests de integración con `Request` (incluidos `duplicate_email`, `last_owner`, `forbidden`).
- [ ] **T25 — Pantalla de personas**
  - RF: RF-11, RF-23, RF-25, RF-27, RF-28, RF-29
  - Depende de: T7, T24
  - Hecho cuando: `/personas` lista personas con rol, estado y sucursales; alta con casillas de sucursales por
    negocio y diálogo que muestra la temporal una sola vez con botón de copiar; editar rol y sucursales; desactivar,
    reactivar y restablecer; E2E `e2e/personas.spec.ts` con pasos «RF-11», «RF-23», «RF-25», «RF-28», «RF-29» en verde.

## Entrega 5 — Sucursal activa e inicio

- [ ] **T26 — Resolución de la sucursal activa**
  - RF: RF-32, RF-33, RF-34, RF-36, RF-38
  - Depende de: T23
  - Hecho cuando: `domain/access/active-branch.ts` (`resolveActiveBranch` → `keep` / `remembered` / `only` /
    `choose` / `none`) con tests unitarios de cada rama, incluidas sucursal archivada y acceso perdido.
- [ ] **T27 — Servicio de sucursal activa**
  - RF: RF-32 a RF-38
  - Depende de: T26, T22
  - Hecho cuando: `services/active-branch` (`selectBranch` escribe en sesión y en `users.last_branch_id`,
    `requireBranch()` resuelve en cada petición); tests de integración: tras reasignar, la siguiente petición pide
    elegir; con una sola sucursal se activa sola; recordada entre entradas.
- [ ] **T28 — Elegir sucursal**
  - RF: RF-32, RF-33, RF-36, RF-38
  - Depende de: T7, T27
  - Hecho cuando: `PUT /api/session/branch` y `/elegir-sucursal` agrupada por negocio; aviso «pide al dueño que te
    asigne una sucursal» cuando no hay ninguna; E2E con pasos «RF-32», «RF-33», «RF-36», «RF-38» en verde.
- [ ] **T29 — Estructura de la aplicación y pantalla de inicio**
  - RF: RF-35, RF-41
  - Depende de: T28
  - Hecho cuando: barra superior con negocio y sucursal activa y selector que cambia en dos toques desde
    cualquier pantalla; `/` muestra nombre del usuario, negocio y sucursal, accesos a cambiar de sucursal, cambiar
    contraseña y cerrar sesión, y al dueño Negocios y Personas; E2E con pasos «RF-35», «RF-41» en escritorio y móvil.

## Entrega 6 — PWA, calidad y publicación

- [ ] **T30 — Instalación y página sin conexión**
  - RF: RF-39, RF-40
  - Depende de: T29
  - Hecho cuando: `manifest.webmanifest` (nombre, iconos 192 y 512, `display: standalone`, color), `public/sw.js`
    (precaché de `/offline` y respuesta de reserva al fallar una navegación), registro del service worker;
    E2E «RF-39» comprueba el manifest y «RF-40» pone el contexto sin conexión y ve la página propia con «Reintentar».
- [ ] **T31 — Barrido de pantallas**
  - RF: NF
  - Depende de: T30
  - Hecho cuando: `e2e/qa-sweep.spec.ts` recorre todas las páginas con dueño y con administrador en escritorio,
    tableta y móvil sin errores de consola, respuestas fallidas, desbordes ni controles sin nombre; en verde.
- [ ] **T32 — E2E del recorrido completo y proyectos móviles**
  - RF: RF-1, RF-2, RF-11, RF-12, RF-13, RF-17, RF-23, RF-25, RF-28, RF-33, RF-35
  - Depende de: T31
  - Hecho cuando: `e2e/recorrido-001.spec.ts` sigue el criterio de finalización de la spec con un paso «RF-N» por
    requisito; la suite completa pasa en `chromium-desktop`, `pixel-7` e `iphone-14` (se avisa antes de correrla).
- [ ] **T33 — CI en GitHub**
  - RF: NF publicación
  - Depende de: T32
  - Hecho cuando: `.github/workflows/ci.yml` (Postgres 16 como servicio; `pnpm lint`, `typecheck`, `test`, `build`,
    E2E de escritorio) corre en pull requests y en `pruebas` y `main`, y el primer pull request a `pruebas` sale en verde.
- [ ] **T34 — Imagen Docker y migración al arrancar**
  - RF: NF publicación
  - Depende de: T2, T30
  - Hecho cuando: `Dockerfile` multietapa (`node:24-bookworm-slim`, `pnpm install --frozen-lockfile`, `next build`
    standalone), `scripts/migrate.mjs` y `docker-entrypoint.sh` (migra y arranca); `docker build` y `docker run`
    locales contra un Postgres de Docker sirven `/setup` con HTTP 200.
- [ ] **T35 — App de pruebas en Coolify**
  - RF: NF publicación, criterio de finalización
  - Depende de: T33, T34
  - Hecho cuando: en Coolify, Postgres 16 y la app desde la rama `pruebas` con el Dockerfile, variables
    (`DATABASE_URL`, `NODE_ENV=production`), dominio provisional con HTTPS y despliegue automático al subir a
    `pruebas`; la dirección responde, el dueño crea su cuenta, instala Mando en su teléfono y hace el recorrido a mano.
- [ ] **T36 — Validación RF por RF y cierre**
  - RF: todos
  - Depende de: T35
  - Hecho cuando: `node ../../scripts/rf-coverage.mjs ../../specs/001-esqueleto-cuentas-y-negocios` escribe
    `validation.md` con «spec cumplida» (42 de 42); `docs/reglas-de-negocio.md` pasa la sección 2 a «Vigente»;
    `AGENTS.md` y `docs/architecture.md` al día; pull request a `pruebas` abierto con la CI en verde.

## Cobertura

| RF | Tareas |
|---|---|
| RF-1 | T10, T14, T15, T32 |
| RF-2 | T10, T14, T15, T32 |
| RF-3 | T10, T14 |
| RF-4 | T11, T12, T14, T15 |
| RF-5 | T11, T14, T15 |
| RF-6 | T9, T11, T14 |
| RF-7 | T6, T9, T11, T12 |
| RF-8 | T11, T14, T15 |
| RF-9 | T9, T11 |
| RF-10 | T9, T14 |
| RF-11 | T9, T21, T25, T32 |
| RF-12 | T12, T14, T15, T32 |
| RF-13 | T13, T14, T15, T32 |
| RF-14 | T13, T22 |
| RF-15 | T13, T14 |
| RF-16 | T13, T14 |
| RF-17 | T17, T19, T20, T32 |
| RF-18 | T17, T19, T20 |
| RF-19 | T9, T17, T20 |
| RF-20 | T9, T17 |
| RF-21 | T18, T19, T20 |
| RF-22 | T18, T19, T20 |
| RF-23 | T21, T24, T25, T32 |
| RF-24 | T21, T24 |
| RF-25 | T21, T23, T25, T32 |
| RF-26 | T21, T23 |
| RF-27 | T21, T24, T25 |
| RF-28 | T22, T24, T25, T32 |
| RF-29 | T22, T24, T25 |
| RF-30 | T22, T24 |
| RF-31 | T19, T23, T24 |
| RF-32 | T26, T27, T28 |
| RF-33 | T26, T27, T28, T32 |
| RF-34 | T26, T27 |
| RF-35 | T29, T32 |
| RF-36 | T26, T27, T28 |
| RF-37 | T23, T27 |
| RF-38 | T26, T27, T28 |
| RF-39 | T30 |
| RF-40 | T30 |
| RF-41 | T29 |
| RF-42 | T16, T17 |
