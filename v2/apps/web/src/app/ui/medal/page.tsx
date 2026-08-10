"use client";

import { Container, Medal, MedalGrid } from "@adeeb/design-system";
import { CalendarCheck, Compass, Fire, Megaphone, Repeat, Ticket } from "@phosphor-icons/react";

function Lab({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>;
}

export default function MedalPage() {
  return (
    <main className="py-16">
      <Container className="max-w-5xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Component</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">الوسام</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          ما بلغَه العضو في أديب، يُرصَد آليًّا من القاعدة ويُعرَض في صفحته العلنيّة. وحالاه اثنتان لا ثالثة:
          منولٌ بتاريخه وسببه، ومقفلٌ بما بقي له.
        </p>

        <div className="mt-12 space-y-12">
          <section>
            <Lab>المنول: تاريخُ الواقعة هو حجّتُه</Lab>
            <MedalGrid>
              <Medal icon={<Compass />} name="قائدُ وحدة" note="تولّى منصب قائد" earnedOn="2026-05-09" />
              <Medal icon={<Megaphone />} name="مرشَّح" note="ترشّح لانتخابات أديب" earnedOn="2026-04-24" />
              <Medal icon={<Ticket />} name="حاضرٌ أوّل" note="حضر أولى فعاليّاته مع أديب" earnedOn="2026-05-04" />
              <Medal icon={<Repeat />} name="مواظِب" note="حضر ثلاثًا من فعاليّات أديب" earnedOn="2026-05-07" />
            </MedalGrid>
          </section>

          <section>
            <Lab>المقفل: يُعرَض ولا يُخفى، ومعه ما بقي له</Lab>
            <MedalGrid>
              <Medal icon={<CalendarCheck />} name="سنةٌ في أديب" note="أتمّ سنةً كاملةً في عضويّة النادي"
                progress={{ current: 116, threshold: 365 }} />
              <Medal icon={<Fire />} name="ملازِم" note="حضر خمسًا من فعاليّات أديب"
                progress={{ current: 3, threshold: 5 }} />
            </MedalGrid>
          </section>

          <section>
            <Lab>مقفلٌ بلا شريط: قاعدةٌ لا تُقاس بعدّ</Lab>
            <MedalGrid>
              <Medal icon={<Compass />} name="قائدُ وحدة" note="تولّى قيادةَ لجنةٍ أو قسمٍ في أديب" />
            </MedalGrid>
          </section>
        </div>
      </Container>
    </main>
  );
}
