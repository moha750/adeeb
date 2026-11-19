"use client";

/**
 * **بابُ الاستبعاد في صفحة الترشّح** (المادة ١٦؛ «مصطلحات الانتخابات» ٢٠٢٦-١١-١٧، البند ٥: «الاستبعاد» لا «التجميد»).
 * أربعُ خطواتٍ على ترشّحٍ واحد، كلٌّ بيد صاحبها:
 * ١. عضوُ الموارد يطلب: السببُ (الضابطُ الذي خولف)، ومهلةُ الإجابة، وأجلُ القرار ← `requestFreeze`. وطلبُ القائد بنفسه يُمهِل فورًا.
 * ٢. قائدُ الموارد يوافق فيُمهَل المرشّح، أو يردّ الطلب ← `approveFreeze`.
 * ٣. المرشّحُ يجيب من رحلته (لا من هنا) ← `answerFreeze`.
 * ٤. القائدُ يقرّر بعد الإجابة: يبقى الترشّح أو يُستبعد ← `decideFreeze`. ومضيُّ المهلة بلا إجابة يستبعد آليًّا، ومضيُّ أجل القرار يُبقيه.
 * والجدولُ في القاعدة اسمُه `election_freezes` وحالُ المرشّح `frozen`: الكلمةُ تغيّرت في الشاشة وحدها.
 */
import { useState, useTransition } from "react";
import { Button, Modal, Textarea } from "@adeeb/design-system";
import { ChatText, Note, Scales, UserCircle } from "@phosphor-icons/react";
import { Check, Prohibit } from "@/app/_components/glyphs";
import type { CandidateRow, ElectionDetail } from "@/app/dashboard/elections/data";
import { useElectionApi } from "@/app/dashboard/elections/actions-context";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { ElectionResult } from "@/app/dashboard/elections/actions";
import { fmtStamp } from "@/lib/dates";
import { byGender } from "@/app/dashboard/elections/vocab";
import { FormChoice } from "../form";
import { AdButton } from "../primitives";
import { AdLine, AdSection } from "../account";
import { okReason, reasonHelper } from "./ElectionWindows";

/** من ينظر: عضوٌ في الموارد يطلب، وقائدُها يحسم (من مقعده، لا من قدرة) */
export type ExclusionViewer = { canRequest: boolean; isHrLeader: boolean };

/** **المهلتان ٢٤ ساعةً ثابتتين** (محمد ٢٠٢٦-١١-١٩): يومٌ يُجيب فيه المرشّح (المادة ١٦)، ويومٌ تقرّر فيه القائدةُ بعد إجابته. كان أجلُ القرار
 *  يُختار (يوم، يومان، ثلاثة) فلم يُفهم: «إيش الفكرة منه؟»، فسقط الاختيارُ وبقي في النافذة السببُ وحده */
const ANSWER = "1 day";
const DECIDE = "1 day";

/** يُطلب استبعادُ ترشّحٍ قائمٍ ما لم يُعلَن الفائز، ولا طلبَ قائمٌ عليه */
export const canRequestOn = (e: ElectionDetail, c: CandidateRow, v: ExclusionViewer) =>
  v.canRequest && !c.freeze && (c.status === "pending" || c.status === "approved" || c.status === "needs_edit")
  && e.status !== "completed" && e.status !== "cancelled";

function useRun() {
  const api = useElectionApi();
  const toast = useToast();
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<ElectionResult>, after?: () => void) => start(async () => {
    const r = await fn();
    if (r.ok) { toast.success(r.message); after?.(); api.refresh(); }
    else toast.error(r.message);
  });
  return { api, busy, run };
}

