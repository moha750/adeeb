"use client";

/**
 * **«باركود جديد»** على قالب «النموذج» (٢٠٢٦-١١-١٣) — السلوكُ سلوكُ `dashboard/tools/qr/new/NewQrView.tsx` حرفًا: الخطوةُ الأولى اسمٌ
 * ووجهة (قرارُ المالك ٢٠٢٦-٠٨-٢٢: البياناتُ ثمّ الشكل)، والوجهةُ رابطٌ أو ملفّ (صورةٌ أو PDF يُفحص ساعةَ يُختار ولا يُرفع إلّا عند «ابدأ»)،
 * والرمزُ المخصّصُ خلف مبدّل ويُفحص بعد سكون، و«ابدأ» يُنشئ الصفَّ ويذهب إلى المصمّم. ومن غرفة حملةٍ (`?campaign=`) يُولد فيها.
 *
 * والشكلُ: ثلاثةُ أقسام في عمود النموذج (الباركود، والوجهة، ورمزُ الرابط)، والفعلُ في جانبه. والنوعُ مبدّلُ رأس قسم الوجهة، والملفُّ حقلُ الرفع المعتمد، ولوحُ
 * العنوان بإطاره المقطّع (`qcplate`) باقٍ.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Field, overBy } from "@adeeb/design-system";
import { File as FileIcon, FilePdf, Globe, ImageSquare, LinkSimple, Play, QrCode, Scan, TextAa } from "@phosphor-icons/react";
import { ArrowLeft } from "@/app/_components/glyphs";
import { QR_TITLE_MAX, SITE_ORIGIN, checkCode, checkTarget, newQrCode, qrShortUrl, targetHost, type QrKind } from "@/lib/qrLinks";
import { UPLOAD_RULES, attachHint, fileMeta } from "@/lib/upload";
import { checkQrFile, isPdf } from "@/lib/qrFile";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { createQrLink, isQrCodeTaken } from "@/app/dashboard/tools/qr/actions";
import { defaultQrSpec } from "@/app/dashboard/tools/qr/defaults";
import { uploadQrFile } from "@/app/dashboard/tools/qr/uploadFile";
import { AdBadge, AdCard, AdNote, type AdMeta } from "../primitives";
import { dayParts } from "../format";
import { AdUpload } from "../upload";
import { FormChoice, FormRoom, FormSection, FormToggle } from "../form";

/** ما يُختار وما يُقال قبل الاختيار: الصيغُ الأربعُ وحدُّ الدلو (الـPDF لا يُصغَّر فحدُّه الأضيق). */
const PICK_RULE = UPLOAD_RULES.qrFile;
const HINT = attachHint(UPLOAD_RULES.qrFileStored);
/** «ملف» لا «صورة» و«PDF» (م٢٤): الملفُّ صورةٌ أو PDF ونوعُه من امتداده */
const KINDS: { value: QrKind; label: string }[] = [{ value: "link", label: "رابط" }, { value: "file", label: "ملف" }];

