"use client";

import { useState } from "react";
import { Container } from "@adeeb/design-system";
import { Pagination } from "../../dashboard/_components/Pagination";

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

export default function PaginationPage() {
  // كلّ قسم يحفظ صفحته وحجم صفحته؛ عند تغيير الحجم نعود إلى الصفحة الأولى
  const [fewPage, setFewPage] = useState(1);
  const [fewSize, setFewSize] = useState(10);

  const [manyPage, setManyPage] = useState(4);
  const [manySize, setManySize] = useState(10);

  const [membersPage, setMembersPage] = useState(1);
  const [membersSize, setMembersSize] = useState(12);

  const [emptyPage, setEmptyPage] = useState(1);
  const [emptySize, setEmptySize] = useState(10);

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System · Pagination</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض الترقيم</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          شريط ترقيم Aurora: مُحدِّد لعدد الصفوف · مدى العناصر المعروضة · أسهم سابق/تالٍ · أرقام صفحات تُختصر بـ«…» عند كثرتها. جرّب الأزرار والمُحدِّد لتحريك كلّ حالة.
        </p>

        <div className="mt-12 space-y-14">
          <Sec title="صفحات قليلة">
            <Lab>total = 42 · بلا «…» ما دام عدد الصفحات ≤ 7</Lab>
            <Pagination
              page={fewPage}
              pageSize={fewSize}
              total={42}
              onPageChange={setFewPage}
              onPageSizeChange={(size) => { setFewSize(size); setFewPage(1); }}
            />
          </Sec>

          <Sec title="صفحات كثيرة">
            <Lab>total = 480 · تظهر «…» حول الصفحة الحاليّة والطرفين</Lab>
            <Pagination
              page={manyPage}
              pageSize={manySize}
              total={480}
              onPageChange={setManyPage}
              onPageSizeChange={(size) => { setManySize(size); setManyPage(1); }}
            />
          </Sec>

          <Sec title="خيارات حجم واسم عنصر مخصّصان">
            <Lab>pageSizeOptions = [12, 24, 48] · noun = «عضو» · total = 137</Lab>
            <Pagination
              page={membersPage}
              pageSize={membersSize}
              total={137}
              onPageChange={setMembersPage}
              onPageSizeChange={(size) => { setMembersSize(size); setMembersPage(1); }}
              pageSizeOptions={[12, 24, 48]}
              noun="عضو"
            />
          </Sec>

          <Sec title="بلا عناصر">
            <Lab>total = 0 · المدى 0–0 والأسهم معطّلة وصفحة واحدة</Lab>
            <Pagination
              page={emptyPage}
              pageSize={emptySize}
              total={0}
              onPageChange={setEmptyPage}
              onPageSizeChange={(size) => { setEmptySize(size); setEmptyPage(1); }}
            />
          </Sec>
        </div>
      </Container>
    </main>
  );
}
