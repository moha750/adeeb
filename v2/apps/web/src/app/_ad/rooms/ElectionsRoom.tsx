"use client";

/**
 * غرفةُ الانتخابات على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `elections/ElectionsView.tsx` القديم:
 * المواضعُ الثلاثة بدورة حياة الانتخاب (الجارية، المكتملة، الملغاة) بأعدادها، والبحثُ بالمنصب ونطاقه، ومرشّحُ المنصب
 * من الأدوار الحاضرة في القائمة، والترتيبُ من رأس الجدول (المنصب، المرشّحون، الأصوات، الإنشاء)، وفتحُ الانتخاب
 * وجهةَ النقر، وفتحُ انتخابٍ جديد بنافذته نفسِها (`NewElectionDialog`) للمدير وحده — والمطّلِعُ يقرأ ولا ينشئ.
 * وما ينتظر يدَ المشرف (المغلقُ طورُه والمتعثّر) يتصدّر «الجارية» كما كان يتصدّرها في قسم «بانتظارك».
 */
import type { RoomView } from "../view";
import { ELECTIONS_ROOM } from "./elections.meta";
import { useMemo, useState } from "react";
import { matchesSearch } from "@adeeb/design-system";
import { CalendarBlank, CalendarCheck, Hourglass, Timer, Trophy, UserCircle, UsersThree } from "@phosphor-icons/react";
import { Checks, Info, Plus, Prohibit } from "@/app/_components/glyphs";
import type { ElectionCreateOptions, ElectionRow } from "@/app/dashboard/elections/data";
import { NewElectionDialog } from "@/app/dashboard/elections/NewElectionDialog";
import { STATUS_META, byGender, deadlineOf } from "@/app/dashboard/elections/vocab";
import { firstAndLastOf } from "@/lib/personName";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { AdActs, AdBadge, AdButton, AdCard, AdRow, type AdFigure, type AdMeta, type AdTone } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { dayParts, fmtDayFull, fmtNum } from "../format";

const LIVE: ReadonlySet<ElectionRow["status"]> = new Set(["candidacy_open", "candidacy_closed", "voting_open", "voting_closed"]);
const isLive = (e: ElectionRow) => LIVE.has(e.status);

/**
 * **المواضعُ تبويباتُ دورة الحياة القديمة بأعدادها**: «الجارية» تجمع طورَي الترشّح والتصويت (تحتاج فعلَ المشرف)،
 * و«المكتملة» و«الملغاة» مخزنٌ نهائيّ. ونصوصُ الفراغ نصوصُها، والدعوةُ إلى الإنشاء في «الجارية» وحدها كما كانت.
 * وكاردُ «جارية الآن» و«مكتملة» صارا عددَي موضعيهما.
 */
const POSITIONS: Position<ElectionRow>[] = [
  { key: "live", label: "الجارية", match: isLive, empty: "لا انتخابات جارية الآن.", canCreate: true },
  { key: "completed", label: "المكتملة", match: (e) => e.status === "completed", empty: "لا انتخابات مكتملة بعد." },
  { key: "cancelled", label: "الملغاة", match: (e) => e.status === "cancelled", empty: "لا انتخابات ملغاة.", rare: true },
];

/** ما ينتظر يدَ المشرف: ترشّحٌ أُغلق ينتظر فتحَ التصويت، وتصويتٌ أُغلق ينتظر إعلانَ الفائز، والمتعثّر. */
const awaitsSupervisor = (e: ElectionRow) => e.stalled || e.status === "candidacy_closed" || e.status === "voting_closed";

/** نغمةُ الشارة من `STATUS_META` (مصدرُ الشارة القديمة الواحد) بأسماء نغمات القالب. */
const TONE: Record<(typeof STATUS_META)[keyof typeof STATUS_META]["tone"], AdTone> = {
  success: "ok", warning: "warn", danger: "bad", neutral: "neutral", info: "info",
};

/** بعد «بـ» في سطر الفائز: مجرورة («بصوتٍ واحد»، «بصوتين»، «بـ5 أصوات»، «بـ12 صوتًا»). */
const VOTES_BY: ArForms = ["صوتٍ واحد", "صوتين", "أصوات", "صوتًا"];
const byVotes = (n: number) => (n <= 0 ? "" : n <= 2 ? ` ب${arCount(n, VOTES_BY)}` : ` بـ${arCount(n, VOTES_BY)}`);

/** يومٌ بسنته من طابعٍ خام — وفارغُه لا يُرسم. */
const day = (iso: string | null) => (iso ? fmtDayFull(iso) : null);

