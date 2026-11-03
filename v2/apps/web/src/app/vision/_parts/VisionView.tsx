import Link from "next/link";
import { Container, LandingHeading } from "@adeeb/design-system";
import { ArrowLeft } from "@/app/_components/glyphs";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import { arCount } from "@/lib/arabicCount";
import { clubDayKey, daysBetweenKeys, fmtDateOnly } from "@/lib/dates";
import { VISION_STORIES, type StoryCard } from "@/lib/vision/stories";
import type { CoreTeam, TeamGroup } from "@/lib/vision/team";
import type { PubPerson } from "@/app/structure/data";
import { countsOf, type PublicGoal, type PublicTrack, type PublicVision } from "@/lib/vision/types";
import { GOAL_STATUS, VISION_PATH } from "@/lib/vision/vocab";
import { VisionCountdown } from "./VisionCountdown";
import { VisionMark } from "./VisionMark";
import { trackIcon } from "./trackIcon";

/**
 * **صفحةُ الرؤية** — تُعرّف الأعضاءَ بالرؤية وتتابعها أمامهم (اقتراحٌ أقرّه محمد ٢٠٢٦-١١-٠٣: «نفّذ مقترحك»):
 * الهلالُ حيًّا في رأسها (قطعةٌ لكلّ هدفٍ تُضاء حين يتحقّق)، ثمّ فكرةُ الشعار، فالمساراتُ بأهدافها وحالها،
 * ففريقُ الرؤية من الهيكل، فسياسةُ «رؤى أدِيب» وما مضى منها.
 *
 * مكوّنٌ خادميٌّ بلا خطّافات، وأصنافُه `.vz-*` في `ad.css` من رموز الهويّة وحدها. ولا يُعرض للناس
 * «الواقعُ اليوم» ولا من غيّر الحال: الدالّةُ العلنيّة لا تُخرجهما أصلًا.
 */

const ORDINAL = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن"];

export function VisionView({ v, team, now }: { v: PublicVision; team: { core: CoreTeam | null; oversight: TeamGroup[] } | null; now: number }) {
  const counts = countsOf(v.tracks);
  const goals = v.tracks.flatMap((t) => t.goals);
  const total = goals.length;
  const done = goals.filter((g) => g.status === "done").length;
  const active = goals.filter((g) => g.status === "active").length;
  const on = v.tracks.map((t) => t.goals.map((g) => g.status === "done"));
  const titles = v.tracks.map((t) => t.goals.map((g) => `${g.title}، ${GOAL_STATUS[g.status].label}`));
  const hrefs = v.tracks.map((t) => t.goals.map((g) => `#goal-${g.id}`));
  const stories = VISION_STORIES[v.slug];

  return (
    <Container>
      <div className="vz-page">
        <Hero v={v} now={now} counts={counts} on={on} titles={titles} hrefs={hrefs} total={total} done={done} active={active} />
        {stories ? <Ideas stories={stories} counts={counts} total={total} trackCount={v.tracks.length} /> : null}
        <section className="vz-sec" id="tracks" aria-labelledby="vz-tracks-h">
          <LandingHeading eyebrow="المسارات" title={<span id="vz-tracks-h">المسارات والأهداف</span>} deck={`${arCount(v.tracks.length, ["مسارٌ واحد", "مساران", "مسارات", "مسارًا"])}، لكل مسار طبقة في الهلال، ولكل هدف قطعة فيها.`} />
          <div className="vz-tracks">
            {v.tracks.map((t, i) => <Track key={t.position} t={t} layer={i} counts={counts} />)}
          </div>
        </section>
        {team && (team.core || team.oversight.length) ? <Team team={team} tracks={v.tracks} /> : null}
        <Policy v={v} total={total} done={done} />
      </div>
    </Container>
  );
}

/**
 * الرأس: الاسمُ والمدّة، ثمّ العدُّ التنازليّ، ثمّ **الوقتُ مقابل الإنجاز** شريطين متجاورين (معاينةٌ طلبها محمد ٢٠٢٦-١١-٠٣
 * ليحكم عليها بعينه): ما مضى من مدّة الرؤية وما تحقّق من أهدافها، فيُرى في لحظةٍ أيُّهما يسبق الآخر. والهلالُ في الجهة الأخرى.
 */
