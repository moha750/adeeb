"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { getGamesManager, gamesService } from "@/lib/games/authz";
import { UPLOAD_RULES, limitText } from "@/lib/upload";
import { GAME_TONES, LIMITS, type GameDraft, type GameDraftErrors } from "./vocab";

/**
 * **أفعالُ غرفة الألعاب** — تفحص القدرةَ من الجلسة (`manage_games`) ثمّ تكتب بمفتاح الخدمة: الجدولان
 * بلا سياسة كتابةٍ للمتصفّح (الترحيل `games_01_hall`). وتعيد كلُّها نتيجةً لا استثناءً، برسائل عربيّة.
 */

export type GameResult = { ok: boolean; message: string; errors?: GameDraftErrors };

const NO_PERM = "لا تملك صلاحية إدارة الألعاب.";
const NO_KEY = "إعداد الخادم ناقص (مفتاح الخدمة).";
const BUCKET = "games";

/** يقلّم المسافات ومحارفَ الاتّجاه الخفيّة اللاصقة من اللصق العربيّ. */
const clean = (v: string | null | undefined): string => (v ?? "").replace(/[‎‏‪-‮]/g, "").trim();

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/**
 * مسارٌ داخل الموقع: يبدأ بشرطةٍ واحدة، بلا مسافةٍ ولا شرطةٍ مائلةٍ عكسيّة. والعكسيّةُ ممنوعةٌ لأنّ
 * المتصفّحَ يقرؤها شرطة، فـ`/\evil.com` يصير `//evil.com` ويُخرج زائرَ الصالة من الموقع (مراجعة ٢٠٢٦-١٠-١٧).
 */
const PATH_RE = /^\/(?![/\\])[^\s\\]*$/;

function revalidateGames(slug?: string) {
  revalidatePath("/games");
  revalidatePath("/dashboard/games");
  if (slug) revalidatePath(`/dashboard/games/${slug}`);
}

