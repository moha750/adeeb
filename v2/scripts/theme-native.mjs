#!/usr/bin/env node
/**
 * مولّدُ ثيم React Native من `packages/design-system/tokens.css`.
 *
 * القانونُ في هذا المستودع أنّ `tokens.css` هو **المصدرُ الوحيد** لكلّ لونٍ ومسافةٍ وزاوية.
 * وReact Native لا يقرأ CSS، فكان أمامنا طريقان: أن نُعيد كتابةَ القيم بيدٍ في ملفٍّ موازٍ
 * (وهو ما فعله `tokens.ts` قديمًا فتخلّف عن الأصل: زواياه ما زالت sm/md/lg/xl وقد أُعدمت)،
 * أو أن نولّدها. هذا الملفُّ هو الطريقُ الثاني.
 *
 * يحلّ ثلاثةَ أشياءَ لا يفهمها JS وحدَه:
 *   `var(--x)`                          إحالةٌ متسلسلة، تُحلّ بالعمق
 *   `calc(var(--radius) - 3px)`         حسابٌ بسيطٌ بالبكسل
 *   `color-mix(in oklab, A 30%, B)`     مزجٌ في فضاء oklab بألفا مضروبةٍ مسبقًا (كنصّ المواصفة)
 *
 * التشغيل:  node scripts/theme-native.mjs        (أو  pnpm --filter mobile theme)
 * الخَرْج:   packages/theme-native/src/tokens.generated.ts   — **لا يُحرَّر بيد**
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const V2 = resolve(HERE, "..");
const SRC = resolve(V2, "packages/design-system/tokens.css");
const OUT = resolve(V2, "packages/theme-native/src/tokens.generated.ts");

const REM = 16; // جذرُ الويب 16px، وRN يقيس بالنقاط المستقلّة عن الكثافة فتتطابق القيم

/* ────────────────────────── قراءة الإعلانات ────────────────────────── */

/** يجمع كلّ `--x: value` من كتلتَي `:root` و`*` (الأخيرةُ تحمل الظلال والحلقات). */
function readDeclarations(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, ""); // التعليقاتُ عربيّةٌ وفيها فواصلُ منقوطة
  const out = new Map();
  const blocks = clean.matchAll(/(?:^|\})\s*([^{}]+)\{([^{}]*)\}/g);
  for (const [, selector, body] of blocks) {
    if (!/(:root|^\s*\*)/.test(selector)) continue;
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      out.set(name, value.trim());
    }
  }
  return out;
}

/* ────────────────────────── تقسيمٌ يحترم الأقواس ────────────────────────── */

/** يقسم على فاصلةٍ في المستوى الأعلى فقط: `a, rgb(1, 2, 3)` → ["a", "rgb(1, 2, 3)"]. */
function splitTop(input, sep = ",") {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of input) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === sep && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** يستخرج محتوى دالّةٍ من بدايةِ النصّ: `fn(...)` → المحتوى + ما بعده. */
function callArgs(value, fnName) {
  const head = `${fnName}(`;
  const at = value.indexOf(head);
  if (at === -1) return null;
  let depth = 0;
  for (let i = at + head.length - 1; i < value.length; i++) {
    if (value[i] === "(") depth++;
    else if (value[i] === ")") {
      depth--;
      if (depth === 0) {
        return { before: value.slice(0, at), args: value.slice(at + head.length, i), after: value.slice(i + 1) };
      }
    }
  }
  return null;
}

/* ────────────────────────── ألوان: sRGB ↔ oklab ────────────────────────── */

const clamp01 = (n) => Math.min(1, Math.max(0, n));

