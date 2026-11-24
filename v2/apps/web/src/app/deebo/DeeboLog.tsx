"use client";

/**
 * **«محادثاتي» نافذةٌ من نوافذ الهويّة** (١١-٢٤) — كانت ورقةَ التنقّل القديمة (`.mnsh`) بسطح الشفق. وأمرُ المالك فيها (٢٠٢٦-٠٨-٢٠:
 * «اجعلها تأتي من الأسفل مثل navbar») تحقّقه النافذةُ نفسُها: **على الجوّال لوحٌ يصعد من القاع بمقبضه**، وعلى الحاسوب نافذةٌ في الوسط
 * بعنوانها على اللوح — عائلةُ النوافذ كلّها، فلا سطحَ يُخترع لها وحدها.
 *
 * - المحادثاتُ سطورُ «حسابي» تحت رأس زمنها («اليوم»، «أمس»…): الزمنُ يُقال مرّةً لعشرٍ لا عشرَ مرّات.
 * - **والحذفُ زرٌّ بجانب السطر** لا داخله (زرٌّ لا يحمل زرًّا، نمطُ سطور المعرض)، هادئٌ كـ«إزالة» في منتقي الأشخاص: ستّةُ صناديقَ حمراءَ
 *   في نافذةٍ واحدةٍ تصرخ بما لا يريده أحد. وحكمُه عند صاحبه: تخرج من درجه.
 * - و«محادثة جديدة» الفعلُ الأساسيُّ في ذيل النافذة.
 */

import { Modal } from "@adeeb/design-system";
import { ChatsCircle } from "@phosphor-icons/react";
import { Plus, Trash } from "@/app/_components/glyphs";
import { clubDayKey, daysBetweenKeys } from "@/lib/dates";
import { AdLine } from "@/app/_ad/account";
import { AdButton } from "@/app/_ad/primitives";
import type { ConversationRow } from "./actions";

const ORDER = ["اليوم", "أمس", "آخر سبعة أيّام", "هذا الشهر", "أقدم"];

function groupByDay(rows: ConversationRow[], todayKey: string): Array<[string, ConversationRow[]]> {
  const buckets = new Map<string, ConversationRow[]>();
  for (const r of rows) {
    const days = daysBetweenKeys(clubDayKey(r.lastAt), todayKey);
    const label = days <= 0 ? "اليوم" : days === 1 ? "أمس" : days <= 7 ? "آخر سبعة أيّام" : days <= 31 ? "هذا الشهر" : "أقدم";
    buckets.set(label, [...(buckets.get(label) ?? []), r]);
  }
  return ORDER.filter((l) => buckets.has(l)).map((l) => [l, buckets.get(l)!]);
}

export function DeeboLog({ rows, open, todayKey, openId, onClose, onOpen, onNew, onDelete }: {
  rows: ConversationRow[];
  open: boolean;
  /** مفتاحُ اليوم من الفاتح لا من الرسم: الخادمُ والمتصفّحُ يرسمان سواءً */
  todayKey: string;
  openId?: string | null;
  onClose: () => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="محادثاتي" description="حذفُك محادثةً يحذفها من كلّ مكان."
      footer={<AdButton variant="fill" icon={<Plus />} onClick={() => { onNew(); onClose(); }}>محادثة جديدة</AdButton>}>
      {groupByDay(rows, todayKey).map(([when, list]) => (
        <section key={when} className="ad-dk-group" aria-label={when}>
          <h3 className="ad-dk-when">{when}</h3>
          <ul className="ad-lines ad-pp-lines">
            {list.map((c) => {
              const title = c.title || "محادثة";
              return (
                <AdLine key={c.id} icon={<ChatsCircle />} v={title} current={c.id === openId}
                  onClick={() => { onOpen(c.id); onClose(); }}
                  aside={onDelete ? (
                    <span className="ad-pp-x">
                      <AdButton variant="soft" size="sm" icon={<Trash />} onClick={() => onDelete(c.id)}>احذف<span className="ad-sr">{` ${title}`}</span></AdButton>
                    </span>
                  ) : undefined} />
              );
            })}
          </ul>
        </section>
      ))}
    </Modal>
  );
}
