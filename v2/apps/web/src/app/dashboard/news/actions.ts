"use server";

import { revalidatePath } from "next/cache";
import { getNewsroomActor, newsRoleFor, newsService, DENIED, ENV_MISSING } from "@/lib/news/authz";
import {
  IMAGE_EXT, IMAGE_MAX_BYTES, NEWS_BUCKET, BAD_MIME, TOO_BIG,
  coverKey, galleryKey, newsPrefix, pathFromUrl,
} from "@/lib/news/media";
import { CATEGORY_VALUES, FIELD_VALUES, type Category, type FieldKey } from "./vocab";

export type Result = { ok: boolean; message: string; id?: string };

/** يقلّم المسافات ومحارف الاتّجاه الخفيّة اللاصقة من اللصق العربيّ، ويحوّل الفارغ إلى null. */
const clean = (v: string | null | undefined): string | null => {
  const t = v?.replace(/[‎‏‪-‮]/g, "").trim();
  return t ? t : null;
};

const cleanList = (v: string[] | null | undefined): string[] =>
  (v ?? []).map((s) => clean(s) ?? "").filter(Boolean);

/** حرّاس القاعدة تُترجَم لرسائل عربيّة — فلا يرى المستخدم اسم قيدٍ إنجليزيّ. */
function guardMessage(msg: string): string | null {
  if (/news_publish_guard/.test(msg)) return "لا يُنشَر خبرٌ ناقص. أكمِل الملخّص والغلاف واسم الكاتب.";
  if (/news_category_check/.test(msg)) return "قسمٌ غير معروف.";
  if (/news_gallery_photographers_aligned/.test(msg)) return "عدد مصوّري المعرض لا يطابق عدد صوره.";
  if (/news_tags_clean/.test(msg)) return "فيه وسمٌ فارغ. احذفه.";
  if (/news_slug_present/.test(msg)) return "المعرّف مطلوب.";
  if (/news_assigned_fields_known/.test(msg)) return "حقلٌ غير معروف في التكليف.";
  if (/duplicate key|unique/i.test(msg)) return "هذا المعرّف مستخدَم. اختر غيره.";
  if (/news_denied/.test(msg)) return DENIED;
  if (/news_notes_required/.test(msg)) return "اكتب ما ينبغي تعديله. الإعادة بلا ملاحظة لا تُفيد الكاتب.";
  if (/news_bad_transition/.test(msg)) return "هذا الخبر ليس في مرحلةٍ تقبل هذا الفعل.";
  if (/news_title_required/.test(msg)) return "عنوان الخبر مطلوب.";
  if (/news_empty_comment/.test(msg)) return "التعليق فارغ.";
  return null;
}
const fail = (msg: string, fallback: string): Result => ({
  ok: false,
  message: guardMessage(msg) ?? `${fallback}: ${msg}`,
});

const touch = () => {
  revalidatePath("/dashboard/news", "layout");
  revalidatePath("/", "layout"); // قسم «آخر الأخبار» في الهبوط
};

/* ══ الميلاد ═════════════════════════════════════════════════════════ */

export async function createNews(input: {
  title: string; committeeId?: number | null; category?: Category;
}): Promise<Result> {
  const actor = await getNewsroomActor();
  if (!actor) return { ok: false, message: DENIED };
  const sb = newsService();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const title = clean(input.title);
  if (!title) return { ok: false, message: "عنوان الخبر مطلوب." };
  const category = input.category && CATEGORY_VALUES.includes(input.category) ? input.category : "coverage";

  const { data, error } = await sb.rpc("news_create", {
    p_actor: actor.userId, p_title: title,
    p_committee: input.committeeId ?? null, p_category: category,
  });
  if (error) return fail(error.message, "تعذّر إنشاء الخبر");

  touch();
  return { ok: true, message: "أُنشئ الخبر مسودّةً. افتحه لتكتبه أو تكلّف كاتبه.", id: data as string };
}

/* ══ الحفظ — والحقول تُرشَّح بحسب الدور ═══════════════════════════════ */

export type NewsInput = Partial<{
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  category: Category;
  tags: string[];
  authors: string[];
  committeeId: number | null;
  coverPhotographer: string | null;
  galleryPhotographers: string[];
}>;

