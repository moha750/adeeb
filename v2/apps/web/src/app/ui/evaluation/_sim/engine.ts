/**
 * **محرّكُ محاكي تقييم القيادات** (٢٠٢٦-١٠-٢٧، طلبُ محمد قبل الرفع: «نجرّب ونعيش كيف يظهر لجميع الأطراف»).
 *
 * أدِيبٌ صغيرٌ في الذاكرة: قسمان وثلاثُ لجان، ومجلسٌ من أربعة، وأعضاء. يمرّ عليه زمنُ دورةٍ واحدة
 * (قبل الموعد، فالأيّام الثلاثة، فالحكم)، ويُرى من عينِ أيِّ واحدٍ منهم. **وما يُحاكى هنا ثلاثة**:
 *
 * - **الحسابُ حقيقيّ**: الحكمُ من `recordFor` في `lib/evaluation/score.ts` نفسِها، لا نسخةً منها.
 * - **نصوصُ الإشعارات حقيقيّة**: من `CATALOG` نفسِه بجنس قارئها، ومن يصله منها كما في الدليل.
 * - **الشاشاتُ حقيقيّة**: «مسار» و«ميزان» و«أقسامٌ وصفوف» تُغذّى بأشكال `data.ts` نفسِها.
 *
 * **وما هو نسخةٌ من القاعدة** (فيُختبر هناك لا هنا): من يقيّم من (`_evaluation_raters`)، والاستثناءُ
 * بالأسابيع الأربعة، والعودةُ إلى اللجنة السابقة، ومنطقُ التصحيح. نُسخت قواعدُها كما هي، وبلا مشرفين
 * على اللجان (`committee_supervision`): لا أثرَ لهم في الصورة.
 *
 * **وأصواتُ الآخرين مشتقّةٌ لا مخزونة**: لكلّ مقيَّمٍ «مزاجٌ» و«مشاركة» يضبطهما المجرِّب، وتُحسب منهما أوراقُ
 * من لم يتقمّصه بعد، فتتغيّر المشاركةُ أمامه حين يغيّر الضبط. وتُجمَّد عند الإغلاق. ومن تقمّصه المجرِّبُ
 * أثناء الأيام الثلاثة صار أوراقُه بيده وحده (`played`): لا يُصوَّت عنه.
 */
import { CATALOG, type KindKey } from "@/lib/notifications/catalog";
import type { Address, Gender, Level } from "@/lib/notifications/types";
import { recordFor, type RecordResult } from "@/lib/evaluation/score";
import type { CycleRow, ElectorRow, MyResultRow, SheetRow, TargetRow } from "../../../dashboard/evaluation/data";
import type { EvaluatedRole, Part, Verdict } from "../../../dashboard/evaluation/vocab";

// ══ الهيكل ════════════════════════════════════════════════════════════════

export type Role =
  | "club_president"
  | "executive_council_president"
  | "hr_committee_leader"
  | "qa_committee_leader"
  | "department_head"
  | "committee_leader"
  | "deputy_committee_leader"
  | "committee_member";

export type Seat = { role: Role; committee: number | null; department: number | null; active: boolean; assignedAt: string };
export type Person = { id: string; name: string; gender: "male" | "female"; seats: Seat[] };

export const DEPARTMENTS: Record<number, string> = { 1: "قسم الإنتاج الإعلامي", 2: "قسم الفعاليات" };
export const COMMITTEES: { id: number; name: string; department: number }[] = [
  { id: 11, name: "لجنة التصوير", department: 1 },
  { id: 12, name: "لجنة التصميم", department: 1 },
  { id: 21, name: "لجنة الفعاليات", department: 2 },
];
const committee = (id: number | null) => COMMITTEES.find((c) => c.id === id) ?? null;

const OLD = "2026-09-01T09:00:00Z";
const seat = (role: Role, committee: number | null = null, department: number | null = null, extra: Partial<Seat> = {}): Seat => ({
  role, committee, department, active: true, assignedAt: OLD, ...extra,
});
const P = (id: string, name: string, gender: "male" | "female", ...seats: Seat[]): Person => ({ id, name, gender, seats });

/** الأشخاصُ الذين يُتقمَّصون، بترتيب قائمة المحاكي، ومعهم سطرٌ يقول لماذا هم هنا. */
export const PERSONAS: { id: string; group: string; why: string }[] = [
  { id: "mohammed", group: "الإدارة", why: "يدير التقييم ويقيّم الجميع من المجلس" },
  { id: "sara", group: "الإدارة", why: "قائدة الموارد: التصحيح واختيار اللجنة" },
  { id: "mashael", group: "الإدارة", why: "قائدة الجودة: ترى النتائج ولا تصحّح" },
  { id: "faisal", group: "المقيَّمون", why: "منسّقٌ لا لجنةَ سابقةَ له" },
  { id: "maha", group: "المقيَّمون", why: "منسّقة كانت عضوًا في لجنتها" },
  { id: "abdulrahman", group: "المقيَّمون", why: "قائد لجنة التصوير" },
  { id: "reem", group: "المقيَّمون", why: "نائبة لجنة التصوير" },
  { id: "noura", group: "المقيَّمون", why: "قائدة لجنةٍ صغيرة: يصعب أن يشارك نصفُها" },
  { id: "sultan", group: "المقيَّمون", why: "قائدٌ كان عضوًا في لجنته" },
  { id: "jood", group: "المقيَّمون", why: "نائبةٌ عُيّنت قبل الموعد بأسبوعين" },
  { id: "abeer", group: "الأعضاء", why: "عضوة في لجنة التصوير" },
];

