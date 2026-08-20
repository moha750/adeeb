import { beforeEach, describe, expect, it } from "vitest";
import { STATEMENT_MAX, STATEMENT_MIN } from "@/app/dashboard/elections/vocab";
import {
  appointToSeat, cancelElection, castVote, createElection, declareWinner, finalizeConfidence,
  openVoting, resolveDepartmentWinners, restoreCandidacy, reviewCandidate, setDeadline,
  submitCandidacy, sweep, targetLabel, topCandidate, transitionElection, withdrawCandidacy,
} from "../rules";
import { scenarioOf } from "../scenarios";
import {
  candidateWeight, choiceWeight, emptyWorld, isConfidence, memberIn, shiftWorld, voteWeight,
  type SimWorld,
} from "../world";

/**
 * **محرّكُ المحاكي يُقاس** — كلُّ دالّةٍ فيه منقولةٌ عن نظيرتها في القاعدة حارسًا حارسًا،
 * ورسائلُ الرفض بنصّها العربيّ كما ترفعه هناك. فهذا الملفّ يمسّ كلَّ حارسٍ يُخشى سقوطُه
 * عند التعديل: من غيّر قاعدةً في القاعدة وجب أن يسقط ههنا سطرٌ يقول ماذا تغيّر.
 *
 * وليس مُعايِرًا للقاعدة نفسِها: لا اتّصالَ ولا استعلام. يقيس **المحرّك في الذاكرة** وحده،
 * وسلامةُ نقله عن القاعدة تبقى مسؤوليّةَ قارئٍ يقارن `@db` بأصلها.
 */

const NOW = Date.UTC(2026, 7, 16, 9, 0, 0);
const DAY = 86_400_000;
const PITCH = "ب".repeat(150); // بيانٌ فوق الحدّ الأدنى
const iso = (ms: number) => new Date(ms).toISOString();

const w0 = () => emptyWorld(NOW);
const load = (key: string) => scenarioOf(key).build(NOW);

/** مقعدُ قيادةِ لجنةِ الرواة (١١) مفتوحُ الترشّح — أشيعُ حالٍ في النظام. */
function openSeat(w: SimWorld = w0()): { w: SimWorld; id: string } {
  const r = createElection(w, "u-hrlead", { roleName: "committee_leader", committeeId: 11, candidacyEndIso: iso(NOW + 3 * DAY) });
  expect(r.ok, r.message).toBe(true);
  return { w, id: r.id! };
}

/* ══ فتحُ انتخاب ═════════════════════════════════════════════════════ */

describe("createElection", () => {
  it("يفتح مقعدًا شاغرًا لمن يملك إدارة الانتخابات", () => {
    const { w, id } = openSeat();
    const e = w.elections.find((x) => x.id === id)!;
    expect(e.status).toBe("candidacy_open");
    expect(e.targetCommitteeId).toBe(11);
    expect(w.log.some((r) => r.event === "election_created" && r.electionId === id)).toBe(true);
    expect(w.notices.length).toBe(1); // يُبلَّغ الناخبون
  });

  it("يردّ من لا يملك الإدارة", () => {
    // عضوُ الموارد مطّلِعٌ للقراءة: يرى الغرفة ولا يصرّف فيها
    const r = createElection(w0(), "u-hrmem", { roleName: "committee_leader", committeeId: 11 });
    expect(r).toEqual({ ok: false, message: "لا تملك صلاحية إدارة الانتخابات." });
  });

  // مطابقةُ `elections_scope_check`: لكلّ مقعدٍ مستواه، ولا يُخلط قسمٌ بلجنة
  it("مقعدُ القسم يلزمه قسمٌ ويُمنع منه اسمُ لجنة", () => {
    expect(createElection(w0(), "u-hrlead", { roleName: "department_head" }).message).toBe("اختر القسم المستهدَف.");
    expect(createElection(w0(), "u-hrlead", { roleName: "department_head", departmentId: 1, committeeId: 11 }).message)
      .toBe("منسّق القسم يُنتخَب على مستوى القسم لا اللجنة.");
  });

  it("مقعدا اللجنة يلزمهما لجنةٌ ويُمنعان من اسم قسم", () => {
    expect(createElection(w0(), "u-hrlead", { roleName: "committee_leader" }).message).toBe("اختر اللجنة المستهدَفة.");
    expect(createElection(w0(), "u-hrlead", { roleName: "deputy_committee_leader", committeeId: 11, departmentId: 1 }).message)
      .toBe("هذا المنصب يُنتخَب على مستوى اللجنة لا القسم.");
  });

  it("يردّ منصبًا ليس من المقاعد الثلاثة المنتخَبة", () => {
    expect(createElection(w0(), "u-hrlead", { roleName: "committee_member", committeeId: 11 }).message)
      .toBe("منصبٌ غير قابل للانتخاب.");
  });

  // `enforce_vacant_target` — لا انتخابَ لمقعدٍ له شاغلٌ نشط (لجنة ١٢ يقودها طلال)
  it("يردّ مقعدًا مشغولًا", () => {
    const r = createElection(w0(), "u-hrlead", { roleName: "committee_leader", committeeId: 12 });
    expect(r.ok).toBe(false);
    expect(r.message).toContain("منصب مشغول");
  });

  // `elections_active_*_uniq` — مقعدٌ واحدٌ حيٌّ لكلّ منصب
  it("يردّ مقعدًا له انتخابٌ حيٌّ بالفعل", () => {
    const { w } = openSeat();
    expect(createElection(w, "u-hrlead", { roleName: "committee_leader", committeeId: 11 }).message)
      .toBe("يوجد انتخابٌ نشطٌ لهذا المنصب بالفعل.");
  });

  // والمؤرشفُ لا يزاحم: مقعدُ الدورة الماضية لا يمنع دورةً جديدة
  it("لا يمنعه انتخابٌ مؤرشف", () => {
    const w = load("archive"); // فيه مقعدُ نيابةٍ ملغًى ومؤرشف للجنة ١١
    const r = createElection(w, "u-hrlead", { roleName: "deputy_committee_leader", committeeId: 11 });
    expect(r.ok, r.message).toBe(true);
  });
});

