// Al arrancar el servidor con MIGRATE_ON_START=1 (la imagen de Docker), aplica las migraciones pendientes antes de
// atender peticiones: así la aplicación y la base de datos van siempre juntas. Si falla, el servidor no arranca.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.MIGRATE_ON_START !== "1") return;
  const [{ drizzle }, { migrate }, { default: postgres }, path] = await Promise.all([
    import("drizzle-orm/postgres-js"),
    import("drizzle-orm/postgres-js/migrator"),
    import("postgres"),
    import("node:path"),
  ]);
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para migrar al arrancar");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder: process.env.MIGRATIONS_DIR ?? path.resolve(process.cwd(), "drizzle") });
    console.log("Migraciones al día");
  } finally {
    await sql.end();
  }
}
