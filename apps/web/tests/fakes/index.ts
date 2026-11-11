import type { Ports } from "@/server/ports";
import { FakeClock } from "./clock";
import { fakeHasher } from "./hasher";
import { FakeRandom } from "./random";

export { FakeClock, FakeRandom, fakeHasher };

export function fakePorts(clock = new FakeClock()): Ports & { clock: FakeClock } {
  return { clock, hasher: fakeHasher, random: new FakeRandom() };
}
