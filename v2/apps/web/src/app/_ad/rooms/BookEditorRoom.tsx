"use client";

/**
 * **محرّرُ الكتيّب على «المنضدة»** (قالبُ «مساحة العمل»، ٢٠٢٦-١١-١٦ — لم يُعتمد بعد، مختبرُه `/dashboard/ad/book-editor`).
 * كان `BookEditorView`: رأسٌ قديم، ومنطقةُ إفلاتٍ رماديّة، وشبكةُ مصغّراتٍ بقائمة «⋯» لكلّ صفحة، و«معاينةُ المنشور» نافذةً في آخرها.
 * فصار: الصفحاتُ **قطعٌ** تُرتَّب بالسحب (رقمُ القطعة رقمُ الصفحة، ووجهُها مصغّرتُها)، تُفتح فيُكتب اسمُها في الفهرس ويُختار أنّها غلافُ
 * الرفّ أو دفّةٌ صلبة، وحذفُها في ذيلها؛ ومنطقةُ الإفلات المعتمدة (`AdUpload add`) آخرَها. **والمنضدةُ صفحةُ الكتيّب العامّةُ نفسُها**
 * (`/frame/book`): لوحُه وكتابُه وفهرسُه، و«افتح الكتيّب» يفتح غرفةَ القراءة — فيرى المحرِّرُ ما سيراه القارئ وهو يرتّب.
 *
 * **السلوكُ سلوكُ القديم حرفًا**: كلُّ فعلٍ يُحفظ في لحظته (الرفعُ ثلاثًا معًا بأرقامٍ موزَّعةٍ سلفًا، والترتيبُ عند الإفلات، والتسميةُ،
 * والغلافُ، والدفّةُ، والحذفُ بتأكيد)، والنشرُ وإيقافُه فعلُ الالتزام. ولا مسوّدةَ تُحرس: لا شيءَ يضيع بالمغادرة.
 */
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@adeeb/design-system";
import { Books, BookmarkSimple, Megaphone, TextT } from "@phosphor-icons/react";
import { ArrowSquareOut, EyeSlash, PencilSimple, Star, Trash, UploadSimple } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { createClient } from "@/lib/supabase/client";
import { UPLOAD_RULES, checkFile } from "@/lib/upload";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { KIND_META } from "@/app/dashboard/library/vocab";
import type { BookHeader, PageEditRow } from "@/app/dashboard/library/data";
import {
  createPageUploadUrl, addPage, renamePage, deletePage, setPageHard, setCoverPage, reorderPages, setBookStatus,
} from "@/app/dashboard/library/actions";
import { AdButton, AdConfirm, AdNote } from "../primitives";
import { FormSection, FormToggle } from "../form";
import { AdUpload } from "../upload";
import { SortArea, SortItem } from "../reorder";
import { StageFrame, WorkBlock, WorkRoom } from "../workspace";
import type { BookView } from "./BookReadRoom";

const AR_PAGE: ArForms = ["صفحةٌ واحدة", "صفحتان", "صفحات", "صفحةً"];
const PAGE_RULE = UPLOAD_RULES.libraryPage;
const BUCKET = "library";

/** ما يصل المنضدةَ: الكتيّبُ كما سيُرى في المكتبة الآن */
export type BookStageDraft = {
  book: BookView;
  /** الصفحةُ المفتوحةُ في المحرّر (موضعُها): تُفتح عليها غرفةُ القراءة في المنضدة، فتُرى الصفحةُ في كتابها — وبلاها صفحةُ الكتيّب */
  focus: number | null;
  /**
   * المعاينةُ ظاهرة: القارئُ يقيس مكانَه حين يُبنى، والمنضدةُ مخفيّةٌ في موضع التحرير فيُبنى فيها بلا مقاس فتخرج الصفحةُ فارغة
   * (محمد ٢٠٢٦-١١-١٦) — فيُعاد بناؤه حين تظهر
   */
  shown: boolean;
};

const readDims = (file: File) => new Promise<{ width: number; height: number } | undefined>((resolve) => {
  const img = new window.Image();
  const url = URL.createObjectURL(file);
  img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
  img.onerror = () => { resolve(undefined); URL.revokeObjectURL(url); };
  img.src = url;
});

