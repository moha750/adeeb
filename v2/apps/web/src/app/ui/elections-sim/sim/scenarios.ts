// **السيناريوهات** — عوالمُ جاهزةٌ تُحمَّل بضغطة، كلٌّ منها يضع النظامَ في حالٍ بعينها ثمّ
// يترك القرارَ لك. والبذرُ هنا **إدراجٌ مباشر** لا نداءُ أفعال (كما يُبذَر جدولٌ في القاعدة):
// بعضُ الحالات لا تُبلَغ بالأفعال أصلًا (الفوزُ بمقعدين، سقوطُ التزكية) وهي عينُ ما نريد رؤيته.
//
// **والبياناتُ بطول الواقع** (٤٠٠ إلى ١٢٠٠ حرف): مختبرٌ ببيانٍ من سطرٍ واحد يجعل كلَّ تصميمٍ
// يبدو مريحًا، ثمّ ينكشف في الإنتاج. (درسٌ دفعنا ثمنَه مرّتين: كرتُ الانتخاب وبطاقةُ الاقتراع.)

import type { CandidateStatus, ElectionStatus } from "@/app/dashboard/elections/vocab";
import type { ElectedRole } from "./org";
import { emptyWorld, nextId, writeLog, type SimWorld, voteWeight, memberIn } from "./world";

const DAY = 86_400_000;
const HOUR = 3_600_000;

/* ══ بياناتُ ترشّحٍ بطول الواقع ═════════════════════════════════════ */

const PITCH: string[] = [
  "تقدّمتُ لهذا المقعد بعد ثلاث سنواتٍ قضيتُها في اللجنة، عرفتُ فيها أين يتعثّر عملُنا وأين يمضي بلا عناء. أوّلُ ما أراه أنّ الجهد يضيع بين إعادة العمل نفسه كلَّ فصل: كلُّ فريقٍ يبدأ من الصفر، ويُعيد بناء ما بناه من قبله. فأوّلُ ما أعمل عليه أرشيفٌ حيٌّ للأعمال والقوالب، يُفتح في دقيقة ولا يُبحَث عنه في مجموعات المحادثة. والثاني توزيعُ العمل بمقياسٍ معلوم لا بمن يرفع يدَه أوّلًا؛ لكلّ عضوٍ نصيبٌ يُعرَف قبل بدء الفصل، فمن أراد أن يزيد زاد ومن ضاقت عليه أيّامُه قال ذلك قبل أن يتأخّر لا بعده. والثالث لقاءٌ قصيرٌ كلّ أسبوعين لا يتجاوز عشرين دقيقة، غايتُه أن يُعرَف ما وقف وما مضى، ولا يُعقَد ليُملأ به وقت. وأعِد أن أكون أوّلَ من يُسأل عن التأخير وآخرَ من يُنسَب إليه الإنجاز.",
  "أرى أنّ لجنتنا تُنتج جيّدًا وتُعرَف قليلًا، وأنّ الفجوة بين ما نصنعه وما يصل إلى الأعضاء هي أكبرُ ما نخسره. خطّتي في ثلاثة: أن يكون لكلّ عملٍ ننجزه أثرٌ مكتوبٌ يُنشَر، فلا يبقى الجهدُ حبيسَ ملفّ؛ وأن نفتح بابًا شهريًّا للأعضاء الجدد يجلسون فيه مع من سبقهم، فالخبرةُ تُنقَل بالمجالسة لا بالتعليمات؛ وأن نراجع في نهاية كلّ فصلٍ ما لم يُنجَز ونقول سببَه صراحةً، فالتقريرُ الذي لا يذكر إلّا النجاح لا يُقرأ منه شيء. ولستُ أَعِد بما لا أملك: القرارُ للجنة كلِّها، وأنا أُدير النقاش ولا أحسمه وحدي، وإن خالفني أكثرُكم مضيتُ مع رأيه ولم أُعطّله.",
  "خبرتي في هذا الميدان بدأت قبل أن ألتحق بالنادي، وقد أخذتُ منها درسًا واحدًا أُقدّمه هنا: العملُ المنظَّم أهدأُ من العمل المتحمّس وأبقى. لا أنوي تغييرًا واسعًا في أوّل شهر؛ أنوي أن أُصغي ثمّ أُصلح ما يُجمِع عليه أكثرُكم. وأوّلُ ثلاثةٍ في ذهني: جدولٌ معلومٌ ينشره أوّلُ كلّ شهر فلا يُفاجأ أحدٌ بمهمّةٍ في ليلتها؛ ومعيارٌ مكتوبٌ لما نقبله وما نردّه، فيُعرَف الحكمُ قبل التسليم لا بعده؛ وبابٌ مفتوحٌ لمن أراد أن يتعلّم مهارةً جديدةً داخل اللجنة، فمن دخل ناقلًا خرج صانعًا. وأمّا ما لا أستطيعه فأقولُه من الآن: لا أستطيع أن أُرضي كلَّ طلبٍ يأتي في وقتٍ ضيّق، وسأقول «لا» حين يلزم، ومعها سببُها.",
  "أُقدّم نفسي لهذا المقعد لأنّني أرى أنّ ما ينقصنا ليس الطاقة بل الاتّجاه. عندنا أعضاءٌ يبذلون ولا يجدون أين يُوضَع بذلُهم. فأوّلُ عملي أن نكتب معًا، في أسبوعٍ واحد، ما الذي تُريد اللجنةُ أن تكون معروفةً به هذا العام، ثمّ نقيس كلَّ ما نفعله عليه: ما وافقه مضينا فيه، وما خالفه أجّلناه بلا اعتذار. والثاني أن يُعرَف لكلّ عملٍ صاحبُه ومهلتُه في لوحةٍ واحدةٍ يراها الجميع، فينتهي السؤالُ المتكرّر «مَن يتابع هذا؟». والثالث أن نُنصِف من عمل: يُذكَر اسمُه حيث يُعرَض عملُه، ويُكتَب في تقرير الفصل ما أنجزه بالتفصيل لا بالجملة. وأعرف أنّ هذا يحتاج انضباطًا منّي قبل غيري، وهو ما ألتزم به.",
  "لي في اللجنة سنتان، عملتُ فيهما في أكثر من فريق، ورأيتُ كيف يختلف حالُنا باختلاف من يقود. ما أُريده بسيطٌ وصعبٌ معًا: أن يشعر كلُّ عضوٍ أنّ وقتَه محترَم. ومعنى ذلك عمليًّا أن يُطلَب منه العملُ مبكّرًا لا في آخره، وأن يُقال له لماذا هذا العمل مهمّ لا أن يُلقى إليه، وأن يُشكَر حين يُنجِز لا حين يُشتكى منه. وأمّا الخطّة فثلاثُ خطوات: مراجعةُ ما لدينا من أعمالٍ متوقّفة وإغلاقُها أو إسقاطُها صراحةً، فالمعلَّقُ يستهلك انتباهًا بلا مقابل؛ ثمّ تثبيتُ دورةٍ شهريّةٍ للعمل تبدأ وتنتهي في موعدٍ ثابت؛ ثمّ فتحُ بابٍ للتدريب الداخليّ يقوده الأعضاءُ أنفسُهم بالتناوب. وإن لم أُوفَّق للمقعد بقيتُ عاملًا كما كنت.",
];

