# Tareas — Spec 010

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Dominio y esquema

- [ ] **T1 — Plantilla y días**
  - RF: RF-6, RF-7, RF-10, RF-11, RF-16, RF-18
  - Depende de: —
  - Hecho cuando: `template.test.ts` en verde.
- [ ] **T2 — Reglas de la hoja**
  - RF: RF-19, RF-25, RF-26, RF-27, RF-28, RF-31, RF-33
  - Depende de: —
  - Hecho cuando: `sheet.test.ts` en verde.
- [ ] **T3 — Migración y repositorios**
  - RF: RF-1, RF-15, RF-37
  - Depende de: —
  - Hecho cuando: `0008_checklists` aplica y el test de esquema comprueba tablas, únicos y checks.

## Entrega 2 — Servicios y API

- [ ] **T4 — Plantillas**
  - RF: RF-1, RF-2, RF-5, RF-6, RF-7, RF-8, RF-9, RF-10, RF-11, RF-12, RF-13, RF-14, RF-49
  - Depende de: T1, T3
  - Hecho cuando: tests de integración de alta, guardado completo, duplicados, archivados y permisos en verde.
- [ ] **T5 — Hojas: abrir, palomear, foto, lista y cerrar**
  - RF: RF-3, RF-4, RF-5, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20, RF-21, RF-22, RF-23, RF-24, RF-25, RF-26, RF-27, RF-28, RF-29, RF-30, RF-31, RF-32, RF-33, RF-34, RF-35, RF-36, RF-46, RF-47, RF-48, RF-49
  - Depende de: T2, T4
  - Hecho cuando: tests de integración de la hoja completa, sus rechazos, el historial y las fotos en verde.
- [ ] **T6 — Teléfono de piso**
  - RF: RF-37, RF-38, RF-39, RF-40, RF-41, RF-42, RF-43, RF-44, RF-45, RF-48, RF-49
  - Depende de: T5
  - Hecho cuando: tests de integración y de API del teléfono (solo checklists de hoy de su sucursal, empleado
    obligatorio, deshabilitar al instante, rechazo en cualquier otra ruta) en verde.

## Entrega 3 — Pantallas

- [ ] **T7 — Plantillas en pantalla**
  - RF: RF-6, RF-9, RF-10, RF-11, RF-12, RF-13
  - Depende de: T4
  - Hecho cuando: el dueño arma y edita una plantilla con secciones, puntos clave y de foto.
- [ ] **T8 — Hoy, hoja e historial**
  - RF: RF-16, RF-19, RF-20, RF-22, RF-24, RF-25, RF-27, RF-28, RF-30, RF-32, RF-46, RF-47
  - Depende de: T5
  - Hecho cuando: un administrador llena, da por lista, reabre y cierra con pendientes; el historial lo muestra.
- [ ] **T9 — Teléfono de piso en pantalla y navegación**
  - RF: RF-37, RF-40, RF-43, RF-44, RF-45
  - Depende de: T6, T8
  - Hecho cuando: se habilita el teléfono, el empleado elige su nombre y llena en `/piso`; Checklists en «Más»,
    menú lateral e inicio.

## Entrega 4 — Cierre

- [ ] **T10 — E2E, volumen, barrido y validación**
  - RF: RF-1 a RF-49
  - Depende de: T9
  - Hecho cuando: `e2e/checklists.spec.ts` y `qa-sweep` en verde en escritorio, `validation.md` 49 de 49 y
    `docs/reglas-de-negocio.md` en «Vigente».

## Cobertura

| RF | Tareas |
|---|---|
| RF-1 | T3, T4, T10 |
| RF-2 | T4, T10 |
| RF-3 | T5, T10 |
| RF-4 | T5, T10 |
| RF-5 | T4, T5, T10 |
| RF-6 | T1, T4, T7, T10 |
| RF-7 | T1, T4, T10 |
| RF-8 | T4, T10 |
| RF-9 | T4, T7, T10 |
| RF-10 | T1, T4, T7, T10 |
| RF-11 | T1, T4, T7, T10 |
| RF-12 | T4, T7, T10 |
| RF-13 | T4, T7, T10 |
| RF-14 | T4, T10 |
| RF-15 | T3, T5, T10 |
| RF-16 | T1, T5, T8, T10 |
| RF-17 | T5, T10 |
| RF-18 | T1, T5, T10 |
| RF-19 | T2, T5, T8, T10 |
| RF-20 | T5, T8, T10 |
| RF-21 | T5, T10 |
| RF-22 | T5, T8, T10 |
| RF-23 | T5, T10 |
| RF-24 | T5, T8, T10 |
| RF-25 | T2, T5, T8, T10 |
| RF-26 | T2, T5, T10 |
| RF-27 | T2, T5, T8, T10 |
| RF-28 | T2, T5, T8, T10 |
| RF-29 | T5, T10 |
| RF-30 | T5, T8, T10 |
| RF-31 | T2, T5, T10 |
| RF-32 | T5, T8, T10 |
| RF-33 | T2, T5, T10 |
| RF-34 | T5, T10 |
| RF-35 | T5, T10 |
| RF-36 | T5, T10 |
| RF-37 | T3, T6, T9, T10 |
| RF-38 | T6, T10 |
| RF-39 | T6, T10 |
| RF-40 | T6, T9, T10 |
| RF-41 | T6, T10 |
| RF-42 | T6, T10 |
| RF-43 | T6, T9, T10 |
| RF-44 | T6, T9, T10 |
| RF-45 | T6, T9, T10 |
| RF-46 | T5, T8, T10 |
| RF-47 | T5, T8, T10 |
| RF-48 | T5, T6, T10 |
| RF-49 | T4, T5, T6, T10 |
