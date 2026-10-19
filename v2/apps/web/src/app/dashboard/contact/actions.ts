"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { SECTION_CAP } from "@/lib/capabilities";
import { CLUB_EMAIL } from "@/lib/clubContact";
import type { ContactStatus } from "@/lib/contact/vocab";

export type ContactResult = { ok: boolean; message: string };

const CAP = SECTION_CAP["/dashboard/contact"];

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/**
 * سلطةُ الغرفة — قدرةٌ واحدة (`manage_contact`) تفتح البابَ وتُجيز الفعل.
 * فلا فرقَ بين قارئٍ وراد: من يرى بريد الزائر يردّ عليه.
 */
async function authorized() {
  const admin = await getCurrentAdmin();
  if (!admin) return { admin: null, deny: { ok: false, message: "جلستك غير صالحة." } };
  if (!admin.caps.includes(CAP)) return { admin: null, deny: { ok: false, message: "لا تملك صلاحية رسائل التواصل." } };
  return { admin, deny: null };
}

const refresh = () => revalidatePath("/dashboard/contact");

/** تعليمُها مقروءة — الحالةُ الوحيدة التي تُكتب بيدٍ؛ و«أُجيب عنها» يكتبها الردُّ نفسه. */
export async function setContactStatus(id: string, status: ContactStatus): Promise<ContactResult> {
  const { admin, deny } = await authorized();
  if (!admin) return deny!;

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { error } = await sb
    .from("contact_messages")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: `تعذّر تحديث الحالة: ${error.message}` };

  refresh();
  return { ok: true, message: "حُدِّثت الحالة." };
}

/** ملاحظةٌ داخليّة على الرسالة — لأهل اللوحة وحدهم، لا تُرسَل إلى أحد. */
export async function saveContactNotes(id: string, notes: string): Promise<ContactResult> {
  const { admin, deny } = await authorized();
  if (!admin) return deny!;

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { error } = await sb
    .from("contact_messages")
    .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: `تعذّر حفظ الملاحظة: ${error.message}` };

  refresh();
  return { ok: true, message: "حُفظت الملاحظة." };
}

/**
 * الردّ — **بريدٌ فعليّ يخرج من نطاق النادي**، لا سطرٌ يُخزَّن ويُنسى.
 *
 * فعلٌ واحدٌ في القاعدة (`reply_contact_message`): يُسجَّل الردُّ وتُكتب رسالتُه في صادر البريد معًا،
 * والمُرسِلُ الواحدُ يرسلها في ثوانٍ بإعاداته وسجلّه (`v2/EMAIL-SYSTEM.md`). ووجهةُ البريد تُقرأ من
 * الصفّ نفسه فلا يُمرَّر عنوانٌ من هنا. والردُّ **باسم النادي وحده** (قرار المالك ٢٠٢٦-١٠-١٨): لا اسمَ
 * للرادّ في البريد، و«ردَّ على هذا البريد» يصل بريدَ النادي (`CLUB_EMAIL`) لا بريدَ الرادّ، فتبقى المحادثةُ
 * للنادي. ومن ردَّ يبقى أثرًا داخليًّا في الصفّ (`replied_by`).
 * وسلطةُ الإنسان فُحصت قبله في `authorized()`، والدالّةُ لمفتاح الخدمة وحده.
 */
export async function sendContactReply(id: string, reply: string): Promise<ContactResult> {
  const { admin, deny } = await authorized();
  if (!admin) return deny!;

  const body = reply.trim();
  if (body.length < 2) return { ok: false, message: "اكتب نصّ الردّ أوّلًا." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await sb.rpc("reply_contact_message", {
    p_actor: admin.id,
    p_id: id,
    p_reply: body,
    p_reply_to: CLUB_EMAIL,
  });
  if (error) return { ok: false, message: `تعذّر حفظ الردّ: ${error.message}` };

  const res = (data ?? {}) as { ok?: boolean; message?: string };
  if (!res.ok) return { ok: false, message: res.message ?? "تعذّر حفظ الردّ." };

  refresh();
  return { ok: true, message: "حُفظ الردّ، ويصل بريدَ المُرسِل خلال لحظات." };
}
