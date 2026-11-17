"use client";

/**
 * **غرفةُ البيانات** على قالب «مساحة العمل» (المنضدة، ٢٠٢٦-١١-١٣) — السلوكُ سلوكُ `dashboard/statements/StatementsView.tsx` حرفًا: عنوانٌ
 * ومتنٌ في مربّعٍ واحد (كلُّ سطرٍ فقرة، وثلاثةُ أزرارٍ تجعل الأسطرَ المحدّدةَ قائمةً نقطيّةً أو مرقّمةً أو بنودًا، وEnter في سطر قائمةٍ يبدأ
 * عنصرَها التالي، والأرقامُ بالإنجليزيّة وحدها)، والتوقيعُ، ومعاينةٌ حيّةٌ بالرسّام الذي يُنزَّل به (`lib/statements/paper.ts`)، و«إصدار
 * وتنزيل» يرقّمه ويحفظه، والسجلُّ يُعاد منه التنزيلُ أو يُنسخ إلى المحرّر.
 *
 * والشكلُ: لوحا عمل — «البيان» (الأقسام والحقول) و«الصادرة» (سجلُّ الأحداث `AdLog`) — والمعاينةُ صفحاتُ البيان في المنضدة بجانبهما،
 * وفي الضيّق موضعٌ ثالثٌ في المبدّل. وكان: بطاقةُ محرّرٍ ومعاينةٌ بجانبها، ثمّ بطاقةُ السجلّ تحتهما.
 */
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { Select, Textarea, overBy } from "@adeeb/design-system";
import { Article, ClockCounterClockwise, Copy, Files, ListBullets, ListDashes, ListNumbers, SealCheck, TextAlignRight, UserCircle } from "@phosphor-icons/react";
import { DownloadSimple } from "@/app/_components/glyphs";
import { STATEMENT_BODY_MAX, STATEMENT_TITLE_MAX, blocksToEditorText, countPages, downloadStatement, latinDigits, lineKind, renderStatement, renumberText, textToBlocks, type Block, type StatementDoc } from "@/lib/statements/paper";
import type { ArForms } from "@/lib/arabicCount";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { issueStatement } from "@/app/dashboard/statements/actions";
import type { IssuedStatement } from "@/app/dashboard/statements/data";
import { AdActs, AdButton, AdEmpty, AdNote } from "../primitives";
import { FormSection } from "../form";
import { WorkRoom, useLeaveGuard } from "../workspace";
import { AdLog, type AdLogEvent } from "../log";

const SIGNERS: { value: StatementDoc["signers"]; label: string }[] = [
  { value: "president", label: "رئيس أدِيب" },
  { value: "ceo", label: "الرئيس التنفيذي" },
  { value: "both", label: "كلاهما" },
];
const AR_STATEMENT: ArForms = ["بيانٌ واحد", "بيانان", "بيانات", "بيانًا"];

/** نسبةُ رسم المعاينة من مقاس القالب: خفيفةٌ على الجهاز، وتُقرأ واضحة. */
const PREVIEW_K = 0.42;
/** وقفةُ الكتابة قبل إعادة رسم المعاينة. */
const PREVIEW_WAIT = 650;

const pagesWord = (n: number) => (n === 1 ? "صفحة واحدة" : n === 2 ? "صفحتان" : `${n} صفحات`);

/** أزرارُ القوائم: ما تكتبه قبل السطر، واسمُه، وأيقونتُه. */
const LISTS: { kind: Exclude<Block["kind"], "p">; label: string; mark: string; icon: React.ReactNode }[] = [
  { kind: "bullet", label: "قائمة نقطية", mark: "• ", icon: <ListBullets /> },
  { kind: "number", label: "قائمة مرقّمة", mark: "1. ", icon: <ListNumbers /> },
  { kind: "item", label: "بنود: أولًا، ثانيًا", mark: "أولًا: ", icon: <ListDashes /> },
];
const markOf = (kind: Block["kind"]) => LISTS.find((l) => l.kind === kind)?.mark ?? "";

