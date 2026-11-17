"use client";

/**
 * **السلطة** على قالب «الحساب» (٢٠٢٦-١١-١٤) — السلوكُ سلوكُ `dashboard/system/authority/AuthorityBoard.tsx` حرفًا: مرآةُ جدولَي السلطة
 * (`position_authority`، `membership_authority`) وبابُ تحريرهما، بثلاثة محاور: **الإسناد** (أيّ المقاعد يملؤها المنصب: لا يبلغه، أو في
 * كلّ النادي، أو في وحدته وحدها — يُدار بالدور نفسه: لا ← كلّ النادي ← وحدته ← لا)، و**السحب** (من لا تطوله يدُه)، و**العضويّة** (مداه في
 * الإنهاء والاستعادة وتعديل البيانات، ومن لا يبلغه). تبديلٌ تفاؤليّ وارتدادٌ برسالةٍ إن فشلت الكتابة.
 *
 * والشكلُ **المعرض** كالصلاحيات (محمد ٢٠٢٦-١١-١٤: المصفوفةُ «تُحذف فليس لها داعٍ»): المناصبُ سطورٌ في البداية (مَن يملك السلطة)، وما
 * يملكه المختارُ بجانبها — سطورُ المقاعد في الإسناد، ومفاتيحُ الحجب في السحب والعضويّة. وكانت ثلاثَ مصفوفاتٍ أعرضَ من الشاشة.
 */
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Select } from "@adeeb/design-system";
import { Crown, HandGrabbing, ShieldCheck, UserMinus } from "@phosphor-icons/react";
import { ArrowsClockwise } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { setBlockedRole, setMembershipBlocked, setMembershipScope, setSeatAuthority, type SeatMode } from "@/app/dashboard/system/authority/actions";
import type { AuthRole, MembershipAuthorityRow, PositionAuthorityRow } from "@/app/dashboard/system/authority/data";
import { AdNote, AdSwitch, type AdPosition } from "../primitives";
import { AccountRoom, AdCols, AdLine, AdSection, AdToggleLine, type AdLineTone } from "../account";
import { FormSection } from "../form";
import { arCount, type ArForms } from "@/lib/arabicCount";

// العددُ بمعدوده المنصوب («يبلغ مقعدًا واحدًا»، «يبلغ 3 مقاعد»، «يبلغ 11 مقعدًا») — كان «يبلغ 0 من 12 مقعدًا» و«يحجب 3» بلا معدود
const AR_SEAT: ArForms = ["مقعدًا واحدًا", "مقعدين", "مقاعد", "مقعدًا"];
const AR_ROLE: ArForms = ["منصبًا واحدًا", "منصبين", "مناصب", "منصبًا"];
/** رئيسُ أدِيب محجوبٌ عن الجميع في القاعدة، فلا يُعلَّم في «السحب» */
const PRESIDENT = "club_president";

type Pos = "assign" | "take" | "membership";

const SCOPES = [
  { value: "none", label: "لا يبلغ أحدًا" },
  { value: "all", label: "الجميع (إلّا المحجوبين)" },
  { value: "supervised", label: "من يشرف عليهم" },
];
const MODE: Record<SeatMode, { say: string; tone?: AdLineTone }> = {
  none: { say: "لا يبلغه", tone: "muted" },
  all: { say: "يبلغه في كلّ النادي", tone: "ok" },
  // بلا نغمة: الوحدةُ منحٌ أضيقُ لا تحذير، والكهرمانيُّ كان يقرأ «احذر» (المراجع ٢٠٢٦-١١-١٤)
  own: { say: "يبلغه في وحدته وحدها" },
};
const NEXT: Record<SeatMode, SeatMode> = { none: "all", all: "own", own: "none" };
const ICON: Record<Pos, ReactNode> = { assign: <Crown />, take: <HandGrabbing />, membership: <UserMinus /> };

