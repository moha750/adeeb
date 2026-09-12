"use client";

import { createContext, useContext } from "react";

import {
  Broadcast, SquaresFour, Books, Play, Pause, BookmarkSimple,
  SkipBack, SkipForward, Rewind, FastForward, ShareNetwork, DotsThree,
} from "@phosphor-icons/react";
import { MagnifyingGlass, ArrowRight, CaretLeft, CaretDown, Plus, Check } from "@/app/_components/glyphs";

/**
 * **شاشاتُ المحطّة السبع** — مصدرٌ واحدٌ لعرضَي الجوّال والحاسوب.
 *
 * التخطيطُ يتبدّل باستعلامِ **حاوية** لا استعلامِ وسيط، لأنّ الإطارين في
 * المعرض يجلسان في صفحةٍ واحدة: لو كان الاستعلامُ للوسيط لأظهرا الشيءَ نفسَه
 * وكذبت المعاينة. فلا سطرَ هنا يسأل عن عرض الشاشة.
 */

/* ══ ما هو حقيقيّ: من radio_station و radio_shows و radio_episodes و R2 ══ */

const R2 = "https://pub-939f06ea1342424cbd3b74aecf6caba1.r2.dev";
export const COVER_SHOW = `${R2}/shows/c191fd1e-c5ba-420c-8688-cfeeac24fb23/logo-msqd0t3n.png`;
export const COVER_STATION = `${R2}/station/logo-msqd01li.png`;

export const EPS = [
  {
    n: 3, title: "أسطورة الشغف", secs: 1228, at: "١٣ أغسطس", pct: 41,
    summary: "«اعمل ما تحب» نصيحة جميلة، لكن متى تحوّلت إلى معيار يقيس فشلنا ونجاحنا؟",
    chapters: ["الوظيفة أم الشغف؟", "الالتزام أو الحماس؟", "إنعدام الشغف بعد البدايات", "هل الوظيفة تختصر حياتك؟"],
  },
  {
    n: 2, title: "من الحلم إلى الواقع", secs: 1287, at: "١٣ أغسطس", pct: 0,
    summary: "الحلم وحده لا يكفي، فبين الحلم والواقع طريقٌ طويل من العمل والتعلّم والتجربة.",
    chapters: ["الحلم وحده لا يكفي", "صراع الاستمرارية", "لماذا نؤجل؟", "ماذا لو تغيّر الطريق؟"],
  },
  {
    n: 1, title: "من أنا فعلاً؟", secs: 696, at: "١٣ أغسطس", pct: 100,
    summary: "سؤالٌ يبدو بسيطًا، لكنه من أصعب ما يواجهه الإنسان في حياته.",
    chapters: ["من أنا فعلًا؟", "أين تختبئ الموهبة؟", "فطرة أم اكتشاف؟", "من الموهبة إلى الأثر"],
  },
];

/* التصنيفاتُ **معلَّقةٌ بأمر المالك ٢٠٢٦-٠٩-٠٥**: «لا نمتلك برامج كثيرة
   لنصنّفها، فتكون خطوة مستقبلية». وجدولاها نزلا على الإنتاج وينتظران، فلا
   شاشةَ تعرضهما اليوم. و«تصفَّح» بقي بابًا يحمل كلَّ البرامج. */

/* ══ ما هو توضيحيّ: برامجُ الرفّ الزائدة (عناوينُها طويلةٌ عمدًا) ══ */
export const SHOWS = [
  { t: "منعطف", s: "٣ حلقات", cover: COVER_SHOW },
  { t: "على هامش الكلمة", s: "١٢ حلقة", cover: COVER_STATION },
  { t: "ما لا يُقال في المجالس", s: "٧ حلقات", cover: COVER_STATION },
  { t: "ترجمانُ الأشواق", s: "٥ حلقات", cover: COVER_STATION },
  { t: "دفتر", s: "٢١ حلقة", cover: COVER_STATION },
];

/** الجملةُ الدالّة، من تفريغ الحلقة الثالثة على الإنتاج لا مكتوبةً للمعاينة.
    وفي الإنتاج تُنتقى بـ`lib/radio/quote.ts` من `transcript`. */
