"use client";

import { useState } from "react";
import { useProgressAll } from "@/lib/radio/progress";
import { useLater } from "@/lib/radio/later";
import { EpisodeRow } from "../_player/EpisodeRow";
import type { RailItem } from "../_player/ContinueRail";

/**
 * **مكتبتي** — بيتُ أشياء المستمع.
 *
 * ══ لماذا بابٌ لا رفوفٌ مبعثرة ══
 * كان «اسمع لاحقًا» و«تابع الاستماع» رفَّين في الصفحة الأولى، فيراهما من نزل
 * وينساهما من لم ينزل. والمكتبةُ هي ما يجعل المحطّةَ **مكانًا يُعاد إليه** لا
 * صفحةً تُزار، وهي أوّلُ ما يفصلنا عن أقراننا.
 *
 * ══ مرشِّحاتٌ وقائمةٌ واحدة (اختارها المالك ٢٠٢٦-٠٩-٠٥) ══
 * وكانت مسوّدةٌ تحمل مرشِّحاتٍ **وأقسامًا** بالأسماء نفسِها، وهو ازدواج. وفي
 * الأقسام عطبٌ زائد: حلقةٌ حُفظت للاحقًا وبُدئت ولم تُتمّ **تنتمي إلى قسمين**،
 * فإمّا تتكرّر وإمّا تُخبَّأ في أحدهما بقرارٍ اعتباطيّ. والقائمةُ الواحدةُ لا
 * تعرف هذا التصادم.
 *
 * ══ وعميليٌّ بالضرورة لا بالاختيار ══
 * الموضعُ و«لاحقًا» في متصفّح الزائر، فلا يعرفهما الخادم. فيُرسَل **حوضٌ** من
 * آخر الحلقات ويُنخَل هنا. ولا شيءَ يُرسَم على الخادم فلا يصرخ الترطيب.
 *
 * ══ وما ينقص ══
 * مرشِّحُ «أتابعه» ينتظر زرَّ «تابِع» وجدولَه (نزل الجدولُ على الإنتاج
 * ٢٠٢٦-٠٩-٠٥، والزرُّ كودٌ لم يُبنَ بعد). فيُعرَض المرشِّحُ معطَّلًا ولا
 * يُخفى: إخفاؤه يجعل المكتبةَ تبدو ناقصةً بلا سبب، وعرضُه يقول «قادم».
 */

type Tab = "all" | "later" | "open";

const TABS: { k: Tab; label: string }[] = [
  { k: "all", label: "الكلّ" },
  { k: "later", label: "لاحقًا" },
  { k: "open", label: "لم يكتمل" },
];

export function LibraryView({ pool }: { pool: RailItem[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const progress = useProgressAll();
  const later = useLater();

  const byId = new Map(pool.map((i) => [i.track.id, i]));
  const openIds = progress.map((p) => p.id);

  /* الترتيبُ بالأحدث: الموضعُ يُحفَظ مرتَّبًا، و«لاحقًا» يُلحَق بعده بلا تكرار. */
  const ids =
    tab === "later" ? later
    : tab === "open" ? openIds
    : [...openIds, ...later.filter((id) => !openIds.includes(id))];

  const items = ids.map((id) => byId.get(id)).filter((i): i is RailItem => Boolean(i));
  const queue = items.map((i) => i.track);

  return (
    <>
      <div className="stx-filters">
        {TABS.map(({ k, label }) => (
          <button key={k} type="button" className="stx-filter" aria-pressed={tab === k} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
        <button type="button" className="stx-filter" disabled aria-disabled>
          أتابعه
        </button>
      </div>

      <div className="stn-page">
        {items.length ? (
          <div className="stn-rows">
            {items.map((i, n) => (
              <EpisodeRow
                key={i.track.id}
                track={i.track}
                number={i.number}
                dateLabel={i.dateLabel}
                summary={null}
                showName={i.showName}
                queue={queue.slice(n + 1)}
              />
            ))}
          </div>
        ) : (
          <p className="stn-empty">
            {tab === "later"
              ? "لم تحفظ حلقةً بعد. اضغط «لاحقًا» على أيّ حلقةٍ فتجدها هنا."
              : tab === "open"
                ? "لا حلقةَ بدأتَها ولم تُتمّها."
                : "مكتبتُك فارغة. ابدأ حلقةً أو احفظها لاحقًا فتجدها هنا."}
          </p>
        )}
      </div>
    </>
  );
}
