import { describe, expect, it } from "vitest";
import { RESUME_MIN_SECONDS, RESUME_TAIL_SECONDS } from "@adeeb/core";
import { shouldResume } from "../progress";

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
