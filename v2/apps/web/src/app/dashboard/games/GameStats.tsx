"use client";

import { BarList, Donut, SectionCard } from "@adeeb/design-system";
import { Certificate, Coffee, GameController, Gauge, PersonSimpleRun, Sparkle, Translate, Users } from "@phosphor-icons/react";
import { CheckCircle, Eye, WarningCircle } from "@/app/_components/glyphs";
import { GameOverview, type OverviewKpi } from "./GameOverview";
import { sumOf } from "./MonthPulse";
import { OsoolPlayers } from "./OsoolPlayers";
import { NOUNS, PERIOD, PERIOD_LABEL, countNoun, type BankStats, type DarbLeaders, type GameDay, type GamePeriod, type Noun, type OsoolPlayer, type OsoolStats } from "./vocab";

const nf = (n: number) => n.toLocaleString("en-US");
const kpi = (icon: React.ReactNode, noun: Noun, now: number, before: number): OverviewKpi => ({
  icon, label: `${countNoun(now, noun)} ${PERIOD_LABEL}`, value: nf(now), now, before,
});

const TAMR = { one: "تمرة", two: "تمرتان", few: "تمرات", many: "تمرةً" };
const PLAYS = { one: "جولة", two: "جولتان", few: "جولات", many: "جولةً" };
const RESULT: Record<string, string> = { correct: "أصاب", wrong: "أخطأ", timeout: "نفد الوقت", abandoned: "انصرف" };
const LEVEL: Record<string, string> = { easy: "سهل", medium: "متوسّط", hard: "صعب", none: "بلا مستوى" };
const CERTS = { one: "شهادة", two: "شهادتان", few: "شهادات", many: "شهادةً" };
const TIMES = { one: "مرّة", two: "مرّتان", few: "مرّات", many: "مرّةً" };
const OUTCOME: Record<string, string> = { won: "نال شهادته", lost: "خسر", playing: "لم يُكمل" };
const MAJLIS: Record<string, string> = { m: "مجلس الرجال", f: "مجلس النساء" };
const CERT: Record<string, string> = { issued: "صدرت", saved: "حُفظت", shared: "شوركت" };
/** الأخطاءُ بأسمائها كما تقولها اللعبةُ للّاعب، مرتّبةً باختباراتها الثلاثة. */
const FAULT: Record<string, string> = {
  order: "بدأ بغير الصدر", full: "ملأ الفنجال", shake: "صبّ بعد هزّ الفنجال", more: "أخذ الفنجال والضيفُ يريد زيادة", late: "تأخّر على ضيفه",
};
const pick = <K extends string>(m: Partial<Record<K, number>>, keys: K[], names: Record<string, string>) =>
  keys.filter((k) => (m[k] ?? 0) > 0).map((k) => ({ label: names[k], value: m[k] ?? 0 }));

/**
 * **نظرةُ كلّ لعبة** — أرقامُها الأربعة في النافذة (`PERIOD`) ثمّ ما يخصّها. والهيكلُ واحد (`GameOverview`)،
 * فلعبةٌ جديدةٌ فرعٌ هنا: أرقامُها من `game_days`/`game_periods` وما يخصّها من دالّتها.
 */
