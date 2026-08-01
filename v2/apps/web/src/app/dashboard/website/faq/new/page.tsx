import { FaqForm } from "../FaqForm";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";

export default async function NewFaqPage() {
  const denied = await denyUnless("/dashboard/website/faq");
  if (denied) return denied;

  if (!(await getWebsiteManager("faq"))) return <WebsiteDenied section="الأسئلة الشائعة" />;
  return <FaqForm />;
}
