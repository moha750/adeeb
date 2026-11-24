import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { isGoalStatus, type GoalStatus } from "@/lib/vision/vocab";
import { HILAL, isMarkShape, type VisionMarkShape } from "@/lib/vision/mark";

/**
 * **بياناتُ غرفة «متابعة الرؤية»** — بمفتاح الخدمة بعد باب الغرفة (`work_vision`: فريقُ الرؤية والرئيسان): الجداولُ مغلقةٌ عن
 * الجلسة، والغرفةُ ترى ما لا تراه الصفحةُ العلنيّة («الواقعُ عند البدء»، و«أُنجز» قبل تأكيده، ومن فعل ماذا ومتى).
 * والرؤيةُ المتابَعةُ هي الساريةُ (فإن لم تكن فآخرُ ما بدأ).
 *
 * **وكلٌّ يرى بقدر مقعده** (محمد ٢٠٢٦-١١-٢٢): قائدُ المسار مسارَه وحده (أهدافَه وسجلَّه)، والمشرفُ العامّ وقائدُ الرؤية والرئيسان
 * كلَّ شيء. والنخلُ هنا في الخادم لا في الشاشة: ما لا يُرى لا يُرسَل.
 */
export type VisionGoalRow = {
  id: number;
  trackPosition: number;
  trackName: string;
  trackIcon: string;
  position: number;
  cluster: string | null;
  title: string;
  detail: string | null;
  target: string;
  owner: string;
  baseline: string | null;
  dueOn: string | null;
  status: GoalStatus;
  doneAt: string | null;
  updatedAt: string;
  updatedBy: string | null;
  trackId: number;
  /** من رفع «أُنجز» (يبقى بعد التأكيد: لا يؤكّد أحدٌ ما رفعه)، ودليلُه */
  reportedById: string | null;
  reportedBy: string | null;
  reportedAt: string | null;
  reportNote: string | null;
  confirmedBy: string | null;
};

/** مقعدُ صاحب الجلسة في الرؤية (`vision_access`) — منه ما يرى وما يفعل */
export type VisionAccess = {
  userId: string;
  president: boolean;
  /** يُعدّ الرؤى (`draft_vision`، إدارةُ الضمان والجودة والرئيسان): يرى السارية كلَّها بلا فعل، ويصل إلى «الرؤى» */
  drafter: boolean;
  /** مقعدُه الرئاسيُّ الأصيل إن كان (الموافقةُ على المسوّدة توقيعُه) */
  seat: "club_president" | "executive_council_president" | null;
  supervisor: boolean;
  leader: boolean;
  /** معرّفاتُ المسارات التي يقودها */
  tracks: number[];
};

/** أفعالُ السجلّ: عملُ الفريق في الأهداف، ثمّ دورةُ الرؤية من إرسالها إلى إغلاقها */
export type VisionLogAction =
  | "status" | "reported" | "withdrawn" | "confirmed" | "returned" | "unconfirmed" | "edited" | "team"
  | "saved" | "submitted" | "recalled" | "approved" | "unapproved" | "sent_back" | "launched" | "closed";

/** سطرٌ في سجلّ الرؤية (`vision_log`)، بفاعله واسمه وجنسه */
export type VisionLogRow = {
  id: number;
  at: string;
  action: VisionLogAction;
  actor: string;
  actorFemale: boolean;
  goalTitle: string | null;
  trackPosition: number | null;
  from: string | null;
  to: string | null;
  note: string | null;
  /** للتعديل: الحقولُ التي تغيّرت؛ وللفريق: المقاعدُ التي تبدّلت بأسماء أصحابها قبلُ وبعدُ */
  changes: string[];
  /** مقعدُ من وافق أو سحب موافقته */
  seat: string | null;
  /** عند الإغلاق: ما تحقّق من كم */
  tally: { done: number; total: number } | null;
};

/** مقعدٌ في فريق الرؤية كما في القاعدة (`vision_team`): حسابٌ (`profileId`) أو اسمٌ مكتوبٌ بجنسه لمن لا حساب له */
export type VisionSeatRow = {
  role: "supervisor" | "leader" | "track";
  trackId: number | null;
  profileId: string | null;
  /** الاسمُ كما يُعرض: من الملفّ للحساب، والمكتوبُ لغيره */
  name: string;
  gender: "male" | "female" | null;
  avatar: string | null;
};

