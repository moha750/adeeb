import "server-only";

import { createHmac } from "node:crypto";
import { createAdeebServiceClient } from "@adeeb/core";

/**
 * حالةُ البطاقات والأجهزة — **خادميّةٌ حصرًا**.
 *
 * لمّا صارت البطاقة تتحدّث في الجوّال، لم يعد لذاكرة المتصفّح أن تكون الحقيقة: الخادمُ
 * هو من يولّد النسخة الجديدة حين يسألها الجهاز، فلا بدّ أن يعرف كم خُتم. فانتقلت الحالةُ
 * إلى جدولين مؤقّتين (`wallet_preview_*`) يُسقَطان مع المجلّد.
 *
 * **ولا يعطب العرضُ إن عطبت القاعدة**: كلّ دالّةٍ هنا ترجع `null` أو تُخفق بهدوء، والصفحة
 * تبقى عاملةً بحالتها المحلّيّة. معاينةٌ تُعرَض على راعٍ لا يجوز أن تسقط لأنّ جدولًا تعثّر.
 */

/** عميلُ دور الخدمة — الجدولان محروسان بـRLS بلا سياسة، فلا يبلغهما غيرُه. */
function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // نفسُ تنقية بقيّة اللوحة: مفاتيح تُلصَق فتحمل فراغًا أو سطرًا.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/* ── رمز المصادقة ───────────────────────────────────────────────────────── */

/**
 * `authenticationToken` الذي يحمله الجهاز في كلّ طلبٍ إلى خدمتنا.
 *
 * **مشتقٌّ لا مخزَّن**: HMAC للرقم التسلسليّ بمفتاح الشهادة الخاصّ — فلا عمودَ يحفظه ولا
 * متغيّرَ بيئةٍ سادس يُضبَط في مكانين. والمفتاح خادميٌّ لا يغادر، والاشتقاق أحاديّ.
 *
 * > تحفّظٌ موثَّق: تدوير الشهادة يُبطل الرموز القائمة، فتتوقّف الأجهزة المسجَّلة عن
 * > التحديث حتى تُضاف البطاقةُ ثانية. مقبولٌ في معاينة، وغيرُ مقبولٍ في نظامٍ حقيقيّ —
 * > هناك يكون الرمز عمودًا عشوائيًّا في الصفّ.
 */
export function authTokenFor(serial: string): string {
  const secret = process.env.WALLET_PASS_KEY_PEM ?? "";
  return createHmac("sha256", secret).update(`wallet-preview:${serial}`).digest("hex").slice(0, 32);
}

/** مقارنةٌ لا تُفشي بالتوقيت — الطولان متساويان دائمًا فالبساطة كافية. */
export function authOk(serial: string, header: string | null): boolean {
  const want = authTokenFor(serial);
  const got = (header ?? "").replace(/^ApplePass\s+/i, "").trim();
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i += 1) diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

/* ── البطاقات ───────────────────────────────────────────────────────────── */

/**
 * حالةُ صفٍّ واحد — **وفيه عدّادا النظامين معًا** وإن استعمل كلُّ صفٍّ نصفَه:
 * صفوفُ الأختام (`…-CARD-…`) تستعمل `stamps`/`cycles`، وصفوفُ النقاط (`…-PTS-…`)
 * تستعمل `points`/`redemptions`. فالرقمُ يقول لأيّ نظامٍ هو، ولا عمودَ يُحمَّل معنيين.
 */
export type CardState = {
  serial: string;
  stamps: number;
  cycles: number;
  points: number;
  redemptions: number;
  updatedAt: string;
};

/** أعمدةُ الصفّ كما تُقرأ في كلّ استعلامٍ هنا — مكتوبةٌ مرّةً فلا تفترق قراءتان. */
const COLS = "serial, stamps, cycles, points, redemptions, updated_at";

/** صفٌّ من القاعدة إلى `CardState` — مصدرٌ واحدٌ للتحويل. */
type Row = { serial: string; stamps: number; cycles: number; points: number; redemptions: number; updated_at: string };
const toState = (r: Row): CardState => ({
  serial: r.serial,
  stamps: r.stamps,
  cycles: r.cycles,
  points: r.points,
  redemptions: r.redemptions,
  updatedAt: r.updated_at,
});

/** حالةُ بطاقةٍ واحدة — أو `null` إن تعذّرت القراءة (فتتولّى الصفحةُ حالتَها المحلّيّة). */
export async function getCard(serial: string): Promise<CardState | null> {
  const sb = service();
  if (!sb) return null;
  const { data } = await sb.from("wallet_preview_cards").select(COLS).eq("serial", serial).maybeSingle();
  return data ? toState(data) : null;
}

