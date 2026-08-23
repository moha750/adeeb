/**
 * مِعيارُ رقم الجوّال — وهو الحارسُ على **التوأمين**: هذا الملفّ يقيس
 * `lib/whatsapp.ts::toE164`، ونسختُه العاملةُ في الحافة
 * (`supabase/functions/_shared/phone.ts`) نسخةٌ حرفيّةٌ منه. فمن كسر أحدَهما كسر المِعيار.
 *
 * **والصيغةُ E.164 تامّةً بعلامة `+`** كما تطلبها YCloud في `from` و`to` (مثالُ وثيقتها
 * `+16315551111`). وكانت أرقامًا متّصلةً بلا علامةٍ يومَ كان النداءُ إلى Graph API.
 */
import { describe, expect, it } from "vitest";
import { phoneRejection, saudiIntl, toE164 } from "../whatsapp";

describe("toE164", () => {
  it("يقبل المحلّيّ «05…» فيصدّره بـ966", () => {
    expect(toE164("0501234567")).toEqual({ ok: true, e164: "+966501234567" });
    expect(toE164("05 5 123 4567")).toEqual({ ok: true, e164: "+966551234567" });
    expect(toE164("055-123-4567")).toEqual({ ok: true, e164: "+966551234567" });
  });

  it("يقبل الدوليّ بأشكاله الثلاثة ويردّه صيغةً واحدة بعلامة +", () => {
    expect(toE164("966501234567")).toEqual({ ok: true, e164: "+966501234567" });
    expect(toE164("+966501234567")).toEqual({ ok: true, e164: "+966501234567" });
    expect(toE164("00966501234567")).toEqual({ ok: true, e164: "+966501234567" });
    expect(toE164("+966 50 123 4567")).toEqual({ ok: true, e164: "+966501234567" });
  });

  it("يقبل تسعةَ أرقامٍ تبدأ بـ5 مكتوبةً بلا صفرٍ ولا مفتاح", () => {
    expect(toE164("501234567")).toEqual({ ok: true, e164: "+966501234567" });
  });

  it("يردّ الفارغَ بسببه", () => {
    expect(toE164("")).toEqual({ ok: false, code: "EMPTY" });
    expect(toE164(null)).toEqual({ ok: false, code: "EMPTY" });
    expect(toE164("   ")).toEqual({ ok: false, code: "EMPTY" });
    expect(toE164("---")).toEqual({ ok: false, code: "EMPTY" });
  });

  it("يردّ صيغةً واحدةً لا تخلو من + مهما اختلف المدخل", () => {
    // القاعدةُ التي تعتمدها YCloud: كلُّ مقبولٍ يبدأ بـ+ ثمّ أرقامٌ متّصلة
    for (const raw of ["0501234567", "+966501234567", "00966501234567", "501234567", "+201001234567"]) {
      const r = toE164(raw);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.e164).toMatch(/^\+\d{8,15}$/);
    }
  });

  it("لا يقبل سعوديًّا ناقصًا ولا أرضيًّا صامتًا", () => {
    // ناقصُ رقم
    expect(toE164("050123456")).toEqual({ ok: false, code: "NOT_SAUDI_MOBILE" });
    // زائدُ رقم
    expect(toE164("05012345678")).toEqual({ ok: false, code: "NOT_SAUDI_MOBILE" });
    // أرضيُّ الأحساء لا جوّال
    expect(toE164("0135801234")).toEqual({ ok: false, code: "NOT_SAUDI_MOBILE" });
    expect(toE164("+966135801234")).toEqual({ ok: false, code: "NOT_SAUDI_MOBILE" });
  });

  it("يقبل الأجنبيَّ إن كُتب دوليًّا صريحًا، ويردّه إن كُتب مبتورًا", () => {
    expect(toE164("+201001234567")).toEqual({ ok: true, e164: "+201001234567" });
    expect(toE164("00447700900123")).toEqual({ ok: true, e164: "+447700900123" });
    // بلا `+` ولا `00` : لا نخترع له بلدًا
    expect(toE164("201001234567")).toEqual({ ok: false, code: "UNRECOGNIZED" });
    // أطولُ من مدى E.164
    expect(toE164("+1234567890123456")).toEqual({ ok: false, code: "UNRECOGNIZED" });
  });

  it("يقول سببَ الردّ بلغة صاحب اللوحة", () => {
    expect(phoneRejection("EMPTY")).toContain("لا جوّال");
    expect(phoneRejection("NOT_SAUDI_MOBILE")).toContain("سعوديًّا");
    expect(phoneRejection("UNRECOGNIZED")).toContain("الصيغة");
  });
});

describe("saudiIntl", () => {
  /**
   * المتساهلةُ تبقى متساهلة : هي لروابط wa.me التي يراجعها إنسان، ولا تُبدَّل بالصارمة
   * فينكسر زرُّ التواصل في الكروت على رقمٍ أجنبيٍّ صحيح.
   */
  it("لا يردّ ما لم يفهمه بل يمرّره كما هو", () => {
    expect(saudiIntl("0501234567")).toBe("966501234567");
    expect(saudiIntl("+966501234567")).toBe("966501234567");
    expect(saudiIntl("201001234567")).toBe("201001234567");
  });
});
