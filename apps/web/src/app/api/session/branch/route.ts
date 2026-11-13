// RF-32, RF-34, RF-35, RF-37: elegir la sucursal activa.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireSession } from "@/server/auth/session";
import { handler, readJson } from "@/server/http";
import { activeBranchView, selectBranch } from "@/server/services/active-branch";

export const PUT = handler(async (request: Request) => {
  const session = await requireSession(request);
  const { branchId } = await readJson(request, z.object({ branchId: z.string() }));
  return Response.json({ activeBranch: activeBranchView(await selectBranch(appCtx(), session, branchId)) });
});
