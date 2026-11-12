# Spec 003 — Catálogo

**Estado: borrador para aprobación del dueño (12 de noviembre de 2026).**

## Contexto y objetivo
El recetario, los inventarios y las requisiciones (specs 004 a 006) necesitan saber qué se compra, cómo se mide,
dónde se guarda, quién lo surte y cuánto debe haber. Hoy eso vive en hojas sueltas por negocio. Esta spec crea el
catálogo de cada negocio: productos con sus presentaciones, almacenes, áreas, proveedores y los mínimos y máximos
de cada producto en cada almacén. No mueve existencias: solo deja listas las piezas sobre las que se construyen
los módulos siguientes.

## Usuarios / actores
- **Dueño**: administra el catálogo de todos los negocios.
- **Administrador**: administra el catálogo de los negocios donde tiene al menos una sucursal asignada; los
  almacenes y las áreas de una sucursal solo si esa sucursal es suya.

## Historias de usuario
- H1: Como administrador quiero dar de alta los productos de mi negocio con su unidad y sus presentaciones para
  contar, pedir y calcular recetas sin convertir a mano.
- H2: Como administrador quiero registrar los almacenes y las áreas de mi sucursal para saber dónde está cada cosa
  y quién responde por cada área.
- H3: Como administrador quiero fijar el mínimo y el máximo de cada producto en cada almacén para saber cuándo y
  cuánto pedir.
- H4: Como administrador quiero anotar el proveedor habitual de cada producto para saber a quién pedírselo.
- H5: Como dueño quiero que cada negocio tenga su propio catálogo para que lo de Pastatti no se mezcle con lo de
  Pirrus.
- H6: Como administrador quiero archivar lo que ya no se usa sin perder el historial.

## Requisitos funcionales (criterios de aceptación en EARS)

### Pertenencia y permisos
- RF-1: EL SISTEMA guardará cada producto y cada proveedor como parte de un solo negocio, y nunca los compartirá entre negocios.
- RF-2: EL SISTEMA guardará cada área como parte de una sola sucursal.
- RF-3: CUANDO se da de alta un almacén, EL SISTEMA pedirá indicar si pertenece a una sucursal concreta o al negocio completo.
- RF-4: MIENTRAS hay una sucursal activa, EL SISTEMA mostrará solo el catálogo del negocio de esa sucursal.
- RF-5: MIENTRAS hay una sucursal activa, EL SISTEMA mostrará los almacenes de esa sucursal junto con los del negocio completo, y las áreas de esa sucursal.
- RF-6: EL SISTEMA permitirá al dueño y a los administradores con alguna sucursal asignada en un negocio dar de alta, modificar, archivar y reactivar los productos, proveedores y almacenes del negocio completo.
- RF-7: SI un administrador intenta dar de alta, modificar, archivar o reactivar un almacén o un área de una sucursal que no tiene asignada, ENTONCES EL SISTEMA lo rechazará por falta de permiso.
- RF-8: SI alguien pide o modifica un elemento del catálogo de un negocio al que no tiene acceso, aunque sea por dirección directa, ENTONCES EL SISTEMA lo rechazará sin revelar si el elemento existe.

### Productos y presentaciones
- RF-9: EL SISTEMA permitirá dar de alta un producto con nombre, unidad base y, opcionalmente, proveedor habitual y notas.
- RF-10: EL SISTEMA ofrecerá como unidad base una lista cerrada: gramo, mililitro y pieza.
- RF-11: EL SISTEMA permitirá añadir a un producto las presentaciones que se necesiten, cada una con un nombre y su equivalencia en la unidad base (por ejemplo, «botella = 1000 ml» y «caja = 6000 ml»).
- RF-12: EL SISTEMA dará a cada producto, sin capturarla, una presentación igual a su unidad base con equivalencia 1.
- RF-13: SI la equivalencia de una presentación es cero, negativa o tiene más de 3 decimales, ENTONCES EL SISTEMA la rechazará e indicará el formato válido.
- RF-14: SI el nombre de una presentación ya existe en el mismo producto, ENTONCES EL SISTEMA no creará el duplicado e informará del conflicto.
- RF-15: EL SISTEMA permitirá marcar una presentación del producto como la de compra y otra como la de conteo; mientras no se marquen, ambas serán la unidad base.
- RF-16: SI se intenta cambiar la unidad base de un producto, ENTONCES EL SISTEMA lo rechazará e indicará que se archive el producto y se dé de alta uno nuevo.
- RF-17: CUANDO se cambia la equivalencia de una presentación, EL SISTEMA conservará los mínimos y máximos ya guardados en unidad base y los mostrará recalculados con la nueva equivalencia.

### Almacenes y áreas
- RF-18: EL SISTEMA permitirá dar de alta un almacén con nombre y pertenencia (sucursal o negocio completo).
- RF-19: EL SISTEMA permitirá dar de alta un área con nombre y responsable.
- RF-20: SI un almacén de una sucursal tiene el mismo nombre que otro de esa sucursal o del negocio completo, o un almacén del negocio completo coincide con cualquier almacén del negocio, ENTONCES EL SISTEMA no creará el duplicado e informará del conflicto.
- RF-21: SI el nombre de un área ya existe en la misma sucursal, ENTONCES EL SISTEMA no creará el duplicado e informará del conflicto.

### Mínimos y máximos
- RF-22: EL SISTEMA permitirá fijar para cada producto, en cada almacén activo del negocio, un mínimo y un máximo, ambos opcionales.
- RF-23: CUANDO se captura un mínimo o un máximo, EL SISTEMA permitirá capturarlo en cualquier presentación del producto y lo guardará convertido a la unidad base.
- RF-24: SI el máximo es menor que el mínimo, ENTONCES EL SISTEMA lo rechazará e indicará que el máximo debe ser igual o mayor.
- RF-25: SI un mínimo o un máximo es negativo, ENTONCES EL SISTEMA lo rechazará.
- RF-26: EL SISTEMA mostrará los mínimos y máximos de cada producto por almacén en la presentación de conteo del producto.

