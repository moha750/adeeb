"use client";

/**
 * **صفحةُ الاستبيان: «مسار»** — صفحةٌ واحدةٌ تبدأ بغلافٍ كحليٍّ يحدّه نقشُ أدِيب، وتخرج منه ورقةٌ بيضاء
 * تحمل الأسئلة على **خطّ طريقٍ** عموديّ: لكلّ سؤالٍ عقدةٌ برقمه تصير علامةً حين يُجاب، ويمتلئ الخطُّ
 * تحتها. فالتقدّمُ ليس شريطًا فوق الصفحة، بل الطريقُ نفسُه. وفي آخر الطريق لوحةُ الإرسال بما بقي،
 * والإرسالُ الناقصُ يعيدك إلى أوّل سؤالٍ بقي، والسؤالُ الناقصُ كلُّه بنغمة الخطأ وتحته تنبيهُ الهويّة.
 *
 * **اعتُمد سلوكًا** (المالك ٢٠٢٦-١٠-١٩) بعد مراجعة الدراسات: الصفحةُ الواحدة تساوي سؤالًا في كلّ صفحةٍ
 * في نسبة الإكمال، وتفوقه على الجوّال وقتًا ورضًا (Mavletova & Couper 2014). وأُخذ من الآخر أنفعُ ما
 * فيه: ما يُجاب بلمسةٍ يُنزل الصفحةَ وحده إلى السؤال التالي إن كان فارغًا. **واعتُمد تصميمًا** ٢٠٢٦-١٠-٢٠.
 *
 * وتبقى من الصفحة السابقة أمانتُها: مسوّدةُ المتصفّح أسبوعًا، ودرعُ Turnstile، والمعاينةُ التي تفرض
 * التحقّقَ كالحقيقيّة ولا تُرسل.
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Alert, FieldMark } from "@adeeb/design-system";
import { CalendarBlank, Detective, Lightbulb, ListNumbers, PaperPlaneTilt, Timer } from "@phosphor-icons/react";
import { ArrowLeft, Check } from "@/app/_components/glyphs";
import type { QuestionType } from "@/app/dashboard/surveys/vocab";
import { TurnstileWidget } from "@/app/_components/Turnstile";
import { fmtStamp } from "@/lib/dates";
import { submitSurveyResponse } from "./actions";
import { Answer } from "./Answer";
import { Done } from "./Done";
import { ONE_TAP, isAnswered, leftWord, minutesFor, minutesWord, questionError, questionsWord, setAnswer, type AnswerValue, type Answers } from "./logic";

// مفتاح Turnstile العامّ — يُدمَج وقت البناء (NEXT_PUBLIC). غيابه (تجربةٌ محليّة بلا إعداد) يُسقط الدرع بلا كسر.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export type PublicSurvey = {
  id: number;
  /** رمزُ الرابط القصير (`lib/surveys/code`) — للروابط وحدها؛ والرقمُ للإرسال والمسودّة. */
  code: string;
  title: string;
  description: string | null;
  welcome: string | null;
  thankYou: string | null;
  showProgress: boolean;
  endDate: string | null;
  /** لا تُسجَّل هويّةُ المجيب (`allow_anonymous`) — يقولها الغلاف. */
  anonymous: boolean;
  /** يقبل أكثرَ من إجابة (`allow_multiple_responses`) — فيظهر «إجابةٌ أخرى» في الإيصال. */
  allowMultiple: boolean;
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

const DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;
const draftKey = (id: number) => `svy-draft-${id}`;

/** خامُ المسوّدة كما هو في المخزن — نصٌّ ثابتٌ يصلح لقطةً لـ`useSyncExternalStore`. */
const readRawDraft = (id: number): string | null => {
  try { return localStorage.getItem(draftKey(id)); } catch { return null; }
};

/** إجاباتُها إن كانت حيّةً، و`null` إن غابت أو شاخت (أسبوع) أو عطبت. */
function draftAnswers(raw: string | null): Answers | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as { answers?: Record<number, AnswerValue>; savedAt?: number };
    if (d.savedAt && Date.now() - d.savedAt < DRAFT_TTL && d.answers) return d.answers;
  } catch { /* مسوّدة معطوبة — تُتجاهل */ }
  return null;
}

