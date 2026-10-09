import { notFound, redirect } from "next/navigation";
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

export default async function MembersByStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ status: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { status } = await params;
  const locked = VALID[status];
  if (!locked) notFound();

  const denied = await denyUnless(locked.section);
  if (denied) return denied;

  // **«أعضاء سابقون» صار قسمًا داخل «أعضاء أدِيب»** (قرار المالك ٢٠٢٦-١٠-٠٩): بندُه سقط من
  // القائمة، ومسارُه باقٍ لروابط الناس المحفوظة يحوّل إلى القسم. وقفلُه يبقى في الخريطة يحرس
  // المبدّلَ نفسَه (`view_suspended_members`)، ولا أحدَ يملكه دون قفل الأعضاء.
  if (locked.status === "suspended") redirect("/dashboard/members/active?tab=former");

  const { tab } = await searchParams;
  return <MembersScreen lockedStatus={locked.status} initialTab={tab === "former" ? "suspended" : "active"} />;
}