export function initialPeople(): Person[] {
  return [
    P("mohammed", "محمد إسماعيل المطر", "male", seat("club_president")),
    P("bashair", "بشائر الحداد", "female", seat("executive_council_president")),
    P("sara", "سارة يوسف الراشد", "female", seat("hr_committee_leader")),
    P("mashael", "مشاعل حسن البلوي", "female", seat("qa_committee_leader")),
    P("faisal", "فيصل محمد الحمد", "male", seat("department_head", null, 1)),
    P("maha", "مها سليمان العنزي", "female", seat("department_head", null, 2), seat("committee_member", 21, null, { active: false })),
    P("abdulrahman", "عبد الرحمن خالد الشيخ", "male", seat("committee_leader", 11)),
    P("reem", "ريم سعد العتيبي", "female", seat("deputy_committee_leader", 11)),
    P("noura", "نورة عبد الله القحطاني", "female", seat("committee_leader", 12)),
    P("sultan", "سلطان فهد الدوسري", "male", seat("committee_leader", 21), seat("committee_member", 21, null, { active: false })),
    P("jood", "جود فارس الحربي", "female", seat("deputy_committee_leader", 21, null, { assignedAt: "2027-01-07T09:00:00Z" })),
    P("abeer", "عبير ناصر القرني", "female", seat("committee_member", 11)),
    // الجمهور: يقيّمون ولا يُتقمَّصون
    ...[
      ["c11a", "أحمد صالح الجهني", "male"], ["c11b", "لين عادل المطيري", "female"], ["c11c", "مازن طلال الشهري", "male"],
      ["c11d", "رهف عبد الإله السالم", "female"], ["c11e", "عمر ياسر الخالدي", "male"], ["c11f", "دانة فهد العمري", "female"],
    ].map(([id, n, g]) => P(id, n, g as "male" | "female", seat("committee_member", 11))),
    ...[["c12a", "تركي ناصر السبيعي", "male"], ["c12b", "هيا ماجد الشمري", "female"], ["c12c", "يزيد عمر المالكي", "male"]]
      .map(([id, n, g]) => P(id, n, g as "male" | "female", seat("committee_member", 12))),
    ...[
      ["c21a", "أسيل حمد الغامدي", "female"], ["c21b", "خالد عبد العزيز البقمي", "male"], ["c21c", "شهد علي الزهراني", "female"],
      ["c21d", "فارس منصور العتيبي", "male"], ["c21e", "غلا سعود القحطاني", "female"],
    ].map(([id, n, g]) => P(id, n, g as "male" | "female", seat("committee_member", 21))),
  ];
}

const COUNCIL_ROLES: Role[] = ["club_president", "executive_council_president", "hr_committee_leader", "qa_committee_leader"];
const MANAGERS: Role[] = ["club_president", "executive_council_president", "hr_committee_leader"];
const EVALUATED: Role[] = ["committee_leader", "deputy_committee_leader", "department_head"];

const live = (p: Person) => p.seats.filter((s) => s.active);
export const holds = (p: Person, roles: Role[]) => live(p).some((s) => roles.includes(s.role));

// ══ الزمن ═════════════════════════════════════════════════════════════════

export const DUE = "2027-01-21";
const OPENS = "2027-01-20T21:00:00Z";
const CLOSES = "2027-01-23T21:00:00Z";
const LAST_DAY = "2027-01-23";
const HOLD_UNTIL = "2027-01-31";

/** المراحل: قبل الموعد، فالأيّامُ الثلاثة، فالحكمُ والتنفيذ (بعد الإغلاق بدقائق، م٩/2). */
export const STAGES = [
  { label: "20 يناير", hint: "قبل الموعد بيوم" },
  { label: "21 يناير", hint: "فُتح التقييم" },
  { label: "22 يناير", hint: "اليوم الثاني" },
  { label: "23 يناير", hint: "آخر يوم، والتذكير" },
  { label: "24 يناير", hint: "أُغلق، وصدر الحكم ونُفّذ" },
] as const;
export type Stage = 0 | 1 | 2 | 3 | 4;

// ══ أصواتُ الآخرين ═══════════════════════════════════════════════════════════

export type Mood = "great" | "good" | "edge" | "weak";
export const MOODS: { value: Mood; label: string; mean: number }[] = [
  { value: "great", label: "راضون جدًّا", mean: 4.4 },
  { value: "good", label: "راضون", mean: 3.4 },
  { value: "edge", label: "على الحدّ", mean: 2.05 },
  { value: "weak", label: "غيرُ راضين", mean: 1.55 },
];
export const TURNOUTS: { value: string; label: string }[] = [
  { value: "1", label: "الجميع" },
  { value: "0.75", label: "أغلبهم" },
  { value: "0.5", label: "النصف" },
  { value: "0.25", label: "قليل" },
  { value: "0", label: "لا أحد" },
];
export type Crowd = { mood: Mood; members: number; council: number };

