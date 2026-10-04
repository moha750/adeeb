"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Badge, Button, Card, CardBody, CardHeader, Segmented, countPhrase } from "@adeeb/design-system";
import { Buildings, CalendarBlank, CalendarCheck, Certificate, ClipboardText, FlagCheckered, GenderIntersex, Infinity as Endless, LinkSimple, LockSimple, MapPin, Tray, UserCheck } from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import { dateOnlyParts, fmtTimeRange } from "@/lib/dates";
import { DropdownMenu } from "../_components/DropdownMenu";
import { EmptyState } from "../_components/EmptyState";
import type { OppListRow, OppRow } from "./data";

/**
 * **كرتُ الفرصة التطوّعيّة — «خطُّ المترو»، مُقَرٌّ من المالك ٢٠٢٦-٠٩-٣٠** (معرضُه `/ui/opportunity-card`).
 *
 * حياةُ الفرصة أربعُ محطّاتٍ على خطّ: الطلبات · القبول · الحضور · الشهادات. الخطُّ يمتلئ بما قُطع
 * منه ويبقى متقطّعًا فيما لم يُبلغ، والمحطّةُ التي عليك تنبض بالأصفر، ومحطّةُ القبول حلقةٌ تمتلئ
 * بنسبة المقاعد. وفي الصدر ورقةُ التقويم، وفي القاع سطرُ «ما الذي عليك الآن؟» بفعلٍ واحد.
 *
 * وسيرتُه ثلاثُ جولاتٍ في يومٍ واحد: رُدّت الأولى كلُّها (رتّبت حقولَ الفرصة ولم تقرأ حياتَها)،
 * وأُقرّت من الثانية فكرةُ شريط المراحل ورُدّ رسمُه، ثمّ اختار المالكُ المترو من أربعة رسومٍ له
 * (السهام · القمع · التذكرة والأختام معه)، ورُدّ بعده «المترو المبسّط» («ما أعجبني الكرت
 * المبسّط، أعتمد المترو»)، ثمّ رآهما جنبًا إلى جنب وأقرّ المترو («خلاص المترو يعتمد»، ٢٠٢٦-١٠-٠١).
 * وأُعدم المرفوضُ كلُّه بأصنافه، ومعه صفحةُ المقارنة وراية `lite`، كما جرت السنّة. ثمّ صار الكرتُ بلونٍ واحدٍ وصفِّ
 * أزرار (`OpportunityCardMono`، ٢٠٢٦-١٠-٠١) وأُعدم الأوّلُ بسطره السفليّ وصفحةُ مقارنته (جردُ الخلل، ٢٠٢٦-١٠-٠٣).
 * وكلُّ أحواله في معرض `/ui/opportunity-card/states`.
 */

/** ما يحتاجه الكرتُ: صفُّ الكشف بأعداد ما بعد التقديم (`listOpportunities`). */
export type OppCard = OppListRow;

export type OppHandlers = {
  onEdit: (o: OppCard) => void;
  onPublish: (o: OppCard) => void;
  onCopy: (o: OppCard) => void;
  onClose: (o: OppCard) => void;
  /** فتحُ سجلّ الفرصة من قائمة ⋮ (الكشفُ يمرّره؛ والسطرُ السفليّ يحمل رابطَ السجلّ في أحواله). */
  onOpen?: (o: OppCard) => void;
  /** إنهاءُ فرصةٍ مرنة (٢٠٢٦-١٠-٠١): في قائمة ⋮ ما لم تنقضِ. */
  onEnd?: (o: OppCard) => void;
  busy?: string | null;
};


/* ── زمنُ الفرصة ومحطّاتُها وخطوتُها التالية ─────────────────────────── */

/**
 * **زمنُ الفرصة بالنسبة إلى اليوم** — مصدرٌ واحد: يقرؤه الكرتُ ليعرف أحلّ موعدُها، وتقرؤه
 * غرفةُ الشهادات لتعرف من صار حضورُه وشهادتُه دَينًا (فلا يحكم الكرتُ بحلولها والدفترُ بغيره).
 * والفرصةُ بلا تاريخٍ لم يحلّ موعدُها بعدُ في الحالين. **والمرنةُ تنقضي أيضًا بإنهاء المشرف** (`endedAt`،
 * ٢٠٢٦-١٠-٠١): لا يومَ أخيرَ لها إن لم يُكتب، فإنهاؤها يدًا هو انقضاؤها.
 */
export function timeOf(o: Pick<OppRow, "startsOn" | "endsOn"> & { endedAt?: string | null }, today: string) {
  const end = o.endsOn ?? o.startsOn;
  return {
    ended: !!o.endedAt || (!!end && end < today),
    running: !o.endedAt && !!o.startsOn && o.startsOn <= today && !!end && end >= today,
  };
}

/** كلماتُ المحطّة الثالثة: الحضورُ ليومٍ، والإنجازُ لعملٍ مرنٍ لا يومَ له (العمودُ واحدٌ في القاعدة). */
function attendWords(o: Pick<OppRow, "flexible">) {
  return o.flexible
    ? { station: "الإنجاز", before: "بعد انتهائها", unrecorded: "بانتظار تأكيد الإنجاز", allDone: "أنجزوا جميعًا", missed: "لم ينجز", none: "لا منجزين", after: "بعد الإنجاز", certDone: "صدرت للمنجزين" }
    : { station: "الحضور", before: "يومَ الفرصة", unrecorded: "بانتظار تأكيد الحضور", allDone: "حضروا جميعًا", missed: "غاب", none: "لا حاضرين", after: "بعد الحضور", certDone: "صدرت للحاضرين" };
}

