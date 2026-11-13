import type { Clock } from "./clock";
import type { FileStore } from "./files";
import type { PasswordHasher } from "./password-hasher";
import type { RandomSource } from "./random";
import type { TokenSource } from "./tokens";

export type { Clock, FileStore, PasswordHasher, RandomSource, TokenSource };
export type * from "./repos";

/** Todo lo que un servicio necesita del mundo exterior, inyectable. */
export interface Ports {
  clock: Clock;
  hasher: PasswordHasher;
  random: RandomSource;
  tokens: TokenSource;
  files: FileStore;
}
export type * from "./catalog";
export type * from "./recipes";
