"use client";

import { useState } from "react";
import { Badge, Checkbox, Container, Segmented } from "@adeeb/design-system";
import { Gear, House, Newspaper } from "@phosphor-icons/react";
import { Star } from "@/app/_components/glyphs";
import { NewsCard } from "@/app/news/NewsCard";
import type { PublicNews } from "@/app/news/data";

type Mode = "today" | "a" | "b";

const MODES: { value: Mode; label: string }[] = [
  { value: "today", label: "اليوم" },
  { value: "a", label: "(أ) نوحّدهما" },
  { value: "b", label: "(ب) نفصلهما" },
];

const SAY: Record<Mode, string> = {
  today: "أداتان في مكانين: «الأخبار المعروضة» في إدارة الموقع تقرّر صدر الرئيسيّة، و«تمييز» في غرفة الأخبار يضع النجمة. ولا تعرف إحداهما بالأخرى.",
  a: "أداةٌ واحدة في غرفة الأخبار: «مميّز». تضع الخبرَ في صدر الرئيسيّة وتضع عليه النجمة معًا، وإلغاؤها ينزعهما معًا.",
  b: "أداتان في غرفة الأخبار: «في صدر الرئيسيّة» و«مميّز». والمميّز يتصدّر صفحة الأخبار (وهذا تصميمٌ جديدٌ لصفحةٍ اعتمدتَها).",
};

export function FeaturedLab({ news, hero: hero0 }: { news: PublicNews[]; hero: string[] }) {
  const [mode, setMode] = useState<Mode>("today");
  const [hero, setHero] = useState<string[]>(hero0);
  const [star, setStar] = useState<Set<string>>(() => new Set(news.filter((n) => n.featured).map((n) => n.id)));

  const starred = (id: string) => (mode === "a" ? hero.includes(id) : star.has(id));
  const toggleHero = (id: string) => setHero((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));
  const toggleStar = (id: string) => setStar((s) => { const t = new Set(s); if (t.has(id)) t.delete(id); else t.add(id); return t; });
  const pick = (m: Mode) => { setMode(m); setHero(hero0); setStar(new Set(news.filter((n) => n.featured).map((n) => n.id))); };

  const byId = new Map(news.map((n) => [n.id, n]));
  const slides = hero.map((id) => byId.get(id)).filter((n): n is PublicNews => !!n);
  const grid = news.map((n) => ({ ...n, featured: starred(n.id) }));
  const ordered = mode === "b" ? [...grid.filter((n) => n.featured), ...grid.filter((n) => !n.featured)] : grid;

  const mismatch = (n: PublicNews) => {
    if (mode === "a") return null;
    const h = hero.includes(n.id), s = star.has(n.id);
    if (mode === "today" && h && !s) return "في الصدر بلا نجمة";
    if (mode === "today" && s && !h) return "نجمةٌ بلا صدر";
    return null;
  };

  const row = (n: PublicNews, controls: React.ReactNode) => (
    <div key={n.id} className="nft-row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={n.cover!} alt="" className="nft-thumb" />
      <div className="nft-row-main">
        <b>{n.title}</b>
        {mismatch(n) ? <Badge tone="warning" dot>{mismatch(n)}</Badge> : null}
      </div>
      <div className="nft-ctl">{controls}</div>
    </div>
  );

  return (
    <main className="py-10">
      <Container>
        <div className="nft">
          <header className="nft-head">
            <h1>«مميّز» و«الأخبار المعروضة»</h1>
            <p>ببيانات الموقع الحقيقيّة. جرّب التبديل في «الإدارة» وانظر أثره فيما يراه الزائر تحته. لا يُحفَظ شيء.</p>
            <Segmented wide aria-label="الحال" items={MODES} value={mode} onValueChange={(v) => pick(v as Mode)} />
            <p className="nft-say">{SAY[mode]}</p>
          </header>

          <section className="nft-sec">
            <h2><Gear size={22} aria-hidden />الإدارة</h2>
            {mode === "today" ? (
              <div className="nft-two">
                <div className="nft-place">
                  <p className="nft-where"><House size={16} aria-hidden />إدارة الموقع ← الإعلانات ← «الأخبار المعروضة»</p>
                  {news.map((n) => row(n, <Checkbox label="في الصدر" checked={hero.includes(n.id)} onChange={() => toggleHero(n.id)} />))}
                </div>
                <div className="nft-place">
                  <p className="nft-where"><Newspaper size={16} aria-hidden />غرفة الأخبار ← قائمة الخبر ← «تمييز»</p>
                  {news.map((n) => row(n, <Checkbox label="مميّز" checked={star.has(n.id)} onChange={() => toggleStar(n.id)} />))}
                </div>
              </div>
            ) : (
              <div className="nft-place">
                <p className="nft-where"><Newspaper size={16} aria-hidden />غرفة الأخبار</p>
                {news.map((n) => row(n, mode === "a"
                  ? <Checkbox label="مميّز" checked={hero.includes(n.id)} onChange={() => toggleHero(n.id)} />
                  : <><Checkbox label="في الصدر" checked={hero.includes(n.id)} onChange={() => toggleHero(n.id)} /><Checkbox label="مميّز" checked={star.has(n.id)} onChange={() => toggleStar(n.id)} /></>))}
              </div>
            )}
          </section>

          <section className="nft-sec">
            <h2><House size={22} aria-hidden />ما يراه الزائر: صدر الصفحة الرئيسيّة</h2>
            <p className="nft-note">الشرائح التي تتعاقب أعلى الرئيسيّة، بترتيبها.</p>
            {slides.length ? (
              <div className="nft-strip">
                {slides.map((n, i) => (
                  <figure key={n.id} className="nft-slide">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={n.cover!} alt="" />
                    <span className="nft-slide-n">{i + 1}</span>
                    {starred(n.id) ? <span className="nft-slide-star"><Star size={13} aria-hidden /></span> : null}
                    <figcaption>{n.title}</figcaption>
                  </figure>
                ))}
              </div>
            ) : <p className="nft-note">الصدر بلا أخبار: يظهر لوحه وحده.</p>}
          </section>

          <section className="nft-sec">
            <h2><Newspaper size={22} aria-hidden />ما يراه الزائر: صفحة الأخبار</h2>
            <p className="nft-note">{mode === "b" ? "المميّز يتصدّر الصفحة، ثم البقيّة بالأحدث." : "بالأحدث دائمًا، والتمييز نجمةٌ وصفةٌ على الكرت فقط."}</p>
            <div className="card-grid">{ordered.map((n) => <NewsCard key={n.id} n={n} />)}</div>
          </section>
        </div>
      </Container>
    </main>
  );
}
