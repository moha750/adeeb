"use client";

import { useState } from "react";
import { Container, Segmented, type SegmentedItem } from "@adeeb/design-system";

function Lab({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>;
}

const RANGES = [
  { value: "7", label: "٧ أيّام", href: "#7" },
  { value: "30", label: "٣٠ يومًا", href: "#30" },
  { value: "90", label: "٩٠ يومًا", href: "#90" },
  { value: "3650", label: "الكلّ", href: "#all" },
];

// ————— صفُّ المبدّلات: نموذجُ شريط أدوات التحليلات —————
// الرقمُ ملفوفٌ بـ`font-latin` في المبدّلين معًا، فوزنُه واحد. رقمٌ متروكٌ في نصٍّ عربيّ يُرسَم من
// وجه الأرقام المعلَن داخل عائلة Lyon (‎700 ← Eras Demi‎)، وملفوفُه من عائلة Eras (‎700 ← Eras Bold‎)؛
// فخلطُ الطريقتين في صفٍّ واحد يُظهر وزنين لرقمٍ واحد.
const DAYS: SegmentedItem[] = [
  { value: "7", label: <><span className="seg-num">7</span> أيّام</>, href: "#d7" },
  { value: "30", label: <><span className="seg-num">30</span> يومًا</>, href: "#d30" },
  { value: "90", label: <><span className="seg-num">90</span> يومًا</>, href: "#d90" },
  { value: "3650", label: "الكلّ", href: "#dall" },
];
const DOORS: SegmentedItem[] = [
  { value: "all", label: <>البابان <span className="seg-num">1,432</span></>, href: "#gall" },
  { value: "web", label: <>الموقع <span className="seg-num">1,180</span></>, href: "#gweb" },
  { value: "app", label: <>التطبيق <span className="seg-num">252</span></>, href: "#gapp" },
];

/** صفُّ المبدّلين داخل حاويةٍ بعرضٍ مفروض — كي يُرى السلوكان في صفحةٍ واحدة. */
function Row() {
  return (
    <div className="seg-row">
      <Segmented aria-label="مدى المدّة" value="30" items={DAYS} />
      <Segmented aria-label="باب الزيارة" value="all" items={DOORS} />
    </div>
  );
}

export default function SegmentedPage() {
  const [status, setStatus] = useState("active");
  const [tab, setTab] = useState("info");
  const [unit, setUnit] = useState("hr");

  return (
    <main className="py-16">
      <Container className="max-w-4xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Component</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">الشريط المقطعيّ</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          تحكّمٌ لا سطح: خلفيّة غائرة وحدٌّ خاصّ، والعنصر الفعّال يرتفع بسطحٍ أبيض وظلٍّ صغير. مصدرٌ واحد
          لتبويبات النافذة ومبدّل مدى التحليلات: وضع الأزرار (حالة) أو الروابط (تنقّل).
        </p>

        <div className="mt-12 space-y-12">
          <section>
            <Lab>وضع الأزرار: حالة عبر onValueChange</Lab>
            <Segmented aria-label="الحالة" value={status} onValueChange={setStatus}
              items={[{ value: "active", label: "نشط" }, { value: "pending", label: "معلّق" }, { value: "suspended", label: "موقوف" }]} />
            <p className="mt-3 font-latin text-xs text-content-muted" dir="ltr">value: {status}</p>
          </section>

          <section>
            <Lab>تبويبان</Lab>
            <Segmented aria-label="أقسام الملفّ" value={tab} onValueChange={setTab}
              items={[{ value: "info", label: "المعلومات" }, { value: "activity", label: "النشاط" }]} />
          </section>

          <section>
            <Lab>ممتدّ: wide — يملأ صفّه وتتقاسمه عناصرُه بالسويّة</Lab>
            <Segmented aria-label="الإدارة المعروضة" wide value={unit} onValueChange={setUnit}
              items={[{ value: "hr", label: "إدارة الموارد البشرية" }, { value: "qa", label: "إدارة الضمان والجودة" }]} />
            <p className="mt-3 text-content-muted">
              لخيارٍ <b>هو نفسُه الشاشة</b> لا خيارٍ يُزيَّن به ركن: القضيبُ يقود العين، والهدفُ يتّسع للإبهام
              على 375px. وتفاوتُ الكلمات لا يُفاوت بين العنصرين.
            </p>
          </section>

          <section>
            <Lab>وضع الروابط: كلّ عنصرٍ رابطٌ عبر href (الفعّال بـ aria-current)</Lab>
            <Segmented aria-label="مدى المدّة" value="30" items={RANGES} />
            <p className="mt-3 text-content-muted">
              في التحليلات يُمرَّر <code className="font-latin text-xs">linkAs={"{Link}"}</code> فيصير كلّ عنصرٍ رابطًا يغيّر
              <code className="font-latin text-xs"> ?days=</code> بتنقّلٍ عميليّ.
            </p>
          </section>

          <section>
            <Lab>صفُّ مبدّلات: seg-row — يمتدّان حين لا يسعهما سطر</Lab>
            <p className="max-w-2xl text-content-muted">
              مبدّلان في سطرٍ واحد، طرفاهما إلى طرفَي الصفّ. وحين يضيق الصفُّ فلا يسعهما معًا، يمتدّ كلٌّ
              منهما على عرض سطره وتتقاسمه عناصرُه بالسويّة، فلا يبقى مبدّلان ضامران فوق بعضهما ونصفُ كلّ
              سطرٍ فارغ. والقياسُ <b>بالحاوية لا بالنافذة</b>: عرضُ ما تحت اللوحة يتغيّر بالشريط الجانبيّ
              لا بالشاشة وحدها. والرقمُ ملفوفٌ بـ<code className="font-latin text-xs">font-latin</code> في
              المبدّلين معًا، فوزنُه واحد.
            </p>

            <p className="mt-6 mb-2 text-sm text-content-muted">حاويةٌ واسعة: سطرٌ واحد، كلٌّ على طرف.</p>
            <Row />

            <p className="mt-8 mb-2 text-sm text-content-muted">حاويةٌ ضيّقة: سطران، وكلٌّ ممتدٌّ على عرضه.</p>
            <div className="max-w-md">
              <Row />
            </div>

            <p className="mt-8 mb-2 text-sm text-content-muted">
              حاويةٌ ضيّقةٌ جدًّا (عرضُ المحتوى على جوّالٍ 375): الرقمُ فوق وكلمتُه تحته، فلا يُقتطع ولا يطفح.
            </p>
            <div className="max-w-[331px]">
              <Row />
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
