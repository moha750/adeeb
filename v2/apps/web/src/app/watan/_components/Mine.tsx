"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ClockCounterClockwise, Copy, Key, Play, SignIn, UserCircleCheck } from "@phosphor-icons/react";
import { ArrowLeft, Check, Warning } from "@/app/_components/glyphs";
import { Cup, PLAY, n } from "./bits";
import type { BoardData } from "./Board";
import { tabHref, type TabKey } from "./tabs";

/**
 * **تبويبُ «حسابي»** (قرارُ المالك ٢٠٢٦-٠٩-٢٥). علّتُه الجائزة: لا رقمَ جوّالٍ يُجمع، فالفائزُ يُثبت
 * اسمَه بحسابه في أدِيب أو برمز الاسترجاع. وقراءةُ ذلك في تبويب المسابقة لا تحمي أحدًا؛ فهنا يرى
 * اللاعبُ **حالَ اسمه** بعينه، ويؤمّنه بضغطة.
 *
 * **أربعةُ أحوالٍ لا خامسَ لها**، والجملُ جملُ اللعبة نفسِها (شاشةُ البدء) كي لا يقرأ اللاعبُ
 * كلامين لشيءٍ واحد:
 *   - **بحساب**: محفوظٌ في حسابه، ولا يُعرَض عليه رمز (الحسابُ يغني عنه، كما في اللعبة).
 *   - **ضيفٌ له اسم**: اسمُه في هذا المتصفّح وحدَه. فأمامه الحفظُ بالحساب، ورمزُه ليكتبه.
 *   - **داخلٌ بلا اسم**: اسمُه يُحفَظ في حسابه من أوّل جولة.
 *   - **لم يلعب**: العب، أو ادخل بحسابك، أو استرجع اسمك برمز.
 *
 * **والرمزُ في الجهاز لا في الخادم:** القاعدةُ لا ترى إلّا بصمتَه، واللعبةُ تحفظه في `rw_code`
 * (الأصلُ نفسُه، فالصفحةُ تقرأ ما كتبته اللعبة وتكتب ما تقرؤه). فالخادمُ لا يعرفه، ويُرسم هنا
 * بعد الترطيب وحدَه. ومن لا رمزَ في متصفّحه يُصدَر له رمزٌ جديد ويسقط القديم، كما في اللعبة.
 *
 * **واسمُ أدِيب هنا بإذن المالك** (٢٠٢٦-٠٩-٢٥: أجاب عن «زرّ الحفظ بالحساب في حسابي» بنعم): الزرُّ
 * نفسُه الذي في اللعبة بنصّه، لأنّه أقوى ما يحمي الجائزة.
 */

const CODE_KEY = "rw_code";
const CODE_EVT = "rw-code";

function subCode(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(CODE_EVT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(CODE_EVT, cb);
  };
}
function readCode() {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}
const noCode = () => null;
function writeCode(c: string) {
  try {
    localStorage.setItem(CODE_KEY, c);
  } catch {
    /* ذاكرةُ المتصفّح مقفلة (تصفّحٌ خاصّ): الرمزُ يُعرض الآن ولا يُحفَظ */
  }
  window.dispatchEvent(new Event(CODE_EVT));
}
const fmtCode = (c: string) => `${c.slice(0, 5)} ${c.slice(5)}`;

/** الرمزُ كما يقبله الخادم: عشرةُ أرقام، بمسافةٍ أو بلا، وبأرقامٍ عربيّةٍ أو فارسيّة (كـ`codeNorm` في اللعبة). */
function normCode(v: string) {
  const d = v
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0))
    .replace(/[\s\-_.]/g, "");
  return /^[0-9]{10}$/.test(d) ? d : "";
}

