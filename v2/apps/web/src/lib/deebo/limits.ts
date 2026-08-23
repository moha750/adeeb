/**
 * حرّاسُ بوّابة ديبو — البصمةُ وحدُّ الطلبات وسقفُ الإنفاق.
 *
 * ثلاثتُها بابٌ واحد لأنّها جوابٌ واحد عن سؤالٍ واحد: **مَن يسأل، وكم يحقّ له،
 * وكم بقي في الجيب؟** وتفريقُها على المسار يجعل المِنفذ يعرف تفاصيلَ ليست شأنه.
 * والبصمةُ وحدَها انتقل جسدُها إلى `lib/visitor` وبقي بابُها هنا (انظر أدناه).
 *
 * ⚠️ خادميٌّ محض (مفتاح الخدمة والملح).
 */

import { createAdeebServiceClient } from "@adeeb/core";
import { ratesAt, type Provider } from "@/lib/deebo/providers";

/**
 * البصمةُ خرجت من هنا إلى `lib/visitor` حين طلبها عدُّ مسحات الباركود (٢٠٢٦-٠٨-٢١):
 * ملحٌ واحدٌ وطريقةُ حسابٍ واحدة لا تفترقان. وتُعاد التصديرُ من موضعها القديم فلا
 * يتغيّر سطرُ استيرادٍ واحدٍ في ديبو.
 */
export { visitorHash, clientIp } from "@/lib/visitor";

import { clubDay } from "@/lib/visitor";

/** عميلُ الخدمة (يتجاوز RLS). `null` بلا إعداد، فيُردّ الطلبُ بأمان. */
export function deeboService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
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
 *
 * ## ولماذا يُحسب اليومُ من `deebo_messages` لا من `deebo_conversations`؟
 * لعلّتين ظهرتا معًا ٢٠٢٦-٠٨-٢١:
 *  · **الثمنُ يتبدّل بالساعة** (وفرةُ DeepSeek نصفُ الذروة)، ومجموعُ محادثةٍ
 *    كاملةٍ لا يقول متى أُنفق كلُّ رمز. والرسالةُ تحمل ساعتَها، فتُسعَّر بها.
 *  · **محادثةٌ بدأت أمسَ واستمرّت اليوم** كانت تفلت من سقف اليوم كلِّها، وهذا
 *    بابٌ يتّسع بعد أن صار للداخلين سجلُّ محادثاتٍ يُستأنف.
 *
 * وصفوفُ الزائر مستثناةٌ بـ`role`: لا رموزَ فيها فلا ثمن، وقيدُها يطابق المفتاحَ
 * الجزئيّ `deebo_msg_at_idx` (ترحيلُ `20260820224550`، طُبِّق بإذن المالك
 * ٢٠٢٦-٠٨-٢١). والجدولُ اليومَ أصغرُ من أن يختاره المخطِّط، وهو للغد.
 */
export async function checkGate(
  supabase: NonNullable<ReturnType<typeof deeboService>>,
  hash: string,
  provider: Provider,
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
    .from("deebo_messages")
    .select("at, input_tokens, output_tokens, cached_tokens")
    .eq("role", "assistant")
    .gte("at", dayStart);
  if (todayErr) return { ok: false, status: 503, message: "تعذّر التحقّق الآن. أعد المحاولة بعد قليل." };

  const spent = (today ?? []).reduce((s, r) => {
    const rates = ratesAt(provider, new Date(r.at as string));
    return (
      s +
      ((r.input_tokens ?? 0) * rates.in +
        (r.cached_tokens ?? 0) * rates.cachedIn +
        (r.output_tokens ?? 0) * rates.out) /
        1_000_000
    );
  }, 0);
  if (spent >= num("DEEBO_DAILY_USD_CAP", 0.2)) {
    return { ok: false, status: 429, message: "بلغ ديبو حدَّه لهذا اليوم. عُد غدًا." };
  }

  return { ok: true };
}
