# Spec 014 — Pulido visual

**Aprobada por el dueño el 17 de noviembre de 2026.**

## Contexto y objetivo
Con los datos reales cargados, SuMando funciona pero se ve y se usa peor de lo que debería:

- El menú lateral tiene 15 opciones sueltas, sin orden por tipo de trabajo, y la barra del teléfono ofrece Productos,
  Almacenes y Proveedores, que casi no se tocan.
- Los filtros son un botón por cada valor (uno por área, uno por proveedor…) y llenan la pantalla.
- Las listas largas (cientos de productos, historiales) se muestran completas y obligan a bajar mucho.
- Los formularios por renglones ocupan mucho alto y las pantallas dejan mucho espacio vacío arriba.
- Los negocios solo se distinguen por un color; no tienen su logo.

Esta spec ordena el menú por áreas de trabajo, cambia la barra del teléfono a lo del día a día, agrupa los filtros
en selectores, agrupa las listas largas en grupos plegables (y pagina las que no tienen grupo), compacta formularios
y encabezados, y deja subir el logo de cada negocio para verlo en pantalla y en los documentos.

## Usuarios / actores
- **Dueño**: sube, cambia o quita el logo de cada negocio; ve el grupo «Administración» del menú.
- **Administrador** y **dueño**: usan el menú, los filtros, las listas y los formularios.

## Historias de usuario
- H1: Como usuario quiero el menú agrupado por área de trabajo, para encontrar cada pantalla sin leer 15 opciones.
- H2: Como usuario del teléfono quiero en la barra de abajo lo que uso a diario.
- H3: Como usuario quiero filtrar por área, proveedor o estado desde un selector, sin una fila de botones.
- H4: Como usuario quiero que una lista de cientos de renglones se vea por grupos que abro y cierro.
- H5: Como administrador quiero capturar una requisición en el teléfono viendo varios renglones a la vez.
- H6: Como dueño quiero subir el logo de cada negocio y verlo en la app, en la hoja de pago y en los Excel.

## Requisitos funcionales (criterios de aceptación en EARS)

### Menú por categorías
- RF-1: EL SISTEMA mostrará en el menú lateral, arriba y sin categoría, Inicio y Tablero.
- RF-2: EL SISTEMA mostrará debajo, en este orden y con su título, las categorías «Operación del día» (Checklists, Corte de caja), «Compras e inventario» (Inventario, Requisiciones, Productos, Proveedores, Almacenes y áreas), «Cocina» (Recetas, Insumos) y «Equipo» (Personal, Nómina).
- RF-3: MIENTRAS quien usa la app es el dueño, EL SISTEMA mostrará al final la categoría «Administración» (Negocios, Personas).
- RF-4: EL SISTEMA ofrecerá «Cambiar contraseña» y «Salir» en un menú de la cuenta, al pie del menú lateral, con el nombre de quien usa la app.
- RF-5: EL SISTEMA marcará en el menú la opción de la pantalla abierta, también en sus pantallas internas (por ejemplo, el detalle de una requisición marca Requisiciones).

### Barra del teléfono
- RF-6: MIENTRAS la pantalla mide menos de 1024 px de ancho, EL SISTEMA mostrará en la barra de abajo Inicio, Inventario, Requisiciones, Checklists y «Más».
- RF-7: CUANDO se abre «Más», EL SISTEMA mostrará las demás opciones agrupadas con las mismas categorías del menú lateral, y el menú de la cuenta.

### Filtros
- RF-8: EL SISTEMA mostrará los filtros de cada tabla como un selector por tipo (por ejemplo Área, Proveedor, Estado) junto al buscador, cada uno con la opción «Todos».
- RF-9: CUANDO hay filtros elegidos, EL SISTEMA los mostrará como etiquetas con su nombre y una acción para quitar cada uno.
- RF-10: MIENTRAS hay al menos un filtro o una búsqueda, EL SISTEMA ofrecerá «Limpiar», que los quita todos.
- RF-11: EL SISTEMA mostrará cuántos renglones coinciden de cuántos hay («Mostrando 24 de 96»).
- RF-12: EL SISTEMA aplicará los filtros y la búsqueda a todos los renglones de la lista, no solo a los visibles.

### Listas largas
- RF-13: EL SISTEMA mostrará agrupadas Existencias y Datos de compra por área, Productos por proveedor, Personal por puesto y el historial de movimientos de inventario por día.
- RF-14: EL SISTEMA mostrará en el título de cada grupo su nombre y cuántos renglones tiene, con un grupo «Sin área», «Sin proveedor» o «Sin puesto» al final para los que no tienen.
- RF-15: EL SISTEMA permitirá abrir y cerrar cada grupo, y abrir o cerrar todos a la vez.
- RF-16: CUANDO una lista agrupada tiene más de 50 renglones, EL SISTEMA la mostrará con los grupos cerrados; con 50 o menos, abiertos.
- RF-17: MIENTRAS hay una búsqueda o un filtro, EL SISTEMA abrirá los grupos que tengan renglones que coinciden y ocultará los que no.
- RF-18: EL SISTEMA mostrará en páginas de 25 renglones las listas de más de 25 renglones que no se agrupan, con «Anterior», «Siguiente» y «Página N de M».
- RF-19: EL SISTEMA conservará los grupos abiertos o la página al volver a la lista desde un detalle durante la misma sesión del navegador.

