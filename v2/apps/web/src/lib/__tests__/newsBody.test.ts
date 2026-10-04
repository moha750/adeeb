import { describe, expect, it } from "vitest";
import { outline, parseBody } from "../news/body";

/**
 * حالاتُ الاختبار مأخوذةٌ من `news.content` الحيّ لا مخترعة: أطولُ خبرٍ منشور فيه
 * سبعةُ أقسامٍ وبنودٌ بعلامةٍ بمسافةٍ وبلا مسافة، واقتباسٌ ختاميٌّ منسوب.
 */
describe("parseBody", () => {
  it("يرفع أوّلَ سطرٍ قصيرٍ في كتلةٍ ذاتِ تتمّةٍ عنوانًا", () => {
    const b = parseBody("الأهداف والرؤية\n• نشر الوعي بأخلاقيات العمل.");
    expect(b[0]).toEqual({ kind: "heading", text: "الأهداف والرؤية" });
    expect(b[1]).toEqual({ kind: "list", items: ["نشر الوعي بأخلاقيات العمل."] });
  });

  it("لا يرفع سطرًا وحيدًا عنوانًا — العنوانُ ما تحته شيء", () => {
    expect(parseBody("الختام")).toEqual([{ kind: "para", text: "الختام" }]);
  });

  it("لا يرفع جملةً تامّةً عنوانًا ولو قصرت", () => {
    const b = parseBody("انتهى المعرض.\nوبقي الأثر بعده في النفوس.");
    expect(b.every((x) => x.kind === "para")).toBe(true);
  });

  it("لا يرفع سطرًا طويلًا عنوانًا ولو خلا من الترقيم", () => {
    const long = "ا".repeat(60);
    expect(parseBody(`${long}\nتتمّة`)[0].kind).toBe("para");
  });

  it("يجمع البنودَ المتتالية في قائمةٍ واحدة، بمسافةٍ بعد العلامة وبلا مسافة", () => {
    const b = parseBody("التوصيات\n•مواصلة المشاركة\n• إقامة ورشٍ أدبية");
    expect(b[1]).toEqual({ kind: "list", items: ["مواصلة المشاركة", "إقامة ورشٍ أدبية"] });
  });

  it("يقرأ الاقتباسَ الختاميَّ ونسبتَه، ولا يعدّ سطرَ النسبة بندًا", () => {
    const b = parseBody('"فالكلمة مسؤولية، والأدب أخلاق"\n— نادي أديب');
    expect(b).toEqual([{ kind: "quote", text: "فالكلمة مسؤولية، والأدب أخلاق", by: "نادي أديب" }]);
  });

  it("يقبل الاقتباسَ بلا نسبة", () => {
    expect(parseBody("«الكلمة سلوك»")).toEqual([{ kind: "quote", text: "الكلمة سلوك", by: null }]);
  });

  it("يفصل الكتلَ على السطر الفارغ ويُسقط الفراغ", () => {
    expect(parseBody("فقرةٌ أولى.\n\n\n\nفقرةٌ ثانية.")).toHaveLength(2);
  });

  it("يردّ فارغًا لمتنٍ غائب", () => {
    expect(parseBody(null)).toEqual([]);
    expect(parseBody("   \n\n  ")).toEqual([]);
  });

  it("يقبل نهاياتِ أسطر ويندوز", () => {
    expect(parseBody("المقدمة\r\nنصٌّ تحتها.")[0]).toEqual({ kind: "heading", text: "المقدمة" });
  });
});

describe("outline", () => {
  it("يبني الفهرسَ من العناوين وحدَها، ومِرساتُه من الترتيب لا من النصّ", () => {
    const b = parseBody("المقدمة\nنصّ.\n\nالختام\nنصّ آخر.");
    expect(outline(b)).toEqual([
      { text: "المقدمة", id: "art-s0" },
      { text: "الختام", id: "art-s2" },
    ]);
  });

  it("لا يخلط مرساتَي عنوانَين متطابقَي النصّ", () => {
    const b = parseBody("الأثر\nأ.\n\nالأثر\nب.");
    const ids = outline(b).map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