export function AuthorityRoom({ roles, position, membership, error, dry }: {
  roles: AuthRole[]; position: PositionAuthorityRow[]; membership: MembershipAuthorityRow[]; error?: string | null;
  /** مختبر: الحالُ يتبدّل في الصفحة ولا يُكتب */
  dry?: boolean;
}) {
  const toast = useToast();
  const [view, setView] = useState<Pos>("assign");
  const [pos, setPos] = useState(position);
  const [mem, setMem] = useState(membership);
  const [busy, setBusy] = useState<string | null>(null);
  const [actor, setActor] = useState<string | null>(roles[0]?.roleName ?? null);
  const side = useRef<HTMLDivElement>(null);

  const posBy = useMemo(() => new Map(pos.map((r) => [r.roleName, r])), [pos]);
  const memBy = useMemo(() => new Map(mem.map((r) => [r.roleName, r])), [mem]);
  const me = roles.find((r) => r.roleName === actor) ?? null;

  const modeOf = (a: string, seat: string): SeatMode => {
    const row = posBy.get(a);
    if (!row || !row.targetRoles.includes(seat)) return "none";
    return row.ownUnitRoles.includes(seat) ? "own" : "all";
  };

  // ══ الإسناد ══
  async function cycleSeat(a: string, seat: string) {
    const next = NEXT[modeOf(a, seat)];
    const key = `a:${a}:${seat}`;
    const before = pos;
    setPos((rows) => {
      const row = rows.find((r) => r.roleName === a) ?? { roleName: a, targetRoles: [], ownUnitRoles: [], blockedRoles: [] };
      const targets = new Set(row.targetRoles);
      const own = new Set(row.ownUnitRoles);
      if (next === "none") { targets.delete(seat); own.delete(seat); }
      if (next === "all") { targets.add(seat); own.delete(seat); }
      if (next === "own") { targets.add(seat); own.add(seat); }
      const updated = { ...row, targetRoles: [...targets], ownUnitRoles: [...own] };
      const rest = rows.filter((r) => r.roleName !== a);
      return updated.targetRoles.length || updated.blockedRoles.length ? [...rest, updated] : rest;
    });
    if (dry) return;
    setBusy(key);
    const res = await setSeatAuthority({ roleName: a, targetRole: seat, mode: next });
    setBusy(null);
    if (!res.ok) { setPos(before); toast.error(res.message); }
  }

  // ══ السحب ══
  async function toggleBlocked(a: string, blocked: string, on: boolean) {
    const key = `b:${a}:${blocked}`;
    const before = pos;
    setPos((rows) => rows.map((r) => {
      if (r.roleName !== a) return r;
      const set = new Set(r.blockedRoles);
      if (on) set.add(blocked); else set.delete(blocked);
      return { ...r, blockedRoles: [...set] };
    }));
    if (dry) return;
    setBusy(key);
    const res = await setBlockedRole({ roleName: a, blockedRole: blocked, on });
    setBusy(null);
    if (!res.ok) { setPos(before); toast.error(res.message); }
  }

  // ══ العضويّة ══
  async function changeScope(a: string, scope: string) {
    const before = mem;
    setMem((rows) => {
      const rest = rows.filter((r) => r.roleName !== a);
      if (scope === "none") return rest;
      const row = rows.find((r) => r.roleName === a);
      return [...rest, { roleName: a, scope, blockedRoles: row?.blockedRoles ?? [] }];
    });
    if (dry) return;
    setBusy(`s:${a}`);
    const res = await setMembershipScope({ roleName: a, scope: scope as "all" | "supervised" | "none" });
    setBusy(null);
    if (!res.ok) { setMem(before); toast.error(res.message); }
  }
  async function toggleMemBlocked(a: string, blocked: string, on: boolean) {
    const before = mem;
    setMem((rows) => rows.map((r) => {
      if (r.roleName !== a) return r;
      const set = new Set(r.blockedRoles);
      if (on) set.add(blocked); else set.delete(blocked);
      return { ...r, blockedRoles: [...set] };
    }));
    if (dry) return;
    setBusy(`mb:${a}:${blocked}`);
    const res = await setMembershipBlocked({ roleName: a, blockedRole: blocked, on });
    setBusy(null);
    if (!res.ok) { setMem(before); toast.error(res.message); }
  }

  // حين ينطوي العمودان عمودًا فاختيارُ منصبٍ يأخذك إلى ما يملكه (يُسأل التخطيطُ لا عرضُ الشاشة)
  const pick = (name: string) => {
    setActor(name);
    const el = side.current;
    const cols = el?.closest(".ad-acc-cols");
    if (el && cols && getComputedStyle(cols).gridTemplateColumns.split(" ").length === 1) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (error) {
    return (
      <AccountRoom navPath="/dashboard/system/authority" title="السلطة">
        <AdNote tone="bad" title="تعذّر جلب السلطة">{error}</AdNote>
      </AccountRoom>
    );
  }
  if (!roles.length || !me) {
    return (
      <AccountRoom navPath="/dashboard/system/authority" title="السلطة">
        <AdNote tone="warn" title="لا مناصب">لا توجد مناصب لعرضها.</AdNote>
      </AccountRoom>
    );
  }

  const positions: AdPosition[] = [
    { key: "assign", label: "الإسناد" },
    { key: "take", label: "السحب" },
    { key: "membership", label: "العضويّة" },
  ];
  const others = roles.filter((r) => r.roleName !== me.roleName);

  // ما يُقال تحت كلّ منصبٍ في القائمة: خلاصةُ سلطته في المحور الظاهر
  const gist = (r: AuthRole) => {
    if (view === "assign") { const n = posBy.get(r.roleName)?.targetRoles.length ?? 0; return n ? `يبلغ ${arCount(n, AR_SEAT)} من ${roles.length}` : "لا يبلغ مقعدًا"; }
    if (view === "take") { const b = posBy.get(r.roleName); if (!b) return "لا يبلغ مقعدًا"; const n = b.blockedRoles.length; return n ? `يحجب ${arCount(n, AR_ROLE)}` : "لا يحجب أحدًا"; }
    return SCOPES.find((s) => s.value === (memBy.get(r.roleName)?.scope ?? "none"))?.label ?? "";
  };

  const note = view === "assign" ? (
    <AdNote tone="info" title="الحالُ ثلاثيّة">اضغط سطرَ المقعد لتدوير حاله: لا يبلغه، ثمّ يبلغه في كلّ النادي، ثمّ في الوحدة التي يقودها وحدها، ثمّ لا يبلغه.</AdNote>
  ) : view === "take" ? (
    <AdNote tone="info" title="من لا تطوله يدُه">من يملك التعيين في المقعد يملك إخلاءه: عضو اللجنة يُنقل من لجنته، وصاحب أيّ مقعدٍ غيره لا ينقله إلّا من يملك التعيين في مقعده، ولا يُعزل قائد إدارةٍ إلّا بيد رئيس أدِيب. ولا يُنقل من عُلّم هنا. (ورئيس أدِيب محجوبٌ عن الجميع في القاعدة، فلا يُعلَّم.)</AdNote>
  ) : (
    <AdNote tone="info" title="بابٌ آخر">هذه سلطةُ العضويّة: إنهاؤها واستعادتها وتعديل بيانات صاحبها. لا تُخلط بالمناصب: نزعُ منصبٍ ليس إخراجًا من النادي.</AdNote>
  );

  const assignPane = (
    <AdSection icon={<Crown />} title={`ما يملؤه ${me.roleAr}`} sub="المقاعد التي يبلغها بالتعيين">
      {roles.map((seat) => {
        const m = modeOf(me.roleName, seat.roleName);
        return (
          <AdLine key={seat.roleName} icon={<Crown />} v={seat.roleAr} sub={MODE[m].say} tone={MODE[m].tone} toneAt="sub"
            disabled={busy === `a:${me.roleName}:${seat.roleName}`} act={{ icon: <ArrowsClockwise />, text: "بدّل", label: "بدّل حال مقعد" }}
            onClick={() => void cycleSeat(me.roleName, seat.roleName)} />
        );
      })}
    </AdSection>
  );

  // **القائمةُ كاملةً في كلّ حال** (المراجع ٢٠٢٦-١١-١٤): منصبٌ لا يبلغ مقعدًا كان يُرى رأسَ قسمٍ وحده بجانب قائمةٍ طويلة فراغٌ بينهما.
  // فتُعرض مفاتيحُه موقوفةً، والسببُ في رأس القسم — والقاعدةُ تُفهم من موضعها
  const takeRow = posBy.get(me.roleName);
  const takePane = (
    <AdSection icon={<HandGrabbing />} title={`من لا تطوله يدُ ${me.roleAr}`}
      sub={takeRow ? "لا يُنقل ولا يُعزل بيده ولو بلغ مقعدَه" : "لا يبلغ مقعدًا بعد، فلا يُحجب عنه أحد: امنحه مقعدًا في «الإسناد» أوّلًا"}>
      {roles.map((x) => (
        <AdToggleLine key={x.roleName} icon={<HandGrabbing />} label={x.roleAr}
          description={x.roleName === PRESIDENT ? "محجوبٌ عن الجميع في القاعدة" : undefined}
          checked={x.roleName === PRESIDENT || (takeRow?.blockedRoles.includes(x.roleName) ?? false)}
          disabled={!takeRow || x.roleName === PRESIDENT || busy === `b:${me.roleName}:${x.roleName}`}
          onChange={(on) => void toggleBlocked(me.roleName, x.roleName, on)} />
      ))}
    </AdSection>
  );

  const memRow = memBy.get(me.roleName);
  const scope = memRow?.scope ?? "none";
  const memPane = (
    <>
      <FormSection icon={<UserMinus />} title={`مدى ${me.roleAr}`} sub="من يبلغ في إنهاء العضويّة واستعادتها وتعديل البيانات">
        <div className="form-grid">
          <Select className="form-full" label="مداه" icon={<UserMinus />} options={SCOPES} value={scope} disabled={busy === `s:${me.roleName}`}
            onValueChange={(v) => void changeScope(me.roleName, v)} />
        </div>
      </FormSection>
      {/* يُعرض في كلّ مدى، موقوفًا حين لا يكون «الجميع»: يُفهم منه أنّ الاستثناءَ من «الجميع» وحده، ولا يبقى تحت الاختيار فراغ */}
      <AdSection icon={<ShieldCheck />} title="لا يبلغ" sub={scope === "all" ? "من يُستثنى من «الجميع»" : "يعمل حين يكون المدى «الجميع»"}>
        {others.map((x) => (
          <AdToggleLine key={x.roleName} icon={<ShieldCheck />} label={x.roleAr}
            checked={scope === "all" && (memRow?.blockedRoles.includes(x.roleName) ?? false)} disabled={scope !== "all" || busy === `mb:${me.roleName}:${x.roleName}`}
            onChange={(on) => void toggleMemBlocked(me.roleName, x.roleName, on)} />
        ))}
      </AdSection>
    </>
  );

  return (
    <AccountRoom navPath="/dashboard/system/authority" title="السلطة"
      head={<AdSwitch positions={positions} position={view} onPosition={(k) => setView(k as Pos)} />}>
      {note}
      <AdCols asideFirst sticky aside={
        <AdSection icon={ICON[view]} title="المناصب" sub="من يملك السلطة: اختر منصبًا">
          {roles.map((r) => (
            <AdLine key={r.roleName} icon={ICON[view]} v={r.roleAr} sub={gist(r)} current={r.roleName === me.roleName} onClick={() => pick(r.roleName)} />
          ))}
        </AdSection>
      }>
        <div ref={side} className="ad-perm-caps">
          {view === "assign" ? assignPane : view === "take" ? takePane : memPane}
        </div>
      </AdCols>
    </AccountRoom>
  );
}