export function GameStats({
  slug, days, period, bank, leaders, osool,
}: {
  slug: string;
  days: GameDay[];
  period?: GamePeriod;
  bank?: BankStats | null;
  leaders?: DarbLeaders | null;
  osool?: { stats: OsoolStats; players: OsoolPlayer[] } | null;
}) {
  const last = days.slice(-PERIOD);
  const prev = days.slice(-2 * PERIOD, -PERIOD);
  const runs = kpi(<GameController />, NOUNS.RUN, sumOf(last, "runs"), sumOf(prev, "runs"));
  const visitors = kpi(<Eye />, NOUNS.VISITOR, period?.visitors[0] ?? 0, period?.visitors[1] ?? 0);

  if (slug === "darbak-khadar") {
    return (
      <GameOverview
        days={last}
        kpis={[
          runs,
          kpi(<Users />, NOUNS.PLAYER, period?.players[0] ?? 0, period?.players[1] ?? 0),
          kpi(<Sparkle />, NOUNS.DATE, sumOf(last, "score"), sumOf(prev, "score")),
          visitors,
        ]}
        extra={
          leaders ? (
            <>
              <SectionCard title="أكثر تمر منذ الإطلاق" icon={<Sparkle />}>
                <BarList unit={TAMR} items={leaders.tamr.map((r) => ({ label: r.nickname, value: r.value }))} empty="لا أحد بعد." />
              </SectionCard>
              <SectionCard title="أبعد مسافة منذ الإطلاق" icon={<PersonSimpleRun />}>
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
        days={last}
        kpis={[
          runs,
          kpi(<Users />, NOUNS.NAME, period?.players[0] ?? 0, period?.players[1] ?? 0),
          { icon: <CheckCircle />, label: `أصابوا الجواب ${PERIOD_LABEL}`, value: `${rate}%`, now: rate, before: rateB, tone: "success" },
          visitors,
        ]}
        extra={
          bank ? (
            <>
              <SectionCard title="النتائج منذ الإطلاق" icon={<CheckCircle />}>
                <Donut items={pick(bank.results, ["correct", "wrong", "timeout", "abandoned"], RESULT)} unit={PLAYS} />
              </SectionCard>
              <SectionCard title="المستوى منذ الإطلاق" icon={<Gauge />}>
                <BarList items={pick(bank.levels, ["easy", "medium", "hard", "none"], LEVEL)} unit={PLAYS} />
              </SectionCard>
              <SectionCard title="اللغة منذ الإطلاق" icon={<Translate />}>
                <BarList items={pick(bank.langs, ["ar", "en"], { ar: "العربيّة", en: "الإنجليزيّة" })} unit={PLAYS} />
              </SectionCard>
            </>
          ) : null
        }
      />
    );
  }

  // «مدارس الأصول»: من فتحها ومن لعب ومن نال شهادته (طلبُ المالك ليلةَ الإطلاق)، ثمّ ما منذ الإطلاق، ثمّ الأسماء
  if (slug === "osool") {
    const st = osool?.stats;
    return (
      <GameOverview
        days={last}
        kpis={[
          runs,
          kpi(<Users />, NOUNS.PLAYER, period?.players[0] ?? 0, period?.players[1] ?? 0),
          kpi(<Certificate />, NOUNS.CERT, sumOf(last, "hits"), sumOf(prev, "hits")),
          visitors,
        ]}
        extra={
          st ? (
            <>
              <SectionCard title="النتائج منذ الإطلاق" icon={<CheckCircle />}>
                <Donut items={pick(st.outcomes, ["won", "lost", "playing"], OUTCOME)} unit={PLAYS} />
              </SectionCard>
              <SectionCard title="الشهادة منذ الإطلاق" icon={<Certificate />}>
                <BarList items={pick(st.certs, ["issued", "saved", "shared"], CERT)} unit={CERTS} empty="لا شهادة بعد." />
              </SectionCard>
              <SectionCard title="المجلس منذ الإطلاق" icon={<Coffee />}>
                <BarList items={pick(st.majlis, ["m", "f"], MAJLIS)} unit={PLAYS} empty="لا جولة بعد." />
              </SectionCard>
              <SectionCard title="الأخطاء منذ الإطلاق" icon={<WarningCircle />}>
                <BarList items={pick(st.faults, ["order", "full", "shake", "more", "late"], FAULT)} unit={TIMES} empty="لا خطأ بعد." />
              </SectionCard>
              <OsoolPlayers players={osool?.players ?? []} />
            </>
          ) : null
        }
      />
    );
  }

  return <GameOverview days={last} kpis={[runs, visitors]} />;
}
