# Plan 014 — Pulido visual

Plan técnico de `spec.md` (34 RF). Respeta `docs/constitution.md` y `docs/architecture.md`. Casi todo vive en el
sistema de diseño (`src/ui`, spec 002): las pantallas solo cambian sus datos de entrada.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/navigation.ts` | Destinos por categoría según el rol, los cuatro de la barra del teléfono y qué destino está activo para una ruta | 1–3, 5–7 |
| `features/shell/app-shell.tsx`, `ui/account-menu.tsx`, `ui/bottom-nav.tsx` | Menú lateral con categorías, menú de la cuenta, barra y «Más» por categorías | 1–7 |
| `domain/table-view.ts` | Filtros por tipo, búsqueda, agrupado con cuentas y «Sin…», regla de abiertos (>50), páginas de 25 | 8–18 |
| `ui/data-table.tsx` | Selectores de filtro, etiquetas quitables, «Limpiar», conteo, grupos plegables, «Abrir todos / Cerrar todos», páginas, memoria en `sessionStorage` | 8–19 |
| `features/*` (existencias, datos de compra, productos, personal, movimientos) | Declarar el tipo de cada filtro y por qué se agrupa | 13, 14 |
| `ui/capture-row.tsx` | Renglón de captura en una franja que se abre para editar, uno a la vez | 20, 21 |
| `features/requisitions/requisition-builder.tsx`, `features/inventory/lines-editor.tsx`, `transfer-form.tsx` | Usar el renglón compacto | 20–22 |
| `ui/page-header.tsx` | Encabezado más bajo | 23, 24 |
| `domain/business-logo.ts` | Tipo y tamaño permitidos, firma PNG y medidas de la imagen | 25, 26, 28 |
| `server/services/business-logo.ts`, `app/api/businesses/[id]/logo` | Subir, cambiar, quitar y servir el logo con permisos y registro | 25–27, 33, 34 |
| `ui/business-mark.tsx` | Logo completo en un cuadro claro, o la inicial sobre el color | 28–30 |
| `server/adapters/xlsx-writer.ts`, exportes de nómina y tablero | Imagen en el encabezado del libro | 32 |
| `features/payroll/pay-sheet.tsx` | Logo en la hoja de pago | 31 |

## 2. Modelo de datos (migración `0012_logo_negocio`)

- **`businesses`**: columnas nuevas `logo_key` (nula), `logo_width`, `logo_height` (enteros, nulas) y
  `logo_updated_at` (nula). Solo añade. El archivo vive en el almacén de archivos de la spec 008 con la clave
  `<negocio>/<uuid>`; al cambiar o quitar el logo, el archivo anterior se conserva (nada se borra) y deja de servirse.

## 3. Algoritmos

- **Activo en el menú (RF-5).** Gana el destino cuyo `href` es el prefijo más largo de la ruta (con `/` como límite).
- **Agrupado (RF-13 a RF-17).** Se filtra y se busca sobre todos los renglones; se agrupa lo que coincide por la clave
  que da la pantalla; los grupos se ordenan por nombre con «Sin…» al final; con un solo grupo no hay título. Abiertos
  por defecto si el total de la lista es ≤ 50; con búsqueda o filtro, todos los grupos con coincidencias se abren.
- **Páginas (RF-18).** Sin agrupar y con más de 25 coincidencias: `páginas = ⌈n / 25⌉`; cambiar filtro o búsqueda
  vuelve a la página 1.
- **Logo (RF-25, RF-26, RF-28).** La pantalla acepta PNG, JPG o WEBP de hasta 2 MB, lo dibuja en un lienzo con el lado
  mayor en 512 px como máximo y lo sube como PNG. El servidor vuelve a comprobar la firma PNG, el tamaño (2 MB) y lee
  ancho y alto del encabezado `IHDR`.
- **Excel con logo (RF-32).** Con logo, el libro lleva `xl/drawings/drawing1.xml`, su relación y `xl/media/logo.png`;
  la imagen se ancla en A1 con 48 px de alto y su ancho proporcional, y los datos empiezan cuatro filas abajo. Solo se
  pone cuando el libro es de un solo negocio.

## 4. Contrato de la API

| Ruta | Entrada | Salida |
|---|---|---|
| `PUT /api/businesses/[id]/logo` | cuerpo binario `image/png` (≤ 2 MB) | `{ business }` con `logoVersion` |
| `DELETE /api/businesses/[id]/logo` | — | `{ business }` |
| `GET /api/businesses/[id]/logo` | — | la imagen (`image/png`, `Cache-Control: private`), 404 si no hay o no hay acceso |

Errores nuevos: `logo_invalid` (422): «El logo tiene que ser PNG, JPG o WEBP de hasta 2 MB.». Se reutilizan
`forbidden` y `not_found`.

## 5. Decisiones técnicas

- **Convertir a PNG en el navegador** en vez de una librería de imágenes en el servidor: sin dependencias nuevas, el
  logo queda chico (≤ 512 px) y en un formato que Excel acepta (Excel no muestra WEBP). Descartado: guardar el
  original y convertir en el servidor (pide `sharp`).
- **Agrupado, filtros y páginas dentro de `DataTable`** para que todas las tablas los tengan igual; las pantallas solo
  dicen el tipo de cada filtro (`group`) y la clave de agrupado (`groupBy`).
- **Memoria de grupos y página en `sessionStorage`** con la clave de la tabla: dura la sesión del navegador, como pide
  RF-19, sin tocar el servidor.
- **Historial de movimientos** sigue paginado en el servidor de 50 en 50 (spec 005); se agrupa por día dentro de cada
  tanda.
- **Menú desde un modelo puro** (`domain/navigation.ts`) para probar categorías, rol y barra sin pantalla.

## 6. Dependencias

Ninguna nueva.

## 7. Estrategia de tests

- **Unitarios**: navegación por rol y activo (RF-1 a RF-7), filtros, agrupado, abiertos y páginas (RF-8 a RF-18),
  firma y medidas PNG (RF-26, RF-28), Excel con imagen (RF-32).
- **Integración**: subir, cambiar, quitar y servir el logo con permisos, aislamiento y registro (RF-25 a RF-27, RF-33,
  RF-34); exportes con y sin logo (RF-31, RF-32).
- **E2E de escritorio** (`e2e/pulido-visual.spec.ts`): menú y cuenta, filtros con etiquetas, grupos plegables y
  memoria, páginas, renglón compacto y medidas (RF-22 a RF-24 a 390 px y 1366 px), logo en el menú, en «Elegir
  sucursal» y en Negocios. Se ajustan los E2E existentes que dependían del menú, la barra y los filtros. `qa-sweep`
  en claro y oscuro.

## 8. Entregas

1. **Navegación**: menú por categorías, menú de la cuenta, barra y «Más».
2. **Tablas**: filtros en selectores, grupos plegables, páginas y memoria.
3. **Captura y espacio**: renglón compacto y encabezados.
4. **Logo**: base, servicio, API, marca en pantalla, hoja de pago y Excel.
5. **Cierre**: E2E, barrido, capturas antes y después, validación y documentos.
