"use client";

import { Badge, Container, Stat } from "@adeeb/design-system";
import { Bank, Briefcase, Buildings, Eye, UserCheck, UserCircle, UserMinus, UsersThree } from "@phosphor-icons/react";

function Lab({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>;
}

const chevUp = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 14l6-6 6 6" /></svg>
);
const chevDown = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 10l6 6 6-6" /></svg>
);

export default function StatPage() {
  return (
    <main className="py-16">
      <Container className="max-w-5xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Component</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">كرت الإحصاء</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          سطح Aurora · أيقونة هويّة بتدرّج النغمة · رقم Eras · مؤشّر اتّجاه اختياريّ. مصدر واحد لكلّ كروت الإحصاء:
          نظرة عامّة · الأعضاء · التحليلات · الهيكلة · تعيين المناصب.
        </p>

        <div className="mt-12 space-y-12">
          <section>
            <Lab>النغمات الأربع</Lab>
            <div className="stat-grid">
              <Stat icon={<UsersThree weight="fill" />} value="800" label="إجمالي الأعضاء" tone="brand" />
              <Stat icon={<UserCheck weight="fill" />} value="42" label="مشغولة" tone="success" />
              <Stat icon={<Briefcase weight="fill" />} value="7" label="قيد المراجعة" tone="warning" />
              <Stat icon={<UserMinus weight="fill" />} value="5" label="شاغرة" tone="danger" />
            </div>
          </section>

          <section>
            <Lab>مع مؤشّر اتّجاه — الشارة تُمرَّر في trend</Lab>
            <div className="stat-grid">
              <Stat icon={<UsersThree weight="fill" />} value="800" label="إجمالي الأعضاء" tone="brand"
                trend={<Badge tone="success" variant="soft" size="sm" icon={chevUp}>12%</Badge>} />
              <Stat icon={<Eye weight="fill" />} value="1,204" label="زيارة" tone="brand"
                trend={<Badge tone="danger" variant="soft" size="sm" icon={chevDown}>3%</Badge>} />
            </div>
          </section>

          <section>
            <Lab>سلوك الشبكة — ثلاثة كحدّ أقصى، واليتيم يمتدّ على الصفّ</Lab>
            <div className="stat-grid">
              <Stat icon={<Bank weight="fill" />} value="3" label="مجالس" />
              <Stat icon={<Buildings weight="fill" />} value="8" label="أقسام" />
              <Stat icon={<UsersThree weight="fill" />} value="23" label="لجان" />
              <Stat icon={<UserCircle weight="fill" />} value="180" label="عضوًا نشطًا" />
            </div>
          </section>

          <section>
            <Lab>كرت وحيد — يملأ الصفّ</Lab>
            <div className="stat-grid">
              <Stat icon={<UsersThree weight="fill" />} value="180" label="عدد أعضاء أديب" />
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
