"use client";

/**
 * **الفهارسُ العامّة على قالب «الفهرس»** (٢٠٢٦-١١-١٥، `_ad/public.tsx`؛ اعتمده محمد: «إذًا اعتمدها»): الفعاليّات، والمكتبة، وأعمالنا،
 * والأخبارُ التي وُلد منها القالب — نُقلت إليه كي لا تختلف تفاصيلُ الأربع (لاحظ محمد: «التشابهُ في الفكرة، لكن هناك تفاصيلُ غير موجودة في الاثنين»). السلوكُ سلوكُ
 * صفحاتها القديمة حرفًا — البياناتُ نفسُها من قارئها (الخادمُ يجلب ويمرّر)، والمرشّحُ نفسُه (المكتبةُ بالنوع حين يكون أكثرَ من نوع،
 * والأعمالُ بالتصنيف، والفعاليّاتُ بالنوع أُضيف بالحدّ نفسِه)، والوجهةُ نفسُها (تفاصيلُ الفعاليّة، قارئُ الكتاب، رابطُ العمل أو عارضُه).
 *
 * والفرقُ في الشكل: كانت كلُّ صفحةٍ بعنوانٍ وسطيٍّ («LandingHeading») وشبكةِ كروتٍ بلغةٍ تخصّها (كرتُ الهويّة القديم للفعاليّات،
 * وغلافٌ فوق ورقةٍ للمكتبة والأعمال) وشرائحَ كحليّةٍ بيضاء — ثلاثُ صفحاتٍ بثلاث لغات. صارت لغةً واحدة: لوحٌ يتدلّى منه غلافٌ زجاجيّ.
 */
import { useMemo, useState } from "react";
import { BookOpen, Books, CalendarBlank, CalendarDots, Clock, ClockCounterClockwise, Feather, Images, MapPin, Newspaper, Palette, Ticket, Users } from "@phosphor-icons/react";
import { Eye, Star } from "@/app/_components/glyphs";
import { AR_SEAT, AR_NEWS, AR_READ_MIN, AR_VIEW } from "@/lib/arabicCount";
import { newsHref } from "@/lib/news/link";
import { bylineOf } from "@/lib/news/byline";
import { CATEGORY_META } from "@/app/dashboard/news/vocab";
import type { PublicNews } from "@/app/news/data";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { AUDIENCE_LABEL, TYPE_META, type ActivityType } from "@/lib/activities";
import { toLatinDigits } from "@adeeb/core/digits";
import type { PublicActivity } from "@/app/activities/data";
import type { ShelfBook } from "@/app/library/shelf";
import { WorkLightbox, type Work } from "@/app/_components/WorkLightbox";
import { AdGroupTitle } from "../primitives";
import { PUB_STEP, PubCard, PubChips, PubMore, PubEmpty, PubGrid, PubIndex } from "../public";

const AR_EVENT_SOON: ArForms = ["فعاليّةٌ قادمة", "فعاليّتان قادمتان", "فعاليّات قادمة", "فعاليّةً قادمة"];
const AR_BOOK: ArForms = ["منشورٌ واحد", "منشوران", "منشورات", "منشورًا"];
const AR_WORK: ArForms = ["عملٌ واحد", "عملان", "أعمال", "عملًا"];
const AR_KIND: ArForms = ["نوعٌ واحد", "نوعان", "أنواع", "نوعًا"];
const AR_CAT: ArForms = ["تصنيفٌ واحد", "تصنيفان", "تصنيفات", "تصنيفًا"];

/** المرشّحُ ومجموعاتُه — `on` فارغٌ = الكلّ. ويظهر متى كان في المجموعة نوعان فأكثر (`PubChips`)، فنبني للمستقبل لا لعدد اليوم */
function useFilter<T>(items: T[], keyOf: (x: T) => string | null) {
  const [on, setOn] = useState<string>("");
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of items) { const k = keyOf(x); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
    return m;
    // `keyOf` ثابتٌ لكلّ صفحة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);
  const all = on ? items.filter((x) => keyOf(x) === on) : items;
  // «عرض المزيد» (محمد ٢٠٢٦-١١-١٥): دفعةٌ بعد دفعة، بعد المرشّح لا قبله. والعدُّ موسومٌ بمرشّحه، فتغييرُ المرشّح يعيده لأوّل دفعة
  const [page, setPage] = useState({ of: on, n: PUB_STEP });
  const n = page.of === on ? page.n : PUB_STEP;
  return { on, setOn, counts, shown: all.slice(0, n), total: all.length, more: () => setPage({ of: on, n: n + PUB_STEP }), less: () => setPage({ of: on, n: PUB_STEP }) };
}

