import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { fmtDate } from "@/lib/dates";

/**
 * **أصدقاء أدِيب** (قرار المالك ٢٠٢٦-١٠-٠٩) — قراءةٌ واحدة من `friends_overview()`: صفٌّ لكلّ صاحب
 * حسابٍ ليس عضوًا ولا متطوّعًا، أكمل ملفَّه أو لم يُكمله، ومعه برامجُ أدِيب التي شارك فيها.
 * الدالّةُ تُنادى بمفتاح الخدمة وحده، والغرفةُ مقفولةٌ بـ`view_friends` (الرئاسة).
 */

export type Program = "events" | "darb" | "surveys" | "radio" | "deebo";

export type FriendRow = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  gender: "male" | "female" | null;
  city: string | null;
  hasProfile: boolean;
  wasMember: boolean;
  volunteeredBefore: boolean;
  /** آخرُ ما فعله في أدِيب: أحدثُ نشاطٍ في أيّ برنامج، أو آخرُ دخولٍ إلى حسابه. */
  lastActive: string;
  lastActiveRaw: string;
  programs: Program[];
  events: { booked: number; attended: number; lastAttended: string } | null;
  darb: { nickname: string; best: number; runs: number; tamr: number } | null;
  radio: string[] | null;
  surveys: number | null;
  deebo: number | null;
};

type Raw = {
  user_id: string; full_name: string | null; email: string | null; phone: string | null; gender: string | null; city: string | null;
  has_profile: boolean; was_member: boolean; volunteered_before: boolean;
  account_created: string | null; last_sign_in: string | null;
  events_booked: number; events_attended: number; events_last_attended: string | null; events_last: string | null;
  darb_nickname: string | null; darb_best: number | null; darb_runs: number | null; darb_tamr: number | null; darb_last: string | null;
  radio_shows: string[] | null; radio_last: string | null;
  surveys_done: number; surveys_last: string | null;
  deebo_chats: number; deebo_last: string | null;
};

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

const latest = (...xs: (string | null)[]) =>
  xs.filter((x): x is string => Boolean(x)).sort().at(-1) ?? "";

export async function listFriends(): Promise<{ rows: FriendRow[]; error: string | null }> {
  const sb = service();
  if (!sb) return { rows: [], error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };

  const { data, error } = await sb.rpc("friends_overview");
  if (error) return { rows: [], error: error.message };

  const rows = ((data ?? []) as Raw[]).map((r): FriendRow => {
    const events = r.events_booked > 0 || r.events_attended > 0
      ? { booked: r.events_booked, attended: r.events_attended, lastAttended: fmtDate(r.events_last_attended) }
      : null;
    // اللاعبُ يُعرف بصفّه في اللعبة، ولو لم يُكمل جولةً بعد
    const darb = r.darb_runs != null
      ? { nickname: r.darb_nickname ?? "", best: r.darb_best ?? 0, runs: r.darb_runs, tamr: r.darb_tamr ?? 0 }
      : null;
    const radio = r.radio_shows?.length ? r.radio_shows : null;
    const surveys = r.surveys_done > 0 ? r.surveys_done : null;
    const deebo = r.deebo_chats > 0 ? r.deebo_chats : null;
    const programs: Program[] = [
      ...(events ? ["events" as const] : []),
      ...(darb ? ["darb" as const] : []),
      ...(surveys ? ["surveys" as const] : []),
      ...(radio ? ["radio" as const] : []),
      ...(deebo ? ["deebo" as const] : []),
    ];
    const lastRaw = latest(r.events_last, r.darb_last, r.radio_last, r.surveys_last, r.deebo_last, r.last_sign_in, r.account_created);
    return {
      id: r.user_id,
      name: r.has_profile && r.full_name?.trim() ? r.full_name : null,
      email: r.email ?? "",
      phone: r.phone ?? null,
      gender: r.gender === "male" || r.gender === "female" ? r.gender : null,
      city: r.city ?? null,
      hasProfile: r.has_profile,
      wasMember: r.was_member,
      volunteeredBefore: r.volunteered_before,
      lastActive: fmtDate(lastRaw),
      lastActiveRaw: lastRaw,
      programs,
      events, darb, radio, surveys, deebo,
    };
  });

  // الأحدثُ نشاطًا أوّلًا: من يتحرّك الآن أولى بالنظر ممّن سكن منذ شهور
  rows.sort((a, b) => b.lastActiveRaw.localeCompare(a.lastActiveRaw));
  return { rows, error: null };
}
