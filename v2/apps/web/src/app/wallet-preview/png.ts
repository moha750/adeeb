/**
 * مرمِّز PNG أدنى **وراسمُ سطحِ البطاقة** — لأنّ حزمة `.pkpass` ترفض بلا `icon.png`، ولأنّ
 * أبل لا ترسم في بطاقة المتجر إلّا لونًا مصمتًا واحدًا (`backgroundColor`): لا تدرّجَ ولا
 * نقشًا ولا شبكةَ أختام. **فالصورةُ هي المنفَذ الوحيد** إلى سطحٍ يشبه هويّتنا، و`strip.png`
 * هو الصورةُ الوحيدة التي تقبلها هذه البطاقة.
 *
 * ولا رَاسِمَ صورٍ على الخادم (لا `sharp` ولا canvas)، فنكتب البكسلات بأيدينا ونضغطها
 * بـ`zlib` المدمج: ثلاث كتلٍ لا غير (IHDR · IDAT · IEND) بلون RGBA وبلا تشابك — أبسطُ
 * PNG صحيحٍ ممكن.
 *
 * > **وأيقونةُ البطاقة تحمل علامةَ أديب** (لا تدرّجًا عاريًا): قناتُها في `logo.ts`
 * > مقصوصةً على العلامة وحدها دون الاسمين — انظر رأسَه.
 */

import { deflateSync } from "node:zlib";
import { LOGO_SIDE, logoAlpha } from "./logo";
import { PATTERN_H, PATTERN_W, patternAlpha } from "./pattern";
import { crc32 } from "./zip";

/** كتلة PNG: طول + وسم + بيانات + CRC (على الوسم والبيانات معًا). */
function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const body = Buffer.concat([head.subarray(4), data]);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([head, data, tail]);
}

/** يبني ملفّ PNG من بكسلات RGBA خام (`w×h×4`). */
function encodePng(w: number, h: number, rgba: Buffer): Buffer {
  // كلّ سطرٍ يُسبَق ببايت المرشِّح — صفرٌ يعني «بلا مرشِّح»، وهو أبسطُ ما يقبله المعيار.
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y += 1) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // ثماني بتّاتٍ للقناة
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // الضغط: deflate (الوحيد في المعيار)
  ihdr[11] = 0; // المرشِّح: الأساسيّ
  ihdr[12] = 0; // بلا تشابك

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // توقيع PNG
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ── ألوان الهوية ───────────────────────────────────────────────────────── */

/**
 * **من `tokens.css` لا من الذاكرة** — والقيمُ هنا هي الرموزُ نفسُها بأرقامها، لأنّ الخادم
 * لا يحلّ `var(--…)`. فإن تغيّر الرمزُ في المكتبة تغيّر هنا؛ ولا لونَ خامسٌ من عندنا.
 */
type Rgb = readonly [number, number, number];

const STEEL_300: Rgb = [0x92, 0xaa, 0xc3]; // #92aac3 — بؤرةُ الضوء
const STEEL_400: Rgb = [0x5e, 0x88, 0xab]; // #5e88ab — أوّلُ `--grad-primary`
const NAVY_700: Rgb = [0x27, 0x40, 0x60]; // #274060 — لونُ جسم البطاقة (`backgroundColor`)
const NAVY_800: Rgb = [0x1e, 0x33, 0x50]; // #1e3350 — آخِرُ `--grad-primary`
const WHITE: Rgb = [0xff, 0xff, 0xff];

/** يركّب لونًا فوق بكسلٍ مصمت — `a` من صفرٍ إلى واحد، والوجهةُ تبقى معتمة. */
function over(rgba: Buffer, i: number, c: Rgb, a: number): void {
  if (a <= 0) return;
  const k = a >= 1 ? 1 : a;
  rgba[i] += Math.round((c[0] - rgba[i]) * k);
  rgba[i + 1] += Math.round((c[1] - rgba[i + 1]) * k);
  rgba[i + 2] += Math.round((c[2] - rgba[i + 2]) * k);
}

/* ── مربّع العلامة ──────────────────────────────────────────────────────── */

/** نسبةُ ضلعِ العلامة إلى ضلع الأيقونة — قِيست بالنظر إلى ٢٩ و٥٨ و٨٧ معًا (٠٫٦٢ ضاعت، و٠٫٨٦ تملأ). */
const MARK_COVER = 0.86;

