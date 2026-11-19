"use client";

/**
 * **صفحةُ ترشّح العضو** (`/dashboard/elections/my/[electionId]`؛ رحلةُ العضو ع٦، الهويّة ٢٠٢٦-١١-١٧). على شكل صفحة الترشّح عند الإدارة
 * (`CandidacyRoom`) لأنّها الترشّحُ نفسُه بعين صاحبه: التذكرةُ بأفعاله (التعديل والانسحاب)، ثمّ ما ينتظره سطرًا بنغمة حاله، ثمّ بيانُه
 * وملفُّه في الصدر، وفي الجانب طلبُ الاستبعاد وإجابتُه إن كان، ورحلةُ ترشّحه.
 * **ولا اسمَ لفاعلٍ هنا** (قرار المالك ٢٠٢٦-٠٨-١٤): العضوُ يقرأ القرار وسببه، ولا يعرف من طلب استبعاده (المادة ٥).
 */
import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Textarea } from "@adeeb/design-system";
import { CalendarBlank, ChatText, FileText, Note, Paperclip, Path, PaperPlaneTilt } from "@phosphor-icons/react";
import { ArrowRight, ArrowSquareOut, PencilSimple, Prohibit } from "@/app/_components/glyphs";
import type { CandidacyJourney } from "@/app/dashboard/elections/member-data";
import { useElectionApi } from "@/app/dashboard/elections/actions-context";
import { KIND_ICON } from "@/app/dashboard/elections/logIcons";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { fmtStamp } from "@/lib/dates";
import { AdButton, AdConfirm, AdEmpty, AdNote, type AdTone } from "../primitives";
import { AdLine, AdSection } from "../account";
import { RecordTicket } from "../record";
import { dayParts, fmtDayFull } from "../format";
import { myBadge, myTone } from "./MemberElectionsRooms";
import { okReason, reasonHelper } from "./ElectionWindows";

const NOTE_TONE: Record<AdTone, "ok" | "warn" | "bad" | "info"> = { ok: "ok", warn: "warn", bad: "bad", info: "info", neutral: "info" };

