"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import { Confetti, Crown, HandSwipeRight, Lifebuoy, Medal, Play, PersonSimpleRun, SignIn, Trophy, UserCircle } from "@phosphor-icons/react";
import { ArrowLeft, CaretDown, Warning } from "@/app/_components/glyphs";
import { LOGIN, PLAY, Tamr, cups, n, tamr, useOnce } from "./bits";
import { Celebrate } from "./Celebrate";
import { Contest } from "./Contest";
import { Help } from "./Help";
import { HowTo } from "./HowTo";
import { Mine } from "./Mine";
import { TABS, tabHref, type TabKey } from "./tabs";

/**
 * **صفحةُ «دربك خضر»: خمسةُ تبويبات** — حسابي، والمسابقة، والصدارة، وكيف تُلعب؟، والدعم (قرارُ المالك
 * ٢٠٢٦-٠٩-٢٥، بعد نقاشٍ بدأ بثلاثة ثمّ صار خمسة: «طريقة اللعب مُهم»، و«أرى إضافة تبويب للدعم»).
 * والشريطُ ملازمٌ أعلى الشاشة لأنّ أسفلها لشريط «أنت». والتبويبُ في الرابط (`?tab=`، انظر `tabs.ts`)
 * فيُرسَم من الخادم من أوّل طلب، ويتبدّل هنا بلا تنقّل.
 *
 * **لوحةُ الصدارة** — التصميمُ الذي اختاره المالك (٢٠٢٦-٠٩-٢٤: «أريد تصميم أ ولكن يكون منه ليلي
 * ونهاري»)، ومعرضُه `/ui/darb-board` يرسم هذا المكوّنَ نفسَه.
 *
 * يأخذ الصفوفَ جاهزةً (القراءةُ في الخادم، `app/games/darbak-khadar/page.tsx`)، ولا يعرف إلّا العرض:
 * اللوحتان والتبديلُ بينهما، والثلاثةُ على منصّة، والبقيّةُ في قائمةٍ تتّسع إلى خمسين،
 * وشريطُ «أنت» ملازمٌ في الأسفل. والضوءُ ليلٌ أو نهارٌ من جذر البرنامج (`data-sky`)
 * لا من هنا.
 *
 * **والأرقامُ غربيّة** كما هي في اللعبة نفسِها (عدّادُها وشاشةُ نهايتها): من خرج من
 * الجولة بـ«6,840 م» يجدها في اللوحة كما رآها، لا «٦٬٨٤٠».
 *
 * **بعد المسابقة لوحتان دائمتان** (قرارُ المالك ٢٠٢٦-٠٩-٢٨): «أبعد مسافة» أوّلًا (أفضلُ جولة، ومعها جولاتُ
 * ما بعد الإقفال)، و«أكثر تمر» (مجموعُ الجولات كلّها، يبدأ من صفرٍ للجميع). بلا تصفيرٍ ولا جوائز. وكانت
 * الأولى أيّامَ المسابقة لوحةَ أكواب oos وعليها الجوائز، فصارت الأكوابُ ذكرى: في «حسابي» وفي تبويب المسابقة.
 * والاسمُ الداخليّ `candy` باقٍ في اللبّ للتمرة: التبديلُ رسمٌ لا حساب.
 */

export type BoardKind = "dist" | "tamr";
export type BoardRow = { rank: number; name: string; value: number };
export type Standing = { value: number; rank: number | null; above: number | null };
/**
 * أكوابُ اللاعب ذكرى (`darb_me`): `total` كلُّها (المسابقةُ وما لُعب بعدها قبل التمرة)، و`contest` ما جمعه
 * في المسابقة، و`rank` ترتيبُه فيها بين `of` ممّن جمعوا أكوابًا.
 */
export type Cups = { total: number; contest: number; rank: number | null; of: number };
/** `account`: لاعبُه محفوظٌ بحساب أدِيب (من `darb_me`). */
export type BoardMe = { name: string; dist: Standing; tamr: Standing; cups: Cups; account?: boolean } | null;
/** موعدا المسابقة مكتوبَين بتوقيت الرياض، لذكراها. */
export type BoardContest = { starts: string; ends: string } | null;
/** فائزٌ (`darb_winners`): ترتيبُه واسمُه المستعار وأرقامُه في المسابقة، ودقائقُ لعبه من التكّات. */
export type Winner = { rank: number; name: string; cups: number; dist: number; runs: number; minutes: number };
/** أرقامُ المسابقة كلِّها (`darb_contest_recap`). */
export type Recap = { players: number; runs: number; cups: number; minutes: number };
/** `loggedIn`: داخلٌ بحساب أدِيب في الموقع (لـ«حسابي»: من دخل ولم يلعب يُقال له إنّ اسمَه يُحفَظ في حسابه). */
export type BoardData = {
  dist: BoardRow[];
  tamr: BoardRow[];
  me: BoardMe;
  contest?: BoardContest;
  failed?: boolean;
  loggedIn?: boolean;
  winners?: Winner[];
  recap?: Recap | null;
};