/** بيانٌ لكلّ مرشّح — بطولٍ حقيقيّ ومختلف، فلا تتساوى الكروتُ كذبًا. */
const pitchOf = (i: number) => PITCH[i % PITCH.length];

/* ══ أدواتُ البذر ═══════════════════════════════════════════════════ */

type SeedElection = {
  id?: string;
  role: ElectedRole;
  committeeId?: number | null;
  departmentId?: number | null;
  status: ElectionStatus;
  createdBy?: string;
  /** مهلٌ نسبيّةٌ بالأيّام من «الآن» (سالبُها ماضٍ). */
  candidacyEndInDays?: number | null;
  votingEndInDays?: number | null;
  openedDaysAgo?: number;
  stalled?: boolean;
  archived?: boolean;
  winnerCandidateId?: string | null;
  cancelReason?: string | null;
};

function seedElection(w: SimWorld, s: SeedElection): string {
  const id = s.id ?? nextId(w, "e");
  const openedAt = w.now - (s.openedDaysAgo ?? 10) * DAY;
  w.elections.push({
    id,
    targetRoleName: s.role,
    targetCommitteeId: s.committeeId ?? null,
    targetDepartmentId: s.departmentId ?? null,
    status: s.status,
    candidacyOpenedAt: openedAt,
    candidacyEnd: s.candidacyEndInDays === undefined || s.candidacyEndInDays === null ? null : w.now + s.candidacyEndInDays * DAY,
    votingOpenedAt: s.status === "voting_open" || s.status === "voting_closed" || s.status === "completed" ? w.now - 2 * DAY : null,
    votingEnd: s.votingEndInDays === undefined || s.votingEndInDays === null ? null : w.now + s.votingEndInDays * DAY,
    stalledAt: s.stalled ? w.now - HOUR : null,
    archivedAt: s.archived || s.status === "completed" || s.status === "cancelled" ? w.now - HOUR : null,
    winnerCandidateId: s.winnerCandidateId ?? null,
    winnerDeclaredAt: s.winnerCandidateId ? w.now - HOUR : null,
    createdAt: openedAt,
    createdBy: s.createdBy ?? "u-hrlead",
    cancelReason: s.cancelReason ?? null,
  });
  writeLog(w, id, s.createdBy ?? "u-hrlead", "election_created", { role_name: s.role });
  return id;
}

type SeedCandidate = {
  id?: string;
  electionId: string;
  userId: string;
  status?: CandidateStatus;
  pitch?: number;
  file?: boolean;
  reviewNote?: string | null;
  reviewedBy?: string | null;
  preferenceRank?: number;
  daysAgo?: number;
};

function seedCandidate(w: SimWorld, s: SeedCandidate): string {
  const id = s.id ?? nextId(w, "c");
  const number = w.candidates.filter((c) => c.electionId === s.electionId).length + 1;
  const status = s.status ?? "pending";
  const at = w.now - (s.daysAgo ?? 6) * DAY;
  const hasFile = s.file ?? number % 2 === 1;
  w.candidates.push({
    id, electionId: s.electionId, userId: s.userId, number, status,
    statement: pitchOf(s.pitch ?? number - 1),
    fileName: hasFile ? "ملف-انتخابي.pdf" : null,
    fileUrl: hasFile ? `${s.userId}/${s.electionId}/candidacy.pdf` : null,
    fileSize: hasFile ? 428_000 : null,
    fileMime: hasFile ? "application/pdf" : null,
    reviewNote: s.reviewNote ?? null,
    reviewedBy: status === "pending" || status === "withdrawn" ? null : s.reviewedBy ?? "u-hrlead",
    reviewedAt: status === "pending" || status === "withdrawn" ? null : at + HOUR,
    submittedAt: at,
    withdrawnAt: status === "withdrawn" ? at + 2 * HOUR : null,
    preferenceRank: s.preferenceRank ?? 1,
  });
  writeLog(w, s.electionId, s.userId, "candidacy_submitted", { candidate_id: id, has_file: hasFile }, at);
  if (status === "approved" || status === "rejected" || status === "needs_edit") {
    writeLog(w, s.electionId, s.reviewedBy ?? "u-hrlead", "candidate_reviewed",
      { candidate_id: id, new_status: status, note: s.reviewNote ?? null }, at + HOUR);
  }
  if (status === "withdrawn") {
    writeLog(w, s.electionId, s.userId, "candidate_withdrawn", { candidate_id: id }, at + 2 * HOUR);
  }
  return id;
}

function seedVote(w: SimWorld, electionId: string, voterId: string, candidateId: string, choice: "approve" | "reject" = "approve") {
  const id = nextId(w, "v");
  w.votes.push({
    id, electionId, voterId, candidateId,
    weight: voteWeight(w, voterId),
    roleSnapshot: memberIn(w, voterId)?.roleName ?? "unknown",
    choice, at: w.now - HOUR,
  });
  writeLog(w, electionId, voterId, "vote_cast", { vote_id: id });
}

/* ══ الشاشاتُ التي يُفتح عليها السيناريو ═══════════════════════════ */

