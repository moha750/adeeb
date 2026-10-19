import { denyUnless } from "../../_shell/guard";
import { PageHeader } from "../../_components/PageHeader";
import { getIrfanOversight } from "./data";
import { OversightView } from "./OversightView";

export const metadata = { title: "إشراف عِرفان، بوّابة أدِيب" };

/**
 * **إشرافُ عِرفان** — لحساب أدِيب المؤسسيّ وحده (`oversee_irfan`، وجهُ «المرآة»). أرقامُ الموسم ورسائلُه كلُّها بنصوصها. والحارسُ هنا قبل
 * القراءة: `getIrfanOversight` يقرأ بمفتاح الخدمة، فلا يُنادى إلّا بعد أن يُفتح البابُ لصاحبه.
 */
export default async function IrfanOversightPage() {
  const denied = await denyUnless("/dashboard/irfan/oversight");
  if (denied) return denied;
  const data = await getIrfanOversight();
  return (
    <>
      <PageHeader title="إشراف عِرفان" crumbLeaf="الإشراف" parent={{ label: "عِرفان", href: "/dashboard/irfan" }} />
      <OversightView data={data} />
    </>
  );
}
