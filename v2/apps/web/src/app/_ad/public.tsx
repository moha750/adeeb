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
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { AnchoredPopover } from "@adeeb/design-system";
import { ArrowSquareOut, CaretDown, CaretUp, DuotoneZone, Eye, MagnifyingGlass, X } from "@/app/_components/glyphs";
import { AdBadge, AdButton, AdEmpty, AdFilterMenu } from "./primitives";

export type PubFact = { icon: ReactNode; text: string };

/** الصفحة: اللوحُ وما يتدلّى منه. `dateLine` سطرُ الصحيفة بين خطّين (الأخبار)، و`chips` مرشّحُ المجموعة في قاع اللوح. */
export function PubIndex({ title, deck, dateLine, facts, chips, after, children }: {
  title: string; deck?: string; dateLine?: string[]; facts?: PubFact[]; chips?: ReactNode; children: ReactNode;
  /** ما يُكتب في اللوح بعد حقائقه، يفصله خيطٌ منه: المجلسُ الإداريّ في رأس «هيكلة أدِيب» (٢٠٢٦-١١-٢٢) */
  after?: ReactNode;
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
        {after ? <div className="ad-pi-after">{after}</div> : null}
      </header>
      <div className="ad-pi-hang">{children}</div>
    </div>
    </DuotoneZone>
  );
}

/** نتيجةٌ في لوحة البحث: مسارُها («الباب الرابع، المادة 58»)، واسمُها، ومقتطفُها — نصًّا لاسم الخيار، ورسمًا بكلماتٍ معلَّمة */
export type PubHit = { key: string; href: string; crumb: string; title: string; excerpt: string; rich?: { title?: ReactNode; excerpt?: ReactNode } };
export type PubHitGroup = { key: string; icon: ReactNode; title: string; count: string; hits: PubHit[] };

/**
 * **البحثُ في اللوح وقائمتُه** (`PubSearch`، «أنظمة أدِيب» ٢٠٢٦-١١-٢٢).
 *
 * **الخانةُ** خانةُ بحث الشريط الجانبيّ بمادّة اللوح (كان شريطُ أدوات البوّابة الأبيض مُقحَمًا في لوحٍ ملوّن)، **والنتائجُ قائمةٌ تنسدل منها**
 * كقوائم الحقول — ورقتُها وحدُّها وظلُّها، ورؤوسُ مجموعاتها — والصفحةُ باقيةٌ في مكانها. ولكلّ نتيجةٍ اسمُها ومسارُها في سطرٍ ومقتطفُها في
 * سطرين والكلمةُ مضيئة، وتُقاد بالأسهم وEnter وEsc.
 *
 * **ما رُدّ قبلها** (محمد ٢٠٢٦-١١-٢٢): الصفحةُ تصير أقسامًا وسطورًا («عالميًّا لا تظهر النتائج بهذه الطريقة»)، ثمّ نافذةٌ في وسط الشاشة وشاشةٌ
 * كاملةٌ في الجوّال («هذا الحجمُ والأبّهة… يوحي بأنّه انتقل إلى صفحةٍ أخرى»). **ولا تقفز الصفحة**: كانت الخانةُ تصعد إلى أعلى الشاشة مع
 * أوّل حرف لتتّسع القائمة؛ فصارت القائمةُ تأخذ ما تحت الخانة إلى قاع الشاشة المرئيّة (ومع لوحة مفاتيح الجوّال ما بقي فوقها) وتُمرَّر فيه.
 */
