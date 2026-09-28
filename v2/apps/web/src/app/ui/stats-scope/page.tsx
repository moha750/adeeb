"use client";

import { useMemo, useState } from "react";
import { Badge, BarList, Button, Container, Segmented, Stat } from "@adeeb/design-system";
import { HandHeart, SignIn, UsersThree } from "@phosphor-icons/react";
import { Toolbar } from "../../dashboard/_components/Toolbar";

type Person = { id: string; name: string; wish: string; city: string; gender: "male" | "female"; seen: boolean; status: "active" | "former" };

const W = ["لجنة الفعاليات", "لجنة التصوير", "لجنة الرواة", "لجنة التسويق"];
const C = ["الأحساء", "الهفوف", "الخبر"];

const PEOPLE: Person[] = [
  ["سديم بندر القحطاني", 0, 0, "female", true], ["عبد الرحمن آل الشيخ", 1, 0, "male", true],
  ["لطيفة عبد العزيز السليطين", 0, 1, "female", true], ["ريما عبد العزيز المحسن", 2, 0, "female", false],
  ["هياء عبد العزيز العيد", 1, 0, "female", true], ["فاطمة حسين الصالح", 2, 2, "female", true],
  ["سعد وليد العبود", 0, 0, "male", true], ["مريم هاني العلوي", 3, 1, "female", true],
  ["زينب حجي الرشيد", 1, 0, "female", true], ["عذراء حامد السويح", 0, 0, "female", false],
  ["نواف ثلاب الشمري", 3, 2, "male", true], ["أريام محمد الشهري", 2, 1, "female", true],
].map(([name, w, c, gender, seen], i) => ({
  id: String(i), name: name as string, wish: W[w as number], city: C[c as number],
  gender: gender as "male" | "female", seen: seen as boolean, status: i === 11 ? "former" : "active",
}));

const TALLY = (xs: string[]) => {
  const m = new Map<string, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};

/**
 * **معاينةُ قانون نطاق الإحصاء** — يجرّبها المالك بيده قبل أن يُقرّها (٢٠٢٦-٠٩-٢٨).
 *
 * الشقُّ الأوّل: الإحصاء يسمع **التبويبَ والمرشِّحات** (تعريفُ نطاق) ولا يسمع **البحث**
 * (عثورٌ على صفٍّ بعينه). والشقُّ الثاني: متى قام مرشِّحٌ **أعلن الكرتُ نطاقَه** بسطرٍ صريح.
 * ومبدّلُ «سلوكُ اليوم» يُبقي القديمَ ليُقارَن: اكتب اسمًا في البحث وانظر الأرقام.
 */
export default function StatsScopePage() {
  const [mode, setMode] = useState<"law" | "today">("law");
  const [tab, setTab] = useState<"active" | "former">("active");
  const [wish, setWish] = useState("");
  const [q, setQ] = useState("");

  const inTab = PEOPLE.filter((p) => p.status === tab);
  const inScope = useMemo(() => inTab.filter((p) => !wish || p.wish === wish), [inTab, wish]);
  const shown = useMemo(() => inScope.filter((p) => !q.trim() || p.name.includes(q.trim())), [inScope, q]);

  // القانون : الأرقامُ من النطاق (تبويب + مرشِّح). سلوكُ اليوم : من المعروض (ومعه البحث).
  const base = mode === "law" ? inScope : shown;
  const stats = {
    count: base.length,
    female: base.filter((p) => p.gender === "female").length,
    seen: base.filter((p) => p.seen).length,
    wishes: TALLY(base.map((p) => p.wish)),
  };

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Stats Scope</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">نطاقُ الإحصاء</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          قانونٌ مقترَحٌ لكلّ تبويبٍ فيه كرتُ إحصاءٍ فوق كشف: <b>الأرقامُ تسمع التبويبَ والمرشِّحات</b>{" "}
          (تعريفُ نطاق) <b>ولا تسمع البحث</b> (عثورٌ على صفٍّ بعينه)، <b>ومتى قام مرشِّحٌ أعلن الكرتُ نطاقَه</b>.
          جرّبه: رشّح لجنةً، ثمّ اكتب اسمًا في البحث، وبدّل بين الحالتين.
        </p>

        <div className="mt-8">
          <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">الحالة</p>
          <Segmented
            items={[{ value: "law", label: "القانون المقترَح" }, { value: "today", label: "سلوكُ اليوم" }]}
            value={mode}
            onValueChange={(m) => setMode(m as "law" | "today")}
          />
        </div>

        <div className="mt-8" style={{ marginBottom: 16 }}>
          <Segmented
            wide
            items={[{ value: "active", label: "متطوّعون" }, { value: "former", label: "سابقون" }]}
            value={tab}
            onValueChange={(v) => setTab(v as "active" | "former")}
          />
        </div>

        {/* سطرُ النطاق : لا يظهر إلّا حين يقوم مرشِّح، ويُرفع بنقرة */}
        {mode === "law" && wish ? (
          <div className="flex flex-wrap items-center gap-3" style={{ marginBottom: 14 }}>
            <Badge tone="info" variant="soft" icon={<UsersThree />}>{`إحصاءُ: ${wish}`}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setWish("")}>كلُّ الكشف</Button>
          </div>
        ) : null}

        <div className="stat-grid" style={{ marginBottom: 18 }}>
          <Stat icon={<HandHeart />} value={stats.count} label={tab === "active" ? "متطوّعٌ نشط" : "متطوّعٌ سابق"} />
          <Stat icon={<UsersThree />} value={stats.female} label="فتاة" tone="success" />
          <Stat icon={<SignIn />} value={stats.seen} label="دخل في آخر ثلاثين يومًا" />
        </div>

        <div className="st-grid2" style={{ marginBottom: 18 }}>
          <div className="acard acard-body">
            <BarList items={stats.wishes} total={stats.count} unit={{ one: "متطوّع", two: "متطوّعان", few: "متطوّعين" }} empty="لا أحد." />
          </div>
          <div className="acard acard-body">
            <p className="text-content-muted text-sm">
              {mode === "law"
                ? "الأرقامُ فوق تصف النطاقَ (التبويب والمرشِّح) ولا تتحرّك بالبحث، والكشفُ تحت يتحرّك به."
                : "الأرقامُ فوق تتحرّك بكلّ شيءٍ حتى البحث، فاكتب اسمًا وانظر كيف تصير عن شخصٍ واحد."}
            </p>
          </div>
        </div>

        <Toolbar
          searchPlaceholder="اكتب اسمًا لتجرّب"
          search={q}
          onSearch={setQ}
          filters={[{ key: "committee", label: "الرغبة", options: W.map((w) => ({ value: w, label: w })) }]}
          filterValues={{ committee: wish }}
          onFilter={(_k, v) => setWish(v)}
        />

        <div className="mt-4 flex flex-col gap-2">
          {shown.map((p) => (
            <div key={p.id} className="acard acard-body flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold">{p.name}</span>
              <span className="text-content-muted text-sm">{`${p.wish}، ${p.city}`}</span>
            </div>
          ))}
          {shown.length === 0 ? <p className="text-content-muted">لا أحدَ في هذا البحث.</p> : null}
        </div>
      </Container>
    </main>
  );
}
