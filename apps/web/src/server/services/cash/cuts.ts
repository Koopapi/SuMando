// Cortes de caja (spec 011, RF-1 a RF-5, RF-11 a RF-42). El servidor calcula todo; la vista del teléfono de piso es
// ciega: nunca lleva el reporte del punto de venta, lo esperado, las diferencias ni las ventas (RF-32).
import type { CashCut, CashCutMethod, CashMovement } from "@/db/schema";
import { isOwner } from "@/domain/access/owner";
import { cleanPieces, CONCEPT_MAX, cutFigures, MOVEMENT_KINDS, NOTE_MAX, piecesTotal, sumMovements, type MovementKind } from "@/domain/cash/calc";
import { writtenReason } from "@/domain/inventory/movement";
import { todayInMexico } from "@/domain/personnel/documents";
import { parseMoney } from "@/domain/requisitions/money";
import { normalizeName } from "@/domain/text";
import { es } from "@/i18n";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { recordAudit } from "../audit";
import { businessLock, catalogAccess } from "../catalog/shared";
import { actorBranch, actorBusiness, signature, type ChecklistActor } from "../checklists/actor";
import type { Ctx } from "../context";
import { uuidOrNotFound } from "../inventory/shared";
import { moneyText } from "../payroll/weeks";
import { branchMethods, branchSettings } from "./settings";

const t = es.cash;

export interface CutMethodView {
  id: string;
  name: string;
  isCash: boolean;
  counted: string | null;
  /** Solo para personas. */
  pos?: string | null;
  difference?: string | null;
}

export interface CutMovementView {
  id: string;
  kind: MovementKind;
  concept: string;
  amount: string;
  at: string;
  by: string;
  cancelled: boolean;
  cancelReason: string | null;
}

export interface CutView {
  id: string;
  date: string;
  status: "open" | "counted" | "closed";
  openedAt: string;
  openedBy: string;
  fund: string;
  pieces: Record<string, number> | null;
  cashCounted: string | null;
  countedAt: string | null;
  countedBy: string | null;
  methods: CutMethodView[];
  movements: CutMovementView[];
  totals: { expenses: string; withdrawals: string; incomes: string };
  /** Solo para personas, con el reporte capturado (RF-24 a RF-29). */
  figures?: { cashExpected: string; posTotal: string; salesBefore: string; salesAfter: string; expenses: string; totalDifference: string } | null;
  posCaptured?: boolean;
  closedAt: string | null;
  closedBy: string | null;
  note: string | null;
  blind: boolean;
  canReopen: boolean;
}

export interface CutSummaryView {
  id: string;
  date: string;
  openedAt: string;
  status: CutView["status"];
  posTotal: string | null;
  salesBefore: string | null;
  totalDifference: string | null;
}

const lock = (branchId: string) => businessLock(`cash:${branchId}`);

async function access(ctx: Ctx, actor: ChecklistActor) {
  if (actor.kind === "user") {
    await catalogAccess(ctx.store, actor.scope);
    return;
  }
  // RF-33: el teléfono solo hace cortes si la sucursal lo permite.
  if (!(await branchSettings(ctx.store, actor.branch.id)).floorEnabled) throw new AppError("floor_not_allowed");
}

const userOnly = (actor: ChecklistActor) => {
  if (actor.kind !== "user") throw new AppError("forbidden");
  return actor;
};

function money(raw: unknown, positive = false): bigint {
  const cents = parseMoney(raw === undefined || raw === null ? "" : String(raw));
  if (cents === undefined || cents === null || (positive && cents <= 0n)) throw new AppError("invalid_amount");
  return cents;
}

async function load(repos: Repos, cut: CashCut) {
  const [methods, movements] = await Promise.all([repos.cash.cutMethods.listByCuts([cut.id]), repos.cash.movements.listByCuts([cut.id])]);
  return { cut, methods, movements };
}

type Loaded = Awaited<ReturnType<typeof load>>;

