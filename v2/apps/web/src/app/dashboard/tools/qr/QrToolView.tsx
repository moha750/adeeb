"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Button, SectionCard, ColorField, Field, Segmented, Select, Switch, } from "@adeeb/design-system";
import {
  Drop, FileSvg, FloppyDisk, Globe, ImageSquare, PaintBucket, QrCode, Sparkle, Square, TextAa,
} from "@phosphor-icons/react";
import { DownloadSimple } from "@/app/_components/glyphs";
import { Eye, Trash, UploadSimple } from "@/app/_components/glyphs";
import {
  contrast,
  inkColors,
  qrPng,
  qrSvg,
  qrSvgBlob,
  type Paint,
  type QrSpec,
} from "@/lib/qr";
import { qrShortUrl } from "@/lib/qrLinks";
import { downloadBlob } from "@/lib/download";
import { UPLOAD_RULES, checkFile } from "@/lib/upload";
import { EXPORT, LOOK, SHAPE } from "./defaults";
import { EmptyState } from "../../_components/EmptyState";
import { PageHeader } from "../../_components/PageHeader";

// وصفةُ شعار الرمز من قانون المرفقات (`lib/upload`)
const LOGO_RULE = UPLOAD_RULES.qrLogo;

/* ── مفردات المحرّر ─────────────────────────────────────────────────────── */

const LOGO_SIZES = [
  { value: "0.18", label: "صغير", hint: "الأأمن مسحًا" },
  { value: "0.24", label: "متوسّط", hint: "الاتّزان المعتاد" },
  { value: "0.3", label: "كبير", hint: "الحدّ الأقصى المسموح" },
];

/** ضلع المعاينة على الشاشة — ثابتٌ لا يتبع مقاس التنزيل: الاثنان سؤالان مختلفان. */
const PREVIEW = 360;

/** أقصى حجمٍ لملفّ الشعار — يُضمَّن في الرمز نفسه، فالكبيرُ يُثقل كلّ نسخةٍ منه. */

/** عتبتا التباين: دون الأولى تحذير، ودون الثانية إنذارٌ صريح (لا يُمسح غالبًا). */
const CONTRAST_WARN = 4;
const CONTRAST_FAIL = 3;

/**
 * مراسي الورقة: محرّرٌ كامل، فنصفان، فرمزٌ كامل. نسبةٌ من ارتفاع الشاشة لا بكسلٌ محفور.
 * والمرسى الأخير 0.74 لا 0.86: رأسُ الورقة (المقبضُ وزرّا التنزيل) نحوُ ٩٠ بكسلًا، وجزيرةُ
 * التنقّل تحجز ٨٢ من القاع — فما دونها يدفن الزرَّين تحت الجزيرة.
 */
const SHEET_STOPS = [0.18, 0.46, 0.74];

/* ── المحرّر ────────────────────────────────────────────────────────────── */

/**
 * **محرّر رموز أديب** — نصٌّ يدخل، وصورةٌ تخرج مصمَّمةً بهويّة النادي.
 *
 * **والمعاينة هي المُخرَج نفسه**: تُرسَم بـ`qrSvg` الذي ينزّله الزرّ حرفًا بحرف — ومُدرَجةً
 * في الصفحة لا صورةً خارجيّة، فترث خطّ الموقع ويظهر نداء «امسحني» بخطّه الحقيقيّ.
 *
 * **ولا حالةَ في الخادم ولا سجلّ**: الأداة لا تعرف ما ولّدته، والشعارُ المرفوع لا يغادر
 * المتصفّح — يُقرأ data URL ويُضمَّن في الملفّ الخارج.
 */
/**
 * ما يفعله زرُّ الحفظ حين يكون المحرّرُ في غرفته: يحفظ **الوصفة** لا أكثر.
 *
 * الاسمُ والوجهةُ سبقا في بابِ الإنشاء، والرمزُ القصيرُ وُلِد هناك. فلا يبقى لهذه الشاشة
 * إلّا الشكل. و**دالّةٌ تُمرَّر لا فعلٌ يُستورَد**، لأنّ المحرّرَ يُعرَض أيضًا في `/ui/qr-dock`
 * بلا غرفةٍ ولا مزوّدِ توست: لو نادى `useToast` هنا لسقطت تلك الصفحة.
 */