/** خريطة حقل الواجهة إلى عمود القاعدة — مصدرٌ واحد يقرؤه الترشيح والكتابة معًا. */
const COLUMN: Record<FieldKey, string> = {
  title: "title", summary: "summary", content: "content", tags: "tags",
  category: "category", authors: "authors", image_url: "image_url",
  gallery_images: "gallery_images", cover_photographer: "cover_photographer",
  gallery_photographers: "gallery_photographers",
};

/**
 * ما الذي يملك هذا الفاعل تحريره في هذا الخبر؟
 * رئيس التحرير: كلّ شيء. والكاتب: ما اجتمع في `assigned_fields` من تكليفه — يُقرأ من
 * القاعدة في كلّ حفظ، فلا يكفي أن تخفي الواجهةُ حقلًا ليمتنع تعديله.
 */
async function allowedFields(newsId: string): Promise<Set<FieldKey> | "all" | null> {
  const actor = await getNewsroomActor();
  if (!actor) return null;
  if (actor.isChief) return "all";

  const sb = newsService();
  if (!sb) return null;
  const { data } = await sb
    .from("news_writer_assignments")
    .select("assigned_fields, status")
    .eq("news_id", newsId).eq("writer_id", actor.userId).maybeSingle();
  if (!data || data.status === "declined") return null;

  const raw = Array.isArray(data.assigned_fields) ? (data.assigned_fields as string[]) : [];
  return new Set(raw.filter((f): f is FieldKey => (FIELD_VALUES as string[]).includes(f)));
}

export async function saveNews(id: string, input: NewsInput): Promise<Result> {
  const actor = await getNewsroomActor();
  if (!actor) return { ok: false, message: DENIED };
  const sb = newsService();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const allow = await allowedFields(id);
  if (!allow) return { ok: false, message: "لا تملك تحرير هذا الخبر." };
  const may = (f: FieldKey) => allow === "all" || allow.has(f);

  const patch: Record<string, unknown> = {};
  const rejected: string[] = [];

  const put = (f: FieldKey, value: unknown, present: boolean) => {
    if (!present) return;
    if (may(f)) patch[COLUMN[f]] = value;
    else rejected.push(f);
  };

  put("title", clean(input.title), input.title !== undefined);
  put("summary", clean(input.summary), input.summary !== undefined);
  put("content", input.content?.trim() ?? "", input.content !== undefined);
  put("tags", cleanList(input.tags), input.tags !== undefined);
  put("authors", cleanList(input.authors), input.authors !== undefined);
  put("cover_photographer", clean(input.coverPhotographer), input.coverPhotographer !== undefined);
  put("gallery_photographers", cleanList(input.galleryPhotographers), input.galleryPhotographers !== undefined);
  if (input.category !== undefined && CATEGORY_VALUES.includes(input.category)) {
    put("category", input.category, true);
  }

  // المعرّف واللجنة ليسا حقلَي كتابة — إدارةٌ لرئيس التحرير وحده.
  if (actor.isChief) {
    if (input.slug !== undefined) patch.slug = clean(input.slug);
    if (input.committeeId !== undefined) patch.committee_id = input.committeeId;
  }

  if (patch.title !== undefined && !patch.title) return { ok: false, message: "العنوان لا يكون فارغًا." };
  if (Object.keys(patch).length === 0) {
    return rejected.length
      ? { ok: false, message: "لم تُكلَّف بتحرير هذه الحقول." }
      : { ok: true, message: "لا جديد." };
  }

  const { error } = await sb.from("news").update(patch).eq("id", id);
  if (error) return fail(error.message, "تعذّر الحفظ");

  // أوّل حفظٍ من الكاتب ينقل الخبر من «مُكلَّف» إلى «قيد الكتابة» بلا زرّ يُضغط.
  if (!actor.isChief) await sb.rpc("news_writer_touch", { p_news: id, p_actor: actor.userId });

  touch();
  return {
    ok: true,
    message: rejected.length ? "حُفظ ما تملكه، وتُجوهِلت حقولٌ لم تُكلَّف بها." : "حُفظت التغييرات.",
    id,
  };
}

/* ══ التكليف — فعل رئيس التحرير ══════════════════════════════════════ */

export async function assignWriters(
  id: string, writers: string[], fields: FieldKey[], notes?: string | null,
): Promise<Result> {
  const actor = await getNewsroomActor();
  if (!actor) return { ok: false, message: DENIED };
  const sb = newsService();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const known = fields.filter((f) => (FIELD_VALUES as string[]).includes(f));
  if (writers.length && known.length === 0) {
    return { ok: false, message: "اختر حقلًا واحدًا على الأقلّ يملكه الكاتب." };
  }

  const { data, error } = await sb.rpc("news_assign_writers", {
    p_news: id, p_actor: actor.userId,
    p_writers: writers, p_fields: known, p_notes: clean(notes),
  });
  if (error) return fail(error.message, "تعذّر التكليف");

  touch();
  return { ok: true, message: (data as string) ?? "حُفظ التكليف." };
}