/* ══ الترشّح ═════════════════════════════════════════════════════════ */

describe("submitCandidacy", () => {
  it("يقبل ترشّحَ عضو اللجنة ويجعله قيد المراجعة", () => {
    const { w, id } = openSeat();
    const r = submitCandidacy(w, "u-m1", id, PITCH, null);
    expect(r.ok, r.message).toBe(true);
    const c = w.candidates.find((x) => x.id === r.id)!;
    expect(c.status).toBe("pending");
    expect(c.number).toBe(1);
    expect(c.preferenceRank).toBe(1);
  });

  it("يرقّم المرشّحين بالتوالي", () => {
    const { w, id } = openSeat();
    submitCandidacy(w, "u-m1", id, PITCH, null);
    submitCandidacy(w, "u-m2", id, PITCH, null);
    expect(w.candidates.map((c) => c.number)).toEqual([1, 2]);
  });

  // حدّا البيان يُفحصان **قبل** الأهليّة، كما يفعل التريغر في القاعدة
  it("يردّ البيانَ دون المئة وفوق الأربعة آلاف", () => {
    const { w, id } = openSeat();
    expect(submitCandidacy(w, "u-m1", id, "ب".repeat(STATEMENT_MIN - 1), null).message)
      .toContain("قصيرٌ جدًّا");
    expect(submitCandidacy(w, "u-m1", id, "ب".repeat(STATEMENT_MAX + 1), null).message)
      .toContain("طويلٌ جدًّا");
    expect(w.candidates.length).toBe(0);
  });

  it("يقلّم البيان قبل وزنه", () => {
    const { w, id } = openSeat();
    expect(submitCandidacy(w, "u-m1", id, `   ${"ب".repeat(STATEMENT_MIN - 1)}   `, null).message)
      .toContain("قصيرٌ جدًّا");
  });

  it("يردّ غيرَ المؤهّل", () => {
    const { w, id } = openSeat();
    // مستشارُ الرئيس مجلسٌ إداريّ: لا يترشّح البتّة (البند أ)
    expect(submitCandidacy(w, "u-advisor", id, PITCH, null).message).toBe("غير مؤهل للترشح في هذا الانتخاب");
    // ويوسفُ من لجنةٍ أخرى: خارجَ النطاق (البند ب)
    expect(submitCandidacy(w, "u-m7", id, PITCH, null).message).toBe("غير مؤهل للترشح في هذا الانتخاب");
  });

  it("لا ترشّحَ مرّتين في المقعد نفسِه", () => {
    const { w, id } = openSeat();
    submitCandidacy(w, "u-m1", id, PITCH, null);
    expect(submitCandidacy(w, "u-m1", id, PITCH, null).message).toBe("غير مؤهل للترشح في هذا الانتخاب");
  });

  /**
   * `clear_stall_on_candidacy` — **الترشّحُ يرفع الوقوف**: المقعدُ الذي وقف لخلوّه يعود إلى
   * مساره بأوّل متقدّم، ويُرفع معه الموعدُ الماضي فلا تُغلقه الكنّاسةُ من فورها.
   */
  it("ترشّحٌ جديدٌ يرفع وسمَ الوقوف والموعدَ الماضي معًا", () => {
    const w = load("stalled"); // مقعدُ قيادةِ لجنة التصوير (٢١) واقفٌ بلا مرشّح
    const e = w.elections.find((x) => x.id === "e-lead-12")!;
    expect(e.stalledAt).not.toBeNull();

    const r = submitCandidacy(w, "u-m7", e.id, PITCH, null);
    expect(r.ok, r.message).toBe(true);
    expect(e.stalledAt).toBeNull();
    expect(e.candidacyEnd).toBeNull();
    expect(w.log.some((x) => x.event === "stall_cleared_by_candidacy")).toBe(true);
  });
});

