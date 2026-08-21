/**
 * حارسُ أيقونات الجوّال — **لا تُستورَد أيقونةٌ من جذر `phosphor-react-native`.**
 *
 * وليست قاعدةَ ذوق: المكتبةُ ١٥١٢ أيقونةً، وMetro لا يهزّ الشجرة، فاستيرادُ واحدةٍ من
 * الجذر يجرّها كلَّها. قِيست حزمةُ الإنتاج يوم ٢٠٢٦-٠٨-٢٠ فكانت **١٦٫٨ ميغابايت**،
 * فلمّا صار الاستيرادُ إفرادًا عبر بابٍ معتمَدٍ في `exports` صارت **٨٫٤** — النصفُ بالضبط.
 *
 * والبابُ الوحيدُ `apps/mobile/src/ui/glyphs.tsx`: فيه الاستيرادُ المفرد، وفيه يُضبط
 * الوزنُ duotone مرّةً واحدة (كان `IconContext` يفعلها، وهو نفسُه يُستورَد من الجذر
 * فيُبطل المكسب).
 *
 * نظيرُه في الويب `glyph-weights.mjs`، والقانونُ واحدٌ في الدارين.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "apps", "mobile");
const HOME = join(APP, "src", "ui", "glyphs.tsx");

const walk = (dir) => {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".expo" || name === "ios" || name === "android") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
};

const offenders = [];
for (const file of [...walk(join(APP, "app")), ...walk(join(APP, "src"))]) {
  if (file === HOME) continue;
  const src = readFileSync(file, "utf8");
  if (/from ["']phosphor-react-native["']/.test(src)) offenders.push(relative(ROOT, file));
}

if (offenders.length) {
  console.error(`✖ حارسُ أيقونات الجوّال: ${offenders.length} ملفًّا يستورد من جذر المكتبة.`);
  for (const f of offenders) console.error(`   · ${f}`);
  console.error("   البابُ الوحيد: apps/mobile/src/ui/glyphs.tsx — أضِف الأيقونةَ فيه ثمّ استوردها منه.");
  process.exit(1);
}
console.log("✓ أيقوناتُ الجوّال تُستورَد إفرادًا من بيتها الواحد");
