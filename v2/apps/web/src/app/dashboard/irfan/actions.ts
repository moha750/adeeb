"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdmin, getSessionAdmin } from "@/lib/auth";
import { notificationsDb } from "@/lib/notifications/db";
import { kickDispatch } from "@/lib/notifications/emit";
import { BODY_MAX, BODY_MIN, HEADINGS, customTitle, headingText } from "@/lib/irfan/vocab";
import { irfanPreviewPath, irfanWhatsAppLink } from "@/lib/irfan/whatsapp";
import { SEND_ERRORS, type IrfanSent } from "./vocab";

/**
 * أفعالُ «عِرفان» — بجلسة صاحبها، والفاعلُ تقرؤه القاعدة من `auth.uid()` لا من مُدخَل. والإشعارُ يُطلَق
 * داخل الدالّة نفسِها (فينجحان معًا)، ثمّ `kickDispatch` يوزّعه بعد الردّ.
 */

/** دلوُ صورة المعاينة: `images` العامّ، فواتساب يجلبها بلا جلسة. ولا كتابةَ فيه من المتصفّح إلّا برابطٍ موقَّع. */
const BUCKET = "images";

export async function sendIrfan(recipient: string, body: string, look: string, heading: string, custom?: string | null): Promise<IrfanSent> {
  const me = await getCurrentAdmin();
  if (!me) return { ok: false, message: "انتهت جلستك، ادخل من جديد." };
  const text = (body ?? "").trim();
  // تحقّقُ العميل تجربةٌ لا حراسة: يُعاد هنا، والقاعدةُ بعده
  if (text.length < BODY_MIN || text.length > BODY_MAX) return { ok: false, message: SEND_ERRORS.LENGTH };
  if (look !== "letter" && look !== "aurora") return { ok: false, message: SEND_ERRORS.LOOK };
  if (!HEADINGS.some((h) => h.value === heading)) return { ok: false, message: SEND_ERRORS.TITLE };
  if (heading === "custom" && !customTitle(custom)) return { ok: false, message: SEND_ERRORS.CUSTOM_TITLE };
  // العنوانُ يصوغه الخادمُ من مفتاحه بجنسَي الطرفين، فلا يصل القاعدةَ من المتصفّح إلّا ما كتبه صاحبُه بيده
  const title = headingText(heading, await recipientGender(recipient), me.gender, custom);
  const sb = await createClient();
  const { data, error } = await sb.rpc("send_irfan", { p_recipient: recipient, p_body: text, p_look: look, p_title: title });
  if (error) return { ok: false, message: "تعذّر الإرسال، حاول مرّةً أخرى." };
  const r = data as { ok: boolean; code?: string; id?: number; token?: string; phone?: string | null };
  if (!r?.ok || !r.token) return { ok: false, message: SEND_ERRORS[r?.code ?? ""] ?? "تعذّر الإرسال." };
  kickDispatch();
  revalidatePath("/dashboard/irfan");

  // المسارُ يصكّه الخادمُ من رمز الرسالة، فلا يكتب المتصفّحُ إلّا صورةَ رسالته هو
  let upload: IrfanSent["upload"] = null;
  const store = notificationsDb()?.storage.from(BUCKET);
  if (store) {
    const t = await store.createSignedUploadUrl(irfanPreviewPath(r.token), { upsert: true });
    if (!t.error && t.data) upload = { path: t.data.path, token: t.data.token };
  }
  const whatsapp = r.id ? await whatsappFor(r.id, null) : null;
  return { ok: true, message: "حُفظ عِرفانُك.", id: r.id, upload, whatsapp };
}

/** جنسُ المستلم لصياغة العنوان. والمستلمُ قائدٌ، وجنسُه ظاهرٌ في مقعده أصلًا. */
async function recipientGender(id: string): Promise<"male" | "female" | null> {
  const { data } = (await notificationsDb()?.from("profiles").select("gender").eq("id", id).maybeSingle()) ?? {};
  const g = (data as { gender?: string } | null | undefined)?.gender;
  return g === "female" || g === "male" ? g : null;
}

/**
 * رابطُ المحادثة لرسالةٍ بعينها: رقمُ المستلم وجنسُه واسمُ الموسم من القاعدة بمفتاح الخدمة. و`sender`
 * يحصرها في رسائل صاحب الجلسة (`null` بعد الإرسال مباشرةً: الرسالةُ رسالتُه بحكم أنّه أرسلها الآن).
 */
