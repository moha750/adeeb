"use client";

import { useMemo, useState } from "react";
import { AngleDial, Container, PointPad, SectionCard } from "@adeeb/design-system";
import { color } from "@adeeb/design-system/tokens";
import { qrSvg, type Paint, type QrSpec } from "@/lib/qr";
import { QrPreview } from "../../dashboard/tools/qr/QrToolView";
import { SHAPE } from "../../dashboard/tools/qr/defaults";

/**
 * معرضُ **أدوات التدرّج** — قرصُ الاتّجاه ولوحُ مركز الوهج، على باركودٍ حيّ.
 *
 * العلّةُ أنّ اتّجاه التدرّج كان قائمةً بأربع كلمات، و«مائل معكوس» تُقرأ ثمّ تُترجَم في
 * الذهن إلى صورة. والراسمُ يقبل الزوايا كلَّها أصلًا (يحسبها بالجيب لا من قائمة)، فالقيدُ
 * كان في الواجهة وحدها.
 *
 * وعُرض هنا معهما مقترحان آخران للاتّجاه (لوحُ جهاتٍ ثمانيّ، ومزلقٌ برقم)، فاختار المالكُ
 * القرصَ ٢٠٢٦-٠٨-٢٢ وأُعدم المرفوضان. فما بقي في هذه الصفحة هو **المعتمَد** لا مقارنة.
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
          الاتّجاهُ <b>شكلٌ لا كلمة</b>، وكان أربعَ خاناتٍ مكتوبة («أفقيّ، رأسيّ، مائل، مائل
          معكوس»). فصار قرصًا يُدار، والزوايا كلُّها مفتوحة. وللشعاعيّ لوحٌ يُنقل به مركزُ
          الوهج بعد أن كان في القلب دائمًا.
        </p>
      </Container>

      <div className="mx-auto w-full max-w-[1320px] px-6">
        <div className="card-grid mt-12">
          <SectionCard headerVariant="soft" title="اتّجاه التدرّج الخطّيّ">
            <div className="flex flex-col items-center gap-3">
              <AngleDial value={angle} onValueChange={setAngle} aria-label="اتّجاه التدرّج" />
              <span className="fld-help">اسحب على القرص. يلتقط كلَّ ١٥ درجة، ومع Shift درجةً درجة، والأسهمُ تقوده من لوحة المفاتيح.</span>
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
            <div className="mt-4 flex justify-center">
              <PointPad x={cx} y={cy} onChange={(x, y) => { setCx(x); setCy(y); }} preview={padBg} aria-label="مركز التدرّج" />
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
