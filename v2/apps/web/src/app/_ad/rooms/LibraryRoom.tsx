"use client";

/**
 * مكتبةُ «إرثٌ يُروى» على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠١) — السلوكُ سلوكُ `library/LibraryView.tsx` القديم:
 * البحثُ بالعنوان والمعرّف والملخّص، ومرشّحا النوع والحالة، والترتيبُ بالعنوان والصفحات والمشاهدات، والإنشاءُ وتعديلُ
 * البيانات في نافذةٍ واحدة (وبعد الإنشاء يُفتح المحرّر)، والنشرُ وإلغاؤه، والتمييزُ على الرفّ، والحذفُ بتأكيد.
 * والنقرُ على المنشور يفتح محرّرَ صفحاته. والفرقُ في الشكل: كروتٌ بأغلفتها، وأفعالٌ ظاهرة.
 */
import type { RoomView } from "../view";
import { LIBRARY_ROOM } from "./library.meta";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Modal, Select, Textarea, matchesSearch } from "@adeeb/design-system";
import { BookOpen, Books, CalendarBlank, Hash, LinkSimple, Megaphone, TextAlignLeft } from "@phosphor-icons/react";
import { Eye, EyeSlash, PencilSimple, Plus, Star, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { BookRow } from "@/app/dashboard/library/data";
import { KIND_META, KIND_OPTIONS, STATUS_META, slugify, type BookKind } from "@/app/dashboard/library/vocab";
import { createBook, deleteBook, setBookStatus, toggleBookFeatured, updateBook } from "@/app/dashboard/library/actions";
import { AdActs, AdBadge, AdButton, AdCard, AdConfirm, AdRow, type AdFigure, type AdMeta, type AdOp, type AdTone } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { fmtNum } from "../format";
import { arCounted, type ArForms } from "@/lib/arabicCount";

const AR_BOOK: ArForms = ["منشورٌ واحد", "منشوران", "منشورات", "منشورًا"];
/** المعدودُ تحت رقم الكعب: «1 صفحة»، «2 صفحتان»، «5 صفحات»، «12 صفحةً». */
const AR_PAGE: ArForms = ["صفحة", "صفحتان", "صفحات", "صفحةً"];

const TONE: Record<string, AdTone> = { success: "ok", info: "info" };
/** «مميّز» يندمج في نوعه بنجمته كما في الأخبار («تغطية مميّزة») — والصفةُ تتبع جنسَ النوع. */
const FEATURED: Record<BookKind, string> = { annual_report: "تقرير سنويّ مميّز", magazine: "مجلّة مميّزة", booklet: "كُتيّب مميّز" };

type FormState = { title: string; slug: string; kind: BookKind; summary: string; yearHijri: string; yearGregorian: string };
const EMPTY_FORM: FormState = { title: "", slug: "", kind: "annual_report", summary: "", yearHijri: "", yearGregorian: "" };

/** `serverNow` يمرّره كلُّ مسارٍ على القالب؛ ولا تاريخَ يُعرض في المكتبة فلا يُقرأ هنا. */
/**
 * **مواضعُ المكتبة بحال المنشور** (محمد ٢٠٢٦-١١-٠١، بعد رسائل التواصل): كان فوق الجدول القديم كاردُ إحصاء (الإجماليّ، والمنشور)
 * ومرشّحُ حال — فصارت مواضعَ بأعدادها. و«إجماليّ الصفحات» مجموعٌ لا حال: مكانُه صفحةُ الإحصاء.
 */
const POSITIONS: Position<BookRow>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لا منشورات بعد." },
  { key: "published", label: "منشور", match: (b) => b.status === "published", empty: "لم يُنشَر شيءٌ بعد." },
  { key: "draft", label: "مسودّة", match: (b) => b.status === "draft", empty: "لا مسودّات.", canCreate: true },
];

