import type { Metadata } from "next";
import { AuthShell } from "@adeeb/design-system";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = {
  title: "تعيين كلمة مرور جديدة — لوحة أديب",
};

export default function ResetPasswordPage() {
  return (
    <main>
      <AuthShell
        title="تعيين كلمة مرور جديدة"
        subtitle="اختر كلمةً جديدة لحسابك، ثمّ ادخل بها إلى اللوحة."
        slogan="لوحةُ نادي أديب — إدارةُ الأعضاء والفعاليّات والمحتوى في مكانٍ واحد."
      >
        <ResetForm />
      </AuthShell>
    </main>
  );
}
