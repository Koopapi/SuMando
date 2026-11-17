# Spec 013 — Requisiciones en el día a día

**Aprobada por el dueño el 17 de noviembre de 2026.**

## Contexto y objetivo
La spec 007 dejó requisiciones completas, pero al usarlas con los datos reales estorban en la operación diaria:

- En los negocios la compra se divide por **comprador**: cada encargado lleva sus proveedores (por ejemplo, uno va a
  Sam's y Costco y otro atiende Plásticos y Soleman). Hoy el comprador es un nombre escrito a mano en cada proveedor
  de cada requisición, y el comprador, que no usa SuMando, no tiene cómo llevarse su lista.
- «Bajo el mínimo» pide hasta el máximo, pero casi ningún producto tiene máximo y no hay una forma rápida de
  capturarlo. Lo mismo pasa con el proveedor y la presentación de compra: completarlos es abrir producto por producto.
- Armar una requisición en el teléfono es elegir de una lista de cientos de productos y revisar renglones sin saber
  cuánto hay de cada uno.

Esta spec asigna a cada proveedor un comprador habitual tomado de Personal, muestra la requisición dividida por
comprador, permite mandarle su lista por WhatsApp desde el teléfono de quien opera, da una pantalla para completar
los datos de compra de muchos productos a la vez (incluido el máximo, también desde el importador) y facilita armar
la requisición.

## Usuarios / actores
- **Dueño** y **administrador**: los mismos permisos de la spec 007 y de la spec 003 para el catálogo.
- **Comprador**: una persona de Personal (spec 008) que va a comprar; sigue sin usar SuMando y recibe su lista por
  WhatsApp.

## Historias de usuario
- H1: Como administrador quiero que cada proveedor ya traiga a su comprador, para no escribirlo en cada requisición.
- H2: Como administrador quiero ver la requisición aprobada dividida por comprador y mandarle a cada uno su lista por
  WhatsApp.
- H3: Como dueño quiero capturar de una vez el proveedor, la presentación de compra, el mínimo y el máximo de
  muchos productos, para que las requisiciones salgan con cantidades útiles.
- H4: Como administrador quiero buscar el producto escribiendo y ver cuánto hay de cada uno mientras armo la
  requisición.

## Requisitos funcionales (criterios de aceptación en EARS)

### Comprador habitual
- RF-1: EL SISTEMA permitirá asignar a cada proveedor activo, por sucursal, un comprador habitual elegido entre el personal activo de esa sucursal (spec 008), o ninguno.
- RF-2: EL SISTEMA permitirá asignar el comprador habitual a quien pueda administrar proveedores (spec 003, RF-6) y tenga acceso a esa sucursal.
- RF-3: EL SISTEMA mostrará en la lista de proveedores el comprador habitual de cada uno en la sucursal activa.
- RF-4: CUANDO una requisición pasa a aprobada, EL SISTEMA pondrá en cada grupo de proveedor sin comprador el comprador habitual de ese proveedor en la sucursal de la requisición.
- RF-5: EL SISTEMA permitirá cambiar el comprador de un grupo por otra persona activa del personal de la sucursal, o quitarlo, mientras no se haya recibido nada de ese grupo (sustituye a la spec 007, RF-27).
- RF-6: SI el comprador de un grupo se da de baja en Personal, ENTONCES EL SISTEMA conservará su nombre en ese grupo y lo marcará como dado de baja.
- RF-7: EL SISTEMA conservará y mostrará el comprador escrito a mano en las requisiciones anteriores a esta spec.

### Requisición dividida por comprador
- RF-8: EL SISTEMA mostrará una requisición aprobada o cerrada agrupada por comprador y, dentro de cada comprador, por proveedor, con un grupo «Sin comprador» al final.
- RF-9: EL SISTEMA mostrará en cada comprador cuántos proveedores tiene por comprar, comprados y recibidos.
- RF-10: MIENTRAS una requisición está solicitada, EL SISTEMA mostrará junto a cada proveedor el comprador habitual que tomará al aprobarse.

### Enviar la lista al comprador
- RF-11: MIENTRAS una requisición está aprobada, EL SISTEMA ofrecerá en cada comprador con algún proveedor por comprar la acción «Enviar por WhatsApp».
- RF-12: CUANDO se pide enviar por WhatsApp, EL SISTEMA abrirá WhatsApp en el dispositivo de quien opera con un mensaje dirigido al teléfono del comprador registrado en Personal.
- RF-13: EL SISTEMA armará el mensaje con el negocio, la sucursal, el folio y, por cada proveedor por comprar de ese comprador, cada producto con su cantidad aprobada y su presentación, y la nota de la requisición si tiene.
- RF-14: SI el comprador no tiene teléfono registrado o el teléfono no tiene 10 dígitos o más, ENTONCES EL SISTEMA abrirá WhatsApp con el mensaje sin destinatario e indicará que falta su teléfono.
- RF-15: EL SISTEMA ofrecerá también copiar el mensaje de cada comprador al portapapeles.
- RF-16: EL SISTEMA no mandará mensajes por su cuenta: el envío lo hace quien opera desde su propio WhatsApp.

### Datos de compra de muchos productos a la vez
- RF-17: EL SISTEMA ofrecerá la pantalla «Datos de compra» de un almacén con cada producto activo del negocio que tenga existencia, mínimo o lugar en un área de ese almacén, y su proveedor habitual, presentación de compra, mínimo y máximo en ese almacén.
- RF-18: EL SISTEMA permitirá cambiar en la misma tabla el proveedor habitual, la presentación de compra, el mínimo y el máximo de varios productos y guardarlos juntos.
- RF-19: EL SISTEMA mostrará y aceptará el mínimo y el máximo en la presentación de compra del producto, o en su unidad base si no tiene.
- RF-20: EL SISTEMA permitirá crear desde la tabla una presentación de compra nueva para un producto, con nombre y equivalencia en unidad base (spec 003).
- RF-21: SI un máximo queda menor que su mínimo, o un mínimo o máximo no es un número no negativo con hasta 3 decimales, ENTONCES EL SISTEMA no guardará esa fila, la señalará con el motivo y guardará las demás.
- RF-22: EL SISTEMA permitirá buscar por nombre, ignorando mayúsculas y acentos, y filtrar por área, por proveedor, sin proveedor, sin presentación de compra, sin mínimo y sin máximo.
- RF-23: EL SISTEMA permitirá usar «Datos de compra» solo a quien pueda administrar el catálogo (spec 003, RF-6) y registrar movimientos en ese almacén (spec 005, RF-3, RF-4).
- RF-24: EL SISTEMA registrará cada cambio guardado desde «Datos de compra» con quién lo hizo y cuándo, como los cambios del catálogo.

### Máximo en el importador
- RF-25: EL SISTEMA tomará como opcional en el importador de inventario (spec 006) la columna MÁXIMO, entendida en la misma presentación que el MÍNIMO (spec 006, RF-31).
- RF-26: SI el MÁXIMO de una fila no es un número válido o es menor que su MÍNIMO, ENTONCES EL SISTEMA lo señalará como aviso e importará la fila sin máximo.
- RF-27: CUANDO se importa un producto, EL SISTEMA guardará el MÁXIMO en el almacén elegido si el producto no tiene máximo ahí.
- RF-28: EL SISTEMA mostrará el máximo de cada fila en la revisión de la importación.

### Armar la requisición
- RF-29: EL SISTEMA permitirá elegir el producto de un renglón escribiendo parte de su nombre, ignorando mayúsculas y acentos.
- RF-30: EL SISTEMA mostrará en cada renglón la existencia, el mínimo y el máximo del producto en el almacén de destino, en la presentación del renglón.
- RF-31: EL SISTEMA mostrará los renglones agrupados por proveedor mientras se arma la requisición, con el total de renglones de cada grupo.
- RF-32: CUANDO se agrega lo que está bajo el mínimo, EL SISTEMA indicará cuántos productos entraron sin máximo y, por eso, solo hasta su mínimo.
- RF-33: EL SISTEMA mostrará Datos de compra en el menú de Inventario.

## Requisitos no funcionales
- **El servidor decide**: el comprador que toma cada grupo, el mensaje de WhatsApp, las conversiones y las
  validaciones de «Datos de compra» los arma el servidor; los cambios se guardan en una transacción por envío
  (constitución, principio 3).
- **Aislamiento y permisos**: tests de integración demuestran que no se asigna como comprador a personal de otra
  sucursal o de otro negocio y que nadie sin permiso cambia datos de compra (principios 6 y 7).
- **Nada se borra**: la migración conserva los compradores escritos a mano de las requisiciones existentes y no
  cambia ningún dato de producción (principio 8 y reglas del repositorio).
- **Volumen**: «Datos de compra» con 300 productos abre y guarda 300 cambios en menos de 2 segundos, en escritorio.
- **Teléfono**: una requisición de 40 renglones se revisa en 360 px sin abrir cada renglón; el envío por WhatsApp
  funciona desde el navegador del teléfono y desde la app instalada.
- **Sistema de diseño**: solo componentes de la spec 002; si hace falta un buscador de productos, entra al catálogo
  de componentes.

## Casos límite
- Un proveedor sin comprador habitual: su grupo cae en «Sin comprador» y se le puede asignar uno en la requisición.
- El mismo comprador en dos sucursales: es una persona de Personal de cada sucursal; se asigna en cada una.
- Se cambia el comprador habitual con requisiciones ya aprobadas: estas conservan el que tenían.
- El dueño aprueba con cambios: el mensaje lleva las cantidades aprobadas, no las solicitadas.
- Un proveedor ya comprado: no entra en el mensaje; si el comprador no tiene nada por comprar, no se ofrece enviar.
- Teléfono escrito con espacios, guiones o con +52: se toman solo los dígitos; si son 10, se antepone 52.
- Un producto sin presentación de compra: su mínimo y máximo se capturan en unidad base (gramos, mililitros o piezas).
- Se cambia la presentación de compra de un producto: el mínimo y el máximo guardados en unidad base no cambian; solo
  cambia cómo se muestran.
- Un mensaje muy largo (más de 60 renglones): se envía igual; WhatsApp lo acepta hasta su límite y, si no, se
  copia.

## Fuera de alcance
- Mandar mensajes desde SuMando con la API de WhatsApp, avisos automáticos o confirmación de lectura.
- Que el comprador tenga cuenta, marque lo comprado o capture importes desde su teléfono.
- Comprador habitual por producto; varios compradores para un mismo proveedor en una sucursal.
- Fusionar proveedores duplicados (por ejemplo, el mismo proveedor escrito de dos formas): se corrige en el
  catálogo a mano.
- Una regla automática de cuánto pedir sin máximo (por ejemplo, el doble del mínimo).
- Hoja para imprimir o PDF de la lista del comprador.
- Columna COMPRADOR en el importador de inventario.

## Criterios de finalización
- Todos los RF con al menos un test en verde (`validation.md` 33 de 33).
- E2E de escritorio de la spec en verde, con el barrido en claro y oscuro con axe. Los teléfonos los prueba el
  dueño.
- Recorrido manual con los datos de Pirrus: completar datos de compra, asignar compradores, requisición desde
  mínimos, aprobada, enviada por WhatsApp a dos compradores, comprada y recibida.
- `docs/reglas-de-negocio.md` y `docs/roadmap.md` actualizados.

## Dudas abiertas
Ninguna. Resueltas con el dueño el 17 de noviembre de 2026: comprador habitual por proveedor tomado de Personal;
sin máximo se pide solo hasta el mínimo (el máximo se captura en «Datos de compra» o en el importador); la lista se
manda por WhatsApp desde el teléfono de quien opera, sin la API de Meta.
