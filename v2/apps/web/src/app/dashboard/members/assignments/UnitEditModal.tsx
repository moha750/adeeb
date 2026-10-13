"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Field, Modal, Textarea } from "@adeeb/design-system";
import { ChatText, LinkSimple, Shapes, TextAa, WhatsappLogo } from "@phosphor-icons/react";
import { MagnifyingGlass, PencilSimple } from "@/app/_components/glyphs";
import { UNIT_ICONS, isSuggestedIcon } from "@/lib/unitIcons";
import { UnitIcon, useUnitIconNodes } from "../../_components/UnitIcon";
import { EmptyState } from "../../_components/EmptyState";
import { Skeleton } from "../../_components/Skeleton";
import { searchUnitIcons } from "./iconActions";

/**
 * الوحدةُ في النافذة: مجلسٌ أو قسمٌ أو لجنة. **معرّفُها يقول الوضع**: موجودٌ فتعديلٌ لبياناتها، وفارغٌ فإنشاءٌ
 * (واللجنةُ الجديدة تحمل قسمَها في `parent`). والمجلسُ يُعدَّل ولا يُنشأ، ومعرّفُه نصّ (`administrative`).
 */
export type EditableUnit = {
  kind: "council" | "department" | "committee";
  id: number | string | null;
  name: string;
  icon: string | null;
  description: string | null;
  link: string | null;
  /** قسمُ اللجنة الجديدة (للإنشاء وحده). */
  parent?: { id: number; name: string };
};
export type UnitValues = { name: string; icon: string | null; description: string; link: string };

/** أقصرُ اسمٍ يُقبل لوحدةٍ جديدة (نظيرُه في `createOrgUnit`). */
export const UNIT_NAME_MIN = 3;
const SEARCH_MIN_MS = 500;

/**
 * **نافذة الوحدة** — تعديلُ قسمٍ أو لجنة، أو إنشاؤهما (المالك ٢٠٢٦-١٠-١٠: «زرُّ تعديلٍ صغيرٌ في رأس كلّ
 * قسم، وآخرُ بجانب اسم كلّ لجنة»؛ ثمّ ٢٠٢٦-١٠-١١: «إضافة لجنة / قسم»). نافذةٌ واحدة للأمرين، والفرقُ
 * حقلُ الاسم: يُكتب عند الإنشاء ولا يُعدَّل بعده هنا (`updateOrgUnit` لا يمسّه).
 *
 * والمجلسُ بلا أيقونة: أيقونتُه ثابتةٌ في اللوحة ولا عمودَ لها في القاعدة، فلا يُرى منتقيها له.
 *
 * والأيقونةُ شبكةُ أزرار راديو: المقترحةُ (`lib/unitIcons.ts`) ما دام البحثُ فارغًا، ونتائجُه من مكتبة
 * Phosphor كلِّها حين يُكتب فيه (`searchUnitIcons`، بالعربيّة أو الإنجليزيّة؛ المالك ٢٠٢٦-١٠-١١).
 * والمختارةُ من خارج المقترحة تبقى أوّلَ الشبكة بعد مسح البحث. تُرسم كلُّها بأيقونة الوحدة نفسها، فما يُختار
 * هنا هو ما يُرى في رأس الكرت. وتُبنى حالتُها من الوحدة عند الفتح، فالمستدعي يمرّر `key` بها.
 */
