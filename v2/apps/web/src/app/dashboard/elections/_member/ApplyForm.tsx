"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Alert, Button, FileButton, Radio, Textarea } from "@adeeb/design-system";
import { Note, Paperclip } from "@phosphor-icons/react";
import { CheckCircle, PencilSimple } from "@/app/_components/glyphs";
import { PageHeader } from "../../_components/PageHeader";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { useToast } from "../../_components/ToastProvider";
import { UPLOAD_RULES, attachHint, checkFile } from "@/lib/upload";
import { useDraft } from "@/lib/useDraft";
import type { CandidacyFile } from "../actions";
import { useElectionApi } from "../actions-context";
import { STATEMENT_MAX, STATEMENT_MIN, statementError } from "../vocab";
import type { ApplyContext } from "../member-data";

// وصفةُ المرفَق من قانون المرفقات — الحدُّ والصيغُ وجملُ الرفض هناك لا هنا (`lib/upload`)
const FILE_RULE = UPLOAD_RULES.candidacyFile;

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
  const api = useElectionApi();
  const [pending, start] = useTransition();
  const isEdit = ctx.existing !== null;
  const readOnly = isEdit && !ctx.existing!.canEdit;
  // التعديلُ جاء من صفحة الترشّح فيعود إليها، والترشّحُ الجديد من باب الترشُّح
  const backHref = isEdit ? `/dashboard/elections/my/${ctx.electionId}` : "/dashboard/elections/run";

  const serverStatement = ctx.existing?.statement ?? "";
  // `null` = لم يمسّ العضو الحقلَ بعد، فالمعروضُ يُشتقّ: مسوّدتُه إن وُجدت، وإلّا ما عند الخادم
  const [typed, setTyped] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  // المفضَّل مقعدٌ بعينه لا «هذا أو ذاك»: القسم قد يحمل ثلاثة مقاعد (تنسيقًا وقيادةً ونيابة).
  const [pref, setPref] = useState<string>(ctx.preferredElectionId);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // عمقٌ لا عَلَم: المرورُ فوق أبناء الزرّ يُطلق `dragleave` كذبًا، فتومض الحالةُ لولا العدّاد
  const dragDepth = useRef(0);

  /**
   * مسوّدةٌ محلّيّة: البيانُ يُكتب في جلسةٍ طويلة، فكان إغلاقُ لسانٍ أو انقطاعُ شبكةٍ أو كهرباء
   * يمحو ما كُتب. المفتاحُ بالعضو وبالمقعد معًا: الجهازُ قد يُشارَك، والمقاعدُ الشقيقةُ بياناتُها
   * مختلفة. ولا مسوّدةَ في المعاينة (`/ui`) ولا في وضع القراءة: لا حقلَ يُكتب فيه أصلًا.
   */
  const draftKey = preview || readOnly ? null : `candidacy:${userId}:${ctx.electionId}`;
  const draft = useDraft(draftKey, typed, serverStatement);
  const [dismissed, setDismissed] = useState(false);

  // الاستعادةُ اشتقاقٌ لا نسخ: ما لم يُكتب حرفٌ بعدُ، المعروضُ هو المسوّدةُ إن وُجدت
  const statement = typed ?? draft.found ?? serverStatement;
  // لا يُقال «استُعيدت» إلّا إن خالفت ما جاء من الخادم — والاستعادةُ تُقال ولا تُدَسّ على صاحبها
  const restored = !dismissed && draft.found !== null && draft.found !== serverStatement;

  const dropDraft = () => { draft.clear(); setTyped(serverStatement); setDismissed(true); };

  // طولُ البيان بعد التشذيب: عليه يقوم العدّادُ ونغمتُه وقفلُ الزرّ معًا
  const statementLen = statement.trim().length;

  const existingFile = ctx.existing?.fileName ?? null;
  const unchanged = isEdit && file === null && statement.trim() === serverStatement.trim();

  // حالُ زرّ المرفق تُشتقّ ولا تُخزَّن: رفعٌ جارٍ ← ملفٌّ حاضر ← دعوةٌ للإرفاق
  const fileState = pending && file ? "uploading" : file || existingFile ? "ready" : "attach";
  // إفراغُ الحقل: بلا تصفيرِ قيمته لا يُطلق `change` لو أعاد اختيار الملفّ نفسِه
  const clearFile = () => { setFile(null); if (fileRef.current) fileRef.current.value = ""; };

  /**
   * بوّابةٌ واحدةٌ للملفّ أيًّا جاء (نافذةُ الاختيار أو الإفلات) — والفحصُ هنا لا عند الإرسال
   * وحده، فالعضو يعرف عطبَ ملفّه ساعةَ اختاره لا بعد أن كتب بيانَه كلَّه.
   *
   * **والرفضُ إشعارٌ لا حالةٌ في الزرّ** (القاعدة ١٤): الزرُّ يبقى واصفًا لِما هو مرفَقٌ فعلًا،
   * فلا يحمرّ على ملفٍّ سليمٍ ولا يُسلَب صاحبُه مرفَقَه لأجل محاولةٍ فاشلة. والإشعارُ يسمّي
   * المرفوضَ باسمه كي يعرف أيَّ ملفٍّ يعني.
   */
  const acceptFile = (f: File) => {
    const why = checkFile(f, FILE_RULE);
    if (why) { toast.error(`لم يُقبل «${f.name}» : ${why}`); return; }
    setFile(f);
    // القبولُ يُقال كما يُقال الرفض — ويُقال بصدقٍ: الملفُّ أُرفق الآن ويُرفع مع الإرسال
    toast.success(`أُرفق «${f.name}»، ويُرفع مع إرسال ترشُّحك`);
  };

  // ملفٌّ يُسحَب لا نصٌّ ولا رابط — وإلّا اشتعل الزرّ لكلّ تحديدِ كلمةٍ يمرّ فوقه
  const draggingFile = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");
  const dropZone = {
    onDragEnter: (e: React.DragEvent) => {
      if (!draggingFile(e) || pending) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!draggingFile(e) || pending) return;
      // بلا `preventDefault` هنا لا يقع `drop` أصلًا — المتصفّح يرفض المنطقة
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!draggingFile(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (pending) return;
      // ملفٌّ واحدٌ لا أكثر: الحقلُ واحد، فيُؤخذ أوّلُ ما أُفلِت
      const f = e.dataTransfer.files?.[0];
      if (f) acceptFile(f);
    },
  };

  /**
   * حارسُ الصفحة: ملفٌّ يُفلَت **خارج** الزرّ يفتحه المتصفّحُ في مكان الصفحة، فيغادرها العضو
   * ويضيع بيانُ ترشُّحه المكتوب بلا إنذار. المنعُ هنا لهذه الصفحة وحدها، لا للموقع كلِّه.
   */
  useEffect(() => {
    const swallow = (e: DragEvent) => { if (e.dataTransfer?.types.includes("Files")) e.preventDefault(); };
    window.addEventListener("dragover", swallow);
    window.addEventListener("drop", swallow);
    return () => { window.removeEventListener("dragover", swallow); window.removeEventListener("drop", swallow); };
  }, []);

  const back = () => { if (preview) { toast.success("محاكاة: رجوع"); return; } api.nav(backHref); };
  const go = (href: string, what: string) => { if (preview) { toast.success(`محاكاة: ${what}`); setSent(false); return; } api.nav(href); };

  const submit = () => {
    const s = statement.trim();
    const badStatement = statementError(s);
    if (badStatement) return setFormErr(badStatement);
    // ظهيرٌ لا بابٌ أوّل: البوّابةُ `acceptFile` لا تدع معطوبًا يصل هنا، وهذا يمسك ما شذّ
    if (file) {
      const why = checkFile(file, FILE_RULE);
      if (why) { toast.error(why); return; }
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
        meta = await api.uploadCandidacyFile(userId, ctx.electionId, file);
        if (!meta) { toast.error("تعذّر رفع الملفّ، أعِد المحاولة"); return; }
      } else if (isEdit && ctx.existing?.fileUrl) {
        meta = { url: ctx.existing.fileUrl, name: ctx.existing.fileName ?? "ملفّ الترشّح", size: null, mime: null };
      }
      const r = isEdit
        ? await api.resubmitCandidacy(ctx.existing!.candidateId, s, meta)
        : await api.submitCandidacy(ctx.electionId, s, meta);
      if (r.ok) {
        if (ctx.siblings.length && ctx.departmentId != null) {
          await api.setSeatPreference(ctx.departmentId, pref);
        }
        // بلغ البيانُ القاعدةَ فانتهت حاجةُ المسوّدة: تُمحى هنا وحدَها لا عند كلّ خروج
        draft.clear();
        setDismissed(true);
        toast.success(r.message);
        // الجديدُ يُخيَّر بنافذة النجاح، والتعديلُ يعود من حيث جاء (السجلّ)
        if (isEdit) api.nav(backHref); else setSent(true);
      } else toast.error(r.message);
    });
  };

  return (
    <>
      <PageHeader title={isEdit ? "تعديل ترشُّحك" : "بيانُ ترشُّحك"} />

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
            {/* المرفقُ لا يُحفَظ (ملفُّ المتصفّح لا يدخل المخزن)، فيُقال صراحةً لا يُترك ليُكتشَف */}
            {restored ? (
              <Alert
                tone="info"
                title="استُعيدت مسوّدةٌ محفوظة"
                actions={<Button variant="ghost" size="sm" onClick={dropDraft}>{isEdit ? "العودة للبيان المرسَل" : "تجاهل المسوّدة"}</Button>}
              >
                هذا ما كتبتَه آخر مرّة في هذا المتصفّح، ولم يُرسَل بعد. أمّا المرفق فلا يُحفَظ، فأعِد إرفاقه إن أردتَه.
              </Alert>
            ) : null}
            <Textarea
              label="بيان الترشّح"
              icon={<PencilSimple />}
              innerIcon={<Note />}
              placeholder="رؤيتُك للمنصب، وأهدافك، وخبرتك، دون ذكر اسمك…"
              value={statement}
              onChange={(e) => setTyped(e.target.value)}
              rows={12}
              // النغمة تُقال بالحدّ والحلقة والأيقونات لا بلون النصّ وحده (قاعدة الحقول): محايدٌ حتى يبلغ الحدّ، ثمّ أخضر
              success={statementLen >= STATEMENT_MIN}
              helper={`${statementLen} / ${STATEMENT_MAX} حرف (${STATEMENT_MIN} حرف على الأقلّ)`}
            />
            {/* الزرُّ منطقةُ إفلاتٍ أيضًا: السحبُ طريقٌ ثانٍ والضغطُ باقٍ (الجوّالُ لا يسحب) */}
            <div {...dropZone}>
              <FileButton
                block
                state={fileState}
                dragging={dragging}
                icon={<Paperclip />}
                label={dragging ? "أفلِت الملفَّ هنا" : file ? file.name : existingFile ?? "إرفاق ملفٍّ (اختياريّ)"}
                hint={
                  /* الحدُّ يُقال قبل الاختيار لا بعد الفشل: من عرفه سلفًا لم يُصدَم به */
                  dragging ? attachHint(FILE_RULE)
                    : fileState === "uploading" ? "يُرفع ملفُّك الآن"
                    : file ? "ملفٌّ جديد، اضغط لتغييره"
                    : existingFile ? "الملفّ الحاليّ، اضغط لتغييره"
                    : `اضغط أو اسحب ملفَّك إلى هنا : ${attachHint(FILE_RULE)}`
                }
                onClick={() => fileRef.current?.click()}
                /* الإزالةُ تُعرَض لِما اختاره الآن وحده — أمّا الملفّ المحفوظ فحذفُه فعلٌ في الخادم */
                onRemove={file ? clearFile : undefined}
                removeLabel="إزالة الملفّ المختار"
              />
              <input
                ref={fileRef}
                type="file"
                accept={FILE_RULE.accept}
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); e.target.value = ""; }}
              />
            </div>

            {ctx.siblings.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                <Alert tone="info" title={ctx.siblings.length > 1 ? "لك ترشّحاتٌ أخرى في قسمك" : "لك ترشّحٌ آخر في قسمك"}>
                  في حال فوزك بأكثر من مقعد، أي مقعد تفضّل؟ ستحصل على اختيارك، وتذهب المقاعد الأخرى لمن يليك في الأصوات.
                </Alert>
                <Radio card name="seat-pref" checked={pref === ctx.electionId} onChange={() => setPref(ctx.electionId)} label={ctx.position} description="المقعد الذي تُكمل ترشّحه الآن" />
                {ctx.siblings.map((s) => (
                  <Radio key={s.electionId} card name="seat-pref" checked={pref === s.electionId} onChange={() => setPref(s.electionId)} label={s.position} description="ترشّحك الآخر في هذا القسم" />
                ))}
              </div>
            ) : null}

            {formErr ? <Alert tone="danger" title="تعذّر">{formErr}</Alert> : null}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <Button variant="ghost" size="md" onClick={back} disabled={pending}>رجوع</Button>
              <Button variant="primary" size="md" loading={pending} disabled={statementLen < STATEMENT_MIN || unchanged} onClick={submit}>
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
        icon={<CheckCircle />}
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
