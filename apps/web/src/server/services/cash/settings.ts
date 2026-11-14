// Configuración del corte de caja por sucursal (spec 011, RF-4, RF-6 a RF-10): cortes por día, formas de pago y si
// el teléfono de piso hace cortes. Efectivo existe siempre; las demás formas se guardan completas en su orden.
import type { CashSettings, PaymentMethod } from "@/db/schema";
import { isOwner } from "@/domain/access/owner";
import { METHOD_NAME_MAX } from "@/domain/cash/calc";
import { catalogKey } from "@/domain/catalog/names";
import { normalizeName } from "@/domain/text";
import { es } from "@/i18n";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { recordAudit } from "../audit";
import { businessLock, catalogAccess, withDuplicateGuard, type CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { uuidOrNotFound } from "../inventory/shared";

export interface CashSettingsView {
  mode: "daily" | "multiple";
  floorEnabled: boolean;
  methods: { id: string; name: string; isCash: boolean }[];
  canEdit: boolean;
}

export const DEFAULT_MODE = "daily" as const;

/** RF-7: la primera lectura crea Efectivo para la sucursal (con el cerrojo de la sucursal, sin duplicar). */
export async function branchMethods(repos: Repos, businessId: string, branchId: string, now: Date): Promise<PaymentMethod[]> {
  const list = await repos.cash.methods.listByBranch(branchId);
  if (list.some((m) => m.isCash)) return list;
  const name = es.cash.cashMethod;
  await repos.cash.methods.insert({ businessId, branchId, name, nameKey: catalogKey(name), isCash: true, sort: 0, at: now });
  return repos.cash.methods.listByBranch(branchId);
}

export async function branchSettings(repos: Repos, branchId: string): Promise<Pick<CashSettings, "mode" | "floorEnabled">> {
  const s = await repos.cash.settings.find(branchId);
  return s ?? { mode: DEFAULT_MODE, floorEnabled: false };
}

const view = (s: Pick<CashSettings, "mode" | "floorEnabled">, methods: PaymentMethod[], canEdit: boolean): CashSettingsView => ({
  mode: s.mode,
  floorEnabled: s.floorEnabled,
  methods: methods.filter((m) => !m.archivedAt).map((m) => ({ id: m.id, name: m.name, isCash: m.isCash })),
  canEdit,
});

export async function cashSettingsView(ctx: Ctx, scope: CatalogScope): Promise<CashSettingsView> {
  await catalogAccess(ctx.store, scope);
  const branchId = scope.active.branch.id;
  const methods = await ctx.store.transaction((repos) => branchMethods(repos, scope.active.business.id, branchId, ctx.ports.clock.now()), { lock: businessLock(`cash:${branchId}`) });
  return view(await branchSettings(ctx.store, branchId), methods, isOwner(scope.actor));
}

export interface SettingsInput {
  mode: unknown;
  floorEnabled: unknown;
  methods: unknown;
}

/** RF-4, RF-6, RF-8 a RF-10: solo el dueño. */
export async function saveCashSettings(ctx: Ctx, scope: CatalogScope, input: SettingsInput): Promise<CashSettingsView> {
  if (!isOwner(scope.actor)) throw new AppError("owner_only");
  await catalogAccess(ctx.store, scope);
  if (input.mode !== "daily" && input.mode !== "multiple") throw new AppError("validation");
  if (!Array.isArray(input.methods)) throw new AppError("validation");
  const mode = input.mode;
  const floorEnabled = input.floorEnabled === true;
  const wanted = input.methods.map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const name = normalizeName(typeof r.name === "string" ? r.name : "");
    if (!name || name.length > METHOD_NAME_MAX) throw new AppError("name_invalid", { max: METHOD_NAME_MAX });
    return { id: r.id === undefined || r.id === null || r.id === "" ? null : uuidOrNotFound(r.id), name, nameKey: catalogKey(name) };
  });
  const branchId = scope.active.branch.id;
  const businessId = scope.active.business.id;
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(
      async (repos) => {
        const before = view(await branchSettings(repos, branchId), await branchMethods(repos, businessId, branchId, now), true);
        const existing = await repos.cash.methods.listByBranch(branchId);
        const cash = existing.find((m) => m.isCash)!;
        if (wanted.some((w) => w.nameKey === cash.nameKey)) throw new AppError("duplicate_name");
        const kept = new Set<string>([cash.id]);
        // Primero se archiva lo que sale, así un nombre se puede reutilizar en la misma guardada.
        for (const m of existing) if (!m.isCash && !m.archivedAt && !wanted.some((w) => w.id === m.id)) await repos.cash.methods.update(m.id, { archivedAt: now, updatedAt: now });
        for (const [i, w] of wanted.entries()) {
          if (w.id) {
            const m = existing.find((x) => x.id === w.id && !x.isCash);
            if (!m) throw new AppError("not_found");
            await repos.cash.methods.update(m.id, { name: w.name, nameKey: w.nameKey, sort: i + 1, archivedAt: null, updatedAt: now });
            kept.add(m.id);
          } else kept.add((await repos.cash.methods.insert({ businessId, branchId, name: w.name, nameKey: w.nameKey, isCash: false, sort: i + 1, at: now })).id);
        }
        await repos.cash.settings.upsert({ businessId, branchId, mode, floorEnabled, at: now });
        const after = view({ mode, floorEnabled }, await repos.cash.methods.listByBranch(branchId), true);
        await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "cash_settings.updated", entityType: "cash_settings", entityId: branchId, businessId, branchId, before, after });
        return after;
      },
      { lock: businessLock(`cash:${branchId}`) },
    ),
  );
}
