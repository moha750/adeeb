"use client";

import { useState } from "react";

import {
  Armchair, Briefcase, Crown, Hourglass, ListChecks, CalendarX, Certificate, Clock, DoorOpen, Gift, GraduationCap, HandHeart, HandPointing,
  IdentificationBadge, IdentificationCard, ListNumbers, Path, SignIn, SquaresFour, Student, UserCirclePlus, UsersThree,
} from "@phosphor-icons/react";
import { Info } from "@/app/_components/glyphs";
import { AdButton, AdGroupTitle, AdNote } from "@/app/_ad/primitives";
import { AdInvite } from "@/app/_ad/account";
import { UnitIcon } from "@/app/dashboard/_components/UnitIcon";
import { PubIndex } from "@/app/_ad/public";
import { arCount, type ArForms } from "@/lib/arabicCount";
import type { CommitteeOption } from "./data";
import type { PubOrg } from "@/app/structure/org";
import { UnitWindow, type Open } from "@/app/structure/TreeMix";

/** منزلةُ القارئ من الطريق: زائرٌ بلا حساب، أو صديقٌ له حسابٌ ولم يتطوّع، أو متطوّع. (والعضوُ لا يرى الصفحة) */
export type JoinStage = "guest" | "friend" | "volunteer";

const AR_COMMITTEE: ArForms = ["لجنةٌ واحدة", "لجنتان", "لجان", "لجنةً"];
/** خطوتا التطوّع بعد الحساب (١١-٢٤): صفحتُهما المنفصلة على هيئة أبواب الحساب */
const APPLY = "/join/apply";
const BACK = encodeURIComponent(APPLY);

/**
 * **صفحةُ الانضمام — قالبُ «الإقناع»، مبنيّةً على الأنظمة لا على الصفحة القديمة** (اعتمدها محمد ٢٠٢٦-١١-٢٤ بعد نسختين؛ محمد: «افهم نظام العضوية والتطوّع والحسابات، ثمّ ابنِ
 * التبويب بالطريقة التي يستحقّها»). قلبُها ما قاله: **أدِيب بلا بوّابة** — لا ترشيحَ ولا مقابلةَ ولا موسمَ تسجيل، تبدأ متى شئت.
 * ومن الأنظمة: الطريقُ حسابٌ ثمّ تطوّعٌ ثمّ إهداء (الدستور م٩)؛ والتطوّعُ يثبت بترتيب الرغبات بلا مراجعة (نظام التطوّع م٦)؛ ولا شرطَ
 * سنٍّ ولا دراسةٍ ولا عمل (م٤، والدستور م٩)؛ والمتطوّعُ لا يلتزم إلّا بما قُبل فيه ويعتذر قبل موعده ويترك متى شاء (م٨ و١٩)؛ والعضويّةُ
 * تُهدى بتقدير الإدارة لا بعدّ الساعات (محمد: «لا نريد معاييرَ يحاجَج بها»)، بلا أجلٍ ولا تجديد (نظام العضوية م٣).
 */
const STEPS_C = [
  { key: "account", Icon: UserCirclePlus, n: "الخطوة الأولى", title: "افتح حسابك", body: "بحساب قوقل أو أبل أو ببريدك، بنقرةٍ واحدة." },
  { key: "profile", Icon: IdentificationCard, n: "الخطوة الثانية", title: "أكمِل ملفّك", body: "اسمُك بالعربية، وجنسُك، وجوّالُك. ثلاثةُ حقولٍ لا غير." },
  { key: "prefs", Icon: ListNumbers, n: "الخطوة الثالثة", title: "رتّب ثلاث لجان", body: "بترتيب رغبتك فيها، فتصير متطوّعًا في الحال بلا مراجعةٍ ولا انتظار، ويصلك رابطُ قروب المتطوّعين." },
] as const;

const WHO = [
  { key: "school", Icon: Student, title: "طلّابُ المدارس" },
  { key: "uni", Icon: GraduationCap, title: "طلّابُ الجامعات" },
  { key: "work", Icon: Briefcase, title: "الموظّفون وغيرُهم" },
] as const;

