import { describe, expect, it } from "vitest";
import { act, advance, initialState, play, person, viewFor, type SimState } from "../engine";

/** المحاكي يمرّ بالدورة كلِّها، والأحكامُ من دالّة الحساب الحقيقيّة. */
const run = (st: SimState, n: number) => Array.from({ length: n }).reduce<SimState>((s) => advance(s), st);

describe("محاكي تقييم القيادات", () => {
  it("قبل الموعد لا يرى أحدٌ بابًا للتقييم", () => {
    const st = initialState();
    const v = viewFor(st, "abeer");
    expect(v.canRate || v.hasResults).toBe(false);
  });

  it("الفتح: لقطةٌ واستثناءُ من عُيّن قبل أربعة أسابيع، وإشعارٌ لكلّ مقيِّم", () => {
    const st = advance(initialState());
    const jood = st.targets.find((t) => t.userId === "jood")!;
    expect(jood.excluded).toBe("recent");
    expect(st.electorate.some((e) => e.target === jood.id)).toBe(false);
    const abeer = viewFor(st, "abeer");
    // عبير في لجنة التصوير: تقيّم قائدَها ونائبتَها ومنسّقَ قسمها
    expect(abeer.sheets.map((s) => s.full_name).sort()).toEqual(["ريم سعد العتيبي", "عبد الرحمن خالد الشيخ", "فيصل محمد الحمد"].sort());
    expect(abeer.notes[0].title).toContain("تقييمٌ مفتوح");
  });

  it("من تُقمِّص يقيّم بيده، وورقتُه تُحسب", () => {
    let st = play(advance(initialState()), "abeer");
    const t = viewFor(st, "abeer").sheets.find((s) => !s.done)!;
    const r = act(st, { kind: "submit", as: "abeer", targetId: t.target_id, part: t.part, scores: [5, 5, 5, 5, 5, 5, 5] });
    expect(r.res.ok).toBe(true);
    st = r.st;
    expect(viewFor(st, "abeer").sheets.find((s) => s.target_id === t.target_id)!.done).toBe(true);
    expect(act(st, { kind: "submit", as: "abeer", targetId: t.target_id, part: t.part, scores: [5, 5, 5, 5, 5, 5, 5] }).res.ok).toBe(false);
  });

  it("«كلُّ الحالات»: استبعادٌ يعود إلى لجنته، ومنسّقٌ ينتظر لجنة، ونصابٌ يسقط", () => {
    let st = run(initialState(), 4);
    const by = (id: string) => st.targets.find((t) => t.userId === id)!;
    expect(by("sultan").record!.verdict).toBe("removed");
    expect(by("sultan").returnedTo).toBe(21);
    expect(person(st, "sultan").seats.filter((s) => s.active).map((s) => s.role)).toEqual(["committee_member"]);
    expect(by("faisal").awaiting).toBe(true);
    expect(by("noura").record!.branch).toBe("council_only");
    expect(viewFor(st, "sultan").hasResults).toBe(true);
    expect(viewFor(st, "sara").notes.some((n) => n.kind === "evaluation.awaiting_return")).toBe(true);
    // قائدةُ الجودة ترى النتائج ولا تصحّح
    expect(act(st, { kind: "chooseReturn", as: "mashael", targetId: by("faisal").id, committeeId: 11 }).res.ok).toBe(false);
    st = act(st, { kind: "chooseReturn", as: "sara", targetId: by("faisal").id, committeeId: 11 }).st;
    expect(by("faisal").removedAt).not.toBeNull();
    expect(person(st, "faisal").seats.some((s) => s.active && s.role === "committee_member" && s.committee === 11)).toBe(true);
  });
});
