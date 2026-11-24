"use client";

import { BellRinging, BellSlash, Export, HandTap, PaperPlaneTilt, PlusSquare, SignIn } from "@phosphor-icons/react";
import { DownloadSimple } from "@/app/_components/glyphs";
import { AdButton, AdNote } from "@/app/_ad/primitives";
import { AdLine } from "@/app/_ad/account";
import type { Pwa } from "./usePwa";

/**
 * **ما يُقال لصاحب الجهاز في كلّ مرحلة** — كتلٌ متجاورةٌ بلا غلاف (٢٠٢٦-١٠-٠٣).
 *
 * بلا غلافٍ عمدًا: الوعاءُ يملك فجوته. في النافذة يملكها `.mdl-body` (القاعدة ١٣)، وفي
 * البطاقة يملكها من يضعها. فالمحتوى واحدٌ والوعاءان يختلفان، وهذا ما يُعرض في `/ui/app-install`.
 *
 * **على الهويّة** (١١-٢٤، مع صفحة `/app`): كلُّ حالٍ «ملاحظةٌ» بنغمتها وأفعالُها فيها، وخطواتُ آيفون سطورُ «حسابي» — كانت تنبيهاتٍ وأزرارًا
 * من الهويّة القديمة وسطورًا مرصوفةً بـTailwind. والصفحةُ العامّةُ (`AppRoom`) تأخذ النصوصَ نفسَها من هنا بقطع قالب «الأداة».
 */

/** خطواتُ آيفون — مصدرٌ واحدٌ للبطاقة وصفحة `/app` */
export const IOS_STEPS = [
  { icon: <Export />, title: "اضغط زرّ المشاركة", sub: "أسفل الشاشة في سفاري، وأعلاها في كروم" },
  { icon: <PlusSquare />, title: "اختر «إضافة إلى الشاشة الرئيسيّة»", sub: "إن لم تجده فمرّر القائمة إلى آخرها" },
  { icon: <HandTap />, title: "افتح أَدِيب من أيقونته", sub: "ومن داخله فعّل الإشعارات" },
];

/** ما يُقال لمن حجب الإشعارات، بحسب جهازه — مصدرٌ واحد */
export const DENIED: Record<string, string> = {
  ios: "احذف أدِيب من جوّالك ثمّ أضِفه من جديد، فيعود السؤال.",
  android: "من قائمة المتصفّح افتح «إعدادات الموقع» واسمح بالإشعارات، ثمّ عُد إلى هنا.",
  desktop: "اضغط رمز القفل بجوار عنوان الموقع واسمح بالإشعارات، ثمّ أعِد تحميل الصفحة.",
};

/**
 * `signedIn` تقوله الصفحةُ العامّة (`/app`) وحدها: الإشعارُ لحسابٍ لا لجهازٍ مجهول، فمن لم
 * يدخل يُدعى إلى الدخول مكانَ زرّ التفعيل ثمّ يعود إلى هنا. وبقيّةُ المواضع خلف جلسةٍ أصلًا.
 */
const ORDINAL = ["الأولى", "الثانية", "الثالثة"];

export function PwaContent({ pwa, signedIn = true }: { pwa: Pwa; signedIn?: boolean }) {
  const { stage, busy, note } = pwa;
  const other = (k: NonNullable<Pwa["busy"]>) => busy !== null && busy !== k;
  const install = pwa.canInstall ? (
    <AdButton busy={busy === "install"} disabled={other("install")} onClick={pwa.install} icon={<DownloadSimple />}>ثبّت التطبيق</AdButton>
  ) : null;

  return (
    <>
      {stage === "ios-install" ? (
        <>
          <AdNote tone="info" title="أضِف أدِيب إلى جوّالك أوّلًا">في آيفون لا تصل الإشعاراتُ إلّا بعد إضافته، بثلاث خطوات:</AdNote>
          <ul className="ad-lines">
            {IOS_STEPS.map((s, i) => <AdLine key={s.title} icon={s.icon} k={`الخطوة ${ORDINAL[i]}`} v={s.title} sub={s.sub} />)}
          </ul>
        </>
      ) : null}

      {stage === "ios-update" ? (
        <AdNote tone="warn" title="نظامُ جوّالك أقدمُ من الإشعارات">حدّث آيفون إلى iOS 16.4 أو أحدث، ثمّ افتح أَدِيب من أيقونته.</AdNote>
      ) : null}

      {stage === "unsupported" ? (
        <AdNote tone="warn" title="متصفّحُك لا يحمل الإشعارات">افتح أَدِيب في سفاري على آيفون، أو في كروم على أندرويد والحاسوب.</AdNote>
      ) : null}

      {stage === "denied" ? (
        <AdNote tone="warn" title="الإشعاراتُ محجوبةٌ على هذا الجهاز">{DENIED[pwa.platform ?? "desktop"]}</AdNote>
      ) : null}

      {stage === "ready" ? (
        // الأفعالُ صفٌّ تحت «الملاحظة» لا فيها: في النافذة الضيّقة كانت تعصر العنوانَ عمودًا (١١-٢٤)
        <>
          <AdNote tone="info" icon={<BellRinging />} title="فعّل الإشعارات">
            {signedIn
              ? "ليصلك ما يخصّك إشعارًا، كأيّ تطبيق."
              : "ادخل بوّابتك، ثمّ فعّلها ليصلك ما يخصّك إشعارًا."}
          </AdNote>
          <div className="ad-acts-row">
            {signedIn
              ? <AdButton variant="fill" busy={busy === "enable"} disabled={other("enable")} onClick={pwa.enable} icon={<BellRinging />}>فعّل الإشعارات</AdButton>
              : <AdButton variant="fill" href="/login?next=/app" icon={<SignIn />}>ادخل بوّابة أدِيب</AdButton>}
            {install}
          </div>
        </>
      ) : null}

      {stage === "on" ? (
        <>
          <AdNote tone="ok" icon={<BellRinging />} title="الإشعاراتُ مفعّلة">تصلك إشعاراتُ أَدِيب على هذا الجهاز.</AdNote>
          {/* أفعالُ المفعّلة سطورٌ لا أزرار (١١-٢٤): ثلاثةُ أزرارٍ كانت تنكسر في النافذة الضيّقة، والثالثُ وحده تحتها — وهي سطورٌ في صفحة `/app` أيضًا */}
          <ul className="ad-lines">
            <AdLine icon={<PaperPlaneTilt />} k="تجربة" v="أرسل إشعارًا تجريبيًّا" onClick={pwa.test} disabled={other("test")}
              act={{ icon: <PaperPlaneTilt />, text: "أرسل", label: "أرسل إشعارًا تجريبيًّا" }} />
            {pwa.canInstall ? (
              <AdLine icon={<DownloadSimple />} k="التطبيق" v="ثبّته على هذا الجهاز" onClick={pwa.install} disabled={other("install")}
                act={{ icon: <DownloadSimple />, text: "ثبّت", label: "ثبّت التطبيق" }} />
            ) : null}
            <AdLine icon={<BellSlash />} k="الإيقاف" v="أوقف الإشعارات على هذا الجهاز" onClick={pwa.disable} disabled={other("disable")} danger
              act={{ icon: <BellSlash />, text: "أوقفها", label: "أوقف الإشعارات" }} />
          </ul>
        </>
      ) : null}

      {note ? <AdNote tone={note.ok ? "ok" : "bad"} title={note.text} live /> : null}
    </>
  );
}
