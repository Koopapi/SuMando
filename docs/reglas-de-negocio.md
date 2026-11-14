# Reglas de negocio — Mando

Resumen de todas las reglas acordadas, en un solo sitio. **La fuente de verdad son las specs**: cada regla cita la
suya. Si una regla cambia, se cambia primero la spec y después este documento.

Estado de cada regla: **Vigente** (construida y con tests) o **Aprobada** (en una spec aprobada, pendiente de
construir).

Última actualización: 13 de noviembre de 2026. Specs 001 (42 RF), 002 (48 RF), 003 (41 RF), 004 (55 RF), 005 (67 RF), 006 (37 RF), 007 (48 RF), 008 (42 RF), 009 (48 RF), 010 (49 RF) y 011 (42 RF) vigentes, con test en verde.

---

## 1. Principios que no se negocian

Vienen de la constitución (`docs/constitution.md`) y mandan sobre cualquier otra regla.

## 2. Cuentas, negocios y permisos

Origen: spec 001 (aprobada el 11 de noviembre de 2026; construida y validada el mismo día). Estado: **Vigente**.

- Solo entran administrativos, con correo y contraseña. Los empleados de piso no tienen cuenta ni PIN (spec 001).
- Dos roles: **dueño** (acceso a todos los negocios y sucursales, incluidos los futuros; crea negocios, da de alta
  personas, asigna roles y sucursales) y **administrador** (solo las sucursales asignadas, de uno o varios
  negocios). Puede haber más de un dueño; nunca puede quedar el sistema sin un dueño activo (RF-23, RF-26, RF-30).
- Un **negocio** tiene una o más **sucursales**; se crea con su primera sucursal. Los nombres son únicos ignorando
  mayúsculas y espacios: el de negocio entre negocios, el de sucursal dentro de su negocio (RF-17 a RF-19).
- Nada se borra: negocios y sucursales se archivan y reactivan; personas se desactivan y reactivan, y su nombre
  queda en lo que registraron (RF-21, RF-22, RF-28, RF-29).
- La primera cuenta del dueño se crea desde una pantalla que solo existe mientras no haya cuentas (RF-1 a RF-3).
- Las cuentas nuevas y los restablecimientos usan una contraseña temporal de 10 caracteres que el dueño ve una
  sola vez y comparte por el medio que prefiera; la persona debe cambiarla antes de hacer otra cosa (RF-11 a RF-14).
- Entrada: contraseña mínima de 8 caracteres; 5 intentos fallidos bloquean 15 minutos; la sesión dura 30 días
  desde el último uso; el mensaje de error no distingue correo inexistente, contraseña mala o cuenta desactivada
  (RF-5 a RF-7, RF-10).
- La **sucursal activa** se elige al entrar si hay más de una, se recuerda entre entradas y se puede cambiar en
  dos toques desde cualquier pantalla; sin acceso a ninguna, no se puede operar (RF-32 a RF-38).
- Todo alta, cambio, archivo, desactivación y restablecimiento queda con autor, fecha y valor anterior (RF-42).

## 2 bis. Identidad, aspecto y color de cada negocio

Origen: spec 002 (aprobada el 11 de noviembre de 2026; construida y validada el mismo día). Estado: **Vigente**.

- La app se llama **SuMando**, siempre con la S y la M mayúsculas; nunca «Mando» ni «Sumando» en pantalla (RF-1 a RF-3).
- Modo claro u oscuro según el ajuste del teléfono o la computadora, sin selector propio (RF-4 a RF-7).
- Cada negocio tiene un color de una paleta cerrada de 8; solo el dueño lo elige o cambia, y el cambio queda
  registrado. El negocio se identifica siempre por nombre y color, nunca solo por color (RF-8 a RF-15).
- Teléfono para capturar y escritorio para revisar: desde 1024 px de ancho, menú lateral y tablas con todas sus
  columnas; por debajo, barra de navegación abajo (Inicio, Productos, Almacenes, Proveedores y «Más», donde están
  Negocios y Personas para el dueño, Cambiar contraseña y Cerrar sesión) y renglones como tarjetas (RF-16 a RF-20 y
  RF-45 a RF-48; la barra inferior es un ajuste aprobado el 12 de noviembre de 2026).
- Pesos con formato de México y fechas como «11 nov 2026»; aviso de guardado de 4 segundos; un error se queda
  hasta cerrarlo y no se pierde lo capturado (RF-23 a RF-28).

## 3. Catálogo

Origen: spec 003 (aprobada el 12 de noviembre de 2026; construida y validada el mismo día). Estado: **Vigente**.

