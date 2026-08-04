"use client";

import { useState } from "react";
import { Button, Container } from "@adeeb/design-system";
import { Export } from "@phosphor-icons/react";
import { Toolbar, type FilterDef, type ViewMode } from "../../dashboard/_components/Toolbar";

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-6">
      <h2 className="mb-6 font-display text-2xl font-black text-content">{title}</h2>
      {children}
    </section>
  );
}

function Lab({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>;
}

// مرشّحات تجريبيّة على نمط MembersView (قسم/دور/لجنة) — كلٌّ بخياراته
const FILTERS: FilterDef[] = [
  { key: "dept", label: "القسم", options: [
    { value: "media", label: "الإعلام" },
    { value: "tech", label: "التقنية" },
    { value: "content", label: "المحتوى" },
  ] },
  { key: "role", label: "الدور", options: [
    { value: "member", label: "عضو" },
    { value: "lead", label: "قائد" },
    { value: "head", label: "رئيس قسم" },
  ] },
  { key: "committee", label: "اللجنة", options: [
    { value: "hr", label: "الموارد البشريّة" },
    { value: "qa", label: "الضمان والجودة" },
  ] },
];

export default function ToolbarPage() {
  // بحث فقط
  const [search1, setSearch1] = useState("");

  // بحث + مرشّحات + إعادة تعيين
  const [search2, setSearch2] = useState("");
  const [fv2, setFv2] = useState<Record<string, string>>({ dept: "media" });

  // بحث + مبدّل عرض
  const [search3, setSearch3] = useState("");
  const [view3, setView3] = useState<ViewMode>("table");

  // الشريط الكامل: بحث + مرشّحات + مبدّل عرض + أزرار مخصّصة
  const [search4, setSearch4] = useState("");
  const [fv4, setFv4] = useState<Record<string, string>>({});
  const [view4, setView4] = useState<ViewMode>("cards");

  // وضع التحديد الجماعيّ
  const [selected, setSelected] = useState(0);

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System · Toolbar</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض شريط الأدوات</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          شريط أدوات Aurora يعلو الجداول والقوائم: حقل بحث · مرشّحات منسدلة مع إعادة تعيين · مبدّل عرض (جدول/كروت). وعند تحديد صفوف يتحوّل إلى شريط إجراءات جماعيّة. جرّب كلّ حالة حيّة.
        </p>

        <div className="mt-12 space-y-14">
          <Sec title="بحث فقط">
            <Lab>search · onSearch — أدنى شكل للشريط</Lab>
            <Toolbar
              searchPlaceholder="ابحث بالاسم أو رقم الجوّال…"
              search={search1}
              onSearch={setSearch1}
            />
          </Sec>

          <Sec title="بحث ومرشّحات">
            <Lab>filters · filterValues · onFilter · onReset — زرّ «إعادة تعيين» يظهر عند اختيار أيّ مرشّح</Lab>
            <Toolbar
              searchPlaceholder="ابحث…"
              search={search2}
              onSearch={setSearch2}
              filters={FILTERS}
              filterValues={fv2}
              onFilter={(k, v) => setFv2((p) => ({ ...p, [k]: v }))}
              onReset={() => setFv2({})}
            />
          </Sec>

          <Sec title="مبدّل العرض">
            <Lab>view · onViewChange — يظهر المبدّل (جدول/كروت) فقط إن مُرِّر onViewChange</Lab>
            <Toolbar
              searchPlaceholder="ابحث…"
              search={search3}
              onSearch={setSearch3}
              view={view3}
              onViewChange={setView3}
            />
            <p className="mt-3 font-latin text-xs text-content-muted">العرض الحاليّ: {view3 === "table" ? "جدول" : "كروت"}</p>
          </Sec>

          <Sec title="الشريط الكامل">
            <Lab>بحث + مرشّحات + مبدّل عرض — الشريط النحيل الكامل (تهذيب القائمة فقط: بحث/تصفية/عرض)</Lab>
            <Toolbar
              searchPlaceholder="ابحث بالاسم أو رقم الجوّال…"
              search={search4}
              onSearch={setSearch4}
              filters={FILTERS}
              filterValues={fv4}
              onFilter={(k, v) => setFv4((p) => ({ ...p, [k]: v }))}
              onReset={() => setFv4({})}
              view={view4}
              onViewChange={setView4}
            />
          </Sec>

          <Sec title="وضع التحديد الجماعيّ">
            <Lab>selectedCount &gt; 0 · bulkActions · onClearSelection — يستبدل الشريط بإجراءات جماعيّة</Lab>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelected((n) => n + 1)}>حدّد صفًّا (+1)</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(5)}>حدّد 5</Button>
              <span className="font-latin text-xs text-content-muted">المحدّدون: {selected}</span>
            </div>
            <Toolbar
              searchPlaceholder="ابحث…"
              search=""
              onSearch={() => {}}
              filters={FILTERS}
              selectedCount={selected}
              onClearSelection={() => setSelected(0)}
              bulkActions={
                <>
                  <button type="button" className="tb-ba">تغيير الحالة</button>
                  <button type="button" className="tb-ba"><Export /> تصدير</button>
                  <button type="button" className="tb-ba dg" onClick={() => setSelected(0)}>حذف</button>
                </>
              }
            />
          </Sec>
        </div>
      </Container>
    </main>
  );
}
