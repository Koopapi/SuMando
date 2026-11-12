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
  numeric,
  pgTable,
  smallint,
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

// Catálogo de cada negocio (spec 003, plan sección 2). Nombres únicos entre los activos (`name_key`, RF-31): lo
// archivado no bloquea un alta nueva y su reactivación se comprueba en el servicio (RF-34).
const activeOnly = sql`archived_at is null`;

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    name: varchar("name", { length: 80 }).notNull(),
    nameKey: varchar("name_key", { length: 80 }).notNull(),
    phone: varchar("phone", { length: 30 }),
    notes: varchar("notes", { length: 500 }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [uniqueIndex("suppliers_active_name_unique").on(t.businessId, t.nameKey).where(activeOnly), index("suppliers_business_idx").on(t.businessId)],
);

export const BASE_UNIT_KEYS = ["g", "ml", "pz"] as const;

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    name: varchar("name", { length: 80 }).notNull(),
    nameKey: varchar("name_key", { length: 80 }).notNull(),
    // Unidad base fija (RF-10, RF-16): la presentación de unidad base es implícita, con equivalencia 1 (RF-12).
    baseUnit: varchar("base_unit", { length: 4 }).$type<(typeof BASE_UNIT_KEYS)[number]>().notNull(),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    notes: varchar("notes", { length: 500 }),
    // Presentaciones de compra y de conteo (RF-15); nulo = la unidad base.
    purchasePresentationId: uuid("purchase_presentation_id").references((): AnyPgColumn => productPresentations.id),
    countPresentationId: uuid("count_presentation_id").references((): AnyPgColumn => productPresentations.id),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("products_active_name_unique").on(t.businessId, t.nameKey).where(activeOnly),
    index("products_business_idx").on(t.businessId),
    check("products_base_unit_check", sql`${t.baseUnit} in ('g', 'ml', 'pz')`),
  ],
);

export const productPresentations = pgTable(
  "product_presentations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references((): AnyPgColumn => products.id),
    name: varchar("name", { length: 80 }).notNull(),
    nameKey: varchar("name_key", { length: 80 }).notNull(),
    // Equivalencia en unidad base, mayor que cero y con hasta 3 decimales (RF-11, RF-13).
    factor: numeric("factor", { precision: 14, scale: 3 }).notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [uniqueIndex("product_presentations_name_unique").on(t.productId, t.nameKey), check("product_presentations_factor_check", sql`${t.factor} > 0`)],
);

export const warehouses = pgTable(
  "warehouses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    // Nulo = del negocio completo (RF-3). La unicidad cruzada de RF-20 la comprueba el servicio.
    branchId: uuid("branch_id").references(() => branches.id),
    name: varchar("name", { length: 80 }).notNull(),
    nameKey: varchar("name_key", { length: 80 }).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [index("warehouses_business_idx").on(t.businessId)],
);

export const areas = pgTable(
  "areas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    name: varchar("name", { length: 80 }).notNull(),
    nameKey: varchar("name_key", { length: 80 }).notNull(),
    // Responsable: una persona con cuenta (RF-19).
    responsibleId: uuid("responsible_id")
      .notNull()
      .references(() => users.id),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [uniqueIndex("areas_active_name_unique").on(t.branchId, t.nameKey).where(activeOnly), index("areas_business_idx").on(t.businessId)],
);

// Mínimo y máximo de un producto en un almacén, en unidad base (RF-22 a RF-25).
export const stockLevels = pgTable(
  "stock_levels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    minBase: numeric("min_base", { precision: 20, scale: 6 }),
    maxBase: numeric("max_base", { precision: 20, scale: 6 }),
    updatedBy: uuid("updated_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("stock_levels_product_warehouse_unique").on(t.productId, t.warehouseId),
    index("stock_levels_business_idx").on(t.businessId),
    check("stock_levels_non_negative", sql`(${t.minBase} is null or ${t.minBase} >= 0) and (${t.maxBase} is null or ${t.maxBase} >= 0)`),
    check("stock_levels_max_ge_min", sql`${t.minBase} is null or ${t.maxBase} is null or ${t.maxBase} >= ${t.minBase}`),
  ],
);

