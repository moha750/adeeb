"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Badge, Button, Container, Field, SaveBar, Segmented } from "@adeeb/design-system";
import { FloppyDisk, Megaphone, PaperPlaneTilt, TextT } from "@phosphor-icons/react";
import { ArrowRight, Eye, EyeSlash, PencilSimple, Trash } from "@/app/_components/glyphs";
import { CrumbTrail } from "../../dashboard/_shell/Breadcrumb";
import { DropdownMenu, type MenuGroup } from "../../dashboard/_components/DropdownMenu";
import type { CrumbStep } from "../../dashboard/_shell/crumb";

/**
 * معرضُ رأس الصفحة — **مقارنةُ الحال بالمقترح**، لا عرضُ مكوّن.
 *
 * الشكوى (المالك، ٢٠٢٦-٠٨-١٣): «بعض التبويبات فيها أزرار مثل الرجوع والتصدير وغيرها
 * الكثير، وشكلها يزحم الشاشة خاصّةً على مقاس الجوّال».
 *
 * **وجولةٌ أولى رُفضت**: طوت الأزرارَ سطرًا تحت العنوان أو صفّتها اثنين اثنين — فحلّت
 * الفيضَ بالارتفاع، والرأسُ صار يأكل ثلثَ الشاشة. الحكمُ الذي خرج منها: **المقياسُ هو
 * الارتفاع المشغول، لا انضباطُ الصفّ**. فصار الرقمُ معروضًا في كلّ إطارٍ أدناه.
 *
 * والرؤوسُ منقولةٌ حرفيًّا عن شاشاتٍ حيّة بأزرارها وأنماطها، وتحت كلٍّ منها بدايةُ محتوى
 * صفحتها — فيُرى ما بقي من الشاشة الأولى بعد الرأس.
 */

const WIDTHS = [
  { value: "375", label: "جوّال ٣٧٥" },
  { value: "430", label: "جوّال كبير ٤٣٠" },
  { value: "768", label: "لوح ٧٦٨" },
  { value: "1100", label: "سطح مكتب" },
];

/** يقيس ارتفاع الرأس المرسوم فعلًا — الرقمُ محسوبٌ لا مقدَّر، ويتبع تبدّل العرض */
function useHeight(): [number, (el: HTMLDivElement | null) => void] {
  const [h, setH] = useState(0);
  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const apply = () => setH(Math.round(el.getBoundingClientRect().height));
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
  }, []);
  return [h, ref];
}

/** عمودُ مقارنةٍ واحد: وسمٌ فيه الارتفاع المقيس، فوق إطارٍ بعرض الجهاز المختار */
function Frame({ tag, tone, children, body }: { tag: string; tone?: "bad" | "good"; children: React.ReactNode; body: React.ReactNode }) {
  const [h, ref] = useHeight();
  return (
    <div className="phdlab-col">
      <div className={"phdlab-tag" + (tone ? " " + tone : "")}>
        <span className="dot" aria-hidden />
        {tag}
        <span className="h">{h ? h + "px" : ""}</span>
      </div>
      <div className="phdlab-frame">
        <div ref={ref}>{children}</div>
        <div className="phdlab-rule" />
        <div className="phdlab-body">{body}</div>
      </div>
    </div>
  );
}

const crumb = (...labels: string[]): CrumbStep[] =>
  labels.map((label, i) =>
    i === labels.length - 1 ? { kind: "leaf", label } : { kind: "link", label, href: "#" },
  );

/* ══════════ الأولى: محرّر المنشور (library/[id]/BookEditorView) ══════════ */

const BOOK_CRUMB = crumb("إدارة الموقع", "إرثٌ يُروى", "مجلّة أديب، العدد الثالث");
/* الفتاتُ في المقترح لا يحمل الورقة: العنوانُ تحته يقولها، وتكرارُها يستهلك سطرًا ثمّ
   يُقصّ فيبقى فاصلٌ معلَّقٌ بلا نصّ (رُئي في اللقطة). وهذا عقدُ `Breadcrumb` القائم
   نفسُه — `leaf` يُترك حين تكون الصفحةُ بندَ الخريطة. */
