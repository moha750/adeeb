"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, SectionCard, Segmented } from "@adeeb/design-system";
import { fmtStamp } from "@/lib/dates";
import { useNow } from "@/app/games/_components/EventStrip";
import { clock, score } from "@/app/games/_components/hall";
import { PHASE_META, contestPhase, type BoardRow, type ContestRow } from "./vocab";

const DAY = 86_400_000;

/**
 * **المسابقاتُ كلُّها في قائمةٍ واحدة** — لكلّ الألعاب، فلا يُبحث عن مسابقةٍ في صفحة لعبتها. «الحاليّة» ما
 * يجري وما سيأتي بعدّاده، و«السابقة» ما انتهى بفائزه. والصفُّ يفتح مسابقاتِ لعبته.
 *
 * والعدّادُ لا يُرسم في الخادم (لا ساعة هناك): فارغٌ لحظةَ الترطيب ثمّ يدقّ (`useNow`).
 */
export function ContestsPanel({
  contests, leaders, serverNow, hrefFor,
}: {
  contests: ContestRow[];
  /** متصدّرُ كلّ مسابقةٍ بدأت (الأوّلُ من `getBoards`). */
  leaders: Record<string, BoardRow | undefined>;
  /** ساعةُ الخادم ساعةَ القراءة: تقسم الحاليّةَ من السابقة قبل أن يدقّ العدّاد. */
  serverNow: number;
  hrefFor: (c: ContestRow) => string;
}) {
  const now = useNow();
  const t = now ?? serverNow;
  const current = contests.filter((c) => contestPhase(c, t) !== "over").sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const past = contests.filter((c) => contestPhase(c, t) === "over").sort((a, b) => Date.parse(b.endsAt) - Date.parse(a.endsAt));
  const [view, setView] = useState<"now" | "past">(current.length || !past.length ? "now" : "past");
  const list = view === "now" ? current : past;

  return (
    <SectionCard
      title="المسابقات"
      actions={
        <Segmented
          aria-label="أيّ المسابقات"
          value={view}
          onValueChange={(v) => setView(v as "now" | "past")}
          items={[
            { value: "now", label: <>الحالية <span className="seg-num">{current.length}</span></> },
            { value: "past", label: <>السابقة <span className="seg-num">{past.length}</span></> },
          ]}
        />
      }
    >
      {list.length ? (
        <ol className="gmr-cx">
          {list.map((c) => {
            const phase = contestPhase(c, t);
            const lead = leaders[c.id];
            const s = Date.parse(c.startsAt);
            const e = Date.parse(c.endsAt);
            return (
              <li key={c.id}>
                <Link className="gmr-cx-row" href={hrefFor(c)} data-tone={c.tone}>
                  <span className="gmr-cx-bar" aria-hidden />
                  <span className="gmr-cx-main">
                    <b>{c.title}</b>
                    <span>{c.metric ? `${c.gameName}، ${c.metric.label}` : c.gameName}</span>
                    {lead && c.metric ? (
                      <span className="gmr-cx-lead">
                        {phase === "over" ? "الفائز" : "المتصدّر"}: <b>{lead.nickname}</b> {score(c.metric.unit, lead.value)}
                      </span>
                    ) : null}
                  </span>
                  <span className="gmr-cx-when">
                    <Badge tone={PHASE_META[phase].tone} dot live={phase === "live"}>{PHASE_META[phase].label}</Badge>
                    {phase === "over" || (phase === "soon" && s - t > 2 * DAY) ? (
                      // العدّادُ ساعاتٌ لا أيّام (`clock`): ما بعُد أكثرَ من يومين يُقرأ تاريخًا لا «120:00:00»
                      <span className="gmr-cx-date">{phase === "over" ? `انتهت ${fmtStamp(c.endsAt)}` : `تبدأ ${fmtStamp(c.startsAt)}`}</span>
                    ) : (
                      <span className="gmr-cx-clock">
                        <span>{phase === "live" ? "تنتهي بعد" : "تبدأ بعد"}</span>
                        <b dir="ltr">{clock(now == null ? null : (phase === "live" ? e : s) - now)}</b>
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="gmr-cx-empty">{view === "now" ? "لا مسابقة جارية ولا قادمة." : "لم تنتهِ مسابقة بعد."}</p>
      )}
    </SectionCard>
  );
}
