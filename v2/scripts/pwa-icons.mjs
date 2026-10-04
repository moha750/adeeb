#!/usr/bin/env node
/**
 * **أيقوناتُ التطبيق المثبَّت** — تُستخرج من أيقونة الموقع نفسِها (`apps/web/src/app/icon.svg`)
 * فلا تفارقها لونًا ولا رسمًا. (٢٠٢٦-١٠-٠٣)
 *
 * يُبقى في المستودع لأنّ الأيقونة قد تتبدّل: فإن تبدّلت أُعيد تشغيلُه فخرجت الأربعُ معها.
 *
 * **أربعةُ مُخرَجات، ولكلٍّ علّة:**
 *   · `icon-192` و`icon-512` — الأيقونةُ كما هي (مربّعٌ مدوَّرٌ بحوافّ شفّافة)، يطلبهما
 *     أندرويد للتثبيت ولشاشة البدء.
 *   · `icon-maskable-512` — أندرويد **يقصّ** الأيقونة بقناعه (دائرة · مربّع · قطرة)، فالسطحُ
 *     يمتدّ إلى الحوافّ بلا تدوير، والعلامةُ تُصغَّر حتّى يقع أبعدُ ركنٍ منها داخل «المنطقة
 *     الآمنة» (دائرةٌ نصفُ قطرها ٤٠٪ من العرض). ولو استُعملت الأولى لَقصّ القناعُ أطرافَ العلامة.
 *   · `badge-96` — رمزُ شريط الحالة في أندرويد: **ألفا وحدها تُقرأ**، واللونُ يُرمى. فالعلامةُ
 *     بيضاءُ على شفافيّة. (آيفون لا يقرؤه: يضع أيقونةَ التطبيق نفسَها في الإشعار.)
 *
 * التشغيل:  node scripts/pwa-icons.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const V2 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(V2, "apps/web/src/app/icon.svg");
const OUT = path.join(V2, "apps/web/public/pwa");
const VIEW = 1080; // مربّعُ رسم الأيقونة الأصل (viewBox)

// بيانُ المنشأ (C2PA) لا يُرسم، وهو نصفُ الملفّ — يُنزع قبل التحليل.
const svg = (await fs.readFile(SRC, "utf8")).replace(/<metadata>[\s\S]*?<\/metadata>/, "");
const rect = svg.match(/<rect class="st0"[^>]*\/>/)?.[0];
if (!rect) throw new Error("لم يُعثر على سطح الأيقونة (rect.st0) — تغيّر رسمُها؟");

/** أجزاءُ الرسم: وسمُ الفتح، والتعريفات (التدرّج)، والسطح، والعلامة (كلُّ ما بعد السطح). */
const open = svg.match(/<svg[^>]*>/)[0];
const defs = svg.match(/<defs>[\s\S]*?<\/defs>/)?.[0] ?? "";
const glyph = svg.slice(svg.indexOf(rect) + rect.length, svg.lastIndexOf("</svg>"));
/** العلامةُ وحدَها: الأيقونةُ بلا سطحها. */
const glyphOnly = `${open}${defs}${glyph}</svg>`;

/** حدودُ العلامة على مربّع الرسم: تُقاس بقصّ الشفافيّة لا تُخمَّن. */
async function glyphBox() {
  // رسمٌ ثمّ قصٌّ في خطّين: sharp يقدّم القصَّ على تغيير المقاس مهما كان ترتيبُ النداء.
  const raster = await sharp(Buffer.from(glyphOnly), { density: 72 }).resize(VIEW, VIEW).png().toBuffer();
  const { info } = await sharp(raster).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const left = -info.trimOffsetLeft;
  const top = -info.trimOffsetTop;
  return { left, top, right: left + info.width, bottom: top + info.height };
}

const png = (input, size) => sharp(Buffer.from(input), { density: 300 }).resize(size, size).png({ compressionLevel: 9 });

await fs.mkdir(OUT, { recursive: true });

for (const size of [192, 512]) {
  await png(svg, size).toFile(path.join(OUT, `icon-${size}.png`));
}

// القناع: أبعدُ ركنٍ من العلامة عن المركز يقع على ٣٣٪ — داخل حدّ الأربعين بهامشٍ يُرى، فلا
// تلتصق رأسُ العلامة وقاعدتُها بحافّة القناع الدائريّ (جُرِّب ٣٨٪ فبدت محشورة).
const box = await glyphBox();
const c = VIEW / 2;
const far = Math.max(
  ...[[box.left, box.top], [box.right, box.top], [box.left, box.bottom], [box.right, box.bottom]].map(([x, y]) =>
    Math.hypot(x - c, y - c),
  ),
);
const scale = Math.min(1, (0.33 * VIEW) / far);
// السطحُ ممدودًا إلى الحوافّ (بلا `rx`)، والعلامةُ مصغَّرةً حول المركز.
const maskable =
  `${open}${defs}${rect.replace(/\s*rx="[^"]*"/, "")}` +
  `<g transform="translate(${c} ${c}) scale(${scale.toFixed(4)}) translate(${-c} ${-c})">${glyph}</g></svg>`;
await png(maskable, 512).toFile(path.join(OUT, "icon-maskable-512.png"));

// الشارة: العلامةُ بيضاءُ محصورةً في مربّعها مع هامش ١٠٪.
const BADGE = 96;
const pad = Math.round(BADGE * 0.1);
const glyphRaster = await sharp(Buffer.from(glyphOnly), { density: 300 }).png().toBuffer();
const glyphTrim = await sharp(glyphRaster).trim({ threshold: 1 }).png().toBuffer();
const glyphPng = await sharp(glyphTrim)
  .resize(BADGE - pad * 2, BADGE - pad * 2, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
await sharp({ create: { width: BADGE, height: BADGE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: glyphPng, left: pad, top: pad }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(OUT, "badge-96.png"));

console.log(`✓ ${OUT}\n  حدودُ العلامة: ${JSON.stringify(box)} · مقياسُ القناع ${scale.toFixed(3)}`);
