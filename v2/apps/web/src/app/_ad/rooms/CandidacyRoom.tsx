"use client";

/**
 * **صفحةُ الترشّح** (محمد ٢٠٢٦-١١-١٧: «خلاص نختار باء»، بعد قوله في النافذة الضيّقة «طريقة العرض بشعة جدًّا»).
 * لكلّ ترشّحٍ عنوانُه تحت انتخابه (`/dashboard/elections/[id]/candidates/[cid]`)، تفتحه الغرفةُ من سطر المرشّح والإشعارُ من بلاغه:
 * البيانُ والملفُّ الانتخابيّ في صدرها يُقرآن، والقرارُ في جانبٍ يلازمك. ومن لا يقرّر (أو قُرّر فيه) يرى في الجانب ما قُرّر.
 *
 * الأفعالُ تمرّ بـ`useElectionApi` وحدها: الخادمُ في الصفحة الحقيقيّة، وعالمُ المحاكي في المختبر.
 */
import { useState, useTransition } from "react";
import { Field, Textarea } from "@adeeb/design-system";
import { Armchair, CalendarBlank, ChatText, Clock, FileText, LinkBreak, ListChecks, Note, Paperclip, UserMinus } from "@phosphor-icons/react";
import { ArrowLeft, ArrowSquareOut, Warning } from "@/app/_components/glyphs";
import type { CandidateRow, ElectionDetail } from "@/app/dashboard/elections/data";
import { useElectionApi } from "@/app/dashboard/elections/actions-context";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { byGender } from "@/app/dashboard/elections/vocab";
import { fromClubInput } from "@/lib/dates";
import { firstAndLastOf } from "@/lib/personName";
import { FormChoice } from "../form";
import { AdBadge, AdButton, AdEmpty } from "../primitives";
import { AdLine, AdSection } from "../account";
import { RecordTicket } from "../record";
import { dayParts } from "../format";
import { CAND, candBadge, candidateLine } from "./ElectionRecordRoom";
import { okReason, reasonHelper } from "./ElectionWindows";
import { ExclusionRequest, ExclusionSection, canRequestOn, type ExclusionViewer } from "./CandidacyExclusion";

// **كلُّ خيارٍ يقول ما يحدث للمرشّح** («مصطلحات الانتخابات» ٢٠٢٦-١١-١٧، البند ٢)، بأفعال المادة ١٤
const VERDICTS = [
  { value: "approved", label: "أعتمده" },
  { value: "needs_edit", label: "أطلب تعديله" },
  { value: "rejected", label: "أعتذر عنه" },
];
/** **زرُّ الحفظ يقول ما سيقع** (محمد ٢٠٢٦-١١-١٧: «جملةٌ أوضح من حفظ القرار») */
const SAVE: Record<string, string> = { approved: "اعتماد الترشّح", needs_edit: "إرسال طلب التعديل", rejected: "الاعتذار عن الترشّح" };
/** أسبابُ الاعتذار الثلاثة (المادة ١٤) بنصّها كما يقرؤه المدير */
const REJECT_REASONS = [
  { value: "ineligible", label: "لا تنطبق عليه شروط الترشّح", icon: <UserMinus /> },
  { value: "statement_violation", label: "البيان يخالف ضوابط الترشّح", icon: <Warning /> },
  { value: "unrelated", label: "البيان لا يتّصل بالمقعد", icon: <LinkBreak /> },
];

