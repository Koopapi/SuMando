# Plan 006 — Importar inventario por áreas

Plan técnico de `spec.md` (37 RF). Respeta `docs/constitution.md` y `docs/architecture.md`.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/inventory/sheet-units.ts` | Familias de unidades (peso, volumen, pieza) con sus variantes, números decimales exactos y redondeo a 3 decimales de la unidad base | 10–14, 21, 34 |
| `domain/inventory/sheet-import.ts` | De las filas de cada hoja a productos con unidad base, presentaciones, mínimo, cantidad, estado, problemas y avisos, contra el catálogo actual | 6, 7, 9, 15–22, 26, 29, 30 |
| `server/adapters/xlsx.ts` | Límite de tamaño por llamada (40 MB aquí), bytes descomprimidos contados solo en lo que se lee y número de fila de Excel | 5, 8, 22 |
| `server/services/inventory/import.ts` | Revisión y confirmación en una transacción con el cerrojo del negocio: proveedores, productos, presentaciones, mínimos, áreas, listas y un conteo por área | 1–4, 16, 17, 23–36 |
| `app/api/inventory/import` | Formulario con `file`, `warehouseId` y `confirm=1` | 5, 8, 16, 23 |
| `app/(app)/inventario/importar`, `features/inventory/inventory-import.tsx` | Elegir almacén, subir, revisar por producto con filtros y confirmar | 3, 16, 17, 22, 36, 37 |
| `proxy.ts` | El `matcher` deja fuera `/api/`, que el proxy ya no tocaba, para que los cuerpos grandes no pasen por su búfer de 10 MB | 5 |

## 2. Modelo de datos

Sin migración: usa las tablas de las specs 003 y 005. `audit_log` suma el tipo `inventory_import`.

## 3. Algoritmos

- **Números exactos (RF-34).** El lector deja cada número en 12 cifras significativas. El valor se lee como entero
  escalado (sin flotantes), se multiplica por el factor de la unidad (1,000 para kilogramo y litro) y se redondea a
  milésimas de la unidad base, a la mitad hacia arriba.
- **Presentaciones (RF-11 a RF-15).** Conteo: «Kilogramo»/«Litro» = 1,000, u otra unidad no pieza = 1 pz. Compra: la
  presentación final, con su equivalencia estándar si es de peso o volumen, o CONVERSIÓN × factor de la unidad; si
  coincide con la unidad base o con la de conteo, no se crea.
- **Revisión sin estado (como la spec 004).** El archivo y el almacén se envían para revisar y otra vez para
  confirmar; el servidor analiza de nuevo dentro de la transacción.
- **Conteo por área (RF-32).** Con las existencias bloqueadas, lo contado reemplaza la existencia y la diferencia
  se guarda como conteo y movimiento `count` (mismas reglas de la spec 005), una vez por área.

## 4. Contrato de la API

`POST /api/inventory/import` (`multipart/form-data`: `file`, `warehouseId`, `confirm?`). Revisión: `{ summary,
rows: [{ sheet, row, area, name, status, baseUnit, count, purchase, min, quantity, problems[], warnings[] }] }`.
Confirmación: `{ created, completed, skipped, areasCounted }`. Errores: `invalid_file`, `file_too_large` (413),
`not_found`, `archived_item`, `import_empty` (422, RF-24).

## 5. Decisiones técnicas

- **El proxy no ve `/api/`**: ya devolvía `next()` para esas rutas; sacarlas del `matcher` evita el búfer de 10 MB
  de Next 16 sin subir el límite de todas las peticiones. Descartado: `proxyClientMaxBodySize` de 45 MB global.
- **Imágenes ignoradas sin descomprimirlas**: el límite de bytes descomprimidos se cuenta solo en las entradas que se
  leen, así una hoja de 35 MB de fotos pasa y un libro inflado artificialmente sigue rechazándose.
- **El conteo de la importación usa el área de la hoja aunque el producto se cuente en otra área** (aviso de
  RF-30): la existencia es del almacén, no del área.

## 6. Dependencias

Ninguna nueva.

## 7. Estrategia de tests

- **Unitarios**: unidades y variantes, decimales y redondeo, presentaciones, encabezados, filas de grupo, repetidos,
  existentes con otra unidad, área en otro almacén, avisos (RF-6, 7, 9–15, 18–22, 29, 30, 34).
- **Integración**: revisión sin guardar, confirmación completa con conteo, reimportar sin duplicar, existente que se
  completa, permisos y aislamiento, archivo inválido y vacío, auditoría (RF-1–5, 8, 16, 17, 23–28, 31–33, 35, 36).
- **E2E de escritorio** (`e2e/importar-inventario.spec.ts`): subir, revisar, confirmar y ver existencias y áreas
  (RF-3, 16, 17, 22, 36, 37); volumen de 300 productos; la pantalla en `qa-sweep`.

## 8. Entregas

1. **Dominio y lector**: unidades, análisis de hojas y ajustes del lector, con sus tests.
2. **Servicio y API**: revisión, confirmación, conteo, permisos y tests de integración.
3. **Pantalla y cierre**: importar, enlaces, E2E, volumen, barrido, validación y documentos.

## Ajustes al construir

- RF-15 se aclaró en la spec: si la presentación final es igual a la unidad o a la unidad base, no hay presentación
  de compra y tampoco aviso (sería ruido en casi todas las filas de kilogramos); el aviso queda para presentación
  final vacía o conversión inválida.
- Un producto que ya se cuenta en otra área del almacén se queda en esa área (aviso), pero su cantidad entra en el
  conteo del área de la hoja: la existencia es del almacén.
- La nota del movimiento de conteo lleva el nombre del archivo importado.
- Prueba con las hojas reales (fuera del repositorio): Pirrus 09/11 (96 productos, 6 áreas), Sendero 09/11 (53, 8
  áreas) y la base de Sendero de 35 MB (97, 12 áreas) se revisan en milisegundos y se importan sin problemas; solo
  avisos de presentación de compra donde la hoja no trae presentación final.