/**
 * تقويةُ حبر العلامة بعد التصغير.
 *
 * **ولماذا تلزم**: علامةُ أديب **رسمٌ خطّيّ** لا شكلٌ مصمت. وعند التصغير يقع في كلّ بكسلٍ
 * خطٌّ رفيعٌ وحوله فراغ، فمتوسّطُ الرقعة يخرج **رماديًّا باهتًا** لا أبيض — فتُقاس الأيقونة
 * فتجد ١١ بكسلًا أبيضَ من ٨٤١ عند ٢٩ (١٫٣٪)، أيْ شبحًا لا يُرى. (رآه المالك في جهازه:
 * «لم يظهر شعار، فقط لون الخلفية».)
 *
 * والضربُ في ثلاثةٍ يردّ الخطوطَ بيضاءَ صريحةً ولا يُذيب تفاصيلَها. **قِيست أربعُ قيم**
 * (١ · ٢ · ٣ · ٤٫٥) على المقاسات الثلاثة: دونها يبقى شاحبًا، وفوقها يمتلئ جوفُ الرسم
 * فيصير لطخةً عند ٢٩.
 */
const MARK_GAIN = 3;

/**
 * أيقونةُ البطاقة: مربّعٌ بزوايا مدوّرة بتدرّج الهوية (فولاذيّ‑400 ← كحليّ‑800 بزاوية 135°)
 * **وعليه علامةُ أديب بيضاء**.
 *
 * **والحوافّ مُنعَّمة بالمعاينة الفائقة** (٤×٤ عيّنة للبكسل): الزاوية المدوّرة بلا تنعيمٍ
 * تُقرأ مُسنَّنةً في ٢٩ بكسلًا، وهي المقاس الذي يُعرض فيه.
 *
 * **والعلامةُ تُصغَّر بمتوسّط الرقعة لا بأقرب عيّنة**: نسبتُها ١:٢٫٨ (نحيلةٌ طويلة)، فأخذُ
 * بكسلٍ واحدٍ من كلّ رقعةٍ يقطّع خطوطها الرفيعة فتخرج نُقَطًا متناثرة. والمتوسّطُ يُبقيها
 * متّصلةً باهتةً — عُوينت الطريقتان جنبًا إلى جنب، والفرقُ صارخٌ عند ٢٩.
 */
export function brandIcon(size: number): Buffer {
  const rgba = Buffer.alloc(size * size * 4);
  const r = size * 0.22; // النسبة نفسها التي عليها أيقونات النظام في iOS تقريبًا
  const SS = 4; // عيّناتٌ في كلّ محور

  /** هل تقع النقطة داخل المستطيل المدوّر؟ */
  const inside = (x: number, y: number): boolean => {
    const cx = Math.min(Math.max(x, r), size - r);
    const cy = Math.min(Math.max(y, r), size - r);
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          if (inside(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS)) hits += 1;
        }
      }
      // موضعُ اللون على محور التدرّج (135° = القُطر من أعلى اليسار إلى أسفل اليمين)
      const t = Math.min(1, Math.max(0, (x + y) / (2 * (size - 1))));
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(STEEL_400[0] + (NAVY_800[0] - STEEL_400[0]) * t);
      rgba[i + 1] = Math.round(STEEL_400[1] + (NAVY_800[1] - STEEL_400[1]) * t);
      rgba[i + 2] = Math.round(STEEL_400[2] + (NAVY_800[2] - STEEL_400[2]) * t);
      rgba[i + 3] = Math.round((hits / (SS * SS)) * 255);
    }
  }

  // العلامةُ بيضاءَ في القلب — مربّعُها موسَّطٌ، والمصدرُ موسَّطٌ فيه أصلًا (`logo.ts`).
  const mark = logoAlpha();
  const side = size * MARK_COVER;
  const off = (size - side) / 2;
  const k = LOGO_SIDE / side; // بكسلاتُ المصدر لكلّ بكسلٍ في الوجهة

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // رقعةُ المصدر التي تقابل هذا البكسل، ومتوسّطُ شفّافيّتها
      const sx0 = (x - off) * k;
      const sy0 = (y - off) * k;
      let sum = 0;
      let n = 0;
      for (let sy = Math.max(0, Math.floor(sy0)); sy < Math.min(LOGO_SIDE, Math.ceil(sy0 + k)); sy += 1) {
        for (let sx = Math.max(0, Math.floor(sx0)); sx < Math.min(LOGO_SIDE, Math.ceil(sx0 + k)); sx += 1) {
          sum += mark[sy * LOGO_SIDE + sx];
          n += 1;
        }
      }
      if (n === 0) continue;
      over(rgba, (y * size + x) * 4, WHITE, Math.min(1, (sum / n / 255) * MARK_GAIN));
    }
  }

  return encodePng(size, size, rgba);
}

