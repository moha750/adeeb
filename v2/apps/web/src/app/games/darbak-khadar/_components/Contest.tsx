"use client";

import { ChartBar, Handshake, Megaphone, Storefront, Trophy, UserCircle } from "@phosphor-icons/react";
import { ArrowLeft, WhatsappLogo } from "@/app/_components/glyphs";
import { Cup, OosMark, PRIZE, SUPPORT_EMAIL, WA_NUMBER, n, waLink } from "./bits";
import type { BoardContest, BoardMe, Recap, Winner } from "./Board";
import type { TabKey } from "./tabs";

/**
 * **تبويبُ المسابقة ذكرى** (قرارُ المالك ٢٠٢٦-٠٩-٢٨: «تبقى المسابقة كذكرى، وننقل مكان الرعاية من الدعم إلى
 * المسابقة بحيث نشجّع الرعاة يدعمون»). كان صفحةً تُقرأ قبل اللعب (العدّاد، والجوائز، وكيف يُحسب الفائز،
 * والاستلام)، فصار ما بقي منها بعد الإقفال:
 *   - **موعدُها وراعيها**، والفائزون بإحصائيّاتهم (طلبُه ٢٠٢٦-٠٩-٢٧).
 *   - **سطرُ «أنت»** لمن جمع أكوابًا: كم جمع وترتيبُه بين من جمعوا. وهي ذكرى اللاعب، والأكوابُ لا تتحوّل تمرًا.
 *   - **المسابقةُ بالأرقام** (`darb_contest_recap`): من لعب، وكم جولة، وكم كوبًا جُمع، وكم ساعة.
 *   - **دعوةُ الرعاة**، منقولةً من الدعم: الأرقامُ فوقها هي ما يقنع، فمكانُها بعدها.
 *
 * وهذا الموضعُ وحدَه يبقى فيه كوبُ oos واسمُهم بعد أن صارت التمرةُ ما يُجمَع: ذكرى، لا لعب.
 * والأرقامُ كلُّها من القاعدة، ثابتةٌ منذ الإقفال، فلا يكتب هنا رقمٌ باليد.
 */

