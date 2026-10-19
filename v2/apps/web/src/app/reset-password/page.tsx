import type { Metadata } from "next";
import { DoorHead, DoorShell } from "@/app/_door/DoorShell";
import { Fields } from "@/app/_door/parts";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = {
  title: "تعيين كلمة مرور جديدة، بوّابة أدِيب",
};

export default function ResetPasswordPage() {
  return (
    <DoorShell door="reset">
      <section className="door-step">
        <DoorHead title="كلمةُ مرورٍ جديدة" />
        <Fields>
          <ResetForm />
        </Fields>
      </section>
    </DoorShell>
  );
}
