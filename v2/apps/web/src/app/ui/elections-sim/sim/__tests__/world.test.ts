import { describe, expect, it } from "vitest";
import { MEMBERS, ROLES } from "../org";
import { scenarioOf } from "../scenarios";
import {
  ACTIVE_CANDIDACY, candidateVotes, candidateWeight, choiceWeight, countActive, countApproved,
  departmentResolutionState, electionDepartment, eligibleToRun, eligibleToVote, emptyWorld,
  hasCap, isConfidence, isElectionAdmin, isTopAdmin, memberIn, membersIn, nextId, seatHolder,
  shiftWorld, soleCandidate, voteWeight, writeLog,
} from "../world";

/**
 * قراءاتُ العالم — كلُّ دالّةٍ ههنا تحمل في تعليقها اسمَ نظيرتها في القاعدة (`@db`)، وهي
 * ما تقرؤه القاعدةُ قبل كلّ حكم: من يترشّح، ومن ينتخب، وبأيّ وزن. فخللٌ فيها لا يظهر
 * رسالةَ خطأ، إنّما يفتح بابًا لمن لا يستحقّه أو يغلقه في وجه صاحبه.
 */

const NOW = Date.UTC(2026, 7, 16, 9, 0, 0);
const DAY = 86_400_000;
const load = (key: string) => scenarioOf(key).build(NOW);

describe("memberIn و seatHolder", () => {
  it("العضوُ بمنصبه المكتوب ما لم يُسنَد إليه شيءٌ في هذا العالم", () => {
    const w = emptyWorld(NOW);
    expect(memberIn(w, "u-m1")!.roleName).toBe("committee_member");
    expect(memberIn(w, "u-ghost")).toBeNull();
    expect(memberIn(w, null)).toBeNull();
  });

  /**
   * **ولا بدّ من `seatOverride`**: من فاز صار قائدًا، فتغيّر وزنُه وسقطت أهليّتُه للترشّح
   * لمقعده ثانيةً. ولو بقيت الشاشةُ تقرأ المنصبَ الأوّل لكذب المحاكي بعد أوّل إعلان.
   */
  it("والمنصبُ المُسنَد في هذا العالم يعلو المكتوب", () => {
    const w = load("archive"); // أُعلن فوزُ أحمد بقيادة لجنة الرواة
    expect(memberIn(w, "u-m1")!.roleName).toBe("committee_leader");
    expect(voteWeight(w, "u-m1")).toBe(ROLES.committee_leader.weight);
  });

  it("seatHolder يسمّي شاغلَ المقعد ويصمت عن الشاغر", () => {
    const w = emptyWorld(NOW);
    expect(seatHolder(w, "committee_leader", 12, null)!.id).toBe("u-leader");
    expect(seatHolder(w, "committee_leader", 11, null)).toBeNull();
    expect(seatHolder(w, "department_head", null, 2)!.id).toBe("u-coord");
  });

  it("membersIn يعدّ الأهلَ كلَّهم بمناصبهم في هذا العالم", () => {
    const w = load("archive");
    expect(membersIn(w)).toHaveLength(MEMBERS.length);
    expect(membersIn(w).find((m) => m.id === "u-m1")!.roleName).toBe("committee_leader");
  });
});