export function CandidacyRoom({ election: e, candidate: c, readOnly = false, backHref, candidateHref, viewer = { canRequest: false, isHrLeader: false } }: {
  election: ElectionDetail; candidate: CandidateRow; readOnly?: boolean;
  /** صفحةُ الانتخاب: يعود إليها المسارُ وزرُّ التذكرة */ backHref: string;
  /** بادئةُ صفحة ترشّحٍ آخر، يُلحق بها معرّفُه (نصٌّ لا دالّة: الصفحةُ خادمٌ يرسم عميلًا) */ candidateHref: string;
  /** بابُ الاستبعاد: من يطلبه، ومن يحسمه (المادة ١٦) */ viewer?: ExclusionViewer;
}) {
  const api = useElectionApi();
  const toast = useToast();
  const [busy, start] = useTransition();
  const [verdict, setVerdict] = useState("approved");
  const [reject, setReject] = useState("ineligible");
  const [reason, setReason] = useState("");
  const [when, setWhen] = useState("");

  const decidable = !readOnly && (c.status === "pending" || c.status === "needs_edit") && (e.status === "candidacy_open" || e.status === "candidacy_closed");
  const dueIso = fromClubInput(when) ?? "";
  // «في المستقبل» يُقاس ساعةَ الحفظ لا في الرسم (لا `Date.now` في الرسم)
  const ready = verdict === "approved" || (okReason(reason) && (verdict !== "needs_edit" || !!dueIso));
  const save = () => start(async () => {
    if (verdict === "needs_edit" && !(new Date(dueIso).getTime() > Date.now())) { toast.error("موعدُ التعديل يكون في المستقبل."); return; }
    const r = await api.reviewCandidate(c.id, verdict as "approved" | "needs_edit" | "rejected", reason, {
      editDueIso: verdict === "needs_edit" ? dueIso : null,
      rejectReason: verdict === "rejected" ? (reject as "ineligible" | "statement_violation" | "unrelated") : null,
    });
    // بعد الحفظ تبقى الصفحةُ وتتبدّل: الشارةُ حالُه الجديد، والجانبُ ما قُرّر
    if (r.ok) { toast.success(r.message); api.refresh(); }
    else toast.error(r.message);
  });

  const words = c.statement.trim() ? c.statement.trim().split(/\s+/).length : 0;
  const line = c.status === "pending" ? CAND.pending.label : candidateLine(c);
  // **التالي ينتظر المراجعة** (محمد ٢٠٢٦-١١-١٧): من قرّر لا يرجع إلى الغرفة ليفتح من بعده؛ يُبحث بعده في ترتيب الغرفة ثمّ من أوّلها
  const at = e.candidates.findIndex((x) => x.id === c.id);
  const next = readOnly ? null
    : [...e.candidates.slice(at + 1), ...e.candidates.slice(0, Math.max(at, 0))].find((x) => x.id !== c.id && x.status === "pending") ?? null;

  return (
    <div className="ad-room ad-elw-pg">
      {/* رأسُ الصفحة تذكرةُ الترشّح (قالبُ صفحة السجلّ)، والعودةُ في مسارها: «الانتخابات › المقعد» */}
      <RecordTicket
        path="/dashboard/elections"
        trail={[{ label: e.positionLabel, href: backHref }]}
        title={`ترشّح ${firstAndLastOf(c.name)}`}
        seed={c.id}
        stub={c.submittedRaw ? (() => { const d = dayParts(c.submittedRaw); return { big: d.day, small: d.month }; })() : undefined}
        chips={<AdBadge tone={candBadge(c).tone}>{candBadge(c).label}</AdBadge>}
        // **الرجوعُ زرٌّ في التذكرة** (محمد ٢٠٢٦-١١-١٧: «لماذا بدل كلّ هذا لا يكون زرًّا؟») كرجوع حملة الباركود، والمسارُ باقٍ فوق الكعب
        back={{ label: "العودة إلى الانتخاب", href: backHref }}
        acts={canRequestOn(e, c, viewer) ? <ExclusionRequest candidate={c} isHrLeader={viewer.isHrLeader} /> : undefined}
        // المقعدُ حقيقةٌ برمزها بجانب يوم التقدّم (محمد: «لماذا لا تكون أيقونةٌ ثانية باسم المنصب؟»)
        info={[
          { icon: <Armchair />, text: e.positionLabel },
          { icon: <CalendarBlank />, text: `${byGender(c.gender, "تقدّم", "تقدّمت")} في ${c.submitted}` },
        ]}
      />
      <div className="ad-elw-pg-cols">
        {/* **الملفُّ الانتخابيّ مع البيان لا في التذكرة** (محمد ٢٠٢٦-١١-١٧: «هل مكانه صحيح؟»): هو ما يُراجَع لا فعلٌ على السجلّ */}
        <div className="ad-elw-pg-main">
          <AdSection icon={<FileText />} title="البيان" sub={words ? `${words} كلمة` : undefined}
            media={<p className="ad-elw-stmt-t">{c.statement.trim() || "لم يكتب بيانًا."}</p>} />
          {/* لا ملفّ: فراغُ الهويّة الواحد (`AdEmpty`) لا سطرٌ باهت (محمد ٢٠٢٦-١١-١٧) */}
          {c.fileUrl ? (
            <AdSection icon={<Paperclip />} title="الملفّ الانتخابي">
              <AdLine icon={<FileText />} v={c.fileName ?? "الملفّ الانتخابي"} onClick={() => { void api.openFile(c.fileUrl!); }} act={{ icon: <ArrowSquareOut />, text: "فتح", label: "فتح الملفّ الانتخابي" }} />
            </AdSection>
          ) : (
            <AdSection icon={<Paperclip />} title="الملفّ الانتخابي" media={<AdEmpty icon={<Paperclip />} title="لم يرفق ملفًّا" desc="الملفُّ اختياريّ، والبيانُ وحده يكفي للترشّح." />} />
          )}
        </div>
        <div className="ad-elw-pg-side">
          {/* الاستبعادُ فوق القرار: ما بلغه الطلب، وفعلُ قائد الموارد حين يكون له فعل */}
          <ExclusionSection candidate={c} isHrLeader={viewer.isHrLeader} />
          {decidable ? (
            // القرارُ قسمٌ في الجانب، وفعلاه في قاعه كأفعال قالب النموذج: الأساسيُّ المادّة، و«تراجع» صندوق
            <AdSection icon={<ListChecks />} title="قرارك في الترشّح" sub="لا يُعاد النظر فيه بعد حفظه."
              media={
                <div className="ad-elw-decide">
                  <FormChoice label="القرار" items={VERDICTS} value={verdict} onChange={setVerdict} disabled={busy} />
                  {verdict === "needs_edit" ? (
                    <Field label="يُعدَّل قبل" type="datetime-local" icon={<CalendarBlank />} innerIcon={<Clock />} placeholder="" dir="ltr" value={when} onChange={(ev) => setWhen(ev.target.value)} required />
                  ) : null}
                  {/* أسبابُ الاعتذار سطورٌ مختارة بنصّها كاملًا (سطرُ «حسابي» بـ`current`)، لا مبدّلٌ يقصّها (محمد ٢٠٢٦-١١-١٧) */}
                  {verdict === "rejected" ? (
                    <ul className="ad-lines ad-elw-why" role="radiogroup" aria-label="سبب الاعتذار">
                      {REJECT_REASONS.map((r) => (
                        <AdLine key={r.value} icon={r.icon} v={r.label} current={reject === r.value} disabled={busy} onClick={() => setReject(r.value)} />
                      ))}
                    </ul>
                  ) : null}
                  {verdict !== "approved" ? (
                    <Textarea label={verdict === "needs_edit" ? "ما المطلوب تعديله" : "ملاحظةٌ للمرشّح"} icon={<ChatText />} innerIcon={<Note />} placeholder="تصل المرشّحَ مع القرار…"
                      rows={3} value={reason} onChange={(ev) => setReason(ev.target.value)} required helper={reasonHelper} />
                  ) : null}
                </div>
              }
              // «تراجع» حُذف (محمد ٢٠٢٦-١١-١٧): العودةُ زرُّ التذكرة، فلا فعلان لشيءٍ واحد
              foot={<div className="ad-elw-pg-acts"><AdButton variant="fill" busy={busy} disabled={!ready} onClick={save}>{SAVE[verdict]}</AdButton></div>} />
          ) : c.status === "frozen" ? null : (
            // من لا يقرّر، أو قُرّر فيه: ما قُرّر سطرًا بنبرته، كسطره في الغرفة
            <AdSection icon={<ListChecks />} title="القرار"
              foot={next ? <div className="ad-elw-pg-acts"><AdButton variant="fill" icon={<ArrowLeft />} href={`${candidateHref}${next.id}`}>{`التالي: ${firstAndLastOf(next.name)}`}</AdButton></div> : undefined}>
              <AdLine icon={<ChatText />} v={line} tone={c.status === "rejected" ? "bad" : c.status === "needs_edit" ? "warn" : undefined} />
            </AdSection>
          )}
        </div>
      </div>
    </div>
  );
}