/* ═══ الفعاليّات ═══ */

/** المقاعد كما قالها الكرتُ القديم: للجميع بلا عدد، أو الباقي مشتركًا، أو للرجال والنساء كلٌّ بعدده */
function seatsLine(a: PublicActivity): string | null {
  if (a.full) return null;
  // «للجميع» كانت تناقض حبّةَ «للنساء» على فعاليّةٍ موجَّهة (المراجع): فالمفتوحُ بلا عدد يقول ذلك وحدَه
  if (a.unlimited) return a.targetGender ? "التسجيلُ مفتوحٌ بلا عدد" : "التسجيلُ متاحٌ للجميع";
  // الموجَّهةُ لجنسٍ تقول مقاعدَه وحدها (كصفحتها في قالب «القراءة») — لا «وللنساء 0» على ورشةٍ للرجال، ولا «مفتوحٌ للجنسين»
  if (a.splitByGender) {
    if (a.targetGender === "male") return `باقٍ ${arCount(a.maleRemaining ?? 0, AR_SEAT)}`;
    if (a.targetGender === "female") return `باقٍ ${arCount(a.femaleRemaining ?? 0, AR_SEAT)}`;
    return `باقٍ للرجال ${a.maleRemaining ?? 0}، وللنساء ${a.femaleRemaining ?? 0}`;
  }
  return a.targetGender ? `باقٍ ${arCount(a.totalRemaining ?? 0, AR_SEAT)}` : `باقٍ ${arCount(a.totalRemaining ?? 0, AR_SEAT)}، مفتوحٌ للجنسين`;
}

/**
 * **وما مضى تحت القادمة** (محمد ٢٠٢٦-١١-١٥: «نعم ابنيها»): الصفحةُ بلا قادمةٍ كانت فارغةً كأنّ النادي متوقّف. آخرُ ستٍّ مضت
 * بشارة «انتهت»، وتُفتح صفحتُها على قالب «القراءة» فتُقرأ ولا تُحجز (٢٠٢٦-١١-١٥).
 */
export function ActivitiesIndex({ items, past = [] }: { items: PublicActivity[]; past?: PublicActivity[] }) {
  const f = useFilter(items, (a) => a.type);
  const types = [...f.counts.keys()];
  const next = items[0];
  return (
    <PubIndex title="أنشطةٌ قادمة" deck="من أدِيب إليك، برامجُ مقاعدُها بانتظارك."
      facts={items.length ? [
        { icon: <CalendarDots />, text: arCount(items.length, AR_EVENT_SOON) },
        ...(next ? [{ icon: <CalendarBlank />, text: `أقربُها ${next.dateLabel}` }] : []),
      ] : undefined}
      chips={<PubChips label="نوع الفعاليّة" value={f.on} onChange={f.setOn} total={items.length}
        items={types.map((t) => ({ key: t, label: TYPE_META[t as ActivityType].label, count: f.counts.get(t) }))} />}>
      {items.length === 0 ? (
        <PubEmpty icon={<CalendarDots />} title="لا فعاليّات قادمة الآن" desc="تابعنا لتصلك الجديدة." />
      ) : (
        <>
        <PubGrid>
          {f.shown.map((a, k) => (
            <PubCard key={a.id} href={`/activities/${a.id}`} cover={a.cover} placeholder={<Ticket />} eager={k === 0}
              // النوعُ وجمهورُه معًا في حبّة النوع («ورشة للنساء»)، فلا يُسقط «مكتمل» الجمهورَ كما كان يُسقطه (المراجع)
              tag={a.targetGender ? `${TYPE_META[a.type].label} ${AUDIENCE_LABEL[a.targetGender]}` : TYPE_META[a.type].label}
              // «مكتملة» هادئةٌ كشارة صفحة الفعاليّة (محمد ٢٠٢٦-١١-١٦: الذهبيُّ «غير جميل أبدًا») — الامتلاءُ نجاحٌ لا تحذير
              mark={a.full ? { text: "مكتملة", tone: "info" } : undefined}
              facts={[{ icon: <CalendarBlank />, text: a.dateLabel }, ...(a.timeLabel ? [{ icon: <Clock />, text: a.timeLabel }] : [])]}
              title={a.name}
              lines={[...(a.location ? [{ icon: <MapPin />, text: a.location }] : []), ...(seatsLine(a) ? [{ icon: <Users />, text: seatsLine(a)! }] : [])]} />
          ))}
        </PubGrid>
        <PubMore shown={f.shown.length} total={f.total} onMore={f.more} onLess={f.less} />
        </>
      )}
      {past.length ? (
        <section className="ad-pi-more" aria-label="فعاليّاتٌ مضت">
          <AdGroupTitle icon={<ClockCounterClockwise />}>فعاليّاتٌ مضت</AdGroupTitle>
          <PubGrid>
            {past.map((a) => (
              <PubCard key={a.id} href={`/activities/${a.id}`} cover={a.cover} placeholder={<Ticket />}
                tag={a.targetGender ? `${TYPE_META[a.type].label} ${AUDIENCE_LABEL[a.targetGender]}` : TYPE_META[a.type].label}
                mark={{ text: "انتهت", tone: "info" }}
                facts={[{ icon: <CalendarBlank />, text: a.dateLabel }]}
                title={a.name} lines={a.location ? [{ icon: <MapPin />, text: a.location }] : undefined} />
            ))}
          </PubGrid>
        </section>
      ) : null}
    </PubIndex>
  );
}