async function whatsappFor(id: number, sender: string | null): Promise<string | null> {
  const db = notificationsDb();
  if (!db) return null;
  let q = db.from("irfan_messages").select("share_token, recipient_id, recipient_gender, irfan_seasons(title)").eq("id", id);
  if (sender) q = q.eq("sender_id", sender);
  const { data } = await q.maybeSingle();
  if (!data) return null;
  const { data: p } = await db.from("profiles").select("phone").eq("id", data.recipient_id).maybeSingle();
  const s = Array.isArray(data.irfan_seasons) ? data.irfan_seasons[0] : data.irfan_seasons;
  return irfanWhatsAppLink(p?.phone, data.share_token, { gender: data.recipient_gender, season: (s as { title?: string } | null)?.title });
}

/**
 * رابطُ واتساب لرسالةٍ أرسلها صاحبُ الجلسة من قبل — لمن أغلق المحادثةَ قبل أن يرسل. والرقمُ يُقرأ
 * بمفتاح الخدمة لرسالته هو وحدها (`sender_id`)، فلا يصير بابًا إلى أرقام من لم يكتب لهم.
 */
export async function irfanWhatsApp(id: number): Promise<string | null> {
  const me = await getSessionAdmin();
  if (!me || !Number.isSafeInteger(id)) return null;
  return await whatsappFor(id, me.id);
}

/**
 * **ترميمُ صورة المعاينة** — رسالةٌ أرسلها صاحبُ الجلسة ولم تُرفع صورتُها (سقط رسمُها في متصفّحه يومَ
 * أُرسلت، فعرض واتساب شعارَ الموقع بدل البطاقة). تُفتح الغرفةُ فيُسأل عنها: إن غابت الصورةُ صُكّ رابطُ
 * رفعٍ لها وحدها، فيرسمها المتصفّحُ ويرفعها. ورسائلُه وحدها (`sender_id`)، والمسارُ من رمزها لا منه.
 */
export async function irfanPreviewSlot(id: number): Promise<IrfanSent["upload"]> {
  const me = await getSessionAdmin();
  const db = notificationsDb();
  if (!me || !db || !Number.isSafeInteger(id)) return null;
  const { data } = await db.from("irfan_messages").select("share_token").eq("id", id).eq("sender_id", me.id).maybeSingle();
  if (!data?.share_token) return null;
  const store = db.storage.from(BUCKET);
  const { data: found, error } = await store.list("irfan", { search: `${data.share_token}.jpg`, limit: 1 });
  if (error || (found ?? []).some((f) => f.name === `${data.share_token}.jpg`)) return null;
  const t = await store.createSignedUploadUrl(irfanPreviewPath(data.share_token), { upsert: true });
  return !t.error && t.data ? { path: t.data.path, token: t.data.token } : null;
}

/**
 * **سجلُّ ما سقط** (`irfan_preview_failures`): تجهيزُ صورةٍ سقط بعد محاولاته كلِّها، بخطوته وخطئه وجهازه.
 * رسالةُ صاحب الجلسة وحدها، والقيمُ تُقصّ ولا تُرفض: السجلُّ يُكتب ولو جاء ناقصًا.
 */
export async function irfanPreviewFailed(
  id: number, step: string, origin: string, error: string | null, userAgent: string | null,
): Promise<void> {
  const me = await getSessionAdmin();
  const db = notificationsDb();
  if (!me || !db || !Number.isSafeInteger(id)) return;
  if (step !== "render" && step !== "upload") return;
  if (origin !== "compose" && origin !== "room") return;
  const { data } = await db.from("irfan_messages").select("id").eq("id", id).eq("sender_id", me.id).maybeSingle();
  if (!data) return;
  await db.from("irfan_preview_failures").insert({
    message_id: id, sender_id: me.id, step, origin,
    error: error ? error.slice(0, 500) : null,
    user_agent: userAgent ? userAgent.slice(0, 400) : null,
  });
}

export async function markIrfanRead(id: number): Promise<void> {
  if (!Number.isSafeInteger(id)) return;
  const sb = await createClient();
  await sb.rpc("mark_irfan_read", { p_id: id });
}
