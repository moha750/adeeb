"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Alert, Button, Card, CardBody, Checkbox, Field, FieldMark, Radio, Select, Textarea } from "@adeeb/design-system";
import {
  At, CalendarBlank, ChatText, CheckSquare, Clock, Envelope, Globe, Hash, LinkSimple, ListBullets, NumberCircleOne, Phone, TextT } from "@phosphor-icons/react";
import { PencilSimple, Question, Star } from "@/app/_components/glyphs";
import type { QuestionType } from "@/app/dashboard/surveys/vocab";
import { submitSurveyResponse } from "./actions";
import { TurnstileWidget } from "@/app/_components/Turnstile";

// مفتاح Turnstile العامّ — يُدمَج وقت البناء (NEXT_PUBLIC). غيابه (تجربةٌ محليّة بلا إعداد) يُسقط الدرع بلا كسر.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export type PublicSurvey = {
  id: number;
  title: string;
  description: string | null;
  welcome: string | null;
  thankYou: string | null;
  showProgress: boolean;
  showResults: boolean;
  endDate: string | null;
};

export type PublicQuestion = {
  id: number;
  text: string;
  description: string | null;
  type: QuestionType;
  required: boolean;
  choices: { id: string; label: string }[];
  scale: { min: number; max: number } | null;
};

type AnswerValue = string | number | boolean | string[];

/** أيقونتا كلّ نوع (تسمية + داخليّة) — نظام الحقل المقدّس يلزم كليهما. */
const TYPE_ICONS: Record<string, { icon: React.ReactNode; inner: React.ReactNode; placeholder: string }> = {
  short_text: { icon: <TextT />, inner: <PencilSimple />, placeholder: "اكتب إجابتك" },
  long_text: { icon: <ChatText />, inner: <PencilSimple />, placeholder: "اكتب إجابتك…" },
  number: { icon: <NumberCircleOne />, inner: <Hash />, placeholder: "أدخل رقمًا" },
  email: { icon: <Envelope />, inner: <At />, placeholder: "you@example.com" },
  phone: { icon: <Phone />, inner: <Hash />, placeholder: "05xxxxxxxx" },
  url: { icon: <Globe />, inner: <LinkSimple />, placeholder: "https://…" },
  date: { icon: <CalendarBlank />, inner: <Clock />, placeholder: "اختر التاريخ" },
  time: { icon: <Clock />, inner: <Clock />, placeholder: "اختر الوقت" },
  datetime: { icon: <CalendarBlank />, inner: <Clock />, placeholder: "اختر التاريخ والوقت" },
};

const DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;
const draftKey = (id: number) => `svy-draft-${id}`;

const deviceType = (): string => {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
};

