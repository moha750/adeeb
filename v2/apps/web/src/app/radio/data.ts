/**
 * قراءات الإذاعة العامّة — بمفتاح anon، فـRLS هو الحارس لا شرطٌ نكتبه:
 * الزائر لا يرى إلّا برنامجًا منشورًا وحلقةً منشورةً حلّ موعدُها.
 *
 * ولا مغذّي RSS ولا رابطَ تتبّع: وجهةُ الإذاعة يوتيوب، وموقعُنا تجربةٌ صوتيّة.
 * فالصوتُ يُبَثّ من العنوان العامّ للدلو مباشرةً.
 */
import "server-only";
import { createAdeebServerClient } from "@adeeb/core";
import { fmtDate } from "@/lib/date";
import { publicUrl } from "@/lib/radio/r2";
import type { Platform, ShowTone } from "../dashboard/radio/vocab";
import type { Track } from "./_player/PlayerProvider";

const anon = () =>
  createAdeebServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

/* ══ المحطّة ═════════════════════════════════════════════════════════ */

export type PublicStation = {
  name: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
};

export async function getPublicStation(): Promise<PublicStation> {
  const { data } = await anon()
    .from("radio_station")
    .select("name, tagline, description, logo_path")
    .eq("id", 1)
    .maybeSingle();
  return {
    name: data?.name ?? "إذاعة أدِيب",
    tagline: data?.tagline ?? null,
    description: data?.description ?? null,
    logoUrl: publicUrl(data?.logo_path),
  };
}

/* ══ البرامج ═════════════════════════════════════════════════════════ */

export type PublicShow = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  tone: ShowTone;
  /** ثانيةُ بدء الحديث في هذا البرنامج — ترثها حلقاتُه. */
  talkStartsAt: number;
  hostName: string | null;
  isFeatured: boolean;
  episodeCount: number;
};

const SHOW_COLS = "id, slug, title, tagline, description, logo_path, tone, talk_starts_at, is_featured, host_member_id";

type ShowRaw = {
  id: string; slug: string; title: string; tagline: string | null; description: string | null;
  logo_path: string | null; tone: ShowTone; talk_starts_at: number; is_featured: boolean; host_member_id: string;
};

/** أسماءُ المقدّمين دفعةً واحدة — لا استعلامَ لكلّ صفّ. */
async function hostNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data } = await anon().from("profiles").select("id, full_name").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id, p.full_name as string]));
}

export async function getPublicShows(): Promise<PublicShow[]> {
  const sb = anon();
  const [{ data, error }, { data: eps }] = await Promise.all([
    sb.from("radio_shows").select(SHOW_COLS)
      .order("is_featured", { ascending: false })
      .order("order", { ascending: true })
      .returns<ShowRaw[]>(),
    sb.from("radio_episodes").select("show_id"),
  ]);
  if (error || !data) return [];

  const counts = new Map<string, number>();
  for (const e of eps ?? []) counts.set(e.show_id, (counts.get(e.show_id) ?? 0) + 1);
  const names = await hostNames(data.map((s) => s.host_member_id));

  return data.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    tagline: s.tagline ?? null,
    description: s.description ?? null,
    logoUrl: publicUrl(s.logo_path),
    tone: s.tone,
    talkStartsAt: Number(s.talk_starts_at),
    hostName: names.get(s.host_member_id) ?? null,
    isFeatured: s.is_featured,
    episodeCount: counts.get(s.id) ?? 0,
  }));
}

/* ══ الحلقات ═════════════════════════════════════════════════════════ */

export type PublicEpisode = {
  id: string;
  slug: string;
  number: number;
  title: string;
  summary: string | null;
  notes: string | null;
  transcript: string | null;
  hostName: string | null;
  /**
   * روابطُ البثّ. والحلقةُ تُسمَع بأحد بابين:
   *   المساران (`plainUrl` + `stemUrl`) فيظهر المقبض، وهو ما تُرفَع به الحلقاتُ اليوم.
   *   المكسُ وحدَه (`musicUrl`) في الحلقات القديمة، ومعه مبدّلٌ لا مقبض.
   */
  musicUrl: string | null;
  plainUrl: string | null;
  stemUrl: string | null;
  musicSeconds: number | null;
  plainSeconds: number | null;
  /**
   * موجتان تُعرضان: موجةُ ما يُسمَع بالموسيقى (`musicPeaks`) وموجةُ الصوت وحدَه.
   * ولكلٍّ موجتُها لأنّ المقدّمة موسيقى خالصة، فموجةٌ واحدةٌ لهما تكذب على العين.
   */
  musicPeaks: number[] | null;
  plainPeaks: number[] | null;
  /**
   * ثانيةُ بدء الحديث **بعد** الوراثة. المساران تايم لاينٌ واحد فلا يحتاجها الجمع،
   * وإنّما يستعملها المشغّل لشيءٍ واحد: ألّا يجلس المستمعُ في صمتٍ إن أطفأ الموسيقى
   * والمقدّمةُ لم تنتهِ.
   */
  talkStartsAt: number;
  youtubeUrl: string | null;
  publishedAt: string | null;
  dateLabel: string;
  likes: number;
  plays: number;
};

