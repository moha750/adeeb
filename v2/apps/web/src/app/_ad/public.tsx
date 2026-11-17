"use client";

/**
 * **قالبُ «الفهرس» في الموقع العامّ** (٢٠٢٦-١١-١٥، القالبُ الأوّل من أربعة: إقناع، وفهرس، وقراءة، وأداة). مصدرُه ما اعتمده محمد
 * في صفحة الأخبار (٢٠٢٦-١٠-١٤) — **«الشُّرفة المقلوبة»**: لوحٌ من مادّة الهويّة يقول اسمَ المجموعة وحقائقَها، والشبكةُ **تتدلّى منه**
 * كما يتدلّى الغلافُ في المقال؛ و**«الغلافُ الزجاجيّ»**: الصورةُ هي الكرت، والكلامُ على لوحٍ زجاجيٍّ منقوشٍ في قاعها. وترويسةُ
 * الأخبار إحدى الشاشات الخمس التي تقول «هذا أدِيب» (`DESIGN.md` §١)، فصارت لغةَ كلّ فهرسٍ عامّ.
 *
 * والفرقُ عن نسختها الأولى: مادّتُها **اللوحُ نفسُه** (`.ad-plate`: التدرّج والشبكة والنقش، كرأس الغرفة والشريط) لا تدرّجٌ مسطّح،
 * وقيمُها كلُّها رموز (`--ad-*`) فيصلح للوضعين، و**المرشّحُ في اللوح** حبّاتٍ من ضوءٍ على اللوح («المختارُ من المادّة الأخرى»:
 * على اللوح ضوء، كبند الشريط النشط) — كانت شرائحَ كحليّةً بيضاءَ فوق الشبكة بلغةٍ ثالثة.
 */
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { ArrowSquareOut, CaretDown, CaretUp, DuotoneZone, Eye } from "@/app/_components/glyphs";
import { AdBadge, AdButton, AdEmpty, AdFilterMenu } from "./primitives";

export type PubFact = { icon: ReactNode; text: string };

/** الصفحة: اللوحُ وما يتدلّى منه. `dateLine` سطرُ الصحيفة بين خطّين (الأخبار)، و`chips` مرشّحُ المجموعة في قاع اللوح. */
export function PubIndex({ title, deck, dateLine, facts, chips, children }: {
  title: string; deck?: string; dateLine?: string[]; facts?: PubFact[]; chips?: ReactNode; children: ReactNode;
}) {
  // منطقةُ الثنائيّ كغرف البوّابة وقالب «القراءة»: قطعُ الهويّة بوزنها في البوّابة نفسِه (٢٠٢٦-١١-١٥)
  return (
    <DuotoneZone>
    <div className="ad-pi">
      <header className="ad-plate ad-pi-mast">
        {dateLine && dateLine.length ? (
          <p className="ad-pi-date"><span>{dateLine.map((d) => <span key={d}>{d}</span>)}</span></p>
        ) : null}
        <h1 className="ad-pi-title">{title}</h1>
        {deck ? <p className="ad-pi-deck">{deck}</p> : null}
        {/* الحقائقُ والمرشّحُ كتلةٌ واحدةٌ بعرض أعرضهما: فالمرشّحُ الطويلُ (القائمة) بطول سطر الحقائق فوقه (محمد ٢٠٢٦-١١-١٥) */}
        {(facts && facts.length) || chips ? (
          <div className="ad-pi-tools">
            {facts && facts.length ? (
              <ul className="ad-pi-facts">
                {facts.map((f) => <li key={f.text}><span className="ad-pi-fic" aria-hidden>{f.icon}</span>{f.text}</li>)}
              </ul>
            ) : null}
            {chips}
          </div>
        ) : null}
      </header>
      <div className="ad-pi-hang">{children}</div>
    </div>
    </DuotoneZone>
  );
}

