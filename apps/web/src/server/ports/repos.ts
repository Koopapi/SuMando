// Repositorios como puertos: los servicios hablan con estas interfaces; `server/adapters/drizzle` las implementa.
import type { Session, User, UserRole } from "@/db/schema";

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

export interface AuditRepo {
  insert(entry: NewAudit): Promise<void>;
}

export interface Repos {
  users: UsersRepo;
  sessions: SessionsRepo;
  audit: AuditRepo;
}

export interface Store extends Repos {
  /** Ejecuta `fn` en una transacción; con `lock` toma un cerrojo de aviso (pg_advisory_xact_lock) antes. */
  transaction<T>(fn: (repos: Repos) => Promise<T>, opts?: { lock?: number }): Promise<T>;
}
