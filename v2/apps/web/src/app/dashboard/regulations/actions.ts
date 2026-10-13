"use server";

import { revalidatePath } from "next/cache";
import { getRegEditor, type RegEditor } from "@/lib/regulations/authz";
import {
  appendChapter, cleanTitle, deleteArticle, flatArticles, followupBody, insertArticle, markupToBlocks, numberMap,
  renameChapter, stripAnchors, updateArticle, type DraftBody,
} from "@/lib/regulations/edit";
import { shortTitle } from "@/lib/regulations/text";
import type { RegBlock, RegChapter } from "@/lib/regulations/types";
import { loadDoc, revOf, riyadhToday } from "./data";

// أفعالُ غرفة التحرير. **التفويضُ عند الباب** (`manage_regulations`)، والموافقةُ والنشرُ تحرسهما القاعدة
// أيضًا (`publish_regulation_version`). وكلُّ كتابةٍ في المسودّة تحمل بصمةَ ما رآه الكاتب (`rev`):
// إن كتب الرئيسُ الآخرُ بعده رُدّت حتى يُحدِّث صفحته، فلا يمحو أحدهما عمل صاحبه.

export type RoomResult = { ok: true; message?: string } | { ok: false; message: string };

const DENIED = "لا تملك صلاحية تحرير الأنظمة.";
const STALE = "عدّل الرئيسُ الآخرُ المسودّةَ بعد أن فتحتَها. حدِّث الصفحة ثمّ أعد المحاولة.";
const PRE_LAUNCH = "قبل نشر الإصدار الأوّل يُعدَّل النصُّ في موضعه، ولا تُضاف مادّةٌ ولا تُحذف.";
const fail = (message: string): RoomResult => ({ ok: false, message });

/** المسارُ العلنيّ يتجدّد مع كلّ نشر، ومع كلّ تعديلٍ قبل الإطلاق (فالصفحةُ تعرض المسودّات حتى يُنشر الأوّل). */
function refresh(slug: string, publicToo: boolean) {
  revalidatePath("/dashboard/regulations");
  revalidatePath(`/dashboard/regulations/${slug}`);
  if (publicToo) revalidatePath("/regulations", "layout");
}

type Ctx = { ed: RegEditor; doc: NonNullable<Awaited<ReturnType<typeof loadDoc>>> };

async function open(slug: string): Promise<Ctx | RoomResult> {
  const ed = await getRegEditor();
  if (!ed) return fail(DENIED);
  const doc = await loadDoc(ed.sb, slug);
  if (!doc) return fail("الوثيقة غير موجودة.");
  return { ed, doc };
}
const isFail = (x: Ctx | RoomResult): x is RoomResult => "ok" in x;

/** يكتب متنَ المسودّة إن لم تتبدّل منذ رآها الكاتب. */
async function writeDraft(c: Ctx, rev: string, body: DraftBody): Promise<RoomResult> {
  const d = c.doc.draft;
  if (!d) return fail("لا مسودّةَ لهذه الوثيقة.");
  if (revOf(d.body) !== rev) return fail(STALE);
  const { error } = await c.ed.sb.from("regulation_versions").update({ body }).eq("id", d.id).eq("status", "draft");
  if (error) return fail("تعذّر حفظ المسودّة.");
  refresh(c.doc.reg.slug, c.doc.versions.length === 0);
  return { ok: true };
}

function parseArticle(title: string, markup: string): { title: string; blocks: RegBlock[] } | RoomResult {
  const t = cleanTitle(title, "عنوانُ المادّة");
  if ("error" in t) return fail(t.error);
  const b = markupToBlocks(markup);
  if ("error" in b) return fail(b.error);
  return { title: t.title, blocks: b.blocks };
}

// ── المسودّة ─────────────────────────────────────────────────────────────

/** إصدارٌ جديد: مسودّةٌ تبدأ نسخةً من آخر منشور. */
export async function startDraft(slug: string): Promise<RoomResult> {
  const c = await open(slug);
  if (isFail(c)) return c;
  if (c.doc.draft) return { ok: true };
  if (!c.doc.latest) return fail("لا إصدارَ منشورًا يُبدأ منه.");
  const { error } = await c.ed.sb.from("regulation_versions").insert({
    regulation_id: c.doc.reg.id,
    version_no: c.doc.latest.version_no + 1,
    status: "draft",
    body: c.doc.latest.body,
  });
  if (error) return fail("تعذّر بدء الإصدار الجديد.");
  refresh(slug, false);
  return { ok: true };
}

