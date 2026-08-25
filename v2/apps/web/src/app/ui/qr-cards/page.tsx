"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Accordion, AngleDial, Button, ColorField, Container, Field, PointPad, SectionCard, Segmented, Switch, cn,
} from "@adeeb/design-system";
import { Drop, Globe, ImageSquare, PaintBucket, SlidersHorizontal, Sparkle, Square, TextAa } from "@phosphor-icons/react";
import { Eye, Trash, UploadSimple } from "@/app/_components/glyphs";
import { qrSvg, type Paint, type QrSpec } from "@/lib/qr";
import { UPLOAD_RULES, checkFile } from "@/lib/upload";
import { QrPreview } from "../../dashboard/tools/qr/QrToolView";
import { LOGO_SCALE, LOOK, SHAPE } from "../../dashboard/tools/qr/defaults";

/**
 * معرضُ **أوعية ضوابط الباركود** — سؤالٌ واحد: بمَ تُغلَّف الضوابطُ الخمس؟
 *
 * المحرّرُ اليوم خمسةُ كروتٍ متساوية الوزن. والمأخذُ ليس التقسيم (هو تشريحيٌّ صادق) بل
 * الوعاء: بعد أن أُقرّت الأشكالُ والمقاسات ولم تعد تُختار (`SHAPE`/`EXPORT`/`LOGO_SCALE`)
 * صار أربعةٌ من الخمسة منتقياتِ ألوانٍ خلف مفتاح، وثلاثةٌ منها مطفأةً كرتٌ حول سطرٍ واحد.
 * وثمنُه يقع على الجوّال حيث تعيش الأداةُ فعلًا: رأسٌ ناعم (٥٠) وحشوُ جسمٍ (٤٠) وفجوة (١٦)
 * لكلّ كرت، وورقةُ المحرّر المرئيّة نحو ٣١٠ بكسلًا.
 *
 * فهذه ثلاثةٌ جنبًا إلى جنب **بالحالة نفسِها وعلى الرمز نفسِه**، ومعها **طولُ كلّ عمودٍ
 * مقيسًا حيًّا** (لا مقدَّرًا): غيّر لونًا أو افتح مفتاحًا فتتبدّل الثلاثةُ والأرقامُ معًا.
 *
 * وما يُقرّه المالكُ يُركَّب على `QrToolView`، وتُعدَم هذه الصفحةُ وأخواتُها المردودة.
 */

const LOGO_RULE = UPLOAD_RULES.qrLogo;

/** رمزٌ حيٌّ يُمسح، كالذي يخرج من المحرّر. */
const PAYLOAD = "https://adeeb.club/q/d3m9qk4";

/** طولُ ورقة المحرّر المرئيّة على جوّالٍ 375×667 عند المرسى الأوسط، مقيسًا لا مقدَّرًا. */
const SHEET_VISIBLE = 310;

/** يقيس ارتفاعَ عمودٍ حيًّا: القرارُ هنا عن الطول، فالرقمُ جزءٌ من المعروض لا حاشية. */
function useHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [h, setH] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(Math.round(el.getBoundingClientRect().height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, h] as const;
}

