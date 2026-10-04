import { describe, expect, it } from "vitest";
import { bylineOf } from "../news/byline";

describe("bylineOf", () => {
  it("المفردُ يأخذ «بريشة»", () => {
    expect(bylineOf(["الحَوراء احمد الملبو"])).toBe("بريشة الحَوراء احمد الملبو");
  });

  it("الاثنان يأخذان المثنّى المضاف، ويُوصَلان بـ«و» لا بفاصلة", () => {
    expect(bylineOf(["نوره الدوسري", "حوراء الشيبة"])).toBe("بريشتَي نوره الدوسري وحوراء الشيبة");
  });

  it("الثلاثةُ فأكثرُ يأخذون جمعَ التكسير", () => {
    expect(bylineOf(["أ", "ب", "ج"])).toBe("بِرِيَش أ وب وج");
    expect(bylineOf(["أ", "ب", "ج", "د"])).toBe("بِرِيَش أ وب وج ود");
  });

  it("يردّ null حين لا كاتبَ — فلا يُرسَم الصفُّ أصلًا", () => {
    expect(bylineOf([])).toBeNull();
    expect(bylineOf(["", "   "])).toBeNull();
    expect(bylineOf([null, undefined])).toBeNull();
  });

  it("الفارغُ لا يُعَدّ: اسمٌ واحدٌ ومعه خواءٌ يبقى مفردًا", () => {
    expect(bylineOf(["فلان", ""])).toBe("بريشة فلان");
    expect(bylineOf([" فلان ", null])).toBe("بريشة فلان");
  });

  it("يُقلّم الأطراف ولا يمسّ ما بين الأسماء", () => {
    expect(bylineOf([" أ ", " ب "])).toBe("بريشتَي أ وب");
  });
});