/** حذفُ المسودّة — لوثيقةٍ لها منشور، فالإصدارُ الأوّل قبل نشره لا يُحذف. */
export async function discardDraft(slug: string, rev: string): Promise<RoomResult> {
  const c = await open(slug);
  if (isFail(c)) return c;
  const d = c.doc.draft;
  if (!d) return { ok: true };
  if (!c.doc.versions.length) return fail("الإصدارُ الأوّل لا يُحذف قبل نشره.");
  if (revOf(d.body) !== rev) return fail(STALE);
  const { error } = await c.ed.sb.from("regulation_versions").delete().eq("id", d.id).eq("status", "draft");
  if (error) return fail("تعذّر حذف المسودّة.");
  refresh(slug, false);
  return { ok: true };
}

// ── الموادّ والأبواب ─────────────────────────────────────────────────────

export async function saveArticle(slug: string, rev: string, no: number, title: string, markup: string): Promise<RoomResult> {
  const c = await open(slug);
  if (isFail(c)) return c;
  if (!c.doc.draft) return fail("لا مسودّةَ لهذه الوثيقة.");
  const a = parseArticle(title, markup);
  if ("ok" in a) return a;
  const body = updateArticle(c.doc.draft.body, no, a.title, a.blocks);
  if (!body) return fail("المادّة غير موجودة.");
  return writeDraft(c, rev, body);
}

export async function addArticle(slug: string, rev: string, chapter: number, index: number, title: string, markup: string): Promise<RoomResult> {
  const c = await open(slug);
  if (isFail(c)) return c;
  if (!c.doc.draft) return fail("لا مسودّةَ لهذه الوثيقة.");
  if (!c.doc.versions.length) return fail(PRE_LAUNCH);
  const a = parseArticle(title, markup);
  if ("ok" in a) return a;
  const body = insertArticle(c.doc.draft.body, slug, chapter, index, a.title, a.blocks);
  if (!body) return fail("موضعُ الإضافة غير صحيح.");
  return writeDraft(c, rev, body);
}

/** يقرأ الوثائقَ الأخرى بآخر منشورها ومسودّاتها: من يُحيل منها إلى موادّ `slug`. */
async function others(c: Ctx) {
  const [regs, vers] = await Promise.all([
    c.ed.sb.from("regulations").select("id, slug, title"),
    c.ed.sb.from("regulation_versions").select("id, regulation_id, version_no, status, body").neq("regulation_id", c.doc.reg.id),
  ]);
  type V = { id: string; regulation_id: number; version_no: number; status: string; body: DraftBody };
  const vs = (vers.data ?? []) as V[];
  return ((regs.data ?? []) as Array<{ id: number; slug: string; title: string }>)
    .filter((r) => r.id !== c.doc.reg.id)
    .map((r) => {
      const mine = vs.filter((v) => v.regulation_id === r.id);
      const latest = mine.filter((v) => v.status === "published").sort((a, b) => b.version_no - a.version_no)[0] ?? null;
      const draft = mine.find((v) => v.status === "draft") ?? null;
      return { ...r, latest, draft };
    });
}

