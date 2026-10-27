"use client";

// معرضُ «الجرس والصندوق» — اختار محمد (٢٠٢٦-١٠-١٠) من وجهين عُرضا هنا جنبًا إلى جنب: **اللوحَ الجانبيّ**
// وعلامةَ **العدد**. وأُعدمت المنبثقةُ (ومعها صفحةُ «كلّ الإشعارات» التي كانت تحتاجها) والنقطة.
// وحجّةُ الاختيار: أكثرُ من يفتح أدِيب يفتحه من الجوّال، وهناك يملأ الوجهان الشاشة، فاللوحُ الذي
// يجمع كلَّ شيءٍ في مكانٍ واحدٍ أصدق؛ والإشعارُ باقٍ لا يُحذف، فالتمريرُ إلى القديم من الموضع نفسِه.
//
// والمعروضُ ههنا **المكوّناتُ الحيّة نفسُها** (`app/_notifications`) بعيّناتٍ لا بقاعدة: ما تراه هو
// ما يلبسه رأسُ اللوحة ورأسُ الموقع. والعيّناتُ وقائعُ من أدِيب لا نصوصٌ معتمدة: النصوصُ تُقرَّر في
// التبويبات وتُرى في `/ui/notifications`.
import { useState } from "react";
import { Button, Container, Header, Segmented } from "@adeeb/design-system";
import type { InboxFilter, InboxItem } from "@/lib/notifications/types";
import { Avatar } from "../../dashboard/_components/Avatar";
import { BellButton } from "../../_notifications/BellButton";
import { InboxDrawer } from "../../_notifications/InboxDrawer";

type Where = "dashboard" | "portal";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

type Seed = Omit<InboxItem, "at"> & { ago: number };

/** عضوٌ في اللوحة: قائدُ لجنةٍ تصله وقائعُ لجنته وما يخصّه. */
const DASHBOARD: Seed[] = [
  { id: 6, icon: "handshake", level: "important", title: "طلبُ تطوّعٍ جديد", body: "سارة الحربي تطلب الانضمام إلى فرصة «معرض الكتاب».", href: "#", ago: 5 * MIN, unread: true },
  { id: 5, icon: "ballot", level: "important", title: "فُتح التصويت", body: "انتخابُ قائد لجنة التأليف مفتوحٌ حتّى الخميس.", href: "#", ago: 70 * MIN, unread: true },
  { id: 4, icon: "tasks", level: "normal", title: "مهمّةٌ جديدة", body: "أسند إليك عبدالله السبيعي «تصميم إعلان الأمسية».", href: "#", ago: 3 * HOUR, unread: true },
  { id: 3, icon: "assign", level: "important", title: "كُلِّفتَ بقيادة لجنة التصميم", body: "حتّى 30 أكتوبر، مع بقاء منصبك.", href: "#", ago: 26 * HOUR, unread: false },
  { id: 2, icon: "warn", level: "critical", title: "صدر بحقّك إنذار", body: "الإنذارُ الأوّل، وتفصيلُه في عضويّتك.", href: "#", ago: 3 * DAY, unread: false },
  { id: 1, icon: "certificate", level: "normal", title: "شهادتُك جاهزة", body: "صدرت شهادةُ خبرتك في لجنة التصميم.", href: "#", ago: 40 * DAY, unread: false },
];

/** متطوّعةٌ في البوّابة: فرصُها وفعاليّاتُها وشهاداتُها. */
const PORTAL: Seed[] = [
  { id: 4, icon: "handshake", level: "important", title: "قُبل طلبُكِ", body: "أنتِ في فرصة «معرض الكتاب» يوم الخميس.", href: "#", ago: 12 * MIN, unread: true },
  { id: 3, icon: "cal", level: "important", title: "تذكيرٌ بأمسية «حكايا»", body: "غدًا الساعة 8 مساءً في مسرح الجامعة.", href: "#", ago: 3 * HOUR, unread: true },
  { id: 2, icon: "handshake", level: "normal", title: "فرصةٌ جديدة", body: "فُتح التسجيل في فرصة «يوم القراءة».", href: "#", ago: 28 * HOUR, unread: false },
  { id: 1, icon: "certificate", level: "normal", title: "شهادتُكِ جاهزة", body: "صدرت شهادةُ تطوّعكِ في «ليلة الشعر».", href: "#", ago: 5 * DAY, unread: false },
];

