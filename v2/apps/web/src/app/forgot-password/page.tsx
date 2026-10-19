import type { Metadata } from "next";
import { DoorHead, DoorShell } from "@/app/_door/DoorShell";
import { Fields } from "@/app/_door/parts";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = {
  title: "استعادة كلمة المرور، بوّابة أدِيب",
};

export default function ForgotPasswordPage() {
  return (
    <DoorShell door="forgot">
      <section className="door-step">
        <DoorHead title="نسيتَ كلمة المرور؟" sub="اكتب بريدك المسجّل، ونرسل إليك رابطًا تعيّن به كلمةً جديدة." />
        <Fields>
          <ForgotForm />
        </Fields>
      </section>
    </DoorShell>
  );
}
