"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { verifyTurnstile } from "@/lib/turnstile";
import { EMAIL_HINT, isEmail } from "@/lib/fieldFormats";

export type ContactResult = { ok: boolean; message: string };

/**
 * إرسال رسالة تواصل — **الطريق الوحيد للكتابة**.
 *
 * كان النموذج يُدرِج في `contact_messages` من المتصفّح بالمفتاح العلنيّ، بلا درعٍ ولا خادم:
 * بابُ سبامٍ مفتوحٌ على مصراعيه، يكتب فيه أيُّ سكربتٍ ما شاء بلا تحدٍّ. وفي ٢٠٢٦-٠٨-١٦ أُغلق
 * على نهج الاستبيانات نفسِه: الرمزُ يُتحقَّق منه هنا، ثمّ يُدرَج بمفتاح الخدمة، **وتُسقَط سياسةُ
 * الإدراج العلنيّة في القاعدة** (`20260816_contact_01_close_public_insert.sql`).
 *
 * والترتيبُ ملزم: يُنشَر هذا الكودُ أوّلًا، ثمّ يُطبَّق الترحيل. ولو عُكس لانكسر النموذجُ
 * بين النشرتين: المتصفّحُ يُدرِج وقد مُنع.
 *
 * وما يتحقّق منه العميلُ يُعاد التحقّقُ منه هنا: فحصُ العميل تجربةٌ لا حراسة.
 */
export async function sendContactMessage(input: {
  name: string;
  email: string;
  subject?: string;
  message: string;
  /** رمز Turnstile من الودجة — يُتحقَّق منه قبل لمس القاعدة. */
  turnstileToken?: string;
}): Promise<ContactResult> {
  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim();
  const subject = (input.subject ?? "").trim();
  const message = (input.message ?? "").trim();

  if (!name || !email || !message) return { ok: false, message: "يرجى تعبئة الاسم والبريد والرسالة." };
  if (!isEmail(email)) return { ok: false, message: `${EMAIL_HINT}.` };
  // الحدّان نفسُهما المكتوبان في سياسة القاعدة، كي لا يفترق البابُ عن قيده
  if (name.length < 2) return { ok: false, message: "الاسم قصير جدًّا." };
  if (message.length < 10) return { ok: false, message: "الرسالة قصيرة جدًّا، اكتب لنا أكثر." };

  // درع مكافحة الروبوتات أوّلًا: قبل أيّ استعلامٍ أو كتابة
  const shieldError = await verifyTurnstile(input.turnstileToken);
  if (shieldError) return { ok: false, message: shieldError };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { ok: false, message: "إعداد الخادم ناقص. أبلغ الإدارة." };
  const sb = createAdeebServiceClient(url, key);

  const { error } = await sb.from("contact_messages").insert({
    name,
    email,
    subject: subject || null,
    message,
  });
  if (error) return { ok: false, message: "تعذّر إرسال الرسالة، حاول لاحقًا." };

  return { ok: true, message: "وصلتْنا رسالتك." };
}
