import { describe, expect, it } from "vitest";
import {
  COUNCIL_ITEMS,
  MEMBER_ITEMS,
  SCALE,
  atOrBelowThreshold,
  evaluate,
  membersQuorum,
  partScore,
  percentText,
  recordFor,
  type PartTally,
} from "@/lib/evaluation/score";

/**
 * **معيارُ حساب التقييم الربعيّ** — لائحة تقييم القيادات، المواد ٥ و٨ و٩.
 *
 * المجاميعُ هنا كما تجمعها القاعدة: مجموعُ درجات كلّ شقّ، وعددُ أوراقه، وعددُ مؤهّليه في اللقطة.
 * ولكي تُقرأ الحالاتُ بالنسب لا بالمجاميع، يبني `tally` المجموعَ من نسبةٍ مقصودة.
 */

/** مجموعُ درجاتٍ يعطي النسبةَ `pct` بالضبط لعدد أوراقٍ وبنود. يرفض نسبةً لا تُبلَغ بأعدادٍ صحيحة. */
function tally(pct: number, ballots: number, eligible: number, items: number): PartTally {
  const sum = (pct * ballots * items * SCALE) / 100;
  if (!Number.isInteger(sum)) throw new Error(`النسبة ${pct}% لا تُبلَغ بـ${ballots} ورقة`);
  return { sum, ballots, eligible };
}
const members = (pct: number, ballots: number, eligible: number) => tally(pct, ballots, eligible, MEMBER_ITEMS);
const council = (pct: number, ballots: number, eligible = 6) => tally(pct, ballots, eligible, COUNCIL_ITEMS);
const EMPTY_COUNCIL: PartTally = { sum: 0, ballots: 0, eligible: 6 };

describe("مثال المادة الثامنة", () => {
  it("الأعضاء 50% والمجلس 30% ← 35% و9%، أي 44%، فيبقى", () => {
    const r = evaluate({ members: members(50, 2, 4), council: council(30, 2) });
    expect(r.branch).toBe("both");
    expect(r.members).toEqual({ num: 1, den: 2 });
    expect(r.council).toEqual({ num: 3, den: 10 });
    expect(r.final).toEqual({ num: 11, den: 25 }); // 44/100
    expect(percentText(r.final!)).toBe("44");
    expect(r.verdict).toBe("kept");
  });
});

describe("حدّ 40% (م٩/1: «40% أو أقل» يُستبعد)", () => {
  it("40% بالضبط من شقّين ← يُستبعد", () => {
    const r = evaluate({ members: members(40, 1, 2), council: council(40, 1) });
    expect(r.final).toEqual({ num: 2, den: 5 });
    expect(r.verdict).toBe("removed");
  });

  it("العشريُّ يخطئ عند الحدّ، والكسرُ الصحيح لا يخطئ", () => {
    // ٢٥ ورقةً للأعضاء مجموعُها 419، وخمسٌ للمجلس مجموعُها 27: النتيجةُ 40% بالضبط.
    // وحسابُها بالمتوسّطات عشريًّا يعطي 0.4000000000000001، فيُبقي من أوجبت اللائحةُ استبعادَه.
    const viaAverages = (419 / 25 / 7 / 5) * 0.7 + (27 / 5 / 5 / 5) * 0.3;
    expect(viaAverages > 0.4).toBe(true);
    const r = evaluate({ members: { sum: 419, ballots: 25, eligible: 30 }, council: { sum: 27, ballots: 5, eligible: 6 } });
    expect(r.final).toEqual({ num: 2, den: 5 });
    expect(r.verdict).toBe("removed");
  });

  it("40% بالضبط من شقٍّ واحد ← يُستبعد", () => {
    expect(evaluate({ members: members(40, 2, 3), council: EMPTY_COUNCIL }).verdict).toBe("removed");
    expect(evaluate({ members: { sum: 0, ballots: 0, eligible: 5 }, council: council(40, 1) }).verdict).toBe("removed");
  });

  it("فوق الحدّ بأصغر ما يُبلَغ ← يبقى، ولا تُعرض «40» لمن تجاوزها", () => {
    // ورقةٌ واحدةٌ للأعضاء (35 درجة قصوى) مجموعُها 15 = 42.857…%، وأقربُ ما تحتها 14 = 40%
    const above = evaluate({ members: { sum: 15, ballots: 1, eligible: 2 }, council: EMPTY_COUNCIL });
    expect(above.verdict).toBe("kept");
    expect(percentText(above.final!)).toBe("42.8"); // مقطوعٌ لا مقرَّب (42.857 لا تصير 42.9)

    // 0.7·(141/350) + 0.3·(10/25) = 0.40200…: فوق الحدّ بشعرة
    const hair = evaluate({ members: { sum: 141, ballots: 10, eligible: 10 }, council: council(40, 1) });
    expect(hair.verdict).toBe("kept");
    expect(atOrBelowThreshold(hair.final!)).toBe(false);
    expect(percentText(hair.final!)).toBe("40.2");
  });

  it("تحت الحدّ ← يُستبعد", () => {
    expect(evaluate({ members: members(20, 1, 1), council: council(60, 1) }).verdict).toBe("removed"); // 14% + 18% = 32%
  });
});