export function LibraryRoom({ books, view }: { books: BookRow[]; serverNow: number; view?: RoomView }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  // نافذة البيانات: null مغلقة، كائن مفتوحة (edit=null للإنشاء)
  const [form, setForm] = useState<{ edit: BookRow | null; state: FormState; slugTouched: boolean } | null>(null);
  const [formErr, setFormErr] = useState<Partial<Record<keyof FormState, string>>>({});
  const [kill, setKill] = useState<BookRow | null>(null);

  const editorOf = (b: BookRow) => `/dashboard/library/${b.id}`;

  const openCreate = () => { setForm({ edit: null, state: EMPTY_FORM, slugTouched: false }); setFormErr({}); };
  const openEditMeta = (b: BookRow) => {
    setForm({
      edit: b, slugTouched: true,
      state: { title: b.title, slug: b.slug, kind: b.kind, summary: b.summary ?? "", yearHijri: b.yearHijri ? String(b.yearHijri) : "", yearGregorian: b.yearGregorian ? String(b.yearGregorian) : "" },
    });
    setFormErr({});
  };

  const patchForm = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, state: { ...f.state, ...patch } } : f));

  const onTitle = (v: string) => setForm((f) => {
    if (!f) return f;
    const next = { ...f.state, title: v };
    if (!f.slugTouched) next.slug = slugify(v); // اقتراح السلاگ ما لم يُحرَّر يدويًّا
    return { ...f, state: next };
  });
  const onSlug = (v: string) => setForm((f) => (f ? { ...f, slugTouched: true, state: { ...f.state, slug: v } } : f));
  const onGreg = (v: string) => setForm((f) => {
    if (!f) return f;
    const next = { ...f.state, yearGregorian: v };
    if (!f.slugTouched && !next.slug && /^\d{3,4}$/.test(v)) next.slug = v; // سلاگ افتراضيّ من سنة الميلاد
    return { ...f, state: next };
  });

  const submit = () => {
    if (!form) return;
    const s = form.state;
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!s.title.trim()) errs.title = "العنوان مطلوب.";
    if (!slugify(s.slug)) errs.slug = "المعرّف مطلوب: أحرف لاتينيّة وأرقام.";
    setFormErr(errs);
    if (Object.keys(errs).length) return;

    const input = {
      title: s.title, slug: s.slug, kind: s.kind,
      summary: s.summary || null,
      yearHijri: s.yearHijri ? Number(s.yearHijri) : null,
      yearGregorian: s.yearGregorian ? Number(s.yearGregorian) : null,
    };
    start(async () => {
      const r = form.edit ? await updateBook(form.edit.id, input) : await createBook(input);
      if (r.ok) {
        toast.success(r.message);
        setForm(null);
        router.refresh();
        if (!form.edit && r.id) router.push(`/dashboard/library/${r.id}`); // بعد الإنشاء: افتح المحرّر مباشرةً
      } else toast.error(r.message);
    });
  };

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
    });

  /** أفعالُ الحال: النشرُ أو إلغاؤه، والتمييزُ على الرفّ، والحذفُ آخرُها. */
  const stateOps = (b: BookRow): AdOp[] => [
    b.status === "draft"
      ? { key: "pub", label: "نشر", icon: <Megaphone />, onClick: () => run(() => setBookStatus(b.id, "publish")) }
      : { key: "pub", label: "إلغاء النشر", icon: <EyeSlash />, onClick: () => run(() => setBookStatus(b.id, "unpublish")) },
    { key: "star", label: b.isFeatured ? "إلغاء التمييز" : "تمييز على الرفّ", icon: <Star />, onClick: () => run(() => toggleBookFeatured(b.id, !b.isFeatured)) },
    { key: "del", label: "حذف", icon: <Trash />, onClick: () => setKill(b), danger: true },
  ];

  /** الأساسيُّ محرّرُ الصفحات (وجهةُ النقر على الصفّ القديم)، ثمّ تعديلُ البيانات، ثمّ أفعالُ الحال — والقالبُ يقسمها (`AdActs`). */
  const acts = (b: BookRow, inRow?: boolean) => (
    <AdActs
      inRow={inRow}
      primary={{ label: "تحرير الصفحات", icon: <BookOpen />, href: editorOf(b) }}
      ops={[{ key: "meta", label: "تعديل البيانات", icon: <PencilSimple />, onClick: () => openEditMeta(b) }, ...stateOps(b).map((o) => ({ ...o, disabled: pending }))]}
    />
  );

  /**
   * **مصدرٌ واحدٌ للكرت والسطر**: النوعُ (بنجمته إن كان مميّزًا) والحالُ رقاقتان، ثمّ المعرّفُ والسنةُ سطران بترتيب الجدول القديم،
   * والكعبُ عددُ الصفحات ومعدودُها بغلاف المنشور (وبلا غلافٍ قماشُ اللوح)، والمشاهداتُ رقمٌ في الكرت وعمودٌ في السطر.
   */
  const chips = (b: BookRow) => (
    <>
      {b.isFeatured
        ? <AdBadge icon={<Star />}>{FEATURED[b.kind]}</AdBadge>
        : <AdBadge>{KIND_META[b.kind].label}</AdBadge>}
      <AdBadge tone={TONE[STATUS_META[b.status].tone]}>{STATUS_META[b.status].label}</AdBadge>
    </>
  );
  // المعرّفُ لاتينيٌّ بين عازلَي الاتّجاه: بلا عزلٍ تُلحق الخوارزميّةُ الشرطةَ بطرفه الآخر («2026/»)
  const info = (b: BookRow): AdMeta[] => [
    { icon: <LinkSimple />, text: `/${b.slug}`, ltr: true },
    ...(b.yearLabel ? [{ icon: <CalendarBlank />, text: b.yearLabel }] : []),
  ];
  const stubOf = (b: BookRow) => ({ big: fmtNum(b.pageCount), small: arCounted(b.pageCount, AR_PAGE) });
  const look = (b: BookRow) => (b.coverUrl ? { cover: b.coverUrl } : { seed: b.id });
  const figures = (b: BookRow): AdFigure[] => [{ icon: <Eye />, value: fmtNum(b.views), label: "المشاهدات" }];

  const create = <AdButton variant="fill" icon={<Plus />} onClick={openCreate}>منشور جديد</AdButton>;

  return (
    <>
      <CollectionRoom<BookRow>
        navPath={LIBRARY_ROOM.navPath}
        title={LIBRARY_ROOM.title}
        action={{ label: "منشور جديد", icon: <Plus />, onClick: openCreate }}
        noun={AR_BOOK}
        items={books}
        positions={POSITIONS}
        defaultPosition="all"
        searchPlaceholder="ابحث بعنوان المنشور أو معرّفه…"
        matchSearch={(b, q) => matchesSearch(q, b.title, b.slug, b.summary)}
        filters={[
          { key: "kind", label: "النوع", options: KIND_OPTIONS, match: (b, v) => b.kind === v },
        ]}
        viewKey={LIBRARY_ROOM.viewKey}
        initialView={view}
        idOf={(b) => b.id}
        table={{
          // الترتيبُ من رأس العمود كما كان في الجدول القديم: العنوان، والصفحات (الكعب)، والمشاهدات
          head: "المنشور",
          headSortBy: (b) => b.title.toLowerCase(),
          stub: { key: "pages", label: "الصفحات", icon: <BookOpen />, sortBy: (b) => b.pageCount },
          columns: [{ key: "views", label: "المشاهدات", icon: <Eye />, sortBy: (b) => b.views }],
        }}
        emptyAll={{ title: "لا منشورات بعد", desc: "أنشئ أوّل منشور: يُحفظ مسودّةً، ثمّ تفتحه لتضع صفحاته." }}
        createAction={create}
        renderCard={(b) => (
          <AdCard
            key={b.id}
            {...look(b)}
            stub={stubOf(b)}
            chips={chips(b)}
            title={b.title}
            href={editorOf(b)}
            meta={info(b)}
            figures={figures(b)}
            foot={acts(b)}
          />
        )}
        renderRow={(b) => (
          <AdRow
            key={b.id}
            title={b.title}
            href={editorOf(b)}
            stub={{ ...stubOf(b), ...look(b) }}
            badge={chips(b)}
            sub={info(b)}
            cells={figures(b).map((f) => ({ label: f.label, value: f.value, of: f.of }))}
            acts={acts(b, true)}
          />
        )}
      />

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.edit ? "تعديل بيانات المنشور" : "منشور جديد"}
        description={form?.edit ? undefined : "تُحفظ البيانات مسودّةً، ثمّ يُفتح المحرّر لإضافة الصفحات."}
        busy={pending}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setForm(null)} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" onClick={submit} loading={pending}>{form?.edit ? "حفظ التغييرات" : "إنشاء المنشور"}</Button>
          </>
        }
      >
        {form ? (
          <div className="form-grid">
            <Field className="form-full" label="عنوان المنشور" icon={<BookOpen />} innerIcon={<PencilSimple />} placeholder="عامٌ بألف ذكرى"
              value={form.state.title} onChange={(e) => onTitle(e.target.value)} error={formErr.title} required />
            <Field className="form-full" label="المعرّف (رابط المكتبة)" icon={<LinkSimple />} innerIcon={<Hash />} placeholder="2026" charset="latin"
              value={form.state.slug} onChange={(e) => onSlug(e.target.value)} error={formErr.slug} helper="يظهر في رابط المكتبة العامّ." required />
            <Select className="form-full" label="النوع" icon={<Books />} options={KIND_OPTIONS} value={form.state.kind} onValueChange={(v) => patchForm({ kind: v as BookKind })} required />
            <Field label="السنة الميلاديّة" icon={<CalendarBlank />} innerIcon={<Hash />} placeholder="2026" charset="digits"
              value={form.state.yearGregorian} onChange={(e) => onGreg(e.target.value)} optional />
            <Field label="السنة الهجريّة" icon={<CalendarBlank />} innerIcon={<Hash />} placeholder="1447" charset="digits"
              value={form.state.yearHijri} onChange={(e) => patchForm({ yearHijri: e.target.value })} optional />
            <Textarea className="form-full" label="ملخّص" icon={<TextAlignLeft />} innerIcon={<PencilSimple />} placeholder="نبذةٌ تُعرض تحت الغلاف في الرفّ…"
              rows={3} value={form.state.summary} onChange={(e) => patchForm({ summary: e.target.value })} optional />
          </div>
        ) : null}
      </Modal>

      <AdConfirm
        open={kill !== null}
        onClose={() => setKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف المنشور؟"
        text={kill ? `سيُحذف «${kill.title}» وكلّ صفحاته نهائيًّا. لا استرجاع بعده.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!kill) return;
          start(async () => {
            const r = await deleteBook(kill.id);
            if (r.ok) { toast.success(r.message); setKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
