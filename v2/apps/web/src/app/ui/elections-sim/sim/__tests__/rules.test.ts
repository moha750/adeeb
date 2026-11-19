import { beforeEach, describe, expect, it } from "vitest";
import { STATEMENT_MAX, STATEMENT_MIN } from "@/app/dashboard/elections/vocab";
import {
  answerFreeze, appointSeatHolder, appointToSeat, appointableMembers, approveFreeze, banFromCandidacy, cancelElection,
  castVote, chooseInTie, createElection, decideFreeze, liftCandidacyBan, openRevote, openVoting, requestFreeze,
  restoreCandidacy, reviewCandidate, setDeadline, settle, submitCandidacy, sweep, targetLabel,
  transitionElection, withdrawCandidacy,
} from "../rules";
import { scenarioOf } from "../scenarios";
import {
  activeBanOf, candidateWeight, choiceWeight, eligibleToRun, emptyWorld, isConfidence, memberIn, shiftWorld,
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
  it("يفتح مقعدًا فارغًا لمن يملك إدارة الانتخابات", () => {
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
    // الرئيسُ التنفيذيّ مجلسٌ إداريّ: لا يترشّح البتّة (البند أ)
    expect(submitCandidacy(w, "u-exec", id, PITCH, null).message).toBe("غير مؤهل للترشح في هذا الانتخاب");
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

  // السببُ إلزاميٌّ للاعتذار وطلب التعديل، ويُفحص **قبل** القدرة
  it("لا اعتذارَ ولا طلبَ تعديلٍ بلا سبب", () => {
    expect(reviewCandidate(w, "u-hrlead", pending, "rejected").message).toBe("اكتب سبب الاعتذار أو التعديل.");
    expect(reviewCandidate(w, "u-hrlead", pending, "needs_edit", "   ").message).toBe("اكتب سبب الاعتذار أو التعديل.");
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

  // المادة 14: طلبُ التعديل بمهلةٍ في المستقبل يحدّدها المراجع، والاعتذارُ بسببٍ من الثلاثة
  it("طلبُ التعديل بمهلته، والاعتذارُ بسببه", () => {
    expect(reviewCandidate(w, "u-hrlead", pending, "needs_edit", "اختصر الفقرة الأخيرة").message)
      .toBe("حدّد مهلة التعديل موعدًا في المستقبل (المادة 14)");
    expect(reviewCandidate(w, "u-hrlead", pending, "rejected", "البيان خارج المقعد").message)
      .toContain("اختر سبب الاعتذار");
    const r = reviewCandidate(w, "u-hrlead", pending, "needs_edit", "اختصر الفقرة الأخيرة", { editDueIso: iso(NOW + DAY) });
    expect(r.ok, r.message).toBe(true);
    const c = w.candidates.find((x) => x.id === pending)!;
    expect(c.editDueAt).toBe(NOW + DAY);
    expect(w.log.at(-1)!.payload).toMatchObject({ new_status: "needs_edit", edit_due: iso(NOW + DAY) });
  });

  // ولا يُعاد النظر في قرار: لا يُبتّ إلا فيما كان قيد المراجعة
  it("لا يُبتّ إلّا في ترشّحٍ قيد المراجعة", () => {
    for (const st of ["approved", "needs_edit", "rejected"] as const) {
      const c = w.candidates.find((x) => x.status === st)!;
      expect(reviewCandidate(w, "u-hrlead", c.id, "approved").message).toBe("لا يُبتّ إلا في ترشّحٍ قيد المراجعة");
    }
    const r = reviewCandidate(w, "u-hrlead", pending, "rejected", "البيان خارج المقعد", { rejectReason: "unrelated" });
    expect(r.ok, r.message).toBe(true);
    expect(w.candidates.find((x) => x.id === pending)!.rejectReason).toBe("unrelated");
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
    reviewCandidate(w, "u-hrlead", w.candidates[0].id, "rejected", "سببٌ مكتوب", { rejectReason: "unrelated" });
    // بقي مرشّحٌ نشطٌ؟ لا — فيلزم مرشّحٌ آخر لإغلاق الباب
    submitCandidacy(w, "u-m2", id, PITCH, null);
    reviewCandidate(w, "u-hrlead", w.candidates[1].id, "rejected", "سببٌ مكتوب", { rejectReason: "unrelated" });
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
    const w = load("joint_blocked"); // تصويتٌ مغلق
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
    expect(castVote(w, "u-exec", "e-lead-11", target.id).ok).toBe(true);
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
    const w = load("joint_blocked"); // صندوقٌ أُغلق، و«ريم التنفيذيّة» لم تختم بطاقتها فيه
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

describe("الإعلانُ الآليّ لحظة الإغلاق (المادتان 25 و28)", () => {
  /** `_resolve_department` — لا يُعلن أحدٌ بيده: يُغلَق التصويتُ فتُعلن المنصّةُ وتُسند المنصب. */
  it("يُغلَق التصويتُ فيُعلَن المتصدّرُ ويُسنَد المنصب", () => {
    const w = load("declare_winner");
    const r = transitionElection(w, "u-hrlead", "e-lead-11", "voting_closed", null, { reason: "اكتمل نصاب اللجنة قبل الموعد" });
    expect(r.ok, r.message).toBe(true);
    const e = w.elections[0];
    expect(e.status).toBe("completed");
    expect(e.completedBy).toBe("winner");
    expect(w.candidates.find((c) => c.id === e.winnerCandidateId)!.userId).toBe("u-m2");
    expect(memberIn(w, "u-m2")!.roleName).toBe("committee_leader");
    expect(w.log.some((x) => x.event === "winner_declared_auto" && x.payload.how === "top")).toBe(true);
  });

  it("وتسقط التزكيةُ إن لم يغلب التأييد، فيتعثّر المقعدُ ويبقى المرشّح معتمَدًا", () => {
    const w = load("confidence_falling"); // تأييدٌ ١ مقابل اعتراضٍ ٦
    expect(isConfidence(w, "e-dep-11")).toBe(true);
    expect(choiceWeight(w, "e-dep-11", "approve")).toBeLessThan(choiceWeight(w, "e-dep-11", "reject"));
    transitionElection(w, "u-hrlead", "e-dep-11", "voting_closed");
    const e = w.elections[0];
    expect(e.status).toBe("voting_closed");
    expect(e.stallReason).toBe("confidence_failed");
    expect(w.candidates.find((c) => c.electionId === "e-dep-11")!.status).toBe("approved");
  });

  it("ولا تسقط إن غلب التأييد", () => {
    const w = load("confidence_falling");
    const c = w.candidates.find((x) => x.status === "approved")!;
    castVote(w, "u-hrlead", "e-dep-11", c.id);
    castVote(w, "u-exec", "e-dep-11", c.id);
    transitionElection(w, "u-hrlead", "e-dep-11", "voting_closed");
    expect(w.elections[0].status).toBe("completed");
  });

  it("والتعادلُ يفتح للمجلس بدل الإعلان", () => {
    const w = load("declare_tie"); // ٤ مقابل ٤
    transitionElection(w, "u-hrlead", "e-lead-11", "voting_closed");
    expect(w.elections[0].status).toBe("voting_closed");
    expect(w.ties).toHaveLength(1);
    expect(w.ties[0].status).toBe("open");
    expect(w.ties[0].candidateIds).toHaveLength(2);
  });

  // المادة 27: لا يُعلَن مقعدٌ يشارك مقعدًا جاريًا في القسم مرشّحًا، فإذا أُغلق حُسما معًا
  it("لا يُعلَن مقعدٌ ينتظر مقعدًا آخر في القسم، ثمّ يُحسمان معًا", () => {
    const w = load("joint_blocked");
    settle(w);
    expect(w.elections.find((e) => e.id === "e-lead-11")!.status).toBe("voting_closed");
    transitionElection(w, "u-hrlead", "e-dep-11", "voting_closed");
    const lead = w.elections.find((e) => e.id === "e-lead-11")!;
    expect(lead.status).toBe("completed");
    expect(w.candidates.find((c) => c.id === lead.winnerCandidateId)!.userId).toBe("u-m1");
    expect(w.elections.find((e) => e.id === "e-dep-11")!.stallReason).toBe("no_votes");
  });

  it("من تصدّر مقعدين أخذ مفضَّله، والوصيفُ يرتقي", () => {
    const w = load("department_seats");
    expect(candidateWeight(w, w.candidates.find((c) => c.electionId === "e-head-1" && c.userId === "u-m1")!.id)).toBe(5);
    transitionElection(w, "u-hrlead", "e-lead-11", "voting_closed");
    const winnerOf = (id: string) => {
      const e = w.elections.find((x) => x.id === id)!;
      return w.candidates.find((c) => c.id === e.winnerCandidateId)!.userId;
    };
    expect(winnerOf("e-lead-11")).toBe("u-m1"); // مفضَّلُه
    expect(winnerOf("e-head-1")).toBe("u-m2");  // الوصيفُ ارتقى
    expect(winnerOf("e-dep-11")).toBe("u-m4");
    expect(new Set(w.assignments.map((a) => a.userId)).size).toBe(3);
    expect(w.log.some((x) => x.event === "winner_declared_auto" && x.payload.how === "after_27")).toBe(true);
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
    // ولم يعد التكليفُ يلغي الانتخاب (المادة 8)
    expect(w.elections[0].status).toBe("candidacy_open");
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
    expect(cancelElection(w, "u-hrlead", "e-lead-11", "تغيّرت هيكلةُ اللجنة").message).toContain("لا يُلغى الانتخاب إلا لتعثّره");
    expect(cancelElection(w, "u-hrlead", "e-lead-11", "تغيّرت هيكلةُ اللجنة", "stalled").message).toContain("لم يتعثّر");
    const r = cancelElection(w, "u-hrlead", "e-lead-11", "تغيّرت هيكلةُ اللجنة", "defect");
    expect(r.ok, r.message).toBe(true);
    expect(w.elections[0].status).toBe("cancelled");
    expect(w.elections[0].cancelReason).toBe("تغيّرت هيكلةُ اللجنة");
    expect(w.elections[0].cancelBasis).toBe("defect");
    expect(w.candidates.length).toBe(before);
  });

  it("لا إلغاءَ بلا سبب، ولا لمكتمل، ولا لغير مدير", () => {
    const w = load("self_candidate");
    expect(cancelElection(w, "u-hrlead", "e-lead-11", "   ").message).toBe("اكتب سبب الإلغاء.");
    expect(cancelElection(w, "u-m1", "e-lead-11", "سبب").message).toBe("غير مصرح بإلغاء الانتخاب");
    const done = load("archive");
    expect(cancelElection(done, "u-hrlead", "e-lead-11", "سبب").message).toBe("لا يمكن إلغاء انتخاب مكتمل");
    expect(cancelElection(w, "u-hrlead", "e-lead-11", "قصير").message).toBe("اكتب سبب الإلغاء (10 أحرف على الأقلّ) (المادة 29)");
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
    // وأُغلق التصويتُ فأعلنت المنصّةُ متصدّرَه في الحال (المادة 28)
    expect(w.elections.find((e) => e.id === "e-dep-11")!.status).toBe("completed");
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

/* ══ الأفعالُ الجديدة (دفعات ١–٥) ════════════════════════════════════ */

const WHY = "سببٌ مكتوبٌ بطوله يكفي";

describe("openRevote", () => {
  it("يُفتح لمن بطل صوتُه وحده، ويُحسم حين يصوّتون", () => {
    const w = load("revote_partial");
    expect(openRevote(w, "u-m1", "e-dep-11", iso(NOW + DAY), WHY).message).toBe("غير مصرح بإعادة التصويت");
    expect(openRevote(w, "u-hrlead", "e-dep-11", iso(NOW + DAY), "قصير").message).toBe("اكتب سبب إعادة التصويت (10 أحرف على الأقلّ).");
    const r = openRevote(w, "u-hrlead", "e-dep-11", iso(NOW + DAY), WHY);
    expect(r.ok, r.message).toBe(true);
    const e = w.elections[0];
    expect(e.status).toBe("voting_open");
    expect(e.revoteOnly).toBe(true);
    expect(e.revotePending).toBeNull();

    const a = w.candidates.find((c) => c.userId === "u-m1")!;
    expect(castVote(w, "u-hrmem", "e-dep-11", a.id).message).toBe("إعادة التصويت هذه لمن بطل صوته وحده (المادة 16)");
    expect(castVote(w, "u-exec", "e-dep-11", a.id).message).toBe("بطاقتُك في هذا المقعد مختومةٌ، ولا يُعاد الصوت");
    expect(castVote(w, "u-m4", "e-dep-11", a.id).ok).toBe(true);
    expect(w.votes.at(-1)!.weight).toBe(1); // بوزنه الأوّل
    expect(e.status).toBe("voting_open");
    expect(castVote(w, "u-hrlead", "e-dep-11", a.id).ok).toBe(true);
    // صوّت كلُّ من بطل صوتُه، فأُغلق التصويتُ وأُعلن أحمد (4 + 1 + 3.5)
    expect(e.status).toBe("completed");
    expect(e.winnerCandidateId).toBe(a.id);
  });

  it("ولا يُفتح ما لا إعادةَ تنتظر فيه، ولا بموعدٍ ماضٍ", () => {
    const w = load("revote_partial");
    expect(openRevote(w, "u-hrlead", "e-dep-11", iso(NOW - DAY), WHY).message).toBe("اختر لإغلاق إعادة التصويت موعدًا في المستقبل");
    const plain = load("joint_blocked");
    expect(openRevote(plain, "u-hrlead", "e-lead-11", iso(NOW + DAY), WHY).message).toBe("لا إعادة تصويتٍ تنتظر في هذا الانتخاب");
  });

  it("والإعادةُ تزكيةً مفتوحةٌ للناخبين كلّهم", () => {
    const w = load("revote_full");
    expect(openRevote(w, "u-hrlead", "e-lead-11", iso(NOW + DAY), WHY).ok).toBe(true);
    expect(w.elections[0].revoteOnly).toBe(false);
    const a = w.candidates.find((c) => c.status === "approved")!;
    expect(castVote(w, "u-hrmem", "e-lead-11", a.id, "reject").ok).toBe(true);
  });
});

describe("appointSeatHolder", () => {
  it("يعيّن على المتعثّر فيكتمل الانتخابُ بالتعيين", () => {
    const w = load("stall_no_votes");
    expect(appointSeatHolder(w, "u-hrmem", "e-lead-12", "u-m5", WHY).message).toContain("لمديري الانتخابات الثلاثة");
    expect(appointSeatHolder(w, "u-hrlead", "e-lead-12", "u-m5", "قصير").message).toBe("اكتب سبب التعيين (10 أحرف على الأقلّ).");
    const r = appointSeatHolder(w, "u-hrlead", "e-lead-12", "u-m5", WHY);
    expect(r.ok, r.message).toBe(true);
    const e = w.elections[0];
    expect(e).toMatchObject({ status: "completed", completedBy: "appointment", appointedUserId: "u-m5" });
    expect(memberIn(w, "u-m5")!.roleName).toBe("committee_leader");
    expect(w.log.some((x) => x.event === "completed_by_appointment")).toBe(true);
  });

  it("لا تعيينَ على مقعدٍ لم يتعثّر، ولا لمن سقطت تزكيتُه", () => {
    expect(appointSeatHolder(load("joint_blocked"), "u-hrlead", "e-lead-11", "u-m4", WHY).message)
      .toBe("لا يُعيَّن إلا على مقعدٍ تعثّر انتخابه، أو أُلغي لتعثّره (المادة 25)");
    const w = load("stall_confidence");
    expect(appointSeatHolder(w, "u-hrlead", "e-dep-11", "u-m2", WHY).message).toBe("من سقطت تزكيته في هذا الانتخاب لا يُعيَّن عليه (المادة 25)");
    expect(appointableMembers(w, "e-dep-11").some((m) => m.id === "u-m2")).toBe(false);
  });

  it("ويصحّ على متعثّرٍ أُلغي لتعثّره", () => {
    const w = load("stall_no_votes");
    expect(cancelElection(w, "u-hrlead", "e-lead-12", WHY, "stalled").ok).toBe(true);
    expect(appointSeatHolder(w, "u-hrlead", "e-lead-12", "u-m6", WHY).ok).toBe(true);
  });
});

describe("إعادةُ فتح الباب بعد التصويت للمتعثّر", () => {
  it("تبطل الأصواتُ كلُّها، وينتهي ترشّحُ من سقطت تزكيتُه", () => {
    const w = load("stall_confidence");
    const r = transitionElection(w, "u-hrlead", "e-dep-11", "candidacy_open", null, { reason: WHY, candidacyEndIso: iso(NOW + 3 * DAY) });
    expect(r.ok, r.message).toBe(true);
    const e = w.elections[0];
    expect(e).toMatchObject({ status: "candidacy_open", stalledAt: null, stallReason: null, candidacyEnd: NOW + 3 * DAY });
    expect(w.votes.every((v) => v.voidReason === "reopened")).toBe(true);
    expect(w.candidates[0]).toMatchObject({ status: "ended", endReason: "confidence_failed" });
  });
});

describe("chooseInTie", () => {
  it("للمجلس وحده، باختيارٍ واحدٍ لا يُعدَّل، والأغلبيّةُ تعلن", () => {
    const w = load("tie_open"); // اختارت الرئيسة التنفيذيّة أحمد
    const [a, b] = w.ties[0].candidateIds;
    expect(chooseInTie(w, "u-m3", 1, a, WHY).message).toBe("الفصل في التعادل للمجلس الإداري (المادة 26)");
    expect(chooseInTie(w, "u-exec", 1, b, WHY).message).toBe("اخترتَ في هذا التعادل من قبل، ولا يُعدَّل الاختيار");
    expect(chooseInTie(w, "u-pres", 1, "c-x", WHY).message).toBe("اختر من المتعادلين");
    expect(chooseInTie(w, "u-pres", 1, b, "قصير").message).toBe("اكتب سبب اختيارك (10 أحرف على الأقلّ).");
    expect(chooseInTie(w, "u-hrlead", 1, b, WHY).ok).toBe(true);
    expect(w.ties[0].status).toBe("open"); // واحدٌ لكلٍّ: لا أغلبيّة
    expect(chooseInTie(w, "u-pres", 1, a, WHY).ok).toBe(true);
    expect(w.ties[0]).toMatchObject({ status: "decided", outcome: "majority", winnerCandidateId: a });
    expect(w.elections[0].winnerCandidateId).toBe(a);
  });

  it("«أترك الأمر للأسبق» يُحسب للأسبق ترشّحًا", () => {
    const w = load("tie_open");
    const [a] = w.ties[0].candidateIds; // أحمدُ أسبقُ ترشّحًا
    expect(chooseInTie(w, "u-hrlead", 1, null, WHY).ok).toBe(true);
    expect(w.elections[0].winnerCandidateId).toBe(a);
  });

  it("ومضيُّ الأجل يُعلن الأسبق", () => {
    const w = load("tie_open");
    shiftWorld(w, DAY);
    sweep(w);
    expect(w.ties[0]).toMatchObject({ status: "decided", outcome: "earliest" });
  });

  it("والتعادلُ الموقوفُ بتجميدٍ لا يُحسم حتى يُرفع", () => {
    const w = load("tie_paused");
    const [a] = w.ties[0].candidateIds;
    chooseInTie(w, "u-pres", 1, a, WHY);
    chooseInTie(w, "u-exec", 1, a, WHY);
    expect(w.ties[0].status).toBe("open");
    expect(decideFreeze(w, "u-hrlead", 1, "lift", WHY).ok).toBe(true);
    expect(w.ties[0]).toMatchObject({ status: "decided", winnerCandidateId: a, pausedAt: null });
  });
});

describe("التجميد", () => {
  it("يطلبه عضوُ الموارد، فيوافق القائد، فيُجمَّد بمهلة الإجابة", () => {
    const w = load("cand_states");
    const c = w.candidates.find((x) => x.userId === "u-m1")!; // قيد المراجعة
    expect(requestFreeze(w, "u-m4", c.id, WHY, "6 hours", "1 day").message).toBe("التجميد لإدارة الموارد البشرية (المادة 16)");
    expect(requestFreeze(w, "u-hrmem", c.id, WHY, "", "1 day").message).toBe("حدّد مهلة الإجابة وأجل القرار");
    const r = requestFreeze(w, "u-hrmem", c.id, WHY, "6 hours", "1 day");
    expect(r.ok, r.message).toBe(true);
    const id = Number(r.id);
    expect(c.status).toBe("pending");
    expect(requestFreeze(w, "u-hrmem", c.id, WHY, "6 hours", "1 day").message).toBe("على هذا الترشّح تجميدٌ قائم أو طلبٌ ينتظر");
    expect(approveFreeze(w, "u-hrmem", id, true).message).toContain("لقائد إدارة الموارد البشرية");
    expect(approveFreeze(w, "u-hrlead", id, true).ok).toBe(true);
    expect(c.status).toBe("frozen");
    expect(w.freezes.find((f) => f.id === id)!.answerDue).toBe(NOW + 6 * 3_600_000);
  });

  it("وإن طلبه القائدُ جُمّد في الحال، والردُّ بسبب", () => {
    const w = load("cand_states");
    const c = w.candidates.find((x) => x.userId === "u-m1")!;
    expect(requestFreeze(w, "u-hrlead", c.id, WHY, "06:00:00", "1 day").ok).toBe(true);
    expect(c.status).toBe("frozen");
    const req = w.freezes.find((f) => f.status === "requested")!;
    expect(approveFreeze(w, "u-hrlead", req.id, false, "قصير").message).toBe("اكتب سبب رفض الطلب (10 أحرف على الأقلّ)");
    expect(approveFreeze(w, "u-hrlead", req.id, false, WHY).ok).toBe(true);
    expect(req).toMatchObject({ status: "closed", outcome: "declined" });
  });

  it("يجيب صاحبُه وحده، ولا استبعادَ قبل الإجابة", () => {
    const w = load("cand_states");
    const active = w.freezes.find((f) => f.status === "active")!;
    const owner = w.candidates.find((c) => c.id === active.candidateId)!.userId;
    expect(decideFreeze(w, "u-hrlead", active.id, "exclude", WHY).message).toBe("لا يُستبعد قبل أن يُجيب أو تمضي مهلة إجابته (المادة 16)");
    expect(answerFreeze(w, "u-m1", active.id, WHY).message).toBe("الإجابة لصاحب الترشّح وحده");
    expect(answerFreeze(w, owner, active.id, "قصير").message).toBe("اكتب إجابتك (10 أحرف على الأقلّ)");
    expect(answerFreeze(w, owner, active.id, WHY).ok).toBe(true);
    expect(active.status).toBe("answered");
    expect(active.decideDue).toBe(NOW + DAY);
    expect(decideFreeze(w, "u-hrlead", active.id, "exclude", WHY).ok).toBe(true);
    expect(w.candidates.find((c) => c.id === active.candidateId)).toMatchObject({ status: "ended", endReason: "excluded" });
  });

  it("الرفعُ يعيد الترشّح إلى حاله، ومهلةُ التعديل تُكمَل من حيث وقفت", () => {
    const w = load("cand_states");
    const ed = w.candidates.find((c) => c.status === "needs_edit")!;
    const left = ed.editDueAt! - NOW;
    const r = requestFreeze(w, "u-hrlead", ed.id, WHY, "6 hours", "1 day");
    shiftWorld(w, 3_600_000);
    w.now = NOW;
    expect(decideFreeze(w, "u-hrlead", Number(r.id), "lift", WHY).ok).toBe(true);
    expect(ed.status).toBe("needs_edit");
    expect(ed.editDueAt).toBe(NOW + left);
  });

  it("الكنّاسة: مضيُّ مهلة الإجابة يستبعد، ومضيُّ أجل القرار يرفع", () => {
    const w = load("cand_states");
    const active = w.freezes.find((f) => f.status === "active")!;
    const answered = w.freezes.find((f) => f.status === "answered")!;
    shiftWorld(w, DAY);
    sweep(w);
    expect(w.candidates.find((c) => c.id === active.candidateId)).toMatchObject({ status: "ended", endReason: "excluded" });
    expect(active.outcome).toBe("auto_excluded");
    expect(answered.outcome).toBe("auto_lifted");
    expect(w.candidates.find((c) => c.id === answered.candidateId)!.status).toBe("approved");
  });

  it("والمجمَّدُ والتصويتُ جارٍ يغيب عن البطاقة", () => {
    const w = load("self_candidate");
    const c = w.candidates.find((x) => x.status === "approved" && x.userId !== "u-m1")!;
    expect(requestFreeze(w, "u-hrlead", c.id, WHY, "6 hours", "1 day").ok).toBe(true);
    expect(castVote(w, "u-m4", "e-lead-11", c.id).message).toBe("المرشح غير صالح في هذا الانتخاب");
  });
});

describe("الحرمان من الترشّح", () => {
  it("لرئيس أدِيب وحده، وينهي ما لم يُفتح تصويتُه", () => {
    const w = load("competition");
    const until = new Date(NOW + 30 * DAY).toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
    expect(banFromCandidacy(w, "u-hrlead", "u-m1", WHY, until).message).toBe("الحرمان من الترشّح لرئيس أدِيب وحده (المادة 11)");
    expect(banFromCandidacy(w, "u-pres", "u-m1", WHY, "2030-01-01").message).toBe("أجل الحرمان من اليوم إلى سنةٍ على الأكثر (المادة 11)");
    const r = banFromCandidacy(w, "u-pres", "u-m1", WHY, until);
    expect(r.ok, r.message).toBe(true);
    expect(w.candidates.find((c) => c.userId === "u-m1")).toMatchObject({ status: "ended", endReason: "debarred" });
    expect(activeBanOf(w, "u-m1")).not.toBeNull();
    expect(banFromCandidacy(w, "u-pres", "u-m1", WHY, until).message).toBe("هذا العضو محرومٌ من الترشّح الآن");

    // والمحرومُ لا يترشّح في مقعدٍ جديد
    const fresh = createElection(w, "u-hrlead", { roleName: "deputy_committee_leader", committeeId: 11, candidacyEndIso: iso(NOW + 3 * DAY) });
    expect(eligibleToRun(w, "u-m1", fresh.id!)).toBe(false);
    expect(liftCandidacyBan(w, "u-pres", Number(r.id), WHY).ok).toBe(true);
    expect(eligibleToRun(w, "u-m1", fresh.id!)).toBe(true);
  });
});
