import { Alert } from "@adeeb/design-system";
import { getFaqs } from "./data";
import { FaqView } from "./FaqView";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";

export default async function FaqPage() {
  const denied = await denyUnless("/dashboard/website/faq");
  if (denied) return denied;

  if (!(await getWebsiteManager("faq"))) return <WebsiteDenied section="الأسئلة الشائعة" />;

  const { faqs, error } = await getFaqs();

  if (error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <div className="ash-crumb">أديب › المحتوى › الصفحة الرئيسية › <b>الأسئلة الشائعة</b></div>
            <h1>الأسئلة الشائعة</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب الأسئلة">{error}</Alert>
      </>
    );
  }

  return <FaqView faqs={faqs} />;
}
