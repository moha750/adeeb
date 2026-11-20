"use client";

/**
 * **قالبُ صفحة السجلّ المفرد — «التذكرةُ المفتوحة»** (اعتمده محمد ٢٠٢٦-١١-٠٧ من ثلاثة اتّجاهاتٍ مبنيّة على فعاليّةٍ حقيقيّة).
 *
 * صفحةُ السجلّ هي **تذكرتُه في غرفته مفتوحة**: ما يُنقر في القائمة هو ما يُفتح، فالعينُ تعرفه قبل أن تقرأه. والتذكرةُ رأسُ الصفحة مكانَ
 * لوح الغرفة (كما صار كرتُك رأسَ «حسابي» في الجوّال، `AdRoomBand`):
 * - **الكعبُ** لوحٌ عريضٌ على غلاف السجلّ خافتًا بلونه، المسارُ في أعلاه وحقيقةُ الكعب في أسفله (يومُ الفعاليّة وشهرُه). وفي الجوّال
 *   شريطٌ أعلاها كتذكرة الضيّق.
 * - **الورقة**: الشاراتُ (الحالُ والنوع)، والأفعالُ في طرف سطرها مقابلَ الاسم كفعل اللوح، ثمّ الاسمُ عنوانَ الصفحة (`h1`)، ثمّ سطورُ
 *   الحقائق برموزها، ثمّ **رحلةُ السجلّ** أرقامًا بشرائطها — بجانب الحقائق صفّين في الغرفة العريضة فلا يطول الرأس، وتحتها في الضيّق.
 * - **ولا ترتفع ولا يتلوّن غلافُها بالمرور**: هي الصفحةُ لا رابطٌ إليها.
 * وما تحت الرأس غرفةُ القائمة نفسُها (`CollectionRoom` بـ`head`): المبدّلُ بمراحل ما في السجلّ، والأدوات، والجدول.
 * (رُفض: «الملفّ» — لوحُ الغرفة وعمودان، رحلةُ الحجز في الجوّال بعد آخر مشارك؛ و«لوحُ السجلّ» — لوحٌ كحليٌّ كبيرٌ يطول بالبيانات.)
 */
import type { ReactNode } from "react";
import { crumbFor, upFor } from "@/app/dashboard/_shell/crumb";
import { useNav } from "@/app/dashboard/_shell/nav-context";
import { usePathname } from "next/navigation";
import { ArrowRight } from "@/app/_components/glyphs";
import { AdButton, AdFigureRow, AdMetaList, PlateCrumb, cutOf, type AdFigure, type AdMeta, type AdStub } from "./primitives";

/** فتاتُ السجلّ من مساره (`path` حين يُعرض في غير مساره): بوّابة أدِيب › التفاعل › الفعاليّات — والاسمُ عنوانُ التذكرة */
function useRecordCrumb(path: string | undefined, title: string) {
  const nav = useNav();
  const here = usePathname();
  // **المسارُ كاملًا حتى السجلّ** (محمد ٢٠٢٦-١١-٢٠: «المفروض أن يكون المسار… الانتخابات، نائب لجنة التصوير»): الغرفةُ رابطًا، واسمُ
  // السجلّ آخرَه. ويُسأل عمّا تحت الغرفة حين يُعرض السجلّ في مسارها نفسِه (`path`)، فتكون الغرفةُ رابطًا لا آخرَ المسار
  // وعنوانُ القسم في الشريط («الانتخابات») يسقط هنا: الغرفةُ بعده تقوله («إدارة الانتخابات»)، فلا يتكرّر ولا يلتفّ (محمد ٢٠٢٦-١١-٢٠)
  return crumbFor(path ? `${path}/record` : here ?? "", nav, title)
    .filter((st) => st.kind !== "group")
    .map((st) => ({ label: st.label, href: st.kind === "link" ? st.href : undefined }));
}

