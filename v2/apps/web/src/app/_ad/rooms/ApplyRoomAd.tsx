"use client";

/**
 * **بيانُ الترشّح بالهويّة** (رحلةُ العضو ع٥ وع٧، ٢٠٢٦-١١-١٩): الترشّحُ الجديد (`/run/[electionId]` بعد بوّابة الشروط) وتعديلُه (`/my/[electionId]/edit`)
 * بمصدرٍ واحد. على قالب النموذج المعتمد (`FormRoom`، «التذكرةُ الحيّة»): الأقسامُ في العريض، وفي الجانب الأفعالُ ثمّ **كرتُك كما يراه الناخبون**
 * في ورقة التصويت (كرتُ الشخص نفسُه، `BallotRoomAd`)، يتبدّل بيانُه وأنت تكتب.
 * والسلوكُ سلوكُ النموذج القديم (`ApplyForm`) كما هو:
 * - **مسوّدةٌ محلّيّة** بالعضو والمقعد (`useDraft`)، تُقال حين تُستعاد ولا تُدَسّ، والمرفقُ لا يُحفظ فيها فيُقال ذلك.
 * - **الملفُّ** بحقل الرفع المعتمد (`AdUpload` بالملفّ لا الصورة)، يُفحص ساعةَ يُختار (`checkFile`) ويُرفع مع الإرسال.
 * - **الأفضليّةُ** بين مقاعد القسم حين يكون لك ترشّحٌ آخر فيه (المادة ٢٧).
 * - **بعد الترشّح الجديد** نافذةُ نجاحٍ تخيّرك بين «سِجلّ ترشُّحي» و«ترشّح لمقعدٍ آخر»؛ والتعديلُ يعود إلى صفحة ترشّحك.
 */
import { useState, useTransition } from "react";
import { Textarea } from "@adeeb/design-system";
import { Armchair, BookOpenText, FileDashed, FilePdf, FileText, Note, PaperPlaneTilt, Paperclip, Path } from "@phosphor-icons/react";
import { Check, CheckCircle, PencilSimple } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { UPLOAD_RULES, attachHint, checkFile } from "@/lib/upload";
import { useDraft } from "@/lib/useDraft";
import { formatBytesAr } from "@/lib/bytes";
import type { CandidacyFile } from "@/app/dashboard/elections/actions";
import { useElectionApi } from "@/app/dashboard/elections/actions-context";
import { STATEMENT_MAX, STATEMENT_MIN, statementError } from "@/app/dashboard/elections/vocab";
import type { ApplyContext } from "@/app/dashboard/elections/member-data";
import { AdButton, AdCard, AdConfirm, AdNote } from "../primitives";
import { AdLine, AdLineVoid } from "../account";
import { FormRoom, FormSection } from "../form";
import { AdUpload } from "../upload";

// وصفةُ المرفَق من قانون المرفقات — الحدُّ والصيغُ وجملُ الرفض هناك لا هنا (`lib/upload`)
const FILE_RULE = UPLOAD_RULES.candidacyFile;
const isPdf = (f: { type?: string | null; name?: string | null }) => !!(f.type?.includes("pdf") || f.name?.toLowerCase().endsWith(".pdf"));

