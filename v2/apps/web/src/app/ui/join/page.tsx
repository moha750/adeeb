"use client";

import { useState } from "react";
import { Container, Segmented } from "@adeeb/design-system";
import { JoinView, type JoinStep } from "@/app/join/JoinView";
import type { CommitteeOption } from "@/app/join/data";

/**
 * **معرضُ صفحة الانضمام — حالاتُها الأربعُ بلا أربعةِ حسابات.**
 *
 * الصفحةُ صارت عامّةً (٢٠٢٦-٠٩-١٢) فقصّتُها تسبق الحساب، وآخرُها وحدَه يتبدّل بمنزلة
 * قارئه. وتلك المنزلةُ لا تُبلَغ في الحيّ إلّا بأن تخرج من حسابك وتفتح حسابًا جديدًا
 * وتُكمل بياناتِه وتقدّم — أربعَ مرّات. فتُضبَط ههنا بزرّ.
 *
 * **والمصدرُ واحد:** المعروضُ هو `JoinView` نفسُه الذي تركّبه الصفحةُ الحيّة، لا نسخةٌ
 * تُحاكيه — فما يُصلَح هنا يُصلَح هناك، ولا يفترقان بعد شهر.
 *
 * **وبأسوأ بياناتها:** اللجانُ التسعُ الحقيقيّةُ بنصوصها كما هي في القاعدة، وفيها تعريفُ
 * لجنة الفعاليّات المكتوبُ أسطرًا (جملةٌ ثمّ تعدادٌ) — وهو ما كشف أنّ الكرت كان يطويه سطرًا
 * واحدًا فتلتصق جملُه.
 */

const WIDTHS = [
  { value: "375", label: "جوّال ٣٧٥" },
  { value: "430", label: "جوّال كبير ٤٣٠" },
  { value: "820", label: "لوح ٨٢٠" },
  { value: "1180", label: "سطح مكتب" },
];

const STEPS: { value: JoinStep; label: string }[] = [
  { value: "account", label: "بلا حساب" },
  { value: "data", label: "حسابٌ بلا بيانات" },
  { value: "apply", label: "لم يقدّم" },
  { value: "edit", label: "متطوّع" },
];

/** شرحُ كلّ حالةٍ تحت المبدّل: من هو صاحبُها، وما الذي يُنتظَر منه. */
const STEP_NOTE: Record<JoinStep, string> = {
  account: "زائرٌ لا جلسةَ له: يقرأ الطريقَ واللجانَ، وآخرُ الصفحة نموذجُ إنشاء الحساب ومعه المزوّدان ورابطُ الدخول لمن له حسابٌ سلفًا.",
  data: "فتح حسابَه بقوقل فلا صفَّ له في `profiles`: يُسأل اسمَه وجوّالَه وجنسَه قبل أن تُعرَض عليه القوائم.",
  apply: "له حسابٌ وبياناتٌ ولم يقدّم بعد: ثلاثُ قوائمَ وزرُّ «تقديم الطلب»، وبه يصير متطوّعًا.",
  edit: "من متطوّعي أدِيب: القوائمُ نفسُها محمَّلةً برغباته، والزرُّ «حفظ الرغبات»، ومعه نداءُ القروب.",
};

