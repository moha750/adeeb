"use client";

import { BarList, Donut, SectionCard } from "@adeeb/design-system";
import { GameController, Sparkle, Users } from "@phosphor-icons/react";
import { CheckCircle, Eye } from "@/app/_components/glyphs";
import { GameOverview, type OverviewKpi } from "./GameOverview";
import { sumOf } from "./WeekPulse";
import { NOUNS, countNoun, type BankStats, type DarbLeaders, type GameDay, type GameWeek, type Noun } from "./vocab";

const nf = (n: number) => n.toLocaleString("en-US");
const WEEK = "في سبعة أيام";
const kpi = (icon: React.ReactNode, noun: Noun, now: number, before: number): OverviewKpi => ({
  icon, label: `${countNoun(now, noun)} ${WEEK}`, value: nf(now), now, before,
});

const TAMR = { one: "تمرة", two: "تمرتان", few: "تمرات", many: "تمرةً" };
const PLAYS = { one: "جولة", two: "جولتان", few: "جولات", many: "جولةً" };
const RESULT: Record<string, string> = { correct: "أصاب", wrong: "أخطأ", timeout: "نفد الوقت", abandoned: "انصرف" };
const LEVEL: Record<string, string> = { easy: "سهل", medium: "متوسّط", hard: "صعب", none: "بلا مستوى" };
const pick = <K extends string>(m: Partial<Record<K, number>>, keys: K[], names: Record<string, string>) =>
  keys.filter((k) => (m[k] ?? 0) > 0).map((k) => ({ label: names[k], value: m[k] ?? 0 }));

/**
 * **نظرةُ كلّ لعبة** — أرقامُها الأربعة في سبعة أيّام ثمّ ما يخصّها. والهيكلُ واحد (`GameOverview`)،
 * فلعبةٌ جديدةٌ فرعٌ هنا: أرقامُها من `game_days`/`game_weeks` وما يخصّها من دالّتها.
 */
export function GameStats({
  slug, days, week, bank, leaders,
}: {
  slug: string;
  days: GameDay[];
  week?: GameWeek;
  bank?: BankStats | null;
  leaders?: DarbLeaders | null;
}) {
  const last = days.slice(-7);
  const prev = days.slice(-14, -7);
  const runs = kpi(<GameController />, NOUNS.RUN, sumOf(last, "runs"), sumOf(prev, "runs"));
  const visitors = kpi(<Eye />, NOUNS.VISITOR, week?.visitors[0] ?? 0, week?.visitors[1] ?? 0);

  if (slug === "darbak-khadar") {
    return (
      <GameOverview
        days={days}
        kpis={[
          runs,
          kpi(<Users />, NOUNS.PLAYER, week?.players[0] ?? 0, week?.players[1] ?? 0),
          kpi(<Sparkle />, NOUNS.DATE, sumOf(last, "score"), sumOf(prev, "score")),
          visitors,
        ]}
        extra={
          leaders ? (
            <>
              <SectionCard title="أكثر تمر منذ الإطلاق">
                <BarList unit={TAMR} items={leaders.tamr.map((r) => ({ label: r.nickname, value: r.value }))} empty="لا أحد بعد." />
              </SectionCard>
              <SectionCard title="أبعد مسافة منذ الإطلاق">
                <BarList formatValue={(n) => `${nf(n)} م`} items={leaders.dist.map((r) => ({ label: r.nickname, value: r.value }))} empty="لا أحد بعد." />
              </SectionCard>
            </>
          ) : null
        }
      />
    );
  }

  if (slug === "bank-adeeb") {
    const hits = sumOf(last, "hits");
    const answered = sumOf(last, "answered");
    const hitsB = sumOf(prev, "hits");
    const answeredB = sumOf(prev, "answered");
    const rate = answered ? Math.round((hits / answered) * 100) : 0;
    const rateB = answeredB ? Math.round((hitsB / answeredB) * 100) : 0;
    return (
      <GameOverview
        days={days}
        kpis={[
          runs,
          kpi(<Users />, NOUNS.NAME, week?.players[0] ?? 0, week?.players[1] ?? 0),
          { icon: <CheckCircle />, label: `أصابوا الجواب ${WEEK}`, value: `${rate}%`, now: rate, before: rateB, tone: "success" },
          visitors,
        ]}
        extra={
          bank ? (
            <>
              <SectionCard title="النتائج منذ الإطلاق">
                <Donut items={pick(bank.results, ["correct", "wrong", "timeout", "abandoned"], RESULT)} unit={PLAYS} />
              </SectionCard>
              <SectionCard title="المستوى منذ الإطلاق">
                <BarList items={pick(bank.levels, ["easy", "medium", "hard", "none"], LEVEL)} unit={PLAYS} />
              </SectionCard>
              <SectionCard title="اللغة منذ الإطلاق">
                <BarList items={pick(bank.langs, ["ar", "en"], { ar: "العربيّة", en: "الإنجليزيّة" })} unit={PLAYS} />
              </SectionCard>
            </>
          ) : null
        }
      />
    );
  }

  return <GameOverview days={days} kpis={[runs, visitors]} />;
}
