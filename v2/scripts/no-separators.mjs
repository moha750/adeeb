/**
 * حارس الفواصل المرسومة — **لا نقطةَ ولا شريطَ في نصٍّ يراه المستخدم**.
 *
 * القاعدة بكلمة المالك (٢٠٢٦-٠٨-٠٩): «ظهور عضو لجنة الإعلام أبلغ من عضو · لجنة الإعلام»،
 * ثمّ عمّمها على الواجهات كلّها: لا أشرطة ولا نقاط. وعلّتُها أنّ الفاصل المرسوم يقطع ما هو
 * موصولٌ في الأصل (الدورُ ووحدتُه جملةٌ واحدة)، وحيث يفترق شيئان فالفاصلةُ العربيّة تكفي.
 *
 * البديل حين يُطلب فصل:
 *   جملةٌ واحدة (رتبةٌ ووحدتُها) ⇐ **مسافة** — ومصدرُها `positionLine` في `lib/positionLabel`.
 *   خبران متجاوران          ⇐ «، » (وفي نصٍّ لاتينيٍّ خالص «, »).
 *   شاهدُ حالٍ لا فاصل        ⇐ كلمةٌ أو أيقونة، لا نقطةٌ ولا دائرة.
 *
 * ما يُفحص: `apps/web/src` و`packages/design-system/src` (كلّ .ts/.tsx)، وكلُّ ورقة CSS
 * في الموقع والمكتبة (`content:` وحدها — النقطةُ فيها تُرسَم على الشاشة).
 * وما لا يُفحص: **التعليقات** — توثيقٌ لا يراه أحد، وفيه تُقرأ النقطةُ فاصلًا مريحًا.
 * ولا **ملفّاتُ الاختبار** (`*.test.ts` و`__tests__/`): اسمُ الاختبار وصفٌ للمطوّر لا نصٌّ
 * يقع عليه بصرُ عضو، والقاعدةُ إنّما تحرس ما يراه المستخدم (٢٠٢٦-٠٨-١٦).
 *
 * أداةُ الفحص تفهم القوالب `` `…${كود}…` `` فلا تخلط `||` البرمجيّ بالشريط المرئيّ،
 * ولا تعدّ نوعًا مثل `"a" | "b"` مخالفة: الشريطُ لا يُدان إلّا وجارُه حرفٌ عربيّ.
 *
 * وتفهم كذلك **التعبير النمطيّ** `/…/` فلا يُدان بدلُه: في ٢٠٢٦-٠٨-١٦ أوقف الحارسُ البناءَ
 * كلَّه بسبب `(أد[ِي]?يب|Adeeb)` في `StatsView` — شريطٌ جارُه حرفٌ عربيّ، لكنّه بدلٌ في تعبيرٍ
 * نمطيّ لا يُرسَم على شاشةٍ قطّ. والتعبيرُ كودٌ كالتعليق، فيُتخطّى مثلَه.
 *
 * التشغيل: `pnpm check` (أو `node scripts/no-separators.mjs`)، ويخرج بـ1 عند أيّ مخالفة.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CODE = ["apps/web/src", "packages/design-system/src"];
const SHEETS = ["apps/web/src", "packages/design-system"];
const AR = /[؀-ۿݐ-ݿ]/;

const IS_TEST = /(^|[\\/])__tests__[\\/]|\.test\.tsx?$|\.spec\.tsx?$/;

function walk(dir, ext) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "__tests__") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, ext));
    else if (ext.test(p)) out.push(p);
  }
  return out;
}

/**
 * يعلّم كلّ حرفٍ في الملفّ: `c` تعليق · `s` نصٌّ حرفيّ · `n` كودٌ أو نصُّ JSX.
 * يفتح `${` داخل القالب على حالة الكود ويغلقها بقوسها، فلا يُعَدّ ما فيه نصًّا.
 */
const RE_BEFORE = new Set(["", "=", "(", ",", "[", "{", ";", ":", "!", "&", "|", "?", "+", "-", "*", "%", "~", "^", "}", ">", "\n"]);
const RE_WORDS = new Set(["return", "typeof", "case", "in", "of", "do", "else", "yield", "await", "delete", "void", "instanceof", "new"]);

/** أهذا `/` فاتحةُ تعبيرٍ نمطيّ أم قسمة؟ يُحسم بما قبله: بعد قيمةٍ قسمةٌ، وبعد مُعامِلٍ تعبير. */
function opensRegex(src, i, prevSig, prevWord) {
  if (RE_BEFORE.has(prevSig)) return true;
  return RE_WORDS.has(prevWord);
}

/** يقرأ التعبيرَ النمطيَّ من فاتحته إلى خاتمته براياته، ويردّ موضعَ ما بعده (أو ‎-1 إن لم يُغلَق). */
function readRegex(src, i) {
  let j = i + 1, inClass = false;
  while (j < src.length) {
    const e = src[j];
    if (e === "\\") { j += 2; continue; }
    if (e === "\n") return -1;
    if (e === "[") inClass = true;
    else if (e === "]") inClass = false;
    else if (e === "/" && !inClass) {
      j++;
      while (j < src.length && /[a-z]/i.test(src[j])) j++;
      return j;
    }
    j++;
  }
  return -1;
}

