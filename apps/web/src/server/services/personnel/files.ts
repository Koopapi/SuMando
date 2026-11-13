// Documentos del expediente (spec 008, RF-18 a RF-27, RF-41): se suben como foto o PDF, se reemplazan o retiran sin
// borrar, y solo el dueño los abre, quedando registrado.
import type { EmployeeFile } from "@/db/schema";
import { writtenReason } from "@/domain/inventory/movement";
import { isDate } from "@/domain/personnel/documents";
import { fileKind, fileProblem } from "@/domain/personnel/files";
import { AppError } from "../../errors";
import { recordAudit } from "../audit";
import type { CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { uuidOrNotFound } from "../inventory/shared";
import { documentTypesOf, ownEmployee, ownerOnly, personnelAccess } from "./shared";

export interface UploadedFile {
  name: string;
  bytes: Uint8Array;
}

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
const uuidFrom = (b: Uint8Array) => {
  const h = hex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

/** RF-18 a RF-20 y RF-24: uno o varios archivos al documento; con `replace`, los anteriores pasan al historial. */
export async function uploadDocument(ctx: Ctx, scope: CatalogScope, employeeId: string, typeId: string, input: { files: UploadedFile[]; issuedOn?: unknown; replace?: boolean }): Promise<EmployeeFile[]> {
  if (input.files.length === 0 || input.files.length > 10) throw new AppError("validation");
  for (const f of input.files) {
    const problem = fileProblem(f.bytes);
    if (problem) throw new AppError(problem);
  }
  const access = await personnelAccess(ctx.store, scope);
  const types = await documentTypesOf(ctx, access.businessId);
  const type = types.find((t) => t.id === typeId && !t.archivedAt);
  if (!type) throw new AppError("not_found");
  const employee = await ownEmployee(ctx.store, scope, employeeId);
  // RF-19: con vigencia, la fecha de expedición es obligatoria.
  let issuedOn: string | null = null;
  if (input.issuedOn !== undefined && input.issuedOn !== null && input.issuedOn !== "") {
    if (!isDate(input.issuedOn)) throw new AppError("invalid_date");
    issuedOn = input.issuedOn;
  } else if (type.validityMonths !== null) throw new AppError("invalid_date");
  const now = ctx.ports.clock.now();
  // Primero el disco, después la base: si la base falla queda un archivo huérfano sin referencia, nunca una
  // referencia sin archivo.
  const stored: { key: string; f: UploadedFile }[] = [];
  for (const f of input.files) {
    const key = `${access.businessId}/${uuidFrom(ctx.ports.random.bytes(16))}`;
    await ctx.ports.files.put(key, f.bytes);
    stored.push({ key, f });
  }
  return ctx.store.transaction(async (repos) => {
    const current = (await repos.personnel.files.listByEmployees([employee.id])).filter((x) => x.documentTypeId === type.id && !x.replacedAt && !x.retiredAt);
    if (input.replace) for (const old of current) await repos.personnel.files.update(old.id, { replacedAt: now, replacedBy: scope.actor.id });
    const out: EmployeeFile[] = [];
    for (const { key, f } of stored) {
      out.push(
        await repos.personnel.files.insert({
          employeeId: employee.id,
          documentTypeId: type.id,
          storageKey: key,
          originalName: (f.name || "archivo").slice(0, 200),
          contentType: fileKind(f.bytes)!,
          sizeBytes: f.bytes.length,
          issuedOn,
          uploadedBy: scope.actor.id,
          uploadedAt: now,
        }),
      );
    }
    await recordAudit(repos.audit, now, {
      actorId: scope.actor.id,
      action: input.replace && current.length ? "employee_file.replaced" : "employee_file.uploaded",
      entityType: "employee",
      entityId: employee.id,
      businessId: employee.businessId,
      branchId: employee.branchId,
      before: input.replace && current.length ? { files: current.map((x) => x.originalName) } : null,
      after: { document: type.name, files: out.map((x) => x.originalName), issuedOn },
    });
    return out;
  });
}

async function ownFile(ctx: Ctx, scope: CatalogScope, id: string) {
  const file = await ctx.store.personnel.files.findById(uuidOrNotFound(id));
  if (!file) throw new AppError("not_found");
  const employee = await ownEmployee(ctx.store, scope, file.employeeId);
  return { file, employee };
}

/** RF-5, RF-27 y RF-41: solo el dueño abre un archivo; cada apertura queda registrada. */
export async function openDocumentFile(ctx: Ctx, scope: CatalogScope, id: string): Promise<{ bytes: Uint8Array; contentType: string; name: string }> {
  await personnelAccess(ctx.store, scope);
  const { file, employee } = await ownFile(ctx, scope, id);
  ownerOnly(scope);
  const bytes = await ctx.ports.files.get(file.storageKey);
  if (!bytes) throw new AppError("not_found");
  await recordAudit(ctx.store.audit, ctx.ports.clock.now(), { actorId: scope.actor.id, action: "employee_file.opened", entityType: "employee", entityId: employee.id, businessId: employee.businessId, branchId: employee.branchId, after: { file: file.originalName } });
  return { bytes, contentType: file.contentType, name: file.originalName };
}

/** RF-25: el dueño retira un archivo con motivo; deja de contar y queda en el historial. */
export async function retireDocumentFile(ctx: Ctx, scope: CatalogScope, id: string, rawReason: unknown): Promise<EmployeeFile> {
  ownerOnly(scope);
  const reason = writtenReason(typeof rawReason === "string" ? rawReason : null);
  if (!reason) throw new AppError("reason_required");
  await personnelAccess(ctx.store, scope);
  const { file, employee } = await ownFile(ctx, scope, id);
  if (file.retiredAt || file.replacedAt) throw new AppError("employee_state", { state: "retirado" });
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const after = await repos.personnel.files.update(file.id, { retiredAt: now, retiredBy: scope.actor.id, retireReason: reason });
    await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "employee_file.retired", entityType: "employee", entityId: employee.id, businessId: employee.businessId, branchId: employee.branchId, after: { file: file.originalName, reason } });
    return after;
  });
}
