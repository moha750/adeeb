"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AreaChart, SectionCard, Stat } from "@adeeb/design-system";
import { Coffee, GameController, PersonSimpleRun, Repeat, UserPlus, Users } from "@phosphor-icons/react";
import { DataTable, type Column } from "../../_components/DataTable";
import type { DarbStats } from "./data";

const nf = (n: number) => n.toLocaleString("en-US");
const TZ = "Asia/Riyadh";
const hourFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn", { weekday: "long", hour: "numeric", timeZone: TZ });
const dayFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

type Day = DarbStats["daily"][number];

const COLS: Column<Day>[] = [
  { key: "day", header: "اليوم", render: (d) => dayFmt.format(new Date(`${d.day}T00:00:00Z`)), width: "1.4fr" },
  { key: "visitors", header: "زاروا الصفحة", render: (d) => nf(d.visitors), align: "center" },
  { key: "players", header: "لعبوا", render: (d) => nf(d.players), align: "center" },
  { key: "runs", header: "الجولات", render: (d) => nf(d.runs), align: "center" },
  { key: "accounts", header: "حساباتٌ جديدة", render: (d) => nf(d.accounts), align: "center" },
];

/**
 * **عرضُ الأرقام** — ستّةُ كروت، ثمّ الساعاتُ، ثمّ الأيّام. ويتجدّد كلَّ دقيقةٍ ما دامت المسابقةُ
 * جارية (يعيد الخادمُ القراءة، فلا حسابَ في المتصفّح).
 */
export function DarbStatsView({ data, live }: { data: DarbStats; live: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(t);
  }, [live, router]);

  const perPlayer = data.players ? (data.runs / data.players).toFixed(1) : "0";

  return (
    <>
      <div className="stat-grid">
        <Stat icon={<Users />} value={nf(data.visitors)} label="زاروا صفحة اللعبة" />
        <Stat icon={<PersonSimpleRun />} value={nf(data.players)} label="لعبوا" />
        <Stat icon={<GameController />} value={nf(data.runs)} label="جولةً بدأت" note={`اكتمل منها ${nf(data.runsDone)}`} />
        <Stat icon={<Repeat />} value={perPlayer} label="جولةً لكلّ لاعبٍ في المتوسّط" />
        <Stat icon={<UserPlus />} value={nf(data.accounts)} label="حسابًا أُنشئ من أجل اللعبة" note={`ومنذ إطلاق اللعبة ${nf(data.accountsAll)}`} />
        <Stat icon={<Coffee />} value={nf(data.cups)} label="كوبًا في لوحة المسابقة" />
      </div>

      <SectionCard title="الجولات واللاعبون كلَّ ساعة">
        <AreaChart
          labels={data.hourly.map((h) => hourFmt.format(new Date(h.hour)))}
          series={[
            { name: "الجولات", values: data.hourly.map((h) => h.runs) },
            { name: "اللاعبون", values: data.hourly.map((h) => h.players) },
          ]}
        />
      </SectionCard>

      <SectionCard title="بالأيّام">
        <DataTable columns={COLS} rows={data.daily} getRowId={(d) => d.day} />
      </SectionCard>

      <p className="text-sm text-content-muted">
        الأرقامُ منذ افتتاح المسابقة. واللاعبُ متصفّحٌ أو حساب لا شخص: من لعب من جوّالين بلا حساب يُعدّ
        لاعبَين. والزوّارُ لصفحة اللعبة وحدَها، فشاشةُ اللعب نفسُها لا تُحسَب زيارتُها. والحسابُ «من أجل
        اللعبة» ما أُنشئ ثمّ رُبط بلاعب.
      </p>
    </>
  );
}
