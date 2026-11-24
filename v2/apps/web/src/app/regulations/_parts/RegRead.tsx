"use client";

/**
 * **صفحةُ الوثيقة على الهويّة** (٢٠٢٦-١١-٢٢؛ صُمّمت واعتُمدت ٢٠٢٦-١٠-١٣ فيُنقل داخلُها وحده). خلفُ `RegDoc` القديم (حُذف ١١-٢٣)، وسلوكُه هو هو:
 * البحثُ في الموادّ، والجانبُ الذي يتبع القراءة، والإحالاتُ تُعايَن بالمرور، و«نسخ المادة»، و«يُحال إليها من»، والورقةُ الرسميّة.
 *
 * ومادّتُه من الهويّة:
 * - **قالبُ «القراءة»** (`PubRead`): لسانُ العودة إلى الفهرس، واللوحُ بشارة النوع والاسم والتعريف والحقائق (كان لوحًا مذهّبًا). والمتنُ تحت
 *   اللوح لا عليه (`flat`): أوّلُ ما فيه لوحُ باب، ولوحٌ على لوحٍ يُقرأ خطأً.
 * - **الجانبُ فهرسُ القراءة على ورقة** (قسمُ الهويّة «الأبواب»، محمد ٢٠٢٦-١١-٢٣؛ وعاريًا على الأرض كان لا يُمسك العين): البحثُ، ثمّ الأبوابُ
 *   برقمها ومداها (`.ad-acc-index`) **وتحت كلٍّ أرقامُ موادّه كلُّها** («أ»؛ وجُرّبت تحت الباب المقروء وحده، وبلا أرقام)، والمادّةُ تحت العين
 *   قطعةٌ من اللوح. و«اطبع الوثيقة» تحت ورقة الجانب (وفي الجوّال أوّلَ نافذة «الأبواب»). وفي الضيّق زرُّ «الأبواب» يفتح الفهرسَ في نافذة.
 * - **البابُ لوحُ الفصل** (`.ad-nr-chap`، توقيعُ الخبر): اسمُه، و«الباب الأول» شارةٌ زجاجيّةٌ في طرفه — كان شريطًا منقوشًا. ورقمُ الفصل الذي
 *   يذوب في طرف لوح الخبر لا يُكتب هنا: الشارةُ تقول رقمَه في موضعه نفسِه، فكانا يتراكبان.
 * - **الموادُّ على ورقة الهويّة تحت لوح بابها** (محمد ٢٠٢٦-١١-٢٣، «ب»؛ وجُرّبت على الأرض كمتن الخبر): النصُّ النظاميّ طويل، والورقةُ تجمع
 *   موادَّ الباب قطعةً واحدة. والمادّةُ رقمُها في مربّع السطر، ومتنُها بخطّ القراءة، وأفعالُها أزرارُ الهويّة.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { matchesSearch, Modal } from "@adeeb/design-system";
import { BookOpenText, Copy, ListBullets, ListNumbers, Printer } from "@phosphor-icons/react";
import { ArrowLeft, MagnifyingGlass, X } from "@/app/_components/glyphs";
import { AdBadge, AdButton, AdCard, AdEmpty, AdTools } from "@/app/_ad/primitives";
import { PubRead, type PubReadFact } from "@/app/_ad/read";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { defaultQrSpec } from "@/app/dashboard/tools/qr/defaults";
import { arCount } from "@/lib/arabicCount";
import { copyText } from "@/lib/clipboard";
import { qrSvg } from "@/lib/qr";
import { searchTerms } from "@/lib/regulations/highlight";
import { AR_ARTICLE, AR_CHAPTER, articleCopy, articleText, chapterParts, factsOf, latin, rangeOf, rangeWords } from "@/lib/regulations/text";
import type { RegArticle, RegDoc as Doc } from "@/lib/regulations/types";
import type { RegPreview } from "@/lib/regulations/text";
import { CitedBy, Marked, RegBlocks, RegTextProvider } from "./RegText";
import { RegIcon } from "./RegIcon";


/** ما تأخذه صفحةُ الوثيقة (ومعاينةُ محرّر الأنظمة) من القاعدة — كان في `RegDoc` القديم، ونُقل إليها يوم حُذف (٢٠٢٦-١١-٢٣) */
export interface RegDocProps {
  doc: Doc;
  base: string;
  previews: Record<string, RegPreview>;
  cited: Record<number, string[]>;
  docNames: Record<string, string>;
  counts: Record<string, [number, number]>;
  next: { slug: string; title: string; facts: { articles: number; chapters: number } } | null;
}

const HEAD_OFFSET = 112;
const PRINT_DATE = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" });
const two = (n: number) => String(n).padStart(2, "0");

