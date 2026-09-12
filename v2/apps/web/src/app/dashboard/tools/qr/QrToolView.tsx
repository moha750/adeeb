"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, AngleDial, Button, SectionCard, ColorField, Field, PointPad, Segmented, Switch, } from "@adeeb/design-system";
import {
  Drop, FileSvg, FloppyDisk, Globe, ImageSquare, PaintBucket, QrCode, Sparkle, Square, TextAa,
} from "@phosphor-icons/react";
import { CaretDown, DownloadSimple } from "@/app/_components/glyphs";
import { Eye, Trash, UploadSimple } from "@/app/_components/glyphs";
import {
  qrPng,
  qrSvg,
  qrSvgBlob,
  type Paint,
  type QrFramePlace,
  type QrFrameStyle,
  type QrSpec,
} from "@/lib/qr";
import { qrShortUrl } from "@/lib/qrLinks";
import { look } from "./look";
import { downloadBlob } from "@/lib/download";
import { UPLOAD_RULES, checkFile } from "@/lib/upload";
import { EmptyState } from "../../_components/EmptyState";
import { DropdownMenu } from "../../_components/DropdownMenu";
import { PageHeader } from "../../_components/PageHeader";

// وصفةُ شعار الرمز من قانون المرفقات (`lib/upload`)
const LOGO_RULE = UPLOAD_RULES.qrLogo;

/* ── مفردات المحرّر ─────────────────────────────────────────────────────── */


/** ضلع المعاينة على الشاشة — ثابتٌ لا يتبع مقاس التنزيل: الاثنان سؤالان مختلفان. */
/** مهلةُ السكون قبل الحفظ، وسقفُ الانتظار مهما تتابع التبدّل. */
const IDLE_MS = 1500;
const MAX_WAIT_MS = 5000;

const PREVIEW = 360;


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
export type QrSpecSaver = (
  spec: QrSpec,
  /** صامتًا: الحفظُ التلقائيّ لا يُعلن نجاحَه بتوست، فتوستٌ كلَّ ثانيتين ضجيج. والخطأُ يُقال دائمًا. */
  opts?: { silent?: boolean },
) => Promise<{ ok: boolean; message: string }>;