function figuresOf(l: Loaded) {
  const m = sumMovements(l.movements.map((x) => ({ kind: x.kind, amountCents: x.amountCents, cancelled: x.cancelledAt !== null })));
  const cashCounted = l.cut.cashPieces ? piecesTotal(l.cut.cashPieces) : null;
  const f = cutFigures(
    l.cut.openingFundCents,
    l.methods.map((x) => ({ isCash: x.isCash, counted: x.isCash ? (cashCounted ?? 0n) : (x.countedCents ?? 0n), pos: x.posCents ?? 0n })),
    m,
  );
  return { m, f, cashCounted };
}

async function viewOf(ctx: Ctx, actor: ChecklistActor, l: Loaded): Promise<CutView> {
  const blind = actor.kind === "device";
  const users = l.cut.closedBy ? await ctx.store.users.list() : [];
  const { m, f, cashCounted } = figuresOf(l);
  const posCaptured = l.cut.posAt !== null;
  const showFigures = !blind && posCaptured;
  return {
    id: l.cut.id,
    date: l.cut.date,
    status: l.cut.status,
    openedAt: l.cut.openedAt.toISOString(),
    openedBy: l.cut.openedBy,
    fund: moneyText(l.cut.openingFundCents),
    pieces: l.cut.cashPieces ?? null,
    cashCounted: cashCounted === null ? null : moneyText(cashCounted),
    countedAt: l.cut.countedAt?.toISOString() ?? null,
    countedBy: l.cut.countedBy,
    methods: l.methods.map((x, i) => {
      const counted = x.isCash ? cashCounted : x.countedCents;
      const base: CutMethodView = { id: x.id, name: x.name, isCash: x.isCash, counted: counted === null ? null : moneyText(counted) };
      if (blind) return base;
      return { ...base, pos: x.posCents === null ? null : moneyText(x.posCents), difference: showFigures ? moneyText(f.differences[i]) : null };
    }),
    movements: l.movements.map((x: CashMovement) => ({ id: x.id, kind: x.kind, concept: x.concept, amount: moneyText(x.amountCents), at: x.createdAt.toISOString(), by: x.createdBy, cancelled: x.cancelledAt !== null, cancelReason: x.cancelReason })),
    totals: { expenses: moneyText(m.expenses), withdrawals: moneyText(m.withdrawals), incomes: moneyText(m.incomes) },
    ...(blind
      ? {}
      : {
          posCaptured,
          figures: showFigures ? { cashExpected: moneyText(f.cashExpected), posTotal: moneyText(f.posTotal), salesBefore: moneyText(f.salesBefore), salesAfter: moneyText(f.salesAfter), expenses: moneyText(f.expenses), totalDifference: moneyText(f.totalDifference) } : null,
        }),
    closedAt: l.cut.closedAt?.toISOString() ?? null,
    closedBy: l.cut.closedBy ? (users.find((u) => u.id === l.cut.closedBy)?.name ?? null) : null,
    note: blind ? null : l.cut.note,
    blind,
    canReopen: actor.kind === "user" && isOwner(actor.scope.actor) && l.cut.status === "closed",
  };
}

async function ownCut(repos: Repos, actor: ChecklistActor, id: unknown): Promise<CashCut> {
  const cut = await repos.cash.cuts.findById(uuidOrNotFound(id));
  if (!cut || cut.branchId !== actorBranch(actor).id) throw new AppError("not_found");
  // El teléfono solo ve el corte abierto (RF-32): nada de cortes anteriores.
  if (actor.kind === "device" && cut.status === "closed") throw new AppError("not_found");
  return cut;
}

const audit = (repos: Repos, now: Date, actor: ChecklistActor, cut: CashCut, action: string, after: unknown, before?: unknown) =>
  recordAudit(repos.audit, now, { actorId: actor.kind === "user" ? actor.scope.actor.id : null, action, entityType: "cash_cut", entityId: cut.id, businessId: cut.businessId, branchId: cut.branchId, before, after: actor.kind === "device" ? { ...(after as object), device: actor.device.name, employee: actor.employee?.name ?? null } : after });

