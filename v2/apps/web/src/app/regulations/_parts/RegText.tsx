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
import { RegIcon } from "./RegIcon";

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
    out.push(<mark key={i} className="ad-mark">{text.slice(a, b)}</mark>);
    at = b;
  });
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}

function RefLink({ slug, no, ch, className = "ad-rg-ref", label, children }: { slug: string; no?: number; ch?: number; className?: string; label?: string; children: ReactNode }) {
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
          className="ad-rg-pop"
          role="dialog"
          id={id}
          ariaLabelledby={`${id}-h`}
          panelRef={panelRef}
        >
          <div className="ad-rg-pop-head">
            <span className="ad-rg-pop-no" aria-hidden>
              {p.no}
            </span>
            <span className="ad-rg-pop-ht">
              <span className="ad-rg-pop-h" id={`${id}-h`}>
                <span className="ad-sr">المادة {p.no}: </span>
                {latin(p.title)}
              </span>
              <span className="ad-rg-pop-doc">{p.doc}</span>
            </span>
          </div>
          <p className="ad-rg-pop-x">{latin(p.text)}</p>
          <div className="ad-rg-pop-foot">
            {same ? (
              <a
                href={href}
                className="ad-btn ad-btn-fill ad-btn-sm ad-btn-end"
                onClick={(e) => {
                  setOpen(false);
                  if (go?.({ slug, no, ch })) e.preventDefault();
                }}
              >
                انتقل إلى المادّة
                <ArrowLeft aria-hidden />
              </a>
            ) : (
              <Link
                href={href}
                className="ad-btn ad-btn-fill ad-btn-sm ad-btn-end"
                onClick={(e) => {
                  setOpen(false);
                  if (go?.({ slug, no, ch })) e.preventDefault();
                }}
              >
                انتقل إلى المادّة
                <ArrowLeft aria-hidden />
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
    <div className="ad-rg-txt">
      {blocks.map((b, i) => {
        const head = i === 0 ? lead : null;
        if (b.kind === "para") return <p key={i}>{head}<RegText text={b.text} /></p>;
        if (b.kind === "list") {
          const L = b.ordered ? "ol" : "ul";
          return (
            <div key={i}>
              {head ? <p>{head}</p> : null}
              <L className={b.ordered ? "ad-rg-ol" : "ad-rg-ul"}>
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

/**
 * **«يُحال إليها من ٣ موادّ»** (محمد ٢٠٢٦-١١-٢٣): زرُّ «المزيد» في الهويّة، يُنزل في الورقة تحت المادّة — لا ينبثق — سطورَ الهويّة
 * (`.ad-line`): رمزُ الوثيقة في مربّعه، واسمُ المادّة، ووثيقتُها تحته. تُعايَن بالمرور كسائر الإحالات وتنقل بالضغط، وواحدةٌ مفتوحةٌ في الصفحة
 * (`open` من `RegRead`). وعمودٌ واحدٌ أبدًا: العمودان كانا ينكسران في أكثر الموادّ فتتقلّب الصفحةُ بين هيئتين.
 * (جُرّبت: أرقامًا تنبسط في صبغة، وقائمةَ «المزيد» طافية، ثمّ في الورقة بصندوقها ورؤوسها — «ورقةٌ على ورقة»، واثنا عشر سطرًا لستّ موادّ)
 */
export function CitedBy({ keys, open, onToggle }: { keys: string[]; open: boolean; onToggle: () => void }) {
  const { previews, docNames } = useReg();
  const id = useId();
  return (
    <div className="ad-rg-cited">
      <button type="button" className="ad-btn ad-btn-soft ad-btn-sm ad-more" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <CaretDown aria-hidden />يُحال إليها من {arCount(keys.length, AR_ARTICLE_GEN)}
      </button>
      {open ? (
        <ul className="ad-lines ad-rg-citedlines" id={id}>
          {keys.map((k) => {
            const [s, n] = k.split(":");
            const no = Number(n);
            const p = previews[k];
            return (
              <li key={k} className="ad-line">
                <RefLink slug={s} no={no} className="ad-line-hit" label={`${docNames[s]}، المادة ${no}`}>
                  <span className="ad-line-ic" aria-hidden><RegIcon slug={s} /></span>
                  <span className="ad-line-kv">
                    <span className="ad-line-v">{p ? `المادة ${no}: ${latin(p.title)}` : `المادة ${no}`}</span>
                    <span className="ad-line-sub">{docNames[s]}</span>
                  </span>
                </RefLink>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