const deviceType = (): string => {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
};

export function SurveyRespond({ survey, questions, preview = false }: { survey: PublicSurvey; questions: PublicQuestion[]; preview?: boolean }) {
  // زرُّ الإرسال **الحلّ الوسط** (المالك ٢٠٢٦-١٠-٢٠): زرُّ الهويّة المعكوس على لوحة الإرسال الداكنة، بارتفاعٍ وسهمٍ متقدّم
  const primary = "abtn abtn-inverse abtn-lg spt-btn";
  const [answers, setAnswers] = useState<Answers>({});
  const [tried, setTried] = useState(false);
  // لحظةُ الإرسال تُحفظ معه: الإيصالُ يقولها
  const [done, setDone] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [pastHero, setPastHero] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  // ساعةُ البدء تُضبَط بعد التركيب لا في الرسم: قراءةُ الساعة أثناء الرسم غيرُ نقيّة
  const startedAt = useRef(0);
  useEffect(() => { startedAt.current = Date.now(); }, []);
  // درع Turnstile — الرمز الحيّ وإشارة إعادة الضبط (الرمز يُستهلك مرّة، فيُجدَّد بعد فشل)
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [tsReset, setTsReset] = useState(0);
  const shieldOn = !preview && !!TURNSTILE_SITE_KEY;

  // مسوّدة المتصفّح — تعود لصاحبها إن غادر وعاد خلال أسبوع، وتُمحى عند الإرسال.
  // **المخزنُ يُقرأ بـ`useSyncExternalStore` لا يُنسَخ في أثر** (سابقةُ `lib/useDraft`): الخادمُ لا مخزنَ
  // له فلقطتُه `null`، ثمّ تُبذَر إجاباتُها في الحالة **مرّةً واحدةً** بعد الترطيب، في الرسم لا في أثر
  // (الأثرُ كان يرسم النموذجَ فارغًا ثمّ يملؤه). والمعاينة لا تقرأ مسوّدةً ولا تكتبها.
  const rawDraft = useSyncExternalStore(
    () => () => {},
    () => (preview ? null : readRawDraft(survey.id)),
    () => null,
  );
  const [seeded, setSeeded] = useState(false);
  if (!seeded && rawDraft) {
    setSeeded(true);
    const restored = draftAnswers(rawDraft);
    if (restored) setAnswers(restored);
  }
  // كنسُ الشائخة والمعطوبة — **كتابةٌ** في مخزنٍ خارجيّ، فمكانُها أثرٌ لا رسم
  useEffect(() => {
    if (preview || !rawDraft || draftAnswers(rawDraft)) return;
    try { localStorage.removeItem(draftKey(survey.id)); } catch { /* لا شيء */ }
  }, [rawDraft, preview, survey.id]);
  useEffect(() => {
    if (preview || done || !Object.keys(answers).length) return;
    const t = window.setTimeout(() => {
      try { localStorage.setItem(draftKey(survey.id), JSON.stringify({ answers, savedAt: Date.now() })); } catch { /* تخزين ممتلئ */ }
    }, 800);
    return () => window.clearTimeout(t);
  }, [answers, done, survey.id, preview]);

  // الشريطُ اللاصقُ يظهر حين يغادر الغلافُ الشاشة — فوق الغلاف لا حاجة إليه
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => setPastHero(!en.isIntersecting), { rootMargin: "-80px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [done]);

  const total = questions.length;
  const answered = questions.filter((q) => isAnswered(answers[q.id])).length;
  const errors = useMemo(() => {
    const out: Record<number, string> = {};
    for (const q of questions) {
      const e = questionError(q, answers[q.id]);
      if (e) out[q.id] = e;
    }
    return out;
  }, [questions, answers]);
  const missing = questions.filter((q) => q.required && !isAnswered(answers[q.id]));
  // جاهزٌ حين لا يبقى إلزاميّ **وفيه إجابةٌ واحدةٌ على الأقلّ**: استبيانٌ اختياريٌّ كلُّه لا يُرسَل فارغًا
  const ready = !missing.length && answered > 0;

  const finish = () => { setDone(new Date().toISOString()); window.scrollTo({ top: 0 }); };

  const submit = () => {
    // نزولٌ تلقائيٌّ معلّقٌ من آخر لمسة لا يسبق الإرسالَ إلى غير السؤال الناقص
    if (timer.current) window.clearTimeout(timer.current);
    setTried(true);
    const first = questions.find((q) => errors[q.id]);
    if (first) {
      setFormError(null);
      document.getElementById(`pq-${first.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!answered) {
      setFormError("أجب عن سؤالٍ واحدٍ على الأقلّ قبل الإرسال.");
      return;
    }
    setFormError(null);
    // المعاينة أمينة: تفرض التحقّق كالحقيقيّة تمامًا، لكن عند النجاح تُظهر الإيصال بلا إرسالٍ فعليّ
    if (preview) { finish(); return; }
    // درع Turnstile: لا نُرسل بلا رمزٍ صالح (غالبًا يجهز خفيةً في ثوانٍ)
    if (shieldOn && !tsToken) {
      setFormError("جارٍ التأكّد أنّك لست روبوتًا، انتظر لحظةً ثمّ أعد الإرسال.");
      return;
    }
    startSubmit(async () => {
      const r = await submitSurveyResponse({
        surveyId: survey.id,
        answers: { ...answers },
        seconds: Math.round((Date.now() - startedAt.current) / 1000),
        device: deviceType(),
        turnstileToken: tsToken ?? undefined,
      });
      if (r.ok) {
        try { localStorage.removeItem(draftKey(survey.id)); } catch { /* لا شيء */ }
        finish();
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
      <Done
        survey={survey}
        answered={answered}
        total={total}
        sentAt={done}
        onAgain={() => { setAnswers({}); setTried(false); setDone(null); setFormError(null); startedAt.current = Date.now(); window.scrollTo({ top: 0 }); }}
      />
    );
  }

  const pct = total ? Math.round((answered / total) * 100) : 0;

  /** اللمسةُ الواحدةُ تنزل إلى السؤال التالي — إن كان فارغًا وحده: من يعدّل إجابةً قديمةً لا يُختطَف */
  const answer = (q: PublicQuestion, i: number, v: AnswerValue | undefined) => {
    setAnswers((a) => setAnswer(a, q.id, v));
    const nextQ = questions[i + 1];
    if (!ONE_TAP.has(q.type) || !isAnswered(v) || isAnswered(answers[q.id])) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = document.getElementById(nextQ && !isAnswered(answers[nextQ.id]) ? `pq-${nextQ.id}` : "pq-end");
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    }, 380);
  };

  return (
    <div className="spt">
      {/* الشريطُ اللاصق للصفحة وحدها: في المعاينة شريطُها هي فوق الصفحة، وما لا يُظهر التقدّمَ لا شريطَ له */}
      {survey.showProgress && !preview ? (
        <div className="spt-bar" data-on={pastHero ? "" : undefined} aria-hidden={!pastHero}>
          <div className="spt-bar-in">
            {/* eslint-disable-next-line @next/next/no-img-element -- شعارٌ متّجهٌ صغير */}
            <img src="/brand/logo-horizontal.svg" alt="" />
            <div className="spt-bar-track"><span style={{ "--p": `${pct}%` } as CSSProperties} /></div>
            <span className="spt-bar-n"><b>{answered}</b> من {total}</span>
          </div>
        </div>
      ) : null}

      <header className="spt-hero" ref={heroRef}>
        <div className="spt-hero-in">
          <Link href="/" className="spt-logo" aria-label="موقع أدِيب">
            {/* eslint-disable-next-line @next/next/no-img-element -- شعارٌ متّجهٌ صغير */}
            <img src="/brand/logo-horizontal-white.svg" alt="" />
          </Link>
          <h1 className="spt-title">{survey.title}</h1>
          {survey.description ? <p className="spt-desc">{survey.description}</p> : null}
          {survey.welcome ? <p className="spt-desc">{survey.welcome}</p> : null}
          <ul className="spt-facts">
            <li><span className="spt-fi" aria-hidden><ListNumbers /></span>{questionsWord(total)}</li>
            <li><span className="spt-fi" aria-hidden><Timer /></span>نحو {minutesWord(minutesFor(questions))}</li>
            {survey.endDate ? <li><span className="spt-fi" aria-hidden><CalendarBlank /></span>يُغلق {fmtStamp(survey.endDate)}</li> : null}
            {survey.anonymous ? <li><span className="spt-fi" aria-hidden><Detective /></span>إجابتك بلا اسم</li> : null}
          </ul>
        </div>
      </header>

      <main className="spt-paper">
        <form className="spt-path" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {questions.map((q, i) => {
            const err = tried ? errors[q.id] ?? null : null;
            const state = err ? "err" : isAnswered(answers[q.id]) && !errors[q.id] ? "done" : "idle";
            const hid = `pqh-${q.id}`;
            return (
              <section key={q.id} id={`pq-${q.id}`} className="spt-q" data-state={state}>
                <span className="spt-node" aria-hidden>{state === "done" ? <Check /> : i + 1}</span>
                <h2 id={hid} className="spt-qt">
                  {q.text}
                  <FieldMark required={q.required} optional={!q.required} />
                </h2>
                {/* الوصفُ **ملاحظةٌ** بأيقونةٍ في مربّعها بين العنوان والإجابة: يُقرأ قبل الجواب */}
                {q.description ? (
                  <p className="spt-qd"><span className="spt-qd-ic" aria-hidden><Lightbulb /></span><span>{q.description}</span></p>
                ) : null}
                <div className="spt-ans">
                  <Answer p="spt" q={q} value={answers[q.id]} error={err} onChange={(v) => answer(q, i, v)} labelledBy={hid} />
                </div>
                {/* الخطأُ **تنبيهُ الهويّة** نفسُه (المالك: «تنبيهاتُ الهويّة أفضل») */}
                {err ? <div className="spt-err" role="alert"><Alert tone="danger" compact>{err}</Alert></div> : null}
              </section>
            );
          })}

          <section id="pq-end" className="spt-q spt-end" data-state={ready ? "done" : "idle"}>
            <span className="spt-node" aria-hidden><PaperPlaneTilt /></span>
            <div className="spt-send-card" data-ready={ready ? "" : undefined}>
              <div className="spt-send-head">
                <span className="spt-ring" style={{ "--p": pct } as CSSProperties} aria-hidden>
                  <svg className="spt-ring-svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" /><circle className="on" cx="32" cy="32" r="28" pathLength={100} /></svg>
                  {ready ? <Check /> : <span className="spt-ring-n"><b>{answered}</b><small>/</small><small>{total}</small></span>}
                </span>
                <div className="spt-send-tx">
                  <b>{ready ? "إجاباتك جاهزةٌ للإرسال" : answered ? `أجبت ${answered} من ${total}` : "لم تُجب عن شيءٍ بعد"}</b>
                  <span className={tried && missing.length ? "bad" : undefined}>{missing.length ? leftWord(missing.length) : answered ? `أجبت ${answered} من ${total}` : "الأسئلةُ كلُّها اختياريّة"}</span>
                </div>
              </div>
              {missing.length ? (
                <div className="spt-miss" aria-label="الأسئلة الإلزاميّة الباقية">
                  {missing.map((q) => (
                    <button key={q.id} type="button" className="spt-miss-n" aria-label={`انتقل إلى السؤال ${questions.indexOf(q) + 1}`} onClick={() => document.getElementById(`pq-${q.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                      {questions.indexOf(q) + 1}
                    </button>
                  ))}
                </div>
              ) : null}
              <button type="submit" className={`${primary} spt-go`} disabled={submitting} aria-busy={submitting || undefined}>
                {submitting ? "جارٍ الإرسال…" : "إرسال الإجابات"}
                <ArrowLeft aria-hidden />
              </button>
              {formError ? <div className="spt-send-alert" role="alert"><Alert tone="danger" compact title="لم تُرسل الإجابات">{formError}</Alert></div> : null}
            </div>
            {shieldOn ? (
              <div className="spt-shield">
                <TurnstileWidget siteKey={TURNSTILE_SITE_KEY!} onToken={setTsToken} resetSignal={tsReset} />
              </div>
            ) : null}
          </section>
        </form>
      </main>
    </div>
  );
}
