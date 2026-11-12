// Implementación con Drizzle de los repositorios (`server/ports/repos.ts`).
import { and, count, desc, eq, inArray, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { auditLog, branches, businesses, memberships, sessions, users } from "@/db/schema";
import type { Db, DbOrTx } from "@/db/client";
import { catalogRepo } from "./catalog";
import { recipesRepo } from "./recipes";
import type { AuditRepo, BranchesRepo, BusinessesRepo, MembershipsRepo, Repos, SessionsRepo, Store, UsersRepo } from "@/server/ports/repos";

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

function businessesRepo(db: DbOrTx): BusinessesRepo {
  return {
    list: () => db.select().from(businesses).orderBy(businesses.name),
    findById: async (id) => (await db.select().from(businesses).where(eq(businesses.id, id)).limit(1))[0] ?? null,
    findByNameKey: async (nameKey) => (await db.select().from(businesses).where(eq(businesses.nameKey, nameKey)).limit(1))[0] ?? null,
    insert: async (data) => (await db.insert(businesses).values({ ...data, updatedAt: data.createdAt }).returning())[0],
    update: async (id, patch) => (await db.update(businesses).set(patch).where(eq(businesses.id, id)).returning())[0],
  };
}

function branchesRepo(db: DbOrTx): BranchesRepo {
  return {
    listAll: () => db.select().from(branches).orderBy(branches.name),
    listByBusiness: (businessId) => db.select().from(branches).where(eq(branches.businessId, businessId)).orderBy(branches.name),
    findById: async (id) => (await db.select().from(branches).where(eq(branches.id, id)).limit(1))[0] ?? null,
    findByNameKey: async (businessId, nameKey) => (await db.select().from(branches).where(and(eq(branches.businessId, businessId), eq(branches.nameKey, nameKey))).limit(1))[0] ?? null,
    insert: async (data) => (await db.insert(branches).values({ ...data, updatedAt: data.createdAt }).returning())[0],
    update: async (id, patch) => (await db.update(branches).set(patch).where(eq(branches.id, id)).returning())[0],
    archiveByBusiness: (businessId, at) => db.update(branches).set({ archivedAt: at, updatedAt: at }).where(and(eq(branches.businessId, businessId), isNull(branches.archivedAt))).returning(),
    reactivateByBusiness: (businessId, at) => db.update(branches).set({ archivedAt: null, updatedAt: at }).where(and(eq(branches.businessId, businessId), isNotNull(branches.archivedAt))).returning(),
  };
}

function membershipsRepo(db: DbOrTx): MembershipsRepo {
  return {
    listAll: () => db.select().from(memberships),
    listByUser: (userId) => db.select().from(memberships).where(eq(memberships.userId, userId)),
    replaceForUser: async (userId, branchIds, meta) => {
      const current = (await db.select().from(memberships).where(eq(memberships.userId, userId))).map((m) => m.branchId);
      const wanted = [...new Set(branchIds)];
      const removed = current.filter((id) => !wanted.includes(id));
      const added = wanted.filter((id) => !current.includes(id));
      if (removed.length) await db.delete(memberships).where(and(eq(memberships.userId, userId), inArray(memberships.branchId, removed)));
      if (added.length) await db.insert(memberships).values(added.map((branchId) => ({ userId, branchId, role: "admin" as const, createdBy: meta.createdBy, createdAt: meta.createdAt })));
      return { added, removed };
    },
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
  return { users: usersRepo(db), sessions: sessionsRepo(db), businesses: businessesRepo(db), branches: branchesRepo(db), memberships: membershipsRepo(db), audit: auditRepo(db), catalog: catalogRepo(db), recipes: recipesRepo(db) };
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