const QUOTE = "أحيانًا يكون الشغف سببًا للاستمرار، وأحيانًا يكون الالتزام هو السبب";

/**
 * **الكرتُ الطافي** — اختاره المالك من ثلاثة مواضعَ عُرضت. نصفُه في اللوح
 * ونصفُه في الورق، فيربط سطحَي المحطّة ويُعلن نفسَه شيئًا مستقلًّا. والحدُّ
 * الصلبُ يكسب به معنًى: صار مفصلًا يجلس عليه شيء لا مجرّدَ نهاية.
 */
function PullQuote({ src }: { src: string }) {
  return (
    <div className="stq-c">
      <p className="stq-c-t"><span className="stq-c-mark" aria-hidden>❝</span>{QUOTE}</p>
      <p className="stq-c-s">{src}</p>
    </div>
  );
}

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
export const mins = (s: number) => `${Math.round(s / 60)} دقيقة`;

/* ══ التنقّل ══════════════════════════════════════════════════════
   الشاشاتُ نفسُها تخدم معرضَ اللقطات (`radio-full`) والنموذجَ الحيّ
   (`radio-live`). فالفرقُ بينهما **مُنفِّذٌ يُمرَّر في سياق**: بلا مُنفِّذٍ
   تبقى العناصرُ سواكنَ كما كانت، ومعه تصير قابلةً للنقر. ولا نسخةَ ثانيةَ
   من المحتوى. */
type Door = "home" | "browse" | "lib" | "find";

export type Route =
  | { k: "home" } | { k: "browse" } | { k: "lib" } | { k: "find" }
  | { k: "show" } | { k: "ep" } | { k: "np" };

export const NavCtx = createContext<((to: Route) => void) | null>(null);
export const useNav = () => useContext(NavCtx);

/** البابُ المضيء. الشاشةُ الداخليّةُ لا تعرف من أين جِئتَ، فيُملى عليها:
    من فتح برنامجًا من «مكتبتي» يجب أن يبقى بابُ مكتبتي مضيئًا، وإلّا ظنّ
    أنّه انتقل (رُصد في أوّل تجربةٍ حيّة ٢٠٢٦-٠٩-٠٥). */
export const DoorCtx = createContext<Door | null>(null);