describe("القدرةُ والوزن", () => {
  it("hasCap يقرأ قدرةَ الدور الحيّ", () => {
    const w = emptyWorld(NOW);
    expect(hasCap(w, "u-hrlead", "manage_elections")).toBe(true);
    expect(hasCap(w, "u-hrmem", "manage_elections")).toBe(false);
    expect(hasCap(w, "u-hrmem", "view_election_candidates")).toBe(true);
    expect(hasCap(w, "u-m1", "run_for_election")).toBe(true);
    expect(hasCap(w, "u-ghost", "manage_elections")).toBe(false);
  });

  it("مديرو الانتخابات ثلاثة", () => {
    const w = emptyWorld(NOW);
    const admins = MEMBERS.filter((m) => isElectionAdmin(w, m.id)).map((m) => m.id);
    expect(admins.sort()).toEqual(["u-exec", "u-hrlead", "u-pres"]);
  });

  // `is_top_admin_role` يشتقّ من `roles.votes_in_all_elections` لا من قائمةٍ محفورة
  it("الإداريّون الأعلى أربعةٌ يصوّتون في كلّ مقعد", () => {
    const w = emptyWorld(NOW);
    const tops = MEMBERS.filter((m) => isTopAdmin(w, m.id)).map((m) => m.id);
    expect(tops.sort()).toEqual(["u-advisor", "u-exec", "u-hrlead", "u-pres"]);
  });

  it("وزنُ الناخب وزنُ دوره، وأدناه واحد", () => {
    const w = emptyWorld(NOW);
    expect(voteWeight(w, "u-pres")).toBe(4);
    expect(voteWeight(w, "u-hrlead")).toBe(3.5);
    expect(voteWeight(w, "u-coord")).toBe(2.5);
    expect(voteWeight(w, "u-m1")).toBe(1);
    expect(voteWeight(w, "u-ghost")).toBe(1); // من لا دورَ له لا يُرفع وزنُه
  });
});

describe("عدُّ المرشّحين والتزكية", () => {
  it("النشطُ ثلاثُ حالات، والمعتمَدُ حالةٌ واحدة", () => {
    const w = load("review"); // مرشّحٌ من كلّ حالٍ من الخمس
    expect(ACTIVE_CANDIDACY.sort()).toEqual(["approved", "needs_edit", "pending"]);
    expect(countActive(w, "e-lead-11")).toBe(3); // pending + approved + needs_edit
    expect(countApproved(w, "e-lead-11")).toBe(1);
  });

  // `is_confidence_election` — معتمَدٌ واحدٌ لا غير، فالاقتراعُ تزكيةٌ لا اختيار
  it("التزكيةُ معتمَدٌ واحدٌ لا غير", () => {
    expect(isConfidence(load("confidence"), "e-dep-11")).toBe(true);
    expect(isConfidence(load("self_candidate"), "e-lead-11")).toBe(false); // ثلاثةُ معتمَدين
    expect(isConfidence(load("competition"), "e-lead-11")).toBe(false); // ولا معتمَدَ بعد
  });

  /**
   * `is_sole_candidate` — **الوحيدُ يرى مقعدَه ولا يفعل فيه**: يبقى مؤهَّلًا فيرى بطاقتَه،
   * ويردّه عن الصندوق حارسُ «لا تصوّت لنفسك» لا حجبُ الباب.
   */
  it("مرشّحُ المقعد الوحيد يُسمّى بحاله", () => {
    const w = load("sole_self");
    expect(soleCandidate(w, "u-m1", "e-lead-11")).toBe(true);  // هو المعتمَدُ الوحيد
    expect(soleCandidate(w, "u-m2", "e-lead-11")).toBe(false); // منسحبٌ لا معتمَد
    expect(soleCandidate(w, "u-m3", "e-lead-11")).toBe(false); // ليس مرشّحًا أصلًا
    // ويبقى مؤهَّلًا لرؤية بطاقته
    expect(eligibleToVote(w, "u-m1", "e-lead-11")).toBe(true);
  });

  it("وزنُ المرشّح مجموعُ أوزان مؤيّديه، والاعتراضُ لا يُحسب له", () => {
    const w = load("confidence_falling");
    const c = w.candidates.find((x) => x.status === "approved")!;
    expect(candidateWeight(w, c.id)).toBe(1); // مؤيّدٌ واحدٌ وزنُه ١
    expect(candidateVotes(w, c.id)).toBe(1);  // والعدُّ عددُ المؤيّدين لا الأوراق
    expect(w.votes.length).toBe(4);           // وثلاثُ أوراقٍ اعتراضٌ عليه
    expect(choiceWeight(w, "e-dep-11", "reject")).toBe(6); // ١ + ١ + ٤
  });
});

