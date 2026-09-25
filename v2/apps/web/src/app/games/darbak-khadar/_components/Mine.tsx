"use client";

import { Play, SignIn, UserCircleCheck } from "@phosphor-icons/react";
import { ArrowLeft, Warning } from "@/app/_components/glyphs";
import { Cup, LOGIN, PLAY, n } from "./bits";
import type { BoardData } from "./Board";
import type { TabKey } from "./tabs";

/**
 * **تبويبُ «حسابي»** (قرارُ المالك ٢٠٢٦-٠٩-٢٥). يرى فيه اللاعبُ **حالَ اسمه** بعينه، ويحفظه بضغطة.
 *
 * **وحسابُ أدِيب وحدَه يحفظ الاسمَ ويُثبته للجائزة** (قرارُ المالك في اليوم نفسِه: «يُزال رمز الاسترجاع
 * بشكلٍ نهائيٍّ وجذريّ، ونكتفي بإنشاء حسابٍ من أدِيب لحفظ تقدّمك والتواصل معك عند الفوز»). فأُزيل
 * رمزُ الاسترجاع من هنا ومن اللعبة والأبواب والقاعدة.
 *
 * **أربعةُ أحوالٍ لا خامسَ لها**، والجملُ جملُ اللعبة نفسِها كي لا يقرأ اللاعبُ كلامين لشيءٍ واحد:
 *   - **بحساب**: محفوظٌ في حسابه، يلعب به من أيّ جهاز.
 *   - **ضيفٌ له اسم**: اسمُه في هذا المتصفّح وحدَه، ولا جائزةَ بلا حساب. فأمامه الحفظُ بالحساب.
 *   - **داخلٌ بلا اسم**: اسمُه يُحفَظ في حسابه من أوّل جولة.
 *   - **لم يلعب**: العب الآن بلا تسجيل، ولمن له حسابٌ «ادخل به».
 *
 * **والحسابُ عرضٌ لا شرط** (المالك ٢٠٢٦-٠٩-٢٥: «ما تشوف ادخل بحسابك في أدِيب تُضعف الرغبة؟»):
 * العبُ أوّلًا، والحفظُ لمن عنده أكوابٌ يخسرها، بحسابٍ مجّانيٍّ ليس عضويّة.
 */

function Stats({ me }: { me: NonNullable<BoardData["me"]> }) {
  const rank = (r: number | null) => (r === null ? "لم يُحسب" : n(r));
  return (
    <div className="drba-card">
      <h2>أرقامُك</h2>
      <div className="drba-stats">
        <div className="drba-stat">
          <span>ترتيبُك في الأكواب</span>
          <b className="drb-num">{rank(me.candy.rank)}</b>
        </div>
        <div className="drba-stat">
          <span>مجموعُ أكوابك</span>
          <b className="drb-num">
            <Cup /> {n(me.candy.value)}
          </b>
        </div>
        <div className="drba-stat">
          <span>ترتيبُك في المسافة</span>
          <b className="drb-num">{rank(me.dist.rank)}</b>
        </div>
        <div className="drba-stat">
          <span>أبعدُ مسافة</span>
          <b className="drb-num">
            {n(me.dist.value)}
            <span className="drb-unit">م</span>
          </b>
        </div>
      </div>
    </div>
  );
}

export function Mine({ data, go }: { data: BoardData; go: (t: TabKey) => void }) {
  const me = data.me;
  const state = me ? (me.account ? "account" : "guest") : data.loggedIn ? "fresh" : "none";

  return (
    <>
      <section className="drba-hero">
        <h1>حسابي</h1>
        <p>{me ? `تلعب باسم «${me.name}».` : "اسمُك المستعارُ ونتائجُك، وكيف تحفظها."}</p>
      </section>

      <div className="drba-body">
        {state === "account" ? (
          <div className="drba-card" data-tone="ok">
            <div className="drba-status">
              <UserCircleCheck />
              <div>
                <b>اسمُك محفوظٌ في حسابك</b>
                <p>تلعب به من أيّ جهازٍ تدخل فيه بحسابك في أدِيب، ومن خلاله نتواصل معك إن فزت.</p>
              </div>
            </div>
          </div>
        ) : null}

        {state === "guest" ? (
          <div className="drba-card" data-tone="warn">
            <div className="drba-status">
              <Warning />
              <div>
                <b>اسمُك وأكوابُك محفوظةٌ في هذا المتصفّح وحدَه</b>
                <p>
                  لو فتحتَ اللعبةَ من متصفّحٍ آخر أو مُسحت بياناتُه لم تجدها. احفظها بحسابٍ مجّانيٍّ في دقيقة لتُحسب
                  لك إن فزت، ومن خلاله نتواصل معك. والحسابُ ليس عضويّةً في النادي.
                </p>
              </div>
            </div>
            <a className="drba-btn" data-kind="suit" data-wide="" href={LOGIN}>
              <SignIn />
              احفظ أكوابي باسمي
            </a>
            <p className="drba-note">
              تدخل بحسابك أو تنشئه ثمّ تعود إلى هنا، فتنتقل إليه نتائجُك وتلعب به من أيّ جهاز. والحسابُ حفظٌ لا
              أفضليّة. ومن فتح الصفحةَ من إنستقرام أو إكس يدخل بالبريد، فقوقل لا يعمل داخلهما.
            </p>
          </div>
        ) : null}

        {state === "fresh" ? (
          <div className="drba-card" data-tone="ok">
            <div className="drba-status">
              <UserCircleCheck />
              <div>
                <b>اسمُك يُحفَظ في حسابك</b>
                <p>اختر اسمَك المستعارَ في أوّل جولة، فيُحفَظ في حسابك وتلعب به من أيّ جهاز.</p>
              </div>
            </div>
            <a className="drba-btn" data-kind="suit" data-wide="" href={PLAY}>
              <Play />
              العب الآن
            </a>
          </div>
        ) : null}

        {state === "none" ? (
          <div className="drba-card">
            <div className="drba-status">
              <Play />
              <div>
                <b>لم تلعب بعد</b>
                <p>العب باسمٍ مستعارٍ بلا تسجيل. وإن جمعت أكوابًا فاحفظها باسمك بحسابٍ مجّانيٍّ لتُحسب لك إن فزت.</p>
              </div>
            </div>
            <a className="drba-btn" data-kind="suit" data-wide="" href={PLAY}>
              <Play />
              العب الآن
            </a>
            <a className="drba-btn" data-kind="ghost" data-wide="" href={LOGIN}>
              <SignIn />
              لك حساب؟ ادخل به
            </a>
          </div>
        ) : null}

        {me ? <Stats me={me} /> : null}

        <button type="button" className="drba-link" onClick={() => go("help")}>
          واجهتك مشكلة؟ الدعم
          <ArrowLeft />
        </button>
      </div>
    </>
  );
}
