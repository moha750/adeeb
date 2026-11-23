import { describe, expect, it } from "vitest";
import { actingLine, isFullTitle, personTitle, positionLine, positionParts, rankFor, seatName } from "@/lib/positionLabel";

/**
 * تسميةُ المنصب — القاعدةُ في سطرين: مسمّى **شخصٍ** رتبتُه ووحدةُ إسناده، ومسمّى
 * **مقعدٍ** رتبتُه ووحدتُه الملازمة. والوصلُ **مسافةٌ لا فاصل**: النقطةُ تفصل خبرين
 * متجاورين، والرتبةُ ووحدتُها خبرٌ واحد (مضافٌ ومضافٌ إليه). ولذلك آخرُ وصفٍ ههنا
 * يمسح مخرجات الدالّة كلَّها بحثًا عن فاصلٍ ممنوع.
 */

describe("seatName", () => {
  it("يصل الرتبة بوحدتها الملازمة بمسافة", () => {
    expect(seatName("قائد", "إدارة الموارد البشرية")).toBe("قائد إدارة الموارد البشرية");
  });

  it("يعيد الرتبة وحدَها إن لم تكن للمقعد وحدةٌ ملازمة", () => {
    expect(seatName("رئيس أدِيب", null)).toBe("رئيس أدِيب");
    expect(seatName("رئيس أدِيب")).toBe("رئيس أدِيب");
    expect(seatName("منسّق", "")).toBe("منسّق");
    expect(seatName("منسّق", "   ")).toBe("منسّق");
  });

  it("يقلّم الطرفين فلا يبقى فراغٌ في جملةٍ تُطبَع", () => {
    expect(seatName("  قائد  ", "  لجنة الرواة  ")).toBe("قائد لجنة الرواة");
  });
});

describe("positionParts", () => {
  it("يفصل القطعتين لمن يعرضهما مفترقتين", () => {
    expect(positionParts("عضو", "لجنة الإعلام")).toEqual({ title: "عضو", scope: "لجنة الإعلام" });
  });

  // الوحدةُ `null` لا `""`: الشاشةُ تسأل «أثمّ نطاق؟» بشرطٍ واحدٍ لا بشرطين
  it("الوحدةُ الفارغةُ تُقال عدمًا لا نصًّا فارغًا", () => {
    expect(positionParts("عضو", "")).toEqual({ title: "عضو", scope: null });
    expect(positionParts("عضو", "   ")).toEqual({ title: "عضو", scope: null });
    expect(positionParts("عضو", null)).toEqual({ title: "عضو", scope: null });
    expect(positionParts("عضو")).toEqual({ title: "عضو", scope: null });
  });

  // الرتبةُ بخلافها تبقى نصًّا فارغًا: القطعتان لا تتّحدان في التمثيل عبثًا
  it("الرتبةُ الغائبةُ نصٌّ فارغ", () => {
    expect(positionParts(null, "لجنة الرواة")).toEqual({ title: "", scope: "لجنة الرواة" });
    expect(positionParts(undefined, undefined)).toEqual({ title: "", scope: null });
  });

  it("يقلّم الطرفين في القطعتين", () => {
    expect(positionParts("  نائب  ", "  لجنة التصميم  ")).toEqual({ title: "نائب", scope: "لجنة التصميم" });
  });
});

describe("positionLine", () => {
  it("يصل الرتبة بوحدة إسنادها بمسافة", () => {
    expect(positionLine("عضو", "لجنة الإعلام")).toBe("عضو لجنة الإعلام");
    expect(positionLine("منسّق", "قسم صناعة المحتوى")).toBe("منسّق قسم صناعة المحتوى");
  });

  it("يقول الرتبة وحدَها لمن لا وحدةَ له", () => {
    expect(positionLine("رئيس أدِيب", null)).toBe("رئيس أدِيب");
    expect(positionLine("رئيس أدِيب", "")).toBe("رئيس أدِيب");
  });

  it("يقول الوحدة وحدَها لمن لا رتبةَ له", () => {
    expect(positionLine(null, "لجنة الرواة")).toBe("لجنة الرواة");
  });

  /**
   * `null` لا `""` عند الغياب — فتختار الشاشةُ كلمةَ الغياب التي تليق بها («غير متوفّر» ·
   * «بلا موقع»). ولو أُعيد نصٌّ فارغٌ لظهرت خانةٌ خرساءُ بلا خبر.
   */
  it("يعيد null إن لم يبقَ نصّ، فتختار الشاشةُ كلمةَ الغياب", () => {
    expect(positionLine(null, null)).toBeNull();
    expect(positionLine(undefined, undefined)).toBeNull();
    expect(positionLine("", "")).toBeNull();
    expect(positionLine("   ", "   ")).toBeNull();
  });

  it("يقلّم فلا مسافةٌ مزدوجةٌ ولا طرفٌ سائب", () => {
    expect(positionLine("  عضو  ", "  لجنة الرواة  ")).toBe("عضو لجنة الرواة");
    expect(positionLine("عضو", "  ")).toBe("عضو");
  });

  it("هو وصلُ قطعتَي positionParts بمسافة، لا حسابٌ ثانٍ", () => {
    for (const [rank, unit] of [["عضو", "لجنة الرواة"], ["قائد", null], [null, "قسم الإعلام"], [null, null]] as const) {
      const p = positionParts(rank, unit);
      expect(positionLine(rank, unit)).toBe([p.title, p.scope].filter(Boolean).join(" ").trim() || null);
    }
  });
});

