"use client";

import { useState } from "react";
import { Container } from "@adeeb/design-system";
import { pickGreeting } from "@/lib/deebo/greeting";
import type { Turn } from "@/lib/deebo/useDeebo";
import { DeeboScreen } from "../../deebo/DeeboScreen";

/**
 * معرِضُ **شاشة محادثة ديبو** (`.dchs-*`) — المكوّنُ الحيُّ نفسُه كسائر صفحات `/ui`.
 *
 * كانت مقارنةً بين ثلاث هيئاتٍ (الصفحة · الغرفة · الجزيرة)، فاختار المالك **الغرفة**
 * ٢٠٢٦-٠٨-٢٠ وقال: «المفروض تكون هذه بديهيّات، قدّم لي صفحةً وكأنّي أرى محادثةَ GPT أو
 * Claude». **فأُعدمت أختاها** من المكتبة، وصارت هذه معرِضًا لِما بقي (ق١: كلُّ مكوّنِ
 * مكتبةٍ له صفحةٌ في `/ui`).
 *
 * وحالان تُريان جنبًا إلى جنب: الغرفةُ عامرةً (المتنُ وحدَه يمرّر والمُنشئُ راسٍ)،
 * والغرفةُ فارغةً (التحيّةُ تتوسّطها). والإطارُ بعرض جهازٍ حقيقيّ ‏390.
 */

/** حوارٌ حقيقيُّ الطول: سؤالٌ قصير، وجوابٌ بطول ما تقوله الشخصيّة («جملتان أو ثلاث»). */
const TALK: Turn[] = [
  { role: "user", content: "ما نادي أديب؟" },
  {
    role: "assistant",
    content:
      "نادي أديب نادٍ ثقافيٌّ إبداعيٌّ في جامعة الملك فيصل بالأحساء، تحت مظلّة عمادة شؤون الطلاب. نلتقي حول الكتابة والقراءة والفنون، ولنا فعاليّاتٌ وأمسياتٌ ومكتبةٌ وإذاعة.",
  },
  { role: "user", content: "وهل أحضر فعاليّاتكم بلا عضويّة؟" },
  {
    role: "assistant",
    content:
      "نعم، أكثرُ فعاليّاتنا مفتوحةٌ للجميع ولا تشترط العضويّة. والعضويّةُ تعنيك إن أردت أن تعمل معنا لا أن تحضر وحسب.",
  },
  { role: "user", content: "كيف أنضمّ إليكم؟" },
  {
    role: "assistant",
    content:
      "طريقُك يبدأ بالتطوّع: تُنشئ حسابًا، ثمّ تتطوّع في فرصةٍ معروضة، ثمّ تُرشَّح للعضويّة. وصفحةُ «انضمّ إلينا» تسوقك إلى منزلتك من هذا الطريق.",
  },
];

/** سِجلٌّ صوريّ: الدرجُ لا يُعرَض إلّا لصاحب حساب، والمعرِضُ بلا جلسة. وعشرةٌ لا ثلاثةٌ
    كي تُرى **رؤوسُ المجموعات** (اليوم · أمس · آخر سبعة أيّام · أقدم) ويظهر البحث. */
const NOW = Date.now();
const H = 3600e3;
const D = 86400e3;
const RECORD = [
  ["كيف أنضمّ إليكم؟", 2 * H],
  ["ما مواعيد أمسية الشعر؟", 6 * H],
  ["هل للمكتبة كتبٌ إلكترونيّة؟", 27 * H],
  ["من يقود لجنة الإعلام؟", 30 * H],
  ["كيف أرشّح نفسي في الانتخابات؟", 3 * D],
  ["ما شروط شهادة الخبرة؟", 5 * D],
  ["أين تُبثّ إذاعة أديب؟", 9 * D],
  ["هل التطوّع يشترط عضويّة؟", 14 * D],
  ["ما أنواع فعاليّاتكم؟", 22 * D],
  ["ما نادي أديب؟", 70 * D],
].map(([title, ago], i) => ({
  id: `c${i}`,
  title: title as string,
  lastAt: new Date(NOW - (ago as number)).toISOString(),
  messageCount: 2 + (i % 4),
}));

