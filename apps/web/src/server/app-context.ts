// El contexto real de la aplicación: repositorios con Drizzle y adaptadores del sistema. Los tests construyen el suyo.
import { db } from "@/db/client";
import { ports } from "./adapters";
import { drizzleStore } from "./adapters/drizzle/store";
import type { Ctx } from "./services/context";

let ctx: Ctx | undefined;

export function appCtx(): Ctx {
  return (ctx ??= { store: drizzleStore(db), ports });
}
