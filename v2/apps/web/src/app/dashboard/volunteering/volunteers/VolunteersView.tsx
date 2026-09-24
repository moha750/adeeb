"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarList, Button, Donut, Modal, Segmented, SectionCard, Select, Stat, Textarea,
} from "@adeeb/design-system";
import { EmptyState } from "../../_components/EmptyState";
import { Certificate, HandHeart, MapPin, SignIn, Users, UsersThree } from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import { PageHeader } from "../../_components/PageHeader";
import { Toolbar } from "../../_components/Toolbar";
import { useToast } from "../../_components/ToastProvider";
import { endVolunteering, grantMembership } from "../actions";
import type { VolunteerRow } from "../data";
import { VolunteerCard } from "./VolunteerCard";
import { VolunteerHero, VolunteerRecord } from "./VolunteerRecord";
import { copyText } from "@/lib/clipboard";

type Ask = { kind: "grant" | "end"; row: VolunteerRow } | null;

const VOL_UNIT = { one: "متطوّع", two: "متطوّعان", few: "متطوّعين" };

/**
 * تطبيعُ اسم المدينة للعدّ وحده: الهمزاتُ تُوحَّد والتاءُ المربوطة والتطويل، فـ«الاحساء»
 * و«الأحساء» و«الإحساء» صفٌّ واحدٌ في المخطّط. والمعروضُ أكثرُ الرسوم ورودًا لا المطبَّع،
 * فالشاشةُ تعدّ ولا تصحّح ما كتبه صاحبُه (تصحيحُ الصفوف قرارٌ آخر).
 */