/** `serverNow` يمرّره كلُّ مسارٍ على القالب؛ ولا وقتَ نسبيًّا يُعرض هنا (الموعدُ طابعٌ كامل) فلا يُقرأ. */
export function ElectionsRoom({ elections, createOptions, readOnly = false, view }: {
  elections: ElectionRow[];
  createOptions: ElectionCreateOptions | null;
  readOnly?: boolean;
  serverNow: number;
  view?: RoomView;
}) {
  const [newOpen, setNewOpen] = useState(false);

  /**
   * **ما ينتظرك أوّلًا** (القسمةُ القديمة «بانتظارك» ثمّ «تجري وحدها»): الجاريةُ المنتظِرةُ تتقدّم، وما سواها بترتيب البيانات
   * (الأحدثُ إنشاءً أوّلًا). والمكتملةُ والملغاةُ لا قسمةَ فيها فتبقى بترتيبها.
   */
  const items = useMemo(() => {
    const first = (e: ElectionRow) => isLive(e) && awaitsSupervisor(e);
    return [...elections.filter(first), ...elections.filter((e) => !first(e))];
  }, [elections]);

  // مرشّح المنصب — يُشتقّ من الأدوار الحاضرة فعلًا في القائمة (لا قائمة محفورة)
  const roles = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of elections) if (!seen.has(e.targetRoleName)) seen.set(e.targetRoleName, e.roleLabel);
    return [...seen].map(([value, label]) => ({ value, label }));
  }, [elections]);

  /**
   * **الشارةُ حيث تخالف الموضع وحدها**: «الجارية» تخلط أربعَ حالات فتحمل كلٌّ شارتَها (والمتعثّرُ «بانتظار قرار» تعلو حالتَه)،
   * و«المكتملة» و«الملغاة» قالتهما المواضعُ — حكمُ عمود «الحالة» القديم الذي كان في «الجارية» وحدها.
   */
  const chips = (e: ElectionRow) => {
    if (!isLive(e)) return undefined;
    if (e.stalled) return <AdBadge tone="warn">بانتظار قرار</AdBadge>;
    const m = STATUS_META[e.status];
    return <AdBadge tone={TONE[m.tone]}>{m.label}</AdBadge>;
  };

  /**
   * **سطرُ الحال** (سطرُ الكرت القديم بنصّه ونغمته ورمزه): الموقوتُ يقول موعدَه، وما لا موعدَ له أنّه يُغلق بيدك، والمغلقُ طورُه
   * والمتعثّرُ أنّهما واقفان على قرارك — وفي المغلقِ ترشُّحُه ما بقي صريحًا. والمكتملُ فائزُه بأصواته ويومُ إعلانه، والملغى يومُ إلغائه.
   */
  const stateLines = (e: ElectionRow): AdMeta[] => {
    if (isLive(e)) {
      const closed = e.status === "candidacy_closed" || e.status === "voting_closed";
      const d = deadlineOf(e);
      return [
        e.status === "candidacy_closed" ? { icon: <Hourglass />, text: "تبقّى فتح باب التصويت", tone: "warn" }
        : closed || e.stalled ? { icon: <Hourglass />, text: "بانتظار قرارك", tone: "warn" }
        : d ? { icon: <Timer />, text: `يُغلق ${d}` }
        : { icon: <Hourglass />, text: "يُغلق بشكل يدوي", tone: "warn" },
      ];
    }
    if (e.status === "completed") {
      const at = day(e.archivedRaw);
      return [
        ...(e.winnerName ? [{ icon: <Trophy />, text: `${byGender(e.winnerGender, "فاز", "فازت")} ${firstAndLastOf(e.winnerName)}${byVotes(e.winnerVotes)}`, tone: "ok" as const }] : []),
        ...(e.winnerName && at ? [{ icon: <CalendarCheck />, text: `أُعلن في ${at}` }] : []),
      ];
    }
    const at = day(e.archivedRaw);
    return at ? [{ icon: <Prohibit />, text: `أُلغي في ${at}`, tone: "bad" }] : [];
  };

  /**
   * **السطورُ مصدرُها واحدٌ وترتيبُها واحد**: الحالُ أوّلًا، ثمّ «بإنشاء فلان» (مَن فتح المقعد — كان تذييلَ الكرت «أنشأه فلان»؛
   * و«بإنشاء» على قاعدة «بتحرير/بتنظيم» فلا تُخطئ جنسَ المُنشئ). ومن لم يُقرأ ملفُّه لا يُختلق له سطر: الكعبُ يقول يومَ الإنشاء.
   */
  const info = (e: ElectionRow): AdMeta[] => [
    ...stateLines(e),
    ...(e.createdByName ? [{ icon: <UserCircle />, text: `بإنشاء ${e.createdByName}` }] : []),
  ];

  /** الكعبُ: يومُ الإنشاء وشهرُه (كان عمودَ «أُنشئ» المرتَّب) — في الكرت، وكعبًا مصغّرًا أوّلَ السطر. */
  const stubOf = (e: ElectionRow) => {
    if (!e.createdRaw) return { big: "—", small: "" };
    const d = dayParts(e.createdRaw);
    return { big: d.day, small: d.month };
  };

  /** حصادُ الطورين: المرشّحون ثمّ الأصوات — أرقامُ الكرت، وعمودا السطر بالترتيب نفسِه. */
  const figures = (e: ElectionRow): AdFigure[] => [
    { icon: <UsersThree />, value: fmtNum(e.candidates), label: "المرشّحون" },
    { icon: <Checks />, value: fmtNum(e.votes), label: "الأصوات" },
  ];

  const href = (e: ElectionRow) => `/dashboard/elections/${e.id}`;
  /** لا قائمةَ صفٍّ في القديمة: فتحُ الانتخاب وحده (زرُّ الكرت ووجهةُ نقر الصفّ)، وأفعالُ الإدارة في صفحته. */
  const acts = (e: ElectionRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "فتح الانتخاب", icon: <Info />, href: href(e) }} ops={[]} />
  );

  const openNew = () => setNewOpen(true);

  return (
    <>
      <CollectionRoom<ElectionRow>
        navPath={ELECTIONS_ROOM.navPath}
        title={ELECTIONS_ROOM.title}
        action={readOnly ? undefined : { label: "انتخاب جديد", icon: <Plus />, onClick: openNew }}
        noun={["انتخابٌ واحد", "انتخابان", "انتخابات", "انتخابًا"]}
        items={items}
        positions={POSITIONS}
        defaultPosition="live"
        searchPlaceholder="ابحث بالمنصب أو النطاق…"
        matchSearch={(e, q) => matchesSearch(q, e.positionLabel)}
        filters={[{ key: "role", label: "المنصب", options: roles, match: (e, v) => e.targetRoleName === v }]}
        viewKey={ELECTIONS_ROOM.viewKey}
        initialView={view}
        idOf={(e) => e.id}
        table={{
          // الترتيبُ من رأس العمود كما كان في الجدول القديم (المنصب، والمرشّحون، والأصوات، والإنشاء).
          // والإنشاءُ رقمٌ فيبدأ بالأحدث، كتواريخ الغرف كلّها
          head: "المنصب والنطاق",
          headSortBy: (e) => e.positionLabel.toLowerCase(),
          stub: { key: "created", label: "أُنشئ", icon: <CalendarBlank />, sortBy: (e) => (e.createdRaw ? +new Date(e.createdRaw) : 0) },
          columns: [
            { key: "candidates", label: "المرشّحون", icon: <UsersThree />, sortBy: (e) => e.candidates },
            { key: "votes", label: "الأصوات", icon: <Checks />, sortBy: (e) => e.votes },
          ],
        }}
        emptyAll={{ title: "لا انتخابات بعد", desc: "افتح أوّل انتخابٍ لمنصبٍ منتخَبٍ شاغر، فيظهر هنا بمرشّحيه وأصواته." }}
        createAction={readOnly ? undefined : <AdButton variant="fill" icon={<Plus />} onClick={openNew}>انتخاب جديد</AdButton>}
        renderCard={(e) => (
          <AdCard
            key={e.id}
            seed={e.id}
            stub={stubOf(e)}
            chips={chips(e)}
            title={e.positionLabel}
            href={href(e)}
            meta={info(e)}
            figures={figures(e)}
            foot={acts(e)}
          />
        )}
        renderRow={(e) => (
          <AdRow
            key={e.id}
            title={e.positionLabel}
            href={href(e)}
            stub={{ ...stubOf(e), seed: e.id }}
            badge={chips(e)}
            sub={info(e)}
            cells={figures(e).map((f) => ({ label: f.label, value: f.value }))}
            acts={acts(e, true)}
          />
        )}
      />

      {createOptions ? <NewElectionDialog open={newOpen} onClose={() => setNewOpen(false)} options={createOptions} /> : null}
    </>
  );
}
