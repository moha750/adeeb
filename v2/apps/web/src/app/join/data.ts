import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";

/**
 * قارئُ بابِ الانضمام.
 *
 * **بمفتاح الخدمة وبمعرّف صاحب الجلسة وحده** — عُرفُ V2: البابُ يُحرَس مرّةً في الصفحة، ثمّ
 * يُقرأ بمعرّفه في كلّ استعلام (كما في `me/data.ts`).
 */

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

export type CommitteeOption = { id: number; name: string; description: string };

export type JoinData = {
  /** له صفٌّ في `profiles`؟ شرطُ التقديم، ومن دخل بقوقل قد لا يكون له. */
  hasProfile: boolean;
  /** له صفٌّ نشطٌ في `volunteers`؟ */
  isVolunteer: boolean;
  /** رغباتُه مرتّبةً (معرّفاتُ اللجان)، فارغةٌ لمن لم يقدّم بعد. */
  prefs: number[];
  /** اللجانُ المعروضة للترتيب: نشطةٌ · تنفيذيّةٌ · لها تعريفٌ مكتوب (المصدرُ الواحد في القاعدة). */
  options: CommitteeOption[];
};

export async function getJoinData(userId: string): Promise<JoinData | null> {
  const sb = service();
  if (!sb) return null;

  const [{ data: opts }, { data: vol }, { data: prefs }, { data: profile }] = await Promise.all([
    sb.rpc("volunteer_committee_options"),
    sb.from("volunteers").select("status").eq("user_id", userId).maybeSingle(),
    sb.from("volunteer_preferences").select("rank, committee_id").eq("user_id", userId).order("rank"),
    sb.from("profiles").select("id").eq("id", userId).maybeSingle(),
  ]);

  return {
    hasProfile: !!profile,
    isVolunteer: (vol as { status?: string } | null)?.status === "active",
    prefs: ((prefs ?? []) as { committee_id: number }[]).map((p) => p.committee_id),
    options: ((opts ?? []) as CommitteeOption[]).map((o) => ({
      id: o.id,
      name: o.name,
      description: o.description,
    })),
  };
}
