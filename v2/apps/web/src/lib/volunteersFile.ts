import "server-only";
import { sheetName, xlsx, XLSX_MIME } from "./xlsx";
import { badRange, exportFileName, planSheets, selectVolunteers, type ExportSpec, type ExportVolunteer } from "./volunteersExport";

export type VolunteersFile =
  | { ok: false; message: string }
  | { ok: true; name: string; type: string; bytes: Buffer; count: number; sheets: string[] };

/**
 * **ملفُّ التصدير من صفوفٍ مقروءة** — طريقٌ واحدٌ لإجراء الغرفة الحقيقيّ (`volunteers/export.ts`) ولمختبر التطوير ببياناته الوهميّة،
 * فما يُفحص في المختبر هو ما يخرج للناس. والقراءةُ والإذنُ والتسجيلُ على من يناديه، لا هنا.
 */
export function buildVolunteersFile(
  rows: ExportVolunteer[],
  committees: { id: number; name: string }[],
  spec: ExportSpec,
  today: string,
): VolunteersFile {
  if (badRange(spec)) return { ok: false, message: "بدايةُ المدّة بعد نهايتها." };
  const list = selectVolunteers(rows, spec, today);
  if (list.length === 0) return { ok: false, message: "لا أحد يطابق اختيارك، فلا ملفّ." };
  // الأسماءُ تُنقّى هنا (والتنقيةُ ثابتةٌ إن أُعيدت في `xlsx`)، فما يُسجَّل في `activity_log` هو ما في الملفّ
  const taken = new Set<string>();
  const sheets = planSheets(list, spec, committees).map((s) => ({ ...s, name: sheetName(s.name, taken) }));
  return {
    ok: true,
    name: exportFileName(spec, committees, today),
    type: XLSX_MIME,
    bytes: xlsx(sheets),
    count: list.length,
    sheets: sheets.map((s) => s.name),
  };
}
