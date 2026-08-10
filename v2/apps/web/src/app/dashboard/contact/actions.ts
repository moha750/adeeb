"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { SECTION_CAP } from "@/lib/capabilities";
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
 * الإرسالُ والتسجيلُ في دالّة الحافة `send-contact-reply` معًا: هي وحدها تعرف مفتاح Resend،
 * وتقرأ وجهةَ البريد من الصفّ نفسه فلا يُمرَّر عنوانٌ من هنا. ونداؤها بمفتاح الخدمة —
 * وسلطةُ الإنسان فُحصت قبله في `authorized()`.
 */
export async function sendContactReply(id: string, reply: string): Promise<ContactResult> {
  const { admin, deny } = await authorized();
  if (!admin) return deny!;

  const body = reply.trim();
  if (body.length < 2) return { ok: false, message: "اكتب نصّ الردّ أوّلًا." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await sb.functions.invoke("send-contact-reply", {
    body: {
      message_id: id,
      reply: body,
      responder_id: admin.id,
      responder_name: admin.fullName,
      responder_email: admin.email,
    },
  });

  if (error) {
    // جوابُ الدالّة يحمل سببًا مقروءًا (مفتاحٌ ناقص · Resend رفض) — نُظهره كما هو.
    const detail = await readFunctionError(error);
    return { ok: false, message: detail ?? "تعذّر إرسال الردّ." };
  }

  const res = (data ?? {}) as { ok?: boolean; recorded?: boolean; error?: string };
  if (!res.ok) return { ok: false, message: res.error ?? "تعذّر إرسال الردّ." };

  refresh();
  return {
    ok: true,
    // صدقٌ في الحالة النادرة: خرج البريد ولم يُثبَت في السجلّ.
    message: res.recorded === false
      ? "أُرسل الردّ إلى بريد المُرسِل، لكن تعذّر تسجيله في السجلّ."
      : "أُرسل الردّ إلى بريد المُرسِل.",
  };
}

/** رسالةُ خطأ دالّة الحافة — جسدُ الجواب إن كان، وإلّا نصُّ الخطأ نفسه. */
async function readFunctionError(error: unknown): Promise<string | null> {
  const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
  if (ctx?.json) {
    try {
      const j = (await ctx.json()) as { error?: string };
      if (j?.error === "RESEND_API_KEY not configured") {
        return "مفتاح Resend غير مُهيّأ في دوالّ الحافة، لم يخرج البريد.";
      }
      if (j?.error) return `تعذّر إرسال الردّ: ${j.error}`;
    } catch {
      /* جسدٌ غير قابل للقراءة — نسقط إلى نصّ الخطأ */
    }
  }
  return error instanceof Error ? `تعذّر إرسال الردّ: ${error.message}` : null;
}
