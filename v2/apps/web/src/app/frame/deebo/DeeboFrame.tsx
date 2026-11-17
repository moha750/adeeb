"use client";

import { useRef, useState } from "react";
import { DeeboScreen } from "@/app/deebo/DeeboScreen";
import { probePersona } from "@/app/dashboard/deebo/persona/actions";
import type { DeeboStageDraft } from "@/app/_ad/rooms/DeeboPersonaRoom";
import { clubHour } from "@/lib/dates";
import { pickGreeting } from "@/lib/deebo/greeting";
import type { Turn } from "@/lib/deebo/useDeebo";
import { useStageDraft } from "../useStageDraft";

const lines = (v: string) => v.split("\n").map((l) => l.trim()).filter(Boolean);

/**
 * **ديبو كما يراه الزائر، بالطبع الذي يُكتب**: ترحيبُه وأسئلتُه المقترحةُ من المسوّدة (بعددها المختار)، وكلُّ سؤالٍ يُسأل بالمسوّدة.
 * والسؤالُ يُسأل **وحده** كما يسأل «جرّبه» القديم (`probePersona` لا يحمل ما قبله): المعاينةُ تختبر الطبعَ في جوابٍ، لا ذاكرةَ المحادثة.
 */
export function DeeboFrame() {
  const draft = useStageDraft<DeeboStageDraft>("deebo");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  // الجوابُ الذي أُوقف قبل وصوله لا يُكتب حين يصل
  const ticket = useRef(0);
  if (!draft) return null;
  const greeting = pickGreeting({ seed: draft.seed, hour: clubHour(), name: draft.name });
  const questions = lines(draft.persona.suggestedQuestions).slice(0, Math.max(0, draft.persona.shownQuestions));

  const send = async (q: string) => {
    const mine = ++ticket.current;
    setError(null);
    setBusy(true);
    setTurns((t) => [...t, { role: "user", content: q }, { role: "assistant", content: "", streaming: true }]);
    // نداءٌ سقط في الطريق (الشبكة، نشرٌ جديد) يُقال كما يُقال جوابٌ مردود، ولا يبقى المعاينةُ عالقةً على نبضة الانتظار
    const r = await probePersona(draft.persona, q).catch(() => ({ ok: false as const, message: "تعذّر الوصول إلى ديبو. أعد المحاولة." }));
    if (mine !== ticket.current) return;
    setBusy(false);
    if (r.ok) setTurns((t) => [...t.slice(0, -1), { role: "assistant", content: r.answer }]);
    else { setTurns((t) => t.slice(0, -1)); setError(r.message); }
  };
  const stop = () => { ticket.current++; setBusy(false); setTurns((t) => (t.at(-1)?.streaming ? t.slice(0, -1) : t)); };
  const reset = () => { ticket.current++; setBusy(false); setError(null); setTurns([]); };

  return (
    <div className="dchs-shell ad-dframe">
      <DeeboScreen turns={turns} greeting={greeting} busy={busy} error={error} draft={text} onDraft={setText}
        onSend={send} onStop={stop} onReset={reset} questions={questions} unknownAnswer={draft.persona.unknownAnswer} />
    </div>
  );
}
