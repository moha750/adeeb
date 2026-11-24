"use client";

/**
 * **صفحةُ التطبيق** (`/app`) — رابطُ الإعلان الذي يُنشر في القروبات. **أُعيد بناؤها على رحلة زائرها** (محمد ٢٠٢٦-١١-٢٤: «هل أخذتَ الفكرة
 * وفهمتها وصمّمتها على تجربة المستخدم؟» — كانت النسخةُ الأولى الصفحةَ القديمةَ بثوب الهويّة).
 *
 * **ما تعلّمناه من الرحلة:**
 * - الزائرُ يحتاج أن يعرف **ماذا سيأخذ** قبل أن يُطلب منه شيء — فأوّلُ ما يتدلّى من اللوح ثلاثُ ورقاتٍ لا تشيخ (`GETS`).
 *   (والصفحةُ لا تُنشر قبل أن يكتمل نظامُ إشعارات المتطوّعين والأصدقاء: «ما يخصّك يبلغك» وعدٌ للجميع)
 * - **آيفون رحلتُه مرحلتان**: يُضيفه إلى شاشته، ثمّ يفتحه من أيقونته ويفعّل الإشعارات من داخله. فالمرحلةُ الثانيةُ تُقال له
 *   من البداية، وإلّا ظنّ أنّه انتهى.
 * - **من فتح الرابطَ داخل تطبيقٍ آخر** (انستقرام، تيك توك…) لا يجد «إضافة إلى الشاشة الرئيسيّة»: يُقال له «افتحه في سفاري»
 *   ويُنسخ له الرابط. ومن لم يجد الخيارَ في متصفّحه يجد السطرَ نفسَه تحت الخطوات.
 * - **الإشعارُ لحسابٍ لا لجهاز**: من لم يدخل يجد الدخولَ خطوةً في طريقه، لا عائقًا في آخره.
 * - **زائرُ الحاسوب** يقرأ ما سيصله ثمّ يمسح الرمز.
 *
 * والجوابُ قسمٌ بختمه حين يكون حكمًا فيه فعل (`AdSection stamp`): ما يمنع كهرمانيّ، والمفعّلةُ خضراء؛ وما لا فعلَ فيه تنبيه (`AdNote`).
 * ولا وسمَ «آيفون وأندرويد» في اللوح (محمد ١١-٢٤: «ماذا يُستفاد منها؟»): الخطوةُ تعرف جهازَ زائرها فلا حاجةَ إلى إعلانه.
 * والنصوصُ المشتركةُ من `_pwa/PwaContent`.
 */
import { useMemo, useState } from "react";
import {
  BellRinging, BellSlash, Compass, DeviceMobile, HandTap, LinkSimple, PaperPlaneTilt, QrCode, SignIn, Storefront,
} from "@phosphor-icons/react";
import { Check, DownloadSimple } from "@/app/_components/glyphs";
import { qrSvg } from "@/lib/qr";
import { defaultQrSpec } from "@/app/dashboard/tools/qr/defaults";
import { usePwa } from "@/app/_pwa/usePwa";
import { inAppBrowser } from "@/app/_pwa/client";
import { DENIED, IOS_STEPS } from "@/app/_pwa/PwaContent";
import { PubIndex } from "../public";
import { AdButton, AdGroupTitle, AdNote } from "../primitives";
import { AdLine, AdSection } from "../account";

const ORDINAL = ["الأولى", "الثانية", "الثالثة"];

/**
 * **ما يأخذه الزائر — بلا تعدادٍ للأحداث ولا تقسيمٍ بالمنزلة** (محمد ١١-٢٤: «بكرة أضفنا ميزةً جديدة، والنصُّ بيطول»): كانت أربعَ ورقاتٍ
 * (عضوًا، متطوّعًا، صديقًا، وللجميع) تسرد ما يصل كلًّا، فتكبر مع كلّ إشعارٍ يُوصَل وتشيخ مع كلّ تغيير. والذي لا يتغيّر ثلاثة:
 * ما يخصّك يبلغك، وأدِيب بلمسة، وبلا متجر.
 */
const GETS = [
  { key: "notify", Icon: BellRinging, title: "ما يخصّك يصلك إشعارًا", body: "كلُّ ما يتعلّق بك في أدِيب يصلك لحظتها." },
  { key: "touch", Icon: HandTap, title: "أدِيب بلمسةٍ واحدة", body: "أيقونتُه على جوّالك تفتح بوّابتك مباشرة." },
  { key: "store", Icon: Storefront, title: "بلا متجرٍ ولا تحميل", body: "يُضاف من المتصفّح نفسِه، ولا يأخذ من مساحة جوّالك شيئًا يُذكر." },
] as const;