describe("النصاب (م٥/1: نصفُهم على الأقل)", () => {
  it("عددٌ زوجيّ: 6 مؤهّلين ← 3 تكفي، و2 لا تكفي", () => {
    expect(membersQuorum({ sum: 21, ballots: 3, eligible: 6 })).toBe(true);
    expect(membersQuorum({ sum: 14, ballots: 2, eligible: 6 })).toBe(false);
  });

  it("عددٌ فرديّ: 5 مؤهّلين نصفُهم 2.5 ← 3 تكفي، و2 لا تكفي", () => {
    expect(membersQuorum({ sum: 21, ballots: 3, eligible: 5 })).toBe(true);
    expect(membersQuorum({ sum: 14, ballots: 2, eligible: 5 })).toBe(false);
  });

  it("مؤهّلٌ واحد: ورقتُه تكفي", () => {
    expect(membersQuorum({ sum: 7, ballots: 1, eligible: 1 })).toBe(true);
  });

  it("لا مؤهّلَ أصلًا (صفرٌ من صفر) ← الشقُّ فارغ لا مكتمل", () => {
    expect(membersQuorum({ sum: 0, ballots: 0, eligible: 0 })).toBe(false);
    const r = evaluate({ members: { sum: 0, ballots: 0, eligible: 0 }, council: council(80, 2) });
    expect(r.branch).toBe("council_only");
    expect(r.final).toEqual({ num: 4, den: 5 });
  });

  it("الشقُّ الذي سقط نصابُه لا يدخل الحساب ولو كانت درجاتُه عالية", () => {
    const r = evaluate({ members: members(100, 2, 6), council: council(40, 1) });
    expect(r.membersQuorum).toBe(false);
    expect(r.members).toBeNull();
    expect(r.branch).toBe("council_only");
    expect(r.verdict).toBe("removed");
  });
});

describe("الفروع الأربعة", () => {
  it("both: اكتمل نصابُ الأعضاء وفي المجلس ورقة ← 70% و30%", () => {
    const r = evaluate({ members: members(80, 4, 8), council: council(60, 2) });
    expect(r.branch).toBe("both");
    expect(r.final).toEqual({ num: 37, den: 50 }); // 56% + 18% = 74%
    expect(r.verdict).toBe("kept");
  });

  it("members_only: اكتمل نصابُ الأعضاء ولا ورقةَ في المجلس ← نتيجةُ الأعضاء كاملة", () => {
    const r = evaluate({ members: members(60, 3, 5), council: EMPTY_COUNCIL });
    expect(r.branch).toBe("members_only");
    expect(r.council).toBeNull();
    expect(r.final).toEqual({ num: 3, den: 5 });
    expect(r.verdict).toBe("kept");
  });

  it("council_only: سقط نصابُ الأعضاء وفي المجلس ورقة ← نتيجةُ المجلس كاملة", () => {
    const r = evaluate({ members: members(80, 1, 9), council: council(60, 1) });
    expect(r.branch).toBe("council_only");
    expect(r.final).toEqual({ num: 3, den: 5 });
  });

  it("none: خلا الشقّان ← لا نتيجة في هذه الدورة", () => {
    const r = evaluate({ members: members(80, 1, 9), council: EMPTY_COUNCIL });
    expect(r.branch).toBe("none");
    expect(r.final).toBeNull();
    expect(r.verdict).toBe("no_result");
  });
});

