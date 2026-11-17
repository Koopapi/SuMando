# Plan 013 — Requisiciones en el día a día

Plan técnico de `spec.md` (33 RF). Respeta `docs/constitution.md` y `docs/architecture.md`. Construye sobre la
spec 007 (requisiciones), la 003 (catálogo), la 006 (importador) y la 008 (personal).

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/requisitions/whatsapp.ts` | Teléfono a dígitos de WhatsApp (52 + 10 dígitos), armado del mensaje por comprador a partir de una plantilla de textos, enlace `wa.me` | 12–14, 16 |
| `domain/requisitions/buyers.ts` | Agrupar los grupos de proveedor por comprador, orden («Sin comprador» al final) y cuentas por estado | 8, 9 |
| `domain/inventory/sheet-import.ts` | Columna MÁXIMO, aviso `invalid_maximum` (no numérico o menor que el mínimo) | 25, 26 |
| `server/services/catalog/supplier-buyers.ts` | Comprador habitual por proveedor y sucursal: listar y asignar, con permisos | 1–3 |
| `server/services/catalog/purchase-data.ts` | «Datos de compra» de un almacén: filas, guardado por lotes con errores por fila y auditoría | 17–24 |
| `server/services/requisitions/requisitions.ts` | Al aprobar, comprador habitual en cada grupo; cambiar comprador por persona de Personal; vista por comprador con mensaje; sugerencias con `withoutMax`; existencias y niveles para armar | 4–16, 30, 32 |
| `server/services/inventory/import.ts` | Guardar el máximo si falta; mostrarlo en la revisión | 27, 28 |
| `app/api/supplier-buyers`, `app/api/purchase-data`, cambios en `app/api/requisitions/*` | Handlers finos | 1–24 |
| `ui/combo-field.tsx` | Campo con búsqueda (texto + lista filtrada, sin acentos ni mayúsculas), accesible por teclado | 29 |
| `features/catalog/suppliers-manager.tsx` | Columna y selector de comprador habitual en la sucursal activa | 1–3 |
| `features/requisitions/*` | Detalle por comprador con «Enviar por WhatsApp» y «Copiar mensaje»; armado con buscador, existencias y grupos por proveedor | 5, 8–15, 29–32 |
| `features/inventory/purchase-data.tsx`, `app/(app)/inventario/datos-de-compra` | Tabla editable con filtros | 17–22, 33 |

## 2. Modelo de datos (migración `0011_compradores`)

- **`supplier_buyers`** (nueva): `id`, `business_id`, `branch_id`, `supplier_id`, `employee_id`, `updated_by`,
  `updated_at`. Único por (`branch_id`, `supplier_id`). Quitar el comprador borra la fila (no es un dato de
  operación: el cambio queda en `audit_log`).
- **`requisition_groups`**: columna nueva `buyer_employee_id` (nula, referencia a `employees`). La columna `buyer`
  (texto) se conserva para lo escrito antes de esta spec (RF-7); al asignar una persona se limpia el texto.
- Solo añade; no toca datos existentes.

## 3. Algoritmos

- **Teléfono (RF-12, RF-14).** Se quitan los no dígitos; con 10 dígitos se antepone `52`; con 12 que empiezan con
  `52` o 13 con `521` se usan tal cual; menos de 10 = sin teléfono.
- **Mensaje (RF-13).** Encabezado con negocio, sucursal y folio; por cada proveedor por comprar (sin `purchased_at`),
  su nombre y una línea «• producto: cantidad presentación» con la cantidad aprobada; la nota al final si existe. Los
  textos vienen de `es.requisitions.whatsapp`; el dominio solo compone.
- **Comprador del grupo (RF-4).** Al fijar los grupos (aprobar o alta del dueño) se toma `supplier_buyers` de la
  sucursal para cada proveedor, si la persona sigue activa.
- **Datos de compra (RF-17 a RF-21).** Filas = productos activos con existencia, nivel o lugar en un área del
  almacén. Cada cambio trae `productId` y los campos que cambian. Se validan todas las filas (proveedor activo del
  negocio, presentación del producto, cantidades con hasta 3 decimales, máximo ≥ mínimo con lo que ya hay); las
  válidas se guardan en una transacción; las demás vuelven con su código de error. Mínimo y máximo se interpretan en
  la presentación de compra que quede en la fila (la nueva si cambia en el mismo envío).
- **Importador (RF-25 a RF-27).** El máximo se convierte como el mínimo; al confirmar se guarda solo si el producto
  no tiene máximo en ese almacén y no queda por debajo del mínimo vigente.

## 4. Contrato de la API

| Ruta | Entrada | Salida |
|---|---|---|
| `GET /api/supplier-buyers` | — (sucursal activa) | `{ buyers: [{ supplierId, employeeId, name }], employees: [{ id, name }] }` |
| `PUT /api/supplier-buyers/[supplierId]` | `{ employeeId: uuid \| null }` | `{ supplierId, employeeId }` |
| `PATCH /api/requisitions/[id]/groups/[groupId]` | además: `{ buyerEmployeeId: uuid \| null }` | igual |
| `POST /api/requisitions/suggest` | igual | además `withoutMax: number` |
| `GET /api/purchase-data?almacen=` | — | `{ rows }` |
| `POST /api/purchase-data` | `{ warehouseId, changes: [{ productId, supplierId?, purchasePresentationId?, min?, max? }] }` (hasta 1000) | `{ saved: number, errors: [{ productId, code, message }] }` |

Errores nuevos: `buyer_not_in_branch` (422): la persona no es personal activo de la sucursal. Se reutilizan
`not_found`, `forbidden`, `invalid_quantity`, `max_below_min`, `supplier_archived`, `requisition_state`.

## 5. Decisiones técnicas

- **Comprador por persona de Personal, no por cuenta**: los compradores no usan SuMando (spec 007) y Personal ya
  guarda su teléfono. Descartado: cuentas de usuario.
- **Enlace `wa.me` desde el navegador** en vez de la API de WhatsApp: no cuesta, no requiere alta en Meta y el
  envío sale del teléfono de quien opera (RF-16). El servidor arma el texto y el número; la pantalla solo abre el
  enlace o copia.
- **Guardado por lotes con errores por fila** en vez de una transacción todo-o-nada: así lo pide RF-21 y evita
  perder 299 cambios por uno malo.
- **Presentación nueva desde la tabla** reutiliza `POST /api/products/[id]/presentations` (spec 003); la tabla la
  elige después como de compra.
- **`ComboField` propio** en `src/ui` en vez de `<datalist>`: `datalist` no filtra sin acentos y en Safari de iOS se
  comporta distinto.
- **Existencias para armar** se mandan ya convertidas a cada presentación del producto, para que la pantalla no
  calcule.

## 6. Dependencias

Ninguna nueva.

## 7. Estrategia de tests

- **Unitarios**: teléfono y mensaje (RF-12 a RF-14, RF-16), agrupado por comprador (RF-8, RF-9), máximo en la hoja
  (RF-25, RF-26), filtro sin acentos del `ComboField` (RF-29).
- **Integración**: comprador habitual con permisos y aislamiento (RF-1 a RF-3), comprador al aprobar y al cambiar,
  baja y texto anterior (RF-4 a RF-7), vista por comprador y mensaje (RF-8 a RF-15), datos de compra con errores por
  fila, permisos, auditoría y volumen de 300 (RF-17 a RF-24), importador con máximo (RF-27, RF-28), sugerencias con
  `withoutMax` y niveles para armar (RF-30, RF-32).
- **E2E de escritorio** (`e2e/requisiciones-dia-a-dia.spec.ts`): datos de compra con máximo, comprador habitual,
  requisición desde mínimos con buscador, aprobada, dividida por comprador, mensaje de WhatsApp (se comprueba el
  enlace sin abrirlo); páginas nuevas en `qa-sweep`.

## 8. Entregas

1. **Base**: migración, dominio de WhatsApp y comprador, máximo en el importador.
2. **Servicios y API**: comprador habitual, requisición por comprador, datos de compra, armado.
3. **Pantallas**: `ComboField`, proveedores, detalle por comprador, armado, datos de compra.
4. **Cierre**: E2E, barrido, volumen, validación y documentos.

## Ajustes al construir

- «Datos de compra» manda con cada cambio de mínimo o máximo la presentación en que se mostró (`levelsIn`): si en la
  misma fila cambia la presentación de compra, el número escrito no se reinterpreta en la nueva.
- Un mismo producto puede venir dos veces en un envío; la segunda fila parte de lo ya guardado.
- El importador tampoco guarda un mínimo nuevo por encima de un máximo existente (antes podía chocar con la base).
- En el teléfono, «Datos de compra» abre cada renglón para editarlo (tabla de la spec 002); está pensada para
  escritorio.
- `LinkButton` acepta `external` para abrir WhatsApp fuera de SuMando; icono nuevo `message`.
