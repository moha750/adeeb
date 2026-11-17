/**
 * **حارسُ الختم** (قانونُ محمد ٢٠٢٦-١١-١٦: «إذا كلّ مرةٍ تنسى اجعله قانون»): الزرُّ الثانويُّ صندوقٌ أبيضُ **يحمل ختمَه** — أيقونتَه في مربّعٍ
 * من اللوح (`AdButton`، قاعدةُ الختم ٢٠٢٦-١٠-٣١). نُسي مرّةً في «افتحه في المكتبة» (محرّر الكتيّب)، فوقف بلا ختمٍ بجانب «أوقف النشر».
 *
 * فكلُّ `<AdButton>` بنوعٍ ثانويّ (`line`، والافتراضُ إن لم يُذكر النوع، و`soft`، و`danger`) **له `icon`**، وإلّا سقط الحارس.
 * والأساسيُّ (`fill`، `danger-fill`) والهادئُ (`quiet`) قطعةٌ من اللوح أو سطرٌ بلا صندوق، فلا ختمَ لهما.
 * **والاستثناءُ مكتوبٌ لا مسكوتٌ عنه**: `plain` على الزرّ نفسه — للرجوع (إلغاء، إغلاق، تراجع) وثانيَي الالتزام في النماذج، وهي بلا ختمٍ بقرار.
 *
 * التشغيل: `node scripts/button-stamps.mjs` (ومن `pnpm check`).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "apps/web/src");
const NO_STAMP = new Set(["fill", "danger-fill", "quiet"]);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith(".tsx") && !p.includes("__tests__")) yield p;
  }
}

/** وسمُ الافتتاح كاملًا: يقفز فوق `{…}` المتداخلة و`=>` حتى أوّل `>` في مستوى الوسم */
function openTag(s, at) {
  let depth = 0;
  for (let i = at; i < s.length; i++) {
    const c = s[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0 && s[i - 1] !== "=") return s.slice(at, i + 1);
  }
  return s.slice(at);
}

const bad = [];
for (const file of walk(SRC)) {
  const s = readFileSync(file, "utf8");
  let i = s.indexOf("<AdButton");
  while (i >= 0) {
    const next = s[i + "<AdButton".length];
    if (next === " " || next === "\n" || next === ">") {
      const tag = openTag(s, i);
      const v = tag.match(/\bvariant=(?:"([\w-]+)"|\{)/);
      // نوعٌ محسوبٌ (`variant={…}`) يُحكم عليه بما يحسبه: لا يُخمَّن، فيُطلب ختمُه أو `plain`
      const variant = v ? v[1] ?? "?" : "line";
      const stamped = /\bicon=/.test(tag) || /\bplain\b/.test(tag);
      if (!NO_STAMP.has(variant) && !stamped) {
        const line = s.slice(0, i).split("\n").length;
        bad.push(`${relative(ROOT, file)}:${line}  (${variant})`);
      }
    }
    i = s.indexOf("<AdButton", i + 1);
  }
}

if (bad.length) {
  console.error(`✖ حارسُ الختم: ${bad.length} زرًّا ثانويًّا بلا ختم — أعطه \`icon\`، أو \`plain\` إن كان رجوعًا أو ثانيَ التزام:`);
  for (const b of bad) console.error(`  ${b}`);
  process.exit(1);
}
console.log("✔ حارسُ الختم: كلُّ زرٍّ ثانويٍّ يحمل ختمَه.");
