"use client";

import { useState } from "react";
import { Container, Segmented } from "@adeeb/design-system";
import { OpportunityBoard } from "../../dashboard/volunteering/OpportunityCard";
import { H, SAMPLE, TODAY, noop } from "./samples";

/**
 * **معرضُ كرت الفرصة — معرضُ المُقَرّ لا مضمارُ مفاضلة.** أقرّ المالكُ «خطَّ المترو» ٢٠٢٦-٠٩-٣٠ بعد ثلاث
 * جولاتٍ في يومٍ واحد، وأُعدم المرفوضُ كلُّه بأصنافه (السهام · القمع · التذكرة والأختام · المترو المبسّط).
 * والعيّنةُ على أحوال الحياة لا على الحقول، واليومُ ثابتٌ عند ٣٠ سبتمبر ليُرى المنقضي والقادم، ومعها
 * عرضُ جوّالٍ حقيقيّ (`.cvlab`) إذ اللوحةُ منتَجُ جوّال.
 */
export default function OpportunityCardPage() {
  const [width, setWidth] = useState<"desk" | "phone">("desk");
  const board = <OpportunityBoard rows={SAMPLE} today={TODAY} {...H} onOpen={noop} />;

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Opportunity Card</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">كرت الفرصة التطوّعيّة</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          «خطُّ المترو»: حياةُ الفرصة أربعُ محطّات (الطلبات، القبول، الحضور، الشهادات) على خطٍّ يمتلئ بما قُطع منه.
          المحطّةُ التي عليك تنبض بالأصفر، ومحطّةُ القبول حلقةٌ تمتلئ بنسبة المقاعد، وسطرُ القاع يقول ما عليك الآن
          وزرَّه. وفوق الكشف قائمةُ «تحتاج إجراءً منك»، وتحتها ثلاثةُ تبويباتٍ بحال الفرصة (سارية، مسوّدات، منتهية) ويفتح على «سارية». واليومُ في العيّنة ٣٠ سبتمبر.
        </p>

        <div className="mt-8">
          <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">العرض</p>
          <Segmented items={[{ value: "desk", label: "الحاسوب" }, { value: "phone", label: "الجوّال" }]} value={width} onValueChange={(v) => setWidth(v as "desk" | "phone")} />
        </div>

        <div className="mt-8">{width === "phone" ? <div className="cvlab">{board}</div> : board}</div>
      </Container>
    </main>
  );
}
