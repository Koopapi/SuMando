// Esquema de la spec 001 (plan, sección 2). Solo cambia por migración de Drizzle. Nada se borra: `archived_at`,
// `is_active` y `revoked_at` marcan lo que dejó de estar vigente.
import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
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
    // Spec 005, RF-39: almacén donde se cuenta la lista del área; nulo hasta asignarlo.
    warehouseId: uuid("warehouse_id").references((): AnyPgColumn => warehouses.id),
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

// --- Spec 005: inventarios (plan, sección 2) ---

// Existencia vigente de un producto en un almacén, en unidad base; puede ser negativa (RF-1, RF-20).
export const stock = pgTable(
  "stock",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantityBase: numeric("quantity_base", { precision: 20, scale: 6 }).notNull().default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("stock_warehouse_product_unique").on(t.warehouseId, t.productId), index("stock_business_idx").on(t.businessId), index("stock_product_idx").on(t.productId)],
);

export const MOVEMENT_KINDS = ["entry", "exit", "adjustment", "transfer_out", "transfer_in", "count", "reversal"] as const;
export type MovementKind = (typeof MOVEMENT_KINDS)[number];

export const TRANSFER_STATUS_KEYS = ["done", "in_transit", "received", "cancelled"] as const;

export const inventoryTransfers = pgTable(
  "inventory_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromBusinessId: uuid("from_business_id")
      .notNull()
      .references(() => businesses.id),
    fromWarehouseId: uuid("from_warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    toBusinessId: uuid("to_business_id")
      .notNull()
      .references(() => businesses.id),
    toWarehouseId: uuid("to_warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    status: varchar("status", { length: 12 }).$type<(typeof TRANSFER_STATUS_KEYS)[number]>().notNull(),
    note: varchar("note", { length: 200 }),
    sentBy: uuid("sent_by")
      .notNull()
      .references(() => users.id),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
    receivedBy: uuid("received_by").references(() => users.id),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    cancelledBy: uuid("cancelled_by").references(() => users.id),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: varchar("cancel_reason", { length: 200 }),
  },
  (t) => [
    index("inventory_transfers_to_idx").on(t.toWarehouseId, t.status),
    index("inventory_transfers_from_idx").on(t.fromWarehouseId, t.status),
    check("inventory_transfers_distinct", sql`${t.fromWarehouseId} <> ${t.toWarehouseId}`),
    check("inventory_transfers_status_check", sql`${t.status} in ('done', 'in_transit', 'received', 'cancelled')`),
  ],
);

export const inventoryTransferLines = pgTable(
  "inventory_transfer_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transferId: uuid("transfer_id")
      .notNull()
      .references(() => inventoryTransfers.id),
    fromProductId: uuid("from_product_id")
      .notNull()
      .references(() => products.id),
    productName: varchar("product_name", { length: 80 }).notNull(),
    baseUnit: varchar("base_unit", { length: 4 }).$type<(typeof BASE_UNIT_KEYS)[number]>().notNull(),
    quantitySent: numeric("quantity_sent", { precision: 20, scale: 6 }).notNull(),
    // Al recibir (RF-30 a RF-35): producto del negocio destino y cantidad recibida.
    toProductId: uuid("to_product_id").references(() => products.id),
    quantityReceived: numeric("quantity_received", { precision: 20, scale: 6 }),
    position: integer("position").notNull(),
  },
  (t) => [index("inventory_transfer_lines_transfer_idx").on(t.transferId), check("inventory_transfer_lines_sent_positive", sql`${t.quantitySent} > 0`)],
);

// Conteo aplicado por área (RF-53).
export const inventoryCounts = pgTable(
  "inventory_counts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    areaId: uuid("area_id")
      .notNull()
      .references(() => areas.id),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("inventory_counts_area_idx").on(t.areaId, t.createdAt)],
);

