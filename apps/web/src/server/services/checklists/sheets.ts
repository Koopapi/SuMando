// Hojas del día (spec 010, RF-3 a RF-5, RF-15 a RF-36, RF-46 a RF-48). La hoja se abre con la primera marca y copia
// la plantilla; cada marca guarda quién y la hora del servidor; el servidor decide lista, cierre y pendientes.
import type { ChecklistSheet, ChecklistSheetItem, ChecklistSheetSection, ChecklistTemplate } from "@/db/schema";
import { allOkTargets, allReady, keyPending, orderForPosition, pendingAtClose } from "@/domain/checklists/sheet";
import { appliesOn, COMMENT_MAX, type ItemKind } from "@/domain/checklists/template";
import { isDate, todayInMexico } from "@/domain/personnel/documents";
import { FILE_MAX_BYTES, fileKind } from "@/domain/personnel/files";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { recordAudit } from "../audit";
import { businessLock } from "../catalog/shared";
import type { Ctx } from "../context";
import { uuidOrNotFound } from "../inventory/shared";
import { actorBranch, actorBusiness, signature, type ChecklistActor } from "./actor";
import { templatesAccess, templateView } from "./templates";

export interface SheetItemView {
  itemId: string;
  text: string;
  kind: ItemKind;
  isKey: boolean;
  done: boolean;
  comment: string | null;
  photoId: string | null;
  markedAt: string | null;
  markedBy: string | null;
  device: string | null;
}

export interface SheetSectionView {
  sectionId: string;
  name: string;
  position: string | null;
  mine: boolean;
  ready: boolean;
  readyAt: string | null;
  readyBy: string | null;
  readyDevice: string | null;
  keyPending: number;
  done: number;
  total: number;
  items: SheetItemView[];
}

export interface SheetView {
  templateId: string;
  templateName: string;
  date: string;
  today: boolean;
  status: "new" | "open" | "closed";
  editable: boolean;
  closedAt: string | null;
  closedBy: string | null;
  pending: { sectionId: string; name: string; keyItems: string[] }[] | null;
  sections: SheetSectionView[];
}

export interface TodayView {
  templateId: string;
  name: string;
  status: "new" | "open" | "closed";
  sectionsReady: number;
  sections: number;
}

export interface SheetSummaryView {
  templateId: string;
  templateName: string;
  date: string;
  status: "open" | "closed";
  pending: number;
  closedBy: string | null;
}

const dropPosition = <T extends { positionId: string | null }>(s: T): Omit<T, "positionId"> => {
  const out: Partial<T> = { ...s };
  delete out.positionId;
  return out as Omit<T, "positionId">;
};

const todayOf = (ctx: Ctx) => todayInMexico(ctx.ports.clock.now());

async function access(ctx: Ctx, actor: ChecklistActor) {
  if (actor.kind === "user") await templatesAccess(ctx.store, actor.scope);
}

async function templateLinks(repos: Repos, t: ChecklistTemplate) {
  return (await repos.checklists.templateBranches.listByTemplates([t.id])).map((l) => l.branchId);
}

async function businessTemplate(repos: Repos, actor: ChecklistActor, id: unknown): Promise<ChecklistTemplate> {
  const t = await repos.checklists.templates.findById(uuidOrNotFound(id));
  if (!t || t.businessId !== actorBusiness(actor).id) throw new AppError("not_found");
  return t;
}

