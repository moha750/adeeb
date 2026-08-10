/**
 * قراءات لوحة الإذاعة — خادميّة حصرًا (مفتاح الخدمة بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح).
 * تتجاوز RLS عمدًا لأنّ اللوحة ترى المسودّات؛ والحراسة قبلها في `getRadioManager`.
 */
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { publicUrl } from "@/lib/radio/r2";
import type { EpisodeStatus, Platform, ShowStatus, ShowTone } from "./vocab";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const ENV_MISSING = "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم.";

/* ══ البرامج ═════════════════════════════════════════════════════════ */

export type ShowRow = {
  id: string;
  title: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  logoPath: string | null;
  tone: ShowTone;
  status: ShowStatus;
  isFeatured: boolean;
  order: number;
  hostId: string;
  hostName: string;
  hostAvatar: string | null;
  hostGender: string | null;
  committeeId: number | null;
  committeeName: string | null;
  episodeCount: number;
  publishedCount: number;
  createdRaw: string;
};

/**
 * قائمة البرامج مع عدّ حلقاتها ومقدّمها ولجنتها.
 * العدّ من صفوف الحلقات لا من عمودٍ مخزَّن — فلا يكذب عدّادٌ نسي أحدٌ تحديثه.
 */
export async function getShows(): Promise<{ shows: ShowRow[]; error: string | null }> {
  const sb = service();
  if (!sb) return { shows: [], error: ENV_MISSING };

  const [sRes, eRes, cRes] = await Promise.all([
    sb.from("radio_shows")
      .select("id, title, slug, tagline, description, logo_path, tone, status, is_featured, \"order\", host_member_id, producing_committee_id, created_at")
      .order("is_featured", { ascending: false })
      .order("order", { ascending: true })
      .order("created_at", { ascending: false }),
    sb.from("radio_episodes").select("show_id, status"),
    sb.from("committees").select("id, committee_name_ar"),
  ]);
  if (sRes.error) return { shows: [], error: sRes.error.message };
  if (eRes.error) return { shows: [], error: eRes.error.message };

  const hostIds = [...new Set((sRes.data ?? []).map((s) => s.host_member_id).filter(Boolean))];
  const { data: hosts } = hostIds.length
    ? await sb.from("profiles").select("id, full_name, avatar_url, gender").in("id", hostIds)
    : { data: [] as { id: string; full_name: string; avatar_url: string | null; gender: string | null }[] };

  const hostById = new Map((hosts ?? []).map((h) => [h.id, h]));
  const committeeById = new Map((cRes.data ?? []).map((c) => [c.id, c.committee_name_ar as string]));

  const total = new Map<string, number>();
  const published = new Map<string, number>();
  for (const e of eRes.data ?? []) {
    total.set(e.show_id, (total.get(e.show_id) ?? 0) + 1);
    if (e.status === "published") published.set(e.show_id, (published.get(e.show_id) ?? 0) + 1);
  }

  const shows: ShowRow[] = (sRes.data ?? []).map((s) => {
    const h = hostById.get(s.host_member_id);
    return {
      id: s.id,
      title: s.title,
      slug: s.slug,
      tagline: s.tagline ?? null,
      description: s.description ?? null,
      logoPath: s.logo_path ?? null,
      logoUrl: publicUrl(s.logo_path),
      tone: s.tone as ShowTone,
      status: s.status as ShowStatus,
      isFeatured: s.is_featured,
      order: s.order ?? 0,
      hostId: s.host_member_id,
      hostName: h?.full_name ?? "—",
      hostAvatar: h?.avatar_url ?? null,
      hostGender: h?.gender ?? null,
      committeeId: s.producing_committee_id ?? null,
      committeeName: s.producing_committee_id ? committeeById.get(s.producing_committee_id) ?? null : null,
      episodeCount: total.get(s.id) ?? 0,
      publishedCount: published.get(s.id) ?? 0,
      createdRaw: s.created_at ?? "",
    };
  });

  return { shows, error: null };
}

/* ══ محرّر البرنامج: رأسه وحلقاته ومنصّاته ═══════════════════════════ */

/** نسخةٌ صوتيّةٌ مرفوعة. `null` يعني: لم تُرفع بعد. */
export type AudioTake = { seconds: number; bytes: number };

export type EpisodeRow = {
  id: string;
  number: number;
  title: string;
  slug: string;
  summary: string | null;
  status: EpisodeStatus;
  music: AudioTake | null;
  plain: AudioTake | null;
  /** الإزاحة **بعد** حلّ الوراثة: تجاوزُ الحلقة إن وُجد، وإلّا رقمُ المحطّة. */
  leadSeconds: number;
  /** أهي مكتوبةٌ في الحلقة نفسها؟ يميّز الموروثَ من المُعلَن في الواجهة. */
  leadOverridden: boolean;
  youtubeUrl: string | null;
  hostName: string;
  publishAt: string | null;
  publishedAt: string | null;
  plays: number;
};

export type PlatformRow = { id: string; platform: Platform; url: string };