describe("withdrawCandidacy و restoreCandidacy", () => {
  it("المرشّحُ يسحب ترشّحه ما دام بابُ الترشّح قائمًا", () => {
    const { w, id } = openSeat();
    const c = submitCandidacy(w, "u-m1", id, PITCH, null).id!;
    expect(withdrawCandidacy(w, "u-m1", c).ok).toBe(true);
    expect(w.candidates[0].status).toBe("withdrawn");
    expect(w.candidates[0].withdrawnAt).toBe(NOW);
  });

  it("لا انسحابَ نيابةً عن غيره إلّا لمدير", () => {
    const { w, id } = openSeat();
    const c = submitCandidacy(w, "u-m1", id, PITCH, null).id!;
    expect(withdrawCandidacy(w, "u-m2", c).message).toBe("لا يمكن الانسحاب نيابة عن مرشح آخر");
    expect(withdrawCandidacy(w, "u-hrlead", c).ok).toBe(true);
  });

  it("لا انسحابَ بعد فتح التصويت", () => {
    const w = load("self_candidate"); // تصويتٌ جارٍ وثلاثةُ معتمَدين
    const c = w.candidates[0];
    expect(withdrawCandidacy(w, c.userId, c.id).message).toBe("لا يمكن الانسحاب بعد فتح التصويت");
  });

  it("المدير يُرجع المنسحبَ إلى المراجعة ما دام البابُ قائمًا", () => {
    const w = load("review");
    const gone = w.candidates.find((c) => c.status === "withdrawn")!;
    expect(restoreCandidacy(w, "u-hrlead", gone.id).ok).toBe(true);
    expect(gone.status).toBe("pending");
    expect(gone.withdrawnAt).toBeNull();
  });

  it("لا يُرجَع إلّا منسحب، ولا يُرجعه غيرُ مدير", () => {
    const w = load("review");
    const gone = w.candidates.find((c) => c.status === "withdrawn")!;
    const live = w.candidates.find((c) => c.status === "pending")!;
    expect(restoreCandidacy(w, "u-m1", gone.id).message).toBe("غير مصرح بإرجاع المرشحين");
    expect(restoreCandidacy(w, "u-hrlead", live.id).message).toBe("هذا الترشح ليس منسحبا");
  });
});

describe("reviewCandidate", () => {
  let w: SimWorld;
  let pending: string;
  beforeEach(() => {
    w = load("review");
    pending = w.candidates.find((c) => c.status === "pending")!.id;
  });

  // السببُ إلزاميٌّ للرفض وطلب التعديل — يفرضه التريغر، ويُفحص **قبل** القدرة
  it("لا رفضَ ولا طلبَ تعديلٍ بلا سبب", () => {
    expect(reviewCandidate(w, "u-hrlead", pending, "rejected").message).toBe("اكتب سبب الرفض أو التعديل.");
    expect(reviewCandidate(w, "u-hrlead", pending, "needs_edit", "   ").message).toBe("اكتب سبب الرفض أو التعديل.");
    expect(reviewCandidate(w, "u-hrlead", pending, "approved").ok).toBe(true); // والاعتمادُ بلا سبب
  });

  it("لا يراجع إلّا مديرُ الانتخابات", () => {
    expect(reviewCandidate(w, "u-hrmem", pending, "approved").message).toBe("غير مصرح بمراجعة المرشحين");
    expect(reviewCandidate(w, "u-m1", pending, "approved").message).toBe("غير مصرح بمراجعة المرشحين");
  });

  it("الاعتمادُ يختم الحكمَ بصاحبه ووقته", () => {
    reviewCandidate(w, "u-hrlead", pending, "approved");
    const c = w.candidates.find((x) => x.id === pending)!;
    expect(c.status).toBe("approved");
    expect(c.reviewedBy).toBe("u-hrlead");
    expect(c.reviewedAt).toBe(NOW);
  });

  // `enforce_candidate_status_transition` — «يحتاج تعديلًا» يُعتمَد أو يُرفَض، والمعتمَدُ لا يُنقَض
  it("انتقالُ المراجعة محدود: المعتمَدُ والمرفوضُ والمنسحبُ نهايات", () => {
    const approved = w.candidates.find((c) => c.status === "approved")!;
    const needsEdit = w.candidates.find((c) => c.status === "needs_edit")!;
    const rejected = w.candidates.find((c) => c.status === "rejected")!;

    expect(reviewCandidate(w, "u-hrlead", approved.id, "rejected", "سبب").message)
      .toBe("انتقال مرشح غير مسموح: approved → rejected");
    expect(reviewCandidate(w, "u-hrlead", rejected.id, "approved").message)
      .toBe("انتقال مرشح غير مسموح: rejected → approved");
    expect(reviewCandidate(w, "u-hrlead", needsEdit.id, "approved").ok).toBe(true);
  });
});

/* ══ دورةُ الحياة ════════════════════════════════════════════════════ */

