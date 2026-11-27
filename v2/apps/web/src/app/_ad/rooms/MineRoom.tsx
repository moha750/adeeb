"use client";

/**
 * **نتيجتي** (الشكلُ «ز»، اعتمده محمد ٢٠٢٦-١١-٢٧، وهو الشكلُ الوحيد): قائمةُ أشهرك ثمّ صفحةُ الشهر. النتيجةُ والحكمُ بجنس صاحبها،
 * والنهائيّةُ وحدها بلا الشقّين (٢٠٢٦-١١-٢٣)، وبنودُ التقييم بدرجاتها («أين تقف»، `evaluation_my_stands` بجلسة صاحبها)، وما قاله المقيِّمون
 * بلا أسماء (م١٠/2). **المكلَّفُ يُقيَّم للتطوير**: له نتيجتُه وبنودُه وكلامُ مقيِّميه كغيره، بلا حدّ استبعادٍ ولا حكم، وتقول له الصفحةُ ذلك.
 */
import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Armchair, ChartLine, Flag, NotePencil, ChatCircleText, ClipboardText, Medal, ThumbsUp, TrendDown, TrendUp, Wrench } from "@phosphor-icons/react";
import { ITEM_ICON } from "@/app/dashboard/evaluation/itemIcons";
import { percentText, type Fraction } from "@/lib/evaluation/score";
import type { MyResultRow } from "@/app/dashboard/evaluation/data";
import { SCALE_LABELS, verdictWord } from "@/app/dashboard/evaluation/vocab";
import { arCount, AR_CRITERION, type ArForms } from "@/lib/arabicCount";
import type { ItemStand, MyStands } from "@/app/dashboard/evaluation/data";
import { cycleShort, frac, seatLine, type MineProps } from "@/app/dashboard/evaluation/shared";
import { AdBadge, AdCard, AdEmpty, AdInfo, AdNote, AdStepsBar } from "../primitives";
import { AccountRoom, AdSection } from "../account";
import { RecordTicket } from "../record";
import { AdPanel } from "../panel";
import { AdTrend } from "../charts";

const NAV = "/dashboard/evaluation/mine";
const P = (n: number | string) => <bdi dir="ltr" className="lat">{n}%</bdi>;
const pctOf = (x: Fraction | null) => (x ? (x.num / x.den) * 100 : 0);


/**
 * **«نتيجتي» من جديد: قائمةُ أشهرك ثمّ صفحةُ الشهر** (المقترح «ز»، ٢٠٢٦-١١-٢٧؛ محمد: «أعد بناءه بالكامل»). الأشهرُ تتراكم بلا حدّ (شهرٌ
 * لكلّ شهرٍ في المنصب، وقد يُعاد الانتخاب)، فالغرفةُ **قالبُ القائمة**: مسارُك رسمًا (`AdTrend`، يتّسع لأيّ عدد) ثمّ كلُّ شهرٍ تذكرةٌ — كعبُها
 * النسبة وشهرُها، وسطورُها المنصبُ وحالُه عن الذي قبله، والمستبعَدُ بشارته. والتذكرةُ تفتح **صفحةَ الشهر بقالب السجلّ**: رأسُها التذكرةُ مفتوحة
 * (النسبةُ على كعبها، والخلاصةُ وصفُها، والعودةُ إلى «نتيجتي»)، ثمّ البنودُ وكلامُ المقيِّمين عمودين. والإشعارُ يفتح صفحةَ شهره مباشرة،
 * ومن له شهرٌ واحدٌ يرى صفحتَه بلا قائمة.
 */
