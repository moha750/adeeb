"use client";

import { useMemo, useState } from "react";
import { AngleDial, Container, DirectionPad, PointPad, RangeField, SectionCard } from "@adeeb/design-system";
import { color } from "@adeeb/design-system/tokens";
import { qrSvg, type Paint, type QrSpec } from "@/lib/qr";
import { QrPreview } from "../../dashboard/tools/qr/QrToolView";
import { SHAPE } from "../../dashboard/tools/qr/defaults";

/**
 * معرضُ **أدوات التدرّج** — ثلاثُ أدواتٍ للاتّجاه ورابعةٌ لمركز الشعاعيّ، تُجرَّب على
 * باركودٍ حيّ.
 *
 * العلّةُ أنّ اتّجاه التدرّج كان قائمةً بأربع كلمات، و«مائل معكوس» تُقرأ ثمّ تُترجَم في
 * الذهن إلى صورة. والراسمُ يقبل الزوايا كلَّها أصلًا (يحسبها بالجيب لا من قائمة)، فالقيدُ
 * كان في الواجهة وحدها.
 *
 * **والأدواتُ الثلاثُ تقود زاويةً واحدة**: أدِر القرصَ فيتحرّك المزلقُ وتُضيء خانةُ اللوح،
 * والباركودُ فوقها يتبدّل. فالحكمُ على **إحساس الأداة** لا على مخرَجها، إذ مخرجُها واحد.
 */

const INK = color.navy[700];
const INK2 = color.semantic.warning;

function spec(paint: Paint): QrSpec {
  return {
    text: "https://adeeb.club/q/d3m9qk4",
    size: 512,
    dots: { shape: SHAPE.dots, paint },
    eye: { shape: SHAPE.eye, color: null },
    pupil: { shape: SHAPE.pupil, color: null },
    bg: "#ffffff",
    logo: null,
    frame: null,
  };
}

export default function GradientLab() {
  const [angle, setAngle] = useState(135);
  const [cx, setCx] = useState(0.3);
  const [cy, setCy] = useState(0.3);

  const linear = useMemo(
    () => qrSvg({ ...spec({ kind: "linear", from: INK, to: INK2, angle }), size: 300 }),
    [angle],
  );
  const radial = useMemo(
    () => qrSvg({ ...spec({ kind: "radial", from: INK, to: INK2, cx, cy }), size: 300 }),
    [cx, cy],
  );
  // خلفيّةُ لوح النقطة: التدرّجُ نفسُه بحبره، فما تحت الإصبع هو ما سيخرج
  const padBg = `radial-gradient(circle at ${(cx * 100).toFixed(0)}% ${(cy * 100).toFixed(0)}%, ${INK}, ${INK2})`;

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Gradient Controls</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">أدواتُ التدرّج</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          الاتّجاهُ <b>شكلٌ لا كلمة</b>، وكان أربعَ خاناتٍ مكتوبة. وهذه ثلاثُ أدواتٍ تقود
          الزاويةَ نفسَها: أدِر واحدةً فترى الأخريين والباركودَ يتبعنها. والحكمُ على إحساس
          الأداة لا على مخرجها، فمخرجُها واحد.
        </p>
      </Container>

      <div className="mx-auto w-full max-w-[1320px] px-6">
        <div className="card-grid mt-12">
          <SectionCard headerVariant="soft" title="الاتّجاه: ثلاثُ أدواتٍ لزاويةٍ واحدة">
            <div className="flex flex-wrap items-start gap-8">
              <div className="flex flex-col items-center gap-3">
                <span className="text-sm font-bold text-content-muted">أ: قرصٌ يُدار</span>
                <AngleDial value={angle} onValueChange={setAngle} aria-label="اتّجاه التدرّج" />
                <span className="fld-help">اسحب على القرص. يلتقط كلَّ ١٥ درجة، ومع Shift درجةً درجة.</span>
              </div>

              <div className="flex flex-col items-center gap-3">
                <span className="text-sm font-bold text-content-muted">ب: لوحُ جهات</span>
                <DirectionPad value={angle} onValueChange={setAngle} aria-label="اتّجاه التدرّج" />
                <span className="fld-help">ثماني جهاتٍ بنقرة، بلا تصويب.</span>
              </div>

              <div className="min-w-[240px] flex-1">
                <span className="text-sm font-bold text-content-muted">ج: مزلقٌ برقم</span>
                <div className="mt-3">
                  <RangeField value={angle} onValueChange={setAngle} min={0} max={359} step={1} unit="°" />
                </div>
                <span className="fld-help">دقّةُ درجةٍ واحدة، وأضعفُها بيانًا: رقمٌ لا يقول شكلًا.</span>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <QrPreview svg={linear} max={300} />
            </div>
          </SectionCard>

          <SectionCard headerVariant="soft" title="مركزُ التدرّج الشعاعيّ">
            <p className="fld-help">
              كان الوهجُ في القلب دائمًا. واللوحُ يحرّكه إلى أيّ موضع، وخلفيّتُه التدرّجُ نفسُه
              فما تحت إصبعك هو ما سيخرج.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-8">
              <PointPad x={cx} y={cy} onChange={(x, y) => { setCx(x); setCy(y); }} preview={padBg} aria-label="مركز التدرّج" />
              <div className="flex-1 min-w-[220px] flex flex-col gap-3">
                <RangeField label="الأفقيّ" value={cx * 100} onValueChange={(v) => setCx(v / 100)} min={0} max={100} unit="%" />
                <RangeField label="الرأسيّ" value={cy * 100} onValueChange={(v) => setCy(v / 100)} min={0} max={100} unit="%" />
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <QrPreview svg={radial} max={300} />
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
