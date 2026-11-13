# Tareas — Spec 006

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Dominio y lector

- [ ] **T1 — Unidades y números exactos**
  - RF: RF-10, RF-11, RF-12, RF-13, RF-14, RF-21, RF-34
  - Depende de: —
  - Hecho cuando: `sheet-units.test.ts` en verde (variantes de unidad, kilogramo y litro × 1,000, 7.6879999999999997, redondeo a la mitad hacia arriba).
- [ ] **T2 — Análisis de hojas**
  - RF: RF-6, RF-7, RF-9, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20, RF-21, RF-22, RF-26, RF-29, RF-30
  - Depende de: T1
  - Hecho cuando: `sheet-import.test.ts` en verde con el formato real (filas de grupo, hoja sin encabezado, repetidos, existente con otra unidad, área en otro almacén, avisos).
- [ ] **T3 — Lector: límite por llamada y número de fila**
  - RF: RF-5, RF-8, RF-22
  - Depende de: —
  - Hecho cuando: `xlsx.test.ts` en verde con un libro con imágenes grandes que pasa, uno inflado que se rechaza y el número de fila de Excel.

## Entrega 2 — Servicio y API

- [ ] **T4 — Revisión y confirmación**
  - RF: RF-1, RF-2, RF-3, RF-4, RF-16, RF-17, RF-23, RF-24, RF-25, RF-26, RF-27, RF-28, RF-29, RF-30, RF-31, RF-32, RF-33, RF-34, RF-35, RF-36
  - Depende de: T2, T3
  - Hecho cuando: tests de integración de revisión sin guardar, importación completa con conteo, reimportar, existente que se completa, permisos, aislamiento y auditoría en verde.
- [ ] **T5 — API**
  - RF: RF-5, RF-8, RF-16, RF-23
  - Depende de: T4
  - Hecho cuando: test del handler con formulario, archivo grande, inválido y vacío en verde.

## Entrega 3 — Pantalla y cierre

- [ ] **T6 — Pantalla de importación y enlaces**
  - RF: RF-3, RF-16, RF-17, RF-22, RF-36, RF-37
  - Depende de: T5
  - Hecho cuando: `/inventario/importar` elige almacén, revisa con filtros y confirma, a 360 px y en escritorio; enlaces en Productos y Conteo.
- [ ] **T7 — E2E, volumen y barrido**
  - RF: RF-3, RF-16, RF-17, RF-32, RF-36, RF-37
  - Depende de: T6
  - Hecho cuando: `e2e/importar-inventario.spec.ts` en verde con 300 productos y la página en el barrido con axe.
- [ ] **T8 — Validación y documentos**
  - RF: todos
  - Depende de: T7
  - Hecho cuando: `validation.md` 37 de 37; reglas en «Vigente»; roadmap y arquitectura al día; Vitest y E2E de escritorio en verde.

## Cobertura

| RF | Tareas |
|---|---|
| RF-1 | T4, T8 |
| RF-2 | T4, T8 |
| RF-3 | T4, T6, T7, T8 |
| RF-4 | T4, T8 |
| RF-5 | T3, T5, T8 |
| RF-6 | T2, T8 |
| RF-7 | T2, T8 |
| RF-8 | T3, T5, T8 |
| RF-9 | T2, T8 |
| RF-10 | T1, T8 |
| RF-11 | T1, T8 |
| RF-12 | T1, T8 |
| RF-13 | T1, T8 |
| RF-14 | T1, T8 |
| RF-15 | T2, T8 |
| RF-16 | T2, T4, T5, T6, T7, T8 |
| RF-17 | T2, T4, T6, T7, T8 |
| RF-18 | T2, T8 |
| RF-19 | T2, T8 |
| RF-20 | T2, T8 |
| RF-21 | T1, T2, T8 |
| RF-22 | T2, T3, T6, T8 |
| RF-23 | T4, T5, T8 |
| RF-24 | T4, T8 |
| RF-25 | T4, T8 |
| RF-26 | T2, T4, T8 |
| RF-27 | T4, T8 |
| RF-28 | T4, T8 |
| RF-29 | T2, T4, T8 |
| RF-30 | T2, T4, T8 |
| RF-31 | T4, T8 |
| RF-32 | T4, T7, T8 |
| RF-33 | T4, T8 |
| RF-34 | T1, T4, T8 |
| RF-35 | T4, T8 |
| RF-36 | T4, T6, T7, T8 |
| RF-37 | T6, T7, T8 |
