import { Container } from "@adeeb/design-system";

// فهرس معرض المكوّنات — منزل التصميم الواحد. كل مكوّن في صفحته الحيّة (المكوّن الحقيقيّ).
const GROUPS: { title: string; pages: [string, string][] }[] = [
  {
    title: "الأسس",
    pages: [["tokens", "الرموز والألوان"], ["ambient", "خلفيّة الشفق"], ["icons", "أوزان الأيقونات"]],
  },
  {
    title: "هيكل الصفحة",
    pages: [["header", "رأس الموقع"], ["footer", "تذييل الموقع"], ["nav-mobile", "تنقّل اللوحة على الجوّال"]],
  },
  {
    title: "الإدخال",
    pages: [["buttons", "الأزرار"], ["inputs", "الحقول"], ["selects", "القوائم المنسدلة"], ["choice", "الاختيار"]],
  },
  {
    title: "العرض",
    pages: [
      ["badges", "الشارات"], ["cards", "البطاقات"], ["avatar", "الصورة الرمزيّة"], ["accordion", "الأكورديون"],
      ["carousel", "الكاروسيل"], ["carousel-nav", "أسهم التنقّل"], ["skeleton", "هياكل التحميل"], ["loading", "شاشة التحميل"], ["empty", "الحالة الفارغة"],
      ["section-heading", "عنوان القسم"], ["divider", "الفاصل بكلمة"], ["stat", "كرت الإحصاء"], ["medal", "الوسام"], ["positions", "كرت المنصب"], ["supervisors", "كرت المشرف"],
      ["membership", "بطاقة العضويّة"], ["result-card", "بطاقة نتيجة الانتخاب"], ["candidacy/states", "سِجلّ ترشُّحي: كل الحالات"], ["candidacy/apply", "معاينة صفحة الترشّح"], ["candidacy/run", "محاكي الترشُّح"], ["candidacy/vote", "محاكي التصويت"], ["auth", "شاشة المصادقة"], ["account-deletion", "الخروج من أديب لكلّ دور"],
    ],
  },
  {
    title: "التفاعل والتنبيه",
    pages: [["modal", "النوافذ الحواريّة"], ["dropdown", "قوائم الإجراءات"], ["breadcrumb", "فتات المسار"], ["tabs", "التبويبات"], ["segmented", "الشريط المقطعيّ"], ["toast", "الإشعارات"], ["alerts", "التنبيهات"], ["cursor", "مؤشّر الفأرة"], ["deebo-bubble", "فقاعة محادثة ديبو"], ["deebo-screen", "شاشة محادثة ديبو"]],
  },
  {
    title: "البيانات",
    pages: [["table", "جدول البيانات"], ["cards-view", "عرض الكروت للجداول"], ["matrix", "المصفوفة والقائمة"], ["toolbar", "شريط الأدوات"], ["pagination", "الترقيم"], ["charts", "المخطّطات"], ["structure", "شجرة الهيكلة"]],
  },
];

export default function UIKitPage() {
  return (
    <main className="py-16">
      <Container className="max-w-4xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">نظام تصميم أديب: المكوّنات</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          منزل التصميم الواحد: كل مكوّن في صفحته الحيّة: المكوّن الحقيقيّ نفسه، تفاعليّ، وما تراه هو ما يُشحَن. اختر مكوّنًا:
        </p>

        <div className="mt-12 space-y-12">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <p className="mb-4 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{g.title}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {g.pages.map(([slug, label]) => (
                  <a
                    key={slug}
                    href={`/ui/${slug}`}
                    className="group rounded border border-line bg-surface p-4 transition hover:border-primary hover:shadow-md"
                  >
                    <span className="block font-display text-lg font-bold text-content transition group-hover:text-primary">{label}</span>
                    <span className="mt-1 block font-latin text-xs text-content-muted" dir="ltr">/ui/{slug}</span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Container>
    </main>
  );
}
