"use client";

import { Alert } from "@adeeb/design-system";
import { PageHeader } from "../../_components/PageHeader";
import { submitSheet } from "../actions";
import type { SheetRow } from "../data";
import { RateA } from "../_views/RateA";
import { addDays } from "../_views/RoomHead";

/** صفحةُ المقيِّم: «مسار» (اختيار محمد ٢٠٢٦-١٠-٢٧)، وورقتُه تُحفظ مسوّدةً بمعرّفه. */
export function RateView({ sheets, error, userId }: { sheets: SheetRow[]; error: string | null; userId: string }) {
  if (error || sheets.length === 0) {
    return (
      <>
        <PageHeader title="قيّم القيادات" />
        {error ? <Alert tone="warning">{error}</Alert> : <Alert tone="neutral">لا تقييمَ مفتوحٌ لك الآن.</Alert>}
      </>
    );
  }
  return <RateA sheets={sheets} dueOn={addDays(sheets[0].last_day, -2)} onSubmit={submitSheet} draftOwner={userId} />;
}
