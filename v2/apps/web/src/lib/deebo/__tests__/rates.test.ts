import { describe, expect, it } from "vitest";
import { PROVIDERS, isDeepseekPeak, ratesAt } from "../providers";

/**
 * ثمنُ الرمز بحسب الساعة.
 *
 * وسببُ وجود هذا الملفّ واقعةٌ لا فرضيّة: كنّا نُسعّر بالذروة دائمًا، فقال
 * حسابُنا ٣ سنتات ولوحةُ المزوّد سنتًا واحدًا (٢٠٢٦-٠٨-٢١)، وسقفُ اليوم كان
 * يقفل بابَ ديبو عند ثلث ما أُذن به. فالنافذةُ حدٌّ لا تقدير، وحدودُها تُبرهَن.
 */

const deepseek = PROVIDERS.find((p) => p.id === "deepseek")!;
const gemini = PROVIDERS.find((p) => p.id === "gemini")!;

/** ساعةٌ بتوقيت UTC صريحًا، فلا تتبدّل النتيجةُ بجهاز المُختبِر. */
const utc = (hour: number, minute = 0) => new Date(Date.UTC(2026, 7, 21, hour, minute));

describe("نافذةُ الذروة", () => {
  it("تشمل 01:00-04:00 و06:00-10:00", () => {
    expect(isDeepseekPeak(utc(1))).toBe(true);
    expect(isDeepseekPeak(utc(3, 59))).toBe(true);
    expect(isDeepseekPeak(utc(6))).toBe(true);
    expect(isDeepseekPeak(utc(9, 59))).toBe(true);
  });

  it("تُخرج الحدَّ الأعلى وما بين النافذتين وما بعدهما", () => {
    expect(isDeepseekPeak(utc(0, 59))).toBe(false);
    expect(isDeepseekPeak(utc(4))).toBe(false); // الحدُّ الأعلى خارجٌ لا داخل
    expect(isDeepseekPeak(utc(5))).toBe(false);
    expect(isDeepseekPeak(utc(10))).toBe(false);
    expect(isDeepseekPeak(utc(21))).toBe(false); // ساعةُ التجربة التي كشفت العطب
  });
});

describe("الثمنُ في لحظته", () => {
  it("يردّ القائمة كما هي في الذروة", () => {
    expect(ratesAt(deepseek, utc(2))).toEqual({ in: 0.44, cachedIn: 0.014, out: 1.32 });
  });

  it("ينصّفها في الوفرة", () => {
    expect(ratesAt(deepseek, utc(21))).toEqual({ in: 0.22, cachedIn: 0.007, out: 0.66 });
  });

  it("لا يمسّ مزوّدًا بلا وفرة", () => {
    expect(ratesAt(gemini, utc(21))).toEqual(gemini.rates);
    expect(ratesAt(gemini, utc(2))).toEqual(gemini.rates);
  });

  it("يطابق ما حسبه المزوّد لِيومِ ٢٠٢٦-٠٨-٢١", () => {
    // ٢٠١٧٣ دخلًا جديدًا و١٣٧٣٤٤ مخزَّنًا و١٦٠٠٠ خرجًا، كلُّها خارج الذروة
    const r = ratesAt(deepseek, utc(21));
    const usd = (20173 * r.in + 137344 * r.cachedIn + 16000 * r.out) / 1_000_000;
    expect(usd).toBeCloseTo(0.016, 3); // ولوحتُهم أرت 0.016 في ذروة المخطَّط
  });
});
