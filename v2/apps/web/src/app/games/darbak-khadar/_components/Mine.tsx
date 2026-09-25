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
 *   - **لم يلعب**: العب، أو ادخل بحسابك أوّلًا.
 *
 * **واسمُ أدِيب هنا بإذن المالك**: زرُّ الحفظ نفسُه الذي في اللعبة بنصّه.
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
                <b>اسمُك محفوظٌ في هذا المتصفّح وحدَه</b>
                <p>
                  لو فتحتَ اللعبةَ من متصفّحٍ آخر أو مُسحت بياناتُه لم تجد اسمَك. ولا تُستلَم الجائزةُ إلّا بحساب
                  أدِيب، فمن خلاله نتواصل مع الفائز.
                </p>
              </div>
            </div>
            <a className="drba-btn" data-kind="suit" data-wide="" href={LOGIN}>
              <SignIn />
              احفظ تقدّمك بحسابك في أدِيب
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
                <p>ادخل بحسابك في أدِيب قبل أن تلعب، فالجائزةُ لا تُستلَم إلّا به. أو العب الآن واحفظ اسمك بعدها.</p>
              </div>
            </div>
            <a className="drba-btn" data-kind="suit" data-wide="" href={LOGIN}>
              <SignIn />
              ادخل بحسابك في أدِيب
            </a>
            <a className="drba-btn" data-kind="ghost" data-wide="" href={PLAY}>
              <Play />
              العب الآن
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
