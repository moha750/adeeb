"use client";

/**
 * **المحرّرُ المرئيّ** (`RichField`، قرارُ محمد ٢٠٢٦-١١-١٦: «أرى أن يُبنى المحرّر المرئي»): نصُّ المادّة يُكتب كما يُقرأ — العريضُ عريض،
 * والقائمةُ قائمة، والجدولُ جدول — بلا رموزٍ تُحفظ. كان حقلَ نصٍّ تُكتب فيه «-» و«1.» و«|» و«**»، ثمّ شريطًا يكتبها عنك.
 *
 * **يُبنى بلا مكتبة** (`contentEditable` وأوامر المتصفّح): المادّةُ لا تحتاج إلّا فقرةً وعريضًا وقائمتين وجدولًا، ومكتبةُ تحريرٍ كاملة تُثقل
 * الحزمة لقلّةٍ من الرئيسين. **واللصقُ والإفلاتُ نصٌّ خالص**: ما يأتي من واتساب أو Word يدخل فقراتٍ بلا تنسيق مصدره — وهي العلّةُ التي كانت تمنع المرئيّ.
 * **والحفظُ كما كان**: الحقلُ يقرأ النصَّ المحفوظ (`markupToBlocks`) ويعطي نصًّا (`blocksToMarkup`)، فلا يتغيّر في الخادم ولا القاعدة شيء،
 * وفتحُ مادّةٍ بلا تعديلٍ يعطي نصَّها حرفًا بحرف (جُرّب على موادّ الدستور والانتخابات كلّها). الشكلُ (`figure`) يُرى قطعةً باسمه لا تُحرَّر.
 * **وكلُّ فعلٍ من الشريط يمرّ بأوامر المتصفّح** (`execCommand`) لا بتعديل الرسم مباشرة: فيتراجع عنه ⌘Z كما يتراجع عن الكتابة.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ListBullets, ListNumbers, Rows, Table, TextB } from "@phosphor-icons/react";
import { Minus } from "@/app/_components/glyphs";
import { FieldMark } from "@adeeb/design-system";
import { blocksToMarkup, markupToBlocks } from "@/lib/regulations/edit";
import { latin } from "@/lib/regulations/text";
import type { RegBlock } from "@/lib/regulations/types";
import { AdButton } from "./primitives";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** «**كلمة**» عريضةً في الرسم */
const inline = (s: string) => esc(latin(s)).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
const EMPTY = "<p><br></p>";
const cellHtml = (s: string) => inline(s) || "<br>";

