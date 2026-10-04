import Link from "next/link";
import { ArrowLeft } from "@/app/_components/glyphs";
import { CLUB_ACCOUNTS, CLUB_EMAIL, CLUB_HANDLE, CLUB_WA_NUMBER, clubWaLink } from "@/lib/clubContact";
import { AttractVideo } from "./AttractVideo";
import { EventStrip } from "./EventStrip";
import { GamesLogo } from "./GamesLogo";
import { PLAYERS, RUNS, countAr, score, type ScoreUnit } from "./hall";

/**
 * **صالةُ «ألعاب أدِيبيّة»** (`/games`) — صفحةُ هبوطٍ لألعاب النادي، ولكلّ لعبةٍ فيها كابينةُ أركيد.
 *
 * ══ الهويّة ══
 * منعزلةٌ كالمحطّة (القاعدة ١، ووسّع المالكُ نطاقَها إلى `/games` وحدَها ٢٠٢٦-٠٩-٢٦): صالةُ أركيد
 * ليليّة بالنيون وخطوطِ الشاشة القديمة، باختياره هو على «دفتر المربّعات» الذي اقتُرح أوّلًا.
 * والشعارُ والخطُّ (Rooyin) منه. **واللوحةُ مقترَحةٌ لا مشتقّة**: الشعارُ أسودُ بلا لون، فعُرض
 * مظهران (`data-look` على الجذر) والمالكُ يختار.
 *
 * ══ الكابينة (الجولةُ الثانية) ══
 * **لافتةٌ** مضاءةٌ باسم اللعبة، و**شاشةٌ** في إطارها يدور فيها مقطعُ لعبٍ من اللعبة نفسِها
 * (`AttractVideo`)، وهي نفسُها رابطُ اللعب بـ«اضغط للّعب»، و**لوحةُ تحكّم** عليها بطاقةُ اللعبة وعصا
 * وزرّان هما الرابطان، و**بابُ عملة** يقول إنّ اللعبَ مجّانيّ. وكلُّ كابينةٍ بنغمة لعبتها (`data-tone`).
 *
 * ══ والصالةُ على قدر ألعابها (الجولةُ الثالثة) ══
 * لعبةٌ واحدة: كابينتُها بجانب الشعار في الحاسوب. وأكثرُ من لعبة: «اختر لعبتك»، وفي الجوّال
 * واللوحيّ صفُّ كبائن يُسحب، وفي الحاسوب ثلاثٌ في الصفّ. والتخطيطُ كلُّه في `components.css` بـ`:has()`.
 *
 * ══ وصفحةُ هبوطٍ متكاملة (الجولةُ الرابعة) ══
 * سأل المالك: «هل تشوفها صفحة هبوط محترمة متكاملة؟» فكان الجواب لا: لا تعرّف بنفسها، وتتجاهل
 * المسابقةَ الجارية، ولا دليلَ فيها على أنّ أحدًا يلعب، ولا رأسَ لها وتذييلُها سطر، والفقراتُ بالبكسل
 * مرهقة. فصارت ستّةَ أقسام: رأسٌ خاصّ، والشعارُ وسطرُ تعريف، وشريطُ الحدث الجاري (`EventStrip`)،
 * والكبائن، و«أعلى النقاط» كشاشة الأركيد، وتذييلٌ بالدعم والحسابات. **والبكسلُ للعناوين والأزرار
 * والأرقام، والفقراتُ بخطٍّ مقروء** (`--agm-read`).
 */

export type HubScore = { name: string; value: number };

export type HubGame = {
  slug: string;
  name: string;
  /** سطرٌ واحدٌ يقول ما اللعبة: بطاقةُ التعليمات على لوحة التحكّم. */
  line: string;
  /** نغمةُ اللعبة: اسمٌ له سطرُه في `components.css` (`.agm [data-tone="…"]`) ورمزُه في كتلة الرموز. */
  tone: string;
  /** مقطعُ الشاشة وصورتُه الثابتة (`public/games/cabinets/`). وبلا مقطعٍ تعرض الشاشةُ «بلا إشارة» لا صورةً مستعارة. */
  attract?: { video: string; poster: string };
  play: string;
  board: string;
  /** أعلى ثلاثةٍ في لوحتها لـ«أعلى النقاط». وبلا صفوفٍ لا تظهر لوحتُها. */
  top?: { title: string; unit: ScoreUnit; rows: HubScore[] };
};

/** الحدثُ الجاري: مسابقةٌ في لعبةٍ بعينها، يمرّره الخادمُ ما دامت لم تنتهِ. والجوائزُ جملةٌ في `note`. */
export type HubEvent = {
  title: string;
  note: string;
  tone: string;
  startsAt: number;
  endsAt: number;
  href: string;
};