/**
 * كلُّ البطاقات دفعةً — تقرؤها الصفحة عند فتحها فتبدأ من حالة الخادم لا من البذرة، ثمّ
 * تسألها كلّ بضع ثوانٍ لتتبع الصفحةَ الأخرى (`state/route.ts`).
 *
 * **و`updatedAt` يُردّ معها لأنّه الحَكَم**: الصفحةُ تُقدّم فعلَ صاحبها فورًا (تفاؤلًا) ثمّ
 * تسأل الخادم؛ فلولا زمنٌ تُقارَن به لَجاء جوابٌ متأخّرٌ يحمل حالةً أقدمَ فيمحو ما فعله
 * للتوّ. فالأحدثُ يفوز، والقديمُ يُهمَل.
 */
export async function getAllCards(): Promise<Record<string, Omit<CardState, "serial">>> {
  const sb = service();
  if (!sb) return {};
  const { data } = await sb.from("wallet_preview_cards").select(COLS);
  return Object.fromEntries(
    (data ?? []).map((c) => {
      const { serial, ...rest } = toState(c);
      return [serial, rest];
    }),
  );
}

/**
 * يكتب الحالة الجديدة. `updated_at` صريحٌ لأنّ `If-Modified-Since` يُقاس عليه.
 *
 * **والرقعةُ جزئيّة** (`Partial`) لأنّ الصفّ يخدم نظامين: كاتبُ الأختام لا يمسّ النقاط
 * ولا العكس. ولو كُتبت الأربعةُ دائمًا لَصفّر كلُّ ختمٍ رصيدَ بطاقةٍ أخرى.
 */
export async function setCard(
  serial: string,
  patch: Partial<Pick<CardState, "stamps" | "cycles" | "points" | "redemptions">>,
): Promise<CardState | null> {
  const sb = service();
  if (!sb) return null;
  const { data } = await sb
    .from("wallet_preview_cards")
    .upsert({ serial, ...patch, updated_at: new Date().toISOString() }, { onConflict: "serial" })
    .select(COLS)
    .maybeSingle();
  return data ? toState(data) : null;
}

/* ── الأجهزة ────────────────────────────────────────────────────────────── */

/**
 * يحفظ ما تقوله أبل عن أعطال البطاقة (من `/w/v1/log`). كان يُكتب في سجلّ الخادم وحده
 * فلا يُقرأ إلّا من لوحة Vercel — وصار صفوفًا تُستعلَم من حيث نشخّص.
 */
export async function appendLog(lines: string[]): Promise<void> {
  const sb = service();
  if (!sb || lines.length === 0) return;
  await sb.from("wallet_preview_log").insert(lines.map((line) => ({ line: line.slice(0, 2000) })));
}

/**
 * **مِجسُّ الجلب** (مؤقّت كأخيه): يسجّل مجيءَ الجهاز يطلب النسخة وبِمَ رددنا عليه.
 * به تُقرأ آخرُ حلقةٍ في السلسلة — وهي الوحيدة التي بقيت مظلمةً بعد أن أثبت المِجسُّ
 * الأوّل أنّ الدفعة تصل وأنّ الجهاز يستيقظ.
 */
export async function noteFetch(serial: string, note: string): Promise<void> {
  const sb = service();
  if (!sb) return;
  await sb
    .from("wallet_preview_cards")
    .update({ last_fetch_at: new Date().toISOString(), last_fetch_note: note })
    .eq("serial", serial);
}

/** يسجّل جهازًا لبطاقة. يرجع `true` إن كان تسجيلًا جديدًا (أبل تريد ٢٠١ لا ٢٠٠). */
export async function registerDevice(deviceId: string, serial: string, pushToken: string): Promise<boolean> {
  const sb = service();
  if (!sb) return false;
  const { data: existing } = await sb
    .from("wallet_preview_devices")
    .select("device_id")
    .eq("device_id", deviceId)
    .eq("serial", serial)
    .maybeSingle();
  // رمزُ الدفع يتغيّر مع الوقت، فالتسجيلُ المعاد يحدّثه ولا يُهمَل.
  await sb
    .from("wallet_preview_devices")
    .upsert({ device_id: deviceId, serial, push_token: pushToken }, { onConflict: "device_id,serial" });
  return !existing;
}

export async function unregisterDevice(deviceId: string, serial: string): Promise<void> {
  const sb = service();
  if (!sb) return;
  await sb.from("wallet_preview_devices").delete().eq("device_id", deviceId).eq("serial", serial);
}

/** رموزُ الدفع لبطاقةٍ — من نُبلّغهم أنّ فيها جديدًا. */
export async function tokensFor(serial: string): Promise<string[]> {
  const sb = service();
  if (!sb) return [];
  const { data } = await sb.from("wallet_preview_devices").select("push_token").eq("serial", serial);
  return (data ?? []).map((d) => d.push_token);
}