- **Cada negocio tiene su propio catálogo**: productos y proveedores no se comparten; el mismo producto en dos
  negocios se da de alta dos veces (RF-1).
- Con una sucursal activa solo se ve el catálogo de su negocio (RF-4). Lo de otro negocio no existe para quien
  pregunta (RF-8).
- **Áreas** por sucursal, con un responsable que es una persona con cuenta: el dueño o un administrador de esa
  sucursal. Si pierde el acceso, el área lo conserva marcado «sin acceso» hasta que se cambie (RF-2, RF-19).
- **Almacenes** de una sucursal o del negocio completo; cada sucursal ve los suyos y los del negocio (RF-3, RF-5).
  Un almacén de sucursal no repite nombre con los de su sucursal ni con los del negocio; uno del negocio no repite
  con ninguno del negocio (RF-20).
- **Quién edita**: el dueño, todo; un administrador, el catálogo de los negocios donde tiene alguna sucursal, y los
  almacenes y áreas solo de sus sucursales (RF-6, RF-7).
- **Unidad base** de una lista cerrada (gramo, mililitro, pieza) y fija: para cambiarla se archiva el producto y se
  da de alta otro (RF-10, RF-16).
- **Presentaciones** libres por producto, cada una con su equivalencia en la unidad base (mayor que cero, hasta 3
  decimales); la unidad base es siempre una presentación con equivalencia 1 (RF-11 a RF-14). Una se marca para
  comprar y otra para contar; sin marca, ambas son la unidad base (RF-15).
- **Mínimo y máximo** por producto en cada almacén, opcionales, no negativos y con máximo ≥ mínimo. Se capturan en
  cualquier presentación, se guardan en unidad base y se muestran en la de conteo; cambiar una equivalencia no
  cambia el mínimo real (RF-17, RF-22 a RF-26).
- **Proveedor habitual**: uno o ninguno por producto, sin precio. Un proveedor archivado se conserva en sus
  productos pero no se asigna de nuevo (RF-28, RF-35).
- **Nombres** de hasta 80 caracteres, únicos en su ámbito sin distinguir mayúsculas, acentos ni espacios
  exteriores (RF-30 a RF-32).
- **Nada se borra**: todo se archiva y se reactiva si su nombre no choca con uno activo; cada cambio queda con
  autor, fecha y valor anterior (RF-33 a RF-38).

## 4. Recetario e insumos

Origen: spec 004 (aprobada el 12 de noviembre de 2026; construida y validada el mismo día). Estado: **Vigente**.

- **Recetas del negocio**: cada platillo tiene una receta con ingredientes del catálogo de su negocio, cantidad
  bruta (ya incluye la merma) y nota opcional; la editan el dueño y los administradores del negocio (RF-1, RF-4,
  RF-7 a RF-15).
- **Preparaciones de la casa** (como «salsa negra Especial») son productos del catálogo; no se desglosan.
- **Media porción**: un porcentaje de la receta completa configurado en cada platillo, 50 % por omisión, entero de
  1 a 100 (RF-16 a RF-19).
- **Cálculo de insumos** por sucursal: piezas completas y medias por platillo; la lista suma cada ingrediente una
  vez, con la cantidad exacta y, si se compra en otra presentación, cuántas hacen falta redondeando hacia arriba
  (RF-20 a RF-28). Es solo cuánto pedir: no toca inventario ni crea requisiciones.
- **Historial** de cada sucursal con fecha, autor, piezas y resultado; no se modifica y se puede usar como base de
  un cálculo nuevo. Cualquier cálculo se guarda además como plantilla con nombre (RF-29 a RF-39).
- **Importación** desde Excel con el formato del recetario de Pirrus: se revisa antes de guardar y solo entran los
  platillos cuyos ingredientes existen en el catálogo con la misma unidad; no reemplaza recetas existentes
  (RF-40 a RF-48).

## 5. Inventarios

Origen: spec 005 (aprobada el 13 de noviembre de 2026; construida y validada el mismo día). Estado: **Vigente**.

- **Existencias por almacén**: cada producto tiene su existencia en cada almacén, en unidad base y sin redondeo;
  se muestra en la presentación de conteo (RF-1, RF-7, RF-9).
- **Quién mueve**: en un almacén de sucursal, el dueño y los administradores de esa sucursal; en uno del negocio
  completo, el dueño y los administradores con alguna sucursal del negocio (RF-3, RF-4).
- **Entradas** con proveedor, folio y nota opcionales; **salidas** con motivo de lista cerrada (merma, caducado,
  consumo de personal, cortesía, otro con nota); **ajustes** que suman o restan con motivo escrito (RF-11 a RF-19).
