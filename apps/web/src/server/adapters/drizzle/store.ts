// Implementación con Drizzle de los repositorios (`server/ports/repos.ts`).
import { and, count, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { auditLog, sessions, users } from "@/db/schema";
import type { Db, DbOrTx } from "@/db/client";
import type { AuditRepo, Repos, SessionsRepo, Store, UsersRepo } from "@/server/ports/repos";

function usersRepo(db: DbOrTx): UsersRepo {
  return {
    count: async () => Number((await db.select({ n: count() }).from(users))[0].n),
    findByEmail: async (email) => (await db.select().from(users).where(eq(users.email, email)).limit(1))[0] ?? null,
    findById: async (id) => (await db.select().from(users).where(eq(users.id, id)).limit(1))[0] ?? null,
    list: () => db.select().from(users).orderBy(users.name),
    insert: async (data) => (await db.insert(users).values({ ...data, updatedAt: data.createdAt }).returning())[0],
    update: async (id, patch) => (await db.update(users).set(patch).where(eq(users.id, id)).returning())[0],
    countActiveOwners: async (excludeId) => {
      const where = excludeId ? and(eq(users.role, "owner"), eq(users.isActive, true), ne(users.id, excludeId)) : and(eq(users.role, "owner"), eq(users.isActive, true));
      return Number((await db.select({ n: count() }).from(users).where(where))[0].n);
    },
  };
}

function sessionsRepo(db: DbOrTx): SessionsRepo {
  return {
    insert: async (data) => (await db.insert(sessions).values(data).returning())[0],
    findByTokenHash: async (tokenHash) => (await db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).limit(1))[0] ?? null,
    findById: async (id) => (await db.select().from(sessions).where(eq(sessions.id, id)).limit(1))[0] ?? null,
    update: async (id, patch) => (await db.update(sessions).set(patch).where(eq(sessions.id, id)).returning())[0],
    revokeAllForUser: async (userId, at) =>
      (await db.update(sessions).set({ revokedAt: at }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt))).returning({ id: sessions.id })).length,
  };
}

function auditRepo(db: DbOrTx): AuditRepo {
  return {
    insert: async (entry) => {
      await db.insert(auditLog).values({ ...entry, before: entry.before ?? null, after: entry.after ?? null });
    },
  };
}

export function makeRepos(db: DbOrTx): Repos {
  return { users: usersRepo(db), sessions: sessionsRepo(db), audit: auditRepo(db) };
}

export function drizzleStore(db: Db): Store {
  return {
    ...makeRepos(db),
    transaction: (fn, opts) =>
      db.transaction(async (tx) => {
        if (opts?.lock !== undefined) await tx.execute(sql`select pg_advisory_xact_lock(${opts.lock})`);
        return fn(makeRepos(tx));
      }),
  };
}

/** Últimas entradas del registro de cambios de una entidad (para tests y, más adelante, pantallas). */
export async function auditEntriesFor(db: DbOrTx, entityType: string, entityId: string) {
  return db.select().from(auditLog).where(and(eq(auditLog.entityType, entityType), eq(auditLog.entityId, entityId))).orderBy(desc(auditLog.id));
}
