"use client";

import { useState } from "react";
import { Container, Segmented } from "@adeeb/design-system";
import {
  Play,
  Pause,
  SkipForward,
  BookOpen,
  Moon,
  MusicNotes,
  Clock,
  BookmarkSimple,
  ShareNetwork,
  ListPlus,
} from "@phosphor-icons/react";
import {
  MagnifyingGlass,
  CaretLeft,
  CaretDown,
  ArrowCounterClockwise,
  ArrowClockwise,
  Plus,
  Check,
} from "@/app/_components/glyphs";

/**
 * **إذاعة أدِيب: اللغةُ البصريّة الجديدة** — معاينةٌ تُقَرّ ثمّ تُطبَّق.
 *
 * ══ الأطروحة: «الجملةُ قبل الغلاف» ══
 * كلُّ منصّات البودكاست تعرّف الحلقةَ بمربّعٍ مصوَّر. ونحن نملك ما لا تملكه:
 * **نصَّ الحلقة مكتوبًا كاملًا** (قِيس في القاعدة: ٦٣١٤ و١٢١٦٧ و١٢٤٠٥ حرفًا
 * للحلقات الثلاث). فتُعرَّف الحلقةُ عندنا **بجملةٍ من كلامها**.
 *
 * وهذا يحلّ ثلاثةً بضربةٍ واحدة: يميّز المحطّةَ عمّن ينافسها، ويجيب سؤالَ
 * «بماذا أسمع؟» بما يقوله الصوتُ نفسُه لا بشعار، ويحلّ **مئةَ برنامجٍ بلا
 * مئةِ غلافٍ مصمَّم** — فالجملةُ تولد مع كلّ حلقةٍ مجّانًا.
 *
 * ══ ما في هذه الشاشة حقيقيّ وما هو توضيحيّ ══
 * منعطفٌ وحلقاتُه الثلاث ونصوصُها ومُددُها وتواريخُها **من القاعدة**،
 * والجملُ **مقتطَعةٌ من نصوص الحلقات حرفًا بحرف**. والبرامجُ الأخرى
 * وأوقاتُ المحاور والموضوعاتُ **توضيحيّةٌ** ترسم الحالَ عند مئة برنامج.
 */

/* ══ ما هو حقيقيّ: من radio_shows و radio_episodes ═══════════════════ */

const EPS = [
  {
    n: 3,
    slug: "ep-3",
    t: "أسطورة الشغف",
    q: "ليس كلُّ وظيفةٍ لازمًا أن تكون قصّةَ حبّ، أحيانًا يكفي أن تكون بابًا يوصلك إلى حياةٍ أفضل.",
    date: "13 أغسطس",
    dur: "20:28",
    left: 0,
  },
  {
    n: 2,
    slug: "ep-2",
    t: "من الحلم إلى الواقع",
    q: "الفرقُ بين الحلم والواقع ليس مسافة، بل الاستمرارُ في السير.",
    date: "13 أغسطس",
    dur: "21:27",
    left: 41,
  },
  {
    n: 1,
    slug: "ep-1",
    t: "من أنا فعلًا؟",
    q: "معرفةُ النفس ليست حدثًا مفاجئًا، ولا إجابةً نجدها في يومٍ واحد.",
    date: "13 أغسطس",
    dur: "11:36",
    left: 100,
  },
];

/* ══ ما هو توضيحيّ: مئةُ برنامجٍ مرسومةً بأربعةَ عشر ═════════════════ */

const SHOWS = [
  { t: "منعطف", topic: "حوار", eps: 3, last: "13 أغسطس", real: true },
  { t: "على الرفّ", topic: "قراءة", eps: 24, last: "أمس" },
  { t: "بيتُ القصيد", topic: "شعر", eps: 61, last: "قبل يومين" },
  { t: "هامش", topic: "نقد", eps: 12, last: "5 أغسطس" },
  { t: "دفترُ المسودّات", topic: "كتابة", eps: 38, last: "1 أغسطس" },
  { t: "سِيَر", topic: "سيرة", eps: 19, last: "29 يوليو" },
  { t: "لغةٌ ثالثة", topic: "ترجمة", eps: 44, last: "22 يوليو" },
  { t: "مجلسُ أدِيب", topic: "حوار", eps: 7, last: "18 يوليو" },
  { t: "قِصَّةٌ قصيرة", topic: "سرد", eps: 90, last: "12 يوليو" },
  { t: "ما بين السطور", topic: "نقد", eps: 33, last: "9 يوليو" },
  { t: "صوتُ الجامعة", topic: "حوار", eps: 15, last: "2 يوليو" },
  { t: "مكتبةُ الليل", topic: "قراءة", eps: 52, last: "28 يونيو" },
];

