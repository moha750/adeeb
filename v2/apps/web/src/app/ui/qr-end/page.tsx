"use client";

import { Button, Card, CardBody, Container, SectionCard } from "@adeeb/design-system";
import { Pause } from "@phosphor-icons/react";
import { Prohibit, Trash, Warning } from "@/app/_components/glyphs";

/**
 * **مختبرُ ذيل صفحة الإحصاء** — أين يقف فعلا الإيقاف والحذف، وبأيّ هيئة.
 *
 * العلّةُ بكلمة المالك ٢٠٢٦-٠٨-٣١: «مدري ليه مو مقتنع بالحلّ، أحسّه ليس جميلًا بصريًّا».
 * فالمسألةُ ذوقٌ يُنظَر لا يُشرَح، وهذه أربعُ هيئاتٍ بالمكوّنات نفسِها وبنصوصها الحقيقيّة،
 * تُقرأ على ٣٧٥ وعلى العرض الواسع معًا.
 */

const STOP =
  "من يمسحه بعد الإيقاف يرى صفحةً تقول إنّه غير متاح، والملصقاتُ المطبوعةُ تبقى صالحة، فتُعيد تشغيلَه متى شئت.";
const KILL = "يذهب الباركود ومسحاتُه كلُّها بلا رجعة، وكلُّ ملصقٍ مطبوعٍ يحمله يصير رمزًا ميّتًا.";

/** أ · كرتٌ معنونٌ وصفّان: نصُّ الأثر يمينًا وزرُّه يسارًا (الهيئةُ القائمة اليوم). */
function ShapeA() {
  return (
    <SectionCard headerVariant="soft" icon={<Prohibit />} title="إيقافُ الباركود أو حذفُه">
      <div className="setl">
        <div className="viewbar">
          <span>
            <b>إيقاف الباركود</b>
            <span className="fld-help"> {STOP}</span>
          </span>
          <Button variant="neutral" size="md"><Pause /> أوقف الباركود</Button>
        </div>
        <div className="viewbar">
          <span>
            <b>حذف الباركود</b>
            <span className="fld-help"> {KILL}</span>
          </span>
          <Button variant="ghost-danger" size="md"><Trash /> حذف الباركود</Button>
        </div>
      </div>
    </SectionCard>
  );
}

/** ب · بلا كرت: خطٌّ يفصل ذيلَ الصفحة، وزرّان مفرّغان هادئان تحته. */
function ShapeB() {
  return (
    <div>
      <div className="btn-row">
        <Button variant="ghost" size="md"><Pause /> أوقف الباركود</Button>
        <Button variant="ghost-danger" size="md"><Trash /> حذف الباركود</Button>
      </div>
      <p className="fld-help mt-2">الإيقافُ يُبطل التوصيل ويُستأنَف، والحذفُ لا رجعةَ فيه.</p>
    </div>
  );
}

/** ج · كرتٌ منغَّمٌ بلا رأس: أيقونةُ تنبيهٍ وسطرٌ واحدٌ يجمع الأثرين، وزرّان في ذيله. */
function ShapeC() {
  return (
    <Card tone="danger">
      <CardBody>
        <div className="flex items-start gap-3">
          <span className="acard-chip shrink-0"><Warning /></span>
          <div className="min-w-0">
            <b className="txt">آخرُ ما يُفعَل بالباركود</b>
            <p className="fld-help mt-1">
              الإيقافُ يمنع التوصيل ويبقى الملصقُ صالحًا، والحذفُ يذهب بالباركود ومسحاتِه بلا رجعة.
            </p>
            <div className="btn-row mt-3">
              <Button variant="neutral" size="md"><Pause /> أوقف الباركود</Button>
              <Button variant="ghost-danger" size="md"><Trash /> حذف الباركود</Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/** د · لا كرتَ جديدًا: الفعلان ذيلُ كرت «الباركود ووجهتُه» نفسِه، يفصلهما خطّ. */
function ShapeD() {
  return (
    <SectionCard headerVariant="soft" icon={<Prohibit />} title="الباركود ووجهتُه">
      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="shrink-0" aria-hidden>
          <div className="skl" style={{ width: 150, height: 150, borderRadius: "var(--radius)" }} />
        </div>
        <div className="min-w-[240px] flex-1">
          <p className="txt"><b>الملتقى التعريفيّ لبرنامج الولاء الوظيفيّ «دوم»</b></p>
          <div className="btn-row mt-2">
            <Button variant="primary" size="md">عدّل التصميم</Button>
            <Button variant="primary" size="md">عدّل الوجهة</Button>
          </div>
        </div>
      </div>
      <div className="setl mt-4">
        <div />
        <div className="btn-row">
        <Button variant="ghost" size="md"><Pause /> أوقف الباركود</Button>
          <Button variant="ghost-danger" size="md"><Trash /> حذف الباركود</Button>
        </div>
      </div>
    </SectionCard>
  );
}

const SHAPES = [
  { tag: "أ) كرتٌ معنونٌ وصفّان", node: <ShapeA />, note: "القائمُ اليوم: لكلّ فعلٍ سطرُ أثرٍ وزرّ. أوضحُها معنًى، وأثقلُها بصريًّا." },
  { tag: "ب) بلا كرت", node: <ShapeB />, note: "أخفُّها: ذيلُ صفحةٍ لا كرتَ فيه. يربح السكونَ ويخسر الشرح." },
  { tag: "ج) كرتٌ منغَّمٌ بلا رأس", node: <ShapeC />, note: "سطرٌ واحدٌ يجمع الأثرين، والنغمةُ تقول إنّها منطقةُ خطر." },
  { tag: "د) ذيلُ كرت الباركود نفسِه", node: <ShapeD />, note: "لا كرتَ خامسًا في الصفحة: الفعلان يسكنان الكرتَ الذي يصف الباركود." },
];

export default function QrEndLab() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, QR Stats</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">ذيلُ صفحة الإحصاء</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          أربعُ هيئاتٍ لموضع الإيقاف والحذف، بالمكوّنات نفسِها وبنصوصها الحقيقيّة. انظر
          الجوّالَ أوّلًا (٣٧٥) فهو مقياسُ اللوحة، ثمّ العرضَ الواسع.
        </p>
      </Container>

      <Container>
        <h2 className="mt-10 font-display text-xl font-black text-content">على الجوّال ٣٧٥</h2>
        <div className="phdlab mt-4">
          {SHAPES.map((s) => (
            <div className="phdlab-col" key={s.tag}>
              <div className="phdlab-tag"><span className="dot" aria-hidden />{s.tag}</div>
              <div className="phdlab-frame">{s.node}<div className="phdlab-body">{s.note}</div></div>
            </div>
          ))}
        </div>

        <h2 className="mt-12 font-display text-xl font-black text-content">على العرض الواسع</h2>
        <div className="mt-4 flex flex-col gap-6">
          {SHAPES.map((s) => (
            <div key={s.tag}>
              <div className="phdlab-tag"><span className="dot" aria-hidden />{s.tag}</div>
              <div className="phdlab-frame">{s.node}<div className="phdlab-body">{s.note}</div></div>
            </div>
          ))}
        </div>
      </Container>
    </main>
  );
}
