// Error de negocio: código + parámetros; el mensaje en español sale del diccionario al responder.
import { translateError, type ErrorCode } from "@/i18n";

const STATUS: Record<ErrorCode, number> = {
  validation: 422,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  dev_only: 404,
  setup_done: 409,
  invalid_credentials: 401,
  account_locked: 423,
  password_too_short: 422,
  password_mismatch: 422,
  password_change_required: 403,
  name_invalid: 422,
  duplicate_name: 409,
  duplicate_email: 409,
  last_owner: 409,
  no_branch: 409,
  business_archived: 409,
  invalid_color: 422,
  nothing_to_update: 422,
  catalog_name_invalid: 422,
  invalid_unit: 422,
  invalid_factor: 422,
  invalid_quantity: 422,
  max_below_min: 422,
  base_unit_locked: 409,
  supplier_archived: 409,
  invalid_responsible: 422,
  recipe_empty: 422,
  duplicate_ingredient: 422,
  invalid_ingredient_quantity: 422,
  invalid_half_percent: 422,
  invalid_pieces: 422,
  calculation_empty: 422,
  template_exists: 409,
  invalid_file: 422,
  file_too_large: 413,
  product_archived: 409,
  invalid_line_quantity: 422,
  invalid_adjustment: 422,
  duplicate_line: 422,
  movement_empty: 422,
  reason_required: 422,
  archived_item: 409,
  same_warehouse: 422,
  transfer_state: 409,
  product_required: 422,
  unit_mismatch: 422,
  product_in_area: 409,
  area_without_warehouse: 409,
  count_changed: 409,
  not_cancellable: 409,
  import_empty: 422,
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    readonly params?: Record<string, string | number>,
  ) {
    super(translateError(code, params));
    this.name = "AppError";
    this.status = STATUS[code];
  }

  toJSON() {
    return { error: { code: this.code, message: this.message, ...(this.params ? { params: this.params } : {}) } };
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;
