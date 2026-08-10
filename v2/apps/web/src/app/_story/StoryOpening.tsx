"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import {
  Aperture,
  BookOpenText,
  Books,
  Camera,
  Clover,
  CoffeeBean,
  Feather,
  FilmReel,
  FilmSlate,
  FilmStrip,
  ImagesSquare,
  MegaphoneSimple,
  MicrophoneStage,
  Newspaper,
  PenNib,
  Sparkle,
  SpeakerHigh,
  SpeakerSlash,
  VideoCamera,
} from "@phosphor-icons/react";
import { fmtDigits, SESSION_KEY, STORY_ASSETS, STORY_CONFIG, storySeen, TIME_MONTHS, WALL_SHOTS } from "./config";
import "./story.css";

/* بوابة ما قبل الرسم: تُقرَّر قبل أي paint (سكربت inline) فلا وميض للقصة عند التخطي.
   ?story=skip أو رابط عميق (#قسم) ← تخطٍّ · ?story=force ← يتجاهل sessionStorage. */
const GATE_SCRIPT = `(function(){try{
var q=new URLSearchParams(location.search),f=q.get("story"),h=location.hash;
var skip=f==="skip"||(!!h&&h.length>1);
if(!skip&&${STORY_CONFIG.showOncePerSession}&&f!=="force"&&sessionStorage.getItem("${SESSION_KEY}"))skip=true;
if(skip)document.documentElement.setAttribute("data-adeeb-story","skip");
}catch(e){}})();`;

/* حروف الفصل الأول المتناثرة — بينها أحرف «أديب» بنغمة ذهبية */
const LETTERS: Array<{ ch: string; x: string; y: string; r: string; d: number; accent?: boolean }> = [
  { ch: "أ", x: "8%", y: "18%", r: "-12deg", d: 1.3, accent: true },
  { ch: "د", x: "22%", y: "64%", r: "8deg", d: 0.7, accent: true },
  { ch: "ي", x: "15%", y: "38%", r: "-6deg", d: 1.0 },
  { ch: "ب", x: "30%", y: "22%", r: "14deg", d: 0.5, accent: true },
  { ch: "ح", x: "42%", y: "72%", r: "-10deg", d: 1.2 },
  { ch: "ك", x: "55%", y: "15%", r: "6deg", d: 0.8 },
  { ch: "ا", x: "64%", y: "58%", r: "-4deg", d: 1.4 },
  { ch: "ي", x: "72%", y: "30%", r: "10deg", d: 0.6, accent: true },
  { ch: "ة", x: "82%", y: "66%", r: "-14deg", d: 1.0 },
  { ch: "ق", x: "88%", y: "24%", r: "8deg", d: 1.1 },
  { ch: "ل", x: "48%", y: "40%", r: "-8deg", d: 0.9 },
  { ch: "م", x: "35%", y: "48%", r: "12deg", d: 1.15 },
  { ch: "ن", x: "78%", y: "46%", r: "-6deg", d: 0.75 },
];

/* بطاقات الفصل الثاني — البطلتان حقيقيتان، والبقية عناوين مؤقتة
   TODO: تُستبدل العناوين المؤقتة والصور الحقيقية عند وصولها */
