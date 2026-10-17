import { createAdeebServerClient } from "@adeeb/core";
import { getPublicNews } from "@/app/news/data";
import { JourneyLab, type Activity } from "./JourneyLab";

/**
 * **رحلةُ الخبر بين رئيس التحرير والمكلَّف: نموذجٌ يُلعَب** (٢٠٢٦-١٠-١٦).
 *
 * بعد ثلاث جولاتٍ على شاشة «الكتابة» بلا تقدّم (المالك: «أحاول أن ألعب دور المكلَّف ورئيس التحرير… غير واضح أبدًا»)
 * تبيّن أنّ الخطأ تصميمُ شاشةٍ قبل الرحلة. فاتُّفق على الرحلة أوّلًا (أربعة مشاهد) ثمّ بُني هذا: يتنقّل فيه المالكُ بين
 * الدورين ويلعبهما فعلًا، من «خبر جديد» إلى النشر، ثمّ «الإدارة» بقراراتها السبعة وتعديلُ المنشور.
 * **هيكلةٌ لا تصميم.** لا يُحفَظ شيءٌ ولا يُرسَل إشعارٌ حقيقيّ؛ الفعاليّاتُ واللجانُ حقيقيّة.
 */
export const dynamic = "force-dynamic";

export default async function NewsJourneyPage() {
  const all = await getPublicNews();
  const n = all.find((x) => x.slug?.startsWith("رحلة-في-عالم-التصميم")) ?? all[0];
  const sb = createAdeebServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [acts, coms] = await Promise.all([
    sb.from("activities").select("id, name, activity_date, committees:organizing_committee_id(committee_name_ar)").eq("is_published", true)
      .order("activity_date", { ascending: false })
      .returns<{ id: string | number; name: string; committees: { committee_name_ar: string } | null }[]>(),
    sb.from("committees").select("committee_name_ar").eq("is_active", true).order("committee_name_ar").returns<{ committee_name_ar: string }[]>(),
  ]);
  const activities: Activity[] = (acts.data ?? []).map((a) => ({ id: String(a.id), name: a.name, unit: a.committees?.committee_name_ar ?? null }));
  return (
    <JourneyLab
      photos={n ? [n.cover, ...n.gallery].filter((x): x is string => !!x) : []}
      published={all.slice(0, 2).map((x) => ({ title: x.title, cover: x.cover }))}
      activities={activities}
      units={(coms.data ?? []).map((c) => c.committee_name_ar)}
    />
  );
}
