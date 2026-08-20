"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@adeeb/design-system";
import { LinkSimple, ShareNetwork } from "@phosphor-icons/react";
import { Check } from "@/app/_components/glyphs";
import { copyText } from "@/lib/clipboard";

/**
 * الغايةُ أن يَنشرها صاحبُها، فالنشرُ زرٌّ لا تعليمات.
 *
 * وجهازُ المشاركة الأصليّ (`navigator.share`) هو الطريق على الجوّال، فيفتح ورقةَ المشاركة
 * التي يعرفها المستخدم. وحيث لا يوجد (سطح المكتب غالبًا) يُنسَخ الرابط، ويقول الزرُّ
 * إنّه نُسخ. ولا رسالةَ نجاحٍ تطفو: الزرُّ نفسُه هو الخبر.
 */
export function ShareBar({ name, slug }: { name: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  // **`useSyncExternalStore` لا حالةٌ في أثر** (سابقةُ `BallotLinkShare`): الخادمُ لا يعرف
  // `navigator`، فقراءتُه في الرسم تكسر الترطيب، وضبطُ حالةٍ في أثرٍ يرسم مرّتين ويردّه الحارس.
  // ولقطةُ الخادم `false`: زرُّ النسخ صادقٌ في كلّ مكان.
  const canShare = useSyncExternalStore(() => () => {}, () => typeof navigator.share === "function", () => false);

  const share = async () => {
    const url = `${window.location.origin}/m/${encodeURIComponent(slug)}`;
    const text = `${name}، في نادي أديب`;

    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
        return;
      } catch {
        // أغلق المستخدم ورقة المشاركة أو منعها المتصفّح — يُكمَل إلى النسخ
      }
    }

    try {
      await copyText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // حافظةٌ ممنوعة (سياقٌ غير آمن) — لا شيء يُقال، والرابط في شريط العنوان
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={share}>
      {copied ? <Check /> : canShare ? <ShareNetwork weight="fill" /> : <LinkSimple weight="bold" />}
      <span>{copied ? "نُسخ الرابط" : "انشر صفحتك"}</span>
    </Button>
  );
}
