import { Card, CardBody, CardHeader, Medal, MedalGrid } from "@adeeb/design-system";
import {
  CalendarCheck, Compass, Fire, GraduationCap, InstagramLogo, LinkedinLogo,
  Medal as MedalIcon, Megaphone, Repeat, Ticket, TiktokLogo, XLogo,
} from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import { fmtDateOnly, fmtDate } from "@/lib/date";
import { formatDegree, SOCIAL_KEYS, socialLabelOf, socialUrl, type SocialKey } from "@/lib/membershipFields";
import { positionLine } from "@/lib/positionLabel";
import { ShareBar } from "./ShareBar";
import type { PublicProfile } from "./data";

/* glyph-weight: XLogo InstagramLogo TiktokLogo LinkedinLogo Medal — **معلَّقٌ ينتظر كلمةَ المالك.**
   هذه الشاشةُ تكتب `fill` بيدها لأسماءَ مستثناةٍ وزنُها `bold`، ولأوسمةٍ خارج القائمة أصلًا.
   فإمّا ترجع إلى وزنها من المصدر، وإمّا يدخل قرارُ «الوسامُ مصمت» القانونَ نفسَه. */
/**
 * أيقونةُ الوسام تأتي اسمًا من القاعدة، وتُحلّ ههنا في خريطةٍ صريحة.
 * ولا تُستدعى ديناميكيًّا: الاستدعاءُ الديناميكيّ يجرّ حزمةَ الأيقونات كلَّها إلى الصفحة.
 */
const BADGE_ICONS: Record<string, React.ReactNode> = {
  CalendarCheck: <CalendarCheck weight={ICON_WEIGHT} />,
  Compass: <Compass weight={ICON_WEIGHT} />,
  Megaphone: <Megaphone weight={ICON_WEIGHT} />,
  Ticket: <Ticket weight={ICON_WEIGHT} />,
  Repeat: <Repeat weight={ICON_WEIGHT} />,
  Fire: <Fire weight={ICON_WEIGHT} />,
};

/** أيقونةُ كلّ منصّة. أمّا الرابطُ والتسميةُ فمن `membershipFields` مصدرًا واحدًا. */
const SOCIAL_ICONS: Record<SocialKey, React.ReactNode> = {
  twitter: <XLogo weight={ICON_WEIGHT} />,
  instagram: <InstagramLogo weight={ICON_WEIGHT} />,
  tiktok: <TiktokLogo weight={ICON_WEIGHT} />,
  linkedin: <LinkedinLogo weight={ICON_WEIGHT} />,
};

/** «منذ ٩ أشهر» — مدّةُ الخدمة تُقال بالسنة والشهر لا بعدد الأيّام. */
function tenureLabel(joinedDate: string | null): string | null {
  if (!joinedDate) return null;
  const [y, m, d] = joinedDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const now = new Date();
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (now.getDate() < d) months -= 1;
  if (months < 1) return "انضمّ هذا الشهر";
  if (months < 12) return `في أديب منذ ${months} أشهر`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearWord = years === 1 ? "سنة" : years === 2 ? "سنتين" : `${years} سنوات`;
  return rest ? `في أديب منذ ${yearWord} و${rest} أشهر` : `في أديب منذ ${yearWord}`;
}

export function ProfileView({ me }: { me: PublicProfile }) {
  const earned = me.badges.filter((b) => b.earnedAt);
  const locked = me.badges.filter((b) => !b.earnedAt);
  const tenure = tenureLabel(me.joinedDate);
  const study = [formatDegree(me.degree), me.college, me.major].filter(Boolean) as string[];
  const links = SOCIAL_KEYS
    .map((key) => ({ key, handle: me.links[key] ?? null }))
    .filter((s): s is { key: SocialKey; handle: string } => Boolean(s.handle));

  return (
    <div className="flex flex-col gap-8">
      {/* الترويسة: مَن هذا ومَن يمثّل. وهي وحدَها ما يفهمه غريبٌ في ثانيتين */}
      <Card>
        <CardBody>
          <div className="flex flex-col items-center gap-4 text-center">
            <Avatar name={me.name} src={me.avatar ?? undefined} gender={me.gender} size="2xl" />
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-3xl font-black text-content">{me.name}</h1>
              {me.positions.map((p, i) => (
                <p key={i} className="text-lg font-bold text-secondary">{positionLine(p.roleAr, p.unitName)}</p>
              ))}
              {tenure ? <p className="text-sm text-content-muted">{tenure}</p> : null}
            </div>
            {me.bio ? <p className="max-w-xl leading-relaxed text-content">{me.bio}</p> : null}
            <ShareBar name={me.name} slug={me.slug} />
          </div>
        </CardBody>
      </Card>

      {/* الأوسمة: المنولُ أوّلًا بتاريخه، ثمّ المقفلُ بما بقي له */}
      {me.badges.length ? (
        <Card>
          <CardHeader
            variant="soft"
            icon={<MedalIcon aria-hidden />}
            title="أوسمتُه"
            subtitle={earned.length ? `نال ${earned.length} من ${me.badges.length}` : "لم ينل وسامًا بعدُ"}
          />
          <CardBody>
            <MedalGrid>
              {earned.map((b) => (
                <Medal
                  key={b.key}
                  icon={BADGE_ICONS[b.icon] ?? <MedalIcon weight={ICON_WEIGHT} />}
                  name={b.name}
                  note={b.evidence ?? b.how}
                  earnedOn={fmtDate(b.earnedAt)}
                />
              ))}
              {locked.map((b) => (
                <Medal
                  key={b.key}
                  icon={BADGE_ICONS[b.icon] ?? <MedalIcon weight={ICON_WEIGHT} />}
                  name={b.name}
                  note={b.how}
                  progress={b.current != null && b.threshold != null ? { current: b.current, threshold: b.threshold } : null}
                />
              ))}
            </MedalGrid>
          </CardBody>
        </Card>
      ) : null}

      {/* الدراسةُ والوصل: يكتبهما صاحبُهما، فلا يظهر منهما إلّا ما كتب */}
      {study.length || links.length ? (
        <Card>
          <CardHeader variant="soft" icon={<GraduationCap weight={ICON_WEIGHT} aria-hidden />} title="عنه" subtitle="ما اختار أن يُعرَف به" />
          <CardBody>
            <div className="flex flex-col gap-4">
              {study.length ? (
                <p className="text-content">{study.join("، ")}</p>
              ) : null}
              {links.length ? (
                <div className="flex flex-wrap gap-3">
                  {links.map((s) => (
                    <a
                      key={s.key}
                      className="abtn abtn-ghost abtn-sm"
                      href={socialUrl(s.key, s.handle)}
                      target="_blank"
                      rel="noreferrer noopener me"
                    >
                      {SOCIAL_ICONS[s.key]}
                      <span>{socialLabelOf(s.key)}</span>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {me.joinedDate ? (
        <p className="text-center text-xs text-content-muted">
          {`عضوٌ في نادي أديب منذ ${fmtDateOnly(me.joinedDate)}`}
        </p>
      ) : null}
    </div>
  );
}
