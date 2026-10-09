import type { Metadata } from "next";
import { AuthShell } from "@adeeb/design-system";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = {
  title: "استعادة كلمة المرور، بوّابة أدِيب",
};

export default function ForgotPasswordPage() {
  return (
    <main>
      <AuthShell
        title="استعادة كلمة المرور"
        subtitle="اكتب بريدك الإلكترونيّ المسجّل، ويصلك رابطٌ تعيّن به كلمة مرورٍ جديدة. الرابط صالح ١٠ دقائق ولمرّةٍ واحدة."
        slogan="بوّابةُ نادي أدِيب: إدارةُ الأعضاء والفعاليّات والمحتوى في مكانٍ واحد."
      >
        <ForgotForm />
      </AuthShell>
    </main>
  );
}
