import { describe, expect, it } from "vitest";
import {
  CLUB_LABEL, NO_UNIT, buildUnitOptions, parseUnit, unitNameIndex, unitValue,
} from "@adeeb/core/org-unit";
import { organizerValue, parseOrganizer } from "@/lib/activities";

/**
 * **الجهةُ التنظيميّة.** ثلاثةُ جداولَ تتكرّر معرّفاتُها (القسم ١ ليس اللجنة ١)، فالقيمةُ
 * تحمل النوعَ والمعرّفَ معًا. وما يُختبَر ههنا ثلاثة: أنّ الذهابَ والإيابَ لا يفقدان
 * شيئًا · وأنّ المُدخَلَ المختلَّ يسقط إلى «النادي» لا إلى معرّفٍ مخترَع · وأنّ بابَ
 * الفعاليّات القديم (`organizerValue`) ما زال يعطي ما كان يعطيه بعد أن صار غلافًا.
 */

const COUNCILS = [
  { id: "executive", name_ar: "المجلس التنفيذي" },
  { id: "administrative", name_ar: "المجلس الإداري" },
];
const DEPTS = [
  { id: 3, name_ar: "قسم صناعة المحتوى", display_order: 2 },
  { id: 1, name_ar: "قسم الإنتاج الإعلامي", display_order: 1 },
];
const COMMS = [
  { id: 22, committee_name_ar: "إدارة الموارد البشرية", department_id: null },
  { id: 6, committee_name_ar: "لجنة التصميم", department_id: 1 },
  { id: 3, committee_name_ar: "لجنة التأليف", department_id: 3 },
];

describe("unitValue · parseUnit", () => {
  it("يرمّز كلَّ نوعٍ ببادئته ويردّه كما كان", () => {
    for (const cols of [
      { ...NO_UNIT, committeeId: 6 },
      { ...NO_UNIT, departmentId: 3 },
      { ...NO_UNIT, councilId: "executive" },
    ]) {
      expect(parseUnit(unitValue(cols))).toEqual(cols);
    }
  });

  it("الفراغُ هو النادي: لا عمودَ يُضبَط", () => {
    expect(unitValue(NO_UNIT)).toBe("");
    expect(parseUnit("")).toEqual(NO_UNIT);
    expect(parseUnit(null)).toEqual(NO_UNIT);
    expect(parseUnit(undefined)).toEqual(NO_UNIT);
  });

  it("يسقط المختلُّ إلى النادي ولا يُكتب معرّفًا مخترَعًا", () => {
    for (const bad of ["comm:", "comm:abc", "dept:0", "dept:-4", "council:", "council:exec 1", "لجنة", "comm:3;drop", "council:مجلس"]) {
      expect(parseUnit(bad)).toEqual(NO_UNIT);
    }
  });

  it("يحتمل معرّفَ مجلسٍ فيه رقمٌ أو شرطة — فلا يسقط صامتًا إلى النادي", () => {
    expect(parseUnit("council:executive-2")).toEqual({ ...NO_UNIT, councilId: "executive-2" });
  });

  it("لا يُضبَط عمودان معًا مهما كان المُدخَل", () => {
    for (const v of ["comm:6", "dept:3", "council:executive", "", "خطأ"]) {
      const u = parseUnit(v);
      const set = [u.committeeId, u.departmentId, u.councilId].filter((x) => x != null);
      expect(set.length).toBeLessThanOrEqual(1);
    }
  });
});

describe("buildUnitOptions", () => {
  const options = buildUnitOptions({ councils: COUNCILS, departments: DEPTS, committees: COMMS });

  it("يبدأ بالنادي بلا قيمة، ثمّ ينزل في الهيكلة: مجالس فأقسام فلجان فإدارات", () => {
    expect(options[0]).toEqual({ value: "", label: CLUB_LABEL });
    expect(options.slice(1).map((o) => o.group)).toEqual([
      "المجالس", "المجالس", "الأقسام", "الأقسام", "اللجان", "اللجان", "الإدارات",
    ]);
  });

  it("يرتّب الأقسامَ بترتيب عرضها ولجانَها بترتيب قسمها", () => {
    expect(options.filter((o) => o.group === "الأقسام").map((o) => o.value)).toEqual(["dept:1", "dept:3"]);
    expect(options.filter((o) => o.group === "اللجان").map((o) => o.value)).toEqual(["comm:6", "comm:3"]);
  });

  it("الإدارةُ لجنةٌ بلا قسم فتُفرَز وحدَها", () => {
    expect(options.filter((o) => o.group === "الإدارات").map((o) => o.value)).toEqual(["comm:22"]);
  });

  it("يُحذف المجالسُ بحذفها من المُدخَل — الفعاليّةُ يُنظّمها قسمٌ أو لجنة", () => {
    const narrow = buildUnitOptions({ departments: DEPTS, committees: COMMS });
    expect(narrow.some((o) => o.value.startsWith("council:"))).toBe(false);
  });

  it("يحتمل جدولًا فارغًا أو غائبًا فلا يبقى إلّا النادي", () => {
    expect(buildUnitOptions({ departments: null, committees: null })).toEqual([{ value: "", label: CLUB_LABEL }]);
  });

  it("فهرسُ الأسماء يقرأ الاسمَ من الخيار نفسِه", () => {
    const name = unitNameIndex(options);
    expect(name.get(unitValue({ ...NO_UNIT, committeeId: 6 }))).toBe("لجنة التصميم");
    expect(name.get(unitValue({ ...NO_UNIT, councilId: "administrative" }))).toBe("المجلس الإداري");
    expect(name.get("")).toBe(CLUB_LABEL);
  });
});

describe("بابُ الفعاليّات القديم", () => {
  it("يعطي ما كان يعطيه بعد أن صار غلافًا على المصدر الواحد", () => {
    expect(organizerValue(6, null)).toBe("comm:6");
    expect(organizerValue(null, 3)).toBe("dept:3");
    expect(organizerValue(null, null)).toBe("");
    expect(parseOrganizer("comm:6")).toEqual({ committeeId: 6, departmentId: null });
    expect(parseOrganizer("dept:3")).toEqual({ committeeId: null, departmentId: 3 });
    expect(parseOrganizer("")).toEqual({ committeeId: null, departmentId: null });
  });

  it("لا يُسرّب المجلسَ إلى الفعاليّات: عمودان لا ثالثَ لهما", () => {
    expect(parseOrganizer("council:executive")).toEqual({ committeeId: null, departmentId: null });
  });
});
