"use client";

import { useMemo } from "react";
import { Card, CardBody, CardHeader } from "@adeeb/design-system";
import { QrCode } from "@phosphor-icons/react";
import { qrSvg } from "@/lib/qr";
import { defaultQrSpec } from "@/app/dashboard/tools/qr/defaults";
import { PwaCard } from "@/app/_pwa/PwaCard";
import { usePwa } from "@/app/_pwa/usePwa";

/**
 * **الدليلُ بحسب الجهاز.** الجوّالُ يرى البطاقةَ نفسَها التي في الحساب (خطواتُ آيفون، أو زرُّ
 * التثبيت والتفعيل في أندرويد). والحاسوبُ لا يُثبَّت عليه ما نعنيه هنا، فيُعطى **رمزًا يمسحه
 * بكاميرة جوّاله** فيفتح الصفحةَ نفسَها هناك — بشكل رمز أَدِيب المعتمَد لا رمزٍ مستعار.
 */
export function AppGuide({ signedIn, url }: { signedIn: boolean; url: string }) {
  const { platform } = usePwa();
  const qr = useMemo(() => qrSvg({ ...defaultQrSpec(url), size: 208 }), [url]);

  if (platform !== "desktop") return <PwaCard signedIn={signedIn} />;

  return (
    <Card>
      <CardHeader
        variant="soft"
        icon={<QrCode />}
        title="افتحها من جوّالك"
        subtitle="التطبيقُ للجوّال: امسح الرمز بكاميرته"
      />
      <CardBody>
        <div className="flex flex-col items-center gap-3">
          <div aria-label="رمز يفتح هذه الصفحة على الجوّال" role="img" dangerouslySetInnerHTML={{ __html: qr }} />
          <bdi dir="ltr" className="font-latin text-content-muted">
            {url.replace(/^https?:\/\//, "")}
          </bdi>
        </div>
      </CardBody>
    </Card>
  );
}
