"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ChartPanel, Field, Switch, matchesSearch } from "@adeeb/design-system";
import { Hash, MagnifyingGlass, PencilSimple, Shapes, Sparkle, TextT } from "@phosphor-icons/react";
import { useToast } from "../../_components/ToastProvider";
import { STAT_ICONS, STAT_ICON_CATEGORIES, DEFAULT_STAT_ICON, asIconKey, StatIcon } from "@/app/_components/statIcons";
import { formatThousands as fmt } from "@/app/_components/format";
import type { AchievementEditData } from "./data";
import { createAchievement, updateAchievement, type AchievementInput } from "./actions";

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
  const crumbLeaf = editing ? "تحرير" : "إحصائيّة جديدة";
  const countN = Number(count);
  const preview = count !== "" && Number.isInteger(countN) && countN >= 0 ? `${fmt(countN)}${plus ? "+" : ""}` : null;

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

  return (
    <>
      <div className="ash-phead">
        <div>
          <div className="ash-crumb">أديب › المحتوى › الإحصاءات › <b>{crumbLeaf}</b></div>
          <h1>{editing ? `تحرير: ${item.label}` : "إحصائيّة جديدة"}</h1>
        </div>
        <div className="form-head-actions">
          <Button variant="ghost" size="md" onClick={() => router.push("/dashboard/website/achievements")} disabled={saving}>إلغاء</Button>
          <Button variant="primary" size="md" loading={saving} onClick={save}>{editing ? "حفظ التغييرات" : "إضافة الإحصائيّة"}</Button>
        </div>
      </div>

      <div className="form-build">
        <ChartPanel headerVariant="chip" icon={<Sparkle weight="fill" />} title="الإحصائيّة">
          <div className="form-grid">
            <Field className="form-full" label="اسم الإحصائيّة" icon={<TextT />} innerIcon={<PencilSimple />} placeholder="مثال: ورش تدريبية · عضو · ظهور إعلامي" value={label} onChange={(e) => setLabel(e.target.value)} required />
            <Field type="number" charset="digits" label="الرقم" icon={<Hash />} innerIcon={<Hash />} placeholder="مثال: 350" value={count} onChange={(e) => setCount(e.target.value)} helper="حجم الكرت في الملخّص يتناسب مع الرقم." required />
            <div className="form-full">
              <Switch row label="إظهار «+» بعد الرقم" description="لأرقام «وأكثر» (مثل ٣٥٠+). يظهر مباشرةً في ملخّص المسيرة." checked={plus} onChange={(e) => setPlus(e.target.checked)} />
            </div>
            {preview ? (
              <div className="form-full text-sm text-content-muted">
                المعاينة: <b className="font-latin text-content">{preview}</b> <span>{label ? `«${label}»` : ""}</span>
              </div>
            ) : null}
          </div>
        </ChartPanel>

        <ChartPanel headerVariant="chip" icon={<Shapes weight="fill" />} title="الأيقونة">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-content-muted">
            <span>المختارة:</span>
            <span className="inline-flex items-center gap-1.5 rounded bg-secondary/10 px-2 py-1 text-content ring-1 ring-secondary/40">
              <span className="inline-flex h-4 w-4 items-center justify-center [&>svg]:h-full [&>svg]:w-full"><StatIcon name={icon} /></span>
              <b>{STAT_ICONS[icon]?.label ?? "—"}</b>
            </span>
            <span>· تظهر في كرت الإحصائيّة داخل «ملخص المسيرة».</span>
          </div>

          <Field
            label="ابحث عن أيقونة"
            icon={<MagnifyingGlass />}
            innerIcon={<MagnifyingGlass />}
            placeholder="اكتب اسمًا: جائزة · كتاب · ساعات · فعاليّة…"
            value={iconQuery}
            onChange={(e) => setIconQuery(e.target.value)}
          />

          <div className="mt-4 flex flex-col gap-4">
            {filtered.length === 0 ? (
              <p className="text-sm text-content-muted">لا أيقونة تطابق «{q}». جرّب كلمةً أخرى.</p>
            ) : (
              filtered.map((cat) => (
                <div key={cat.title}>
                  <div className="mb-2 text-xs font-bold text-content-muted">{cat.title}</div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                    {cat.keys.map((k) => (
                      <IconTile key={k} selected={icon === k} iconKey={k} label={STAT_ICONS[k].label} onSelect={() => setIcon(k)} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ChartPanel>
      </div>
    </>
  );
}

/** بلاطة اختيار أيقونة — تعرض مكوّن الأيقونة (currentColor) واسمها؛ المحدَّدة بحدٍّ نغميّ. */
function IconTile({ selected, iconKey, label, onSelect }: {
  selected: boolean; iconKey: string; label: string; onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={label}
      className={
        "flex flex-col items-center gap-1.5 rounded p-3 text-center text-xs transition ring-1 " +
        (selected
          ? "bg-secondary/10 text-content ring-2 ring-secondary"
          : "text-content-muted ring-navy-950/10 hover:text-content hover:ring-navy-950/25")
      }
    >
      <span className="inline-flex h-7 w-7 items-center justify-center [&>svg]:h-full [&>svg]:w-full"><StatIcon name={iconKey} /></span>
      <span className="leading-tight">{label}</span>
    </button>
  );
}
