import { Alert } from "@adeeb/design-system";
import { getOrgData } from "../orgData";
import { buildStructure } from "../model";
import { PreviewView } from "./PreviewView";
import { NO_YOU, type YouAre } from "../MapView";
import { getCurrentAdmin } from "@/lib/auth";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../../_components/PageHeader";

const Head = () => (
  <PageHeader title="هيكلة أديب" crumbLeaf="معاينة المقترح" />
);

/**
 * معاينةُ «خريطة العضو» — صفحةٌ مؤقّتة تعرض المقترح على بيانات القاعدة قبل أن يمسّ التبويب.
 * قفلُها قفلُ الغرفة نفسه (`view_org_structure`، يُشتقّ من مسار القسم) فلا يبلغها إلّا من يبلغه.
 * تُحذف يوم يُقَرّ المقترح أو يُردّ — ولا يُبقى على معاينةٍ بعد قرارها.
 */
export default async function StructurePreviewPage() {
  const denied = await denyUnless("/dashboard/members/structure");
  if (denied) return denied;

  const [org, me] = await Promise.all([getOrgData(), getCurrentAdmin()]);
  if (org.error) {
    return (
      <>
        <Head />
        <Alert tone="warning" title="تعذّر جلب الهيكلة">{org.error}</Alert>
      </>
    );
  }

  const model = buildStructure(org.councils, org.departments, org.committees, org.roles, org.userRoles, org.profiles, org.supervision);

  // **موضعُ القارئ** — من صفوفه هو لا من `myScope`: تلك تسأل «هل له غرفةٌ يقودها»، وهذه تسأل
  // «أين هو من الهيكل» — وعضوُ اللجنة له موضعٌ ولا غرفةَ له. والهويّة من `getCurrentAdmin`
  // فتسري معاينةُ «انظر بعين» على الوسم كما تسري على سائر الشاشة.
  const mine = me ? org.userRoles.filter((r) => r.user_id === me.id) : [];
  const councilOfCommittee = new Map(org.committees.map((c) => [c.id, c.council_id]));
  const seatRoles = new Map(org.roles.filter((r) => r.membership_kind === "member").map((r) => [r.role_name, r.council_type]));
  const committees = [...new Set(mine.map((r) => r.committee_id).filter((x): x is number => x != null))];
  const councils = [...new Set([
    // مقعدُ مجلسٍ يجلس فيه (لا مجرّد تبعيّةٍ لفرعه): `membership_kind = 'member'`
    ...mine.map((r) => seatRoles.get(r.role_name)).filter(Boolean),
    ...committees.map((id) => councilOfCommittee.get(id)).filter(Boolean),
  ] as string[])];
  const you: YouAre = me ? {
    committees,
    departments: [...new Set(mine.map((r) => r.department_id).filter((x): x is number => x != null))],
    councils,
    // اللجنةُ التنفيذيّة أوّلًا هدفًا لزرّ «موقعي» — وإلّا فأوّلُ ما له
    home: committees.find((id) => councilOfCommittee.get(id) !== "administrative") ?? committees[0] ?? null,
  } : NO_YOU;

  return (
    <>
      <Head />
      <PreviewView model={model} you={you} />
    </>
  );
}
