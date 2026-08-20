import { headers } from "next/headers";

/**
 * درع Turnstile — **مصدرٌ واحد** يسأل كلاودفلير عن رمز العميل قبل أن يُقبل إرسالٌ.
 *
 * كان يسكن `surveys/[id]/actions.ts` وحده، فلمّا احتاجه بابُ التواصل في ٢٠٢٦-٠٨-١٦
 * كان الطريقان: نسخُه (فيصير تعبيران يفترقان مع الزمن كما افترق تعبيرُ البريد أربعَ مرّات)،
 * أو رفعُه إلى `lib` مصدرًا واحدًا. وهذا الثاني.
 *
 * وقاعدتُه: غيابُ المفتاح السرّيّ (تجربةٌ محليّة بلا إعداد) **يُسقط الدرع** فلا يتعطّل التطوير،
 * ووجودُه (الإنتاج) **يفرضه**. وتعذُّرُ الوصول إلى كلاودفلير يُرَدّ رفضًا لا قبولًا: الفشلُ يُغلق.
 *
 * ولا يُغني هذا وحدَه: ما دامت سياسةُ RLS تسمح بإدراجٍ من المتصفّح، فالدرعُ يُلتَفُّ عليه
 * بنداءٍ مباشرٍ بالمفتاح العلنيّ. فالبابُ يُدرَع هنا **وتُغلَق سياستُه في القاعدة** معًا.
 *
 * يعيد رسالةَ خطأٍ عربيّةً عند الفشل، أو `null` عند المرور.
 *
 * وهو خادميٌّ بحكم `next/headers`: لا يُستورد إلّا من فعلٍ خادميّ («use server»).
 */
export async function verifyTurnstile(token: string | undefined): Promise<string | null> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return null; // الدرع غير مُفعَّل هنا
  if (!token) return "تعذّر التحقّق من أنّك لست روبوتًا. حدّث الصفحة وأعد المحاولة.";

  const form = new URLSearchParams({ secret, response: token });
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) form.append("remoteip", ip);

  try {
    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const data = (await resp.json()) as { success?: boolean };
    if (data.success === true) return null;
  } catch { /* تعذّر الوصول لـCloudflare — نرفض بأمان */ }
  return "فشل التحقّق من أنّك لست روبوتًا. حدّث الصفحة وأعد المحاولة.";
}
