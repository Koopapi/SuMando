import { hash, verify } from "@node-rs/argon2";
import type { PasswordHasher } from "../ports/password-hasher";

// Argon2id con los parámetros por defecto de la librería (memoria 19 MiB, 2 iteraciones, paralelismo 1).
export const argon2Hasher: PasswordHasher = {
  hash: (password) => hash(password),
  verify: (digest, password) => verify(digest, password).catch(() => false),
};
