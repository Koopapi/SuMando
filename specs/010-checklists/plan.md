# Plan 010 — Checklists

Plan técnico de `spec.md` (49 RF). Respeta `docs/constitution.md` y `docs/architecture.md`.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/checklists/template.ts` | Días de la semana como máscara, tipos de punto, límites de texto, si una plantilla aplica en una fecha | 6, 7, 10, 11, 16 |
| `domain/checklists/sheet.ts` | «Todo en orden», puntos clave pendientes, sección lista, hoja completa, pendientes al cerrar, orden por puesto | 19, 25–28, 31, 33 |
| `server/ports/checklists.ts`, `server/adapters/drizzle/checklists.ts` | Plantillas, secciones, puntos, hojas, teléfonos de piso | 1–49 |
| `server/services/checklists/templates.ts` | Alta y guardado de la plantilla completa (secciones y puntos en orden; lo que falta se archiva) | 1, 2, 6–14 |
| `server/services/checklists/sheets.ts` | Hojas de hoy, abrir con la foto de la plantilla, palomear, comentar, foto, «Todo en orden», lista, reabrir, cerrar, historial | 3–5, 15–36, 46–48 |
| `server/services/checklists/floor.ts` | Habilitar, listar y deshabilitar teléfonos de piso; resolver el teléfono por su cookie; empleados de la sucursal | 37–45 |
| `server/auth/checklist-actor.ts` | Quién actúa en una ruta de checklists: una persona con sesión y sucursal activa, o un teléfono de piso con el empleado elegido | 38–41 |
| `app/api/checklist-templates/*`, `app/api/checklists/*`, `app/api/checklist-photos/*`, `app/api/floor-devices/*` | Handlers finos | 1–49 |
| `app/(app)/checklists/*`, `app/piso/*`, `features/checklists/*` | Hoy, hoja, historial, plantillas, teléfonos; la pantalla del teléfono de piso | 6–48 |

## 2. Modelo de datos (migración `0008_checklists`)

- **`checklist_templates`**: `business_id`, `name`, `name_key`, `days_mask` (bits 0 = lunes … 6 = domingo, 1–127),
  `archived_at`, `created_by`, marcas de tiempo; nombre único entre activas del negocio (RF-6 a RF-8).
- **`checklist_template_branches`**: `template_id`, `branch_id`; único (RF-6).
- **`checklist_sections`**: `template_id`, `name`, `position_id` (puesto, opcional), `sort`, `archived_at` (RF-9, RF-12, RF-13).
- **`checklist_items`**: `section_id`, `text` (200), `kind` (`check`, `photo`, `comment`), `is_key`, `sort`,
  `archived_at` (RF-10 a RF-13).
- **`checklist_sheets`**: `template_id`, `business_id`, `branch_id`, `date`, `status` (`open`, `closed`),
  `closed_at`, `closed_by`, `pending` (`jsonb` con lo que faltó al cerrar), marcas de tiempo; único (`template_id`,
  `branch_id`, `date`) (RF-15, RF-33).
- **`checklist_sheet_sections`**: copia al abrir: `sheet_id`, `section_id`, `name`, `position_id`, `sort`; y
  `ready_at`, `ready_by` (nombre), `ready_user_id`, `ready_employee_id`, `ready_device_id` (RF-15, RF-27).
- **`checklist_sheet_items`**: copia al abrir: `sheet_section_id`, `item_id`, `text`, `kind`, `is_key`, `sort`; y
  `done`, `comment` (500), `photo_key`, `photo_type`, `marked_at`, `marked_by` (nombre), `marked_user_id`,
  `marked_employee_id`, `marked_device_id`; único (`sheet_section_id`, `item_id`) (RF-20 a RF-24, RF-41).
- **`floor_devices`**: `business_id`, `branch_id`, `name` (40), `token_hash` (único), `enabled_by`, `created_at`,
  `last_used_at`, `disabled_at`, `disabled_by` (RF-37 a RF-44).
- **`audit_log`**: tipos `checklist_template`, `checklist_sheet`, `floor_device` (RF-49).

## 3. Algoritmos

- **Aplica hoy (RF-16, RF-18).** Fecha de la Ciudad de México del reloj de puertos; día de la semana con lunes = 0;
  la plantilla aplica si su máscara tiene ese bit y la sucursal está en sus sucursales.
- **Abrir la hoja (RF-15, RF-17).** Con el cerrojo de (plantilla, sucursal, fecha): inserta la hoja si no existe y
  copia las secciones y puntos activos en su orden; dos teléfonos a la vez obtienen la misma.
- **Guardar plantilla (RF-9 a RF-14).** Llega completa: secciones y puntos con su `id` si ya existían; el orden del
  arreglo es el `sort`; lo que existía y no llega se archiva; nada toca las hojas ya abiertas.
- **Orden por puesto (RF-19).** Secciones del puesto del empleado elegido primero, el resto después, cada grupo en
  su orden.
- **Cerrar (RF-31 a RF-33).** Lista la última sección → cierra sola. Cierre manual: guarda en `pending` las
  secciones no listas con sus puntos clave sin palomear.

## 4. Contrato de la API

| Ruta | Quién | Entrada / salida |
|---|---|---|
| `GET/POST /api/checklist-templates`, `GET/PUT /api/checklist-templates/[id]`, `POST …/[id]/archive\|reactivate` | persona | plantilla completa |
| `GET /api/checklists` | persona o teléfono | plantillas de hoy con su avance |
| `GET /api/checklists/[templateId]/[date]` | persona o teléfono (solo hoy) | la hoja |
| `POST /api/checklists/[templateId]/[date]/[action]` | `check`, `uncheck`, `comment`, `all-ok`, `ready`: persona o teléfono; `reopen-section`, `close`: persona | la hoja |
| `POST /api/checklists/[templateId]/[date]/photo/[itemId]` | persona o teléfono, `multipart` | la hoja |
| `GET /api/checklists/history` | persona | hojas de la sucursal |
| `GET /api/checklist-photos/[id]` | persona; teléfono si la hoja está abierta | la foto (`private, no-store`) |
| `GET/POST /api/floor-devices`, `POST /api/floor-devices/[id]/disable` | persona | teléfonos; al habilitar, la cookie del teléfono y se cierra la sesión de la persona en ese teléfono |
| `GET /api/floor/employees` | teléfono | empleados activos de la sucursal |

Errores nuevos: `template_scope` (422, RF-7), `key_pending` (409, RF-28), `photo_required` (422, RF-22),
`section_ready` (409, RF-29), `sheet_closed` (409, RF-34), `sheet_past` (409, RF-36), `not_today` (422),
`employee_required` (422, RF-40), `device_disabled` (401, RF-44).

## 5. Decisiones técnicas

- **El teléfono de piso es una sesión aparte** (cookie `mando_floor`, token aleatorio con su hash en
  `floor_devices`), no una cuenta: las rutas de siempre piden la sesión de persona y lo rechazan solas (RF-39); solo
  las rutas de checklists y `/piso` aceptan la cookie del teléfono. Descartado: un usuario «piso» por sucursal, que
  entraría a todo lo que entra un administrador.
- **Al habilitar se cierra la sesión de la persona en ese teléfono**: el teléfono queda solo con la cookie de piso.
- **La hoja copia la plantilla al abrir** (secciones y puntos), así editar la plantilla no cambia hojas abiertas ni
  el historial (RF-13 a RF-15).
- **Las fotos usan el puerto `FileStore`** de la spec 008 y la misma detección de tipo por contenido (sin PDF).
- **La plantilla se guarda completa** en un solo `PUT`: el editor arma secciones y puntos en pantalla y el servidor
  calcula altas, cambios, orden y archivados.

## 6. Dependencias

Ninguna nueva.

## 7. Estrategia de tests

- **Unitarios**: máscara de días, aplica hoy, «Todo en orden», clave pendiente, orden por puesto, pendientes al
  cerrar (RF-6, 7, 16, 19, 25–28, 31, 33).
- **Integración**: permisos y aislamiento, plantillas (duplicados, archivar, orden, cambios sin tocar hojas), abrir
  una sola hoja, palomear, foto, comentario, lista, reabrir, cerrar con pendientes, hoja de ayer, teléfono de piso
  (solo checklists de hoy de su sucursal, empleado obligatorio, deshabilitar al instante), fotos y registro (RF-1–49).
- **E2E de escritorio** (`e2e/checklists.spec.ts`): el dueño arma una plantilla; un administrador habilita un
  teléfono de piso; el empleado llena y da por lista su sección con foto; el administrador cierra con pendientes y
  ve el historial; volumen de 150 puntos; páginas en `qa-sweep`.

## 8. Entregas

1. **Dominio y esquema**. 2. **Servicios y API**. 3. **Pantallas** (incluido `/piso`). 4. **Cierre**.