const VOLUNTEER = [
  { key: "pick", Icon: HandPointing, title: "تختار فرصك", body: "تُعلَن الفرصُ في حسابك وفي قروب المتطوّعين، فتتقدّم لما يناسبك وحدَه، ولا يُطلب منك غيرُه." },
  { key: "excuse", Icon: CalendarX, title: "تعتذر قبل الموعد", body: "إن قُبلتَ ثمّ لم يناسبك الموعد، اعتذرتَ قبل أن يبدأ، فيخلو مقعدُك لغيرك." },
  { key: "cert", Icon: Certificate, title: "شهادةٌ لكلّ مشاركة", body: "بساعات تطوّعك ورقمٍ يتحقّق منه من تشاء، وقد تُختم «بتميّز». وحضورُك وعملُك محفوظان في سجلّك." },
  { key: "leave", Icon: DoorOpen, title: "وتتركه متى شئت", body: "فتعود صديقًا لأدِيب، تحجز فعاليّاته وتتابع أخباره، وتعود متطوّعًا متى أردت." },
] as const;

/** **بين المتطوّع والعضو** (محمد ١١-٢٤): كلُّ صفٍّ يصف الاثنين بكلماته، بلا علامة صحٍّ وخطأ — فلا يبدو عمودُ المتطوّع ناقصًا،
 *  و«التطوّعُ قيمةٌ في ذاته». ومنه مزايا العضو المعتمدة: المقعد، والقيادة، وشهادة الخبرة. */
const COMPARE = [
  { key: "how", Icon: Path, k: "كيف تصل", vol: "ترتّب رغباتك في ثلاث لجان", mem: "تُهدى إليك" },
  { key: "duty", Icon: ListChecks, k: "التزامك", vol: "ما تختاره من الفرص", mem: "مهامُّ لجنتك" },
  { key: "place", Icon: Armchair, k: "مكانك", vol: "تتقدّم إلى فرص النادي", mem: "مقعدٌ في إحدى لجانه، من أهله لا ضيفًا عليه" },
  { key: "cert", Icon: Certificate, k: "شهادتك", vol: "شهادةُ مشاركةٍ لكلّ فرصة", mem: "شهادةُ خبرةٍ بمنصبك ومدّتك" },
  { key: "lead", Icon: Crown, k: "القيادة", vol: "تبدأ بعد العضويّة", mem: "تترشّح لقيادة لجنتك، أو لتنسيق قسمك" },
  { key: "time", Icon: Hourglass, k: "المدّة", vol: "تتركه متى شئت", mem: "بلا أجلٍ ولا تجديد" },
] as const;

