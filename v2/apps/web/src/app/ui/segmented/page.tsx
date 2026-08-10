"use client";

import { useState } from "react";
import { Container, Segmented } from "@adeeb/design-system";

function Lab({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>;
}

const RANGES = [
  { value: "7", label: "٧ أيّام", href: "#7" },
  { value: "30", label: "٣٠ يومًا", href: "#30" },
  { value: "90", label: "٩٠ يومًا", href: "#90" },
  { value: "3650", label: "الكلّ", href: "#all" },
];

export default function SegmentedPage() {
  const [status, setStatus] = useState("active");
  const [tab, setTab] = useState("info");

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
            <Lab>وضع الروابط: كلّ عنصرٍ رابطٌ عبر href (الفعّال بـ aria-current)</Lab>
            <Segmented aria-label="مدى المدّة" value="30" items={RANGES} />
            <p className="mt-3 text-content-muted">
              في التحليلات يُمرَّر <code className="font-latin text-xs">linkAs={"{Link}"}</code> فيصير كلّ عنصرٍ رابطًا يغيّر
              <code className="font-latin text-xs"> ?days=</code> بتنقّلٍ عميليّ.
            </p>
          </section>
        </div>
      </Container>
    </main>
  );
}
