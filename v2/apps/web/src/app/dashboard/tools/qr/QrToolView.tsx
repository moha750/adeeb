"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Button, ChartPanel, ColorField, Field, Segmented, Select, Switch, } from "@adeeb/design-system";
import { color } from "@adeeb/design-system/tokens";
import {
  Drop, FileSvg, Globe, ImageSquare, LinkSimple, PaintBucket, QrCode, Sparkle, Square, TextAa,
} from "@phosphor-icons/react";
import { DownloadSimple } from "@/app/_components/glyphs";
import { Eye, Trash, UploadSimple } from "@/app/_components/glyphs";
import {
  contrast,
  effectiveEcc,
  inkColors,
  qrPng,
  qrSvg,
  qrSvgBlob,
  type DotShape,
  type EyeShape,
  type Paint,
  type QrSpec,
} from "@/lib/qr";
import { downloadBlob } from "@/lib/download";
import { Breadcrumb } from "../../_shell/Breadcrumb";

/* ── مفردات المحرّر ─────────────────────────────────────────────────────── */

/**
 * **شكلُ رمز أديب — مُقَرٌّ لا مُختار** (قرار المالك ٢٠٢٦-٠٨-٠٣): وحداتٌ سائلة وعينٌ
 * وبؤبؤٌ مستديران. أُزيلت الأشكال الأخرى من المحرّر **ومن الراسم معًا**، فلا خيارَ يُعرَض
 * ولا وصفةَ تُكتَب تُخرج رمزًا خارج الهوية.
 *
 * (والمربّع باقٍ في الراسم وحده لأنّ **ختم الشهادة** يطلبه صراحةً — وثيقةٌ رسميّة لا ملصق.)
 */
const SHAPE = { dots: "fluid", eye: "rounded", pupil: "rounded" } as const satisfies {
  dots: DotShape;
  eye: EyeShape;
  pupil: EyeShape;
};

const SIZES = [
  { value: "512", label: "٥١٢ بكسل", hint: "للشاشة والمنشورات الرقميّة" },
  { value: "1024", label: "١٠٢٤ بكسل", hint: "للطباعة الصغيرة (ملصق · بطاقة)" },
  { value: "2048", label: "٢٠٤٨ بكسل", hint: "للطباعة الكبيرة (لوحة · رول‑أب)" },
];

const LOGO_SIZES = [
  { value: "0.18", label: "صغير", hint: "الأأمن مسحًا" },
  { value: "0.24", label: "متوسّط", hint: "الاتّزان المعتاد" },
  { value: "0.3", label: "كبير", hint: "الحدّ الأقصى المسموح" },
];

/** ضلع المعاينة على الشاشة — ثابتٌ لا يتبع مقاس التنزيل: الاثنان سؤالان مختلفان. */
const PREVIEW = 360;

/** أقصى حجمٍ لملفّ الشعار — يُضمَّن في الرمز نفسه، فالكبيرُ يُثقل كلّ نسخةٍ منه. */
const LOGO_MAX_BYTES = 512 * 1024;