/** El corte abierto (o contado) de la sucursal, o null. */
export async function currentCut(ctx: Ctx, actor: ChecklistActor): Promise<CutView | null> {
  await access(ctx, actor);
  const cut = await ctx.store.cash.cuts.findOpen(actorBranch(actor).id);
  return cut ? viewOf(ctx, actor, await load(ctx.store, cut)) : null;
}

/** RF-11 a RF-14: abrir con fondo; uno a la vez y, en modo diario, uno por fecha. */
export async function openCut(ctx: Ctx, actor: ChecklistActor, rawFund: unknown): Promise<CutView> {
  await access(ctx, actor);
  const fund = money(rawFund);
  const who = signature(actor);
  const branch = actorBranch(actor);
  const business = actorBusiness(actor);
  const now = ctx.ports.clock.now();
  const today = todayInMexico(now);
  const cut = await ctx.store.transaction(
    async (repos) => {
      const open = await repos.cash.cuts.findOpen(branch.id);
      if (open) throw new AppError("cut_open", { date: open.date });
      const settings = await branchSettings(repos, branch.id);
      if (settings.mode === "daily" && (await repos.cash.cuts.listByBranch(branch.id)).some((c) => c.date === today)) throw new AppError("cut_today");
      const methods = (await branchMethods(repos, business.id, branch.id, now)).filter((m) => !m.archivedAt);
      const c = await repos.cash.cuts.insert({ businessId: business.id, branchId: branch.id, date: today, openingFundCents: fund, openedAt: now, openedBy: who.name, openedUserId: who.userId, openedEmployeeId: who.employeeId, openedDeviceId: who.deviceId });
      for (const [sort, m] of methods.entries()) await repos.cash.cutMethods.insert({ cutId: c.id, methodId: m.id, name: m.name, isCash: m.isCash, sort });
      await audit(repos, now, actor, c, "cash_cut.opened", { fund: fund.toString() });
      return c;
    },
    { lock: lock(branch.id) },
  );
  return viewOf(ctx, actor, await load(ctx.store, cut));
}

async function change(ctx: Ctx, actor: ChecklistActor, cutId: unknown, allowed: CashCut["status"][], fn: (repos: Repos, l: Loaded, now: Date) => Promise<void>): Promise<CutView> {
  await access(ctx, actor);
  const now = ctx.ports.clock.now();
  const branch = actorBranch(actor);
  const id = await ctx.store.transaction(
    async (repos) => {
      const cut = await ownCut(repos, actor, cutId);
      if (!allowed.includes(cut.status)) throw new AppError("cut_state", { state: t.statuses[cut.status] });
      await fn(repos, await load(repos, cut), now);
      return cut.id;
    },
    { lock: lock(branch.id) },
  );
  return viewOf(ctx, actor, await load(ctx.store, (await ctx.store.cash.cuts.findById(id))!));
}

/** RF-15, RF-16: gasto, retiro o ingreso de caja. */
export async function addMovement(ctx: Ctx, actor: ChecklistActor, cutId: unknown, input: { kind: unknown; concept: unknown; amount: unknown }): Promise<CutView> {
  if (!MOVEMENT_KINDS.includes(input.kind as MovementKind)) throw new AppError("validation");
  const concept = normalizeName(typeof input.concept === "string" ? input.concept : "");
  if (!concept || concept.length > CONCEPT_MAX) throw new AppError("validation");
  const amount = money(input.amount, true);
  const who = signature(actor);
  return change(ctx, actor, cutId, ["open"], async (repos, l, now) => {
    const mv = await repos.cash.movements.insert({ cutId: l.cut.id, kind: input.kind as MovementKind, concept, amountCents: amount, createdAt: now, createdBy: who.name, userId: who.userId, employeeId: who.employeeId, deviceId: who.deviceId });
    await audit(repos, now, actor, l.cut, "cash_cut.movement", { id: mv.id, kind: mv.kind, concept, amount: amount.toString() });
  });
}