/** صيغةُ العدد العربيّة: مفردٌ ومثنًّى وجمعُ قلّةٍ وتمييزٌ مفرد. */
function epCount(n: number) {
  if (n === 1) return "حلقةٌ واحدة";
  if (n === 2) return "حلقتان";
  if (n <= 10) return (
    <>
      <bdi dir="ltr">{n}</bdi> حلقات
    </>
  );
  return (
    <>
      <bdi dir="ltr">{n}</bdi> حلقة
    </>
  );
}

const TOPICS = ["حوار", "قراءة", "شعر", "نقد", "سرد", "كتابة", "سيرة", "ترجمة"];

/* محاورُ الحلقة الأولى — عناوينُها من عمود notes، وأوقاتُها توضيحيّة */
const CHAPS = [
  { at: "0:00", t: "من أنا فعلًا؟" },
  { at: "2:14", t: "أين تختبئ الموهبة؟" },
  { at: "5:40", t: "فطرةٌ أم اكتشاف؟" },
  { at: "8:52", t: "من الموهبة إلى الأثر" },
];

/* أسطرُ التفريغ الموقّت — النصُّ من القاعدة، وتقطيعُه توضيحيّ */
const LINES = [
  { at: "2:02", t: "تساؤلاتٌ كثيرةٌ تدور في أذهان الكثير: هل لديّ موهبةٌ فعلًا أم لا؟", now: false },
  { at: "2:14", t: "وإذا كانت لديّ موهبة، فكيف أميّزها عن مجرّد هوايةٍ أو اهتمامٍ عابر؟", now: true },
  { at: "2:31", t: "وهذا الشيء يذكّرني بمقولةٍ لكارل يونغ: من ينظر إلى الخارج يحلم، ومن ينظر إلى الداخل يستيقظ.", now: false },
];

const PEAKS = Array.from({ length: 58 }, (_, i) => {
  const t = i / 58;
  return Math.round(100 * Math.max(0.14, Math.min(1, 0.5 + 0.27 * Math.sin(t * 23) + 0.15 * Math.sin(t * 61))));
});

/* ══ قطعٌ صغيرة ═════════════════════════════════════════════════════ */

const Pat = () => <span className="stn-pat" aria-hidden />;

/**
 * **الغلافُ حرفٌ لا صورة.** لا يملك النادي مئةَ غلافٍ مصمَّم، ولن يملك؛ فالاسمُ
 * نفسُه يصير الغلافَ بخطّ العرض على العنّابيّ. ومئةُ برنامجٍ تُقرأ عندئذٍ محطّةً
 * واحدة، ولا ينتظر برنامجٌ جديدٌ مصمِّمًا ليُنشَر. ومن له شعارٌ حلّ محلَّ الحرف.
 */
function Art({ size = "56", name }: { size?: "56" | "72" | "full"; name: string }) {
  /* حرفُ الاسم الأوّلُ كما يُكتَب: لا اجتزاءَ يُخطئ («على الرفّ» ليست «الرفّ»). */
  return (
    <span className={`stn-art stn-art-${size}`} aria-hidden>
      <span className="stn-art-n">{name.trim()[0]}</span>
    </span>
  );
}

function Wave({ played = 22, className = "stn-wave" }: { played?: number; className?: string }) {
  return (
    <div className={className} aria-hidden>
      {PEAKS.map((v, i) => (
        <i key={i} className={i < played ? "on" : undefined} style={{ height: `${v}%` }} />
      ))}
    </div>
  );
}