export function StatementsRoom({ signers, statements, error, now }: {
  signers: StatementDoc["names"]; statements: IssuedStatement[]; error: string | null; now: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [who, setWho] = useState<StatementDoc["signers"]>("president");
  const [pages, setPages] = useState<string[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [busy, start] = useTransition();
  const [fetching, setFetching] = useState<number | null>(null);
  const seq = useRef(0);
  const urls = useRef<string[]>([]);
  // مربّعُ المتن: مكوّنُ المكتبة لا يمرّر `ref`، فيُقرأ من حاويه
  const bodyRef = useRef<HTMLDivElement>(null);
  const area = () => bodyRef.current?.querySelector("textarea") ?? null;

  const plain: Block[] = textToBlocks(text);
  const doc: StatementDoc = { title, blocks: plain, signers: who, names: signers };
  const ready = title.trim().length >= 2 && plain.some((b) => b.text.trim().length >= 2)
    && !overBy(title, STATEMENT_TITLE_MAX) && !overBy(text, STATEMENT_BODY_MAX);
  const docKey = JSON.stringify([title, plain, who]);
  // ما كُتب ولم يصدر يُحرَس عند المغادرة (قالبُ المنضدة: كانت الغرفةُ تُغادَر بمسوّدتها بلا كلمة)
  const dirty = title.trim().length > 0 || text.trim().length > 0;
  const leave = useLeaveGuard(dirty && !busy);

  // المعاينةُ تُعاد بعد وقفةٍ في الكتابة، والأحدثُ يغلب ما سبقه
  useEffect(() => {
    const mine = ++seq.current;
    const [t, b, w] = JSON.parse(docKey) as [string, Block[], StatementDoc["signers"]];
    const timer = window.setTimeout(async () => {
      setDrawing(true);
      try {
        const blobs = await renderStatement({ title: t, blocks: b, signers: w, names: signers }, { k: PREVIEW_K });
        if (mine !== seq.current) return;
        urls.current.forEach((u) => URL.revokeObjectURL(u));
        urls.current = blobs.map((x) => URL.createObjectURL(x));
        setPages(urls.current);
      } catch (e) {
        // معاينةٌ فاتت لا توقف المحرّر، وتُقال في الطرفيّة لمن يتتبّعها
        console.error("[statements] preview", e);
      } finally {
        if (mine === seq.current) setDrawing(false);
      }
    }, PREVIEW_WAIT);
    return () => window.clearTimeout(timer);
  }, [docKey, signers]);

  // عناوينُ الصور تُحرَّر حين تُغلق الغرفة
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  /** يكتب في المربّع ويضع المؤشّرَ حيث يُراد — **في الحال** (`flushSync`): لو انتظر الإطارَ التالي لوقع حرفٌ كُتب بسرعةٍ بعد Enter. */
  const write = (next: string, caret: number) => {
    flushSync(() => setText(next));
    const ta = area();
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(caret, caret);
  };

  /** بدايةُ السطر الذي فيه الموضع `at`، ونهايتُه. */
  const lineAt = (value: string, at: number) => {
    const s = value.lastIndexOf("\n", at - 1) + 1;
    const nl = value.indexOf("\n", at);
    return { start: s, end: nl === -1 ? value.length : nl };
  };

  // زرُّ القائمة: يجعل الأسطرَ المحدّدةَ عناصرَ فيها، أو يعيدها فقراتٍ إن كانت كلُّها منها
  const toggleList = (kind: Exclude<Block["kind"], "p">) => {
    const ta = area();
    if (!ta) return;
    const { selectionStart: a, selectionEnd: b, value } = ta;
    const s = lineAt(value, a).start;
    const end = lineAt(value, b).end;
    const seg = value.slice(s, end).split("\n");
    const all = seg.every((l) => lineKind(l).kind === kind);
    const next = seg.map((l) => (all ? lineKind(l).rest : markOf(kind) + lineKind(l).rest)).join("\n");
    const out = renumberText(value.slice(0, s) + next + value.slice(end));
    // المؤشّرُ آخرَ السطر الأخير المحدَّد **بعدِّ الأسطر لا بطول ما بعده**: إعادةُ الترقيم تغيّر علاماتِ ما تحته («أولًا» ← «ثانيًا»)
    // فيقع القياسُ من الآخر في سطرٍ آخر، والضغطةُ التالية تقلب غيرَ السطر المقصود (كان في الغرفة القديمة أيضًا، المراجع ٢٠٢٦-١١-١٣)
    const row = value.slice(0, end).split("\n").length;
    write(out, out.split("\n").slice(0, row).join("\n").length);
  };

  // Enter في سطرِ قائمة: عنصرٌ تالٍ بعلامته، أو نهايةُ القائمة إن كان العنصرُ فارغًا
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    const { selectionStart: a, selectionEnd: b, value } = e.currentTarget;
    if (a !== b) return;
    const { start: s, end } = lineAt(value, a);
    const { kind, rest } = lineKind(value.slice(s, end));
    if (kind === "p") return;
    e.preventDefault();
    if (!rest.trim()) {
      write(renumberText(value.slice(0, s) + value.slice(end)), s);
      return;
    }
    const out = renumberText(value.slice(0, a) + "\n" + markOf(kind) + value.slice(a));
    const row = value.slice(0, a).split("\n").length;
    const lines = out.split("\n");
    const before = lines.slice(0, row).join("\n").length + 1;
    const line = lines[row] ?? "";
    write(out, before + (line.length - lineKind(line).rest.length));
  };

  /** الأرقامُ والرموزُ بالإنجليزيّة وحدها (قرار المالك): ما كُتب بالهنديّة يُردّ في الحال، والمؤشّرُ يعود إلى موضعه. */
  const typed = (el: HTMLTextAreaElement, set: (v: string) => void) => {
    const raw = el.value;
    const fixed = latinDigits(raw);
    if (fixed === raw) { set(raw); return; }
    const { selectionStart: a, selectionEnd: b } = el;
    flushSync(() => set(fixed));
    el.setSelectionRange(a, b);
  };

  // لوحُ العمل الظاهر يُرفع إلى «البيان» حين يُنسخ صادرٌ إليه (كان المحرّرُ والسجلُّ في صفحةٍ واحدة فيُمرَّر إليه)
  const [board, setBoard] = useState<string | null>(null);

  // وتعذّرُ الجلب يمنع الإصدار: الموقّعان منه، فبيانٌ بلا اسمَيهما لا يخرج (كانت الغرفةُ تُخفي المحرّرَ كلَّه حينها)
  const issue = () => {
    if (!ready || error) return;
    start(async () => {
      const clean = { ...doc, title: title.trim(), blocks: plain.filter((b) => b.text.trim()) };
      const n = await countPages(clean);
      const r = await issueStatement({ ...clean, pages: n });
      if (!r.ok || !r.number) { toast.error(r.message); return; }
      await downloadStatement(clean, r.number);
      toast.success(`صدر البيان ${r.number}.`);
      setTitle("");
      setText("");
      router.refresh();
    });
  };

  const redownload = async (s: IssuedStatement) => {
    setFetching(s.id);
    try { await downloadStatement(s, s.number); } catch { toast.error("تعذّر رسم البيان."); }
    setFetching(null);
  };

  const copyToEditor = (s: IssuedStatement) => {
    setTitle(s.title);
    setText(blocksToEditorText(s.blocks));
    setWho(s.signers);
    setBoard("write");
    toast.info("نُسخ البيان إلى المحرّر.");
  };

  const event = (s: IssuedStatement): AdLogEvent => ({
    icon: <SealCheck />,
    title: s.title,
    meta: [
      { icon: <Files />, text: `${s.number}، ${pagesWord(s.pages)}` },
      ...(s.issuerName ? [{ icon: <UserCircle />, text: `${s.issuerFemale ? "أصدرته" : "أصدره"} ${s.issuerName}` }] : []),
    ],
    acts: (
      <AdActs inRow
        primary={{ label: "تنزيل", icon: <DownloadSimple />, busy: fetching === s.id, onClick: () => void redownload(s) }}
        ops={[{ key: "copy", label: "نسخ إلى المحرّر", icon: <Copy />, onClick: () => copyToEditor(s) }]} />
    ),
  });

  const writePane = (
    <>
      {error ? <AdNote tone="bad">{error}</AdNote> : null}
      <FormSection icon={<Article />} title="العنوان" mark="required">
        <div className="form-grid">
          <Textarea className="form-full" label="العنوان" icon={<Article />} innerIcon={<Article />} placeholder="بيان تكليف" rows={2} value={title}
            onChange={(e) => typed(e.target, (v) => setTitle(v.replace(/\n/g, " ")))} count={{ max: STATEMENT_TITLE_MAX }} required />
        </div>
      </FormSection>
      <FormSection icon={<TextAlignRight />} title="المتن" mark="required" sub="كلُّ سطرٍ فقرة. حدّد أسطرًا ثمّ اختر شكل القائمة، وابدأ السطرَ بـ«- » لقائمةٍ نقطيّة">
        <div ref={bodyRef} className="form-grid">
          <Textarea className="form-full" label="المتن" icon={<TextAlignRight />} innerIcon={<TextAlignRight />} rows={14}
            placeholder="حرصًا من نادي أدِيب على تنظيم أعماله، فقد قرّر المجلس الإداري ما يلي:" value={text}
            onChange={(e) => typed(e.target, setText)} onKeyDown={onKey} onBlur={() => setText((t) => renumberText(t))}
            count={{ max: STATEMENT_BODY_MAX }} required />
          {/* `onMouseDown` على الشريط يمنع المربّعَ من فقد تحديده قبل أن يقرأه الزرّ (يصعد إليه من كلّ زرّ) */}
          <div className="ad-stm-tools form-full" role="toolbar" aria-label="القوائم" onMouseDown={(e) => e.preventDefault()}>
            {LISTS.map((l) => (
              <AdButton key={l.kind} variant="line" size="sm" icon={l.icon} onClick={() => toggleList(l.kind)}>{l.label}</AdButton>
            ))}
          </div>
        </div>
      </FormSection>
      <FormSection icon={<SealCheck />} title="التوقيع">
        <div className="form-grid">
          <Select className="form-full" label="يوقّعه" icon={<SealCheck />} options={SIGNERS} value={who} onValueChange={(v) => setWho(v as StatementDoc["signers"])} />
        </div>
      </FormSection>
    </>
  );

  const logPane = (
    <FormSection icon={<ClockCounterClockwise />} title="البيانات الصادرة" sub="تنزيلُها من جديد، أو نسخُها إلى المحرّر ليُبنى عليها بيانٌ آخر">
      {statements.length ? (
        <AdLog<IssuedStatement> bare items={statements} at={(s) => s.issuedAt} idOf={(s) => String(s.id)} event={event} noun={AR_STATEMENT} now={now} />
      ) : <AdEmpty icon={<ClockCounterClockwise />} title="لم يصدر بيانٌ بعد" desc="ما تصدره يُرقَّم ويُحفظ هنا، فيُنزَّل منه متى شئت." />}
    </FormSection>
  );

  const stage = pages.length ? (
    <div className="ad-stm-pages" data-drawing={drawing || undefined} aria-live="polite">
      {pages.map((src, i) => (
        <Fragment key={src}>
          {/* **فاصلُ الصفحات** (محمد ٢٠٢٦-١١-١٤): شريطٌ من أرض البوّابة بين كلّ صفحتين، فيُرى أين تنتهي الورقةُ وتبدأ التي بعدها. وبلا رقم:
              كلُّ صفحةٍ تحمل في قاعها «الصفحة 1 من 4» مطبوعةً، فالرقمُ على الشريط تكرارٌ تحتها مباشرة */}
          {i ? <div className="ad-stm-break" aria-hidden /> : null}
          {/* eslint-disable-next-line @next/next/no-img-element -- صورةٌ مرسومةٌ في المتصفّح (blob)، لا ملفٌّ يُحسَّن */}
          <img src={src} alt={`الصفحة ${i + 1}`} className="ad-stm-page" />
        </Fragment>
      ))}
    </div>
  ) : <AdEmpty icon={<Files />} title="تُرسم المعاينة" desc="صفحاتُ البيان كما ستُنزَّل." />;

  return (
    <>
    {/* نافذةُ «تغادر قبل الحفظ؟» تُرسم هنا: الحارسُ يمسك النقرةَ على الرابط، وبلا نافذته كان يمسكها بلا كلمة فلا يخرج المرءُ أبدًا (المراجع ٢٠٢٦-١١-١٣) */}
    {leave}
    <WorkRoom look="b" path="/dashboard/statements" title="البيانات"
      commit={{ primary: { label: "إصدار وتنزيل", icon: <DownloadSimple />, onClick: issue, busy, held: !ready || !!error }, cancelHref: "/dashboard", dirty }}
      stage={stage} stageTitle={pages.length ? `المعاينة، ${pagesWord(pages.length)}` : "المعاينة"}
      board={board} onBoard={setBoard}
      panes={[{ key: "write", label: "البيان", node: writePane }, { key: "log", label: "الصادرة", node: logPane }]} />
    </>
  );
}
