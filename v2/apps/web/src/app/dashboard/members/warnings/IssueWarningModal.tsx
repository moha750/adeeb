"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Select, Textarea, Field, type SelectOption, Modal } from "@adeeb/design-system";
import {
  CalendarBlank, ChatCenteredText, NotePencil, Tag, User, UserCircle } from "@phosphor-icons/react";
import { DownloadSimple, Warning, WhatsappLogo } from "@/app/_components/glyphs";
import { Avatar } from "../../_components/Avatar";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { useToast } from "../../_components/ToastProvider";
import { WARNING_CATEGORIES, ordinalWord, remainingText, warningTitle } from "@/lib/warnings/vocab";
import { downloadWarningLetter } from "@/lib/warnings/letter";
import { warningWhatsappMessage } from "@/lib/warnings/message";
import { waHref } from "@/lib/whatsapp";
import { issueWarning } from "./actions";
import type { WarningTarget } from "./data";

/** ما يُسلَّم بعد التسجيل — منه يُبنى الخطاب والرسالة (الرتبة من القاعدة لا من العدّ هنا). */
type Issued = {
  target: WarningTarget;
  ordinal: number;
  activeCount: number;
  category: string;
  reason: string;
  issuedAt: string;
  terminated: boolean;
};

/** اليومُ بتوقيت الرياض — سقفُ تاريخ الواقعة، ومثلُه حرفًا في حارس القاعدة. */
const todayInRiyadh = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

/**
 * نافذة إصدار الإنذار — ثلاث حالات في نافذةٍ واحدة: **النموذج**، ثمّ **التأكيد** إن كان
 * الإنذار بالغًا الحدّ (تأكيدٌ ثانٍ يقول العاقبة صراحةً: تُسحب العضويّة فورًا)، ثمّ
 * **التسليم** — تنزيلُ الخطاب وفتحُ واتساب برسالته.
 *
 * والنغمة تقول شدّة الفعل (القاعدة ٩): إنذارٌ عاديّ محايد، والبالغُ الحدَّ أحمر.
 */
