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

const anon = () =>
  createAdeebServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

/* ══ المحطّة ═════════════════════════════════════════════════════════ */

export type PublicStation = {
  name: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  /** طولُ المقدّمة الموسيقيّة. ترثه الحلقةُ ما لم تُصرّح بغيره. */
  leadSeconds: number;
};

export async function getPublicStation(): Promise<PublicStation> {
  const { data } = await anon()
    .from("radio_station")
    .select("name, tagline, description, logo_path, music_lead_seconds")
    .eq("id", 1)
    .maybeSingle();
  return {
    name: data?.name ?? "إذاعة أدِيب",
    tagline: data?.tagline ?? null,
    description: data?.description ?? null,
    logoUrl: publicUrl(data?.logo_path),
    leadSeconds: Number(data?.music_lead_seconds ?? 0),
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
  hostName: string | null;
  isFeatured: boolean;
  episodeCount: number;
};

const SHOW_COLS = "id, slug, title, tagline, description, logo_path, tone, is_featured, host_member_id";

type ShowRaw = {
  id: string; slug: string; title: string; tagline: string | null; description: string | null;
  logo_path: string | null; tone: ShowTone; is_featured: boolean; host_member_id: string;
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
  /** رابطا البثّ. المجرّدةُ قد تغيب، وحينها لا مبدّل. */
  musicUrl: string | null;
  plainUrl: string | null;
  musicSeconds: number | null;
  plainSeconds: number | null;
  /** الإزاحة **بعد** الوراثة: بها يقفز المستمع بين النسختين في اللحظة نفسها. */
  leadSeconds: number;
  youtubeUrl: string | null;
  publishedAt: string | null;
  dateLabel: string;
};

const EP_COLS =
  "id, slug, number, title, summary, notes, transcript, host_member_id, audio_music_path, audio_music_seconds, audio_plain_path, audio_plain_seconds, music_lead_seconds, youtube_url, published_at";

type EpRaw = {
  id: string; slug: string; number: number; title: string;
  summary: string | null; notes: string | null; transcript: string | null;
  host_member_id: string;
  audio_music_path: string | null; audio_music_seconds: number | null;
  audio_plain_path: string | null; audio_plain_seconds: number | null;
  music_lead_seconds: number | null; youtube_url: string | null; published_at: string | null;
};

const mapEpisode = (e: EpRaw, stationLead: number, hostName: string | null): PublicEpisode => ({
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
  musicSeconds: e.audio_music_seconds ?? null,
  plainSeconds: e.audio_plain_seconds ?? null,
  leadSeconds: e.music_lead_seconds === null ? stationLead : Number(e.music_lead_seconds),
  youtubeUrl: e.youtube_url ?? null,
  publishedAt: e.published_at ?? null,
  dateLabel: fmtDate(e.published_at),
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
    hostName: names.get(raw.host_member_id) ?? null, isFeatured: raw.is_featured,
    episodeCount: (eps ?? []).length,
  };

  return {
    show,
    episodes: (eps ?? []).map((e) => mapEpisode(e, station.leadSeconds, epHosts.get(e.host_member_id) ?? null)),
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
  if (!episode || !episode.musicUrl) return null;
  return { show: page.show, episode, siblings: page.episodes.filter((e) => e.id !== episode.id) };
}
