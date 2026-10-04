"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Accordion, Alert, Badge, Button, Checkbox, Field, PersonPicker, SaveBar, SectionCard, Segmented, Select, Textarea, Modal } from "@adeeb/design-system";
import {
  Newspaper, TextAlignLeft, Tag, UsersThree, Buildings, ClipboardText, Image as ImageIcon, Images,
  PaperPlaneTilt, Megaphone, Archive, ChatCircleDots, ClockCounterClockwise, Camera, Users,
  FloppyDisk, LinkSimple, Hash,
} from "@phosphor-icons/react";
import {
  PencilSimple, UploadSimple, Trash, EyeSlash, ArrowUUpLeft, Star, CheckCircle, XCircle,
  WarningCircle,
} from "@/app/_components/glyphs";
import { DropdownMenu } from "../../_components/DropdownMenu";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { EmptyState } from "../../_components/EmptyState";
import { Avatar } from "../../_components/Avatar";
import { useToast } from "../../_components/ToastProvider";
import { createClient } from "@/lib/supabase/client";
import { NEWS_BUCKET } from "@/lib/news/bucket";
import type { UnitOption } from "@adeeb/core/org-unit";
import type { CreditPerson } from "@/lib/people";
import type { NewsDetail, Option } from "../data";
import {
  ASSIGNMENT_META, CATEGORY_META, CATEGORY_OPTIONS, DEFAULT_FIELDS, FIELD_META, FIELD_VALUES,
  SUMMARY_MAX, TITLE_MAX, WORKFLOW_META, missingForPublish, readingMinutes, wordCount,
  type Category, type FieldKey,
} from "../vocab";
import {
  addCollabComment, addGalleryImage, assignWriters, createImageUploadUrl, deleteCollabComment,
  moderatePublicComment, removeCover, removeGalleryImage, returnForEdits, saveNews,
  setCover, setNewsStatus, submitForReview, toggleFeatured,
} from "../actions";
import { PageHeader } from "../../_components/PageHeader";
import { UPLOAD_RULES, checkFile } from "@/lib/upload";
import { sectionsToText, textToSections, type Section } from "@/lib/news/blocks";
import { SectionsEditor } from "./SectionsEditor";

// وصفةُ صور الأخبار من قانون المرفقات (`lib/upload`)
const IMAGE_RULE = UPLOAD_RULES.newsImage;

