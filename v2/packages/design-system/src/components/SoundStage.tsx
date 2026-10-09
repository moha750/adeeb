"use client";

import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { cn } from "../lib/cn";

/**
 * مسرحُ اللحن — **الأسطوانة** (قسمُ «الهويّة الموسيقيّة» في صفحة الهبوط، ٢٠٢٦-١٠-٠٨).
 *
 * اللحنُ أخدودٌ حلزونيٌّ من حافّة الأسطوانة إلى لصاقتها كما تُكبَس الأسطوانةُ حقًّا، وسطوعُ
 * الأخدود طاقةُ اللحن في موضعه. اللصاقةُ بتدرّج الهويّة وعليها ختمُ أدِيب الدائريّ يدور معها،
 * وزرُّ التشغيل في ثقبه، والذراعُ تنزل عند التشغيل وتتقدّم نحو المركز ما دام يُسمَع. وتحتها شريطُ
 * الوقت (خطٌّ يمتلئ ومقبض) بين المنقضي والمدّة للتقدّم والتأخّر، والسحبُ على القرص نفسِه يفعل ذلك أيضًا.
 *
 * ══ كيف اختير ══
 * عُرضت «المدار» (حلقةٌ حول الختم) و«الأفق» (موجةٌ خطّيّة)، فأقرّ المالكُ المدارَ تخطيطًا وفكرة
 * وطلب «تطبيقاتٍ إبداعيّةً وتوجّهاتٍ أخرى» له. فعُرضت خمسُ معالجاتٍ للتخطيط نفسِه (المدار،
 * القلم، الأسطوانة، الزخرفة، الصدى)، **واعتمد الأسطوانة**، فحُذف الباقي من هنا ومن المكتبة.
 *
 * **وكلُّ ما يُرسَم صوتٌ حقيقيّ لا زخرفةٌ تُخترع** (على سُنّة موجة الإذاعة): الأخدودُ من غلاف
 * الطاقة (`peaks`) المقيس من الملفّ سلفًا، فيُرسَم فورًا بلا تنزيله. والنبضُ (توهّجُ القرص
 * وشرارةُ الإبرة) من الطيف الحيّ بـ`AnalyserNode` حين يُشغَّل، وساكنُه البصمةُ (`print`)
 * المقيسةُ على مقياسه نفسِه، فلا قفزةَ بين السكون والتشغيل.
 *
 * الألوانُ تُقرأ من رموز `.snd` (`--snd-*` في `components.css`) لا تُكتب هنا.
 */

/* ── ثوابتُ التحليل: يجب أن تطابق ما قِيست به البصمة ── */
const FFT = 2048;
const F_MIN = 40;
const F_MAX = 14000;
/** مدّةُ دخول المشهد أوّلَ ما يظهر: الأخدودُ يُكبَس من الحافّة إلى اللصاقة. */
const INTRO_MS = 1800;
/** دورةُ القرص بالثواني: تُرى دورانًا ولا تُدوّخ (الأسطوانةُ الحقيقيّة ١٫٨ث، وتلك تُومض). */
const SPIN_SECONDS = 6;
/**
 * **اللوحةُ أوسعُ من القرص** بهذا القدر من كلّ جانب (نسبةً من قطره)، ويطابقه `inset` في
 * `.snd-cvs`. فالدائرةُ تقيس التخطيط، وما يخرج عنها (توهّجُ الحافّة) يُرسَم ولا يُقصّ.
 */
const OVER = 0.12;

/** مقاييسُ الأسطوانة نسبةً من قطرها. */
const VINYL = { disc: 0.45, label: 0.165, turns: 30 };

export type SoundStageProps = {
  /** رابطُ الملفّ الصوتيّ (من الأصل نفسِه: الطيفُ الحيّ يحتاجه). */
  src: string;
  /** اسمُ اللحن كما يُنطَق في تسمية الزرّ. */
  name: string;
  /** غلافُ الطاقة، من ٠ إلى ١٠٠. */
  peaks: number[];
  /** البصمةُ الطيفيّة من الأخفض إلى الأعلى، من ٠ إلى ١٠٠. */
  print: number[];
  /** المدّة بالثواني، تُعرَض قبل أن يُجلَب الملفّ. */
  duration: number;
  /** صورةُ الختم على اللصاقة. */
  seal?: string;
  className?: string;
};

