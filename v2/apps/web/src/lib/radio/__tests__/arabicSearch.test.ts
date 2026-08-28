import { describe, it, expect } from "vitest";
import { normalizeArabic, matches, findSnippet } from "../arabicSearch";

/** بحثٌ عربيٌّ بلا تطبيعٍ معطوبٌ لا ناقص: هذه الحالاتُ هي ما يفشل بغيره. */
describe("normalizeArabic", () => {
  it("توحّد الهمزات", () => {
    expect(normalizeArabic("أسطورة")).toBe(normalizeArabic("اسطورة"));
    expect(normalizeArabic("إذاعة")).toBe(normalizeArabic("اذاعه"));
    expect(normalizeArabic("آل")).toBe(normalizeArabic("ال"));
  });

  it("توحّد التاء المربوطة والألف المقصورة", () => {
    expect(normalizeArabic("حياة")).toBe(normalizeArabic("حياه"));
    expect(normalizeArabic("على")).toBe(normalizeArabic("علي"));
  });

  it("تُسقط التشكيل والتطويل", () => {
    expect(normalizeArabic("مُنعَطَف")).toBe("منعطف");
    expect(normalizeArabic("منــــعطف")).toBe("منعطف");
  });

  it("تحوّل الأرقام العربيّة", () => {
    expect(normalizeArabic("الحلقة ٣")).toBe("الحلقه 3");
  });

  it("ترجع فراغًا للفارغ", () => {
    expect(normalizeArabic(null)).toBe("");
    expect(normalizeArabic("")).toBe("");
  });
});

describe("matches", () => {
  it("من كتب «المنعطف» يجد «منعطف»", () => {
    expect(matches("منعطف", "المنعطف")).toBe(true);
    expect(matches("برنامج منعطف", "المنعطف")).toBe(true);
  });

  it("تطابق كلَّ الكلمات لا إحداها", () => {
    expect(matches("أسطورة الشغف", "اسطوره الشغف")).toBe(true);
    expect(matches("أسطورة الشغف", "اسطوره الحلم")).toBe(false);
  });

  it("لا تطابق شيئًا باستعلامٍ فارغ", () => {
    expect(matches("أيّ نصّ", "")).toBe(false);
  });
});

describe("findSnippet", () => {
  const t = "ومع الوقت تحولت فكرة الشغف من مجرد دافع جميل إلى شيء أكبر من حجمه، حتى صار بعض الناس يحسون أنهم متأخرون.";

  it("تجد الجملة التي وقعت فيها الكلمة، وتفصل المطابَقة عمّا حولها", () => {
    const r = findSnippet(t, "الشغف", 30);
    expect(r).not.toBeNull();
    expect(r!.match).toBe("الشغف");
    expect(r!.before + r!.match + r!.after).toContain("الشغف");
  });

  it("المطابَقةُ تُردّ بصورتها في الأصل لا بصورتها المطبَّعة", () => {
    const r = findSnippet("رحلةٌ أسطوريّة في البحث عن الذات وعن معناها الحقيقيّ", "اسطوريه");
    expect(r).not.toBeNull();
    expect(r!.match).toContain("سطور");
  });

  it("تجدها ولو كُتب الاستعلام بلا همزة", () => {
    expect(findSnippet("رحلة أسطورية طويلة في البحث عن الذات", "اسطوريه")).not.toBeNull();
  });

  it("ترجع null حين لا مطابقة", () => {
    expect(findSnippet(t, "الفلسفة")).toBeNull();
    expect(findSnippet("", "شيء")).toBeNull();
  });

  it("الموضعُ المردودُ يشير إلى النصّ الأصليّ", () => {
    const src = "مُقَدِّمةٌ ثمّ الشغف";
    const r = findSnippet(src, "الشغف", 5);
    expect(r).not.toBeNull();
    expect(src.slice(r!.at, r!.at + 5)).toBe("الشغف");
  });
});
