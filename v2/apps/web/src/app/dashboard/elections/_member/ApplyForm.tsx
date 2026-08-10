"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, FileButton, Radio, Textarea } from "@adeeb/design-system";
import { CheckCircle, Note, Paperclip, PencilSimple } from "@phosphor-icons/react";
import { Breadcrumb } from "../../_shell/Breadcrumb";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { useToast } from "../../_components/ToastProvider";
import { createClient } from "@/lib/supabase/client";
import { resubmitCandidacy, submitCandidacy, type CandidacyFile } from "../actions";
import type { ApplyContext } from "../member-data";

const MAX_FILE = 5 * 1024 * 1024; // ٥ ميغابايت (حدّ دلو election-files)
const ALLOWED_MIME = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "image/png", "image/jpeg"];

/**
 * صفحةُ إكمال الترشّح — بيانُ الترشّح وملفُّه (والأفضليّةُ عند مقعدٍ شقيق) بمساحةٍ مريحة، بدل النافذة.
 * تخدم **الجديد** (بعد بوّابة الشروط) و**التعديل** (من «سِجلّ ترشُّحي») بمصدرٍ واحد؛ الوضعُ يُشتقّ
 * من وجود ترشّحٍ قائم. الرفعُ بعميل الجلسة إلى دلو election-files، ثمّ تُمرَّر مسارُه للدالّة.
 *
 * وبعد **الترشّح الجديد** لا يُقذف العضو إلى صفحةٍ يختار له: نافذةُ نجاحٍ **تخيّره** بين «سِجلّ
 * ترشُّحي» (حيث يعيش ما أنشأ) و«ترشّح لمنصبٍ آخر» (يظهر حين تبقى فرصةٌ مفتوحة `otherOpen`).
 * أمّا **التعديل** فجاءه من السجلّ ويعود إليه، فيكفيه التوست.
 */
