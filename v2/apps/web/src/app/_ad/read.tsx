"use client";

/**
 * **قالبُ «القراءة» في الموقع العامّ** (٢٠٢٦-١١-١٥، القالبُ الثاني بعد «الفهرس»): صفحةُ الشيء الواحد — الفعاليّة، والكتاب، وصفحةُ العضو.
 * مصدرُه **صدرُ الخبر المعتمد** (`news/[slug]`، «الشُّرفةُ المقلوبة» ٢٠٢٦-١٠-١٤) و**لوحُ الفهرس** معًا، فمن قرأ خبرًا أو تصفّح فهرسًا
 * يعرف هذه الصفحة: **لسانُ العودة** فوق اللوح يمينًا (قرارُ المالك ٢٠٢٦-١٠-١٥: فعلٌ كاملٌ بلون اللوح، وإلى الفهرس لا إلى «الخلف» —
 * أكثرُ الداخلين من واتساب)، ثمّ **اللوحُ بمادّته** (`.ad-plate`) يقول الهويّة وحدها: الشاراتُ والعنوانُ والحقائقُ برموزها في مربّعاتها
 * الزجاجيّة (قطعةُ الفهرس نفسُها)، ثمّ **ما يتدلّى منه**: الغلافُ وأوّلُ ما في المتن، كما تتدلّى شبكةُ الفهرس.
 *
 * **واللوحُ لوحُ الفهرس بمادّته** (`.ad-plate`): جُرّب لوحُ الخبر (بلا شبكة، والنقشُ في القاع) فرُدّ (محمد ٢٠٢٦-١١-١٥: «أرجعها كما هي»).
 * **وما يتدلّى هيكلُ الفعاليّة الذي اعتمده** (محمد ٢٠٢٦-١١-١٥: «الهيكلُ السابق ممتازٌ… صُمّم لحالة الفعاليّات»، فرُدّ إليه بعد أن جُرّب
 * غلافٌ في الوسط كالخبر): الملصقُ القائمُ عمودٌ بجانب المتن على السعة (ملصقاتُ القصّة 9:16 — الغلافُ العريضُ يقصّها)، والمتنُ أقسامٌ
 * تتدلّى معه من اللوح؛ وعلى الجوّال المتنُ أوّلًا ثمّ الملصق. والغلافُ يُكبَّر بالعارض نفسِه الذي في الخبر.
 *
 * **والصفحةُ منطقةُ الثنائيّ** (`DuotoneZone`) كغرف البوّابة: قطعُ الهويّة فيها (رموزُ الملاحظة، وفعلُ السطر، والحقول) بوزنها في البوّابة
 * نفسِه — خارجَ المنطقة كانت تُرسم بوزن الاستثناء. وسهمُ العودة وحده يبقى استثناءً (`GlyphZone`) كما في الخبر.
 */
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Lightbox } from "@adeeb/design-system";
import { ArrowRight, DuotoneZone, GlyphZone, X } from "@/app/_components/glyphs";

/** حقيقةٌ في اللوح: رمزٌ وكلمة كسطر «بريشة» في الخبر، و`href` رابطٌ — خارجيٌّ يُفتح في نافذة (الخريطة)، وداخليٌّ (`/…`) في الصفحة نفسها (فعاليّةُ الخبر) */
export type PubReadFact = { icon: ReactNode; text: string; href?: string };

