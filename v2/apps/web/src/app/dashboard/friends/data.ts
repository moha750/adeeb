import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { fmtDate, fmtMonthYear } from "@/lib/dates";
import { arCount, type ArForms } from "@/lib/arabicCount";

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
  /**
   * **آخرُ مشاركةٍ في برنامج**: البرنامجُ وتاريخُه معًا (ملاحظةُ ٢٠٢٦-١٠-١٠). كان «آخرُ نشاط»
   * يخلط المشاركةَ بآخر دخولٍ وبيوم فتح الحساب، فيقول تاريخًا لا يُعرف معناه، ويُرتَّب عليه
   * الكشفُ فيسبق من دخل أمس من حضر فعاليّةً قبل أسبوع. فالمشاركةُ وحدها هنا، وما سواها لا يُقال.
   */
  lastProgram: { program: Program; date: string; raw: string; event?: { title: string; attended: boolean } } | null;
  /** في أدِيب منذ: شهرُ فتح الحساب وسنتُه. */
  since: string;
  sinceRaw: string;
  programs: Program[];
  /** عمقُ المشاركة في كلّ برنامج، يُقال بجوار اسمه («حضر 3»، «17 جولةً»). */
  depth: Partial<Record<Program, string>>;
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

/** آخرُ فعاليّةٍ حجزها الصديقُ أو حضرها، من `friends_last_event()` (٢٠٢٦-١٠-١٠): يُسمّيها كرتُه بدل «فعاليّات أدِيب». */
type LastEvent = { user_id: string; title: string | null; at: string | null; was_attended: boolean };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

/** «جولةٌ واحدة» · «جولتان» · «5 جولات» · «17 جولةً» */
const AR_RUNS: ArForms = ["جولةٌ واحدة", "جولتان", "جولات", "جولةً"];
/** «حضر مرّةً واحدة» · «مرّتين» · «3 مرّات» */
const AR_TIMES: ArForms = ["مرّةً واحدة", "مرّتين", "مرّات", "مرّةً"];

export async function listFriends(): Promise<{ rows: FriendRow[]; error: string | null }> {
  const sb = service();
  if (!sb) return { rows: [], error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };

  const [{ data, error }, lastEv] = await Promise.all([sb.rpc("friends_overview"), sb.rpc("friends_last_event")]);
  if (error) return { rows: [], error: error.message };
  // اسمُ آخر فعاليّة زيادةُ وضوح: إن تعذّرت قراءتُه بقي الكرتُ باسم البرنامج وتاريخه
  const lastEvent = new Map(((lastEv.data ?? []) as LastEvent[]).map((e) => [e.user_id, e]));

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
    // آخرُ مشاركة: أحدثُ تاريخٍ بين البرامج التي شارك فيها فعلًا، ومعه اسمُ برنامجه
    const dated: [Program, string | null][] = [
      ["events", events ? (lastEvent.get(r.user_id)?.at ?? r.events_last) : null], ["darb", darb ? r.darb_last : null],
      ["surveys", surveys ? r.surveys_last : null], ["radio", radio ? r.radio_last : null], ["deebo", deebo ? r.deebo_last : null],
    ];
    const last = dated.filter((d): d is [Program, string] => Boolean(d[1])).sort((a, b) => b[1].localeCompare(a[1]))[0];
    const depth: Partial<Record<Program, string>> = {};
    const she = r.gender === "female";
    if (events) depth.events = events.attended > 0
      ? `${she ? "حضرت" : "حضر"} ${arCount(events.attended, AR_TIMES)}`
      : she ? "حجزت ولم تحضر" : "حجز ولم يحضر";
    const ev = last?.[0] === "events" ? lastEvent.get(r.user_id) : undefined;
    if (darb && darb.runs > 0) depth.darb = arCount(darb.runs, AR_RUNS);
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
      lastProgram: last
        ? {
            program: last[0], date: fmtDate(last[1]), raw: last[1],
            ...(ev?.title ? { event: { title: ev.title, attended: ev.was_attended } } : {}),
          }
        : null,
      since: fmtMonthYear(r.account_created),
      sinceRaw: r.account_created ?? "",
      programs,
      depth,
      events, darb, radio, surveys, deebo,
    };
  });

  // الأحدثُ مشاركةً أوّلًا، ومن لم يشارك بعدُ آخرًا (الأحدثُ حسابًا منهم أوّلًا)
  rows.sort((a, b) =>
    (b.lastProgram?.raw ?? "").localeCompare(a.lastProgram?.raw ?? "") || b.sinceRaw.localeCompare(a.sinceRaw));
  return { rows, error: null };
}
