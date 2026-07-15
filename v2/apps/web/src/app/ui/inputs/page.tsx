"use client";

import { Field, Textarea, Container } from "@adeeb/design-system";
import { Asterisk, At, ChatText, Envelope, Hash, IdentificationBadge, MagnifyingGlass, PencilSimple, Phone, Prohibit, User } from "@phosphor-icons/react";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">{children}</p>
  );
}

/** صفحة مرجعية حيّة لحقول الإدخال — بمكوّني Field و Textarea الحقيقيين. */
export default function InputsPage() {
  return (
    <main className="py-16">
      <Container className="max-w-3xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System · Inputs
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض الحقول</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          أيقونة label بخلفية Aurora · أيقونة داخليّة تفاعليّة · نصّ تلميحيّ · خلفية Aurora للحقل · تركيز فولاذيّ + حلقة · حالات. كلّها مقدّسة.
        </p>

        <div className="mt-12 space-y-14">
          <section>
            <Label>أساسي (Aurora + أيقونة داخليّة + نصّ تلميحيّ — انقر لترى التفاعل)</Label>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="الاسم الكامل" icon={<User />} innerIcon={<PencilSimple />} placeholder="اكتب اسمك الكامل" />
              <Field label="الاسم" icon={<User />} innerIcon={<PencilSimple />} placeholder="الاسم" />
            </div>
          </section>

          <section>
            <Label>بأيقونة ومساعدة</Label>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="البريد الإلكترونيّ" type="email" dir="ltr" icon={<Envelope />} innerIcon={<At />} placeholder="you@adeeb.club" helper="لن نشاركه مع أحد." />
              <Field label="بحث" icon={<MagnifyingGlass />} innerIcon={<PencilSimple />} placeholder="ابحث…" />
            </div>
          </section>

          <section>
            <Label>الحالات</Label>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="رقم الجوال" icon={<Phone />} innerIcon={<Hash />} placeholder="05xxxxxxxx" defaultValue="05" error="الرقم غير مكتمل." />
              <Field label="اسم المستخدم" icon={<At />} innerIcon={<IdentificationBadge />} placeholder="@username" defaultValue="adeeb" success helper="متاح ✓" />
              <Field label="حقل معطّل" icon={<Prohibit />} innerIcon={<PencilSimple />} placeholder="—" defaultValue="غير متاح" disabled />
              <Field label="مطلوب" icon={<Asterisk />} innerIcon={<PencilSimple />} placeholder="حقل إلزاميّ" required helper="حقل إلزاميّ" />
            </div>
          </section>

          <section>
            <Label>نصّ متعدّد الأسطر</Label>
            <Textarea label="الرسالة" icon={<ChatText />} innerIcon={<PencilSimple />} placeholder="اكتب رسالتك هنا…" rows={5} helper="حتى ٥٠٠ حرف." />
          </section>

          <section>
            <Label>نموذج مصغّر</Label>
            <div className=" border border-line bg-surface p-6 shadow-md">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="الاسم" icon={<User />} innerIcon={<PencilSimple />} placeholder="الاسم" />
                <Field label="البريد" type="email" dir="ltr" icon={<Envelope />} innerIcon={<At />} placeholder="you@adeeb.club" />
              </div>
              <div className="mt-5">
                <Textarea label="رسالتك" icon={<ChatText />} innerIcon={<PencilSimple />} placeholder="رسالتك…" rows={4} />
              </div>
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
