"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { Alert, Button, Modal } from "@adeeb/design-system";
import { CaretLeft, PencilSimple } from "@/app/_components/glyphs";

/**
 * **سطرُ غرف البوّابة** — لغةُ «حسابي» التي صارت قدوةَ الغرف كلِّها (قرار المالك ٢٠٢٦-١٠-١٣).
 * أيقونةٌ في مربّع، وتسميةٌ صغيرةٌ فوق قيمةٍ عريضة، ووصفٌ تحتها، وفعلٌ واحدٌ في طرفه. والسطرُ
 * كلُّه زرٌّ إن كان له فعل. والحالُ قيمةٌ أو وصفٌ ملوّنٌ بنغمته (`tone`) وأيقونتُه معه، لا شارة.
 * أنماطُه `.acc-*` في المكتبة، وقواعدُه في `claude/portal-unification.md` («لغة الغرف»).
 */

/** أيقونةُ السطر: من Phosphor أو من `glyphs` (المستثناةُ بكلمة المالك تُستورد منها وحدها). */
export type Ico = ComponentType<{ className?: string }>;

/**
 * فعلُ السطر — الأيقونةُ تقوله والاسمُ للقارئ الصوتيّ. **القلمُ وحده بلا كلمة** (معروفٌ ومتكرّر)،
 * وكلُّ فعلٍ سواه أيقونةٌ وكلمة. والسهمُ الاتّجاهيّ (`trail`) بعد الكلمة: «فتح ‹».
 */
export type Act = { Icon: Ico; label: string; danger?: boolean; text?: string; trail?: boolean };

export function ActIcon({ act }: { act: Act }) {
  const cls = "acc-act" + (act.text ? " has-text" : "") + (act.trail ? " is-trail" : "") + (act.danger ? " is-danger" : "");
  return <span className={cls} title={act.label} aria-hidden>{act.trail ? <>{act.text}<act.Icon /></> : <><act.Icon />{act.text ?? null}</>}</span>;
}

export const EDIT: Act = { Icon: PencilSimple as unknown as Ico, label: "تعديل" };
// السهمُ من قائمة الاستثناء (glyphs) لا من Phosphor مباشرةً
const CaretLeftIco = CaretLeft as unknown as Ico;
/** «فتح ‹» — فعلُ سطرٍ يمضي بك إلى غرفةٍ أو صفحة. */
export const CaretAct = (label: string, text = "فتح"): Act => ({ Icon: CaretLeftIco, label, text, trail: true });

export type Tone = "ok" | "wait" | "bad" | "muted";

export function Row({ Icon, k, v, sub, act, ltr, tone, toneAt = "v", danger, onClick, href, disabled }: {
  Icon: Ico; k?: string; v: string; sub?: string; act?: Act; ltr?: boolean;
  tone?: Tone; toneAt?: "v" | "sub"; danger?: boolean;
  /** فعلُ السطر. */
  onClick?: () => void;
  /** أو وجهتُه: السطرُ رابطٌ لا زرّ. */
  href?: string;
  disabled?: boolean;
}) {
  const cls = "acc-row" + (danger ? " is-danger" : "");
  const vt = tone && toneAt === "v" ? `is-${tone}` : "";
  const body = (
    <>
      <span className={"acc-ic" + (tone ? ` is-${tone}` : "")} aria-hidden><Icon /></span>
      <span className="acc-kv">
        {k ? <small>{k}</small> : null}
        <b className={[ltr ? "acc-ltr" : "", vt].filter(Boolean).join(" ") || undefined}>{v}</b>
        {sub ? <i className={tone && toneAt === "sub" ? `is-${tone}` : undefined}>{sub}</i> : null}
      </span>
      {act ? <ActIcon act={act} /> : null}
    </>
  );
  const label = act ? (k ? `${act.label}: ${k}` : act.label) : undefined;
  if (act && href) return <Link className={cls} href={href} aria-label={label}>{body}</Link>;
  return act
    ? <button type="button" className={cls} onClick={onClick} aria-label={label} disabled={disabled}>{body}</button>
    : <div className={cls}>{body}</div>;
}

/**
 * سطرٌ ينفتح للتعديل في نافذةٍ صغيرة (المالك ٢٠٢٦-١٠-١٣) — الحقلُ يُمرَّر، والحفظُ فعلٌ يُرجع
 * رسالةَ خطأٍ أو `null`. والنافذةُ لا تُغلق وهو يعمل، ولا تُغلق على خطأ.
 */
export function EditRow({ Icon, k, v, empty, ltr, field, onSave, busy, error, onOpen }: {
  Icon: Ico; k: string; v: string; empty?: string; ltr?: boolean;
  field: ReactNode;
  onSave: () => Promise<boolean>;
  busy?: boolean;
  error?: string | null;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const close = () => { if (!busy) setOpen(false); };
  const save = async () => { if (await onSave()) setOpen(false); };
  return (
    <>
      <button type="button" className="acc-row" onClick={() => { onOpen?.(); setOpen(true); }} aria-label={`${v ? "تعديل" : "إضافة"} ${k}`}>
        <span className="acc-ic" aria-hidden><Icon /></span>
        <span className="acc-kv">
          <small>{k}</small>
          <b className={[ltr && v ? "acc-ltr" : "", v ? "" : "is-empty"].filter(Boolean).join(" ") || undefined}>{v || empty}</b>
        </span>
        <ActIcon act={EDIT} />
      </button>
      <Modal open={open} onClose={close} busy={busy} title={v ? `تعديل ${k}` : `إضافة ${k}`} size="sm"
        footer={<><Button variant="primary" loading={busy} onClick={save}>حفظ</Button><Button variant="ghost" onClick={close} disabled={busy}>إلغاء</Button></>}>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {field}
      </Modal>
    </>
  );
}
