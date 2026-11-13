// RF-32 a RF-34, RF-36, RF-38: qué sucursal queda activa en cada petición.
export type ActiveBranchResolution<B> = { kind: "keep" | "remembered" | "only"; branch: B } | { kind: "choose" } | { kind: "none" };

export function resolveActiveBranch<B extends { id: string }>(input: { accessible: B[]; sessionBranchId: string | null; rememberedBranchId: string | null }): ActiveBranchResolution<B> {
  const { accessible } = input;
  if (accessible.length === 0) return { kind: "none" };
  const current = accessible.find((b) => b.id === input.sessionBranchId);
  if (current) return { kind: "keep", branch: current };
  const remembered = accessible.find((b) => b.id === input.rememberedBranchId);
  if (remembered) return { kind: "remembered", branch: remembered };
  if (accessible.length === 1) return { kind: "only", branch: accessible[0] };
  return { kind: "choose" };
}
