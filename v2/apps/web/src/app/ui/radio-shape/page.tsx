"use client";

import { useState } from "react";
import { Segmented } from "@adeeb/design-system";
import { Broadcast, SquaresFour, Books, Play, Pause, BookmarkSimple } from "@phosphor-icons/react";
import { MagnifyingGlass, ArrowRight, Plus } from "@/app/_components/glyphs";

/**
 * **لغةُ المحطّة: الجملةُ أم الغلاف؟** (شكوى المالك ٢٠٢٦-٠٩-٠٥).
 *
 * ══ الجولةُ الأولى سقطت ══
 * عُرض أوّلًا اتّجاهان يختلفان في **شريط التنقّل** وحدَه، فردّهما المالك:
 * «نسختَ التصميمَ الحاليَّ فقط». وكان محقًّا: ذلك جدلٌ في التنقّل لا إعادةُ
 * تصميم.
 *
 * ══ والفرقُ الحقيقيُّ قِيس ══
 * أبل وسبوتيفاي **تجعلان الغلافَ بطلَ الشاشة**، ومحطّتُنا تجعله ٤٢ بكسلًا
 * وتضع مكانَه جملةً من التفريغ. وذلك **قرارٌ سابقٌ للمالك** (يوليو: «تُعرَّف
 * الحلقةُ بجملةٍ من كلامها لا بمربّعٍ مصوَّر»)، فهذه الصفحةُ تعرض نقضَه إلى
 * جانبه ولا تنفّذه.
 *
 * ══ وما لا يُعاد فتحُه ══
 * **الأرضيّةُ كريميّةٌ في الاثنين.** اختار المالكُ اللوحةَ ٢٠٢٦-٠٨-٢٨ بعد
 * أن قلبها بيده، فلا يُعاد سؤالُ الليل هنا. والمتبدّلُ **من يتصدّر**.
 * وشريطُ الأبواب السفليُّ واحدٌ في الاثنين كذلك، كي يبقى المتغيّرُ واحدًا.
 *
 * ══ وما هو حقيقيّ ══
 * الأغلفةُ **صورُ الإنتاج نفسُها** من R2، والعناوينُ والمُدَدُ والملخّصاتُ من
 * `radio_episodes`. وغلافُ «منعطف» **فيروزيٌّ** لا كريميٌّ ولا عنّابيّ، ولذلك
 * يُسحَب اللونُ منه (`--stc-tint`) كما يُسحَب `--acf-c` من اللون المفضّل.
 * وبرامجُ الرفِّ الزائدةُ توضيحيّةٌ وتلبس غلافَ المحطّة، لأنّها لا وجودَ لها.
 */

/* ══ ما هو حقيقيّ: من radio_shows و radio_episodes و R2 ═══════════════ */

const R2 = "https://pub-939f06ea1342424cbd3b74aecf6caba1.r2.dev";
const COVER_SHOW = `${R2}/shows/c191fd1e-c5ba-420c-8688-cfeeac24fb23/logo-msqd0t3n.png`;
const COVER_STATION = `${R2}/station/logo-msqd01li.png`;

/** لونُ الغلاف. اليومَ مقروءٌ من الصورة، وفي الإنتاج عمودٌ يُملأ عند الرفع. */
const TINT = "#0e6f8c";

const REAL_EPS = [
  {
    n: 3, title: "أسطورة الشغف", secs: 1228, at: "١٣ أغسطس",
    summary: "«اعمل ما تحب» نصيحة جميلة، لكن متى تحوّلت إلى معيار يقيس فشلنا ونجاحنا؟",
  },
  {
    n: 2, title: "من الحلم إلى الواقع", secs: 1287, at: "١٣ أغسطس",
    summary: "الحلم وحده لا يكفي، فبين الحلم والواقع طريقٌ طويل من العمل والتعلّم والتجربة.",
  },
  {
    n: 1, title: "من أنا فعلاً؟", secs: 696, at: "١٣ أغسطس",
    summary: "سؤالٌ يبدو بسيطًا، لكنه من أصعب ما يواجهه الإنسان في حياته.",
  },
];

/* ══ ما هو توضيحيّ: أربعةُ برامجَ تُقاس بها الرفوف ══════════════════
   عناوينُها طويلةٌ عمدًا: رفٌّ يُختبَر بكلمةٍ واحدةٍ يكذب. */
