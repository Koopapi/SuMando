# Plan 011 — Corte de caja

Plan técnico de `spec.md` (42 RF). Respeta `docs/constitution.md` y `docs/architecture.md`.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/cash/calc.ts` | Piezas por denominación y su total, efectivo esperado, diferencias, venta antes y después de gastos | 18, 19, 21, 24–29 |
| `server/ports/cash.ts`, `server/adapters/drizzle/cash.ts` | Configuración, formas de pago, cortes, formas del corte y movimientos | 1–42 |
| `server/services/cash/settings.ts` | Configuración de la sucursal y formas de pago (guardadas completas en su orden) | 4, 6–10 |
| `server/services/cash/cuts.ts` | Abrir, movimientos, conteo, reporte del punto de venta, cerrar, reabrir, historial; vista ciega del teléfono | 1–5, 11–42 |
| `app/api/cash/*` | Handlers; las rutas de llenado aceptan persona o teléfono de piso (`requireChecklistActor`) | 1–42 |
| `app/(app)/caja/*`, `app/piso/caja`, `features/cash/*` | Corte actual, conteo como asistente, reporte y diferencias, historial, detalle, configuración | 6–40 |

## 2. Modelo de datos (migración `0009_corte_de_caja`)

- **`cash_settings`**: `branch_id` (único), `business_id`, `mode` (`daily`, `multiple`), `floor_enabled` (RF-6, RF-10).
- **`payment_methods`**: `business_id`, `branch_id`, `name` (40), `name_key`, `is_cash`, `sort`, `archived_at`; nombre
  único entre activas de la sucursal; Efectivo se crea con la primera lectura y no se archiva (RF-7 a RF-9).
- **`cash_cuts`**: `business_id`, `branch_id`, `date`, `status` (`open`, `counted`, `closed`), `opening_fund_cents`,
  `cash_pieces` (`jsonb`: piezas por denominación en centavos), quién y cuándo abrió, contó, capturó el reporte,
  cerró y reabrió (nombre, usuario, empleado y teléfono según el caso), `note`, `snapshot` (`jsonb` al cerrar); un
  solo corte no cerrado por sucursal (índice único parcial) (RF-11 a RF-14, RF-22, RF-34 a RF-39).
- **`cash_cut_methods`**: copia al abrir de las formas de pago activas: `cut_id`, `method_id`, `name`, `is_cash`,
  `sort`, `counted_cents`, `pos_cents` (RF-9, RF-20, RF-23).
- **`cash_movements`**: `cut_id`, `kind` (`expense`, `withdrawal`, `income`), `concept` (80), `amount_cents` (> 0),
  quién y cuándo; `cancelled_at`, `cancelled_by`, `cancel_reason` (RF-15 a RF-17).
- **`audit_log`**: tipos `cash_cut` y `cash_settings` (RF-42).

## 3. Algoritmos

- **Efectivo contado (RF-19).** Σ piezas × denominación, en centavos (denominaciones de la nómina, spec 009).
- **Esperado y diferencias (RF-24, RF-25).** Esperado = POS efectivo + fondo + ingresos − gastos − retiros;
  diferencia de efectivo = contado − esperado; de las demás = contado − POS. Solo movimientos no cancelados.
- **Venta (RF-27, RF-28).** Antes de gastos = contado − fondo − ingresos + gastos + retiros + Σ demás formas;
  después = antes − gastos − retiros. Diferencia total = Σ diferencias.
- **Un corte a la vez (RF-12, RF-13).** Con el cerrojo de la sucursal: no hay otro no cerrado y, en modo diario,
  ninguno de la fecha de hoy.

## 4. Contrato de la API

| Ruta | Quién | Entrada / salida |
|---|---|---|
| `GET/PUT /api/cash/settings` | persona (cambiar: dueño) | `{ mode, floorEnabled, methods: [{ id?, name }] }` |
| `GET /api/cash/current` | persona o teléfono | corte abierto (ciego para el teléfono) |
| `POST /api/cash/cuts` | persona o teléfono | `{ fund, employeeId? }` → corte |
| `POST /api/cash/cuts/[id]/[action]` | `movement`, `cancel-movement`, `count`, `deliver`: persona o teléfono; `pos`, `close`: persona; `reopen`: dueño | corte |
| `GET /api/cash/cuts`, `GET /api/cash/cuts/[id]` | persona | historial y detalle |

Errores nuevos: `cut_open` (409, RF-12), `cut_today` (409, RF-13), `cut_state` (409, RF-22, RF-37),
`cut_incomplete` (409, RF-35), `invalid_pieces` (ya existe, 422, RF-21), `floor_not_allowed` (403, RF-33).

## 5. Decisiones técnicas

- **El conteo se guarda como borrador** mientras el corte está abierto y se congela al entregarlo; así el cajero no
  pierde lo capturado si se le cierra la pantalla.
- **Vista ciega armada en el servidor**: la del teléfono no lleva reporte, esperado, diferencias ni ventas.
- **El teléfono de piso reutiliza la sesión de la spec 010**; la configuración de la sucursal decide si puede hacer
  cortes.
- **Las denominaciones son las de la hoja de pago** (spec 009), en un solo lugar.

## 6. Dependencias

Ninguna nueva.

## 7. Estrategia de tests

- **Unitarios**: piezas y total, esperado, diferencias, venta, la hoja de referencia (RF-18, 19, 21, 24–29).
- **Integración**: permisos, configuración y formas de pago, abrir (uno a la vez, diario), movimientos y cancelación,
  conteo y entrega, reporte, cierre con faltantes, reapertura, historial, teléfono de piso (habilitado o no, a
  ciegas), registro (RF-1–42).
- **E2E de escritorio** (`e2e/corte.spec.ts`): configuración, el cajero en el teléfono abre, gasta y cuenta, el
  administrador captura el reporte y cierra con una diferencia, el dueño reabre; páginas en `qa-sweep`.

## 8. Entregas

1. **Dominio y esquema**. 2. **Servicios y API**. 3. **Pantallas**. 4. **Cierre**.

## Ajustes al construir

- El asistente de conteo entrega al terminar («Terminar»); el borrador del conteo queda disponible por la API
  (`count`) aunque la pantalla entrega de una vez.
- Reabrir se rechaza si ya hay otro corte abierto en la sucursal (un solo corte no cerrado).
- Corte de caja está en «Más» y en el menú lateral después de Checklists; el inicio lo suma en «Operación diaria»
  y, sin módulos pendientes, deja de mostrar «Próximamente». En el teléfono de piso aparece si la sucursal lo
  permite.

