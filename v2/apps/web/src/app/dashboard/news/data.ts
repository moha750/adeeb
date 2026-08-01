/**
 * قراءات غرفة التحرير — خادميّة حصرًا (مفتاح الخدمة بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح).
 * تتجاوز RLS عمدًا لأنّ الغرفة ترى المسودّات؛ والحراسة قبلها في `getNewsroomActor`،
 * والترشيح بحسب الدور يجري هنا صراحةً: **الكاتب لا يرى إلّا ما كُلِّف به**.
 */
import "server-only";
import { newsService, ENV_MISSING, type NewsroomActor } from "@/lib/news/authz";
import type { AssignmentStatus, Category, Workflow } from "./vocab";

/* ══ صفّ القائمة ═════════════════════════════════════════════════════ */

export type WriterChip = {
  id: string;
  name: string;
  avatarUrl: string | null;
  gender: string | null;
  status: AssignmentStatus;
};

export type NewsRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: Category;
  workflow: Workflow;
  isFeatured: boolean;
  imageUrl: string | null;
  galleryCount: number;
  authors: string[];
  tags: string[];
  committeeId: number | null;
  committeeName: string | null;
  views: number;
  likes: number;
  comments: number;
  pendingComments: number;
  writers: WriterChip[];
  /** ملاحظة الإعادة القائمة — تُبرز الصفّ للكاتب: عليك عملٌ الآن. */
  rejectionReason: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  wordCount: number;
  /** هل ينقصه شيءٌ للنشر؟ يُحسب هنا مرّةً فلا يُعاد في كلّ بطاقة. */
  content: string | null;
};

/**
 * أخبار الغرفة كما يراها هذا الفاعل.
 * رئيس التحرير يرى كلّ شيء؛ والكاتب يرى ما كُلِّف به أو أنشأه وحده.
 */