/* ══ تحوّلات الحالة ══════════════════════════════════════════════════ */

export async function submitForReview(id: string): Promise<Result> {
  const actor = await getNewsroomActor();
  if (!actor) return { ok: false, message: DENIED };
  const sb = newsService();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { data, error } = await sb.rpc("news_submit_for_review", { p_news: id, p_actor: actor.userId });
  if (error) return fail(error.message, "تعذّر الرفع");
  touch();
  return { ok: true, message: (data as string) ?? "رُفع الخبر إلى المراجعة." };
}

export async function returnForEdits(id: string, notes: string): Promise<Result> {
  const actor = await getNewsroomActor();
  if (!actor) return { ok: false, message: DENIED };
  const sb = newsService();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { data, error } = await sb.rpc("news_return_for_edits", {
    p_news: id, p_actor: actor.userId, p_notes: notes,
  });
  if (error) return fail(error.message, "تعذّرت الإعادة");
  touch();
  return { ok: true, message: (data as string) ?? "أُعيد الخبر إلى الكاتب." };
}

export async function setNewsStatus(
  id: string, op: "publish" | "unpublish" | "archive" | "restore",
): Promise<Result> {
  const actor = await getNewsroomActor();
  if (!actor) return { ok: false, message: DENIED };
  const sb = newsService();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { data, error } = await sb.rpc("news_set_status", { p_news: id, p_actor: actor.userId, p_op: op });
  if (error) return fail(error.message, "تعذّر تغيير الحالة");
  touch();
  return { ok: true, message: (data as string) ?? "تمّ." };
}

export async function toggleFeatured(id: string, value: boolean): Promise<Result> {
  const sb = newsService();
  if (!sb) return { ok: false, message: ENV_MISSING };
  if ((await newsRoleFor(id)) !== "chief") return { ok: false, message: "التمييز لرئيس التحرير وحده." };

  const { error } = await sb.from("news").update({ is_featured: value }).eq("id", id);
  if (error) return fail(error.message, "تعذّر التمييز");
  touch();
  return { ok: true, message: value ? "مُيّز في الواجهة." : "أُزيل التمييز." };
}

/**
 * حذفٌ نهائيّ. الـcascade يمسح التكاليف والتعليقات والسجلّ — لكنّه **لا يمسّ
 * الملفّات** في المخزن، فتُمسح بادئة الخبر كاملةً قبل الصفّ كي لا تتراكم أيتام
 * (درسُ المكتبة والإذاعة نفسه).
 */
export async function deleteNews(id: string): Promise<Result> {
  const sb = newsService();
  if (!sb) return { ok: false, message: ENV_MISSING };
  if ((await newsRoleFor(id)) !== "chief") return { ok: false, message: "الحذف لرئيس التحرير وحده." };

  const { data: n } = await sb.from("news").select("title, workflow_status").eq("id", id).maybeSingle();
  if (n?.workflow_status === "published") {
    return { ok: false, message: "لا يُحذف خبرٌ منشور. أرشِفه أوّلًا (رابطه منشورٌ في الخارج)." };
  }

  await removePrefix(id);
  const { error } = await sb.from("news").delete().eq("id", id);
  if (error) return fail(error.message, "تعذّر الحذف");

  touch();
  return { ok: true, message: `حُذف «${n?.title ?? "الخبر"}» وكلّ ما تحته.` };
}

async function removePrefix(newsId: string) {
  const sb = newsService();
  if (!sb) return;
  for (const folder of ["cover", "gallery"]) {
    const { data } = await sb.storage.from(NEWS_BUCKET).list(`${newsPrefix(newsId)}/${folder}`, { limit: 1000 });
    if (data?.length) {
      await sb.storage.from(NEWS_BUCKET).remove(data.map((f) => `${newsPrefix(newsId)}/${folder}/${f.name}`));
    }
  }
}

/* ══ الوسائط — رابطٌ موقّع يرفع إليه المتصفّح مباشرةً ═════════════════ */

export type UploadTicket = { ok: boolean; path?: string; token?: string; message?: string };