const SHOWS = [
  { t: "منعطف", s: "٣ حلقات", cover: COVER_SHOW },
  { t: "على هامش الكلمة", s: "١٢ حلقة", cover: COVER_STATION },
  { t: "ما لا يُقال في المجالس", s: "٧ حلقات", cover: COVER_STATION },
  { t: "ترجمانُ الأشواق", s: "٥ حلقات", cover: COVER_STATION },
];

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const mins = (s: number) => `${Math.round(s / 60)} دقيقة`;

/* ══ الهيكلُ المشترك: شريطُ أبوابٍ وكبسولةُ مشغّل ═══════════════════
   واحدٌ في الاتّجاهين عمدًا، فما يُقارَن اللغةُ البصريّةُ وحدَها. */

const TABS = [
  { k: "home", label: "المحطّة", Icon: Broadcast },
  { k: "browse", label: "تصفَّح", Icon: SquaresFour },
  { k: "lib", label: "مكتبتي", Icon: Books },
  { k: "find", label: "بحث", Icon: MagnifyingGlass },
] as const;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <span className="stx-mini">
        <span className="stx-mini-art" aria-hidden>
          <img src={COVER_SHOW} alt="" />
        </span>
        <span className="stx-mini-txt">
          <span className="stx-mini-t">أسطورة الشغف</span>
          <span className="stx-mini-s">منعطف</span>
        </span>
        <span className="stx-mini-b" aria-hidden><Pause weight="fill" /></span>
        <span className="stx-mini-prog" aria-hidden><i style={{ width: "41%" }} /></span>
      </span>
      <nav className="stx-tabs">
        {TABS.map(({ k, label, Icon }) => (
          <span key={k} className="stx-tab" aria-current={k === "home" ? "page" : undefined}>
            <Icon aria-hidden />
            {label}
          </span>
        ))}
      </nav>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   أ. الجملة — القائمُ اليوم: الحلقةُ تُعرَّف بكلامها
   ══════════════════════════════════════════════════════════════════ */

