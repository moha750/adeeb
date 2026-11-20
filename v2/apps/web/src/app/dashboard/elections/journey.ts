// **رحلةُ المرشّح بكلماتها** — الحالةُ المعروضة و«ما التالي» والمحطّةُ القادمة لترشّحٍ واحد، من حاله
// وطور انتخابه وأسبابه الجديدة (المواد 14 و16 و29). لا يعتمد على شيءٍ خادميّ، فيقرؤه جالبُ العضو
// (`member-data.ts`) ومرآتُه في المحاكي (`sim/project.ts`) معًا، فلا تفترق جملتان عن حالٍ واحد.
// (كانت نسختين متطابقتين في الملفّين، فوُحِّدت هنا 2026-11-17.)
// والأسبابُ بنصّها من `reasons.ts`: اعتمدها محمد في دليل الإشعارات، فلا تُكتب ثانيةً.

import { fmtStamp } from "@/lib/dates";
import { CANDIDATE_STATUS_META, type CandidateStatus, type ElectionStatus } from "./vocab";
import { ENDED, REJECT } from "./reasons";
import type { LogTone } from "./log";

/** التجميدُ كما يراه صاحبُه: بعد موافقة القائد وحدها (الطلبُ قبلها لا يُرى)، وبلا اسم طالبه (المادة 5). */
export type MemberFreeze = {
  id: number;
  status: "active" | "answered";
  reason: string;
  answerDueRaw: string | null;
  answerText: string | null;
  answeredAtRaw: string | null;
  decideDueRaw: string | null;
};

export type JourneyFacts = {
  status: CandidateStatus;
  election: ElectionStatus;
  isWinner: boolean;
  position: string;
  /** المعتمَدُ الوحيد: التصويتُ عليه تزكيةٌ لا منافسة. */
  sole: boolean;
  gender: "male" | "female" | null;
  editDueRaw?: string | null;
  rejectReason?: string | null;
  endReason?: string | null;
  freeze?: MemberFreeze | null;
  cancelReason?: string | null;
};

const fm = (g: JourneyFacts["gender"], m: string, f: string) => (g === "female" ? f : m);
const dot = (s: string) => (/[.!؟]$/.test(s) ? s : `${s}.`);

export function statusView(f: JourneyFacts): { label: string; tone: LogTone; next: string; future: string | null } {
  const { status, election, isWinner, position, sole, gender: g } = f;
  if (election === "completed" && status === "approved") {
    return isWinner
      ? { label: "فائز", tone: "success", next: sole ? `نلتَ ثقة المصوّتين، مُبارَك لك يا ${position}` : `مُبارَك لك! فزتَ بالمقعد يا ${position}`, future: null }
      : { label: "لم يُوفَّق", tone: "info", next: "انتهى التصويت؛ لم يُوفَّق ترشّحك هذه المرّة، شكرًا لِمُشاركتك.", future: null };
  }
  const base = CANDIDATE_STATUS_META[status];
  const live = status === "pending" || status === "approved" || status === "needs_edit" || status === "frozen";
  // الانتخابُ الملغى يُقال بسببه (كان بلا رسالة)
  if (election === "cancelled" && live) {
    return { label: base.label, tone: base.tone, next: f.cancelReason ? `أُلغي الانتخاب. السبب: ${dot(f.cancelReason)}` : "أُلغي الانتخاب.", future: null };
  }
  switch (status) {
    case "pending":
      return { label: base.label, tone: base.tone, next: "تراجع إدارة الموارد البشرية ترشّحك، ولك أن تعدّله ما دام قيد المراجعة.", future: election === "candidacy_open" ? "تصويت" : null };
    case "needs_edit": {
      // المهلةُ يحدّدها المراجع، والتعديلُ فيها ولو أُغلق الباب (المادة 14)
      const due = fmtStamp(f.editDueRaw ?? null);
      return {
        label: base.label, tone: base.tone,
        next: due ? `مطلوبٌ تعديل ترشّحك. ${fm(g, "عدّله", "عدّليه")} قبل ${due}، وإلّا انتهى.` : "راجِع ملاحظة إدارة الموارد البشرية وعدّل بيانك أو ملفّك، ثمّ أعِد الإرسال.",
        future: "تصويت",
      };
    }
    case "approved": {
      const next = election === "voting_open"
        ? (sole ? "أنت المرشّح الوحيد، والتصويت مفتوح تصويتَ ثقة: يؤيّد المصوّتون أو يعترضون." : "التصويت جارٍ الآن على ترشّحك.")
        : election === "voting_closed" ? "أُغلق التصويت، وتُعلَن النتيجة حين يُحسم المقعد."
          : sole ? "قُبل ترشّحك، وأنت المرشّح الوحيد: يُعرَض على المصوّتين تصويتَ ثقة لا منافسة."
            : "مُبارك لك! تم قبول ترشحك لخوض مرحلة التصويت.";
      const future = (election === "candidacy_open" || election === "candidacy_closed") ? "تصويت"
        : (election === "voting_open" || election === "voting_closed") ? "النتيجة" : null;
      return { label: base.label, tone: base.tone, next, future };
    }
    case "rejected": {
      // «الاعتذار» لا «الرفض» (المادة 14)، ومعه سببُه من الثلاثة
      const why = f.rejectReason ? REJECT(f.rejectReason, g) : "";
      return { label: base.label, tone: base.tone, next: why ? `اعتذرت إدارة الموارد البشرية عن ترشّحك: ${dot(why)}` : "اعتذرت إدارة الموارد البشرية عن ترشّحك في هذا الانتخاب.", future: null };
    }
    case "withdrawn":
      return { label: base.label, tone: base.tone, next: `انسحبت من الترشّح، ولا ${fm(g, "تُرجعه", "تُرجعينه")} بنفسك: تُرجعه إدارة الموارد البشرية بطلبك قبل فتح التصويت.`, future: null };
    case "frozen": {
      const z = f.freeze;
      if (z?.status === "answered") {
        const due = fmtStamp(z.decideDueRaw);
        return { label: base.label, tone: base.tone, next: due ? `وصلت إجابتك، والقرار قبل ${due}.` : "وصلت إجابتك، والقرار عند إدارة الموارد البشرية.", future: null };
      }
      const due = fmtStamp(z?.answerDueRaw ?? null);
      const why = z?.reason ? ` السبب: ${dot(z.reason)}` : "";
      return { label: base.label, tone: base.tone, next: `طُلب استبعاد ترشّحك.${why}${due ? ` ${fm(g, "أجب", "أجيبي")} قبل ${due}، وإلّا استُبعد.` : ""}`, future: null };
    }
    case "ended": {
      const why = f.endReason ? ENDED(f.endReason, g) : "";
      return { label: base.label, tone: base.tone, next: why ? `انتهى ترشّحك: ${dot(why)}` : "انتهى ترشّحك في هذا الانتخاب.", future: null };
    }
    default:
      return { label: base.label, tone: base.tone, next: "", future: null };
  }
}
