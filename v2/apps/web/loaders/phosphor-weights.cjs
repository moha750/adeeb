/* eslint-disable @typescript-eslint/no-require-imports -- مُحمِّلُ Turbopack يُحمَّل بـ`require` (CommonJS). */
/**
 * **أوزانُ Phosphor: لا يصل المتصفّحَ إلّا ما يُرسَم** (٢٠٢٦-١٠-٢٧، قياسُ جوّالٍ على 4G، بموافقة المالك).
 *
 * كلُّ أيقونةٍ في Phosphor تحمل رسومَها الستّة (thin · light · regular · bold · fill · duotone) في
 * خريطةٍ واحدة (`dist/defs/<Name>.es.js`)، لأنّ الوزنَ يُختار وقتَ التشغيل. والموقعُ يرسم أغلبها
 * duotone وحده، فكانت الأيقوناتُ ~424KB خامًا في صفحتَي الهبوط والأخبار، ثلثاها رسومٌ لا تُرى.
 *
 * هذا المُحمِّلُ يُسقط من كلّ خريطةٍ الأوزانَ التي **لا يرسمها الكودُ بها**. والجوابُ يُقرأ من الكود
 * نفسِه لا من قائمةٍ تُكتب باليد فتتقادم:
 *   - duotone لكلّ أيقونة: وزنُ الموقع من السياق (`IconDefaults` · `lib/iconWeight.ts`).
 *   - وسمُ أيقونةٍ مستوردةٍ باسمها وفيه `weight=` ⇒ ما يُنتجه التعبيرُ من أوزانٍ لتلك الأيقونة وحدها
 *     (`"fill"`، `{liked ? "fill" : "regular"}`، `{ICON_WEIGHT_EXCEPTION}`…).
 *   - `glyphs.tsx` (مصدرُ الاستثناء الواحد): وزنُ `bind` يُضاف لكلّ أيقونةٍ يستوردها.
 *   - وزنٌ على وسمٍ ليس أيقونةً مستوردة (`<item.icon weight=…>`)، أو في كائن (`{ weight: … }`):
 *     لا يُعرف من يُرسَم به، فيُضاف **لكلّ الأيقونات**.
 *   - تعبيرٌ لا يُحسَم (`weight={w}`) ⇒ تبقى الأوزانُ الستّة: للأيقونة إن عُرفت، وإلّا للجميع.
 *   - أيقونةٌ لم يرها المسحُ تبقى بأوزانها كلّها.
 * فالخطأُ الممكنُ في اتّجاهٍ واحد: وزنٌ يبقى بلا حاجة، لا وزنٌ يُرسَم فيختفي.
 *
 * **يجري في بناء الإنتاج وللمتصفّح وحده** (`next.config.ts`): في التطوير تبقى الأوزانُ كلّها فلا تختفي
 * أيقونةٌ كُتب وزنُها للتوّ قبل أن يُعاد المسح. والمسحُ يجري مرّةً لكلّ عمليّة بناء؛ ولو فُتحت يومًا
 * ذاكرةُ Turbopack الدائمةُ للبناء لَوجب ربطُ ملفّات الكود بمخرجاته، فهي لا تُعلَن له تبعيّاتٍ هنا.
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ALL = ["thin", "light", "regular", "bold", "fill", "duotone"];
const WEB = path.resolve(__dirname, "..");
const ROOTS = [path.join(WEB, "src"), path.resolve(WEB, "../../packages/design-system/src")];
const GLYPHS = path.join(WEB, "src/app/_components/glyphs.tsx");
const PHOSPHOR = /^@phosphor-icons\/react(\/dist\/ssr|\/ssr)?$/;

/** قيمُ الثابتين من مصدرهما (`lib/iconWeight.ts`)، فلا يُكرَّر الوزنُ هنا. */
function weightConstants() {
  const src = fs.readFileSync(path.join(WEB, "src/lib/iconWeight.ts"), "utf8");
  const out = {};
  for (const m of src.matchAll(/export const (\w+)\s*=\s*"(\w+)"/g)) out[m[1]] = m[2];
  return out;
}

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules" && e.name !== "__tests__") walk(p, files);
    } else if (/\.(tsx?|jsx?)$/.test(e.name) && !e.name.endsWith(".d.ts")) files.push(p);
  }
  return files;
}

