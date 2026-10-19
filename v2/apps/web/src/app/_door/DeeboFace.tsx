"use client";

import { useEffect, useState } from "react";
import { setDeeboMood, useDeeboMood, type DeeboMood } from "@/lib/deeboMood";
import { greetNow } from "@/lib/timeGreeting";

/**
 * **ديبو بطلُ الباب** — يعيش اللحظةَ مع صاحبها (قرار المالك ٢٠٢٦-١٠-١٨): يحيّي، ويُصغي وأنت
 * تكتب بريدك (أو يكتبه بريشته في صفحة الإنشاء)، ويُغمض عينيه عند كلمة المرور، ويفكّر وأنت تنتظر،
 * ويعتذر حين يتعثّر شيء، ويحتفل حين تدخل.
 *
 * الوجوهُ كلُّها مكدَّسةٌ يظهر منها واحد: تُحمَّل مرّةً ويتبدّل الوجهُ بلا وميض. وهي من مجموعة
 * البطل (`/deebo/hero/`، 1024px) لأنّه يقف بطولِ الشاشة — `scripts/deebo-art.mjs --hero`.
 */
export type Door = "login" | "signup" | "forgot" | "reset";

const BASE: Record<DeeboMood, string> = {
  idle: "waving", email: "listening-carefully", password: "meditating", busy: "thinking",
  wait: "waiting", error: "sorry", none: "unsure", success: "celebrating",
};
const OWN: Record<Door, Partial<Record<DeeboMood, string>>> = {
  login: {},
  signup: { idle: "welcome", email: "writing", success: "congratulations" },
  forgot: { idle: "thinking", success: "thumbs-up" },
  reset: { idle: "idea", success: "thumbs-up" },
};

export function DeeboFace({ door }: { door: Door }) {
  const mood = useDeeboMood();
  useEffect(() => setDeeboMood("idle"), []);
  const faces = { ...BASE, ...OWN[door] };
  const shown = faces[mood];
  return (
    <div className="door-deebo">
      {[...new Set(Object.values(faces))].map((f) => (
        <img key={f} src={`/deebo/hero/${f}.webp`} alt="" className={f === shown ? "is-on" : undefined} />
      ))}
      <DeeboReact />
    </div>
  );
}

/** تحيّةُ الساعة بعد التركيب — من مصدرها الواحد مع رئيسيّة البوّابة (`lib/timeGreeting.ts`). */
export function useGreeting(): string | null {
  const [greet, setGreet] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- ساعةُ القارئ بعد الترطيب
  useEffect(() => setGreet(greetNow()), []);
  return greet;
}

/** **ردُّ ديبو الصغير** في فقاعةٍ فوق رأسه — زينةٌ تُرافق الوجه؛ والأخطاءُ الحقيقيّة في تنبيهات الخطوة. */
const REACT: Partial<Record<DeeboMood, string>> = {
  password: "لن أنظر!",
  busy: "لحظة…",
  wait: "بانتظارك…",
  none: "لم أجد لك حسابًا",
  error: "عذرًا!",
  success: "أهلًا بك!",
};

export function DeeboReact() {
  const mood = useDeeboMood();
  const say = REACT[mood];
  return say ? <span key={say} className="door-react">{say}</span> : null;
}
