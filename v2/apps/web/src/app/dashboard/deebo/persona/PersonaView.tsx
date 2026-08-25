"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Field, IconButton, SaveBar, SectionCard, Switch, Textarea } from "@adeeb/design-system";
import { ChatText, ClockCounterClockwise, Gauge, TextT } from "@phosphor-icons/react";
import { PaperPlaneRight, SmileyWink } from "@phosphor-icons/react";
import { ArrowCounterClockwise, ArrowDown, ArrowUp, Plus, Prohibit, Question, Trash } from "@/app/_components/glyphs";
import { fmtStamp } from "@/lib/dates";
import { PROBE_SET } from "@/lib/deebo/probeSet";
import { IconDeebo } from "../../_shell/icons";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { useToast } from "../../_components/ToastProvider";
import { PageHeader } from "../../_components/PageHeader";
import type { BoundaryRule } from "@/lib/deebo/persona";
import type { PersonaForm, PersonaVersion } from "./data";
import { PROMPT_BUDGET, PROMPT_FIELDS } from "./limits";
import { probePersona, probeSuite, restorePersona, savePersona, type SuiteAnswer } from "./actions";

/** الرقمُ في طبعه يُسقط حارسَ الأرقام، فيُمنَع الحفظُ لا يُنبَّه عليه. */
const DIGITS = /[0-9٠-٩۰-۹]/;

const countLines = (v: string) => v.split("\n").map((l) => l.trim()).filter(Boolean).length;


/**
 * **طبعُ ديبو** — ورقةُ الهويّة صارت شاشة (٢٠٢٦-٠٨-٢٢).
 *
 * وكلُّ ما ههنا يسري على الزوّار **في اللحظة**: لا نشرَ ولا مراجعة. ولذلك بابان قبل
 * الحفظ: منعُ الأرقام (وعلّتُه في `actions.ts`)، و«جرّبه» يسأله بالمسوّدة قبل أن تُثبَّت.
 */
