import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getRegEditor } from "@/lib/regulations/authz";
import { PageHeader } from "../../_components/PageHeader";
import { getRoomIndex } from "../data";
import { RegulationsRoom } from "@/app/_ad/rooms/RegulationsRoom";
import { AdRoomError } from "@/app/_ad/states";
import { REGULATIONS_ROOM } from "@/app/_ad/rooms/regulations.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(REGULATIONS_ROOM);

/**
 * غرفةُ تحرير الأنظمة (الدستور م٦٨): الوثائقُ السبع بحالها. لكلٍّ إصدارُها النافذ، وما جُدول نفاذُه، ومسودّتُها
 * إن كانت وكم موافقةً نالت. والتحريرُ في صفحة الوثيقة. على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢)، والمجموعةُ `(room)` تحصر
 * حالتَي التحميل والخطأ في الغرفة وحدها: صفحةُ الوثيقة (`[slug]`) شقيقتُها.
 */
export default async function RegulationsPage() {
  const denied = await denyUnless("/dashboard/regulations");
  if (denied) return denied;
  const ed = await getRegEditor();
  if (!ed) {
    return (
      <>
        <PageHeader title="أنظمة أدِيب" />
        <Alert tone="warning" title="لا تملك صلاحية تحرير الأنظمة">هذه الغرفة لرئيس أدِيب والرئيس التنفيذي.</Alert>
      </>
    );
  }
  const r = await getRoomIndex(ed.sb);
  if ("error" in r) return <AdRoomError {...REGULATIONS_ROOM} message={r.error} />;

  return <RegulationsRoom rows={r.rows} serverNow={await requestNow()} view={await roomView(REGULATIONS_ROOM.viewKey, REGULATIONS_ROOM.defaultView)} />;
}
