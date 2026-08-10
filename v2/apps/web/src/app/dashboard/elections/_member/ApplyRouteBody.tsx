import { Alert } from "@adeeb/design-system";
import { getCurrentAdmin } from "@/lib/auth";
import { Breadcrumb } from "../../_shell/Breadcrumb";
import { getApplyContext } from "../member-data";
import { ApplyForm } from "./ApplyForm";

/**
 * جسمُ صفحة إكمال الترشّح — مصدرٌ واحدٌ لمسارَين يفترقان في **الفتات فقط** (يُشتقّ من المسار):
 * `‎/run/[id]` للترشُّح الجديد (فتاتُه «الترشُّح»)، و`‎/my/[id]` لتعديل ترشّحٍ قائم (فتاتُه «سِجلّ
 * ترشُّحي») — فيدخل التعديلُ من حيث يعيش ويعود إليه. الوضعُ (جديد/تعديل) يُشتقّ من وجود ترشّحٍ قائم.
 */
export async function ApplyRouteBody({ electionId }: { electionId: string }) {
  const me = await getCurrentAdmin();
  if (!me) return null; // لا يقع بعد مرور الحارس؛ لطمأنة الأنواع

  const ctx = await getApplyContext(me.id, electionId);
  if (!ctx.ok) {
    return (
      <>
        <div className="ash-phead"><div><Breadcrumb leaf="بيان الترشّح" /><h1>بيانُ ترشُّحك</h1></div></div>
        <Alert tone="warning" title="تعذّر فتح صفحة الترشّح">{ctx.error ?? "هذا الانتخاب غير متاحٍ للترشّح الآن."}</Alert>
      </>
    );
  }

  return <ApplyForm ctx={ctx} userId={me.id} />;
}