/**
 * يصكّ رابط رفع موقّعًا. الرفع الفعليّ يجري **من المتصفّح** (`uploadToSignedUrl`)
 * فيتجاوز حدّ جسم Server Action (~1MB) — ومعرض خبرٍ فيه أربع صورٍ يتجاوزه حتمًا.
 */
export async function createImageUploadUrl(
  newsId: string, kind: "cover" | "gallery", mime: string, size: number,
): Promise<UploadTicket> {
  const actor = await getNewsroomActor();
  if (!actor) return { ok: false, message: DENIED };
  const sb = newsService();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const allow = await allowedFields(newsId);
  const field: FieldKey = kind === "cover" ? "image_url" : "gallery_images";
  if (!allow || (allow !== "all" && !allow.has(field))) {
    return { ok: false, message: "لم تُكلَّف برفع صور هذا الخبر." };
  }

  const ext = IMAGE_EXT[mime];
  if (!ext) return { ok: false, message: BAD_MIME };
  if (size > IMAGE_MAX_BYTES) return { ok: false, message: TOO_BIG };

  const path = kind === "cover" ? coverKey(newsId, ext) : galleryKey(newsId, ext);
  const { data, error } = await sb.storage.from(NEWS_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, message: `تعذّر تجهيز الرفع: ${error?.message ?? "بلا تفاصيل"}` };
  return { ok: true, path: data.path, token: data.token };
}

const publicUrlOf = (path: string): string | null => {
  const sb = newsService();
  return sb ? sb.storage.from(NEWS_BUCKET).getPublicUrl(path).data.publicUrl : null;
};

/** يُثبت الغلاف بعد نجاح الرفع، ويمسح القديم إن كان من دلونا. */
export async function setCover(newsId: string, storagePath: string): Promise<Result> {
  const sb = newsService();
  if (!sb) return { ok: false, message: ENV_MISSING };
  const allow = await allowedFields(newsId);
  if (!allow || (allow !== "all" && !allow.has("image_url"))) {
    return { ok: false, message: "لم تُكلَّف بصورة الغلاف." };
  }

  const url = publicUrlOf(storagePath);
  if (!url) return { ok: false, message: ENV_MISSING };

  const { data: cur } = await sb.from("news").select("image_url").eq("id", newsId).maybeSingle();
  const { error } = await sb.from("news").update({ image_url: url }).eq("id", newsId);
  if (error) return fail(error.message, "تعذّر حفظ الغلاف");

  const old = pathFromUrl(cur?.image_url);
  if (old && old !== storagePath) await sb.storage.from(NEWS_BUCKET).remove([old]);

  touch();
  return { ok: true, message: "رُفع الغلاف." };
}

export async function removeCover(newsId: string): Promise<Result> {
  const sb = newsService();
  if (!sb) return { ok: false, message: ENV_MISSING };
  const allow = await allowedFields(newsId);
  if (!allow || (allow !== "all" && !allow.has("image_url"))) {
    return { ok: false, message: "لم تُكلَّف بصورة الغلاف." };
  }

  const { data: cur } = await sb.from("news").select("image_url").eq("id", newsId).maybeSingle();
  const { error } = await sb.from("news").update({ image_url: null, cover_photographer: null }).eq("id", newsId);
  if (error) return fail(error.message, "تعذّر حذف الغلاف");

  const old = pathFromUrl(cur?.image_url);
  if (old) await sb.storage.from(NEWS_BUCKET).remove([old]);

  touch();
  return { ok: true, message: "حُذف الغلاف." };
}

/**
 * يضيف صورةً إلى المعرض. المصوّر يُحفظ **بالتوازي** مع الصورة في المصفوفة الأخرى —
 * والقيد `news_gallery_photographers_aligned` يضمن أنّهما لا تفترقان طولًا.
 */
export async function addGalleryImage(
  newsId: string, storagePath: string, photographer?: string | null,
): Promise<Result> {
  const sb = newsService();
  if (!sb) return { ok: false, message: ENV_MISSING };
  const allow = await allowedFields(newsId);
  if (!allow || (allow !== "all" && !allow.has("gallery_images"))) {
    return { ok: false, message: "لم تُكلَّف بمعرض الصور." };
  }

  const url = publicUrlOf(storagePath);
  if (!url) return { ok: false, message: ENV_MISSING };

  const { data: cur } = await sb
    .from("news").select("gallery_images, gallery_photographers").eq("id", newsId).maybeSingle();
  const images = [...((cur?.gallery_images as string[] | null) ?? []), url];
  const shooters = [...((cur?.gallery_photographers as string[] | null) ?? []), clean(photographer) ?? ""];

  const { error } = await sb
    .from("news").update({ gallery_images: images, gallery_photographers: shooters }).eq("id", newsId);
  if (error) return fail(error.message, "تعذّر إضافة الصورة");

  touch();
  return { ok: true, message: "أُضيفت الصورة." };
}

