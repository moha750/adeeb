/**
 * **تصديرُ سجلّ المتطوّعين** (مسارُ «التصدير»، اعتمده محمد ٢٠٢٦-١١-٢٤): ما يدخل الملفّ ومن يدخله وكيف يُقسَم — مصدرٌ واحدٌ يقرؤه
 * المتصفّحُ (نافذةُ التصدير تعدّ «سيخرج 42 متطوّعًا في 9 أوراق» وأنت تختار) والخادمُ (يعيد الاختيارَ كلَّه على ما يقرؤه هو، ولا
 * يثق بعددٍ جاء من المتصفّح). فلا إطارَ ولا قاعدةَ هنا: حسابٌ على صفوفٍ مقروءةٍ سلفًا.
 *
 * **والحقولُ قرارُ محمد** (٢٠٢٦-١١-٢٤): لا يخرج إلّا ما تعرضه الغرفةُ أو سجلُّ المتطوّع لصاحبها اليوم. فالمختارُ سلفًا ما يقوله كرتُ
 * الغرفة (الاسم، والجنس، والجوّال، والبريد، والمدينة، والحال، والرغبات، والبداية، والمشاركات، والشهادات)، والاختياريُّ ما في السجلّ
 * (آخرُ دخول، والانتهاءُ وسببُه، وآخرُ ترتيبٍ للرغبات، ورسائلُ النادي، وأعدادُ الطلبات). **وما لا يخرج أبدًا**: رقمُ الهويّة والرقمُ
 * الأكاديميّ والميلاد (لا يقرؤها السجلُّ أصلًا)، والملاحظاتُ الإداريّة وأسبابُ القرار والحجب (داخليّةٌ تخصّ الغرفة)، والكلّيّةُ (عند
 * قلّةٍ منهم)، والساعاتُ (لا تُحسب بدقّة: الفرصُ المرنة بلا ساعات)، وأثرُ المنصّة (الزيارات والأجهزة). فإن احتيج حقلٌ جديدٌ فبكلمته.
 */
import type { XCell, XSheet } from "./xlsx";
import { clubDayKey, daysBetweenKeys, toClubInput } from "./dates";
import { arCount, AR_VOLUNTEER, type ArForms } from "./arabicCount";

/** ما يحتاجه التصديرُ من صفّ المتطوّع (`VolunteerRow` يوافقه) — فلا يرتبط هذا الحسابُ بقارئ القاعدة. */
export type ExportVolunteer = {
  userId: string;
  name: string;
  phone: string;
  email: string;
  gender: "male" | "female" | null;
  city: string | null;
  status: "active" | "former";
  endReason: string | null;
  acceptsMarketing: boolean;
  prefs: { id: number; name: string }[];
  apps: { opportunityId: string; status: string; attendance: "attended" | "absent" | null }[];
  certificates: number;
  applied: number;
  accepted: number;
  attended: number;
  absent: number;
  /** الطوابعُ خامًا (ISO): الملفُّ يكتبها تواريخَ تُفرز، والمرشّحُ يقيس المدّةَ بيوم الرياض */
  appliedIso: string;
  endedIso: string | null;
  lastSignInIso: string | null;
  prefsUpdatedIso: string | null;
};

/* ── الحالُ: مصدرُ مواضع الغرفة ونصِّ الملفّ معًا ─────────────────────────── */

/**
 * **من نال العضويّة ترقّى ولم يخرج** (محمد ٢٠٢٦-١١-٠٣): إهداءُ العضويّة (`grant_membership_to_volunteer`) يُطفئ تطوّعَه ويكتب سببًا
 * ثابتًا «نال العضويّة» — وذلك النصُّ علامتُه الوحيدة في القاعدة (لا عمودَ لنوع الانتهاء)، فإن تغيّر في الدالّة تغيّر هنا.
 */
export const PROMOTED = "نال العضويّة";
export const promoted = (v: Pick<ExportVolunteer, "status" | "endReason">) => v.status === "former" && v.endReason?.trim() === PROMOTED;

/** شارك فعلًا: طلبٌ مقبولٌ أُكّد حضورُه — حكمُ «لم يشارك ولا مرّة». */
export const participated = (v: Pick<ExportVolunteer, "apps">) => v.apps.some((a) => a.status === "accepted" && a.attendance === "attended");

