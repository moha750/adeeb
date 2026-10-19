"use client";

import { CheckCircle, DownloadSimple, MagnifyingGlass } from "@/app/_components/glyphs";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Card, CardFooter, CardHeader, Stat } from "@adeeb/design-system";
import {
  CalendarCheck, Certificate, Clock, HandHeart, Ticket, UsersThree,
} from "@phosphor-icons/react";
import { useToast } from "../_components/ToastProvider";
import { AdeebCard } from "./AdeebCard";
import { CaretAct, EDIT, Row } from "./Row";
import type { HomeView } from "./home";
import { greetNow } from "@/lib/timeGreeting";

/**
 * **رئيسيّةُ البوّابة** لصديق أدِيب والمتطوّع — المعتمَدُ في المختبر (المالك ٢٠٢٦-١٠-١٣):
 * صدرٌ فيه التحيّةُ والخلاصةُ عنوانًا وكروتُ الإحصاء (`Stat`) والبطاقة، وتحته عمودا الغرف: «ينتظرك»
 * عريضًا، وما تستكشفه ضيّقًا («فرصٌ تناسب رغباتك» للمتطوّع، و«تطوّع في أدِيب» للصديق).
 */

const FIG_ICON = { hours: Clock, joined: HandHeart, certs: Certificate, bookings: Ticket, attended: CheckCircle } as const;

export function PortalHome({ view, card }: {
  view: HomeView;
  card: { name: string; avatar: string | null; gender: "male" | "female" | null; standing: string };
}) {
  const greet = useSyncExternalStore(() => () => {}, greetNow, () => null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const download = async (w: Extract<HomeView["waiting"][number], { kind: "certificate" }>) => {
    setBusy(true);
    try {
      const { downloadParticipation } = await import("@/lib/certificates/participation");
      await downloadParticipation(w.paper);
    } catch {
      toast.error("تعذّر رسم الشهادة. جرّب مرّةً أخرى.");
    } finally {
      setBusy(false);
    }
  };

  const explore = view.volunteer ? (
    <Card>
      <CardHeader variant="soft" icon={<MagnifyingGlass aria-hidden />} title="فرصٌ تناسب رغباتك" />
      {view.prefs && !view.waiting.length ? (
        <Row Icon={HandHeart} k="رغباتك" v={view.prefs.join("، ") || "لم ترتّبها بعد"} act={EDIT} href="/join" />
      ) : null}
      {view.opps.length ? view.opps.map((o) => (
        <Row key={o.id} Icon={UsersThree} k={[o.committee, o.fit ? "من رغباتك" : null].filter(Boolean).join("، ") || "فرصة"} v={o.title} sub={o.sub}
          act={CaretAct(`تفاصيل ${o.title}`)} href={`/dashboard/volunteer/${o.id}`} />
      )) : <Row Icon={UsersThree} v="لا فرصةَ مفتوحةً الآن" sub="نخبرك حين تُفتح فرصةٌ في لجانك" />}
    </Card>
  ) : (
    <Card className="agw-join">
      <CardHeader variant="solid" className="acard-header-pattern" icon={<HandHeart aria-hidden />} title="تطوّع في أدِيب" subtitle="وكن من صنّاع فعاليّاته" />
      <Row Icon={UsersThree} k="لجانٌ تختار منها" v="الفعاليات والإعلام والتصوير وغيرها" />
      <Row Icon={Clock} k="وقتُك بيدك" v="تختار الفترات التي تناسبك" />
      <Row Icon={Certificate} k="جهدُك موثّق" v="شهادةٌ لكلّ مشاركة، وساعاتٌ تُحسب لك" />
      <CardFooter>
        <div className="acard-foot-row">
          <Link className="abtn abtn-primary abtn-md" href="/join"><HandHeart aria-hidden />{card.gender === "female" ? "كوني متطوّعة أدِيب" : "كن متطوّع أدِيب"}</Link>
        </div>
      </CardFooter>
    </Card>
  );

  return (
    <div className="agw-today">
      <div className="agw-t-hello">
        <div className="agw-hi">{greet ?? "أهلًا"} {view.firstName}</div>
        <h1 className="agw-lead">{view.headline}</h1>
        <div className="stat-grid agw-stats">
          {view.figs.map((f) => {
            const Icon = FIG_ICON[f.key];
            return <Stat key={f.key} icon={<Icon />} value={String(f.value)} label={f.label} note={f.note} />;
          })}
        </div>
      </div>
      <div className="agw-t-card">
        <AdeebCard name={card.name} avatar={card.avatar} gender={card.gender} volunteer={view.volunteer} standing={card.standing} since={view.since} />
      </div>
      <div className="agw-t-stream">
        <div className="acc-cols is-wide-aside agw-home">
          <div className="acc-main">
            {view.waiting.length ? (
              <Card>
                <CardHeader variant="soft" icon={<CalendarCheck aria-hidden />} title="ينتظرك" />
                {view.waiting.map((w) =>
                  w.kind === "certificate" ? (
                    <Row key="cert" Icon={Certificate} k={w.k} v={w.v} sub={w.sub} tone="ok" toneAt="sub"
                      act={{ Icon: DownloadSimple, label: `تنزيل شهادة ${w.v}`, text: "تنزيل" }} onClick={() => download(w)} disabled={busy} />
                  ) : (
                    <Row key={w.kind} Icon={w.kind === "volunteer" ? CalendarCheck : Ticket} k={w.k} v={w.v} sub={w.sub}
                      act={CaretAct(w.kind === "volunteer" ? "تفاصيل موعد تطوّعك" : "تفاصيل حجزك")} href={w.href} />
                  ),
                )}
              </Card>
            ) : null}
            {!view.waiting.length || !view.volunteer ? (
              <Card>
                <CardHeader variant="soft" icon={<Ticket aria-hidden />} title="فعاليّاتٌ يُحجز فيها الآن" />
                {view.events.length ? view.events.map((e) => (
                  <Row key={e.id} Icon={Ticket} k={e.when} v={e.title} sub={e.seats}
                    act={{ Icon: Ticket, label: `احجز مقعدك في ${e.title}`, text: "احجز" }} href={`/activities/${e.id}`} />
                )) : <Row Icon={Ticket} v="لا فعاليّةَ مفتوحةً للحجز الآن" sub="نُعلنها في الموقع وفي إشعاراتك" />}
              </Card>
            ) : null}
          </div>
          <aside className="acc-aside">{explore}</aside>
        </div>
      </div>
    </div>
  );
}
