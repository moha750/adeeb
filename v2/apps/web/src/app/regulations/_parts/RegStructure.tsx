import { Bank, Buildings, UsersFour, UsersThree } from "@phosphor-icons/react";
import { ICON_WEIGHT } from "@/lib/iconWeight";

/**
 * شكلُ هيكل أدِيب في الدستور (المادة ١٩، `figure:structure`): المناصبُ لا الأشخاص، كما يقرّرها الباب
 * الثالث. المجلسُ الإداريّ فوق، والإداراتُ الثلاث تتبع الرئيسَ التنفيذيّ، والمجلسُ التشغيليّ تحت.
 * والخطُّ الصلبُ تبعيّة، والمتقطّعُ إشرافُ إدارتَي الموارد البشرية والضمان والجودة على اللجان (م١٩).
 * والإدارةُ التنفيذيّة أوّلَ الصفّ لأنّ خطّها إلى الأقسام، والأقسامُ قبل لجانها في اتّجاه القراءة.
 * ورموزُه رموزُ الهيكل في المنصّة: المجلسُ مصرف، والإدارةُ أربعة، والقسمُ مبانٍ، واللجنةُ ثلاثة.
 *
 * ⚠️ الرسمُ مكتوبٌ هنا لا في متن القاعدة، فتعديلُ الباب الثالث يعدّله معه.
 */
const BOARD = ["الرئيس التنفيذي", "قائد إدارة الموارد البشرية", "قائد إدارة الضمان والجودة"];
const DIRS: Array<{ name: string; line: "solid" | "dashed" }> = [
  { name: "الإدارة التنفيذية", line: "solid" },
  { name: "إدارة الموارد البشرية", line: "dashed" },
  { name: "إدارة الضمان والجودة", line: "dashed" },
];

export function RegStructure({ caption }: { caption: string }) {
  return (
    <figure className="rg-fig rg-org">
      <div className="rg-org-chart">
        <section className="rg-org-panel rg-org-board">
          <h4 className="rg-org-h">
            <span className="tico tico-solid tico-steel" aria-hidden>
              <Bank weight={ICON_WEIGHT} />
            </span>
            المجلس الإداري
          </h4>
          <ul className="rg-org-seats">
            <li data-head>رئيس أدِيب</li>
            {BOARD.map((s) => (
              <li key={s}>{s}</li>
            ))}
            <li data-opt>قائد الإدارة التنفيذية، إن عُيّن</li>
          </ul>
        </section>
        <div className="rg-org-hub" aria-hidden />
        <div className="rg-org-ceo">الرئيس التنفيذي</div>
        <div className="rg-org-fork" aria-hidden />
        <ul className="rg-org-dirs">
          {DIRS.map((d) => (
            <li key={d.name} className="rg-org-dir">
              <span className="tico tico-steel" aria-hidden>
                <UsersFour weight={ICON_WEIGHT} />
              </span>
              <b>{d.name}</b>
              <small>قائد وأعضاء</small>
            </li>
          ))}
        </ul>
        <div className="rg-org-links" aria-hidden>
          {DIRS.map((d) => (
            <span key={d.name} className="rg-org-ln" data-line={d.line}>
              {d.line === "dashed" ? <i>إشراف</i> : null}
            </span>
          ))}
        </div>
        <section className="rg-org-panel rg-org-ops">
          <h4 className="rg-org-h">
            <span className="tico tico-solid tico-steel" aria-hidden>
              <Bank weight={ICON_WEIGHT} />
            </span>
            المجلس التشغيلي
            <small>يرأسه الرئيس التنفيذي</small>
          </h4>
          <div className="rg-org-unit">
            <div className="rg-org-unit-h">
              <span className="tico tico-steel" aria-hidden>
                <Buildings weight={ICON_WEIGHT} />
              </span>
              الأقسام
            </div>
            <ul className="rg-org-seats">
              <li>منسّق</li>
            </ul>
          </div>
          <div className="rg-org-unit rg-org-coms">
            <div className="rg-org-unit-h">
              <span className="tico tico-steel" aria-hidden>
                <UsersThree weight={ICON_WEIGHT} />
              </span>
              اللجان
            </div>
            <ul className="rg-org-seats">
              <li>قائد</li>
              <li>نائب</li>
              <li>أعضاء</li>
            </ul>
          </div>
        </section>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
