"use client";

import { Container } from "./Container";
import { footerGroups } from "../lib/nav";
import { cn } from "../lib/cn";

/* أيقونتان مرسومتان هنا كسائر أيقونات المكتبة (`Header` · `CarouselNav`): المكتبةُ بلا
   تبعيّة أيقونات، والرسمُ بـ`currentColor` فيتبع حبرَ محيطه. */
const IconUp = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

const IconSeal = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3l2.2 1.6 2.7-.2.9 2.6 2.2 1.6-1 2.5 1 2.5-2.2 1.6-.9 2.6-2.7-.2L12 21l-2.2-1.6-2.7.2-.9-2.6L4 15.4l1-2.5-1-2.5 2.2-1.6.9-2.6 2.7.2z" />
    <path d="M9.4 12.2l1.9 1.9 3.4-3.6" />
  </svg>
);

/**
 * تذييلُ الموقع — **الجزيرةُ المقلوبة كحليّةً، والنقشُ في قاعها** (اعتُمد ٢٠٢٦-٠٨-١٢).
 *
 * كان سطرًا واحدًا بحدٍّ علويّ **بلا كتلةِ أنماطٍ في المكتبة أصلًا** (تنسيقٌ شاردٌ
 * مضمَّن، مخالفةُ ق١)، فبُني مكوّنًا: أعمدةٌ ثمّ شريطٌ سفليّ ثمّ نقشٌ يختم الكرت.
 *
 * وعُرِضت ستُّ هيئاتٍ في جولتين **وأُعدمت كلُّها** إلّا هذه — فلا خاصّيّةَ جلدٍ ههنا
 * ولا اتّجاهٌ ميّتٌ يبقى (سابقةُ `Header` يوم اعتُمدت جزيرتُه).
 *
 * **وروابطُه من `lib/nav` نفسِه الذي يقرؤه الرأس** — فالقائمةُ واحدةٌ لا تفترق.
 */
export function Footer({
  logoSrc,
  loginHref = "/login",
  loginLabel = "بوّابة أَدِيب",
  verifyHref = "/verify",
  className,
}: {
  logoSrc?: string;
  loginHref?: string;
  loginLabel?: string;
  verifyHref?: string;
  className?: string;
}) {
  /* سنةُ الحقوق تُقرأ من الساعة لا تُحفَر: تذييلٌ يقول ٢٠٢٦ في ٢٠٢٨ يُقرأ موقعًا مهجورًا. */
  const year = new Date().getFullYear();

  return (
    <footer className={cn("sftr", className)}>
      <Container>
        <div className="sftr-panel">
          <div className="sftr-cols">
            <div className="sftr-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc ?? "/brand/logo-horizontal-white.svg"} alt="نادي أَدِيب" className="sftr-logo" />
              <p className="sftr-about">
                نادٍ ثقافيّ إبداعيّ بجامعة الملك فيصل، يدعم المواهب الشابّة عبر ورشٍ وبرامج ومحتوى متميّز.
              </p>
              <div className="sftr-tags">
                <span className="abadge abadge-info abadge-glass abadge-sm">نادٍ طلابيّ</span>
                <span className="abadge abadge-info abadge-glass abadge-sm">جامعة الملك فيصل</span>
              </div>
            </div>

            {footerGroups.map((g) => (
              <nav key={g.title} className="sftr-col" aria-label={g.title}>
                <h2 className="sftr-ttl">{g.title}</h2>
                <ul className="sftr-list">
                  {g.items.map((n) => (
                    <li key={n.href}>
                      <a href={n.href} className="sftr-lnk">
                        <span className="sftr-lbl">{n.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            <div className="sftr-col sftr-door">
              <h2 className="sftr-ttl">بوّابتك</h2>
              <p className="sftr-about">حسابُك في أَدِيب: عضويّتُك ومهامُّك وأثرُك في مكانٍ واحد.</p>
              <a href={loginHref} className="abtn abtn-inverse abtn-sm">
                {loginLabel}
              </a>
              <a href={verifyHref} className="sftr-lnk sftr-lnk-ic">
                {IconSeal}
                <span className="sftr-lbl">توثيق شهادة</span>
              </a>
            </div>
          </div>

          <div className="sftr-bottom">
            <p className="sftr-copy">
              {/* السنةُ و© في خانةٍ واحدة: كلاهما لاتينيُّ الرسم فيلبسان `--font-latin`
                  (كان © خارجها فيُرسَم بخطّ المتن، ورسمُه في الخطّين مختلف).
                  **وبلا `dir`**: الترتيبُ المرئيّ يقرّره اتّجاهُ الفقرة، فتقع السنةُ
                  بعد الاسم و© آخرًا كما أراد المالك — ووسمُ `ltr` يقلبهما. */}
              جميع الحقوق محفوظة لنادي أَدِيب <span className="font-latin">{year} ©</span>
            </p>
            <button
              type="button"
              className="sftr-top"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              {IconUp}
              <span>للأعلى</span>
            </button>
          </div>
        </div>
      </Container>
    </footer>
  );
}