/**
 * حالُ المحطّة خمسة: **تمّت** · **جارية** (بعضُها، كمقاعدَ لم تكتمل) · **عليك** (متأخّرةٌ تنتظر يدك) ·
 * **لم يأتِ وقتُها** · **سقطت** (لا شيءَ يمرّ منها: انقضت الفرصةُ بلا مقبولين).
 */
export type StageState = "done" | "part" | "now" | "todo" | "void";
export type Stage = {
  key: "apply" | "accept" | "attend" | "certify";
  label: string;
  icon: ReactNode;
  n: number | null;
  of: number | null;
  note: string;
  state: StageState;
};

export function stagesOf(o: OppCard, today: string): Stage[] {
  const { ended, running } = timeOf(o, today);
  const began = ended || running;
  const applied = o.pending + o.accepted + o.rejected + o.expired;
  const recorded = o.attended + o.absent;
  const full = o.seats != null && o.accepted >= o.seats;
  const w = attendWords(o);
  return [
    {
      key: "apply", label: "الطلبات", icon: <Tray aria-hidden />, n: applied, of: null,
      // والفائتُ قبل المراجعة يُقال (`expired`، ٢٠٢٦-١٠-٠٣)، والمنتهيةُ بلا متقدّمٍ لا تنتظر أحدًا «بعد»
      note: o.pending > 0 ? `${o.pending} بانتظار المراجعة` : o.expired > 0 ? `لم يُراجَع ${o.expired}` : applied > 0 ? "رُوجعت كلُّها"
        : o.status === "draft" ? "بعد فتحها" : ended ? "لا متقدّمين" : "لا متقدّمين بعد",
      state: o.pending > 0 ? "now" : applied > 0 ? "done" : began ? "void" : "todo",
    },
    {
      key: "accept", label: "القبول", icon: <UserCheck aria-hidden />, n: o.accepted, of: o.seats,
      // «باقٍ» وعدٌ بمقعدٍ يُنال، فلا يُقال في فرصةٍ انتهت (جردُ الخلل، ٢٠٢٦-١٠-٠٣)
      note: ended && o.accepted === 0 ? "لم يُقبل أحد" : o.seats == null ? "العددُ مفتوح" : full ? "اكتمل العدد"
        : ended ? "لم يكتمل العدد" : `باقٍ ${o.seats - o.accepted}`,
      state: full || (began && o.accepted > 0) ? "done" : o.accepted > 0 ? "part" : began ? "void" : "todo",
    },
    {
      key: "attend", label: w.station, icon: <CalendarCheck aria-hidden />,
      n: began && o.accepted > 0 ? o.attended : null, of: began && o.accepted > 0 ? o.accepted : null,
      note: !began ? w.before : o.accepted === 0 ? "لا مقبولين" : o.accepted > recorded ? `${o.accepted - recorded} ${w.unrecorded}` : o.absent > 0 ? `${w.missed} ${o.absent}` : w.allDone,
      state: !began ? "todo" : o.accepted === 0 ? "void" : o.accepted > recorded ? "now" : "done",
    },
    {
      key: "certify", label: "الشهادات", icon: <Certificate aria-hidden />,
      // الشهادةُ للمتطوّع في الفرصة لا للفترة: تُقاس بمن حضر أشخاصًا (`attendees`) لا بالفترات المحضورة
      n: o.attended > 0 ? o.certified : null, of: o.attended > 0 ? o.attendees : null,
      // كلُّ حاضرٍ يأخذ شهادتَه (سياسةُ ٢٠٢٦-١٠-٠٣)، فما بقي بعد الحضور إصدارُها، والمحجوبةُ تُقال
      note: o.attended === 0 ? (began && recorded >= o.accepted ? w.none : w.after) : o.owed > 0 ? `بانتظار الإصدار ${o.owed}`
        : o.withheld > 0 ? `حُجبت ${o.withheld}` : w.certDone,
      state: o.attended === 0 ? (began && recorded >= o.accepted ? "void" : "todo") : o.owed > 0 ? "now" : "done",
    },
  ];
}

type Act = "publish" | "decide" | "share" | "attend" | "certify" | "close" | "record";
type Step = { tone: "brand" | "warning" | "success" | "neutral"; text: string; act: Act };

/**
 * **الخطوةُ التالية** — جوابُ «ما الذي عليّ الآن؟» بترتيب الحياة لا بترتيب الحقول.
 * والمنقضي يُسأل عن الحضور قبل الطلبات: طلبٌ معلّقٌ في فرصةٍ مضت لا يُقبل، وحضورٌ لم يُسجَّل
 * يحبس الشهادةَ خلفه.
 */
