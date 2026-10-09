"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Field, FileButton, SectionCard, Switch } from "@adeeb/design-system";
import { File as FileIcon, FilePdf, Globe, ImageSquare, LinkSimple, QrCode, TextAa } from "@phosphor-icons/react";
import { ArrowLeft } from "@/app/_components/glyphs";
import { QR_TITLE_MAX, SITE_ORIGIN, checkCode, checkTarget, newQrCode, qrShortUrl, type QrKind } from "@/lib/qrLinks";
import { UPLOAD_RULES, attachHint, fileMeta } from "@/lib/upload";
import { PageHeader } from "../../../_components/PageHeader";
import { useToast } from "../../../_components/ToastProvider";
import { createQrLink, isQrCodeTaken } from "../actions";
import { defaultQrSpec } from "../defaults";
import { uploadQrFile } from "../uploadFile";
import { KindPicker } from "../KindPicker";
import { checkQrFile, isPdf } from "@/lib/qrFile";

/** ما يُختار وما يُقال قبل الاختيار: الصيغُ الأربعُ وحدُّ الدلو (الـPDF لا يُصغَّر فحدُّه الأضيق). */
const PICK_RULE = UPLOAD_RULES.qrFile;
const HINT = attachHint(UPLOAD_RULES.qrFileStored);

/**
 * **الخطوةُ الأولى: اسمٌ ورابط** (قرارُ المالك ٢٠٢٦-٠٨-٢٢).
 *
 * كان المحرّرُ هو ما يستقبلك، والاسمُ والرابطُ حقلين فيه بين الألوان والأشكال. فانقسم
 * البابُ خطوتين: **البيانات ثمّ الشكل**. وليست ترتيبًا أجمل وحسب، بل هي ما يجعل المعاينةَ
 * صادقة:
 *
 * الرمزُ القصيرُ يُولَد هنا، فيدخل المصمِّمُ على **رمزٍ حيٍّ يُمسح فيعمل**، وعددُ وحداته هو
 * عددُ وحدات المطبوع لا يزيد ولا ينقص مهما طالت الوجهة. وقبل هذا كانت المعاينةُ إمّا رمزًا
 * نائبًا لا وجهةَ له، وإمّا رمزًا يحمل الوجهةَ نفسَها فيكثُف بطولها ثمّ يتبدّل عند الحفظ.
 *
 * **والصفُّ يُنشأ هنا قبل أن يُصمَّم**: من كتب اسمًا ورابطًا ثمّ انصرف خلّف رمزًا بهيئته
 * الأولى في «رموزي»، يُحذف بيده كأيّ رمز.
 *
 * **والوجهةُ رابطٌ أو ملف** (م٢١ وم٢٤): الملفُّ (صورةٌ أو PDF) يُختار هنا ويُعايَن، ولا يُرفع إلّا
 * عند «ابدأ»: من اختار ثمّ انصرف لم يترك في الدلو ملفًّا لا يشير إليه شيء.
 */