export type VisionRoomData = {
  vision: {
    id: number; slug: string; name: string; startsOn: string; startsLabel: string | null; horizonLabel: string | null; horizonOn: string; status: string;
    /** علامتُها واسمُها في الجمل («الهلال») */
    mark: VisionMarkShape; markNoun: string;
  };
  /** عددُ أهداف كلّ مسارٍ بترتيبه — هندسةُ الهلال (المساراتُ كلُّها: الهلالُ واحدٌ لمن رأى مسارًا أو أربعة) */
  counts: number[];
  /** ما أُضيء من كلّ طبقة — من الأهداف كلّها لا ممّا يراه صاحبُ الجلسة: المتحقّقُ علنيٌّ في الصفحة أصلًا */
  lit: boolean[][];
  goals: VisionGoalRow[];
  /** المساراتُ بمعرّفاتها — لمقاعد قادتها في الفريق */
  tracks: { id: number; position: number; name: string; icon: string }[];
  team: VisionSeatRow[];
  access: VisionAccess;
  log: VisionLogRow[];
};

type RawGoal = {
  id: number; position: number; cluster: string | null; title: string; detail: string | null; target: string; owner: string;
  baseline: string | null; due_on: string | null; status: string; done_at: string | null; updated_at: string;
  reported_by: string | null; reported_at: string | null; report_note: string | null;
  editor: { full_name: string | null } | null;
  reporter: { full_name: string | null } | null;
  confirmer: { full_name: string | null } | null;
};
type RawTrack = { id: number; position: number; name: string; icon: string; vision_goals: RawGoal[] };

