// مصدرُ «أنظمة أدِيب» للعارض: الوثائقُ من القاعدة، وفهرسُ الإحالات بينها، ونصوصُ المعاينة.
//
// يقرأ النسخةَ الساريةَ لكلّ وثيقة من `regulations_current` بمفتاح الزائر، فلا يرى إلّا المنشور.
// **وقبل النشر الأوّل** (لا ساريةَ لوثيقةٍ ما بعد) يقرأ المسودّاتِ بعميل الخدمة، وهي متنُ الإصدار الأوّل
// المُقَرّ بعينه، فتبقى الصفحةُ كما اعتمدها المالك حتى يُطبَّق `regulations_03_publish_v1`. وبعده لا
// تُقرأ مسودّةٌ أبدًا: ما لم يُنشر لا يظهر.

import "server-only";
import { cache } from "react";
import { createAdeebServerClient, createAdeebServiceClient } from "@adeeb/core";
import { articleRefs, type RefScope } from "./refs";
import { articleText, previewsFrom, shortTitle, type RegPreview } from "./text";
import type { RegBlock, RegChapter, RegDoc } from "./types";

export { shortTitle, type RegPreview };

/** مسارُ «أنظمة أدِيب» العلنيّ (نُقل إليه من `/ui/regulations` بعد اعتماد المالك ٢٠٢٦-١٠-١٣). */
export const REG_BASE = "/regulations";

type Row = { slug: string; title: string; summary: string; position: number; approval_note: string | null; body: unknown };

const asDoc = (r: Row): RegDoc => ({
  slug: r.slug,
  title: r.title,
  summary: r.summary,
  note: r.approval_note ?? "",
  chapters: Array.isArray(r.body) ? (r.body as RegChapter[]) : [],
});

/** الوثائقُ بترتيب المادة ٦٥ من الدستور. تُقرأ مرّةً في كلّ عرض، وتتجدّد الصفحاتُ كلَّ ساعة. */
export const docs = cache(async (): Promise<RegDoc[]> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const { data, error } = await createAdeebServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    .from("regulations_current")
    .select("slug, title, summary, position, approval_note, body")
    .order("position");
  // الخطأ يُرمى ولا يُبتلع: صفحةٌ قديمةٌ تبقى خيرٌ من فهرسٍ فارغٍ يُظَنّ أنّ لا أنظمة.
  if (error) throw new Error(`regulations_current: ${error.message}`);
  if (data.length) return (data as Row[]).map(asDoc);

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!key) return [];
  const drafts = await createAdeebServiceClient(url, key)
    .from("regulation_versions")
    .select("approval_note, body, regulations!inner(slug, title, summary, position)")
    .eq("status", "draft");
  if (drafts.error) throw new Error(`regulation_versions: ${drafts.error.message}`);
  type Draft = { approval_note: string | null; body: unknown; regulations: Omit<Row, "approval_note" | "body"> };
  return (drafts.data as unknown as Draft[])
    .map((d) => ({ ...d.regulations, approval_note: d.approval_note, body: d.body }))
    .sort((a, b) => a.position - b.position)
    .map(asDoc);
});

export const findDoc = async (slug: string) => (await docs()).find((d) => d.slug === slug) ?? null;

export const articleCount = (d: RegDoc) => d.chapters.reduce((s, c) => s + c.articles.length, 0);

/** ما يُحال منه: الفقراتُ والبنود. والجدولُ يُعرض نصًّا ولا يُحال منه. */
const refText = (b: RegBlock): string => (b.kind === "para" ? b.text : b.kind === "list" ? b.items.join(" ") : "");

function scopeOf(all: RegDoc[], here: string): RefScope {
  const find = (slug: string) => all.find((d) => d.slug === slug);
  return {
    here,
    hasArticle: (slug, no) => {
      const d = find(slug);
      return !!d && no >= 1 && no <= articleCount(d);
    },
    hasChapter: (slug, ch) => {
      const d = find(slug);
      return !!d && ch >= 1 && ch <= d.chapters.length;
    },
  };
}

export type RefKey = `${string}:${number}`;
export const refKey = (slug: string, no: number): RefKey => `${slug}:${no}`;

/** فهرسُ «يُحال إليها»: لكلّ مادّةٍ الموادُّ التي تُحيل إليها، من الوثائق كلِّها، بترتيبها. */
const citedIndex = new WeakMap<RegDoc[], Map<RefKey, RefKey[]>>();
function citedBy(all: RegDoc[]): Map<RefKey, RefKey[]> {
  const hit = citedIndex.get(all);
  if (hit) return hit;
  const idx = new Map<RefKey, RefKey[]>();
  for (const d of all) {
    const scope = scopeOf(all, d.slug);
    for (const c of d.chapters)
      for (const a of c.articles)
        for (const r of articleRefs(a.blocks.map(refText).join(" "), scope)) {
          if (r.slug === d.slug && r.no === a.no) continue;
          const k = refKey(r.slug, r.no);
          const from = refKey(d.slug, a.no);
          const list = idx.get(k) ?? [];
          if (!list.includes(from)) list.push(from);
          idx.set(k, list);
        }
  }
  citedIndex.set(all, idx);
  return idx;
}

/** كلُّ ما تحتاجه صفحةُ وثيقة: معايناتُ ما تُحيل إليه وما يُحيل إليها، وقوائمُ «يُحال إليها». */
export function docContext(doc: RegDoc, all: RegDoc[]) {
  const scope = scopeOf(all, doc.slug);
  const want = new Set<RefKey>();
  const cited: Record<number, RefKey[]> = {};
  const idx = citedBy(all);
  for (const c of doc.chapters)
    for (const a of c.articles) {
      for (const r of articleRefs(a.blocks.map(refText).join(" "), scope)) want.add(refKey(r.slug, r.no));
      const from = idx.get(refKey(doc.slug, a.no));
      if (from?.length) {
        cited[a.no] = from;
        from.forEach((k) => want.add(k));
      }
    }
  const previews = previewsFrom(all, want);
  const i = all.findIndex((d) => d.slug === doc.slug);
  const next = all[i + 1] ?? null;
  return {
    previews,
    cited,
    docNames: Object.fromEntries(all.map((d) => [d.slug, shortTitle(d)])),
    counts: Object.fromEntries(all.map((d) => [d.slug, [articleCount(d), d.chapters.length] as [number, number]])),
    next: next ? { slug: next.slug, title: next.title, facts: { articles: articleCount(next), chapters: next.chapters.length } } : null,
  };
}

/** فهرسُ البحث العامّ: سطرٌ لكلّ مادّة. */
export interface RegSearchRow {
  s: string;
  n: number;
  t: string;
  x: string;
}
export const searchRows = async (): Promise<RegSearchRow[]> =>
  (await docs()).flatMap((d) => d.chapters.flatMap((c) => c.articles.map((a) => ({ s: d.slug, n: a.no, t: a.title, x: articleText(a) }))));
