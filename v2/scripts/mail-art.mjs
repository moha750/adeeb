#!/usr/bin/env node
/**
 * **مِعملُ صور البريد** — يخرج وجوهَ ديبو التي تلبسها رسائلُ أدِيب (٢٠٢٦-١٠-١٧).
 *
 * الوجوهُ في `public/deebo/*.webp` (يخرجها `scripts/deebo-art.mjs`)، والبريدُ لا يقبلها كما هي:
 * Outlook على الحاسوب لا يعرض WebP. فهذا المِعملُ يخبز من كلّ وجهٍ يستعمله البريدُ نسخةَ PNG بلوحةٍ
 * محدودة (نحو ٤٠ كيلوبايت) في `public/deebo/mail/`، في هالةٍ فولاذيّةٍ تجمعه بسماء الرأس، بضعف مقاس العرض
 * (١٨٠ تقريبًا) لشاشات الجوّال الكثيفة.
 *
 * **والقائمةُ توأمُ `MAIL_MOODS` في `apps/web/src/lib/email/layout.ts`**، واختبارُ البريد يتحقّق أنّ لكلّ
 * وجهٍ هناك ملفَّه هنا. فإن أُضيف وجهٌ أُضيف في الموضعين، وأُعيد تشغيلُ هذا.
 *
 * التشغيل:  node scripts/mail-art.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const V2 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(V2, "apps/web/public/deebo");
const OUT = path.join(SRC, "mail");

const MOODS = [
  "confident",
  "customer-support",
  "explaining",
  "welcome",
  "congratulations",
  "announcement",
  "writing",
  "reminder",
  "thumbs-up",
];

await fs.mkdir(OUT, { recursive: true });
for (const mood of MOODS) {
  const out = path.join(OUT, `${mood}.png`);
  // ديبو في هالةٍ فولاذيّة (‎steel-400 بشفافيّةٍ تتلاشى)، تجمعه بسماء الرأس الفاتحة ولا يطفو عليها.
  const halo = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><radialGradient id="g" cx="50%" cy="55%" r="50%"><stop offset="0" stop-color="#5e88ab" stop-opacity="0.22"/><stop offset="0.6" stop-color="#5e88ab" stop-opacity="0.07"/><stop offset="1" stop-color="#5e88ab" stop-opacity="0"/></radialGradient></defs><rect width="400" height="400" fill="url(#g)"/></svg>`,
  );
  const deebo = await sharp(path.join(SRC, `${mood}.webp`))
    .resize(340, 340, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp(halo)
    .composite([{ input: deebo, left: 30, top: 46 }])
    .png({ palette: true, quality: 95, compressionLevel: 9 })
    .toFile(out);
  const { size } = await fs.stat(out);
  console.log(`${mood}.png  ${(size / 1024).toFixed(1)} KB`);
}
