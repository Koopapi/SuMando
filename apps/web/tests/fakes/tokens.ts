import type { TokenSource } from "@/server/ports/tokens";

/** Tokens predecibles: `tok-1`, `tok-2`… y hash `h:<token>`. */
export class FakeTokens implements TokenSource {
  private n = 0;
  generate() {
    return `tok-${++this.n}`;
  }
  hash(token: string) {
    return `h:${token}`;
  }
}