export function SurveyRespond({ survey, questions, preview = false }: { survey: PublicSurvey; questions: PublicQuestion[]; preview?: boolean }) {
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const startedAt = useRef(Date.now());
  // درع Turnstile — الرمز الحيّ وإشارة إعادة الضبط (الرمز يُستهلك مرّة، فيُجدَّد بعد فشل)
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [tsReset, setTsReset] = useState(0);
  const shieldOn = !preview && !!TURNSTILE_SITE_KEY;

  // مسوّدة المتصفّح — تعود لصاحبها إن غادر وعاد خلال أسبوع، وتُمحى عند الإرسال
  useEffect(() => {
    if (preview) return; // المعاينة لا تقرأ مسوّدةً ولا تكتبها — لا id حقيقيّ لها
    try {
      const raw = localStorage.getItem(draftKey(survey.id));
      if (!raw) return;
      const draft = JSON.parse(raw) as { answers?: Record<number, AnswerValue>; savedAt?: number };
      if (draft.savedAt && Date.now() - draft.savedAt < DRAFT_TTL && draft.answers) setAnswers(draft.answers);
      else localStorage.removeItem(draftKey(survey.id));
    } catch { /* مسوّدة معطوبة — تُتجاهل */ }
  }, [survey.id, preview]);
  useEffect(() => {
    if (preview || done || !Object.keys(answers).length) return;
    const t = window.setTimeout(() => {
      try { localStorage.setItem(draftKey(survey.id), JSON.stringify({ answers, savedAt: Date.now() })); } catch { /* تخزين ممتلئ */ }
    }, 800);
    return () => window.clearTimeout(t);
  }, [answers, done, survey.id, preview]);

  const set = (qid: number, value: AnswerValue | undefined) => {
    setAnswers((a) => {
      const next = { ...a };
      if (value === undefined || value === "" || (Array.isArray(value) && !value.length)) delete next[qid];
      else next[qid] = value;
      return next;
    });
    setErrors((e) => {
      if (!e[qid]) return e;
      const next = { ...e };
      delete next[qid];
      return next;
    });
  };

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id] !== undefined).length,
    [questions, answers],
  );

  const submit = () => {
    const missing: Record<number, string> = {};
    for (const q of questions) {
      if (q.required && answers[q.id] === undefined) missing[q.id] = "هذا السؤال إلزاميّ.";
    }
    setErrors(missing);
    if (Object.keys(missing).length) {
      setFormError(`بقي ${Object.keys(missing).length} سؤال إلزاميّ بلا إجابة.`);
      return;
    }
    setFormError(null);
    // المعاينة أمينة: تفرض التحقّق (الإلزاميّ وأخطاءه) كالحقيقيّة تمامًا، لكن عند النجاح تُظهر الشكر بلا إرسالٍ فعليّ — لا حفظ في القاعدة
    if (preview) { setDone(true); return; }
    // درع Turnstile: لا نُرسل بلا رمزٍ صالح (غالبًا يجهز خفيةً في ثوانٍ)
    if (shieldOn && !tsToken) {
      setFormError("جارٍ التأكّد أنّك لست روبوتًا، انتظر لحظةً ثمّ أعد الإرسال.");
      return;
    }
    startSubmit(async () => {
      const payload: Record<string, unknown> = {};
      for (const [qid, v] of Object.entries(answers)) payload[qid] = v;
      const r = await submitSurveyResponse({
        surveyId: survey.id,
        answers: payload,
        seconds: Math.round((Date.now() - startedAt.current) / 1000),
        device: deviceType(),
        turnstileToken: tsToken ?? undefined,
      });
      if (r.ok) {
        try { localStorage.removeItem(draftKey(survey.id)); } catch { /* لا شيء */ }
        setDone(true);
      } else {
        setFormError(r.message);
        // الرمز يُستهلك بالمحاولة — جدّده للمحاولة التالية
        setTsToken(null);
        setTsReset((n) => n + 1);
      }
    });
  };

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-4 px-4 py-10">
        <Card>
          <CardBody className="p-8 text-center">
            <p className="font-display text-2xl font-bold text-content">شكرًا لمشاركتك</p>
            <p className="mt-2 text-content-muted">{survey.thankYou ?? "وصلتنا إجابتك."}</p>
            {survey.showResults && !preview ? (
              <div className="mt-5 flex justify-center">
                <Link href={`/surveys/${survey.id}/results`} className="abtn abtn-primary abtn-md">عرض النتائج</Link>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-6 text-center">
        <p className="font-display text-sm font-bold text-steel-600">نادي أديب</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-content">{survey.title}</h1>
        {survey.description ? <p className="mt-2 text-content-muted">{survey.description}</p> : null}
      </header>

      {survey.welcome ? (
        <div className="mb-6">
          <Alert tone="info" title="أهلًا بك">{survey.welcome}</Alert>
        </div>
      ) : null}

      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        noValidate
      >
        {questions.map((q, i) => (
          <Card key={q.id}>
            <CardBody className="flex flex-col gap-3 p-5">
              <QuestionField q={q} index={i} value={answers[q.id]} error={errors[q.id]} onChange={(v) => set(q.id, v)} />
            </CardBody>
          </Card>
        ))}

        {shieldOn ? (
          <TurnstileWidget siteKey={TURNSTILE_SITE_KEY!} onToken={setTsToken} resetSignal={tsReset} />
        ) : null}

        {formError ? <Alert tone="danger" title="لم تُرسل الإجابات">{formError}</Alert> : null}

        <div className="flex items-center justify-between gap-4">
          {survey.showProgress ? (
            <span className="text-sm text-content-muted">
              أجبت <b className="num">{answeredCount}</b> من <b className="num">{questions.length}</b>
            </span>
          ) : <span />}
          <Button type="submit" size="lg" loading={submitting}>إرسال الإجابات</Button>
        </div>
      </form>
    </main>
  );
}