function Hero({ v, now, counts, on, titles, hrefs, total, done, active }: {
  v: PublicVision; now: number; counts: number[]; on: boolean[][]; titles: string[][]; hrefs: string[][]; total: number; done: number; active: number;
}) {
  const today = clubDayKey(new Date(now).toISOString());
  const toStart = daysBetweenKeys(today, v.starts_on);
  const toEnd = daysBetweenKeys(today, v.horizon_on);
  const closed = v.status === "closed" || toEnd < 0;
  const span = Math.max(1, daysBetweenKeys(v.starts_on, v.horizon_on));
  const passed = closed ? span : Math.min(span, Math.max(0, daysBetweenKeys(v.starts_on, today)));
  return (
    <section className="ad-plate vz-hero" aria-labelledby="vz-name">
      <div className="vz-hero-in">
        <div className="vz-hero-id">
          <p className="vz-eyebrow">{closed ? "رؤية منتهية من رؤى أدِيب" : "الرؤية السارية في أدِيب"}</p>
          <h1 className="vz-title" id="vz-name">{v.name}</h1>
          <p className="vz-period">من {fmtDateOnly(v.starts_on)} حتى {v.horizon_label}</p>
          <p className="vz-lead">
            {arCount(v.tracks.length, ["مسارٌ واحد", "مساران", "مسارات", "مسارًا"])} و{arCount(total, ["هدفٌ واحد", "هدفان", "أهداف", "هدفًا"])}، لكل هدف قطعة في الهلال لا تُضاء إلا حين يتحقق.
          </p>
          {closed ? null : (
            <div className="vz-countdown">
              <p className="vz-count-l">{toStart > 0 ? "تبدأ الرؤية بعد" : `يبقى حتى ${v.horizon_label}`}</p>
              <VisionCountdown target={`${toStart > 0 ? v.starts_on : v.horizon_on}T00:00:00+03:00`} now={now} />
              {toStart > 0 ? null : <p className="vz-count-note">بتقويم أم القرى، وقد يتقدم يومًا أو يتأخر برؤية الهلال.</p>}
            </div>
          )}
          <dl className="vz-pace">
            <div className="vz-pace-row">
              <dt>الوقت</dt>
              <dd>
                <meter className="ad-meter" min={0} max={span} value={passed} aria-label="ما مضى من مدة الرؤية" />
                <span className="vz-pace-v">مضى {passed} من {arCount(span, ["يومٍ واحد", "يومين", "أيام", "يومًا"])}</span>
              </dd>
            </div>
            <div className="vz-pace-row">
              <dt>الإنجاز</dt>
              <dd>
                <meter className="ad-meter" min={0} max={total || 1} value={done} aria-label="ما تحقق من أهداف الرؤية" />
                <span className="vz-pace-v">تحقق {done} من {arCount(total, ["هدفٍ واحد", "هدفين", "أهداف", "هدفًا"])}{active ? `، وقيد العمل ${active}` : ""}</span>
              </dd>
            </div>
          </dl>
        </div>
        <VisionMark className="vz-hero-mark" counts={counts} on={on} titles={titles} hrefs={hrefs} label={`هلال ${v.name}: تحقّق ${done} من ${total}`} />
      </div>
    </section>
  );
}

/** هلالُ بطاقة الفكرة: كلُّه، أو طبقةٌ وطبقة، أو قطعةٌ واحدة */
function storyOn(art: StoryCard["art"], counts: number[]): boolean[][] {
  if (art === "all") return counts.map((n) => Array(n).fill(true));
  if (art === "layers") return counts.map((n, k) => Array(n).fill(k % 2 === 0));
  return counts.map((n, k) => Array.from({ length: n }, (_, i) => k === 0 && i === Math.floor(n / 2)));
}

