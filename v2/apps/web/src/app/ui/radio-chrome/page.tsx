"use client";

import { useState } from "react";
import { Footer, Header, Segmented } from "@adeeb/design-system";
import { Play } from "@phosphor-icons/react";
import { CaretLeft, MagnifyingGlass, ArrowSquareOut } from "@/app/_components/glyphs";

/**
 * **رأسُ الموقع وتذييلُه داخلَ المحطّة: ثلاثةٌ تُعرَض** (طلبُ المالك ٢٠٢٦-٠٨-٢٨).
 *
 * ══ لِمَ السؤالُ أصلًا ══
 * قِيس التنافر: جسدُ الموقع درجتُه **٢١٦°** باردة وسطحُ المحطّة **٤٠°** دافئة،
 * و**١٧٦° تفرّقهما** — نقيضان على عجلة اللون. والإضاءةُ واحدةٌ في الاثنين
 * (٩٧٪) فلا شيءَ يفصلهما إلّا القفزةُ الحراريّة، فتُقرأ الصفحةُ وكأنّها بدّلت
 * جلدَها في منتصف التمرير: أزرقٌ ثمّ كريميٌّ ثمّ أزرق.
 *
 * ══ وما في هذه الشاشة حقيقيّ ══
 * الرأسُ والتذييلُ **مكوّنا المكتبة نفسُهما** لا رسمٌ يحاكيهما، فما تراه هو ما
 * سينزل. والفرقُ بين «أ» و«ب» **صنفٌ واحدٌ يُضاف**، ولا سطرَ في مكوّنيهما
 * يُمَسّ. و«ج» وحدَه مرسومٌ لهذه المعاينة، لأنّه لا وجودَ له.
 */

const NAV = [
  { href: "/", label: "أعمالنا" },
  { href: "/activities", label: "فعالياتنا وبرامجنا" },
  { href: "/news", label: "منصة الأخبار" },
  { href: "/library", label: "المكتبة" },
  { href: "/radio", label: "الإذاعة" },
  { href: "/deebo", label: "ديبو" },
];

/** شريطُ محتوًى من المحطّة، كي يُرى التماسُّ بين الحرارتين لا الرأسُ وحدَه. */
function Body() {
  return (
    <div className="stn">
      <div className="stn-page" style={{ paddingBlock: "16px 20px" }}>
        <div className="stn-mast">
          <span className="stn-mast-logo" aria-hidden>
            <span className="stn-art-n">أ</span>
          </span>
          <span className="stn-mast-txt">
            <span className="stn-mast-name">إذاعة أدِيب</span>
            <span className="stn-mast-sub">حيثُ يَصيرُ الصوتُ أثرًا</span>
          </span>
        </div>

        <span className="stn-find">
          <MagnifyingGlass aria-hidden />
          ابحث في البرامج والحلقات وفي الكلام نفسه
        </span>

        <div className="stn-now">
          <span className="stn-now-kick">
            <i aria-hidden />
            أحدثُ حلقة
          </span>
          <p className="stn-quote" style={{ fontSize: "1.125rem" }}>
            ليس كلُّ وظيفةٍ لازمًا أن تكون قصّةَ حبّ
          </p>
          <span className="stn-now-foot">
            <span className="stn-now-play" aria-hidden>
              <Play weight="fill" />
            </span>
            <span className="stn-now-meta">
              <span className="stn-now-title">أسطورة الشغف، منعطف</span>
              <span className="stn-now-dur">13 أغسطس 2026</span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** الخيارُ الثالث: رأسٌ للمحطّة وحدَها. مرسومٌ هنا لأنّه لا وجودَ له. */
function StationHeader() {
  return (
    <div className="stnh">
      <div className="stnh-bar">
        <span className="stnh-mark">
          <span aria-hidden>أ</span>
          إذاعة أدِيب
        </span>
        <nav className="stnh-nav">
          <a href="#a" aria-current="page">
            المحطّة
          </a>
          <a href="#b">البرامج</a>
          <a href="#c">بحث</a>
        </nav>
        <span className="stnh-out">
          نادي أدِيب
          <ArrowSquareOut aria-hidden />
        </span>
      </div>
    </div>
  );
}

const OPTIONS = [
  {
    key: "a",
    label: "أ: كما هو",
    note: "رأسُ الموقع وتذييلُه بلا تبديل. المحطّةُ جزيرةٌ دافئةٌ بين طرفين باردين، والإضاءةُ واحدةٌ فلا يفصلهما إلّا اللون.",
  },
  {
    key: "b",
    label: "ب: متلوّن",
    note: "البنيةُ والروابطُ والشعارُ والخطّ كما هي، وتُعاد تسميةُ الرموز من رموز المحطّة. صنفٌ واحدٌ يُضاف، ولا سطرَ في المكوّنين يُمَسّ.",
  },
  {
    key: "c",
    label: "ج: رأسٌ خاصّ",
    note: "تنقّلُ المحطّة يحلّ محلّ تنقّل الموقع، وبابٌ صغيرٌ يعود إلى النادي. أقوى هويّةً، والثمنُ أنّ الإذاعة تصير جزيرةً وهي واحدةٌ من ثمانية أقسام.",
  },
];

const SIZES = [
  { key: "375", label: "جوّال", w: 375, h: 780 },
  { key: "1180", label: "مكتب", w: 1180, h: 700 },
];

export default function RadioChromePage() {
  const [size, setSize] = useState("375");
  const z = SIZES.find((x) => x.key === size)!;

  return (
    <main className="px-5 py-8">
      <div>
        <div className="chrmp-cap">
          <b>رأسُ الموقع وتذييلُه داخلَ المحطّة</b>
          <p>
            قِيس التنافر: جسدُ الموقع درجتُه ٢١٦° باردة وسطحُ المحطّة ٤٠° دافئة، و١٧٦° تفرّقهما.
            والإضاءةُ واحدةٌ في الاثنين، فلا يفصلهما إلّا اللون. والرأسُ والتذييلُ أدناه مكوّنا
            المكتبة نفسُهما، فما تراه هو ما سينزل.
          </p>
        </div>

        <div className="mb-4">
          <Segmented
            aria-label="المقاس"
            items={SIZES.map((x) => ({ value: x.key, label: x.label }))}
            value={size}
            onValueChange={setSize}
          />
        </div>

        <div className="flex flex-wrap items-start gap-6">
          {OPTIONS.map((o) => (
            <div key={o.key} style={{ width: z.w, maxWidth: "100%" }}>
              <div className="chrmp-cap">
                <b>{o.label}</b>
                <p>{o.note}</p>
              </div>
              <div className="chrmp-frame" style={{ height: z.h }}>
                <div className={`chrmp-scroll${o.key === "a" ? "" : " stn-chrome stn-ground"}`}>
                  {o.key === "c" ? (
                    <StationHeader />
                  ) : (
                    <Header
                      nav={NAV}
                      activeHref="/radio"
                      ctaHref="/join"
                      className={o.key === "b" ? "stn-chrome" : undefined}
                    />
                  )}
                  <Body />
                  <Footer className={o.key === "a" ? undefined : "stn-chrome"} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-content-muted">
          رأيي: <b>ب</b>. لا يتحرّك رابطٌ ولا يغيب شعار، وتتبع الحرارةُ المحتوى كما تفعل أبل في
          صفحات منتجاتها. و<b>ج</b> يكسب هويّةً بثمنِ تنقّل: من دخل الإذاعةَ يجب أن يخرج منها بضغطة.
          <CaretLeft aria-hidden className="inline-block" />
        </p>
      </div>
    </main>
  );
}
