# Spec 001 — Esqueleto, cuentas y negocios

## Contexto y objetivo
Mando va a concentrar la administración de varios negocios que operan las mismas personas: hoy Pastatti, con dos
sucursales, y Pirrus, con una. Antes de construir catálogo, inventarios, requisiciones, personal o nómina hace
falta la base en la que todo eso se apoya: quién entra, con qué rol, a qué negocio y sucursal, y que eso ya esté
publicado en una dirección de pruebas, instalable en el teléfono y con comprobaciones automáticas en cada cambio.
Esta spec es ese esqueleto andante: pocas pantallas, pero de punta a punta y probadas, para que cada spec
siguiente solo agregue funciones sobre una base que ya funciona.

## Usuarios / actores
- **Dueño**: entra a todos los negocios y sucursales, incluidos los que se creen después. Crea negocios y
  sucursales, da de alta personas, asigna roles y sucursales, y restablece contraseñas.
- **Administrador**: entra solo a las sucursales que el dueño le asignó, de uno o varios negocios. En esta spec
  solo elige la sucursal en la que trabaja y gestiona su propia contraseña; lo que puede hacer en cada módulo lo
  define la spec de ese módulo.
- **Persona sin cuenta**: solo ve la pantalla de entrada o, si aún no existe ninguna cuenta, la de primer arranque.
  Los empleados de piso no entran a Mando.

## Historias de usuario
- H1: Como dueño quiero crear mi cuenta la primera vez que abro Mando para empezar a configurar sin ayuda técnica.
- H2: Como dueño quiero dar de alta mis negocios y sus sucursales para que cada cosa quede en su lugar.
- H3: Como dueño quiero dar de alta a un administrador, elegir sus sucursales y pasarle una contraseña temporal
  por WhatsApp, para que entre sin depender de correos.
- H4: Como administrador quiero entrar con mi correo y contraseña y elegir en qué sucursal trabajo, para ver solo
  lo que me toca.
- H5: Como administrador quiero instalar Mando en mi teléfono para abrirlo como cualquier aplicación.
- H6: Como dueño quiero quitarle el acceso a alguien sin perder lo que registró, para que el historial siga
  completo.
- H7: Como dueño quiero que Mando esté publicado en una dirección de pruebas para probar cada avance desde mi
  teléfono.

## Requisitos funcionales (criterios de aceptación en EARS)

### Primer arranque
- RF-1: MIENTRAS no exista ninguna cuenta, EL SISTEMA mostrará en la dirección de inicio la pantalla «Crear la cuenta del dueño» y no ofrecerá iniciar sesión.
- RF-2: CUANDO se envía esa pantalla con nombre, correo y contraseña válidos, EL SISTEMA creará la cuenta con el rol de dueño e iniciará su sesión.
- RF-3: SI ya existe alguna cuenta, ENTONCES EL SISTEMA rechazará cualquier intento de crear la cuenta inicial, aunque la petición llegue sin pasar por la pantalla.

### Inicio y cierre de sesión
- RF-4: CUANDO una persona introduce el correo y la contraseña de una cuenta activa, EL SISTEMA iniciará su sesión y la llevará a elegir sucursal (RF-32) o a la pantalla de inicio (RF-41).
- RF-5: SI el correo no existe, la contraseña no coincide o la cuenta está desactivada, ENTONCES EL SISTEMA rechazará la entrada con un único mensaje que no distinga cuál de los tres fue el motivo.
- RF-6: SI una cuenta acumula 5 intentos fallidos seguidos, ENTONCES EL SISTEMA rechazará los intentos siguientes durante 15 minutos, aunque la contraseña sea correcta, e indicará cuánto falta.
- RF-7: EL SISTEMA mantendrá la sesión en el dispositivo hasta 30 días desde el último uso y, pasado ese tiempo, pedirá entrar de nuevo.
- RF-8: CUANDO el usuario cierra sesión, EL SISTEMA terminará la sesión de ese dispositivo sin afectar las de otros dispositivos.
- RF-9: EL SISTEMA comparará el correo ignorando mayúsculas y espacios exteriores, tanto al entrar como al dar de alta.