/** زرُّ «طلب استبعاد» ونافذتُه: فعلٌ خطِرٌ بنبرته، ونافذتُه حمراءُ الرأس كنافذة الإلغاء */
export function ExclusionRequest({ candidate: c, isHrLeader }: { candidate: CandidateRow; isHrLeader: boolean }) {
  const { api, busy, run } = useRun();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const close = () => { if (!busy) setOpen(false); };
  return (
    <>
      <AdButton variant="danger" size="sm" icon={<Prohibit />} onClick={() => { setReason(""); setOpen(true); }}>طلب استبعاد</AdButton>
      {open ? (
        <Modal open onClose={close} busy={busy} size="sm" className="mdl-tone-danger" title="طلب استبعاد" description={c.name}
          footer={
            <>
              <Button variant="danger" size="md" loading={busy} disabled={!okReason(reason)}
                onClick={() => run(() => api.requestFreeze(c.id, reason, ANSWER, DECIDE), () => setOpen(false))}>{isHrLeader ? "إمهاله ليُجيب" : "إرسال الطلب"}</Button>
              <Button variant="ghost" size="md" onClick={close} disabled={busy}>تراجع</Button>
            </>
          }>
          <Textarea label="الضابط الذي خالفه" icon={<ChatText />} innerIcon={<Note />} placeholder="ما الذي خالفه من ضوابط الدعاية؟…" rows={3}
            value={reason} onChange={(ev) => setReason(ev.target.value)} required helper={reasonHelper} />
          <p className="ad-elw-note">{isHrLeader
            ? "يُمهَل المرشّح يومًا ليُجيب، ثمّ تقرّر خلال يومٍ من إجابته، ويغيب عن ورقة التصويت حتى يُحسم أمره."
            : "يصل الطلبُ قائدَ الموارد البشرية، فإن وافق خلال 24 ساعة أُمهل المرشّح يومًا ليُجيب، وإلّا سقط الطلب. ولا يعرف المرشّح من طلبه."}</p>
        </Modal>
      ) : null}
    </>
  );
}

