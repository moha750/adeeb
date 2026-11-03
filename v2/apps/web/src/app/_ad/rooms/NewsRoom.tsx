"use client";

/**
 * غرفةُ تحرير أدِيب على قالب «قائمة السجلّات» (معاينة ٢٠٢٦-١٠-٣٠) — السلوكُ سلوكُ
 * `news/NewsView.tsx` القديم: رئيسُ التحرير يرى كلّ شيء ويُنشئ ويَنشر ويُميّز ويؤرشف ويحذف، والكاتبُ
 * يرى تكاليفه. والفرقُ في الشكل: لوحٌ بمراحل الخبر، وكروتٌ بأغلفتها (والغائبُ غلافُه يقول ذلك
 * بمكانه)، وأفعالٌ ظاهرة.
 */
import type { RoomView } from "../view";
import { NEWS_ROOM } from "./meta";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Modal, Select, Button } from "@adeeb/design-system";
import { Archive, Buildings, CalendarBlank, ChatCircle, ClipboardText, Heart, ImageBroken, ImagesSquare, Newspaper, PaperPlaneTilt, PenNib, TextAlignRight } from "@phosphor-icons/react";
import { ArrowUUpLeft, Eye, EyeSlash, PencilSimple, Plus, Star, Trash, WarningCircle } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { UnitOption } from "@adeeb/core/org-unit";
import type { NewsRow } from "@/app/dashboard/news/data";
import { CATEGORY_META, CATEGORY_OPTIONS, IN_FLIGHT, WORKFLOW_META, missingForPublish, type Category } from "@/app/dashboard/news/vocab";
import { createNews, deleteNews, setNewsStatus, toggleFeatured } from "@/app/dashboard/news/actions";
import { AdActs, AdConfirm, AdBadge, AdButton, AdCard, AdRow, type AdMeta, type AdOp, type AdTone } from "../primitives";
import { AR_NEWS, AR_WORD, arCount, type ArForms } from "@/lib/arabicCount";

/** «بتحرير فلان وآخر / وآخرَين / و3 آخرين» — المعطوفُ على أوّل اسم. */
const OTHERS: ArForms = ["آخر", "آخرَين", "آخرين", "آخرَ"];
const AR_IMAGE: ArForms = ["صورةٌ واحدة", "صورتان", "صور", "صورةً"];
import { CollectionRoom, type Position } from "../collection";
import { dayParts, fmtNum, relTime } from "../format";

const TONE: Record<string, AdTone> = { success: "ok", warning: "warn", danger: "bad", info: "info", neutral: "neutral" };

const POSITIONS: Position<NewsRow>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لا خبر الآن." },
  { key: "flight", label: "قيد العمل", match: (r) => IN_FLIGHT.includes(r.workflow), empty: "لا خبر قيد العمل الآن." },
  { key: "published", label: "منشور", match: (r) => r.workflow === "published", empty: "لا خبر منشور بعد." },
  // «تنتظر المراجعة» بعد «منشور»: هي جزءٌ من «قيد العمل» (IN_FLIGHT يضمّها)، فإن ضاق المبدّل ذهبت إلى «المزيد» قبل غيرها
  { key: "review", label: "تنتظر المراجعة", match: (r) => r.workflow === "ready_for_review", empty: "لا خبر ينتظر المراجعة الآن." },
  { key: "archived", label: "مؤرشف", match: (r) => r.workflow === "archived", empty: "الأرشيف فارغ.", rare: true },
];

