# Tareas — Spec 015

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Base y Nueva requisición

- [ ] **T1 — Reglas de dato raro**
  - RF: RF-12, RF-13, RF-15, RF-16
  - Depende de: —
  - Hecho cuando: `domain/wizards/unusual.test.ts` en verde (cada regla, sus bordes, sin referencia y corte ciego).
- [ ] **T2 — Tipos, vigencia y qué sigue**
  - RF: RF-9, RF-17, RF-22, RF-51
  - Depende de: —
  - Hecho cuando: `drafts.test.ts` y `next.test.ts` en verde (7 días, tamaño, tipos de piso, siguiente tarea).
- [ ] **T3 — Migración y servicio de borradores**
  - RF: RF-17, RF-19, RF-20, RF-22, RF-51
  - Depende de: T2
  - Hecho cuando: `0013_asistentes` aplica conservando los datos y la integración de guardar, leer en otra sesión, descartar, vencer y aislar por persona, sucursal, negocio y empleado de piso está en verde.
- [ ] **T4 — Preferencia de vista y ejemplos**
  - RF: RF-3, RF-23, RF-26
  - Depende de: T3
  - Hecho cuando: integración de la preferencia por persona y tarea y de los ejemplos con datos del negocio (y genéricos sin datos) en verde.
- [ ] **T5 — Rutas de la API**
  - RF: RF-17, RF-18, RF-20, RF-22, RF-26
  - Depende de: T3, T4
  - Hecho cuando: tests de las rutas de borrador y vista (persona, teléfono de piso, `wizard_unknown`, `draft_too_large`) en verde.
- [ ] **T6 — Asistente ampliado**
  - RF: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-24
  - Depende de: —
  - Hecho cuando: `/sistema/asistente` muestra paso controlado, indicación, ejemplo, resumen con «Cambiar», «Vista completa» y el anuncio del paso; E2E de pantallas tipo en verde.
- [ ] **T7 — Aviso de dato raro y retomar**
  - RF: RF-12, RF-14, RF-18, RF-20
  - Depende de: T6
  - Hecho cuando: `UnusualNotice` y `ResumePrompt` están en `/sistema/asistente` y el barrido no marca nada.
- [ ] **T8 — Borrador en la pantalla y cambio de vista**
  - RF: RF-6, RF-8, RF-10, RF-17, RF-18, RF-19, RF-20, RF-21, RF-24, RF-25, RF-26, RF-27
  - Depende de: T5, T7
  - Hecho cuando: `use-wizard-draft` y `view-switch` guardan al cambiar de paso, retoman, descartan, llevan un error a su paso y conservan lo capturado al cambiar de vista (probado en la entrega con Nueva requisición).
- [ ] **T9 — Asistente «Nueva requisición»**
  - RF: RF-9, RF-23, RF-28, RF-29
  - Depende de: T1, T8
  - Hecho cuando: la página abre el asistente con Almacén, De dónde agregar, Productos y cantidades (por proveedor, con existencia, mínimo y máximo), Nota y Resumen, y la vista completa sigue funcionando.
- [ ] **T10 — E2E de la entrega 1**
  - RF: RF-1, RF-5, RF-7, RF-8, RF-12, RF-14, RF-18, RF-19, RF-24, RF-26, RF-27, RF-28
  - Depende de: T9
  - Hecho cuando: `e2e/asistentes-requisiciones.spec.ts` (nueva) y los E2E de requisiciones existentes en verde, con medidas a 390 × 844.

## Entrega 2 — Resto de requisiciones

- [ ] **T11 — Asistente «Aprobar requisición»**
  - RF: RF-21, RF-30
  - Depende de: T10
  - Hecho cuando: revisar por proveedor, decidir (con motivo al rechazar) y resumen; si otra persona ya decidió, el paso lo marca.
- [ ] **T12 — Asistente «Comprar»**
  - RF: RF-31
  - Depende de: T10
  - Hecho cuando: el comprador recorre un paso por proveedor de su lista con lo comprado y lo pagado, y confirma.
- [ ] **T13 — Asistente «Recibir»**
  - RF: RF-32
  - Depende de: T10
  - Hecho cuando: proveedor, cantidades (propone lo pendiente) y resumen; la entrada queda en el inventario.
- [ ] **T14 — E2E de la entrega 2**
  - RF: RF-10, RF-21, RF-30, RF-31, RF-32
  - Depende de: T11, T12, T13
  - Hecho cuando: el E2E de requisiciones cubre aprobar, comprar, recibir, un error del servidor que vuelve al paso y una decisión tomada por otra persona.

## Entrega 3 — Inventario

- [ ] **T15 — Asistente «Contar un área»**
  - RF: RF-13, RF-33
  - Depende de: T10
  - Hecho cuando: almacén y área, conteo producto por producto con aviso al pasar del 30 % y resumen con diferencias.
- [ ] **T16 — Asistentes «Entrada» y «Salida»**
  - RF: RF-13, RF-34, RF-35
  - Depende de: T10
  - Hecho cuando: los dos asistentes registran su movimiento, con aviso de entrada > 3 × máximo y salida > mitad de la existencia.
- [ ] **T17 — Asistentes «Traspaso» y «Recibir traspaso»**
  - RF: RF-36, RF-37
  - Depende de: T10
  - Hecho cuando: origen, destino, productos y resumen; recibir propone lo enviado.
- [ ] **T18 — E2E de inventario**
  - RF: RF-13, RF-33, RF-34, RF-35, RF-36, RF-37
  - Depende de: T15, T16, T17
  - Hecho cuando: `e2e/asistentes-inventario.spec.ts` y los E2E de inventario existentes en verde.

## Entrega 4 — Nómina y caja

