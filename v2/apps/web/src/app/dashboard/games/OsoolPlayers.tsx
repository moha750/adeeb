"use client";

import { useState } from "react";
import { Certificate } from "@phosphor-icons/react";
import { fmtStamp } from "@/lib/dates";
import { DataTable, type Column } from "../_components/DataTable";
import { EmptyState } from "../_components/EmptyState";
import { Pagination } from "../_components/Pagination";
import type { OsoolPlayer } from "./vocab";

const OUTCOME = { won: "نال شهادته", lost: "خسر", playing: "لم يُكمل" } as const;
const OUTCOME_TONE = { won: "success", lost: "danger", playing: undefined } as const;
const MAJLIS = { m: "الرجال", f: "النساء" } as const;
/** تقديراتُ الشهادة بترتيب اختباراتها (القهوة خصّ، صبّة الحشمة، هزّ الفنجال) كما في اللعبة. */
const GRADES = ["ممتاز", "جيد جدًا", "سيء"];

function certLine(p: OsoolPlayer): string {
  if (p.saved && p.shared) return "حفظها وشاركها";
  if (p.saved) return "حفظها";
  if (p.shared) return "شاركها";
  return "";
}

/**
 * **من لعب «مدارس الأصول»** — جولةٌ في كلّ صفّ، الأحدثُ أوّلًا: الاسمُ الذي كتبه للشهادة، واسمُ حسابه
 * إن كان داخلًا (يُعرف من جلسته في الخادم)، والمجلسُ والنتيجةُ والتقديراتُ وما فعل بشهادته.
 * طلبُ المالك ليلةَ الإطلاق (٢٠٢٦-١١-١٦): «وما هي أسماؤهم التي سجّلت؟».
 */
export function OsoolPlayers({ players }: { players: OsoolPlayer[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const pages = Math.max(1, Math.ceil(players.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = players.slice((safePage - 1) * pageSize, safePage * pageSize);

  const columns: Column<OsoolPlayer>[] = [
    { key: "name", header: "الاسم في الشهادة", render: (p) => p.name },
    { key: "account", header: "الحساب", render: (p) => p.account ?? "بلا حساب" },
    { key: "majlis", header: "المجلس", render: (p) => (p.majlis ? MAJLIS[p.majlis] : "") },
    { key: "outcome", header: "النتيجة", render: (p) => OUTCOME[p.outcome] },
    {
      key: "grades", header: "التقديرات", width: "auto", wrap: true,
      render: (p) => (p.outcome === "won" && p.grades ? p.grades.map((g) => GRADES[g] ?? "").join("، ") : ""),
    },
    { key: "cert", header: "الشهادة", render: certLine },
    { key: "at", header: "الوقت", render: (p) => fmtStamp(p.at) },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(p) => p.id}
      rowTone={(p) => OUTCOME_TONE[p.outcome]}
      emptyState={<EmptyState icon={<Certificate />} title="لا أحد بعد" description="تظهر هنا أسماءُ من يلعبون من الآن." />}
      footer={
        players.length > pageSize ? (
          <Pagination page={safePage} pageSize={pageSize} total={players.length} onPageChange={setPage}
            onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} noun="جولة" />
        ) : undefined
      }
    />
  );
}