- **Negativos permitidos**: un movimiento que deja la existencia bajo cero se guarda y la existencia se marca en
  rojo; el siguiente conteo la corrige (RF-20, RF-21).
- **Traspasos**: dentro del negocio, inmediatos; entre negocios, «en camino» hasta que el negocio que recibe
  confirma lo que llegó, con la diferencia registrada para los dos. El producto destino se propone por nombre y
  unidad base, y si no existe lo elige quien recibe y se recuerda (RF-22 a RF-38).
- **Conteo por área**: cada área cuenta su lista de productos en un almacén; un producto está en una sola área por
  almacén. Lo aplica cualquier administrador de la sucursal sin aprobación; la existencia queda en lo contado y la
  diferencia queda como movimiento de conteo; lo no contado no cambia (RF-39 a RF-54).
- **Nada se edita ni se borra**: entradas, salidas, ajustes y traspasos dentro del negocio se cancelan con un
  movimiento inverso y motivo; conteos y traspasos entre negocios recibidos se corrigen con un ajuste o un conteo
  nuevo (RF-60 a RF-66).
- **Hora del servidor**: no hay movimientos con fecha pasada.

## 5 bis. Importar inventario por áreas

Origen: spec 006 (aprobada el 13 de noviembre de 2026; construida y validada el mismo día). Estado: **Vigente**.

- Se sube la hoja «Inventario por áreas» (.xlsx, hasta 40 MB, imágenes ignoradas) del negocio activo; se revisa
  antes de guardar y solo entran las filas sin problema (RF-5 a RF-24).
- **Unidades**: kilogramo y gramo pasan a gramos, litro y mililitro a mililitros, cualquier otra a piezas con su
  nombre como presentación de conteo; la presentación final con su conversión es la de compra (RF-10 a RF-15).
- **Producto existente** (mismo nombre, activo): no se cambia; solo se le añade lo que falte (presentaciones,
  proveedor, mínimo, área). Con otra unidad base, la fila no entra (RF-20, RF-26).
- Proveedores y áreas se reutilizan por nombre o se crean; las áreas nuevas quedan con quien importa como
  responsable (RF-27, RF-28).
- **Existencia inicial**: la cantidad de la hoja entra como un conteo por área en el almacén elegido; lo que no trae
  cantidad no cambia (RF-32, RF-33).

## 6. Requisiciones

Origen: spec 007 (aprobada el 13 de noviembre de 2026; construida y validada el mismo día). Estado: **Vigente**.

- Cada requisición es de una sucursal, con un almacén de destino y folio consecutivo por negocio (RF-1, RF-2).
- Se arma desde lo que está bajo el mínimo (lo que falta para el máximo, o el mínimo, redondeado a presentaciones
  de compra), un cálculo de insumos, una plantilla de compra de la sucursal o a mano; un producto repetido se suma
  (RF-10, RF-13 a RF-20).
- **Aprueba solo el dueño**, y puede ajustar antes de aprobar; lo que él solicita queda aprobado. Se rechaza o
  cancela con motivo (RF-5, RF-22 a RF-28).
- **Compra por proveedor**: se anota quién compra (nombre) y se marca comprado; el monto es opcional, total del
  proveedor o importe por renglón (RF-27, RF-29 a RF-33).
- **Recepción parcial**: lo que llega entra como entrada de inventario con el folio; lo pendiente se recibe después
  o se cierra con motivo; un excedente entra y se marca. Todo recibido o cerrado = requisición cerrada (RF-34 a
  RF-41).

## 7. Personal y nómina

### Personal

Origen: spec 008 (aprobada el 13 de noviembre de 2026; construida y validada el mismo día). Estado: **Vigente**.

- Cada empleado es de una sucursal; los empleados no tienen cuenta en SuMando (RF-1, RF-8).
- Administradores de la sucursal: dan de alta, editan, dan de baja, reactivan y suben documentos. **Solo el dueño**
  ve y cambia el sueldo por día (por persona) y abre los documentos; cada apertura queda registrada (RF-3 a RF-7,
  RF-13, RF-41).
- Documentos por negocio, editables por el dueño, empezando con los 13 de la hoja (domicilio vence a 3 meses,
  constancia fiscal a 12). Cada documento: entregado, falta o vencido; se reemplaza o retira sin borrar (RF-16 a
  RF-27).
- Baja con fecha y motivo (renuncia, despido, abandono, fin de temporada, otro con nota); el reingreso reactiva el
  mismo expediente con un periodo nuevo; el cambio de sucursal queda en el historial (RF-28 a RF-35).