const CARDS: Array<{
  type: string;
  title: string;
  hero?: boolean;
  Icon: typeof PenNib;
  g: [string, string];
}> = [
  { type: "دورة تدريبية", title: "مهارات الإلقاء الإذاعي والتلفزيوني", Icon: MicrophoneStage, g: ["#1d3a54", "#0f1d2b"] },
  { type: "معرض", title: "عام القهوة السعودية 2022", Icon: CoffeeBean, g: ["#16324a", "#0c1926"] },
  { type: "معرض", title: "لسان مُبين، معرضٌ صنعه أدِيب.", hero: true, Icon: BookOpenText, g: ["#2a4d6d", "#132436"] },
  { type: "جلسة حوارية", title: "دور السينما في التسويق للسياحة", Icon: FilmSlate, g: ["#20415c", "#101f2e"] },
  { type: "حملة توعوية", title: "#أديب_يطمئنكم بمناسة اليوم العالمي لسرطان الثدي", Icon: MegaphoneSimple, g: ["#1a3750", "#0e1c29"] },
  { type: "جلسة حوارية", title: "هل تويتر وريث الصحف؟", Icon: Newspaper, g: ["#1d3a54", "#0f1d2b"] },
  { type: "شراكة", title: "أدِيب شريك نجاح في معرض جامعة الملك فيصل الثاني للكتاب", hero: true, Icon: Books, g: ["#2a4d6d", "#132436"] },
  { type: "ملتقى", title: "ملتقى أدِيب للشباب الجامعي", Icon: Sparkle, g: ["#16324a", "#0c1926"] },
  { type: "معرض", title: "المعطاء كفو", Icon: Clover, g: ["#20415c", "#101f2e"] },
  { type: "معرض", title: "يوم التأسيس", Icon: Feather, g: ["#1a3750", "#0e1c29"] },
];

/* أيقونات البطاقات البديلة — واحدة لكل لقطة بترتيب WALL_SHOTS، تظهر حتى تصل
   صورتها الحقيقية ثم تختفي من نفسها (اتساقًا مع بطاقات الفصل الثاني) */
const SHOT_ICONS: Array<typeof PenNib> = [
  FilmSlate,
  Camera,
  FilmReel,
  Aperture,
  VideoCamera,
  FilmStrip,
  ImagesSquare,
  Sparkle,
];

/* التاريخ الساكن لنسخة تقليل الحركة/بلا JS — ميلاديّ العرض دومًا
   (العرض الهجري حكر على المسار الحي حيث يشتقه Intl في story.ts) */
function staticDate(date: string): string {
  if (date === "live") return "";
  const [y, m, d] = date.split("-").map(Number);
  const month = TIME_MONTHS.gregorian[(m || 1) - 1];
  return d ? `${fmtDigits(d)} ${month} ${fmtDigits(y)}` : `${month} ${fmtDigits(y)}`;
}

/* محطة زمن بين فصلين: مقطع تثبيت فارغ يقوده بطل الوقت في المسار الحي،
   ومضمونها الساكن (kicker + تاريخ) يظهر في نسخة تقليل الحركة/بلا JS فقط */
function StationBreak({ i }: { i: number }) {
  const s = STORY_CONFIG.timeHero.stations[i];
  return (
    <section className="st-scene st-station" aria-label={s.kicker}>
      <div className="st-station-static">
        <p className="st-kicker">{s.kicker}</p>
        <p className="st-station-date">{staticDate(s.date)}</p>
      </div>
    </section>
  );
}

/* force: صفحة المعاينة وحدها — القصة هناك موضوعُ الصفحة لا افتتاحيّةُ زيارة،
   فتُعرض في كل مرة ولو رُئيت في هذه الجلسة. */
