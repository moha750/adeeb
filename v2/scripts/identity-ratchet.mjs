/**
 * سقّاطةُ الهويّة — عدّاداتٌ لا تصعد.
 *
 * العلّة (٢٠٢٦-١٠-٣٠، تدقيق الهويّة): رموزُ الهويّة كانت موجودة ولم تُستعمل. ٢٫٩٪ فقط من
 * أحجام الخطّ تمرّ برموزها، وحشوةٌ واحدةٌ من ٦٩٥ تمرّ برمز مسافة. فكانت كلُّ غرفةٍ تقرّر
 * أحجامَها بنفسها، وصار «كلُّ تبويبٍ مصمَّمًا بطريقة». القاعدةُ المكتوبة لم تمنع ذلك لأنّ
 * شيئًا لا يفحصها.
 *
 * فهذا الحارسُ لا يحكم على الجمال ولا يفرض قيمةً بعينها: يعدّ ما يُكتب خارج النظام
 * (قيمةٌ خام، وزنٌ لا يملكه الخطّ، رقمٌ هنديّ، صنفُ Tailwind…) ويقارنه بخطّ أساسٍ محفوظ.
 * إن **زاد** عدّادٌ واحدٌ سقط الفحص. وإن نقص فذاك تقدّم يُثبَّت بـ`--update` فلا يُرجع عنه.
 * فالرقمُ ينزل مع كلّ غرفةٍ تُنقل إلى قوالبها، ولا يصعد أبدًا — مهما تعدّد الوكلاء.
 *
 * المنهجيّة: وثيقةُ المشروع `identity-method-pending.md` (اعتمدها محمد ٢٠٢٦-١٠-٣٠).
 *
 * التشغيل:
 *   node scripts/identity-ratchet.mjs            ← يفحص (ضمن `pnpm check`)
 *   node scripts/identity-ratchet.mjs --report   ← يطبع العدّادات كلّها
 *   node scripts/identity-ratchet.mjs --update   ← يُنزل خطّ الأساس إلى ما نزل (لا يرفعه أبدًا)
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const V2 = join(HERE, "..");
const BASELINE = join(HERE, "identity-baseline.json");
const CSS = [
  join(V2, "packages/design-system/components.css"),
  join(V2, "apps/web/src/app/globals.css"),
];
const SRC = join(V2, "apps/web/src");
/* طبقةُ الأساس الجديد — بلا خطّ أساس: صفرُ قيمةٍ خامٍ أو يسقط (٢٠٢٦-١٠-٣٠) */
const STRICT = join(V2, "packages/design-system/ad.css");

const args = new Set(process.argv.slice(2));

/* ---------- القراءة ---------- */
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const css = CSS.filter(existsSync).map((f) => stripCss(readFileSync(f, "utf8"))).join("\n");
const decls = [...css.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g)].map((m) => [m[1], m[2].trim()]);
const valuesOf = (re) => decls.filter(([p]) => re.test(p)).map(([, v]) => v);
const raw = (v) => !v.includes("var(");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|mjs)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}
const files = walk(SRC).map((f) => ({ f, s: readFileSync(f, "utf8") }));
const tsx = files.filter(({ f }) => f.endsWith(".tsx"));

/* أصنافُ Tailwind داخل className — النمطُ نفسُه الذي قاس به التدقيق */
const TW = new RegExp(
  "^(?:[a-z]+:)*(?:-?(?:p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|gap|gap-x|gap-y|space-x|space-y|w|h|min-w|min-h|max-w|max-h|inset|top|bottom|left|right|start|end|z|order|basis|grow|shrink)-[\\w./\\[\\]%-]+" +
    "|text-(?:xs|sm|base|lg|[2-9]?xl|center|right|left|start|end|white|black|[a-z]+-\\d{2,3}|\\[.+\\])" +
    "|font-(?:thin|light|normal|medium|semibold|bold|extrabold|black|display|body|latin|mono)" +
    "|leading-[\\w-]+|tracking-[\\w-]+|rounded(?:-[\\w-]+)?|bg-[\\w/\\[\\]#-]+|border(?:-[\\w/\\[\\]#-]+)?|shadow(?:-[\\w-]+)?" +
    "|opacity-\\d+|flex(?:-[\\w-]+)?|grid(?:-[\\w-]+)?|col-span-\\d+|items-\\w+|justify-\\w+|self-\\w+|place-[\\w-]+|content-\\w+" +
    "|hidden|block|inline|inline-block|inline-flex|contents|relative|absolute|fixed|sticky|overflow-[\\w-]+|truncate|line-clamp-\\d+" +
    "|whitespace-[\\w-]+|cursor-\\w+|transition(?:-\\w+)?|duration-\\d+|ease-[\\w-]+|sr-only|aspect-[\\w\\[\\]/-]+|object-\\w+" +
    "|underline|italic|uppercase|select-none|pointer-events-none|ring(?:-[\\w/-]+)?|outline-none)$",
);
const TW_SIZE = /^(?:[a-z]+:)*text-(?:xs|sm|base|lg|[2-9]?xl)$/;
let twAll = 0;
let twSize = 0;
for (const { s } of tsx) {
  for (const m of s.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g)) {
    for (const t of (m[1] ?? m[2] ?? m[3] ?? "").split(/\s+/)) {
      if (!t) continue;
      if (TW.test(t)) twAll++;
      if (TW_SIZE.test(t)) twSize++;
    }
  }
}

