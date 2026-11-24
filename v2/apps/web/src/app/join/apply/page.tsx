import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth";
import { isAdeebMember } from "@/lib/memberRecord";
import { DoorShell } from "@/app/_door/DoorShell";
import { getPublicOrg } from "@/app/structure/data";
import { getCommittees, getViewerJoinState } from "../data";
import { ApplyFlow, type ApplyStep } from "./ApplyFlow";

export const metadata: Metadata = {
  title: "التطوّع في أدِيب",
};

export const dynamic = "force-dynamic";

/**
 * **بابُ التطوّع — تكملةُ بابِ الحساب** (محمد ٢٠٢٦-١١-٢٤).
 *
 * كان النموذجُ في ذيل صفحة الانضمام: من فتح حسابَه رجع إلى صفحةٍ كُتبت لتقنعه وقد اقتنع، ثمّ رُمي إلى آخرها، والمتطوّعُ
 * يمرّ بإعلانٍ ليعدّل رغبة، والصفحةُ يتبدّل ذيلُها بقارئها. ففُصل: **صفحةُ الانضمام إقناعٌ خالصٌ للجميع**، وهذه خطوتان بعد
 * الحساب بهيئة أبواب الحساب نفسها — فلا يخرج القادمُ من رحلةٍ بدأها في «أنشئ حسابك».
 *
 * | القاصد | خطوتُه |
 * |---|---|
 * | بلا جلسة | إلى إنشاء الحساب، ويعود إلى هنا |
 * | صاحبُ حسابٍ بلا بيانات | `data` ثمّ `prefs` |
 * | صاحبُ حسابٍ لم يقدّم | `prefs` |
 * | متطوّع | `edit` — يعيد ترتيب رغباته، وبابُه إليها من بوّابته |
 * | عضوٌ في النادي | `/dashboard` |
 */
export default async function ApplyPage() {
  const me = await getSessionAdmin();
  if (!me) redirect(`/signup?next=${encodeURIComponent("/join/apply")}`);
  if (await isAdeebMember(me.id)) redirect("/dashboard");

  const [committees, viewer, org] = await Promise.all([
    getCommittees(),
    getViewerJoinState(me.id),
    getPublicOrg().then((r) => r.data ?? null),
  ]);

  // رمزُ كلّ لجنةٍ من الهيكلة، يحمله حقلُ الرغبة حين تُختار
  const icons = new Map((org?.executive.departments ?? []).flatMap((d) => d.units.map((u) => [u.id, u.icon ?? null] as const)));
  const options = committees?.map((c) => ({ ...c, icon: icons.get(c.id) ?? null })) ?? null;

  const step: ApplyStep = !viewer?.hasProfile ? "data" : viewer.isVolunteer ? "edit" : "prefs";

  return (
    // المتطوّعُ يعيد ترتيب رغباته، فلا يُقال له «خطوتُك إلى التطوّع»
    <DoorShell door="volunteer" say={step === "edit" ? { big: "رغباتُك في أدِيب", small: "رتّبها كما تشاء، متى شئت." } : undefined}>
      <ApplyFlow
        first={step}
        options={options}
        initialPrefs={viewer?.prefs ?? []}
        female={viewer?.gender === "female"}
      />
    </DoorShell>
  );
}
