# Arquitectura base — Mando

Referencia común para los `plan.md` de cada spec. Lo que no está aquí se decide en el plan de la spec que lo
necesite y, si es general, se añade aquí en la misma tarea.

## Stack

- Next.js (App Router) + React + TypeScript estricto, Tailwind. PWA instalable (manifest e iconos, service worker).
- PostgreSQL 16 con Drizzle ORM; el esquema solo cambia por migración.
- Vitest (unit e integración con BD real) y Playwright (E2E).
- GitHub Actions para la CI; Docker y Coolify en el VPS propio, con una sola app en `sumando.com.mx`.
- Monorepo pnpm: `apps/web`, `packages/shared` cuando haga falta compartir tipos.

## Capas

```
apps/web/src/
  domain/      reglas puras: existencias, cálculos de nómina, estados de requisición, permisos   (sin Next ni BD)
  server/
    ports/     interfaces: Clock, Storage, Mailer…
    services/  casos de uso: recibir requisición, cerrar periodo, traspasar entre negocios…
    adapters/  repositorios Drizzle, almacenamiento de archivos, correo
  app/api/     handlers finos: validan, llaman a un servicio y responden
  features/    UI: solo muestra lo que devuelve el servidor; nunca calcula resultados ni permisos
  i18n/        textos de la interfaz
```

`domain/` no importa nada del resto; `services/` importa `domain/` y `ports/`. Los tests unitarios inyectan un
reloj falso, y en desarrollo un endpoint de pruebas permite adelantar la hora (periodos de nómina, vencimientos).

Lo construido en la spec 001:

- **Puertos** (`server/ports`): `Clock`, `PasswordHasher`, `RandomSource`, agrupados en `Ports`; los adaptadores
  reales están en `server/adapters` (`ports`) y los falsos en `tests/fakes` (`fakePorts()`). Un servicio recibe
  `Ports` como argumento; nunca llama a `new Date()` ni a `crypto` directamente.
- **Hora**: `now()` de `server/clock.ts`. Con `DEV_ENDPOINTS=1`, `POST /api/dev/clock` suma un desfase y `DELETE`
  lo quita; sin esa variable el desfase es 0 y las rutas `/api/dev/*` responden 404.
- **Errores**: `AppError(code, params)` (`server/errors.ts`) con estado HTTP por código y mensaje del diccionario.
  Los handlers se envuelven con `handler()` de `server/http.ts`, que responde `{ error: { code, message, params? } }`
  y valida el cuerpo con `readJson(request, schema)` (zod, máximo 16 KB).
- **Textos**: diccionario `src/i18n/es/*.ts`; `i18n.test.ts` falla ante texto suelto en `app/`, `features/` o `ui/`.
- **Componentes base** (`src/ui`): botón, campo de texto y de contraseña, aviso, tarjeta, estructura de página,
  diálogo y estado vacío, con `tokens.css` (Tailwind 4 `@theme`). La spec 002 los formaliza.

Lo construido en la spec 003:

- **Catálogo por negocio**: los servicios de `server/services/catalog` reciben un `CatalogScope` (persona + sucursal
  activa, de `server/auth/catalog-scope.ts`) y nunca un `businessId` suelto; lo de otro negocio responde
  `not_found`. Cantidades y equivalencias van como texto en la API y como enteros (`bigint`) en `domain/catalog/units`.

Lo construido en la spec 004:

- **Recetario**: `server/services/recipes` usa el mismo `CatalogScope`. Las recetas son del negocio; los cálculos y
  las plantillas, de la sucursal activa (lo de otra sucursal responde `not_found`). La suma de insumos es pura
  (`domain/recipes/supplies.ts`, enteros en centésimas de millonésima) y la calcula siempre el servidor, también la
  vista previa. Un cálculo guardado lleva copias de nombres, porcentajes y factores, y no tiene rutas de cambio.
- **Excel sin dependencias**: `server/adapters/xlsx.ts` lee .xlsx con `zlib` de Node (zip por su directorio central y
  XML de celdas), con límites de tamaño, hojas, filas y bytes descomprimidos. `tests/support/xlsx.ts` arma archivos
  para las pruebas.

Lo construido en la spec 005:

- **Inventario**: `server/services/inventory` usa el mismo `CatalogScope`; los almacenes visibles son los de la
  sucursal activa y los del negocio completo, y todo lo demás se filtra por ellos. La existencia vive en `stock`
  (una fila por producto y almacén) y cambia con una suma atómica en la misma transacción que guarda el movimiento;
  cada renglón guarda la existencia que dejó. Los movimientos no se modifican: se cancelan con un `reversal`
  (índice único sobre `reverses_id`). El conteo compara en el servidor lo que el cliente vio al abrir; el borrador
  vive en el dispositivo. `readJson` acepta un límite de cuerpo por ruta (64 KB en inventario).

Lo construido en la spec 006:

- **Importar inventario**: `domain/inventory/sheet-import.ts` analiza la hoja «Inventario por áreas» (puro) y
  `server/services/inventory/import.ts` la guarda en una transacción con el cerrojo del negocio, con un conteo por
  área. El lector .xlsx recibe su límite de tamaño por llamada y cuenta los bytes descomprimidos solo de lo que lee
  (las fotos del libro no cuentan). El `matcher` del proxy deja fuera `/api/` para que los archivos grandes no pasen
  por su búfer de 10 MB.

Lo construido en la spec 007:

- **Requisiciones**: `server/services/requisitions` sobre el mismo alcance del inventario; la requisición es de la
  sucursal, con folio por negocio (calculado con el cerrojo del negocio). Los grupos por proveedor se fijan al
  aprobar; el historial vive en `requisition_events`. Recibir bloquea la requisición (`for update`) y registra una
  entrada de la spec 005 con `requisition_id`. Montos en centavos (`bigint`).

Lo construido en la spec 008:

- **Personal**: `server/services/personnel`; el empleado es de una sucursal y no tiene cuenta. El sueldo, los
  archivos y el registro solo van en las vistas del dueño (el servicio arma la vista según el rol y las rutas
  responden `owner_only`). El historial del expediente es `audit_log` con `entity_type = employee`, también las
  aperturas de archivos.
- **Archivos**: puerto `FileStore` (`ports.files`); en disco con `FILES_DIR` (`server/adapters/local-files.ts`,
  claves aleatorias sin datos de la persona) y en memoria en las pruebas (`tests/fakes/files.ts`). El tipo se decide
  por la firma del contenido. Se sirven solo al dueño con `Cache-Control: private, no-store`.

Lo construido en la spec 009:

- **Nómina**: `server/services/payroll`; una semana por sucursal y lunes (`payroll_weeks`), un renglón por empleado
  (`payroll_lines`) y un día marcado por fila (`payroll_days`, así dos personas no se pisan). El cálculo es puro en
  `domain/payroll/calc.ts` (centavos, media jornada con el medio centavo hacia arriba) y cada cambio devuelve la
  semana recalculada. El administrador recibe la vista sin ningún monto; montos, préstamos, cierre, hoja de pago y
  Excel responden `owner_only`. Cerrar congela lo calculado en el renglón y aplica los abonos (`loan_payments`,
  `applied`); reabrir los devuelve al saldo. Cambios con cerrojo de aviso por sucursal y semana.
- **Excel de salida**: `server/adapters/xlsx-writer.ts` escribe una hoja sin dependencias (zip con `node:zlib`).
- **Hoja de pago**: página imprimible; el menú lateral y la barra inferior llevan `print:hidden`.

Lo construido en la spec 010:

- **Checklists**: `server/services/checklists`; plantillas del negocio guardadas completas (lo que no llega se
  archiva) y hojas que copian la plantilla al abrirse (`checklist_sheet_sections`, `checklist_sheet_items`), así
  editar no cambia hojas abiertas ni el historial. Abrir y cada marca van con cerrojo de aviso por plantilla,
  sucursal y fecha. Fotos con el puerto `FileStore` (claves «negocio/uuid»).
- **Teléfono de piso**: cookie `mando_floor` con token aleatorio (en BD solo su hash, `floor_devices`), no es una
  cuenta. `server/auth/checklist-actor.ts` decide si una ruta de checklists la llama una persona o un teléfono;
  ninguna otra ruta acepta la cookie, y el proxy manda al teléfono a `/piso` (fuera de `(app)`, sin menú). Al
  habilitarlo se cierra la sesión de la persona en ese teléfono.

Lo construido en la spec 011:

- **Corte de caja**: `server/services/cash`; configuración y formas de pago por sucursal (Efectivo se crea con la
  primera lectura), un corte no cerrado por sucursal (índice único parcial) que copia las formas de pago al abrir.
  El cálculo es puro en `domain/cash/calc.ts` con las denominaciones de la nómina. El teléfono de piso entra por
  `requireChecklistActor` y la configuración de la sucursal decide si puede; su vista llega ciega del servidor (sin
  reporte, esperado, diferencias ni ventas). Al cerrar se guarda en `snapshot` lo que mostraba el corte.

## Instalación, despliegue y CI (spec 001)

- **PWA**: `app/manifest.ts` (nombre, iconos, `standalone`), `public/sw.js` escrito a mano que solo precachea
  `/offline` y guarda los estáticos ya vistos. Cualquier otra función sin conexión entra por su spec.
- **Imagen**: `Dockerfile` en la raíz (Next `standalone`, usuario sin privilegios, `HEALTHCHECK` a `/api/setup`).
  Las migraciones se aplican al arrancar desde `src/instrumentation.ts` con `MIGRATE_ON_START=1`; si fallan, el
  servidor no arranca. Guía de Coolify en `docs/despliegue.md`.
- **CI**: `.github/workflows/ci.yml` con PostgreSQL 16 como servicio: lint, tipos, Vitest y E2E de escritorio contra
  la versión compilada.
- **Barrido de pantallas**: `e2e/qa-sweep.spec.ts` recorre todas las páginas con cada perfil en escritorio, tableta y
  móvil.

## Varios negocios

- Cada tabla de negocio lleva `business_id`. Los repositorios reciben el negocio activo y filtran siempre por él;
  un test de integración por spec comprueba que un negocio no ve datos de otro.
- Una persona tiene un rol global (dueño o administrador) y, si es administrador, una membresía por sucursal
  (spec 001). El permiso se comprueba en el servicio, no en la página.
- Lo que cruza negocios (traspasos, reportes consolidados) es un caso de uso explícito con su propio permiso.

## Auditoría

Los documentos (movimientos de inventario, requisiciones, periodos de nómina) no se borran: se cancelan o se
corrigen con otro movimiento. Cada cambio guarda autor, fecha, negocio y valores anteriores.

## Git y despliegue

- `main` es lo publicado: Coolify despliega cada merge en `sumando.com.mx`. No hay app de pruebas aparte (decisión
  del dueño, 12 de noviembre de 2026). Cada spec o arreglo va en su rama (`spec/NNN-nombre`, `fix/...`, `docs/...`)
  creada desde `main` y entra por pull request con la CI en verde; se prueba en local antes de mergear.
- Nunca se sube directamente a `main`. Solo el dueño aprueba specs y mergea.
- Como producción tiene datos reales, las migraciones conservan los datos y la base tiene respaldos diarios en
  Coolify hasta que la spec 013 formalice respaldos cifrados y restauración.
- Los secretos viven en `.env` (fuera de git) y en Coolify; nunca en el repositorio.

## Lecciones que traemos de Waifu Baker

- **E2E contra la versión compilada** (`next build` + `next start`), no contra `next dev`: el modo desarrollo
  retiene memoria, recompila rutas en frío y remonta componentes, y eso produjo fallos intermitentes en la CI.
- Un paso de calentamiento antes de los E2E; cada test empieza con la BD vacía y siembra sus datos con los mismos
  servicios de la app (endpoint de desarrollo), no recorriendo pantallas.
- Tres bases de datos locales: `mando_dev` (desarrollo), `mando_test` (Vitest, recreada en cada ejecución) y
  `mando_e2e` (Playwright, recreada antes de arrancar). Puertos 3400 (desarrollo) y 3500 (E2E), distintos de los
  de Waifu Baker para poder tener los dos proyectos abiertos.
- En la Mac la suite completa en todos los dispositivos la satura: en el día a día se corre escritorio y las E2E
  afectadas; la suite completa, al cerrar una spec o en la CI.
- Validación RF por RF con `scripts/rf-coverage.mjs`: tests `test_sNNN_rfN_*` y pasos de E2E «RF-N».
- Un barrido automático de todas las pantallas (errores de consola, desbordes, controles sin nombre) en escritorio,
  tableta y móvil.