export const inventoryCountLines = pgTable(
  "inventory_count_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countId: uuid("count_id")
      .notNull()
      .references(() => inventoryCounts.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    expectedBase: numeric("expected_base", { precision: 20, scale: 6 }).notNull(),
    countedBase: numeric("counted_base", { precision: 20, scale: 6 }).notNull(),
    differenceBase: numeric("difference_base", { precision: 20, scale: 6 }).notNull(),
    position: integer("position").notNull(),
  },
  (t) => [index("inventory_count_lines_count_idx").on(t.countId), check("inventory_count_lines_counted_non_negative", sql`${t.countedBase} >= 0`)],
);

// Movimientos (RF-60, RF-63): no se modifican ni se borran; se cancelan con un `reversal` (RF-64).
export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    // Sucursal del almacén; nula si es del negocio completo.
    branchId: uuid("branch_id").references(() => branches.id),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    kind: varchar("kind", { length: 14 }).$type<MovementKind>().notNull(),
    reason: varchar("reason", { length: 10 }),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    reference: varchar("reference", { length: 40 }),
    note: varchar("note", { length: 200 }),
    transferId: uuid("transfer_id").references(() => inventoryTransfers.id),
    countId: uuid("count_id").references(() => inventoryCounts.id),
    reversesId: uuid("reverses_id").references((): AnyPgColumn => inventoryMovements.id),
    // Spec 007, RF-45: la entrada que generó la recepción de una requisición.
    requisitionId: uuid("requisition_id").references((): AnyPgColumn => requisitions.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("inventory_movements_reverses_unique").on(t.reversesId),
    index("inventory_movements_warehouse_idx").on(t.warehouseId, t.createdAt),
    index("inventory_movements_business_idx").on(t.businessId, t.createdAt),
    check("inventory_movements_kind_check", sql`${t.kind} in ('entry', 'exit', 'adjustment', 'transfer_out', 'transfer_in', 'count', 'reversal')`),
    check("inventory_movements_reason_check", sql`${t.reason} is null or ${t.reason} in ('waste', 'expired', 'staff', 'courtesy', 'other')`),
  ],
);

export const inventoryMovementLines = pgTable(
  "inventory_movement_lines",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    movementId: uuid("movement_id")
      .notNull()
      .references(() => inventoryMovements.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    // Cambio con signo y existencia que dejó (RF-61).
    deltaBase: numeric("delta_base", { precision: 20, scale: 6 }).notNull(),
    balanceAfter: numeric("balance_after", { precision: 20, scale: 6 }).notNull(),
    position: integer("position").notNull(),
  },
  (t) => [index("inventory_movement_lines_movement_idx").on(t.movementId), index("inventory_movement_lines_product_idx").on(t.productId, t.id)],
);

// Lista de productos que se cuentan en un área, en orden (RF-40). RF-41 lo comprueba el servicio.
export const areaProducts = pgTable(
  "area_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    areaId: uuid("area_id")
      .notNull()
      .references(() => areas.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    position: integer("position").notNull(),
  },
  (t) => [uniqueIndex("area_products_area_product_unique").on(t.areaId, t.productId), index("area_products_product_idx").on(t.productId)],
);

// Correspondencia recordada al recibir un traspaso entre negocios (RF-33).
export const productLinks = pgTable(
  "product_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromProductId: uuid("from_product_id")
      .notNull()
      .references(() => products.id),
    toBusinessId: uuid("to_business_id")
      .notNull()
      .references(() => businesses.id),
    toProductId: uuid("to_product_id")
      .notNull()
      .references(() => products.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("product_links_from_business_unique").on(t.fromProductId, t.toBusinessId)],
);

// --- Spec 007: requisiciones (plan, sección 2) ---

export const REQUISITION_STATUS_KEYS = ["requested", "approved", "rejected", "cancelled", "closed"] as const;

