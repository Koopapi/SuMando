/** Hash irreversible de contraseñas (constitución, principio 9). */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}
