"use client";

import { useMemo } from "react";
import { Checkbox, Matrix, type MatrixGroup } from "@adeeb/design-system";
import type { PermCtl } from "./model";

/**
 * التصميم (ب) — **المصفوفة**: قدرةٌ لكلّ صفّ ومنصبٌ لكلّ عمود، والتحرير في التقاطع.
 *
 * يُجيب السؤال الذي يعجز عنه اللوح: «مَن يملك هذه القدرة؟» — يُقرأ الصفّ فيُعرَف.
 * وثمنُه عرضٌ لا تسعه الشاشة، فالرأس والعمود لاصقان والتمرير أفقيّ.
 */
export function GridView({ ctl }: { ctl: PermCtl }) {
  const capById = useMemo(
    () => new Map(ctl.groups.flatMap((g) => g.caps).map((c) => [c.id, c])),
    [ctl.groups],
  );
  const roleByName = useMemo(() => new Map(ctl.roles.map((r) => [r.roleName, r])), [ctl.roles]);

  const columns = ctl.roles.map((r) => ({
    key: r.roleName,
    label: r.roleAr,
    hint: `${ctl.countFor(r.roleName)}/${ctl.capCount}`,
    title: r.roleAr,
  }));

  const groups: MatrixGroup[] = ctl.groups.map((g) => ({
    key: g.key,
    label: g.label,
    rows: g.caps.map((c) => ({ key: String(c.id), label: c.nameAr, hint: c.key })),
  }));

  return (
    <Matrix
      aria-label="مصفوفة الصلاحيات"
      corner="القدرة"
      columns={columns}
      groups={groups}
      maxHeight="min(calc(100dvh - 250px), 760px)"
      cell={(row, col) => {
        const capId = Number(row.key);
        const roleName = col.key;
        const cap = capById.get(capId);
        const role = roleByName.get(roleName);
        if (!cap || !role) return null;
        return (
          <Checkbox
            checked={ctl.has(roleName, capId)}
            disabled={ctl.busy === `${roleName}:${capId}`}
            onChange={(e) => ctl.toggle(roleName, cap, e.currentTarget.checked)}
            aria-label={`${cap.nameAr} — ${role.roleAr}`}
          />
        );
      }}
    />
  );
}
