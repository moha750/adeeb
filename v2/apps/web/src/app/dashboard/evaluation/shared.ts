/**
 * **ما تتشاركه شاشاتُ التقييم** (٢٠٢٦-١١-٢٠): الكلماتُ والحسابُ والأنواع التي تقرؤها الغرفُ الجديدة (`_ad/rooms/Evaluation*`،
 * `RateRoom`، `MineRoom`) وصفحاتُ `dashboard/evaluation`. نُقلت من الشاشات الأولى (`_views/`، حُذفت ٢٠٢٦-١١-٢١). لا هيئةَ هنا ولا JSX.
 */
import { fmtDateOnly, fmtMonthYear } from "@/lib/dates";
import type { Fraction } from "@/lib/evaluation/score";
import { positionLine, rankFor } from "@/lib/positionLabel";
import type { EvaluationResult } from "./actions";
import type { CycleRow, ElectorRow, MyResultRow, TargetRow } from "./data";
import { RANK, type EvaluatedRole, type Part, type Verdict } from "./vocab";

/** «نائبة لجنة التصوير» بجنس صاحبها (`rankFor`) ووحدته (`positionLine`). */
export function seatLine(role: EvaluatedRole, unit: string, gender: "male" | "female" | null): string {
  return positionLine(rankFor(RANK[role], gender), unit) ?? RANK[role];
}

/** الكسرُ من صفّ القاعدة، أو لا شيء. */
export function frac(num: number | null | undefined, den: number | null | undefined): Fraction | null {
  return num == null || !den ? null : { num, den };
}

/**
 * «تقييم نوفمبر 2026»: الدورةُ تُسمّى بشهرها وحده (المجلس الإداريّ ٢٠٢٦-١١-٢١: كلمةُ «الدورة» غيرُ واضحة، و«الورقة» كذلك؛
 * فصارتا «تقييم الشهر» و«التقييم» في كلّ ما يُقرأ، وبقيتا في الكود والقاعدة اسمين داخليّين). وكانت «التقييم الربعي، يناير 2027».
 * و`cycleShort` («يناير 2027») حيث الصفحةُ كلُّها عن التقييم: أزرارُ التبديل وسطورُ الدورات.
 */
export const cycleName = (dueOn: string) => `تقييم ${fmtMonthYear(dueOn)}`;
export const cycleShort = (dueOn: string) => fmtMonthYear(dueOn);

/** آخرُ يومٍ يُقبل فيه التقييم («25 نوفمبر 2026»): الإغلاقُ منتصفُ الليل التالي. */
export const lastDay = (d: string) => fmtDateOnly(d);

/**
 * **أيّامُ الدورة الثابتة** (المجلس الإداريّ ومحمد ٢٠٢٦-١١-٢١): يُفتح يومَ 22 من كلّ شهر، وآخرُ يومٍ 25 (أربعةُ أيّام)، ويُغلق
 * بانتهائه، ويُحكم صباحَ 26. مرآةُ `_evaluation_next_due` وقيدَي `evaluation_cycles_due_monthly` و`evaluation_cycles_window` في القاعدة.
 */
export const DUE_DAY = 22;
export const LAST_DAY_OFFSET = 3;
export const VERDICT_OFFSET = 4;

/** موعدُ الدورة التالية: يومُ 22 من الشهر التالي (م٢/2 بتعديل ٢٠٢٦-١١-٢١). */
export function nextDue(dueOn: string): string {
  const [y, m] = dueOn.slice(0, 10).split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  return `${m === 12 ? y + 1 : y}-${String(nm).padStart(2, "0")}-${DUE_DAY}`;
}

/** لماذا خرج من الدورة (م١/4) بجنس صاحبه، ومتى يُقيَّم. */
export function excludedWhy(g: "male" | "female" | null, dueOn: string): string {
  const f = g === "female";
  return `${f ? "عُيّنت" : "عُيّن"} قبل الموعد بأقلّ من أسبوعين، ${f ? "فتُقيَّم" : "فيُقيَّم"} في ${cycleName(nextDue(dueOn))}.`;
}