### Contraseñas
- RF-10: SI una contraseña nueva tiene menos de 8 caracteres, ENTONCES EL SISTEMA la rechazará e indicará el mínimo.
- RF-11: CUANDO el dueño da de alta a una persona o le restablece la contraseña, EL SISTEMA generará una contraseña temporal de 10 caracteres sin caracteres ambiguos (0 y O, 1 y l) y la mostrará al dueño una sola vez.
- RF-12: MIENTRAS una cuenta tenga contraseña temporal, EL SISTEMA solo permitirá a esa persona la pantalla de cambio de contraseña y rechazará cualquier otra acción hasta que la cambie.
- RF-13: CUANDO la persona sustituye la contraseña temporal por una propia válida, EL SISTEMA la dará por definitiva y permitirá el resto de la aplicación.
- RF-14: CUANDO el dueño restablece la contraseña de una persona, EL SISTEMA cerrará todas las sesiones abiertas de esa persona y exigirá el cambio en su siguiente entrada.
- RF-15: EL SISTEMA permitirá a cualquier usuario con sesión cambiar su contraseña indicando la actual y la nueva.
- RF-16: SI la contraseña actual no coincide al cambiarla, ENTONCES EL SISTEMA la rechazará sin cambiar nada.

### Negocios y sucursales
- RF-17: EL SISTEMA permitirá al dueño crear un negocio indicando su nombre y el nombre de su primera sucursal, de modo que todo negocio tenga al menos una sucursal.
- RF-18: EL SISTEMA permitirá al dueño añadir sucursales a un negocio y renombrar negocios y sucursales.
- RF-19: SI el nombre de un negocio ya existe, o el de una sucursal ya existe dentro del mismo negocio (comparación ignorando mayúsculas y espacios exteriores), ENTONCES EL SISTEMA no creará el duplicado e informará del conflicto.
- RF-20: SI un nombre de negocio, sucursal o persona queda vacío o pasa de 60 caracteres, ENTONCES EL SISTEMA lo rechazará e indicará el límite.
- RF-21: CUANDO el dueño archiva una sucursal o un negocio, EL SISTEMA dejará de ofrecerlo para trabajar y conservará toda su información; archivar un negocio archiva sus sucursales.
- RF-22: EL SISTEMA permitirá al dueño reactivar un negocio o una sucursal archivada.

### Personas y accesos
- RF-23: EL SISTEMA permitirá al dueño dar de alta personas con nombre, correo y rol (dueño o administrador), generando su contraseña temporal (RF-11).
- RF-24: SI el correo ya pertenece a otra cuenta, activa o desactivada, ENTONCES EL SISTEMA rechazará el alta e informará del conflicto.
- RF-25: CUANDO el dueño asigna a un administrador una o varias sucursales, de uno o varios negocios, EL SISTEMA le dará acceso exactamente a esas sucursales a partir de la siguiente acción que realice.
- RF-26: EL SISTEMA dará a toda cuenta con rol de dueño acceso a todos los negocios y sucursales, incluidos los creados después, sin asignación.
- RF-27: EL SISTEMA permitirá al dueño cambiar el rol y las sucursales de una persona en cualquier momento.
- RF-28: CUANDO el dueño desactiva a una persona, EL SISTEMA cerrará sus sesiones, rechazará su entrada (RF-5) y conservará su nombre en todo lo que haya registrado.
- RF-29: CUANDO el dueño reactiva a una persona, EL SISTEMA le generará una contraseña temporal nueva (RF-11) y mantendrá el rol y las sucursales que tenía.
- RF-30: SI una acción dejaría al sistema sin ningún dueño activo (desactivarse o cambiarse el rol siendo el único dueño), ENTONCES EL SISTEMA la rechazará e informará del motivo.
- RF-31: SI un administrador intenta crear, cambiar, archivar o reactivar negocios, sucursales o personas, ENTONCES EL SISTEMA lo rechazará por falta de permiso, también cuando la petición llega sin pasar por la interfaz.

