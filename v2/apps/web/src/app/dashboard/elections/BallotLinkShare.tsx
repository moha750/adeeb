"use client";

import { useState, useSyncExternalStore } from "react";
import { Button, Card, CardBody, Field } from "@adeeb/design-system";
import { LinkSimple, PaperPlaneTilt, ShareNetwork } from "@phosphor-icons/react";
import { Check } from "@/app/_components/glyphs";

/**
 * **رابطُ بطاقة الاقتراع يُنشَر ولا يُملى** (طلب المالك ٢٠٢٦-٠٨-١٥): حين يُفتح التصويت
 * يحتاج المسؤولُ أن يسوق ناخبي المقعد إلى بطاقتهم مباشرةً، فكان يُملي عليهم الطريق
 * («ادخل اللوحة ثمّ التصويت ثمّ المقعد»). فصار الطريقُ رابطًا يُنسخ أو يُشارَك.
 *
 * **والرابطُ لا يمنح أحدًا حقًّا**: من فتحه وهو في نطاق المقعد وجد بطاقتَه، ومن سواه رُدّ
 * بجملة «هذا الاقتراع غير مفتوحٍ لك الآن» — الأهليّةُ والصوتُ الواحد حكمُ القاعدة
 * (`get_votable_elections_for_user` و`cast_vote`) لا حراسةُ سرٍّ في عنوان.
 *
 * والأصلُ في الجوّال ورقةُ المشاركة (`navigator.share`) وفيها الرسالةُ والرابط معًا؛ وحيث
 * لا توجد يُنسَخ **الرابطُ وحدَه** (نصٌّ يُلصَق في أيّ قناة، لا جملةٌ تُحرَّر بعد لصقها).
 * سابقتُه `m/[slug]/ShareBar`.
 */
export function BallotLinkShare({ electionId, position, votingEnd }: {
  electionId: string;
  position: string;
  votingEnd: string | null;
}) {
  const path = `/dashboard/elections/vote/${electionId}`;
  const [copied, setCopied] = useState(false);

  /**
   * **`useSyncExternalStore` لا حالةٌ في أثر** (سابقةُ `WalletPreview`): `window` و`navigator`
   * لا وجودَ لهما في الخادم، فقراءتُهما في الرسم تكسر التصييرَ الأوّل، وضبطُ حالةٍ في أثرٍ
   * يرسم مرّتين ويردّه الحارس. ولقطةُ الخادم هنا **المسارُ وحدَه** : صادقٌ ناقصٌ لا كاذب.
   */
  const url = useSyncExternalStore(() => () => {}, () => `${window.location.origin}${path}`, () => path);
  const canShare = useSyncExternalStore(() => () => {}, () => typeof navigator.share === "function", () => false);

  const message = votingEnd
    ? `فُتح التصويت على مقعد ${position}. أدلِ بصوتك قبل ${votingEnd}.`
    : `فُتح التصويت على مقعد ${position}. أدلِ بصوتك.`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `تصويت ${position}`, text: message, url });
        return;
      } catch {
        // أُغلقت ورقةُ المشاركة أو منعها المتصفّح — يُكمَل إلى النسخ
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // حافظةٌ ممنوعة (سياقٌ غير آمن) — الرابطُ معروضٌ في الحقل يُنسَخ باليد
    }
  };

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <Field
          label="رابط بطاقة الاقتراع"
          icon={<PaperPlaneTilt />}
          innerIcon={<LinkSimple />}
          placeholder="رابط التصويت"
          charset="latin"
          value={url}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
          helper="شاركه مع ناخبي هذا المقعد. من كان في نطاقه فتح بطاقتَه، ومن سواه رُدّ."
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Button variant="primary" size="md" onClick={share}>
            {copied ? <Check size={18} /> : canShare ? <ShareNetwork size={18} weight="fill" /> : <LinkSimple size={18} weight="bold" />}
            {copied ? "نُسخ الرابط" : canShare ? "شارك الرابط" : "انسخ الرابط"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
