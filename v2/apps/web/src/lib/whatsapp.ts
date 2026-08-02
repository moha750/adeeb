/**
 * رابط واتساب مباشر — **مصدرٌ واحد** يقرؤه تأكيدُ حجوزات الفعاليّات وزرُّ التواصل في كروت
 * الأعضاء. كان يسكن داخل `EventDetailView` وحدها، فاستُخرج حين طلبه ثانٍ (لا نسخةَ ثانية).
 *
 * والرقم يُدوَّل لا يُفترَض دوليًّا: الجوّالات تُحفَظ محليّةً («05…») وواتساب لا يقبل إلّا
 * الصيغة الدوليّة بلا رموز. فتُنزع كلُّ علامةٍ غير رقم، ثمّ:
 *   يبدأ بـ966 ⇒ كما هو · يبدأ بصفر ⇒ يُبدَل بـ966 · تسعةُ أرقامٍ تبدأ بـ5 ⇒ يُصدَّر بـ966
 *   وما سوى ذلك يُترَك كما هو (رقمٌ أجنبيّ أو ناقص — واتساب يقول خطأه، ونحن لا نخترع بلدًا).
 */
export function saudiIntl(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("966")) return d;
  if (d.startsWith("0")) return `966${d.slice(1)}`;
  if (d.length === 9 && d.startsWith("5")) return `966${d}`;
  return d;
}

/** رقمٌ (+ رسالةٌ اختياريّة) → رابط محادثة. بلا رسالة يُفتَح الحوار فارغًا — لا نضع كلامًا في فم أحد. */
export function waHref(phone: string, message?: string): string {
  const base = `https://wa.me/${saudiIntl(phone)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