export function nextStep(o: OppCard, today: string): Step {
  if (o.status === "draft") return { tone: "warning", text: "مسوّدةٌ لا يراها المتطوّعون بعد", act: "publish" };
  const { ended, running } = timeOf(o, today);
  const recorded = o.attended + o.absent;
  if (ended || running) {
    if (o.accepted > recorded) return { tone: "warning", text: `${o.accepted - recorded} ${attendWords(o).unrecorded}`, act: "attend" };
    if (o.owed > 0) return { tone: "warning", text: `${o.owed} بانتظار الشهادة`, act: "certify" };
  }
  if (ended) {
    if (o.status === "open") return { tone: "warning", text: "مضى موعدُها وهي مفتوحةٌ للتقديم", act: "close" };
    return o.accepted > 0
      ? { tone: "success", text: "اكتملت بسجلّها وشهاداتها", act: "record" }
      : { tone: "neutral", text: "انتهت بلا مشاركين", act: "record" };
  }
  if (o.pending > 0) return { tone: "warning", text: `${o.pending} بانتظار مراجعتك`, act: "decide" };
  if (running) return { tone: "brand", text: "جاريةٌ الآن", act: "record" };
  if (o.status === "closed") {
    return { tone: "neutral", text: o.flexible ? "انتهى التقديم، والعملُ جارٍ" : "أُغلق التقديمُ والموعدُ لم يأتِ", act: "record" };
  }
  if (o.seats != null && o.accepted >= o.seats) return { tone: "success", text: "اكتمل العدد", act: "record" };
  return { tone: "brand", text: "مفتوحةٌ للتقديم", act: "share" };
}

/**
 * **الأحوالُ الثلاث التي يراها المشرف** — الإحدى عشرة لا تُحفظ ولا تُتعلَّم: تبقى جملةً في السطر
 * السفليّ، وما يُرى باللون سؤالٌ واحد «أعليّ شيء؟».
 * - `due`  (**تنتظرك**): خطوتُها التالية تحذير، أيًّا كانت (فتحٌ · مراجعةٌ · حضورٌ · شهادةٌ · إغلاق).
 * - `flow` (**في طريقها**): لا شيءَ عليك الآن وموعدُها لم ينقضِ.
 * - `done` (**منتهية**): انقضت وأُقفلت بسجلّها، أو بلا مشاركين.
 * فالفرصةُ لا تصير منتهيةً بمرور موعدها بل بإقفالها: معرضٌ مضى ولم يُسجَّل حضورُه «تنتظرك».
 */
export type Phase = "due" | "flow" | "done";

export function phaseOf(o: OppCard, today: string): Phase {
  if (nextStep(o, today).tone === "warning") return "due";
  return timeOf(o, today).ended ? "done" : "flow";
}

/* ── ما تتقاسمه الهيئات ─────────────────────────────────────────────── */

const record = (o: OppRow) => `/dashboard/volunteering/${o.id}`;

/**
 * ورقةُ التقويم: الشهرُ شريطٌ بنغمة الكرت، واليومُ رقمٌ، وتحته **يومُ النهاية** إن امتدّت أو اسمُ اليوم.
 * والنهايةُ تاريخٌ لا عدد (أمرُ المالك ٢٠٢٦-١٠-٠١): كانت «يومان» فسأل «يومان وتقفل؟ أم مدّتها
 * يومان؟»، والعددُ وحدَه يُقرأ مدّةً وعدًّا تنازليًّا معًا. فصارت «حتى 29»، ويُذكر الشهرُ إن اختلف
 * («حتى 2 أكتوبر»)، وتلتفّ سطرين في الورقة الضيّقة ولا تُقصّ. **والورقةُ بطولٍ واحدٍ أبدًا**: سطرُها
 * السفليُّ يحجز سطرين ويتوسّطهما الواحد، والفرصةُ بلا موعدٍ بطبقاتها الثلاث نفسِها (أيقونةٌ مكانَ اليوم).
 */
export function Leaf({ o, flag, end = true }: { o: Pick<OppRow, "flexible" | "startsOn" | "endsOn">; flag?: string; end?: boolean }) {
  // **المرنةُ** لانهايةٌ لا تقويم (أمرُ المالك ٢٠٢٦-١٠-٠٣): ذاك لـ«لم يُحدَّد» وحدَها، فيُعرف الفرقُ قبل قراءة الكلمة.
  // وتحتها «حتى 20 أكتوبر» إن كان لها آخرُ موعدٍ للإنجاز، كالممتدّة (كانت تاريخًا تحته «آخرُ يوم» فلم يُفهم)، وإلّا «مرنة»
  if (o.flexible) {
    const d = dateOnlyParts(o.endsOn);
    return (
      <span className="vop-leaf is-empty" aria-label={d ? `مرنة حتى ${d.day} ${d.month}` : "مرنة بلا موعد"}>
        <span className="vop-leaf-m">الموعد</span>
        <span className="vop-leaf-d"><Endless aria-hidden /></span>
        <span className="vop-leaf-n">{flag ?? (d ? `حتى ${d.day}\u00A0${d.month}` : "مرنة")}</span>
      </span>
    );
  }
  const s = dateOnlyParts(o.startsOn);
  if (!s) {
    return (
      <span className="vop-leaf is-empty" aria-label="بلا موعد">
        <span className="vop-leaf-m">الموعد</span>
        <span className="vop-leaf-d"><CalendarBlank aria-hidden /></span>
        <span className="vop-leaf-n">لم يُحدَّد</span>
      </span>
    );
  }
  const e = end && o.endsOn && o.endsOn !== o.startsOn ? dateOnlyParts(o.endsOn) : null;
  // والرقمُ موصولٌ بشهره (مسافةٌ لا تنكسر): تلتفّ «حتى» وحدَها لا «حتى 2» عن «نوفمبر»
  const until = e ? (e.month === s.month && e.year === s.year ? `حتى ${e.day}` : `حتى ${e.day}\u00A0${e.month}`) : null;
  return (
    <span className="vop-leaf">
      <span className="vop-leaf-m">{s.month}</span>
      <span className="vop-leaf-d">{s.day}</span>
      {/* «يوم الثلاثاء» لا «الثلاثاء» وحدَها (أمرُ المالك ٢٠٢٦-١٠-٠٣) */}
      <span className="vop-leaf-n">{flag ?? until ?? `يوم ${s.weekday}`}</span>
    </span>
  );
}

