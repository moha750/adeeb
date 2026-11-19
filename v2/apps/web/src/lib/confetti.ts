/**
 * **القصاصاتُ المحتفية** — لوحةٌ (`canvas`) تنطلق قصاصاتُها من الزاويتين السفليّتين ثمّ تمطر من الأعلى، بين مربّعاتٍ تتقلّب وأشرطةٍ
 * ملتوية، وتنطفئ وحدَها. وُلدت في «دربك خضر» (٢٠٢٦-٠٩-٢٧) ونُقلت هنا (٢٠٢٦-١١-١٩) لتحتفي بها البوّابةُ أيضًا بفوز الانتخاب، فلها
 * مصدرٌ واحد. **ولا لونَ فيها**: تُعطى أسماءَ رموزٍ تُقرأ من اللوحة نفسِها، فلكلّ هويّةٍ ألوانُها. ومن طلب تقليلَ الحركة لا تُستدعى له
 * (ذلك على المستدعي). تُرجع دالّةَ إيقاف.
 */

type Bit = {
  x: number; y: number; vx: number; vy: number;
  a: number; va: number; flip: number; vf: number;
  w: number; h: number; c: string; ribbon: boolean; ph: number;
};

export function confetti(cv: HTMLCanvasElement, tokens: string[], { end = 7.5, pace = 1, density = 1 }: {
  /** عمرُها بثواني حركتها */
  end?: number;
  /** سرعةُ الزمن فيها: دون الواحد أبطأ بالمسار نفسِه، فتطول مدّتُها الحقيقيّة `end / pace` (البوّابة: ليستوعب الفائزُ ويصوّر) */
  pace?: number;
  /** كثافتُها: مضاعفُ عدد القصاصات في كلّ دفعة */
  density?: number;
} = {}) {
  const ctx = cv.getContext("2d");
  const css = getComputedStyle(cv);
  const COLORS = tokens.map((t) => css.getPropertyValue(t).trim()).filter(Boolean);
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
    for (let i = 0; i < Math.round(55 * density); i++) {
      const s = rnd(0.75, 1.1) * Math.max(H, 520);
      const ang = rnd(58, 80) * (Math.PI / 180);
      bits.push(make(fromLeft ? -8 : W + 8, H + 8, (fromLeft ? 1 : -1) * Math.cos(ang) * s * 0.55, -Math.sin(ang) * s * 1.55));
    }
  };
  const rain = (k: number) => {
    for (let i = 0; i < k; i++) bits.push(make(rnd(0, W), rnd(-H * 0.35, -10), rnd(-40, 40), rnd(40, 160)));
  };
  cannon(true); cannon(false);
  const t1 = window.setTimeout(() => rain(Math.round(60 * density)), 650 / pace);
  const t2 = window.setTimeout(() => rain(Math.round(40 * density)), 1500 / pace);

  const G = 900, DRAG = 0.985, END = end, FADE = 1.6;
  let raf = 0, last = performance.now();
  const t0 = last;
  const draw = (now: number) => {
    const dt = Math.min(0.033, (now - last) / 1000) * pace; last = now;
    const age = ((now - t0) / 1000) * pace;
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
