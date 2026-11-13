# Spec 005 — Inventarios

**Aprobada por el dueño el 13 de noviembre de 2026.**

## Contexto y objetivo
Hoy el inventario de cada negocio vive en una hoja que se llena por áreas cada semana (Bebidas, Lácteos,
Verduras…): se cuenta lo que hay, pero no queda registro de lo que entró, salió o se movió entre almacenes, ni de
quién lo hizo. Esta spec da a SuMando existencias por almacén con un historial de movimientos: entradas, salidas
con motivo, ajustes, traspasos entre almacenes del mismo negocio y entre negocios, y el conteo físico por área,
que deja la existencia en lo contado y registra la diferencia como consumo. Las existencias se comparan con los
mínimos y máximos del catálogo (spec 003). Mando no es punto de venta: lo que se gasta en cocina se conoce con el
conteo, no venta por venta.

## Usuarios / actores
- **Dueño**: opera el inventario de todos los almacenes de todos los negocios.
- **Administrador**: opera el inventario de los almacenes de sus sucursales y de los almacenes del negocio completo
  donde tiene al menos una sucursal asignada; cuenta las áreas de sus sucursales.

## Historias de usuario
- H1: Como administrador quiero registrar lo que llega del proveedor para que la existencia suba sin contar de
  nuevo.
- H2: Como administrador quiero registrar lo que se tira, caduca o se da al personal, con su motivo, para saber por
  qué falta producto.
- H3: Como administrador quiero mover producto de un almacén a otro, o mandarlo a otro negocio, y que cada lado
  lo vea.
- H4: Como administrador quiero contar un área desde el teléfono, con lo que el sistema espera a la vista, y que la
  existencia quede en lo que conté.
- H5: Como dueño quiero ver cuánto hay de cada producto en cada almacén, qué está bajo el mínimo y qué está en
  negativo.
- H6: Como dueño quiero ver la historia de un producto en un almacén (qué entró, qué salió, quién y cuándo) para
  explicar una diferencia.

## Requisitos funcionales (criterios de aceptación en EARS)

### Pertenencia y permisos
- RF-1: EL SISTEMA guardará la existencia de cada producto por almacén, y cada movimiento como parte del negocio y del almacén donde ocurre.
- RF-2: MIENTRAS hay una sucursal activa, EL SISTEMA mostrará solo las existencias y los movimientos de los almacenes de esa sucursal y de los del negocio completo.
- RF-3: EL SISTEMA permitirá registrar movimientos en un almacén de sucursal solo al dueño y a los administradores de esa sucursal.
- RF-4: EL SISTEMA permitirá registrar movimientos en un almacén del negocio completo al dueño y a los administradores con alguna sucursal asignada en ese negocio.
- RF-5: SI alguien pide o registra algo en un almacén, un área o un movimiento al que no tiene acceso, aunque sea por dirección directa, ENTONCES EL SISTEMA lo rechazará sin revelar si existe.
- RF-6: SI se intenta registrar un movimiento con un producto o un almacén archivado, ENTONCES EL SISTEMA lo rechazará e indicará cuál está archivado.

### Cantidades
- RF-7: CUANDO se captura la cantidad de un renglón, EL SISTEMA permitirá capturarla en cualquier presentación activa del producto y la guardará convertida a la unidad base.
- RF-8: SI la cantidad de un renglón de entrada, salida o traspaso es cero, negativa o tiene más de 3 decimales, ENTONCES EL SISTEMA la rechazará e indicará el formato válido.
- RF-9: EL SISTEMA sumará y restará las existencias sin redondeo, y las mostrará en la presentación de conteo del producto con hasta 3 decimales.
- RF-10: SI un movimiento repite el mismo producto en dos renglones, ENTONCES EL SISTEMA lo rechazará e indicará el producto repetido.

### Entradas
- RF-11: EL SISTEMA permitirá registrar una entrada a un almacén con uno o más renglones de producto y cantidad.
- RF-12: EL SISTEMA permitirá anotar en una entrada, opcionalmente, el proveedor (activo, del mismo negocio), una referencia de hasta 40 caracteres (folio o factura) y una nota de hasta 200 caracteres.
- RF-13: CUANDO se guarda una entrada, EL SISTEMA sumará cada cantidad a la existencia del producto en ese almacén.

