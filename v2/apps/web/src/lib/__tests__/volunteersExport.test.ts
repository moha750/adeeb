import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  ALL_COLUMNS, BASE_COLUMNS, DEFAULT_SPEC, exportFileName, exportLine, planSheets, selectVolunteers, standOf,
  type ExportSpec, type ExportVolunteer,
} from "@/lib/volunteersExport";
import { buildVolunteersFile } from "@/lib/volunteersFile";

const C = [
  { id: 1, name: "لجنة التأليف" },
  { id: 2, name: "لجنة التصوير" },
  { id: 3, name: "لجنة الفعاليات" },
];

let n = 0;
function v(p: Partial<ExportVolunteer> = {}): ExportVolunteer {
  n += 1;
  return {
    userId: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    name: `متطوّع ${n}`, phone: "0500000000", email: `v${n}@example.com`, gender: "female", city: null,
    status: "active", endReason: null, acceptsMarketing: true, prefs: [], apps: [], certificates: 0,
    applied: 0, accepted: 0, attended: 0, absent: 0,
    appliedIso: "2026-11-20T10:00:00Z", endedIso: null, lastSignInIso: null, prefsUpdatedIso: null,
    ...p,
  };
}
const spec = (p: Partial<ExportSpec> = {}): ExportSpec => ({ ...DEFAULT_SPEC, scope: "all", ...p });
const TODAY = "2026-11-24";

const noor = v({ name: "نورة", prefs: [C[0], C[1]], gender: "female" });
const ali = v({ name: "علي", prefs: [C[1], C[0], C[2]], gender: "male" });
const nil = v({ name: "بلا جنس", gender: null, prefs: [] });
const old = v({ name: "سابقة", status: "former", endReason: "انشغال", endedIso: "2026-10-01T10:00:00Z", appliedIso: "2026-08-22T10:00:00Z" });
const member = v({ name: "عضوة", status: "former", endReason: "نال العضويّة", endedIso: "2026-11-01T10:00:00Z" });
const ROWS = [noor, ali, nil, old, member];

