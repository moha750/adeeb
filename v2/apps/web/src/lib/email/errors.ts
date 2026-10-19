/**
 * **سببُ تعثّر الرسالة بالعربيّة** (٢٠٢٦-١٠-١٨) — لسجلّ البريد في اللوحة.
 *
 * `last_error` في الصادر يكتبه المُرسِلُ كما جاءه: ردُّ Resend بالإنجليزيّة (`422: {"message":…}`)، أو
 * انقطاعُ الشبكة، أو قالبٌ لم يُرسَم، أو الأجلُ الذي فات (`claim_emails`). والغرفةُ يقرؤها أهلُ أدِيب لا
 * مهندسُ المزوّد، فتقوله هذه الدالّةُ جملةً عربيّةً واحدة، ويبقى النصُّ الخامُ في صفحة الرسالة لمن يلاحقه.
 *
 * **ولا تعرف هذه الدالّةُ أنّ عنوانًا غيرُ موجود**: المزوّدُ يقبل الرسالةَ ثمّ يرتدّ بها خادمُ المستلم
 * بعد ثوانٍ، وذلك خبرٌ يصل بالخطّاف (`/api/email/webhook`) فيُكتب في `delivery` لا في `last_error`.
 *
 * إطارٌ صرفٌ بلا خادم، فيستورده الخادمُ والمتصفّحُ والاختبار.
 */
export function explainEmailError(raw: string | null | undefined): string | null {
  const e = raw?.trim();
  if (!e) return null;
  // قد تتراكم الأخطاءُ بفاصلٍ (`؛`) حين تموت رسالةٌ بأجلها بعد محاولات: الأخيرُ هو السبب.
  const last = e.split(" ؛ ").pop()!.trim();

  if (/^expired$/i.test(last)) return "فات أجلُها قبل أن تخرج";
  if (/^suppressed: complained/.test(last)) return "لم تُرسَل: صاحبُ العنوان عدّ بريدَنا مزعجًا";
  if (/^suppressed/.test(last)) return "لم تُرسَل: العنوانُ موقوفٌ لأنّه ارتدّ";
  if (/RESEND_API_KEY/.test(last)) return "مفتاحُ المزوّد غيرُ مضبوطٍ في الخادم";
  if (/^render:/.test(last)) return "تعذّر رسمُها من قالبها";
  if (/^network:/.test(last)) return "انقطع الاتّصالُ بالمزوّد";

  const status = Number(/^(\d{3}):/.exec(last)?.[1]);
  const body = last.toLowerCase();
  if (status === 429) return "المزوّدُ مزدحم";
  if (status >= 500) return "المزوّدُ متعطّلٌ مؤقّتًا";
  if (status === 401 || /api key/.test(body)) return "رفض المزوّدُ المفتاح";
  if (status === 403 && /domain/.test(body)) return "النطاقُ غيرُ موثَّقٍ عند المزوّد";
  if (status === 422 && /\bto\b|recipient|email address/.test(body)) return "عنوانُ المستلم غيرُ صالح";
  if (status) return `ردّها المزوّدُ (${status})`;
  return "ردّها المزوّدُ بخطأٍ غير معروف";
}

export type Delivery = "delivered" | "delayed" | "bounced" | "complained";

/**
 * ما جرى للرسالة بعد خروجها، بالعربيّة (`delivery` من خطّاف Resend). و«موقوف» يقول إنّ العنوانَ لن يُراسَل
 * بعدها: الارتدادُ الدائمُ والشكوى يوقفانه، والعابرُ لا.
 */
export function explainDelivery(d: Delivery | null | undefined, suppressed: boolean): string | null {
  switch (d) {
    case "delayed": return "تتأخّر عند خادم المستلم";
    case "bounced": return suppressed ? "ارتدّت: العنوانُ لا يستقبل البريد، فأُوقف" : "ارتدّت ارتدادًا عابرًا";
    case "complained": return suppressed ? "عدّها صاحبُها مزعجة، فأُوقف العنوان" : "عدّها صاحبُها مزعجة";
    default: return null;
  }
}
