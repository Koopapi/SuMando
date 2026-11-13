// Esquema de la spec 001 (plan, sección 2). Solo cambia por migración de Drizzle. Nada se borra: `archived_at`,
// `is_active` y `revoked_at` marcan lo que dejó de estar vigente.
import { sql } from "drizzle-orm";
import {
  bigint,
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
