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

## 3. Catálogo

## 4. Inventarios

## 5. Requisiciones

## 6. Personal y nómina

## 7. Reportes
