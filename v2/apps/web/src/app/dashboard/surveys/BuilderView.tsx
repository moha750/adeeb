"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, ChartPanel, Field, IconButton, Select, Switch, Textarea } from "@adeeb/design-system";
import {
  CalendarBlank, ChatCircleText, ChatText, CheckSquare, ClipboardText, Clock, CopySimple, Gear,
  HandWaving, Hash, LockSimple, Sparkle, TextT,
} from "@phosphor-icons/react";
import { ArrowDown } from "@/app/_components/glyphs";
import { ArrowUp, Eye, PencilSimple, Plus, Question, Trash, X } from "@/app/_components/glyphs";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { useToast } from "../_components/ToastProvider";
import type { SurveyDetail } from "./data";
import {
  ACCESS_TYPES, QUESTION_TYPES, SCALE_MAX, SCALE_MIN,
  hasChoices, hasScale,
  type AccessType, type QuestionType,
} from "./vocab";
import { createSurvey, updateSurvey, type QuestionInput, type SurveyInput } from "./actions";
import { SurveyPreview } from "./SurveyPreview";
import type { PublicSurvey, PublicQuestion } from "@/app/surveys/[id]/SurveyRespond";
import { Breadcrumb } from "../_shell/Breadcrumb";

/** سؤال قيد التحرير — مفتاح React ثابت مستقلّ عن id القاعدة (الجديد بلا id بعد). */
type QuestionDraft = {
  key: string;
  id: number | null;
  text: string;
  description: string;
  type: QuestionType;
  required: boolean;
  choices: { id: string | null; label: string }[];
  scaleMin: number;
  scaleMax: number;
  /** كم إجابة مخزّنة — يمنع تغيير النوع ويجعل الحذف مصادَقًا عليه. */
  answers: number;
};

let draftSeq = 0;
const draftKey = () => `q${Date.now()}_${draftSeq++}`;

const blankQuestion = (): QuestionDraft => ({
  key: draftKey(),
  id: null,
  text: "",
  description: "",
  type: "short_text",
  required: false,
  choices: [{ id: null, label: "" }, { id: null, label: "" }],
  scaleMin: 1,
  scaleMax: 5,
  answers: 0,
});

const fromDetail = (s: SurveyDetail): QuestionDraft[] =>
  s.questions.map((q) => ({
    key: `db${q.id}`,
    id: q.id,
    text: q.text,
    description: q.description ?? "",
    type: q.type,
    required: q.required,
    // المتقاعد لا يُحرَّر هنا — يتولّاه الخادم فيبقيه متقاعدًا في options
    choices: q.choices.filter((c) => !c.retired).map((c) => ({ id: c.id, label: c.label })),
    scaleMin: q.scale?.min ?? 1,
    scaleMax: q.scale?.max ?? 5,
    answers: q.answers,
  }));

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