const BOOK_CRUMB_NEW = crumb("إدارة الموقع", "إرثٌ يُروى");
const BOOK_TITLE = "مجلّة أديب، العدد الثالث";
const BOOK_BODY = "اسحب صور الصفحات هنا، أو اخترها من جهازك";

function BookNow() {
  return (
    <div className="ash-phead">
      <div>
        <CrumbTrail steps={BOOK_CRUMB} />
        <h1>{BOOK_TITLE}</h1>
      </div>
      <div className="form-head-actions">
        <Badge tone="warning" dot>مسودّة</Badge>
        <Button variant="ghost" size="md"><Eye size={18} />معاينة</Button>
        <Link href="#" className="abtn abtn-ghost abtn-md"><ArrowRight size={18} />رجوع</Link>
        <Button variant="primary" size="md"><Megaphone size={18} />نشر</Button>
      </div>
    </div>
  );
}

const BOOK_MENU: MenuGroup[] = [
  { items: [{ label: "معاينة المنشور", icon: <Eye /> }, { label: "إلغاء النشر", icon: <EyeSlash /> }] },
  { danger: true, items: [{ label: "حذف المنشور", icon: <Trash />, danger: true }] },
];

function BookNew() {
  return (
    <div className="phd">
      <div className="phd-row">
        <div className="phd-id">
          <div className="phd-meta">
            <CrumbTrail steps={BOOK_CRUMB_NEW} />
            <Badge tone="warning" dot>مسودّة</Badge>
          </div>
          <h1 className="phd-title" title={BOOK_TITLE}>{BOOK_TITLE}</h1>
        </div>
        <div className="phd-acts">
          <Button variant="primary" size="md"><Megaphone size={18} />نشر</Button>
          <DropdownMenu groups={BOOK_MENU} ariaLabel="أفعالٌ أخرى" triggerClassName="abtn abtn-ghost abtn-md phd-more" />
        </div>
      </div>
    </div>
  );
}

/* ══════════ الثانية: بناء الاستبيان (surveys/BuilderView) — أثقلُها ══════════ */

const SURVEY_CRUMB = crumb("الاستبيانات", "تحرير");
const SURVEY_CRUMB_NEW = crumb("الاستبيانات");
const SURVEY_TITLE = "تحرير: استبيان رضا الأعضاء عن الموسم";

function SurveyNow() {
  return (
    <div className="ash-phead">
      <div>
        <CrumbTrail steps={SURVEY_CRUMB} />
        <h1>{SURVEY_TITLE}</h1>
      </div>
      <div className="form-head-actions">
        <Button variant="ghost" size="md"><Eye size={18} /> معاينة</Button>
        <Button variant="ghost" size="md">إلغاء</Button>
        <Button variant="neutral" size="md">حفظ كمسودّة</Button>
        <Button variant="primary" size="md">نشر</Button>
      </div>
    </div>
  );
}

const SURVEY_MENU: MenuGroup[] = [
  { items: [{ label: "معاينة الاستبيان", icon: <Eye /> }] },
  { items: [{ label: "إلغاء والخروج" }] },
];

function SurveyNew() {
  return (
    <div className="phd">
      <div className="phd-row">
        <div className="phd-id">
          <div className="phd-meta">
            <CrumbTrail steps={SURVEY_CRUMB_NEW} />
            <Badge tone="warning" dot>مسودّة</Badge>
          </div>
          <h1 className="phd-title" title={SURVEY_TITLE}>{SURVEY_TITLE}</h1>
        </div>
        <div className="phd-acts">
          <Button variant="primary" size="md">نشر</Button>
          <DropdownMenu groups={SURVEY_MENU} ariaLabel="أفعالٌ أخرى" triggerClassName="abtn abtn-ghost abtn-md phd-more" />
        </div>
      </div>
    </div>
  );
}

/* ══════════ الثالثة: محرّر الخبر (news/[id]/NewsEditorView) ══════════ */
/* هذه وحدَها تحمل عنقودَين: رأسٌ فيه «رجوع» و«حفظ»، وشريطُ أفعالٍ عائمٌ تحته فيه أفعالُ
   المرحلة — فالفعلُ يُطلَب في موضعين وخمسةُ أزرارٍ تتقاسم أعلى الشاشة. */