/* ── سطحُ البطاقة ───────────────────────────────────────────────────────── */

/** انتقالٌ ناعم بين عتبتين — الخطّيُّ يترك عند مبدئه انكسارًا في الميل يُقرأ خيطًا باهتًا. */
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * غلافُ الشريط الرأسيّ: صفرٌ عند الحافّتين وواحدٌ في الوسط — انظر `paintSurface`.
 *
 * **وهو غيرُ متناظر**: الطلوع أقصر من الهبوط، فيبدأ السطحُ من تحت الترويسة سريعًا ثمّ
 * ينحدر طويلًا إلى الحقول — كما ينحدر ضوءُ البطاقة في الصفحة من أعلاها إلى أسفلها.
 */
function envelope(y: number, h: number): number {
  const yn = y / (h - 1);
  return smoothstep(0, 0.26, yn) * (1 - smoothstep(0.58, 1, yn));
}

/**
 * التدرّج وبؤرةُ الضوء — طبقتا `.wp-side` الأوليان في `card.css`، بكسلًا بدل CSS.
 *
 * **والشريطُ يذوب في لون الجسم عند حافّتيه معًا** — وهذا شرطُ ألّا يُقرأ خطُّ قصٍّ أفقيّ:
 * ما فوق الشريط وما تحته يرسمهما iOS بـ`backgroundColor` **مصمتًا** (كحليّ‑700)، فأيُّ
 * لونٍ يبلغ الحافّة مخالفًا له يفضح أنّ ما بينهما صورةٌ ملصوقة. ولذلك يحكم السطحَ **غلافٌ
 * رأسيّ** (`envelope`) تُضرَب فيه طبقاتُه الثلاث جميعًا: صفرٌ عند الحافّتين وواحدٌ في
 * الوسط. فيصير الشريطُ **بندًا مضاءً من سطح الهويّة** يخرج من لون البطاقة ويعود إليه، لا
 * لصقةً عليها. والتدرّجُ يقف عند كحليّ‑700 لا كحليّ‑800 للسبب نفسِه: هو اللون الذي يُذاب فيه.
 *
 * **وبؤرةُ الضوء نازلةٌ عن موضعها في الورقة**: في الصفحة مركزُها فوق حافّة البطاقة
 * (`at 86% -10%`) فتغمر الترويسةَ والشريط معًا؛ وفي المحفظة الترويسةُ **خارج الصورة**
 * (يرسمها iOS على اللون المصمت) فلو تركنا المركز حيث هو لَبقي أكثرُ الضوء في أرضٍ لا
 * نملكها. فقُرّب حتى صار فوق حافّته بقليلٍ ليقع أكثرُه في المرئيّ — هو الضوءُ نفسُه،
 * والمقتطَعُ تغيّر.
 */
function paintSurface(rgba: Buffer, w: number, h: number): void {
  // نسبةُ المقاسات إلى بطاقة المعاينة (٣٤٠px) — فتُقاس البؤرة بالبكسل كما في الورقة.
  const k = w / 340;
  const cx = 0.86 * w;
  const cy = -0.15 * h;
  const rx = 300 * k;
  const ry = 190 * k;

  for (let y = 0; y < h; y += 1) {
    const env = envelope(y, h);

    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;

      // زاويةُ 135° على صندوقٍ غيرِ مربّع: إسقاطُ CSS نفسُه يختصر إلى (س+ص)/(عرض+ارتفاع)
      const t = (x + y) / (w + h - 2);
      for (let c = 0; c < 3; c += 1) {
        const diag = STEEL_400[c] + (NAVY_700[c] - STEEL_400[c]) * t;
        rgba[i + c] = Math.round(NAVY_700[c] + (diag - NAVY_700[c]) * env);
      }
      rgba[i + 3] = 255;

      // `radial-gradient(… , steel-300 50%, transparent 70%)`: انحدارٌ خطّيّ إلى السبعين
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.7) over(rgba, i, STEEL_300, 0.5 * (1 - d / 0.7) * env);
    }
  }
}

