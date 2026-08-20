"use client";

/**
 * محادثةُ ديبو — الشاشةُ الوحيدة، يستعملها الموضعان (صفحةُ `/deebo` والفقاعة).
 *
 * **فقاعةُ الرسالة نزلت ٢٠٢٦-٠٨-١٩**: كانت موسومةً `data-needs` وعاريةً بحكم ق١ لأنّ
 * شكلَها قرارٌ بصريٌّ يُعرَض ولا يُشرَح، فعُرضت ثلاثةُ اتّجاهاتٍ في `/ui` واختار المالك
 * **«الفقاعتين»** وأُعدم أخواها. والأنماطُ كلُّها من المكتبة (`.dch-*` في `components.css`)،
 * ولا سطرَ تنسيقٍ شاردٌ ههنا.
 *
 * وأمّا ما له مكوّنٌ في المكتبة (الحقل · الزرّ · التنبيه) فيُستعمل كما هو.
 */

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Field } from "@adeeb/design-system";
import { ChatCircleDots, PaperPlaneRight, Sparkle } from "@phosphor-icons/react";
import { TurnstileWidget } from "@/app/_components/Turnstile";
import { SUGGESTED_QUESTIONS } from "@/lib/deebo/persona";
import { MOOD_ALT, moodFor, moodSrc } from "@/lib/deebo/mood";
import { useDeebo } from "@/lib/deebo/useDeebo";

export function DeeboChat({ siteKey }: { siteKey: string | null }) {
  const [token, setToken] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const { turns, busy, error, greeting, shielded, failures, send } = useDeebo(token);
  // الدرعُ قائمٌ ولا رمزَ بعد: إمّا لم يصل، وإمّا **انتهى أجلُه** (٣٠٠ث) فأُبطل صامتًا.
  const waitingShield = !!siteKey && shielded && !token;
  const endRef = useRef<HTMLLIElement>(null);

  // يتبع الجوابَ وهو يُكتب. آخرُ عنصرٍ لا آخرُ الصفحة، فلا يقفز المُدخَل تحت الإبهام.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns]);


  const submit = () => {
    if (!draft.trim() || busy || waitingShield) return;
    send(draft);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-6">
      {turns.length === 0 ? (
        <div className="flex flex-col gap-4">
          {/* التحيّةُ وجهٌ ونصّ: الشخصيّةُ تُرى كبيرةً مرّةً واحدةً هنا، ثمّ تصغر أفتارًا
              بجوار كلّ جواب. ولوّح `waving` تحيّةٌ لا حالة (`lib/deebo/mood`). */}
          <img className="dch-hero" src={moodSrc("waving")} alt={MOOD_ALT.waving} width={160} height={160} />
          <p className="text-lg text-content">{greeting}</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <Button key={q} size="sm" variant="ghost" onClick={() => send(q)} disabled={busy || waitingShield}>
                {q}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <ul className="dch">
          {turns.map((t, i) => (
            <li key={i} className="dch-turn" data-who={t.role}>
              {t.role === "assistant" && (() => {
                const mood = moodFor(t.content, t.streaming);
                return <img className="dch-av" src={moodSrc(mood)} alt={MOOD_ALT[mood]} width={40} height={40} />;
              })()}
              <span className="dch-who">
                <b>{t.role === "user" ? "أنت" : "ديبو"}</b>
              </span>
              {/* الانتظارُ نبضةٌ داخل الفقاعة لا نقاطٌ مكان النصّ: الفقاعةُ تقع في موضعها
                  من أوّل لحظة، فلا تقفز الصفحةُ حين يصل أوّلُ حرف. */}
              <p className="dch-say">
                {t.content || (t.streaming ? (
                  <span className="dch-wait" role="status" aria-label="ديبو يكتب">
                    <i /><i /><i />
                  </span>
                ) : null)}
              </p>
            </li>
          ))}
          {/* مرساةُ التمرير عنصرُ قائمةٍ لا `div`: ابنُ `ul` لا يكون إلّا `li` (صحّةُ الوسم). */}
          <li ref={endRef} aria-hidden="true" />
        </ul>
      )}

      {error && <Alert tone="danger" title="تعذّر">{error}</Alert>}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field
            label="اسأل ديبو"
            icon={<ChatCircleDots />}
            innerIcon={<Sparkle />}
            placeholder="اكتب سؤالك عن النادي"
            value={draft}
            maxLength={600}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
        </div>
        <Button
          onClick={submit}
          loading={busy}
          disabled={!draft.trim() || waitingShield}
          aria-label="أرسل"
        >
          <PaperPlaneRight />
        </Button>
      </div>

      {/* الدرعُ يبقى ما دام المِنفذُ يطلبه (`shielded`) لا ما دامت الشاشةُ فارغة: أوّلُ دورٍ
          يُضاف قبل أن يصل معرّفُ المحادثة، فنزعُها عنده يترك الصفحةَ بلا مُصدِرِ رمز. */}
      {siteKey && shielded && (
        /* **كلُّ سقطةٍ تُتبَع برمزٍ جديدٍ في موضعه**: الرمزُ يُستهلك مرّةً، والمحاولةُ الفاشلة
           تحرقه أو تكشف أنّ أجلَه انقضى. وإعادةُ الضبط تُبطل القديم وتطلب غيره، فلا يبقى
           الزائرُ أمام رسالةٍ تقول له «حدّث الصفحة» — وهي حيلةٌ تُقدَّم إرشادًا.
           والعدّادُ يأتي من الخطّاف مباشرةً، فلا أثرَ يراقب الخطأ ويضبط حالةً عنده. */
        <TurnstileWidget siteKey={siteKey} onToken={setToken} resetSignal={failures} />
      )}

      {/* الزرُّ الرماديُّ بلا سببٍ يُقرأ عطبًا. والحالُ هنا لحظةٌ في العادة: الدرعُ خفيٌّ
          (`interaction-only`) ورمزُه يجري بلا أن يُرى، فالسطرُ يظهر ويذهب. */}
      {waitingShield && (
        <p className="text-sm text-content-muted" role="status">
          لحظة، نتحقّق أنّك لست روبوتًا.
        </p>
      )}

      <p className="text-sm text-content-muted">
        ديبو مساعدٌ آليّ، ومحادثتك تُعالَج لدى مزوّدٍ خارجيّ. لا تكتب فيها ما لا تحبّ أن يُقرأ.
      </p>
    </div>
  );
}