function classify(src) {
  const st = new Array(src.length).fill("n");
  const stack = [];
  let mode = "n", i = 0, depth = 0;
  let prevSig = "", prevWord = "";
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (mode === "n") {
      if (c === "/" && d === "/") { st[i] = st[i + 1] = "c"; i += 2; mode = "line"; continue; }
      if (c === "/" && d === "*") { st[i] = st[i + 1] = "c"; i += 2; mode = "block"; continue; }
      if (c === "/" && opensRegex(src, i, prevSig, prevWord)) {
        const end = readRegex(src, i);
        // التعبيرُ النمطيُّ كودٌ لا يُرسَم، فيُعلَّم تعليقًا ويُتخطّى بدلُه `|` وحرفُه `·`
        if (end > 0) { for (let k = i; k < end; k++) st[k] = "c"; prevSig = "/"; prevWord = ""; i = end; continue; }
      }
      if (c === "'" || c === '"' || c === "`") { st[i] = "s"; mode = c === "`" ? "tpl" : c === "'" ? "sq" : "dq"; i++; continue; }
      if (c === "}" && stack.length && depth === 0) { st[i] = "s"; mode = stack.pop(); i++; continue; }
      if (stack.length) { if (c === "{") depth++; else if (c === "}") depth--; }
      st[i] = "n";
      if (!/\s/.test(c)) {
        prevSig = c;
        prevWord = /[A-Za-z_$]/.test(c) ? prevWord + c : "";
      } else if (c === "\n") prevWord = "";
      i++; continue;
    }
    if (mode === "line") { st[i] = "c"; if (c === "\n") mode = "n"; i++; continue; }
    if (mode === "block") { st[i] = "c"; if (c === "*" && d === "/") { st[i + 1] = "c"; i += 2; mode = "n"; } else i++; continue; }
    st[i] = "s";
    if (c === "\\") { if (i + 1 < src.length) st[i + 1] = "s"; i += 2; continue; }
    if (mode === "tpl" && c === "$" && d === "{") { st[i + 1] = "s"; stack.push("tpl"); mode = "n"; depth = 0; i += 2; continue; }
    if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"') || (mode === "tpl" && c === "`")) mode = "n";
    i++;
  }
  return st;
}

const problems = [];

for (const d of CODE) {
  for (const file of walk(join(ROOT, d), /\.tsx?$/)) {
    if (IS_TEST.test(file)) continue;
    const src = readFileSync(file, "utf8");
    if (!src.includes("·") && !src.includes("|")) continue;
    const st = classify(src);
    const lines = src.split("\n");
    let base = 0;
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      for (let k = 0; k < line.length; k++) {
        const ch = line[k];
        if (st[base + k] === "c") continue;
        if (ch === "·") {
          problems.push(`${relative(ROOT, file)}:${li + 1}  نقطةٌ مرئيّة: ${line.trim().slice(0, 110)}`);
          break;
        }
        if (ch === "|") {
          // الشريطُ يُدان حين يجاور عربيّةً — فأنواعُ TypeScript و«أو» المنطقيّة تنجو
          const before = line.slice(0, k).trimEnd().slice(-1);
          const after = line.slice(k + 1).trimStart().slice(0, 1);
          if (AR.test(before) || AR.test(after)) {
            problems.push(`${relative(ROOT, file)}:${li + 1}  شريطٌ مرئيّ: ${line.trim().slice(0, 110)}`);
            break;
          }
        }
      }
      base += line.length + 1;
    }
  }
}

// الأوراق: النقطةُ والشريطُ في `content:` يُرسمان على الشاشة كما لو كُتبا في JSX
for (const d of SHEETS) {
  for (const sheet of walk(join(ROOT, d), /\.css$/)) {
    const src = readFileSync(sheet, "utf8");
    src.split("\n").forEach((line, i) => {
      const m = line.match(/content:\s*("[^"]*"|'[^']*')/);
      if (!m) return;
      const val = m[1].replace(/\\00b7/gi, "·").replace(/\\007c/gi, "|");
      if (val.includes("·") || val.includes("|")) {
        problems.push(`${relative(ROOT, sheet)}:${i + 1}  فاصلٌ مرسومٌ في ورقة: ${line.trim().slice(0, 110)}`);
      }
    });
  }
}

if (problems.length) {
  console.error(`\n✖ حارس الفواصل — ${problems.length} مخالفة:\n`);
  for (const p of problems) console.error("   " + p);
  console.error(
    "\n  الرتبةُ ووحدتُها جملةٌ واحدة: صِلهما بمسافةٍ عبر `positionLine` في `lib/positionLabel`." +
    "\n  وخبران متجاوران تفصلهما «، » (وفي اللاتينيّ الخالص «, »)." +
    "\n  وإن أردت شاهدَ حالٍ فكلمةٌ أو أيقونة، لا نقطةٌ تُرسَم.\n",
  );
  process.exit(1);
}
console.log("✔ حارس الفواصل: لا نقطةَ ولا شريطَ في نصٍّ مرئيّ.");