/* ═══ المكتبة ═══ */

export function LibraryIndex({ books, error }: { books: ShelfBook[]; error?: string | null }) {
  const f = useFilter(books, (b) => b.kind);
  const kinds = [...f.counts.keys()];
  return (
    <PubIndex title="إرثٌ يُروى" deck="حصادُ أدِيب عامًا بعد عام، مكتوبًا بأقلام صُنّاعه."
      facts={books.length ? [
        { icon: <Books />, text: arCount(books.length, AR_BOOK) },
        ...(kinds.length > 1 ? [{ icon: <BookOpen />, text: arCount(kinds.length, AR_KIND) }] : []),
      ] : undefined}
      chips={<PubChips label="نوع المنشور" value={f.on} onChange={f.setOn} total={books.length}
        items={kinds.map((k) => ({ key: k, label: books.find((b) => b.kind === k)!.kindLabel, count: f.counts.get(k) }))} />}>
      {error ? (
        <PubEmpty icon={<Books />} title="تعذّر جلب المكتبة" desc={error} />
      ) : books.length === 0 ? (
        <PubEmpty icon={<Books />} title="لا منشورات في المكتبة بعد" />
      ) : (
        <>
        <PubGrid shape="book">
          {f.shown.map((b, k) => (
            <PubCard key={b.id} href={`/library/${b.slug}`} cover={b.coverUrl} placeholder={<BookOpen />} eager={k === 0}
              tag={b.kindLabel} mark={b.isFeatured ? { text: "الأحدث", tone: "info" } : undefined}
              facts={b.yearLabel ? [{ icon: <CalendarBlank />, text: b.yearLabel }] : undefined}
              title={b.title} />
          ))}
        </PubGrid>
        <PubMore shown={f.shown.length} total={f.total} onMore={f.more} onLess={f.less} />
        </>
      )}
    </PubIndex>
  );
}

/* ═══ أعمالنا ═══ */

