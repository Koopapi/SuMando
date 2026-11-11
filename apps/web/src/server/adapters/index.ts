import type { Ports } from "../ports";
import { argon2Hasher } from "./argon2-hasher";
import { cryptoRandom } from "./crypto-random";
import { cryptoTokens } from "./crypto-tokens";
import { systemClock } from "./system-clock";

/** Los adaptadores reales; los handlers los pasan a los servicios. */
export const ports: Ports = { clock: systemClock, hasher: argon2Hasher, random: cryptoRandom, tokens: cryptoTokens };