/** RF-16: plantillas que aplican hoy en la sucursal, con el avance de su hoja. */
export async function todayChecklists(ctx: Ctx, actor: ChecklistActor): Promise<TodayView[]> {
  await access(ctx, actor);
  const branch = actorBranch(actor);
  const today = todayOf(ctx);
  const templates = (await ctx.store.checklists.templates.listByBusiness(actorBusiness(actor).id)).filter((t) => !t.archivedAt);
  const links = await ctx.store.checklists.templateBranches.listByTemplates(templates.map((t) => t.id));
  const applying = templates.filter((t) => appliesOn({ daysMask: t.daysMask, branchIds: links.filter((l) => l.templateId === t.id).map((l) => l.branchId) }, branch.id, today));
  const out: TodayView[] = [];
  for (const t of applying) {
    const sheet = await ctx.store.checklists.sheets.find(t.id, branch.id, today);
    if (sheet) {
      const sections = await ctx.store.checklists.sheetSections.listBySheets([sheet.id]);
      out.push({ templateId: t.id, name: t.name, status: sheet.status, sectionsReady: sections.filter((s) => s.readyAt).length, sections: sections.length });
    } else {
      const view = await templateView(ctx.store, t);
      out.push({ templateId: t.id, name: t.name, status: "new", sectionsReady: 0, sections: view.sections.length });
    }
  }
  return out;
}

interface Loaded {
  template: ChecklistTemplate;
  sheet: ChecklistSheet | null;
  sections: ChecklistSheetSection[];
  items: ChecklistSheetItem[];
}

async function load(repos: Repos, actor: ChecklistActor, templateId: unknown, date: string): Promise<Loaded> {
  const template = await businessTemplate(repos, actor, templateId);
  const sheet = await repos.checklists.sheets.find(template.id, actorBranch(actor).id, date);
  if (!sheet) return { template, sheet: null, sections: [], items: [] };
  const sections = await repos.checklists.sheetSections.listBySheets([sheet.id]);
  const items = await repos.checklists.sheetItems.listBySections(sections.map((s) => s.id));
  return { template, sheet, sections, items };
}

function dateOrInvalid(raw: unknown): string {
  if (!isDate(raw)) throw new AppError("not_found");
  return raw;
}

/** RF-15, RF-19, RF-47: la hoja (o, si aún no se abre, la plantilla de hoy como vista previa). */
export async function sheetView(ctx: Ctx, actor: ChecklistActor, templateId: unknown, rawDate: unknown): Promise<SheetView> {
  await access(ctx, actor);
  const date = dateOrInvalid(rawDate);
  const today = todayOf(ctx);
  if (actor.kind === "device" && date !== today) throw new AppError("not_today");
  const l = await load(ctx.store, actor, templateId, date);
  const [positions, devices, users] = await Promise.all([
    ctx.store.personnel.positions.listByBusiness(l.template.businessId),
    ctx.store.checklists.devices.listByBranch(actorBranch(actor).id),
    l.sheet?.closedBy ? ctx.store.users.list() : Promise.resolve([]),
  ]);
  const positionName = (id: string | null) => (id ? (positions.find((p) => p.id === id)?.name ?? null) : null);
  const deviceName = (id: string | null) => (id ? (devices.find((d) => d.id === id)?.name ?? null) : null);
  const myPosition = actor.kind === "device" ? (actor.employee?.positionId ?? null) : null;
  let sections: SheetSectionView[];
  if (!l.sheet) {
    const branches = await templateLinks(ctx.store, l.template);
    if (date !== today || l.template.archivedAt || !appliesOn({ daysMask: l.template.daysMask, branchIds: branches }, actorBranch(actor).id, date)) throw new AppError("not_found");
    const t = await templateView(ctx.store, l.template);
    sections = t.sections.map((s) => ({
      sectionId: s.id,
      name: s.name,
      position: positionName(s.positionId),
      mine: !!myPosition && s.positionId === myPosition,
      ready: false,
      readyAt: null,
      readyBy: null,
      readyDevice: null,
      keyPending: s.items.filter((i) => i.isKey).length,
      done: 0,
      total: s.items.filter((i) => i.kind !== "comment").length,
      items: s.items.map((i) => ({ itemId: i.id, text: i.text, kind: i.kind, isKey: i.isKey, done: false, comment: null, photoId: null, markedAt: null, markedBy: null, device: null })),
    }));
    sections = orderForPosition(sections.map((s, i) => ({ ...s, positionId: t.sections[i].positionId })), myPosition).map(dropPosition);
  } else {
    const showPhotos = actor.kind === "user" || l.sheet.status === "open";
    const built = l.sections.map((s) => {
      const items = l.items.filter((i) => i.sheetSectionId === s.id);
      return {
        positionId: s.positionId,
        sectionId: s.sectionId,
        name: s.name,
        position: positionName(s.positionId),
        mine: !!myPosition && s.positionId === myPosition,
        ready: s.readyAt !== null,
        readyAt: s.readyAt?.toISOString() ?? null,
        readyBy: s.readyBy,
        readyDevice: deviceName(s.readyDeviceId),
        keyPending: keyPending(items),
        done: items.filter((i) => i.kind !== "comment" && i.done).length,
        total: items.filter((i) => i.kind !== "comment").length,
        items: items.map((i) => ({
          itemId: i.itemId,
          text: i.text,
          kind: i.kind,
          isKey: i.isKey,
          done: i.done,
          comment: i.comment,
          photoId: i.photoKey && showPhotos ? i.id : null,
          markedAt: i.markedAt?.toISOString() ?? null,
          markedBy: i.markedBy,
          device: deviceName(i.markedDeviceId),
        })),
      };
    });
    sections = orderForPosition(built, myPosition).map(dropPosition);
  }
  const status = l.sheet ? l.sheet.status : "new";
  return {
    templateId: l.template.id,
    templateName: l.sheet?.templateName ?? l.template.name,
    date,
    today: date === today,
    status,
    editable: status !== "closed" && date === today,
    closedAt: l.sheet?.closedAt?.toISOString() ?? null,
    closedBy: l.sheet?.closedBy ? (users.find((u) => u.id === l.sheet!.closedBy)?.name ?? null) : null,
    pending: (l.sheet?.pending as SheetView["pending"]) ?? null,
    sections,
  };
}

