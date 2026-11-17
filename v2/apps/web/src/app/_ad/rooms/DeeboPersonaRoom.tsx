"use client";

/**
 * **طبعُ ديبو على «المنضدة»** (قالبُ «مساحة العمل»، ٢٠٢٦-١١-١٣ — لم يُعتمد بعد، مختبرُه `/dashboard/ad/deebo-persona`).
 * ما تكتبه هنا يقوله ديبو للناس في لحظة الحفظ، فالمنضدةُ **غرفةُ ديبو نفسُها** (`/frame/deebo`): الشاشةُ العامّةُ المعتمدة بأسئلتها
 * المقترحة وترحيبها، وكلُّ سؤالٍ فيها يُسأل بالمسوّدة لا بالقائم (`probePersona`) — فتُحادثه بالطبع الذي تكتبه قبل أن يراه أحد.
 * ولوحان كمحرّر الخبر: «الطبع» (من أنت، نبرته، حدوده أحكامًا تُرتَّب، المحظورات، «لا أعرف»، أسئلةُ الشاشة)، و«القياس والنسخ»
 * (الأسئلةُ الثمانيةُ الثابتة، ونسخُه السابقة). السلوكُ كلُّه سلوكُ `PersonaView` القديم: الأرقامُ تردّ الحفظ، والميزانُ يردّه، والرجعةُ بتأكيد.
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Textarea } from "@adeeb/design-system";
import { Books, ChatText, ClockCounterClockwise, FloppyDisk, Gauge, ListBullets, Robot, SmileyWink, TextT, UserCircle } from "@phosphor-icons/react";
import { ArrowCounterClockwise, PencilSimple, Plus, Prohibit, Question, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { fmtStamp } from "@/lib/dates";
import { PROBE_SET } from "@/lib/deebo/probeSet";
import type { BoundaryRule } from "@/lib/deebo/persona";
import type { PersonaForm, PersonaVersion } from "@/app/dashboard/deebo/persona/data";
import { PROMPT_BUDGET, PROMPT_FIELDS } from "@/app/dashboard/deebo/persona/limits";
import { probeSuite, restorePersona, savePersona, type SuiteAnswer } from "@/app/dashboard/deebo/persona/actions";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { AdLog, type AdLogEvent } from "../log";
import { AdButton, AdConfirm, AdEmpty, AdNote } from "../primitives";
import { FormSection, FormToggle } from "../form";
import { SortArea, SortItem } from "../reorder";
import { StageFrame, WorkBlock, WorkRoom, useLeaveGuard } from "../workspace";

const AR_VERSION: ArForms = ["نسخةٌ واحدة", "نسختان", "نسخ", "نسخةً"];
const AR_SPOT: ArForms = ["موضعٌ واحد", "موضعان", "مواضع", "موضعًا"];

/** الرقمُ في طبعه يُسقط حارسَ الأرقام، فيُمنَع الحفظُ لا يُنبَّه عليه (علّتُه في `actions.ts`). */
const DIGITS = /[0-9٠-٩۰-۹]/;
/** حدودُ الحقول كما يحكم بها الخادم (`validate` في `actions.ts`) — عدّادٌ تحت كلّ حقلٍ بقاعدة العدّاد */
const MAX = { identity: 2000, tone: 1200, unknownAnswer: 400 } as const;
/** الحقلُ الذي فيه الرقمُ يقولها في موضع وصفه، لا التنبيهُ أعلى الغرفة وحده (المراجع ٢٠٢٦-١١-١٣) */
const DIGIT_ERR = "فيه رقم: امحُه، فالرقمُ في شخصيّته يفتح له بابَ الأرقام كلَّه";
const countLines = (v: string) => v.split("\n").map((l) => l.trim()).filter(Boolean).length;
const FIELD_AR: Record<string, string> = { identity: "من هو", tone: "كيف يتكلّم", rules: "أحكامه", unknownAnswer: "ما يقوله حين لا يعرف", prohibitions: "ما لا يفعله أبدًا" };

/** ما يصل المنضدةَ: الطبعُ كما يُكتب الآن، واسمُ صاحب الغرفة لترحيبها */
export type DeeboStageDraft = { persona: PersonaForm; name: string | null; seed: number };

type Row = { k: string; r: BoundaryRule };