### Salidas
- RF-14: EL SISTEMA permitirá registrar una salida de un almacén con uno o más renglones de producto y cantidad, y un motivo.
- RF-15: EL SISTEMA ofrecerá como motivo de salida una lista cerrada: merma, caducado, consumo de personal, cortesía y otro.
- RF-16: SI el motivo de una salida es «otro» y la nota está vacía, ENTONCES EL SISTEMA la rechazará y pedirá la nota.
- RF-17: CUANDO se guarda una salida, EL SISTEMA restará cada cantidad de la existencia del producto en ese almacén.

### Ajustes
- RF-18: EL SISTEMA permitirá registrar un ajuste de un producto en un almacén con una cantidad que suma o resta y un motivo escrito de 3 a 200 caracteres.
- RF-19: SI la cantidad de un ajuste es cero o el motivo está vacío, ENTONCES EL SISTEMA lo rechazará.

### Existencia negativa
- RF-20: CUANDO una salida, un ajuste o un traspaso deja una existencia por debajo de cero, EL SISTEMA guardará el movimiento y dejará la existencia en negativo.
- RF-21: EL SISTEMA marcará en rojo, con el texto «negativo», cada existencia menor que cero.

### Traspasos dentro del negocio
- RF-22: EL SISTEMA permitirá traspasar uno o más productos de un almacén a otro almacén activo del mismo negocio.
- RF-23: SI el almacén de origen y el de destino son el mismo, ENTONCES EL SISTEMA rechazará el traspaso.
- RF-24: CUANDO se guarda un traspaso dentro del negocio, EL SISTEMA restará las cantidades en el origen y las sumará en el destino en la misma operación.
- RF-25: EL SISTEMA permitirá elegir como destino de un traspaso dentro del negocio cualquier almacén activo del negocio, aunque quien traspasa no tenga acceso a él.

### Traspasos entre negocios
- RF-26: EL SISTEMA permitirá traspasar uno o más productos de un almacén a un almacén activo de otro negocio activo.
- RF-27: CUANDO se envía un traspaso entre negocios, EL SISTEMA restará las cantidades en el origen y dejará el traspaso «en camino».
- RF-28: MIENTRAS un traspaso está en camino, EL SISTEMA lo mostrará en una lista de traspasos por recibir del almacén de destino.
- RF-29: EL SISTEMA permitirá recibir un traspaso en camino solo a quien tenga permiso de registrar movimientos en el almacén de destino.
- RF-30: CUANDO se recibe un traspaso, EL SISTEMA propondrá en cada renglón la cantidad enviada y permitirá cambiarla por la recibida, incluso a cero.
- RF-31: CUANDO se recibe un traspaso, EL SISTEMA propondrá para cada renglón el producto del negocio que recibe con el mismo nombre y la misma unidad base, si existe y está activo.
- RF-32: SI un renglón no tiene producto propuesto, ENTONCES EL SISTEMA pedirá elegir un producto activo del negocio que recibe con la misma unidad base antes de recibir.
- RF-33: CUANDO se recibe un renglón en un producto elegido a mano, EL SISTEMA recordará esa correspondencia y la propondrá en los siguientes traspasos entre esos dos negocios.
- RF-34: CUANDO se confirma la recepción, EL SISTEMA sumará las cantidades recibidas en el almacén de destino y marcará el traspaso como recibido.
- RF-35: SI la cantidad recibida de un renglón es distinta de la enviada, ENTONCES EL SISTEMA registrará la diferencia en el traspaso y la mostrará a los dos negocios.
- RF-36: MIENTRAS un traspaso está en camino, EL SISTEMA permitirá a quien tenga permiso en el almacén de origen cancelarlo, devolviendo las cantidades al origen.
- RF-37: SI se intenta recibir un traspaso ya cancelado o ya recibido, o cancelar uno ya recibido, ENTONCES EL SISTEMA lo rechazará e indicará su estado.
- RF-38: EL SISTEMA mostrará a quien envía solo el nombre del negocio y del almacén de destino, sin su catálogo ni sus existencias.

### Áreas de conteo
- RF-39: EL SISTEMA permitirá asignar a cada área un almacén activo de su sucursal o del negocio completo.
- RF-40: EL SISTEMA permitirá armar la lista de productos que se cuentan en cada área y fijar su orden.
- RF-41: SI un producto ya está en otra área activa con el mismo almacén, ENTONCES EL SISTEMA no lo añadirá e indicará en qué área está.
- RF-42: EL SISTEMA mostrará los productos activos del negocio que no están en ninguna área activa de cada almacén.