/** أوزانُ تعبيرٍ: مجموعةٌ إن حُسم، أو `null` إن لم يُحسم. */
function weightsOf(node, consts) {
  if (!node) return new Set();
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression?.(node))
    return weightsOf(node.expression, consts);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return ALL.includes(node.text) ? new Set([node.text]) : null;
  if (ts.isIdentifier(node)) {
    if (node.text === "undefined") return new Set();
    return consts[node.text] ? new Set([consts[node.text]]) : null;
  }
  if (ts.isConditionalExpression(node)) {
    const a = weightsOf(node.whenTrue, consts);
    const b = weightsOf(node.whenFalse, consts);
    return a && b ? new Set([...a, ...b]) : null;
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)
    return weightsOf(node.right, consts);
  return null;
}

let cached = null;
/** خريطةُ الاسم ← الأوزانُ المسموحة، و`global` لما يعمّ الجميع. */
function scan() {
  if (cached) return cached;
  const consts = weightConstants();
  const perIcon = new Map();
  const global = new Set(["duotone"]);
  const add = (name, set) => {
    if (!perIcon.has(name)) perIcon.set(name, new Set(["duotone"]));
    for (const w of set ?? ALL) perIcon.get(name).add(w);
  };
  const addGlobal = (set) => {
    for (const w of set ?? ALL) global.add(w);
  };

  for (const file of ROOTS.flatMap((r) => (fs.existsSync(r) ? walk(r) : []))) {
    const text = fs.readFileSync(file, "utf8");
    if (!/weight/.test(text) && !/@phosphor-icons\/react/.test(text)) continue;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const local = new Map(); // الاسمُ المحلّيّ ← اسمُ الأيقونة
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || !PHOSPHOR.test(st.moduleSpecifier.text)) continue;
      const b = st.importClause?.namedBindings;
      if (b && ts.isNamedImports(b))
        for (const el of b.elements) {
          const name = (el.propertyName ?? el.name).text.replace(/Icon$/, "");
          local.set(el.name.text, name);
          if (!perIcon.has(name)) perIcon.set(name, new Set(["duotone"]));
        }
      // استيرادُ المكتبة كلِّها باسمٍ واحد: أيُّ أيقونةٍ قد تُرسَم، فتُحكم أوزانُ الملفّ على الجميع.
      if (b && ts.isNamespaceImport(b)) local.set(`${b.name.text}.*`, "*");
    }
    const isGlyphs = path.resolve(file) === GLYPHS;
    const ownIcons = [...local.values()].filter((n) => n !== "*");

    const onWeight = (tagName, expr) => {
      const set = weightsOf(expr, consts);
      const icon = tagName && local.get(tagName);
      if (icon && icon !== "*") return add(icon, set);
      if (isGlyphs) return ownIcons.forEach((n) => add(n, set));
      addGlobal(set);
    };

    const visit = (node) => {
      if (ts.isJsxAttribute(node) && node.name.getText(sf) === "weight") {
        const tag = node.parent.parent; // JsxAttributes ← JsxOpening/SelfClosing
        const tagName = tag.tagName ? tag.tagName.getText(sf) : null;
        const init = node.initializer;
        onWeight(tagName, init && ts.isJsxExpression(init) ? init.expression : init);
      } else if (ts.isPropertyAssignment(node) && node.name.getText(sf) === "weight" && (local.size || /weight/.test(text))) {
        // كائنٌ فيه `weight` (سياقُ Phosphor، `createElement(X, { weight })`). وأرقامُ أوزانٍ أخرى
        // (أصواتُ الانتخاب) تُحسم «لا وزنَ أيقونة» فلا تضيف شيئًا: لا يُحكم إلّا ما هو اسمُ وزن.
        const set = weightsOf(node.initializer, consts);
        if (set) addGlobal(set);
        else if (local.size) addGlobal(null);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return (cached = { perIcon, global });
}

module.exports = function phosphorWeights(source) {
  const name = path.basename(this.resourcePath).replace(/\.es\.js$/, "").replace(/\.m?js$/, "");
  const { perIcon, global } = scan();
  const own = perIcon.get(name);
  if (!own) return source; // لم يرها المسح: تبقى كما هي.
  const keep = new Set([...own, ...global]);
  if (keep.size === ALL.length) return source;
  // مدخلُ الخريطة: `\n  [\n    "<وزن>",` … `\n  ]` يليه فاصلةٌ أو نهايةُ المصفوفة.
  const entries = [...source.matchAll(/\n {2}\[\n {4}"(\w+)",[\s\S]*?\n {2}\](?=,|\n\])/g)];
  if (entries.length !== ALL.length) return source; // شكلٌ لم نتوقّعه: لا نمسّه.
  const head = source.slice(0, entries[0].index);
  const tail = source.slice(entries[entries.length - 1].index + entries[entries.length - 1][0].length);
  const kept = entries.filter((m) => keep.has(m[1])).map((m) => m[0]);
  return head + kept.join(",") + tail;
};

module.exports.scan = scan;
