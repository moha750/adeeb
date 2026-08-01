"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getRadioManager } from "@/lib/radio/authz";
import {
  AUDIO_EXT, AUDIO_MAX_BYTES, IMAGE_EXT, IMAGE_MAX_BYTES,
  R2_READY, R2_MISSING, deleteObject, deletePrefix, episodeAudioKey, episodePrefix,
  presignUpload, showLogoKey, showPrefix,
} from "@/lib/radio/r2";
import { PLATFORM_VALUES, TONE_VALUES, slugify, type Platform, type ShowTone } from "./vocab";

export type Result = { ok: boolean; message: string; id?: string };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const ENV_MISSING = "إعداد الخادم ناقص (مفتاح الخدمة).";
const DENIED = "لا تملك صلاحية إدارة الإذاعة.";

/** يقلّم المسافات ومحارف الاتّجاه الخفيّة اللاصقة من اللصق العربيّ، ويحوّل الفارغ إلى null. */
const clean = (v: string | null | undefined): string | null => {
  const t = v?.replace(/[‎‏‪-‮]/g, "").trim();
  return t ? t : null;
};

const isDup = (msg: string) => /duplicate key|unique/i.test(msg);
/** حرّاس القاعدة تُترجَم لرسائل عربيّة — فلا يرى المستخدم اسم قيدٍ إنجليزيّ. */
function guardMessage(msg: string): string | null {
  if (/radio_shows_publish_guard/.test(msg)) return "لا يُنشَر برنامجٌ بلا شعارٍ ووصف — أكمِلهما أوّلًا.";
  if (/radio_episodes_publish_guard/.test(msg)) return "لا تُنشَر حلقةٌ بلا صوت — ارفع الملفّ أوّلًا.";
  if (/radio_episodes_schedule_guard/.test(msg)) return "الجدولة تحتاج تاريخًا.";
  if (/radio_episodes_show_id_season_number_key/.test(msg)) return "رقم الحلقة مستخدَمٌ في هذا الموسم.";
  if (/slug_format/.test(msg)) return "المعرّف بأحرفٍ لاتينيّة وأرقامٍ وشُرَط فقط.";
  return null;
}
const fail = (msg: string, fallback: string): Result => ({ ok: false, message: guardMessage(msg) ?? `${fallback}: ${msg}` });

const touch = () => {
  revalidatePath("/dashboard/radio", "layout");
  revalidatePath("/radio", "layout");
};

/* ══ البرنامج ════════════════════════════════════════════════════════ */

export type ShowInput = {
  title: string;
  slug: string;
  tagline?: string | null;
  description?: string | null;
  tone: ShowTone;
  hostId: string;
  committeeId?: number | null;
};

function validate(input: ShowInput): { error: string } | { slug: string } {
  if (!clean(input.title)) return { error: "اسم البرنامج مطلوب." };
  if (!input.hostId) return { error: "مقدّم البرنامج مطلوب." };
  if (!TONE_VALUES.includes(input.tone)) return { error: "نغمة غير معروفة." };
  const slug = slugify(input.slug ?? "");
  if (!slug) return { error: "المعرّف مطلوب — أحرف لاتينيّة وأرقام." };
  return { slug };
}

const showColumns = (input: ShowInput, slug: string) => ({
  title: clean(input.title),
  slug,
  tagline: clean(input.tagline),
  description: clean(input.description),
  tone: input.tone,
  host_member_id: input.hostId,
  producing_committee_id: input.committeeId ?? null,
});

export async function createShow(input: ShowInput): Promise<Result> {
  const mgr = await getRadioManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const v = validate(input);
  if ("error" in v) return { ok: false, message: v.error };

  // يُنشأ مسودّةً دائمًا — النشر فعلٌ مستقلّ.
  const { data, error } = await sb
    .from("radio_shows")
    .insert({ ...showColumns(input, v.slug), status: "draft", created_by: mgr.userId })
    .select("id")
    .single();
  if (error || !data) {
    if (error && isDup(error.message)) return { ok: false, message: "هذا المعرّف مستخدَم — اختر غيره." };
    return fail(error?.message ?? "بلا تفاصيل", "تعذّر إنشاء البرنامج");
  }

  touch();
  return { ok: true, message: "أُنشئ البرنامج مسودّةً. افتحه لرفع شعاره وإضافة حلقاته.", id: data.id };
}

