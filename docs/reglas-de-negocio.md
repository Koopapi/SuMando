# Reglas de negocio — Mando

Resumen de todas las reglas acordadas, en un solo sitio. **La fuente de verdad son las specs**: cada regla cita la
suya. Si una regla cambia, se cambia primero la spec y después este documento.

Estado de cada regla: **Vigente** (construida y con tests) o **Aprobada** (en una spec aprobada, pendiente de
construir).

Última actualización: 12 de noviembre de 2026. Specs 001 (42 RF), 002 (48 RF), 003 (41 RF) y 004 (55 RF) vigentes, con test en verde.

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

Origen: spec 005 (aprobada el 13 de noviembre de 2026). Estado: **Aprobada**.

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

## 6. Requisiciones

## 7. Personal y nómina

## 8. Checklists

## 9. Corte de caja

## 10. Reportes
