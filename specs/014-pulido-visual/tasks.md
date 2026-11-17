# Tareas — Spec 014

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Navegación

- [x] **T1 — Modelo de navegación**
  - RF: RF-1, RF-2, RF-3, RF-5, RF-6, RF-7
  - Depende de: —
  - Hecho cuando: `navigation.test.ts` en verde (categorías y orden, Administración solo al dueño, barra, activo por prefijo).
- [x] **T2 — Menú lateral, cuenta, barra y «Más»**
  - RF: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7
  - Depende de: T1
  - Hecho cuando: el menú se ve por categorías con el menú de la cuenta; la barra muestra Inicio, Inventario, Requisiciones y Checklists; `barra-inferior` y los E2E del menú en verde.

## Entrega 2 — Tablas

- [x] **T3 — Lógica de filtros, grupos y páginas**
  - RF: RF-8, RF-11, RF-12, RF-13, RF-14, RF-16, RF-17, RF-18
  - Depende de: —
  - Hecho cuando: `table-view.test.ts` en verde.
- [x] **T4 — `DataTable` con selectores, etiquetas, grupos, páginas y memoria**
  - RF: RF-8, RF-9, RF-10, RF-11, RF-12, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19
  - Depende de: T3
  - Hecho cuando: `/sistema/tabla` muestra todo y los E2E de pantallas tipo en verde.
- [x] **T5 — Pantallas con grupos y filtros por tipo**
  - RF: RF-13, RF-14
  - Depende de: T4
  - Hecho cuando: Existencias y Datos de compra por área, Productos por proveedor, Personal por puesto y movimientos por día; E2E de catálogo, inventario y personal en verde.

## Entrega 3 — Captura y espacio

- [x] **T6 — Renglón de captura compacto**
  - RF: RF-20, RF-21
  - Depende de: —
  - Hecho cuando: el componente está en `/sistema/captura` y se abre uno a la vez.
- [x] **T7 — Requisición, entradas, salidas y traspasos compactos**
  - RF: RF-20, RF-21, RF-22
  - Depende de: T6
  - Hecho cuando: E2E de requisiciones e inventario en verde y 6 renglones a la vista a 390 × 844.
- [x] **T8 — Encabezados más bajos**
  - RF: RF-23, RF-24
  - Depende de: —
  - Hecho cuando: medidas del E2E en escritorio y teléfono en verde.

## Entrega 4 — Logo

- [x] **T9 — Reglas del logo y migración**
  - RF: RF-25, RF-26, RF-28
  - Depende de: —
  - Hecho cuando: `business-logo.test.ts` en verde y `0012_logo_negocio` aplica conservando los negocios.
- [x] **T10 — Servicio y API del logo**
  - RF: RF-25, RF-26, RF-27, RF-33, RF-34
  - Depende de: T9
  - Hecho cuando: tests de integración de subir, cambiar, quitar, servir, permisos, aislamiento y registro en verde.
- [x] **T11 — Marca del negocio en pantalla**
  - RF: RF-27, RF-28, RF-29, RF-30
  - Depende de: T10
  - Hecho cuando: logo o inicial en el menú, «Elegir sucursal», Negocios (con subir y quitar) y tablero.
- [x] **T12 — Logo en la hoja de pago y en los Excel**
  - RF: RF-31, RF-32
  - Depende de: T10
  - Hecho cuando: test del libro con imagen y de los exportes con y sin logo en verde; la hoja de pago lo muestra.

## Entrega 5 — Cierre

- [x] **T13 — E2E, barrido y capturas**
  - RF: RF-1, RF-4, RF-6, RF-9, RF-10, RF-15, RF-19, RF-22, RF-23, RF-24, RF-29
  - Depende de: T2, T5, T7, T8, T11
  - Hecho cuando: `e2e/pulido-visual.spec.ts`, los E2E de escritorio afectados y `qa-sweep` en verde; capturas antes y después.
- [x] **T14 — Validación y documentos**
  - RF: todos
  - Depende de: T13
  - Hecho cuando: `validation.md` 34 de 34; `pnpm test`, `typecheck` y `lint` en verde; reglas y roadmap al día.

## Cobertura

| RF | Tareas |
|---|---|
| RF-1 | T1, T2, T13 |
| RF-2 | T1, T2 |
| RF-3 | T1, T2 |
| RF-4 | T2, T13 |
| RF-5 | T1, T2 |
| RF-6 | T1, T2, T13 |
| RF-7 | T1, T2 |
| RF-8 | T3, T4 |
| RF-9 | T4, T13 |
| RF-10 | T4, T13 |
| RF-11 | T3, T4 |
| RF-12 | T3, T4 |
| RF-13 | T3, T5 |
| RF-14 | T3, T4, T5 |
| RF-15 | T4, T13 |
| RF-16 | T3, T4 |
| RF-17 | T3, T4 |
| RF-18 | T3, T4 |
| RF-19 | T4, T13 |
| RF-20 | T6, T7 |
| RF-21 | T6, T7 |
| RF-22 | T7, T13 |
| RF-23 | T8, T13 |
| RF-24 | T8, T13 |
| RF-25 | T9, T10 |
| RF-26 | T9, T10 |
| RF-27 | T10, T11 |
| RF-28 | T9, T11 |
| RF-29 | T11, T13 |
| RF-30 | T11 |
| RF-31 | T12 |
| RF-32 | T12 |
| RF-33 | T10 |
| RF-34 | T10 |