/** **كم مرّةً شارك**: فرصٌ أُكّد حضورُه فيها، تُعدّ بالفرصة لا بالفترة (فترتان من فرصةٍ مشاركةٌ واحدة)، كما تُعدّ الشهادة. */
export const timesOf = (v: Pick<ExportVolunteer, "apps">) =>
  new Set(v.apps.filter((a) => a.status === "accepted" && a.attendance === "attended").map((a) => a.opportunityId)).size;

/** حالُ المتطوّع بمواضع الغرفة: متطوّعٌ نشط، أو صار عضوًا، أو سابق */
export type ExportStand = "active" | "members" | "former";
export const standOf = (v: Pick<ExportVolunteer, "status" | "endReason">): ExportStand =>
  v.status === "active" ? "active" : promoted(v) ? "members" : "former";

const she = (v: Pick<ExportVolunteer, "gender">) => v.gender === "female";
const STAND_WORD: Record<ExportStand, (f: boolean) => string> = {
  active: (f) => (f ? "متطوّعة" : "متطوّع"),
  members: (f) => (f ? "صارت عضوًا" : "صار عضوًا"),
  former: (f) => (f ? "متطوّعة سابقة" : "متطوّع سابق"),
};

/* ── الأعمدة ───────────────────────────────────────────────────────────── */

export type ColumnKey =
  | "name" | "gender" | "phone" | "email" | "city" | "status" | "prefs" | "since" | "times" | "certs"
  | "lastSignIn" | "end" | "prefsUpdated" | "marketing" | "apps";

const ORDINAL = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"];

/** يومُ الرياض من طابعٍ خام — للتاريخ في الملفّ، وللمدّة في المرشّح */
const day = (iso: string | null): XCell => (iso ? { day: clubDayKey(iso) } : null);
const stamp = (iso: string | null): XCell => (iso ? { stamp: toClubInput(iso) } : null);

type ColumnDef = {
  key: ColumnKey;
  /** اسمُه في النافذة */
  label: string;
  /** مختارٌ سلفًا */
  base?: boolean;
  /** لا يُلغى (الاسم) */
  fixed?: boolean;
  /** أعمدتُه في الملفّ: عمودٌ أو أكثر (الرغباتُ ثلاثةٌ فأكثر، وأعدادُ الطلبات أربعة) — `prefs` عددُ أعمدة الرغبات في هذا الملفّ */
  heads: (prefs: number) => string[];
  cells: (v: ExportVolunteer, prefs: number) => XCell[];
};

export const COLUMNS: readonly ColumnDef[] = [
  { key: "name", label: "الاسم", base: true, fixed: true, heads: () => ["الاسم"], cells: (v) => [v.name] },
  { key: "gender", label: "الجنس", base: true, heads: () => ["الجنس"], cells: (v) => [v.gender === "male" ? "ذكر" : v.gender === "female" ? "أنثى" : null] },
  // نصٌّ لا عدد: «0501234567» عددًا يسقط صفرُه الأوّل
  { key: "phone", label: "الجوّال", base: true, heads: () => ["الجوّال"], cells: (v) => [v.phone.trim() || null] },
  { key: "email", label: "البريد", base: true, heads: () => ["البريد"], cells: (v) => [v.email.trim() || null] },
  { key: "city", label: "المدينة", base: true, heads: () => ["المدينة"], cells: (v) => [v.city] },
  { key: "status", label: "الحال", base: true, heads: () => ["الحال"], cells: (v) => [STAND_WORD[standOf(v)](she(v))] },
  // عمودٌ لكلّ رغبةٍ بترتيبها (يُفرز ويُصفّى في Excel)، وثلاثةٌ حدًّا أدنى: أن يخلو العمودُ الثالث خبرٌ لا نقص
  {
    key: "prefs", label: "الرغبات بترتيبها", base: true,
    heads: (n) => Array.from({ length: n }, (_, i) => `الرغبة ${ORDINAL[i] ?? i + 1}`),
    cells: (v, n) => Array.from({ length: n }, (_, i) => v.prefs[i]?.name || null),
  },
  { key: "since", label: "بداية التطوّع", base: true, heads: () => ["بداية التطوّع"], cells: (v) => [day(v.appliedIso)] },
  { key: "times", label: "المشاركات", base: true, heads: () => ["المشاركات"], cells: (v) => [timesOf(v)] },
  { key: "certs", label: "الشهادات السارية", base: true, heads: () => ["الشهادات السارية"], cells: (v) => [v.certificates] },
  { key: "lastSignIn", label: "آخر دخول", heads: () => ["آخر دخول"], cells: (v) => [stamp(v.lastSignInIso)] },
  // الانتهاءُ لمن انتهى تطوّعُه وحده: النشطُ العائدُ بعد انقطاع يحمل خبرَ انقطاعه في القاعدة، لكنّه اليومَ متطوّع
  {
    key: "end", label: "الانتهاء وسببه", heads: () => ["انتهى تطوّعه في", "سبب الانتهاء"],
    cells: (v) => (v.status === "former" ? [day(v.endedIso), v.endReason?.trim() || null] : [null, null]),
  },
  { key: "prefsUpdated", label: "آخر ترتيب للرغبات", heads: () => ["آخر ترتيب للرغبات"], cells: (v) => [stamp(v.prefsUpdatedIso)] },
  { key: "marketing", label: "يقبل رسائل النادي", heads: () => ["يقبل رسائل النادي"], cells: (v) => [v.acceptsMarketing ? "نعم" : "لا"] },
  {
    key: "apps", label: "أعداد الطلبات", heads: () => ["طلبات الفرص", "قُبل منها", "حضر", "غاب"],
    cells: (v) => [v.applied, v.accepted, v.attended, v.absent],
  },
];

