// تحريرُ نصوص «أنظمة أدِيب» في غرفة التحرير (`/dashboard/regulations`) — منطقٌ خالصٌ بلا قاعدة.
//
// **المادّةُ تُكتب نصًّا وتُحفظ كتلًا.** الرئيسُ يكتب كما يكتب في رسالة: فقرةٌ، وسطورٌ تبدأ بـ«-» قائمةٌ،
// وبـ«1.» قائمةٌ مرقّمة، وبـ«|» جدول. والأرقامُ تُعرض له لاتينيّةً وتُحفظ بأرقام النصّ المُقَرّ (٠-٩)
// لأنّ محلّلَ الإحالات (`refs.ts`) يقرؤها بها.
//
// **وإعادةُ الترقيم بقرار المالك (٢٠٢٦-١٠-١٣)** لا «مكرر»: المادّةُ الجديدة تُضاف حيث يُراد، فتتأخّر
// أرقامُ ما بعدها، وتتبعها إحالاتُ الوثيقة إليها. ولكلّ مادّةٍ في المسودّة مرساةٌ (`from`): رقمُها يومَ
// بدأ الترقيمُ يتغيّر، فيُعرف به عند النشر ما صار إليه كلُّ رقمٍ قديم، فتُصحَّح إحالاتُ الوثائق الأخرى
// في إصداراتٍ تبعيّة. والجديدةُ مرساتُها `null`، والمحذوفةُ تغيب. وتُنزع المرساةُ في القاعدة عند النشر.

import { articleRefs, parseRefs, type RefScope } from "./refs";
import { latin } from "./text";
import type { RegArticle, RegBlock, RegChapter } from "./types";

export type DraftArticle = RegArticle & { from?: number | null };
export type DraftChapter = { title: string | null; articles: DraftArticle[] };
export type DraftBody = DraftChapter[];

/** الأشكالُ التي يرسمها العارض (`RegStructure`)، ولا شكلَ غيرُها. */
export const FIGURES = ["structure"] as const;

const AR = "٠١٢٣٤٥٦٧٨٩";
/** الأرقامُ اللاتينيّة إلى أرقام النصّ المُقَرّ. */
export const arDigits = (s: string) => s.replace(/[0-9]/g, (d) => AR[Number(d)]);
const toInt = (s: string) => Number(latin(s));
/** محارفُ الاتّجاه الخفيّة اللاصقة من اللصق، والمسافاتُ المكرّرة. */
const tidy = (s: string) => s.replace(/[‎‏‪-‮⁦-⁩]/g, "").replace(/[ \t ]+/g, " ").trim();
/** نصٌّ يُحفظ: مرتّبٌ وبأرقام النصّ. */
const store = (s: string) => arDigits(tidy(s));

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
export const flatArticles = (body: DraftBody): DraftArticle[] => body.flatMap((c) => c.articles);

// ── النصّ ⇄ الكتل ─────────────────────────────────────────────────────────

const cellsOf = (l: string) => l.replace(/^\|/, "").replace(/\|$/, "").split("|").map(store);

/** الكتلُ نصًّا كما يحرّره الرئيس، بأرقامٍ لاتينيّة. */
export function blocksToMarkup(blocks: RegBlock[]): string {
  return blocks
    .map((b) => {
      if (b.kind === "para") return latin(b.text);
      if (b.kind === "list") return b.items.map((it, i) => `${b.ordered ? `${i + 1}.` : "-"} ${latin(it)}`).join("\n");
      if (b.kind === "table") return [b.head, ...b.rows].map((r) => `| ${r.map(latin).join(" | ")} |`).join("\n");
      return `![${latin(b.caption)}](figure:${b.ref})`;
    })
    .join("\n\n");
}

type Run = { kind: "para" | "ul" | "ol" | "table"; lines: string[] };
const FIG = /^!\[([^\]]*)\]\(figure:([a-z-]+)\)$/;
const kindOf = (l: string): Run["kind"] | "figure" =>
  /^[-•]\s+/.test(l) ? "ul" : /^[0-9٠-٩]+[.)]\s+/.test(l) ? "ol" : l.startsWith("|") ? "table" : FIG.test(l) ? "figure" : "para";

