"use client";

/**
 * **الصلاحيات** على قالب «الحساب» (٢٠٢٦-١١-١٤) — السلوكُ سلوكُ `dashboard/system/permissions/*` حرفًا: منحُ قدرةٍ لمنصبٍ ونزعُها تبديلًا
 * تفاؤليًّا يرتدّ برسالةٍ إن فشلت الكتابة (`setCapability`)، ومعاينةُ اللوحة بعينَي عضو، ومعاينةُ منصبٍ فارغٍ بشاغلٍ مؤقّت.
 * **وسقطت «المصفوفة»** (محمد ٢٠٢٦-١١-١٤: «تُحذف فليس لها داعٍ»): أعرضُ من الشاشة ومن الهويّة القديمة، و«المناصب» تجيب سؤالَها.
 *
 * والشكلُ: موضعان تحت اللوح («المناصب»، «المعاينة»). و«المناصب» **المعرض** (`AdCols asideFirst`): المناصبُ سطورٌ في
 * البداية وعددُ قدرات كلٍّ تحته، وقدراتُ المختار أقسامُ فئاتها بجانبها، كلُّ قدرةٍ سطرُ مفتاح (`AdToggleLine`). والمعاينتان قسمان من
 * أقسام النموذج، اختيارُهما في جسمهما وزرُّهما في رأسهما. وكانت: منسدلةَ مواضعَ وبطاقاتٍ وتنبيهين بأزرارهما من الهويّة القديمة.
 */
import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@adeeb/design-system";
import { CalendarCheck, ClipboardText, Globe, HandHeart, Key, Microphone, Newspaper, Robot, ShieldCheck, SquaresFour, TreeStructure, Trophy, UsersFour, UsersThree, Wrench } from "@phosphor-icons/react";
import { Eye } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { startViewAs, previewVacantPosition } from "@/app/dashboard/_shell/view-as-actions";
import { setCapability } from "@/app/dashboard/system/permissions/actions";
import { CATEGORY_LABEL, type Capability, type PermRole } from "@/app/dashboard/system/permissions/vocab";
import type { CapGroup } from "@/app/dashboard/system/permissions/model";
import type { VacantSeat, ViewAsTarget } from "@/app/dashboard/system/permissions/data";
import { AdButton, AdNote, AdSwitch, type AdPosition } from "../primitives";
import { AccountRoom, AdCols, AdLine, AdSection, AdToggleLine } from "../account";
import { FormSection } from "../form";

/** رمزُ كلّ فئة — دلاليٌّ لا زينة: رأسُ قسمها وسطورُها. */
const CATEGORY_ICON: Record<string, ReactNode> = {
  admin: <ShieldCheck />, membership: <UsersThree />, activities: <CalendarCheck />, surveys: <ClipboardText />,
  elections: <Trophy />, website: <Globe />, radio: <Microphone />, deebo: <Robot />,
  news: <Newspaper />, portal: <SquaresFour />, tools: <Wrench />, volunteering: <HandHeart />,
};
const iconOf = (k: string) => CATEGORY_ICON[k] ?? <Key />;

type Pos = "roles" | "preview";

