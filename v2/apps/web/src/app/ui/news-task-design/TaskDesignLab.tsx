"use client";

import { useState } from "react";
import { Badge, Button, Container, Segmented } from "@adeeb/design-system";
import { CalendarBlank, ChatCircleDots, Feather, PaperPlaneTilt, TextAlignLeft } from "@phosphor-icons/react";
import { ArrowUUpLeft, Check, Plus } from "@/app/_components/glyphs";

export type Seed = { title: string; lead: string; chapters: { heading: string; body: string }[] };
type Ch = { heading: string; body: string };
type State = "open" | "returned" | "submitted";
type Msg = { from: "chief" | "me"; kind?: "assign" | "return"; text: string };

const CHIEF = "محمد المطر";
const ME = "ريم الحسن";
const DUE = "قبل 9:30 مساءً اليوم";
const ACT = "رحلتك في عالم التصميم";

const THREAD: Msg[] = [
  { from: "chief", kind: "assign", text: "ركّزي على تفاعل الحضور، ويكفي ثلاثة فصول." },
  { from: "me", text: "هل أذكر أسماء المدرّبين؟" },
  { from: "chief", text: "نعم، اذكريهم في الفصل الأوّل." },
];
const RETURN: Msg = { from: "chief", kind: "return", text: "الفصل الثاني يحتاج أمثلةً ممّا صمّمه المشاركون." };

const two = (i: number) => String(i + 1).padStart(2, "0");

/* ── أجزاءٌ مشتركة ── */
function Messages({ list, compact }: { list: Msg[]; compact?: boolean }) {
  const shown = compact ? list.slice(-1) : list;
  return (
    <div className="tk-msgs">
      {shown.map((m, i) => (
        <div key={i} className="tk-msg" data-me={m.from === "me" || undefined} data-kind={m.kind}>
          <b>{m.from === "chief" ? CHIEF : "أنتِ"}{m.kind === "assign" ? "، مع التكليف" : m.kind === "return" ? "، أعاده إليكِ" : ""}</b>
          <p>{m.text}</p>
        </div>
      ))}
    </div>
  );
}
function Reply() {
  return (
    <div className="tk-reply">
      <input placeholder="اكتبي سؤالًا أو ردًّا…" aria-label="رسالة إلى رئيس التحرير" />
      <button type="button" aria-label="أرسِل"><PaperPlaneTilt size={18} /></button>
    </div>
  );
}

/* ══ (أ) الشُّرفة ══════════════════════════════════════════════════════
   رأسُ المهمّة لوحٌ كحليٌّ منقوشٌ كرأس الخبر، وآخرُ رسالةٍ من رئيس التحرير تتدلّى منه
   كخانة التعليق من شريطها. والفصولُ تُكتب في لغة الخبر نفسها: رأسُ كلّ فصلٍ لوحٌ كحليٌّ
   برقمه الذائب، وعنوانُه يُكتب في اللوح، ومتنُه تحته بلا إطار حقل. */
function Ledge({ title, chs, setChs, lead, setLead, state, thread, onSubmit }: Body) {
  const [open, setOpen] = useState(false);
  const locked = state === "submitted";
  return (
    <div className="tk-a">
      <div className="tk-a-tab"><span>→ مهامّي</span></div>
      <section className="tk-a-panel">
        <div className="tk-a-kick">
          <span className="tk-glass"><Feather size={14} aria-hidden />المتن</span>
          {state !== "submitted" ? <span className="tk-glass"><CalendarBlank size={14} aria-hidden />{DUE}</span> : <span className="tk-glass"><Check size={14} aria-hidden />سلّمتِه</span>}
        </div>
        <h1 className="tk-a-title">{title}</h1>
        <p className="tk-a-sub">كلّفكِ {CHIEF}، عن فعاليّة «{ACT}»</p>
      </section>
      <section className="tk-a-hang" data-kind={state === "returned" ? "return" : undefined}>
        <Messages list={thread} compact={!open} />
        <div className="tk-a-hang-foot">
          <button type="button" className="tk-link" onClick={() => setOpen(!open)}>
            <ChatCircleDots size={16} aria-hidden />{open ? "أخفِ المحادثة" : `المحادثة كاملة (${thread.length})`}
          </button>
        </div>
        {open && !locked ? <Reply /> : null}
      </section>

      <div className="tk-a-lead">
        <p className="tk-a-label"><TextAlignLeft size={16} aria-hidden />المدخل</p>
        <textarea className="tk-text" value={lead} readOnly={locked} onChange={(e) => setLead(e.target.value)} placeholder="الفقرة التي يبدأ بها الخبر" />
      </div>
      {chs.map((c, i) => (
        <section key={i} className="tk-a-ch">
          <div className="tk-a-plate">
            <span className="tk-a-n" aria-hidden>{two(i)}</span>
            <input value={c.heading} readOnly={locked} placeholder="عنوان الفصل" aria-label={`عنوان الفصل ${i + 1}`}
              onChange={(e) => setChs(chs.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)))} />
          </div>
          <textarea className="tk-text" value={c.body} readOnly={locked} placeholder="متن الفصل" aria-label={`متن الفصل ${i + 1}`}
            onChange={(e) => setChs(chs.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} />
        </section>
      ))}
      {locked ? null : <button type="button" className="tk-add" onClick={() => setChs([...chs, { heading: "", body: "" }])}><Plus size={18} aria-hidden />أضيفي فصلًا</button>}
      <Submit state={state} onSubmit={onSubmit} />
    </div>
  );
}

