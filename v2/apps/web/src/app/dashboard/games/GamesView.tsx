"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Stat, matchesSearch } from "@adeeb/design-system";
import { Hash, Timer, UsersThree } from "@phosphor-icons/react";
import { Eye, Plus, Trash } from "@/app/_components/glyphs";
import { IconGame } from "../_shell/icons";
import { DataTable, type Column } from "../_components/DataTable";
import { DataCards } from "../_components/DataCards";
import { Toolbar, type FilterDef } from "../_components/Toolbar";
import { usePersistentView } from "../_components/usePersistentView";
import { EmptyState } from "../_components/EmptyState";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { useToast } from "../_components/ToastProvider";
import type { MenuGroup } from "../_components/DropdownMenu";
import { PageHeader } from "../_components/PageHeader";
import { ROOM_STATUS_META } from "./vocab";
import type { RoomRow } from "./data";
import { closeRoom, deleteRoom } from "./actions";

/** غرفُ اللعب: ما جرى، وما ينتظر أن يُفتَح الآن. */
export function GamesView({ rows }: { rows: RoomRow[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [view, changeView] = usePersistentView("gw-rooms-view");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Record<string, string>>({ status: "" });
  const [confirmKill, setConfirmKill] = useState<RoomRow | null>(null);
  const [confirmClose, setConfirmClose] = useState<RoomRow | null>(null);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) => (!status.status || r.status === status.status) && matchesSearch(search, r.title, r.code)
      ),
    [rows, search, status]
  );

  const filterDefs: FilterDef[] = [
    {
      key: "status",
      label: "الحال",
      options: [
        { value: "", label: "الكل" },
        { value: "waiting", label: "في الانتظار" },
        { value: "active", label: "جارية" },
        { value: "finished", label: "منتهية" },
      ],
    },
  ];

  const open = (r: RoomRow) => router.push(`/dashboard/games/${r.id}`);

  const actionsFor = (r: RoomRow): MenuGroup[] => [
    {
      header: "إجراءات",
      items: [
        { label: "فتحُ المِقوَد", icon: <IconGame />, onSelect: () => open(r) },
        {
          label: "شاشةُ العرض",
          icon: <Eye />,
          onSelect: () => window.open(`/dashboard/games/${r.id}/screen`, "_blank", "noopener"),
        },
      ],
    },
    ...(r.status === "finished"
      ? []
      : [
          {
            header: "الختام",
            items: [{ label: "إنهاءُ اللعبة", icon: <Timer />, onSelect: () => setConfirmClose(r) }],
          },
        ]),
    {
      header: "منطقة الخطر",
      danger: true,
      items: [
        { label: "حذفُ الغرفة", icon: <Trash />, danger: true, onSelect: () => setConfirmKill(r) },
      ],
    },
  ];

  const columns: Column<RoomRow>[] = [
    {
      key: "title",
      header: "الغرفة",
      width: "auto",
      wrap: true,
      render: (r) => <span className="txt">{r.title}</span>,
    },
    {
      key: "code",
      header: "الرمز",
      width: "110px",
      icon: <Hash />,
      // الرمزُ لاتينيٌّ محضٌ فيُعزَل اتّجاهُه ويُخطّ بالخطّ اللاتينيّ كسائر القيم.
      render: (r) => (
        <span className="txt lat" dir="ltr">
          {r.code}
        </span>
      ),
    },
    {
      key: "status",
      header: "الحال",
      width: "120px",
      render: (r) => (
        <Badge tone={ROOM_STATUS_META[r.status].tone} dot>
          {ROOM_STATUS_META[r.status].label}
        </Badge>
      ),
    },
    {
      key: "words",
      header: "الجولات",
      width: "120px",
      icon: <Timer />,
      render: (r) => (
        <span className="txt lat" dir="ltr">
          {r.playedCount}/{r.wordCount}
        </span>
      ),
    },
    {
      key: "players",
      header: "اللاعبون",
      width: "110px",
      icon: <UsersThree />,
      render: (r) => <span className="txt num">{r.playerCount}</span>,
    },
    {
      key: "created",
      header: "أُنشئت",
      width: "minmax(130px, 1fr)",
      render: (r) => <span className="txt">{r.createdAtLabel}</span>,
    },
  ];

  const emptyState = (
    <EmptyState
      variant="aurora"
      icon={<IconGame />}
      title={rows.length === 0 ? "لا غرفَ بعد" : "لا غرفةَ توافق البحث"}
      description={
        rows.length === 0
          ? "افتح غرفةً، فيمسح الحاضرون رمزَها ويدخلون بأسمائهم."
          : "جرّب كلمةً أخرى أو ارفع المرشّح."
      }
      action={
        rows.length === 0 ? (
          <Link href="/dashboard/games/new" className="abtn abtn-primary abtn-md">
            <Plus size={18} />
            غرفة جديدة
          </Link>
        ) : undefined
      }
    />
  );

  const liveRooms = rows.filter((r) => r.status !== "finished").length;

  return (
    <>
      <PageHeader
        title="خمّن الكلمة"
        action={{ label: "غرفة جديدة", icon: <Plus size={18} />, href: "/dashboard/games/new" }}
      />

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<IconGame />} value={liveRooms} label="غرفٌ لم تنتهِ" />
        <Stat icon={<UsersThree />} value={rows.reduce((n, r) => n + r.playerCount, 0)} label="لاعبون" />
        <Stat icon={<Timer />} value={rows.reduce((n, r) => n + r.playedCount, 0)} label="جولاتٌ لُعِبت" />
      </div>

      <Toolbar
        searchPlaceholder="ابحث بالعنوان أو الرمز"
        search={search}
        onSearch={setSearch}
        filters={filterDefs}
        filterValues={status}
        onFilter={(key, value) => setStatus({ [key]: value })}
        view={view}
        onViewChange={changeView}
      />

      {view === "table" ? (
        <DataTable
          columns={columns}
          rows={filtered}
          getRowId={(r) => r.id}
          emptyState={emptyState}
          rowActions={actionsFor}
          onRowClick={open}
        />
      ) : (
        <DataCards
          columns={columns}
          rows={filtered}
          getRowId={(r) => r.id}
          spec={{
            title: "title",
            subtitle: "code",
            badge: "status",
            facts: ["words", "players", "created"],
            bareFacts: true,
          }}
          emptyState={emptyState}
          rowActions={actionsFor}
          onRowClick={open}
          openLabel="فتحُ المِقوَد"
        />
      )}

      <ConfirmDialog
        open={confirmClose !== null}
        onClose={() => setConfirmClose(null)}
        tone="warning"
        icon={<Timer />}
        title="إنهاءُ اللعبة؟"
        text={
          confirmClose
            ? `ستُغلَق «${confirmClose.title}» فلا ينضمّ إليها أحدٌ ولا تُفتَح جولةٌ فيها، ويُكشَف للجميع ما لُعِب.`
            : undefined
        }
        confirmLabel="إنهاء"
        loading={pending}
        onConfirm={() => {
          if (!confirmClose) return;
          startPending(async () => {
            const r = await closeRoom(confirmClose.id);
            if (r.ok) {
              toast.success(r.message);
              setConfirmClose(null);
              router.refresh();
            } else toast.error(r.message);
          });
        }}
      />

      <ConfirmDialog
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذفُ الغرفة؟"
        text={
          confirmKill
            ? `سيُحذف كلُّ ما في «${confirmKill.title}»: جولاتُها ولاعبوها وإجاباتُهم. ولا رجعةَ فيه.`
            : undefined
        }
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!confirmKill) return;
          startPending(async () => {
            const r = await deleteRoom(confirmKill.id);
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
