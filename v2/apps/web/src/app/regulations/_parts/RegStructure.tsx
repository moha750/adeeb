import { Armchair, Briefcase, Buildings, Crown, UsersThree } from "@phosphor-icons/react";
import { AdBadge } from "@/app/_ad/primitives";

/**
 * شكلُ هيكل أدِيب في الدستور (المادة ١٩، `figure:structure`): المناصبُ لا الأشخاص، كما يقرّرها الباب
 * الثالث. المجلسُ الإداريّ فوق، والإداراتُ الثلاث تتبع الرئيسَ التنفيذيّ، والمجلسُ التشغيليّ تحت.
 * والخطُّ الصلبُ تبعيّة، والمتقطّعُ إشرافُ إدارتَي الموارد البشرية والضمان والجودة على اللجان (م١٩).
 * والإدارةُ التنفيذيّة أوّلَ الصفّ لأنّ خطّها إلى الأقسام، والأقسامُ قبل لجانها في اتّجاه القراءة.
 *
 * **على الهويّة** (٢٠٢٦-١١-٢٣): مادّتُه مادّةُ «هيكلة أدِيب» نفسُها، فيُعرف الشكلُ صورةً مصغّرةً منها —
 * المجلسان قسما الهويّة (`.ad-sec`) برمز المجلس (كرسيّ)، والإداراتُ والأقسامُ واللجانُ لوحةُ الاسم (`.ad-gtitle-name`) برموز الشجرة
 * (حقيبة، مبانٍ، ثلاثة)، والمقاعدُ شاراتُ الهويّة (`AdBadge`)، والخطوطُ خطوطُ الشجرة. كان لوحًا رماديًّا بمربّعات الرموز القديمة.
 *
 * ⚠️ الرسمُ مكتوبٌ هنا لا في متن القاعدة، فتعديلُ الباب الثالث يعدّله معه.
 */
const BOARD = ["الرئيس التنفيذي", "قائد إدارة الموارد البشرية", "قائد إدارة الضمان والجودة"];
// ومقاعدُ كلّ إدارة بمسمّياتها (توحيد المسمّيات 2026-11-23): المشرفون للموارد والضمان، والأعضاءُ التنفيذيّون للتنفيذيّة.
const DIRS: Array<{ name: string; line: "solid" | "dashed"; seats: string }> = [
  { name: "الإدارة التنفيذية", line: "solid", seats: "قائد وأعضاء تنفيذيون" },
  { name: "إدارة الموارد البشرية", line: "dashed", seats: "قائد ومشرفون" },
  { name: "إدارة الضمان والجودة", line: "dashed", seats: "قائد ومشرفون" },
];

function Panel({ title, sub, className = "", children }: { title: string; sub?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`ad-sec ad-rg-org-panel ${className}`} aria-label={title}>
      <header className="ad-sec-head">
        <span className="ad-sec-ic" aria-hidden><Armchair /></span>
        <span className="ad-sec-t"><b className="ad-rg-org-h">{title}</b>{sub ? <small className="ad-rg-org-sub">{sub}</small> : null}</span>
      </header>
      {children}
    </section>
  );
}

/** لوحةُ الاسم كحليّةً في كلّ وحدةٍ كما في الشجرة (محمد ٢٠٢٦-١١-٢٣؛ وجُرّب الكحليُّ للرئيس التنفيذيّ وحده والوحداتُ فاتحة: «التخفيفُ لم يعجبني») */
const Name = ({ icon, children }: { icon: React.ReactNode; children: string }) => (
  <span className="ad-gtitle-name ad-rg-org-name">{icon}<span>{children}</span></span>
);

export function RegStructure({ caption }: { caption: string }) {
  return (
    <figure className="ad-rg-org">
      <div className="ad-rg-org-chart">
        <Panel title="المجلس الإداري">
          <ul className="ad-rg-org-seats">
            <li><AdBadge icon={<Crown />}>رئيس أدِيب</AdBadge></li>
            {BOARD.map((s) => <li key={s}><AdBadge>{s}</AdBadge></li>)}
            <li data-opt><AdBadge>قائد الإدارة التنفيذية، إن عُيّن</AdBadge></li>
          </ul>
        </Panel>
        <span className="ad-rg-org-v" aria-hidden />
        <div className="ad-rg-org-ceo"><Name icon={<Crown />}>الرئيس التنفيذي</Name></div>
        <span className="ad-rg-org-fork" aria-hidden />
        <ul className="ad-rg-org-dirs">
          {DIRS.map((d) => (
            <li key={d.name} className="ad-rg-org-dir">
              <Name icon={<Briefcase />}>{d.name}</Name>
              <small>{d.seats}</small>
            </li>
          ))}
        </ul>
        <div className="ad-rg-org-links" aria-hidden>
          {DIRS.map((d) => (
            <span key={d.name} className="ad-rg-org-ln" data-line={d.line}>
              {d.line === "dashed" ? <i>إشراف</i> : null}
            </span>
          ))}
        </div>
        <Panel title="المجلس التشغيلي" sub="يرأسه الرئيس التنفيذي" className="ad-rg-org-ops">
          <div className="ad-rg-org-unit">
            <Name icon={<Buildings />}>الأقسام</Name>
            <ul className="ad-rg-org-seats"><li><AdBadge>منسّق</AdBadge></li></ul>
          </div>
          <div className="ad-rg-org-unit ad-rg-org-coms">
            <Name icon={<UsersThree />}>اللجان</Name>
            <ul className="ad-rg-org-seats">
              <li><AdBadge>قائد</AdBadge></li>
              <li><AdBadge>نائب</AdBadge></li>
              <li><AdBadge>أعضاء</AdBadge></li>
            </ul>
          </div>
        </Panel>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
