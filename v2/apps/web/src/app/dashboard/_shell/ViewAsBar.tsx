"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@adeeb/design-system";
import { stopViewAs } from "./view-as-actions";

/**
 * شريط المعاينة — يعلو كلّ صفحةٍ ما دامت الهويّة مستعارة، **ولا يُخفى**:
 * ما يُنفَّذ أثناءها يُنسَب إلى المُعايَن في القاعدة وفي سجلّ النشاط، فإخفاؤه يجعل
 * المُعاين ينسى بأيّ يدٍ يكتب. لا صنف جديد — تنبيهُ المكتبة بنغمته (القاعدة ١).
 */
export function ViewAsBar({ targetName, realName }: { targetName: string | null; realName: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const end = () =>
    start(async () => {
      await stopViewAs();
      router.replace("/dashboard");
      router.refresh();
    });

  return (
    <Alert
      tone="warning"
      title="معاينة بهويّةٍ أخرى"
      actions={
        <Button variant="ghost-warning" size="sm" loading={pending} onClick={end}>
          إنهاء المعاينة
        </Button>
      }
      className="mb-4"
    >
      ترى اللوحة وتنفّذ فيها بصلاحيّة <b>{targetName?.trim() || "عضو"}</b> — لا بصلاحيّتك
      {realName?.trim() ? ` (${realName.trim()})` : ""}. وكلّ إجراءٍ تُتمّه الآن يُنسَب إليه في السجلّ.
    </Alert>
  );
}
