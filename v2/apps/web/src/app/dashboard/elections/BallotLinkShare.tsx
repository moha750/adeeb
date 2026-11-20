"use client";

import { useState, useSyncExternalStore } from "react";
import { Field, Modal } from "@adeeb/design-system";
import { LinkSimple, PaperPlaneTilt, ShareNetwork } from "@phosphor-icons/react";
import { Check } from "@/app/_components/glyphs";
import { AdButton } from "@/app/_ad/primitives";
import { copyText } from "@/lib/clipboard";

/**
 * **رابطُ ورقة التصويت يُنشَر ولا يُملى** (طلب المالك ٢٠٢٦-٠٨-١٥): حين يُفتح التصويت
 * يحتاج المسؤولُ أن يسوق المصوّتين في المقعد إلى ورقتهم مباشرةً، فكان يُملي عليهم الطريق
 * («ادخل اللوحة ثمّ التصويت ثمّ المقعد»). فصار الطريقُ رابطًا يُنسخ أو يُشارَك.
 * **(٢٠٢٦-١١-٢٠) أُعيد بالهويّة نافذةً** يفتحها زرٌّ في تنبيه «التصويت مفتوح» بصفحة الانتخاب (قرار محمد)، بعد أن سقط
 * مع الصفحة القديمة وكان فيها كرتًا ثابتًا.
 *
 * **والرابطُ لا يمنح أحدًا حقًّا**: من فتحه وهو في نطاق المقعد وجد ورقتَه، ومن سواه رُدّ
 * بجملة «هذا الاقتراع غير مفتوحٍ لك الآن» — الأهليّةُ والصوتُ الواحد حكمُ القاعدة
 * (`get_votable_elections_for_user` و`cast_vote`) لا حراسةُ سرٍّ في عنوان.
 *
 * والأصلُ في الجوّال ورقةُ المشاركة (`navigator.share`) وفيها الرسالةُ والرابط معًا؛ وحيث
 * لا توجد يُنسَخ **الرابطُ وحدَه** (نصٌّ يُلصَق في أيّ قناة، لا جملةٌ تُحرَّر بعد لصقها).
 * سابقتُه `m/[slug]/ShareBar`.
 */
export function BallotLinkShare({ open, onClose, electionId, position, votingEnd }: {
  open: boolean;
  onClose: () => void;
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

  /** النسخُ فعلٌ قائمٌ بنفسه (طلب المالك): لا يُبلَغ إليه بعد إغلاق ورقة المشاركة. */
  const copy = async () => {
    try {
      await copyText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // حافظةٌ ممنوعة (سياقٌ غير آمن) — الرابطُ معروضٌ في الحقل يُنسَخ باليد
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: `تصويت ${position}`, text: message, url });
    } catch {
      // أُغلقت ورقةُ المشاركة أو منعها المتصفّح — ولا يُنسَخ خلسةً، فللنسخ زرُّه
    }
  };

  // فعلان لا فعلٌ يتحوّل: المشاركةُ تسوق الرسالةَ إلى قناةٍ يختارها، والنسخُ يضع الرابطَ في يده. وحيث لا ورقةَ مشاركة
  // (أغلبُ الحواسيب) يبقى النسخُ الفعلَ الأساسيّ، و«إغلاق» بجانبه
  const copyBtn = (fill: boolean) => (
    <AdButton variant={fill ? "fill" : "soft"} icon={copied ? <Check /> : <LinkSimple />} onClick={() => { void copy(); }}>
      {copied ? "نُسخ الرابط" : "انسخ الرابط"}
    </AdButton>
  );
  return (
    <Modal open={open} onClose={onClose} size="sm" title="رابط ورقة التصويت" description={position}
      footer={canShare
        ? <><AdButton variant="fill" icon={<ShareNetwork />} onClick={() => { void share(); }}>شارك الرابط</AdButton>{copyBtn(false)}</>
        : <>{copyBtn(true)}<AdButton plain onClick={onClose}>إغلاق</AdButton></>}>
      <Field
        label="الرابط"
        icon={<PaperPlaneTilt />}
        innerIcon={<LinkSimple />}
        placeholder="رابط التصويت"
        charset="latin"
        value={url}
        readOnly
        onFocus={(e) => e.currentTarget.select()}
        helper="من فتحه وله صوتٌ في المقعد وجد ورقته، ومن سواه رُدّ."
      />
    </Modal>
  );
}
