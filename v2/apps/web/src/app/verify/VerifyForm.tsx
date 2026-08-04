"use client";

import { Button, Field } from "@adeeb/design-system";
import { Hash, MagnifyingGlass, SealCheck } from "@phosphor-icons/react";

/**
 * نموذج التحقّق — **`method="get"` لا فعلٌ خادميّ**: الرقم يذهب في العنوان فيعود الجواب،
 * فيصير الرابطُ نفسه دليلًا يُشارَك («تحقّق من شهادتي: adeeb.club/verify?code=…»).
 *
 * وعميليٌّ لأجل الأيقونات وحدها (Phosphor يُنشئ `createContext` فلا يُستورَد في خادميّ)،
 * ونظامُ الحقل من المكتبة كما هو — لا حقلٌ مصنوعٌ بيدٍ في صفحةٍ عابرة.
 */
export function VerifyForm({ defaultCode }: { defaultCode?: string }) {
  return (
    <form method="get" action="/verify">
      <Field
        label="الرقم المرجعيّ"
        icon={<Hash />}
        innerIcon={<SealCheck />}
        placeholder="ADEEB-EXP-2026-0001-A1B2C3"
        name="code"
        defaultValue={defaultCode ?? ""}
        dir="ltr"
        autoComplete="off"
        required
        helper="مطبوعٌ في أسفل الشهادة."
      />
      <Button type="submit" variant="primary" size="md">
        <MagnifyingGlass aria-hidden /> تحقّق
      </Button>
    </form>
  );
}
