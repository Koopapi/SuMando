# Spec 010 — Checklists

**Aprobada por el dueño el 13 de noviembre de 2026.**

## Contexto y objetivo
Cada sucursal abre y cierra con una hoja impresa: por sección (exterior, salón, barras, cocina, caja…) se revisan
puntos como el gas, el agua, las terminales, el fondo de caja o los candados. La hoja se llena a mano, se pierde y
nadie sabe después quién revisó qué ni a qué hora. Esta spec da a SuMando checklists por negocio: plantillas con
secciones y puntos, la hoja del día de cada sucursal que se llena en el teléfono, puntos clave que no se pueden
saltar, fotos como evidencia y el historial de cada día. Como los empleados de piso no tienen cuenta, un
administrador habilita un **teléfono de piso** de la sucursal donde cada empleado elige su nombre y palomea, y ese
teléfono no puede abrir nada más de SuMando.

## Usuarios / actores
- **Dueño**: arma las plantillas de todos los negocios, llena y cierra hojas, y habilita o deshabilita teléfonos de
  piso en cualquier sucursal.
- **Administrador**: arma las plantillas de los negocios donde tiene sucursal, llena y cierra las hojas de sus
  sucursales y habilita o deshabilita sus teléfonos de piso.
- **Empleado de piso** (sin cuenta): en el teléfono de piso elige su nombre y llena las secciones.

## Historias de usuario
- H1: Como dueño quiero armar las plantillas de apertura, cierre y otras, con secciones, puntos clave y en qué
  sucursales y días aplican.
- H2: Como administrador quiero dejar un teléfono en la sucursal para que el personal llene su sección sin tener
  cuenta.
- H3: Como empleado quiero elegir mi nombre, ver mis secciones primero y palomear rápido lo que está en orden.
- H4: Como dueño quiero que los puntos clave se revisen uno por uno y que algunos pidan foto.
- H5: Como administrador quiero cerrar la hoja del día aunque falte algo, dejando a la vista qué faltó.
- H6: Como dueño quiero ver en el historial quién hizo cada sección, a qué hora y qué quedó pendiente.

## Requisitos funcionales (criterios de aceptación en EARS)

### Pertenencia y permisos
- RF-1: EL SISTEMA guardará cada plantilla como parte de un solo negocio.
- RF-2: EL SISTEMA permitirá al dueño y a los administradores con alguna sucursal en el negocio dar de alta, modificar, archivar y reactivar sus plantillas.
- RF-3: EL SISTEMA permitirá al dueño y a los administradores de la sucursal llenar, cerrar y reabrir las hojas de esa sucursal.
- RF-4: MIENTRAS hay una sucursal activa, EL SISTEMA mostrará solo las hojas de esa sucursal.
- RF-5: SI alguien pide una plantilla, una hoja o una foto de un negocio o sucursal a los que no tiene acceso, aunque sea por dirección directa, ENTONCES EL SISTEMA lo rechazará sin revelar si existe.

### Plantillas
- RF-6: EL SISTEMA permitirá dar de alta una plantilla con nombre (hasta 80 caracteres), las sucursales del negocio en que aplica y los días de la semana en que aplica.
- RF-7: SI una plantilla no tiene al menos una sucursal y un día, ENTONCES EL SISTEMA la rechazará.
- RF-8: SI el nombre de una plantilla ya existe entre las activas del negocio (ignorando mayúsculas, acentos y espacios exteriores), ENTONCES EL SISTEMA no creará el duplicado e informará del conflicto.
- RF-9: EL SISTEMA permitirá agregar a una plantilla secciones con nombre (hasta 80 caracteres) y, de forma opcional, el puesto responsable, elegido de los puestos del negocio.
- RF-10: EL SISTEMA permitirá agregar a cada sección puntos con texto (hasta 200 caracteres) y uno de tres tipos: palomita, palomita con foto o comentario.
- RF-11: EL SISTEMA permitirá marcar un punto de palomita o de palomita con foto como clave.
- RF-12: EL SISTEMA permitirá cambiar el orden de las secciones y de los puntos.
- RF-13: CUANDO se archiva una sección o un punto, EL SISTEMA dejará de incluirlo en las hojas nuevas y lo conservará en las hojas que ya lo tienen.
- RF-14: CUANDO se cambia una plantilla, EL SISTEMA aplicará el cambio solo a las hojas que se abran después.

