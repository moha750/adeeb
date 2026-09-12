import { denyUnless } from "@/app/dashboard/_shell/guard";
import { isDayKey, presetRange } from "@/lib/analyticsRange";
import { getQrAccess, getQrStats } from "../data";
import { QrStatsView } from "../QrStatsView";

export const metadata = { title: "إحصاء الباركود، بوّابة أديب" };

/**
 * إحصاءُ رمزٍ واحد. القفلُ قفلُ الغرفة نفسِه، والمِلكيّةُ تحكمها سياسةُ own-row: من طلب
 * رمزَ غيرِه لم يُردَّ بمنعٍ يكشف وجودَه، بل بصفحةٍ تقول «لم يُعثر عليه».
 */
export default async function QrStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const denied = await denyUnless("/dashboard/tools/qr");
  if (denied) return denied;

  const { id } = await params;

  /**
   * **المدّةُ من العنوان، وحارسُها مصدرُ إحصائيّات الزوّار نفسُه** (`lib/analyticsRange`):
   * فلا يُخترع لهذه الشاشة حسابُ مدًى ثانٍ يفترق عن أخيه. والافتراضُ **عمرُ الباركود كلُّه**
   * لا شهرُه: الملصقُ يُطبَع مرّةً ويُقرأ عمرُه كلُّه، بخلاف زوّار الموقع.
   */
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const preset = one(sp.preset) ?? "all";
  const from = one(sp.from);
  const to = one(sp.to);
  const range =
    isDayKey(from) && isDayKey(to)
      ? { from, to }
      : preset === "all"
        ? null
        : presetRange(preset);
  // نداءان متوازيان: الإحصاءُ لا ينتظر منزلةَ الناظر ولا هي تنتظره.
  const [stats, access] = await Promise.all([getQrStats(id, range), getQrAccess(id)]);

  return (
    <QrStatsView
      stats={stats}
      range={{ preset: isDayKey(from) && isDayKey(to) ? "custom" : preset, from: range?.from ?? null, to: range?.to ?? null }}
      // بابُ الإعدادات لا يُعرَض لمن لا يملك تبديلَ شيء.
      canSettings={access === "owner" || access === "edit"}
    />
  );
}
