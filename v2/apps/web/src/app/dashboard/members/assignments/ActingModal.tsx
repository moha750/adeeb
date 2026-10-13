"use client";

import { useState } from "react";
import { Button, Field, Modal, Radio, Segmented, Select, Textarea, type SelectOption } from "@adeeb/design-system";
import { CalendarBlank, CalendarCheck, ChatText, Pause, Play, UserPlus } from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import { clubDayKey, fmtDateOnly } from "@/lib/dates";
import { Avatar } from "../../_components/Avatar";
import type { ActingCandidate } from "../structure/actions";

/** المقعدُ الذي يُكلَّف عليه: اسمُه ونطاقه، وصاحبُه المجمَّد إن كان (فيتبع التكليفُ عودتَه بلا تاريخ). */
export type ActingSeat = {
  roleAr: string;
  scope: string;
  owner: { name: string; gender: "male" | "female" | null } | null;
};

export type ActingValues = { userId: string; freeze: boolean; until: string | null; reason: string };

// المدّة: ثلاثُ مددٍ بالأشهر، ورابعُها تاريخٌ يختاره (كلمة المالك، 20261010).
const SPANS = [
  { value: "1", label: "شهر" },
  { value: "2", label: "شهران" },
  { value: "3", label: "ثلاثة أشهر" },
  { value: "custom", label: "تاريخٌ آخر" },
];

/** اليوم بتوقيت النادي مفتاحًا (YYYY-MM-DD). */
const today = () => clubDayKey(new Date().toISOString());

/** اليومُ نفسه بعد أشهر، ويُقصَر على آخر الشهر إن قصُر (٣١ يناير + شهر = ٢٨ فبراير). */
export function plusMonths(months: number): string {
  const [y, m, d] = today().split("-").map(Number);
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, last))).toISOString().slice(0, 10);
}

/**
 * نافذة التكليف — الشكل الذي اعتمده المالك في `/ui/acting` (20261010): العضو، ثمّ خيارا منصبه
 * بطاقتين متجاورتين تسمّيان موضعه بجنسه، ثمّ المدّة (شهر · شهران · ثلاثة أشهر · تاريخٌ آخر) وتحتها
 * آخرُ يوم، ثمّ السبب. والمقعدُ المجمَّد لا مدّة فيه: حقلٌ للعرض «حين يعود صاحبه».
 *
 * مُتحكَّمٌ بها من المستدعي في الفتح والإرسال، وتملك حقولها؛ يُعيد المستدعي تركيبها لكلّ مقعد (`key`)
 * فتبدأ فارغة. و`members` فارغٌ (`null`) ما دامت البِركةُ تُجلب.
 */
export function ActingModal({ seat, members, busy, onClose, onSubmit, title, description, minReason = 5, submitLabel = "تكليف" }: {
  seat: ActingSeat | null;
  members: ActingCandidate[] | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (v: ActingValues) => void;
  /** عنوانٌ يقول سياقه (الانتخابات: «تكليف شاغل للمقعد»)، وإلّا «تكليفٌ بمنصب …». */
  title?: string;
  description?: string;
  /** أقلُّ طول للسبب: خمسة في التعيينات، وعشرة في الانتخابات (حارس `appoint_to_seat`). */
  minReason?: number;
  submitLabel?: string;
}) {
  const [pick, setPick] = useState("");
  const [mode, setMode] = useState<"keep" | "freeze">("keep");
  const [span, setSpan] = useState("1");
  const [until, setUntil] = useState("");
  const [reason, setReason] = useState("");

  const m = members?.find((x) => x.id === pick);
  const she = m?.gender === "female";
  const owner = seat?.owner ?? null;
  const day = span === "custom" ? until : plusMonths(Number(span));
  const ready = !!pick && reason.trim().length >= minReason && (!!owner || !!day);

  const options: SelectOption[] = (members ?? []).map((x) => ({
    value: x.id,
    label: x.name,
    hint: x.held ?? undefined,
    icon: <Avatar name={x.name} src={x.avatar ?? undefined} gender={x.gender} size="xs" />,
  }));

  return (
    <Modal
      open={seat !== null}
      onClose={onClose}
      busy={busy}
      size="md"
      title={title ?? (seat ? `تكليفٌ بمنصب ${seat.roleAr}` : "تكليف")}
      description={description ?? (seat ? `«${seat.scope}»` : undefined)}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>إلغاء</Button>
          <Button
            variant="primary"
            size="md"
            loading={busy}
            disabled={!ready}
            onClick={() => onSubmit({ userId: pick, freeze: mode === "freeze", until: owner ? null : day, reason: reason.trim() })}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <Select
        label="العضو"
        icon={<UserPlus />}
        searchable
        options={options}
        value={pick}
        onValueChange={setPick}
        placeholder={!members ? "يُجلب المرشّحون…" : members.length ? "اختر العضو" : "لا مرشّحين لهذا المقعد"}
        disabled={!members}
        required
      />
      <div className="form-grid">
        <Radio
          card
          name="acting-mode"
          icon={<Play />}
          label="مع استمرار منصبه"
          description={m?.held ? `${she ? "تبقى" : "يبقى"} ${m.held}` : undefined}
          checked={mode === "keep"}
          onChange={() => setMode("keep")}
        />
        <Radio
          card
          name="acting-mode"
          icon={<Pause />}
          label="مع تجميد منصبه"
          description={m ? `${she ? "تعود" : "يعود"} إليه بعد التكليف` : undefined}
          checked={mode === "freeze"}
          onChange={() => setMode("freeze")}
        />
      </div>
      {owner ? (
        <Field
          label="آخر يوم في التكليف"
          icon={<CalendarBlank />}
          innerIcon={<CalendarCheck />}
          placeholder=""
          value={owner.gender === "female" ? `حين تعود ${owner.name} إلى مقعدها` : `حين يعود ${owner.name} إلى مقعده`}
          readOnly
          disabled
        />
      ) : (
        <>
          <Segmented wide aria-label="مدّة التكليف" value={span} onValueChange={setSpan} items={SPANS} />
          {span === "custom" ? (
            <Field
              label="آخر يوم في التكليف"
              icon={<CalendarBlank />}
              innerIcon={<CalendarCheck />}
              placeholder="اختر التاريخ"
              type="date"
              min={today()}
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              required
            />
          ) : (
            <Field
              label="آخر يوم في التكليف"
              icon={<CalendarBlank />}
              innerIcon={<CalendarCheck />}
              placeholder=""
              value={fmtDateOnly(day)}
              readOnly
              disabled
            />
          )}
        </>
      )}
      <Textarea
        label="سبب التكليف"
        icon={<ChatText />}
        innerIcon={<PencilSimple />}
        placeholder="اكتب سبب التكليف"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        required
      />
    </Modal>
  );
}
