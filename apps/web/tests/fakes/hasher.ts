import type { PasswordHasher } from "@/server/ports/password-hasher";

/** Hash falso y rápido para tests unitarios: no se usa nunca fuera de ellos. */
export const fakeHasher: PasswordHasher = {
  hash: async (p) => `fake$${p}`,
  verify: async (h, p) => h === `fake$${p}`,
};
