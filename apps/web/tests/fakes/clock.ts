import type { Clock } from "@/server/ports/clock";

/** Reloj controlable: empieza en una fecha fija y avanza solo cuando el test lo pide. */
export class FakeClock implements Clock {
  private t: number;
  constructor(start = new Date("2026-11-11T12:00:00Z")) {
    this.t = start.getTime();
  }
  now() {
    return new Date(this.t);
  }
  advance(ms: number) {
    this.t += ms;
  }
  advanceMinutes(min: number) {
    this.advance(min * 60_000);
  }
  advanceDays(days: number) {
    this.advance(days * 86_400_000);
  }
}
