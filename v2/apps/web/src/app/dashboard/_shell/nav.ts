import type { IconKey } from "./icons";
import { canOpen, type NavHref } from "@/lib/capabilities";

export type NavLeaf = { label: string; href: NavHref; badge?: string };
export type NavItem = {
  label: string;
  icon: IconKey;
  href?: NavHref;       // بند مباشر
  badge?: string;
  children?: NavLeaf[]; // مجموعة قابلة للطيّ
};
export type NavGroup = { head?: string; items: NavItem[] };

/** خريطة تنقّل اللوحة — تُبنى الأقسام تباعًا؛ لا يُدرَج بند إلّا بعد تفعيل صفحته.
 *  قفل كلّ بندٍ يُقرأ من `SECTION_CAP` بمساره — فلا تُسمّى القدرة هنا مرّتين. */
export const NAV: NavGroup[] = [
  // «عضويتي» صدر اللوحة وتبويبها الافتراضيّ — الجذر نفسه، فلا تحويلَ ولا مسارَ ثانٍ يقصده.
  // و«وحدتي» بجوارها لا تحت «العضوية»: كلتاهما شاشةُ صاحبها — تلك أنت عضوًا وهذه أنت قائدًا.
  {
    items: [
      { label: "عضويتي", icon: "me", href: "/dashboard" },
      { label: "وحدتي", icon: "unit", href: "/dashboard/unit" },
    ],
  },
  {
    head: "العضوية",
    // بنودٌ مسطّحة كبقيّة الأقسام — الرأس «العضوية» يحمل التجميع، فلا حاجة لمجموعةٍ قابلة للطيّ.
    items: [
      { label: "أعضاء أديب", icon: "active", href: "/dashboard/members/active" },
      { label: "أعضاء قيد الإكمال", icon: "pending", href: "/dashboard/members/pending" },
      { label: "أعضاء سابقون", icon: "suspended", href: "/dashboard/members/suspended" },
      { label: "من أشرف عليهم", icon: "supervise", href: "/dashboard/members/supervised" },
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
      { label: "إحصائيّات الزوّار", icon: "chart", href: "/dashboard/analytics" },
    ],
  },
];

/**
 * الخريطة كما يراها صاحب هذه القدرات — يسقط ما لا يملك مفتاحه، ويسقط معه رأسُ
 * المجموعة إن خلت. ترشيحٌ للعرض لا حراسة: الحراسة الحقيقيّة في حارس كلّ صفحة،
 * لأنّ إخفاء الرابط لا يمنع كتابة المسار في شريط العنوان.
 */
export function navFor(caps: readonly string[]): NavGroup[] {
  return NAV.map((g) => ({
    ...g,
    items: g.items.flatMap((it) => {
      if (it.children) {
        const children = it.children.filter((c) => canOpen(caps, c.href));
        return children.length ? [{ ...it, children }] : [];
      }
      return it.href && canOpen(caps, it.href) ? [it] : [];
    }),
  })).filter((g) => g.items.length > 0);
}
