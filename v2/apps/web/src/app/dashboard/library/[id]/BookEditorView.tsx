"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Badge, Button, Field, Modal } from "@adeeb/design-system";
import { Megaphone, Books, BookmarkSimple } from "@phosphor-icons/react";
import { UploadSimple } from "@/app/_components/glyphs";
import { DotsSixVertical, Star, Trash, PencilSimple, EyeSlash, Eye } from "@/app/_components/glyphs";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { EmptyState } from "../../_components/EmptyState";
import { DropdownMenu, type MenuGroup } from "../../_components/DropdownMenu";
import { useToast } from "../../_components/ToastProvider";
import { createClient } from "@/lib/supabase/client";
import { STATUS_META, type BookStatus } from "../vocab";
import type { BookHeader, PageEditRow } from "../data";
import {
  createPageUploadUrl, addPage, renamePage, deletePage, setPageHard, setCoverPage, reorderPages, setBookStatus,
} from "../actions";
import { PageHeader } from "../../_components/PageHeader";
import { UPLOAD_RULES, checkFile } from "@/lib/upload";

// وصفةُ صفحة الكتاب من قانون المرفقات (`lib/upload`)
const PAGE_RULE = UPLOAD_RULES.libraryPage;

const BUCKET = "library";

// قارئ الكتاب للمعاينة — يُحمَّل عند الطلب فقط (client-only) كي لا يُثقل حزمة المحرّر.
const BookReader = dynamic(() => import("@adeeb/design-system").then((m) => m.BookReader), {
  ssr: false,
  loading: () => <div className="grid min-h-[360px] place-items-center text-content-muted">…يُفتح القارئ</div>,
});

