"use client";

import { useState } from "react";
import { Segmented, Stat } from "@adeeb/design-system";
import { Buildings, UserMinus, UsersFour } from "@phosphor-icons/react";
import { EmptyState } from "../../_components/EmptyState";
import { MembersView } from "../MembersView";
import type { MemberRow } from "../data";
import { CommitteeCard } from "./CommitteeCard";
import { committeesLabel, type MyCommittee, type MyUnit } from "./model";
import { PageHeader } from "../../_components/PageHeader";

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
 * **والتواصل ليس تحكّمًا** (`contact`، كما في «لجنتي»): كرتُ كلّ عضوٍ يحمل زرَّ واتساب بجوار
 * ملفّه — فالمشرف يعرف من تحته **ويكلّمهم**. ومن لا جوّالَ له لا زرَّ له.
 *
 * وأيقونات Phosphor تستعمل `createContext` فتسكن هنا (عميليّ) لا في الصفحة الخادميّة.
 */
export function SupervisedView({
  unit,
  committees,
  members,
  departed,
  mayManageData,
}: {
  unit: MyUnit | null;
  committees: MyCommittee[];
  members: MemberRow[];
  /** من غادر لجانَه **أثناء ولايته** — الحدُّ الزمنيّ في `lib/mySupervision` لا هنا. */
  departed: MemberRow[];
  mayManageData: boolean;
}) {
  const [view, setView] = useState<"committee" | "member" | "departed">("committee");

  // الأعداد تُشتقّ من اللجان نفسها لا تُمرَّر — فلا رقمان لسؤالٍ واحد يفترقان يومًا
  const people = new Set(committees.flatMap((c) => c.members.map((m) => m.userId))).size;
  const gaps = committees.filter((c) => !c.leader || !c.deputy).length;

  return (
    <>
      <PageHeader title="من أشرف عليهم" />

      <div className="stat-grid">
        <Stat icon={<Buildings />} value={committees.length} label={committeesLabel(committees.length)} tone="brand" />
        <Stat icon={<UsersFour />} value={people} label="عضوًا تحت إشرافك" tone="success" />
        <Stat icon={<UserMinus />} value={gaps} label="لجنة تنقصها قيادة" tone={gaps ? "danger" : "success"} />
      </div>

      {/* محورٌ واحدٌ لا محوران: **أيّ كشفٍ أرى من نطاقي** — لجانُه، ثمّ أهلُها، ثمّ من غادرها.
          ولذا سُمّيت الثلاثة أسماءً متناظرة (كانت «حسب اللجنة»/«حسب العضو» فصارت اسمَين
          كثالثهما): «السابقون» لا تُقال «حسب…»، فلو بقيت الصيغة القديمة لدُسّ محورُ الحالة
          في مبدّل طريقة العرض. */}
      <Segmented
        aria-label="أيّ كشف"
        value={view}
        onValueChange={(v) => setView(v as "committee" | "member" | "departed")}
        items={[
          { value: "committee", label: "اللجان" },
          { value: "member", label: "الأعضاء" },
          { value: "departed", label: "السابقون" },
        ]}
      />

      {view === "departed" ? (
        // جدول الإنهاء نفسه (`lockedStatus` يبدّل الأعمدة إلى: التاريخ · من أنهى · السبب)،
        // ولا `contact` هنا: من غادر لا يُدعى إلى واتساب اللجنة.
        <MembersView
          headless
          mode="reach"
          lockedStatus="suspended"
          members={departed}
          mayManageData={mayManageData}
          emptyNote="لم يغادر أحدٌ من لجانك منذ أُسنِدت إليك."
        />
      ) : view === "member" ? (
        <MembersView headless mode="reach" contact members={members} mayManageData={mayManageData} />
      ) : committees.length === 0 ? (
        <EmptyState
          variant="soft"
          icon={<UsersFour />}
          title="لا لجان تحت إشرافك بعد"
          description={
            unit
              ? `يوزّع قائد ${unit.name} اللجان من «توزيع الإشراف»، وتظهر هنا حالما تُسنَد إليك أولاها.`
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
