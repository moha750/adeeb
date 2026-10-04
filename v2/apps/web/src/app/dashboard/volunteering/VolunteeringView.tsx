"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Stat } from "@adeeb/design-system";
import { EmptyState } from "../_components/EmptyState";
import { FlagCheckered, Handshake, Ticket, UsersThree } from "@phosphor-icons/react";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { Plus } from "@/app/_components/glyphs";
import { PageHeader } from "../_components/PageHeader";
import { useToast } from "../_components/ToastProvider";
import { VOLUNTEERS_GROUP_URL } from "@/lib/volunteersGroup";
import { endOpportunity, setOpportunityStatus } from "./actions";
import type { OppListRow } from "./data";
import { OpportunityBoard, SHELF_LABEL, shelfOf, type OppCard, type Shelf } from "./OpportunityCard";
import { copyText } from "@/lib/clipboard";

/**
 * **غرفةُ الفرص التطوّعيّة.**
 *
 * الكشفُ وأفعالُ كروته. والإنشاءُ والتحريرُ صفحتُهما (`OpportunityForm`، منذ صار الموعدُ فتراتٍ ٢٠٢٦-١٠-٠١)،
 * والنشرُ ينشر الفرصةَ متاحةً للتقديم، فيُنسَخ رابطُها القصير ويُلصَق في قروب المتطوّعين، والرابطُ يقود
 * صاحبَه إلى الفرصة في حسابه.
 */
export function VolunteeringView({ rows, today }: {
  rows: OppListRow[];
  /** اليومُ بساعة الرياض «YYYY-MM-DD» — يحسبه الخادم (`page.tsx`). */
  today: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  // إنهاءُ فرصةٍ مرنة يُسأل عنه أوّلًا: يُنهي التقديمَ ولا يُتراجَع عنه
  const [ending, setEnding] = useState<OppCard | null>(null);
  const end = async () => {
    if (!ending) return;
    setBusy(ending.id);
    const r = await endOpportunity(ending.id);
    setBusy(null);
    setEnding(null);
    if (!r.ok) { toast.error(r.message); return; }
    toast.success(r.message);
    router.refresh();
  };
  const stats = useMemo(() => ({
    open: rows.filter((o) => o.status === "open").length,
    pending: rows.reduce((n, o) => n + o.pending, 0),
    accepted: rows.reduce((n, o) => n + o.accepted, 0),
  }), [rows]);

  // فرصةٌ قيل انتقالُها في رسالة فعلها نفسِه، فلا يُعاد خبرُها حين يكتشفه الكشف
  const announced = useRef<string | null>(null);

  const flip = async (o: OppCard, status: "open" | "closed") => {
    setBusy(o.id);
    const r = await setOpportunityStatus(o.id, status);
    setBusy(null);
    if (!r.ok) { toast.error(r.message); return; }
    // الحالُ بعد الفعل تُعرف قبل التحديث: لا يتغيّر بالفعل إلّا حالةُ القاعدة، فرسالةٌ واحدةٌ تقول الأمرين
    const to = shelfOf({ ...o, status }, today);
    const moved = to !== shelfOf(o, today);
    announced.current = moved ? o.id : null;
    toast.success(moved ? `${r.message} تجدها الآن في «${SHELF_LABEL[to]}».` : r.message);
    router.refresh();
  };

  // ما غادر التبويبَ المعروض بغير زرٍّ على كرته (تعديلٌ غيّر موعدها، مثلًا) يُقال أين صار
  const onMoved = useCallback((o: OppCard, to: Shelf) => {
    if (announced.current === o.id) { announced.current = null; return; }
    toast.info(`انتقلت «${o.title}» إلى «${SHELF_LABEL[to]}».`);
  }, [toast]);

  const copyLink = async (id: string) => {
    const url = `${window.location.origin}/v/${id}`;
    try {
      await copyText(url);
      toast.success("نُسخ رابطُ الفرصة. الصقه في قروب المتطوّعين.");
    } catch {
      toast.error(url);
    }
  };

  return (
    <>
      <PageHeader
        title="الفرص التطوّعيّة"
        action={{ label: "فرصة جديدة", icon: <Plus size={18} />, href: "/dashboard/volunteering/new" }}
        menu={[{ items: [{
          label: "قروب المتطوّعين",
          onSelect: () => window.open(VOLUNTEERS_GROUP_URL, "_blank", "noopener"),
        }] }]}
      />

      {/* سؤالُ هذه الغرفة عن الفرص : كم بابًا مفتوحًا، وكم طارقًا ينتظر، وكم قُبل.
          (بطاقةُ «طلبُ التحاقٍ بفرصة» كانت في سجلّ المتطوّعين فنُقلت إلى سؤالها ٢٠٢٦-٠٩-٢٤.) */}
      {rows.length > 0 ? (
        <div className="stat-grid" style={{ marginBottom: 18 }}>
          <Stat icon={<Handshake />} value={stats.open} label="فرصةٌ مفتوحة" />
          <Stat icon={<Ticket />} value={stats.pending} label="طلبٌ ينتظر المراجعة" tone={stats.pending > 0 ? "warning" : "brand"} />
          <Stat icon={<UsersThree />} value={stats.accepted} label="متطوّعٌ مقبول" tone="success" />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          variant="soft"
          icon={<Handshake />}
          title="لا فرصَ بعد"
          description="افتح فرصةً تطوّعيّة، وانشر رابطَها في قروب المتطوّعين."
          action={<Button variant="primary" size="md" onClick={() => router.push("/dashboard/volunteering/new")}><Plus size={18} />فرصة جديدة</Button>}
        />
      ) : (
        // الكشفُ بكرت «خطّ المترو» المُقَرّ (٢٠٢٦-٠٩-٣٠):
        // قائمةُ «تحتاج إجراءً منك» فوق ثلاثة رفوفٍ بالحال (سارية، مسوّدات، منتهية)، يفتح على «سارية». والأفعالُ أفعالُ هذه الغرفة نفسُها، فالكرتُ لا يعرف القاعدة.
        <OpportunityBoard
          rows={rows}
          today={today}
          busy={busy}
          onEdit={(o) => router.push(`/dashboard/volunteering/${o.id}/edit`)}
          onPublish={(o) => flip(o, "open")}
          onCopy={(o) => copyLink(o.id)}
          onClose={(o) => flip(o, "closed")}
          onOpen={(o) => router.push(`/dashboard/volunteering/${o.id}`)}
          onEnd={setEnding}
          onMoved={onMoved}
        />
      )}

      <ConfirmDialog
        open={ending !== null}
        onClose={() => setEnding(null)}
        tone="warning"
        icon={<FlagCheckered />}
        title="إنهاءُ الفرصة؟"
        text={`ينتهي التقديم على «${ending?.title ?? ""}»، ويصير عليك تسجيلُ إنجاز المقبولين وإصدارُ شهاداتهم. ولا يُتراجَع عن الإنهاء.`}
        confirmLabel="إنهاءُ الفرصة"
        onConfirm={end}
        loading={busy !== null}
      />
    </>
  );
}