export function AppRoom({ signedIn, url }: { signedIn: boolean; url: string }) {
  const pwa = usePwa();
  const [copied, setCopied] = useState(false);
  const qr = useMemo(() => qrSvg({ ...defaultQrSpec(url), size: 208 }), [url]);

  const guest = !signedIn;
  const inApp = typeof navigator !== "undefined" && inAppBrowser();
  const busy = pwa.busy;
  const other = (k: NonNullable<typeof busy>) => busy !== null && busy !== k;

  const copy = () => {
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 2400); }, () => {});
  };
  const copyLine = (k: string, v: string) => (
    <AdLine icon={<LinkSimple />} k={k} v={v} onClick={copy}
      act={{ icon: copied ? <Check /> : <LinkSimple />, text: copied ? "نُسخ" : "انسخ الرابط", label: "انسخ رابط الصفحة" }} />
  );

  // ── خطوتُك: قسمٌ واحدٌ بحسب الجهاز وحاله ──
  // **ما لا فعلَ فيه تنبيهٌ لا قسم** (محمد ١١-٢٤: «هذا الشكلُ رأسُ الكونتينر أم المفروضُ أن يكون تنبيهًا؟»): القسمُ بلا سطورٍ رأسٌ بلا جسد،
  // والحالُ التي لا يُفعل فيها هنا شيءٌ (محجوبة، نظامٌ قديم) خبرٌ يُقرأ ثمّ يُفعل خارج الصفحة — فهي `AdNote`
  const step = (() => {
    if (pwa.stage === "loading") return <AdSection icon={<DeviceMobile />} title="خطوتُك" sub="نفحص جهازك…" />;
    if (pwa.platform === "desktop") {
      return (
        <AdSection icon={<QrCode />} title="افتحها من جوّالك" sub="التطبيقُ للجوّال: امسح الرمز بكاميرته، فتُفتح هذه الصفحةُ هناك بخطواتها."
          media={
            <div className="ad-app-qr">
              <div aria-label="رمزٌ يفتح هذه الصفحة على الجوّال" role="img" dangerouslySetInnerHTML={{ __html: qr }} />
              <bdi dir="ltr" className="ad-app-url">{url.replace(/^https?:\/\//, "")}</bdi>
            </div>
          } />
      );
    }
    if (pwa.stage === "ios-install" && inApp) {
      return (
        <AdSection stamp="warn" icon={<Compass />} title="افتحها في سفاري" sub="فتحتَ الرابطَ داخل تطبيقٍ آخر، ولا يُضاف أدِيب إلى جوّالك من هنا.">
          {copyLine("الخطوة الأولى", "انسخ الرابط، ثمّ الصقه في سفاري")}
          <AdLine icon={<DeviceMobile />} k="الخطوة الثانية" v="تجد خطواتِ الإضافة هناك" />
        </AdSection>
      );
    }
    if (pwa.stage === "ios-install") {
      return (
        <>
          <AdSection icon={<DeviceMobile />} title="المرحلة الأولى: أضِفه إلى جوّالك" sub="في آيفون لا تصل الإشعاراتُ إلّا بعد إضافته.">
            {IOS_STEPS.map((s, i) => <AdLine key={s.title} icon={s.icon} k={`الخطوة ${ORDINAL[i]}`} v={s.title} sub={s.sub} />)}
            {copyLine("لا تجد «إضافة إلى الشاشة الرئيسيّة»؟", "افتح الرابطَ في سفاري")}
          </AdSection>
          <AdNote tone="info" icon={<BellRinging />} title="ثمّ المرحلة الثانية">
            {guest ? "افتح أدِيب من أيقونته، وادخل بوّابتك، ثمّ فعّل الإشعارات من هناك." : "افتح أدِيب من أيقونته، وفعّل الإشعارات من هناك."}
          </AdNote>
        </>
      );
    }
    if (pwa.stage === "ios-update") {
      return <AdNote tone="warn" icon={<DeviceMobile />} title="نظامُ جوّالك أقدمُ من الإشعارات">حدّث آيفون إلى iOS 16.4 أو أحدث، ثمّ عُد إلى هذه الصفحة.</AdNote>;
    }
    if (pwa.stage === "unsupported") {
      return (
        <AdSection stamp="warn" icon={<BellSlash />} title="متصفّحُك لا يحمل الإشعارات" sub="افتح الرابطَ في سفاري على آيفون، أو في كروم على أندرويد.">
          {copyLine("الرابط", "انسخه، ثمّ الصقه في متصفّحك")}
        </AdSection>
      );
    }
    if (pwa.stage === "denied") {
      return <AdNote tone="warn" icon={<BellSlash />} title="الإشعاراتُ محجوبةٌ على هذا الجهاز">{DENIED[pwa.platform ?? "android"]}</AdNote>;
    }
    if (pwa.stage === "on") {
      return (
        <AdSection stamp="ok" icon={<BellRinging />} title="الإشعاراتُ مفعّلة" sub="يصلك ما يخصّك إشعارًا.">
          <AdLine icon={<PaperPlaneTilt />} k="تجربة" v="أرسل إشعارًا تجريبيًّا" onClick={pwa.test} disabled={other("test")}
            act={{ icon: <PaperPlaneTilt />, text: "أرسل", label: "أرسل إشعارًا تجريبيًّا" }} />
          {pwa.canInstall ? (
            <AdLine icon={<DownloadSimple />} k="التطبيق" v="ثبّته على هذا الجهاز" onClick={pwa.install} disabled={other("install")}
              act={{ icon: <DownloadSimple />, text: "ثبّت", label: "ثبّت التطبيق" }} />
          ) : null}
        </AdSection>
      );
    }
    // جاهزٌ للتفعيل: من لم يدخل يجد الدخولَ خطوتَه الأولى
    return (
      <AdSection icon={<BellRinging />} title={guest ? "خطوتان" : "فعّل الإشعارات"}
        sub={guest ? "الإشعارُ يصل حسابَك لا جهازَك، فتدخل بوّابتك أوّلًا ثمّ تفعّله." : "يصلك ما يخصّك إشعارًا، كأيّ تطبيق."}>
        {guest ? (
          <AdLine icon={<SignIn />} k="الخطوة الأولى" v="ادخل بوّابة أدِيب" sub="وتعود إلى هذه الصفحة بعدها" href="/login?next=/app"
            act={{ icon: <SignIn />, text: "ادخل", label: "ادخل بوّابة أدِيب" }} />
        ) : null}
        <AdLine icon={<BellRinging />} k={guest ? "الخطوة الثانية" : "الإشعارات"} v="فعّل الإشعارات على هذا الجهاز" disabled={guest || other("enable")}
          onClick={guest ? undefined : pwa.enable} act={guest ? undefined : { icon: <BellRinging />, text: "فعّل", label: "فعّل الإشعارات" }} />
        {pwa.canInstall ? (
          <AdLine icon={<DownloadSimple />} k="وإن شئت" v="ثبّت أدِيب على جوّالك" onClick={pwa.install} disabled={other("install")}
            act={{ icon: <DownloadSimple />, text: "ثبّت", label: "ثبّت التطبيق" }} />
        ) : null}
      </AdSection>
    );
  })();

  return (
    <PubIndex title="تطبيقُ أَدِيب" deck="أدِيب على جوّالك كأيّ تطبيق، وما يخصّك يصلك إشعارًا."
      // في الجوّال أربعُ ورقاتٍ قبل الخطوة: فالفعلُ في اللوح يقفز إليها لمن جاء ليثبّت (والانزلاقُ من `SmoothScroll`)
      after={<div className="ad-pz-cta"><AdButton variant="inverse" size="lg" href="#step" icon={<HandTap />}>{pwa.platform === "desktop" ? "افتحها من جوّالك" : "ابدأ الآن"}</AdButton></div>}>
      <div className="ad-pz">
        {/* «ماذا يصلك» يتدلّى من اللوح بلا عنوان (كخطوات الانضمام): عنوانُ مجموعةٍ على اللوح لا يُقرأ، واللوحُ قال «وما يخصّك يصلك» */}
        <section className="ad-pz-sec" aria-label="ماذا يصلك">
          <div className="ad-doors ad-pz-perks">
            {GETS.map(({ key, Icon, title, body }) => (
              <div key={key} className="ad-door">
                <div className="ad-door-body">
                  <span className="ad-door-ic" aria-hidden><Icon /></span>
                  <span className="ad-door-t"><b>{title}</b><p>{body}</p></span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="step" className="ad-pz-sec" aria-labelledby="ad-app-step">
          <AdGroupTitle icon={<HandTap />} sub={pwa.platform === "desktop" ? undefined : "على هذا الجهاز."}>
            <span id="ad-app-step">خطوتُك</span>
          </AdGroupTitle>
          {/* **بعرض الورقات فوقها** (محمد ١١-٢٤: «الكونتينر حجم، والمربّعات حجم، وخطوتك حجم»): كانت الخطوةُ بعرض جواب الأداة (٤٨) تحت ورقاتٍ
              بعرض الصفحة وعنوانٍ بعرضها — فصار العمودُ واحدًا */}
          <div className="ad-app-step">
            {step}
            {pwa.note ? <AdNote tone={pwa.note.ok ? "ok" : "bad"} title={pwa.note.text} live /> : null}
          </div>
        </section>
      </div>
    </PubIndex>
  );
}
