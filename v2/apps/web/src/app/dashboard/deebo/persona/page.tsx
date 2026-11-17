import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getPersona, getPersonaHistory } from "./data";
import { DeeboPersonaRoom } from "@/app/_ad/rooms/DeeboPersonaRoom";
import { createClient } from "@/lib/supabase/server";
import { loadDeeboFirstName } from "@/lib/deebo/viewer";
import { requestNow } from "@/app/_ad/now";
import { AdRoomError } from "@/app/_ad/states";

/**
 * **طبعُ ديبو** — تتمّةُ غرفة معرفته: تلك تقول ما يعرف، وهذه تقول من هو.
 *
 * كان طبعُه نصًّا في `lib/deebo/persona.ts` يُنقَل إليه من ورقة `ديبو-الهويّة.md` بيدي،
 * فسأل المالك ٢٠٢٦-٠٨-٢٢: «هل تغنيني الواجهةُ عن تدريبه بالمحادثة معك؟» — فصارت الورقةُ
 * هذه الشاشة، وصار الملفُّ سقالةً لا طبعًا (ترحيل `deebo_08`).
 */
export const metadata = { title: "شخصية ديبو" };

export default async function DeeboPersonaPage() {
  const denied = await denyUnless("/dashboard/deebo/persona");
  if (denied) return denied;

  const [{ persona, error }, history] = await Promise.all([getPersona(), getPersonaHistory()]);

  // **بالقطعة لا بالتنبيه القديم** (٢٠٢٦-١١-١٧): لوحُ الغرفة، ورمزُ السحابة المنقطعة، و«إعادة المحاولة» و«أبلغ الدعم الفني»
  if (error || !persona) return <AdRoomError title="شخصية ديبو" navPath="/dashboard/deebo/persona" what="شخصية ديبو" message={error} />;

  /* **على «المنضدة»** (اعتمده محمد ٢٠٢٦-١١-١٣، `_ad/rooms/DeeboPersonaRoom.tsx`): المعاينةُ غرفةُ ديبو العامّة بالمسوّدة، وترحيبُها يخاطب
     صاحبَ الغرفة باسمه الأوّل كما يخاطبه الموقع، والبذرةُ من الخادم (كصفحة ديبو) فيتطابق الرسمان. و`PersonaView` القديم باقٍ غيرَ مستعمل */
  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  const name = data.user ? await loadDeeboFirstName(data.user.id) : null;
  // eslint-disable-next-line react-hooks/purity -- مكوّنٌ خادميٌّ يُرسَم مرّةً لكلّ طلب: القرعةُ مقصودة
  const seed = Math.floor(Math.random() * 1_000_000);
  // المفتاحُ لحظةُ آخر تعديلٍ للطبع: بعد حفظٍ أو رجعةٍ تُبنى الغرفةُ من الطبع الجديد لا من مسوّدتها القديمة
  return <DeeboPersonaRoom key={persona.updatedAt ?? "new"} persona={persona} history={history.versions} historyReady={history.ready}
    serverNow={await requestNow()} viewerName={name} seed={seed} />;
}
