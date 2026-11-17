"use client";

/**
 * **مسوّدةُ الخبر وأفعالُه** — استُخرجت من `NewsEditorView` بسلوكها حرفًا (٢٠٢٦-١١-١٣) كما استُخرج `useSurveyDraft` من منشئ الاستبيان:
 * الحالُ والحفظُ والرفعُ والتكليفُ والإعادةُ والتعليقُ ومسارُ المرحلة هنا، والشكلُ في الغرفة (`_ad/rooms/NewsEditorRoom`). فلا يتغيّر
 * حكمٌ واحد بتغيّر الشكل، ويبقى المحرّرُ القديمُ يقرأ ما يقرؤه حتى يُعتمد الجديد.
 *
 * والفرقُ الوحيدُ عمّا كان: **لكلّ فصلٍ مفتاحٌ ثابت** (`keys`) — الفصولُ تُرتَّب بالسحب الآن، والسحبُ يتبع مفتاحًا لا موضعًا.
 * لا يصل الخادمَ منه شيء.
 */
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { overBy } from "@adeeb/design-system";
import { createClient } from "@/lib/supabase/client";
import { NEWS_BUCKET } from "@/lib/news/bucket";
import { UPLOAD_RULES, checkFile, shrinkImage } from "@/lib/upload";
import { sectionsToText, textToSections, type Section } from "@/lib/news/blocks";
import type { NewsDetail } from "../data";
import {
  DEFAULT_FIELDS, FIELD_VALUES, GALLERY_MAX, SUMMARY_MAX, TITLE_MAX, WORKFLOW_META, missingForPublish,
  type Category, type FieldKey,
} from "../vocab";
import {
  addCollabComment, addGalleryImage, assignWriters, createImageUploadUrl, deleteCollabComment,
  deletePublicComment, removeCover, removeGalleryImage, returnForEdits, saveNews,
  setCover, setGalleryPhotographer, setNewsStatus, submitForReview, toggleFeatured,
} from "../actions";

export const NEWS_IMAGE_RULE = UPLOAD_RULES.newsImage;

type Toast = { success: (m: string) => void; error: (m: string) => void };
type Result = { ok: boolean; message: string };

let seq = 0;
const keyOf = () => `s${seq++}`;

