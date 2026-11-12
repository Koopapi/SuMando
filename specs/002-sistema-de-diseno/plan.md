# Plan 002 — Sistema de diseño

Plan técnico de `spec.md`. Respeta `docs/constitution.md` y `docs/architecture.md`.

**Identidad elegida por el dueño (11 de noviembre de 2026): dirección B, «Al mando».** Icono de perilla casi al
tope en azul marino y ámbar; nombre «SuMando» en Space Grotesk con la M en ámbar. Paleta:

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| Principal | `#22306B` | `#9AABFF` | botón principal, enlaces, foco |
| Sobre principal | `#FFFFFF` | `#0B1030` | texto sobre el principal |
| Acento (relleno) | `#E39B0B` | `#FFC54D` | perilla, detalles, avisos de atención |
| Acento (texto) | `#B57900` | `#FFC54D` | la M del nombre y texto en ámbar |
| Texto | `#151A2E` | `#E7E9F4` | texto principal |
| Fondo | `#F5F6FA` | `#0E1120` | fondo de página |
| Superficie | `#FFFFFF` | `#181C30` | tarjetas, barras, diálogos |

Los tokens que faltan (texto secundario, líneas, éxito, advertencia, peligro, foco) y los 8 colores de negocio se
fijan en la tarea T2 en Pencil y se comprueban con el test de contraste antes de pasar a código.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `src/ui/tokens.css` | Tokens semánticos en hexadecimal: `:root` claro y `@media (prefers-color-scheme: dark)` oscuro; `@theme inline` los expone a Tailwind; `color-scheme: light dark`; `prefers-reduced-motion` sin transiciones; foco visible; clases `.biz-<color>` con los 8 colores en los dos modos | 4–6, 13, 38, 39, RNF contraste |
| `src/ui/brand/` (`logo.tsx`, `logo-svg.ts`) | Perilla en SVG y nombre «SuMando» con la M en ámbar; el mismo SVG alimenta los iconos | 1, 2 |
| `scripts/make-icons.mjs` | Genera 192, 512, 512 maskable (zona segura), 180 de Apple y 64 de pestaña desde `logo-svg.ts` | 2 |
| `src/app/layout.tsx`, `manifest.ts` | Nombre SuMando, plantilla de título «%s · SuMando», `themeColor` por modo, fuentes con `next/font` | 1, 2, 7 |
| `src/domain/business-color.ts` | Paleta cerrada de 8 claves, validación y `suggestColor(usados)` (primer libre o el primero) | 8, 10 |
| `src/domain/search.ts` | Clave de búsqueda sin mayúsculas ni acentos | 30 |
| `src/domain/quantity.ts` | Interpretar una cantidad capturada (número no negativo, coma o punto decimal, hasta 3 decimales) | 33 |
| `src/ui/format.ts` | Pesos (`es-MX`, MXN) y fechas («11 nov 2026», zona `America/Mexico_City`) con `Intl` | 23, 24 |
| `src/ui/` componentes | `Button` (variantes, ocupado), `IconButton`, `TextField`, `NumberField`, `MoneyField`, `SelectField`, `Checkbox`, `SearchField`, `FilterChips`, `Dialog` (`<dialog>` nativo), `Sheet` (menú en teléfono), `ToastProvider`/`useToast`, `Alert`, `EmptyState`, `LoadingState`, `ErrorState`, `StatusBadge`, `BusinessBadge`, `PageHeader`, `Card` | 21, 22, 25–29, 37 |
| `src/ui/data-table.tsx` | Una sola tabla semántica: columnas completas desde 1024 px; por debajo, cada renglón es tarjeta con columnas principales y botón para abrir el resto; búsqueda, filtros y estados | 19, 20, 29–31 |
| `src/ui/row-entry.tsx` | Captura por renglones con menos y más, teclado numérico y error por renglón | 22, 32, 33 |
| `src/ui/wizard.tsx` | Asistente: «Paso n de m», anterior sin perder datos, confirmar al salir (botón cerrar, enlaces de la app y recarga del navegador) | 34–36 |
| `src/ui/app-shell.tsx` | Menú lateral fijo desde 1024 px; por debajo, barra con botón de menú que abre `Sheet`; insignia del negocio activo | 12, 16, 17, 18 |
| `src/server/services/businesses.ts` | `createBusiness` exige color; `updateBusiness` (nombre o color, solo dueño, auditado); listados con color y color sugerido | 8–11, 15 |
| `src/app/api/businesses/…` | `POST` con `color`; `PATCH /api/businesses/[id]` acepta `name` y/o `color` | 8, 9, 11 |
| `src/features/*` | Pantallas de la 001 reconstruidas con los componentes; elegir color al crear y editar negocio | 13, 43, 44 |
| `src/app/sistema/…` + `src/features/system/` | Catálogo de componentes y las tres pantallas tipo con datos de ejemplo; 404 fuera de `DEV_ENDPOINTS=1` | 40–42 |
| `src/i18n/es/*` | Textos nuevos, nombres de los 8 colores, «SuMando» en un solo lugar (`common.appName`) | 1, 3 |
| `recursos/sumando.pen` | Identidad, componentes y maquetas (se mueve desde `Diseño/untitled.pen`) | criterios de finalización |

