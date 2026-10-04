"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { matchesSearch } from "../lib/search";
import { AnchoredPopover } from "./AnchoredPopover";
import { FieldMark } from "./FieldMark";

/**
 * **مُنتقي الأشخاص — بابان لا باب.**
 *
 * اسمُ الكاتب واسمُ المصوّر كانا حقلَ نصٍّ حرًّا، فوقع ما يقع بالنصّ الحرّ: قُيس في
 * أخبار أدِيب الحيّة أنّ عشرين اسمًا كُتبت بأيدٍ مختلفة، سبعةٌ منها فقط تطابق سجلَّ
 * صاحبها، وأنّ شخصًا واحدًا نُسِب إليه عملُه بثلاث هجاءات («حوراء الشيبة» · «حوراء
 * الشيبه» · «حوراء زكريا الشيبة»)، وأنّ همزةً واحدةً فرّقت بين «أحمد» و«احمد».
 *
 * فالبابان: **اختيارٌ من أهل أدِيب** (عضوًا كان أو متطوّعًا) فيُكتب الاسمُ كما في سجلّه
 * حرفًا بحرف، **أو كتابةُ اسمٍ من خارجهم** كما هو — ضيفٌ أو شريكٌ أو مصوّرٌ زائر.
 * والثاني ليس استثناءً يُتسامح فيه: هو خيارٌ مُعلَنٌ في اللوحة يُختار بنقرة.
 *
 * **والمحفوظ نصٌّ لا معرّف**: الحقلُ عمودُ نصٍّ كما كان، فلا ترحيلَ ولا قيدٌ جديد.
 * والاختيارُ من القائمة يضمن الهجاء، لا أكثر. (وربطُ الاسم بصاحب الحساب — لتصير
 * النسبةُ رابطًا إلى صفحته العلنيّة — بابٌ آخرُ لم يُطلَب بعد.)
 *
 * والأشخاصُ يُمرَّرون مُعدِّين (`people`) ولا يُجلَبون هنا: المكتبةُ لا تعرف قاعدةً ولا
 * خادمًا، والشاشةُ تُحضِر بِركتَها بحارسها. وأيقونةُ كلّ شخصٍ تُمرَّر معه (`icon`) —
 * فالأفتار في اللوحة لا في المكتبة.
 */

export type PersonOption = {
  /** الاسمُ كما يُحفَظ ويُعرَض — هو القيمة نفسُها، فلا معرّفَ يُخزَّن. */
  name: string;
  /** سطرُ حالٍ يُقرأ تحت الاسم ويدخل البحثَ معه («لجنة التصوير»). */
  hint?: string;
  /** عنوانُ المجموعة في اللوحة («أعضاء أدِيب» · «متطوّعو أدِيب»). */
  group?: string;
  /** أفتارُ الشخص — تُمرَّر من اللوحة لأنّ المكتبة لا تعرف الأفتار. */
  icon?: ReactNode;
};

export interface PersonPickerProps {
  label: string;
  /** أيقونة هويّة بجانب التسمية — كنظام الحقل المعتمَد: لا حقل بلا أيقونة. */
  icon: ReactNode;
  people: PersonOption[];
  /** الأسماء المختارة. حقلُ الاسم الواحد يمرّر مصفوفةً فيها واحدٌ أو لا شيء. */
  value: string[];
  onChange: (names: string[]) => void;
  /** اسمٌ واحدٌ لا أكثر (مصوّر الغلاف) — الاختيارُ الجديد يحلّ محلّ القديم. */
  single?: boolean;
  placeholder: string;
  helper?: string;
  error?: string;
  optional?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const Search = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
  </svg>
);
const Pen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M14.5 6.5 17.5 9.5" />
  </svg>
);
const Ex = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

/** يقلّم المسافات ومحارف الاتّجاه الخفيّة اللاصقة من اللصق العربيّ — كما يفعل الخادم. */
const clean = (v: string) => v.replace(/[‎‏‪-‮]/g, "").trim();

