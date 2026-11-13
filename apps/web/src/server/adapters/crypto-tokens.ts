import { createHash, randomBytes } from "node:crypto";
import type { TokenSource } from "../ports/tokens";

export const cryptoTokens: TokenSource = {
  generate: () => randomBytes(32).toString("base64url"),
  hash: (token) => createHash("sha256").update(token).digest("hex"),
};
