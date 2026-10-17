"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionAdmin } from "@/lib/auth";
import { notificationsDb } from "@/lib/notifications/db";
import { kickDispatch } from "@/lib/notifications/emit";
import { BODY_MAX, BODY_MIN } from "@/lib/irfan/vocab";
import { irfanPreviewPath, irfanWhatsAppLink } from "@/lib/irfan/whatsapp";
import { SEND_ERRORS, type IrfanSent } from "./vocab";

/**
 * أفعالُ «عِرفان» — بجلسة صاحبها، والفاعلُ تقرؤه القاعدة من `auth.uid()` لا من مُدخَل. والإشعارُ يُطلَق
 * داخل الدالّة نفسِها (فينجحان معًا)، ثمّ `kickDispatch` يوزّعه بعد الردّ.
 */

/** دلوُ صورة المعاينة: `images` العامّ، فواتساب يجلبها بلا جلسة. ولا كتابةَ فيه من المتصفّح إلّا برابطٍ موقَّع. */
const BUCKET = "images";

export async function sendIrfan(recipient: string, body: string, look: string): Promise<IrfanSent> {
  if (!(await getSessionAdmin())) return { ok: false, message: "انتهت جلستك، ادخل من جديد." };
  const text = (body ?? "").trim();
  // تحقّقُ العميل تجربةٌ لا حراسة: يُعاد هنا، والقاعدةُ بعده
  if (text.length < BODY_MIN || text.length > BODY_MAX) return { ok: false, message: SEND_ERRORS.LENGTH };
  if (look !== "letter" && look !== "aurora") return { ok: false, message: SEND_ERRORS.LOOK };
  const sb = await createClient();
  const { data, error } = await sb.rpc("send_irfan", { p_recipient: recipient, p_body: text, p_look: look });
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
  return { ok: true, message: "حُفظ عِرفانُك.", id: r.id, upload, whatsapp: irfanWhatsAppLink(r.phone, text, r.token) };
}

/**
 * رابطُ واتساب لرسالةٍ أرسلها صاحبُ الجلسة من قبل — لمن أغلق المحادثةَ قبل أن يرسل. والرقمُ يُقرأ
 * بمفتاح الخدمة لرسالته هو وحدها (`sender_id`)، فلا يصير بابًا إلى أرقام من لم يكتب لهم.
 */
export async function irfanWhatsApp(id: number): Promise<string | null> {
  const me = await getSessionAdmin();
  const db = notificationsDb();
  if (!me || !db || !Number.isSafeInteger(id)) return null;
  const { data } = await db.from("irfan_messages").select("body, share_token, recipient_id").eq("id", id).eq("sender_id", me.id).maybeSingle();
  if (!data) return null;
  const { data: p } = await db.from("profiles").select("phone").eq("id", data.recipient_id).maybeSingle();
  return irfanWhatsAppLink(p?.phone, data.body, data.share_token);
}

export async function markIrfanRead(id: number): Promise<void> {
  if (!Number.isSafeInteger(id)) return;
  const sb = await createClient();
  await sb.rpc("mark_irfan_read", { p_id: id });
}
