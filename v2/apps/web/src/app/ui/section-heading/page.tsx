"use client";

import { Container, Field, ModalSectionHeading } from "@adeeb/design-system";
import { AddressBook, Books, Prohibit, ShareNetwork, Envelope, At, Phone, Hash } from "@phosphor-icons/react";

function Lab({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>;
}

// سطح يحاكي جسم النافذة — العنوان مصمَّم للعيش داخلها، فيُعرَض في سياقه لا معلّقًا
function Panel({ children }: { children: React.ReactNode }) {
  return <div className="mdl" style={{ maxWidth: 520 }}><div className="mdl-body">{children}</div></div>;
}

export default function SectionHeadingPage() {
  return (
    <main className="py-16">
      <Container className="max-w-4xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Component</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">عنوان القسم</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          فاصل خفيف داخل النوافذ: أيقونة هويّة بخلفية Aurora + عنوان كحليّ + خطّ يتلاشى. يفصل مجموعات الحقول في النماذج
          ومجموعات الخلايا في عرض الملفّ — مصدر واحد للموضعين. ليس <span className="font-latin" dir="ltr">SectionHeading</span> (ذاك
          عنوان أقسام صفحات التسويق بخطّ العرض والباترن).
        </p>

        <div className="mt-12 space-y-12">
          <section>
            <Lab>النغمة الافتراضيّة</Lab>
            <Panel>
              <ModalSectionHeading icon={<AddressBook weight="fill" />} title="بيانات التواصل" />
            </Panel>
          </section>

          <section>
            <Lab>نغمة الخطر — للأقسام الهدّامة</Lab>
            <Panel>
              <ModalSectionHeading icon={<Prohibit weight="fill" />} title="إنهاء العضويّة" tone="danger" />
            </Panel>
          </section>

          <section>
            <Lab>داخل شبكة نموذج — mdl-full ليمتدّ على الصفّ</Lab>
            <Panel>
              <div className="mdl-grid">
                <ModalSectionHeading className="mdl-full" icon={<AddressBook weight="fill" />} title="بيانات التواصل" />
                <Field label="البريد الإلكترونيّ" type="email" charset="latin" icon={<Envelope />} innerIcon={<At />} placeholder="you@adeeb.club" />
                <Field label="رقم الجوّال" type="tel" charset="digits" icon={<Phone />} innerIcon={<Hash />} placeholder="05xxxxxxxx" />
                <ModalSectionHeading className="mdl-full" icon={<Books weight="fill" />} title="البيانات الأكاديميّة" />
                <Field className="mdl-full" label="الكلّية" icon={<Books />} innerIcon={<At />} placeholder="مثال: كلّية الآداب" />
              </div>
            </Panel>
          </section>

          <section>
            <Lab>عناوين متتالية — الخطّ يتلاشى بطول ما تبقّى من الصفّ</Lab>
            <Panel>
              <ModalSectionHeading icon={<AddressBook weight="fill" />} title="بيانات التواصل" />
              <ModalSectionHeading icon={<Books weight="fill" />} title="البيانات الأكاديميّة" />
              <ModalSectionHeading icon={<ShareNetwork weight="fill" />} title="التواصل الاجتماعيّ" />
            </Panel>
          </section>
        </div>
      </Container>
    </main>
  );
}