/** مشاهدُ جاهزة تملأ الضبطَ دفعةً واحدة. «كلُّ الحالات» يُري الأحكامَ كلَّها في دورةٍ واحدة. */
export const SCENES: { key: string; label: string; crowd: (who: string) => Crowd }[] = [
  {
    key: "all",
    label: "كلُّ الحالات معًا",
    crowd: (w) =>
      w === "sultan" ? { mood: "weak", members: 0.75, council: 1 }
      : w === "faisal" ? { mood: "weak", members: 0.75, council: 1 }
      : w === "noura" ? { mood: "good", members: 0.25, council: 1 }
      : w === "reem" ? { mood: "edge", members: 0.75, council: 1 }
      : { mood: "good", members: 0.75, council: 1 },
  },
  { key: "calm", label: "دورةٌ هادئة", crowd: () => ({ mood: "good", members: 0.75, council: 1 }) },
  { key: "silent", label: "لم يشارك أحد", crowd: () => ({ mood: "good", members: 0, council: 0 }) },
];

/** مولّدٌ ثابتُ البذرة: الورقةُ نفسُها كلَّ مرّة لنفس المقيَّم والمقيِّم، فلا ترتجف الأرقامُ عند كلّ رسم. */
function rand(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const KEEP = ["متابعته لكل مهمة حتى تُنجز.", "توزيعُ المهام عادل، والكل يشارك.", "حضوره في الفعاليات ودعمه للجدد.", "وضوحُ التعليمات قبل كل عمل."];
const CHANGE = ["الردّ في القروب يتأخر أحيانًا.", "نحتاج اجتماعًا شهريًا نعرف فيه الخطة.", "إشراك الأعضاء في اختيار الأنشطة.", null];

// ══ الحال ═════════════════════════════════════════════════════════════════

export type Target = {
  id: number;
  userId: string;
  role: EvaluatedRole;
  committee: number | null;
  department: number;
  unit: string;
  name: string;
  gender: "male" | "female";
  excluded: "recent" | null;
  record: RecordResult | null;
  removedAt: string | null;
  returnedTo: number | null;
  awaiting: boolean;
  restoredAt: string | null;
};
export type Elector = { target: number; rater: string; part: Part; added: boolean; removed: boolean };
export type Ballot = { target: number; rater: string; part: Part; scores: number[]; keep: string | null; change: string | null };
export type Note = {
  id: number;
  to: string;
  kind: string;
  level: Level;
  email: boolean;
  title: string;
  body: string | null;
  href: string;
  at: string;
  unread: boolean;
};
export type Happening = { id: number; stage: Stage; text: string; detail?: string };

export type SimState = {
  stage: Stage;
  people: Person[];
  targets: Target[];
  electorate: Elector[];
  /** ما كتبه المجرِّبُ بيده، وما جُمِّد من أصوات الآخرين عند الإغلاق */
  ballots: Ballot[];
  crowd: Record<string, Crowd>;
  /** من تقمّصه المجرِّبُ أثناء الأيام الثلاثة: لا يُصوَّت عنه */
  played: string[];
  notes: Note[];
  log: Happening[];
  seq: number;
};

export function initialState(scene = "all"): SimState {
  const people = initialPeople();
  const s = SCENES.find((x) => x.key === scene) ?? SCENES[0];
  const crowd: Record<string, Crowd> = {};
  for (const p of people) if (holds(p, EVALUATED)) crowd[p.id] = s.crowd(p.id);
  return { stage: 0, people, targets: [], electorate: [], ballots: [], crowd, played: [], notes: [], log: [], seq: 1 };
}

export const person = (st: SimState, id: string) => st.people.find((p) => p.id === id)!;

// ══ من يقيّم من: نسخةُ `_evaluation_raters` ══════════════════════════════════

function ratersFor(people: Person[], t: { userId: string; role: EvaluatedRole; committee: number | null; department: number }): { rater: string; part: Part }[] {
  const council = new Set(people.filter((p) => holds(p, COUNCIL_ROLES)).map((p) => p.id));
  const members = new Set<string>();
  if (t.role !== "department_head") {
    const dept = committee(t.committee)?.department;
    for (const p of people) {
      if (live(p).some((s) => s.committee === t.committee)) members.add(p.id);
      if (live(p).some((s) => s.role === "department_head" && s.department === dept)) members.add(p.id);
    }
  } else {
    for (const p of people) if (live(p).some((s) => committee(s.committee)?.department === t.department)) members.add(p.id);
  }
  const out: { rater: string; part: Part }[] = [];
  for (const id of council) if (id !== t.userId) out.push({ rater: id, part: "council" });
  for (const id of members) if (id !== t.userId && !council.has(id)) out.push({ rater: id, part: "members" });
  return out;
}

// ══ الأوراق: ما كُتب بيد، وما يُشتقّ من الضبط ═════════════════════════════════

const STAGE_SHARE: Record<Stage, number> = { 0: 0, 1: 0.4, 2: 0.7, 3: 1, 4: 1 };

/** أوراقُ الدورة كلُّها في لحظةٍ ما: المكتوبةُ، ومعها المشتقّةُ لمن لم يُتقمَّص ما دامت مفتوحة. */
export function ballotsNow(st: SimState): Ballot[] {
  if (st.stage === 4 || st.stage === 0) return st.ballots;
  const written = new Set(st.ballots.map((b) => `${b.target}:${b.rater}`));
  const out = [...st.ballots];
  for (const t of st.targets) {
    if (t.excluded) continue;
    const c = st.crowd[t.userId];
    for (const part of ["members", "council"] as Part[]) {
      const pool = st.electorate
        .filter((e) => e.target === t.id && e.part === part && !e.removed && !st.played.includes(e.rater))
        // ترتيبٌ ثابتٌ بالبذرة: من صوّت في اليوم الأوّل يبقى مصوِّتًا في الثاني
        .sort((a, b) => rand(`${t.id}:${a.rater}:o`)() - rand(`${t.id}:${b.rater}:o`)());
      const eligible = st.electorate.filter((e) => e.target === t.id && e.part === part && !e.removed).length;
      const want = Math.round(eligible * (part === "members" ? c.members : c.council) * STAGE_SHARE[st.stage]);
      const already = st.ballots.filter((b) => b.target === t.id && b.part === part).length;
      for (const e of pool.slice(0, Math.max(0, want - already))) {
        if (written.has(`${t.id}:${e.rater}`)) continue;
        out.push(synth(t, e.rater, part, c.mood));
      }
    }
  }
  return out;
}

function synth(t: Target, rater: string, part: Part, mood: Mood): Ballot {
  const r = rand(`${t.id}:${rater}:${mood}`);
  const mean = MOODS.find((m) => m.value === mood)!.mean;
  const n = part === "members" ? 7 : 5;
  const scores = Array.from({ length: n }, () => Math.min(5, Math.max(1, Math.round(mean + (r() - 0.5) * 1.6))));
  const keep = part === "members" && r() < 0.6 ? KEEP[Math.floor(r() * KEEP.length)] : null;
  const change = part === "members" && r() < 0.5 ? CHANGE[Math.floor(r() * CHANGE.length)] : null;
  return { target: t.id, rater, part, scores, keep, change };
}

/** مجاميعُ مقيَّمٍ كما تجمعها `evaluation_tally`: الأوراقُ الحيّة لمقيِّمين حيّين في اللقطة. */
function tally(st: SimState, t: Target, ballots = ballotsNow(st)) {
  const el = st.electorate.filter((e) => e.target === t.id && !e.removed);
  const valid = ballots.filter((b) => b.target === t.id && el.some((e) => e.rater === b.rater));
  const part = (p: Part) => {
    const bs = valid.filter((b) => b.part === p);
    return { sum: bs.reduce((a, b) => a + b.scores.reduce((x, y) => x + y, 0), 0), ballots: bs.length, eligible: el.filter((e) => e.part === p).length };
  };
  const m = part("members");
  const c = part("council");
  return { target_id: t.id, m_sum: m.sum, m_ballots: m.ballots, m_eligible: m.eligible, c_sum: c.sum, c_ballots: c.ballots, c_eligible: c.eligible };
}

// ══ الإشعارات: من الدليل نفسِه ═══════════════════════════════════════════════

function recipients(st: SimState, to: Address[]): string[] {
  const ids = new Set<string>();
  for (const a of to) {
    if ("user" in a && a.user) ids.add(a.user);
    if ("seat" in a && a.seat) for (const p of st.people) if (holds(p, [a.seat as Role])) ids.add(p.id);
    if ("capability" in a && a.capability === "manage_leader_evaluation") for (const p of st.people) if (holds(p, MANAGERS)) ids.add(p.id);
  }
  return [...ids];
}

function emit<K extends KindKey>(st: SimState, kind: K, facts: unknown): { st: SimState; count: number; emailed: number } {
  const k = CATALOG[kind] as unknown as {
    audiences: { key: string; level: Level; email?: boolean; to(f: unknown): Address[]; text(f: unknown, g: Gender): { title: string; body?: string }; href(f: unknown): string }[];
  };
  const notes = [...st.notes];
  let seq = st.seq;
  let count = 0;
  let emailed = 0;
  for (const a of k.audiences) {
    for (const id of recipients(st, a.to(facts))) {
      const p = person(st, id);
      const tx = a.text(facts, p.gender);
      notes.push({ id: seq++, to: id, kind, level: a.level, email: !!a.email, title: tx.title, body: tx.body ?? null, href: a.href(facts), at: new Date().toISOString(), unread: true });
      count++;
      if (a.email) emailed++;
    }
  }
  return { st: { ...st, notes, seq }, count, emailed };
}

function happen(st: SimState, text: string, detail?: string): SimState {
  return { ...st, log: [{ id: st.seq, stage: st.stage, text, detail }, ...st.log], seq: st.seq + 1 };
}

const rankWord = (r: EvaluatedRole | "committee_member") => (r === "committee_member" ? "عضو" : r === "department_head" ? "منسّق" : r === "committee_leader" ? "قائد" : "نائب");
const seatFacts = (t: Target) => ({ rank: rankWord(t.role), unit: t.unit });

// ══ الانتقال في الزمن ═══════════════════════════════════════════════════════

export function advance(st0: SimState): SimState {
  let st = st0;
  if (st.stage === 4) return st;
  const next = (st.stage + 1) as Stage;

  if (next === 1) {
    // الفتح: لقطةُ المقيَّمين ومقيِّميهم (`_evaluation_open`)
    const targets: Target[] = [];
    const electorate: Elector[] = [];
    let id = 1;
    for (const p of st.people) {
      for (const s of live(p)) {
        if (!EVALUATED.includes(s.role)) continue;
        const role = s.role as EvaluatedRole;
        const dept = role === "department_head" ? s.department! : committee(s.committee)!.department;
        const t: Target = {
          id: id++, userId: p.id, role, committee: role === "department_head" ? null : s.committee, department: dept,
          unit: role === "department_head" ? DEPARTMENTS[dept] : committee(s.committee)!.name, name: p.name, gender: p.gender,
          excluded: Date.parse(s.assignedAt) > Date.parse(OPENS) - 28 * 864e5 ? "recent" : null,
          record: null, removedAt: null, returnedTo: null, awaiting: false, restoredAt: null,
        };
        targets.push(t);
        if (!t.excluded) for (const r of ratersFor(st.people, t)) electorate.push({ target: t.id, rater: r.rater, part: r.part, added: false, removed: false });
      }
    }
    st = { ...st, stage: next, targets, electorate };
    const raters = [...new Set(electorate.map((e) => e.rater))];
    const r = emit(st, "evaluation.opened", { cycleId: 1, closesAt: CLOSES, lastDay: LAST_DAY, raters });
    st = happen(r.st, `فُتح التقييم: ${targets.filter((t) => !t.excluded).length} مقيَّمًا، و${raters.length} مقيِّمًا.`, `وصل ${r.count} إشعارًا «لك تقييمٌ مفتوح». واستُثني من عُيّن قبل الموعد بأقلّ من أربعة أسابيع.`);
    return st;
  }

  if (next === 3) {
    // التذكير قبل أن يصوّت من بقي (في الدقيقة الثالثة من اليوم)
    const now = ballotsNow({ ...st, stage: 2 });
    const pending = [...new Set(st.electorate.filter((e) => !e.removed && !now.some((b) => b.target === e.target && b.rater === e.rater)).map((e) => e.rater))];
    st = { ...st, stage: next };
    if (pending.length) {
      const r = emit(st, "evaluation.reminder", { cycleId: 1, closesAt: CLOSES, lastDay: LAST_DAY, raters: pending });
      st = happen(r.st, "آخر يوم: ذُكّر من بقيت له أوراق.", `${r.count} إشعارًا «اليومُ آخرُ أيّام تقييم القيادات».`);
    }
    return st;
  }

  if (next === 4) {
    // الإغلاق: تُجمَّد الأوراق، ثمّ الحكمُ بدالّة الكود، ثمّ التنفيذ (`evaluation_record`)
    st = { ...st, ballots: ballotsNow(st), stage: next };
    let kept = 0, removed = 0, none = 0;
    for (const t of st.targets.filter((x) => !x.excluded)) {
      const rec = recordFor(tally(st, t, st.ballots));
      st = setTarget(st, t.id, { record: rec });
      if (rec.verdict === "removed") {
        removed++;
        st = executeRemoval(st, t.id, null);
      } else {
        if (rec.verdict === "kept") kept++;
        else none++;
        st = emit(st, "evaluation.result", { ...seatFacts(t), userId: t.userId, targetId: t.id, cycleId: 1, verdict: rec.verdict, final: rec.final }).st;
      }
    }
    return happen(st, `أُغلق التقييم وصدر الحكم: ${kept} باقٍ، و${removed} مستبعَد، و${none} بلا نتيجة.`, "وصلت كلَّ مقيَّمٍ نتيجتُه وحده.");
  }

  return { ...st, stage: next };
}

function setTarget(st: SimState, id: number, patch: Partial<Target>): SimState {
  return { ...st, targets: st.targets.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
}

/** الاستبعاد (`_evaluation_remove`): يُطفأ المقعد ويعود عضوًا في لجنته السابقة، أو ينتظر لجنةً يختارها قائدُ الموارد. */
function executeRemoval(st0: SimState, targetId: number, chosen: number | null): SimState {
  let st = st0;
  const t = st.targets.find((x) => x.id === targetId)!;
  const p = person(st, t.userId);
  const prev = chosen ?? (t.role === "department_head"
    ? p.seats.find((s) => !s.active && s.role === "committee_member")?.committee ?? null
    : t.committee);
  if (prev === null) {
    st = setTarget(st, t.id, { awaiting: true });
    const r = emit(st, "evaluation.awaiting_return", { ...seatFacts(t), targetId: t.id, cycleId: 1, name: t.name });
    return happen(r.st, `استبعادُ ${t.name} ينتظر لجنةً يعود إليها.`, "لا لجنةَ سابقةَ له، فيبقى في منصبه حتى تختارها الإدارة.");
  }
  const seats = p.seats
    .map((s) => (s.active && s.role === t.role && s.committee === t.committee && s.department === (t.role === "department_head" ? t.department : null) ? { ...s, active: false } : s))
    .filter((s) => !(s.role === "committee_member" && s.committee === prev));
  seats.push(seat("committee_member", prev, null, { assignedAt: "2027-01-23T21:10:00Z" }));
  st = { ...st, people: st.people.map((x) => (x.id === p.id ? { ...x, seats } : x)) };
  st = setTarget(st, t.id, { removedAt: "2027-01-23T21:10:00Z", returnedTo: prev, awaiting: false });
  const back = { rank: "عضو", unit: committee(prev)!.name };
  const final = st.targets.find((x) => x.id === t.id)!.record!.final!;
  const r = emit(st, "evaluation.removed", { ...seatFacts(t), userId: t.userId, name: t.name, targetId: t.id, cycleId: 1, final, back, holdUntil: HOLD_UNTIL });
  return happen(r.st, `استُبعد ${t.name} من «${rankWord(t.role)} ${t.unit}»، وعاد عضوًا في ${back.unit}.`, `وصله الخبرُ بالجرس والبريد، ووصل مديري التقييم. ولا يُفتح انتخابُ مقعده قبل ${HOLD_UNTIL}.`);
}

/** يعيد المقعد (`_evaluation_restore`): المجرِّبُ لا يشغل المقاعدَ بعد الاستبعاد، فالإعادةُ تنجح دائمًا هنا. */
function restore(st0: SimState, targetId: number): SimState {
  const t = st0.targets.find((x) => x.id === targetId)!;
  const p = person(st0, t.userId);
  const seats = p.seats.map((s) =>
    s.role === t.role && s.committee === t.committee && !s.active ? { ...s, active: true }
    : s.role === "committee_member" && s.committee === t.returnedTo && s.active ? { ...s, active: false }
    : s,
  );
  const st = { ...st0, people: st0.people.map((x) => (x.id === p.id ? { ...x, seats } : x)) };
  return setTarget(st, t.id, { restoredAt: new Date().toISOString(), removedAt: null });
}

// ══ الأفعال: ما تفعله الصفحاتُ داخل المحاكي ══════════════════════════════════

export type Act =
  | { kind: "submit"; as: string; targetId: number; part: Part; scores: number[]; keep?: string | null; change?: string | null }
  | { kind: "correct"; as: string; targetId: number; raterId: string; action: "remove" | "add"; part?: Part; reason: string }
  | { kind: "recompute"; as: string; targetId: number; reason: string }
  | { kind: "chooseReturn"; as: string; targetId: number; committeeId: number }
  | { kind: "electorate"; targetId: number }
  | { kind: "read"; as: string; note?: number };

export type ActResult = { ok: boolean; message: string; electorate?: ElectorRow[] };

export function act(st0: SimState, a: Act): { st: SimState; res: ActResult } {
  let st = st0;
  if (a.kind === "electorate") return { st, res: { ok: true, message: "", electorate: electorateRows(st, a.targetId) } };
  if (a.kind === "read") {
    const hit = (n: Note) => n.to === a.as && (a.note === undefined || n.id === a.note);
    return { st: { ...st, notes: st.notes.map((n) => (hit(n) ? { ...n, unread: false } : n)) }, res: { ok: true, message: "" } };
  }

  if (a.kind === "submit") {
    if (st.stage < 1 || st.stage > 3) return { st, res: { ok: false, message: "التقييمُ مغلق." } };
    const e = st.electorate.find((x) => x.target === a.targetId && x.rater === a.as && !x.removed);
    if (!e) return { st, res: { ok: false, message: "ليس لك أن تقيّم هذا القائد." } };
    if (st.ballots.some((b) => b.target === a.targetId && b.rater === a.as)) return { st, res: { ok: false, message: "قيّمتَه من قبل." } };
    st = { ...st, ballots: [...st.ballots, { target: a.targetId, rater: a.as, part: e.part, scores: a.scores, keep: a.keep ?? null, change: a.change ?? null }] };
    return { st, res: { ok: true, message: "وصل تقييمُك." } };
  }

  const actor = person(st, a.as);
  if (!holds(actor, MANAGERS)) return { st, res: { ok: false, message: "لا تملك تصحيح تقييم القيادات." } };

  if (a.kind === "chooseReturn") {
    const t = st.targets.find((x) => x.id === a.targetId);
    if (!t?.awaiting) return { st, res: { ok: false, message: "لا ينتظر لجنة." } };
    st = executeRemoval(st, t.id, a.committeeId);
    return { st, res: { ok: true, message: "نُفّذ الاستبعاد." } };
  }

  const t = st.targets.find((x) => x.id === a.targetId)!;
  if (a.kind === "correct") {
    if (a.action === "remove") {
      st = { ...st, electorate: st.electorate.map((e) => (e.target === t.id && e.rater === a.raterId ? { ...e, removed: true } : e)) };
    } else {
      if (st.electorate.some((e) => e.target === t.id && e.rater === a.raterId && !e.removed)) return { st, res: { ok: false, message: "هو في اللقطة." } };
      st = {
        ...st,
        electorate: [...st.electorate.filter((e) => !(e.target === t.id && e.rater === a.raterId)), { target: t.id, rater: a.raterId, part: a.part ?? "members", added: true, removed: false }],
      };
    }
    const who = person(st, a.raterId).name;
    st = happen(st, `${actor.name} ${a.action === "remove" ? "أخرجت" : "أدخلت"} ${who} ${a.action === "remove" ? "من" : "في"} مقيِّمي ${t.name}.`, `السبب: ${a.reason}`);
    if (st.stage < 4) return { st, res: { ok: true, message: "صُحّحت الأهليّة." } };
  }
  return recompute(st, t.id, a.as, a.reason);
}

function recompute(st0: SimState, targetId: number, as: string, reason: string): { st: SimState; res: ActResult } {
  let st = st0;
  const t = st.targets.find((x) => x.id === targetId)!;
  const before: Verdict | null = t.record?.verdict ?? null;
  const rec = recordFor(tally(st, t, st.ballots));
  st = setTarget(st, t.id, { record: rec });
  let outcome = "unchanged";
  if (before === "removed" && rec.verdict !== "removed") {
    if (t.awaiting) {
      st = setTarget(st, t.id, { awaiting: false });
      outcome = "not_executed";
    } else {
      st = restore(st, t.id);
      outcome = "restored";
    }
  } else if (before !== "removed" && rec.verdict === "removed") {
    st = executeRemoval(st, t.id, null);
    outcome = st.targets.find((x) => x.id === t.id)!.awaiting ? "awaiting_return" : "removed";
  }
  st = emit(st, "evaluation.corrected", { ...seatFacts(t), userId: t.userId, name: t.name, targetId: t.id, from: before ?? "no_result", to: rec.verdict, outcome, final: rec.final }).st;
  st = happen(st, `صُحّحت نتيجةُ ${t.name}.`, `السبب: ${reason}`);
  const said: Record<string, string> = {
    restored: "صُحّحت النتيجة، وأُعيد إلى منصبه.",
    removed: "صُحّحت النتيجة، ونُفّذ الاستبعاد.",
    awaiting_return: "صُحّحت النتيجة، والاستبعادُ ينتظر لجنةً يعود إليها.",
    unchanged: "صُحّحت النتيجة، ولم يتغيّر الحكم.",
    not_executed: "صُحّحت النتيجة، وسقط الاستبعادُ قبل تنفيذه.",
  };
  void as;
  return { st, res: { ok: true, message: said[outcome] } };
}

/** يتقمّص المجرِّبُ شخصًا: إن كانت الدورةُ مفتوحة صارت أوراقُه بيده، فما لم يُرسَل بعدُ لا يُرسَل عنه. */
export function play(st: SimState, id: string): SimState {
  if (st.stage < 1 || st.stage > 3 || st.played.includes(id)) return st;
  // ما «صوّته» عنه الضبطُ إلى الآن يُثبَّت بيده، فلا يتراجع عدّادُ المشاركة حين يُتقمَّص
  const mine = ballotsNow(st).filter((b) => b.rater === id && !st.ballots.some((x) => x.target === b.target && x.rater === id));
  return { ...st, ballots: [...st.ballots, ...mine], played: [...st.played, id] };
}

/** «لو أُغلق الآن»: الحكمُ بالأوراق الحاضرة، للمجرِّب وحده (الغرفةُ لا تُري نتيجةً قبل الإغلاق). */
export function forecast(st: SimState, targetId: number): RecordResult | null {
  const t = st.targets.find((x) => x.id === targetId);
  if (!t || t.excluded) return null;
  return t.record ?? recordFor(tally(st, t));
}

export function applyScene(st: SimState, key: string): SimState {
  const s = SCENES.find((x) => x.key === key) ?? SCENES[0];
  return { ...st, crowd: Object.fromEntries(Object.keys(st.crowd).map((id) => [id, s.crowd(id)])) };
}

export function setCrowd(st: SimState, who: string, patch: Partial<Crowd>): SimState {
  return { ...st, crowd: { ...st.crowd, [who]: { ...st.crowd[who], ...patch } } };
}

// ══ ما تراه كلُّ عين: بأشكال `data.ts` ═══════════════════════════════════════

export type View = {
  caps: string[];
  canRate: boolean;
  pending: number;
  hasResults: boolean;
  sheets: SheetRow[];
  results: MyResultRow[];
  comments: Record<number, { keep_text: string | null; change_text: string | null }[]>;
  canManage: boolean;
  canViewResults: boolean;
  cycles: CycleRow[];
  targets: TargetRow[];
  notes: Note[];
  seatLine: string;
};

export function viewFor(st: SimState, id: string): View {
  const p = person(st, id);
  const ballots = ballotsNow(st);
  const open = st.stage >= 1 && st.stage <= 3;
  const canManage = holds(p, MANAGERS);
  const canViewResults = canManage || holds(p, ["qa_committee_leader"]);
  const caps = ["use_portal", "view_own_membership", ...(canViewResults ? ["view_leader_evaluation_results"] : []), ...(canManage ? ["manage_leader_evaluation"] : [])];

  const mine = open ? st.electorate.filter((e) => e.rater === id && !e.removed) : [];
  const sheets: SheetRow[] = mine.map((e) => {
    const t = st.targets.find((x) => x.id === e.target)!;
    return {
      target_id: t.id, cycle_id: 1, closes_at: CLOSES, last_day: LAST_DAY, part: e.part, full_name: t.name, gender: t.gender,
      role_name: t.role, unit_name: t.unit, done: ballots.some((b) => b.target === t.id && b.rater === id),
    };
  });

  const own = st.stage === 4 ? st.targets.filter((t) => t.userId === id && !t.excluded && t.record) : [];
  const results: MyResultRow[] = own.map((t) => {
    const r = t.record!;
    const show = (n: number) => n >= 3;
    const bs = st.ballots.filter((b) => b.target === t.id && st.electorate.some((e) => e.target === t.id && e.rater === b.rater && !e.removed));
    return {
      target_id: t.id, due_on: DUE, role_name: t.role, unit_name: t.unit, verdict: r.verdict, branch: r.branch,
      final_num: r.final?.[0] ?? null, final_den: r.final?.[1] ?? null,
      members_num: show(r.tally.mBallots) ? r.members?.[0] ?? null : null, members_den: show(r.tally.mBallots) ? r.members?.[1] ?? null : null,
      members_ballots: r.tally.mBallots, members_eligible: r.tally.mEligible,
      council_num: show(r.tally.cBallots) ? r.council?.[0] ?? null : null, council_den: show(r.tally.cBallots) ? r.council?.[1] ?? null : null,
      council_ballots: r.tally.cBallots, comments: bs.filter((b) => b.keep || b.change).length,
      removed_at: t.removedAt, restored_at: t.restoredAt, cancelled: null,
    };
  });
  const comments = Object.fromEntries(
    own.map((t) => [
      t.id,
      st.ballots
        .filter((b) => b.target === t.id && (b.keep || b.change) && st.electorate.some((e) => e.target === t.id && e.rater === b.rater && !e.removed))
        .sort((a, b) => rand(a.rater)() - rand(b.rater)())
        .map((b) => ({ keep_text: b.keep, change_text: b.change })),
    ]),
  );

  const live_ = st.targets.filter((t) => !t.excluded);
  const verdicts = live_.map((t) => t.record?.verdict);
  const cycle: CycleRow = {
    id: 1, due_on: DUE, opens_at: OPENS, closes_at: CLOSES,
    status: st.stage === 0 ? "scheduled" : st.stage === 4 ? "executed" : "open",
    executed_at: st.stage === 4 ? "2027-01-23T21:10:00Z" : null, blocked: false,
    targets: live_.length, excluded: st.targets.length - live_.length,
    raters: new Set(st.electorate.filter((e) => !e.removed).map((e) => e.rater)).size,
    ballots: ballots.filter((b) => st.electorate.some((e) => e.target === b.target && e.rater === b.rater && !e.removed)).length,
    kept: verdicts.filter((v) => v === "kept").length, removed: verdicts.filter((v) => v === "removed").length, no_result: verdicts.filter((v) => v === "no_result").length,
  };
  // بعد التنفيذ تُكتب الدورةُ التالية (`_evaluation_ensure_cycle`)
  const cycles: CycleRow[] = st.stage === 4
    ? [{ ...cycle, id: 2, due_on: "2027-04-21", opens_at: "2027-04-20T21:00:00Z", closes_at: "2027-04-23T21:00:00Z", status: "scheduled", executed_at: null, targets: 0, excluded: 0, raters: 0, ballots: 0, kept: 0, removed: 0, no_result: 0 }, cycle]
    : [cycle];

  const targets: TargetRow[] = st.targets.map((t) => {
    const r = t.record;
    const el = st.electorate.filter((e) => e.target === t.id && !e.removed);
    const bs = ballots.filter((b) => b.target === t.id && el.some((e) => e.rater === b.rater));
    const results_ = canViewResults && r;
    return {
      id: t.id, user_id: t.userId, full_name: t.name, gender: t.gender, role_name: t.role, committee_id: t.committee,
      department_id: t.department, unit_name: t.unit, seat_assigned_at: OLD, excluded: t.excluded, cancelled: null,
      members_eligible: el.filter((e) => e.part === "members").length, members_ballots: bs.filter((b) => b.part === "members").length,
      council_eligible: el.filter((e) => e.part === "council").length, council_ballots: bs.filter((b) => b.part === "council").length,
      members_quorum: results_ ? r.membersQuorum : null, branch: results_ ? r.branch : null,
      members_num: results_ ? r.members?.[0] ?? null : null, members_den: results_ ? r.members?.[1] ?? null : null,
      council_num: results_ ? r.council?.[0] ?? null : null, council_den: results_ ? r.council?.[1] ?? null : null,
      final_num: results_ ? r.final?.[0] ?? null : null, final_den: results_ ? r.final?.[1] ?? null : null,
      verdict: results_ ? r.verdict : null, removed_at: t.removedAt, returned_to: t.returnedTo, awaiting_return: t.awaiting,
      restored_at: t.restoredAt,
    };
  });

  const seatNow = live(p).find((s) => s.role !== "committee_member") ?? live(p)[0];
  const seatLine = seatNow ? `${roleWord(seatNow.role, p.gender)}${unitOf(seatNow) ? ` ${unitOf(seatNow)}` : ""}` : "صديق أدِيب";

  return {
    caps, canRate: sheets.length > 0, pending: sheets.filter((s) => !s.done).length, hasResults: results.length > 0,
    sheets, results, comments, canManage, canViewResults, cycles, targets,
    notes: st.notes.filter((n) => n.to === id).sort((a, b) => b.id - a.id), seatLine,
  };
}

export function electorateRows(st: SimState, targetId: number): ElectorRow[] {
  return st.electorate
    .filter((e) => e.target === targetId)
    .map((e) => ({ rater_id: e.rater, full_name: person(st, e.rater).name, part: e.part, added_by_correction: e.added, removed: e.removed }));
}

const ROLE_WORD: Record<Role, [string, string]> = {
  club_president: ["رئيس أدِيب", "رئيسة أدِيب"],
  executive_council_president: ["الرئيس التنفيذي", "الرئيسة التنفيذية"],
  hr_committee_leader: ["قائد الموارد البشرية", "قائدة الموارد البشرية"],
  qa_committee_leader: ["قائد الضمان والجودة", "قائدة الضمان والجودة"],
  department_head: ["منسّق", "منسّقة"],
  committee_leader: ["قائد", "قائدة"],
  deputy_committee_leader: ["نائب", "نائبة"],
  committee_member: ["عضو", "عضو"],
};
export const roleWord = (r: Role, g: "male" | "female") => ROLE_WORD[r][g === "female" ? 1 : 0];
const unitOf = (s: Seat) => (s.department ? DEPARTMENTS[s.department] : s.committee ? committee(s.committee)!.name : null);
export const committeesForReturn = () => COMMITTEES.map((c) => ({ id: c.id, name: c.name, department_id: c.department }));