describe("transitionElection", () => {
  // **الآلةُ لا تُعدِم**: بابٌ خالٍ لا يُغلق، يقف وينادي صاحبَ القرار
  it("لا يُغلق بابُ ترشّحٍ لا مرشّحَ فيه", () => {
    const { w, id } = openSeat();
    expect(transitionElection(w, "u-hrlead", id, "candidacy_closed").message)
      .toBe("لا يمكن إغلاق باب الترشح ولا مرشّح فيه؛ مدِّد المهلة أو كلِّف شاغلًا أو ألغِ الانتخاب.");
  });

  it("يُغلق البابُ إن كان فيه مرشّحٌ حيّ", () => {
    const { w, id } = openSeat();
    submitCandidacy(w, "u-m1", id, PITCH, null);
    expect(transitionElection(w, "u-hrlead", id, "candidacy_closed").ok).toBe(true);
    expect(w.elections[0].status).toBe("candidacy_closed");
  });

  it("لا يفتح التصويتُ إلّا من ترشّحٍ مغلق", () => {
    const { w, id } = openSeat();
    submitCandidacy(w, "u-m1", id, PITCH, null);
    expect(transitionElection(w, "u-hrlead", id, "voting_open", iso(NOW + DAY)).message)
      .toBe("انتقال غير مسموح للحالة: candidacy_open → voting_open");
  });

  // `promote_to_voting_check` — لا يُفتح الصندوقُ وفي الغرفة ورقةٌ لم يُحكَم فيها
  it("لا يفتح التصويتُ وفي المقعد مرشّحٌ لم يُراجَع", () => {
    const { w, id } = openSeat();
    submitCandidacy(w, "u-m1", id, PITCH, null);
    submitCandidacy(w, "u-m2", id, PITCH, null);
    reviewCandidate(w, "u-hrlead", w.candidates[0].id, "approved");
    transitionElection(w, "u-hrlead", id, "candidacy_closed");
    expect(transitionElection(w, "u-hrlead", id, "voting_open", iso(NOW + DAY)).message)
      .toBe("لا يمكن فتح التصويت: يوجد 1 مرشحاً قيد المراجعة");
  });

  it("ولا يفتح ولا معتمَدَ واحد", () => {
    const { w, id } = openSeat();
    submitCandidacy(w, "u-m1", id, PITCH, null);
    reviewCandidate(w, "u-hrlead", w.candidates[0].id, "rejected", "سببٌ مكتوب");
    // بقي مرشّحٌ نشطٌ؟ لا — فيلزم مرشّحٌ آخر لإغلاق الباب
    submitCandidacy(w, "u-m2", id, PITCH, null);
    reviewCandidate(w, "u-hrlead", w.candidates[1].id, "rejected", "سببٌ مكتوب");
    expect(transitionElection(w, "u-hrlead", id, "candidacy_closed").ok).toBe(false);
  });

  it("openVoting يشترط موعدًا في المستقبل", () => {
    const { w, id } = openSeat();
    submitCandidacy(w, "u-m1", id, PITCH, null);
    reviewCandidate(w, "u-hrlead", w.candidates[0].id, "approved");
    transitionElection(w, "u-hrlead", id, "candidacy_closed");

    expect(openVoting(w, "u-hrlead", id, iso(NOW - DAY)).message).toBe("اختر موعد إغلاق تصويتٍ في المستقبل.");
    expect(openVoting(w, "u-hrlead", id, iso(NOW + DAY)).ok).toBe(true);
    expect(w.elections[0].status).toBe("voting_open");
    expect(w.elections[0].votingOpenedAt).toBe(NOW);
  });

  // إعادةُ فتح الترشّح ترفع الموعد فيُغلق بيدٍ أو بموعدٍ جديد
  it("إعادةُ فتح الترشّح ترفع الموعد والوقوف", () => {
    const { w, id } = openSeat();
    submitCandidacy(w, "u-m1", id, PITCH, null);
    transitionElection(w, "u-hrlead", id, "candidacy_closed");
    const r = transitionElection(w, "u-hrlead", id, "candidacy_open");
    expect(r.ok).toBe(true);
    expect(w.elections[0].candidacyEnd).toBeNull();
    expect(w.elections[0].stalledAt).toBeNull();
  });

  it("لا يصرّف في الحالة إلّا مديرٌ", () => {
    const { w, id } = openSeat();
    expect(transitionElection(w, "u-m1", id, "candidacy_closed").message).toBe("غير مصرح بتغيير حالة الانتخاب");
  });
});

describe("setDeadline", () => {
  it("موعدُ الترشّح يرفع وسمَ الوقوف", () => {
    const w = load("stalled");
    const r = setDeadline(w, "u-hrlead", "e-lead-12", iso(NOW + 5 * DAY));
    expect(r.ok, r.message).toBe(true);
    expect(w.elections[0].stalledAt).toBeNull();
    expect(w.elections[0].candidacyEnd).toBe(NOW + 5 * DAY);
  });

  it("يردّ موعدًا في الماضي وموعدًا فاسدًا", () => {
    const w = load("stalled");
    expect(setDeadline(w, "u-hrlead", "e-lead-12", iso(NOW - DAY)).message).toBe("اختر موعدًا في المستقبل.");
    expect(setDeadline(w, "u-hrlead", "e-lead-12", "لا شيء").message).toBe("موعدٌ غير صالح.");
  });

  it("لا موعدَ إلّا لبابٍ مفتوح", () => {
    const w = load("declare_winner"); // تصويتٌ مغلق
    expect(setDeadline(w, "u-hrlead", "e-lead-11", iso(NOW + DAY)).message)
      .toBe("لا موعدَ إلّا لبابٍ مفتوح (ترشّحًا أو تصويتًا).");
  });

  it("الفارغُ يرفع الموعدَ فيُغلق البابُ بيدك", () => {
    const { w, id } = openSeat();
    const r = setDeadline(w, "u-hrlead", id, null);
    expect(r.ok).toBe(true);
    expect(r.message).toContain("فيُغلق بيدك");
    expect(w.elections[0].candidacyEnd).toBeNull();
  });
});

/* ══ التصويت ═════════════════════════════════════════════════════════ */