/**
 * **المرشّحُ في اللوح**: يظهر متى كان في المجموعة نوعان فأكثر — **نبني للمستقبل لا لعدد اليوم** (محمد ٢٠٢٦-١١-١٥). والطولُ يحكم
 * الشكل بقطعتَي الهويّة (`DESIGN.md`، المرشّح): **القصيرُ حبّات** — زجاجٌ على اللوح والمختارةُ ضوءٌ كبند الشريط النشط، أزرارُ ضغطٍ
 * في مجموعة؛ **والطويلُ (فوق خمسة خيارات) زرُّ المرشّح نفسُه** (`AdFilterMenu`: «الجهة ▾» وقائمتُه المنبثقة، ومختارًا اسمُه وقيمتُه
 * و✕) بثوبٍ زجاجيّ — كانت الحبّاتُ السبعُ خمسةَ أسطرٍ في الجوّال. والعددُ يحكم لا المقاس. `value` فارغٌ = الكلّ.
 */
export function PubChips({ label, items, value, onChange, total }: {
  label: string; items: { key: string; label: string; count?: number }[]; value: string; onChange: (k: string) => void; total?: number;
}) {
  if (items.length < 2) return null;
  if (items.length > 5) {
    return (
      <div className="ad-pi-filter">
        <AdFilterMenu f={{ key: label, label, value, options: items.map((it) => ({ value: it.key, label: it.label })), onChange }} />
      </div>
    );
  }
  const all = [{ key: "", label: "الكلّ", count: total }, ...items];
  return (
    // أزرارُ ضغطٍ في مجموعة (`aria-pressed`) كأجزاء المبدّل — لا `radiogroup` بلا أسهم (المراجع ٢٠٢٦-١١-١٥)
    <div className="ad-pi-chips" role="group" aria-label={label}>
      {all.map((it) => (
        <button key={it.key || "all"} type="button" aria-pressed={it.key === value} className="ad-pi-chip" onClick={() => onChange(it.key)}>
          {it.label}
          {it.count != null ? <span className="ad-num">{it.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** الشبكة: كروتٌ بعرضٍ واحد، والصفُّ الأخيرُ الناقصُ بعرض أعمدته. `book` لغلافٍ قائمٍ بنسبة الكتاب (المكتبة). */
export function PubGrid({ shape, children }: { shape?: "book"; children: ReactNode }) {
  return <div className="ad-pi-grid" data-shape={shape}>{children}</div>;
}

/** حجمُ الدفعة: ثلاثةُ صفوفٍ بثلاثة أعمدة (محمد ٢٠٢٦-١١-١٥: «أفضّل ثلاثة صفوف») */
export const PUB_STEP = 9;

/**
 * **«عرض المزيد» و«عرض أقلّ»** تحت الشبكة (محمد ٢٠٢٦-١١-١٥: نبني للمستقبل): الأوّلُ يضيف دفعةً ويقول كم بقي، فإذا ظهر الكلُّ صار
 * الثاني يعيدها إلى الدفعة الأولى **ويُرجع القارئَ إلى رأس الفهرس** — وإلّا تقلّصت الشبكةُ من تحته فوجد نفسه في التذييل.
 * ولا يظهر شيءٌ حين تكفي الدفعةُ الأولى.
 */
export function PubMore({ shown, total, onMore, onLess }: { shown: number; total: number; onMore: () => void; onLess: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  if (total <= PUB_STEP) return null;
  const less = () => {
    const top = box.current?.closest(".ad-pi");
    onLess();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    top?.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
  };
  return (
    <div ref={box} className="ad-pi-next">
      {shown < total ? (
        <AdButton icon={<CaretDown />} iconEnd onClick={onMore}>عرض المزيد، بقي {total - shown}</AdButton>
      ) : (
        <AdButton icon={<CaretUp />} iconEnd onClick={less}>عرض أقلّ</AdButton>
      )}
    </div>
  );
}

/** ما لا شيء فيه: «القطعة» نفسُها (فراغُ البوّابة) على ورقةٍ تتدلّى من اللوح كما تتدلّى الشبكة */
export function PubEmpty({ icon, title, desc }: { icon: ReactNode; title: string; desc?: string }) {
  return <div className="ad-pi-empty"><AdEmpty icon={icon} title={title} desc={desc} /></div>;
}

/**
 * **الكرت: «الغلافُ الزجاجيّ»** — الصورةُ هي الكرت، وفي رأسها حبّةُ النوع (و`mark` حالٌ بنغمتها: «مكتمل»، «الأحدث»)، وفي قاعها
 * لوحٌ زجاجيٌّ منقوش: الحقائقُ برموزها، ثمّ العنوانُ في سطرين محجوزين (فتبدأ الألواحُ من ارتفاعٍ واحد)، ثمّ سطورٌ برموزها.
 * ويُفتح رابطًا داخليًّا، أو خارجيًّا (`external`)، أو زرًّا (`onOpen`: عارضُ الصورة)، أو لا يُفتح (بلا `href`). وما يفعله الكرتُ
 * سطرٌ في قاعه باسمه («فتح العمل»، «عرض الصورة») — رمزٌ صغيرٌ بجانب العنوان لم يكن واضحًا (محمد ٢٠٢٦-١١-١٥).
 */
export function PubCard({ href, external, onOpen, cover, placeholder, tag, mark, facts, title, lines, eager }: {
  href?: string; external?: boolean; onOpen?: () => void;
  /** الغلافُ زينةٌ (`alt=""`): اسمُ الكرت عنوانُه المكتوب فيه، فلا يُقرأ مرّتين */
  cover: string | null; placeholder: ReactNode;
  tag?: ReactNode; mark?: { text: string; tone: "warn" | "info" }; facts?: PubFact[];
  title: string;
  /** سطرُ القاع برموزه — المكانُ ثمّ ما بقي من المقاعد (يلتفّ، ولكلٍّ قصُّه) */
  lines?: PubFact[]; eager?: boolean;
}) {
  const body = (
    <>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- أغلفةٌ من مخازن شتّى (Supabase، روابطُ خارجيّة)
        <img src={cover} alt="" loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} referrerPolicy="no-referrer" />
      ) : <span className="ad-pi-ph" aria-hidden>{placeholder}</span>}
      {tag || mark ? (
        <span className="ad-pi-tags">
          {tag ? <AdBadge glass>{tag}</AdBadge> : null}
          {mark ? <AdBadge glass tone={mark.tone === "warn" ? "warn" : "neutral"}>{mark.text}</AdBadge> : null}
        </span>
      ) : null}
      {/* ما يفعله الكرتُ إن لم يكن صفحةً داخليّة: مربّعُ الأيقونة الزجاجيّ (علامةُ الشريط على اللوح) في الركن المقابل للشارات —
          ↗ رابطٌ خارجيّ، والعينُ عارضُ الصورة. كان سطرًا «فتح العمل» في قاع اللوح فثقُل (محمد ٢٠٢٦-١١-١٥: «غير جميل بصريًّا أبدًا») */}
      {external || onOpen ? <span className="ad-pi-go" aria-hidden>{external ? <ArrowSquareOut /> : <Eye />}</span> : null}
      <span className="ad-pi-panel">
        {facts && facts.length ? (
          <span className="ad-pi-cfacts">{facts.map((f) => <span key={f.text}>{f.icon}{f.text}</span>)}</span>
        ) : null}
        <b className="ad-pi-ctitle">{title}{external ? <span className="ad-sr">، يُفتح في نافذةٍ جديدة</span> : null}</b>
        {lines && lines.length ? (
          <span className="ad-pi-lines">{lines.map((l) => <span key={l.text} className="ad-pi-line" title={l.text}>{l.icon}<span>{l.text}</span></span>)}</span>
        ) : null}
      </span>
    </>
  );
  if (onOpen) return <button type="button" className="ad-pi-card" onClick={onOpen}>{body}</button>;
  // كرتٌ لا يُفتح (فعاليّةٌ مضت: صفحتُها تعرض الحجز حتى ينتقل قالبُ «القراءة») — يُرى ولا يُنقر
  if (!href) return <div className="ad-pi-card" data-static="">{body}</div>;
  if (external && href) return <a className="ad-pi-card" href={href} target="_blank" rel="noopener noreferrer">{body}</a>;
  return <Link className="ad-pi-card" href={href ?? "#"}>{body}</Link>;
}
