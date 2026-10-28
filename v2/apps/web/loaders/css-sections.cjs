/* eslint-disable @typescript-eslint/no-require-imports -- مُحمِّلُ Turbopack يُحمَّل بـ`require` (CommonJS). */
/**
 * **ورقةُ المكوّنات تُقسَم عند البناء، لا في المصدر** (٢٠٢٦-١٠-٢٧، قياسُ جوّالٍ على 4G، بموافقة المالك).
 *
 * `components.css` مصدرٌ واحدٌ (~7.7 آلاف سطر، 569KB بعد التصغير) وكانت كلُّ صفحةٍ تُنزّله كاملًا قبل
 * أن تُرسَم، و٩٥٪ منه لا يخصّها: قواعدُ اللوحة والإذاعة والألعاب ومعرضِ `/ui`. والملفُّ يبقى مصدرًا
 * واحدًا يُكتب فيه كما كان؛ وهذا المُحمِّلُ يقسمه في بناء الإنتاج إلى:
 *   - `base`: كلُّ ما قد يُرسَم في صفحةٍ عامّة (الجذرُ يحمله لكلّ صفحة، كما كان الملفُّ كلُّه).
 *   - `dash` · `radio` · `games`: قواعدُ لا تنطبق إلّا داخل قسمها، يحملها تخطيطُ القسم.
 *   - `ui`: المعرضُ يعرض مكوّناتِ الأقسام كلِّها، فيحمل قواعدَها جميعًا.
 *
 * **كيف يُعرف أنّ قاعدةً تخصّ قسمًا** (يُقرأ من الكود نفسِه في كلّ بناء، لا من قائمةٍ تتقادم):
 *   1. يُبنى رسمُ الاستيراد من كلّ مدخلٍ في `app/` (صفحة، تخطيط، تحميل…)، فيُعرف لكلّ ملفٍّ أيُّ
 *      الأقسام يبلغه. ملفٌّ يبلغه مدخلٌ عامّ عامٌّ ولو سكن مجلّدَ اللوحة (`SiteHeader` يستورد `Avatar`)،
 *      وما يبلغه تخطيطُ الجذر يُرسَم في كلّ صفحة.
 *   2. كلُّ نصٍّ في الكود يُفكّك أصنافًا؛ و`"tone-"` أو `` `ns-${x}` `` بادئةٌ تشمل كلَّ صنفٍ يبدأ بها.
 *   3. صنفٌ لم يُوجد في أيّ ملفّ، أو وُجد في ملفٍّ عامّ، أو في قسمين: عامّ.
 *   4. القاعدةُ تنتقل إلى قسمٍ إذا كان في **كلّ** محدِّدٍ من قائمتها صنفٌ يخصّ ذلك القسم وحده،
 *      خارجَ كلّ قوس (`:not(.x)` ينطبق حيث لا يوجد x، فلا يُحسب). وغيرُ ذلك يبقى عامًّا.
 * فالخطأُ الممكنُ في اتّجاهٍ واحد: قاعدةٌ تبقى عامّةً بلا حاجة، لا قاعدةٌ تغيب عن صفحةٍ تحتاجها.
 *
 * **الترتيبُ:** ملفُّ القسم يُحمَّل بعد العامّ، فقاعدةٌ نُقلت قد تتقدّم على عامّةٍ كانت بعدها تغلبها.
 * فكلُّ عامّةٍ قد تنازعها (خصوصيّةٌ واحدة، وخاصّيّةٌ من أسرةٍ واحدة، وتنطبق في صفحات القسم) تُنسخ
 * إلى ملفّ القسم بعدها، وكذلك ما ينازع النسخَ (`copiesFor`). فترى صفحةُ القسم الترتيبَ الأصليّ،
 * ولا تمسّ النسخُ الصفحةَ العامّة. وتحقّق ذلك (٢٠٢٦-١٠-٢٨) بمقارنة الأنماط المحسوبة لكلّ عنصرٍ في
 * الصفحات العامّة وصفحات `/ui` كلِّها، بين بناءٍ مقسومٍ وبناءٍ غير مقسوم.
 *
 * **في التطوير لا تقسيم:** الملفّاتُ الوسيطة (`components.<part>.css`) تستورد الأصلَ أو لا شيء، فيعمل
 * الملفُّ كما كان مع تحديثه الفوريّ. والتقسيمُ للإنتاج وحده (`next.config.ts`).
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const WEB = path.resolve(__dirname, "..");
const SRC = path.join(WEB, "src");
const APP = path.join(SRC, "app");
const DS = path.resolve(WEB, "../../packages/design-system");
const CORE = path.resolve(WEB, "../../packages/core");
const CSS = path.join(DS, "components.css");
const PARTS = ["base", "dash", "radio", "games", "ui"];
/** حصّةُ المعرض (`/ui`): يعرض مكوّناتِ الأقسام كلِّها، فيحمل قواعدَها كلَّها. */
const UI_TAKES = new Set(["dash", "radio", "games", "ui"]);

