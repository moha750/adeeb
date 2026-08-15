"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Checkbox, Field, Select, Textarea, Modal } from "@adeeb/design-system";
import {
  Newspaper, TextAlignLeft, Tag, UsersThree, ClipboardText, Image as ImageIcon, Images,
  PaperPlaneTilt, Megaphone, Archive, ChatCircleDots, ClockCounterClockwise, Camera, Users,
  FloppyDisk, LinkSimple, Hash,
} from "@phosphor-icons/react";
import { ArrowRight } from "@/app/_components/glyphs";
import {
  PencilSimple, UploadSimple, Trash, EyeSlash, ArrowUUpLeft, Star, CheckCircle, XCircle,
  WarningCircle,
} from "@/app/_components/glyphs";
import { Tabs } from "../../_components/Tabs";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { EmptyState } from "../../_components/EmptyState";
import { Avatar } from "../../_components/Avatar";
import { useToast } from "../../_components/ToastProvider";
import { createClient } from "@/lib/supabase/client";
import { NEWS_BUCKET } from "@/lib/news/bucket";
import type { NewsDetail, Option } from "../data";
import {
  ASSIGNMENT_META, CATEGORY_META, CATEGORY_OPTIONS, DEFAULT_FIELDS, FIELD_META, FIELD_VALUES,
  WORKFLOW_META, missingForPublish, readingMinutes, wordCount,
  type Category, type FieldKey,
} from "../vocab";
import {
  addCollabComment, addGalleryImage, assignWriters, createImageUploadUrl, deleteCollabComment,
  moderatePublicComment, removeCover, removeGalleryImage, returnForEdits, saveNews,
  setCover, setNewsStatus, submitForReview, toggleFeatured,
} from "../actions";
import { Breadcrumb } from "../../_shell/Breadcrumb";
import { UPLOAD_RULES, checkFile } from "@/lib/upload";

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
  detail, members, committees, isChief, meId,
}: {
  detail: NewsDetail; members: Option[]; committees: Option[]; isChief: boolean; meId: string;
}) {
  const { row } = detail;
  const toast = useToast();
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const [pending, startPending] = useTransition();
  const [tab, setTab] = useState("copy");

  /* ── ما الذي يملك هذا الفاعل تحريره؟ ─────────────────────────────
     الواجهة تخفي ما لا يملكه، والخادم يرفضه ثانيةً — فالإخفاء راحةٌ لا حراسة. */
  const may = (f: FieldKey) => isChief || detail.editableFields.includes(f);
  const mayAny = FIELD_VALUES.some(may);

  /* ── حالة النموذج ─────────────────────────────────────────────── */
  const [f, setF] = useState({
    title: row.title,
    slug: row.slug,
    summary: row.summary ?? "",
    content: row.content ?? "",
    category: row.category,
    tags: row.tags.join("، "),
    authors: row.authors.join("، "),
    committeeId: row.committeeId ? String(row.committeeId) : "",
    coverPhotographer: detail.coverPhotographer ?? "",
  });
  const patch = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));
  const [dirty, setDirty] = useState(false);
  const edit = (p: Partial<typeof f>) => { patch(p); setDirty(true); };

  const splitList = (v: string) => v.split(/[،,\n]/).map((s) => s.trim()).filter(Boolean);

  const save = () => startPending(async () => {
    const r = await saveNews(row.id, {
      ...(may("title") ? { title: f.title } : {}),
      ...(may("summary") ? { summary: f.summary || null } : {}),
      ...(may("content") ? { content: f.content } : {}),
      ...(may("category") ? { category: f.category } : {}),
      ...(may("tags") ? { tags: splitList(f.tags) } : {}),
      ...(may("authors") ? { authors: splitList(f.authors) } : {}),
      ...(may("cover_photographer") ? { coverPhotographer: f.coverPhotographer || null } : {}),
      ...(isChief ? { slug: f.slug, committeeId: f.committeeId ? Number(f.committeeId) : null } : {}),
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
      if (await upload(file, "gallery", f.coverPhotographer || undefined)) done += 1;
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

  const gaps = missingForPublish({
    summary: f.summary, imageUrl: row.imageUrl, authors: splitList(f.authors), content: f.content,
  });
  const meta = WORKFLOW_META[row.workflow];
  const canSubmit = ["draft", "assigned", "in_progress"].includes(row.workflow);

  const tabs = [
    { value: "copy", label: "المادّة" },
    { value: "media", label: "الوسائط", badge: row.galleryCount ? String(row.galleryCount) : undefined },
    ...(isChief ? [{ value: "crew", label: "الطاقم", badge: detail.assignments.length ? String(detail.assignments.length) : undefined }] : []),
    { value: "room", label: "الغرفة", badge: detail.comments.length ? String(detail.comments.length) : undefined },
    ...(isChief ? [{ value: "public", label: "الجمهور", badge: row.pendingComments ? String(row.pendingComments) : undefined }] : []),
    { value: "log", label: "السجلّ" },
  ];

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb leaf={row.title} />
          <h1 style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {row.title}
            <Badge tone={meta.tone} dot>{meta.label}</Badge>
            {row.isFeatured ? <Star size={18} className="text-warning" aria-label="مميّز" /> : null}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="ghost" size="md" onClick={() => router.push("/dashboard/news")}>
            <ArrowRight size={18} />رجوع
          </Button>
          {mayAny ? (
            <Button variant={dirty ? "primary" : "ghost"} size="md" onClick={save} loading={pending} disabled={!dirty}>
              <FloppyDisk size={18} />حفظ
            </Button>
          ) : null}
        </div>
      </div>

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

      {/* أفعال المرحلة */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {canSubmit && !isChief ? (
          <Button variant="primary" size="md" loading={pending} onClick={() => run(() => submitForReview(row.id))}>
            <PaperPlaneTilt size={18} />رفع إلى المراجعة
          </Button>
        ) : null}
        {isChief ? (
          <>
            {row.workflow === "ready_for_review" ? (
              <Button variant="ghost" size="md" onClick={() => { setReturnNotes(""); setReturnOpen(true); }}>
                <ArrowUUpLeft size={18} />إعادة بملاحظة
              </Button>
            ) : null}
            {row.workflow === "published" ? (
              <Button variant="ghost" size="md" loading={pending} onClick={() => run(() => setNewsStatus(row.id, "unpublish"))}>
                <EyeSlash size={18} />إلغاء النشر
              </Button>
            ) : (
              <Button
                variant="primary" size="md" loading={pending}
                onClick={() => gaps.length
                  ? toast.error(`لا يُنشَر خبرٌ ناقص: ينقصه ${gaps.join("، ")}.`)
                  : run(() => setNewsStatus(row.id, "publish"))}
              >
                {gaps.length ? <WarningCircle size={18} /> : <Megaphone size={18} />}
                {gaps.length ? `ينقصه: ${gaps.join("، ")}` : "نشر"}
              </Button>
            )}
            <Button variant="ghost" size="md" loading={pending} onClick={() => run(() => toggleFeatured(row.id, !row.isFeatured))}>
              <Star size={18} />{row.isFeatured ? "إلغاء التمييز" : "تمييز"}
            </Button>
            {row.workflow === "archived" ? (
              <Button variant="ghost" size="md" loading={pending} onClick={() => run(() => setNewsStatus(row.id, "restore"))}>
                <ArrowUUpLeft size={18} />إعادة من الأرشيف
              </Button>
            ) : (
              <Button variant="ghost" size="md" loading={pending} onClick={() => run(() => setNewsStatus(row.id, "archive"))}>
                <Archive size={18} />أرشفة
              </Button>
            )}
          </>
        ) : null}
      </div>

      <Tabs items={tabs} value={tab} onValueChange={setTab} variant="underline" className="mb-4" />

      {/* ══ المادّة ══ */}
      {tab === "copy" ? (
        <div className="form-grid">
          {may("title") ? (
            <Field className="form-full" label="العنوان" icon={<Newspaper />} innerIcon={<PencilSimple />}
              placeholder="مشاركة أدِيب في…"
              value={f.title} onChange={(e) => edit({ title: e.target.value })} required />
          ) : <ReadOnly label="العنوان" value={row.title} />}

          {isChief ? (
            <Field className="form-full" label="المعرّف (رابط الخبر)" icon={<LinkSimple />} innerIcon={<Hash />}
              placeholder="news-…"
              value={f.slug} onChange={(e) => edit({ slug: e.target.value })}
              helper="يظهر في رابط الخبر العامّ، لا يُغيَّر بعد النشر (روابطه منشورةٌ في الخارج)." />
          ) : null}

          {may("summary") ? (
            <Textarea className="form-full" label="الملخّص" icon={<TextAlignLeft />} innerIcon={<PencilSimple />}
              rows={2} placeholder="سطران يُغريان بالقراءة، يظهران في بطاقة الخبر."
              value={f.summary} onChange={(e) => edit({ summary: e.target.value })}
              helper="مطلوبٌ قبل النشر." />
          ) : <ReadOnly label="الملخّص" value={row.summary ?? "—"} />}

          {may("content") ? (
            <Textarea className="form-full" label="المتن" icon={<TextAlignLeft />} innerIcon={<PencilSimple />}
              rows={16} placeholder="نصّ الخبر…"
              value={f.content} onChange={(e) => edit({ content: e.target.value })}
              helper={`${wordCount(f.content)} كلمة، نحو ${readingMinutes(f.content)} دقيقة قراءة`} />
          ) : <ReadOnly label="المتن" value={row.content ?? "—"} multiline />}

          {may("authors") ? (
            <Field className="form-full" label="الكتّاب" icon={<Users />} innerIcon={<PencilSimple />}
              placeholder="الحَوراء أحمد الملبو، نوره عامر الدوسري"
              value={f.authors} onChange={(e) => edit({ authors: e.target.value })}
              helper="افصل بينهم بفاصلة، أوّلهم هو الكاتب المعروض في البطاقة." />
          ) : <ReadOnly label="الكتّاب" value={row.authors.join("، ") || "—"} />}

          {may("category") ? (
            <Select label="القسم" icon={<ClipboardText />} options={CATEGORY_OPTIONS} value={f.category}
              onValueChange={(v) => edit({ category: v as Category })}
              helper={CATEGORY_META[f.category].hint} />
          ) : <ReadOnly label="القسم" value={CATEGORY_META[row.category].label} />}

          {isChief ? (
            <Select label="اللجنة" icon={<UsersThree />}
              options={[{ value: "", label: "بلا لجنة" }, ...committees]}
              value={f.committeeId} onValueChange={(v) => edit({ committeeId: v })} optional />
          ) : null}

          {may("tags") ? (
            <Field className="form-full" label="الوسوم" icon={<Tag />} innerIcon={<PencilSimple />}
              placeholder="ورشة، تصوير، شراكة"
              value={f.tags} onChange={(e) => edit({ tags: e.target.value })}
              helper="افصل بينها بفاصلة." optional />
          ) : null}
        </div>
      ) : null}

      {/* ══ الوسائط ══ */}
      {tab === "media" ? (
        <div style={{ display: "grid", gap: 22 }}>
          <section>
            <h3 style={{ marginBottom: 10 }}>صورة الغلاف</h3>
            {row.imageUrl ? (
              <div style={{ display: "grid", gap: 10, maxWidth: 460 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.imageUrl} alt="غلاف الخبر" style={{ width: "100%", borderRadius: "var(--radius-sm)", display: "block" }} />
                {may("cover_photographer") ? (
                  <Field label="مصوّر الغلاف" icon={<Camera />} innerIcon={<PencilSimple />}
                    placeholder="روان ناصر الهنداس"
                    value={f.coverPhotographer} onChange={(e) => edit({ coverPhotographer: e.target.value })} optional />
                ) : null}
                {may("image_url") ? (
                  <div style={{ display: "flex", gap: 8 }}>
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
            <input ref={coverInput} type="file" accept={IMAGE_RULE.accept} hidden
              onChange={(e) => { onCover(e.target.files); e.target.value = ""; }} />
          </section>

          <section>
            <h3 style={{ marginBottom: 10 }}>معرض الصور</h3>
            {detail.galleryImages.length ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                {detail.galleryImages.map((src, i) => (
                  <figure key={src} style={{ margin: 0, display: "grid", gap: 6 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`صورة ${i + 1}`} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: "var(--radius-xs)", display: "block" }} />
                    <figcaption className="text-content-muted" style={{ fontSize: ".8em" }}>
                      {detail.galleryPhotographers[i] || "بلا مصوّر"}
                    </figcaption>
                    {may("gallery_images") ? (
                      <Button variant="ghost" size="sm" onClick={() => setKillImage(i)}><Trash size={14} />حذف</Button>
                    ) : null}
                  </figure>
                ))}
              </div>
            ) : (
              <p className="text-content-muted">لا صور في المعرض بعد.</p>
            )}
            {may("gallery_images") ? (
              <Button variant="ghost" size="md" style={{ marginTop: 12 }}
                onClick={() => galleryInput.current?.click()} loading={uploading > 0}>
                <Images size={18} />إضافة صور
              </Button>
            ) : null}
            <input ref={galleryInput} type="file" accept={IMAGE_RULE.accept} multiple hidden
              onChange={(e) => { onGallery(e.target.files); e.target.value = ""; }} />
          </section>
        </div>
      ) : null}

      {/* ══ الطاقم ══ */}
      {tab === "crew" && isChief ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <Button variant="primary" size="md" onClick={() => setAssignOpen(true)}>
              <UsersThree size={18} />{detail.assignments.length ? "تعديل التكليف" : "تكليف كاتب"}
            </Button>
          </div>
          {detail.assignments.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {detail.assignments.map((a) => (
                <div key={a.writerId} className="card" style={{ display: "flex", gap: 12, alignItems: "center", padding: 12 }}>
                  <Avatar name={a.writerName} src={a.avatarUrl ?? undefined} gender={a.gender} size="md" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{a.writerName}</b>
                    <div className="text-content-muted" style={{ fontSize: ".85em" }}>
                      {a.fields.map((x) => FIELD_META[x as FieldKey]?.label ?? x).join("، ") || "بلا حقول"}
                    </div>
                    {a.notes ? <div style={{ fontSize: ".85em", marginTop: 4 }}>{a.notes}</div> : null}
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
      ) : null}

      {/* ══ الغرفة — تعليقات التعاون ══ */}
      {tab === "room" ? (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <Textarea label="تعليق داخليّ" icon={<ChatCircleDots />} innerIcon={<PencilSimple />} rows={3}
              placeholder="ملاحظةٌ للطاقم، لا يراها الجمهور."
              value={comment} onChange={(e) => setComment(e.target.value)} />
            <div>
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
            <div style={{ display: "grid", gap: 10 }}>
              {detail.comments.map((c) => (
                <div key={c.id} className="card" style={{ display: "flex", gap: 12, padding: 12 }}>
                  <Avatar name={c.userName} src={c.avatarUrl ?? undefined} gender={c.gender} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                      <b>{c.userName}</b>
                      <span className="text-content-muted" style={{ fontSize: ".8em" }}>{dt(c.createdAt)}</span>
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{c.text}</div>
                  </div>
                  {c.userId === meId || isChief ? (
                    <Button variant="ghost" size="sm" onClick={() => run(() => deleteCollabComment(c.id))}>
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
      ) : null}

      {/* ══ الجمهور ══ */}
      {tab === "public" && isChief ? (
        detail.publicComments.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {detail.publicComments.map((c) => (
              <div key={c.id} className="card" style={{ display: "flex", gap: 12, padding: 12, alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                    <b>{c.who}</b>
                    {c.isGuest ? <Badge tone="neutral" variant="outline">زائر</Badge> : null}
                    <Badge tone={c.isApproved ? "success" : "warning"} dot>
                      {c.isApproved ? "منشور" : "ينتظر الإقرار"}
                    </Badge>
                    <span className="text-content-muted" style={{ fontSize: ".8em" }}>{dt(c.createdAt)}</span>
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{c.content}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
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
        )
      ) : null}

      {/* ══ السجلّ ══ */}
      {tab === "log" ? (
        detail.log.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {detail.log.map((l) => (
              <div key={l.id} className="card" style={{ display: "flex", gap: 12, padding: 10, alignItems: "baseline" }}>
                <ClockCounterClockwise size={16} className="text-content-muted" />
                <b style={{ minWidth: 140 }}>{ACTION_LABEL[l.action] ?? l.action}</b>
                <span className="text-content-muted" style={{ flex: 1 }}>{l.userName ?? "النظام"}</span>
                <span className="text-content-muted" style={{ fontSize: ".82em" }}>{dt(l.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState variant="soft" icon={<ClockCounterClockwise />} title="لا سجلّ بعد"
            description="يُكتب السجلّ عند كلّ تحوّلٍ في حالة الخبر." />
        )
      ) : null}

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
          <label className="fld-label" style={{ display: "block", marginBottom: 8 }}>الكتّاب</label>
          <div style={{ maxHeight: 220, overflowY: "auto", display: "grid", gap: 6 }}>
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
          <label className="fld-label" style={{ display: "block", marginBottom: 8 }}>
            الحقول التي يملكها الكاتب
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 6 }}>
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
    </>
  );
}

/** حقلٌ لا يملكه هذا الفاعل — يُعرض ولا يُحرّر، فيرى الكاتب السياق ولا يعبث به. */
function ReadOnly({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="form-full">
      <label className="fld-label" style={{ display: "block", marginBottom: 6 }}>
        {label} <span className="text-content-muted" style={{ fontSize: ".85em" }}>(لم تُكلَّف به)</span>
      </label>
      <div className="text-content-muted"
        style={{ whiteSpace: multiline ? "pre-wrap" : "normal", maxHeight: multiline ? 240 : undefined, overflowY: multiline ? "auto" : undefined }}>
        {value}
      </div>
    </div>
  );
}