/* ── الكرت: لونٌ واحد وصفُّ أزرار (٢٠٢٦-١٠-٠١) ─────────────────
   رأى المالكُ في الكرت أربعةَ ألوانٍ (إطارٌ براند، وشارةٌ خضراء، وسطرٌ أصفر، ومحطّةٌ صفراء) وسائرُ
   كروت اللوحة بلونٍ واحدٍ هو لونُ حالتها (ق٤: النغمةُ تُعلَن مرّةً والأجزاءُ تقرؤها)، وطلب أزرارًا
   ظاهرةً كنسخ الرابط والتعديل. فهنا: النغمةُ نغمةُ الشارة وحدَها، والسطرُ السفليُّ يسقط لأنّ المترو
   يقوله (المحطّةُ التي عليك تحمل جملتَه وتنبض)، ومكانُه صفُّ أزرارٍ بقانون ق١٦. */

/**
 * **حالُ الشارة أربعٌ لا ثلاث** (أمرُ المالك ٢٠٢٦-١٠-٠١): «مغلقة» في القاعدة تعني «أُغلق التقديم»، وهي تقع في
 * زمنين: فرصةٌ حيّةٌ ينتظرها يومُها أو حضورُها وشهاداتُها، وفرصةٌ قضت وأُقفل سجلُّها. وكانتا رماديّتين معًا،
 * فجلس في «تنتظرك» كرتٌ رماديٌّ بزرّ «سجّل الحضور» رماديٍّ يُقرأ معطّلًا. فالحيّةُ **مغلقة** بلون الهويّة،
 * والقاضيةُ **منتهية** بالرصاص، وهي حالُ تبويب «المنتهية» نفسُها (`phaseOf`) فلا تقع إلّا فيه. والقاعدةُ
 * لم تتغيّر: هذه قراءةٌ للعرض لا حالةٌ تُخزَّن. **والشارةُ تقول ما تعنيه للمتطوّع** (أمرُه في اليوم نفسه:
 * «بدل مفتوح، مُتاح للتقديم»): «مفتوحة» و«مغلقة» وحدَهما لا تقولان مفتوحةٌ لماذا، فصارتا «متاحة للتقديم» و«انتهى
 * التقديم»: لا «انتهى وقتُ التقديم»، فالتقديمُ يُغلق أيضًا باكتمال العدد (قبولُ آخر مقعدٍ يغلقه، ٢٠٢٦-١٠-٠١)
 * والوقتُ لم ينتهِ. و«مسوّدة» صارت «مسوّدة غير منشورة» (أمرُه ٢٠٢٦-١٠-٠٣): الكلمةُ وحدَها لا تقول إنّ المتطوّعين لا يرونها.
 */
type MonoTone = "warning" | "success" | "brand" | "neutral";

export function monoState(o: OppCard, today: string): { tone: MonoTone; label: string; badge: "warning" | "success" | "info" | "neutral" } {
  if (o.status === "draft") return { tone: "warning", label: "مسوّدة غير منشورة", badge: "warning" };
  if (o.status === "open") return { tone: "success", label: "متاحة للتقديم", badge: "success" };
  return phaseOf(o, today) === "done"
    ? { tone: "neutral", label: "منتهية", badge: "neutral" }
    : { tone: "brand", label: "انتهى التقديم", badge: "info" };
}

/** الزرُّ المصمت بنغمة كرته، والهويّةُ زرُّها الأساس (`primary`). */
const solidOf = (t: MonoTone) => (t === "brand" ? "primary" : t);

type Btn = "publish" | "decide" | "attend" | "certify" | "close" | "record" | "share" | "edit";

/** أزرارُ الكرت: الخطوةُ التالية (أو بابُ السجلّ حين لا خطوة)، ونسخُ الرابط للمفتوحة، والتعديلُ لما لم ينقضِ. */
function buttonsOf(o: OppCard, today: string): Btn[] {
  const act = nextStep(o, today).act;
  const { ended } = timeOf(o, today);
  const out: Btn[] = [act === "share" ? "record" : act];
  if (o.status === "open" && !ended) out.push("share");
  if (!ended) out.push("edit");
  return out;
}

