"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardHeader, Segmented, Textarea } from "@adeeb/design-system";
import { Article, ClockCounterClockwise, Copy, ListBullets, ListDashes, ListNumbers, SealCheck, TextAlignRight } from "@phosphor-icons/react";
import { DownloadSimple } from "@/app/_components/glyphs";
import { fmtDate } from "@/lib/dates";
import { blocksToEditorText, countPages, downloadStatement, latinDigits, lineKind, renderStatement, renumberText, textToBlocks, type Block, type StatementDoc } from "@/lib/statements/paper";
import { useToast } from "../_components/ToastProvider";
import { issueStatement } from "./actions";
import type { IssuedStatement } from "./data";

const SIGNERS: { value: StatementDoc["signers"]; label: string }[] = [
  { value: "president", label: "رئيس أدِيب" },
  { value: "ceo", label: "الرئيس التنفيذي" },
  { value: "both", label: "كلاهما" },
];

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

/**
 * غرفةُ البيانات: المحرّرُ ومعاينتُه الحيّة جنبًا إلى جنب (تحت بعضهما في الجوّال)، ثمّ السجلّ.
 * المعاينةُ بالرسّام نفسه الذي يُنزَّل به البيان (`lib/statements/paper.ts`)، بنسبةٍ أصغر — فما يُرى هو ما يُنزَّل.
 *
 * **والمتنُ مربّعٌ واحد** كما يُكتب في الملاحظات (ردّ المالك الكتلَ المنفصلة: «صعبة في الاستخدام»): كلُّ سطرٍ فقرة،
 * وثلاثةُ أزرارٍ تجعل الأسطرَ المحدّدةَ قائمةً نقطيّة أو مرقّمة أو بنودًا («أولًا:»)، وتعيدها فقراتٍ إن ضُغطت ثانية.
 * وEnter في سطرِ قائمةٍ يبدأ العنصرَ التالي بعلامته، وEnter على عنصرٍ فارغ يُنهي القائمة، والترقيمُ يُعاد وحده.
 * ومن كتب «- » في أوّل السطر بدأ قائمةً نقطيّة.
 */
