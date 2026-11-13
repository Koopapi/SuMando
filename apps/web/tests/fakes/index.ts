import type { Ports } from "@/server/ports";
import { FakeClock } from "./clock";
import { MemoryFiles } from "./files";
import { fakeHasher } from "./hasher";
import { FakeRandom } from "./random";
import { FakeTokens } from "./tokens";

export { FakeClock, FakeRandom, FakeTokens, MemoryFiles, fakeHasher };

export function fakePorts(clock = new FakeClock()): Ports & { clock: FakeClock } {
  return { clock, hasher: fakeHasher, random: new FakeRandom(), tokens: new FakeTokens(), files: new MemoryFiles() };
}
