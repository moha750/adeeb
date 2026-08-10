"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Select, type SelectOption, Modal, Switch } from "@adeeb/design-system";
import { Buildings, CalendarBlank, Clock, Scales, UsersThree } from "@phosphor-icons/react";
import { useToast } from "../_components/ToastProvider";
import { fromClubInput } from "@/lib/dates";
import { createElection } from "./actions";
import type { ElectionCreateOptions } from "./data";

/**
 * فتح انتخابٍ جديد — نافذةٌ لا صفحة: المُدخَل منصبٌ ونطاقٌ وموعدُ إغلاق ترشّح،
 * فمكوّنات المكتبة (Modal · Select · Field · Button) تكفيه بلا تخطيطٍ شارد.
 * الخيارات المعروضة **متاحة فعلًا** (شاغرة بلا انتخاب نشط لمقعدها)، والقاعدة تبقى
 * الحكَم النهائيّ عند الإنشاء. والموعدُ اختياريّ: فارغُه بابٌ يُغلق بيد المشرف.
 */
export function NewElectionDialog({ open, onClose, options }: { open: boolean; onClose: () => void; options: ElectionCreateOptions }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [scopeId, setScopeId] = useState("");
  const [candidacyEnd, setCandidacyEnd] = useState(""); // datetime-local محلّيّ، يُحوَّل ISO عند الإرسال
  const [openBoth, setOpenBoth] = useState(false); // توأمة الفتح: يفتح المقعد الآخر للجنة نفسها معًا

  const role = options.roles.find((r) => r.roleName === roleName) ?? null;
  const scopeList = role
    ? role.roleName === "committee_leader" ? options.leaderCommittees
      : role.roleName === "deputy_committee_leader" ? options.deputyCommittees
        : options.departments
    : [];

  const roleOptions: SelectOption[] = options.roles.map((r) => ({ value: r.roleName, label: r.label }));
  const scopeOptions: SelectOption[] = scopeList.map((s) => ({ value: String(s.id), label: s.label }));
  const noScope = role !== null && scopeOptions.length === 0;

  const reset = () => { setRoleName(""); setScopeId(""); setCandidacyEnd(""); setOpenBoth(false); };
  const close = () => { if (!pending) { reset(); onClose(); } };

  const submit = () => {
    if (!role || !scopeId) return;
    setPending(true);
    const isComm = role.scope === "committee";
    const candidacyEndIso = fromClubInput(candidacyEnd);
    const primary = isComm
      ? { roleName: role.roleName, committeeId: Number(scopeId), candidacyEndIso }
      : { roleName: role.roleName, departmentId: Number(scopeId), candidacyEndIso };
    const pairRole = role.roleName === "committee_leader" ? "deputy_committee_leader"
      : role.roleName === "deputy_committee_leader" ? "committee_leader" : null;
    (async () => {
      const r1 = await createElection(primary);
      if (!r1.ok) return r1;
      if (openBoth && isComm && pairRole) {
        const r2 = await createElection({ roleName: pairRole, committeeId: Number(scopeId), candidacyEndIso });
        return r2.ok
          ? { ok: true as const, message: "فُتح مقعدا اللجنة معًا (قيادةً ونيابةً)." }
          : { ok: true as const, message: `فُتح المقعد الأوّل، وتعذّر الآخر: ${r2.message}` };
      }
      return r1;
    })().then((r) => {
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
      description="اختر المنصب المنتخَب ونطاقه. يبدأ الانتخاب بباب ترشّحٍ مفتوح."
      size="sm"
      busy={pending}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={close} disabled={pending}>إلغاء</Button>
          <Button variant="primary" size="md" onClick={submit} loading={pending} disabled={!role || !scopeId}>فتح باب الترشّح</Button>
        </>
      }
    >
      <Select
        label="المنصب المنتخَب"
        icon={<Scales />}
        options={roleOptions}
        value={roleName}
        onValueChange={(v) => { setRoleName(v); setScopeId(""); setOpenBoth(false); }}
        required
      />
      {role ? (
        noScope ? (
          <Alert tone="warning" title="لا مناصب شاغرة">
            لا {role.scope === "department" ? "أقسام" : "لجان"} متاحة لهذا المنصب الآن: كلّها مشغولة أو لها انتخابٌ نشط.
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
              placeholder="بلا موعد (يُغلق بيدك)"
              helper="بتوقيت الرياض. عند الموعد يُغلق الباب تلقائيًّا، وإن قلّ المرشّحون عن اثنين مُدّ 24 ساعة مرّةً واحدة."
              value={candidacyEnd}
              onChange={(e) => setCandidacyEnd(e.target.value)}
              optional
            />
            {role.scope === "committee" ? (
              <Switch
                label="افتح المقعد الآخر في اللجنة نفسها"
                description={role.roleName === "committee_leader" ? "يُفتح انتخابُ النائب أيضًا (مقعدان مستقلّان بالتوقيت نفسه)." : "يُفتح انتخابُ القائد أيضًا (مقعدان مستقلّان بالتوقيت نفسه)."}
                checked={openBoth}
                onChange={(e) => setOpenBoth(e.target.checked)}
              />
            ) : null}
          </>
        )
      ) : null}
    </Modal>
  );
}
