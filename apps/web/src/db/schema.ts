// Esquema de la spec 001 (plan, sección 2). Solo cambia por migración de Drizzle. Nada se borra: `archived_at`,
// `is_active` y `revoked_at` marcan lo que dejó de estar vigente.
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const USER_ROLES = ["owner", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 60 }).notNull(),
    // Guardado normalizado (minúsculas, sin espacios exteriores): RF-9.
    email: varchar("email", { length: 254 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    // Rol global: el dueño accede a todo sin membresías (RF-26); el administrador, a sus sucursales (RF-25).
    role: varchar("role", { length: 10 }).$type<UserRole>().notNull(),
    // Contraseña temporal pendiente de cambio (RF-12).
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    // Bloqueo por intentos fallidos (RF-6).
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    // Última sucursal activa, recordada entre entradas (RF-34).
    lastBranchId: uuid("last_branch_id").references((): AnyPgColumn => branches.id),
    createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email), check("users_role_check", sql`${t.role} in ('owner', 'admin')`)],
);

export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 60 }).notNull(),
    // Nombre normalizado para la unicidad ignorando mayúsculas y espacios (RF-19).
    nameKey: varchar("name_key", { length: 60 }).notNull(),
    // Clave de la paleta cerrada de 8 colores (spec 002, RF-8 y RF-10); los tonos viven en src/ui/tokens.css.
    color: varchar("color", { length: 16 }).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("businesses_name_key_unique").on(t.nameKey),
    check("businesses_color_check", sql`${t.color} in ('violeta', 'rojo', 'naranja', 'ambar', 'verde', 'turquesa', 'azul', 'rosa')`),
  ],
);

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    name: varchar("name", { length: 60 }).notNull(),
    nameKey: varchar("name_key", { length: 60 }).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [uniqueIndex("branches_business_name_key_unique").on(t.businessId, t.nameKey), index("branches_business_idx").on(t.businessId)],
);

export const MEMBERSHIP_ROLES = ["admin"] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

// Acceso de un administrador a una sucursal (RF-25). `role` queda para roles por sucursal en specs futuras.
export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    role: varchar("role", { length: 10 }).$type<MembershipRole>().notNull().default("admin"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("memberships_user_branch_unique").on(t.userId, t.branchId), index("memberships_branch_idx").on(t.branchId)],
);

// Sesión opaca: en BD solo el SHA-256 del token que viaja en la cookie (RF-7, RF-8, RF-14, RF-28).
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    activeBranchId: uuid("active_branch_id").references(() => branches.id),
    userAgent: varchar("user_agent", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("sessions_token_hash_unique").on(t.tokenHash), index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

// Registro de cambios (RF-42): quién, cuándo, qué, y los valores antes y después (nunca hashes).
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: uuid("actor_id").references(() => users.id),
    action: varchar("action", { length: 60 }).notNull(),
    entityType: varchar("entity_type", { length: 30 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    businessId: uuid("business_id"),
    branchId: uuid("branch_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_entity_idx").on(t.entityType, t.entityId), index("audit_log_created_idx").on(t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
