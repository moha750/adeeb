"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Field,
  SaveBar,
  SectionCard,
  Segmented,
  Select,
  Textarea,
} from "@adeeb/design-system";
import { Tag, TextAa, Timer } from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import { AR_WORD, arCount } from "@/lib/arabicCount";
import { IconGame, IconWords } from "../../_shell/icons";
import { useToast } from "../../_components/ToastProvider";
import { PageHeader } from "../../_components/PageHeader";
import {
  LIMITS,
  PICK_MODES,
  SECONDS_OPTIONS,
  validateRoom,
  type CreateRoomInput,
  type PickMode,
} from "../vocab";
import type { BankWordRow, CategoryRow } from "../words/data";
import { createRoom } from "../actions";

/**
 * **فتحُ غرفة.** والقرارُ الوحيدُ الذي يستحقّ شاشةً هو: بأيّ كلماتٍ نلعب؟
 *
 * ثلاثةُ أوضاعٍ فوق تصنيفاتٍ مختارة، وفوقها كلماتٌ خاصّةٌ بهذه الغرفة. والعددُ المتوقَّع
 * يُعرَض حيًّا قبل الفتح: من يفتح غرفةً بمئة جولةٍ في حفلٍ مدّته ساعةٌ يجب أن يعرف ذلك
 * قبل أن يقف أمام الناس لا بعده.
 */
