"use client";

import type { ReactNode } from "react";
import { Badge, Card, CardBody, CardFooter, CardHeader } from "@adeeb/design-system";
import { CalendarCheck, CalendarX, Ranking, Trophy } from "@phosphor-icons/react";
import { fmtStamp } from "@/lib/dates";
import { score } from "@/app/games/_components/hall";
import { PHASE_META, contestPhase, type BoardRow, type ContestRow } from "./vocab";

/**
 * **كرتُ مسابقة** — عنوانُها وطورُها، ثمّ على ماذا يتنافسون، وجملةُ الجوائز كما يقرؤها الشريط، وموعداها.
 * ثمّ صدارتُها من جولات نافذتها وحدَها (`game_contest_board`): المتصدّرون ما دامت جارية، والفائزون بعدها.
 * والجاريةُ كرتٌ أخضرُ النغمة: هي ما يراه زائرُ الصالة الآن.
 */
export function ContestCard({
  contest, now, board, footer,
}: {
  contest: ContestRow;
  now: number;
  /** أوائلُها، ولا تُمرَّر للقادمة ولا للقديمة بلا مقياس. */
  board?: BoardRow[];
  footer?: ReactNode;
}) {
  const phase = contestPhase(contest, now);
  const meta = PHASE_META[phase];
  const m = contest.metric;
  return (
    <Card tone={phase === "live" ? "success" : undefined}>
      <CardHeader
        className="acard-header-clip"
        icon={<Trophy aria-hidden />}
        title={contest.title}
        subtitle={contest.gameName}
        actions={<Badge tone={meta.tone} dot live={phase === "live"}>{meta.label}</Badge>}
      />
      <CardBody className="pt-3">
        <div className="flex flex-col gap-2">
          {m ? (
            <span className="inline-flex items-center gap-2 text-sm font-bold text-content">
              <Ranking aria-hidden />
              <span>{m.label}</span>
            </span>
          ) : null}
          <p className="text-sm leading-7 text-content">{contest.note}</p>
          <span className="inline-flex items-center gap-2 text-sm text-content-muted">
            <CalendarCheck aria-hidden />
            <span>تبدأ {fmtStamp(contest.startsAt)}</span>
          </span>
          <span className="inline-flex items-center gap-2 text-sm text-content-muted">
            <CalendarX aria-hidden />
            <span>تنتهي {fmtStamp(contest.endsAt)}</span>
          </span>
          {m && board ? (
            <div className="gmr-board">
              <b className="gmr-board-h">{phase === "over" ? "الفائزون" : "المتصدّرون الآن"}</b>
              {board.length ? (
                <ol>
                  {board.map((r) => (
                    <li key={r.rank}>
                      <span className="gmr-board-rank">{r.rank}</span>
                      <span className="gmr-board-who">{r.nickname}</span>
                      <span className="gmr-board-val">{score(m.unit, r.value)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <span className="text-sm text-content-muted">{phase === "over" ? "لم يلعب أحدٌ في نافذتها." : "لم يلعب أحدٌ في نافذتها بعد."}</span>
              )}
            </div>
          ) : null}
        </div>
      </CardBody>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}
