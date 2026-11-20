"use client";

import { Gauge } from "@phosphor-icons/react";
import { WarningCircle } from "@/app/_components/glyphs";
import { AccountRoom } from "@/app/_ad/account";
import { AdEmpty } from "@/app/_ad/primitives";
import { MineRoom } from "@/app/_ad/rooms/MineRoom";
import type { MyResultRow } from "../data";
import type { MineProps } from "../_views/MineA";

/** نتيجتي على الهويّة (`_ad/rooms/MineRoom`، اعتمدها محمد ٢٠٢٦-١١-٢٠)، وكانت «ميزان» (`_views/MineA`). */
export function MineView({ results, comments, gender, error }: MineProps & { results: MyResultRow[]; error: string | null }) {
  if (error || results.length === 0) {
    return (
      <AccountRoom navPath="/dashboard/evaluation/mine" title="نتيجتي">
        {error
          ? <AdEmpty icon={<WarningCircle />} title="تعذّرت قراءة نتيجتك" desc={error} />
          : <AdEmpty icon={<Gauge />} title="لا نتيجةَ لك بعد" desc="تصلك نتيجتُك هنا حين تُنفَّذ دورةٌ قيّمك فيها أعضاؤك والمجلس." />}
      </AccountRoom>
    );
  }
  return <MineRoom results={results} comments={comments} gender={gender} />;
}