const sheetLock = (templateId: string, branchId: string, date: string) => businessLock(`${templateId}:${branchId}:${date}`);

const audit = (repos: Repos, now: Date, actor: ChecklistActor, sheet: ChecklistSheet, action: string, after: unknown, before?: unknown) =>
  recordAudit(repos.audit, now, { actorId: actor.kind === "user" ? actor.scope.actor.id : null, action, entityType: "checklist_sheet", entityId: sheet.id, businessId: sheet.businessId, branchId: sheet.branchId, before, after: actor.kind === "device" ? { ...(after as object), device: actor.device.name, employee: actor.employee?.name ?? null } : after });

/** RF-15, RF-17: abre la hoja de hoy con la foto de la plantilla; dos teléfonos a la vez obtienen la misma. */
async function openToday(repos: Repos, actor: ChecklistActor, template: ChecklistTemplate, date: string, now: Date): Promise<Loaded> {
  const branch = actorBranch(actor);
  const existing = await repos.checklists.sheets.find(template.id, branch.id, date);
  if (!existing) {
    const branches = await templateLinks(repos, template);
    if (template.archivedAt || !appliesOn({ daysMask: template.daysMask, branchIds: branches }, branch.id, date)) throw new AppError("not_found");
    const { sheet, created } = await repos.checklists.sheets.ensure({ templateId: template.id, businessId: template.businessId, branchId: branch.id, date, templateName: template.name, createdAt: now });
    if (created) {
      const t = await templateView(repos, template);
      for (const [sort, s] of t.sections.entries()) {
        const ss = await repos.checklists.sheetSections.insert({ sheetId: sheet.id, sectionId: s.id, name: s.name, positionId: s.positionId, sort });
        for (const [isort, i] of s.items.entries()) await repos.checklists.sheetItems.insert({ sheetSectionId: ss.id, itemId: i.id, text: i.text, kind: i.kind, isKey: i.isKey, sort: isort });
      }
      await audit(repos, now, actor, sheet, "checklist_sheet.opened", { date });
    }
  }
  return load(repos, actor, template.id, date);
}

