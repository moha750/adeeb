/**
 * **سببُ تعثّر الرسالة بالعربيّة** (٢٠٢٦-١٠-١٨) — لسجلّ البريد في اللوحة.
 *
 * `last_error` في الصادر يكتبه المُرسِلُ كما جاءه: ردُّ Resend بالإنجليزيّة (`422: {"message":…}`)، أو
 * انقطاعُ الشبكة، أو قالبٌ لم يُرسَم، أو الأجلُ الذي فات (`claim_emails`). والغرفةُ يقرؤها أهلُ أدِيب لا
 * مهندسُ المزوّد، فتقوله هذه الدالّةُ جملةً عربيّةً واحدة، ويبقى النصُّ الخامُ في صفحة الرسالة لمن يلاحقه.
 *
 * **ولا تعرف هذه الدالّةُ أنّ عنوانًا غيرُ موجود**: المزوّدُ يقبل الرسالةَ ثمّ يرتدّ بها خادمُ المستلم
 * بعد ثوانٍ، وذلك خبرٌ لا يصل إلّا بخطّاف (webhook) لم يُبنَ بعد. فـ«خرجت» في السجلّ تعني «قبلها المزوّد».
 *
 * إطارٌ صرفٌ بلا خادم، فيستورده الخادمُ والمتصفّحُ والاختبار.
 */
export function explainEmailError(raw: string | null | undefined): string | null {
  const e = raw?.trim();
  if (!e) return null;
  // قد تتراكم الأخطاءُ بفاصلٍ (`؛`) حين تموت رسالةٌ بأجلها بعد محاولات: الأخيرُ هو السبب.
  const last = e.split(" ؛ ").pop()!.trim();

  if (/^expired$/i.test(last)) return "فات أجلُها قبل أن تخرج";
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
