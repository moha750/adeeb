"use client";

/**
 * **نتيجتي على الهويّة الجديدة** (٢٠٢٦-١١-٢٠، مسوّدةٌ للعرض) — السلوكُ سلوكُ `dashboard/evaluation/_views/MineA.tsx` حرفًا: النتيجةُ والحكمُ
 * جملةً بجنس صاحبها، والشقّان بوزنيهما (والمخفيُّ بسببه: لم يشارك أحد، أو لم يشارك النصف، أو أوراقُه دون ثلاث — المسألة ٣)، وما قاله
 * الأعضاء بلا أسماء (م١٠/2)، والدوراتُ السابقة.
 *
 * والشكلُ من قطعٍ معتمدة لا من «ميزان» القديم: لوحُ الغرفة، والدوراتُ المبدّلُ تحته (كغرفة الإدارة)، والنتيجةُ **أرقامُ التذكرة بشرائطها**
 * وعلى شريطها حدُّ الاستبعاد بالقطع وكلمته (نافذةُ التفاصيل المعتمدة)، وما قاله الأعضاء **سطورُ القراءة** (`AdLine read`، نتائجُ الاستبيان).
 * اعتمد محمد «عمودًا واحدًا» (٢٠٢٦-١١-٢٠) ورُدّ «عمودان» (الرقمُ ينحشر في الجانب). والدورةُ في سطر القسم لا سطرًا سائبًا فوقه، وسقطت
 * «حُسبت من الشقّين»: ما يقوله الشقُّ المخفيُّ بكلمته تحت شريطه يكفي عنها.
 */
import { useState } from "react";
import { ChatCircleText, Gauge, Scales, UsersThree, Wrench } from "@phosphor-icons/react";
import { ArrowsClockwise } from "@/app/_components/glyphs";
import { percentText, type Fraction } from "@/lib/evaluation/score";
import type { MyResultRow } from "@/app/dashboard/evaluation/data";
import { partName, verdictWord } from "@/app/dashboard/evaluation/vocab";
import { cycleName, cycleShort, frac, hiddenWhy, seatLine, verdictSentence, type MineProps } from "@/app/dashboard/evaluation/shared";
import { AdEmpty, AdFigureRow, AdSwitch } from "../primitives";
import { AccountRoom, AdLine, AdSection } from "../account";

const NAV = "/dashboard/evaluation/mine";
const P = (n: number | string) => <bdi dir="ltr" className="lat">{n}%</bdi>;
const pctOf = (x: Fraction | null) => (x ? (x.num / x.den) * 100 : 0);


/**
 * **الحكمُ وأين صار صاحبُه** (محمد ٢٠٢٦-١١-٢٠: «أن نضع ضمن النتيجة اللجنةَ التي عاد إليها»): «عضويتي» تقول أين هو الآن ولا تقول لماذا،
 * والسؤالُ الأوّل بعد «استُبعدتَ» هو «وأين أنا؟». فالعنوانُ جملةٌ واحدة: الحكمُ ثمّ العودة، أو الانتظارُ إن لم تُختر له لجنةٌ بعد.
 */
function title(r: MyResultRow, gender: MineProps["gender"]): string {
  const f = gender === "female";
  if (r.verdict !== "removed") return verdictSentence(r.verdict, gender);
  if (r.awaiting_return) return `${verdictSentence(r.verdict, gender)}، ${f ? "وتبقين فيه" : "وتبقى فيه"} حتى تُختار لجنةٌ ${f ? "تعودين" : "تعود"} إليها`;
  if (r.returned_unit) return `${verdictSentence(r.verdict, gender)}، ${f ? "وعُدتِ" : "وعُدتَ"} عضوًا في ${r.returned_unit}`;
  return verdictSentence(r.verdict, gender);
}

