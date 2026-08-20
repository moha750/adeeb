// **مصفوفةُ التغطية** — الجوابُ المكتوب على «بكلّ حالاتها بلا استثناء».
//
// كلُّ بندٍ هنا حالةٌ أو قاعدةٌ في النظام، ومعه **مِجَسٌّ** يقول أهي قائمةٌ في العالم المعروض
// الآن، و**سيناريو** يبلغها بضغطة. فالتغطيةُ تُقرأ ولا تُدَّعى: ما لا مِجَسَّ له لا يُعَدّ مُغطًّى.
//
// وهي **حَكَمٌ لا لوحةُ عرض** منذ ٢٠٢٦-٠٨-١٦: `__tests__/coverage.test.ts` يبني عالمَ كلّ بندٍ
// من سيناريوه ويسأل مِجَسَّه في `pnpm test`. فمن أضاف بندًا لا يبلغه سيناريوه سقط عنده،
// ومن ادّعى مِجَسًّا يصدق على العالم الفارغ سقط كذلك.

import { candidateWeight, countApproved, electionDepartment, soleCandidate, type SimWorld } from "./world";
import { ACTIVE_CANDIDACY } from "./world";

export type CoverItem = {
  key: string;
  group: string;
  label: string;
  /** السيناريو الذي يبلغ هذه الحالة بضغطة. */
  scenario: string;
  /** أهي قائمةٌ في العالم المعروض الآن؟ */
  probe: (w: SimWorld) => boolean;
};

const anyElection = (w: SimWorld, f: (e: SimWorld["elections"][number]) => boolean) => w.elections.some(f);
const anyCandidate = (w: SimWorld, f: (c: SimWorld["candidates"][number]) => boolean) => w.candidates.some(f);