export const requisitions = pgTable(
  "requisitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    folio: integer("folio").notNull(),
    status: varchar("status", { length: 10 }).$type<(typeof REQUISITION_STATUS_KEYS)[number]>().notNull(),
    note: varchar("note", { length: 200 }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("requisitions_business_folio_unique").on(t.businessId, t.folio),
    index("requisitions_branch_idx").on(t.branchId, t.createdAt),
    check("requisitions_status_check", sql`${t.status} in ('requested', 'approved', 'rejected', 'cancelled', 'closed')`),
  ],
);

export const requisitionLines = pgTable(
  "requisition_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requisitionId: uuid("requisition_id")
      .notNull()
      .references(() => requisitions.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    presentationId: uuid("presentation_id").references(() => productPresentations.id),
    requestedBase: numeric("requested_base", { precision: 20, scale: 6 }).notNull(),
    quantityBase: numeric("quantity_base", { precision: 20, scale: 6 }).notNull(),
    receivedBase: numeric("received_base", { precision: 20, scale: 6 }).notNull().default("0"),
    amountCents: bigint("amount_cents", { mode: "bigint" }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by").references(() => users.id),
    closeReason: varchar("close_reason", { length: 200 }),
    position: integer("position").notNull(),
  },
  (t) => [
    uniqueIndex("requisition_lines_product_unique").on(t.requisitionId, t.productId),
    check("requisition_lines_quantity_positive", sql`${t.quantityBase} > 0`),
    check("requisition_lines_amount_non_negative", sql`${t.amountCents} is null or ${t.amountCents} >= 0`),
  ],
);

export const requisitionGroups = pgTable(
  "requisition_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requisitionId: uuid("requisition_id")
      .notNull()
      .references(() => requisitions.id),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    buyer: varchar("buyer", { length: 60 }),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }),
    purchasedBy: uuid("purchased_by").references(() => users.id),
    totalCents: bigint("total_cents", { mode: "bigint" }),
  },
  (t) => [
    uniqueIndex("requisition_groups_supplier_unique").on(t.requisitionId, t.supplierId).where(sql`${t.supplierId} is not null`),
    uniqueIndex("requisition_groups_no_supplier_unique").on(t.requisitionId).where(sql`${t.supplierId} is null`),
    check("requisition_groups_total_non_negative", sql`${t.totalCents} is null or ${t.totalCents} >= 0`),
  ],
);

// Historial de cada paso (RF-44).
export const requisitionEvents = pgTable(
  "requisition_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    requisitionId: uuid("requisition_id")
      .notNull()
      .references(() => requisitions.id),
    kind: varchar("kind", { length: 20 }).notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    at: timestamp("at", { withTimezone: true }).notNull(),
    detail: jsonb("detail"),
  },
  (t) => [index("requisition_events_requisition_idx").on(t.requisitionId, t.id)],
);

export const purchaseTemplates = pgTable(
  "purchase_templates",
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
  (t) => [uniqueIndex("purchase_templates_active_name_unique").on(t.branchId, t.nameKey).where(activeOnly)],
);

export const purchaseTemplateItems = pgTable(
  "purchase_template_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => purchaseTemplates.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    presentationId: uuid("presentation_id").references(() => productPresentations.id),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    quantityBase: numeric("quantity_base", { precision: 20, scale: 6 }).notNull(),
    position: integer("position").notNull(),
  },
  (t) => [uniqueIndex("purchase_template_items_unique").on(t.templateId, t.productId)],
);

// --- Spec 008: personal (plan, sección 2) ---

export const positions = pgTable(
  "positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    name: varchar("name", { length: 80 }).notNull(),
    nameKey: varchar("name_key", { length: 80 }).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [uniqueIndex("positions_active_name_unique").on(t.businessId, t.nameKey).where(activeOnly)],
);

