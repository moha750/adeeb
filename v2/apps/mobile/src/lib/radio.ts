import { r2Url } from "./env";
import { supabase } from "./supabase";

/**
 * قراءاتُ الإذاعة.
 *
 * تُقرأ بمفتاح anon مباشرةً كما يفعل الويبُ في `app/radio/data.ts`: سياساتُ RLS
 * (`radio_shows_public_read` و`radio_episodes_public_read`) هي التي تنخل المنشورَ من غيره،
 * فلا يُكتب شرطُ `status` هنا. كتابتُه تُوهم أنّه الحارس، والحارسُ في القاعدة.
 *
 * والقاعدةُ تخزّن **مفتاحَ الكائن** لا رابطَه، فيُركَّب هنا بـ`r2Url`.
 */

/** نغمةُ البرنامج كما يقيّدها `radio_shows_tone_check`. */
export type Tone = "brand" | "neutral" | "success" | "warning" | "danger";

export type Episode = {
  id: string;
  number: number;
  title: string;
  summary: string | null;
  transcript: string | null;
  showId: string;
  showTitle: string;
  tone: Tone;
  coverUrl: string | null;
  /** الثانيةُ التي يبدأ عندها الكلامُ بعد المقدّمة (الحلقةُ تَرِث برنامجَها) */
  talkStartsAt: number;
  seconds: number | null;
  /** الصوتُ المجرَّد — المسارُ القائد */
  plainUrl: string | null;
  /** طبقةُ الموسيقى — تابعٌ لا يملك زمنًا */
  stemUrl: string | null;
  /** المزيجُ الكامل — بابُ الحلقات القديمة وحدَها */
  mixedUrl: string | null;
  /** موجةُ ما يُسمَع بالموسيقى، وموجةُ الصوت وحدَه */
  musicPeaks: number[] | null;
  plainPeaks: number[] | null;
  plays: number;
  likes: number;
  youtubeUrl: string | null;
};

export type Show = {
  id: string;
  title: string;
  tagline: string | null;
  tone: Tone;
  logoUrl: string | null;
  isFeatured: boolean;
};

/* ─────────────────────────── الحلقات ─────────────────────────── */

const EP_COLS = `
  id, number, title, summary, transcript, talk_starts_at, show_id,
  audio_plain_path, audio_plain_seconds, audio_stem_path, audio_music_path,
  audio_music_peaks, audio_plain_peaks, plays, likes, youtube_url,
  radio_shows!inner ( title, tone, logo_path, talk_starts_at )
`;

type EpisodeRow = {
  id: string;
  number: number;
  title: string;
  summary: string | null;
  transcript: string | null;
  talk_starts_at: number | string | null;
  show_id: string;
  audio_plain_path: string | null;
  audio_plain_seconds: number | null;
  audio_stem_path: string | null;
  audio_music_path: string | null;
  audio_music_peaks: number[] | null;
  audio_plain_peaks: number[] | null;
  plays: number | null;
  likes: number | null;
  youtube_url: string | null;
  radio_shows: { title: string; tone: Tone; logo_path: string | null; talk_starts_at: number | string | null };
};

/**
 * `talk_starts_at` عمودٌ `numeric`، وسائقُ postgres يعيده **نصًّا** لا رقمًا
 * («10.633» لا 10.633). تركُه نصًّا يجعل كلّ حسابٍ عليه ضمَّ نصوصٍ لا جمعَ أرقام.
 */
const num = (v: number | string | null): number | null => (v === null ? null : Number(v));

function mapEpisode(row: EpisodeRow): Episode {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    summary: row.summary,
    transcript: row.transcript,
    showId: row.show_id,
    showTitle: row.radio_shows.title,
    tone: row.radio_shows.tone,
    coverUrl: r2Url(row.radio_shows.logo_path),
    talkStartsAt: num(row.talk_starts_at) ?? num(row.radio_shows.talk_starts_at) ?? 0,
    seconds: row.audio_plain_seconds,
    plainUrl: r2Url(row.audio_plain_path),
    stemUrl: r2Url(row.audio_stem_path),
    mixedUrl: r2Url(row.audio_music_path),
    musicPeaks: row.audio_music_peaks,
    plainPeaks: row.audio_plain_peaks,
    plays: row.plays ?? 0,
    likes: row.likes ?? 0,
    youtubeUrl: row.youtube_url,
  };
}

export async function getEpisodes(limit = 30): Promise<{ data: Episode[]; error: string | null }> {
  const { data, error } = await supabase
    .from("radio_episodes")
    .select(EP_COLS)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) return { data: [], error: error.message };
  return { data: (data as unknown as EpisodeRow[]).map(mapEpisode), error: null };
}

export async function getEpisode(id: string): Promise<{ data: Episode | null; error: string | null }> {
  const { data, error } = await supabase.from("radio_episodes").select(EP_COLS).eq("id", id).maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };
  return { data: mapEpisode(data as unknown as EpisodeRow), error: null };
}

/* ─────────────────────────── البرامج ─────────────────────────── */

type ShowRow = {
  id: string;
  title: string;
  tagline: string | null;
  tone: Tone;
  logo_path: string | null;
  is_featured: boolean;
};

export async function getShows(): Promise<{ data: Show[]; error: string | null }> {
  const { data, error } = await supabase
    .from("radio_shows")
    .select("id, title, tagline, tone, logo_path, is_featured")
    .order("is_featured", { ascending: false })
    .order("order", { ascending: true });

  if (error) return { data: [], error: error.message };
  return {
    data: (data as ShowRow[]).map((r) => ({
      id: r.id,
      title: r.title,
      tagline: r.tagline,
      tone: r.tone,
      logoUrl: r2Url(r.logo_path),
      isFeatured: r.is_featured,
    })),
    error: null,
  };
}

/* ─────────────────────────── المحطّة ─────────────────────────── */

export type Station = { name: string; tagline: string | null; logoUrl: string | null };

export async function getStation(): Promise<Station | null> {
  const { data } = await supabase.from("radio_station").select("name, tagline, logo_path").eq("id", 1).maybeSingle();
  if (!data) return null;
  const row = data as { name: string; tagline: string | null; logo_path: string | null };
  return { name: row.name, tagline: row.tagline, logoUrl: r2Url(row.logo_path) };
}

/* ─────────────────────────── الموجة ─────────────────────────── */

/**
 * يختصر مصفوفةَ الذُّرى المخزَّنة (٤٠٠ خانة) إلى عدد الأعمدة المرسومة.
 * منقولةٌ عن `lib/radio/peaks.ts` في الويب: القيمُ محسوبةٌ في القاعدة سلفًا،
 * فلا يحتاج الجوّالُ فكَّ ترميزِ صوتٍ ولا Web Audio.
 */
export function downsample(peaks: number[], bars: number): number[] {
  if (!peaks.length || bars <= 0) return [];
  const out: number[] = [];
  const per = peaks.length / bars;
  for (let i = 0; i < bars; i++) {
    const from = Math.floor(i * per);
    const to = Math.max(from + 1, Math.floor((i + 1) * per));
    let max = 0;
    for (let j = from; j < to && j < peaks.length; j++) max = Math.max(max, peaks[j] ?? 0);
    out.push(max);
  }
  return out;
}
