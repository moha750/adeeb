"use client";

/**
 * **صفحةُ العضو العلنيّة على قالب «القراءة»** (مختبر ٢٠٢٦-١١-١٧، `/member-lab` — لم تُعتمد بعد): يَنشرها صاحبُها ليُعرَف من هو وما سيرتُه في أدِيب،
 * وقارئُها غريبٌ لا زميل. فاللوحُ يقول الهويّة وحدها في ثانيتين: «عضو أدِيب»، والاسم، والنبذةُ إن كتبها، والمناصبُ ومدّةُ الخدمة حقائقَ برموزها.
 * و**بطاقةُ أدِيب** (`AdIdCard`، قطعةُ الرئيسيّة) في العمود الجانبيّ تتدلّى من اللوح كما يتدلّى الكتيّبُ في صفحته، وتحتها «شارك الصفحة».
 * وبجانبها **الأوسمةُ** سطورًا (المنولُ بتاريخه، والمقفلُ بما بقي له)، ثمّ **«عنه»** (الدراسة، وحساباتُه).
 *
 * كانت (`m/[slug]/ProfileView`) ثلاثةَ كروتٍ من الهويّة القديمة متراكبةً في عمودٍ ضيّق، و«انشر صفحتك» يقولها لكلّ زائر وهي لصاحبها.
 * **والحجبُ في القاعدة لا هنا** (`get_public_profile`): لا بريدَ ولا جوّالَ ولا ميلادَ ولا إنذار، ولا يُنشر إلّا من له منصبٌ قائم.
 */
import {
  CalendarBlank, CalendarCheck, Compass, DotsThree, Fire, GraduationCap, IdentificationBadge, InstagramLogo, LinkSimple, LinkedinLogo,
  Medal, Megaphone, Repeat, ShareNetwork, Ticket, TiktokLogo, UserCircle, WhatsappLogo, XLogo,
} from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import { Check, PencilSimple } from "@/app/_components/glyphs";
import { createClient } from "@/lib/supabase/client";
import { DropdownMenu } from "@/app/dashboard/_components/DropdownMenu";
import { useShare } from "@/app/news/[slug]/_parts/useShare";
import { fmtDate, fmtDateOnly } from "@/lib/dates";
import { visitsSentence, type ProfileVisits } from "@/lib/profileVisits";
import { formatDegree, SOCIAL_KEYS, socialLabel, socialLabelOf, socialUrl, type SocialKey } from "@/lib/membershipFields";
import { personTitle } from "@/lib/positionLabel";
import type { PublicProfile } from "@/app/m/[slug]/data";
import { AdButton, AdNote } from "../primitives";
import { AdIdCard, AdLine, AdSection } from "../account";
import { PubRead, type PubReadFact } from "../read";

/** أيقونةُ الوسام اسمًا من القاعدة، تُحلّ في خريطةٍ صريحة (الاستدعاءُ الديناميكيّ يجرّ حزمةَ الأيقونات كلَّها) */
const BADGE_ICONS: Record<string, ReactNode> = {
  CalendarCheck: <CalendarCheck />, Compass: <Compass />, Megaphone: <Megaphone />, Ticket: <Ticket />, Repeat: <Repeat />, Fire: <Fire />,
};
const SOCIAL_ICONS: Record<SocialKey, ReactNode> = { twitter: <XLogo />, instagram: <InstagramLogo />, tiktok: <TiktokLogo />, linkedin: <LinkedinLogo /> };

/** «في أدِيب منذ 10 أشهر» — مدّةُ الخدمة بالسنة والشهر (كما كانت) */
function tenureLabel(joinedDate: string | null): string | null {
  if (!joinedDate) return null;
  const [y, m, d] = joinedDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const now = new Date();
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (now.getDate() < d) months -= 1;
  if (months < 1) return "انضمّ هذا الشهر";
  if (months < 12) return `في أدِيب منذ ${months} أشهر`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearWord = years === 1 ? "سنة" : years === 2 ? "سنتين" : `${years} سنوات`;
  return rest ? `في أدِيب منذ ${yearWord} و${rest} أشهر` : `في أدِيب منذ ${yearWord}`;
}

/**
 * **صاحبُ الصفحة وحده** (محمد ٢٠٢٦-١١-١٧: «إذا فتحها صاحبُ الصفحة تخاطبه كصفحته، أمّا غيرُه فلا»): الصفحةُ نفسُها بضميرها الثالث للجميع —
 * يرى صاحبُها ما يراه الناس قبل أن يرسلها — **وفوقها له ملاحظةٌ تخاطبه** فيها «انشر صفحتك» (زرُّها القديم في موضعه) و«عدّل ما يظهر فيها».
 * تُعرف بعد التحميل من جلسة المتصفّح: الصفحةُ محفوظةٌ مسبقًا للجميع (`revalidate`) فلا يقرأ الخادمُ من يفتحها، ولا يبطؤ بها أحد
 */
function useIsOwner(slug: string) {
  const [own, setOwn] = useState(false);
  // **زوّارُها له وحده** (محمد ٢٠٢٦-١١-١٧): عددٌ لا أسماء، من `my_profile_views` (الجلسةُ هي الصاحب). وإن لم تُطبَّق الدالّةُ بعدُ أو تعثّرت
  // سكت السطرُ ولم يُقل صفر
  const [visits, setVisits] = useState<ProfileVisits | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;
      const { data } = await sb.from("profiles").select("public_slug").eq("id", session.user.id).maybeSingle();
      const mine = (data as { public_slug: string | null } | null)?.public_slug;
      if (!live || !mine || mine !== slug) return;
      setOwn(true);
      const r = await sb.rpc("my_profile_views");
      if (live && !r.error && r.data) setVisits(r.data as ProfileVisits);
    })().catch(() => {});
    return () => { live = false; };
  }, [slug]);
  return { own, visits };
}

