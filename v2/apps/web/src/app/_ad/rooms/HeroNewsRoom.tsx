"use client";

/**
 * غرفةُ الأخبار المعروضة على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `website/announcements/news/HeroNewsView.tsx`
 * القديم: شرائحُ عارض الصدر في الصفحة الرئيسية، يُضاف إليها خبرٌ منشورٌ له غلاف من نافذةٍ تختاره، ويُزال منها بلا تأكيد (الإزالةُ
 * لا تمسّ الخبر)، و**ترتيبُها ترتيبُ المرور هناك** بمحرّك القالب (`reorder`، كان «تحريك لأعلى/لأسفل» في الكرت) — فهي قائمةٌ وحدها.
 * وخبرٌ أُرشف أو نُزع غلافُه بعد اختياره يبقى هنا بنغمة التحذير وسببِه، ولا يمرّ حتى يُعاد نشرُه أو يُزال.
 *
 * والصورةُ التي كانت تمنع الجدولَ في القديمة («الجدولُ يُسقط الصورة، وهي ما يُرتَّب هنا») غلافُ الكعب في سطر القالب.
 * وهي البابُ الثاني في «اللوحة الإعلانية»، وجارُها «شريط الإعلانات» (`TickerRoom`) فعلٌ ثانٍ على لوحها (`extra`).
 */
import type { RoomView } from "../view";
import { HERO_NEWS_ROOM } from "./hero-news.meta";
import { TICKER_ROOM } from "./ticker.meta";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarBlank, ListNumbers, Megaphone } from "@phosphor-icons/react";
import { Eye, EyeSlash, Plus, Warning, X } from "@/app/_components/glyphs";
import { Button, Modal, Select, matchesSearch } from "@adeeb/design-system";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { IconNews } from "@/app/dashboard/_shell/icons";
import { fmtDate } from "@/lib/dates";
import type { HeroNewsOption, HeroNewsRow } from "@/app/dashboard/website/announcements/data";
import { addHeroNews, removeHeroNews, reorderHeroNews } from "@/app/dashboard/website/announcements/actions";
import { AdActs, AdBadge, AdButton, AdCard, AdRow, type AdMeta } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { fmtDayFull, fmtNum } from "../format";

/** لمَ لا يمرّ الخبرُ في العارض — نصُّ القديمة بعد «لا يظهر:» (صارت «لا يظهر» شارتَه، والسببُ سطرَه). */
const HIDDEN_SAY: Record<NonNullable<HeroNewsRow["hidden"]>, string> = {
  unpublished: "الخبر غير منشور",
  "no-cover": "الخبر بلا غلاف",
};

/**
 * **مواضعُ الأخبار بحالها**: كان فوق القائمة القديمة كاردُ «أخبار معروضة» (ما يمرّ منها) — فصار موضعًا بعدده، ومقابلُه ما لا يمرّ،
 * والكلُّ أوّلُها (والقديمةُ كانت تعرض الكلّ). والمضافُ يمرّ من لحظته، فالدعوةُ إلى الإضافة في فراغ «تظهر».
 */
const POSITIONS: Position<HeroNewsRow>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لا أخبار معروضة." },
  { key: "live", label: "تظهر", match: (r) => !r.hidden, empty: "لا خبر يظهر في الصدر الآن.", canCreate: true },
  { key: "hidden", label: "لا تظهر", match: (r) => !!r.hidden, empty: "كلُّ الأخبار المختارة تظهر في الصدر." },
];

const TICKER_HREF = "/dashboard/website/announcements/ticker";