/**
 * نقشُ الهوية — قاعدةٌ مرصوفةٌ أسفلَ الشريط، هي `.wp-side::before` نفسُها: بلاطةٌ
 * **مركزيّةٌ أفقيًّا** بارتفاعٍ مقطوعٍ لا بنسبةٍ من العرض (درسُ `.aauth-side::after`)،
 * وبشفّافيّة ٠٫١٦.
 *
 * والعيّنة **ثنائيّةُ الخطّ** بمواضعِ مراكزِ البكسلات — فعند النصف بالضبط (شريط `@1x`)
 * تؤول إلى متوسّط ٢×٢ تمامًا، فلا يُفقَد من البلاطة شيءٌ ولا يُخترع.
 */
function paintPattern(rgba: Buffer, w: number, h: number): void {
  const src = patternAlpha();
  // البلاطة رُسمت لشريط `@2x` (ارتفاعه ٢٨٨)، فنسبتُها إليه هي مقاسُها في أيّ شريط.
  const band = Math.round((h * PATTERN_H) / 288);
  const tileW = Math.round((band * PATTERN_W) / PATTERN_H);
  const offX = (w - tileW) / 2; // مركزيّة: `center bottom`
  const top = h - band;

  /** شفّافيّةُ البلاطة عند نقطةٍ كسريّة — أفقيًّا تلتفّ (`repeat-x`)، ورأسيًّا تُقصَر. */
  const sample = (fx: number, fy: number): number => {
    const x0 = Math.floor(fx);
    const y0 = Math.min(PATTERN_H - 1, Math.max(0, Math.floor(fy)));
    const y1 = Math.min(PATTERN_H - 1, y0 + 1);
    const wrap = (v: number): number => ((v % PATTERN_W) + PATTERN_W) % PATTERN_W;
    const xa = wrap(x0);
    const xb = wrap(x0 + 1);
    const tx = fx - x0;
    const ty = Math.min(1, Math.max(0, fy - y0));
    const top0 = src[y0 * PATTERN_W + xa] * (1 - tx) + src[y0 * PATTERN_W + xb] * tx;
    const bot0 = src[y1 * PATTERN_W + xa] * (1 - tx) + src[y1 * PATTERN_W + xb] * tx;
    return top0 * (1 - ty) + bot0 * ty;
  };

  for (let y = top; y < h; y += 1) {
    const fy = ((y - top + 0.5) * PATTERN_H) / band - 0.5;
    // النقشُ محكومٌ بغلاف الشريط كسائر طبقاته، وإلّا قُطعت موجةٌ عند الحافّة قطعًا يُرى.
    const env = envelope(y, h);
    if (env <= 0) continue;
    for (let x = 0; x < w; x += 1) {
      const fx = ((x - offX + 0.5) * PATTERN_W) / tileW - 0.5;
      const a = sample(fx, fy) / 255;
      if (a > 0) over(rgba, (y * w + x) * 4, WHITE, a * 0.16 * env);
    }
  }
}

/* ── شريط الأختام ───────────────────────────────────────────────────────── */

/**
 * مقاييسُ الختم — **نِسَبٌ منقولةٌ عن `.wp-stamp` في `card.css`** (بطاقةُ المعاينة ٣٤٠px)،
 * فما يُقاس هنا هو ما يُقاس هناك مضروبًا في العرض. ولو كُتب رقمٌ من عندنا لَافترق سطحُ
 * الجهاز عن سطح الصفحة في الإيقاع وهما شيءٌ واحد.
 */
const M = {
  pad: 16 / 340, // حشوةُ البطاقة — الشريط سائبُ الحافّتين، فتُصطنع
  gapX: 6 / 340,
  gapY: 10 / 340,
  disc: 44 / 340, // القطر، والإطارُ داخله (`box-sizing: border-box`)
  border: 2 / 340,
  halo: 4 / 340,
  check: 14 / 44, // من قطر الختم — مقاسُ أيقونة `Check` في الورقة
} as const;

/**
 * علامةُ الصحّ — مسارُ `Check` من Phosphor بوزنٍ عريض، مركزُه في صندوقٍ ٢٥٦: ثلاثُ نقاطٍ
 * وخطٌّ سميك. (لا تُعكَس في العربيّة — الأيقونات لا يقلبها الاتّجاه، وكذلك في الصفحة.)
 */
