import { notFound } from "next/navigation";
import { getMemberOptions, getShowEditor } from "../data";
import { ShowEditorRoom } from "@/app/_ad/rooms/ShowEditorRoom";
import { getRadioManager } from "@/lib/radio/authz";
import { RadioDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { AdRoomError } from "@/app/_ad/states";

export default async function ShowEditorPage({ params }: { params: Promise<{ showId: string }> }) {
  const denied = await denyUnless("/dashboard/radio");
  if (denied) return denied;

  if (!(await getRadioManager())) return <RadioDenied />;

  const { showId } = await params;
  const [{ data, error }, members] = await Promise.all([getShowEditor(showId), getMemberOptions()]);

  // **بالقطعة لا بالتنبيه القديم** (٢٠٢٦-١١-١٧): لوحُ الغرفة، ورمزُ السحابة المنقطعة، و«إعادة المحاولة» و«أبلغ الدعم الفني»
  if (error) return <AdRoomError title="البرنامج" navPath="/dashboard/radio" what="البرنامج" message={error} />;
  if (!data) notFound();

  // **محرّرُ البرنامج على المنضدة** (`ShowEditorRoom`، اعتمده محمد ٢٠٢٦-١١-١٦ بعد المختبر `/dashboard/ad/show-editor`). و`ShowEditorView` القديمُ نُقل للحذف بقراره (٢٠٢٦-١١-٢٠)
  return (
    <ShowEditorRoom
      show={data.show}
      episodes={data.episodes}
      platforms={data.platforms}
      members={members}
      showTalkStart={data.showTalkStart}
    />
  );
}
