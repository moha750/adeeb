import { describe, expect, it } from "vitest";
import { positionLine, positionParts, seatName } from "@/lib/positionLabel";

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
    expect(seatName("رئيس نادي أدِيب", null)).toBe("رئيس نادي أدِيب");
    expect(seatName("رئيس نادي أدِيب")).toBe("رئيس نادي أدِيب");
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
    expect(positionLine("رئيس نادي أدِيب", null)).toBe("رئيس نادي أدِيب");
    expect(positionLine("رئيس نادي أدِيب", "")).toBe("رئيس نادي أدِيب");
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
