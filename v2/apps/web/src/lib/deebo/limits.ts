/**
 * حرّاسُ بوّابة ديبو — البصمةُ وحدُّ الطلبات وسقفُ الإنفاق.
 *
 * ثلاثتُها في ملفٍّ واحد لأنّها جوابٌ واحد عن سؤالٍ واحد: **مَن يسأل، وكم يحقّ له،
 * وكم بقي في الجيب؟** وتفريقُها على المسار يجعل المِنفذ يعرف تفاصيلَ ليست شأنه.
 *
 * ⚠️ خادميٌّ محض (مفتاح الخدمة والملح).
 */

import { createAdeebServiceClient } from "@adeeb/core";
import { CLUB_TZ } from "@/lib/dates";
import { createHash } from "node:crypto";

/** عميلُ الخدمة (يتجاوز RLS). `null` بلا إعداد، فيُردّ الطلبُ بأمان. */
export function deeboService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

/** تاريخُ اليوم بتوقيت النادي. لا `getDate()` هنا: خادمُ Vercel يعمل بـUTC. */
function clubDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CLUB_TZ }).format(now);
}

/**
 * بصمةُ الزائر: `sha256(ip ‖ salt ‖ يومُ النادي)`.
 *
 * **وإقحامُ اليوم هو بيت القصيد.** المحادثاتُ تبقى بلا أجل بأمر المالك، فلو
 * ثبتت البصمةُ لصارت مُعرِّفًا دائمًا يصل زياراتِ شخصٍ عبر السنين. ودورانُها
 * اليوميّ يُبقي ما يلزم (منعُ استنزافٍ خلال ساعة) ويُسقط ما لا يلزم (وصلُ
 * أمسِ باليوم). فالسجلُّ يحفظ **ما قيل** ولا يحفظ **من قاله**.
 *
 * وغيابُ الملحِ لا يُسكَت عنه في الإنتاج: بصمةٌ بلا ملحٍ تُخمَّن بجدول عناوين.
 */
export function visitorHash(ip: string): string {
  const salt = process.env.DEEBO_SALT?.trim();
  if (!salt) {
    if (process.env.NODE_ENV === "production") throw new Error("DEEBO_SALT ناقص");
    return createHash("sha256").update(`${ip}|dev|${clubDay()}`).digest("hex");
  }
  return createHash("sha256").update(`${ip}|${salt}|${clubDay()}`).digest("hex");
}

/** عنوانُ الطالب من ترويسات الوكيل. يُستعمل للبصمة فورًا ولا يُخزَّن أبدًا. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

const num = (key: string, fallback: number): number => {
  const raw = Number(process.env[key]?.trim());
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

export type Gate = { ok: true } | { ok: false; status: number; message: string };

/**
 * حارسان قبل أن يُنادى المزوّد.
 *
 * وترتيبُهما مقصود: **حدُّ الزائر أوّلًا** لأنّه استعلامٌ صغيرٌ مفهرس، وسقفُ
 * اليوم ثانيًا لأنّه يمسح صفوف اليوم كلَّها. ومن رُدّ بالأوّل لم يكلّفنا الثاني.
 *
 * والسقفُ **يوميٌّ لا شهريّ** عمدًا: سقفٌ شهريٌّ يسمح بإحراق الشهر كلِّه في
 * ساعةٍ واحدة، واليوميُّ يحدّ الضرر ويترك للمالك وقتًا لينتبه.
 */
export async function checkGate(
  supabase: NonNullable<ReturnType<typeof deeboService>>,
  hash: string,
  rates: { in: number; cachedIn: number; out: number },
): Promise<Gate> {
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { data: mine, error: mineErr } = await supabase
    .from("deebo_conversations")
    .select("message_count")
    .eq("visitor_hash", hash)
    .gte("started_at", hourAgo);

  // عطبُ القاعدة يُردّ رفضًا لا قبولًا: الفشلُ يُغلق (كدرع Turnstile)
  if (mineErr) return { ok: false, status: 503, message: "تعذّر التحقّق الآن. أعد المحاولة بعد قليل." };

  const mineCount = (mine ?? []).reduce((s, r) => s + (r.message_count ?? 0), 0);
  if (mineCount >= num("DEEBO_MAX_PER_HOUR", 20)) {
    return { ok: false, status: 429, message: "أكثرتَ من الأسئلة في هذه الساعة. عُد بعد قليل." };
  }

  const dayStart = new Date(`${clubDay()}T00:00:00+03:00`).toISOString();
  const { data: today, error: todayErr } = await supabase
    .from("deebo_conversations")
    .select("total_input_tokens, total_output_tokens, total_cached_tokens")
    .gte("started_at", dayStart);
  if (todayErr) return { ok: false, status: 503, message: "تعذّر التحقّق الآن. أعد المحاولة بعد قليل." };

  const spent = (today ?? []).reduce(
    (s, r) =>
      s +
      ((r.total_input_tokens ?? 0) * rates.in +
        (r.total_cached_tokens ?? 0) * rates.cachedIn +
        (r.total_output_tokens ?? 0) * rates.out) /
        1_000_000,
    0,
  );
  if (spent >= num("DEEBO_DAILY_USD_CAP", 0.2)) {
    return { ok: false, status: 429, message: "بلغ ديبو حدَّه لهذا اليوم. عُد غدًا." };
  }

  return { ok: true };
}