export function Hub({
  games,
  event,
  stats,
}: {
  games: HubGame[];
  event?: HubEvent | null;
  stats?: { players: number; runs: number } | null;
}) {
  const boards = games.filter((g) => g.top && g.top.rows.length > 0);

  return (
    <div className="agm-hub">
      <header className="agm-top">
        <span className="agm-top-name">ألعاب أدِيبيّة</span>
        <Link href="/" className="agm-top-back">
          <span>نادي أدِيب</span>
          <ArrowLeft aria-hidden />
        </Link>
      </header>

      {event ? <EventStrip event={event} /> : null}

      <div className="agm-hall">
        <section className="agm-hero">
          <h1 className="agm-mark">
            <GamesLogo className="agm-logo" />
          </h1>
          <p className="agm-lede">ألعابٌ من نادي أدِيب، تُلعب في متصفّح جوّالك مجّانًا وبلا تحميل.</p>
          {games.length > 1 ? (
            <p className="agm-start">
              <span>اختر لعبتك</span>
              <i className="agm-caret" aria-hidden />
            </p>
          ) : null}
        </section>

        <ul className="agm-grid">
          {games.map((g) => (
            <li key={g.slug} className="agm-cab" data-tone={g.tone}>
              <div className="agm-cab-marquee">
                <h2 className="agm-cab-name">{g.name}</h2>
              </div>
              <div className="agm-cab-bezel">
                {/* الشاشةُ نفسُها «اضغط للّعب» كما في الأركيد: في الحاسوب تقع أزرارُ اللوحة تحت
                    الطيّة، والشاشةُ فوقها دائمًا. وللوحة المفاتيح زرُّ «العب» وحدَه، فلا رابطان مكرّران في التنقّل. */}
                <Link href={g.play} className="agm-cab-screen" tabIndex={-1} aria-hidden>
                  {g.attract ? (
                    <AttractVideo src={g.attract.video} poster={g.attract.poster} />
                  ) : (
                    <span className="agm-cab-static" />
                  )}
                  <span className="agm-cab-press">اضغط للّعب</span>
                </Link>
              </div>
              <div className="agm-cab-deck">
                <p className="agm-cab-card">{g.line}</p>
                <div className="agm-cab-controls">
                  <span className="agm-stick" aria-hidden />
                  <Link href={g.play} className="agm-push agm-push-go">
                    <span className="agm-push-cap" aria-hidden />
                    <span>العب</span>
                  </Link>
                  <Link href={g.board} className="agm-push">
                    <span className="agm-push-cap" aria-hidden />
                    <span>الصدارة</span>
                  </Link>
                </div>
              </div>
              <div className="agm-cab-door">
                <span className="agm-coin" aria-hidden />
                <span>لعبٌ مجّاني</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {boards.length > 0 ? (
        <section className="agm-scores" aria-labelledby="agm-scores-h">
          <h2 id="agm-scores-h" className="agm-sec-title">
            أعلى النقاط
          </h2>
          {stats ? (
            <p className="agm-sec-lede">
              {countAr(stats.players, PLAYERS)} لعبوا {countAr(stats.runs, RUNS)} حتى الآن.
            </p>
          ) : null}
          <div className="agm-boards">
            {boards.map((g) => (
              <div key={g.slug} className="agm-board" data-tone={g.tone}>
                <h3 className="agm-board-name">{g.name}</h3>
                <p className="agm-board-label">{g.top!.title}</p>
                <ol className="agm-board-list">
                  {g.top!.rows.slice(0, 3).map((r, i) => (
                    <li key={r.name}>
                      <span className="agm-rank">{i + 1}</span>
                      <span className="agm-who">{r.name}</span>
                      <span className="agm-val">{score(g.top!.unit, r.value)}</span>
                    </li>
                  ))}
                </ol>
                <Link href={g.board} className="agm-board-more">
                  <span>الصدارة كاملة</span>
                  <ArrowLeft aria-hidden />
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="agm-foot">
        <div className="agm-foot-grid">
          <div>
            <p className="agm-foot-h">ألعاب أدِيبيّة</p>
            <p className="agm-foot-p">
              من إنتاج وتشغيل <Link href="/">نادي أدِيب</Link> في جامعة الملك فيصل.
            </p>
          </div>
          <div>
            <p className="agm-foot-h">الدعم</p>
            <ul className="agm-foot-list">
              <li>
                <a href={clubWaLink("مرحبًا، عندي سؤال عن ألعاب أدِيبيّة")} target="_blank" rel="noopener">
                  واتساب <span dir="ltr">{CLUB_WA_NUMBER}</span>
                </a>
              </li>
              <li>
                <Link href="/#contact">نموذج التواصل</Link>
              </li>
              <li>
                <a href={`mailto:${CLUB_EMAIL}`}>
                  <span dir="ltr">{CLUB_EMAIL}</span>
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="agm-foot-h">
              حساباتنا <span dir="ltr">@{CLUB_HANDLE}</span>
            </p>
            <ul className="agm-socials">
              {CLUB_ACCOUNTS.map((a) => (
                <li key={a.href}>
                  <a href={a.href} target="_blank" rel="noopener">
                    {a.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