export const employees = pgTable(
  "employees",
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
    positionId: uuid("position_id")
      .notNull()
      .references(() => positions.id),
    phone: varchar("phone", { length: 30 }),
    notes: varchar("notes", { length: 500 }),
    // RF-13: solo el dueño lo ve y lo cambia; nulo = sin sueldo (RF-14).
    dailyPayCents: bigint("daily_pay_cents", { mode: "bigint" }),
    active: boolean("active").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [index("employees_branch_idx").on(t.branchId, t.active), check("employees_pay_positive", sql`${t.dailyPayCents} is null or ${t.dailyPayCents} > 0`)],
);

// Cada periodo de trabajo (RF-33): el actual no tiene fecha de baja.
export const employeePeriods = pgTable(
  "employee_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id),
    hiredOn: date("hired_on", { mode: "string" }).notNull(),
    leftOn: date("left_on", { mode: "string" }),
    leaveReason: varchar("leave_reason", { length: 12 }),
    leaveNote: varchar("leave_note", { length: 200 }),
  },
  (t) => [
    index("employee_periods_employee_idx").on(t.employeeId),
    uniqueIndex("employee_periods_open_unique").on(t.employeeId).where(sql`left_on is null`),
    check("employee_periods_dates", sql`${t.leftOn} is null or ${t.leftOn} >= ${t.hiredOn}`),
  ],
);

export const documentTypes = pgTable(
  "document_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    name: varchar("name", { length: 80 }).notNull(),
    nameKey: varchar("name_key", { length: 80 }).notNull(),
    required: boolean("required").notNull().default(true),
    validityMonths: smallint("validity_months"),
    position: integer("position").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("document_types_active_name_unique").on(t.businessId, t.nameKey).where(activeOnly), check("document_types_validity", sql`${t.validityMonths} is null or ${t.validityMonths} between 1 and 120`)],
);

export const employeeFiles = pgTable(
  "employee_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id),
    documentTypeId: uuid("document_type_id")
      .notNull()
      .references(() => documentTypes.id),
    // Clave aleatoria en el almacén de archivos: no revela a la persona (RNF «Datos personales protegidos»).
    storageKey: varchar("storage_key", { length: 80 }).notNull(),
    originalName: varchar("original_name", { length: 200 }).notNull(),
    contentType: varchar("content_type", { length: 40 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    issuedOn: date("issued_on", { mode: "string" }),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull(),
    replacedAt: timestamp("replaced_at", { withTimezone: true }),
    replacedBy: uuid("replaced_by").references(() => users.id),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    retiredBy: uuid("retired_by").references(() => users.id),
    retireReason: varchar("retire_reason", { length: 200 }),
  },
  (t) => [index("employee_files_employee_idx").on(t.employeeId, t.documentTypeId), uniqueIndex("employee_files_storage_key_unique").on(t.storageKey)],
);

// Nómina semanal (spec 009): una por sucursal y lunes; al cerrar se congela el total (RF-1, RF-2, RF-35).
export const PAYROLL_WEEK_STATUS = ["open", "closed"] as const;
export const payrollWeeks = pgTable(
  "payroll_weeks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    weekStart: date("week_start", { mode: "string" }).notNull(),
    status: varchar("status", { length: 6 }).$type<(typeof PAYROLL_WEEK_STATUS)[number]>().notNull(),
    totalCents: bigint("total_cents", { mode: "bigint" }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by").references(() => users.id),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("payroll_weeks_branch_start_unique").on(t.branchId, t.weekStart),
    check("payroll_weeks_status_check", sql`${t.status} in ('open', 'closed')`),
    check("payroll_weeks_monday", sql`extract(isodow from ${t.weekStart}) = 1`),
  ],
);

// Un renglón por empleado y semana; los montos capturados y, al cerrar, lo calculado congelado (RF-20, RF-35).
export const payrollLines = pgTable(
  "payroll_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weekId: uuid("week_id")
      .notNull()
      .references(() => payrollWeeks.id),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id),
    extrasCents: bigint("extras_cents", { mode: "bigint" }).notNull().default(sql`0`),
    bonusCents: bigint("bonus_cents", { mode: "bigint" }).notNull().default(sql`0`),
    bonusConcept: varchar("bonus_concept", { length: 80 }),
    mealCents: bigint("meal_cents", { mode: "bigint" }).notNull().default(sql`0`),
    dailyPayCents: bigint("daily_pay_cents", { mode: "bigint" }),
    positionName: varchar("position_name", { length: 80 }),
    daysCount: smallint("days_count"),
    halfCount: smallint("half_count"),
    lateCount: smallint("late_count"),
    daysCents: bigint("days_cents", { mode: "bigint" }),
    lateCents: bigint("late_cents", { mode: "bigint" }),
    loanCents: bigint("loan_cents", { mode: "bigint" }),
    netCents: bigint("net_cents", { mode: "bigint" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("payroll_lines_week_employee_unique").on(t.weekId, t.employeeId),
    index("payroll_lines_employee_idx").on(t.employeeId),
    check("payroll_lines_amounts", sql`${t.extrasCents} >= 0 and ${t.bonusCents} >= 0 and ${t.mealCents} >= 0`),
  ],
);

// Un día marcado (RF-13, RF-14): 0 = lunes … 6 = domingo; un día vacío no tiene fila.
export const payrollDays = pgTable(
  "payroll_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lineId: uuid("line_id")
      .notNull()
      .references(() => payrollLines.id),
    day: smallint("day").notNull(),
    state: varchar("state", { length: 6 }).$type<"worked" | "half">().notNull(),
    late: boolean("late").notNull().default(false),
    updatedBy: uuid("updated_by").references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("payroll_days_line_day_unique").on(t.lineId, t.day),
    check("payroll_days_day_range", sql`${t.day} between 0 and 6`),
    check("payroll_days_state_check", sql`${t.state} in ('worked', 'half')`),
  ],
);