function Sentence() {
  return (
    <Shell>
      <div className="stn stnp-scroll">
        <div className="stx-top">
          <h1>المحطّة</h1>
          <span className="stx-top-a">مساءَ الخير</span>
        </div>

        <div className="stn-page" style={{ paddingTop: 0, paddingBottom: 132 }}>
          <span className="stn-find">
            <MagnifyingGlass aria-hidden />
            ابحث في البرامج والحلقات وفي الكلام نفسه
          </span>

          <div className="stn-now">
            <span className="stn-now-kick"><i aria-hidden />أحدثُ حلقة</span>
            <p className="stn-quote">ليس كلُّ وظيفةٍ لازمًا أن تكون قصّةَ حبّ</p>
            <span className="stn-now-src">أسطورة الشغف، من منعطف</span>
            <span className="stn-now-foot">
              <span className="stn-now-play" aria-hidden><Play weight="fill" /></span>
              <span className="stn-now-meta">
                <span className="stn-now-title">استمع الآن</span>
                <span className="stn-now-dur">{mmss(1228)}</span>
              </span>
            </span>
          </div>

          <div className="stn-sec">
            <div className="stn-shead">
              <h2>الحلقات</h2>
              <span className="stn-more">الكلّ <ArrowRight aria-hidden /></span>
            </div>
            <div className="stn-rows">
              {REAL_EPS.map((e) => (
                <span key={e.n} className="stn-row">
                  <span className="stn-row-play" aria-hidden><Play weight="fill" /></span>
                  <span className="stn-row-b">
                    <span className="stn-row-t">{e.title}</span>
                    <span className="stn-row-meta">{mmss(e.secs)}، {e.at}</span>
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="stn-sec">
            <div className="stn-shead">
              <h2>البرامج</h2>
              <span className="stn-more">الكلّ <ArrowRight aria-hidden /></span>
            </div>
            <div className="stn-rail">
              {SHOWS.map((s) => (
                <span key={s.t} className="stn-card">
                  <span className="stn-card-b" aria-hidden>
                    <span className="stn-art-n">{s.t.replace(/^ال/, "").charAt(0)}</span>
                  </span>
                  <span className="stn-card-t">{s.t}</span>
                  <span className="stn-card-show">{s.s}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ب. الغلاف — الصورةُ تتصدّر، واللونُ يُسحَب منها
   ══════════════════════════════════════════════════════════════════ */

function Cover() {
  return (
    <Shell>
      <div className="stn stnp-scroll">
        {/* لا رأسَ فوق الصدر: الغلافُ يبدأ من الحافّة، وهو ما يفعله أقرانُنا */}
        <div className="stc-hero">
          <span className="stc-hero-bg" aria-hidden>
            <img src={COVER_SHOW} alt="" />
          </span>
          <span className="stc-cover">
            <img src={COVER_SHOW} alt="" />
          </span>
          <div className="stc-hero-in">
            <span className="stc-hero-k"><i aria-hidden />أحدثُ حلقة</span>
            <h1 className="stc-hero-t">أسطورة الشغف</h1>
            <p className="stc-hero-s">منعطف، {mins(1228)}</p>
            <div className="stc-hero-acts">
              <span className="stc-play"><Play weight="fill" aria-hidden />استمع الآن</span>
              <span className="stc-icon" aria-hidden><Plus /></span>
              <span className="stc-icon" aria-hidden><BookmarkSimple /></span>
            </div>
          </div>
        </div>

        <div className="stn-page" style={{ paddingTop: 0, paddingBottom: 132 }}>
          <div className="stn-sec" style={{ marginTop: "var(--stn-s4)" }}>
            <div className="stn-shead">
              <h2>البرامج</h2>
              <span className="stn-more">الكلّ <ArrowRight aria-hidden /></span>
            </div>
            <div className="stc-rail">
              {SHOWS.map((s) => (
                <span key={s.t} className="stc-cov">
                  <img src={s.cover} alt="" />
                  <b>{s.t}</b>
                  <span>{s.s}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="stn-sec">
            <div className="stn-shead">
              <h2>حلقاتٌ حديثة</h2>
              <span className="stn-more">الكلّ <ArrowRight aria-hidden /></span>
            </div>
            <div>
              {REAL_EPS.map((e) => (
                <div key={e.n} className="stc-ep">
                  <img className="stc-ep-th" src={COVER_SHOW} alt="" />
                  <div className="stc-ep-b">
                    <span className="stc-ep-k">منعطف</span>
                    <span className="stc-ep-t">{e.title}</span>
                    <p className="stc-ep-s">{e.summary}</p>
                    <div className="stc-ep-acts">
                      <span className="stc-ep-btn">
                        <i><Play weight="fill" aria-hidden />{mins(e.secs)}</i>
                      </span>
                      <span className="stc-ep-btn">
                        <i><Plus aria-hidden />لاحقًا</i>
                      </span>
                      <span className="stc-ep-min">{e.at}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ══ الصفحة ══════════════════════════════════════════════════════ */

export default function RadioShapePage() {
  const [only, setOnly] = useState<"both" | "a" | "b">("both");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="font-latin text-xs tracking-widest text-muted">RADIO / SHAPE</p>
      <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">
        لغةُ المحطّة
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-8 text-muted">
        الفرقُ بيننا وبين أبل وسبوتيفاي أنّهما تجعلان الغلافَ بطلَ الشاشة، ونحن
        نجعله ٤٢ بكسلًا ونضع مكانَه جملة. والأرضيّةُ كريميّةٌ في الاثنين وشريطُ
        الأبواب واحدٌ فيهما، فالمتغيّرُ من يتصدّر. والأغلفةُ صورُ الإنتاج نفسُها،
        وغلافُ منعطفٍ فيروزيّ، فاللونُ يُسحَب منه لا يُفرَض عليه.
      </p>

      <div className="mt-7">
        <Segmented
          aria-label="ما يُعرَض"
          value={only}
          onValueChange={(v) => setOnly(v as "both" | "a" | "b")}
          items={[
            { value: "both", label: "الاثنان" },
            { value: "a", label: "الجملة وحدها" },
            { value: "b", label: "الغلاف وحده" },
          ]}
        />
      </div>

      <div className="mt-8 shplab">
        {only !== "b" ? (
          <div className="shplab-col">
            <div className="stnp-cap">
              <b>أ. الجملة</b>
              <p>
                القائمُ اليوم. الحلقةُ تُعرَّف بجملةٍ من كلامها، والغلافُ حرفٌ في
                مربّع. لغةٌ مطبوعةٌ تقرأ نفسَها مجلّةً.
              </p>
            </div>
            <div className="stnp-frame stn" style={{ height: 760 }}><Sentence /></div>
          </div>
        ) : null}

        {only !== "a" ? (
          <div className="shplab-col">
            <div className="stnp-cap">
              <b>ب. الغلاف</b>
              <p>
                الصورةُ تتصدّر من الحافّة، ولونُ الصفحة من لونها، والحلقةُ صفٌّ
                بمصغَّرةٍ وملخّصٍ وأفعالٍ ظاهرة. لغةُ مشغّلٍ لا مجلّة.
              </p>
            </div>
            <div
              className="stnp-frame stn stc"
              style={{ height: 760, "--stc-tint": TINT } as React.CSSProperties}
            >
              <Cover />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