export function RegRead({ doc, base, previews, cited, docNames, counts, next, note, preview }: RegDocProps & {
  note?: ReactNode;
  /** معاينةُ المحرّر (`frame/regulation`): بلا لسان عودة */
  preview?: boolean;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<number | null>(null);
  const toast = useToast();
  const [navOpen, setNavOpen] = useState(false);
  // «يُحال إليها»: قائمةٌ واحدةٌ مفتوحةٌ في الصفحة، تُغلق المفتوحةَ إن فُتحت أخرى
  const [citedOpen, setCitedOpen] = useState<number | null>(null);
  const [pastEnd, setPastEnd] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);

  const total = counts[doc.slug]?.[0] ?? 0;
  const terms = useMemo(() => searchTerms(q), [q]);
  const filtering = terms.length > 0;
  const hits = useMemo(() => {
    const set = new Set<number>();
    for (const c of doc.chapters)
      for (const a of c.articles) if (matchesSearch(q, a.title, articleText(a), String(a.no))) set.add(a.no);
    return set;
  }, [doc, q]);
  const ctx = useMemo(() => ({ here: doc.slug, base, previews, docNames, counts, terms }), [doc.slug, base, previews, docNames, counts, terms]);

  // ── المادّةُ تحت العين: آخرُ مادّةٍ عبر رأسُها خطَّ القراءة
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const els = document.querySelectorAll<HTMLElement>(".ad-rg-art");
      let cur: number | null = null;
      for (const el of els) {
        if (el.getBoundingClientRect().top - HEAD_OFFSET > 8) break;
        cur = Number(el.id.slice(1));
      }
      setActive(cur ?? (els[0] ? Number(els[0].id.slice(1)) : null));
      const end = endRef.current;
      if (end) setPastEnd(end.getBoundingClientRect().top < window.innerHeight);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [q]);

  // والجانبُ يتبعها: رقمُها المضيءُ لا يغيب عن نافذته
  useEffect(() => {
    const box = sideRef.current;
    const chip = box?.querySelector<HTMLElement>(".ad-rg-chip[aria-current]");
    if (!box || !chip || box.scrollHeight <= box.clientHeight) return;
    const top = chip.getBoundingClientRect().top - box.getBoundingClientRect().top;
    if (top < 60 || top > box.clientHeight - 60) box.scrollTo({ top: box.scrollTop + top - box.clientHeight / 2, behavior: "smooth" });
  }, [active]);

  // ── الوصولُ إلى مادّةٍ برابطها: إن حجبها البحثُ رُفع، ثمّ تومض لتُعرف
  const flash = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.removeAttribute("data-flash");
    void el.offsetWidth;
    el.setAttribute("data-flash", "");
    window.setTimeout(() => el.removeAttribute("data-flash"), 1800);
  }, []);
  const pendingHash = useRef<string | null>(null);
  const live = useRef({ filtering, hits });
  useEffect(() => { live.current = { filtering, hits }; });
  useEffect(() => {
    const go = (first?: boolean) => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!/^[mb]\d+$/.test(id)) return;
      const { filtering: f, hits: h } = live.current;
      if (f && (id.startsWith("b") || !h.has(Number(id.slice(1))))) { pendingHash.current = id; setQ(""); return; }
      if (first) document.getElementById(id)?.scrollIntoView({ block: "start" });
      flash(id);
    };
    const onHash = () => go();
    go(true);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [flash]);
  useEffect(() => {
    if (filtering || !pendingHash.current) return;
    const id = pendingHash.current;
    pendingHash.current = null;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
    flash(id);
  }, [filtering, flash]);

  // ── الورقة: عنوانُ الوثيقة في رأس كلّ صفحة، وختامُها يُكتب لحظةَ الطباعة. والوثيقةُ تُطبع كاملةً أبدًا
  const [paper, setPaper] = useState<{ at: string; url: string; qr: string } | null>(null);
  const liveQ = useRef(q);
  useEffect(() => { liveQ.current = q; });
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--rgp-title", JSON.stringify(doc.title));
    let kept = "";
    const before = () => {
      const url = `${location.origin}${location.pathname}`;
      kept = liveQ.current;
      flushSync(() => { setQ(""); setPaper({ at: PRINT_DATE.format(new Date()), url, qr: qrSvg({ ...defaultQrSpec(url), size: 160 }) }); });
    };
    const after = () => { if (kept) setQ(kept); kept = ""; };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      root.style.removeProperty("--rgp-title");
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, [doc.title]);

  const copy = (a: RegArticle) => {
    flash(`m${a.no}`);
    copyText(articleCopy(doc.title, a, `${location.origin}${location.pathname}#m${a.no}`))
      .then(() => toast.success(`نُسخت المادة ${a.no}`, { duration: 3000 }))
      .catch(() => toast.error("تعذّر نسخُ المادة"));
  };

  const nav = (
    <nav className="ad-acc-index ad-rg-nav" aria-label="أبواب الوثيقة">
      {doc.chapters.map((c, i) => {
        const [, name] = chapterParts(c.title);
        const nos = c.articles.map((a) => a.no);
        const shown = !filtering || nos.some((n) => hits.has(n));
        const on = active !== null && nos.includes(active);
        return (
          <div key={i} className="ad-rg-nav-ch" data-off={shown ? undefined : ""}>
            <a href={`#b${i + 1}`} aria-current={on || undefined} onClick={() => setNavOpen(false)}>
              <span className="ad-acc-index-ic" aria-hidden><span className="ad-nr-num">{two(i + 1)}</span></span>
              <span className="ad-rg-nav-t">{name ?? doc.title}</span>
              <small className="ad-rg-nav-r">{rangeOf(nos)}</small>
            </a>
            <div className="ad-rg-chips">
              {c.articles.map((a) => (
                <a key={a.no} href={`#m${a.no}`} className="ad-rg-chip" aria-label={`المادة ${a.no}: ${latin(a.title)}`}
                  aria-current={active === a.no ? "location" : undefined} data-off={filtering && !hits.has(a.no) ? "" : undefined}
                  onClick={() => setNavOpen(false)}>{a.no}</a>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
  // «اطبع الوثيقة» تحت ورقة «الأبواب»، وفي الجوّال أوّلَ نافذتها (محمد ٢٠٢٦-١١-٢٣)
  const printBtn = <div className="ad-rg-print"><AdButton variant="line" icon={<Printer />} onClick={() => { flushSync(() => setNavOpen(false)); window.print(); }}>اطبع الوثيقة</AdButton></div>;
  const search = <AdTools search={{ value: q, onChange: setQ, placeholder: "كلمةٌ أو رقمُ مادّة" }} />;
  const facts: PubReadFact[] = [
    { icon: <ListNumbers />, text: arCount(total, AR_ARTICLE) },
    { icon: <BookOpenText />, text: arCount(doc.chapters.length, AR_CHAPTER) },
  ];

  return (
    <RegTextProvider value={ctx}>
      <div className="ad-rg-doc">
        {/* الورقةُ وحدها: الترويسةُ وفهرسُ الأبواب (لا تُرى على الشاشة) */}
        <header className="rgp-head">
          {/* eslint-disable-next-line @next/next/no-img-element -- شعارٌ للورق وحدَه */}
          <img className="rgp-logo" src="/brand/logo-horizontal.svg" alt="نادي أدِيب" />
          <p className="rgp-title">{doc.title}</p>
          <p className="rgp-sum">{doc.summary}</p>
          <p className="rgp-facts">{factsOf(total, doc.chapters.length)}</p>
        </header>
        <section className="rgp-toc">
          <p className="rgp-toc-h">الأبواب</p>
          <ol>
            {doc.chapters.map((c, i) => (
              <li key={i}><span>{c.title ?? doc.title}</span><i /><span>{rangeWords(c.articles.map((a) => a.no))}</span></li>
            ))}
          </ol>
        </section>

        <PubRead flat back={preview ? undefined : { href: base, label: "العودة إلى أنظمة أدِيب" }}
          tags={<AdBadge glass icon={<RegIcon slug={doc.slug} />}>{doc.slug === "constitution" ? "الدستور" : "نظام"}</AdBadge>}
          title={doc.title} dek={doc.summary} facts={facts}
          toc={(
            // **الجانبُ على ورقة** (محمد ٢٠٢٦-١١-٢٣: «هل لأنّ الشريطَ الجانبيّ يحتاج إلى أرضية؟»): بجانب ألواح الأبواب وأوراق موادّها كان
            // فهرسًا عاريًا على الأرض لا يُمسك العين. فصار قسمًا من الهويّة برأسه («الأبواب») وفيه البحثُ ثمّ الأبواب، والأداةُ داخله مصبوغة
            <>
            <section className="ad-sec ad-rg-sidesheet" aria-label="أبواب الوثيقة">
              <header className="ad-sec-head">
                <span className="ad-sec-ic" aria-hidden><ListBullets /></span>
                <span className="ad-sec-t"><h2>الأبواب</h2><p>{arCount(doc.chapters.length, AR_CHAPTER)}، {arCount(total, AR_ARTICLE)}</p></span>
              </header>
              <div className="ad-rg-side" ref={sideRef}>
                {search}
                {nav}
              </div>
            </section>
            {printBtn}
            </>
          )}>
          {note}
          {/* في الضيّق لا جانب: البحثُ أوّلَ المتن */}
          <div className="ad-rg-narrow">{search}</div>
          {/* العدّادُ لقارئ الشاشة وحده (قاعدةُ أدوات الهويّة: «ولا عدّادَ مرئيّ»)، والجانبُ يقول بصرًا أين النتائج؛ و«لا نتائج» قطعةُ الهويّة بمسحها (محمد ٢٠٢٦-١١-٢٣) */}
          {filtering ? (
            <p className="ad-sr" role="status">{hits.size ? `${arCount(hits.size, AR_ARTICLE)} من ${total}` : `لا مادّةَ فيها «${q.trim()}»`}</p>
          ) : null}
          {filtering && !hits.size ? (
            <AdEmpty icon={<MagnifyingGlass />} title="لا نتائج لبحثك" desc={`لا مادّةَ في ${doc.title} فيها «${q.trim()}».`}
              action={<AdButton variant="soft" icon={<X />} onClick={() => setQ("")}>امسح البحث</AdButton>} />
          ) : null}

          {doc.chapters.map((c, i) => {
            const arts = c.articles.filter((a) => !filtering || hits.has(a.no));
            if (!arts.length) return null;
            const [kicker, name] = chapterParts(c.title);
            return (
              <section key={i} className="ad-rg-ch">
                <h2 className="ad-nr-chap" id={`b${i + 1}`}>
                  <span className="ad-nr-chap-t">{name ?? doc.title}</span>
                  <span className="rgp-ch">{c.title ?? doc.title}</span>
                  {kicker ? <AdBadge glass>{kicker}</AdBadge> : null}
                </h2>
                <div className="ad-rg-arts">
                  {arts.map((a) => (
                    <section key={a.no} id={`m${a.no}`} className="ad-rg-art">
                      <span className="ad-rg-art-no" aria-hidden>{a.no}</span>
                      <div className="ad-rg-art-b">
                        <RegBlocks blocks={a.blocks} lead={<span className="ad-rg-art-t" data-no={a.no}><span className="rgp-no">المادة ({a.no}) </span><span className="ad-sr">المادة {a.no}: </span><Marked text={latin(a.title)} terms={terms} />:</span>} />
                        <div className="ad-rg-acts">
                          <AdButton variant="soft" size="sm" icon={<Copy />} onClick={() => copy(a)}>نسخ المادة</AdButton>
                          {cited[a.no] ? <CitedBy keys={cited[a.no]} open={citedOpen === a.no} onToggle={() => setCitedOpen((o) => (o === a.no ? null : a.no))} /> : null}
                        </div>
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            );
          })}

          <div ref={endRef} aria-hidden />
          <div className="ad-rg-next">
            <AdCard title={next ? next.title : "أنظمة أدِيب"} href={next ? `${base}/${next.slug}` : base} seed={next?.slug ?? "index"}
              stub={{ icon: <RegIcon slug={next?.slug ?? ""} />, big: "", small: next ? "الوثيقة التالية" : "الفهرس" }}
              meta={next ? [{ icon: <ListNumbers />, text: factsOf(next.facts.articles, next.facts.chapters) }] : [{ icon: <ArrowLeft />, text: "عودةٌ إلى الفهرس" }]}
              // **فعلُ التذكرة في قاعها** (محمد ٢٠٢٦-١١-٢٣: «زرٌّ كي يُفهم أنّه يُحال إلى التالي»): التذكرةُ كلُّها رابط، لكنّ ذلك لا يُرى قبل المرور
              foot={<AdButton variant="fill" size="sm" href={next ? `${base}/${next.slug}` : base} icon={<ArrowLeft />} iconEnd>{next ? "اقرأ الوثيقة التالية" : "العودة إلى الفهرس"}</AdButton>} />
          </div>

          {paper ? (
            <footer className="rgp-end">
              <div className="rgp-qr" dangerouslySetInnerHTML={{ __html: paper.qr }} />
              <p><span>طُبعت هذه النسخة في {paper.at}، والنسخةُ السارية في الرابط:</span><bdi dir="ltr">{paper.url}</bdi></p>
            </footer>
          ) : null}
        </PubRead>

        <div className="ad-rg-fab" data-off={pastEnd ? "" : undefined}>
          <AdButton variant="fill" icon={<ListBullets />} onClick={() => setNavOpen(true)}>الأبواب</AdButton>
        </div>
        <Modal open={navOpen} onClose={() => setNavOpen(false)} title={doc.title} description="الأبواب">
          {/* في الجوّال أوّلَ النافذة: آخرُها بعد أحد عشر بابًا بأرقامها لا يُبلغ إلّا بتمريرٍ طويل؛ ثمّ البحثُ، فلا يصعد من نزل ليبحث (محمد ٢٠٢٦-١١-٢٣) */}
          {printBtn}
          {search}
          {nav}
        </Modal>
      </div>
    </RegTextProvider>
  );
}