export const BASE_COLUMNS: ColumnKey[] = COLUMNS.filter((c) => c.base).map((c) => c.key);
export const ALL_COLUMNS: ColumnKey[] = COLUMNS.map((c) => c.key);
export const isColumn = (k: string): k is ColumnKey => COLUMNS.some((c) => c.key === k);

/* ── الاختيار ──────────────────────────────────────────────────────────── */

/** `room`: ما في الغرفة الآن ببحثه وتصفيته وموضعه وترتيبه، و`picked`: المحدَّدون في الجدول — معرّفاتُهما بالترتيب الذي رآه صاحبُها */
export type ExportScope = "all" | "room" | "picked";
export type ExportSince = "" | "7" | "30" | "range";
export type ExportSplit = "one" | "committee" | "gender";
/** الجنسُ المختار: إناث، ذكور، ومن لم يُحدَّد جنسُه — تُختار معًا، والفارغةُ الكلّ */
export type ExportGender = "female" | "male" | "none";
/** ترتيبُ اللجنة عند من رغبها: 0 بأيّ ترتيب، وإلّا رغبتُه بهذا الرقم تمامًا (محمد ٢٠٢٦-١١-٢٤: الأولى والثانية والثالثة) */
/** رتبةُ اللجنة في رغباته: الأولى، الثانية، الثالثة */
export type ExportRank = 1 | 2 | 3;

export type ExportSpec = {
  scope: ExportScope;
  ids: string[];
  genders: ExportGender[];
  /** معرّفاتُ اللجان نصًّا، والفارغةُ كلُّ الرغبات. وأكثرُ من لجنة (٢٠٢٦-١١-٢٤): يطابق من رغب إحداها */
  committees: string[];
  /** الرتبُ المختارة (الأولى والثالثة معًا مثلًا، ٢٠٢٦-١١-٢٤)، والفارغةُ بأيّ ترتيب — ولا معنى لها بلا لجنة */
  ranks: ExportRank[];
  /** فارغةٌ = الأحوالُ كلُّها */
  stands: ExportStand[];
  since: ExportSince;
  /** حدّا المدّة بيوم الرياض (`YYYY-MM-DD`)، وكلاهما اختياريّ */
  from: string;
  to: string;
  columns: ColumnKey[];
  split: ExportSplit;
};

export const DEFAULT_SPEC: ExportSpec = {
  scope: "room", ids: [], genders: [], committees: [], ranks: [], stands: [], since: "", from: "", to: "", columns: BASE_COLUMNS, split: "one",
};

/** المدّةُ خاطئةٌ إن سبقت نهايتُها بدايتَها — والنافذةُ تقولها تحت حقلها، والخادمُ يردّها */
export const badRange = (s: Pick<ExportSpec, "since" | "from" | "to">) => s.since === "range" && !!s.from && !!s.to && s.from > s.to;

