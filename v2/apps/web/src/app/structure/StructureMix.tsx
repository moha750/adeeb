"use client";

import { useState } from "react";
import { countPhrase, type ChartUnit } from "@adeeb/design-system";
import { User } from "@phosphor-icons/react";
import { ArrowLeft, CaretDown } from "@/app/_components/glyphs";
import { avatarFace } from "@/lib/avatarFace";
import type { PubPerson, PubStructure, PubUnit } from "./data";

/**
 * **هيكلةُ أدِيب** — الهيكلُ «المزيج» الذي اعتمده المالك (٢٠٢٦-١٠-١٣: «هذا ما نبحث عنه منذ البداية»):
 * رأسُ شجرةٍ نازلة (الرئيس ← الرئيس التنفيذيّ ← الإدارات ← الأقسام)، وكلُّ لجنةٍ وإدارةٍ قائدُها
 * وفريقُها في ذيلها يُطوى ويُفتح. والجوّالُ جذعٌ واحد.
 *
 * **والثوبُ «المخطوطة»** — أقلُّ الثلاثة سوءًا عنده، وملاحظاتُه عليه هي القانون هنا:
 * - **الوجهُ بارز**: بلا صناديق، بحلقتين رفيعتين، والاسمُ خطٌّ واضح.
 * - **النائبُ بجوار قائده** لا بين الأعضاء.
 * - **الانتقالُ بزرٍّ ظاهرٍ وحده**: دائرةٌ بسهمٍ على حافّة الوجه هي الرابط، والوجهُ والاسمُ لا ينقلان —
 *   «لو ضغط بالخطأ على شخصٍ لانصدم أنّ الصفحة حوّلته».
 * - **من لا صورة له** يأخذ هيئةَ جنسه (هيئةُ «أهل الدفّة» نفسُها) لا حرفًا، ومَن لا جنسَ له
 *   أيقونةَ المستخدم (المالك ٢٠٢٦-١٠-١٦) لا حرفَ اسمه.
 * - **الخطوطُ «الوصل»** (اعتمدها المالك ٢٠٢٦-١٠-١٧ من أربعةٍ متجاورة): جسورٌ بزوايا مستديرة، وجذعٌ لا ينقطع
 *   داخل الوحدة من لافتتها إلى فريقها، والنائبُ والفريقُ المفتوح على أرضٍ أعمقَ من الصفحة لا أبيضَ على أبيض.
 * - **شاغرُ القيادة يُعرض** (٢٠٢٦-١٠-١٣) ليتّسق شكلُ الشجرة: مكانُ الوجه دائرةٌ متقطّعة و«شاغر»،
 *   بلا زرّ. للقائد والمنسّق، ولنائب اللجنة أيضًا (طلبُ المالك: «ضع حتّى النائب»). والإدارتان
 *   (الموارد، الضمان) لا مقعدَ نائبٍ فيهما فلا يُرسم لهما.
 */

const MEMBER: ChartUnit = { one: "عضو", two: "عضوان", few: "أعضاء", many: "عضوًا" };
const href = (p: PubPerson) => (p.slug ? `/m/${encodeURIComponent(p.slug)}` : undefined);

/**
 * **زرُّ الصفحة** (اختارها المالك من ثلاث هيئاتٍ متجاورة، ٢٠٢٦-١٠-١٧): حبّةٌ على حافّة الإطار السفلى
 * فيها سهمٌ وكلمةٌ تُقرأ قبل أن تُخمَّن، ثمّ عُولجت عيوبُها الستّة بطلبه:
 * - تجلس على خطّ الحافّة ثلثُها داخل الإطار، فلا تقطع الوجه.
 * - الكلمةُ «صفحته / صفحتها» بجنس صاحبها لا «الملف» (يُقرأ ملفًّا يُنزَّل).
 * - في شبكة الأعضاء سهمٌ وحده أهدأ لونًا: ثلاثَ عشرةَ كلمةً متجاورةً ضجيج، والسهمُ تعلّم معناه من فوقه.
 * - منطقةُ اللمس ٤٤px بطبقةٍ لا تُرى، وتنكمش لحظةَ اللمس فيُحسّ الضغط على الجوّال.
 * - الشاغرُ يأخذ فسحتَها نفسها تحت وجهه، فتتساوى الأسماءُ في الصفّ.
 */
