import { denyUnless } from "@/app/dashboard/_shell/guard";
import { Alert } from "@adeeb/design-system";
import { getCertificates } from "./data";
import { CertificatesView } from "./CertificatesView";

export const metadata = { title: "شهادات الخبرة — بوّابة أديب" };

export default async function CertificatesPage() {
  const denied = await denyUnless("/dashboard/members/certificates");
  if (denied) return denied;

  const data = await getCertificates();
  if (data.error) {
    return <Alert tone="danger" title="تعذّر جلب شهادات الخبرة">{data.error}</Alert>;
  }
  return <CertificatesView data={data} />;
}
