"use client";

import { useState } from "react";
import { Container, PersonPicker, Segmented } from "@adeeb/design-system";
import { Camera, Users, Microphone } from "@phosphor-icons/react";
import { Avatar } from "../../dashboard/_components/Avatar";

/**
 * **مُنتقي الأشخاص — بابان لا باب.**
 *
 * العلّةُ مقيسةٌ في الأخبار الحيّة: عشرون اسمًا كُتبت بأيدٍ مختلفة، سبعةٌ منها فقط
 * تطابق سجلَّ صاحبها، وشخصٌ واحدٌ نُسِب إليه عملُه بثلاث هجاءات، وهمزةٌ واحدةٌ فرّقت
 * بين «أحمد» و«احمد». فصار الحقلُ منتقيًا: اختر من أهل أدِيب فيُكتب الاسمُ كما في
 * سجلّه، أو اكتب اسمَ ضيفٍ من خارجهم كما هو.
 *
 * والبِركةُ ههنا **وهميّةٌ تشبه الحقيقيّة**: أسماءٌ متقاربةٌ عمدًا (ثلاث «حوراء»)
 * واسمٌ طويلٌ جدًّا، لتُجرَّب أسوأُ حالةٍ لا أجملُها.
 */

const WIDTHS = [
  { value: "375", label: "جوّال ٣٧٥" },
  { value: "430", label: "جوّال كبير ٤٣٠" },
  { value: "620", label: "سطح مكتب" },
];

const MEMBERS = [
  { name: "الحَوراء أحمد الملبو", hint: "لجنة التأليف" },
  { name: "بشائر فاروق الحداد", hint: "لجنة التصميم" },
  { name: "حوراء زكريا الشيبة", hint: "لجنة التصوير" },
  { name: "حوراء عبدالله المنصور", hint: "لجنة الرواة" },
  { name: "روان ناصر الهنداس", hint: "لجنة التسويق" },
  { name: "عبدالرحمن بن محمد بن عبدالله الشمري", hint: "إدارة الموارد البشرية" },
  { name: "عبدالله احمد باجعيفر", hint: "لجنة البرمجة" },
  { name: "فاطمة زكريا الكويتي", hint: "لجنة الفعاليات" },
  { name: "نوره عامر الدوسري", hint: "لجنة السُفراء" },
];
const VOLUNTEERS = [
  { name: "امنة سعد الخضير", hint: "متطوّع" },
  { name: "شيماء ناصر الموسى", hint: "متطوّع" },
  { name: "غلا عمر الغامدي", hint: "متطوّع" },
  { name: "يزيد سالم بلعبيد", hint: "متطوّع" },
];

const POOL = [
  ...MEMBERS.map((p) => ({ ...p, group: "أعضاء أدِيب", gender: "female" })),
  ...VOLUNTEERS.map((p) => ({ ...p, group: "متطوّعو أدِيب", gender: "male" })),
].map((p) => ({ ...p, icon: <Avatar name={p.name} gender={p.gender} size="xs" /> }));

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-6">
      <h2 className="mb-2 font-display text-2xl font-black text-content">{title}</h2>
      {children}
    </section>
  );
}
function Note({ children }: { children: React.ReactNode }) {
  return <p className="mb-6 max-w-[70ch] text-sm leading-7 text-content-muted">{children}</p>;
}

export default function PersonPickerLab() {
  const [w, setW] = useState("375");
  const [authors, setAuthors] = useState<string[]>(["الحَوراء أحمد الملبو", "ضيفٌ من خارج النادي"]);
  const [shooter, setShooter] = useState<string[]>([]);
  const [host, setHost] = useState<string[]>(["حوراء زكريا الشيبة"]);

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Person Picker</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">منتقي الأشخاص</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          حقلٌ ببابين: ابحث في أهل أدِيب (عضوًا أو متطوّعًا) فيُكتب الاسمُ كما في سجلّه،
          أو اكتب اسمًا من خارجهم فيُقبَل كما هو — ويظهر لك صفٌّ صريحٌ يقول ذلك. جرّب:
          اكتب «حوراء» لترى ثلاثةً يتشابهن فتفرّقهنّ وحدتُهنّ، ثمّ اكتب اسمًا لا وجودَ له.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-content-muted">عرض الإطار:</span>
          <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض إطار المعاينة" />
        </div>
      </Container>

      <div className="mx-auto w-full max-w-[1200px] px-6">
        <div className="mt-12 space-y-16" style={{ ["--phdlab-w" as string]: w + "px" }}>
          <Sec title="أسماءٌ كثيرة: الكتّاب">
            <Note>
              شاراتٌ تلتفّ سطورًا فلا يُقَصّ اسمٌ طويل، وتُرفع الواحدةُ بمَخرجها أو
              بمفتاح الرجوع على حقلٍ فارغ. وأوّلُ الشارات هو الكاتبُ المعروض في البطاقة.
            </Note>
            <div className="phdlab">
              <div className="phdlab-col">
                <div className="phdlab-frame">
                  <PersonPicker label="الكتّاب" icon={<Users />} people={POOL}
                    value={authors} onChange={setAuthors}
                    placeholder="ابحث في أهل أدِيب أو اكتب اسمًا"
                    helper="أوّلهم هو الكاتب المعروض في البطاقة." />
                </div>
              </div>
            </div>
          </Sec>

          <Sec title="اسمٌ واحد: مصوّر الغلاف والمقدّم">
            <Note>
              حقلُ الاسم الواحد يقبل شارةً واحدة، فإذا امتلأ غاب حقلُ البحث حتّى تُرفع —
              فلا يُظَنّ أنّ الثانيةَ تُضاف ثمّ تُبتلَع صامتة.
            </Note>
            <div className="phdlab">
              <div className="phdlab-col">
                <div className="phdlab-frame">
                  <PersonPicker label="مصوّر الغلاف" icon={<Camera />} single people={POOL}
                    value={shooter} onChange={setShooter}
                    placeholder="ابحث في أهل أدِيب أو اكتب اسمًا" optional />
                </div>
              </div>
              <div className="phdlab-col">
                <div className="phdlab-frame">
                  <PersonPicker label="مقدّم الحلقة" icon={<Microphone />} single people={POOL}
                    value={host} onChange={setHost}
                    placeholder="ابحث في أهل أدِيب أو اكتب اسمًا"
                    helper="ضيفٌ يقدّم حلقةً؟ اكتب اسمَه." />
                </div>
              </div>
            </div>
          </Sec>
        </div>
      </div>
    </main>
  );
}
