import { describe, expect, it } from "vitest";
import { navFor } from "../nav";
import type { MyScope } from "@/lib/myScope";

/**
 * بندُ «الإدارة» في خريطة التنقّل — **مدًى لا مقعد** (20260819).
 *
 * كان البندُ يُعرَض لمن له مقعدُ قيادةٍ في إدارةٍ إداريّة، فكان يسقط عن الرئيسَين وهما أهلُه:
 * لا يقودان إدارةً وتعيينُهما يبلغ الإدارتين. فصار السؤالُ عن `scope.units` (مداه) لا عن
 * `scope.unit` (مقعده)، والاسمُ يتبع الحقيقة.
 *
 * وهذه بواباتُ عرضٍ لا حراسة: الحارسُ الحقيقيّ `denyUnless` في الصفحة، والقاعدةُ ترد الكتابة.
 */

const UNIT_HREF = "/dashboard/unit";
const HR = { id: 22, name: "إدارة الموارد البشرية" };
const QA = { id: 23, name: "إدارة الضمان والجودة" };

// نطاقٌ فارغ يُبنى ههنا لا يُستورَد: `myScope` وحدةٌ خادميّة (`server-only`) لا تُحمَّل في المِعيار.
const NO_SCOPE: MyScope = {
  unit: null,
  units: [],
  department: null,
  committee: null,
  elections: { canRun: false, hasCandidacy: false, canVote: false },
};

/** بندُ الإدارة كما يراه صاحبُ هذا النطاق، أو `null` إن سقط عنه. */
function unitItem(scope: MyScope, caps = ["assign_unit_members"]) {
  for (const group of navFor(caps, scope)) {
    for (const item of group.items) if (item.href === UNIT_HREF) return item;
  }
  return null;
}

describe("بندُ الإدارة في خريطة التنقّل", () => {
  it("يسقط عمّن لا يبلغ إدارةً وإن حمل المفتاح", () => {
    // المفتاحُ وحده وعدٌ كاذب: من مُنحه ولا سلطةَ له لا يرى البند، ويرى الصفحةُ سببَه
    expect(unitItem(NO_SCOPE)).toBeNull();
  });

  it("يسقط عمّن لا يحمل المفتاح وإن بلغ إدارة", () => {
    expect(unitItem({ ...NO_SCOPE, units: [HR] }, ["view_members"])).toBeNull();
  });

  it("يُسمّى «إدارتي» لمن له فيها مقعد", () => {
    expect(unitItem({ ...NO_SCOPE, unit: HR, units: [HR] })?.label).toBe("إدارتي");
  });

  it("يُسمّى «الإدارات» لمن يبلغها ولا يجلس فيها", () => {
    // الرئيسان: لا مقعدَ لهما، وسلطتُهما تبلغ الإدارتين
    expect(unitItem({ ...NO_SCOPE, units: [HR, QA] })?.label).toBe("الإدارات");
  });

  it("يُعرَض لمن يبلغ إدارةً واحدةً بلا مقعدٍ فيها", () => {
    const item = unitItem({ ...NO_SCOPE, units: [HR] });
    expect(item?.href).toBe(UNIT_HREF);
    expect(item?.label).toBe("الإدارات");
  });

  it("لا يمسّ مقعدَي القسم واللجنة", () => {
    const nav = navFor(["manage_department", "manage_committee_members"], {
      ...NO_SCOPE,
      units: [HR, QA],
    });
    const hrefs = nav.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).not.toContain("/dashboard/department");
    expect(hrefs).not.toContain("/dashboard/committee");
  });
});
