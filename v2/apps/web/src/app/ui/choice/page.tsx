"use client";

import { Checkbox, Radio, Switch, Container } from "@adeeb/design-system";
import { Bell, Moon } from "@phosphor-icons/react";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">{children}</p>
  );
}

/** صفحة مرجعية حيّة لعناصر الاختيار — بمكوّنات Checkbox / Radio / Switch الحقيقية. */
export default function ChoicePage() {
  return (
    <main className="py-16">
      <Container className="max-w-3xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System · Choice
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض عناصر الاختيار</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          تحديد متدرّج · مفتاح كلاسيكيّ · رسم + ارتداد. انقر لتجرّب الحركة.
        </p>

        <div className="mt-12 space-y-14">
          <section>
            <Label>مربّع اختيار</Label>
            <div className="space-y-4">
              <Checkbox label="تفعيل الإشعارات" defaultChecked />
              <Checkbox label="النشرة البريدية" />
              <Checkbox label="الإشعارات" description="استقبل تنبيهات الأنشطة الجديدة." defaultChecked />
              <Checkbox label="خيار معطّل" disabled />
            </div>
          </section>

          <section>
            <Label>زرّ راديو (مجموعة)</Label>
            <div className="space-y-3">
              <Radio name="plan" label="عضوية سنوية" defaultChecked />
              <Radio name="plan" label="عضوية فصلية" />
              <Radio name="plan" label="عضوية شهرية" />
            </div>
          </section>

          <section>
            <Label>مفتاح — إنلاين وصفّ إعدادات</Label>
            <div className="space-y-4">
              <Switch label="الوضع الليليّ" defaultChecked />
              <div className="divide-y divide-line rounded border border-line bg-surface px-5 shadow-sm">
                <Switch row label="الإشعارات" description="تنبيهات فورية للأنشطة." defaultChecked className="py-4" />
                <Switch row label="النشرة البريدية" description="ملخّص أسبوعيّ." className="py-4" />
              </div>
            </div>
          </section>

          <section>
            <Label>بطاقات قابلة للاختيار</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Radio card name="opt" label="عضوية سنوية" defaultChecked />
              <Radio card name="opt" label="عضوية فصلية" />
              <Checkbox card icon={<Bell aria-hidden />} label="الإشعارات" description="تنبيهات فورية للأنشطة." defaultChecked />
              <Checkbox card icon={<Moon aria-hidden />} label="الوضع الليليّ" description="مظهر داكن مريح." />
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