export function PubRead({ back, tags, title, dek, facts, cover, onCover, side, aside, hero, toc, flat, children }: {
  /** لسانُ العودة. **والمعاينةُ بلا لسان** (محمد ٢٠٢٦-١١-١٦): في نموذج البوّابة لا فهرسَ يُعاد إليه، ونقرُه كان يغادر النموذجَ بما فيه */
  back?: { href: string; label: string };
  /** شاراتُ الرأس: `AdBadge glass` (النوع، والحال) — وفي اللوح بمقاس شارة الخبر وثوبها */
  tags?: ReactNode;
  title: string;
  dek?: string;
  facts?: PubReadFact[];
  /** الغلافُ القائم (ملصقاتُ القصّة 9:16): عمودٌ بجانب المتن على السعة، وبعده على الجوّال */
  cover?: { src: string; alt: string } | null;
  /** **الغلافُ فعل** (صفحةُ الكتاب: يفتح الكتيّب) بدل تكبيره في العارض — واسمُه للقارئ الآليّ */
  onCover?: { label: string; run: () => void };
  /** **ما تحت الغلاف** على السعة (عن الفعاليّة، ٢٠٢٦-١١-١٦): يقعد تحت الملصق في عموده. وصاحبُه يضعه في المتن أيضًا لضيّق الشاشة،
   *  فتُظهر الشاشةُ إحدى النسختين (`.ad-pr-side > .ad-pr-about`) */
  aside?: ReactNode;
  /** **عمودٌ جانبيٌّ يملؤه صاحبُه** بدل الملصق (صفحةُ الكتيّب: الكتيّبُ مجسَّمًا يتدلّى من اللوح). على الضيّق **يسبق المتن** لا يتبعه:
   *  هو بطلُ الصفحة وبابُ القراءة، لا ملصقٌ يُكبَّر لمن أراده */
  side?: ReactNode;
  /**
   * **الغلافُ العريض** (صفحةُ الخبر، ٢٠٢٦-١١-١٧): صورُ الأخبار عريضةٌ (16:9) لا ملصقاتٌ قائمة، فتتدلّى من اللوح بعرض المتن كلِّه — «الشُّرفةُ
   * المقلوبة» التي صدر عنها هذا القالب — ونسبتُها إلى عدستها حبّةٌ في قاعها، وتُكبَّر بالعارض نفسِه
   */
  /** لا شيءَ يتدلّى (خبرٌ بلا غلاف): المتنُ تحت اللوح لا عليه — وإلّا ركب أوّلُ لوحِ فصلٍ لوحَ الصدر */
  flat?: boolean;
  hero?: { src: string; alt: string; credit?: string | null; creditIcon?: ReactNode; /** يفتح عارضَ صاحبه (الغلافُ أوّلُ صور الخبر) بدل عارضه وحده */ onOpen?: () => void } | null;
  /** **فهرسٌ ملازمٌ في العمود الجانبيّ** (فصولُ الخبر): يلزم أعلى الشاشة وهو يُقرأ، ولا يُعرض على الضيّق — هناك المتنُ نفسُه الفهرس */
  toc?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <DuotoneZone>
    <article className="ad-pr" data-cover={cover || side || toc ? "" : undefined} data-hero={hero ? "" : undefined} data-flat={flat ? "" : undefined}>
      {back ? (
        <nav className="ad-pr-back" aria-label="مسار الصفحة">
          <Link href={back.href}><GlyphZone><ArrowRight aria-hidden /></GlyphZone>{back.label}</Link>
        </nav>
      ) : null}
      <header className="ad-plate ad-pr-plate">
        {tags ? <div className="ad-pr-tags">{tags}</div> : null}
        <h1 className="ad-pr-title">{title}</h1>
        {dek ? <p className="ad-pr-dek">{dek}</p> : null}
        {facts && facts.length ? (
          <ul className="ad-pr-facts">
            {facts.map((f) => (
              <li key={f.text}>
                {/* رمزُ الحقيقة في زجاج اللوح كحقائق لوح الفهرس (`.ad-pi-fic`) — كان عاريًا هنا وحده (محمد ٢٠٢٦-١١-١٦) */}
                <span className="ad-pi-fic" aria-hidden>{f.icon}</span>
                {f.href && f.href.startsWith("/") ? (
                  <Link className="ad-pr-link" href={f.href}>{f.text}</Link>
                ) : f.href ? (
                  <a className="ad-pr-link" href={f.href} target="_blank" rel="noopener noreferrer">{f.text}<span className="ad-sr">، يُفتح في نافذةٍ جديدة</span></a>
                ) : <span>{f.text}</span>}
              </li>
            ))}
          </ul>
        ) : null}
      </header>
      <div className="ad-pr-body">
        {hero ? (
          <figure className="ad-pr-hero">
            <button type="button" className="ad-pr-zoom" onClick={() => (hero.onOpen ? hero.onOpen() : setOpen(0))} aria-label={`كبّر ${hero.alt}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- أغلفةٌ من مخازن شتّى */}
              <img src={hero.src} alt={hero.alt} />
            </button>
            {hero.credit ? <figcaption className="ad-pr-credit">{hero.creditIcon}<span>عدسة {hero.credit}</span></figcaption> : null}
            {hero.onOpen ? null : <Lightbox shots={[{ src: hero.src, alt: hero.alt, by: hero.credit ?? undefined }]} index={open} onClose={() => setOpen(null)} onIndex={setOpen}
              emptyBy={hero.alt} byIcon={hero.creditIcon} closeIcon={<X aria-hidden />} />}
          </figure>
        ) : null}
        {toc ? <div className="ad-pr-side" data-toc>{toc}</div> : null}
        {side && !cover && !toc ? <div className="ad-pr-side" data-lead>{side}</div> : null}
        {cover ? (
          <div className="ad-pr-side">
            <figure className="ad-pr-cover">
              <button type="button" className="ad-pr-zoom" onClick={() => (onCover ? onCover.run() : setOpen(0))} aria-label={onCover ? onCover.label : `كبّر ${cover.alt}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- أغلفةٌ من مخازن شتّى */}
                <img src={cover.src} alt={cover.alt} />
              </button>
              {onCover ? null : <Lightbox shots={[{ src: cover.src, alt: cover.alt }]} index={open} onClose={() => setOpen(null)} onIndex={setOpen} emptyBy={cover.alt} closeIcon={<X aria-hidden />} />}
            </figure>
            {aside}
          </div>
        ) : null}
        <div className="ad-pr-main">{children}</div>
      </div>
    </article>
    </DuotoneZone>
  );
}
