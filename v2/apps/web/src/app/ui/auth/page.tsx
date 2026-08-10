"use client";

// معرضُ شاشة المصادقة — الشاشةُ الحيّة نفسُها (`AuthShell`) بمتنِ الدخول الحقيقيّ معطَّلَ الإرسال.
// إطارٌ محدود الارتفاع (`--aauth-h`) لتُعرَض داخل صفحة المعرض؛ والحيّةُ تملأ الشاشة.
import { AuthShell, Button, Container, Field } from "@adeeb/design-system";
import { At, Envelope, Key, Lock } from "@phosphor-icons/react";

/** متنُ الدخول — نسخةُ العرض من `LoginForm` بلا مصادقة. */
function DemoForm() {
  return (
    <form className="aauth-form" onSubmit={(e) => e.preventDefault()} noValidate>
      <Field
        label="البريد الإلكترونيّ"
        type="email"
        charset="latin"
        icon={<Envelope />}
        innerIcon={<At />}
        placeholder="you@adeeb.club"
        autoComplete="email"
      />
      <Field
        label="كلمة المرور"
        type="password"
        dir="ltr"
        icon={<Lock />}
        innerIcon={<Key />}
        placeholder="••••••••"
        autoComplete="current-password"
      />
      <Button type="submit" variant="primary" size="lg" className="aauth-submit">
        تسجيل الدخول
      </Button>
    </form>
  );
}

const SLOGAN = "بوابة أدِيب، من هُنا يُدار نادي أدِيب";

export default function AuthGalleryPage() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Auth</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">شاشة المصادقة</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          <b>اللوح المنقسم:</b> سطحُ <code className="font-latin">Card</code> واحدٌ: نصفُه لوحٌ بتدرّج
          العلامة يحمل نقشَ الهويّة من رأسه (‏1326px عرضًا، مقاسٌ ثابت يفيض عن اللوح وتُقصّ أطرافُه،
          فلا ينكمش حين يضيق) وشعارَ النادي
          الأبيضَ الحقيقيّ، ونصفُه النموذج. الحدُّ والظلُّ والزاويةُ وAurora من مصدرها الواحد، لا سطحَ
          يُعاد كتابتُه. تخدم <a className="text-primary underline" href="/login">شاشة الدخول</a> وشاشةَ
          «لا صلاحية» معًا، وتنهار لعمودٍ واحد دون ٦٤٠px.
        </p>

        <div className="mt-10 aauth-demo" style={{ "--aauth-h": "620px" } as React.CSSProperties}>
          <AuthShell
            title="تسجيل الدخول"
            subtitle="ادخل ببيانات حسابك الإداريّ للوصول إلى اللوحة."
            slogan={SLOGAN}
          >
            <DemoForm />
          </AuthShell>
        </div>
      </Container>
    </main>
  );
}