// Préstamos con abono semanal (RF-27 a RF-33).
export const loans = pgTable(
  "loans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id),
    lentOn: date("lent_on", { mode: "string" }).notNull(),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    weeklyCents: bigint("weekly_cents", { mode: "bigint" }).notNull(),
    balanceCents: bigint("balance_cents", { mode: "bigint" }).notNull(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    index("loans_employee_idx").on(t.employeeId),
    check("loans_amounts", sql`${t.amountCents} > 0 and ${t.weeklyCents} > 0 and ${t.weeklyCents} <= ${t.amountCents} and ${t.balanceCents} >= 0 and ${t.balanceCents} <= ${t.amountCents}`),
  ],
);

// Abono de un préstamo en una semana: fijado por el dueño o escrito al cerrar (`applied`) (RF-30 a RF-32, RF-39).
export const loanPayments = pgTable(
  "loan_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loanId: uuid("loan_id")
      .notNull()
      .references(() => loans.id),
    weekId: uuid("week_id")
      .notNull()
      .references(() => payrollWeeks.id),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    applied: boolean("applied").notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("loan_payments_loan_week_unique").on(t.loanId, t.weekId), index("loan_payments_week_idx").on(t.weekId), check("loan_payments_amount", sql`${t.amountCents} >= 0`)],
);

// Checklists (spec 010): plantillas del negocio, con sus sucursales y días (máscara, 0 = lunes) (RF-1, RF-6 a RF-8).
export const checklistTemplates = pgTable(
  "checklist_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    name: varchar("name", { length: 80 }).notNull(),
    nameKey: varchar("name_key", { length: 80 }).notNull(),
    daysMask: smallint("days_mask").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("checklist_templates_active_name_unique").on(t.businessId, t.nameKey).where(sql`archived_at is null`),
    check("checklist_templates_days", sql`${t.daysMask} between 1 and 127`),
  ],
);

export const checklistTemplateBranches = pgTable(
  "checklist_template_branches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => checklistTemplates.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
  },
  (t) => [uniqueIndex("checklist_template_branches_unique").on(t.templateId, t.branchId), index("checklist_template_branches_branch_idx").on(t.branchId)],
);

