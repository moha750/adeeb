"use client";

import { useMemo, useState } from "react";
import { Badge, Stat, matchesSearch } from "@adeeb/design-system";
import { ChatsCircle, Robot, ShieldWarning, Coins } from "@phosphor-icons/react";
import { DataTable, type Column, type Group } from "../_components/DataTable";
import { Toolbar, type FilterDef } from "../_components/Toolbar";
import { EmptyState } from "../_components/EmptyState";
import { PageHeader } from "../_components/PageHeader";
import { fmtDateAndTime } from "@/lib/dates";
import type { DeeboConversation, DeeboMessage } from "./data";

/**
 * **سجلُّ محادثات ديبو** — أوّلُ غرفةٍ لديبو في اللوحة، وهي **اطّلاعٌ محضٌ لا فعلَ فيها**.
 *
 * علّتُها بكلمات ترحيلها: أوّلُ مئة سؤالٍ يتلقّاها ديبو أثمنُ ما سنملك — تُري بمَ يُسأل
 * النادي حقًّا، وأين تكذب معرفتُه، وما ينقص جدولَ الأسئلة الشائعة. ومن لم يقرأها بنى
 * معرفةَ ديبو على التخمين.
 *
 * **والمحادثةُ مجموعةٌ لا صفٌّ يُفتح في نافذة** (ق١٢، الأداةُ الأولى): الشريطُ يحمل وقتَها
 * ونموذجَها وعدّها، وتحته رسائلُها صفوفًا. فلا إطارٌ داخل إطار، ولا نافذةٌ تُفتح لكلّ
 * محادثةٍ ثمّ تُغلَق كي تُقارَن بأختها.
 *
 * **ومطويّةٌ ابتداءً** كسابقة «الإنذارات · حسب العضو»: الشاشةُ تُقرأ «كم سُئل وبمَ» لا
 * «ما نصُّ كلّ رسالة» — فالأشرطةُ هي الجواب، والتفصيلُ يُطلَب بنقرة. وتُفتح كلُّها متى قام
 * بحثٌ أو مرشِّح، وإلّا رأى الباحثُ شريطًا فيه عدٌّ ولا نتيجةَ تحته.
 *
 * **ولا هويّةَ لزائرٍ تُعرَض ولا يمكن أن تُعرَض**: البصمةُ تدور كلّ يوم بأمر الترحيل، فما
 * في الصفّ يقول «سؤالٌ واحدٌ من متصفّحٍ واحدٍ في يومٍ واحد» ولا يقول من صاحبُه. وعرضُها هنا
 * ليفرّق القارئُ بين محادثتين في اليوم نفسه، لا ليتعقّب أحدًا.
 */
export function DeeboLogView({ rows }: { rows: DeeboConversation[] }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () =>
      rows.filter((c) => {
        // البحثُ في نصّ المحادثة كلِّها لا في شريطها: ما يُبحَث عنه كلمةٌ قيلت في سؤالٍ أو جواب.
        if (!matchesSearch(search, `${c.model} ${c.messages.map((m) => m.content).join(" ")}`)) return false;
        if (filters.blocked === "yes" && !c.messages.some((m) => m.guardBlocked)) return false;
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

  const columns: Column<DeeboMessage>[] = [
    {
      key: "role",
      header: "المتكلّم",
      width: "110px",
      render: (m) => (
        <Badge tone={m.role === "user" ? "neutral" : "info"} size="sm" variant="outline">
          {m.role === "user" ? "الزائر" : "ديبو"}
        </Badge>
      ),
    },
    { key: "content", header: "النصّ", width: "3fr", wrap: true, render: (m) => <span className="txt">{m.content}</span> },
    {
      key: "guard",
      header: "الحارس",
      width: "120px",
      render: (m) =>
        m.guardBlocked ? <Badge tone="warning" size="sm" dot>حجب رقمًا</Badge> : <span className="txt">—</span>,
    },
    {
      key: "cost",
      header: "الرموز",
      width: "110px",
      // الرموزُ رقمٌ لاتينيٌّ في سطرٍ عربيّ، فله خطُّه واتّجاهُه (قانون الخطّ اللاتينيّ، ق٣).
      render: (m) =>
        m.role === "assistant" ? (
          <span className="txt font-latin" dir="ltr">{`${m.inputTokens ?? 0}→${m.outputTokens ?? 0}`}</span>
        ) : (
          <span className="txt">—</span>
        ),
    },
    { key: "at", header: "الوقت", width: "170px", render: (m) => <span className="txt">{fmtDateAndTime(m.at)}</span> },
  ];

  // المرشِّحُ يفتح المطويَّ (ق١٢): بحثٌ قائمٌ ⟵ كلُّ مجموعةٍ مفتوحة، وإلّا بدا البحثُ معطوبًا.
  const sifting = !!search.trim() || Object.values(filters).some(Boolean);
  const groups: Group<DeeboMessage>[] = filtered.map((c) => ({
    key: c.id,
    label: fmtDateAndTime(c.startedAt),
    /* خبران تفصلهما الفاصلةُ العربيّة لا نقطةٌ تُرسَم، واللاتينيُّ منهما بخطّه واتّجاهه.
       **واسمُ النموذج نُزع من الشريط** بأمر المالك ٢٠٢٦-٠٨-٢٠: اسمُ المزوّد شأنٌ داخليّ
       لا خبرَ فيه لمن يقرأ «بمَ سُئل النادي». والعمودُ يبقى في القاعدة كما هو (وعلّتُه
       مكتوبةٌ في ترحيله: كي لا يُقارَن جوابُ نموذجٍ بجواب آخر ظُلمًا يوم يُبدَّل المزوّد)،
       ويبقى مقروءًا بالبحث وبمرشِّح النموذج متى صار في السجلّ أكثرُ من واحد. */
    hint: (
      <span>
        {c.messages.length} رسالة، بصمة{" "}
        <span className="font-latin" dir="ltr">{c.visitorHash.slice(0, 8)}</span>
      </span>
    ),
    rows: c.messages,
    tone: c.messages.some((m) => m.guardBlocked) ? ("warning" as const) : undefined,
    defaultOpen: sifting,
  }));

  return (
    <>
      <PageHeader title="سجلّ محادثات ديبو" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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

      {groups.length === 0 ? (
        <EmptyState
          icon={<Robot />}
          title={rows.length === 0 ? "لم يسأل أحدٌ ديبو بعد" : "لا محادثةَ تطابق بحثك"}
          description={
            rows.length === 0
              ? "أوّلُ محادثةٍ تُكتب هنا من نفسها متى فتح زائرٌ صفحةَ ديبو وسأل. ولا يُسجَّل اسمٌ ولا بريدٌ ولا عنوان: بصمةٌ تدور كلّ يوم وحدها."
              : "جرّب كلمةً أخرى أو ارفع المرشِّح."
          }
        />
      ) : (
        <DataTable columns={columns} groups={groups} getRowId={(m) => m.id} />
      )}
    </>
  );
}
