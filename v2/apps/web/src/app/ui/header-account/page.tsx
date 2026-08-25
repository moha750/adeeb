"use client";

// معرضُ «الرأسُ حين يُعرَف صاحبُه» — الهيئةُ اعتُمدت (كبسولةُ الهويّة، المالك ٢٠٢٦-٠٨-٢٥)
// وأُعدمت أختاها. والباقي سؤالٌ واحد: أين يسكن الحسابُ على الجوّال — بابٌ مستقلّ في
// الشريط، أم داخل لوح البرغر؟ الوجهان أدناه جنبًا إلى جنب.
import { useState } from "react";
import { Ambient, Container, Header, Segmented } from "@adeeb/design-system";
import { Avatar } from "../../dashboard/_components/Avatar";

const NAV = [
  { label: "الفعاليات", href: "/activities" },
  { label: "الأخبار", href: "/news" },
  { label: "المكتبة", href: "/library" },
  { label: "الأعمال", href: "/works" },
];

type Who = "guest" | "account" | "member";

const WHO: { value: Who; label: string }[] = [
  { value: "guest", label: "زائر" },
  { value: "account", label: "صاحبُ حساب" },
  { value: "member", label: "عضو" },
];

/** الاسمُ والصورةُ من حسابٍ حقيقيّ الشكل — الأفتارُ بلا صورةٍ ليُرى رسمُ الجنس. */
const NAME = "محمّد بن إسماعيل المطر";

function viewerOf(who: Who) {
  if (who === "guest") return undefined;
  return {
    name: NAME,
    isMember: who === "member",
    // المنزلةُ سطرٌ ثانٍ في رأس المنسدلة: مسمّى المنصب لمن له منصب («قائد لجنة التصميم»
    // من `positionLine`)، وإلّا منزلتُه العامّة.
    standing: who === "member" ? "قائد لجنة التصميم" : null,
    avatar: <Avatar name={NAME} gender="male" />,
  };
}

/**
 * إطارُ معاينةٍ لا يُبحر — نظيرُ `/ui/header`: أيّ ضغطةٍ أصلُها رابطٌ تُلغى في مرحلة
 * الالتقاط، فيبقى الرأسُ حيًّا (منسدلتُه تُفتح ولوحُه ينطوي) ولا يغادر المعرض.
 */
function Frame({ who, phone }: { who: Who; phone?: boolean }) {
  return (
    <div
      className={`shdr-demo mt-4${phone ? " shdr-demo-phone" : ""}`}
      onClickCapture={(e) => {
        const link = (e.target as HTMLElement).closest("a");
        if (link) e.preventDefault();
      }}
    >
      <main className="amb-host">
        <Ambient />
        <Header
          nav={NAV}
          activeHref="/news"
          ctaHref="#"
          viewer={viewerOf(who)}
          onSignOut={() => {}}
        />
        <section className="py-14 text-center">
          <Container>
            <p className="font-latin text-xs font-bold tracking-[0.2em] text-secondary">ADEEB CLUB, KFU</p>
            <h2 className="mx-auto mt-2 max-w-2xl font-display text-3xl font-black leading-tight text-content">
              حيثُ تُولَدُ الكلمة
            </h2>
          </Container>
        </section>
      </main>
    </div>
  );
}

export default function HeaderAccountPage() {
  const [who, setWho] = useState<Who>("member");

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System, Header
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">
          الرأسُ حين يُعرَف صاحبُه
        </h1>
        <p className="mt-2 max-w-3xl leading-relaxed text-content-muted">
          فعلا الرأس لزائرٍ مجهول: «بوّابة أَدِيب» تدعوه إلى الدخول، و«انضمّ إلينا» تدعوه إلى
          العضويّة. ومن دخل يقرأ الأولى دعوةً إلى ما هو فيه. فحين تُعرَف الجلسةُ <b>تسقط الدعوتان
          معًا</b> (قرار المالك ٢٠٢٦-٠٨-٢٥: حتّى «انضمّ إلينا» تسقط عن صاحب الحساب) ويأخذ موضعَهما
          <b> كبسولةُ الهويّة</b>: أفتارٌ ثمّ الاسمُ الأوّل ثمّ شيفرون، بلغة كبسولة اللوحة نفسِها فلا
          هويّتان تفترقان. بدّل الحالةَ لترى الفرق.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <span className="text-sm font-bold text-content">الحالة:</span>
          <Segmented items={WHO} value={who} onValueChange={(v) => setWho(v as Who)} aria-label="حالةُ الزائر" />
        </div>

        <Frame who={who} />

        <section className="mt-16">
          <h2 className="font-display text-2xl font-black text-content">المنسدلة: بابٌ واحدٌ لكلّ منزلة</h2>
          <p className="mt-2 max-w-3xl leading-relaxed text-content-muted">
            اضغط الكبسولةَ أعلاه. الاسمُ كاملًا وتحته <b>مسمّى منصبه</b> («قائد لجنة التصميم»،
            من <code className="font-latin">positionLine</code> لا مخيطًا هنا) ومن لا منصبَ له تُقال
            منزلتُه، ثمّ <b>بابٌ واحدٌ لا بابان</b>:
            العضوُ يرى «بوّابة أَدِيب» وحدَها (فملفُّه وإعداداتُه وبابُ خروجه كلُّها داخلها)، وصاحبُ
            الحساب يرى «حسابك» وحدَها (فهي بيتُه كلُّه)، ثمّ الخروج. بدّل الحالةَ لترى القاعدة.
          </p>
          <p className="mt-3 max-w-3xl leading-relaxed text-content-muted">
            وبقيَ دَينٌ صغير: <b>حجوزاتُ الفعاليّات</b> في <code className="font-latin">/me</code> ولا
            بندَ لها في اللوحة، فالعضوُ لا يبلغها بعد إغلاق الباب الثاني.
          </p>
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-black text-content">على الجوّال: الحسابُ يبقى في الشريط</h2>
          <p className="mt-2 max-w-3xl leading-relaxed text-content-muted">
            دون <b>900px</b> تنطوي الروابطُ إلى لوح البرغر، <b>ويبقى الأفتارُ في الشريط بابًا
            مستقلًّا</b>: البرغرُ للتنقّل وحدَه والأفتارُ للحساب. عُرِض معه وجهٌ يدفن الهويّةَ داخل
            اللوح فأُعدم (المالك ٢٠٢٦-٠٨-٢٥)، وحجّتُه أنّ الرأسَ حينئذٍ يبقى <b>مطابقًا لرأس الزائر
            المجهول</b> على الجوّال، فتُنفَق الميزةُ ولا يراها أحد. والاسمُ وحدَه يسقط في الضيّق:
            الصورةُ هدفُ لمسٍ لا تسمية (والتسميةُ باقيةٌ لقارئ الشاشة).
          </p>
          <p className="mt-3 max-w-3xl leading-relaxed text-content-muted">
            اضغط الأفتارَ ثمّ زرَّ القائمة في الإطار — بابان لا يتنازعان.
          </p>
          <Frame who={who} phone />
        </section>

        <div className="pb-10" />
      </Container>
    </main>
  );
}
