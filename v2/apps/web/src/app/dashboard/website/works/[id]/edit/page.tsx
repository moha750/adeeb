import { notFound } from "next/navigation";
import { getWorkForEdit } from "../../data";
import { WorkForm } from "../../WorkForm";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { AdRoomError } from "@/app/_ad/states";

// عنوانُ التبويب اسمُ الغرفة (محمد ٢٠٢٦-١١-٠٣)، وكانت «بوّابة أدِيب» وحدها (٢٠٢٦-١١-٢٠)
export const metadata = { title: "تحرير العمل، بوّابة أدِيب" };

export default async function EditWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/website/works");
  if (denied) return denied;

  if (!(await getWebsiteManager("works"))) return <WebsiteDenied section="الأعمال" />;

  const { id } = await params;
  const { work, error } = await getWorkForEdit(id);

  // **بالقطعة لا بالتنبيه القديم** (٢٠٢٦-١١-١٧): لوحُ الغرفة، ورمزُ السحابة المنقطعة، و«إعادة المحاولة» و«أبلغ الدعم الفني»
  if (error) return <AdRoomError title="تحرير العمل" navPath="/dashboard/website/works" what="العمل" message={error} />;
  if (!work) notFound();

  return <WorkForm work={work} />;
}
