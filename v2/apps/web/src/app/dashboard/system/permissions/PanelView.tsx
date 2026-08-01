"use client";

import { useState, type ReactNode } from "react";
import { Card, CardBody, CardHeader, CountBadge, OptionList, Switch } from "@adeeb/design-system";
import { CalendarCheck, ClipboardText, Globe, ShieldCheck, Trophy, UsersThree } from "@phosphor-icons/react";
import type { PermCtl } from "./model";

/** أيقونة كلّ فئة — دلاليّة لا زينة: رأسُ بطاقة الفئة. */
const CATEGORY_ICON: Record<string, ReactNode> = {
  admin: <ShieldCheck weight="fill" />,
  membership: <UsersThree weight="fill" />,
  activities: <CalendarCheck weight="fill" />,
  surveys: <ClipboardText weight="fill" />,
  elections: <Trophy weight="fill" />,
  website: <Globe weight="fill" />,
};

/**
 * التصميم (أ) — **قائمةٌ ولوح**: المناصبُ عمودٌ ثابتٌ في الصدر (كلٌّ بعدد قدراته)،
 * وقدراتُ المختار بطاقاتٌ بفئاتها إلى جانبه.
 *
 * يُجيب «ماذا يملك هذا المنصب؟» بأقصر طريق، ولا يُجيب «مَن يملك هذه القدرة؟».
 */
export function PanelView({ ctl }: { ctl: PermCtl }) {
  const [selName, setSelName] = useState<string | null>(ctl.roles[0]?.roleName ?? null);
  const role = ctl.roles.find((r) => r.roleName === selName) ?? null;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[262px_minmax(0,1fr)]">
      <OptionList
        heading="المناصب"
        aria-label="المناصب"
        value={selName}
        onValueChange={(v) => setSelName(v)}
        items={ctl.roles.map((r) => ({
          value: r.roleName,
          label: r.roleAr,
          count: `${ctl.countFor(r.roleName)}`,
        }))}
      />

      {role ? (
        <div className="flex flex-col gap-4">
          {ctl.groups.map((g) => {
            const on = g.caps.reduce((n, c) => (ctl.has(role.roleName, c.id) ? n + 1 : n), 0);
            return (
              <Card key={g.key}>
                <CardHeader
                  variant="soft"
                  icon={CATEGORY_ICON[g.key]}
                  title={g.label}
                  actions={<CountBadge tone={on ? "info" : "neutral"}>{`${on}/${g.caps.length}`}</CountBadge>}
                />
                <CardBody>
                  <div className="flex flex-col gap-1">
                    {g.caps.map((c) => (
                      <Switch
                        key={c.id}
                        row
                        label={c.nameAr}
                        description={c.key}
                        checked={ctl.has(role.roleName, c.id)}
                        disabled={ctl.busy === `${role.roleName}:${c.id}`}
                        onChange={(e) => ctl.toggle(role.roleName, c, e.currentTarget.checked)}
                      />
                    ))}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
