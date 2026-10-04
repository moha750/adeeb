"use client";

import { Alert, Badge, Button } from "@adeeb/design-system";
import { BellRinging, BellSlash, Export, HandTap, PaperPlaneTilt, PlusSquare, SignIn } from "@phosphor-icons/react";
import { DownloadSimple } from "@/app/_components/glyphs";
import type { Pwa } from "./usePwa";

/**
 * **ما يُقال لصاحب الجهاز في كلّ مرحلة** — كتلٌ متجاورةٌ بلا غلاف (٢٠٢٦-١٠-٠٣).
 *
 * بلا غلافٍ عمدًا: الوعاءُ يملك فجوته. في النافذة يملكها `.mdl-body` (القاعدة ١٣)، وفي
 * البطاقة يملكها من يضعها. فالمحتوى واحدٌ والوعاءان يختلفان، وهذا ما يُعرض في `/ui/app-install`.
 */

const IOS_STEPS = [
  { icon: <Export />, title: "اضغط زرّ المشاركة", sub: "أسفل الشاشة في سفاري، وأعلاها في كروم" },
  { icon: <PlusSquare />, title: "اختر «إضافة إلى الشاشة الرئيسيّة»", sub: "إن لم تجده فمرّر القائمة إلى آخرها" },
  { icon: <HandTap />, title: "افتح أَدِيب من أيقونته", sub: "ومن داخله فعّل الإشعارات" },
];

const DENIED: Record<string, string> = {
  ios: "احذف أَدِيب من شاشتك الرئيسيّة ثمّ أضِفه من جديد، فيعود السؤال.",
  android: "من قائمة المتصفّح افتح «إعدادات الموقع» واسمح بالإشعارات، ثمّ عُد إلى هنا.",
  desktop: "اضغط رمز القفل بجوار عنوان الموقع واسمح بالإشعارات، ثمّ أعِد تحميل الصفحة.",
};

/**
 * `signedIn` تقوله الصفحةُ العامّة (`/app`) وحدها: الإشعارُ لحسابٍ لا لجهازٍ مجهول، فمن لم
 * يدخل يُدعى إلى الدخول مكانَ زرّ التفعيل ثمّ يعود إلى هنا. وبقيّةُ المواضع خلف جلسةٍ أصلًا.
 */
export function PwaContent({ pwa, signedIn = true }: { pwa: Pwa; signedIn?: boolean }) {
  const { stage, busy, note } = pwa;
  const other = (k: NonNullable<Pwa["busy"]>) => busy !== null && busy !== k;

  return (
    <>
      {stage === "ios-install" ? (
        <>
          <p className="text-content-muted">
            في آيفون تصلك الإشعاراتُ بعد أن تضيف أَدِيب إلى شاشتك الرئيسيّة. ثلاثُ خطوات:
          </p>
          <ol className="flex flex-col gap-4">
            {IOS_STEPS.map((s, i) => (
              <li key={s.title} className="flex items-center gap-3">
                <span className="acard-chip" aria-hidden>
                  {s.icon}
                </span>
                <span className="flex flex-col">
                  <b className="text-content">
                    <span className="font-latin">{i + 1}.</span> {s.title}
                  </b>
                  <span className="text-sm text-content-muted">{s.sub}</span>
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {stage === "ios-update" ? (
        <Alert tone="warning" title="نظامُ جوّالك أقدمُ من الإشعارات">
          حدّث آيفون إلى <span className="font-latin">iOS 16.4</span> أو أحدث، ثمّ افتح أَدِيب من أيقونته.
        </Alert>
      ) : null}

      {stage === "unsupported" ? (
        <Alert tone="neutral" title="متصفّحُك لا يحمل الإشعارات">
          افتح أَدِيب في سفاري على آيفون، أو في كروم على أندرويد والحاسوب.
        </Alert>
      ) : null}

      {stage === "denied" ? (
        <Alert tone="warning" title="الإشعاراتُ محجوبةٌ على هذا الجهاز">
          {DENIED[pwa.platform ?? "desktop"]}
        </Alert>
      ) : null}

      {stage === "ready" ? (
        <>
          <p className="text-content-muted">
            {signedIn
              ? "فعّلها لتصلك أخبارُ أَدِيب وما يخصّ حسابك على شاشة القفل، كأيّ تطبيق."
              : "سجّل دخولك، ثمّ فعّل الإشعارات لتصلك أخبارُ أَدِيب وما يخصّ حسابك على شاشة القفل."}
          </p>
          <div className="flex flex-wrap gap-3">
            {signedIn ? (
              <Button onClick={pwa.enable} loading={busy === "enable"} disabled={other("enable")}>
                <BellRinging /> فعّل الإشعارات
              </Button>
            ) : (
              <a href="/login?next=/app" className="abtn abtn-primary abtn-md">
                <SignIn /> سجّل الدخول
              </a>
            )}
            {pwa.canInstall ? (
              <Button variant="ghost" onClick={pwa.install} loading={busy === "install"} disabled={other("install")}>
                <DownloadSimple /> ثبّت التطبيق
              </Button>
            ) : null}
          </div>
        </>
      ) : null}

      {stage === "on" ? (
        <>
          <p className="flex flex-wrap items-center gap-2 text-content-muted">
            <Badge tone="success" size="sm">
              مفعّلة
            </Badge>
            تصلك إشعاراتُ أَدِيب على هذا الجهاز.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={pwa.test} loading={busy === "test"} disabled={other("test")}>
              <PaperPlaneTilt /> أرسل إشعارًا تجريبيًّا
            </Button>
            {pwa.canInstall ? (
              <Button variant="ghost" onClick={pwa.install} loading={busy === "install"} disabled={other("install")}>
                <DownloadSimple /> ثبّت التطبيق
              </Button>
            ) : null}
            <Button variant="ghost-danger" onClick={pwa.disable} loading={busy === "disable"} disabled={other("disable")}>
              <BellSlash /> أوقفها
            </Button>
          </div>
        </>
      ) : null}

      {note ? (
        <Alert tone={note.ok ? "success" : "danger"} compact>
          {note.text}
        </Alert>
      ) : null}
    </>
  );
}
