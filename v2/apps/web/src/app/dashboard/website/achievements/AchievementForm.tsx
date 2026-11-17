"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, matchesSearch } from "@adeeb/design-system";
import { FloppyDisk, Hash, PlusCircle, Shapes, Sparkle, TextT } from "@phosphor-icons/react";
import { MagnifyingGlass, PencilSimple, Plus } from "@/app/_components/glyphs";
import { useToast } from "../../_components/ToastProvider";
import { STAT_ICONS, STAT_ICON_CATEGORIES, DEFAULT_STAT_ICON, asIconKey, StatIcon } from "@/app/_components/statIcons";
import type { AchievementEditData } from "./data";
import { createAchievement, updateAchievement, type AchievementInput } from "./actions";
import { AdCard } from "@/app/_ad/primitives";
import { fmtNum } from "@/app/_ad/format";
import { FormRoom, FormSection, FormToggle } from "@/app/_ad/form";

export function AchievementForm({ item }: { item?: AchievementEditData | null }) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();

  const [label, setLabel] = useState(item?.label ?? "");
  const [count, setCount] = useState(item?.count != null ? String(item.count) : "");
  const [plus, setPlus] = useState(item?.plus ?? true);
  // مفتاح صريح من السجلّ؛ الجديد والإرثيّ (FontAwesome) يبدآن على الافتراض
  const [icon, setIcon] = useState<string>(asIconKey(item?.icon) ?? DEFAULT_STAT_ICON);
  const [iconQuery, setIconQuery] = useState("");

  const editing = item != null;
  const countN = Number(count);
  const shown = count !== "" && Number.isInteger(countN) && countN >= 0 ? `${fmtNum(countN)}${plus ? "+" : ""}` : null;

  // بحثٌ يطابق الاسم العربيّ أو المفتاح؛ يُبقي التجميع بالفئات ويُخفي الفارغة
  const q = iconQuery.trim();
  const filtered = useMemo(
    () => STAT_ICON_CATEGORIES.map((cat) => ({
      title: cat.title,
      keys: cat.keys.filter((k) => matchesSearch(q, STAT_ICONS[k].label, k)),
    })).filter((cat) => cat.keys.length > 0),
    [q],
  );

  const toInput = (): AchievementInput => ({ label, count: Number(count) || 0, plus, icon });

  /**
   * **أثمّة ما يُحفَظ؟** — في التحرير لا يُحفظ قبل أوّل تغيير، وفي الضيّق يلحقك الفعلُ حين يوجد (`FormRoom`). والمقارنةُ بلَقطةِ `toInput()`
   * نفسِها التي تُرسَل، والأصلُ يُجمَّد في حالةٍ تُهيَّأ مرّةً: الشاشةُ تُغادَر بعد الحفظ
   * فلا معنى لتحديثه. **ولا `useRef`** — قراءةُ `ref.current` أثناء الرسم يردّها
   * `react-hooks/refs` خطأً، والحالةُ المهيّأةُ مرّةً تقول المعنى نفسَه وتُقرأ في الرسم.
   */
  const snapshot = JSON.stringify(toInput());
  const [origin] = useState(snapshot);
  const dirty = snapshot !== origin;

  const save = () => {
    startSave(async () => {
      const input = toInput();
      const r = editing ? await updateAchievement(item.id, input) : await createAchievement(input);
      if (r.ok) {
        toast.success(r.message);
        router.push("/dashboard/website/achievements");
        router.refresh();
      } else toast.error(r.message);
    });
  };

  /* التذكرةُ كما ستظهر في غرفة الإحصائيّات (`_ad/rooms/AchievementsRoom`): الاسمُ عنوانُها، والرمزُ سطرُها، والرقمُ رقمُها — فهي «المعاينة» التي
     كانت سطرًا تحت الحقول («المعاينة: 350+»)، و«المختارة: …» فوق المنتقي (المختارُ يُرى في بلاطته وفي التذكرة) */
  const iconName = STAT_ICONS[icon]?.label ?? "—";
  const preview = (
    <div className="ad-form-preview-card" data-untitled={label.trim() ? undefined : ""}>
      <AdCard seed={item?.id ?? "new-stat"} title={label.trim() || "اسم الإحصائيّة"}
        meta={[{ icon: <StatIcon name={icon} />, text: `أيقونة «${iconName}»` }]}
        figures={[{ value: shown ?? "—", label: "الرقم", icon: <Hash /> }]} />
    </div>
  );

  return (
    <FormRoom
      title={editing ? `تحرير: ${item.label}` : "إحصائيّة جديدة"}
      preview={preview}
      commit={{
        primary: editing
          ? { label: "حفظ التغييرات", icon: <FloppyDisk />, onClick: save, busy: saving, held: !dirty }
          : { label: "إضافة الإحصائيّة", icon: <Plus />, onClick: save, busy: saving },
        cancelHref: "/dashboard/website/achievements",
        dirty,
      }}
    >
      <FormSection id="stat" icon={<Sparkle />} title="الإحصائيّة">
        <div className="form-grid">
          <Field className="form-full" label="اسم الإحصائيّة" icon={<TextT />} innerIcon={<PencilSimple />} placeholder="مثال: ورش تدريبية، عضو، ظهور إعلامي" value={label} onChange={(e) => setLabel(e.target.value)} required />
          <Field className="form-full" type="number" charset="digits" label="الرقم" icon={<Hash />} innerIcon={<Hash />} placeholder="مثال: 350" value={count} onChange={(e) => setCount(e.target.value)} helper="حجم الكرت في الملخّص يتناسب مع الرقم." required />
          <FormToggle className="form-full" icon={<PlusCircle />} label="إظهار «+» بعد الرقم" description="لأرقام «وأكثر» (مثل 350+). يظهر مباشرةً في ملخّص المسيرة."
            checked={plus} onChange={setPlus} />
        </div>
      </FormSection>

      <FormSection id="icon" icon={<Shapes />} title="الأيقونة" sub="تظهر في كرت الإحصائيّة داخل «ملخّص المسيرة».">
        <div className="ad-ficons">
          <Field
            label="ابحث عن أيقونة"
            icon={<MagnifyingGlass />}
            innerIcon={<MagnifyingGlass />}
            placeholder="اكتب اسمًا: جائزة، كتاب، ساعات، فعاليّة…"
            value={iconQuery}
            onChange={(e) => setIconQuery(e.target.value)}
          />
          {filtered.length === 0 ? (
            <p className="ad-ficons-none">لا أيقونة تطابق «{q}». جرّب كلمةً أخرى.</p>
          ) : (
            filtered.map((cat) => (
              <div key={cat.title} className="ad-ficons-group">
                <h3 className="ad-ficons-h">{cat.title}</h3>
                <div className="ad-ficons-grid">
                  {cat.keys.map((k) => (
                    <IconTile key={k} selected={icon === k} iconKey={k} label={STAT_ICONS[k].label} onSelect={() => setIcon(k)} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </FormSection>
    </FormRoom>
  );
}

/** بلاطةُ اختيار رمز: بيضاءُ بحدّ الأداة، والمختارةُ قطعةٌ من اللوح (المختارُ من المادّة الأخرى) — كانت حلقةً فولاذيّةً بأصناف Tailwind. */
function IconTile({ selected, iconKey, label, onSelect }: {
  selected: boolean; iconKey: string; label: string; onSelect: () => void;
}) {
  return (
    <button type="button" className="ad-ficon" onClick={onSelect} aria-pressed={selected} title={label}>
      <StatIcon name={iconKey} />
      <span>{label}</span>
    </button>
  );
}
