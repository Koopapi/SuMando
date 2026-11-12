# Tareas — Spec 004

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Dominio y esquema

- [x] **T1 — Porciones y suma de insumos**
  - RF: RF-16, RF-17, RF-18, RF-21, RF-23, RF-24, RF-25, RF-26
  - Depende de: —
  - Hecho cuando: `portions.test.ts` y `supplies.test.ts` en verde (medias con porcentajes distintos, 0.1 g × 9,999
    exacto, redondeo hacia arriba y múltiplos exactos, compra en unidad base, orden alfabético).
- [x] **T2 — Validación de recetas**
  - RF: RF-7, RF-8, RF-10, RF-11, RF-13, RF-49, RF-50
  - Depende de: —
  - Hecho cuando: `recipe.test.ts` en verde (sin ingredientes, repetidos, cantidades, nombres).
- [x] **T3 — Lector .xlsx**
  - RF: RF-40, RF-48
  - Depende de: —
  - Hecho cuando: `xlsx.test.ts` en verde con un .xlsx armado en el test, uno corrupto, uno de más de 2 MB, uno con
    más de 200 hojas y números como 0.40000000000000002.
- [x] **T4 — Análisis de hojas para importar**
  - RF: RF-40, RF-41, RF-43, RF-44, RF-45, RF-46
  - Depende de: T2
  - Hecho cuando: `import.test.ts` en verde con el formato del recetario de Pirrus (unidades con acentos y espacios,
    ingrediente que falta, unidad distinta, platillo existente, hoja duplicada, pasos de preparación).
- [x] **T5 — Migración y repositorios**
  - RF: RF-1, RF-2, RF-31
  - Depende de: —
  - Hecho cuando: `0003_recetario` aplica sobre `mando_test` y el test de esquema comprueba tablas, índices parciales
    y CHECK.

## Entrega 2 — Servicios y API

- [ ] **T6 — Recetas**
  - RF: RF-1, RF-3, RF-4, RF-6, RF-7, RF-8, RF-9, RF-11, RF-12, RF-13, RF-14, RF-15, RF-19, RF-49, RF-51, RF-52, RF-53
  - Depende de: T2, T5
  - Hecho cuando: tests de integración de alta, edición completa, producto de otro negocio o archivado, duplicado,
    archivo, reactivación y auditoría en verde.
- [ ] **T7 — Cálculo, vista previa e historial**
  - RF: RF-2, RF-5, RF-20, RF-22, RF-27, RF-28, RF-29, RF-30, RF-31, RF-32, RF-33, RF-34
  - Depende de: T1, T6
  - Hecho cuando: tests de integración de vista previa, guardado, historial inmutable, cálculo guardado que no cambia
    tras editar receta y catálogo, usar como base con recetas archivadas, y permisos por sucursal en verde.
- [ ] **T8 — Plantillas**
  - RF: RF-35, RF-36, RF-37, RF-38, RF-39, RF-49, RF-50, RF-52, RF-53
  - Depende de: T7
  - Hecho cuando: tests de integración de guardar, reemplazo con confirmación, renombrar, archivar, reactivar y
    plantilla con receta archivada en verde.
- [ ] **T9 — Importación**
  - RF: RF-42, RF-46, RF-47, RF-48, RF-53
  - Depende de: T3, T4, T6
  - Hecho cuando: test de integración que importa un .xlsx con platillos listos y con problemas, guarda solo los
    listos al confirmar, con 50 % de media y auditoría.
- [ ] **T10 — API y aislamiento**
  - RF: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6
  - Depende de: T6, T7, T8, T9
  - Hecho cuando: tests de handlers de cada ruta (contrato y errores) y de aislamiento entre negocios y sucursales en
    verde.

## Entrega 3 — Pantallas

