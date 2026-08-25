"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Stat, countPhrase, matchesSearch } from "@adeeb/design-system";
import { ChatsCircle, Clock, Robot, ShieldWarning, UserCircle } from "@phosphor-icons/react";
import { DataCards, type CardSpec } from "../_components/DataCards";
import { type Column, type Group } from "../_components/DataTable";
import { Toolbar, type FilterDef } from "../_components/Toolbar";
import { EmptyState } from "../_components/EmptyState";
import { PageHeader } from "../_components/PageHeader";
import { clubDayKey, daysBetweenKeys, fmtSince } from "@/lib/dates";
import { firstNameOf } from "@/lib/personName";
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
 * **ثمّ ذهبت الشبكةُ كلُّها ٢٠٢٦-٠٨-٢٢ (أمرُه: «استبدل الجدول بكروت»)**: القائمةُ اليومَ
 * `DataCards`، ولا كرتَ مخترَعًا لهذه الشاشة — الخدمةُ ترسمه من تعريف الأعمدة نفسِه.
 * وعُرضت ثلاثُ هيئاتٍ في `/ui/deebo-card` فاختار **المضغوطة**، ثمّ نزلت عليها ثلاثةُ
 * تصحيحاتٍ من مراجعةٍ نقديّةٍ طلبها:
 * ١. **بلا متن**: كانت ثلاثةُ أسطرٍ من جواب ديبو أكبرَ كتلةِ حبرٍ في الكرت، والسجلُّ يُقرأ
 *    لتُعرَف **أسئلةُ الناس** لا أجوبتُنا — وأجوبتُه متشابهةُ المطالع فتصير القائمةُ جدارًا
 *    رماديًّا يضيع فيه السؤال. فالسؤالُ وحدَه عنوانُ الكرت، والجوابُ يُقرأ في صفحته.
 * ٢. **الصفةُ قبل الاسم ولا مرساةَ رسمًا** (أمرُه ٢٠٢٦-٠٨-٢٣، بعد أن كان أفتارًا).
 * ٣. **حقيقتان بلا تسمية** (انظر عمودَي `when` و`count`).
 * **والزمنُ رأسُ مجموعةٍ** لا حاشيةَ كرت: «اليوم» و«أمس» تُقال مرّةً لعشرةٍ لا عشرَ مرّات.
 *
 * **والحوارُ خرج من الشبكة إلى صفحته** (`/dashboard/deebo/[id]`): سُئل عن نافذةٍ تعلوها فرُدَّت، لأنّ
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
/** وحدةُ عدّ الرسائل — تُصرَّف عربيًّا (`countPhrase`) فلا يُكتب «2 رسائل». */
const MSG_UNIT = { one: "رسالة", two: "رسالتان", few: "رسائل" };
const TALK_UNIT = { one: "محادثة", two: "محادثتان", few: "محادثات" };

/**
 * الزمنُ رأسُ مجموعةٍ لا حاشيةَ كرت: يُقال مرّةً لعشرةٍ لا عشرَ مرّات — وهي قسمةُ درج
 * المحادثات في `/deebo` حرفًا بحرف (`DeeboIsle`)، فلا قسمتان لزمنٍ واحدٍ في المنتج.
 */
function byDay(rows: DeeboConversation[], todayKey: string): Group<DeeboConversation>[] {
  const order = ["اليوم", "أمس", "آخر سبعة أيّام", "هذا الشهر", "أقدم"];
  const buckets = new Map<string, DeeboConversation[]>();
  for (const c of rows) {
    const days = daysBetweenKeys(clubDayKey(c.startedAt), todayKey);
    const label = days <= 0 ? "اليوم" : days === 1 ? "أمس" : days <= 7 ? "آخر سبعة أيّام" : days <= 31 ? "هذا الشهر" : "أقدم";
    const list = buckets.get(label);
    if (list) list.push(c);
    else buckets.set(label, [c]);
  }
  return order
    .filter((l) => buckets.has(l))
    .map((l) => ({ key: l, label: l, hint: countPhrase(buckets.get(l)!.length, TALK_UNIT), rows: buckets.get(l)! }));
}

