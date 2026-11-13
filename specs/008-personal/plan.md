# Plan 008 — Personal

Plan técnico de `spec.md` (42 RF). Respeta `docs/constitution.md` y `docs/architecture.md`.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/personnel/documents.ts` | Estado de un documento (entregado, falta, vencido) por fecha de expedición y vigencia; resumen de obligatorios | 21–23 |
| `domain/personnel/files.ts` | Tipos aceptados por contenido (firma de JPG, PNG, HEIC, WEBP, PDF) y tamaño máximo | 18, 20 |
| `domain/personnel/employee.ts` | Motivos de baja, fechas de ingreso y baja, sueldo en centavos, textos del expediente | 9, 13, 28–30 |
| `domain/personnel/defaults.ts` | Los 13 documentos iniciales con su vigencia | 16 |
| `server/ports/files.ts`, `server/adapters/local-files.ts` | Puerto de archivos: guardar y leer por clave; en disco (`FILES_DIR`) en desarrollo y producción, en memoria en las pruebas | 18, 27 |
| `server/services/personnel/*` | Puestos, lista de documentos, expedientes, sueldos, altas, bajas, reingresos, cambios de sucursal, archivos y registro | 1–42 |
| `app/api/positions`, `document-types`, `employees`, `employee-files` | Handlers finos; los archivos se sirven solo al dueño con `Cache-Control: private, no-store` | 1–42 |
| `app/(app)/personal/*`, `features/personnel/*` | Lista, alta, expediente con documentos y cámara, lista de documentos y puestos | 9–39 |

## 2. Modelo de datos (migración `0006_personal`)

- **`positions`**: `business_id`, `name`, `name_key`, `archived_at`; único entre activos (RF-11).
- **`employees`**: `business_id`, `branch_id`, `name` (80), `name_key`, `position_id`, `phone` (30), `notes` (500),
  `daily_pay_cents` (`bigint`, nulo = sin sueldo, RF-14), `active`, `created_by`, marcas de tiempo.
- **`employee_periods`**: `employee_id`, `hired_on` (`date`), `left_on`, `leave_reason`, `leave_note` (RF-33).
- **`document_types`**: `business_id`, `name`, `name_key`, `required`, `validity_months`, `position`, `archived_at`
  (RF-16, RF-17).
- **`employee_files`**: `employee_id`, `document_type_id`, `storage_key` (aleatoria, sin datos de la persona),
  `original_name`, `content_type`, `size_bytes`, `issued_on`, `uploaded_by`, `uploaded_at`, `replaced_at`,
  `replaced_by`, `retired_at`, `retired_by`, `retire_reason` (RF-18 a RF-26).
- **`audit_log`**: tipos `employee`, `position`, `document_type`, `employee_file`; las aperturas de archivo son
  `employee_file.opened` (RF-40 a RF-42).

## 3. Algoritmos

- **Vencido (RF-22).** `expedición + vigencia (meses) < hoy`, con la fecha del día en la hora de la Ciudad de México
  del reloj de puertos; el mes se suma como en el calendario (31 de enero + 1 mes = 28 o 29 de febrero).
- **Tipo de archivo (RF-18, RF-20).** Se decide por la firma de los primeros bytes, no por el nombre: `FF D8 FF`
  (JPG), `89 50 4E 47` (PNG), `%PDF` (PDF), `RIFF….WEBP` (WEBP), `….ftyp` con marca `heic`, `heix`, `mif1` o `msf1`
  (HEIC).
- **Lista inicial (RF-16).** La primera lectura de documentos o expedientes del negocio crea los 13 con el cerrojo
  del negocio, así dos personas a la vez no la duplican.

## 4. Contrato de la API

| Ruta | Entrada | Salida |
|---|---|---|
| `GET/POST /api/positions`, `PATCH /api/positions/[id]`, `POST …/[id]/archive\|reactivate` | `{ name }` | puestos |
| `GET/POST /api/document-types`, `PATCH /api/document-types/[id]`, `POST …/[id]/archive\|reactivate`, `PUT /api/document-types/order` | `{ name, required, validityMonths }` / `{ ids }` | lista |
| `GET/POST /api/employees` | `{ name, positionId, hiredOn, phone?, notes?, dailyPay?, confirmDuplicate? }` | lista / 201 |
| `GET/PATCH /api/employees/[id]` | datos del expediente | `{ employee }` |
| `POST /api/employees/[id]/[action]` | `pay` `{ dailyPay }`, `terminate` `{ leftOn, reason, note? }`, `rehire` `{ hiredOn }`, `move` `{ branchId }` | `{ employee }` |
| `POST /api/employees/[id]/documents/[typeId]` | `multipart`: `file` (uno o varios), `issuedOn?`, `replace?` | `{ employee }` |
| `GET /api/employee-files/[id]`, `POST /api/employee-files/[id]/retire` | — / `{ reason }` | el archivo / `{ employee }` |

Errores nuevos: `employee_exists` (409, RF-12), `invalid_pay` (422), `invalid_date` (422), `leave_before_hire`
(422, RF-30), `employee_state` (409), `file_type` (422, RF-20), `file_size` (413, RF-20), `owner_only` (403, RF-7).

## 5. Decisiones técnicas

- **Archivos en disco por un puerto** en vez de en la base: no crecen los respaldos de PostgreSQL con fotos y el
  puerto deja cambiar después a S3 sin tocar servicios. En Coolify, un volumen persistente en `/app/data` y
  `FILES_DIR=/app/data/files` (se documenta en `docs/despliegue.md`). Descartado: `bytea` en PostgreSQL.
- **El historial del expediente es el registro de auditoría** (`audit_log`), que ya guarda quién, cuándo y el valor
  anterior; el dueño lo ve en el expediente.
- **El administrador recibe vistas sin sueldo ni archivos**: el servicio arma la vista según el rol; las rutas de
  archivo y sueldo responden `owner_only`.

## 6. Dependencias

Ninguna nueva.

## 7. Estrategia de tests

- **Unitarios**: estado y vencimiento con meses de calendario, firmas de archivo, motivos y fechas de baja, sueldo
  (RF-9, 13, 18, 20–23, 28–30).
- **Integración**: permisos por rol (sueldo y archivos), aislamiento entre sucursales y negocios, lista inicial,
  puestos y documentos, alta con aviso de duplicado, reemplazo y retiro, baja, reingreso, cambio de sucursal,
  registro y aperturas (RF-1–42).
- **E2E de escritorio** (`e2e/personal.spec.ts`): alta como administrador con foto, sueldo como dueño, documento
  vencido, baja y reingreso, sin sueldo para el administrador; volumen de 200 empleados; páginas en `qa-sweep`.

## 8. Entregas

1. **Dominio, puerto de archivos y esquema**. 2. **Servicios y API**. 3. **Pantallas**. 4. **Cierre**.
