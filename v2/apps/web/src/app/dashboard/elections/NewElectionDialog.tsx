"use client";

import { useState } from "react";
import { Alert, Button, Field, Select, type SelectOption, Modal } from "@adeeb/design-system";
import { Buildings, CalendarBlank, Clock, Scales, UsersThree } from "@phosphor-icons/react";
import { useToast } from "../_components/ToastProvider";
import { fromClubInput } from "@/lib/dates";
import { useElectionApi } from "./actions-context";
import type { ElectionCreateOptions } from "./data";

/**
 * فتح انتخابٍ جديد — نافذةٌ لا صفحة: المُدخَل منصبٌ ونطاقٌ وموعدُ إغلاق ترشّح،
 * فمكوّنات المكتبة (Modal · Select · Field · Button) تكفيه بلا تخطيطٍ شارد.
 * الخيارات المعروضة **متاحة فعلًا** (فارغة بلا انتخاب نشط لمقعدها)، والقاعدة تبقى
 * الحكَم النهائيّ عند الإنشاء. **والموعدُ إلزاميّ** (المادتان ٨ و٢٣، و`open_election` ترفض بلاه): كانت الخانةُ تقول «بلا موعد
 * (يُغلق بيدك)» وتَعِد بـ«مدّ 24 ساعة» لا أصل له في النظام ولا القاعدة (٢٠٢٦-١١-١٩).
 */
export function NewElectionDialog({ open, onClose, options }: { open: boolean; onClose: () => void; options: ElectionCreateOptions }) {
  const toast = useToast();
  const api = useElectionApi();
  const [pending, setPending] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [scopeId, setScopeId] = useState("");
  const [candidacyEnd, setCandidacyEnd] = useState(""); // datetime-local محلّيّ، يُحوَّل ISO عند الإرسال

  const role = options.roles.find((r) => r.roleName === roleName) ?? null;
  const scopeList = role
    ? role.roleName === "committee_leader" ? options.leaderCommittees
      : role.roleName === "deputy_committee_leader" ? options.deputyCommittees
        : options.departments
    : [];

  const roleOptions: SelectOption[] = options.roles.map((r) => ({ value: r.roleName, label: r.label }));
  const scopeOptions: SelectOption[] = scopeList.map((s) => ({ value: String(s.id), label: s.label }));
  const noScope = role !== null && scopeOptions.length === 0;

  const reset = () => { setRoleName(""); setScopeId(""); setCandidacyEnd(""); };
  const close = () => { if (!pending) { reset(); onClose(); } };

  const submit = () => {
    if (!role || !scopeId) return;
    setPending(true);
    const candidacyEndIso = fromClubInput(candidacyEnd);
    const primary = role.scope === "committee"
      ? { roleName: role.roleName, committeeId: Number(scopeId), candidacyEndIso }
      : { roleName: role.roleName, departmentId: Number(scopeId), candidacyEndIso };
    api.createElection(primary).then((r) => {
      setPending(false);
      if (r.ok) { toast.success(r.message); reset(); onClose(); api.refresh(); }
      else toast.error(r.message);
    });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="فتح انتخابٍ جديد"
      description="اختر المقعد ونطاقه. يبدأ الانتخاب بباب ترشّحٍ مفتوح."
      size="sm"
      busy={pending}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={close} disabled={pending}>إلغاء</Button>
          <Button variant="primary" size="md" onClick={submit} loading={pending} disabled={!role || !scopeId || !candidacyEnd}>فتح باب الترشّح</Button>
        </>
      }
    >
      <Select
        label="المقعد"
        icon={<Scales />}
        options={roleOptions}
        value={roleName}
        onValueChange={(v) => { setRoleName(v); setScopeId(""); }}
        required
      />
      {role ? (
        noScope ? (
          <Alert tone="warning" title="لا مناصب فارغة">
            لا {role.scope === "department" ? "أقسام" : "لجان"} متاحة لهذا المقعد الآن: كلّها مشغولة أو لها انتخابٌ نشط.
          </Alert>
        ) : (
          <>
            <Select
              label={role.scope === "department" ? "القسم المستهدَف" : "اللجنة المستهدَفة"}
              icon={role.scope === "department" ? <Buildings /> : <UsersThree />}
              options={scopeOptions}
              value={scopeId}
              onValueChange={setScopeId}
              searchable={scopeOptions.length > 6}
              required
            />
            <Field
              label="يُغلق باب الترشّح في"
              type="datetime-local"
              icon={<CalendarBlank />}
              innerIcon={<Clock />}
              placeholder="اختر الموعد"
              helper="يُغلق تلقائيًّا، ويُعدَّل بعد الفتح بسببٍ يُبلَّغ به المصوّتون."
              value={candidacyEnd}
              onChange={(e) => setCandidacyEnd(e.target.value)}
              required
            />
          </>
        )
      ) : null}
    </Modal>
  );
}