function tableHtml(head: string[], rows: string[][], mark = false): string {
  return `<table class="ad-rich-tbl"${mark ? ' data-new=""' : ""}><thead><tr>${head.map((h) => `<th>${cellHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${cellHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function toHtml(blocks: RegBlock[]): string {
  const html = blocks.map((b) => {
    if (b.kind === "para") return `<p>${inline(b.text)}</p>`;
    if (b.kind === "list") { const t = b.ordered ? "ol" : "ul"; return `<${t}>${b.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${t}>`; }
    if (b.kind === "table") return tableHtml(b.head, b.rows);
    return `<div class="ad-rich-fig" contenteditable="false" data-ref="${esc(b.ref)}" data-caption="${esc(latin(b.caption))}">شكل: ${esc(latin(b.caption))}</div>`;
  }).join("");
  // مادّةٌ تنتهي بجدولٍ أو شكل يبقى تحتها سطرٌ يُكتب فيه، والحقلُ الفارغ يبدأ بفقرة (لا بحرفٍ عارٍ في جذره)
  const last = blocks[blocks.length - 1];
  return !last ? EMPTY : last.kind === "table" || last.kind === "figure" ? html + EMPTY : html;
}

/** ما في الحرف: العريضُ بنجمتيه، وما سواه نصُّه (لا مائلَ ولا لونَ ولا حجم — لا تعرفها الأنظمة) */
function textOf(n: Node): string {
  // النجمتان المكتوبتان حرفًا تُفصلان بفاصلٍ خفيّ: لا تصيران عريضًا لم يُرَد (٥ ** ٣)
  if (n.nodeType === Node.TEXT_NODE) return (n.textContent ?? "").replace(/\s+/g, " ").replace(/\*\*/g, "*\u200b*");
  if (!(n instanceof HTMLElement)) return "";
  if (n.tagName === "BR") return " ";
  const inner = Array.from(n.childNodes).map(textOf).join("");
  const heavy = n.tagName === "B" || n.tagName === "STRONG" || Number(n.style.fontWeight) >= 600 || n.style.fontWeight === "bold";
  const t = inner.trim();
  if (!heavy || !t || /^\*\*.*\*\*$/.test(t)) return inner;
  // المسافةُ خارج النجمتين: «**كلمة** » لا «**كلمة **» (العارضُ لا يقرأ العريضَ إن لاصقت نجمتُه مسافة)
  return `${inner.match(/^\s*/)![0]}**${t}**${inner.match(/\s*$/)![0]}`;
}
const clean = (s: string) => s.replace(/\s+/g, " ").replace(/\*\*\s*\*\*/g, "").trim();
/** الخانةُ لا تحمل علامةَ الجدول نفسَها (تقسم الصفَّ عند الحفظ)، فتصير شبيهتَها العريضة: تُرى كما كُتبت */
const cell = (s: string) => clean(s).split("\u007c").join("\uFF5C");
/** ما يجري في السطر لا ما يبني كتلة: يُجمع المتجاورُ منه فقرةً واحدة (حرفٌ عارٍ ثمّ عريضٌ ثمّ حرف = فقرة، لا ثلاث) */
const INLINE = new Set(["B", "STRONG", "SPAN", "I", "EM", "U", "A", "FONT", "BR", "SMALL", "SUB", "SUP"]);

function toBlocks(root: HTMLElement): RegBlock[] {
  const out: RegBlock[] = [];
  const para = (t: string) => { const x = clean(t); if (x) out.push({ kind: "para", text: x }); };
  const walk = (from: Node) => {
    let run = "";
    const flush = () => { para(run); run = ""; };
    for (const n of Array.from(from.childNodes)) {
      if (!(n instanceof HTMLElement) || INLINE.has(n.tagName)) { run += textOf(n); continue; }
      flush();
      // المتصفّحُ قد يضع القائمةَ أو الجدولَ داخل فقرة (`<p><ol>`) حين يُحوَّل سطرٌ محدَّدٌ كلُّه: الحاملةُ كتلةً تُقرأ كتلَها
      if (!n.dataset.ref && n.tagName !== "TABLE" && n.querySelector(":scope > ul, :scope > ol, :scope > table, :scope > p, :scope > div")) walk(n);
      else if (n.tagName === "UL" || n.tagName === "OL") {
        const items = Array.from(n.querySelectorAll(":scope > li")).map((li) => clean(textOf(li))).filter(Boolean);
        if (items.length) out.push({ kind: "list", ordered: n.tagName === "OL", items });
      } else if (n.tagName === "TABLE") {
        const rows = Array.from(n.querySelectorAll("tr")).map((tr) => Array.from(tr.children).map((c) => cell(textOf(c))));
        if (rows.length) out.push({ kind: "table", head: rows[0], rows: rows.slice(1) });
      } else if (n.dataset.ref) out.push({ kind: "figure", ref: n.dataset.ref, caption: n.dataset.caption ?? "" });
      else para(textOf(n));
    }
    flush();
  };
  walk(root);
  return out;
}

const nodeOf = (n: Node | null | undefined) => (n instanceof Element ? n : n?.parentElement ?? null);
const caretIn = (el: Element, atEnd = false) => {
  const r = document.createRange(); r.selectNodeContents(el); r.collapse(!atEnd);
  const s = document.getSelection(); s?.removeAllRanges(); s?.addRange(r);
};
const state = (c: string) => { try { return document.queryCommandState(c); } catch { return false; } };

export function RichField({ label, icon, innerIcon, value, onChange, error, placeholder }: {
  label: string; icon: ReactNode; innerIcon: ReactNode; value: string; onChange: (markup: string) => void; error?: string; placeholder: string;
}) {
  const id = useId();
  const ed = useRef<HTMLDivElement>(null);
  /** آخرُ ما أعطاه الحقل: إن عاد إليه نصُّه لم يُرسم من جديد (فلا يقفز المؤشّر) */
  const last = useRef<string | null>(null);
  const [at, setAt] = useState({ table: false, head: false, single: false, bold: false, ul: false, ol: false });
  const [empty, setEmpty] = useState(!value.trim());
  const isEmpty = (el: HTMLElement) => !el.textContent?.trim() && !el.querySelector("table, [data-ref]");

  // يُرسم من النصّ حين يأتي من خارجه (فتحُ مادّة، إعادةُ ضبط)، لا حين يكتب صاحبُه
  useEffect(() => {
    const el = ed.current;
    if (!el || value === last.current) return;
    const p = value.trim() ? markupToBlocks(value) : { blocks: [] as RegBlock[] };
    el.innerHTML = "blocks" in p ? toHtml(p.blocks) : `<p>${esc(value)}</p>`;
    last.current = value;
    setEmpty(isEmpty(el));
  }, [value]);

  /** أين المؤشّر: في جدولٍ (ورأسِه، وصفِّه الوحيد) أم لا، وما المضغوطُ من الشريط */
  const sync = () => {
    const el = ed.current;
    const n = nodeOf(document.getSelection()?.anchorNode);
    if (!el || !n || !el.contains(n)) return;
    const c = n.closest("td, th");
    setAt({
      table: !!c, head: c?.tagName === "TH", single: !!c && (c.closest("table")?.querySelectorAll("tbody tr").length ?? 0) <= 1,
      bold: state("bold"), ul: state("insertUnorderedList"), ol: state("insertOrderedList"),
    });
  };
  useEffect(() => {
    document.addEventListener("selectionchange", sync);
    return () => document.removeEventListener("selectionchange", sync);
  });

  const emit = () => {
    const el = ed.current;
    if (!el) return;
    const markup = blocksToMarkup(toBlocks(el));
    last.current = markup;
    setEmpty(isEmpty(el));
    sync();
    onChange(markup);
  };

  const cmd = (name: string, arg?: string) => {
    ed.current?.focus();
    document.execCommand("defaultParagraphSeparator", false, "p");
    document.execCommand(name, false, arg);
    emit();
  };
  const cellAt = () => nodeOf(document.getSelection()?.anchorNode)?.closest<HTMLTableCellElement>("td, th") ?? null;
  const insertTable = () => cmd("insertHTML", tableHtml(["", ""], [["", ""]]) + EMPTY);

  /** يُعاد الجدولُ كلُّه بأمر الإدراج (فيُتراجع عنه)، والمؤشّرُ في الخانة المطلوبة من الجديد */
  const rebuild = (table: HTMLTableElement, head: string[], rows: string[][], focus: [row: number, col: number] | null) => {
    const r = document.createRange(); r.selectNode(table);
    const s = document.getSelection(); s?.removeAllRanges(); s?.addRange(r);
    if (!focus) { cmd("insertHTML", EMPTY); return; }
    cmd("insertHTML", tableHtml(head, rows, true));
    const t = ed.current?.querySelector<HTMLTableElement>("table[data-new]");
    if (!t) return;
    t.removeAttribute("data-new");
    const target = t.rows[focus[0]]?.cells[focus[1]];
    if (target) caretIn(target);
  };
  const grid = (table: HTMLTableElement) => Array.from(table.rows).map((tr) => Array.from(tr.cells).map((c) => cell(textOf(c))));
  const addRow = () => {
    const c = cellAt(); const tr = c?.closest("tr"); const table = c?.closest("table");
    if (!tr || !table) return;
    const [head, ...rows] = grid(table);
    const i = tr.rowIndex; // ٠ الرأس
    rows.splice(i, 0, head.map(() => ""));
    rebuild(table, head, rows, [i + 1, 0]);
  };
  const dropRow = () => {
    const c = cellAt(); const tr = c?.closest("tr"); const table = c?.closest("table");
    if (!c || !tr || !table || c.tagName === "TH") return;
    const [head, ...rows] = grid(table);
    // الصفُّ الوحيدُ لا يُحذف وحده: الجدولُ بلا صفٍّ لا يُقرأ، فالزرُّ يقول «احذف الجدول»
    if (rows.length <= 1) { rebuild(table, head, rows, null); return; }
    const i = tr.rowIndex - 1;
    rows.splice(i, 1);
    rebuild(table, head, rows, [Math.min(i, rows.length - 1) + 1, c.cellIndex]);
  };
  /** نصٌّ خالصٌ في موضع المؤشّر: سطرًا سطرًا بأوامر الكتابة لا بـ`insertHTML` (ذاك يُلبس المُدرَجَ أنماطَ ما حوله)، وفي الخانة سطرٌ واحد */
  const putText = (t: string) => {
    const lines = t.replace(/\r\n?/g, "\n").split("\n");
    ed.current?.focus();
    document.execCommand("defaultParagraphSeparator", false, "p");
    if (cellAt()) document.execCommand("insertText", false, lines.join(" ").replace(/\s+/g, " "));
    else lines.forEach((l, i) => { if (i) document.execCommand("insertParagraph"); if (l) document.execCommand("insertText", false, l); });
    emit();
  };

  return (
    <div className={`fld form-full ad-rich-fld${error ? " err" : ""}`}>
      <span className="fld-lbl" id={`${id}-l`}>
        <span className="fld-lic" aria-hidden="true">{icon}</span>
        {label}
        <FieldMark required />
      </span>
      <div className="fld-wrap">
        <span className="fld-iic" aria-hidden="true">{innerIcon}</span>
        <div ref={ed} className="fld-in fld-area ad-rich" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true"
          aria-labelledby={`${id}-l`} aria-required="true" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined}
          data-empty={empty || undefined} data-placeholder={placeholder}
          onInput={emit}
          onFocus={() => document.execCommand("defaultParagraphSeparator", false, "p")}
          onPaste={(e) => { e.preventDefault(); putText(e.clipboardData.getData("text/plain")); }}
          onDrop={(e) => {
            // الإفلاتُ كاللصق: نصٌّ خالص حيث أُفلت
            e.preventDefault();
            const t = e.dataTransfer.getData("text/plain");
            if (!t) return;
            const d = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
            const r = document.caretRangeFromPoint?.(e.clientX, e.clientY) ?? (() => {
              const p = d.caretPositionFromPoint?.(e.clientX, e.clientY);
              if (!p) return null;
              const x = document.createRange(); x.setStart(p.offsetNode, p.offset); return x;
            })();
            if (r) { const s = document.getSelection(); s?.removeAllRanges(); s?.addRange(r); }
            putText(t);
          }}
          onKeyDown={(e) => {
            // خانةُ الجدول سطرٌ واحد: Enter يذهب إلى الخانة التالية، وفي آخرها يفتح صفًّا. وTab إلى التالية — وفي آخرها يخرج من الحقل كعادته
            const c = cellAt();
            if (!c || e.nativeEvent.isComposing || (e.key !== "Enter" && e.key !== "Tab")) return;
            const cells = Array.from(c.closest("table")!.querySelectorAll("td, th"));
            const next = cells[cells.indexOf(c) + (e.shiftKey ? -1 : 1)];
            if (e.key === "Tab" && !next) return;
            e.preventDefault();
            if (next) caretIn(next, true);
            else if (!e.shiftKey) addRow();
          }} />
      </div>
      {error ? <span className="fld-help" id={`${id}-e`}>{error}</span> : null}
      {/* منعُ النقر يُبقي تحديدَ الحقل حين يقرؤه الزرّ: بالفأرة (`mousedown`) وباللمس (`pointerdown`، في iPhone يأتي الأوّلُ بعد النقرة) */}
      <div className="ad-stm-tools ad-rich-tools" role="toolbar" aria-label="شكلُ النصّ" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()}>
        {/* **ثلاثُ مجموعاتٍ لا صفٌّ واحد** (محمد ٢٠٢٦-١١-١٦: «الأزرار كلها على اليمين والباقي فارغ وملتصقة، لا فراغ منطقي»): شكلُ الحرف، ثمّ
            القائمتان معًا، والجدولُ وأفعالُ صفوفه في الطرف الآخر */}
        <span className="ad-rich-g">
          <AdButton variant="line" size="sm" icon={<TextB />} pressed={at.bold} onClick={() => cmd("bold")}>عريض</AdButton>
        </span>
        <span className="ad-rich-g">
          <AdButton variant="line" size="sm" icon={<ListBullets />} pressed={at.ul} onClick={() => cmd("insertUnorderedList")}>قائمة نقطية</AdButton>
          <AdButton variant="line" size="sm" icon={<ListNumbers />} pressed={at.ol} onClick={() => cmd("insertOrderedList")}>قائمة مرقّمة</AdButton>
        </span>
        <span className="ad-rich-g">
          {at.table ? (
            <>
              <AdButton variant="line" size="sm" icon={<Rows />} onClick={addRow}>صفٌّ جديد</AdButton>
              {at.head ? null : <AdButton variant="line" size="sm" icon={<Minus />} onClick={dropRow}>{at.single ? "احذف الجدول" : "احذف الصفّ"}</AdButton>}
            </>
          ) : <AdButton variant="line" size="sm" icon={<Table />} onClick={insertTable}>جدول</AdButton>}
        </span>
      </div>
    </div>
  );
}