export async function removeGalleryImage(newsId: string, index: number): Promise<Result> {
  const sb = newsService();
  if (!sb) return { ok: false, message: ENV_MISSING };
  const allow = await allowedFields(newsId);
  if (!allow || (allow !== "all" && !allow.has("gallery_images"))) {
    return { ok: false, message: "لم تُكلَّف بمعرض الصور." };
  }

  const { data: cur } = await sb
    .from("news").select("gallery_images, gallery_photographers").eq("id", newsId).maybeSingle();
  const images = [...((cur?.gallery_images as string[] | null) ?? [])];
  const shooters = [...((cur?.gallery_photographers as string[] | null) ?? [])];
  if (index < 0 || index >= images.length) return { ok: false, message: "لا صورة هناك." };

  const [gone] = images.splice(index, 1);
  if (index < shooters.length) shooters.splice(index, 1);

  const { error } = await sb
    .from("news").update({ gallery_images: images, gallery_photographers: shooters }).eq("id", newsId);
  if (error) return fail(error.message, "تعذّر حذف الصورة");

  const path = pathFromUrl(gone);
  if (path) await sb.storage.from(NEWS_BUCKET).remove([path]);

  touch();
  return { ok: true, message: "حُذفت الصورة." };
}

/* ══ تعليقات التعاون الداخليّة ═══════════════════════════════════════ */

export async function addCollabComment(newsId: string, text: string, parentId?: string | null): Promise<Result> {
  const actor = await getNewsroomActor();
  if (!actor) return { ok: false, message: DENIED };
  const sb = newsService();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { error } = await sb.rpc("news_comment", {
    p_news: newsId, p_actor: actor.userId, p_text: text, p_parent: parentId ?? null,
  });
  if (error) return fail(error.message, "تعذّر إضافة التعليق");

  revalidatePath("/dashboard/news", "layout");
  return { ok: true, message: "أُضيف التعليق." };
}

/** إخفاءٌ لا محو: التعليق يبقى في السجلّ ويسقط من العرض. */
export async function deleteCollabComment(commentId: string): Promise<Result> {
  const actor = await getNewsroomActor();
  if (!actor) return { ok: false, message: DENIED };
  const sb = newsService();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { data: c } = await sb
    .from("news_collaboration_comments").select("news_id, user_id").eq("id", commentId).maybeSingle();
  if (!c) return { ok: false, message: "لم يُوجد التعليق." };
  if (c.user_id !== actor.userId && (await newsRoleFor(c.news_id)) !== "chief") {
    return { ok: false, message: "لا تملك حذف تعليق غيرك." };
  }

  const { error } = await sb
    .from("news_collaboration_comments").update({ deleted_at: new Date().toISOString() }).eq("id", commentId);
  if (error) return fail(error.message, "تعذّر الحذف");

  revalidatePath("/dashboard/news", "layout");
  return { ok: true, message: "حُذف التعليق." };
}

/* ══ تعليقات الجمهور — إقرارٌ أو حذف ═════════════════════════════════ */

export async function moderatePublicComment(commentId: string, op: "approve" | "reject"): Promise<Result> {
  const sb = newsService();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { data: c } = await sb.from("news_public_comments").select("news_id").eq("id", commentId).maybeSingle();
  if (!c) return { ok: false, message: "لم يُوجد التعليق." };
  if ((await newsRoleFor(c.news_id)) !== "chief") {
    return { ok: false, message: "مراجعة تعليقات الجمهور لرئيس التحرير وحده." };
  }

  const { error } = op === "approve"
    ? await sb.from("news_public_comments").update({ is_approved: true }).eq("id", commentId)
    : await sb.from("news_public_comments").delete().eq("id", commentId);
  if (error) return fail(error.message, "تعذّر التنفيذ");

  touch();
  return { ok: true, message: op === "approve" ? "أُقرّ التعليق ونُشر." : "حُذف التعليق." };
}
