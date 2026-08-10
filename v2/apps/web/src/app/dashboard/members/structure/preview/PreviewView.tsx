"use client";

import { useState } from "react";
import { Alert, Segmented } from "@adeeb/design-system";
import { MapPin, TreeStructure } from "@phosphor-icons/react";
import { MapView, type YouAre } from "../MapView";
import { StructureView } from "../StructureView";
import type { StructureModel } from "../model";

/**
 * قشرةُ المعاينة — مبدّلٌ بين **المقترح** و**الحاليّ** على البيانات نفسها، فالفرق يُرى لا يُوصف.
 * صفحةُ عرضٍ للمالك وحدها (قفلُ الغرفة `view_org_structure`)، تُحذف يوم يُقَرّ المقترح أو يُردّ.
 */
const VIEWS = [
  { value: "new", label: <span className="seg-lbl"><MapPin /> المقترح</span> },
  { value: "old", label: <span className="seg-lbl"><TreeStructure /> الحاليّ</span> },
];

export function PreviewView({ model, you }: { model: StructureModel; you: YouAre }) {
  const [view, setView] = useState<"new" | "old">("new");
  return (
    <div className="org">
      <Alert tone="info" title="معاينةٌ لا تبويب">
        هذه الشاشة لك وحدك: التبويب الحيّ لم يتغيّر، والباب لم يُفتح لأحدٍ بعد. بدّل بين «المقترح»
        و«الحاليّ» لترى الفرق على بيانات القاعدة نفسها، وما تقرّه يحلّ محلّ الشجرات الثلاث ويأخذ اسمها.
      </Alert>

      <div className="viewbar">
        <Segmented items={VIEWS} value={view} onValueChange={(v) => setView(v as "new" | "old")} aria-label="المقترح أو الحاليّ" />
      </div>

      {view === "new" ? <MapView model={model} you={you} /> : <StructureView model={model} />}
    </div>
  );
}
