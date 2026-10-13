"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, CardHeader, Modal, Textarea } from "@adeeb/design-system";
import {
  CalendarCheck, Certificate, ChatText, ClockCounterClockwise, HandHeart, Hourglass, ListBullets, Path, UsersThree,
} from "@phosphor-icons/react";
import { CaretDown, CaretUp, CheckCircle, MagnifyingGlass, Prohibit, Question, Star, XCircle } from "@/app/_components/glyphs";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "../_components/ToastProvider";
import { CaretAct, EDIT, Row, type Ico } from "./Row";
import { rpcError } from "./volunteerRpc";
import type { HistIcon, UpIcon, VolunteerView } from "./volunteer";

/**
 * **غرفةُ «تطوّعي»** — المعتمَدةُ في المختبر («يعتمد تبويب تطوّعي»، المالك ٢٠٢٦-١٠-١٣).
 * العريضُ لما تفعله: مشاركاتُك الجارية (بسحبٍ أو اعتذار)، ثمّ الفرصُ المفتوحة يتقدّمها سطرُ رغباتك.
 * والضيّقُ لما فعلته: «رحلتك» لوحُ الهويّة الصلب، و«سجلّك» كـ«سجلّك» في «حجوزاتي» حرفًا بحرف.
 */

const UP_ICON: Record<UpIcon, Ico> = { accepted: CalendarCheck, pending: Hourglass, ended: ClockCounterClockwise };
const HIST_ICON: Record<HistIcon, Ico> = { attended: CheckCircle, star: Star, absent: XCircle, off: Prohibit };
const HIST_SHOWN = 5;

