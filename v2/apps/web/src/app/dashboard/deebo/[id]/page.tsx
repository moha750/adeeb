import { notFound } from "next/navigation";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getDeeboTalk } from "../data";
import { DeeboTalkRecordRoom } from "@/app/_ad/rooms/DeeboTalkRecordRoom";
import { AdRoomError } from "@/app/_ad/states";

/**
 * محادثةٌ بعينها من سجلّ ديبو. **قفلُها قفلُ الغرفة نفسُه** (`/dashboard/deebo` ← `manage_deebo`):
 * لا قدرةَ ثانيةٌ لصفحةٍ فرعيّةٍ من غرفةٍ واحدة، وإلّا صار للباب مفتاحان.
 *
 * على قالب «التذكرة المفتوحة» (٢٠٢٦-١١-٠٧): الحرّاسُ والجلبُ كما كانت حرفًا، والخطأُ حالُ الغرفة («القطعة» برمز السحابة المنقطعة
 * وبلاغِ الدعم، ومسارُه مسارُ السجلّ فيعرفه `report.ts`) لا تنبيهٌ تحت رأسٍ قديم. والقديمةُ `./TalkView.tsx` باقيةٌ حتى يقرّر صاحبُ الموقع حذفَها.
 */
export const metadata = { title: "محادثةٌ مع ديبو، بوّابة أدِيب" };

export default async function DeeboTalkPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/deebo");
  if (denied) return denied;

  const { id } = await params;
  const { talk, error } = await getDeeboTalk(id);

  if (error) {
    return <AdRoomError title="محادثةٌ مع ديبو" navPath="/dashboard/deebo" viewKey="deebo-talk" cols={1} what="المحادثة" message={error} />;
  }
  if (!talk) notFound();

  return <DeeboTalkRecordRoom talk={talk} />;
}