### Formularios y espacio
- RF-20: MIENTRAS un renglón de captura (requisición, entrada, salida, traspaso) no se está editando, EL SISTEMA lo mostrará en una sola franja con producto, cantidad con su presentación y, si aplica, proveedor.
- RF-21: CUANDO se toca un renglón de captura, EL SISTEMA abrirá sus campos para editarlo y cerrará el que estaba abierto.
- RF-22: EL SISTEMA mostrará al menos 6 renglones capturados de una requisición sin desplazar la pantalla, en un teléfono de 390 × 844 px, con el teclado cerrado.
- RF-23: EL SISTEMA mostrará el título y la descripción de cada pantalla en un alto de hasta 120 px en escritorio de 1366 × 768 px y de hasta 160 px en un teléfono de 390 px.
- RF-24: EL SISTEMA mostrará el primer renglón de datos sin desplazar la pantalla en Existencias, Productos, Requisiciones, Datos de compra y Personal, en escritorio de 1366 × 768 px.

### Logo de cada negocio
- RF-25: EL SISTEMA permitirá solo al dueño subir el logo de un negocio en Negocios, como imagen PNG, JPG o WEBP de hasta 2 MB.
- RF-26: SI el archivo no es PNG, JPG o WEBP, o pasa de 2 MB, ENTONCES EL SISTEMA lo rechazará e indicará los tipos y el tamaño permitidos.
- RF-27: EL SISTEMA permitirá al dueño cambiar el logo por otro y quitarlo.
- RF-28: EL SISTEMA mostrará el logo completo, sin recortarlo, dentro de un cuadro del tamaño de cada lugar.
- RF-29: EL SISTEMA mostrará el logo del negocio en el menú junto a «Trabajando en», en «Elegir sucursal», en Negocios y en las filas por negocio del tablero.
- RF-30: MIENTRAS un negocio no tiene logo, EL SISTEMA mostrará en esos lugares la inicial de su nombre sobre su color.
- RF-31: EL SISTEMA mostrará el logo del negocio en el encabezado de la hoja de pago de nómina.
- RF-32: EL SISTEMA pondrá el logo del negocio en el encabezado de los Excel que exporta de un solo negocio (semana de nómina y tablero de un negocio).
- RF-33: EL SISTEMA servirá el logo solo a quien tenga acceso a ese negocio.
- RF-34: EL SISTEMA registrará quién subió, cambió o quitó un logo y cuándo.

## Requisitos no funcionales
- **Sistema de diseño**: los cambios entran a los componentes de la spec 002 (menú, tabla, filtros, grupos, renglón de
  captura, encabezado) y se ven en el catálogo `/sistema`; ninguna pantalla los arma por su cuenta.
- **Accesibilidad**: los grupos plegables, el menú de la cuenta y los selectores de filtro se usan con teclado y
  lector de pantalla; el barrido con axe en claro y oscuro sigue sin violaciones.
- **Volumen**: Existencias con 1,000 productos agrupados abre y filtra en menos de 1 segundo en escritorio.
- **Teléfono**: nada provoca desplazamiento horizontal desde 360 px.
- **Datos**: subir un logo no cambia ningún otro dato del negocio; la migración conserva todo lo existente.

## Casos límite
- Un negocio con una sola sucursal y sin logo: se ve su inicial en su color, como hoy el color.
- Un logo muy ancho o muy alto: se ve completo, reducido para caber, sin deformarse.
- Un logo con fondo transparente en modo oscuro: se muestra sobre un fondo claro para que se lea.
- Un filtro que deja una lista agrupada vacía: se ve «Ningún renglón coincide» con «Limpiar».
- Una lista con un solo grupo: se muestra sin título de grupo.
- Un administrador abre «Más»: no ve «Administración».
- Se cambia el logo con un Excel ya descargado: el archivo descargado no cambia; los siguientes llevan el nuevo.

## Fuera de alcance
- Cambiar la paleta, la tipografía o el logo de SuMando, y el icono de la app instalada.
- Rediseñar la pantalla de Inicio (queda para otra spec si se pide).
- Que cada usuario elija qué opciones ve en el menú o en la barra del teléfono.
- Logo por sucursal; recortar o editar la imagen dentro de SuMando.
- Paginación o grupos en tablas que hoy tienen 25 renglones o menos.
- Maquetas nuevas en Pencil (la herramienta está bloqueada por el límite del plan); se revisa con capturas.

## Criterios de finalización
- Todos los RF con al menos un test en verde (`validation.md` 34 de 34).
- E2E de escritorio de la spec en verde y el barrido en claro y oscuro con axe sin violaciones. Los teléfonos los
  prueba el dueño.
- Capturas antes y después de Inicio, Existencias, Datos de compra, Nueva requisición y Negocios, en escritorio y en
  teléfono, revisadas con el dueño.
- `docs/reglas-de-negocio.md` y `docs/roadmap.md` actualizados.

## Dudas abiertas
Ninguna. Resueltas con el dueño el 17 de noviembre de 2026: menú por área de trabajo con «Administración» solo para
el dueño; barra del teléfono con Inicio, Inventario, Requisiciones y Checklists; filtros en selectores con etiquetas
quitables; listas largas agrupadas y plegables (las que no tienen grupo, por páginas); logo en pantalla y en
documentos; además, formularios por renglones más compactos y menos espacio vacío.
