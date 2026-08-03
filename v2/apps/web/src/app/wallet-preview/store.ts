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

export type CardState = { serial: string; stamps: number; cycles: number; updatedAt: string };

/** حالةُ بطاقةٍ واحدة — أو `null` إن تعذّرت القراءة (فتتولّى الصفحةُ حالتَها المحلّيّة). */
export async function getCard(serial: string): Promise<CardState | null> {
  const sb = service();
  if (!sb) return null;
  const { data } = await sb
    .from("wallet_preview_cards")
    .select("serial, stamps, cycles, updated_at")
    .eq("serial", serial)
    .maybeSingle();
  return data ? { serial: data.serial, stamps: data.stamps, cycles: data.cycles, updatedAt: data.updated_at } : null;
}

/** كلُّ البطاقات دفعةً — تقرؤها الصفحة عند فتحها فتبدأ من حالة الخادم لا من البذرة. */
export async function getAllCards(): Promise<Record<string, { stamps: number; cycles: number }>> {
  const sb = service();
  if (!sb) return {};
  const { data } = await sb.from("wallet_preview_cards").select("serial, stamps, cycles");
  return Object.fromEntries((data ?? []).map((c) => [c.serial, { stamps: c.stamps, cycles: c.cycles }]));
}

/** يكتب الحالة الجديدة. `updated_at` صريحٌ لأنّ `If-Modified-Since` يُقاس عليه. */
export async function setCard(serial: string, stamps: number, cycles: number): Promise<CardState | null> {
  const sb = service();
  if (!sb) return null;
  const { data } = await sb
    .from("wallet_preview_cards")
    .upsert({ serial, stamps, cycles, updated_at: new Date().toISOString() }, { onConflict: "serial" })
    .select("serial, stamps, cycles, updated_at")
    .maybeSingle();
  return data ? { serial: data.serial, stamps: data.stamps, cycles: data.cycles, updatedAt: data.updated_at } : null;
}

/* ── الأجهزة ────────────────────────────────────────────────────────────── */

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
 * أرقامُ بطاقاتٍ سجّلها هذا الجهاز وتغيّرت بعد `since` — جوابُ مسار «ما الذي تغيّر؟».
 * بلا `since` تُرَدّ كلُّها (أوّلُ سؤالٍ بعد التسجيل).
 */
export async function changedFor(deviceId: string, since: string | null): Promise<{ serials: string[]; lastUpdated: string }> {
  const sb = service();
  if (!sb) return { serials: [], lastUpdated: new Date(0).toISOString() };

  const { data: regs } = await sb.from("wallet_preview_devices").select("serial").eq("device_id", deviceId);
  const serials = (regs ?? []).map((r) => r.serial);
  if (serials.length === 0) return { serials: [], lastUpdated: new Date(0).toISOString() };

  // **مِجسُّ تشخيصٍ لا سلوك**: وصولُ الجهاز إلى هنا يعني أنّ الدفعة بلغته وأنّه استيقظ.
  // فإن سكن العمود بعد دفعةٍ قبلتها أبل، فالعلّة في التسليم لا في خدمتنا.
  void sb.from("wallet_preview_devices").update({ last_poll_at: new Date().toISOString() }).eq("device_id", deviceId);

  let q = sb.from("wallet_preview_cards").select("serial, updated_at").in("serial", serials);
  // `since` وسمٌ معتِمٌ عند أبل: نحن من أعطيناه، ونحن من نفسّره — وهو زمنُ آخر تغيير.
  if (since) q = q.gt("updated_at", since);

  const { data: cards } = await q;
  const rows = cards ?? [];
  const lastUpdated = rows.reduce((max, c) => (c.updated_at > max ? c.updated_at : max), since ?? new Date(0).toISOString());
  return { serials: rows.map((c) => c.serial), lastUpdated };
}
