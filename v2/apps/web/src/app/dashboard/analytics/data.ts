import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";

export type Cat = { label: string; count: number };
/** بابُ الزيارة كما تعرفه القاعدة (عمود `source`): الموقعُ أو التطبيق. */
export type Source = "web" | "app";

export type Analytics = {
  days: number;
  /** البابُ المختار، و`null` = البابان معًا. */
  source: Source | null;
  /** توزيعُ البابين في المدّة نفسِها **غيرَ منخول**، فيُرى ما وراء البابِ الآخر وأنت داخل أحدهما. */
  sources: Partial<Record<Source, number>>;
  kpis: { pageviews: number; visitors: number; sessions: number; avg_seconds: number; bounce_rate: number; members: number; countries: number };
  bots: number;
  daily: { date: string; pageviews: number; visitors: number }[];
  /** الصفحات مع عناوينها — المسارُ هويّة، والعنوانُ تسمية (أُضيف ٢٠٢٦-٠٨-١٢). */
  top_pages: (Cat & { title: string | null })[];
  countries: Cat[];
  browsers: Cat[];
  devices: Cat[];
  referrers: Cat[];
  hourly: { hour: number; count: number }[];
  /** ساعاتُ الذروة في بُعدين: يومُ الأسبوع (٠ الأحد) × الساعة، بتوقيت الرياض (أُضيف ٢٠٢٦-٠٨-١١). */
  hourly_heat: { dow: number; hour: number; count: number }[];
  /** المدن مع دولها — الاسمُ وحده ليس هويّة («طرابلس» في بلدين)، فالجمعُ على المدينة والدولة. */
  cities: (Cat & { country: string | null })[];
  /** جديدٌ مقابل عائد — **على الزائر لا المشاهدة**: من ظهر أوّلَ مرّةٍ داخل المدّة فجديد. */
  visitor_types: { new: number; returning: number };
  /** صفحات الخروج — آخرُ مشاهدةٍ في كلّ جلسة، مع عنوانها. */
  exit_pages: (Cat & { title: string | null })[];
};
/** صفٌّ في «أحدث الزوّار» — أرقامُه **داخل المدّة** المختارة، بلا روبوتاتٍ ولا صفحاتِ إدارة. */
export type RecentVisitor = { id: string; lastSeen: string; pageviews: number; sessions: number; country: string | null };

type RawRecent = { id: string; last_seen: string; pageviews: number; sessions: number; country: string | null };

/** إحصائيّات الزوّار من القاعدة الحيّة (خادميّ، عبر مفتاح الخدمة). */
export async function getAnalytics(days: number, source: Source | null = null): Promise<{ data: Analytics | null; recent: RecentVisitor[]; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { data: null, recent: [], error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  const sb = createAdeebServiceClient(url, key);

  // نداءٌ واحد: «أحدث الزوّار» صار داخل الدالّة نفسها ليرث شرطَها ومدّتَها (كان جدولًا منفصلًا
  // يُقرأ خامًا، فيُدخل الروبوتات ويتجاهل المدّة ويعرض عمرَ الزائر كلَّه).
  // `p_source = null` يعني البابين معًا، وهو سلوكُ الدالّة قبل أن تعرف الأبواب أصلًا.
  const a = await sb.rpc("get_visitor_analytics", { p_days: days, p_source: source });
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