export function VolunteerRoom({ view }: { view: VolunteerView }) {
  const router = useRouter();
  const toast = useToast();
  const [sb] = useState(() => createClient());
  const [allHist, setAllHist] = useState(false);
  const [target, setTarget] = useState<{ id: string; title: string; act: "withdraw" | "excuse" } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const close = () => { if (!busy) { setTarget(null); setReason(""); setErr(null); } };
  const confirm = async () => {
    if (!target) return;
    if (target.act === "excuse" && !reason.trim()) { setErr("اكتب سببَ اعتذارك."); return; }
    setErr(null);
    setBusy(true);
    const { error } = target.act === "withdraw"
      ? await sb.rpc("withdraw_my_application", { p_id: target.id })
      : await sb.rpc("excuse_my_application", { p_id: target.id, p_reason: reason.trim() });
    setBusy(false);
    if (error) { setErr(rpcError(error.message)); return; }
    toast.success(target.act === "withdraw" ? "سُحب طلبك." : "وصل اعتذارُك إلى المشرف.");
    setTarget(null);
    setReason("");
    router.refresh();
  };

  const { trip } = view;
  const maxH = Math.max(1, ...trip.months.map((m) => m.h));
  const hist = allHist ? view.history : view.history.slice(0, HIST_SHOWN);

  return (
    <div className="acc-cols is-wide-aside">
      <div className="acc-main">
        <Card>
          <CardHeader variant="soft" icon={<HandHeart aria-hidden />} title="مشاركاتك الجارية" />
          {view.upcoming.length ? view.upcoming.map((u) => (
            <Row key={u.id} Icon={UP_ICON[u.icon]} k={u.when} v={u.title} sub={u.say} tone={u.tone} toneAt="sub"
              act={u.act ? { Icon: XCircle, label: u.act === "withdraw" ? "سحب الطلب" : "الاعتذار عن المشاركة", danger: true, text: u.act === "withdraw" ? "سحب" : "اعتذار" } : undefined}
              onClick={u.act ? () => setTarget({ id: u.id, title: u.title, act: u.act! }) : undefined} />
          )) : <Row Icon={HandHeart} v="لا مشاركةَ جاريةً لك" sub="اختر من الفرص المفتوحة ما يناسبك" tone="muted" toneAt="sub" />}
        </Card>

        <Card>
          <CardHeader variant="soft" icon={<MagnifyingGlass aria-hidden />} title="فرصٌ مفتوحة" subtitle={view.prefs.length ? "ما يناسب رغباتك أوّلًا" : undefined} />
          {/* الرغباتُ سطرٌ أوّل في كرت الفرص: السببُ بجانب نتيجته */}
          <Row Icon={HandHeart} k="رغباتك" v={view.prefs.length ? view.prefs.join("، ") : "لم تحدّدها بعد"} act={{ ...EDIT, label: "تعديل رغباتك" }} href="/join" />
          {view.opps.length ? view.opps.map((o) => (
            <Row key={o.id} Icon={UsersThree} k={[o.committee, o.fit ? "من رغباتك" : null].filter(Boolean).join("، ") || "فرصة تطوّع"} v={o.title} sub={o.sub}
              act={CaretAct(`تفاصيل ${o.title}`)} href={`/dashboard/volunteer/${o.id}`} />
          )) : <Row Icon={MagnifyingGlass} v="لا فرصةَ مفتوحةً الآن" sub="نُعلن الجديدَ في إشعاراتك وفي قروب المتطوّعين" tone="muted" toneAt="sub" />}
        </Card>
      </div>

      <aside className="acc-aside">
        <Card className="avr-trip">
          <CardHeader variant="solid" className="acard-header-pattern" icon={<Path aria-hidden />} title="رحلتك"
            subtitle={view.since} />
          <div className="avr-trip-body">
            <div className="avr-hours">
              <b>{trip.hours}</b>
              <span>ساعة تطوّع{trip.nowNote ? <small>{trip.nowNote}</small> : null}</span>
            </div>
            <div className="avr-months" style={{ gridTemplateColumns: `repeat(${trip.months.length}, 1fr)` }} role="img"
              aria-label={`ساعاتك شهرًا بشهر: ${trip.months.map((m) => `${m.name} ${m.h}`).join("، ")}`}>
              {trip.months.map((m) => (
                <div key={m.key} className={"avr-m" + (m.now ? " is-now" : "")}>
                  <em>{m.h}</em>
                  <i style={{ height: `${Math.max(4, (m.h / maxH) * 100)}%` }} />
                  <span>{m.name}</span>
                </div>
              ))}
            </div>
            <div className="avr-figs">
              <div><HandHeart aria-hidden /><b>{trip.joined}</b><span>مشاركة</span></div>
              <div><Star aria-hidden /><b>{trip.stars}</b><span>بتميّز</span></div>
              <div><Certificate aria-hidden /><b>{trip.certs}</b><span>شهادة</span></div>
            </div>
          </div>
        </Card>

        {view.history.length ? (
          <Card>
            <CardHeader variant="soft" icon={<ClockCounterClockwise aria-hidden />} title="سجلّك" />
            {hist.map((h) => (
              <Row key={h.id} Icon={HIST_ICON[h.icon]} k={h.when} v={h.title} sub={h.out} tone={h.tone} toneAt="sub"
                act={h.cert ? { Icon: Certificate, label: `شهادة ${h.title}`, text: "شهادتك" } : undefined}
                href={h.cert ? "/dashboard/certificates" : undefined} />
            ))}
            {view.history.length > HIST_SHOWN ? (
              allHist
                ? <Row Icon={ListBullets} v="اطوِ القائمة" sub={`ويبقى آخرُ ${HIST_SHOWN} مشاركات`}
                    act={{ Icon: CaretUp as unknown as Ico, label: "طيّ السجلّ", text: "أقلّ" }} onClick={() => setAllHist(false)} />
                : <Row Icon={ListBullets} v="السجلُّ كاملًا" sub={`${view.history.length} مشاركة`}
                    act={{ Icon: CaretDown as unknown as Ico, label: "عرض السجلّ كاملًا", text: "عرض" }} onClick={() => setAllHist(true)} />
            ) : null}
          </Card>
        ) : null}
      </aside>

      <Modal open={target !== null} onClose={close} busy={busy} size="sm" className="mdl-tone-danger"
        title={target?.act === "withdraw" ? "سحب الطلب" : "الاعتذار عن المشاركة"}
        footer={<>
          <Button variant="danger" size="sm" loading={busy} onClick={confirm}>{target?.act === "withdraw" ? "اسحب الطلب" : "أرسل اعتذاري"}</Button>
          <Button variant="ghost" size="sm" onClick={close} disabled={busy}>تراجع</Button>
        </>}>
        <p className="text-content-muted">
          {target?.act === "withdraw"
            ? `يُسحب طلبك على «${target?.title}» قبل مراجعته، ولك أن تقدّم ثانيةً ما دامت مفتوحة.`
            : `يصل اعتذارُك عن «${target?.title}» إلى المشرف، ويُخلى مكانُك لغيرك.`}
        </p>
        {err ? <Alert tone="danger">{err}</Alert> : null}
        {target?.act === "excuse"
          ? <Textarea label="سبب الاعتذار" icon={<ChatText />} innerIcon={<Question />} placeholder="سطرٌ يقرؤه المشرف" rows={2}
              value={reason} onChange={(e) => setReason(e.target.value)} required />
          : null}
      </Modal>
    </div>
  );
}

