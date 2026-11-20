"use client";

import { ClipboardText } from "@phosphor-icons/react";
import { WarningCircle } from "@/app/_components/glyphs";
import { AccountRoom } from "@/app/_ad/account";
import { AdEmpty } from "@/app/_ad/primitives";
import { RateRoom } from "@/app/_ad/rooms/RateRoom";
import { getMyBallot, submitSheet } from "../actions";
import type { SheetRow } from "../data";
import { addDays } from "../_views/RoomHead";

/** صفحةُ المقيِّم على الهويّة (`_ad/rooms/RateRoom`، اعتمدها محمد ٢٠٢٦-١١-٢٠)، وكانت «مسار» (`_views/RateA`). وورقتُه تُحفظ مسوّدةً بمعرّفه. */
export function RateView({ sheets, error, userId }: { sheets: SheetRow[]; error: string | null; userId: string }) {
  if (error || sheets.length === 0) {
    return (
      <AccountRoom navPath="/dashboard/evaluation/rate" title="قيّم القيادات">
        {error
          ? <AdEmpty icon={<WarningCircle />} title="تعذّرت قراءة أوراقك" desc={error} />
          : <AdEmpty icon={<ClipboardText />} title="لا تقييمَ مفتوحٌ لك الآن" desc="تصلك ورقةُ كلِّ قائدٍ تقيّمه يومَ تُفتح الدورة، ويصلك تنبيهٌ بها." />}
      </AccountRoom>
    );
  }
  return <RateRoom sheets={sheets} dueOn={addDays(sheets[0].last_day, -2)} onSubmit={submitSheet} loadMine={getMyBallot} draftOwner={userId} />;
}
