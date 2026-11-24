"use client";

/**
 * **نافذةُ «فريق الرؤية»** (محمد ٢٠٢٦-١١-٢٢: «نفّذ»؛ ونُقلت إلى «الرؤى» ٢٠٢٦-١١-٢٣): مقاعدُ الرؤية كلُّها في نافذةٍ واحدة — المشرفُ العامّ
 * وقائدُ الرؤية وقائدٌ لكلّ مسار. لكلّ مقعدٍ أحدُ أهل أدِيب بمنتقي الأشخاص المعتمد، أو اسمُ من لا حساب له بجنسه (على سَنن ضيوف الفعاليّة).
 * **والفريقُ جزءٌ ممّا يُعتمد**: يُسمّى في المسوّدة فيوافق عليه الرئيسان معها، ويُعدَّل بعد الإطلاق من صفحتها في «الرؤى».
 * المقعدُ بمفتاح مساره في المحرّر (`track`)، والحفظُ عند صاحب النافذة: مع المسوّدة، أو مباشرةً للرؤية السارية.
 */
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { Crown, Flag, UserList, Users, UsersThree } from "@phosphor-icons/react";
import { Button, Modal, ModalSectionHeading } from "@adeeb/design-system";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import { trackIcon } from "@/app/vision/_parts/trackIcon";
import type { CreditPerson } from "@/lib/people";
import { GENDER_OPTIONS } from "@/lib/activities";
import { arabicNameError } from "@/lib/personName";
import { AdPeoplePicker, type AdPerson } from "../people";
import { FormChoice, FormHint } from "../form";
import { AdButton } from "../primitives";
import { Link as LinkIcon } from "@phosphor-icons/react";
import { nearAccounts } from "@/lib/vision/seatMatch";

export type TeamRole = "supervisor" | "leader" | "track";
/** مقعدٌ مسمًّى: حسابٌ (`profileId`) أو اسمٌ مكتوبٌ بجنسه لمن لا حساب له. و`track` مفتاحُ المسار في المحرّر، و`null` للمشرف والقائد */
export type TeamSeat = {
  role: TeamRole; track: string | null;
  profileId: string | null;
  /** الاسمُ كما يُعرض: من الملفّ للحساب، والمكتوبُ لغيره */
  name: string;
  gender: "male" | "female" | null;
  avatar: string | null;
};
/** المسارُ كما يُقال في اسم مقعده: `label` «مسار التمكين»، وقبل أن يُسمّى «المسار الأول» */
export type TeamTrack = { key: string; label: string; icon: string };

/** اسمُ المقعد بجنس صاحبه: [للرجل، للمرأة] */
export function seatTitle(role: TeamRole, trackLabel: string | null): [string, string] {
  if (role === "supervisor") return ["المشرف العام", "المشرفة العامة"];
  if (role === "leader") return ["قائد الرؤية", "قائدة الرؤية"];
  return [`قائد ${trackLabel ?? "المسار"}`, `قائدة ${trackLabel ?? "المسار"}`];
}
export const seatIcon = (role: TeamRole, icon?: string): ReactNode => (role === "supervisor" ? <Crown /> : role === "leader" ? <Flag /> : trackIcon(icon ?? "target"));
/** المقاعدُ بترتيبها: المشرفُ ثمّ القائدُ ثمّ قادةُ المسارات بترتيب مساراتهم */
export const seatSlots = (tracks: TeamTrack[]) => [
  { role: "supervisor" as const, track: null as string | null },
  { role: "leader" as const, track: null as string | null },
  ...tracks.map((t) => ({ role: "track" as const, track: t.key as string | null })),
];
/** المقاعدُ الفارغة (للإرسال: يُعتمد الفريقُ كاملًا مع الرؤية) */
export const missingSeats = (tracks: TeamTrack[], seats: TeamSeat[]) =>
  seatSlots(tracks).filter((s) => !seats.some((x) => x.role === s.role && x.track === s.track));

type SeatDraft = { role: TeamRole; track: string | null; label: [string, string]; icon: ReactNode; value: string; gender: "male" | "female" | "" };
const groupIcon = (g: string) => (g.includes("متطوّع") ? <UserList /> : <Users />);