const STEP_LABEL: Record<"publish" | "decide" | "attend" | "certify" | "close", string> = {
  publish: "نشرُ الفرصة", decide: "راجع الطلبات", attend: "أكّد الحضور", certify: "أصدر الشهادات", close: "إغلاقُ التقديم",
};
/** المرنةُ عملٌ يُنجَز لا يومٌ يُحضَر، فأزرارُها بالإنجاز. */
const FLEX_LABEL: Record<"attend" | "certify", string> = { attend: "أكّد الإنجاز", certify: "أصدر الشهادات" };

function MonoButton({ b, o, tone, h }: { b: Btn; o: OppCard; tone: MonoTone; h: OppHandlers }) {
  switch (b) {
    case "publish":
    case "close":
      return <Button variant={solidOf(tone)} size="sm" loading={h.busy === o.id} onClick={() => (b === "publish" ? h.onPublish(o) : h.onClose(o))}>{STEP_LABEL[b]}</Button>;
    case "decide":
    case "attend":
    case "certify":
      return <Link href={record(o)} className={`abtn abtn-${solidOf(tone)} abtn-sm`}>{o.flexible && b !== "decide" ? FLEX_LABEL[b] : STEP_LABEL[b]}</Link>;
    case "share": return <Button variant="ghost" size="sm" onClick={() => h.onCopy(o)}>نسخُ الرابط</Button>;
    case "edit": return <Button variant="ghost" size="sm" onClick={() => h.onEdit(o)}>تعديل</Button>;
    default: return <Link href={record(o)} className="abtn abtn-ghost abtn-sm">سجلّ الفرصة</Link>;
  }
}

/**
 * **الموعدُ كما كُتب في النافذة: سطرُ التاريخ ثمّ سطرُ الساعات** (أمرُ المالك ٢٠٢٦-١٠-٠١: «راجع كيف تُنشئ
 * الفرصة، وكأنّك مستخدم»). المشرفُ يكتب تاريخَي البداية والنهاية في صفّ، ثمّ «من الساعة» و«إلى الساعة» في
 * صفٍّ تحته. وكان الكرتُ يفرّق ما جمعه: البدايةُ في ورقة التقويم، والنهايةُ («حتى 2 نوفمبر») في خانةٍ اسمُها
 * «الوقت» مخلوطةً بالساعات، فلا يجد ما كتبه حيث يبحث عنه. فالخانةُ «الموعد» بسطرين يطابقان صفَّي النافذة:
 * الأيّامُ («من 30 أكتوبر إلى 2 نوفمبر»، أو «الجمعة 30 أكتوبر» ليومٍ واحد)، ثمّ الساعاتُ («من 4 م إلى 10 م
 * يوميًّا»: الساعتان في القاعدة `daily_*` تتكرّران كلَّ يوم). والورقةُ تبقى رأسَ الكرت بيوم البداية، كعادة كروت
 * الفعاليّات: ورقةُ تقويمٍ تُلمح، وسطرٌ يُقرأ. وبلا سنة: الكرتُ في كشف هذا الموسم.
 */
function scheduleParts(o: OppRow): string[] {
  // المرنةُ لا يومَ لها ولا ساعة: تقول ذلك، وآخرَ يومها إن كُتب، أو أنّها أُنهيت
  if (o.flexible) {
    const d = dateOnlyParts(o.endsOn);
    return ["مرنة، بلا يومٍ ولا ساعة", o.endedAt ? "أُنهيت" : d ? `حتى ${d.weekday} ${d.day} ${d.month}` : "تُنهى حين يكتمل العمل"];
  }
  const s = dateOnlyParts(o.startsOn);
  const e = s && o.endsOn && o.endsOn > o.startsOn! ? dateOnlyParts(o.endsOn) : null;
  const days = !s ? null
    : !e ? `${s.weekday} ${s.day} ${s.month}`
    : e.month === s.month && e.year === s.year ? `من ${s.day} إلى ${e.day} ${s.month}`
    : `من ${s.day} ${s.month} إلى ${e.day} ${e.month}`;
  // «يوميًّا» للمدى المحفوظ ساعتين في فرصةٍ تمتدّ أيّامًا؛ والمدّةُ النصّيّةُ القديمة تقول نفسَها
  const hours = o.periods.length ? periodsHours(o) : o.timeLabel && e && o.dailyFrom ? `${o.timeLabel} يوميًّا` : o.timeLabel;
  return [days, hours].filter((x): x is string => !!x);
}

/**
 * **سطرُ الساعات لفرصةٍ ذاتِ فترات** (٢٠٢٦-١٠-٠١): الفترةُ الواحدةُ بساعتيها، والفترتان فأكثر بعددها،
 * ومعه مدى اليوم كلِّه إن كانت كلُّها في يومٍ واحدٍ لا تعبر منتصفَ الليل («فترتان، من 8 ص إلى 8 م»).
 * وتفصيلُ كلِّ فترةٍ في سجلّ الفرصة: الكرتُ نظرةٌ لا جدول.
 */
function periodsHours(o: OppRow): string {
  const ps = o.periods;
  if (ps.length === 1) return fmtTimeRange(ps[0].from, ps[0].to);
  const count = countPhrase(ps.length, { one: "فترةً", two: "فترتان", few: "فترات" });
  const oneDay = ps.every((p) => p.day === ps[0].day) && ps.every((p) => p.to > p.from);
  if (!oneDay) return count;
  const from = ps.map((p) => p.from).sort()[0];
  const to = ps.map((p) => p.to).sort().at(-1)!;
  return `${count}، ${fmtTimeRange(from, to)}`;
}