/**
 * حالُ النصاب جملةً (م٥/1): «اكتمل النصاب»، أو ما بقي له ما دامت الدورةُ مفتوحة، أو «لم يكتمل» بعدها.
 * النصابُ نصفُ المؤهّلين وورقةٌ على الأقل (`membersQuorum`)، فالباقي يُحسب بالسقف.
 */
export function quorumLine(n: number, of: number, closed: boolean): { met: boolean; text: string } {
  const need = Math.max(1, Math.ceil(of / 2));
  // بلا كلمة «النصاب» في الواجهة: تُقرأ «النصّاب» (محمد ٢٠٢٦-١٠-٢٨)
  if (n >= need) return { met: true, text: "شارك النصف" };
  return { met: false, text: closed ? "لم يشارك النصف" : `بقي ${need - n} لبلوغ النصف` };
}


export type SubmitFn = (input: { targetId: number; part: Part; scores: number[]; keep?: string | null; change?: string | null }) => Promise<EvaluationResult>;

export type MineProps = {
  results: MyResultRow[];
  /** إجاباتُ السؤال المفتوح لكلّ دورة (بمعرّف المقيَّم فيها)، بلا أسماء وبترتيبٍ عشوائيّ (م١٠/2). */
  comments: Record<number, { keep_text: string | null; change_text: string | null }[]>;
  gender: "male" | "female" | null;
};

/** الحكمُ جملةً بجنس صاحبه. */
export function verdictSentence(v: Verdict, g: "male" | "female" | null): string {
  const f = g === "female";
  if (v === "kept") return f ? "باقيةٌ في منصبكِ" : "باقٍ في منصبك";
  if (v === "removed") return f ? "استُبعدتِ من المنصب" : "استُبعدتَ من المنصب";
  return "لا نتيجة في تقييم هذا الشهر";
}

/** لماذا لا يُعرض الشقّ: لم يشارك أحد، أو سقط نصابُ الأعضاء (م٥/1)، أو أوراقُه دون ثلاث (المسألة ٣). */
export function hiddenWhy(p: "members" | "council", n: number, r: MyResultRow): string {
  if (n === 0) return "لم يشارك أحد";
  if (p === "members" && (r.branch === "council_only" || r.branch === "none")) return "لم يشارك نصفُهم";
  return "لا تُعرض لأنّ تقييماتها أقلّ من ثلاثة";
}

export type DetailActions = {
  correctRater: (i: { targetId: number; raterId: string; action: "remove" | "add"; part?: Part; reason: string }) => Promise<EvaluationResult>;
  recompute: (targetId: number, reason: string) => Promise<EvaluationResult>;
  chooseReturn: (targetId: number, committeeId: number) => Promise<EvaluationResult>;
};

export type RoomProps = {
  cycles: CycleRow[];
  cycleId: number;
  onCycle: (id: number) => void;
  targets: TargetRow[];
  departments: Record<number, string>;
  canManage: boolean;
  canViewResults: boolean;
  /** مقيِّمو مقيَّمٍ واحد يُجلبون عند فتح تفصيله (أسماءٌ وشقّ، ولا شيءَ عن مشاركتهم). */
  loadElectorate: (targetId: number) => Promise<ElectorRow[]>;
  /** بعد كلّ تصحيح: تُعاد قراءةُ الدورة (في الصفحة `router.refresh`). */
  onChanged?: () => void;
  people: { id: string; name: string }[];
  committees: { id: number; name: string; department_id?: number | null }[];
  actions: DetailActions;
  /** يُفتح تفصيلُ هذا المقيَّم عند الرسم (المعرض). */
  initialOpen?: number;
};

/** «بعد يومين» على تاريخٍ بلا وقت: يُحسب بالتقويم لا بالساعة، فلا تزيحه منطقةُ الخادم. */
export function addDays(dateOnly: string, n: number): string {
  const [y, m, d] = dateOnly.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
