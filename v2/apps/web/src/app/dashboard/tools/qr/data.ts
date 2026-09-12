// يُستورَد من مكوّنات خادميّة وحدها (page.tsx).
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { clubDayKey, clubHour, clubWeekday, daysBetweenKeys } from "@/lib/dates";
import type { DayRange } from "@/lib/analyticsRange";
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
  /** صاحبُه — تُقرأ لتُعرَف المِلكيّةُ في الشاشة (المشاركةُ للمالك وحدَه). */
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type QrLinksData = { rows: QrLinkRow[]; error: string | null };

type Raw = {
  id: string; code: string; title: string; target_url: string;
  spec: QrSpec | null; active: boolean; scan_count: number; owner_id: string;
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
  ownerId: r.owner_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const COLS = "id, code, title, target_url, spec, active, scan_count, owner_id, created_at, updated_at";

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
 *
 * **والقائمةُ ملكٌ وشِركة**: ما أملكه، وما شُورِكتُ فيه. لا ما تسمح لي السياسةُ برؤيته.
 */
export async function getMyQrLinks(): Promise<QrLinksData> {
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  const me = auth.user?.id ?? null;
  if (!me) return { rows: [], error: null };

  // **الغرفةُ تُصفّي بالمِلكيّة لا بما تسمح به السياسة** (صُحّح ٢٠٢٦-٠٩-٠٦): من يملك
  // `oversee_qr` تفتح له سياسةُ الإشراف كلَّ الصفوف، فكان يفتح «مولّد الباركود» فيجد
  // باركوداتِ الناس في قائمة «باركوداتي». والإشرافُ غرفتُه غرفةٌ، وهذه غرفةُ الملك.
  const [own, shared] = await Promise.all([
    sb.from("qr_links").select(COLS).eq("owner_id", me),
    sb.from("qr_link_shares").select("link_id").eq("user_id", me),
  ]);
  if (own.error) return { rows: [], error: own.error.message };

  const ids = ((shared.data ?? []) as { link_id: string }[]).map((r) => r.link_id);
  const withMe = ids.length ? await sb.from("qr_links").select(COLS).in("id", ids) : { data: [], error: null };

  const rows = [...((own.data ?? []) as Raw[]), ...((withMe.data ?? []) as Raw[])]
    .map(shape)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return { rows, error: null };
}

/**
 * رمزٌ واحدٌ بلا مسحاته — لبابِ التصميم. وإفرادُه عن `getQrStats` لأنّ التصميمَ لا يعني
 * الأرقام: جلبُ سجلّ المسحات كلِّه لرسم مربّعٍ ملوَّنٍ عملٌ يُدفَع ثمنُه بلا مقابل.
 */
export async function getQrLink(id: string): Promise<{ link: QrLinkRow | null; error: string | null }> {
  const sb = await createClient();
  const { data, error } = await sb.from("qr_links").select(COLS).eq("id", id).maybeSingle();
  if (error) return { link: null, error: error.message };
  return { link: data ? shape(data as Raw) : null, error: null };
}

/** إحصاءُ باركودٍ واحد منذ إنشائه: يومٌ يومًا، وبالأجهزة، وبمن أحال. */
export type QrStats = {
  link: QrLinkRow | null;
  /** يومًا يومًا من الإنشاء إلى اليوم، بلا ثغرات: يومٌ بلا مسحةٍ صفرٌ لا فجوة. */
  daily: { day: string; count: number }[];
  devices: { key: string; count: number }[];
  /** مسحاتُ الآلات المستبعَدة من الأرقام أعلاه، تُقال ولا تُخفى. */
  bots: number;
  /** بلغ السجلُّ سقفَه (٣٦٥ يومًا أو ٢٠ ألف صفّ) فالمخطّطُ أحدثُ ما فيه لا كلُّه. */
  clipped: boolean;
  /**
   * **القراءةُ الأعمق** — ما لا يقوله الخطُّ اليوميّ:
   * · `hours` عدّادُ أربعٍ وعشرين ساعةً بتوقيت الرياض: **متى يُمسح ملصقُك؟** (تُعرَف به ساعةُ
   *   النشر وساعةُ الوقوف عند الطاولة).
   * · `heat` أيّامُ الأسبوع في الساعات: النمطُ الأسبوعيُّ الذي لا يظهر في مجموعٍ يوميّ.
   * · `firstScan`/`lastScan`: عمرُ الملصق الحقيقيّ، ومتى سكت.
   * · `thisWeek`/`lastWeek`: أهو يصعد أم يهبط؟ رقمٌ واحدٌ لا يُغني عنه مخطّط.
   */
  hours: number[];
  heat: number[][];
  firstScan: string | null;
  lastScan: string | null;
  thisWeek: number;
  lastWeek: number;
  error: string | null;
};

/**
 * **لا نافذةَ ثلاثين يومًا** (أمرُ المالك ٢٠٢٦-٠٨-٢٨): الإحصاءُ **منذ إنشاء الباركود** إلى
 * اليوم. والحدُّ الوحيدُ الباقي سقفُ سلامةٍ لا سياسةَ عرض: باركودٌ عمّر سنواتٍ لا يُرسَم له
 * ألفُ نقطةٍ في مخطّطٍ عرضُه ثلاثمئة بكسل، فيُقصَر السطرُ الزمنيُّ عند هذا العدد ويُقال ذلك.
 */
const MAX_DAYS = 365;

/**
 * التجميعُ في التطبيق لا في القاعدة — عن قصد، وبحدّ.
 *
 * صفوفُ المسح عشراتٌ أو مئاتٌ لرمزٍ واحدٍ في شهر، وجلبُها ثمّ عدُّها أرخصُ من دالّةٍ
 * مخزَّنةٍ تُصان. فإن بلغ رمزٌ يومًا عشراتِ الألوف انتقل هذا إلى `group by` في القاعدة،
 * والحدُّ أدناه يمنع أن يُسقط ذلك اليومُ الصفحةَ قبل أن ننتبه.
 */
const MAX_ROWS = 20_000;

/** اليومُ الذي يليه — حدٌّ أعلى مفتوحٌ يجعل طرفَ المدى داخلًا فيه. */
const nextDay = (key: string) => clubDayKey(new Date(Date.parse(`${key}T12:00:00Z`) + 86400_000).toISOString());

/**
 * **الإحصاءُ في مدّةٍ يختارها صاحبُه** (المالك ٢٠٢٦-٠٩-٠٥): كان الخطُّ «منذ الإنشاء» وحدَه
 * ومعه كرتٌ لأسبوعٍ ماضٍ، فطلب مصفّيًا كالذي في إحصائيّات الزوّار. فالمدّةُ تُمرَّر هنا،
 * وكلُّ ما يُحسَب أدناه يتبعها: الخطُّ والأجهزةُ والساعاتُ والشبكة.
 *
 * و`null` تعني **عمرَ الباركود كلَّه**، وهو الافتراض.
 */
export async function getQrStats(id: string, range: DayRange | null = null): Promise<QrStats> {
  const empty = {
    daily: [], devices: [], bots: 0, clipped: false,
    hours: Array(24).fill(0) as number[],
    heat: Array.from({ length: 7 }, () => Array(24).fill(0)) as number[][],
    firstScan: null, lastScan: null, thisWeek: 0, lastWeek: 0,
  };
  const sb = await createClient();

  const { data: linkRow, error: linkErr } = await sb.from("qr_links").select(COLS).eq("id", id).maybeSingle();
  if (linkErr) return { link: null, ...empty, error: linkErr.message };
  if (!linkRow) return { link: null, ...empty, error: null };

  let q = sb.from("qr_scans").select("scanned_at, device, is_bot").eq("link_id", id);
  // طرفا المدى **داخلان**: «١ إلى ٣١ أغسطس» يشمل الأوّلَ والحاديَ والثلاثين، فيُؤخَذ الغدُ
  // حدًّا أعلى مفتوحًا. وبتوقيت النادي لا بساعة الخادم (`clubDayKey` مصدرُ المفاتيح).
  if (range) {
    q = q.gte("scanned_at", `${range.from}T00:00:00+03:00`).lt("scanned_at", `${nextDay(range.to)}T00:00:00+03:00`);
  }
  const { data: scans, error: scanErr } = await q.order("scanned_at", { ascending: false }).limit(MAX_ROWS);
  if (scanErr) return { link: shape(linkRow as Raw), ...empty, error: scanErr.message };

  type Scan = { scanned_at: string; device: string | null; is_bot: boolean };
  const all = (scans ?? []) as Scan[];
  const human = all.filter((s) => !s.is_bot);

  /**
   * أيّامُ العمر كاملةً ثمّ تُملأ: من يوم الإنشاء إلى اليوم، ويومٌ بلا مسحةٍ صفرٌ لا فجوة
   * (مخطّطٌ يقفز فوق يومٍ خالٍ يكذب على العين).
   */
  /**
   * **عمرُه بأيّام الرياض لا بفرقِ الساعات** (صُحّح ٢٠٢٦-٠٩-٠٥): كان الفرقُ يُقسَم على
   * ٢٤ ساعة، فباركودٌ وُلد أمسِ الحاديةَ عشرةَ مساءً وقُرئ اليومَ الثامنةَ صباحًا عمرُه
   * ٩ ساعاتٍ ⇒ يومٌ واحد ⇒ **مسحةُ أمسِ تسقط من المخطّط** بينما العدّادُ يعدّها،
   * فيقول الرقمُ «مسحة» ويقول المخطّطُ «لا مسحات».
   */
  // أيّامُ المخطّط: مدّةُ المصفّي إن كانت، وإلّا عمرُ الباركود من يوم مولده إلى اليوم.
  const fromKey = range ? range.from : clubDayKey((linkRow as Raw).created_at);
  const toKey = range ? range.to : clubDayKey(new Date().toISOString());
  const days = Math.min(MAX_DAYS, Math.max(1, daysBetweenKeys(fromKey, toKey) + 1));
  const byDay = new Map<string, number>();
  const endMs = Date.parse(`${toKey}T12:00:00Z`);
  for (let i = days - 1; i >= 0; i--) {
    byDay.set(clubDayKey(new Date(endMs - i * 86400_000).toISOString()), 0);
  }
  const devices = new Map<string, number>();
  const hours = Array(24).fill(0) as number[];
  const heat = Array.from({ length: 7 }, () => Array(24).fill(0)) as number[][];
  const weekAgo = Date.now() - 7 * 86400_000;
  const twoWeeks = Date.now() - 14 * 86400_000;
  let thisWeek = 0;
  let lastWeek = 0;

  for (const s of human) {
    const day = clubDayKey(s.scanned_at);
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + 1);
    const dev = s.device ?? "unknown";
    devices.set(dev, (devices.get(dev) ?? 0) + 1);

    // الساعةُ واليومُ بتوقيت النادي لا بساعة الخادم (الخادمُ على UTC، ودرسُ `lib/dates` قائم).
    const h = clubHour(s.scanned_at);
    const wd = clubWeekday(s.scanned_at);
    hours[h] += 1;
    heat[wd][h] += 1;

    const t = Date.parse(s.scanned_at);
    if (t >= weekAgo) thisWeek += 1;
    else if (t >= twoWeeks) lastWeek += 1;
  }

  return {
    link: shape(linkRow as Raw),
    daily: [...byDay].map(([day, count]) => ({ day, count })),
    devices: [...devices].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
    bots: all.length - human.length,
    hours,
    heat,
    // الصفوفُ تنازليّةٌ بالوقت، فآخرُها أوّلُ مسحةٍ وأوّلُها آخرُها.
    firstScan: human.length ? human[human.length - 1].scanned_at : null,
    lastScan: human.length ? human[0].scanned_at : null,
    thisWeek,
    lastWeek,
    // الحدُّ يُقال ولا يُكتَم: صفحةٌ تعرض جزءًا وتزعم الكلَّ تكذب بلا أن تنطق
    clipped: all.length >= MAX_ROWS || days >= MAX_DAYS,
    error: null,
  };
}

