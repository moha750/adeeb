import "server-only";
import { getMembers } from "@/app/dashboard/members/data";
import { getOrgData } from "@/app/dashboard/members/structure/orgData";
import { buildStructure, committeeNodes } from "@/app/dashboard/members/structure/model";
import { myCommittees } from "@/app/dashboard/members/supervised/model";
import { getDepartedInMyWatch } from "@/lib/mySupervision";
import { getMyScope } from "@/lib/myScope";
import { AdRoomError } from "../states";
import { roomView } from "../view-server";
import { requestNow } from "../now";
import { MembersRoom } from "./MembersRoom";
import { leadFromMine, leadFromNode, seatOf } from "./committee-lead";
import { SUPERVISED_ROOM } from "./supervised.meta";
import { DEPARTMENT_ROOM } from "./department.meta";
import { COMMITTEE_ROOM } from "./committee.meta";

/**
 * **غرفُ الأشخاص الثلاث بمصدرٍ واحد** (٢٠٢٦-١١-٠٣): «من أشرف عليهم» و«قسمي» و«لجنتي» — كلٌّ يُبنى لصاحبه (`userId`) بالجلب
 * والنطاق نفسيهما اللذين كانت صفحاتُها القديمة تجريهما حرفًا. والصفحةُ تحرس بابَها ثمّ تستدعي هذه بمعرّف صاحب الجلسة؛ والمختبرُ
 * (`dashboard/ad/units`) يستدعيها بمعرّف مشرفٍ أو منسّقٍ أو قائدٍ حقيقيّ، فيُرى ما يراه صاحبُها بعينه.
 */

/** في المختبر وحده: «لجنة الفعاليات (كما يراها ريان، القائد)» — فيُعرف بعين من تُرى الغرفة */
const labTitle = (title: string, as?: string) => (as ? `${title} (كما يراها ${as})` : title);

/** «من أشرف عليهم» — لجانُ المشرف مواضع، ومن غادرها أثناء ولايته «السابقون»؛ والأفعالُ بسلطة القاعدة على كلّ صفّ، والتواصلُ ظاهر. */
export async function SupervisedRoomFor({ userId, as }: { userId: string; as?: string }) {
  const [{ members, warningLimit, moveTargets, error }, org, departed] = await Promise.all([
    getMembers(), getOrgData(), getDepartedInMyWatch(userId),
  ]);
  const failed = error ?? org.error ?? departed.error;
  if (failed) return <AdRoomError {...SUPERVISED_ROOM} message={failed} />;
  const { unit, list } = myCommittees(userId, org.committees, org.departments, org.roles, org.userRoles, org.supervision, org.profiles);
  // والقائدُ ونائبُه كرتان بين أعضاء لجنتهما بشارة دورهما (كانا في كرت اللجنة وحده) — وسلطةُ المشرف عليهما ما تقوله القاعدة لكلّ صفّ
  const ids = new Set(list.flatMap((c) => [c.leader?.userId, c.deputy?.userId, ...c.members.map((m) => m.userId)].filter(Boolean) as string[]));
  // المشرفُ نفسُه مقعدُ إدارته في صفّ كلّ لجنة («أنت»)
  const meRow = members.find((m) => m.id === userId);
  const self = unit && meRow
    ? {
        unitName: unit.name,
        person: { id: meRow.id, name: meRow.name, avatar: meRow.avatar, gender: meRow.gender },
        // منذ متى يشرف على كلّ لجنة — من صفّ إسنادها في `committee_supervision`
        since: (cid: number) => org.supervision.find((x) => x.committee_id === cid && x.supervisor_id === userId)?.assigned_at ?? null,
      }
    : undefined;
  const rows = [
    ...members.filter((m) => ids.has(m.id) && m.status !== "suspended"),
    ...members.filter((m) => departed.ids.has(m.id)),
  ];
  return (
    <MembersRoom
      members={rows}
      mode="reach"
      contact
      committees={list.map((c) => leadFromMine(c, self))}
      title={labTitle(SUPERVISED_ROOM.title, as)}
      viewerId={userId}
      seatRows={members}
      navPath={SUPERVISED_ROOM.navPath}
      viewKey={SUPERVISED_ROOM.viewKey}
      warningLimit={warningLimit}
      moveTargets={moveTargets}
      emptyTitle={list.length ? undefined : "لا لجان تحت إشرافك بعد"}
      emptyNote={
        list.length
          ? "لم يغادر أحدٌ من لجانك منذ أُسنِدت إليك."
          : unit
            ? `يوزّع قائد ${unit.name} اللجان من «توزيع الإشراف»، وتظهر هنا حالما تُسنَد إليك أولاها.`
            : "لا يظهر لك إشرافٌ لأنّك لست من أعضاء الإدارات الإشرافيّة."
      }
      serverNow={await requestNow()}
      view={await roomView(SUPERVISED_ROOM.viewKey, SUPERVISED_ROOM.defaultView)}
    />
  );
}