### Conteo físico por área
- RF-43: EL SISTEMA permitirá contar un área a quien tenga permiso de registrar movimientos en el almacén del área.
- RF-44: CUANDO se abre el conteo de un área, EL SISTEMA mostrará sus productos activos en el orden del área, cada uno con la existencia esperada en la presentación de conteo.
- RF-45: EL SISTEMA permitirá capturar lo contado de cada producto en cualquier presentación activa, incluido el cero.
- RF-46: EL SISTEMA ofrecerá en cada producto una acción «Igual» que captura la existencia esperada.
- RF-47: EL SISTEMA ofrecerá una acción «Lo que falta, igual» que captura la existencia esperada en todos los productos sin capturar.
- RF-48: MIENTRAS un conteo no se ha aplicado, EL SISTEMA conservará lo capturado en el mismo dispositivo si se cierra la pantalla o se recarga.
- RF-49: CUANDO se aplica un conteo, EL SISTEMA dejará la existencia de cada producto capturado en lo contado y registrará la diferencia como movimiento de conteo.
- RF-50: CUANDO se aplica un conteo, EL SISTEMA no cambiará la existencia de los productos que quedaron sin capturar.
- RF-51: SI la existencia de un producto cambió entre que se abrió el conteo y se aplica, ENTONCES EL SISTEMA mostrará los productos que cambiaron y pedirá confirmar antes de aplicar.
- RF-52: EL SISTEMA calculará la diferencia de un conteo contra la existencia al momento de aplicarlo.
- RF-53: EL SISTEMA guardará cada conteo aplicado con su área, almacén, quién lo hizo, cuándo y, por producto, lo esperado, lo contado y la diferencia.
- RF-54: EL SISTEMA mostrará en cada área cuándo se contó por última vez y quién.

### Existencias
- RF-55: EL SISTEMA mostrará las existencias de un almacén en una tabla con el producto, la existencia, el mínimo y el máximo del catálogo, y el área.
- RF-56: EL SISTEMA marcará «bajo mínimo» cada existencia menor que el mínimo del producto en ese almacén.
- RF-57: EL SISTEMA permitirá buscar por nombre, ignorando mayúsculas y acentos, y filtrar por área, bajo mínimo y negativo.
- RF-58: EL SISTEMA mostrará en el detalle del producto su existencia en cada almacén visible desde la sucursal activa.
- RF-59: EL SISTEMA mostrará un producto archivado en las existencias solo si su existencia es distinta de cero, marcado como archivado.

### Historial y correcciones
- RF-60: EL SISTEMA guardará cada movimiento con su tipo, almacén, renglones, quién lo registró y cuándo, con la fecha y hora del servidor.
- RF-61: EL SISTEMA mostrará el historial de un producto en un almacén, del más reciente al más antiguo, con cada movimiento, su cantidad, la existencia que dejó, quién y cuándo.
- RF-62: EL SISTEMA mostrará la lista de movimientos de la sucursal activa con filtros por tipo, almacén y rango de fechas.
- RF-63: EL SISTEMA no ofrecerá modificar ni borrar ningún movimiento.
- RF-64: EL SISTEMA permitirá cancelar una entrada, una salida, un ajuste o un traspaso dentro del negocio con un motivo escrito, registrando el movimiento inverso.
- RF-65: SI se intenta cancelar un conteo, un traspaso entre negocios ya recibido o un movimiento ya cancelado, ENTONCES EL SISTEMA lo rechazará e indicará cómo corregirlo (ajuste o conteo nuevo).
- RF-66: CUANDO se cancela un movimiento, EL SISTEMA lo mostrará como cancelado, con quién, cuándo y el motivo, junto al movimiento inverso.

### Navegación
- RF-67: EL SISTEMA mostrará Inventario en el menú lateral, en «Más» del teléfono y en el inicio, con acceso a existencias, registrar un movimiento, contar un área, traspasos por recibir e historial.

## Requisitos no funcionales
- **Sistema de diseño**: las pantallas usan solo componentes de la spec 002, funcionan desde 360 px y siguen la
  dirección Tablero. El conteo se captura con teclado numérico en el teléfono.
