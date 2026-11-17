"use client";

/**
 * **منشئُ الاستبيان على قالب مساحة العمل — «المنضدة»** (اعتمدها محمد ٢٠٢٦-١١-١٢؛ صفحتا «استبيان جديد» و«تحرير الاستبيان»). الحالُ والسلوكُ
 * من `useSurveyDraft` (سلوكُ المحرّر القديم `BuilderView` كما هو)، وهذا الملفُّ شكلُه وحده. و`lab`: لا يحفظ ولا ينشر — للمختبر وحده.
 */
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Field, Select, Textarea } from "@adeeb/design-system";
import {
  CalendarBlank, ChatCircleText, ChatText, CheckSquare, ClipboardText, Clock, CopySimple, Detective, FloppyDisk,
  Gear, HandWaving, Hash, ListChecks, ListNumbers, LockSimple, PaperPlaneTilt, Repeat, Sparkle, TextT,
} from "@phosphor-icons/react";
import { ArrowDown, ArrowUp, Eye, PencilSimple, Plus, Question, Star, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { SurveyDetail } from "@/app/dashboard/surveys/data";
import { ACCESS_TYPES, QUESTION_TYPES, QUESTION_TYPE_LABEL, SCALE_MAX, SCALE_MIN, hasChoices, hasScale, type AccessType, type QuestionType } from "@/app/dashboard/surveys/vocab";
import { createSurvey, updateSurvey } from "@/app/dashboard/surveys/actions";
import { previewId, useSurveyDraft, type QuestionDraft } from "@/app/dashboard/surveys/useSurveyDraft";
import { SurveyPreview } from "@/app/dashboard/surveys/SurveyPreview";
import type { PublicQuestion, PublicSurvey } from "@/app/s/[code]/SurveyRespond";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { AdButton, AdConfirm, AdEmpty, AdIconButton } from "../primitives";
import { ABJAD } from "@/app/s/[code]/logic";
import { FormSection, FormToggle } from "../form";
import { SortArea, SortItem } from "../reorder";
import { StageFrame, WorkBlock, WorkIndex, WorkRoom, useLeaveGuard } from "../workspace";

const CHOICES: ArForms = ["خيارٌ واحد", "خياران", "خيارات", "خيارًا"];
const ANSWERS: ArForms = ["إجابةٌ واحدة", "إجابتان", "إجابات", "إجابةً"];
/** رمزُ كلّ مجموعةٍ من أنواع الأسئلة قبل اسمها في القائمة (محمد ٢٠٢٦-١١-١٢: «قبل الفئة أيقونة كي يميّز بصريًّا») */
const GROUP_ICON: Record<string, ReactNode> = { "نصّ": <TextT />, "اختيار": <ListChecks />, "تقييم": <Star />, "قيمة": <Hash /> };
const typeOptions = QUESTION_TYPES.map((t) => ({ value: t.value, label: t.label, group: t.group, groupIcon: GROUP_ICON[t.group] }));

/** سطرُ القطعة مطويّةً: نوعُها، وإلزامُها، وخياراتُها، وإجاباتُها المخزّنة */
function subOf(q: QuestionDraft): string {
  const bits = [QUESTION_TYPE_LABEL[q.type] ?? q.type, q.required ? "إلزاميّ" : "اختياريّ"];
  if (hasChoices(q.type)) bits.push(arCount(q.choices.filter((c) => c.label.trim()).length || 0, CHOICES));
  if (hasScale(q.type)) bits.push(`من ${q.scaleMin} إلى ${q.scaleMax}`);
  if (q.answers) bits.push(`له ${arCount(q.answers, ANSWERS)}`);
  return bits.join("، ");
}
/** ما يمنع الحفظ في القطعة: يُرى في سطرها وفي الفهرس وهي مطويّة */
function warnOf(q: QuestionDraft): string | undefined {
  if (!q.text.trim()) return "لم يُكتب نصُّه";
  if (hasChoices(q.type) && q.choices.filter((c) => c.label.trim()).length < 2) return "ينقصه خياران على الأقلّ";
  return undefined;
}

export function SurveyBuilderRoom({ survey, look, lab }: { survey: SurveyDetail | null; look: "a" | "b"; lab?: boolean }) {
  const d = useSurveyDraft(survey);
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [pending, setPending] = useState<"draft" | "publish" | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const editing = survey != null;
  // `left`: حُفظ فهو مغادر — لا يسأله الحارسُ عن عملٍ حُفظ قبل أن يتمّ الانتقال
  const [left, setLeft] = useState(false);
  const leave = useLeaveGuard(d.dirty && !saving && !left);

  const save = (publish: boolean) => {
    if (lab) { toast.info("مختبر: لا يُحفظ شيءٌ من هنا."); return; }
    setPending(publish ? "publish" : "draft");
    startSave(async () => {
      const input = d.toInput();
      const r = editing ? await updateSurvey(survey.id, input) : await createSurvey(input, publish);
      if (r.ok) { setLeft(true); toast.success(r.message); router.push("/dashboard/surveys"); router.refresh(); }
      else { toast.error(r.message); setPending(null); }
    });
  };

  const go = (key: string) => {
    setOpen(key);
    // ينزل إليها ويضع التركيزَ على رأسها: من اختارها من الفهرس بلوحة المفاتيح يكمل منها لا من الفهرس
    requestAnimationFrame(() => {
      const el = document.getElementById(`q-${key}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      // بلا حلقة التركيز بعد نقرة الفأرة (تظهر للوحة المفاتيح وحدها)
      el?.querySelector<HTMLElement>(".ad-wblk-hit")?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    });
  };
  const addOne = () => go(d.add());

  const commit = editing
    ? { primary: { label: "حفظ التغييرات", icon: <FloppyDisk />, onClick: () => save(false), busy: saving, held: !d.dirty }, cancelHref: "/dashboard/surveys", dirty: d.dirty }
    : {
        primary: { label: "نشر", icon: <PaperPlaneTilt />, onClick: () => save(true), busy: saving && pending === "publish", held: !d.canPublish },
        secondary: { label: "حفظ كمسوّدة", onClick: () => save(false), busy: saving && pending === "draft", held: !d.dirty },
        cancelHref: "/dashboard/surveys", dirty: d.dirty,
      };

  const qs = d.questions;
  const keys = qs.map((q) => q.key);
  const title = editing ? `تحرير: ${survey.title}` : "استبيان جديد";

  const index = (
    <>
      {d.canPublish ? <AdButton variant="line" icon={<Eye />} onClick={() => setPreview(true)}>جرّب الاستبيان</AdButton> : null}
      <WorkIndex label={`الأسئلة (${qs.length})`} at={open} onPick={go}
        items={qs.map((q, i) => ({ key: q.key, n: i + 1, text: q.text.trim() || "سؤالٌ جديد", untitled: !q.text.trim(), warn: !!warnOf(q) }))} />
    </>
  );
  const stage = d.canPublish
    ? <PhoneFrame survey={d.previewSurvey} questions={d.previewQuestions} focus={focusOf(qs.find((q) => q.key === open))} />
    // المعاينةُ قبل أوّل سؤال: حالُ الفراغ المعتمدة (`AdEmpty`) تقول ما المكانُ وما يملؤه — كانت سطرًا صغيرًا في فراغٍ لا يُعرف أنّه معاينة (محمد ٢٠٢٦-١١-١٢)
    : <AdEmpty icon={<Eye />} title="هنا ترى الاستبيان كما يراه المشارك" desc="اكتب نصَّ سؤالٍ واحد، فيظهر هنا ويتبدّل مع كلّ حرف." />;

  return (
    <>
      <WorkRoom look={look} path={editing ? `/dashboard/surveys/${survey.id}/edit` : "/dashboard/surveys/new"} title={title} commit={commit} side={index} stage={stage} stageTitle="كما يراه المشارك، ولا تُرسَل الإجابات">
        <FormSection id="settings" icon={<Gear />} title="الإعدادات" sub="العنوانُ ومن يجيب، والموعد">
          <div className="form-grid">
            <Field className="form-full" label="العنوان" icon={<ClipboardText />} innerIcon={<PencilSimple />} placeholder="مثال: تقييم فعاليّة الأمسية الأدبيّة" value={d.title} onChange={(e) => d.setTitle(e.target.value)} required />
            <Textarea className="form-full" label="الوصف" icon={<TextT />} innerIcon={<PencilSimple />} placeholder="سطر يظهر تحت العنوان في صفحة الاستبيان" rows={2} value={d.description} onChange={(e) => d.setDescription(e.target.value)} optional />
            <Select className="form-full" label="من يستطيع المشاركة؟" icon={<LockSimple />} options={ACCESS_TYPES.map((a) => ({ value: a.value, label: a.label }))} value={d.access} onValueChange={(v) => d.setAccess(v as AccessType)} required />
            <Field label="يبدأ في" type="datetime-local" icon={<CalendarBlank />} innerIcon={<Clock />} placeholder="بلا موعد بداية" value={d.startDate} onChange={(e) => d.setStartDate(e.target.value)} optional />
            <Field label="ينتهي في" type="datetime-local" icon={<CalendarBlank />} innerIcon={<Clock />} placeholder="بلا موعد نهاية" value={d.endDate} onChange={(e) => d.setEndDate(e.target.value)} optional />
            <FormToggle className="form-full" icon={<Repeat />} label="أكثر من مشاركة" description="المشارك نفسه يستطيع المشاركة أكثر من مرّة" checked={d.allowMultiple} onChange={d.setAllowMultiple} />
            <FormToggle className="form-full" icon={<Detective />} label="مشاركات مجهولة الهويّة" description="لا تُسجَّل هويّة المشارك حتى لو دخل بحسابه" checked={d.allowAnonymous} onChange={d.setAllowAnonymous} />
            <FormToggle className="form-full" icon={<ListNumbers />} label="شريط التقدّم" description="يرى المشارك كم أنجز من الأسئلة" checked={d.showProgress} onChange={d.setShowProgress} />
          </div>
        </FormSection>

        <FormSection id="messages" icon={<ChatCircleText />} title="الرسائل" sub="قبل الأسئلة، وبعد الإرسال، وحين يُغلق">
          <div className="form-grid">
            <Textarea label="رسالة الترحيب" icon={<HandWaving />} innerIcon={<ChatText />} placeholder="تظهر قبل الأسئلة" rows={2} value={d.welcome} onChange={(e) => d.setWelcome(e.target.value)} optional />
            <Textarea label="رسالة الشكر" icon={<Sparkle />} innerIcon={<ChatText />} placeholder="تظهر بعد الإرسال" rows={2} value={d.thankYou} onChange={(e) => d.setThankYou(e.target.value)} optional />
            <Textarea className="form-full" label="رسالة الإغلاق" icon={<LockSimple />} innerIcon={<ChatText />} placeholder="تظهر لمن يزور استبيانًا منتهيًا أو متوقّفًا" rows={2} value={d.closedMessage} onChange={(e) => d.setClosedMessage(e.target.value)} optional />
          </div>
        </FormSection>

        <FormSection id="questions" icon={<Question />} title={`الأسئلة (${qs.length})`}>
          <div className="ad-wblks">
            <SortArea list ids={keys} total={qs.length} nameOf={(k) => qs.find((q) => q.key === k)?.text.trim() || "سؤالٌ جديد"} placeOf={(k) => keys.indexOf(k) + 1} onMove={d.moveTo}>
              {qs.map((q, i) => (
                <div key={q.key} id={`q-${q.key}`} className="ad-wblk-slot">
                  <SortItem id={q.key} label={q.text.trim() || "سؤالٌ جديد"} n={i + 1} on prev={i > 0} next={i < qs.length - 1} onStep={(dir) => d.move(i, dir)}>
                    <WorkBlock n={i + 1} title={q.text.trim() || "سؤالٌ جديد"} untitled={!q.text.trim()} sub={subOf(q)} warn={open === q.key ? undefined : warnOf(q)}
                      open={open === q.key} onToggle={() => setOpen(open === q.key ? null : q.key)}
                      acts={<>
                        <AdButton variant="line" size="sm" icon={<CopySimple />} onClick={() => go(d.duplicate(q))}>تكرار</AdButton>
                        <AdButton variant="danger" size="sm" icon={<Trash />} onClick={() => d.remove(q)}>حذف</AdButton>
                      </>}>
                      <QuestionFields q={q} patch={(p) => d.patch(q.key, p)} />
                    </WorkBlock>
                  </SortItem>
                </div>
              ))}
            </SortArea>
          </div>
          {/* «إضافة سؤال» مصمتٌ ممتدٌّ بعرض القسم (محمد ٢٠٢٦-١١-١٢: «أحسّ لو يكون مصمتًا وممتدًّا أفضل»): هو فعلُ القسم كلِّه، والمصمتُ رمزُه
              فيه بلا مربّع فيصحّ ممتدًّا. (كان صندوقًا في أوّل السطر كـ«إضافة فترة»، ومعه «+ سؤال» في رأس القسم: فعلٌ واحدٌ في مكانين) */}
          <span className="ad-wblks-add"><AdButton variant="fill" icon={<Plus />} onClick={addOne}>إضافة سؤال</AdButton></span>
        </FormSection>
      </WorkRoom>

      <AdConfirm
        open={d.confirmRemove !== null}
        onClose={() => d.setConfirmRemove(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف سؤال له إجابات؟"
        text={d.confirmRemove ? `للسؤال «${d.confirmRemove.text.slice(0, 60)}» ${arCount(d.confirmRemove.answers, ANSWERS)} مخزّنة، ستُحذف كلّها نهائيًّا عند الحفظ.` : undefined}
        confirmLabel="حذف السؤال وإجاباته"
        onConfirm={d.confirmRemoveNow}
      />
      {leave}
      {preview ? <SurveyPreview survey={d.previewSurvey} questions={d.previewQuestions} onClose={() => setPreview(false)} /> : null}
    </>
  );
}

/** حقولُ السؤال مفتوحًا: نصُّه، ونوعُه، وتوضيحُه، ثمّ خياراتُه أو سلّمُه، ثمّ مفتاحاه */
function QuestionFields({ q, patch }: { q: QuestionDraft; patch: (p: Partial<QuestionDraft>) => void }) {
  return (
    <>
      <div className="form-grid">
        <Field className="form-full" label="نصّ السؤال" icon={<Question />} innerIcon={<PencilSimple />} placeholder="اكتب السؤال" value={q.text} onChange={(e) => patch({ text: e.target.value })} required />
        <Select label="نوع السؤال" icon={<CheckSquare />} options={typeOptions} value={q.type} disabled={q.answers > 0}
          helper={q.answers > 0 ? `له ${arCount(q.answers, ANSWERS)} مخزّنة، فلا يتغيّر نوعُه` : undefined}
          onValueChange={(v) => patch({ type: v as QuestionType, data: null })} required />
        {/* التوضيحُ نصٌّ يمتدّ كـ«الوصف» في سطره (كان سطرًا واحدًا يختفي أوّلُه إذا طال، وبجانب «نوع السؤال» يطول وحده فيختلّ صفّهما) */}
        <Textarea className="form-full" label="توضيح" icon={<TextT />} innerIcon={<ChatText />} placeholder="سطر يظهر تحت السؤال" rows={1} value={q.description} onChange={(e) => patch({ description: e.target.value })} optional />
      </div>
      {hasChoices(q.type) ? (
        <div className="ad-wopts" role="group" aria-label="الخيارات">
          {/* **الخيارُ سطرٌ لا حقلٌ كامل** (محمد ٢٠٢٦-١١-١٢: «حقولُ الخيارات سميكةٌ مقارنةً بزرّ الحذف»): كان كلُّ خيارٍ بئرًا من 64 بتسميته
              ومربّعَيه («الخيار 1»…) وبجانبه زرٌّ من 32. فصار بئرًا بارتفاع الزرّ الكبير، أوّلُه حرفُه كما يراه المشارك (أ، ب، ج)، وحذفُه
              زرُّ الأيقونة الخطِر (القطعُ الأربع اعتمدها محمد ٢٠٢٦-١١-١٢: القطعة، والمنضدة، وسطرُ الخيار، وزرُّ الحذف بالأيقونة) */}
          {q.choices.map((c, ci) => (
            <div key={ci} className="ad-wopt">
              <label className="ad-wopt-f">
                <span className="ad-wopt-n" aria-hidden>{ABJAD[ci] ?? ci + 1}</span>
                <input className="ad-wopt-in" placeholder="نصّ الخيار" value={c.label} aria-label={`الخيار ${ci + 1}`} required
                  onChange={(e) => patch({ choices: q.choices.map((x, xi) => (xi === ci ? { ...x, label: e.target.value } : x)) })} />
              </label>
              {q.choices.length > 2 ? (
                <AdIconButton label={`حذف الخيار ${ci + 1}`} icon={<Trash />} danger onClick={() => patch({ choices: q.choices.filter((_, xi) => xi !== ci) })} />
              ) : null}
            </div>
          ))}
          <AdButton variant="line" size="sm" icon={<Plus />} onClick={() => patch({ choices: [...q.choices, { id: null, label: "" }] })}>إضافة خيار</AdButton>
        </div>
      ) : null}
      {hasScale(q.type) ? (
        <div className="form-grid">
          <Field label="من" type="number" charset="digits" icon={<Hash />} innerIcon={<ArrowDown />} placeholder={String(SCALE_MIN)} value={String(q.scaleMin)} onChange={(e) => patch({ scaleMin: Number(e.target.value || 0) })} required />
          <Field label="إلى" type="number" charset="digits" icon={<Hash />} innerIcon={<ArrowUp />} placeholder={String(SCALE_MAX)} value={String(q.scaleMax)} onChange={(e) => patch({ scaleMax: Number(e.target.value || 0) })} required />
        </div>
      ) : null}
      <div className="form-grid">
        <FormToggle icon={<Question />} label="سؤالٌ إلزاميّ" description="لا يُرسَل الاستبيان بدون جوابه" checked={q.required} onChange={(v) => patch({ required: v })} />
        {/* (مفتاحُ «يظهر في الخلاصة» — «حقلُ بيانات» قبله — أُزيل بقرار محمد ٢٠٢٦-١١-١٢: «من يستعمل الاستبيانات أوّلَ مرّةٍ لن يفهم المقصود».
            فالخلاصةُ تقرّرها أنواعُ الأسئلة وحدها (`isDataType`)، وما خزّنه المحرّرُ القديمُ لسؤالٍ يبقى كما هو) */}
      </div>
    </>
  );
}

/**
 * **الاستبيانُ في إطارٍ يملأ المنضدة** (ب): صفحتُه الحقيقيّةُ تتبدّل مع كلّ حرف. وهي إطارٌ لا رسمٌ في الصفحة لأنّ صفحةَ الاستبيان تقيس
 * خطوطَها بعرض الشاشة، فرسمُها في عمودٍ من شاشة حاسوبٍ يكبّر عنوانَها حتى لا يُقرأ؛ والإطارُ شاشةٌ بعرضه هو. (كانت بعرض جوّالٍ في
 * وسط الإطار، فقال محمد: «كأنّه معاينةٌ داخل مربّع».)
 */
/** معرّفُ السؤال المفتوح في المعاينة — كما يعطيه `useSurveyDraft` */
const focusOf = (q?: QuestionDraft) => (q ? q.id ?? previewId(q.key) : null);

function PhoneFrame({ survey, questions, focus }: { survey: PublicSurvey; questions: PublicQuestion[]; focus: number | null }) {
  return <StageFrame src="/frame/survey" kind="survey" payload={{ survey, questions, focus }} title="الاستبيان كما يراه المشارك" />;
}
