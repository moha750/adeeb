import { describe, it, expect } from "vitest";
import { toggleIn } from "../later";

/** منطقُ «اسمع لاحقًا» خالصٌ فيُختبَر بلا متصفّح. */
describe("toggleIn", () => {
  it("تُضيف الجديدَ في الصدر", () => {
    expect(toggleIn(["b", "c"], "a")).toEqual(["a", "b", "c"]);
  });

  it("تُزيل ما كان مؤجَّلًا", () => {
    expect(toggleIn(["a", "b"], "a")).toEqual(["b"]);
  });

  it("تُسقط الأقدمَ عند الحدّ، فالقائمةُ لا تصير مقبرة", () => {
    const full = Array.from({ length: 5 }, (_, i) => `e${i}`);
    expect(toggleIn(full, "new", 5)).toEqual(["new", "e0", "e1", "e2", "e3"]);
  });

  it("لا تكرّر ما هو فيها: الإضافةُ الثانيةُ إزالة", () => {
    const once = toggleIn([], "a");
    expect(toggleIn(once, "a")).toEqual([]);
  });

  it("تعمل على قائمةٍ فارغة", () => {
    expect(toggleIn([], "a")).toEqual(["a"]);
  });
});