type Write = (repos: Repos, l: Loaded & { sheet: ChecklistSheet }, now: Date) => Promise<void>;

/** Cambios de llenado: solo en la hoja de hoy, abierta (RF-34, RF-36). */
async function fill(ctx: Ctx, actor: ChecklistActor, templateId: unknown, rawDate: unknown, write: Write): Promise<SheetView> {
  await access(ctx, actor);
  const date = dateOrInvalid(rawDate);
  const now = ctx.ports.clock.now();
  const today = todayInMexico(now);
  signature(actor);
  const template = await businessTemplate(ctx.store, actor, templateId);
  await ctx.store.transaction(
    async (repos) => {
      if (date !== today) {
        const past = await repos.checklists.sheets.find(template.id, actorBranch(actor).id, date);
        if (past?.status === "closed") throw new AppError("sheet_closed");
        if (past && date < today) throw new AppError("sheet_past");
        throw new AppError("not_today");
      }
      const l = await openToday(repos, actor, template, date, now);
      if (l.sheet!.status === "closed") throw new AppError("sheet_closed");
      await write(repos, l as Loaded & { sheet: ChecklistSheet }, now);
    },
    { lock: sheetLock(template.id, actorBranch(actor).id, date) },
  );
  return sheetView(ctx, actor, template.id, date);
}

function itemIn(l: Loaded, itemId: unknown) {
  const id = uuidOrNotFound(itemId);
  const item = l.items.find((i) => i.itemId === id);
  if (!item) throw new AppError("not_found");
  const section = l.sections.find((s) => s.id === item.sheetSectionId)!;
  if (section.readyAt) throw new AppError("section_ready");
  return { item, section };
}

function sectionIn(l: Loaded, sectionId: unknown) {
  const id = uuidOrNotFound(sectionId);
  const section = l.sections.find((s) => s.sectionId === id);
  if (!section) throw new AppError("not_found");
  return section;
}

const marked = (actor: ChecklistActor, now: Date) => {
  const s = signature(actor);
  return { markedAt: now, markedBy: s.name, markedUserId: s.userId, markedEmployeeId: s.employeeId, markedDeviceId: s.deviceId };
};

/** RF-20 a RF-22: palomear o quitar la palomita. */
export async function checkItem(ctx: Ctx, actor: ChecklistActor, templateId: unknown, date: unknown, itemId: unknown, done: boolean): Promise<SheetView> {
  return fill(ctx, actor, templateId, date, async (repos, l, now) => {
    const { item } = itemIn(l, itemId);
    if (item.kind === "comment") throw new AppError("validation");
    if (done && item.kind === "photo" && !item.photoKey) throw new AppError("photo_required");
    await repos.checklists.sheetItems.update(item.id, { done, ...marked(actor, now) });
  });
}

