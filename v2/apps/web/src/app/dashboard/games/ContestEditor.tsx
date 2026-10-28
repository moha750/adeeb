"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Modal, Select, Textarea } from "@adeeb/design-system";
import { CalendarCheck, CalendarX, Clock, GameController, Gift, Ranking, TextAlignLeft, Trophy } from "@phosphor-icons/react";
import { PencilSimple, Warning } from "@/app/_components/glyphs";
import { fromClubInput, toClubInput } from "@/lib/dates";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { useToast } from "../_components/ToastProvider";
import { saveContest, type ContestResult } from "./actions";
import { LIMITS, type ContestRow, type GameMetric } from "./vocab";

/** لعبةٌ يُتنافس فيها: ما لها مقياسٌ وحدَه (`game_metrics`). */
export type ContestGame = { slug: string; name: string; metrics: GameMetric[] };
/** ما يُفتح: مسابقةٌ تُعدَّل، أو جديدةٌ في لعبةٍ بعينها، أو جديدةٌ تُختار لعبتُها (من الغرفة). */
export type ContestTarget = { contest: ContestRow } | { slug: string } | { pick: true };

type Form = { id?: string; slug: string; title: string; note: string; startsAt: string; endsAt: string; metric: string };

function initial(t: ContestTarget, games: ContestGame[]): Form {
  if ("contest" in t) {
    const c = t.contest;
    return { id: c.id, slug: c.gameSlug, title: c.title, note: c.note, startsAt: toClubInput(c.startsAt), endsAt: toClubInput(c.endsAt), metric: c.metric?.metric ?? "" };
  }
  const g = "slug" in t ? games.find((x) => x.slug === t.slug) : games[0];
  return { slug: g?.slug ?? "", title: "", note: "", startsAt: "", endsAt: "", metric: g?.metrics[0]?.metric ?? "" };
}

/**
 * **نافذةُ المسابقة** — واحدةٌ للغرفة وصفحةِ اللعبة. من الغرفة تُختار اللعبةُ أوّلًا (ما له مقياسٌ وحدَه)،
 * ومن صفحة اللعبة لعبتُها ثابتة. ثمّ على ماذا يتنافسون، والعنوانُ والجوائزُ والموعدان. والتداخلُ مع
 * مسابقةٍ أخرى في الصالة يُسأل عنه قبل الحفظ: الشريطُ يعلن واحدة.
 *
 * يُركَّب بـ`key` كلَّ فتحة، فتبدأ حالتُه من الهدف بلا مؤثّر.
 */
export function ContestEditor({ target, games, onClose }: { target: ContestTarget | null; games: ContestGame[]; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<Form | null>(() => (target ? initial(target, games) : null));
  const [err, setErr] = useState<ContestResult["errors"]>({});
  const [overlap, setOverlap] = useState<string | null>(null);
  const picking = !!target && "pick" in target;
  const metrics = games.find((g) => g.slug === form?.slug)?.metrics ?? [];
  const gameName = games.find((g) => g.slug === form?.slug)?.name ?? "";

  const submit = (force = false) =>
    start(async () => {
      if (!form) return;
      const r = await saveContest({
        id: form.id, slug: form.slug, title: form.title, note: form.note,
        startsAt: fromClubInput(form.startsAt), endsAt: fromClubInput(form.endsAt), metric: form.metric, force,
      });
      if (r.overlap) { setOverlap(r.overlap); return; }
      setErr(r.errors ?? {});
      if (!r.ok) { toast.error(r.message); return; }
      toast.success(r.message);
      setOverlap(null);
      onClose();
      router.refresh();
    });

  return (
    <>
      <Modal
        open={!!form}
        onClose={onClose}
        title={form?.id ? "تعديل المسابقة" : "مسابقة جديدة"}
        busy={pending}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={onClose} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" onClick={() => submit()} loading={pending}>{form?.id ? "حفظ التغييرات" : "إضافة المسابقة"}</Button>
          </>
        }
      >
        {form ? (
          <div className="form-grid">
            {picking ? (
              <Select
                className="form-full"
                label="اللعبة"
                icon={<GameController />}
                options={games.map((g) => ({ value: g.slug, label: g.name }))}
                value={form.slug}
                onValueChange={(v) => setForm({ ...form, slug: v, metric: games.find((g) => g.slug === v)?.metrics[0]?.metric ?? "" })}
                required
              />
            ) : null}
            <Select
              className="form-full"
              label="على ماذا يتنافسون؟"
              icon={<Ranking />}
              options={metrics.map((m) => ({ value: m.metric, label: m.label }))}
              value={form.metric}
              onValueChange={(v) => setForm({ ...form, metric: v })}
              error={err?.metric}
              required
            />
            <Field
              className="form-full"
              label="عنوان المسابقة"
              icon={<Trophy />}
              innerIcon={<PencilSimple />}
              placeholder={`مسابقة … في ${gameName}`}
              maxLength={LIMITS.title.max}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              error={err?.title}
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
              error={err?.note}
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
              error={err?.startsAt}
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
              error={err?.endsAt}
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
        onConfirm={() => submit(true)}
      />
    </>
  );
}