function SecHead({ title, more = "عرض الكلّ" }: { title: string; more?: string | null }) {
  return (
    <div className="stn-shead">
      <h2>{title}</h2>
      {more ? (
        <span className="stn-more">
          {more}
          <CaretLeft aria-hidden />
        </span>
      ) : null}
    </div>
  );
}

function Row({ e, show = "منعطف" }: { e: (typeof EPS)[number]; show?: string }) {
  return (
    <div className="stn-row">
      <span className="stn-row-n" aria-hidden>
        {e.n}
      </span>
      <div className="stn-row-b">
        <span className="stn-row-show">{show}</span>
        <span className="stn-row-t">{e.t}</span>
        <p className="stn-row-q">{e.q}</p>
        <div className="stn-row-meta">
          <span className="stn-chip">
            <Clock aria-hidden />
            <bdi dir="ltr">{e.dur}</bdi>
          </span>
          <span>{e.date}</span>
          {e.left > 0 && e.left < 100 ? <span className="stn-chip stn-chip-red">بقي {e.left}٪</span> : null}
          {e.left === 100 ? (
            <span className="stn-chip">
              <Check aria-hidden />
              سمعتَها
            </span>
          ) : null}
        </div>
        {e.left > 0 && e.left < 100 ? (
          <div className="stn-prog">
            <i style={{ width: `${100 - e.left}%` }} />
          </div>
        ) : null}
      </div>
      <button className="stn-row-play" type="button" aria-label={`تشغيل ${e.t}`}>
        <Play weight="fill" aria-hidden />
      </button>
    </div>
  );
}

