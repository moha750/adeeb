"use client";

/**
 * **تصميمُ الباركود على «المنضدة»** (قالبُ «مساحة العمل»، ٢٠٢٦-١١-١٦ — لم يُعتمد بعد، مختبرُه `/dashboard/ad/qr-design`).
 * كان `QrToolView`: رأسٌ قديم، وخمسةُ كروتٍ بمبدّلاتٍ (`Segmented`) ومفاتيحَ (`Switch`) من الهويّة القديمة، والمعاينةُ كرتٌ لاصق، وفي الجوّال
 * ورقةٌ تُسحب بمقبضها فوق الرمز. فصار:
 * - **الضوابطُ أقسامُ النموذج** (`FormSection`): اللون، والخلفيّة، والعيون، والشعار، والإطارُ والنداء — والاختيارُ بين بابين مبدّلُ رأس القسم
 *   (`FormChoice`، كـ«رابط / ملف» في الباركود الجديد)، والمفتاحُ مفتاحُ البئر (`FormToggle`)، والشعارُ حقلُ الرفع المعتمد مربّعًا.
 * - **المنضدةُ الباركودُ نفسُه** كما يُحمَّل، وتحته «حفظ التصميم» و«تحميلها كصورة» بصيغتيها في قائمةٍ واحدة (أمرُ المالك ٢٠٢٦-٠٨-٢٥).
 * - **وفي الجوّال يبقى الباركودُ صغيرًا فوق الضوابط** وهي تُمرَّر، فيُرى أثرُ كلّ لونٍ ساعةَ يُختار بلا تنقّلٍ إلى «المعاينة».
 *
 * **السلوكُ سلوكُ القديم حرفًا** (`tools/qr/useQrDesign`): المواصفةُ نفسُها، والحفظُ التلقائيُّ المصفوفُ بمهلته وسقفه، والحفظُ عند المغادرة،
 * والتنزيلان، وتصغيرُ الشعار، وشعارُ أدِيب من أصول العلامة.
 */
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AngleDial, ColorField, Field, PointPad } from "@adeeb/design-system";
import { Drop, Globe, ImageSquare, PaintBucket, Sparkle, Square, TextAa } from "@phosphor-icons/react";
import { Check, Eye } from "@/app/_components/glyphs";
import type { QrFramePlace, QrFrameStyle } from "@/lib/qr";
import { qrBacking } from "@/lib/qrBacking";
import type { QrSpecSaver } from "@/app/dashboard/tools/qr/QrToolView";
import type { QrLinkRow } from "@/app/dashboard/tools/qr/data";
import { BRAND_LOGO, QR_LOGO_RULE, useQrDesign } from "@/app/dashboard/tools/qr/useQrDesign";
import { AdButton, AdNote } from "../primitives";
import { FormChoice, FormSection, FormToggle } from "../form";
import { AdUpload } from "../upload";
import { WorkRoom } from "../workspace";

const PAINTS = [{ value: "solid", label: "لون موحّد" }, { value: "gradient", label: "لون متدرّج" }];
const GRADS = [{ value: "linear", label: "خطّيّ" }, { value: "radial", label: "شعاعيّ" }];
const FRAMES = [{ value: "band", label: "طوقٌ وشريط" }, { value: "ring", label: "طوقٌ فقط" }, { value: "bubble", label: "فقاعة" }];
const PLACES = [{ value: "bottom", label: "النداءُ تحت" }, { value: "top", label: "النداءُ فوق" }];