export function StatementsView({ signers, statements }: { signers: StatementDoc["names"]; statements: IssuedStatement[] }) {
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
  const editorRef = useRef<HTMLDivElement>(null);
  // مربّعُ المتن: مكوّنُ المكتبة لا يمرّر `ref`، فيُقرأ من حاويه
  const bodyRef = useRef<HTMLDivElement>(null);
  const area = () => bodyRef.current?.querySelector("textarea") ?? null;

  const plain: Block[] = textToBlocks(text);
  const doc: StatementDoc = { title, blocks: plain, signers: who, names: signers };
  const ready = title.trim().length >= 2 && plain.some((b) => b.text.trim().length >= 2);
  const docKey = JSON.stringify([title, plain, who]);

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

  /**
   * يكتب في المربّع ويضع المؤشّرَ حيث يُراد — **في الحال** (`flushSync`): لو انتظر الإطارَ التالي لوقع حرفٌ
   * كُتب بسرعةٍ بعد Enter في آخر المربّع، إذ ينقل المتصفّحُ المؤشّرَ إلى الآخر كلّما تغيّرت القيمة.
   */
  const write = (next: string, caret: number) => {
    flushSync(() => setText(next));
    const ta = area();
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(caret, caret);
  };

  /** بدايةُ السطر الذي فيه الموضع `at`، ونهايتُه. */
  const lineAt = (value: string, at: number) => {
    const start = value.lastIndexOf("\n", at - 1) + 1;
    const nl = value.indexOf("\n", at);
    return { start, end: nl === -1 ? value.length : nl };
  };

  // زرُّ القائمة: يجعل الأسطرَ المحدّدةَ عناصرَ فيها، أو يعيدها فقراتٍ إن كانت كلُّها منها
  const toggleList = (kind: Exclude<Block["kind"], "p">) => {
    const ta = area();
    if (!ta) return;
    const { selectionStart: a, selectionEnd: b, value } = ta;
    const start = lineAt(value, a).start;
    const end = lineAt(value, b).end;
    const seg = value.slice(start, end).split("\n");
    const all = seg.every((l) => lineKind(l).kind === kind);
    const next = seg.map((l) => (all ? lineKind(l).rest : markOf(kind) + lineKind(l).rest)).join("\n");
    const out = renumberText(value.slice(0, start) + next + value.slice(end));
    write(out, out.length - (value.length - end));
  };

  // Enter في سطرِ قائمة: عنصرٌ تالٍ بعلامته، أو نهايةُ القائمة إن كان العنصرُ فارغًا
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    const { selectionStart: a, selectionEnd: b, value } = e.currentTarget;
    if (a !== b) return;
    const { start, end } = lineAt(value, a);
    const { kind, rest } = lineKind(value.slice(start, end));
    if (kind === "p") return;
    e.preventDefault();
    if (!rest.trim()) {
      write(renumberText(value.slice(0, start) + value.slice(end)), start);
      return;
    }
    const out = renumberText(value.slice(0, a) + "\n" + markOf(kind) + value.slice(a));
    // المؤشّرُ بعد علامة السطر الجديد (وقد تغيّر طولُها بإعادة الترقيم)
    const row = value.slice(0, a).split("\n").length;
    const lines = out.split("\n");
    const before = lines.slice(0, row).join("\n").length + 1;
    const line = lines[row] ?? "";
    write(out, before + (line.length - lineKind(line).rest.length));
  };

  const reset = () => setText("");

  /**
   * الأرقامُ والرموزُ تُكتب بالإنجليزيّة وحدها (قرار المالك): ما كُتب بالهنديّة يُردّ في الحال. والطولُ لا يتغيّر،
   * فيُعاد المؤشّرُ إلى موضعه (لولاه لقفز إلى آخر الحقل كلّما تغيّرت قيمتُه من تحته).
   */
  const typed = (el: HTMLTextAreaElement, set: (v: string) => void) => {
    const raw = el.value;
    const fixed = latinDigits(raw);
    if (fixed === raw) { set(raw); return; }
    const { selectionStart: a, selectionEnd: b } = el;
    flushSync(() => set(fixed));
    el.setSelectionRange(a, b);
  };

  const issue = () => {
    if (!ready) return;
    start(async () => {
      const clean = { ...doc, title: title.trim(), blocks: plain.filter((b) => b.text.trim()) };
      const n = await countPages(clean);
      const r = await issueStatement({ ...clean, pages: n });
      if (!r.ok || !r.number) { toast.error(r.message); return; }
      await downloadStatement(clean, r.number);
      toast.success(`صدر البيان ${r.number}.`);
      reset();
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
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="stm">
      <div className="stm-work">
        <Card className="stm-editor">
          <div ref={editorRef} className="stm-form">
            <Textarea label="العنوان" icon={<Article />} innerIcon={<Article />} placeholder="بيان تكليف" rows={2} value={title}
              onChange={(e) => typed(e.target, (v) => setTitle(v.replace(/\n/g, " ")))} maxLength={120} required />

            <div ref={bodyRef} className="stm-body">
              <Textarea label="المتن" icon={<TextAlignRight />} innerIcon={<TextAlignRight />} rows={14}
                placeholder="حرصًا من نادي أدِيب على تنظيم أعماله، فقد قرّر المجلس الإداري ما يلي:" value={text}
                onChange={(e) => typed(e.target, setText)} onKeyDown={onKey} onBlur={() => setText((t) => renumberText(t))}
                maxLength={8000} required />
              <div className="stm-tools" role="toolbar" aria-label="القوائم">
                {LISTS.map((l) => (
                  // `onMouseDown` يمنع المربّعَ من فقد تحديده قبل أن يقرأه الزرّ
                  <Button key={l.kind} variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => toggleList(l.kind)}>{l.icon}{l.label}</Button>
                ))}
              </div>
            </div>

            <div className="stm-signers">
              <span className="fld-lbl"><span className="fld-lic" aria-hidden="true"><SealCheck /></span>التوقيع</span>
              <Segmented items={SIGNERS} value={who} onValueChange={(v) => setWho(v as StatementDoc["signers"])} aria-label="التوقيع" wide />
            </div>
            <Button variant="primary" size="lg" loading={busy} disabled={!ready} onClick={issue}><DownloadSimple />إصدار وتنزيل</Button>
          </div>
        </Card>

        <div className={`stm-preview${drawing ? " is-drawing" : ""}`} aria-live="polite">
          <span className="stm-preview-cap">{pages.length ? `المعاينة، ${pagesWord(pages.length)}` : "المعاينة"}</span>
          <div className="stm-pages">
            {pages.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- صورةٌ مرسومةٌ في المتصفّح (blob)، لا ملفٌّ يُحسَّن
              <img key={src} src={src} alt={`الصفحة ${i + 1}`} className="stm-page" />
            ))}
          </div>
        </div>
      </div>

      <Card className="stm-log">
        <CardHeader variant="soft" icon={<ClockCounterClockwise />} title="البيانات الصادرة"
          subtitle={statements.length ? `${statements.length} ${statements.length === 1 ? "بيان" : statements.length === 2 ? "بيانان" : "بيانات"}` : "لم يصدر بيانٌ بعد"} />
        {statements.length ? (
          <div className="stm-list">
            {statements.map((s) => (
              <div key={s.id} className="stm-item">
                <div className="stm-item-tx">
                  <span className="stm-item-head"><Badge size="sm">{s.number}</Badge><b>{s.title}</b></span>
                  <span className="stm-item-meta">{[fmtDate(s.issuedAt), s.issuerName ? `${s.issuerFemale ? "أصدرته" : "أصدره"} ${s.issuerName}` : null, pagesWord(s.pages)].filter(Boolean).join("، ")}</span>
                </div>
                <div className="stm-item-acts">
                  <Button variant="ghost" size="sm" onClick={() => copyToEditor(s)}><Copy />نسخ إلى المحرّر</Button>
                  <Button variant="ghost" size="sm" loading={fetching === s.id} onClick={() => redownload(s)}><DownloadSimple />تنزيل</Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