export function NewQrRoom({ campaignId = null, campaignName = null }: { campaignId?: string | null; campaignName?: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<QrKind>("link");
  const [target, setTarget] = useState("");
  /** الملفُّ المختار، ولم يُرفع بعد. */
  const [file, setFile] = useState<File | null>(null);
  // المعاينةُ للصورة وحدها: الـPDF يُعرَف باسمه وحجمه في زرّ المرفق
  const imageUrl = useMemo(() => (file && !isPdf(file) ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);
  const [code, setCode] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);
  /** المثالُ رمزٌ حقيقيٌّ يُقرَع مرّةً واحدة عند فتح الشاشة ويثبت، فلا يرقص السطرُ تحت الإصبع. */
  const [sample] = useState(() => newQrCode());
  /** جوابُ الفحص مقرونًا بالرمز الذي سُئل عنه؛ والحالةُ المعروضة تُشتقّ منه تحت. */
  const [checked, setChecked] = useState<{ code: string; state: "idle" | "free" | "taken" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = target.trim();
  // الحَكَمُ نفسُه الذي يحرس الخادم، فلا رسالتان لعيبٍ واحد
  const link = trimmed ? checkTarget(trimmed) : null;
  const linkError = link && !link.ok ? link.message : null;
  const wanted = code.trim();
  const codeCheck = wanted ? checkCode(wanted) : null;
  const codeError = codeCheck && !codeCheck.ok ? codeCheck.message : null;
  const avail: "idle" | "asking" | "free" | "taken" =
    !codeOpen || !wanted || codeError ? "idle" : checked?.code === wanted ? checked.state : "asking";
  const ready =
    !!title.trim() && !overBy(title, QR_TITLE_MAX) && (kind === "file" ? !!file : !!link?.ok) && !codeError && avail !== "taken";

  /** الملفُّ يُفحَص ساعةَ يُختار (قانونُ المرفقات ق١٤): الرفضُ إشعارٌ يسمّي الملفّ، والمختارُ قبله يبقى. */
  const acceptFile = (f: File | undefined) => {
    if (!f) return;
    const why = checkQrFile(f);
    if (why) { toast.error(`لم يُقبل «${f.name}» : ${why}`); return; }
    setFile(f);
    setError(null);
    toast.success(`أُرفق «${f.name}»، ويُرفع حين تبدأ التصميم`);
  };

  /** الفحصُ يسأل بعد أربعمئة ميلّي ثانيةٍ من الهدوء، والجوابُ يُلغى إن تبدّل الرمزُ قبل وصوله (سباقُ الأجوبة). */
  useEffect(() => {
    if (!codeOpen || !wanted || codeError) return;
    let alive = true;
    const t = setTimeout(async () => {
      const res = await isQrCodeTaken(wanted);
      if (!alive) return;
      setChecked({ code: wanted, state: res.ok ? (res.taken ? "taken" : "free") : "idle" });
    }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [wanted, codeError, codeOpen]);

  const start = async () => {
    if (!ready || busy) return;
    if (kind === "link" ? !link?.ok : !file) return;
    setBusy(true);
    setError(null);
    // الملفُّ يُرفع الآن لا ساعةَ اختياره، والخادمُ يمحوه إن رُدّ الإنشاء
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
      // الشكلُ خطوتُه الأخيرة، ثمّ بيتُه (محمد ٢٠٢٦-١١-١٧)
      router.push(`/dashboard/tools/qr/${res.id}/design?new=1`);
      return;
    }
    setBusy(false);
    setError(res.message);
  };

  const dirty = !!title.trim() || !!trimmed || !!file || !!wanted;
  // **التذكرةُ كما ستظهر في «رموزي»** (`QrLinksRoom`): الكعبُ يومُ الإنشاء، و«يعمل»، والاسمُ، والوجهةُ سطرَها، والمسحاتُ صفرٌ — فالعمودُ الجانبيُّ
  // يحمل ما يُرى لا زرّين وتحتهما فراغ (محمد ٢٠٢٦-١١-١٤)
  const [born] = useState(() => new Date().toISOString());
  const d = dayParts(born);
  const where: AdMeta = kind === "file"
    ? (file ? { icon: isPdf(file) ? <FilePdf /> : <ImageSquare />, text: file.name } : { icon: <FileIcon />, text: "الملف لم يُختر", tone: "muted" })
    : (link?.ok ? { icon: <LinkSimple />, text: targetHost(link.url), ltr: true } : { icon: <LinkSimple />, text: "الوجهة لم تُكتب", tone: "muted" });
  const preview = (
    <div className="ad-form-preview-card" data-untitled={title.trim() ? undefined : ""}>
      <AdCard seed="qr-new" stub={{ big: d.day, small: d.month }} chips={<AdBadge tone="ok" icon={<Play />}>يعمل</AdBadge>}
        title={title.trim() || "اسم الباركود"} meta={[where]} figures={[{ icon: <Scan />, value: "0", label: "المسحات" }]} />
    </div>
  );
  // الحاويةُ تُقال في العنوان لا في شارةٍ بجانبه (أمرُ المالك ٢٠٢٦-٠٩-٢٤)، و«إلغاء» يرجع إلى غرفتها
  const back = campaignId ? `/dashboard/tools/qr/campaigns/${campaignId}` : "/dashboard/tools/qr";

  return (
    <FormRoom
      title={campaignName ? `باركود جديد في حملة «${campaignName}»` : "باركود جديد"}
      preview={preview}
      commit={{
        primary: { label: "ابدأ بتصميم الباركود", icon: <ArrowLeft />, onClick: () => void start(), busy, held: !ready },
        cancelHref: back,
        dirty,
      }}
    >
      {error ? <AdNote tone="bad" title="تعذّر إنشاء الباركود">{error}</AdNote> : null}
      <FormSection icon={<QrCode />} title="الباركود" mark="required">
        <div className="form-grid">
          <Field className="form-full" label="اسم الباركود" icon={<TextAa />} innerIcon={<QrCode />} placeholder="اكتب اسم الباركود"
            value={title} onChange={(e) => { setTitle(e.target.value); setError(null); }}
            helper="تكتبه لك أنت لتعرفه بين باركوداتك، ولا يظهر لمن يمسحه." count={{ max: QR_TITLE_MAX }} required />
        </div>
      </FormSection>

      {/* **نوعُ الوجهة مبدّلُ رأس القسم** («رابط / ملف»)، المبدّلُ المعتمدُ لاختيارٍ يغيّر ما تحته من حقول («بفترات / مرنة» في الفرصة):
          كانت بطاقتي راديو من الهويّة القديمة (`KindPicker`)، تأخذان سطرًا كاملًا في جسم القسم */}
      <FormSection icon={<Globe />} title="الوجهة" mark="required" sub="ما يفتحه الباركود لمن يمسحه"
        act={<FormChoice label="نوع الوجهة" items={KINDS} value={kind} onChange={(v) => { setKind(v as QrKind); setError(null); }} />}>
        <div className="form-grid">
          {kind === "link" ? (
            <Field className="form-full" label="وجهة الباركود" icon={<LinkSimple />} innerIcon={<Globe />} placeholder="https://adeeb.club" dir="ltr"
              value={target} onChange={(e) => { setTarget(e.target.value); setError(null); }}
              error={linkError ?? undefined} helper="انسخ الرابط وألصقه هنا كاملًا." required />
          ) : (
            // **حقلُ الرفع المعتمد** (`AdUpload`، اعتمده محمد ٢٠٢٦-١١-١٣) بحالاته كلّها: الإفلاتُ والسحبُ والرفع، والصورةُ تُعايَن والـPDF
            // يُقال باسمه وحجمه — كان زرَّ مرفقٍ من الهويّة القديمة (`FileButton`) بجانبه صورةٌ مصغّرة
            <AdUpload label="الملف" noun="file" whole icon={<FileIcon />} required accept={PICK_RULE.accept} alt="الصورة التي يراها من يمسح الباركود"
              value={imageUrl} busy={busy && !!file} help={HINT} onFile={acceptFile} onClear={busy ? undefined : () => setFile(null)}
              file={file ? { name: file.name, meta: fileMeta(file.type, file.size), icon: isPdf(file) ? <FilePdf /> : <ImageSquare /> } : null} />
          )}
        </div>
      </FormSection>

      {/* **الرمزُ المختارُ خلف مبدّل** (المالك ٢٠٢٦-٠٩-٠٥): حالتُه نادرة، وحقلٌ ثالثٌ دائمٌ لأجلها يزحم شاشةَ الإنشاء */}
      <FormSection icon={<LinkSimple />} title="رمز الرابط" mark="optional">
        <div className="form-grid">
          <FormToggle className="form-full" icon={<LinkSimple />} label="رمز مخصّص للرابط" description="عنوانٌ مُخصص بدل حروفٍ عشوائيّة."
            checked={codeOpen} onChange={(on) => { setCodeOpen(on); if (!on) setCode(""); }} />
          {codeOpen ? (
            <>
              <Field className="form-full" label="رمز الرابط" icon={<LinkSimple />} innerIcon={<Globe />} placeholder="adeeb" dir="ltr" charset="latin" spellCheck={false} optional
                value={code} onChange={(e) => { setCode(e.target.value); setError(null); }}
                error={codeError ?? (avail === "taken" ? "هذا الرمزُ مأخوذٌ لباركودٍ آخر. اختر غيرَه." : undefined)}
                success={avail === "free"} helper="اتركه فارغًا فتوضع حروفٌ عشوائيّة. ولا يُبدَّل بعد الإنشاء." />
              {/* العنوانُ يتبدّل تحت إصبعه، وحالُ الفحص شارةٌ بجانبه */}
              <div className={`qcplate form-full${avail === "free" ? " is-free" : avail === "taken" ? " is-taken" : ""}`}>
                {/* الإطارُ عنصرٌ لا خاصّيّة: الحدُّ المقطَّع لا يدور مع الزاوية، والـ`svg` يدور. */}
                <svg className="qcplate-frame" aria-hidden><rect /></svg>
                <span className="fld-help">عنوانُ الباركود يظهر</span>
                <bdi className="qcplate-url" dir="ltr">{`${SITE_ORIGIN.replace(/^https?:\/\//, "")}/q/${codeCheck?.ok ? codeCheck.code : wanted || sample}`}</bdi>
                {avail === "free" ? <Badge tone="success" size="sm">الرمزُ متاح</Badge> : null}
                {avail === "taken" ? <Badge tone="danger" size="sm">الرمزُ مأخوذ</Badge> : null}
                {avail === "asking" ? <span className="fld-help">يُفحَص…</span> : null}
              </div>
            </>
          ) : null}
        </div>
      </FormSection>
    </FormRoom>
  );
}