const CHECK = [
  [40 / 256, 144 / 256],
  [96 / 256, 200 / 256],
  [224 / 256, 72 / 256],
] as const;
const CHECK_STROKE = 24 / 256;

/** أقصرُ مسافةٍ من نقطةٍ إلى قطعةٍ مستقيمة — بها يُرسَم الخطُّ السميك بأطرافٍ مدوّرة. */
function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const len = vx * vx + vy * vy;
  const t = len === 0 ? 0 : Math.min(1, Math.max(0, ((px - ax) * vx + (py - ay) * vy) / len));
  const dx = px - (ax + vx * t);
  const dy = py - (ay + vy * t);
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * **سطحُ البطاقة كاملًا صورةً** — تدرّجُ الهوية وبؤرةُ الضوء ونقشُها والأختامُ العشرة،
 * لأنّ PassKit يرسم حقولًا لا شبكات، ولا يعرف من الألوان إلّا لونًا واحدًا مصمتًا. فما
 * تراه المحفظةُ هنا هو ما تراه الصفحة، إلّا ما لا سبيل إليه (الباركود والحركة).
 *
 * **والمختوم قرصٌ مصمت، وغيرُ المختوم طوقٌ خافت** — فرقُ الامتلاء يُقرأ من بعيدٍ بلا لونٍ
 * ثانٍ، وتُقرأ البطاقة كذلك بلا تمييزٍ للألوان (ق٢).
 *
 * @param filled كم خُتم
 * @param total  عدد الخانات (صفّان متساويان)
 * @param w      عرض الشريط بالبكسل — أبل تشترط 375 (و750 للمضاعف)
 */
export function stampStrip(filled: number, total: number, w: number): Buffer {
  const h = Math.round(w * (144 / 375)); // نسبةُ شريط بطاقة المتجر كما تحدّدها أبل
  const rgba = Buffer.alloc(w * h * 4);

  paintSurface(rgba, w, h);
  paintPattern(rgba, w, h);

  const cols = Math.ceil(total / 2);
  const rows = 2;
  const d = M.disc * w;
  const R = d / 2;
  const border = M.border * w;
  const halo = M.halo * w;
  const cell = (w - 2 * M.pad * w - (cols - 1) * M.gapX * w) / cols;
  // الصفّان مركزيّان رأسيًّا في الشريط — لا تعلوهما ترويسةٌ هنا، فالمركزُ هو الاتّزان.
  const blockH = rows * d + (rows - 1) * M.gapY * w;
  const top = (h - blockH) / 2;
  const SS = 3; // معاينةٌ فائقة للحوافّ (٩ عيّنات للبكسل)
  const ico = M.check * d;
  const stroke = CHECK_STROKE * ico;

  for (let i = 0; i < total; i += 1) {
    // **من اليمين إلى اليسار**: البطاقة عربيّة، وiOS يعكس تخطيط الحقول ولا يعكس
    // الصور — فلو رسمنا من اليسار امتلأت أختامُ المحفظة في جهةٍ وأختامُ الصفحة في
    // الجهة المقابلة، وهما شيءٌ واحد.
    const col = cols - 1 - (i % cols);
    const row = Math.floor(i / cols);
    const cx = M.pad * w + col * (cell + M.gapX * w) + cell / 2;
    const cy = top + row * (d + M.gapY * w) + R;
    const on = i < filled;

    // نمسح مربّعَ الختم وحده لا الصورة كلّها — أرخصُ وأدقّ.
    const x0 = Math.max(0, Math.floor(cx - R - halo - 1));
    const x1 = Math.min(w, Math.ceil(cx + R + halo + 1));
    const y0 = Math.max(0, Math.floor(cy - R - halo - 1));
    const y1 = Math.min(h, Math.ceil(cy + R + halo + 1));

    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        let cHalo = 0;
        let cFill = 0;
        let cRing = 0;
        let cCheck = 0;

        for (let sy = 0; sy < SS; sy += 1) {
          for (let sx = 0; sx < SS; sx += 1) {
            const px = x + (sx + 0.5) / SS;
            const py = y + (sy + 0.5) / SS;
            const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);

            if (dist > R) {
              // الهالةُ خارجَ القرص، وللمختوم وحده
              if (on && dist <= R + halo) cHalo += 1;
              continue;
            }

            cFill += 1;

            if (!on) {
              if (dist > R - border) cRing += 1;
              continue;
            }

            // إحداثيّاتُ صندوق الأيقونة (٠..١) حول مركز الختم
            const ix = (px - (cx - ico / 2)) / ico;
            const iy = (py - (cy - ico / 2)) / ico;
            const dc = Math.min(
              distToSeg(ix, iy, CHECK[0][0], CHECK[0][1], CHECK[1][0], CHECK[1][1]),
              distToSeg(ix, iy, CHECK[1][0], CHECK[1][1], CHECK[2][0], CHECK[2][1]),
            );
            if (dc * ico <= stroke / 2) cCheck += 1;
          }
        }

        const n = SS * SS;
        const i4 = (y * w + x) * 4;
        // الترتيب ترتيبُ الورقة: هالةٌ ثمّ قرصٌ/غِشاوة ثمّ طوقٌ ثمّ العلامة فوق القرص.
        if (cHalo) over(rgba, i4, WHITE, (cHalo / n) * 0.14);
        // الفارغُ غِشاوةٌ زجاجيّةٌ (٪٨) لا فراغ: السطحُ متدرّج، وطوقٌ بلا ملءٍ يذوب في أفتحه.
        if (cFill) over(rgba, i4, WHITE, (cFill / n) * (on ? 1 : 0.08));
        if (cRing) over(rgba, i4, WHITE, (cRing / n) * 0.42);
        if (cCheck) over(rgba, i4, NAVY_700, cCheck / n);
      }
    }
  }

  return encodePng(w, h, rgba);
}

