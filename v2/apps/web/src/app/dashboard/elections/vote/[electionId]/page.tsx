import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { Breadcrumb } from "../../../_shell/Breadcrumb";
import { getBallot } from "../../member-data";
import { BallotRoom } from "./BallotRoom";

/**
 * بطاقةُ الاقتراع **صفحةً لا نافذة** (سابقةُ صفحة الترشّح): الحكمُ على مرشّحٍ يستلزم بيانَه
 * كاملًا وملفَّه، وذلك لا يُحشر في نافذةٍ على شاشة جوّال. تحت باب «التصويت» فيقرأ فتاتُها
 * «بوّابة أديب ‹ التصويت ‹ المقعد»، ومحروسةٌ بقفل البابِ نفسِه (`view_own_membership`).
 */
export default async function BallotPage({ params }: { params: Promise<{ electionId: string }> }) {
  const denied = await denyUnless("/dashboard/elections/vote");
  if (denied) return denied;

  const me = await getCurrentAdmin();
  if (!me) return null; // لا يقع بعد مرور الحارس؛ لطمأنة الأنواع

  const { electionId } = await params;
  const ballot = await getBallot(me.id, electionId);

  if (!ballot.ok || !ballot.election) {
    return (
      <>
        <div className="ash-phead"><div><Breadcrumb leaf="بطاقة الاقتراع" /><h1>صوّت الآن</h1></div></div>
        <Alert tone="warning" title="تعذّر فتح بطاقة الاقتراع">{ballot.error ?? "هذا الاقتراع غير مفتوحٍ لك الآن."}</Alert>
      </>
    );
  }

  return <BallotRoom election={ballot.election} candidates={ballot.candidates} myVote={ballot.myVote} />;
}