/** اسمُ شهر `x` كما يُقال بجانب شهر `here`: بلا سنته إن كانت سنتَه («أكتوبر»)، وبها إن عبرت («ديسمبر 2025») */
const monthOf = (x: MyResultRow, here: MyResultRow) => {
  const [m, y] = cycleShort(x.due_on).split(" ");
  return y === cycleShort(here.due_on).split(" ")[1] ? m : `${m} ${y}`;
};
/** المنصبُ نفسُه: الرتبةُ ووحدتُها (قائدُ لجنة التصميم غيرُ قائد لجنة التصوير، وغيرُ نائبها) */
const seatKey = (x: MyResultRow) => `${x.role_name}|${x.unit_name}`;
const sameSeat = (a: MyResultRow, b: MyResultRow) => seatKey(a) === seatKey(b);
const pctRound = (x: MyResultRow) => Math.round(pctOf(frac(x.final_num, x.final_den)));
// الصعودُ أخضرُ والنزولُ أحمر، كحال البند تحت كلّ بند («تحسّن»، «تراجع») — كان النزولُ بلا لونٍ فبدا الصعودُ وحده حالًا (محمد ٢٠٢٦-١١-٢٧)
function versus(results: MyResultRow[], x: MyResultRow): { text: string; tone?: "ok" | "bad"; up?: boolean } | null {
  const before = results[results.indexOf(x) + 1];
  // لا يُقارَن شهرٌ بشهرٍ من منصبٍ آخر: «أعلى من يوليو» وهو في يوليو قائدٌ لجنةً أخرى مقارنةٌ مضلّلة
  if (!before || !sameSeat(before, x) || !frac(x.final_num, x.final_den) || !frac(before.final_num, before.final_den)) return null;
  const d = pctRound(x) - pctRound(before);
  const was = monthOf(before, x);
  // **نقاطٌ لا نسبة** (محمد ٢٠٢٦-١١-٢٧ سأل: «بـ13%؟»): من 71% إلى 84% ثلاثَ عشرةَ نقطة، وهي زيادةٌ بـ18% من الأولى؛ فـ«بـ13%» خطأ.
  // والسنةُ تسقط حين يكون الشهران في سنةٍ واحدة («أعلى من أكتوبر»)، وتُذكر حين يعبران («أعلى من ديسمبر 2025»)
  if (!d) return { text: `كما كانت في ${was}` };
  const n = Math.abs(d);
  return { text: `${d > 0 ? "أعلى" : "أدنى"} من ${was} بـ${n} ${n === 1 ? "نقطة" : n === 2 ? "نقطتين" : n <= 10 ? "نقاط" : "نقطة"}`, tone: d > 0 ? "ok" : "bad", up: d > 0 };
}