describe("castVote", () => {
  it("يسجّل الصوتَ بوزن صاحبه ولقطةِ رتبته", () => {
    const w = load("self_candidate");
    const target = w.candidates.find((c) => c.userId !== "u-m4")!;
    const r = castVote(w, "u-m4", "e-lead-11", target.id);
    expect(r.ok, r.message).toBe(true);
    const v = w.votes.at(-1)!;
    expect(v.weight).toBe(1);
    expect(v.roleSnapshot).toBe("committee_member");
    expect(v.choice).toBe("approve");
  });

  it("وزنُ الإداريّ الأعلى أربعةٌ وهو ناخبٌ في كلّ مقعد", () => {
    const w = load("self_candidate");
    const target = w.candidates[0];
    expect(castVote(w, "u-advisor", "e-lead-11", target.id).ok).toBe(true);
    expect(w.votes.at(-1)!.weight).toBe(4);
  });

  // البطاقةُ تُختَم مرّةً — «بطاقتُك في هذا المقعد مختومةٌ، ولا يُعاد الصوت»
  it("لا صوتَ ثانٍ في المقعد نفسِه", () => {
    const w = load("self_candidate");
    const [a, b] = w.candidates;
    expect(castVote(w, "u-m4", "e-lead-11", a.id).ok).toBe(true);
    expect(castVote(w, "u-m4", "e-lead-11", b.id).message).toBe("بطاقتُك في هذا المقعد مختومةٌ، ولا يُعاد الصوت");
    expect(w.votes.filter((v) => v.voterId === "u-m4").length).toBe(1);
  });

  // اللائحةُ تمنعك أن تزكّي نفسَك، والورقةُ تُعلَّم ولا تُختار
  it("لا يصوّت المرشّحُ لنفسه", () => {
    const w = load("self_candidate");
    const mine = w.candidates.find((c) => c.userId === "u-m1")!;
    expect(castVote(w, "u-m1", "e-lead-11", mine.id).message).toBe("لا يمكنك التصويت لنفسك");
  });

  it("ويبقى له أن يختار منافسًا", () => {
    const w = load("self_candidate");
    const rival = w.candidates.find((c) => c.userId === "u-m2")!;
    expect(castVote(w, "u-m1", "e-lead-11", rival.id).ok).toBe(true);
  });

  it("لا يصوّت من ليس من ناخبي المقعد", () => {
    const w = load("self_candidate");
    // يوسفُ من لجنة التصوير، والمقعدُ لجنةُ الرواة
    expect(castVote(w, "u-m7", "e-lead-11", w.candidates[0].id).message).toBe("غير مؤهل للتصويت في هذا الانتخاب");
  });

  // **الاعتراضُ رأيٌ في تزكيةٍ لا في تنافس**: حيث المرشّحون أكثرُ من واحدٍ لا معنى له
  it("لا اعتراضَ إلّا في تزكيةِ مرشّحٍ وحيد", () => {
    const many = load("self_candidate"); // ثلاثةُ معتمَدين
    expect(castVote(many, "u-m4", "e-lead-11", many.candidates[0].id, "reject").message)
      .toBe("الاعتراض لا يكون إلّا في تزكية مرشّحٍ وحيد");

    const one = load("confidence"); // معتمَدٌ واحد
    const c = one.candidates.find((x) => x.status === "approved")!;
    expect(castVote(one, "u-m4", "e-dep-11", c.id, "reject").ok).toBe(true);
  });

  it("لا صوتَ على مرشّحٍ غيرِ معتمَد ولا على مرشّحِ مقعدٍ آخر", () => {
    const w = load("confidence");
    const rejected = w.candidates.find((c) => c.status === "rejected")!;
    expect(castVote(w, "u-m4", "e-dep-11", rejected.id).message).toBe("المرشح غير صالح في هذا الانتخاب");
    expect(castVote(w, "u-m4", "e-dep-11", null).message).toBe("لا مرشّحَ في بطاقتك");
  });

  it("لا صوتَ وبابُ التصويت مغلق", () => {
    const w = load("declare_winner"); // صندوقٌ أُغلق، و«ريم التنفيذيّة» لم تختم بطاقتها فيه
    expect(castVote(w, "u-exec", "e-lead-11", w.candidates[0].id).message).toBe("التصويت غير مفتوح");
  });

  /**
   * **وترتيبُ الحرّاس نفسُه منقول** عن `cast_vote` وتريغرها: البطاقةُ المختومة تُردّ **قبل**
   * أن يُسأل أمفتوحٌ البابُ أم لا. فمن ختم ثمّ أُغلق الصندوقُ يُقال له «بطاقتك مختومة»
   * لا «التصويت غير مفتوح» — وهو الأصدقُ بحاله. ولو انقلب الترتيبُ يومًا سقط هذا السطر.
   */
  it("ختمُ البطاقة يُقال قبل إغلاق الباب", () => {
    const w = load("declare_winner"); // «سارة» ختمت بطاقتها قبل أن يُغلق الصندوق
    expect(castVote(w, "u-m4", "e-lead-11", w.candidates[0].id).message)
      .toBe("بطاقتُك في هذا المقعد مختومةٌ، ولا يُعاد الصوت");
  });
});

/* ══ التزكية ═════════════════════════════════════════════════════════ */