/** عتبتا التباين: دون الأولى تحذير، ودون الثانية إنذارٌ صريح (لا يُمسح غالبًا). */
const CONTRAST_WARN = 4;
const CONTRAST_FAIL = 3;

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
export function QrToolView() {
  const [text, setText] = useState("");
  const [size, setSize] = useState("1024");

  // الحبر
  const [gradient, setGradient] = useState(false);
  const [ink, setInk] = useState<string>(color.navy[700]);
  const [ink2, setInk2] = useState<string>(color.steel[400]);
  const [gradKind, setGradKind] = useState<"linear" | "radial">("linear");
  const [angle, setAngle] = useState("135");

  // الخلفيّة
  const [bare, setBare] = useState(false);
  const [bg, setBg] = useState("#ffffff");

  // الأشكال
  const [eyeTinted, setEyeTinted] = useState(false);
  const [eyeColor, setEyeColor] = useState<string>(color.navy[900]);
  const [pupilColor, setPupilColor] = useState<string>(color.semantic.warning);

  // الشعار
  const [logo, setLogo] = useState<string | null>(null);
  const [logoScale, setLogoScale] = useState("0.24");
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  // الإطار
  const [framed, setFramed] = useState(false);
  const [caption, setCaption] = useState("امسحني");
  const [frameColor, setFrameColor] = useState<string>(color.navy[700]);
  const [captionColor, setCaptionColor] = useState("#ffffff");

  const trimmed = text.trim();

  const paint = useMemo(
    (): Paint =>
      !gradient
        ? { kind: "solid", color: ink }
        : gradKind === "radial"
          ? { kind: "radial", from: ink, to: ink2 }
          : { kind: "linear", from: ink, to: ink2, angle: Number(angle) },
    [gradient, gradKind, ink, ink2, angle],
  );

  /** المواصفة — مصدرٌ واحد تقرؤه المعاينة والتنزيلان، فلا يفترق المعروض عن المنزَّل. */
  const spec = useMemo(
    (): QrSpec => ({
      text: trimmed,
      size: Number(size),
      dots: { shape: SHAPE.dots, paint },
      eye: { shape: SHAPE.eye, color: eyeTinted ? eyeColor : null },
      pupil: { shape: SHAPE.pupil, color: eyeTinted ? pupilColor : null },
      bg: bare ? null : bg,
      logo: logo ? { href: logo, scale: Number(logoScale) } : null,
      frame: framed ? { color: frameColor, caption, textColor: captionColor } : null,
    }),
    [trimmed, size, paint, eyeTinted, eyeColor, pupilColor, bare, bg, logo, logoScale, framed, frameColor, caption, captionColor],
  );

  // الطول عيبُ مُدخَلٍ لا عطبُ نظام: `qrMatrix` ترمي برسالةٍ عربيّة تُعرَض كما هي.
  const preview = useMemo(() => {
    if (!trimmed) return { svg: null as string | null, error: null as string | null };
    try {
      return { svg: qrSvg({ ...spec, size: PREVIEW }), error: null };
    } catch (e) {
      return { svg: null, error: e instanceof Error ? e.message : "تعذّر توليد الرمز." };
    }
  }, [trimmed, spec]);

  /**
   * **حارس التباين** — يقيس أضعف حبرٍ في الرمز مقابل أرضيّته. والخلفيّة الشفّافة لا تُقاس:
   * أرضيّتُها تصميمُ من يستعمله، فتُقال الحقيقة ولا يُختلق رقم.
   */
  const guard = useMemo(() => {
    if (bare) return { tone: "info" as const, text: "الخلفيّة شفّافة — التباين رهنُ السطح الذي تضعه عليه، فتحقّق منه بعينك." };
    const worst = Math.min(...inkColors(spec).map((c) => contrast(c, bg)));
    const n = worst.toFixed(1);
    if (worst < CONTRAST_FAIL) return { tone: "danger" as const, text: `التباين ${n}:١ — هذا الرمز لن يُمسح. أعتِم الحبر أو فتِّح الأرضيّة.` };
    if (worst < CONTRAST_WARN) return { tone: "warning" as const, text: `التباين ${n}:١ — يُمسح على الشاشة وقد يُخفق مطبوعًا أو في ضوءٍ ضعيف.` };
    return { tone: "success" as const, text: `التباين ${n}:١ — وافٍ للطباعة والمسح من بُعد.` };
  }, [bare, bg, spec]);

  const onPickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError("الملفّ أكبر من ٥١٢ كيلوبايت — الشعار يُضمَّن في كلّ نسخةٍ من الرمز، فاختر ملفًّا أخفّ.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(typeof reader.result === "string" ? reader.result : null);
      setLogoError(null);
    };
    reader.onerror = () => setLogoError("تعذّرت قراءة الملفّ.");
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
    downloadBlob(await qrPng(spec), "رمز-أديب.png", "qr.png");
  };
  const saveSvg = () => {
    downloadBlob(qrSvgBlob(spec), "رمز-أديب.svg", "qr.svg");
  };

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb />
          <h1>مولّد الباركود</h1>
        </div>
      </div>

      <Alert tone="info" title="الرمز آلةٌ تُقرأ قبل أن يكون شكلًا">
        اطبعه بضلعٍ لا يقلّ عن ٢ سم (٣ سم لِما يُمسح من بُعد)، واترك حوله الفراغَ المرسوم في
        الملفّ فلا تقصّه. وللطباعة اختر <b>SVG</b>: يكبر بلا تحبّب مهما بلغ القياس.
        والشعارُ يرفع تصحيح الخطأ إلى <b>{effectiveEcc(spec)}</b> ويُفرِّغ ما تحته — فلا يخنق بيانات.
      </Alert>

      <div className="card-grid mt-4">
        {/* ── الضوابط ── */}
        <div className="flex flex-col gap-4">
          <ChartPanel headerVariant="chip" icon={<QrCode />} title="ما يحمله الرمز">
            <Field
              label="الرابط أو النصّ"
              icon={<LinkSimple />}
              innerIcon={<Globe />}
              placeholder="https://adeeb.club"
              dir="ltr"
              value={text}
              onChange={(e) => setText(e.target.value)}
              helper="كلّما قصُر النصّ كبُرت وحدات الرمز وسهُل مسحه."
              required
            />
            <div className="mt-4">
              <Select label="مقاس التنزيل" icon={<DownloadSimple />} options={SIZES} value={size} onValueChange={setSize} />
            </div>
          </ChartPanel>

          <ChartPanel headerVariant="chip" icon={<Drop />} title="الحبر والأرضيّة">
            <Switch
              row
              label="تدرّج بدل لونٍ صلب"
              description="لونان يتدرّجان عبر الرمز — والحارس أدناه يقيس أضعفهما."
              checked={gradient}
              onChange={(e) => setGradient(e.target.checked)}
            />
            <div className="mt-4 flex flex-col gap-4">
              <ColorField label={gradient ? "اللون الأوّل" : "لون الحبر"} icon={<Drop />} value={ink} onValueChange={setInk} required />
              {gradient ? (
                <>
                  <ColorField label="اللون الثاني" icon={<Sparkle />} value={ink2} onValueChange={setInk2} required />
                  <Segmented
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

              <Switch
                row
                label="بلا خلفيّة"
                description="أرضيّةٌ شفّافة لوضعه على تصميمٍ فاتح — وعلى الداكن لا يُقرأ."
                checked={bare}
                onChange={(e) => setBare(e.target.checked)}
              />
              {!bare ? <ColorField label="لون الأرضيّة" icon={<PaintBucket />} value={bg} onValueChange={setBg} /> : null}
            </div>

            <div className="mt-4">
              <Alert tone={guard.tone} title="التباين مقيسٌ لا مظنون">{guard.text}</Alert>
            </div>
          </ChartPanel>

          <ChartPanel headerVariant="chip" icon={<Eye />} title="العيون">
            <div className="flex flex-col gap-4">
              <Switch
                row
                label="لونٌ مستقلّ للعيون"
                description="العيون الثلاث بنيةٌ يبحث عنها القارئ أوّلًا — تُلوَّن ولا تُنقَص."
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
          </ChartPanel>

          <ChartPanel headerVariant="chip" icon={<ImageSquare />} title="الشعار في القلب">
            <div className="flex flex-col gap-3 items-start">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- صورةٌ مضمَّنة (data URL) لا أصلٌ ثابت
                <img src={logo} alt="الشعار المختار" className="max-h-20 w-auto rounded" />
              ) : (
                <p className="txt">لا شعار — الرمز يخرج نظيفًا. وإن أضفته رُفع التصحيح إلى H وفُرِّغ ما تحته.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="md" onClick={() => logoInput.current?.click()}>
                  <UploadSimple size={18} /> {logo ? "تغيير الشعار" : "رفع شعار"}
                </Button>
                <Button variant="ghost" size="md" onClick={() => void pickBrandLogo()}>
                  <Sparkle size={18} /> شعار أديب
                </Button>
                {logo ? (
                  <Button variant="ghost-danger" size="md" onClick={() => setLogo(null)}>
                    <Trash size={18} /> إزالة
                  </Button>
                ) : null}
              </div>
              <input ref={logoInput} type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" hidden onChange={onPickLogo} />
              {logoError ? <Alert tone="danger" title="تعذّر استعمال الشعار">{logoError}</Alert> : null}
              {logo ? (
                <div className="w-full">
                  <Select label="حجم الشعار" icon={<ImageSquare />} options={LOGO_SIZES} value={logoScale} onValueChange={setLogoScale} />
                </div>
              ) : null}
            </div>
          </ChartPanel>

          <ChartPanel headerVariant="chip" icon={<TextAa />} title="الإطار والنداء">
            <Switch
              row
              label="إطارٌ ونداء تحته"
              description="للملصقات — طوقٌ حول الرمز وشريطُ نصٍّ يدعو إلى مسحه."
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
          </ChartPanel>
        </div>

        {/* ── المعاينة ── */}
        <div>
          <ChartPanel headerVariant="chip" icon={<QrCode />} title="المعاينة — ما تراه هو ما يُنزَّل">
            {preview.error ? (
              <Alert tone="warning" title="تعذّر توليد الرمز">{preview.error}</Alert>
            ) : preview.svg ? (
              <QrPreview svg={preview.svg} />
            ) : (
              <p className="txt">اكتب رابطًا أو نصًّا فيظهر رمزه هنا.</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" size="md" disabled={!preview.svg} onClick={() => void savePng()}>
                <DownloadSimple /> تنزيل PNG
              </Button>
              <Button variant="neutral" size="md" disabled={!preview.svg} onClick={saveSvg}>
                <FileSvg /> تنزيل SVG
              </Button>
            </div>

            <p className="fld-help mt-3">
              وقبل الطباعة بالألف: امسحه بهاتفك من الشاشة، ثمّ اطبع نسخةً واحدة وامسحها. ما يُقرأ
              على الشاشة قد يُخفق على الورق.
            </p>
          </ChartPanel>
        </div>
      </div>
    </>
  );
}

/**
 * المعاينة **مُدرَجةً في الصفحة** لا صورةً خارجيّة (`<img src="data:…">`): صورةُ SVG مستندٌ
 * منفصلٌ لا يرث خطوط الصفحة، فكان نداء «امسحني» يخرج بخطّ المتصفّح. والمُدرَج يرث خطّ
 * الموقع كما سيخرج في PNG.
 *
 * والوسم مولَّدٌ عندنا بالكامل: الألوان مواصفةٌ مُقيَّدة، والنصّ الوحيد الذي يكتبه المستخدم
 * (النداء) يمرّ بـ`escapeXml` في الراسم — فلا مدخلَ لوسمٍ دخيل.
 */
function QrPreview({ svg }: { svg: string }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (host.current) host.current.innerHTML = svg;
  }, [svg]);
  return <div ref={host} className="w-full" style={{ maxWidth: PREVIEW }} aria-label="معاينة الرمز" />;
}