export function NewQrView({
  campaignId = null,
  campaignName = null,
}: {
  /** حاويتُه إن وُلد من غرفة حملة (`?campaign=`). */
  campaignId?: string | null;
  campaignName?: string | null;
} = {}) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<QrKind>("link");
  const [target, setTarget] = useState("");
  /** الملفُّ المختار، ولم يُرفع بعد. */
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  // المعاينةُ للصورة وحدها: الـPDF يُعرَف باسمه وحجمه في زرّ المرفق
  const imageUrl = useMemo(() => (file && !isPdf(file) ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);
  const [code, setCode] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);
  /**
   * **المثالُ رمزٌ حقيقيٌّ يُقرَع مرّةً واحدة**: `abc` نصٌّ لا يشبه ما سيقع، والقارعُ في كلّ
   * رسمةٍ يجعل السطرَ يرقص تحت الإصبع. فيُقرَع عند فتح الشاشة ويثبت.
   */
  const [sample] = useState(() => newQrCode());
  /** حالُ الفحص اللحظيّ: لا شيء · يُسأل · متاح · مأخوذ. */
  const [avail, setAvail] = useState<"idle" | "asking" | "free" | "taken">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = target.trim();
  // الحَكَمُ نفسُه الذي يحرس الخادم، فلا رسالتان لعيبٍ واحد
  const link = trimmed ? checkTarget(trimmed) : null;
  const linkError = link && !link.ok ? link.message : null;
  /**
   * **الرمزُ اختياريٌّ ويُختار مرّةً واحدة**: من تركه أخذ سبعةَ محارفَ مقروعة، ومن كتبه ملك
   * عنوانًا يُقرأ ويُملى (`‎/q/majles`). ولا يُبدَّل بعد اليوم: الرمزُ محفورٌ في كلّ ملصقٍ
   * يُطبَع، وتبديلُه يقتل ورقةً في الشارع — ولذلك لا يُعرَض في نافذة التعديل أصلًا.
   */
  const wanted = code.trim();
  const codeCheck = wanted ? checkCode(wanted) : null;
  const codeError = codeCheck && !codeCheck.ok ? codeCheck.message : null;
  const ready =
    !!title.trim() && (kind === "file" ? !!file : !!link?.ok) && !codeError && avail !== "taken";

  /**
   * **الملفُّ يُفحَص ساعةَ يُختار** (قانونُ المرفقات ق١٤): الرفضُ إشعارٌ يسمّي الملفّ، والمختارُ
   * قبله يبقى. والقبولُ يُقال بصدق: أُرفق الآن ويُرفع مع «ابدأ».
   */
  const acceptFile = (f: File | undefined) => {
    if (!f) return;
    const why = checkQrFile(f);
    if (why) { toast.error(`لم يُقبل «${f.name}» : ${why}`); return; }
    setFile(f);
    setError(null);
    toast.success(`أُرفق «${f.name}»، ويُرفع حين تبدأ التصميم`);
  };

  // ملفٌّ يُسحَب لا نصٌّ ولا رابط (سابقةُ نموذج الترشّح)
  const draggingFile = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");
  const dropZone = {
    onDragEnter: (e: React.DragEvent) => {
      if (!draggingFile(e) || busy) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!draggingFile(e) || busy) return;
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
      if (!busy) acceptFile(e.dataTransfer.files?.[0]);
    },
  };

  /**
   * **الفحصُ يسأل بعد سكون** (٢٠٢٦-٠٩-٠٥): كلُّ حرفٍ نداءٌ لو سُئل مع كلّ ضغطة، فتُنتظَر
   * أربعُ مئةِ ميلّي ثانيةٍ من الهدوء. والجوابُ يُلغى إن تبدّل الرمزُ قبل وصوله، فلا يقول
   * «متاح» عن رمزٍ لم يعد مكتوبًا (سباقُ الأجوبة).
   */
  useEffect(() => {
    if (!codeOpen || !wanted || codeError) { setAvail("idle"); return; }
    let alive = true;
    setAvail("asking");
    const t = setTimeout(async () => {
      const res = await isQrCodeTaken(wanted);
      if (!alive) return;
      setAvail(res.ok ? (res.taken ? "taken" : "free") : "idle");
    }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [wanted, codeError, codeOpen]);

  const start = async () => {
    if (kind === "link" ? !link?.ok : !file) return;
    setBusy(true);
    setError(null);

    // الصورةُ تُرفع الآن لا ساعةَ اختيارها، والخادمُ يمحوها إن رُدّ الإنشاء
    let filePath: string | undefined;
    if (kind === "file" && file) {
      const up = await uploadQrFile(file);
      if (!up.ok) { setBusy(false); setError(up.message); return; }
      filePath = up.path;
    }

    // الوصفةُ الأولى هيئةُ الهويّة، ونصُّها يكتبه الخادمُ رابطًا قصيرًا بعد توليد الرمز
    const res = await createQrLink({
      title,
      kind,
      target: kind === "link" && link?.ok ? link.url : undefined,
      filePath,
      spec: defaultQrSpec(qrShortUrl("")),
      code: codeCheck?.ok ? codeCheck.code : undefined,
      campaignId,
    });
    if (res.ok && res.id) {
      router.push(`/dashboard/tools/qr/${res.id}/design`);
      return;
    }
    setBusy(false);
    setError(res.message);
  };

  return (
    <>
      {/**
        * **الحاويةُ تُقال في العنوان لا في شارةٍ بجانبه** (أمرُ المالك ٢٠٢٦-٠٩-٢٤): كانت
        * شارةً زرقاءَ تحمل «في حملة كذا» فصارت الجملةُ واحدةً يقرؤها السطرُ الأوّل. وشارةُ
        * الحال تقول **حالًا** (منشورٌ · موقوف)، والحاويةُ ليست حالًا بل تتمّةُ العنوان.
        *
        * **والفتاتُ يبقى قصيرًا** («باركود جديد»): المسارُ يُقرأ سريعًا ولا يحمل جملة،
        * ووجهةُ الرجوع تبقى غرفةَ الحملة فلا يضيع الطريقُ إليها.
        */}
      <PageHeader
        title={campaignName ? `باركود جديد في حملة «${campaignName}»` : "باركود جديد"}
        crumbLeaf="باركود جديد"
        {...(campaignId && campaignName
          ? { parent: { label: campaignName, href: `/dashboard/tools/qr/campaigns/${campaignId}` } }
          : {})}
      />

      <div className="card-grid mt-4">
        <SectionCard headerVariant="soft" icon={<QrCode />} title="اسمُ الباركود ووجهتُه">
          <Field
            label="اسم الباركود"
            icon={<TextAa />}
            innerIcon={<QrCode />}
            placeholder="اكتب اسم الباركود"
            value={title}
            onChange={(e) => { setTitle(e.target.value.slice(0, QR_TITLE_MAX)); setError(null); }}
            helper="تكتبه لك أنت لتعرفه بين باركوداتك، ولا يظهر لمن يمسحه."
            required
          />

          <div className="mt-4">
            <KindPicker value={kind} onChange={(v) => { setKind(v); setError(null); }} />
          </div>

          {kind === "link" ? (
            <div className="mt-4">
              <Field
                label="وجهة الباركود"
                icon={<LinkSimple />}
                innerIcon={<Globe />}
                placeholder="https://adeeb.club"
                dir="ltr"
                value={target}
                onChange={(e) => { setTarget(e.target.value); setError(null); }}
                error={linkError ?? undefined}
                helper="انسخ الرابط وألصقه هنا كاملًا."
                required
              />
            </div>
          ) : (
            <div className="mt-4" {...dropZone}>
              <FileButton
                block
                state={busy && file ? "uploading" : file ? "ready" : "attach"}
                dragging={dragging}
                icon={file ? (isPdf(file) ? <FilePdf /> : <ImageSquare />) : <FileIcon />}
                label={dragging ? "أفلِت الملفَّ هنا" : file ? file.name : "اختر صورةً أو ملفّ PDF"}
                hint={
                  dragging ? HINT
                    : busy && file ? "يُرفع ملفُّك الآن"
                    : file ? fileMeta(file.type, file.size)
                    : `اضغط أو اسحب الملف إلى هنا : ${HINT}`
                }
                onClick={() => fileRef.current?.click()}
                onRemove={file && !busy ? () => setFile(null) : undefined}
                removeLabel="إزالة الملف"
              />
              <input
                ref={fileRef}
                type="file"
                accept={PICK_RULE.accept}
                hidden
                onChange={(e) => { acceptFile(e.target.files?.[0]); e.target.value = ""; }}
              />
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- معاينةُ ملفٍّ محلّيّ (blob:) لا أصلٌ ثابت
                <img className="qimg-thumb mt-3" src={imageUrl} alt="الصورة التي يراها من يمسح الباركود" />
              ) : null}
            </div>
          )}

          {/**
            * **الرمزُ المختارُ خلف مبدّل** (المالك ٢٠٢٦-٠٩-٠٥): حالتُه نادرةٌ (ما يُقال
            * بالصوت، وما يُلصَق نصًّا، والرابطُ المكتوبُ تحت الملصق)، وحقلٌ ثالثٌ دائمٌ لأجلها
            * يزحم شاشةَ الإنشاء. وجُرّب زرًّا مفرَّغًا يُنقر فرآه المالك غيرَ جميل: زرٌّ وحيدٌ
            * عريضٌ في نموذجٍ حقولُه صفوفٌ نشاز. والمبدّلُ **من جنس النموذج**: صفٌّ له تسميةٌ
            * وشرحٌ كسائر صفوفه، وحالُه ظاهرةٌ بلا نقرة.
            */}
          <div className="mt-4">
            <Switch
              row
              label="رمز مخصّص للرابط"
              description="عنوانٌ مُخصص بدل حروفٍ عشوائيّة."
              checked={codeOpen}
              onChange={(e) => { setCodeOpen(e.target.checked); if (!e.target.checked) setCode(""); }}
            />
          </div>

          {codeOpen ? (
            <div className="mt-3">
              <Field
                label="رمز الرابط"
                icon={<LinkSimple />}
                innerIcon={<Globe />}
                placeholder="adeeb"
                dir="ltr"
                charset="latin"
                optional
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(null); }}
                error={codeError ?? (avail === "taken" ? "هذا الرمزُ مأخوذٌ لباركودٍ آخر. اختر غيرَه." : undefined)}
                success={avail === "free"}
                helper="اتركه فارغًا فتوضع حروفٌ عشوائيّة. ولا يُبدَّل بعد الإنشاء."
              />
              {/* **العنوانُ يتبدّل تحت إصبعه**: من يكتب رمزًا لا يقرأ قاعدةً، يرى رابطَه يُبنى
                  حرفًا حرفًا فيفهم ما الذي يغيّره. ولوحُه متوسّطٌ على سطحٍ خافتٍ بحدٍّ من
                  مفردات الكروت، فيُقرأ لوحةَ عرضٍ لا هامشَ تلميح. وحالُ الفحص شارةٌ بجانبه:
                  «متاح» أو «مأخوذ»، فالخبرُ حيث ينظر لا في زاويةٍ أخرى. */}
              <div className={`qcplate mt-3${avail === "free" ? " is-free" : avail === "taken" ? " is-taken" : ""}`}>
                {/* الإطارُ عنصرٌ لا خاصّيّة: الحدُّ المقطَّع لا يدور مع الزاوية، والـ`svg` يدور. */}
                <svg className="qcplate-frame" aria-hidden><rect /></svg>
                <span className="fld-help">عنوانُ الباركود يظهر</span>
                <bdi className="qcplate-url" dir="ltr">
                  {`${SITE_ORIGIN.replace(/^https?:\/\//, "")}/q/${codeCheck?.ok ? codeCheck.code : wanted || sample}`}
                </bdi>
                {avail === "free" ? <Badge tone="success" size="sm">الرمزُ متاح</Badge> : null}
                {avail === "taken" ? <Badge tone="danger" size="sm">الرمزُ مأخوذ</Badge> : null}
                {avail === "asking" ? <span className="fld-help">يُفحَص…</span> : null}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4">
              <Alert tone="danger" title="تعذّر إنشاء الباركود">{error}</Alert>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" size="md" disabled={!ready} loading={busy} onClick={() => void start()}>
              ابدأ بتصميم الباركود <ArrowLeft size={18} />
            </Button>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