### Proveedores
- RF-27: EL SISTEMA permitirá dar de alta un proveedor con nombre y, opcionalmente, teléfono y notas.
- RF-28: EL SISTEMA permitirá asignar a cada producto un proveedor habitual del mismo negocio, o ninguno.
- RF-29: EL SISTEMA mostrará en cada proveedor la lista de productos que lo tienen como proveedor habitual.

### Nombres, archivo y registro
- RF-30: SI el nombre de un producto o de un proveedor ya existe en el mismo negocio, ENTONCES EL SISTEMA no creará el duplicado e informará del conflicto.
- RF-31: EL SISTEMA comparará todos los nombres del catálogo ignorando mayúsculas, acentos y espacios exteriores.
- RF-32: SI un nombre del catálogo queda vacío o pasa de 80 caracteres, ENTONCES EL SISTEMA lo rechazará e indicará el límite.
- RF-33: CUANDO se archiva un producto, proveedor, almacén o área, EL SISTEMA dejará de ofrecerlo para elegir y conservará toda su información.
- RF-34: EL SISTEMA permitirá reactivar cualquier elemento archivado del catálogo, siempre que su nombre no choque con uno activo.
- RF-35: SI se archiva un proveedor que es el habitual de algún producto, ENTONCES EL SISTEMA mantendrá la relación, la mostrará como archivada y no lo ofrecerá para nuevas asignaciones.
- RF-36: SI se archiva un almacén, ENTONCES EL SISTEMA conservará sus mínimos y máximos y dejará de mostrarlos hasta que se reactive.
- RF-37: EL SISTEMA no ofrecerá borrar ningún elemento del catálogo.
- RF-38: EL SISTEMA registrará, para cada alta, cambio, archivo y reactivación del catálogo, quién lo hizo, cuándo y el valor anterior.

### Consulta
- RF-39: EL SISTEMA mostrará los productos en una tabla con búsqueda por nombre, ignorando mayúsculas y acentos.
- RF-40: EL SISTEMA permitirá filtrar los productos por proveedor habitual y por activos o archivados.
- RF-41: EL SISTEMA permitirá filtrar los productos que tienen o no tienen mínimo en el almacén elegido.

## Requisitos no funcionales
- **Sistema de diseño**: las pantallas usan solo componentes de la spec 002, funcionan desde 360 px y siguen la
  dirección Tablero.
- **Aislamiento**: un test de integración demuestra que nada del catálogo de un negocio aparece ni se modifica
  desde otro negocio (constitución, principio 6).
- **Permisos en el servidor**: cada operación comprueba el permiso en el servidor (constitución, principio 7).
- **Nada se borra**: todo se archiva y cada cambio queda con autor, fecha y valor anterior (constitución,
  principio 8).
- **Volumen**: con 1,000 productos en un negocio, la tabla de productos abre en menos de 2 segundos y la búsqueda filtra en menos de 300 ms en escritorio.

## Casos límite
- El mismo producto en Pastatti y en Pirrus: se da de alta dos veces, una en cada negocio, y son independientes.
- Un administrador con solo una sucursal de Pastatti: edita productos, proveedores y almacenes del negocio
  completo, y los almacenes y áreas de su sucursal; los de la otra sucursal no los ve.
- Dos sucursales con un área llamada «Cocina»: permitido, la unicidad es dentro de la sucursal.
- Un producto en piezas, como un huevo, con presentación «caja = 360 pz»: válido.
- Mínimo capturado en cajas y después la caja cambia de 6 a 12 botellas: el mínimo guardado en unidad base no
  cambia; se muestra la mitad de cajas (RF-17).
- Mínimo y máximo iguales: válido.
- Solo máximo sin mínimo: válido.
- Se archiva una sucursal (spec 001): sus almacenes y áreas dejan de ofrecerse con ella; los del negocio completo
  siguen.
- Nombres «Azúcar» y «azucar »: son el mismo nombre y se rechaza el duplicado (RF-31).

## Fuera de alcance
- Existencias, entradas, salidas, traspasos y conteos: spec 005.
- Qué productos se cuentan en cada área y en qué orden: spec 005, con el conteo físico por área.
- Precios, costos y varios proveedores por producto.
- Recetas e ingredientes: spec 004.
- Requisiciones y sugerencia de cuánto pedir hasta el máximo: spec 006.
- Alertas de existencias bajas: spec 011.
- Importar el catálogo desde hojas de cálculo o desde Comanda.
- Catálogo compartido entre negocios y copia de productos de un negocio a otro.
- Categorías, códigos de barras, fotos de producto y datos fiscales del proveedor.
- Borrar elementos del catálogo.

## Criterios de finalización
- Todos los RF con al menos un test en verde (`validation.md` 41 de 41).
- E2E de escritorio de la spec en verde, con el barrido en claro y oscuro con axe. Los teléfonos los prueba el
  dueño.
- Recorrido manual del flujo principal: dar de alta un proveedor, un producto con dos presentaciones, un almacén
  de sucursal y otro del negocio, un área, y fijar mínimo y máximo.
- `docs/reglas-de-negocio.md` actualizado.

## Dudas abiertas
- [NECESITA ACLARACIÓN: ¿quién es el responsable de un área? Propuesta: una persona con cuenta en SuMando (dueño o
  administrador). La otra opción es escribir un nombre libre, porque los empleados de piso no tienen cuenta y el
  expediente de personal llega hasta la spec 007.]
