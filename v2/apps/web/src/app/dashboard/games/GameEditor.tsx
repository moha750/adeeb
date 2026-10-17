"use client";

import { Field, FileButton, Select, Switch, Textarea } from "@adeeb/design-system";
import { GameController, Hash, LinkSimple, ListNumbers, Palette, Play, Ranking, TextAlignLeft, VideoCamera } from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import { LIMITS, TONE_OPTIONS, type GameRow, type GameTone } from "./vocab";

export type GameDraft = Pick<
  GameRow,
  "name" | "line" | "tone" | "playPath" | "boardPath" | "attractVideo" | "attractPoster" | "inHall"
> & { position: number };
export type GameDraftErrors = Partial<Record<keyof GameDraft, string>>;

/**
 * **بياناتُ اللعبة** — الحقولُ وحدها، والأبُ يملك الحالةَ والحفظ والرفع: فتسكن النموذجَ نافذةً أو
 * تبويبًا كما يُختار في `/ui/games-room`.
 *
 * **ومقطعُ الشاشة ملفٌّ واحد:** صورتُه الثابتةُ تُقتطع منه في المتصفّح ساعةَ يُختار، فلا يُطالَب
 * المحرّرُ بملفّين يجب أن يتطابقا (والقاعدةُ تشترطهما معًا).
 */
export function GameEditor({
  draft,
  onChange,
  errors = {},
  positions,
  video,
}: {
  draft: GameDraft;
  onChange: (patch: Partial<GameDraft>) => void;
  errors?: GameDraftErrors;
  /** عددُ مواضع الصالة: ١ إلى عدد ألعابها. */
  positions: number;
  /** زرُّ المقطع: حالتُه وفعلُه من الأب (القاعدة ١٤). */
  video: { state: "attach" | "ready" | "uploading"; label: string; hint: string; onPick: () => void; onRemove?: () => void };
}) {
  return (
    <div className="form-grid">
      <Field
        className="form-full"
        label="اسم اللعبة"
        icon={<GameController />}
        innerIcon={<PencilSimple />}
        placeholder="دربك خضر"
        maxLength={LIMITS.name.max}
        value={draft.name}
        onChange={(e) => onChange({ name: e.target.value })}
        error={errors.name}
        required
      />
      <Textarea
        className="form-full"
        label="سطر التعريف"
        icon={<TextAlignLeft />}
        innerIcon={<PencilSimple />}
        rows={2}
        placeholder="لعبةُ عَدْوٍ لليوم الوطنيّ في جوّالك…"
        maxLength={LIMITS.line.max}
        value={draft.line}
        onChange={(e) => onChange({ line: e.target.value })}
        error={errors.line}
        helper={`${draft.line.trim().length} من ${LIMITS.line.max}`}
        required
      />
      <Select
        label="النغمة"
        icon={<Palette />}
        options={TONE_OPTIONS}
        value={draft.tone}
        onValueChange={(v) => onChange({ tone: v as GameTone })}
        required
      />
      <Select
        label="ترتيبها بين الألعاب"
        icon={<ListNumbers />}
        options={Array.from({ length: positions }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
        value={String(draft.position)}
        onValueChange={(v) => onChange({ position: Number(v) })}
        required
      />
      <Field
        label="رابط اللعب"
        icon={<Play />}
        innerIcon={<LinkSimple />}
        placeholder="/games/darbak-khadar/play"
        charset="latin"
        value={draft.playPath}
        onChange={(e) => onChange({ playPath: e.target.value })}
        error={errors.playPath}
        required
      />
      <Field
        label="رابط الصدارة"
        icon={<Ranking />}
        innerIcon={<Hash />}
        placeholder="/games/darbak-khadar"
        charset="latin"
        value={draft.boardPath ?? ""}
        onChange={(e) => onChange({ boardPath: e.target.value || null })}
        error={errors.boardPath}
        optional
      />
      <div className="form-full">
        <FileButton
          block
          state={video.state}
          icon={<VideoCamera />}
          label={video.label}
          hint={video.hint}
          onClick={video.onPick}
          onRemove={video.onRemove}
          removeLabel="إزالة المقطع"
        />
      </div>
      <Switch
        className="form-full"
        row
        label="في الصالة"
        checked={draft.inHall}
        onChange={(e) => onChange({ inHall: e.target.checked })}
      />
    </div>
  );
}
