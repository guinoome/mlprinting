import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { getDraft } from "@/features/invitation-builder/repository";
import { resolveStep } from "@/features/invitation-builder/steps";
import { routes } from "@/lib/config";

/**
 * Resume — Ph3.md §11 (Resume Draft).
 *
 * /builder/<id> sends the customer back to where they left off. The step lives
 * on the row rather than in a cookie, so resuming works on a different device.
 */
export const dynamic = "force-dynamic";

export default async function BuilderIndexPage({
  params,
}: {
  params: { id: string };
}) {
  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const draft = await getDraft(profile.id, params.id);
  // The layout has already 404'd a missing draft; this is belt and braces for a
  // direct hit on this route.
  if (!draft) redirect(routes.dashboard.events);

  redirect(`${routes.builder}/${draft.id}/${resolveStep(draft.currentStep)}`);
}
