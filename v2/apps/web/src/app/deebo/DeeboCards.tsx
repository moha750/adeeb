"use client";

/**
 * **بطاقةُ المحادثة** — قطعةٌ من عائلة ديبو (اعتمد محمد ١١-٢٤ أن تكون لديبو قطعُه: «المكوّناتُ التي لدينا لا تناسبه كصفحة محادثة»).
 *
 * كرتُ «الغلاف الزجاجيّ» صُنع لشبكة فهرسٍ تُتصفّح، فكان في المحادثة شاشةً كاملةً على الجوّال لكلّ فعاليّة. وبطاقةُ المحادثة **سطرٌ يُقرأ
 * وسط الكلام**: صورتُه الصغيرة أو وجهُه أو ختمُه في صدره، ثمّ ما هو وتاريخُه، ثمّ اسمُه، ثمّ سطرٌ يقول أين أو مَن، وفي طرفه **ما تفعله به**
 * («احجز»، «صفحته») أو حالُه («انتهت»، «مكتملة»). والبطاقةُ كلُّها رابطٌ إلى الشيء نفسِه في الموقع، فالفعلُ في طرفها وسمٌ لا زرٌّ ثانٍ.
 * خمسةُ أنواعٍ بشكلٍ واحد (`cards.ts`)، واثنتان في الصفّ على الحاسوب، وواحدةٌ على الجوّال — فثلاثُ بطاقاتٍ نصفُ شاشة.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, CalendarBlank, Compass, MapPin, Newspaper, Ticket } from "@phosphor-icons/react";
import { ArrowLeft } from "@/app/_components/glyphs";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import type { DeeboCard } from "./cards";

/** ما في طرف البطاقة: فعلٌ يُقصد، أو حالٌ تُقال، أو سهمُ الذهاب */
type End = { kind: "act"; text: string } | { kind: "state"; text: string } | { kind: "go" };

function Shell({ href, kind, media, label, title, sub, end }: {
  href?: string; kind: DeeboCard["kind"]; media: ReactNode; label?: string; title: string; sub?: ReactNode; end: End;
}) {
  const body = (
    <>
      <span className="ad-dc-card-media" aria-hidden>{media}</span>
      <span className="ad-dc-card-t">
        {label ? <small>{label}</small> : null}
        <b>{title}</b>
        {sub ? <span className="ad-dc-card-sub">{sub}</span> : null}
      </span>
      {end.kind === "go" ? <ArrowLeft className="ad-dc-card-go" aria-hidden /> : <span className="ad-dc-card-end" data-kind={end.kind}>{end.text}</span>}
    </>
  );
  return href
    ? <Link href={href} className="ad-dc-card" data-kind={kind}>{body}</Link>
    : <div className="ad-dc-card" data-kind={kind}>{body}</div>;
}

const img = (src: string | undefined, fallback: ReactNode) =>
  // eslint-disable-next-line @next/next/no-img-element -- صورٌ من مخازن شتّى، زينةٌ بجانب اسمها
  src ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" /> : fallback;

function Card({ card }: { card: DeeboCard }) {
  switch (card.kind) {
    case "event":
      return (
        <Shell href={card.href} kind="event" media={img(card.image, <Ticket />)}
          label={[card.tag ?? "فعاليّة", card.dateLabel].filter(Boolean).join("، ")} title={card.title}
          sub={card.place ? <><MapPin aria-hidden />{card.place}</> : undefined}
          end={card.past ? { kind: "state", text: "انتهت" } : card.full ? { kind: "state", text: "مكتملة" } : card.action ? { kind: "act", text: card.action.label } : { kind: "go" }} />
      );
    case "news":
      return (
        <Shell href={card.href} kind="news" media={img(card.image, <Newspaper />)}
          label={[card.tag ?? "خبر", card.dateLabel].filter(Boolean).join("، ")} title={card.title} end={{ kind: "go" }} />
      );
    case "book":
      return (
        <Shell href={card.href} kind="book" media={img(card.cover, <BookOpen />)}
          label={[card.tag ?? "من المكتبة", card.year].filter(Boolean).join("، ")} title={card.title} sub={card.author} end={{ kind: "go" }} />
      );
    case "person":
      return (
        <Shell href={card.href} kind="person" media={<Avatar name={card.name} src={card.avatar} gender={card.gender} size="lg" />}
          label={card.seat} title={card.name}
          end={card.href ? { kind: "act", text: card.gender === "female" ? "صفحتها" : "صفحته" } : { kind: "go" }} />
      );
    case "page":
      return (
        <Shell href={card.href} kind="page" media={<span className="ad-sec-ic"><Compass /></span>}
          label="صفحةٌ في الموقع" title={card.title} sub={card.description} end={{ kind: "go" }} />
      );
  }
}

export function DeeboCards({ cards }: { cards: DeeboCard[] }) {
  if (!cards.length) return null;
  return (
    <div className="ad-dc-cards" role="list">
      {cards.slice(0, 3).map((c, i) => (
        <div role="listitem" key={`${c.kind}-${"id" in c ? c.id : c.href}-${i}`}><Card card={c} /></div>
      ))}
    </div>
  );
}
