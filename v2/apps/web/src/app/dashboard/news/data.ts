/**
 * قراءات غرفة التحرير — خادميّة حصرًا (مفتاح الخدمة بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح).
 * تتجاوز RLS عمدًا لأنّ الغرفة ترى المسودّات؛ والحراسة قبلها في `getNewsroomActor`،
 * والترشيح بحسب الدور يجري هنا صراحةً: **الكاتب لا يرى إلّا ما كُلِّف به**.
 */
import "server-only";
import { fmtDateOnly } from "@/lib/dates";
import { newsService, ENV_MISSING, type NewsroomActor } from "@/lib/news/authz";
import { CLUB_LABEL, buildUnitOptions, unitNameIndex, unitValue, type UnitOption } from "@adeeb/core/org-unit";
import type { AssignmentStatus, Category, Workflow } from "./vocab";
import { isSections, type Section } from "@/lib/news/blocks";

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
  /** الجهةُ مرمَّزةً (`council:<id>` · `dept:<id>` · `comm:<id>` · "" للنادي) — قيمةُ المرشِّح والمنسدل. */
  unit: string;
  /** اسمُ الجهة كما يُعرَض — «نادي أدِيب» حين لا جهةَ بعينها، فلا يبقى الحقلُ صامتًا. */
  unitName: string;
  views: number;
  likes: number;
  comments: number;
  writers: WriterChip[];
  /** ملاحظة الإعادة القائمة — تُبرز الصفّ للكاتب: عليك عملٌ الآن. */
  rejectionReason: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  wordCount: number;
  /** هل ينقصه شيءٌ للنشر؟ يُحسب هنا مرّةً فلا يُعاد في كلّ بطاقة. */
  content: string | null;
  /** أقسامُ المتن مصرَّحةً، أو `null` لخبرٍ لم يُحوَّل بعدُ فيُشتقّ محرّرُه من نصّه. */
  sections: Section[] | null;
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
    .select("id, title, slug, summary, content, blocks, category, workflow_status, is_featured, image_url, gallery_images, authors, committee_id, department_id, council_id, views, likes_count, rejection_reason, published_at, updated_at, created_at")
    .order("updated_at", { ascending: false });
  if (allowed) q = q.in("id", allowed);

  // الهيكلةُ الثلاثةُ تُجلب معًا: الخبرُ يُنسَب إلى مجلسٍ أو قسمٍ أو لجنة، واسمُه يُقرأ
  // من فهرسِ الخيارات نفسِه — فما يراه في الجدول هو ما اختاره في المنسدل حرفًا بحرف.
  const [nRes, cRes, dRes, clRes] = await Promise.all([
    q,
    sb.from("committees").select("id, committee_name_ar, department_id"),
    sb.from("departments").select("id, name_ar, display_order"),
    sb.from("councils").select("id, name_ar"),
  ]);
  if (nRes.error) return { rows: [], error: nRes.error.message };

  const ids = (nRes.data ?? []).map((n) => n.id as string);
  const [aRes, pcRes] = ids.length
    ? await Promise.all([
        sb.from("news_writer_assignments").select("news_id, writer_id, status").in("news_id", ids),
        sb.from("news_public_comments").select("news_id").in("news_id", ids),
      ])
    : [{ data: [] as never[] }, { data: [] as never[] }];

  const writerIds = [...new Set((aRes.data ?? []).map((a: { writer_id: string }) => a.writer_id))];
  const { data: profiles } = writerIds.length
    ? await sb.from("profiles").select("id, full_name, avatar_url, gender").in("id", writerIds)
    : { data: [] as { id: string; full_name: string; avatar_url: string | null; gender: string | null }[] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const nameOf = unitNameIndex(
    buildUnitOptions({ councils: clRes.data, departments: dRes.data, committees: cRes.data }),
  );

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

  const commentsByNews = new Map<string, { total: number }>();
  for (const c of (pcRes.data ?? []) as { news_id: string }[]) {
    const cur = commentsByNews.get(c.news_id) ?? { total: 0 };
    cur.total += 1;
    commentsByNews.set(c.news_id, cur);
  }

  const unitOf = (n: { committee_id: number | null; department_id: number | null; council_id: string | null }) =>
    unitValue({ committeeId: n.committee_id, departmentId: n.department_id, councilId: n.council_id });

  const rows: NewsRow[] = (nRes.data ?? []).map((n) => {
    const counts = commentsByNews.get(n.id) ?? { total: 0 };
    const content = (n.content as string | null) ?? null;
    return {
      id: n.id,
      title: n.title,
      slug: n.slug ?? "",
      summary: n.summary ?? null,
      content,
      sections: isSections(n.blocks) ? n.blocks : null,
      category: (n.category ?? "coverage") as Category,
      workflow: (n.workflow_status ?? "draft") as Workflow,
      isFeatured: Boolean(n.is_featured),
      imageUrl: n.image_url ?? null,
      galleryCount: (n.gallery_images as string[] | null)?.length ?? 0,
      authors: (n.authors as string[] | null) ?? [],
      unit: unitOf(n),
      unitName: nameOf.get(unitOf(n)) ?? CLUB_LABEL,
      views: n.views ?? 0,
      likes: n.likes_count ?? 0,
      comments: counts.total,
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
  /** فعاليّةُ الخبر إن رُبط بها (`news.activity_id`، ٢٠٢٦-١١-١٥) */
  activityId: string | null;
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
      .select("cover_photographer, gallery_images, gallery_photographers, review_notes, submitted_at, activity_id")
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
      activityId: (extraRes.data as { activity_id?: string | null } | null)?.activity_id ?? null,
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
export type MemberOption = Option & { avatarUrl: string | null; gender: string | null; unit: string | null };
/**
 * ومعها الوجهُ والجنسُ ولجنتُه (٢٠٢٦-١١-١٣): منتقي الكتّاب في نافذة التكليف يرسمهم كمنتقي النسبة — والوحدةُ تحت الاسم تفصل بين
 * متشابهَي الاسم. **وحسابُ النادي ليس كاتبًا**: مؤسّسةٌ لا تُكلَّف بمحتوى (المالك ٢٠٢٦-١٠-١٨).
 */
export async function getMemberOptions(): Promise<MemberOption[]> {
  const sb = newsService();
  if (!sb) return [];
  const [pRes, clubRes, urRes, cRes] = await Promise.all([
    sb.from("profiles").select("id, full_name, avatar_url, gender").eq("account_status", "active").order("full_name", { ascending: true }),
    sb.from("user_roles").select("user_id").eq("role_name", "adeeb_admin").eq("is_active", true),
    sb.from("user_roles").select("user_id, committee_id").eq("is_active", true).not("committee_id", "is", null).order("is_acting", { ascending: true }),
    sb.from("committees").select("id, committee_name_ar"),
  ]);
  const club = new Set((clubRes.data ?? []).map((r) => r.user_id as string));
  const committee = new Map((cRes.data ?? []).map((c) => [c.id as number, c.committee_name_ar as string]));
  const unit = new Map<string, string>();
  for (const r of urRes.data ?? []) {
    const nm = committee.get(r.committee_id as number);
    if (nm && !unit.has(r.user_id as string)) unit.set(r.user_id as string, nm);
  }
  return (pRes.data ?? []).filter((p) => !club.has(p.id)).map((p) => ({
    value: p.id, label: p.full_name, avatarUrl: p.avatar_url ?? null, gender: p.gender ?? null, unit: unit.get(p.id) ?? null,
  }));
}

/**
 * جهاتُ النسبة: النادي · المجلسان · الأقسام · اللجان · الإدارات.
 * (كانت «اللجانَ» وحدها حتى ٢٠٢٦-٠٩-١٧ — وسّعها المالكُ لتضمّ الهيكلةَ كلَّها.)
 */
export async function getUnitOptions(): Promise<UnitOption[]> {
  const sb = newsService();
  if (!sb) return [];
  const [cRes, dRes, clRes] = await Promise.all([
    sb.from("committees").select("id, committee_name_ar, department_id").eq("is_active", true),
    sb.from("departments").select("id, name_ar, display_order").eq("is_active", true),
    sb.from("councils").select("id, name_ar"),
  ]);
  return buildUnitOptions({ councils: clRes.data, departments: dRes.data, committees: cRes.data });
}

/**
 * **الفعاليّاتُ التي يُربط بها خبر** (٢٠٢٦-١١-١٥): المنشورةُ الأحدثُ فالأقدم، مئةٌ بحدٍّ — للقائمة في «الجهة والرابط» عند رئيس التحرير.
 * والتسميةُ اسمُها ويومُها («احتراف الفوتوغراف، 4 مايو 2026») فلا تلتبس فعاليّتان باسمٍ واحد.
 */
export async function getActivityOptions(): Promise<{ value: string; label: string }[]> {
  const sb = newsService();
  if (!sb) return [];
  const { data } = await sb.from("activities").select("id, name, activity_date").eq("is_published", true).order("activity_date", { ascending: false }).limit(100);
  return (data ?? []).map((a: { id: string; name: string; activity_date: string }) => ({ value: a.id, label: `${a.name}، ${fmtDateOnly(a.activity_date)}` }));
}