export type ScreenKey = "list" | "detail" | "run" | "apply" | "my" | "candidacy" | "edit" | "vote" | "ballot";

export type Scenario = {
  key: string;
  label: string;
  /** ماذا يُختبَر بهذا العالم — يُعرَض فوق الشاشة. */
  about: string;
  /** ما يُقترَح أن تفعله بالترتيب — خطواتٌ تُقرأ لا تُنفَّذ آليًّا. */
  steps: string[];
  /** أين يُفتح: الشاشة وصاحبُها ومقعدُه. */
  start: { screen: ScreenKey; viewpoint: string; electionId?: string };
  build: (now: number) => SimWorld;
};

/** عالمٌ فارغٌ بساعةٍ معلومة. */
const w0 = (now: number) => emptyWorld(now);

/* ══ السيناريوهات ═══════════════════════════════════════════════════ */

export const SCENARIOS: Scenario[] = [
  {
    key: "competition",
    label: "تنافسٌ عاديّ من أوّله إلى آخره",
    about: "مقعدُ قيادةِ لجنة الرواة، بابُه مفتوحٌ وثلاثةُ مرشّحين ينتظرون المراجعة. هذه هي الدورةُ الكاملة: راجِع ثمّ أغلِق الترشّح ثمّ افتح التصويت ثمّ صوّت بأربع هويّات ثمّ أعلِن الفائز.",
    steps: [
      "بهويّة قائدة الموارد: افتح المقعد، وراجع المرشّحين الثلاثة (اعتماد، طلب تعديل، رفض)",
      "أعِد الحكمَ على من طُلب تعديلُه، ثمّ أغلِق باب الترشّح",
      "افتح التصويت بمدّة ثلاثة أيّام",
      "بدّل الهويّة إلى «عضو لجنة» وصوّت من بابه، ثمّ إلى غيره",
      "عُد مديرًا: أغلِق التصويت، ثمّ أعلِن الأعلى وزنًا (وجرّب إعلان الأقلّ فيُردّ)",
    ],
    start: { screen: "list", viewpoint: "u-hrlead" },
    build: (now) => {
      const w = w0(now);
      const e = seedElection(w, { id: "e-lead-11", role: "committee_leader", committeeId: 11, status: "candidacy_open", candidacyEndInDays: 3, openedDaysAgo: 7 });
      seedCandidate(w, { electionId: e, userId: "u-m1", pitch: 0, file: true });
      seedCandidate(w, { electionId: e, userId: "u-m2", pitch: 1, file: false });
      seedCandidate(w, { electionId: e, userId: "u-m3", pitch: 2, file: true });
      return w;
    },
  },
  {
    key: "review",
    label: "أحكامُ المراجعة الخمسة معًا",
    about: "مقعدٌ واحدٌ فيه مرشّحٌ من كلّ حال: قيد المراجعة، معتمَد، يحتاج تعديلًا، مرفوض، منسحب. تُرى نغمةُ كلّ كرت وشارتُه وسطرُ الحكم المنسوب إلى صاحبه، ويُجرَّب إرجاعُ المنسحب.",
    steps: [
      "افتح المقعد من القائمة، وبدّل بين الجدول والكروت",
      "افتح المنسحب: يظهر تنبيهُ الإرجاع وزرُّ «إعادة الترشّح»",
      "افتح «قيد المراجعة»: الأحكامُ الثلاثة بطاقات، والسببُ لا يظهر إلّا لمن يوجبه",
      "بدّل الهويّة إلى «عضو الموارد»: الغرفةُ نفسُها بلا زرٍّ واحد",
    ],
    start: { screen: "detail", viewpoint: "u-hrlead", electionId: "e-lead-11" },
    build: (now) => {
      const w = w0(now);
      const e = seedElection(w, { id: "e-lead-11", role: "committee_leader", committeeId: 11, status: "candidacy_open", candidacyEndInDays: 2, openedDaysAgo: 9 });
      seedCandidate(w, { electionId: e, userId: "u-m1", status: "pending", pitch: 0, file: true });
      seedCandidate(w, { electionId: e, userId: "u-m2", status: "approved", pitch: 1, file: true });
      seedCandidate(w, { electionId: e, userId: "u-m3", status: "needs_edit", pitch: 2, file: false, reviewNote: "بيانُك يذكر اسمَ فريقك وهو يدلّ عليك؛ أعِد صياغةَ الفقرة الأولى بلا ما يُعرِّفك، ثمّ أعِد الإرسال." });
      seedCandidate(w, { electionId: e, userId: "u-m4", status: "rejected", pitch: 3, file: false, reviewNote: "تقدّمتَ لمقعدٍ خارج نطاق لجنتك، ولا تصحّ مراجعتُه هنا." });
      seedCandidate(w, { electionId: e, userId: "u-deputy", status: "withdrawn", pitch: 4, file: true });
      return w;
    },
  },
  {
    key: "confidence",
    label: "تزكيةٌ جارية: تأييدٌ أو اعتراض",
    about: "معتمَدٌ واحدٌ لا غير، فالبطاقةُ تصير رأيًا فيه: تأييدٌ أو اعتراض. صوّت بهويّاتٍ عدّة فترى الكفّتين تتغيّران في لوحة الإدارة، ثمّ أغلِق التصويت: إن غلب التأييدُ صحّ الإعلان، وإلّا **أُلغي الانتخابُ من نفسه**.",
    steps: [
      "بهويّة «عضو لجنة»: افتح بابَ التصويت فترى شاشةَ التزكية (لا محطّات)",
      "أيِّد أو اعترض، وجرّب الصوتَ الثاني فيُردّ",
      "بدّل الهويّة وكرّر حتّى يغلب أحدُ الرأيين",
      "بهويّة قائدة الموارد: أغلِق التصويت وانظر ما يقع",
    ],
    start: { screen: "vote", viewpoint: "u-m1", electionId: "e-dep-11" },
    build: (now) => {
      const w = w0(now);
      const e = seedElection(w, { id: "e-dep-11", role: "deputy_committee_leader", committeeId: 11, status: "voting_open", votingEndInDays: 2, openedDaysAgo: 12 });
      seedCandidate(w, { electionId: e, userId: "u-m2", status: "approved", pitch: 1, file: true });
      seedCandidate(w, { electionId: e, userId: "u-m3", status: "rejected", pitch: 2, reviewNote: "بيانُك أقصرُ من الحدّ ولم يُعَد بعد الطلب." });
      return w;
    },
  },
  {
    key: "confidence_falling",
    label: "تزكيةٌ على وشك السقوط",
    about: "تزكيةٌ اعتراضُها يغلب تأييدَها الآن. أغلِق التصويت (أو قدِّم الساعة فتغلقه الكنّاسة) فيسقط الترشيحُ ويُلغى الانتخابُ آليًّا بسببٍ مسجَّلٍ في سجلّه.",
    steps: [
      "بهويّة قائدة الموارد: انظر «وزن التأييد» و«وزن الاعتراض» في صدر الصفحة",
      "أغلِق التصويت، ثمّ اقرأ سجلَّ الانتخاب في الذيل",
      "أو قدِّم الساعةَ يومين ودع الكنّاسة تفعلها",
    ],
    start: { screen: "detail", viewpoint: "u-hrlead", electionId: "e-dep-11" },
    build: (now) => {
      const w = w0(now);
      const e = seedElection(w, { id: "e-dep-11", role: "deputy_committee_leader", committeeId: 11, status: "voting_open", votingEndInDays: 1, openedDaysAgo: 12 });
      const c = seedCandidate(w, { electionId: e, userId: "u-m2", status: "approved", pitch: 1, file: true });
      // والاعتراضُ يقع على المرشّح نفسِه لا على فراغ (قيدُ القاعدة: كلُّ ورقةٍ لها مرشّح)،
      // ولا يُحسب في وزنه لأنّ الوزنَ مجموعُ المؤيّدين وحدَهم.
      seedVote(w, e, "u-m1", c, "approve");
      seedVote(w, e, "u-m3", c, "reject");
      seedVote(w, e, "u-m4", c, "reject");
      seedVote(w, e, "u-pres", c, "reject");
      return w;
    },
  },
  {
    key: "stalled",
    label: "مقعدٌ تعثّر: ثلاثةُ أبوابٍ للمدير",
    about: "انقضت مهلةُ الترشّح ولم يتقدّم أحد، فوقف المقعدُ ولم يُلغَ. الآلةُ لا تمدّد ولا تُعدِم: تقف وتنادي صاحبَ القرار. الأبوابُ ثلاثة: مدِّد المهلة، أو كلِّف شاغلًا، أو ألغِ بسبب.",
    steps: [
      "اقرأ التنبيهَ الأصفر وشارةَ «بانتظار قرار»، ولاحظ سقوطَ زرّ «إغلاق الترشّح»",
      "جرّب «تمديد المهلة» بموعدٍ مستقبليّ: يسقط الوسمُ ويعود المقعدُ إلى مساره",
      "أعِد تحميلَ السيناريو ثمّ جرّب «تكليف شاغل» (السببُ عشرةُ أحرفٍ فأكثر)",
      "بدّل الهويّة إلى «عضو لجنة»: بابُ الترشّح ما زال مفتوحًا له، وترشُّحُه يرفع الوقوف",
    ],
    start: { screen: "detail", viewpoint: "u-hrlead", electionId: "e-lead-12" },
    build: (now) => {
      const w = w0(now);
      const e = seedElection(w, { id: "e-lead-12", role: "committee_leader", committeeId: 21, status: "candidacy_open", candidacyEndInDays: -1, openedDaysAgo: 14, stalled: true });
      writeLog(w, e, null, "candidacy_stalled", { active_count: 0 });
      return w;
    },
  },
  {
    key: "self_candidate",
    label: "المرشّحُ ناخبٌ: ورقتُه تُعلَّم ولا تُختار",
    about: "تصويتٌ جارٍ وأنت أحدُ مرشّحيه. اللائحةُ تمنعك أن تزكّي نفسَك، فتُعلَّم ورقتُك «ترشّحك» وتُنزَع عنها رقعةُ الضغط قبل أن تمدّ يدك. ويبقى لك أن تختار منافسًا، أو تدع البطاقةَ فلا تختم.",
    steps: [
      "بهويّة «عضو لجنة» (وهو مرشّحٌ هنا): ادخل بطاقتك من باب التصويت",
      "في محطّة الاختيار: ورقتُك موسومةٌ ولا تُضغَط، ولا مهربَ ثالثَ تحت الخيارات",
      "اختر منافسًا واختم، أو اخرج بلا ختمٍ فبطاقتُك تبقى مفتوحةً حتّى يُغلق الباب",
      "بهويّة قائدة الموارد: افتح «تفصيل الأصوات» وانظر أين وقع صوتُه",
    ],
    start: { screen: "vote", viewpoint: "u-m1", electionId: "e-lead-11" },
    build: (now) => {
      const w = w0(now);
      const e = seedElection(w, { id: "e-lead-11", role: "committee_leader", committeeId: 11, status: "voting_open", votingEndInDays: 2, openedDaysAgo: 12 });
      seedCandidate(w, { electionId: e, userId: "u-m1", status: "approved", pitch: 0, file: true });
      seedCandidate(w, { electionId: e, userId: "u-m2", status: "approved", pitch: 1, file: true });
      seedCandidate(w, { electionId: e, userId: "u-m3", status: "approved", pitch: 2, file: false });
      return w;
    },
  },
  {
    key: "sole_self",
    label: "الوحيدُ يرى مقعدَه ولا يفعل فيه",
    about: "أضيقُ حالةٍ في النظام: المرشّحُ المعتمَدُ الوحيد هو صاحبُ المقعد المطروح. لا يُسأل أن يزكّي نفسَه ولا أن يعترض عليها، ولا امتناعَ في النظام يُغلق به ورقتَه (نُزع ٢٠٢٦-٠٨-١٥) : فيبقى المقعدُ في بابه اطّلاعًا، ويسقط عنه الصندوقُ وحدَه.",
    steps: [
      "بهويّة «عضو لجنة» (وهو مرشّحُ المقعد الوحيد): افتح باب التصويت، فزرُّ المقعد «اطّلع»",
      "ادخله: بيانُك وملفُّك وموعدُ الإغلاق، بلا تأييدٍ ولا اعتراضٍ ولا زرِّ ختم",
      "بدّل الهويّة إلى عضوٍ آخر في اللجنة: البطاقةُ عنده تزكيةٌ تُؤيَّد أو يُعترَض عليها",
    ],
    start: { screen: "vote", viewpoint: "u-m1", electionId: "e-lead-11" },
    build: (now) => {
      const w = w0(now);
      const e = seedElection(w, { id: "e-lead-11", role: "committee_leader", committeeId: 11, status: "voting_open", votingEndInDays: 3, openedDaysAgo: 12 });
      seedCandidate(w, { electionId: e, userId: "u-m1", status: "approved", pitch: 0, file: true });
      seedCandidate(w, { electionId: e, userId: "u-m2", status: "withdrawn", pitch: 1 });
      return w;
    },
  },
  {
    key: "declare_winner",
    label: "أعلِن الفائز وخذ بطاقته",
    about: "صندوقٌ أُغلق ونتيجتُه ظاهرة. لا تفتّش عن أحدٍ في القائمة: القاعدةُ تعرف المتصدّر (لا تقبل إعلانَ من ليس الأعلى وزنًا)، فالشريطُ يحمل **زرًّا واحدًا باسمه**. أعلِنه ثمّ استخرج بطاقةَ النتيجة التي تُرسَل في قروب اللجنة.",
    steps: [
      "اقرأ شريط الأفعال: «إعلان الفائزة نورة العتيبي»، اسمُها في الزرّ لا في القائمة",
      "اضغطه: التأكيدُ يقول حصيلتَها قبل وقوع الفعل، وأثرَه (إسنادُ المنصب وقفلُ الانتخاب)",
      "بعد الإعلان: من تنبيه «اكتمل الانتخاب» اضغط «بطاقة النتيجة» فتُنزَّل صورةٌ مربّعة",
      "وفي الجوّال تُفتَح ورقةُ المشاركة ومعها نصُّ التهنئة، فتذهب إلى القروب مباشرةً",
    ],
    start: { screen: "detail", viewpoint: "u-hrlead", electionId: "e-lead-11" },
    build: (now) => {
      const w = w0(now);
      const e = seedElection(w, { id: "e-lead-11", role: "committee_leader", committeeId: 11, status: "voting_closed", openedDaysAgo: 16 });
      const nora = seedCandidate(w, { electionId: e, userId: "u-m2", status: "approved", pitch: 1, file: true });
      const ahmad = seedCandidate(w, { electionId: e, userId: "u-m1", status: "approved", pitch: 0, file: true });
      const khaled = seedCandidate(w, { electionId: e, userId: "u-m3", status: "approved", pitch: 2, file: false });
      // صدارةٌ لا لبس فيها: الأعلى وزنًا هو الأعلى عددًا أيضًا، فلا يختلف الزرُّ عن الحدس
      seedVote(w, e, "u-pres", nora);
      seedVote(w, e, "u-hrlead", nora);
      seedVote(w, e, "u-m4", nora);
      seedVote(w, e, "u-m1", nora);
      seedVote(w, e, "u-advisor", ahmad);
      seedVote(w, e, "u-m3", ahmad);
      seedVote(w, e, "u-m2", khaled);
      return w;
    },
  },
  {
    key: "declare_tie",
    label: "تعادُلٌ في الصدارة: القرارُ لك",
    about: "مقعدٌ تساوى متصدّراه في الوزن. القاعدةُ تقبل أيًّا منهما، فلا ترجّح الشاشةُ أحدَهما بترتيبٍ لا معنى له: يصير الزرُّ «تساوى المتصدّرون، اختر»، وتفتح نافذةً تحت كلّ اسمٍ حصيلتُه.",
    steps: [
      "اضغط «تساوى المتصدّرون، اختر» واقرأ حصيلةَ كلٍّ تحت اسمه",
      "اختر أحدَهما: لفظُ الزرّ يتبع جنسَه (الفائز/الفائزة)",
      "أعلِنه، ثمّ استخرج بطاقة النتيجة",
    ],
    start: { screen: "detail", viewpoint: "u-hrlead", electionId: "e-lead-11" },
    build: (now) => {
      const w = w0(now);
      const e = seedElection(w, { id: "e-lead-11", role: "committee_leader", committeeId: 11, status: "voting_closed", openedDaysAgo: 16 });
      const nora = seedCandidate(w, { electionId: e, userId: "u-m2", status: "approved", pitch: 1, file: true });
      const ahmad = seedCandidate(w, { electionId: e, userId: "u-m1", status: "approved", pitch: 0, file: true });
      const khaled = seedCandidate(w, { electionId: e, userId: "u-m3", status: "approved", pitch: 2, file: false });
      // ناخبان وزنُهما ٤ لكلٍّ من الاثنين ⇒ تعادلٌ في الوزن لا في العدد وحدَه
      seedVote(w, e, "u-pres", nora);
      seedVote(w, e, "u-advisor", ahmad);
      seedVote(w, e, "u-m4", khaled);
      return w;
    },
  },
  {
    key: "department_seats",
    label: "مقاعدُ القسم تُحسَم معًا: أفضليّةٌ ووصيف",
    about: "ثلاثةُ مقاعدَ في قسمٍ واحد أُغلق تصويتُها، وعضوٌ واحدٌ تصدّر مقعدين. الحسمُ الجماعيّ يعطيه مفضَّله ويُقصيه من الآخر فيرتقي الوصيف، وقد يتصدّر الوصيفُ مقعدًا ثالثًا فتُعاد الكرّة.",
    steps: [
      "افتح أيَّ مقعدٍ من الثلاثة: زرُّ «إعلان فائزي القسم معًا» بدل الإعلان المنفرد",
      "جرّب فتحَ مرشّحٍ وإعلانَه وحدَه: يُحجَب لأنّ الحسمَ لا يصحّ منفردًا",
      "اضغط «إعلان فائزي القسم معًا» ثمّ ارجع إلى القائمة: ثلاثةُ كروتِ منتخَبين",
      "اقرأ سجلَّ كلّ مقعد: ترتيبُ الإعلان يقول كيف حُسم",
    ],
    start: { screen: "list", viewpoint: "u-pres" },
    build: (now) => {
      const w = w0(now);
      const head = seedElection(w, { id: "e-head-1", role: "department_head", departmentId: 1, status: "voting_closed", openedDaysAgo: 20 });
      const lead = seedElection(w, { id: "e-lead-11", role: "committee_leader", committeeId: 11, status: "voting_closed", openedDaysAgo: 20 });
      const dep = seedElection(w, { id: "e-dep-11", role: "deputy_committee_leader", committeeId: 11, status: "voting_closed", openedDaysAgo: 20 });

      // أحمدُ يتصدّر التنسيقَ والقيادةَ معًا، ومفضَّلُه القيادة (رتبةٌ ١ في مقعدها)
      const a1 = seedCandidate(w, { electionId: head, userId: "u-m1", status: "approved", pitch: 0, file: true, preferenceRank: 2 });
      const a2 = seedCandidate(w, { electionId: lead, userId: "u-m1", status: "approved", pitch: 0, file: true, preferenceRank: 1 });
      const b1 = seedCandidate(w, { electionId: head, userId: "u-m2", status: "approved", pitch: 1, file: false, preferenceRank: 1 });
      const b2 = seedCandidate(w, { electionId: lead, userId: "u-m3", status: "approved", pitch: 2, file: true, preferenceRank: 1 });
      const c1 = seedCandidate(w, { electionId: dep, userId: "u-m4", status: "approved", pitch: 3, file: false, preferenceRank: 1 });

      seedVote(w, head, "u-pres", a1);
      seedVote(w, head, "u-m3", a1);
      seedVote(w, head, "u-m4", b1);
      seedVote(w, lead, "u-pres", a2);
      seedVote(w, lead, "u-m2", a2);
      seedVote(w, lead, "u-m4", b2);
      seedVote(w, dep, "u-m1", c1);
      seedVote(w, dep, "u-m2", c1);
      return w;
    },
  },
  {
    key: "joint_blocked",
    label: "إعلانٌ منفردٌ يُردّ",
    about: "مقعدٌ أُغلق تصويتُه، وفي قسمه مقعدٌ آخر ما زال في التصويت يخوضه أحدُ مرشّحيه. القاعدةُ ترفض الإعلانَ المنفرد (فقد يفوز بالاثنين والمفضَّلُ لا يُعرَف بعد)، والشاشةُ تقول لك ما تفعله.",
    steps: [
      "افتح المقعد المغلق: يظهر سطرٌ يقول إنّ مقعدًا آخر لم يُغلق تصويتُه",
      "افتح مرشّحًا معتمَدًا: لا زرَّ إعلانٍ في ذيل نافذته",
      "أغلِق تصويتَ المقعد الآخر، ثمّ عُد: صار الزرُّ «إعلان فائزي القسم معًا»",
    ],
    start: { screen: "detail", viewpoint: "u-hrlead", electionId: "e-lead-11" },
    build: (now) => {
      const w = w0(now);
      const lead = seedElection(w, { id: "e-lead-11", role: "committee_leader", committeeId: 11, status: "voting_closed", openedDaysAgo: 18 });
      const dep = seedElection(w, { id: "e-dep-11", role: "deputy_committee_leader", committeeId: 11, status: "voting_open", votingEndInDays: 2, openedDaysAgo: 18 });
      const a = seedCandidate(w, { electionId: lead, userId: "u-m1", status: "approved", pitch: 0, file: true, preferenceRank: 1 });
      seedCandidate(w, { electionId: lead, userId: "u-m2", status: "approved", pitch: 1, file: false });
      seedCandidate(w, { electionId: dep, userId: "u-m1", status: "approved", pitch: 0, file: true, preferenceRank: 2 });
      seedCandidate(w, { electionId: dep, userId: "u-m3", status: "approved", pitch: 2, file: true });
      seedVote(w, lead, "u-pres", a);
      seedVote(w, lead, "u-m3", a);
      return w;
    },
  },
  {
    key: "candidate_journey",
    label: "رحلةُ العضو: ترشّحٌ وتعديلٌ وسحب",
    about: "وجهُ العضو كاملًا: بابُ الترشّح بفرصه، وصفحةُ البيان بحدَّي المئة والأربعة آلاف، وسِجلُّ ترشُّحك بقسمَيه، والرحلةُ محطّةً محطّة، والتعديلُ والسحب.",
    steps: [
      "بهويّة «عضو لجنة»: باب الترشُّح ← بوّابةُ الشروط ← صفحةُ البيان (جرّب بيانًا قصيرًا فيُردّ)",
      "أرسِل، ثمّ ادخل «سِجلّ ترشُّحي» فترى كرتَ الفرصة، ومنه إلى صفحة الترشّح",
      "عدِّل ترشّحك، ثمّ اسحبه، ولاحظ انتقالَ الكرت إلى «المؤرشف»",
      "بهويّة قائدة الموارد: اطلب تعديلًا بملاحظة، ثمّ عُد للعضو: الملاحظةُ في رحلته بلا اسمِ قائلها",
    ],
    start: { screen: "run", viewpoint: "u-m1" },
    build: (now) => {
      const w = w0(now);
      const lead = seedElection(w, { id: "e-lead-11", role: "committee_leader", committeeId: 11, status: "candidacy_open", candidacyEndInDays: 4, openedDaysAgo: 3 });
      const dep = seedElection(w, { id: "e-dep-11", role: "deputy_committee_leader", committeeId: 11, status: "candidacy_open", candidacyEndInDays: 4, openedDaysAgo: 3 });
      seedCandidate(w, { electionId: dep, userId: "u-m1", status: "needs_edit", pitch: 0, file: true, reviewNote: "اذكر في بيانك خطّتك للفصل الأوّل بوضوح، والفقرةُ الأخيرة تحتاج اختصارًا." });
      seedCandidate(w, { electionId: lead, userId: "u-m2", status: "pending", pitch: 1, file: false });
      // ترشّحٌ مؤرشفٌ من دورةٍ ماضية — به يُختبَر قسمُ «المؤرشف» ومرساةُ الدورة
      const old = seedElection(w, { id: "e-old", role: "committee_leader", committeeId: 11, status: "cancelled", openedDaysAgo: 120, candidacyEndInDays: -110, cancelReason: "أُلغيت الدورةُ السابقة لتعارضها مع الاختبارات." });
      seedCandidate(w, { electionId: old, userId: "u-m1", status: "approved", pitch: 3, file: false, daysAgo: 115 });
      return w;
    },
  },
  {
    key: "preference",
    label: "أفضليّةُ المقاعد في استمارة الترشّح",
    about: "للعضو ترشّحٌ قائمٌ في قسمه، فتظهر له في الاستمارة **خانةُ الأفضليّة** بكلّ مقاعد القسم لا خيارين. وبها يُحسَم مصيرُه إن تصدّر أكثر من مقعد.",
    steps: [
      "بهويّة «عضو لجنة»: باب الترشُّح ← ترشّح للمقعد الثاني",
      "أسفلَ الاستمارة: كلُّ مقاعد القسم، ومفضَّلُك القائمُ معلَّمٌ فيها",
      "بدّل المفضَّل وأرسِل، ثمّ عُد إلى الاستمارة الأخرى: العلامةُ انتقلت",
    ],
    start: { screen: "run", viewpoint: "u-m1" },
    build: (now) => {
      const w = w0(now);
      const head = seedElection(w, { id: "e-head-1", role: "department_head", departmentId: 1, status: "candidacy_open", candidacyEndInDays: 5, openedDaysAgo: 4 });
      const lead = seedElection(w, { id: "e-lead-11", role: "committee_leader", committeeId: 11, status: "candidacy_open", candidacyEndInDays: 5, openedDaysAgo: 4 });
      seedElection(w, { id: "e-dep-11", role: "deputy_committee_leader", committeeId: 11, status: "candidacy_open", candidacyEndInDays: 5, openedDaysAgo: 4 });
      seedCandidate(w, { electionId: lead, userId: "u-m1", status: "pending", pitch: 0, file: true, preferenceRank: 1 });
      seedCandidate(w, { electionId: head, userId: "u-m2", status: "pending", pitch: 1, file: false });
      return w;
    },
  },
  {
    key: "deadlines",
    label: "المواعيدُ والكنّاسة",
    about: "أربعةُ مقاعدَ بمواعيدَ مختلفة: واحدٌ ينقضي بعد ساعة وفيه مرشّحون، وواحدٌ ينقضي وهو خالٍ، وتصويتٌ ينتهي بعد ساعتين، ومقعدٌ بلا موعدٍ يُغلق بيدك. قدِّم الساعةَ وانظر ما تفعله الكنّاسة.",
    steps: [
      "اقرأ عمودَ «يُغلق تلقائيًّا» في الجدول، ثمّ بدّل إلى الكروت واقرأ العدّ الحيّ",
      "قدِّم الساعةَ يومًا واحدًا (زرُّ الساعة في الشريط)",
      "المقعدُ ذو المرشّحين أُغلق ترشُّحُه، والخالي **وقف** ولم يُلغَ، والتصويتُ أُغلق",
      "افتح سجلَّ كلٍّ منها: الفاعلُ «النظام» لا شخص",
    ],
    start: { screen: "list", viewpoint: "u-hrlead" },
    build: (now) => {
      const w = w0(now);
      const a = seedElection(w, { id: "e-lead-11", role: "committee_leader", committeeId: 11, status: "candidacy_open", candidacyEndInDays: 0.04, openedDaysAgo: 7 });
      seedCandidate(w, { electionId: a, userId: "u-m1", status: "approved", pitch: 0, file: true });
      seedCandidate(w, { electionId: a, userId: "u-m2", status: "approved", pitch: 1, file: false });
      seedElection(w, { id: "e-lead-21", role: "committee_leader", committeeId: 21, status: "candidacy_open", candidacyEndInDays: 0.04, openedDaysAgo: 7 });
      const c = seedElection(w, { id: "e-dep-11", role: "deputy_committee_leader", committeeId: 11, status: "voting_open", votingEndInDays: 0.08, openedDaysAgo: 12 });
      const cc = seedCandidate(w, { electionId: c, userId: "u-m3", status: "approved", pitch: 2, file: true });
      seedCandidate(w, { electionId: c, userId: "u-m4", status: "approved", pitch: 3, file: false });
      seedVote(w, c, "u-pres", cc);
      seedElection(w, { id: "e-head-1", role: "department_head", departmentId: 1, status: "candidacy_open", candidacyEndInDays: null, openedDaysAgo: 2 });
      return w;
    },
  },
  {
    key: "archive",
    label: "المخزنُ النهائيّ: مكتملٌ وملغى",
    about: "تبويبا «المكتملة» و«الملغاة»: كرتُ المنتخَب بصورته وتاجه وسطرِ فوزه، والملغى بعقدته الأخيرة منعًا لا كأسًا. وكلاهما لا فعلَ فيه، فيسقط شريطُ الدورة.",
    steps: [
      "بدّل بين التبويبات الثلاثة، ولاحظ سقوطَ عمودَي الحالة والمهلة في المخزن",
      "افتح مقعدًا مكتملًا: تنبيهُ الاكتمال باسم الفائز، والمرشّحون لوحةُ أرقام",
      "افتح مقعدًا ملغى: يبقى المرشّحون والأصوات كما هي، والسببُ في السجلّ",
    ],
    start: { screen: "list", viewpoint: "u-pres" },
    build: (now) => {
      const w = w0(now);
      const done = seedElection(w, { id: "e-lead-11", role: "committee_leader", committeeId: 11, status: "completed", openedDaysAgo: 40 });
      const win = seedCandidate(w, { electionId: done, userId: "u-m1", status: "approved", pitch: 0, file: true, daysAgo: 35 });
      const lose = seedCandidate(w, { electionId: done, userId: "u-m2", status: "approved", pitch: 1, file: false, daysAgo: 35 });
      seedVote(w, done, "u-pres", win);
      seedVote(w, done, "u-exec", win);
      seedVote(w, done, "u-m3", win);
      seedVote(w, done, "u-m4", lose);
      w.elections.find((e) => e.id === done)!.winnerCandidateId = win;
      w.elections.find((e) => e.id === done)!.winnerDeclaredAt = now - HOUR;
      w.seatOverride["u-m1"] = { roleName: "committee_leader", committeeId: 11, departmentId: null };
      writeLog(w, done, "u-hrlead", "declare_winner", { candidate_id: win, auto_archived: true });
      writeLog(w, done, "u-hrlead", "archived", { auto: true, trigger: "declare_winner" });

      const killed = seedElection(w, { id: "e-dep-11", role: "deputy_committee_leader", committeeId: 11, status: "cancelled", openedDaysAgo: 30, cancelReason: "تغيّرت هيكلةُ اللجنة فلم يعد للمقعد محلّ." });
      seedCandidate(w, { electionId: killed, userId: "u-m3", status: "approved", pitch: 2, file: true, daysAgo: 28 });
      seedCandidate(w, { electionId: killed, userId: "u-m4", status: "pending", pitch: 3, daysAgo: 28 });
      writeLog(w, killed, "u-pres", "cancelled", { reason: "تغيّرت هيكلةُ اللجنة فلم يعد للمقعد محلّ." });
      return w;
    },
  },
  {
    key: "empty",
    label: "لا انتخاباتٍ بعد",
    about: "الحالاتُ الفارغة في كلّ باب: غرفةُ الإدارة بلا مقاعد، وبابُ الترشّح بلا فرصة، وبابُ التصويت بلا بطاقة، والسجلُّ بلا ترشّح. تُرى الحالةُ الفارغةُ الصحيحةُ في كلٍّ.",
    steps: [
      "غرفةُ الإدارة: «لا انتخابات بعد» بزرّ الإنشاء في متنها",
      "بدّل الهويّة إلى «عضو لجنة» وافتح أبوابَه الثلاثة",
      "افتح نافذةَ «انتخاب جديد» وافتح أوّلَ مقعد",
    ],
    start: { screen: "list", viewpoint: "u-hrlead" },
    build: (now) => w0(now),
  },
  {
    key: "all_states",
    label: "العالمُ كلُّه: كلّ حالةٍ في شاشةٍ واحدة",
    about: "ستُّ حالاتٍ وأعلامُها معًا في القائمة: مفتوحٌ موقوت، مفتوحٌ بلا موعد، متعثّر، مغلقُ ترشّح، تصويتٌ جارٍ، تصويتٌ مغلق، مكتمل، وملغى. به تُقاس قسمةُ «بانتظارك» وشاراتُ الحالة وكروتُ المسار.",
    steps: [
      "تبويبُ «الجارية»: قسمةُ «بانتظارك» ثمّ «تجري وحدها» في الكروت والجدول",
      "بدّل بين الجدول والكروت، وقس الفرق في الأعمدة",
      "بدّل الهويّة إلى «عضو الموارد»: الغرفةُ للقراءة كلُّها",
      "بدّل إلى «مستشار الرئيس»: لا غرفةَ له أصلًا، وله بابُ تصويتٍ في كلّ مقعد",
    ],
    start: { screen: "list", viewpoint: "u-hrlead" },
    build: (now) => {
      const w = w0(now);
      const a = seedElection(w, { id: "e-a", role: "committee_leader", committeeId: 11, status: "candidacy_open", candidacyEndInDays: 3, openedDaysAgo: 5 });
      seedCandidate(w, { electionId: a, userId: "u-m1", status: "pending", pitch: 0, file: true });
      seedCandidate(w, { electionId: a, userId: "u-m2", status: "approved", pitch: 1, file: false });

      seedElection(w, { id: "e-b", role: "deputy_committee_leader", committeeId: 21, status: "candidacy_open", candidacyEndInDays: null, openedDaysAgo: 2 });

      seedElection(w, { id: "e-c", role: "committee_leader", committeeId: 21, status: "candidacy_open", candidacyEndInDays: -1, openedDaysAgo: 15, stalled: true });

      const d = seedElection(w, { id: "e-d", role: "deputy_committee_leader", committeeId: 11, status: "candidacy_closed", openedDaysAgo: 16, candidacyEndInDays: -2 });
      seedCandidate(w, { electionId: d, userId: "u-m3", status: "approved", pitch: 2, file: true });
      seedCandidate(w, { electionId: d, userId: "u-m4", status: "approved", pitch: 3, file: false });

      const e = seedElection(w, { id: "e-e", role: "department_head", departmentId: 2, status: "voting_open", votingEndInDays: 2, openedDaysAgo: 20 });
      const e1 = seedCandidate(w, { electionId: e, userId: "u-m7", status: "approved", pitch: 4, file: true });
      seedVote(w, e, "u-pres", e1);

      const f = seedElection(w, { id: "e-f", role: "committee_leader", committeeId: 12, status: "voting_closed", openedDaysAgo: 22 });
      const f1 = seedCandidate(w, { electionId: f, userId: "u-m5", status: "approved", pitch: 0, file: true });
      const f2 = seedCandidate(w, { electionId: f, userId: "u-m6", status: "approved", pitch: 1, file: false });
      seedVote(w, f, "u-pres", f1);
      seedVote(w, f, "u-m5", f2);

      const g = seedElection(w, { id: "e-g", role: "department_head", departmentId: 1, status: "completed", openedDaysAgo: 60 });
      const g1 = seedCandidate(w, { electionId: g, userId: "u-m2", status: "approved", pitch: 2, file: true, daysAgo: 55 });
      seedVote(w, g, "u-pres", g1);
      seedVote(w, g, "u-exec", g1);
      w.elections.find((x) => x.id === g)!.winnerCandidateId = g1;
      w.elections.find((x) => x.id === g)!.winnerDeclaredAt = now - 3 * DAY;
      w.seatOverride["u-m2"] = { roleName: "department_head", committeeId: null, departmentId: 1 };
      writeLog(w, g, "u-pres", "declare_winner", { candidate_id: g1, auto_archived: true });

      seedElection(w, { id: "e-h", role: "deputy_committee_leader", committeeId: 12, status: "cancelled", openedDaysAgo: 45, cancelReason: "تعذّر إتمامُ الدورة في موعدها." });
      return w;
    },
  },
];

export const scenarioOf = (key: string) => SCENARIOS.find((s) => s.key === key) ?? SCENARIOS[0];