export function JoinRoom({ org, committees, stage }: { org: PubOrg | null; committees: CommitteeOption[] | null; stage: JoinStage }) {
  const [open, setOpen] = useState<Open | null>(null);
  // كلُّ لجنةٍ بقسمها ونافذتها من الهيكلة
  const units = new Map((org?.executive.departments ?? []).flatMap((d) => d.units.map((u) => [u.id, { u, where: `لجنةٌ في ${d.name}` }] as const)));
  const n = committees?.length ?? 0;
  const facts = [
    { icon: <Clock />, text: "تبدأ في دقيقة" },
    { icon: <DoorOpen />, text: "البابُ مفتوحٌ طوال العام" },
    ...(n ? [{ icon: <UsersThree />, text: `${arCount(n, AR_COMMITTEE)} تستقبل المتطوّعين` }] : []),
  ];
  // **الصفحةُ إقناعٌ خالصٌ للجميع** (محمد ١١-٢٤): لا نموذجَ في ذيلها، وفعلُها يقود إلى خطوة قارئها — الحسابُ لمن لا حسابَ له، ثمّ صفحةُ التطوّع
  const start = stage === "guest" ? `/signup?next=${BACK}` : APPLY;

  return (
    <PubIndex
      title="انضمّ إلى أدِيب"
      deck="بلا ترشيحٍ ولا مقابلةٍ ولا موعدٍ للتسجيل: تبدأ متى شئت، وتصير متطوّعًا في دقيقة."
      facts={facts}
      after={
        <div className="ad-pz-cta">
          <AdButton variant="inverse" size="lg" href={start} icon={<UserCirclePlus />}>{stage === "volunteer" ? "حدّث رغباتك" : "ابدأ الآن"}</AdButton>
          {n ? <AdButton variant="inverse-quiet" size="lg" href="#committees" icon={<UsersThree />}>تصفّح اللجان</AdButton> : null}
        </div>
      }
    >
      <div className="ad-pz">
        {/* «كيف أبدأ؟» يتدلّى من اللوح: ثلاثُ خطواتٍ في دقيقة */}
        <ol className="ad-pz-path" aria-label="ثلاثُ خطواتٍ وأنت متطوّع">
          {STEPS_C.map(({ key, Icon, n: no, title, body }) => (
            <li key={key}>
              <span className="ad-pz-stamp" aria-hidden><Icon /></span>
              <small>{no}</small>
              <b>{title}</b>
              <p>{body}</p>
            </li>
          ))}
        </ol>

        <section className="ad-pz-sec" aria-labelledby="ad-pz-who">
          <AdGroupTitle icon={<DoorOpen />} sub="لا يُشترط سنٌّ ولا دراسةٌ ولا عمل، ولا تنتهي العضويّةُ بالتخرّج.">
            <span id="ad-pz-who">البابُ للجميع</span>
          </AdGroupTitle>
          <div className="ad-doors ad-pz-who">
            {WHO.map(({ key, Icon, title }) => (
              <div key={key} className="ad-door">
                <div className="ad-door-body">
                  <span className="ad-door-ic" aria-hidden><Icon /></span>
                  <span className="ad-door-t"><b>{title}</b></span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ad-pz-sec" aria-labelledby="ad-pz-vol">
          <AdGroupTitle icon={<HandHeart />} sub="لا التزامَ عليك إلّا ما تختاره بنفسك.">
            <span id="ad-pz-vol">متطوّعًا، وقتُك بيدك</span>
          </AdGroupTitle>
          <div className="ad-doors ad-pz-perks ad-pz-four">
            {VOLUNTEER.map(({ key, Icon, title, body }) => (
              <div key={key} className="ad-door">
                <div className="ad-door-body">
                  <span className="ad-door-ic" aria-hidden><Icon /></span>
                  <span className="ad-door-t"><b>{title}</b><p>{body}</p></span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* العضويّةُ «الدعوةُ» نفسُها بلا فعل: قولُ اللوح، وما في آخر الطريق لا يُوعَد */}
        <AdInvite icon={<Gift />} title="والعضويّة؟ تُهدى ولا تُطلَب" points={[]}
          sub="لا تُقدَّم إليها ولا تُنتظر. يُهديها النادي لمن رأى أثرَه في العمل وملاءمتَه لروح أدِيب، فيصير عضوًا في لجنةٍ من لجانه، بلا أجلٍ ولا تجديد. والتطوّعُ قيمةٌ في ذاته، لا قاعةُ انتظار." />

        <section className="ad-pz-sec" aria-labelledby="ad-pz-cmp">
          <AdGroupTitle icon={<IdentificationBadge />} sub="ما يتغيّر حين تُهدى إليك العضويّة.">
            <span id="ad-pz-cmp">بين المتطوّع والعضو</span>
          </AdGroupTitle>
          {/* **جدولُ الهويّة** (لغةُ قوائم البوّابة `.ad-table`): ورقة، ورأسٌ مصبوغٌ بتسمياته الصغيرة، وخيطٌ بين الصفوف — والسؤالُ في أوّل الصفّ
              بختم سطره، وجوابا المنزلتين بكلماتهما بلا علامة صحٍّ وخطأ */}
          <div className="ad-table ad-pz-cmp" role="table" aria-label="بين المتطوّع والعضو">
            <div className="ad-tr ad-thead" role="row">
              <span role="columnheader" className="ad-th"><span className="ad-sr">السؤال</span></span>
              <span role="columnheader" className="ad-th ad-pz-cmp-h"><HandHeart aria-hidden />متطوّع أدِيب</span>
              <span role="columnheader" className="ad-th ad-pz-cmp-h"><IdentificationBadge aria-hidden />عضو أدِيب</span>
            </div>
            {COMPARE.map((r) => (
              <div key={r.key} className="ad-tr" role="row">
                <span role="rowheader" className="ad-pz-cmp-q"><span className="ad-line-ic" aria-hidden><r.Icon /></span>{r.k}</span>
                <span role="cell" className="ad-pz-cmp-v">{r.vol}</span>
                <span role="cell" className="ad-pz-cmp-v">{r.mem}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="committees" className="ad-pz-sec" aria-labelledby="ad-pz-com">
          <AdGroupTitle icon={<UsersThree />} sub="لكلّ لجنةٍ عملُها في النادي. افتح ما يعنيك منها، ثمّ رتّب ثلاثًا بترتيب رغبتك.">
            <span id="ad-pz-com">أينَ تتطوّع</span>
          </AdGroupTitle>
          {committees === null ? (
            <AdNote tone="bad" title="تعذّر تحميل اللجان">إعداد الخادم ناقص. أبلغ الإدارة.</AdNote>
          ) : !n ? (
            <AdNote tone="warn" title="لا لجانَ متاحةً الآن">لم تُفتح لجانٌ لترتيب الرغبات بعد. تابِعنا.</AdNote>
          ) : (
            <div className="ad-doors ad-pz-coms">
              {/* **اللجنةُ هي المقصودة لا قائدُها** (محمد ١١-٢٤): ورقةُ «الأبواب» باسمها وقسمِها وتعريفها، و«عن اللجنة» تفتح نافذتَها من
                  الهيكلة بتعريفها كاملًا ومن فيها */}
              {(committees ?? []).map((c) => {
                const at = units.get(c.id);
                return (
                  <div key={c.id} className="ad-door">
                    <div className="ad-door-body">
                      <span className="ad-door-ic" aria-hidden><UnitIcon icon={at?.u.icon} kind="committee" /></span>
                      <span className="ad-door-t">
                        {at ? <small>{at.where}</small> : null}
                        <b>{c.name}</b>
                        <p className="ad-pz-com-desc">{c.description.replace(/\r/g, "").replace(/\n{2,}/g, "\n").trim()}</p>
                      </span>
                      {at ? (
                        <span className="ad-door-act">
                          <AdButton size="sm" icon={<Info />} onClick={() => setOpen({ kind: "unit", u: at.u, where: at.where })}>عن اللجنة</AdButton>
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <UnitWindow open={open} onClose={() => setOpen(null)} onOpen={setOpen} />

        <div id="step" className="ad-pz-step">
          {stage === "guest" ? (
            <AdInvite icon={<UserCirclePlus />} title="ابدأ الآن" sub="دقيقةٌ واحدة، وأنت متطوّعٌ في أدِيب." points={[]}
              action={
                <span className="ad-pz-acts">
                  <AdButton variant="inverse" href={`/signup?next=${BACK}`} icon={<UserCirclePlus />}>أنشئ حسابَك</AdButton>
                  <AdButton variant="inverse-quiet" href={`/login?next=${BACK}`} icon={<SignIn />}>ادخل بوّابة أدِيب</AdButton>
                </span>
              } />
          ) : stage === "friend" ? (
            <AdInvite icon={<HandHeart />} title="ابدأ الآن" sub="حسابُك جاهز، وبقيت خطوةٌ واحدة وتصير متطوّعًا في أدِيب." points={[]}
              action={<AdButton variant="inverse" href={APPLY} icon={<HandHeart />}>أكمِل خطوتك</AdButton>} />
          ) : (
            <AdInvite icon={<HandHeart />} title="أنت من متطوّعي أدِيب" sub="ولك أن تعيد ترتيب رغباتك متى شئت." points={[]}
              action={
                <span className="ad-pz-acts">
                  <AdButton variant="inverse" href={APPLY} icon={<ListNumbers />}>حدّث رغباتك</AdButton>
                  <AdButton variant="inverse-quiet" href="/dashboard/volunteer" icon={<SquaresFour />}>بوّابتك</AdButton>
                </span>
              } />
          )}
        </div>
      </div>
    </PubIndex>
  );
}
