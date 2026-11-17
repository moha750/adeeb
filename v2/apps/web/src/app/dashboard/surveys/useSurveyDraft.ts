"use client";

/**
 * **مسوّدةُ الاستبيان — مصدرٌ واحدٌ لحال المحرّر** (٢٠٢٦-١١-١٢، لقالب «مساحة العمل»): كانت كلُّها داخل `BuilderView`، فاستُخرجت
 * كما هي — الإعداداتُ والرسائلُ والأسئلةُ وخياراتُها، والترتيبُ والتكرارُ والحذف، و«أثمّة ما يُحفظ؟»، والمعاينةُ الحيّة — كي يبني
 * عليها الشكلُ الجديد ولا يُعاد كتابةُ السلوك. وسلوكُها سلوكُ المحرّر القديم حرفًا (الحفظُ نفسُه، والتحقّقُ الحاسمُ في الفعل الخادميّ).
 * وأُضيف `moveTo` للسحب (كان ▲/▼ وحدهما).
 */
import { useMemo, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { SurveyDetail } from "./data";
import { hasChoices, hasScale, type AccessType, type QuestionType } from "./vocab";
import type { QuestionInput, SurveyInput } from "./actions";
import type { PublicSurvey, PublicQuestion } from "@/app/s/[code]/SurveyRespond";

/** سؤال قيد التحرير — مفتاح React ثابت مستقلّ عن id القاعدة (الجديد بلا id بعد). */
export type QuestionDraft = {
  key: string;
  id: number | null;
  text: string;
  description: string;
  type: QuestionType;
  required: boolean;
  choices: { id: string | null; label: string }[];
  scaleMin: number;
  scaleMax: number;
  /** حقلُ بياناتٍ أم سؤالُ رأي — `null` يتبع افتراضَ النوع (`isDataType`) حتى يختار صاحبُ الاستبيان */
  data: boolean | null;
  /** كم إجابة مخزّنة — يمنع تغيير النوع ويجعل الحذف مصادَقًا عليه. */
  answers: number;
};

let draftSeq = 0;
const draftKey = () => `q${Date.now()}_${draftSeq++}`;

/** و`key` الأوّلِ ثابتٌ (`q0`): السؤالُ الذي يولد مع الاستبيان الجديد يُرسَم في الخادم ثم في المتصفّح، والوقتُ بينهما يختلف —
 *  فكان معرّفُ قطعته (`#q-…`) في الصفحة غيرَ الذي يعرفه React، فلا يُنقل إليه ولا يُنزل (خطأُ إماهة، ٢٠٢٦-١١-١٣) */
export const blankQuestion = (key = draftKey()): QuestionDraft => ({
  key, id: null, text: "", description: "", type: "short_text", required: false,
  choices: [{ id: null, label: "" }, { id: null, label: "" }], scaleMin: 1, scaleMax: 5, data: null, answers: 0,
});

const fromDetail = (s: SurveyDetail): QuestionDraft[] =>
  s.questions.map((q) => ({
    key: `db${q.id}`, id: q.id, text: q.text, description: q.description ?? "", type: q.type, required: q.required,
    // المتقاعد لا يُحرَّر هنا — يتولّاه الخادم فيبقيه متقاعدًا في options
    choices: q.choices.filter((c) => !c.retired).map((c) => ({ id: c.id, label: c.label })),
    scaleMin: q.scale?.min ?? 1, scaleMax: q.scale?.max ?? 5, data: q.data, answers: q.answers,
  }));

/** معرّفُ معاينةٍ ثابتٌ لسؤالٍ لم يُحفظ بعد: سالبٌ من مفتاحه فلا يلتقي بمعرّفات القاعدة */
export const previewId = (key: string) => -[...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** ISO من القاعدة → قيمة datetime-local (بتوقيت المتصفّح المحلّيّ). */
const toLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
/** قيمة datetime-local → ISO (أو null للفارغ). */
const toIso = (local: string): string | null => (local ? new Date(local).toISOString() : null);

export function useSurveyDraft(survey: SurveyDetail | null) {
  const [title, setTitle] = useState(survey?.title ?? "");
  const [description, setDescription] = useState(survey?.description ?? "");
  const [access, setAccess] = useState<AccessType>(survey?.access ?? "public");
  const [allowMultiple, setAllowMultiple] = useState(survey?.allowMultiple ?? false);
  const [allowAnonymous, setAllowAnonymous] = useState(survey?.allowAnonymous ?? false);
  const [showProgress, setShowProgress] = useState(survey?.showProgress ?? true);
  const [startDate, setStartDate] = useState(toLocalInput(survey?.startDate ?? null));
  const [endDate, setEndDate] = useState(toLocalInput(survey?.endDate ?? null));
  const [welcome, setWelcome] = useState(survey?.welcome ?? "");
  const [thankYou, setThankYou] = useState(survey?.thankYou ?? "");
  const [closedMessage, setClosedMessage] = useState(survey?.closedMessage ?? "");
  const [questions, setQuestions] = useState<QuestionDraft[]>(survey ? fromDetail(survey) : [blankQuestion("q0")]);
  const [confirmRemove, setConfirmRemove] = useState<QuestionDraft | null>(null);

  const patch = (key: string, p: Partial<QuestionDraft>) => setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...p } : q)));
  const move = (index: number, dir: -1 | 1) =>
    setQuestions((qs) => {
      const to = index + dir;
      if (to < 0 || to >= qs.length) return qs;
      return arrayMove(qs, index, to);
    });
  const moveTo = (fromKey: string, toKey: string) =>
    setQuestions((qs) => {
      const i = qs.findIndex((q) => q.key === fromKey), j = qs.findIndex((q) => q.key === toKey);
      return i < 0 || j < 0 ? qs : arrayMove(qs, i, j);
    });
  const duplicate = (q: QuestionDraft): string => {
    // نسخة جديدة — لا ترث id ولا إجابات
    const copy: QuestionDraft = { ...q, key: draftKey(), id: null, answers: 0, choices: q.choices.map((c) => ({ id: null, label: c.label })) };
    setQuestions((qs) => {
      const i = qs.findIndex((x) => x.key === q.key);
      return [...qs.slice(0, i + 1), copy, ...qs.slice(i + 1)];
    });
    return copy.key;
  };
  const add = (): string => {
    const q = blankQuestion();
    setQuestions((qs) => [...qs, q]);
    return q.key;
  };
  /** سؤال له إجابات مخزّنة: الحذف يُسقطها سلسلةً — يُصادَق عليه صراحةً */
  const remove = (q: QuestionDraft) => {
    if (q.answers > 0) setConfirmRemove(q);
    else setQuestions((qs) => qs.filter((x) => x.key !== q.key));
  };
  const confirmRemoveNow = () => {
    if (confirmRemove) setQuestions((qs) => qs.filter((x) => x.key !== confirmRemove.key));
    setConfirmRemove(null);
  };

  const toInput = (): SurveyInput => ({
    title, description, access, allowMultiple, allowAnonymous, showProgress,
    startDate: toIso(startDate), endDate: toIso(endDate), welcome, thankYou, closedMessage,
    questions: questions.map((q): QuestionInput => ({
      id: q.id, text: q.text, description: q.description, type: q.type, required: q.required,
      choices: hasChoices(q.type) ? q.choices.filter((c) => c.label.trim()) : undefined,
      scale: hasScale(q.type) ? { min: q.scaleMin, max: q.scaleMax } : undefined,
      data: q.data ?? undefined,
    })),
  });

  /** **أثمّة ما يُحفَظ؟** — المقارنةُ بلَقطةِ `toInput()` التي تُرسَل، والأصلُ يُجمَّد مرّةً (الشاشةُ تُغادَر بعد الحفظ). */
  const snapshot = JSON.stringify(toInput());
  const [origin] = useState(snapshot);
  const dirty = snapshot !== origin;
  // النشر يتطلّب سؤالًا واحدًا بنصّ (حارس النشر نفسه)
  const canPublish = questions.some((q) => q.text.trim().length > 0);

  // معاينة حيّة تُعيد استعمال صفحة الاستبيان الحقيقيّة — تُغذّى من الحالة الحاليّة بلا حفظ
  const previewSurvey: PublicSurvey = {
    id: survey?.id ?? 0, code: "",
    title: title.trim() || "استبيان بلا عنوان",
    description: description.trim() || null, welcome: welcome.trim() || null, thankYou: thankYou.trim() || null,
    showProgress, endDate: toIso(endDate), anonymous: allowAnonymous, allowMultiple,
  };
  const previewQuestions: PublicQuestion[] = useMemo(
    () => questions.filter((q) => q.text.trim()).map((q) => ({
      // معرّفٌ ثابتٌ للسؤال لا موضعُه: المعاينةُ الحيّةُ تحفظ ما أُجيب فيها، فإن رُقّمت بالموضع انتقلت الأجوبةُ إلى غير أسئلتها بعد كلّ ترتيب
      id: q.id ?? previewId(q.key), text: q.text.trim(), description: q.description.trim() || null, type: q.type, required: q.required,
      choices: hasChoices(q.type) ? q.choices.filter((c) => c.label.trim()).map((c, ci) => ({ id: c.id ?? `p${ci + 1}`, label: c.label.trim() })) : [],
      scale: hasScale(q.type) ? { min: q.scaleMin, max: q.scaleMax } : null,
    })),
    [questions],
  );

  return {
    title, setTitle, description, setDescription, access, setAccess, allowMultiple, setAllowMultiple,
    allowAnonymous, setAllowAnonymous, showProgress, setShowProgress, startDate, setStartDate, endDate, setEndDate,
    welcome, setWelcome, thankYou, setThankYou, closedMessage, setClosedMessage,
    questions, patch, move, moveTo, duplicate, add, remove, confirmRemove, setConfirmRemove, confirmRemoveNow,
    toInput, dirty, canPublish, previewSurvey, previewQuestions,
  };
}
export type SurveyDraft = ReturnType<typeof useSurveyDraft>;
