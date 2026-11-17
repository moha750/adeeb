/* eslint-disable @next/next/no-img-element */
/**
 * **صناديقُ الرئيسية** (مختبر ٢٠٢٦-١١-٠٧) — من المرجع الذي اختاره محمد بعد عرض المراجع («الصناديق بروح المجلّة»): تركيبُه لا ألوانُه.
 * كلُّ معلومةٍ صندوقٌ بحجم أهمّيّتها، بمادّتي الهويّة (اللوحُ لما هو لك، والورقُ لما هو مفتوحٌ لك، والأخضرُ للشهادة الجاهزة)، وأرقامٌ
 * كبيرةٌ بخطّ Lyon، وديبو في صندوقين لا أكثر. **وللصفحة حدٌّ ثابت**: ثلاثةُ صفوفٍ على المكتب أيًّا كان ما عندك (`data-n` عددُ ما في
 * صفّ «ما ينتظرك» من ٠ إلى ٣، ولكلّ عددٍ ترتيبُه فلا يبقى في الشبكة ثقب). والجوّالُ ترتيبٌ مستقلٌّ بعمودين لا انهيارٌ إلى عمود.
 */
import type { ReactNode } from "react";

export type BentoN = 0 | 1 | 2 | 3;
export type BentoArea = "hello" | "card" | "w1" | "w2" | "w3" | "journey" | "explore";

export function AdBento({ n, children }: { n: BentoN; children: ReactNode }) {
  return <div className="ad-bento" data-n={n}>{children}</div>;
}

/** صندوقُ التحيّة: التحيّةُ ويومُك صغيرين، والخلاصةُ عنوانًا كبيرًا، وديبو في طرفه بحال الساعة */
export function AdHelloTile({ hi, date, title, deebo }: { hi: string; date?: string; title: string; deebo: string }) {
  return (
    <section className="ad-tile ad-tile-hello" data-area="hello" aria-labelledby="ad-room-title">
      <p className="ad-tile-eyebrow">{hi}{date ? <span>{date}</span> : null}</p>
      <h1 id="ad-room-title" className="ad-tile-hello-h">{title}</h1>
      <img className="ad-tile-deebo" src={`/deebo/${deebo}.webp`} alt="" aria-hidden />
    </section>
  );
}

/** صندوقُ البطاقة: أكبرُ صندوق، وهي التي ستُحمَّل في المحفظة يومًا (محمد ٢٠٢٦-١١-٠٧) */
export function AdCardTile({ children }: { children: ReactNode }) {
  return <div className="ad-tile ad-tile-card" data-area="card">{children}</div>;
}

export type AdThing = {
  key: string; tone: "mine" | "ok" | "open"; icon: ReactNode; k: string; title: string; meta?: string[];
  date?: { big: ReactNode; small: string }; act?: ReactNode; deebo?: string;
};

/** صندوقُ شيءٍ ينتظرك أو مفتوحٍ لك: تسميتُه ويومُه في رأسه، ثمّ اسمُه، ثمّ وقتُه، وفعلُه في قاعه */
export function AdThingTile({ area, thing }: { area: BentoArea; thing: AdThing }) {
  return (
    <article className={thing.tone === "mine" ? "ad-tile ad-plate ad-tile-thing" : "ad-tile ad-tile-thing"} data-area={area} data-tone={thing.tone}>
      <div className="ad-tile-top">
        <span className="ad-tile-k">{thing.icon}{thing.k}</span>
        {thing.date ? <span className="ad-tile-date"><b>{thing.date.big}</b><small>{thing.date.small}</small></span> : null}
      </div>
      <h2 className="ad-tile-title">{thing.title}</h2>
      {thing.meta?.length ? <p className="ad-tile-meta">{thing.meta.map((m) => <span key={m}>{m}</span>)}</p> : null}
      {thing.act ? <div className="ad-tile-act">{thing.act}</div> : null}
      {thing.deebo ? <img className="ad-tile-deebo" src={`/deebo/${thing.deebo}.webp`} alt="" aria-hidden /> : null}
    </article>
  );
}

/** صندوقُ رحلتك: أرقامُك كبيرةً بخيوطٍ بينها، وإن كانت كلُّها صفرًا فجملةٌ لا أصفار */
export function AdJourneyTile({ icon, figs, empty }: {
  icon: ReactNode; figs: { label: string; value: string; note?: string }[]; empty?: string;
}) {
  return (
    <section className="ad-tile ad-tile-journey" data-area="journey" aria-label="رحلتك">
      <span className="ad-tile-k">{icon}رحلتك</span>
      {empty ? <p className="ad-tile-title">{empty}</p> : (
        <dl className="ad-tile-figs">
          {figs.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd className="ad-num">{f.value}</dd>
              {f.note ? <dd className="ad-tile-note">{f.note}</dd> : null}
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** حاويةُ صندوقٍ يملؤه مكوّنٌ من لغة الغرف (قسمُ «فرصٌ تناسب رغباتك» بسطوره) */
export function AdWrapTile({ area, children }: { area: BentoArea; children: ReactNode }) {
  return <div className="ad-tile-wrap" data-area={area}>{children}</div>;
}

/** دعوةُ الصديق: قطعةٌ من اللوح، وديبو صاحبُ الفكرة في طرفها */
export function AdInviteTile({ title, sub, action }: { title: string; sub: string; action: ReactNode }) {
  return (
    <section className="ad-tile ad-plate ad-tile-invite" data-area="explore" aria-label={title}>
      <h2 className="ad-tile-title">{title}</h2>
      <p className="ad-tile-meta"><span>{sub}</span></p>
      <div className="ad-tile-act">{action}</div>
      <img className="ad-tile-deebo" src="/deebo/idea.webp" alt="" aria-hidden />
    </section>
  );
}