/** نافذةُ وجهةٍ مؤقّتة: وجهةٌ تسري بين وقتين، وما دونها الوجهةُ الأصليّة. */
export type QrSchedule = {
  id: string;
  targetUrl: string;
  startsAt: string | null;
  endsAt: string | null;
  note: string | null;
};

/**
 * **جدولُ وجهات الباركود.**
 *
 * يُقرأ بعميل الجلسة كإخوته: سياسةُ own-row عبر الأب هي الحارس، ومفتاحُ الخدمة يتجاوزها.
 * والترتيبُ **بالبداية تنازليًّا**: كما يقرؤها المسحُ في القاعدة سواءً، فما يراه صاحبُ
 * الشاشة أعلى القائمة هو ما يقع أوّلًا عند التزاحم.
 */
export async function getQrSchedules(linkId: string): Promise<{ rows: QrSchedule[]; error: string | null }> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("qr_schedules")
    .select("id, target_url, starts_at, ends_at, note")
    .eq("link_id", linkId)
    .order("starts_at", { ascending: false, nullsFirst: false });
  if (error) return { rows: [], error: error.message };

  type Raw = { id: string; target_url: string; starts_at: string | null; ends_at: string | null; note: string | null };
  return {
    rows: ((data ?? []) as Raw[]).map((r) => ({
      id: r.id,
      targetUrl: r.target_url,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      note: r.note,
    })),
    error: null,
  };
}

