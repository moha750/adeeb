// الإحالاتُ داخل نصوص «أنظمة أدِيب»: «(الدستور، المادة ٦٥)» و«المادتان ٣٤ و٦٣» و«المواد ٢١ إلى ٢٤
// من نظام التطوّع» و«الباب الرابع». تُقرأ من النصّ نفسِه فلا تُكتب مرّتين، وتصير روابطَ إلى موضعها.
//
// **ومن أيّ وثيقةٍ المادّة؟** من سياقها، بهذا الترتيب:
//   ١) ما بعدها: «… من الدستور» أو «… من نظام X»، أو «منه» فتعود إلى آخر وثيقةٍ سُمّيت قبلها.
//   ٢) ما قبلها مباشرةً: «(الدستور، المادة …» أو «؛ ونظام X، المادتان …».
//   ٣) وإلّا فالوثيقةُ التي هي فيها.
// ولا يُربط رقمٌ لا مادّةَ له: يبقى نصًّا كما كُتب.
//
// خالٍ من الاستيراد عمدًا: يقرؤه العارضُ والخادمُ وفاحصُ البناء على السواء.

export type RefPiece =
  | { kind: "text"; text: string }
  | { kind: "art"; text: string; slug: string; no: number }
  | { kind: "ch"; text: string; slug: string; ch: number };

/** أسماءُ الوثائق كما تُذكر في النصوص، بلا تشكيل. */
export const DOC_NAMES: ReadonlyArray<readonly [slug: string, name: string]> = [
  ["constitution", "الدستور"],
  ["membership", "نظام العضوية"],
  ["positions", "نظام المناصب والصلاحيات"],
  ["elections", "نظام الانتخابات"],
  ["discipline", "نظام الانضباط"],
  ["volunteering", "نظام التطوع"],
  ["certificates", "نظام الشهادات"],
];

const MARKS_RE = /[ً-ْٰ]/g;
const MARKS = "[\\u064B-\\u0652\\u0670]*";
const esc = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** نمطٌ يقبل التشكيلَ بعد كلّ حرف: «التطوع» تجد «التطوّع». */
const loose = (s: string) =>
  [...s.replace(MARKS_RE, "")].map((c) => (c === " " ? "\\s+" : esc(c) + MARKS)).join("");

const NAME_ALT = DOC_NAMES.map(([, n]) => loose(n)).join("|");
const slugOfName = (s: string) => {
  const f = s.replace(MARKS_RE, "").replace(/\s+/g, " ");
  return DOC_NAMES.find(([, n]) => n === f)?.[0] ?? null;
};

const AR = "٠١٢٣٤٥٦٧٨٩";
const toInt = (s: string) => Number([...s].map((c) => AR.indexOf(c)).join(""));

const NUM = "[٠-٩]+";
const JOIN = "(?:\\s*،\\s*|\\s+أو\\s+|\\s+إلى\\s+|\\s+و\\s*)";
const ART_WORDS = ["المادة", "المادتان", "المادتين", "المواد"].join("|");
const ART = `(${ART_WORDS})\\s+(${NUM}(?:${JOIN}${NUM})*)`;
const ORD = ["الحادي عشر", "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر"];
const ORD_NO = [11, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const CH = `(الباب)\\s+(${ORD.map(loose).join("|")})(?![\\u0621-\\u064A])`;
const SCAN = new RegExp(`${ART}|${CH}`, "g");

const AFTER = new RegExp(`^\\s+من\\s+(${NAME_ALT})`);
const AFTER_MINH = /^\s+منه(?![ء-ي])/;
const BEFORE = new RegExp(`(?:^|[\\s(؛])و?(${NAME_ALT})\\s*[،(]\\s*$`);
const ANY_NAME = new RegExp(NAME_ALT, "g");

function targetDoc(text: string, start: number, end: number, here: string): string {
  const after = text.slice(end, end + 48);
  const a = after.match(AFTER);
  if (a) return slugOfName(a[1]) ?? here;
  if (AFTER_MINH.test(after)) {
    const names = [...text.slice(0, start).matchAll(ANY_NAME)];
    const last = names[names.length - 1];
    return (last && slugOfName(last[0])) ?? here;
  }
  const b = text.slice(Math.max(0, start - 64), start).match(BEFORE);
  if (b) return slugOfName(b[1]) ?? here;
  return here;
}

export interface RefScope {
  /** الوثيقةُ التي فيها النصّ. */
  here: string;
  /** هل للوثيقة مادّةٌ بهذا الرقم؟ */
  hasArticle: (slug: string, no: number) => boolean;
  /** هل للوثيقة بابٌ بهذا الترتيب؟ */
  hasChapter: (slug: string, ch: number) => boolean;
}

/** يقطع النصَّ قطعًا: نصٌّ وإحالات. الإحالةُ رقمُها مع كلمتها إن كانت أوّلَ أرقامها («المادة ٦٥»). */
export function parseRefs(text: string, scope: RefScope): RefPiece[] {
  const out: RefPiece[] = [];
  let at = 0;
  const push = (t: string) => {
    if (!t) return;
    const last = out[out.length - 1];
    if (last?.kind === "text") last.text += t;
    else out.push({ kind: "text", text: t });
  };

  for (const m of text.matchAll(SCAN)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const slug = targetDoc(text, start, end, scope.here);
    push(text.slice(at, start));
    at = end;

    if (m[1]) {
      // موادّ: كلُّ رقمٍ رابطٌ وحدَه، والكلمةُ تلتصق بأوّلها.
      const word = m[1];
      const nums = m[2];
      const lead = m[0].slice(0, m[0].length - nums.length);
      const parts = nums.split(new RegExp(`(${NUM})`));
      let first = true;
      for (const p of parts) {
        if (!p) continue;
        if (/^[٠-٩]+$/.test(p)) {
          const no = toInt(p);
          const label = first ? `${lead}${p}` : p;
          if (scope.hasArticle(slug, no)) out.push({ kind: "art", text: label, slug, no });
          else push(label);
          first = false;
        } else push(p);
      }
      void word;
    } else {
      const ord = ORD_NO[ORD.findIndex((o) => new RegExp(`^${loose(o)}$`).test(m[4]))];
      if (ord && scope.hasChapter(slug, ord)) out.push({ kind: "ch", text: m[0], slug, ch: ord });
      else push(m[0]);
    }
  }
  push(text.slice(at));
  return out;
}

/** الموادُّ التي يُحيل إليها النصّ (بلا تكرار). */
export function articleRefs(text: string, scope: RefScope): Array<{ slug: string; no: number }> {
  const seen = new Set<string>();
  const out: Array<{ slug: string; no: number }> = [];
  for (const p of parseRefs(text, scope)) {
    if (p.kind !== "art") continue;
    const k = `${p.slug}:${p.no}`;
    if (!seen.has(k)) { seen.add(k); out.push({ slug: p.slug, no: p.no }); }
  }
  return out;
}
