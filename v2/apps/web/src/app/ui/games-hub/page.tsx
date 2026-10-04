"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { Segmented } from "@adeeb/design-system";
import { Hub } from "@/app/games/_components/Hub";
import { COUNTS, DEMO_EVENT, DEMO_STATS, gamesFor } from "./demo";

/**
 * **معرضُ صالة «ألعاب أدِيبيّة»** — يرسم المكوّنَ الحقيقيَّ نفسَه (`app/games/_components/Hub`)
 * بمظهرَيه، وكلَّ مظهرٍ في ثلاثة أجهزةٍ بمقاساتها الحقيقيّة مصغَّرة، ليختار المالكُ بعينه قبل أن تُبنى `/games`.
 *
 * ══ ما حُسم (٢٠٢٦-٠٩-٢٦) ══
 * الاسمُ «ألعاب أدِيبيّة» كما في الشعار، والرابطُ `/games` كما هو. والهويّةُ منعزلةٌ كالمحطّة،
 * والاتّجاهُ صالةُ أركيد ليليّةٌ بالنيون وخطوطِ الشاشة القديمة (اختيارُه على «دفتر المربّعات»).
 * والشعارُ رسمُه، والخطُّ Rooyin اختيارُه.
 *
 * ══ الجولةُ الثانية ══
 * نقدُ الأولى (وأقرّه المالك): الكابينةُ بطاقةٌ بإطار، وشاشتُها إعلانٌ غريبٌ عن الصالة، والحاسوبُ
 * لم يُجرَّب، و«اختر لعبتك» والكابينةُ الفارغة بلا معنى للعبةٍ واحدة. **وسأل لماذا لا يراه بكلّ
 * المقاسات:** كان المعرضُ إطارَي جوّالٍ ثابتين. فصار كلُّ مظهرٍ هنا بثلاثة أجهزة، وله صفحةٌ بملء
 * الشاشة (`/ui/games-hub/full`) تتغيّر مع النافذة وتُفتح في أيّ جهاز.
 *
 * ══ والجولةُ الثالثة ══
 * سأل: «كيف سيكون شكله بعد إضافة أكثر من لعبة؟ ألم تفكر في ذلك؟». كان في الكود ولم يُعرض،
 * فصار هنا «عدد الألعاب» (١ إلى ٤) بألعابٍ للعرض فقط (`demo.ts`).
 *
 * ══ والجولةُ الرابعة ══
 * سأل: «هل تشوفها صفحة هبوط محترمة متكاملة؟» فكان الجواب لا، وصارت ستّةَ أقسام (انظر `Hub.tsx`).
 * والحدثُ الجاري و«أعلى النقاط» هنا ببياناتٍ مصنوعة (`demo.ts`).
 *
 * ══ وما يُعرض للاختيار ══
 * اللوحة: الشعارُ بلا لون، فلا لوحةَ تُشتقّ منه، فعُرض مظهران، وما يختاره يصير اللوحةَ ويُحذف الآخر.
 */

type Look = "synth" | "cabinet";

const LOOKS: Record<Look, { title: string; note: string }> = {
  synth: {
    title: "أ. ليلُ السِّنث",
    note: "نيلٌ عميقٌ ونيونٌ ورديٌّ وسماويّ، وأرضيّةُ شبكةٍ تغيب في الأفق. والكابينةُ تتوهّج بلون لعبتها، واسمُها على لافتتها من نيون.",
  },
  cabinet: {
    title: "ب. كابينةُ الأركيد",
    note: "سوادُ الصالة، والشعارُ أنبوبُ نيونٍ أبيضُ القلب بهالةٍ كهرمانيّة وحوله أضواءُ لافتة. ولافتةُ الكابينة لوحٌ مضاءٌ بلون لعبتها، وأزرارُها صفراءُ من الصالة.",
  },
};

const DEVICES = [
  { key: "desktop", label: "حاسوب 1280", w: 1280, h: 800, s: 0.75 },
  { key: "tablet", label: "لوحيّ 768", w: 768, h: 1024, s: 0.55 },
  { key: "phone", label: "جوّال 375", w: 375, h: 760, s: 0.74 },
] as const;

export default function GamesHubLab() {
  const [look, setLook] = useState<Look>("synth");
  const [count, setCount] = useState(1);
  const games = gamesFor(count);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="font-latin text-xs tracking-widest text-muted">GAMES / HUB</p>
      <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">
        صالةُ ألعاب أدِيبيّة
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-8 text-muted">
        المكوّنُ الحقيقيُّ نفسُه بمظهرين، وكلُّ مظهرٍ في ثلاثة أجهزةٍ بمقاساتها الحقيقيّة مصغَّرة، وكلُّ
        جهازٍ يُمرَّر داخله. وصفحةُ «ملء الشاشة» تتغيّر مع النافذة وتُفتح في أيّ جهاز. الشعارُ بلا لون،
        فاللوحةُ مقترحةٌ لا مشتقّة: ما تختاره منهما يصير لوحةَ الصفحة ويُحذف الآخر. و«عدد الألعاب» يُري
        الصالةَ بأكثر من كابينة: ما بعد «دربك خضر» ألعابٌ للعرض فقط، شاشاتُها «بلا إشارة».
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <Segmented
          aria-label="المظهر"
          value={look}
          onValueChange={(v) => setLook(v as Look)}
          items={[
            { value: "synth", label: "أ. ليلُ السِّنث" },
            { value: "cabinet", label: "ب. كابينةُ الأركيد" },
          ]}
        />
        <Segmented
          aria-label="عدد الألعاب"
          value={String(count)}
          onValueChange={(v) => setCount(Number(v))}
          items={COUNTS.map((n) => ({ value: String(n), label: n === 1 ? "لعبةٌ واحدة" : n === 2 ? "لعبتان" : `${n} ألعاب` }))}
        />
        <Link href={`/ui/games-hub/full?look=${look}&n=${count}`} className="text-sm font-bold text-content underline">
          افتحه بملء الشاشة
        </Link>
      </div>

      <div className="mt-6 stnp-cap">
        <b>{LOOKS[look].title}</b>
        <p>{LOOKS[look].note}</p>
      </div>

      <div className="mt-4 agmp-row">
        {DEVICES.map((d) => (
          <div key={d.key} className="agmp-dev">
            <div className="agmp-dev-box" style={{ "--w": d.w, "--h": d.h, "--s": d.s } as CSSProperties}>
              <div className="agmp-dev-in agm agmp-demo" data-look={look}>
                <Hub games={games} event={DEMO_EVENT} stats={DEMO_STATS} />
              </div>
            </div>
            <p className="agmp-dev-cap">{d.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