/* ══ أقسامُ المداخل ══════════════════════════════════════════════════ */

/** قسمُ مدخلٍ بمكانه. و`/ui` معرضٌ يحمل الأقسامَ كلَّها في حصّته (`ui`). */
function entrySection(file) {
  const rel = path.relative(APP, file).split(path.sep);
  if (rel[0] === "dashboard") return "dash";
  if (rel[0] === "ui") return "ui";
  if (rel[0] === "radio") return "radio";
  if (rel[0] === "games") return "games";
  return "base";
}

const ENTRY = /^(page|layout|template|loading|error|not-found|global-error|default|forbidden|unauthorized)\.(tsx?|jsx?)$/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules" && e.name !== "__tests__") walk(p, out);
    } else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(e.name) && !e.name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

const EXT = [".tsx", ".ts", ".jsx", ".js", ".mjs"];
function resolveFile(base) {
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const x of EXT) if (fs.existsSync(base + x)) return base + x;
  for (const x of EXT) if (fs.existsSync(path.join(base, "index" + x))) return path.join(base, "index" + x);
  return null;
}

function pkgExport(pkgDir, sub) {
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));
  const key = sub ? "./" + sub : ".";
  const target = pkg.exports?.[key] ?? (key === "." ? pkg.main : null);
  if (typeof target === "string") return resolveFile(path.join(pkgDir, target));
  if (sub) return resolveFile(path.join(pkgDir, sub));
  return null;
}

/** وجهةُ استيراد: ملفٌّ في المشروع، أو `null` لما خارجه (حزمُ npm). */
function resolveImport(from, spec) {
  if (spec.startsWith("@/")) return resolveFile(path.join(SRC, spec.slice(2)));
  if (spec.startsWith(".")) return resolveFile(path.resolve(path.dirname(from), spec));
  const ds = spec.match(/^@adeeb\/design-system(?:\/(.*))?$/);
  if (ds) return pkgExport(DS, ds[1]);
  const core = spec.match(/^@adeeb\/core(?:\/(.*))?$/);
  if (core) return pkgExport(CORE, core[1]);
  return null;
}

/* ══ الملفّاتُ: استيراداتُها ونصوصُها ═══════════════════════════════════ */

const CLASS_TOKEN = /^-?[_a-zA-Z][\w-]*$/;

