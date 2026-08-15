import { denyUnless } from "@/app/dashboard/_shell/guard";
import { ApplyRouteBody } from "../../../_member/ApplyRouteBody";

/**
 * **تعديلُ** الترشّح — يلي صفحةَ الترشّح (`/my/[electionId]/edit`) فيقرأ فتاتُها «بوّابة أديب ‹
 * سِجلّ ترشُّحي ‹ بيان الترشّح» ويعود إليها. يصلها العضو من زرّ التعديل في صفحة ترشّحه.
 * محروسةٌ بحارس السجلّ، والأهليّةُ يفرضها `submit_candidacy` في القاعدة.
 */
export default async function EditCandidacyPage({ params }: { params: Promise<{ electionId: string }> }) {
  const denied = await denyUnless("/dashboard/elections/my");
  if (denied) return denied;
  const { electionId } = await params;
  return <ApplyRouteBody electionId={electionId} />;
}
