"use client";

import Link from "next/link";
import { useNow } from "@/app/games/_components/EventStrip";
import { clock } from "@/app/games/_components/hall";
import type { ContestRow } from "./vocab";

/**
 * **شريطُ المسابقة في صدر الغرفة** — الجاريةُ أو القادمة، بعدّادها. وهو بابٌ إلى مسابقات لعبتها.
 * والعدّادُ لا يُرسم في الخادم (لا ساعة هناك)، فيبقى فارغًا لحظةَ الترطيب ثمّ يدقّ.
 */
export function LiveContest({ contest, href }: { contest: ContestRow; href: string }) {
  const now = useNow();
  const s = Date.parse(contest.startsAt);
  const e = Date.parse(contest.endsAt);
  if (now != null && now >= e) return null;
  const before = now != null && now < s;
  return (
    <Link href={href} className="gmr-live" data-tone={contest.tone}>
      <span className="gmr-live-dot" aria-hidden />
      <span className="gmr-live-t">
        <b>{contest.title}</b>
        <span>{now == null ? " " : before ? `قادمة في ${contest.gameName}، تبدأ بعد` : `جارية في ${contest.gameName}، تنتهي بعد`}</span>
      </span>
      <span className="gmr-live-clock" dir="ltr">{clock(now == null ? null : (before ? s : e) - now)}</span>
    </Link>
  );
}
