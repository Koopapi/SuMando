# Tareas — Spec 013

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Base

- [x] **T1 — Migración y repositorios de compradores**
  - RF: RF-1, RF-5, RF-7
  - Depende de: —
  - Hecho cuando: `0011_compradores` aplica sobre una base con requisiciones y conserva su comprador escrito; el test de esquema comprueba `supplier_buyers` y `requisition_groups.buyer_employee_id`.
- [x] **T2 — Teléfono y mensaje de WhatsApp**
  - RF: RF-12, RF-13, RF-14, RF-16
  - Depende de: —
  - Hecho cuando: `whatsapp.test.ts` en verde (10 dígitos, +52, con espacios, corto; mensaje con proveedores por comprar, cantidades y nota).
- [x] **T3 — Agrupar por comprador**
  - RF: RF-8, RF-9
  - Depende de: —
  - Hecho cuando: `buyers.test.ts` en verde (orden, «Sin comprador» al final, cuentas por estado).
- [x] **T4 — Máximo en el importador**
  - RF: RF-25, RF-26, RF-27, RF-28
  - Depende de: —
  - Hecho cuando: tests de `sheet-import` (máximo, inválido, menor que el mínimo) y de integración del importador (se guarda si falta, no pisa) en verde.

## Entrega 2 — Servicios y API

- [ ] **T5 — Comprador habitual**
  - RF: RF-1, RF-2, RF-3
  - Depende de: T1
  - Hecho cuando: tests de integración de asignar, quitar, persona de otra sucursal o dada de baja, permisos y aislamiento en verde, por servicio y API.
- [ ] **T6 — Comprador en la requisición**
  - RF: RF-4, RF-5, RF-6, RF-7, RF-10
  - Depende de: T5
  - Hecho cuando: tests de comprador al aprobar y en alta del dueño, cambio y quitar, baja, texto anterior y habitual mostrado en solicitada en verde.
- [ ] **T7 — Vista por comprador y mensaje**
  - RF: RF-8, RF-9, RF-11, RF-12, RF-13, RF-14, RF-15
  - Depende de: T2, T3, T6
  - Hecho cuando: test de integración con dos compradores y un proveedor comprado comprueba grupos, cuentas, enlace y texto.
- [ ] **T8 — Datos de compra**
  - RF: RF-17, RF-18, RF-19, RF-20, RF-21, RF-22, RF-23, RF-24
  - Depende de: —
  - Hecho cuando: tests de integración de filas, guardado con errores por fila, presentación nueva, permisos, auditoría y 300 cambios en menos de 2 s en verde.
- [ ] **T9 — Armado: sugerencias y niveles**
  - RF: RF-30, RF-32
  - Depende de: —
  - Hecho cuando: tests de `withoutMax` y de existencias por presentación en `builderData` en verde.

## Entrega 3 — Pantallas

- [ ] **T10 — `ComboField`**
  - RF: RF-29
  - Depende de: —
  - Hecho cuando: test del filtro en verde y el componente aparece en `/sistema`.
- [ ] **T11 — Comprador habitual en Proveedores**
  - RF: RF-1, RF-3
  - Depende de: T5
  - Hecho cuando: en `/proveedores` se elige y se quita el comprador, a 360 px y en escritorio.
- [ ] **T12 — Detalle por comprador con WhatsApp**
  - RF: RF-5, RF-6, RF-7, RF-8, RF-9, RF-10, RF-11, RF-12, RF-14, RF-15
  - Depende de: T7
  - Hecho cuando: el detalle muestra compradores con sus proveedores, selector de persona, «Enviar por WhatsApp» y «Copiar mensaje».
- [ ] **T13 — Armado con buscador y existencias**
  - RF: RF-29, RF-30, RF-31, RF-32
  - Depende de: T9, T10
  - Hecho cuando: `/requisiciones/nueva` busca productos, muestra existencia, mínimo y máximo, agrupa por proveedor y avisa los que entraron sin máximo.
- [ ] **T14 — Pantalla Datos de compra**
  - RF: RF-17, RF-18, RF-19, RF-20, RF-21, RF-22, RF-33
  - Depende de: T8, T10
  - Hecho cuando: `/inventario/datos-de-compra` edita y guarda varias filas, muestra errores por fila, crea una presentación y filtra; enlazada desde Inventario.

## Entrega 4 — Cierre

- [ ] **T15 — E2E y barrido**
  - RF: RF-1, RF-4, RF-8, RF-11, RF-13, RF-18, RF-29, RF-30, RF-33
  - Depende de: T11, T12, T13, T14
  - Hecho cuando: `e2e/requisiciones-dia-a-dia.spec.ts` y `qa-sweep` en verde en escritorio.
- [ ] **T16 — Validación y documentos**
  - RF: todos
  - Depende de: T15
  - Hecho cuando: `validation.md` 33 de 33; `docs/reglas-de-negocio.md` vigente; `pnpm test`, `typecheck` y `lint` en verde.

## Cobertura

| RF | Tareas |
|---|---|
| RF-1 | T1, T5, T11, T15 |
| RF-2 | T5 |
| RF-3 | T5, T11 |
| RF-4 | T6, T15 |
| RF-5 | T1, T6, T12 |
| RF-6 | T6, T12 |
| RF-7 | T1, T6, T12 |
| RF-8 | T3, T7, T12, T15 |
| RF-9 | T3, T7, T12 |
| RF-10 | T6, T12 |
| RF-11 | T7, T12, T15 |
| RF-12 | T2, T7, T12 |
| RF-13 | T2, T7, T15 |
| RF-14 | T2, T7, T12 |
| RF-15 | T7, T12 |
| RF-16 | T2 |
| RF-17 | T8, T14 |
| RF-18 | T8, T14, T15 |
| RF-19 | T8, T14 |
| RF-20 | T8, T14 |
| RF-21 | T8, T14 |
| RF-22 | T8, T14 |
| RF-23 | T8 |
| RF-24 | T8 |
| RF-25 | T4 |
| RF-26 | T4 |
| RF-27 | T4 |
| RF-28 | T4 |
| RF-29 | T10, T13, T15 |
| RF-30 | T9, T13, T15 |
| RF-31 | T13 |
| RF-32 | T9, T13 |
| RF-33 | T14, T15 |
