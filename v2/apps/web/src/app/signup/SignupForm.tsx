"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Divider, Field } from "@adeeb/design-system";
import { OAuthButtons } from "@/app/login/OAuthButtons";
import { At, Envelope, Key, Lock } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { toArabicAuthError } from "@/lib/authErrors";
import { EMAIL_HINT, emailError, isEmail } from "@/lib/fieldFormats";
import { TurnstileWidget } from "@/app/_components/Turnstile";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** يطابق `password_min_length` في `scripts/auth-config.mjs` — لا يُغيَّر أحدُهما وحده. */
const MIN_PW = 8;

/**
 * **إنشاءُ حساب — بريدٌ وكلمةُ مرورٍ لا غير** (قرار المالك ١٥ أغسطس ٢٠٢٦).
 *
 * وكان النموذجُ يسأل الاسمَ والجوّالَ والجنسَ والمدينةَ ههنا، فبان الخللُ حين رُفع المزوّدان
 * فوقه: قوقلُ يفتح حسابًا بنقرةٍ ونحن نطلب ستّةَ حقول — فلا يسلك أحدٌ الطريقَ الطويل، ويصير
 * نصفُ الشاشة حبرًا لا يُقرأ. **فالبيانات تُطلب عند الحاجة إليها لا عند الباب**: يسألها بابُ
 * التطوّع (`/join`) لمن أراد العضويّة، وودجةُ الحجز لمن أراد مقعدًا، وصفحةُ الحساب (`/me`)
 * لمن أراد أن يسبقهما. وبهذا يستوي الطريقان: نقرةٌ ههنا ونقرةٌ هناك.
 *
 * **ولا صفَّ في `profiles` بعد هذه الشاشة**: الحسابُ يولد بلا صفٍّ كما يولد بقوقل سواءً بسواء،
 * ويُكتب صفُّه بـ`create_my_account_profile` حين تُطلب بياناتُه — بلا `joined_date`، فيملك
 * حسابًا ولا يملك أن يجعل نفسَه عضوًا.
 */
export function SignupForm({ next }: { next: string }) {
  const router = useRouter();
  const [sb] = useState(() => createClient());

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [tsReset, setTsReset] = useState(0);
  /** رايةُ الصيغة تُرفَع عند مغادرة الحقل أو عند الإرسال — لا والمستخدم يكتب أوّلَ محرف. */
  const [emailTouched, setEmailTouched] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!isEmail(email)) { setEmailTouched(true); setErr(`${EMAIL_HINT}.`); return; }
    if (pw.length < MIN_PW) { setErr(`كلمة المرور ${MIN_PW} أحرفٍ فأكثر.`); return; }

    setBusy(true);
    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password: pw,
      options: { captchaToken: tsToken ?? undefined },
    });
    setBusy(false);
    if (error) {
      setTsReset((n) => n + 1);
      setErr(toArabicAuthError(error.message));
      return;
    }

    // بلا جلسةٍ لا يمضي: يقع هذا لو أُعيد تشغيل تأكيد البريد يومًا في إعداد المصادقة
    if (!data.session) {
      setErr("أُنشئ حسابك. افتح بريدك لتأكيده ثمّ سجّل الدخول.");
      return;
    }

    router.replace(next);
    router.refresh();
  };

  return (
    <form className="aauth-form" onSubmit={submit} noValidate>
      {err ? <Alert tone="danger" onClose={() => setErr(null)}>{err}</Alert> : null}

      {/* **المزوّدان أوّلًا** (قرار المالك): أقصرُ طريقٍ إلى حسابٍ نقرةٌ لا حقول، وأكثرُ من
          يفتح حسابَه يفتحه من جوّاله. و«أو» تقول إنّهما بديلان لا خطوتان. */}
      <OAuthButtons next={next} onError={setErr} />
      <Divider label="أو" />

      <Field
        label="البريد الإلكترونيّ" type="email" charset="latin" icon={<Envelope />} innerIcon={<At />}
        placeholder="you@example.com" autoComplete="email"
        value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setEmailTouched(true)}
        error={emailError(email, emailTouched)} required
      />
      <Field
        label="كلمة المرور" type="password" dir="ltr" icon={<Lock />} innerIcon={<Key />}
        placeholder="••••••••" autoComplete="new-password" helper={`${MIN_PW} أحرفٍ فأكثر`}
        value={pw} onChange={(e) => setPw(e.target.value)} required
      />

      {TURNSTILE_SITE_KEY ? (
        <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTsToken} resetSignal={tsReset} />
      ) : null}

      <Button type="submit" variant="primary" size="lg" loading={busy}>إنشاء الحساب</Button>

      <p className="text-content-muted text-center text-sm">
        لك حسابٌ سلفًا؟{" "}
        <Link className="font-bold underline" href="/login">سجّل الدخول</Link>
      </p>
    </form>
  );
}
