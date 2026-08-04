"use client";

import { useMemo, useState } from "react";
import { Alert, Card, CardBody, Checkbox, Matrix, Segmented, Select, type MatrixGroup } from "@adeeb/design-system";
import { Crown, HandGrabbing, UserMinus } from "@phosphor-icons/react";
import { useToast } from "../../_components/ToastProvider";
import { setBlockedRole, setMembershipBlocked, setMembershipScope, setSeatAuthority, type SeatMode } from "./actions";
import type { AuthRole, MembershipAuthorityRow, PositionAuthorityRow } from "./data";

/**
 * لوحةُ السلطة — مرآةُ جدولَي السلطة، وبابُ تحريرهما.
 *
 * ثلاثةُ محاور لأنّ السلطة ثلاثةُ أسئلةٍ لا سؤالٌ واحد:
 *   · **الإسناد** — أيّ المقاعد يملؤها هذا الدور؟ (`position_authority.target_roles`)
 *     والخليّة ثلاثيّة لا ثنائيّة: لا يبلغه · يبلغه في كلّ النادي · في وحدته وحدها.
 *   · **السحب** — من لا تطوله يدُه ولو بلغ المقعد؟ (`blocked_roles`)
 *   · **العضويّة** — بابٌ آخر بجدولٍ آخر (`membership_authority`): الإنهاء والاستعادة
 *     وتعديل البيانات. لا يُخلط بالمناصب — عزلٌ من منصبٍ ليس إخراجًا من النادي.
 *
 * والسلوك كلوحة الصلاحيات: تبديلٌ تفاؤليّ، وارتدادٌ برسالةٍ عند فشل الكتابة.
 */
type View = "assign" | "take" | "membership";

const VIEWS = [
  { value: "assign", label: <span className="seg-lbl"><Crown /> الإسناد</span> },
  { value: "take", label: <span className="seg-lbl"><HandGrabbing /> السحب</span> },
  { value: "membership", label: <span className="seg-lbl"><UserMinus /> العضويّة</span> },
];

const SCOPES = [
  { value: "none", label: "لا يبلغ أحدًا" },
  { value: "all", label: "الجميع (إلّا المحجوبين)" },
  { value: "supervised", label: "من يشرف عليهم" },
];

