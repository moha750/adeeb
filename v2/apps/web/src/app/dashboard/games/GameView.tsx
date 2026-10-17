"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Modal, Segmented, Select, Textarea } from "@adeeb/design-system";
import { CalendarCheck, CalendarX, Clock, Gift, Ranking, TextAlignLeft, Trophy } from "@phosphor-icons/react";
import { PencilSimple, Plus, Trash, Warning } from "@/app/_components/glyphs";
import { fromClubInput, toClubInput } from "@/lib/dates";
import { PageHeader } from "../_components/PageHeader";
import { EmptyState } from "../_components/EmptyState";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { useToast } from "../_components/ToastProvider";
import { GameEditor, type GameDraft, type GameDraftErrors } from "./GameEditor";
import { CabinetPreview } from "./CabinetPreview";
import { ContestCard } from "./ContestCard";
import { DarbStatsView } from "./DarbStatsView";
import { BankStatsView } from "./BankStatsView";
import { useVideoSlot } from "./useVideoSlot";
import { deleteContest, saveContest, updateGame, type ContestResult } from "./actions";
import { LIMITS, type BoardRow, type ContestRow, type GameMetric, type GameRow } from "./vocab";
import type { GameFacts, GameStats } from "./data";
import { RackHero } from "./RackHero";

type Tab = "stats" | "contests" | "data";
type ContestForm = { id?: string; title: string; note: string; startsAt: string; endsAt: string; metric: string };

/**
 * **صفحةُ اللعبة** — كلُّ ما يخصّ لعبةً واحدةً في مكانٍ واحد (اختيارُ المالك «ب»، ٢٠٢٦-١٠-١٧):
 * إحصائيّاتُها (إن كتبت لها دالّة)، ومسابقاتُها، وبياناتُها في الصالة ومعاينةُ كابينتها حيّةً بجانبها.
 */
