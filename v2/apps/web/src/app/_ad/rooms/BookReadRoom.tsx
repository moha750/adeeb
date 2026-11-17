"use client";

/**
 * **صفحةُ الكتيّب على قالب «القراءة»** (اعتمدها محمد ٢٠٢٦-١١-١٦): اللوحُ باسمه ووصفه وحقائقِه بمربّعاتها الزجاجيّة (الإصدار، والصفحات، والمواضيع،
 * والقراءات)، و**الكتيّبُ مجسَّمًا في العمود الجانبيّ** يتدلّى من اللوح — كعبُه وحافّةُ صفحاته وظلُّه، والنقرُ عليه يفتح الغرفة — وتحته
 * «شارك الكتيّب». وبجانبه **تنبيهُ حالِك** («اقرأ الكتيّب كاملًا»، أو «توقّفتَ عند صفحة 34»)، ثمّ **«في هذا الكتيّب»** فهرسُه مواضيعَ بأرقام
 * صفحاتها، ثمّ «من المكتبة أيضًا». وعلى الجوّال يسبق الكتيّبُ المتنَ في الوسط.
 * **والقراءةُ غرفةٌ تملأ الشاشة**: الكتابُ وحده على مسرحٍ كحليّ، وشريطُه قسائمُ بالكلمات بعرض الكتاب، وفهرسُه ورقةٌ تعلوه بمصغّرات الصفحات.
 *
 * (رُدّ قبلها: القارئُ في المتن — «تصميمُها سيّئٌ وقبيح» — ثمّ التذكرةُ والغلافُ عمودًا صغيرًا، ثمّ الكتيّبُ في وسط المتن، والمشاركةُ في ركن
 * اللوح.) والسلوكُ كما كان: المنشورُ وحده، ومنارةُ القراءة لكلّ فتح (`Reader`).
 */
import { BookOpen, BookmarkSimple, CalendarBlank, DotsThree, Files, LinkSimple, ListBullets, ShareNetwork, WhatsappLogo, XLogo } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { BookReaderPage } from "@adeeb/design-system";
import { CaretDown, CaretUp, Check, Eye, X } from "@/app/_components/glyphs";
import { DropdownMenu } from "@/app/dashboard/_components/DropdownMenu";
import { useShare } from "@/app/news/[slug]/_parts/useShare";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { AdBadge, AdButton, AdGroupTitle, AdIconButton, AdNote } from "../primitives";
import { PubCard, PubGrid } from "../public";
import { PubRead } from "../read";
import { Reader } from "@/app/library/[slug]/Reader";
import type { ShelfBook } from "@/app/library/shelf";

const AR_TOPIC: ArForms = ["موضوعٌ واحد", "موضوعان", "مواضيع", "موضوعًا"];
/** أوّلُ ما يُرى من الفهرس قبل «عرض الكلّ» */
const TOC_FIRST = 12;

export type BookView = { id: string; slug: string; title: string; summary: string | null; kindLabel: string; yearLabel: string; views: number;
  cover: string | null; pages: BookReaderPage[];
  /** الصفحاتُ المسمّاةُ أقسامُ الفهرس */
  sections: { title: string; page: number }[] };