/**
 * **من يخرج**: النطاقُ أوّلًا (الكلُّ بترتيب الغرفة الأصليّ، أو ما رآه صاحبُه بترتيبه)، ثمّ مرشّحاتُ النافذة فوقه. ومعرّفٌ لا يقابله
 * متطوّعٌ في ما قرأه الخادمُ يسقط — فالمعرّفاتُ تختار من المقروء ولا تضيف إليه. و`today` يومُ الرياض (`clubDayKey`).
 */
export function selectVolunteers<T extends ExportVolunteer>(rows: T[], spec: ExportSpec, today: string): T[] {
  let list: T[];
  if (spec.scope === "all") list = rows;
  else {
    const by = new Map(rows.map((r) => [r.userId, r]));
    const seen = new Set<string>();
    list = spec.ids.flatMap((id) => {
      const r = by.get(id);
      if (!r || seen.has(id)) return [];
      seen.add(id);
      return [r];
    });
  }
  const cids = spec.committees;
  return list.filter((v) => {
    if (spec.genders.length && !spec.genders.includes(v.gender ?? "none")) return false;
    // برتبةٍ: رغبتُه بهذا الرقم هي اللجنةُ تمامًا، ومن رغباتُه أقلُّ منها لا يطابق
    if (cids.length && !(spec.ranks.length ? spec.ranks.some((r) => cids.includes(String(v.prefs[r - 1]?.id ?? ""))) : v.prefs.some((p) => cids.includes(String(p.id))))) return false;
    if (spec.stands.length && !spec.stands.includes(standOf(v))) return false;
    const k = clubDayKey(v.appliedIso);
    if (spec.since === "7" || spec.since === "30") {
      if (!k || daysBetweenKeys(k, today) >= Number(spec.since)) return false;
    } else if (spec.since === "range") {
      if (spec.from && (!k || k < spec.from)) return false;
      if (spec.to && (!k || k > spec.to)) return false;
    }
    return true;
  });
}

/* ── الأوراق ───────────────────────────────────────────────────────────── */

export const NO_PREFS = "بلا رغبات";
const GENDER_SHEETS: { key: "male" | "female" | null; name: string }[] = [
  { key: "female", name: "إناث" },
  { key: "male", name: "ذكور" },
  { key: null, name: "الجنس غير محدّد" },
];

/** أعمدةُ الملفّ بترتيب `COLUMNS` لا بترتيب الاختيار، والاسمُ فيها دائمًا */
const chosen = (keys: ColumnKey[]) => COLUMNS.filter((c) => c.fixed || keys.includes(c.key));

function table(list: ExportVolunteer[], keys: ColumnKey[], rankOf?: (v: ExportVolunteer) => number) {
  const cols = chosen(keys);
  const prefs = Math.max(3, ...list.map((v) => v.prefs.length));
  const heads = cols.flatMap((c) => c.heads(prefs));
  const rows = list.map((v) => cols.flatMap((c) => c.cells(v, prefs)));
  // ورقةُ اللجنة: «ترتيبها عنده» بعد الاسم مباشرةً — رقمًا يُفرز (1 الأولى)، والورقةُ مرتّبةٌ به أصلًا
  if (!rankOf) return { columns: heads.map((title) => ({ title })), rows };
  return {
    columns: [heads[0], "ترتيبها عنده", ...heads.slice(1)].map((title) => ({ title })),
    rows: rows.map((r, i) => [r[0], rankOf(list[i]), ...r.slice(1)]),
  };
}

/**
 * **الأوراق**: ورقةٌ واحدة، أو ورقةٌ لكلّ لجنةٍ رغبها أحد (المتطوّعُ في كلّ لجنةٍ رغبها، مرتّبين بأولويّتها عندهم، ومن بلا رغباتٍ ورقةٌ
 * أخيرة)، أو ورقةٌ لكلّ جنس. والورقةُ الخالية لا تُكتب. ومرشّحُ اللجنة يحصر أوراقَ اللجان فيها وحدها.
 * و`committees` ترتيبُ اللجان في الموقع (`activeCommittees`)، ولجنةٌ ليست فيه (أُطفئت) تأتي بعدها بترتيب ظهورها.
 */
