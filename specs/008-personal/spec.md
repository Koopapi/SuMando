# Spec 008 — Personal

**Borrador para aprobación del dueño (13 de noviembre de 2026).**

## Contexto y objetivo
Cada negocio pide a quien contrata 13 documentos (acta de nacimiento, CURP, INE, comprobante de domicilio, constancia
fiscal, NSS, constancias laborales, mapa y fotos del domicilio, CV, comprobante de estudios, estado de cuenta y
contactos de emergencia), y el sueldo por día lo decide el dueño persona por persona. Hoy eso vive en carpetas y en la
hoja de nómina: no se sabe de un vistazo a quién le falta qué ni qué documento venció, y los datos sensibles circulan
sin control. Esta spec da a SuMando el expediente de cada empleado por sucursal, con sus documentos en foto o PDF,
su puesto, su sueldo por día visible solo para el dueño, y sus altas, bajas y cambios de sucursal. Es la base de la
nómina (spec 009). Los empleados no usan SuMando: no tienen cuenta.

## Usuarios / actores
- **Dueño**: ve y cambia todo, incluidos el sueldo y el contenido de los documentos.
- **Administrador**: da de alta, edita y da de baja a los empleados de sus sucursales, y sube sus documentos; no ve
  el sueldo ni puede abrir los documentos.

## Historias de usuario
- H1: Como administrador quiero dar de alta a quien entra y subir sus documentos con la cámara del teléfono.
- H2: Como dueño quiero ver a quién le falta algún documento o tiene uno vencido.
- H3: Como dueño quiero fijar el sueldo por día de cada persona sin que lo vean los administradores.
- H4: Como dueño quiero dar de baja con motivo y, si alguien regresa, reactivar su mismo expediente.
- H5: Como dueño quiero ajustar la lista de documentos que pide cada negocio.
- H6: Como dueño quiero saber quién abrió o cambió un expediente.

## Requisitos funcionales (criterios de aceptación en EARS)

### Pertenencia y permisos
- RF-1: EL SISTEMA guardará a cada empleado como parte de una sola sucursal de un negocio.
- RF-2: MIENTRAS hay una sucursal activa, EL SISTEMA mostrará solo los empleados de esa sucursal.
- RF-3: EL SISTEMA permitirá al dueño y a los administradores de la sucursal dar de alta, editar, dar de baja y reactivar a sus empleados, y subir sus documentos.
- RF-4: EL SISTEMA mostrará y permitirá cambiar el sueldo por día solo al dueño.
- RF-5: EL SISTEMA permitirá abrir o descargar un documento solo al dueño.
- RF-6: SI alguien pide un empleado, un documento o un archivo de una sucursal a la que no tiene acceso, aunque sea por dirección directa, ENTONCES EL SISTEMA lo rechazará sin revelar si existe.
- RF-7: SI un administrador pide el sueldo o el contenido de un documento por dirección directa, ENTONCES EL SISTEMA lo rechazará por falta de permiso.
- RF-8: EL SISTEMA no dará a los empleados una cuenta para entrar.

### Expediente
- RF-9: EL SISTEMA permitirá dar de alta un empleado con nombre (hasta 80 caracteres), puesto y fecha de ingreso, y de forma opcional teléfono (hasta 30) y notas (hasta 500).
- RF-10: EL SISTEMA ofrecerá como puesto uno de la lista de puestos del negocio.
- RF-11: EL SISTEMA permitirá al dueño y a los administradores con sucursal en el negocio dar de alta, renombrar, archivar y reactivar puestos, sin nombres repetidos entre los activos (comparando como la spec 003, RF-31).
- RF-12: SI ya hay un empleado activo con el mismo nombre en la sucursal, ENTONCES EL SISTEMA avisará antes de guardar y permitirá continuar.
- RF-13: EL SISTEMA permitirá al dueño fijar y cambiar el sueldo por día de cada empleado, en pesos con hasta 2 decimales y mayor que cero.
- RF-14: MIENTRAS un empleado no tiene sueldo por día, EL SISTEMA lo marcará «sin sueldo» para el dueño.
- RF-15: EL SISTEMA permitirá editar los datos del expediente, salvo la fecha de ingreso de un periodo ya cerrado por una baja.

