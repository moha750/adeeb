"use client";

// المتنُ الحيّ: النصُّ كما أُقرّ، وإحالاتُه روابطُ تُعايَن في موضعها.
//
// **الإحالةُ تُقرأ قبل أن تُتبَع:** يمرّ المؤشّرُ على «(الدستور، المادة ٦٥)» فتنبثق المادّةُ نفسُها
// عنوانًا ونصًّا، ولا يغادر القارئُ سطرَه. وعلى اللمس تفتحها النقرةُ الأولى، والثانيةُ تنتقل.
// وكلُّ مادّةٍ تقول من يُحيل إليها (`CitedBy`)، فتُرى الأنظمةُ شبكةً واحدةً لا كتبًا متجاورة.

import { createContext, Fragment, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnchoredPopover } from "@adeeb/design-system";
import { ArrowLeft, CaretDown } from "@/app/_components/glyphs";
import { arCount } from "@/lib/arabicCount";
import { parseRefs, type RefScope } from "@/lib/regulations/refs";
import { matchRanges } from "@/lib/regulations/highlight";
import { AR_ARTICLE_GEN, latin } from "@/lib/regulations/text";
import type { RegPreview } from "@/lib/regulations/text";
import type { RegBlock } from "@/lib/regulations/types";
import { RegTable } from "./RegTable";
import { RegStructure } from "./RegStructure";

export interface RegTextContext {
  here: string;
  base: string;
  previews: Record<string, RegPreview>;
  docNames: Record<string, string>;
  counts: Record<string, [articles: number, chapters: number]>;
  terms: string[];
  /**
   * من يتولّى الانتقالَ إلى المادّة إن لم يكن رابطًا عاديًّا: الكتابُ يقلّب صفحتَها، والخريطةُ تختارها.
   * يردّ `true` إن تولّاه، فلا يمضي الرابط.
   */
  go?: (to: { slug: string; no?: number; ch?: number }) => boolean;
}

const Ctx = createContext<RegTextContext | null>(null);
export const RegTextProvider = Ctx.Provider;
function useReg() {
  const c = useContext(Ctx);
  if (!c) throw new Error("RegTextProvider مفقود");
  return c;
}

/** كلماتُ البحث معلَّمةً في النصّ. */
export function Marked({ text, terms }: { text: string; terms: string[] }) {
  const r = matchRanges(text, terms);
  if (!r.length) return <>{text}</>;
  const out: ReactNode[] = [];
  let at = 0;
  r.forEach(([a, b], i) => {
    if (a > at) out.push(text.slice(at, a));
    out.push(<mark key={i} className="reg-mark">{text.slice(a, b)}</mark>);
    at = b;
  });
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}

function RefLink({ slug, no, ch, className = "reg-ref", label, children }: { slug: string; no?: number; ch?: number; className?: string; label?: string; children: ReactNode }) {
  const { here, base, previews, go } = useReg();
  const same = slug === here;
  const hash = no ? `#m${no}` : `#b${ch}`;
  const href = same ? hash : `${base}/${slug}${hash}`;
  const p = no ? previews[`${slug}:${no}`] : undefined;

  const anchor = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const touch = useRef(false);
  const id = useId();

  const later = useCallback((fn: () => void, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(fn, ms);
  }, []);
  const hold = useCallback(() => window.clearTimeout(timer.current), []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // اللوحةُ في بوّابةٍ خارج الفقرة: الدخولُ إليها يُبقيها، والخروجُ منها يطويها.
  const panelRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      el.onmouseenter = hold;
      el.onfocus = hold;
      el.onmouseleave = () => later(() => setOpen(false), 160);
    },
    [hold, later],
  );

  const props = {
    ref: anchor,
    className,
    "aria-label": label,
    "data-slug": slug,
    "data-no": no,
    "data-ch": ch,
    "aria-describedby": open ? id : undefined,
    onPointerEnter: (e: React.PointerEvent) => {
      touch.current = e.pointerType !== "mouse";
      if (!touch.current && p) later(() => setOpen(true), 260);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") later(() => setOpen(false), 160);
    },
    onFocus: (e: React.FocusEvent<HTMLAnchorElement>) => {
      if (p && e.currentTarget.matches(":focus-visible")) setOpen(true);
    },
    onClick: (e: React.MouseEvent) => {
      if (p && touch.current && !open) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      setOpen(false);
      if (go?.({ slug, no, ch })) e.preventDefault();
    },
  };

  return (
    <>
      {same ? <a href={href} {...props}>{children}</a> : <Link href={href} {...props}>{children}</Link>}
      {p ? (
        <AnchoredPopover
          open={open}
          anchorRef={anchor}
          onDismiss={() => setOpen(false)}
          side="above"
          align="center"
          className="reg-pop"
          role="dialog"
          id={id}
          ariaLabelledby={`${id}-h`}
          panelRef={panelRef}
        >
          <div className="reg-pop-head">
            <span className="reg-pop-no" aria-hidden>
              {p.no}
            </span>
            <span className="reg-pop-ht">
              <span className="reg-pop-h" id={`${id}-h`}>
                <span className="sr-only">المادة {p.no}: </span>
                {latin(p.title)}
              </span>
              <span className="reg-pop-doc">{p.doc}</span>
            </span>
          </div>
          <p className="reg-pop-x">{latin(p.text)}</p>
          <div className="reg-pop-foot">
            {same ? (
              <a
                href={href}
                className="abtn abtn-primary abtn-sm"
                onClick={(e) => {
                  setOpen(false);
                  if (go?.({ slug, no, ch })) e.preventDefault();
                }}
              >
                انتقل إلى المادّة
                <ArrowLeft size={16} aria-hidden />
              </a>
            ) : (
              <Link
                href={href}
                className="abtn abtn-primary abtn-sm"
                onClick={(e) => {
                  setOpen(false);
                  if (go?.({ slug, no, ch })) e.preventDefault();
                }}
              >
                انتقل إلى المادّة
                <ArrowLeft size={16} aria-hidden />
              </Link>
            )}
          </div>
        </AnchoredPopover>
      ) : null}
    </>
  );
}

