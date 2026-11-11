# Roadmap de specs — Mando

**Aprobado por el dueño el 11 de noviembre de 2026.** El orden sigue las dependencias: no se abre una spec hasta
cerrar la anterior (spec aprobada → plan → tareas → código con tests → validación RF por RF).

La 001 es un **esqueleto andante**: el flujo mínimo de punta a punta, desplegado en el VPS, con la CI y las
E2E funcionando desde el primer día. Así cada spec siguiente solo agrega funciones sobre una base probada.

A Mando solo entran administrativos (dueño y administradores) con correo y contraseña. Los empleados de piso no
tienen cuenta ni PIN: existen como expediente y renglón de nómina, y su asistencia la captura el administrador.
Los módulos de personal, nómina, conteo por área y checklists parten de lo que ya opera en la rama `pirrus` de
Comanda: misma lógica, construida de nuevo e independiente.

| Spec | Funcionalidad | Cubre |
|---|---|---|
| 001 | Esqueleto, cuentas y negocios | PWA instalable, inicio de sesión, alta de negocios, invitar personas, roles por negocio, cambio de negocio activo, CI, E2E y despliegue en pruebas |
| 002 | Sistema de diseño | Componentes reutilizables (acción, formulario, tablas, avisos, modales, estructura), catálogo de componentes, maquetas en Pencil |
| 003 | Catálogo | Productos con presentación individual, unidad, factor de conversión y presentación final; áreas con responsable; almacenes por negocio; proveedores; mínimos |
| 004 | Inventarios | Entradas, salidas, ajustes con motivo, traspasos entre almacenes y entre negocios, conteo físico por área, existencias y mínimos |
| 005 | Requisiciones | Solicitud → aprobación → compra → recepción que entra al inventario; historial y estados |
| 006 | Personal | Expediente de empleados por negocio, los 13 documentos del expediente, puestos, altas y bajas con motivo |
| 007 | Nómina | Semana de nómina: días y medias jornadas por pago diario capturados por el administrador, retardos con descuento, extras, bonos, comida, préstamos con abono semanal, hoja de pago con billetes, cerrar y reabrir, historial |
| 008 | Checklists | Plantillas de apertura y cierre por sección con responsable, puntos clave, hoja del día, cierre y reapertura, historial |
| 009 | Tablero y reportes | Vista por negocio y consolidada, alertas (existencias bajas, requisiciones pendientes, nómina por cerrar), exportar |
| 010 | Operación | Respaldos cifrados y restauración, monitoreo de errores, aviso de despliegue, lista de lanzamiento |

Las reglas configurables por negocio (tolerancia de retardo, valor de la media jornada, día de inicio de la
semana, quién puede qué) van dentro de la spec que las usa, no en una spec aparte.

## Decisiones tomadas (11 de noviembre de 2026)

- **Acceso**: solo administrativos, con correo y contraseña. Sin PIN ni checador; se descartó la spec de asistencia.
- **Roles**: dueño (entra a todos los negocios, crea negocios, invita y asigna roles, ve todo) y administrador
  (solo en los negocios donde se le asignó; opera inventario, requisiciones, personal, nómina y checklists).
  El detalle de qué puede cada rol en cada módulo se fija en la spec de ese módulo.

## Dudas que deciden el alcance (se resuelven en la entrevista de cada spec)

- **Nómina**: se parte del modelo semanal de Pirrus (pago por día, sin ISR, IMSS ni CFDI). Confirmar en la
  entrevista de la 007 si hace falta exportar algo al contador.
- **Sin conexión**: ¿hay que capturar inventario o requisiciones sin internet (bodegas sin señal) y sincronizar después?
- **Entre negocios**: ¿los negocios comparten productos y proveedores, o cada uno tiene su propio catálogo?
