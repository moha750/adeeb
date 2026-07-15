"use client";

import { Button, Container } from "@adeeb/design-system";
import { EmptyState } from "../../dashboard/_components/EmptyState";
import { MagnifyingGlass, Users, Tray, Plus, ArrowClockwise } from "@phosphor-icons/react";

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
    <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">
      {children}
    </p>
  );
}

/** صفحة مرجعية حيّة لمكوّن الحالة الفارغة — تُبنى بالمكوّن الحقيقي. */
export default function EmptyPage() {
  return (
    <main className="py-16">
      <Container className="max-w-2xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System · Empty
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">
          معرض الحالة الفارغة
        </h1>
        <p className="mt-2 max-w-xl text-content-muted">
          كل الأنماط والحالات بالمكوّن الحقيقي — أيقونة وعنوان ووصف وإجراء.
        </p>

        <div className="mt-12 space-y-14">
          {/* الأنماط — بأيقونة وعنوان ووصف وإجراء */}
          <Sec title="الأنماط">
            <Lab>Soft · لغياب النتائج</Lab>
            <EmptyState
              variant="soft"
              icon={<MagnifyingGlass aria-hidden />}
              title="لا توجد نتائج"
              description="لم نعثر على ما يطابق بحثك. جرّب كلمات مختلفة أو أزِل بعض عوامل التصفية."
              action={
                <Button variant="ghost">
                  <ArrowClockwise aria-hidden /> إعادة الضبط
                </Button>
              }
            />

            <div className="mt-8" />
            <Lab>Aurora · لغياب العناصر (ترحيبية)</Lab>
            <EmptyState
              variant="aurora"
              icon={<Users aria-hidden />}
              title="ابدأ بإضافة أعضاء"
              description="لا يوجد أعضاء بعد. أضِف أوّل عضو إلى الفريق لتظهر بياناته هنا."
              action={
                <Button variant="primary">
                  <Plus aria-hidden /> إضافة عضو
                </Button>
              }
            />
          </Sec>

          {/* بلا إجراء */}
          <Sec title="بلا إجراء">
            <Lab>أيقونة وعنوان ووصف فقط</Lab>
            <EmptyState
              variant="soft"
              icon={<Tray aria-hidden />}
              title="صندوق الوارد فارغ"
              description="ستظهر الرسائل الجديدة هنا فور وصولها."
            />
          </Sec>

          {/* الحدّ الأدنى */}
          <Sec title="الحدّ الأدنى">
            <Lab>أيقونة وعنوان فقط</Lab>
            <EmptyState
              variant="aurora"
              icon={<Tray aria-hidden />}
              title="لا شيء لعرضه بعد"
            />
          </Sec>
        </div>
      </Container>
    </main>
  );
}
