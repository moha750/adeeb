"use client";

import Link from "next/link";
import { ColumnBars, SectionCard } from "@adeeb/design-system";
import { Trend } from "./Trend";
import { NOUNS, countNoun, type GameDay, type GameRow, type GameWeek } from "./vocab";

const nf = (n: number) => n.toLocaleString("en-US");
const dayFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn", { weekday: "long", timeZone: "UTC" });

/** نبضُ لعبةٍ في آخر سبعة أيّام، والسبعةُ التي قبلها للمقارنة. */
export type GamePulse = {
  runs: number;
  runsBefore: number;
  players: number;
  playersBefore: number;
  /** جولاتُ كلّ يومٍ من السبعة، أقدمُها أوّلًا: `day` بصيغة YYYY-MM-DD. */
  days: { day: string; runs: number }[];
};

/** مجموعُ حقلٍ في شريحةٍ من الأيّام (والفارغُ صفر). */
export const sumOf = (d: GameDay[], k: "runs" | "players" | "visitors" | "score" | "hits" | "answered") =>
  d.reduce((s, x) => s + (x[k] ?? 0), 0);

/** من أيّام الشهر (`game_days`) جولاتُ الأسبوعين، ومن `game_weeks` لاعبوهما الفريدون. */
export function pulseOf(days: GameDay[], week: GameWeek | undefined): GamePulse {
  const last = days.slice(-7);
  return {
    runs: sumOf(last, "runs"), runsBefore: sumOf(days.slice(-14, -7), "runs"),
    players: week?.players[0] ?? 0, playersBefore: week?.players[1] ?? 0,
    days: last.map((x) => ({ day: x.day, runs: x.runs })),
  };
}

/**
 * **آخرُ سبعة أيّام** — هل اللعبةُ حيّة؟ لكلّ لعبةٍ عمود: جولاتُها ولاعبوها وفرقُهما عن الأسبوع الذي
 * قبله، وأعمدةُ أيّامها السبعة بنغمتها. والمجموعُ منذ البداية في صفحتها لا هنا: «2,583 جولة» لا تقول
 * إن كان أحدٌ لعب اليوم.
 */
export function WeekPulse({ games, days, weeks }: { games: GameRow[]; days: Record<string, GameDay[]>; weeks: Record<string, GameWeek> }) {
  return (
    <SectionCard title="آخر سبعة أيام">
      <div className="gmr-pulse">
        {games.map((g) => {
          const p = days[g.slug]?.length ? pulseOf(days[g.slug], weeks[g.slug]) : null;
          return (
            <Link key={g.slug} href={`/dashboard/games/${g.slug}`} className="gmr-pulse-col" data-tone={g.tone}>
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
