import { describe, expect, it } from "vitest";
import {
  cleanSections,
  isSections,
  sectionsToBlocks,
  sectionsToText,
  textToSections,
} from "../news/blocks";

/**
 * حالاتُ الاختبار من `news.content` الحيّ لا مخترعة: القالبُ الذي يكتب به محرّرو
 * النادي («المقدمة · الأهداف والرؤية · التوصيات») وبنودُه واقتباسُه الختاميّ.
 */
describe("textToSections", () => {
  it("يفتح قسمًا عند كلّ عنوانٍ مستدَلّ", () => {
    const s = textToSections("المقدمة\nأقام النادي فعاليته.\n\nالختام\nوانتهت بخير.");
    expect(s).toEqual([
      { heading: "المقدمة", body: "أقام النادي فعاليته." },
      { heading: "الختام", body: "وانتهت بخير." },
    ]);
  });

  it("يجعل ما قبل أوّل عنوانٍ قسمًا بلا عنوان", () => {
    const s = textToSections("افتُتحت الفعالية في الأحساء.\n\nالأهداف والرؤية\n• نشر الوعي");
    expect(s[0]).toEqual({ heading: null, body: "افتُتحت الفعالية في الأحساء." });
    expect(s[1].heading).toBe("الأهداف والرؤية");
  });

  it("يضمّ الفقرةَ التاليةَ إلى قسمها لا إلى قسمٍ جديد", () => {
    const s = textToSections("الأثر\nفقرةٌ أولى.\n\nفقرةٌ ثانية.");
    expect(s).toHaveLength(1);
    expect(s[0].body).toBe("فقرةٌ أولى.\n\nفقرةٌ ثانية.");
  });

  it("يحفظ البنودَ والاقتباسَ كما كُتبت حرفًا بحرف", () => {
    const raw = 'التوصيات\n• مواصلة المشاركة\n•إقامة ورشٍ أدبية\n\n"الكلمة مسؤولية"\n— نادي أديب';
    const s = textToSections(raw);
    expect(s[0].body).toContain("•إقامة ورشٍ أدبية");
    expect(s[0].body).toContain("— نادي أديب");
  });

  it("يردّ فارغًا لمتنٍ فارغ", () => {
    expect(textToSections(null)).toEqual([]);
    expect(textToSections("  \n\n ")).toEqual([]);
  });
});

describe("sectionsToBlocks", () => {
  it("يرفع العنوانَ تصريحًا ويقرأ المتنَ بنودًا وفقرات", () => {
    const b = sectionsToBlocks([{ heading: "الأهداف", body: "تمهيد.\n• أوّل\n• ثانٍ" }]);
    expect(b).toEqual([
      { kind: "heading", text: "الأهداف" },
      { kind: "para", text: "تمهيد." },
      { kind: "list", items: ["أوّل", "ثانٍ"] },
    ]);
  });

  it("**لا ينتزع عنوانًا ثانيًا من متن القسم**", () => {
    // سطرٌ قصيرٌ بلا ترقيمٍ وتحته أسطر: كان الاستدلالُ يرفعه عنوانًا، وههنا فقرة.
    const b = sectionsToBlocks([{ heading: "الختام", body: "شكرًا لكلّ مشارك\nوإلى لقاءٍ قادم." }]);
    expect(b.filter((x) => x.kind === "heading")).toHaveLength(1);
  });

  it("يقبل قسمًا بلا عنوان", () => {
    expect(sectionsToBlocks([{ heading: null, body: "فقرةٌ وحدها." }])).toEqual([
      { kind: "para", text: "فقرةٌ وحدها." },
    ]);
  });
});

describe("sectionsToText", () => {
  it("يردّ نصًّا يُعيد الاستدلالُ منه البنيةَ نفسَها", () => {
    const s = [
      { heading: "المقدمة", body: "تمهيد." },
      { heading: "الختام", body: "خاتمة." },
    ];
    expect(sectionsToText(s)).toBe("المقدمة\nتمهيد.\n\nالختام\nخاتمة.");
    expect(textToSections(sectionsToText(s))).toEqual(s);
  });
});

describe("cleanSections", () => {
  it("يحذف القسمَ الخاويَ ويقصّ الأطراف", () => {
    expect(cleanSections([{ heading: "  ", body: "  " }, { heading: " أ ", body: " ب " }])).toEqual([
      { heading: "أ", body: "ب" },
    ]);
  });
});

describe("isSections", () => {
  it("يقبل الشكلَ الصحيح ويردّ ما عداه", () => {
    expect(isSections([{ heading: "أ", body: "ب" }, { heading: null, body: "ج" }])).toBe(true);
    expect(isSections([])).toBe(true);
    expect(isSections(null)).toBe(false);
    expect(isSections([{ body: 3 }])).toBe(false);
    expect(isSections([{ heading: "أ" }])).toBe(false);
    expect(isSections("نصّ")).toBe(false);
  });
});
