"use client";

// صفحةُ الوثيقة بلغة الموقع (المالك ٢٠٢٦-١٠-١٣): صدرُها لوحٌ مذهّبٌ منقوشٌ كشُرفة الخبر، وكلُّ بابٍ
// كرتٌ رأسُه صلبٌ منقوش، ورقمُ المادّة رقاقةٌ في هامشها. وجانبٌ لاصقٌ فيه البحثُ وكرتُ الأبواب
// وأرقامُ موادّها يتبع القراءةَ فيُضيء ما تحت العين.
//
// **ورقمُ المادّة للعرض، ونسخُها زرٌّ ظاهرٌ تحتها** (المالك ٢٠٢٦-١٠-١٣): كان الرقمُ نفسُه ينسخ الرابطَ فلا
// يُعرف ذلك إلّا بنقرةٍ خاطئةٍ تمسح الحافظة. فصار «نسخ المادة» زرًّا ثابتًا بكلمته ورمزه، ينسخ المادّةَ
// بمرجعها ومتنها ورابطها، والنسخُ يُعلَن بإشعار. فالمادّةُ تُستشهَد برابطٍ يفتح عليها لا على رأس النظام.
// **والبحثُ يُبقي ولا يُعلِّم فقط:** ما لا تجد فيه الكلمةَ يغيب، والكلمةُ معلَّمةٌ فيما بقي.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { Badge, Card, CardHeader, Field, Modal, matchesSearch } from "@adeeb/design-system";
import { BookOpenText, Copy, ListBullets, ListNumbers, Printer, TextAa } from "@phosphor-icons/react";
import { ArrowLeft, ArrowRight, MagnifyingGlass } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { defaultQrSpec } from "@/app/dashboard/tools/qr/defaults";
import { arCount } from "@/lib/arabicCount";
import { copyText } from "@/lib/clipboard";
import { qrSvg } from "@/lib/qr";
import { searchTerms } from "@/lib/regulations/highlight";
import { AR_ARTICLE, AR_CHAPTER, articleCopy, articleText, chapterParts, factsOf, latin, rangeOf, rangeWords } from "@/lib/regulations/text";
import type { RegPreview } from "@/lib/regulations/text";
import type { RegArticle, RegDoc as Doc } from "@/lib/regulations/types";
import { CitedBy, Marked, RegBlocks, RegTextProvider } from "./RegText";
import { RegIcon } from "./RegIcon";

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

/** تاريخُ الطباعة بالميلاديّ وأرقامٍ لاتينيّة: «13 أكتوبر 2026». */
const PRINT_DATE = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" });

