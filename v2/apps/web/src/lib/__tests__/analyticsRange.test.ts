import { describe, expect, it } from "vitest";
import { analyticsHref, presetRange, previousRange, rangeLabel, type AnalyticsUrlState } from "../analyticsRange";

const base: AnalyticsUrlState = { preset: "mtd", from: "2026-08-01", to: "2026-08-31", source: null, compare: true };

describe("analyticsHref", () => {
  it("يكتب المدى المخصّص وإن كان المختارُ اختصارًا (عطلُ «لم يتغيّر شيء»)", () => {
    expect(analyticsHref(base, { from: "2026-07-01", to: "2026-07-31" }))
      .toBe("/dashboard/analytics?from=2026-07-01&to=2026-07-31&src=all");
  });

  it("اختيارُ اختصارٍ يُسقط التاريخين", () => {
    const custom: AnalyticsUrlState = { ...base, preset: "custom", from: "2026-07-01", to: "2026-07-31" };
    expect(analyticsHref(custom, { preset: "lastmonth" })).toBe("/dashboard/analytics?preset=lastmonth&src=all");
  });

  it("الافتراضُ لا يُكتب في العنوان، والبابُ يُكتب دائمًا", () => {
    expect(analyticsHref(base, {})).toBe("/dashboard/analytics?src=all");
  });

  it("تبديلُ الباب يُبقي المدى المخصّص والمقارنة", () => {
    const custom: AnalyticsUrlState = { ...base, preset: "custom", compare: false };
    expect(analyticsHref(custom, { source: "app" }))
      .toBe("/dashboard/analytics?from=2026-08-01&to=2026-08-31&src=app&cmp=0");
  });

  it("إطفاءُ المقارنة لا يمسّ الاختصار ولا الباب", () => {
    expect(analyticsHref({ ...base, preset: "90", source: "web" }, { compare: false }))
      .toBe("/dashboard/analytics?preset=90&src=web&cmp=0");
  });
});

describe("حدودُ الاختصارات والمقارنة", () => {
  it("«هذا الشهر» من أوّله إلى اليوم، و«الشهر الماضي» شهرٌ مغلق", () => {
    expect(presetRange("mtd", "2026-09-10")).toEqual({ from: "2026-09-01", to: "2026-09-10" });
    expect(presetRange("lastmonth", "2026-09-10")).toEqual({ from: "2026-08-01", to: "2026-08-31" });
    // «آخر ٣٠ يومًا» حُذفت (٢٠٢٦-٠٨-٣١)، فلم يبقَ لمفتاحها حدود
    expect(presetRange("30", "2026-09-10")).toBeNull();
  });

  it("«منذ البداية» بلا حدود", () => {
    expect(presetRange("all", "2026-09-10")).toBeNull();
  });

  it("الفترةُ السابقة ملاصقةٌ بطول المدى نفسِه", () => {
    expect(previousRange({ from: "2026-08-01", to: "2026-08-31" })).toEqual({ from: "2026-07-01", to: "2026-07-31" });
    expect(previousRange({ from: "2026-08-31", to: "2026-08-31" })).toEqual({ from: "2026-08-30", to: "2026-08-30" });
  });

  it("عبارةُ المدى تقول اليومَ مرّةً والمدى بطرفيه", () => {
    expect(rangeLabel({ from: "2026-08-31", to: "2026-08-31" })).toBe("31 أغسطس");
    expect(rangeLabel({ from: "2026-08-02", to: "2026-08-31" })).toBe("2 أغسطس إلى 31 أغسطس");
  });
});
