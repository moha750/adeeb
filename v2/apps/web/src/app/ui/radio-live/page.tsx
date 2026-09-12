"use client";

import { useCallback, useState } from "react";
import { CaretLeft } from "@/app/_components/glyphs";
import {
  NavCtx, DoorCtx, type Route,
  Home, Browse, Library, Show, Episode, Search, NowPlaying,
} from "../radio-full/screens";

/**
 * **المحطّة نموذجًا حيًّا** — طلبُ المالك ٢٠٢٦-٠٩-٠٥: «أريد معاينةً حقيقيّة،
 * أتنقّل وكل شيء، بحيث تكون مآخذي مبنيّةً على تجربة».
 *
 * ══ لماذا صفحةٌ ثانيةٌ لا زرٌّ في المعرض ══
 * `radio-full` معرضُ **لقطاتٍ**: سبعُ شاشاتٍ جنبًا إلى جنبٍ ليُقارَن بينها.
 * وهذه **تجربة**: شاشةٌ واحدةٌ تملأ الجهاز ويُتنقّل فيها. والغرضان لا يجتمعان
 * في صفحة.
 *
 * ══ ولا نسخةَ ثانيةً من المحتوى ══
 * الشاشاتُ هي هي، المستوردةُ من `radio-full/screens`. والفرقُ **مُنفِّذُ تنقّلٍ
 * يُمرَّر في سياق**: بلا مُنفِّذٍ تبقى العناصرُ سواكنَ في المعرض، ومعه تصير
 * أزرارًا هنا. فما تجرّبه هو ما رأيتَه، لا محاكاةٌ له.
 *
 * ══ الرجوع ══
 * مكدّسٌ حقيقيّ: الأبوابُ الأربعةُ تُصفّره (كما تفعل تطبيقاتُ الأبواب)،
 * والشاشاتُ الداخليّةُ تُكدَّس فوقه. وزرُّ الرجوع لا يظهر إلّا حين يكون في
 * المكدّس ما يُرجَع إليه.
 */

const DOORS = new Set(["home", "browse", "lib", "find"]);

const SCREENS: Record<Route["k"], () => React.JSX.Element> = {
  home: Home, browse: Browse, lib: Library,
  find: Search, show: Show, ep: Episode, np: NowPlaying,
};

export default function RadioLivePage() {
  const [stack, setStack] = useState<Route[]>([{ k: "home" }]);
  const here = stack[stack.length - 1];

  const nav = useCallback((to: Route) => {
    setStack((prev) => {
      /* بابٌ من الأربعة يبدأ رحلةً جديدة، فيُصفَّر المكدّس. وشاشةٌ داخليّةٌ
         تُكدَّس. وطلبُ الشاشة نفسِها يُهمَل كي لا يتضخّم المكدّس بالتكرار. */
      if (DOORS.has(to.k)) return [to];
      if (prev[prev.length - 1].k === to.k) return prev;
      return [...prev, to];
    });
    /* منطقةُ التمرير تُعاد إلى رأسها: بلا هذا تفتح الشاشةُ الجديدةُ في وسطها. */
    requestAnimationFrame(() => {
      document.querySelector(".stnp-scroll")?.scrollTo({ top: 0 });
    });
  }, []);

  const back = useCallback(() => setStack((p) => (p.length > 1 ? p.slice(0, -1) : p)), []);

  const Screen = SCREENS[here.k];
  const deep = stack.length > 1;

  return (
    <NavCtx.Provider value={nav}>
      <DoorCtx.Provider value={stack[0].k as "home" | "browse" | "lib" | "find"}>
      <div className="stnlive stn stc">
        {deep ? (
          <button type="button" className="stnlive-back" onClick={back} aria-label="رجوع">
            <CaretLeft aria-hidden />
          </button>
        ) : null}
        <Screen />
      </div>
      </DoorCtx.Provider>
    </NavCtx.Provider>
  );
}