const EP_COLS =
  "id, slug, number, title, summary, notes, transcript, host_member_id, audio_music_path, audio_music_seconds, audio_plain_path, audio_plain_seconds, audio_stem_path, audio_music_peaks, audio_plain_peaks, talk_starts_at, youtube_url, published_at, likes, plays";

type EpRaw = {
  id: string; slug: string; number: number; title: string;
  summary: string | null; notes: string | null; transcript: string | null;
  host_member_id: string;
  audio_music_path: string | null; audio_music_seconds: number | null;
  audio_plain_path: string | null; audio_plain_seconds: number | null;
  audio_stem_path: string | null;
  audio_music_peaks: number[] | null; audio_plain_peaks: number[] | null;
  talk_starts_at: number | null; youtube_url: string | null; published_at: string | null;
  likes: number | null; plays: number | null;
};

const mapEpisode = (e: EpRaw, showTalkStart: number, hostName: string | null): PublicEpisode => ({
  id: e.id,
  slug: e.slug,
  number: e.number,
  title: e.title,
  summary: e.summary ?? null,
  notes: e.notes ?? null,
  transcript: e.transcript ?? null,
  hostName,
  musicUrl: publicUrl(e.audio_music_path),
  plainUrl: publicUrl(e.audio_plain_path),
  stemUrl: publicUrl(e.audio_stem_path),
  musicSeconds: e.audio_music_seconds ?? null,
  plainSeconds: e.audio_plain_seconds ?? null,
  musicPeaks: e.audio_music_peaks?.length ? e.audio_music_peaks : null,
  plainPeaks: e.audio_plain_peaks?.length ? e.audio_plain_peaks : null,
  talkStartsAt: e.talk_starts_at === null ? showTalkStart : Number(e.talk_starts_at),
  youtubeUrl: e.youtube_url ?? null,
  publishedAt: e.published_at ?? null,
  dateLabel: fmtDate(e.published_at),
  likes: e.likes ?? 0,
  plays: e.plays ?? 0,
});

/** برنامجٌ منشورٌ بمعرّفه، ومعه حلقاتُه المنشورة والأحدثُ أوّلًا. */
export async function getPublicShowPage(slug: string): Promise<{
  show: PublicShow; episodes: PublicEpisode[]; platforms: { platform: Platform; url: string }[];
} | null> {
  const sb = anon();
  const { data: raw } = await sb.from("radio_shows").select(SHOW_COLS).eq("slug", slug).maybeSingle<ShowRaw>();
  if (!raw) return null;

  const [{ data: eps }, { data: plats }, station, names] = await Promise.all([
    sb.from("radio_episodes").select(EP_COLS).eq("show_id", raw.id)
      .order("number", { ascending: false }).returns<EpRaw[]>(),
    sb.from("radio_show_platforms").select("platform, url").eq("show_id", raw.id).order("order", { ascending: true }),
    getPublicStation(),
    hostNames([raw.host_member_id]),
  ]);

  const epHosts = await hostNames((eps ?? []).map((e) => e.host_member_id));
  const show: PublicShow = {
    id: raw.id, slug: raw.slug, title: raw.title, tagline: raw.tagline ?? null,
    description: raw.description ?? null, logoUrl: publicUrl(raw.logo_path), tone: raw.tone,
    talkStartsAt: Number(raw.talk_starts_at),
    hostName: names.get(raw.host_member_id) ?? null, isFeatured: raw.is_featured,
    episodeCount: (eps ?? []).length,
  };

  return {
    show,
    episodes: (eps ?? []).map((e) => mapEpisode(e, show.talkStartsAt, epHosts.get(e.host_member_id) ?? null)),
    platforms: (plats ?? []).map((p) => ({ platform: p.platform as Platform, url: p.url as string })),
  };
}