/** بطاقة صفحة قابلة للسحب — أدوات dnd-kit تلبس رموز الهوية (لا CSS شارد). */
function SortablePage({ page, menu }: { page: PageEditRow; menu: MenuGroup[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative rounded-sm border border-line bg-surface overflow-hidden">
      <div className="relative aspect-[3/4] bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={page.url} alt={page.label ?? `صفحة ${page.pageNumber}`} loading="lazy" className="absolute inset-0 w-full h-full object-contain" />
        <button
          type="button"
          className="absolute top-1 start-1 rounded-sm border border-line bg-surface p-1 text-content-muted cursor-grab touch-none"
          aria-label="اسحب لإعادة الترتيب"
          {...attributes}
          {...listeners}
        >
          <DotsSixVertical />
        </button>
        <div className="absolute top-1 end-1">
          <DropdownMenu groups={menu} ariaLabel="إجراءات الصفحة" triggerClassName="dm-trigger rounded-sm border border-line bg-surface" />
        </div>
        {(page.isCover || page.isHard) ? (
          <div className="absolute bottom-1 start-1 flex gap-1">
            {page.isCover ? <Badge tone="warning" size="sm" icon={<Star />}>غلاف</Badge> : null}
            {page.isHard ? <Badge tone="neutral" size="sm">دفّة</Badge> : null}
          </div>
        ) : null}
      </div>
      <div className="px-2 py-1.5 flex items-center gap-2 min-w-0">
        <span className="num text-content-muted">{page.pageNumber}</span>
        <span className="truncate text-sm">{page.label || <span className="text-content-muted">—</span>}</span>
      </div>
    </div>
  );
}

export function BookEditorView({ book, initialPages }: { book: BookHeader; initialPages: PageEditRow[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [pages, setPages] = useState<PageEditRow[]>(initialPages);
  const [status, setStatus] = useState<BookStatus>(book.status);
  const [uploading, setUploading] = useState(0);
  const [rename, setRename] = useState<{ id: string; label: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<PageEditRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sb = useMemo(() => createClient(), []);
  const [showPreview, setShowPreview] = useState(false);
  const previewPages = useMemo(() => pages.map((p) => ({ src: p.url, alt: p.label ?? undefined, hard: p.isHard })), [pages]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const readDims = (file: File) => new Promise<{ width: number; height: number } | undefined>((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve(undefined); URL.revokeObjectURL(url); };
    img.src = url;
  });

  /** رفع دفعة صور مباشرةً إلى التخزين عبر Signed URL، بأرقام صفحات متتالية مُوزَّعة سلفًا. */
  const onFiles = async (list: FileList | null) => {
    if (!list || list.length === 0 || uploading > 0) return;
    // كلُّ صفحةٍ تمرّ على بوّابة قانون المرفقات (`lib/upload`)، والمرفوضةُ تُسمّى باسمها
    const files: File[] = [];
    for (const f of Array.from(list)) {
      const why = checkFile(f, PAGE_RULE);
      if (why) toast.error(`لم تُقبل «${f.name}» : ${why}`);
      else files.push(f);
    }
    if (files.length === 0) return;
    const base = pages.reduce((m, p) => Math.max(m, p.pageNumber), 0);
    let done = 0;
    setUploading(files.length);

    let i = 0;
    const worker = async () => {
      while (i < files.length) {
        const idx = i++;
        const file = files[idx];
        const desiredNo = base + idx + 1;
        try {
          const urlRes = await createPageUploadUrl(book.id, file.type);
          if (!urlRes.ok || !urlRes.path || !urlRes.token) { toast.error(urlRes.message ?? "تعذّر تجهيز الرفع."); continue; }
          const dims = await readDims(file);
          const up = await sb.storage.from(BUCKET).uploadToSignedUrl(urlRes.path, urlRes.token, file);
          if (up.error) { toast.error(`تعذّر رفع «${file.name}».`); continue; }
          const added = await addPage(book.id, urlRes.path, { pageNumber: desiredNo, width: dims?.width, height: dims?.height });
          if (added.ok && added.page) {
            const np = added.page;
            setPages((prev) => [...prev, { id: np.id, url: np.url, pageNumber: np.pageNumber, label: null, isHard: false, isCover: false }]
              .sort((a, b) => a.pageNumber - b.pageNumber));
            done += 1;
          } else toast.error(added.message);
        } finally {
          setUploading((u) => u - 1);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, files.length) }, worker));
    // خبرُ النجاح يُقال ولو ظهرت الصفحاتُ في الشبكة: الرفعُ فعلٌ طويل، وخبرُه يُنهيه
    if (done > 0) toast.success(done === 1 ? "أُضيفت صفحة." : `أُضيفت ${done} صفحة.`);
    router.refresh();
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = pages.findIndex((p) => p.id === active.id);
    const newIdx = pages.findIndex((p) => p.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(pages, oldIdx, newIdx).map((p, k) => ({ ...p, pageNumber: k + 1 }));
    setPages(next);
    startPending(async () => {
      const r = await reorderPages(book.id, next.map((p) => p.id));
      if (r.ok) toast.success(r.message);
      else { toast.error(r.message); router.refresh(); }
    });
  };

  const doRename = () => {
    if (!rename) return;
    const { id, label } = rename;
    startPending(async () => {
      const r = await renamePage(id, label);
      if (r.ok) { setPages((prev) => prev.map((p) => (p.id === id ? { ...p, label: label.trim() || null } : p))); setRename(null); toast.success(r.message); }
      else toast.error(r.message);
    });
  };

  const doCover = (p: PageEditRow) => startPending(async () => {
    const r = await setCoverPage(book.id, p.id);
    if (r.ok) { setPages((prev) => prev.map((x) => ({ ...x, isCover: x.id === p.id }))); toast.success(r.message); }
    else toast.error(r.message);
  });

  const doHard = (p: PageEditRow) => startPending(async () => {
    const r = await setPageHard(p.id, !p.isHard);
    if (r.ok) { setPages((prev) => prev.map((x) => (x.id === p.id ? { ...x, isHard: !x.isHard } : x))); toast.success(r.message); }
    else toast.error(r.message);
  });

  const doDelete = () => {
    if (!confirmDel) return;
    const target = confirmDel;
    startPending(async () => {
      const r = await deletePage(target.id);
      if (r.ok) {
        setPages((prev) => prev.filter((p) => p.id !== target.id).map((p, k) => ({ ...p, pageNumber: k + 1 })));
        setConfirmDel(null); toast.success(r.message); router.refresh();
      } else toast.error(r.message);
    });
  };

  const runStatus = (op: "publish" | "unpublish") => startPending(async () => {
    const r = await setBookStatus(book.id, op);
    if (r.ok) { setStatus(op === "publish" ? "published" : "draft"); toast.success(r.message); router.refresh(); }
    else toast.error(r.message);
  });

  const pageMenu = (p: PageEditRow): MenuGroup[] => [
    { header: "الصفحة", items: [
      { label: "تسمية", icon: <PencilSimple />, onSelect: () => setRename({ id: p.id, label: p.label ?? "" }) },
      { label: p.isCover ? "غلاف الرفّ (الحاليّ)" : "اجعلها غلاف الرفّ", icon: <Star />, disabled: p.isCover, onSelect: () => doCover(p) },
      { label: p.isHard ? "إلغاء الدفّة الصلبة" : "دفّة صلبة (غلاف)", icon: <BookmarkSimple />, onSelect: () => doHard(p) },
    ] },
    { header: "منطقة الخطر", danger: true, items: [
      { label: "حذف الصفحة", icon: <Trash />, danger: true, onSelect: () => setConfirmDel(p) },
    ] },
  ];

  return (
    <>
      {/* حكمُ `/ui/page-header`: يبقى «نشر» وحده فعلًا أساسيًّا، و«إلغاء النشر» إلى `⋯`،
          و«رجوع» يُحذف لأنّه يكرّر الفتاتَ الذي فوقه بسطر. أمّا «معاينة» فخرجت من الرأس
          كلِّه إلى أسفل الصفحات — انظر أدناه. */}
      <PageHeader
        title={book.title}
        status={{ label: STATUS_META[status].label, tone: STATUS_META[status].tone }}
        action={status === "draft"
          ? { label: "نشر", icon: <Megaphone size={18} />, loading: pending, onClick: () => runStatus("publish") }
          : undefined}
        menu={status === "draft"
          ? undefined
          : [{ items: [{ label: "إلغاء النشر", icon: <EyeSlash size={18} />, onSelect: () => runStatus("unpublish") }] }]}
      />

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
        className="rounded border-2 border-dashed border-line bg-surface-2 p-8 flex flex-col items-center gap-3 text-center"
      >
        <UploadSimple size={30} className="text-content-muted" />
        <div className="text-content-muted text-sm">اسحب صور الصفحات هنا، أو اخترها من جهازك. تُرتَّب بترتيب اختيارها، وتُعيد ترتيبها بالسحب.</div>
        <Button variant="ghost" size="md" onClick={() => fileRef.current?.click()} loading={uploading > 0}>
          <UploadSimple size={18} />اختر الصفحات
        </Button>
        {uploading > 0 ? <div className="text-content-muted text-sm">يُرفع <b className="num">{uploading}</b>…</div> : null}
        <input ref={fileRef} type="file" accept={PAGE_RULE.accept} multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      </div>

      <div className="mt-4">
        {pages.length === 0 ? (
          <EmptyState variant="soft" icon={<Books />} title="لا صفحات بعد" description="ارفع صور صفحات المنشور لتظهر هنا مرتّبةً." />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {pages.map((p) => <SortablePage key={p.id} page={p} menu={pageMenu(p)} />)}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* **«معاينة» فعلٌ على المحتوى لا على الصفحة** — فموضعُها عند ما تُعاينه، لا في رأسٍ
          فوقه بشاشة (قرار المالك ٢٠٢٦-٠٨-١٦). ولا تُعرَض معطّلةً: بلا ما يُعاين لا وجودَ
          لها أصلًا (ق٧: الزرُّ لا يَعِد بما لا يملك). */}
      {pages.length > 0 ? (
        <div className="mt-4 btn-row">
          <Button variant="ghost" size="md" onClick={() => setShowPreview(true)}>
            <Eye size={18} />معاينة المنشور
          </Button>
        </div>
      ) : null}

      <Modal
        open={rename !== null}
        onClose={() => setRename(null)}
        title="تسمية الصفحة"
        description="اسمٌ يظهر في فهرس القارئ (البسملة، المقدّمة، الفهرس…)."
        busy={pending}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setRename(null)} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" onClick={doRename} loading={pending}>حفظ</Button>
          </>
        }
      >
        {rename ? (
          <Field
            label="اسم الصفحة" icon={<BookmarkSimple />} innerIcon={<PencilSimple />} placeholder="مثال: المقدّمة"
            value={rename.label} onChange={(e) => setRename({ id: rename.id, label: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") doRename(); }}
            optional
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmDel !== null}
        onClose={() => setConfirmDel(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الصفحة؟"
        text={confirmDel ? `ستُحذف الصفحة رقم ${confirmDel.pageNumber} وصورتها نهائيًّا.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={doDelete}
      />

      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="معاينة القارئ" description="هكذا سيظهر الكتاب للقرّاء." size="lg">
        {showPreview && previewPages.length ? <BookReader pages={previewPages} rtl /> : null}
      </Modal>
    </>
  );
}