/** اللجانُ التسعُ كما تُخرجها `volunteer_committee_options()` من الإنتاج. */
const COMMITTEES: CommitteeOption[] = [
  { id: 5, name: "لجنة التصوير", description: "تختص لجنة التصوير بتصوير وتوثيق أنشطة وفعاليات النادي، من خلال التقاط الصور والمقاطع المرئية، وإنتاجها بمونتاجٍ يعكس جمالية المشاركة وأثرها." },
  { id: 6, name: "لجنة التصميم", description: "تتولى لجنة التصميم تنفيذ الهوية البصرية للنادي، من خلال تصميم المنشورات والمواد الإعلانية الخاصة بالأنشطة والمشاركات، بما يعكس التميز والإبداع." },
  { id: 7, name: "لجنة التسويق", description: "تُعنى لجنة التسويق بالترويج لأنشطة النادي ومبادراته، من خلال وضع استراتيجيات تسويقية مبتكرة، وإدارة الحملات الرقمية والإعلانية، بما يضمن وصول رسائل النادي لأكبر شريحة ممكنة من الجمهور." },
  { id: 1, name: "لجنة الفعاليات", description: "تُعنى لجنة الفعاليات بالتخطيط والتنظيم الميداني، وتشمل مهامها:\n\nإعداد جدول المشاركات في الأحداث المستقبلية.\nتنسيق وتصميم ديكور الأركان.\nتنظيم حركة الزوار وإدارة الازدحام بما يضمن انسيابية التجربة." },
  { id: 4, name: "لجنة السُفراء", description: "تُعد لجنة السفراء حلقة الوصل بين النادي والرعاة والجهات الداعمة، وتُسهم في تعزيز العلاقات العامة وبناء صورة إيجابية للنادي في المجتمع." },
  { id: 2, name: "لجنة الرواة", description: "تمثل لجنة الرواة الواجهة الإعلامية للنادي، حيث تنقل صوته في الفعاليات والأنشطة، متحدثةً عن جوهر المشاركة ومعبّرةً عن روح وحدته." },
  { id: 3, name: "لجنة التأليف", description: "تتولى لجنة التأليف إعداد المحتوى الكتابي وصياغة أفكار الأركان والمشاركات بأسلوب يعكس هوية النادي ورسائله، لتكون الكلمة وسيلة للتأثير والإبداع." },
  { id: 18, name: "لجنة التقارير والأرشفة", description: "تختص لجنة التقارير والأرشفة بجمع وتوثيق كافة بيانات وأنشطة النادي، وإعداد تقارير دقيقة عن الأداء والفعاليات، مع تنظيم الأرشيف الرقمي لضمان سهولة الوصول إلى المعلومات وحفظها بصورة منهجية." },
  { id: 24, name: "لجنة البرمجة", description: "تختص لجنة البرمجة بتطوير وصيانة المنصات الرقمية والتطبيقات التقنية للنادي، من خلال بناء الحلول البرمجية المبتكرة، وتحسين تجربة المستخدم، وأتمتة العمليات، بما يدعم التحول الرقمي ويعزز كفاءة الأداء." },
];

export default function JoinLab() {
  const [w, setW] = useState("375");
  const [step, setStep] = useState<JoinStep>("account");

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Join Page</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">صفحةُ الانضمام</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          القصّةُ تسبق الحساب: يهبط الزائرُ فيقرأ الطريقَ ويرى اللجانَ، ثمّ يأتي الحسابُ خطوةً
          في آخر الصفحة لا بوّابةً قبلها. المتنُ واحدٌ للجميع، والقسمُ الثالثُ وحدَه يتبدّل.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-content-muted">عرض الإطار:</span>
          <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض إطار المعاينة" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-content-muted">منزلةُ القارئ:</span>
          <Segmented
            items={STEPS}
            value={step}
            onValueChange={(v) => setStep(v as JoinStep)}
            aria-label="منزلة قارئ الصفحة"
          />
        </div>

        <p className="mt-4 max-w-2xl text-sm text-content-muted">{STEP_NOTE[step]}</p>
      </Container>

      <div className="mx-auto w-full max-w-[1280px] px-6">
        <div className="phdlab mt-10" style={{ ["--phdlab-w" as string]: w + "px" }}>
          <div className="phdlab-col">
            <div className="phdlab-tag good">
              <span className="dot" aria-hidden />
              {STEPS.find((s) => s.value === step)?.label}
              <span className="h">{w}px</span>
            </div>
            {/* الرأسُ والتذييلُ خارجَ الإطار عمدًا: مُقَرّان سلفًا، والسؤالُ ههنا متنُ الصفحة */}
            <div className="phdlab-frame">
              <JoinView
                committees={COMMITTEES}
                step={step}
                prefs={step === "edit" ? [5, 6, 24] : []}
                isVolunteer={step === "edit"}
                hasProfile={step !== "account" && step !== "data"}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
