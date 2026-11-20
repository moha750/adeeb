import { headers } from "next/headers";
import { VisitorStatsRoom } from "@/app/_ad/rooms/VisitorStatsRoom";
import { AdNote, AdRoom, RoomPlate } from "@/app/_ad/primitives";
import { getAnalytics, type Source } from "./data";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { ALL_DAYS, DEFAULT_PRESET, PRESETS, isDayKey, presetRange } from "@/lib/analyticsRange";

// عنوانُ التبويب اسمُ الغرفة (محمد ٢٠٢٦-١١-٠٣)، وكانت «بوّابة أدِيب» وحدها (٢٠٢٦-١١-٢٠)
export const metadata = { title: "إحصائيّات الزوّار، بوّابة أدِيب" };

const SOURCES: Source[] = ["web", "app"];

/**
 * روابطُ العهد الأوّل (`?days=30`) تُترجَم إلى اختصارها، فلا تنكسر مفضّلةٌ محفوظة.
 * و«الثلاثون» حُذفت من الاختصارات، فتُحمل على أقربِ ما بقي معنًى: «هذا الشهر».
 */
const FROM_DAYS: Record<string, string> = { "7": "7", "30": "mtd", "90": "90", "3650": "all" };

type Params = { preset?: string; from?: string; to?: string; days?: string; src?: string; cmp?: string };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const denied = await denyUnless("/dashboard/analytics");
  if (denied) return denied;

  const sp = await searchParams;

  /**
   * **البابُ الافتراضيّ يتبع مَن يفتح الشاشة** (٢٠٢٦-٠٩-٠٥): من فتحها من التطبيق يرى أرقامَ
   * التطبيق، ومن فتحها من المتصفّح يرى أرقامَ الموقع — فلا يقرأ أحدٌ رقمًا يجمع البابين وهو
   * يظنّه بابَه. و«الكلّ» تبقى خيارًا صريحًا في المبدّل (`?src=all`).
   *
   * والتعرّفُ من بطاقة المتصفّح: تطبيقُ أدِيب يضع في `userAgent` كلمةَ **`AdeebApp`**، وهي
   * العلامةُ الوحيدة المتّفق عليها. وما لم يضعها التطبيقُ بعدُ يُقرأ متصفّحًا (أي «الموقع»).
   */
  const ua = (await headers()).get("user-agent") ?? "";
  const viewerSource: Source = /AdeebApp/i.test(ua) ? "app" : "web";
  const source = sp.src === "all" ? null
    : SOURCES.includes(sp.src as Source) ? (sp.src as Source)
    : viewerSource;
  // المقارنةُ قائمةٌ ما لم تُطفَأ صراحةً: هي ما يجعل الرقمَ يقول أحسُنٌ هو أم سيّئ
  const compare = sp.cmp !== "0";

  // مدًى مكتوبٌ بيده يسبق الاختصار، وكلاهما يُصدَّق قبل أن يبلغ القاعدة
  const custom = isDayKey(sp.from) && isDayKey(sp.to) && sp.from <= sp.to;
  const preset = custom
    ? "custom"
    : PRESETS.some((p) => p.key === sp.preset) ? (sp.preset as string)
    : FROM_DAYS[sp.days ?? ""] ?? DEFAULT_PRESET;
  const range = custom ? { from: sp.from as string, to: sp.to as string } : presetRange(preset);

  // الأيّامُ لا تُقرأ إلّا حين لا حدودَ للمدى («منذ البداية»)
  const { data, error } = await getAnalytics(range ? 30 : ALL_DAYS, source, range);

  // على قالب الإحصاء منذ ٢٠٢٦-١١-١٤ (`_ad/rooms/VisitorStatsRoom`)؛ والقديمُ (`./StatsView`) يقرؤه المختبرُ للمقارنة
  if (error || !data) {
    return (
      <AdRoom label="إحصائيّات الزوّار">
        <RoomPlate title="إحصائيّات الزوّار" />
        <AdNote tone="warn" title="تعذّر جلب الإحصائيّات">{error ?? "لا بيانات."}</AdNote>
      </AdRoom>
    );
  }

  return <VisitorStatsRoom data={data} preset={preset} source={source} compare={compare} />;
}
