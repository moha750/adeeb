"use client";

import { useEffect, useRef } from "react";
import { Trophy } from "@phosphor-icons/react";
import { PRIZE } from "./bits";
import type { Winner } from "./Board";
import { confetti } from "@/lib/confetti";

/**
 * **احتفاءٌ بالفائز حين يدخل** (طلبُ المالك ٢٠٢٦-٠٩-٢٧: «عند دخول أحد الثلاثة الفائزين تظهر قصاصاتٌ
 * شريطيّة بمناسبة الفوز وتبريك»). قصاصاتٌ تنطلق من الزاويتين السفليّتين ثمّ تمطر من الأعلى، بين مربّعاتٍ
 * تتقلّب وأشرطةٍ ملتوية، بألوان اللعبة: أخضرُ البدلة، وذهبُ الأوسمة، وليلكيُّ كوب oos، وحبرُ القمر.
 *
 * ترسمها لوحةٌ واحدةٌ خلف بطاقة التبريك، وتنطفئ وحدَها بعد ثوانٍ. ومن طلب في جهازه تقليلَ الحركة يرى
 * البطاقةَ بلا قصاصات. والتبريكُ بلا تذكيرٍ ولا تأنيث، فاسمُ اللاعب مستعارٌ لا يُعرف منه صاحبه.
 */

const RANK: Record<number, string> = { 1: "المركز الأوّل", 2: "المركز الثاني", 3: "المركز الثالث" };
/** ألوانُ القصاصات من رموز الهويّة نفسِها (`.drb` في `components.css`)، فلا يُكتب لونٌ هنا. */
const TOKENS = ["--drb-suit", "--drb-suit-lit", "--drb-gold", "--drb-oos", "--drb-moon"];

export function Celebrate({ win, onClose, onWinners }: { win: Winner; onClose: () => void; onWinners: () => void }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  /* الإغلاقُ من مرجعٍ لا من الاعتماديّات: الأبُ يمرّر دالّةً جديدةً في كلّ رسم، فلا تُعاد القصاصاتُ معه */
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);

  useEffect(() => {
    btn.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close.current(); };
    addEventListener("keydown", esc);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stop = cv.current && !still ? confetti(cv.current, TOKENS) : () => {};
    return () => { stop(); removeEventListener("keydown", esc); };
  }, []);

  return (
    <div className="drba-cel" role="dialog" aria-modal="true" aria-labelledby="drb-cel-t">
      <canvas ref={cv} className="drba-cel-fx" aria-hidden="true" />
      <div className="drba-card drba-cel-card" data-tone="gold">
        <span className="drba-cel-ic" aria-hidden="true">
          <Trophy />
        </span>
        <p className="drba-eyebrow">مسابقة «دربك خضر»</p>
        <h2 id="drb-cel-t" className="drba-big">مبروك الفوز!</h2>
        <p className="drba-lead">
          «{win.name}»، {RANK[win.rank]} بين كلّ من لعب.
        </p>
        <p>
          والجائزةُ {PRIZE[win.rank]} رصيدًا في محفظة مقهى oos. نتواصل معك عبر بيانات حسابك لتسليمها.
        </p>
        <button ref={btn} type="button" className="drba-btn" data-kind="gold" data-wide="" onClick={onWinners}>
          عرض الفائزين
        </button>
        <button type="button" className="drba-btn" data-kind="ghost" data-wide="" onClick={onClose}>
          إغلاق
        </button>
      </div>
    </div>
  );
}