type Api = { ok: boolean; message?: string; code?: unknown; name?: unknown };
async function api(path: "code" | "restore", body: Record<string, unknown> = {}): Promise<Api> {
  try {
    const r = await fetch(`/watan/api/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return (await r.json()) as Api;
  } catch {
    return { ok: false, message: "لا اتّصال. أعد المحاولة." };
  }
}

/** الدخولُ بحساب أدِيب يعود إلى هذا التبويب نفسِه، فيُضمّ ضيفُ المتصفّح إلى الحساب عند أوّل قراءة. */
const LOGIN = `/login?next=${encodeURIComponent(tabHref("me"))}`;

function CodeCard() {
  const code = useSyncExternalStore(subCode, readCode, noCode);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  async function issue() {
    setBusy(true);
    setErr("");
    const j = await api("code");
    setBusy(false);
    if (j.ok && typeof j.code === "string") writeCode(j.code);
    else setErr(j.message ?? "تعذّر إنشاءُ الرمز.");
  }

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setErr("تعذّر النسخ، فاكتبه كما تراه.");
    }
  }

  return (
    <div className="wtna-card">
      <h2>
        <Key />
        رمزُ الاسترجاع
      </h2>
      {code === "" ? (
        <>
          <p>لا رمزَ محفوظٌ في هذا المتصفّح. أصدِر رمزك واكتبه عندك، وإن كان لك رمزٌ قديمٌ سقط بالجديد.</p>
          <button type="button" className="wtna-btn" data-wide="" onClick={issue} disabled={busy} aria-busy={busy}>
            <Key />
            أصدِر رمزي
          </button>
        </>
      ) : (
        <>
          <div className="wtna-code">
            <span className="wtna-code-v" dir="ltr">
              {code ? fmtCode(code) : "----- -----"}
            </span>
            <button
              type="button"
              className="wtna-icon-btn"
              onClick={copy}
              disabled={!code}
              aria-label={copied ? "نُسخ الرمز" : "انسخ الرمز"}
            >
              {copied ? <Check /> : <Copy />}
            </button>
          </div>
          <p>اكتبه عندك أو صوّره. من يُدخله في متصفّحٍ آخر ينتقل إليه اسمُك ونتائجُك، فلا تعطه أحدًا.</p>
        </>
      )}
      {err ? <p className="wtna-err" role="alert">{err}</p> : null}
    </div>
  );
}

function RestoreCard() {
  const router = useRouter();
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const c = normCode(v);
    if (!c) {
      setErr("الرمزُ عشرةُ أرقام.");
      return;
    }
    setBusy(true);
    setErr("");
    const j = await api("restore", { code: c });
    setBusy(false);
    if (!j.ok) {
      setErr(j.message ?? "تعذّر الاسترجاع.");
      return;
    }
    writeCode(c);
    router.refresh();
  }

  return (
    <form className="wtna-card" onSubmit={submit}>
      <h2>
        <ClockCounterClockwise />
        عندي رمزُ استرجاع
      </h2>
      <p>لعبتَ من متصفّحٍ آخر؟ أدخل رمزك هنا ينتقل إليه اسمُك ونتائجُك.</p>
      <input
        className="wtna-in"
        value={v}
        onChange={(e) => setV(e.target.value)}
        inputMode="numeric"
        autoComplete="off"
        dir="ltr"
        maxLength={16}
        placeholder="عشرةُ أرقام"
        aria-label="رمزُ الاسترجاع"
      />
      {err ? <p className="wtna-err" role="alert">{err}</p> : null}
      <button type="submit" className="wtna-btn" data-kind="ghost" data-wide="" disabled={busy} aria-busy={busy}>
        استرجع اسمي
      </button>
    </form>
  );
}

function Stats({ me }: { me: NonNullable<BoardData["me"]> }) {
  const rank = (r: number | null) => (r === null ? "لم يُحسب" : n(r));
  return (
    <div className="wtna-card">
      <h2>أرقامُك</h2>
      <div className="wtna-stats">
        <div className="wtna-stat">
          <span>ترتيبُك في الأكواب</span>
          <b className="wtn-num">{rank(me.candy.rank)}</b>
        </div>
        <div className="wtna-stat">
          <span>مجموعُ أكوابك</span>
          <b className="wtn-num">
            <Cup /> {n(me.candy.value)}
          </b>
        </div>
        <div className="wtna-stat">
          <span>ترتيبُك في المسافة</span>
          <b className="wtn-num">{rank(me.dist.rank)}</b>
        </div>
        <div className="wtna-stat">
          <span>أبعدُ مسافة</span>
          <b className="wtn-num">
            {n(me.dist.value)}
            <span className="wtn-unit">م</span>
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
      <section className="wtna-hero">
        <h1>حسابي</h1>
        <p>{me ? `تلعب باسم «${me.name}».` : "اسمُك المستعارُ ونتائجُك، وكيف تحفظها."}</p>
      </section>

      <div className="wtna-body">
        {state === "account" ? (
          <div className="wtna-card" data-tone="ok">
            <div className="wtna-status">
              <UserCircleCheck />
              <div>
                <b>اسمُك محفوظٌ في حسابك</b>
                <p>تلعب به من أيّ جهازٍ تدخل فيه بحسابك في أدِيب، ولا تحتاج رمزًا.</p>
              </div>
            </div>
          </div>
        ) : null}

        {state === "guest" ? (
          <>
            <div className="wtna-card" data-tone="warn">
              <div className="wtna-status">
                <Warning />
                <div>
                  <b>اسمُك محفوظٌ في هذا المتصفّح وحدَه</b>
                  <p>
                    لو فتحتَ اللعبةَ من متصفّحٍ آخر أو مُسحت بياناتُه لم تجد اسمَك. ولا يستلم الفائزُ جائزتَه
                    إلّا بحسابه أو برمزه، فأمّن اسمَك بأحدهما.
                  </p>
                </div>
              </div>
              <a className="wtna-btn" data-kind="suit" data-wide="" href={LOGIN}>
                <SignIn />
                احفظ تقدّمك بحسابك في أدِيب
              </a>
              <p className="wtna-note">
                تدخل بحسابك أو تنشئه ثمّ تعود إلى هنا، فتنتقل إليه نتائجُك وتلعب به من أيّ جهاز. والحسابُ
                حفظٌ لا أفضليّة. ومن فتح الصفحةَ من إنستقرام أو إكس يدخل بالبريد، فقوقل لا يعمل داخلهما.
              </p>
            </div>
            <CodeCard />
          </>
        ) : null}

        {state === "fresh" ? (
          <div className="wtna-card" data-tone="ok">
            <div className="wtna-status">
              <UserCircleCheck />
              <div>
                <b>اسمُك يُحفَظ في حسابك</b>
                <p>اختر اسمَك المستعارَ في أوّل جولة، فيُحفَظ في حسابك وتلعب به من أيّ جهاز.</p>
              </div>
            </div>
            <a className="wtna-btn" data-kind="suit" data-wide="" href={PLAY}>
              <Play />
              العب الآن
            </a>
          </div>
        ) : null}

        {state === "none" ? (
          <div className="wtna-card">
            <div className="wtna-status">
              <Play />
              <div>
                <b>لم تلعب بعد</b>
                <p>العب جولةً باسمٍ مستعارٍ تختاره، تجده في لوحة الصدارة.</p>
              </div>
            </div>
            <a className="wtna-btn" data-kind="suit" data-wide="" href={PLAY}>
              <Play />
              العب الآن
            </a>
            <a className="wtna-btn" data-kind="ghost" data-wide="" href={LOGIN}>
              <SignIn />
              لك حسابٌ في أدِيب؟ ادخل به
            </a>
          </div>
        ) : null}

        {me ? <Stats me={me} /> : <RestoreCard />}

        <button type="button" className="wtna-link" onClick={() => go("help")}>
          واجهتك مشكلة؟ الدعم
          <ArrowLeft />
        </button>
      </div>
    </>
  );
}