export function PersonPicker({
  label, icon, people, value, onChange,
  single = false, placeholder, helper, error, optional, required, disabled = false, className,
}: PersonPickerProps) {
  const [open, setOpen] = useState(false);
  /** الحقلُ المفردُ المملوء: هل فُتح ليُبدَّل؟ خارجَها يُقرأ قيمةً لا حقلَ بحث. */
  const [swapping, setSwapping] = useState(false);
  const [query, setQuery] = useState("");
  const [hl, setHl] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = clean(query);

  /** المتاحون = من لم يُختَر بعدُ، منخولين بالبحث. الاسمُ المختارُ يخرج من اللوحة فلا يُكرَّر. */
  const matches = useMemo(() => {
    const taken = new Set(value);
    const pool = people.filter((p) => !taken.has(p.name));
    if (!q) return pool;
    return pool.filter((p) => matchesSearch(q, p.name, p.hint));
  }, [people, value, q]);

  /** هل ما كُتب اسمٌ من خارج أدِيب؟ يُعرَض صفًّا أوّلَ ما دام لا يطابق أحدًا بحروفه. */
  const showFree = q.length > 0 && !people.some((p) => p.name === q) && !value.includes(q);

  const rows = useMemo(() => {
    const out: Array<{ kind: "free" } | { kind: "head"; label: string } | { kind: "person"; p: PersonOption; i: number }> = [];
    let i = 0;
    if (showFree) { out.push({ kind: "free" }); i += 1; }
    let last: string | undefined;
    for (const p of matches) {
      if (p.group && p.group !== last) { out.push({ kind: "head", label: p.group }); last = p.group; }
      out.push({ kind: "person", p, i });
      i += 1;
    }
    return out;
  }, [matches, showFree]);

  const count = (showFree ? 1 : 0) + matches.length;

  /**
   * **الإبرازُ يقع على أوّل إنسانٍ لا على الصفّ الحرّ.**
   * من كتب «حوراء» وضغط Enter يقصد المرأةَ التي يبحث عنها، لا أن يُثبِت «حوراء» اسمًا
   * ناقصًا من خارج النادي — وذاك ما كان يقع حين بدأ الإبرازُ من الصفر والصفُّ الحرُّ
   * أوّلُ الصفوف. فالصفُّ الحرُّ يبقى في صدر اللوحة ليُرى، ويُبلَغ بسهمٍ إلى أعلى.
   */
  const firstPerson = showFree && matches.length ? 1 : 0;

  /** ‎-1‎ = لم يُحرَّك السهمُ بعد، فالمُبرَزُ محسوبٌ لا محفوظ. */
  const cur = hl < 0 ? firstPerson : hl;

  const add = (name: string) => {
    const n = clean(name);
    if (!n) return;
    onChange(single ? [n] : value.includes(n) ? value : [...value, n]);
    setQuery("");
    setHl(-1);
    if (single) { setOpen(false); setSwapping(false); }
    inputRef.current?.focus();
  };
  const drop = (name: string) => onChange(value.filter((v) => v !== name));

  /** يختار الصفَّ المُبرَز — الحرُّ أوّلًا إن كان معروضًا، ثمّ الأشخاص بترتيبهم. */
  const pickHighlighted = () => {
    if (showFree && cur === 0) { add(q); return; }
    const p = matches[showFree ? cur - 1 : cur];
    if (p) add(p.name);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHl(Math.min(count - 1, cur + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHl(Math.max(0, cur - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (count) pickHighlighted(); else add(q); }
    else if (e.key === "Escape") { setOpen(false); setSwapping(false); setQuery(""); }
    // الرجوعُ على حقلٍ فارغٍ يرفع آخرَ شارة — عُرفُ حقول الشارات، فلا تُطلَب فأرةٌ لرفعها
    else if (e.key === "Backspace" && !query && value.length) { drop(value[value.length - 1]); }
  };

  /**
   * **الاسمُ الواحدُ يُقرأ قيمةً لا شارة.**
   * الشارةُ لغةُ قائمةٍ تُجمَع وتُنقَص، ومصوّرُ الصورة قيمةٌ واحدةٌ — فإظهارُها وسمًا
   * داخل الحقل يقول للعين «هذا واحدٌ من كثير» وهو ليس كذلك. فالمفردُ المملوء يلبس هيئةَ
   * المنسدل المملوء نفسَها (`.asel-value`): الاسمُ نصًّا، ومَخرَجٌ يمسحه، ونقرةٌ على
   * البئر تفتح القائمة لتبديله — وهي الهيئةُ التي يعرفها المستعمل من كلّ حقلٍ في اللوحة.
   */
  const filledSingle = single && value.length >= 1 && !swapping;

  return (
    <div className={cn("fld", error ? "err" : undefined, className)}>
      <span className="fld-lbl">
        <span className="fld-lic" aria-hidden="true">{icon}</span>
        {label}
        <FieldMark optional={optional} required={required} />
      </span>

      <div ref={rootRef} className={cn("ppk", open ? "ppk-open" : undefined, disabled ? "ppk-off" : undefined)}>
        <div className="ppk-box" onClick={() => !disabled && inputRef.current?.focus()}>
          {single ? null : value.map((name) => (
            <span key={name} className="ppk-chip">
              <span className="ppk-chip-t">{name}</span>
              <button type="button" className="ppk-chip-x" onClick={() => drop(name)} aria-label={`ارفع ${name}`} disabled={disabled}>
                <Ex />
              </button>
            </span>
          ))}
          {filledSingle ? (
            <button type="button" className="ppk-val" disabled={disabled}
              onClick={() => { setSwapping(true); setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}>
              {value[0]}
            </button>
          ) : (
            <input
              ref={inputRef}
              className="ppk-in"
              value={query}
              placeholder={single || !value.length ? placeholder : ""}
              disabled={disabled}
              role="combobox"
              aria-expanded={open}
              aria-autocomplete="list"
              onChange={(e) => { setQuery(e.target.value); setHl(-1); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKey}
            />
          )}
          {filledSingle ? (
            <button type="button" className="ppk-x" disabled={disabled}
              onClick={(e) => { e.stopPropagation(); onChange([]); setSwapping(false); }}
              aria-label={`امسح ${value[0]}`}>
              <Ex />
            </button>
          ) : (
            <span className="ppk-si" aria-hidden><Search /></span>
          )}
        </div>

        <AnchoredPopover
          open={open && !disabled && !filledSingle}
          anchorRef={rootRef}
          onDismiss={() => { setOpen(false); setSwapping(false); setQuery(""); }}
          matchWidth
          className="asel-panel ppk-panel"
          role="listbox"
          reflowKey={rows.length}
        >
          <div className="asel-list">
            {rows.length === 0 ? <div className="asel-empty">اكتب اسمًا لتضيفه</div> : null}
            {rows.map((r, k) =>
              r.kind === "head" ? (
                <div className="asel-gh" key={`h-${k}`}>{r.label}</div>
              ) : r.kind === "free" ? (
                <div
                  key="free"
                  role="option"
                  aria-selected={cur === 0}
                  className={cn("asel-opt", "ppk-free", cur === 0 ? "asel-hl" : undefined)}
                  onMouseEnter={() => setHl(0)}
                  onClick={() => add(q)}
                >
                  <span className="asel-oic"><Pen /></span>
                  <span className="asel-txt">
                    {q}
                    <span className="asel-hint">اسمٌ من خارج أدِيب، يُكتب كما هو</span>
                  </span>
                </div>
              ) : (
                <div
                  key={r.p.name}
                  role="option"
                  aria-selected={false}
                  className={cn("asel-opt", r.i === cur ? "asel-hl" : undefined)}
                  onMouseEnter={() => setHl(r.i)}
                  onClick={() => add(r.p.name)}
                >
                  {r.p.icon ? <span className="asel-oic ppk-av">{r.p.icon}</span> : null}
                  <span className="asel-txt">
                    {r.p.name}
                    {r.p.hint ? <span className="asel-hint">{r.p.hint}</span> : null}
                  </span>
                </div>
              ),
            )}
          </div>
        </AnchoredPopover>
      </div>

      {(error ?? helper) ? <span className="fld-help">{error ?? helper}</span> : null}
    </div>
  );
}
