"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TreeStructure, UsersFour } from "@phosphor-icons/react";
import { Alert, Button, Select } from "@adeeb/design-system";
import { previewVacantPosition } from "@/app/dashboard/_shell/view-as-actions";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { VacantSeat } from "./data";

/**
 * معاينة منصبٍ شاغر — لا شاغلَ يُعايَن، فيُجلَس عليه **شاغلٌ مؤقّت** ثمّ تُلبَس هويّته،
 * ويُخلى المقعد بإنهاء المعاينة. الوحدة تُسأل فقط حين يطلبها المنصب (لجنة/قسم).
 */
export function VacantSeatPicker({ seats }: { seats: VacantSeat[] }) {
  const router = useRouter();
  const toast = useToast();
  const [roleName, setRoleName] = useState("");
  const [unitId, setUnitId] = useState("");
  const [pending, start] = useTransition();

  const seat = seats.find((s) => s.roleName === roleName) ?? null;
  const needsUnit = seat != null && seat.scope !== "none";
  const ready = seat != null && (!needsUnit || unitId !== "");

  const go = () =>
    start(async () => {
      if (!seat) return;
      const res = await previewVacantPosition({ roleName: seat.roleName, unitId: needsUnit ? Number(unitId) : null });
      toast[res.ok ? "success" : "error"](res.message);
      if (!res.ok) return;
      router.push("/dashboard");
      router.refresh();
    });

  return (
    <Alert
      tone="neutral"
      title="معاينة منصبٍ شاغر"
      actions={
        <Button variant="primary" size="sm" disabled={!ready} loading={pending} onClick={go}>
          ابدأ المعاينة
        </Button>
      }
      className="mb-4"
    >
      <p className="mb-3">
        المنصب الخالي لا يُعايَن بذاته — نطاقه يُشتقّ من صفٍّ حيّ في الهيكلة. فيُجلَس عليه
        <b> شاغلٌ مؤقّت</b> (ملفٌّ واحد بلا حساب دخول، خارج سجلّ الأعضاء) ثمّ تلبس هويّته، ويُحذف
        مقعده بمجرّد «إنهاء المعاينة» فيعود المنصب شاغرًا كما كان.
      </p>
      <Select
        label="المنصب الشاغر"
        icon={<TreeStructure aria-hidden />}
        required
        options={seats.map((s) => ({ value: s.roleName, label: s.roleAr }))}
        value={roleName}
        onValueChange={(v) => { setRoleName(v); setUnitId(""); }}
        className="mb-3"
      />
      {needsUnit ? (
        <Select
          label={seat!.scope === "committee" ? "اللجنة" : "القسم"}
          icon={<UsersFour aria-hidden />}
          required
          searchable
          options={seat!.units.map((u) => ({ value: String(u.id), label: u.name }))}
          value={unitId}
          onValueChange={setUnitId}
        />
      ) : null}
    </Alert>
  );
}
