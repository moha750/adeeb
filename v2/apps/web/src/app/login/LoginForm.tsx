"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Divider, Field } from "@adeeb/design-system";
import { At, Envelope, Key, Lock } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { toArabicAuthError } from "@/lib/authErrors";
import { OAuthButtons } from "./OAuthButtons";

// منع إعادة التوجيه المفتوح: نقبل المسارات الداخلية فقط
function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/dashboard";
}

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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
      if (error) { setErr(toArabicAuthError(error.message)); return; }
      router.replace(next);
      router.refresh();
    });
  };

  const canSubmit = email.trim() !== "" && pw !== "";

  return (
    <form className="aauth-form" onSubmit={submit} noValidate>
      {err ? <Alert tone="danger" onClose={() => setErr(null)}>{err}</Alert> : null}

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

      <Button type="submit" variant="primary" size="lg" loading={pending} disabled={!canSubmit} className="aauth-submit">
        تسجيل الدخول
      </Button>

      {/* بابٌ ثانٍ للحساب نفسِه — يسكن النموذج ولا يُرسله (`type="button"`)، ويتشارك صندوقَ خطئه.
          و«أو» تقول إنّهما بديلان لا خطوتان: من ضغط الأوّل لا يحتاج الثاني. */}
      <Divider label="أو" />
      <OAuthButtons next={next} onError={setErr} />
    </form>
  );
}