export function RegDoc({ doc, base, previews, cited, docNames, counts, next }: RegDocProps) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<number | null>(null);
  const toast = useToast();
  const [navOpen, setNavOpen] = useState(false);
  // زرُّ «الأبواب» العائم يغيب متى انتهت الموادّ: ما بعدها (الوثيقةُ التالية وتذييلُ الموقع) لا أبوابَ له،
  // وتذييلُ الموقع أزرقُ كالزرّ فيذوب فيه (المالك ٢٠٢٦-١٠-١٣).
  const [pastEnd, setPastEnd] = useState(false);
  // ويُقاس مع كلّ تمريرٍ في قارئ المادّة أدناه لا بمراقِب تقاطع: القفزةُ السريعة من ما بعد النهاية إلى ما
  // قبلها لا تعبر الحدَّ، فلا يُبلَّغ المراقِبُ ويبقى الزرُّ غائبًا (قِيس).
  const endRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLDivElement>(null);

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

  // ── المادّةُ تحت العين: آخرُ مادّةٍ عبر رأسُها خطَّ القراءة.
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const els = document.querySelectorAll<HTMLElement>(".reg-art");
      let cur: number | null = null;
      for (const el of els) {
        if (el.getBoundingClientRect().top - HEAD_OFFSET > 8) break;
        cur = Number(el.id.slice(1));
      }
      setActive(cur ?? (els[0] ? Number(els[0].id.slice(1)) : null));
      const end = endRef.current;
      if (end) setPastEnd(end.getBoundingClientRect().top < window.innerHeight);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [q]);

  // والجانبُ يتبعها: رقمُها المضيءُ لا يغيب عن نافذته.
  useEffect(() => {
    const aside = asideRef.current;
    const chip = aside?.querySelector<HTMLElement>(".reg-chip[aria-current]");
    if (!aside || !chip || aside.scrollHeight <= aside.clientHeight) return;
    const top = chip.getBoundingClientRect().top - aside.getBoundingClientRect().top;
    if (top < 60 || top > aside.clientHeight - 60) {
      aside.scrollTo({ top: aside.scrollTop + top - aside.clientHeight / 2, behavior: "smooth" });
    }
  }, [active]);

  // ── الوصولُ إلى مادّةٍ برابطها: إن حجبها البحثُ رُفع، ثمّ تومض لتُعرف.
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
  useEffect(() => {
    live.current = { filtering, hits };
  });
  useEffect(() => {
    const go = (first?: boolean) => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!/^[mb]\d+$/.test(id)) return;
      const { filtering: f, hits: h } = live.current;
      if (f && (id.startsWith("b") || !h.has(Number(id.slice(1))))) {
        pendingHash.current = id;
        setQ("");
        return;
      }
      // أوّلَ الفتح يُبثّ المتنُ في حاويةٍ مخفيّةٍ ثمّ يُنقل، فلا يبلغه قفزُ المتصفّح إلى الرابط — فيُقفَز إليه هنا.
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

  // ── الورقة (المالك ٢٠٢٦-١٠-١٣): عنوانُ الوثيقة في رأس كلّ صفحة يقرؤه `@page` من الجذر، وختامُها
  // (تاريخُ الطباعة ورابطُ النسخة السارية ورمزُها) يُكتب لحظةَ الطباعة. **والوثيقةُ تُطبع كاملةً أبدًا:**
  // إن صفّاها البحثُ رُفع ثمّ أُعيد بعد الطباعة، فنصٌّ نظاميٌّ ناقصٌ على الورق يُضلّل.
  const [paper, setPaper] = useState<{ at: string; url: string; qr: string } | null>(null);
  const liveQ = useRef(q);
  useEffect(() => {
    liveQ.current = q;
  });
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--rgp-title", JSON.stringify(doc.title));
    let kept = "";
    const before = () => {
      const url = `${location.origin}${location.pathname}`;
      kept = liveQ.current;
      flushSync(() => {
        setQ("");
        setPaper({ at: PRINT_DATE.format(new Date()), url, qr: qrSvg({ ...defaultQrSpec(url), size: 160 }) });
      });
    };
    const after = () => {
      if (kept) setQ(kept);
      kept = "";
    };
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
    <nav className="reg-nav" aria-label="أبواب الوثيقة">
      {doc.chapters.map((c, i) => {
        const [, name] = chapterParts(c.title);
        const nos = c.articles.map((a) => a.no);
        const shown = !filtering || nos.some((n) => hits.has(n));
        return (
          <div key={i} className="reg-nav-ch" data-on={active !== null && nos.includes(active) ? "" : undefined} data-off={shown ? undefined : ""}>
            <a href={`#b${i + 1}`} className="reg-nav-h" onClick={() => setNavOpen(false)}>
              <span>{name ?? doc.title}</span>
              <small>{rangeOf(nos)}</small>
            </a>
            <div className="reg-chips">
              {c.articles.map((a) => (
                <a
                  key={a.no}
                  href={`#m${a.no}`}
                  className="reg-chip"
                  aria-label={`المادة ${a.no}: ${latin(a.title)}`}
                  aria-current={active === a.no ? "location" : undefined}
                  data-off={filtering && !hits.has(a.no) ? "" : undefined}
                  onClick={() => setNavOpen(false)}
                >
                  {a.no}
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <RegTextProvider value={ctx}>
      <article className="reg">
        <header className="rgp-head">
          {/* eslint-disable-next-line @next/next/no-img-element -- شعارٌ للورق وحدَه، ملفٌّ صغيرٌ يُحمَّل مع الصفحة */}
          <img className="rgp-logo" src="/brand/logo-horizontal.svg" alt="نادي أدِيب" />
          <p className="rgp-title">{doc.title}</p>
          <p className="rgp-sum">{doc.summary}</p>
          <p className="rgp-facts">{factsOf(total, doc.chapters.length)}</p>
        </header>
        <section className="rgp-toc">
          <p className="rgp-toc-h">الأبواب</p>
          <ol>
            {doc.chapters.map((c, i) => (
              <li key={i}>
                <span>{c.title ?? doc.title}</span>
                <i />
                <span>{rangeWords(c.articles.map((a) => a.no))}</span>
              </li>
            ))}
          </ol>
        </section>
        <header className="reg-ledge">
          <Link href={base} className="reg-pill reg-up">
            <ArrowRight size={14} aria-hidden />
            أنظمة أدِيب
          </Link>
          <div className="reg-ledge-h">
            <span className="reg-ledge-ic">
              <RegIcon slug={doc.slug} />
            </span>
            <h1 className="reg-h1">{doc.title}</h1>
          </div>
          <p className="reg-sum">{doc.summary}</p>
          <div className="reg-meta">
            <span className="reg-meta-i">
              <ListNumbers aria-hidden />
              {arCount(total, AR_ARTICLE)}
            </span>
            <span className="reg-meta-i">
              <BookOpenText aria-hidden />
              {arCount(doc.chapters.length, AR_CHAPTER)}
            </span>
            <button type="button" className="reg-pill reg-print" onClick={() => window.print()}>
              <Printer aria-hidden />
              اطبع
            </button>
          </div>
        </header>

        <div className="reg-grid">
          <aside className="reg-aside">
            <Field
              label="بحث في الموادّ"
              icon={<MagnifyingGlass />}
              innerIcon={<TextAa />}
              placeholder="كلمةٌ أو رقمُ مادّة"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
            />
            <Card className="reg-side">
              <CardHeader variant="soft" icon={<ListBullets aria-hidden />} title="الأبواب" />
              <div className="reg-side-nav" ref={asideRef}>
                {nav}
              </div>
            </Card>
          </aside>

          <div className="reg-main">
            {filtering ? (
              <p className="reg-status" role="status">
                {hits.size ? `${arCount(hits.size, AR_ARTICLE)} من ${total}` : `لا مادّةَ فيها «${q.trim()}»`}
              </p>
            ) : null}

            {doc.chapters.map((c, i) => {
              const arts = c.articles.filter((a) => !filtering || hits.has(a.no));
              if (!arts.length) return null;
              const [kicker, name] = chapterParts(c.title);
              return (
                <Card key={i} className="reg-ch">
                  <h2 className="reg-band" id={`b${i + 1}`}>
                    <span className="reg-band-ic">
                      <BookOpenText aria-hidden />
                    </span>
                    <span className="reg-band-t">{name ?? doc.title}</span>
                    <span className="rgp-ch">{c.title ?? doc.title}</span>
                    {kicker ? <Badge variant="glass">{kicker}</Badge> : null}
                  </h2>
                  {arts.map((a) => (
                    <section key={a.no} id={`m${a.no}`} className="reg-art">
                      <div className="reg-gut">
                        <span className="reg-no">{a.no}</span>
                      </div>
                      <div className="min-w-0">
                        <RegBlocks blocks={a.blocks} lead={<span className="reg-art-t"><span className="rgp-no">المادة ({a.no}) </span><Marked text={latin(a.title)} terms={terms} />:</span>} />
                        <div className="reg-art-acts">
                          <button type="button" className="reg-act" onClick={() => copy(a)}>
                            <Copy aria-hidden />
                            نسخ المادة
                          </button>
                          {cited[a.no] ? <CitedBy keys={cited[a.no]} /> : null}
                        </div>
                      </div>
                    </section>
                  ))}
                </Card>
              );
            })}

            <div ref={endRef} aria-hidden />
            <Link href={next ? `${base}/${next.slug}` : base} className="reg-next">
              <Card interactive>
                <CardHeader
                  className="reg-next-h"
                  icon={<RegIcon slug={next?.slug ?? ""} />}
                  title={next ? next.title : "أنظمة أدِيب"}
                  subtitle={next ? `الوثيقة التالية، ${factsOf(next.facts.articles, next.facts.chapters)}` : "عودةٌ إلى الفهرس"}
                  actions={
                    <span className="reg-go">
                      <ArrowLeft size={20} aria-hidden />
                    </span>
                  }
                />
              </Card>
            </Link>

            {paper ? (
              <footer className="rgp-end">
                <div className="rgp-qr" dangerouslySetInnerHTML={{ __html: paper.qr }} />
                <p>
                  <span>طُبعت هذه النسخة في {paper.at}، والنسخةُ السارية في الرابط:</span>
                  <bdi dir="ltr">{paper.url}</bdi>
                </p>
              </footer>
            ) : null}
          </div>
        </div>

        <button type="button" className="reg-fab" data-off={pastEnd ? "" : undefined} tabIndex={pastEnd ? -1 : undefined} onClick={() => setNavOpen(true)}>
          <ListBullets aria-hidden />
          الأبواب
        </button>
        <Modal open={navOpen} onClose={() => setNavOpen(false)} title={doc.title}>
          {nav}
        </Modal>
      </article>
    </RegTextProvider>
  );
}