function QuestionField({
  q, index, value, error, onChange,
}: {
  q: PublicQuestion;
  index: number;
  value: AnswerValue | undefined;
  error?: string;
  onChange: (v: AnswerValue | undefined) => void;
}) {
  const label = `${index + 1}. ${q.text}`;
  const mark = <FieldMark required={q.required} optional={!q.required} />;

  // الاختيارات والتقييم: عنوان + مجموعة بطاقات اختيار من المكتبة كما هي
  if (q.type === "single_choice" || q.type === "yes_no" || q.type === "rating_stars" || q.type === "linear_scale") {
    const opts =
      q.type === "single_choice"
        ? q.choices.map((c) => ({ key: c.id, label: c.label, value: c.id as AnswerValue }))
        : q.type === "yes_no"
          ? [{ key: "yes", label: "نعم", value: true as AnswerValue }, { key: "no", label: "لا", value: false as AnswerValue }]
          : Array.from(
              { length: (q.scale?.max ?? 5) - (q.scale?.min ?? 1) + 1 },
              (_, i) => {
                const n = (q.scale?.min ?? 1) + i;
                return { key: String(n), label: q.type === "rating_stars" ? `${n} ★` : String(n), value: n as AnswerValue };
              },
            );
    const horizontal = q.type !== "single_choice";
    return (
      <fieldset className="flex flex-col gap-3">
        <legend className="flex items-center gap-2 font-bold text-content">
          <span className="inline-flex text-steel-600" aria-hidden>{q.type === "rating_stars" ? <Star /> : q.type === "yes_no" ? <CheckSquare /> : <ListBullets />}</span>
          {label}
          {mark}
        </legend>
        {q.description ? <p className="text-sm text-content-muted">{q.description}</p> : null}
        <div className={horizontal ? "flex flex-wrap gap-2" : "flex flex-col gap-2"}>
          {opts.map((o) => (
            <Radio
              key={o.key}
              card
              name={`q${q.id}`}
              label={o.label}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
          ))}
        </div>
        {error ? <p className="text-sm font-bold text-danger">{error}</p> : null}
      </fieldset>
    );
  }

  if (q.type === "multiple_choice") {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (id: string) =>
      onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
    return (
      <fieldset className="flex flex-col gap-3">
        <legend className="flex items-center gap-2 font-bold text-content">
          <span className="inline-flex text-steel-600" aria-hidden><ListBullets /></span>
          {label}
          {mark}
        </legend>
        {q.description ? <p className="text-sm text-content-muted">{q.description}</p> : null}
        <div className="flex flex-col gap-2">
          {q.choices.map((c) => (
            <Checkbox key={c.id} card label={c.label} checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
          ))}
        </div>
        {error ? <p className="text-sm font-bold text-danger">{error}</p> : null}
      </fieldset>
    );
  }

  if (q.type === "dropdown") {
    return (
      <Select
        label={label}
        icon={<ListBullets />}
        options={q.choices.map((c) => ({ value: c.id, label: c.label }))}
        value={typeof value === "string" ? value : ""}
        onValueChange={(v) => onChange(v)}
        error={error}
        helper={q.description ?? undefined}
        {...(q.required ? { required: true } : { optional: true })}
      />
    );
  }

  if (q.type === "long_text") {
    const t = TYPE_ICONS.long_text;
    return (
      <Textarea
        label={label}
        icon={t.icon}
        innerIcon={t.inner}
        placeholder={t.placeholder}
        rows={4}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        helper={q.description ?? undefined}
        {...(q.required ? { required: true } : { optional: true })}
      />
    );
  }

  // بقيّة الأنواع حقول مفردة — النوع والطقم بحسب المحتوى
  const t = TYPE_ICONS[q.type] ?? TYPE_ICONS.short_text;
  const inputType =
    q.type === "number" ? "number"
      : q.type === "email" ? "email"
        : q.type === "phone" ? "tel"
          : q.type === "url" ? "url"
            : q.type === "date" ? "date"
              : q.type === "time" ? "time"
                : q.type === "datetime" ? "datetime-local"
                  : "text";
  const charset = q.type === "email" || q.type === "url" ? ("latin" as const) : q.type === "phone" ? ("digits" as const) : undefined;

  return (
    <Field
      label={label}
      icon={t.icon ?? <Question />}
      innerIcon={t.inner}
      placeholder={t.placeholder}
      type={inputType}
      charset={charset}
      value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
      onChange={(e) => {
        const raw = e.target.value;
        if (q.type === "number") onChange(raw === "" ? undefined : Number(raw));
        else onChange(raw);
      }}
      error={error}
      helper={q.description ?? undefined}
      {...(q.required ? { required: true } : { optional: true })}
    />
  );
}
