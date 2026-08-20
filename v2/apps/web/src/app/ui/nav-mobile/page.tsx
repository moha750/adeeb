"use client";

import { useState } from "react";
import { Container } from "@adeeb/design-system";
import { Avatar } from "../../dashboard/_components/Avatar";
import { IconBell, IconCaretDown } from "../../dashboard/_shell/icons";
import { navFor, type NavGroup } from "../../dashboard/_shell/nav";
import type { MyScope } from "@/lib/myScope";
import { MobileSheet, MobileTabs } from "../../dashboard/_shell/MobileNav";

/**
 * معرضُ تنقّل الجوّال — **الجزيرةُ حيّةً بخريطتين حقيقيّتين**.
 *
 * اعتُمدت المنهجيّةُ ثمّ الهيئةُ (المالك ٢٠٢٦-٠٨-٢٠)، وأُعدم ما سواهما فلم يبقَ منه سطر.
 * فالمعروضُ هنا شاهدٌ لا مقترح: كيف تقع الجزيرةُ على جهازٍ عرضُه 390، وكيف تختلف
 * وجهاتُها الأربعُ باختلاف **القدرات والمقعد** لا باختلاف يومٍ عن يوم.
 *
 * والإطارُ كتلةُ احتواءٍ للثابت (‏`contain: paint`)، والنقرُ يُلتقط في طور القنص فلا
 * يغادر المعرض. والخريطةُ تُبنى بـ`navFor` نفسِها التي تبني شريطَ الإنتاج.
 */

// قائدُ لجنةٍ: مقعدُ «لجنتي» في `myScope` مقعدُ قيادةٍ أصلًا، فيحمل مفتاحَ غرفته
const MEMBER_CAPS = ["view_own_membership", "view_org_structure", "run_for_election", "manage_committee_members"];
const CHIEF_CAPS = [
  "view_own_membership", "view_members", "view_suspended_members", "view_supervised_members",
  "view_warnings", "manage_certificates", "view_birthdays", "view_org_structure",
  "assign_positions", "manage_member_data", "manage_committee_members", "manage_department",
  "assign_unit_members", "view_election_candidates", "run_for_election", "manage_activities",
  "manage_surveys", "manage_contact", "manage_deebo", "manage_volunteering", "manage_works",
  "manage_achievements", "manage_sponsors", "manage_faq", "write_news", "manage_library",
  "manage_radio", "manage_permissions", "view_site_stats", "use_qr_generator",
];

const SEAT = { id: 1, name: "لجنة الإعلام" };
const MEMBER_SCOPE: MyScope = {
  unit: null, units: [], department: null, committee: SEAT,
  // بابان موقوتان مفتوحان: لا يدخلان الجزيرة، وتقولهما النقطةُ على «الكلّ»
  elections: { canRun: true, hasCandidacy: false, canVote: true },
};
const CHIEF_SCOPE: MyScope = {
  unit: null, units: [{ id: 2, name: "الإدارة التنفيذيّة" }], department: { id: 3, name: "قسم المحتوى" }, committee: SEAT,
  elections: { canRun: false, hasCandidacy: false, canVote: false },
};

/** ترويسةُ اللوحة بعد ذهاب البرغر: هويّةٌ وجرسٌ في صفٍّ ‏58 */
function TopBar() {
  return (
    <header className="ash-top">
      <span className="ash-greet">
        <Avatar name="محمّد إسماعيل" gender="male" className="ash-av" />
        <span className="ash-gtx">
          <span className="ash-ghi">مساءُ الخير 👋</span>
          <b>محمّد إسماعيل</b>
        </span>
        <IconCaretDown className="ash-gcaret" />
      </span>
      <div className="ash-tools">
        <span className="ash-bell" aria-hidden><IconBell /><i /></span>
      </div>
    </header>
  );
}

