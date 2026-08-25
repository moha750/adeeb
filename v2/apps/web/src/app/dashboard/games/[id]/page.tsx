import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../_components/PageHeader";
import { requestOrigin } from "@/lib/games/origin";
import { getHostSnapshot } from "../data";
import { HostView } from "./HostView";

export default async function HostPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/games");
  if (denied) return denied;

  const { id } = await params;
  const { snapshot, error } = await getHostSnapshot(id);

  if (error || !snapshot) {
    return (
      <>
        <PageHeader title="مِقوَدُ الغرفة" crumbLeaf="مِقوَد" />
        <Alert tone="warning" title="لم يُعثر على الغرفة">
          {error ?? "إمّا أنّها حُذفت، وإمّا أنّ الرابط خاطئ. عُد إلى قائمة الغرف."}
        </Alert>
      </>
    );
  }

  return <HostView initial={snapshot} origin={await requestOrigin()} />;
}