describe("finalizeConfidence", () => {
  /**
   * `_finalize_confidence` — التزكيةُ رأيٌ لا اختيار: إن لم يغلب التأييدُ الاعتراضَ عند
   * إغلاق التصويت **أُلغي الانتخابُ من نفسه** بسببٍ مسجَّل، وبقي المقعدُ شاغرًا.
   */
  it("تسقط التزكيةُ إن لم يغلب التأييدُ عند إغلاق التصويت", () => {
    const w = load("confidence_falling"); // تأييدٌ ١ مقابل اعتراضٍ ٦
    expect(isConfidence(w, "e-dep-11")).toBe(true);
    expect(choiceWeight(w, "e-dep-11", "approve")).toBeLessThan(choiceWeight(w, "e-dep-11", "reject"));

    expect(transitionElection(w, "u-hrlead", "e-dep-11", "voting_closed").ok).toBe(true);
    const e = w.elections[0];
    expect(e.status).toBe("cancelled");
    expect(e.cancelReason).toContain("سقطت التزكية");
    expect(e.archivedAt).not.toBeNull();
    expect(w.log.some((r) => r.event === "confidence_failed")).toBe(true);
  });

  it("ولا تسقط إن غلب التأييد", () => {
    const w = load("confidence_falling");
    // يؤيّد الرئيسُ (٤) وقائدةُ الموارد (٣٫٥) فيغلب التأييدُ الاعتراضَ
    const c = w.candidates.find((x) => x.status === "approved")!;
    castVote(w, "u-pres2" as string, "e-dep-11", c.id); // ناخبٌ لا وجودَ له: يُردّ فلا يبدّل شيئًا
    castVote(w, "u-hrlead", "e-dep-11", c.id);
    castVote(w, "u-exec", "e-dep-11", c.id);
    transitionElection(w, "u-hrlead", "e-dep-11", "voting_closed");
    expect(w.elections[0].status).toBe("voting_closed");
  });

  it("لا تُطبَّق على تنافسٍ ولا على صندوقٍ مفتوح", () => {
    const many = load("self_candidate");
    expect(finalizeConfidence(many, null, "e-lead-11")).toBe(false); // مفتوحٌ بعد
    const one = load("confidence");
    expect(finalizeConfidence(one, null, "e-dep-11")).toBe(false); // تصويتٌ جارٍ
  });
});

/* ══ الإعلان والحسم ══════════════════════════════════════════════════ */

describe("declareWinner", () => {
  it("يُعلَن المتصدّرُ فيُسنَد المنصبُ ويُقفَل المقعد", () => {
    const w = load("declare_winner");
    const top = topCandidate(w, "e-lead-11")!;
    expect(top.userId).toBe("u-m2"); // نورة: أعلى وزنًا وأعلى عددًا معًا

    const r = declareWinner(w, "u-hrlead", "e-lead-11", top.id);
    expect(r.ok, r.message).toBe(true);

    const e = w.elections[0];
    expect(e.status).toBe("completed");
    expect(e.winnerCandidateId).toBe(top.id);
    expect(e.archivedAt).toBe(NOW);
    expect(w.assignments).toHaveLength(1);
    expect(w.assignments[0]).toMatchObject({ userId: "u-m2", roleName: "committee_leader", committeeId: 11 });
    // ومنصبُه الجديد يعلو منصبَه القديم في هذا العالم، فيتغيّر وزنُه من فوره
    expect(memberIn(w, "u-m2")!.roleName).toBe("committee_leader");
    expect(voteWeight(w, "u-m2")).toBe(2);
  });

  // `enforce_winner_declaration` — القاعدةُ تعرف المتصدّر، فالشريطُ يحمل زرًّا واحدًا باسمه
  it("لا يُعلَن من ليس صاحبَ أعلى الأصوات", () => {
    const w = load("declare_winner");
    const loser = w.candidates.find((c) => c.userId === "u-m3")!;
    expect(declareWinner(w, "u-hrlead", "e-lead-11", loser.id).message).toBe("الفائز المعلن ليس صاحب أعلى الأصوات");
    expect(w.assignments).toHaveLength(0);
  });

  it("ولا يُعلَن مرّتين", () => {
    const w = load("declare_winner");
    const top = topCandidate(w, "e-lead-11")!;
    declareWinner(w, "u-hrlead", "e-lead-11", top.id);
    expect(declareWinner(w, "u-hrlead", "e-lead-11", top.id).message).toBe("الانتخاب مؤرشف");
  });

  it("ولا يُعلَن قبل إغلاق التصويت", () => {
    const w = load("self_candidate");
    expect(declareWinner(w, "u-hrlead", "e-lead-11", w.candidates[0].id).message)
      .toBe("يجب أن يكون التصويت مغلقاً قبل إعلان الفائز");
  });

  it("ولا يُعلنه غيرُ مدير", () => {
    const w = load("declare_winner");
    expect(declareWinner(w, "u-m1", "e-lead-11", w.candidates[0].id).message).toBe("غير مصرح بإعلان الفائز");
  });

  /**
   * **الحارسُ الأهمّ**: لا إعلانَ منفردًا ما دام في القسم مقعدٌ حيٌّ يخوضه أحدُ مرشّحيك —
   * فقد يفوز بالاثنين والمفضَّلُ لا يُعرَف بعد. والشاشةُ تقول لك ما تفعله.
   */
  it("يُحجَب الإعلانُ المنفردُ إن شارك مرشّحُك مقعدًا حيًّا في القسم", () => {
    const w = load("joint_blocked");
    const top = topCandidate(w, "e-lead-11")!;
    const r = declareWinner(w, "u-hrlead", "e-lead-11", top.id);
    expect(r).toEqual({ ok: false, message: "في هذا القسم مقعدٌ آخر يخوضه أحدُ مرشّحيك؛ أعلِن مقاعد القسم معًا." });
  });

  it("فإذا أُغلق المقعدُ الآخر صحّ الحسمُ الجماعيّ", () => {
    const w = load("joint_blocked");
    expect(transitionElection(w, "u-hrlead", "e-dep-11", "voting_closed").ok).toBe(true);
    expect(resolveDepartmentWinners(w, "u-hrlead", 1).ok).toBe(true);
  });
});