export type QrSpecSaver = (spec: QrSpec) => Promise<{ ok: boolean; message: string }>;

export function QrToolView({ code, initial, embedded = false, onSaveSpec }: {
  /** الرمزُ القصير كما وُلِد في باب الإنشاء — هو ما يُحفَر، فالمعاينةُ رمزٌ حيٌّ يُمسح. */
  code: string;
  /** الوصفةُ المحفوظة إن كانت — يعود المحرّرُ إلى حالِه يومَ صُنع الرمز. */
  initial?: QrSpec | null;
  embedded?: boolean;
  onSaveSpec?: QrSpecSaver;
}) {
  const seed = look(initial);

  const [saving, setSaving] = useState(false);

  // الحبر
  const [gradient, setGradient] = useState(seed.gradient);
  const [ink, setInk] = useState(seed.ink);
  const [ink2, setInk2] = useState(seed.ink2);
  const [gradKind, setGradKind] = useState<"linear" | "radial">(seed.gradKind);
  const [angle, setAngle] = useState(seed.angle);

  // الخلفيّة
  const [bare, setBare] = useState(seed.bare);
  const [bg, setBg] = useState(seed.bg);

  // الأشكال
  const [eyeTinted, setEyeTinted] = useState(seed.eyeTinted);
  const [eyeColor, setEyeColor] = useState(seed.eyeColor);
  const [pupilColor, setPupilColor] = useState(seed.pupilColor);

  // الشعار
  const [logo, setLogo] = useState<string | null>(seed.logo);
  const [logoOk, setLogoOk] = useState<string | null>(null);
  const [logoScale, setLogoScale] = useState(seed.logoScale);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  // الإطار
  const [framed, setFramed] = useState(seed.framed);
  const [caption, setCaption] = useState(seed.caption);
  const [frameColor, setFrameColor] = useState(seed.frameColor);
  const [captionColor, setCaptionColor] = useState(seed.captionColor);

  /**
   * **ما يُحفَر: رابطُ الرمز القصير، دائمًا.**
   *
   * الاسمُ والوجهةُ سبقا في باب الإنشاء، فالرمزُ موجودٌ في القاعدة قبل أن يُصمَّم. وثمرةُ
   * ذلك ثلاثٌ: المعاينةُ **تُمسح فتعمل** من أوّل نظرة، وعددُ وحداتها هو عددُ وحدات المطبوع
   * لا يزيد، والوجهةُ تُبدَّل بعد الطباعة والملصقُ لا يتغيّر.
   */
  const payload = qrShortUrl(code);

  const paint = useMemo(
    (): Paint =>
      !gradient
        ? { kind: "solid", color: ink }
        : gradKind === "radial"
          ? { kind: "radial", from: ink, to: ink2 }
          : { kind: "linear", from: ink, to: ink2, angle: Number(angle) },
    [gradient, gradKind, ink, ink2, angle],
  );

  /** المواصفة — مصدرٌ واحد تقرؤه المعاينة والتنزيلان والمحفوظ، فلا يفترق المعروض عن المنزَّل. */
  const spec = useMemo(
    (): QrSpec => ({
      text: payload,
      size: EXPORT,
      dots: { shape: SHAPE.dots, paint },
      eye: { shape: SHAPE.eye, color: eyeTinted ? eyeColor : null },
      pupil: { shape: SHAPE.pupil, color: eyeTinted ? pupilColor : null },
      bg: bare ? null : bg,
      logo: logo ? { href: logo, scale: Number(logoScale) } : null,
      frame: framed ? { color: frameColor, caption, textColor: captionColor } : null,
    }),
    [payload, paint, eyeTinted, eyeColor, pupilColor, bare, bg, logo, logoScale, framed, frameColor, caption, captionColor],
  );

  // الطول عيبُ مُدخَلٍ لا عطبُ نظام: `qrMatrix` ترمي برسالةٍ عربيّة تُعرَض كما هي.
  const preview = useMemo(() => {
    try {
      return { svg: qrSvg({ ...spec, size: PREVIEW }), error: null as string | null };
    } catch (e) {
      return { svg: null as string | null, error: e instanceof Error ? e.message : "تعذّر توليد الباركود." };
    }
  }, [spec]);

  /**
   * **حارس التباين** — يقيس أضعف حبرٍ في الرمز مقابل أرضيّته. والخلفيّة الشفّافة لا تُقاس:
   * أرضيّتُها تصميمُ من يستعمله، فتُقال الحقيقة ولا يُختلق رقم.
   */
  const guard = useMemo(() => {
    if (bare) return { tone: "info" as const, text: "الخلفيّة شفّافة، التباين رهنُ السطح الذي تضعه عليه، فتحقّق منه بعينك." };
    const worst = Math.min(...inkColors(spec).map((c) => contrast(c, bg)));
    const n = worst.toFixed(1);
    if (worst < CONTRAST_FAIL) return { tone: "danger" as const, text: `التباين ${n}:١، هذا الباركود لن يُمسح. أعتِم اللون أو فتِّح الخلفيّة.` };
    if (worst < CONTRAST_WARN) return { tone: "warning" as const, text: `التباين ${n}:١، يُمسح على الشاشة وقد يُخفق مطبوعًا أو في ضوءٍ ضعيف.` };
    return { tone: "success" as const, text: `التباين ${n}:١، وافٍ للطباعة والمسح من بُعد.` };
  }, [bare, bg, spec]);

  const onPickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // البوّابةُ من قانون المرفقات (`lib/upload`)، والسببُ يُعرض تنبيهًا لا توستًا: الشاشةُ مختبرٌ
    // يبقى المستعملُ فيه طويلًا، فالرسالةُ تُقيم بجانب الحقل لا تمرّ.
    const why = checkFile(file, LOGO_RULE);
    if (why) { setLogoOk(null); setLogoError(`${why}. الشعارُ يُضمَّن في كلّ نسخةٍ من الرمز، فاختر ملفًّا أخفّ`); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(typeof reader.result === "string" ? reader.result : null);
      setLogoError(null);
      // خبرُ القبول يُقال كما يُقال خبرُ الرفض، وفي موضعه نفسِه
      setLogoOk(`أُدرج «${file.name}» في قلب الرمز`);
    };
    reader.onerror = () => { setLogoOk(null); setLogoError("تعذّرت قراءة الملفّ."); };
    reader.readAsDataURL(file);
  };

  /** شعار أديب من أصول العلامة — يُجلَب ويُضمَّن data URL كالمرفوع، فالملفّ الخارج قائمٌ بذاته. */
  const pickBrandLogo = async () => {
    try {
      const res = await fetch("/brand/logo-vertical.svg");
      if (!res.ok) throw new Error();
      const svg = await res.text();
      setLogo(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      setLogoError(null);
    } catch {
      setLogoError("تعذّر جلب شعار أديب من أصول العلامة.");
    }
  };

  const savePng = async () => {
    downloadBlob(await qrPng(spec), "باركود-أديب.png", "qr.png");
  };
  const saveSvg = () => {
    downloadBlob(qrSvgBlob(spec), "باركود-أديب.svg", "qr.svg");
  };

  /**
   * حفظُ الوصفة: الشكلُ يُخزَّن في صفّ الرمز، فيُعاد رسمُه بعد سنةٍ كما رُسم اليوم.
   * وخبرُ النجاح والفشل تقوله **الغرفةُ** بتوستها، فلا ينبت في المحرّر لسانٌ ثانٍ.
   */
  const saveDesign = async () => {
    if (!onSaveSpec) return;
    setSaving(true);
    await onSaveSpec(spec);
    setSaving(false);
  };

  const rootRef = useCanvasTop();

  /** صفُّ الأفعال: تعريفٌ واحدٌ يقرؤه الموضعان (كرتُ المعاينة في الواسع، ورأسُ الورقة في الجوّال). */
  const downloads = (
    <>
      {onSaveSpec ? (
        <Button variant="primary" size="md" loading={saving} onClick={() => void saveDesign()}>
          <FloppyDisk /> حفظ التصميم
        </Button>
      ) : null}
      <Button variant="neutral" size="md" disabled={!preview.svg} onClick={() => void savePng()}>
        <DownloadSimple /> تحميلها كصورة
      </Button>
      <Button variant="neutral" size="md" disabled={!preview.svg} onClick={saveSvg}>
        {/* الحروفُ اللاتينيّة بخطّها: `font-latin` يقدّم Eras، و`dir="ltr"` يمنع الخوارزميّةَ
            ثنائيّةَ الاتّجاه من قلب الاسم في سياقٍ عربيّ. */}
        <FileSvg /> تحميل بصيغة <span className="font-latin" dir="ltr">SVG</span>
      </Button>
    </>
  );

  return (
    /* غلافُ الشاشة: حاملُ رمزَي القسمة (`--qsheet-top` و`--qcanvas-top`) ومرجعُ قياسها. */
    <div className="qtool" ref={rootRef}>
      {embedded ? null : <PageHeader title="مولّد الباركود" />}


      <div className="card-grid mt-4">
        {/* ── الضوابط: في هيئة الورقة تصير ورقةً تُسحَب، وفي غيرها غلافان بلا أثر ── */}
        <div className="qsheet">
          {/* رأسُ الورقة: المقبضُ وزرّا التنزيل. وموضعُهما هنا لا على اللوحة عمدًا — اللوحةُ
              تنكمش بسحب الورقة حتى لا تسع زرًّا، والفعلُ الأوّل لا يُقايض بمرسًى. ولا شرطَ في
              الكود: `.qsheet-head` لا تُرسم إلّا دون ٨٦٠، وفوقها الكرتُ يحمل الزرَّين. */}
          <div className="qsheet-head">
            <SheetGrip rootRef={rootRef} />
            <div className="qdock-acts">{downloads}</div>
          </div>
          <div className="qsheet-scroll">
        <div className="flex flex-col gap-4">
          {/* لا حقلَ للرابط ولا للاسم هنا: سبقا في باب الإنشاء (`new`)، وتُعدَّل الوجهةُ من
              صفحة الرمز. وهذه الشاشةُ للشكل وحده، فلا يُسأل صاحبُها سؤالًا أجابه. */}
          <SectionCard headerVariant="soft" icon={<Drop />} title="لون الباركود">
            {/* خياران متعادلان لا حالةٌ تُشعَل: الشريطُ المقطعيّ يسمّيهما بالاسم، والمبدّلُ كان
                يسمّي أحدَهما ويترك الآخرَ يُفهَم من إطفائه. */}
            <Segmented
              wide
              aria-label="نوع اللون"
              items={[{ value: "solid", label: "لون موحّد" }, { value: "gradient", label: "لون متدرّج" }]}
              value={gradient ? "gradient" : "solid"}
              onValueChange={(v) => setGradient(v === "gradient")}
            />
            <div className="mt-4 flex flex-col gap-4">
              <ColorField label={gradient ? "اللون الأوّل" : "اللون"} icon={<Drop />} value={ink} onValueChange={setInk} required />
              {gradient ? (
                <>
                  <ColorField label="اللون الثاني" icon={<Sparkle />} value={ink2} onValueChange={setInk2} required />
                  <Segmented
                    wide
                    aria-label="نوع التدرّج"
                    items={[{ value: "linear", label: "خطّيّ" }, { value: "radial", label: "شعاعيّ" }]}
                    value={gradKind}
                    onValueChange={(v) => setGradKind(v as "linear" | "radial")}
                  />
                  {gradKind === "linear" ? (
                    <Select
                      label="اتّجاه التدرّج"
                      icon={<Sparkle />}
                      options={[
                        { value: "0", label: "أفقيّ" },
                        { value: "90", label: "رأسيّ" },
                        { value: "135", label: "مائل" },
                        { value: "45", label: "مائل معكوس" },
                      ]}
                      value={angle}
                      onValueChange={setAngle}
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          </SectionCard>

          {/* الخلفيّةُ كرتٌ قائمٌ بذاته (أمرُ المالك ٢٠٢٦-٠٨-٢٢): قرارٌ مستقلٌّ عن اللون،
              وكرتٌ يجمعهما كان يخلط سؤالين. وحارسُ التباين يسكن هنا لا هناك: هو حكمٌ على
              **الاثنين معًا**، وموضعُه عند آخرِهما قرارًا. */}
          <SectionCard headerVariant="soft" icon={<PaintBucket />} title="الخلفيّة">
            <Switch
              row
              label="بلا خلفيّة"
              description="خلفيّةٌ شفّافة لوضعه على تصميمٍ فاتح، وعلى الداكن لا يُقرأ."
              checked={bare}
              onChange={(e) => setBare(e.target.checked)}
            />
            {!bare ? (
              <div className="mt-4">
                <ColorField label="لون الخلفيّة" icon={<PaintBucket />} value={bg} onValueChange={setBg} />
              </div>
            ) : null}

            <div className="mt-4">
              <Alert tone={guard.tone} title="التباين مقيسٌ لا مظنون">{guard.text}</Alert>
            </div>
          </SectionCard>

          <SectionCard headerVariant="soft" icon={<Eye />} title="العيون">
            <div className="flex flex-col gap-4">
              <Switch
                row
                label="لونٌ مستقلّ للعيون"
                description="العيون الثلاث بنيةٌ يبحث عنها القارئ أوّلًا، تُلوَّن ولا تُنقَص."
                checked={eyeTinted}
                onChange={(e) => setEyeTinted(e.target.checked)}
              />
              {eyeTinted ? (
                <>
                  <ColorField label="لون الطوق" icon={<Eye />} value={eyeColor} onValueChange={setEyeColor} />
                  <ColorField label="لون البؤبؤ" icon={<Eye />} value={pupilColor} onValueChange={setPupilColor} />
                </>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard headerVariant="soft" icon={<ImageSquare />} title="الشعار في القلب">
            <div className="flex flex-col gap-3 items-start">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- صورةٌ مضمَّنة (data URL) لا أصلٌ ثابت
                <img src={logo} alt="الشعار المختار" className="max-h-20 w-auto rounded" />
              ) : (
                <p className="txt">لا شعار: الباركود يخرج نظيفًا. وإن أضفته رُفع التصحيح إلى H وفُرِّغ ما تحته.</p>
              )}
              <div className="btn-row">
                <Button variant="ghost" size="md" onClick={() => logoInput.current?.click()}>
                  <UploadSimple size={18} /> {logo ? "تغيير الشعار" : "رفع شعار"}
                </Button>
                <Button variant="ghost" size="md" onClick={() => void pickBrandLogo()}>
                  <Sparkle size={18} /> شعار أديب
                </Button>
                {logo ? (
                  <Button variant="ghost-danger" size="md" onClick={() => { setLogo(null); setLogoOk(null); }}>
                    <Trash size={18} /> إزالة
                  </Button>
                ) : null}
              </div>
              <input ref={logoInput} type="file" accept={LOGO_RULE.accept} hidden onChange={onPickLogo} />
              {logoError ? <Alert tone="danger" title="تعذّر استعمال الشعار">{logoError}</Alert> : null}
              {logoOk && !logoError ? <Alert tone="success" title="أُدرج الشعار">{logoOk}</Alert> : null}
              {logo ? (
                <div className="w-full">
                  <Select label="حجم الشعار" icon={<ImageSquare />} options={LOGO_SIZES} value={logoScale} onValueChange={setLogoScale} />
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard headerVariant="soft" icon={<TextAa />} title="الإطار والنداء">
            <Switch
              row
              label="إطارٌ ونداء تحته"
              description="للطباعة: طوقٌ حول الباركود وشريطُ نصٍّ يدعو إلى مسحه."
              checked={framed}
              onChange={(e) => setFramed(e.target.checked)}
            />
            {framed ? (
              <div className="mt-4 flex flex-col gap-4">
                <Field
                  label="نصّ النداء"
                  icon={<TextAa />}
                  innerIcon={<Globe />}
                  placeholder="امسحني"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  helper="اتركه فارغًا فيبقى الطوق بلا شريط."
                  optional
                />
                <ColorField label="لون الإطار" icon={<Square />} value={frameColor} onValueChange={setFrameColor} />
                <ColorField label="لون النصّ" icon={<TextAa />} value={captionColor} onValueChange={setCaptionColor} />
              </div>
            ) : null}
          </SectionCard>
        </div>
          </div>
        </div>

        {/* ── المعاينة: في الواسع عمودٌ لاصقٌ بجوار الضوابط، وفي الجوّال لوحةٌ تحت الورقة ── */}
        <div className="qdock qcanvas">
          <SectionCard headerVariant="soft" icon={<QrCode />} title="المعاينة: ما تراه هو ما يُحمل">
            <div className="qdock-full">
              {preview.error ? (
                <Alert tone="warning" title="تعذّر توليد الباركود">{preview.error}</Alert>
              ) : preview.svg ? (
                <QrPreview svg={preview.svg} />
              ) : (
                // لا تقع إلّا في عطلٍ لا يُتوقَّع: الرمزُ محفورٌ منذ باب الإنشاء، فالمعاينةُ
                // لا تنتظر حرفًا من أحد.
                <EmptyState variant="aurora" icon={<QrCode />} title="لا باركود بعد" />
              )}
            </div>

            <div className="qdock-bar">
              <div className="qdock-acts">{downloads}</div>
            </div>
          </SectionCard>
        </div>
      </div>

    </div>
  );
}

/**
 * **بذرةُ المحرّر من وصفةٍ محفوظة** — عكسُ بناء المواصفة: ما حُفظ يعود حقولًا في الشاشة.
 * وما غاب يأخذ افتراضَ الهويّة من مصدره الواحد (`defaults`)، فلا رقمَ محفورٌ هنا.
 */
function look(spec?: QrSpec | null) {
  const paint = spec?.dots?.paint;
  const gradient = !!paint && paint.kind !== "solid";
  return {
    gradient,
    ink: paint ? (paint.kind === "solid" ? paint.color : paint.from) : LOOK.ink,
    ink2: paint && paint.kind !== "solid" ? paint.to : LOOK.ink2,
    gradKind: (paint?.kind === "radial" ? "radial" : "linear") as "linear" | "radial",
    angle: paint?.kind === "linear" ? String(paint.angle) : LOOK.angle,
    bare: spec ? spec.bg === null : LOOK.bare,
    bg: spec?.bg ?? LOOK.bg,
    eyeTinted: !!spec?.eye?.color,
    eyeColor: spec?.eye?.color ?? LOOK.eyeColor,
    pupilColor: spec?.pupil?.color ?? LOOK.pupilColor,
    logo: spec?.logo?.href ?? null,
    logoScale: spec?.logo ? String(spec.logo.scale) : LOOK.logoScale,
    framed: !!spec?.frame,
    caption: spec?.frame?.caption ?? LOOK.caption,
    frameColor: spec?.frame?.color ?? LOOK.frameColor,
    captionColor: spec?.frame?.textColor ?? LOOK.captionColor,
  };
}

/**
 * **مقبضُ الورقة** — يقود حافّتَها بالإصبع ثمّ يرسو على أقرب مرسًى.
 *
 * والرمزُ يُكتب على **غلاف الشاشة** لا على الورقة: اللوحةُ (`.qcanvas`) والورقةُ (`.qsheet`)
 * كلتاهما تقرأ `--qsheet-top`، فلا بدّ أن يكون في سلفٍ يجمعهما.
 *
 * و`setPointerCapture` يلاحق الإصبعَ ولو خرج من المقبض الصغير، و`data-drag` يقطع الانتقال
 * أثناء السحب فلا تتخلّف الحافّةُ عن الإصبع، ويعود عند الإفلات فيقع الرسوّ ناعمًا.
 */
function SheetGrip({ rootRef }: { rootRef: React.RefObject<HTMLDivElement | null> }) {
  /**
   * **مقاسُ اللوحة يُضبَط عند الرسوّ لا تحت الإصبع** (أمرُ المالك ٢٠٢٦-٠٨-٢١، المسلك «ب»):
   *
   * ١) **الخفضُ يكبّره تحت الإصبع**: كلّما انكشف من اللوحة شيءٌ ملأه الرمزُ في حينه، فالنموُّ
   *    يتبع اليدَ ولا ينتظر آخرَ الحركة (وبلا هذا كان يقفز عند الإفلات: «ليس سلسًا»).
   * ٢) **والرفعُ لا يصغّره**: الورقةُ تنزلق فوقه فتغطّيه وحسب.
   * ٣) **وعند الإفلات** يُضبَط المقاسُ على المرسى المستقَرّ، فيصغر إن كنتَ رفعتَ. وهذا
   *    التصغيرُ يقع تحت الورقة وهي راسيةٌ فوقه، فلا تكاد تراه.
   *
   * فالوضعُ الطبيعيّ يعود كما كان بعد كلّ رحلة، ولا قفزةَ في الطريق.
   */
  const floor = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // البداية على المرسى الأوسط، فلا يقفز الرمزُ مقاسًا عند أوّل سحبة
    const apply = () => {
      const base = Math.round(SHEET_STOPS[1] * window.innerHeight);
      floor.current = base;
      root.style.setProperty("--qcanvas-floor", `${base}px`);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [rootRef]);

  const settle = (root: HTMLElement, y: number) => {
    floor.current = Math.round(y);
    root.style.setProperty("--qcanvas-floor", `${floor.current}px`);
  };

  const drag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const root = rootRef.current;
    const sheet = root?.querySelector<HTMLElement>(".qsheet");
    if (!root || !sheet) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    sheet.dataset.drag = "1";
    // والغلافُ يُعلِن السحبَ أيضًا: اللوحةُ تقرؤه فتقطع انتقالَها، فلا تتخلّف عن الإصبع
    root.dataset.drag = "1";
    const h = window.innerHeight;
    const move = (ev: PointerEvent) => {
      const y = Math.min(Math.max(ev.clientY, h * SHEET_STOPS[0]), h * SHEET_STOPS[SHEET_STOPS.length - 1]);
      root.style.setProperty("--qsheet-top", `${Math.round(y)}px`);
      // نزولًا فقط: ما انكشف يُملأ في حينه، وصعودًا لا يُمسّ المقاس (تغطيةٌ محضة)
      if (y > floor.current) settle(root, y);
    };
    const up = (ev: PointerEvent) => {
      const y = ev.clientY / h;
      const stop = SHEET_STOPS.reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a));
      delete sheet.dataset.drag;
      delete root.dataset.drag;
      root.style.setProperty("--qsheet-top", `${(stop * 100).toFixed(0)}%`);
      // وهنا وحده يتبدّل المقاس: على المرسى المستقَرّ لا على آخر موضعٍ بلغه الإصبع
      settle(root, stop * h);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return <button type="button" className="qsheet-grip" aria-label="اسحب لتكبير المحرّر أو تصغيره" onPointerDown={drag} />;
}

/**
 * **اللوحةُ تبدأ من تحت ما فوقها** — `.qcanvas` طبقةٌ ثابتة، فلا تعرف أين انتهى رأسُ الصفحة
 * فوقها (وهو أخو المحرّر لا ابنُه: تكتبه الشاشةُ المستدعية، ويطول بطول عنوانه وبعرض الجهاز).
 * فيُقاس رأسُ الغلاف نفسِه ويُكتب رمزًا (`--qcanvas-top`)، سابقتُه `--asave-h`.
 *
 * ولا شيءَ يُمرَّر تحت اللوحة في هذه الهيئة (العمودان كلاهما ثابت)، فالرقمُ لا يتبدّل بتمرير؛
 * ويُعاد قياسُه عند تبدّل المقاس وعند تبدّل حاوية التمرير — وهناك يقع طولُ الرأس.
 */
function useCanvasTop() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const apply = () => {
      const top = Math.round(el.getBoundingClientRect().top);
      if (top > 0) el.style.setProperty("--qcanvas-top", `${top}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);
  return root;
}

/**
 * المعاينة **مُدرَجةً في الصفحة** لا صورةً خارجيّة (`<img src="data:…">`): صورةُ SVG مستندٌ
 * منفصلٌ لا يرث خطوط الصفحة، فكان نداء «امسحني» يخرج بخطّ المتصفّح. والمُدرَج يرث خطّ
 * الموقع كما سيخرج في PNG.
 *
 * والوسم مولَّدٌ عندنا بالكامل: الألوان مواصفةٌ مُقيَّدة، والنصّ الوحيد الذي يكتبه المستخدم
 * (النداء) يمرّ بـ`escapeXml` في الراسم — فلا مدخلَ لوسمٍ دخيل.
 */
export function QrPreview({ svg, max = PREVIEW }: { svg: string; max?: number }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (host.current) host.current.innerHTML = svg;
  }, [svg]);
  return <div ref={host} className="qprev w-full" style={{ maxWidth: max }} aria-label="معاينة الباركود" />;
}