export function StoryOpening({ force = false }: { force?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const html = document.documentElement;

    /* للهبوط مدخلان، والبوابة تُقرأ في كليهما: التحميل الكامل يقرّره سكربت ما
       قبل الرسم أعلاه، والتنقّل داخل الموقع (رجوعٌ إلى الهبوط من صفحةٍ أخرى)
       يقرّره هذا الموضع — فالقصة تُعرض مرّة واحدة لكل دخولٍ للموقع لا لكل مرور
       على الصفحة. والشرط هنا صدى شرطِ السكربت (رُئيت · رابطٌ عميق)، وباراميتر
       ?story= يُترك لصاحبه: لا يصل إلا في تحميلٍ كامل قد قرّره السكربت. */
    if (force) html.removeAttribute("data-adeeb-story");
    else if (!new URLSearchParams(location.search).get("story") && (storySeen() || location.hash.length > 1))
      html.setAttribute("data-adeeb-story", "skip");

    if (html.getAttribute("data-adeeb-story") === "skip") return;

    let destroyed = false;
    let destroy: (() => void) | undefined;

    // تهيئة كسولة بعد تحميل الصفحة (لا تنافس المحتوى الحرج)
    const boot = () => {
      void import("./story").then(async (m) => {
        if (destroyed) return;
        destroy = await m.initStory(root);
        // احتمال سباق: أُلغي التركيب أثناء انتظار الخطوط/الصور داخل initStory
        if (destroyed) destroy?.();
      });
    };
    if (document.readyState === "complete") boot();
    else window.addEventListener("load", boot, { once: true });

    return () => {
      destroyed = true;
      window.removeEventListener("load", boot);
      destroy?.();
    };
  }, [force]);

  return (
    <>
      {!force && <script dangerouslySetInnerHTML={{ __html: GATE_SCRIPT }} />}
      <div id="adeeb-story" ref={rootRef} data-cursor-ink>
        {/* الطبقات الثابتة */}
        <div className="st-bg" aria-hidden="true" />
        <div className="st-grain" aria-hidden="true" />
        <div className="st-flash" aria-hidden="true" />

        {/* ---------- المشهد 0 — الافتتاح ---------- */}
        <section className="st-scene st-intro" aria-label="افتتاح القصة">
          <div className="st-intro-stack">
            <p className="st-line st-intro-l1">كـل حكايةٍ عظيمة تبدأ بحرف!</p>
            <p className="st-line st-intro-l2">
              وهذه حكـاية <em>أدِيب</em>
            </p>
          </div>
          <div className="st-cue" aria-hidden="true">
            {/* تعريفٌ بالخلفية الصوتية قبل بدء القصة — يخرج مع المؤشّر نفسه،
                ويزول قبل ذلك متى صارت مسموعة (st-sound-live) */}
            <p className="st-cue-sound">
              <SpeakerHigh />
              للحكـاية خلفيةٌ صوتيّة شغلها لتجربة أفضل
            </p>
            <span>مرِّر للأسفل</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </section>

        {/* ---------- محطة البداية: من يوم الزائر عودًا إلى التأسيس ---------- */}
        <StationBreak i={0} />

        {/* ---------- الفصل الأول — البذرة ---------- */}
        <section className="st-scene st-ch1" aria-label="الفصل الأول: البذرة">
          <div className="st-letters" aria-hidden="true">
            {LETTERS.map((l, i) => (
              <span
                key={i}
                className="st-ltr"
                data-depth={l.d}
                data-tone={l.accent ? "accent" : undefined}
                style={{ "--lx": l.x, "--ly": l.y, "--lr": l.r } as CSSProperties}
              >
                {l.ch}
              </span>
            ))}
          </div>
          <div className="st-ch1-inner">
            <figure className="st-oldlogo" data-src={STORY_ASSETS.oldLogo} />
            <div className="st-ch1-copy">
              <h2 className="st-kicker">بدءُ الحكـاية</h2>
              <p className="st-ch-text">في جـــامـعـة الملك فـيصـل، اجـتمـع شغفٌ بالحرف وإيمانٌ بالكـلمة.. فكـان أدِيب</p>
            </div>
          </div>
        </section>

        {/* ---------- محطة الأثر ---------- */}
        <StationBreak i={1} />

        {/* ---------- الفصل الثاني — الأثر (مسار أفقي) ---------- */}
        <section className="st-scene st-ch2" aria-label="الفصل الثاني: الأثر">
          <div className="st-ch2-head">
            <h2 className="st-kicker">حكـايةٌ تتناقلها الألسن</h2>
            <p className="st-ch-text">أكثر من 15 مُشاركـة ومعرض ومحفل</p>
          </div>
          <div className="st-trackwrap">
            <div className="st-track">
              {CARDS.map((c, i) => (
                <article
                  key={i}
                  className={c.hero ? "st-card st-card-hero" : "st-card"}
                  style={{ "--cg1": c.g[0], "--cg2": c.g[1] } as CSSProperties}
                >
                  <div className="st-card-icon" aria-hidden="true">
                    <c.Icon />
                  </div>
                  {/* رقم الملفّ المنتظَر — دليلٌ يزول من نفسه مع وصول الصورة */}
                  <span className="st-card-num" aria-hidden="true">
                    {fmtDigits(String(i + 1).padStart(2, "0"))}
                  </span>
                  <div className="st-card-foot">
                    <span className="st-card-badge">{c.type}</span>
                    <h3 className="st-card-title">{c.title}</h3>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- محطة التتويج (هبوط slot-machine) ---------- */}
        <StationBreak i={2} />

        {/* ---------- الفصل الثالث — التتويج ---------- */}
        <section className="st-scene st-ch3" aria-label="الفصل الثالث: التتويج">
          <div className="st-rays" aria-hidden="true" />
          <canvas className="st-canvas" aria-hidden="true" />
          <div className="st-ch3-inner">
            <div className="st-shield-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="st-shield" src={STORY_ASSETS.shield} alt="درع المركز الأول" />
              {/* اللمعان طبقتان: الحاضنة مُقنَّعة بصورة الدرع وثابتة لا تتحرّك،
                  والشريط وحده يعبر داخلها — فلا يخرج البريق عن حدود الدرع */}
              <div
                className="st-sweep"
                aria-hidden="true"
                style={{ "--st-shield-mask": `url(${STORY_ASSETS.shield})` } as CSSProperties}
              >
                <i className="st-sweep-band" />
              </div>
            </div>
            <div className="st-crown-copy">
              <h2 className="st-crown-title">المركز الأول</h2>
              <p className="st-crown-sub">
                أفضل نادٍ طلابي من بين أكثر من <bdi className="st-count" dir="ltr">0</bdi> ناديًا
              </p>
              <p className="st-crown-tail">في عامه الأول</p>
            </div>
          </div>
        </section>

        {/* ---------- محطة التجدّد ---------- */}
        <StationBreak i={3} />

        {/* ---------- الفصل الرابع — التجدّد ---------- */}
        <section className="st-scene st-ch4" aria-label="الفصل الرابع: التجدّد">
          <div className="st-ch4-inner">
            <div className="st-ch4-logos">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="st-oldlogo2" src={STORY_ASSETS.oldLogo} alt="" aria-hidden="true" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="st-newlogo-static" src={STORY_ASSETS.newLogo} alt="شعار نادي أديب" />
            </div>
            <div className="st-ch4-copy">
              <h2 className="st-kicker">حكـايةٌ تجاوزت الأسوار</h2>
              <p className="st-renew-l1">هويةٌ تتجدد… وروحٌ لا تتغيّر</p>
            </div>
          </div>
        </section>

        {/* ---------- جدار الذكريات — لحظاتُ الكواليس تُعلَّق واحدةً تلو الأخرى ----------
            العمود (.st-wall) جسمٌ واحد يعلو بتقدّم التمرير، وفي نقطة تعليقٍ ثابتة
            أخفضَ قليلًا من وسط الشاشة تستقرّ كلُّ صورةٍ بحجمها الكامل غير مقصوصة.
            الجهات والميلان من WALL_SHOTS، والحركة في story.ts. والمشهد كلّه على
            لوحة الهوية الفاتحة نفسها التي سلّمها الفصل الرابع — لا لوحة له.
            سطر «وما زالت الحكاية تُكتب…» يختم المشهد (نُقل من بطل الوقت). */}
        <section className="st-scene st-wall-scene" aria-label="جدار الذكريات">
          {/* حجابُ الشعار: تدرّجٌ من لون الخلفية أعلى المسرح — يمرّ العمود تحته
              وتذوب فيه الصور الصاعدة، فلا يتصادم شيءٌ مع الشعار ولا مع الـkicker */}
          <div className="st-wall-veil" aria-hidden="true" />
          {/* وحجابٌ يقابله أسفل المسرح: البطاقة تبدأ دخولها قبل بلوغها نقطة
              التعليق، فتقضي أوّلَه في خانةٍ تحت الشاشة — يسترها هذا حتى تصعد،
              فتخرج منه مؤتلفةً لا فجأةً، ولا يعلو العدّادَ شيءٌ من الصور */}
          <div className="st-wall-veil-b" aria-hidden="true" />

          <p className="st-kicker st-wall-kicker">من كـواليس الحكـاية…</p>

          <div className="st-wall" aria-hidden="true">
            {WALL_SHOTS.map((s, i) => {
              const Icon = SHOT_ICONS[i];
              return (
                <div key={i} className="st-shot" data-side={s.side} style={{ "--i": i } as CSSProperties}>
                  <figure className="st-frame">
                    <span className="st-shot-img">
                      {/* بطاقةٌ بديلة حتى وصول الصورة — بالإطار نفسه فلا يبدو الجدار ناقصًا.
                          بلا رقم: لا ترقيمَ للصور في هذا المشهد البتّة */}
                      <span className="st-shot-ph">
                        <Icon />
                      </span>
                    </span>
                  </figure>
                  {/* تعليق النسخة الساكنة وحده (تحت الصورة) — المسار الحيّ يستعمل
                      .st-wall-cap الواحد المتموضع في الفراغ المقابل */}
                  <p className="st-shot-cap">{s.cap}</p>
                </div>
              );
            })}
          </div>

          {/* التعليق الحيّ: عنصرٌ واحد يستقرّ في محاذاة نقطة التعليق ارتفاعًا،
              وينتقل إلى الجهة المقابلة للصورة الحاضرة (data-side يكتبه story.ts) */}
          <p className="st-wall-cap" data-side="-1" aria-hidden="true" />

          <p className="st-wall-tribute">خلف كـل إنجازٍ أُدباء صنعوه</p>
          <p className="st-wall-tail">وما زالت الحكـاية تُكتب…</p>
        </section>

        {/* ---------- الخاتمة — منطقة التسليم ---------- */}
        <section className="st-scene st-final" aria-hidden="true" />

        {/* الشعار الطائر: من مركز الشاشة إلى موضع شعار الهيدر. شعارٌ واحد بلا
            توأم: المشهد الأخير لا يُظلم، فالشعار الملوّن مقروءٌ على لوحة الهوية
            من الفصل الرابع حتى التسليم بلا انقطاع. */}
        <div className="st-logo-layer" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="st-newlogo" src={STORY_ASSETS.newLogo} alt="" />
        </div>

        {/* بطل الوقت — عنصر التاريخ الواحد الدائم (hero ↔ ghost)؛ بكراته تُبنى وتُقاد في story.ts */}
        <div className="st-time" id="time-hero" aria-hidden="true">
          <p className="st-time-kicker" />
          <div className="st-time-date">
            <span className="st-reel st-reel-day"><span className="st-strip" /></span>
            <span className="st-reel st-reel-month"><span className="st-strip" /></span>
            <span className="st-reel st-reel-year"><span className="st-strip" /></span>
          </div>
        </div>

        {/* ---------- HUD ---------- */}
        <div className="st-hud">
          <div className="st-chap" aria-hidden="true">
            {[0, 1, 2, 3].map((c) => (
              <span key={c} className="st-chap-dash">
                <i />
              </span>
            ))}
          </div>
          {/* مفتاح الصوت — في الزاوية التي أخلاها زرّ التخطّي حين تمركز، فلا
              يزاحمه ولا يزاحم شرطات الفصول. حالتُه في data-on يكتبها story.ts */}
          <button type="button" className="st-sound" data-on="0" aria-pressed="false" aria-label="الخلفية الصوتية">
            <SpeakerHigh className="st-sound-on" aria-hidden="true" />
            <SpeakerSlash className="st-sound-off" aria-hidden="true" />
            {/* الدعوة: حلقةٌ تنبض وتلميحةٌ تعرّف بالخلفية — تظهران بـdata-hint
                الذي يكتبه story.ts عند أوّل تمرير، ولا تعودان بعد هدوئهما */}
            <span className="st-sound-ring" aria-hidden="true" />
            <span className="st-sound-tip" aria-hidden="true">أضغط لسماع الخلفية</span>
          </button>
          <button type="button" className="st-skip">
            تخطّي القصة
          </button>
        </div>
      </div>
    </>
  );
}