export function BookEditorRoom({ book, initialPages, dry }: {
  book: BookHeader;
  initialPages: PageEditRow[];
  /** مختبر: كلُّ فعلٍ يُجرى على الصفحة وحدها ولا يُحفظ */
  dry?: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [pages, setPages] = useState<PageEditRow[]>(initialPages);
  const [status, setStatus] = useState(book.status);
  const [uploading, setUploading] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  /** اسمُ الصفحة المفتوحة وهو يُكتب — يُحفظ بزرّه، كنافذة «تسمية» القديمة */
  const [label, setLabel] = useState("");
  const [confirmDel, setConfirmDel] = useState<PageEditRow | null>(null);
  /** موضعُ الغرفة: التحرير أو المعاينة (المبدّلُ على كلّ شاشة) — والصفحةُ المفتوحةُ في التحرير تُفتح عليها المعاينة */
  const [pane, setPane] = useState<"edit" | "stage">("edit");
  const sb = useMemo(() => createClient(), []);
  const warned = useRef(false);
  const labNote = () => { if (!warned.current) { warned.current = true; toast.info("مختبر: ما تفعله هنا لا يُحفظ."); } };

  const openPage = (p: PageEditRow | null) => { setOpen(p?.id ?? null); setLabel(p?.label ?? ""); };

  /** رفعُ دفعةٍ إلى التخزين عبر رابطٍ موقَّع، بأرقام صفحاتٍ متتاليةٍ موزَّعةٍ سلفًا — ثلاثٌ معًا (سلوكُ القديم) */
  const onFiles = async (list: File[]) => {
    if (!list.length || uploading > 0) return;
    const files: File[] = [];
    for (const f of list) {
      const why = checkFile(f, PAGE_RULE);
      if (why) toast.error(`لم تُقبل «${f.name}» : ${why}`);
      else files.push(f);
    }
    if (!files.length) return;
    if (dry) {
      labNote();
      const base = pages.length;
      setPages((prev) => [...prev, ...files.map((f, k) => {
        const url = URL.createObjectURL(f);
        return { id: `dry-${Date.now()}-${k}`, url, thumb: url, pageNumber: base + k + 1, label: null, isHard: false, isCover: false };
      })]);
      return;
    }
    const base = pages.reduce((m, p) => Math.max(m, p.pageNumber), 0);
    let done = 0;
    setUploading(files.length);
    let i = 0;
    const worker = async () => {
      while (i < files.length) {
        const idx = i++;
        const file = files[idx];
        try {
          const urlRes = await createPageUploadUrl(book.id, file.type);
          if (!urlRes.ok || !urlRes.path || !urlRes.token) { toast.error(urlRes.message ?? "تعذّر تجهيز الرفع."); continue; }
          const dims = await readDims(file);
          const up = await sb.storage.from(BUCKET).uploadToSignedUrl(urlRes.path, urlRes.token, file);
          if (up.error) { toast.error(`تعذّر رفع «${file.name}».`); continue; }
          const added = await addPage(book.id, urlRes.path, { pageNumber: base + idx + 1, width: dims?.width, height: dims?.height });
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
    if (done > 0) toast.success(done === 1 ? "أُضيفت صفحة." : `أُضيفت ${done} صفحة.`);
    router.refresh();
  };

  /** فعلٌ واحدٌ على الخادم: يُجرى محلّيًّا إن نجح (وفي المختبر محلّيًّا وحده) */
  const run = (call: () => Promise<{ ok: boolean; message: string }>, apply: () => void, after?: () => void) => {
    if (dry) { labNote(); apply(); after?.(); return; }
    startPending(async () => {
      const r = await call();
      if (r.ok) { apply(); after?.(); toast.success(r.message); } else toast.error(r.message);
    });
  };

  const moveTo = (from: string, to: string) => {
    const a = pages.findIndex((p) => p.id === from), b = pages.findIndex((p) => p.id === to);
    if (a < 0 || b < 0 || a === b) return;
    const next = [...pages];
    const [m] = next.splice(a, 1);
    next.splice(b, 0, m);
    const renum = next.map((p, k) => ({ ...p, pageNumber: k + 1 }));
    setPages(renum);
    if (dry) { labNote(); return; }
    startPending(async () => {
      const r = await reorderPages(book.id, renum.map((p) => p.id));
      if (r.ok) toast.success(r.message);
      else { toast.error(r.message); router.refresh(); }
    });
  };
  const step = (i: number, dir: -1 | 1) => { const j = i + dir; if (pages[j]) moveTo(pages[i].id, pages[j].id); };

  const saveLabel = (p: PageEditRow) => run(() => renamePage(p.id, label),
    () => setPages((prev) => prev.map((x) => (x.id === p.id ? { ...x, label: label.trim() || null } : x))));
  const setCover = (p: PageEditRow) => run(() => setCoverPage(book.id, p.id), () => setPages((prev) => prev.map((x) => ({ ...x, isCover: x.id === p.id }))));
  const setHard = (p: PageEditRow) => run(() => setPageHard(p.id, !p.isHard), () => setPages((prev) => prev.map((x) => (x.id === p.id ? { ...x, isHard: !x.isHard } : x))));
  const doDelete = () => {
    const t = confirmDel;
    if (!t) return;
    run(() => deletePage(t.id), () => setPages((prev) => prev.filter((p) => p.id !== t.id).map((p, k) => ({ ...p, pageNumber: k + 1 }))),
      () => { setConfirmDel(null); if (open === t.id) setOpen(null); if (!dry) router.refresh(); });
  };
  const runStatus = (op: "publish" | "unpublish") => run(() => setBookStatus(book.id, op), () => setStatus(op === "publish" ? "published" : "draft"),
    () => { if (!dry) router.refresh(); });

  const published = status === "published";
  // **حالُ الكتيّب وفعلُ مرحلته فوق التحرير** (كحال الخبر). و«افتحه» لا «افتحه في المكتبة»: العنوانُ يقول المكان، والفعلان يتّسعان لصفٍّ واحدٍ في الجوّال: لا «حفظ» ولا «إلغاء» في غرفةٍ كلُّ فعلٍ فيها يُحفظ في لحظته
  const lead = published ? (
    <AdNote tone="ok" title="منشورٌ في المكتبة"
      action={(
        <>
          <AdButton variant="line" size="sm" icon={<ArrowSquareOut />} href={`/library/${book.slug}`} external>افتحه</AdButton>
          <AdButton variant="line" size="sm" icon={<EyeSlash />} busy={pending} onClick={() => runStatus("unpublish")}>أوقف النشر</AdButton>
        </>
      )}>
      ما تغيّره هنا يراه القرّاء في لحظته.
    </AdNote>
  ) : (
    <AdNote tone="info" title="مسوّدة: لا يراه القرّاء"
      action={<AdButton variant="fill" size="sm" icon={<Megaphone />} busy={pending} held={!pages.length} onClick={() => runStatus("publish")}>انشر الكتيّب</AdButton>}>
      {/* **لا يُنشر كتيّبٌ بلا صفحات** (المراجع ٢٠٢٦-١١-١٦): كان الزرُّ يمضي فيظهر في المكتبة كتيّبٌ فارغ */}
      {pages.length ? "ارفع صفحاته ورتّبها، ثمّ انشره." : "ارفع صفحةً واحدةً على الأقلّ لتنشره."}
    </AdNote>
  );

  const sub = (p: PageEditRow) => [p.isCover ? "غلافُ الرفّ" : null, p.isHard ? "دفّةٌ صلبة" : null].filter(Boolean).join("، ") || undefined;
  const ids = pages.map((p) => p.id);

  const editing = (
    <FormSection id="pages" icon={<Books />} title="الصفحات"
      sub={pages.length ? `${arCount(pages.length, AR_PAGE)}، تُرتَّب بالسحب، وكلُّ تغييرٍ يُحفظ في لحظته` : "ارفع صور الصفحات بترتيبها، وتُرتَّب بعدها بالسحب"}>
      {pages.length ? (
        <div className="ad-wblks">
          <SortArea list ids={ids} total={pages.length} nameOf={(id) => `صفحة ${ids.indexOf(id) + 1}`} placeOf={(id) => ids.indexOf(id) + 1} onMove={moveTo}>
            {pages.map((p, i) => (
              <div key={p.id} className="ad-wblk-slot">
                <SortItem id={p.id} label={`صفحة ${i + 1}`} n={i + 1} on={!pending} prev={i > 0} next={i < pages.length - 1} onStep={(dir) => step(i, dir)}>
                  <WorkBlock n={i + 1} thumb={p.thumb ?? p.url} title={p.label || "بلا اسمٍ في الفهرس"} untitled={!p.label} sub={sub(p)}
                    open={open === p.id} onToggle={() => openPage(open === p.id ? null : p)}
                    acts={(
                      <>
                        <AdButton variant="fill" size="sm" icon={<PencilSimple />} held={label.trim() === (p.label ?? "")} busy={pending} onClick={() => saveLabel(p)}>احفظ الاسم</AdButton>
                        <AdButton variant="danger" size="sm" icon={<Trash />} onClick={() => setConfirmDel(p)}>حذف</AdButton>
                      </>
                    )}>
                    <div className="form-grid">
                      <Field className="form-full" label="اسمُها في الفهرس" icon={<TextT />} innerIcon={<PencilSimple />} placeholder="البسملة، المقدّمة، الفهرس…"
                        helper="يظهر في فهرس القارئ. والصفحةُ بلا اسمٍ لا تظهر فيه" value={label} onChange={(e) => setLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && label.trim() !== (p.label ?? "")) saveLabel(p); }} optional />
                      <FormToggle className="form-full" icon={<Star />} label="غلافُ الرفّ" checked={p.isCover}
                        description={p.isCover ? "وجهُ الكتيّب على رفّ المكتبة. ولتغييره اجعل صفحةً أخرى غلافَه" : "تصير وجهَ الكتيّب على رفّ المكتبة"}
                        onChange={(v) => { if (v) setCover(p); else toast.info("لتغيير الغلاف اجعل صفحةً أخرى غلافَه."); }} />
                      <FormToggle className="form-full" icon={<BookmarkSimple />} label="دفّةٌ صلبة" checked={p.isHard}
                        description="تُقلب كغلافٍ مقوًّى لا كورقة" onChange={() => setHard(p)} />
                    </div>
                  </WorkBlock>
                </SortItem>
              </div>
            ))}
          </SortArea>
        </div>
      ) : null}
      <AdUpload add multiple bare={!pages.length} label="إضافة صفحات" icon={<UploadSimple />} value={null} busy={uploading} accept={PAGE_RULE.accept} alt=""
        help="تُضاف بترتيب اختيارها آخرَ الكتيّب" onFiles={onFiles} />
    </FormSection>
  );

  const view: BookView = {
    id: book.id, slug: book.slug, title: book.title, summary: book.summary, kindLabel: KIND_META[book.kind].label, yearLabel: book.yearLabel,
    views: book.views, cover: (pages.find((p) => p.isCover) ?? pages[0])?.url ?? null,
    pages: pages.map((p) => ({ src: p.url, thumb: p.thumb ?? p.url, alt: p.label ?? `صفحة ${p.pageNumber}`, hard: p.isHard })),
    sections: pages.flatMap((p, i) => (p.label ? [{ title: p.label, page: i }] : [])),
  };
  const at = open ? pages.findIndex((p) => p.id === open) : -1;
  const draft: BookStageDraft = { book: view, focus: at >= 0 ? at : null, shown: pane === "stage" };
  const stage = <StageFrame src="/frame/book" kind="book" payload={draft} title="الكتيّب كما يراه القارئ في المكتبة" />;

  return (
    <>
      <WorkRoom look="b" path="/dashboard/library" title={book.title} switched view={pane} onView={setPane} stage={stage} stageTitle="كما يراه القارئ في المكتبة" lead={lead}>
        {editing}
      </WorkRoom>
      <AdConfirm open={confirmDel !== null} onClose={() => setConfirmDel(null)} tone="danger" icon={<Trash />} title="حذف الصفحة؟"
        text={confirmDel ? `ستُحذف الصفحة ${pages.findIndex((p) => p.id === confirmDel.id) + 1} وصورتُها نهائيًّا.` : undefined}
        confirmLabel="حذف" loading={pending} onConfirm={doDelete} />
    </>
  );
}
