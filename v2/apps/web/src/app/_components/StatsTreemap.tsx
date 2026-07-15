"use client";

import { useEffect, useRef } from "react";

export type StatItem = { label: string; n: number };

const ICONS: Record<string, string> = {
  film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9.2l4.5 2.8L10 14.8z" fill="currentColor" stroke="none"/></svg>',
  cast: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none"/><path d="M7 7a7 7 0 000 10M17 7a7 7 0 010 10M4 4a11 11 0 000 16M20 4a11 11 0 010 16"/></svg>',
  cap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 4l9 4.5-9 4.5-9-4.5z"/><path d="M6.5 10.5V15c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6v-4.5"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="7" cy="12" r="2.3"/><circle cx="17" cy="6.5" r="2.3"/><circle cx="17" cy="17.5" r="2.3"/><path d="M9.1 10.9l5.8-3.3M9.1 13.1l5.8 3.3"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 19a6.5 6.5 0 0113 0"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 9.5h16M8 3v4M16 3v4"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9.5 14.5l5-5M8 12l-2 2a3 3 0 004 4l2-2M16 12l2-2a3 3 0 00-4-4l-2 2"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 4h10v4a5 5 0 01-10 0z"/><path d="M7 6H4.5a2.5 2.5 0 002.6 2.6M17 6h2.5a2.5 2.5 0 01-2.6 2.6"/><path d="M12 13v3M9.5 20h5l-.6-4h-3.8z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20V11M10 20V5M16 20v-6M22 20H2"/></svg>',
};

function iconFor(label: string): string {
  if (/مرئ|مادة|فيديو|صورة/.test(label)) return ICONS.film;
  if (/ظهور|إعلام|اعلام|وصول/.test(label)) return ICONS.cast;
  if (/ورش|تدريب|دورة/.test(label)) return ICONS.cap;
  if (/مشارك|مُشارك|تفاعل/.test(label)) return ICONS.share;
  if (/عضو|منتسب|أعضاء/.test(label)) return ICONS.user;
  if (/فعالي|نشاط|حدث|لقاء/.test(label)) return ICONS.cal;
  if (/ساعة|ساعات|وقت|زمن/.test(label)) return ICONS.clock;
  if (/شريك|شراك|رعا|داعم/.test(label)) return ICONS.link;
  if (/جائزة|جوائز|إنجاز|تكريم/.test(label)) return ICONS.trophy;
  return ICONS.chart;
}

function fmt(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

type Rect = { it: { s: StatItem; weight: number }; x: number; y: number; w: number; h: number };

/** Squarified Treemap: يقسّم المستطيل بحيث مساحة كل عنصر ∝ وزنه، بلا فراغ. */
function squarify(items: { s: StatItem; weight: number }[], W: number, H: number): Rect[] {
  let total = 0;
  items.forEach((it) => (total += it.weight));
  const scale = (W * H) / total;
  const data = items
    .map((it) => ({ it, area: it.weight * scale }))
    .sort((a, b) => b.area - a.area);
  const res: Rect[] = [];
  let x = 0,
    y = 0,
    w = W,
    h = H;
  let row: { it: { s: StatItem; weight: number }; area: number }[] = [];
  const worst = (rw: typeof row, len: number) => {
    let s = 0,
      mn = Infinity,
      mx = 0;
    for (const r of rw) {
      s += r.area;
      if (r.area < mn) mn = r.area;
      if (r.area > mx) mx = r.area;
    }
    return Math.max((len * len * mx) / (s * s), (s * s) / (len * len * mn));
  };
  const lay = (rw: typeof row) => {
    let s = 0;
    for (const r of rw) s += r.area;
    if (h <= w) {
      const sw = s / h;
      let oy = y;
      for (const r of rw) {
        const ch = r.area / sw;
        res.push({ it: r.it, x, y: oy, w: sw, h: ch });
        oy += ch;
      }
      x += sw;
      w -= sw;
    } else {
      const sh = s / w;
      let ox = x;
      for (const r of rw) {
        const cw = r.area / sh;
        res.push({ it: r.it, x: ox, y, w: cw, h: sh });
        ox += cw;
      }
      y += sh;
      h -= sh;
    }
  };
  let i = 0;
  while (i < data.length) {
    const len = Math.min(w, h);
    if (row.length === 0) {
      row.push(data[i]);
      i++;
      continue;
    }
    if (worst(row, len) >= worst([...row, data[i]], len)) {
      row.push(data[i]);
      i++;
    } else {
      lay(row);
      row = [];
    }
  }
  if (row.length) lay(row);
  return res;
}

/** كروت الإحصائيات بحجم الرقم — تُبنى إحداثياتها بعد قياس عرض الحاوية. */
export function StatsTreemap({ items }: { items: StatItem[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const maxN = Math.max(...items.map((s) => s.n));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rafs: number[] = [];

    const build = (immediate: boolean) => {
      const W = el.clientWidth;
      if (!W) return;
      const H = Math.round(Math.max(400, Math.min(580, W * 0.52)));
      el.style.height = `${H}px`;
      const rects = squarify(
        items.map((s) => ({ s, weight: Math.pow(s.n, 0.25) })),
        W,
        H,
      );
      el.innerHTML = rects
        .map((r) => {
          const s = r.it.s;
          const hero = s.n === maxN;
          const mn = Math.min(r.w, r.h);
          const fn = Math.max(15, Math.round(mn * (hero ? 0.26 : 0.24)));
          const showL = r.w > 108 && r.h > 76;
          const showI = r.w > 150 && r.h > 124;
          const txt = immediate || reduce ? fmt(s.n) : "0";
          return (
            `<div class="tm-tile" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px">` +
            `<div class="tm-card${hero ? " tm-hero" : ""}">` +
            (hero ? '<span class="tm-badge">الأبرز</span>' : "") +
            (showI ? `<div class="tm-ic">${iconFor(s.label)}</div>` : "") +
            `<div class="tm-body"><div class="tm-n" data-count="${s.n}" style="font-size:${fn}px">${txt}</div>` +
            (showL ? `<div class="tm-l">${s.label}</div>` : "") +
            `</div></div></div>`
          );
        })
        .join("");
    };

    const countUp = () => {
      el.querySelectorAll<HTMLElement>("[data-count]").forEach((node) => {
        const to = parseInt(node.dataset.count || "0", 10);
        let start: number | null = null;
        const step = (ts: number) => {
          if (start === null) start = ts;
          const p = Math.min(1, (ts - start) / 1700);
          const e = 1 - Math.pow(1 - p, 3);
          node.textContent = fmt(Math.round(e * to));
          if (p < 1) rafs.push(requestAnimationFrame(step));
        };
        rafs.push(requestAnimationFrame(step));
      });
    };

    build(false);

    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            el.classList.add("tm-in");
            if (!reduce) countUp();
            io.disconnect();
          }
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);

    let rt: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        build(true);
        el.classList.add("tm-in");
      }, 160);
    };
    window.addEventListener("resize", onResize);

    return () => {
      io.disconnect();
      window.removeEventListener("resize", onResize);
      clearTimeout(rt);
      rafs.forEach((r) => cancelAnimationFrame(r));
    };
  }, [items]);

  return <div ref={ref} className="relative w-full min-h-[400px]" aria-label="ملخص المسيرة بالأرقام" />;
}
