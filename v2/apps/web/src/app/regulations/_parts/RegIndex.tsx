"use client";

/**
 * **فهرسُ «أنظمة أدِيب» على الهويّة** (٢٠٢٦-١١-٢٢؛ صُمّم واعتُمد ٢٠٢٦-١٠-١٣ فيُنقل داخلُه وحده، قرارُ قالب الفهرس ١١-١٥).
 *
 * التكوينُ المعتمدُ كما هو — البحثُ أوّلًا، ثمّ الدستور، ثمّ الأنظمةُ الستّة، ثمّ كلمةُ الرئيسين في الذيل — ومادّتُه من الهويّة:
 * - **الرأسُ لوحُ الفهرس** (`PubIndex`) بحجمه في الفهارس كلّها: اسمُ المرجع وحقائقُه وبحثُه.
 * - **الدستورُ تذكرةٌ عريضةٌ أولى** فوق الأنظمة (محمد ٢٠٢٦-١١-٢٢؛ كان لوحًا مذهّبًا). جُرّب في لوح الرأس بعد خيط (كالمجلس الإداريّ في
 *   «هيكلة أدِيب») فطال اللوحُ حتى كسر تناسقَه مع ألواح الفهارس الأخرى؛ ولوحًا تحته لوحان كحليّان متتاليان (رُدّ في الهيكلة).
 * - **البحثُ زجاجُ اللوح** (`PubSearch`، خانةُ بحث الشريط الجانبيّ): كان شريطَ أدوات البوّابة الأبيض مُقحَمًا في اللوح الملوّن.
 * - **الأنظمةُ تذاكرُ الهويّة** (`AdCard`): كعبُها رمزُ النظام وعددُ موادّه، ثمّ اسمُه وأبوابُه وسطرُ تعريفه.
 * - **النتائجُ قائمةٌ تنسدل من الخانة** (`PubSearch`، وفيه ما رُدّ قبلها): الموادُّ تحت وثائقها ولكلٍّ اسمُها ومسارُها ومقتطفُها.
 *   والبحثُ يُحمَّل أوّلَ ما يُلمس الحقل.
 * - **كلمةُ الرئيسين** عنوانُ مجموعة، ولكلٍّ بطاقةُ قولٍ بختم الاقتباس وتوقيعه (بطاقةُ تعليق الخبر).
 */
import { useMemo, useRef, useState, type ReactNode } from "react";
import { matchesSearch } from "@adeeb/design-system";
import { BookOpenText, Files, ListNumbers, PenNib, Quotes } from "@phosphor-icons/react";
import { AdCard, AdGroupTitle } from "@/app/_ad/primitives";
import { PubIndex, PubSearch, type PubFact, type PubHitGroup } from "@/app/_ad/public";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import { arCount } from "@/lib/arabicCount";
import { searchTerms, snippet } from "@/lib/regulations/highlight";
import { AR_ARTICLE, AR_CHAPTER, AR_DOC, AR_DOC_GEN, latin } from "@/lib/regulations/text";
import type { RegSearchRow } from "@/lib/regulations/data";
import { Marked } from "./RegText";
import { RegIcon } from "./RegIcon";

export type RegIndexDoc = { slug: string; title: string; summary: string; articles: number; chapters: number };
export type RegIndexSigner = { id: string; name: string; role: string; gender: string; avatar: string | null; word: string };

