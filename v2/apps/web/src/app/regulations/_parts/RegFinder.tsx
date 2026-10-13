"use client";

// البحثُ في الدستور والأنظمة كلِّها من رأس الفهرس: كلمةٌ تُكتب فتظهر الموادُّ التي فيها، مجموعةً
// تحت وثائقها، ولكلٍّ مقتطفُها والكلمةُ معلَّمةٌ فيه. فمن جاء يسأل «ماذا يحدث لو …» وجد المادّةَ
// قبل أن يعرف في أيّ نظامٍ هي.
//
// والفهرسُ (٢٣٦ مادّة) لا يُحمَّل مع الصفحة: يُطلب أوّلَ ما يُلمس الحقل.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Badge, Card, Field, matchesSearch } from "@adeeb/design-system";
import { TextAa } from "@phosphor-icons/react";
import { CaretLeft, CaretRight, MagnifyingGlass } from "@/app/_components/glyphs";
import { EmptyState } from "@/app/dashboard/_components/EmptyState";
import { Tabs } from "@/app/dashboard/_components/Tabs";
import { arCount } from "@/lib/arabicCount";
import { searchTerms, snippet } from "@/lib/regulations/highlight";
import { AR_ARTICLE, AR_DOC_GEN, latin } from "@/lib/regulations/text";
import type { RegSearchRow } from "@/lib/regulations/data";
import { Marked } from "./RegText";
import { RegIcon } from "./RegIcon";

export function RegFinder({ base, titles, children }: { base: string; titles: Record<string, string>; children: ReactNode }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<RegSearchRow[] | null>(null);
  const asked = useRef(false);

  const load = () => {
    if (asked.current) return;
    asked.current = true;
    fetch(`${base}/search`)
      .then((r) => r.json() as Promise<RegSearchRow[]>)
      .then(setRows)
      .catch(() => {
        asked.current = false;
      });
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
  // وحين لا نتيجة: كرتٌ بحالة الفراغ في الموقع، والفهرسُ نفسُه تحته فلا تنتهي الصفحةُ عند «لا شيء»
  // (المالك ٢٠٢٦-١٠-١٣)، ومسحُ الكلمة في الحقل نفسِه.
  // تصفيةُ النتائج بوثيقة (المالك ٢٠٢٦-١٠-١٣): تبويباتُ الموقع (`Tabs` الكبسوليّة) — «الكلّ» بعدد النتائج
  // ثمّ وثيقةٌ وثيقةٌ بعددها، فالتبويباتُ هي سطرُ الحال نفسُه لا سطرٌ ثانٍ يكرّر عددها. وإن خلت الوثيقةُ
  // المختارةُ من نتائج الكلمة الجديدة عادت النتائجُ كلُّها، فلا تبقى الصفحةُ فارغةً بتصفيةٍ لا تُرى.
  const [only, setOnly] = useState<string | null>(null);
  const picked = only && groups.some((g) => g.slug === only) ? only : null;
  const shown = picked ? groups.filter((g) => g.slug === picked) : groups;

  // وصفُّ التبويبات لا يلتفّ، فإن فاض عن عرضه بقيت تبويباتٌ وراء أحد طرفيه: تتلاشى تلك الحافّةُ ويظهر
  // عندها زرٌّ يسحبه، في الطرفين كليهما متى كان وراء كلٍّ شيء. (الطرفُ في العربيّة سالبٌ: `scrollLeft` ينقص نحوه.)
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ back: false, more: false });
  const measure = useCallback(() => {
    const el = rail.current?.querySelector<HTMLElement>(".tabs");
    const gone = el ? Math.abs(el.scrollLeft) : 0;
    const back = gone > 4;
    const more = !!el && el.scrollWidth - el.clientWidth - gone > 4;
    setEdges((e) => (e.back === back && e.more === more ? e : { back, more }));
  }, []);
  useEffect(() => {
    const el = rail.current?.querySelector<HTMLElement>(".tabs");
    if (!el) return;
    const id = requestAnimationFrame(measure);
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(id);
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure, groups.length, count]);
  const slide = (dir: 1 | -1) => {
    const el = rail.current?.querySelector<HTMLElement>(".tabs");
    el?.scrollBy({ left: -dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <>
      <div className="reg-find">
        <Field
          label="ابحث في الدستور والأنظمة"
          icon={<MagnifyingGlass />}
          innerIcon={<TextAa />}
          placeholder="كلمةٌ أو موضوع"
          value={q}
          onFocus={load}
          onChange={(e) => {
            load();
            setQ(e.target.value);
          }}
          type="search"
        />
      </div>

      {terms.length ? (
        <div className="reg-hits">
          {rows ? (
            count ? (
              <div className="reg-hits-bar" ref={rail} data-back={edges.back ? "" : undefined} data-more={edges.more ? "" : undefined}>
                <p className="sr-only" role="status">
                  {arCount(count, AR_ARTICLE)} في {arCount(groups.length, AR_DOC_GEN)}
                </p>
                <Tabs
                  variant="pill"
                  value={picked ?? "all"}
                  onValueChange={(v) => setOnly(v === "all" ? null : v)}
                  items={[
                    { value: "all", label: "الكلّ", badge: String(count) },
                    ...groups.map((g) => ({
                      value: g.slug,
                      label: g.slug === "constitution" ? "الدستور" : titles[g.slug].replace(/^نظام /, ""),
                      badge: String(g.rows.length),
                    })),
                  ]}
                />
                {edges.back ? (
                  <button type="button" className="reg-rail-go reg-rail-back" aria-label="التبويبات السابقة" onClick={() => slide(-1)}>
                    <CaretRight aria-hidden />
                  </button>
                ) : null}
                {edges.more ? (
                  <button type="button" className="reg-rail-go reg-rail-more" aria-label="تبويباتٌ أخرى" onClick={() => slide(1)}>
                    <CaretLeft aria-hidden />
                  </button>
                ) : null}
              </div>
            ) : (
              <Card className="reg-none" role="status">
                <EmptyState icon={<MagnifyingGlass />} title={`لا مادّةَ فيها «${q.trim()}»`} />
              </Card>
            )
          ) : null}
          {shown.map((g) => (
            <Card key={g.slug} className="reg-ch">
              <h2 className="reg-band">
                <span className="reg-band-ic">
                  <RegIcon slug={g.slug} />
                </span>
                <span className="reg-band-t">{titles[g.slug]}</span>
                <Badge variant="glass">{arCount(g.rows.length, AR_ARTICLE)}</Badge>
              </h2>
              {g.rows.map((r) => (
                <Link key={r.n} href={`${base}/${r.s}#m${r.n}`} className="reg-hit">
                  <span className="reg-hit-no">{r.n}</span>
                  <span className="reg-hit-b">
                    <span className="reg-hit-t"><Marked text={latin(r.t)} terms={terms} /></span>
                    <span className="reg-hit-x"><Marked text={latin(snippet(r.x, terms))} terms={terms} /></span>
                  </span>
                </Link>
              ))}
            </Card>
          ))}
          {rows && !count ? children : null}
        </div>
      ) : (
        children
      )}
    </>
  );
}
