// Entrar, salir, validar la sesión y gestionar contraseñas (RF-4 a RF-16). Reglas puras en `domain/auth`.
import type { User } from "@/db/schema";
import { isLocked, minutesRemaining, registerFailure } from "@/domain/auth/lockout";
import { passwordProblem, PASSWORD_MIN } from "@/domain/auth/password-policy";
import { isSessionExpired, sessionExpiry, shouldTouchSession } from "@/domain/auth/session-policy";
import { generateTemporaryPassword } from "@/domain/auth/temporary-password";
import { normalizeEmail } from "@/domain/text";
import { AppError } from "../errors";
import type { PasswordHasher, Ports, Repos } from "../ports";
import { recordAudit } from "./audit";
import type { Ctx } from "./context";
import { publicUser, type PublicUser } from "./users-public";

export interface SessionMeta {
  userAgent?: string | null;
}

export interface LoginResult {
  user: PublicUser;
  token: string;
  sessionId: string;
  expiresAt: Date;
}

// Para que un correo inexistente tarde lo mismo que una contraseña mala (RF-5), se verifica contra un hash de relleno.
const dummyHashes = new WeakMap<PasswordHasher, Promise<string>>();
function dummyHash(hasher: PasswordHasher) {
  let p = dummyHashes.get(hasher);
  if (!p) {
    p = hasher.hash("mando-relleno-sin-usuario");
    dummyHashes.set(hasher, p);
  }
  return p;
}

export async function login(ctx: Ctx, input: { email: string; password: string }, meta: SessionMeta = {}): Promise<LoginResult> {
  const { clock, hasher } = ctx.ports;
  const now = clock.now();
  const user = await ctx.store.users.findByEmail(normalizeEmail(input.email));
  if (!user) {
    await hasher.verify(await dummyHash(hasher), input.password);
    throw new AppError("invalid_credentials");
  }
  if (isLocked(user.lockedUntil, now)) throw new AppError("account_locked", { minutes: minutesRemaining(user.lockedUntil!, now) });
  const ok = await hasher.verify(user.passwordHash, input.password);
  if (!ok) {
    const next = registerFailure({ failedAttempts: user.failedLoginAttempts, lockedUntil: user.lockedUntil }, now);
    await ctx.store.users.update(user.id, { failedLoginAttempts: next.failedAttempts, lockedUntil: next.lockedUntil, updatedAt: now });
    throw new AppError("invalid_credentials");
  }
  if (!user.isActive) throw new AppError("invalid_credentials");
  if (user.failedLoginAttempts > 0 || user.lockedUntil) await ctx.store.users.update(user.id, { failedLoginAttempts: 0, lockedUntil: null, updatedAt: now });
  return startSession(ctx, user, meta);
}

/** Crea una sesión para una persona ya autenticada (entrada o primer arranque). */
export async function startSession(ctx: Ctx, user: User, meta: SessionMeta = {}): Promise<LoginResult> {
  const now = ctx.ports.clock.now();
  const token = ctx.ports.tokens.generate();
  const expiresAt = sessionExpiry(now);
  const session = await ctx.store.sessions.insert({
    tokenHash: ctx.ports.tokens.hash(token),
    userId: user.id,
    userAgent: meta.userAgent?.slice(0, 200) ?? null,
    createdAt: now,
    lastSeenAt: now,
    expiresAt,
  });
  return { user: publicUser(user), token, sessionId: session.id, expiresAt };
}

export interface Authenticated {
  user: PublicUser;
  sessionId: string;
  activeBranchId: string | null;
}

/** La sesión del token, si sigue viva; desliza su caducidad cuando pasó más de una hora desde el último uso (RF-7). */
export async function authenticate(ctx: Ctx, token: string): Promise<Authenticated | null> {
  const now = ctx.ports.clock.now();
  const session = await ctx.store.sessions.findByTokenHash(ctx.ports.tokens.hash(token));
  if (!session || session.revokedAt || isSessionExpired(session.expiresAt, now)) return null;
  const user = await ctx.store.users.findById(session.userId);
  if (!user || !user.isActive) return null;
  if (shouldTouchSession(session.lastSeenAt, now)) await ctx.store.sessions.update(session.id, { lastSeenAt: now, expiresAt: sessionExpiry(now) });
  return { user: publicUser(user), sessionId: session.id, activeBranchId: session.activeBranchId };
}

/** Cierra solo esta sesión (RF-8). */
export async function logout(ctx: Ctx, sessionId: string): Promise<void> {
  const session = await ctx.store.sessions.findById(sessionId);
  if (session && !session.revokedAt) await ctx.store.sessions.update(sessionId, { revokedAt: ctx.ports.clock.now() });
}

export function assertPasswordPolicy(password: string) {
  if (passwordProblem(password)) throw new AppError("password_too_short", { min: PASSWORD_MIN });
}

/** Cambio de contraseña por la propia persona (RF-13, RF-15, RF-16). */
export async function changePassword(ctx: Ctx, userId: string, input: { currentPassword: string; newPassword: string }): Promise<void> {
  const now = ctx.ports.clock.now();
  const user = await ctx.store.users.findById(userId);
  if (!user || !user.isActive) throw new AppError("unauthorized");
  if (!(await ctx.ports.hasher.verify(user.passwordHash, input.currentPassword))) throw new AppError("password_mismatch");
  assertPasswordPolicy(input.newPassword);
  const passwordHash = await ctx.ports.hasher.hash(input.newPassword);
  await ctx.store.transaction(async (repos) => {
    await repos.users.update(user.id, { passwordHash, mustChangePassword: false, updatedAt: now });
    await recordAudit(repos.audit, now, { actorId: user.id, action: "user.password_changed", entityType: "user", entityId: user.id });
  });
}

/**
 * Contraseña temporal nueva (RF-11, RF-14): se guarda hasheada, exige cambio al entrar y cierra todas las sesiones
 * de la persona. Devuelve el texto una sola vez.
 */
export async function issueTemporaryPassword(repos: Repos, ports: Ports, user: User, actorId: string, action: string): Promise<string> {
  const now = ports.clock.now();
  const temporary = generateTemporaryPassword((max) => ports.random.int(max));
  const passwordHash = await ports.hasher.hash(temporary);
  await repos.users.update(user.id, { passwordHash, mustChangePassword: true, failedLoginAttempts: 0, lockedUntil: null, updatedAt: now });
  await repos.sessions.revokeAllForUser(user.id, now);
  await recordAudit(repos.audit, now, { actorId, action, entityType: "user", entityId: user.id });
  return temporary;
}
