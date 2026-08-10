import { denyUnless } from "@/app/dashboard/_shell/guard";
import { ApplyRouteBody } from "../../_member/ApplyRouteBody";

/**
 * **تعديلُ** الترشّح — تحت «سِجلّ ترشُّحي» (`/my/[electionId]`) فيقرأ فتاتُها «بوّابة أديب ‹ سِجلّ
 * ترشُّحي ‹ تعديل الترشّح» ويعود إليه. يصلها العضو من زرّ التعديل في سجلّه. محروسةٌ بـ`run_for_election`.
 */
export default async function ApplyFromMy({ params }: { params: Promise<{ electionId: string }> }) {
  const denied = await denyUnless("/dashboard/elections/my");
  if (denied) return denied;
  const { electionId } = await params;
  return <ApplyRouteBody electionId={electionId} />;
}