export async function getVisionRoom(userId: string): Promise<{ data: VisionRoomData | null; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { data: null, error: "إعداد الخادم ناقص (مفتاح الخدمة)." };
  const svc = createAdeebServiceClient(url, key);

  const { data: visions, error: vErr } = await svc
    .from("visions")
    .select("id, slug, name, starts_on, starts_label, horizon_label, horizon_on, status, mark, mark_noun")
    // المسوّدةُ وما عند الرئيسين ليست رؤيةً تُتابَع: مكانُهما «الرؤى»
    .in("status", ["active", "closed"])
    .order("status", { ascending: true }) // active قبل closed
    .order("starts_on", { ascending: false })
    .limit(1);
  if (vErr) return { data: null, error: vErr.message };
  const v = visions?.[0];
  if (!v) return { data: null, error: null };

  const { data: tracks, error: tErr } = await svc
    .from("vision_tracks")
    .select("id, position, name, icon, vision_goals(id, position, cluster, title, detail, target, owner, baseline, due_on, status, done_at, updated_at, reported_by, reported_at, report_note, editor:profiles!vision_goals_updated_by_fkey(full_name), reporter:profiles!vision_goals_reported_by_fkey(full_name), confirmer:profiles!vision_goals_confirmed_by_fkey(full_name))")
    .eq("vision_id", v.id)
    .order("position");
  if (tErr) return { data: null, error: tErr.message };

  const { data: seats, error: sErr } = await svc
    .from("vision_team")
    .select("role, track_id, profile_id, name, gender, person:profiles!vision_team_profile_id_fkey(full_name, gender, avatar_url)")
    .eq("vision_id", v.id);
  if (sErr) return { data: null, error: sErr.message };
  type RawSeat = {
    role: VisionSeatRow["role"]; track_id: number | null; profile_id: string | null; name: string | null; gender: string | null;
    person: { full_name: string | null; gender: string | null; avatar_url: string | null } | null;
  };
  const asGender = (g: string | null | undefined) => (g === "male" || g === "female" ? g : null);
  const team: VisionSeatRow[] = ((seats ?? []) as unknown as RawSeat[]).map((r) => ({
    role: r.role,
    trackId: r.track_id,
    profileId: r.profile_id,
    name: (r.person?.full_name ?? r.name ?? "").trim(),
    gender: asGender(r.person ? r.person.gender : r.gender),
    avatar: r.person?.avatar_url ?? null,
  }));

  const { data: acc, error: aErr } = await svc.rpc("vision_access", { p_user: userId, p_vision: v.id });
  if (aErr) return { data: null, error: aErr.message };
  const a = (acc ?? {}) as { president?: boolean; drafter?: boolean; seat?: string | null; supervisor?: boolean; leader?: boolean; tracks?: number[] };
  const access: VisionAccess = {
    userId,
    president: !!a.president,
    drafter: !!a.drafter,
    seat: a.seat === "club_president" || a.seat === "executive_council_president" ? a.seat : null,
    supervisor: !!a.supervisor,
    leader: !!a.leader,
    tracks: (a.tracks ?? []).map(Number),
  };
  const seesAll = access.president || access.drafter || access.supervisor || access.leader;
  const mine = new Set(access.tracks);

  const ts = ((tracks ?? []) as unknown as RawTrack[]).map((t) => ({ ...t, vision_goals: [...t.vision_goals].sort((a, b) => a.position - b.position) }));
  const goals: VisionGoalRow[] = ts.filter((t) => seesAll || mine.has(t.id)).flatMap((t) =>
    t.vision_goals.map((g) => ({
      id: g.id,
      trackPosition: t.position,
      trackName: t.name,
      trackIcon: t.icon,
      position: g.position,
      cluster: g.cluster,
      title: g.title,
      detail: g.detail,
      target: g.target,
      owner: g.owner,
      baseline: g.baseline,
      dueOn: g.due_on,
      status: isGoalStatus(g.status) ? g.status : "pending",
      doneAt: g.done_at,
      updatedAt: g.updated_at,
      updatedBy: g.editor?.full_name ?? null,
      trackId: t.id,
      reportedById: g.reported_by,
      reportedBy: g.reporter?.full_name ?? null,
      reportedAt: g.reported_at,
      reportNote: g.report_note,
      confirmedBy: g.confirmer?.full_name ?? null,
    })),
  );

  const log = await readLog(svc, v.id, ts, seesAll ? null : mine);
  return {
    data: {
      vision: {
        id: v.id, slug: v.slug, name: v.name, startsOn: v.starts_on, startsLabel: v.starts_label ?? null, horizonLabel: v.horizon_label ?? null, horizonOn: v.horizon_on, status: v.status,
        mark: isMarkShape(v.mark) ? v.mark : HILAL, markNoun: (v.mark_noun as string | null) ?? "العلامة",
      },
      counts: ts.map((t) => t.vision_goals.length),
      lit: ts.map((t) => t.vision_goals.map((g) => g.status === "done")),
      goals,
      tracks: ts.map((t) => ({ id: t.id, position: t.position, name: t.name, icon: t.icon })),
      team,
      access,
      log,
    },
    error: null,
  };
}

/* ══ السجلّ ══ */

const FIELD: Record<string, string> = { title: "العنوان", detail: "التفصيل", target: "المستهدف", owner: "المسؤول", baseline: "الواقع عند البدء", due_on: "الموعد" };
/** اسمُ المقعد بجنس صاحبه (من له ملفّ؛ والاسمُ المكتوبُ بلا جنسٍ في السجلّ يأخذ المذكّر) */
const SEAT: Record<string, [string, string]> = { supervisor: ["المشرف العام", "المشرفة العامة"], leader: ["قائد الرؤية", "قائدة الرؤية"] };

type RawLog = {
  id: number; created_at: string; action: VisionLogRow["action"]; actor: string | null; goal_id: number | null;
  from_status: string | null; to_status: string | null; note: string | null;
  details: {
    title?: string; track?: number; changes?: Record<string, [string | null, string | null]>; before?: RawSeat[]; after?: RawSeat[];
    seat?: string; done?: number; total?: number;
  } | null;
};
type RawSeat = { role: string; track_id: number | null; profile_id: string | null; name: string | null; gender?: string | null };

