/**
 * حارس المصدر الواحد — يمنع أن يُنسَخ صنفٌ في ورقتَي التنسيق.
 *
 * `components.css` يُحمَّل بعد `globals.css` (انظر layout.tsx)، فأيّ محدِّدٍ في
 * الاثنين يفوز فيه الأوّلُ صامتًا: تعديلك في `globals.css` لا يُعرض، ولا بناءٌ
 * يفشل ولا تحذير يظهر. كذلك إسقاطُ تصريحٍ من `components.css` يُحيي نظيرَه
 * القديم في `globals.css` فيعود لونٌ متقادم بلا أثرٍ في الـdiff.
 *
 * تُجرَّد ٢١١ حالةً منها في ٢٠٢٦-٠٧-٢٨ وأُزيلت كلّها؛ وهذا الحارس يمنع عودتها.
 * القاعدة ١ («مصدر واحد») تُنفَّذ هنا لا تُقرأ فقط.
 *
 * التشغيل: `pnpm check` (أو `node scripts/css-single-source.mjs`)
 * ويقبل مسارَين اختياريَّين ‹globals› ‹components› — يستعملهما خطّاف ما قبل
 * الإيداع ليفحص **المُدرَج في الفهرس** لا ما في القرص (قد يختلفان).
 * يخرج بـ1 عند أيّ تشارك — فيُفشل الفحص.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const [argGlobals, argComponents] = process.argv.slice(2);
const SHEETS = {
  globals: argGlobals ?? join(ROOT, "apps/web/src/app/globals.css"),
  components: argComponents ?? join(ROOT, "packages/design-system/components.css"),
};

/** يستبدل التعليقات بفراغ (بحفظ الأسطر) ولا يمسّ النصوص المقتبسة */
function stripComments(s) {
  let out = "", i = 0;
  while (i < s.length) {
    if (s[i] === "/" && s[i + 1] === "*") {
      const e = s.indexOf("*/", i + 2);
      out += s.slice(i, e === -1 ? s.length : e + 2).replace(/[^\n]/g, " ");
      i = e === -1 ? s.length : e + 2;
    } else if (s[i] === '"' || s[i] === "'") {
      const q = s[i];
      let j = i + 1;
      while (j < s.length && !(s[j] === q && s[j - 1] !== "\\")) j++;
      out += s.slice(i, j + 1);
      i = j + 1;
    } else out += s[i++];
  }
  return out;
}

/** الفصل بالفواصل يحترم الأقواس: `:is(a,b)` محدِّدٌ واحد لا اثنان */
function splitSelectors(head) {
  const out = [];
  let cur = "", depth = 0;
  for (const ch of head) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/\s+/g, " ")).filter(Boolean);
}

/** يعيد Map: «سياق@محدِّد» → أوّل سطرٍ عُرِّف فيه */
function parse(file) {
  const raw = readFileSync(file, "utf8");
  const src = stripComments(raw);
  const rules = new Map();
  const stack = [];
  let i = 0, head = -1;
  const lineOf = (p) => raw.slice(0, p).split("\n").length;

  while (i < src.length) {
    const ch = src[i];
    if (head === -1 && !/\s/.test(ch) && ch !== "}" && ch !== ";") head = i;
    if (ch === "{") {
      const sel = src.slice(head, i).trim();
      const at = head;
      head = -1;
      i++;
      if (sel.startsWith("@")) { stack.push(sel.replace(/\s+/g, " ")); continue; }
      let depth = 1;
      while (i < src.length && depth > 0) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}") { depth--; if (!depth) break; }
        i++;
      }
      i++;
      // @layer يخسر أمام غير المطبَّق أيًّا كان ترتيبه، فلا يدخل المفتاح
      const ctx = stack.filter((a) => !/^@layer\b/.test(a)).join(" >> ");
      for (const s of splitSelectors(sel)) {
        const k = `${ctx}@${s}`;
        if (!rules.has(k)) rules.set(k, lineOf(at));
      }
      continue;
    }
    if (ch === "}") { stack.pop(); head = -1; i++; continue; }
    if (ch === ";" && head !== -1 && src.slice(head, i).trim().startsWith("@")) { head = -1; i++; continue; }
    i++;
  }
  return rules;
}

const g = parse(SHEETS.globals);
const c = parse(SHEETS.components);
const shared = [...g.keys()].filter((k) => c.has(k));

if (shared.length === 0) {
  console.log(`✅ المصدر الواحد سليم — لا محدِّد مشترك (globals: ${g.size} · components: ${c.size}).`);
  process.exit(0);
}

console.error(`\n❌ ${shared.length} محدِّدًا مُعرَّفًا في الورقتين — و«globals» منها لا يُعرض:\n`);
for (const k of shared.slice(0, 40)) {
  const [ctx, sel] = k.split("@");
  console.error(`   ${sel}${ctx ? `   [${ctx}]` : ""}`);
  console.error(`      globals.css:${g.get(k)}  →  يفوز components.css:${c.get(k)}`);
}
if (shared.length > 40) console.error(`   … و${shared.length - 40} غيرها.`);
console.error(`\n   القاعدة ١: صنف المكوّن يُعرَّف في components.css وحده.`);
console.error(`   انقل التصريح إلى قاعدة مكوّنه هناك، واحذفه من globals.css.\n`);
process.exit(1);
