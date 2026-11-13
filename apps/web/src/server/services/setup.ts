// Primer arranque (RF-1 a RF-3): la pantalla de crear al dueño solo existe mientras no haya ninguna cuenta.
import { AppError } from "../errors";
import { recordAudit } from "./audit";
import { assertPasswordPolicy, startSession, type LoginResult, type SessionMeta } from "./auth";
import type { Ctx } from "./context";
import { publicUser } from "./users-public";
import { assertValidEmail, assertValidName } from "./validation";

// Cerrojo de aviso del primer arranque: dos peticiones simultáneas no crean dos dueños.
const SETUP_LOCK = 1001;

export async function isSetupNeeded(ctx: Ctx): Promise<boolean> {
  return (await ctx.store.users.count()) === 0;
}

export async function createFirstOwner(ctx: Ctx, input: { name: string; email: string; password: string }, meta: SessionMeta = {}): Promise<LoginResult> {
  const name = assertValidName(input.name);
  const email = assertValidEmail(input.email);
  assertPasswordPolicy(input.password);
  const passwordHash = await ctx.ports.hasher.hash(input.password);
  const now = ctx.ports.clock.now();
  const user = await ctx.store.transaction(
    async (repos) => {
      if ((await repos.users.count()) > 0) throw new AppError("setup_done");
      const created = await repos.users.insert({ name, email, passwordHash, role: "owner", createdAt: now });
      await recordAudit(repos.audit, now, { actorId: created.id, action: "user.created", entityType: "user", entityId: created.id, after: publicUser(created) });
      return created;
    },
    { lock: SETUP_LOCK },
  );
  return startSession(ctx, user, meta);
}
