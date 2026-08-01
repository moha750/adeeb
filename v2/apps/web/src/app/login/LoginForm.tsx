"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Field } from "@adeeb/design-system";
import { At, Envelope, Key, Lock } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

// ترجمة أخطاء المصادقة الشائعة إلى العربية
function toArabicError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "البريد الإلكترونيّ أو كلمة المرور غير صحيحة.";
  if (m.includes("email not confirmed")) return "لم يُؤكَّد هذا البريد بعد.";
  if (m.includes("too many requests") || m.includes("rate limit")) return "محاولات كثيرة. انتظر قليلًا ثمّ أعِد المحاولة.";
  return "تعذّر تسجيل الدخول. تحقّق من البيانات وحاول مجدّدًا.";
}

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
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
      if (error) { setErr(toArabicError(error.message)); return; }
      router.replace(next);
      router.refresh();
    });
  };

  const canSubmit = email.trim() !== "" && pw !== "";

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
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

      <Button type="submit" variant="primary" size="lg" loading={pending} disabled={!canSubmit} className="auth-submit">
        تسجيل الدخول
      </Button>
    </form>
  );
}
