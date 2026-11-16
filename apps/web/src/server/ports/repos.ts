// Repositorios como puertos: los servicios hablan con estas interfaces; `server/adapters/drizzle` las implementa.
import type { Branch, Business, Membership, Session, User, UserRole } from "@/db/schema";
import type { CatalogRepo } from "./catalog";
import type { InventoryRepo } from "./inventory";
import type { CashRepo } from "./cash";
import type { ChecklistsRepo } from "./checklists";
import type { PayrollRepo } from "./payroll";
import type { PersonnelRepo } from "./personnel";
import type { RecipesRepo } from "./recipes";
import type { RequisitionsRepo } from "./requisitions";

export type NewUser = {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  mustChangePassword?: boolean;
  createdBy?: string | null;
  createdAt: Date;
};
export type UserPatch = Partial<Pick<User, "name" | "email" | "passwordHash" | "role" | "mustChangePassword" | "isActive" | "failedLoginAttempts" | "lockedUntil" | "lastBranchId">> & { updatedAt: Date };

export interface UsersRepo {
  count(): Promise<number>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  list(): Promise<User[]>;
  insert(data: NewUser): Promise<User>;
  update(id: string, patch: UserPatch): Promise<User>;
  countActiveOwners(excludeId?: string): Promise<number>;
}

export type NewSession = {
  tokenHash: string;
  userId: string;
  activeBranchId?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
};
export type SessionPatch = Partial<Pick<Session, "activeBranchId" | "lastSeenAt" | "expiresAt" | "revokedAt">>;

export interface SessionsRepo {
  insert(data: NewSession): Promise<Session>;
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  findById(id: string): Promise<Session | null>;
  update(id: string, patch: SessionPatch): Promise<Session>;
  /** Marca como revocadas todas las sesiones vivas de la persona; devuelve cuántas. */
  revokeAllForUser(userId: string, at: Date): Promise<number>;
}

export type NewAudit = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  businessId?: string | null;
  branchId?: string | null;
  before?: unknown;
  after?: unknown;
  createdAt: Date;
};

export type AuditEntryView = { action: string; createdAt: Date; actorName: string | null; before: unknown; after: unknown };

export interface AuditRepo {
  insert(entry: NewAudit): Promise<void>;
  /** Registro de una entidad, del más reciente al más antiguo, con el nombre de quién lo hizo (spec 008, RF-42). */
  listByEntity(entityType: string, entityId: string): Promise<AuditEntryView[]>;
}

export type NewBusiness = { name: string; nameKey: string; color: string; createdBy: string | null; createdAt: Date };
export type BusinessPatch = Partial<Pick<Business, "name" | "nameKey" | "color" | "archivedAt">> & { updatedAt: Date };

export interface BusinessesRepo {
  list(): Promise<Business[]>;
  findById(id: string): Promise<Business | null>;
  findByNameKey(nameKey: string): Promise<Business | null>;
  insert(data: NewBusiness): Promise<Business>;
  update(id: string, patch: BusinessPatch): Promise<Business>;
}

export type NewBranch = { businessId: string; name: string; nameKey: string; createdBy: string | null; createdAt: Date };
export type BranchPatch = Partial<Pick<Branch, "name" | "nameKey" | "archivedAt">> & { updatedAt: Date };

export interface BranchesRepo {
  listAll(): Promise<Branch[]>;
  listByBusiness(businessId: string): Promise<Branch[]>;
  findById(id: string): Promise<Branch | null>;
  findByNameKey(businessId: string, nameKey: string): Promise<Branch | null>;
  insert(data: NewBranch): Promise<Branch>;
  update(id: string, patch: BranchPatch): Promise<Branch>;
  /** Archiva las sucursales activas del negocio; devuelve las afectadas. */
  archiveByBusiness(businessId: string, at: Date): Promise<Branch[]>;
  /** Reactiva las sucursales archivadas del negocio; devuelve las afectadas. */
  reactivateByBusiness(businessId: string, at: Date): Promise<Branch[]>;
}

export interface MembershipsRepo {
  listAll(): Promise<Membership[]>;
  listByUser(userId: string): Promise<Membership[]>;
  /** Deja a la persona exactamente con esas sucursales; devuelve qué se añadió y qué se quitó. */
  replaceForUser(userId: string, branchIds: string[], meta: { createdBy: string | null; createdAt: Date }): Promise<{ added: string[]; removed: string[] }>;
}

export interface Repos {
  users: UsersRepo;
  sessions: SessionsRepo;
  businesses: BusinessesRepo;
  branches: BranchesRepo;
  memberships: MembershipsRepo;
  audit: AuditRepo;
  catalog: CatalogRepo;
  recipes: RecipesRepo;
  inventory: InventoryRepo;
  requisitions: RequisitionsRepo;
  personnel: PersonnelRepo;
  payroll: PayrollRepo;
  checklists: ChecklistsRepo;
  cash: CashRepo;
}

export interface Store extends Repos {
  /** Ejecuta `fn` en una transacción; con `lock` toma un cerrojo de aviso (pg_advisory_xact_lock) antes. */
  transaction<T>(fn: (repos: Repos) => Promise<T>, opts?: { lock?: number }): Promise<T>;
}