describe("selectVolunteers", () => {
  it("الكلُّ بترتيب الغرفة", () => {
    expect(selectVolunteers(ROWS, spec(), TODAY)).toEqual(ROWS);
  });
  it("ما في الغرفة والمحدَّدون بترتيب من رآهم، ومعرّفٌ لا يقابله أحدٌ يسقط، والمكرّرُ مرّة", () => {
    const ids = [ali.userId, "00000000-0000-4000-8000-999999999999", noor.userId, ali.userId];
    expect(selectVolunteers(ROWS, spec({ scope: "picked", ids }), TODAY)).toEqual([ali, noor]);
    expect(selectVolunteers(ROWS, spec({ scope: "room", ids: [] }), TODAY)).toEqual([]);
  });
  it("الجنس، والجنسُ غير المحدّد", () => {
    expect(selectVolunteers(ROWS, spec({ genders: ["male"] }), TODAY)).toEqual([ali]);
    expect(selectVolunteers(ROWS, spec({ genders: ["none"] }), TODAY)).toEqual([nil]);
    expect(selectVolunteers(ROWS, spec({ genders: ["male", "none"] }), TODAY)).toEqual([ali, nil]);
  });
  it("الرغبةُ بأيّ ترتيب، أو الأولى وحدها", () => {
    expect(selectVolunteers(ROWS, spec({ committees: ["1"] }), TODAY)).toEqual([noor, ali]);
    // أكثرُ من لجنة: من رغب إحداها، وبالرتبة من كانت إحداها رغبتَه بهذا الرقم
    expect(selectVolunteers(ROWS, spec({ committees: ["2", "3"], ranks: [2] }), TODAY)).toEqual([noor]);
    expect(selectVolunteers(ROWS, spec({ committees: ["1"], ranks: [1] }), TODAY)).toEqual([noor]);
    // رتبتان معًا بلا الوسطى: الأولى أو الثالثة
    expect(selectVolunteers(ROWS, spec({ committees: ["3"], ranks: [1, 3] }), TODAY)).toEqual([ali]);
  });
  it("الثانيةُ والثالثةُ تمامًا، ومن رغباتُه أقلُّ لا يطابق", () => {
    expect(selectVolunteers(ROWS, spec({ committees: ["1"], ranks: [2] }), TODAY)).toEqual([ali]);
    expect(selectVolunteers(ROWS, spec({ committees: ["2"], ranks: [2] }), TODAY)).toEqual([noor]);
    expect(selectVolunteers(ROWS, spec({ committees: ["3"], ranks: [3] }), TODAY)).toEqual([ali]);
    // نورة رغبتان فقط: لا ثالثةَ لها، وعليٌّ ثالثتُه لجنةٌ أخرى
    expect(selectVolunteers(ROWS, spec({ committees: ["2"], ranks: [3] }), TODAY)).toEqual([]);
    expect(selectVolunteers(ROWS, spec({ committees: ["3"], ranks: [2] }), TODAY)).toEqual([]);
  });
  it("الحال: مواضعُ الغرفة نفسُها", () => {
    expect(standOf(member)).toBe("members");
    expect(standOf(old)).toBe("former");
    expect(selectVolunteers(ROWS, spec({ stands: ["members", "former"] }), TODAY)).toEqual([old, member]);
  });
  it("المدّةُ بيوم الرياض", () => {
    // الحادية عشرة ليلًا بالرياض يومُ 17 لا 18 بتوقيت غرينتش
    const late = v({ appliedIso: "2026-11-17T20:30:00Z" });
    const edge = v({ appliedIso: "2026-11-17T21:30:00Z" }); // 00:30 يوم 18 بالرياض
    expect(selectVolunteers([late, edge], spec({ since: "7" }), TODAY)).toEqual([edge]);
    expect(selectVolunteers(ROWS, spec({ since: "30" }), TODAY)).not.toContain(old);
    expect(selectVolunteers(ROWS, spec({ since: "range", from: "2026-08-01", to: "2026-08-31" }), TODAY)).toEqual([old]);
    expect(selectVolunteers(ROWS, spec({ since: "range", from: "", to: "" }), TODAY)).toEqual(ROWS);
  });
});

