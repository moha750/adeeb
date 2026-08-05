"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Select, type SelectOption, Modal } from "@adeeb/design-system";
import { Buildings, Scales, UsersThree } from "@phosphor-icons/react";
import { useToast } from "../_components/ToastProvider";
import { createElection } from "./actions";
import type { ElectionCreateOptions } from "./data";

/**
 * فتح انتخابٍ جديد — نافذةٌ لا صفحة: المُدخَل منصبٌ ونطاق فقط، فمكوّنات المكتبة
 * (Modal · Select · Button) تكفيه بلا تخطيطٍ شارد. الخيارات المعروضة **متاحة فعلًا**
 * (شاغرة بلا انتخاب نشط)، والقاعدة تبقى الحكَم النهائيّ عند الإنشاء.
 */
export function NewElectionDialog({ open, onClose, options }: { open: boolean; onClose: () => void; options: ElectionCreateOptions }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [scopeId, setScopeId] = useState("");

  const role = options.roles.find((r) => r.roleName === roleName) ?? null;
  const scopeList = role
    ? role.roleName === "committee_leader" ? options.leaderCommittees
      : role.roleName === "deputy_committee_leader" ? options.deputyCommittees
        : options.departments
    : [];

  const roleOptions: SelectOption[] = options.roles.map((r) => ({ value: r.roleName, label: r.label }));
  const scopeOptions: SelectOption[] = scopeList.map((s) => ({ value: String(s.id), label: s.label }));
  const noScope = role !== null && scopeOptions.length === 0;

  const reset = () => { setRoleName(""); setScopeId(""); };
  const close = () => { if (!pending) { reset(); onClose(); } };

  const submit = () => {
    if (!role || !scopeId) return;
    setPending(true);
    const payload = role.scope === "department"
      ? { roleName: role.roleName, departmentId: Number(scopeId) }
      : { roleName: role.roleName, committeeId: Number(scopeId) };
    createElection(payload).then((r) => {
      setPending(false);
      if (r.ok) { toast.success(r.message); reset(); onClose(); router.refresh(); }
      else toast.error(r.message);
    });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="فتح انتخابٍ جديد"
      description="اختر المنصب المنتخَب ونطاقه — يبدأ الانتخاب بباب ترشّحٍ مفتوح."
      size="sm"
      busy={pending}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={close} disabled={pending}>إلغاء</Button>
          <Button variant="primary" size="md" onClick={submit} loading={pending} disabled={!role || !scopeId}>فتح باب الترشّح</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <Select
          label="المنصب المنتخَب"
          icon={<Scales />}
          options={roleOptions}
          value={roleName}
          onValueChange={(v) => { setRoleName(v); setScopeId(""); }}
          required
        />
        {role ? (
          noScope ? (
            <Alert tone="warning" title="لا مناصب شاغرة">
              لا {role.scope === "department" ? "أقسام" : "لجان"} متاحة لهذا المنصب الآن — كلّها مشغولة أو لها انتخابٌ نشط.
            </Alert>
          ) : (
            <Select
              label={role.scope === "department" ? "القسم المستهدَف" : "اللجنة المستهدَفة"}
              icon={role.scope === "department" ? <Buildings /> : <UsersThree />}
              options={scopeOptions}
              value={scopeId}
              onValueChange={setScopeId}
              searchable={scopeOptions.length > 6}
              required
            />
          )
        ) : null}
      </div>
    </Modal>
  );
}