const dt = (s: string | null) =>
  s ? new Intl.DateTimeFormat("ar-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s)) : "—";

/** أفعال السجلّ بالعربيّة — السجلّ يُقرأ لا يُفكّ. */
const ACTION_LABEL: Record<string, string> = {
  create: "أُنشئ الخبر",
  assign: "كُلِّف الطاقم",
  submit: "رُفع إلى المراجعة",
  return: "أُعيد إلى الكاتب",
  publish: "نُشِر",
  unpublish: "أُلغي النشر",
  archive: "أُرشف",
  restore: "أُعيد من الأرشيف",
};

export function NewsEditorView({
  detail, members, units, people, isChief, meId,
}: {
  detail: NewsDetail; members: Option[]; units: UnitOption[]; people: CreditPerson[];
  isChief: boolean; meId: string;
}) {
  const { row } = detail;
  const toast = useToast();
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const [pending, startPending] = useTransition();
  /**
   * **لوحان لا ستّةُ تبويبات** (قرار المالك ٢٠٢٦-٠٩-٢٤ بعد معاينة `/ui/news-editor`):
   * «الكتابة» لما يُكتب، و«الإدارة» لما يُدار. وكانت ستًّا يفيض شريطُها عن عرض الجوّال
   * فيُقصّ آخرُها، وأسماؤها مجرّدةٌ لا يُعرف أيُّها أيّ.
   */
  const [view, setView] = useState<"write" | "manage">("write");

  /* ── ما الذي يملك هذا الفاعل تحريره؟ ─────────────────────────────
     الواجهة تخفي ما لا يملكه، والخادم يرفضه ثانيةً — فالإخفاء راحةٌ لا حراسة. */
  const may = (f: FieldKey) => isChief || detail.editableFields.includes(f);

  /* ── بِركةُ النسبة بأفتارها ───────────────────────────────────────
     الأفتارُ يُركَّب ههنا لا في المكتبة: `Avatar` مكوّنُ لوحةٍ يعرف أيقونتَي الجنس
     وملفَّاتِها، والمكتبةُ لا تعرف عن أهل أدِيب شيئًا — فتقبل أيقونةً جاهزة. */
  const creditPool = useMemo(
    () => people.map((p) => ({
      name: p.name, hint: p.hint, group: p.group,
      icon: <Avatar name={p.name} src={p.avatarUrl ?? undefined} gender={p.gender} size="xs" />,
    })),
    [people],
  );
  const mayAny = FIELD_VALUES.some(may);

  /* ── حالة النموذج ─────────────────────────────────────────────── */
  const [f, setF] = useState({
    title: row.title,
    slug: row.slug,
    summary: row.summary ?? "",
    // **الأقسامُ هي المتن.** وخبرٌ لم يُحوَّل بعدُ تُشتقّ أقسامُه من نصّه عند الفتح،
    // فيرى المحرّرُ بنيتَه جاهزةً ولا يُطالَب بإعادة تقطيعها بيده.
    sections: (row.sections ?? textToSections(row.content)) as Section[],
    category: row.category,
    tags: row.tags.join("، "),
    authors: row.authors,
    unit: row.unit,
    coverPhotographer: detail.coverPhotographer ? [detail.coverPhotographer] : [],
  });
  const patch = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));
  const [dirty, setDirty] = useState(false);
  const edit = (p: Partial<typeof f>) => { patch(p); setDirty(true); };

  const splitList = (v: string) => v.split(/[،,\n]/).map((s) => s.trim()).filter(Boolean);

  const save = () => startPending(async () => {
    const r = await saveNews(row.id, {
      ...(may("title") ? { title: f.title } : {}),
      ...(may("summary") ? { summary: f.summary || null } : {}),
      ...(may("content") ? { sections: f.sections } : {}),
      ...(may("category") ? { category: f.category } : {}),
      ...(may("tags") ? { tags: splitList(f.tags) } : {}),
      ...(may("authors") ? { authors: f.authors } : {}),
      ...(may("cover_photographer") ? { coverPhotographer: f.coverPhotographer[0] ?? null } : {}),
      ...(isChief ? { slug: f.slug, unit: f.unit } : {}),
    });
    if (r.ok) { toast.success(r.message); setDirty(false); router.refresh(); } else toast.error(r.message);
  });

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) => startPending(async () => {
    const r = await fn();
    if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
  });

  /* ── الرفع ────────────────────────────────────────────────────── */
  const coverInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);

  const upload = async (file: File, kind: "cover" | "gallery", photographer?: string) => {
    const ticket = await createImageUploadUrl(row.id, kind, file.type, file.size);
    if (!ticket.ok || !ticket.path || !ticket.token) {
      toast.error(ticket.message ?? "تعذّر تجهيز الرفع.");
      return false;
    }
    const up = await sb.storage.from(NEWS_BUCKET).uploadToSignedUrl(ticket.path, ticket.token, file);
    if (up.error) { toast.error(`تعذّر رفع «${file.name}».`); return false; }
    const r = kind === "cover"
      ? await setCover(row.id, ticket.path)
      : await addGalleryImage(row.id, ticket.path, photographer);
    if (!r.ok) { toast.error(r.message); return false; }
    return true;
  };

  const onCover = async (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    // بوّابةُ قانون المرفقات قبل الشبكة (`lib/upload`)
    const why = checkFile(file, IMAGE_RULE);
    if (why) { toast.error(why); return; }
    setUploading((u) => u + 1);
    const ok = await upload(file, "cover");
    setUploading((u) => u - 1);
    if (ok) { toast.success("رُفع الغلاف."); router.refresh(); }
  };

  const onGallery = async (list: FileList | null) => {
    if (!list?.length) return;
    // كلُّ صورةٍ تمرّ على البوّابة نفسِها، والمرفوضةُ تُسمّى باسمها لا تُبتلَع صامتة
    const files: File[] = [];
    for (const x of Array.from(list)) {
      const why = checkFile(x, IMAGE_RULE);
      if (why) toast.error(`لم تُقبل «${x.name}» : ${why}`);
      else files.push(x);
    }
    if (!files.length) return;
    setUploading((u) => u + files.length);
    let done = 0;
    // تسلسلًا لا توازيًا: المصفوفتان (صورٌ ومصوّرون) تُقرآن وتُكتبان معًا، والتوازي يفقد صفًّا.
    for (const file of files) {
      if (await upload(file, "gallery", f.coverPhotographer[0] || undefined)) done += 1;
      setUploading((u) => u - 1);
    }
    if (done) { toast.success(`أُضيفت ${done} صورة.`); router.refresh(); }
  };

  /* ── التكليف ──────────────────────────────────────────────────── */
  const [assignOpen, setAssignOpen] = useState(false);
  const [aWriters, setAWriters] = useState<string[]>(detail.assignments.map((a) => a.writerId));
  const [aFields, setAFields] = useState<FieldKey[]>(
    (detail.assignments[0]?.fields as FieldKey[] | undefined)?.filter((x) => FIELD_VALUES.includes(x)) ?? DEFAULT_FIELDS,
  );
  const [aNotes, setANotes] = useState(detail.assignments[0]?.notes ?? "");

  /* ── المراجعة والتعليقات ──────────────────────────────────────── */
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnNotes, setReturnNotes] = useState("");
  const [comment, setComment] = useState("");
  const [confirmCover, setConfirmCover] = useState(false);
  const [killImage, setKillImage] = useState<number | null>(null);

  // حارسُ النشر يسأل عن المتن نصًّا، فيُسأل عن إسقاط الأقسام — لا عن حقلٍ ثانٍ يُحرَّر.
  const gaps = missingForPublish({
    summary: f.summary, imageUrl: row.imageUrl, authors: f.authors,
    content: sectionsToText(f.sections),
  });
  const meta = WORKFLOW_META[row.workflow];
  const canSubmit = ["draft", "assigned", "in_progress"].includes(row.workflow);
  /**
   * **فعلٌ واحدٌ ظاهرٌ وما عداه خلف النقاط.** كان صفَّ خمسةِ أزرارٍ متساويةٍ يلتفّ
   * سطرين، فيجاور «نشرٌ» علنيٌّ لا رجعةَ فيه «تمييزًا» زينة. والآن يُرفَع للمرحلة فعلُها
   * وحدَه، وتنزل البقيّةُ إلى قائمةٍ لا تُفتح إلّا لمن أرادها.
   */
  const menu: { label: string; icon: React.ReactNode; onSelect: () => void; danger?: boolean }[] = isChief
    ? [
        ...(row.workflow === "ready_for_review"
          ? [{ label: "إعادة بملاحظة", icon: <ArrowUUpLeft />, onSelect: () => { setReturnNotes(""); setReturnOpen(true); } }]
          : []),
        ...(row.workflow === "published"
          ? [{ label: "إلغاء النشر", icon: <EyeSlash />, onSelect: () => run(() => setNewsStatus(row.id, "unpublish")) }]
          : []),
        { label: row.isFeatured ? "إلغاء التمييز" : "تمييز", icon: <Star />, onSelect: () => run(() => toggleFeatured(row.id, !row.isFeatured)) },
        ...(row.workflow === "archived"
          ? [{ label: "إعادة من الأرشيف", icon: <ArrowUUpLeft />, onSelect: () => run(() => setNewsStatus(row.id, "restore")) }]
          : [{ label: "أرشفة", icon: <Archive />, onSelect: () => run(() => setNewsStatus(row.id, "archive")), danger: true }]),
      ]
    : [];

  /** الغلافُ والمعرض — يسكنان درجًا، ومدخلا الملفّات يبقيان مركَّبَين فيعملان وهو مطويّ. */
  const media = (
    <div className="nwe-stack">
      <div>
        <h3 className="mb-2">صورة الغلاف</h3>
        {row.imageUrl ? (
          <div className="nwe-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={row.imageUrl} alt="غلاف الخبر" />
            {may("cover_photographer") ? (
              <PersonPicker label="مصوّر الغلاف" icon={<Camera />} single
                people={creditPool} value={f.coverPhotographer} onChange={(v) => edit({ coverPhotographer: v })}
                placeholder="ابحث في أهل أدِيب أو اكتب اسمًا" required />
            ) : null}
            {may("image_url") ? (
              <div className="btn-row">
                <Button variant="ghost" size="sm" onClick={() => coverInput.current?.click()} loading={uploading > 0}>
                  <UploadSimple size={16} />استبدال
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmCover(true)}>
                  <Trash size={16} />حذف
                </Button>
              </div>
            ) : null}
          </div>
        ) : may("image_url") ? (
          <EmptyState variant="soft" icon={<ImageIcon />} title="بلا غلاف"
            description="الغلاف مطلوبٌ قبل النشر، يظهر في بطاقة الخبر وفي الصفحة الرئيسية."
            action={<Button variant="primary" size="md" onClick={() => coverInput.current?.click()} loading={uploading > 0}>
              <UploadSimple size={18} />رفع الغلاف
            </Button>} />
        ) : <p className="text-content-muted">لا غلاف، ولم تُكلَّف برفعه.</p>}
      </div>

      <div>
        <h3 className="mb-2">معرض الصور</h3>
        {detail.galleryImages.length ? (
          <div className="nwe-gallery">
            {detail.galleryImages.map((src, i) => (
              <figure key={src} className="nwe-fig">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`صورة ${i + 1}`} />
                <figcaption className="nwe-meta">{detail.galleryPhotographers[i] || "بلا مصوّر"}</figcaption>
                {may("gallery_images") ? (
                  <Button variant="ghost" size="sm" onClick={() => setKillImage(i)}><Trash size={14} />حذف</Button>
                ) : null}
              </figure>
            ))}
          </div>
        ) : <p className="text-content-muted">لا صور في المعرض بعد.</p>}
        {may("gallery_images") ? (
          <Button variant="ghost" size="md" className="mt-3"
            onClick={() => galleryInput.current?.click()} loading={uploading > 0}>
            <Images size={18} />إضافة صور
          </Button>
        ) : null}
      </div>
    </div>
  );

  /** ما يُضبَط مرّةً ثمّ يُنسى — لا يزاحم المتنَ على الشاشة. */
  const publishDetails = (
    <div className="form-grid">
      {may("authors") ? (
        <PersonPicker className="form-full" label="الكتّاب" icon={<Users />}
          people={creditPool} value={f.authors} onChange={(v) => edit({ authors: v })}
          placeholder="ابحث في أهل أدِيب أو اكتب اسمًا"
          helper="أوّلهم هو الكاتب المعروض في البطاقة. واسمُ من ليس من أدِيب يُكتب كما هو." />
      ) : <ReadOnly label="الكتّاب" value={row.authors.join("، ") || "—"} />}

      {may("category") ? (
        <Select label="القسم" icon={<ClipboardText />} options={CATEGORY_OPTIONS} value={f.category}
          onValueChange={(v) => edit({ category: v as Category })} />
      ) : <ReadOnly label="القسم" value={CATEGORY_META[row.category].label} />}

      {isChief ? (
        <Select label="الجهة" icon={<Buildings />} options={units} searchable value={f.unit}
          onValueChange={(v) => edit({ unit: v })} />
      ) : <ReadOnly label="الجهة" value={row.unitName} />}

      {may("tags") ? (
        <Field className="form-full" label="الوسوم" icon={<Tag />} innerIcon={<PencilSimple />}
          placeholder="أدِيب، ورشة، تطوّع"
          value={f.tags} onChange={(e) => edit({ tags: e.target.value })}
          helper="تفصلها فاصلة." />
      ) : <ReadOnly label="الوسوم" value={row.tags.join("، ") || "—"} />}

      {isChief ? (
        <Field className="form-full" label="المعرّف (رابط الخبر)" icon={<LinkSimple />} innerIcon={<Hash />}
          placeholder="news-…"
          value={f.slug} onChange={(e) => edit({ slug: e.target.value })}
          helper="يظهر في رابط الخبر العامّ، لا يُغيَّر بعد النشر (روابطه منشورةٌ في الخارج)." />
      ) : null}
    </div>
  );

  /** الطاقم — لرئيس التحرير وحدَه. */
  const crew = (
    <div className="nwe-stack">
      <div className="btn-row">
        <Button variant="primary" size="md" onClick={() => setAssignOpen(true)}>
          <UsersThree size={18} />{detail.assignments.length ? "تعديل التكليف" : "تكليف كاتب"}
        </Button>
      </div>
      {detail.assignments.length ? (
        <div className="nwe-stack-sm">
          {detail.assignments.map((a) => (
            <div key={a.writerId} className="nwe-row nwe-row-mid">
              <Avatar name={a.writerName} src={a.avatarUrl ?? undefined} gender={a.gender} size="md" />
              <div className="nwe-row-main">
                <b className="nwe-row-name">{a.writerName}</b>
                <div className="nwe-meta">
                  {a.fields.map((x) => FIELD_META[x as FieldKey]?.label ?? x).join("، ") || "بلا حقول"}
                </div>
                {a.notes ? <div className="nwe-row-text">{a.notes}</div> : null}
              </div>
              <Badge tone={ASSIGNMENT_META[a.status].tone} dot>{ASSIGNMENT_META[a.status].label}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState variant="soft" icon={<UsersThree />} title="بلا طاقم"
          description="كلّف كاتبًا: يُفتح له الخبر في غرفته، ويحرّر ما أسندتَه إليه وحده." />
      )}
    </div>
  );

  /** الغرفة — حديثُ الطاقم، لا يراه الجمهور. */
  const roomTalk = (
    <div className="nwe-stack">
      <div className="nwe-stack-sm">
        <Textarea label="تعليق داخليّ" icon={<ChatCircleDots />} innerIcon={<PencilSimple />} rows={3}
          placeholder="ملاحظةٌ للطاقم، لا يراها الجمهور."
          value={comment} onChange={(e) => setComment(e.target.value)} />
        <div className="btn-row">
          <Button variant="primary" size="md" loading={pending} disabled={!comment.trim()}
            onClick={() => startPending(async () => {
              const r = await addCollabComment(row.id, comment);
              if (r.ok) { toast.success(r.message); setComment(""); router.refresh(); } else toast.error(r.message);
            })}>
            إضافة
          </Button>
        </div>
      </div>
      {detail.comments.length ? (
        <div className="nwe-stack-sm">
          {detail.comments.map((c) => (
            <div key={c.id} className="nwe-row">
              <Avatar name={c.userName} src={c.avatarUrl ?? undefined} gender={c.gender} size="sm" />
              <div className="nwe-row-main">
                <div className="nwe-row-top">
                  <b className="nwe-row-name">{c.userName}</b>
                  <span className="nwe-meta">{dt(c.createdAt)}</span>
                </div>
                <div className="nwe-row-text">{c.text}</div>
              </div>
              {c.userId === meId || isChief ? (
                <Button variant="ghost" size="sm" aria-label="حذف التعليق" onClick={() => run(() => deleteCollabComment(c.id))}>
                  <Trash size={14} />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState variant="soft" icon={<ChatCircleDots />} title="لا تعليقات"
          description="غرفةٌ هادئة. اكتب أوّل ملاحظةٍ للطاقم." />
      )}
    </div>
  );

  /** الجمهور — ما كتبه القرّاء، وإقرارُه لرئيس التحرير. */
  const audience = detail.publicComments.length ? (
    <div className="nwe-stack-sm">
      {detail.publicComments.map((c) => (
        <div key={c.id} className="nwe-row nwe-row-mid">
          <div className="nwe-row-main">
            <div className="nwe-row-top">
              <b className="nwe-row-name">{c.who}</b>
              {c.isGuest ? <Badge tone="neutral" variant="outline">زائر</Badge> : null}
              <Badge tone={c.isApproved ? "success" : "warning"} dot>
                {c.isApproved ? "منشور" : "ينتظر الإقرار"}
              </Badge>
              <span className="nwe-meta">{dt(c.createdAt)}</span>
            </div>
            <div className="nwe-row-text">{c.content}</div>
          </div>
          <div className="btn-row">
            {!c.isApproved ? (
              <Button variant="ghost" size="sm" loading={pending}
                onClick={() => run(() => moderatePublicComment(c.id, "approve"))}>
                <CheckCircle size={16} />إقرار
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" loading={pending}
              onClick={() => run(() => moderatePublicComment(c.id, "reject"))}>
              <XCircle size={16} />حذف
            </Button>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <EmptyState variant="soft" icon={<ChatCircleDots />} title="لا تعليقات من الجمهور"
      description="ما وصل تعليقٌ على هذا الخبر بعد." />
  );

  /** السجلّ — ما جرى للخبر، يُقرأ ولا يُفكّ. */
  const history = detail.log.length ? (
    <div className="nwe-stack-sm">
      {detail.log.map((l) => (
        <div key={l.id} className="nwe-row nwe-row-mid">
          <ClockCounterClockwise size={16} className="text-content-muted" />
          <b className="nwe-row-main">{ACTION_LABEL[l.action] ?? l.action}</b>
          <span className="nwe-meta">{l.userName ?? "النظام"}</span>
          <span className="nwe-meta">{dt(l.createdAt)}</span>
        </div>
      ))}
    </div>
  ) : (
    <EmptyState variant="soft" icon={<ClockCounterClockwise />} title="لا سجلّ بعد"
      description="يُكتب السجلّ عند كلّ تحوّلٍ في حالة الخبر." />
  );

  return (
    <>
      {/* عنقودان صارا لا شيء (حكمُ `/ui/page-header`): «رجوع» يكرّر الفتاتَ فسقط، و«حفظ»
          فعلُ التزامٍ لا فعلُ رأسٍ فنزل إلى الشريط اللاصق أسفلَه — ولا يظهر حتى يوجد ما
          يُحفَظ. والشارةُ والنجمةُ حالان، فموضعُهما سطرُ الفتات لا عنقودُ الأزرار. */}
      <PageHeader
        title={row.title}
        status={{ label: meta.label, tone: meta.tone }}
      />

      {/* شريط الحالة — ما المطلوب منك الآن، لا ما حدث سابقًا */}
      {row.rejectionReason && row.workflow === "in_progress" ? (
        <Alert tone="danger" title="أُعيد إليك مع ملاحظة" className="mb-4">{row.rejectionReason}</Alert>
      ) : null}
      {row.workflow === "ready_for_review" && isChief ? (
        <Alert tone="warning" title="ينتظر مراجعتك" className="mb-4">
          رفعه الكاتب في {dt(detail.submittedAt)}. اقرأه ثمّ أعِده بملاحظة أو انشره.
        </Alert>
      ) : null}
      {row.workflow === "ready_for_review" && !isChief ? (
        <Alert tone="info" title="رُفع إلى المراجعة" className="mb-4">
          عند رئيس التحرير الآن. ستُخطَر إن أُعيد إليك بملاحظة.
        </Alert>
      ) : null}

      {/* ══ شريطُ المرحلة ══ */}
      <div className="nwe-bar">
        {canSubmit && !isChief ? (
          <Button variant="primary" size="md" loading={pending} onClick={() => run(() => submitForReview(row.id))}>
            <PaperPlaneTilt size={18} />رفع إلى المراجعة
          </Button>
        ) : null}
        {isChief && row.workflow !== "published" ? (
          <Button
            variant="primary" size="md" loading={pending}
            onClick={() => gaps.length
              ? toast.error(`لا يُنشَر خبرٌ ناقص: ينقصه ${gaps.join("، ")}.`)
              : run(() => setNewsStatus(row.id, "publish"))}
          >
            {gaps.length ? <WarningCircle size={18} /> : <Megaphone size={18} />}
            نشر
          </Button>
        ) : null}
        {menu.length ? <DropdownMenu ariaLabel="أفعالٌ أخرى" groups={[{ items: menu }]} /> : null}
        {/* النقصُ خبرٌ لا زرّ: كان اسمُ الزرّ نفسُه يتحوّل إلى رسالة خطأ فيُقرأ أمرًا.
            ويُدفَع إلى طرف الشريط كي لا يفصل الفعلَ عن قائمته. */}
        {isChief && gaps.length ? (
          <>
            <span className="nwe-bar-sp" />
            <Badge tone="warning" dot>ينقصه: {gaps.join("، ")}</Badge>
          </>
        ) : null}
      </div>

      <Segmented
        className="mb-4"
        wide
        aria-label="لوحا الخبر"
        items={[{ value: "write", label: "الكتابة" }, { value: "manage", label: "الإدارة" }]}
        value={view}
        onValueChange={(v) => setView(v as "write" | "manage")}
      />

      {view === "write" ? (
        <div className="nwe-stack">
          {/* **حاويةٌ كحاوية المتن** بأمر المالك ٢٠٢٦-٠٩-٢٤. وكنتُ نزعتُها لأنّ رأسَها
              وحشوَها يكلّفان نحوَ ‏٥٠px، فعرضتُ عليه الكلفةَ فاختار الاتّساق: لوحان
              متشابهان خيرٌ من لوحٍ عارٍ يجاور لوحًا معنونًا. */}
          <SectionCard title="ترويسة الخبر" icon={<Newspaper />}>
            <div className="form-grid">
              {may("title") ? (
                <Field className="form-full" label="العنوان" icon={<Newspaper />} innerIcon={<PencilSimple />}
                  placeholder="مشاركة أدِيب في…"
                  required maxLength={TITLE_MAX}
                  value={f.title} onChange={(e) => edit({ title: e.target.value })}
                  error={f.title.length > TITLE_MAX
                    ? `يزيد ${f.title.length - TITLE_MAX} حرفًا. عنوانٌ بهذا الطول يأخذ أربعةَ أسطرٍ على الجوّال.`
                    : undefined}
                  helper={`${f.title.length} من ${TITLE_MAX} حرفًا. وما زاد يأخذ سطرًا رابعًا في صفحة الخبر على الجوّال.`} />
              ) : <ReadOnly label="العنوان" value={row.title} />}

              {/* **علامةٌ حمراء** لأنّه إجباريٌّ فعلًا: تمنعه الواجهةُ وتمنعه القاعدةُ
                  بقيد `news_publish_guard`. وكان الحقلُ صامتًا عن ذلك فلا يعرفه
                  المحرّرُ إلّا حين يُردّ عند النشر.
                  و`maxLength` يمنع الزيادةَ ولا يبتر ما كُتب: ستّةُ ملخّصاتٍ حيّةٍ
                  فوق الحدّ، تُعرَض كاملةً ويُحذف منها بيدِ صاحبها. */}
              {may("summary") ? (
                <Textarea className="form-full" label="الملخّص" icon={<TextAlignLeft />} innerIcon={<PencilSimple />}
                  rows={2} required maxLength={SUMMARY_MAX}
                  placeholder="سطران يُغريان بالقراءة، يظهران في بطاقة الخبر."
                  value={f.summary} onChange={(e) => edit({ summary: e.target.value })}
                  error={f.summary.length > SUMMARY_MAX
                    ? `يزيد ${f.summary.length - SUMMARY_MAX} حرفًا عمّا تسعه البطاقة، فيُقصّ فيها. احذف منه.`
                    : undefined}
                  helper={`${f.summary.length} من ${SUMMARY_MAX} حرفًا. وهو وعدٌ للقارئ لا أوّلُ الخبر: يظهر في البطاقة وتحت العنوان، فإن كرّر أوّلَ سطرٍ من المتن قرأه الزائر مرّتين.`} />
              ) : <ReadOnly label="الملخّص" value={row.summary ?? "—"} />}
            </div>
          </SectionCard>

          <SectionCard title="المتن" icon={<TextAlignLeft />}>
            {may("content") ? (
              <>
                <p className="nwe-meta mb-2">
                  {wordCount(sectionsToText(f.sections))} كلمة، نحو {readingMinutes(sectionsToText(f.sections))} دقيقة قراءة
                </p>
                <SectionsEditor value={f.sections} onChange={(v) => edit({ sections: v })} />
              </>
            ) : <ReadOnly label="المتن" value={row.content ?? "—"} multiline />}
          </SectionCard>

          <Accordion
            items={[
              { q: "تفاصيل النشر", a: publishDetails },
              { q: detail.galleryImages.length ? `الوسائط (${detail.galleryImages.length} صور)` : "الوسائط", a: media },
            ]}
          />
        </div>
      ) : (
        <Accordion
          items={[
            ...(isChief ? [{ q: detail.assignments.length ? `الطاقم (${detail.assignments.length})` : "الطاقم", a: crew }] : []),
            { q: detail.comments.length ? `الغرفة (${detail.comments.length})` : "الغرفة", a: roomTalk },
            ...(isChief ? [{ q: row.pendingComments ? `الجمهور (${row.pendingComments} ينتظر)` : "الجمهور", a: audience }] : []),
            { q: "السجلّ", a: history },
          ]}
        />
      )}

      {/* مدخلا الملفّات خارج الدرج: يبقيان مركَّبَين مهما طُوي، فيعمل النقرُ البرمجيّ عليهما. */}
      <input ref={coverInput} type="file" accept={IMAGE_RULE.accept} hidden
        onChange={(e) => { onCover(e.target.files); e.target.value = ""; }} />
      <input ref={galleryInput} type="file" accept={IMAGE_RULE.accept} multiple hidden
        onChange={(e) => { onGallery(e.target.files); e.target.value = ""; }} />

      {/* ── نافذة التكليف ── */}
      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="تكليف الطاقم"
        description="من يكتب هذا الخبر، وأيّ الحقول يملك تحريرها."
        busy={pending}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setAssignOpen(false)} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" loading={pending}
              onClick={() => startPending(async () => {
                const r = await assignWriters(row.id, aWriters, aFields, aNotes);
                if (r.ok) { toast.success(r.message); setAssignOpen(false); router.refresh(); } else toast.error(r.message);
              })}>
              حفظ التكليف
            </Button>
          </>
        }
      >
        <div>
          <label className="fld-label nwe-pick-label">الكتّاب</label>
          <div className="nwe-pick-list">
            {members.map((m) => (
              <Checkbox key={m.value} checked={aWriters.includes(m.value)}
                onChange={(e) => setAWriters((prev) => e.target.checked
                  ? [...prev, m.value]
                  : prev.filter((x) => x !== m.value))}>
                {m.label}
              </Checkbox>
            ))}
          </div>
        </div>

        <div>
          <label className="fld-label nwe-pick-label">
            الحقول التي يملكها الكاتب
          </label>
          <div className="nwe-pick-grid">
            {FIELD_VALUES.map((k) => (
              <Checkbox key={k} checked={aFields.includes(k)}
                onChange={(e) => setAFields((prev) => e.target.checked
                  ? [...prev, k]
                  : prev.filter((x) => x !== k))}>
                {FIELD_META[k].label}
              </Checkbox>
            ))}
          </div>
        </div>

        <Textarea label="ملاحظة التكليف" icon={<TextAlignLeft />} innerIcon={<PencilSimple />} rows={3}
          placeholder="ما المطلوب من الكاتب تحديدًا…"
          value={aNotes} onChange={(e) => setANotes(e.target.value)} optional />
      </Modal>

      {/* ── نافذة الإعادة ── */}
      <Modal
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        title="إعادة إلى الكاتب"
        description="الملاحظة شرطٌ لا خيار: الإعادة بلا سببٍ لا تُفيد الكاتب."
        busy={pending}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setReturnOpen(false)} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" loading={pending} disabled={!returnNotes.trim()}
              onClick={() => startPending(async () => {
                const r = await returnForEdits(row.id, returnNotes);
                if (r.ok) { toast.success(r.message); setReturnOpen(false); router.refresh(); } else toast.error(r.message);
              })}>
              إعادة
            </Button>
          </>
        }
      >
        <Textarea label="ما ينبغي تعديله" icon={<ArrowUUpLeft />} innerIcon={<PencilSimple />} rows={5}
          placeholder="اذكر ما ينقص المادّة بوضوح…"
          value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} required />
      </Modal>

      <ConfirmDialog
        open={confirmCover}
        onClose={() => setConfirmCover(false)}
        tone="danger"
        icon={<Trash />}
        title="حذف الغلاف؟"
        text="سيُحذف الملفّ من المخزن ولا يُسترجع. ولا يُنشَر الخبر بلا غلاف."
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => startPending(async () => {
          const r = await removeCover(row.id);
          if (r.ok) { toast.success(r.message); setConfirmCover(false); router.refresh(); } else toast.error(r.message);
        })}
      />

      <ConfirmDialog
        open={killImage !== null}
        onClose={() => setKillImage(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الصورة؟"
        text="سيُحذف الملفّ من المخزن ولا يُسترجع."
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => startPending(async () => {
          if (killImage === null) return;
          const r = await removeGalleryImage(row.id, killImage);
          if (r.ok) { toast.success(r.message); setKillImage(null); router.refresh(); } else toast.error(r.message);
        })}
      />

      {/* حفظةُ المحرّر — تلاحق الكاتبَ أينما مرّر في شاشةٍ طويلة، ووجودُها نفسُه هو التنبيه */}
      {mayAny ? (
        <SaveBar open={dirty}>
          <Button variant="primary" size="md" onClick={save} loading={pending}>
            <FloppyDisk size={18} />حفظ
          </Button>
        </SaveBar>
      ) : null}
    </>
  );
}

/** حقلٌ لا يملكه هذا الفاعل — يُعرض ولا يُحرّر، فيرى الكاتب السياق ولا يعبث به. */
function ReadOnly({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="form-full">
      <label className="fld-label nwe-ro-label">
        {label} <span className="nwe-meta">(لم تُكلَّف به)</span>
      </label>
      <div className="nwe-ro-value" data-multiline={!!multiline}>{value}</div>
    </div>
  );
}
