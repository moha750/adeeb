"use client";

import { useEffect, useState } from "react";
import { Button } from "@adeeb/design-system";
import { LinkSimple, ShareNetwork } from "@phosphor-icons/react";
import { Check } from "@/app/_components/glyphs";

/**
 * الغايةُ أن يَنشرها صاحبُها، فالنشرُ زرٌّ لا تعليمات.
 *
 * وجهازُ المشاركة الأصليّ (`navigator.share`) هو الطريق على الجوّال، فيفتح ورقةَ المشاركة
 * التي يعرفها المستخدم. وحيث لا يوجد (سطح المكتب غالبًا) يُنسَخ الرابط، ويقول الزرُّ
 * إنّه نُسخ. ولا رسالةَ نجاحٍ تطفو: الزرُّ نفسُه هو الخبر.
 */
export function ShareBar({ name, slug }: { name: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  // يُقرأ بعد الرَّكْب لا أثناء الرسم: الخادمُ لا يعرف `navigator`، ولو قرأناه في الرسم
  // لاختلفت أيقونةُ الخادم عن أيقونة المتصفّح فصاح الترطيب.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);

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
      await navigator.clipboard.writeText(url);
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