### Hoja del día
- RF-15: EL SISTEMA tendrá una hoja por plantilla, sucursal y fecha, con las secciones y puntos activos de la plantilla al abrirla.
- RF-16: EL SISTEMA mostrará en la sucursal las plantillas que aplican en la fecha de hoy, con el avance de su hoja.
- RF-17: CUANDO alguien marca el primer punto de una plantilla en una fecha, EL SISTEMA abrirá la hoja de ese día.
- RF-18: EL SISTEMA usará la fecha de la Ciudad de México para decidir el día de una hoja.
- RF-19: EL SISTEMA mostrará primero las secciones cuyo puesto responsable es el del empleado que llena, y después las demás.

### Llenar una sección
- RF-20: CUANDO se palomea un punto, EL SISTEMA guardará quién lo hizo y la hora del servidor.
- RF-21: EL SISTEMA permitirá quitar una palomita mientras la sección no esté lista.
- RF-22: SI se intenta palomear un punto de palomita con foto sin una foto, ENTONCES EL SISTEMA lo rechazará e indicará que falta la foto.
- RF-23: EL SISTEMA aceptará como foto un archivo JPG, PNG, HEIC o WEBP de hasta 10 MB, decidido por su contenido.
- RF-24: EL SISTEMA permitirá escribir en un punto de comentario un texto de hasta 500 caracteres.
- RF-25: CUANDO se pide «Todo en orden» en una sección, EL SISTEMA palomeará los puntos de palomita que no son clave y que aún no están palomeados.
- RF-26: EL SISTEMA no palomeará con «Todo en orden» los puntos clave ni los de palomita con foto.
- RF-27: CUANDO se pide «Sección lista», EL SISTEMA marcará la sección como lista con quién y la hora del servidor.
- RF-28: SI se pide «Sección lista» con algún punto clave sin palomear, ENTONCES EL SISTEMA lo rechazará e indicará cuántos faltan.
- RF-29: MIENTRAS una sección está lista, EL SISTEMA rechazará cambios en sus puntos.
- RF-30: EL SISTEMA permitirá al dueño y a los administradores de la sucursal reabrir una sección lista.

### Cerrar la hoja
- RF-31: CUANDO la última sección de la hoja queda lista, EL SISTEMA cerrará la hoja.
- RF-32: EL SISTEMA permitirá al dueño y a los administradores de la sucursal cerrar una hoja con secciones o puntos pendientes.
- RF-33: CUANDO se cierra una hoja con pendientes, EL SISTEMA guardará quién la cerró y qué secciones y puntos clave quedaron pendientes.
- RF-34: MIENTRAS una hoja está cerrada, EL SISTEMA rechazará cambios en ella, aunque sea por dirección directa.
- RF-35: CUANDO se reabre una sección de una hoja cerrada, EL SISTEMA reabrirá también la hoja.
- RF-36: SI la hoja de un día anterior sigue abierta, ENTONCES EL SISTEMA no permitirá palomear en ella y solo permitirá cerrarla.

### Teléfono de piso
- RF-37: EL SISTEMA permitirá al dueño y a los administradores de la sucursal habilitar un teléfono de piso con un nombre (hasta 40 caracteres) desde ese mismo teléfono.
- RF-38: MIENTRAS un teléfono de piso está habilitado, EL SISTEMA le permitirá solo ver y llenar las hojas de hoy de su sucursal.
- RF-39: SI un teléfono de piso pide cualquier otra pantalla o dato de SuMando, ENTONCES EL SISTEMA lo rechazará.
- RF-40: EL SISTEMA pedirá en el teléfono de piso que el empleado elija su nombre de los empleados activos de la sucursal antes de palomear.
- RF-41: CUANDO un empleado palomea, comenta, sube una foto o da por lista una sección en el teléfono de piso, EL SISTEMA guardará su nombre y el del teléfono.
- RF-42: EL SISTEMA mantendrá habilitado un teléfono de piso hasta que el dueño o un administrador de la sucursal lo deshabilite.
- RF-43: EL SISTEMA mostrará a quienes pueden habilitarlos los teléfonos de piso de la sucursal con su nombre, quién lo habilitó y su último uso.
- RF-44: CUANDO se deshabilita un teléfono de piso, EL SISTEMA rechazará desde ese momento cualquier petición suya.
- RF-45: EL SISTEMA no ofrecerá cerrar ni reabrir hojas, ni reabrir secciones, en el teléfono de piso.