export function planSheets(list: ExportVolunteer[], spec: Pick<ExportSpec, "split" | "columns" | "committees">, committees: { id: number; name: string }[]): XSheet[] {
  if (list.length === 0) return [];
  if (spec.split === "one") return [{ name: "المتطوّعون", ...table(list, spec.columns) }];
  if (spec.split === "gender") {
    return GENDER_SHEETS
      .map((g) => ({ g, part: list.filter((v) => v.gender === g.key) }))
      .filter((x) => x.part.length)
      .map(({ g, part }) => ({ name: g.name, ...table(part, spec.columns) }));
  }
  const names = new Map<number, string>(committees.map((c) => [c.id, c.name]));
  const order = committees.map((c) => c.id);
  for (const v of list) for (const p of v.prefs) if (!names.has(p.id)) { names.set(p.id, p.name); order.push(p.id); }
  const sheets: XSheet[] = [];
  for (const id of order) {
    if (spec.committees.length && !spec.committees.includes(String(id))) continue;
    const rank = (v: ExportVolunteer) => v.prefs.findIndex((p) => p.id === id) + 1;
    // ثابتٌ (`sort` في JS ثابت): المتساوون في الأولويّة على ترتيب النطاق
    const part = list.filter((v) => rank(v) > 0).sort((a, b) => rank(a) - rank(b));
    if (part.length) sheets.push({ name: names.get(id) || `لجنة ${id}`, ...table(part, spec.columns, rank) });
  }
  if (!spec.committees.length) {
    const none = list.filter((v) => v.prefs.length === 0);
    if (none.length) sheets.push({ name: NO_PREFS, ...table(none, spec.columns) });
  }
  return sheets;
}

/* ── ما يُقال عن الملفّ ─────────────────────────────────────────────────── */

/** «في ورقة واحدة، في ورقتين، في 3 أوراق، في 12 ورقةً» — بعد «في»، والتشكيلُ الإلزاميُّ وحده */
const AR_IN_SHEETS: ArForms = ["ورقة واحدة", "ورقتين", "أوراق", "ورقةً"];

/** سطرُ النافذة تحت عنوانها: «سيخرج 42 متطوّعًا في 9 أوراق» — أو «لا أحد يطابق اختيارك» */
export function exportLine(people: number, sheets: number): string {
  if (people === 0) return "لا أحد يطابق اختيارك";
  return `سيخرج ${arCount(people, AR_VOLUNTEER)} في ${arCount(sheets, AR_IN_SHEETS)}`;
}

/**
 * **اسمُ الملفّ يقول ما فيه وتاريخَه**: «متطوّعو أدِيب، لجنة التأليف، إناث، 2026-11-24.xlsx». ما لم يُحصر لا يُذكر، والنطاقُ يُذكر
 * حين يكون المحدَّدين (ما في الغرفة الآن يقول نفسَه بما بعده). والتاريخُ يومُ الرياض بأرقامٍ لاتينيّة، يُفرز في مجلّد التنزيلات.
 */
export function exportFileName(spec: ExportSpec, committees: { id: number; name: string }[], today: string): string {
  const parts = ["متطوّعو أدِيب"];
  if (spec.scope === "picked") parts.push("المحدَّدون");
  // لجنةٌ أو لجنتان بأسمائهما، وما زاد بعدده («3 لجان»): اسمُ الملفّ لا يطول بقائمة
  if (spec.committees.length > 2) parts.push(`${spec.committees.length} لجان`);
  else for (const id of spec.committees) parts.push(committees.find((c) => String(c.id) === id)?.name ?? "لجنة");
  // جنسٌ واحدٌ يُذكر، وما زاد كالكلّ لا يُذكر
  if (spec.genders.length === 1) parts.push({ female: "إناث", male: "ذكور", none: "الجنس غير محدّد" }[spec.genders[0]]);
  if (spec.stands.length === 1) parts.push({ active: "المتطوّعون", members: "صاروا أعضاء", former: "السابقون" }[spec.stands[0]]);
  if (spec.split === "committee") parts.push("بحسب اللجان");
  else if (spec.split === "gender") parts.push("بحسب الجنس");
  parts.push(today);
  return `${parts.join("، ").replace(/[\\/:*?"<>|]/g, " ")}.xlsx`;
}
