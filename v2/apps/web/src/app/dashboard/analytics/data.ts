import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import type { DayRange } from "@/lib/analyticsRange";

export type Cat = { label: string; count: number };
/** بابُ الزيارة كما تعرفه القاعدة (عمود `source`): الموقعُ أو التطبيق. */
export type Source = "web" | "app";

/** أرقامُ الفترة السابقة بطول المدى نفسِه — أساسُ المقارنة، ومعها حدودُها كي يُقال بماذا قُورن. */
export type PrevKpis = {
  from: string;
  to: string;
  pageviews: number;
  visitors: number;
  sessions: number;
  avg_seconds: number;
  bounce_rate: number;
  members: number;
  /** الأعضاءُ **بوحدة الزائر** (أجهزةٌ لا صفحات) — يسكن سطرًا فرعيًّا في كرت الزائر. */
  member_visitors: number;
  /** الزوّارُ الذين ظهروا قبل بداية المدى: منهم تُحسب نسبةُ العائدين. */
  returning: number;
  countries: number;
};

export type Analytics = {
  days: number;
  /** حدّا المدى كما حسبتهما القاعدة (مفتاحُ يومٍ بتوقيت الرياض) — لا يُعاد حسابُهما في الشاشة. */
  from: string;
  to: string;
  /** البابُ المختار، و`null` = البابان معًا. */
  source: Source | null;
  /** توزيعُ البابين في المدّة نفسِها **غيرَ منخول**، فيُرى ما وراء البابِ الآخر وأنت داخل أحدهما. */
  sources: Partial<Record<Source, number>>;
  kpis: { pageviews: number; visitors: number; sessions: number; avg_seconds: number; bounce_rate: number; members: number; member_visitors: number; returning: number; countries: number };
  bots: number;
  daily: { date: string; pageviews: number; visitors: number }[];
  /** الصفحات مع عناوينها — المسارُ هويّة، والعنوانُ تسمية (أُضيف ٢٠٢٦-٠٨-١٢). */
  top_pages: (Cat & { title: string | null })[];
  countries: Cat[];
  browsers: Cat[];
  devices: Cat[];
  hourly: { hour: number; count: number }[];
  /** ساعاتُ الذروة في بُعدين: يومُ الأسبوع (٠ الأحد) × الساعة، بتوقيت الرياض (أُضيف ٢٠٢٦-٠٨-١١). */
  hourly_heat: { dow: number; hour: number; count: number }[];
  /** المدن مع دولها — الاسمُ وحده ليس هويّة («طرابلس» في بلدين)، فالجمعُ على المدينة والدولة. */
  cities: (Cat & { country: string | null })[];
  /** جديدٌ مقابل عائد — **على الزائر لا المشاهدة**: من ظهر أوّلَ مرّةٍ داخل المدّة فجديد. */
  /**
   * ثلاثةُ أصنافٍ لا صنفان (٢٠٢٦-٠٩-٠٥): المنتسبُ يُفرَز أوّلًا ثمّ يُقسَم الباقي جديدًا
   * وعائدًا، فتجمع الثلاثةُ عددَ الزوّار. و`member` اختياريٌّ لأنّ الترحيل قد لا يكون طُبِّق بعدُ.
   */
  visitor_types: { new: number; returning: number; member?: number };
  /** صفحاتُ الدخول: أوّلُ صفحةٍ في كلّ زيارة، ومقلوبُ صفحات الخروج. */
  entry_pages: (Cat & { title: string | null })[];
  /** المصادرُ مصنّفةً: بحثٌ · تواصلٌ · مباشرٌ · مواقعُ أخرى (والتنقّلُ الداخليّ منخولٌ في القاعدة). */
  sources_class: Cat[];
  /** مدّةُ الزيارة كلِّها: متوسّطٌ ووسيطٌ وعددُ الزيارات المحسوبة. */
  visit_seconds: { avg: number; median: number; sessions: number };
  /** توزيعُ الزيارات على خمس مُدَد — هو المعروضُ في الشاشة (المدرّج)، لا الأرقامُ المفردة. */
  visit_buckets: Cat[];
  /** أطولُ الصفحات مكثًا — و`count` هنا **ثوانٍ** لا عدد. */
  dwell_pages: (Cat & { title: string | null })[];
  /** صفحات الخروج — آخرُ مشاهدةٍ في كلّ جلسة، مع عنوانها. */
  exit_pages: (Cat & { title: string | null })[];
  /** الفترةُ السابقة: تأتي دائمًا من القاعدة، والشاشةُ هي التي تقرّر أتعرضها أم لا. */
  prev: PrevKpis | null;
};
/** صفٌّ في «أحدث الزوّار» — أرقامُه **داخل المدّة** المختارة، بلا روبوتاتٍ ولا صفحاتِ إدارة. */
export type RecentVisitor = { id: string; lastSeen: string; pageviews: number; sessions: number; country: string | null };

type RawRecent = { id: string; last_seen: string; pageviews: number; sessions: number; country: string | null };

/** إحصائيّات الزوّار من القاعدة الحيّة (خادميّ، عبر مفتاح الخدمة). */
export async function getAnalytics(
  days: number,
  source: Source | null = null,
  range: DayRange | null = null,
): Promise<{ data: Analytics | null; recent: RecentVisitor[]; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { data: null, recent: [], error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  const sb = createAdeebServiceClient(url, key);

  // نداءٌ واحد: «أحدث الزوّار» صار داخل الدالّة نفسها ليرث شرطَها ومدّتَها (كان جدولًا منفصلًا
  // يُقرأ خامًا، فيُدخل الروبوتات ويتجاهل المدّة ويعرض عمرَ الزائر كلَّه).
  // `p_source = null` يعني البابين معًا، وهو سلوكُ الدالّة قبل أن تعرف الأبواب أصلًا.
  // المدى صريحٌ حين يُختار («من/إلى» أو اختصارٌ محسوب)، و`null` يُبقي النافذةَ المتدحرجة
  // القديمةَ كما هي — وهي نصيبُ «منذ البداية» وحدَها اليوم.
  const a = await sb.rpc("get_visitor_analytics", {
    p_days: days,
    p_source: source,
    p_from: range?.from ?? null,
    p_to: range?.to ?? null,
  });
  if (a.error) return { data: null, recent: [], error: a.error.message };

  const payload = a.data as Analytics & { recent?: RawRecent[] };
  const recent: RecentVisitor[] = (payload.recent ?? []).map((r) => ({
    id: r.id,
    lastSeen: r.last_seen,
    pageviews: r.pageviews ?? 0,
    sessions: r.sessions ?? 0,
    country: r.country ?? null,
  }));

  return { data: payload, recent, error: null };
}