/* ── خلفيّةُ بطاقة الحدث (تجربة) ─────────────────────────────────────────── */

/**
 * **خلفيّةٌ تملأ البطاقة كلَّها** — لنوع `eventTicket` وحده (`background.png`).
 *
 * وهي المنفَذ الوحيد في صيغة `pkpass` إلى سطحٍ مصمَّمٍ لا شريطٍ في وسط بطاقة. تُرسَم
 * بطبقات الهوية نفسِها التي في `paintSurface` — **بلا الغلاف الرأسيّ**: ذاك يُذيب
 * الشريطَ في لون الجسم عند حافّتيه، وهذه لا جسمَ حولها تذوب فيه.
 *
 * وفوقها العلامةُ بيضاءَ في القلب — إذ لا شريطَ هنا يحملها.
 *
 * > **تجربةٌ لم تُقَس بعد**: يُرجَّح أنّ iOS يُموّه هذه الصورة (تُعرَض أجواءً لا لوحةً
 * > حادّة). فإن خرجت مموّهةً فالنوعُ لا يصلح لنا، ونرجع إلى `storeCard` بسطر.
 */
export function ticketBackground(w: number, h: number): Buffer {
  const rgba = Buffer.alloc(w * h * 4);
  const cx = 0.8 * w;
  const cy = -0.1 * h;
  const rx = 0.9 * w;
  const ry = 0.55 * h;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const t = (x + y) / (w + h - 2);
      for (let c = 0; c < 3; c += 1) rgba[i + c] = Math.round(STEEL_400[c] + (NAVY_800[c] - STEEL_400[c]) * t);
      rgba[i + 3] = 255;

      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.75) over(rgba, i, STEEL_300, 0.42 * (1 - d / 0.75));
    }
  }

  paintPattern(rgba, w, h);

  // العلامةُ في القلب — بارتفاعٍ ثلثيِّ البطاقة، والتصغيرُ بمتوسّط الرقعة كما في الأيقونة
  const mark = logoAlpha();
  const side = h * 0.62;
  const offX = (w - side) / 2;
  const offY = (h - side) / 2;
  const k = LOGO_SIDE / side;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const sx0 = (x - offX) * k;
      const sy0 = (y - offY) * k;
      let sum = 0;
      let n = 0;
      for (let sy = Math.max(0, Math.floor(sy0)); sy < Math.min(LOGO_SIDE, Math.ceil(sy0 + k)); sy += 1) {
        for (let sx = Math.max(0, Math.floor(sx0)); sx < Math.min(LOGO_SIDE, Math.ceil(sx0 + k)); sx += 1) {
          sum += mark[sy * LOGO_SIDE + sx];
          n += 1;
        }
      }
      if (n === 0) continue;
      over(rgba, (y * w + x) * 4, WHITE, Math.min(1, (sum / n / 255) * MARK_GAIN));
    }
  }

  return encodePng(w, h, rgba);
}
