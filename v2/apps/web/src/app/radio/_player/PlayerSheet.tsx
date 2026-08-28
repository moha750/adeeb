"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { SkipForward } from "@phosphor-icons/react";
import { CaretDown } from "@/app/_components/glyphs";
import { formatDuration } from "../../dashboard/radio/vocab";
import { PlayerControls } from "./PlayerControls";
import { ChapterList } from "./ChapterList";
import { useRadioPlayer } from "./PlayerProvider";

/**
 * **الشاشةُ الكاملة للمشغّل** — الصورةُ الثالثة، وكانت مفقودة.
 *
 * ولمَ لزمت؟ سؤالُ المالك ٢٠٢٦-٠٨-٢٨: «وين ممكن أشوف صفحة المشغل؟». وكان
 * الجوابُ أنّها لم تُبنَ: للمشغّل صورتان لا ثلاث، سطحٌ **داخل صفحة الحلقة**
 * وحدَها، وشريطٌ ملازمٌ ليس فيه إلّا زرُّ تشغيل. فمن يسمع وهو يتصفّح الفهرسَ
 * أو البحثَ لا يملك سحبَ موجةٍ ولا قفزَ عشرٍ ولا تبديلَ نسخةٍ ولا محورًا: عليه
 * أن يعود إلى صفحة الحلقة لكلّ فعل.
 *
 * وهو مقبولٌ ببرنامجٍ واحد، **ولا يُقبَل بمئة**: عندئذٍ يقضي المستمعُ عمرَه
 * بعيدًا عن صفحة ما يسمع، فيصير الشريطُ مشغّلَه الوحيد.
 *
 * ══ ولا تُعاد كتابةُ الأدوات ══
 * الشاشةُ تركّب `PlayerControls compact={false}` نفسَها التي يركّبها السطحُ
 * الداخليّ، فلا تفترقان يومًا. وما تزيده: غلافٌ كبير، وبابٌ إلى صفحة الحلقة،
 * وسطرُ «التالي»، ومَخرج.
 *
 * ══ والصوتُ لا يُمَسّ ══
 * فتحُها وإغلاقُها حالةٌ في `PlayerProvider` لا انتقالُ صفحة، فلا يتوقّف ما
 * يُسمَع ولا يُعاد تحميلُ عنصر الصوت.
 */
export function PlayerSheet() {
  const p = useRadioPlayer();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const open = p.sheetOpen && Boolean(p.current);

  /**
   * **الطبقةُ تحبس التنقّلَ وتردّه.** لوحٌ يغطّي الصفحةَ ولا يحبس البؤرةَ يترك
   * قارئَ الشاشة يتجوّل فيما تحته وهو لا يراه. و`Esc` تُغلق، والبؤرةُ تعود إلى
   * ما فُتحت منه.
   */
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    /* البؤرةُ على اللوح نفسِه لا على زرّ الإغلاق: نقلُها إلى زرٍّ يرسم حوله حلقةَ
       تركيزٍ لمن فتح باللمس، فتُقرأ خطأً لا إرشادًا. واللوحُ يستقبلها بـ-1
       فينتقل معه قارئُ الشاشة بلا حلقةٍ مرسومة. */
    closeRef.current?.focus({ preventScroll: true });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        p.setSheetOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const box = ref.current;
      if (!box) return;
      const items = [...box.querySelectorAll<HTMLElement>('button,a[href],input,[tabindex]:not([tabindex="-1"])')]
        .filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
      (opener.current as HTMLElement | null)?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !p.current) return null;
  const t = p.current;
  const next = p.queue[0] ?? null;

  return (
    <div
      className="stn-sheet stn"
      role="dialog"
      aria-modal="true"
      aria-label={`المشغّل: ${t.title}`}
      tabIndex={-1}
      ref={(el) => {
        ref.current = el;
        closeRef.current = el;
      }}
    >
      <div className="stn-full">
        <div className="stn-full-top">
          <button type="button" onClick={() => p.setSheetOpen(false)} aria-label="إغلاق المشغّل">
            <CaretDown />
          </button>
          <span className="stn-full-kick">يُسمَع الآن</span>
        </div>

        <div className="stn-full-art">
          <span className="stn-art stn-art-full" aria-hidden>
            {t.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.coverUrl} alt="" />
            ) : (
              <span className="stn-art-n">{t.showTitle.trim()[0]}</span>
            )}
          </span>
        </div>

        <h2>
          <Link
            href={`/radio/${t.showSlug}/${t.episodeSlug}`}
            onClick={() => p.setSheetOpen(false)}
            className="stn-full-t"
          >
            {t.title}
          </Link>
        </h2>
        <Link href={`/radio/${t.showSlug}`} onClick={() => p.setSheetOpen(false)} className="stn-full-s">
          {t.showTitle}
        </Link>

        <div className="stn-full-wave">
          <PlayerControls compact={false} marks={t.chapters?.map((c) => c.at)} />
        </div>

        {t.chapters?.length ? <ChapterList chapters={t.chapters} track={t} rest={p.queue} /> : null}

        {next ? (
          <button type="button" className="stn-full-next" onClick={p.playNext}>
            <span className="stn-full-next-k">التالي</span>
            <span className="stn-full-next-t">{next.title}</span>
            {next.seconds ? (
              <span className="stn-full-next-d">
                <bdi dir="ltr">{formatDuration(next.seconds)}</bdi>
              </span>
            ) : null}
            <SkipForward weight="fill" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
