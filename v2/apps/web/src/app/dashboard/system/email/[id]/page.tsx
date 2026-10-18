import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { PageHeader } from "../../../_components/PageHeader";
import { getMail } from "../data";
import { MailView } from "./MailView";

/**
 * رسالةٌ بعينها من سجلّ البريد. **قفلُها قفلُ الغرفة** (`/dashboard/system/email` ← `manage_website`):
 * صفحةٌ فرعيّةٌ من غرفةٍ واحدةٍ لا مفتاحَ ثانيًا لها.
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
    return (
      <>
        <PageHeader title="رسالة" crumbLeaf="رسالة" />
        <Alert tone="warning" title="تعذّر جلب الرسالة">{error}</Alert>
      </>
    );
  }
  if (!mail) notFound();
  return <MailView mail={mail} />;
}