function Result({ r, gender }: { r: MyResultRow; gender: MineProps["gender"] }) {
  const f = frac(r.final_num, r.final_den);
  const parts = (["members", "council"] as const).map((p) => {
    const pf = p === "members" ? frac(r.members_num, r.members_den) : frac(r.council_num, r.council_den);
    const n = (p === "members" ? r.members_ballots : r.council_ballots) ?? 0;
    return {
      icon: p === "members" ? <UsersThree /> : <Scales />, label: partName(p, r.role_name), ltr: true,
      value: pf ? `${percentText(pf)}%` : "—", of: { now: pctOf(pf), max: 100, word: pf ? "" : hiddenWhy(p, n, r) },
    };
  });
  return (
    <AdSection icon={<Gauge />} title={title(r, gender)} sub={`${seatLine(r.role_name, r.unit_name, gender)}، ${cycleName(r.due_on)}`}
      media={
        <div className="ad-evd-figs ad-mine-figs">
          <div className="ad-evd-final" data-verdict={r.verdict}>
            <AdFigureRow figures={[{
              icon: <Gauge />, label: "النتيجة النهائية", ltr: true, value: f ? `${percentText(f)}%` : "—",
              of: { now: pctOf(f), max: 100, word: verdictWord(r.verdict, gender), mark: { at: 40, label: <>حدّ الاستبعاد {P(40)}</> } },
            }]} />
          </div>
          <AdFigureRow figures={parts} />
        </div>
      } />
  );
}

/**
 * ما قاله الأعضاء: القسمان دائمًا، ولو لم يكتب أحد (محمد ٢٠٢٦-١١-٢٠: «لم تعرض لي ما يستمرّ عليه… في حال لم يكتب أحدٌ أساسًا»). الخالي
 * فراغُ القسم المعتمد (`AdEmpty` في جسمه، كقسم «الملفّ الانتخابي» بلا ملف) لا قسمٌ يختفي.
 */
function Voices({ keep, change }: { keep: string[]; change: string[] }) {
  const said = (n: number) => `قاله ${n === 1 ? "عضوٌ واحد" : n === 2 ? "عضوان" : `${n} أعضاء`}، بلا أسماء`;
  // **ولم يكتب أحدٌ في أيٍّ منهما:** قسمٌ واحدٌ بفراغه، لا فراغان كبيران متتاليان يقولان الشيءَ نفسَه
  if (!keep.length && !change.length) {
    return (
      <AdSection icon={<ChatCircleText />} title="ما قاله أعضاؤك"
        media={<AdEmpty icon={<ChatCircleText />} title="لم يكتب أحدٌ شيئًا" desc="السؤالان اختياريّان للأعضاء، ولم يُجب عنهما أحدٌ في تقييم هذا الشهر." />} />
    );
  }
  return (
    <>
      {[{ k: "keep", t: "ما يستمرّ عليه", icon: <ArrowsClockwise />, list: keep }, { k: "change", t: "ما يحتاج إلى تغيير", icon: <Wrench />, list: change }].map((c) =>
        c.list.length ? (
          <AdSection key={c.k} icon={c.icon} title={c.t} sub={said(c.list.length)}>
            {c.list.map((q, i) => <AdLine key={i} icon={<ChatCircleText />} v={q} read />)}
          </AdSection>
        ) : (
          <AdSection key={c.k} icon={c.icon} title={c.t}
            media={<AdEmpty icon={<ChatCircleText />} title="لم يكتب فيه أحد" desc="السؤالُ اختياريّ، وكتب أعضاؤك في السؤال الآخر وحده." />} />
        ),
      )}
    </>
  );
}

export function MineRoom({ results, comments, gender }: MineProps) {
  const [sel, setSel] = useState(results[0]?.target_id);
  const r = results.find((x) => x.target_id === sel) ?? results[0];
  if (!r) return null;
  const said = comments[r.target_id] ?? [];
  const keep = said.map((c) => c.keep_text).filter(Boolean) as string[];
  const change = said.map((c) => c.change_text).filter(Boolean) as string[];
  const head = results.length > 1
    ? <AdSwitch label="الأشهر" positions={results.map((x) => ({ key: String(x.target_id), label: cycleShort(x.due_on) }))} position={String(r.target_id)} onPosition={(k) => setSel(Number(k))} />
    : undefined;

  return (
    <AccountRoom navPath={NAV} title="نتيجتي" head={head}>
      <div className="ad-mine">
        <Result r={r} gender={gender} />
        <Voices keep={keep} change={change} />
      </div>
    </AccountRoom>
  );
}