/** RF-17: cancelar con motivo, sin borrar. */
export async function cancelMovement(ctx: Ctx, actor: ChecklistActor, cutId: unknown, movementId: unknown, rawReason: unknown): Promise<CutView> {
  const reason = writtenReason(typeof rawReason === "string" ? rawReason : "");
  if (reason === null) throw new AppError("reason_required");
  const who = signature(actor);
  return change(ctx, actor, cutId, ["open"], async (repos, l, now) => {
    const id = uuidOrNotFound(movementId);
    const mv = l.movements.find((x) => x.id === id);
    if (!mv) throw new AppError("not_found");
    if (mv.cancelledAt) return;
    await repos.cash.movements.update(mv.id, { cancelledAt: now, cancelledBy: who.name, cancelReason: reason });
    await audit(repos, now, actor, l.cut, "cash_cut.movement_cancelled", { id: mv.id, reason }, { concept: mv.concept, amount: mv.amountCents.toString() });
  });
}

function countInput(l: Loaded, rawPieces: unknown, rawAmounts: unknown) {
  const pieces = cleanPieces(rawPieces);
  if (!pieces) throw new AppError("invalid_cash_pieces");
  const amounts = (typeof rawAmounts === "object" && rawAmounts !== null ? rawAmounts : {}) as Record<string, unknown>;
  const counted = new Map<string, bigint | null>();
  for (const x of l.methods.filter((m) => !m.isCash)) {
    const raw = amounts[x.id];
    counted.set(x.id, raw === undefined || raw === null || raw === "" ? null : money(raw));
  }
  return { pieces, counted };
}

async function writeCount(repos: Repos, l: Loaded, c: ReturnType<typeof countInput>, now: Date) {
  await repos.cash.cuts.update(l.cut.id, { cashPieces: c.pieces, updatedAt: now });
  for (const x of l.methods) if (!x.isCash) await repos.cash.cutMethods.update(x.id, { countedCents: c.counted.get(x.id) ?? null });
}

/** RF-18 a RF-21: guardar el conteo como borrador (no se ve nada del punto de venta en el teléfono). */
export async function saveCount(ctx: Ctx, actor: ChecklistActor, cutId: unknown, input: { pieces: unknown; amounts: unknown }): Promise<CutView> {
  signature(actor);
  return change(ctx, actor, cutId, ["open"], async (repos, l, now) => writeCount(repos, l, countInput(l, input.pieces, input.amounts), now));
}

/** RF-22: entregar el conteo; desde ahí no cambian el conteo ni los movimientos. */
export async function deliverCount(ctx: Ctx, actor: ChecklistActor, cutId: unknown, input: { pieces: unknown; amounts: unknown }): Promise<CutView> {
  const who = signature(actor);
  return change(ctx, actor, cutId, ["open"], async (repos, l, now) => {
    const c = countInput(l, input.pieces, input.amounts);
    const missing = l.methods.find((x) => !x.isCash && c.counted.get(x.id) === null);
    if (missing) throw new AppError("cut_incomplete", { missing: t.missingMethod(missing.name) });
    await writeCount(repos, l, c, now);
    await repos.cash.cuts.update(l.cut.id, { status: "counted", countedAt: now, countedBy: who.name, countedUserId: who.userId, countedEmployeeId: who.employeeId, countedDeviceId: who.deviceId, updatedAt: now });
    await audit(repos, now, actor, l.cut, "cash_cut.counted", { cash: piecesTotal(c.pieces).toString(), methods: Object.fromEntries([...c.counted].map(([k, v]) => [k, v?.toString() ?? null])) });
  });
}

/** RF-23: el reporte del punto de venta en cada forma de pago (solo personas). */
export async function capturePos(ctx: Ctx, actor: ChecklistActor, cutId: unknown, rawAmounts: unknown): Promise<CutView> {
  const a = userOnly(actor);
  const amounts = (typeof rawAmounts === "object" && rawAmounts !== null ? rawAmounts : {}) as Record<string, unknown>;
  return change(ctx, actor, cutId, ["open", "counted"], async (repos, l, now) => {
    const parsed = l.methods.map((x) => ({ x, pos: money(amounts[x.id]) }));
    const before = Object.fromEntries(l.methods.map((x) => [x.name, x.posCents?.toString() ?? null]));
    for (const p of parsed) await repos.cash.cutMethods.update(p.x.id, { posCents: p.pos });
    await repos.cash.cuts.update(l.cut.id, { posAt: now, posBy: a.scope.actor.id, updatedAt: now });
    await audit(repos, now, actor, l.cut, "cash_cut.pos", Object.fromEntries(parsed.map((p) => [p.x.name, p.pos.toString()])), before);
  });
}

