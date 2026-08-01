"use client";

import { useState } from "react";
import { Segmented, Stat } from "@adeeb/design-system";
import { Buildings, UserMinus, UsersFour } from "@phosphor-icons/react";
import { EmptyState } from "../../_components/EmptyState";
import { MembersView } from "../MembersView";
import type { MemberRow } from "../data";
import { CommitteeCard } from "./CommitteeCard";
import { committeesLabel, type MyCommittee, type MyUnit } from "./model";

/**
 * «من أشرف عليهم» — شاشة المشرف: لجانُه وقيادتُها، وأعضاؤها.
 *
 * **عينان على نطاقٍ واحد**، والمبدّل يقول أيّهما (كـ«توزيع الإشراف»): «حسب اللجنة» كرتٌ لكلّ
 * لجنةٍ يشرف عليها — قائدُها ونائبها ونظيرُه من الإدارة الأخرى وعددُ أعضائها — فيُرى ما ينقص
 * قيادتَها؛ و«حسب العضو» سجلُّ أعضائها جدولًا يُبحَث ويُرشَّح.
 *
 * **والقيادة تُعرَض ولا تُفعَّل:** قائد اللجنة ونائبها خارج سلطة المشرف عمدًا
 * (`membership_authority`)، فالأفعال تبقى في الجدول حيث تقول القاعدة نعم.
 *
 * وأيقونات Phosphor تستعمل `createContext` فتسكن هنا (عميليّ) لا في الصفحة الخادميّة.
 */
export function SupervisedView({
  unit,
  committees,
  members,
  mayManageData,
}: {
  unit: MyUnit | null;
  committees: MyCommittee[];
  members: MemberRow[];
  mayManageData: boolean;
}) {
  const [view, setView] = useState<"committee" | "member">("committee");

  // الأعداد تُشتقّ من اللجان نفسها لا تُمرَّر — فلا رقمان لسؤالٍ واحد يفترقان يومًا
  const people = new Set(committees.flatMap((c) => c.members.map((m) => m.userId))).size;
  const gaps = committees.filter((c) => !c.leader || !c.deputy).length;

  return (
    <>
      <div className="ash-phead">
        <div>
          <div className="ash-crumb">أديب › أعضاء أديب › <b>من أشرف عليهم</b></div>
          <h1>من أشرف عليهم</h1>
        </div>
      </div>

      <div className="stat-grid">
        <Stat icon={<Buildings weight="fill" />} value={committees.length} label={committeesLabel(committees.length)} tone="brand" />
        <Stat icon={<UsersFour weight="fill" />} value={people} label="عضوًا تحت إشرافك" tone="success" />
        <Stat icon={<UserMinus weight="fill" />} value={gaps} label="لجنة تنقصها قيادة" tone={gaps ? "danger" : "success"} />
      </div>

      <Segmented
        aria-label="طريقة العرض"
        value={view}
        onValueChange={(v) => setView(v as "committee" | "member")}
        items={[{ value: "committee", label: "حسب اللجنة" }, { value: "member", label: "حسب العضو" }]}
      />

      {view === "member" ? (
        <MembersView headless mode="reach" members={members} mayManageData={mayManageData} />
      ) : committees.length === 0 ? (
        <EmptyState
          variant="soft"
          icon={<UsersFour weight="duotone" />}
          title="لا لجان تحت إشرافك بعد"
          description={
            unit
              ? `يوزّع قائد ${unit.name} اللجان من «توزيع الإشراف» — وتظهر هنا حالما تُسنَد إليك أولاها.`
              : "لا يظهر لك إشرافٌ لأنّك لست من أعضاء الإدارات الإشرافيّة."
          }
        />
      ) : (
        <div className="card-grid">
          {committees.map((c) => <CommitteeCard key={c.id} committee={c} />)}
        </div>
      )}
    </>
  );
}
