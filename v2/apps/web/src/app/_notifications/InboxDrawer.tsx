"use client";

import { useEffect, useId, useRef } from "react";
import { Button, Dialog, IconButton, Segmented } from "@adeeb/design-system";
import { Tray } from "@phosphor-icons/react";
import { X } from "@/app/_components/glyphs";
import { clubDayKey, daysBetweenKeys, fmtMonthYear } from "@/lib/dates";
import type { InboxFilter, InboxItem } from "@/lib/notifications/types";
import { EmptyState } from "../dashboard/_components/EmptyState";
import { NoteRow } from "./NoteRow";

/**
 * **اللوحُ الجانبيّ** — الوعاءُ الذي اختاره محمد (٢٠٢٦-١٠-١٠، الوجه «ب» في `/ui/bell`): يخرج من جهة
 * الجرس ويحجب الصفحة، وفيه كلُّ الإشعارات بلا صفحةٍ ثانية — غيرُ المقروءة أوّلًا، والكلُّ بتبويب،
 * مجموعةً بالأيّام، ويُمرَّر إلى أقدمها (الإشعارُ باقٍ لا يُحذف). وعلى الجوّال يملأ الشاشة.
 *
 * عرضٌ بلا حالة: البياناتُ والأفعالُ من المستدعي (`NotificationsBell` في الموقع، والعيّناتُ في المعرض).
 *
 * **ويقوم على `Dialog` المكتبة** لا على بوّابةٍ يدويّة (من المراجعة المستقلّة، ٢٠٢٦-١٠-١٠): كان يعلن
 * نفسَه نافذةً (`aria-modal`) ولا يحبس التركيزَ ولا التمرير، فيخرج مستعملُ لوحة المفاتيح من خلف
 * الحجاب. والبدائيّةُ تملك ذلك كلَّه، ومعه Escape وإعادةُ التركيز إلى الجرس وحركةُ الخروج، وتُنقَل
 * إلى `body` فتخرج من زجاج رأس الموقع (`backdrop-filter` يحبس كلَّ `fixed` تحته).
 *
 * **والإغلاقُ أوّلُ الرأس في الشجرة** وآخرُه في العين (`.ntf-hd-x`): البدائيّةُ تركّز أوّلَ ما يُركَّز،
 * فلو سبقه «تعليمُ الكلّ مقروءًا» لَعلّم الكلَّ من ضغط Enter ساعةَ الفتح.
 */

const TABS: { value: InboxFilter; label: string }[] = [
  { value: "unread", label: "غيرُ المقروءة" },
  { value: "all", label: "الكلّ" },
];

/** اليومُ وأمسِ وهذا الأسبوع، ثمّ الشهر: الصندوقُ لا يُحذف منه، فالقديمُ يُجمَع بشهره لا بـ«سابقًا». */
function dayGroup(iso: string): string {
  const gap = daysBetweenKeys(clubDayKey(iso), clubDayKey(new Date().toISOString()));
  if (gap <= 0) return "اليوم";
  if (gap === 1) return "أمس";
  if (gap < 7) return "هذا الأسبوع";
  return fmtMonthYear(iso);
}

export type InboxDrawerProps = {
  open: boolean;
  unread: number;
  tab: InboxFilter;
  onTab: (tab: InboxFilter) => void;
  /** `null` = الصفحةُ الأولى لم تصل بعد. */
  items: InboxItem[] | null;
  more: boolean;
  loadingMore: boolean;
  onMore: () => void;
  onOpen: (item: InboxItem) => void;
  onReadAll: () => void;
  onClose: () => void;
};

export function InboxDrawer({ open, unread, tab, onTab, items, more, loadingMore, onMore, onOpen, onReadAll, onClose }: InboxDrawerProps) {
  const titleId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // التمريرُ إلى الأقدم: حين يقترب آخرُ القائمة تُطلب الصفحةُ التالية. والمراقبُ يُفصَل ما دام الطلبُ
  // جاريًا، فلا يطلب الصفحةَ نفسَها مرّتين.
  useEffect(() => {
    const root = listRef.current;
    const end = endRef.current;
    if (!open || !root || !end || !more || loadingMore) return;
    const io = new IntersectionObserver((es) => es.some((x) => x.isIntersecting) && onMore(), { root, rootMargin: "240px" });
    io.observe(end);
    return () => io.disconnect();
  }, [open, more, loadingMore, onMore, items]);

  const groups: { day: string; items: InboxItem[] }[] = [];
  for (const n of items ?? []) {
    const day = dayGroup(n.at);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(n);
    else groups.push({ day, items: [n] });
  }

  return (
    <Dialog open={open} onClose={onClose} contentClassName="ntf-drawer" scrimClassName="ntf-scrim" labelledBy={titleId} closeOnScrimClick>
      <div className="ntf-hd">
        <IconButton aria-label="إغلاق" className="ntf-hd-x" onClick={onClose}>
          <X />
        </IconButton>
        <h3 id={titleId} className="ntf-hd-t">
          الإشعارات
        </h3>
        {unread > 0 && (
          <Button variant="ghost" size="sm" onClick={onReadAll}>
            تعليمُ الكلّ مقروءًا
          </Button>
        )}
      </div>
      <div className="ntf-tabs">
        <Segmented
          wide
          items={TABS.map((t) => (t.value === "unread" && unread ? { ...t, label: `${t.label} (${unread})` } : t))}
          value={tab}
          onValueChange={(v) => onTab(v === "unread" ? "unread" : "all")}
          aria-label="عرضُ الإشعارات"
        />
      </div>
      <div ref={listRef} className="ntf-list" aria-busy={items === null || loadingMore || undefined}>
        {items !== null && groups.length === 0 ? (
          <EmptyState variant="soft" icon={<Tray aria-hidden />} title={tab === "unread" ? "لا جديد" : "لا إشعارات بعد"} />
        ) : (
          groups.map((g) => (
            <section key={g.day}>
              <h4 className="ntf-day">{g.day}</h4>
              {g.items.map((n) => (
                <NoteRow key={n.id} item={n} onOpen={onOpen} />
              ))}
            </section>
          ))
        )}
        <div ref={endRef} aria-hidden />
      </div>
    </Dialog>
  );
}
