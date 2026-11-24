"use server";

import { z } from "zod";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { clubDayKey } from "@/lib/dates";
import { arCount, AR_VOLUNTEER } from "@/lib/arabicCount";
import { service } from "@/lib/volunteering";
import { ALL_COLUMNS, isColumn, type ExportSpec } from "@/lib/volunteersExport";
import { buildVolunteersFile } from "@/lib/volunteersFile";
import { activeCommittees, listVolunteers } from "../data";

/** ما يعود إلى النافذة: الملفُّ مرمَّزًا (`base64`) باسمه ونوعه، أو رسالةٌ عربيّةٌ تقولها كما هي */
export type ExportResult =
  | { ok: false; message: string }
  | { ok: true; message: string; file: { name: string; type: string; data: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_RE = /^(\d{4}-\d{2}-\d{2})?$/;

/** ما يأتي من المتصفّح يُفحص كلُّه: النطاقُ والمرشّحاتُ والأعمدةُ من قوائمها، والمعرّفاتُ على صورتها وبحدّ */
const specSchema = z.object({
  scope: z.enum(["all", "room", "picked"]),
  ids: z.array(z.string().regex(UUID_RE)).max(5000),
  genders: z.array(z.enum(["male", "female", "none"])).max(3),
  committees: z.array(z.string().regex(/^\d{1,9}$/)).max(50),
  ranks: z.array(z.union([z.literal(1), z.literal(2), z.literal(3)])).max(3),
  stands: z.array(z.enum(["active", "members", "former"])).max(3),
  since: z.enum(["", "7", "30", "range"]),
  from: z.string().regex(DAY_RE),
  to: z.string().regex(DAY_RE),
  columns: z.array(z.string()).max(ALL_COLUMNS.length * 2).transform((a) => [...new Set(a)].filter(isColumn)),
  split: z.enum(["one", "committee", "gender"]),
});

const PATH = "/dashboard/volunteering/volunteers";

/**
 * **تصديرُ سجلّ المتطوّعين ملفَّ Excel** (مسارُ «التصدير»، اعتمده محمد ٢٠٢٦-١١-٢٤). بياناتُ أشخاصٍ حقيقيّين تخرج ولا تعود، فالحكمُ
 * كلُّه هنا لا في النافذة:
 * - **الإذنُ حاجزُ الغرفة نفسُه** (`denyUnless` بمسارها، فقفلُها في `SECTION_CAP` وحده): من لا يدخل الغرفة لا يُصدِّر منها.
 * - **والقراءةُ قراءةُ الغرفة** (`listVolunteers`) بعد الحاجز، ولا يُؤخذ من المتصفّح إلّا الاختيار: المعرّفاتُ تختار ممّا قرأه الخادم
 *   ولا تضيف إليه، والعددُ والأوراقُ تُحسب هنا من جديد (`buildVolunteersFile`).
 * - **وكلُّ تصديرٍ يُسجَّل قبل أن يخرج الملفّ** (`activity_log`، `export_volunteers`): من صدّر، وكم، وأيّ أعمدة، وأيّ نطاقٍ ومرشّحات.
 *   فإن تعذّر التسجيلُ لم يخرج الملفّ — الملفُّ الذي لا يُعرف من أخرجه لا يخرج. والفاعلُ صاحبُ الجلسة الحقيقيّ ولو كان يعاين بعين غيره
 *   (`viewAs.realId`)، ومن عاينه في التفاصيل.
 * - `dry` (التطوير وحده، `?f=dry` في الغرفة): يُخرج الملفَّ ولا يسجّل، فيُفحص التصديرُ بلا كتابةٍ في القاعدة الحيّة. وفي الإنتاج يُهمَل.
 */
export async function exportVolunteers(raw: ExportSpec, opts?: { dry?: boolean }): Promise<ExportResult> {
  const denied = await denyUnless(PATH);
  if (denied) return { ok: false, message: "حسابك لا يملك صلاحية تصدير المتطوّعين." };
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, message: "انتهت جلستك، فادخل من جديد." };

  const parsed = specSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "اختيارُ التصدير غير مفهوم، فأعد فتح النافذة." };
  const spec: ExportSpec = parsed.data;

  const [rows, committees] = await Promise.all([listVolunteers(), activeCommittees()]);
  const today = clubDayKey(new Date().toISOString());
  const file = buildVolunteersFile(rows, committees, spec, today);
  if (!file.ok) return file;

  const dry = process.env.NODE_ENV !== "production" && opts?.dry === true;
  if (!dry) {
    const sb = service();
    const { error } = sb
      ? await sb.from("activity_log").insert({
          user_id: admin.viewAs?.realId ?? admin.id,
          action_type: "export_volunteers",
          // الأعمدةُ الثلاثة إلزاميّة (`text NOT NULL`)، والهدفُ السجلُّ كلُّه لا صفٌّ فيه — كما تكتب الأفعالُ الأخرى نوعَ هدفها ومعرّفَه
          target_type: "volunteers",
          target_id: "volunteers",
          details: {
            count: file.count,
            sheets: file.sheets,
            columns: spec.columns,
            scope: spec.scope,
            // المعرّفاتُ لا تُكتب كلُّها: عددُها يكفي، ومن خرج يُعرف بالنطاق والمرشّحات وتاريخ السطر
            ids: spec.scope === "all" ? null : spec.ids.length,
            filters: { genders: spec.genders, committees: spec.committees, ranks: spec.ranks, stands: spec.stands, since: spec.since, from: spec.from, to: spec.to },
            split: spec.split,
            file: file.name,
            ...(admin.viewAs ? { previewed_as: admin.id } : {}),
          },
        })
      : { error: { message: "no service client" } };
    if (error) return { ok: false, message: "تعذّر تسجيلُ التصدير، فلم يُجهَّز الملفّ. حاول مرّةً أخرى." };
  }

  return {
    ok: true,
    message: `جُهّز الملفّ: ${arCount(file.count, AR_VOLUNTEER)}.`,
    file: { name: file.name, type: file.type, data: file.bytes.toString("base64") },
  };
}
