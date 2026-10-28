"use client";

import { useRouter } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { PageHeader } from "../_components/PageHeader";
import { chooseReturn, correctRater, loadElectorate, recomputeTarget } from "./actions";
import type { CycleRow, TargetRow } from "./data";
import { RoomRows } from "./_views/RoomRows";

/** غرفةُ الإدارة: «أقسامٌ وصفوف» (اختيار محمد ٢٠٢٦-١٠-٢٧). تبديلُ الدورة مسارٌ (`?cycle=`) لا حالة، فيُحفظ ويُرسَل. */
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
      <>
        <PageHeader title="إدارة التقييم" />
        <Alert tone={props.error ? "warning" : "neutral"}>{props.error ?? "لا دورةَ تقييمٍ بعد."}</Alert>
      </>
    );
  }
  return (
    <RoomRows
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
