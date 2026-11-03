import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getSurveyManager } from "@/lib/surveys/authz";
import { getSurveys } from "../data";
import { SurveysRoom } from "@/app/_ad/rooms/SurveysRoom";
import { AdRoomError } from "@/app/_ad/states";
import { SURVEYS_ROOM } from "@/app/_ad/rooms/meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(SURVEYS_ROOM);

/**
 * غرفةُ الاستبيانات على قالب «قائمة السجلّات» (٢٠٢٦-١٠-٣١). المجموعةُ `(room)` تحصر حالتَي التحميل والخطأ في
 * الغرفة وحدها: البنّاءُ والنتائجُ والإنشاءُ (`[id]`، `new`) أشقّاؤها، فلا ترى هيكلَ القائمة وهي تُفتح.
 */
export default async function SurveysPage() {
  const denied = await denyUnless("/dashboard/surveys");
  if (denied) return denied;

  // الهويّةُ من الجلسة الحقيقيّة: القائمةُ استبياناتُ صاحب الجلسة وما شُورك معه، لا غير
  const mgr = await getSurveyManager();
  const { surveys, error } = mgr
    ? await getSurveys(mgr.userId)
    : { surveys: [], error: "تعذّر التحقّق من صلاحيتك في الاستبيانات. حدّث الصفحة." };
  if (error) return <AdRoomError {...SURVEYS_ROOM} message={error} />;

  return <SurveysRoom surveys={surveys} serverNow={await requestNow()} view={await roomView(SURVEYS_ROOM.viewKey, SURVEYS_ROOM.defaultView)} />;
}