export function MemberPublic({ me }: { me: PublicProfile }) {
  const { own, visits } = useIsOwner(me.slug);
  // **بضمير صاحبها** (كانت «أوسمتُه» و«نال» و«عنه» لكلّ أحد)
  const she = me.gender === "female";
  const earned = me.badges.filter((b) => b.earnedAt);
  const tenure = tenureLabel(me.joinedDate);
  const study = [formatDegree(me.degree), me.college, me.major].filter(Boolean).join("، ");
  const links = SOCIAL_KEYS.map((key) => ({ key, handle: me.links[key] ?? null })).filter((s): s is { key: SocialKey; handle: string } => Boolean(s.handle));

  const facts: PubReadFact[] = [
    ...me.positions.map((p) => ({ icon: <IdentificationBadge />, text: personTitle(p.roleAr, p.unitName, me.gender, p.acting) ?? "" })).filter((f) => f.text),
    ...(tenure ? [{ icon: <CalendarBlank />, text: tenure }] : []),
  ];

  const share = useShare(`/m/${encodeURIComponent(me.slug)}`, `${me.name}، في نادي أدِيب`);
  const shareItems = [
    { label: "واتساب", icon: <WhatsappLogo />, onSelect: () => window.open(share.links.whatsapp, "_blank", "noopener,noreferrer") },
    { label: "إكس", icon: <XLogo />, onSelect: () => window.open(share.links.x, "_blank", "noopener,noreferrer") },
    { label: share.copied ? "نُسخ الرابط" : "نسخ الرابط", icon: share.copied ? <Check /> : <LinkSimple />, onSelect: share.copy },
    ...(share.native ? [{ label: "عبر الجهاز", icon: <DotsThree />, onSelect: share.more }] : []),
  ];

  const side = (
    <div className="ad-mp-side">
      <AdIdCard plate name={me.name} avatar={me.avatar} gender={me.gender === "female" ? "female" : me.gender === "male" ? "male" : null}
        standing="عضو أدِيب" since={me.joinedDate ? `منذ ${fmtDateOnly(me.joinedDate)}` : undefined} />
      {/* «شارك» لا «انشر صفحتك»: قارئُها غالبًا غيرُ صاحبها (قطعةُ «شارك الكتيّب» نفسُها) */}
      <DropdownMenu ariaLabel="شارك الصفحة" triggerClassName="ad-btn ad-btn-line ad-book-share" trigger={<><ShareNetwork aria-hidden />شارك الصفحة</>}
        groups={[{ items: shareItems }]} />
    </div>
  );

  return (
    // «عضو أدِيب» على البطاقة وحدها: شارةُ اللوح كانت تكرّرها فوقها بسطرين
    <PubRead title={me.name} dek={me.bio ?? undefined} facts={facts} side={side}>
      {own ? (
        <AdNote tone="info" title="هذه صفحتك كما يراها الناس" action={(
          <>
            <AdButton variant="soft" icon={<ShareNetwork />} onClick={share.native ? share.more : share.copy}>{share.copied ? "نُسخ الرابط" : "انشر صفحتك"}</AdButton>
            <AdButton variant="soft" icon={<PencilSimple />} href="/dashboard/account#acc-page">عدّل ما يظهر فيها</AdButton>
          </>
        )}>
          {visits ? `${visitsSentence(visits)} ` : null}ما تكتبه من نبذةٍ وحسابات في «حسابي» يظهر هنا لمن تشاركه الرابط.
        </AdNote>
      ) : null}

      {me.badges.length ? (
        <AdSection icon={<Medal />} title={she ? "أوسمتُها" : "أوسمتُه"}
          sub={earned.length ? `${she ? "نالت" : "نال"} ${earned.length} من ${me.badges.length}` : `${she ? "لم تنل" : "لم ينل"} وسامًا بعدُ`}>
          {me.badges.map((b) => {
            const icon = BADGE_ICONS[b.icon] ?? <Medal />;
            if (b.earnedAt) return <AdLine key={b.key} icon={icon} k={fmtDate(b.earnedAt)} v={b.name} sub={b.evidence ?? b.how} tone="ok" toneAt="sub" />;
            // **المقفلُ بلونه الخافت لا بكلمةٍ تتكرّر** («لم يُنَل بعد» أربعَ مرّات)، وما بلغه فوقه إن كان بلغ شيئًا («بلغ 0 من 1» لا يقول شيئًا)
            const left = b.current && b.threshold != null ? `بلغ ${b.current} من ${b.threshold}` : undefined;
            return <AdLine key={b.key} icon={icon} k={left} v={b.name} sub={b.how} tone="muted" />;
          })}
        </AdSection>
      ) : null}

      {study || links.length ? (
        <AdSection icon={<UserCircle />} title={she ? "عنها" : "عنه"} sub={she ? "ما اختارت أن تُعرَف به" : "ما اختار أن يُعرَف به"}>
          {study ? <AdLine icon={<GraduationCap />} k="الدراسة" v={study} /> : null}
          {links.map((s) => (
            <AdLine key={s.key} icon={SOCIAL_ICONS[s.key]} k={socialLabelOf(s.key)} v={socialLabel(s.key, s.handle)} ltr href={socialUrl(s.key, s.handle)} external />
          ))}
        </AdSection>
      ) : null}
    </PubRead>
  );
}