export function DeeboLogView({ rows, todayKey }: { rows: DeeboConversation[]; todayKey: string }) {
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

  /**
   * **إحصاءان لا أربعة** (٢٠٢٦-٠٨-٢٣): كانت أربعةُ كروتٍ تأكل ٦٤٠px من أوّل شاشةٍ على
   * جوّالٍ ٣٧٥ قبل أن يُرى سؤالٌ واحد — وهذه شاشةُ قراءةٍ لا لوحةُ مؤشّرات. فبقي ما يخدم
   * سؤالَها: **كم محادثةً** و**كم مرّةً حجب الحارسُ رقمًا** (وهو مقياسُ صدق ديبو).
   * وذهب عدُّ الرسائل (يُقرأ في كلّ كرت) ورمزُ الإخراج (تكلفةُ تشغيلٍ، بيتُها التحليلات
   * لا رأسُ شاشةِ قراءة). ولا شيءَ منهما فُقد من القاعدة، إنّما من هذا الرأس.
   */
  const stats = useMemo(() => {
    const blocked = rows.reduce((n, c) => n + c.messages.filter((m) => m.guardBlocked).length, 0);
    return { convs: rows.length, blocked };
  }, [rows]);

  /** النماذجُ الحاضرةُ في السجلّ نفسِه لا قائمةٌ مكتوبةٌ بجانبه: تبديلُ المزوّد سطرٌ في الكود. */
  const models = useMemo(() => [...new Set(rows.map((c) => c.model))], [rows]);

  const filterDefs: FilterDef[] = [
    {
      key: "who",
      label: "السائل",
      /* ولا خيارَ «الكل» ههنا: يرسمه المرشِّحُ نفسُه (انظر `realOpts` في `Toolbar`). */
      options: [
        { value: "member", label: "أصحاب الحسابات" },
        { value: "guest", label: "زوّارٌ مجهولون" },
      ],
    },
    {
      key: "blocked",
      label: "حارس الأرقام",
      options: [{ value: "yes", label: "حجب جملةً" }],
    },
    ...(models.length > 1
      ? [{
          key: "model",
          label: "النموذج",
          options: models.map((m) => ({ value: m, label: m })),
        }]
      : []),
  ];

  /**
   * جملةُ الحذف مسنَدةً إلى فاعلها: **الفعلُ يتبع جنسَه** — «حذفتها سارة» لا «حذفها سارة».
   * وكان الفعلُ مذكَّرًا للجميع فتُقرأ الجملةُ لحنًا على نصف الأعضاء (سؤالُ المالك
   * ٢٠٢٦-٠٨-٢٥: «والأنثى كيف تظهر الجملة؟»). ومن لا جنسَ في سجلّه (ولا اسمَ للزائر
   * أصلًا) يقع على المذكَّر: هو الأصلُ عند الجهل، ولا يُخترَع له صيغةٌ ثالثة.
   */
  const deletedBy = (c: DeeboConversation): string => {
    if (!c.ownerName) return "حذفها الزائر";
    return `${c.ownerGender === "female" ? "حذفتها" : "حذفها"} ${firstNameOf(c.ownerName)}`;
  };

  /* رقاقةُ الأيقونة (`.tico`) بنغمة الصفّ نفسِها التي تلبسها شارتُه وكرتُه: رقاقةٌ
     قائمةٌ في المكتبة لا لوحٌ يُحفَر ثانيةً في هذه الشاشة. */
  const ticoTone = (c: DeeboConversation): string =>
    hasGuardBlock(c) ? "tico-warning" : c.hiddenAt ? "tico-danger" : "tico-steel";

  /* **أعمدةٌ ذرّيّةٌ لا عمودٌ مركَّب**: خدمةُ الكروت ترسم الكرتَ من تعريف الأعمدة نفسِه
     (`CardSpec` خريطةُ مفاتيحَ لا قيم)، فكلُّ حقيقةٍ عمودُها كي تجد موضعَها من الكرت. */
  const columns: Column<DeeboConversation>[] = [
    { key: "ask", header: "السؤال", render: (c) => firstAsk(c) },
    /* **اسمٌ بلا صفة، وأيقونةٌ تسبقه** (أمرُ المالك ٢٠٢٦-٠٨-٢٥، ناسخًا صفةَ ٢٠٢٦-٠٨-٢٣):
       الصفةُ («عضو» · «متطوّع» · «صاحبُ حساب») تسبق الاسمَ في كلّ سطرٍ فتُنفق عرضًا على
       ما يقوله المرشِّحُ حين يُسأل، والأيقونةُ تقول «هذا صاحبُ الكلام» بلا كلمة.
       وصيغةُ الصفة باقيةٌ في `askerLine` لصفحة المحادثة: هناك حقلٌ مسمّى لا سطرُ قائمة.
       **ولا بصمةَ ههنا**: ستَّ عشرةَ خانةً سداسيّةً تتكرّر في كلّ كرتٍ لا يقرؤها أحد،
       وفائدتُها الوحيدة تقع في صفحة المحادثة حيث تُنسَخ وتُلاحَق. */
    {
      key: "who",
      header: "السائل",
      render: (c) => (
        <span className="inline-flex items-center gap-2">
          <span className={`tico tico-solid ${ticoTone(c)}`}><UserCircle aria-hidden /></span>
          {c.ownerName ?? "زائرٌ مجهول"}
        </span>
      ),
    },
    {
      key: "state",
      header: "",
      /* شارةٌ واحدة: الحجبُ أشدُّ خبرًا من الحذف، فإن اجتمعا تقدّم. و«حذفها» **شارةٌ
         حمراءُ بهيئة أختِها** (أمرُ المالك ٢٠٢٦-٠٨-٢٥): كانت مفرَّغةً رماديّةً تغيب في
         القائمة، فصارت حمراء؛ ثمّ جُرّبت مصمتةً فقُرئت زرًّا لا خبرًا — فالنغمةُ وحدَها
         تفترق عن «حجب رقمًا» والهيئةُ واحدة (ناعمةٌ بنقطة). **وتُسمّي فاعلَها**
         (أمرُه في اليوم نفسِه): «حذفها محمّد» بالاسم الأوّل وحدَه — والثلاثيُّ يطفح بشارةٍ
         في كرتٍ عرضُه ٣٧٥ — و«حذفها الزائر» لمن لا اسمَ له. والشطرُ من `firstNameOf`
         في `lib/personName` لا بمسافةٍ ههنا: «عبد الله» اسمٌ واحدٌ في كلمتين. */
      render: (c) =>
        hasGuardBlock(c) ? (
          <Badge tone="warning" size="sm" dot>حجب رقمًا</Badge>
        ) : c.hiddenAt ? (
          <Badge tone="danger" size="sm" dot>{deletedBy(c)}</Badge>
        ) : null,
    },
    /* **حقيقتان بأيقونتيهما بلا تسمية**: سطرُ الكرت المضغوط يُمسَح بالعين مسحًا، وكلمةُ
       «الوقت» تُنفق حبرًا لتقول ما تقوله القيمةُ وحدَها. فالأيقونةُ تسمّي بلا كلمة: ساعةٌ
       للزمن وفقاعتان للرسائل، والتسميةُ النصّيّةُ تبقى فارغة. وكلٌّ في لوحٍ ناعمٍ من نغمة
       كرته (أمرُ المالك ٢٠٢٦-٠٨-٢٥): الأيقونةُ العاريةُ في وسط النصّ تُقرأ حرفًا غريبًا. */
    {
      key: "when",
      header: "",
      render: (c) => (
        <span className="inline-flex items-center gap-2">
          <span className={`tico ${ticoTone(c)}`}><Clock aria-hidden /></span>
          {fmtSince(c.startedAt)}
        </span>
      ),
    },
    {
      key: "count",
      header: "",
      render: (c) => (
        <span className="inline-flex items-center gap-2">
          <span className={`tico ${ticoTone(c)}`}><ChatsCircle aria-hidden /></span>
          {countPhrase(c.messages.length, MSG_UNIT)}
        </span>
      ),
    },
  ];

  /* **ولا مرساةَ في الكرت**: كان أفتارُ صاحب الحساب يتصدّره، فأمر المالك بنزعه ٢٠٢٦-٠٨-٢٣.
     وما كان يقوله الأفتارُ رسمًا صار يقوله السطرُ نصًّا: الصفةُ قبل الاسم. */
  /* **والحالُ تنزل إلى سطر الحقائق لا تُزاحم الزرَّ في الركن**: كان ركنُ الكرت يجمع
     الشارةَ وزرَّ الفتح، فيُخنق العنوانُ بينهما ويلتفّ حرفين في السطر على جوّالٍ ٣٧٥.
     وسطرُ الحقائق ينساب (`flex-wrap`)، فالشارةُ فيه خبرٌ ثالثٌ يقع حيث يتّسع له. */
  /* **ثلاثةُ سطورٍ لا سطران** (أمرُ المالك ٢٠٢٦-٠٨-٢٥): السؤالُ سطرٌ، والاسمُ سطرٌ وحدَه
     فلا يُزاحمه رقم، والعددُ والوقتُ سطرٌ ثالث. الاسمُ خبرٌ يُقرأ، والرقمانِ يُمسحان مسحًا،
     فلا يُخلَطان في سطرٍ واحد. */
  const spec: CardSpec = {
    title: "ask",
    subtitle: "who",
    facts: ["count", "when"],
    bareFacts: true,
    badge: "state",
  };

  return (
    <>
      <PageHeader title="سجلّ محادثات ديبو" />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat icon={<ChatsCircle />} value={stats.convs} label="محادثة" />
        <Stat icon={<ShieldWarning />} value={stats.blocked} label="حجبٌ لرقم" tone={stats.blocked ? "warning" : "brand"} />
      </div>

      <Toolbar
        searchPlaceholder="ابحث عن كلمة في المحادثات أو عن السائل"
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
        <DataCards
          columns={columns}
          groups={byDay(filtered, todayKey)}
          getRowId={(c) => c.id}
          spec={spec}
          variant="compact"
          openLabel="افتح المحادثة"
          onRowClick={(c) => router.push(`/dashboard/deebo/${c.id}`)}
          /* **نغمةُ الكرت نغمةُ شارته** (أمرُ المالك ٢٠٢٦-٠٨-٢٥): الشارةُ خبرُ الصفّ،
             فإن قالت «حجب رقمًا» صُبِغ الكرتُ بالكهرمانيّ وإن قالت «حذفها» صُبِغ بالأحمر
             — ولا يصحّ أن يقول الركنُ حالًا ويقول السطحُ حالًا أخرى. والترتيبُ ترتيبُها
             نفسُه: الحجبُ أشدّ، فإن اجتمعا تقدّم. */
          rowTone={(c) => (hasGuardBlock(c) ? "warning" : c.hiddenAt ? "danger" : undefined)}
        />
      )}
    </>
  );
}