export function PubSearch({ value, onChange, placeholder, label, onFocus, groups, status, count }: {
  value: string; onChange: (v: string) => void; placeholder: string; label: string; onFocus?: () => void;
  /** النتائجُ مجموعةً (تُرسم في القائمة متى كُتب شيء) */
  groups?: PubHitGroup[];
  /** الحالُ جملةً («17 مادّةً في 5 وثائق»، «لا مادّةَ فيها…»، «يُحمَّل…») لقارئ الشاشة */
  status?: string;
  /** **والحالُ عددًا في طرف الخانة** بجانب ✕ («17 مادّةً»، محمد ٢٠٢٦-١١-٢٣): حيث العين وهي تكتب. كان سطرًا وحده في رأس القائمة يقعد
   *  يمينًا وما بعده فراغ، وجُرّب شريطًا في قاعها */
  count?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const flat = useMemo(() => (groups ?? []).flatMap((g) => g.hits), [groups]);
  // أوّلُ رقمٍ لكلّ مجموعة في القائمة المسطّحة (الأسهمُ تعبر المجموعات)
  const starts = useMemo(() => (groups ?? []).reduce<number[]>((o, g, k) => [...o, k ? o[k - 1] + (groups ?? [])[k - 1].hits.length : 0], []), [groups]);
  const shown = open && !!value.trim();
  const cur = flat.length ? Math.min(at, flat.length - 1) : -1;
  // **مساحةُ القائمة ما تحت الخانة إلى قاع الشاشة المرئيّة** — تُقاس مع التمرير والتحجيم ولوحة مفاتيح الجوّال (`visualViewport`)
  useEffect(() => {
    if (!shown) return;
    const fit = () => {
      const a = box.current?.getBoundingClientRect();
      const vh = window.visualViewport?.height ?? window.innerHeight;
      if (!a) return;
      // **والقائمةُ تتبع خانتها لا الشاشة** (محمد ٢٠٢٦-١١-٢٣: مرّر الصفحةَ فنزلت معه النتائجُ والخانةُ فوق): المنبثقةُ تُقصَر داخل الشاشة،
      // فإذا صعدت الخانةُ تحت رأس الموقع (أو نزلت تحت قاع الشاشة) بقيت القائمةُ معلّقةً وحدها. فتُطوى حينئذٍ، وتعود مع أوّل حرفٍ أو لمسة
      const top = document.querySelector(".shdr")?.getBoundingClientRect().bottom ?? 0;
      if (a.top < top || a.bottom > vh) { setOpen(false); return; }
      panel.current?.style.setProperty("--sp-room", `${Math.max(160, vh - a.bottom - 16)}px`);
    };
    fit();
    window.addEventListener("scroll", fit, { passive: true });
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("scroll", fit);
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, [shown, flat.length]);
  // الخيارُ المضيءُ لا يغيب عن نافذة القائمة
  useEffect(() => {
    if (!shown || cur < 0) return;
    panel.current?.querySelector<HTMLElement>(`[data-i="${cur}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cur, shown]);
  const go = (h: PubHit) => { setOpen(false); router.push(h.href); };
  return (
    <div className="ad-pi-search" ref={box}>
      <MagnifyingGlass className="ad-pi-search-ic" aria-hidden />
      <input ref={ref} type="search" className="ad-pi-search-in" value={value} placeholder={placeholder} aria-label={label} autoComplete="off"
        role="combobox" aria-expanded={shown} aria-controls={`${id}-l`} aria-autocomplete="list"
        aria-activedescendant={shown && cur >= 0 ? `${id}-${cur}` : undefined}
        onFocus={() => { onFocus?.(); if (value.trim()) setOpen(true); }}
        onClick={() => { if (value.trim()) setOpen(true); }}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setAt(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && flat.length) { e.preventDefault(); setOpen(true); setAt((cur + 1) % flat.length); }
          else if (e.key === "ArrowUp" && flat.length) { e.preventDefault(); setAt((cur - 1 + flat.length) % flat.length); }
          else if (e.key === "Enter" && shown && cur >= 0) { e.preventDefault(); go(flat[cur]); }
          else if (e.key === "Escape") { e.preventDefault(); if (shown) setOpen(false); else if (value) onChange(""); }
        }} />
      {shown && count ? <span className="ad-pi-search-n" aria-hidden>{count}</span> : null}
      {value ? (
        <button type="button" className="ad-pi-search-x" aria-label="امسح البحث" onClick={() => { onChange(""); setOpen(false); ref.current?.focus(); }}>
          <X aria-hidden />
        </button>
      ) : null}
      <AnchoredPopover open={shown} anchorRef={box} onDismiss={() => setOpen(false)} matchWidth className="ad-sp" reflowKey={`${value}:${flat.length}`}
        panelRef={(el) => { panel.current = el; }}>
        {status ? <p className="ad-sr" role="status">{status}</p> : null}
        <div className="ad-sp-list" role="listbox" id={`${id}-l`} aria-label={label}>
          {(groups ?? []).map((g, k) => (
            <div key={g.key} className="ad-sp-g" role="group" aria-label={g.title}>
              <p className="ad-sp-gh" aria-hidden><span className="ad-sp-gi">{g.icon}</span><span>{g.title}</span><span className="ad-sp-gn">{g.count}</span></p>
              {g.hits.map((h, j) => {
                const n = starts[k] + j;
                return (
                  <Link key={h.key} href={h.href} id={`${id}-${n}`} data-i={n} role="option" aria-selected={n === cur} className="ad-sp-hit"
                    aria-label={`${h.title}، ${h.crumb}: ${h.excerpt}`} onMouseMove={() => n !== cur && setAt(n)} onClick={() => setOpen(false)}>
                    <span className="ad-sp-top"><span className="ad-sp-t">{h.rich?.title ?? h.title}</span><span className="ad-sp-crumb">{h.crumb}</span></span>
                    <span className="ad-sp-x">{h.rich?.excerpt ?? h.excerpt}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </AnchoredPopover>
    </div>
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
