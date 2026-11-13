# Tareas — Spec 005

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Dominio y esquema

- [x] **T1 — Cantidades, estados y permisos por almacén**
  - RF: RF-3, RF-4, RF-7, RF-8, RF-9, RF-18, RF-19, RF-20, RF-21, RF-56
  - Depende de: —
  - Hecho cuando: `quantities.test.ts` y `access.test.ts` en verde (renglón > 0 con 3 decimales, ajuste con signo, conversión exacta, negativo y bajo mínimo, almacén de sucursal y del negocio).
- [x] **T2 — Validación de movimientos**
  - RF: RF-10, RF-14, RF-15, RF-16, RF-19, RF-64
  - Depende de: —
  - Hecho cuando: `movement.test.ts` en verde (sin renglones, producto repetido, motivos de salida, «otro» sin nota, motivos y textos).
- [x] **T3 — Traspasos: estados y producto propuesto**
  - RF: RF-23, RF-27, RF-31, RF-32, RF-33, RF-37
  - Depende de: —
  - Hecho cuando: `transfer.test.ts` en verde (transiciones válidas e inválidas, correspondencia recordada, nombre y unidad base, unidad distinta).
- [x] **T4 — Conteo: diferencias y cambios**
  - RF: RF-46, RF-47, RF-49, RF-50, RF-51, RF-52
  - Depende de: —
  - Hecho cuando: `count.test.ts` en verde («Igual», «Lo que falta, igual», diferencia contra la existencia al aplicar, sin capturar no cambia, productos que cambiaron).
- [x] **T5 — Migración y repositorios**
  - RF: RF-1, RF-53, RF-60, RF-63
  - Depende de: —
  - Hecho cuando: `0004_inventarios` aplica sobre `mando_test` y el test de esquema comprueba tablas, índices únicos y CHECK; suma atómica probada contra la base.

## Entrega 2 — Servicios y API

- [x] **T6 — Visibilidad y existencias**
  - RF: RF-1, RF-2, RF-5, RF-6, RF-55, RF-56, RF-57, RF-58, RF-59
  - Depende de: T1, T5
  - Hecho cuando: tests de integración de almacenes visibles por sucursal, existencias con mínimos, bajo mínimo, archivados y existencia en el detalle del producto en verde.
- [x] **T7 — Entradas, salidas y ajustes**
  - RF: RF-3, RF-4, RF-6, RF-7, RF-8, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20, RF-60
  - Depende de: T1, T2, T6
  - Hecho cuando: tests de integración de cada tipo, permisos por almacén, archivados, negativos y movimientos simultáneos sin pérdida en verde.
- [x] **T8 — Historial, lista y cancelaciones**
  - RF: RF-61, RF-62, RF-63, RF-64, RF-65, RF-66
  - Depende de: T7
  - Hecho cuando: tests de integración del historial con existencia que dejó, lista con filtros, cancelación con inverso, doble cancelación y no cancelables en verde.
- [x] **T9 — Traspasos**
  - RF: RF-22, RF-23, RF-24, RF-25, RF-26, RF-27, RF-28, RF-29, RF-30, RF-31, RF-32, RF-33, RF-34, RF-35, RF-36, RF-37, RF-38
  - Depende de: T3, T7
  - Hecho cuando: tests de integración de traspaso interno, entre negocios en camino, recepción con diferencia, producto elegido y recordado, cancelación, estados y lo que ve el remitente en verde.
- [x] **T10 — Áreas de conteo y conteos**
  - RF: RF-39, RF-40, RF-41, RF-42, RF-43, RF-44, RF-45, RF-46, RF-47, RF-48, RF-49, RF-50, RF-51, RF-52, RF-53, RF-54
  - Depende de: T4, T7
  - Hecho cuando: tests de integración de lista del área, producto en otra área, sin área, conteo aplicado, sin capturar, cambio concurrente con confirmación y último conteo en verde.
- [x] **T11 — API y aislamiento**
  - RF: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6
  - Depende de: T6, T7, T8, T9, T10
  - Hecho cuando: tests de handlers de cada ruta (contrato y errores) y de aislamiento entre negocios y sucursales en verde.

## Entrega 3 — Pantallas

- [ ] **T12 — Existencias, detalle del producto y navegación**
  - RF: RF-9, RF-21, RF-55, RF-56, RF-57, RF-58, RF-59, RF-67
  - Depende de: T11
  - Hecho cuando: `/inventario` muestra existencias por almacén con búsqueda y filtros; el detalle del producto muestra sus existencias; Inventario en el menú lateral, en «Más» y en el inicio; a 360 px y en escritorio.
- [ ] **T13 — Entrada, salida y ajuste**
  - RF: RF-7, RF-8, RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20
  - Depende de: T12
  - Hecho cuando: formularios con renglones, presentación y motivo; errores en español; la existencia cambia al guardar.
