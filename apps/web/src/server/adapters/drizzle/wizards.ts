// Implementación con Drizzle de `server/ports/wizards.ts`.
import { and, eq, sql } from "drizzle-orm";
import { wizardDrafts, wizardPreferences } from "@/db/schema";
import type { DbOrTx } from "@/db/client";
import type { DraftKey, WizardsRepo } from "@/server/ports/wizards";

const whereKey = ({ owner, kind, target }: DraftKey) =>
  owner.kind === "user"
    ? and(eq(wizardDrafts.userId, owner.userId), eq(wizardDrafts.branchId, owner.branchId), eq(wizardDrafts.kind, kind), eq(wizardDrafts.target, target))
    : and(eq(wizardDrafts.floorDeviceId, owner.floorDeviceId), eq(wizardDrafts.employeeId, owner.employeeId), eq(wizardDrafts.kind, kind), eq(wizardDrafts.target, target));

export function wizardsRepo(db: DbOrTx): WizardsRepo {
  return {
    drafts: {
      find: async (key) => (await db.select().from(wizardDrafts).where(whereKey(key)).limit(1))[0] ?? null,
      save: async (key, v) => {
        const owner = key.owner.kind === "user" ? { userId: key.owner.userId } : { floorDeviceId: key.owner.floorDeviceId, employeeId: key.owner.employeeId };
        const target = key.owner.kind === "user" ? [wizardDrafts.userId, wizardDrafts.branchId, wizardDrafts.kind, wizardDrafts.target] : [wizardDrafts.floorDeviceId, wizardDrafts.employeeId, wizardDrafts.kind, wizardDrafts.target];
        const where = key.owner.kind === "user" ? sql`${wizardDrafts.userId} is not null` : sql`${wizardDrafts.floorDeviceId} is not null`;
        const rows = await db
          .insert(wizardDrafts)
          .values({ businessId: v.businessId, branchId: v.branchId, kind: key.kind, target: key.target, ...owner, step: v.step, data: v.data, createdAt: v.at, updatedAt: v.at })
          .onConflictDoUpdate({ target, targetWhere: where, set: { step: v.step, data: v.data, updatedAt: v.at } })
          .returning();
        return rows[0];
      },
      remove: async (key) => {
        await db.delete(wizardDrafts).where(whereKey(key));
      },
    },
    preferences: {
      listByUser: (userId) => db.select({ kind: wizardPreferences.kind, view: wizardPreferences.view }).from(wizardPreferences).where(eq(wizardPreferences.userId, userId)),
      set: async (userId, kind, view, at) => {
        await db
          .insert(wizardPreferences)
          .values({ userId, kind, view, updatedAt: at })
          .onConflictDoUpdate({ target: [wizardPreferences.userId, wizardPreferences.kind], set: { view, updatedAt: at } });
      },
    },
  };
}
