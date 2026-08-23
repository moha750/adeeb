"use client";

import { useState } from "react";
import { Button, Container, Segmented } from "@adeeb/design-system";
import { FloppyDisk } from "@phosphor-icons/react";
import { Trash, UploadSimple } from "@/app/_components/glyphs";

/**
 * معرضُ صفِّ الأزرار — **شاهدٌ على قانونٍ نازل، لا مقترحٌ ينتظر**.
 *
 * القاعدةُ (قرار المالك ٢٠٢٦-٠٨-٢١ · ق١٦): الزرُّ لا يترك في صفّه خلاءً — واحدٌ يمتدّ في
 * كلّ العروض، واثنان يقتسمان الصفَّ ثمّ ينزل أحدهما تحت الآخر حين يضيق.
 *
 * والعرضُ هنا **بحاويةٍ لا بشاشة**: المبدّلُ يضيّق الصندوقَ نفسَه، فيقع النزولُ أمام عينك
 * على الحاسوب كما يقع في جوّالٍ عرضُه ‎375 — لأنّ القانونَ يقيس الحاويةَ لا النافذة (ق١٥).
 */

const WIDTHS = [
  { value: "375", label: "٣٧٥" },
  { value: "560", label: "٥٦٠" },
  { value: "900", label: "٩٠٠" },
];

function Frame({ w, title, note, children }: { w: string; title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-1 font-display text-2xl font-black text-content">{title}</h2>
      <p className="mb-3 max-w-2xl text-sm text-content-muted">{note}</p>
      <div
        className="rounded border border-line bg-surface-2 p-4"
        style={{ width: "100%", maxWidth: Number(w) }}
      >
        {children}
      </div>
    </section>
  );
}

export default function ButtonRowLab() {
  const [w, setW] = useState("375");

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Button Row</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">صفُّ الأزرار</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          الزرُّ لا يترك في صفّه خلاءً: إن انفرد ملأه، وإن كانا اثنين اقتسماه بالسويّة ثمّ نزل
          أحدهما تحت الآخر حين يعجز الصفُّ عنهما. والنزولُ بلا استعلامِ وسائط: أساسُ الزرّ
          <span className="font-latin" dir="ltr"> --btn-row-min </span>
          وحدَه يقرّره، فيصدُق في نافذةٍ ضيّقةٍ على سطح المكتب كما يصدُق في الجوّال.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض الحاوية" />
          <span className="text-sm text-content-muted">عرضُ الحاوية بالبكسل</span>
        </div>

        <Frame w={w} title="زرٌّ واحد" note="ينفرد بالصفّ فيملؤه — في كلّ العروض، لا في الجوّال وحده.">
          <div className="btn-row">
            <Button variant="primary"><FloppyDisk size={18} />حفظ التغييرات</Button>
          </div>
        </Frame>

        <Frame w={w} title="زرّان" note="يقتسمان الصفَّ بالسويّة، وينزل أحدهما تحت الآخر حين لا يتّسع أساسان وفجوة.">
          <div className="btn-row">
            <Button variant="ghost">إلغاء</Button>
            <Button variant="primary">اعتماد</Button>
          </div>
        </Frame>

        <Frame w={w} title="زرّان مختلفا النغمة" note="الشرطُ عددُ الأزرار لا نغمتُها: صفُّ الرفع والإزالة يقع تحت القانون نفسه.">
          <div className="btn-row">
            <Button variant="ghost"><UploadSimple size={18} />تغيير الصورة</Button>
            <Button variant="ghost-danger"><Trash size={18} />إزالة</Button>
          </div>
        </Frame>

        <Frame w={w} title="ثلاثة" note="تملأ سطرَها بالسويّة كذلك — الحكمُ واحدٌ لا يتبدّل بعدد الساكنين.">
          <div className="mdl-foot">
            <Button variant="ghost">إغلاق</Button>
            <Button variant="ghost-danger">رفض</Button>
            <Button variant="primary">اعتماد</Button>
          </div>
        </Frame>

        <Frame w={w} title="أربعة" note="وإذا ضاق السطرُ التفّت وملأ كلُّ سطرٍ نفسَه: أربعةٌ في ٣٧٥ تصير اثنين واثنين. وسقفُ الصفّ أربعة، والخامسُ يذهب إلى قائمة الإجراءات.">
          <div className="mdl-foot">
            <Button variant="ghost">إغلاق</Button>
            <Button variant="ghost-danger">رفض</Button>
            <Button variant="ghost-warning">طلب تعديل</Button>
            <Button variant="primary">اعتماد</Button>
          </div>
        </Frame>

        <section className="mt-16">
          <h2 className="mb-2 font-display text-2xl font-black text-content">القاعدةُ المطبَّقة</h2>
          <p className="max-w-2xl text-sm text-content-muted">
            مكتوبةٌ مرّةً في
            <span className="font-latin" dir="ltr"> components.css </span>
            كقانون اللمس: من أضاف صفَّ أزرارٍ جديدًا ألبسه
            <span className="font-latin" dir="ltr"> .btn-row </span>
            أو أضاف محدِّدَه إلى القائمة، ولا ينسخ القاعدة إلى تعريف مكوّنه.
          </p>
          <pre className="mt-4 max-w-2xl overflow-x-auto rounded border border-line bg-surface-2 p-4 text-start font-latin text-sm" dir="ltr">
{`:where(.btn-row, .mdl-foot, .acard-foot-row, .blt-bar, .opp-act) {
  display: flex; flex-wrap: wrap; gap: 10px; width: 100%;
  --btn-row-min: 10.5rem;
}
/* الأساس، وهي حالُ الثلاثة فأكثر */
… > .abtn { flex: 1 1 auto; }
/* واحد */
… > .abtn:only-child { flex: 1 1 100%; }
/* اثنان */
…:has(> .abtn:first-child + .abtn:last-child) > .abtn {
  flex: 1 1 var(--btn-row-min); min-width: 0;
}`}
          </pre>
        </section>
      </Container>
    </main>
  );
}