/**
 * **لغةُ الزرّ** (٢٠٢٦-١٠-١٧): من ثلاثٍ متجاورة اختار المالكُ لغةَ الزرّ الشبحيّ (`.abtn-ghost`) في
 * موضع الحبّة نفسه: حدٌّ ونصٌّ فولاذيّان على أرضٍ بيضاء، وسهمٌ أفقيّ ← («تابِعْ») بعد الكلمة يخطو للأمام
 * عند الإشارة. ورُدّ قبله: السهمُ المائل (عُرفُه «رابطٌ خارجيّ»)، واللسانُ المملوء «الأسوأ»، والمصمت.
 */
function Go({ p, h, mini }: { p: PubPerson; h: string; mini?: boolean }) {
  const word = p.gender === "female" ? "صفحتها" : p.gender === "male" ? "صفحته" : "الصفحة";
  return (
    <a className={"sx-go" + (mini ? " is-mini" : "")} href={h} aria-label={`صفحة ${p.name}`}>
      {mini ? null : <span>{word}</span>}
      <ArrowLeft />
    </a>
  );
}

/** الوجه، ومعه زرُّ صفحته إن كانت له. `go={false}` للوجوه المتراكبة في الحزمة، و`member` لوجه الشبكة. */
function Face({ p, size, go = true, member }: { p: PubPerson; size: number; go?: boolean; member?: boolean }) {
  const h = go ? href(p) : undefined;
  const face = avatarFace(p.avatar, p.gender);
  return (
    <span className={"sx-fw" + (h ? " has-go" : "")} style={{ ["--s" as string]: `${size}px` }}>
      <span className={"sx-f" + (face.kind === "photo" ? "" : face.kind === "figure" ? " is-fig" : " is-mono")} aria-hidden>
        {face.kind === "photo" ? <img src={face.url} alt="" loading="lazy" draggable={false} />
          : face.kind === "figure" ? <i style={{ backgroundImage: `url(${face.url})` }} />
          : <b><User /></b>}
      </span>
      {h ? <Go p={p} h={h} mini={member} /> : null}
    </span>
  );
}

/** مقعدٌ شاغر: مكانُ الوجه بحجمه، دائرةٌ متقطّعة بلا زرّ. */
function Vacant({ size }: { size: number }) {
  return <span className="sx-fw is-vac" style={{ ["--s" as string]: `${size}px` }}><span className="sx-f is-vacant" aria-hidden /></span>;
}

/** عقدةُ الرأس: لافتةُ وحدتها (إن كانت) فوق الوجه، ثمّ الاسم. `vacant` لمقعدٍ بلا شاغل (منسّقُ قسم).
 *  اللافتةُ فوق الوجه في كلّ المراتب (٢٠٢٦-١٠-١٧)، وكان اسمُ القسم وحده تحت وجه منسّقه. */
function Node({ p, unit, lead, vacant }: { p: PubPerson | null; unit?: string; lead?: boolean; vacant?: string }) {
  const cap = unit ? <span className="sx-cap">{unit}</span> : null;
  if (!p) {
    return (
      <div className="sx-node is-vacant">
        {cap}
        <Vacant size={80} />
        <span className="sx-tx">
          <span className="sx-nm">شاغر</span>
          <span className="sx-rl">{vacant}</span>
        </span>
      </div>
    );
  }
  return (
    <div className={"sx-node" + (lead ? " is-lead" : "")}>
      {cap}
      <Face p={p} size={lead ? 108 : 80} />
      <span className="sx-tx">
        <span className="sx-nm">{p.name}</span>
        {p.title ? <span className="sx-rl">{p.title}</span> : null}
      </span>
    </div>
  );
}

/**
 * الفريق: حبّةٌ بوجوهٍ متراكبة وعدد، تُفتح شبكةً بنقرة. **والخالي يُذكر أيضًا** (٢٠٢٦-١٠-١٧): حبّةٌ
 * متقطّعة «لا أعضاء بعد» بلا نقر — فلكلّ وحدةٍ صفُّ أعضائها، كما لها قائدُها ونائبُها شاغرَين أو مشغولَين.
 */
