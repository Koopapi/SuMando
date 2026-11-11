/** Tokens de sesión: uno nuevo aleatorio y su hash irreversible (en BD solo se guarda el hash). */
export interface TokenSource {
  generate(): string;
  hash(token: string): string;
}