function parseColor(input) {
  const value = input.trim();

  if (value === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  const hex = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
  }

  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const p = splitTop(rgb[1].replace(/\//g, ",")).map((x) => x.trim());
    const chan = (x) => (x.endsWith("%") ? parseFloat(x) / 100 : parseFloat(x) / 255);
    return {
      r: chan(p[0]),
      g: chan(p[1]),
      b: chan(p[2]),
      a: p[3] === undefined ? 1 : p[3].endsWith("%") ? parseFloat(p[3]) / 100 : parseFloat(p[3]),
    };
  }

  return null;
}

function formatColor({ r, g, b, a }) {
  const c = (n) =>
    Math.round(clamp01(n) * 255)
      .toString(16)
      .padStart(2, "0");
  const hex = `#${c(r)}${c(g)}${c(b)}`;
  // RN يقبل #rrggbbaa، لكنّ rgba أوضحُ للقراءة حين تكون الشفافيّةُ مقصودة
  return a >= 0.999 ? hex : `rgba(${Math.round(clamp01(r) * 255)}, ${Math.round(clamp01(g) * 255)}, ${Math.round(clamp01(b) * 255)}, ${+a.toFixed(3)})`;
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

function srgbToOklab({ r, g, b }) {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function oklabToSrgb({ L, a, b }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: clamp01(toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    g: clamp01(toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    b: clamp01(toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
  };
}

/**
 * `color-mix(in oklab, A p%, B q%)`.
 * ألفا **مضروبةٌ مسبقًا** كما تنصّ المواصفة، وإلّا صار مزجُ لونٍ مع `transparent` رماديًّا
 * بدل أن يكون اللونَ نفسَه بشفافيّة (وهذا ما يحتاجه `--btn-ghost-border`).
 */
function colorMix(args) {
  const parts = splitTop(args);
  if (!/^in\s+oklab$/i.test(parts[0].trim())) {
    throw new Error(`فضاءُ مزجٍ غيرُ مدعوم: ${parts[0]}`);
  }
  const read = (part) => {
    const m = part.trim().match(/^(.*?)(?:\s+([\d.]+)%)?$/s);
    return { color: parseColor(m[1].trim()), pct: m[2] === undefined ? null : parseFloat(m[2]) / 100 };
  };
  const first = read(parts[1]);
  const second = read(parts[2]);
  if (!first.color || !second.color) throw new Error(`لونٌ لم يُفهم في: color-mix(${args})`);

  let w1 = first.pct;
  let w2 = second.pct;
  if (w1 === null && w2 === null) (w1 = 0.5), (w2 = 0.5);
  else if (w1 === null) w1 = 1 - w2;
  else if (w2 === null) w2 = 1 - w1;
  const sum = w1 + w2;
  (w1 /= sum), (w2 /= sum);

  const alpha = first.color.a * w1 + second.color.a * w2;
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };

  // الوزنُ الفعّال للّون = وزنُه × شفافيّته، ثمّ يُقسَم على الألفا الناتجة (فكُّ الضرب المسبق)
  const p1 = (w1 * first.color.a) / alpha;
  const p2 = (w2 * second.color.a) / alpha;
  const A = srgbToOklab(first.color);
  const B = srgbToOklab(second.color);
  const mixed = oklabToSrgb({ L: A.L * p1 + B.L * p2, a: A.a * p1 + B.a * p2, b: A.b * p1 + B.b * p2 });
  return { ...mixed, a: alpha };
}

/* ────────────────────────── الحلّ ────────────────────────── */

function resolve_(name, decls, seen = new Set()) {
  if (seen.has(name)) throw new Error(`إحالةٌ دائريّة عند ${name}`);
  const raw = decls.get(name);
  if (raw === undefined) throw new Error(`رمزٌ مفقود: ${name}`);
  return expand(raw, decls, new Set(seen).add(name));
}

function expand(value, decls, seen) {
  let out = value.trim();

  // var(--x)  و  var(--x, fallback)
  for (let guard = 0; guard < 50; guard++) {
    const call = callArgs(out, "var");
    if (!call) break;
    const [ref, fallback] = splitTop(call.args);
    let replacement;
    try {
      replacement = resolve_(ref.trim(), decls, seen);
    } catch (err) {
      if (fallback === undefined) throw err;
      replacement = expand(fallback, decls, seen);
    }
    out = `${call.before}${replacement}${call.after}`;
  }

  // color-mix(...)  — من الداخل إلى الخارج
  for (let guard = 0; guard < 50; guard++) {
    const call = callArgs(out, "color-mix");
    if (!call) break;
    out = `${call.before}${formatColor(colorMix(call.args))}${call.after}`;
  }

  // calc(...)  — جمعٌ وطرحٌ وضربٌ بسيطٌ بالبكسل
  for (let guard = 0; guard < 50; guard++) {
    const call = callArgs(out, "calc");
    if (!call) break;
    out = `${call.before}${evalCalc(call.args)}px${call.after}`;
  }

  return out.trim();
}

function evalCalc(expression) {
  const px = expression.replace(/([\d.]+)rem/g, (_, n) => String(parseFloat(n) * REM)).replace(/px/g, "");
  if (!/^[\d\s.+\-*/()]+$/.test(px)) throw new Error(`calc غيرُ مفهوم: ${expression}`);
  // القيمُ من ملفٍّ في المستودع لا من مُدخَلِ مستخدِم، والنمطُ أعلاه يحصرها في الأرقام والعمليّات
  const value = Function(`"use strict";return (${px})`)();
  return +value.toFixed(4);
}

/** رقمٌ بالنقاط: `1.25rem` → 20، `16px` → 16، `1.6` → 1.6 */
function toNumber(value) {
  const v = value.trim();
  if (v.endsWith("rem")) return +(parseFloat(v) * REM).toFixed(4);
  if (v.endsWith("px")) return +parseFloat(v).toFixed(4);
  return +parseFloat(v).toFixed(4);
}

/** `linear-gradient(135deg, A, B 62%)` → شكلُ expo-linear-gradient */
function toGradient(value) {
  const call = callArgs(value, "linear-gradient");
  if (!call) throw new Error(`ليس تدرّجًا خطّيًّا: ${value}`);
  const parts = splitTop(call.args);
  const angle = /deg\s*$/.test(parts[0]) ? parseFloat(parts[0]) : 180;
  const stops = (/deg\s*$/.test(parts[0]) ? parts.slice(1) : parts).map((p) => {
    const m = p.trim().match(/^(.*?)(?:\s+([\d.]+)%)?$/s);
    return { color: formatColor(parseColor(m[1].trim())), at: m[2] === undefined ? null : +(parseFloat(m[2]) / 100).toFixed(4) };
  });
  const colors = stops.map((s) => s.color);
  const locations = stops.map((s, i) => (s.at !== null ? s.at : i / (stops.length - 1)));
  return { angle, colors, locations };
}

/* ────────────────────────── البناء ────────────────────────── */

const css = readFileSync(SRC, "utf8");
const decls = readDeclarations(css);
const get = (name) => resolve_(name, decls);

const scale = (prefix, steps) => Object.fromEntries(steps.map((s) => [s, get(`--${prefix}-${s}`)]));
const NUMS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

const color = {
  navy: scale("navy", [...NUMS, 950]),
  steel: scale("steel", NUMS.slice(0, 9)),
  neutral: scale("neutral", NUMS.slice(0, 9)),
  success: scale("success", NUMS),
  warning: scale("warning", NUMS),
  danger: scale("danger", NUMS),

  bg: get("--color-bg"),
  surface: get("--color-surface"),
  surface2: get("--color-surface-2"),
  text: get("--color-text"),
  textMuted: get("--color-text-muted"),
  border: get("--color-border"),
  primary: get("--color-primary"),
  primaryHover: get("--color-primary-hover"),
  onPrimary: get("--color-on-primary"),
  secondary: get("--color-secondary"),
  secondaryHover: get("--color-secondary-hover"),
  onSecondary: get("--color-on-secondary"),
  ring: get("--color-ring"),

  success_: get("--success"),
  successSoft: get("--success-soft"),
  warning_: get("--warning"),
  warningSoft: get("--warning-soft"),
  danger_: get("--danger"),
  dangerSoft: get("--danger-soft"),
  info: get("--info"),
  infoSoft: get("--info-soft"),

  scrim: get("--scrim"),
  glassBg: get("--glass-bg"),
  glassBgStrong: get("--glass-bg-strong"),
  glassBorder: get("--glass-border"),

  cardStroke: get("--card-stroke"),
  cardStrokeActive: get("--card-stroke-active"),
  cardStrokeBrand: get("--card-stroke-brand"),
  cardStrokeNeutral: get("--card-stroke-neutral"),
  cardStrokeSuccess: get("--card-stroke-success"),
  cardStrokeWarning: get("--card-stroke-warning"),
  cardStrokeDanger: get("--card-stroke-danger"),

  auroraBrand: get("--aurora-brand"),
  auroraNeutral: get("--aurora-neutral"),
  auroraSuccess: get("--aurora-success"),
  auroraWarning: get("--aurora-warning"),
  auroraDanger: get("--aurora-danger"),
  borderAurora: get("--border-aurora"),

  chart: [1, 2, 3, 4, 5, 6].map((n) => get(`--chart-${n}`)),
};

const gradient = {
  primary: toGradient(get("--grad-primary")),
  success: toGradient(get("--grad-success")),
  warning: toGradient(get("--grad-warning")),
  danger: toGradient(get("--grad-danger")),
  neutral: toGradient(get("--grad-neutral")),
  chartBar: toGradient(get("--grad-chart-bar")),
  chartCol: toGradient(get("--grad-chart-col")),
  surfaceAurora: toGradient(get("--surface-aurora")),
};

const radius = {
  base: toNumber(get("--radius")),
  nested: toNumber(get("--radius-nested")),
  sm: toNumber(get("--radius-sm")),
  xs: toNumber(get("--radius-xs")),
  full: toNumber(get("--radius-full")),
};

/** عرضُ حدّ البطاقات — رقمٌ كان مبعثرًا في الشاشات حتّى نزل من ورقة الرموز. */
const stroke = {
  w: toNumber(get("--card-stroke-w")),
  wActive: toNumber(get("--card-stroke-w-active")),
};

const space = Object.fromEntries(
  [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24].map((n) => [n, toNumber(get(`--space-${n}`))])
);

const text = Object.fromEntries(
  ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl"].map((k) => [k, toNumber(get(`--text-${k}`))])
);

const leading = Object.fromEntries(
  ["tight", "snug", "normal", "relaxed"].map((k) => [k, toNumber(get(`--leading-${k}`))])
);

const weight = Object.fromEntries(
  [
    ["light", "--fw-light"],
    ["regular", "--fw-regular"],
    ["medium", "--fw-medium"],
    ["bold", "--fw-bold"],
    ["black", "--fw-black"],
  ].map(([k, v]) => [k, toNumber(get(v))])
);

/** نغماتُ الظلّ: ثلاثيّاتُ rgb خامًا في CSS، تُحوَّل هنا إلى ألوانٍ صالحةٍ لـRN. */
const shadowTone = Object.fromEntries(
  ["brand", "success", "warning", "danger", "neutral"].map((k) => {
    const [r, g, b] = get(`--shadow-tone-${k}`).split(",").map((n) => +n.trim());
    return [k, { r, g, b }];
  })
);

const duration = {
  fast: Math.round(toNumber(get("--dur-fast")) * 1000),
  base: Math.round(toNumber(get("--dur")) * 1000),
  slow: Math.round(toNumber(get("--dur-slow")) * 1000),
  chart: Math.round(toNumber(get("--dur-chart")) * 1000),
};

/* ────────────────────────── الكتابة ────────────────────────── */

const json = (value) => JSON.stringify(value, null, 2).replace(/"([A-Za-z_$][\w$]*)":/g, "$1:");

const banner = `/**
 * مولَّدٌ آليًّا من packages/design-system/tokens.css — **لا يُحرَّر بيد**.
 * أعِد التوليد بـ:  node scripts/theme-native.mjs
 *
 * كلُّ قيمةٍ هنا محلولةٌ بالكامل: لا var ولا calc ولا color-mix، والمزجُ تمّ في فضاء oklab
 * كما يفعله المتصفّح، فلونُ التطبيق هو لونُ الموقع نفسُه لا تقريبٌ له.
 */

/* eslint-disable */
`;

const body = [
  banner,
  `export const color = ${json(color)} as const;`,
  ``,
  `export type Gradient = { angle: number; colors: string[]; locations: number[] };`,
  `export const gradient: Record<${Object.keys(gradient).map((k) => `"${k}"`).join(" | ")}, Gradient> = ${json(gradient)};`,
  ``,
  `export const radius = ${json(radius)} as const;`,
  ``,
  `export const stroke = ${json(stroke)} as const;`,
  ``,
  `export const space = ${json(space)} as const;`,
  ``,
  `export const text = ${json(text)} as const;`,
  ``,
  `export const leading = ${json(leading)} as const;`,
  ``,
  `export const weight = ${json(weight)} as const;`,
  ``,
  `export const shadowTone = ${json(shadowTone)} as const;`,
  ``,
  `export const duration = ${json(duration)} as const;`,
  ``,
].join("\n");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, body, "utf8");

const count =
  Object.keys(color).length + Object.keys(gradient).length + Object.keys(space).length + Object.keys(text).length;
console.log(`✅ ثيمُ الجوّال وُلِّد من tokens.css (${decls.size} رمزًا مقروءًا، ${count} مجموعةً مكتوبة)`);
console.log(`   ${OUT.replace(V2 + "/", "")}`);
