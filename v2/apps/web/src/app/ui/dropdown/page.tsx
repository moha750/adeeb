"use client";

import { useState } from "react";
import { Button, Container } from "@adeeb/design-system";
import { Copy, LinkSimple, UserMinus } from "@phosphor-icons/react";
import { ArrowsClockwise } from "@/app/_components/glyphs";
import { Eye, PencilSimple, Star, Trash } from "@/app/_components/glyphs";
import { DropdownMenu, type MenuGroup } from "../../dashboard/_components/DropdownMenu";

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

/** خليّة معاينة: زرّ (⋯) داخل إطار بحدّ مع وسم يوضّح النمط المعروض. */
function Cell({ tag, children }: { tag: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-[9rem] flex-col items-center gap-3 rounded border border-line bg-surface p-5">
      {children}
      <span className="font-latin text-[0.7rem] font-bold uppercase tracking-[0.14em] text-content-muted">{tag}</span>
    </div>
  );
}

export default function DropdownPage() {
  const [last, setLast] = useState<string | null>(null);
  const pick = (label: string) => () => setLast(label);

  // مجموعات + عناصر بأيقونات + عنصر danger + عنصر disabled (النمط المعتمد في كرت العضو)
  const memberActions: MenuGroup[] = [
    {
      header: "إجراءات",
      items: [
        { label: "عرض الملف", icon: <Eye aria-hidden />, onSelect: pick("عرض الملف") },
        { label: "تعديل البيانات", icon: <PencilSimple aria-hidden />, onSelect: pick("تعديل البيانات") },
        { label: "تغيير الحالة", icon: <ArrowsClockwise aria-hidden />, onSelect: pick("تغيير الحالة") },
        { label: "نسخ رابط الملف (غير متاح)", icon: <Copy aria-hidden />, disabled: true },
      ],
    },
    {
      header: "منطقة الخطر",
      danger: true,
      items: [{ label: "حذف العضو", icon: <Trash aria-hidden />, danger: true, onSelect: pick("حذف العضو") }],
    },
  ];

  // قائمة مسطّحة بلا رؤوس مجموعات
  const flatActions: MenuGroup[] = [
    {
      items: [
        { label: "تمييز بنجمة", icon: <Star aria-hidden />, onSelect: pick("تمييز بنجمة") },
        { label: "نسخ الرابط", icon: <LinkSimple aria-hidden />, onSelect: pick("نسخ الرابط") },
        { label: "تعديل", icon: <PencilSimple aria-hidden />, onSelect: pick("تعديل") },
      ],
    },
  ];

  // قوائم بنغمة (tone) — سطح Aurora + حدّ بلون الحالة
  const toneActions = (verb: string): MenuGroup[] => [
    {
      items: [
        { label: "عرض الملف", icon: <Eye aria-hidden />, onSelect: pick("عرض الملف") },
        { label: verb, icon: <ArrowsClockwise aria-hidden />, onSelect: pick(verb) },
      ],
    },
  ];

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System · Dropdown</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض القوائم المنسدلة</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          قائمة إجراءات (⋯) بمظهر Aurora — تموضع مُدرِك للحوافّ عبر Portal، تنقّل بلوحة المفاتيح، ومجموعاتٌ برؤوس
          وعناصرَ بأيقونات وحالاتٍ (danger / معطّل) ونغمات.
        </p>

        <div className="mt-10 flex items-center gap-3 rounded border border-line bg-surface px-5 py-3">
          <span className="font-latin text-xs font-bold uppercase tracking-[0.14em] text-content-muted">آخر إجراء</span>
          <span className="text-sm font-bold text-content">{last ?? "لم يُختَر شيء بعد"}</span>
          {last ? (
            <Button variant="ghost" size="sm" className="ms-auto" onClick={() => setLast(null)}>
              إعادة
            </Button>
          ) : null}
        </div>

        <div className="mt-12 space-y-14">
          <Sec title="النمط المعتمد">
            <Lab>مجموعات برؤوس · أيقونات · عنصر معطّل · مجموعة خطر</Lab>
            <div className="flex flex-wrap items-center gap-4">
              <Cell tag="Member actions">
                <DropdownMenu groups={memberActions} ariaLabel="إجراءات العضو" />
              </Cell>
            </div>
          </Sec>

          <Sec title="قائمة مسطّحة">
            <Lab>عناصر بلا رؤوس مجموعات</Lab>
            <div className="flex flex-wrap items-center gap-4">
              <Cell tag="Flat">
                <DropdownMenu groups={flatActions} ariaLabel="إجراءات سريعة" />
              </Cell>
            </div>
          </Sec>

          <Sec title="النغمات (tone)">
            <Lab>سطح الحالة + حدّ بلونها — يُطابق حالة الصفّ / العنصر</Lab>
            <div className="flex flex-wrap items-center gap-4">
              <Cell tag="default">
                <DropdownMenu groups={toneActions("تغيير الحالة")} />
              </Cell>
              <Cell tag="success">
                <DropdownMenu groups={toneActions("تفعيل")} tone="success" ariaLabel="إجراءات عضو نشط" />
              </Cell>
              <Cell tag="warning">
                <DropdownMenu groups={toneActions("مراجعة الطلب")} tone="warning" ariaLabel="إجراءات عضو معلّق" />
              </Cell>
              <Cell tag="danger">
                <DropdownMenu
                  groups={[
                    {
                      items: [
                        { label: "إعادة العضوية", icon: <ArrowsClockwise aria-hidden />, onSelect: pick("إعادة العضوية") },
                        { label: "حذف نهائيّ", icon: <UserMinus aria-hidden />, danger: true, onSelect: pick("حذف نهائيّ") },
                      ],
                    },
                  ]}
                  tone="danger"
                  ariaLabel="إجراءات عضوية منتهية"
                />
              </Cell>
            </div>
          </Sec>

          <Sec title="حالات العناصر">
            <Lab>عنصر danger · عنصر معطّل (disabled)</Lab>
            <div className="flex flex-wrap items-center gap-4">
              <Cell tag="danger item">
                <DropdownMenu
                  groups={[{ items: [{ label: "حذف", icon: <Trash aria-hidden />, danger: true, onSelect: pick("حذف") }] }]}
                  ariaLabel="عنصر خطر"
                />
              </Cell>
              <Cell tag="disabled item">
                <DropdownMenu
                  groups={[
                    {
                      items: [
                        { label: "متاح", icon: <Eye aria-hidden />, onSelect: pick("متاح") },
                        { label: "معطّل", icon: <Copy aria-hidden />, disabled: true },
                      ],
                    },
                  ]}
                  ariaLabel="عنصر معطّل"
                />
              </Cell>
            </div>
          </Sec>
        </div>
      </Container>
    </main>
  );
}
