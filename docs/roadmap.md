# Roadmap de specs — Mando

**Aprobado por el dueño el 11 de noviembre de 2026** y ampliado ese mismo día con dos specs que pidió el cliente
(recetario y corte de caja). El orden sigue las dependencias: no se abre una spec hasta cerrar la anterior
(spec aprobada → plan → tareas → código con tests → validación RF por RF).

La 001 es un **esqueleto andante**: el flujo mínimo de punta a punta, desplegado en el VPS, con la CI y las
E2E funcionando desde el primer día. Así cada spec siguiente solo agrega funciones sobre una base probada.

A Mando solo entran administrativos (dueño y administradores) con correo y contraseña. Los empleados de piso no
tienen cuenta ni PIN: existen como expediente y renglón de nómina, y su asistencia la captura el administrador.
Los módulos de personal, nómina, conteo por área, checklists y corte de caja parten de lo que ya opera en la rama
`pirrus` de Comanda: misma lógica, construida de nuevo e independiente. Mando no es punto de venta: las piezas
vendidas y los totales de caja los captura el administrador a partir del punto de venta de cada negocio.

| Spec | Funcionalidad | Cubre |
|---|---|---|
| 001 | Esqueleto, cuentas y negocios | PWA instalable, inicio de sesión, alta de negocios, invitar personas, roles por negocio, cambio de negocio activo, CI, E2E y despliegue. **Hecha** |
| 002 | Sistema de diseño | La app pasa a llamarse SuMando con logo propio; modo claro y oscuro; color por negocio; teléfono para capturar y escritorio con menú lateral y tablas completas; componentes (acción, formulario, tablas, captura por renglones, asistente por pasos, avisos, modales, estructura), catálogo de componentes, maquetas en Pencil de las pantallas actuales y de tres pantallas tipo. **Hecha** |
| 003 | Catálogo | Productos con presentación individual, unidad, factor de conversión y presentación final; áreas con responsable; almacenes por negocio; proveedores; mínimos. **Hecha** |
| 004 | Recetario e insumos | Plantilla de receta por platillo (ingredientes del catálogo, cantidad bruta y unidad, medias porciones); el administrador captura las piezas de cada platillo y obtiene la lista de insumos a pedir sumada por ingrediente; cálculos guardados para repetirlos. **Hecha** |
| 005 | Inventarios | Entradas, salidas, ajustes con motivo, traspasos entre almacenes y entre negocios, conteo físico por área, existencias y mínimos **Hecha** |
| 006 | Importar inventario por áreas | Subir la hoja «Inventario por áreas» de cada negocio: productos, presentaciones, proveedores, áreas con su lista, mínimos y existencia inicial como conteo, con revisión antes de guardar **Hecha** |
| 007 | Requisiciones | Solicitud → aprobación → compra → recepción que entra al inventario; historial y estados; crear una requisición desde un cálculo del recetario |
| 008 | Personal | Expediente de empleados por negocio, los 13 documentos del expediente, puestos, altas y bajas con motivo |
| 009 | Nómina | Semana de nómina: días y medias jornadas por pago diario capturados por el administrador, retardos con descuento, extras, bonos, comida, préstamos con abono semanal, hoja de pago con billetes, cerrar y reabrir, historial |
| 010 | Checklists | Plantillas de apertura y cierre por sección con responsable, puntos clave, hoja del día, cierre y reapertura, historial |
| 011 | Corte de caja | El corte asistido de Pirrus adaptado a Mando: apertura con fondo inicial, lo que reporta el punto de venta en efectivo y tarjeta, conteo de efectivo por denominación, tarjetas por terminal, transferencias y otros, movimientos de caja (gastos, retiros, ingresos), diferencias con tolerancia, motivo cuando no cuadra, firma e historial por sucursal |
| 012 | Tablero y reportes | Vista por negocio y consolidada, alertas (existencias bajas, requisiciones pendientes, nómina por cerrar, cortes con diferencia), exportar |
| 013 | Operación | Respaldos cifrados y restauración, monitoreo de errores, aviso de despliegue, lista de lanzamiento |

El 13 de noviembre de 2026 entró la importación como spec 006 y las siguientes se recorrieron un número: en las
specs ya cerradas, «spec 006» a «spec 012» se refieren a las que hoy son 007 a 013.

Las reglas configurables por negocio (tolerancia de retardo, valor de la media jornada, día de inicio de la
semana, tolerancia del corte, quién puede qué) van dentro de la spec que las usa, no en una spec aparte.

## Decisiones tomadas (11 de noviembre de 2026)

- **Acceso**: solo administrativos, con correo y contraseña. Sin PIN ni checador; se descartó la spec de asistencia.
- **Roles**: dueño (entra a todos los negocios, crea negocios, invita y asigna roles, ve todo) y administrador
  (solo en los negocios donde se le asignó; opera inventario, requisiciones, personal, nómina y checklists).
  El detalle de qué puede cada rol en cada módulo se fija en la spec de ese módulo.
- **Nombre visible**: la app se llama **SuMando** (dominio `sumando.com.mx`), con la M mayúscula por el juego «su
  mando / sumando». El nombre interno del proyecto y del código sigue siendo Mando (spec 002).
- **Lista del cliente**: de sus seis puntos, el inventario de entradas y salidas, los checks de apertura y cierre y
  el cálculo de nómina ya estaban en el roadmap; el recetario y el corte de caja se agregaron como specs 004 y 010.
- **Recetario**: es una plantilla por platillo con sus ingredientes. Se capturan las piezas y se multiplica por
  ingrediente; el resultado es solo cuánto pedir. No se importan ventas del punto de venta ni se compara con el
  inventario. Referencias en `Referencias/`: el recetario de Pirrus (una hoja por platillo con cantidad bruta y
  unidad) y el reporte «productos vendidos» del punto de venta, útil por los nombres y las medias porciones.
- **Corte de caja**: se toma el corte asistido que Pirrus ya usa en Comanda (rama `pirrus`:
  `frontend/src/views/wizards/CorteCajaWizard.vue`, `backend/app/models/corte_avanzado.py` y el manual
  `documentacion/manual-usuario/piso/07-corte-de-caja.md`). Como Mando no cobra, lo que ahí «registró el sistema»
  aquí lo captura el administrador desde el punto de venta.
- **Checklists**: las plantillas de apertura y cierre son las que ya operan en Pirrus dentro de Comanda.

## Dudas que deciden el alcance (se resuelven en la entrevista de cada spec)

- **Nómina**: se parte del modelo semanal de Pirrus (pago por día, sin ISR, IMSS ni CFDI). Confirmar en la
  entrevista de la 008 si hace falta exportar algo al contador.
- **Sin conexión**: ¿hay que capturar inventario o requisiciones sin internet (bodegas sin señal) y sincronizar después?
- **Entre negocios**: resuelto en la spec 003: cada negocio tiene su propio catálogo de productos y proveedores.
- **Recetario**: resuelto en la spec 004: recetas por negocio (cualquiera puede tener las suyas), cantidad bruta
  sin merma aparte, media porción por platillo e importación desde Excel.
- **Corte de caja**: ¿un corte por día o por turno? ¿Qué terminales bancarias tiene cada sucursal?
