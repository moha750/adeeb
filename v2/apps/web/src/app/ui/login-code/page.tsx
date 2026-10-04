"use client";

// معرضُ «الدخول بالرمز» — المبدّلُ الذي اختاره المالك (٢٠٢٦-١٠-٠٤) من خيارين عُرضا هنا جنبًا إلى
// جنب، وحُذف الآخر (زرٌّ تحت كلمة المرور): الرمزُ المخبوء يُستعمل قليلًا فلا يُقاس أثرُه بعدل.
// والحيّةُ في `app/login/LoginForm.tsx`. النموذجُ هنا معطَّلُ المصادقة: «أرسل الرمز» ينقل إلى خطوة الرمز بلا رسالة.
import { useState } from "react";
import { AuthShell, Button, Container, Divider, Field, Segmented } from "@adeeb/design-system";
import { At, Envelope, Hash, Key, Lock } from "@phosphor-icons/react";
import { AppleLogo, GoogleLogo } from "@/app/_components/glyphs";

const SLOGAN = "بوابة أدِيب، من هُنا يُدار نادي أدِيب";

/** زرّا المزوّدَين كما في `OAuthButtons` — بلا نداء. */
function Providers() {
  return (
    <>
      <Button type="button" variant="ghost" size="lg" className="aauth-submit">
        <GoogleLogo size={20} />
        المتابعة بحساب قوقل
      </Button>
      <Button type="button" variant="ghost" size="lg" className="aauth-submit">
        <AppleLogo size={20} />
        المتابعة بحساب أبل
      </Button>
      <Divider label="أو" />
    </>
  );
}

function EmailField() {
  return (
    <Field
      label="البريد الإلكترونيّ"
      type="email"
      charset="latin"
      icon={<Envelope />}
      innerIcon={<At />}
      placeholder="you@adeeb.club"
      autoComplete="email"
    />
  );
}

function PasswordField() {
  return (
    <Field
      label="كلمة المرور"
      type="password"
      dir="ltr"
      icon={<Lock />}
      innerIcon={<Key />}
      placeholder="••••••••"
      autoComplete="current-password"
    />
  );
}

function CodeField() {
  return (
    <Field
      label="الرمز"
      charset="digits"
      icon={<Key />}
      innerIcon={<Hash />}
      placeholder="______"
      inputMode="numeric"
      maxLength={6}
      autoComplete="one-time-code"
    />
  );
}

/** المبدّلُ فوق الحقول — كلمةُ المرور أو الرمز، ويبدأ بكلمة المرور. */
function TabsForm() {
  const [mode, setMode] = useState<"pw" | "code">("pw");
  const [sent, setSent] = useState(false);
  return (
    <form className="aauth-form" onSubmit={(e) => e.preventDefault()} noValidate>
      <Providers />
      <Segmented
        wide
        aria-label="طريقة الدخول بالبريد"
        items={[{ value: "pw", label: "الدخول بكلمة المرور" }, { value: "code", label: "الدخول بالرمز" }]}
        value={mode}
        onValueChange={(v) => { setMode(v as "pw" | "code"); setSent(false); }}
      />
      <EmailField />
      {mode === "pw" ? (
        <>
          <PasswordField />
          <a className="aauth-link" href="#" onClick={(e) => e.preventDefault()}>نسيت كلمة المرور؟</a>
          <Button type="submit" variant="primary" size="lg" className="aauth-submit">تسجيل الدخول</Button>
        </>
      ) : sent ? (
        <>
          <CodeField />
          <div className="btn-row">
            <Button type="submit" variant="primary" size="lg">تسجيل الدخول</Button>
            <Button type="button" variant="ghost" size="lg">إعادة الإرسال</Button>
          </div>
        </>
      ) : (
        <Button type="button" variant="primary" size="lg" className="aauth-submit" onClick={() => setSent(true)}>
          أرسل الرمز
        </Button>
      )}
    </form>
  );
}

export default function LoginCodeGalleryPage() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Login Code</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">الدخول بالرمز</h1>

        <div className="mt-8 aauth-demo" style={{ "--aauth-h": "760px" } as React.CSSProperties}>
          <AuthShell title="تسجيل الدخول" subtitle="ادخل بحسابك في أدِيب، ويسوقك البابُ إلى منزلتك." slogan={SLOGAN}>
            <TabsForm />
          </AuthShell>
        </div>
      </Container>
    </main>
  );
}