describe("resolveDepartmentWinners", () => {
  /**
   * `resolve_department_election_winners` — **حلقةٌ لا حالتان**: من تصدّر مقعدين أخذ مفضَّله
   * وأُقصي من الآخر فيرتقي الوصيف، وقد يتصدّر الوصيفُ مقعدًا ثالثًا فتُعاد الكرّة.
   */
  it("يحسم القسمَ كلَّه: المفضَّلُ لصاحبه والوصيفُ يرتقي", () => {
    const w = load("department_seats");
    // أحمدُ (u-m1) تصدّر التنسيقَ والقيادةَ معًا، ومفضَّلُه القيادة
    expect(candidateWeight(w, w.candidates.find((c) => c.electionId === "e-head-1" && c.userId === "u-m1")!.id)).toBe(5);

    const r = resolveDepartmentWinners(w, "u-pres", 1);
    expect(r.ok, r.message).toBe(true);
    expect(r.message).toContain("حُسم مَن تصدّر مقعدين بمفضَّله");

    const winnerOf = (id: string) => {
      const e = w.elections.find((x) => x.id === id)!;
      return w.candidates.find((c) => c.id === e.winnerCandidateId)!.userId;
    };
    expect(winnerOf("e-lead-11")).toBe("u-m1"); // مفضَّلُه
    expect(winnerOf("e-head-1")).toBe("u-m2");  // الوصيفُ ارتقى
    expect(winnerOf("e-dep-11")).toBe("u-m4");

    expect(w.elections.every((e) => e.status === "completed")).toBe(true);
    expect(w.assignments).toHaveLength(3);
    // ولا يجمع أحدٌ مقعدين
    expect(new Set(w.assignments.map((a) => a.userId)).size).toBe(3);
  });

  it("لا يحسم والقسمُ فيه مقعدٌ لم يُغلق تصويتُه ويخوضه أحدُ هؤلاء", () => {
    const w = load("joint_blocked");
    const r = resolveDepartmentWinners(w, "u-hrlead", 1);
    expect(r.ok).toBe(false);
    expect(r.message).toContain("لم يُغلق تصويتُه بعد");
  });

  it("لا يحسم قسمًا لا مقعدَ فيه جاهز", () => {
    const w = load("competition"); // ترشّحٌ مفتوح
    expect(resolveDepartmentWinners(w, "u-hrlead", 1).message)
      .toBe("لا مقاعدَ جاهزةً للإعلان في هذا القسم (أغلِق التصويت أوّلًا).");
  });

  it("ولا يحسمه غيرُ مدير", () => {
    const w = load("department_seats");
    expect(resolveDepartmentWinners(w, "u-m1", 1).message).toBe("غير مصرح بإعلان الفائز");
  });
});

/* ══ التكليف والإلغاء ════════════════════════════════════════════════ */

describe("appointToSeat", () => {
  it("يُكلِّف شاغلًا على مقعدٍ تعثّر ويوقف انتخابَه", () => {
    const w = load("stalled");
    const r = appointToSeat(w, "u-hrlead", "e-lead-12", "u-m7", "تعثّر المقعدُ ولم يتقدّم أحد");
    expect(r.ok, r.message).toBe(true);
    expect(w.assignments).toHaveLength(1);
    expect(w.assignments[0]).toMatchObject({ userId: "u-m7", roleName: "committee_leader", committeeId: 21 });
    expect(w.elections[0].status).toBe("cancelled");
    expect(w.log.some((x) => x.event === "seat_appointed")).toBe(true);
  });

  it("السببُ عشرةُ أحرفٍ فأكثر، والمكلَّفُ مسمًّى", () => {
    const w = load("stalled");
    expect(appointToSeat(w, "u-hrlead", "e-lead-12", "u-m7", "قصير").message)
      .toBe("اكتب سبب التكليف (١٠ أحرف على الأقلّ).");
    expect(appointToSeat(w, "u-hrlead", "e-lead-12", "", "سببٌ مكتوبٌ بطوله").message).toBe("اختر العضو المكلَّف.");
    expect(appointToSeat(w, "u-hrlead", "e-lead-12", "u-ghost", "سببٌ مكتوبٌ بطوله").message).toBe("العضو غير موجود");
  });

  // لا تُكلِّف والصندوقُ مفتوح: أغلِقه أوّلًا
  it("لا تكليفَ والتصويتُ جارٍ ولا على مقعدٍ اكتمل", () => {
    const voting = load("self_candidate");
    expect(appointToSeat(voting, "u-hrlead", "e-lead-11", "u-m4", "سببٌ مكتوبٌ بطوله").message)
      .toBe("لا تُكلِّف والتصويتُ جارٍ؛ أغلِق التصويت أوّلًا");

    const done = load("archive");
    expect(appointToSeat(done, "u-hrlead", "e-lead-11", "u-m4", "سببٌ مكتوبٌ بطوله").message)
      .toBe("هذا الانتخاب اكتمل بفائزٍ معلَن");
  });
});

