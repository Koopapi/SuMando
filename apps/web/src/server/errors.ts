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
