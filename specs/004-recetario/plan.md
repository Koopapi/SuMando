# Plan 004 — Recetario e insumos

Plan técnico de `spec.md` (55 RF). Respeta `docs/constitution.md` y `docs/architecture.md`.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/recipes/portions.ts` | Porcentaje de media porción (entero 1–100, 50 por omisión) y piezas (entero 0–9,999) | 17, 18, 21 |
| `domain/recipes/supplies.ts` | Suma exacta de insumos por ingrediente con piezas completas y medias, presentaciones de compra redondeadas hacia arriba, orden alfabético | 16, 23–27 |
| `domain/recipes/recipe.ts` | Validación de una receta: al menos un ingrediente, sin productos repetidos, cantidades, nombre (reusa `domain/catalog/names.ts` y `units.ts`) | 7, 8, 10, 11, 13, 49, 50 |
| `domain/recipes/import.ts` | De las filas de cada hoja a platillos con su lista de problemas: formato, unidades, ingredientes que faltan, existentes y duplicados | 40–46 |
| `server/adapters/xlsx.ts` | Lector mínimo de .xlsx sin dependencias (zip con `zlib` de Node y XML de celdas) con límites contra archivos maliciosos | 40, 48 |
| `server/services/recipes/*` | Casos de uso: recetas, cálculo y vista previa, historial, plantillas, importación; todo dentro del negocio o la sucursal activa, con auditoría | 1–55 |
| `server/adapters/drizzle/recipes.ts` | Repositorios del recetario | — |
| `app/api/recipes`, `recipes/[id]`, `recipes/[id]/[action]`, `recipes/import`, `calculations`, `calculations/preview`, `calculations/[id]`, `recipe-templates`, `recipe-templates/[id]`, `recipe-templates/[id]/[action]` | Handlers finos sobre la sucursal activa | 1–53 |
| `app/(app)/recetas`, `recetas/nueva`, `recetas/[id]`, `recetas/importar`, `insumos`, `insumos/historial`, `insumos/historial/[id]`, `insumos/plantillas` | Páginas de servidor que piden la sucursal activa y pasan vistas | 3, 20, 30, 32, 54 |
| `features/recipes/*` | Editor de receta, tabla de recetas, importación, captura de piezas con lista viva, historial y plantillas, solo con `src/ui` | 7–55 |
| `features/catalog/product-detail.tsx` | Recetas activas que usan el producto | 55 |
| `i18n/es/recipes.ts` | Textos | — |

## 2. Modelo de datos (migración `0003_recetario`)

Mismas convenciones que la 003: `business_id`, `created_by`, `created_at`, `updated_at`; `archived_at` donde se
archiva; `name` y `name_key` con índice único parcial sobre los activos.

- **`recipes`**: `name` (80), `name_key`, `preparation` (texto, hasta 4,000, opcional), `half_percent` `smallint`
  por omisión 50 con CHECK 1–100 (RF-17, RF-18). Único `(business_id, name_key) where archived_at is null`.
- **`recipe_ingredients`**: `recipe_id`, `product_id` (FK; mismo negocio, lo comprueba el servicio),
  `quantity_base` `numeric(20,6)` > 0 en unidad base (RF-9), `note` (120, opcional), `position`. Único
  `(recipe_id, product_id)` (RF-11).
- **`supply_calculations`**: `business_id`, `branch_id`, `created_by`, `created_at`. Inmutable: el repositorio no
  ofrece actualizar ni borrar (RF-31).
- **`supply_calculation_items`**: `calculation_id`, `recipe_id`, `recipe_name`, `full_count`, `half_count`,
  `half_percent` (copias del momento, RF-29, RF-32).
- **`supply_calculation_lines`**: `calculation_id`, `product_id`, `product_name`, `base_unit`, `total_base`
  `numeric(26,8)`, `purchase_name` y `purchase_factor` (nulos si se compra en unidad base), `purchase_count`,
  `product_archived` (copias del momento, RF-27, RF-32).
- **`recipe_templates`**: `business_id`, `branch_id`, `name`, `name_key`, `archived_at`. Único
  `(branch_id, name_key) where archived_at is null`.
- **`recipe_template_items`**: `template_id`, `recipe_id`, `full_count`, `half_count`.
- **`audit_log`**: nuevos `entity_type`: `recipe`, `recipe_template`. El cálculo no se audita aparte: él mismo es
  el registro (RF-29).

## 3. Algoritmos

- **Suma exacta (RF-23, RNF «Exactitud»).** Cada ingrediente guarda su cantidad en millonésimas de la unidad base
  (`bigint`, como los mínimos de la 003). Por platillo: `aporte_centimicro = q_micro × (100 × completas +
  porcentaje × medias)`. Se suma por producto en centésimas de millonésima, sin flotantes; el total se muestra con
  3 decimales redondeando a la mitad hacia arriba y se guarda exacto (`numeric(26,8)`).
- **Presentaciones de compra (RF-25).** `bolsas = ⌈total_centimicro / (factor_mili × 1000 × 100)⌉` con división
  entera hacia arriba; si el total es múltiplo exacto no suma una de más.
- **Usar como base y plantillas (RF-33, RF-34, RF-36, RF-39).** Se toman las piezas guardadas, se descartan las
  recetas que hoy están archivadas o ya no existen en el negocio, y se devuelven aparte sus nombres para el aviso.
  El cálculo nuevo se hace con las recetas vigentes.
- **Reemplazo de plantilla (RF-37).** Guardar con un nombre ocupado responde `template_exists` (409) con el id de
  la existente; el cliente pide confirmar y repite con `replaceId`, que sustituye sus renglones en una transacción
  y queda auditado.
- **Importación (RF-40 a RF-47).** Lectura en dos pasos sin estado en el servidor: el primer envío del archivo
  devuelve la revisión; la confirmación vuelve a enviar el mismo archivo y el servidor lo analiza de nuevo, así lo
  que se guarda siempre coincide con lo que valida el servidor en ese momento. Los platillos listos se guardan en
  una transacción con cerrojo por negocio, con media porción al 50 %.
- **Lector .xlsx (RF-40, RF-48).** Directorio central del zip, `zlib.inflateRawSync` por entrada, solo
  `xl/workbook.xml`, sus relaciones, `sharedStrings.xml` y las hojas. Límites: archivo ≤ 2 MB, ≤ 200 hojas, ≤ 30 MB
  descomprimidos en total y ≤ 2,000 filas por hoja; si algo no cuadra, `invalid_file`. Los números de celda se
  normalizan a 12 dígitos significativos (Excel guarda 0.4 como 0.40000000000000002) antes de validar los 3
  decimales.

## 4. Contrato de la API

Todas exigen sesión y sucursal activa (`no_branch` si no hay). Cantidades como texto (`"2.5"`).

| Ruta | Entrada | Salida |
|---|---|---|
| `GET /api/recipes` | — | `{ recipes: RecipeSummary[] }` del negocio activo |
| `POST /api/recipes` | `{ name, preparation?, halfPercent?, ingredients: [{ productId, presentationId?, quantity, note? }] }` | 201 `{ recipe }` |
| `GET/PUT /api/recipes/[id]` | igual que el alta (reemplaza la receta completa) | `{ recipe }` |
| `POST /api/recipes/[id]/archive\|reactivate` | — | `{ recipe }` |
| `POST /api/recipes/import` | `multipart`: `file`, `confirm?` | `{ dishes: [{ name, status, problems[] }] }` o `{ imported, skipped }` |
| `POST /api/calculations/preview` | `{ items: [{ recipeId, full, half }] }` | `{ lines }` sin guardar (RF-22) |
| `GET/POST /api/calculations` | `{ items }` | historial de la sucursal / 201 `{ calculation }` |
| `GET /api/calculations/[id]` | — | `{ calculation }` tal como se guardó |
| `GET /api/calculations/[id]/base` | — | `{ items, dropped[] }` vigentes (RF-33, RF-34) |
| `GET/POST /api/recipe-templates` | `{ name, items, replaceId? }` | lista / 201 `{ template }` |
| `GET/PATCH /api/recipe-templates/[id]` | `{ name }` | `{ template, items, dropped[] }` |
| `POST /api/recipe-templates/[id]/archive\|reactivate` | — | `{ template }` |

Errores nuevos (mensaje en `i18n/es/errors.ts`): `recipe_empty` (422, RF-13), `duplicate_ingredient` (422,
RF-11), `invalid_half_percent` (422, RF-18), `invalid_pieces` (422, RF-21), `calculation_empty` (422, RF-28),
`template_exists` (409, RF-37), `invalid_file` (422, RF-48), `file_too_large` (413, RF-48), `product_archived`
(409, RF-8). Se reutilizan `catalog_name_invalid`, `invalid_quantity`, `duplicate_name`, `forbidden`, `not_found`,
`no_branch`, `validation`.

## 5. Decisiones técnicas

- **La receta se guarda completa** (`PUT` con todos sus ingredientes) en vez de una ruta por ingrediente: RF-13 se
  valida de una vez, el registro de cambios guarda la receta anterior entera y el editor usa `RowEntry`.
  Descartado: rutas por ingrediente, que dejarían recetas a medias entre llamadas.
- **La vista previa se calcula en el servidor** (`/calculations/preview`, con espera de 150 ms tras teclear) para
  cumplir el principio 3 y la regla de que `features/` no calcula. Descartado: calcular en el cliente con la misma
  función de dominio, que duplicaría la fuente de verdad.
- **El cálculo guarda copias** (nombres, porcentajes, factores y totales) en sus propias tablas en vez de
  recalcular al abrirlo, porque RF-32 pide verlo tal como se hizo aunque cambien recetas o catálogo.
- **Importación sin estado en el servidor**: el archivo se envía dos veces (revisión y confirmación). Descartado:
  guardar el archivo o la revisión entre pasos, que pide limpieza y caducidad.
- **Navegación**: Recetas e Insumos entran al menú lateral y a «Más» del teléfono, y al inicio en una sección
  «Recetario» que sale de «Próximamente». La barra inferior no cambia: RF-45 de la 002 fija sus cuatro destinos;
  si el dueño quiere Insumos en la barra, entra como ajuste a esa spec.
- **Las pantallas cargan con servicios en el servidor**; la API atiende acciones, vista previa y pruebas.

## 6. Dependencias

Ninguna nueva. El .xlsx se lee con `zlib` de Node y un lector propio acotado a lo que pide RF-40. Descartadas:
`exceljs` (pesada, decenas de dependencias transitivas) y `xlsx` de SheetJS (la versión de npm está abandonada y
con avisos de seguridad).

## 7. Estrategia de tests

- **Unitarios** (`domain/recipes`, `server/adapters/xlsx`): porcentaje y piezas, suma exacta con medias y
  porcentajes distintos por platillo, 0.1 g × 9,999, redondeo hacia arriba de presentaciones y múltiplos exactos,
  orden alfabético, validación de recetas, análisis de hojas con cada problema, y el lector con un .xlsx de prueba
  generado en el test, uno corrupto, uno grande y uno con demasiadas hojas (RF-10, 11, 13, 16–18, 21, 23–26,
  40–46, 48–50).
- **Integración** (servicios y handlers contra `mando_test`): pertenencia y aislamiento entre negocios y entre
  sucursales, permisos, recetas con productos de otro negocio o archivados, historial inmutable, usar como base,
  plantillas con reemplazo, importación de punta a punta, auditoría, recetas en el detalle del producto (RF-1–9,
  12, 14, 15, 19, 20, 22, 27–39, 47, 51–53, 55).
- **E2E de escritorio** (`e2e/recetario.spec.ts`, primera línea con «spec 004»): crear una receta, importar un
  .xlsx con un platillo listo y otro con problemas, calcular con completas y medias, guardar, usar como base,
  guardar y usar una plantilla, consulta y filtro (RF-7, 8, 15, 20, 22, 24, 25, 29, 30, 33, 35–37, 42, 47, 54);
  volumen de 100 recetas; las páginas nuevas en `qa-sweep` con axe en claro y oscuro. Los teléfonos los prueba el
  dueño.

## 8. Entregas

1. **Dominio y esquema**: reglas puras y lector .xlsx con sus tests, migración y repositorios.
2. **Servicios y API**: recetas, cálculo, historial, plantillas e importación con permisos, auditoría y tests de
   integración.
3. **Pantallas**: recetas, editor, importación, cálculo con lista viva, historial y plantillas, con navegación.
4. **Cierre**: E2E, barrido, volumen, validación RF por RF y documentación.

## Ajustes al construir

- El reemplazo de plantilla se confirma con `replace: true` en vez de `replaceId`: el servidor busca la plantilla
  activa con ese nombre en la sucursal, así el cliente no necesita su id (RF-37).
- La cantidad de un ingrediente tiene su propio error, `invalid_ingredient_quantity`, porque debe ser mayor que cero
  y el `invalid_quantity` del catálogo admite cero (RF-10).
- `invalid_file` lleva un solo mensaje («debe ser un Excel (.xlsx) válido, con hasta 200 hojas»); el exceso de
  tamaño es `file_too_large` (RF-48).
- Una receta que ya tenía un ingrediente archivado se puede guardar de nuevo con él; lo que no se puede es añadir
  uno archivado (RF-8, RF-14).
- El recetario real de Pirrus se leyó con el lector propio (21 hojas, unidades como «Gramos », «mililitros»). Su
  hoja «TOSTI PIRRUS» tiene «TIO TORO» en la primera celda, así que al importarlo sale como duplicado de «TIO TORO»
  hasta corregir esa celda (RF-46).
- El editor de recetas no usa `RowEntry` (pensado para subir y bajar cantidades): cada ingrediente es un grupo con
  producto, cantidad, presentación y nota. Se sumaron a `src/ui` `TextArea`, `FileField`, `LinkButton`,
  `formatQuantity` y `formatDateTime`, e iconos de receta, calculadora, historial, subir y quitar.
- La vista previa espera 150 ms tras teclear (no 250) para cumplir los 300 ms del requisito de volumen; con 100
  recetas de 15 ingredientes la lista se actualiza por debajo de ese tiempo en escritorio.
- Recetas e Insumos están en «Más» del teléfono y en el menú lateral, para todos los perfiles; el E2E de la barra
  inferior (spec 002, RF-46) ahora espera esos dos destinos antes de Negocios y Personas.
- El inicio tiene la sección «Recetario» (recetas activas y fecha del último cálculo) y «Recetario» sale de
  «Próximamente».
