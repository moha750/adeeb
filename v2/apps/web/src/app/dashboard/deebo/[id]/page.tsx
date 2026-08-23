import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getDeeboTalk } from "../data";
import { TalkView } from "./TalkView";
import { PageHeader } from "../../_components/PageHeader";

/**
 * محادثةٌ بعينها من سجلّ ديبو. **قفلُها قفلُ الغرفة نفسُه** (`/dashboard/deebo` ← `manage_deebo`):
 * لا قدرةَ ثانيةٌ لصفحةٍ فرعيّةٍ من غرفةٍ واحدة، وإلّا صار للباب مفتاحان.
 */
export const metadata = { title: "محادثةٌ مع ديبو، بوّابة أديب" };

export default async function DeeboTalkPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/deebo");
  if (denied) return denied;

  const { id } = await params;
  const { talk, error } = await getDeeboTalk(id);

  if (error) {
    return (
      <>
        <PageHeader title="محادثةٌ مع ديبو" crumbLeaf="محادثة" />
        <Alert tone="warning" title="تعذّر جلب المحادثة">{error}</Alert>
      </>
    );
  }
  if (!talk) notFound();

  return <TalkView talk={talk} />;
}
