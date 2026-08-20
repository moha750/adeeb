import { Container } from "@adeeb/design-system";
import { MOOD_ALT, moodFor, moodSrc, type Mood } from "@/lib/deebo/mood";

/**
 * معرِضُ **فقاعة محادثة ديبو** (`.dch-*`) — المكوّنُ الحيُّ نفسُه كسائر صفحات `/ui`.
 *
 * كانت مقارنةً بين ثلاثة اتّجاهات، فاختار المالك **«الفقاعتين»** ٢٠٢٦-٠٨-١٩ وأُعدم أخواها
 * من المكتبة، فصارت معرِضًا لِما بقي (ق١: كلُّ مكوّنِ مكتبةٍ له صفحةٌ في `/ui`).
 *
 * **وهي خادميّةٌ بلا `use client`**: كانت عميليّةً لأنّ مدخلَ `@phosphor-icons/react` يبني
 * `IconContext` بـ`createContext` فلا يُستورَد في مكوّنٍ خادميّ (سقطت بـ٥٠٠ عند أوّل فتح)،
 * ثمّ سقطت أيقوناتُها مع الهيئتين المُعدَمتين فسقطت معها العلّة.
 */
export const metadata = { title: "فقاعة محادثة ديبو" };

type Turn = { role: "user" | "assistant"; text: string };

/** حوارٌ حقيقيُّ الطول: سؤالٌ قصير، وجوابٌ بطول ما تقوله الشخصيّة («جملتان أو ثلاث»). */
const TURNS: Turn[] = [
  { role: "user", text: "ما نادي أديب؟" },
  {
    role: "assistant",
    text: "نادي أديب نادٍ ثقافيٌّ إبداعيٌّ في جامعة الملك فيصل بالأحساء، تحت مظلّة عمادة شؤون الطلاب. نلتقي حول الكتابة والقراءة والفنون، ولنا فعاليّاتٌ وأمسياتٌ ومكتبةٌ وإذاعة.",
  },
  { role: "user", text: "وهل أحضر فعاليّاتكم بلا عضويّة؟" },
  {
    role: "assistant",
    text: "نعم، أكثرُ فعاليّاتنا مفتوحةٌ للجميع ولا تشترط العضويّة. والعضويّةُ تعنيك إن أردت أن تعمل معنا لا أن تحضر وحسب.",
  },
  { role: "user", text: "كم عدد أعضائكم اليوم؟" },
  {
    role: "assistant",
    text: "هذا ما لا أعرفه، ولا أحبّ أن أخمّن. يمكنك سؤال الإدارة عبر صفحة التواصل.",
  },
];

/* `img` لا `next/image`: ملفٌّ ثابتٌ مضغوطٌ في `public` بمقاسٍ معلومٍ من المِعمل، فلا شيءَ
   يزيده المحسّنُ غير طبقة. وهو عُرفُ المستودع (٣١ موضعًا، منها أفتارُ اللوحة). */
const Face = ({ mood }: { mood: Mood }) => (
  <img className="dch-av" src={moodSrc(mood)} alt={MOOD_ALT[mood]} width={40} height={40} />
);

function Talk({ waiting }: { waiting?: boolean }) {
  return (
    <ul className="dch">
      {TURNS.map((t, i) => (
        <li key={i} className="dch-turn" data-who={t.role}>
          {t.role === "assistant" ? <Face mood={moodFor(t.text)} /> : null}
          <span className="dch-who">
            <b>{t.role === "user" ? "أنت" : "ديبو"}</b>
          </span>
          <p className="dch-say">{t.text}</p>
        </li>
      ))}
      {waiting ? (
        <li className="dch-turn" data-who="assistant">
          <Face mood="thinking" />
          <span className="dch-who"><b>ديبو</b></span>
          <p className="dch-say">
            <span className="dch-wait" role="status" aria-label="ديبو يكتب"><i /><i /><i /></span>
          </p>
        </li>
      ) : null}
    </ul>
  );
}

const MOODS: [Mood, string][] = [
  ["waving", "قبل أن يُسأل"],
  ["thinking", "وهو يكتب"],
  ["explaining", "جوابٌ عاديّ"],
  ["sorry", "لا أعرف"],
  ["unsure", "جوابٌ لم يصل"],
];

function Sec({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-6">
      <h2 className="mb-2 font-display text-2xl font-black text-content">{title}</h2>
      <p className="mb-6 max-w-[70ch] text-sm leading-7 text-content-muted">{note}</p>
      {children}
    </section>
  );
}

export default function DeeboBubblePage() {
  return (
    <main className="py-16">
      <Container className="max-w-3xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Deebo</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">فقاعة محادثة ديبو</h1>
        <p className="mt-2 max-w-[70ch] text-content-muted">
          جوابُ ديبو سطحُ شفقٍ في مبدإ السطر، وسؤالُ الزائر كبسولةٌ فولاذيّةٌ في منتهاه،
          والركنُ الأقربُ إلى قائله يصغر: ذيلٌ بلا رسم ذيل.
        </p>

        <div className="mt-14 space-y-16">
          <Sec
            title="المحادثة"
            note="حوارٌ تامّ: سؤالٌ قصير، وجوابٌ بطول ما تقوله الشخصيّة، وجملةُ «لا أعرف» التي تُستعمل عشرات المرّات يوميًّا."
          >
            <Talk />
          </Sec>
          <Sec
            title="الانتظار"
            note="قبل أن يصل أوّلُ حرف: نبضةٌ داخل الفقاعة لا نقاطٌ مكان النصّ، فتقع الفقاعةُ في موضعها من أوّل لحظة ولا تقفز الصفحة. وهي تسكن لمن طلب تقليل الحركة."
          >
            <Talk waiting />
          </Sec>
          <Sec
            title="الوجوه وحالاتها"
            note="خمسةُ وجوهٍ للجواب: الوجهُ واقعةٌ تُقرأ لا زينةٌ تدور، فلا يتبدّل إلّا لسبب. ووجوهُ التحيّة ثمانيةٌ أخرى تحملها صدورُها، جردُها في ui/deebo-greeting. والكتالوجُ كلُّه lib/deebo/mood وحدَه."
          >
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {MOODS.map(([mood, when]) => (
                <li key={mood} className="flex flex-col items-start gap-2">
                  <img
                    src={moodSrc(mood)}
                    alt={MOOD_ALT[mood]}
                    width={96}
                    height={96}
                    className="dch-hero dch-hero-sm"
                  />
                  <b className="text-sm text-content">{when}</b>
                  <span className="font-latin text-xs text-content-muted" dir="ltr">{mood}</span>
                </li>
              ))}
            </ul>
          </Sec>
        </div>
      </Container>
    </main>
  );
}
