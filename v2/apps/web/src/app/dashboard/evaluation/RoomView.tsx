"use client";

import { useRouter } from "next/navigation";
import { ClipboardText } from "@phosphor-icons/react";
import { WarningCircle } from "@/app/_components/glyphs";
import { AccountRoom } from "@/app/_ad/account";
import { AdEmpty } from "@/app/_ad/primitives";
import { EvaluationRoom } from "@/app/_ad/rooms/EvaluationRoom";
import { chooseReturn, correctRater, loadElectorate, recomputeTarget } from "./actions";
import type { CycleRow, TargetRow } from "./data";

/**
 * غرفةُ الإدارة على الهويّة (`_ad/rooms/EvaluationRoom`، اعتمدها محمد ٢٠٢٦-١١-٢٠)، وكانت «أقسامٌ وصفوف» (`_views/RoomRows`).
 * تبديلُ الدورة مسارٌ (`?cycle=`) لا حالة، فيُحفظ ويُرسَل.
 */
export function RoomView(props: {
  cycles: CycleRow[];
  cycleId: number | null;
  targets: TargetRow[];
  departments: Record<number, string>;
  committees: { id: number; name: string }[];
  people: { id: string; name: string }[];
  canManage: boolean;
  canViewResults: boolean;
  error: string | null;
}) {
  const router = useRouter();
  if (props.error || props.cycleId === null) {
    return (
      <AccountRoom navPath="/dashboard/evaluation" title="إدارة التقييم">
        {props.error
          ? <AdEmpty icon={<WarningCircle />} title="تعذّرت قراءة التقييم" desc={props.error} />
          : <AdEmpty icon={<ClipboardText />} title="لا دورةَ تقييمٍ بعد" desc="تُفتح أوّلُ دورةٍ في موعدها، ويُعرف مقيَّموها يومَ فتحها." />}
      </AccountRoom>
    );
  }
  return (
    <EvaluationRoom
      cycles={props.cycles}
      cycleId={props.cycleId}
      onCycle={(id) => router.push(`/dashboard/evaluation?cycle=${id}`)}
      targets={props.targets}
      departments={props.departments}
      canManage={props.canManage}
      canViewResults={props.canViewResults}
      loadElectorate={loadElectorate}
      onChanged={() => router.refresh()}
      people={props.people}
      committees={props.committees}
      actions={{ correctRater, recompute: recomputeTarget, chooseReturn }}
    />
  );
}
