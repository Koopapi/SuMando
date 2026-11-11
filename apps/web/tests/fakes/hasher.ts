import type { PasswordHasher } from "@/server/ports/password-hasher";

/** Hash falso y rápido para tests: ofuscado (base64) para que ningún test confunda el hash con el texto. */
const encode = (p: string) => "fake:" + Buffer.from(p).toString("base64");

export const fakeHasher: PasswordHasher = {
  hash: async (p) => encode(p),
  verify: async (h, p) => h === encode(p),
};