// --- Spec 004: recetario e insumos (plan, sección 2) ---

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    name: varchar("name", { length: 80 }).notNull(),
    nameKey: varchar("name_key", { length: 80 }).notNull(),
    preparation: varchar("preparation", { length: 4000 }),
    // Media porción por platillo (RF-16 a RF-18).
    halfPercent: smallint("half_percent").notNull().default(50),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("recipes_active_name_unique").on(t.businessId, t.nameKey).where(activeOnly),
    index("recipes_business_idx").on(t.businessId),
    check("recipes_half_percent_range", sql`${t.halfPercent} between 1 and 100`),
  ],
);

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    // Cantidad bruta en unidad base (RF-9).
    quantityBase: numeric("quantity_base", { precision: 20, scale: 6 }).notNull(),
    note: varchar("note", { length: 120 }),
    position: integer("position").notNull(),
  },
  (t) => [
    uniqueIndex("recipe_ingredients_recipe_product_unique").on(t.recipeId, t.productId),
    index("recipe_ingredients_product_idx").on(t.productId),
    check("recipe_ingredients_quantity_positive", sql`${t.quantityBase} > 0`),
  ],
);

// Cálculos guardados (RF-29 a RF-32): no se modifican; guardan copias de lo que se usó.
export const supplyCalculations = pgTable(
  "supply_calculations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("supply_calculations_branch_idx").on(t.branchId, t.createdAt)],
);

export const supplyCalculationItems = pgTable(
  "supply_calculation_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    calculationId: uuid("calculation_id")
      .notNull()
      .references(() => supplyCalculations.id),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id),
    recipeName: varchar("recipe_name", { length: 80 }).notNull(),
    fullCount: integer("full_count").notNull(),
    halfCount: integer("half_count").notNull(),
    halfPercent: smallint("half_percent").notNull(),
  },
  (t) => [
    index("supply_calculation_items_calc_idx").on(t.calculationId),
    check("supply_calculation_items_counts", sql`${t.fullCount} between 0 and 9999 and ${t.halfCount} between 0 and 9999`),
  ],
);

export const supplyCalculationLines = pgTable(
  "supply_calculation_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    calculationId: uuid("calculation_id")
      .notNull()
      .references(() => supplyCalculations.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    productName: varchar("product_name", { length: 80 }).notNull(),
    baseUnit: varchar("base_unit", { length: 4 }).$type<(typeof BASE_UNIT_KEYS)[number]>().notNull(),
    totalBase: numeric("total_base", { precision: 26, scale: 8 }).notNull(),
    purchaseName: varchar("purchase_name", { length: 40 }),
    purchaseFactor: numeric("purchase_factor", { precision: 14, scale: 3 }),
    purchaseCount: integer("purchase_count"),
    productArchived: boolean("product_archived").notNull().default(false),
    position: integer("position").notNull(),
  },
  (t) => [index("supply_calculation_lines_calc_idx").on(t.calculationId)],
);

export const recipeTemplates = pgTable(
  "recipe_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    name: varchar("name", { length: 80 }).notNull(),
    nameKey: varchar("name_key", { length: 80 }).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [uniqueIndex("recipe_templates_active_name_unique").on(t.branchId, t.nameKey).where(activeOnly), index("recipe_templates_branch_idx").on(t.branchId)],
);

export const recipeTemplateItems = pgTable(
  "recipe_template_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => recipeTemplates.id),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id),
    fullCount: integer("full_count").notNull(),
    halfCount: integer("half_count").notNull(),
  },
  (t) => [
    uniqueIndex("recipe_template_items_template_recipe_unique").on(t.templateId, t.recipeId),
    check("recipe_template_items_counts", sql`${t.fullCount} between 0 and 9999 and ${t.halfCount} between 0 and 9999`),
  ],
);

export type User = typeof users.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductPresentation = typeof productPresentations.$inferSelect;
export type Warehouse = typeof warehouses.$inferSelect;
export type Area = typeof areas.$inferSelect;
export type StockLevel = typeof stockLevels.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type SupplyCalculation = typeof supplyCalculations.$inferSelect;
export type SupplyCalculationItem = typeof supplyCalculationItems.$inferSelect;
export type SupplyCalculationLine = typeof supplyCalculationLines.$inferSelect;
export type RecipeTemplate = typeof recipeTemplates.$inferSelect;
export type RecipeTemplateItem = typeof recipeTemplateItems.$inferSelect;
