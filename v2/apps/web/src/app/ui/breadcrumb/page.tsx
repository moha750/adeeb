"use client";

import { Container } from "@adeeb/design-system";
import { CrumbTrail } from "../../dashboard/_shell/Breadcrumb";
import { crumbFor } from "../../dashboard/_shell/crumb";
import { NAV } from "../../dashboard/_shell/nav";

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

/** سطحٌ مؤطَّر تُعرَض فيه الفتات — لتُقرأ على سطحٍ يشبه سطحها في اللوحة. */
function Frame({ children }: { children: React.ReactNode }) {
  return <div className="rounded border border-line bg-surface p-5">{children}</div>;
}

/**
 * معرض فتات المسار.
 *
 * **المعروض هو المكوّن الحقيقيّ لا محاكاةً له:** المقاطع تُشتقّ بـ`crumbFor` نفسها من
 * مساراتٍ **وهميّة**، ثمّ تُرسَم بـ`CrumbTrail` نفسه الذي يرسم فتات اللوحة. ولذلك فُصل
 * الرسّام عن القارئ: `Breadcrumb` يقرأ `usePathname()` فلا يعرض إلّا مسارَ صفحته — ولو
 * أُلبس خاصّيةَ «مسارٌ مزوَّر» لأجل هذا المعرض لدخلت المكوّنَ الحقيقيّ خاصّيةٌ لا مستهلكَ لها.
 *
 * وخريطة الأخوات هنا `NAV` كاملةً (لا مرشَّحةً بقدرات): المعرض خارج اللوحة فلا جلسةَ له،
 * والمقصود عرضُ المنسدل ممتلئًا. وداخل اللوحة تُقرأ المرشَّحةُ من `NavProvider`.
 */
export default function BreadcrumbPage() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Breadcrumb</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض فتات المسار</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          مقاطعُها تُشتقّ من خريطة التنقّل لا تُكتب في الشاشات، فكلُّ مقطعٍ إمّا رابطٌ يُنقر أو زنادٌ
          يفتح أخواته، ولا مقطعَ يسمّي صفحةً ثمّ يمتنع. جرّب زناد المجموعة (▾) ونقلَ الروابط.
        </p>

        <div className="mt-12 space-y-14">
          <Sec title="بندٌ في مجموعة">
            <Lab>/dashboard/library، بلا leaf: اسمُ الورقة من الخريطة، ورأسُ المجموعة زنادٌ يفتح أخواته السبع</Lab>
            <Frame><CrumbTrail steps={crumbFor("/dashboard/library", NAV)} /></Frame>
          </Sec>

          <Sec title="صفحةٌ تحت بند">
            <Lab>/dashboard/library/12، leaf = «أدبٌ يُروى»: البندُ يصير رابطًا، والورقةُ اسمُ السجلّ</Lab>
            <Frame><CrumbTrail steps={crumbFor("/dashboard/library/12", NAV, "أدبٌ يُروى")} /></Frame>
          </Sec>

          <Sec title="بلا اسمٍ للورقة">
            <Lab>/dashboard/events/9، بلا leaf: شاشة «لا صلاحية» أو خطأِ جلبٍ على مسارٍ فرعيّ: البندُ يقف ورقةً، فلا تنتهي السلسلة برابط</Lab>
            <Frame><CrumbTrail steps={crumbFor("/dashboard/events/9", NAV)} /></Frame>
          </Sec>

          <Sec title="خارج الخريطة">
            <Lab>/dashboard/components، لا بندَ له ولا مجموعة، فالجذرُ والورقةُ وحدهما</Lab>
            <Frame><CrumbTrail steps={crumbFor("/dashboard/components", NAV, "معرض المكوّنات")} /></Frame>
          </Sec>

          <Sec title="جذرُ اللوحة">
            <Lab>/dashboard، الجذرُ هو الصفحةُ نفسها، فلا يُربَط بنفسه ويبقى نصًّا خامدًا</Lab>
            <Frame><CrumbTrail steps={crumbFor("/dashboard", NAV)} /></Frame>
          </Sec>

          <Sec title="مجموعةٌ لم يبقَ منها إلّا بند">
            <Lab>ترشيحُ القدرات قد يُسقط أخوات البند كلَّهنّ، فالزنادُ يعود نصًّا خامدًا، إذ منسدلٌ يعرض نفسك مسرحٌ لا خدمة</Lab>
            <Frame>
              <CrumbTrail
                steps={crumbFor(
                  "/dashboard/library",
                  NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.href === "/dashboard/library") })).filter((g) => g.items.length),
                )}
              />
            </Frame>
          </Sec>
        </div>

      </Container>
    </main>
  );
}
