import { describe, expect, it } from "vitest";
import { BAR_GAP, BAR_STEP, BAR_W, PEAK_BUCKETS, barsForWidth, downsample } from "@/lib/radio/peaks";

/**
 * قاعدةُ الموجة — **العددُ يُشتقّ من العرض** بعد أن كان رقمًا ثابتًا (٢٠٢٦-٠٨-١٨).
 * والعقدُ المحروسُ ههنا واحد: مهما كان العرضُ، لا يهبط العمودُ دون البكسل — فما
 * دونه يدهنه المتصفّح بشفافيّةٍ جزئيّة، وهي العلّةُ التي رآها المالك على جهازه.
 */

/** غِلَظُ العمود كما سيرسمه المتصفّح: العرضُ ناقصَ الفجوات، مقسومًا على العدد. */
function barWidth(panel: number): number {
  const n = barsForWidth(panel);
  return (panel - (n - 1) * BAR_GAP) / n;
}

describe("barsForWidth", () => {
  it("يشتقّ العددَ بخطوةِ العمود والفجوة", () => {
    // ٢٨٥px هي اللوحةُ المقيسة في الإنتاج على جوّالٍ بـ375px، و1062px على سطح المكتب.
    expect(barsForWidth(285)).toBe(57);
    expect(barsForWidth(1062)).toBe(212);
  });

  it("يملأ اللوحةَ ولا يفيض عنها", () => {
    for (const panel of [285, 320, 400, 640, 900, 1062, 1400]) {
      const n = barsForWidth(panel);
      expect(n * BAR_W + (n - 1) * BAR_GAP).toBeLessThanOrEqual(panel);
      expect((n + 1) * BAR_W + n * BAR_GAP).toBeGreaterThan(panel);
    }
  });

  it("لا يهبط العمودُ دون البكسل في أيّ عرضٍ معقول: وهو أصلُ العلّة", () => {
    for (let panel = 120; panel <= 2400; panel += 7) {
      expect(barWidth(panel)).toBeGreaterThanOrEqual(1);
    }
  });

  it("يبقي أدنى عددٍ في أضيق لوحة، فلا تصير الموجةُ عمودين", () => {
    expect(barsForWidth(0)).toBe(24);
    expect(barsForWidth(40)).toBe(24);
  });

  it("يسقُف بالمخزون: فوقه تُكرَّر القممُ ولا تُرسَم جديدةٌ", () => {
    expect(barsForWidth(4000)).toBe(PEAK_BUCKETS);
    expect(BAR_STEP).toBe(BAR_W + BAR_GAP);
  });
});

describe("downsample", () => {
  const peaks = Array.from({ length: PEAK_BUCKETS }, (_, i) => i % 100);

  it("يردّ العددَ المطلوبَ تمامًا", () => {
    expect(downsample(peaks, 57)).toHaveLength(57);
    expect(downsample(peaks, 212)).toHaveLength(212);
  });

  it("يأخذ أعلى قمّةٍ في كلّ شريحة فلا تُطمَس الذُّرى", () => {
    expect(downsample([10, 90, 20, 30], 2)).toEqual([90, 30]);
  });

  it("يردّ القممَ كما هي إن طُلب أكثرُ من عددها", () => {
    expect(downsample([5, 6, 7], 100)).toEqual([5, 6, 7]);
  });
});