/** ما يُستخرج من ملفّ: وجهاتُ استيراده، وأصنافُه، وبادئاتُه الحرّة. */
function readFile(file) {
  const text = fs.readFileSync(file, "utf8");
  const kind = /\.(tsx|jsx)$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const imports = [];
  const tokens = new Set();
  const prefixes = new Set();
  const addText = (s) => {
    for (const t of s.split(/[\s,]+/)) {
      if (!CLASS_TOKEN.test(t)) continue;
      tokens.add(t);
      // البادئةُ ما انتهى بشرطة وطال ثلاثًا فأكثر (`"tone-" + x`، `` `stn-art-${x}` ``)؛ فقطعةٌ مثل
      // `` `s${i}` `` مفتاحٌ لا صنف، ولو عُدّت بادئةً لَشملت كلَّ صنفٍ يبدأ بحرفها.
      if (t.endsWith("-") && t.length >= 3) prefixes.add(t);
    }
  };
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node) && node.arguments.length && ts.isStringLiteralLike(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require"))) {
      imports.push(node.arguments[0].text);
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      addText(node.text);
    } else if (ts.isTemplateExpression(node)) {
      addText(node.head.text);
      for (const sp of node.templateSpans) addText(sp.literal.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { imports, tokens, prefixes };
}

let cachedScan = null;
/** صنفٌ ← أقسامُه. ومعها البادئاتُ الحرّة وأقسامُها. */
function scanUsage() {
  if (cachedScan) return cachedScan;
  const files = [...walk(SRC), ...walk(path.join(DS, "src")), ...walk(path.join(CORE, "src"))];
  const info = new Map();
  for (const f of files) info.set(f, readFile(f));
  const reach = new Map(); // ملفّ ← أقسامٌ تبلغه
  const visitFrom = (start, sec) => {
    const stack = [start];
    while (stack.length) {
      const f = stack.pop();
      const set = reach.get(f) ?? new Set();
      if (set.has(sec)) continue;
      set.add(sec);
      reach.set(f, set);
      const fi = info.get(f);
      if (!fi) continue;
      for (const spec of fi.imports) {
        const r = resolveImport(f, spec);
        if (r && info.has(r)) stack.push(r);
      }
    }
  };
  for (const f of files) if (f.startsWith(APP + path.sep) && ENTRY.test(path.basename(f))) visitFrom(f, entrySection(f));
  // ما يبلغه الجذر (التخطيطُ وشاشةُ التحميل) يُرسَم في كلّ صفحة، قسمًا كانت أو عامّة.
  for (const root of ["layout", "loading", "template"])
    for (const x of EXT) {
      const f = path.join(APP, root + x);
      if (info.has(f)) visitFrom(f, "all");
    }
  // ملفٌّ لم يبلغه مدخل (سكربتٌ، اختبار…) يُعدّ عامًّا: لا يُبنى عليه نقلُ شيء.
  for (const f of files) if (!reach.has(f)) reach.set(f, new Set(["base"]));

  const classSecs = new Map();
  const prefixSecs = [];
  for (const [f, fi] of info) {
    const secs = reach.get(f);
    for (const t of fi.tokens) {
      const s = classSecs.get(t) ?? new Set();
      secs.forEach((x) => s.add(x));
      classSecs.set(t, s);
    }
    for (const p of fi.prefixes) prefixSecs.push([p, secs]);
  }
  return (cachedScan = { classSecs, prefixSecs });
}

/** أقسامُ صنف: من الملفّات التي تذكره، ومن البادئات الحرّة التي تشمله. */
function sectionsOf(cls, usage) {
  const s = new Set(usage.classSecs.get(cls) ?? []);
  for (const [p, secs] of usage.prefixSecs) if (cls.startsWith(p)) secs.forEach((x) => s.add(x));
  return s;
}

/** قد يوجد الصنفُ في صفحةٍ تحمل ملفَّ هذا القسم؟ (القسمُ نفسُه والجذر؛ والمجهولُ نعم.) */
function presentIn(cls, part, usage) {
  const s = sectionsOf(cls, usage);
  return !s.size || s.has(part) || s.has("all");
}

/** قد تنطبق القاعدةُ في صفحةٍ تحمل ملفَّ هذا القسم؟ يكفي محدِّدٌ واحدٌ كلُّ أصنافه موجودة. */
function appliesIn(sel, part, usage) {
  return splitList(sel).some((x) => topClasses(x).every((c) => presentIn(c, part, usage)));
}

/** حزمةُ صنفٍ: قسمٌ واحد، أو `base`. */
function bundleOf(cls, usage) {
  const s = new Set(usage.classSecs.get(cls) ?? []);
  for (const [p, secs] of usage.prefixSecs) if (cls.startsWith(p)) secs.forEach((x) => s.add(x));
  if (!s.size || s.has("base") || s.has("all")) return "base";
  if (s.size > 1) s.delete("ui"); // المعرضُ يحمل الأقسامَ كلَّها، فلا يمنع صنفًا أن يخصّ قسمه
  if (s.size === 0) return "base";
  if (s.size === 1) return [...s][0];
  return "base";
}

/* ══ الورقة: قواعدُ وكتلٌ ══════════════════════════════════════════════ */

/** يقسم نصَّ CSS إلى عناصرَ عليا: `{ prelude, body }` للكتل و`{ raw }` لما سواها (تعليقات تُسقط). */
function parseBlocks(css) {
  const out = [];
  let i = 0;
  const n = css.length;
  let start = 0;
  while (i < n) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      const e = css.indexOf("*/", i + 2);
      if (css.slice(start, i).trim() === "") start = e + 2; // تعليقٌ بين القواعد يُسقط
      i = e + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      i = skipString(css, i);
      continue;
    }
    if (c === ";") {
      // عبارةٌ عليا بلا كتلة (`@import`, `@charset`)
      out.push({ raw: css.slice(start, i + 1).trim() });
      start = i + 1;
      i++;
      continue;
    }
    if (c === "{") {
      const end = matchBrace(css, i);
      out.push({ prelude: stripComments(css.slice(start, i)).trim(), body: css.slice(i + 1, end) });
      i = end + 1;
      start = i;
      continue;
    }
    i++;
  }
  return out.filter((b) => b.raw === undefined || b.raw);
}

