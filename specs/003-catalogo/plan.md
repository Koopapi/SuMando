# Plan 003 — Catálogo

Plan técnico de `spec.md` (41 RF). Respeta `docs/constitution.md` y `docs/architecture.md`.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/catalog/units.ts` | Unidades base cerradas (`g`, `ml`, `pz`), lectura de cantidades con hasta 3 decimales, conversión exacta presentación ↔ unidad base con enteros (milésimas y millonésimas, `bigint`) | 10, 11, 13, 17, 23, 25, 26 |
| `domain/catalog/names.ts` | Clave de nombre del catálogo (sin mayúsculas, acentos ni espacios exteriores) y límite de 80 | 14, 20, 21, 30, 31, 32 |
| `domain/catalog/levels.ts` | Validación de mínimo y máximo (no negativos, máximo ≥ mínimo, ambos opcionales) | 22, 24, 25 |
| `domain/catalog/access.ts` | Quién administra el catálogo de un negocio y de una sucursal | 6, 7 |
| `server/services/catalog/*` | Casos de uso: productos, presentaciones, mínimos, proveedores, almacenes, áreas, archivo y reactivación, todo con auditoría y dentro del negocio activo | 1–38 |
| `server/adapters/drizzle/catalog.ts` | Repositorios del catálogo | — |
| `app/api/products`, `suppliers`, `warehouses`, `areas`, `presentations`, `catalog/[kind]/[id]/[action]` | Handlers finos sobre la sucursal activa | 1–38 |
| `app/(app)/productos`, `productos/[id]`, `proveedores`, `almacenes` | Páginas de servidor que piden la sucursal activa y pasan vistas | 4, 5, 26, 29, 39–41 |
| `features/catalog/*` | Pantallas de cliente con componentes de `src/ui` | 9–41 |
| `i18n/es/catalog.ts` | Textos | — |

## 2. Modelo de datos (migración `0002_catalogo`)

Todas las tablas llevan `business_id`, `created_by`, `created_at`, `updated_at`; las que se archivan, `archived_at`.
Los nombres guardan `name` (como se escribió, normalizado de espacios) y `name_key` (RF-31).

- **`suppliers`**: `name` (80), `name_key`, `phone` (30, opcional), `notes` (500, opcional). Índice único parcial
  `(business_id, name_key) where archived_at is null` (RF-30, RF-34).
- **`products`**: `name`, `name_key`, `base_unit` (`g`|`ml`|`pz`, CHECK), `supplier_id` (opcional, FK),
  `notes`, `purchase_presentation_id` y `count_presentation_id` (opcionales; nulo = unidad base, RF-15). Índice
  único parcial como el de proveedores.
- **`product_presentations`**: `product_id`, `name` (40), `name_key`, `factor` `numeric(14,3)` > 0 (CHECK).
  Único `(product_id, name_key)`. La presentación de unidad base no se guarda: es implícita con factor 1 (RF-12).
- **`warehouses`**: `branch_id` opcional (nulo = negocio completo, RF-3), `name`, `name_key`. La unicidad cruzada
  de RF-20 se comprueba en el servicio bajo un cerrojo por negocio.
- **`areas`**: `branch_id` (obligatorio), `name`, `name_key`, `responsible_id` (FK a `users`). Único parcial
  `(branch_id, name_key) where archived_at is null` (RF-21).
- **`stock_levels`**: `product_id`, `warehouse_id`, `min_base` y `max_base` `numeric(20,6)` opcionales, en
  unidad base (RF-23). Único `(product_id, warehouse_id)`; CHECK `max_base >= min_base` y no negativos.
- **`audit_log`**: sin cambios de esquema; nuevos `entity_type`: `product`, `presentation`, `supplier`,
  `warehouse`, `area`, `stock_level` (RF-38).

## 3. Algoritmos

- **Conversión exacta (RF-17, RF-23, RF-26).** Cantidades y factores se leen como milésimas enteras (`bigint`).
  Guardar: `base_micro = cantidad_mili × factor_mili`. Mostrar en otra presentación:
  `cantidad_mili = round(base_micro / factor_mili)` con redondeo a la mitad hacia arriba. Sin flotantes, así el
  mínimo guardado no se degrada al cambiar una equivalencia.
- **Unicidad de almacenes (RF-20).** Dentro de una transacción con cerrojo de aviso por negocio: un almacén de
  sucursal choca con los activos de su sucursal y con los del negocio completo; uno del negocio completo, con
  cualquier almacén activo del negocio.
- **Permisos (RF-6 a RF-8).** Toda operación parte de la sucursal activa. Un elemento de otro negocio responde
  `not_found` (RF-8). Un almacén o área de otra sucursal del mismo negocio responde `forbidden` si la persona no
  tiene esa sucursal (RF-7). Administrar el catálogo del negocio pide al menos una sucursal activa asignada en él.

## 4. Contrato de la API

Todas exigen sesión y sucursal activa (`no_branch` si no hay). Cantidades como texto (`"2.5"`).

| Ruta | Entrada | Salida |
|---|---|---|
| `GET /api/products` | — | `{ products: ProductView[] }` del negocio activo |
| `POST /api/products` | `{ name, baseUnit, supplierId?, notes? }` | 201 `{ product }` |
| `PATCH /api/products/[id]` | `{ name?, baseUnit?, supplierId?, notes?, purchasePresentationId?, countPresentationId? }` | `{ product }` |
| `POST /api/products/[id]/presentations` | `{ name, factor }` | 201 `{ presentation }` |
| `PATCH /api/presentations/[id]` | `{ name?, factor? }` | `{ presentation }` |
| `PUT /api/products/[id]/levels` | `{ warehouseId, presentationId?, min?, max? }` | `{ level }` |
| `GET/POST /api/suppliers`, `PATCH /api/suppliers/[id]` | `{ name, phone?, notes? }` | `{ supplier(s) }` |
| `GET/POST /api/warehouses`, `PATCH /api/warehouses/[id]` | `{ name, scope: "branch"\|"business" }` / `{ name }` | `{ warehouse(s) }` |
| `GET/POST /api/areas`, `PATCH /api/areas/[id]` | `{ name, responsibleId }` | `{ area(s) }` |
| `POST /api/catalog/[kind]/[id]/archive\|reactivate` | `kind` = `products`, `suppliers`, `warehouses`, `areas` | `{ item }` |

Errores nuevos (mensaje en `i18n/es/errors.ts`): `catalog_name_invalid` (422, límite 80), `invalid_unit` (422),
`invalid_factor` (422, RF-13), `invalid_quantity` (422), `max_below_min` (422), `base_unit_locked` (409), `supplier_archived` (409),
`invalid_responsible` (422). Se reutilizan `duplicate_name`, `forbidden`, `not_found`, `no_branch`, `validation`.

## 5. Decisiones técnicas

- **Presentación base implícita** en vez de guardarla como renglón: no puede desincronizarse con la unidad base y
  RF-16 queda en una sola columna. Descartado: un renglón con factor 1 que habría que proteger contra cambios.
- **Enteros, no flotantes**, para equivalencias y mínimos (`numeric` en BD, `bigint` en dominio). Descartado:
  `number`, que acumula error al convertir cajas ↔ ml.
- **Unicidad por índice parcial** sobre los activos, para que un archivado no bloquee un alta nueva y la
  reactivación pueda rechazarse (RF-34). Descartado: índice total, que impediría reutilizar el nombre.
- **Archivar y reactivar en una sola ruta dinámica** por tipo, para no repetir ocho archivos iguales.
- **Las pantallas cargan con servicios en el servidor**; la API solo atiende las acciones y las pruebas.
- **`DataTable` gana `initialFilters`** para abrir la lista de productos mostrando solo los activos.
- **Responsable de área**: candidatos = dueños activos + administradores activos con esa sucursal.

## 6. Dependencias

Ninguna nueva.

## 7. Estrategia de tests

- **Unitarios** (`domain/catalog`): conversión y redondeo, lectura de cantidades, claves de nombre con acentos,
  validación de mínimos y máximos, permisos (RF-6, 7, 10, 13, 17, 23–26, 31, 32).
- **Integración** (servicios y handlers contra `mando_test`): pertenencia y aislamiento entre negocios, permisos
  por sucursal, duplicados, archivo y reactivación, proveedor archivado, almacén archivado, auditoría
  (RF-1–9, 11, 12, 14–22, 27–30, 33–38).
- **E2E de escritorio** (`e2e/catalogo.spec.ts`, primera línea con «spec 003»): flujo principal y consulta
  (RF-9, 11, 15, 18, 19, 22, 26, 27, 29, 39–41), volumen de 1,000 productos, y las páginas nuevas en el barrido
  `qa-sweep` con axe en claro y oscuro. Los teléfonos los prueba el dueño.

## 8. Entregas

1. **Dominio y esquema**: reglas puras con sus tests, migración y repositorios.
2. **Servicios y API**: casos de uso con permisos, auditoría y tests de integración.
3. **Pantallas**: productos, detalle, proveedores, almacenes y áreas, con navegación.
4. **Cierre**: E2E, barrido, volumen, validación RF por RF y documentación.

## Ajustes al construir

- Se separó `invalid_factor` de `invalid_quantity` para que el mensaje de RF-13 diga el formato de la equivalencia.
- Una presentación no puede llamarse como la unidad base («ml», «mililitro»…), para no repetir la implícita (RF-14).
- Las pantallas de catálogo están en el menú para todos los perfiles y en el inicio, en la sección «Catálogo», que
  sale de «Próximamente».
- El alcance de los handlers sale de `server/auth/catalog-scope.ts` (persona + sucursal activa).
- El E2E de volumen siembra 1,000 productos directo en la BD de E2E y mide la carga y la búsqueda en el navegador.
