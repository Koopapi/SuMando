# Reglas de negocio — Mando

Resumen de todas las reglas acordadas, en un solo sitio. **La fuente de verdad son las specs**: cada regla cita la
suya. Si una regla cambia, se cambia primero la spec y después este documento.

Estado de cada regla: **Vigente** (construida y con tests) o **Aprobada** (en una spec aprobada, pendiente de
construir).

Última actualización: 11 de noviembre de 2026. Spec 001 vigente (42 RF con test en verde).

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

Origen: spec 002 (aprobada el 11 de noviembre de 2026). Estado: **Aprobada**.

- La app se llama **SuMando**, siempre con la S y la M mayúsculas; nunca «Mando» ni «Sumando» en pantalla (RF-1 a RF-3).
- Modo claro u oscuro según el ajuste del teléfono o la computadora, sin selector propio (RF-4 a RF-7).
- Cada negocio tiene un color de una paleta cerrada de 8; solo el dueño lo elige o cambia, y el cambio queda
  registrado. El negocio se identifica siempre por nombre y color, nunca solo por color (RF-8 a RF-15).
- Teléfono para capturar y escritorio para revisar: desde 1024 px de ancho, menú lateral y tablas con todas sus
  columnas; por debajo, menú con un botón y renglones como tarjetas (RF-16 a RF-20).
- Pesos con formato de México y fechas como «11 nov 2026»; aviso de guardado de 4 segundos; un error se queda
  hasta cerrarlo y no se pierde lo capturado (RF-23 a RF-28).

## 3. Catálogo

## 4. Recetario e insumos

## 5. Inventarios

## 6. Requisiciones

## 7. Personal y nómina

## 8. Checklists

## 9. Corte de caja

## 10. Reportes
