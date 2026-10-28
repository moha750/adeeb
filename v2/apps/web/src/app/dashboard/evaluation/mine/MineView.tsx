"use client";

import { Alert } from "@adeeb/design-system";
import { PageHeader } from "../../_components/PageHeader";
import type { MyResultRow } from "../data";
import { MineA, type MineProps } from "../_views/MineA";

/** نتيجتي: «ميزان» (اختيار محمد ٢٠٢٦-١٠-٢٧). */
export function MineView({ results, comments, gender, error }: MineProps & { results: MyResultRow[]; error: string | null }) {
  if (error || results.length === 0) {
    return (
      <>
        <PageHeader title="نتيجتي" />
        {error ? <Alert tone="warning">{error}</Alert> : <Alert tone="neutral">لا نتيجةَ لك بعد.</Alert>}
      </>
    );
  }
  return <MineA results={results} comments={comments} gender={gender} />;
}