/**
 * نصُّ الرئيس كتلًا. الكتلُ تفصلها الأسطرُ الفارغة، وتنقسم الكتلةُ أيضًا حيث يتبدّل نوعُ سطورها: فقرةٌ
 * يليها سطرٌ يبدأ بـ«-» بلا سطرٍ فارغٍ بينهما فقرةٌ ثمّ قائمة، كما يُقصد.
 */
export function markupToBlocks(src: string): { blocks: RegBlock[] } | { error: string } {
  const blocks: RegBlock[] = [];
  let run: Run | null = null;
  let error: string | null = null;

  const flush = () => {
    if (!run) return;
    const r = run;
    run = null;
    if (r.kind === "para") blocks.push({ kind: "para", text: store(r.lines.join(" ")) });
    else if (r.kind === "ul") blocks.push({ kind: "list", ordered: false, items: r.lines.map((l) => store(l.replace(/^[-•]\s+/, ""))) });
    else if (r.kind === "ol") blocks.push({ kind: "list", ordered: true, items: r.lines.map((l) => store(l.replace(/^[0-9٠-٩]+[.)]\s+/, ""))) });
    else {
      const rows = r.lines.filter((l) => !/^\|[\s|:-]*-{3}[\s|:-]*$/.test(l)).map(cellsOf);
      if (rows.length < 2) error ??= "الجدول يحتاج سطرَ رأسٍ وصفًّا واحدًا على الأقلّ.";
      else if (rows.some((x) => x.length !== rows[0].length)) error ??= "عددُ خانات كلّ صفٍّ في الجدول يساوي عددَ خانات رأسه.";
      else blocks.push({ kind: "table", head: rows[0], rows: rows.slice(1) });
    }
  };

  for (const raw of src.replace(/\r\n?/g, "\n").split("\n")) {
    const l = tidy(raw);
    if (!l) {
      flush();
      continue;
    }
    const k = kindOf(l);
    if (k === "figure") {
      flush();
      const m = l.match(FIG)!;
      if (!(FIGURES as readonly string[]).includes(m[2])) error ??= `لا شكلَ باسم «${m[2]}».`;
      else blocks.push({ kind: "figure", ref: m[2], caption: store(m[1]) });
      continue;
    }
    if (run && (run as Run).kind === k) (run as Run).lines.push(l);
    else {
      flush();
      run = { kind: k, lines: [l] };
    }
  }
  flush();
  if (error) return { error };
  if (!blocks.length) return { error: "نصُّ المادّة فارغ." };
  return { blocks };
}

/** عنوانُ مادّةٍ أو باب، مرتّبًا. */
export function cleanTitle(s: string, what: string): { title: string } | { error: string } {
  const t = store(s);
  if (t.length < 2) return { error: `${what} مطلوب.` };
  if (t.length > 80) return { error: `${what} أطولُ من ٨٠ حرفًا.` };
  return { title: t };
}

// ── الإحالات ─────────────────────────────────────────────────────────────

/** نطاقُ قراءة الإحالات: موادُّ `slug` بأرقامها المعطاة، وسائرُ الوثائق تُقبل كما هي. */
const scopeFor = (here: string, slug: string, nos: ReadonlySet<number>): RefScope => ({
  here,
  hasArticle: (s, no) => (s === slug ? nos.has(no) : true),
  hasChapter: () => true,
});

/** يعيد كتابة الإحالات إلى موادّ `slug` في نصٍّ واحد. `to` يردّ الرقمَ الجديد، أو `null` لما لا يُمسّ. */
function rewrite(text: string, scope: RefScope, slug: string, to: (no: number) => number | null): string {
  return parseRefs(text, scope)
    .map((p) => {
      if (p.kind !== "art" || p.slug !== slug) return p.text;
      const n = to(p.no);
      return n == null || n === p.no ? p.text : p.text.replace(/[٠-٩]+$/, arDigits(String(n)));
    })
    .join("");
}

/** كلُّ نصوص المادّة التي قد تحمل إحالة: الفقرات، والبنود، وخانات الجداول. */
function mapTexts(a: RegArticle, fn: (t: string) => string): RegArticle {
  return {
    ...a,
    blocks: a.blocks.map((b): RegBlock =>
      b.kind === "para" ? { ...b, text: fn(b.text) }
      : b.kind === "list" ? { ...b, items: b.items.map(fn) }
      : b.kind === "table" ? { ...b, head: b.head.map(fn), rows: b.rows.map((r) => r.map(fn)) }
      : b,
    ),
  };
}