/** حلقةٌ منشورةٌ واحدة في برنامجٍ منشور. `null` إن غاب أحدُهما، فيستدعي المستدعي `notFound`. */
export async function getPublicEpisode(showSlug: string, episodeSlug: string): Promise<{
  show: PublicShow; episode: PublicEpisode; siblings: PublicEpisode[];
} | null> {
  const page = await getPublicShowPage(showSlug);
  if (!page) return null;
  const episode = page.episodes.find((e) => e.slug === episodeSlug);
  if (!episode || !isPlayable(episode)) return null;
  return { show: page.show, episode, siblings: page.episodes.filter((e) => e.id !== episode.id) };
}

/**
 * أفيها ما يُسمَع؟ بابان: المساران معًا، أو المكسُ القديم وحدَه.
 * وهو الحدُّ نفسُه الذي يحرسه `radio_episodes_publish_guard` في القاعدة.
 */
export const isPlayable = (e: PublicEpisode): boolean =>
  Boolean(e.musicUrl) || Boolean(e.plainUrl && e.stemUrl);

/**
 * صفُّ الحلقة كما يقرؤه المشغّل — **مصدرٌ واحد لثلاث صفحات**: الهبوط وصفحةُ
 * البرنامج وصفحةُ الحلقة. وكانت الثلاثُ تبنيه بأيديها، فأيُّ حقلٍ يُضاف يُنسى
 * في واحدة (وقع فعلًا يوم أُضيف مسارُ الموسيقى).
 *
 * والمدّةُ من المكس إن وُجد وإلّا من مسار الصوت: الحلقةُ بالمسارين لا مكسَ لها.
 */
export function toTrack(
  e: PublicEpisode,
  show: { title: string; slug: string; logoUrl: string | null; tone: ShowTone },
): Track {
  return {
    id: e.id,
    title: e.title,
    showTitle: show.title,
    showSlug: show.slug,
    episodeSlug: e.slug,
    musicUrl: e.musicUrl,
    plainUrl: e.plainUrl,
    stemUrl: e.stemUrl,
    talkStartsAt: e.talkStartsAt,
    coverUrl: show.logoUrl,
    seconds: e.musicSeconds ?? e.plainSeconds,
    musicPeaks: e.musicPeaks,
    plainPeaks: e.plainPeaks,
    tone: show.tone,
  };
}

/**
 * أحدثُ الحلقات عبر البرامج كلِّها — صدرُ المحطّة يقول «ما الجديد» لا «ما البرامج».
 * ويُحمَل معها اسمُ برنامجها ومعرّفُه، فالصفُّ يُشغَّل ويُحيل بلا استعلامٍ ثانٍ.
 */
export async function getLatestEpisodes(limit = 6): Promise<
  { episode: PublicEpisode; showTitle: string; showSlug: string; showLogoUrl: string | null; showTone: ShowTone }[]
> {
  const sb = anon();
  const [{ data: eps }, { data: shows }] = await Promise.all([
    sb.from("radio_episodes").select(EP_COLS)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit).returns<(EpRaw & { show_id?: string })[]>(),
    // بدءُ الحديث يُجلب مع البرنامج: هو مصدرُ الوراثة لا المحطّة.
    sb.from("radio_shows").select("id, title, slug, logo_path, tone, talk_starts_at"),
  ]);
  if (!eps?.length || !shows?.length) return [];

  // الحلقةُ لا تحمل معرّف برنامجها في `EP_COLS`، فيُجلب هنا دفعةً واحدة.
  const { data: links } = await sb.from("radio_episodes").select("id, show_id").in("id", eps.map((e) => e.id));
  const showIdOf = new Map((links ?? []).map((l) => [l.id, l.show_id as string]));
  const showById = new Map(shows.map((s) => [s.id as string, s]));
  const names = await hostNames(eps.map((e) => e.host_member_id));

  return eps.flatMap((e) => {
    const show = showById.get(showIdOf.get(e.id) ?? "");
    if (!show) return [];
    return [{
      episode: mapEpisode(e, Number(show.talk_starts_at), names.get(e.host_member_id) ?? null),
      showTitle: show.title as string,
      showSlug: show.slug as string,
      showLogoUrl: publicUrl(show.logo_path as string | null),
      showTone: show.tone as ShowTone,
    }];
  });
}