export function VisionTeamWindow({ open, onClose, busy, tracks, seats, pool, onSave }: {
  open: boolean; onClose: () => void; busy?: boolean;
  tracks: TeamTrack[]; seats: TeamSeat[]; pool: CreditPerson[];
  onSave: (seats: TeamSeat[]) => void;
}) {
  const toast = useToast();
  const genderById = useMemo(() => {
    const m = new Map<string, "male" | "female" | null>(pool.filter((p) => p.id).map((p) => [p.id as string, p.gender === "male" || p.gender === "female" ? p.gender : null]));
    for (const s of seats) if (s.profileId && !m.has(s.profileId)) m.set(s.profileId, s.gender);
    return m;
  }, [pool, seats]);
  const people = useMemo<AdPerson[]>(() => {
    const out = pool.filter((m): m is CreditPerson & { id: string } => !!m.id).map((m) => ({
      id: m.id, name: m.name, group: m.group, hint: m.hint,
      face: <Avatar name={m.name} src={m.avatarUrl ?? undefined} gender={m.gender} size="xs" />,
    }));
    // صاحبُ مقعدٍ خرج من البِركة (انتهت عضويّته) يبقى معروفًا باسمه في منتقيه
    for (const s of seats) {
      if (s.profileId && !out.some((p) => p.id === s.profileId)) {
        out.push({ id: s.profileId, name: s.name, group: "", hint: undefined, face: <Avatar name={s.name} src={s.avatar ?? undefined} gender={s.gender} size="xs" /> });
      }
    }
    return out;
  }, [pool, seats]);
  const personById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const fresh = (): SeatDraft[] => seatSlots(tracks).map(({ role, track }) => {
    const s = seats.find((x) => x.role === role && x.track === track);
    const t = tracks.find((x) => x.key === track);
    return { role, track, label: seatTitle(role, t?.label ?? null), icon: seatIcon(role, t?.icon), value: s ? s.profileId ?? s.name : "", gender: s && !s.profileId ? s.gender ?? "" : "" };
  });
  const [drafts, setDrafts] = useState<SeatDraft[]>(fresh);
  // تُفتح النافذةُ على ما في الصفحة الآن، لا على ما تُرك فيها آخرَ مرّة
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) { setWasOpen(open); if (open) setDrafts(fresh()); }

  const setDraft = (i: number, patch: Partial<SeatDraft>) => setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const isFree = (d: SeatDraft) => !!d.value.trim() && !personById.has(d.value);
  const labelOf = (d: SeatDraft) => {
    const g = isFree(d) ? d.gender : d.value ? genderById.get(d.value) : null;
    return g === "female" ? d.label[1] : d.label[0];
  };
  const save = () => {
    // الاسمُ المكتوب يُفحص هنا قبل الخادم: عربيٌّ، وبجنسٍ مختار
    for (const d of drafts) {
      if (!isFree(d)) continue;
      const nameErr = arabicNameError(d.value);
      if (nameErr) { toast.error(`«${d.value.trim()}»: ${nameErr}`); return; }
      if (!d.gender) { toast.error(`اختر جنس «${d.value.trim()}».`); return; }
    }
    // المشرفُ العامّ وقائدُ الرؤية شخصان: من رفع «أُنجز» يؤكّده الآخر
    const sup = drafts.find((d) => d.role === "supervisor")?.value.trim();
    if (sup && sup === drafts.find((d) => d.role === "leader")?.value.trim()) { toast.error("المشرف العام وقائد الرؤية شخصان: من رفع «أُنجز» يؤكّده الآخر."); return; }
    onSave(drafts.filter((d) => d.value.trim()).map((d) => {
      const m = personById.get(d.value);
      return m
        ? { role: d.role, track: d.track, profileId: m.id, name: m.name, gender: genderById.get(m.id) ?? null, avatar: seats.find((s) => s.profileId === m.id)?.avatar ?? pool.find((p) => p.id === m.id)?.avatarUrl ?? null }
        : { role: d.role, track: d.track, profileId: null, name: d.value.trim(), gender: d.gender || null, avatar: null };
    }));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="md"
      title="فريق الرؤية"
      description="المشرف العام وقائد الرؤية وقائد لكل مسار، يظهرون في صفحة الرؤية ويُعتمدون معها."
      footer={
        <>
          <Button variant="primary" size="md" loading={busy} onClick={save}>حفظ</Button>
          <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>إلغاء</Button>
        </>
      }
    >
      {/* العناوينُ والمقاعدُ أبناءُ جسم النافذة مباشرةً (`Fragment` لا غلاف): فراغُها من `.mdl-body` نفسه، والعنوانُ يتنفّس فوقه */}
      {drafts.map((d, i) => {
        const free = isFree(d);
        const nameErr = free ? arabicNameError(d.value) : null;
        return (
          <Fragment key={`${d.role}-${d.track ?? 0}`}>
            {i === 0 ? <ModalSectionHeading icon={<Crown />} title="قيادة الرؤية" /> : null}
            {i === 2 ? <ModalSectionHeading icon={<UsersThree />} title="قادة المسارات" /> : null}
            <AdPeoplePicker
              single free optional freeHint="بلا حساب في بوّابة أدِيب" freeHintInList={false}
              label={labelOf(d)} icon={d.icon} roleIcon={d.icon} groupIcon={groupIcon}
              people={people} value={d.value ? [d.value] : []} onChange={(ids) => setDraft(i, { value: ids[0] ?? "", gender: "" })}
              placeholder="ابحث في أهل أدِيب، أو اكتب الاسم كاملًا"
              below={free ? (
                <>
                  {/* جنسُ من لا حساب له تحت سطره في كتلته: يقلب تسميةَ المقعد (قائد/قائدة) ساعةَ يُختار */}
                  <FormChoice label={`جنس ${d.value.trim()}`} items={GENDER_OPTIONS} value={d.gender} onChange={(v) => setDraft(i, { gender: v as "male" | "female" })} />
                  {/* الحقلُ مخفيٌّ ما دام الاسمُ مختارًا، فخطأُ الاسم يُقال هنا لا في وصف الحقل */}
                  {nameErr ? <FormHint tone="bad">{nameErr}</FormHint> : null}
                </>
              ) : undefined}
            />
          </Fragment>
        );
      })}
    </Modal>
  );
}

