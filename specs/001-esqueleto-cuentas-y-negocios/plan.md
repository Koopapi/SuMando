# Plan 001 — Esqueleto, cuentas y negocios

Plan técnico de `spec.md`. Respeta `docs/constitution.md` y `docs/architecture.md`. Lo que aquí se decide de forma
general (estructura, tests, despliegue) se copia a `docs/architecture.md` y a `AGENTS.md` en la tarea que lo
construye.

## 1. Módulos

Todo vive en `apps/web/src` salvo que se indique. Las capas son las de `docs/architecture.md`.

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/text` | Normalizar correos (minúsculas, sin espacios exteriores) y nombres (recorte, espacios internos a uno, clave en minúsculas para unicidad); límites de 1 a 60 caracteres | RF-9, RF-19, RF-20 |
| `domain/auth` | Política de contraseña (mínimo 8); generador de contraseña temporal (10 caracteres, alfabeto sin `0 O 1 l I`) a partir de una fuente aleatoria inyectada; regla de bloqueo (5 fallos → 15 min) y de caducidad de sesión (30 días desde el último uso) a partir de un reloj inyectado | RF-6, RF-7, RF-10, RF-11 |
| `domain/access` | Quién puede qué: el dueño todo; el administrador solo sus sucursales activas; acciones reservadas al dueño; guardia del último dueño; resolución de la sucursal activa (recordada → única → elegir → ninguna) | RF-25, RF-26, RF-30 a RF-34, RF-36 a RF-38 |
| `server/ports` | `Clock` (`now()`), `PasswordHasher` (`hash`, `verify`), `RandomSource` (bytes y enteros) | transversal |
| `server/adapters` | Cliente Drizzle y repositorios (users, businesses, branches, memberships, sessions, audit); hasher Argon2id; reloj del sistema con desfase de pruebas; aleatorio de `node:crypto` | transversal |
| `server/services/setup` | Crear la primera cuenta del dueño solo si no hay cuentas | RF-1 a RF-3 |
| `server/services/auth` | Entrar, salir, validar sesión en cada petición, cambio de contraseña, exigencia de cambio con temporal | RF-4 a RF-9, RF-12 a RF-16 |
| `server/services/people` | Alta de personas con temporal, rol, sucursales, desactivar, reactivar, restablecer contraseña | RF-11, RF-14, RF-23 a RF-31 |
| `server/services/businesses` | Negocio con primera sucursal, más sucursales, renombrar, archivar, reactivar | RF-17 a RF-22 |
| `server/services/active-branch` | Elegir y recordar la sucursal activa; comprobar acceso a una sucursal | RF-32 a RF-38 |
| `server/services/audit` | Escribir el registro de cambios dentro de la misma transacción que el cambio | RF-42 |
| `app/api/**` | Handlers finos: validan con zod, llaman a un servicio, traducen errores a `{ error: { code, message } }` | todos los de escritura |
| `app/(pages)` | `/setup`, `/login`, `/cambiar-contrasena`, `/elegir-sucursal`, `/` (inicio), `/negocios`, `/personas`, `/offline` | RF-1, RF-4, RF-12, RF-32, RF-35, RF-38 a RF-41 |
| `features/*` | Pantallas: muestran lo que devuelve el servidor y envían formularios a `app/api` | interfaz |
| `ui/*` | Componentes base mínimos (botón, campo, aviso, tarjeta, estructura de página, diálogo) y `tokens.css`; la spec 002 los formaliza | NF móvil primero |
| `i18n/es/*.ts` | Diccionario tipado en español; test que detecta texto suelto en componentes y páginas | NF idioma |
| `proxy.ts` | Redirecciones baratas: sin sesión → `/login`; sin cuentas → `/setup`; con temporal → `/cambiar-contrasena`. La decisión real la toman los servicios | RF-1, RF-4, RF-12 |
| `public/manifest.webmanifest`, `public/sw.js`, iconos | Instalación como aplicación y página propia sin conexión | RF-39, RF-40 |
| `tests/integration`, `e2e/` | Tests con BD real y E2E contra la versión compilada; barrido de pantallas | NF |
| `.github/workflows/ci.yml` | Revisión automática en cada pull request y en `pruebas` y `main` | NF publicación |
| `Dockerfile`, `scripts/migrate.mjs`, Coolify | Imagen de producción, migración al arrancar, app de pruebas en el VPS | NF publicación |

## 2. Modelo de datos

PostgreSQL 16, Drizzle, una migración `0000_esqueleto`. Claves `uuid` (`gen_random_uuid()`), fechas `timestamptz`.
Nada se borra: `archived_at`, `is_active`, `revoked_at`.

| Tabla | Columnas | Notas |
|---|---|---|
| `users` | `id`, `name` (60), `email` (254, única, guardada normalizada), `password_hash`, `role` (`owner` \| `admin`), `must_change_password` (bool), `is_active` (bool), `failed_login_attempts` (int), `locked_until` (null), `last_branch_id` (→ `branches`, null), `created_by` (→ `users`, null), `created_at`, `updated_at` | RF-9, RF-23, RF-24, RF-6, RF-12, RF-28, RF-34 |
| `businesses` | `id`, `name` (60), `name_key` (60, única), `archived_at` (null), `created_by`, `created_at`, `updated_at` | `name_key` es el nombre normalizado (RF-19) |
| `branches` | `id`, `business_id` (→ `businesses`), `name` (60), `name_key` (60), `archived_at` (null), `created_by`, `created_at`, `updated_at`; única (`business_id`, `name_key`) | RF-17 a RF-21 |
| `memberships` | `id`, `user_id`, `branch_id`, `role` (`admin`, único valor hoy), `created_by`, `created_at`; única (`user_id`, `branch_id`) | Acceso del administrador por sucursal (RF-25). El dueño no tiene filas: su acceso es por rol (RF-26). La columna `role` existe para que specs futuras puedan dar roles distintos por sucursal sin rehacer el modelo (constitución, principio 7) |
| `sessions` | `id`, `token_hash` (único, SHA-256 del token), `user_id`, `active_branch_id` (null), `user_agent` (200, null), `created_at`, `last_seen_at`, `expires_at`, `revoked_at` (null) | RF-7, RF-8, RF-14, RF-28, RF-34 |
| `audit_log` | `id` (bigserial), `actor_id` (→ `users`, null solo en el primer arranque), `action` (60), `entity_type` (30), `entity_id`, `business_id` (null), `branch_id` (null), `before` (jsonb, null), `after` (jsonb, null), `created_at` | RF-42; los snapshots nunca incluyen `password_hash` |

Índices: `sessions(user_id)`, `sessions(expires_at)`, `memberships(branch_id)`, `branches(business_id)`,
`audit_log(entity_type, entity_id)`, `audit_log(created_at)`.

Las specs siguientes añaden `business_id` o `branch_id` a cada tabla nueva según corresponda (catálogo por
negocio, operación por sucursal), como manda la constitución.

## 3. Algoritmos

- **Entrar** (RF-4 a RF-6, RF-9): normalizar correo → buscar usuario. Si no existe, verificar contra un hash
  ficticio para que el tiempo de respuesta no delate la existencia → `invalid_credentials`. Si `locked_until` es
  futuro → `account_locked` con los minutos que faltan (RF-6 exige indicarlo). Verificar contraseña; si falla,
  `failed_login_attempts + 1` y, al llegar a 5, `locked_until = ahora + 15 min` y contador a 0 → `invalid_credentials`.
  Si acierta pero `is_active` es falso → `invalid_credentials` (mismo mensaje, RF-5). Si acierta: contador a 0,
  crear sesión y resolver sucursal activa.
- **Sesión** (RF-7, RF-8, RF-14, RF-28): token de 32 bytes aleatorios en base64url; en BD solo su SHA-256; cookie
  `mando_session` HttpOnly, SameSite=Lax, Secure fuera de desarrollo, 30 días. En cada petición: buscar por hash,
  rechazar si `revoked_at` o `expires_at` vencido o usuario inactivo; si `last_seen_at` tiene más de una hora,
  actualizar `last_seen_at` y `expires_at = ahora + 30 días` (caducidad deslizante sin escribir en cada petición).
  Cerrar sesión marca `revoked_at` de esa sesión; restablecer contraseña o desactivar marca todas las del usuario.
- **Contraseña temporal** (RF-11 a RF-14, RF-29): 10 caracteres del alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789`
  elegidos con la fuente aleatoria; se guarda hasheada, `must_change_password = true`, se revocan las sesiones y
  el texto se devuelve una sola vez en la respuesta del alta o del restablecimiento. Con `must_change_password`,
  el servidor solo acepta `POST /api/auth/password` y `GET /cambiar-contrasena`; lo demás responde
  `password_change_required` (RF-12).
- **Sucursal activa** (RF-32 a RF-34, RF-36, RF-38): `accesibles` = todas las sucursales activas si el usuario es
  dueño; si no, sus membresías cuyas sucursales siguen activas. Si `sessions.active_branch_id` está en
  `accesibles`, se mantiene; si no, se prueba `users.last_branch_id`; si no, con exactamente una se activa sola;
  con ninguna, estado `none` (aviso RF-38); con varias, estado `choose` (pantalla de elegir). Se ejecuta en
  `requireBranch()` en cada página y handler de sucursal, así una reasignación o un archivo surten efecto en la
  siguiente acción. Al elegir, se escribe en la sesión y en `users.last_branch_id`.
- **Acceso a una sucursal** (RF-37): `requireBranchAccess(sesión, branchId)` responde `not_found` tanto si la
  sucursal no existe como si el usuario no tiene acceso, para no revelar cuál de las dos.
- **Último dueño** (RF-30): antes de desactivar o cambiar el rol de un dueño, contar dueños activos distintos
  de él; si es 0, `last_owner`.
- **Registro de cambios** (RF-42): cada servicio de escritura abre una transacción, aplica el cambio y escribe
  la fila de `audit_log` con `before` y `after` como objetos planos sin hashes; si falla cualquiera, no queda nada.
- **Reloj de pruebas**: `server/clock.ts` expone `now()`; fuera de producción `/api/dev/clock` suma un desfase
  (adelantar horas para probar el bloqueo de 15 minutos y la caducidad a 30 días en E2E). Los servicios reciben
  el reloj como puerto; los tests unitarios inyectan uno falso.

## 4. Contrato de la API

Errores: `{ "error": { "code": "…", "message": "…" } }` con el mensaje en español salido del diccionario;
`params` opcional (por ejemplo, minutos restantes). Cuerpos JSON de hasta 16 KB; validación con zod y `validation`
(422) ante cualquier campo inválido. Sin sesión válida: `unauthorized` (401). Sin permiso: `forbidden` (403).
Rutas de sucursal inaccesible o inexistente: `not_found` (404). Las páginas leen con los servicios directamente
desde componentes de servidor; la API es para escrituras y para lo que la interfaz cliente necesita refrescar.

| Ruta | Entrada | Salida | Errores |
|---|---|---|---|
| `GET /api/setup` | — | `{ needed: boolean }` | — |
| `POST /api/setup` | `{ name, email, password }` | `201 { user }` e inicia sesión | `setup_done` (409), `password_too_short`, `validation` |
| `POST /api/auth/login` | `{ email, password }` | `200 { next: "/" \| "/elegir-sucursal" \| "/cambiar-contrasena" }` | `invalid_credentials` (401), `account_locked` (423, `params.minutes`) |
| `POST /api/auth/logout` | — | `204` | — |
| `POST /api/auth/password` | `{ currentPassword, newPassword }` | `204` | `password_mismatch`, `password_too_short` |
| `GET /api/me` | — | `{ user, activeBranch, branches: [{ business, branches[] }] }` | `unauthorized` |
| `PUT /api/session/branch` | `{ branchId }` | `200 { activeBranch }` | `not_found` |
| `GET /api/businesses` | — | `{ businesses: [{ …, branches[] }] }` (incluye archivados con su marca) | `forbidden` si no es dueño |
| `POST /api/businesses` | `{ name, firstBranchName }` | `201 { business, branch }` | `duplicate_name`, `name_invalid` |
| `PATCH /api/businesses/[id]` | `{ name }` | `200 { business }` | `duplicate_name`, `name_invalid`, `not_found` |
| `POST /api/businesses/[id]/archive` · `/reactivate` | — | `200 { business }` | `not_found` |
| `POST /api/businesses/[id]/branches` | `{ name }` | `201 { branch }` | `duplicate_name`, `name_invalid`, `not_found` |
| `PATCH /api/branches/[id]` | `{ name }` | `200 { branch }` | `duplicate_name`, `name_invalid`, `not_found` |
| `POST /api/branches/[id]/archive` · `/reactivate` | — | `200 { branch }` | `not_found` |
| `GET /api/people` | — | `{ people: [{ …, role, isActive, branchIds[] }] }` | `forbidden` |
| `POST /api/people` | `{ name, email, role, branchIds[] }` | `201 { person, temporaryPassword }` | `duplicate_email`, `name_invalid`, `validation` |
| `PATCH /api/people/[id]` | `{ name?, role?, branchIds? }` | `200 { person }` | `last_owner`, `not_found` |
| `POST /api/people/[id]/deactivate` | — | `200 { person }` | `last_owner`, `not_found` |
| `POST /api/people/[id]/reactivate` | — | `200 { person, temporaryPassword }` | `not_found` |
| `POST /api/people/[id]/reset-password` | — | `200 { temporaryPassword }` | `not_found` |
| `POST /api/dev/seed` · `POST /api/dev/reset` · `POST/DELETE /api/dev/clock` | datos de siembra / desfase | según el caso | `404` salvo con `DEV_ENDPOINTS=1` |

Todas las rutas de negocios y personas exigen rol dueño en el servicio, no solo en la página (RF-31).

## 5. Decisiones técnicas

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Autenticación propia (correo y contraseña, sesiones en BD) | Auth.js / NextAuth | Hacen falta contraseña temporal con cambio obligatorio, bloqueo por intentos y revocar sesiones de una persona; con una librería de OAuth eso es nadar contra corriente. Son pocas cuentas y el modelo cabe en tres funciones |
| Sesión opaca en BD con cookie HttpOnly | JWT firmado | RF-14 y RF-28 exigen cerrar sesiones ajenas al instante; un JWT no se puede revocar sin una lista de bloqueo, que ya es una tabla |
| Argon2id con `@node-rs/argon2` | `bcryptjs` | Es la recomendación actual y trae binarios precompilados para la imagen de Docker; si el binario fallara en el VPS, `bcryptjs` es el plan B sin cambiar el puerto `PasswordHasher` |
| Rol global (`users.role`) + membresías por sucursal | Rol por sucursal en todas las cuentas | El dueño ve todo incluso lo futuro (RF-26), así que no puede depender de filas; el administrador se limita a sucursales (RF-25). `memberships.role` queda para roles por sucursal en specs posteriores |
| Escrituras por handlers en `app/api` + `fetch` desde la interfaz; lecturas de página desde servicios en componentes de servidor | Server Actions | Es lo que fija `docs/architecture.md` y lo que permite probar los handlers en integración con un `Request` sin navegador |
| Bloqueo de intentos en la tabla `users` | Redis o contador en memoria | Es por cuenta, no por IP; sobrevive reinicios y no mete otro servicio |
| Service worker escrito a mano (solo página sin conexión) | Serwist o next-pwa | RF-40 pide una página propia sin conexión y nada más; una dependencia de precaché completa traería más riesgo que valor |
| `proxy.ts` solo redirige; los servicios deciden | Autorización en el proxy | El proxy no tiene BD; la verdad está en `requireSession()` y `requireBranch()` dentro de cada página y handler |
| Identificadores `uuid` | Enteros seriales | No revelan cuántos registros hay y no chocan al copiar datos entre entornos |
| E2E contra `next build` + `next start` en `.next-e2e`, BD `mando_e2e`, puerto 3500; desarrollo en el 3400 | `next dev` | Lección de Waifu Baker: el modo desarrollo dio fallos intermitentes en CI. Los puertos no chocan con los de Waifu Baker |
| Datos de E2E por `POST /api/dev/seed` con los mismos servicios | Sembrar recorriendo pantallas | Más rápido y no depende de pantallas que aún cambian; solo existe con `DEV_ENDPOINTS=1` |
| Imagen Docker `node:24-bookworm-slim`, Next en modo `standalone`, migración al arrancar con `scripts/migrate.mjs` | Alpine; migrar desde la CI | glibc evita sorpresas con binarios nativos; migrar al arrancar garantiza que la app y la BD van juntas y no requiere acceso a la BD desde GitHub |
| Nombres de BD `mando_dev`, `mando_test`, `mando_e2e` en el Postgres 16 de Homebrew; `mando_test` y `mando_e2e` se recrean en cada ejecución | Una sola BD | Igual que Waifu Baker: los tests nunca tocan los datos de desarrollo |
| TypeScript 5 y `postgres` 3 (las versiones probadas con Drizzle 0.45 en Waifu Baker) | TypeScript 7 y `postgres` 4, recién publicados | Lo probado primero; se suben cuando Drizzle y Next los declaren compatibles |

Variables de entorno: `DATABASE_URL`, `DEV_ENDPOINTS` (1 solo en desarrollo y E2E), `NEXT_DIST_DIR` (E2E),
`PORT`. No hace falta secreto de firma: la sesión es opaca.

Cabeceras de seguridad desde el primer día (como Waifu Baker): `X-Frame-Options: DENY`, `nosniff`,
`Referrer-Policy`, `Permissions-Policy` sin sensores. HSTS y CSP llegan con la spec 010.

## 6. Dependencias

| Paquete | Para qué |
|---|---|
| `next` 16, `react`, `react-dom` | Marco de la PWA (constitución, principio 1) |
| `typescript` 5, `@types/node`, `@types/react`, `@types/react-dom` | Tipos estrictos |
| `tailwindcss` 4, `@tailwindcss/postcss` | Estilos con tokens; base del sistema de diseño de la 002 |
| `drizzle-orm`, `drizzle-kit`, `postgres` 3 | Esquema, migraciones y cliente de PostgreSQL |
| `zod` | Validar entradas de los handlers |
| `@node-rs/argon2` | Hash de contraseñas (Argon2id) |
| `server-only` | Impide que un módulo de servidor llegue al navegador |
| `vitest`, `@playwright/test` | Tests unitarios, de integración y E2E (constitución, principio 5) |
| `eslint`, `eslint-config-next`, `@eslint/eslintrc` | Revisión de código |
| `tsx` | Ejecutar scripts TypeScript (migración en Docker usa `.mjs` y no lo necesita) |

Ninguna librería de componentes ni de iconos en esta spec: los componentes base son propios y la 002 decide si
hace falta alguna.

## 7. Estrategia de tests

Nombres `test_s001_rfN_<qué_comprueba>`; los E2E declaran «spec 001» en su primera línea y nombran sus pasos con
«RF-N». `node ../../scripts/rf-coverage.mjs ../../specs/001-esqueleto-cuentas-y-negocios` escribe `validation.md`.

| Grupo | Qué cubre | RF |
|---|---|---|
| Unitarios de `domain` (reloj y aleatorio falsos) | Normalización, límites, política de contraseña, temporal sin ambiguos, bloqueo y caducidad, acceso por rol, último dueño, resolución de sucursal activa | RF-6, RF-7, RF-9, RF-10, RF-11, RF-19, RF-20, RF-25, RF-26, RF-30, RF-32 a RF-34, RF-36, RF-38 |
| Unitarios de `services` con repositorios en memoria | Reglas de cada caso de uso sin BD | RF-2, RF-3, RF-5, RF-12 a RF-16, RF-17, RF-18, RF-21 a RF-24, RF-27 a RF-29 |
| Integración (`tests/integration`, BD `mando_test` real) | Repositorios, transacciones, unicidad, auditoría, handlers llamados con `Request`, **aislamiento**: un administrador no ve ni opera sucursales ajenas | RF-1, RF-3, RF-6, RF-8, RF-14, RF-19, RF-24, RF-28, RF-31, RF-35 (datos), RF-37, RF-42 |
| E2E (`e2e/`, versión compilada) | El recorrido del criterio de finalización, el cambio de sucursal en dos toques, la temporal mostrada una vez, el aviso sin sucursal, la instalación (manifest) y la página sin conexión | RF-1, RF-2, RF-4, RF-5, RF-8, RF-11 a RF-13, RF-17, RF-23, RF-25, RF-28, RF-32, RF-33, RF-35, RF-36, RF-38 a RF-41 |
| Barrido (`e2e/qa-sweep.spec.ts`) | Todas las páginas en escritorio, tableta y móvil: consola, respuestas, desbordes, controles sin nombre | NF |
| `i18n.test.ts` | Ningún texto en español fuera del diccionario; cada código de error tiene mensaje | NF idioma |

En el día a día se corre `pnpm test` y el E2E de escritorio; la suite E2E completa (escritorio, Pixel 7, iPhone 14)
al cerrar la spec y en la CI de `pruebas`.

## 8. Entregas

| Entrega | Valor demostrable | RF |
|---|---|---|
| E1 — Esqueleto técnico | `pnpm dev` sirve una página; `pnpm test` y `pnpm e2e` en verde con tests triviales; BD migrada; diccionario y componentes base; comandos anotados en `AGENTS.md` | NF |
| E2 — Primer arranque y sesión | Crear al dueño, entrar, salir, bloqueo, cambio de contraseña obligatorio | RF-1 a RF-16 |
| E3 — Negocios y sucursales | El dueño da de alta Pastatti y Pirrus con sus sucursales, renombra, archiva y reactiva, con auditoría | RF-17 a RF-22, RF-42 |
| E4 — Personas y accesos | Alta de administradores con temporal, sucursales, desactivar, reactivar, restablecer; aislamiento probado | RF-11, RF-14, RF-23 a RF-31, RF-37 |
| E5 — Sucursal activa e inicio | Elegir y cambiar de sucursal, recordarla, aviso sin sucursal, pantalla de inicio | RF-32 a RF-38, RF-41 |
| E6 — PWA, calidad y publicación | Instalable con página sin conexión, barrido en verde, CI en GitHub, imagen Docker, app de pruebas en Coolify, `validation.md` | RF-39, RF-40, NF |

## Pendiente de confirmar con el dueño

- Cómo está montado Coolify en el VPS: si las apps se construyen con un Dockerfile del repo o con la compilación
  automática de Coolify, y si la base de datos de pruebas la crea Coolify como recurso o ya existe un Postgres.
  El plan asume Dockerfile del repo y Postgres 16 como recurso de Coolify; si es distinto, cambia solo la tarea
  T35.
- El repositorio de GitHub de Mando (aún no existe): nombre y si va en la misma cuenta que Waifu Baker.
