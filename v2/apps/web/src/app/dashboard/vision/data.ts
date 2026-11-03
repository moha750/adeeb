import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { isGoalStatus, type GoalStatus } from "@/lib/vision/vocab";

/**
 * **بياناتُ غرفة «متابعة الرؤية»** — بمفتاح الخدمة بعد قفل الغرفة (`manage_vision`): الجداولُ مغلقةٌ عن الجلسة،
 * والغرفةُ ترى ما لا تراه الصفحةُ العلنيّة («الواقعُ عند البدء»، ومن غيّر الحال ومتى).
 * والرؤيةُ المتابَعةُ هي الساريةُ (فإن لم تكن فآخرُ ما بدأ).
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
};

export type VisionRoomData = {
  vision: { id: number; slug: string; name: string; startsOn: string; horizonLabel: string; horizonOn: string; status: string };
  /** عددُ أهداف كلّ مسارٍ بترتيبه — هندسةُ الهلال */
  counts: number[];
  goals: VisionGoalRow[];
};

type RawGoal = {
  id: number; position: number; cluster: string | null; title: string; detail: string | null; target: string; owner: string;
  baseline: string | null; due_on: string | null; status: string; done_at: string | null; updated_at: string;
  editor: { full_name: string | null } | null;
};
type RawTrack = { id: number; position: number; name: string; icon: string; vision_goals: RawGoal[] };

export async function getVisionRoom(): Promise<{ data: VisionRoomData | null; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { data: null, error: "إعداد الخادم ناقص (مفتاح الخدمة)." };
  const svc = createAdeebServiceClient(url, key);

  const { data: visions, error: vErr } = await svc
    .from("visions")
    .select("id, slug, name, starts_on, horizon_label, horizon_on, status")
    .neq("status", "draft")
    .order("status", { ascending: true }) // active قبل closed
    .order("starts_on", { ascending: false })
    .limit(1);
  if (vErr) return { data: null, error: vErr.message };
  const v = visions?.[0];
  if (!v) return { data: null, error: null };

  const { data: tracks, error: tErr } = await svc
    .from("vision_tracks")
    .select("id, position, name, icon, vision_goals(id, position, cluster, title, detail, target, owner, baseline, due_on, status, done_at, updated_at, editor:profiles!vision_goals_updated_by_fkey(full_name))")
    .eq("vision_id", v.id)
    .order("position");
  if (tErr) return { data: null, error: tErr.message };

  const ts = ((tracks ?? []) as unknown as RawTrack[]).map((t) => ({ ...t, vision_goals: [...t.vision_goals].sort((a, b) => a.position - b.position) }));
  const goals: VisionGoalRow[] = ts.flatMap((t) =>
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
    })),
  );
  return {
    data: {
      vision: { id: v.id, slug: v.slug, name: v.name, startsOn: v.starts_on, horizonLabel: v.horizon_label, horizonOn: v.horizon_on, status: v.status },
      counts: ts.map((t) => t.vision_goals.length),
      goals,
    },
    error: null,
  };
}