export type ShowEditor = {
  show: ShowRow;
  episodes: EpisodeRow[];
  platforms: PlatformRow[];
  /** إزاحةُ المحطّة الموروثة — تُعرض في نموذج الحلقة نائبةً عن الفارغ. */
  stationLead: number;
};

export async function getShowEditor(id: string): Promise<{ data: ShowEditor | null; error: string | null }> {
  const sb = service();
  if (!sb) return { data: null, error: ENV_MISSING };

  const { shows, error } = await getShows();
  if (error) return { data: null, error };
  const show = shows.find((s) => s.id === id);
  if (!show) return { data: null, error: null };

  const [eRes, pRes, stRes] = await Promise.all([
    sb.from("radio_episodes")
      .select("id, number, title, slug, summary, status, audio_music_path, audio_music_bytes, audio_music_seconds, audio_plain_path, audio_plain_bytes, audio_plain_seconds, music_lead_seconds, youtube_url, host_member_id, publish_at, published_at, plays")
      .eq("show_id", id)
      .order("number", { ascending: false }),
    sb.from("radio_show_platforms").select("id, platform, url").eq("show_id", id).order("order", { ascending: true }),
    sb.from("radio_station").select("music_lead_seconds").eq("id", 1).maybeSingle(),
  ]);
  if (eRes.error) return { data: null, error: eRes.error.message };

  const stationLead = Number(stRes.data?.music_lead_seconds ?? 0);

  const hostIds = [...new Set((eRes.data ?? []).map((e) => e.host_member_id).filter(Boolean))];
  const { data: hosts } = hostIds.length
    ? await sb.from("profiles").select("id, full_name").in("id", hostIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map((hosts ?? []).map((h) => [h.id, h.full_name]));

  const episodes: EpisodeRow[] = (eRes.data ?? []).map((e) => ({
    id: e.id,
    number: e.number,
    title: e.title,
    slug: e.slug,
    summary: e.summary ?? null,
    status: e.status as EpisodeStatus,
    music: e.audio_music_path && e.audio_music_seconds && e.audio_music_bytes
      ? { seconds: e.audio_music_seconds, bytes: Number(e.audio_music_bytes) } : null,
    plain: e.audio_plain_path && e.audio_plain_seconds && e.audio_plain_bytes
      ? { seconds: e.audio_plain_seconds, bytes: Number(e.audio_plain_bytes) } : null,
    leadSeconds: e.music_lead_seconds === null ? stationLead : Number(e.music_lead_seconds),
    leadOverridden: e.music_lead_seconds !== null,
    youtubeUrl: e.youtube_url ?? null,
    hostName: nameById.get(e.host_member_id) ?? "—",
    publishAt: e.publish_at ?? null,
    publishedAt: e.published_at ?? null,
    plays: e.plays ?? 0,
  }));

  const platforms: PlatformRow[] = (pRes.data ?? []).map((p) => ({
    id: p.id, platform: p.platform as Platform, url: p.url,
  }));

  return { data: { show, episodes, platforms, stationLead }, error: null };
}

/* ══ خيارات النماذج ══════════════════════════════════════════════════ */

export type MemberOption = { value: string; label: string };

/** الأعضاء النشطون وحدهم يصلحون مقدّمين — الموقوف لا يُقدّم برنامجًا. */
export async function getMemberOptions(): Promise<MemberOption[]> {
  const sb = service();
  if (!sb) return [];
  const { data } = await sb
    .from("profiles")
    .select("id, full_name")
    .eq("account_status", "active")
    .order("full_name", { ascending: true });
  return (data ?? []).map((p) => ({ value: p.id, label: p.full_name }));
}

export async function getCommitteeOptions(): Promise<MemberOption[]> {
  const sb = service();
  if (!sb) return [];
  const { data } = await sb
    .from("committees")
    .select("id, committee_name_ar")
    .eq("is_active", true)
    .order("id", { ascending: true });
  return (data ?? []).map((c) => ({ value: String(c.id), label: c.committee_name_ar }));
}

/* ══ المحطّة (بيانات الخلاصة المشتركة) ═══════════════════════════════ */

export type StationData = {
  name: string;
  tagline: string | null;
  description: string | null;
  logoPath: string | null;
  logoUrl: string | null;
  /** طولُ المقدّمة الموسيقيّة. المصدرُ الواحد للمبدّل في كلّ حلقةٍ لا تُصرّح بغيره. */
  musicLeadSeconds: number;
};

export async function getStation(): Promise<{ station: StationData | null; error: string | null }> {
  const sb = service();
  if (!sb) return { station: null, error: ENV_MISSING };
  const { data, error } = await sb
    .from("radio_station")
    .select("name, tagline, description, logo_path, music_lead_seconds")
    .eq("id", 1)
    .maybeSingle();
  if (error) return { station: null, error: error.message };
  if (!data) return { station: null, error: null };
  return {
    station: {
      name: data.name,
      tagline: data.tagline ?? null,
      description: data.description ?? null,
      logoPath: data.logo_path ?? null,
      logoUrl: publicUrl(data.logo_path),
      musicLeadSeconds: Number(data.music_lead_seconds),
    },
    error: null,
  };
}