### Historial y registro
- RF-46: EL SISTEMA mostrará las hojas de la sucursal de la más reciente a la más antigua, con su plantilla, fecha, estado y número de pendientes.
- RF-47: EL SISTEMA mostrará en cada hoja quién hizo cada sección, a qué hora, cada punto con quién y cuándo, los comentarios y las fotos.
- RF-48: EL SISTEMA mostrará las fotos solo al dueño, a los administradores de la sucursal y, mientras la hoja está abierta, al teléfono de piso de la sucursal.
- RF-49: EL SISTEMA registrará cada cambio de plantillas, cada cierre y reapertura y cada alta y baja de teléfonos de piso con quién, cuándo y el valor anterior.

## Requisitos no funcionales
- **Permisos en el servidor** (constitución, principio 7): el teléfono de piso es una sesión aparte, ligada a una
  sucursal, que el servidor limita a las hojas de hoy; tests de integración prueban que no abre ninguna otra ruta.
- **Aislamiento**: tests de integración demuestran que nada de una sucursal o negocio aparece desde otro.
- **Nada se borra**: plantillas, secciones y puntos se archivan; las hojas guardan lo que tenían (principio 8).
- **Fotos**: se guardan con el mismo almacenamiento de archivos de la spec 008, fuera del directorio público, con
  nombre que no revela a nadie, y entran en los respaldos (spec 013).
- **Volumen**: una hoja de 15 secciones y 150 puntos abre en menos de 2 segundos y una palomita se guarda en menos
  de 300 ms en escritorio.
- **Sistema de diseño**: pantallas con componentes de la spec 002, desde 360 px; palomear es un toque de 44 px; la
  foto se toma con la cámara del teléfono.

## Casos límite
- Una plantilla solo de viernes a domingo: entre semana no aparece en la sucursal.
- Una plantilla que no aplica en una sucursal: esa sucursal no la ve.
- Se edita la plantilla con la hoja de hoy a medias: la hoja de hoy sigue igual; el cambio sale mañana.
- Dos teléfonos llenan secciones distintas de la misma hoja a la vez: ambas se guardan.
- Dos personas palomean el mismo punto: queda la última, con su nombre y hora.
- Se da por lista una sección sin puntos clave y con puntos sin palomear: se permite; los no palomeados quedan como
  pendientes de esa sección.
- Una sección sin puesto responsable: aparece con «otras secciones» para todos.
- Un empleado se da de baja: deja de aparecer en la lista del teléfono de piso; lo que palomeó conserva su nombre.
- A las 23:59 queda la hoja abierta: al día siguiente sale una hoja nueva; la de ayer solo se puede cerrar.
- Se pierde el teléfono de piso: se deshabilita y deja de funcionar de inmediato.
- Un punto de foto con una foto mal tomada: mientras la sección no esté lista, se reemplaza la foto.

## Fuera de alcance
- Cuentas, PIN o checador para empleados; el teléfono de piso no identifica con contraseña a quien elige su nombre.
- Que el teléfono de piso use cualquier otra parte de SuMando (inventario, conteos, nómina…).
- Llenar sin conexión: el teléfono necesita internet.
- Avisos o notificaciones cuando una hoja queda con pendientes (spec 012).
- Valores numéricos en los puntos (temperaturas, fondo de caja): se escriben como comentario.
- Plantillas compartidas entre negocios o copiar una plantilla a otro negocio.
- Cierre automático a medianoche.

## Criterios de finalización
- Todos los RF con al menos un test en verde (`validation.md` 49 de 49).
- E2E de escritorio de la spec en verde, con el barrido en claro y oscuro con axe. Los teléfonos los prueba el dueño.
- Recorrido manual: el dueño arma una plantilla con un punto clave y uno con foto; un administrador habilita un
  teléfono de piso; un empleado elige su nombre, palomea, toma la foto y da por lista su sección; el administrador
  cierra la hoja con pendientes y la ve en el historial.
- `docs/reglas-de-negocio.md` actualizado.

## Dudas abiertas
Ninguna. Resueltas en la entrevista (13 de noviembre de 2026): llenan los administradores y un teléfono de piso
habilitado por un administrador, donde el empleado elige su nombre sin contraseña; las plantillas son del negocio,
varias, cada una con sus sucursales y días; los puntos pueden pedir foto; un administrador puede cerrar la hoja con
pendientes; el teléfono de piso queda habilitado hasta que lo deshabiliten.
