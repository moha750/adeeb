"use client";

import { useState } from "react";
import { Segmented, Stat } from "@adeeb/design-system";
import { Bank, Buildings, Columns, ListDashes, TreeStructure, UsersThree } from "@phosphor-icons/react";
import { LineageView } from "./LineageView";
import { SpineView } from "./SpineView";
import { CascadeView } from "./CascadeView";
import type { StructureModel } from "./model";

// قشرة الهيكلة — إحصاءات + مبدّل تصميمٍ للشجرة يوجّه لثلاثة تصاميم تتشارك النموذج:
// (الملاحظات نُقلت إلى تبويب «تعيين المناصب» حيث تُعالَج.)
// الأنساب (شجرة موصولة) · المِحوَر (outline مُزاح) · الأعمدة (تنقّل Miller). مرحلة اختيارٍ يبقى بعدها الفائز.
type View = "lineage" | "spine" | "cascade";

const VIEWS = [
  { value: "lineage", label: <span className="seg-lbl"><TreeStructure weight="bold" /> الأنساب</span> },
  { value: "spine", label: <span className="seg-lbl"><ListDashes weight="bold" /> المِحوَر</span> },
  { value: "cascade", label: <span className="seg-lbl"><Columns weight="bold" /> الأعمدة</span> },
];

export function StructureView({ model }: { model: StructureModel }) {
  const [view, setView] = useState<View>("lineage");

  const s = model.stats;
  const stats = [
    { n: s.councils, l: "مجالس", icon: <Bank weight="fill" /> },
    { n: s.administrations, l: "إدارات", icon: <Bank weight="fill" /> },
    { n: s.departments, l: "أقسام", icon: <Buildings weight="fill" /> },
    { n: s.committees, l: "لجان", icon: <UsersThree weight="fill" /> },
  ];

  return (
    <div className="org">
      <div className="stat-grid">{stats.map((x) => <Stat key={x.l} icon={x.icon} value={x.n} label={x.l} />)}</div>

      <div className="viewbar">
        <Segmented items={VIEWS} value={view} onValueChange={(v) => setView(v as View)} aria-label="تصميم عرض الشجرة" />
      </div>

      {view === "lineage" ? <LineageView model={model} /> : view === "spine" ? <SpineView model={model} /> : <CascadeView model={model} />}
    </div>
  );
}
