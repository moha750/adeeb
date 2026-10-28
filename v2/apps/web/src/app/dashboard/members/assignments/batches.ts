import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { positionLine } from "@/lib/positionLabel";
import type { OrgData } from "../structure/orgData";

/** دفعةٌ مجدولة كما تُعرض فوق لوحة المقاعد: يومُها، وسببُها (سجلٌّ داخليّ يراه أهلُ هذه الغرفة)، ونقلاتُها. */
export type ScheduledBatch = {
  id: number;
  effectiveOn: string;
  reason: string | null;
  creatorName: string | null;
  canCancel: boolean;
  moves: { userId: string; name: string; avatar: string | null; gender: "male" | "female" | null; to: string }[];
};

type Row = { id: number; effective_on: string; reason: string | null; created_by: string | null; moves: unknown };
type Move = { userId?: string; roleName?: string; committeeId?: number | null; departmentId?: number | null };

/**
 * الدفعاتُ المجدولة (٢٠٢٦-١٠-٢٣). تُقرأ بمفتاح الخدمة (الجدولُ مغلقٌ عن العموم)، وتُسمّى من بيانات الهيكلة
 * المجلوبة أصلًا فلا استعلامَ لكلّ اسم. ويلغيها منشئُها والرئيسان — والقاعدةُ تحكم بذلك ثانيةً (`cancel_position_batch`).
 */
export async function getScheduledBatches(org: OrgData, meId: string | null): Promise<ScheduledBatch[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return [];
  const sb = createAdeebServiceClient(url, key);
  const { data, error } = await sb
    .from("position_batches")
    .select("id, effective_on, reason, created_by, moves")
    .eq("status", "scheduled")
    .order("effective_on", { ascending: true })
    .order("id", { ascending: true });
  if (error || !data) return [];

  const person = new Map(org.profiles.map((p) => [p.id, p]));
  const roleAr = new Map(org.roles.map((r) => [r.role_name, r.role_name_ar || r.role_name]));
  const comAr = new Map(org.committees.map((c) => [c.id, c.committee_name_ar]));
  const deptAr = new Map(org.departments.map((d) => [d.id, d.name_ar]));
  const president = !!meId && org.userRoles.some((r) => r.user_id === meId && (r.role_name === "club_president" || r.role_name === "executive_council_president"));
  const gender = (g: string | null | undefined): "male" | "female" | null => (g === "male" || g === "female" ? g : null);

  return (data as Row[]).map((b) => {
    const moves = (Array.isArray(b.moves) ? (b.moves as Move[]) : []).map((m) => {
      const p = m.userId ? person.get(m.userId) : undefined;
      const unit = m.committeeId != null ? comAr.get(m.committeeId) ?? null : m.departmentId != null ? deptAr.get(m.departmentId) ?? null : null;
      return {
        userId: m.userId ?? "",
        name: p?.full_name ?? "عضو",
        avatar: p?.avatar_url ?? null,
        gender: gender(p?.gender),
        to: positionLine(roleAr.get(m.roleName ?? "") ?? m.roleName, unit) ?? "",
      };
    });
    return {
      id: b.id,
      effectiveOn: b.effective_on,
      reason: b.reason,
      creatorName: b.created_by ? person.get(b.created_by)?.full_name ?? null : null,
      canCancel: president || (!!meId && b.created_by === meId),
      moves,
    };
  });
}