export function GameView({
  game, facts, initialTab, position, positions, contests, metrics, boards, stats, statsError, now,
}: {
  game: GameRow;
  /** أرقامُ الصدر الثلاثة (`heroFacts`). */
  facts: GameFacts;
  /** تبويبٌ يُفتح به (`?tab=contests` من شريط المسابقة في الغرفة). */
  initialTab?: "contests" | "data";
  /** موضعُها بين الألعاب (١ أوّلًا) من ترتيب القراءة، لا من `sort_order` الذي قد تكون فيه فجوة. */
  position: number;
  positions: number;
  contests: ContestRow[];
  /** ما تستطيع اللعبةُ أن يُتنافس عليه. وبلا مقياسٍ ولا مسابقةٍ سابقةٍ لا تبويبَ مسابقات. */
  metrics: GameMetric[];
  /** أوائلُ كلّ مسابقةٍ بدأت (`getBoards`). */
  boards: Record<string, BoardRow[]>;
  stats: GameStats | null;
  statsError: string | null;
  now: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const hasStats = !!stats || !!statsError;
  // المسابقةُ على ما تقيسه اللعبة: لعبةٌ بلا مقياسٍ لا مسابقةَ لها (قرارُ المالك ٢٠٢٦-١٠-١٧)، إلّا أن تكون
  // لها مسابقاتٌ قديمةٌ تُقرأ ذكرى.
  const hasContests = metrics.length > 0 || contests.length > 0;
  const [tab, setTab] = useState<Tab>(
    initialTab === "contests" && !hasContests ? "data" : (initialTab ?? (hasStats ? "stats" : hasContests ? "contests" : "data")),
  );

  /* ── بياناتُ اللعبة ── */
  const initial: GameDraft = {
    name: game.name, line: game.line, tone: game.tone, playPath: game.playPath, boardPath: game.boardPath,
    attractVideo: game.attractVideo, attractPoster: game.attractPoster, inHall: game.inHall, position,
  };
  const [draft, setDraft] = useState<GameDraft>(initial);
  const [errors, setErrors] = useState<GameDraftErrors>({});
  const patch = (p: Partial<GameDraft>) => setDraft((d) => ({ ...d, ...p }));
  const video = useVideoSlot(game.slug, draft, patch);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const saveGame = () =>
    start(async () => {
      const r = await updateGame(game.slug, draft);
      setErrors(r.errors ?? {});
      if (!r.ok) { toast.error(r.message); return; }
      video.commit();
      // الصفُّ يحفظ النصَّ مقلَّمًا، فتُقلَّم المسودّةُ مثله كي لا يبقى الحفظُ متاحًا بلا تغيير.
      setDraft((d) => ({ ...d, name: d.name.trim(), line: d.line.trim(), playPath: d.playPath.trim(), boardPath: d.boardPath?.trim() || null }));
      toast.success(r.message);
      router.refresh();
    });

  /* ── المسابقات ── */
  const [form, setForm] = useState<ContestForm | null>(null);
  const [formErr, setFormErr] = useState<ContestResult["errors"]>({});
  const [overlap, setOverlap] = useState<string | null>(null);
  const [killing, setKilling] = useState<ContestRow | null>(null);

  const openContest = (c?: ContestRow) => {
    setFormErr({});
    setForm(
      c
        ? { id: c.id, title: c.title, note: c.note, startsAt: toClubInput(c.startsAt), endsAt: toClubInput(c.endsAt), metric: c.metric?.metric ?? "" }
        : { title: "", note: "", startsAt: "", endsAt: "", metric: metrics[0]?.metric ?? "" },
    );
  };

  const submitContest = (force = false) =>
    start(async () => {
      if (!form) return;
      const r = await saveContest({
        id: form.id, slug: game.slug, title: form.title, note: form.note,
        startsAt: fromClubInput(form.startsAt), endsAt: fromClubInput(form.endsAt), metric: form.metric, force,
      });
      if (r.overlap) { setOverlap(r.overlap); return; }
      setFormErr(r.errors ?? {});
      if (!r.ok) { toast.error(r.message); return; }
      toast.success(r.message);
      setOverlap(null);
      setForm(null);
      router.refresh();
    });

  const tabs = [
    ...(hasStats ? [{ value: "stats", label: "الإحصائيّات" }] : []),
    ...(hasContests ? [{ value: "contests", label: `المسابقات (${contests.length})` }] : []),
    { value: "data", label: "بيانات اللعبة" },
  ];

  return (
    <div className="gmr">
      <PageHeader
        title={game.name}
        crumbLeaf={game.name}
        parent={{ label: "ألعاب أدِيب", href: "/dashboard/games" }}
        action={tab === "contests" && metrics.length ? { label: "مسابقة جديدة", icon: <Plus size={18} />, onClick: () => openContest() } : undefined}
      />
      <RackHero game={game} facts={facts} />
      <Segmented className="seg-block mb-4" aria-label="أقسام اللعبة" value={tab} onValueChange={(v) => setTab(v as Tab)} items={tabs} />

      {tab === "stats" ? (
        <div className="flex flex-col gap-4">
          {statsError || !stats ? (
            <Alert tone="warning" title="تعذّر جلب الإحصائيّات">{statsError ?? "لا بيانات."}</Alert>
          ) : stats.kind === "darb" ? (
            <DarbStatsView data={stats.data} compact />
          ) : (
            <BankStatsView data={stats.data} compact />
          )}
        </div>
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
                      <Button variant="ghost" size="md" onClick={() => openContest(c)}><PencilSimple size={18} />تعديل</Button>
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
            action={<Button variant="primary" size="md" onClick={() => openContest()}><Plus size={18} />مسابقة جديدة</Button>}
          />
        )
      ) : (
        <div className="acc-cols">
          <div className="acc-main">
            <GameEditor draft={draft} onChange={patch} errors={errors} positions={positions} video={video.slot} />
            <input type="file" hidden {...video.picker} />
            <div className="btn-row">
              <Button variant="primary" size="md" onClick={saveGame} loading={pending} disabled={!dirty || video.busy}>حفظ</Button>
            </div>
          </div>
          <aside className="acc-aside">
            <CabinetPreview game={{ slug: game.slug, ...draft }} />
          </aside>
        </div>
      )}

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "تعديل المسابقة" : "مسابقة جديدة"}
        busy={pending}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setForm(null)} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" onClick={() => submitContest()} loading={pending}>{form?.id ? "حفظ التغييرات" : "إضافة المسابقة"}</Button>
          </>
        }
      >
        {form ? (
          <div className="form-grid">
            <Select
              className="form-full"
              label="على ماذا يتنافسون؟"
              icon={<Ranking />}
              options={metrics.map((m) => ({ value: m.metric, label: m.label }))}
              value={form.metric}
              onValueChange={(v) => setForm({ ...form, metric: v })}
              error={formErr?.metric}
              required
            />
            <Field
              className="form-full"
              label="عنوان المسابقة"
              icon={<Trophy />}
              innerIcon={<PencilSimple />}
              placeholder={`مسابقة … في ${game.name}`}
              maxLength={LIMITS.title.max}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              error={formErr?.title}
              required
            />
            <Textarea
              className="form-full"
              label="الجوائز"
              icon={<Gift />}
              innerIcon={<TextAlignLeft />}
              rows={2}
              placeholder="للأوّل كذا، وللثاني كذا، وللثالث كذا."
              maxLength={LIMITS.note.max}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              error={formErr?.note}
              helper={`${form.note.trim().length} من ${LIMITS.note.max}`}
              required
            />
            <Field
              label="تبدأ"
              type="datetime-local"
              icon={<CalendarCheck />}
              innerIcon={<Clock />}
              placeholder=""
              dir="ltr"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              error={formErr?.startsAt}
              required
            />
            <Field
              label="تنتهي"
              type="datetime-local"
              icon={<CalendarX />}
              innerIcon={<Clock />}
              placeholder=""
              dir="ltr"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              error={formErr?.endsAt}
              required
            />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={overlap !== null}
        onClose={() => setOverlap(null)}
        tone="warning"
        icon={<Warning />}
        title="يتداخل موعدُها مع مسابقةٍ أخرى"
        text={overlap ? `«${overlap}» في الموعد نفسِه، وشريطُ الصالة يعلن مسابقةً واحدة: أقربَهما بدايةً.` : undefined}
        confirmLabel="احفظها مع ذلك"
        loading={pending}
        onConfirm={() => submitContest(true)}
      />

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
