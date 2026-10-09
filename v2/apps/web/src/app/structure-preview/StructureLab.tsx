"use client";

import { useState } from "react";
import { Segmented, countPhrase, type ChartUnit } from "@adeeb/design-system";
import type { PubStructure } from "./data";
import { GrowTree } from "./GrowTree";
import { HelmView } from "./HelmView";
import { PrevTree } from "./PrevTree";
import { RingsView } from "./RingsView";
import { ShapesView } from "./ShapesView";
import { SpineView } from "./SpineView";

/**
 * **معرضُ ما عُرض كلِّه بترتيبه** — طلب المالك أن يرى التصاميم السابقة ليتذكّر أيّها كان (٢٠٢٦-١٠-٠٩)،
 * مع الإبقاء على «تتفتّح» الحاليّة. يبقى واحدٌ ويُحذف المعرضُ وأخواته.
 */
type V = "shapes" | "spine" | "rings" | "helm" | "prev" | "now";
const VERSIONS = [
  { value: "shapes", label: "١ المشهد والفهرس" },
  { value: "spine", label: "٢ الخطّ العموديّ" },
  { value: "rings", label: "٣ حلقات الوجوه" },
  { value: "helm", label: "٤ الدفّة" },
  { value: "prev", label: "٥ تتفتّح الأولى" },
  { value: "now", label: "تتفتّح الحاليّة" },
];

const VOLUNTEER: ChartUnit = { one: "متطوّع", two: "متطوّعان", few: "متطوّعين", many: "متطوّعًا" };

export function StructureLab({ s }: { s: PubStructure }) {
  const [v, setV] = useState<V>("shapes");
  return (
    <>
      {/* ستّةُ أزرارٍ أعرضُ من الجوّال: المبدّلُ يُمرَّر وحدَه ولا تتّسع له الصفحة */}
      <div className="overflow-x-auto pb-10">
        <div className="mx-auto w-max">
          <Segmented items={VERSIONS} value={v} onValueChange={(x) => setV(x as V)} aria-label="التصميم" />
        </div>
      </div>
      {v === "shapes" ? <ShapesView s={s} /> : v === "spine" ? <SpineView s={s} /> : v === "rings" ? <RingsView s={s} /> : v === "helm" ? <HelmView s={s} /> : v === "prev" ? <PrevTree s={s} /> : <GrowTree s={s} />}
      {s.counts.volunteers > 0 ? <p className="hk-coda">ومعهم {countPhrase(s.counts.volunteers, VOLUNTEER)}</p> : null}
    </>
  );
}
