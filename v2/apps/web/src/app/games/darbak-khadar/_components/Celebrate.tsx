"use client";

import { useEffect, useRef } from "react";
import { Trophy } from "@phosphor-icons/react";
import { PRIZE } from "./bits";
import type { Winner } from "./Board";

/**
 * **احتفاءٌ بالفائز حين يدخل** (طلبُ المالك ٢٠٢٦-٠٩-٢٧: «عند دخول أحد الثلاثة الفائزين تظهر قصاصاتٌ
 * شريطيّة بمناسبة الفوز وتبريك»). قصاصاتٌ تنطلق من الزاويتين السفليّتين ثمّ تمطر من الأعلى، بين مربّعاتٍ
 * تتقلّب وأشرطةٍ ملتوية، بألوان اللعبة: أخضرُ البدلة، وذهبُ الأوسمة، وليلكيُّ كوب oos، وحبرُ القمر.
 *
 * ترسمها لوحةٌ واحدةٌ خلف بطاقة التبريك، وتنطفئ وحدَها بعد ثوانٍ. ومن طلب في جهازه تقليلَ الحركة يرى
 * البطاقةَ بلا قصاصات. والتبريكُ بلا تذكيرٍ ولا تأنيث، فاسمُ اللاعب مستعارٌ لا يُعرف منه صاحبه.
 */

const RANK: Record<number, string> = { 1: "المركز الأوّل", 2: "المركز الثاني", 3: "المركز الثالث" };
/** ألوانُ القصاصات من رموز الهويّة نفسِها (`.drb` في `components.css`)، فلا يُكتب لونٌ هنا. */
const TOKENS = ["--drb-suit", "--drb-suit-lit", "--drb-gold", "--drb-oos", "--drb-moon"];

type Bit = {
  x: number; y: number; vx: number; vy: number;
  a: number; va: number; flip: number; vf: number;
  w: number; h: number; c: string; ribbon: boolean; ph: number;
};

function confetti(cv: HTMLCanvasElement) {
  const ctx = cv.getContext("2d");
  const css = getComputedStyle(cv);
  const COLORS = TOKENS.map((t) => css.getPropertyValue(t).trim()).filter(Boolean);
  if (!ctx || COLORS.length === 0) return () => {};
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  const size = () => {
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  addEventListener("resize", size);

  const bits: Bit[] = [];
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const make = (x: number, y: number, vx: number, vy: number): Bit => {
    const ribbon = Math.random() < 0.35;
    return {
      x, y, vx, vy,
      a: rnd(0, Math.PI * 2), va: rnd(-6, 6), flip: rnd(0, Math.PI * 2), vf: rnd(5, 11),
      w: ribbon ? rnd(3, 4.5) : rnd(6, 10), h: ribbon ? rnd(26, 42) : rnd(9, 15),
      c: COLORS[Math.floor(Math.random() * COLORS.length)], ribbon, ph: rnd(0, Math.PI * 2),
    };
  };
  /* مدفعان من الزاويتين السفليّتين، ثمّ مطرٌ من الأعلى على دفعتين */
  const cannon = (fromLeft: boolean) => {
    for (let i = 0; i < 55; i++) {
      const s = rnd(0.75, 1.1) * Math.max(H, 520);
      const ang = rnd(58, 80) * (Math.PI / 180);
      bits.push(make(fromLeft ? -8 : W + 8, H + 8, (fromLeft ? 1 : -1) * Math.cos(ang) * s * 0.55, -Math.sin(ang) * s * 1.55));
    }
  };
  const rain = (k: number) => {
    for (let i = 0; i < k; i++) bits.push(make(rnd(0, W), rnd(-H * 0.35, -10), rnd(-40, 40), rnd(40, 160)));
  };
  cannon(true); cannon(false);
  const t1 = window.setTimeout(() => rain(60), 650);
  const t2 = window.setTimeout(() => rain(40), 1500);

  const G = 900, DRAG = 0.985, END = 7.5, FADE = 1.6;
  let raf = 0, last = performance.now();
  const t0 = last;
  const draw = (now: number) => {
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    const age = (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = age > END - FADE ? Math.max(0, (END - age) / FADE) : 1;
    for (const b of bits) {
      b.vy = Math.min(b.vy + G * dt, b.ribbon ? 170 : 240);
      b.vx *= DRAG;
      b.x += (b.vx + Math.sin(age * 3 + b.ph) * 28) * dt;
      b.y += b.vy * dt;
      b.a += b.va * dt; b.flip += b.vf * dt;
      if (b.y > H + 60) continue;
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(b.a);
      ctx.fillStyle = b.c; ctx.strokeStyle = b.c;
      if (b.ribbon) {
        /* شريطٌ ملتوٍ: خطٌّ يتموّج على طوله ويتقلّب عرضُه */
        ctx.lineWidth = b.w * (0.45 + 0.55 * Math.abs(Math.cos(b.flip)));
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) {
          const t = i / 8, yy = (t - 0.5) * b.h, xx = Math.sin(t * Math.PI * 2 + b.flip) * 4;
          if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      } else {
        /* قصاصةٌ تتقلّب: يضيق وجهُها ويتّسع كأنّها تدور في الهواء */
        ctx.scale(1, Math.cos(b.flip));
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      }
      ctx.restore();
    }
    if (age < END) raf = requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, W, H);
  };
  raf = requestAnimationFrame(draw);

  return () => {
    cancelAnimationFrame(raf);
    window.clearTimeout(t1); window.clearTimeout(t2);
    removeEventListener("resize", size);
  };
}

export function Celebrate({ win, onClose, onWinners }: { win: Winner; onClose: () => void; onWinners: () => void }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  /* الإغلاقُ من مرجعٍ لا من الاعتماديّات: الأبُ يمرّر دالّةً جديدةً في كلّ رسم، فلا تُعاد القصاصاتُ معه */
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);

  useEffect(() => {
    btn.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close.current(); };
    addEventListener("keydown", esc);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stop = cv.current && !still ? confetti(cv.current) : () => {};
    return () => { stop(); removeEventListener("keydown", esc); };
  }, []);

  return (
    <div className="drba-cel" role="dialog" aria-modal="true" aria-labelledby="drb-cel-t">
      <canvas ref={cv} className="drba-cel-fx" aria-hidden="true" />
      <div className="drba-card drba-cel-card" data-tone="gold">
        <span className="drba-cel-ic" aria-hidden="true">
          <Trophy />
        </span>
        <p className="drba-eyebrow">مسابقة «دربك خضر»</p>
        <h2 id="drb-cel-t" className="drba-big">مبروك الفوز!</h2>
        <p className="drba-lead">
          «{win.name}»، {RANK[win.rank]} بين كلّ من لعب.
        </p>
        <p>
          والجائزةُ {PRIZE[win.rank]} رصيدًا في محفظة مقهى oos. نتواصل معك عبر بيانات حسابك لتسليمها.
        </p>
        <button ref={btn} type="button" className="drba-btn" data-kind="gold" data-wide="" onClick={onWinners}>
          عرض الفائزين
        </button>
        <button type="button" className="drba-btn" data-kind="ghost" data-wide="" onClick={onClose}>
          إغلاق
        </button>
      </div>
    </div>
  );
}