/** «قسمي» — لجانُ القسم مواضع، عرضًا محضًا (`readOnly`)، وقروبُ القسم على اللوح. */
export async function DepartmentRoomFor({ userId, as }: { userId: string; as?: string }) {
  const scope = await getMyScope(userId);
  const base = { navPath: DEPARTMENT_ROOM.navPath, viewKey: DEPARTMENT_ROOM.viewKey, readOnly: true, serverNow: await requestNow(), view: await roomView(DEPARTMENT_ROOM.viewKey, DEPARTMENT_ROOM.defaultView) };
  if (!scope.department) {
    return (
      <MembersRoom
        {...base}
        members={[]}
        title={DEPARTMENT_ROOM.title}
        emptyTitle="لا قسم تنسّقه"
        emptyNote="هذه الشاشة لمنسّقي الأقسام: لجانُ القسم وقيادتُها وأعضاؤها عرضًا. ولا يظهر لك كشفٌ لأنّك لست منسّق قسم."
      />
    );
  }
  const [org, { members, error }] = await Promise.all([getOrgData(), getMembers()]);
  const failed = org.error ?? error;
  if (failed) return <AdRoomError {...DEPARTMENT_ROOM} title={scope.department.name} message={failed} />;
  const nodes = committeeNodes(org.committees, org.roles, org.userRoles, org.profiles, org.supervision);
  const committees = org.committees
    .filter((c) => c.department_id === scope.department?.id)
    .sort((a, b) => a.id - b.id)
    .flatMap((c) => { const n = nodes.get(c.id); return n ? [n] : []; });
  const link = org.departments.find((d) => d.id === scope.department?.id)?.group_link ?? null;
  // منسّقُ القسم — رأسُ صفّ القيادة (عقدةُ القسم من الهيكلة نفسِها)
  const dnode = buildStructure(org.councils, org.departments, org.committees, org.roles, org.userRoles, org.profiles, org.supervision)
    .executive.departments.find((d) => d.id === scope.department?.id);
  const mine = new Set(committees.flatMap((c) => [c.leader?.userId, c.deputy?.userId, ...c.members.map((m) => m.userId)].filter(Boolean) as string[]));
  return (
    <MembersRoom
      {...base}
      members={members.filter((m) => mine.has(m.id) && m.status !== "suspended")}
      committees={committees.map((c) => leadFromNode(c, scope.department?.name))}
      title={labTitle(scope.department.name, as)}
      unitHead={{ title: "منسّق القسم", person: seatOf(dnode?.head), unit: scope.department.name }}
      viewerId={userId}
      seatRows={members}
      seatContact
      groupLink={link ? { label: "قروب القسم", href: link } : undefined}
      emptyNote="لا أعضاء في لجان قسمك بعد."
    />
  );
}

/** «لجنتي» — لجنةٌ واحدة بلا مبدّل، عرضًا محضًا والتواصلُ ظاهر، وقروبُ اللجنة على اللوح. */
export async function CommitteeRoomFor({ userId, as }: { userId: string; as?: string }) {
  const scope = await getMyScope(userId);
  const base = { navPath: COMMITTEE_ROOM.navPath, viewKey: COMMITTEE_ROOM.viewKey, readOnly: true, contact: true, serverNow: await requestNow(), view: await roomView(COMMITTEE_ROOM.viewKey, COMMITTEE_ROOM.defaultView) };
  if (!scope.committee) {
    return (
      <MembersRoom
        {...base}
        members={[]}
        title={COMMITTEE_ROOM.title}
        emptyTitle="لا لجنة تقودها"
        emptyNote="هذه الشاشة لقادة اللجان التنفيذيّة ونوّابهم: كشفُ اللجنة عرضًا. ولا يظهر لك كشفٌ لأنّك لا تشغل مقعد قيادةٍ في لجنة."
      />
    );
  }
  const [org, { members, error }] = await Promise.all([getOrgData(), getMembers()]);
  const failed = org.error ?? error;
  if (failed) return <AdRoomError {...COMMITTEE_ROOM} title={scope.committee.name} message={failed} />;
  const node = committeeNodes(org.committees, org.roles, org.userRoles, org.profiles, org.supervision).get(scope.committee.id);
  if (!node) {
    return (
      <MembersRoom
        {...base}
        members={[]}
        title={scope.committee.name}
        emptyTitle="لجنةٌ غير مفعّلة"
        emptyNote={`${scope.committee.name} لا تظهر في الهيكلة الحيّة. راجِع حالتها في «هيكلة أدِيب».`}
      />
    );
  }
  const link = org.committees.find((c) => c.id === node.id)?.group_link ?? null;
  const mine = new Set([node.leader?.userId, node.deputy?.userId, ...node.members.map((m) => m.userId)].filter(Boolean) as string[]);
  return (
    <MembersRoom
      {...base}
      members={members.filter((m) => mine.has(m.id) && m.status !== "suspended")}
      committees={[leadFromNode(node, org.departments.find((d) => d.id === org.committees.find((c) => c.id === node.id)?.department_id)?.name_ar)]}
      title={labTitle(node.name, as)}
      viewerId={userId}
      seatRows={members}
      groupLink={link ? { label: "قروب اللجنة", href: link } : undefined}
      emptyNote="لا أعضاء في لجنتك بعد."
    />
  );
}