export function ApplyForm({ ctx, userId, preview = false }: { ctx: ApplyContext; userId: string; preview?: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const isEdit = ctx.existing !== null;
  const readOnly = isEdit && !ctx.existing!.canEdit;
  const backHref = isEdit ? "/dashboard/elections/my" : "/dashboard/elections/run";

  const [statement, setStatement] = useState(ctx.existing?.statement ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [pref, setPref] = useState<"this" | "sibling">("this");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const existingFile = ctx.existing?.fileName ?? null;
  const unchanged = isEdit && file === null && statement.trim() === (ctx.existing?.statement ?? "").trim();

  const back = () => { if (preview) { toast.success("محاكاة: رجوع"); return; } router.push(backHref); };
  const go = (href: string, what: string) => { if (preview) { toast.success(`محاكاة: ${what}`); setSent(false); return; } router.push(href); };

  const submit = () => {
    const s = statement.trim();
    if (s.length < 20) return setFormErr("بيان الترشّح قصيرٌ جدًّا (٢٠ حرفًا على الأقلّ).");
    if (file) {
      if (file.size > MAX_FILE) return setFormErr("الملفّ أكبر من ٥ ميغابايت.");
      if (file.type && !ALLOWED_MIME.includes(file.type)) return setFormErr("نوع الملفّ غير مسموح (PDF أو Word أو نصّ أو صورة).");
    }
    setFormErr(null);
    if (preview) {
      toast.success("محاكاة: أُرسل البيان (لا يُحفظ فعليًّا).");
      if (!isEdit) setSent(true);
      return;
    }
    start(async () => {
      let meta: CandidacyFile = null;
      if (file) {
        const sb = createClient();
        const path = `${userId}/${ctx.electionId}/${Date.now()}_${file.name.replace(/[^\w.\-]+/g, "_")}`;
        const up = await sb.storage.from("election-files").upload(path, file, { upsert: true, contentType: file.type || undefined });
        if (up.error) { setFormErr("تعذّر رفع الملفّ. تأكّد من نوعه وحجمه ثمّ أعِد المحاولة."); return; }
        meta = { url: path, name: file.name, size: file.size, mime: file.type || null };
      } else if (isEdit && ctx.existing?.fileUrl) {
        meta = { url: ctx.existing.fileUrl, name: ctx.existing.fileName ?? "ملفّ الترشّح", size: null, mime: null };
      }
      const r = isEdit
        ? await resubmitCandidacy(ctx.existing!.candidateId, s, meta)
        : await submitCandidacy(ctx.electionId, s, meta);
      if (r.ok) {
        if (ctx.sibling && ctx.committeeId != null) {
          const preferred = pref === "sibling" ? ctx.sibling.electionId : ctx.electionId;
          await createClient().rpc("set_seat_preference", { p_committee: ctx.committeeId, p_preferred_election: preferred });
        }
        toast.success(r.message);
        // الجديدُ يُخيَّر بنافذة النجاح، والتعديلُ يعود من حيث جاء (السجلّ)
        if (isEdit) router.push(backHref); else setSent(true);
      } else toast.error(r.message);
    });
  };

  return (
    <>
      <div className="ash-phead"><div><Breadcrumb leaf={isEdit ? "تعديل الترشّح" : "بيان الترشّح"} /><h1>{isEdit ? "تعديل ترشُّحك" : "بيانُ ترشُّحك"}</h1></div></div>

      <div style={{ display: "grid", gap: 14, maxWidth: 720 }}>
        <Alert tone="info" title="المنصب المتقدَّم له">{ctx.position}</Alert>

        {readOnly ? (
          <>
            <Alert tone="success" title="ترشّحُك معتمَد">اعتمدت إدارةُ الموارد ترشّحك، فلا يُقبل تعديلُه. هذا بيانك كما هو:</Alert>
            <p className="cjr-stmt">{ctx.existing?.statement}</p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="ghost" size="md" onClick={back}>رجوع</Button>
            </div>
          </>
        ) : (
          <>
            <Textarea
              label="بيان الترشّح"
              icon={<PencilSimple />}
              innerIcon={<Note />}
              placeholder="رؤيتُك للمنصب، وأهدافك، وخبرتك، دون ذكر اسمك…"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              rows={12}
              helper={`${statement.trim().length} / 4000 حرف (٢٠ على الأقلّ)`}
            />
            <div>
              <FileButton
                block
                icon={<Paperclip />}
                label={file ? file.name : existingFile ?? "إرفاق ملفٍّ (اختياريّ)"}
                hint={file ? "ملفٌّ جديد · اضغط لتغييره" : existingFile ? "الملفّ الحاليّ · اضغط لتغييره" : "PDF أو Word أو نصّ أو صورة"}
                onClick={() => fileRef.current?.click()}
              />
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>

            {ctx.sibling ? (
              <div style={{ display: "grid", gap: 8 }}>
                <Alert tone="info" title="لك ترشّحٌ آخر في هذه اللجنة">إن فزتَ بالمقعدين معًا، فأيَّهما تفضّل؟ تأخذ مفضّلَك، ويذهب الآخرُ للتالي في الأصوات.</Alert>
                <Radio card name="seat-pref" checked={pref === "this"} onChange={() => setPref("this")} label={ctx.position} description="المقعد الذي تُكمل ترشّحه الآن" />
                <Radio card name="seat-pref" checked={pref === "sibling"} onChange={() => setPref("sibling")} label={ctx.sibling.position} description="ترشّحك الآخر في هذه اللجنة" />
              </div>
            ) : null}

            {formErr ? <Alert tone="danger" title="تعذّر">{formErr}</Alert> : null}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <Button variant="ghost" size="md" onClick={back} disabled={pending}>رجوع</Button>
              <Button variant="primary" size="md" loading={pending} disabled={statement.trim().length < 20 || unchanged} onClick={submit}>
                {isEdit ? "حفظ التعديل" : "إرسال الترشّح"}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* نافذةُ النجاح — وجهتان لا وجهةً مفروضة؛ ومخرجُ النافذة (× وESC) يذهب إلى السجلّ فلا يبقى واقفًا. */}
      <ConfirmDialog
        open={sent}
        onClose={() => go("/dashboard/elections/my", "سِجلّ ترشُّحي")}
        tone="success"
        icon={<CheckCircle weight="bold" />}
        title="أُرسل ترشُّحك"
        text={`بيانُك في «${ctx.position}» صار عند إدارة الموارد البشرية للمراجعة، وتتابع حالته في سِجلّ ترشُّحك.`}
        confirmLabel="سِجلّ ترشُّحي"
        onConfirm={() => go("/dashboard/elections/my", "سِجلّ ترشُّحي")}
        cancelLabel="ترشّح لمنصبٍ آخر"
        onCancel={() => go("/dashboard/elections/run", "باب الترشُّح")}
        single={ctx.otherOpen === 0}
      />
    </>
  );
}