/** إطارٌ واحدٌ: غرفةٌ حيّةٌ تُكتب فيها وتُرسل، والجوابُ مكتوبٌ لا مُولَّد. */
function Frame({ tag, note, start, record = false }: { tag: string; note: string; start: Turn[]; record?: boolean }) {
  const [turns, setTurns] = useState<Turn[]>(start);
  const [draft, setDraft] = useState("");

  /* إرسالٌ صوريّ: الغرضُ أن يُرى **كيف تتصرّف الغرفةُ حين تطول المحادثة** لا أن يُجاب
     سؤال. فيُضاف دورُ الزائر وجوابٌ ثابتٌ من ديبو، ويتحرّك المتنُ كما يتحرّك حيًّا. */
  const send = (text: string) => {
    setTurns((prev) => [
      ...prev,
      { role: "user", content: text },
      {
        role: "assistant",
        content: "هذا معرِضٌ لا محادثة، فجوابي فيه واحدٌ مهما سألت. انظر كيف يمرّ المتنُ وحدَه ويبقى المُنشئُ في مكانه.",
      },
    ]);
    setDraft("");
  };

  return (
    <div className="nvlab-col">
      <div className="phdlab-tag good">
        <span className="dot" aria-hidden />
        {tag}
      </div>
      <div className="nvlab-frame">
        <DeeboScreen
          turns={turns}
          greeting={pickGreeting({ seed: 0, hour: 10, name: null })}
          busy={false}
          error={null}
          draft={draft}
          onDraft={setDraft}
          onSend={send}
          onStop={() => {}}
          onReset={() => setTurns([])}
          conversations={record ? RECORD : null}
        />
      </div>
      <p className="nvlab-note">{note}</p>
    </div>
  );
}

export default function DeeboScreenLab() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Deebo Screen</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">غرفةُ محادثة ديبو</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          الوثيقةُ لها آخِرٌ، والمحادثةُ آخرُها دائمًا الآن. فالصفحةُ لا تمرّر، ويمرّر المتنُ
          وحدَه بين شريطٍ ومُنشئٍ لا يتزحزحان: المُنشئُ كبسولةٌ يسكنها زرُّ الإرسال وتكبر
          بكبر ما تكتب، والتحيّةُ تتوسّط الغرفةَ ما دامت فارغة، وزرُّ النزول لا يظهر إلّا
          متى صعدتَ في الكلام.
        </p>
        <p className="mt-3 max-w-2xl text-content-muted">
          اكتب في الإطارين وأرسل مرّتين أو ثلاثًا، واصعد في المتن لترى زرَّ النزول. والجوابُ
          مكتوبٌ ثابتٌ ههنا: المعروضُ هيئةُ الغرفة لا ذكاءُ ديبو.
        </p>
      </Container>

      <div className="mx-auto w-full max-w-[1320px] px-6">
        <div className="nvlab mt-12">
          <Frame
            tag="غرفةٌ عامرة"
            start={TALK}
            note="المتنُ وحدَه يمرّر، والمُنشئُ راسٍ في القاع لا يُبحَث عنه مهما طالت المحادثة. و«محادثة جديدة» في الشريط العلويّ فلا تزاحم الإبهامَ في القاع."
          />
          <Frame
            tag="غرفةٌ فارغة"
            start={[]}
            note="التحيّةُ تتوسّط الغرفةَ لا تتصدّرها، والأسئلةُ المقترحةُ تحتها. وتذهب كلُّها مع أوّل سؤال فلا تبقى تأكل من الشاشة."
          />
          <Frame
            tag="غرفةُ عضوٍ داخل"
            start={[]}
            record
            note="سِجلُّه يُرى بلا نقرة: ثلاثةٌ من آخر محادثاته كروتًا تحت الأسئلة، وكلُّها في صفحتها. وحُذف اللوحُ المنسدل جذريًّا (أمرُ المالك)، فلا أثاثَ يُتعلَّم من أجل قائمة."
          />
        </div>
      </div>
    </main>
  );
}
