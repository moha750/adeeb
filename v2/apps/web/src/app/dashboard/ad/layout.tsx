import { Suspense } from "react";
import { PreviewTheme } from "./PreviewTheme";
import { LabFlags } from "./LabFlags";

/** مختبرُ القالب الجديد — مؤقّت، يُحذف بعد الحكم. يحمل وضعَ المعاينة وأعلامَها (`?theme=` و`?f=panel`). */
export default function AdLabLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PreviewTheme />
      </Suspense>
      <Suspense fallback={children}>
        <LabFlags>{children}</LabFlags>
      </Suspense>
    </>
  );
}
