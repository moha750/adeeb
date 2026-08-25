"use client";

import { useMemo, useState } from "react";
import { ColorField, Container, Field, SectionCard, Segmented } from "@adeeb/design-system";
import { color } from "@adeeb/design-system/tokens";
import { TextAa } from "@phosphor-icons/react";
import { qrSvg, type QrFramePlace, type QrFrameStyle, type QrSpec } from "@/lib/qr";
import { QrPreview } from "../../dashboard/tools/qr/QrToolView";
import { SHAPE } from "../../dashboard/tools/qr/defaults";

/**
 * معرضُ **هيئات الإطار** — ثلاثةُ أشكالٍ وموضعان، على باركودٍ حيّ.
 *
 * الإطارُ كان هيئةً واحدة (طوقٌ وشريطٌ تحته)، فعُرضت خمسٌ ٢٠٢٦-٠٨-٢٥ ورُدّت منها الزوايا
 * المفتوحة والفقاعتان المزدوجتان. **واعتُمدت الثلاثُ الباقية في المحرّر** يومَها، فصارت
 * هذه الصفحةُ توثيقًا لِما نزل لا مقارنةً تنتظر قرارًا.
 *
 * وبقي **شكلٌ يُختار وموضعٌ يُختار**: سؤالان لا سؤالٌ واحد، فلا تتضاعف الأشكالُ بعدد
 * المواضع كلّما زِيد موضعٌ أو شكل.
 */

const STYLES: { style: QrFrameStyle; title: string; note: string }[] = [
  { style: "band", title: "طوقٌ وشريطُ نداء", note: "بطاقةٌ تُقصّ: إطارٌ يحيط بالباركود وشريطٌ يحمل النداء." },
  { style: "ring", title: "طوقٌ بلا نداء", note: "حدٌّ نظيفٌ يفصله عن الورقة، بلا كلمة. والموضعُ لا يعنيه." },
  { style: "bubble", title: "فقاعةُ كلام", note: "فقاعةٌ بذيلٍ تشير إلى الباركود، وتعوم بلا بطاقةٍ تحتها." },
];

export default function QrFramesLab() {
  const [caption, setCaption] = useState("امسح الباركود");
  const [place, setPlace] = useState<QrFramePlace>("bottom");
  const [ink, setInk] = useState<string>(color.navy[700]);
  const [text, setText] = useState("#ffffff");

  const specs = useMemo(() => {
    const base: Omit<QrSpec, "frame"> = {
      text: "https://adeeb.club/q/d3m9qk4",
      size: 300,
      dots: { shape: SHAPE.dots, paint: { kind: "solid", color: color.navy[700] } },
      eye: { shape: SHAPE.eye, color: null },
      pupil: { shape: SHAPE.pupil, color: null },
      bg: "#ffffff",
      logo: null,
    };
    // الفقاعةُ تُعرض بلا أرضيّة: علامةٌ تعوم على تصميمٍ لا بطاقةٌ تُقصّ، فعرضُها على مربّعٍ
    // أبيض يكذب على ناظرها (المالك ٢٠٢٦-٠٨-٢٥).
    return STYLES.map((s) => ({
      ...s,
      svg: qrSvg({
        ...base,
        bg: s.style === "bubble" ? null : base.bg,
        frame: { color: ink, caption, textColor: text, style: s.style, place },
      }),
    }));
  }, [caption, ink, text, place]);

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, QR Frames</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">هيئاتُ الإطار</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          الإطارُ يُلبِس الباركودَ ثوبًا ويدعو إلى مسحه. وهذه ثلاثةُ أشكالٍ وموضعان: غيّر
          النداءَ والموضعَ واللونين أعلاه فتتبدّل الثلاثةُ معًا، وانظر أيَّها يُشبهنا.
        </p>
      </Container>

      <div className="mx-auto w-full max-w-[1320px] px-6">
        <div className="card-grid mt-10">
          <SectionCard headerVariant="soft" icon={<TextAa />} title="جرّبها بنصّك ولونك">
            <Field
              label="نصّ النداء"
              icon={<TextAa />}
              innerIcon={<TextAa />}
              placeholder="امسح الباركود"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              helper="اتركه فارغًا فيبقى الطوق بلا شريط."
              optional
            />
            <div className="mt-4 flex flex-col gap-4">
              {/* الموضعُ سؤالٌ مستقلٌّ عن الشكل: فوق أو تحت، واحدٌ لا اثنان */}
              <Segmented
                wide
                aria-label="موضع النداء"
                items={[{ value: "bottom", label: "النداءُ تحت" }, { value: "top", label: "النداءُ فوق" }]}
                value={place}
                onValueChange={(v) => setPlace(v as QrFramePlace)}
              />
              <ColorField label="لون الإطار" icon={<TextAa />} value={ink} onValueChange={setInk} />
              <ColorField label="لون النصّ" icon={<TextAa />} value={text} onValueChange={setText} />
            </div>
          </SectionCard>
        </div>

        <div className="card-grid mt-6">
          {specs.map((s) => (
            <SectionCard key={s.style} headerVariant="soft" title={s.title}>
              <div className="flex justify-center">
                <QrPreview svg={s.svg} max={300} />
              </div>
              <p className="fld-help mt-3">{s.note}</p>
            </SectionCard>
          ))}
        </div>
      </div>
    </main>
  );
}
