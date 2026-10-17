import type { ReactNode } from "react";
import { Quotes } from "@phosphor-icons/react";
import { anchorId, type Block } from "@/lib/news/body";

/**
 * متنُ المقال — يرسم ما ردّه {@link parseBody} ولا يستدلّ على البنية بنفسه.
 *
 * **ثوبُه بلغة لوح الاقتباس** (أقرّه المالك ٢٠٢٦-١٠-١٤ بعد معاينة `/ui/news-body`):
 * رأسُ كلّ فصلٍ لوحٌ كحليٌّ منقوشٌ من عائلة الصدر ورؤوس كروت «أنظمة أدِيب»، ورقمُ
 * الفصل خلف عنوانه أبيضُ يذوب في اللوح؛ والقوائمُ بعناوينها العريضة في السطر كمواد
 * الأنظمة؛ والاقتباسُ لوحٌ مثله. وأُسقطت ريشةُ الفصل بين الأقسام: الترقيمُ يغني عنها.
 *
 * وما يُصلَح هنا عند الرسم لا يمسّ المحتوى المخزَّن: التنصيصُ "…" يصير «…»، والأرقامُ
 * في المتن تُكتب بخطّ Eras، والسطرُ القصيرُ بلا علامة وقفٍ عنوانٌ فرعيّ.
 */

/** "…" و“…” تصير «…»: تنصيصٌ واحدٌ في الأخبار كلّها. */
export const arQuotes = (t: string) => t.replace(/["“]([^"“”\n]+)["”]/g, "«$1»");

/** الأرقامُ في المتن بخطّ Eras عريضةً بلون الهويّة: «1,000 وجبة» تُرى قبل أن تُقرأ. */
export function rich(t: string): ReactNode {
  const parts = arQuotes(t).split(/(\d[\d,.]*\d|\d)/g);
  return parts.map((x, i) => (i % 2 ? <span key={i} className="art-num">{x}</span> : x));
}

/** «عنوانُ البند: شرحُه» — يُفكّ إن كان العنوانُ قصيرًا (أربعُ كلماتٍ فأقلّ). */
export function split(text: string): { label: string; rest: string } | null {
  const m = /^([^:\n]{1,40}):\s*(.+)$/.exec(text);
  return m && m[1]!.trim().split(/\s+/).length <= 4 ? { label: m[1]!.trim(), rest: m[2]! } : null;
}

/** سطرٌ قصيرٌ بلا علامة وقف (خمسُ كلماتٍ فأقلّ) عنوانٌ فرعيٌّ في نيّة كاتبه لا فقرة. */
export const isSubhead = (t: string) => t.trim().split(/\s+/).length <= 5 && !/[.!؟?:،,»"]$/.test(t.trim());

const two = (k: number) => String(k).padStart(2, "0");

export function ArticleBody({ blocks }: { blocks: Block[] }) {
  // رقمُ كلّ فصلٍ وموضعُ المدخل يُحسبان قبل الرسم لا أثناءه.
  const nums = blocks.map((_, i) => blocks.slice(0, i + 1).filter((x) => x.kind === "heading").length);
  const lead = blocks.findIndex((b) => b.kind === "para");

  return (
    <div className="art-body">
      {blocks.map((b, i) => {
        if (b.kind === "heading") {
          return (
            <h2 key={i} id={anchorId(i)} className="art-h">
              <span className="art-h-n" aria-hidden>{two(nums[i]!)}</span>
              <span className="art-h-t">{arQuotes(b.text)}</span>
            </h2>
          );
        }
        if (b.kind === "list") {
          const pairs = b.items.map(split);
          // قائمةٌ كلُّ بنودها «عنوان: شرح» تُكتب عناوينُها عريضةً؛ وإلّا فنقاطٌ كما هي.
          if (pairs.every(Boolean)) {
            return (
              <ul key={i} className="art-defs">
                {pairs.map((x, j) => (
                  <li key={j}><b>{arQuotes(x!.label)}</b><span>{rich(x!.rest)}</span></li>
                ))}
              </ul>
            );
          }
          return (
            <ul key={i} className="art-ul">
              {b.items.map((it, j) => <li key={j}>{rich(it)}</li>)}
            </ul>
          );
        }
        if (b.kind === "quote") {
          return (
            <blockquote key={i} className="art-quote">
              <Quotes className="art-quote-q" size={36} aria-hidden />
              <p>{arQuotes(b.text)}</p>
              {b.by ? <cite>{b.by}</cite> : null}
            </blockquote>
          );
        }
        if (i === lead) return <p key={i} className="art-lead">{rich(b.text)}</p>;
        if (isSubhead(b.text)) return <h3 key={i} className="art-h3">{arQuotes(b.text)}</h3>;
        return <p key={i}>{rich(b.text)}</p>;
      })}
    </div>
  );
}
