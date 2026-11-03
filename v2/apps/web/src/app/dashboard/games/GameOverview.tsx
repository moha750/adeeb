"use client";

import type { ReactNode } from "react";
import { AreaChart, SectionCard, Stat } from "@adeeb/design-system";
import { ChartLine } from "@phosphor-icons/react";
import { Trend } from "./Trend";

const dayFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn", { day: "numeric", month: "long", timeZone: "UTC" });

/** رقمٌ في رأس النظرة: قيمتُه في النافذة (`PERIOD`)، وقيمتُه في المدّة نفسِها قبلها للشارة. */
export type OverviewKpi = { icon: ReactNode; label: string; value: string; now: number; before?: number; tone?: "success" };

/**
 * **نظرةٌ عامّة على لعبة** — الهيكلُ نفسُه لكلّ لعبة (المالك ٢٠٢٦-١٠-١٧: «صفحتا اللعبتين لا تتشابهان»):
 * أرقامُها الأربعة في آخر ثلاثين يومًا بفرقها عن الثلاثين قبلها، ثمّ جولاتُها يومًا بيوم في الثلاثين نفسِها،
 * ثمّ ما يخصّها وحدَها (`extra`). ولا فقرةَ شرح: الواجهةُ لا تشرح نفسَها.
 */
export function GameOverview({
  kpis, days, extra,
}: {
  kpis: OverviewKpi[];
  /** ثلاثون يومًا، أقدمُها أوّلًا. */
  days: { day: string; runs: number; players: number }[];
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="stat-grid">
        {kpis.map((k) => (
          <Stat
            key={k.label}
            icon={k.icon}
            value={k.value}
            label={k.label}
            tone={k.tone}
            trend={k.before == null ? undefined : <Trend now={k.now} before={k.before} />}
          />
        ))}
      </div>
      <SectionCard title="يومًا بيوم" icon={<ChartLine />}>
        <AreaChart
          labels={days.map((d) => dayFmt.format(new Date(`${d.day}T00:00:00Z`)))}
          series={[
            { name: "الجولات", values: days.map((d) => d.runs) },
            { name: "اللاعبون", values: days.map((d) => d.players) },
          ]}
        />
      </SectionCard>
      {extra}
    </div>
  );
}