export function ApplyRoomAd({ ctx, userId, me }: {
  ctx: ApplyContext; userId: string;
  /** وجهُك واسمُك في كرت «كما يراك المصوّتون» */
  me: { name: string; avatarUrl: string | null; gender: "male" | "female" | null };
}) {
  const toast = useToast();
  const api = useElectionApi();
  const [pending, start] = useTransition();
  const isEdit = ctx.existing !== null;
  const readOnly = isEdit && !ctx.existing!.canEdit;
  // التعديلُ جاء من صفحة الترشّح فيعود إليها، والترشّحُ الجديد من باب الترشُّح
  const backHref = isEdit ? `/dashboard/elections/my/${ctx.electionId}` : "/dashboard/elections/run";

  const serverStatement = ctx.existing?.statement ?? "";
  const [typed, setTyped] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pref, setPref] = useState<string>(ctx.preferredElectionId);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const draftKey = readOnly ? null : `candidacy:${userId}:${ctx.electionId}`;
  const draft = useDraft(draftKey, typed, serverStatement);
  const [dismissed, setDismissed] = useState(false);
  const statement = typed ?? draft.found ?? serverStatement;
  const restored = !dismissed && draft.found !== null && draft.found !== serverStatement;
  const dropDraft = () => { draft.clear(); setTyped(serverStatement); setDismissed(true); };

  const statementLen = statement.trim().length;
  const existingFile = ctx.existing?.fileUrl ? (ctx.existing.fileName ?? "الملفّ الانتخابي") : null;
  const unchanged = isEdit && file === null && statement.trim() === serverStatement.trim();
  const ready = statementLen >= STATEMENT_MIN && !unchanged;
  const dirty = !readOnly && (file !== null || statement.trim() !== serverStatement.trim());

  // الفحصُ ساعةَ الاختيار لا عند الإرسال وحده؛ والرفضُ إشعارٌ يسمّي الملفّ، والحقلُ يبقى على ما فيه
  const acceptFile = (f: File) => {
    const why = checkFile(f, FILE_RULE);
    if (why) { toast.error(`لم يُقبل «${f.name}»: ${why}`); return; }
    setFile(f);
    toast.success(`أُرفق «${f.name}»، ويُرفع مع إرسال ترشّحك`);
  };

  const submit = () => {
    const s = statement.trim();
    const bad = statementError(s);
    if (bad) { setFormErr(bad); return; }
    if (file) { const why = checkFile(file, FILE_RULE); if (why) { toast.error(why); return; } }
    setFormErr(null);
    start(async () => {
      let meta: CandidacyFile = null;
      if (file) {
        meta = await api.uploadCandidacyFile(userId, ctx.electionId, file);
        if (!meta) { toast.error("تعذّر رفع الملفّ، أعِد المحاولة"); return; }
      } else if (isEdit && ctx.existing?.fileUrl) {
        meta = { url: ctx.existing.fileUrl, name: ctx.existing.fileName ?? "الملفّ الانتخابي", size: null, mime: null };
      }
      const r = isEdit
        ? await api.resubmitCandidacy(ctx.existing!.candidateId, s, meta)
        : await api.submitCandidacy(ctx.electionId, s, meta);
      if (!r.ok) { toast.error(r.message); return; }
      if (ctx.siblings.length && ctx.departmentId != null) await api.setSeatPreference(ctx.departmentId, pref);
      draft.clear();
      setDismissed(true);
      toast.success(r.message);
      if (isEdit) api.nav(backHref); else setSent(true);
    });
  };

  // **كرتُك كما يراه الناخبون**: كرتُ الشخص من ورقة التصويت نفسُه، ببيانك وأنت تكتبه وملفّك أو سطرِ غيابه
  const fileShown = file ? { name: "الملفّ الانتخابي", sub: [isPdf(file) ? "PDF" : file.name.split(".").pop()?.toUpperCase(), formatBytesAr(file.size)].filter(Boolean).join("، ") }
    : existingFile ? { name: "الملفّ الانتخابي", sub: undefined } : null;
  const she = me.gender === "female";
  const preview = (
    <AdCard seed={`apply-${ctx.electionId}`} title={me.name}
      face={{ name: me.name, src: me.avatarUrl, gender: me.gender }}
      extra={
        <div className="ad-blt-pc">
          <p className="ad-elw-stmt-t ad-blt-pc-stmt">{statement.trim() || "يظهر بيانك هنا وأنت تكتبه."}</p>
          {fileShown
            ? <ul className="ad-lines ad-elw-why"><AdLine icon={<Paperclip />} v={fileShown.name} sub={fileShown.sub} /></ul>
            : <AdLineVoid icon={<FileDashed />} text={she ? "لم ترفق ملفًّا انتخابيًّا" : "لم يرفق ملفًّا انتخابيًّا"} />}
        </div>
      }
      foot={<>
        <AdButton variant="soft" size="sm" icon={<BookOpenText />} onClick={() => {}}>قراءة البيان كاملًا</AdButton>
        <AdButton variant="soft" size="sm" icon={<Check />} onClick={() => {}}>اختيار</AdButton>
      </>} />
  );

  // المقعدُ في العنوان (كـ«باركود جديد في حملة «…»»)، لا قسمًا لحقيقةٍ واحدة لا تُكتب
  const title = isEdit ? `تعديل ترشّحك لـ«${ctx.position}»` : `ترشّحك لـ«${ctx.position}»`;

  if (readOnly) {
    return (
      <FormRoom path={isEdit ? "/dashboard/elections/my" : "/dashboard/elections/run"} title={title} preview={preview} previewLabel={{ label: "كما يراك المصوّتون", icon: <Note /> }}
        commit={{ primary: { label: "صفحة ترشّحك", icon: <Path />, onClick: () => api.nav(backHref) }, cancelHref: backHref }}>
        <AdNote tone="ok" label="ترشّحك معتمَد" title="اعتمدت إدارةُ الموارد البشرية ترشّحك، فلا يُعدَّل بعد اعتماده." />
        <FormSection icon={<Note />} title="بيانك">
          <p className="ad-elw-stmt-t">{serverStatement}</p>
        </FormSection>
      </FormRoom>
    );
  }

  return (
    <>
      <FormRoom path={isEdit ? "/dashboard/elections/my" : "/dashboard/elections/run"} title={title} preview={preview} previewLabel={{ label: "كما يراك المصوّتون", icon: <Note /> }}
        commit={{
          primary: { label: isEdit ? "حفظ التعديل" : "إرسال الترشّح", icon: <PaperPlaneTilt />, onClick: submit, busy: pending, held: !ready },
          cancelHref: backHref,
          dirty,
        }}>
        {formErr ? <AdNote tone="bad" label="تعذّر الإرسال" title={formErr} /> : null}
        {restored ? (
          <AdNote tone="info" label="استُعيدت مسوّدتك" title="هذا ما كتبته آخر مرّةٍ في هذا المتصفّح ولم يُرسَل بعد. أمّا الملفّ فلا يُحفظ في المسوّدة، فأعِد إرفاقه إن أردته."
            action={<AdButton variant="soft" size="sm" icon={<PencilSimple />} onClick={dropDraft}>{isEdit ? "العودة إلى البيان المرسَل" : "تجاهل المسوّدة"}</AdButton>} />
        ) : null}

        <FormSection icon={<Note />} title="بيانك" mark="required" sub="يراه المصوّتون مع اسمك وصورتك">
          <div className="form-grid">
            <Textarea className="form-full" label="بيان الترشّح" icon={<PencilSimple />} innerIcon={<Note />}
              placeholder="رؤيتك للمقعد، وأهدافك، وخبرتك…" rows={12} value={statement} onChange={(e) => { setTyped(e.target.value); setFormErr(null); }}
              count={{ min: STATEMENT_MIN, max: STATEMENT_MAX }} helper={`${STATEMENT_MIN} حرف على الأقلّ.`} required />
          </div>
        </FormSection>

        <FormSection icon={<Paperclip />} title="ملفّك الانتخابي" mark="optional">
          <AdUpload label="الملف" noun="file" whole unlabeled icon={<Paperclip />} accept={FILE_RULE.accept} alt="ملفّك الانتخابي"
            value={null} busy={pending && !!file} help={attachHint(FILE_RULE)} onFile={acceptFile} onClear={pending || !file ? undefined : () => setFile(null)}
            file={file ? { name: file.name, meta: formatBytesAr(file.size), icon: isPdf(file) ? <FilePdf /> : <FileText /> }
              : existingFile ? { name: existingFile, meta: "ملفّك الحاليّ، واختر غيره لتبديله", icon: <FileText /> } : null} />
        </FormSection>

        {ctx.siblings.length ? (
          <FormSection icon={<Armchair />} title="المقعد الذي تفضّله" sub="إن فزت بأكثر من مقعدٍ في قسمك أخذتَ ما تفضّله، وذهب الآخرُ لمن يليك">
            <ul className="ad-lines ad-elw-why">
              <AdLine icon={<Armchair />} v={ctx.position} sub="المقعد الذي تكمل ترشّحه الآن" current={pref === ctx.electionId} onClick={() => setPref(ctx.electionId)} />
              {ctx.siblings.map((s) => (
                <AdLine key={s.electionId} icon={<Armchair />} v={s.position} sub="ترشّحك الآخر في قسمك" current={pref === s.electionId} onClick={() => setPref(s.electionId)} />
              ))}
            </ul>
          </FormSection>
        ) : null}
      </FormRoom>

      {/* نافذةُ النجاح: وجهتان لا وجهةً مفروضة، ومخرجُها يذهب إلى السجلّ فلا يبقى واقفًا */}
      <AdConfirm open={sent} onClose={() => api.nav("/dashboard/elections/my")} tone="success" icon={<CheckCircle />} title="أُرسل ترشّحك"
        text={`بيانك في «${ctx.position}» عند إدارة الموارد البشرية للمراجعة، وتتابع حاله في سِجلّ ترشّحك.`}
        confirmLabel="سِجلّ ترشّحي" onConfirm={() => api.nav("/dashboard/elections/my")}
        cancelLabel="ترشّح لمقعدٍ آخر" onCancel={() => api.nav("/dashboard/elections/run")} single={ctx.otherOpen === 0} />
    </>
  );
}
