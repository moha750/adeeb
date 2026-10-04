"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Divider, Field, Segmented } from "@adeeb/design-system";
import { At, Envelope, Hash, Key, Lock } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { toArabicAuthError, toArabicCodeError, waitSeconds } from "@/lib/authErrors";
import { EMAIL_HINT, emailError, isEmail } from "@/lib/fieldFormats";
import { safeNext } from "@/lib/safeNext";
import { logSignin } from "@/lib/signinEvents";
import { TurnstileWidget } from "@/app/_components/Turnstile";
import { OAuthButtons } from "./OAuthButtons";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** أقلُّ فاصلٍ بين رمزين لصاحب البريد الواحد — يطابق `smtp_max_frequency` في `scripts/auth-config.mjs`. */
const RESEND_AFTER = 60;

type Mode = "password" | "code";

/**
 * **بابُ الدخول بطريقين** (قرار المالك ٢٠٢٦-١٠-٠٤): تبقى كلمةُ المرور، ويُضاف إلى جانبها رمزٌ
 * يصل البريد، والمبدّلُ بينهما ظاهرٌ بالسويّة (اختيارُه في `/ui/login-code`) ليُقاس الأثرُ بعدلٍ:
 * كلُّ محاولةٍ تُكتب في `signin_events` بطريقتها ونتيجتها (`lib/signinEvents.ts`).
 *
 * **والرمزُ يفتح الحسابَ لمن لا حسابَ له** (`shouldCreateUser`) كما يفتحه زرّا قوقل وأبل في
 * الشاشة نفسها، فلا يُقال لأحدٍ «لا حسابَ بهذا البريد» — وهي جملةٌ تُفشي من له حساب.
 */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  /** أُرسل رمزٌ إلى البريد المكتوب الآن؟ تعديلُ البريد يُسقطه. */
  const [sent, setSent] = useState(false);
  /** ثوانٍ حتى يُتاح رمزٌ آخر. */
  const [left, setLeft] = useState(0);
  // خطأُ العودة من مزوّدٍ اجتماعيّ يصل **رمزًا** في الرابط (`?e=`) لا جملة — يضعه
  // `/auth/callback`، ويُترجَم مرّةً عند أوّل رسم. والصندوقُ واحدٌ لطرق الدخول كلّها.
  const [err, setErr] = useState<string | null>(() => {
    const e = params.get("e");
    return e ? toArabicAuthError(e) : null;
  });
  const [pending, start] = useTransition();
  /** رايةُ الصيغة تُرفع عند مغادرة الحقل أو عند الإرسال — لا وهو يكتب أوّلَ محرف. */
  const [emailTouched, setEmailTouched] = useState(false);
  // درعُ الباب — الرمزُ يُستهلك مرّةً، فيُعاد ضبطُ الودجة بعد كلّ إرسال
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [tsReset, setTsReset] = useState(0);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const done = () => {
    router.replace(next);
    router.refresh();
  };

  /** بريدٌ مكسورُ الصيغة يُردّ ههنا لا بعد رحلةٍ إلى الخادم تعود برسالةٍ مبهمة. */
  const emailOk = () => {
    if (isEmail(email)) return true;
    setEmailTouched(true);
    setErr(`${EMAIL_HINT}.`);
    return false;
  };

  const signInWithPassword = () => {
    start(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pw,
        options: { captchaToken: tsToken ?? undefined },
      });
      setTsReset((n) => n + 1);
      if (error) {
        logSignin(supabase, "password", "fail", "login", error.message);
        setErr(toArabicAuthError(error.message));
        return;
      }
      logSignin(supabase, "password", "success", "login");
      done();
    });
  };

  const sendCode = () => {
    setErr(null);
    if (!emailOk()) return;
    start(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, captchaToken: tsToken ?? undefined },
      });
      setTsReset((n) => n + 1);
      if (error) {
        const wait = waitSeconds(error.message);
        if (wait) { setLeft(wait); setSent(true); return; }
        logSignin(supabase, "code", "fail", "login", error.message);
        setErr(toArabicCodeError(error.message));
        return;
      }
      logSignin(supabase, "code", "code_sent", "login");
      setSent(true);
      setCode("");
      setLeft(RESEND_AFTER);
    });
  };

  const verifyCode = () => {
    start(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
      if (error) {
        logSignin(supabase, "code", "fail", "login", error.message);
        setErr(toArabicCodeError(error.message));
        return;
      }
      logSignin(supabase, "code", "success", "login");
      done();
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!emailOk()) return;
    if (mode === "password") signInWithPassword();
    else if (sent) verifyCode();
    else sendCode();
  };

  const canSubmit =
    email.trim() !== "" &&
    (mode === "password" ? pw !== "" : !sent || code.trim().length === 6);

  return (
    <form className="aauth-form" onSubmit={submit} noValidate>
      {err ? <Alert tone="danger" onClose={() => setErr(null)}>{err}</Alert> : null}

      {/* **المزوّدان أوّلًا** (قرار المالك ١٥ أغسطس ٢٠٢٦) — بابٌ ثانٍ للحساب نفسِه، يسكن النموذج
          ولا يُرسله (`type="button"`) ويتشارك صندوقَ خطئه. و«أو» تقول إنّهما بديلان لا خطوتان. */}
      <OAuthButtons next={next} onError={setErr} />
      <Divider label="أو" />

      <Segmented
        wide
        aria-label="طريقة الدخول بالبريد"
        items={[
          { value: "password", label: "الدخول بكلمة المرور" },
          { value: "code", label: "الدخول بالرمز" },
        ]}
        value={mode}
        onValueChange={(v) => { setMode(v as Mode); setErr(null); }}
      />

      <Field
        label="البريد الإلكترونيّ"
        type="email"
        charset="latin"
        icon={<Envelope />}
        innerIcon={<At />}
        placeholder="you@adeeb.club"
        autoComplete="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setSent(false); }}
        onBlur={() => setEmailTouched(true)}
        error={emailError(email, emailTouched)}
        required
      />

      {mode === "password" ? (
        <>
          <Field
            label="كلمة المرور"
            type="password"
            dir="ltr"
            icon={<Lock />}
            innerIcon={<Key />}
            placeholder="••••••••"
            autoComplete="current-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
          />
          <Link href="/forgot-password" className="aauth-link">نسيت كلمة المرور؟</Link>
        </>
      ) : sent ? (
        <Field
          label="الرمز"
          charset="digits"
          icon={<Key />}
          innerIcon={<Hash />}
          placeholder="______"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
      ) : null}

      {TURNSTILE_SITE_KEY ? (
        <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTsToken} resetSignal={tsReset} />
      ) : null}

      {mode === "code" && sent ? (
        <div className="btn-row">
          <Button type="submit" variant="primary" size="lg" loading={pending} disabled={!canSubmit}>
            تسجيل الدخول
          </Button>
          <Button type="button" variant="ghost" size="lg" disabled={pending || left > 0} onClick={sendCode}>
            {left > 0 ? `إعادة الإرسال بعد ${left}` : "إعادة الإرسال"}
          </Button>
        </div>
      ) : (
        <Button type="submit" variant="primary" size="lg" loading={pending} disabled={!canSubmit} className="aauth-submit">
          {mode === "password" ? "تسجيل الدخول" : "أرسل الرمز"}
        </Button>
      )}
    </form>
  );
}
