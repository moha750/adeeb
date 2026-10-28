"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, SaveBar, Segmented } from "@adeeb/design-system";
import { Trophy } from "@phosphor-icons/react";
import { PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { PageHeader } from "../_components/PageHeader";
import { EmptyState } from "../_components/EmptyState";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { useToast } from "../_components/ToastProvider";
import { GameHead } from "./GameHead";
import { GameStats } from "./GameStats";
import { GameSettings } from "./GameSettings";
import { CabinetPreview } from "./CabinetPreview";
import { ContestCard } from "./ContestCard";
import { ContestEditor, type ContestTarget } from "./ContestEditor";
import { useVideoSlot } from "./useVideoSlot";
import { deleteContest, setGameInHall, updateGame } from "./actions";
import type { BankStats, BoardRow, ContestRow, DarbLeaders, GameDay, GameDraft, GameDraftErrors, GameMetric, GameRow, GameWeek } from "./vocab";

type Tab = "overview" | "contests" | "settings";

const draftOf = (g: GameRow): GameDraft => ({
  name: g.name, line: g.line, tone: g.tone, playPath: g.playPath, boardPath: g.boardPath,
  attractVideo: g.attractVideo, attractPoster: g.attractPoster,
});

/**
 * **صفحةُ اللعبة** (الهيكلُ الثاني، المالك ٢٠٢٦-١٠-١٧) — الاسمُ في رأس الصفحة وحدَه، وفي الصدر شاشتُها
 * وسطرُها ومفتاحُ ظهورها في الصالة (فوريّ). ثمّ ثلاثةُ تبويبات:
 *  - **نظرة عامة:** بالهيكل نفسِه لكلّ لعبة (`GameStats`)، بلا فقرة شرح.
 *  - **المسابقات:** كروتُها بصدارتها، والتعديلُ والحذفُ عليها. ولا تبويبَ للعبةٍ بلا مقياسٍ ولا مسابقة.
 *  - **الإعداد:** السطرُ والمقطعُ أوّلًا والتقنيُّ مطويّ، وشريطُ «حفظ» يظهر متى تغيّر شيء.
 */
export function GameView({
  game, initialTab, contests, metrics, boards, days, week, bank, leaders, statsError, now,
}: {
  game: GameRow;
  /** تبويبٌ يُفتح به (`?tab=contests` من قائمة المسابقات في الغرفة). */
  initialTab?: "contests" | "settings";
  contests: ContestRow[];
  /** ما تستطيع اللعبةُ أن يُتنافس عليه. */
  metrics: GameMetric[];
  /** أوائلُ كلّ مسابقةٍ بدأت (`getBoards`). */
  boards: Record<string, BoardRow[]>;
  days: GameDay[];
  week?: GameWeek;
  bank?: BankStats | null;
  leaders?: DarbLeaders | null;
  statsError: string | null;
  now: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const hasContests = metrics.length > 0 || contests.length > 0;
  const [tab, setTab] = useState<Tab>(initialTab === "contests" && !hasContests ? "overview" : (initialTab ?? "overview"));

  /* ── الظهورُ في الصالة: فوريٌّ ومتفائل ── */
  const [inHall, setInHall] = useState(game.inHall);
  const [seenHall, setSeenHall] = useState(game.inHall);
  if (game.inHall !== seenHall) { setSeenHall(game.inHall); setInHall(game.inHall); }
  const [hallBusy, setHallBusy] = useState(false);
  const toggleHall = (v: boolean) => {
    setInHall(v);
    setHallBusy(true);
    start(async () => {
      const r = await setGameInHall(game.slug, v);
      setHallBusy(false);
      if (!r.ok) { setInHall(!v); toast.error(r.message); return; }
      toast.success(r.message);
      router.refresh();
    });
  };

  /* ── الإعداد ── */
  const initial = draftOf(game);
  const [draft, setDraft] = useState<GameDraft>(initial);
  const [errors, setErrors] = useState<GameDraftErrors>({});
  const patch = (p: Partial<GameDraft>) => setDraft((d) => ({ ...d, ...p }));
  const video = useVideoSlot(game.slug, draft, patch);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const save = () =>
    start(async () => {
      const r = await updateGame(game.slug, draft);
      setErrors(r.errors ?? {});
      if (!r.ok) { toast.error(r.message); return; }
      video.commit();
      // الصفُّ يحفظ النصَّ مقلَّمًا، فتُقلَّم المسودّةُ مثله كي لا يبقى الشريطُ ظاهرًا بلا تغيير.
      setDraft((d) => ({ ...d, name: d.name.trim(), line: d.line.trim(), playPath: d.playPath.trim(), boardPath: d.boardPath?.trim() || null }));
      toast.success(r.message);
      router.refresh();
    });
  const revert = () => { video.discard(); setDraft(initial); setErrors({}); };

  /* ── المسابقات ── */
  const [target, setTarget] = useState<ContestTarget | null>(null);
  const [killing, setKilling] = useState<ContestRow | null>(null);

  const shown = { ...game, inHall };
  const tabs = [
    { value: "overview", label: "نظرة عامة" },
    ...(hasContests ? [{ value: "contests", label: <>المسابقات <span className="seg-num">{contests.length}</span></> }] : []),
    { value: "settings", label: "الإعداد" },
  ];

  return (
    <div className="gmr gmr-cq">
      <PageHeader
        title={game.name}
        crumbLeaf={game.name}
        parent={{ label: "ألعاب أدِيب", href: "/dashboard/games" }}
        status={inHall ? { label: "في الصالة", tone: "success" } : { label: "خارج الصالة", tone: "neutral", variant: "outline" }}
        action={tab === "contests" && metrics.length ? { label: "مسابقة جديدة", icon: <Plus size={18} />, onClick: () => setTarget({ slug: game.slug }) } : undefined}
      />
      <GameHead game={shown} busy={hallBusy} onToggleHall={toggleHall} />
      <Segmented className="seg-block mb-4" aria-label="أقسام اللعبة" value={tab} onValueChange={(v) => setTab(v as Tab)} items={tabs} />

      {tab === "overview" ? (
        statsError ? (
          <Alert tone="warning" title="تعذّر جلب الأرقام">{statsError}</Alert>
        ) : (
          <GameStats slug={game.slug} days={days} week={week} bank={bank} leaders={leaders} />
        )
      ) : tab === "contests" ? (
        contests.length ? (
          <div className="card-grid">
            {contests.map((c) => (
              <ContestCard
                key={c.id}
                contest={c}
                now={now}
                board={boards[c.id]}
                footer={
                  <div className="btn-row">
                    {/* مسابقةُ oos (بلا مقياس) ذكرى لا تُعدَّل، وتُحذف */}
                    {c.metric ? (
                      <Button variant="ghost" size="md" onClick={() => setTarget({ contest: c })}><PencilSimple size={18} />تعديل</Button>
                    ) : null}
                    <Button variant="ghost-danger" size="md" onClick={() => setKilling(c)}><Trash size={18} />حذف</Button>
                  </div>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Trophy />}
            title="لا مسابقات بعد"
            action={<Button variant="primary" size="md" onClick={() => setTarget({ slug: game.slug })}><Plus size={18} />مسابقة جديدة</Button>}
          />
        )
      ) : (
        <div className="gmr-set">
          <div>
            <GameSettings draft={draft} onChange={patch} errors={errors} video={video.slot} />
            <input type="file" hidden {...video.picker} />
          </div>
          <aside>
            <CabinetPreview game={{ slug: game.slug, ...draft }} />
          </aside>
          <SaveBar open={dirty || video.busy}>
            <Button variant="ghost" size="md" onClick={revert} disabled={pending || video.busy}>تراجع</Button>
            <Button variant="primary" size="md" onClick={save} loading={pending} disabled={video.busy}>حفظ</Button>
          </SaveBar>
        </div>
      )}

      {target ? (
        <ContestEditor
          key={JSON.stringify(target)}
          target={target}
          games={[{ slug: game.slug, name: game.name, metrics }]}
          onClose={() => setTarget(null)}
        />
      ) : null}

      <ConfirmDialog
        open={killing !== null}
        onClose={() => setKilling(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف المسابقة؟"
        text={killing ? `ستُحذف «${killing.title}» من سجلّ المسابقات وشريط الصالة.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() =>
          start(async () => {
            if (!killing) return;
            const r = await deleteContest(killing.id, game.slug);
            if (r.ok) { toast.success(r.message); setKilling(null); router.refresh(); } else toast.error(r.message);
          })
        }
      />
    </div>
  );
}
