// عُدّةُ النصّ لـ«أنظمة أدِيب»: خفيفةٌ بلا بيانات، فيستوردها العميلُ دون أن يحمل النصوصَ كلَّها.

import { arCount, type ArForms } from "@/lib/arabicCount";
import type { RegArticle, RegBlock, RegDoc } from "./types";

export const AR_ARTICLE: ArForms = ["مادّةٌ واحدة", "مادّتان", "موادّ", "مادّةً"];
/** مجرورةً بعد حرف: «يُحال إليها من مادّتين». */
export const AR_ARTICLE_GEN: ArForms = ["مادّةٍ واحدة", "مادّتين", "موادّ", "مادّةً"];
export const AR_CHAPTER: ArForms = ["بابٌ واحد", "بابان", "أبواب", "بابًا"];
export const AR_CHAPTER_GEN: ArForms = ["بابٍ واحد", "بابين", "أبواب", "بابًا"];
export const AR_DOC: ArForms = ["وثيقةٌ واحدة", "وثيقتان", "وثائق", "وثيقةً"];
export const AR_DOC_GEN: ArForms = ["وثيقةٍ واحدة", "وثيقتين", "وثائق", "وثيقةً"];

/**
 * الأرقامُ تُعرض لاتينيّةً، في النصّ وحوله (قرارُ المالك ٢٠٢٦-١٠-١٣)، وتُرسم بـEras من عائلة الخطّ نفسِها.
 * والنصُّ المُقَرّ يبقى في مصدره بأرقامه، فالتحويلُ عرضٌ لا تعديل.
 */
export const latin = (s: string) =>
  s.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x6f0));

export const factsOf = (articles: number, chapters: number) =>
  `${arCount(articles, AR_ARTICLE)} في ${arCount(chapters, AR_CHAPTER_GEN)}`;

/** «الباب الأول: أحكام عامة» ← ["الباب الأول", "أحكام عامة"]. */
export function chapterParts(title: string | null): [kicker: string | null, name: string | null] {
  if (!title) return [null, null];
  const i = title.indexOf(": ");
  return i === -1 ? [null, title] : [title.slice(0, i), title.slice(i + 2)];
}

/**
 * مدى موادّ الباب: «1–3» أو «4» وحدها. والمدى معزولٌ يسارًا (LRI…PDI): الشَّرطةُ بين رقمين لاتينيّين في سطرٍ
 * عربيّ تقلبهما فيُرى «3–1».
 */
/** نطاقُ موادّ الباب كلامًا للورق: «المادة 7»، «المادتان 1 و2»، «المواد 4 إلى 11». */
export const rangeWords = (nos: number[]) =>
  nos.length === 1 ? `المادة ${nos[0]}` : nos.length === 2 ? `المادتان ${nos[0]} و${nos[1]}` : `المواد ${nos[0]} إلى ${nos[nos.length - 1]}`;

export const rangeOf = (nos: number[]) => (nos.length === 1 ? String(nos[0]) : `\u2066${nos[0]}–${nos[nos.length - 1]}\u2069`);

export const blockText = (b: RegBlock): string =>
  b.kind === "para" ? b.text : b.kind === "list" ? b.items.join(" ") : b.kind === "table" ? [...b.head, ...b.rows.flat()].join(" ") : b.caption;

export const articleText = (a: RegArticle) => a.blocks.map(blockText).join(" ").replace(/\*\*/g, "");

/** المادّةُ نصًّا يُلصق حيث شاء القارئ: مرجعُها، ثمّ متنُها كتلةً كتلة بسطورها، ثمّ رابطُها. */
export function articleCopy(docTitle: string, a: RegArticle, url: string): string {
  const body = a.blocks
    .map((b) =>
      b.kind === "para"
        ? b.text
        : b.kind === "list"
          ? b.items.map((t, i) => `${b.ordered ? `${i + 1}.` : "-"} ${t}`).join("\n")
          : b.kind === "table"
            ? [b.head, ...b.rows].map(([k, ...v]) => (v.length ? `${k}: ${v.join("، ")}` : k)).join("\n")
            : b.caption,
    )
    .join("\n\n");
  return `${latin(`${docTitle}، المادة ${a.no}: ${a.title}\n\n${body}`.replace(/\*\*/g, ""))}\n\n${url}`;
}

/** اسمُ الوثيقة قصيرًا كما تُذكر في النصوص: «الدستور» لا «دستور أدِيب». */
export const shortTitle = (d: Pick<RegDoc, "slug" | "title">) => (d.slug === "constitution" ? "الدستور" : d.title);

/** ما تعرضه بطاقةُ المعاينة عن مادّة. */
export interface RegPreview {
  slug: string;
  doc: string;
  no: number;
  title: string;
  text: string;
}

export function excerptOf(a: RegArticle, max = 300) {
  const t = articleText(a);
  if (t.length <= max) return t;
  const cut = t.lastIndexOf(" ", max);
  return `${t.slice(0, cut > max * 0.6 ? cut : max)}…`;
}

/** معايناتُ الموادّ من الوثائق: كلُّها، أو ما طُلب منها بمفاتيحه (`slug:no`). */
export function previewsFrom(docs: RegDoc[], keys?: Iterable<string>): Record<string, RegPreview> {
  const want = keys ? new Set(keys) : null;
  const out: Record<string, RegPreview> = {};
  for (const d of docs)
    for (const c of d.chapters)
      for (const a of c.articles) {
        const k = `${d.slug}:${a.no}`;
        if (!want || want.has(k)) out[k] = { slug: d.slug, doc: d.title, no: a.no, title: a.title, text: excerptOf(a) };
      }
  return out;
}