export function RegIndex({ docs, signers, base, crumbs, note }: {
  docs: RegIndexDoc[]; signers: RegIndexSigner[]; base: string;
  /** بابُ كلّ مادّة («الباب الرابع») لمسارها في لوحة البحث، بمفتاح `وثيقة:رقم` */
  crumbs: Record<string, string>;
  /** اسمُ الهيئة في الصفحة نفسِها للمراجعة */
  note?: ReactNode;
}) {
  const [constitution, ...systems] = docs;
  const articles = docs.reduce((s, d) => s + d.articles, 0);
  const chapters = docs.reduce((s, d) => s + d.chapters, 0);
  const facts: PubFact[] = [
    { icon: <Files />, text: arCount(docs.length, AR_DOC) },
    { icon: <ListNumbers />, text: arCount(articles, AR_ARTICLE) },
    { icon: <BookOpenText />, text: arCount(chapters, AR_CHAPTER) },
  ];

  // ── البحث: الفهرسُ يُطلب أوّلَ ما يُكتب في الحقل
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<RegSearchRow[] | null>(null);
  const asked = useRef(false);
  const load = () => {
    if (asked.current) return;
    asked.current = true;
    fetch(`${base}/search`).then((r) => r.json() as Promise<RegSearchRow[]>).then(setRows).catch(() => { asked.current = false; });
  };
  const terms = useMemo(() => searchTerms(q), [q]);
  const groups = useMemo(() => {
    if (!rows || !terms.length) return [];
    const out: Array<{ slug: string; rows: RegSearchRow[] }> = [];
    for (const r of rows) {
      if (!matchesSearch(q, r.t, r.x, String(r.n))) continue;
      const g = out[out.length - 1];
      if (g?.slug === r.s) g.rows.push(r);
      else out.push({ slug: r.s, rows: [r] });
    }
    return out;
  }, [rows, q, terms]);
  const count = groups.reduce((s, g) => s + g.rows.length, 0);
  const titleOf = (slug: string) => docs.find((d) => d.slug === slug)?.title ?? slug;
  // اللوحةُ: كلُّ وثيقةٍ مجموعةٌ بعنوانها وعدد موادّها، ولكلّ مادّةٍ مسارُها (بابُها ورقمُها) واسمُها ومقتطفُها والكلمةُ مضيئة
  const hitGroups: PubHitGroup[] = groups.map((g) => ({
    key: g.slug, icon: <RegIcon slug={g.slug} />, title: titleOf(g.slug), count: arCount(g.rows.length, AR_ARTICLE),
    hits: g.rows.map((r) => {
      const t = latin(r.t);
      const x = latin(snippet(r.x, terms, 200));
      const ch = crumbs[`${r.s}:${r.n}`];
      return { key: `${r.s}:${r.n}`, href: `${base}/${r.s}#m${r.n}`, crumb: ch ? `${ch}، المادة ${r.n}` : `المادة ${r.n}`, title: t, excerpt: x,
        rich: { title: <Marked text={t} terms={terms} />, excerpt: <Marked text={x} terms={terms} /> } };
    }),
  }));
  const status = !terms.length ? undefined : !rows ? "يُحمَّل البحث…" : count ? `${arCount(count, AR_ARTICLE)} في ${arCount(groups.length, AR_DOC_GEN)}` : `لا مادّةَ فيها «${q.trim()}»`;

  const card = (d: RegIndexDoc, wide?: boolean) => (
    <div key={d.slug} className="ad-rg-card" data-wide={wide ? "" : undefined}>
      <AdCard title={d.title} href={`${base}/${d.slug}`} seed={d.slug}
        stub={{ icon: <RegIcon slug={d.slug} />, big: String(d.articles), small: arCount(d.articles, AR_ARTICLE) }}
        meta={[{ icon: <BookOpenText />, text: arCount(d.chapters, AR_CHAPTER) }]}
        extra={<p className="ad-rg-sum">{d.summary}</p>} />
    </div>
  );

  return (
    <PubIndex title="أنظمة أدِيب" deck="الدستورُ والأنظمةُ التي يقوم عليها النادي." facts={facts}
      chips={<PubSearch value={q} onChange={(v) => { load(); setQ(v); }} onFocus={load} label="ابحث في الدستور والأنظمة" placeholder="ابحث في الموادّ: كلمةٌ أو موضوع"
        groups={hitGroups} status={status} count={rows && count ? arCount(count, AR_ARTICLE) : rows && terms.length ? "لا نتائج" : undefined} />}>
      <div className="ad-rg">
        {note}
        {(
          <>
            <div className="ad-grid ad-rg-grid">
              {constitution ? card(constitution, true) : null}
              {systems.map((d) => card(d))}
            </div>
            {signers.length ? (
              <section className="ad-rg-words" aria-label="كلمة الرئيسين">
                <AdGroupTitle icon={<PenNib />}>كلمة الرئيسين</AdGroupTitle>
                {/* **بطاقةُ القول** (بطاقةُ تعليق الخبر المعتمدة ٢٠٢٦-١١-١٧): ورقةٌ بختم الاقتباس في ركنها، والكلمةُ بخطّ العنوان، وتوقيعُ صاحبها تحت شعرة
                    بوجهه واسمه ومنصبه — كانت قسمين برأسٍ وكلمةٍ بخطّ المتن لا يُقرآن قولًا */}
                <div className="ad-rg-words-g">
                  {signers.map((s) => (
                    <figure key={s.id} className="ad-nc-card">
                      <span className="ad-nc-mark" aria-hidden><Quotes /></span>
                      <blockquote className="ad-nc-t">{s.word}</blockquote>
                      <figcaption className="ad-nc-sig">
                        <span className="ad-nc-who">
                          <Avatar name={s.name} src={s.avatar ?? undefined} gender={s.gender === "female" || s.gender === "male" ? s.gender : null} size="sm" />
                          <span className="ad-nc-id">
                            <span className="ad-nc-name"><b>{s.name}</b></span>
                            <span className="ad-nc-standing">{s.role}</span>
                          </span>
                        </span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </PubIndex>
  );
}
