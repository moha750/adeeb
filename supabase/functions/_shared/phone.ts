/**
 * **رقمُ الجوّال بصيغة E.164** — كما تطلبه YCloud: علامةُ `+` ثمّ الأرقامُ متّصلةً بلا
 * مسافةٍ ولا شَرطة (`+966501234567`). وهي صيغةُ E.164 التامّة، ومثالُ الوثيقة نفسِه.
 *
 * **توأمٌ مقصود**: نسخةُ هذا المنطق العاملةُ في الويب هي
 * `v2/apps/web/src/lib/whatsapp.ts::toE164`، ولا يُستورد أحدُهما من الآخر لأنّ بينهما حدَّ
 * زمنَي تشغيل (Deno في الحافة، Next في الويب). فمن غيّر أحدَهما غيّر الآخر معه، ومِعيارُ
 * الويب (`__tests__/whatsapp.test.ts`) هو الذي يحرس القاعدة. وللمشروع سابقةٌ في هذا:
 * `positionLine` وتوأمُها SQL `position_line`.
 *
 * **ولا يُقبل رقمٌ باطلٌ صامتًا**: من لم يُعرَف شكلُه رُدّ بسببٍ مسمًّى، ولا يُخترع له بلد.
 * (وهذا يفارق `saudiIntl` القديمة التي تخدم روابط wa.me: تلك تتساهل لأنّ واتساب نفسه
 * يقول الخطأ للإنسان، وهذه تُرسِل بلا إنسانٍ يراجع.)
 */

export type PhoneCheck =
  | { ok: true; e164: string }
  | { ok: false; code: "EMPTY" | "NOT_SAUDI_MOBILE" | "UNRECOGNIZED" };

/** جوّالٌ سعوديّ: 966 ثمّ تسعةُ أرقامٍ تبدأ بـ5 (تُفحَص قبل إلحاق `+`). */
const SAUDI = /^9665\d{8}$/;

export function toE164(raw: string | null | undefined): PhoneCheck {
  const input = (raw ?? "").trim();
  if (!input) return { ok: false, code: "EMPTY" };

  // العلامةُ `+` تُلتقط قبل التنقية: هي وحدها ما يميّز رقمًا دوليًّا مكتوبًا كاملًا
  const explicitIntl = input.startsWith("+") || input.startsWith("00");
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (!d) return { ok: false, code: "EMPTY" };

  // «05…» محليٌّ سعوديّ ⇐ يُصدَّر بـ966. وعشرةُ أرقامٍ تبدأ بـ05 لا غير.
  if (d.startsWith("0")) d = `966${d.slice(1)}`;
  // تسعةُ أرقامٍ تبدأ بـ5 ⇐ جوّالٌ سعوديّ كُتب بلا صفرٍ ولا مفتاح
  else if (d.length === 9 && d.startsWith("5")) d = `966${d}`;

  if (d.startsWith("966")) {
    return SAUDI.test(d) ? { ok: true, e164: `+${d}` } : { ok: false, code: "NOT_SAUDI_MOBILE" };
  }

  // رقمٌ أجنبيّ: يُقبل إن كُتب دوليًّا صريحًا وكان طولُه في مدى E.164 (٨ إلى ١٥ رقمًا)
  if (explicitIntl && d.length >= 8 && d.length <= 15) return { ok: true, e164: `+${d}` };

  return { ok: false, code: "UNRECOGNIZED" };
}
