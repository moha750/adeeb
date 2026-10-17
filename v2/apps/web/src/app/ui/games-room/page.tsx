"use client";

import { useState } from "react";
import { Button, Container, Segmented } from "@adeeb/design-system";
import { PencilSimple, Trash } from "@/app/_components/glyphs";
import { PageHeader } from "../../dashboard/_components/PageHeader";
import { ToastProvider } from "../../dashboard/_components/ToastProvider";
import type { CrumbStep } from "../../dashboard/_shell/crumb";
import { RackRoom } from "../../dashboard/games/RackRoom";
import { RackHero } from "../../dashboard/games/RackHero";
import { LiveContest } from "../../dashboard/games/LiveContest";
import { ContestCard } from "../../dashboard/games/ContestCard";
import { DarbStatsView } from "../../dashboard/games/DarbStatsView";
import type { DarbStats } from "../../dashboard/games/darbStats";
import type { GameFacts } from "../../dashboard/games/data";
import type { ContestPhase, ContestRow, GameRow } from "../../dashboard/games/vocab";

/**
 * **غرفةُ الألعاب: إعادةُ التصميم** (٢٠٢٦-١٠-١٧) — قال المالك عن الغرفة المبنيّة: «طريقةُ العرض بدائيّةٌ
 * جدًّا»، هيكلةً وتصميمًا. فعُرض اتّجاهان بالمكوّنات الحقيقيّة:
 *  - **أ. الرفّ** ✔ المعتمَد: سطحُ اللوحة، وكلُّ لعبةٍ صفٌّ بشاشتها الحيّة واسمِها بخطّ الصالة. وصدرُ صفحة
 *    اللعبة بنغمتها (Aurora الهويّة بلون اللعبة).
 *  - **ب. الصالةُ في اللوحة** ✘ رُدّ: ليلُ الصالة داخل اللوحة والكبائنُ أزرار. الغرفةُ به تمريرٌ طويلٌ يكرّر
 *    `/games`، ولافتتُه الداكنةُ في صدر صفحة اللعبة جميلةٌ لكنّها «كحبّة الهيل في الكعكة» (المالك): تُخرج
 *    صفحةً واحدةً من لغة اللوحة. فحُذفت مكوّناتُه وأنماطُه، وبقيت الصفحةُ سجلًّا للمعتمَد.
 *
 * المقطعان والصورتان واللعبتان حقيقيّة، والأرقامُ والمسابقةُ مصنوعة (`/ui` صفحةٌ عامّة).
 */

const WIDTHS = [
  { value: "390", label: "جوّال 390" },
  { value: "820", label: "لوح 820" },
  { value: "1100", label: "حاسوب 1100" },
];

const GAMES: GameRow[] = [
  {
    slug: "darbak-khadar", name: "دربك خضر", line: "لعبةُ عَدْوٍ لليوم الوطنيّ في جوّالك: اجمع التمرَ واسبق إلى رأس اللوحة.",
    tone: "darb", playPath: "/games/darbak-khadar/play", boardPath: "/games/darbak-khadar",
    attractVideo: "/games/cabinets/darbak-khadar.mp4", attractPoster: "/games/cabinets/darbak-khadar.jpg", inHall: true, sortOrder: 0,
  },
  {
    slug: "bank-adeeb", name: "بنك أدِيب", line: "ركنُ بنك الأسئلة في معرض اليوم الوطنيّ: اختر مستواك وأجب قبل أن ينفد الوقت.",
    tone: "amber", playPath: "/games/bank-adeeb/play", boardPath: null,
    attractVideo: "/games/cabinets/bank-adeeb.mp4", attractPoster: "/games/cabinets/bank-adeeb.jpg", inHall: true, sortOrder: 1,
  },
];

const PLAYER = { one: "لاعب", few: "لاعبين", many: "لاعبًا" };
const RUN = { one: "جولة", few: "جولات", many: "جولةً" };
const NAME = { one: "اسم", few: "أسماء", many: "اسمًا" };
const FACTS: Record<string, GameFacts> = {
  "darbak-khadar": [{ value: 209, noun: PLAYER }, { value: 2583, noun: RUN }],
  "bank-adeeb": [{ value: 165, noun: NAME }, { value: 311, noun: RUN }],
};
const HERO_FACTS: GameFacts = [...FACTS["darbak-khadar"], { value: 458, noun: { one: "تمرة", few: "تمرات", many: "تمرةً" } }];

