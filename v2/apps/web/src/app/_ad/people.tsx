"use client";

/**
 * **منتقي الأشخاص** (`AdPeoplePicker`، اعتمده محمد ٢٠٢٦-١١-١٣): الكتّاب، ومصوّر الغلاف، وكتّابُ التكليف.
 * كان `PersonPicker` القديمَ من نظام التصميم بشكله. ويُبنى من قطعٍ معتمدة كلُّها، ولا يخترع شيئًا:
 * - **الحقل (ب)** نفسُه للبحث (`.fld` بمربّعه وتسميته فوق القيمة)، و**القائمةُ المنسدلة «امتداد الحقل»** نفسُها تحته (`.asel-panel`): رأسُ
 *   المجموعة برمزه وخطّه («أعضاء أدِيب»، «متطوّعو أدِيب»)، والوجهُ في أوّل السطر، والوصفُ بجانب الاسم.
 * - ومن ليس من أدِيب يُكتب اسمُه كما هو (`free`): سطرٌ أوّلَ القائمة «أضف «…» كما كُتب».
 * - **والمختارون سطورُ «حسابي»** (`AdLine`، اختارها محمد ٢٠٢٦-١١-١٣ من اتّجاهين — والآخرُ قطعُ المرشّح المفعَّل، رُدّ: أربعُ قطعٍ كحليّةٍ في نموذجٍ
 *   هادئ، ولا تقول مَن المعروض): رمزُ الدور، ثمّ الاسم، وفعلُه «إزالة» — والأوّلُ يقول إنّه المعروض (`lead`). والواحدُ (المصوّر) سطرٌ بـ«تغيير».
 * القيمةُ معرّفات (`id`)، وفي النسبة الحرّة المعرّفُ هو الاسمُ نفسُه.
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnchoredPopover, Field, matchesSearch } from "@adeeb/design-system";
import { MagnifyingGlass, PencilSimple, Plus, X } from "@/app/_components/glyphs";
import { AdLine } from "./account";

export type AdPerson = { id: string; name: string; hint?: string; group?: string; face?: ReactNode };

type Row = { type: "head"; label: string } | { type: "opt"; p: AdPerson; i: number } | { type: "free"; name: string; i: number };

export function AdPeoplePicker({
  label, icon, roleIcon, people, value, onChange, single, free, placeholder, helper, required, optional, lead, groupIcon,
}: {
  label: string;
  icon: ReactNode;
  /** رمزُ الدور في سطر المختار (الريشةُ للكاتب، والعدسةُ للمصوّر) */
  roleIcon: ReactNode;
  people: AdPerson[];
  value: string[];
  onChange: (ids: string[]) => void;
  single?: boolean;
  free?: boolean;
  placeholder: string;
  helper?: string;
  required?: boolean;
  optional?: boolean;
  /** تسميةُ الأوّل في السطور («يظهر في البطاقة») */
  lead?: string;
  groupIcon?: (group: string) => ReactNode;
}) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLElement | null>(null);
  const top = useRef<HTMLElement | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  /** المُنار: `-1` «تلقائيّ» = أوّلُ شخص — لا سطرُ «أضف … كما كُتب»: من كتب نصفَ اسمِ عضوٍ وضغط Enter أراد العضو لا نصفَ اسمه
   *  (عيبُ «حوراء» الذي أصلحه `PersonPicker` القديم) */
  const [hl, setHl] = useState(-1);
  // البئرُ نصفان (`.fld-lbl` و`.fld-wrap`): القائمةُ تلتصق بالأسفل، وتنقلب فوق التسمية فلا تغطّيها
  useEffect(() => {
    anchor.current = box.current?.querySelector<HTMLElement>(".fld-wrap") ?? null;
    top.current = box.current?.querySelector<HTMLElement>(".fld-lbl") ?? null;
  }, []);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const chosen = value.map((v) => byId.get(v) ?? { id: v, name: v, hint: "من خارج أدِيب" });
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let i = 0;
    const term = q.trim();
    if (free && term && !people.some((p) => p.name === term) && !value.includes(term)) out.push({ type: "free", name: term, i: i++ });
    const groups = new Map<string, AdPerson[]>();
    for (const p of people) {
      if (value.includes(p.id) || !matchesSearch(term, p.name, p.hint)) continue;
      const g = p.group ?? "";
      groups.set(g, [...(groups.get(g) ?? []), p]);
    }
    for (const [g, list] of groups) {
      if (g) out.push({ type: "head", label: g });
      for (const p of list) out.push({ type: "opt", p, i: i++ });
    }
    return out;
  }, [people, value, q, free]);
  const count = rows.filter((r) => r.type !== "head").length;
  const firstPerson = rows.find((r) => r.type === "opt");
  // ولا صفَّ مُنارًا عند الفتح بلا بحث (قاعدةُ القائمة: «لا صفّ مُنارٌ عند الفتح بالنقر»)، والبحثُ يُنير أوّلَ من طابقه
  const at = hl >= 0 ? hl : q.trim() && firstPerson && firstPerson.type === "opt" ? firstPerson.i : -1;

  const add = (pid: string) => {
    onChange(single ? [pid] : [...value, pid]);
    setQ("");
    setHl(-1);
    if (single) setOpen(false);
    input.current?.focus();
  };
  const drop = (pid: string) => onChange(value.filter((v) => v !== pid));
  /** **الواحدُ يُبدَّل لا يُضاف إليه** (المصوّر): ما دام مختارًا فهو وحده بلا حقلِ بحثٍ تحته، و«تغيير» يعيد الحقلَ ويركّز فيه */
  const solo = single && value.length > 0;
  const refocus = useRef(false);
  useEffect(() => {
    if (!refocus.current || solo) return;
    refocus.current = false;
    input.current?.focus();
  }, [solo]);
  const change = () => { refocus.current = true; onChange([]); };
  const pickAt = (i: number) => {
    const r = rows.find((x) => x.type !== "head" && x.i === i);
    if (!r || r.type === "head") return;
    // علاماتُ الاتّجاه الخفيّة تُنزع من الاسم الحرّ (كما كان `clean()`): تُلصق مع الاسم من واتساب فتصير اسمين لا يتطابقان
    add(r.type === "free" ? r.name.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "").trim() : r.p.id);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (!open) { setOpen(true); return; } setHl(Math.min(at + 1, Math.max(count - 1, 0))); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHl(Math.max(at - 1, 0)); }
    else if (e.key === "Enter") { if (open && count && at >= 0) { e.preventDefault(); pickAt(at); } }
    // داخل نافذةٍ يُغلق Escape القائمةَ وحدها لا النافذة
    else if (e.key === "Escape") { if (open) { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setOpen(false); } }
    else if (e.key === "Backspace" && !q && value.length && !single) drop(value[value.length - 1]);
  };

  const chosenEl = !chosen.length ? null : (
    <ul className="ad-lines ad-pp-lines" aria-label={label}>
      {chosen.map((p, i) => (
        <AdLine key={p.id} icon={roleIcon} k={single ? label : i === 0 && lead ? lead : p.hint} v={p.name} sub={single ? p.hint : undefined}
          act={single ? { icon: <PencilSimple />, text: "تغيير", label: `تغيير ${label}` } : { icon: <X />, text: "إزالة", label: `إزالة ${p.name}` }}
          onClick={() => (single ? change() : drop(p.id))} />
      ))}
    </ul>
  );

  return (
    <div ref={box} className="ad-pp form-full" data-open={open || undefined} data-solo={solo || undefined}>
      {/* الحقلُ يبقى مركَّبًا ويُخفى (لا يُزال): مرساةُ القائمة تُقرأ منه مرّةً حين يركّب */}
      <Field ref={input} label={label} icon={icon} innerIcon={<MagnifyingGlass />} placeholder={placeholder}
        required={required} optional={optional} helper={helper} value={q}
        role="combobox" aria-expanded={open} aria-controls={`${id}-l`} aria-autocomplete="list"
        aria-activedescendant={open && count && at >= 0 ? `${id}-o${at}` : undefined}
        onChange={(e) => { setQ(e.target.value); setHl(-1); setOpen(true); }}
        onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={onKey} />
      <AnchoredPopover open={open} anchorRef={anchor} topRef={top} matchWidth className="asel-panel ad-pp-panel" role="listbox"
        id={`${id}-l`} reflowKey={rows.length} onDismiss={() => setOpen(false)}>
        {/* الضغطُ داخل القائمة لا يأخذ التركيزَ من الحقل (فلا يغلقها خروجُه منه) */}
        <div className="asel-list" onMouseDown={(e) => e.preventDefault()}>
          {count === 0 ? <div className="asel-empty">{q.trim() ? "لا أحد بهذا الاسم" : "لا أحد غير من اخترت"}</div> : null}
          {rows.map((r, k) => r.type === "head" ? (
            <div className="asel-gh" key={`h${k}`}>{groupIcon ? <span className="asel-gi" aria-hidden>{groupIcon(r.label)}</span> : null}<span>{r.label}</span></div>
          ) : (
            <div key={r.type === "free" ? "free" : r.p.id} id={`${id}-o${r.i}`} role="option" aria-selected={r.i === at}
              className={r.i === at ? "asel-opt asel-hl" : "asel-opt"}
              onMouseEnter={() => setHl(r.i)} onClick={() => pickAt(r.i)}>
              {r.type === "free" ? (
                <>
                  <span className="asel-oic"><Plus /></span>
                  <span className="asel-txt">{`أضف «${r.name}» كما كُتب`}<span className="asel-hint">من خارج أدِيب</span></span>
                </>
              ) : (
                <>
                  {r.p.face ? <span className="asel-oic">{r.p.face}</span> : null}
                  <span className="asel-txt">{r.p.name}{r.p.hint ? <span className="asel-hint">{r.p.hint}</span> : null}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </AnchoredPopover>
      {chosenEl}
    </div>
  );
}
