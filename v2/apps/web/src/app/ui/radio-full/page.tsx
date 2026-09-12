"use client";

import { useState } from "react";
import { Segmented } from "@adeeb/design-system";
import { Home, Browse, Library, Show, Episode, Search, NowPlaying } from "./screens";

/**
 * **المحطّة كاملةً: سبعُ شاشاتٍ بعرضين.**
 *
 * ══ ثلاثُ جولاتٍ سبقت ══
 * الأولى بدّلت شريطَ التنقّل وحدَه فرُدّت: «نسختَ التصميمَ الحاليّ». والثانية
 * عرضت شاشةَ جوّالٍ واحدةً فرُدّت: «طلبتُ تصميمًا كاملًا لكلّ الصفحات». فهذه
 * الثالثةُ تعرض **ما طُلب**: كلَّ شاشةٍ في المحطّة، بعرض الجوّال وعرض الحاسوب،
 * بلغةٍ واحدة.
 *
 * ══ اللغة ══
 * **الغلافُ بطلُ الشاشة**، **واللونُ من هويّة الإذاعة وحدَها** بأمر المالك
 * ٢٠٢٦-٠٩-٠٥ (سقطت مسوّدةُ سحبِ اللون من الغلاف). والأبوابُ أربعةٌ: أسفلَ الإبهام على الجوّال،
 * وشريطًا جانبيًّا على الحاسوب. والتخطيطُ يتبدّل **باستعلامِ حاوية**، فالمصدرُ
 * واحدٌ للعرضين.
 *
 * ══ والأرضيّةُ مبدّلٌ لا تصميمان ══
 * اختار المالكُ الكريميَّ ٢٠٢٦-٠٨-٢٨، والداكنُ يُعرَض هنا على التصميم نفسِه:
 * الرموزُ وحدَها تتبدّل ولا سطرَ تخطيطٍ يتغيّر.
 *
 * ══ وما هو حقيقيّ ══
 * الأغلفةُ صورُ الإنتاج من R2، والعناوينُ والمُدَدُ والملخّصاتُ والمحاورُ من
 * `radio_episodes`. والتصنيفاتُ معلّقةٌ بأمر المالك حتّى تكثر البرامج.
 * وبرامجُ الرفِّ الزائدةُ توضيحيّةٌ وتلبس غلافَ المحطّة، وعناوينُها طويلةٌ
 * عمدًا كي يُقاس الرفُّ بأسوأ حالاته.
 */

const SCREENS = [
  { k: "home", label: "المحطّة", C: Home },
  { k: "browse", label: "تصفَّح", C: Browse },
  { k: "lib", label: "مكتبتي", C: Library },
  { k: "show", label: "البرنامج", C: Show },
  { k: "ep", label: "الحلقة", C: Episode },
  { k: "find", label: "البحث", C: Search },
  { k: "np", label: "التشغيل", C: NowPlaying },
] as const;

export default function RadioFullPage() {
  const [ground, setGround] = useState<"day" | "night">("day");

  const root = `stn stc${ground === "night" ? " stc-night" : ""}`;

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-10">
      <p className="font-latin text-xs tracking-widest text-muted">RADIO / FULL</p>
      <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">
        المحطّة كاملةً
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-8 text-muted">
        سبعُ شاشاتٍ بلغةٍ واحدة، كلُّ واحدةٍ بعرض الجوّال وعرض الحاسوب. الغلافُ
        بطلُ الشاشة، ولونُ كلِّ شيءٍ من هويّة الإذاعة. وصدرُ الشاشة لوحٌ عنّابيٌّ
        صلبٌ بتدرّجٍ من الزاوية، ونقشُ المحطّة خلفَه خفيفًا. والأبوابُ
        أسفلَ الإبهام على الجوّال وشريطًا جانبيًّا على الحاسوب، والمصدرُ واحدٌ
        للعرضين. والأغلفةُ والعناوينُ والمحاورُ من الإنتاج.
      </p>

      <div className="mt-7">
        <Segmented
          aria-label="الأرضيّة"
          value={ground}
          onValueChange={(v) => setGround(v as "day" | "night")}
          items={[
            { value: "day", label: "كريميّ" },
            { value: "night", label: "داكن" },
          ]}
        />
      </div>

      <div className="mt-10 stflab">
        {SCREENS.map(({ k, label, C }) => (
          <section key={k}>
            <div className="stnp-cap">
              <b>{label}</b>
              {k === "np" ? <p>شاشةُ التشغيل تملأ الجهازَ ولا تُقسَم، فلا نسخةَ حاسوبٍ لها.</p> : null}
            </div>
            {/* صفّان لا صفٌّ واحد: عتبةُ الحاسوب ٩٠٠ حاويةً، ولو جلس الإطاران
                جنبًا إلى جنبٍ لم يبلغها الأوسعُ فعُرضت نسختا جوّالٍ متطابقتان. */}
            <div className="stflab-row">
              <div className="stflab-ph">
                <div className={`stnp-frame ${root}`} style={{ height: 780 }}>
                  <C />
                </div>
              </div>
              <p className="stnp-cap" style={{ alignSelf: "center" }}>
                <b style={{ fontSize: ".8125rem" }}>جوّال، ٣٧٥</b>
              </p>
            </div>
            {k !== "np" ? (
              <div className="stflab-dt" style={{ marginTop: 18 }}>
                <div className={`stnp-frame ${root}`} style={{ height: 720 }}>
                  <C />
                </div>
                <p className="stnp-cap" style={{ marginTop: 8 }}>
                  <b style={{ fontSize: ".8125rem" }}>حاسوب</b>
                </p>
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
