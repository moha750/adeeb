import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { Breadcrumb } from "../../../_shell/Breadcrumb";
import { getMyCandidacies } from "../../member-data";
import { CandidacyDetailView } from "./CandidacyDetailView";

/**
 * **صفحةُ الترشّح** — تحت «سِجلّ ترشُّحي» (`/my/[electionId]`): الرحلةُ والبيانُ والتحكّم.
 * والتعديلُ صفحةٌ تليها (`/my/[electionId]/edit`). محروسةٌ بحارس السجلّ نفسِه، والترشّحُ
 * يُنتقى من قائمة العضو نفسِها — فلا يرى أحدٌ ترشّحَ غيره ولو خمّن العنوان.
 */
export default async function CandidacyPage({ params }: { params: Promise<{ electionId: string }> }) {
  const denied = await denyUnless("/dashboard/elections/my");
  if (denied) return denied;

  const me = await getCurrentAdmin();
  if (!me) return null; // لا يقع بعد مرور الحارس؛ لطمأنة الأنواع

  const { electionId } = await params;
  const { items, error } = await getMyCandidacies(me.id);
  const c = items.find((x) => x.electionId === electionId);

  if (!c) {
    return (
      <>
        <div className="ash-phead"><div><Breadcrumb leaf="ترشّح" /><h1>الترشّح</h1></div></div>
        <Alert tone="warning" title="تعذّر فتح الترشّح">{error ?? "لا ترشّحَ لك في هذا الانتخاب."}</Alert>
      </>
    );
  }

  return <CandidacyDetailView c={c} />;
}
