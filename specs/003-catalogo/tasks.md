# Tareas — Spec 003

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Dominio y esquema

- [x] **T1 — Unidades y cantidades exactas**
  - RF: RF-10, RF-13, RF-17, RF-23, RF-25, RF-26
  - Depende de: —
  - Hecho cuando: `domain/catalog/units.test.ts` en verde (lectura con coma o punto, 3 decimales, conversión ida y vuelta, redondeo).
- [x] **T2 — Nombres y mínimos**
  - RF: RF-24, RF-25, RF-31, RF-32
  - Depende de: —
  - Hecho cuando: `names.test.ts` y `levels.test.ts` en verde.
- [x] **T3 — Permisos del catálogo**
  - RF: RF-6, RF-7
  - Depende de: —
  - Hecho cuando: `access.test.ts` en verde (dueño, administrador del negocio, administrador de otra sucursal, de otro negocio).
- [x] **T4 — Migración y repositorios**
  - RF: RF-1, RF-2, RF-3
  - Depende de: —
  - Hecho cuando: `0002_catalogo` aplica sobre `mando_test` y un test de esquema comprueba tablas, índices parciales y CHECK.

## Entrega 2 — Servicios y API

- [x] **T5 — Proveedores**
  - RF: RF-1, RF-27, RF-30, RF-33, RF-34, RF-38
  - Depende de: T2, T3, T4
  - Hecho cuando: tests de integración de alta, edición, duplicado, archivo, reactivación y auditoría en verde.
- [x] **T6 — Productos y presentaciones**
  - RF: RF-9, RF-11, RF-12, RF-14, RF-15, RF-16, RF-28, RF-35
  - Depende de: T1, T5
  - Hecho cuando: tests de integración en verde, incluido el proveedor archivado.
- [x] **T7 — Almacenes y áreas**
  - RF: RF-2, RF-3, RF-5, RF-7, RF-18, RF-19, RF-20, RF-21
  - Depende de: T3, T4
  - Hecho cuando: tests de unicidad cruzada, permisos por sucursal y responsable en verde.
- [x] **T8 — Mínimos y máximos**
  - RF: RF-17, RF-22, RF-23, RF-24, RF-26, RF-36
  - Depende de: T6, T7
  - Hecho cuando: guardar en caja, cambiar la equivalencia y leer recalculado en verde; almacén archivado los oculta.
- [x] **T9 — Handlers y aislamiento**
  - RF: RF-4, RF-8, RF-37
  - Depende de: T5–T8
  - Hecho cuando: test por API de que otro negocio responde 404 y de que no existe ruta de borrado.

## Entrega 3 — Pantallas

- [x] **T10 — Navegación y textos**
  - RF: RF-4
  - Depende de: T9
  - Hecho cuando: menú con Productos, Proveedores y Almacenes; `i18n.test.ts` en verde.
- [x] **T11 — Proveedores en pantalla**
  - RF: RF-27, RF-29, RF-33, RF-34
  - Depende de: T10
  - Hecho cuando: alta, edición, archivo y lista de productos del proveedor funcionan en escritorio.
- [x] **T12 — Almacenes y áreas en pantalla**
  - RF: RF-5, RF-18, RF-19
  - Depende de: T10
  - Hecho cuando: alta de almacén de sucursal y de negocio, y alta de área con responsable.
- [x] **T13 — Lista de productos**
  - RF: RF-39, RF-40, RF-41
  - Depende de: T10
  - Hecho cuando: búsqueda sin acentos, filtros por proveedor, archivados y mínimo en el almacén elegido.
- [x] **T14 — Detalle de producto**
  - RF: RF-11, RF-12, RF-15, RF-16, RF-22, RF-23, RF-26
  - Depende de: T13
  - Hecho cuando: presentaciones, marcas de compra y conteo, y mínimos por almacén editables.

## Entrega 4 — Cierre

- [x] **T15 — E2E del catálogo y volumen**
  - RF: los de pantalla
  - Depende de: T11–T14
  - Hecho cuando: `e2e/catalogo.spec.ts` en verde en escritorio, con 1,000 productos bajo 2 s y búsqueda bajo 300 ms.
- [x] **T16 — Barrido y validación**
  - RF: todos
  - Depende de: T15
  - Hecho cuando: `qa-sweep` incluye las páginas nuevas sin fallas, `validation.md` 41 de 41, lint y tipos limpios, `reglas-de-negocio.md` y `roadmap.md` al día.

## Cobertura

| RF | Tareas |
|---|---|
| RF-1 | T4, T5 |
| RF-2, RF-3 | T4, T7 |
| RF-4 | T9, T10 |
| RF-5 | T7, T12 |
| RF-6 | T3 |
| RF-7 | T3, T7 |
| RF-8 | T9 |
| RF-9 | T6 |
| RF-10 | T1 |
| RF-11, RF-12 | T6, T14 |
| RF-13 | T1 |
| RF-14 | T6 |
| RF-15, RF-16 | T6, T14 |
| RF-17 | T1, T8 |
| RF-18, RF-19 | T7, T12 |
| RF-20, RF-21 | T7 |
| RF-22, RF-23 | T8, T14 |
| RF-24, RF-25 | T2, T8 |
| RF-26 | T1, T8, T14 |
| RF-27 | T5, T11 |
| RF-28 | T6 |
| RF-29 | T11 |
| RF-30 | T5 |
| RF-31, RF-32 | T2 |
| RF-33, RF-34 | T5, T11 |
| RF-35 | T6 |
| RF-36 | T8 |
| RF-37 | T9 |
| RF-38 | T5 |
| RF-39, RF-40, RF-41 | T13 |