/** القائمةُ تُعرض عشرةً أوّلًا (الثلاثةُ على المنصّة وسبعةٌ تحتها)، ثمّ تتّسع إلى ما جاء. */
const FIRST = 10;

/** الحرفُ الأوّلُ من الاسم بعد «ال»: «الرحّال» تُقرأ راءً لا ألفًا. */
const initial = (name: string) => name.replace(/^ال/, "").charAt(0);

/** القيمةُ بوحدتها: المترُ حرفٌ بعد الرقم، والتمرةُ رسمٌ قبله. */
function Val({ b, v }: { b: BoardKind; v: number }) {
  return b === "dist" ? (
    <span className="drb-num">
      {n(v)}
      <span className="drb-unit">م</span>
    </span>
  ) : (
    <span className="drb-num">
      <Tamr /> {n(v)}
    </span>
  );
}

/** سطرُ «أنت» الثاني: كم بينك وبين من فوقك، أو أنّك في الصدارة. */
function gapLine(b: BoardKind, s: Standing) {
  if (s.rank === null) return "لم تُحسَب لك جولةٌ هنا بعد";
  if (s.rank === 1 || s.above === null) return "أنت في الصدارة";
  const d = s.above - s.value;
  const up = n(s.rank - 1);
  if (d <= 0) return `تعادلتَ مع المركز ${up}، وسبقك إليه بالوقت`;
  return b === "dist" ? `تبعد ${n(d)} م عن المركز ${up}` : `تحتاج ${tamr(d)} للمركز ${up}`;
}

const NOTE: Record<BoardKind, string> = {
  dist: "أفضلُ جولةٍ لكلّ لاعب",
  tamr: "مجموعُ التمر في جولاتك كلّها",
};

const FINE = "يظهر هنا اسمُك المستعار وحده. ويتحدّث الترتيبُ كلّ دقيقة.";

/** أيقونةُ كلّ تبويب: الكأسُ للصدارة، والوسامُ لذكرى المسابقة، والسحبُ للّعب، والشخصُ للحساب، وطوقُ النجاة للدعم. */
const ICON: Record<TabKey, ReactNode> = {
  board: <Trophy />,
  contest: <Medal />,
  how: <HandSwipeRight />,
  me: <UserCircle />,
  help: <Lifebuoy />,
};

