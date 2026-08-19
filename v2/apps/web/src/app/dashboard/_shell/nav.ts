import type { IconKey } from "./icons";
import { canOpen, type NavHref } from "@/lib/capabilities";
import type { ElectionSignal, MyScope, SeatKind } from "@/lib/myScope";

export type NavLeaf = { label: string; href: NavHref; badge?: string };
export type NavItem = {
  label: string;
  icon: IconKey;
  href?: NavHref;       // بند مباشر
  badge?: string;
  children?: NavLeaf[]; // مجموعة قابلة للطيّ
  /** بندٌ لا يُعرض إلّا لصاحب غرفةٍ من هذا النوع — القفلُ وحده لا يكفي (`lib/myScope.ts`). */
  seat?: SeatKind;
  /** بابُ انتخابٍ لا يُعرض إلّا حين تصدق إشارتُه — القفلُ وحده لا يكفي (`scope.elections`). */
  election?: ElectionSignal;
};
export type NavGroup = { head?: string; items: NavItem[] };

/** خريطة تنقّل اللوحة — تُبنى الأقسام تباعًا؛ لا يُدرَج بند إلّا بعد تفعيل صفحته.
 *  قفل كلّ بندٍ يُقرأ من `SECTION_CAP` بمساره — فلا تُسمّى القدرة هنا مرّتين. */
export const NAV: NavGroup[] = [
  // «عضويتي» صدر اللوحة وتبويبها الافتراضيّ — الجذر نفسه، فلا تحويلَ ولا مسارَ ثانٍ يقصده.
  //
  // وبجوارها **تبويبات الهويّة**: كلٌّ منها شاشةُ صاحبها — تلك أنت عضوًا، وهذه أنت في موقعك
  // من الهيكل. وهي بأسماء المضاف إلى المتكلّم لا بأسماء الوحدات: «إدارتي» و«قسمي» و«لجنتي»
  // (والاسمُ الحقيقيّ في عنوان الصفحة نفسها). ولا يرى المرءُ منها إلّا ما له فيه مقعد.
  //
  // و«وحدتي» الواحدة انقسمت هنا (20260801): كانت بندًا يخدم قائد الإدارة وقائد اللجنة معًا،
  // فصار لكلّ موقعٍ بندُه واسمُه وسلطتُه — والقسمُ نال بندَه الذي لم يكن له.
  {
    items: [
      { label: "عضويتي", icon: "me", href: "/dashboard" },
      // «الملف الشخصي» — سجلُّك لا موقعُك: صورتُك وجوّالُك ودراستُك وحساباتُك، تُحرَّر بيدك.
      { label: "الملف الشخصي", icon: "profile", href: "/dashboard/profile" },
      // «الإعدادات» — حسابُك لا سجلُّك: بريدُ الدخول ومفتاحُه وجلساتُك. وموضعُها هنا **مع
      // أختيها** لا في ذيل القائمة (حيث «النظام» و«أدوات»): تلك غرفُ النادي، وهذه غرفةُ نفسك —
      // والصدرُ كلُّه «أنت»: عضويّتك ثمّ سجلُّك ثمّ بابُك، ثمّ مواقعُك من الهيكل.
      { label: "الإعدادات", icon: "settings", href: "/dashboard/settings" },
      // «مهامّي» — ما كُلِّفتَ به. وموضعُها في صدر «أنت» لا في «العضوية»: المهمّةُ شأنُ صاحبها
      // أوّلًا، ويراها القائدُ فيها لجنتَه كما يرى «لجنتي» كشفَها. بندٌ واحدٌ لوجهين.
      { label: "مهامّي", icon: "tasks", href: "/dashboard/tasks" },
      { label: "إدارتي", icon: "unit", href: "/dashboard/unit", seat: "unit" },
      { label: "قسمي", icon: "dept", href: "/dashboard/department", seat: "department" },
      { label: "لجنتي", icon: "users", href: "/dashboard/committee", seat: "committee" },
      // أبواب الانتخابات — كلٌّ فعلٌ للعضو، يظهر حين يصير متاحًا (لا بابَ بلا غرفة).
      { label: "الترشُّح", icon: "candidacy", href: "/dashboard/elections/run", election: "canRun" },
      { label: "سِجلّ ترشُّحي", icon: "myruns", href: "/dashboard/elections/my", election: "hasCandidacy" },
      { label: "صوّت الآن", icon: "ballot", href: "/dashboard/elections/vote", election: "canVote" },
    ],
  },
  {
    head: "العضوية",
    // بنودٌ مسطّحة كبقيّة الأقسام — الرأس «العضوية» يحمل التجميع، فلا حاجة لمجموعةٍ قابلة للطيّ.
    items: [
      { label: "أعضاء أديب", icon: "active", href: "/dashboard/members/active" },
      { label: "أعضاء سابقون", icon: "suspended", href: "/dashboard/members/suspended" },
      { label: "من أشرف عليهم", icon: "supervise", href: "/dashboard/members/supervised" },
      { label: "الإنذارات", icon: "warn", href: "/dashboard/members/warnings" },
      { label: "شهادات الخبرة", icon: "certificate", href: "/dashboard/members/certificates" },
      { label: "أعياد الميلاد", icon: "cake", href: "/dashboard/members/birthdays" },
      { label: "هيكلة أديب", icon: "tree", href: "/dashboard/members/structure" },
      { label: "تعيين المناصب", icon: "assign", href: "/dashboard/members/assignments" },
      { label: "بيانات الدخول", icon: "key", href: "/dashboard/members/credentials" },
    ],
  },
  {
    head: "التفاعل",
    items: [
      { label: "الفعاليّات", icon: "cal", href: "/dashboard/events" },
      { label: "الاستبيانات", icon: "clip", href: "/dashboard/surveys" },
      { label: "الانتخابات", icon: "vote", href: "/dashboard/elections" },
      // رسائل التواصل — تفاعلٌ **وارد**: هذه أخواتُها تدعو الناسَ إلى النادي، وهي تحمل
      // ما يقوله الناسُ للنادي. فمكانُها هنا لا في «المحتوى» (نشرٌ) ولا في «النظام» (إدارة).
      { label: "رسائل التواصل", icon: "inbox", href: "/dashboard/contact" },
    ],
  },
  {
    head: "المحتوى",
    items: [
      // محتوى الصفحة الرئيسية — بنودٌ مسطّحة تحت رأس «المحتوى» (كالتفاعل والنظام)، كلٌّ بأيقونته.
      { label: "الأعمال", icon: "images", href: "/dashboard/website/works" },
      { label: "الإحصاءات", icon: "stats", href: "/dashboard/website/achievements" },
      { label: "الرعاة", icon: "handshake", href: "/dashboard/website/sponsors" },
      { label: "الأسئلة الشائعة", icon: "faq", href: "/dashboard/website/faq" },
      { label: "الأخبار", icon: "news", href: "/dashboard/news" },
      { label: "المكتبة", icon: "book", href: "/dashboard/library" },
      { label: "الإذاعة", icon: "mic", href: "/dashboard/radio" },
    ],
  },
  {
    head: "النظام",
    items: [
      { label: "الصلاحيات", icon: "gear", href: "/dashboard/system/permissions" },
      { label: "السلطة", icon: "assign", href: "/dashboard/system/authority" },
      { label: "إحصائيّات الزوّار", icon: "chart", href: "/dashboard/analytics" },
    ],
  },
  {
    // أدواتٌ لا غرفَ بيانات: تأخذ مُدخَلًا فتعطي ملفًّا، ولا تكتب في القاعدة شيئًا.
    head: "أدوات",
    items: [{ label: "مولّد الباركود", icon: "qr", href: "/dashboard/tools/qr" }],
  },
];