export function IssueWarningModal({
  open,
  targets,
  limit,
  preselect,
  onClose,
}: {
  open: boolean;
  targets: WarningTarget[];
  limit: number;
  /** عضوٌ جاء الأمرُ من كرته — يُثبَّت فلا يُختار غيره. */
  preselect?: string | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [userId, setUserId] = useState(preselect ?? "");
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [occurred, setOccurred] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [busy, setBusy] = useState(false);

  const target = targets.find((t) => t.id === userId) ?? null;
  // رتبةُ هذا الإنذار لو سُجّل الآن — تقديرٌ للعرض، والقاعدة هي التي تقولها يقينًا بعد التسجيل.
  const nextOrdinal = target ? target.activeCount + 1 : 0;
  const isFinal = !!target && nextOrdinal >= limit;

  // الواقعة أثرٌ ماضٍ: بين انضمام العضو واليوم. الحدّان هنا للتيسير، والحكمُ في القاعدة.
  const today = todayInRiyadh();
  const floor = target?.joinedDate ?? null;
  const dateError = !occurred
    ? undefined
    : occurred > today
      ? "تاريخ الواقعة لا يكون في المستقبل."
      : floor && occurred < floor
        ? `انضمّ العضو في ${floor} — لا واقعة قبل عضويّته.`
        : undefined;

  const ready = !!target && !!category && reason.trim().length >= 5 && !dateError;

  const reset = () => {
    setUserId(preselect ?? "");
    setCategory("");
    setReason("");
    setOccurred("");
    setIssued(null);
    setConfirm(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = () => {
    if (!target) return;
    setConfirm(false);
    start(async () => {
      const res = await issueWarning({
        userId: target.id,
        category,
        reason,
        committeeId: target.committeeId,
        occurredOn: occurred || null,
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      setIssued({
        target,
        ordinal: res.ordinal ?? nextOrdinal,
        activeCount: res.activeCount ?? nextOrdinal,
        category,
        reason,
        issuedAt: new Date().toISOString(),
        terminated: !!res.terminated,
      });
    });
  };

  const letterOf = (i: Issued) => ({
    name: i.target.name,
    gender: i.target.gender,
    // لحظةَ الإصدار: حالُه هو لقطتُه
    role: i.target.roleAr,
    committee: i.target.committee,
    ordinal: i.ordinal,
    category: i.category,
    reason: i.reason,
    issuedAt: i.issuedAt,
    activeCount: i.activeCount,
    limit,
  });

  const onDownload = async (i: Issued) => {
    setBusy(true);
    try {
      await downloadWarningLetter(letterOf(i));
      toast.success("نُزّل خطاب الإنذار.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر توليد الخطاب.");
    } finally {
      setBusy(false);
    }
  };

  const memberOptions: SelectOption[] = targets.map((t) => ({
    value: t.id,
    label: t.name,
    hint: [t.roleAr, t.committee].filter(Boolean).join(" — ") || undefined,
    group: t.activeCount > 0 ? "عليهم إنذارات سارية" : "بلا إنذارات",
    icon: <Avatar name={t.name} src={t.avatar ?? undefined} gender={t.gender} size="xs" />,
  }));

  const categoryOptions: SelectOption[] = WARNING_CATEGORIES.map((c) => ({ value: c.value, label: c.label }));

  // ── التسليم: الإنذار سُجّل، وبقي أن يبلغ صاحبَه ─────────────────────────
  if (issued) {
    const msg = warningWhatsappMessage(letterOf(issued));
    return (
      <Modal
        open={open}
        onClose={close}
        size="md"
        className={issued.terminated ? "mdl-tone-danger" : undefined}
        title={`سُجِّل ${warningTitle(issued.ordinal)} — ${issued.target.name}`}
        description="بقي أن يبلغ صاحبَه: نزّل الخطاب، ثمّ افتح محادثته وأرفقه بالرسالة."
        footer={
          <>
            <Button variant="primary" size="md" loading={busy} onClick={() => onDownload(issued)}>
              <DownloadSimple aria-hidden /> تنزيل الخطاب
            </Button>
            {issued.target.phone ? (
              <Button
                variant={issued.terminated ? "ghost-danger" : "ghost"}
                size="md"
                onClick={() => window.open(waHref(issued.target.phone!, msg), "_blank", "noopener")}
              >
                <WhatsappLogo aria-hidden /> فتح واتساب
              </Button>
            ) : null}
            <Button variant={issued.terminated ? "ghost-danger" : "ghost"} size="md" onClick={close}>إغلاق</Button>
          </>
        }
      >
        {issued.terminated ? (
          <Alert tone="danger" title="سُحبت العضويّة">
            بلغ {issued.target.name} حدَّ الإنذارات ({limit})، فسُحبت عضويّته فورًا. والخطابُ يقول ذلك.
          </Alert>
        ) : (
          <Alert tone="warning" title={remainingText(issued.activeCount, limit)}>
            {issued.target.name} عليه الآن {issued.activeCount} من {limit}.
          </Alert>
        )}
        {issued.target.phone ? null : (
          <Alert tone="info" title="لا جوّال مسجّل">لا رقم لهذا العضو، فيُبلَّغ بوسيلةٍ أخرى.</Alert>
        )}
      </Modal>
    );
  }

  // ── النموذج ──────────────────────────────────────────────────────────────
  return (
    <>
      <Modal
        open={open}
        onClose={close}
        size="md"
        busy={pending}
        className={isFinal ? "mdl-tone-danger" : undefined}
        title="إصدار إنذار"
        description="الإنذار سجلٌّ يبقى — اذكر سببه كما تكتبه في الخطاب."
        footer={
          <>
            <Button
              variant={isFinal ? "danger" : "primary"}
              size="md"
              loading={pending}
              disabled={!ready}
              onClick={() => (isFinal ? setConfirm(true) : submit())}
            >
              <Warning aria-hidden /> {isFinal ? `تسجيل ${warningTitle(nextOrdinal)}` : "تسجيل الإنذار"}
            </Button>
            <Button variant={isFinal ? "ghost-danger" : "ghost"} size="md" onClick={close} disabled={pending}>إلغاء</Button>
          </>
        }
      >
        <Select
          label="العضو"
          icon={<UserCircle />}
          options={memberOptions}
          value={userId}
          // تبديلُ العضو يبدّل أرضيّة التاريخ، فيسقط ما اختير قبله
          onValueChange={(v) => { setUserId(v); setOccurred(""); }}
          searchable
          required
          disabled={!!preselect}
          tone={isFinal ? "danger" : undefined}
        />

        {target ? (
          <Alert tone={isFinal ? "danger" : target.activeCount > 0 ? "warning" : "info"} title={`${target.name} — ${remainingText(target.activeCount, limit)}`}>
            {isFinal
              ? `عليه ${target.activeCount} من ${limit}. تسجيلُ هذا الإنذار يبلغ الحدّ، فتُسحب عضويّته فورًا.`
              : `عليه ${target.activeCount} من ${limit}. هذا سيكون ${warningTitle(nextOrdinal)}.`}
          </Alert>
        ) : null}

        <Select
          label="تصنيف المخالفة"
          icon={<Tag />}
          options={categoryOptions}
          value={category}
          onValueChange={setCategory}
          required
          tone={isFinal ? "danger" : undefined}
        />

        <Textarea
          label="سبب الإنذار"
          icon={<ChatCenteredText />}
          innerIcon={<NotePencil />}
          placeholder="اكتب ما وقع بدقّة — هذا النصّ يُطبع في الخطاب ويُرسَل للعضو."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          required
          helper="خمسة أحرف فأكثر."
        />

        <Field
          label="تاريخ الواقعة"
          icon={<CalendarBlank />}
          innerIcon={<User />}
          placeholder="اختر التاريخ"
          type="date"
          value={occurred}
          onChange={(e) => setOccurred(e.target.value)}
          min={floor ?? undefined}
          max={today}
          error={dateError}
          optional
          // مدى التاريخ من العضو نفسه، فلا يُفتح الحقل قبل أن يُعرف صاحبُه
          disabled={!target}
          helper={
            !target
              ? "اختر العضو أوّلًا — من انضمامه يُحسب أقدمُ تاريخٍ مقبول."
              : floor
                ? `إن اختلف عن تاريخ التسجيل — بين ${floor} واليوم.`
                : "إن اختلف عن تاريخ التسجيل."
          }
        />
      </Modal>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        tone="danger"
        icon={<Warning />}
        title={`هذا هو ${warningTitle(nextOrdinal)}`}
        text={`بتسجيله يبلغ ${target?.name ?? "العضو"} حدَّ الإنذارات (${limit})، فتُسحب عضويّته فورًا. لا رجوع بضغطة.`}
        confirmLabel={`سجّل ${ordinalWord(nextOrdinal)} واسحب العضويّة`}
        cancelLabel="تراجع"
        loading={pending}
        onConfirm={submit}
      />
    </>
  );
}
