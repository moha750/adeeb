"use client";

import Link from "next/link";
import { ColumnBars, SectionCard } from "@adeeb/design-system";
import { ChartBar } from "@phosphor-icons/react";
import { Trend } from "./Trend";
import { NOUNS, PERIOD, countNoun, type GameDay, type GameRow, type GamePeriod } from "./vocab";

const nf = (n: number) => n.toLocaleString("en-US");
const dayFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn", { day: "numeric", month: "long", timeZone: "UTC" });

/** نبضُ لعبةٍ في النافذة (`PERIOD`)، والمدّةُ نفسُها قبلها للمقارنة. */
export type GamePulse = {
  runs: number;
  runsBefore: number;
  players: number;
  playersBefore: number;
  /** جولاتُ كلّ يومٍ من النافذة، أقدمُها أوّلًا: `day` بصيغة YYYY-MM-DD. */
  days: { day: string; runs: number }[];
};

/** مجموعُ حقلٍ في شريحةٍ من الأيّام (والفارغُ صفر). */
export const sumOf = (d: GameDay[], k: "runs" | "players" | "visitors" | "score" | "hits" | "answered") =>
  d.reduce((s, x) => s + (x[k] ?? 0), 0);

/** من `game_days` جولاتُ المدّتين، ومن `game_periods` لاعبوهما الفريدون. */
export function pulseOf(days: GameDay[], period: GamePeriod | undefined): GamePulse {
  const last = days.slice(-PERIOD);
  return {
    runs: sumOf(last, "runs"), runsBefore: sumOf(days.slice(-2 * PERIOD, -PERIOD), "runs"),
    players: period?.players[0] ?? 0, playersBefore: period?.players[1] ?? 0,
    days: last.map((x) => ({ day: x.day, runs: x.runs })),
  };
}

/**
 * **آخرُ ثلاثين يومًا** — هل اللعبةُ حيّة؟ لكلّ لعبةٍ عمود: جولاتُها ولاعبوها وفرقُهما عن الثلاثين التي
 * قبلها، وأعمدةُ أيّامها. والمجموعُ منذ البداية في صفحتها لا هنا: «2,583 جولة» لا تقول
 * إن كان أحدٌ لعب اليوم.
 */
export function MonthPulse({ games, days, periods }: { games: GameRow[]; days: Record<string, GameDay[]>; periods: Record<string, GamePeriod> }) {
  return (
    <SectionCard title="آخر 30 يومًا" icon={<ChartBar />}>
      <div className="gmr-pulse">
        {games.map((g) => {
          const p = days[g.slug]?.length ? pulseOf(days[g.slug], periods[g.slug]) : null;
          return (
            <Link key={g.slug} href={`/dashboard/games/${g.slug}`} className="gmr-pulse-col">
              <span className="gmr-pulse-name">{g.name}</span>
              {p ? (
                <>
                  <span className="gmr-pulse-figs">
                    <span className="gmr-pulse-fig">
                      <b>{nf(p.runs)}</b>
                      <span>{countNoun(p.runs, NOUNS.RUN)}</span>
                      <Trend now={p.runs} before={p.runsBefore} />
                    </span>
                    <span className="gmr-pulse-fig">
                      <b>{nf(p.players)}</b>
                      <span>{countNoun(p.players, NOUNS.PLAYER)}</span>
                      <Trend now={p.players} before={p.playersBefore} />
                    </span>
                  </span>
                  <ColumnBars
                    height={64}
                    bars={p.days.map((d, i) => ({
                      value: d.runs,
                      label: dayFmt.format(new Date(`${d.day}T00:00:00Z`)),
                      tick: i === p.days.length - 1 ? "اليوم" : undefined,
                    }))}
                  />
                </>
              ) : (
                <span className="gmr-pulse-none">لا أرقام لها بعد.</span>
              )}
            </Link>
          );
        })}
      </div>
    </SectionCard>
  );
}
