#!/usr/bin/env node
/**
 * **مِعملُ تفاعلات ديبو** — يحوّل رسوم الشخصيّة الخام إلى ما يصلح للويب.
 *
 * سلّم المالك ٣٩ تفاعلًا في ٢٠٢٦-٠٨-٢٠: PNG بـ1254px و**٤٤ ميغابايت**. ولا تُودَع كذلك
 * في مستودعٍ ولا تُشحن إلى متصفّح: صورةٌ واحدةٌ منها أثقلُ من صفحةِ أديب كلِّها.
 *
 * وهذا المِعمل يُبقى في المستودع لا يُرمى بعد أوّل تشغيل، لسببين:
 *   ١) **الخامُ ليس هنا** (مجلّدُ تنزيلاتِ المالك، خارج git). فلو ضاع المُخرَج لم يُعرَف كيف
 *      صُنع، ولا بأيّ مقاسٍ ولا بأيّ نوعِ ملاءمة.
 *   ٢) **والتفاعلاتُ ستزيد.** فإذا زاد واحدٌ أُعيد تشغيلُه على المجلّد كلِّه فيخرج متّسقًا
 *      مع إخوته، ولا يُقصّ واحدٌ بيدٍ فيفارقهم في المقاس أو الموضع.
 *
 * **حكمان في التحويل، وكلاهما لعلّة:**
 *   · **التوحيدُ على مربّعٍ بمرساةٍ سفليّة.** ثمانيةٌ وثلاثون منها 1254×1254 و`Thinking`
 *     وحدها 1207×1303. فلو تُركت لاختلف مقاسُ الرأس بين تفاعلٍ وآخر، فيثب وجهُ ديبو
 *     كلّما تبدّل حالُه. والمرساةُ **سفليّة** لأنّ الرسم صدرٌ مقطوعٌ عند أسفله: لو وُسّط
 *     رأسيًّا لطفا الصدرُ في الفراغ وبان القطع.
 *   · **WebP بجودة 82**: الشفافيّةُ تلزم (الشخصيّةُ تقع على سطحٍ ملوّن)، وWebP يحملها
 *     بعُشر وزن PNG. والمقاسُ 384px يكفي أكبرَ استعمالٍ عندنا (شخصيّةُ الترحيب ~176px
 *     على شاشةٍ مضاعفة الكثافة) فلا يُشحن ما لا يُرى.
 *
 * التشغيل:  node scripts/deebo-art.mjs [--src "مسار المجلّد"] [--dry]
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const V2 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(V2, "apps/web/public/brand/deebo");

/** مجلّدُ المالك كما سلّمه. يُنقَض بـ`--src`. */
const DEFAULT_SRC = path.join(os.homedir(), "Downloads", "تفاعلات ديبو الي بنحب دبديبو");

const CANVAS = 1254; // مربّعُ الأغلبيّة: إليه يُلاءم الشاذّ لا العكس
const SIZE = 384;
const QUALITY = 82;

const argv = process.argv.slice(2);
const dry = argv.includes("--dry");
const srcIdx = argv.indexOf("--src");
const SRC = srcIdx >= 0 ? argv[srcIdx + 1] : DEFAULT_SRC;

/** `Calm_Down.png` ⟵ `calm-down` — أسماءُ الملفّات في الويب صغيرةٌ بشرطة. */
const slug = (file) => path.basename(file, path.extname(file)).toLowerCase().replace(/_/g, "-");

const files = (await fs.readdir(SRC).catch(() => null))?.filter((f) => /\.png$/i.test(f))?.sort();
if (!files) {
  console.error(`✖ لا مجلّدَ في: ${SRC}\n  مرّر مساره بـ--src "…"`);
  process.exit(1);
}

if (!dry) await fs.mkdir(OUT, { recursive: true });

let inBytes = 0;
let outBytes = 0;
const names = [];

for (const file of files) {
  const from = path.join(SRC, file);
  const name = slug(file);
  names.push(name);
  inBytes += (await fs.stat(from)).size;

  const buf = await sharp(from)
    // مربّعٌ واحدٌ للجميع، والشاذُّ يُلاءم إليه بمرساةٍ سفليّة (انظر رأس الملفّ)
    .resize(CANVAS, CANVAS, {
      fit: "contain",
      position: "bottom",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize(SIZE, SIZE)
    .webp({ quality: QUALITY, alphaQuality: 100 })
    .toBuffer();

  outBytes += buf.length;
  if (!dry) await fs.writeFile(path.join(OUT, `${name}.webp`), buf);
}

const mb = (n) => (n / 1024 / 1024).toFixed(1);
console.log(`${dry ? "(تجربة) " : ""}✔ ${files.length} تفاعلًا: ${mb(inBytes)}MB ← ${mb(outBytes)}MB`);
console.log(`  المُخرَج: ${path.relative(V2, OUT)}`);
console.log(`  الأسماء: ${names.join(" · ")}`);