/**
 * **منزلةُ الناظر من باركودٍ بعينه**: مالكٌ، أو شريكٌ يحرّر، أو قارئ.
 *
 * ومصدرٌ واحدٌ لها (٢٠٢٦-٠٩-٠٦): كانت الشاشاتُ تعرف «أمالكٌ أنت؟» فحسب، فظهر بابُ
 * الإعدادات لشريكٍ أُعطي القراءةَ وحدَها — القاعدةُ تردّ كتابتَه، لكنّ البابَ المعروضَ
 * وعدٌ لا يُوفى. فالمنزلةُ تُحسَب مرّةً وتقرؤها الشاشات.
 */
export type QrAccess = "owner" | "edit" | "read";

export async function getQrAccess(linkId: string): Promise<QrAccess | null> {
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  const me = auth.user?.id ?? null;
  if (!me) return null;

  const { data: row } = await sb.from("qr_links").select("owner_id").eq("id", linkId).maybeSingle();
  if (!row) return null;
  if ((row as { owner_id: string }).owner_id === me) return "owner";

  const { data: share } = await sb
    .from("qr_link_shares")
    .select("access")
    .eq("link_id", linkId)
    .eq("user_id", me)
    .maybeSingle();
  // ومن لا شِركةَ له وقد بلغ الصفَّ فمشرفٌ: يقرأ ولا يكتب من هنا (غرفتُه غرفةُ الإشراف).
  return (share as { access: QrAccess } | null)?.access ?? "read";
}

/** شريكٌ في باركود: اسمُه وإذنُه. */
export type QrShare = { userId: string; name: string; access: "read" | "edit" };

/**
 * **شركاءُ باركودٍ بعينه.**
 *
 * يُقرأ بعميل الجلسة: سياسةُ الجدول تُري المالكَ شركاءَ باركوده، والشريكَ صفَّه هو،
 * والمشرفَ الكلَّ — فلا سطرَ `where` في التطبيق يحرس ما تحرسه القاعدة.
 */
export async function getQrShares(linkId: string): Promise<{ rows: QrShare[]; error: string | null }> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("qr_link_shares")
    .select("user_id, access")
    .eq("link_id", linkId);
  if (error) return { rows: [], error: error.message };

  const raw = (data ?? []) as { user_id: string; access: "read" | "edit" }[];
  if (!raw.length) return { rows: [], error: null };

  const { data: people } = await sb.from("profiles").select("id, full_name").in("id", raw.map((r) => r.user_id));
  const byId = new Map(((people ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));

  return {
    rows: raw.map((r) => ({ userId: r.user_id, name: byId.get(r.user_id) ?? "غيرُ معروف", access: r.access })),
    error: null,
  };
}
