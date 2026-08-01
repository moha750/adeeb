"use client";

import { useMemo, useState } from "react";
import { Alert, Segmented } from "@adeeb/design-system";
import { GridFour, ListChecks } from "@phosphor-icons/react";
import { useToast } from "../../_components/ToastProvider";
import { setCapability } from "./actions";
import { CATEGORY_LABEL, type PermRole, type Capability } from "./vocab";
import type { CapGroup, PermCtl } from "./model";
import { PanelView } from "./PanelView";
import { GridView } from "./GridView";

/**
 * قشرة لوحة الصلاحيات — تحمل الحالةَ والكتابة، وتوجّه إلى **تصميمين** يتشاركان المِقوَد:
 * قائمةٌ ولوح (أ) · مصفوفة (ب). مرحلةُ اختيارٍ يبقى بعدها الفائز وحده (كسابقة تصاميم
 * شجرة الهيكلة). وثالثٌ هجينٌ عُرِض ثمّ **أُزيل بقرار المالك** — بمكوّناته لا بشاشته وحدها.
 *
 * السلوكُ واحدٌ مهما كان الشكل: تبديلٌ تفاؤليّ، وارتدادٌ برسالةٍ عند فشل الكتابة.
 */
type View = "panel" | "grid";

const VIEWS = [
  { value: "panel", label: <span className="seg-lbl"><ListChecks weight="bold" /> قائمة ولوح</span> },
  { value: "grid", label: <span className="seg-lbl"><GridFour weight="bold" /> مصفوفة</span> },
];

export function PermissionsMatrix({
  roles,
  capabilities,
  granted,
}: {
  roles: PermRole[];
  capabilities: Capability[];
  granted: string[];
}) {
  const toast = useToast();
  const [view, setView] = useState<View>("panel");
  const [grants, setGrants] = useState<Set<string>>(() => new Set(granted));
  const [busy, setBusy] = useState<string | null>(null);

  // القدرات مجمّعةً بالفئة (data يعيدها مرتّبةً بالفئة أصلًا)
  const groups = useMemo<CapGroup[]>(() => {
    const m = new Map<string, Capability[]>();
    for (const c of capabilities) m.set(c.category, [...(m.get(c.category) ?? []), c]);
    return [...m.entries()].map(([key, caps]) => ({ key, label: CATEGORY_LABEL[key] ?? key, caps }));
  }, [capabilities]);

  async function toggle(roleId: number, cap: Capability, on: boolean) {
    const key = `${roleId}:${cap.id}`;
    // تفاؤليّ: بدّل فورًا ثمّ اكتب؛ ارتدّ عند الفشل مع رسالة
    setGrants((g) => { const n = new Set(g); if (on) n.add(key); else n.delete(key); return n; });
    setBusy(key);
    const res = await setCapability({ roleId, permissionId: cap.id, granted: on });
    setBusy(null);
    if (!res.ok) {
      setGrants((g) => { const n = new Set(g); if (on) n.delete(key); else n.add(key); return n; });
      toast.error(res.message);
    }
  }

  const ctl: PermCtl = {
    roles,
    groups,
    capCount: capabilities.length,
    has: (roleId, capId) => grants.has(`${roleId}:${capId}`),
    countFor: (roleId) => capabilities.reduce((n, c) => (grants.has(`${roleId}:${c.id}`) ? n + 1 : n), 0),
    toggle,
    busy,
  };

  if (!roles.length) return <Alert tone="warning" title="لا مناصب">لا توجد مناصب لعرضها.</Alert>;

  return (
    <div className="flex flex-col gap-4">
      <div className="viewbar">
        <Segmented items={VIEWS} value={view} onValueChange={(v) => setView(v as View)} aria-label="تصميم لوحة الصلاحيات" />
      </div>

      {view === "panel" ? <PanelView ctl={ctl} /> : <GridView ctl={ctl} />}
    </div>
  );
}
