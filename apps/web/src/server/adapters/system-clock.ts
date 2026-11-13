import type { Clock } from "../ports/clock";
import { now } from "../clock";

export const systemClock: Clock = { now };