export async function removeArticle(slug: string, rev: string, no: number): Promise<RoomResult> {
  const c = await open(slug);
  if (isFail(c)) return c;
  const d = c.doc.draft;
  if (!d) return fail("لا مسودّةَ لهذه الوثيقة.");
  if (!c.doc.versions.length) return fail(PRE_LAUNCH);
  const r = deleteArticle(d.body, slug, no);
  if ("error" in r) {
    if (r.error === "CITED") return fail(`تُحيل إليها ${r.citing.length > 1 ? "الموادّ" : "المادّة"} ${r.citing.join(" و")} في هذه الوثيقة. عدّلها أوّلًا.`);
    if (r.error === "LAST_IN_CHAPTER") return fail("هي آخرُ مادّةٍ في بابها، والبابُ لا يبقى فارغًا.");
    return fail("المادّة غير موجودة.");
  }
  // ومن خارجها: الوثائقُ الأخرى تُحيل بأرقام المنشور، فيُسأل عن رقمها فيه.
  const art = flatArticles(d.body).find((a) => a.no === no);
  const from = art?.from === undefined ? no : art.from;
  if (from != null && c.doc.latest) {
    const m = { map: new Map<number, number>(), removed: new Set([from]), baseNos: new Set(flatArticles(c.doc.latest.body as DraftBody).map((a) => a.no)) };
    const hits: string[] = [];
    for (const o of await others(c)) {
      const nos = new Set<number>();
      for (const b of [o.latest?.body, o.draft?.body]) if (b) followupBody(b, o.slug, slug, m).broken.forEach((n) => nos.add(n));
      if (nos.size) hits.push(`${shortTitle(o)} (${[...nos].join(" و")})`);
    }
    if (hits.length) return fail(`تُحيل إليها: ${hits.join("، ")}. تُعدَّل تلك أوّلًا.`);
  }
  return writeDraft(c, rev, r.body);
}

export async function saveChapter(slug: string, rev: string, chapter: number, title: string): Promise<RoomResult> {
  const c = await open(slug);
  if (isFail(c)) return c;
  if (!c.doc.draft) return fail("لا مسودّةَ لهذه الوثيقة.");
  const t = cleanTitle(title, "عنوانُ الباب");
  if ("error" in t) return fail(t.error);
  const body = renameChapter(c.doc.draft.body, chapter, t.title);
  if (!body) return fail("الباب غير موجود.");
  return writeDraft(c, rev, body);
}

export async function addChapter(slug: string, rev: string, title: string, artTitle: string, markup: string): Promise<RoomResult> {
  const c = await open(slug);
  if (isFail(c)) return c;
  if (!c.doc.draft) return fail("لا مسودّةَ لهذه الوثيقة.");
  if (!c.doc.versions.length) return fail(PRE_LAUNCH);
  const t = cleanTitle(title, "عنوانُ الباب");
  if ("error" in t) return fail(t.error);
  const a = parseArticle(artTitle, markup);
  if ("ok" in a) return a;
  return writeDraft(c, rev, appendChapter(c.doc.draft.body, t.title, a.title, a.blocks));
}

// ── الموافقة والنشر (الدستور م٦٨) ─────────────────────────────────────────

export async function approveDraft(slug: string, rev: string): Promise<RoomResult> {
  const c = await open(slug);
  if (isFail(c)) return c;
  const d = c.doc.draft;
  if (!d) return fail("لا مسودّةَ لهذه الوثيقة.");
  if (!c.doc.versions.length) return fail("يُنشر الإصدارُ الأوّل مع إطلاق الصفحة.");
  if (!c.ed.seat) return fail("الموافقةُ لرئيس أدِيب والرئيس التنفيذيّ بمقعديهما.");
  if (revOf(d.body) !== rev) return fail(STALE);
  const { error } = await c.ed.sb
    .from("regulation_version_approvals")
    .upsert({ version_id: d.id, role_name: c.ed.seat, user_id: c.ed.userId }, { onConflict: "version_id,role_name", ignoreDuplicates: true });
  if (error) return fail("تعذّر تسجيل الموافقة.");
  refresh(slug, false);
  return { ok: true };
}

export async function withdrawApproval(slug: string): Promise<RoomResult> {
  const c = await open(slug);
  if (isFail(c)) return c;
  const d = c.doc.draft;
  if (!d || !c.ed.seat) return { ok: true };
  const { error } = await c.ed.sb.from("regulation_version_approvals").delete().eq("version_id", d.id).eq("role_name", c.ed.seat);
  if (error) return fail("تعذّر سحب الموافقة.");
  refresh(slug, false);
  return { ok: true };
}

export type PublishPlan = {
  ok: true;
  followups: Array<{ slug: string; title: string; articles: number }>;
  broken: Array<{ slug: string; title: string; articles: number[] }>;
};