export function NewGameView({ words, categories }: { words: BankWordRow[]; categories: CategoryRow[] }) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();

  const [title, setTitle] = useState("");
  const [seconds, setSeconds] = useState("60");
  const [pickMode, setPickMode] = useState<PickMode>("random");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [chosenCategories, setChosenCategories] = useState<Set<string>>(new Set());
  const [pickCount, setPickCount] = useState("10");
  const [customWords, setCustomWords] = useState("");

  /** كلماتُ التصنيفات المختارة. والفارغةُ تعني الكلَّ، فلا يُجبَر المضيفُ على اختيار. */
  const inScope = useMemo(
    () => (chosenCategories.size === 0 ? words : words.filter((w) => chosenCategories.has(w.category))),
    [words, chosenCategories]
  );

  const customCount = customWords.split("\n").filter((w) => w.trim()).length;

  /** ما سيُنسَخ إلى الغرفة. تقديرٌ صادقٌ لا وعدٌ: القاعدةُ تُسقط المكرَّرَ فقد ينقص. */
  const expected =
    (pickMode === "all"
      ? inScope.length
      : pickMode === "chosen"
        ? picked.size
        : Math.min(Number(pickCount) || 0, inScope.length)) + customCount;

  const toInput = (): CreateRoomInput => ({
    title,
    seconds: Number(seconds),
    pickMode,
    categories: [...chosenCategories],
    wordIds: [...picked],
    pickCount: Number(pickCount) || 0,
    customWords,
  });

  const invalid = validateRoom(toInput());

  const submit = () => {
    startSave(async () => {
      const r = await createRoom(toInput());
      if (r.ok && r.id) {
        toast.success(r.message);
        router.push(`/dashboard/games/${r.id}`);
        router.refresh();
      } else toast.error(r.message);
    });
  };

  const toggleCategory = (c: string) =>
    setChosenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const togglePicked = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <PageHeader title="غرفة جديدة" crumbLeaf="غرفة جديدة" />

      {words.length === 0 ? (
        <Alert tone="warning" title="البنكُ خالٍ" actions={
          <Link href="/dashboard/games/words" className="abtn abtn-primary abtn-sm">
            بنك الكلمات
          </Link>
        }>
          لا كلمةَ في الخدمة بعد. اكتب كلماتِك في البنك أوّلًا، أو أضِف كلماتٍ خاصّةً بهذه
          الغرفة أدناه.
        </Alert>
      ) : null}

      <div className="form-build">
        <SectionCard headerVariant="chip" icon={<IconGame />} title="الغرفة">
          <div className="form-grid">
            <Field
              className="form-full"
              label="عنوانُ الغرفة"
              icon={<TextAa />}
              innerIcon={<PencilSimple />}
              placeholder="مثال: حفل قطوف"
              maxLength={LIMITS.titleMax}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              helper="يراه المضيفُ وشاشةُ العرض. ولا غرفتان جاريتان بعنوانٍ واحد."
              required
            />
            <Select
              className="form-full"
              label="مهلةُ الجولة"
              icon={<Timer />}
              options={SECONDS_OPTIONS as { value: string; label: string }[]}
              value={seconds}
              onValueChange={setSeconds}
              helper="ما وقفتَ فيه الجولةَ لا يُحسَب منها."
              required
            />
          </div>
        </SectionCard>

        <SectionCard headerVariant="chip" icon={<IconWords />} title="الكلمات">
          <div className="form-grid">
            <div className="form-full">
              <Segmented
                wide
                aria-label="وضعُ اختيار الكلمات"
                value={pickMode}
                onValueChange={(v) => setPickMode(v as PickMode)}
                items={PICK_MODES.map((m) => ({ value: m.value, label: m.label }))}
              />
              <p className="mt-2 text-sm text-content-muted">
                {PICK_MODES.find((m) => m.value === pickMode)?.hint}
              </p>
            </div>

            {categories.length > 0 ? (
              <fieldset className="form-full">
                <legend className="text-sm text-content-muted">
                  التصنيفات <span className="text-content-muted">(الفارغُ يعني الكلَّ)</span>
                </legend>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {/* الخالي يُعرَض معطَّلًا ولا يُخفى: غيابُه يُقرأ «حُذف»، وظهورُه
                      معطَّلًا يقول «موجودٌ ولا كلمةَ فيه بعد». */}
                  {categories.map((c) => (
                    <Checkbox
                      key={c.name}
                      card
                      label={c.name}
                      description={c.count > 0 ? arCount(c.count, AR_WORD) : "لا كلماتٍ بعد"}
                      disabled={c.count === 0}
                      checked={chosenCategories.has(c.name)}
                      onChange={() => toggleCategory(c.name)}
                    />
                  ))}
                </div>
              </fieldset>
            ) : null}

            {pickMode === "random" ? (
              <Field
                className="form-full"
                label="كم كلمة؟"
                icon={<IconWords />}
                innerIcon={<PencilSimple />}
                placeholder="10"
                charset="digits"
                inputMode="numeric"
                value={pickCount}
                onChange={(e) => setPickCount(e.target.value)}
                helper={`المتاحُ في التصنيفات المختارة: ${inScope.length}`}
                required
              />
            ) : null}

            {pickMode === "chosen" ? (
              <fieldset className="form-full">
                <legend className="text-sm text-content-muted">
                  أشّر على كلماتك <span className="text-content-muted">(الترتيبُ ترتيبُ اللعب)</span>
                </legend>
                {inScope.length === 0 ? (
                  <p className="mt-2 text-sm text-content-muted">لا كلمةَ في التصنيفات المختارة.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {inScope.map((w) => (
                      <Checkbox
                        key={w.id}
                        card
                        label={w.word}
                        description={w.category}
                        checked={picked.has(w.id)}
                        onChange={() => togglePicked(w.id)}
                      />
                    ))}
                  </div>
                )}
              </fieldset>
            ) : null}

            <Textarea
              className="form-full"
              label="كلماتٌ خاصّةٌ بهذه الغرفة"
              icon={<TextAa />}
              innerIcon={<PencilSimple />}
              placeholder={"كلمةٌ في كلّ سطر"}
              rows={4}
              value={customWords}
              onChange={(e) => setCustomWords(e.target.value)}
              optional
              helper="تُلحَق بالمسحوب ولا تُحفَظ في البنك."
            />

            <div className="form-full">
              <Badge tone={expected > 0 && expected <= LIMITS.wordsMax ? "success" : "warning"}>
                جولاتُ الغرفة: <span className="lat" dir="ltr">{expected}</span>
              </Badge>
              {expected > LIMITS.wordsMax ? (
                <p className="mt-2 text-sm text-content-muted">
                  الحدُّ الأقصى {LIMITS.wordsMax} جولة.
                </p>
              ) : null}
            </div>
          </div>
        </SectionCard>
      </div>

      <SaveBar
        open={title.trim().length > 0}
        message={invalid ?? "تُفتَح الغرفةُ برمزٍ يمسحه الحاضرون"}
      >
        <Button variant="ghost" onClick={() => router.back()} disabled={saving}>
          إلغاء
        </Button>
        <Button onClick={submit} loading={saving} disabled={invalid !== null || expected === 0}>
          <IconGame />
          فتحُ الغرفة
        </Button>
      </SaveBar>
    </>
  );
}
