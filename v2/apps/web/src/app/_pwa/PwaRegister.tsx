"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { pushSupported, swRegistration } from "./client";
import { savePushSubscription } from "./actions";

/**
 * **يسجّل عاملَ الخدمة، ويُبقي اشتراكَ الجهاز مقيّدًا بجلسة من يحمله** — ولا يرسم شيئًا.
 * (٢٠٢٦-١٠-٠٣)
 *
 * الاشتراكُ صفٌّ يحمل معرّفَ الجلسة، ومن خرج من الجهاز يُكنَس صفُّه عند أوّل إرسال. فإن دخل
 * بعدها (هو أو غيرُه) وجب أن يُعاد ربطُ الجهاز بالجلسة الجديدة، وإلّا بقي بلا إشعاراتٍ وهو
 * يظنّها مفعّلة. فيُعاد الحفظُ في ثلاثة مواضع:
 * - **أوّلَ التحميل** — يشمل الدخولَ بقوقل وأبل (تحويلٌ كامل يعود إلى الموقع).
 * - **بعد الخروج من صفحات الدخول** — نموذجُ الدخول ينتقل بـ`router.replace` لا بتحميلٍ كامل،
 *   فلا يُعاد تركيبُ هذا المكوّن ولولا هذا لما عرف.
 * - **عند العودة إلى التطبيق بعد غيبة** (ساعةٍ فأكثر) — آيفون يُبقي التطبيقَ في الذاكرة أيّامًا،
 *   واشتراكاتُه تتجدّد من تلقاء نفسها.
 *
 * والزائرُ بلا جلسة يُردّ بلا قاعدة (`getSessionAdmin` يقرأ الرمز محلّيًّا)، فالنداءُ رخيص.
 */
const AUTH_PAGES = ["/login", "/signup", "/auth", "/complete", "/reset-password"];
const RESYNC_AFTER_MS = 60 * 60 * 1000;

async function sync() {
  try {
    const reg = await swRegistration();
    if (!reg || !pushSupported() || Notification.permission !== "granted") return;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await savePushSubscription(sub.toJSON());
  } catch {
    /* لا شيء يُكسَر: الإشعارُ إضافة */
  }
}

export function PwaRegister() {
  const pathname = usePathname();
  const prev = useRef<string | null>(null);
  const last = useRef(0);

  // أوّلَ التحميل — متأخّرًا قليلًا كي لا يزاحم ما يراه الزائرُ أوّلًا.
  useEffect(() => {
    const t = window.setTimeout(() => {
      last.current = Date.now();
      void sync();
    }, 2000);
    const onVisible = () => {
      if (document.visibilityState !== "visible" || Date.now() - last.current < RESYNC_AFTER_MS) return;
      last.current = Date.now();
      void sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // خرج للتوّ من صفحات الدخول إلى غيرها: جلسةٌ جديدة وُلدت بلا تحميلٍ كامل.
  useEffect(() => {
    const from = prev.current;
    prev.current = pathname;
    const isAuth = (p: string | null) => !!p && AUTH_PAGES.some((a) => p === a || p.startsWith(a + "/"));
    if (isAuth(from) && !isAuth(pathname)) {
      last.current = Date.now();
      void sync();
    }
  }, [pathname]);

  return null;
}
