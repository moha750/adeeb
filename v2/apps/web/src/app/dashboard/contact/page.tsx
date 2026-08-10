import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { Breadcrumb } from "../_shell/Breadcrumb";
import { getContactMessages } from "./data";
import { ContactView } from "./ContactView";

/**
 * **رسائل التواصل** — الطرفُ الآخر من قسم «تواصل معنا» في الصفحة الرئيسيّة.
 * قفلُ الباب `manage_contact` (في `lib/capabilities.ts`)، والصفوف كلُّها تُقرأ بمفتاح
 * الخدمة — فالتفويض عند الباب لا في الاستعلام.
 */
export const metadata = { title: "رسائل التواصل، بوّابة أديب" };

export default async function ContactPage() {
  const denied = await denyUnless("/dashboard/contact");
  if (denied) return denied;

  const { rows, error } = await getContactMessages();

  if (error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <Breadcrumb />
            <h1>رسائل التواصل</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب الرسائل">{error}</Alert>
      </>
    );
  }

  return <ContactView rows={rows} />;
}