/** يلبس العنصرَ زرًّا حين يكون التنقّلُ حيًّا، ويتركه كما هو حين لا يكون. */
function Tap({ to, children, className, ...rest }: {
  to: Route; children: React.ReactNode; className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  const nav = useNav();
  if (!nav) return <span className={className} {...rest}>{children}</span>;
  return (
    <button type="button" className={className} onClick={() => nav(to)} {...rest}>
      {children}
    </button>
  );
}

/* ══ الهيكل: شريطٌ جانبيٌّ على الحاسوب، أبوابٌ سفليّةٌ على الجوّال ══ */

const DOORS = [
  { k: "home", label: "المحطّة", Icon: Broadcast },
  { k: "browse", label: "تصفَّح", Icon: SquaresFour },
  { k: "lib", label: "مكتبتي", Icon: Books },
  { k: "find", label: "بحث", Icon: MagnifyingGlass },
] as const;


function Side({ on }: { on: Door }) {
  return (
    <aside className="stc-side">
      <span className="stc-mark">
        <img src={COVER_STATION} alt="" />
        إذاعة أَدِيب
      </span>
      {DOORS.map(({ k, label, Icon }) => (
        <Tap key={k} to={{ k } as Route} className="stc-side-a" aria-current={k === on ? "page" : undefined}>
          <Icon aria-hidden />
          {label}
        </Tap>
      ))}
      <p className="stc-side-h">أتابعه</p>
      {SHOWS.slice(0, 3).map((s) => (
        <Tap key={s.t} to={{ k: "show" }} className="stc-side-a">
          <img src={s.cover} alt="" style={{ width: 20, height: 20, borderRadius: 6, objectFit: "cover" }} />
          {s.t}
        </Tap>
      ))}
    </aside>
  );
}

function Doors({ on }: { on: Door }) {
  return (
    <nav className="stx-tabs">
      {DOORS.map(({ k, label, Icon }) => (
        <Tap key={k} to={{ k } as Route} className="stx-tab" aria-current={k === on ? "page" : undefined}>
          <Icon aria-hidden />
          {label}
        </Tap>
      ))}
    </nav>
  );
}

function Mini() {
  return (
    <Tap to={{ k: "np" }} className="stx-mini" aria-label="شاشةُ التشغيل">
      <span className="stx-mini-art" aria-hidden><img src={COVER_SHOW} alt="" /></span>
      <span className="stx-mini-txt">
        <span className="stx-mini-t">أسطورة الشغف</span>
        <span className="stx-mini-s">منعطف</span>
      </span>
      <span className="stx-mini-b" aria-hidden><Pause weight="fill" /></span>
      <span className="stx-mini-prog" aria-hidden><i style={{ width: "41%" }} /></span>
    </Tap>
  );
}

/** غلافُ كلِّ شاشةٍ عدا شاشةَ التشغيل: أبوابٌ وكبسولةٌ ثابتة. */
function Screen({ on, children }: { on: Door; children: React.ReactNode }) {
  const lit = useContext(DoorCtx) ?? on;
  return (
    <>
      <div className="stnp-scroll">
        <div className="stc-app">
          <Side on={lit} />
          <div className="stc-main">{children}</div>
        </div>
      </div>
      <Mini />
      <Doors on={lit} />
    </>
  );
}

/* ══ قطعٌ مشتركة ══════════════════════════════════════════════════ */

function Head({ title, more }: { title: string; more?: string }) {
  return (
    <div className="stn-shead">
      <h2>{title}</h2>
      {more ? (
        <Tap to={more === "مكتبتي" ? { k: "lib" } : { k: "browse" }} className="stn-more">
          {more} <ArrowRight aria-hidden />
        </Tap>
      ) : null}
    </div>
  );
}

function CoverRail() {
  return (
    <div className="stc-rail">
      {SHOWS.map((s) => (
        <Tap key={s.t} to={{ k: "show" }} className="stc-cov">
          <img src={s.cover} alt="" />
          <b>{s.t}</b>
          <span>{s.s}</span>
        </Tap>
      ))}
    </div>
  );
}

function EpisodeList({ show = "منعطف" }: { show?: string }) {
  return (
    <div>
      {EPS.map((e) => (
        <Tap key={e.n} to={{ k: "ep" }} className="stc-ep" style={{ textAlign: "start", width: "100%" }}>
          <img className="stc-ep-th" src={COVER_SHOW} alt="" />
          <div className="stc-ep-b">
            <span className="stc-ep-k">{show}</span>
            <span className="stc-ep-t">{e.title}</span>
            <p className="stc-ep-s">{e.summary}</p>
            <div className="stc-ep-acts">
              <span className="stc-ep-btn">
                <i><Play weight="fill" aria-hidden />{e.pct > 0 && e.pct < 100 ? `تبقّى ${Math.round((e.secs * (100 - e.pct)) / 100 / 60)} دقيقة` : mins(e.secs)}</i>
              </span>
              <span className="stc-ep-btn"><i><Plus aria-hidden />لاحقًا</i></span>
              <span className="stc-ep-min">{e.at}</span>
            </div>
          </div>
        </Tap>
      ))}
    </div>
  );
}

/* ══ ١. المحطّة ═══════════════════════════════════════════════════ */

export function Home() {
  return (
    <Screen on="home">
      <div className="stq-c-wrap">
      <div className="stc-hero">
        <div className="stc-hero-row">
          <span className="stc-cover"><img src={COVER_SHOW} alt="" /></span>
          <div className="stc-hero-in">
            <span className="stc-hero-k"><i aria-hidden />أحدثُ حلقة</span>
            <h1 className="stc-hero-t">أسطورة الشغف</h1>
            <p className="stc-hero-s">منعطف، {mins(1228)}</p>
            <div className="stc-hero-acts">
              <Tap to={{ k: "np" }} className="stc-play"><Play weight="fill" aria-hidden />استمع الآن</Tap>
              <span className="stc-icon" aria-hidden><Plus /></span>
              <span className="stc-icon" aria-hidden><ShareNetwork /></span>
            </div>
          </div>
        </div>
      </div>
      </div>
      <PullQuote src="أسطورة الشغف، من منعطف" />

      <div className="stn-page" style={{ paddingTop: "var(--stn-s5)", paddingBottom: 132 }}>
        <div className="stn-sec" style={{ marginTop: 0 }}>
          <Head title="تُكمل؟" more="مكتبتي" />
          <EpisodeList />
        </div>
        <div className="stn-sec">
          <Head title="البرامج" more="الكلّ" />
          <CoverRail />
        </div>
      </div>
    </Screen>
  );
}

/* ══ ٢. التصفّح ═══════════════════════════════════════════════════ */

export function Browse() {
  return (
    <Screen on="browse">
      <div className="stx-top"><h1>تصفَّح</h1></div>
      <div className="stn-page" style={{ paddingTop: 0, paddingBottom: 132 }}>
        <Tap to={{ k: "find" }} className="stn-find">
          <MagnifyingGlass aria-hidden />
          ابحث في البرامج والحلقات وفي الكلام نفسه
        </Tap>
        <div className="stn-sec">
          <Head title="كلُّ البرامج" />
          <CoverRail />
        </div>
        <div className="stn-sec">
          <Head title="أحدثُ الحلقات" />
          <EpisodeList />
        </div>
      </div>
    </Screen>
  );
}

/* ══ ٣. مكتبتي ════════════════════════════════════════════════════
   **مرشِّحاتٌ وقائمةٌ واحدة** (اختارها المالك ٢٠٢٦-٠٩-٠٥ من صورتين عُرضتا).
   وكانت الشاشةُ تحمل الاثنين: مرشِّحاتٍ أعلى وأقسامًا بالأسماء نفسِها، وهو
   ازدواج. والأقسامُ فيها عطبٌ بنيويٌّ زائدٌ على الازدواج: حلقةٌ تتابع برنامجَها
   ولم تُنهها **تنتمي إلى قسمين**، فإمّا تتكرّر وإمّا تُخبَّأ في أحدهما
   بقرارٍ اعتباطيّ. والقائمةُ الواحدةُ لا تعرف هذا التصادم، وتصمد عند المئتين. */

const FILTERS = ["الكلّ", "أتابعه", "لاحقًا", "لم يكتمل"];

export function Library() {
  return (
    <Screen on="lib">
      <div className="stx-top"><h1>مكتبتي</h1></div>
      <div className="stx-filters">
        {FILTERS.map((f, i) => (
          <span key={f} className="stx-filter" aria-pressed={i === 0}>{f}</span>
        ))}
      </div>

      <div className="stn-page" style={{ paddingTop: 16, paddingBottom: 132 }}>
        {/* البرنامجُ المتابَعُ صفٌّ بشكله: لا مدّةَ له ولا تقدّم، وفعلُه فكُّ متابعة */}
        {SHOWS.slice(0, 2).map((sh) => (
          <Tap key={sh.t} to={{ k: "show" }} className="stx-item" style={{ textAlign: "start", width: "100%" }}>
            <span className="stx-item-art" aria-hidden><img src={sh.cover} alt="" /></span>
            <span className="stx-item-txt">
              <span className="stx-item-t">{sh.t}</span>
              <span className="stx-item-s">برنامجٌ تتابعه، {sh.s}</span>
            </span>
            <span className="stx-item-b" aria-hidden><BookmarkSimple weight="fill" /></span>
          </Tap>
        ))}

        {EPS.map((e) => (
          <Tap key={e.n} to={{ k: "ep" }} className="stx-item" style={{ textAlign: "start", width: "100%" }}>
            <span className="stx-item-art" aria-hidden><img src={COVER_SHOW} alt="" /></span>
            <span className="stx-item-txt">
              <span className="stx-item-t">{e.title}</span>
              <span className="stx-item-s">
                منعطف، {e.pct > 0 && e.pct < 100
                  ? `تبقّى ${Math.round((e.secs * (100 - e.pct)) / 100 / 60)} دقيقة`
                  : mins(e.secs)}
              </span>
              {e.pct > 0 && e.pct < 100 ? (
                <span className="stx-item-prog"><i style={{ width: `${e.pct}%` }} /></span>
              ) : null}
            </span>
            <span className="stx-item-b" aria-hidden><Play weight="fill" /></span>
          </Tap>
        ))}
      </div>
    </Screen>
  );
}

/* ══ ٤. البرنامج ══════════════════════════════════════════════════ */

export function Show() {
  return (
    <Screen on="home">
      <div className="stc-hero">
        <div className="stc-hero-row">
          <span className="stc-cover"><img src={COVER_SHOW} alt="" /></span>
          <div className="stc-hero-in">
            <span className="stc-hero-k"><i aria-hidden />برنامج</span>
            <h1 className="stc-hero-t">منعطف</h1>
            <p className="stc-hero-s">حوار عن منعطفات الحياة، ٣ حلقات</p>
            <div className="stc-hero-acts">
              <span className="stc-play"><Play weight="fill" aria-hidden />ابدأ من الأولى</span>
              <span className="stc-follow" aria-pressed={false}><Plus aria-hidden />تابِع</span>
            </div>
          </div>
        </div>
      </div>

      <div className="stn-page" style={{ paddingTop: 0, paddingBottom: 132 }}>
        <p className="stc-desc" style={{ marginTop: 0 }}>
          برنامجٌ يجلس عند المنعطفات التي تغيّر مسار الإنسان، ويسأل أصحابَها كيف
          رأوها وهم فيها لا بعد أن عبروها.
        </p>
        <div className="stn-sec">
          <Head title="الحلقات" />
          <EpisodeList />
        </div>
      </div>
    </Screen>
  );
}

/* ══ ٥. الحلقة ════════════════════════════════════════════════════ */

export function Episode() {
  const e = EPS[0];
  return (
    <Screen on="home">
      <div className="stq-c-wrap">
      <div className="stc-hero">
        <div className="stc-hero-row">
          <span className="stc-cover"><img src={COVER_SHOW} alt="" /></span>
          <div className="stc-hero-in">
            <span className="stc-hero-k"><i aria-hidden />منعطف، الحلقة الثالثة</span>
            <h1 className="stc-hero-t">{e.title}</h1>
            <p className="stc-hero-s">{e.at}، {mins(e.secs)}</p>
            <div className="stc-hero-acts">
              <span className="stc-play"><Play weight="fill" aria-hidden />تابِع من {mmss(Math.round((e.secs * e.pct) / 100))}</span>
              <span className="stc-icon" aria-hidden><Plus /></span>
              <span className="stc-icon" aria-hidden><ShareNetwork /></span>
            </div>
          </div>
        </div>
      </div>
      </div>

      <PullQuote src="من تفريغ الحلقة" />

      <div className="stn-page" style={{ paddingTop: "var(--stn-s5)", paddingBottom: 132 }}>
        <div className="stc-cols">
          <div>
            <p className="stc-desc" style={{ marginTop: 0 }}>{e.summary}</p>
            <div className="stn-sec" style={{ marginTop: "var(--stn-s5)" }}>
              <Head title="من التفريغ" more="الكلّ" />
              <p className="stc-trans">
                الشغفُ ليس شرارةً تُصيبك مرّةً فتحملك بقيّةَ العمر. <b>هو عادةٌ
                تُبنى</b>، ومن انتظر أن يشعر قبل أن يبدأ لم يبدأ. وأكثرُ من قابلتُهم
                لم يجدوا ما يحبّون، بل أحبّوا ما أتقنوه بعد أن أتقنوه.
              </p>
            </div>
          </div>
          <div className="stc-aside">
            <h3>محاورُ الحلقة</h3>
            {e.chapters.map((c, i) => (
              <span key={c} className="stc-chap">
                <span className="stc-chap-at">{mmss(i * 305 + 62)}</span>
                <span className="stc-chap-t">{c}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </Screen>
  );
}

/* ══ ٦. البحث ═════════════════════════════════════════════════════ */

export function Search() {
  const hits = [
    { t: "أسطورة الشغف", at: "12:41", q: ["الشغفُ ليس شرارةً تُصيبك مرّةً، هو ", "عادةٌ تُبنى", "، ومن انتظر أن يشعر قبل أن يبدأ لم يبدأ."] },
    { t: "من الحلم إلى الواقع", at: "07:18", q: ["الحلمُ الذي لا يُترجَم إلى ", "عادةٍ يوميّة", " يبقى شعورًا جميلًا لا أثرَ له."] },
    { t: "من أنا فعلاً؟", at: "04:02", q: ["نحن ما نكرّره. و", "العادةُ", " هي الجوابُ حين يعجز الكلام."] },
  ];
  return (
    <Screen on="find">
      <div className="stx-top"><h1>بحث</h1></div>
      <div className="stn-page" style={{ paddingTop: 0, paddingBottom: 132 }}>
        <span className="stn-find">
          <MagnifyingGlass aria-hidden />
          عادة
        </span>
        <div className="stn-sec">
          <Head title="في الكلام نفسِه" />
          {hits.map((h) => (
            <Tap key={h.t} to={{ k: "ep" }} className="stc-hit" style={{ textAlign: "start", width: "100%" }}>
              <img className="stc-ep-th" src={COVER_SHOW} alt="" />
              <div className="stc-hit-b">
                <span className="stc-hit-t">{h.t}</span>
                <p className="stc-hit-q">{h.q[0]}<mark>{h.q[1]}</mark>{h.q[2]}</p>
                <span className="stc-hit-at">اسمعها عند {h.at}</span>
              </div>
            </Tap>
          ))}
        </div>
        <div className="stn-sec">
          <Head title="برامج" />
          <CoverRail />
        </div>
      </div>
    </Screen>
  );
}

/* ══ ٧. شاشةُ التشغيل ═════════════════════════════════════════════ */

export function NowPlaying() {
  const e = EPS[0];
  const bars = Array.from({ length: 54 }, (_, i) => 22 + Math.round(58 * Math.abs(Math.sin(i * 0.7))));
  const played = Math.round(bars.length * 0.41);
  return (
    <div className="stnp-scroll">
      <div className="stc-np">
        <div className="stc-np-top">
          <span className="stc-np-b" aria-hidden><CaretDown /></span>
          <span>منعطف</span>
          <span className="stc-np-b" aria-hidden><DotsThree /></span>
        </div>

        <div className="stc-np-art"><img src={COVER_SHOW} alt="" /></div>

        <div>
          <p className="stc-np-t">{e.title}</p>
          <p className="stc-np-s">منعطف، الحلقة الثالثة</p>
        </div>

        <div className="stc-np-wave" aria-hidden>
          {bars.map((h, i) => (
            <i key={i} className={i < played ? "on" : undefined} style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="stc-np-time">
          <span>{mmss(Math.round((e.secs * e.pct) / 100))}</span>
          <span>{mmss(e.secs)}</span>
        </div>

        <div className="stc-np-ctrl">
          <span className="stc-np-b" aria-hidden><SkipBack weight="fill" /></span>
          <span className="stc-np-b" aria-hidden><Rewind weight="fill" /></span>
          <span className="stc-np-main" aria-hidden><Pause weight="fill" /></span>
          <span className="stc-np-b" aria-hidden><FastForward weight="fill" /></span>
          <span className="stc-np-b" aria-hidden><SkipForward weight="fill" /></span>
        </div>

        <div className="stc-np-foot">
          <span className="stc-ep-btn"><i>بموسيقى</i></span>
          <span className="stc-ep-btn"><i><Check aria-hidden />١٫٢٥×</i></span>
          <span className="stc-ep-btn"><i><BookmarkSimple aria-hidden />لاحقًا</i></span>
          <span className="stc-np-b" aria-hidden><CaretLeft /></span>
        </div>
      </div>
    </div>
  );
}
