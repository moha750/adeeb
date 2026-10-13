"use client";

// معرضُ «دليل الإشعارات» — كلُّ إشعارٍ في النظام كما يصل، للرجل والمرأة، مرسومًا من الدليل نفسِه
// (`lib/notifications/catalog.ts`) بعيّنة حقائقه. لا يُكتب هنا نصٌّ: ما يُضاف إلى الدليل يظهر هنا وحدَه.
// وهو ما يُراجَع في كلّ تبويبٍ قبل أن يُطلَق إشعارُه (`v2/NOTIFICATIONS-SYSTEM.md` §٦): «نتأكّد من كلّ
// إشعارٍ يخرج من النظام» (محمد ٢٠٢٦-١٠-١٠).
import { Badge, Card, CardBody, CardHeader, Container } from "@adeeb/design-system";
import { BookOpen } from "@phosphor-icons/react";
import { LEVELS, SECTIONS, catalogEntries } from "@/lib/notifications/catalog";
import { renderNote } from "@/lib/notifications/render";
import type { Gender, InboxItem } from "@/lib/notifications/types";
import { EmptyState } from "../../dashboard/_components/EmptyState";
import { ICONS } from "../../dashboard/_shell/icons";
import { NoteRow } from "../../_notifications/NoteRow";

const NOW = new Date().toISOString();
const GENDERS: { g: Gender; label: string }[] = [
  { g: "male", label: "للرجل" },
  { g: "female", label: "للمرأة" },
];

export default function NotificationsCatalogPage() {
  const entries = catalogEntries();

  return (
    <main className="py-16">
      <Container className="max-w-3xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Notifications, Catalog</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">دليلُ الإشعارات</h1>
        <p className="mt-2 leading-relaxed text-content-muted">
          كلُّ إشعارٍ يخرج من النظام، كما يصل في الجرس، بعيّنةٍ من وقائع أدِيب. ولكلّ مخاطَبٍ درجتُه وقنواتُه،
          ومن يصله.
        </p>

        <div className="mt-10 space-y-8">
          {entries.length === 0 ? (
            <EmptyState variant="aurora" icon={<BookOpen aria-hidden />} title="الدليلُ فارغ بعد" />
          ) : (
            entries.map(([key, kind]) => {
              const Icon = ICONS[SECTIONS[kind.section].icon];
              return (
                <Card key={key}>
                  <CardHeader
                    icon={<Icon />}
                    title={kind.when}
                    subtitle={
                      <bdi dir="ltr" className="font-latin">
                        {key}
                      </bdi>
                    }
                    actions={<Badge tone="neutral">{SECTIONS[kind.section].label}</Badge>}
                  />
                  <CardBody>
                    {kind.audiences.map((a) => (
                      <section key={a.key} className="mt-4 first:mt-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={LEVELS[a.level].tone}>{LEVELS[a.level].label}</Badge>
                          <span className="text-sm text-content-muted">{LEVELS[a.level].channels}</span>
                        </div>
                        <pre dir="ltr" className="mt-2 overflow-x-auto font-latin text-xs text-content-muted">
                          {JSON.stringify(a.to(kind.sample))}
                        </pre>
                        {GENDERS.map(({ g, label }) => {
                          const note = renderNote(key, a.key, kind.sample, g);
                          const item: InboxItem = { id: 0, ...note, at: NOW, unread: true };
                          return (
                            <div key={label} className="mt-2">
                              <span className="text-xs font-bold text-content-muted">{label}</span>
                              <NoteRow item={item} onOpen={() => {}} />
                            </div>
                          );
                        })}
                      </section>
                    ))}
                  </CardBody>
                </Card>
              );
            })
          )}
        </div>
      </Container>
    </main>
  );
}