describe("نتيجةُ الشقّ (م٨/1: متوسّطُ الدرجات مقسومًا على 5)", () => {
  it("ورقتان: كلُّ البنود 5 ثمّ كلُّها 1 ← 60%", () => {
    expect(partScore({ sum: 35 + 7, ballots: 2, eligible: 2 }, MEMBER_ITEMS)).toEqual({ num: 3, den: 5 });
  });

  it("لا أوراق ← لا نتيجة", () => {
    expect(partScore({ sum: 0, ballots: 0, eligible: 4 }, COUNCIL_ITEMS)).toBeNull();
  });
});

describe("مجاميعُ لا تتّسق تُرفض ولا تُحسب", () => {
  it("مجموعٌ فوق الأقصى أو تحت الأدنى", () => {
    expect(() => evaluate({ members: { sum: 36, ballots: 1, eligible: 1 }, council: EMPTY_COUNCIL })).toThrow(RangeError);
    expect(() => evaluate({ members: { sum: 6, ballots: 1, eligible: 1 }, council: EMPTY_COUNCIL })).toThrow(RangeError);
  });

  it("عددٌ سالب أو كسريّ", () => {
    expect(() => evaluate({ members: { sum: 7, ballots: -1, eligible: 1 }, council: EMPTY_COUNCIL })).toThrow(RangeError);
    expect(() => evaluate({ members: { sum: 7.5, ballots: 1, eligible: 1 }, council: EMPTY_COUNCIL })).toThrow(RangeError);
  });
});

describe("percentText: منزلةٌ واحدة مقطوعة", () => {
  it("يقطع ولا يقرّب، ويحذف الصفر العشريّ", () => {
    expect(percentText({ num: 2, den: 3 })).toBe("66.6");
    expect(percentText({ num: 1, den: 1 })).toBe("100");
    expect(percentText({ num: 1, den: 5 })).toBe("20");
  });

  it("فوق الحدّ بما دون العُشر: تُزاد المنازل فلا يُقرأ الباقي «40»", () => {
    expect(percentText({ num: 4001, den: 10000 })).toBe("40.01");
    expect(percentText({ num: 40004, den: 100000 })).toBe("40.004");
    expect(percentText({ num: 2, den: 5 })).toBe("40"); // 40% بالضبط مستبعَدٌ فلا منازلَ زائدة
    expect(percentText({ num: 3999, den: 10000 })).toBe("39.9");
  });
});

describe("recordFor: ما يُسلَّم للقاعدة", () => {
  it("يحمل المجاميعَ التي حُسب عليها، والكسورَ أزواجًا", () => {
    const r = recordFor({ target_id: 7, m_sum: 35, m_ballots: 2, m_eligible: 4, c_sum: 15, c_ballots: 2, c_eligible: 6 });
    expect(r).toEqual({
      targetId: 7,
      tally: { mSum: 35, mBallots: 2, mEligible: 4, cSum: 15, cBallots: 2, cEligible: 6 },
      branch: "both",
      membersQuorum: true,
      members: [1, 2],
      council: [3, 10],
      final: [11, 25],
      verdict: "kept",
    });
  });

  it("لا نتيجة ← لا كسور", () => {
    const r = recordFor({ target_id: 1, m_sum: 0, m_ballots: 0, m_eligible: 3, c_sum: 0, c_ballots: 0, c_eligible: 4 });
    expect(r.final).toBeNull();
    expect(r.verdict).toBe("no_result");
  });
});
