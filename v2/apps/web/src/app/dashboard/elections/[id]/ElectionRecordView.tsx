"use client";

import { ClockCounterClockwise } from "@phosphor-icons/react";
import type { ElectionDetail, ElectionLogEvent, VoteDetailRow } from "../data";
import { ElectionLog } from "../ElectionLog";
import { ElectionRecordRoom, ElectionVotes } from "@/app/_ad/rooms/ElectionRecordRoom";
import { useElectionWindows } from "@/app/_ad/rooms/ElectionWindows";
import { AdNote } from "@/app/_ad/primitives";

/**
 * **صفحةُ الانتخاب للمدير بالهويّة** (٢٠٢٦-١١-١٧): الغرفةُ (`ElectionRecordRoom`) ونوافذُها (`useElectionWindows`)، والأصواتُ للمديرين
 * وحدهم، والسجلّ. الأفعالُ تمرّ بـ`useElectionApi`: هنا الخادمُ الحقيقيّ، وفي المختبر عالمُ المحاكي.
 */
export function ElectionRecordView({ election, log, logError, votes, votesError, readOnly, canAppoint, liveTotals, hrLeader = false, serverNow }: {
  election: ElectionDetail; log: ElectionLogEvent[]; logError: string | null; votes: VoteDetailRow[]; votesError: string | null;
  readOnly: boolean; canAppoint: boolean; liveTotals: boolean; hrLeader?: boolean; serverNow: number;
}) {
  const { on, windows } = useElectionWindows(election, { readOnly, canAppoint });
  const subject = (id: string) => election.candidates.find((c) => c.id === id)?.name ?? null;
  return (
    <>
      <ElectionRecordRoom election={election} readOnly={readOnly} canAppoint={canAppoint} liveTotals={liveTotals} hrLeader={hrLeader} on={on}
        votesView={votesError ? <AdNote tone="warn" label="تفصيل الأصوات" title="تعذّر جلبه">{votesError}</AdNote> : <ElectionVotes votes={votes} />}
        logView={logError ? <AdNote tone="warn" label="سجلّ الانتخاب" title="تعذّر جلبه">{logError}</AdNote>
          : (foot) => <ElectionLog title="سجلّ الانتخاب" icon={<ClockCounterClockwise />} events={log} now={serverNow} subjectOf={subject} initial={6} foot={foot} />} />
      {windows}
    </>
  );
}