function cityKey(name: string): string {
  return name
    .replace(/ـ/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function tally(values: string[]): { label: string; value: number }[] {
  const groups = new Map<string, Map<string, number>>();
  for (const v of values) {
    const k = cityKey(v);
    const forms = groups.get(k) ?? new Map<string, number>();
    forms.set(v, (forms.get(v) ?? 0) + 1);
    groups.set(k, forms);
  }
  return [...groups.values()]
    .map((forms) => {
      const total = [...forms.values()].reduce((n, x) => n + x, 0);
      const label = [...forms.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return { label, value: total };
    })
    .sort((a, b) => b.value - a.value);
}

/**
 * **سجلُّ المتطوّعين** — غيرُ سجلّ الفرصة: ذاك واقعةٌ واحدة، وهذا مسيرةُ المتطوّع كلُّها.
 *
 * ومنه فعلان: **الإهداءُ** (عضويّةٌ ومنصبٌ في فعلٍ واحد، واللجنةُ المقترحةُ رغبتُه الأولى)،
 * و**إنهاءُ التطوّع** بسببٍ مكتوب. والترشيحُ بالرغبة هو ما تسأل عنه الموارد حين ينقصها أعضاء.
 *
 * والكرتُ ملخّصٌ لا سجلّ: كلُّ ما سجّلته القاعدةُ عن المتطوّع يُفتَح من زرّ «السجلّ الكامل»
 * (أمرُ المالك ٢٠٢٦-٠٩-٢٤)، فالكرتُ الضيّقُ لا تُزاد عليه ثلاثون صفًّا.
 *
 * وكرتُ الإحصاء **يصف ما تراه لا ما في القاعدة كلِّها**: يُحسَب من الكشف بعد التبويب والنخل،
 * فإن رشّحتَ لجنةً قال لك إحصاءَها وحدَها.
 */
export function VolunteersView({ rows, committees }: {
  rows: VolunteerRow[];
  committees: { id: number; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"active" | "former">("active");
  const [search, setSearch] = useState("");
  const [pref, setPref] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask>(null);
  const [record, setRecord] = useState<VolunteerRow | null>(null);
  const [committee, setCommittee] = useState("");
  const [reason, setReason] = useState("");

  /**
   * النخلُ **بأيّ رغبة** لا بالأولى وحدَها (بكلمة المالك ٢٠٢٦-٠٩-٢٤): من ذكر لجنتَك ثانيةً
   * أو ثالثةً راغبٌ فيها، وإسقاطُه ظلمٌ له وحرمانٌ للّجنة من يدٍ تريدها.
   *
   * والأفضليّةُ لا تضيع بذلك: الناتجُ **يُرتَّب برتبة اللجنة عندك** (أصحابُ الأولى أوّلًا)،
   * والكرتُ يعرض شاراتِ الرغبات مرقَّمةً كما هي. فالرتبةُ تُقرأ ولا تَحجُب.
   */
  const shown = useMemo(() => {
    const wanted = pref ? Number(pref) : null;
    const rank = (r: VolunteerRow) => {
      const i = r.prefs.findIndex((p) => p.id === wanted);
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };
    const list = rows.filter((r) => {
      if (r.status !== tab) return false;
      if (wanted != null && rank(r) === Number.MAX_SAFE_INTEGER) return false;
      const q = search.trim();
      // البحثُ يبلغ البريدَ والمدينة أيضًا، فالكشفُ صار يحملهما
      if (q && !r.name.includes(q) && !r.phone.includes(q)
        && !r.email.toLowerCase().includes(q.toLowerCase()) && !(r.city ?? "").includes(q)) return false;
      return true;
    });
    return wanted == null ? list : [...list].sort((a, b) => rank(a) - rank(b));
  }, [rows, tab, pref, search]);

  const stats = useMemo(() => {
    const sum = (f: (r: VolunteerRow) => number) => shown.reduce((n, r) => n + f(r), 0);
    const female = shown.filter((r) => r.gender === "female").length;
    const male = shown.filter((r) => r.gender === "male").length;
    return {
      count: shown.length,
      female,
      male,
      certificates: sum((r) => r.certificates),
      seen: shown.filter((r) => r.seenLast30).length,
      genders: [
        { label: "فتيات", value: female },
        { label: "شباب", value: male },
        { label: "غير محدَّد", value: shown.length - female - male },
      ].filter((g) => g.value > 0),
      prefs: tally(shown.map((r) => r.prefs[0]?.name ?? "").filter(Boolean)),
      cities: tally(shown.map((r) => r.city ?? "").filter(Boolean)),
      noCity: shown.filter((r) => !r.city).length,
    };
  }, [shown]);

  // مفتاحُ `committee` لا اسمٌ جديد : رمزُ البُعد يُشتقّ من المفتاح في `filterIcons` (مصدرٌ واحد)
  const prefFilter = useMemo(
    () => [{ key: "committee", label: "الرغبة", options: committees.map((c) => ({ value: String(c.id), label: c.name })) }],
    [committees],
  );

  const copyPhones = async () => {
    const list = shown.map((r) => r.phone).filter(Boolean).join("\n");
    if (!list) { toast.error("لا أرقامَ في هذا الكشف."); return; }
    try {
      await copyText(list);
      toast.success(`نُسخ ${shown.length} رقمًا، قابِلها بأعضاء القروب.`);
    } catch {
      toast.error("تعذّر النسخ.");
    }
  };

  const openAsk = (kind: "grant" | "end", row: VolunteerRow) => {
    setCommittee(row.prefs[0] ? String(row.prefs[0].id) : "");
    setReason("");
    setAsk({ kind, row });
  };

  const confirm = async () => {
    if (!ask) return;
    setBusy(ask.row.userId);
    const r = ask.kind === "grant"
      ? await grantMembership(ask.row.userId, Number(committee))
      : await endVolunteering(ask.row.userId, reason);
    setBusy(null);
    if (!r.ok) { toast.error(r.message); return; }
    toast.success(r.message);
    setAsk(null);
    router.refresh();
  };

  return (
    <>
      <PageHeader
        title="سجلّ المتطوّعين"
        action={{ label: "نسخُ الأرقام", onClick: copyPhones }}
      />

      <div style={{ marginBottom: 16 }}>
        {/* ممتدٌّ على الصفّ : الخيارُ هنا هو الشاشةُ نفسُها (كشفٌ أم كشف)، لا زينةُ ركن */}
        <Segmented
          wide
          items={[
            { value: "active", label: "متطوّعون" },
            { value: "former", label: "سابقون" },
          ]}
          value={tab}
          onValueChange={(v) => setTab(v as "active" | "former")}
        />
      </div>

      {/* ثلاثٌ في صفٍّ واحد (قاعدةُ `.stat-grid`)، بلا ملحوظةٍ تحت الرقم : حلقةُ الجنس أسفلُ تقولها */}
      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat
          icon={<HandHeart />}
          value={stats.count}
          label={tab === "active" ? "متطوّعٌ نشط" : "متطوّعٌ سابق"}
        />
        <Stat icon={<Certificate />} value={stats.certificates} label="شهادةُ مشاركةٍ صادرة" tone="success" />
        <Stat
          icon={<SignIn />}
          value={stats.seen}
          label="دخل في آخر ثلاثين يومًا"
          tone={stats.seen > 0 ? "brand" : "danger"}
        />
      </div>

      <div className="st-grid2" style={{ marginBottom: 18 }}>
        <SectionCard title="الرغبةُ الأولى" icon={<UsersThree />}>
          <BarList items={stats.prefs} total={stats.count} unit={VOL_UNIT} empty="لا رغباتٍ مرتَّبةً في هذا الكشف." />
        </SectionCard>
        <SectionCard title="المدن" icon={<MapPin />}>
          <BarList
            items={stats.cities}
            total={stats.count}
            unit={VOL_UNIT}
            empty="لا مدينةَ مكتوبةً في هذا الكشف."
          />
        </SectionCard>
      </div>

      <SectionCard title="الجنس" icon={<Users />} style={{ marginBottom: 18 }}>
        <Donut items={stats.genders} unit={VOL_UNIT} empty="لا متطوّعين في هذا الكشف." />
      </SectionCard>

      <Toolbar
        searchPlaceholder="اسم أو جوّال أو بريد"
        search={search}
        onSearch={setSearch}
        filters={prefFilter}
        filterValues={{ committee: pref }}
        onFilter={(_k, v) => setPref(v)}
      />

      {shown.length === 0 ? (
        <EmptyState variant="soft" icon={<HandHeart />} title="لا متطوّعين هنا"
          description="من قدّم للعضويّة ورتّب رغباته ظهر في هذا الكشف." />
      ) : (
        // شبكةٌ بعمودين على الحاسوب وعمودٍ على الجوّال : الكرتُ صفٌّ عريضٌ لا مربّع
        <div className="card-grid card-grid-2col">
          {shown.map((r) => (
            <VolunteerCard
              key={r.userId}
              v={r}
              onOpen={() => setRecord(r)}
              onGrant={() => openAsk("grant", r)}
              onEnd={() => openAsk("end", r)}
            />
          ))}
        </div>
      )}

      {/* السجلُّ الكامل : نافذةٌ بهيئة عرض الملفّ في تبويب الأعضاء، لا شكلٌ ثانٍ للسؤال نفسِه */}
      <Modal
        open={record !== null}
        onClose={() => setRecord(null)}
        title={record?.name ?? "السجلّ الكامل"}
        size="md"
        className="pvb-modal"
        hero={record ? <VolunteerHero v={record} /> : undefined}
        footer={<Button variant="ghost" size="md" onClick={() => setRecord(null)}>إغلاق</Button>}
      >
        {record ? <VolunteerRecord v={record} /> : null}
      </Modal>

      <Modal
        open={ask !== null}
        onClose={() => setAsk(null)}
        busy={busy !== null}
        title={ask?.kind === "grant" ? "إهداءُ العضويّة" : "إنهاءُ التطوّع"}
        description={
          ask?.kind === "grant"
            ? "يصير عضوًا في أدِيب ويُسنَد إلى لجنته، وينتهي تطوّعُه في الفعل نفسه."
            : "يبقى في السجلّ سابقًا بسببه المكتوب، ويُخرَج من قروب المتطوّعين."
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setAsk(null)}>إلغاء</Button>
            <Button
              variant={ask?.kind === "grant" ? "primary" : "danger"} size="md"
              loading={busy !== null} onClick={confirm}
            >
              {ask?.kind === "grant" ? "إهداء" : "إنهاء"}
            </Button>
          </>
        }
      >
        {ask?.kind === "grant" ? (
          <Select
            label="اللجنة"
            options={committees.map((c) => ({ value: String(c.id), label: c.name }))}
            value={committee}
            onValueChange={setCommittee}
            helper="المقترحةُ رغبتُه الأولى، ولك أن تغيّرها."
            required
          />
        ) : (
          <Textarea
            label="السبب" icon={<PencilSimple />} innerIcon={<PencilSimple />}
            placeholder="يبقى في سجلّه" rows={3}
            value={reason} onChange={(e) => setReason(e.target.value)} required
          />
        )}
      </Modal>
    </>
  );
}