const refText = (a: RegArticle) =>
  a.blocks.map((b) => (b.kind === "para" ? b.text : b.kind === "list" ? b.items.join(" ") : b.kind === "table" ? [...b.head, ...b.rows.flat()].join(" ") : "")).join(" ");

// ── الترقيم ─────────────────────────────────────────────────────────────

/** المرساة: إن لم تكن للمسودّة مرساةٌ بعدُ، فرقمُ كلّ مادّةٍ الآن مرساتُها. */
export function anchored(body: DraftBody): DraftBody {
  const b = clone(body);
  if (flatArticles(b).some((a) => a.from !== undefined)) return b;
  for (const a of flatArticles(b)) a.from = a.no;
  return b;
}

/** يرقّم الموادَّ من ١ بترتيبها، ويصحّح إحالاتِ الوثيقة إلى نفسها بالأرقام القديمة. */
function renumber(body: DraftBody, here: string, oldNos: ReadonlySet<number>): DraftBody {
  const map = new Map<number, number>();
  let n = 0;
  for (const c of body)
    for (const a of c.articles) {
      n += 1;
      if (a.no > 0) map.set(a.no, n);
      a.no = n;
    }
  const scope = scopeFor(here, here, oldNos);
  return body.map((c) => ({ ...c, articles: c.articles.map((a) => mapTexts(a, (t) => rewrite(t, scope, here, (no) => map.get(no) ?? null)) as DraftArticle) }));
}

/** يحدّث عنوانَ مادّةٍ ونصَّها في موضعها، ومرساتُها كما هي. */
export function updateArticle(body: DraftBody, no: number, title: string, blocks: RegBlock[]): DraftBody | null {
  const b = clone(body);
  const a = flatArticles(b).find((x) => x.no === no);
  if (!a) return null;
  a.title = title;
  a.blocks = blocks;
  return b;
}

/**
 * يضيف مادّةً في الباب `chapter` قبل موضع `index` (أو آخرَه). ونصُّ الجديدة يُقرأ بالترقيم الذي كُتب
 * عليه — ترقيمِ ما قبل الإضافة — فتتبعه إحالاتُه كما تتبع إحالاتُ غيرها.
 */
export function insertArticle(body: DraftBody, here: string, chapter: number, index: number, title: string, blocks: RegBlock[]): DraftBody | null {
  const b = anchored(body);
  const ch = b[chapter];
  if (!ch || index < 0 || index > ch.articles.length) return null;
  const oldNos = new Set(flatArticles(b).map((a) => a.no));
  ch.articles.splice(index, 0, { no: 0, title, blocks, from: null });
  return renumber(b, here, oldNos);
}

/** مَن في الوثيقة يُحيل إلى المادّة `no` (بأرقام اليوم). */
export function citingWithin(body: DraftBody, here: string, no: number): number[] {
  const nos = new Set(flatArticles(body).map((a) => a.no));
  const scope = scopeFor(here, here, nos);
  return flatArticles(body)
    .filter((a) => a.no !== no && articleRefs(refText(a), scope).some((r) => r.slug === here && r.no === no))
    .map((a) => a.no);
}

/** يحذف المادّة `no` ويرقّم ما بعدها. ولا تُحذف مادّةٌ تُحيل إليها أخرى في الوثيقة: تُعدَّل تلك أوّلًا. */
export function deleteArticle(body: DraftBody, here: string, no: number): { body: DraftBody } | { error: string; citing: number[] } {
  const citing = citingWithin(body, here, no);
  if (citing.length) return { error: "CITED", citing };
  const b = anchored(body);
  const ch = b.find((c) => c.articles.some((a) => a.no === no));
  if (!ch) return { error: "MISSING", citing: [] };
  if (ch.articles.length === 1) return { error: "LAST_IN_CHAPTER", citing: [] };
  const oldNos = new Set(flatArticles(b).map((a) => a.no));
  ch.articles = ch.articles.filter((a) => a.no !== no);
  return { body: renumber(b, here, oldNos) };
}