/** حقيقةٌ تُقرأ أجزاءً (`parts`): كلُّ جزءٍ سطرُه (الأيّامُ ثمّ الساعات)، فلا ينشقّ «10» عن «م». */
type Fact = { key: string; icon: ReactNode; label: string; value: string | null; parts?: string[]; na: string };

/** خاناتُ الفرصة (الجهة · المكان · الموعد · الجنس) — تقرؤها صفحةُ الفرصة كما يقرؤها الكرت. */
export function OppFacts({ o }: { o: OppRow }) {
  return (
    <div className="acard-info vop-facts">
      {factsOf(o).map((f) => (
        <div key={f.key} className="acard-info-row">
          <span className="acard-ic">{f.icon}</span>
          <span className="acard-info-txt">
            <span className="acard-info-label">{f.label}</span>
            {f.value
              ? <span className={"acard-info-val" + (f.parts ? " is-parts" : "")} title={f.value}>
                  {f.parts ? f.parts.map((p) => <span key={p} className="vop-part">{p}</span>) : f.value}
                </span>
              : <span className="acard-info-val na">{f.na}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function factsOf(o: OppRow): Fact[] {
  const who = o.targetGender === "male" ? "الرجال" : o.targetGender === "female" ? "النساء" : "الجميع";
  return [
    { key: "committee", icon: <Buildings aria-hidden />, label: "الجهة المُحتاجة", value: o.committee, na: "بلا لجنة" },
    { key: "location", icon: <MapPin aria-hidden />, label: "المكان", value: o.location, na: "لم يُحدَّد" },
    { key: "when", icon: <CalendarBlank aria-hidden />, label: "الموعد", value: scheduleParts(o).join("، ") || null, parts: scheduleParts(o), na: "لم يُحدَّد" },
    { key: "gender", icon: <GenderIntersex aria-hidden />, label: "الجنس", value: who, na: "" },
  ];
}

export function OpportunityCardMono({ o, today, ...h }: { o: OppCard; today: string } & OppHandlers) {
  const state = monoState(o, today);
  const tone = state.tone;
  const { ended } = timeOf(o, today);
  const btns = buttonsOf(o, today);
  // القائمةُ لما لم يصر زرًّا: الكرتُ يُظهر أفعالَه فيسقط توأمُها عن النقاط الثلاث
  const items = [
    ...(h.onOpen && !btns.includes("record") ? [{ label: "سجلّ الفرصة", icon: <ClipboardText size={18} />, onSelect: () => h.onOpen!(o) }] : []),
    ...(!btns.includes("edit") ? [{ label: "تعديل", icon: <PencilSimple size={18} />, onSelect: () => h.onEdit(o) }] : []),
    ...(o.status === "open" && !btns.includes("share") ? [{ label: "نسخُ الرابط", icon: <LinkSimple size={18} />, onSelect: () => h.onCopy(o) }] : []),
    ...(o.status === "open" && !btns.includes("close") ? [{ label: "إغلاقُ التقديم", icon: <LockSimple size={18} />, danger: true, onSelect: () => h.onClose(o) }] : []),
    // المرنةُ تُنهى يدًا ما لم تنقضِ (٢٠٢٦-١٠-٠١): بعدها يُسجَّل إنجازُ المقبولين وتُصدر شهاداتُهم
    ...(o.flexible && o.status !== "draft" && !ended && h.onEnd ? [{ label: "إنهاءُ الفرصة", icon: <FlagCheckered size={18} />, danger: true, onSelect: () => h.onEnd!(o) }] : []),
  ];
  return (
    <Card tone={tone} className="vop vop-mono">
      <div className="vop-row">
        <div className="vop-head">
          {/* الورقةُ تاريخٌ لا حال (أمرُ المالك ٢٠٢٦-١٠-٠٣: «المفروض تعرض التاريخ، ليش جارية وانتهت؟ البادج يعرضها»):
              اسمُ اليوم ليومٍ واحد، و«حتى 29» لما يمتدّ */}
          <Leaf o={o} />
          <div className="vop-id">
            <h4 className="vop-name" title={o.title}>{o.title}</h4>
            <p className="vop-meta"><Badge tone={state.badge} size="sm">{state.label}</Badge></p>
          </div>
          {items.length ? (
            <div className="vop-end">
              <span onClick={(e) => e.stopPropagation()}><DropdownMenu groups={[{ items }]} tone={tone === "brand" ? undefined : tone} /></span>
            </div>
          ) : null}
        </div>
        <OppFacts o={o} />
        <div className="vop-track"><Metro stages={stagesOf(o, today)} labelFirst /></div>
      </div>
      <div className="vop-acts btn-row">
        {btns.map((b) => <MonoButton key={b} b={b} o={o} tone={tone} h={h} />)}
      </div>
    </Card>
  );
}

/* ── خطُّ المترو ─────────────────────────────────────────────────────── */

/**
 * `labelFirst`: اسمُ المحطّة فوق دائرتها لا تحتها (أمرُ المالك ٢٠٢٦-١٠-٠١): الرقمُ فوق الاسم كان يُقرأ
 * جملةً واحدةً «٥ الطلبات»، والعربيّةُ لا تقولها. فوق الدائرة يُقرأ عنوانًا ثمّ عدّه ثمّ ملاحظته:
 * «الطلبات، ٥، 2 بانتظار المراجعة». والترتيبُ في الشجرة نفسِها لا بـ`order`، فيقرؤه القارئُ الصوتيّ كما يُرى.
 */
function Metro({ stages, labelFirst = false }: { stages: Stage[]; labelFirst?: boolean }) {
  return (
    <ol className="vop-metro" aria-label="مراحلُ الفرصة">
      {stages.map((s) => {
        const ring = s.key === "accept" && s.of ? ({ "--p": Math.min(100, ((s.n ?? 0) / s.of) * 100) } as CSSProperties) : undefined;
        const showNum = s.n != null && s.state !== "todo" && s.state !== "void";
        return (
          <li key={s.key} className={`vop-mst is-${s.state}${ring ? " has-ring" : ""}`}>
            {labelFirst ? <span className="vop-mst-k">{s.label}</span> : null}
            <span className="vop-mst-dot" style={ring}>{showNum ? <b>{s.n}</b> : s.icon}</span>
            {labelFirst ? null : <span className="vop-mst-k">{s.label}</span>}
            <span className="vop-mst-s">{s.key === "accept" && s.of != null ? `من ${s.of}، ${s.note}` : s.note}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ── الكشف ──────────────────────────────────────────────────────────── */

const byStart = (a: OppRow, b: OppRow) => (a.startsOn ?? "").localeCompare(b.startsOn ?? "");

/**
 * **رفوفُ الكشف بحال الفرصة وحدَها** (أمرُ المالك ٢٠٢٦-١٠-٠٣: «هذه التقسيمات غير واضحة أبدًا … أبغى شيئًا واضحًا،
 * وأتجنّب السطورَ التوضيحيّة»). كانت ثلاثًا بسؤال «أعليك شيء؟» (تنتظرك · في طريقها · المنتهية)، فكانت الفرصةُ الساريةُ
 * التي فيها طلبٌ معلّق في «تنتظرك» لا حيث يقول اسمُها، فلا يُفهم التقسيمُ إلّا بشرح. فصار الرفُّ حالَها وحدَها، فيصدق
 * اسمُه بلا استثناء: **مسوّدات** لم تُنشر · **سارية** منشورةٌ لم ينتهِ موعدُها · **منتهية** انتهى موعدُها.
 * وما يحتاجك يُعرف بغير الرفّ: قائمةٌ وحدَه فوق الرفوف (`OpportunityTodo`).
 */
export type Shelf = "draft" | "live" | "done";

export const SHELF_LABEL: Record<Shelf, string> = { draft: "مسوّدات", live: "سارية", done: "منتهية" };

export function shelfOf(o: OppCard, today: string): Shelf {
  if (o.status === "draft") return "draft";
  return timeOf(o, today).ended ? "done" : "live";
}

/** أتحتاجك الآن؟ خطوتُها التالية تحذير (نشرٌ · مراجعةٌ · تأكيدُ حضور · شهادةٌ · إغلاق). */
export const needsYou = (o: OppCard, today: string) => nextStep(o, today).tone === "warning";

// ترتيبُ غرفة الفعاليّات نفسُه (قادمة · مسودّات · منتهية): ما يُعمل فيه أوّلًا، ويفتح عليه الكشف
const SHELVES: Shelf[] = ["live", "draft", "done"];

const EMPTY_TAB: Record<Shelf, { icon: ReactNode; title: string; description: string }> = {
  draft: {
    icon: <PencilSimple />,
    title: "لا مسوّدات",
    description: "الفرصةُ التي تحفظها مسوّدةً تبقى هنا حتى تنشرها.",
  },
  live: {
    icon: <CalendarCheck />,
    title: "لا فرصَ سارية",
    description: "الفرصةُ المنشورةُ تبقى هنا حتى ينتهي موعدُها.",
  },
  done: {
    icon: <Certificate />,
    title: "لا فرصَ منتهية بعد",
    description: "الفرصةُ التي انتهى موعدُها تنتقل إلى هنا.",
  },
};

/** أيقونةُ كلّ فعلٍ في قائمة «تحتاج إجراءً منك»: ما يُفعل لا حالُ الفرصة. */
const TODO_ICON: Record<Act, ReactNode> = {
  decide: <Tray aria-hidden />, attend: <CalendarCheck aria-hidden />, certify: <Certificate aria-hidden />,
  publish: <PencilSimple aria-hidden />, close: <LockSimple aria-hidden />, share: null, record: null,
};
/** الأعجلُ أوّلًا: متقدّمٌ ينتظر جوابًا، ثمّ حضورٌ يحبس الشهادة، ثمّ الشهادة، ثمّ ما يُغلق، ثمّ ما يُنشر. */
const TODO_ORDER: Act[] = ["decide", "attend", "certify", "close", "publish"];

/**
 * **قائمةُ «تحتاج إجراءً منك»** (٢٠٢٦-١٠-٠٣): سؤالُ «ما عليّ؟» له مكانُه فوق الرفوف لا داخلها. كانت الرفوفُ تُجيبه
 * فكانت الساريةُ ذاتُ الطلب المعلّق في غير رفّ اسمِها، ثمّ جُرّبت علامةٌ صفراء على الرفّ فلم تُفهم. وهو نمطُ «مجموعة
 * الانتباه» في لوحات المراجعة (Gerrit): ما ينتظرك قائمةٌ وحدَه، والرفوفُ بالحال وحدَها. فكلُّ صفٍّ فرصةٌ وما ينتظرك فيها
 * وفعلُه (صفُّ القائمة المُقَرّ `.lrow`)، والقائمةُ لا تُرسم حين لا شيء ينتظرك، والفرصةُ باقيةٌ في رفّها أيضًا.
 */
function OpportunityTodo({ rows, today, ...h }: { rows: OppCard[]; today: string } & OppHandlers) {
  const todo = rows
    .filter((o) => needsYou(o, today))
    .map((o) => ({ o, step: nextStep(o, today) }))
    .sort((a, b) => TODO_ORDER.indexOf(a.step.act) - TODO_ORDER.indexOf(b.step.act) || byStart(a.o, b.o));
  if (!todo.length) return null;
  return (
    <Card>
      <CardHeader variant="soft" icon={<Tray />} title="تحتاج إجراءً منك" actions={<Badge tone="warning" size="sm">{todo.length}</Badge>} />
      <CardBody>
        <div className="lrow vop-todo">
          {todo.map(({ o, step }) => (
            <div key={o.id} className="lrow-i">
              <span className="lrow-ic">{TODO_ICON[step.act]}</span>
              <span className="lrow-tx">
                <b>{o.title}</b>
                <span>{step.text}</span>
              </span>
              <span className="lrow-end"><MonoButton b={step.act} o={o} tone="brand" h={h} /></span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * **الكشفُ ثلاثةُ رفوف** (`shelfOf`): الفرصةُ في رفٍّ واحدٍ أبدًا، وكلُّ رفٍّ شبكةٌ واحدة (ق٦ لا تمسّ إلّا آخرَها).
 *
 * - **يفتح على «سارية» دائمًا**، وهي أوّلُها كما في غرفة الفعاليّات: ما يُعمل فيه أكثرَ الوقت.
 * - **وما يحتاجك فوق الرفوف** (`OpportunityTodo`)، لا علامةَ ولا ترتيبَ داخلها.
 * - **الكرتُ لا يختفي صامتًا**: إذا غادر فعلٌ أو تحديثٌ كرتًا من الرفّ المعروض إلى غيره نُودي `onMoved` بوجهته
 *   (نشرُ مسوّدةٍ ينقلها إلى «سارية»)، فتقول الغرفةُ أين صار. ولا يُنادى للّوحة أوّلَ رسمها.
 * - **وما بعدها**: إذا كثرت الفرصُ فالبحثُ عبر الرفوف هو الأداة، ولـ«منتهية» مرشِّحُ سنة.
 */
export function OpportunityBoard({ rows, today, onMoved, ...h }: {
  rows: OppCard[];
  today: string;
  /** فرصةٌ غادرت الرفَّ المعروض إلى `to` بعد تحديث الصفوف. */
  onMoved?: (o: OppCard, to: Shelf) => void;
} & OppHandlers) {
  const [tab, setTab] = useState<Shelf>("live");
  const shelves = useMemo(() => new Map(rows.map((o) => [o.id, shelfOf(o, today)])), [rows, today]);
  const lists = useMemo(() => {
    // بالموعد وحدَه (المنتهيةُ أحدثُها أوّلًا): ما يحتاجك له قائمتُه فوق الرفوف، فلا يُعاد ترتيبُ الرفّ به
    const of = (p: Shelf) => rows.filter((o) => shelves.get(o.id) === p);
    return {
      draft: of("draft").sort(byStart),
      live: of("live").sort(byStart),
      done: of("done").sort((a, b) => byStart(b, a)),
    };
  }, [rows, shelves]);

  // ما كانت عليه كلُّ فرصةٍ في الرسم السابق: الفرقُ بينه وبين الآن هو الانتقال
  const seen = useRef<Map<string, Shelf> | null>(null);
  useEffect(() => {
    const prev = seen.current;
    seen.current = shelves;
    if (!prev || prev === shelves || !onMoved) return;
    for (const o of rows) {
      const from = prev.get(o.id);
      const to = shelves.get(o.id);
      if (from === tab && to && to !== from) onMoved(o, to);
    }
  }, [shelves, rows, tab, onMoved]);

  const shown = lists[tab];
  return (
    <div className="vop-board">
      <OpportunityTodo rows={rows} today={today} {...h} />
      <Segmented
        wide
        items={SHELVES.map((p) => ({
          value: p,
          label: <>{SHELF_LABEL[p]} <span className="seg-num">{lists[p].length}</span></>,
        }))}
        value={tab}
        onValueChange={(v) => setTab(v as Shelf)}
      />
      {shown.length ? (
        // عمودان على الحاسوب وعمودٌ على الجوّال (سابقةُ سجلّ المتطوّعين)
        <div className="card-grid card-grid-2col">
          {shown.map((o) => <OpportunityCardMono key={o.id} o={o} today={today} {...h} />)}
        </div>
      ) : (
        <EmptyState variant="soft" {...EMPTY_TAB[tab]} />
      )}
    </div>
  );
}