export function WorksIndex({ works, error }: { works: Work[]; error?: string | null }) {
  const f = useFilter(works, (w) => w.category);
  const cats = [...f.counts.keys()];
  const [box, setBox] = useState<Work | null>(null);
  return (
    <PubIndex title="كلُّ الأعمال" deck="لمحاتٌ من أعمال أدِيب، وفي كلّ لمحةٍ أثر."
      facts={works.length ? [
        { icon: <Images />, text: arCount(works.length, AR_WORK) },
        ...(cats.length > 1 ? [{ icon: <Palette />, text: arCount(cats.length, AR_CAT) }] : []),
      ] : undefined}
      chips={<PubChips label="التصنيف" value={f.on} onChange={f.setOn} total={works.length}
        items={cats.map((c) => ({ key: c, label: toLatinDigits(c), count: f.counts.get(c) }))} />}>
      {error ? (
        <PubEmpty icon={<Images />} title="تعذّر جلب الأعمال" desc={error} />
      ) : works.length === 0 ? (
        <PubEmpty icon={<Images />} title="لا توجد أعمالٌ منشورةٌ بعد" />
      ) : (
        <>
        <PubGrid>
          {f.shown.map((w, k) => (
            <PubCard key={w.id} cover={w.image_url} placeholder={<Images />} eager={k === 0}
              tag={w.category ? toLatinDigits(w.category) : undefined} title={toLatinDigits(w.title)}
              // ما يفعله الكرتُ سطرٌ باسمه في قاعه — رمزٌ بجانب العنوان «هل هذا واضح؟» (محمد ٢٠٢٦-١١-١٥): لا
              {...(w.link_url ? { href: w.link_url, external: true } : { onOpen: () => setBox(w) })} />
          ))}
        </PubGrid>
        <PubMore shown={f.shown.length} total={f.total} onMore={f.more} onLess={f.less} />
        </>
      )}
      <WorkLightbox work={box} onClose={() => setBox(null)} />
    </PubIndex>
  );
}

/* ═══ الأخبار ═══ */

/**
 * **آخرُ الأخبار** — ترويستُها التي وُلد منها القالب (المالك ٢٠٢٦-١٠-١٤) بتفاصيلها كلّها: سطرُ الصحيفة (اليومُ بالميلاديّ والهجريّ)،
 * وأرقامُ النشرة (الأخبار، والمميّزة، والمشاهدات)، والكرتُ الزجاجيّ (الفئةُ حبّةً والمميّزُ نجمتُها، والتاريخُ ومدّةُ القراءة، والعنوان،
 * و«بريشة»). ومرشّحُ الفئة كأخواتها (نبني للمستقبل): يظهر متى كانت فيها فئتان.
 */
export function NewsIndex({ items, dateLine }: { items: PublicNews[]; dateLine: string[] }) {
  const f = useFilter(items, (n) => n.category);
  const cats = [...f.counts.keys()];
  const featured = items.filter((n) => n.featured).length;
  const views = items.reduce((t, n) => t + n.views, 0);
  return (
    <PubIndex title="آخر الأخبار" deck={"مستجدّاتُ النادي أوّلًا\u00a0بأوّل من منصّته الإعلاميّة."} dateLine={dateLine}
      facts={[
        { icon: <Newspaper />, text: arCount(items.length, AR_NEWS) },
        ...(featured ? [{ icon: <Star />, text: `${featured} مميّزة` }] : []),
        { icon: <Eye />, text: arCount(views, AR_VIEW) },
      ]}
      chips={<PubChips label="الفئة" value={f.on} onChange={f.setOn} total={items.length}
        items={cats.map((c) => ({ key: c, label: CATEGORY_META[c as PublicNews["category"]].label, count: f.counts.get(c) }))} />}>
      {items.length === 0 ? (
        <PubEmpty icon={<Newspaper />} title="لا أخبار منشورة بعد" desc="تابعنا لتصلك الجديدة." />
      ) : (
        <>
        <PubGrid>
          {f.shown.map((n, k) => {
            const by = bylineOf(n.authors);
            return (
              <PubCard key={n.id} href={newsHref(n)} cover={n.cover} placeholder={<Newspaper />} eager={k === 0}
                tag={n.featured ? <><Star aria-hidden />{CATEGORY_META[n.category].featured}</> : CATEGORY_META[n.category].label}
                facts={[...(n.dateLabel ? [{ icon: <CalendarBlank />, text: n.dateLabel }] : []), { icon: <Clock />, text: arCount(n.readMinutes, AR_READ_MIN) }]}
                title={n.title} lines={by ? [{ icon: <Feather />, text: by }] : undefined} />
            );
          })}
        </PubGrid>
        <PubMore shown={f.shown.length} total={f.total} onMore={f.more} onLess={f.less} />
        </>
      )}
    </PubIndex>
  );
}