/** ما يصدر مع المسودّة: إصداراتٌ تبعيّةٌ للوثائق التي تتغيّر أرقامُ إحالاتها، وما يمنع النشر. */
async function plan(c: Ctx) {
  const d = c.doc.draft!;
  const base = c.doc.latest?.body as RegChapter[] | undefined;
  const followups: Array<{ regulation_id: number; slug: string; title: string; articles: number; body: RegChapter[] | null; draft_body: DraftBody | null }> = [];
  const broken: PublishPlan["broken"] = [];
  if (!base) return { followups, broken };
  const m = numberMap(base, d.body);
  if (!m.moved) return { followups, broken };
  for (const o of await others(c)) {
    const pub = o.latest ? followupBody(o.latest.body, o.slug, c.doc.reg.slug, m) : null;
    const dr = o.draft ? followupBody(o.draft.body, o.slug, c.doc.reg.slug, m) : null;
    const bad = new Set([...(pub?.broken ?? []), ...(dr?.broken ?? [])]);
    if (bad.size) broken.push({ slug: o.slug, title: shortTitle(o), articles: [...bad].sort((a, b) => a - b) });
    if (!pub?.changed && !dr?.changed) continue;
    const touched = pub
      ? flatArticles(pub.body).filter((a, i) => JSON.stringify(a.blocks) !== JSON.stringify(flatArticles(o.latest!.body)[i]?.blocks)).length
      : 0;
    followups.push({
      regulation_id: o.id,
      slug: o.slug,
      title: shortTitle(o),
      articles: touched,
      body: pub?.changed ? stripAnchors(pub.body) : null,
      draft_body: dr?.changed ? dr.body : null,
    });
  }
  return { followups, broken };
}

export async function publishPlan(slug: string): Promise<PublishPlan | RoomResult> {
  const c = await open(slug);
  if (isFail(c)) return c;
  if (!c.doc.draft) return fail("لا مسودّةَ لهذه الوثيقة.");
  const p = await plan(c);
  return { ok: true, followups: p.followups.filter((f) => f.body).map((f) => ({ slug: f.slug, title: f.title, articles: f.articles })), broken: p.broken };
}

export async function publishDraft(slug: string, rev: string, effectiveFrom: string, changeNote: string, approvalNote: string): Promise<RoomResult> {
  const c = await open(slug);
  if (isFail(c)) return c;
  const d = c.doc.draft;
  if (!d) return fail("لا مسودّةَ لهذه الوثيقة.");
  if (!c.doc.versions.length) return fail("يُنشر الإصدارُ الأوّل مع إطلاق الصفحة.");
  if (revOf(d.body) !== rev) return fail(STALE);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom) || effectiveFrom < riyadhToday()) return fail("تاريخُ النفاذ اليومَ أو بعده.");
  const note = changeNote.trim();
  if (note.length < 2 || note.length > 500) return fail("خلاصةُ التعديل مطلوبة، ولا تزيد على ٥٠٠ حرف.");
  if (approvalNote.trim().length > 500) return fail("ملاحظةُ الإقرار لا تزيد على ٥٠٠ حرف.");

  const p = await plan(c);
  if (p.broken.length) return fail(`تُحيل إلى موادَّ حُذفت: ${p.broken.map((b) => `${b.title} (${b.articles.join(" و")})`).join("، ")}.`);
  const title = shortTitle(c.doc.reg);
  const { error } = await c.ed.sb.rpc("publish_regulation_version", {
    p_version_id: d.id,
    p_effective_from: effectiveFrom,
    p_change_note: note,
    p_approval_note: approvalNote.trim() || null,
    p_actor: c.ed.userId,
    p_followups: p.followups.map((f) => ({
      regulation_id: f.regulation_id,
      body: f.body,
      draft_body: f.draft_body,
      change_note: `تصحيحُ أرقام الإحالات إلى ${title} بعد إصداره ${d.version_no}.`,
    })),
  });
  if (error) {
    if (/NEEDS_APPROVALS/.test(error.message)) return fail("لا يُنشر إلّا بموافقة الرئيسين معًا.");
    if (/PAST_EFFECTIVE/.test(error.message)) return fail("تاريخُ النفاذ اليومَ أو بعده.");
    return fail("تعذّر النشر.");
  }
  refresh(slug, true);
  for (const f of p.followups) revalidatePath(`/dashboard/regulations/${f.slug}`);
  return { ok: true, message: `نُشر الإصدار ${d.version_no}.` };
}
