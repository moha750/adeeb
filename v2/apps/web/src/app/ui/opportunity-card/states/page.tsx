"use client";

import { useState } from "react";
import { Container, Segmented } from "@adeeb/design-system";
import { OpportunityCardMono, SHELF_LABEL, needsYou, shelfOf, type Shelf } from "../../../dashboard/volunteering/OpportunityCard";
import { H, STATES, TODAY, noop } from "../samples";

const SHELVES: Shelf[] = ["draft", "live", "done"];
/** معالجاتُ الكشف الحقيقيّ كلُّها، فتظهر في قوائم ⋮ بنودُها كما في اللوحة (ومنها «إنهاءُ الفرصة» للمرنة). */
const HANDLERS = { ...H, onOpen: noop, onEnd: noop };
/** العيّناتُ في تبويباتها، ورقمُها متّصلٌ عبر التبويبات الثلاثة. */
// وما يحتاجك أوّلَ رفّه، كما في الكشف
const GROUPS = SHELVES.map((p) => ({
  p,
  items: STATES.filter((s) => shelfOf(s.o, TODAY) === p)
    .sort((a, b) => Number(needsYou(b.o, TODAY)) - Number(needsYou(a.o, TODAY))),
}));
const NUM = new Map(GROUPS.flatMap((g) => g.items).map((s, i) => [s.o.id, i + 1]));

/**
 * **كرتُ الفرصة: كلُّ الحالات** (طلبُ المالك ٢٠٢٦-١٠-٠٣: «اعرض عليّ الكروت بكلّ حالاتها بلا استثناء»).
 * الكرتُ المُعتمَد نفسُه (`OpportunityCardMono`) على عيّنةٍ لكلّ ما يقوله (`STATES`)، مقسومةً على تبويبات
 * رفوف الكشف الثلاثة كما يحسبها (`shelfOf`) لا كما تُكتب. وفوق كلّ كرتٍ رقمُه واسمُ حاله وسببُها، ليُشار إليه بالرقم.
 */
export default function OpportunityStatesPage() {
  const [width, setWidth] = useState<"desk" | "phone">("desk");
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Opportunity Card, All States</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">كرت الفرصة: كلّ الحالات</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          الكرتُ الحقيقيّ في كلّ حالٍ يمرّ بها: المسوّدة والمتاحة والتي انتهى تقديمها والمنتهية، والمرنة وذات الفترات
          وما قبل الفترات. والكروتُ مقسومةٌ على تبويبات الكشف كما يحسبها، واليومُ في العيّنة ٣٠ سبتمبر.
        </p>

        <div className="mt-8">
          <Segmented items={[{ value: "desk", label: "الحاسوب" }, { value: "phone", label: "الجوّال" }]} value={width} onValueChange={(v) => setWidth(v as "desk" | "phone")} />
        </div>

        {GROUPS.map(({ p, items }) => {
          const cards = items.map((s) => (
            <div key={s.o.id} className="flex flex-col gap-2 [&>.vop]:flex-1" data-state={s.o.id}>
              <p className="text-sm text-content-muted">
                <b className="font-latin text-content">{NUM.get(s.o.id)}.</b> <b className="text-content">{s.caption}</b>، {s.why}
              </p>
              <OpportunityCardMono o={s.o} today={TODAY} {...HANDLERS} />
            </div>
          ));
          return (
            <section key={p} className="mt-12">
              <h2 className="mb-4 font-display text-2xl font-black text-content">
                {SHELF_LABEL[p]} <span className="font-latin text-content-muted">{items.length}</span>
              </h2>
              {width === "phone"
                ? <div className="cvlab flex flex-col gap-8">{cards}</div>
                : <div className="card-grid card-grid-2col">{cards}</div>}
            </section>
          );
        })}
      </Container>
    </main>
  );
}