/** RF-24: comentario de hasta 500 caracteres en un punto de comentario. */
export async function commentItem(ctx: Ctx, actor: ChecklistActor, templateId: unknown, date: unknown, itemId: unknown, raw: unknown): Promise<SheetView> {
  const text = (typeof raw === "string" ? raw : "").trim();
  if (text.length > COMMENT_MAX) throw new AppError("validation");
  return fill(ctx, actor, templateId, date, async (repos, l, now) => {
    const { item } = itemIn(l, itemId);
    if (item.kind !== "comment") throw new AppError("validation");
    await repos.checklists.sheetItems.update(item.id, { comment: text || null, ...marked(actor, now) });
  });
}

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
/** Clave como la de los documentos (spec 008): «negocio/uuid aleatorio», sin datos de nadie. */
const uuidFrom = (b: Uint8Array) => {
  const h = hex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

/** RF-22, RF-23: la foto del punto (JPG, PNG, HEIC o WEBP hasta 10 MB); al subirla, el punto queda palomeado. */
export async function photoItem(ctx: Ctx, actor: ChecklistActor, templateId: unknown, date: unknown, itemId: unknown, bytes: Uint8Array): Promise<SheetView> {
  if (bytes.length > FILE_MAX_BYTES) throw new AppError("file_size");
  const type = bytes.length ? fileKind(bytes) : null;
  if (!type || type === "application/pdf") throw new AppError("file_type");
  const key = `${actorBusiness(actor).id}/${uuidFrom(ctx.ports.random.bytes(16))}`;
  await ctx.ports.files.put(key, bytes);
  return fill(ctx, actor, templateId, date, async (repos, l, now) => {
    const { item } = itemIn(l, itemId);
    if (item.kind !== "photo") throw new AppError("validation");
    await repos.checklists.sheetItems.update(item.id, { photoKey: key, photoType: type, done: true, ...marked(actor, now) });
  });
}

/** RF-25, RF-26: «Todo en orden» en una sección. */
export async function allOk(ctx: Ctx, actor: ChecklistActor, templateId: unknown, date: unknown, sectionId: unknown): Promise<SheetView> {
  return fill(ctx, actor, templateId, date, async (repos, l, now) => {
    const section = sectionIn(l, sectionId);
    if (section.readyAt) throw new AppError("section_ready");
    const items = l.items.filter((i) => i.sheetSectionId === section.id);
    for (const id of allOkTargets(items)) {
      const item = items.find((i) => i.itemId === id)!;
      await repos.checklists.sheetItems.update(item.id, { done: true, ...marked(actor, now) });
    }
  });
}

/** RF-27, RF-28, RF-31: «Sección lista»; con la última, la hoja se cierra sola. */
export async function sectionReady(ctx: Ctx, actor: ChecklistActor, templateId: unknown, date: unknown, sectionId: unknown): Promise<SheetView> {
  return fill(ctx, actor, templateId, date, async (repos, l, now) => {
    const section = sectionIn(l, sectionId);
    if (section.readyAt) throw new AppError("section_ready");
    const missing = keyPending(l.items.filter((i) => i.sheetSectionId === section.id));
    if (missing) throw new AppError("key_pending", { count: missing });
    const s = signature(actor);
    await repos.checklists.sheetSections.update(section.id, { readyAt: now, readyBy: s.name, readyUserId: s.userId, readyEmployeeId: s.employeeId, readyDeviceId: s.deviceId });
    await audit(repos, now, actor, l.sheet, "checklist_sheet.section_ready", { section: section.name });
    if (allReady(l.sections.map((x) => ({ ready: x.id === section.id || x.readyAt !== null })))) {
      await repos.checklists.sheets.update(l.sheet.id, { status: "closed", closedAt: now, closedBy: null, pending: [], updatedAt: now });
      await audit(repos, now, actor, l.sheet, "checklist_sheet.closed", { pending: [] });
    }
  });
}

const userOnly = (actor: ChecklistActor) => {
  if (actor.kind !== "user") throw new AppError("forbidden");
  return actor;
};

/** RF-30, RF-35: reabrir una sección lista (y la hoja, si estaba cerrada). Solo personas, nunca el teléfono (RF-45). */
export async function reopenSection(ctx: Ctx, actor: ChecklistActor, templateId: unknown, rawDate: unknown, sectionId: unknown): Promise<SheetView> {
  userOnly(actor);
  await access(ctx, actor);
  const date = dateOrInvalid(rawDate);
  const now = ctx.ports.clock.now();
  const template = await businessTemplate(ctx.store, actor, templateId);
  await ctx.store.transaction(
    async (repos) => {
      const l = await load(repos, actor, template.id, date);
      if (!l.sheet) throw new AppError("not_found");
      const section = sectionIn(l, sectionId);
      if (!section.readyAt) return;
      await repos.checklists.sheetSections.update(section.id, { readyAt: null, readyBy: null, readyUserId: null, readyEmployeeId: null, readyDeviceId: null });
      if (l.sheet.status === "closed") await repos.checklists.sheets.update(l.sheet.id, { status: "open", closedAt: null, closedBy: null, pending: null, updatedAt: now });
      await audit(repos, now, actor, l.sheet, "checklist_sheet.section_reopened", { section: section.name }, { readyBy: section.readyBy, sheet: l.sheet.status });
    },
    { lock: sheetLock(template.id, actorBranch(actor).id, date) },
  );
  return sheetView(ctx, actor, template.id, date);
}

/** RF-32, RF-33, RF-36: cerrar con pendientes (también la hoja de un día anterior). Solo personas (RF-45). */
export async function closeSheet(ctx: Ctx, actor: ChecklistActor, templateId: unknown, rawDate: unknown): Promise<SheetView> {
  const a = userOnly(actor);
  await access(ctx, actor);
  const date = dateOrInvalid(rawDate);
  const now = ctx.ports.clock.now();
  const template = await businessTemplate(ctx.store, actor, templateId);
  await ctx.store.transaction(
    async (repos) => {
      let l = await load(repos, actor, template.id, date);
      if (!l.sheet) {
        if (date !== todayInMexico(now)) throw new AppError("not_found");
        l = await openToday(repos, actor, template, date, now);
      }
      if (l.sheet!.status === "closed") throw new AppError("sheet_closed");
      const pending = pendingAtClose(
        l.sections.map((s) => {
          const items = l.items.filter((i) => i.sheetSectionId === s.id);
          return { sectionId: s.sectionId, name: s.name, positionId: s.positionId, ready: s.readyAt !== null, items, itemsText: Object.fromEntries(items.map((i) => [i.itemId, i.text])) };
        }),
      );
      await repos.checklists.sheets.update(l.sheet!.id, { status: "closed", closedAt: now, closedBy: a.scope.actor.id, pending, updatedAt: now });
      await audit(repos, now, actor, l.sheet!, "checklist_sheet.closed", { pending });
    },
    { lock: sheetLock(template.id, actorBranch(actor).id, date) },
  );
  return sheetView(ctx, actor, template.id, date);
}

/** RF-46: hojas de la sucursal, de la más reciente a la más antigua, con su número de pendientes. */
export async function sheetHistory(ctx: Ctx, actor: ChecklistActor): Promise<SheetSummaryView[]> {
  userOnly(actor);
  await access(ctx, actor);
  const sheets = await ctx.store.checklists.sheets.listByBranch(actorBranch(actor).id);
  const sections = await ctx.store.checklists.sheetSections.listBySheets(sheets.map((s) => s.id));
  const users = await ctx.store.users.list();
  return sheets.map((s) => ({
    templateId: s.templateId,
    templateName: s.templateName,
    date: s.date,
    status: s.status,
    pending: s.status === "closed" ? ((s.pending as unknown[] | null)?.length ?? 0) : sections.filter((x) => x.sheetId === s.id && !x.readyAt).length,
    closedBy: s.closedBy ? (users.find((u) => u.id === s.closedBy)?.name ?? null) : null,
  }));
}

/** RF-48: la foto de un punto, para personas de la sucursal o para su teléfono mientras la hoja está abierta. */
export async function checklistPhoto(ctx: Ctx, actor: ChecklistActor, sheetItemId: unknown): Promise<{ bytes: Uint8Array; contentType: string }> {
  await access(ctx, actor);
  const item = await ctx.store.checklists.sheetItems.findById(uuidOrNotFound(sheetItemId));
  if (!item?.photoKey) throw new AppError("not_found");
  const sheet = await ctx.store.checklists.sheetSections.findSheetOf(item.sheetSectionId);
  if (!sheet || sheet.branchId !== actorBranch(actor).id) throw new AppError("not_found");
  if (actor.kind === "device" && sheet.status !== "open") throw new AppError("not_found");
  const bytes = await ctx.ports.files.get(item.photoKey);
  if (!bytes) throw new AppError("not_found");
  return { bytes, contentType: item.photoType ?? "application/octet-stream" };
}
