"use client";

import { useState } from "react";
import { Container } from "@adeeb/design-system";
import { Tabs, type TabItem } from "../../dashboard/_components/Tabs";

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-6">
      <h2 className="mb-6 font-display text-2xl font-black text-content">{title}</h2>
      {children}
    </section>
  );
}

function Lab({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>
  );
}

// عناصر التبويب — تحمل شارات عدّ (badge اختياريّ في نوع TabItem الحقيقيّ)
const memberTabs: TabItem[] = [
  { value: "all", label: "الكل", badge: "٢١٤" },
  { value: "active", label: "نشط", badge: "١٩٨" },
  { value: "inactive", label: "غير نشط", badge: "١٢" },
  { value: "suspended", label: "موقوف", badge: "٤" },
];

// عناصر بلا شارات — لبيان أنّ badge اختياريّ
const plainTabs: TabItem[] = [
  { value: "overview", label: "نظرة عامة" },
  { value: "details", label: "التفاصيل" },
  { value: "history", label: "السجلّ" },
];

const CONTENT: Record<string, { h: string; p: string }> = {
  all: { h: "كل الأعضاء", p: "عرض ٢١٤ عضوًا مسجّلًا في النادي عبر جميع الحالات." },
  active: { h: "الأعضاء النشطون", p: "١٩٨ عضوًا نشطًا يشاركون في الأنشطة الحاليّة." },
  inactive: { h: "غير النشطين", p: "١٢ حسابًا خاملًا لا يظهر إلّا في «كل الأعضاء»." },
  suspended: { h: "الحسابات الموقوفة", p: "٤ حسابات موقوفة مؤقّتًا بانتظار المراجعة." },
  overview: { h: "نظرة عامة", p: "ملخّص سريع للحالة والأرقام الأساسيّة." },
  details: { h: "التفاصيل", p: "بيانات موسّعة عن العنصر المحدّد." },
  history: { h: "السجلّ", p: "تسلسل زمنيّ لآخر التغييرات والأحداث." },
};

function Panel({ value }: { value: string }) {
  const c = CONTENT[value];
  if (!c) return null;
  return (
    <div role="tabpanel" className="mt-4 rounded border border-line bg-surface p-6">
      <h3 className="font-display text-lg font-black text-content">{c.h}</h3>
      <p className="mt-1 text-sm text-content-muted">{c.p}</p>
    </div>
  );
}

export default function TabsPage() {
  const [underline, setUnderline] = useState("all");
  const [pill, setPill] = useState("active");
  const [segmented, setSegmented] = useState("active");
  const [plain, setPlain] = useState("overview");

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System · Tabs
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض التبويبات</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          ثلاثة أنماط — سطر سفليّ · حبوب · مقسّم — مع شارات عدّ ولوحة محتوى حيّة لكلّ تبويب.
        </p>

        <div className="mt-12 space-y-14">
          <Sec title="سطر سفليّ (underline)">
            <Lab>النمط الافتراضيّ — خطّ متدرّج أسفل التبويب النشط</Lab>
            <Tabs variant="underline" items={memberTabs} value={underline} onValueChange={setUnderline} />
            <Panel value={underline} />
          </Sec>

          <Sec title="حبوب (pill)">
            <Lab>حبّة ممتلئة بتدرّج الهوية للتبويب النشط</Lab>
            <Tabs variant="pill" items={memberTabs} value={pill} onValueChange={setPill} />
            <Panel value={pill} />
          </Sec>

          <Sec title="مقسّم (segmented)">
            <Lab>شريط مجزّأ داخل إطار واحد — مناسب لعدد محدود من الخيارات</Lab>
            <Tabs variant="segmented" items={memberTabs.slice(0, 3)} value={segmented} onValueChange={setSegmented} />
            <Panel value={segmented} />
          </Sec>

          <Sec title="بلا شارات">
            <Lab>الشارة اختياريّة — تبويبات نصّيّة صِرفة</Lab>
            <Tabs variant="underline" items={plainTabs} value={plain} onValueChange={setPlain} />
            <Panel value={plain} />
          </Sec>
        </div>
      </Container>
    </main>
  );
}
