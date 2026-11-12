import type { Clock } from "./clock";
import type { PasswordHasher } from "./password-hasher";
import type { RandomSource } from "./random";
import type { TokenSource } from "./tokens";

export type { Clock, PasswordHasher, RandomSource, TokenSource };
export type * from "./repos";

/** Todo lo que un servicio necesita del mundo exterior, inyectable. */
export interface Ports {
  clock: Clock;
  hasher: PasswordHasher;
  random: RandomSource;
  tokens: TokenSource;
}
export type * from "./catalog";