describe("electionDepartment", () => {
  // قسمُه صراحةً أو قسمُ لجنته
  it("قسمُ المقعد صراحةً أو من لجنته", () => {
    const w = load("department_seats");
    expect(electionDepartment(w.elections.find((e) => e.id === "e-head-1"))).toBe(1); // صراحةً
    expect(electionDepartment(w.elections.find((e) => e.id === "e-lead-11"))).toBe(1); // من لجنة ١١
    expect(electionDepartment(null)).toBeNull();
    expect(electionDepartment(undefined)).toBeNull();
  });
});

describe("eligibleToVote", () => {
  it("الإداريُّ الأعلى ناخبٌ في كلّ مقعدٍ أيًّا كان نطاقُه", () => {
    const w = load("self_candidate"); // مقعدُ لجنة الرواة (١١)
    for (const id of ["u-pres", "u-exec", "u-advisor", "u-hrlead"]) {
      expect(eligibleToVote(w, id, "e-lead-11"), id).toBe(true);
    }
  });

  it("ومقعدُ اللجنة ناخبوه أعضاؤها وحدهم", () => {
    const w = load("self_candidate");
    expect(eligibleToVote(w, "u-m1", "e-lead-11")).toBe(true);  // من لجنة ١١
    expect(eligibleToVote(w, "u-m5", "e-lead-11")).toBe(false); // من لجنة ١٢
    expect(eligibleToVote(w, "u-m7", "e-lead-11")).toBe(false); // من لجنة ٢١
  });

  // مقعدُ القسم ناخبوه أعضاءُ لجانه كلِّها
  it("ومقعدُ القسم ناخبوه أعضاءُ لجانه", () => {
    const w = load("department_seats"); // e-head-1 لقسم صناعة المحتوى (لجنتاه ١١ و١٢)
    expect(eligibleToVote(w, "u-m1", "e-head-1")).toBe(true); // لجنة ١١
    expect(eligibleToVote(w, "u-m5", "e-head-1")).toBe(true); // لجنة ١٢
    expect(eligibleToVote(w, "u-m7", "e-head-1")).toBe(false); // لجنة ٢١ من قسمٍ آخر
  });

  it("ومن لا انتخابَ له ولا عضويّةَ لا يُسأل", () => {
    const w = load("self_candidate");
    expect(eligibleToVote(w, "u-m1", "e-ghost")).toBe(false);
    expect(eligibleToVote(w, "u-ghost", "e-lead-11")).toBe(false);
  });
});