export function useNewsDraft(detail: NewsDetail, isChief: boolean, toast: Toast) {
  const { row } = detail;
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const [pending, startPending] = useTransition();

  /* ── ما الذي يملك هذا الفاعل تحريره؟ — الواجهة تخفي ما لا يملكه، والخادم يرفضه ثانيةً ── */
  const may = (f: FieldKey) => isChief || detail.editableFields.includes(f);
  const mayAny = FIELD_VALUES.some(may);

  /* ── حالة النموذج ── */
  const [f, setF] = useState({
    title: row.title,
    slug: row.slug,
    summary: row.summary ?? "",
    // **الأقسامُ هي المتن.** وخبرٌ لم يُحوَّل بعدُ تُشتقّ أقسامُه من نصّه عند الفتح
    sections: (row.sections ?? textToSections(row.content)) as Section[],
    category: row.category,
    authors: row.authors,
    unit: row.unit,
    activityId: detail.activityId ?? "",
    coverPhotographer: detail.coverPhotographer ? [detail.coverPhotographer] : [],
  });
  // مفاتيحُ الفصول الأولى ثابتةٌ بموضعها (`f0`…): تُرسم في الخادم ثم المتصفّح، والمفتاحُ من عدّادٍ يختلف بينهما
  const [keys, setKeys] = useState<string[]>(() => f.sections.map((_, i) => `f${i}`));
  const patch = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));
  const [dirty, setDirty] = useState(false);
  const edit = (p: Partial<typeof f>) => { patch(p); setDirty(true); };

  /* ── الفصول ── */
  const setSection = (i: number, v: Partial<Section>) =>
    edit({ sections: f.sections.map((r, j) => (j === i ? { ...r, ...v } : r)) });
  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= f.sections.length || from === to) return;
    const next = [...f.sections]; const k = [...keys];
    const [x] = next.splice(from, 1); next.splice(to, 0, x);
    const [y] = k.splice(from, 1); k.splice(to, 0, y);
    setKeys(k); edit({ sections: next });
  };
  const dropSection = (i: number) => {
    setKeys(keys.filter((_, j) => j !== i));
    edit({ sections: f.sections.filter((_, j) => j !== i) });
  };
  const addSection = () => {
    const k = keyOf();
    setKeys([...keys, k]);
    edit({ sections: [...f.sections, { heading: "", body: "" }] });
    return k;
  };

  /** ما زاد على حدّه لا يُحفظ حتى يُختصر (قاعدةُ العدّاد الواحدة) */
  const tooLong = (may("title") && overBy(f.title, TITLE_MAX) > 0) || (may("summary") && overBy(f.summary, SUMMARY_MAX) > 0);
  const save = (after?: () => void) => startPending(async () => {
    if (tooLong) return;
    const r = await saveNews(row.id, {
      ...(may("title") ? { title: f.title } : {}),
      ...(may("summary") ? { summary: f.summary || null } : {}),
      ...(may("content") ? { sections: f.sections } : {}),
      ...(may("category") ? { category: f.category } : {}),
      ...(may("authors") ? { authors: f.authors } : {}),
      ...(may("cover_photographer") ? { coverPhotographer: f.coverPhotographer[0] ?? null } : {}),
      ...(isChief ? { slug: f.slug, unit: f.unit, activityId: f.activityId || null } : {}),
    });
    if (r.ok) { toast.success(r.message); setDirty(false); after?.(); router.refresh(); } else toast.error(r.message);
  });

  const run = (fn: () => Promise<Result>, after?: () => void) => startPending(async () => {
    const r = await fn();
    if (r.ok) { toast.success(r.message); after?.(); router.refresh(); } else toast.error(r.message);
  });

  /* ── الرفع: يُحفظ لحظتَه في الخادم، لا مع «حفظ التغييرات» (كما كان) ── */
  const [uploading, setUploading] = useState(0);
  const upload = async (original: File, kind: "cover" | "gallery", photographer?: string) => {
    const file = await shrinkImage(original, NEWS_IMAGE_RULE);
    const ticket = await createImageUploadUrl(row.id, kind, file.type, file.size);
    if (!ticket.ok || !ticket.path || !ticket.token) { toast.error(ticket.message ?? "تعذّر تجهيز الرفع."); return false; }
    const up = await sb.storage.from(NEWS_BUCKET).uploadToSignedUrl(ticket.path, ticket.token, file);
    if (up.error) { toast.error(`تعذّر رفع «${file.name}».`); return false; }
    const r = kind === "cover" ? await setCover(row.id, ticket.path) : await addGalleryImage(row.id, ticket.path, photographer);
    if (!r.ok) { toast.error(r.message); return false; }
    return true;
  };
  const onCover = async (file: File | null | undefined) => {
    if (!file) return;
    const why = checkFile(file, NEWS_IMAGE_RULE);
    if (why) { toast.error(why); return; }
    setUploading((u) => u + 1);
    const ok = await upload(file, "cover");
    setUploading((u) => u - 1);
    if (ok) { toast.success("رُفع الغلاف."); router.refresh(); }
  };
  const onGallery = async (list: FileList | File[] | null) => {
    if (!list?.length) return;
    const files: File[] = [];
    for (const x of Array.from(list)) {
      const why = checkFile(x, NEWS_IMAGE_RULE);
      if (why) toast.error(`لم تُقبل «${x.name}» : ${why}`);
      else files.push(x);
    }
    if (!files.length) return;
    // **أربعُ صورٍ لا أكثر**: يُرفع ما يسعه المعرض، ويُقال عن الباقي بعدده لا يُبتلع صامتًا
    const room = GALLERY_MAX - detail.galleryImages.length;
    if (room <= 0) { toast.error(`المعرضُ ${GALLERY_MAX} صورٍ لا أكثر. احذف صورةً لتضيف غيرها.`); return; }
    if (files.length > room) {
      toast.error(`المعرضُ ${GALLERY_MAX} صورٍ لا أكثر: رُفع ${room} من ${files.length}.`);
      files.splice(room);
    }
    setUploading((u) => u + files.length);
    let done = 0;
    // تسلسلًا لا توازيًا: المصفوفتان (صورٌ ومصوّرون) تُقرآن وتُكتبان معًا، والتوازي يفقد صفًّا.
    for (const file of files) {
      if (await upload(file, "gallery", f.coverPhotographer[0] || undefined)) done += 1;
      setUploading((u) => u - 1);
    }
    if (done) { toast.success(`أُضيفت ${done} صورة.`); router.refresh(); }
  };

  /* ── التكليف ── */
  const [assignOpen, setAssignOpen] = useState(false);
  const [aWriters, setAWriters] = useState<string[]>(detail.assignments.map((a) => a.writerId));
  const [aFields, setAFields] = useState<FieldKey[]>(
    (detail.assignments[0]?.fields as FieldKey[] | undefined)?.filter((x) => FIELD_VALUES.includes(x)) ?? DEFAULT_FIELDS,
  );
  const [aNotes, setANotes] = useState(detail.assignments[0]?.notes ?? "");
  const saveAssign = () => startPending(async () => {
    const r = await assignWriters(row.id, aWriters, aFields, aNotes);
    if (r.ok) { toast.success(r.message); setAssignOpen(false); router.refresh(); } else toast.error(r.message);
  });

  /* ── المراجعة والتعليقات ── */
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnNotes, setReturnNotes] = useState("");
  const sendReturn = () => startPending(async () => {
    const r = await returnForEdits(row.id, returnNotes);
    if (r.ok) { toast.success(r.message); setReturnOpen(false); router.refresh(); } else toast.error(r.message);
  });
  const [comment, setComment] = useState("");
  const sendComment = () => startPending(async () => {
    const r = await addCollabComment(row.id, comment);
    if (r.ok) { toast.success(r.message); setComment(""); router.refresh(); } else toast.error(r.message);
  });
  const dropComment = (id: string) => run(() => deleteCollabComment(id));
  const [confirmCover, setConfirmCover] = useState(false);
  const killCover = () => run(() => removeCover(row.id), () => setConfirmCover(false));
  /** مصوّرُ صورةٍ في المعرض: يُحفظ لحظتَه كالرفع والحذف (لا مع «حفظ التغييرات»)، والصورةُ برابطها */
  const [shootAt, setShootAt] = useState<number | null>(null);
  const [shootName, setShootName] = useState<string[]>([]);
  const openShoot = (i: number) => { setShootName(detail.galleryPhotographers[i] ? [detail.galleryPhotographers[i]] : []); setShootAt(i); };
  const saveShoot = () => {
    if (shootAt === null) return;
    const url = detail.galleryImages[shootAt];
    run(() => setGalleryPhotographer(row.id, url, shootName[0] ?? null), () => setShootAt(null));
  };
  const [killImage, setKillImage] = useState<number | null>(null);
  const dropImage = () => { if (killImage !== null) run(() => removeGalleryImage(row.id, killImage), () => setKillImage(null)); };
  /** تعليقُ الجمهور المطلوبُ حذفُه — الحذفُ نهائيٌّ ومعه إعجاباتُه، فيُسأل عنه أوّلًا */
  const [killComment, setKillComment] = useState<string | null>(null);
  const dropPublic = () => { if (killComment !== null) run(() => deletePublicComment(killComment), () => setKillComment(null)); };

  /* ── المرحلة ── */
  // حارسُ النشر يسأل عن المتن نصًّا، فيُسأل عن إسقاط الأقسام
  const gaps = missingForPublish({ summary: f.summary, imageUrl: row.imageUrl, authors: f.authors, content: sectionsToText(f.sections), sections: f.sections });
  const meta = WORKFLOW_META[row.workflow];
  const canSubmit = ["draft", "assigned", "in_progress"].includes(row.workflow);
  const submit = () => run(() => submitForReview(row.id));
  const publish = () => (gaps.length
    ? toast.error(`لا يُنشَر خبرٌ ناقص: ينقصه ${gaps.join("، ")}.`)
    : run(() => setNewsStatus(row.id, "publish")));
  const unpublish = () => run(() => setNewsStatus(row.id, "unpublish"));
  const feature = () => run(() => toggleFeatured(row.id, !row.isFeatured));
  const archive = () => run(() => setNewsStatus(row.id, "archive"));
  const restore = () => run(() => setNewsStatus(row.id, "restore"));

  // مدخلا الملفّات: يبقيان مركَّبَين فيعمل النقرُ البرمجيّ عليهما
  const coverInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  return {
    row, may, mayAny, f, edit, dirty, keys, setSection, moveSection, dropSection, addSection, tooLong, save, pending,
    uploading, onCover, onGallery, coverInput, galleryInput,
    assignOpen, setAssignOpen, aWriters, setAWriters, aFields, setAFields, aNotes, setANotes, saveAssign,
    returnOpen, setReturnOpen, returnNotes, setReturnNotes, sendReturn,
    comment, setComment, sendComment, dropComment,
    confirmCover, setConfirmCover, killCover, killImage, setKillImage, dropImage, killComment, setKillComment, dropPublic,
    shootAt, setShootAt, shootName, setShootName, openShoot, saveShoot,
    gaps, meta, canSubmit, submit, publish, unpublish, feature, archive, restore,
  };
}

export type NewsDraft = ReturnType<typeof useNewsDraft>;
export type { Category };