/**
 * **قاعدةُ المستودع، لا ذوقُ الشاشة** (يحرسها `scripts/no-separators.mjs` في `pnpm check`):
 * الرتبةُ ووحدتُها بمسافة، وخبران بفاصلةٍ عربيّة. فمن وضع نقطةً بينهما قطع القائدَ عن لجنته.
 */
describe("لا فاصلَ في المخرجات", () => {
  // مكتوبةٌ **بالرموز لا بالمحارف** عمدًا، كي لا يقع المِعيارُ نفسُه تحت الحارس الذي يخدمه.
  // وهي بالترتيب: النقطةُ الوسطى، الشريطُ، الشرطةُ الطويلة، الشرطةُ المفردة بين مسافتين.
  const FORBIDDEN = ["\u00B7", "\u007C", "\u2014", " \u002D "];
  const SAMPLES: [string | null, string | null][] = [
    ["عضو", "لجنة الإعلام"],
    ["قائد", "إدارة الموارد البشرية"],
    ["منسّق", "قسم صناعة المحتوى"],
    ["نائب", null],
    [null, "لجنة الرواة"],
    [null, null],
  ];

  it("positionLine يصل بمسافةٍ وحدها", () => {
    for (const [rank, unit] of SAMPLES) {
      const line = positionLine(rank, unit) ?? "";
      for (const bad of FORBIDDEN) expect(line, `${line} ⇐ ${bad}`).not.toContain(bad);
    }
  });

  it("seatName يصل بمسافةٍ وحدها", () => {
    for (const [rank, unit] of SAMPLES) {
      const line = seatName(rank ?? "", unit);
      for (const bad of FORBIDDEN) expect(line, `${line} ⇐ ${bad}`).not.toContain(bad);
    }
  });

  // ولا مسافةً مزدوجةً تُخفي فاصلًا محذوفًا
  it("لا مسافةَ مزدوجةٌ في أيّ مخرج", () => {
    for (const [rank, unit] of SAMPLES) {
      expect(positionLine(rank, unit) ?? "").not.toContain("  ");
      expect(seatName(rank ?? "", unit)).not.toContain("  ");
    }
  });
});

describe("rankFor", () => {
  it("يؤنّث الرتبة وحدَها أوّلَ المسمّى", () => {
    expect(rankFor("قائد", "female")).toBe("قائدة");
    expect(rankFor("قائد إدارة الموارد البشرية", "female")).toBe("قائدة إدارة الموارد البشرية");
    expect(rankFor("رئيس أدِيب", "female")).toBe("رئيسة أدِيب");
    // المسمّى المعرَّف يُؤنَّث كلُّه لا أوّلُ كلمته
    expect(rankFor("الرئيس التنفيذي", "female")).toBe("الرئيسة التنفيذية");
    expect(rankFor("الرئيس التنفيذي", "male")).toBe("الرئيس التنفيذي");
  });

  it("يُبقي «عضو» للجنسين", () => {
    expect(rankFor("عضو لجنة التأليف", "female")).toBe("عضو لجنة التأليف");
  });

  it("لا يمسّ المذكّر ولا المجهول", () => {
    expect(rankFor("منسّق", "male")).toBe("منسّق");
    expect(rankFor("منسّق", null)).toBe("منسّق");
  });
});

describe("actingLine", () => {
  it("يُلحق «تكليفًا» بالمسمّى المكلَّف وحده", () => {
    expect(actingLine("قائد لجنة التسويق", true)).toBe("قائد لجنة التسويق تكليفًا");
    expect(actingLine("قائد لجنة التسويق", false)).toBe("قائد لجنة التسويق");
    expect(actingLine("قائد لجنة التسويق", null)).toBe("قائد لجنة التسويق");
  });
  it("لا يخترع مسمّى للغائب", () => {
    expect(actingLine(null, true)).toBeNull();
  });
  it("يبقى التأنيث في أوّل الجملة", () => {
    expect(actingLine(rankFor("قائد لجنة التصوير", "female"), true)).toBe("قائدة لجنة التصوير تكليفًا");
  });
});

/**
 * **توحيد المسمّيات (2026-11-23)**: يرى الشخصُ مسمّاه واحدًا في كلّ مكان. والقاعدةُ: الرتبةُ المجرّدة
 * (كلمة) تُلحق بها وحدتُها، والمسمّى التامّ (أكثرُ من كلمة) يُقال وحده؛ وكلُّه بجنس صاحبه إلّا «عضو».
 * والقاعدةُ نفسُها في توأمها `position_title` في القاعدة.
 */