## 2. Modelo de datos

Migración `0001_color_negocio`:

- `businesses.color varchar(16)`: se agrega nula, se rellena y pasa a `NOT NULL` con `CHECK` en las 8 claves.
- Relleno (RF-10): por orden de `created_at`, el negocio n-ésimo recibe la clave n de la paleta si n ≤ 8 y la
  primera si n > 8. Con la BD vacía de colores, eso es exactamente «el primero libre, o el primero si no hay».
- Se guarda la **clave** (`violeta`, `azul`…), no el hexadecimal: los tonos se ajustan en `tokens.css` sin migrar.

## 3. Algoritmos

- **Color sugerido** (RF-8, RF-10): `suggestColor(usados)` recorre la paleta en orden y devuelve la primera clave
  que no está en `usados` (negocios activos y archivados); si todas están, la primera. El formulario de alta llega
  con ese color preseleccionado; el dueño puede cambiarlo antes de crear.
- **Búsqueda** (RF-30): `searchKey(t) = t.normalize("NFD")` sin marcas diacríticas, en minúsculas y con espacios
  compactados; un renglón coincide si la clave de alguno de sus campos buscables contiene la clave del texto.
- **Cantidad** (RF-33): acepta `^\d+([.,]\d{1,3})?$` tras recortar espacios; cualquier otra cosa es error del
  renglón. Menos no baja de 0.
- **Salir del asistente** (RF-36): mientras hay datos sin terminar, el asistente escucha `beforeunload`, intercepta
  en fase de captura los clics en enlaces internos y su propio botón de cerrar, y pide confirmar con `Dialog`.
- **Contraste** (RNF): fórmula de luminancia relativa de WCAG 2.2 sobre los pares de tokens y los 8 colores de
  negocio, en los dos modos.

## 4. Contrato de la API

| Ruta | Entrada | Salida | Errores |
|---|---|---|---|
| `POST /api/businesses` | `{ name, firstBranchName, color }` | 201 `{ business, branch }` con `business.color` | `invalid_color` 400 «Elige uno de los colores de la lista.»; los de la 001 |
| `PATCH /api/businesses/[id]` | `{ name?, color? }` (al menos uno) | 200 `{ business }` | `invalid_color` 400; `nothing_to_update` 400 «No hay cambios que guardar.»; `forbidden` 403 si no es dueño (RF-11); `not_found` 404 |

El `PATCH` de nombre de la 001 se conserva con la misma forma; el color es un campo más. Cada cambio de color
escribe en `audit_log` la acción `business.color_changed` con el valor anterior y el nuevo (RF-15).