function Bar() {
  return (
    <div className="stn-bar">
      <div className="stn-bar-line">
        <i style={{ width: "34%" }} />
      </div>
      <div className="stn-bar-in">
        <span className="stn-bar-art" aria-hidden>
          <span className="stn-art-n">م</span>
        </span>
        <span className="stn-bar-b">
          <span className="stn-bar-t">من الحلم إلى الواقع</span>
          <span className="stn-bar-s">منعطف</span>
        </span>
        <button className="stn-bar-btn is-main" type="button" aria-label="إيقاف مؤقّت">
          <Pause weight="fill" aria-hidden />
        </button>
        <button className="stn-bar-btn" type="button" aria-label="الحلقة التالية">
          <SkipForward weight="fill" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/* ══ السطوح ═════════════════════════════════════════════════════════ */

function Station() {
  return (
    <div className="stn-page">
      <div className="stn-mast">
        <span className="stn-mast-logo" aria-hidden>
          <span className="stn-art-n">أدِيب</span>
        </span>
        <span className="stn-mast-txt">
          <span className="stn-mast-name">إذاعة أدِيب</span>
          <span className="stn-mast-sub">برامجُ النادي مسموعةً</span>
        </span>
      </div>

      <button className="stn-find" type="button">
        <MagnifyingGlass aria-hidden />
        ابحث في البرامج والحلقات وفي الكلام نفسه
      </button>

      {/* لوحُ «الآن»: جملةٌ من الحلقة تسبق كلَّ شيء */}
      <div className="stn-now">
        <Pat />
        <span className="stn-now-kick">
          <i aria-hidden />
          أحدثُ حلقة
        </span>
        <p className="stn-quote">{EPS[0].q}</p>
        <div className="stn-now-foot">
          <button className="stn-now-play" type="button" aria-label="تشغيل أسطورة الشغف">
            <Play weight="fill" aria-hidden />
          </button>
          <span className="stn-now-meta">
            <span className="stn-now-title">أسطورة الشغف، منعطف</span>
            <span className="stn-now-dur">
              <bdi dir="ltr">20:28</bdi> ، 13 أغسطس
            </span>
          </span>
        </div>
      </div>

      {/* عمودان عند الاتّساع: الجديدُ يُقرأ بمقاسِ سطرٍ لا بعرض الشاشة،
          والكشفُ (موضوعاتٌ وبرامج) يهاجر إلى جنبه بدل أن يتذيّله. */}
      <div className="stn-cols">
        <div>
          <div className="stn-sec">
            <SecHead title="تابع الاستماع" more={null} />
            <div className="stn-rail">
          {EPS.filter((e) => e.left > 0 && e.left < 100).map((e) => (
            <div className="stn-card" key={e.n}>
              <Art name="منعطف" />
              <span className="stn-card-b">
                <span className="stn-card-show">منعطف</span>
                <span className="stn-card-t">{e.t}</span>
                <span className="stn-card-left">بقي {e.left}٪</span>
              </span>
            </div>
          ))}
        </div>
          </div>
          <div className="stn-sec">
          <SecHead title="جديدُ المحطّة" />
          <div>
            {EPS.map((e) => (
              <Row e={e} key={e.n} />
            ))}
          </div>
          </div>
        </div>

        <div>
      <div className="stn-sec">
        <SecHead title="الموضوعات" more={null} />
        <div className="stn-topics">
          {TOPICS.map((t) => (
            <span className="stn-topic" key={t}>
              <i aria-hidden />
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="stn-sec">
        <SecHead title="البرامج" />
        <div className="stn-grid">
          {SHOWS.slice(0, 4).map((s) => (
            <div key={s.t}>
              <Art size="full" name={s.t} />
              <div className="stn-show-name">{s.t}</div>
              <div className="stn-show-meta">
                {s.topic}، {epCount(s.eps)}
              </div>
            </div>
          ))}
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}

function Directory() {
  return (
    <div className="stn-page">
      <div className="stn-mast">
        <span className="stn-mast-txt">
          <span className="stn-mast-name">برامجُ المحطّة</span>
          <span className="stn-mast-sub">كلُّ ما يُذاع، مبحوثًا ومُنخَلًا</span>
        </span>
      </div>

      <button className="stn-find" type="button">
        <MagnifyingGlass aria-hidden />
        ابحث باسم البرنامج
      </button>

      <div className="stn-sec" style={{ marginTop: 16 }}>
        <div className="stn-tools">
          <button className="stn-pill" type="button" aria-pressed="true">
            الكلّ
          </button>
          {TOPICS.slice(0, 6).map((t) => (
            <button className="stn-pill" type="button" key={t} aria-pressed="false">
              {t}
            </button>
          ))}
        </div>
        <p className="stn-count">
          <bdi dir="ltr">12</bdi> برنامجًا، مرتَّبةً بالأحدثِ حلقةً
        </p>
      </div>

      <div className="stn-sec" style={{ marginTop: 18 }}>
        <div className="stn-grid">
          {SHOWS.map((s) => (
            <div key={s.t}>
              <Art size="full" name={s.t} />
              <div className="stn-show-name">{s.t}</div>
              <div className="stn-show-meta">
                {s.topic}، {epCount(s.eps)}
                <br />
                آخرُها {s.last}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Search() {
  return (
    <div className="stn-page">
      <div className="stn-find" style={{ marginTop: 0 }}>
        <MagnifyingGlass aria-hidden />
        <input defaultValue="الشغف" aria-label="ابحث في المحطّة" />
      </div>

      <div className="stn-sec" style={{ marginTop: 16 }}>
        <div className="stn-tools">
          <button className="stn-pill" type="button" aria-pressed="false">
            برامج
          </button>
          <button className="stn-pill" type="button" aria-pressed="false">
            حلقات
          </button>
          <button className="stn-pill" type="button" aria-pressed="true">
            داخلَ الكلام
          </button>
        </div>
        <p className="stn-count">
          ثلاثةُ مواضعَ في حلقتين، والنقرُ يبدأ من اللحظة
        </p>
      </div>

      <div className="stn-sec" style={{ marginTop: 12 }}>
        <div className="stn-hit">
          <div className="stn-hit-head">
            <span className="stn-hit-show">منعطف</span>
            <span>أسطورة الشغف</span>
          </div>
          <p className="stn-hit-q">
            ومع الوقت تحوّلت فكرةُ <mark>الشغف</mark> من مجرّد دافعٍ جميل إلى شيءٍ أكبرَ من حجمه.
          </p>
          <span className="stn-hit-at">
            <Play weight="fill" aria-hidden />
            <bdi dir="ltr">4:18</bdi>
          </span>
        </div>
        <div className="stn-hit">
          <div className="stn-hit-head">
            <span className="stn-hit-show">منعطف</span>
            <span>أسطورة الشغف</span>
          </div>
          <p className="stn-hit-q">
            أحيانًا يكون <mark>الشغف</mark> سببًا للاستمرار، وأحيانًا يكون الالتزامُ هو السبب.
          </p>
          <span className="stn-hit-at">
            <Play weight="fill" aria-hidden />
            <bdi dir="ltr">12:05</bdi>
          </span>
        </div>
        <div className="stn-hit">
          <div className="stn-hit-head">
            <span className="stn-hit-show">منعطف</span>
            <span>من الحلم إلى الواقع</span>
          </div>
          <p className="stn-hit-q">
            لا بأسَ بالشعور بانعدام <mark>الشغف</mark>، ولكنّه لا يعني انتهاءَ الرحلة.
          </p>
          <span className="stn-hit-at">
            <Play weight="fill" aria-hidden />
            <bdi dir="ltr">9:44</bdi>
          </span>
        </div>
      </div>
    </div>
  );
}

function Show() {
  const [open, setOpen] = useState(false);
  return (
    <div className="stn-page">
      <div className="stn-crumb">
        <b>إذاعة أدِيب</b>
        <CaretLeft aria-hidden />
        <span>منعطف</span>
      </div>

      <div className="stn-hero" style={{ marginTop: 16 }}>
        <Art size="72" name="منعطف" />
        <div className="stn-hero-b">
          <h1 className="stn-hero-name">منعطف</h1>
          <p className="stn-hero-sub">
            حوارٌ عن منعطفات الحياة
            <br />
            يقدّمه <a href="#host">عبدالله المطيري</a>، ثلاثُ حلقات
          </p>
        </div>
      </div>

      <div className="stn-acts">
        <button className="stn-btn" type="button">
          <Plus aria-hidden />
          تابِع البرنامج
        </button>
        <button className="stn-btn stn-btn-ghost" type="button">
          <Play weight="fill" aria-hidden />
          آخرُ حلقة
        </button>
      </div>

      <p className={`stn-desc${open ? "" : " is-clamped"}`}>
        برنامجٌ حواريٌّ من إذاعة أدِيب يجلس فيه ضيفٌ عند منعطفٍ من منعطفات حياته: لحظةُ اختيارٍ أو
        انكسارٍ أو اكتشاف. لا نسأل عن السيرة، بل عن اللحظة التي تبدّل بعدها كلُّ شيء. تُنشَر الحلقةُ
        صوتًا ومكتوبةً كاملةً، فمن أراد أن يقرأ قرأ، ومن أراد أن يسمع سمع.
      </p>
      <button className="stn-textbtn" type="button" onClick={() => setOpen((v) => !v)}>
        {open ? "أقلّ" : "المزيد"}
      </button>

      <div className="stn-sec">
        <SecHead title="ابدأ من هنا" more={null} />
        <div className="stn-start">
          <Pat />
          <span className="stn-start-kick">اختيارُ المحرّر للقادم الجديد</span>
          <div className="stn-start-t">من أنا فعلًا؟</div>
          <p className="stn-start-q">{EPS[2].q}</p>
          <div className="stn-start-foot">
            <button className="stn-row-play" type="button" aria-label="تشغيل من أنا فعلًا؟">
              <Play weight="fill" aria-hidden />
            </button>
            <span className="stn-chip">
              <Clock aria-hidden />
              <bdi dir="ltr">11:36</bdi>
            </span>
          </div>
        </div>
      </div>

      <div className="stn-sec">
        <SecHead title="الحلقات" />
        <div>
          {EPS.map((e) => (
            <Row e={e} key={e.n} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Episode() {
  return (
    <div className="stn-page">
      <div className="stn-crumb">
        <b>منعطف</b>
        <CaretLeft aria-hidden />
        <span>الحلقة الأولى</span>
      </div>

      <div className="stn-cols">
        <div>
          <h1 className="stn-ep-t">من أنا فعلًا؟</h1>
          <div className="stn-ep-meta">
            <span className="stn-chip">
              <Clock aria-hidden />
              <bdi dir="ltr">11:36</bdi>
            </span>
            <span className="stn-chip">13 أغسطس</span>
            <span className="stn-chip">
              <BookOpen aria-hidden />
              مكتوبةٌ كاملة
            </span>
          </div>

          <p className="stn-pull">{EPS[2].q}</p>

          <div className="stn-player">
            <Wave played={16} />
            <div className="stn-times">
              <bdi dir="ltr">3:02</bdi>
              <span>بقي 8:34</span>
              <bdi dir="ltr">11:36</bdi>
            </div>
            <div className="stn-trans">
              <button className="stn-skip" type="button" aria-label="الرجوع عشر ثوانٍ">
                <ArrowCounterClockwise aria-hidden />
                <b>10</b>
              </button>
              <button className="stn-play" type="button" aria-label="تشغيل">
                <Play weight="fill" aria-hidden />
              </button>
              <button className="stn-skip" type="button" aria-label="التقدّم عشر ثوانٍ">
                <ArrowClockwise aria-hidden />
                <b>10</b>
              </button>
            </div>
            <div className="stn-opts">
              <button className="stn-opt" type="button" aria-pressed="true">
                <MusicNotes aria-hidden />
                بموسيقى
              </button>
              <button className="stn-opt" type="button" aria-pressed="false">
                السرعة <bdi dir="ltr">1×</bdi>
              </button>
            </div>
          </div>

          <div className="stn-epacts">
            <button className="stn-opt" type="button">
              <BookmarkSimple aria-hidden />
              اسمع لاحقًا
            </button>
            <button className="stn-opt" type="button">
              <ShareNetwork aria-hidden />
              مشاركة
            </button>
          </div>

          <div className="stn-sec">
            <SecHead title="المحاور" more={null} />
            <div>
              {CHAPS.map((c, i) => (
                <button className="stn-chap" type="button" key={c.at} aria-current={i === 1 ? "true" : undefined}>
                  <span className="stn-chap-at">
                    <bdi dir="ltr">{c.at}</bdi>
                  </span>
                  <span className="stn-chap-t">{c.t}</span>
                  <Play weight="fill" aria-hidden style={{ width: 13, height: 13, opacity: 0.45 }} />
                </button>
              ))}
            </div>
          </div>

          <div className="stn-sec">
            <SecHead title="اقرأ واستمع" more={null} />
            <div className="stn-read">
              <div className="stn-read-head">
                <span>النصُّ يتبع الصوت</span>
                <CaretDown aria-hidden />
              </div>
              <div className="stn-read-body">
                {LINES.map((l) => (
                  <div className={`stn-line${l.now ? " is-now" : ""}`} key={l.at}>
                    <span className="stn-line-at">
                      <bdi dir="ltr">{l.at}</bdi>
                    </span>
                    <span>{l.t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="stn-sec">
          <SecHead title="التالي في منعطف" more={null} />
          <div>
            {EPS.slice(0, 2).map((e) => (
              <Row e={e} key={e.n} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FullPlayer() {
  return (
    <div className="stn-full">
      <Pat />
      <div className="stn-full-top">
        <button type="button" aria-label="إغلاق">
          <CaretDown aria-hidden />
        </button>
        <span className="stn-full-kick">يُسمَع الآن</span>
        <button type="button" aria-label="أضِف إلى القائمة">
          <ListPlus aria-hidden />
        </button>
      </div>

      <div className="stn-full-art">
        <Art size="full" name="من الحلم إلى الواقع" />
      </div>
      <h2 className="stn-full-t">من الحلم إلى الواقع</h2>
      <p className="stn-full-s">منعطف</p>

      <div className="stn-full-wave">
        <Wave played={20} />
        <div className="stn-times">
          <bdi dir="ltr">7:21</bdi>
          <span>ينتهي 11:48 م</span>
          <bdi dir="ltr">21:27</bdi>
        </div>
      </div>

      <div className="stn-trans">
        <button className="stn-skip" type="button" aria-label="الرجوع عشر ثوانٍ">
          <ArrowCounterClockwise aria-hidden />
          <b>10</b>
        </button>
        <button className="stn-play" type="button" aria-label="إيقاف مؤقّت">
          <Pause weight="fill" aria-hidden />
        </button>
        <button className="stn-skip" type="button" aria-label="التقدّم عشر ثوانٍ">
          <ArrowClockwise aria-hidden />
          <b>10</b>
        </button>
      </div>

      <div className="stn-opts">
        <button className="stn-opt" type="button" aria-pressed="true">
          <MusicNotes aria-hidden />
          بموسيقى
        </button>
        <button className="stn-opt" type="button" aria-pressed="false">
          السرعة <bdi dir="ltr">1×</bdi>
        </button>
        <button className="stn-opt" type="button" aria-pressed="false">
          <Moon aria-hidden />
          مؤقّتُ النوم
        </button>
        <button className="stn-opt" type="button" aria-pressed="false">
          <BookOpen aria-hidden />
          اقرأ معه
        </button>
      </div>

      <div className="stn-full-next">
        <span className="stn-full-next-k">التالي</span>
        <span className="stn-full-next-t">أسطورة الشغف</span>
        <SkipForward weight="fill" aria-hidden style={{ width: 16, height: 16 }} />
      </div>
    </div>
  );
}

/* ══ إطارُ المعاينة ══════════════════════════════════════════════════ */

const SURFACES = [
  { key: "station", label: "المحطّة", route: "/radio", el: <Station /> },
  { key: "dir", label: "الفهرس", route: "/radio/shows", el: <Directory /> },
  { key: "search", label: "البحث", route: "/radio/search", el: <Search /> },
  { key: "show", label: "البرنامج", route: "/radio/munataf", el: <Show /> },
  { key: "ep", label: "الحلقة", route: "/radio/munataf/ep-1", el: <Episode /> },
  { key: "player", label: "المشغّل", route: "شاشةٌ كاملةٌ فوق أيّ صفحة", el: <FullPlayer /> },
];

/** أربعُ أرضيّاتٍ تُعرَض: الكريميُّ عندك مشبَعٌ ٩٣٪، فمسطَّحًا يحمل مسحةً دافئة. */
const GROUNDS = [
  { key: "", label: "طبقات (مُقَرّة)" },
  { key: "grd-flat", label: "مسطَّح" },
  { key: "grd-grad", label: "تدرّج" },
  { key: "grd-soft", label: "أهدأ" },
];

const SIZES = [
  { key: "375", label: "جوّال", w: 375, h: 780 },
  { key: "820", label: "لوحيّ", w: 820, h: 900 },
  { key: "1280", label: "مكتب", w: 1280, h: 860 },
];

export default function RadioNextPage() {
  const [surface, setSurface] = useState("station");
  const [size, setSize] = useState("375");
  const [ground, setGround] = useState("");
  const s = SURFACES.find((x) => x.key === surface)!;
  const withBar = surface !== "player";
  const z = SIZES.find((x) => x.key === size)!;

  return (
    <main className="py-8">
      <Container>
        <div className="stnp-cap">
          <b>إذاعة أدِيب: اللغةُ البصريّة الجديدة</b>
          <p>
            الأطروحة: الحلقةُ تُعرَّف بجملةٍ من كلامها لا بمربّعٍ مصوَّر. منعطفٌ وحلقاتُه ونصوصُها من
            القاعدة، والجملُ مقتطَعةٌ منها حرفًا بحرف. وسائرُ البرامج توضيحيّةٌ ترسم الحالَ عند مئة برنامج.
          </p>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Segmented
            aria-label="السطح"
            items={SURFACES.map((x) => ({ value: x.key, label: x.label }))}
            value={surface}
            onValueChange={setSurface}
          />
          <Segmented
            aria-label="الأرضيّة"
            items={GROUNDS.map((x) => ({ value: x.key, label: x.label }))}
            value={ground}
            onValueChange={setGround}
          />
          <Segmented
            aria-label="المقاس"
            items={SIZES.map((x) => ({ value: x.key, label: x.label }))}
            value={size}
            onValueChange={setSize}
          />
        </div>
        <p className="mb-4 text-sm text-content-muted">{s.route}</p>

        <div className={`stnp-frame stn ${ground}`} style={{ width: z.w, maxWidth: "100%", height: z.h }}>
          <div className="stnp-scroll">{s.el}</div>
          {withBar ? <Bar /> : null}
        </div>
      </Container>
    </main>
  );
}
