"use client";

/**
 * **الحرمانُ من الترشّح** (المادة ١١ من نظام الانتخابات؛ الهويّة ٢٠٢٦-١١-١٧): لرئيس أدِيب وحده، من سطر العضو في «أعضاء أدِيب»
 * (حيث يُفعل بالأشخاص: الإنذار، والإنهاء). النافذةُ تقرأ الحرمانَ القائم أوّلًا: فإن كان، قالته ورفعته بسبب؛ وإلّا حرمت بسببٍ
 * وآخرِ يومٍ فيه، لا يجاوز سنةً من اليوم. والحرمانُ يُنهي ترشّحاته القائمة ما لم يُفتح تصويتها.
 */
import { useEffect, useState, useTransition } from "react";
import { Button, Field, Modal, Textarea } from "@adeeb/design-system";
import { CalendarBlank, CalendarX, ChatText, Note } from "@phosphor-icons/react";
import { banFromCandidacy, liftCandidacyBan, loadCandidacyBan } from "@/app/dashboard/elections/actions";
import type { CandidacyBan } from "@/app/dashboard/elections/member-data";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { fmtDayFull } from "../format";
import { AdLine } from "../account";
import { okReason, reasonHelper } from "./ElectionWindows";

/** اليومُ بتوقيت النادي، وآخرُ يومٍ يجوز (سنةٌ منه) — «YYYY-MM-DD» لحقل التاريخ */
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
const inAYear = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" }); };

/** تُركَّب لكلّ عضوٍ تُفتح له (`key`)، فحالُها يولد معها: لا تصفيرَ في أثر */
export function CandidacyBanModal({ member, onClose }: { member: { id: string; name: string; gender?: string | null }; onClose: () => void }) {
  const toast = useToast();
  const [busy, start] = useTransition();
  const [ban, setBan] = useState<CandidacyBan | null | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("");
  // اليومُ يُحسب ساعةَ الفتح (مُهيِّئٌ كسول)، لا في كلّ رسم
  const [bounds] = useState(() => ({ min: today(), max: inAYear() }));

  useEffect(() => {
    let live = true;
    loadCandidacyBan(member.id).then((r) => {
      if (!live) return;
      if (r.error) { toast.error(r.error); onClose(); return; }
      setBan(r.ban);
    });
    return () => { live = false; };
  }, [member, onClose, toast]);

  const she = member.gender === "female";
  const close = () => { if (!busy) onClose(); };
  const done = (ok: boolean, message: string) => { if (ok) { toast.success(message); onClose(); } else toast.error(message); };
  const okUntil = !!until && until >= bounds.min && until <= bounds.max;

  // قيد القراءة: النافذةُ تُفتح بعنوانها، والمتنُ ينتظر
  if (ban === undefined) {
    return <Modal open onClose={close} size="sm" title="الحرمان من الترشّح" description={member.name}><p className="ad-elw-note">يُقرأ حالُ {she ? "ترشّحها" : "ترشّحه"}…</p></Modal>;
  }

  if (ban) {
    return (
      <Modal open onClose={close} busy={busy} size="sm" title="رفع الحرمان" description={member.name}
        footer={
          <>
            <Button variant="primary" size="md" loading={busy} disabled={!okReason(reason)}
              onClick={() => start(async () => { const r = await liftCandidacyBan(ban.id, reason); done(r.ok, r.message); })}>رفع الحرمان</Button>
            <Button variant="ghost" size="md" onClick={close} disabled={busy}>تراجع</Button>
          </>
        }>
        <ul className="ad-lines ad-elw-why">
          <AdLine icon={<CalendarX />} k={she ? "محرومةٌ من الترشّح حتى" : "محرومٌ من الترشّح حتى"} v={fmtDayFull(`${ban.until}T12:00:00+03:00`)} />
          <AdLine icon={<ChatText />} k="السبب" v={ban.reason} />
        </ul>
        <Textarea label="سبب رفعه" icon={<ChatText />} innerIcon={<Note />} placeholder={she ? "يصلها مع القرار…" : "يصله مع القرار…"} rows={3}
          value={reason} onChange={(ev) => setReason(ev.target.value)} required helper={reasonHelper} />
      </Modal>
    );
  }

  return (
    <Modal open onClose={close} busy={busy} size="sm" className="mdl-tone-danger" title="الحرمان من الترشّح" description={member.name}
      footer={
        <>
          <Button variant="danger" size="md" loading={busy} disabled={!okReason(reason) || !okUntil}
            onClick={() => start(async () => { const r = await banFromCandidacy(member.id, reason, until); done(r.ok, r.message); })}>{she ? "حرمانها" : "حرمانه"}</Button>
          <Button variant="ghost" size="md" onClick={close} disabled={busy}>تراجع</Button>
        </>
      }>
      <Field label="آخر يوم في الحرمان" type="date" icon={<CalendarBlank />} innerIcon={<CalendarX />} placeholder="" dir="ltr"
        min={bounds.min} max={bounds.max} value={until} onChange={(ev) => setUntil(ev.target.value)} required helper="لا يجاوز سنةً من اليوم." />
      <Textarea label="السبب" icon={<ChatText />} innerIcon={<Note />} placeholder={she ? "يصلها مع القرار…" : "يصله مع القرار…"} rows={3}
        value={reason} onChange={(ev) => setReason(ev.target.value)} required helper={reasonHelper} />
      <p className="ad-elw-note">{she
        ? "ينتهي به كلُّ ترشّحٍ قائمٍ لها ما لم يُفتح تصويته، ولا تترشّح حتى يمضي أجله أو يُرفع."
        : "ينتهي به كلُّ ترشّحٍ قائمٍ له ما لم يُفتح تصويته، ولا يترشّح حتى يمضي أجله أو يُرفع."}</p>
    </Modal>
  );
}