export const checklistSections = pgTable(
  "checklist_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => checklistTemplates.id),
    name: varchar("name", { length: 80 }).notNull(),
    positionId: uuid("position_id").references(() => positions.id),
    sort: integer("sort").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [index("checklist_sections_template_idx").on(t.templateId)],
);

export const CHECKLIST_ITEM_KINDS = ["check", "photo", "comment"] as const;
export const checklistItems = pgTable(
  "checklist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => checklistSections.id),
    text: varchar("text", { length: 200 }).notNull(),
    kind: varchar("kind", { length: 8 }).$type<(typeof CHECKLIST_ITEM_KINDS)[number]>().notNull(),
    isKey: boolean("is_key").notNull().default(false),
    sort: integer("sort").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("checklist_items_section_idx").on(t.sectionId),
    check("checklist_items_kind_check", sql`${t.kind} in ('check', 'photo', 'comment')`),
    check("checklist_items_key_kind", sql`not ${t.isKey} or ${t.kind} <> 'comment'`),
  ],
);

// Teléfono de piso (RF-37 a RF-44): sesión de una sucursal, sin cuenta; en BD solo el hash de su token.
export const floorDevices = pgTable(
  "floor_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    name: varchar("name", { length: 40 }).notNull(),
    tokenHash: text("token_hash").notNull(),
    enabledBy: uuid("enabled_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    disabledBy: uuid("disabled_by").references(() => users.id),
  },
  (t) => [uniqueIndex("floor_devices_token_hash_unique").on(t.tokenHash), index("floor_devices_branch_idx").on(t.branchId)],
);

// La hoja de un día (RF-15): una por plantilla, sucursal y fecha; al cerrar con pendientes guarda qué faltó (RF-33).
export const checklistSheets = pgTable(
  "checklist_sheets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => checklistTemplates.id),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    date: date("date", { mode: "string" }).notNull(),
    templateName: varchar("template_name", { length: 80 }).notNull(),
    status: varchar("status", { length: 6 }).$type<"open" | "closed">().notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by").references(() => users.id),
    pending: jsonb("pending"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("checklist_sheets_day_unique").on(t.templateId, t.branchId, t.date),
    index("checklist_sheets_branch_idx").on(t.branchId, t.date),
    check("checklist_sheets_status_check", sql`${t.status} in ('open', 'closed')`),
  ],
);

// Copia de las secciones al abrir la hoja y quién la dio por lista (RF-15, RF-27, RF-41).
export const checklistSheetSections = pgTable(
  "checklist_sheet_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sheetId: uuid("sheet_id")
      .notNull()
      .references(() => checklistSheets.id),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => checklistSections.id),
    name: varchar("name", { length: 80 }).notNull(),
    positionId: uuid("position_id").references(() => positions.id),
    sort: integer("sort").notNull(),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    readyBy: varchar("ready_by", { length: 160 }),
    readyUserId: uuid("ready_user_id").references(() => users.id),
    readyEmployeeId: uuid("ready_employee_id").references(() => employees.id),
    readyDeviceId: uuid("ready_device_id").references(() => floorDevices.id),
  },
  (t) => [uniqueIndex("checklist_sheet_sections_unique").on(t.sheetId, t.sectionId)],
);