### Sucursal activa
- RF-32: CUANDO entra un usuario con acceso a más de una sucursal y sin sucursal recordada (RF-34), EL SISTEMA le pedirá elegir la sucursal activa, mostrándolas agrupadas por negocio.
- RF-33: CUANDO el usuario tiene acceso a exactamente una sucursal, EL SISTEMA la activará sin preguntar.
- RF-34: EL SISTEMA recordará la última sucursal activa de cada usuario y la activará al volver a entrar mientras conserve acceso a ella.
- RF-35: EL SISTEMA mostrará en toda pantalla el negocio y la sucursal activa y permitirá cambiarla desde ahí en no más de dos toques.
- RF-36: SI el usuario pierde el acceso a su sucursal activa (por reasignación o archivo), ENTONCES EL SISTEMA le pedirá elegir otra en su siguiente acción y no mostrará nada de la anterior.
- RF-37: SI un usuario pide información o acciones de una sucursal a la que no tiene acceso, aunque sea por dirección directa, ENTONCES EL SISTEMA lo rechazará sin revelar si esa sucursal existe.
- RF-38: MIENTRAS un administrador no tenga ninguna sucursal activa asignada, EL SISTEMA le mostrará un aviso de que el dueño debe asignarle una y no le dejará operar.

### Instalación y pantalla de inicio
- RF-39: EL SISTEMA se podrá instalar como aplicación en teléfonos Android e iOS y en escritorio, con el nombre y el icono de Mando, y abrirá a pantalla completa sin la barra del navegador.
- RF-40: SI el dispositivo no tiene conexión al abrir la aplicación instalada, ENTONCES EL SISTEMA mostrará un aviso propio de «sin conexión» con opción de reintentar, en lugar del error del navegador.
- RF-41: CUANDO hay sucursal activa, EL SISTEMA mostrará una pantalla de inicio con el nombre del usuario, el negocio y la sucursal activa, y accesos a cambiar de sucursal, cambiar contraseña y cerrar sesión; al dueño le mostrará además Negocios y Personas.

### Registro de cambios
- RF-42: EL SISTEMA registrará, para cada alta, cambio, archivo, reactivación, desactivación y restablecimiento de contraseña, quién lo hizo, cuándo y el valor anterior.

## Requisitos no funcionales
- **Idioma**: toda la interfaz en español; ningún texto suelto dentro de un componente (constitución, principio 11).
- **Móvil primero**: cada pantalla funciona en un teléfono de 360 px de ancho sin desplazamiento horizontal, y
  también en escritorio.
- **Seguridad**: las contraseñas se guardan de forma que no puedan recuperarse; la sesión solo viaja cifrada
  (HTTPS); ninguna respuesta revela si un correo existe.
- **Aislamiento**: un test de integración demuestra que un administrador no ve ni opera sucursales no asignadas
  (constitución, principio 6).
- **Nada se borra**: negocios, sucursales y personas se archivan o desactivan; cada cambio queda con autor y fecha
  (constitución, principio 8).
- **Publicación**: la versión de pruebas queda publicada en una dirección HTTPS del VPS propio (provisional mientras no haya dominio) y se actualiza sola
  desde la rama `pruebas`. Antes de poder entrar en `pruebas`, cada cambio pasa una revisión automática: estilo de
  código, tipos, tests unitarios y de integración, y E2E de escritorio.
- **Barrido de pantallas**: un recorrido automático de todas las pantallas en escritorio, tableta y móvil sin
  errores de consola, desbordes, imágenes rotas ni controles sin nombre.

## Casos límite
- Correo con mayúsculas o espacios al entrar o al dar de alta: se normaliza y coincide con la cuenta.
- El único dueño activo intenta desactivarse o volverse administrador: se rechaza (RF-30).
- Administrador dado de alta sin sucursales: entra, cambia su contraseña y ve el aviso de RF-38.
- Se archiva una sucursal que es la activa de alguien con sesión abierta: en su siguiente acción elige otra
  (RF-36); si no le queda ninguna, ve el aviso de RF-38.