export function DeeboPersonaRoom({ persona, history, historyReady, serverNow, viewerName, seed, lab }: {
  persona: PersonaForm;
  history: PersonaVersion[];
  historyReady: boolean;
  serverNow: number;
  /** الاسمُ الأوّل لصاحب الغرفة: ترحيبُ ديبو في المنضدة يخاطبه كما يخاطبه في الموقع */
  viewerName: string | null;
  /** بذرةُ الترحيب من الخادم (كصفحة ديبو): جملةٌ واحدةٌ في الرسمين */
  seed: number;
  lab?: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [suiting, startSuite] = useTransition();
  const [restoring, startRestore] = useTransition();

  const next = useRef(persona.rules.length);
  const [rows, setRows] = useState<Row[]>(() => persona.rules.map((r, i) => ({ k: `r${i}`, r })));
  const [base, setBase] = useState<Omit<PersonaForm, "rules">>(() => { const { rules: _r, ...rest } = persona; void _r; return rest; });
  const form: PersonaForm = { ...base, rules: rows.map((x) => x.r) };
  const set = <K extends keyof Omit<PersonaForm, "rules">>(key: K, v: PersonaForm[K]) => setBase((f) => ({ ...f, [key]: v }));

  const [open, setOpen] = useState<string | null>(null);
  const setRule = (k: string, patch: Partial<BoundaryRule>) => setRows((rs) => rs.map((x) => (x.k === k ? { ...x, r: { ...x.r, ...patch } } : x)));
  const moveTo = (from: string, to: string) => setRows((rs) => {
    const a = rs.findIndex((x) => x.k === from); const b = rs.findIndex((x) => x.k === to);
    if (a < 0 || b < 0) return rs;
    const out = [...rs]; const [m] = out.splice(a, 1); out.splice(b, 0, m); return out;
  });
  const step = (i: number, dir: -1 | 1) => setRows((rs) => {
    const j = i + dir; if (j < 0 || j >= rs.length) return rs;
    const out = [...rs]; [out[i], out[j]] = [out[j], out[i]]; return out;
  });
  const drop = (k: string) => { setRows((rs) => rs.filter((x) => x.k !== k)); if (open === k) setOpen(null); };
  const add = () => {
    const k = `r${next.current++}`;
    setRows((rs) => [...rs, { k, r: { title: "", body: "", enabled: true } }]);
    setOpen(k);
    requestAnimationFrame(() => document.getElementById(`rule-${k}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  /* **ما الذي تغيّر** — يُقال قبل الحفظ لا بعده، والمطابقةُ بالمتن لا بالموضع (كما في `PersonaView`) */
  const changes = (() => {
    const out: string[] = [];
    const t = (k: "identity" | "tone" | "unknownAnswer" | "prohibitions" | "suggestedQuestions", ar: string) => { if (form[k].trim() !== persona[k].trim()) out.push(`«${ar}»`); };
    t("identity", "من هو"); t("tone", "كيف يتكلّم"); t("unknownAnswer", "ما يقوله حين لا يعرف"); t("prohibitions", "المحظورات"); t("suggestedQuestions", "الأسئلة المقترحة");
    if (form.shownQuestions !== persona.shownQuestions) out.push("«كم يُعرض منها»");
    const key = (r: BoundaryRule) => r.body.trim();
    const oldB = persona.rules.map(key); const newB = form.rules.map(key);
    const named = (r: BoundaryRule) => r.title?.trim() || r.body.trim().split("\n")[0].slice(0, 40) || "حكمٌ جديد";
    for (const r of form.rules) if (!oldB.includes(key(r))) out.push(`حكمٌ زِيد: ${named(r)}`);
    for (const r of persona.rules) if (!newB.includes(key(r))) out.push(`حكمٌ حُذف أو بُدِّل نصُّه: ${named(r)}`);
    for (const r of form.rules) { const was = persona.rules.find((o) => key(o) === key(r)); if (was && was.enabled !== r.enabled) out.push(`${r.enabled ? "أُشعِل" : "أُطفئ"} حكمُ: ${named(r)}`); }
    if (out.length === 0 && JSON.stringify(newB) !== JSON.stringify(oldB)) out.push("أُعيد ترتيبُ الأحكام");
    return out;
  })();
  const snapshot = JSON.stringify(form);
  const [origin, setOrigin] = useState(snapshot);
  const dirty = snapshot !== origin;
  const [left, setLeft] = useState(false);
  const leave = useLeaveGuard(dirty && !saving && !left);

  const numbered = [
    ...(["identity", "tone", "unknownAnswer", "prohibitions"] as const).filter((k) => DIGITS.test(form[k])),
    ...(form.rules.some((r) => DIGITS.test(r.body) || DIGITS.test(r.title ?? "")) ? (["rules"] as const) : []),
  ];
  const asks = countLines(form.suggestedQuestions);
  const used = PROMPT_FIELDS.reduce((n, k) => n + form[k].trim().length, 0) + form.rules.filter((r) => r.enabled).reduce((n, r) => n + r.body.trim().length + 3, 0);
  const over = used > PROMPT_BUDGET;
  const tight = !over && used > PROMPT_BUDGET * 0.85;

  const save = () => {
    if (lab) { toast.info("مختبر: لا يُحفظ شيءٌ من هنا."); return; }
    startSave(async () => {
      const r = await savePersona(form);
      if (r.ok) { toast.success(r.message); setOrigin(JSON.stringify(form)); setLeft(false); router.refresh(); }
      else toast.error(r.message);
    });
  };

  const [suite, setSuite] = useState<SuiteAnswer[] | null>(null);
  const [suiteOpen, setSuiteOpen] = useState<string | null>(null);
  const measure = (compare: boolean) => startSuite(async () => {
    setSuite(null);
    const r = await probeSuite(form, compare);
    if (r.ok) setSuite(r.answers); else toast.error(r.message);
  });

  const [toRestore, setToRestore] = useState<PersonaVersion | null>(null);
  const restore = (v: PersonaVersion) => {
    if (lab) { setToRestore(null); toast.info("مختبر: لا يُحفظ شيءٌ من هنا."); return; }
    startRestore(async () => {
      const r = await restorePersona(v.id);
      setToRestore(null);
      // الغرفةُ تُعاد من النسخة الراجعة: مفتاحُها لحظةُ آخر تعديلٍ للطبع (`page.tsx`)، فلا تبقى المسوّدةُ القديمةُ في الحقول والمعاينة
      if (r.ok) { toast.success("رجعت شخصيّتُه إلى تلك النسخة."); router.refresh(); } else toast.error(r.message);
    });
  };
  const versionEvent = (v: PersonaVersion): AdLogEvent => ({
    icon: <FloppyDisk />, tone: "warn",
    title: v.gist || fmtStamp(v.at),
    meta: v.byName ? [{ icon: <UserCircle />, text: `بيد ${v.byName}` }] : undefined,
    open: { label: "أعِد هذه", icon: <ArrowCounterClockwise />, onClick: () => setToRestore(v) },
  });

  const commit = {
    primary: { label: "حفظ الشخصية", icon: <FloppyDisk />, onClick: save, busy: saving, held: !dirty || numbered.length > 0 || over },
    cancelHref: "/dashboard/deebo", dirty,
  };

  /* **حالُ الطبع فوق التحرير في كلّ لوح**: ما يُكتب هنا يقوله للناس في لحظة الحفظ، ثمّ ما يردّ الحفظ (رقمٌ، ميزانٌ تجاوزه)، ثمّ ما تغيّر */
  const lead = (
    <>
      {numbered.length ? (
        <AdNote tone="bad" title="فيه رقم، والحفظُ مردود">
          {`ديبو مأذونٌ أن يذكر كلّ رقمٍ يراه في شخصيّته، فرقمٌ واحدٌ هنا يفتح له بابَ الأرقام كلَّه. امحُه من ${numbered.map((k) => `«${FIELD_AR[k]}»`).join(" و")}.`}
        </AdNote>
      ) : null}
      {over || tight ? (
        <AdNote tone={over ? "bad" : "warn"} title={over ? "شخصيّتُه أطول ممّا تحتمل، والحفظُ مردود" : "قاربت شخصيّتُه سقفَها"}>
          {`ما يدخل توجيهَه ${used} حرفًا من ${PROMPT_BUDGET}. كلُّ سطرٍ يُضاف بعد هذا يُضعف ما قبله: احذف قبل أن تضيف.`}
        </AdNote>
      ) : null}
      {/* **التنبيهُ حين يكون ما يُنبَّه عليه** (محمد ٢٠٢٦-١١-١٣ «افعل ما تراه»): كان «ما تكتبه يقوله للناس لحظةَ الحفظ» ثابتًا يأكل الشاشةَ
          في كلّ زيارة، فصار يُقال مع ما تغيّر — وهي اللحظةُ التي يعني فيها شيئًا */}
      {dirty && changes.length ? (
        <AdNote tone="warn" title={`لم يُحفظ: تغيّر ${arCount(changes.length, AR_SPOT)}`}>
          {`${changes.join("، ")}. وما تحفظه يقوله ديبو للناس في لحظته، فحادِثه في المعاينة قبل أن تحفظ.`}
        </AdNote>
      ) : null}
    </>
  );

  const keys = rows.map((x) => x.k);
  // الحكمُ بلا اسمٍ يُسمّى بأوّل سطرٍ من نصّه، بلا علامات التنسيق (**…**) التي يقرؤها النموذجُ ولا تُقرأ في سطر
  const ruleName = (r: BoundaryRule) => r.title?.trim() || r.body.trim().split("\n")[0].replace(/[*_`#>]+/g, "").trim() || "حكمٌ جديد";
  const writing = (
    <>
      {/* **ثلاثةُ أقسامٍ بثلاثة أسئلة يفهمها من يحرّر** (محمد ٢٠٢٦-١١-١٣: «ضع في بالك المستخدم ماذا سيفهم»): مَن هو وكيف يتكلّم، ثمّ حدودُه
          كلُّها في موضعٍ واحد، ثمّ شاشتُه. كانت ستّةً، أربعةٌ منها حقلٌ واحد، و«حدوده» و«ما لا يفعله أبدًا» قسمين يُقرآن شيئًا واحدًا.
          والحدودُ بترتيبها في تعليماته: جملةُ «لا أعرف» (قاعدةُ «لا تجب إلّا من معرفتك»)، ثمّ الأحكام، ثمّ المحظورات */}
      <FormSection id="who" icon={<Robot />} title="شخصيته" sub="من هو، وكيف يتكلّم">
        <div className="form-grid">
          <Textarea className="form-full" label="من هو" icon={<Robot />} innerIcon={<ChatText />} rows={6} count={{ max: MAX.identity }}
            placeholder="كيف يتحدّث عن نفسه، وقصّة اسمه، وجوابه حين يُسأل: هل أنت إنسان؟" value={form.identity} onChange={(e) => set("identity", e.target.value)} error={DIGITS.test(form.identity) ? DIGIT_ERR : undefined} required />
          <Textarea className="form-full" label="كيف يتكلّم" icon={<SmileyWink />} innerIcon={<ChatText />} rows={4} count={{ max: MAX.tone }}
            placeholder="ودود، مختصر، لا يتفاصح… وطول جوابه، وإيموجي أو بلا إيموجي" value={form.tone} onChange={(e) => set("tone", e.target.value)} error={DIGITS.test(form.tone) ? DIGIT_ERR : undefined} required />
        </div>
      </FormSection>

      {/* **الطريقُ إلى ما يعرفه** (محمد ٢٠٢٦-١١-١٣): حدودُه تبدأ بـ«لا تجب إلّا من معرفتك»، فبابُ معرفته في رأس قسمها — الشخصيّةُ كيف يقول، والمعرفةُ ماذا يقول */}
      <FormSection id="rules" icon={<Prohibit />} title="حدوده" sub="ما يقوله حين لا يعرف، وأحكامُه، وما لا يفعله أبدًا"
        act={<AdButton variant="line" size="sm" icon={<Books />} href="/dashboard/deebo/knowledge">ما يعرفه</AdButton>}>
        <div className="form-grid">
          <Textarea className="form-full" label="ما يقوله حين لا يعرف" icon={<Question />} innerIcon={<ChatText />} rows={2} count={{ max: MAX.unknownAnswer }}
            helper="لا يجيب إلّا من معرفته، وما ليس فيها يقول هذه الجملة"
            placeholder="هذا ما لا أعرفه، ولا أحبّ أن أخمّن…" value={form.unknownAnswer} onChange={(e) => set("unknownAnswer", e.target.value)} error={DIGITS.test(form.unknownAnswer) ? DIGIT_ERR : undefined} required />
        </div>
        {rows.length ? (
          <div className="ad-wblks">
            <SortArea list ids={keys} total={rows.length} nameOf={(k) => ruleName(rows.find((x) => x.k === k)!.r)} placeOf={(k) => keys.indexOf(k) + 1} onMove={moveTo}>
              {rows.map(({ k, r }, i) => (
                <div key={k} id={`rule-${k}`} className="ad-wblk-slot">
                  <SortItem id={k} label={ruleName(r)} n={i + 1} on prev={i > 0} next={i < rows.length - 1} onStep={(dir) => step(i, dir)}>
                    <WorkBlock n={i + 1} title={ruleName(r)} untitled={!r.title?.trim() && !r.body.trim()}
                      sub={r.enabled ? undefined : "معطَّل: لا يدخل توجيهَه"} warn={open === k ? undefined : !r.body.trim() ? "لم يُكتب نصُّه" : DIGITS.test(r.body) || DIGITS.test(r.title ?? "") ? "فيه رقم" : undefined}
                      open={open === k} onToggle={() => setOpen(open === k ? null : k)}
                      acts={<AdButton variant="danger" size="sm" icon={<Trash />} onClick={() => drop(k)}>حذف</AdButton>}>
                      <div className="form-grid">
                        <Field className="form-full" label="اسمُ الحكم" icon={<TextT />} innerIcon={<PencilSimple />} placeholder="المسامرة، طلبُ العمل، الروابط…"
                          value={r.title ?? ""} onChange={(e) => setRule(k, { title: e.target.value })} error={DIGITS.test(r.title ?? "") ? DIGIT_ERR : undefined} optional />
                        <Textarea className="form-full" label="نصّه" icon={<Prohibit />} innerIcon={<ChatText />} rows={4} placeholder="ماذا يفعل في هذه الحال، وماذا يعتذر عنه"
                          value={r.body} onChange={(e) => setRule(k, { body: e.target.value })} error={DIGITS.test(r.body) ? DIGIT_ERR : undefined} required />
                        <FormToggle className="form-full" icon={<Prohibit />} label="يعمل" description={r.enabled ? "يدخل توجيهَه" : "لا يدخل توجيهَه، ويبقى محفوظًا"}
                          checked={r.enabled} onChange={(v) => setRule(k, { enabled: v })} />
                      </div>
                    </WorkBlock>
                  </SortItem>
                </div>
              ))}
            </SortArea>
          </div>
        ) : <AdEmpty icon={<Prohibit />} title="لا حكمَ مكتوب" desc="الحفظُ يحتاج حكمًا واحدًا على الأقلّ: ماذا يفعل في حالٍ بعينها." />}
        <span className="ad-wblks-add"><AdButton variant="fill" icon={<Plus />} onClick={add}>حكمٌ جديد</AdButton></span>
        <div className="form-grid">
          <Textarea className="form-full" label="ما لا يفعله أبدًا" icon={<ListBullets />} innerIcon={<ChatText />} rows={8}
            helper="محظورٌ في كلّ سطر، أيًّا كان السؤال" placeholder="محظورٌ في كلّ سطر"
            value={form.prohibitions} onChange={(e) => set("prohibitions", e.target.value)} error={DIGITS.test(form.prohibitions) ? DIGIT_ERR : undefined} optional />
        </div>
      </FormSection>

      <FormSection id="asks" icon={<ChatText />} title="أسئلة شاشته الفارغة" sub="تظهر في المعاينة كما يراها الزائر">
        <div className="form-grid">
          <Textarea className="form-full" label="الأسئلة المقترحة" icon={<Question />} innerIcon={<ChatText />} rows={Math.max(4, asks + 1)} placeholder="سؤالٌ في كلّ سطر"
            value={form.suggestedQuestions} onChange={(e) => set("suggestedQuestions", e.target.value)} optional />
          <Field label="كم يُعرض منها" icon={<Question />} innerIcon={<PencilSimple />} placeholder="4" type="number" min={0} max={asks} charset="digits"
            value={String(form.shownQuestions)} onChange={(e) => set("shownQuestions", Number(e.target.value) || 0)} helper={`المكتوب منها ${asks}`} />
        </div>
      </FormSection>
    </>
  );

  const measuring = (
    <>
      {/* فعلا القياس في رأس قسمه كأفعال الأقسام كلّها (محمد ٢٠٢٦-١١-١٣: «مكانُهما غريب» فوق النتائج)، والنتائجُ سطورٌ تُقرأ: الجوابُ يُفتح
          في سطره نفسه بلا لوحٍ مدوّر — القطعةُ تُفتح لوحًا حين تُحرَّر، وهذه لا تُحرَّر */}
      <FormSection id="suite" icon={<Gauge />} title="قِسه قبل أن تحفظ" sub="ثمانيةُ أسئلةٍ ثابتة، كلٌّ منها كسر شيئًا مرّةً أو يحرس حكمًا"
        act={<>
          <AdButton variant="soft" size="sm" icon={<Gauge />} onClick={() => measure(false)} busy={suiting}>اسأله الثمانية</AdButton>
          <AdButton variant="line" size="sm" icon={<ArrowCounterClockwise />} onClick={() => measure(true)} busy={suiting} held={!dirty}>قارِنه بالقائم</AdButton>
        </>}>
        {suite ? (
          <div className="ad-wblks ad-dbp-suite">
            {PROBE_SET.map((p, i) => {
              const a = suite.find((x) => x.id === p.id);
              return (
                <div key={p.id} className="ad-wblk-slot">
                  <WorkBlock n={i + 1} title={p.question} sub={`يُراقَب: ${p.watch}`} warn={a && !a.ok ? "لم يُجب" : undefined}
                    open={suiteOpen === p.id} onToggle={() => setSuiteOpen(suiteOpen === p.id ? null : p.id)} verb={{ label: "جوابه", icon: <ChatText /> }}>
                    <dl className="ad-dbp-ans">
                      {a?.live ? <><dt>القائم</dt><dd>{a.live}</dd></> : null}
                      <dt>{a?.live ? "المسوّدة" : "جوابه"}</dt>
                      <dd data-tone={a?.ok ? undefined : "bad"}>{a?.ok ? a.answer : a?.message ?? "لم يُسأل"}</dd>
                    </dl>
                  </WorkBlock>
                </div>
              );
            })}
          </div>
        ) : <AdEmpty icon={<Gauge />} title={suiting ? "يُسأل الآن" : "لم يُقس بعد"} desc="تُسأل بالمسوّدة على معرفته الحيّة، ولا تُسجَّل ولا تُحسب من سقف الزوّار." />}
      </FormSection>

      <FormSection id="versions" icon={<ClockCounterClockwise />} title="نسخُه السابقة" sub="لقطةٌ عند كلّ حفظ، والأحدثُ أوّلًا">
        {!historyReady ? (
          <AdNote tone="warn" title="الرجعةُ لم تُفتح بعد">سجلُّ النسخ ينتظر تطبيقَ ترحيله. والتحريرُ يعمل كما هو، غير أنّ تعديلَ اليوم يمحو سابقَه بلا رجعة.</AdNote>
        ) : history.length ? (
          <AdLog<PersonaVersion> bare items={history} at={(v) => v.at} idOf={(v) => String(v.id)} event={versionEvent} noun={AR_VERSION} now={serverNow}
            empty={{ title: "لا نسخةَ بعد", text: "تُؤخذ اللقطةُ الأولى عند أوّل حفظٍ من الآن." }} />
        ) : <AdEmpty icon={<ClockCounterClockwise />} title="لا نسخةَ بعد" desc="تُؤخذ اللقطةُ الأولى عند أوّل حفظٍ من الآن." />}
      </FormSection>
    </>
  );

  const draft: DeeboStageDraft = { persona: form, name: viewerName, seed };
  const stage = <StageFrame src="/frame/deebo" kind="deebo" payload={draft} title="ديبو كما يراه الزائر، بالشخصية التي تكتبها" />;

  return (
    <>
      <WorkRoom look="b" path="/dashboard/deebo/persona" title="شخصية ديبو" commit={commit} stage={stage} stageTitle="حادِثه بالمسوّدة قبل أن تحفظ" lead={lead}
        panes={[{ key: "write", label: "الشخصية", node: writing }, { key: "measure", label: "القياس والنسخ", node: measuring }]} />
      <AdConfirm open={!!toRestore} onClose={() => setToRestore(null)} tone="warning" icon={<ArrowCounterClockwise />} title="ترجع شخصيّتُه إلى هذه النسخة؟"
        text={toRestore ? `ما يقوله ديبو للناس يصير كلامَ نسخة ${fmtStamp(toRestore.at)} في اللحظة. ونسختُه القائمةُ تُحفظ في السجلّ، فيُرجَع عنها.` : undefined}
        confirmLabel="أعِدها" loading={restoring} onConfirm={() => toRestore && restore(toRestore)} />
      {leave}
    </>
  );
}