export function PersonaView({
  persona,
  history,
  historyReady,
}: {
  persona: PersonaForm;
  history: PersonaVersion[];
  historyReady: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [probing, startProbe] = useTransition();

  const [form, setForm] = useState<PersonaForm>(persona);
  const set = <K extends keyof PersonaForm>(key: K, v: PersonaForm[K]) =>
    setForm((f) => ({ ...f, [key]: v }));

  const setRule = (i: number, patch: Partial<BoundaryRule>) =>
    setForm((f) => ({ ...f, rules: f.rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const moveRule = (i: number, dir: -1 | 1) =>
    setForm((f) => {
      const next = [...f.rules];
      const j = i + dir;
      if (j < 0 || j >= next.length) return f;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...f, rules: next };
    });
  const dropRule = (i: number) => setForm((f) => ({ ...f, rules: f.rules.filter((_, j) => j !== i) }));
  const addRule = () => setForm((f) => ({ ...f, rules: [...f.rules, { title: "", body: "", enabled: true }] }));

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  const [suiting, startSuite] = useTransition();
  const [suite, setSuite] = useState<SuiteAnswer[] | null>(null);

  const [restoring, startRestore] = useTransition();
  const [toRestore, setToRestore] = useState<PersonaVersion | null>(null);

  /* **ما الذي تغيّر** — يُقال قبل الحفظ لا بعده. والمطابقةُ بالمتن لا بالموضع: حكمٌ
     نزل سطرًا ليس حكمًا جديدًا، وحكمٌ بُدِّل متنُه ليس نقلًا. */
  const changes = (() => {
    const out: string[] = [];
    const t = (k: "identity" | "tone" | "unknownAnswer" | "prohibitions" | "suggestedQuestions", ar: string) => {
      if (form[k].trim() !== persona[k].trim()) out.push(ar);
    };
    t("identity", "تعريفه بنفسه");
    t("tone", "نبرته");
    t("unknownAnswer", "جملة «لا أعرف»");
    t("prohibitions", "المحظورات");
    t("suggestedQuestions", "الأسئلة المقترحة");
    if (form.shownQuestions !== persona.shownQuestions) out.push("كم يُعرض من الأسئلة");

    const key = (r: BoundaryRule) => r.body.trim();
    const oldBodies = persona.rules.map(key);
    const newBodies = form.rules.map(key);
    const named = (r: BoundaryRule) => r.title?.trim() || r.body.trim().split("\n")[0].slice(0, 40);
    for (const r of form.rules) if (!oldBodies.includes(key(r))) out.push(`حكمٌ زِيد: ${named(r)}`);
    for (const r of persona.rules) if (!newBodies.includes(key(r))) out.push(`حكمٌ حُذف أو بُدِّل نصُّه: ${named(r)}`);
    for (const r of form.rules) {
      const was = persona.rules.find((o) => key(o) === key(r));
      if (was && was.enabled !== r.enabled) out.push(`${r.enabled ? "أُشعِل" : "أُطفئ"} حكمُ: ${named(r)}`);
    }
    if (out.length === 0 && JSON.stringify(newBodies) !== JSON.stringify(oldBodies)) out.push("أُعيد ترتيبُ الأحكام");
    return out;
  })();

  const snapshot = JSON.stringify(form);
  const [origin, setOrigin] = useState(snapshot);
  const dirty = snapshot !== origin;

  // ما فيه رقمٌ ممّا يدخل التوجيه — يُسمّى للناظر قبل أن يضغط، لا بعد أن يُردّ.
  const numbered = [
    ...(["identity", "tone", "unknownAnswer", "prohibitions"] as const).filter((k) => DIGITS.test(form[k])),
    ...(form.rules.some((r) => DIGITS.test(r.body) || DIGITS.test(r.title ?? "")) ? (["rules"] as const) : []),
  ];

  const asks = countLines(form.suggestedQuestions);

  /* ميزانُ الطول محسوبًا في الشاشة بالحساب الذي يحكم به الخادمُ نفسُه (`limits.ts`):
     يُرى وهو يكبر، لا بعد أن يُردّ الحفظ. */
  const used =
    PROMPT_FIELDS.reduce((n, k) => n + form[k].trim().length, 0) +
    form.rules.filter((r) => r.enabled).reduce((n, r) => n + r.body.trim().length + 3, 0);
  const over = used > PROMPT_BUDGET;
  const tight = !over && used > PROMPT_BUDGET * 0.85;

  const save = () => {
    startSave(async () => {
      const r = await savePersona(form);
      if (r.ok) {
        toast.success(r.message);
        setOrigin(JSON.stringify(form));
        router.refresh();
      } else toast.error(r.message);
    });
  };

  const measure = (compare: boolean) => {
    startSuite(async () => {
      setSuite(null);
      const r = await probeSuite(form, compare);
      if (r.ok) setSuite(r.answers);
      else toast.error(r.message);
    });
  };

  const restore = (v: PersonaVersion) => {
    startRestore(async () => {
      const r = await restorePersona(v.id);
      setToRestore(null);
      if (r.ok) {
        toast.success("رجع طبعُه إلى تلك النسخة.");
        router.refresh();
      } else toast.error(r.message);
    });
  };

  const probe = () => {
    startProbe(async () => {
      setAnswer(null);
      const r = await probePersona(form, question);
      if (r.ok) setAnswer(r.answer);
      else toast.error(r.message);
    });
  };

  return (
    <>
      <PageHeader title="طبع ديبو" />

      <Alert tone="warning" title="ما تكتبه هنا يقوله ديبو للناس فورًا">
        لا نشرَ بعده ولا مراجعة. وجرّبه بالسؤال أسفل الصفحة قبل أن تحفظ، فالتجربةُ تبني
        كلامَه بالمسوّدة ولا تمسّ ما يقوله اليوم.
      </Alert>

      {numbered.length > 0 ? (
        <Alert tone="danger" title="فيه رقم، والحفظُ مردود">
          ديبو مأذونٌ أن يذكر في جوابه كلّ رقمٍ يراه في طبعه، فرقمٌ واحدٌ هنا يفتح له بابَ
          الأرقام كلَّه. امحُ الرقم من: {numbered.map((k) => FIELD_AR[k]).join("، ")}.
        </Alert>
      ) : null}

      {over || tight ? (
        <Alert
          tone={over ? "danger" : "warning"}
          title={over ? "طبعُه أطول ممّا يحتمل، والحفظُ مردود" : "قارب طبعُه سقفَه"}
        >
          {`ما يدخل توجيهَه ${used} حرفًا من ${PROMPT_BUDGET}. `}
          النموذجُ يوزّع انتباهَه على ما يُعطى، فكلُّ سطرٍ يُضاف بعد هذا يُضعِف ما قبله:
          احذف قبل أن تضيف.
        </Alert>
      ) : null}

      <div className="form-build">
        <SectionCard headerVariant="chip" icon={<IconDeebo />} title="من أنت">
          <div className="form-grid">
            <Textarea
              className="form-full"
              label="تعريفه بنفسه"
              icon={<TextT />}
              innerIcon={<ChatText />}
              placeholder="كيف يتحدّث عن نفسه، وقصّة اسمه، وجوابه حين يُسأل: هل أنت إنسان؟"
              rows={6}
              value={form.identity}
              onChange={(e) => set("identity", e.target.value)}
              required
            />
          </div>
        </SectionCard>

        <SectionCard headerVariant="chip" icon={<SmileyWink />} title="نبرته">
          <div className="form-grid">
            <Textarea
              className="form-full"
              label="كيف يتكلّم"
              icon={<TextT />}
              innerIcon={<ChatText />}
              placeholder="ودود، مختصر، لا يتفاصح… وطول جوابه، وإيموجي أو بلا إيموجي"
              rows={4}
              value={form.tone}
              onChange={(e) => set("tone", e.target.value)}
              required
            />
          </div>
        </SectionCard>

        <SectionCard headerVariant="chip" icon={<Prohibit />} title="حدوده">
          <div className="form-grid">
            {/* **حكمٌ حكمٌ لا جدارُ نصّ** (م١٠): يُحرَّر وحدَه، ويُطفأ بلا حذفٍ ليُعرَف
                أثرُه، ويُرتَّب — فترتيبُ الأحكام في التوجيه يُقرأ. */}
            {/* الأحكامُ مبسوطةٌ لا مطويّة: جُرّب الطيُّ ٢٠٢٦-٠٨-٢٥ فردَّه المالك في يومه. */}
            <div className="form-full flex flex-col gap-3">
              {form.rules.map((r, i) => (
                <div key={i} className={"acard p-3" + (r.enabled ? "" : " opacity-60")}>
                  <div className="form-grid">
                    <Field
                      className="form-full"
                      label="اسمُ الحكم"
                      icon={<TextT />}
                      innerIcon={<ChatText />}
                      placeholder="المسامرة، طلبُ العمل، الروابط…"
                      value={r.title ?? ""}
                      onChange={(e) => setRule(i, { title: e.target.value })}
                      optional
                    />
                    <Textarea
                      className="form-full"
                      label="نصّه"
                      icon={<Prohibit />}
                      innerIcon={<ChatText />}
                      placeholder="ماذا يفعل في هذه الحال، وماذا يعتذر عنه"
                      rows={4}
                      value={r.body}
                      onChange={(e) => setRule(i, { body: e.target.value })}
                      required
                    />
                    <div className="form-full flex flex-wrap items-center gap-2">
                      <Switch
                        row
                        label={r.enabled ? "يعمل" : "معطَّل"}
                        description={r.enabled ? "يدخل توجيهَه" : "لا يدخل توجيهَه، ويبقى محفوظًا"}
                        checked={r.enabled}
                        onChange={(e) => setRule(i, { enabled: e.target.checked })}
                      />
                      <span className="ms-auto inline-flex gap-1">
                        <IconButton aria-label="لأعلى" title="لأعلى" disabled={i === 0} onClick={() => moveRule(i, -1)}><ArrowUp /></IconButton>
                        <IconButton aria-label="لأسفل" title="لأسفل" disabled={i === form.rules.length - 1} onClick={() => moveRule(i, 1)}><ArrowDown /></IconButton>
                        <IconButton aria-label="حذف الحكم" title="حذف" tone="danger" onClick={() => dropRule(i)}><Trash /></IconButton>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="neutral" size="sm" onClick={addRule}>
                <Plus aria-hidden />
                حكمٌ جديد
              </Button>
            </div>
            <Textarea
              className="form-full"
              label="ما لا يفعله أبدًا"
              icon={<Prohibit />}
              innerIcon={<ChatText />}
              placeholder="محظورٌ في كلّ سطر"
              rows={8}
              value={form.prohibitions}
              onChange={(e) => set("prohibitions", e.target.value)}
            />
            <Field
              className="form-full"
              label="ما يقوله حين لا يعرف"
              icon={<Question />}
              innerIcon={<ChatText />}
              placeholder="هذا ما لا أعرفه، ولا أحبّ أن أخمّن…"
              value={form.unknownAnswer}
              onChange={(e) => set("unknownAnswer", e.target.value)}
              required
            />
          </div>
        </SectionCard>

        <SectionCard headerVariant="chip" icon={<Question />} title="أسئلة شاشته الفارغة">
          <div className="form-grid">
            <Textarea
              className="form-full"
              label="الأسئلة المقترحة"
              icon={<Question />}
              innerIcon={<ChatText />}
              placeholder="سؤالٌ في كلّ سطر"
              rows={7}
              value={form.suggestedQuestions}
              onChange={(e) => set("suggestedQuestions", e.target.value)}
            />
            {/* القرارُ الذي كان معلّقًا في ورقة الهويّة: كم منها يُعرض. صار رقمًا بيده. */}
            <Field
              label="كم يُعرض منها"
              icon={<Question />}
              innerIcon={<Question />}
              placeholder="٤"
              type="number"
              min={0}
              max={asks}
              charset="digits"
              value={String(form.shownQuestions)}
              onChange={(e) => set("shownQuestions", Number(e.target.value) || 0)}
              helper={`المكتوب منها ${asks}`}
            />
          </div>
        </SectionCard>

        <SectionCard headerVariant="chip" icon={<PaperPlaneRight />} title="جرّبه قبل أن تحفظ">
          <div className="form-grid">
            <Field
              className="form-full"
              label="اسأله بالمسوّدة"
              icon={<Question />}
              innerIcon={<PaperPlaneRight />}
              placeholder="مثال: هلا كيف حالك؟"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <div className="form-full">
              <Button variant="neutral" size="md" loading={probing} onClick={probe}>
                اسأل ديبو
              </Button>
            </div>
            {answer !== null ? (
              <Alert className="form-full" tone="info" title="جوابه بالمسوّدة">
                {answer}
              </Alert>
            ) : null}
          </div>
        </SectionCard>

        {/* **حزمةُ القياس** — السؤالُ الواحدُ أعلاه يُثبت أنّه يردّ، وهذه تُثبت أنّ التعديل
            لم يكسر ما كان يعمل: ثمانيةُ أسئلةٍ لا تتغيّر، لكلٍّ منها ما يُراقَب فيه. */}
        <SectionCard headerVariant="chip" icon={<Gauge />} title="قِسه قبل أن تحفظ">
          <div className="form-grid">
            <p className="form-full text-sm leading-7 text-content-muted">
              ثمانيةُ أسئلةٍ ثابتة، كلُّ واحدٍ منها كسر شيئًا مرّةً أو يحرس حكمًا صريحًا.
              تُسأل بالمسوّدة على معرفته الحيّة، ولا تُسجَّل ولا تُحسب من سقف الزوّار.
            </p>
            <div className="form-full btn-row">
              <Button variant="neutral" size="md" loading={suiting} onClick={() => measure(false)}>
                اسأله الثمانية
              </Button>
              <Button variant="ghost" size="md" loading={suiting} disabled={!dirty} onClick={() => measure(true)}>
                قارِنه بالقائم
              </Button>
            </div>
            {suite ? (
              <div className="form-full flex flex-col gap-3">
                {PROBE_SET.map((p) => {
                  const a = suite.find((x) => x.id === p.id);
                  return (
                    <Alert
                      key={p.id}
                      tone={a?.ok ? "info" : "danger"}
                      title={p.question}
                    >
                      <span className="block text-content-muted">{`يُراقَب: ${p.watch}`}</span>
                      {a?.live ? (
                        <span className="mt-2 block text-content-muted">{`القائم: ${a.live}`}</span>
                      ) : null}
                      <span className="mt-2 block">
                        {a?.live ? "المسوّدة: " : ""}
                        {a?.ok ? a.answer : a?.message ?? "لم يُسأل"}
                      </span>
                    </Alert>
                  );
                })}
              </div>
            ) : null}
          </div>
        </SectionCard>

        {/* **نسخُه السابقة** — لقطةٌ تُؤخذ في القاعدة عند كلّ حفظ (مُطلِقُ `deebo_09`)، فلا
            تعتمد على أن يتذكّرها التطبيق. والرجعةُ حفظٌ عاديّ، فيُرجَع عنها كما رُجع بها. */}
        <SectionCard headerVariant="chip" icon={<ClockCounterClockwise />} title="نسخُه السابقة">
          <div className="form-grid">
            {!historyReady ? (
              <Alert className="form-full" tone="warning" title="الرجعةُ لم تُفتح بعد">
                سجلُّ النسخ ينتظر تطبيقَ ترحيل <span className="font-latin">deebo_09</span>.
                والتحريرُ يعمل كما هو، غير أنّ تعديلَ اليوم يمحو سابقَه بلا رجعة.
              </Alert>
            ) : history.length === 0 ? (
              <p className="form-full text-sm leading-7 text-content-muted">
                لا نسخةَ بعد: تُؤخذ اللقطةُ الأولى عند أوّل حفظٍ من الآن.
              </p>
            ) : (
              <div className="form-full flex flex-col gap-2">
                {history.map((v) => (
                  <div key={v.id} className="acard dcard dcard-v-compact">
                    <div className="dcard-head">
                      <span className="dcard-id">
                        <span className="dcard-title">{fmtStamp(v.at)}</span>
                        <span className="dcard-sub">{v.gist}</span>
                      </span>
                    </div>
                    <div className="dcard-act">
                      {v.byName ? <Badge tone="neutral" size="sm">{v.byName}</Badge> : null}
                      <span className="dcard-act-end">
                        <Button variant="ghost" size="sm" onClick={() => setToRestore(v)}>
                          أعِد هذه
                          <ArrowCounterClockwise aria-hidden />
                        </Button>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <ConfirmDialog
        open={!!toRestore}
        onClose={() => setToRestore(null)}
        tone="warning"
        icon={<ArrowCounterClockwise />}
        title="يرجع طبعُه إلى هذه النسخة؟"
        text={
          toRestore
            ? `ما يقوله ديبو للناس يصير كلامَ نسخة ${fmtStamp(toRestore.at)} في اللحظة. ونسختُه القائمةُ تُحفظ في السجلّ، فيُرجَع عنها.`
            : undefined
        }
        confirmLabel="أعِدها"
        loading={restoring}
        onConfirm={() => toRestore && restore(toRestore)}
      />

      {dirty && changes.length > 0 ? (
        <Alert tone="info" title="ما الذي تغيّر">
          {changes.join("، ")}
        </Alert>
      ) : null}

      <SaveBar open={dirty} message={changes.length ? `تغيّر ${changes.length} موضعًا` : "طبعٌ لم يُحفظ بعد"}>
        <Button variant="primary" size="md" loading={saving} disabled={numbered.length > 0 || over} onClick={save}>
          حفظ الطبع
        </Button>
      </SaveBar>
    </>
  );
}

const FIELD_AR: Record<string, string> = {
  identity: "من أنت",
  tone: "نبرته",
  rules: "حدوده",
  unknownAnswer: "جملة لا أعرف",
  prohibitions: "المحظورات",
};