/** يُسقِط رمزًا رفضته أبل بـ٤١٠ (حُذفت البطاقة من الجهاز) — فلا نطارد ميّتًا. */
export async function dropToken(pushToken: string): Promise<void> {
  const sb = service();
  if (!sb) return;
  await sb.from("wallet_preview_devices").delete().eq("push_token", pushToken);
}

/**
 * يفكّ وسمَ «ما بعد» إلى زمنٍ يُقارَن به — أو `null` إن لم يُفهَم (فتُرَدّ البطاقات كلُّها،
 * وهو الجانب الآمن: تحديثٌ زائدٌ خيرٌ من تحديثٍ ضائع).
 *
 * **والوسمُ الذي نُصدره أرقامٌ صِرفة** (ميلي ثانية) — والسببُ عطبٌ كلّفنا جولات:
 * كان الوسم زمنًا بصيغة ISO فيه `+00:00`، فيُعيده iOS **حرفيًّا في مُعامِل استعلام**،
 * و`+` في مُعامِلات الاستعلام **تُقرأ مسافةً** (ترميز `x-www-form-urlencoded`). فيصلنا
 * `…734 00:00` مشوَّهًا، فتُخفق المقارنة، فنجيب **٢٠٤ «لا جديد»** — والجهاز يطيع ولا
 * يجلب. كلُّ السلسلة تعمل، والكسرُ في آخر حلقةٍ وأخفاها.
 *
 * **والدرس أعمُّ من هذا الموضع**: أيّ وسمٍ يعود إلينا في مُعامِل استعلام يجب أن يخلو من
 * `+` و`&` و`=` والمسافة — أو يُرمَّز. والأرقام أسلمُ من الترميز، إذ لا تعتمد على أنّ
 * الطرفَ الآخر يُرمّز صحيحًا.
 */
function parseSince(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (/^\d+$/.test(t)) return new Date(Number(t)).toISOString();
  // وسمٌ قديمٌ من قبل الإصلاح: تُردّ المسافةُ الأخيرة إلى `+` قبل القراءة
  const d = new Date(t.replace(/ (\d{2}:\d{2})$/, "+$1"));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * أرقامُ بطاقاتٍ سجّلها هذا الجهاز وتغيّرت بعد `since` — جوابُ مسار «ما الذي تغيّر؟».
 * بلا `since` تُرَدّ كلُّها (أوّلُ سؤالٍ بعد التسجيل).
 */
export async function changedFor(deviceId: string, since: string | null): Promise<{ serials: string[]; lastUpdated: string }> {
  /** الوسمُ الصادر: أرقامٌ صِرفة لا محرفَ فيها يلتبس في مُعامِل استعلام — انظر `parseSince`. */
  const tag = (iso: string): string => String(Date.parse(iso) || 0);

  const sb = service();
  if (!sb) return { serials: [], lastUpdated: "0" };

  const { data: regs } = await sb.from("wallet_preview_devices").select("serial").eq("device_id", deviceId);
  const serials = (regs ?? []).map((r) => r.serial);
  if (serials.length === 0) return { serials: [], lastUpdated: "0" };

  // **مِجسُّ تشخيصٍ لا سلوك**: وصولُ الجهاز إلى هنا يعني أنّ الدفعة بلغته وأنّه استيقظ.
  // فإن سكن العمود بعد دفعةٍ قبلتها أبل، فالعلّة في التسليم لا في خدمتنا.
  //
  // **ويُنتظَر ولا يُترَك**: باني استعلامات Supabase كسولٌ — لا يُرسَل شيءٌ حتى يُستدعى
  // `then`، فـ`void` عليه لا يُشغّله البتّة (وهو ما كتبتُه أوّلًا فبقي العمود فارغًا).
  // ولو أُطلق بلا انتظارٍ لَقطعته الدالّة الخادميّة عند انتهائها.
  await sb.from("wallet_preview_devices").update({ last_poll_at: new Date().toISOString() }).eq("device_id", deviceId);

  let q = sb.from("wallet_preview_cards").select("serial, updated_at").in("serial", serials);
  // `since` وسمٌ معتِمٌ عند أبل: نحن من أعطيناه، ونحن من نفسّره — وهو زمنُ آخر تغيير.
  const sinceIso = parseSince(since);
  if (sinceIso) q = q.gt("updated_at", sinceIso);

  const { data: cards } = await q;
  const rows = cards ?? [];
  const newestIso = rows.reduce((max, c) => (c.updated_at > max ? c.updated_at : max), sinceIso ?? new Date(0).toISOString());
  return { serials: rows.map((c) => c.serial), lastUpdated: tag(newestIso) };
}