export function BookRead({ book, others, initialPage, preview }: { book: BookView; others: ShelfBook[]; initialPage?: number;
  /** **المعاينةُ بلا لسان** (قاعدةُ محمد ٢٠٢٦-١١-١٦): منضدةُ المحرّر تعرض الكتيّب لا الطريقَ إليه، و«العودة إلى المكتبة» فيها رابطٌ لا يُمضى */
  preview?: boolean }) {
  /** غرفةُ القراءة: الصفحةُ التي تُفتح عليها، أو `null` وهي مغلقة — ورابطُ صفحةٍ بعينها (`?p=`) يفتحها عليها */
  const [room, setRoom] = useState<number | null>(initialPage ?? null);
  /** آخرُ صفحةٍ قرأها هذا المتصفّح — يُقرأ بعد البناء (لا تخزينَ على الخادم)، ويُعاد بعد إغلاق الغرفة */
  const [saved, setSaved] = useState<number | null>(null);
  const [allToc, setAllToc] = useState(false);
  const tocRef = useRef<HTMLElement>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const total = book.pages.length;

  useEffect(() => {
    if (room != null) return;
    let v: number | null = null;
    try { const n = Number(window.localStorage.getItem(`adeeb:book:${book.id}`)); v = Number.isFinite(n) && n > 1 && n < total - 1 ? n : null; } catch { v = null; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- قراءةُ تخزين المتصفّح بعد البناء (الخادمُ لا يملكه)
    setSaved(v);
  }, [room, book.id, total]);

  /* **الغرفةُ نافذةٌ غيرُ مشروطة** (`show()` لا `showModal()`) **في جسم الصفحة** (`createPortal`): النافذةُ المشروطة تصعد إلى «الطبقة العليا» فوق
     كلّ `z-index`، ومؤشّرُ أدِيب المرسوم (`.cur`، طبقة `--z-cursor`) يبقى تحتها — فكان المؤشّرُ يختفي في الغرفة كلِّها (محمد ٢٠٢٦-١١-١٦: «الماوس
     لا يظهر، ما أدري أنا أحرّك إيش»). فتُبنى مصيدتُها بأيدينا: ما سواها في الجسم `inert` (لا يُنقر ولا يُبلغ بالتبويب)، وEsc يغلقها، والتركيزُ
     يدخلها ويعود حيث كان. وفي الجسم لأنّ `position: fixed` داخل حاويةٍ (`container-type`) يُحبس فيها. */
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- الجسمُ لا يوجد على الخادم
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const d = dlg.current;
    if (!d || room == null) return;
    const back = document.activeElement as HTMLElement | null;
    if (!d.open) d.show();
    const others = [...document.body.children].filter((el): el is HTMLElement => el instanceof HTMLElement && el !== d && !el.inert);
    others.forEach((el) => { el.inert = true; });
    d.querySelector<HTMLElement>(".ad-bookroom-head button")?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.fullscreenElement) { e.preventDefault(); setRoom(null); } };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      others.forEach((el) => { el.inert = false; });
      if (d.open) d.close();
      if (document.fullscreenElement) document.exitFullscreen?.();
      back?.focus({ preventScroll: true });
    };
  }, [room, mounted]);

  const open = (at: number) => setRoom(at);

  const share = useShare(`/library/${encodeURIComponent(book.slug)}`, book.title);
  const shareItems = [
    { label: "واتساب", icon: <WhatsappLogo />, onSelect: () => window.open(share.links.whatsapp, "_blank", "noopener,noreferrer") },
    { label: "إكس", icon: <XLogo />, onSelect: () => window.open(share.links.x, "_blank", "noopener,noreferrer") },
    { label: share.copied ? "نُسخ الرابط" : "نسخ الرابط", icon: share.copied ? <Check /> : <LinkSimple />, onSelect: share.copy },
    ...(share.native ? [{ label: "عبر الجهاز", icon: <DotsThree />, onSelect: share.more }] : []),
  ];
  /* **المشاركةُ تحت الكتيّب** (محمد ٢٠٢٦-١١-١٦: في ركن اللوح «مكانُه أحمق… لم أستوعب مكانه إلّا الآن»): فعلُ الكتيّب يقعد تحت الكتيّب
     نفسِه، بعرضه وباسمه كاملًا، كما تقعد أفعالُ الفعاليّة في قاع تذكرتها */
  const bookShare = (
    <DropdownMenu ariaLabel="شارك الكتيّب" triggerClassName="ad-btn ad-btn-line ad-book-share" trigger={<><ShareNetwork aria-hidden />شارك الكتيّب</>}
      groups={[{ items: shareItems }]} />
  );
  /* **سطرُ التنبيه الوصفُ نفسُه مختصرًا** (محمد ٢٠٢٦-١١-١٦: «تحفظ مكتبةُ أدِيب في متصفّحك آخرَ صفحةٍ قرأتها» جميلٌ لكنّه مبالَغ، ورُدّ
     اسمُ الموضوع و«بقيت N صفحة» و«يحفظ متصفّحك»): «يحفظ أدِيب آخرَ صفحةٍ قرأتها.» — ودعوةُ الفتح أوّلَ مرّةٍ عنوانٌ وزرٌّ بلا شرح */
  const toc = allToc ? book.sections : book.sections.slice(0, TOC_FIRST);
  const rest = (
    <>
      {/* **حالُك مع الكتيّب تنبيهًا** كحال الحجز في الفعاليّة: من عاد يُعرض عليه أن يتابع، ومن جاء أوّلَ مرّةٍ يُدعى إلى فتحه */}
      {total === 0 ? (
        <AdNote tone="info" icon={<Files />} title="لا صفحات في هذا الكتيّب بعد" />
      ) : saved ? (
        <AdNote tone="info" icon={<BookmarkSimple />} title={`توقّفتَ عند صفحة ${saved + 1}`} action={
          <>
            <AdButton variant="soft" size="sm" icon={<BookmarkSimple />} onClick={() => open(saved)}>تابع القراءة</AdButton>
            <AdButton variant="soft" size="sm" icon={<BookOpen />} onClick={() => open(0)}>من البداية</AdButton>
          </>
        }>يحفظ أدِيب آخرَ صفحةٍ قرأتها.</AdNote>
      ) : (
        <AdNote tone="info" icon={<BookOpen />} title="اقرأ الكتيّب كاملًا" action={
          <AdButton variant="soft" size="sm" icon={<BookOpen />} onClick={() => open(0)}>افتح الكتيّب</AdButton>
        } />
      )}

      {/* **«في هذا الكتيّب»**: فهرسُه المطبوعُ مواضيعَ تُنقر فتُفتح الغرفةُ على صفحتها */}
      {book.sections.length ? (
        <section ref={tocRef} className="ad-pr-toc ad-pr-anchor">
          <AdGroupTitle icon={<ListBullets />}>في هذا الكتيّب</AdGroupTitle>
          <ol>
            {toc.map((sec) => (
              <li key={`${sec.page}-${sec.title}`}>
                <button type="button" className="ad-pr-toc-item" onClick={() => open(sec.page)}>
                  <span>{sec.title}</span><b className="ad-num">{sec.page + 1}</b>
                </button>
              </li>
            ))}
          </ol>
          {book.sections.length > TOC_FIRST ? (
            <div className="ad-pi-next">
              {/* قطعةُ «عرض المزيد» نفسُها التي تحت شبكة الأخبار (`PubMore`): الرمزُ في مربّعه آخرَ الزرّ، والعددُ ما بقي — كان زرًّا عاريًا بلا رمز
                  (محمد ٢٠٢٦-١١-١٦: «صفحة آخر الأخبار… الزرّ بالهويّة، أمّا اللي في الكتيّب فهذا زرّ إيش بالضبط؟»). و«عرض أقلّ» يعيد القارئَ إلى رأس الفهرس */}
              {allToc ? (
                <AdButton icon={<CaretUp />} iconEnd onClick={() => { setAllToc(false); tocRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }}>عرض أقلّ</AdButton>
              ) : (
                <AdButton icon={<CaretDown />} iconEnd onClick={() => setAllToc(true)}>عرض المزيد، بقي {book.sections.length - TOC_FIRST}</AdButton>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {others.length ? (
        <section className="ad-pr-more">
          <AdGroupTitle icon={<BookOpen />}>من المكتبة أيضًا</AdGroupTitle>
          <PubGrid shape="book">
            {others.slice(0, 3).map((b) => (
              <PubCard key={b.id} href={`/library/${b.slug}`} cover={b.coverUrl} placeholder={<BookOpen />} tag={b.kindLabel}
                facts={b.yearLabel ? [{ icon: <CalendarBlank />, text: b.yearLabel }] : undefined} title={b.title} />
            ))}
          </PubGrid>
        </section>
      ) : null}

      {/* **غرفةُ القراءة**: نافذةٌ تملأ الشاشة في جسم الصفحة (انظر مصيدتها أعلاه)، الكتابُ وحده على مسرحٍ كحليّ */}
      {mounted ? createPortal(
      <dialog ref={dlg} className="ad-bookroom" aria-label={book.title} aria-modal="true" onClose={() => setRoom(null)}>
        <header className="ad-bookroom-head">
          {/* «كتيّب عامٌ بألف ذكرى» لا الاسمُ وحده (محمد ٢٠٢٦-١١-١٦): الغرفةُ تملأ الشاشة فتُسمّي ما فيها */}
          <b><span className="ad-bookroom-kind">كتيّب</span> {book.title}</b>
          <AdIconButton label="أغلق الكتيّب" icon={<X />} onClick={() => setRoom(null)} />
        </header>
        {room != null ? (
          <div className="ad-bookroom-stage">
            <Reader bookId={book.id} pages={book.pages} sections={book.sections} initialPage={room} />
          </div>
        ) : null}
      </dialog>, document.body) : null}
    </>
  );

  /* **الغلافُ بطلُ الصفحة** (محمد ٢٠٢٦-١١-١٦ وافق اقتراحي: «التذكرةُ مفروضةٌ على الكتيّب… والغلافُ صغيرٌ جامد»): حقائقُه في اللوح بمربّعاتها
     الزجاجيّة كحقائق الفهرس، والغلافُ كتيّبٌ حقيقيٌّ يتدلّى من اللوح — كعبُه وحافّةُ صفحاته وظلُّه — والنقرُ عليه يفتح الغرفة */
  const plateFacts = [
    ...(book.yearLabel ? [{ icon: <CalendarBlank aria-hidden />, text: book.yearLabel }] : []),
    ...(total ? [{ icon: <Files aria-hidden />, text: `${total} صفحة` }] : []),
    ...(book.sections.length ? [{ icon: <ListBullets aria-hidden />, text: arCount(book.sections.length, AR_TOPIC) }] : []),
    { icon: <Eye aria-hidden />, text: `${book.views} قراءة` },
  ];
  const bookObj = (
    <>
      {book.cover ? (
        <button type="button" className="ad-book3d" onClick={() => open(saved ?? 0)} aria-label={`افتح ${book.title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- أغلفةٌ من مخزن المكتبة */}
          <img src={book.cover} alt="" />
        </button>
      ) : null}
      {bookShare}
    </>
  );
  return (
    <PubRead back={preview ? undefined : { href: "/library", label: "العودة إلى المكتبة" }} tags={<AdBadge glass>{book.kindLabel}</AdBadge>}
      title={book.title} dek={book.summary ?? undefined} facts={plateFacts}
      side={bookObj}>
      {rest}
    </PubRead>
  );
}