const NOW = Date.now();
const H = 3_600_000;
const CONTESTS: ContestRow[] = [
  {
    id: "c2", gameSlug: "darbak-khadar", gameName: "دربك خضر", tone: "darb", title: "مسابقة التمر في دربك خضر",
    note: "للأوّل كذا، وللثاني كذا، وللثالث كذا.",
    startsAt: new Date(NOW - 20 * H).toISOString(), endsAt: new Date(NOW + 28 * H).toISOString(),
    metric: { metric: "tamr", label: "أكثر تمر", unit: "tamr" },
  },
  {
    id: "c1", gameSlug: "darbak-khadar", gameName: "دربك خضر", tone: "darb", title: "مسابقة أكواب oos في دربك خضر",
    note: "رصيدٌ في محفظة مقهى oos للأكثر جمعًا للأكواب: 30 ريالًا للأوّل، و20 للثاني، و10 للثالث.",
    startsAt: "2026-09-25T15:30:00Z", endsAt: "2026-09-27T15:00:00Z",
    metric: null,
  },
];
const PHASE: Record<string, ContestPhase> = { "darbak-khadar": "live" };

const DARB: DarbStats = {
  startsAt: "2026-09-25T15:30:00Z", endsAt: "2026-09-27T15:00:00Z", now: new Date(NOW).toISOString(),
  visitors: 405, views: 900, players: 209, newPlayers: 2, runs: 2583, runsDone: 1780, tamr: 458, accounts: 30, accountsAll: 30,
  hourly: Array.from({ length: 48 }, (_, i) => ({ hour: new Date(NOW - (47 - i) * H).toISOString(), runs: (i * 7) % 13, players: (i * 3) % 6 })),
  daily: [
    { day: "2026-10-16", visitors: 24, players: 6, runs: 31, accounts: 0 },
    { day: "2026-10-15", visitors: 30, players: 9, runs: 44, accounts: 1 },
  ],
};

const ROOM_CRUMB: CrumbStep[] = [{ kind: "link", label: "المحتوى", href: "#" }];
const GAME_CRUMB: CrumbStep[] = [{ kind: "link", label: "المحتوى", href: "#" }, { kind: "link", label: "ألعاب أدِيب", href: "#" }];

function Tabs({ tab, setTab }: { tab: string; setTab: (v: string) => void }) {
  return (
    <Segmented
      className="seg-block mb-4"
      aria-label="أقسام اللعبة"
      value={tab}
      onValueChange={setTab}
      items={[
        { value: "stats", label: "الإحصائيّات" },
        { value: "contests", label: "المسابقات (2)" },
      ]}
    />
  );
}

function TabBody({ tab }: { tab: string }) {
  if (tab === "stats") return <div className="flex flex-col gap-4"><DarbStatsView data={DARB} compact /></div>;
  return (
    <div className="card-grid">
      {CONTESTS.map((c) => (
        <ContestCard
          key={c.id}
          contest={c}
          now={NOW}
          board={c.metric ? [{ rank: 1, nickname: "صقر الأحساء", value: 84 }, { rank: 2, nickname: "نجم الشرقية", value: 61 }, { rank: 3, nickname: "برق", value: 40 }] : undefined}
          footer={
            <div className="btn-row">
              <Button variant="ghost" size="md"><PencilSimple size={18} />تعديل</Button>
              <Button variant="ghost-danger" size="md"><Trash size={18} />حذف</Button>
            </div>
          }
        />
      ))}
    </div>
  );
}

function Tag({ n, title, note }: { n: string; title: string; note: string }) {
  return (
    <div className="phdlab-tag">
      <span className="dot" aria-hidden />
      {n}: {title}
      <span className="h">{note}</span>
    </div>
  );
}

export default function GamesRoomLab() {
  const [w, setW] = useState("390");
  const [tabA, setTabA] = useState("stats");
    const noop = () => {};
  return (
    <ToastProvider>
      <main className="py-16">
        <Container>
          <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Dashboard, Games Room</p>
          <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">غرفةُ الألعاب</h1>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-content-muted">عرض الإطار:</span>
            <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض إطار المعاينة" />
          </div>
        </Container>

        <div className="mx-auto w-full max-w-[2400px] px-6">
          <div className="mt-12" style={{ ["--phdlab-w" as string]: w + "px" }}>
            <div className="phdlab">
              <div className="phdlab-col gmr">
                <Tag n="أ" title="الرفّ (المعتمَد)" note="سطحُ اللوحة، وشاشةُ كلّ لعبةٍ حيّة" />
                <div className="phdlab-frame" style={{ paddingBottom: 14 }}>
                  <PageHeader title="ألعاب أدِيب" crumb={ROOM_CRUMB} />
                  <LiveContest contest={CONTESTS[0]} href="#" />
                  <RackRoom games={GAMES} facts={FACTS} phase={PHASE} onOpen={noop} />
                </div>
                <div className="phdlab-body">وصفحةُ اللعبة:</div>
                <div className="phdlab-frame" style={{ paddingBottom: 14 }}>
                  <PageHeader title="دربك خضر" crumb={GAME_CRUMB} />
                  <RackHero game={GAMES[0]} facts={HERO_FACTS} />
                  <Tabs tab={tabA} setTab={setTabA} />
                  <TabBody tab={tabA} />
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </ToastProvider>
  );
}
