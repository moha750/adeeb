import { notFound, redirect } from "next/navigation";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import type { Section } from "@/lib/capabilities";
import { getCurrentAdmin } from "@/lib/auth";
import { getMembers, type MemberStatus } from "../data";
import { MembersRoom } from "@/app/_ad/rooms/MembersRoom";
import { AdRoomError } from "@/app/_ad/states";
import { MEMBERS_ROOM } from "@/app/_ad/rooms/members.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(MEMBERS_ROOM);

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
  const initialTab = tab === "former" ? "suspended" : "active";

  // **على قالب «قائمة السجلّات» بكرت الشخص** (٢٠٢٦-١١-٠٣): الجلبُ جلبُ `MembersScreen` كما هو، والغرفةُ `MembersRoom`.
  // ولا مساراتٍ أبناءَ للمجلّد، فحالتا التحميل والخطأ بجانب الصفحة.
  const [{ members, warningLimit, moveTargets, error }, me] = await Promise.all([getMembers(), getCurrentAdmin()]);
  if (error) return <AdRoomError {...MEMBERS_ROOM} message={error} />;

  const caps = me?.caps ?? [];
  // قسمُ السابقين لمن يملك مفتاحَه وحده — وبلاه لا مبدّل ولا يُفتح عليه ولو طُلب بالرابط
  const formerTab = caps.includes("view_suspended_members");

  return (
    <MembersRoom
      // **السابقون لا يُرسَلون إلى من لا يراهم** (٢٠٢٦-١١-٠٣): كانت بياناتُ إنهائهم (السببُ ومن أنهى) تصل المتصفّحَ لكلّ من يفتح
      // الصفحة ثمّ يُخفيها المبدّل؛ فالآن لا تخرج من الخادم أصلًا إلّا لصاحب `view_suspended_members`.
      members={formerTab ? members : members.filter((m) => m.status !== "suspended")}
      lockedStatus={locked.status}
      // «إضافة عضو» في الفراغ يتبع مفتاحَ صاحبه (`manage_member_data`)، وبنودُ القائمة تتبع سلطةَ كلّ صفّ
      warningLimit={warningLimit}
      // وجهاتُ النقل — والبندُ نفسه يتبع سلطةَ الصفّ (`canMove`) لا هذه القائمة
      moveTargets={moveTargets}
      formerTab={formerTab}
      initialTab={formerTab ? initialTab : "active"}
      serverNow={await requestNow()}
      view={await roomView(MEMBERS_ROOM.viewKey, MEMBERS_ROOM.defaultView)}
    />
  );
}
