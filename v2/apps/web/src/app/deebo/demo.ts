import "server-only";
/**
 * ⚠️ **معاينةٌ مؤقّتة على جهاز التطوير وحده** (١١-٢٤، `?preview=1`): حوارٌ **مكتوبٌ بيدنا** لعرض شكل الجواب على محمد قبل أن يُبنى
 * عقلُ ديبو، والبطاقاتُ فيه **من بياناتٍ حقيقيّةٍ في الموقع** (الفعاليّات، والهيكلة، والأخبار، والمكتبة). لا يُرسل شيئًا ولا يكتب شيئًا.
 * يُحذف بعد نظر محمد.
 */
import { getPublicActivities, getPastActivities } from "@/app/activities/data";
import { getPublicNews } from "@/app/news/data";
import { getShelf } from "@/app/library/shelf";
import { getPublicOrg } from "@/app/structure/data";
import { newsHref } from "@/lib/news/link";
import { AUDIENCE_LABEL, TYPE_META } from "@/lib/activities";
import { CATEGORY_META } from "@/app/dashboard/news/vocab";
import type { DeeboCard, ShownTurn } from "./cards";

export async function demoTalk(firstName: string | null): Promise<ShownTurn[]> {
  const [up, past, news, shelf, org] = await Promise.all([
    getPublicActivities(), getPastActivities(2), getPublicNews(), getShelf(), getPublicOrg().then((r) => r.data),
  ]);
  const events = (up.filter((a) => !a.past && !a.cancelled).length ? up.filter((a) => !a.past && !a.cancelled) : past).slice(0, 2);
  const eventCards: DeeboCard[] = events.map((a) => ({
    kind: "event", id: a.id, title: a.name, startsAt: a.date, dateLabel: a.dateLabel, timeLabel: a.timeLabel || undefined, place: a.location ?? undefined,
    image: a.cover ?? undefined, href: `/activities/${a.id}`, past: a.past, full: a.full,
    tag: a.targetGender ? `${TYPE_META[a.type].label} ${AUDIENCE_LABEL[a.targetGender]}` : TYPE_META[a.type].label,
    action: !a.past && !a.full && !a.closed ? { label: "احجز مقعدك", href: `/activities/${a.id}` } : undefined,
  }));
  const people: DeeboCard[] = [];
  if (org?.administrative.head) {
    const p = org.administrative.head;
    people.push({ kind: "person", id: p.id, name: p.name, seat: `${org.administrative.headTitle}`, avatar: p.avatar ?? undefined, gender: p.gender ?? undefined, href: p.slug ? `/m/${p.slug}` : undefined });
  }
  if (org?.executive.head) {
    const p = org.executive.head;
    people.push({ kind: "person", id: p.id, name: p.name, seat: `${org.executive.headTitle}`, avatar: p.avatar ?? undefined, gender: p.gender ?? undefined, href: p.slug ? `/m/${p.slug}` : undefined });
  }
  people.push({ kind: "page", title: "هيكلة أدِيب", description: "المجالسُ والإداراتُ واللجان ومن يقودها", href: "/structure" });
  const n = news[0];
  const b = shelf.books.find((x) => x.isFeatured) ?? shelf.books[0];
  const newsCards: DeeboCard[] = [];
  if (n) newsCards.push({ kind: "news", id: n.id, title: n.title, publishedAt: n.publishedAt ?? "", dateLabel: n.dateLabel, image: n.cover ?? undefined, tag: CATEGORY_META[n.category].label, href: newsHref(n) });
  if (b) newsCards.push({ kind: "book", id: b.id, title: b.title, tag: b.kindLabel, year: b.yearLabel, cover: b.coverUrl ?? undefined, href: `/library/${b.slug}` });

  const hi = firstName ? `يا ${firstName}` : "";
  return [
    { role: "user", content: "وش عندكم من فعاليّات قريبة؟" },
    { role: "assistant", content: `أبشر${hi ? ` ${hi}` : ""}! هذي ${events.length > 1 ? "أقرب فعاليّتين" : "أقرب فعاليّة"} عندنا:\n\n- **${events[0]?.name ?? "—"}**${events[0] ? `، ${events[0].dateLabel}` : ""}\n${events[1] ? `- **${events[1].name}**، ${events[1].dateLabel}\n` : ""}\nوتقدر تحجز مقعدك من البطاقة نفسها.`, cards: eventCards },
    { role: "user", content: "طيب مين يقود النادي؟" },
    { role: "assistant", content: `أدِيب يقوده مجلسان: **المجلس الإداريّ** يرسم الطريق، و**الإدارة التنفيذيّة** تمشي فيه كلّ يوم. وهذولا رئيساهما، وتلقى الهيكلة كاملةً في صفحتها.`, cards: people },
    { role: "user", content: "وش آخر شي صار عندكم؟ وعطني شي أقرأه" },
    { role: "assistant", content: `آخر خبر نشرناه تحت، ومن مكتبتنا أرشّح لك هذا. ولو تبي غيره قل لي وش تحبّ تقرأ.`, cards: newsCards },
  ];
}