export const COVERAGE: CoverItem[] = [
  /* ── حالاتُ الانتخاب الستّ ─────────────────────────────────────── */
  { key: "st-co", group: "حالة الانتخاب", label: "ترشّح مفتوح", scenario: "competition", probe: (w) => anyElection(w, (e) => e.status === "candidacy_open" && !e.stalledAt) },
  { key: "st-cc", group: "حالة الانتخاب", label: "ترشّح مغلق", scenario: "all_states", probe: (w) => anyElection(w, (e) => e.status === "candidacy_closed") },
  { key: "st-vo", group: "حالة الانتخاب", label: "تصويت جارٍ", scenario: "self_candidate", probe: (w) => anyElection(w, (e) => e.status === "voting_open") },
  { key: "st-vc", group: "حالة الانتخاب", label: "تصويت مغلق", scenario: "department_seats", probe: (w) => anyElection(w, (e) => e.status === "voting_closed") },
  { key: "st-done", group: "حالة الانتخاب", label: "مكتمل بفائز", scenario: "archive", probe: (w) => anyElection(w, (e) => e.status === "completed") },
  { key: "st-cancel", group: "حالة الانتخاب", label: "ملغى بسبب", scenario: "archive", probe: (w) => anyElection(w, (e) => e.status === "cancelled") },

  /* ── الأعلامُ الأربعة ─────────────────────────────────────────── */
  { key: "fl-stall", group: "أعلام", label: "متعثّر (بانتظار قرار)", scenario: "stalled", probe: (w) => anyElection(w, (e) => !!e.stalledAt) },
  { key: "fl-conf", group: "أعلام", label: "تزكية (معتمَدٌ واحد)", scenario: "confidence", probe: (w) => anyElection(w, (e) => countApproved(w, e.id) === 1) },
  { key: "fl-arch", group: "أعلام", label: "مؤرشف", scenario: "archive", probe: (w) => anyElection(w, (e) => !!e.archivedAt) },
  { key: "fl-nodl", group: "أعلام", label: "بلا موعد (يُغلق بيدك)", scenario: "deadlines", probe: (w) => anyElection(w, (e) => e.status === "candidacy_open" && e.candidacyEnd === null) },

  /* ── حالاتُ المرشّح الخمس ─────────────────────────────────────── */
  { key: "ca-pend", group: "حالة المرشّح", label: "قيد المراجعة", scenario: "review", probe: (w) => anyCandidate(w, (c) => c.status === "pending") },
  { key: "ca-appr", group: "حالة المرشّح", label: "معتمَد", scenario: "review", probe: (w) => anyCandidate(w, (c) => c.status === "approved") },
  { key: "ca-edit", group: "حالة المرشّح", label: "يحتاج تعديلًا", scenario: "review", probe: (w) => anyCandidate(w, (c) => c.status === "needs_edit") },
  { key: "ca-rej", group: "حالة المرشّح", label: "مرفوض", scenario: "review", probe: (w) => anyCandidate(w, (c) => c.status === "rejected") },
  { key: "ca-wd", group: "حالة المرشّح", label: "منسحب", scenario: "review", probe: (w) => anyCandidate(w, (c) => c.status === "withdrawn") },

  /* ── المقاعدُ الثلاثة ─────────────────────────────────────────── */
  { key: "se-head", group: "المقعد", label: "منسّق قسم", scenario: "department_seats", probe: (w) => anyElection(w, (e) => e.targetRoleName === "department_head") },
  { key: "se-lead", group: "المقعد", label: "قائد لجنة", scenario: "competition", probe: (w) => anyElection(w, (e) => e.targetRoleName === "committee_leader") },
  { key: "se-dep", group: "المقعد", label: "نائب قائد لجنة", scenario: "confidence", probe: (w) => anyElection(w, (e) => e.targetRoleName === "deputy_committee_leader") },

  /* ── الاقتراع ────────────────────────────────────────────────── */
  { key: "vo-app", group: "الاقتراع", label: "صوتُ تأييد", scenario: "department_seats", probe: (w) => w.votes.some((v) => v.choice === "approve") },
  { key: "vo-rej", group: "الاقتراع", label: "اعتراضٌ على تزكية", scenario: "confidence_falling", probe: (w) => w.votes.some((v) => v.choice === "reject") },
  { key: "vo-self", group: "الاقتراع", label: "المرشّحُ ناخبٌ في بطاقته", scenario: "self_candidate", probe: (w) => anyElection(w, (e) => e.status === "voting_open" && anyCandidate(w, (c) => c.electionId === e.id && c.status === "approved")) },
  // والوحيدُ يرى مقعدَه ولا يفعل فيه: يُقاس بحاله لا بورقةٍ يختمها
  { key: "vo-sole", group: "الاقتراع", label: "الوحيدُ يرى مقعدَه بلا صندوق", scenario: "sole_self", probe: (w) => anyElection(w, (e) => e.status === "voting_open"
    && w.candidates.some((c) => c.electionId === e.id && c.status === "approved" && soleCandidate(w, c.userId, e.id))) },

  // الصدارةُ حالٌ تُختبَر: واحدٌ يُعلَن بزرٍّ باسمه، ومتساوون يُردّ فيهم القرارُ إلى المشرف
  { key: "vo-lead", group: "الاقتراع", label: "متصدّرٌ واحدٌ في صندوقٍ مغلق", scenario: "declare_winner", probe: (w) => anyElection(w, (e) => {
    if (e.status !== "voting_closed" || e.winnerCandidateId) return false;
    const ws = w.candidates.filter((c) => c.electionId === e.id && c.status === "approved").map((c) => candidateWeight(w, c.id));
    const top = Math.max(0, ...ws);
    return top > 0 && ws.filter((x) => x === top).length === 1;
  }) },
  { key: "vo-tie", group: "الاقتراع", label: "تعادُلٌ في الصدارة", scenario: "declare_tie", probe: (w) => anyElection(w, (e) => {
    if (e.status !== "voting_closed" || e.winnerCandidateId) return false;
    const ws = w.candidates.filter((c) => c.electionId === e.id && c.status === "approved").map((c) => candidateWeight(w, c.id));
    const top = Math.max(0, ...ws);
    return top > 0 && ws.filter((x) => x === top).length > 1;
  }) },

  /* ── القسم والحسم ────────────────────────────────────────────── */
  { key: "dp-multi", group: "القسم", label: "مقاعدُ قسمٍ متعدّدة معًا", scenario: "department_seats", probe: (w) => {
    const byDept = new Map<number, number>();
    for (const e of w.elections) {
      const d = electionDepartment(e);
      if (d === null || e.archivedAt) continue;
      byDept.set(d, (byDept.get(d) ?? 0) + 1);
    }
    return [...byDept.values()].some((n) => n > 1);
  } },
  { key: "dp-shared", group: "القسم", label: "مرشّحٌ في مقعدين من قسمٍ واحد", scenario: "department_seats", probe: (w) => {
    const seen = new Map<string, Set<string>>();
    for (const c of w.candidates) {
      if (!ACTIVE_CANDIDACY.includes(c.status)) continue;
      const e = w.elections.find((x) => x.id === c.electionId);
      if (!e) continue;
      const key = `${c.userId}:${electionDepartment(e)}`;
      seen.set(key, (seen.get(key) ?? new Set()).add(c.electionId));
    }
    return [...seen.values()].some((s) => s.size > 1);
  } },
  { key: "dp-pref", group: "القسم", label: "أفضليّةُ مقعدٍ مسجّلة", scenario: "preference", probe: (w) => w.candidates.some((c) => c.preferenceRank === 2) },
  { key: "dp-block", group: "القسم", label: "إعلانٌ منفردٌ محجوب", scenario: "joint_blocked", probe: (w) => anyElection(w, (e) => e.status === "voting_closed" && !e.winnerCandidateId) && anyElection(w, (e) => e.status === "voting_open") },

  /* ── الأثر ───────────────────────────────────────────────────── */
  { key: "ef-assign", group: "الأثر", label: "منصبٌ أُسنِد (فوزًا أو تكليفًا)", scenario: "department_seats", probe: (w) => w.assignments.length > 0 },
  { key: "ef-sweep", group: "الأثر", label: "الكنّاسةُ فعلت شيئًا", scenario: "deadlines", probe: (w) => w.log.some((r) => r.event === "sweep_deadlines") },
  { key: "ef-log", group: "الأثر", label: "سجلٌّ بفاعليه", scenario: "review", probe: (w) => w.log.length > 0 },
  { key: "ef-empty", group: "الأثر", label: "الحالاتُ الفارغة", scenario: "empty", probe: (w) => w.elections.length === 0 },
];

export const COVER_GROUPS = [...new Set(COVERAGE.map((c) => c.group))];