/** الصندوقُ الحيّ في المعرض: قراءةٌ بالنقر، و«تعليمُ الكلّ»، وتبويبان. بلا قاعدة. */
function DemoBell({ seed }: { seed: Seed[] }) {
  const [notes, setNotes] = useState<InboxItem[]>(() => seed.map(({ ago: ms, ...n }) => ({ ...n, at: ago(ms) })));
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<InboxFilter>("unread");
  const unread = notes.filter((n) => n.unread).length;
  const shown = tab === "unread" ? notes.filter((n) => n.unread) : notes;
  return (
    <>
      <BellButton count={unread} open={open} onClick={() => setOpen((v) => !v)} />
      <InboxDrawer
        open={open}
        unread={unread}
        tab={tab}
        onTab={setTab}
        items={shown}
        more={false}
        loadingMore={false}
        onMore={() => {}}
        onOpen={(item) => setNotes((all) => all.map((n) => (n.id === item.id ? { ...n, unread: false } : n)))}
        onReadAll={() => setNotes((all) => all.map((n) => ({ ...n, unread: false })))}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const MEMBER = "محمّد بن إسماعيل المطر";
const VOLUNTEER = "نورة العتيبي";

function DashboardFrame() {
  return (
    <div className="shdr-demo shdr-demo-tall mt-4">
      <header className="ash-top">
        <button type="button" className="ash-greet">
          <Avatar name={MEMBER} gender="male" className="ash-av" />
          <span className="ash-gtx">
            <span className="ash-ghi">مساء الخير 👋</span>
            <b>{MEMBER}</b>
          </span>
        </button>
        <div className="ash-tools">
          <DemoBell seed={DASHBOARD} />
        </div>
      </header>
      <div className="ash-content">
        <h2 className="font-display text-2xl font-black text-content">عضويّتي</h2>
      </div>
    </div>
  );
}

function PortalFrame() {
  return (
    <div className="shdr-demo shdr-demo-tall mt-4">
      <main className="amb-host">
        <Header
          activeHref="/me"
          ctaHref="#"
          viewer={{
            name: VOLUNTEER,
            avatar: <Avatar name={VOLUNTEER} gender="female" />,
            isMember: false,
            standing: "متطوّعة أدِيب",
            gender: "female",
          }}
          bell={<DemoBell seed={PORTAL} />}
          onSignOut={() => {}}
        />
        <section className="py-14">
          <Container>
            <h2 className="font-display text-3xl font-black text-content">حسابي</h2>
          </Container>
        </section>
      </main>
    </div>
  );
}

/**
 * **الرنّة** (٢٠٢٦-١٠-٢٧) — عُرض هنا وجهان: رنّةٌ واحدةٌ ثمّ سكون، ورنّةٌ تتكرّر. فاختار محمد التكرار
 * وجعله كلَّ ثلاث ثوانٍ، وأُعدمت الواحدة. والمدّةُ في `BellButton` نفسِه، فهذا الجرسُ هو جرسُ الموقع.
 */
function RingDemo() {
  const [count, setCount] = useState(2);
  const [visit, setVisit] = useState(0);
  return (
    <div className="mt-6 rounded border border-line bg-surface p-6">
      <div className="flex justify-center">
        <BellButton key={visit} count={count} open={false} onClick={() => setCount(0)} />
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button size="sm" variant="primary" onClick={() => setCount((c) => c + 1)}>إشعارٌ جديد</Button>
        <Button size="sm" variant="ghost" onClick={() => { setCount((c) => c || 2); setVisit((v) => v + 1); }}>
          فتحُ الصفحة من جديد
        </Button>
      </div>
    </div>
  );
}

const WHERE: { value: Where; label: string }[] = [
  { value: "dashboard", label: "في اللوحة" },
  { value: "portal", label: "في البوّابة" },
];

export default function BellPage() {
  const [where, setWhere] = useState<Where>("dashboard");

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Notifications, Bell</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">الجرسُ والصندوق</h1>
        <p className="mt-2 max-w-3xl leading-relaxed text-content-muted">
          جرسٌ واحدٌ للشخص في اللوحة والبوّابة، علامتُه <b>العدد</b>، وصندوقُه <b>لوحٌ جانبيّ</b> يخرج من
          جهة الجرس: غيرُ المقروءة أوّلًا، والكلُّ بتبويب، مجموعةً بالأيّام ثمّ بالشهور، ويُمرَّر إلى أقدم
          إشعار. وعلى الجوّال يملأ الشاشة. اضغط الجرس، واضغط إشعارًا ليُقرأ.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <span className="text-sm font-bold text-content">المكان:</span>
          <Segmented items={WHERE} value={where} onValueChange={(v) => setWhere(v as Where)} aria-label="المكان" />
        </div>

        {where === "dashboard" ? <DashboardFrame key="d" /> : <PortalFrame key="p" />}

        <h2 className="mt-14 font-display text-2xl font-black text-content">الرنّة</h2>
        <p className="mt-2 max-w-3xl leading-relaxed text-content-muted">
          يرنّ الجرسُ إذا فُتحت الصفحةُ وفيه ما لم يُقرأ، وإذا وصل إشعارٌ جديد، ثمّ كلَّ ثلاث ثوانٍ ما دام فيه ما لم يُقرأ. اضغط الجرسَ ليُقرأ ما فيه فيسكن.
        </p>
        <RingDemo />

        <div className="pb-10" />
      </Container>
    </main>
  );
}
