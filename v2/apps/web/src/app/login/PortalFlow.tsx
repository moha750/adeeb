"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Field } from "@adeeb/design-system";
import { At, Envelope, Hash, Key, Lock } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { CAPTCHA_PENDING, toArabicAuthError, toArabicCodeError, waitSeconds } from "@/lib/authErrors";
import { EMAIL_HINT, emailError, isEmail } from "@/lib/fieldFormats";
import { safeNext } from "@/lib/safeNext";
import { logSignin } from "@/lib/signinEvents";
import { startOAuth } from "@/lib/oauthStart";
import { NO_ACCOUNT, PROVIDER_NAME, SIGNUP_EMAIL_KEY, isNoAccountError, isProvider, type OAuthProvider } from "@/lib/oauthIntent";
import { readLastSignin, rememberSignin } from "@/lib/lastSignin";
import { CELEBRATE_MS, setDeeboMood } from "@/lib/deeboMood";
import { TurnstileWidget, useTurnstileWait } from "@/app/_components/Turnstile";
import { AltLink, Back, Chip, Fields, Head, Note } from "@/app/_door/parts";
import { useGreeting } from "@/app/_door/DeeboFace";
import { DoorWays } from "@/app/_door/DoorWays";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
/** أقلُّ فاصلٍ بين رمزين لصاحب البريد الواحد — يطابق `smtp_max_frequency` في `scripts/auth-config.mjs`. */
const RESEND_AFTER = 60;

type Step = "ways" | "email" | "password" | "code";

/**
 * **بوّابة أدِيب خطوةً خطوة** (قرار المالك ٢٠٢٦-١٠-١٨: «غيّر كلَّ شيء من الصفر»):
 * الطرقُ أوّلًا (قوقل، أبل، البريد)، ثمّ البريد، ثمّ كلمةُ المرور أو الرمز — قرارٌ واحدٌ في كلّ
 * خطوة. وكان النموذجُ القديم يعرض الطرقَ والمبدّلَ والحقولَ كلَّها معًا.
 *
 * **والبوّابةُ لا تفتح حسابًا** (القرار نفسه): الرمزُ بـ`shouldCreateUser: false`، وقوقلُ وأبل
 * يحكم فيهما بابُ العودة. ومن لا حسابَ له يُقال له ذلك ومعه زرٌّ يُكمل الإنشاءَ بضغطة.
 * وكلُّ محاولةٍ تُكتب في `signin_events` (`lib/signinEvents.ts`).
 */
