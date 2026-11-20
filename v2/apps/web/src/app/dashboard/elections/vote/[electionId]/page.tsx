import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getBallot, getSeatOutcome, getSeatResult } from "../../member-data";
import { BallotRoomAd } from "@/app/_ad/rooms/BallotRoomAd";
import { SeatResultRoom } from "@/app/_ad/rooms/SeatResultRoom";
import { AdRoomError, AdRoomMissing } from "@/app/_ad/states";

// عنوانُ التبويب اسمُ الغرفة (محمد ٢٠٢٦-١١-٠٣)، وكانت «بوّابة أدِيب» وحدها (٢٠٢٦-١١-٢٠)
export const metadata = { title: "ورقة التصويت، بوّابة أدِيب" };

/** جملةُ «ليس لك» من مصدرها (`getBallot`): ما عداها خطأُ قراءةٍ حقيقيّ يُبلَّغ عنه */
const NOT_YOURS = "هذا الاقتراع غير مفتوحٍ لك الآن.";

/**
 * **ورقةُ التصويت بالهويّة** (`BallotRoomAd`، اعتمدها محمد ٢٠٢٦-١١-١٩؛ رحلةُ العضو ع٨): كرتُ الشخص لكلّ مرشّح، وتصويتُ الثقة برأيه،
 * ثمّ الختم. **صفحةٌ لا نافذة**: الحكمُ على مرشّحٍ يستلزم بيانَه وملفَّه. تحت باب «التصويت»، ومحروسةٌ بقفله (`view_own_membership`).
 * والترتيبُ لصاحب الصفحة (`voterId` ← `ballotOrder`): لا يتصدّر مرشّحٌ عند كلّ الناخبين.
 */
export default async function BallotPage({ params }: { params: Promise<{ electionId: string }> }) {
  const denied = await denyUnless("/dashboard/elections/vote");
  if (denied) return denied;

  const me = await getCurrentAdmin();
  if (!me) return null; // لا يقع بعد مرور الحارس؛ لطمأنة الأنواع

  const { electionId } = await params;
  const ballot = await getBallot(me.id, electionId);

  if (!ballot.ok || !ballot.election) {
    if (!ballot.error || ballot.error === NOT_YOURS) {
      // **وبعد إغلاقها نتيجتُها** (ع١١): إشعارُ «فاز فلان» يقود إلى هنا، والورقةُ لم تعد مفتوحة. والنتيجةُ بلا أرقام، وما قبل الإغلاق لا يُعرض
      const { result } = await getSeatResult(electionId);
      // **وبعد الإعلان الورقةُ نفسُها** لمن صوّت فيها أو ترشّح لها (محمد ٢٠٢٦-١١-١٩): بشارة الفائز وصوتِه، ولا صفحةَ نتيجةٍ مستقلّة.
      // ومن سواهم، والتعيينُ والإلغاءُ وما قبل الإعلان: النتيجةُ القصيرة (`SeatResultRoom`)
      const outcome = result ? await getSeatOutcome(me.id, result) : null;
      if (outcome) return <BallotRoomAd election={outcome.election} candidates={outcome.candidates} myVote={outcome.myVote} voterId={me.id} outcome={{ winnerId: outcome.winnerId, youWon: outcome.youWon, declaredRaw: outcome.declaredRaw }} />;
      if (result && (result.status === "completed" || result.status === "cancelled" || result.status === "voting_closed")) return <SeatResultRoom r={result} />;
      return <AdRoomMissing title="ورقة التصويت" navPath="/dashboard/elections/vote" what="ورقة التصويت" desc={NOT_YOURS} back={{ label: "التصويت", href: "/dashboard/elections/vote" }} />;
    }
    return <AdRoomError title="ورقة التصويت" navPath="/dashboard/elections/vote" what="ورقة التصويت" message={ballot.error} />;
  }

  return <BallotRoomAd election={ballot.election} candidates={ballot.candidates} myVote={ballot.myVote} voterId={me.id} />;
}