export function HeroNewsRoom({ picked, options, view }: { picked: HeroNewsRow[]; options: HeroNewsOption[]; view?: RoomView }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState("");

  /** موضعُ الخبر في العارض كلِّه (لا فيما بقي بعد البحث أو في الموضع) — رقمُ القديم (`i + 1`). */
  const place = useMemo(() => new Map(picked.map((r, i) => [r.newsId, i])), [picked]);
  const indexOf = (r: HeroNewsRow) => place.get(r.newsId) ?? 0;

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        after?.();
        router.refresh();
      } else toast.error(r.message);
    });

  const openAdd = () => {
    setPick("");
    setAdding(true);
  };

  /* «غير متاح» حقًّا حين لا يبقى منشورٌ بغلافٍ خارج العارض (ق٧): الزرُّ لا يَعِد بنافذةٍ قائمتُها فارغة. وكان مُطفأً في القديمة،
     ولا تعطيلَ لفعل اللوح في القالب (`AdAction`) — فيغيب كما يغيب «إصدار شهادة» بلا مستحقّ. (وخطأُ الجلب صار حالَ خطأ الغرفة.) */
  const cannotAdd = options.length === 0;

  /** الأساسيُّ فعلُ السجلّ الوحيد: الإزالةُ من الصدر (كانت زرَّ «إزالة» بأيقونته في ذيل الكرت، ولا نقرَ على الكرت). والنقرةُ لا تتكرّر وهي تجري. */
  const acts = (r: HeroNewsRow, inRow?: boolean) => (
    <AdActs
      inRow={inRow}
      primary={{ label: "إزالة من الصدر", icon: <X />, onClick: () => { if (!pending) run(() => removeHeroNews(r.newsId)); } }}
      ops={[]}
    />
  );

  /**
   * **مصدرٌ واحدٌ للكرت والسطر**: الحالُ شارةٌ في العرضين (كانت لونَ الكرت: أخضرُ لما يمرّ، وأصفرُ لما لا يمرّ)، وسطرُ المعلومة
   * سطرُ رأس الكرت القديم نفسُه: سببُ الغياب بنغمته، أو تاريخُ النشر. والكعبُ ترتيبُ المرور (كان «الترتيب N» في ذيل الكرت) على
   * غلاف الخبر.
   */
  const chips = (r: HeroNewsRow) =>
    r.hidden
      ? <AdBadge tone="warn" icon={<EyeSlash />}>لا يظهر</AdBadge>
      : <AdBadge tone="ok" icon={<Eye />}>يظهر</AdBadge>;
  const info = (r: HeroNewsRow): AdMeta[] =>
    r.hidden
      ? [{ icon: <Warning />, text: HIDDEN_SAY[r.hidden], tone: "warn" }]
      : r.publishedAt ? [{ icon: <CalendarBlank />, text: fmtDayFull(r.publishedAt) }] : [];
  const stubOf = (r: HeroNewsRow) => ({ big: fmtNum(indexOf(r) + 1), small: "الترتيب" });

  const create = cannotAdd ? undefined : <AdButton variant="fill" icon={<Plus />} onClick={openAdd}>إضافة خبر</AdButton>;

  return (
    <>
      <CollectionRoom<HeroNewsRow>
        navPath={HERO_NEWS_ROOM.navPath}
        title={HERO_NEWS_ROOM.title}
        action={cannotAdd ? undefined : { label: "إضافة خبر", icon: <Plus />, onClick: openAdd }}
        extra={{ label: TICKER_ROOM.title, icon: <Megaphone />, href: TICKER_HREF }}
        noun={["خبرٌ واحد", "خبران", "أخبار", "خبرًا"]}
        items={picked}
        positions={POSITIONS}
        defaultPosition="all"
        searchPlaceholder="ابحث بعنوان الخبر…"
        matchSearch={(r, q) => matchesSearch(q, r.title)}
        viewKey={HERO_NEWS_ROOM.viewKey}
        initialView={view}
        idOf={(r) => r.newsId}
        reorder={{ title: (r) => r.title, save: reorderHeroNews }}
        table={{
          // لا ترتيبَ من رأس الجدول: ترتيبُ العارض يدويٌّ (`sort`)، والفرزُ يُخفي ترتيبَه الحقيقيّ
          head: "الخبر",
          stub: { key: "order", label: "الترتيب", icon: <ListNumbers /> },
          columns: [],
        }}
        emptyAll={{ title: "لا أخبار معروضة", desc: "أضِف خبرًا منشورًا يظهر في صدر الصفحة الرئيسية." }}
        createAction={create}
        renderCard={(r) => (
          <AdCard
            key={r.newsId}
            cover={r.imageUrl}
            seed={r.newsId}
            stub={stubOf(r)}
            chips={chips(r)}
            title={r.title}
            meta={info(r)}
            foot={acts(r)}
          />
        )}
        renderRow={(r) => (
          <AdRow
            key={r.newsId}
            title={r.title}
            stub={{ ...stubOf(r), cover: r.imageUrl, seed: r.newsId }}
            badge={chips(r)}
            sub={info(r)}
            cells={[]}
            acts={acts(r, true)}
          />
        )}
      />
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        busy={pending}
        title="إضافة خبر"
        description="يظهر في صدر الصفحة الرئيسية"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setAdding(false)} disabled={pending}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={pending}
              disabled={!pick}
              onClick={() => run(() => addHeroNews(pick), () => setAdding(false))}
            >
              إضافة الخبر
            </Button>
          </>
        }
      >
        <Select
          label="الخبر"
          icon={<IconNews />}
          options={options.map((o) => ({ value: o.id, label: o.title, hint: fmtDate(o.publishedAt) }))}
          value={pick}
          onValueChange={setPick}
          searchable
          required
        />
      </Modal>
    </>
  );
}
