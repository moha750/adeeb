import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getRegEditor } from "@/lib/regulations/authz";
import { PageHeader } from "../../_components/PageHeader";
import { getRoomDoc, riyadhToday } from "../data";
import { RegEditor } from "./RegEditor";

export default async function RegulationEditPage({ params }: { params: Promise<{ slug: string }> }) {
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
  const { slug } = await params;
  const doc = await getRoomDoc(ed.sb, slug);
  if (!doc) notFound();
  return <RegEditor doc={doc} seat={ed.seat} today={riyadhToday()} />;
}
