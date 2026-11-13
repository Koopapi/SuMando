# Plan 007 — Requisiciones

Plan técnico de `spec.md` (48 RF). Respeta `docs/constitution.md` y `docs/architecture.md`.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/requisitions/suggest.ts` | Lo que falta bajo el mínimo hasta el máximo, redondeo hacia arriba a presentaciones de compra, renglones de un cálculo, suma de repetidos | 10, 14–16 |
| `domain/requisitions/state.ts` | Estados de la requisición y de cada grupo, pendiente y excedente por renglón, qué acción se permite en cada estado | 22–29, 33, 34, 37–40, 46 |
| `domain/requisitions/money.ts` | Pesos con hasta 2 decimales a centavos; total del grupo por importes de renglón | 30, 31 |
| `server/services/requisitions/*` | Armar, sugerir, solicitar, editar, aprobar, rechazar, cancelar, comprador, compra, recepción (entrada de la spec 005), cierre, consulta y plantillas | 1–48 |
| `server/adapters/drizzle/requisitions.ts` | Repositorios | — |
| `app/api/requisitions/*`, `app/api/purchase-templates/*` | Handlers finos | 1–46 |
| `app/(app)/requisiciones/*`, `features/requisitions/*` | Lista, armado, detalle con aprobación, compra y recepción, plantillas | 3, 13–48 |

## 2. Modelo de datos (migración `0005_requisiciones`)

- **`requisitions`**: `business_id`, `branch_id`, `warehouse_id`, `folio` (único por negocio), `status`
  (`requested`, `approved`, `rejected`, `cancelled`, `closed`), `note` (200), `created_by`, `created_at`,
  `updated_at`.
- **`requisition_lines`**: `requisition_id`, `product_id` (único por requisición), `supplier_id` (nulo = sin
  proveedor), `presentation_id` (la elegida para mostrar), `requested_base` (lo que se solicitó), `quantity_base`
  (lo vigente: aprobado), `received_base` (acumulado), `amount_cents` (opcional), `closed_at`, `closed_by`,
  `close_reason`, `position`.
- **`requisition_groups`**: se crean al aprobar, uno por proveedor (o sin proveedor): `requisition_id`,
  `supplier_id`, `buyer` (60), `purchased_at`, `purchased_by`, `total_cents`. Único por requisición y proveedor
  (índice parcial para el nulo).
- **`requisition_events`**: `requisition_id`, `kind`, `actor_id`, `at`, `detail` (jsonb): el historial de RF-44
  (solicitada, editada, aprobada con sus cambios, rechazada, cancelada, comprador, comprada, recibida, cerrada).
- **`purchase_templates`** y **`purchase_template_items`** (`product_id`, `quantity_base`, `presentation_id`,
  `supplier_id`), por sucursal, con nombre único entre las activas.
- **`inventory_movements`**: nueva columna `requisition_id` (RF-45).

## 3. Algoritmos

- **Bajo el mínimo (RF-14, RF-15).** `falta = (máximo ?? mínimo) − existencia` (con una existencia negativa, falta
  más). Con presentación de compra de equivalencia `f`: `⌈falta / f⌉ × f`, en enteros.
- **Desde un cálculo (RF-16).** `presentaciones × equivalencia` si el cálculo guardó presentación de compra; si no,
  su total redondeado hacia arriba a milésimas de la unidad base.
- **Repetidos (RF-10).** Se suman en unidad base, conservando la presentación del primero; el servidor vuelve a
  sumar al guardar.
- **Recepción (RF-34 a RF-40).** Con la requisición bloqueada (`for update`) se suma lo recibido a cada renglón, se
  registra una entrada (spec 005) con `requisition_id`, proveedor y referencia «REQ-folio», y se recalcula el
  estado. Dos recepciones simultáneas se serializan en el bloqueo.

## 4. Contrato de la API

| Ruta | Entrada | Salida |
|---|---|---|
| `GET/POST /api/requisitions` | `?estado=` / `{ warehouseId, note?, lines: [{ productId, presentationId?, quantity, supplierId? }] }` | lista / 201 `{ requisition }` |
| `POST /api/requisitions/suggest` | `{ warehouseId, source: minimums\|calculation\|template, id? }` | `{ lines, skipped[] }` |
| `GET/PUT /api/requisitions/[id]` | igual que el alta | `{ requisition }` |
| `POST /api/requisitions/[id]/[action]` | `approve` (`{ lines?, note? }`), `reject`/`cancel` (`{ reason }`), `receive` (`{ groupId, lines: [{ lineId, quantity, presentationId? }] }`), `close` (`{ lineIds, reason }`) | `{ requisition }` |
| `PATCH /api/requisitions/[id]/groups/[groupId]` | `{ buyer?, purchased?, total?, amounts?: [{ lineId, amount }] }` | `{ requisition }` |
| `GET/POST /api/purchase-templates`, `GET/PATCH /api/purchase-templates/[id]`, `POST …/[id]/archive\|reactivate` | `{ name, lines }` / `{ name }` | plantillas |

Errores nuevos: `requisition_empty` (422), `requisition_state` (409), `invalid_amount` (422), `not_purchased`
(409), `buyer_too_long` (422). Se reutilizan los de la spec 005 (`invalid_line_quantity`, `archived_item`,
`reason_required`, `forbidden`, `not_found`) y `template_exists` (409).

## 5. Decisiones técnicas

- **Grupos al aprobar**: antes de aprobar, el agrupado por proveedor se calcula de los renglones; al aprobar se
  fijan los grupos, que guardan comprador, compra e importes. Descartado: grupos desde el alta, que habría que
  rehacer en cada edición.
- **Historial en `requisition_events`** en vez de una columna por paso: hay pasos que se repiten (varias
  recepciones, cierres parciales).
- **Sugerencias calculadas en el servidor** (`/suggest`) y sumadas en la pantalla, para mostrar el armado antes de
  enviar; el servidor vuelve a validar y sumar al guardar.
- **Montos en centavos** (`bigint`), sin flotantes.

## 6. Dependencias

Ninguna nueva.

## 7. Estrategia de tests

- **Unitarios**: faltante y redondeos, cálculo a renglones, suma de repetidos, estados y transiciones, pendiente y
  excedente, montos (RF-10, 14–16, 22–40).
- **Integración**: permisos y aislamiento, folio, cada transición, sugerencias, plantillas, compra con importes,
  recepción parcial con entrada de inventario y concurrencia, cierre, historial (RF-1–47).
- **E2E de escritorio** (`e2e/requisiciones.spec.ts`): armar desde mínimos, solicitar como administrador, aprobar
  con cambio como dueño, comprar con total, recibir en parte, cerrar lo pendiente; volumen de 300 renglones; las
  páginas en `qa-sweep`.

## 8. Entregas

1. **Dominio y esquema**. 2. **Servicios y API**. 3. **Pantallas**. 4. **Cierre**: E2E, volumen, barrido,
validación y documentos.

## Ajustes al construir

- El dueño ajusta antes de aprobar editando la requisición (queda «Editada» en el historial) o mandando los
  renglones al aprobar (`approve` con `lines`, que guarda los cambios en el evento). Lo que el dueño agrega al aprobar
  queda con «solicitado» en cero.
- Cancelar la pueden quien opera en el almacén de destino y el dueño.
- Recibir pide el grupo marcado como comprado (`not_purchased`).
- En el teléfono los renglones de cada proveedor se muestran como lista; la tabla es de escritorio.
- Requisiciones está en «Más» y en el menú lateral después de Inventario; el inicio suma una fila «Requisiciones»
  con lo que espera aprobación (al dueño) y lo que está por recibir. El E2E de la barra inferior (spec 002, RF-46) lo
  espera.
