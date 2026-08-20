/**
 * مُشغِّلُ الحرّاس — **يُشغّلها كلَّها ثمّ يحكم**، لا يقف عند أوّل ساقط.
 *
 * العلّة (٢٠٢٦-٠٨-١٦): كان `check` سلسلةَ `&&`، فإن سقط حارسُ الفواصل لم يعمل حارسُ
 * الأيقونات بعده أصلًا — فبقي **مظلمًا** لا يُعرف أصحيحٌ هو أم فاسد، وأنت تحسبه يحرس.
 * وسلسلةُ `&&` تكذب مرّتين: تُخفي عيبًا لم يُفحص، وتُري عيبًا واحدًا كأنّه كلُّ ما هناك.
 *
 * فصار كلُّ حارسٍ يُشغَّل على حدة ويُطبع خبرُه، ثمّ يُجمَع الحكم: خروجٌ بـ1 إن سقط واحد،
 * وخلاصةٌ في الذيل تسمّي من سقط ومن نجا — فتُصلَح المخالفاتُ كلُّها في جولةٍ واحدة.
 *
 * التشغيل: `pnpm check`.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

const GUARDS = [
  { file: "css-single-source.mjs", name: "المصدر الواحد للأوراق" },
  { file: "modal-spacing.mjs", name: "فجوة النوافذ" },
  { file: "no-separators.mjs", name: "الفواصل المرسومة" },
  { file: "glyph-weights.mjs", name: "أوزان الأيقونات" },
];

const fallen = [];

for (const g of GUARDS) {
  const r = spawnSync(process.execPath, [join(HERE, g.file)], { stdio: "inherit" });
  if (r.status !== 0) fallen.push(g.name);
}

console.log("");
if (fallen.length) {
  console.error(`✖ سقط من الحرّاس ${fallen.length} من ${GUARDS.length}: ${fallen.join("، ")}`);
  process.exit(1);
}
console.log(`✔ الحرّاسُ الأربعةُ نجحوا: ${GUARDS.map((g) => g.name).join("، ")}`);
