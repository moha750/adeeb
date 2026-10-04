"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Stat } from "@adeeb/design-system";
import { ArrowUp } from "@/app/_components/glyphs";
import { ArrowDown, Eye, EyeSlash, PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { IconAnnounce } from "../../_shell/icons";
import { DataTable, type Column } from "../../_components/DataTable";
import { Toolbar } from "../../_components/Toolbar";
import { usePersistentView } from "../../_components/usePersistentView";
import { EmptyState } from "../../_components/EmptyState";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { useToast } from "../../_components/ToastProvider";
import type { MenuGroup } from "../../_components/DropdownMenu";
import type { AnnouncementRow } from "./data";
import { AnnouncementsTabs } from "./AnnouncementsTabs";
import { AnnouncementCard } from "./AnnouncementCard";
import {
  createAnnouncement,
  deleteAnnouncement,
  moveAnnouncement,
  toggleAnnouncement,
  updateAnnouncement,
} from "./actions";
import { PageHeader } from "../../_components/PageHeader";
import { AnnouncementModal, type Editing } from "./AnnouncementModal";

/**
 * **اللوحة الإعلانية** — كلماتُ الشريط الجاري على حدّ صدر الهبوط.
 *
 * كانت خمسَ جملٍ محفورةً في `Hero.tsx`، فتبديلُ كلمةٍ نشرٌ كامل. صارت جدولًا
 * بأمر المالك ٢٠٢٦-٠٩-١٨، وهذه غرفتُها. والترتيبُ هنا هو ترتيبُ المرور هناك.
 * وجارُها في المبدّل «الأخبار المعروضة» (`news/`، ٢٠٢٦-١٠-٠٣)، وبابُها `ticker/`.
 */
export function AnnouncementsView({ announcements }: { announcements: AnnouncementRow[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [confirmKill, setConfirmKill] = useState<AnnouncementRow | null>(null);
  const [view, changeView] = usePersistentView("announcements-view");

  /* **قيمُ المحرّر ههنا لا في النافذة** (عُرفُ `SupervisionModal`): النافذةُ تبقى
     مركَّبةً ويُفتَح `open` وحدَه، فلا تُفقَد حركةُ الخروج ولا تُهيَّأ حالةٌ من
     `props` في أثر. والفتحُ هو الذي يزرع القيمَ الأولى. */
  const [editing, setEditing] = useState<Editing | null>(null);
  const [text, setText] = useState("");
  const [isActive, setIsActive] = useState(true);

  const openNew = () => {
    setText("");
    setIsActive(true);
    setEditing({ kind: "new" });
  };

  const openEdit = (a: AnnouncementRow) => {
    setText(a.text);
    setIsActive(a.isActive);
    setEditing({ kind: "edit", row: a });
  };

  const submit = () => {
    if (!editing) return;
    startPending(async () => {
      const input = { text, isActive };
      const r =
        editing.kind === "edit"
          ? await updateAnnouncement(editing.row.id, input)
          : await createAnnouncement(input);
      if (r.ok) {
        toast.success(r.message);
        setEditing(null);
        router.refresh();
      } else toast.error(r.message);
    });
  };

  /* **والتحريكُ يُشعِر كسائر الأفعال** (أمرُ المالك ٢٠٢٦-٠٩-٢٤): كان مكتومًا
     بـ`quiet` وحدَه، بحجّة أنّ الكرتَ يقفز أمام العين فيغني عن الخبر. وليست
     بحجّة: القفزةُ تقول إنّ الشاشةَ تبدّلت، والإشعارُ يقول إنّ الخادمَ حفظ.
     و`quiet` باقٍ في الأداة لمن يحتاجه بعدُ، ولا آكلٌ له اليوم. */
  const run = (fn: () => Promise<{ ok: boolean; message: string }>, quiet = false) => {
    startPending(async () => {
      const r = await fn();
      if (r.ok) {
        if (!quiet) toast.success(r.message);
        router.refresh();
      } else toast.error(r.message);
    });
  };

  const actionsFor = (a: AnnouncementRow, i: number): MenuGroup[] => [
    {
      header: "إجراءات",
      items: [
        { label: "تحرير", icon: <PencilSimple />, onSelect: () => openEdit(a) },
        {
          label: a.isActive ? "إطفاء" : "إشعال",
          icon: a.isActive ? <EyeSlash /> : <Eye />,
          disabled: pending,
          onSelect: () => run(() => toggleAnnouncement(a.id, !a.isActive)),
        },
        {
          label: "تحريك لأعلى",
          icon: <ArrowUp />,
          disabled: i === 0 || pending,
          onSelect: () => run(() => moveAnnouncement(a.id, "up")),
        },
        {
          label: "تحريك لأسفل",
          icon: <ArrowDown />,
          disabled: i === announcements.length - 1 || pending,
          onSelect: () => run(() => moveAnnouncement(a.id, "down")),
        },
      ],
    },
    {
      header: "منطقة الخطر",
      danger: true,
      items: [{ label: "حذف", icon: <Trash />, danger: true, onSelect: () => setConfirmKill(a) }],
    },
  ];

  /* **والكرتُ لا قائمةَ نقاطٍ له** (أمرُ المالك ٢٠٢٦-٠٩-١٩): أفعالُه الخمسةُ في
     وجهه أزرارًا، فلا `cardActionsFor` ولا طيَّ فعلٍ خلف نقاط. والجدولُ يبقى على
     قائمته: صفُّه سطرٌ لا يتّسع لخمسة أزرار، والقائمةُ هناك عُرفُ اللوحة كلِّها. */

  const columns: Column<AnnouncementRow>[] = [
    {
      key: "sort",
      header: "#",
      width: "48px",
      align: "center",
      render: (_a, i) => <span className="txt num">{i + 1}</span>,
    },
    {
      // `auto` لا `fr`: العمودُ المرن يُحاط بـ`minmax(max-content, …)` فلا يقتطع أبدًا،
      // وجملةٌ عربيّةٌ طويلة تدفع الشبكةَ إلى عرض أطولِ سطرٍ فيها فيجري الجدولُ عرضًا
      // على شاشة ٣٧٥ (درسُ سجلّ ديبو ٢٠٢٦-٠٨-٢٢). و`wrap` يجعلها تلتفّ في مكانها.
      key: "text",
      header: "الإعلان",
      width: "auto",
      wrap: true,
      render: (a) => <span className="txt">{a.text}</span>,
    },
    {
      key: "state",
      header: "الحالة",
      width: "110px",
      render: (a) =>
        a.isActive ? (
          <Badge tone="success" dot>في الشريط</Badge>
        ) : (
          <Badge tone="neutral" dot>مُطفأ</Badge>
        ),
    },
  ];

  const createBtn = (
    <button type="button" className="abtn abtn-primary abtn-md" onClick={openNew}>
      <Plus size={18} />إعلان جديد
    </button>
  );

  const emptyState = (
    <EmptyState
      variant="aurora"
      icon={<IconAnnounce />}
      title="لا إعلانات بعد"
      description="أضِف أوّل إعلان، يمرّ في شريط الصفحة الرئيسية. ولو خلت اللوحةُ اختفى الشريط."
      action={createBtn}
    />
  );

  const live = announcements.filter((a) => a.isActive);

  return (
    <>
      <PageHeader
        title="اللوحة الإعلانية"
        crumbLeaf="شريط الإعلانات"
        action={{ label: "إعلان جديد", icon: <Plus size={18} />, onClick: openNew }}
      />

      <AnnouncementsTabs on="ticker" />

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<IconAnnounce />} value={live.length} label="إعلانات في الشريط" />
        <Stat icon={<EyeSlash />} value={announcements.length - live.length} label="إعلانات مُطفأة" />
      </div>

      <Toolbar view={view} onViewChange={changeView} />

      {view === "table" ? (
        <DataTable
          columns={columns}
          rows={announcements}
          getRowId={(a) => a.id}
          emptyState={emptyState}
          rowActions={(a) => actionsFor(a, announcements.findIndex((x) => x.id === a.id))}
          onRowClick={openEdit}
        />
      ) : announcements.length === 0 ? (
        <div className="card-empty">{emptyState}</div>
      ) : (
        <div className="card-grid card-grid-1col">
          {announcements.map((a, i) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              order={i + 1}
              canUp={i > 0}
              canDown={i < announcements.length - 1}
              busy={pending}
              onOpen={() => openEdit(a)}
              onToggle={() => run(() => toggleAnnouncement(a.id, !a.isActive))}
              onMove={(dir) => run(() => moveAnnouncement(a.id, dir))}
              onDelete={() => setConfirmKill(a)}
            />
          ))}
        </div>
      )}

      <AnnouncementModal
        editing={editing}
        text={text}
        onText={setText}
        isActive={isActive}
        onActive={setIsActive}
        busy={pending}
        onClose={() => setEditing(null)}
        onSubmit={submit}
      />

      <ConfirmDialog
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الإعلان؟"
        text={
          confirmKill
            ? `سيُحذف «${confirmKill.text}» نهائيًّا. ولو أردت إخراجه من الشريط وحدَه فأطفِئه.`
            : undefined
        }
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!confirmKill) return;
          startPending(async () => {
            const r = await deleteAnnouncement(confirmKill.id);
            if (r.ok) {
              toast.success(r.message);
              setConfirmKill(null);
              router.refresh();
            } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