/**
 * الخريطة كما يراها صاحب هذه القدرات **في موقعه هذا** — يسقط ما لا يملك مفتاحه، ويسقط
 * معه رأسُ المجموعة إن خلت. وبندُ الهويّة (`seat`) يسقط كذلك إن لم تكن له غرفةٌ من نوعه:
 * قدرةٌ كـ`manage_committee_members` يحملها من لا لجنةَ له، فبندٌ بلا غرفةٍ وعدٌ كاذب.
 *
 * ترشيحٌ للعرض لا حراسة: الحراسة الحقيقيّة في حارس كلّ صفحة، لأنّ إخفاء الرابط لا يمنع
 * كتابة المسار في شريط العنوان.
 */
export function navFor(caps: readonly string[], scope: MyScope): NavGroup[] {
  // مقعدُ «الإدارة» وحدَه يُسأل عن **المدى** لا عن المقعد (20260819): الرئيسان لا يقودان
  // إدارةً وتعيينُهما يبلغ الإدارتين، فلو سُئل عن مقعدٍ لسقط البندُ عنهما وهما أهلُه.
  const seated = (it: NavItem) =>
    !it.seat || (it.seat === "unit" ? scope.units.length > 0 : scope[it.seat] !== null);
  const has = (it: NavItem) => seated(it) && (!it.election || scope.elections[it.election]);
  // والاسمُ يتبع الحقيقة: «إدارتي» لمن له فيها مقعد، و«الإدارات» لمن يبلغها ولا يجلس فيها.
  const named = (it: NavItem): NavItem =>
    it.seat === "unit" && !scope.unit ? { ...it, label: "الإدارات" } : it;
  return NAV.map((g) => ({
    ...g,
    items: g.items.flatMap((it) => {
      if (it.children) {
        const children = it.children.filter((c) => canOpen(caps, c.href));
        return children.length ? [{ ...it, children }] : [];
      }
      return it.href && canOpen(caps, it.href) && has(it) ? [named(it)] : [];
    }),
  })).filter((g) => g.items.length > 0);
}

/**
 * أيقونةُ مسارٍ من خريطة التنقّل نفسها — **مصدرٌ واحد**: الأيقونة التي يراها العضو في الشريط
 * الجانبيّ هي التي تظهر بجانب المسار في التحليلات، فالتعرّف فوريّ ولا أيقونةَ تُخترَع لقائمة.
 * الورقة ترث أيقونة مجموعتها (لا أيقونة لها في `NavLeaf`)، وإن لم يُطابق المسارُ بندًا بعينه
 * جُرّب أطولُ بندٍ يبدأ به (‏`/dashboard/members` ← بند `‎/dashboard/members/active`‎).
 * تُعيد المفتاح لا المكوّن: هذا ملفُّ بياناتٍ بلا JSX، والراسمُ `ICONS[key]` عند المستهلك.
 */
export function iconKeyForHref(href: string): IconKey | null {
  let prefix: IconKey | null = null;
  for (const g of NAV) {
    for (const it of g.items) {
      if (it.href === href) return it.icon;
      for (const c of it.children ?? []) if (c.href === href) return it.icon;
      const hrefs = [it.href, ...(it.children ?? []).map((c) => c.href)].filter(Boolean) as string[];
      if (prefix === null && hrefs.some((h) => h.startsWith(href + "/"))) prefix = it.icon;
    }
  }
  return prefix;
}