export function UnitEditModal({ unit, busy, onClose, onSubmit }: {
  unit: EditableUnit | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (v: UnitValues) => void;
}) {
  const [name, setName] = useState(unit?.name ?? "");
  const [icon, setIcon] = useState<string | null>(unit?.icon ?? null);
  const [description, setDescription] = useState(unit?.description ?? "");
  const [link, setLink] = useState(unit?.link ?? "");

  // البحثُ في المكتبة: بعد ربع ثانيةٍ من آخر حرف، والردُّ المتأخّرُ عن استعلامٍ أحدث يُهمَل
  const drawn = useUnitIconNodes();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ key: string; node: ReactNode }[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Record<string, ReactNode>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const seq = useRef(0);
  const since = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const onQuery = (v: string) => {
    setQuery(v);
    clearTimeout(timer.current);
    const q = v.trim();
    seq.current++;
    if (q.length < 2) { setResults(null); setSearching(false); return; }
    if (!searching) since.current = Date.now();
    setSearching(true);
    const n = seq.current;
    timer.current = setTimeout(async () => {
      const r = await searchUnitIcons(q);
      // لبناتُ التحميل تبقى نصفَ ثانيةٍ على الأقلّ فلا تومض إن أسرع الردّ (المالك ٢٠٢٦-١٠-١١)
      const wait = SEARCH_MIN_MS - (Date.now() - since.current);
      if (wait > 0) await new Promise((done) => setTimeout(done, wait));
      if (n !== seq.current) return;
      setResults(r);
      setSearching(false);
    }, 250);
  };
  const custom = icon && !isSuggestedIcon(icon) ? icon : null;
  const choose = (key: string, node: ReactNode | null) => {
    setIcon(key);
    if (node) setPicked((p) => ({ ...p, [key]: node }));
  };

  const creating = !!unit && unit.id == null;
  const kind = unit?.kind ?? "committee";
  const iconKind = kind === "department" ? "department" : "committee";
  // الوصفُ والرابطُ إلزاميّان في الوضعين (المالك ٢٠٢٦-١٠-١١)، فالوحدةُ الناقصةُ لا تُحفَظ ولو تغيّرت أيقونتُها.
  const filled = !!description.trim() && !!link.trim();
  const ready = !!unit && filled && (creating
    ? name.trim().length >= UNIT_NAME_MIN
    : icon !== (unit.icon ?? null) || description.trim() !== (unit.description ?? "") || link.trim() !== (unit.link ?? ""));
  const title = !unit ? "الوحدة"
    : !creating ? `تعديل ${unit.name}`
    : kind === "department" ? "إضافة قسم جديد"
    : `إضافة لجنة جديدة إلى ${unit.parent?.name ?? "القسم"}`;

  return (
    <Modal
      open={unit !== null}
      onClose={onClose}
      busy={busy}
      size="md"
      title={title}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>إلغاء</Button>
          <Button variant="primary" size="md" loading={busy} disabled={!ready}
            onClick={() => onSubmit({ name: name.trim(), icon, description: description.trim(), link: link.trim() })}>
            {creating ? "إضافة" : "حفظ"}
          </Button>
        </>
      }
    >
      {creating ? (
        <Field
          label={kind === "department" ? "اسم القسم" : "اسم اللجنة"}
          icon={<TextAa />}
          innerIcon={<PencilSimple />}
          placeholder={kind === "department" ? "قسم الشراكات" : "لجنة البودكاست"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoFocus
          required
        />
      ) : null}
      {kind !== "council" ? (
        <div className="unit-ic-pick">
          <Field
            label="الأيقونة"
            icon={<Shapes />}
            innerIcon={<MagnifyingGlass />}
            placeholder="ابحث بالعربية أو الإنجليزية: موسيقى، rocket"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            optional
          />
          {searching ? (
            // جارٍ البحث: لبناتُ تحميلٍ بهيئة المربّعات مكانَ الشبكة، فلا تبقى الأيقوناتُ القديمة كأنّ شيئًا لم يحدث
            <div className="unit-ic-grid" role="status" aria-label="جارٍ البحث">
              {Array.from({ length: 14 }, (_, i) => <Skeleton key={i} className="unit-ic-sk" />)}
            </div>
          ) : results && !results.length ? (
            <EmptyState variant="soft" icon={<MagnifyingGlass />} title="لا أيقونة مطابقة" description="جرّب كلمةً أخرى بالعربية أو الإنجليزية." />
          ) : (
            <div className="unit-ic-grid" role="radiogroup" aria-label="الأيقونة">
              {(results
                ? results.map((r) => ({ key: r.key, label: r.key, node: r.node }))
                : custom
                ? [
                    // المختارةُ من المكتبة أوّلًا مكانَ آخر المقترحة، فتبقى الشبكةُ أربعةَ صفوفٍ تامّة
                    { key: custom, label: custom, node: picked[custom] ?? drawn[custom] ?? null },
                    ...UNIT_ICONS.slice(0, -1).map((i) => ({ key: i.key, label: i.label, node: null as ReactNode })),
                  ]
                : UNIT_ICONS.map((i) => ({ key: i.key, label: i.label, node: null as ReactNode }))
              ).map((t) => (
                <label key={t.key} className="unit-ic" title={t.label}>
                  <input type="radio" name="unit-icon" value={t.key} checked={icon === t.key} onChange={() => choose(t.key, t.node)} aria-label={t.label} />
                  <span className="unit-ic-tile">{t.node ?? <UnitIcon icon={t.key} kind={iconKind} />}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ) : null}
      <Textarea
        label="الوصف"
        icon={<ChatText />}
        innerIcon={<PencilSimple />}
        placeholder={kind === "council" ? "اكتب وصف المجلس" : kind === "department" ? "اكتب وصف القسم" : "اكتب وصف اللجنة"}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        required
      />
      <Field
        label="رابط قروب الواتساب"
        icon={<WhatsappLogo />}
        innerIcon={<LinkSimple />}
        placeholder="https://chat.whatsapp.com/…"
        charset="latin"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        required
      />
    </Modal>
  );
}
