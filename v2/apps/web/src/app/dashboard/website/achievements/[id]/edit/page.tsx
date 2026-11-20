import { notFound } from "next/navigation";
import { getAchievementForEdit } from "../../data";
import { AchievementForm } from "../../AchievementForm";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { AdRoomError } from "@/app/_ad/states";

// عنوانُ التبويب اسمُ الغرفة (محمد ٢٠٢٦-١١-٠٣)، وكانت «بوّابة أدِيب» وحدها (٢٠٢٦-١١-٢٠)
export const metadata = { title: "تحرير الإحصائيّة، بوّابة أدِيب" };

export default async function EditAchievementPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/website/achievements");
  if (denied) return denied;

  if (!(await getWebsiteManager("achievements"))) return <WebsiteDenied section="الإحصاءات" />;

  const { id } = await params;
  const { item, error } = await getAchievementForEdit(id);

  // **بالقطعة لا بالتنبيه القديم** (٢٠٢٦-١١-١٧): لوحُ الغرفة، ورمزُ السحابة المنقطعة، و«إعادة المحاولة» و«أبلغ الدعم الفني»
  if (error) return <AdRoomError title="تحرير الإحصائيّة" navPath="/dashboard/website/achievements" what="الإحصائيّة" message={error} />;
  if (!item) notFound();

  return <AchievementForm item={item} />;
}
