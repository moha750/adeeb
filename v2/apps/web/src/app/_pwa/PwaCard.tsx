"use client";

import { Card, CardBody, CardHeader } from "@adeeb/design-system";
import { DeviceMobile } from "@phosphor-icons/react";
import { PwaContent } from "./PwaContent";
import { usePwa } from "./usePwa";

/**
 * **بطاقةُ «أَدِيب على جوّالك»** — بيتُ التثبيت والإشعارات الدائم: يجدها من يبحث عنها، ومنها
 * يُوقَف ويُجرَّب. تسكن صفحةَ الحساب (`/me`) وإعداداتِ اللوحة. (الخيار «أ» بإقرار المالك
 * ٢٠٢٦-١٠-٠٣، ومعها النافذةُ «ب» `PwaIntro` تستقبل مرّة.)
 */
export function PwaCard({ signedIn = true }: { signedIn?: boolean }) {
  const pwa = usePwa();
  return (
    <Card>
      <CardHeader
        variant="soft"
        icon={<DeviceMobile />}
        title="أَدِيب على جوّالك"
        subtitle="تطبيقٌ على شاشتك الرئيسيّة، وإشعاراتٌ على شاشة القفل"
      />
      <CardBody>
        <div className="flex flex-col gap-4">
          {pwa.stage === "loading" ? <p className="text-content-muted">نفحص جهازك…</p> : <PwaContent pwa={pwa} signedIn={signedIn} />}
        </div>
      </CardBody>
    </Card>
  );
}