export function renameChapter(body: DraftBody, chapter: number, title: string): DraftBody | null {
  const b = clone(body);
  if (!b[chapter]) return null;
  b[chapter].title = title;
  return b;
}

/** بابٌ جديدٌ في آخر الوثيقة بمادّته الأولى، فلا يتبدّل رقمٌ قائم. */
export function appendChapter(body: DraftBody, title: string, artTitle: string, blocks: RegBlock[]): DraftBody {
  const b = anchored(body);
  const no = flatArticles(b).length + 1;
  b.push({ title, articles: [{ no, title: artTitle, blocks, from: null }] });
  return b;
}

/** المتنُ كما يُنشر ويُعرض: بلا مراسٍ. */
export const stripAnchors = (body: DraftBody): RegChapter[] =>
  body.map((c) => ({ title: c.title, articles: c.articles.map(({ no, title, blocks }) => ({ no, title, blocks })) }));

// ── ما تغيّر عن المنشور ──────────────────────────────────────────────────

export type ArticleChange = "new" | "edited";

/** موادُّ المسودّة الجديدةُ والمعدّلة، والمحذوفةُ بأرقامها في المنشور. */
export function changesFrom(base: RegChapter[] | null, draft: DraftBody) {
  const baseArts = new Map(base ? base.flatMap((c) => c.articles).map((a) => [a.no, a] as const) : []);
  const anchoredDraft = flatArticles(draft).some((a) => a.from !== undefined);
  const changes: Record<number, ArticleChange> = {};
  const kept = new Set<number>();
  for (const a of flatArticles(draft)) {
    const from = anchoredDraft ? a.from ?? null : a.no;
    if (from == null) {
      changes[a.no] = "new";
      continue;
    }
    kept.add(from);
    const was = baseArts.get(from);
    if (!was) continue;
    if (was.title !== a.title || JSON.stringify(was.blocks) !== JSON.stringify(a.blocks)) changes[a.no] = "edited";
  }
  const removed = base ? [...baseArts.keys()].filter((no) => !kept.has(no)) : [];
  const chapters = base ? draft.map((c, i) => (base[i]?.title !== c.title ? i : -1)).filter((i) => i >= 0) : [];
  return { changes, removed, chapters };
}

// ── الإصداراتُ التبعيّة ──────────────────────────────────────────────────

/** ما صار إليه كلُّ رقمٍ في المنشور، وما حُذف. */
export function numberMap(base: RegChapter[], draft: DraftBody) {
  const map = new Map<number, number>();
  const anchoredDraft = flatArticles(draft).some((a) => a.from !== undefined);
  for (const a of flatArticles(draft)) {
    const from = anchoredDraft ? a.from ?? null : a.no;
    if (from != null) map.set(from, a.no);
  }
  const baseNos = new Set(base.flatMap((c) => c.articles).map((a) => a.no));
  const removed = new Set([...baseNos].filter((no) => !map.has(no)));
  const moved = [...map].some(([o, n]) => o !== n) || removed.size > 0;
  return { map, removed, baseNos, moved };
}

/**
 * نصُّ وثيقةٍ أخرى (`here`) بإحالاتٍ مصحّحةٍ إلى `target`. يردّ المتنَ الجديد، وهل تغيّر، والموادَّ
 * التي تُحيل إلى مادّةٍ حُذفت (فلا يُنشر قبل تعديلها).
 */
export function followupBody(
  body: DraftBody,
  here: string,
  target: string,
  m: { map: Map<number, number>; removed: Set<number>; baseNos: Set<number> },
) {
  const scope = scopeFor(here, target, m.baseNos);
  let changed = false;
  const broken: number[] = [];
  const out = body.map((c) => ({
    ...c,
    articles: c.articles.map((a) => {
      if (articleRefs(refText(a), scope).some((r) => r.slug === target && m.removed.has(r.no))) broken.push(a.no);
      return mapTexts(a, (t) => {
        const r = rewrite(t, scope, target, (no) => m.map.get(no) ?? null);
        if (r !== t) changed = true;
        return r;
      }) as DraftArticle;
    }),
  }));
  return { body: out, changed, broken };
}

/** رقمٌ يكتبه الرئيسُ بأيّ الأرقام. */
export const parseNo = (s: string) => (/^[0-9٠-٩]+$/.test(s.trim()) ? toInt(s.trim()) : null);