/**
 * المقاعدُ مقروءةً في قسم «فريق الرؤية» بالمحرّر: لكلّ مقعدٍ اسمُه بجنس صاحبه وصاحبُه، والفارغُ «لم يُسمَّ بعد».
 * **والمقعدُ المكتوبُ باسمٍ يقرب منه حسابٌ في البوابة** (محمد ٢٠٢٦-١١-٢٣) يُقترح تحته ذلك الحسابُ باسمه الكامل وصورته ووحدته:
 * «حسابٌ باسمٍ قريب»، لا «له حساب» — فالتشابهُ لا يجزم، والربطُ نقرةُ إنسانٍ يرى الاسم كاملًا (`onLink`).
 */
export function VisionTeamList({ tracks, seats, pool = [], onLink }: {
  tracks: TeamTrack[]; seats: TeamSeat[];
  pool?: CreditPerson[];
  onLink?: (seat: TeamSeat, person: CreditPerson & { id: string }) => void;
}) {
  const seated = new Set(seats.map((s) => s.profileId).filter(Boolean));
  return (
    <ul className="vz-team-seats">
      {seatSlots(tracks).map(({ role, track }) => {
        const s = seats.find((x) => x.role === role && x.track === track);
        const t = tracks.find((x) => x.key === track);
        const title = seatTitle(role, t?.label ?? null)[s?.gender === "female" ? 1 : 0];
        const near = s && !s.profileId && onLink ? nearAccounts(s.name, pool).filter((p) => !seated.has(p.id)) : [];
        return (
          <li key={`${role}-${track ?? 0}`} className="vz-team-seat" data-empty={s ? undefined : ""} data-near={near.length ? "" : undefined}>
            <span className="vz-team-who">
              {s ? <Avatar name={s.name} src={s.avatar ?? undefined} gender={s.gender} size="sm" /> : <span className="vz-team-ic" aria-hidden>{seatIcon(role, t?.icon)}</span>}
              <span className="vz-team-tx">
                <span className="vz-team-role">{title}</span>
                <strong className="vz-team-name">{s ? s.name : "لم يُسمَّ بعد"}</strong>
              </span>
            </span>
            {near.length && s ? (
              <span className="vz-team-near">
                <span className="vz-team-near-k">{near.length > 1 ? "حسابات بأسماء قريبة" : "حساب باسم قريب"}</span>
                {near.map((p) => (
                  <span key={p.id} className="vz-team-near-p">
                    <Avatar name={p.name} src={p.avatarUrl ?? undefined} gender={p.gender} size="xs" />
                    <span className="vz-team-tx">
                      <strong className="vz-team-name">{p.name}</strong>
                      {p.hint ? <span className="vz-team-role">{p.hint}</span> : null}
                    </span>
                    <AdButton variant="line" size="sm" icon={<LinkIcon />} onClick={() => onLink?.(s, p)}>هذا هو، اربطه</AdButton>
                  </span>
                ))}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