// Copia de los puntos al abrir y lo que se marcó en cada uno (RF-15, RF-20 a RF-24, RF-41).
export const checklistSheetItems = pgTable(
  "checklist_sheet_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sheetSectionId: uuid("sheet_section_id")
      .notNull()
      .references(() => checklistSheetSections.id),
    itemId: uuid("item_id")
      .notNull()
      .references(() => checklistItems.id),
    text: varchar("text", { length: 200 }).notNull(),
    kind: varchar("kind", { length: 8 }).$type<(typeof CHECKLIST_ITEM_KINDS)[number]>().notNull(),
    isKey: boolean("is_key").notNull(),
    sort: integer("sort").notNull(),
    done: boolean("done").notNull().default(false),
    comment: varchar("comment", { length: 500 }),
    photoKey: varchar("photo_key", { length: 80 }),
    photoType: varchar("photo_type", { length: 40 }),
    markedAt: timestamp("marked_at", { withTimezone: true }),
    markedBy: varchar("marked_by", { length: 160 }),
    markedUserId: uuid("marked_user_id").references(() => users.id),
    markedEmployeeId: uuid("marked_employee_id").references(() => employees.id),
    markedDeviceId: uuid("marked_device_id").references(() => floorDevices.id),
  },
  (t) => [uniqueIndex("checklist_sheet_items_unique").on(t.sheetSectionId, t.itemId), uniqueIndex("checklist_sheet_items_photo_unique").on(t.photoKey)],
);

// Corte de caja (spec 011): configuración por sucursal (RF-6, RF-10).
export const cashSettings = pgTable(
  "cash_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    mode: varchar("mode", { length: 8 }).$type<"daily" | "multiple">().notNull(),
    floorEnabled: boolean("floor_enabled").notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("cash_settings_branch_unique").on(t.branchId), check("cash_settings_mode_check", sql`${t.mode} in ('daily', 'multiple')`)],
);

// Formas de pago de la sucursal; Efectivo (`is_cash`) siempre existe (RF-7 a RF-9).
export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    name: varchar("name", { length: 40 }).notNull(),
    nameKey: varchar("name_key", { length: 40 }).notNull(),
    isCash: boolean("is_cash").notNull().default(false),
    sort: integer("sort").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("payment_methods_active_name_unique").on(t.branchId, t.nameKey).where(sql`archived_at is null`),
    uniqueIndex("payment_methods_cash_unique").on(t.branchId).where(sql`is_cash`),
  ],
);

// Un corte: abierto → contado → cerrado; uno no cerrado por sucursal (RF-11 a RF-14, RF-22, RF-34 a RF-39).
export const cashCuts = pgTable(
  "cash_cuts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    date: date("date", { mode: "string" }).notNull(),
    status: varchar("status", { length: 8 }).$type<"open" | "counted" | "closed">().notNull(),
    openingFundCents: bigint("opening_fund_cents", { mode: "bigint" }).notNull(),
    cashPieces: jsonb("cash_pieces").$type<Record<string, number>>(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
    openedBy: varchar("opened_by", { length: 160 }).notNull(),
    openedUserId: uuid("opened_user_id").references(() => users.id),
    openedEmployeeId: uuid("opened_employee_id").references(() => employees.id),
    openedDeviceId: uuid("opened_device_id").references(() => floorDevices.id),
    countedAt: timestamp("counted_at", { withTimezone: true }),
    countedBy: varchar("counted_by", { length: 160 }),
    countedUserId: uuid("counted_user_id").references(() => users.id),
    countedEmployeeId: uuid("counted_employee_id").references(() => employees.id),
    countedDeviceId: uuid("counted_device_id").references(() => floorDevices.id),
    posAt: timestamp("pos_at", { withTimezone: true }),
    posBy: uuid("pos_by").references(() => users.id),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by").references(() => users.id),
    note: varchar("note", { length: 300 }),
    snapshot: jsonb("snapshot"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("cash_cuts_one_open_unique").on(t.branchId).where(sql`status <> 'closed'`),
    index("cash_cuts_branch_idx").on(t.branchId, t.date),
    check("cash_cuts_status_check", sql`${t.status} in ('open', 'counted', 'closed')`),
    check("cash_cuts_fund", sql`${t.openingFundCents} >= 0`),
  ],
);

// Formas de pago del corte, copiadas al abrir, con lo contado y lo que reporta el punto de venta (RF-20, RF-23).
export const cashCutMethods = pgTable(
  "cash_cut_methods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cutId: uuid("cut_id")
      .notNull()
      .references(() => cashCuts.id),
    methodId: uuid("method_id")
      .notNull()
      .references(() => paymentMethods.id),
    name: varchar("name", { length: 40 }).notNull(),
    isCash: boolean("is_cash").notNull(),
    sort: integer("sort").notNull(),
    countedCents: bigint("counted_cents", { mode: "bigint" }),
    posCents: bigint("pos_cents", { mode: "bigint" }),
  },
  (t) => [uniqueIndex("cash_cut_methods_unique").on(t.cutId, t.methodId), check("cash_cut_methods_amounts", sql`(${t.countedCents} is null or ${t.countedCents} >= 0) and (${t.posCents} is null or ${t.posCents} >= 0)`)],
);

