import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getMyCandidacies } from "../../member-data";
import { MyCandidacyRoom } from "@/app/_ad/rooms/MyCandidacyRoom";
import { AdRoomError, AdRoomMissing } from "@/app/_ad/states";

/**
 * **صفحةُ الترشّح** — تحت «سِجلّ ترشُّحي» (`/my/[electionId]`)، بالهويّة (٢٠٢٦-١١-١٧، رحلةُ العضو ع٦): التذكرةُ بأفعالها، وما ينتظره،
 * والبيانُ والملفّ، وطلبُ الاستبعاد وإجابتُه، والرحلة. والتعديلُ صفحةٌ تليها (`/my/[electionId]/edit`). محروسةٌ بحارس السجلّ نفسِه،
 * والترشّحُ يُنتقى من قائمة العضو نفسِها — فلا يرى أحدٌ ترشّحَ غيره ولو خمّن العنوان.
 */
export default async function CandidacyPage({ params }: { params: Promise<{ electionId: string }> }) {
  const denied = await denyUnless("/dashboard/elections/my");
  if (denied) return denied;

  const me = await getCurrentAdmin();
  if (!me) return null; // لا يقع بعد مرور الحارس؛ لطمأنة الأنواع

  const { electionId } = await params;
  const { items, error } = await getMyCandidacies(me.id);
  const c = items.find((x) => x.electionId === electionId);
  if (error) return <AdRoomError title="الترشّح" navPath="/dashboard/elections/my" what="الترشّح" message={error} />;
  if (!c) return <AdRoomMissing title="الترشّح" navPath="/dashboard/elections/my" what="الترشّح" desc="لا ترشّحَ لك في هذا الانتخاب." back={{ label: "سِجلّ ترشُّحي", href: "/dashboard/elections/my" }} />;
  return <MyCandidacyRoom c={c} />;
}
