#!/usr/bin/env node
/**
 * **مِعملُ صور البريد** — يخبز رسومَ رسائل أدِيب من مصادر الهويّة في `public/brand` (٢٠٢٦-١٠-١٧).
 *
 * البريدُ لا يرسم ما يرسمه المتصفّح: Gmail لا يعرض SVG، وOutlook يُسقط التدرّجَ وصورةَ الخلفيّة
 * والشفافيّة المركّبة. فما كان زخرفةً (التدرّجُ تحت النقش الخطّيّ، والختمُ حول الشعار) يُخبز هنا
 * صورةً واحدةً تظهر في كلّ برنامجٍ كما هي. وما كان كلامًا يبقى نصًّا في القالب، فالصورةُ لا تُنسخ
 * ولا تُقرأ لقارئ الشاشة.
 *
 * **ويبقى في المستودع**: الهويّةُ مصدرُه، فإن تبدّل الشعارُ أو النقشُ أُعيد تشغيلُه فتتبعه الصورُ
 * كلُّها، ولا تُرسم واحدةٌ بيدٍ فتفارق أخواتها. والمقاسُ ضعفُ ما يُعرض، لشاشات الجوّال الكثيفة.
 *
 * التشغيل:  node scripts/mail-art.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const V2 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = path.join(V2, "apps/web/public/brand");
const OUT = path.join(BRAND, "mail");

// سلّما العلامة (tokens.css): الفولاذيّ ٤٠٠ والكحليّ ٨٠٠ طرفا تدرّج الهويّة.
const STEEL_400 = "#5e88ab";
const NAVY_800 = "#1e3350";

async function svgData(file) {
  const raw = await fs.readFile(path.join(BRAND, file));
  return `data:image/svg+xml;base64,${raw.toString("base64")}`;
}

/** الرأسُ بلا شفافيّة فـJPEG (ثُمنُ وزن PNG لتدرّجٍ ناعم)، والباقي PNG بلوحةٍ محدودة: البريدُ يُحمَّل على الجوّال. */
async function bake(name, svg) {
  const out = path.join(OUT, name);
  const img = sharp(Buffer.from(svg), { density: 72 });
  await (name.endsWith(".jpg") ? img.jpeg({ quality: 86, mozjpeg: true }) : img.png({ palette: true, quality: 95, compressionLevel: 9 })).toFile(out);
  const { size } = await fs.stat(out);
  console.log(`${name}  ${(size / 1024).toFixed(1)} KB`);
}

await fs.mkdir(OUT, { recursive: true });
const patternWhite = await svgData("pattern-white.svg");
const pattern = await svgData("pattern.svg");
const circular = await svgData("pattern-circular.svg");
const logoWhite = await svgData("logo-horizontal-white.svg");
const logoVertical = await svgData("logo-vertical.svg");

// ١) رأسُ «الحِبر»: تدرّجُ الهويّة، والنقشُ الخطّيّ فيه همسًا، والشعارُ الأبيض في أوّل السطر (يمينًا).
//    1200×300 يُعرض 600×150.
await bake(
  "header-ink.jpg",
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="300" viewBox="0 0 1200 300">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${STEEL_400}"/><stop offset="1" stop-color="${NAVY_800}"/></linearGradient></defs>
  <rect width="1200" height="300" fill="url(#g)"/>
  <g opacity="0.09">
    <image xlink:href="${patternWhite}" x="-60" y="-30" width="1320" height="198"/>
    <image xlink:href="${patternWhite}" x="-260" y="150" width="1320" height="198"/>
  </g>
  <image xlink:href="${logoWhite}" x="840" y="70" width="276" height="162"/>
</svg>`,
);

// ٢) «الختم»: النقشُ الدائريّ وفي قلبه الشعارُ العموديّ. 480×480 يُعرض 120×120.
await bake(
  "seal.png",
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="480" height="480" viewBox="0 0 480 480">
  <image xlink:href="${circular}" x="8" y="0" width="464" height="480"/>
  <image xlink:href="${logoVertical}" x="156" y="105" width="168" height="270"/>
</svg>`,
);

// ٣) حاشيةُ «الختم»: شريطُ النقش الخطّيّ بلون الهويّة، خفيفًا، يختم الورقة. 1120×80 يُعرض 560×40.
await bake(
  "ornament.png",
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1120" height="80" viewBox="0 0 1120 80">
  <rect width="1120" height="80" fill="#ffffff"/>
  <g opacity="0.16"><image xlink:href="${pattern}" x="0" y="0" width="1120" height="168"/></g>
</svg>`,
);