export default function QrCardsLab() {
  // الحبر
  const [gradient, setGradient] = useState(false);
  const [ink, setInk] = useState<string>(LOOK.ink);
  const [ink2, setInk2] = useState<string>(LOOK.ink2);
  const [gradKind, setGradKind] = useState<"linear" | "radial">(LOOK.gradKind);
  const [angle, setAngle] = useState(LOOK.angle);
  const [cx, setCx] = useState(LOOK.cx);
  const [cy, setCy] = useState(LOOK.cy);
  // الخلفيّة
  const [bare, setBare] = useState(!LOOK.hasBg);
  const [bg, setBg] = useState<string>(LOOK.bg);
  // العيون
  const [eyeTinted, setEyeTinted] = useState(LOOK.eyeTinted);
  const [eyeColor, setEyeColor] = useState<string>(LOOK.eyeColor);
  const [pupilColor, setPupilColor] = useState<string>(LOOK.pupilColor);
  // الشعار
  const [logo, setLogo] = useState<string | null>(null);
  const [logoOn, setLogoOn] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  // الإطار
  const [framed, setFramed] = useState(LOOK.framed);
  const [caption, setCaption] = useState<string>(LOOK.caption);
  const [frameColor, setFrameColor] = useState<string>(LOOK.frameColor);
  const [captionColor, setCaptionColor] = useState<string>(LOOK.captionColor);

  const svg = useMemo(() => {
    const paint: Paint = !gradient
      ? { kind: "solid", color: ink }
      : gradKind === "radial"
        ? { kind: "radial", from: ink, to: ink2, cx, cy }
        : { kind: "linear", from: ink, to: ink2, angle };
    const spec: QrSpec = {
      text: PAYLOAD,
      size: 360,
      dots: { shape: SHAPE.dots, paint },
      eye: { shape: SHAPE.eye, color: eyeTinted ? eyeColor : null },
      pupil: { shape: SHAPE.pupil, color: eyeTinted ? pupilColor : null },
      bg: bare ? null : bg,
      logo: logo && logoOn ? { href: logo, scale: LOGO_SCALE } : null,
      frame: framed ? { color: frameColor, caption, textColor: captionColor } : null,
    };
    try {
      return qrSvg(spec);
    } catch {
      return null;
    }
  }, [gradient, ink, ink2, gradKind, angle, cx, cy, bare, bg, eyeTinted, eyeColor, pupilColor, logo, logoOn, framed, caption, frameColor, captionColor]);

  /* المختبرُ لا يحاكي مسارَ الرفع كلَّه (تخفيفٌ وتنبيهات): سؤالُ الصفحة الوعاءُ لا المرفق. */
  const onPickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || checkFile(file, LOGO_RULE)) return;
    const reader = new FileReader();
    reader.onload = () => { setLogo(String(reader.result)); setLogoOn(true); };
    reader.readAsDataURL(file);
  };
  const pickBrandLogo = async () => {
    const res = await fetch("/brand/logo-vertical.svg");
    if (!res.ok) return;
    setLogo(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(await res.text())}`);
    setLogoOn(true);
  };

  /* ── حقولُ الأقسام: تُكتب مرّةً وتقرؤها الأوعيةُ الثلاثة، فلا يفترق المعروضُ بينها ── */

  const inkFields = (
    <>
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
              <div className="fld">
                <span className="fld-lbl">اتّجاه التدرّج</span>
                <div className="mt-2 flex justify-center">
                  <AngleDial value={angle} onValueChange={setAngle} aria-label="اتّجاه التدرّج" />
                </div>
              </div>
            ) : (
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
    </>
  );

  const bgFields = <ColorField label="لون الخلفيّة" icon={<PaintBucket />} value={bg} onValueChange={setBg} />;

  const eyeFields = (
    <>
      <ColorField label="لون الطوق" icon={<Eye />} value={eyeColor} onValueChange={setEyeColor} />
      <ColorField label="لون البؤبؤ" icon={<Eye />} value={pupilColor} onValueChange={setPupilColor} />
    </>
  );

  const logoFields = (
    <>
      {logo ? (
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
          <Button variant="ghost-danger" size="md" onClick={() => setLogo(null)}>
            <Trash size={18} /> إزالة
          </Button>
        ) : null}
      </div>
      <input ref={logoInput} type="file" accept={LOGO_RULE.accept} hidden onChange={onPickLogo} />
    </>
  );

  const frameFields = (
    <>
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
      <ColorField label="لون الإطار" icon={<Square />} value={frameColor} onValueChange={setFrameColor} />
      <ColorField label="لون النصّ" icon={<TextAa />} value={captionColor} onValueChange={setCaptionColor} />
    </>
  );

  /**
   * الأقسامُ الأربعةُ الاختياريّة. ولها وجهان لا وجه:
   * `card` مفتاحٌ داخل كرتٍ معنون (اليومَ، والاسمُ في الرأس فيُنفى في المفتاح: «بلا خلفيّة»)،
   * و`row` مفتاحٌ **هو** العنوان (فيُثبَت لا يُنفى: «خلفيّةٌ ملوّنة»). واختلافُ اللفظ لازمُ
   * الشكل لا زينةٌ فيه: حيث لا رأسَ للكرت يحمل الاسمَ، يحمله المفتاح.
   */
  const opts = [
    {
      key: "bg",
      icon: <PaintBucket />,
      title: "الخلفيّة",
      rowTitle: "خلفيّةٌ ملوّنة",
      note: "خلفيّةٌ شفّافة لوضعه على التصاميم بلا خلفيّة.",
      rowNote: "أطفئه فتصير الخلفيّةُ شفّافةً لوضعه على التصاميم.",
      cardLabel: "بلا خلفيّة",
      cardOn: bare,
      setCardOn: setBare,
      rowOn: !bare,
      setRowOn: (v: boolean) => setBare(!v),
      shown: !bare,
      fields: bgFields,
    },
    {
      key: "eye",
      icon: <Eye />,
      title: "العيون",
      rowTitle: "لونٌ مستقلّ للعيون",
      note: "تستطيع تغيير لون عيون الباركود.",
      rowNote: "طوقٌ وبؤبؤٌ بلونٍ غير لون الوحدات.",
      cardLabel: "لونٌ مستقلّ للعيون",
      cardOn: eyeTinted,
      setCardOn: setEyeTinted,
      rowOn: eyeTinted,
      setRowOn: setEyeTinted,
      shown: eyeTinted,
      fields: eyeFields,
    },
    {
      key: "logo",
      icon: <ImageSquare />,
      title: "الشعار في القلب",
      rowTitle: "شعارٌ في القلب",
      note: "شعارٌ يتوسّط الباركود، ويُفرَّغ ما تحته فلا يُربك القارئ.",
      rowNote: "شعارٌ يتوسّط الباركود، ويُفرَّغ ما تحته فلا يُربك القارئ.",
      cardLabel: "",
      cardOn: null,
      setCardOn: null,
      rowOn: logoOn,
      setRowOn: setLogoOn,
      shown: true,
      fields: logoFields,
    },
    {
      key: "frame",
      icon: <TextAa />,
      title: "الإطار والنداء",
      rowTitle: "إطارٌ ونداء",
      note: "طوقٌ حول الباركود وشريطُ نصٍّ يدعو إلى مسحه.",
      rowNote: "طوقٌ حول الباركود وشريطُ نصٍّ يدعو إلى مسحه.",
      cardLabel: "إطارٌ ونداء تحته",
      cardOn: framed,
      setCardOn: setFramed,
      rowOn: framed,
      setRowOn: setFramed,
      shown: framed,
      fields: frameFields,
    },
  ];

  /* ── الأوعية الثلاثة ─────────────────────────────────────────────────── */

  /** الحاليّ: خمسةُ كروتٍ متساوية، لكلٍّ رأسٌ وأيقونةٌ وحشو. */
  const shellCards = (
    <div className="flex flex-col gap-4">
      <SectionCard headerVariant="soft" icon={<Drop />} title="لون الباركود">{inkFields}</SectionCard>
      {opts.map((o) => (
        <SectionCard key={o.key} headerVariant="soft" icon={o.icon} title={o.title}>
          {o.cardOn === null ? (
            <div className="flex flex-col gap-3 items-start">{o.fields}</div>
          ) : (
            <>
              <Switch
                row
                label={o.cardLabel}
                description={o.note}
                checked={o.cardOn}
                onChange={(e) => o.setCardOn?.(e.target.checked)}
              />
              {o.shown ? <div className="mt-4 flex flex-col gap-4">{o.fields}</div> : null}
            </>
          )}
        </SectionCard>
      ))}
    </div>
  );

  /** بديل أ: كرتان. اللونُ قرارٌ مركّبٌ يبقى كرتَه، والأربعةُ صفوفٌ تنفتح في كرتٍ واحد. */
  const shellRows = (
    <div className="flex flex-col gap-4">
      <SectionCard headerVariant="soft" icon={<Drop />} title="لون الباركود">{inkFields}</SectionCard>
      <SectionCard headerVariant="soft" icon={<SlidersHorizontal />} title="الإضافات">
        {/* الفجوةُ تقول النسبَ حين لا يقوله إطار: بين المجموعات ٢٤ وداخلها ١٦، وما ينفتح
            يُزاح عن حافّة مفتاحه. وبلا ذلك يقف الحقلُ المفتوح على بُعدٍ واحدٍ من مفتاحه
            ومن المفتاح الذي تحته، فلا يُعرَف لأيّهما هو (رُئي على ٣٧٥ قبل الإصلاح). */}
        <div className="flex flex-col gap-6">
          {opts.map((o) => (
            <div key={o.key} className="flex flex-col gap-4">
              <Switch
                row
                label={o.rowTitle}
                description={o.rowNote}
                checked={o.rowOn}
                onChange={(e) => o.setRowOn(e.target.checked)}
              />
              {o.rowOn && o.shown ? (
                <div className={cn("flex flex-col gap-4 ps-4", o.key === "logo" && "items-start")}>{o.fields}</div>
              ) : null}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );

  /**
   * بديل ب: أكورديونٌ واحد بلا كروتٍ ألبتّة (ق١٢: الأكورديونُ سطحٌ مؤطَّرٌ فلا يُغلَّف بكرت)،
   * وطيّةٌ واحدةٌ مفتوحةٌ في كلّ حين. وثمنُه معروضٌ لا مخفيّ: يُفتَح على خمسة عناوينَ صامتة.
   */
  const shellAccordion = (
    <Accordion
      items={[
        { q: "لون الباركود", a: <div className="flex flex-col gap-4">{inkFields}</div> },
        ...opts.map((o) => ({
          q: o.title,
          a: (
            <div className="flex flex-col gap-4">
              {o.cardOn === null ? null : (
                <Switch
                  row
                  label={o.cardLabel}
                  description={o.note}
                  checked={o.cardOn}
                  onChange={(e) => o.setCardOn?.(e.target.checked)}
                />
              )}
              {o.shown ? <div className={cn("flex flex-col gap-4", o.key === "logo" && "items-start")}>{o.fields}</div> : null}
            </div>
          ),
        })),
      ]}
    />
  );

  const [refA, hA] = useHeight<HTMLDivElement>();
  const [refB, hB] = useHeight<HTMLDivElement>();
  const [refC, hC] = useHeight<HTMLDivElement>();

  const columns: { title: string; note: string; ref: React.RefObject<HTMLDivElement | null>; h: number; shell: ReactNode }[] = [
    {
      title: "الحاليّ: خمسةُ كروت",
      note: "كلُّ عضوٍ من الرمز كرتٌ برأسٍ وأيقونة. صادقٌ في التسمية، غالٍ في الوعاء: ثلاثةٌ منها مطفأةً كرتٌ حول مفتاحٍ واحد.",
      ref: refA, h: hA, shell: shellCards,
    },
    {
      title: "بديل أ: كرتان",
      note: "اللونُ يبقى كرتَه لأنّه قرارٌ مركّب، والأربعةُ الاختياريّةُ صفوفٌ في كرت «الإضافات» ينفتح كلٌّ منها تحت مفتاحه. والاسمُ ينتقل من رأس الكرت إلى المفتاح فيُثبَت ولا يُنفى.",
      ref: refB, h: hB, shell: shellRows,
    },
    {
      title: "بديل ب: أكورديون",
      note: "لا كرتَ ألبتّة، خمسةُ عناوينَ تُطوى وواحدٌ مفتوح. أخفُّ الثلاثة طولًا، وثمنُه أنّه يُفتَح صامتًا فلا تُرى ضابطةٌ حتى تُنقر.",
      ref: refC, h: hC, shell: shellAccordion,
    },
  ];

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, QR Cards</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">أوعيةُ ضوابط الباركود</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          الضوابطُ نفسُها في ثلاثة أوعية، وحالتُها مشتركة: غيّر لونًا أو افتح مفتاحًا فتتبدّل الثلاثةُ
          والرمزُ معًا. وتحت كلّ عمودٍ طولُه مقيسًا الآن، لأنّ السؤالَ في الجوّال سؤالُ طول.
        </p>
      </Container>

      <div className="mx-auto w-full max-w-[1320px] px-6">
        {/* الرمزُ لا يُمدّ على عرض الصفحة: ق٦ تملأ الصفَّ الناقصَ في **شبكة كروت**، وهذا
            كرتٌ واحدٌ خارجها محتواه مربّعٌ لا ينساب، فتمديدُه ينقل الفراغَ إلى جوفه. */}
        <div className="mx-auto mt-10 w-full max-w-[380px]">
          <SectionCard headerVariant="soft" icon={<Square />} title="الرمزُ الحيّ: واحدٌ للثلاثة">
            <div className="flex justify-center">
              {svg ? <QrPreview svg={svg} max={260} /> : null}
            </div>
          </SectionCard>
        </div>

        <div className="card-grid mt-6">
          {columns.map((c) => (
            <div key={c.title} className="flex flex-col">
              <h2 className="font-display text-xl font-black text-content">{c.title}</h2>
              <p className="fld-help mt-1">{c.note}</p>
              <p className="fld-help mt-2">
                طولُ العمود الآن{" "}
                <b className="font-latin" dir="ltr">{c.h}px</b>، وورقةُ المحرّر على الجوّال تُري منه{" "}
                <b className="font-latin" dir="ltr">{SHEET_VISIBLE}px</b>.
              </p>
              <div ref={c.ref} className="mt-4">{c.shell}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
