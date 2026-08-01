import { notFound } from "next/navigation";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import type { Section } from "@/lib/capabilities";
import { MembersScreen } from "../MembersScreen";
import type { MemberStatus } from "../data";

// حالات لها صفحات مستقلّة في التنقّل (غير النشط نادر → يظهر ضمن «كل الأعضاء» فقط).
// ولكلّ حالةٍ قفلها: «قيد الإكمال» قفلها `view_pending_members` — وحامِلوه أوسع من حامِلي
// `view_members`، فمن يقبل الطلبات يرى من لم يُكمل بياناته دون أن يرى سجلّ العضويّة كلّه.
const VALID: Record<string, { status: MemberStatus; section: Section }> = {
  active: { status: "active", section: "/dashboard/members/active" },
  pending: { status: "pending", section: "/dashboard/members/pending" },
  suspended: { status: "suspended", section: "/dashboard/members/suspended" },
};

export default async function MembersByStatusPage({ params }: { params: Promise<{ status: string }> }) {
  const { status } = await params;
  const locked = VALID[status];
  if (!locked) notFound();

  const denied = await denyUnless(locked.section);
  if (denied) return denied;

  return <MembersScreen lockedStatus={locked.status} />;
}