/** دقائقُ اللعب ساعاتٍ ودقائق: «٨ س ٣٧ د»، والساعةُ لا تُذكر إن كانت صفرًا. */
function played(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${n(h)} س ${n(m)} د` : `${n(m)} د`;
}

const WA_SPONSOR = waLink("السلام عليكم، أرغب في رعاية مسابقةٍ من مسابقات نادي أدِيب وأودّ معرفة التفاصيل.");

/**
 * **الفائزون بإحصائيّاتهم** (طلبُ المالك ٢٠٢٦-٠٩-٢٧ بعد الإقفال). بأسمائهم المستعارة وحدَها، ولكلٍّ جائزتُه
 * وأرقامُه في المسابقة: الأكواب، وأبعدُ مسافة، والجولات، ووقتُ اللعب (من التكّات، فالتوقّفُ لا يُحسب). ومن كان
 * منهم صاحبَ المتصفّح يُعلَّم «أنت».
 */
function Winners({ winners, me }: { winners: Winner[]; me: string | null }) {
  return (
    <div className="drba-card" data-tone="gold">
      <h2>
        <Trophy />
        الفائزون
      </h2>
      <ol className="drba-wins">
        {winners.map((w) => (
          <li key={w.rank} className="drba-win">
            <div className="drba-prz" data-rank={w.rank}>
              <span className="drba-prz-rk">{w.rank}</span>
              <b>
                {w.name}
                {w.name === me ? <span className="drba-win-me">أنت</span> : null}
              </b>
              <span className="drba-prz-amt">{PRIZE[w.rank]}</span>
            </div>
            <div className="drba-stats">
              <div className="drba-stat">
                <span>الأكواب</span>
                <b>
                  <Cup />
                  <span className="drb-num">{n(w.cups)}</span>
                </b>
              </div>
              <div className="drba-stat">
                <span>أبعدُ مسافة</span>
                <b>
                  <span className="drb-num">{n(w.dist)}</span>
                  <span className="drb-unit">م</span>
                </b>
              </div>
              <div className="drba-stat">
                <span>الجولات</span>
                <b className="drb-num">{n(w.runs)}</b>
              </div>
              <div className="drba-stat">
                <span>وقتُ اللعب</span>
                <b className="drb-num">{played(w.minutes)}</b>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p>الجوائزُ رصيدٌ في محفظة مقهى oos، يشتري به الفائزُ ما شاء من منتجاتهم. مبروك للفائزين، وشكرًا لكلّ من لعب.</p>
    </div>
  );
}

export function Contest({
  contest,
  winners,
  recap,
  me,
  go,
}: {
  contest: BoardContest;
  winners?: Winner[];
  recap: Recap | null;
  me: BoardMe;
  go: (t: TabKey) => void;
}) {
  const mine = me && me.cups.contest > 0 ? me.cups : null;
  return (
    <>
      <section className="drba-hero">
        <h1>المسابقة</h1>
        <p className="drba-spons">
          برعاية <OosMark />
        </p>
        <p>
          {contest
            ? `مسابقةُ اليوم الوطنيّ، من ${contest.starts} إلى ${contest.ends}. جمع فيها اللاعبون أكوابَ oos، وفاز الثلاثةُ الأكثرُ جمعًا.`
            : "مسابقةُ اليوم الوطنيّ: جمع فيها اللاعبون أكوابَ oos، وفاز الثلاثةُ الأكثرُ جمعًا."}
        </p>
      </section>

      <div className="drba-body">
        {mine && me ? (
          <div className="drba-card" data-tone="ok">
            <div className="drba-status">
              <UserCircle />
              <div>
                <b>{`«${me.name}»، أكوابُك في المسابقة: ${n(mine.contest)}`}</b>
                <p>
                  {mine.rank !== null ? `وترتيبُك ${n(mine.rank)} من ${n(mine.of)} جمعوا أكوابًا. ` : ""}
                  محفوظةٌ لك ذكرى، وما تجمعه الآن تمر.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {winners && winners.length > 0 ? <Winners winners={winners} me={me?.name ?? null} /> : null}

        {recap ? (
          <div className="drba-card">
            <h2>
              <ChartBar />
              المسابقةُ بالأرقام
            </h2>
            <ul className="drba-nums">
              <li>
                <b>{n(recap.players)}</b>
                <span>اللاعبون</span>
              </li>
              <li>
                <b>{n(recap.runs)}</b>
                <span>الجولات</span>
              </li>
              <li>
                <b>
                  <Cup />
                  {n(recap.cups)}
                </b>
                <span>الأكوابُ المجموعة</span>
              </li>
              <li>
                <b>{n(Math.round(recap.minutes / 60))}</b>
                <span>ساعاتُ اللعب</span>
              </li>
            </ul>
            {contest ? <p className="drba-when">في يومين، من {contest.starts} إلى {contest.ends}.</p> : null}
          </div>
        ) : null}

        {/* **دعوةُ الرعاة** (نُقلت من الدعم بقرار المالك ٢٠٢٦-٠٩-٢٨): وعدُها من واقع هذه المسابقة وأرقامِها أعلاه */}
        <div className="drba-card" data-tone="gold">
          <p className="drba-eyebrow">لأصحاب الأعمال</p>
          <h2 className="drba-big">
            <Handshake />
            اجعل علامتك في يد اللاعبين
          </h2>
          <p className="drba-lead">
            {recap
              ? `أكوابُ oos التي جمعها اللاعبون في يومين: ${n(recap.cups)}. فالإعلانُ هنا لا يمرّ عليه الناسُ مرورًا: يجمعونه ويتسابقون عليه.`
              : "الإعلانُ هنا لا يمرّ عليه الناسُ مرورًا: يجمعونه ويتسابقون عليه."}
          </p>
          <ul className="drba-items">
            <li className="drba-item">
              <span className="drba-item-ic" aria-hidden="true">
                <Storefront />
              </span>
              <span>
                <b>علامتُك داخل اللعبة</b>
                <span>منتجُك في الطريق يجمعه كلُّ لاعب، كما كان كوبُ oos في هذه المسابقة.</span>
              </span>
            </li>
            <li className="drba-item">
              <span className="drba-item-ic" aria-hidden="true">
                <Trophy />
              </span>
              <span>
                <b>مسابقةٌ باسمك وجوائزُك</b>
                <span>شعارُك في المسابقة وصفحتها، وجوائزُ الفائزين منك.</span>
              </span>
            </li>
            <li className="drba-item">
              <span className="drba-item-ic" aria-hidden="true">
                <Megaphone />
              </span>
              <span>
                <b>حضورٌ في منشورات أدِيب</b>
                <span>نذكرك في إعلان المسابقة ونتائجها، وفي ما ننشره عنها.</span>
              </span>
            </li>
          </ul>
          <a className="drba-btn" data-kind="gold" data-wide="" href={WA_SPONSOR} target="_blank" rel="noopener">
            <WhatsappLogo />
            تواصل معنا لرعاية المسابقة القادمة
          </a>
          <p className="drba-note">
            أو راسلنا على <span dir="ltr">{WA_NUMBER}</span> أو <span dir="ltr">{SUPPORT_EMAIL}</span>.
          </p>
        </div>

        <button type="button" className="drba-link" onClick={() => go("board")}>
          المتصدّرون الآن
          <ArrowLeft />
        </button>
      </div>
    </>
  );
}