/** صفوفٌ وهميّة: الغرضُ أن يُرى **ما يمرّ تحت زجاج الجزيرة** لا أن يُقرأ محتوًى */
function Rows({ title }: { title: string }) {
  return (
    <div className="nvlab-body">
      <b className="font-display text-xl font-black text-content">{title}</b>
      <div className="mt-3 flex flex-col gap-2">
        {["سارة القحطاني", "فهد العتيبي", "ليلى المطيري", "عبدالله الدوسري", "نورة الشمري", "محمّد الحربي", "ريم العنزي"].map((n) => (
          <div key={n} className="flex items-center justify-between rounded-sm border border-line bg-surface px-3 py-2">
            <span className="text-sm font-bold text-content">{n}</span>
            <span className="font-latin text-xs text-content-muted">عضو</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Frame({ tag, note, nav }: { tag: string; note: string; nav: NavGroup[] }) {
  const [path, setPath] = useState("/dashboard");
  const [open, setOpen] = useState(false);
  const here = nav.flatMap((g) => g.items).find((it) => it.href === path);

  /* النقرُ يُلتقط في طور القنص فلا يبلغ `Link` ولا يغادر المعرض — ويصير هو نفسُه
     تنقّلًا محاكًى: المسارُ يتبدّل والورقةُ تُغلق كما تفعل على الجهاز. */
  const intercept = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest("a[href]");
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    setPath(a.getAttribute("href") ?? path);
    setOpen(false);
  };

  return (
    <div className="nvlab-col">
      <div className="phdlab-tag good"><span className="dot" aria-hidden />{tag}</div>
      <div className="nvlab-frame" onClickCapture={intercept}>
        <TopBar />
        <Rows title={here?.label ?? "عضويّتي"} />
        <MobileTabs nav={nav} pathname={path} sheetOpen={open} onOpenAll={() => setOpen(true)} />
        <MobileSheet nav={nav} pathname={path} open={open} onClose={() => setOpen(false)} />
      </div>
      <p className="nvlab-note">{note}</p>
    </div>
  );
}

export default function NavMobileLab() {
  const memberNav = navFor(MEMBER_CAPS, MEMBER_SCOPE);
  const chiefNav = navFor(CHIEF_CAPS, CHIEF_SCOPE);

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Mobile Navigation</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">جزيرةُ التنقّل على الجوّال</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          البرغرُ ذهب ومعه الدُرجُ الجانبيّ. وخلَفُهما جزيرةٌ تعوم في منطقة الإبهام:
          أربعُ وجهاتٍ ثابتةٍ تُنقر بلا فتح، وخامسٌ يرفع الشريطَ الجانبيَّ نفسَه ورقةً من
          القاع. والجزيرةُ هي جهازُ الرأس والتذييل نفسُه: كرتٌ عائمٌ بزجاجٍ يمرّ من تحته
          ما تحته، فلا يُقرأ الجدولُ منتهيًا عندها.
        </p>
        <p className="mt-3 max-w-2xl text-content-muted">
          والوجهاتُ تُحسَب من <b>القدرات والمقعد</b> لا من حدَثٍ موقوت: فالترشُّحُ والتصويتُ
          بابان يُفتحان أيّامًا، ولو دخلا الجزيرةَ لانزاحت الوجهاتُ تحت الإبهام يومَ يُفتحان.
          يقولهما <b>نقطةٌ على «الكلّ»</b> ويقفان في الورقة. اضغط «الكلّ» في الإطارين.
        </p>
      </Container>

      <div className="mx-auto w-full max-w-[1320px] px-6">
        <div className="nvlab mt-12">
          <Frame
            nav={chiefNav}
            tag="رئيسُ النادي (٣٤ بندًا)"
            note="عضويّتي، مهامّي، لجنتي، الفعاليّات. وأربعةٌ وثلاثون بندًا وراء «الكلّ» مقسومةً برؤوس مجموعاتها كما هي في الشريط الجانبيّ."
          />
          <Frame
            nav={memberNav}
            tag="قائدُ لجنة (٧ بنود)"
            note="عضويّتي، مهامّي، لجنتي، هيكلة أديب. وله بابان موقوتان مفتوحان (الترشُّح والتصويت) فلم يدخلا الجزيرة: النقطةُ على «الكلّ» تقولهما."
          />
        </div>
      </div>
    </main>
  );
}