/** تبويبُ الصدارة: اللوحتان والمنصّةُ والقائمة، كما كانت الصفحةُ كلُّها قبل التبويبات. */
function Leaders({
  data,
  b,
  setB,
  note,
  go,
}: {
  data: BoardData;
  b: BoardKind;
  setB: (b: BoardKind) => void;
  note: boolean;
  go: (t: TabKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const rows = data[b];
  const me = data.me;
  /* **الحفظُ بالحساب عرضٌ لمن عنده ما يخسره** (المالك ٢٠٢٦-٠٩-٢٥: «ما تشوف ادخل بحسابك في أدِيب تُضعف
     الرغبة؟ ممكن يقول يعني لازم أكون في أدِيب؟»). فمن لم يلعب لا يرى بطاقةَ حسابٍ أصلًا، واللعبُ بلا تسجيل.
     ومن له نتيجةٌ أو أكوابٌ من المسابقة يُدعى إلى حفظها باسمه بحسابٍ مجّانيٍّ لا عضويّةَ فيه. */
  const secured = Boolean(data.loggedIn || me?.account);
  const remind = !secured && me !== null && (me.dist.value > 0 || me.tamr.value > 0 || me.cups.total > 0);

  const at = (r: number) => rows.find((x) => x.rank === r);
  const pod = [2, 1, 3].map((r) => ({ r, e: at(r) }));
  const rest = rows.filter((x) => x.rank > 3);
  const shown = open ? rest : rest.slice(0, FIRST - 3);

  return (
    <>
      <section className="drba-hero">
        <h1>المتصدّرون</h1>
        {/* **رسالةُ الأكواب مرّةً واحدة** (قرارُ المالك ٢٠٢٦-٠٩-٢٨): من جمع أكوابًا يعرف أنّها محفوظةٌ وأنّ ما يُجمَع
            الآن تمر، فلا يظنّ اسمَه سقط من اللوحة. والمفتاحُ نفسُه في اللعبة، فأيُّهما رآه أوّلًا كفى. */}
        {note && me ? (
          <div className="drba-card" data-tone="gold">
            <div className="drba-status">
              <Confetti />
              <div>
                <b>انتهت المسابقة، وأكوابُك محفوظة</b>
                <p>{`عندك ${cups(me.cups.total)} في «حسابي» وفي ذكرى المسابقة. وما تجمعه الآن تمر، ولوحتُه تبدأ من صفرٍ للجميع.`}</p>
              </div>
            </div>
            <button type="button" className="drba-link" onClick={() => go("contest")}>
              ذكرى المسابقة
              <ArrowLeft />
            </button>
          </div>
        ) : null}
        {remind && me ? (
          <div className="drba-card" data-tone="warn">
            <div className="drba-status">
              <Warning />
              <div>
                <b>{`«${me.name}»، احفظ نتائجك باسمك`}</b>
                <p>
                  نتائجُك محفوظةٌ في هذا المتصفّح وحدَه. احفظها بحسابٍ مجّانيٍّ في دقيقة لتلعب بها من أيّ جهاز.
                  والحسابُ ليس عضويّةً في النادي.
                </p>
              </div>
            </div>
            <a className="drba-btn" data-kind="suit" data-wide="" href={LOGIN}>
              <SignIn />
              احفظ نتائجي باسمي
            </a>
          </div>
        ) : null}
        <p>{NOTE[b]}</p>
        <div className="drba-tabs" role="group" aria-label="اللوحة">
          <button className="drba-tab" type="button" aria-pressed={b === "dist"} onClick={() => setB("dist")}>
            <PersonSimpleRun />
            أبعد مسافة
          </button>
          <button className="drba-tab" type="button" aria-pressed={b === "tamr"} onClick={() => setB("tamr")}>
            <Tamr />
            أكثر تمر
          </button>
        </div>
      </section>

      {rows.length === 0 ? (
        <div className="drba-empty">
          {b === "tamr" ? <Tamr /> : <PersonSimpleRun />}
          <b>{data.failed ? "تعذّرت قراءةُ اللوحة الآن" : b === "tamr" ? "أوّلُ تمرةٍ تضعك في رأسها" : "اللوحةُ تنتظر أوّلَ عدّاء"}</b>
          <p>{data.failed ? "أعد فتح الصفحة بعد قليل." : "العب جولةً واحدةً تجد اسمَك في رأسها."}</p>
          <a className="drba-play" href={PLAY}>
            <Play />
            العب الآن
          </a>
        </div>
      ) : (
        <>
          <ol className="drba-pod" aria-label="الثلاثة الأوائل">
            {pod.map(({ r, e }) => (
              <li key={r} className="drba-step" data-rank={r} data-empty={e ? undefined : ""} data-me={e && me?.name === e.name ? "" : undefined}>
                {r === 1 ? <Crown className="drba-crown" /> : null}
                <span className="drba-av" aria-hidden="true">{e ? initial(e.name) : "؟"}</span>
                <span className="drba-who">{e ? e.name : "مكانٌ شاغر"}</span>
                <span className="drba-val">{e ? <Val b={b} v={e.value} /> : null}</span>
                <span className="drba-block">{r}</span>
              </li>
            ))}
          </ol>

          <div className="drba-sheet">
            {shown.length > 0 ? (
              <ol className="drba-list">
                {shown.map((e) => (
                  <li key={e.rank} className="drba-row" data-me={me?.name === e.name ? "" : undefined}>
                    <span className="drba-rk drb-num">{e.rank}</span>
                    <span className="drba-mini" aria-hidden="true">{initial(e.name)}</span>
                    <span className="drba-name">{e.name}</span>
                    <span className="drba-num"><Val b={b} v={e.value} /></span>
                  </li>
                ))}
              </ol>
            ) : null}
            {!open && rest.length > shown.length ? (
              <button className="drba-more" type="button" onClick={() => setOpen(true)}>
                {rows.length >= 50 ? "بقيّة الخمسين" : "بقيّة الترتيب"}
                <CaretDown />
              </button>
            ) : null}
            <p className="drba-fine">{FINE}</p>
          </div>
        </>
      )}
    </>
  );
}

/**
 * الصفحةُ كلُّها. `tab` ما طلبه الرابطُ أوّلَ مرّة (يقرؤه الخادم)، و`syncUrl` يكتب التبويبَ في
 * الرابط عند التبديل. والمعرضُ يُطفئه: إطارُه صفحةٌ أخرى لا يصحّ أن يتبدّل رابطُها.
 */
export function Board({ data, tab: first = "board", syncUrl = true }: { data: BoardData; tab?: TabKey; syncUrl?: boolean }) {
  const [tab, setTab] = useState<TabKey>(first);
  const [b, setB] = useState<BoardKind>("dist");
  const me = data.me;
  const mine = me ? me[b] : null;

  const go = useCallback(
    (t: TabKey) => {
      setTab(t);
      if (!syncUrl) return;
      // استبدالٌ لا دفع: زرُّ الرجوع يعود إلى ما قبل الصفحة، لا يمشي بين تبويباتها
      window.history.replaceState(null, "", tabHref(t));
      window.scrollTo({ top: 0 });
    },
    [syncUrl],
  );

  /* **الفائزُ يُحتفى به حين يدخل** (طلبُ المالك ٢٠٢٦-٠٩-٢٧): إن كان اسمُ صاحب المتصفّح أو الحساب بين
     الثلاثة فقصاصاتٌ وتبريك، يُغلَق بلمسة. **ومرّةً واحدةً في المتصفّح** منذ صارت المسابقةُ ذكرى (٢٠٢٦-٠٩-٢٨):
     تبريكٌ يتكرّر في كلّ دخولٍ يصير ضجيجًا. */
  const win = me ? data.winners?.find((w) => w.name === me.name) : undefined;
  const [cel, endCel] = useOnce("darb_celebrated", Boolean(win));
  const [note] = useOnce("darb_cupsNote", (me?.cups.total ?? 0) > 0);

  let panel: ReactNode;
  if (tab === "contest")
    panel = <Contest contest={data.contest ?? null} winners={data.winners} recap={data.recap ?? null} me={me} go={go} />;
  else if (tab === "how") panel = <HowTo />;
  else if (tab === "me") panel = <Mine data={data} go={go} />;
  else if (tab === "help") panel = <Help go={go} />;
  else panel = <Leaders data={data} b={b} setB={setB} note={note} go={go} />;

  return (
    <div className="drba-page">
      {cel && win ? (
        <Celebrate
          win={win}
          onClose={endCel}
          onWinners={() => {
            endCel();
            go("contest");
          }}
        />
      ) : null}
      <header className="drba-head">
        <span className="drb-mark">
          دربك <b>خضر</b>
        </span>
        <a className="drba-play" href={PLAY}>
          <Play />
          العب
        </a>
      </header>

      <div className="drba-nav" role="tablist" aria-label="أقسام الصفحة">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`drb-tab-${t.key}`}
            className="drba-navi"
            aria-selected={tab === t.key}
            aria-controls="drb-panel"
            onClick={() => go(t.key)}
          >
            {ICON[t.key]}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div id="drb-panel" className="drba-panel" role="tabpanel" aria-labelledby={`drb-tab-${tab}`}>
        {panel}
        {/* اسمُ أدِيب هنا سطرُ الصانع (قرارُ المالك ٢٠٢٦-٠٩-٢٤)، وصار رابطًا إلى موقع النادي (٢٠٢٦-٠٩-٢٥):
            تسويقٌ لمن شاء بلا موضعٍ جديدٍ للاسم. ومواضعُه الأخرى بإذنه: زرُّ الحفظ بالحساب (في اللعبة
            وفي «حسابي»)، وقناةُ الدعم (موقعُ النادي وبريدُه) */}
        <p className="drba-credit">
          من إنتاج وتشغيل <Link href="/">نادي أدِيب</Link>
        </p>
      </div>

      <div className="drba-me">
        {me && mine ? (
          <div className="drba-me-in">
            <span className="drba-me-rk drb-num">{mine.rank ?? ""}</span>
            <span className="drba-me-who">
              <b>أنت، {me.name}</b>
              <span>{gapLine(b, mine)}</span>
            </span>
            <span className="drba-me-val">{mine.rank !== null ? <Val b={b} v={mine.value} /> : null}</span>
          </div>
        ) : (
          <a className="drba-me-in" href={PLAY} data-out="">
            <span className="drba-me-rk" aria-hidden="true"><Play /></span>
            <span className="drba-me-who">
              <b>لم تدخل اللوحةَ بعد</b>
              <span>العب باسمٍ مستعارٍ تجده هنا</span>
            </span>
          </a>
        )}
      </div>
    </div>
  );
}
