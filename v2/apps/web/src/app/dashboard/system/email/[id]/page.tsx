import { notFound } from "next/navigation";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { EmailRecordRoom } from "@/app/_ad/rooms/EmailRecordRoom";
import { AdRoomError } from "@/app/_ad/states";
import { getMail } from "../data";

/**
 * رسالةٌ بعينها من سجلّ البريد. **قفلُها قفلُ الغرفة** (`/dashboard/system/email` ← `manage_website`):
 * صفحةٌ فرعيّةٌ من غرفةٍ واحدةٍ لا مفتاحَ ثانيًا لها.
 *
 * على قالب «التذكرة المفتوحة» (٢٠٢٦-١١-٠٧). الحرّاسُ والجلبُ كما كانت حرفًا؛ والخطأُ حالُ الغرفة («تعذّر جلب الرسالة» بنصّه
 * وبلاغِ الدعم) لا تنبيهٌ تحت رأسٍ قديم. والصفحةُ القديمة `./MailView.tsx` باقيةٌ حتى يقرّر صاحبُ الموقع حذفَها.
 */
export const metadata = { title: "رسالةٌ من سجلّ البريد، بوّابة أدِيب" };
export const dynamic = "force-dynamic";

export default async function MailPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/system/email");
  if (denied) return denied;

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const me = await getCurrentAdmin();
  const { mail, error } = await getMail(id, me?.caps ?? []);
  if (error) {
    return <AdRoomError title="رسالة" navPath="/dashboard/system/email" viewKey="email-record" cols={1} what="الرسالة" message={error} />;
  }
  if (!mail) notFound();
  return <EmailRecordRoom mail={mail} />;
}