/** الباركودُ مرسومًا مُدرَجًا في الصفحة (يرث خطَّها فيظهر النداءُ بخطّه الحقيقيّ) — هو ما يُحمَّل حرفًا */
function QrShot({ svg, small, back }: { svg: string; small?: boolean; back: "light" | "clear" }) {
  // **معرّفُ التدرّج لكلّ رسمةٍ وحدها** (المراجع ٢٠٢٦-١١-١٦): `qrSvg` يسمّيه `qg` دائمًا، والغرفةُ ترسم الباركودَ مرّتين (الصغيرُ في الجوّال والمنضدة)،
  // فكانت نقاطُ المنضدة تشير إلى تدرّج الصغير المخفيّ في الحاسوب فلا تُرسم — والتنزيلُ لا يمرّ من هنا فيبقى معرّفُه كما هو
  const uid = `qg${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const html = svg.split('id="qg"').join(`id="${uid}"`).split("url(#qg)").join(`url(#${uid})`);
  return <div className="ad-qrd-shot" data-back={back} data-small={small || undefined} role="img" aria-label="معاينة الباركود" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function QrDesignRoom({ link, onSaveSpec, done, fresh }: {
  link: QrLinkRow; onSaveSpec: QrSpecSaver;
  /** **إلى أين «تمّ»**: بيتُ الباركود (صفحتُه) — فلا ينتهي التصميمُ بزرّ تحميلٍ لا خطوةَ بعده (محمد ٢٠٢٦-١١-١٦: «ثمّ ماذا؟ أين يذهب؟») */
  done: string;
  /** وصل من «باركود جديد»: التصميمُ خطوتُه الأخيرة، فيقولها، و«تمّ» تنتهي إلى «جاهز» */
  fresh?: boolean;
}) {
  const d = useQrDesign({ code: link.code, title: link.title, initial: link.spec, onSaveSpec });
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  // «تمّ» يكتب ما لم يُكتب ثمّ يمضي (الحفظُ التلقائيُّ ينتظر ثانيةً ونصفًا من السكون، فلا يُترك تعديلُ اللحظة الأخيرة للمغادرة)
  const finish = async () => {
    setLeaving(true);
    if (d.dirty) await d.saveDesign(true);
    router.push(done);
  };

  // **لا «حفظ» ولا «تحميل» هنا** (محمد ٢٠٢٦-١١-١٦): الحفظُ تلقائيٌّ فزرُّه سؤالٌ بلا معنى، والتحميلُ في بيت الباركود حيث يُرى ويُنسخ رابطُه —
  // فالفعلُ الواحدُ «تمّ» إليه، وحالُ الحفظ سطرٌ هادئٌ تحته (محمد ٢٠٢٦-١١-١٧: بجانبه كان يزاحم الزرّ، «إما يكون تحت أو يزال»)
  const state = d.saving || leaving ? "يُحفظ تصميمُك…" : d.dirty ? "يُحفظ بعد لحظة" : "حُفظ تصميمُك";
  const save = (
    <AdButton variant="fill" icon={<Check />} busy={leaving} onClick={() => void finish()}>{fresh ? "تمّ، الباركود جاهز" : "تمّ"}</AdButton>
  );
  // بلا `role="status"`: الحفظُ يتبدّل مع كلّ لمسة، فكان قارئُ الشاشة يقاطع العملَ بثلاث جملٍ متعاقبة (المراجع ٢٠٢٦-١١-١٧)
  const download = <span className="ad-qrd-state">{state}</span>;

  // **الموقوفُ يُقال في غرفة تصميمه** (٢٠٢٦-٠٩-٠٥): يُصمَّم ويُطبَع وهو يقود ماسحَه إلى «غير متاح»
  const lead = (
    <>
      {fresh ? (
        <AdNote tone="info" title="الخطوة الأخيرة: شكله">اختر لونه وشعاره وإطاره، أو اتركه بشكل أدِيب، ثمّ «تمّ».</AdNote>
      ) : null}
      {link.active ? null : (
        <AdNote tone="warn" title="الباركود موقوف">
          تصميمُك يُحفَظ، لكنّ من يمسحه الآن يرى صفحةً تقول إنّه غير متاح. تشغيلُه من صفحة الباركود.
        </AdNote>
      )}
      {/* الجوّال: الباركودُ صغيرًا لاصقًا فوق الضوابط، وفعلاه بجانبه */}
      <div className="ad-qrd-mini">
        {d.preview.svg ? <QrShot svg={d.preview.svg} small back={qrBacking(d.spec)} /> : <AdNote tone="warn" title="تعذّر توليد الباركود">{d.preview.error}</AdNote>}
        <span className="ad-qrd-mini-acts">{save}{download}</span>
      </div>
    </>
  );

  // «شعار أدِيب» يغيب بنقره (صار هو المختار)، فيُنقل التركيزُ إلى «تغيير» في صفّه لا إلى أوّل الصفحة (المراجع ٢٠٢٦-١١-١٧)
  const logoBox = useRef<HTMLDivElement>(null);
  const brandFocus = useRef(false);
  useEffect(() => {
    if (!brandFocus.current || d.logoName !== BRAND_LOGO) return;
    brandFocus.current = false;
    logoBox.current?.querySelector<HTMLElement>(".ad-up-acts .ad-btn")?.focus();
  }, [d.logoName]);

  const editing = (
    <>
      <FormSection id="ink" icon={<Drop />} title="لون الباركود" sub={d.gradient ? "لونان يتدرّج أحدُهما إلى الآخر" : "لونٌ واحدٌ للنقاط كلّها"}
        act={<FormChoice label="نوع اللون" items={PAINTS} value={d.gradient ? "gradient" : "solid"} onChange={(v) => d.setGradient(v === "gradient")} />}>
        <div className="form-grid">
          <ColorField className="form-full" label={d.gradient ? "اللون الأوّل" : "اللون"} icon={<Drop />} value={d.ink} onValueChange={d.setInk} required />
          {d.gradient ? (
            <>
              <ColorField className="form-full" label="اللون الثاني" icon={<Sparkle />} value={d.ink2} onValueChange={d.setInk2} required />
              <div className="form-full ad-qrd-grad">
                <span className="ad-qrd-k">نوع التدرّج</span>
                <FormChoice label="نوع التدرّج" items={GRADS} value={d.gradKind} onChange={(v) => d.setGradKind(v as "linear" | "radial")} />
                {/* القرصُ مكانَ أربع كلمات، والوهجُ موضعٌ يُسحب لا رقمان (اختيارا المالك ٢٠٢٦-٠٨-٢٢) */}
                <div className="ad-qrd-dial">
                  {d.gradKind === "linear" ? (
                    <AngleDial value={d.angle} onValueChange={d.setAngle} aria-label="اتّجاه التدرّج" />
                  ) : (
                    <PointPad x={d.cx} y={d.cy} onChange={(x, y) => { d.setCx(x); d.setCy(y); }}
                      preview={`radial-gradient(circle at ${(d.cx * 100).toFixed(0)}% ${(d.cy * 100).toFixed(0)}%, ${d.ink}, ${d.ink2})`} aria-label="مركز الوهج" />
                  )}
                  <span className="ad-qrd-k">{d.gradKind === "linear" ? "اتّجاه التدرّج: اسحب القرص" : "مركز الوهج: اسحب النقطة"}</span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </FormSection>

      <FormSection id="bg" icon={<PaintBucket />} title="الخلفيّة">
        <div className="form-grid">
          <FormToggle className="form-full" icon={<PaintBucket />} label="خلفيّة" checked={d.hasBg} onChange={d.setHasBg}
            description="بإطفائها يخرج الباركود شفّافًا ليوضع على التصاميم." />
          {d.hasBg ? <ColorField className="form-full" label="لون الخلفيّة" icon={<PaintBucket />} value={d.bg} onValueChange={d.setBg} /> : null}
        </div>
      </FormSection>

      <FormSection id="eyes" icon={<Eye />} title="العيون" sub="المربّعاتُ الثلاثةُ في زواياه">
        <div className="form-grid">
          <FormToggle className="form-full" icon={<Eye />} label="لونٌ مستقلّ للعيون" checked={d.eyeTinted} onChange={d.setEyeTinted}
            description="تستطيع تغيير لون عيون الباركود." />
          {d.eyeTinted ? (
            <>
              <ColorField label="لون الطوق" icon={<Eye />} value={d.eyeColor} onValueChange={d.setEyeColor} />
              <ColorField label="لون البؤبؤ" icon={<Eye />} value={d.pupilColor} onValueChange={d.setPupilColor} />
            </>
          ) : null}
        </div>
      </FormSection>

      {/* **الشعار** (محمد ٢٠٢٦-١١-١٧: «لماذا هذه المساحة الفارغة؟ لماذا لا يمتد حقل الرفع؟… زر شعار أديب… ألا يوجد مكان أفضل؟»):
          كان مربّعَ إفلاتٍ بثلث العرض وتحته زرٌّ وحيد. فصار منطقةً بعرض القسم، وحين يُختار شعارٌ صفًّا بعرضه فيه الشعارُ مصغّرًا واسمُه
          وفعلاه (والباركودُ نفسُه معاينتُه، فلا صورةَ ثانيةً تحته)، و«شعار أدِيب» بابٌ ثانٍ في رأس القسم كمبدّل «لون موحّد / متدرّج» */}
      <FormSection id="logo" icon={<ImageSquare />} title="الشعار في القلب" sub="في منتصف الباركود"
        act={d.logoName === BRAND_LOGO ? undefined : (
          <AdButton variant="line" size="sm" icon={<Sparkle />} onClick={() => { brandFocus.current = true; void d.pickBrandLogo(); }}>{BRAND_LOGO}</AdButton>
        )}>
        <div className="ad-qrd-logo" ref={logoBox}>
          <AdUpload bare={!d.logo} label="الشعار" icon={<ImageSquare />} whole value={d.logo} accept={QR_LOGO_RULE.accept} alt="الشعار المختار"
            // eslint-disable-next-line @next/next/no-img-element
            file={d.logo ? { name: d.logoName ?? "الشعار المحفوظ", meta: "", icon: <img src={d.logo} alt="" /> } : null}
            onFile={d.pickLogo} onClear={d.logo ? d.clearLogo : undefined} error={d.logo ? undefined : d.logoError ?? undefined}
            help={d.logo ? undefined : "ارفع شعارك، أو خذ شعار أدِيب من رأس القسم."} />
        </div>
        {/* **خبرُ رفض الشعار يُقال في موضعه** وفيه شعارٌ قائم: الصفُّ بلا وصف، فكان الرفضُ يضيع (المراجع). والقبولُ يقوله اسمُه في الصفّ */}
        {d.logo && d.logoError ? <AdNote tone="bad" title="تعذّر استعمال الشعار">{d.logoError}</AdNote> : null}
      </FormSection>

      <FormSection id="frame" icon={<TextAa />} title="الإطار والنداء" sub="طوقٌ حول الباركود وشريطُ نصٍّ يدعو إلى مسحه">
        <div className="form-grid">
          <FormToggle className="form-full" icon={<Square />} label="إطارٌ ونداء" checked={d.framed} onChange={d.setFramed}
            description={d.framed ? "يُطبع الطوقُ والنداءُ مع الباركود." : "بلا إطار: الباركودُ وحده."} />
          {d.framed ? (
            <>
              {/* الشكلُ والموضعُ سؤالان لا سؤالٌ واحد (معرضُهما `/ui/qr-frames`) */}
              <div className="form-full ad-qrd-grad">
                <span className="ad-qrd-k">شكل الإطار</span>
                <FormChoice label="شكل الإطار" items={FRAMES} value={d.frameStyle} onChange={(v) => d.setFrameStyle(v as QrFrameStyle)} />
              </div>
              {d.frameStyle !== "ring" ? (
                <>
                  <div className="form-full ad-qrd-grad">
                    <span className="ad-qrd-k">موضع النداء</span>
                    <FormChoice label="موضع النداء" items={PLACES} value={d.framePlace} onChange={(v) => d.setFramePlace(v as QrFramePlace)} />
                  </div>
                  <Field className="form-full" label="نصّ النداء" icon={<TextAa />} innerIcon={<Globe />} placeholder="امسح الباركود" value={d.caption}
                    onChange={(e) => d.setCaption(e.target.value)} helper="اتركه فارغًا فيبقى الطوق بلا شريط." optional />
                </>
              ) : null}
              <ColorField label="لون الإطار" icon={<Square />} value={d.frameColor} onValueChange={d.setFrameColor} />
              <ColorField label="لون النصّ" icon={<TextAa />} value={d.captionColor} onValueChange={d.setCaptionColor} />
            </>
          ) : null}
        </div>
      </FormSection>
    </>
  );

  const stage = (
    <div className="ad-qrd-stage">
      {d.preview.error ? (
        <AdNote tone="warn" title="تعذّر توليد الباركود">{d.preview.error}</AdNote>
      ) : d.preview.svg ? <QrShot svg={d.preview.svg} back={qrBacking(d.spec)} /> : null}
      <span className="ad-qrd-acts">{save}{download}</span>
      <p className="ad-qrd-k">ما تراه هو ما يُطبع، ويُحفظ تصميمُك تلقائيًّا وأنت تعمل. وتُحمّله من صفحة الباركود.</p>
    </div>
  );

  return (
    <WorkRoom look="b" path="/dashboard/tools/qr" title={link.title} stage={stage} stageTitle="الباركود كما يُحمَّل" lead={lead}>
      {editing}
    </WorkRoom>
  );
}
