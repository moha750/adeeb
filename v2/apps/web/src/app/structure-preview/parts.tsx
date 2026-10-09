"use client";

import type { ChartUnit } from "@adeeb/design-system";
import type { PubPerson } from "./data";
import { Face } from "./Face";
import type { TNode } from "./tree";

/** أجزاءُ العقدة: وجهُها ونصُّها، ووحداتُ العدّ — مصدرٌ واحد لكلّ ما يُكرَّر في الشجرة. */

export const MEMBER: ChartUnit = { one: "عضو", two: "عضوان", few: "أعضاء", many: "عضوًا" };
export const COMMITTEE: ChartUnit = { one: "لجنة", two: "لجنتان", few: "لجان", many: "لجنة" };

export const href = (p: PubPerson) => (p.slug ? `/m/${encodeURIComponent(p.slug)}` : undefined);

/** وجهُ العقدة ونائبُها ملاصقًا له، أو دائرةٌ خالية لمقعدٍ بلا شاغل. */
export function NodeFaces({ n, size, pair = "var(--tr-fp)" }: { n: TNode; size: string; pair?: string }) {
  return (
    <span className="tr-faces">
      {n.face ? <Face p={n.face} size={size} /> : <span className="pf pf-none tr-vacant" style={{ ["--pf-s" as string]: size }} aria-hidden />}
      {n.pair ? <Face p={n.pair} size={pair} className="tr-pair" /> : null}
    </span>
  );
}

export function NodeText({ n, extra }: { n: TNode; extra?: React.ReactNode }) {
  return (
    <span className="tr-tx">
      <span className="tr-label">{n.label}</span>
      {n.sub ? <span className="tr-sub">{n.sub}</span> : null}
      {n.role ? <span className="tr-role">{n.role}</span> : null}
      {n.pair ? <span className="tr-role">{`${n.pair.title ?? "نائب"} ${n.pair.name}`}</span> : null}
      {extra}
    </span>
  );
}