describe("cancelElection", () => {
  it("يُلغى بسببٍ مكتوب، ويبقى المرشّحون والأصوات كما هم", () => {
    const w = load("self_candidate");
    const before = w.candidates.length;
    const r = cancelElection(w, "u-hrlead", "e-lead-11", "تغيّرت هيكلةُ اللجنة");
    expect(r.ok, r.message).toBe(true);
    expect(w.elections[0].status).toBe("cancelled");
    expect(w.elections[0].cancelReason).toBe("تغيّرت هيكلةُ اللجنة");
    expect(w.candidates.length).toBe(before);
  });

  it("لا إلغاءَ بلا سبب، ولا لمكتمل، ولا لغير مدير", () => {
    const w = load("self_candidate");
    expect(cancelElection(w, "u-hrlead", "e-lead-11", "   ").message).toBe("اكتب سبب الإلغاء.");
    expect(cancelElection(w, "u-m1", "e-lead-11", "سبب").message).toBe("غير مصرح بإلغاء الانتخاب");
    const done = load("archive");
    expect(cancelElection(done, "u-hrlead", "e-lead-11", "سبب").message).toBe("لا يمكن إلغاء انتخاب مكتمل");
  });
});

/* ══ الكنّاسة ════════════════════════════════════════════════════════ */

describe("sweep", () => {
  /**
   * `sweep_election_deadlines` — **لا تمدّد ولا تُلغي**: تُغلق ما فيه مرشّح، وتوقف ما خلا
   * فينتظر قرارَ المدير. وما لا موعدَ له لا تلمسه.
   */
  it("تُغلق ذا المرشّحين وتوقف الخالي وتُغلق التصويتَ المنقضي", () => {
    const w = load("deadlines");
    shiftWorld(w, DAY); // «مرّ يوم» إزاحةٌ للماضي لا تقديمٌ للساعة
    const r = sweep(w);

    expect(r).toEqual({ closedCandidacy: 1, stalled: 1, closedVoting: 1 });
    expect(w.elections.find((e) => e.id === "e-lead-11")!.status).toBe("candidacy_closed");
    expect(w.elections.find((e) => e.id === "e-lead-21")!.stalledAt).not.toBeNull();
    expect(w.elections.find((e) => e.id === "e-lead-21")!.status).toBe("candidacy_open"); // وقف ولم يُلغَ
    expect(w.elections.find((e) => e.id === "e-dep-11")!.status).toBe("voting_closed");
    // ومقعدٌ بلا موعدٍ لا تلمسه الكنّاسة
    expect(w.elections.find((e) => e.id === "e-head-1")!.status).toBe("candidacy_open");
  });

  it("الفاعلُ فيها «النظام» لا شخص", () => {
    const w = load("deadlines");
    shiftWorld(w, DAY);
    sweep(w);
    const auto = w.log.filter((x) => x.event === "status_transition" && x.payload.auto === true);
    expect(auto.length).toBeGreaterThan(0);
    for (const row of auto) expect(row.actorId).toBeNull();
    expect(w.log.some((x) => x.event === "sweep_deadlines" && x.electionId === null)).toBe(true);
  });

  it("لا تفعل شيئًا قبل انقضاء المواعيد", () => {
    const w = load("deadlines");
    expect(sweep(w)).toEqual({ closedCandidacy: 0, stalled: 0, closedVoting: 0 });
    expect(w.log.some((x) => x.event === "sweep_deadlines")).toBe(false);
  });

  it("وتجري مرّتين بلا أثرٍ مضاعف", () => {
    const w = load("deadlines");
    shiftWorld(w, DAY);
    sweep(w);
    expect(sweep(w)).toEqual({ closedCandidacy: 0, stalled: 0, closedVoting: 0 });
  });
});

/* ══ التسمية ═════════════════════════════════════════════════════════ */

describe("targetLabel", () => {
  // `_election_target_label` — رتبةٌ ووحدةٌ بمسافةٍ لا فاصل، كقاعدة `positionLine`
  it("رتبةُ المقعد ووحدتُه بمسافة", () => {
    const w = load("department_seats");
    expect(targetLabel(w.elections.find((e) => e.id === "e-lead-11")!)).toBe("قائد لجنة الرواة");
    expect(targetLabel(w.elections.find((e) => e.id === "e-head-1")!)).toBe("منسّق قسم صناعة المحتوى");
    expect(targetLabel(w.elections.find((e) => e.id === "e-dep-11")!)).toBe("نائب لجنة الرواة");
  });

  it("ولا فاصلَ فيها", () => {
    const w = load("department_seats");
    for (const e of w.elections) {
      for (const bad of ["·", "|", "—"]) expect(targetLabel(e)).not.toContain(bad);
    }
  });
});
