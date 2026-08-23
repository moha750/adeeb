"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Stat, matchesSearch } from "@adeeb/design-system";
import { ChatsCircle, Robot, ShieldWarning, Coins } from "@phosphor-icons/react";
import { DataTable, type Column } from "../_components/DataTable";
import { Toolbar, type FilterDef } from "../_components/Toolbar";
import { EmptyState } from "../_components/EmptyState";
import { PageHeader } from "../_components/PageHeader";
import { fmtSince } from "@/lib/dates";
import { firstAsk, hasGuardBlock } from "./talk";
import type { DeeboConversation } from "./data";

/**
 * **سجلُّ محادثات ديبو** — غرفةُ ديبو في اللوحة، وهي **اطّلاعٌ محضٌ لا فعلَ فيها**.
 *
 * علّتُها بكلمات ترحيلها: أوّلُ مئة سؤالٍ يتلقّاها ديبو أثمنُ ما سنملك — تُري بمَ يُسأل
 * النادي حقًّا، وأين تكذب معرفتُه، وما ينقص جدولَ الأسئلة الشائعة. ومن لم يقرأها بنى
 * معرفةَ ديبو على التخمين.
 *
 * **وصفٌّ لكلّ محادثةٍ لا لكلّ رسالة** (قرارُ المالك ٢٠٢٦-٠٨-٢٢، بعد معاينةٍ في `/ui`):
 * كانت الشاشةُ جدولَ **رسائل** بمجموعاتٍ تُطوى، كلُّ رسالةٍ صفٌّ بخمسة أعمدة، فالنصُّ الحرُّ
 * محشورٌ في عمودٍ بين أربعة أعمدةٍ تقنيّة. قال المالك: «الجدولُ صعبُ القراءة»، وكان محقًّا،
 * **والعلّةُ مقيسةٌ لا مظنونة**: `DataTable` يلفّ كلَّ عمودٍ مرنٍ بـ`minmax(max-content, …)`
 * عمدًا كي لا يُقتطع نصٌّ بـ«…» — فعمودُ نصٍّ حرٍّ يفرض على الجدول عرضَ أطولِ جملةٍ فيه.
 * فعلى جوّالٍ ٣٧٥ (وهو مقياسُ اللوحة) كان الجدولُ يمرّ أفقيًّا ويُقصّ الجوابُ في منتصف كلمته.
 *
 * **فالقائمةُ صارت قائمةَ محادثات**: عمودان لا خمسة، وكلُّ خليّةٍ خبرٌ قصير (سؤالٌ افتتاحيٌّ
 * يُقلَّم بسطرين، ثمّ مَن سأل، ثمّ متى)، وعرضُه `auto` لا `1fr` فلا تمريرَ أفقيًّا. **والحوارُ
 * خرج من الشبكة إلى صفحته** (`/dashboard/deebo/[id]`): سُئل عن نافذةٍ تعلوها فرُدَّت، لأنّ
 * المحادثةَ غيرُ محدودة الطول فتصير النافذةُ تمريرًا داخل تمرير، ولأنّ فقاعةَ الجواب في
 * النافذة على ٣٧٥ عرضُها ١٨٤px وفي الصفحة ٢٤٥px — ثلثٌ من مساحة القراءة يُشترى بلا ثمن.
 * وللصفحة فوق ذلك مسارٌ يُنسَخ ويُرسَل، وزرُّ رجوعٍ أصيلٌ في الجهاز.
 *
 * **والمجهولُ يبقى مجهولًا، ومن دخل بحسابه يُسمّى**: بصمةُ الزائر تدور كلّ يوم بأمر
 * الترحيل، فما في صفّه يقول «سؤالٌ واحدٌ من متصفّحٍ واحدٍ في يومٍ واحد» ولا يقول من صاحبُه
 * (وعرضُها ليفرّق القارئُ بين محادثتين في اليوم نفسه، لا ليتعقّب أحدًا). وأمّا من سأل
 * بحسابه فقد اختار أن يُعرَف، فاسمُه في صفّه.
 *
 * **وحذفُ صاحبها إيّاها لا يمحوها من هنا** (حكمُ المالك ٢٠٢٦-٠٨-٢١): تبقى كاملةً، ووسمٌ
 * في صفّها يقول إنّه حذفها من عنده — كي لا يُظنَّ أنّها ما زالت في درجه.
 */
