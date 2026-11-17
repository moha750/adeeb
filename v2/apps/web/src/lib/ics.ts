/**
 * **ملفُّ التقويم** (`.ics`، ٢٠٢٦-١١-١٥) — «أضف إلى التقويم» في صفحة الفعاليّة: موعدٌ واحدٌ يفتحه تقويمُ الجوّال أو الحاسوب.
 * والساعةُ ساعةُ جدار النادي (الرياض، ‎+03:00‎) تُحوَّل إلى UTC فلا يزيحها جهازُ الزائر؛ والفعاليّةُ بلا ساعةٍ موعدُ يومٍ كامل،
 * وبلا نهايةٍ ساعةٌ واحدة. والنصُّ يُهرَّب بقواعد الملفّ (الفاصلة والفاصلة المنقوطة والشرطة المائلة والسطر).
 */
const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const at = (day: string, time: string) => new Date(`${day}T${time.slice(0, 5)}:00+03:00`);

export function buildIcs(e: { uid: string; title: string; day: string; start: string | null; end: string | null; location?: string | null; url?: string; description?: string | null }): string {
  const when: string[] = [];
  if (e.start) {
    const from = at(e.day, e.start);
    const to = e.end ? at(e.day, e.end) : new Date(from.getTime() + 3_600_000);
    when.push(`DTSTART:${utc(from)}`, `DTEND:${utc(to)}`);
  } else {
    const next = new Date(`${e.day}T12:00:00+03:00`);
    next.setUTCDate(next.getUTCDate() + 1);
    when.push(`DTSTART;VALUE=DATE:${e.day.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, "")}`);
  }
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Adeeb Club//ar", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@adeeb.club`,
    `DTSTAMP:${utc(new Date())}`,
    ...when,
    `SUMMARY:${esc(e.title)}`,
    ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
    ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
    ...(e.url ? [`URL:${e.url}`] : []),
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}

/** يُنزّل الملفَّ في المتصفّح (بضغطة الزائر وحدها) */
export function downloadIcs(name: string, ics: string) {
  const href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = href; a.download = `${name}.ics`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(href);
}
