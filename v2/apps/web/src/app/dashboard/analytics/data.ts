import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";

export type Cat = { label: string; count: number };
export type Analytics = {
  days: number;
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
export type RecentVisitor = { id: string; lastSeen: string; pageviews: number; sessions: number; country: string | null; isMember: boolean };

/** إحصائيّات الزوّار من القاعدة الحيّة (خادميّ، عبر مفتاح الخدمة). */
export async function getAnalytics(days: number): Promise<{ data: Analytics | null; recent: RecentVisitor[]; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { data: null, recent: [], error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  const sb = createAdeebServiceClient(url, key);

  const [a, v] = await Promise.all([
    sb.rpc("get_visitor_analytics", { p_days: days }),
    sb.from("site_visitors").select("id, last_seen_at, total_pageviews, distinct_sessions, country_code, is_member").order("last_seen_at", { ascending: false }).limit(12),
  ]);

  if (a.error) return { data: null, recent: [], error: a.error.message };

  const recent: RecentVisitor[] = (v.data ?? []).map((r) => ({
    id: r.id as string,
    lastSeen: r.last_seen_at as string,
    pageviews: (r.total_pageviews as number) ?? 0,
    sessions: (r.distinct_sessions as number) ?? 0,
    country: (r.country_code as string) ?? null,
    isMember: !!r.is_member,
  }));

  return { data: a.data as Analytics, recent, error: null };
}
