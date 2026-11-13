// RF-10: contraseña mínima de 8 caracteres.
export const PASSWORD_MIN = 8;

export function passwordProblem(password: string): "too_short" | null {
  return password.length < PASSWORD_MIN ? "too_short" : null;
}
