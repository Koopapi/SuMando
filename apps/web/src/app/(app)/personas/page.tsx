// RF-11, RF-23 a RF-31: personas y accesos, solo para el dueño.
import { PeopleManager } from "@/features/people/people-manager";
import { appCtx } from "@/server/app-context";
import { requireOwnerPage } from "@/server/auth/page-guards";
import { businessView, listBusinesses } from "@/server/services/businesses";
import { listPeople } from "@/server/services/people";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const session = await requireOwnerPage();
  const ctx = appCtx();
  const [people, businesses] = await Promise.all([listPeople(ctx, session.user), listBusinesses(ctx, session.user)]);
  const active = businesses.filter((b) => !b.archivedAt).map((b) => businessView({ ...b, branches: b.branches.filter((br) => !br.archivedAt) }));
  return (
    <PageShell>
      <PeopleManager people={people} businesses={active} selfId={session.user.id} />
    </PageShell>
  );
}
