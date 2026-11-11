# Constitución — Mando

**Aprobada por el dueño el 11 de noviembre de 2026.**

Principios innegociables. Toda spec, plan y tarea debe cumplirlos.

1. **Stack único**: Next.js + TypeScript como PWA instalable, PostgreSQL con Drizzle, en Docker sobre VPS propio con Coolify. Toda dependencia nueva se justifica antes en el plan de la spec.
2. **La spec manda**: nada se construye sin RF en una spec aprobada; cualquier cambio de comportamiento entra primero por la spec.
3. **El servidor decide, el cliente captura y muestra**: existencias, cálculos de nómina y estados de una requisición se calculan y validan en el servidor, dentro de una transacción.
4. **Lógica separada de interfaz**: reglas puras en `domain/`, casos de uso en `services/` con puertos inyectables (reloj, almacenamiento, correo); los handlers traducen HTTP y la UI solo muestra.
5. **Tests como puerta**: cada RF tiene al menos un test (Vitest o Playwright) nombrado `test_sNNN_rfN_*`; ninguna tarea cierra con la suite en rojo; cada spec cierra con sus E2E.
6. **Cada negocio, su información**: todo registro pertenece a un negocio; ninguna consulta mezcla negocios salvo los reportes consolidados que una spec autorice; el aislamiento tiene tests.
7. **Permisos por persona y por negocio**: una persona puede tener un rol distinto en cada negocio; el servidor comprueba el permiso en cada operación, nunca la interfaz.
8. **Nada se borra, todo se audita**: los movimientos de inventario, nómina y requisiciones se cancelan o corrigen con un movimiento nuevo; quién, cuándo y qué queda registrado.
9. **Datos personales protegidos**: datos de empleados y salarios solo visibles por rol; esquema solo por migración; respaldos cifrados con restauración probada.
10. **Móvil primero, con sistema de diseño**: toda pantalla funciona en un teléfono; la interfaz se arma solo con componentes del sistema de diseño.
11. **Idioma**: código e identificadores en inglés; interfaz, documentación y specs en español; ningún texto de la interfaz escrito suelto en un componente.