const NEWS_CRUMB = crumb("غرفة التحرير", "أديب يفتتح موسمَه الثقافيّ");
const NEWS_CRUMB_NEW = crumb("غرفة التحرير");
const NEWS_TITLE = "أديب يفتتح موسمَه الثقافيّ";

function NewsNow() {
  return (
    <>
      <div className="ash-phead">
        <div>
          <CrumbTrail steps={NEWS_CRUMB} />
          <h1 style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {NEWS_TITLE}
            <Badge tone="info" dot>ينتظر المراجعة</Badge>
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="ghost" size="md"><ArrowRight size={18} />رجوع</Button>
          <Button variant="ghost" size="md"><FloppyDisk size={18} />حفظ</Button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        <Button variant="primary" size="md"><PaperPlaneTilt size={18} />رفع إلى المراجعة</Button>
        <Button variant="ghost" size="md">إعادة بملاحظة</Button>
        <Button variant="ghost" size="md"><Megaphone size={18} />نشر</Button>
      </div>
    </>
  );
}

const NEWS_MENU: MenuGroup[] = [
  { items: [{ label: "معاينة الخبر", icon: <Eye /> }, { label: "إعادة بملاحظة" }] },
];

function NewsNew() {
  return (
    <div className="phd">
      <div className="phd-row">
        <div className="phd-id">
          <div className="phd-meta">
            <CrumbTrail steps={NEWS_CRUMB_NEW} />
            <Badge tone="info" dot>ينتظر المراجعة</Badge>
          </div>
          <h1 className="phd-title" title={NEWS_TITLE}>{NEWS_TITLE}</h1>
        </div>
        <div className="phd-acts">
          <Button variant="primary" size="md"><PaperPlaneTilt size={18} />رفع</Button>
          <DropdownMenu groups={NEWS_MENU} ariaLabel="أفعالٌ أخرى" triggerClassName="abtn abtn-ghost abtn-md phd-more" />
        </div>
      </div>
    </div>
  );
}

/* ══════════ أين ذهب «حفظ» ══════════ */

function SaveDemo() {
  const [title, setTitle] = useState("أديب يفتتح موسمَه الثقافيّ");
  const dirty = title !== "أديب يفتتح موسمَه الثقافيّ";
  return (
    <div className="phdlab-col" style={{ width: "var(--phdlab-w, 375px)" }}>
      <div className="phdlab-tag good">
        <span className="dot" aria-hidden />
        اكتب في الحقل ليظهر الشريط
      </div>
      <div className="phdlab-frame" style={{ paddingBottom: 14 }}>
        <NewsNew />
        <Field label="عنوان الخبر" icon={<TextT />} innerIcon={<PencilSimple />} placeholder="اكتب عنوان الخبر" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div style={{ marginTop: 12 }}>
          <SaveBar open={dirty}>
            <Button variant="ghost" size="sm" onClick={() => setTitle("أديب يفتتح موسمَه الثقافيّ")}>تراجع</Button>
            <Button variant="primary" size="sm"><FloppyDisk size={16} />حفظ</Button>
          </SaveBar>
        </div>
      </div>
    </div>
  );
}

