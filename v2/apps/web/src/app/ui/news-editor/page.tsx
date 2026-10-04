import type { UnitOption } from "@adeeb/core/org-unit";
import type { CreditPerson } from "@/lib/people";
import { getPublicNews } from "@/app/news/data";
import { textToSections } from "@/lib/news/blocks";
import type { NewsDetail } from "@/app/dashboard/news/data";
import { NewsEditorView } from "@/app/dashboard/news/[id]/NewsEditorView";
import { ToastProvider } from "@/app/dashboard/_components/ToastProvider";

/**
 * **غرفةُ التحرير تحت المجهر.**
 *
 * قال المالك ٢٠٢٦-٠٩-٢٤: «كلّ ما فتحتُه ضاقت نفسي، ومو عارف أحدّد الخلل من وين».
 * والشاشةُ خلف بابٍ لا يفتحه إلّا رئيسُ تحرير، فلا تُعايَن ولا تُقاس. وهذا المعرضُ
 * يركّب **المكوّنَ نفسَه** (`NewsEditorView` بلا نسخةٍ عنه) على بياناتٍ صادقةٍ من
 * أطول خبرٍ حيّ، بدور رئيس التحرير — فيُرى الخللُ ويُقاس بلا صلاحيّةٍ تُمنَح ولا صفٍّ
 * يُمسّ.
 *
 * وهو أداةُ تشخيصٍ اليوم، وأساسُ المقارنة متى عُرضت إعادةُ الهيكلة.
 */
export const dynamic = "force-dynamic";

const ago = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

export default async function NewsEditorLabPage() {
  const all = await getPublicNews();
  // أطولُ خبرٍ أقسامًا — أسوأُ حالةٍ عندنا، لا عيّنةٌ لطيفة.
  const n = all
    .map((x) => ({ x, k: textToSections(x.content).length }))
    .sort((a, b) => b.k - a.k)[0]?.x;

  if (!n) {
    return <main className="py-16"><p className="text-center text-content-muted">لا خبرَ منشورًا يُعايَن عليه المحرّر.</p></main>;
  }

  const people: CreditPerson[] = n.authors.map((name, i) => ({
    id: `p${i}`, name, hint: "عضو أدِيب", group: "أدِيب", avatarUrl: null, gender: null,
  })) as CreditPerson[];

  const units: UnitOption[] = [
    { value: "", label: "نادي أدِيب" },
    { value: "comm:3", label: "لجنة التقارير والأرشفة" },
    { value: "comm:6", label: "لجنة التصوير" },
  ] as UnitOption[];

  const detail: NewsDetail = {
    row: {
      id: n.id, title: n.title, slug: n.slug ?? "", summary: n.summary,
      category: n.category, workflow: "ready_for_review", isFeatured: n.featured,
      imageUrl: n.cover, galleryCount: n.gallery.length, authors: n.authors, tags: n.tags,
      unit: "comm:3", unitName: "لجنة التقارير والأرشفة",
      views: n.views, likes: n.likes, comments: 3, pendingComments: 2,
      writers: [{ id: "w1", name: n.authors[0] ?? "كاتب", avatarUrl: null, gender: null, status: "accepted" }],
      rejectionReason: null,
      publishedAt: n.publishedAt, updatedAt: ago(1), createdAt: ago(9),
      wordCount: (n.content ?? "").trim().split(/\s+/).filter(Boolean).length,
      content: n.content,
      sections: n.sections ?? textToSections(n.content),
    } as NewsDetail["row"],
    coverPhotographer: n.coverPhotographer,
    galleryImages: n.gallery,
    galleryPhotographers: n.galleryPhotographers,
    reviewNotes: null,
    submittedAt: ago(2),
    assignments: [
      {
        writerId: "w1", writerName: n.authors[0] ?? "كاتب", avatarUrl: null, gender: null,
        status: "accepted", fields: ["title", "summary", "content", "tags"],
        notes: "اكتب التقرير كاملًا قبل الخميس.", assignedAt: ago(8), startedAt: ago(7), completedAt: null,
      },
      {
        writerId: "w2", writerName: n.authors[1] ?? "مصوّر أدِيب", avatarUrl: null, gender: null,
        status: "pending", fields: ["image_url", "gallery_images"],
        notes: null, assignedAt: ago(8), startedAt: null, completedAt: null,
      },
    ] as NewsDetail["assignments"],
    comments: [
      { id: "c1", userId: "u1", userName: "رئيس التحرير", avatarUrl: null, gender: null,
        text: "الفقرةُ الثالثة تحتاج رقمًا: كم حضر؟", parentId: null, createdAt: ago(2) },
      { id: "c2", userId: "w1", userName: n.authors[0] ?? "كاتب", avatarUrl: null, gender: null,
        text: "أضفتُه، راجعه.", parentId: "c1", createdAt: ago(1) },
    ] as NewsDetail["comments"],
    publicComments: [
      { id: "g1", who: "زائر", isGuest: true, content: "عملٌ جميل، وفّقكم الله.", isApproved: false, createdAt: ago(1) },
      { id: "g2", who: "عضو أدِيب", isGuest: false, content: "كنتُ هناك، كانت ليلةً لا تُنسى.", isApproved: true, createdAt: ago(3) },
    ] as NewsDetail["publicComments"],
    log: [
      { id: "l1", action: "create", userName: "رئيس التحرير", details: {}, createdAt: ago(9) },
      { id: "l2", action: "assign", userName: "رئيس التحرير", details: {}, createdAt: ago(8) },
      { id: "l3", action: "submit", userName: n.authors[0] ?? "كاتب", details: {}, createdAt: ago(2) },
    ],
    editableFields: [],
  };

  return (
    <main className="mx-auto w-full max-w-[1100px] px-5 py-10">
      <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Newsroom, Layout</p>
      <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">غرفةُ التحرير</h1>
      <p className="mt-2 max-w-2xl leading-8 text-content-muted">
        شكاها المالكُ ٢٠٢٦-٠٩-٢٤، فقِيست: ‏٨٢٧px قبل بلوغ المتن (وشاشةُ الجوّال ٨٤٤)،
        وستُّ تبويباتٍ يفيض شريطُها، و٤٤ نمطًا مرصّعًا في الشيفرة مقابل ستّةٍ في أسوأ
        أخواتها — فكانت الشاشةَ الوحيدةَ المرسومةَ باليد فوق المكتبة لا المبنيّةَ منها.
      </p>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-content-muted">
        وأُعيد بناؤها على «ب» باختياره: لوحان لا ستّةُ تبويبات، وفعلٌ واحدٌ ظاهرٌ وما
        عداه خلف النقاط، وكلُّ شيءٍ من المكتبة (SectionCard وAccordion وSegmented)
        بصفرِ أنماطٍ مرصّعة. وصار المتنُ عند ٧٤٣px والارتفاعُ ٢١٧٢ بدل ٢٦١٥.
      </p>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-content-muted">
        وهذه الصفحةُ تبقى لأنّ الشاشةَ خلف بابٍ لا يفتحه إلّا رئيسُ تحرير، فلا تُعايَن
        ولا تُقاس بغيرها. الأفعالُ لا تعمل ههنا.
      </p>

      <div className="mx-auto mt-8 w-full max-w-[390px] rounded bg-bg p-3">
        <ToastProvider>
          <NewsEditorView
            detail={detail}
            members={[{ value: "w1", label: n.authors[0] ?? "كاتب" }, { value: "w2", label: "عضوٌ آخر" }]}
            units={units}
            people={people}
            isChief
            meId="u1"
          />
        </ToastProvider>
      </div>
    </main>
  );
}
