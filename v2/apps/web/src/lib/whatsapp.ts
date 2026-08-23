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

/* ══ الإرسالُ الآليّ: صيغةٌ صارمة ═════════════════════════════════════════════
   ما فوق هذا السطر يخدم **روابط wa.me** التي يفتحها إنسان، فيتساهل: واتساب نفسُه يقول
   له إن كان الرقم خطأً — ولذلك يردّ أرقامًا متّصلةً بلا `+` (هكذا يبتلعها wa.me). وما
   تحته يخدم **واجهة YCloud** التي تُرسِل بلا إنسانٍ يراجع، فلا يُقبل فيه رقمٌ باطلٌ
   صامتًا، ويردّ صيغةَ E.164 تامّةً بعلامة `+` كما تطلبها الوثيقة.

   **وتوأمُه في الحافة** `supabase/functions/_shared/phone.ts` — نسخةٌ حرفيّة لا تُستورَد
   لأنّ بينهما حدَّ زمنَي تشغيل (Deno ≠ Next). ومِعيارُ هذا الملفّ هو الذي يحرس القاعدة،
   فمن غيّر ههنا غيّر هناك. (وللمشروع سابقتُه: `positionLine` وتوأمُها SQL `position_line`.) */

export type PhoneCheck =
  | { ok: true; e164: string }
  | { ok: false; code: "EMPTY" | "NOT_SAUDI_MOBILE" | "UNRECOGNIZED" };

/** جوّالٌ سعوديّ: 966 ثمّ تسعةُ أرقامٍ تبدأ بـ5 (تُفحَص قبل إلحاق `+`). */
const SAUDI_E164 = /^9665\d{8}$/;

/** رقمُ الجوّال بصيغة E.164 تامّةً (`+966…`) أو سببُ ردّه مسمًّى. */
export function toE164(raw: string | null | undefined): PhoneCheck {
  const input = (raw ?? "").trim();
  if (!input) return { ok: false, code: "EMPTY" };

  // العلامةُ `+` تُلتقط قبل التنقية: هي وحدها ما يميّز رقمًا دوليًّا مكتوبًا كاملًا
  const explicitIntl = input.startsWith("+") || input.startsWith("00");
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (!d) return { ok: false, code: "EMPTY" };

  if (d.startsWith("0")) d = `966${d.slice(1)}`;
  else if (d.length === 9 && d.startsWith("5")) d = `966${d}`;

  if (d.startsWith("966")) {
    return SAUDI_E164.test(d) ? { ok: true, e164: `+${d}` } : { ok: false, code: "NOT_SAUDI_MOBILE" };
  }
  if (explicitIntl && d.length >= 8 && d.length <= 15) return { ok: true, e164: `+${d}` };
  return { ok: false, code: "UNRECOGNIZED" };
}

export type PhoneRejection = Extract<PhoneCheck, { ok: false }>["code"];

/** سببُ الردّ مقولًا لصاحب اللوحة، لا رمزًا يُفكّ. */
export const phoneRejection = (code: PhoneRejection): string =>
  code === "EMPTY"
    ? "لا جوّال مسجّل لهذا العضو."
    : code === "NOT_SAUDI_MOBILE"
      ? "الجوّال المسجّل ليس جوّالًا سعوديًّا صالحًا."
      : "الجوّال المسجّل غير مفهوم الصيغة.";
