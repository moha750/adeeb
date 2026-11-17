import { denyUnless } from "@/app/dashboard/_shell/guard";
import { isDayKey, presetRange, PRESETS, todayKey } from "@/lib/analyticsRange";
import { getMyQrLinks, getQrAccess, getQrStats } from "@/app/dashboard/tools/qr/data";
import { QrStatsRoom } from "@/app/_ad/rooms/QrStatsRoom";

/**
 * مختبر (لا يُرفع، ٢٠٢٦-١١-١٦): **بيتُ الباركود** — صفحتُه بالباركود وما يُفعل به فوق الإحصاء (`QrStatsRoom home`). `?id=` (وبلاه أوّلُ
 * باركوداتك)، و`?ready=1` كما يصل إليها من الإنشاء. والحاليّةُ للمقارنة: `/dashboard/tools/qr/<id>`.
 */
export const metadata = { title: "بيت الباركود: المختبر" };

/**
 * إحصاءُ رمزٍ واحد. القفلُ قفلُ الغرفة نفسِه، والمِلكيّةُ تحكمها سياسةُ own-row: من طلب
 * رمزَ غيرِه لم يُردَّ بمنعٍ يكشف وجودَه، بل بصفحةٍ تقول «لم يُعثر عليه».
 * والشكلُ قالبُ الإحصاء (`_ad/rooms/QrStatsRoom.tsx`، ٢٠٢٦-١١-٠٧)؛ والقديمُ `QrStatsView` باقٍ حتى يقرّر المالك حذفه.
 */
export default async function QrHomeLab({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const denied = await denyUnless("/dashboard/tools/qr");
  if (denied) return denied;


  /**
   * **المدّةُ من العنوان، وحارسُها مصدرُ إحصائيّات الزوّار نفسُه** (`lib/analyticsRange`):
   * فلا يُخترع لهذه الشاشة حسابُ مدًى ثانٍ يفترق عن أخيه. والافتراضُ **عمرُ الباركود كلُّه**
   * لا شهرُه: الملصقُ يُطبَع مرّةً ويُقرأ عمرُه كلُّه، بخلاف زوّار الموقع.
   */
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const id = one(sp.id) ?? (await getMyQrLinks()).rows[0]?.id;
  if (!id) return <p>لا باركود.</p>;
  const preset = one(sp.preset) ?? "all";
  const from = one(sp.from);
  const to = one(sp.to);
  const custom = isDayKey(from) && isDayKey(to);
  const range = custom ? { from, to } : preset === "all" ? null : presetRange(preset);

  /**
   * نداءاتٌ متوازية: الإحصاءُ لا ينتظر منزلةَ الناظر ولا هي تنتظره. **وسجلُّ العمر يُقرأ مرّةً ثانيةً حين تُختار مدّة**
   * (قالبُ الإحصاء): منه أعدادُ المبدّل (كم في «هذا الشهر» وكم في «اليوم» قبل النقر)، ومنه «آخر 7 أيّام» والسبعةُ قبلها —
   * فلا يكون صفرًا تحت «الشهر الماضي» كما كان «هذا الأسبوع» يُعدّ من صفوفٍ قصّتها المدّة.
   */
  const [stats, all, access] = await Promise.all([
    getQrStats(id, range),
    range ? getQrStats(id, null) : Promise.resolve(null),
    getQrAccess(id),
  ]);
  const life = (all ?? stats).daily;
  const today = todayKey();
  const sumIn = (a: string | null, b: string | null) =>
    life.filter((x) => (!a || x.day >= a) && (!b || x.day <= b)).reduce((s, x) => s + x.count, 0);
  const counts = Object.fromEntries(
    PRESETS.map((p) => {
      const r = p.key === "all" ? null : presetRange(p.key, today);
      return [p.key, sumIn(r?.from ?? null, r?.to ?? null)];
    }),
  );
  const shift = (k: string, n: number) => new Date(+new Date(`${k}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  const week = { now: sumIn(shift(today, -6), today), before: sumIn(shift(today, -13), shift(today, -7)) };

  // **قراءةُ العمر الثانية إن تعثّرت قيلت** (المراجعةُ المستقلّة): منها أعدادُ المبدّل و«آخر 7 أيّام»، فصفرُها بلا تنبيهٍ كذب
  const error = [stats.error, all?.error].filter(Boolean).join("، ") || null;

  return (
    <QrStatsRoom
      stats={{ ...stats, error }}
      counts={counts}
      week={week}
      range={{ preset: custom ? "custom" : preset, from: range?.from ?? null, to: range?.to ?? null }}
      // بابُ الإعدادات لا يُعرَض لمن لا يملك تبديلَ شيء.
      canSettings={access === "owner" || access === "edit"}
      home={{ ready: one(sp.ready) === "1", designHref: `/dashboard/ad/qr-design?id=${id}`, settingsHref: `/dashboard/ad/qr-settings?id=${id}` }}
    />
  );
}
