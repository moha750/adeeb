import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { AdRoomDenied, AdRoomError } from "@/app/_ad/states";
import { VisionPlanRoom } from "@/app/_ad/rooms/VisionPlanRoom";
import { requestNow } from "@/app/_ad/now";
import { getCurrentAdmin } from "@/lib/auth";
import { getPlan, planAccess, seesPlan } from "../data";
import { getCreditPeople, withPositionTitles } from "@/lib/people";

export const metadata: Metadata = { title: "محرّر الرؤية" };

/**
 * **محرّرُ الرؤية على المنضدة** (`VisionPlanRoom`، ٢٠٢٦-١١-٢٢): المسوّدةُ بمساراتها وأهدافها وعلامتها وفكرتها، والمنضدةُ صفحتُها العامّة كما
 * ستُرى. يكتبها من يُعدّ الرؤى، ويراها الرئيسان فيوافقان أو يُعيدانها.
 */
export default async function VisionPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/vision/plans");
  if (denied) return denied;
  const me = await getCurrentAdmin();
  if (!me) return null;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const access = await planAccess(me.id, id);
  if (!access || !(access.drafter || access.president)) {
    return <AdRoomDenied title="محرّر الرؤية" navPath="/dashboard/vision" what="إعداد الرؤى" desc="هذه الغرفة لإدارة الضمان والجودة والرئيسين." />;
  }
  const { data, error } = await getPlan(id);
  if (error) return <AdRoomError title="محرّر الرؤية" navPath="/dashboard/vision/plans" what="الرؤية" message={error} />;
  // مسوّدةُ غيرك قبل إرسالها كأنّها لم تكن: لا يُعرف حتى وجودُها (محمد ٢٠٢٦-١١-٢٤)
  if (!data || !seesPlan(data, access)) notFound();
  // المحرّرُ يُبنى من جديد حين تتبدّل حالُ المسوّدة أو موافقاتُها؛ وحفظٌ من مكانٍ آخر تردّه نسخةُ المسوّدة (`plan_rev`) عند الحفظ
  // بِركةُ أهل أدِيب لنافذة الفريق: تحت كلّ اسمٍ منصبُه، وتُرسَل لمن يسمّي وحده (من يُعدّ الرؤى، والمسوّدةُ تُكتب أو الرؤيةُ سارية)
  const naming = (data.status === "draft" && access.owns) || (data.status === "active" && access.drafter);
  const people = naming ? await getCreditPeople().then(withPositionTitles) : [];
  return <VisionPlanRoom key={`${data.id}-${data.status}-${data.approvals.length}`} doc={data} access={access} people={people} now={await requestNow()} />;
}