/** قسمُ الاستبعاد في جانب الصفحة: ما بلغه الطلب، وفعلُ القائد حين يكون له فعل */
export function ExclusionSection({ candidate: c, isHrLeader }: { candidate: CandidateRow; isHrLeader: boolean }) {
  const { api, busy, run } = useRun();
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState<"lift" | "exclude">("lift");
  // «ردّ الطلب» لا يُعطَّل صامتًا (كان معطّلًا بلا سبب يُرى): يُضغط، فإن نقص السببُ قاله الحقلُ نفسُه بلونه
  const [needWhy, setNeedWhy] = useState(false);
  const f = c.freeze;
  if (!f) return null;
  const he = (m: string, w: string) => byGender(c.gender, m, w);

  const facts = (
    <>
      <AdLine icon={<ChatText />} k="السبب" v={f.reason} />
      {f.requestedBy ? <AdLine icon={<UserCircle />} k="طلبه" v={f.requestedBy} sub={fmtStamp(f.requestedAtRaw) ?? undefined} /> : null}
    </>
  );

  // **يسقط الطلبُ إن لم يُوافَق عليه خلال ٢٤ ساعة** (محمد ٢٠٢٦-١١-١٩؛ الكنّاسةُ في القاعدة، الدفعة ٨)
  const lapse = f.status === "requested" ? fmtStamp(new Date(Date.parse(f.requestedAtRaw) + 24 * 3600_000).toISOString()) : null;
  if (f.status === "requested") {
    return (
      <>
        <AdSection icon={<Prohibit />} title="طلب استبعاد" sub={`${isHrLeader ? "ينتظر موافقتك" : "ينتظر موافقة قائد الموارد البشرية"}${lapse ? ` حتى ${lapse}، وإلّا سقط` : ""}`} tone="bad">{facts}</AdSection>
        {/* قرارُ القائد قسمٌ وحده بعد الحقائق، كـ«قرارك في الترشّح»: يُقرأ الطلبُ أوّلًا ثمّ يُحكم فيه */}
        {isHrLeader ? (
          <AdSection icon={<Scales />} title="قرارك في الطلب" sub={he("الموافقةُ تُمهِله في الحال.", "الموافقةُ تُمهِلها في الحال.")}
            media={
              <div className="ad-elw-decide">
                <Textarea label="ملاحظتك" icon={<ChatText />} innerIcon={<Note />} placeholder="تُكتب في السجلّ مع قرارك…" rows={2}
                  value={reason} onChange={(ev) => { setReason(ev.target.value); setNeedWhy(false); }} optional={!needWhy}
                  error={needWhy ? "ردُّ الطلب يحتاج سببه: عشرة أحرف فأكثر." : undefined}
                  helper={needWhy ? undefined : "اختياريّة عند الإمهال، ولازمةٌ عند ردّ الطلب."} />
              </div>
            }
            foot={
              <div className="ad-elw-pg-acts ad-elw-pg-acts-2">
                <AdButton variant="danger" icon={<Prohibit />} busy={busy} onClick={() => run(() => api.approveFreeze(f.id, true, reason))}>{he("إمهاله ليُجيب", "إمهالها لتُجيب")}</AdButton>
                <AdButton variant="soft" icon={<Scales />} disabled={busy} onClick={() => { if (!okReason(reason)) { setNeedWhy(true); return; } run(() => api.approveFreeze(f.id, false, reason)); }}>ردّ الطلب</AdButton>
              </div>
            } />
        ) : null}
      </>
    );
  }

  if (f.status === "active") {
    const due = fmtStamp(f.answerDueRaw);
    // المهلةُ وما بعدها في سطر العنوان: إن لم يُجب فيها استُبعد آليًّا
    return (
      <AdSection icon={<Prohibit />} title="قيد الاستبعاد" sub={due ? `${he("مُمهَل ليُجيب", "مُمهَلة لتُجيب")} قبل ${due}، وإلّا ${he("استُبعد", "استُبعدت")}` : undefined} tone="bad">
        {facts}
      </AdSection>
    );
  }

  // أجاب: الطلبُ ثمّ إجابتُه تُقرآن، ثمّ يقرّر القائدُ قبل أجله
  const due = fmtStamp(f.decideDueRaw);
  return (
    <>
      <AdSection icon={<Prohibit />} title="قيد الاستبعاد" sub={due ? `القرار قبل ${due}، وإلّا بقي الترشّح` : undefined} tone="bad">{facts}</AdSection>
      <AdSection icon={<ChatText />} title={he("إجابته", "إجابتها")} sub={f.answeredAtRaw ? fmtStamp(f.answeredAtRaw) ?? undefined : undefined}
        media={<p className="ad-elw-stmt-t">{f.answerText?.trim() || "—"}</p>} />
      {isHrLeader ? (
        <AdSection icon={<Scales />} title="قرارك في الاستبعاد" sub="لا يُعاد النظر فيه بعد حفظه."
          media={
            <div className="ad-elw-decide">
              <FormChoice label="قرارك" items={[{ value: "lift", label: he("أُبقي ترشّحه", "أُبقي ترشّحها") }, { value: "exclude", label: he("أستبعده", "أستبعدها") }]}
                value={outcome} onChange={(v) => setOutcome(v as "lift" | "exclude")} disabled={busy} />
              <Textarea label="السبب" icon={<ChatText />} innerIcon={<Note />} placeholder={he("يصل المرشّحَ مع القرار…", "يصل المرشّحةَ مع القرار…")} rows={3}
                value={reason} onChange={(ev) => setReason(ev.target.value)} required helper={reasonHelper} />
            </div>
          }
          foot={
            <div className="ad-elw-pg-acts">
              <AdButton variant={outcome === "exclude" ? "danger" : "fill"} icon={outcome === "exclude" ? <Prohibit /> : <Check />} busy={busy} disabled={!okReason(reason)}
                onClick={() => run(() => api.decideFreeze(f.id, outcome, reason))}>{outcome === "exclude" ? "استبعاد المرشّح" : "إبقاء الترشّح"}</AdButton>
            </div>
          } />
      ) : null}
    </>
  );
}
