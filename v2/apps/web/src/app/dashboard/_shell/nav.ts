import type { IconKey } from "./icons";

export type NavLeaf = { label: string; href: string; badge?: string };
export type NavItem = {
  label: string;
  icon: IconKey;
  href?: string;        // بند مباشر
  badge?: string;
  children?: NavLeaf[]; // مجموعة قابلة للطيّ
};
export type NavGroup = { head?: string; items: NavItem[] };

/** خريطة تنقّل اللوحة — تُبنى الأقسام تباعًا؛ لا يُدرَج بند إلّا بعد تفعيل صفحته. */
export const NAV: NavGroup[] = [
  { items: [{ label: "نظرة عامة", icon: "home", href: "/dashboard" }] },
  {
    head: "العضوية",
    items: [
      {
        label: "أعضاء أديب",
        icon: "users",
        children: [
          { label: "نشط", href: "/dashboard/members/active" },
          { label: "قيد الإكمال", href: "/dashboard/members/pending" },
          { label: "موقوف", href: "/dashboard/members/suspended" },
          { label: "هيكلة أديب", href: "/dashboard/members/structure" },
          { label: "تعيين المناصب", href: "/dashboard/members/assignments" },
          { label: "بيانات الدخول", href: "/dashboard/members/credentials" },
        ],
      },
    ],
  },
  {
    head: "النظام",
    items: [
      { label: "إحصائيّات الزوّار", icon: "chart", href: "/dashboard/analytics" },
    ],
  },
];
