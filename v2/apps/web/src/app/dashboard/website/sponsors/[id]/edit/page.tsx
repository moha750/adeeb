import { notFound } from "next/navigation";
import { getSponsorForEdit } from "../../data";
import { SponsorForm } from "../../SponsorForm";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { AdRoomError } from "@/app/_ad/states";

// عنوانُ التبويب اسمُ الغرفة (محمد ٢٠٢٦-١١-٠٣)، وكانت «بوّابة أدِيب» وحدها (٢٠٢٦-١١-٢٠)
export const metadata = { title: "تحرير الراعي، بوّابة أدِيب" };

export default async function EditSponsorPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/website/sponsors");
  if (denied) return denied;

  if (!(await getWebsiteManager("sponsors"))) return <WebsiteDenied section="الرعاة" />;

  const { id } = await params;
  const { sponsor, error } = await getSponsorForEdit(id);

  // **بالقطعة لا بالتنبيه القديم** (٢٠٢٦-١١-١٧): لوحُ الغرفة، ورمزُ السحابة المنقطعة، و«إعادة المحاولة» و«أبلغ الدعم الفني»
  if (error) return <AdRoomError title="تحرير الراعي" navPath="/dashboard/website/sponsors" what="الراعي" message={error} />;
  if (!sponsor) notFound();

  return <SponsorForm sponsor={sponsor} />;
}