function Team({ people, initiallyOpen }: { people: PubPerson[]; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(!!initiallyOpen);
  if (!people.length) {
    return (
      <span className="sx-ft is-empty">
        <span className="sx-stk"><Vacant size={30} /></span>
        <span className="sx-ct">لا أعضاء بعد</span>
      </span>
    );
  }
  const stack = [...people].sort((a, b) => Number(!!b.avatar) - Number(!!a.avatar)).slice(0, 5);
  return (
    <>
      <button type="button" className={"sx-ft" + (open ? " is-open" : "")} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="sx-stk">{stack.map((p) => <Face key={p.id} p={p} size={30} go={false} />)}</span>
        <span className="sx-ct">{countPhrase(people.length, MEMBER)}<CaretDown className="sx-caret" /></span>
      </button>
      {open ? (
        <div className="sx-grid">
          {people.map((p) => (
            <div key={p.id} className="sx-m">
              <Face p={p} size={52} member />
              <span className="sx-mn">{p.name}</span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

/** الوحدة: قائدُها ونائبُه بجواره، وفريقُها في ذيلها يُطوى ويُفتح. `deputySeat` للجنة: لها مقعدُ نائبٍ يُرسم شاغرًا إن خلا. */
export function Unit({ u, deputySeat, initiallyOpen }: { u: PubUnit; deputySeat?: boolean; initiallyOpen?: boolean }) {
  return (
    <div className="sx-unit">
      <span className="sx-cap">{u.name}</span>
      {u.leader ? (
        <div className="sx-lead">
          <Face p={u.leader} size={76} />
          <span className="sx-nm">{u.leader.name}</span>
          {u.leader.title ? <span className="sx-rl">{u.leader.title}</span> : null}
        </div>
      ) : (
        <div className="sx-lead is-vacant">
          <Vacant size={76} />
          <span className="sx-nm">شاغر</span>
          <span className="sx-rl">القائد</span>
        </div>
      )}
      {u.deputy ? (
        <div className="sx-dep">
          <Face p={u.deputy} size={44} />
          <span className="sx-tx">
            <span className="sx-dn">{u.deputy.name}</span>
            <span className="sx-rl">{u.deputy.title ?? "نائب"}</span>
          </span>
        </div>
      ) : deputySeat ? (
        <div className="sx-dep is-vacant">
          <Vacant size={44} />
          <span className="sx-tx">
            <span className="sx-dn">شاغر</span>
            <span className="sx-rl">النائب</span>
          </span>
        </div>
      ) : null}
      <Team people={u.members} initiallyOpen={initiallyOpen} />
    </div>
  );
}

export function StructureMix({ s }: { s: PubStructure }) {
  const [pres] = s.administrative.seats;
  const ceo = s.executive.head;
  if (!pres) return null;
  const execUnit = ceo ? s.administrative.units.find((u) => u.leader?.id === ceo.id) ?? null : null;
  const dirs = s.administrative.units.filter((u) => u !== execUnit);
  const half = Math.ceil(dirs.length / 2);
  const row: (PubUnit | "exec")[] = [...dirs.slice(0, half), "exec", ...dirs.slice(half)];
  const depts = s.executive.departments;

  return (
    <div className="sx">
      {/* المجلسان يقسمان الشجرةَ نصفين كما يقسمها النموذج: الإداريُّ رئاستُها وإداراتُها، والتشغيليُّ أقسامُها
          (اعتمد المالك تسميتَهما ٢٠٢٦-١٠-١٨: فاصلٌ متدرّجٌ ولافتة، لا صندوق) */}
      <div className="sx-council is-top"><span>{s.administrative.name}</span></div>
      <div className="sx-col">
        <Node p={pres} lead />
        {ceo ? <><div className="sx-v" /><Node p={ceo} lead /></> : null}
      </div>
      <div className="sx-fork" style={{ ["--n" as string]: row.length }}>
        {row.map((d) => d === "exec" ? (
          <div key="exec" className="sx-col sx-exec">
            <div className="sx-unit">
              <span className="sx-cap">{execUnit?.name ?? "الإدارة التنفيذية"}</span>
              <Team people={execUnit?.members ?? []} />
            </div>
            <div className="sx-v sx-grow" />
          </div>
        ) : (
          <div key={d.id} className="sx-col"><Unit u={d} /></div>
        ))}
      </div>
      <div className="sx-council"><span>{s.executive.name}</span></div>
      <div className="sx-fork sx-depts" style={{ ["--n" as string]: depts.length }}>
        {depts.map((d) => (
          <div key={d.id} className="sx-col">
            <Node p={d.head} unit={d.name} vacant="المنسّق" />
            {d.units.map((u) => (
              <div key={u.id} className="sx-col sx-w">
                <div className="sx-v" />
                <Unit u={u} deputySeat />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