function skipString(css, i) {
  const q = css[i];
  i++;
  while (i < css.length && css[i] !== q) i += css[i] === "\\" ? 2 : 1;
  return i + 1;
}

function matchBrace(css, open) {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      i = css.indexOf("*/", i + 2) + 1;
      continue;
    }
    if (c === '"' || c === "'") {
      i = skipString(css, i) - 1;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return i;
  }
  throw new Error("components.css: قوسٌ غير مغلق");
}

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/** يقسم قائمةَ محدِّداتٍ على الفواصل العليا (لا التي داخل الأقواس). */
function splitList(sel) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const c of sel) {
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    if (c === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** أصنافُ محدِّدٍ خارجَ كلّ قوس وكلّ معقوف. */
function topClasses(sel) {
  let depth = 0;
  let flat = "";
  for (const c of sel) {
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (depth === 0) flat += c;
  }
  return [...flat.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
}

/** حزمةُ قاعدة: قسمٌ إن كان في كلّ محدِّدٍ صنفٌ يخصّه، وإلّا `base`. */
function ruleBundle(prelude, usage) {
  let bundle = null;
  for (const sel of splitList(prelude)) {
    const owned = new Set(topClasses(sel).map((c) => bundleOf(c, usage)).filter((b) => b !== "base"));
    if (owned.size !== 1) return "base";
    const b = [...owned][0];
    if (bundle && bundle !== b) return "base";
    bundle = b;
  }
  return bundle ?? "base";
}

const GROUP = /^@(media|container|supports|layer\s+[\w.-]+\s*$)/;

/** شجرةُ الورقة: كتلٌ شرطيّةٌ بأبنائها، وقواعدُ مرقّمةٌ بترتيبها في الأصل. */
function buildTree(blocks, rules) {
  return blocks.map((b) => {
    if (b.raw !== undefined) return { raw: b.raw };
    if (b.prelude.startsWith("@")) {
      if (GROUP.test(b.prelude)) return { group: b.prelude, kids: buildTree(parseBlocks(b.body), rules) };
      return { atom: `${b.prelude}{${b.body}}` }; // @keyframes · @font-face … تبقى عامّة
    }
    const rule = { sel: b.prelude, body: b.body, i: rules.length };
    rules.push(rule);
    return { rule };
  });
}

/* ══ الترتيب: قاعدةٌ نُقلت لا تتقدّم على عامّةٍ كانت تغلبها ═══════════════════ */

/** خصوصيّةُ محدِّدٍ واحد (معرِّف · صنف · وسم) رقمًا واحدًا للمقارنة. */
function specificity(sel) {
  let id = 0;
  let cls = 0;
  let el = 0;
  const s = sel.replace(/\s*([>+~])\s*/g, " $1 ");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "#") {
      id++;
      i = skipIdent(s, i + 1) - 1;
    } else if (c === ".") {
      cls++;
      i = skipIdent(s, i + 1) - 1;
    } else if (c === "[") {
      cls++;
      i = s.indexOf("]", i);
    } else if (c === ":") {
      const pe = s[i + 1] === ":";
      const start = i + (pe ? 2 : 1);
      const end = skipIdent(s, start);
      const name = s.slice(start, end).toLowerCase();
      let argEnd = end;
      let arg = null;
      if (s[end] === "(") {
        argEnd = closeParen(s, end);
        arg = s.slice(end + 1, argEnd);
        argEnd++;
      }
      if (pe || ["before", "after", "first-line", "first-letter"].includes(name)) el++;
      else if (name === "where") {
        /* صفر */
      } else if (["is", "not", "has", "matches"].includes(name) && arg) {
        const best = Math.max(...splitList(arg).map(specificity));
        id += Math.floor(best / 1e6);
        cls += Math.floor((best % 1e6) / 1e3);
        el += best % 1e3;
      } else cls++;
      i = argEnd - 1;
    } else if (/[a-zA-Z]/.test(c) && (i === 0 || /[\s>+~(,]/.test(s[i - 1]))) {
      el++;
      i = skipIdent(s, i) - 1;
    }
  }
  return id * 1e6 + cls * 1e3 + el;
}

function skipIdent(s, i) {
  while (i < s.length && /[\w-]/.test(s[i])) i++;
  return i;
}

function closeParen(s, open) {
  let d = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "(") d++;
    else if (s[i] === ")" && --d === 0) return i;
  }
  return s.length - 1;
}