/** بادئةُ الملفّات العامّة في دلو الألعاب: ما سواها وسوى ملفّات الموقع الثابتة (`/games/…`) لا يُقبل مقطعًا. */
function bucketPrefix(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/`;
}
const isOurMedia = (u: string, slug: string) => u.startsWith("/games/") || u.startsWith(`${bucketPrefix()}${slug}/`);
const bucketPathOf = (u: string | null): string | null => (u && u.startsWith(bucketPrefix()) ? u.slice(bucketPrefix().length) : null);

/** نفسُ قيود القاعدة برسائل عربيّة: العميلُ يفحص للتجربة، وهذا الفحصُ هو الحَكَم. */
function validate(slug: string, d: GameDraft): GameDraftErrors {
  const e: GameDraftErrors = {};
  const name = clean(d.name);
  const line = clean(d.line);
  if (name.length < LIMITS.name.min || name.length > LIMITS.name.max) {
    e.name = `الاسمُ من ${LIMITS.name.min} إلى ${LIMITS.name.max} حرفًا.`;
  }
  if (line.length < LIMITS.line.min || line.length > LIMITS.line.max) {
    e.line = `السطرُ من ${LIMITS.line.min} إلى ${LIMITS.line.max} حرفًا.`;
  }
  if (!(GAME_TONES as readonly string[]).includes(d.tone)) e.tone = "اختر نغمةً من القائمة.";
  const play = clean(d.playPath);
  if (!PATH_RE.test(play) || play.length > 120) e.playPath = "رابطٌ داخل الموقع يبدأ بشرطة، مثل /games/darbak-khadar/play";
  const board = clean(d.boardPath);
  if (board && (!PATH_RE.test(board) || board.length > 120)) e.boardPath = "رابطٌ داخل الموقع يبدأ بشرطة، أو اتركه فارغًا.";
  const v = d.attractVideo, p = d.attractPoster;
  if (!!v !== !!p || (v && p && (!isOurMedia(v, slug) || !isOurMedia(p, slug)))) {
    e.attractVideo = "ارفع المقطعَ من هنا من جديد.";
  }
  return e;
}

const columns = (d: GameDraft) => ({
  name: clean(d.name),
  line: clean(d.line),
  tone: d.tone,
  play_path: clean(d.playPath),
  board_path: clean(d.boardPath) || null,
  attract_video: d.attractVideo,
  attract_poster: d.attractPoster,
});

type Sb = NonNullable<ReturnType<typeof gamesService>>;

/** يمحو من الدلو ما لم يعد صفُّ اللعبة يشير إليه (مقطعٌ استُبدل أو أُزيل). */
async function dropReplaced(sb: Sb, before: (string | null)[], after: (string | null)[]) {
  const keep = new Set(after.map(bucketPathOf).filter(Boolean));
  const gone = before.map(bucketPathOf).filter((p): p is string => !!p && !keep.has(p));
  if (gone.length) await sb.storage.from(BUCKET).remove(gone);
}

export async function updateGame(slug: string, draft: GameDraft): Promise<GameResult> {
  const mgr = await getGamesManager();
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = gamesService();
  if (!sb) return { ok: false, message: NO_KEY };

  const errors = validate(slug, draft);
  if (Object.keys(errors).length) return { ok: false, message: "راجع الحقول المعلَّمة.", errors };

  const { data: before } = await sb.from("games").select("attract_video, attract_poster").eq("slug", slug).maybeSingle();
  if (!before) return { ok: false, message: "اللعبةُ غير موجودة." };

  const { error } = await sb.from("games").update({ ...columns(draft), updated_by: mgr.userId }).eq("slug", slug);
  if (error) return { ok: false, message: `تعذّر الحفظ: ${error.message}` };
  await dropReplaced(sb, [before.attract_video, before.attract_poster], [draft.attractVideo, draft.attractPoster]);
  revalidateGames(slug);
  return { ok: true, message: "حُفظت بياناتُ اللعبة." };
}

export async function setGameInHall(slug: string, inHall: boolean): Promise<GameResult> {
  const mgr = await getGamesManager();
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = gamesService();
  if (!sb) return { ok: false, message: NO_KEY };
  const { error } = await sb.from("games").update({ in_hall: inHall, updated_by: mgr.userId }).eq("slug", slug);
  if (error) return { ok: false, message: `تعذّر الحفظ: ${error.message}` };
  revalidateGames(slug);
  return { ok: true, message: inHall ? "دخلت اللعبةُ الصالة." : "خرجت اللعبةُ من الصالة." };
}

/**
 * **تقديمُ لعبةٍ أو تأخيرُها في الصالة** — تتبادل موضعَها مع أقرب لعبةٍ ظاهرةٍ في الاتّجاه نفسه، فالمخفيّةُ
 * لا تُحسب (لا موضعَ لها في الصالة). ثمّ يُعاد الترقيمُ كلُّه بلا ثغرات.
 */
export async function moveGame(slug: string, dir: -1 | 1): Promise<GameResult> {
  const mgr = await getGamesManager();
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = gamesService();
  if (!sb) return { ok: false, message: NO_KEY };
  if (dir !== -1 && dir !== 1) return { ok: false, message: "اتّجاهٌ غير معروف." };
  const { data, error: readErr } = await sb.from("games").select("slug, sort_order, in_hall").order("sort_order").order("name");
  if (readErr) return { ok: false, message: `تعذّر الحفظ: ${readErr.message}` };
  const rows = (data ?? []) as { slug: string; sort_order: number; in_hall: boolean }[];
  const i = rows.findIndex((r) => r.slug === slug);
  if (i < 0) return { ok: false, message: "اللعبةُ غير موجودة." };
  let j = i + dir;
  while (j >= 0 && j < rows.length && !rows[j].in_hall) j += dir;
  if (j < 0 || j >= rows.length) return { ok: true, message: "هي في طرف الصالة." };
  [rows[i], rows[j]] = [rows[j], rows[i]];
  const writes = await Promise.all(
    rows.map((r, k) => (r.sort_order === k ? null : sb.from("games").update({ sort_order: k, updated_by: mgr.userId }).eq("slug", r.slug))),
  );
  const failed = writes.find((w) => w?.error);
  if (failed?.error) return { ok: false, message: `تعذّر الحفظ: ${failed.error.message}` };
  revalidateGames(slug);
  return { ok: true, message: "تغيّر ترتيبُ الصالة." };
}

/* ══ مقطعُ الشاشة: تذكرتا رفعٍ موقَّعتان، والمتصفّحُ يرفع إلى الدلو مباشرةً ══ */

export type MediaTicket =
  | { ok: true; video: { path: string; token: string; url: string }; poster: { path: string; token: string; url: string } }
  | { ok: false; message: string };

const VIDEO_EXT: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };
const POSTER_EXT: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg" };
const POSTER_MAX = 2 * 1024 * 1024;

export async function prepareGameMedia(
  slug: string, videoMime: string, videoSize: number, posterMime: string, posterSize: number,
): Promise<MediaTicket> {
  const mgr = await getGamesManager();
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = gamesService();
  if (!sb) return { ok: false, message: NO_KEY };
  if (!SLUG_RE.test(slug)) return { ok: false, message: "اكتب معرّفَ اللعبة أوّلًا." };

  const rule = UPLOAD_RULES.gameVideo;
  const ext = VIDEO_EXT[videoMime];
  if (!ext) return { ok: false, message: `الصيغةُ غيرُ مقبولة. المقبول: ${rule.formats}.` };
  if (videoSize > rule.maxBytes) return { ok: false, message: `المقطعُ أكبر من الحدّ (${limitText(rule)}).` };
  const pExt = POSTER_EXT[posterMime];
  if (!pExt || posterSize > POSTER_MAX) return { ok: false, message: "تعذّر اقتطاعُ صورةٍ خفيفةٍ من المقطع." };

  const id = randomUUID();
  const vPath = `${slug}/${id}.${ext}`;
  const pPath = `${slug}/${id}.${pExt}`;
  const [v, p] = await Promise.all([
    sb.storage.from(BUCKET).createSignedUploadUrl(vPath),
    sb.storage.from(BUCKET).createSignedUploadUrl(pPath),
  ]);
  if (v.error || !v.data || p.error || !p.data) {
    return { ok: false, message: `تعذّر تجهيز الرفع: ${v.error?.message ?? p.error?.message ?? "بلا تفاصيل"}` };
  }
  const url = (path: string) => sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return {
    ok: true,
    video: { path: v.data.path, token: v.data.token, url: url(v.data.path) },
    poster: { path: p.data.path, token: p.data.token, url: url(p.data.path) },
  };
}

/* ══ المسابقات ══ */

export type ContestInput = {
  id?: string;
  slug: string;
  title: string;
  note: string;
  startsAt: string | null;
  endsAt: string | null;
  /** مقياسُها: واحدٌ ممّا تعلنه اللعبةُ في `game_metrics`. */
  metric: string;
  /** حفظٌ رغم التداخل، بعد أن رآه المحرّر وأكّد. */
  force?: boolean;
};
export type ContestResult = {
  ok: boolean;
  message: string;
  errors?: Partial<Record<"title" | "note" | "startsAt" | "endsAt" | "metric", string>>;
  /** مسابقةٌ أخرى يتداخل موعدُها، والشريطُ يعلن واحدةً في كلّ مرّة. */
  overlap?: string;
};

export async function saveContest(input: ContestInput): Promise<ContestResult> {
  const mgr = await getGamesManager();
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = gamesService();
  if (!sb) return { ok: false, message: NO_KEY };

  const title = clean(input.title);
  const note = clean(input.note);
  const errors: ContestResult["errors"] = {};
  if (title.length < LIMITS.title.min || title.length > LIMITS.title.max) errors.title = `العنوانُ من ${LIMITS.title.min} إلى ${LIMITS.title.max} حرفًا.`;
  if (note.length < LIMITS.note.min || note.length > LIMITS.note.max) errors.note = `الجوائزُ من ${LIMITS.note.min} إلى ${LIMITS.note.max} حرفًا.`;
  const s = input.startsAt ? Date.parse(input.startsAt) : NaN;
  const e = input.endsAt ? Date.parse(input.endsAt) : NaN;
  if (Number.isNaN(s)) errors.startsAt = "حدّد موعدَ البداية.";
  if (Number.isNaN(e)) errors.endsAt = "حدّد موعدَ النهاية.";
  else if (!Number.isNaN(s) && e <= s) errors.endsAt = "النهايةُ بعد البداية.";
  if (Object.keys(errors).length) return { ok: false, message: "راجع الحقول المعلَّمة.", errors };

  const startsAt = new Date(s).toISOString();
  const endsAt = new Date(e).toISOString();

  const { data: game } = await sb.from("games").select("in_hall").eq("slug", input.slug).maybeSingle();
  if (!game) return { ok: false, message: "اللعبةُ غير موجودة." };

  // المسابقةُ على ما تقيسه اللعبة وحدَه: مقياسٌ ليس لها لا تُحسب صدارتُه (`game_contest_board`).
  const { data: m } = await sb
    .from("game_metrics").select("metric").eq("game_slug", input.slug).eq("metric", input.metric ?? "").maybeSingle();
  if (!m) return { ok: false, message: "اختر على ماذا يتنافسون.", errors: { metric: "اختر من القائمة." } };

  // ومسابقةُ أكواب oos (بلا مقياس) ذكرى لا تُعدَّل: حكمُها كان `darb_contest` ومنطقُ الأكواب.
  if (input.id) {
    const { data: old } = await sb.from("game_events").select("metric").eq("id", input.id).maybeSingle();
    if (old && old.metric === null) return { ok: false, message: "هذه مسابقةٌ قديمةٌ محفوظةٌ ذكرى، فلا تُعدَّل." };
  }

  // الشريطُ يعلن مسابقةً واحدةً من ألعاب الصالة وحدَها، فالتداخلُ لا يُحسب إلّا بين ألعابها.
  if (!input.force && game.in_hall) {
    let q = sb
      .from("game_events")
      .select("id, title, games!inner(in_hall)")
      .eq("games.in_hall", true)
      .lt("starts_at", endsAt)
      .gt("ends_at", startsAt)
      .limit(1);
    if (input.id) q = q.neq("id", input.id);
    const { data: clash } = await q;
    if (clash && clash.length) return { ok: false, message: "يتداخل الموعد.", overlap: (clash[0] as { title: string }).title };
  }

  const row = { title, note, starts_at: startsAt, ends_at: endsAt, metric: input.metric, updated_by: mgr.userId };
  const { data: written, error } = input.id
    ? await sb.from("game_events").update(row).eq("id", input.id).eq("game_slug", input.slug).select("id")
    : await sb.from("game_events").insert({ ...row, game_slug: input.slug, created_by: mgr.userId }).select("id");
  if (error) return { ok: false, message: `تعذّر الحفظ: ${error.message}` };
  if (!written?.length) return { ok: false, message: "المسابقةُ غير موجودة. حدّث الصفحة." };
  revalidateGames(input.slug);
  return { ok: true, message: input.id ? "حُفظت المسابقة." : "أُضيفت المسابقة." };
}

export async function deleteContest(id: string, slug: string): Promise<ContestResult> {
  const mgr = await getGamesManager();
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = gamesService();
  if (!sb) return { ok: false, message: NO_KEY };
  const { error } = await sb.from("game_events").delete().eq("id", id).eq("game_slug", slug);
  if (error) return { ok: false, message: `تعذّر الحذف: ${error.message}` };
  revalidateGames(slug);
  return { ok: true, message: "حُذفت المسابقة." };
}

/**
 * **محوُ مقطعٍ رُفع ولم يُحفظ** — يُرفع المقطعُ ساعةَ يُختار، فمن استبدله أو أزاله أو أغلق النافذةَ قبل
 * الحفظ ترك ملفّين علنيّين بلا صاحب. فيمحوهما الزرُّ نفسُه، **إلّا ما يشير إليه صفُّ اللعبة المحفوظ**،
 * ولا يمسّ إلّا ملفّاتِ هذه اللعبة في الدلو.
 */
export async function discardGameMedia(slug: string, urls: string[]): Promise<void> {
  const mgr = await getGamesManager();
  if (!mgr) return;
  const sb = gamesService();
  if (!sb || !SLUG_RE.test(slug)) return;
  const { data: row } = await sb.from("games").select("attract_video, attract_poster").eq("slug", slug).maybeSingle();
  const keep = new Set([row?.attract_video, row?.attract_poster].map((u) => bucketPathOf(u ?? null)).filter(Boolean));
  const gone = urls
    .map((u) => bucketPathOf(u))
    .filter((p): p is string => !!p && p.startsWith(`${slug}/`) && !keep.has(p));
  if (gone.length) await sb.storage.from(BUCKET).remove(gone);
}