### Documentos
- RF-16: EL SISTEMA dará a cada negocio, la primera vez que se use Personal, una lista de documentos con los 13 de la hoja actual, en su orden, con vigencia de 3 meses para el comprobante de domicilio y de 12 meses para la constancia de situación fiscal.
- RF-17: EL SISTEMA permitirá al dueño añadir, renombrar, reordenar, archivar y reactivar los documentos de la lista, y marcar cada uno como obligatorio u opcional, con vigencia en meses o sin vigencia.
- RF-18: EL SISTEMA permitirá subir a un documento de un empleado uno o varios archivos JPG, PNG, HEIC, WEBP o PDF de hasta 10 MB cada uno, también tomando la foto con la cámara del teléfono.
- RF-19: CUANDO se sube un documento con vigencia, EL SISTEMA pedirá la fecha de expedición, proponiendo la fecha del día.
- RF-20: SI un archivo no es de un tipo aceptado o pasa de 10 MB, ENTONCES EL SISTEMA lo rechazará e indicará el tipo y el tamaño permitidos.
- RF-21: EL SISTEMA mostrará cada documento del empleado como entregado, falta o vencido.
- RF-22: EL SISTEMA marcará vencido un documento cuya fecha de expedición más su vigencia sea anterior a la fecha del día.
- RF-23: EL SISTEMA mostrará en cada empleado cuántos documentos obligatorios tiene entregados y vigentes de cuántos.
- RF-24: EL SISTEMA permitirá reemplazar los archivos de un documento, conservando los anteriores en su historial, visible solo para el dueño.
- RF-25: EL SISTEMA permitirá al dueño retirar un archivo con un motivo escrito, que deja de contar como entregado y queda en el historial.
- RF-26: EL SISTEMA no ofrecerá borrar documentos ni archivos.
- RF-27: EL SISTEMA servirá los archivos solo a través de SuMando con la sesión del dueño, nunca por una dirección pública.

### Altas, bajas y cambios
- RF-28: EL SISTEMA permitirá dar de baja a un empleado activo con fecha y un motivo de la lista: renuncia, despido, abandono de trabajo, fin de temporada u otro.
- RF-29: SI el motivo de baja es «otro», ENTONCES EL SISTEMA pedirá una nota de 3 a 200 caracteres.
- RF-30: SI la fecha de baja es anterior a la fecha de ingreso del periodo actual, ENTONCES EL SISTEMA la rechazará.
- RF-31: MIENTRAS un empleado está dado de baja, EL SISTEMA lo mostrará solo en la lista de bajas y no lo ofrecerá para la nómina.
- RF-32: EL SISTEMA permitirá reactivar a un empleado dado de baja con una nueva fecha de ingreso, conservando su expediente, sus documentos y su sueldo anterior.
- RF-33: EL SISTEMA guardará cada periodo de trabajo del empleado con su fecha de ingreso, su fecha de baja y su motivo, y los mostrará en el expediente.
- RF-34: EL SISTEMA permitirá cambiar a un empleado activo a otra sucursal del mismo negocio a la que tenga acceso quien hace el cambio, con fecha.
- RF-35: CUANDO un empleado cambia de sucursal, EL SISTEMA lo registrará en su historial y lo mostrará desde entonces en la nueva sucursal.

