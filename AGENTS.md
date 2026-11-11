# AGENTS.md — Mando

## Proyecto
PWA para llevar el control administrativo de varios negocios que operan las mismas personas: nómina, inventarios,
requisiciones y reportes, cada negocio con su información y cada persona con su rol en cada negocio.
Monorepo pnpm: `apps/web` (Next.js + TypeScript + Tailwind), PostgreSQL 16 con Drizzle. Despliegue con Coolify en
el VPS propio.

## Proceso (desarrollo guiado por specs)
1. **Entrevista y spec**: con la skill `spec-generator` (preguntas de una en una, máximo 6), `specs/NNN-nombre/spec.md`
   con requisitos en EARS (RF-1, RF-2…). Se pide aprobación explícita al dueño.
2. **Plan**: `plan.md` con `docs/templates/plan-template.md`, respetando `docs/constitution.md` y `docs/architecture.md`.
3. **Tareas**: `tasks.md` con `docs/templates/tasks-template.md`: tareas de 20 a 30 minutos, con RF, «Depende de» y
   «Hecho cuando», agrupadas en entregas, y su tabla de cobertura.
4. **Implementación** tarea a tarea, con el test antes que el código.
5. **Validación** RF por RF (`scripts/rf-coverage.mjs`, escribe `validation.md`) y E2E de la spec en verde.
6. **Pull request** a `pruebas`; el dueño revisa, prueba y mergea.

## Comandos
Se definen en la spec 001 (esqueleto) y se anotan aquí en la misma tarea. Previstos, desde `apps/web`:
- `pnpm dev`, `pnpm typecheck`, `pnpm lint`
- `pnpm test` (Vitest: `unit` en `src/**/*.test.ts` e `integration` en `tests/integration`, con BD propia que se recrea)
- `pnpm e2e` (Playwright contra la versión compilada, con BD propia que se recrea)
- `pnpm db:generate --name <nombre>` y `pnpm db:migrate`
- `node ../../scripts/rf-coverage.mjs ../../specs/NNN-nombre`

## Estilo y convenciones
- TypeScript estricto. Server Components por defecto; `"use client"` solo donde hay interacción.
- Identificadores en inglés; textos al usuario, documentación y specs en español.
- Capas: `domain/` no importa nada del resto; `services/` solo `domain/` y `ports/`; los handlers de `app/api`
  traducen HTTP y no contienen reglas; `features/` no calcula resultados ni permisos.
- Tests nombrados `test_sNNN_rfN_<qué comprueba>`; cada E2E declara su spec en la primera línea y nombra sus pasos
  con «RF-N».

## Reglas
- Lee `docs/constitution.md`, `docs/architecture.md` y la spec activa en `specs/` antes de tocar código.
- Cualquier cambio de comportamiento entra primero por la spec. No modifiques `specs/` salvo petición explícita.
- Se cierra una spec antes de abrir la siguiente, en el orden de `docs/roadmap.md`.
- No añadas dependencias sin justificarlas antes en el plan de la spec.
- No cambies el esquema de la base de datos fuera de una migración de Drizzle.
- Toda consulta filtra por el negocio activo; todo permiso se comprueba en el servidor.
- Git: `main` estable y `pruebas` para juntar lo nuevo. Cada spec o arreglo en su rama desde `pruebas` y por pull
  request con la CI en verde. Nunca se sube directamente a `main` ni a `pruebas`; solo el dueño mergea.
- Secretos solo en `.env` (fuera de git) y en Coolify. Nunca contraseñas ni tokens en el repositorio ni en el chat.
- Sin nombres de personas reales en textos, specs ni código: usar roles («el dueño», «un encargado»).
- La suite E2E completa satura la Mac: preguntar antes de correrla; en el día a día, escritorio y las E2E afectadas.
- Al terminar una tarea se informa el resultado real de los tests, también lo que falla.

## Al terminar cualquier tarea
- Ejecuta `pnpm test` (y las E2E afectadas si tocaste la interfaz) y confirma en tu respuesta qué pasa y qué no.

## Reglas de negocio
`docs/reglas-de-negocio.md` resume las reglas acordadas, con la spec de origen de cada una. Al aprobar o terminar
una spec, actualízalo en la misma tarea (estado «Aprobada» → «Vigente»). Si choca con una spec, manda la spec.