## 5. Decisiones técnicas

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Modo oscuro solo con `prefers-color-scheme` en CSS | Clase `dark` en `<html>` con JavaScript | RF-6 pide cambiar al instante sin recargar; el navegador ya lo hace sin parpadeo y sin código. No hay selector propio (fuera de alcance) |
| Tokens en hexadecimal | `oklch` como en la 001 | El test de contraste los lee directo de `tokens.css` sin convertir espacios de color |
| `themeColor` como arreglo con `media` por modo | Un solo color | RF-7: la barra del navegador y la del teléfono siguen el modo |
| Fuentes con `next/font/google` (Space Grotesk para marca, títulos y botones; Inter para texto) | Fuentes del sistema; `@fontsource` | Viene con Next, se sirven desde la propia app sin pedir nada a Google en tiempo de uso, y no agrega dependencia. La compilación necesita red (CI y Coolify la tienen) |
| Tabla única que se vuelve tarjetas con CSS bajo 1024 px | Dos marcados (tabla y tarjetas) ocultando uno | Un solo árbol: los lectores de pantalla y las E2E ven cada dato una vez |
| Corte teléfono/escritorio en `lg` de Tailwind (1024 px) | Punto propio | Coincide con RF-16 a RF-20 sin configurar nada |
| `<dialog>` nativo con `showModal()` | Trampa de foco propia | El navegador vuelve inerte el resto de la página y cierra con Escape (RF-37) |
| Avisos con `ToastProvider` en el diseño raíz y región `aria-live` | Avisos por pantalla | Un solo lugar para los 4 segundos (RF-27) y el error persistente (RF-28) |
| Iconos generados desde el mismo SVG del logo | Exportar PNG desde Pencil | Una sola fuente; Pencil queda como referencia visual |
| Guardar la clave del color de negocio | Guardar el hexadecimal | Ajustar tonos por contraste no requiere migración |
| Revisión de estilos sueltos con un test (como el de textos sueltos) | Regla de ESLint propia | Mismo patrón que `i18n.test.ts`; prohíbe `style=`, valores arbitrarios `[…]`, colores en hexadecimal y la paleta por defecto de Tailwind en `app/` y `features/` |
| El catálogo sigue en `/sistema` con `DEV_ENDPOINTS=1` y suma `/sistema/tabla`, `/sistema/captura`, `/sistema/asistente` | Storybook | Sin dependencia nueva; el catálogo corre con el mismo build que las E2E |
| Nombre de la app en `es.common.appName` | Literal en cada pantalla | RF-3 se comprueba en un solo lugar, más un test que barre diccionarios, manifiesto y metadatos |

## 6. Dependencias

- `@axe-core/playwright` (solo desarrollo): el barrido de pantallas ya mide desbordes y nombres; para fallas de
  contraste en claro y oscuro (RNF) hace falta un motor de reglas de accesibilidad probado. Escribir uno propio
  sería más código que el resto de la spec. No entra en la imagen de producción.
- Ninguna dependencia de producción nueva.

## 7. Estrategia de tests

| Grupo | Qué cubre | RF |
|---|---|---|
| Unidad (`src/domain`) | `suggestColor`, validación de color, `searchKey`, `parseQuantity` | 8, 10, 30, 33 |
| Unidad (`src/ui`) | Formato de pesos y fechas; contraste de tokens y colores de negocio en los dos modos; estilos sueltos; «SuMando» en diccionarios, manifiesto y metadatos | 1–3, 23, 24, RNF |
| Integración | Alta con color, cambio de color, rechazo a administrador, auditoría, color inválido; la migración rellena colores a negocios existentes (aplica `0000`, siembra, aplica `0001`) | 8–11, 15 |
| E2E catálogo (`e2e/sistema.spec.ts`) | Áreas táctiles, teclado numérico, errores de campo, botón ocupado, avisos de 4 s y persistentes, estados, búsqueda, captura por renglones, asistente, diálogo, foco visible, movimiento reducido, 404 en producción | 21, 22, 25–39, 40–42 |
| E2E identidad y modo (`e2e/identidad.spec.ts`) | Nombre e icono, modo claro y oscuro, cambio de modo sin perder lo capturado, `theme-color` | 1–7 |
| E2E negocio y navegación (`e2e/negocio-color.spec.ts`) | Elegir color, barra con nombre y color, menú en teléfono y lateral en escritorio, tablas completas o tarjetas, 360 px sin desborde | 8, 9, 12–14, 16–20 |
| E2E de la 001 | Siguen en verde sobre las pantallas reconstruidas | 43, 44 |
| Barrido (`e2e/qa-sweep.spec.ts`) | Se amplía a claro y oscuro con axe (contraste) | 18, RNF |
| Recorrido (`e2e/recorrido-002.spec.ts`) | El E2E principal de los criterios de finalización | varios |

## 8. Entregas

1. **Identidad en Pencil y en código**: archivo en `recursos/sumando.pen`, tokens y 8 colores aprobados, logo,
   iconos, nombre SuMando, modo claro y oscuro (RF-1 a RF-7).
2. **Maquetas aprobadas**: componentes en claro y oscuro, siete pantallas actuales y tres pantallas tipo en
   teléfono y escritorio. Puerta: el dueño las aprueba antes de construir la entrega 3.
3. **Componentes base y catálogo** (RF-21 a RF-29, RF-37 a RF-42).
4. **Tabla, captura por renglones y asistente** con sus pantallas tipo (RF-19, RF-20, RF-30 a RF-36).
5. **Color de negocio y estructura** (RF-8 a RF-18).
6. **Pantallas actuales reconstruidas, barrido, recorrido y validación** (RF-43, RF-44, RNF).
