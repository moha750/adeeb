"use client";

import { Accordion, Field, FileButton, Select, Textarea } from "@adeeb/design-system";
import { GameController, Hash, LinkSimple, Palette, Play, Ranking, TextAlignLeft, VideoCamera } from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import { LIMITS, TONE_OPTIONS, type GameDraft, type GameDraftErrors, type GameTone } from "./vocab";

/**
 * **إعدادُ اللعبة** — ما يُغيَّر فعلًا أوّلًا (سطرُها ومقطعُ شاشتها)، وما لا يُلمس إلّا يومَ تُبنى اللعبةُ
 * أو تُنقَل (اسمُها ونغمتُها ورابطاها) مطويًّا تحت «إعدادات متقدمة». وظهورُها في الصالة في صدر الصفحة،
 * وترتيبُها في «الصالة الآن» في الغرفة: كلاهما فعلٌ فوريٌّ لا ينتظر «حفظ».

 */
export function GameSettings({
  draft, onChange, errors = {}, video,
}: {
  draft: GameDraft;
  onChange: (patch: Partial<GameDraft>) => void;
  errors?: GameDraftErrors;
  video: { state: "attach" | "ready" | "uploading"; label: string; hint: string; onPick: () => void; onRemove?: () => void };
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="form-grid">
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
      </div>
      <Accordion
        items={[
          {
            q: "إعدادات متقدمة",
            a: (
              <div className="form-grid">
                <Field
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
                <Select
                  label="لونها في الصالة"
                  icon={<Palette />}
                  options={TONE_OPTIONS}
                  value={draft.tone}
                  onValueChange={(v) => onChange({ tone: v as GameTone })}
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
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