export async function updateShow(id: string, input: ShowInput): Promise<Result> {
  const mgr = await getRadioManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const v = validate(input);
  if ("error" in v) return { ok: false, message: v.error };

  const { error } = await sb
    .from("radio_shows")
    .update({ ...showColumns(input, v.slug), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    if (isDup(error.message)) return { ok: false, message: "هذا المعرّف مستخدَم — اختر غيره." };
    return fail(error.message, "تعذّر الحفظ");
  }

  touch();
  return { ok: true, message: "حُفظت التغييرات.", id };
}

/** نشر/إلغاء/أرشفة — القاعدة تحرس الاكتمال، وهنا تُترجَم رسالتها. */
export async function setShowStatus(id: string, op: "publish" | "unpublish" | "archive"): Promise<Result> {
  const mgr = await getRadioManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (op === "publish") {
    const { data: cur } = await sb.from("radio_shows").select("published_at").eq("id", id).maybeSingle();
    patch.status = "published";
    if (!cur?.published_at) patch.published_at = new Date().toISOString();
  } else {
    patch.status = op === "archive" ? "archived" : "draft";
  }

  const { error } = await sb.from("radio_shows").update(patch).eq("id", id);
  if (error) return fail(error.message, "تعذّر تغيير الحالة");

  touch();
  return {
    ok: true,
    message: op === "publish" ? "نُشِر البرنامج." : op === "archive" ? "أُرشف البرنامج." : "أُلغي النشر — عاد مسودّةً.",
  };
}

export async function toggleShowFeatured(id: string, value: boolean): Promise<Result> {
  const mgr = await getRadioManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { error } = await sb.from("radio_shows").update({ is_featured: value, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return fail(error.message, "تعذّر التمييز");
  touch();
  return { ok: true, message: value ? "مُيّز في الواجهة." : "أُزيل التمييز." };
}

/**
 * حذف نهائيّ — الـcascade يحذف الحلقات والمنصّات، لكن **لا يمسّ ملفّات المخزن**؛
 * فتُمسح بادئة البرنامج كاملةً قبل الصفّ كي لا تتراكم أيتام (درس المكتبة).
 */
export async function deleteShow(id: string): Promise<Result> {
  const mgr = await getRadioManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { data: show } = await sb.from("radio_shows").select("title").eq("id", id).maybeSingle();
  await deletePrefix(showPrefix(id));

  const { error } = await sb.from("radio_shows").delete().eq("id", id);
  if (error) return fail(error.message, "تعذّر الحذف");

  touch();
  return { ok: true, message: `حُذف «${show?.title ?? "البرنامج"}» وحلقاته وملفّاته.` };
}

/* ══ الرفع — رابطٌ موقّع يرفع إليه المتصفّح مباشرةً ══════════════════ */

export type UploadTicket = { ok: boolean; url?: string; path?: string; message?: string };

export async function createLogoUploadUrl(showId: string, mime: string, size: number): Promise<UploadTicket> {
  const mgr = await getRadioManager();
  if (!mgr) return { ok: false, message: DENIED };
  if (!R2_READY) return { ok: false, message: R2_MISSING };

  const ext = IMAGE_EXT[mime];
  if (!ext) return { ok: false, message: "صيغة غير مدعومة — استخدم WEBP أو JPG أو PNG." };
  if (size > IMAGE_MAX_BYTES) return { ok: false, message: "الصورة أكبر من ٨ م.ب." };

  const path = showLogoKey(showId, ext);
  const url = await presignUpload(path);
  if (!url) return { ok: false, message: R2_MISSING };
  return { ok: true, url, path };
}

export async function createAudioUploadUrl(showId: string, episodeId: string, mime: string, size: number): Promise<UploadTicket> {
  const mgr = await getRadioManager();
  if (!mgr) return { ok: false, message: DENIED };
  if (!R2_READY) return { ok: false, message: R2_MISSING };

  const ext = AUDIO_EXT[mime];
  if (!ext) return { ok: false, message: "صيغة غير مدعومة — استخدم MP3 (أو M4A/AAC)." };
  if (size > AUDIO_MAX_BYTES) return { ok: false, message: "الملفّ أكبر من ١٥٠ م.ب — تأكّد أنّه MP3 مضغوط لا WAV." };

  const path = episodeAudioKey(showId, episodeId, ext);
  const url = await presignUpload(path);
  if (!url) return { ok: false, message: R2_MISSING };
  return { ok: true, url, path };
}

/** يُثبت الشعار بعد نجاح الرفع (والقديم يُمسح إن اختلف امتداده). */
export async function setShowLogo(showId: string, path: string): Promise<Result> {
  const mgr = await getRadioManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { data: cur } = await sb.from("radio_shows").select("logo_path").eq("id", showId).maybeSingle();
  const { error } = await sb.from("radio_shows").update({ logo_path: path, updated_at: new Date().toISOString() }).eq("id", showId);
  if (error) return fail(error.message, "تعذّر حفظ الشعار");
  if (cur?.logo_path && cur.logo_path !== path) await deleteObject(cur.logo_path);

  touch();
  return { ok: true, message: "رُفع الشعار." };
}

/**
 * يُثبت الصوت ومعه **المدّة والحجم مقروءتين من الملفّ نفسه** في المتصفّح —
 * فلا يُدخلهما إنسانٌ بيده، وهما ما تحمله الخلاصة إلى المنصّات.
 */
export async function setEpisodeAudio(
  episodeId: string, path: string, bytes: number, durationSeconds: number, mime: string,
): Promise<Result> {
  const mgr = await getRadioManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };
  if (!(bytes > 0) || !(durationSeconds > 0)) return { ok: false, message: "تعذّرت قراءة مدّة الملفّ أو حجمه — أعِد الرفع." };

  const { data: cur } = await sb.from("radio_episodes").select("audio_path").eq("id", episodeId).maybeSingle();
  const { error } = await sb
    .from("radio_episodes")
    .update({
      audio_path: path, audio_bytes: bytes, duration_seconds: Math.round(durationSeconds),
      audio_mime: mime, updated_at: new Date().toISOString(),
    })
    .eq("id", episodeId);
  if (error) return fail(error.message, "تعذّر حفظ الصوت");
  if (cur?.audio_path && cur.audio_path !== path) await deleteObject(cur.audio_path);

  touch();
  return { ok: true, message: "رُفع الصوت وقُرئت مدّته." };
}

/* ══ الحلقة ══════════════════════════════════════════════════════════ */

export type EpisodeInput = {
  showId: string;
  season: number;
  number: number;
  title: string;
  slug: string;
  summary?: string | null;
  notes?: string | null;
  transcript?: string | null;
  hostId?: string | null;
};

function validateEpisode(input: EpisodeInput): { error: string } | { slug: string } {
  if (!clean(input.title)) return { error: "عنوان الحلقة مطلوب." };
  if (!Number.isInteger(input.season) || input.season < 1) return { error: "رقم الموسم يبدأ من ١." };
  if (!Number.isInteger(input.number) || input.number < 1) return { error: "رقم الحلقة يبدأ من ١." };
  const slug = slugify(input.slug ?? "");
  if (!slug) return { error: "معرّف الحلقة مطلوب — أحرف لاتينيّة وأرقام." };
  return { slug };
}

export async function createEpisode(input: EpisodeInput): Promise<Result> {
  const mgr = await getRadioManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const v = validateEpisode(input);
  if ("error" in v) return { ok: false, message: v.error };

  // المقدّم يُختم من البرنامج ما لم يُصرّح بغيره — واقعةٌ تُحفظ لا تُشتقّ لاحقًا.
  let hostId = input.hostId ?? null;
  if (!hostId) {
    const { data: show } = await sb.from("radio_shows").select("host_member_id").eq("id", input.showId).maybeSingle();
    hostId = show?.host_member_id ?? null;
  }
  if (!hostId) return { ok: false, message: "تعذّر تحديد مقدّم الحلقة." };

  const { data, error } = await sb
    .from("radio_episodes")
    .insert({
      show_id: input.showId, season: input.season, number: input.number,
      title: clean(input.title), slug: v.slug, summary: clean(input.summary),
      notes: clean(input.notes), transcript: clean(input.transcript),
      host_member_id: hostId, status: "draft", created_by: mgr.userId,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error && isDup(error.message)) return { ok: false, message: guardMessage(error.message) ?? "رقم الحلقة أو معرّفها مستخدَم في هذا البرنامج." };
    return fail(error?.message ?? "بلا تفاصيل", "تعذّر إنشاء الحلقة");
  }

  touch();
  return { ok: true, message: "أُنشئت الحلقة مسودّةً. ارفع صوتها ثمّ انشرها.", id: data.id };
}

export async function updateEpisode(id: string, input: EpisodeInput): Promise<Result> {
  const mgr = await getRadioManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const v = validateEpisode(input);
  if ("error" in v) return { ok: false, message: v.error };

  const patch: Record<string, unknown> = {
    season: input.season, number: input.number,
    title: clean(input.title), slug: v.slug, summary: clean(input.summary),
    notes: clean(input.notes), transcript: clean(input.transcript),
    updated_at: new Date().toISOString(),
  };
  if (input.hostId) patch.host_member_id = input.hostId;

  const { error } = await sb.from("radio_episodes").update(patch).eq("id", id);
  if (error) {
    if (isDup(error.message)) return { ok: false, message: guardMessage(error.message) ?? "رقم الحلقة أو معرّفها مستخدَم في هذا البرنامج." };
    return fail(error.message, "تعذّر الحفظ");
  }

  touch();
  return { ok: true, message: "حُفظت التغييرات.", id };
}

/**
 * حالة الحلقة. والأرشفة **لا حذف**: الحلقة المنشورة موجودةٌ في مكتبات المشتركين،
 * وحذفها من الخلاصة يمحوها عندهم — فالأرشفة تُخفيها من الموقع وتُبقيها في الخلاصة.
 */
export async function setEpisodeStatus(
  id: string, op: "publish" | "unpublish" | "schedule" | "archive", publishAt?: string | null,
): Promise<Result> {
  const mgr = await getRadioManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (op === "publish") {
    const { data: cur } = await sb.from("radio_episodes").select("published_at").eq("id", id).maybeSingle();
    patch.status = "published";
    patch.publish_at = null;
    if (!cur?.published_at) patch.published_at = new Date().toISOString();
  } else if (op === "schedule") {
    if (!publishAt) return { ok: false, message: "اختر تاريخ النشر." };
    if (new Date(publishAt).getTime() <= Date.now()) return { ok: false, message: "تاريخ الجدولة يجب أن يكون في المستقبل." };
    patch.status = "scheduled";
    patch.publish_at = publishAt;
  } else {
    patch.status = op === "archive" ? "archived" : "draft";
    if (op === "unpublish") patch.publish_at = null;
  }

  const { error } = await sb.from("radio_episodes").update(patch).eq("id", id);
  if (error) return fail(error.message, "تعذّر تغيير الحالة");

  touch();
  const said = { publish: "نُشرت الحلقة.", unpublish: "أُلغي النشر — عادت مسودّةً.", schedule: "جُدولت الحلقة.", archive: "أُرشفت الحلقة." };
  return { ok: true, message: said[op] };
}

export async function deleteEpisode(id: string): Promise<Result> {
  const mgr = await getRadioManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { data: ep } = await sb.from("radio_episodes").select("show_id, title, status").eq("id", id).maybeSingle();
  if (ep?.status === "published") {
    return { ok: false, message: "لا تُحذف حلقةٌ منشورة — أرشِفها أوّلًا (حذفها يمحوها من مكتبات المشتركين)." };
  }

  const { error } = await sb.from("radio_episodes").delete().eq("id", id);
  if (error) return fail(error.message, "تعذّر الحذف");
  if (ep?.show_id) await deletePrefix(episodePrefix(ep.show_id, id));

  touch();
  return { ok: true, message: `حُذفت «${ep?.title ?? "الحلقة"}».` };
}

/** حلقةٌ كاملة لنموذج التحرير — تُجلب عند الفتح وحده، فالمحاور والتفريغ نصوصٌ قد تطول. */
export async function loadEpisode(id: string): Promise<{
  ok: boolean;
  message?: string;
  episode?: {
    season: number; number: number; title: string; slug: string;
    summary: string | null; notes: string | null; transcript: string | null; hostId: string;
  };
}> {
  const mgr = await getRadioManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { data, error } = await sb
    .from("radio_episodes")
    .select("season, number, title, slug, summary, notes, transcript, host_member_id")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "لم تُوجد الحلقة." };

  return {
    ok: true,
    episode: {
      season: data.season, number: data.number, title: data.title, slug: data.slug,
      summary: data.summary ?? null, notes: data.notes ?? null,
      transcript: data.transcript ?? null, hostId: data.host_member_id,
    },
  };
}

/* ══ منصّات البرنامج ═════════════════════════════════════════════════ */

export async function saveShowPlatforms(
  showId: string, links: { platform: Platform; url: string }[],
): Promise<Result> {
  const mgr = await getRadioManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const rows = links
    .filter((l) => PLATFORM_VALUES.includes(l.platform) && clean(l.url))
    .map((l, i) => ({ show_id: showId, platform: l.platform, url: clean(l.url)!, order: i }));

  // استبدالٌ ذرّيّ: الحذف ثمّ الإدراج — فلا يبقى رابطٌ أزاله المحرّر.
  const { error: delErr } = await sb.from("radio_show_platforms").delete().eq("show_id", showId);
  if (delErr) return fail(delErr.message, "تعذّر حفظ المنصّات");
  if (rows.length) {
    const { error } = await sb.from("radio_show_platforms").insert(rows);
    if (error) return fail(error.message, "تعذّر حفظ المنصّات");
  }

  touch();
  return { ok: true, message: "حُفظت روابط المنصّات." };
}