/* ══ (ب) الورقة ══════════════════════════════════════════════════════
   ورقةٌ بيضاء واحدةٌ يسيل فيها الخبر كما سيُقرأ: لا كروت ولا ألواح، والعناوينُ بخطّ العناوين
   الكبير، والأرقامُ في الهامش. والمهمّةُ لسانٌ كحليٌّ فوق الورقة، والمحادثةُ حاشيةٌ في الهامش
   (على الجوّال: ورقةٌ لاصقةٌ في رأس الصفحة). */
function Sheet({ title, chs, setChs, lead, setLead, state, thread, onSubmit }: Body) {
  const locked = state === "submitted";
  return (
    <div className="tk-b">
      <div className="tk-b-tab">
        <span><Feather size={15} aria-hidden />المتن</span>
        <span>{state === "submitted" ? "سلّمتِه" : DUE}</span>
      </div>
      <div className="tk-b-grid">
        <article className="tk-b-sheet">
          <p className="tk-b-ctx">في خبر «{title}»، عن فعاليّة «{ACT}»</p>
          <textarea className="tk-text tk-b-lead" value={lead} readOnly={locked} onChange={(e) => setLead(e.target.value)} placeholder="ابدئي بالمدخل: الفقرة التي يُفتتح بها الخبر" aria-label="المدخل" />
          {chs.map((c, i) => (
            <section key={i} className="tk-b-ch">
              <span className="tk-b-n" aria-hidden>{two(i)}</span>
              <input className="tk-b-h" value={c.heading} readOnly={locked} placeholder="عنوان الفصل" aria-label={`عنوان الفصل ${i + 1}`}
                onChange={(e) => setChs(chs.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)))} />
              <textarea className="tk-text" value={c.body} readOnly={locked} placeholder="متن الفصل" aria-label={`متن الفصل ${i + 1}`}
                onChange={(e) => setChs(chs.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} />
            </section>
          ))}
          {locked ? null : <button type="button" className="tk-b-add" onClick={() => setChs([...chs, { heading: "", body: "" }])}><Plus size={16} aria-hidden />فصلٌ جديد</button>}
        </article>
        <aside className="tk-b-margin" data-kind={state === "returned" ? "return" : undefined}>
          <p className="tk-b-mh"><ChatCircleDots size={16} aria-hidden />مع {CHIEF}</p>
          <Messages list={thread} />
          {locked ? null : <Reply />}
        </aside>
      </div>
      <Submit state={state} onSubmit={onSubmit} />
    </div>
  );
}

/* ══ (ج) الخطوات ════════════════════════════════════════════════════
   فصلٌ واحدٌ في الشاشة: المدخلُ ثمّ كلُّ فصلٍ ثمّ «سلِّمي». شريطُ تقدّمٍ بأسماء الفصول،
   وآخرُ رسالةٍ من رئيس التحرير شريطٌ في الرأس. للجوّال أوّلًا: لا تمرير طويلٌ ولا ضياع. */
