"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Divider, Field } from "@adeeb/design-system";
import { At, Envelope, Key, Lock } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { toArabicAuthError } from "@/lib/authErrors";
import { EMAIL_HINT, emailError, isEmail } from "@/lib/fieldFormats";
import { safeNext } from "@/lib/safeNext";
import { TurnstileWidget } from "@/app/_components/Turnstile";
import { OAuthButtons } from "./OAuthButtons";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  // خطأُ العودة من مزوّدٍ اجتماعيّ يصل **رمزًا** في الرابط (`?e=`) لا جملة — يضعه
  // `/auth/callback`، ويُترجَم مرّةً عند أوّل رسم. والصندوقُ واحدٌ لطريقَي الدخول.
  const [err, setErr] = useState<string | null>(() => {
    const code = params.get("e");
    return code ? toArabicAuthError(code) : null;
  });
  const [pending, start] = useTransition();
  /** رايةُ الصيغة تُرفع عند مغادرة الحقل أو عند الإرسال — لا وهو يكتب أوّلَ محرف. */
  const [emailTouched, setEmailTouched] = useState(false);
  // درعُ الباب — الرمزُ يُستهلك مرّةً، فيُعاد ضبطُ الودجة بعد كلّ محاولةٍ فاشلة
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [tsReset, setTsReset] = useState(0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    // بريدٌ مكسورُ الصيغة يُردّ ههنا لا بعد رحلةٍ إلى الخادم تعود بـ«بيانات دخولٍ خاطئة»:
    // الرسالةُ المبهمة تجعله يجرّب كلماتِ مرورٍ وعِلّتُه في السطر الذي فوقها.
    if (!isEmail(email)) { setEmailTouched(true); setErr(`${EMAIL_HINT}.`); return; }
    start(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pw,
        options: { captchaToken: tsToken ?? undefined },
      });
      if (error) {
        setErr(toArabicAuthError(error.message));
        setTsReset((n) => n + 1);
        return;
      }
      router.replace(next);
      router.refresh();
    });
  };

  const canSubmit = email.trim() !== "" && pw !== "";

  return (
    <form className="aauth-form" onSubmit={submit} noValidate>
      {err ? <Alert tone="danger" onClose={() => setErr(null)}>{err}</Alert> : null}

      {/* **المزوّدان أوّلًا** (قرار المالك ١٥ أغسطس ٢٠٢٦) — بابٌ ثانٍ للحساب نفسِه، يسكن النموذج
          ولا يُرسله (`type="button"`) ويتشارك صندوقَ خطئه. و«أو» تقول إنّهما بديلان لا خطوتان:
          من ضغط الأوّل لا يحتاج الثاني. ورُفعا فوق الحقول لأنّ النقرةَ أقصرُ من الكتابة، ولأنّ
          شاشتي الدخول والتسجيل ترتّبان الترتيبَ نفسَه فلا تفترق يدُ من اعتادهما. */}
      <OAuthButtons next={next} onError={setErr} />
      <Divider label="أو" />

      <Field
        label="البريد الإلكترونيّ"
        type="email"
        charset="latin"
        icon={<Envelope />}
        innerIcon={<At />}
        placeholder="you@adeeb.club"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => setEmailTouched(true)}
        error={emailError(email, emailTouched)}
        required
      />
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

      {TURNSTILE_SITE_KEY ? (
        <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTsToken} resetSignal={tsReset} />
      ) : null}

      <Button type="submit" variant="primary" size="lg" loading={pending} disabled={!canSubmit} className="aauth-submit">
        تسجيل الدخول
      </Button>
    </form>
  );
}