/** آخرُ مئتي سطر، وقائدُ المسار يرى سطورَ أهداف مساره وتغييرَ الفريق (الفريقُ علنيٌّ في الصفحة أصلًا) */
export async function readLog(
  svc: ReturnType<typeof createAdeebServiceClient>,
  visionId: number,
  tracks: { id: number; position: number; name: string; vision_goals: { id: number }[] }[],
  only: Set<number> | null,
): Promise<VisionLogRow[]> {
  // النخلُ في الاستعلام قبل الحدّ: قائدُ المسار يأخذ آخرَ مئتين من سطوره هو، لا ما بقي له من آخر مئتين للرؤية كلّها
  const mineGoals = only ? tracks.filter((t) => only.has(t.id)).flatMap((t) => t.vision_goals.map((g) => g.id)) : [];
  let q = svc
    .from("vision_log")
    .select("id, created_at, action, actor, goal_id, from_status, to_status, note, details")
    .eq("vision_id", visionId);
  // وقائدُ المسار يرى من دورة الرؤية إطلاقَها وإغلاقَها (يعنيانه)، لا موافقاتِ مسوّدتها
  if (only) q = mineGoals.length ? q.or(`action.in.(team,launched,closed),goal_id.in.(${mineGoals.join(",")})`) : q.in("action", ["team", "launched", "closed"]);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
  if (error || !data) return [];
  const visible = data as RawLog[];
  const trackName = new Map(tracks.map((t) => [t.id, t.name]));

  // أسماءُ الفاعلين ومن في مقاعد الفريق، بجنسهم — نداءٌ واحد
  const ids = new Set<string>();
  for (const r of visible) {
    if (r.actor) ids.add(r.actor);
    for (const s of [...(r.details?.before ?? []), ...(r.details?.after ?? [])]) if (s.profile_id) ids.add(s.profile_id);
  }
  const people = new Map<string, { name: string; female: boolean }>();
  if (ids.size) {
    const { data: ps } = await svc.from("profiles").select("id, full_name, gender").in("id", [...ids]);
    for (const p of (ps ?? []) as { id: string; full_name: string | null; gender: string | null }[]) {
      people.set(p.id, { name: (p.full_name ?? "").trim() || "عضو", female: p.gender === "female" });
    }
  }
  const nameOf = (s: RawSeat) => (s.profile_id ? people.get(s.profile_id)?.name ?? "عضو" : s.name ?? "");
  const seatOf = (s: RawSeat) => {
    const f = s.profile_id ? people.get(s.profile_id)?.female ?? false : s.gender === "female";
    if (s.role === "track") return `${f ? "قائدة" : "قائد"} مسار ${trackName.get(s.track_id ?? -1) ?? ""}`.trim();
    return SEAT[s.role]?.[f ? 1 : 0] ?? s.role;
  };

  return visible.map((r) => {
    const who = r.actor ? people.get(r.actor) : undefined;
    let changes: string[] = [];
    if (r.action === "edited") {
      changes = Object.keys(r.details?.changes ?? {}).map((k) => FIELD[k] ?? k);
    } else if (r.action === "team") {
      const key = (s: RawSeat) => `${s.role}:${s.track_id ?? 0}`;
      const before = new Map((r.details?.before ?? []).map((s) => [key(s), s]));
      const after = new Map((r.details?.after ?? []).map((s) => [key(s), s]));
      for (const k of new Set([...before.keys(), ...after.keys()])) {
        const b = before.get(k), a = after.get(k);
        const was = b ? nameOf(b) : "", now = a ? nameOf(a) : "";
        if (was === now) continue;
        const seat = seatOf((a ?? b) as RawSeat);
        changes.push(now ? (was ? `${seat}: ${now} بدل ${was}` : `${seat}: ${now}`) : `${seat}: فارغ بعد ${was}`);
      }
    }
    return {
      id: r.id,
      at: r.created_at,
      action: r.action,
      actor: who?.name ?? "عضو",
      actorFemale: who?.female ?? false,
      goalTitle: r.details?.title ?? null,
      trackPosition: r.details?.track ?? null,
      from: r.from_status,
      to: r.to_status,
      note: r.note,
      changes,
      seat: r.details?.seat ?? null,
      tally: r.action === "closed" && r.details ? { done: Number(r.details.done ?? 0), total: Number(r.details.total ?? 0) } : null,
    };
  });
}