export default function PageHeaderLab() {
  const [w, setW] = useState("375");

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Page Header</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">رأس الصفحة، وزحمةُ أزراره</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          الرأسُ صفٌّ واحدٌ لا يلتفّ ولا يُكدَّس: العنوانُ هو الذي يتهذّب حين يضيق المكان، لا
          الأفعالُ التي تُصفّ سطورًا. والمقياسُ معروضٌ فوق كلّ إطار، وخطٌّ متقطّعٌ يفصل الرأسَ
          عمّا بقي من الشاشة الأولى تحته.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-content-muted">عرض الإطار:</span>
          <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض إطار المعاينة" />
        </div>
      </Container>

      {/* المقارنةُ تخرج من الحاوية القانونيّة عمدًا: إطاران بعرض الجهاز جنبًا إلى جنبٍ هما
          غايةُ الصفحة، ولو التفّ ثانيهما سطرًا ضاعت المقارنة. */}
      <div className="mx-auto w-full max-w-[1200px] px-6">
        <div className="mt-12 space-y-16" style={{ ["--phdlab-w" as string]: w + "px" }}>
          <section>
            <h2 className="mb-2 font-display text-2xl font-black text-content">محرّر المنشور</h2>
            <p className="mb-6 max-w-2xl text-sm text-content-muted">
              أربعةُ عناصرَ في عنقودٍ لا يلتفّ: شارةُ حالة، ومعاينة، ورجوع، ونشر. و«رجوع» يكرّر
              فتاتَ المسار الذي فوقه بسطر، فيُحذف.
            </p>
            <div className="phdlab">
              <Frame tag="الآن" tone="bad" body={BOOK_BODY}><BookNow /></Frame>
              <Frame tag="المقترح" tone="good" body={BOOK_BODY}><BookNew /></Frame>
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-black text-content">بناء الاستبيان</h2>
            <p className="mb-6 max-w-2xl text-sm text-content-muted">
              أثقلُها: أربعةُ أزرارٍ كلُّها نصّيّة، وثلاثةٌ منها متقاربةُ الوزن فلا يُعرف أيُّها الفعلُ
              المقصود. و«حفظ كمسودّة» ينزل إلى شريط الحفظ، فلا يبقى في الرأس إلّا «نشر».
            </p>
            <div className="phdlab">
              <Frame tag="الآن" tone="bad" body="إعدادات الاستبيان"><SurveyNow /></Frame>
              <Frame tag="المقترح" tone="good" body="إعدادات الاستبيان"><SurveyNew /></Frame>
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-black text-content">محرّر الخبر</h2>
            <p className="mb-6 max-w-2xl text-sm text-content-muted">
              علّةٌ زائدة: عنقودان لا واحد. رأسٌ فيه «رجوع» و«حفظ»، وشريطٌ عائمٌ تحته فيه أفعالُ
              المرحلة. فخمسةُ أزرارٍ تتقاسم أعلى الشاشة، والفعلُ يُطلَب في موضعين.
            </p>
            <div className="phdlab">
              <Frame tag="الآن" tone="bad" body="نصّ الخبر"><NewsNow /></Frame>
              <Frame tag="المقترح" tone="good" body="نصّ الخبر"><NewsNew /></Frame>
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-black text-content">والقاعدةُ في المترجم لا في التعليق</h2>
            <p className="mb-6 max-w-2xl text-sm text-content-muted">
              الـCSS يصف ولا يمنع: الشاشةُ التي تُكتب غدًا تستطيع حشرَ أربعة أزرارٍ كما حشرتها
              اثنتا عشرة شاشةٌ من قبل. فصار الرأسُ مكوّنًا لا صنفًا، وحدُّه في أنماطه: فعلٌ
              أساسيٌّ <b>مفردٌ</b> لا مصفوفة، ولا <span className="font-latin">children</span>.
              فالأربعةُ لا تُكتب أصلًا.
            </p>
            <pre className="mb-6 max-w-2xl overflow-x-auto rounded border border-line bg-surface-2 p-4 text-start font-latin text-sm" dir="ltr">
{`<PageHeader
  title={book.title}
  status={<Badge tone="warning" dot>مسودّة</Badge>}
  primary={{ label: "نشر", icon: <Megaphone />, onClick: publish }}
  menu={[{ items: [{ label: "معاينة" }, { label: "إلغاء النشر" }] }]}
/>

// ✗ لا يُترجم: لا مكانَ لفعلٍ ثانٍ
<PageHeader title="…" primary={[a, b]} />
<PageHeader title="…" actions={<><Button/><Button/></>} />`}
            </pre>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-black text-content">وأين ذهب «حفظ»؟</h2>
            <p className="mb-6 max-w-2xl text-sm text-content-muted">
              إلى شريط الحفظ اللاصق: لا يظهر حتى يوجد ما يُحفَظ، ووجودُه نفسُه هو التنبيه. وهو
              في المكتبة منذ شاشة الحساب، فلا يُبنى ثانيةً. اكتب في الحقل ليظهر.
            </p>
            <div className="phdlab">
              <SaveDemo />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