- [ ] **T19 — Asistente «Asistencia de la semana»**
  - RF: RF-11, RF-38
  - Depende de: T10
  - Hecho cuando: un paso por día y resumen; el administrador no ve montos.
- [ ] **T20 — Asistente «Cerrar la semana»**
  - RF: RF-13, RF-39
  - Depende de: T10
  - Hecho cuando: extras, bonos y comida (aviso si pasa del sueldo de la semana), préstamos, revisión por persona y resumen con billetes; solo el dueño.
- [ ] **T21 — Asistentes «Abrir caja», «Corte» y «Reporte del punto de venta»**
  - RF: RF-40, RF-41, RF-42
  - Depende de: T10
  - Hecho cuando: los tres asistentes funcionan sobre el corte de la sucursal y el conteo existente pasa al asistente ampliado.
- [ ] **T22 — E2E de nómina y caja**
  - RF: RF-11, RF-38, RF-39, RF-40, RF-41, RF-42
  - Depende de: T19, T20, T21
  - Hecho cuando: `e2e/asistentes-nomina-caja.spec.ts` y los E2E de nómina y caja existentes en verde.

## Entrega 5 — Altas

- [ ] **T23 — Parecidos de nombre**
  - RF: RF-44
  - Depende de: —
  - Hecho cuando: test unitario de nombres iguales sin acentos, mayúsculas ni espacios en verde.
- [ ] **T24 — Asistentes «Nuevo producto» y «Nuevo proveedor»**
  - RF: RF-43, RF-44, RF-45
  - Depende de: T10, T23
  - Hecho cuando: producto con presentaciones, proveedor y niveles por almacén; proveedor con comprador por sucursal.
- [ ] **T25 — Asistentes «Nuevo empleado» y «Nueva plantilla de checklist»**
  - RF: RF-11, RF-46, RF-47
  - Depende de: T10
  - Hecho cuando: el sueldo solo aparece al dueño; la plantilla se arma por secciones y puntos.
- [ ] **T26 — E2E de altas**
  - RF: RF-43, RF-44, RF-45, RF-46, RF-47
  - Depende de: T24, T25
  - Hecho cuando: `e2e/asistentes-altas.spec.ts` y los E2E de catálogo, personal y checklists existentes en verde.

## Entrega 6 — Teléfono de piso

- [ ] **T27 — Asistente «Checklist» de piso**
  - RF: RF-22, RF-48, RF-49
  - Depende de: T10
  - Hecho cuando: elige nombre, un paso por sección, puntos clave uno por uno con foto y resumen; se retoma por empleado en ese teléfono.
- [ ] **T28 — Asistente «Corte ciego»**
  - RF: RF-16, RF-50
  - Depende de: T10
  - Hecho cuando: efectivo, terminales y resumen sin nada de lo esperado (lo comprueba la integración del corte ciego).
- [ ] **T29 — E2E de piso**
  - RF: RF-16, RF-22, RF-48, RF-49, RF-50
  - Depende de: T27, T28
  - Hecho cuando: `e2e/asistentes-piso.spec.ts` y los E2E de checklists y caja de piso en verde.

## Entrega 7 — Cierre

- [ ] **T30 — Medidas, barrido y accesibilidad**
  - RF: RF-1, RF-4
  - Depende de: T29
  - Hecho cuando: todos los asistentes a 390 × 844 con los botones a la vista y sin ensanchar; `qa-sweep` en claro y oscuro en verde.
- [ ] **T31 — Validación y documentos**
  - RF: todos
  - Depende de: T30
  - Hecho cuando: `validation.md` 51 de 51; `pnpm test`, `typecheck` y `lint` en verde; reglas de negocio en «Vigente», arquitectura y AGENTS al día.

## Cobertura

| RF | Tareas |
|---|---|
| RF-1 | T6, T10, T30 |
| RF-2 | T6 |
| RF-3 | T4, T6 |
| RF-4 | T6, T30 |
| RF-5 | T6, T10 |
| RF-6 | T6, T8 |
| RF-7 | T6, T10 |
| RF-8 | T8, T10 |
| RF-9 | T2, T9 |
| RF-10 | T8, T14 |
| RF-11 | T19, T22, T25 |
| RF-12 | T1, T7, T10 |
| RF-13 | T1, T15, T16, T18, T20 |
| RF-14 | T7, T10 |
| RF-15 | T1 |
| RF-16 | T1, T28, T29 |
| RF-17 | T2, T3, T5, T8 |
| RF-18 | T5, T7, T8, T10 |
| RF-19 | T3, T8, T10 |
| RF-20 | T3, T5, T7, T8 |
| RF-21 | T8, T11, T14 |
| RF-22 | T2, T3, T5, T27, T29 |
| RF-23 | T4, T9 |
| RF-24 | T6, T8, T10 |
| RF-25 | T8 |
| RF-26 | T4, T5, T8, T10 |
| RF-27 | T8, T10 |
| RF-28 | T9, T10 |
| RF-29 | T9 |
| RF-30 | T11, T14 |
| RF-31 | T12, T14 |
| RF-32 | T13, T14 |
| RF-33 | T15, T18 |
| RF-34 | T16, T18 |
| RF-35 | T16, T18 |
| RF-36 | T17, T18 |
| RF-37 | T17, T18 |
| RF-38 | T19, T22 |
| RF-39 | T20, T22 |
| RF-40 | T21, T22 |
| RF-41 | T21, T22 |
| RF-42 | T21, T22 |
| RF-43 | T24, T26 |
| RF-44 | T23, T24, T26 |
| RF-45 | T24, T26 |
| RF-46 | T25, T26 |
| RF-47 | T25, T26 |
| RF-48 | T27, T29 |
| RF-49 | T27, T29 |
| RF-50 | T28, T29 |
| RF-51 | T2, T3 |