describe("المسمّى التامّ", () => {
  it("يعرف المسمّى التامّ بأنّه أكثرُ من كلمة", () => {
    expect(isFullTitle("قائد")).toBe(false);
    expect(isFullTitle("  نائب  ")).toBe(false);
    expect(isFullTitle("مشرف الموارد البشرية")).toBe(true);
    expect(isFullTitle("عضو تنفيذي")).toBe(true);
    expect(isFullTitle("رئيس أدِيب")).toBe(true);
    expect(isFullTitle(null)).toBe(false);
  });

  it("لا يُلحق بالمسمّى التامّ وحدةً ولو مُرّرت", () => {
    expect(positionLine("مشرف الموارد البشرية", "إدارة الموارد البشرية")).toBe("مشرف الموارد البشرية");
    expect(positionLine("مشرف الضمان والجودة", "إدارة الضمان والجودة")).toBe("مشرف الضمان والجودة");
    expect(positionLine("عضو تنفيذي", "الإدارة التنفيذية")).toBe("عضو تنفيذي");
    expect(positionParts("مشرف الموارد البشرية", "إدارة الموارد البشرية")).toEqual({ title: "مشرف الموارد البشرية", scope: null });
    expect(seatName("عضو تنفيذي", "الإدارة التنفيذية")).toBe("عضو تنفيذي");
  });

  it("ويُلحقها بالرتبة المجرّدة كما كان", () => {
    expect(positionLine("قائد", "إدارة الموارد البشرية")).toBe("قائد إدارة الموارد البشرية");
    expect(seatName("قائد", "إدارة الضمان والجودة")).toBe("قائد إدارة الضمان والجودة");
    expect(positionLine("نائب", "لجنة التصوير")).toBe("نائب لجنة التصوير");
  });
});

describe("المسمّى بجنس صاحبه", () => {
  // الجدولُ كلُّه كما في وثيقة القرار: [الرتبة، الوحدة، للرجل، للمرأة]
  const TABLE: [string, string | null, string, string][] = [
    ["رئيس أدِيب", null, "رئيس أدِيب", "رئيسة أدِيب"],
    ["الرئيس التنفيذي", null, "الرئيس التنفيذي", "الرئيسة التنفيذية"],
    ["قائد", "إدارة الموارد البشرية", "قائد إدارة الموارد البشرية", "قائدة إدارة الموارد البشرية"],
    ["قائد", "إدارة الضمان والجودة", "قائد إدارة الضمان والجودة", "قائدة إدارة الضمان والجودة"],
    ["مشرف الموارد البشرية", "إدارة الموارد البشرية", "مشرف الموارد البشرية", "مشرفة الموارد البشرية"],
    ["مشرف الضمان والجودة", "إدارة الضمان والجودة", "مشرف الضمان والجودة", "مشرفة الضمان والجودة"],
    ["عضو تنفيذي", "الإدارة التنفيذية", "عضو تنفيذي", "عضو تنفيذي"],
    ["منسّق", "قسم الإنتاج الإعلامي", "منسّق قسم الإنتاج الإعلامي", "منسّقة قسم الإنتاج الإعلامي"],
    ["قائد", "لجنة التصميم", "قائد لجنة التصميم", "قائدة لجنة التصميم"],
    ["نائب", "لجنة التصميم", "نائب لجنة التصميم", "نائبة لجنة التصميم"],
    ["عضو", "لجنة التصميم", "عضو لجنة التصميم", "عضو لجنة التصميم"],
  ];

  it("يقول كلَّ مقعدٍ للرجل وللمرأة كما قُرّر", () => {
    for (const [rank, unit, male, female] of TABLE) {
      expect(positionLine(rank, unit, "male")).toBe(male);
      expect(positionLine(rank, unit, "female")).toBe(female);
      // والمجهولُ جنسُه يأخذ المذكّر
      expect(positionLine(rank, unit, null)).toBe(male);
    }
  });

  it("لا يكتب «نائب قائد» أبدًا", () => {
    for (const [rank, unit] of TABLE) {
      for (const g of ["male", "female"]) expect(positionLine(rank, unit, g)).not.toMatch(/نائبة? قائد/);
    }
  });

  it("personTitle يجمع الجنسَ والتكليف، و«تكليفًا» آخرَ الجملة", () => {
    expect(personTitle("قائد", "لجنة التسويق", "female", true)).toBe("قائدة لجنة التسويق تكليفًا");
    expect(personTitle("مشرف الموارد البشرية", "إدارة الموارد البشرية", "female", false)).toBe("مشرفة الموارد البشرية");
    expect(personTitle("عضو تنفيذي", "الإدارة التنفيذية", "female", true)).toBe("عضو تنفيذي تكليفًا");
    expect(personTitle(null, null, "female", true)).toBeNull();
  });

  it("التأنيثُ لا يتكرّر على مسمًّى مؤنَّثٍ أصلًا", () => {
    expect(rankFor(rankFor("مشرف الموارد البشرية", "female"), "female")).toBe("مشرفة الموارد البشرية");
    expect(positionParts("قائد", "لجنة التصميم", "female")).toEqual({ title: "قائدة", scope: "لجنة التصميم" });
  });
});