describe("planSheets", () => {
  it("ورقةٌ واحدة بالأعمدة الأساسيّة، والرغباتُ ثلاثةُ أعمدةٍ ولو قلّت", () => {
    const [s] = planSheets([noor], spec(), C);
    expect(s.columns.map((c) => c.title)).toEqual([
      "الاسم", "الجنس", "الجوّال", "البريد", "المدينة", "الحال", "الرغبة الأولى", "الرغبة الثانية", "الرغبة الثالثة", "بداية التطوّع", "المشاركات", "الشهادات السارية",
    ]);
    expect(s.rows[0]).toEqual(["نورة", "أنثى", "0500000000", noor.email, null, "متطوّعة", "لجنة التأليف", "لجنة التصوير", null, { day: "2026-11-20" }, 0, 0]);
  });
  it("الاسمُ لا يسقط، والأعمدةُ بترتيبها لا بترتيب اختيارها", () => {
    const [s] = planSheets([old], spec({ columns: ["end", "gender"] }), C);
    expect(s.columns.map((c) => c.title)).toEqual(["الاسم", "الجنس", "انتهى تطوّعه في", "سبب الانتهاء"]);
    expect(s.rows[0]).toEqual(["سابقة", "أنثى", { day: "2026-10-01" }, "انشغال"]);
  });
  it("الانتهاءُ للسابق وحده، والحالُ بجنس صاحبه", () => {
    const [s] = planSheets([noor, ali, member], spec({ columns: ["status", "end"] }), C);
    expect(s.rows.map((r) => r.slice(1))).toEqual([["متطوّعة", null, null], ["متطوّع", null, null], ["صارت عضوًا", { day: "2026-11-01" }, "نال العضويّة"]]);
  });
  it("كلُّ الأعمدة", () => {
    const [s] = planSheets([ali], spec({ columns: ALL_COLUMNS }), C);
    expect(s.columns.length).toBe(BASE_COLUMNS.length + 2 + 1 + 2 + 1 + 1 + 4);
  });
  it("ورقةٌ لكلّ لجنة: المتطوّعُ في كلّ لجنةٍ رغبها بترتيبها، ثمّ «بلا رغبات»", () => {
    const sheets = planSheets(ROWS, spec({ split: "committee", columns: ["name"] }), C);
    expect(sheets.map((s) => s.name)).toEqual(["لجنة التأليف", "لجنة التصوير", "لجنة الفعاليات", "بلا رغبات"]);
    expect(sheets[0].columns.map((c) => c.title)).toEqual(["الاسم", "ترتيبها عنده"]);
    expect(sheets[0].rows).toEqual([["نورة", 1], ["علي", 2]]);
    expect(sheets[1].rows).toEqual([["علي", 1], ["نورة", 2]]);
    expect(sheets[3].rows.map((r) => r[0])).toEqual(["بلا جنس", "سابقة", "عضوة"]);
  });
  it("مرشّحُ اللجنة يحصر أوراقها فيها", () => {
    const list = selectVolunteers(ROWS, spec({ committees: ["2"] }), TODAY);
    expect(planSheets(list, spec({ split: "committee", committees: ["2"] }), C).map((s) => s.name)).toEqual(["لجنة التصوير"]);
  });
  it("ورقةٌ لكلّ جنس، والخاليةُ لا تُكتب", () => {
    expect(planSheets(ROWS, spec({ split: "gender" }), C).map((s) => s.name)).toEqual(["إناث", "ذكور", "الجنس غير محدّد"]);
    expect(planSheets([noor], spec({ split: "gender" }), C).map((s) => s.name)).toEqual(["إناث"]);
  });
});

describe("exportLine و exportFileName", () => {
  it("العددُ بصيغته العربيّة", () => {
    expect(exportLine(0, 0)).toBe("لا أحد يطابق اختيارك");
    expect(exportLine(1, 1)).toBe("سيخرج متطوّعٌ واحد في ورقة واحدة");
    expect(exportLine(2, 2)).toBe("سيخرج متطوّعان في ورقتين");
    expect(exportLine(42, 9)).toBe("سيخرج 42 متطوّعًا في 9 أوراق");
  });
  it("الاسمُ يقول ما فيه وتاريخَه", () => {
    expect(exportFileName(spec(), C, TODAY)).toBe("متطوّعو أدِيب، 2026-11-24.xlsx");
    expect(exportFileName(spec({ scope: "picked", committees: ["1"], genders: ["female"], split: "committee" }), C, TODAY))
      .toBe("متطوّعو أدِيب، المحدَّدون، لجنة التأليف، إناث، بحسب اللجان، 2026-11-24.xlsx");
  });
});

describe("buildVolunteersFile", () => {
  it("لا ملفَّ لاختيارٍ لا يطابقه أحد، ولا لمدّةٍ مقلوبة", () => {
    expect(buildVolunteersFile(ROWS, C, spec({ genders: ["male"], committees: ["3"], ranks: [1] }), TODAY).ok).toBe(false);
    expect(buildVolunteersFile(ROWS, C, spec({ since: "range", from: "2026-11-10", to: "2026-11-01" }), TODAY)).toEqual({ ok: false, message: "بدايةُ المدّة بعد نهايتها." });
  });
  it("ملفٌّ بأوراقه واسمه", () => {
    const f = buildVolunteersFile(ROWS, C, spec({ split: "gender" }), TODAY);
    expect(f.ok && f.count).toBe(5);
    expect(f.ok && f.sheets).toEqual(["إناث", "ذكور", "الجنس غير محدّد"]);
    expect(f.ok && f.bytes.readUInt32LE(0)).toBe(0x04034b50);
  });
});