describe("eligibleToRun", () => {
  /** (أ) لا يترشّح إداريٌّ، ولا بدّ من قدرة `run_for_election`. */
  it("المجلسُ الإداريُّ لا يترشّح البتّة", () => {
    const w = load("competition");
    for (const id of ["u-pres", "u-exec", "u-advisor", "u-hrlead", "u-hrmem"]) {
      expect(eligibleToRun(w, id, "e-lead-11"), id).toBe(false);
    }
  });

  it("وعضوُ اللجنة يترشّح لمقعدها", () => {
    const w = load("competition");
    expect(eligibleToRun(w, "u-m4", "e-lead-11")).toBe(true);
  });

  /** (ب) تعارضاتٌ بنيويّة: شاغلُ المقعد لا يترشّح له، ومنسّقٌ لا يترشّح لمقاعد لجان قسمه. */
  it("قائدُ اللجنة يُحجَب عن قيادة لجنته ونيابتها معًا", () => {
    const w = load("competition");
    const lead12 = { roleName: "committee_leader", committeeId: 12 } as const;
    const dep12 = { roleName: "deputy_committee_leader", committeeId: 12 } as const;
    for (const seat of [lead12, dep12]) {
      const w2 = load("competition");
      w2.elections.push({
        ...w2.elections[0], id: "e-x", targetRoleName: seat.roleName, targetCommitteeId: seat.committeeId,
      });
      expect(eligibleToRun(w2, "u-leader", "e-x"), seat.roleName).toBe(false);
    }
    expect(w.elections).toHaveLength(1); // ولم نمسّ العالم الأوّل
  });

  it("ونائبُ القائد يُحجَب عن نيابة لجنته لا عن قيادتها", () => {
    const w = load("competition");
    const push = (role: string) => {
      w.elections.push({ ...w.elections[0], id: `e-${role}`, targetRoleName: role as "committee_leader", targetCommitteeId: 12 });
      return `e-${role}`;
    };
    expect(eligibleToRun(w, "u-deputy", push("deputy_committee_leader"))).toBe(false);
    expect(eligibleToRun(w, "u-deputy", push("committee_leader"))).toBe(true);
  });

  it("ومنسّقُ القسم يُحجَب عن مقاعد لجان قسمه وعن التنسيق نفسِه", () => {
    const w = load("competition");
    // منال منسّقةُ القسم ٢ ولجنتُه ٢١
    w.elections.push({ ...w.elections[0], id: "e-21", targetCommitteeId: 21 });
    w.elections.push({ ...w.elections[0], id: "e-h2", targetRoleName: "department_head", targetCommitteeId: null, targetDepartmentId: 2 });
    expect(eligibleToRun(w, "u-coord", "e-21")).toBe(false);
    expect(eligibleToRun(w, "u-coord", "e-h2")).toBe(false);
  });

  it("ولا يترشّح من خارج نطاق المقعد", () => {
    const w = load("competition");
    expect(eligibleToRun(w, "u-m7", "e-lead-11")).toBe(false); // من لجنة ٢١
  });

  /** (ج) لا ترشّحَ سابقٌ في هذا المقعد، ولا ترشّحٌ نشطٌ في **قسمٍ مغاير**. */
  it("لا ترشّحَ مرّتين في المقعد نفسِه", () => {
    const w = load("competition");
    expect(eligibleToRun(w, "u-m1", "e-lead-11")).toBe(false); // ترشّح بالفعل
  });

  // ومقعدان من قسمٍ **واحد** يجوزان معًا، وبهما تُحسم الأفضليّة
  it("مقعدان من قسمٍ واحدٍ يجوزان معًا", () => {
    const w = load("preference"); // لأحمد ترشّحٌ في قيادة لجنة ١١ (قسم ١)
    expect(eligibleToRun(w, "u-m1", "e-head-1")).toBe(true);  // تنسيقُ القسم نفسِه
    expect(eligibleToRun(w, "u-m1", "e-dep-11")).toBe(true);  // ونيابةُ لجنته
  });

  it("ولا يُترَك بابُ الترشّح مفتوحًا لمن ترشّح في قسمٍ مغاير", () => {
    const w = load("preference");
    // نُقل مقعدُ التنسيق إلى القسم الثاني: صار ترشُّحُ أحمد القائمُ في «قسمٍ مغاير»
    const other = w.elections.find((e) => e.id === "e-head-1")!;
    other.targetDepartmentId = 2;
    expect(eligibleToRun(w, "u-m1", "e-head-1")).toBe(false);
  });

  it("ولا ترشّحَ في مقعدٍ أُغلق بابُه أو أُرشف", () => {
    const w = load("preference");
    const e = w.elections.find((x) => x.id === "e-dep-11")!;
    e.status = "candidacy_closed";
    expect(eligibleToRun(w, "u-m4", "e-dep-11")).toBe(false);
    e.status = "candidacy_open";
    e.archivedAt = NOW;
    expect(eligibleToRun(w, "u-m4", "e-dep-11")).toBe(false);
  });
});