/* الأوزانُ التي يملكها Lyon Arabic ويُبنى عليها السلّم: ٤٠٠ و٥٠٠ و٧٠٠ و٩٠٠ وحدها */
const SCALE_WEIGHTS = new Set(["400", "500", "700", "900", "inherit", "normal"]);

/* ---------- العدّادات ---------- */
const sizes = valuesOf(/^font-size$/).filter(raw);
const metrics = {
  "font-size-raw": sizes.length,
  "font-size-distinct": new Set(sizes).size,
  "padding-raw": valuesOf(/^padding(-[a-z-]+)?$/).filter((v) => raw(v) && !/^0(px)?$/.test(v)).length,
  "gap-raw": valuesOf(/^(gap|row-gap|column-gap)$/).filter((v) => raw(v) && v !== "0").length,
  "line-height-raw": valuesOf(/^line-height$/).filter(raw).length,
  "font-weight-off-scale": valuesOf(/^font-weight$/).filter((v) => raw(v) && !SCALE_WEIGHTS.has(v)).length,
  "radius-px": valuesOf(/^border(-[a-z-]+)?-radius$/).filter((v) => raw(v) && /\d+(\.\d+)?px/.test(v)).length,
  "z-index-raw": valuesOf(/^z-index$/).filter(raw).length,
  "hex-css": (css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length,
  "rgb-css": (css.match(/rgba?\(\s*\d/g) || []).length,
  "empty-classes": new Set(css.match(/\.[\w-]*empty[\w-]*/g) || []).size,
  "inline-style": tsx.reduce((n, { s }) => n + (s.match(/style=\{\{/g) || []).length, 0),
  "hex-tsx": tsx.reduce((n, { s }) => n + (s.match(/["'`]#[0-9a-fA-F]{3,8}["'`]/g) || []).length, 0),
  "arabic-digit-helpers": files.filter(({ s }) => s.includes("٠١٢٣٤٥٦٧٨٩")).length,
  "tailwind-utilities": twAll,
  "tailwind-text-size": twSize,
};

const LABEL = {
  "font-size-raw": "حجمُ خطٍّ خام (لا رمز)",
  "font-size-distinct": "أحجامُ خطٍّ مختلفة",
  "padding-raw": "حشوةٌ خام",
  "gap-raw": "فجوةٌ خام",
  "line-height-raw": "ارتفاعُ سطرٍ خام",
  "font-weight-off-scale": "وزنٌ خارج ٤٠٠/٥٠٠/٧٠٠/٩٠٠",
  "radius-px": "زاويةٌ بالبكسل",
  "z-index-raw": "طبقةٌ (z-index) خام",
  "hex-css": "لونُ #hex في الأوراق",
  "rgb-css": "لونُ rgb() رقميّ في الأوراق",
  "empty-classes": "أصنافُ حالة الفراغ",
  "inline-style": "تنسيقٌ مضمَّن style={{}}",
  "hex-tsx": "لونُ #hex في الكود",
  "arabic-digit-helpers": "ملفّاتٌ تحوّل إلى أرقام هنديّة",
  "tailwind-utilities": "أصنافُ Tailwind",
  "tailwind-text-size": "أحجامُ خطّ Tailwind (text-xs…6xl)",
};

/* ---------- الطبقة الجديدة: صفرٌ لا خطَّ أساس ---------- */
const strict = [];
if (existsSync(STRICT)) {
  const sc = stripCss(readFileSync(STRICT, "utf8"));
  const sd = [...sc.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g)].map((m) => [m[1], m[2].trim()]);
  const sv = (re) => sd.filter(([p]) => re.test(p)).map(([, v]) => v);
  const checks = {
    "حجمُ خطّ": sv(/^font-size$/).filter(raw),
    "حشوة": sv(/^padding(-[a-z-]+)?$/).filter((v) => raw(v) && !/^0(px)?$/.test(v)),
    "فجوة": sv(/^(gap|row-gap|column-gap)$/).filter((v) => raw(v) && v !== "0"),
    "ارتفاعُ سطر": sv(/^line-height$/).filter(raw),
    "وزن": sv(/^font-weight$/).filter((v) => raw(v) && v !== "inherit"),
    "زاويةٌ بالبكسل": sv(/^border(-[a-z-]+)?-radius$/).filter((v) => raw(v) && /\d+(\.\d+)?px/.test(v)),
    "طبقة": sv(/^z-index$/).filter(raw),
    "#hex": sc.match(/#[0-9a-fA-F]{3,8}\b/g) || [],
    "rgb()": sc.match(/rgba?\(\s*\d/g) || [],
  };
  for (const [k, list] of Object.entries(checks)) if (list.length) strict.push(`${k}: ${list.length} (${[...new Set(list)].slice(0, 4).join("، ")})`);
}
if (strict.length) {
  console.error("✖ سقّاطة الهويّة: طبقةُ الأساس الجديد (ad.css) لا تقبل قيمةً خامًا —");
  for (const l of strict) console.error(`  ${l}`);
  process.exit(1);
}

/* ---------- الحكم ---------- */
const fmt = (k, v, b) => `  ${LABEL[k] ?? k}: ${v}${b === undefined ? "" : ` (الأساس ${b})`}`;

if (!existsSync(BASELINE) || args.has("--init")) {
  writeFileSync(BASELINE, JSON.stringify({ measured: new Date().toISOString().slice(0, 10), metrics }, null, 2) + "\n");
  console.log(`سقّاطة الهويّة: كُتب خطّ الأساس في ${relative(V2, BASELINE)}`);
  for (const [k, v] of Object.entries(metrics)) console.log(fmt(k, v));
  process.exit(0);
}

const base = JSON.parse(readFileSync(BASELINE, "utf8"));
const up = [];
const down = [];
for (const [k, v] of Object.entries(metrics)) {
  const b = base.metrics[k];
  if (b === undefined) continue;
  if (v > b) up.push([k, v, b]);
  else if (v < b) down.push([k, v, b]);
}

if (args.has("--report")) for (const [k, v] of Object.entries(metrics)) console.log(fmt(k, v, base.metrics[k]));

if (up.length) {
  console.error("✖ سقّاطة الهويّة: زاد ما كُتب خارج نظام الهويّة —");
  for (const [k, v, b] of up) console.error(fmt(k, v, b));
  console.error(
    "  القيمةُ تُكتب من رموز الهويّة وقوالبها، لا يدويًّا في الغرفة. وإن كانت الزيادة لا مفرّ منها فالقرارُ لمحمد،\n" +
      "  لا للوكيل — لا يُرفَع خطّ الأساس لتمرير عمل.",
  );
  process.exit(1);
}

if (args.has("--update")) {
  if (down.length) {
    for (const [k, v] of down) base.metrics[k] = v;
    base.measured = new Date().toISOString().slice(0, 10);
    writeFileSync(BASELINE, JSON.stringify(base, null, 2) + "\n");
    console.log(`سقّاطة الهويّة: نزل خطّ الأساس في ${down.length} عدّاد —`);
    for (const [k, v, b] of down) console.log(`  ${LABEL[k] ?? k}: ${b} ← ${v}`);
  } else console.log("سقّاطة الهويّة: لا شيء نزل، فخطّ الأساس كما هو.");
  process.exit(0);
}

const note = down.length ? ` — نزل ${down.length} عدّاد؛ ثبّته بـ\`--update\`` : "";
console.log(`✔ سقّاطة الهويّة: لا عدّاد زاد${note}`);