export function MyCandidacyRoom({ c }: { c: CandidacyJourney }) {
  const api = useElectionApi();
  const toast = useToast();
  const [busy, start] = useTransition();
  const [ask, setAsk] = useState(false);
  // **الرجوعُ إلى حيث جاء** (محمد ٢٠٢٦-١١-١٩: «كيف أرجع لصفحة الترشّح؟»): من باب الترشّح («افتح ترشّحي» بـ`?from=run`) يعود إليه،
  // ومن سواه (سِجلّ ترشّحي، إشعار) إلى سِجلّ ترشّحي الذي تنتمي إليه الصفحة
  const fromRun = useSearchParams().get("from") === "run";
  const [answer, setAnswer] = useState("");

  const withdraw = () => start(async () => {
    const r = await api.withdrawCandidacy(c.candidateId);
    if (r.ok) { toast.success(r.message); setAsk(false); api.refresh(); } else toast.error(r.message);
  });
  const sendAnswer = () => start(async () => {
    if (!c.freeze) return;
    const r = await api.answerFreeze(c.freeze.id, answer);
    if (r.ok) { toast.success(r.message); api.refresh(); } else toast.error(r.message);
  });

  const words = c.statement.trim() ? c.statement.trim().split(/\s+/).length : 0;
  const f = c.freeze;

  return (
    <div className="ad-room ad-elw-pg">
      <RecordTicket
        path="/dashboard/elections/my"
        title={c.position}
        seed={c.candidateId}
        stub={c.submittedIso ? (() => { const d = dayParts(c.submittedIso); return { big: d.day, small: d.month }; })() : undefined}
        chips={myBadge(c)}
        info={[
          ...(c.submittedIso ? [{ icon: <CalendarBlank />, text: `تقدّمت في ${fmtDayFull(c.submittedIso)}` }] : []),
          { icon: <Path />, text: c.cycle },
        ]}
        acts={<>
          <AdButton variant="soft" size="sm" icon={<ArrowRight />} href={fromRun ? "/dashboard/elections/run" : "/dashboard/elections/my"}>{fromRun ? "العودة إلى الترشّح" : "العودة إلى سِجلّ ترشّحي"}</AdButton>
          {c.canEdit ? <AdButton variant="fill" size="sm" icon={<PencilSimple />} href={`/dashboard/elections/my/${c.electionId}/edit`}>تعديل الترشّح</AdButton> : null}
        </>}
      />

      {/* ما ينتظره سطرًا بنغمة حاله (رسالةُ `next` من مصدرها الواحد `journey.ts`، بجنس صاحبه). وطلبُ الاستبعاد يقوله قسمُه في الجانب
          بسببه ومهلته وحقل إجابته، فلا يُكرَّر هنا */}
      {f ? null : <AdNote tone={NOTE_TONE[myTone(c)]} label="حال ترشّحك" title={c.next} />}

      <div className="ad-elw-pg-cols">
        <div className="ad-elw-pg-main">
          <AdSection icon={<FileText />} title="بيانك" sub={words ? `${words} كلمة، ويراه المصوّتون مع اسمك وصورتك` : undefined}
            media={<p className="ad-elw-stmt-t">{c.statement.trim() || "لم تكتب بيانًا."}</p>} />
          {c.fileUrl ? (
            <AdSection icon={<Paperclip />} title="ملفّك الانتخابي">
              <AdLine icon={<FileText />} v={c.fileName ?? "الملفّ الانتخابي"} onClick={() => { void api.openFile(c.fileUrl!); }} act={{ icon: <ArrowSquareOut />, text: "فتح", label: "فتح ملفّك الانتخابي" }} />
            </AdSection>
          ) : (
            <AdSection icon={<Paperclip />} title="ملفّك الانتخابي" media={<AdEmpty icon={<Paperclip />} title="لم ترفق ملفًّا" desc="الملفُّ اختياريّ، وبيانُك وحده يكفي." />} />
          )}
        </div>

        <div className="ad-elw-pg-side">
          {/* طلبُ الاستبعاد: الحقيقةُ وسببُها ومهلتُها، وحقلُ الإجابة ما دامت المهلة. ولا اسمَ لمن طلبه (المادة ٥) */}
          {f && f.status === "active" ? (
            <AdSection icon={<Prohibit />} title="طُلب استبعاد ترشّحك" tone="bad"
              sub={f.answerDueRaw ? `أجب قبل ${fmtStamp(f.answerDueRaw)}، وإلّا استُبعد ترشّحك` : undefined}
              media={
                // السببُ يُقرأ أوّلًا ثمّ تُكتب الإجابة: قسمٌ واحدٌ بترتيب القراءة (كان السببُ سطرًا بعد الحقل)
                <div className="ad-elw-decide">
                  <ul className="ad-lines ad-elw-why"><AdLine icon={<ChatText />} k="السبب" v={f.reason} /></ul>
                  <Textarea label="إجابتك" icon={<ChatText />} innerIcon={<Note />} placeholder="بيّن ما جرى، وتصل إجابتك قائدَ الموارد البشرية…" rows={4}
                    value={answer} onChange={(ev) => setAnswer(ev.target.value)} required helper={reasonHelper} />
                </div>
              }
              foot={<div className="ad-elw-pg-acts"><AdButton variant="fill" icon={<PaperPlaneTilt />} busy={busy} disabled={!okReason(answer)} onClick={sendAnswer}>إرسال إجابتي</AdButton></div>} />
          ) : null}
          {f && f.status === "answered" ? (
            <AdSection icon={<ChatText />} title="وصلت إجابتك" sub={f.decideDueRaw ? `والقرار قبل ${fmtStamp(f.decideDueRaw)}، وإلّا بقي ترشّحك` : undefined}
              media={<p className="ad-elw-stmt-t">{f.answerText?.trim() || "—"}</p>}>
              <AdLine icon={<Prohibit />} k="سبب الطلب" v={f.reason} />
            </AdSection>
          ) : null}

          {/* رحلةُ الترشّح: ما جرى عليه بالترتيب، وكلُّ قرارٍ بملاحظته. والقادمُ آخرُها باهتًا */}
          {/* الانسحابُ في قاع الرحلة لا في رأس الصفحة (محمد ٢٠٢٦-١١-١٩: «٣ أزرار مرّة كثير»): فعلٌ نادرٌ لا رجعة فيه بيد صاحبه،
              فلا يجاور «تعديل الترشّح» حيث تقع اليد */}
          <AdSection icon={<Path />} title="رحلة ترشّحك"
            foot={c.canWithdraw ? <div className="ad-elw-pg-acts"><AdButton variant="danger" size="sm" icon={<Prohibit />} onClick={() => setAsk(true)}>الانسحاب من الترشّح</AdButton></div> : undefined}>
            {c.trail.map((ev, i) => (
              <AdLine key={i} icon={KIND_ICON[ev.kind]} v={ev.label} sub={[ev.date, ev.note].filter(Boolean).join("، ") || undefined} />
            ))}
            {c.future ? <AdLine icon={KIND_ICON.open} v={c.future} sub="قادمٌ بعد هذه المرحلة" tone="muted" /> : null}
          </AdSection>
        </div>
      </div>

      <AdConfirm
        open={ask}
        onClose={() => setAsk(false)}
        tone="danger"
        icon={<Prohibit />}
        title="الانسحاب من الترشّح"
        text={`ينتهي ترشّحك لـ«${c.position}»، ولا تُرجعه بنفسك: تُرجعه إدارة الموارد البشرية بطلبك قبل فتح التصويت.`}
        confirmLabel="انسحاب"
        loading={busy}
        onConfirm={withdraw}
      />
    </div>
  );
}