describe("departmentResolutionState", () => {
  /**
   * `department_resolution_state` — كم مقعدًا في القسم جاهزٌ للحسم معه، وكم مقعدًا يحول
   * دونه لأنّ تصويتَه لم يُغلق. تُقرأ فتُظهر زرَّ «إعلان فائزي القسم».
   */
  it("يعدّ الجاهزَ والحائلَ في القسم", () => {
    const ready = load("department_seats"); // ثلاثةُ مقاعدَ أُغلق تصويتُها
    expect(departmentResolutionState(ready, "e-head-1")).toEqual({ pending: 1, blocking: 0 });

    const blocked = load("joint_blocked"); // مقعدٌ مغلقٌ وآخرُ ما زال في التصويت
    expect(departmentResolutionState(blocked, "e-lead-11")).toEqual({ pending: 0, blocking: 1 });
  });

  it("ولا شيءَ يُحسب لمقعدٍ لا معتمَدَ فيه أو لا وجودَ له", () => {
    const w = load("competition"); // لا معتمَدَ بعد
    expect(departmentResolutionState(w, "e-lead-11")).toEqual({ pending: 0, blocking: 0 });
    expect(departmentResolutionState(w, "e-ghost")).toEqual({ pending: 0, blocking: 0 });
  });
});

describe("shiftWorld", () => {
  /**
   * **مرورُ الزمن إزاحةٌ للماضي لا تقديمٌ للساعة**: الشاشاتُ الحقيقيّة تقرأ `Date.now()`
   * بنفسها، فلو مضت ساعةُ العالم وحدَها لافترق الحكمان — يُحسَب الموعدُ بساعة الجهاز
   * ويُقاس بساعة العالم، فيُردّ موعدٌ صحيحٌ بجملة «اختر موعدًا في المستقبل».
   */
  it("يُزيح كلَّ ما في العالم ويُبقي الساعةَ كما هي", () => {
    const w = load("deadlines");
    const beforeEnd = w.elections[0].candidacyEnd!;
    const beforeSubmit = w.candidates[0].submittedAt;

    shiftWorld(w, DAY);

    expect(w.now).toBe(NOW); // الساعةُ لم تُقدَّم
    expect(w.elections[0].candidacyEnd).toBe(beforeEnd - DAY);
    expect(w.elections[0].candidacyOpenedAt).toBe(w.elections[0].createdAt);
    expect(w.candidates[0].submittedAt).toBe(beforeSubmit - DAY);
  });

  it("والعدمُ يبقى عدمًا لا يُطرح منه شيء", () => {
    const w = load("deadlines");
    const noDeadline = w.elections.find((e) => e.id === "e-head-1")!;
    shiftWorld(w, DAY);
    expect(noDeadline.candidacyEnd).toBeNull();
    expect(noDeadline.votingEnd).toBeNull();
    expect(noDeadline.stalledAt).toBeNull();
  });

  it("ويُزيح السجلَّ والأصوات والإشعارات معًا", () => {
    const w = load("declare_winner");
    const voteAt = w.votes[0].at;
    const logAt = w.log[0].at;
    shiftWorld(w, 2 * DAY);
    expect(w.votes[0].at).toBe(voteAt - 2 * DAY);
    expect(w.log[0].at).toBe(logAt - 2 * DAY);
  });
});

describe("مولّداتُ المعرّفات والسجلّ", () => {
  it("المعرّفُ يتسلسل ولا يتكرّر", () => {
    const w = emptyWorld(NOW);
    expect([nextId(w, "e"), nextId(w, "e"), nextId(w, "c")]).toEqual(["e-1", "e-2", "c-3"]);
  });

  it("سطرُ السجلّ يُكتب بفاعله وحمولته وبساعة العالم", () => {
    const w = emptyWorld(NOW);
    writeLog(w, "e-1", "u-hrlead", "election_created", { role_name: "committee_leader" });
    expect(w.log[0]).toMatchObject({ id: 1, electionId: "e-1", actorId: "u-hrlead", at: NOW });
  });

  // و`at` للبذر وحده: وقائعُ ماضيةٌ تُكتب بزمنها
  it("وللبذر أن يكتب واقعةً بزمنها", () => {
    const w = emptyWorld(NOW);
    writeLog(w, "e-1", null, "candidacy_submitted", {}, NOW - DAY);
    expect(w.log[0].at).toBe(NOW - DAY);
    expect(w.log[0].actorId).toBeNull(); // فاعلُه «النظام»
  });
});