function MonthsIndex({ results, gender, href }: { results: MyResultRow[]; gender: MineProps["gender"]; href: (id: number) => string }) {
  // **مقسومةٌ بالمنصب** (محمد ٢٠٢٦-١١-٢٧: «لو استُبعد ثمّ ترشّح وفاز… كيف يفرّق؟»): لكلّ منصبٍ لوحةُ مساره باسمه ومدّته ثمّ تذاكرُ أشهره،
  // الأحدثُ أوّلًا. خطٌّ واحدٌ يصل بين منصبين كان يرسم مسارًا لم يكن. ومن له منصبٌ واحدٌ لا يرى إلّا لوحةً واحدة
  const groups: MyResultRow[][] = [];
  results.forEach((x) => { const g = groups.find((l) => sameSeat(l[0], x)); if (g) g.push(x); else groups.push([x]); });
  const many = groups.length > 1;
  const AR_MONTHS: ArForms = ["شهرٍ واحد", "شهرين", "أشهر", "شهرًا"];
  return (
    <>
      {groups.map((list, gi) => {
        const first = list[list.length - 1], last = list[0];
        const span = first === last ? cycleShort(last.due_on) : `من ${cycleShort(first.due_on)} إلى ${cycleShort(last.due_on)}`;
        return (
          <section key={seatKey(last)} className="ad-mine-seat" aria-label={seatLine(last.role_name, last.unit_name, gender)}>
            <div className="ad-st">
              <AdPanel icon={many ? <Armchair /> : <ChartLine />} title={many ? seatLine(last.role_name, last.unit_name, gender) : "مسارك"}
                sub={`${span}، ${arCount(list.length, AR_MONTHS)}`} span="full">
                {list.length > 1 ? <AdTrend points={[...list].reverse().map((x) => ({ label: cycleShort(x.due_on), value: pctRound(x) }))} unit={(v) => `${v}%`} label={`نتيجتك شهرًا بشهر، ${seatLine(last.role_name, last.unit_name, gender)}`} /> : null}
              </AdPanel>
            </div>
            <div className="ad-grid ad-mine-cards">
              {list.map((x, i) => {
                const f = frac(x.final_num, x.final_den);
                const v = versus(results, x);
                const removed = x.verdict === "removed";
                // **كلُّ تذكرةٍ سطران لا غير** (محمد ٢٠٢٦-١١-٢٧: «الأحدثُ ثلاثةُ أسطر والكلُّ سطران، والأوّلُ فارغ»): الشارةُ («الأحدث»،
                // «مستبعَد») مقابلَ العنوان في سطره لا سطرًا فوقه (اقتراحُ محمد، `.ad-mine-cards`)، وأوّلُ شهرٍ في المنصب يقول ذلك مكانَ المقارنة
                const first = i === list.length - 1;
                return (
                  <AdCard key={x.target_id} seed={String(x.target_id)} href={href(x.target_id)}
                    stub={{ big: f ? `${percentText(f)}%` : "—", small: "نتيجتك" }}
                    chips={removed ? <AdBadge tone="bad">{verdictWord(x.verdict, gender)}</AdBadge> : x.acting ? <AdBadge>للتطوير</AdBadge> : gi === 0 && i === 0 ? <AdBadge>الأحدث</AdBadge> : undefined}
                    title={`تقييمك لشهر ${cycleShort(x.due_on)}`}
                    meta={[v ? { icon: v.up ? <TrendUp /> : <TrendDown />, text: v.text, tone: v.tone }
                      : { icon: <Flag />, text: first ? "أوّل تقييم لك في هذا المنصب" : "لا شهر قبله للمقارنة" }]} />
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

function MonthPage({ r, results, gender, stands, keep, change, indexHref }: {
  r: MyResultRow; results: MyResultRow[]; gender: MineProps["gender"]; stands?: MineProps["stands"];
  keep: string[]; change: string[]; indexHref?: string;
}) {
  const f = frac(r.final_num, r.final_den);
  const fem = gender === "female";
  const removed = r.verdict === "removed";
  const st = stands?.[r.target_id];
  const g = st && !removed ? gist(st) : undefined;
  const v = versus(results, r);
  const where = r.awaiting_return
    ? (fem ? "، وتبقين فيه حتى تُختار لجنةٌ تعودين إليها" : "، وتبقى فيه حتى تُختار لجنةٌ تعود إليها")
    : r.returned_unit ? `، ${fem ? "وعُدتِ" : "وعُدتَ"} عضوًا في ${r.returned_unit}` : "";
  return (
    <div className="ad-room ad-elw-pg">
      <RecordTicket path={NAV} seed={String(r.target_id)} back={indexHref ? { label: "العودة إلى نتيجتي", href: indexHref } : false}
        title={`تقييمك لشهر ${cycleShort(r.due_on)}`}
        stub={{ big: f ? `${percentText(f)}%` : "—", small: removed ? verdictWord(r.verdict, gender) : "نتيجتك" }}
        info={[
          { icon: <Armchair />, text: seatLine(r.role_name, r.unit_name, gender) },
          ...(v ? [{ icon: v.up ? <TrendUp /> : <TrendDown />, text: v.text, tone: v.tone }] : []),
          // **الخلاصةُ سطران برمزيهما في التذكرة** (محمد ٢٠٢٦-١١-٢٧: «هل مكانُها واضحٌ ويُقرأ؟»): وصفًا تحت العنوان كانت جملتين متلاصقتين
          // تُقرآن فقرة؛ وسطرين صارت كلٌّ منهما معلومةً برمزها كالمنصب والحال، برمزَي شريطَي البنود تحتها
          ...(g?.top ? [{ icon: <Medal />, text: g.top }] : []),
          ...(g?.low ? [{ icon: <Wrench />, text: g.low }] : []),
        ]} />
      {r.acting ? (
        // **المكلَّفُ يُقيَّم للتطوير وحده** (محمد ٢٠٢٦-١١-٢٧): لا حدَّ للاستبعاد ولا حكمَ، فلا يُقال له إلّا ما يخصّه
        <AdNote tone="info" label="للتطوير" title={fem ? "أنتِ مكلَّفةٌ بهذا المنصب، وتقييمُك يُعرض عليك لتتطوّري به، ولا يُنهي تكليفَك مهما كانت نتيجتُه." : "أنت مكلَّفٌ بهذا المنصب، وتقييمُك يُعرض عليك لتتطوّر به، ولا يُنهي تكليفَك مهما كانت نتيجتُه."} />
      ) : null}
      {removed && f ? (
        <AdNote tone="bad" title={<>{fem ? "استُبعدتِ" : "استُبعدتَ"} من منصبك لأنّ تقييمك نزل إلى {P(percentText(f))}، والحدّ {P(40)}{where}.</>} />
      ) : null}
      <div className="ad-elw-pg-cols ad-mine">
        <div className="ad-elw-pg-main">
          {st ? (() => {
            // حالُ البند عن الشهر السابق في المنصب نفسِه وحده
            const before = results[results.indexOf(r) + 1];
            const same = before && sameSeat(before, r) ? before : undefined;
            return <Growth s={st} prev={same ? stands?.[same.target_id] : undefined} gender={gender} prevLabel={same ? monthOf(same, r) : undefined} />;
          })() : null}
        </div>
        <div className="ad-elw-pg-side">
          <Voices keep={keep} change={change} />
        </div>
      </div>
    </div>
  );
}

/**
 * **بنودُ تقييمك** (معاينة ٢٠٢٦-١١-٢٦، محمد: «التقييمُ غرضُه أن يتطوّر القائد»): بنودُ الشقّين قائمةً واحدة (لا يهمّ صاحبَها من أعطى
 * الدرجة بل البندُ نفسُه)، **في قسمٍ واحدٍ مقسوم** (`Halves`): «ما تميّزتَ فيه» («جيد» فأعلى) ثمّ «ما تحتاج أن تعمل عليه»
 * («مقبول» فما دونه). كانا قسمين فبدا الثاني صندوقًا فارغًا بجانب الأوّل الممتلئ عند من بنودُه كلُّها «ممتاز» (محمد). وكلُّ بندٍ بدرجاته الخمس وكلمتِها
 * («الدرجات» في «عرض تقييمي»)، ومعه حالُه عن الشهر السابق إن كان.
 */
/**
 * **نصفٌ في قسمٍ مقسوم**: رأسُه شريطُ «سجلّ الأحداث» الهادئ (`.ad-log-day`، قطعةٌ معتمدة) باسمه وعدده في طرفه، ثمّ سطورُه. **والقسمةُ حين
 * يكون في النصفين ما يُقسم** (محمد ٢٠٢٦-١١-٢٦): إن خلا أحدُهما سقط الشريطان وبقيت السطورُ وحدها، فلا شريطَ ولا فراغَ يُضاف لما لا يحتاج توضيحًا.
 */
type Half = { title: string; note?: string; icon?: ReactNode; rows: ReactNode[] };
function Halves({ a, b }: { a: Half; b: Half }) {
  if (!a.rows.length || !b.rows.length) return <>{a.rows}{b.rows}</>;
  return (
    <>
      {[a, b].map((h) => [
        <li key={`h-${h.title}`} className="ad-log-day"><span>{h.icon ? <span className="ad-line-ic" aria-hidden>{h.icon}</span> : null}{h.title}</span>{h.note ? <small>{h.note}</small> : null}</li>,
        ...h.rows,
      ])}
    </>
  );
}

/**
 * **خلاصةُ الشهر جملةً** (المقترح «ب»، ٢٠٢٦-١١-٢٦: «من سيقرأها يحتاج أن يكون كلُّ شيءٍ واضحًا»): أوّلُ ما يُقرأ بعد النسبة أقوى البنود
 * وأكثرُها حاجةً إلى عمل، باسمَين على الأكثر لكلٍّ، فيعرف القائدُ شهرَه قبل أن يقرأ القائمة.
 */
type Gist = { top?: string; low?: string };
/** سطرا الخلاصة برمزَي شريطَي البنود (الوسامُ لما تميّز فيه، والمفتاحُ لما يحتاج عملًا)، كلٌّ في سطرٍ يُقرأ وحده (٢٠٢٦-١١-٢٧) */
function gist(s: MyStands): Gist {
  const and = (xs: ItemStand[]) => xs.map((x) => x.label).join(" و");
  const top = s.items.filter((x) => x.level >= 4).sort((a, b) => b.level - a.level).slice(0, 2);
  const low = s.items.filter((x) => x.level <= 3).sort((a, b) => a.level - b.level).slice(0, 2);
  return {
    top: top.length ? (low.length ? `أقوى معاييرك: ${and(top)}` : `معاييرك كلّها «جيد» فأعلى، وأقواها: ${and(top)}`) : undefined,
    low: low.length ? (top.length ? `أحوجها إلى عمل: ${and(low)}` : `معاييرك كلّها تحتاج عملًا، وأحوجها: ${and(low)}`) : undefined,
  };
}

function Growth({ s, prev, gender, prevLabel }: { s: MyStands; prev?: MyStands; gender: MineProps["gender"]; prevLabel?: string }) {
  const f = gender === "female";
  const was = new Map((prev?.items ?? []).map((it) => [it.key, it.level]));
  const row = (it: ItemStand) => {
    const p = was.get(it.key);
    const tr = p === undefined || p === it.level ? null
      : p < it.level ? { icon: <TrendUp />, text: `تحسّن عن ${prevLabel ?? "الشهر السابق"}`, tone: "ok" as const }
      : { icon: <TrendDown />, text: `تراجع عن ${prevLabel ?? "الشهر السابق"}`, tone: "bad" as const };
    return (
      <li key={it.key} className="ad-rate-v">
        {ITEM_ICON[it.key] ? <span className="ad-line-ic">{ITEM_ICON[it.key]}</span> : null}
        <span className="ad-rate-qt"><b>{it.label}</b><span>{it.hint}</span>{tr ? <AdInfo m={tr} /> : null}</span>
        {/* «مقبول» فما دونه بالكهرمانيّ كما كان قبل توحيد الشكل (محمد ٢٠٢٦-١١-٢٧: «أتوقّع كان لونها برتقاليًّا») */}
        <AdStepsBar steps={{ now: it.level, max: 5, label: SCALE_LABELS[it.level], ...(it.level <= 3 ? { tone: "warn" as const } : {}) }} />
      </li>
    );
  };
  const strong = s.items.filter((it) => it.level >= 4).sort((a, b) => b.level - a.level);
  const work = s.items.filter((it) => it.level <= 3).sort((a, b) => a.level - b.level);
  return (
    <AdSection icon={<ClipboardText />} title="معايير تقييمك">
      <Halves
        a={{ title: f ? "ما تميّزتِ فيه" : "ما تميّزتَ فيه", icon: <Medal />, note: arCount(strong.length, AR_CRITERION), rows: strong.map(row) }}
        b={{ title: f ? "ما تحتاجين أن تعملي عليه" : "ما تحتاج أن تعمل عليه", icon: <Wrench />, note: arCount(work.length, AR_CRITERION), rows: work.map(row) }} />
    </AdSection>
  );
}

/**
 * **ما قاله مقيِّموك: قسمٌ واحدٌ مقسوم** (محمد ٢٠٢٦-١١-٢٦): «ما يستمرّ عليه» ثمّ «ما يحتاج إلى تغيير»، وبجانب كلٍّ من قاله. من الأعضاء
 * والمجلس معًا (م٧/3) مخلوطين بلا أسماء، فالمعدودُ «مقيِّم». ولم يكتب أحدٌ في أيٍّ منهما: فراغُ القسم الواحد.
 */
function Voices({ keep, change }: { keep: string[]; change: string[] }) {
  const said = (n: number) => `قاله ${n === 1 ? "مقيِّمٌ واحد" : n === 2 ? "مقيِّمان" : n <= 10 ? `${n} مقيِّمين` : `${n} مقيِّمًا`}`;
  if (!keep.length && !change.length) {
    return (
      <AdSection icon={<ChatCircleText />} title="ما قاله مقيِّموك"
        media={<AdEmpty icon={<ChatCircleText />} title="لم يكتب أحدٌ شيئًا" desc="السؤالان اختياريّان، ولم يُجب عنهما أحدٌ في تقييم هذا الشهر." />} />
    );
  }
  // الكلامُ بين علامتي التنصيص، فيُقرأ كلامَ إنسانٍ لا نصًّا من النظام
  const line = (q: string, i: number) => <li key={`${q}-${i}`} className="ad-rate-v"><span className="ad-rate-qt ad-mine-q">{`«${q}»`}</span></li>;
  return (
    <AdSection icon={<ChatCircleText />} title="ما قاله مقيِّموك">
      <Halves
        a={{ title: "ما يستمرّ عليه", icon: <ThumbsUp />, note: said(keep.length), rows: keep.map(line) }}
        b={{ title: "ما يحتاج إلى تغيير", icon: <NotePencil />, note: said(change.length), rows: change.map(line) }} />
    </AdSection>
  );
}

export function MineRoom({ results, comments, gender, stands }: MineProps) {
  const sp = useSearchParams();
  const path = usePathname();
  const month = Number(sp.get("month")) || undefined;
  const monthHref = (id: number) => { const q = new URLSearchParams(sp.toString()); q.set("month", String(id)); return `${path}?${q.toString()}`; };
  const indexHref = (() => { const q = new URLSearchParams(sp.toString()); q.delete("month"); const qs = q.toString(); return qs ? `${path}?${qs}` : path; })();
  // الشهرُ من الرابط (`?month=`): التذكرةُ والإشعارُ يفتحان شهرَهما. ومن له شهرٌ واحدٌ يرى صفحتَه بلا قائمة
  const r = results.find((x) => x.target_id === month);
  if (r || results.length === 1) {
    const cur = r ?? results[0];
    const said = comments[cur.target_id] ?? [];
    const keep = said.map((c) => c.keep_text).filter(Boolean) as string[];
    const change = said.map((c) => c.change_text).filter(Boolean) as string[];
    return <MonthPage r={cur} results={results} gender={gender} stands={stands} keep={keep} change={change} indexHref={results.length > 1 ? indexHref : undefined} />;
  }
  return (
    <AccountRoom navPath={NAV} title="نتيجتي">
      <div className="ad-mine">
        <MonthsIndex results={results} gender={gender} href={monthHref} />
      </div>
    </AccountRoom>
  );
}