/**
 * أسرةُ خاصّيّة: الاختزالُ وأفرادُه أسرةٌ واحدة (`font` و`font-size`)، والمادّيُّ ونظيرُه المنطقيّ كذلك
 * (`width` و`inline-size`، `left` و`inset-inline-start`)، فلا يفوت تنازعُهما. والتوسّعُ هنا أمان.
 */
function propRoot(p) {
  if (p.startsWith("--")) return p;
  p = p.replace(/^-(webkit|moz|ms)-/, "");
  if (/^(top|right|bottom|left|inset)(-|$)/.test(p)) return "inset";
  if (/^(min-|max-)?(width|inline-size)$/.test(p)) return "isize";
  if (/^(min-|max-)?(height|block-size)$/.test(p)) return "bsize";
  if (/^(grid-)?(row-|column-)?gap$/.test(p)) return "gap";
  if (/^(place|align|justify)-/.test(p)) return "align";
  return p.split("-")[0];
}

const declared = (body) =>
  new Set(
    [...stripComments(body).matchAll(/(?:^|[;{])\s*(-{0,2}[a-zA-Z][\w-]*)\s*:/g)].map((m) => propRoot(m[1])),
  );

/**
 * **نسخُ ما يغلب بعدها** — قاعدةٌ نُقلت إلى قسمٍ صارت تُحمَّل بعد العامّة كلِّها، فقد تتقدّم على عامّةٍ
 * كانت بعدها تغلبها (خصوصيّةٌ واحدة وخاصّيّةٌ من أسرةٍ واحدة). فتُنسخ تلك العامّةُ إلى
 * ملفّ القسم بعدها، فيعود الترتيبُ كما كان. والنسخةُ نفسُها صارت بعد العامّة كلِّها، فيُفحص ما بعدها
 * كذلك حتى لا يبقى ما يُنسخ. الصفحةُ العامّة لا تمسّها النسخ، وصفحةُ القسم ترى الترتيبَ الأصليّ.
 */
function copiesFor(rules, bundles, usage) {
  const info = rules.map((r) => ({ props: declared(r.body), specs: new Set(splitList(r.sel).map(specificity)) }));
  const byProp = new Map(); // خاصّيّة ← قواعدُها العامّةُ بترتيبها
  rules.forEach((r) => {
    if (bundles[r.i] !== "base") return;
    for (const p of info[r.i].props) {
      if (!byProp.has(p)) byProp.set(p, []);
      byProp.get(p).push(r.i);
    }
  });
  // `all` يمسّ كلَّ خاصّيّة: قاعدتُه تُفحص مع كلّ قاعدة.
  const allRules = rules.filter((r) => bundles[r.i] === "base" && info[r.i].props.has("all")).map((r) => r.i);
  // قد تتنازعان إن تساوت خصوصيّةُ محدِّدٍ من هذه ومحدِّدٍ من تلك. ولا يُحكم بأيّ العناصر تطابق:
  // الأصنافُ تُركَّب من جداول وخصائص بين الملفّات فلا يُوثق بحدسها، ونسخُ قاعدةٍ زائدةٍ أسلمُ.
  const ties = (i, j) => [...info[j].specs].some((x) => info[i].specs.has(x));
  const copies = {};
  for (const part of PARTS) {
    if (part === "base") continue;
    const seen = new Set();
    const mine = (i) => (part === "ui" ? UI_TAKES.has(bundles[i]) : bundles[i] === part);
    const work = rules.filter((r) => mine(r.i)).map((r) => r.i);
    const live = new Map(); // قاعدةٌ عامّة ← أتنطبق في صفحات هذا القسم؟
    const appliesHere = (j) => {
      if (!live.has(j)) live.set(j, appliesIn(rules[j].sel, part, usage));
      return live.get(j);
    };
    while (work.length) {
      const i = work.pop();
      const lists = info[i].props.has("all") ? [...byProp.values()] : [...info[i].props].map((p) => byProp.get(p) ?? []);
      lists.push(allRules);
      for (const list of lists)
        for (const j of list) {
          if (j <= i || seen.has(j)) continue;
          // عامّةٌ لا تنطبق في صفحات القسم أصلًا (صنفٌ فيها لا يُرسَم هناك) لا يُخشى ترتيبُها.
          if (!appliesHere(j)) continue;
          if (ties(i, j)) {
            seen.add(j);
            work.push(j);
          }
        }
    }
    copies[part] = seen;
  }
  return copies;
}

function render(tree, part, bundles, copies) {
  let out = "";
  for (const n of tree) {
    if (n.raw !== undefined) {
      if (part === "base") out += n.raw + "\n";
    } else if (n.atom) {
      if (part === "base") out += n.atom + "\n";
    } else if (n.group) {
      const inner = render(n.kids, part, bundles, copies);
      if (inner.trim()) out += `${n.group}{\n${inner}}\n`;
    } else {
      const b = bundles[n.rule.i];
      const own = part === "ui" ? UI_TAKES.has(b) : b === part;
      if (own || copies[part]?.has(n.rule.i)) out += `${n.rule.sel}{${n.rule.body}}\n`;
    }
  }
  return out;
}

let cachedPlan = null;
function plan() {
  if (cachedPlan) return cachedPlan;
  const usage = scanUsage();
  const rules = [];
  const tree = buildTree(parseBlocks(fs.readFileSync(CSS, "utf8")), rules);
  const bundles = rules.map((r) => ruleBundle(r.sel, usage));
  const copies = copiesFor(rules, bundles, usage);
  return (cachedPlan = { tree, bundles, copies });
}

function partition(part) {
  const { tree, bundles, copies } = plan();
  return render(tree, part, bundles, copies);
}

/**
 * المُحمِّل: يُشغَّل على `components.<part>.css` (ملفٌّ وسيطٌ في نظام التصميم) ويُرجع حصّته من الأصل.
 * و`base` يحمل كلَّ ما لم يُنقل، فلو فشل التحليلُ لأيّ سببٍ أُعيد الأصلُ كاملًا فيه والأقسامُ فارغة.
 */
module.exports = function cssSections() {
  const part = path.basename(this.resourcePath).match(/^components\.(\w+)\.css$/)?.[1];
  if (!PARTS.includes(part)) return "";
  this.addDependency?.(CSS);
  try {
    return partition(part);
  } catch (e) {
    this.emitWarning?.(new Error("css-sections: " + e.message));
    return part === "base" ? fs.readFileSync(CSS, "utf8") : "";
  }
};

module.exports.partition = partition;
module.exports.scanUsage = scanUsage;
module.exports.parseBlocks = parseBlocks;