export function AuthorityBoard({
  roles,
  position,
  membership,
}: {
  roles: AuthRole[];
  position: PositionAuthorityRow[];
  membership: MembershipAuthorityRow[];
}) {
  const toast = useToast();
  const [view, setView] = useState<View>("assign");
  const [pos, setPos] = useState(position);
  const [mem, setMem] = useState(membership);
  const [busy, setBusy] = useState<string | null>(null);

  const posBy = useMemo(() => new Map(pos.map((r) => [r.roleName, r])), [pos]);
  const memBy = useMemo(() => new Map(mem.map((r) => [r.roleName, r])), [mem]);
  const arOf = useMemo(() => new Map(roles.map((r) => [r.roleName, r.roleAr])), [roles]);

  const modeOf = (actor: string, seat: string): SeatMode => {
    const row = posBy.get(actor);
    if (!row || !row.targetRoles.includes(seat)) return "none";
    return row.ownUnitRoles.includes(seat) ? "own" : "all";
  };

  // ══ الإسناد ══
  async function cycleSeat(actor: string, seat: string) {
    const now = modeOf(actor, seat);
    const next: SeatMode = now === "none" ? "all" : now === "all" ? "own" : "none";
    const key = `a:${actor}:${seat}`;
    const before = pos;

    setPos((rows) => {
      const row = rows.find((r) => r.roleName === actor)
        ?? { roleName: actor, targetRoles: [], ownUnitRoles: [], blockedRoles: [] };
      const targets = new Set(row.targetRoles);
      const own = new Set(row.ownUnitRoles);
      if (next === "none") { targets.delete(seat); own.delete(seat); }
      if (next === "all") { targets.add(seat); own.delete(seat); }
      if (next === "own") { targets.add(seat); own.add(seat); }
      const updated = { ...row, targetRoles: [...targets], ownUnitRoles: [...own] };
      const rest = rows.filter((r) => r.roleName !== actor);
      return updated.targetRoles.length || updated.blockedRoles.length ? [...rest, updated] : rest;
    });

    setBusy(key);
    const res = await setSeatAuthority({ roleName: actor, targetRole: seat, mode: next });
    setBusy(null);
    if (!res.ok) { setPos(before); toast.error(res.message); }
  }

  // ══ السحب ══
  async function toggleBlocked(actor: string, blocked: string, on: boolean) {
    const key = `b:${actor}:${blocked}`;
    const before = pos;
    setPos((rows) => rows.map((r) => {
      if (r.roleName !== actor) return r;
      const set = new Set(r.blockedRoles);
      if (on) set.add(blocked); else set.delete(blocked);
      return { ...r, blockedRoles: [...set] };
    }));
    setBusy(key);
    const res = await setBlockedRole({ roleName: actor, blockedRole: blocked, on });
    setBusy(null);
    if (!res.ok) { setPos(before); toast.error(res.message); }
  }

  // ══ العضويّة ══
  async function changeScope(actor: string, scope: string) {
    const before = mem;
    setMem((rows) => {
      const rest = rows.filter((r) => r.roleName !== actor);
      if (scope === "none") return rest;
      const row = rows.find((r) => r.roleName === actor);
      return [...rest, { roleName: actor, scope, blockedRoles: row?.blockedRoles ?? [] }];
    });
    setBusy(`s:${actor}`);
    const res = await setMembershipScope({ roleName: actor, scope: scope as "all" | "supervised" | "none" });
    setBusy(null);
    if (!res.ok) { setMem(before); toast.error(res.message); }
  }

  async function toggleMemBlocked(actor: string, blocked: string, on: boolean) {
    const before = mem;
    setMem((rows) => rows.map((r) => {
      if (r.roleName !== actor) return r;
      const set = new Set(r.blockedRoles);
      if (on) set.add(blocked); else set.delete(blocked);
      return { ...r, blockedRoles: [...set] };
    }));
    setBusy(`mb:${actor}:${blocked}`);
    const res = await setMembershipBlocked({ roleName: actor, blockedRole: blocked, on });
    setBusy(null);
    if (!res.ok) { setMem(before); toast.error(res.message); }
  }

  if (!roles.length) return <Alert tone="warning" title="لا مناصب">لا توجد مناصب لعرضها.</Alert>;

  // الأعمدة = المُنفّذون (من يملك السلطة)، والصفوف = المقاعد أو المحجوبون.
  const columns = roles.map((r) => ({
    key: r.roleName,
    label: r.roleAr,
    title: r.roleAr,
    hint: view === "assign" ? `${posBy.get(r.roleName)?.targetRoles.length ?? 0}` : undefined,
  }));
  const allRows: MatrixGroup[] = [{ key: "all", rows: roles.map((r) => ({ key: r.roleName, label: r.roleAr, hint: r.roleName })) }];

  return (
    <div className="flex flex-col gap-4">
      <div className="viewbar">
        <Segmented items={VIEWS} value={view} onValueChange={(v) => setView(v as View)} aria-label="محاور السلطة" />
      </div>

      {view === "assign" ? (
        <>
          <Alert tone="info" title="الخليّة ثلاثيّة">
            اضغط لتدوير الحال: <b>فارغ</b> لا يبلغ المقعد · <b>✓</b> يبلغه في كلّ النادي ·
            <b> وحدته</b> لا يبلغه إلّا في الوحدة التي يقودها. والعمود يقول كم مقعدًا يبلغ.
          </Alert>
          <Matrix
            aria-label="مصفوفة سلطة الإسناد"
            corner="المقعد"
            columns={columns}
            groups={allRows}
            colWidth="92px"
            maxHeight="min(calc(100dvh - 320px), 720px)"
            cell={(row, col) => {
              const mode = modeOf(col.key, row.key);
              const key = `a:${col.key}:${row.key}`;
              return (
                <button
                  type="button"
                  className={`au-cell au-${mode}`}
                  disabled={busy === key}
                  onClick={() => cycleSeat(col.key, row.key)}
                  aria-label={`${arOf.get(col.key)} ← ${arOf.get(row.key)}`}
                >
                  {mode === "none" ? "·" : mode === "all" ? "✓" : "وحدته"}
                </button>
              );
            }}
          />
        </>
      ) : null}

      {view === "take" ? (
        <>
          <Alert tone="info" title="من لا تطوله يدُه">
            السحب تابعٌ للإجلاس: من بلغ المقعد أخذ شاغلَه من حيث كان — إلّا من عُلّم هنا.
            (ورئيس النادي محجوبٌ عن الجميع في القاعدة، فلا يُعلَّم.)
          </Alert>
          <Matrix
            aria-label="مصفوفة الحجب"
            corner="المحجوب"
            columns={columns}
            groups={allRows}
            maxHeight="min(calc(100dvh - 320px), 720px)"
            cell={(row, col) => {
              const rowAuth = posBy.get(col.key);
              if (!rowAuth) return <span className="au-na">—</span>;
              const on = rowAuth.blockedRoles.includes(row.key);
              return (
                <Checkbox
                  checked={on}
                  disabled={busy === `b:${col.key}:${row.key}`}
                  onChange={(e) => toggleBlocked(col.key, row.key, e.currentTarget.checked)}
                  aria-label={`${arOf.get(col.key)} لا يطول ${arOf.get(row.key)}`}
                />
              );
            }}
          />
        </>
      ) : null}

      {view === "membership" ? (
        <>
          <Alert tone="info" title="بابٌ آخر">
            هذه سلطةُ <b>العضويّة</b> — إنهاؤها واستعادتها وتعديل بيانات صاحبها. لا تُخلط
            بالمناصب: نزعُ منصبٍ ليس إخراجًا من النادي.
          </Alert>

          <div className="grid gap-4 sm:grid-cols-2">
            {roles.map((r) => {
              const row = memBy.get(r.roleName);
              const scope = row?.scope ?? "none";
              return (
                <Card key={r.roleName}>
                  <CardBody className="flex flex-col gap-3">
                  <div className="font-bold">{r.roleAr}</div>
                  <Select
                    label="مداه"
                    options={SCOPES}
                    value={scope}
                    onValueChange={(v) => changeScope(r.roleName, v)}
                  />
                  {scope === "all" ? (
                    <div className="flex flex-col gap-2">
                      <span className="org-sublbl">لا يبلغ</span>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {roles.filter((x) => x.roleName !== r.roleName).map((x) => (
                          <label key={x.roleName} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={row?.blockedRoles.includes(x.roleName) ?? false}
                              disabled={busy === `mb:${r.roleName}:${x.roleName}`}
                              onChange={(e) => toggleMemBlocked(r.roleName, x.roleName, e.currentTarget.checked)}
                              aria-label={`${r.roleAr} لا يبلغ ${x.roleAr}`}
                            />
                            <span>{x.roleAr}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