export function NewsRoom({ rows, units, isChief, serverNow, view }: { rows: NewsRow[]; units: UnitOption[]; isChief: boolean; serverNow: number; view?: RoomView }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<{ title: string; category: Category; unit: string } | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [kill, setKill] = useState<NewsRow | null>(null);
  const now = serverNow;

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
    });

  const submitCreate = () => {
    if (!form) return;
    if (!form.title.trim()) { setFormErr("عنوان الخبر مطلوب."); return; }
    setFormErr(null);
    start(async () => {
      const r = await createNews({ title: form.title, category: form.category, unit: form.unit });
      if (r.ok) { toast.success(r.message); setForm(null); router.refresh(); if (r.id) router.push(`/dashboard/news/${r.id}`); }
      else toast.error(r.message);
    });
  };
  const openCreate = () => { setFormErr(null); setForm({ title: "", category: "coverage", unit: "" }); };

  /** خبرٌ أعاده رئيسُ التحرير لكاتبه: شارتُه «أُعيد للتعديل» حمراء، وسببُ الإعادة سطرٌ بلونها (كان في `NewsView` «أُعيد: السبب»؛ والشارةُ تقول «أُعيد» فلا تُكرَّر). */
  const isBack = (r: NewsRow) => !!r.rejectionReason && r.workflow === "in_progress";

  /**
   * الرقاقاتُ (في الكرت والسطر معًا): القسم، ثمّ «مميّز» و«أُعيد» حيث كانا، ثمّ مرحلةُ الخبر.
   * **الحالُ تملأ الشارةَ بلونها، والعلامةُ محايدةٌ برمزها** (محمد ٢٠٢٦-١٠-٣١: «لماذا لا يكون هو الأخضر وليس نقطة؟»):
   * «منشور» خضراء، و«أُعيد للتعديل» حمراء؛ والمميّزُ فئتُه بنجمتها («تغطية مميّزة»، كانت شارتين ونقطة).
   */
  const marks = (r: NewsRow) => {
    const back = isBack(r);
    return (
      <>
        {/* «مميّز» تندمج في فئته («تغطية مميّزة»، «إنجاز مميّز») — لغةُ الموقع العامّ نفسُها (`CATEGORY_META.featured`)،
            بنجمتها ولا لونَ لها: الذهبيُّ كهرمانُ التنبيه نفسُه، فيُقرأ «انتبه» (محمد ٢٠٢٦-١٠-٣١) */}
        {r.isFeatured
          ? <AdBadge icon={<Star />}>{CATEGORY_META[r.category].featured}</AdBadge>
          : <AdBadge>{CATEGORY_META[r.category].label}</AdBadge>}
        {back && <AdBadge tone="bad">أُعيد للتعديل</AdBadge>}
        {!back && <AdBadge tone={TONE[WORKFLOW_META[r.workflow].tone]}>{WORKFLOW_META[r.workflow].label}</AdBadge>}
      </>
    );
  };

  /** أفعالُ الحال لرئيس التحرير: النشرُ (أو ما ينقصه)، والتمييز، والأرشفة، والحذفُ آخرُها. */
  const stateOps = (r: NewsRow): AdOp[] => {
    if (!isChief) return [];
    const gaps = r.workflow === "published" ? [] : missingForPublish(r);
    return [
      r.workflow === "published"
        ? { key: "pub", label: "إلغاء النشر", icon: <EyeSlash />, onClick: () => run(() => setNewsStatus(r.id, "unpublish")) }
        : gaps.length > 0
          ? { key: "pub", label: "نشر", icon: <WarningCircle />, onClick: () => toast.error(`لا يُنشَر خبرٌ ناقص: ينقصه ${gaps.join("، ")}.`) }
          : { key: "pub", label: "نشر", icon: <PaperPlaneTilt />, onClick: () => run(() => setNewsStatus(r.id, "publish")) },
      { key: "star", label: r.isFeatured ? "إلغاء التمييز" : "تمييز في الواجهة", icon: <Star />, onClick: () => run(() => toggleFeatured(r.id, !r.isFeatured)) },
      r.workflow === "archived"
        ? { key: "arc", label: "إعادة من الأرشيف", icon: <ArrowUUpLeft />, onClick: () => run(() => setNewsStatus(r.id, "restore")) }
        : { key: "arc", label: "أرشفة", icon: <Archive />, onClick: () => run(() => setNewsStatus(r.id, "archive")) },
      { key: "del", label: "حذف", icon: <Trash />, onClick: () => setKill(r), danger: true },
    ];
  };

  /** الأساسيُّ المحرّر، ثمّ أفعالُ الحال لرئيس التحرير — والقالبُ يقسمها (`AdActs`). */
  const acts = (r: NewsRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "فتح المحرّر", icon: <PencilSimple />, href: `/dashboard/news/${r.id}` }} ops={stateOps(r).map((o) => ({ ...o, disabled: pending }))} />
  );

  /**
   * **سطرُ التحرير** (محمد ٢٠٢٦-١٠-٣٠: «حرّر… أو اسم المحرّر، والنشرُ في سطرٍ آخر»): «بتحرير» لا «حرّره/حرّرته» فلا يُخطئ
   * جنسَ الكاتب. المنشورُ والمؤرشفُ بأسماء توقيعه (`authors`)، وما لم يُنشر بالمكلَّفين به — فخبرٌ قيد العمل بلا مكلَّفٍ
   * «بلا تكليف بعد» ولو حمل توقيعًا: التوقيعُ اسمٌ على الخبر، والتكليفُ مَن يعمل عليه الآن.
   * **ومصدرُه واحدٌ للكرت والسطر** (محمد ٢٠٢٦-١٠-٣١: الكرتُ قال «بتحرير فلانة» والجدولُ «بلا تكليف بعد» للخبر نفسِه).
   */
  const byline = (r: NewsRow): string | null => {
    const writers = r.writers.map((w) => w.name);
    const names = r.workflow === "published" || r.workflow === "archived" ? (r.authors.length ? r.authors : writers) : writers;
    if (!names.length) return IN_FLIGHT.includes(r.workflow) || r.workflow === "draft" ? "بلا تكليف بعد" : null;
    const [first, ...rest] = names;
    return rest.length ? `بتحرير ${first} و${arCount(rest.length, OTHERS)}` : `بتحرير ${first}`;
  };
  /**
   * **الكرتُ والسطرُ عرضان لسجلٍّ واحد: يختلفان في الترتيب لا في المعلومة** (محمد ٢٠٢٦-١٠-٣١). فما يقوله أحدُهما يقوله الآخر:
   * سببُ الإعادة، والتحرير، وغيابُ الغلاف (الكعبُ الخالي لا يقوله وحده)، وما كُتب من خبرٍ لم يُنشر (أرقامُ الكرت، وكلمةٌ في السطر).
   */
  const reason = (r: NewsRow): AdMeta[] => (isBack(r) ? [{ icon: <ArrowUUpLeft />, text: r.rejectionReason ?? "", tone: "bad" }] : []);
  const writing = (r: NewsRow): AdMeta[] => { const b = byline(r); return b ? [{ icon: <PenNib />, text: b }] : []; };
  const noCover = (r: NewsRow): AdMeta[] => (!r.imageUrl ? [{ icon: <ImageBroken />, text: "بلا غلاف", tone: "warn" }] : []);
  const drafted = (r: NewsRow): AdMeta[] =>
    r.workflow === "published" ? [] : [{
      icon: <TextAlignRight />,
      text: `${r.wordCount ? arCount(r.wordCount, AR_WORD) : "بلا متن"}، ${r.galleryCount ? arCount(r.galleryCount, AR_IMAGE) : "بلا صور"}`,
    }];
  /**
   * **سطورُ الخبر مصدرُها واحدٌ وترتيبُها واحد** (محمد ٢٠٢٦-١١-٠١): الرقاقاتُ رقاقاتٌ في العرضين (`marks`)، والسطورُ بترتيبها،
   * والكعبُ كعبٌ في العرضين (`stubOf`)، وما كان في الكرت أرقامًا يدخل السطرَ سطرًا («كلماتٌ وصور»).
   * (والتاريخُ المنشورُ في الكعب وحده، فلا يُكرَّر سطرًا.)
   */
  const info = (r: NewsRow, inCard: boolean): AdMeta[] => [
    ...reason(r),
    ...writing(r),
    { icon: <Buildings />, text: r.unitName },
    ...(!r.publishedAt && r.updatedAt ? [{ icon: <CalendarBlank />, text: `عُدّل ${relTime(r.updatedAt, now)}` }] : []),
    ...noCover(r),
    ...(inCard ? [] : drafted(r)),
  ];
  /** الكعبُ: يومُ النشر (وما لم يُنشر يومُ آخر تعديل) وشهرُه، والغلاف — في الكرت، وكعبًا مصغّرًا أوّلَ السطر. */
  const stubOf = (r: NewsRow) => {
    const at = r.publishedAt ?? r.updatedAt;
    if (!at) return undefined;
    const d = dayParts(at);
    return { big: d.day, small: d.month };
  };
  const figures = (r: NewsRow) =>
    r.workflow === "published"
      ? [{ icon: <Eye />, value: fmtNum(r.views), label: "المشاهدات" }, { icon: <Heart />, value: fmtNum(r.likes), label: "الإعجابات" }, { icon: <ChatCircle />, value: fmtNum(r.comments), label: "التعليقات" }]
      : [{ icon: <TextAlignRight />, value: fmtNum(r.wordCount), label: "الكلمات" }, { icon: <ImagesSquare />, value: fmtNum(r.galleryCount), label: "الصور" }];


  const create = isChief ? <AdButton variant="fill" icon={<Plus />} onClick={openCreate}>خبر جديد</AdButton> : undefined;
  const unitOptions = units.filter((u) => u.value !== "").map((u) => ({ value: u.value, label: u.label, group: (u as { group?: string }).group }));

  return (
    <>
      <CollectionRoom<NewsRow>
        navPath={NEWS_ROOM.navPath}
        title={NEWS_ROOM.title}
        action={isChief ? { label: "خبر جديد", icon: <Plus />, onClick: openCreate } : undefined}
        noun={AR_NEWS}
        items={rows}
        positions={POSITIONS}
        defaultPosition="all"
        searchPlaceholder="ابحث بالعنوان أو الملخّص أو الكاتب…"
        matchSearch={(r, q) => {
          const s = q.toLowerCase();
          return r.title.toLowerCase().includes(s) || (r.summary ?? "").toLowerCase().includes(s) || r.authors.join(" ").toLowerCase().includes(s);
        }}
        filters={[
          { key: "category", label: "القسم", options: CATEGORY_OPTIONS, match: (r, v) => r.category === v },
          ...(isChief ? [{ key: "unit", label: "الجهة", options: unitOptions, match: (r: NewsRow, v: string) => r.unit === v }] : []),
        ]}
        viewKey={NEWS_ROOM.viewKey}
        initialView={view}
        idOf={(r) => String(r.id)}
        table={{
          // الترتيبُ من رأس العمود كجداول الغرف كلّها (محمد ٢٠٢٦-١١-٠١؛ لم يكن في الغرفة القديمة). التاريخُ ما يقوله عمودُه:
          // النشرُ، وإلّا آخرُ تعديل — رقمًا فيبدأ بالأحدث. وغيرُ المنشور بلا تفاعل، فيقع آخرَ الأرقام
          head: "الخبر",
          headSortBy: (r) => r.title,
          stub: { key: "date", label: "التاريخ", icon: <CalendarBlank />, sortBy: (r) => { const at = r.publishedAt ?? r.updatedAt; return at ? +new Date(at) : 0; } },
          columns: [
            { key: "views", label: "المشاهدات", icon: <Eye />, sortBy: (r) => (r.workflow === "published" ? r.views : -1) },
            { key: "likes", label: "الإعجابات", icon: <Heart />, sortBy: (r) => (r.workflow === "published" ? r.likes : -1) },
            { key: "comments", label: "التعليقات", icon: <ChatCircle />, sortBy: (r) => (r.workflow === "published" ? r.comments : -1) },
          ],
        }}
        emptyAll={
          isChief
            ? { title: "لا أخبار بعد", desc: "أنشئ أوّل خبر: يُحفظ مسودّةً، ثمّ تكلّف كاتبه وتراجعه قبل النشر." }
            : { title: "لا تكاليف لك", desc: "حين يكلّفك رئيس التحرير بخبر ظهر هنا، ورأيتَ ما تملك تحريره منه." }
        }
        createAction={create}
        renderCard={(r) => {
          return (
            <AdCard
              key={r.id}
              cover={r.imageUrl}
              chips={marks(r)}
              title={r.title}
              href={`/dashboard/news/${r.id}`}
              meta={info(r, true)}
              figures={figures(r)}
              foot={acts(r)}
              stub={stubOf(r)}
            />
          );
        }}
        renderRow={(r) => {
          return (
            <AdRow
              key={r.id}
              title={r.title}
              href={`/dashboard/news/${r.id}`}
              badge={marks(r)}
              sub={info(r, false)}
              // الكعبُ المصغّر أوّلَ السطر (يومُه وشهرُه وغلافُه)، وأرقامُ التفاعل للمنشور — وغيرُ المنشور «—» في أعمدتها
              stub={(() => { const t = stubOf(r); return t && { ...t, cover: r.imageUrl }; })()}
              cells={[
                ...([["المشاهدات", r.views], ["الإعجابات", r.likes], ["التعليقات", r.comments]] as const).map(([label, n]) =>
                  r.workflow === "published" ? { label, value: fmtNum(n) } : { label, value: "—", tone: "muted" as const }),
              ]}
              acts={acts(r, true)}
            />
          );
        }}
      />

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title="خبر جديد"
        description="يُحفظ مسودّةً، ثمّ تفتحه لتكتبه أو تكلّف كاتبه."
        busy={pending}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setForm(null)} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" onClick={submitCreate} loading={pending}>إنشاء الخبر</Button>
          </>
        }
      >
        {form ? (
          <div className="form-grid">
            <Field
              className="form-full" label="عنوان الخبر" icon={<Newspaper />} innerIcon={<PencilSimple />}
              placeholder="مشاركة أدِيب في…" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              error={formErr ?? undefined} helper="عنوانٌ مبدئيّ يكفي، يُحرّر لاحقًا في المحرّر." required
            />
            <Select
              label="القسم" icon={<ClipboardText />} options={CATEGORY_OPTIONS} value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v as Category })} helper={CATEGORY_META[form.category].hint} required
            />
            <Select
              label="الجهة" icon={<Buildings />} options={units} value={form.unit}
              onValueChange={(v) => setForm({ ...form, unit: v })} searchable
              helper="صاحبُ الخبر: مجلسٌ أو قسمٌ أو لجنة. ودونها فهو خبرُ النادي كلِّه."
            />
          </div>
        ) : null}
      </Modal>
      <AdConfirm
        open={kill !== null}
        onClose={() => setKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الخبر؟"
        text={kill ? `سيُحذف «${kill.title}» وتكاليفه وتعليقاته وصوره نهائيًّا. لا استرجاع بعده.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!kill) return;
          start(async () => {
            const r = await deleteNews(kill.id);
            if (r.ok) { toast.success(r.message); setKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}