function Pieces({ text }: { text: string }) {
  const { here, counts, terms } = useReg();
  const scope = useMemo<RefScope>(
    () => ({
      here,
      hasArticle: (s, n) => !!counts[s] && n >= 1 && n <= counts[s][0],
      hasChapter: (s, n) => !!counts[s] && n >= 1 && n <= counts[s][1],
    }),
    [here, counts],
  );
  return (
    <>
      {parseRefs(text, scope).map((p, i) =>
        p.kind === "text" ? (
          <Marked key={i} text={latin(p.text)} terms={terms} />
        ) : (
          <RefLink key={i} slug={p.slug} no={p.kind === "art" ? p.no : undefined} ch={p.kind === "ch" ? p.ch : undefined}>
            {latin(p.text)}
          </RefLink>
        ),
      )}
    </>
  );
}

/** النصُّ لا يحمل من الوسم إلّا `**…**`، والباقي إحالاتٌ تُستدلّ. */
export function RegText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) => (i % 2 ? <b key={i}><Pieces text={part} /></b> : <Fragment key={i}><Pieces text={part} /></Fragment>))}
    </>
  );
}

export function RegBlocks({ blocks, lead }: { blocks: RegBlock[]; lead?: ReactNode }) {
  return (
    <div className="rg-txt">
      {blocks.map((b, i) => {
        const head = i === 0 ? lead : null;
        if (b.kind === "para") return <p key={i}>{head}<RegText text={b.text} /></p>;
        if (b.kind === "list") {
          const L = b.ordered ? "ol" : "ul";
          return (
            <div key={i}>
              {head ? <p>{head}</p> : null}
              <L className={b.ordered ? "rg-ol" : "rg-ul"}>
                {b.items.map((it, j) => <li key={j}><RegText text={it} /></li>)}
              </L>
            </div>
          );
        }
        if (b.kind === "table") {
          return (
            <div key={i}>
              {head ? <p>{head}</p> : null}
              <RegTable head={b.head.map(latin)} rows={b.rows.map((r) => r.map(latin))} />
            </div>
          );
        }
        return b.ref === "structure" ? <RegStructure key={i} caption={latin(b.caption)} /> : null;
      })}
    </div>
  );
}

/** «يُحال إليها من ٣ موادّ»: تُفتح فتُرى الموادُّ التي تستند إليها مجموعةً تحت وثائقها، ولكلٍّ معاينتُها. */
export function CitedBy({ keys }: { keys: string[] }) {
  const { docNames } = useReg();
  const groups = useMemo(() => {
    const out: Array<[slug: string, nos: number[]]> = [];
    for (const k of keys) {
      const [s, n] = k.split(":");
      const g = out.find(([x]) => x === s);
      if (g) g[1].push(Number(n));
      else out.push([s, [Number(n)]]);
    }
    return out;
  }, [keys]);
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="reg-cited">
      <button type="button" className="reg-cited-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        يُحال إليها من {arCount(keys.length, AR_ARTICLE_GEN)}
        <CaretDown size={14} aria-hidden />
      </button>
      {open ? (
        <ul className="reg-cited-list" id={id}>
          {groups.map(([s, nos]) => (
            <li key={s}>
              <span className="reg-cited-doc">{docNames[s]}</span>
              <span className="reg-chips">
                {nos.map((no) => (
                  <RefLink key={no} slug={s} no={no} className="reg-chip" label={`${docNames[s]}، المادة ${no}`}>
                    {no}
                  </RefLink>
                ))}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
