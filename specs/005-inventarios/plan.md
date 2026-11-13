# Plan 005 — Inventarios

Plan técnico de `spec.md` (67 RF). Respeta `docs/constitution.md` y `docs/architecture.md`.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/inventory/quantities.ts` | Cantidad de renglón (> 0, hasta 3 decimales) y de ajuste (con signo, ≠ 0) en milésimas; conversión a unidad base en millonésimas; estado de una existencia (negativo, bajo mínimo) | 7–9, 18–21, 56 |
| `domain/inventory/movement.ts` | Validación de un movimiento: renglones no vacíos y sin productos repetidos, motivos de salida, textos (referencia, nota, motivo) | 10–19, 64 |
| `domain/inventory/transfer.ts` | Estados del traspaso (`done`, `in_transit`, `received`, `cancelled`) y transiciones; producto propuesto al recibir (correspondencia recordada, luego nombre y unidad base) | 23, 27, 31–37 |
| `domain/inventory/count.ts` | Resultado de un conteo: diferencia contra la existencia al aplicar, productos que cambiaron desde que se abrió, «Igual» y «Lo que falta, igual» | 46, 47, 49–52 |
| `domain/inventory/access.ts` | Quién mueve en un almacén: de sucursal, sus administradores; del negocio, cualquiera con sucursal en el negocio; el dueño, todos | 3, 4, 29, 43 |
| `server/services/inventory/*` | Casos de uso: existencias, entradas, salidas, ajustes, cancelaciones, historial, traspasos, áreas de conteo y conteos; todo en transacción | 1–67 |
| `server/adapters/drizzle/inventory.ts` | Repositorios: existencias con suma atómica, movimientos y sus renglones, traspasos, correspondencias, listas de área y conteos | — |
| `app/api/inventory/*`, `app/api/areas/[id]/products` | Handlers finos sobre la sucursal activa | 1–66 |
| `app/(app)/inventario/*`, `almacenes/areas/[id]` | Páginas de servidor que piden la sucursal activa y pasan vistas | 2, 44, 55, 61, 62, 67 |
| `features/inventory/*` | Existencias, formularios de movimiento, traspasos, recepción, conteo con borrador local, historial y lista del área, solo con `src/ui` | 7–67 |
| `features/catalog/product-detail.tsx` | Existencia del producto en cada almacén visible | 58 |
| `i18n/es/inventory.ts` | Textos | — |

## 2. Modelo de datos (migración `0004_inventarios`)

Cantidades en unidad base como `numeric(20,6)` (millonésimas, igual que los mínimos de la 003). Todo lleva
`business_id`.

- **`stock`**: `business_id`, `warehouse_id`, `product_id`, `quantity_base` (puede ser negativa, RF-20),
  `updated_at`. Único `(warehouse_id, product_id)`. Es la existencia vigente; el historial está en los movimientos.
- **`inventory_movements`**: `business_id`, `branch_id` (la del almacén; nulo si es del negocio completo),
  `warehouse_id`, `kind` (`entry`, `exit`, `adjustment`, `transfer_out`, `transfer_in`, `count`, `reversal`), `reason`
  (motivo de salida: `waste`, `expired`, `staff`, `courtesy`, `other`), `supplier_id`, `reference` (40), `note`
  (200), `transfer_id`, `count_id`, `reverses_id` (único: un movimiento se cancela una sola vez, RF-65),
  `created_by`, `created_at`. Índices por `(warehouse_id, created_at)` y `(business_id, created_at)`. Sin rutas de
  cambio ni borrado (RF-63).
- **`inventory_movement_lines`**: `movement_id`, `product_id`, `delta_base` (con signo), `balance_after` (la
  existencia que dejó, RF-61), `position`. Índice `(product_id, movement_id)` para el historial.
- **`inventory_transfers`**: `from_business_id`, `from_warehouse_id`, `to_business_id`, `to_warehouse_id`, `status`
  (`done` dentro del negocio; `in_transit`, `received`, `cancelled` entre negocios; `cancelled` también al cancelar
  uno interno), `note`, `sent_by`, `sent_at`, `received_by`, `received_at`, `cancelled_by`, `cancelled_at`,
  `cancel_reason`. CHECK de origen ≠ destino (RF-23).
- **`inventory_transfer_lines`**: `transfer_id`, `from_product_id`, `product_name`, `base_unit`, `quantity_sent`,
  `to_product_id`, `quantity_received` (nulos hasta recibir; RF-30, RF-35), `position`.
- **`product_links`**: `from_product_id`, `to_business_id`, `to_product_id`, `updated_by`, `updated_at`. Único
  `(from_product_id, to_business_id)` (RF-33).
- **`areas`**: nueva columna `warehouse_id` (nula hasta asignarla, RF-39).
- **`area_products`**: `area_id`, `product_id`, `position`. Único `(area_id, product_id)`. La regla de un producto en
  una sola área activa por almacén (RF-41) la comprueba el servicio con el cerrojo del negocio.
- **`inventory_counts`**: `business_id`, `branch_id`, `area_id`, `warehouse_id`, `created_by`, `created_at`
  (al aplicar). **`inventory_count_lines`**: `count_id`, `product_id`, `expected_base`, `counted_base`,
  `difference_base` (RF-53). El conteo genera además un movimiento `count` con las diferencias distintas de cero.
- **`audit_log`**: nuevos `entity_type` `area` (lista y almacén del área) y `transfer`; los movimientos y conteos
  son su propio registro.

## 3. Algoritmos

- **Suma atómica (RF-13, RF-17, RF-24, RNF «El servidor decide»).** Cada renglón aplica
  `insert … on conflict (warehouse_id, product_id) do update set quantity_base = stock.quantity_base + excluded`
  y devuelve la existencia resultante, que se guarda como `balance_after`. Dos movimientos simultáneos sobre el
  mismo producto se serializan en la fila y ninguno se pierde. Los renglones se aplican ordenados por producto
  para que dos transacciones no se bloqueen en cruz.
- **Conteo (RF-49 a RF-52).** En la transacción se bloquean (`select … for update`, creando en cero las que
  falten) las existencias de los productos capturados. La diferencia es `contado − existencia actual`. El cliente
  envía con cada renglón la existencia que vio al abrir; si alguna difiere de la actual y no viene `confirm`, el
  servidor responde `count_changed` (409) con los productos que cambiaron y lo esperado nuevo, sin aplicar nada.
- **Producto propuesto al recibir (RF-31 a RF-33).** Para cada renglón: la correspondencia recordada si su
  producto sigue activo y con la misma unidad base; si no, el producto activo del negocio que recibe con la misma
  `name_key` y unidad base; si no, ninguno (hay que elegir). Al recibir con un producto elegido a mano se guarda o
  actualiza la correspondencia.
- **Cancelación (RF-64 a RF-66).** Se crea un movimiento `reversal` con los renglones de signo contrario y
  `reverses_id`; el índice único impide cancelar dos veces aunque lleguen dos peticiones a la vez. Un traspaso
  interno se cancela revirtiendo su salida y su entrada; uno entre negocios en camino, revirtiendo su salida.
- **Visibilidad (RF-2, RF-5).** Almacenes visibles = los de la sucursal activa más los del negocio completo; todo
  lo demás (existencias, movimientos, traspasos, áreas) se filtra por ellos. Un almacén fuera de ese conjunto
  responde `not_found`.

## 4. Contrato de la API

Todas exigen sesión y sucursal activa (`no_branch` si no hay). Cantidades como texto (`"2.5"`, `"-1"` en ajustes).
Cuerpos de hasta 64 KB en movimientos, traspasos y conteos (hasta 500 renglones).

| Ruta | Entrada | Salida |
|---|---|---|
| `GET /api/inventory/stock?warehouseId=` | — | `{ warehouses, rows: StockRow[] }` |
| `POST /api/inventory/movements` | `{ kind: entry\|exit\|adjustment, warehouseId, lines: [{ productId, presentationId?, quantity }], supplierId?, reference?, note?, reason? }` | 201 `{ movement }` |
| `GET /api/inventory/movements?kind&warehouseId&from&to&before` | — | `{ movements, next }` de 50 en 50 |
| `GET /api/inventory/movements/[id]` | — | `{ movement }` con renglones y su cancelación |
| `POST /api/inventory/movements/[id]/cancel` | `{ reason }` | 201 `{ movement }` (el inverso) |
| `GET /api/inventory/history?warehouseId&productId&before` | — | `{ entries, next }` |
| `GET /api/inventory/destinations` | — | `{ businesses: [{ id, name, warehouses: [{ id, name }] }] }` |
| `GET/POST /api/inventory/transfers` | `{ fromWarehouseId, toWarehouseId, lines, note? }` | `{ incoming, outgoing }` / 201 `{ transfer }` |
| `GET /api/inventory/transfers/[id]` | — | `{ transfer }` con renglones y producto propuesto |
| `POST /api/inventory/transfers/[id]/receive` | `{ lines: [{ lineId, productId, quantity }] }` | `{ transfer }` |
| `POST /api/inventory/transfers/[id]/cancel` | `{ reason }` | `{ transfer }` |
| `PUT /api/areas/[id]/products` | `{ warehouseId, productIds[] }` | `{ area }` |
| `GET /api/inventory/counts/[areaId]` | — | `{ area, lines: [{ productId, expected, … }] }` |
| `POST /api/inventory/counts` | `{ areaId, lines: [{ productId, presentationId?, quantity, seen }], confirm? }` | 201 `{ count }` o 409 `count_changed` |

Errores nuevos (mensaje en `i18n/es/errors.ts`): `invalid_line_quantity` (422, RF-8), `invalid_adjustment` (422,
RF-19), `duplicate_line` (422, RF-10), `movement_empty` (422), `reason_required` (422, RF-16, RF-19, RF-64),
`archived_item` (409, RF-6), `same_warehouse` (422, RF-23), `transfer_state` (409, RF-37), `product_required`
(422, RF-32), `unit_mismatch` (422, RF-32), `product_in_area` (409, RF-41), `area_without_warehouse` (409),
`count_changed` (409, RF-51), `not_cancellable` (409, RF-65). Se reutilizan `forbidden`, `not_found`, `no_branch`,
`validation`.

## 5. Decisiones técnicas

- **Tabla `stock` además de los movimientos.** Las existencias se leen de una fila por producto y almacén, no
  sumando 50,000 movimientos (RNF de volumen); la suma atómica mantiene las dos cosas en la misma transacción.
  Descartado: calcular la existencia sumando renglones en cada consulta.
- **`balance_after` en cada renglón** para que el historial (RF-61) muestre la existencia que dejó cada movimiento
  sin recalcular desde el principio.
- **El conteo compara en el servidor lo que el cliente vio** (`seen`) en vez de guardar conteos abiertos: el
  borrador vive en el dispositivo (RF-48, `localStorage` por persona y área) y el servidor no tiene estado entre
  abrir y aplicar. Descartado: conteos «en curso» en la base, que piden caducidad y limpieza.
- **Traspasos en su propia tabla** con movimientos `transfer_out` y `transfer_in` en cada almacén: el historial de
  cada almacén queda completo y el traspaso guarda estado, renglones y recepción.
- **El remitente ve solo nombres** del negocio y almacén destino (`/inventory/destinations`), nunca el catálogo del
  otro negocio (RF-38).
- **Límite de cuerpo de 64 KB** en inventario: un conteo de 200 productos con lo visto supera los 16 KB generales.
  `readJson` recibe el límite como opción.
- **Navegación**: Inventario en el menú lateral, en «Más» y en el inicio (sección con negativos, bajo mínimo y
  traspasos por recibir). La barra inferior no cambia (spec 002, RF-45).
- **Lista del área** en `almacenes/areas/[id]`, junto a donde se crean las áreas (spec 003).

## 6. Dependencias

Ninguna nueva.

## 7. Estrategia de tests

- **Unitarios** (`domain/inventory`): cantidades y signos, conversión exacta, estados de existencia, validación de
  movimientos y motivos, transiciones de traspaso, producto propuesto, cálculo de conteo y cambios desde que se
  abrió, permisos por almacén (RF-3, 4, 7–10, 14–21, 23, 31–33, 37, 41, 46, 47, 49–52, 56, 64, 65).
- **Integración** (servicios y handlers contra `mando_test`): aislamiento entre negocios y sucursales, permisos,
  entradas, salidas, ajustes y negativos, traspasos internos y entre negocios con recepción, diferencia,
  correspondencia recordada y cancelación, áreas y conteos con cambio concurrente, historial, cancelaciones,
  movimientos simultáneos sin pérdida, existencias en el detalle del producto (RF-1–6, 11–13, 17, 20, 22–45,
  49–66).
- **E2E de escritorio** (`e2e/inventario.spec.ts`, primera línea con «spec 005»): armar un área, entrada, salida,
  traspaso interno, traspaso a otro negocio recibido con diferencia, conteo con «Igual» y borrador que sobrevive a
  recargar, existencias con bajo mínimo y negativo, historial y cancelación (RF-7, 11, 14, 20, 21, 22, 26–35, 40,
  44–49, 55–57, 61, 64, 67); volumen de 1,000 productos y 50,000 movimientos; las páginas nuevas en `qa-sweep` con
  axe en claro y oscuro. Los teléfonos los prueba el dueño.

## 8. Entregas

1. **Dominio y esquema**: reglas puras con sus tests, migración y repositorios.
2. **Servicios y API**: movimientos, cancelaciones, historial, traspasos, áreas y conteos con permisos y tests de
   integración.
3. **Pantallas**: existencias, movimientos, traspasos y recepción, áreas, conteo, historial y navegación.
4. **Cierre**: E2E, barrido, volumen, validación RF por RF y documentación.

## Ajustes al construir

- Un almacén visible en el que la persona no puede mover responde `not_found`, igual que uno de otro negocio
  (RF-5); en la práctica todo almacén visible desde la sucursal activa es movible para quien trabaja en ella.
- `isUniqueViolation` mira también la causa del error, porque Drizzle envuelve el error de PostgreSQL: así dos
  cancelaciones simultáneas del mismo movimiento dejan pasar solo una y la otra responde `not_cancellable` (RF-65).
- Los identificadores que no son uuid responden `not_found` antes de llegar a la base (`uuidOrNotFound`).
- La recepción de un traspaso entre negocios se captura en la unidad base del producto; la propuesta de producto
  se calcula solo para quien recibe (RF-38).
- La lista del área vive en `almacenes/areas/[id]`, con enlace «Lista de conteo» desde Almacenes y áreas y desde
  Conteo. Un área sin almacén manda a armar su lista.
- `SelectField` admite `hideLabel` (etiqueta solo para lectores de pantalla), como `TextField`, para el renglón de
  conteo en el teléfono. Iconos nuevos: inventario (`layers`), conteo (`clipboard`) y traspaso (`swap`).
- Las fechas del filtro de movimientos se toman como días completos en la hora de la Ciudad de México.
- Inventario está en «Más» y en el menú lateral, antes de Recetas; el E2E de la barra inferior (spec 002, RF-46) lo
  espera. El inicio tiene la sección «Inventario» (existencias, conteo y traspasos) y sale de «Próximamente».
- El volumen se probó con 1,000 productos, 50,000 movimientos y un conteo de 200 productos por la API.