export function PermissionsRoom({ roles, capabilities, granted, targets, vacancies, error, dry }: {
  roles: PermRole[]; capabilities: Capability[]; granted: string[]; targets: ViewAsTarget[]; vacancies: VacantSeat[]; error?: string | null;
  /** مختبر: المفتاحُ يتبدّل في الصفحة ولا يُكتب، والمعاينةُ لا تبدأ — فلا تتغيّر صلاحيّةٌ حقيقيّة ولا هويّةُ الجلسة */
  dry?: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pos, setPos] = useState<Pos>("roles");
  const [grants, setGrants] = useState<Set<string>>(() => new Set(granted));
  const [busy, setBusy] = useState<string | null>(null);
  const [selName, setSelName] = useState<string | null>(roles[0]?.roleName ?? null);
  const role = roles.find((r) => r.roleName === selName) ?? null;
  const caps = useRef<HTMLDivElement>(null);

  // القدراتُ مجمّعةً بالفئة (data يعيدها مرتّبةً بالفئة أصلًا)
  const groups = useMemo<CapGroup[]>(() => {
    const m = new Map<string, Capability[]>();
    for (const c of capabilities) m.set(c.category, [...(m.get(c.category) ?? []), c]);
    return [...m.entries()].map(([key, cs]) => ({ key, label: CATEGORY_LABEL[key] ?? key, caps: cs }));
  }, [capabilities]);

  async function toggle(roleName: string, cap: Capability, on: boolean) {
    const key = `${roleName}:${cap.id}`;
    // تفاؤليّ: بدّل فورًا ثمّ اكتب؛ ارتدّ عند الفشل مع رسالة
    setGrants((g) => { const n = new Set(g); if (on) n.add(key); else n.delete(key); return n; });
    if (dry) return;
    setBusy(key);
    const res = await setCapability({ roleName, permissionId: cap.id, granted: on });
    setBusy(null);
    if (!res.ok) {
      setGrants((g) => { const n = new Set(g); if (on) n.delete(key); else n.add(key); return n; });
      toast.error(res.message);
    }
  }
  const has = (roleName: string, capId: number) => grants.has(`${roleName}:${capId}`);
  const countFor = (roleName: string) => capabilities.reduce((n, c) => (has(roleName, c.id) ? n + 1 : n), 0);

  // حين تنزل القدراتُ تحت المناصب (العمودان صارا عمودًا) فاختيارُ منصبٍ يأخذك إليها. ويُسأل التخطيطُ نفسُه لا عرضُ الشاشة: العمودان
  // ينطويان بعرض الغرفة (`@container`) لا بعرض النافذة، فكان سؤالُ النافذة يخطئ بين 861 و1250 فلا يحدث شيءٌ يُرى (المراجع ٢٠٢٦-١١-١٤)
  const pick = (name: string) => {
    setSelName(name);
    const el = caps.current;
    const cols = el?.closest(".ad-acc-cols");
    if (el && cols && getComputedStyle(cols).gridTemplateColumns.split(" ").length === 1) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── المعاينتان (حارسُهما حارسُ الغرفة: من يمنح القدرات يرى أثرها بعينَي صاحبها) ──
  const [who, setWho] = useState("");
  const [seatName, setSeatName] = useState("");
  const [unitId, setUnitId] = useState("");
  // لكلّ معاينةٍ انتظارُها: زرٌّ واحدٌ يدور لا الاثنان
  const [goingWho, startWho] = useTransition();
  const [goingSeat, startSeat] = useTransition();
  const seat = vacancies.find((s) => s.roleName === seatName) ?? null;
  const needsUnit = seat != null && seat.scope !== "none";
  const seatReady = seat != null && (!needsUnit || unitId !== "");
  const enter = (start: typeof startWho, run: () => Promise<{ ok: boolean; message: string }>) =>
    dry ? toast.info("مختبر: لا تبدأ المعاينة من هنا.") : start(async () => {
      const res = await run();
      toast[res.ok ? "success" : "error"](res.message);
      if (!res.ok) return;
      router.push("/dashboard");
      router.refresh();
    });

  const positions: AdPosition[] = [
    { key: "roles", label: "المناصب" },
    ...(targets.length || vacancies.length ? [{ key: "preview", label: "المعاينة" }] : []),
  ];

  if (error) {
    return (
      <AccountRoom navPath="/dashboard/system/permissions" title="الصلاحيات">
        <AdNote tone="bad" title="تعذّر جلب الصلاحيات">{error}</AdNote>
      </AccountRoom>
    );
  }

  const rolesPane = (
    <AdCols asideFirst sticky aside={
      <AdSection icon={<ShieldCheck />} title="المناصب" sub="اختر منصبًا لترى قدراته وتغيّرها">
        {roles.map((r) => (
          // بلا «عرض» في كلّ سطر: السطرُ كلُّه زرُّه، والزرُّ المكرّرُ اثنتي عشرة مرّةً كان يطيل القائمةَ ولا يقول شيئًا
          <AdLine key={r.roleName} icon={<ShieldCheck />} v={r.roleAr} sub={`${countFor(r.roleName)} من ${capabilities.length} قدرة`}
            current={r.roleName === role?.roleName} onClick={() => pick(r.roleName)} />
        ))}
      </AdSection>
    }>
      <div ref={caps} className="ad-perm-caps">
        {role ? groups.map((g) => {
          const on = g.caps.reduce((n, c) => (has(role.roleName, c.id) ? n + 1 : n), 0);
          return (
            <AdSection key={g.key} icon={iconOf(g.key)} title={g.label} sub={`${role.roleAr}: ${on} من ${g.caps.length}`}>
              {g.caps.map((c) => (
                <AdToggleLine key={c.id} icon={iconOf(g.key)} label={c.nameAr} description={c.key}
                  checked={has(role.roleName, c.id)} disabled={busy === `${role.roleName}:${c.id}`}
                  onChange={(v) => void toggle(role.roleName, c, v)} ltr />
              ))}
            </AdSection>
          );
        }) : null}
      </div>
    </AdCols>
  );

  const previewPane = (
    <>
      {targets.length ? (
        <FormSection icon={<Eye />} title="معاينة اللوحة بعينَي عضو"
          sub="تدخل اللوحة بهويّته كاملةً: ترى تبويباته ونطاقه، وتنفّذ بصلاحيّته، فتبويبٌ كـ«توزيع الإشراف» نطاقُه هويّةُ القائد لا قدرتُه وحدها. وينتهي كلّ شيءٍ بزرّ «إنهاء المعاينة»."
          act={<AdButton variant="fill" size="sm" icon={<Eye />} busy={goingWho} held={!who} onClick={() => enter(startWho, () => startViewAs(who))}>ابدأ المعاينة</AdButton>}>
          <div className="form-grid">
            <Select className="form-full" label="العضو" icon={<Eye aria-hidden />} required searchable
              options={targets.map((t) => ({ value: t.id, label: t.name, group: t.roleAr }))} value={who} onValueChange={setWho} />
          </div>
        </FormSection>
      ) : null}
      {vacancies.length ? (
        <FormSection icon={<TreeStructure />} title="معاينة منصبٍ فارغ"
          sub="يُجلَس عليه شاغلٌ مؤقّت (ملفٌّ واحد بلا حساب دخول، خارج سجلّ الأعضاء) ثمّ تلبس هويّته، ويُحذف مقعده بمجرّد «إنهاء المعاينة» فيعود المنصب فارغًا كما كان."
          act={<AdButton variant="fill" size="sm" icon={<Eye />} busy={goingSeat} held={!seatReady}
            onClick={() => enter(startSeat, () => previewVacantPosition({ roleName: seat!.roleName, unitId: needsUnit ? Number(unitId) : null }))}>ابدأ المعاينة</AdButton>}>
          <div className="form-grid">
            <Select className="form-full" label="المنصب الفارغ" icon={<TreeStructure aria-hidden />} required
              options={vacancies.map((s) => ({ value: s.roleName, label: s.roleAr }))} value={seatName}
              onValueChange={(v) => { setSeatName(v); setUnitId(""); }} />
            {needsUnit ? (
              <Select className="form-full" label={seat!.scope === "committee" ? "اللجنة" : "القسم"} icon={<UsersFour aria-hidden />} required searchable
                options={seat!.units.map((u) => ({ value: String(u.id), label: u.name }))} value={unitId} onValueChange={setUnitId} />
            ) : null}
          </div>
        </FormSection>
      ) : null}
    </>
  );

  return (
    <AccountRoom navPath="/dashboard/system/permissions" title="الصلاحيات"
      head={<AdSwitch positions={positions} position={pos} onPosition={(k) => setPos(k as Pos)} />}>
      {/* بلا مناصب تبقى المعاينتان (كانتا تُعرضان فوق اللوحة في القديمة) */}
      {pos !== "preview" && !roles.length ? <AdNote tone="warn" title="لا مناصب">لا توجد مناصب لعرضها.</AdNote>
        : pos === "roles" ? rolesPane : previewPane}
    </AccountRoom>
  );
}