type Palette = { ink: string; track: string; played: string; glow: string; base: string; deep: string; labelA: string; labelB: string };
type Graph = { ctx: AudioContext; an: AnalyserNode; bins: Uint8Array<ArrayBuffer>; bands: [number, number][] };

/** ما تحتاجه الرسّامةُ في الإطار الواحد. */
type Frame = {
  g: CanvasRenderingContext2D;
  S: number;
  c: number;
  dt: number;
  prog: number;
  playing: boolean;
  reduced: boolean;
  intro: number;
  pulse: number;
  spin: number;
  peaks: number[];
  pal: Palette;
  /** زاويةُ الذراع الحاليّة: تُنعَّم نحو هدفها إطارًا بعد إطار فتنزل ولا تقفز. و`moving` يقول
      إنّها لم تبلغه بعد، فلا ينام الرسمُ والذراعُ في منتصف الطريق. */
  arm: { a: number | null; moving: boolean };
};

/** لونُ الرمز بشفافيّة. الرمزُ يُقرأ محسوبًا (`#rrggbb` أو `rgb()`)، فيُفكّ إلى قنواته. */
function alpha(color: string, a: number): string {
  const c = color.trim();
  if (c.startsWith("#")) {
    let h = c.slice(1);
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    const n = parseInt(h.slice(0, 6), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(/[\s,/]+/);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return c;
}

/** مدى خاناتِ كلّ حزمة لوغاريتميّة — الحسابُ نفسُه الذي قِيست به البصمة. */
function bandRanges(sampleRate: number, count: number): [number, number][] {
  const hz = sampleRate / FFT;
  const top = FFT / 2;
  return Array.from({ length: count }, (_, b) => {
    const lo = F_MIN * (F_MAX / F_MIN) ** (b / count);
    const hi = F_MIN * (F_MAX / F_MIN) ** ((b + 1) / count);
    const i0 = Math.min(top - 1, Math.floor(lo / hz));
    return [i0, Math.min(top, Math.max(i0 + 1, Math.ceil(hi / hz)))];
  });
}

const TAU = Math.PI * 2;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (v: number) => 1 - (1 - v) ** 3;

const vinylRadii = (S: number) => {
  const RD = S * VINYL.disc;
  return { RD, r0: RD * 0.955, r1: S * VINYL.label * 1.12, RL: S * VINYL.label };
};

function drawVinyl(f: Frame) {
  const { g, S, c, pal, peaks } = f;
  const { RD, r0, r1, RL } = vinylRadii(S);

  // القرص: ظلُّه توهّجٌ فولاذيٌّ يشتدّ مع الضربة
  g.save();
  g.beginPath();
  g.arc(c, c, RD, 0, TAU);
  const body = g.createRadialGradient(c, c, RL, c, c, RD);
  body.addColorStop(0, pal.deep);
  body.addColorStop(1, pal.base);
  g.fillStyle = body;
  g.shadowColor = alpha(pal.glow, 0.3 + 0.45 * f.pulse);
  g.shadowBlur = 36;
  g.fill();
  g.restore();

  // الأخدود: يُرسَم في سبع درجاتِ سطوعٍ (مسارٌ لكلّ درجة) لا ألفَي خطٍّ منفرد.
  // ويدور مع القرص: الحلزونُ نفسُه مُزاحٌ بزاوية الدوران.
  const LEVELS = 7;
  const back = Array.from({ length: LEVELS }, () => new Path2D());
  const done = Array.from({ length: LEVELS }, () => new Path2D());
  const segs = VINYL.turns * 72;
  const turn = (f.spin * Math.PI) / 180;
  const shown = Math.floor(segs * (f.reduced ? 1 : easeOut(f.intro)));
  let px = c + Math.cos(turn) * r0;
  let py = c + Math.sin(turn) * r0;
  for (let k = 0; k < shown; k++) {
    const u = (k + 1) / segs;
    const r = r0 - (r0 - r1) * u;
    const a = turn - u * VINYL.turns * TAU;
    const x = c + Math.cos(a) * r;
    const y = c + Math.sin(a) * r;
    const e = peaks[Math.min(peaks.length - 1, Math.floor(u * peaks.length))] / 100;
    const lv = Math.min(LEVELS - 1, Math.floor(e * LEVELS));
    const p = u <= f.prog ? done[lv] : back[lv];
    p.moveTo(px, py);
    p.lineTo(x, y);
    px = x;
    py = y;
  }
  g.lineWidth = Math.max(0.7, S / 620);
  for (let lv = 0; lv < LEVELS; lv++) {
    g.strokeStyle = alpha(pal.track, 0.1 + lv * 0.075);
    g.stroke(back[lv]);
    g.strokeStyle = alpha(pal.played, 0.22 + lv * 0.11);
    g.stroke(done[lv]);
  }

  // البريق: إسفينان من الضوء ثابتان والقرصُ يدور تحتهما (فالضوءُ في الغرفة لا في القرص)
  if (typeof g.createConicGradient === "function") {
    const sheen = g.createConicGradient(-Math.PI / 4, c, c);
    sheen.addColorStop(0, alpha(pal.ink, 0));
    sheen.addColorStop(0.07, alpha(pal.ink, 0.17));
    sheen.addColorStop(0.15, alpha(pal.ink, 0));
    sheen.addColorStop(0.5, alpha(pal.ink, 0));
    sheen.addColorStop(0.57, alpha(pal.ink, 0.1));
    sheen.addColorStop(0.65, alpha(pal.ink, 0));
    sheen.addColorStop(1, alpha(pal.ink, 0));
    const ring = new Path2D();
    ring.arc(c, c, RD, 0, TAU);
    ring.arc(c, c, RL, 0, TAU, true);
    g.fillStyle = sheen;
    g.fill(ring, "evenodd");
  }
  g.beginPath();
  g.arc(c, c, RD - 0.5, 0, TAU);
  g.lineWidth = 1;
  g.strokeStyle = alpha(pal.track, 0.45);
  g.stroke();

  // اللصاقة: تدرّجُ الهويّة، والختمُ فوقها عنصرٌ يدور معها
  const lab = g.createLinearGradient(c - RL, c - RL, c + RL, c + RL);
  lab.addColorStop(0, pal.labelA);
  lab.addColorStop(1, pal.labelB);
  g.beginPath();
  g.arc(c, c, RL, 0, TAU);
  g.fillStyle = lab;
  g.fill();

  // الذراع: محورُها في الرُّكن، وإبرتُها حيث يُسمَع، وتستريح خارج القرص قبل أوّل تشغيل
  const P = { x: c + S * 0.42, y: c - S * 0.4 };
  const L = S * 0.53;
  const d = Math.hypot(P.x - c, P.y - c);
  const rest = Math.PI / 2 - 0.04;
  let target = rest;
  if (f.playing || f.prog > 0) {
    // تقاطعُ دائرة الذراع (حول المحور) مع دائرة الموضع (حول المركز)، ويُؤخذ الأيمنُ منهما
    const rt = r0 - (r0 - r1) * f.prog;
    const a = (L * L - rt * rt + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, L * L - a * a));
    const bx = P.x + (a * (c - P.x)) / d;
    const by = P.y + (a * (c - P.y)) / d;
    const ox = (h * (c - P.y)) / d;
    const oy = (-h * (c - P.x)) / d;
    const [sx, sy] = bx + ox > bx - ox ? [bx + ox, by + oy] : [bx - ox, by - oy];
    target = Math.atan2(sy - P.y, sx - P.x);
  }
  const now = f.arm.a ?? rest;
  f.arm.a = f.reduced ? target : now + (target - now) * (1 - Math.exp(-f.dt / 320));
  f.arm.moving = Math.abs(target - f.arm.a) > 0.0005;
  const A = f.arm.a;
  const tip = { x: P.x + Math.cos(A) * L, y: P.y + Math.sin(A) * L };
  const tail = { x: P.x - Math.cos(A) * S * 0.08, y: P.y - Math.sin(A) * S * 0.08 };

  g.save();
  g.lineCap = "round";
  // ظلُّ الذراع على القرص
  g.strokeStyle = alpha(pal.deep, 0.6);
  g.lineWidth = S * 0.014;
  g.beginPath();
  g.moveTo(tail.x + 5, tail.y + 7);
  g.lineTo(tip.x + 5, tip.y + 7);
  g.stroke();
  // العمود المعدنيّ: لمعةٌ على طوله
  const metal = g.createLinearGradient(P.x - S * 0.02, P.y, P.x + S * 0.02, P.y + S * 0.02);
  metal.addColorStop(0, pal.ink);
  metal.addColorStop(1, pal.track);
  g.strokeStyle = metal;
  g.lineWidth = S * 0.011;
  g.beginPath();
  g.moveTo(tail.x, tail.y);
  g.lineTo(tip.x, tip.y);
  g.stroke();
  // الثقلُ الموازن خلف المحور
  g.fillStyle = pal.track;
  g.beginPath();
  g.arc(tail.x, tail.y, S * 0.022, 0, TAU);
  g.fill();
  // رأسُ الإبرة: خرطوشةٌ مائلةٌ عن الذراع، ولسانُ الرفع بجانبها، وشرارةُ الإبرة تحتها
  g.translate(tip.x, tip.y);
  g.rotate(A + 0.45 - Math.PI / 2);
  g.fillStyle = pal.ink;
  g.beginPath();
  g.roundRect(-S * 0.016, -S * 0.012, S * 0.058, S * 0.024, S * 0.005);
  g.fill();
  g.fillStyle = pal.track;
  g.beginPath();
  g.roundRect(S * 0.03, -S * 0.012, S * 0.012, S * 0.024, S * 0.003);
  g.fill();
  g.strokeStyle = pal.ink;
  g.lineWidth = S * 0.004;
  g.beginPath();
  g.moveTo(-S * 0.004, -S * 0.012);
  g.lineTo(-S * 0.012, -S * 0.034);
  g.stroke();
  if (f.playing) {
    g.shadowColor = alpha(pal.glow, 1);
    g.shadowBlur = 12 + 14 * f.pulse;
    g.fillStyle = pal.ink;
    g.beginPath();
    g.arc(S * 0.012, 0, 2 + 2.5 * f.pulse, 0, TAU);
    g.fill();
  }
  g.restore();
  // المحور
  g.fillStyle = pal.track;
  g.beginPath();
  g.arc(P.x, P.y, S * 0.04, 0, TAU);
  g.fill();
  g.fillStyle = pal.base;
  g.beginPath();
  g.arc(P.x, P.y, S * 0.018, 0, TAU);
  g.fill();
}

/** من موضع المؤشّر إلى موضعٍ في اللحن: البُعدُ عن المركز، فالأخدودُ يبدأ عند الحافّة وينتهي عند اللصاقة. */
function seekFrac(dx: number, dy: number, S: number, dragging: boolean): number | null {
  const d = Math.hypot(dx, dy);
  const { r0, r1, RD } = vinylRadii(S);
  if (!dragging && (d < r1 || d > RD)) return null;
  return clamp01((r0 - d) / (r0 - r1));
}

declare global {
  interface Window { webkitAudioContext?: typeof AudioContext }
}

/** حدثُ «بدأ لحنٌ»: من بدأ أعلن، ومن سواه سكت — لحنان معًا ضجيج. */
const PLAY_EVENT = "adeeb:sound-play";

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function SoundStage({ src, name, peaks, print, duration, seal, className }: SoundStageProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const cvsRef = useRef<HTMLCanvasElement>(null);
  const seekRef = useRef<HTMLInputElement>(null);
  const nowRef = useRef<HTMLSpanElement>(null);
  const totalRef = useRef<HTMLSpanElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const wakeRef = useRef<() => void>(() => {});
  const [playing, setPlaying] = useState(false);

  /** حالُ اللوحة — في مرجعٍ لا في حالة React: تتبدّل ستّين مرّةً في الثانية. */
  const st = useRef({
    t: 0,
    dur: duration,
    pendingSeek: null as number | null,
    playing: false,
    live: Float32Array.from(print, (v) => v / 100),
    bassAvg: 0,
    pulse: 0,
    spin: 0,
    spinSpeed: 0,
    intro: 0,
    introStart: -1,
    inView: false,
    reduced: false,
    lastSec: -1,
    last: 0,
  });

  const seek = useCallback((sec: number) => {
    const s = st.current;
    const t = Math.max(0, Math.min(s.dur, sec));
    s.t = t;
    s.lastSec = -1;
    const a = audioRef.current;
    if (a && a.readyState >= 1) a.currentTime = t;
    else s.pendingSeek = t;
    wakeRef.current();
  }, []);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!a.paused) {
      a.pause();
      return;
    }
    /* النبضُ الحيّ يحتاج سياقًا صوتيًّا، والمتصفّحُ لا يفتحه إلّا داخل نقرة — فيُبنى هنا
       مرّةً واحدة. وإن تعذّر (متصفّحٌ قديم) سُمع اللحنُ بلا نبضٍ حيّ ولا يتعطّل شيء. */
    if (!graphRef.current) {
      try {
        const Ctx = window.AudioContext ?? window.webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          const node = ctx.createMediaElementSource(a);
          const an = ctx.createAnalyser();
          an.fftSize = FFT;
          node.connect(an);
          an.connect(ctx.destination);
          graphRef.current = {
            ctx,
            an,
            bins: new Uint8Array(new ArrayBuffer(an.frequencyBinCount)),
            bands: bandRanges(ctx.sampleRate, print.length),
          };
        }
      } catch {
        graphRef.current = null;
      }
    }
    void graphRef.current?.ctx.resume();
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: id }));
    a.play().catch(() => setPlaying(false));
  }, [id, print.length]);

  useEffect(() => {
    const root = rootRef.current;
    const box = boxRef.current;
    const cvs = cvsRef.current;
    if (!root || !box || !cvs) return;
    const g2 = cvs.getContext("2d");
    if (!g2) return;
    const s = st.current;

    /* المشغّلُ يُبنى هنا لا في JSX: كلُّ تركيبٍ يأخذ عنصرًا جديدًا، فلا يُربَط عنصرٌ
       واحدٌ بسياقين (`createMediaElementSource` لا يُنادى على العنصر مرّتين). */
    const a = new Audio();
    a.preload = "none";
    a.src = src;
    audioRef.current = a;

    const arm: Frame["arm"] = { a: null, moving: false };

    let w = 0;
    let cw = 0;
    let dpr = 1;
    let pal = {} as Palette;
    let raf = 0;

    const readPalette = () => {
      const cs = getComputedStyle(root);
      const v = (n: string) => cs.getPropertyValue(n).trim();
      pal = {
        ink: v("--snd-ink"), track: v("--snd-track"), played: v("--snd-played"), glow: v("--snd-glow"),
        base: v("--snd-base"), deep: v("--snd-deep"), labelA: v("--snd-label-a"), labelB: v("--snd-label-b"),
      };
    };

    const fit = () => {
      w = box.clientWidth;
      cw = w * (1 + 2 * OVER);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cvs.width = Math.round(cw * dpr);
      cvs.height = Math.round(cw * dpr);
      readPalette();
    };

    const syncClock = () => {
      const sec = Math.floor(s.t);
      if (sec === s.lastSec) return;
      s.lastSec = sec;
      if (nowRef.current) nowRef.current.textContent = fmt(s.t);
      if (totalRef.current) totalRef.current.textContent = fmt(s.dur);
      const inp = seekRef.current;
      if (inp) {
        inp.max = String(Math.round(s.dur));
        inp.value = String(sec);
        inp.setAttribute("aria-valuetext", `${fmt(s.t)} من ${fmt(s.dur)}`);
      }
    };

    /* الساكنُ لا يُرسَم إطارًا بعد إطار: القرصُ لا يتنفّس، فإذا وقف وتمّ دخولُه وبلغت الذراعُ
       موضعَها نام الرسم، ويوقظه أيُّ حدث (تشغيل، انتقال، ظهور، تغيّر مقاس). */
    const needsLoop = () =>
      s.inView && (s.playing || s.intro < 1 || s.spinSpeed > 0.002 || s.pulse > 0.002 || arm.moving);

    const frame = (now: number) => {
      raf = 0;
      const dt = s.last ? Math.min(now - s.last, 100) : 16;
      s.last = now;

      if (s.playing) s.t = a.currentTime;
      if (Number.isFinite(a.duration) && a.duration > 0) s.dur = a.duration;

      // الطيف: الحيُّ حين يُسمَع، والبصمةُ حين يسكت — والتنعيمُ يصل بينهما بلا قفزة
      const gr = graphRef.current;
      const live = s.playing && !s.reduced && gr ? gr : null;
      if (live) live.an.getByteFrequencyData(live.bins);
      const k = 1 - Math.exp(-dt / 70);
      for (let b = 0; b < print.length; b++) {
        let target = print[b] / 100;
        if (live) {
          const [i0, i1] = live.bands[b];
          let sum = 0;
          for (let i = i0; i < i1; i++) sum += live.bins[i];
          target = sum / (i1 - i0) / 255;
        }
        s.live[b] += (target - s.live[b]) * k;
      }

      // النبضة: ما زاد به الأخفضُ على متوسّطه القريب — ضربةُ الإيقاع لا مستواه
      let bass = 0;
      for (let b = 0; b < 6; b++) bass += s.live[b];
      bass /= 6;
      s.bassAvg += (bass - s.bassAvg) * (1 - Math.exp(-dt / 700));
      const hit = live ? clamp01((bass - s.bassAvg) * 9) : 0;
      s.pulse += (hit - s.pulse) * (1 - Math.exp(-dt / (hit > s.pulse ? 35 : 240)));

      // القرصُ يدور ما دام يُسمَع، ويتباطأ حتى يقف حين يسكت كقرصٍ له ثقل
      s.spinSpeed += ((s.playing && !s.reduced ? 1 : 0) - s.spinSpeed) * (1 - Math.exp(-dt / 700));
      s.spin = (s.spin + (s.spinSpeed * dt * 360) / (SPIN_SECONDS * 1000)) % 360;

      if (s.introStart >= 0 && s.intro < 1) s.intro = Math.min(1, (now - s.introStart) / INTRO_MS);

      g2.setTransform(dpr, 0, 0, dpr, 0, 0);
      g2.clearRect(0, 0, cw, cw);
      drawVinyl({
        g: g2, S: w, c: cw / 2, dt, prog: s.dur > 0 ? s.t / s.dur : 0,
        playing: s.playing, reduced: s.reduced, intro: s.intro, pulse: s.pulse,
        spin: s.spin, peaks, pal, arm,
      });
      const prog = s.dur > 0 ? s.t / s.dur : 0;
      root.style.setProperty("--snd-pulse", s.pulse.toFixed(3));
      root.style.setProperty("--snd-spin", `${s.spin.toFixed(2)}deg`);
      root.style.setProperty("--snd-prog", `${(prog * 100).toFixed(2)}%`);
      syncClock();
      if (needsLoop()) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (!raf) {
        s.last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    wakeRef.current = wake;

    // ── المشغّل ──
    const onPlay = () => {
      s.playing = true;
      setPlaying(true);
      wake();
    };
    const onPause = () => {
      s.playing = false;
      s.t = a.currentTime;
      setPlaying(false);
      wake();
    };
    const onEnded = () => {
      s.playing = false;
      s.t = 0;
      s.lastSec = -1;
      a.currentTime = 0;
      setPlaying(false);
      wake();
    };
    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) s.dur = a.duration;
      if (s.pendingSeek != null) {
        a.currentTime = s.pendingSeek;
        s.pendingSeek = null;
      }
      s.lastSec = -1;
      wake();
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    a.addEventListener("loadedmetadata", onMeta);

    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id && !a.paused) a.pause();
    };
    window.addEventListener(PLAY_EVENT, onOther);

    // ── الحركةُ المخفّفة ──
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => {
      s.reduced = mq.matches;
      if (s.reduced) s.intro = 1;
      wake();
    };
    onMq();
    mq.addEventListener("change", onMq);

    // ── المقاس ──
    fit();
    const ro = new ResizeObserver(() => {
      fit();
      wake();
    });
    ro.observe(box);

    // ── الظهور: لا رسمَ لما لا يُرى، والدخولُ يبدأ أوّلَ ما يظهر ──
    const io = new IntersectionObserver(
      ([e]) => {
        s.inView = e.isIntersecting;
        if (s.inView && s.introStart < 0) s.introStart = s.reduced ? -2 : performance.now();
        if (s.introStart === -2) s.intro = 1;
        if (s.inView) wake();
      },
      { threshold: 0.2 },
    );
    io.observe(box);

    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = () => {};
      io.disconnect();
      ro.disconnect();
      mq.removeEventListener("change", onMq);
      window.removeEventListener(PLAY_EVENT, onOther);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("loadedmetadata", onMeta);
      a.pause();
      a.removeAttribute("src");
      a.load();
      audioRef.current = null;
      void graphRef.current?.ctx.close();
      graphRef.current = null;
    };
  }, [id, src, peaks, print]);

  // ── السحبُ على القرص: البُعدُ عن المركز موضعٌ في اللحن ──
  const dragging = useRef(false);
  const fracAt = (e: PointerEvent<HTMLCanvasElement>): number | null => {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    return seekFrac(dx, dy, r.width / (1 + 2 * OVER), dragging.current);
  };
  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const f = fracAt(e);
    if (f == null) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seek(f * st.current.dur);
  };
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const f = fracAt(e);
    rootRef.current?.classList.toggle("is-ring", f != null);
    if (dragging.current && f != null) seek(f * st.current.dur);
  };
  const onUp = () => {
    dragging.current = false;
  };

  const label = playing ? `إيقاف ${name} مؤقّتًا` : `تشغيل ${name}`;


  /* شريطُ الوقت (اعتمده المالك ٢٠٢٦-١٠-٠٨ على «الموجة»): المِزلاقُ الأصليّ طبقةٌ شفّافةٌ فوق
     رسمه كمِزلاق المحطّة، فيُنقَر ويُسحَب ويتنقّل بالأسهم ويقرؤه قارئُ الشاشة. وفي الصفحة العربيّة
     يجري من اليمين إلى اليسار بطبعه، كالوقت. */
  const seekInput = (
    <input
      ref={seekRef}
      className="snd-seek"
      type="range"
      min={0}
      max={Math.round(duration)}
      step={1}
      defaultValue={0}
      onChange={(e) => seek(Number(e.target.value))}
      aria-label={`موضع الاستماع في ${name}`}
      aria-valuetext={`0:00 من ${fmt(duration)}`}
    />
  );

  return (
    <div ref={rootRef} className={cn("snd", playing && "is-playing", className)}>
      <div ref={boxRef} className="snd-orb">
        <canvas
          ref={cvsRef}
          className="snd-cvs"
          aria-hidden
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={() => rootRef.current?.classList.remove("is-ring")}
        />
        {seal ? <img className="snd-seal" src={seal} alt="" aria-hidden draggable={false} /> : null}
        <button type="button" className="snd-core" onClick={toggle} aria-label={label}>
          <svg className="snd-ic" viewBox="0 0 24 24" aria-hidden data-on={playing ? "pause" : "play"}>
            <path
              className="snd-ic-play"
              d="M8 5.6v12.8a1.1 1.1 0 0 0 1.68.93l10.1-6.4a1.1 1.1 0 0 0 0-1.86L9.68 4.67A1.1 1.1 0 0 0 8 5.6Z"
            />
            <g className="snd-ic-pause">
              <rect x="6" y="5" width="4.2" height="14" rx="1.4" />
              <rect x="13.8" y="5" width="4.2" height="14" rx="1.4" />
            </g>
          </svg>
        </button>
      </div>
      <div className="snd-meta">
        <span ref={nowRef} className="snd-time" dir="ltr">0:00</span>
        <div className="snd-scrub">
          <span className="snd-scrub-fill" aria-hidden />
          <span className="snd-scrub-knob" aria-hidden />
          {seekInput}
        </div>
        <span ref={totalRef} className="snd-time" dir="ltr">{fmt(duration)}</span>
      </div>
    </div>
  );
}
