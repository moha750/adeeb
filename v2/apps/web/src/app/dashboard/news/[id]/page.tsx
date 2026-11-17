import { notFound } from "next/navigation";
import { getNewsroomActor } from "@/lib/news/authz";
import { getActivityOptions, getMemberOptions, getNewsDetail, getUnitOptions } from "../data";
import { getCreditPeople } from "@/lib/people";
import { NewsEditorRoom } from "@/app/_ad/rooms/NewsEditorRoom";
import { NewsroomDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { requestNow } from "@/app/_ad/now";
import { AdRoomError } from "@/app/_ad/states";

export default async function NewsEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/news");
  if (denied) return denied;

  const actor = await getNewsroomActor();
  if (!actor) return <NewsroomDenied />;

  const { id } = await params;
  // بِركةُ النسبة تُجلب للكاتب أيضًا: «الكتّاب» و«مصوّر الغلاف» حقلا تكليفٍ قد يملكهما،
  // فلو قُصرت على رئيس التحرير لرأى الكاتبُ منتقيًا فارغًا لا يعرف أحدًا.
  const [{ detail, error }, members, units, people, activities] = await Promise.all([
    getNewsDetail(id, actor),
    actor.isChief ? getMemberOptions() : Promise.resolve([]),
    actor.isChief ? getUnitOptions() : Promise.resolve([]),
    getCreditPeople(),
    actor.isChief ? getActivityOptions() : Promise.resolve([]),
  ]);

  // **بالقطعة لا بالتنبيه القديم** (٢٠٢٦-١١-١٧): لوحُ الغرفة، ورمزُ السحابة المنقطعة، و«إعادة المحاولة» و«أبلغ الدعم الفني»
  if (error) return <AdRoomError title="غرفة تحرير أدِيب" navPath="/dashboard/news" what="الخبر" message={error} />;
  // لا خبر — أو خبرٌ لا شأن لهذا الفاعل به. الجوابان واحد: لا نُفصح عن وجوده.
  if (!detail) notFound();

  return (
    // **«المنضدة»** (قالبُ «مساحة العمل»، ٢٠٢٦-١١-١٣): التحريرُ بجانب الخبر كما سيُنشر. والسلوكُ كلُّه من `useNewsDraft`
    // (استُخرج من `NewsEditorView` حرفًا)، والقديمُ باقٍ في الملفّات حتى يقرّر المالكُ حذفه
    <NewsEditorRoom
      detail={detail}
      members={members}
      units={units}
      activities={activities}
      people={people}
      isChief={actor.isChief}
      meId={actor.userId}
      serverNow={await requestNow()}
    />
  );
}