function Steps({ title, chs, setChs, lead, setLead, state, thread, onSubmit }: Body) {
  const [at, setAt] = useState(0);
  const locked = state === "submitted";
  const steps = ["المدخل", ...chs.map((c, i) => c.heading || `الفصل ${i + 1}`)];
  const last = at === steps.length - 1;
  const c = at > 0 ? chs[at - 1] : null;
  return (
    <div className="tk-c">
      <div className="tk-c-head">
        <p className="tk-c-ctx"><b>المتن</b> في «{title}»</p>
        <span className="tk-c-due">{state === "submitted" ? "سلّمتِه" : DUE}</span>
      </div>
      <div className="tk-c-note" data-kind={state === "returned" ? "return" : undefined}>
        <Messages list={thread} compact />
      </div>
      <ol className="tk-c-bar">
        {steps.map((s, i) => (
          <li key={i} data-on={i === at || undefined} data-done={i < at || undefined}>
            <button type="button" onClick={() => setAt(i)}><span className="tk-c-dot">{i < at ? <Check size={12} aria-hidden /> : i + 1}</span><span className="tk-c-s">{s}</span></button>
          </li>
        ))}
      </ol>
      <section className="tk-c-card">
        {c ? (
          <>
            <p className="tk-c-of">الفصل {at} من {chs.length}</p>
            <input className="tk-c-h" value={c.heading} readOnly={locked} placeholder="عنوان الفصل" aria-label="عنوان الفصل"
              onChange={(e) => setChs(chs.map((x, j) => (j === at - 1 ? { ...x, heading: e.target.value } : x)))} />
            <textarea className="tk-text tk-c-t" value={c.body} readOnly={locked} placeholder="متن الفصل" aria-label="متن الفصل"
              onChange={(e) => setChs(chs.map((x, j) => (j === at - 1 ? { ...x, body: e.target.value } : x)))} />
          </>
        ) : (
          <>
            <p className="tk-c-of">قبل الفصول</p>
            <p className="tk-c-h tk-c-h-fixed">المدخل</p>
            <textarea className="tk-text tk-c-t" value={lead} readOnly={locked} placeholder="الفقرة التي يبدأ بها الخبر" aria-label="المدخل" onChange={(e) => setLead(e.target.value)} />
          </>
        )}
      </section>
      <div className="tk-c-nav">
        <Button variant="ghost" size="md" disabled={at === 0} onClick={() => setAt(at - 1)}>السابق</Button>
        {last ? (
          state === "submitted" ? <Button variant="ghost" size="md" disabled><Check size={18} />سلّمتِه</Button>
            : <Button variant="primary" size="md" onClick={onSubmit}><PaperPlaneTilt size={18} />سلِّمي</Button>
        ) : <Button variant="primary" size="md" onClick={() => setAt(at + 1)}>التالي</Button>}
      </div>
    </div>
  );
}

function Submit({ state, onSubmit }: { state: State; onSubmit: () => void }) {
  return state === "submitted" ? (
    <p className="tk-done"><Check size={18} aria-hidden />سلّمتِه، وهو عند {CHIEF}. سيصلكِ إشعارٌ إن أعاده أو نشره.</p>
  ) : (
    <div className="tk-submit"><Button variant="primary" size="md" onClick={onSubmit}><PaperPlaneTilt size={18} />{state === "returned" ? "سلِّميه من جديد" : "سلِّمي"}</Button></div>
  );
}

type Body = { title: string; chs: Ch[]; setChs: (c: Ch[]) => void; lead: string; setLead: (v: string) => void; state: State; thread: Msg[]; onSubmit: () => void };

export function TaskDesignLab({ seed }: { seed: Seed }) {
  const [dir, setDir] = useState("a");
  const [state, setState] = useState<State>("open");
  const [w, setW] = useState("375");
  const [lead, setLead] = useState(seed.lead);
  const [chs, setChs] = useState<Ch[]>(seed.chapters.slice(0, 3));
  const thread = state === "returned" ? [...THREAD, RETURN] : THREAD;
  const body: Body = { title: seed.title, chs, setChs, lead, setLead, state, thread, onSubmit: () => setState("submitted") };
  return (
    <main className="py-12">
      <Container>
        <h1 className="font-display text-3xl font-black text-content">شاشة مهمّة الكاتب</h1>
        <p className="mt-2 text-content-muted">ما تراه {ME} حين تفتح مهمّتها. المحتوى من خبرٍ منشور، والحقول تُكتب.</p>
        <div className="tk-ctl">
          <Segmented items={[{ value: "a", label: "(أ) الشُّرفة" }, { value: "b", label: "(ب) الورقة" }, { value: "c", label: "(ج) الخطوات" }]} value={dir} onValueChange={setDir} aria-label="التوجّه" />
          <Segmented items={[{ value: "open", label: "تعمل" }, { value: "returned", label: "أُعيد إليها" }, { value: "submitted", label: "سلّمته" }]} value={state} onValueChange={(v) => setState(v as State)} aria-label="الحال" />
          <Segmented items={[{ value: "375", label: "375" }, { value: "1100", label: "1100" }]} value={w} onValueChange={setW} aria-label="العرض" />
        </div>
        <p className="tk-hint">{state === "returned" ? <><ArrowUUpLeft size={14} aria-hidden /> في حال «أُعيد إليها» تصير آخرُ رسالةٍ ملاحظةَ الإعادة.</> : <Badge tone="neutral" variant="outline">بوّابة أدِيب</Badge>}</p>
      </Container>
      <div className="tk-frame" style={{ maxWidth: Number(w) }}>
        {dir === "a" ? <Ledge {...body} /> : dir === "b" ? <Sheet {...body} /> : <Steps {...body} />}
      </div>
    </main>
  );
}