- **El servidor decide**: existencias, diferencias y estados de traspaso los calcula el servidor dentro de una
  transacción; dos movimientos simultáneos sobre el mismo producto y almacén no pierden ninguno (constitución,
  principio 3).
- **Aislamiento**: un test de integración demuestra que un negocio no ve ni mueve existencias de otro, salvo el
  traspaso entre negocios, que solo expone nombre del negocio y del almacén (constitución, principio 6).
- **Nada se borra**: los movimientos se cancelan con otro movimiento; cada uno guarda autor y fecha (principio 8).
- **Volumen**: con 1,000 productos y 50,000 movimientos en un negocio, las existencias de un almacén abren en
  menos de 2 segundos, la búsqueda filtra en menos de 300 ms y un conteo de 200 productos se aplica en menos de
  2 segundos, en escritorio.

## Casos límite
- Primer uso: todas las existencias están en cero; el primer conteo de cada área las deja en lo contado y la
  diferencia queda como conteo.
- Entrada registrada mientras otro administrador cuenta la misma área: al aplicar, el conteo avisa que la
  existencia cambió (RF-51) y, si se confirma, la existencia queda en lo contado.
- Dos administradores cuentan la misma área a la vez: gana el que aplica después; el primero queda en el historial
  y el segundo ve el aviso de RF-51.
- Salida de 3 kg con 2 kg en existencia: se guarda y queda en –1 kg en rojo (RF-20).
- Traspaso a otro negocio de «Queso manchego» en gramos, y allá existe «queso Manchego» en gramos: se propone solo
  (RF-31, comparación de nombres de la spec 003). Si allá está en piezas, no se propone y se elige otro (RF-32).
- Traspaso entre negocios recibido en cero en un renglón (no llegó): la diferencia queda registrada; para el origen
  la cantidad ya había salido.
- Se archiva el almacén de destino de un traspaso en camino: se puede cancelar desde el origen; recibirlo se
  rechaza (RF-6) hasta reactivar el almacén.
- Se archiva un producto con existencia: deja de ofrecerse para movimientos y sigue en existencias marcado
  archivado mientras no esté en cero (RF-59). Para dejarlo en cero antes de archivarlo, un ajuste.
- Se archiva un área: su lista se conserva; sus productos vuelven a contar como «sin área» (RF-42).
- Un producto en dos almacenes de la misma sucursal: puede estar en un área de cada almacén.
- Cambia la equivalencia de una presentación: las existencias guardadas en unidad base no cambian; se muestran
  recalculadas.
- Cancelar una entrada cuyo producto ya salió: la cancelación se guarda y la existencia puede quedar en negativo.
- Un administrador pierde la sucursal a medio conteo: al aplicar se rechaza por permiso; lo capturado sigue en el
  dispositivo.

## Fuera de alcance
- Costos, precios y valor del inventario.
- Movimientos con fecha pasada: todo movimiento lleva la fecha y hora del servidor al registrarlo.
- Entradas desde una requisición recibida y crear una requisición desde los mínimos: spec 006.
- Salidas automáticas por recetas o por lo vendido en el punto de venta.
- Alertas y avisos de existencias bajas fuera de la pantalla de existencias: spec 011.
- Lotes, caducidades por lote y números de serie.
- Conteo de un almacén completo sin áreas o conteo a ciegas (sin ver lo esperado).
- Captura sin conexión: se necesita internet para guardar; solo lo capturado del conteo se conserva en el
  dispositivo.
- Exportar existencias o movimientos a hoja de cálculo.
- Importar existencias desde las hojas de inventario actuales.

## Criterios de finalización
- Todos los RF con al menos un test en verde (`validation.md` 67 de 67).
- E2E de escritorio de la spec en verde, con el barrido en claro y oscuro con axe. Los teléfonos los prueba el
  dueño.
- Recorrido manual del flujo principal: entrada de proveedor, salida por merma, traspaso entre almacenes, traspaso
  a otro negocio recibido con diferencia, conteo de un área con «Igual» y existencias con un producto bajo mínimo.
- `docs/reglas-de-negocio.md` actualizado.

## Dudas abiertas
Ninguna. Resuelta en la aprobación (13 de noviembre de 2026): Inventario va en «Más» del teléfono y en el menú
lateral (RF-67); la barra inferior de la spec 002 no cambia. Si el uso pide Inventario en la barra, entra como ajuste
a la spec 002.