### Consulta
- RF-36: EL SISTEMA mostrará los empleados de la sucursal en una tabla con nombre, puesto, fecha de ingreso, teléfono y estado de documentos, con el sueldo como columna adicional solo para el dueño.
- RF-37: EL SISTEMA permitirá buscar por nombre, ignorando mayúsculas y acentos, y filtrar por puesto, activos o bajas, y documentos incompletos o vencidos.
- RF-38: EL SISTEMA mostrará en el inicio cuántos empleados activos hay en la sucursal y cuántos tienen documentos faltantes o vencidos.
- RF-39: EL SISTEMA mostrará Personal en el menú lateral y en «Más» del teléfono.

### Registro
- RF-40: EL SISTEMA registrará cada alta, cambio, baja, reactivación, cambio de sucursal, cambio de sueldo y subida, reemplazo o retiro de archivos con quién, cuándo y el valor anterior.
- RF-41: EL SISTEMA registrará cada vez que el dueño abre o descarga un archivo, con quién y cuándo.
- RF-42: EL SISTEMA mostrará al dueño el registro de cada expediente.

## Requisitos no funcionales
- **Datos personales protegidos** (constitución, principio 9): sueldos y documentos solo para el dueño, comprobado en
  el servidor; los archivos se guardan fuera del directorio público, con nombre que no revela a la persona, y entran
  en los respaldos (spec 013).
- **Aislamiento**: tests de integración demuestran que una sucursal no ve empleados ni archivos de otra, y que un
  administrador no obtiene sueldos ni archivos por ninguna ruta.
- **Nada se borra**: bajas, reemplazos y retiros quedan en el historial (principio 8).
- **Volumen**: con 200 empleados en una sucursal la tabla abre en menos de 2 segundos; una foto de 10 MB se sube en
  menos de 10 segundos en la red local.
- **Sistema de diseño**: pantallas con componentes de la spec 002, desde 360 px; subir documentos con la cámara del
  teléfono.

## Casos límite
- Un empleado sin ningún documento: aparece con 0 de N y en el filtro de incompletos.
- Dos fotos para «Fotos del domicilio» (fachada e interior): dos archivos en el mismo documento.
- Comprobante de domicilio expedido hace 4 meses: vencido; al subir uno nuevo, el anterior queda en el historial.
- Se archiva un documento de la lista: deja de pedirse; los archivos ya subidos se conservan.
- Un documento pasa de opcional a obligatorio: los expedientes que no lo tienen pasan a incompletos.
- Baja el mismo día de ingreso: válida.
- Reingreso: nuevo periodo; los documentos con vigencia pueden estar vencidos y se marcan.
- Cambio de sucursal: el administrador de la sucursal anterior deja de verlo.
- Un administrador pierde la sucursal: deja de ver a sus empleados; el dueño los sigue viendo.
- El mismo nombre en dos sucursales: permitido, son expedientes distintos.

## Fuera de alcance
- Nómina, asistencia, retardos y préstamos (spec 009); checador o PIN.
- Cuentas para empleados o que el empleado suba sus propios documentos.
- Generar contratos, altas al IMSS, firma digital o leer los documentos (OCR).
- Vacaciones, permisos, incapacidades y evaluaciones.
- Datos fiscales o bancarios capturados como campos (van en sus documentos).
- Un empleado en varias sucursales a la vez o compartido entre negocios.

## Criterios de finalización
- Todos los RF con al menos un test en verde (`validation.md` 42 de 42).
- E2E de escritorio de la spec en verde, con el barrido en claro y oscuro con axe. Los teléfonos los prueba el dueño.
- Recorrido manual: alta como administrador con foto desde el teléfono, sueldo fijado por el dueño, documento
  vencido, baja y reingreso.
- `docs/reglas-de-negocio.md` actualizado.

## Dudas abiertas
Ninguna. Resueltas en la entrevista (13 de noviembre de 2026): se guardan los archivos; el administrador ve el
expediente pero no el sueldo ni el contenido de los documentos; el sueldo por día lo pone el dueño en cada persona; el
empleado es de una sucursal y puede cambiar; el reingreso reactiva el mismo expediente; la lista de documentos es
editable por negocio y empieza con los 13.
