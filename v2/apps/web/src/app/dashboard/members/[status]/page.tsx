import { notFound } from "next/navigation";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import type { Section } from "@/lib/capabilities";
import { MembersScreen } from "../MembersScreen";
import type { MemberStatus } from "../data";

// حالات لها صفحات مستقلّة في التنقّل (غير النشط نادر → يظهر ضمن «كل الأعضاء» فقط)،
// ولكلّ حالةٍ قفلُها. و«قيد الإكمال» سقط ٢٠٢٦-٠٨-٠٤ بسقوط الحالة نفسها.
const VALID: Record<string, { status: MemberStatus; section: Section }> = {
  active: { status: "active", section: "/dashboard/members/active" },
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
