"use client";

/**
 * محادثةُ ديبو الحيّة — **وصلٌ لا رسم**: الخطّافُ يتكلّم (`useDeebo`) والشاشةُ ترسم
 * (`DeeboScreen`)، وهذا الملفّ يجمعهما ويملك الدرعَ والمسوّدةَ وسِجلَّ المحادثات.
 *
 * وكان الرسمُ ههنا كلَّه، فلمّا عُرضت هيئاتُ الشاشة للاختيار خرج إلى `DeeboScreen` —
 * فالمعرِضُ يرى المكوّنَ الحيَّ نفسَه بحوارٍ مكتوب، لا نسخةً تشبهه. واعتُمدت **الغرفة**
 * ٢٠٢٦-٠٨-٢٠ وأُعدمت أختاها، فلم تبقَ خاصّيةُ `shape` بلا جلدٍ ثانٍ.
 *
 * **والسِّجلُّ لصاحب الحساب وحده** (إذنُ المالك ٢٠٢٦-٠٨-٢٠): محادثاتُه في القاعدة يقرؤها
 * ويحذفها بجلسته (RLS)، ومن لا حسابَ له تبقى محادثتُه في جهازه ولا سِجلَّ له عندنا.
 * **والحذفُ حذفٌ من كلّ مكان** (كلمتُه في اليوم نفسه): لا تبقى في غرفة اللوحة.
 */

import { useState } from "react";
import { TurnstileWidget } from "@/app/_components/Turnstile";
import { clubHour } from "@/lib/dates";
import { nextSeed, pickGreeting } from "@/lib/deebo/greeting";
import { useDeebo } from "@/lib/deebo/useDeebo";
import { DeeboScreen } from "./DeeboScreen";
import { deleteMyConversation, listMyConversations, openMyConversation, type ConversationRow, type ConversationTurn } from "./actions";

export function DeeboChat({
  siteKey,
  signedIn = false,
  initialConversations = null,
  initialTalk = null,
  greetingSeed,
  greetingHour,
  viewerName = null,
}: {
  siteKey: string | null;
  /** له حساب؟ فسجلُّه في القاعدة، وذاكرةُ الجهاز لا تُستعمل له. */
  signedIn?: boolean;
  initialConversations?: ConversationRow[] | null;
  /** محادثةٌ يفتحها الخادمُ من `?c=` (العودةُ من صفحة المحادثات). */
  initialTalk?: { id: string; turns: ConversationTurn[] } | null;
  /** بذرةُ قرعة التحيّة وساعتُها : من الخادم كي يتطابق رسمُه ورسمُ المتصفّح. */
  greetingSeed: number;
  greetingHour: number;
  /** الاسمُ الأوّل لصاحب الجلسة، أو `null` للزائر المجهول. */
  viewerName?: string | null;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  /* **تحيّةٌ لا تتكرّر** (طلبُ المالك ٢٠٢٦-٠٨-٢٠: «يرحّب بك بشكلٍ مختلف في كلّ مرّة»):
     القرعةُ الأولى من الخادم، ثمّ تُدار في كلّ «محادثةٍ جديدة» ببذرةٍ مضمونة الاختلاف.
     والساعةُ تُقرأ عند الإدارة لا مرّةً واحدةً: جلسةٌ تطول قد تعبر منتصف الليل. */
  const [greet, setGreet] = useState({ seed: greetingSeed, hour: greetingHour });
  const [conversations, setConversations] = useState<ConversationRow[] | null>(initialConversations);
  const [openId, setOpenId] = useState<string | null>(initialTalk?.id ?? null);
  /** تُنعش القائمةَ من الخادم — مصدرُها هو، فلا تُخمَّن في الشاشة. */
  const refresh = async () => {
    if (!signedIn) return;
    setConversations(await listMyConversations());
  };

  // الذاكرةُ المحلّيّة لمن لا حسابَ له وحده (قرارُ المالك): سِجلُّ صاحب الحساب في القاعدة.
  // **والإنعاشُ عند استقرار الجواب لا بمؤقّتٍ يُخمَّن**: العنوانُ والعدّادُ يُكتبان بعد
  // إغلاق البثّ، فمهلةٌ مقدَّرةٌ تسبقهما أحيانًا فيرى صاحبُها درجًا فارغًا وقد تكلّم.
  const { turns, busy, error, shielded, failures, send, stop, reset, adopt } = useDeebo(
    token,
    !signedIn,
    () => void refresh(),
    initialTalk,
  );
  // الدرعُ قائمٌ ولا رمزَ بعد: إمّا لم يصل، وإمّا **انتهى أجلُه** (٣٠٠ث) فأُبطل صامتًا.
  const waitingShield = !!siteKey && shielded && !token;

  return (
    <DeeboScreen
      turns={turns}
      greeting={pickGreeting({ seed: greet.seed, hour: greet.hour, name: viewerName })}
      busy={busy}
      error={error}
      blocked={waitingShield}
      draft={draft}
      onDraft={setDraft}
      onSend={send}
      onStop={stop}
      onReset={() => {
        reset();
        setDraft("");
        setOpenId(null);
        setGreet((g) => ({ seed: nextSeed(g.seed), hour: clubHour() }));
        void refresh();
      }}
      conversations={conversations}
      onOpenDrawer={() => void refresh()}
      openId={openId}
      onOpenConversation={async (id) => {
        const talk = await openMyConversation(id);
        if (!talk) return;
        adopt(id, talk);
        setOpenId(id);
      }}
      onDeleteConversation={async (id) => {
        const res = await deleteMyConversation(id);
        if (!res.ok) return;
        // المحذوفةُ إن كانت المفتوحةَ فالشاشةُ تُخلى معها: متنٌ بلا صفٍّ يسنده كذبةٌ صامتة.
        if (id === openId) {
          reset();
          setOpenId(null);
        }
        setConversations((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
      }}
      shield={
        /* الدرعُ يبقى ما دام المِنفذُ يطلبه (`shielded`) لا ما دامت الشاشةُ فارغة: أوّلُ دورٍ
           يُضاف قبل أن يصل معرّفُ المحادثة، فنزعُها عنده يترك الصفحةَ بلا مُصدِرِ رمز.

           و**كلُّ سقطةٍ تُتبَع برمزٍ جديدٍ في موضعه**: الرمزُ يُستهلك مرّةً، والمحاولةُ الفاشلة
           تحرقه أو تكشف أنّ أجلَه انقضى. وإعادةُ الضبط تُبطل القديم وتطلب غيره، فلا يبقى
           الزائرُ أمام رسالةٍ تقول له «حدّث الصفحة» — وهي حيلةٌ تُقدَّم إرشادًا. */
        siteKey && shielded ? (
          <TurnstileWidget siteKey={siteKey} onToken={setToken} resetSignal={failures} />
        ) : null
      }
    />
  );
}
