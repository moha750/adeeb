"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "@/app/_components/glyphs";
import { Alert, Button, Select } from "@adeeb/design-system";
import { startViewAs } from "@/app/dashboard/_shell/view-as-actions";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { ViewAsTarget } from "./data";

/**
 * منتقي المعاينة — غرفتُه هذه الشاشة لأنّ حارسها هو حارس المعاينة نفسه (`manage_permissions`):
 * من يمنح القدرات يرى أثرها مطبَّقًا بعينَي صاحبها. بلا صنف جديد — تنبيهٌ ومنسدلة وزرّ من المكتبة.
 */
export function ViewAsPicker({ targets }: { targets: ViewAsTarget[] }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();

  const go = () =>
    start(async () => {
      const res = await startViewAs(value);
      toast[res.ok ? "success" : "error"](res.message);
      if (!res.ok) return;
      router.push("/dashboard");
      router.refresh();
    });

  return (
    <Alert
      tone="info"
      title="معاينة اللوحة بعينَي عضو"
      actions={
        <Button variant="primary" size="sm" disabled={!value} loading={pending} onClick={go}>
          ابدأ المعاينة
        </Button>
      }
      className="mb-4"
    >
      <p className="mb-3">
        تدخل اللوحة بهويّته كاملةً: ترى تبويباته ونطاقه، <b>وتنفّذ بصلاحيّته</b> — فتبويبٌ كـ«توزيع
        الإشراف» نطاقُه هويّةُ القائد لا قدرتُه وحدها. وينتهي كلّ شيءٍ بزرّ «إنهاء المعاينة».
      </p>
      <Select
        label="العضو"
        icon={<Eye aria-hidden />}
        required
        searchable
        options={targets.map((t) => ({ value: t.id, label: t.name, group: t.roleAr }))}
        value={value}
        onValueChange={setValue}
      />
    </Alert>
  );
}
