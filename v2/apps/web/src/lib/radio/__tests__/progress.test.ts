import { describe, expect, it } from "vitest";
import { RESUME_MIN_SECONDS, RESUME_TAIL_SECONDS } from "@adeeb/core";
import { shouldResume } from "../progress";
import { normalizePeaks } from "../peaks";

/** حلقةُ «من الحلم إلى الواقع» كما هي في القاعدة: ‏21:27. */
const EPISODE = 1287;

describe("shouldResume", () => {
  it("لا يُستأنَف ما دون نصف الدقيقة، فالاستماعُ لم يبدأ بعد", () => {
    expect(shouldResume(0, EPISODE)).toBe(false);
    expect(shouldResume(RESUME_MIN_SECONDS - 1, EPISODE)).toBe(false);
    expect(shouldResume(RESUME_MIN_SECONDS, EPISODE)).toBe(true);
  });

  it("لا يُستأنَف ما قارب النهاية، فمن عاد يريد إعادتَها لا خاتمتَها", () => {
    expect(shouldResume(EPISODE - RESUME_TAIL_SECONDS, EPISODE)).toBe(false);
    expect(shouldResume(EPISODE - RESUME_TAIL_SECONDS - 1, EPISODE)).toBe(true);
    expect(shouldResume(EPISODE, EPISODE)).toBe(false);
  });

  it("يُستأنَف الوسطُ", () => {
    expect(shouldResume(438, EPISODE)).toBe(true);
  });

  it("المدّةُ المجهولة لا يُحكَم عليها بالذيل", () => {
    // الحلقةُ قد تُعرَض قبل أن يقرأ العنصرُ مدّتَها، فلا يُحرَم صاحبُها من موضعه
    expect(shouldResume(600, 0)).toBe(true);
    expect(shouldResume(5, 0)).toBe(false);
  });

  it("يردّ خطأً لما ليس عددًا صالحًا", () => {
    expect(shouldResume(Number.NaN, EPISODE)).toBe(false);
    expect(shouldResume(Number.POSITIVE_INFINITY, EPISODE)).toBe(false);
  });
});

describe("normalizePeaks", () => {
  it("ترفع موجةً هادئةً إلى مدى اللوحة", () => {
    const quiet = Array.from({ length: 100 }, (_, i) => (i % 10) + 20); // 20..29
    const out = normalizePeaks(quiet);
    expect(Math.max(...out)).toBeGreaterThan(90);
  });

  it("تنسب إلى المئين لا إلى الأقصى، فلا تسحقها قمّةٌ شاذّة", () => {
    const p = Array.from({ length: 100 }, () => 30);
    p[0] = 100; // طرقةٌ على المِيك
    const out = normalizePeaks(p);
    expect(out[50]).toBeGreaterThan(90);
  });

  it("تترك ما هو مسوًّى أصلًا", () => {
    const full = Array.from({ length: 100 }, (_, i) => (i < 95 ? 50 : 100));
    expect(normalizePeaks(full)).toEqual(full);
  });

  it("تترك الفارغ والصامت", () => {
    expect(normalizePeaks([])).toEqual([]);
    expect(normalizePeaks([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it("لا تتجاوز المدى", () => {
    const out = normalizePeaks(Array.from({ length: 100 }, (_, i) => i));
    expect(Math.min(...out)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...out)).toBeLessThanOrEqual(100);
  });
});
