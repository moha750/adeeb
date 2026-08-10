/**
 * حارس فجوة النوافذ — يمنع أن يخترع مستدعٍ تباعدَ أبناء النافذة من جديد.
 *
 * جسمُ النافذة (`.mdl-body`) هو الحاوية المخطِّطة: فجوةٌ واحدة (14px) بين أبنائه المباشرين،
 * وكلُّ ابنٍ يأخذ صفَّه كاملًا. قبل ٢٠٢٦-٠٨-٠٨ كان كلُّ نافذةٍ تخترع تباعدها:
 * `space-y-6` · `flex flex-col gap-4` · `style={{ display: "grid", gap: 16 }}` · `.org-modal`،
 * فتراوحت الفجوة بين ١٢ و٢٤، ومن لم يخترع شيئًا التصقت حقولُه بلا فرجة. وُحّدت كلُّها في المكتبة،
 * وهذا الحارس يمنع عودتها: **لا ابنَ مباشرًا لنافذةٍ يكدّس رأسيًّا بفجوةٍ من عنده.**
 *
 * ما يُفحص (في `apps/web/src/**\/*.tsx`):
 *   ١. الصنفان الميّتان `mdl-grid`/`mdl-full` — خلَفُهما `form-grid`/`form-full` في المكتبة.
 *   ٢. أبناءُ `<Modal>` المباشرون: يُمنع فيهم `space-y-*` وكلُّ تكديسٍ رأسيّ بفجوة
 *      (`flex-col` مع `gap-*` · `flexDirection: "column"` مع gap · `display: "grid"` مع gap).
 * الاقترانُ في صفّ يبقى مسموحًا بحاويته المعلَنة `form-grid` (فجوتها من المصدر نفسه)،
 * والصفوفُ الأفقيّة (`flex items-center gap-2`) لا تُمَسّ: تلك تباعدُ محتوًى لا تباعدُ أبناء نافذة.
 *
 * «الابن المباشر» يُعرَف بالإزاحة: إزاحةُ وسم `<Modal` زائد اثنين — والمستودع كلُّه على مسافتين.
 *
 * التشغيل: `pnpm check` (أو `node scripts/modal-spacing.mjs`)، ويخرج بـ1 عند أيّ مخالفة.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "apps/web/src");

/** أصنافٌ أُعدمت — أيّ بقيّةٍ منها في JSX خطأٌ صامت (لا قاعدة لها في أيّ ورقة) */
const DEAD = ["mdl-grid", "mdl-full", "mdl-tabpanel", "org-modal\""];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const indentOf = (line) => line.length - line.trimStart().length;

/** أسطرُ الأبناء المباشرين لكلّ `<Modal>` في الملفّ */
function directChildren(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*<Modal(\s|$|>)/.test(lines[i])) continue;
    const indent = indentOf(lines[i]);
    // نهايةُ وسم الفتح: سطرٌ إزاحتُه إزاحةُ الوسم ويُغلقه بـ«>»
    let j = i;
    while (j < lines.length && !(indentOf(lines[j]) === indent && lines[j].trimEnd().endsWith(">"))) j++;
    const close = " ".repeat(indent) + "</Modal>";
    for (let k = j + 1; k < lines.length && !lines[k].startsWith(close); k++) {
      if (lines[k].trim() && indentOf(lines[k]) === indent + 2) out.push(k);
    }
  }
  return out;
}

/** هل يكدّس هذا السطر رأسيًّا بفجوةٍ من عنده؟ */
function stacksVertically(line) {
  if (/space-y-\d/.test(line)) return "space-y";
  if (/flex-col/.test(line) && /gap-\d/.test(line)) return "flex-col + gap";
  if (/flexDirection:\s*"column"/.test(line) && /gap:/.test(line)) return "flexDirection column + gap";
  if (/display:\s*"grid"/.test(line) && /gap:/.test(line)) return "grid + gap";
  return null;
}

const problems = [];
for (const file of walk(SRC)) {
  const lines = readFileSync(file, "utf8").split("\n");
  const rel = relative(ROOT, file);
  lines.forEach((line, i) => {
    for (const dead of DEAD) {
      if (line.includes(dead)) problems.push(`${rel}:${i + 1}  صنفٌ مُعدَم: ${dead.replace('"', "")}`);
    }
  });
  for (const i of directChildren(lines)) {
    const why = stacksVertically(lines[i]);
    if (why) problems.push(`${rel}:${i + 1}  ابنٌ مباشرٌ لنافذة يخترع تباعده (${why})`);
  }
}

if (problems.length) {
  console.error(`\n✖ حارس فجوة النوافذ — ${problems.length} مخالفة:\n`);
  for (const p of problems) console.error("   " + p);
  console.error(
    "\n  الجسمُ يملك الفجوة: احذف الغلاف ودع أبناءه يتدفّقون." +
    "\n  وإن أردت اقترانَ حقلين في صفّ فالحاوية `form-grid` (فجوتها من المصدر نفسه)،" +
    "\n  وإن أردت توسيط المحتوى فالصنف `mdl-center` على النافذة.\n",
  );
  process.exit(1);
}
console.log("✔ حارس فجوة النوافذ: لا نافذة تخترع تباعدها.");