export async function getNews(actor: NewsroomActor): Promise<{ rows: NewsRow[]; error: string | null }> {
  const sb = newsService();
  if (!sb) return { rows: [], error: ENV_MISSING };

  // الكاتب: نجمع مفاتيح ما يخصّه أوّلًا، فلا نجلب ما لا حقّ له في رؤيته أصلًا.
  let allowed: string[] | null = null;
  if (!actor.isChief) {
    const [mine, made] = await Promise.all([
      sb.from("news_writer_assignments").select("news_id").eq("writer_id", actor.userId).neq("status", "declined"),
      sb.from("news").select("id").eq("created_by", actor.userId),
    ]);
    allowed = [...new Set([
      ...(mine.data ?? []).map((a) => a.news_id as string),
      ...(made.data ?? []).map((n) => n.id as string),
    ])];
    if (allowed.length === 0) return { rows: [], error: null };
  }

  // نصٌّ حرفيّ واحد لا مجموعٌ بـ`+`: مُحلّل أنواع Supabase يقرأ الحرفيّ وحده،
  // وأيّ تركيبٍ يُسقط الاستدلال إلى `GenericStringError`.
  let q = sb
    .from("news")
    .select("id, title, slug, summary, content, category, workflow_status, is_featured, image_url, gallery_images, authors, tags, committee_id, views, likes_count, rejection_reason, published_at, updated_at, created_at")
    .order("updated_at", { ascending: false });
  if (allowed) q = q.in("id", allowed);

  const [nRes, cRes] = await Promise.all([q, sb.from("committees").select("id, committee_name_ar")]);
  if (nRes.error) return { rows: [], error: nRes.error.message };

  const ids = (nRes.data ?? []).map((n) => n.id as string);
  const [aRes, pcRes] = ids.length
    ? await Promise.all([
        sb.from("news_writer_assignments").select("news_id, writer_id, status").in("news_id", ids),
        sb.from("news_public_comments").select("news_id, is_approved").in("news_id", ids),
      ])
    : [{ data: [] as never[] }, { data: [] as never[] }];

  const writerIds = [...new Set((aRes.data ?? []).map((a: { writer_id: string }) => a.writer_id))];
  const { data: profiles } = writerIds.length
    ? await sb.from("profiles").select("id, full_name, avatar_url, gender").in("id", writerIds)
    : { data: [] as { id: string; full_name: string; avatar_url: string | null; gender: string | null }[] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const committeeById = new Map((cRes.data ?? []).map((c) => [c.id as number, c.committee_name_ar as string]));

  const writersByNews = new Map<string, WriterChip[]>();
  for (const a of (aRes.data ?? []) as { news_id: string; writer_id: string; status: AssignmentStatus }[]) {
    const p = profileById.get(a.writer_id);
    const list = writersByNews.get(a.news_id) ?? [];
    list.push({
      id: a.writer_id,
      name: p?.full_name ?? "—",
      avatarUrl: p?.avatar_url ?? null,
      gender: p?.gender ?? null,
      status: a.status,
    });
    writersByNews.set(a.news_id, list);
  }

  const commentsByNews = new Map<string, { total: number; pending: number }>();
  for (const c of (pcRes.data ?? []) as { news_id: string; is_approved: boolean }[]) {
    const cur = commentsByNews.get(c.news_id) ?? { total: 0, pending: 0 };
    cur.total += 1;
    if (!c.is_approved) cur.pending += 1;
    commentsByNews.set(c.news_id, cur);
  }

  const rows: NewsRow[] = (nRes.data ?? []).map((n) => {
    const counts = commentsByNews.get(n.id) ?? { total: 0, pending: 0 };
    const content = (n.content as string | null) ?? null;
    return {
      id: n.id,
      title: n.title,
      slug: n.slug ?? "",
      summary: n.summary ?? null,
      content,
      category: (n.category ?? "coverage") as Category,
      workflow: (n.workflow_status ?? "draft") as Workflow,
      isFeatured: Boolean(n.is_featured),
      imageUrl: n.image_url ?? null,
      galleryCount: (n.gallery_images as string[] | null)?.length ?? 0,
      authors: (n.authors as string[] | null) ?? [],
      tags: (n.tags as string[] | null) ?? [],
      committeeId: n.committee_id ?? null,
      committeeName: n.committee_id ? committeeById.get(n.committee_id) ?? null : null,
      views: n.views ?? 0,
      likes: n.likes_count ?? 0,
      comments: counts.total,
      pendingComments: counts.pending,
      writers: writersByNews.get(n.id) ?? [],
      rejectionReason: n.rejection_reason ?? null,
      publishedAt: n.published_at ?? null,
      updatedAt: n.updated_at ?? null,
      createdAt: n.created_at ?? null,
      wordCount: (content ?? "").trim().split(/\s+/).filter(Boolean).length,
    };
  });

  return { rows, error: null };
}

/* ══ الخبر الواحد (المحرّر) ══════════════════════════════════════════ */

export type AssignmentRow = {
  writerId: string;
  writerName: string;
  avatarUrl: string | null;
  gender: string | null;
  status: AssignmentStatus;
  fields: string[];
  notes: string | null;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export type CollabComment = {
  id: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  gender: string | null;
  text: string;
  parentId: string | null;
  createdAt: string;
};

export type LogEntry = {
  id: string;
  action: string;
  userName: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

export type PublicComment = {
  id: string;
  who: string;
  isGuest: boolean;
  content: string;
  isApproved: boolean;
  createdAt: string;
};

export type NewsDetail = {
  row: NewsRow;
  coverPhotographer: string | null;
  galleryImages: string[];
  galleryPhotographers: string[];
  reviewNotes: string | null;
  submittedAt: string | null;
  assignments: AssignmentRow[];
  comments: CollabComment[];
  publicComments: PublicComment[];
  log: LogEntry[];
  /** حقول هذا الفاعل — رئيس التحرير يملكها كلّها، والكاتب ما كُلِّف به. */
  editableFields: string[];
};

export async function getNewsDetail(
  id: string, actor: NewsroomActor,
): Promise<{ detail: NewsDetail | null; error: string | null }> {
  const sb = newsService();
  if (!sb) return { detail: null, error: ENV_MISSING };

  const { rows, error } = await getNews(actor);
  if (error) return { detail: null, error };
  const row = rows.find((r) => r.id === id);
  if (!row) return { detail: null, error: null };

  const [extraRes, aRes, cRes, lRes, pcRes] = await Promise.all([
    sb.from("news")
      .select("cover_photographer, gallery_images, gallery_photographers, review_notes, submitted_at")
      .eq("id", id).maybeSingle(),
    sb.from("news_writer_assignments")
      .select("writer_id, status, assigned_fields, assignment_notes, assigned_at, started_at, completed_at")
      .eq("news_id", id).order("assigned_at", { ascending: true }),
    sb.from("news_collaboration_comments")
      .select("id, user_id, comment_text, parent_comment_id, created_at")
      .eq("news_id", id).is("deleted_at", null).order("created_at", { ascending: true }),
    sb.from("news_activity_log")
      .select("id, user_id, action, details, created_at")
      .eq("news_id", id).order("created_at", { ascending: false }).limit(50),
    sb.from("news_public_comments")
      .select("id, user_id, guest_name, content, is_approved, created_at")
      .eq("news_id", id).order("created_at", { ascending: false }),
  ]);

  const people = [...new Set([
    ...(aRes.data ?? []).map((a) => a.writer_id as string),
    ...(cRes.data ?? []).map((c) => c.user_id as string),
    ...(lRes.data ?? []).map((l) => l.user_id as string).filter(Boolean),
    ...(pcRes.data ?? []).map((c) => c.user_id as string).filter(Boolean),
  ])];
  const { data: profiles } = people.length
    ? await sb.from("profiles").select("id, full_name, avatar_url, gender").in("id", people)
    : { data: [] as { id: string; full_name: string; avatar_url: string | null; gender: string | null }[] };
  const by = new Map((profiles ?? []).map((p) => [p.id, p]));

  const assignments: AssignmentRow[] = (aRes.data ?? []).map((a) => {
    const p = by.get(a.writer_id);
    return {
      writerId: a.writer_id,
      writerName: p?.full_name ?? "—",
      avatarUrl: p?.avatar_url ?? null,
      gender: p?.gender ?? null,
      status: a.status as AssignmentStatus,
      fields: Array.isArray(a.assigned_fields) ? (a.assigned_fields as string[]) : [],
      notes: a.assignment_notes ?? null,
      assignedAt: a.assigned_at ?? null,
      startedAt: a.started_at ?? null,
      completedAt: a.completed_at ?? null,
    };
  });

  // حقول الفاعل: الرئيس يملكها كلّها؛ والكاتب ما اجتمع له من تكاليفه على هذا الخبر.
  const mine = assignments.find((a) => a.writerId === actor.userId);
  const editableFields = actor.isChief ? ["*"] : mine?.fields ?? [];

  return {
    detail: {
      row,
      coverPhotographer: extraRes.data?.cover_photographer ?? null,
      galleryImages: (extraRes.data?.gallery_images as string[] | null) ?? [],
      galleryPhotographers: (extraRes.data?.gallery_photographers as string[] | null) ?? [],
      reviewNotes: extraRes.data?.review_notes ?? null,
      submittedAt: extraRes.data?.submitted_at ?? null,
      assignments,
      comments: (cRes.data ?? []).map((c) => {
        const p = by.get(c.user_id);
        return {
          id: c.id,
          userId: c.user_id,
          userName: p?.full_name ?? "—",
          avatarUrl: p?.avatar_url ?? null,
          gender: p?.gender ?? null,
          text: c.comment_text,
          parentId: c.parent_comment_id ?? null,
          createdAt: c.created_at,
        };
      }),
      publicComments: (pcRes.data ?? []).map((c) => ({
        id: c.id,
        who: c.user_id ? by.get(c.user_id)?.full_name ?? "عضو" : c.guest_name ?? "زائر",
        isGuest: !c.user_id,
        content: c.content,
        isApproved: Boolean(c.is_approved),
        createdAt: c.created_at,
      })),
      log: (lRes.data ?? []).map((l) => ({
        id: l.id,
        action: l.action,
        userName: l.user_id ? by.get(l.user_id)?.full_name ?? null : null,
        details: (l.details ?? {}) as Record<string, unknown>,
        createdAt: l.created_at,
      })),
      editableFields,
    },
    error: null,
  };
}

/* ══ خيارات النماذج ══════════════════════════════════════════════════ */

export type Option = { value: string; label: string };

/** الأعضاء النشطون وحدهم يصلحون كتّابًا — الموقوف لا يُكلَّف. */
export async function getMemberOptions(): Promise<Option[]> {
  const sb = newsService();
  if (!sb) return [];
  const { data } = await sb
    .from("profiles").select("id, full_name")
    .eq("account_status", "active").order("full_name", { ascending: true });
  return (data ?? []).map((p) => ({ value: p.id, label: p.full_name }));
}

export async function getCommitteeOptions(): Promise<Option[]> {
  const sb = newsService();
  if (!sb) return [];
  const { data } = await sb
    .from("committees").select("id, committee_name_ar")
    .eq("is_active", true).order("id", { ascending: true });
  return (data ?? []).map((c) => ({ value: String(c.id), label: c.committee_name_ar }));
}