export function DeeboLogView({ rows }: { rows: DeeboConversation[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () =>
      rows.filter((c) => {
        // البحثُ في نصّ المحادثة كلِّها لا في صفّها: ما يُبحَث عنه كلمةٌ قيلت في سؤالٍ أو
        // جواب، أو **اسمُ من سألها** (فالسؤال «ما الذي سأل عنه فلان» يُطرَح ههنا).
        if (!matchesSearch(search, `${c.model} ${c.ownerName ?? ""} ${c.messages.map((m) => m.content).join(" ")}`))
          return false;
        if (filters.blocked === "yes" && !hasGuardBlock(c)) return false;
        if (filters.who === "member" && !c.ownerName) return false;
        if (filters.who === "guest" && c.ownerName) return false;
        if (filters.model && c.model !== filters.model) return false;
        return true;
      }),
    [rows, search, filters],
  );

  const stats = useMemo(() => {
    const msgs = rows.reduce((n, c) => n + c.messages.length, 0);
    const blocked = rows.reduce((n, c) => n + c.messages.filter((m) => m.guardBlocked).length, 0);
    const out = rows.reduce((n, c) => n + c.outputTokens, 0);
    return { convs: rows.length, msgs, blocked, out };
  }, [rows]);

  /** النماذجُ الحاضرةُ في السجلّ نفسِه لا قائمةٌ مكتوبةٌ بجانبه: تبديلُ المزوّد سطرٌ في الكود. */
  const models = useMemo(() => [...new Set(rows.map((c) => c.model))], [rows]);

  const filterDefs: FilterDef[] = [
    {
      key: "who",
      label: "السائل",
      options: [
        { value: "", label: "الكلّ" },
        { value: "member", label: "أصحاب الحسابات" },
        { value: "guest", label: "زوّارٌ مجهولون" },
      ],
    },
    {
      key: "blocked",
      label: "حارس الأرقام",
      options: [{ value: "", label: "الكلّ" }, { value: "yes", label: "حجب جملةً" }],
    },
    ...(models.length > 1
      ? [{
          key: "model",
          label: "النموذج",
          options: [{ value: "", label: "الكلّ" }, ...models.map((m) => ({ value: m, label: m }))],
        }]
      : []),
  ];

  const columns: Column<DeeboConversation>[] = [
    {
      key: "talk",
      header: "المحادثة",
      /* **`auto` لا `1fr`**: العمودُ المرنُ يُلفّ بـ`minmax(max-content, …)` في `DataTable`،
         فعمودُ نصٍّ حرٍّ بـ`1fr` يفرض عرضَ أطولِ سؤالٍ فيه ويُخرج تمريرًا أفقيًّا على ٣٧٥ —
         وهو بعينه ما جعل الشاشةَ السابقةَ عسيرةَ القراءة. */
      width: "auto",
      wrap: true,
      render: (c) => (
        <div className="flex min-w-0 flex-col gap-1.5">
          {/* رابطٌ حقيقيٌّ داخل الصفّ لا لأنّ الصفَّ لا يُنقر (يُنقر كلُّه، وهو حدُّ اللمس)،
              بل لأنّ نقرَ الصفّ `div` لا يبلغه من يتنقّل بلوحة المفاتيح ولا يُفتح في تبويب. */}
          <Link
            href={`/dashboard/deebo/${c.id}`}
            className="line-clamp-2 text-content"
            onClick={(e) => e.stopPropagation()}
          >
            <b>{firstAsk(c)}</b>
          </Link>
          <span className="text-xs text-content-muted">
            {c.messages.length} رسالة،{" "}
            {c.ownerName ?? (
              <>
                بصمة{" "}
                <span className="font-latin" dir="ltr">
                  {c.visitorHash.slice(0, 8)}
                </span>
              </>
            )}
          </span>
          {hasGuardBlock(c) || c.hiddenAt ? (
            <span className="flex flex-wrap items-center gap-1.5">
              {hasGuardBlock(c) ? <Badge tone="warning" size="sm" dot>حجب رقمًا</Badge> : null}
              {c.hiddenAt ? <Badge tone="neutral" size="sm" variant="outline">حذفها من عنده</Badge> : null}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "when",
      header: "الوقت",
      width: "124px",
      // يلتفّ سطرين على الجوّال بدل أن يُقتطع: «منذ 26 دقيقة» لا تسع سطرًا في 124px.
      wrap: true,
      render: (c) => <span className="txt">{fmtSince(c.startedAt)}</span>,
    },
  ];

  return (
    <>
      <PageHeader title="سجلّ محادثات ديبو" />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<ChatsCircle />} value={stats.convs} label="محادثة" />
        <Stat icon={<Robot />} value={stats.msgs} label="رسالة" />
        <Stat icon={<ShieldWarning />} value={stats.blocked} label="حجبٌ لرقم" tone={stats.blocked ? "warning" : "brand"} />
        <Stat icon={<Coins />} value={stats.out} label="رمزَ إخراج" />
      </div>

      <Toolbar
        searchPlaceholder="ابحث في نصّ المحادثات"
        search={search}
        onSearch={setSearch}
        filters={filterDefs}
        filterValues={filters}
        onFilter={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Robot />}
          title={rows.length === 0 ? "لم يسأل أحدٌ ديبو بعد" : "لا محادثةَ تطابق بحثك"}
          description={
            rows.length === 0
              ? "أوّلُ محادثةٍ تُكتب هنا من نفسها متى فتح أحدٌ صفحةَ ديبو وسأل. ومن سأل بحسابه كُتب اسمُه، ومن سأل زائرًا فبصمةٌ تدور كلّ يوم لا اسمَ فيها ولا بريدَ ولا عنوان."
              : "جرّب كلمةً أخرى أو ارفع المرشِّح."
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          getRowId={(c) => c.id}
          onRowClick={(c) => router.push(`/dashboard/deebo/${c.id}`)}
          rowTone={(c) => (hasGuardBlock(c) ? "warning" : undefined)}
        />
      )}
    </>
  );
}