- Dos negocios con una sucursal del mismo nombre («Centro» en Pastatti y en Pirrus): permitido, la unicidad es
  dentro del negocio.
- Nombre con espacios exteriores o solo espacios: se recortan; si queda vacío, se rechaza (RF-20).
- Al dueño se le pierde la contraseña temporal que vio una sola vez: la restablece de nuevo (RF-11, RF-14).
- Se reactiva a una persona cuyas sucursales fueron archivadas mientras tanto: conserva la asignación, pero solo
  ve las sucursales activas; si no queda ninguna, aviso de RF-38.
- Un dueño reasigna a un administrador mientras este tiene sesión abierta: aplica en la siguiente acción, sin
  cerrarle la sesión (RF-25).
- Cinco intentos fallidos y luego la contraseña correcta dentro del bloqueo: sigue rechazada hasta cumplir los
  15 minutos (RF-6).

## Fuera de alcance
- Envío de correos: invitaciones, recuperación de contraseña por enlace y avisos. Las contraseñas temporales se
  comparten por WhatsApp o en persona.
- Acceso de empleados de piso, PIN, checador y cualquier dispositivo compartido en el local.
- Registro por cuenta propia: nadie se registra solo salvo la primera cuenta del dueño.
- Inicio de sesión con Google u otros proveedores, y verificación en dos pasos.
- Catálogo, inventarios, requisiciones, personal, nómina, checklists y reportes (specs 003 a 009).
- Captura sin conexión: la aplicación instalada solo avisa de que no hay conexión.
- El catálogo de componentes y las maquetas en Pencil (spec 002): la 001 usa un conjunto mínimo de componentes
  propios, sin estilos sueltos por pantalla, que la 002 formaliza y amplía.
- La app de producción, los respaldos y el monitoreo (spec 010): la 001 solo publica la versión de pruebas.
- Pantalla para consultar el registro de cambios (RF-42 solo lo guarda).
- Foto de perfil, idioma inglés y preferencias personales.

## Criterios de finalización
- Todos los RF con al menos un test en verde y `validation.md` con veredicto «spec cumplida».
- E2E principal: primer arranque crea al dueño → el dueño crea Pastatti con dos sucursales y Pirrus con una → da
  de alta a un administrador con una sucursal y recibe su contraseña temporal → el administrador entra, cambia la
  contraseña obligatoriamente y cae directo en su única sucursal → el dueño le añade otra sucursal y el
  administrador la elige al cambiar → el dueño lo desactiva y el administrador deja de poder entrar → el dueño
  cambia de sucursal desde la pantalla de inicio en dos toques.
- Barrido de pantallas en verde en escritorio, tableta y móvil.
- Versión de pruebas publicada en el VPS con HTTPS (dirección provisional), instalada en el teléfono del dueño como aplicación, con el
  recorrido anterior hecho a mano por el dueño.

## Dudas abiertas
- Ninguna que bloquee. Decisiones de la entrevista (11 de noviembre de 2026): solo administrativos entran, con
  correo y contraseña, sin PIN ni checador; dos roles, dueño y administrador, y puede haber más de un dueño
  (RF-23 y RF-30); negocios con sucursales (Pastatti con dos, Pirrus con una); el administrador se asigna por
  sucursal y el dueño ve todo; las cuentas las crea el dueño con contraseña temporal que comparte por WhatsApp y
  la persona cambia al entrar; la primera cuenta del dueño se crea desde una pantalla que solo existe mientras no
  haya cuentas; valores confirmados: sesión de 30 días sin uso, bloqueo de 15 minutos tras 5 intentos, contraseña
  mínima de 8 caracteres, temporal de 10, nombres de hasta 60.
- **Dominio**: todavía no hay. La versión de pruebas se publica en una dirección provisional con HTTPS que da el
  servidor; cuando exista el dominio se cambia en el servidor sin tocar la aplicación.
- **Spec aprobada por el dueño el 11 de noviembre de 2026** («por mientras»: cualquier ajuste entra como cambio a
  esta spec antes de tocar código).
