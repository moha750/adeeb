// يُستورَد من مكوّنات خادميّة وحدها (page.tsx).
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { clubDayKey } from "@/lib/dates";
import type { QrSpec } from "@/lib/qr";

/** رمزٌ محفوظٌ كما يُقرأ في اللوحة. */
export type QrLinkRow = {
  id: string;
  code: string;
  title: string;
  targetUrl: string;
  /** وصفةُ الرسم كما حُفظت — تُعيد المحرّرَ إلى حالِه يومَ صُنع الرمز. */
  spec: QrSpec | null;
  active: boolean;
  scanCount: number;
  createdAt: string;
  updatedAt: string;
};

export type QrLinksData = { rows: QrLinkRow[]; error: string | null };

type Raw = {
  id: string; code: string; title: string; target_url: string;
  spec: QrSpec | null; active: boolean; scan_count: number;
  created_at: string; updated_at: string;
};

const shape = (r: Raw): QrLinkRow => ({
  id: r.id,
  code: r.code,
  title: r.title,
  targetUrl: r.target_url,
  spec: r.spec,
  active: r.active,
  scanCount: r.scan_count ?? 0,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const COLS = "id, code, title, target_url, spec, active, scan_count, created_at, updated_at";

/**
 * رموزي وحدها.
 *
 * **بعميل الجلسة لا بمفتاح الخدمة**، خلافًا لعُرف الغرف الأخرى. وعلّتُه أنّ المدى هنا
 * «كلٌّ يرى رموزَه هو»، وهو محكومٌ بسياسة own-row في القاعدة. ومفتاحُ الخدمة يتجاوز
 * السياسةَ فيصير الحارسُ سطرَ `where` في التطبيق، وسطرٌ يُنسى مرّةً يكشف رموزَ الجميع.
 *
 * وأثرٌ لازمٌ من ذلك: `auth.uid()` هو **صاحبُ الجلسة** لا المُعايَن. فمن يعاين عضوًا
 * آخر يرى رموزَ نفسِه (حدُّ المعاينة الموصوف في `lib/view-as`)، وهو الصواب: الرموزُ
 * مِلكٌ لا بيانُ عضويّة.
 */
export async function getMyQrLinks(): Promise<QrLinksData> {
  const sb = await createClient();
  const { data, error } = await sb.from("qr_links").select(COLS).order("created_at", { ascending: false });
  if (error) return { rows: [], error: error.message };
  return { rows: ((data ?? []) as Raw[]).map(shape), error: null };
}

/**
 * رمزٌ واحدٌ بلا مسحاته — لبابِ التصميم. وإفرادُه عن `getQrStats` لأنّ التصميمَ لا يعني
 * الأرقام: جلبُ ثلاثين يومًا من المسحات لرسم مربّعٍ ملوَّنٍ عملٌ يُدفَع ثمنُه بلا مقابل.
 */
export async function getQrLink(id: string): Promise<{ link: QrLinkRow | null; error: string | null }> {
  const sb = await createClient();
  const { data, error } = await sb.from("qr_links").select(COLS).eq("id", id).maybeSingle();
  if (error) return { link: null, error: error.message };
  return { link: data ? shape(data as Raw) : null, error: null };
}

/** إحصاءُ رمزٍ واحد: يومٌ يومًا، وبالأجهزة، وبمن أحال. */
export type QrStats = {
  link: QrLinkRow | null;
  /** آخرُ ثلاثين يومًا بترتيبها، بلا ثغرات: يومٌ بلا مسحةٍ صفرٌ لا فجوة. */
  daily: { day: string; count: number }[];
  devices: { key: string; count: number }[];
  referrers: { host: string; count: number }[];
  /** بصماتٌ متمايزة — قريبٌ من عدد الأشخاص، وليس هو (البصمةُ تدور كلّ يوم). */
  uniques: number;
  /** مسحاتُ الآلات المستبعَدة من الأرقام أعلاه، تُقال ولا تُخفى. */
  bots: number;
  error: string | null;
};

/** مدى النافذة الإحصائيّة بالأيّام. */
const WINDOW_DAYS = 30;

/**
 * التجميعُ في التطبيق لا في القاعدة — عن قصد، وبحدّ.
 *
 * صفوفُ المسح عشراتٌ أو مئاتٌ لرمزٍ واحدٍ في شهر، وجلبُها ثمّ عدُّها أرخصُ من دالّةٍ
 * مخزَّنةٍ تُصان. فإن بلغ رمزٌ يومًا عشراتِ الألوف انتقل هذا إلى `group by` في القاعدة،
 * والحدُّ أدناه يمنع أن يُسقط ذلك اليومُ الصفحةَ قبل أن ننتبه.
 */
const MAX_ROWS = 20_000;

export async function getQrStats(id: string): Promise<QrStats> {
  const empty = { daily: [], devices: [], referrers: [], uniques: 0, bots: 0 };
  const sb = await createClient();

  const { data: linkRow, error: linkErr } = await sb.from("qr_links").select(COLS).eq("id", id).maybeSingle();
  if (linkErr) return { link: null, ...empty, error: linkErr.message };
  if (!linkRow) return { link: null, ...empty, error: null };

  const since = new Date(Date.now() - WINDOW_DAYS * 86400_000).toISOString();
  const { data: scans, error: scanErr } = await sb
    .from("qr_scans")
    .select("scanned_at, visitor, device, referrer, is_bot")
    .eq("link_id", id)
    .gte("scanned_at", since)
    .order("scanned_at", { ascending: false })
    .limit(MAX_ROWS);
  if (scanErr) return { link: shape(linkRow as Raw), ...empty, error: scanErr.message };

  type Scan = { scanned_at: string; visitor: string | null; device: string | null; referrer: string | null; is_bot: boolean };
  const all = (scans ?? []) as Scan[];
  const human = all.filter((s) => !s.is_bot);

  // أيّامُ النافذة كاملةً ثمّ تُملأ: مخطّطٌ يقفز فوق يومٍ خالٍ يكذب على العين.
  const byDay = new Map<string, number>();
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    byDay.set(clubDayKey(new Date(Date.now() - i * 86400_000).toISOString()), 0);
  }
  const devices = new Map<string, number>();
  const referrers = new Map<string, number>();
  const seen = new Set<string>();

  for (const s of human) {
    const day = clubDayKey(s.scanned_at);
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + 1);
    const dev = s.device ?? "unknown";
    devices.set(dev, (devices.get(dev) ?? 0) + 1);
    if (s.referrer) referrers.set(s.referrer, (referrers.get(s.referrer) ?? 0) + 1);
    if (s.visitor) seen.add(`${day}|${s.visitor}`);
  }

  return {
    link: shape(linkRow as Raw),
    daily: [...byDay].map(([day, count]) => ({ day, count })),
    devices: [...devices].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
    referrers: [...referrers].map(([host, count]) => ({ host, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    uniques: seen.size,
    bots: all.length - human.length,
    error: null,
  };
}