export function PortalFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [step, setStep] = useState<Step>("ways");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [left, setLeft] = useState(0);
  const [emailTouched, setEmailTouched] = useState(false);
  const [err, setErr] = useState<string | null>(() => {
    const e = params.get("e");
    return e && e !== NO_ACCOUNT ? toArabicAuthError(e) : null;
  });
  const [noAccount, setNoAccount] = useState<OAuthProvider | "email" | null>(() => {
    if (params.get("e") !== NO_ACCOUNT) return null;
    const p = params.get("p");
    return isProvider(p) ? p : "email";
  });
  const [creating, setCreating] = useState(false);
  const [pending, start] = useTransition();
  const [preferCode, setPreferCode] = useState(false);
  const greet = useGreeting();

  const [tsToken, setTsToken] = useState<string | null>(null);
  const [tsReset, setTsReset] = useState(0);
  const waitToken = useTurnstileWait(tsToken, !!TURNSTILE_SITE_KEY);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ذاكرةُ المتصفّح بعد الترطيب
    setPreferCode(readLastSignin() === "code");
  }, []);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  // ── ديبو يعيش الخطوة ──
  const [focus, setFocus] = useState<"email" | "password" | null>(null);
  const [hush, setHush] = useState(false);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- خطأٌ جديدٌ يُعيد الاعتذار
    if (err || noAccount) setHush(false);
  }, [err, noAccount]);
  useEffect(() => {
    setDeeboMood(ok ? "success" : pending ? "busy" : noAccount && !hush ? "none" : err && !hush ? "error" : focus ?? "idle");
  }, [ok, pending, noAccount, err, hush, focus]);
  const on = (f: "email" | "password") => ({ onFocus: () => { setFocus(f); setHush(true); }, onBlur: () => setFocus(null) });

  const go = (s: Step) => { setErr(null); setNoAccount(null); setFocus(null); setStep(s); };

  const done = () => {
    setOk(true);
    setTimeout(() => { router.replace(next); router.refresh(); }, CELEBRATE_MS);
  };

  const emailOk = () => {
    if (isEmail(email)) return true;
    setEmailTouched(true);
    setErr(`${EMAIL_HINT}.`);
    return false;
  };

  const signInWithPassword = () => {
    setErr(null);
    start(async () => {
      const captchaToken = await waitToken();
      if (TURNSTILE_SITE_KEY && !captchaToken) { setErr(CAPTCHA_PENDING); setTsReset((n) => n + 1); return; }
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw, options: { captchaToken } });
      setTsReset((n) => n + 1);
      if (error) {
        logSignin(supabase, "password", "fail", "login", error.message);
        setErr(toArabicAuthError(error.message));
        return;
      }
      logSignin(supabase, "password", "success", "login");
      rememberSignin("password");
      done();
    });
  };

  const sendCode = () => {
    setErr(null);
    setNoAccount(null);
    if (!emailOk()) return;
    start(async () => {
      const captchaToken = await waitToken();
      if (TURNSTILE_SITE_KEY && !captchaToken) { setErr(CAPTCHA_PENDING); setTsReset((n) => n + 1); return; }
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, captchaToken } });
      setTsReset((n) => n + 1);
      if (error) {
        const wait = waitSeconds(error.message);
        if (wait) { setLeft(wait); setStep("code"); return; }
        if (isNoAccountError(error.message)) {
          logSignin(supabase, "code", "fail", "login", NO_ACCOUNT);
          setNoAccount("email");
          return;
        }
        logSignin(supabase, "code", "fail", "login", error.message);
        setErr(toArabicCodeError(error.message));
        return;
      }
      logSignin(supabase, "code", "code_sent", "login");
      setCode("");
      setLeft(RESEND_AFTER);
      setStep("code");
    });
  };

  const verifyCode = () => {
    setErr(null);
    start(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
      if (error) {
        logSignin(supabase, "code", "fail", "login", error.message);
        setErr(toArabicCodeError(error.message));
        return;
      }
      logSignin(supabase, "code", "success", "login");
      rememberSignin("code");
      done();
    });
  };

  /** «لا حسابَ لك» يُكمل الإنشاء: بالمزوّد نفسه بضغطة، أو إلى صفحة الإنشاء وبريدُه معه. */
  const createAccount = () => {
    if (noAccount === "email" || noAccount === null) {
      try { sessionStorage.setItem(SIGNUP_EMAIL_KEY, email.trim()); } catch { /* يكتبه من جديد */ }
      router.push(next === "/dashboard" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`);
      return;
    }
    setCreating(true);
    void startOAuth(noAccount, next, "signup").then((error) => {
      if (error) { setErr(toArabicAuthError(error)); setCreating(false); }
    });
  };

  const signupHref = next === "/dashboard" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`;
  const notices = (
    <>
      {err ? <Note tone="error" title="عذرًا">{err}</Note> : null}
      {noAccount ? (
        <Note
          tone="warn"
          title="ليس لك حسابٌ في أدِيب"
          actions={
            <Button type="button" variant="primary" size="sm" loading={creating} onClick={createAccount}>
              {noAccount === "email" ? "أنشئ حسابك" : `أنشئ حسابك بـ${PROVIDER_NAME[noAccount]}`}
            </Button>
          }
        >
          {noAccount === "email" ? "لا حسابَ بهذا البريد." : `لا حسابَ في أدِيب بحسابك في ${PROVIDER_NAME[noAccount]}.`}
        </Note>
      ) : null}
    </>
  );
  const emailChip = <Chip ltr label="تغيير البريد" onEdit={() => go("email")}>{email.trim()}</Chip>;
  const alt = <AltLink lead="ليس لك حساب؟" href={signupHref}>أنشئ حسابًا</AltLink>;

  return (
    <>
      {step === "ways" ? (
        <section key="ways" className="door-step">
          {/* «البوّابة» في عنوان اللوح، فلا تتكرّر هنا بجانبه */}
          <Head kicker={greet ?? "\u00a0"} sub="كيف تحبّ أن تدخل؟">نوّرت أدِيب</Head>
          {notices}
          <DoorWays intent="login" next={next} onEmail={() => go("email")} onError={setErr} />
          {alt}
        </section>
      ) : null}

      {step === "email" ? (
        <form key="email" className="door-step" noValidate onSubmit={(e) => { e.preventDefault(); if (!emailOk()) return; if (preferCode) sendCode(); else go("password"); }}>
          <Back onClick={() => go("ways")}>طرقُ الدخول</Back>
          <Head sub="ثمّ تختار: كلمةَ المرور، أو رمزًا نرسله إليك.">ادخل ببريدك</Head>
          {notices}
          <Fields>
            <Field
              label="البريد الإلكترونيّ" type="email" charset="latin" icon={<Envelope />} innerIcon={<At />}
              placeholder="you@adeeb.club" autoComplete="email" autoFocus
              value={email} onChange={(e) => { setEmail(e.target.value); setNoAccount(null); }}
              {...on("email")} onBlur={() => { setEmailTouched(true); setFocus(null); }}
              error={emailError(email, emailTouched)} required
            />
            <div className="door-pair">
              <Button type={preferCode ? "button" : "submit"} variant={preferCode ? "ghost" : "primary"} size="lg" disabled={!email.trim() || pending}
                onClick={preferCode ? () => { if (emailOk()) go("password"); } : undefined}>
                بكلمة المرور
              </Button>
              <Button type={preferCode ? "submit" : "button"} variant={preferCode ? "primary" : "ghost"} size="lg" disabled={!email.trim()} loading={pending}
                onClick={preferCode ? undefined : sendCode}>
                أرسل لي رمزًا
              </Button>
            </div>
          </Fields>
          {alt}
        </form>
      ) : null}

      {step === "password" ? (
        <form key="password" className="door-step" noValidate onSubmit={(e) => { e.preventDefault(); signInWithPassword(); }}>
          {emailChip}
          <Head>كلمةُ المرور</Head>
          {notices}
          <Fields>
            <Field
              label="كلمة المرور" type="password" dir="ltr" icon={<Lock />} innerIcon={<Key />}
              placeholder="••••••••" autoComplete="current-password" autoFocus
              value={pw} onChange={(e) => setPw(e.target.value)} {...on("password")} required
            />
            <Link href="/forgot-password" className="door-forgot">نسيت كلمة المرور؟</Link>
            <Button type="submit" variant="primary" size="lg" loading={pending} disabled={!pw}>دخول</Button>
          </Fields>
        </form>
      ) : null}

      {step === "code" ? (
        <form key="code" className="door-step" noValidate onSubmit={(e) => { e.preventDefault(); verifyCode(); }}>
          {emailChip}
          <Head sub="ستّةُ أرقامٍ تجدها في بريدك الآن.">أرسلنا إليك رمزًا</Head>
          {notices}
          <Fields>
            <Field
              label="الرمز" charset="digits" icon={<Key />} innerIcon={<Hash />} placeholder="______"
              inputMode="numeric" maxLength={6} autoComplete="one-time-code" autoFocus
              value={code} onChange={(e) => setCode(e.target.value)} {...on("email")} required
            />
            <div className="door-pair">
              <Button type="submit" variant="primary" size="lg" loading={pending} disabled={code.trim().length !== 6}>دخول</Button>
              <Button type="button" variant="ghost" size="lg" disabled={pending || left > 0} onClick={sendCode}>
                {left > 0 ? `إعادة الإرسال بعد ${left}` : "إعادة الإرسال"}
              </Button>
            </div>
          </Fields>
        </form>
      ) : null}

      {/* **درعٌ واحدٌ للخطوات كلّها** يُركَّب مع الصفحة: كان في كلّ خطوةٍ ودجةٌ تُركَّب وتُهدم فيتأخّر
          رمزُها ويضيع ضبطُها بعد كلّ انتقال، فقيل «لم يكتمل التحقّق الأمنيّ» وقد اكتمل (المالك
          ٢٠٢٦-١٠-١٩، تجربة الرمز). خفيٌّ إلّا حين يُطلب تحدٍّ. */}
      {TURNSTILE_SITE_KEY ? (
        <div className="door-shield">
          <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTsToken} resetSignal={tsReset} />
        </div>
      ) : null}
    </>
  );
}