// Gastos, retiros e ingresos de caja; se cancelan con motivo, sin borrarse (RF-15 a RF-17).
export const cashMovements = pgTable(
  "cash_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cutId: uuid("cut_id")
      .notNull()
      .references(() => cashCuts.id),
    kind: varchar("kind", { length: 10 }).$type<"expense" | "withdrawal" | "income">().notNull(),
    concept: varchar("concept", { length: 80 }).notNull(),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    createdBy: varchar("created_by", { length: 160 }).notNull(),
    userId: uuid("user_id").references(() => users.id),
    employeeId: uuid("employee_id").references(() => employees.id),
    deviceId: uuid("device_id").references(() => floorDevices.id),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: varchar("cancelled_by", { length: 160 }),
    cancelReason: varchar("cancel_reason", { length: 200 }),
  },
  (t) => [
    index("cash_movements_cut_idx").on(t.cutId),
    check("cash_movements_kind_check", sql`${t.kind} in ('expense', 'withdrawal', 'income')`),
    check("cash_movements_amount", sql`${t.amountCents} > 0`),
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
export type Stock = typeof stock.$inferSelect;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InventoryMovementLine = typeof inventoryMovementLines.$inferSelect;
export type InventoryTransfer = typeof inventoryTransfers.$inferSelect;
export type InventoryTransferLine = typeof inventoryTransferLines.$inferSelect;
export type InventoryCount = typeof inventoryCounts.$inferSelect;
export type InventoryCountLine = typeof inventoryCountLines.$inferSelect;
export type AreaProduct = typeof areaProducts.$inferSelect;
export type ProductLink = typeof productLinks.$inferSelect;
export type Requisition = typeof requisitions.$inferSelect;
export type RequisitionLine = typeof requisitionLines.$inferSelect;
export type RequisitionGroup = typeof requisitionGroups.$inferSelect;
export type RequisitionEvent = typeof requisitionEvents.$inferSelect;
export type PurchaseTemplate = typeof purchaseTemplates.$inferSelect;
export type PurchaseTemplateItem = typeof purchaseTemplateItems.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type EmployeePeriod = typeof employeePeriods.$inferSelect;
export type DocumentType = typeof documentTypes.$inferSelect;
export type EmployeeFile = typeof employeeFiles.$inferSelect;
export type PayrollWeek = typeof payrollWeeks.$inferSelect;
export type PayrollLine = typeof payrollLines.$inferSelect;
export type PayrollDay = typeof payrollDays.$inferSelect;
export type Loan = typeof loans.$inferSelect;
export type LoanPayment = typeof loanPayments.$inferSelect;
export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type ChecklistTemplateBranch = typeof checklistTemplateBranches.$inferSelect;
export type ChecklistSection = typeof checklistSections.$inferSelect;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type FloorDevice = typeof floorDevices.$inferSelect;
export type ChecklistSheet = typeof checklistSheets.$inferSelect;
export type ChecklistSheetSection = typeof checklistSheetSections.$inferSelect;
export type ChecklistSheetItem = typeof checklistSheetItems.$inferSelect;
export type CashSettings = typeof cashSettings.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type CashCut = typeof cashCuts.$inferSelect;
export type CashCutMethod = typeof cashCutMethods.$inferSelect;
export type CashMovement = typeof cashMovements.$inferSelect;
