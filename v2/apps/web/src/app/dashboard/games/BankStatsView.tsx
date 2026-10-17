"use client";

import { BarList, Donut, SectionCard, Stat } from "@adeeb/design-system";
import { GameController, Users } from "@phosphor-icons/react";
import { CheckCircle } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../_components/DataTable";

/** ما تعيده `bank_stats()` (الترحيل `games_01_hall`). */
export type BankStats = {
  plays: number;
  players: number;
  first: string | null;
  last: string | null;
  results: Partial<Record<"correct" | "wrong" | "timeout" | "abandoned", number>>;
  levels: Partial<Record<"easy" | "medium" | "hard" | "none", number>>;
  langs: Partial<Record<"ar" | "en", number>>;
  days: { day: string; plays: number }[];
};

const nf = (n: number) => n.toLocaleString("en-US");
const dayFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const PLAYS = { one: "جولة", two: "جولتان", few: "جولات" };

const RESULT: Record<string, string> = { correct: "أصاب", wrong: "أخطأ", timeout: "نفد الوقت", abandoned: "انصرف" };
const LEVEL: Record<string, string> = { easy: "سهل", medium: "متوسّط", hard: "صعب", none: "بلا مستوى" };

type Day = BankStats["days"][number];
const COLS: Column<Day>[] = [
  { key: "day", header: "اليوم", render: (d) => dayFmt.format(new Date(`${d.day}T00:00:00Z`)), width: "1.6fr" },
  { key: "plays", header: "الجولات", render: (d) => nf(d.plays), align: "center" },
];

/**
 * **أرقامُ «بنك أدِيب»** — ركنُ بنك الأسئلة في معرض اليوم الوطنيّ. لا حسابَ فيه، فاللاعبُ اسمٌ كُتب على
 * التابلت: من كتب اسمَه مرّتين بصيغتين عُدّ لاعبَين. والإصابةُ نسبةٌ ممّن بلغ السؤال.
 */
export function BankStatsView({ data, compact }: { data: BankStats; compact?: boolean }) {
  const r = data.results;
  const answered = (r.correct ?? 0) + (r.wrong ?? 0) + (r.timeout ?? 0);
  const hit = answered ? Math.round(((r.correct ?? 0) / answered) * 100) : 0;
  const order = <K extends string>(m: Partial<Record<K, number>>, keys: K[], names: Record<string, string>) =>
    keys.filter((k) => (m[k] ?? 0) > 0).map((k) => ({ label: names[k], value: m[k] ?? 0 }));

  return (
    <>
      {/* وصدرُ الصفحة يحمل الجولاتِ والأسماءَ والإصابة، فلا تُكرَّر كروتًا هنا */}
      {compact ? null : (
        <div className="stat-grid">
        <Stat icon={<GameController />} value={nf(data.plays)} label="جولةً في الركن" />
        <Stat icon={<Users />} value={nf(data.players)} label="اسمًا مختلفًا" />
        <Stat icon={<CheckCircle />} value={`${hit}%`} label="أصابوا الجواب" tone="success" />
      </div>
      )}
      <SectionCard title="النتائج">
        <Donut items={order(r, ["correct", "wrong", "timeout", "abandoned"], RESULT)} unit={PLAYS} />
      </SectionCard>
      <SectionCard title="المستوى">
        <BarList items={order(data.levels, ["easy", "medium", "hard", "none"], LEVEL)} unit={PLAYS} />
      </SectionCard>
      <SectionCard title="اللغة">
        <BarList items={order(data.langs, ["ar", "en"], { ar: "العربيّة", en: "الإنجليزيّة" })} unit={PLAYS} />
      </SectionCard>
      <SectionCard title="بالأيّام">
        <DataTable columns={COLS} rows={data.days} getRowId={(d) => d.day} />
      </SectionCard>
    </>
  );
}