function Ideas({ stories, counts, total, trackCount }: { stories: StoryCard[]; counts: number[]; total: number; trackCount: number }) {
  const fill = (s: string) => s.replaceAll("{total}", String(total)).replaceAll("{tracks}", String(trackCount));
  return (
    <section className="vz-sec" id="idea" aria-labelledby="vz-idea-h">
      <LandingHeading eyebrow="الشعار" title={<span id="vz-idea-h">فكرة الشعار</span>} deck="هلال من فسيفساء، يكتمل بما يتحقق من أهداف الرؤية." />
      <ol className="vz-ideas">
        {stories.map((s) => (
          <li key={s.title} className="vz-idea">
            <div className="ad-plate vz-idea-art" aria-hidden>
              <VisionMark counts={counts} on={storyOn(s.art, counts)} />
            </div>
            <div className="vz-idea-b">
              <h3 className="vz-idea-t">{s.title}</h3>
              <p className="vz-idea-x">{fill(s.text)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Track({ t, layer, counts }: { t: PublicTrack; layer: number; counts: number[] }) {
  const done = t.goals.filter((g) => g.status === "done").length;
  const n = t.goals.length;
  const on = counts.map((c, k) => (k === layer ? t.goals.map((g) => g.status === "done") : Array(c).fill(false)));
  const clusters: { name: string | null; goals: PublicGoal[] }[] = [];
  for (const g of t.goals) {
    const last = clusters[clusters.length - 1];
    if (last && last.name === g.cluster) last.goals.push(g);
    else clusters.push({ name: g.cluster, goals: [g] });
  }
  const hid = `vz-track-${t.position}`;
  return (
    <article className="vz-track" aria-labelledby={hid}>
      <header className="vz-track-head">
        <VisionMark className="vz-track-mark" counts={counts} on={on} focus={layer} paper />
        <div className="vz-track-id">
          <span className="vz-track-ord">
            {trackIcon(t.icon)}
            المسار {ORDINAL[layer] ?? layer + 1}
          </span>
          <h3 className="vz-track-name" id={hid}>{t.name}</h3>
          <p className="vz-track-sum">{t.summary}</p>
        </div>
        <div className="vz-track-prog">
          <span className="vz-track-prog-l">تحقّق <b>{done}</b> من {arCount(n, ["هدفٍ واحد", "هدفين", "أهداف", "هدفًا"])}</span>
          <meter className="ad-meter" min={0} max={n || 1} value={done} aria-label={`ما تحقّق من أهداف مسار ${t.name}`} />
        </div>
      </header>
      <div className="vz-clusters">
        {clusters.map((c, i) => (
          <div key={`${c.name}-${i}`} className="vz-cluster">
            {c.name ? <h4 className="vz-cluster-t">{c.name}</h4> : null}
            <ol className="vz-goals">
              {c.goals.map((g) => <Goal key={g.id} g={g} n={t.goals.indexOf(g) + 1} />)}
            </ol>
          </div>
        ))}
      </div>
    </article>
  );
}

/** والرقمُ ترتيبُ الهدف في مساره (القطعةُ نفسُها في طبقته): «الهدف 3 من التمكين» يُقال في الاجتماع فيُعرف. */
function Goal({ g, n }: { g: PublicGoal; n: number }) {
  const st = GOAL_STATUS[g.status];
  return (
    <li className="vz-goal" id={`goal-${g.id}`} data-status={g.status}>
      <div className="vz-goal-top">
        <span className="vz-goal-n" data-on={g.status === "done" || undefined} aria-hidden>{n}</span>
        <span className="ad-badge" data-tone={st.tone === "neutral" ? undefined : st.tone}>{st.label}</span>
      </div>
      <h5 className="vz-goal-t">{g.title}</h5>
      {g.detail ? <p className="vz-goal-d">{g.detail}</p> : null}
      <dl className="vz-goal-meta">
        <div><dt>المستهدف</dt><dd>{g.target}</dd></div>
        <div><dt>المسؤول</dt><dd>{g.owner}</dd></div>
        {g.status === "done" && g.done_at ? (
          <div><dt>تحقّق في</dt><dd>{fmtDateOnly(clubDayKey(g.done_at))}</dd></div>
        ) : g.due_on ? (
          <div><dt>الموعد</dt><dd>{fmtDateOnly(g.due_on)}</dd></div>
        ) : null}
      </dl>
    </li>
  );
}

/** شخصٌ في سطر: وجهُه واسمُه ومسمّاه، ورابطُ صفحته إن كانت */
function Person({ p, role }: { p: PubPerson; role?: string | null }) {
  const body = (
    <>
      <Avatar name={p.name} src={p.avatar ?? undefined} gender={p.gender} size="sm" />
      <span className="vz-person-tx">
        <span className="vz-person-n">{p.name}</span>
        {role ? <span className="vz-person-r">{role}</span> : null}
      </span>
    </>
  );
  return p.slug ? <Link className="vz-person" href={`/m/${encodeURIComponent(p.slug)}`}>{body}</Link> : <span className="vz-person">{body}</span>;
}

/** مقعدٌ لم يُسمَّ صاحبُه: مكانُ الوجه إطارٌ متقطّع (كما في الهيكل) */
function Vacant({ name, role }: { name: string; role: string }) {
  return (
    <span className="vz-person" data-vacant>
      <span className="vz-vacant" aria-hidden />
      <span className="vz-person-tx">
        <span className="vz-person-n">{name}</span>
        <span className="vz-person-r">{role}</span>
      </span>
    </span>
  );
}

const byGender = (p: PubPerson | null, male: string, female: string) => (p?.gender === "female" ? female : male);

/**
 * **فريقُ الرؤية** (معاينةٌ لمحمد ٢٠٢٦-١١-٠٣): من يعمل عليها أوّلًا — المشرفُ العامّ وقائدُ الرؤية، وقائدٌ لكلّ مسار
 * (طبقتُه من الهلال) — ثمّ **خطُّ المتابعة** بأسماء الجهات وحدها بلا أشخاص (طلبُه): الإدارةُ التنفيذيّة تنفّذ،
 * والضمانُ والجودة تتابع، والمجلسُ الإداريّ يطّلع.
 */
function Team({ team, tracks }: { team: { core: CoreTeam | null; oversight: TeamGroup[] }; tracks: PublicTrack[] }) {
  const { core, oversight } = team;
  return (
    <section className="vz-sec" id="team" aria-labelledby="vz-team-h">
      <LandingHeading eyebrow="الفريق" title={<span id="vz-team-h">فريق الرؤية</span>} deck="فريق يعمل على الرؤية، ومن خلفه خط يتابعها." />
      {core ? (
        <div className="vz-core">
          <div className="vz-core-heads">
            <div className="vz-crew vz-head">
              <span className="vz-crew-verb">{byGender(core.supervisor, "المشرف العام", "المشرفة العامة")}</span>
              {core.supervisor ? <Person p={core.supervisor} /> : <Vacant name="لم يُسمَّ بعد" role="المشرف العام" />}
            </div>
            <div className="vz-crew vz-head">
              <span className="vz-crew-verb">{byGender(core.leader, "قائد الرؤية", "قائدة الرؤية")}</span>
              {core.leader ? <Person p={core.leader} /> : <Vacant name="لم يُسمَّ بعد" role="قائد الرؤية" />}
            </div>
          </div>
          <ul className="vz-core-tracks">
            {tracks.map((t, i) => {
              const p = core.trackLeads[i] ?? null;
              return (
                <li key={t.position} className="vz-crew vz-tlead">
                  <span className="vz-tlead-t">{trackIcon(t.icon)}مسار {t.name}</span>
                  {p ? <Person p={p} role={byGender(p, "قائد المسار", "قائدة المسار")} /> : <Vacant name="لم يُسمَّ بعد" role="قائد المسار" />}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {oversight.length ? (
        <>
          <h3 className="vz-sub">خط المتابعة</h3>
          <ol className="vz-line">
            {oversight.map((gr) => (
              <li key={gr.key} className="vz-line-step">
                <span className="vz-crew-verb">{gr.verb}</span>
                <span className="vz-line-n">{gr.name}</span>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </section>
  );
}

function Policy({ v, total, done }: { v: PublicVision; total: number; done: number }) {
  const rows = [
    { slug: v.slug, name: v.name, starts_on: v.starts_on, horizon_label: v.horizon_label, status: v.status, total, done, current: true },
    ...v.archive.map((a) => ({ ...a, current: false })),
  ];
  return (
    <section className="vz-sec" id="roya" aria-labelledby="vz-roya-h">
      <LandingHeading eyebrow="رؤى أدِيب" title={<span id="vz-roya-h">رؤية بعد رؤية</span>} />
      <div className="vz-policy">
        <p className="vz-policy-x">
          الرؤية في أدِيب سياسة إدارية لا وثيقة واحدة: لكل مرحلة رؤية باسمها ومدتها وأهدافها، قد تكون ثلاثة أشهر أو ستة أو سنة، وحين تنتهي رؤية تُبنى التي بعدها لمستهدفات جديدة. وتبقى كل رؤية هنا بما تحقق منها.
        </p>
        <ul className="vz-arch">
          {rows.map((r) => {
            const inner = (
              <>
                <span className="vz-arch-tx">
                  <span className="vz-arch-n">{r.name}</span>
                  <span className="vz-arch-p">من {fmtDateOnly(r.starts_on)} حتى {r.horizon_label}</span>
                </span>
                <span className="vz-arch-c">
                  <span className="ad-badge" data-tone={r.status === "active" ? "info" : undefined}>{r.status === "active" ? "سارية" : "منتهية"}</span>
                  <span className="vz-arch-k">تحقّق {r.done} من {r.total}</span>
                </span>
                {r.current ? null : <ArrowLeft aria-hidden />}
              </>
            );
            return (
              <li key={r.slug}>
                {r.current ? <div className="vz-arch-row" aria-current="page">{inner}</div> : <Link className="vz-arch-row" href={`${VISION_PATH}/${r.slug}`}>{inner}</Link>}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