export function BuilderView({ survey }: { survey: SurveyDetail | null }) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();
  // أيّ زرّ يُنفَّذ الآن — ليدور مؤشّر التحميل على المضغوط وحده (حفظ كمسودّة / نشر)
  const [pendingAction, setPendingAction] = useState<"draft" | "publish" | null>(null);

  // الإعدادات — حالة مسطّحة (نموذج صفحة لا نافذة، والتحقّق الحاسم في الفعل الخادميّ)
  const [title, setTitle] = useState(survey?.title ?? "");
  const [description, setDescription] = useState(survey?.description ?? "");
  const [access, setAccess] = useState<AccessType>(survey?.access ?? "public");
  const [allowMultiple, setAllowMultiple] = useState(survey?.allowMultiple ?? false);
  const [allowAnonymous, setAllowAnonymous] = useState(survey?.allowAnonymous ?? false);
  const [showProgress, setShowProgress] = useState(survey?.showProgress ?? true);
  const [showResults, setShowResults] = useState(survey?.showResults ?? false);
  const [startDate, setStartDate] = useState(toLocalInput(survey?.startDate ?? null));
  const [endDate, setEndDate] = useState(toLocalInput(survey?.endDate ?? null));
  const [welcome, setWelcome] = useState(survey?.welcome ?? "");
  const [thankYou, setThankYou] = useState(survey?.thankYou ?? "");
  const [closedMessage, setClosedMessage] = useState(survey?.closedMessage ?? "");

  const [questions, setQuestions] = useState<QuestionDraft[]>(survey ? fromDetail(survey) : [blankQuestion()]);
  const [confirmRemove, setConfirmRemove] = useState<QuestionDraft | null>(null);

  const editing = survey != null;
  const crumbLeaf = editing ? "تحرير" : "استبيان جديد";
  // النشر المباشر يتطلّب سؤالًا واحدًا بنصّ (حارس النشر نفسه) — وإلّا فزرّ «نشر» معطّل بتلميح، لا يَعِد بما لا يملك
  const canPublish = questions.some((q) => q.text.trim().length > 0);
  const [showPreview, setShowPreview] = useState(false);

  // معاينة حيّة تُعيد استعمال صفحة الاستبيان الحقيقيّة — تُغذّى من الحالة الحاليّة بلا حفظ (ترقيمٌ مؤقّت للأسئلة غير المحفوظة)
  const previewSurvey: PublicSurvey = {
    id: survey?.id ?? 0,
    title: title.trim() || "استبيان بلا عنوان",
    description: description.trim() || null,
    welcome: welcome.trim() || null,
    thankYou: thankYou.trim() || null,
    showProgress,
    showResults,
    endDate: toIso(endDate),
  };
  const previewQuestions: PublicQuestion[] = useMemo(
    () => questions.filter((q) => q.text.trim()).map((q, i) => ({
      id: i + 1,
      text: q.text.trim(),
      description: q.description.trim() || null,
      type: q.type,
      required: q.required,
      choices: hasChoices(q.type) ? q.choices.filter((c) => c.label.trim()).map((c, ci) => ({ id: c.id ?? `p${ci + 1}`, label: c.label.trim() })) : [],
      scale: hasScale(q.type) ? { min: q.scaleMin, max: q.scaleMax } : null,
    })),
    [questions],
  );

  const patch = (key: string, p: Partial<QuestionDraft>) =>
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...p } : q)));

  const move = (index: number, dir: -1 | 1) =>
    setQuestions((qs) => {
      const to = index + dir;
      if (to < 0 || to >= qs.length) return qs;
      const next = [...qs];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });

  const duplicate = (q: QuestionDraft) =>
    setQuestions((qs) => {
      const copy: QuestionDraft = {
        ...q,
        key: draftKey(),
        id: null, // نسخة جديدة — لا ترث id ولا إجابات
        answers: 0,
        choices: q.choices.map((c) => ({ id: null, label: c.label })),
      };
      const i = qs.findIndex((x) => x.key === q.key);
      return [...qs.slice(0, i + 1), copy, ...qs.slice(i + 1)];
    });

  const remove = (q: QuestionDraft) => {
    // سؤال له إجابات مخزّنة: الحذف يُسقطها سلسلةً — يُصادَق عليه صراحةً
    if (q.answers > 0) setConfirmRemove(q);
    else setQuestions((qs) => qs.filter((x) => x.key !== q.key));
  };

  const toInput = (): SurveyInput => ({
    title,
    description,
    access,
    allowMultiple,
    allowAnonymous,
    showProgress,
    showResults,
    startDate: toIso(startDate),
    endDate: toIso(endDate),
    welcome,
    thankYou,
    closedMessage,
    questions: questions.map((q): QuestionInput => ({
      id: q.id,
      text: q.text,
      description: q.description,
      type: q.type,
      required: q.required,
      choices: hasChoices(q.type) ? q.choices.filter((c) => c.label.trim()) : undefined,
      scale: hasScale(q.type) ? { min: q.scaleMin, max: q.scaleMax } : undefined,
    })),
  });

  const save = (publish: boolean) => {
    setPendingAction(publish ? "publish" : "draft");
    startSave(async () => {
      const input = toInput();
      const r = editing ? await updateSurvey(survey.id, input) : await createSurvey(input, publish);
      if (r.ok) {
        toast.success(r.message);
        router.push("/dashboard/surveys");
        router.refresh();
      } else {
        toast.error(r.message);
        setPendingAction(null);
      }
    });
  };

  const typeOptions = useMemo(() => QUESTION_TYPES.map((t) => ({ value: t.value, label: t.label, group: t.group })), []);

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb leaf={crumbLeaf} />
          <h1>{editing ? `تحرير: ${survey.title}` : "استبيان جديد"}</h1>
        </div>
        <div className="form-head-actions">
          <Button variant="ghost" size="md" onClick={() => setShowPreview(true)} disabled={!canPublish} title={canPublish ? undefined : "أضِف سؤالًا لتعاين"}><Eye size={18} /> معاينة</Button>
          <Button variant="ghost" size="md" onClick={() => router.push("/dashboard/surveys")} disabled={saving}>إلغاء</Button>
          {editing ? (
            <Button variant="primary" size="md" loading={saving} onClick={() => save(false)}>حفظ التغييرات</Button>
          ) : (
            <>
              <Button variant="neutral" size="md" loading={saving && pendingAction === "draft"} disabled={saving && pendingAction === "publish"} onClick={() => save(false)}>حفظ كمسودّة</Button>
              <Button variant="primary" size="md" loading={saving && pendingAction === "publish"} disabled={!canPublish || (saving && pendingAction === "draft")} title={canPublish ? undefined : "أضِف سؤالًا واحدًا على الأقلّ لتنشر"} onClick={() => save(true)}>نشر</Button>
            </>
          )}
        </div>
      </div>

      <div className="form-build">
        <ChartPanel headerVariant="chip" icon={<Gear />} title="إعدادات الاستبيان">
          <div className="form-grid">
            <Field className="form-full" label="العنوان" icon={<ClipboardText />} innerIcon={<PencilSimple />} placeholder="مثال: تقييم فعاليّة الأمسية الأدبيّة" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Textarea className="form-full" label="الوصف" icon={<TextT />} innerIcon={<PencilSimple />} placeholder="سطر يظهر تحت العنوان في صفحة الاستبيان" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} optional />
            <Select className="form-full" label="من يستطيع الإجابة؟" icon={<LockSimple />} options={ACCESS_TYPES.map((a) => ({ value: a.value, label: a.label }))} value={access} onValueChange={(v) => setAccess(v as AccessType)} required />
            <Field label="يبدأ في" type="datetime-local" icon={<CalendarBlank />} innerIcon={<Clock />} placeholder="بلا موعد بداية" value={startDate} onChange={(e) => setStartDate(e.target.value)} optional />
            <Field label="ينتهي في" type="datetime-local" icon={<CalendarBlank />} innerIcon={<Clock />} placeholder="بلا موعد نهاية" value={endDate} onChange={(e) => setEndDate(e.target.value)} optional />
          </div>
          <div className="form-switches">
            <Switch row label="السماح بأكثر من مشاركة" description="العضو نفسه يستطيع الإجابة أكثر من مرّة" checked={allowMultiple} onChange={(e) => setAllowMultiple(e.target.checked)} />
            <Switch row label="مشاركات مجهولة الهويّة" description="لا تُسجَّل هويّة المجيب حتى لو كان مسجَّل الدخول" checked={allowAnonymous} onChange={(e) => setAllowAnonymous(e.target.checked)} />
            <Switch row label="شريط التقدّم" description="يظهر للمجيب كم أنجز من الأسئلة" checked={showProgress} onChange={(e) => setShowProgress(e.target.checked)} />
            <Switch row label="إظهار النتائج للمشاركين" description="بعد الإرسال يستطيع المجيب رؤية النتائج الإجماليّة" checked={showResults} onChange={(e) => setShowResults(e.target.checked)} />
          </div>
        </ChartPanel>

        <ChartPanel headerVariant="chip" icon={<ChatCircleText />} title="الرسائل">
          <div className="form-grid">
            <Textarea label="رسالة الترحيب" icon={<HandWaving />} innerIcon={<ChatText />} placeholder="تظهر قبل الأسئلة" rows={2} value={welcome} onChange={(e) => setWelcome(e.target.value)} optional />
            <Textarea label="رسالة الشكر" icon={<Sparkle />} innerIcon={<ChatText />} placeholder="تظهر بعد الإرسال" rows={2} value={thankYou} onChange={(e) => setThankYou(e.target.value)} optional />
            <Textarea className="form-full" label="رسالة الإغلاق" icon={<LockSimple />} innerIcon={<ChatText />} placeholder="تظهر لمن يزور استبيانًا منتهيًا أو متوقّفًا" rows={2} value={closedMessage} onChange={(e) => setClosedMessage(e.target.value)} optional />
          </div>
        </ChartPanel>

        <ChartPanel headerVariant="chip" icon={<Question />} title={`الأسئلة (${questions.length})`}>
          {questions.length === 0 ? (
            <Alert tone="info" title="لا أسئلة بعد">أضِف سؤالًا واحدًا على الأقلّ قبل النشر.</Alert>
          ) : null}

          <div className="svy-qs">
            {questions.map((q, i) => (
              <div key={q.key} className="svy-q">
                <div className="svy-q-head">
                  <span className="svy-q-no num">{i + 1}</span>
                  <div className="svy-q-tools">
                    <IconButton onClick={() => move(i, -1)} disabled={i === 0} aria-label="تحريك لأعلى" title="لأعلى"><ArrowUp /></IconButton>
                    <IconButton onClick={() => move(i, 1)} disabled={i === questions.length - 1} aria-label="تحريك لأسفل" title="لأسفل"><ArrowDown /></IconButton>
                    <IconButton onClick={() => duplicate(q)} aria-label="تكرار السؤال" title="تكرار"><CopySimple /></IconButton>
                    <IconButton tone="danger" onClick={() => remove(q)} aria-label="حذف السؤال" title="حذف"><Trash /></IconButton>
                  </div>
                </div>

                <div className="form-grid">
                  <Field className="form-full" label="نصّ السؤال" icon={<Question />} innerIcon={<PencilSimple />} placeholder="اكتب السؤال" value={q.text} onChange={(e) => patch(q.key, { text: e.target.value })} required />
                  <Select
                    label="نوع السؤال"
                    icon={<CheckSquare />}
                    options={typeOptions}
                    value={q.type}
                    disabled={q.answers > 0}
                    helper={q.answers > 0 ? `له ${q.answers} إجابة مخزّنة — النوع لا يتغيّر` : undefined}
                    onValueChange={(v) => patch(q.key, { type: v as QuestionType })}
                    required
                  />
                  <Field label="توضيح" icon={<TextT />} innerIcon={<ChatText />} placeholder="سطر يظهر تحت السؤال" value={q.description} onChange={(e) => patch(q.key, { description: e.target.value })} optional />
                </div>

                {hasChoices(q.type) ? (
                  <div className="svy-choices">
                    {q.choices.map((c, ci) => (
                      <div key={ci} className="svy-choice">
                        <Field
                          label={`الخيار ${ci + 1}`}
                          icon={<CheckSquare />}
                          innerIcon={<PencilSimple />}
                          placeholder="نصّ الخيار"
                          value={c.label}
                          onChange={(e) => patch(q.key, { choices: q.choices.map((x, xi) => (xi === ci ? { ...x, label: e.target.value } : x)) })}
                          required
                        />
                        <IconButton
                          tone="danger"
                          onClick={() => patch(q.key, { choices: q.choices.filter((_, xi) => xi !== ci) })}
                          disabled={q.choices.length <= 2}
                          aria-label={`حذف الخيار ${ci + 1}`}
                          title={q.choices.length <= 2 ? "خياران على الأقلّ" : "حذف الخيار"}
                        >
                          <X />
                        </IconButton>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => patch(q.key, { choices: [...q.choices, { id: null, label: "" }] })}>
                      <Plus size={16} />إضافة خيار
                    </Button>
                  </div>
                ) : null}

                {hasScale(q.type) ? (
                  <div className="form-grid">
                    <Field label="من" type="number" charset="digits" icon={<Hash />} innerIcon={<ArrowDown />} placeholder={String(SCALE_MIN)} value={String(q.scaleMin)} onChange={(e) => patch(q.key, { scaleMin: Number(e.target.value || 0) })} required />
                    <Field label="إلى" type="number" charset="digits" icon={<Hash />} innerIcon={<ArrowUp />} placeholder={String(SCALE_MAX)} value={String(q.scaleMax)} onChange={(e) => patch(q.key, { scaleMax: Number(e.target.value || 0) })} required />
                  </div>
                ) : null}

                <div className="svy-q-foot">
                  <Switch label="سؤال إلزاميّ" checked={q.required} onChange={(e) => patch(q.key, { required: e.target.checked })} />
                </div>
              </div>
            ))}
          </div>

          <div className="svy-add">
            <Button variant="ghost" size="md" onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}>
              <Plus size={18} />إضافة سؤال
            </Button>
          </div>
        </ChartPanel>
      </div>

      <ConfirmDialog
        open={confirmRemove !== null}
        onClose={() => setConfirmRemove(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف سؤال له إجابات؟"
        text={confirmRemove ? `للسؤال «${confirmRemove.text.slice(0, 60)}» ${confirmRemove.answers} إجابة مخزّنة — ستُحذف كلّها نهائيًّا عند الحفظ.` : undefined}
        confirmLabel="حذف السؤال وإجاباته"
        onConfirm={() => {
          if (confirmRemove) setQuestions((qs) => qs.filter((x) => x.key !== confirmRemove.key));
          setConfirmRemove(null);
        }}
      />

      {showPreview ? (
        <SurveyPreview survey={previewSurvey} questions={previewQuestions} onClose={() => setShowPreview(false)} />
      ) : null}
    </>
  );
}