- [ ] **T14 — Traspasos y recepción**
  - RF: RF-22, RF-23, RF-24, RF-25, RF-26, RF-27, RF-28, RF-29, RF-30, RF-31, RF-32, RF-33, RF-34, RF-35, RF-36, RF-37, RF-38
  - Depende de: T12
  - Hecho cuando: traspaso a otro almacén o negocio, lista por recibir y enviados, recepción con cantidad y producto, cancelación.
- [ ] **T15 — Lista del área y conteo**
  - RF: RF-39, RF-40, RF-41, RF-42, RF-43, RF-44, RF-45, RF-46, RF-47, RF-48, RF-51, RF-54
  - Depende de: T12
  - Hecho cuando: `almacenes/areas/[id]` arma y ordena la lista; `/inventario/conteo` muestra áreas, último conteo y productos sin área; el conteo captura con teclado numérico, «Igual», borrador local y aviso de cambios.
- [ ] **T16 — Movimientos, historial y cancelación**
  - RF: RF-61, RF-62, RF-64, RF-66
  - Depende de: T12
  - Hecho cuando: lista con filtros, detalle con cancelación y motivo, historial de un producto en un almacén.

## Entrega 4 — Cierre

- [ ] **T17 — E2E, volumen y barrido**
  - RF: RF-7, RF-11, RF-14, RF-20, RF-21, RF-22, RF-26, RF-27, RF-28, RF-29, RF-30, RF-31, RF-32, RF-33, RF-34, RF-35, RF-40, RF-44, RF-45, RF-46, RF-47, RF-48, RF-49, RF-55, RF-56, RF-57, RF-61, RF-64, RF-67
  - Depende de: T13, T14, T15, T16
  - Hecho cuando: `e2e/inventario.spec.ts` en verde con el volumen de 1,000 productos y 50,000 movimientos, y las páginas nuevas en el barrido con axe en claro y oscuro, en escritorio.
- [ ] **T18 — Validación y documentos**
  - RF: todos
  - Depende de: T17
  - Hecho cuando: `validation.md` con 67 de 67 RF; `docs/reglas-de-negocio.md` en «Vigente»; roadmap y arquitectura al día; Vitest y E2E de escritorio en verde.

## Cobertura

| RF | Tareas |
|---|---|
| RF-1 | T5, T6, T11, T18 |
| RF-2 | T6, T11, T18 |
| RF-3 a RF-4 | T1, T7, T11, T18 |
| RF-5 | T6, T11, T18 |
| RF-6 | T6, T7, T11, T18 |
| RF-7 | T1, T7, T13, T17, T18 |
| RF-8 | T1, T7, T13, T18 |
| RF-9 | T1, T12, T18 |
| RF-10 | T2, T13, T18 |
| RF-11 | T7, T13, T17, T18 |
| RF-12 a RF-13 | T7, T13, T18 |
| RF-14 | T2, T7, T13, T17, T18 |
| RF-15 a RF-16 | T2, T7, T13, T18 |
| RF-17 | T7, T13, T18 |
| RF-18 | T1, T7, T13, T18 |
| RF-19 | T1, T2, T7, T13, T18 |
| RF-20 | T1, T7, T13, T17, T18 |
| RF-21 | T1, T12, T17, T18 |
| RF-22 | T9, T14, T17, T18 |
| RF-23 | T3, T9, T14, T18 |
| RF-24 a RF-25 | T9, T14, T18 |
| RF-26 | T9, T14, T17, T18 |
| RF-27 | T3, T9, T14, T17, T18 |
| RF-28 a RF-30 | T9, T14, T17, T18 |
| RF-31 a RF-33 | T3, T9, T14, T17, T18 |
| RF-34 a RF-35 | T9, T14, T17, T18 |
| RF-36 | T9, T14, T18 |
| RF-37 | T3, T9, T14, T18 |
| RF-38 | T9, T14, T18 |
| RF-39 | T10, T15, T18 |
| RF-40 | T10, T15, T17, T18 |
| RF-41 a RF-43 | T10, T15, T18 |
| RF-44 a RF-45 | T10, T15, T17, T18 |
| RF-46 a RF-47 | T4, T10, T15, T17, T18 |
| RF-48 | T10, T15, T17, T18 |
| RF-49 | T4, T10, T17, T18 |
| RF-50 | T4, T10, T18 |
| RF-51 | T4, T10, T15, T18 |
| RF-52 | T4, T10, T18 |
| RF-53 | T5, T10, T18 |
| RF-54 | T10, T15, T18 |
| RF-55 | T6, T12, T17, T18 |
| RF-56 | T1, T6, T12, T17, T18 |
| RF-57 | T6, T12, T17, T18 |
| RF-58 a RF-59 | T6, T12, T18 |
| RF-60 | T5, T7, T18 |
| RF-61 | T8, T16, T17, T18 |
| RF-62 | T8, T16, T18 |
| RF-63 | T5, T8, T18 |
| RF-64 | T2, T8, T16, T17, T18 |
| RF-65 | T8, T18 |
| RF-66 | T8, T16, T18 |
| RF-67 | T12, T17, T18 |