### Nómina

Origen: spec 009 (aprobada el 13 de noviembre de 2026; construida y validada el mismo día). Estado: **Vigente**.

- Una nómina por semana y sucursal, de lunes a domingo para todos los negocios (RF-1, RF-2).
- El administrador marca días trabajados, medias jornadas y retardos; **solo el dueño** ve montos en pesos, captura
  extras, bonos, comida y préstamos, cierra, reabre y obtiene la hoja de pago y el Excel (RF-4 a RF-7).
- Pago de días = sueldo por día × días trabajados + media jornada × medias jornadas; **cada retardo descuenta media
  jornada** del sueldo de la persona; neto = pago de días + extras + bonos − retardos − comida − abonos. Montos al
  centavo, el medio centavo hacia arriba (RF-18 a RF-23).
- No se marcan días futuros ni fuera del periodo de trabajo del empleado (RF-10, RF-16).
- Préstamos con monto y abono semanal: el abono se propone solo cada semana (abono o saldo, el menor), el dueño lo
  puede cambiar o poner en cero; al cerrar baja el saldo y al reabrir se devuelve exacto (RF-27 a RF-33, RF-39).
- No se cierra con netos negativos, con alguien que tiene días y no tiene sueldo, o con un abono mayor que el saldo.
  Cerrar congela todo; reabrir pide motivo (RF-35 a RF-40).
- Hoja de pago con billetes de 1000 a 20 y monedas de 10 a 50 centavos por persona, totales por denominación, para
  imprimir; Excel con una fila por persona y totales (RF-41 a RF-45).

## 8. Checklists

Origen: spec 010 (aprobada el 13 de noviembre de 2026; construida y validada el mismo día). Estado: **Vigente**.

- Plantillas por negocio, las que se quieran, cada una con sus sucursales y días de la semana; secciones con puesto
  responsable opcional y puntos de palomita, palomita con foto o comentario; las palomitas pueden ser clave (RF-6 a
  RF-11). Lo que se quita se archiva y los cambios solo afectan hojas nuevas (RF-13, RF-14).
- Una hoja por plantilla, sucursal y fecha de la Ciudad de México; se abre con la primera marca y copia la plantilla
  (RF-15 a RF-18).
- Cada marca guarda quién y la hora del servidor. «Todo en orden» no toca puntos clave ni de foto; «Sección lista»
  exige todos los clave y bloquea la sección hasta que un administrador la reabra (RF-20 a RF-30).
- La hoja se cierra sola con la última sección lista; un administrador puede cerrarla con pendientes, que quedan a
  la vista. La hoja de un día anterior solo se puede cerrar (RF-31 a RF-36).
- **Teléfono de piso**: un administrador lo habilita en la sucursal y queda así hasta que lo deshabiliten; solo
  abre las hojas de hoy de su sucursal; el empleado elige su nombre de Personal, sin contraseña, y se guardan su
  nombre y el del teléfono (RF-37 a RF-45).
- Las fotos solo las ven el dueño, los administradores de la sucursal y el teléfono de piso mientras la hoja está
  abierta (RF-48).

## 9. Corte de caja

Origen: spec 011 (aprobada el 13 de noviembre de 2026; construida y validada el mismo día). Estado: **Vigente**.

- Por sucursal, el dueño decide si hay un corte por día o varios, qué formas de pago tiene (Efectivo siempre, más
  terminales, transferencias y otras) y si el teléfono de piso hace cortes (RF-6 a RF-10).
- Un solo corte abierto a la vez por sucursal; abre con fondo inicial; durante el turno, gastos, retiros e ingresos
  (dinero que entra sin ser venta) con concepto libre; se cancelan con motivo, sin borrar (RF-11 a RF-17).
- Conteo del efectivo por piezas de $1,000 a 50 centavos y de cada forma de pago; al entregarlo se congela. En el
  teléfono de piso se cuenta **a ciegas**: nunca ve el reporte del punto de venta, lo esperado ni las diferencias
  (RF-18 a RF-22, RF-30 a RF-33).
- Efectivo esperado = efectivo del punto de venta + fondo + ingresos − gastos − retiros. Diferencia por forma de
  pago = contado − reportado (efectivo: contado − esperado); se marcan en rojo, sin tolerancia ni motivo. Venta antes
  de gastos = efectivo contado − fondo − ingresos + gastos + retiros + demás formas; después = antes − gastos −
  retiros (RF-23 a RF-29).
- Cerrar exige el conteo entregado y el reporte capturado; solo el dueño reabre, con motivo (RF-34 a RF-39).

## 10. Reportes
