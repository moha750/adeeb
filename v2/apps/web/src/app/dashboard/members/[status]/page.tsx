import { notFound } from "next/navigation";
import { MembersScreen } from "../MembersScreen";
import type { MemberStatus } from "../data";

// حالات لها صفحات مستقلّة في التنقّل (غير النشط نادر → يظهر ضمن «كل الأعضاء» فقط)
const VALID: Record<string, MemberStatus> = {
  active: "active",
  pending: "pending",
  suspended: "suspended",
};

export default async function MembersByStatusPage({ params }: { params: Promise<{ status: string }> }) {
  const { status } = await params;
  const locked = VALID[status];
  if (!locked) notFound();
  return <MembersScreen lockedStatus={locked} />;
}
