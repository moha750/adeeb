import { describe, it, expect } from "vitest";
import { normalizeArabic, matches, findSnippet } from "../arabicSearch";

/**
 * **جدولُ التوأمين** — هذه الحالاتُ بعينها مكتوبةٌ في تعليق `arabic_norm` في
 * `supabase/migrations/20260830100000_radio_10_arabic_norm.sql`، والقيمُ قِيست
 * في الاثنين معًا (٢٠٢٦-٠٨-٣٠) فتطابقت.
 *
 * **وتوقُّعاتٌ حرفيّةٌ لا مقارنةُ طرفين ببعضهما.** كانت `expect(f("أسطورة")).toBe(f("اسطورة"))`
 * وهي تنجح **ولو تبدّل التطبيعُ كلُّه**: يكفيها أن يتساوى الطرفان في أيّ شيء.
 * فمن غيّر التطبيعَ في جافاسكربت وحدَه سقط عنده هذا الجدول، فيُذكَّر بتوأمه.
 */
const TWINS: [string, string][] = [
  ["۹۹٪", "99٪"],
  ["٩٩٪", "99٪"],
  ["المنعطف", "المنعطف"],
  ["أسطورة", "اسطوره"],
  ["حياة", "حياه"],
  ["مُنعَطَف", "منعطف"],
  ["50%", "50%"],
  ["على", "علي"],
  ["ســلام", "سلام"],
  ["١٬٢٠٠", "1٬200"],
  ["٣٫٥", "3٫5"],
  ["إذاعة", "اذاعه"],
];

describe("normalizeArabic", () => {
  it.each(TWINS)("«%s» ⇒ «%s» (جدولُ التوأمين)", (input, expected) => {
    expect(normalizeArabic(input)).toBe(expected);
  });

  it("تُسقط التشكيل والتطويل ولا تُسقط ٪ ولا ٫ ولا ٬", () => {
    expect(normalizeArabic("منــــعطف")).toBe("منعطف");
    /* مدى التشكيل U+064B–U+065F، و٪ هو U+066A فينجو. وهذه الحالةُ هي التي
       أوقعت فاحصَين أعادا كتابةَ التعبير العربيّ بأيديهما فوسّعا المدى. */
    expect(normalizeArabic("٪")).toBe("٪");
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