export function QrToolView({ code, title, initial, embedded = false, onSaveSpec }: {
  /** الرمزُ القصير كما وُلِد في باب الإنشاء — هو ما يُحفَر، فالمعاينةُ رمزٌ حيٌّ يُمسح. */
  code: string;
  /** اسمُ الباركود — يُسمّى به الملفُّ المنزَّل، فخمسةُ تصاميمَ لا تخرج بخمسِ نسخٍ لاسمٍ واحد. */
  title?: string;
  /** الوصفةُ المحفوظة إن كانت — يعود المحرّرُ إلى حالِه يومَ صُنع الرمز. */
  initial?: QrSpec | null;
  embedded?: boolean;
  onSaveSpec?: QrSpecSaver;
}) {
  const seed = look(initial);
  const fileStem = title?.trim() || "باركود-أديب";

  const [saving, setSaving] = useState(false);

  // الحبر
  const [gradient, setGradient] = useState(seed.gradient);
  const [ink, setInk] = useState(seed.ink);
  const [ink2, setInk2] = useState(seed.ink2);
  const [gradKind, setGradKind] = useState<"linear" | "radial">(seed.gradKind);
  const [angle, setAngle] = useState(seed.angle);
  const [cx, setCx] = useState(seed.cx);
  const [cy, setCy] = useState(seed.cy);

  // الخلفيّة
  const [hasBg, setHasBg] = useState(seed.hasBg);
  const [bg, setBg] = useState(seed.bg);

  // الأشكال
  const [eyeTinted, setEyeTinted] = useState(seed.eyeTinted);
  const [eyeColor, setEyeColor] = useState(seed.eyeColor);
  const [pupilColor, setPupilColor] = useState(seed.pupilColor);

  // الشعار
  const [logo, setLogo] = useState<string | null>(seed.logo);
  const [logoOk, setLogoOk] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  // الإطار
  const [framed, setFramed] = useState(seed.framed);
  const [frameStyle, setFrameStyle] = useState<QrFrameStyle>(seed.frameStyle);
  const [framePlace, setFramePlace] = useState<QrFramePlace>(seed.framePlace);
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
          ? { kind: "radial", from: ink, to: ink2, cx, cy }
          : { kind: "linear", from: ink, to: ink2, angle },
    [gradient, gradKind, ink, ink2, angle, cx, cy],
  );

  /** المواصفة — مصدرٌ واحد تقرؤه المعاينة والتنزيلان والمحفوظ، فلا يفترق المعروض عن المنزَّل. */
  const spec = useMemo(
    (): QrSpec => ({
      text: payload,
      size: seed.size,
      dots: { shape: seed.dotsShape, paint },
      eye: { shape: seed.eyeShape, color: eyeTinted ? eyeColor : null },
      pupil: { shape: seed.pupilShape, color: eyeTinted ? pupilColor : null },
      bg: hasBg ? bg : null,
      logo: logo ? { href: logo, scale: seed.logoScale } : null,
      frame: framed ? { color: frameColor, caption, textColor: captionColor, style: frameStyle, place: framePlace } : null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `seed` ثابتٌ بعد أوّل رسم (بذرةُ الصفّ المحفوظ)
    [payload, paint, eyeTinted, eyeColor, pupilColor, hasBg, bg, logo, framed, frameStyle, framePlace, frameColor, caption, captionColor],
  );

  // الطول عيبُ مُدخَلٍ لا عطبُ نظام: `qrMatrix` ترمي برسالةٍ عربيّة تُعرَض كما هي.
  const preview = useMemo(() => {
    try {
      return { svg: qrSvg({ ...spec, size: PREVIEW }), error: null as string | null };
    } catch (e) {
      return { svg: null as string | null, error: e instanceof Error ? e.message : "تعذّر توليد الباركود." };
    }
  }, [spec]);

  const onPickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // البوّابةُ من قانون المرفقات (`lib/upload`)، والسببُ يُعرض تنبيهًا لا توستًا: الشاشةُ مختبرٌ
    // يبقى المستعملُ فيه طويلًا، فالرسالةُ تُقيم بجانب الحقل لا تمرّ.
    const why = checkFile(file, LOGO_RULE);
    if (why) { setLogoOk(null); setLogoError(`${why}. الشعارُ يُضمَّن في كلّ نسخةٍ من الرمز، فاختر ملفًّا أخفّ`); return; }
    void (async () => {
      try {
        const { href } = await shrinkLogo(file);
        setLogo(href);
        setLogoError(null);
        // خبرُ القبول يُقال كما يُقال خبرُ الرفض، وفي موضعه نفسِه. ولا يُذكر الوزنُ بعد
        // التخفيف: عملُ الآلة لا شأنَ لصاحب الشعار به، ورقمٌ لا يُغيّر قرارًا زينةٌ تُقلق.
        setLogoOk(`أُدرج «${file.name}» في قلب الباركود`);
      } catch {
        setLogoOk(null);
        setLogoError("تعذّرت قراءة الملفّ.");
      }
    })();
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

  /**
   * **التنزيلُ يُحرَس** (٢٠٢٦-٠٨-٣١): كان `qrPng` يُنتظَر بلا حارس، ففشلُ فكِّ الشعار أو
   * فشلُ اللوح يسقط الوعدَ صامتًا — يضغط صاحبُه فلا شيء يحدث ولا شيء يُقال. والمحرّرُ بلا
   * توست عمدًا (يُعرَض في المعرض بلا مزوّد)، فالرسالةُ تنبيهٌ يقيم بجوار الزرّ كأخيه.
   */
  const [dlError, setDlError] = useState<string | null>(null);

  const savePng = async () => {
    try {
      setDlError(null);
      downloadBlob(await qrPng(spec), `${fileStem}.png`, "qr.png");
    } catch {
      setDlError("تعذّر رسمُ الصورة. جرّب مرّةً أخرى، وإن تكرّر فأزِل الشعار ثمّ أعِد المحاولة.");
    }
  };
  const saveSvg = () => {
    try {
      setDlError(null);
      downloadBlob(qrSvgBlob(spec), `${fileStem}.svg`, "qr.svg");
    } catch {
      setDlError("تعذّر إخراجُ الملفّ. جرّب مرّةً أخرى.");
    }
  };

  /**
   * **بصمةُ آخرِ ما حُفظ** — يُقاس بها «هل تغيّر شيء؟».
   *
   * وثمرتُها اليوم واحدة: **زرُّ الحفظ يُعطَّل ما لم يتغيّر شيء**، فيُقال «لا جديدَ» بلا
   * كلمة. (وشريطُ «لديك تغييراتٌ لم تُحفَظ» جُرّب ثمّ رُدّ ٢٠٢٦-٠٨-٢٧.)
   *
   * **وتُبذَر من المواصفة المبنيّة لا من الصفّ الخام**: المحفوظُ يمرّ ببذرة `look` ثمّ يُعاد
   * بناؤه، فقد يختلف نصُّه عن نصّ الصفّ (ترتيبُ مفاتيحَ أو حقلٌ لم يكن) وهو هو معنًى.
   * فبذرُها من الصفّ كان يُشعل الشريطَ لحظةَ الفتح بلا أن يمسّ أحدٌ شيئًا (رُئي وقيس).
   */
  const [savedFingerprint, setSavedFingerprint] = useState(() => JSON.stringify(spec));

  const dirty = !!onSaveSpec && JSON.stringify(spec) !== savedFingerprint;

  /**
   * حفظُ الوصفة: الشكلُ يُخزَّن في صفّ الرمز، فيُعاد رسمُه بعد سنةٍ كما رُسم اليوم.
   * وخبرُ النجاح والفشل تقوله **الغرفةُ** بتوستها، فلا ينبت في المحرّر لسانٌ ثانٍ.
   *
   * **ولا يتسابق طلبان** (٢٠٢٦-٠٨-٣١): كان كلُّ نداءٍ يمضي وحدَه، فإن تأخّرت الشبكةُ وصل
   * الأقدمُ أخيرًا فكتب وصفةً قديمةً فوق الجديدة، والبصمةُ تُحدَّث به فيُقال «حُفظ» كذبًا.
   * فصار الحفظُ **مصفوفًا**: واحدٌ في الطريق، ومن جاء وهو سائرٌ يُؤجَّل ويُطلَق بعده،
   * فآخرُ ما يبلغ القاعدةَ هو آخرُ ما رسمه صاحبُه.
   */
  const specRef = useRef(spec);
  const savedRef = useRef(savedFingerprint);
  // المرجعان يُزامَنان **بعد** الرسم لا فيه: القراءةُ من مرجعٍ أثناء الرسم عطبٌ يمسكه الحارس،
  // والحاجةُ إليهما في المؤقّت وفي مغادرة الشاشة — وكلاهما بعد الرسم.
  useEffect(() => {
    specRef.current = spec;
    savedRef.current = savedFingerprint;
  }, [spec, savedFingerprint]);
  const inFlight = useRef(false);
  const queued = useRef(false);
  /** مرجعُ الدالّة إلى نفسها: النداءُ الذاتيُّ داخل `useCallback` يقرأ ما لم يُعرَّف بعد. */
  const saveRef = useRef<(silent?: boolean) => Promise<void>>(async () => {});

  const saveDesign = useCallback(
    async (silent = false): Promise<void> => {
      if (!onSaveSpec) return;
      if (inFlight.current) { queued.current = true; return; }
      inFlight.current = true;
      setSaving(true);
      const snapshot = specRef.current;
      const print = JSON.stringify(snapshot);
      const res = await onSaveSpec(snapshot, { silent });
      inFlight.current = false;
      setSaving(false);
      // البصمةُ تُحدَّث بالمحفوظ لا بالمعروض: لو ردّ الخادمُ خطأً بقي «لم يُحفَظ» قائمًا
      if (res.ok) setSavedFingerprint(print);
      // ما تبدّل والطلبُ سائرٌ يُكتب الآن، فلا ينام تعديلٌ في انتظار تبدّلٍ جديد
      const again = queued.current && JSON.stringify(specRef.current) !== print;
      queued.current = false;
      if (again) void saveRef.current(true);
    },
    [onSaveSpec],
  );

  useEffect(() => { saveRef.current = saveDesign; }, [saveDesign]);

  /**
   * **الحفظُ التلقائيّ** (اختيارُ المالك ٢٠٢٦-٠٨-٢٧، بعد أن رُدّ الشريطُ ورُدّت النافذة).
   *
   * علّتُه سؤالٌ سُئل: «لو صمّم ثمّ رجع أو بدّل التبويب؟» — كان الشكلُ يضيع بلا كلمة.
   *
   * **وبمهلةِ سكون وسقفِ انتظار** (السقفُ أُضيف ٢٠٢٦-٠٨-٣١): العبثُ بمنتقي لونٍ يولّد
   * عشراتِ التبدّلات في الثانية، فتُنتظَر ثانيةٌ ونصفٌ من الهدوء. لكنّ السكونَ وحدَه يُؤجّل
   * إلى الأبد: سحبةٌ متّصلةٌ نصفَ دقيقةٍ كانت تُصفّر المؤقّتَ في كلّ إطارٍ فلا يُكتب شيء.
   * فصار للانتظار سقفٌ خمسُ ثوانٍ من أوّل تبدّل، يُكتب عنده ولو لم يسكن.
   */
  const firstDirtyAt = useRef<number | null>(null);

  useEffect(() => {
    if (!dirty) { firstDirtyAt.current = null; return; }
    if (firstDirtyAt.current === null) firstDirtyAt.current = Date.now();
    const waited = Date.now() - firstDirtyAt.current;
    const delay = Math.max(0, Math.min(IDLE_MS, MAX_WAIT_MS - waited));
    const t = setTimeout(() => { firstDirtyAt.current = null; void saveDesign(true); }, delay);
    return () => clearTimeout(t);
  }, [spec, dirty, saveDesign]);

  /**
   * **وما لم يسكن يُحفَظ عند المغادرة** (٢٠٢٦-٠٨-٣١): تبدّلٌ في آخرِ ثانيةٍ ونصفٍ ثمّ نقرةٌ
   * على الفتات كان يذهب بلا كلمة، والمهلةُ تُلغى في التنظيف ولا يخلفها شيء. فبابان:
   * إخفاءُ اللسان (وهو ما يعِد به المتصفّح عند إغلاقه أو تبديله) والخروجُ من الشاشة.
   */
  useEffect(() => {
    if (!onSaveSpec) return;
    const flush = () => {
      if (JSON.stringify(specRef.current) !== savedRef.current) void saveDesign(true);
    };
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [onSaveSpec, saveDesign]);

  const rootRef = useCanvasTop();

  /** صفُّ الأفعال: تعريفٌ واحدٌ يقرؤه الموضعان (كرتُ المعاينة في الواسع، ورأسُ الورقة في الجوّال). */
  const downloads = (
    <>
      {onSaveSpec ? (
        <Button variant="primary" size="md" loading={saving} disabled={!dirty} onClick={() => void saveDesign()}>
          <FloppyDisk /> {dirty ? "حفظ التصميم" : "حُفظ التصميم"}
        </Button>
      ) : null}
      {/* **زرٌّ واحدٌ يفتح الصيغتين** (أمرُ المالك ٢٠٢٦-٠٨-٢٥): كان زرَّين متجاورين، والصيغةُ
          تفصيلٌ تقنيٌّ لا يُقدَّم على الفعل. فالفعلُ «تحميلها كصورة»، والصيغةُ تُختار بعده.
          والقائمةُ من بدائيّة النظام (`DropdownMenu` على `AnchoredPopover`) لا لوحٌ يُخترع. */}
      <DropdownMenu
        ariaLabel="صيغة التحميل"
        matchWidth
        triggerClassName="abtn abtn-neutral abtn-md"
        trigger={<><DownloadSimple /> تحميلها كصورة <CaretDown size={16} /></>}
        groups={[{
          items: [
            { label: "صورة عالية الجودة للطباعة والنشر", icon: <ImageSquare />, onSelect: () => void savePng(), disabled: !preview.svg },
            { label: "ملفّ بصيغة مفتوحة للتعديل", icon: <FileSvg />, onSelect: saveSvg, disabled: !preview.svg },
          ],
        }]}
      />
      {dlError ? <Alert tone="danger" title="تعذّر التحميل">{dlError}</Alert> : null}
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
                    /* القرصُ مكانَ قائمةٍ بأربع كلمات (اختيارُ المالك ٢٠٢٦-٠٨-٢٢، المعرض
                       `/ui/gradient`): الاتّجاهُ شكلٌ يُرى لا كلمةٌ تُترجَم في الذهن، والزوايا
                       كلُّها مفتوحةٌ بلقطةِ خمسَ عشرةَ درجة. */
                    <div className="fld">
                      <span className="fld-lbl">اتّجاه التدرّج</span>
                      <div className="mt-2 flex justify-center">
                        <AngleDial value={angle} onValueChange={setAngle} aria-label="اتّجاه التدرّج" />
                      </div>
                    </div>
                  ) : (
                    /* والشعاعيُّ مركزُه موضعٌ لا رقمان: تُسحَب النقطةُ فينتقل الوهج، وخلفيّةُ
                       اللوح هي التدرّجُ نفسُه بلونيه. */
                    <div className="fld">
                      <span className="fld-lbl">مركز الوهج</span>
                      <div className="mt-2 flex justify-center">
                        <PointPad
                          x={cx}
                          y={cy}
                          onChange={(x, y) => { setCx(x); setCy(y); }}
                          preview={`radial-gradient(circle at ${(cx * 100).toFixed(0)}% ${(cy * 100).toFixed(0)}%, ${ink}, ${ink2})`}
                          aria-label="مركز الوهج"
                        />
                      </div>
                    </div>
                  )}
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
              label="خلفيّة"
              description="بإطفائها يخرج الباركود شفّافًا ليوضع على التصاميم."
              checked={hasBg}
              onChange={(e) => setHasBg(e.target.checked)}
            />
            {hasBg ? (
              <div className="mt-4">
                <ColorField label="لون الخلفيّة" icon={<PaintBucket />} value={bg} onValueChange={setBg} />
              </div>
            ) : null}
          </SectionCard>

          <SectionCard headerVariant="soft" icon={<Eye />} title="العيون">
            <div className="flex flex-col gap-4">
              <Switch
                row
                label="لونٌ مستقلّ للعيون"
                description="تستطيع تغيير لون عيون الباركود."
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
                // يتوسّط كرتَه لا يلتصق بصدره: هو **صورةٌ تُرى** لا سطرَ نصٍّ يُقرأ من طرف
                <div className="flex w-full justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- صورةٌ مضمَّنة (data URL) لا أصلٌ ثابت */}
                  <img src={logo} alt="الشعار المختار" className="max-h-20 w-auto rounded" />
                </div>
              ) : (
                <p className="txt">تستطيع إضافة شعار ليكون في منتصف الباركود.</p>
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
              {/* التنبيهُ يمتدّ على عرض الكرت: العمودُ `items-start` يقصّ أبناءه بعرض
                  محتواهم، فكان التنبيهُ شريطًا قصيرًا لا يُشبه تنبيهات الشاشة. */}
              {logoError ? (
                <div className="w-full">
                  <Alert tone="danger" title="تعذّر استعمال الشعار">{logoError}</Alert>
                </div>
              ) : null}
              {logoOk && !logoError ? (
                <div className="w-full">
                  <Alert tone="success" title="أُدرج الشعار">{logoOk}</Alert>
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard headerVariant="soft" icon={<TextAa />} title="الإطار والنداء">
            <Switch
              row
              label="إطارٌ ونداء"
              description="طوقٌ حول الباركود وشريطُ نصٍّ يدعو إلى مسحه."
              checked={framed}
              onChange={(e) => setFramed(e.target.checked)}
            />
            {framed ? (
              <div className="mt-4 flex flex-col gap-4">
                {/* الشكلُ والموضعُ سؤالان لا سؤالٌ واحد (معرضُهما `/ui/qr-frames`): فلا
                    تتضاعف الأشكالُ بعدد المواضع كلّما زِيد موضعٌ أو شكل. */}
                <Segmented
                  wide
                  aria-label="شكل الإطار"
                  items={[
                    { value: "band", label: "طوقٌ وشريط" },
                    { value: "ring", label: "طوقٌ فقط" },
                    { value: "bubble", label: "فقاعة" },
                  ]}
                  value={frameStyle}
                  onValueChange={(v) => setFrameStyle(v as QrFrameStyle)}
                />
                {frameStyle !== "ring" ? (
                  <Segmented
                    wide
                    aria-label="موضع النداء"
                    items={[{ value: "bottom", label: "النداءُ تحت" }, { value: "top", label: "النداءُ فوق" }]}
                    value={framePlace}
                    onValueChange={(v) => setFramePlace(v as QrFramePlace)}
                  />
                ) : null}
                {frameStyle !== "ring" ? (
                  <Field
                    label="نصّ النداء"
                    icon={<TextAa />}
                    innerIcon={<Globe />}
                    placeholder="امسح الباركود"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    helper="اتركه فارغًا فيبقى الطوق بلا شريط."
                    optional
                  />
                ) : null}
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

/** أقصى ضلعٍ للشعار المخزَّن بالبكسل: الشعارُ يشغل ≤٣٠٪ من صورةٍ ضلعُها ٢٠٤٨، فما زاد لا يُرى. */
const LOGO_PX = 640;

/**
 * **المرفوعُ ليس المحفوظ.**
 *
 * الشعارُ يُخزَّن مضمَّنًا في وصفة الباركود (`data:`)، والوصفةُ صفٌّ في القاعدة يُجلَب مع كلّ
 * قراءةِ قائمة. فلو حُفظ الملفُّ كما رُفع لصار صفٌّ واحدٌ ميغابايتَين، وثقُلت القائمةُ على كلّ
 * من يفتحها لا على من رفعه وحده.
 *
 * فيُصغَّر في المتصفّح قبل أن يُضمَّن: ضلعٌ أقصاه ٦٤٠، وترميزٌ **WEBP** (يحفظ الشفافيّة، وهي
 * شرطُ شعارٍ بلا خلفيّة). وبهذا ارتفع حدُّ الرفع إلى خمسة ميغابايت بلا أن يثقل صفّ.
 *
 * **و`SVG` يمرّ كما هو**: متّجهاتٌ نصّيّةٌ خفيفة، وتحويلُها إلى بكسلاتٍ خسارةٌ صافية.
 */
async function shrinkLogo(file: File): Promise<{ href: string }> {
  const raw = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(typeof r.result === "string" ? r.result : "");
    r.onerror = () => rej(new Error("read"));
    r.readAsDataURL(file);
  });
  if (file.type === "image/svg+xml") return { href: raw };

  const img = new Image();
  img.src = raw;
  await img.decode();
  const side = Math.max(img.naturalWidth, img.naturalHeight);
  if (side <= LOGO_PX && raw.length < 120_000) return { href: raw };

  const k = Math.min(1, LOGO_PX / side);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
  const ctx = canvas.getContext("2d");
  if (!ctx) return { href: raw };
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL("image/webp", 0.9);
  // حارسٌ: لو خرج الترميزُ أثقلَ من الأصل (شعارٌ صغيرٌ مسطّح) بقي الأصلُ كما هو
  return { href: out.length < raw.length ? out : raw };
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
      // نسبةً إلى لوح المحتوى (`.ash-main`) لا إلى النافذة: هو مرجعُ تموضع اللوحة والورقة،
      // فالقياسُ من النافذة كان يزيد بمقدار حاشية اللوحة فتنزل اللوحةُ عن موضعها.
      const host = el.closest(".ash-main");
      const base = host ? host.getBoundingClientRect().top : 0;
      const top = Math.round(el.getBoundingClientRect().top - base);
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