/** RF-34 a RF-36: cerrar con el conteo entregado y el reporte capturado; guarda lo que mostraba. */
export async function closeCut(ctx: Ctx, actor: ChecklistActor, cutId: unknown, rawNote: unknown): Promise<CutView> {
  const a = userOnly(actor);
  const note = (typeof rawNote === "string" ? rawNote : "").trim();
  if (note.length > NOTE_MAX) throw new AppError("validation");
  return change(ctx, actor, cutId, ["open", "counted"], async (repos, l, now) => {
    if (l.cut.status !== "counted") throw new AppError("cut_incomplete", { missing: t.missingCount });
    if (!l.cut.posAt) throw new AppError("cut_incomplete", { missing: t.missingPos });
    const snapshot = await viewOf(ctx, actor, l);
    await repos.cash.cuts.update(l.cut.id, { status: "closed", closedAt: now, closedBy: a.scope.actor.id, note: note || null, snapshot, updatedAt: now });
    await audit(repos, now, actor, l.cut, "cash_cut.closed", { figures: snapshot.figures, note: note || null });
  });
}

/** RF-38, RF-39: solo el dueño reabre, con motivo; queda contado. */
export async function reopenCut(ctx: Ctx, actor: ChecklistActor, cutId: unknown, rawReason: unknown): Promise<CutView> {
  const a = userOnly(actor);
  if (!isOwner(a.scope.actor)) throw new AppError("owner_only");
  const reason = writtenReason(typeof rawReason === "string" ? rawReason : "");
  if (reason === null) throw new AppError("reason_required");
  return change(ctx, actor, cutId, ["closed"], async (repos, l, now) => {
    const open = await repos.cash.cuts.findOpen(l.cut.branchId);
    if (open) throw new AppError("cut_open", { date: open.date });
    await repos.cash.cuts.update(l.cut.id, { status: "counted", closedAt: null, closedBy: null, snapshot: null, updatedAt: now });
    await audit(repos, now, actor, l.cut, "cash_cut.reopened", { reason }, { status: "closed" });
  });
}

/** RF-40: cortes de la sucursal, del más reciente al más antiguo (solo personas). */
export async function cutHistory(ctx: Ctx, actor: ChecklistActor): Promise<CutSummaryView[]> {
  userOnly(actor);
  await access(ctx, actor);
  const cuts = await ctx.store.cash.cuts.listByBranch(actorBranch(actor).id);
  const ids = cuts.map((c) => c.id);
  const [methods, movements] = await Promise.all([ctx.store.cash.cutMethods.listByCuts(ids), ctx.store.cash.movements.listByCuts(ids)]);
  return cuts.map((cut) => {
    const l = { cut, methods: methods.filter((m: CashCutMethod) => m.cutId === cut.id), movements: movements.filter((m) => m.cutId === cut.id) };
    const { f } = figuresOf(l);
    const counted = cut.cashPieces !== null;
    return {
      id: cut.id,
      date: cut.date,
      openedAt: cut.openedAt.toISOString(),
      status: cut.status,
      posTotal: cut.posAt ? moneyText(f.posTotal) : null,
      salesBefore: counted ? moneyText(f.salesBefore) : null,
      totalDifference: cut.posAt && counted ? moneyText(f.totalDifference) : null,
    };
  });
}

/** RF-41: el detalle de un corte (solo personas). */
export async function cutDetail(ctx: Ctx, actor: ChecklistActor, cutId: unknown): Promise<CutView> {
  userOnly(actor);
  await access(ctx, actor);
  return viewOf(ctx, actor, await load(ctx.store, await ownCut(ctx.store, actor, cutId)));
}