- [ ] **T11 — Recetas: tabla y editor**
  - RF: RF-7, RF-8, RF-9, RF-12, RF-14, RF-15, RF-18, RF-54
  - Depende de: T10
  - Hecho cuando: `/recetas` lista con búsqueda y filtros, `/recetas/nueva` y `/recetas/[id]` editan con `RowEntry`
    y porcentaje de media, a 360 px y en escritorio.
- [ ] **T12 — Importar**
  - RF: RF-42, RF-47, RF-48
  - Depende de: T11
  - Hecho cuando: `/recetas/importar` sube el archivo, muestra la revisión por platillo y confirma.
- [ ] **T13 — Cálculo con lista viva**
  - RF: RF-20, RF-21, RF-22, RF-24, RF-25, RF-27, RF-28
  - Depende de: T10
  - Hecho cuando: `/insumos` captura completas y medias con teclado numérico, la lista se actualiza sola y se guarda.
- [ ] **T14 — Historial, plantillas y navegación**
  - RF: RF-30, RF-32, RF-33, RF-34, RF-35, RF-36, RF-37, RF-38, RF-39, RF-55
  - Depende de: T13
  - Hecho cuando: historial y su detalle, usar como base con aviso, plantillas con confirmación de reemplazo,
    recetas en el detalle del producto, y Recetas e Insumos en el menú lateral, en «Más» y en el inicio.

## Entrega 4 — Cierre

- [ ] **T15 — E2E, volumen y barrido**
  - RF: RF-7, RF-8, RF-15, RF-20, RF-22, RF-24, RF-25, RF-29, RF-30, RF-33, RF-35, RF-36, RF-37, RF-42, RF-47, RF-54
  - Depende de: T11, T12, T13, T14
  - Hecho cuando: `e2e/recetario.spec.ts` en verde con el volumen de 100 recetas, y las páginas nuevas en el barrido
    con axe en claro y oscuro, en escritorio.
- [ ] **T16 — Validación y documentos**
  - RF: todos
  - Depende de: T15
  - Hecho cuando: `validation.md` con 55 de 55 RF; `docs/reglas-de-negocio.md` en «Vigente»; roadmap y
    arquitectura al día; Vitest y E2E de escritorio en verde.

## Cobertura

| RF | Tareas |
|---|---|
| RF-1 | T5, T6, T10 |
| RF-2 | T5, T7, T10 |
| RF-3, RF-4, RF-6 | T6, T10 |
| RF-5 | T7, T10 |
| RF-7, RF-8 | T2, T6, T11, T15 |
| RF-9 | T6, T11 |
| RF-10 | T2 |
| RF-11 | T2, T6 |
| RF-12 | T6, T11 |
| RF-13 | T2, T6 |
| RF-14 | T6, T11 |
| RF-15 | T6, T11, T15 |
| RF-16, RF-17 | T1 |
| RF-18 | T1, T11 |
| RF-19 | T6 |
| RF-20 | T7, T13, T15 |
| RF-21 | T1, T13 |
| RF-22 | T7, T13, T15 |
| RF-23, RF-26 | T1 |
| RF-24, RF-25 | T1, T13, T15 |
| RF-27, RF-28 | T7, T13 |
| RF-29 | T7, T15 |
| RF-30 | T7, T14, T15 |
| RF-31 | T5, T7 |
| RF-32 | T7, T14 |
| RF-33 | T7, T14, T15 |
| RF-34 | T7, T14 |
| RF-35, RF-36, RF-37 | T8, T14, T15 |
| RF-38, RF-39 | T8, T14 |
| RF-40 | T3, T4 |
| RF-41, RF-43, RF-44, RF-45 | T4 |
| RF-46 | T4, T9 |
| RF-42 | T9, T12, T15 |
| RF-47 | T9, T12, T15 |
| RF-48 | T3, T9, T12 |
| RF-49 | T2, T6, T8 |
| RF-50 | T2, T8 |
| RF-51 | T6 |
| RF-52, RF-53 | T6, T8 |
| RF-54 | T11, T15 |
| RF-55 | T14 |
