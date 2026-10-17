import type { GameFacts, Noun } from "./data";

const nf = (n: number) => n.toLocaleString("en-US");

/** تمييزُ العدد: الواحدُ مفرد، ومن ٣ إلى ١٠ جمع، وما فوقها مفردٌ منصوب (والاثنان جمعٌ هنا تجوّزًا). */
const noun = (k: number, n: Noun) => {
  if (k === 1) return n.one;
  const t = k % 100;
  return k === 2 || (t >= 3 && t <= 10) ? n.few : n.many;
};

/** **أرقامُ اللعبة**: العددُ كبيرًا بخطّ الأرقام ثمّ معدودُه. */
export function Facts({ facts }: { facts: GameFacts }) {
  return (
    <span className="gmr-facts">
      {facts.map((f) => (
        <span key={f.noun.many} className="gmr-fact">
          <b>{nf(f.value)}{f.suffix ?? ""}</b>
          {noun(f.value, f.noun)}
        </span>
      ))}
    </span>
  );
}
