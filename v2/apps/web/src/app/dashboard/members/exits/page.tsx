import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../_components/PageHeader";
import { getExitRequests } from "./data";
import { ExitsView } from "./ExitsView";

/**
 * **طلبات الخروج** — من يحمل منصبًا قياديًّا ويريد إنهاء عضويّته يطلب، ويُقضى في طلبه هنا.
 *
 * قفلُ الباب `view_members` كسائر غرف الأعضاء، **والمدى في القاعدة**: القاضون ثلاثةٌ
 * (رئيسُ النادي، ورئيسُ المجلس التنفيذيّ، وقائدُ إدارة الموارد) تسمّيهم
 * `can_decide_membership_exit`، وسياسةُ الجدول تحبس غيرَهم في طلباتهم هم. فمن دخل بمفتاح
 * الغرفة ولم يكن منهم رأى غرفةً فارغةً لا زرًّا معطَّلًا: هذا هو نمطُ المستودع، القفلُ
 * للغرفة والقاعدةُ تحسم من يفعل ماذا فيها.
 */
export const metadata = { title: "طلبات الخروج، بوّابة أديب" };

export default async function ExitsPage() {
  const denied = await denyUnless("/dashboard/members/exits");
  if (denied) return denied;

  const data = await getExitRequests();

  if (data.error) {
    return (
      <>
        <PageHeader title="طلبات الخروج" />
        <Alert tone="warning" title="تعذّر جلب الطلبات">{data.error}</Alert>
      </>
    );
  }

  return <ExitsView data={data} />;
}
