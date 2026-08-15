import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { getMemberOptions, getShowEditor } from "../data";
import { ShowEditorView } from "./ShowEditorView";
import { getRadioManager } from "@/lib/radio/authz";
import { RadioDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../_components/PageHeader";

export default async function ShowEditorPage({ params }: { params: Promise<{ showId: string }> }) {
  const denied = await denyUnless("/dashboard/radio");
  if (denied) return denied;

  if (!(await getRadioManager())) return <RadioDenied />;

  const { showId } = await params;
  const [{ data, error }, members] = await Promise.all([getShowEditor(showId), getMemberOptions()]);

  if (error) {
    return (
      <>
        <PageHeader title="البرنامج" />
        <Alert tone="warning" title="تعذّر جلب البرنامج">{error}</Alert>
      </>
    );
  }
  if (!data) notFound();

  return (
    <ShowEditorView
      show={data.show}
      episodes={data.episodes}
      platforms={data.platforms}
      members={members}
      showTalkStart={data.showTalkStart}
    />
  );
}
