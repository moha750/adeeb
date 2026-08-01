"use client";

import { useState } from "react";
import { Checkbox, Container, Matrix, OptionList, type MatrixGroup } from "@adeeb/design-system";

// عيّنةٌ بمقاس الحقيقة: اثنا عشر عمودًا وثمانية عشر صفًّا في ستّ فئات — عندها وحدها
// يُختبَر اللصوقُ والصليبُ والتمريرُ الأفقيّ. (أسماءٌ مختصرةٌ من هيكلة أديب.)
const ROLES = [
  "رئيس النادي", "مستشار الرئيس", "رئيس المجلس التنفيذيّ", "قائد الموارد البشريّة",
  "قائد ضمان الجودة", "رئيس قسم", "عضو موارد بشريّة", "عضو ضمان الجودة",
  "قائد لجنة", "منسّق فعاليّة", "نائب قائد لجنة", "عضو لجنة",
];

const CAPS: { cat: string; items: [string, string][] }[] = [
  { cat: "الإدارة", items: [["إدارة الصلاحيات", "manage_permissions"], ["إدارة المناصب", "manage_positions"], ["توزيع أعضاء الوحدة", "assign_unit_members"]] },
  { cat: "العضوية", items: [["عرض الأعضاء", "view_members"], ["المعلّقون", "view_pending_members"], ["الموقوفون", "view_suspended_members"], ["أعياد الميلاد", "view_birthdays"], ["الهيكلة", "view_org_structure"], ["بيانات الدخول", "manage_member_data"]] },
  { cat: "الأنشطة", items: [["إدارة الفعاليات", "manage_activities"]] },
  { cat: "الاستبيانات", items: [["إدارة الاستبيانات", "manage_surveys"]] },
  { cat: "الانتخابات", items: [["إدارة الانتخابات", "manage_elections"]] },
  { cat: "الموقع", items: [["الأعمال", "manage_works"], ["الإنجازات", "manage_achievements"], ["الرعاة", "manage_sponsors"], ["الأسئلة", "manage_faq"], ["المكتبة", "manage_library"], ["إحصاءات الموقع", "view_site_stats"]] },
];

const columns = ROLES.map((r, i) => ({ key: String(i), label: r, title: r }));
const groups: MatrixGroup[] = CAPS.map((g) => ({
  key: g.cat,
  label: g.cat,
  rows: g.items.map(([ar, key]) => ({ key, label: ar, hint: key })),
}));

// منحٌ تجريبيّ: الأعلى يملك أكثر — لتظهر المصفوفة بكثافةٍ حقيقيّة لا بشبكةٍ فارغة
const seed = (rowKey: string, colKey: string) => (rowKey.length + Number(colKey) * 3) % 4 !== 0;

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">{children}</p>;
}

export default function MatrixPage() {
  const [grants, setGrants] = useState<Set<string>>(
    () => new Set(groups.flatMap((g) => g.rows.flatMap((r) => columns.filter((c) => seed(r.key, c.key)).map((c) => `${r.key}:${c.key}`)))),
  );
  const [pick, setPick] = useState<string | null>(null);
  const has = (r: string, c: string) => grants.has(`${r}:${c}`);
  const flip = (r: string, c: string, on: boolean) =>
    setGrants((g) => { const n = new Set(g); const k = `${r}:${c}`; if (on) n.add(k); else n.delete(k); return n; });
  const countFor = (c: string) => groups.reduce((n, g) => n + g.rows.filter((r) => has(r.key, c)).length, 0);
  const total = groups.reduce((n, g) => n + g.rows.length, 0);

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System · Matrix</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">المصفوفة وقائمة الاختيار</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          بدائيّتان لعلاقةٍ ثنائيّة (صفّ × عمود). <b>المصفوفة</b> تُقرأ في الاتجاهين: رأسُ الأعمدة لاصقٌ
          أعلى، وعمودُ الصفوف لاصقٌ في الصدر، و<b>صليبٌ مُضاء</b> يتبع الخليّة المارّ عليها — بلا هذا
          يضيع البصر في اثني عشر عمودًا. و<b>قائمة الاختيار</b> نظيرُ الشريط المقطعيّ حين تكثر الخيارات:
          <code className="font-latin"> .seg</code> صفٌّ يضيق باثني عشر، وهذه عمودٌ يتّسع.
          أنماطُهما <code className="font-latin">.mtx-*</code> و<code className="font-latin">.olist-*</code> بالمكتبة.
        </p>

        <div className="mt-12 space-y-12">
          <section>
            <Label>مصفوفة قابلة للتحرير · خليّتها مربّع اختيار</Label>
            <Matrix
              aria-label="مصفوفة تجريبيّة"
              corner="القدرة"
              columns={columns.map((c) => ({ ...c, hint: `${countFor(c.key)}/${total}` }))}
              groups={groups}
              maxHeight="460px"
              cell={(row, col) => (
                <Checkbox
                  checked={has(row.key, col.key)}
                  onChange={(e) => flip(row.key, col.key, e.currentTarget.checked)}
                  aria-label={`${row.key} — ${col.label}`}
                />
              )}
            />
          </section>

          <section>
            <Label>قائمة الاختيار العموديّة</Label>
            <div className="max-w-[280px]">
              <OptionList
                heading="المناصب"
                aria-label="المناصب"
                value={pick}
                onValueChange={setPick}
                items={columns.map((c) => ({ value: c.key, label: c.label, count: `${countFor(c.key)}` }))}
              />
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