export function RecordTicket({ path, title, desc, seed, cover, stub, chips, acts, info, figures, trail, back }: {
  path?: string;
  title: string;
  /** وصفُ السجلّ تحت اسمه (وصفُ الفرصة كما كتبه مشرفُها) */
  desc?: string | null;
  /** معرّفُ السجلّ: يُقصّ قماشُ الكعب من موضعه في تذكرة القائمة نفسِه */
  seed: string;
  cover?: string | null;
  /** حقيقةُ الكعب كما في تذكرة القائمة («6» ثمّ «مايو 2026»، أو رمزٌ مكانَ الرقم)؛ وبلا حقيقةٍ قماشُ الكعب ومسارُه وحدهما */
  stub?: AdStub;
  chips?: ReactNode;
  /** الأفعالُ: الأساسيُّ أوّلًا (`AdButton variant="fill" size="sm"`) */
  acts?: ReactNode;
  info: AdMeta[];
  /** رحلةُ السجلّ: أربعةُ أرقامٍ تصير صفّين بجانب الحقائق */
  figures?: AdFigure[];
  /** **مسارٌ أعمق من الغرفة** (صفحةُ ترشّحٍ داخل انتخاب، ٢٠٢٦-١١-١٧): «الانتخابات › منسّق قسم صناعة المحتوى» — والعودةُ تُضغط من المسار لا بزرٍّ ثانٍ */
  trail?: { label: string; href: string }[];
  /**
   * **زرُّ العودة على كعب كلّ سجلّ** (فوق المسار، لا بين الأفعال) (محمد ٢٠٢٦-١١-٢٠: «أوافق جدًّا حتى على تعميمه»، بعد أن سأل في صفحة الانتخاب: «وين الزر
   * لكي أعود للصفحة السابقة؟»). كان الرجوعُ رابطَ المسار الصغير فوق الكعب وحده («والعودةُ تُضغط من المسار لا بزرٍّ ثانٍ»، ١١-١٧)،
   * فلم يُرَ. يُشتقّ من المسار نفسه: أقربُ ما فوق السجلّ («العودة إلى الانتخابات»)، ويُسمّى بيد الغرفة إن كان مرجعُها غيرَه
   * («العودة إلى سِجلّ ترشّحي»)، و`false` حيث لا رجوع.
   */
  back?: { label: string; href: string } | false;
}) {
  // المسارُ الأعمق (`trail`) قبل اسم السجلّ لا بعده: الغرفة › المقعد › ترشّحُ فلان
  const base = useRecordCrumb(path, title);
  const leaf = base.length && !base[base.length - 1].href ? base[base.length - 1] : null;
  const crumb = [...(leaf ? base.slice(0, -1) : base), ...(trail ?? []), ...(leaf ? [leaf] : [])];
  const here = usePathname();
  // الأبُ: آخرُ المسار الأعمق إن كان (`trail`)، وإلّا الغرفةُ التي يُنسب إليها السجلّ. ومسارُها هو المسارُ نفسُه حين يُعرض السجلّ في
  // غير مساره (`path` = الغرفة)، فيُسأل عمّا فوق مقطعٍ تحته ليُجاب بالغرفة لا بالبوّابة
  const parent = trail?.length ? trail[trail.length - 1] : upFor(`${path ?? here ?? ""}/record`);
  const ret = back === false ? null : back ?? (parent?.href ? { label: `العودة إلى ${parent.label}`, href: parent.href } : null);
  return (
    <section className="ad-card-wrap ad-rtk" aria-labelledby="ad-room-title">
      <article className="ad-card">
        <div className="ad-card-stub" data-cut={cutOf(seed)}>
          {cover && (
            <span className="ad-card-stub-media" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ad-card-stub-img" src={cover} alt="" referrerPolicy="no-referrer" />
            </span>
          )}
          <div className="ad-rtk-stub">
            {/* **العودةُ على اللوح مع المسار لا بين الأفعال** (محمد ٢٠٢٦-١١-٢٠: «ألا ترى أن أصبحت الأزرار الآن مزدحمة؟» ثمّ «نوجد حلّ جذري»):
                التنقّلُ مكانُه حيث المسار، فيبقى صفُّ الأفعال كما كان */}
            {/* والعودةُ والمسارُ قطعةٌ واحدةٌ متلاصقة (كان بينهما فراغُ الكعب كلُّه، محمد: «لماذا هناك فراغ كبير بينه وبين المسار؟»)،
                والزرُّ ممتدٌّ بعرض الكعب («لو الزر امتد يمكن يكون أجمل») */}
            <div className="ad-rtk-nav">
              {ret ? <span className="ad-rtk-back"><AdButton variant="inverse-quiet" size="sm" icon={<ArrowRight />} href={ret.href}>{ret.label}</AdButton></span> : null}
              <PlateCrumb crumb={crumb} />
            </div>
            {stub ? (
              <p className="ad-rtk-day">
                {stub.icon ? <span className="ad-stub-icon" aria-hidden>{stub.icon}</span> : <b className="ad-num">{stub.big}</b>}
                <span>{stub.small}</span>
              </p>
            ) : null}
          </div>
        </div>
        <div className="ad-card-main">
          <div className="ad-card-body ad-rtk-body">
            <div className="ad-rtk-top">
              {chips ? <span className="ad-chips">{chips}</span> : <span />}
              {acts ? <span className="ad-rtk-acts">{acts}</span> : null}
            </div>
            <h1 id="ad-room-title" className="ad-rtk-title">{title}</h1>
            {desc ? <p className="ad-rtk-desc">{desc}</p> : null}
            {info.length > 0 && <AdMetaList meta={info} />}
            {figures && figures.length > 0 && <AdFigureRow figures={figures} />}
          </div>
        </div>
      </article>
    </section>
  );
}
