import "server-only";
import { pushToUsers } from "@/lib/push/send";
import { catalogEntries, kindOf, type Audience } from "./catalog";
import { chunks, notificationsDb, type NotificationsDb } from "./db";
import { enqueueEmail } from "@/lib/email/outbox";
import { renderNote } from "./render";
import type { Gender } from "./types";

/**
 * **الموزِّع** — يأخذ الوقائع من طابورها، ويقرأ الدليل، ويحوّل العناوين إلى أشخاص، ويكتب صفوفَ
 * الصندوق، ثمّ يُرسِل للقنوات بحسب الدرجة (`v2/NOTIFICATIONS-SYSTEM.md` §٤).
 *
 * ## من يناديه
 * الإجراءُ الخادميّ بعد ردّه (`kickDispatch` في `emit.ts`)، ومنفذُ الاستنزاف `/api/notifications/drain`
 * للوقائع التي تولد في المهامّ المجدولة. والمطالبةُ ذرّيّةٌ في القاعدة، فمناديان متزامنان لا يوزّعان
 * الواقعةَ مرّتين.
 *
 * ## لا يطالب إلّا بما يعرفه، والفاشلُ يُمهَل
 * يمرّر مفاتيحَ دليله إلى المطالبة، فواقعةٌ من نوعٍ لم يُنشَر مدخلُه بعد (الترحيلُ يسبق الكودَ عندنا)
 * تبقى في الطابور سالمةً حتّى يُنشَر. والواقعةُ التي تسقط تبقى مُطالَبةً فلا تُعاد قبل خمس دقائق:
 * عطلٌ عابرٌ لا يأكل المحاولاتِ الخمسَ في ثوانٍ (من المراجعة المستقلّة، ٢٠٢٦-١٠-١٠).
 *
 * ## الترتيبُ مقصود
 * الصندوقُ أوّلًا ثمّ «وُزِّعت» ثمّ القنوات. فإن سقط شيءٌ قبل «وُزِّعت» أُعيدت الواقعةُ كلُّها
 * (والصفوفُ المكتوبة لا تتكرّر: `notification_inbox_once`)، ولم تُرسَل شاشةُ قفلٍ بعد فلا تتكرّر
 * هي كذلك. وما بعد «وُزِّعت» قنواتٌ: فشلُها يُسجَّل ولا يُعيد التوزيع.
 */

type EventRow = {
  id: number;
  kind: string;
  facts: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
};

export type DispatchOutcome = { events: number; recipients: number; failed: number };

export async function dispatchPending(limit = 20): Promise<DispatchOutcome> {
  const sb = notificationsDb();
  const kinds = catalogEntries().map(([key]) => key);
  if (!sb || kinds.length === 0) return { events: 0, recipients: 0, failed: 0 };

  const { data, error } = await sb.rpc("claim_notification_events", { p_kinds: kinds, p_limit: limit });
  if (error) {
    console.error("[notifications] claim failed", { error: error.message });
    return { events: 0, recipients: 0, failed: 0 };
  }
  const events = (data ?? []) as EventRow[];
  let recipients = 0;
  let failed = 0;
  for (const ev of events) {
    const n = await dispatchOne(sb, ev);
    if (n === null) failed++;
    else recipients += n;
  }
  return { events: events.length, recipients, failed };
}

/** يرجع عددَ المستلمين، أو `null` إن سقطت الواقعة. */
async function dispatchOne(sb: NotificationsDb, ev: EventRow): Promise<number | null> {
  const kind = kindOf(ev.kind);
  if (!kind) {
    // لا يقع: المطالبةُ لا تأخذ إلّا ما في الدليل. فإن وقع تُركت الواقعةُ مُطالَبةً بخطئها (تُعاد بعد
    // خمس دقائق) ولا تُقتَل: موزِّعٌ يعرفها قد يكون في الطريق.
    await sb.from("notification_events").update({ error: `unknown kind: ${ev.kind}` }).eq("id", ev.id);
    return null;
  }

  try {
    const at = new Date(ev.created_at);
    const seen = new Set<string>();
    const groups: Array<{ audience: Audience<unknown>; users: string[] }> = [];
    const rows: Array<{ event_id: number; user_id: string; audience: string; expires_at: string | null }> = [];

    for (const audience of kind.audiences) {
      const to = audience.to(ev.facts);
      if (to.length === 0) continue;
      const { data, error } = await sb.rpc("notification_recipients", { p_to: to });
      if (error) throw new Error(`recipients(${audience.key}): ${error.message}`);
      // من طابقه مخاطَبان يصله إشعارٌ واحد بنصّ الأوّل، والفاعلُ لا يُشعَر بفعله إلّا أن يُقال.
      const users = [...new Set((data ?? []) as string[])].filter(
        (id) => !seen.has(id) && (audience.includeActor || id !== ev.actor_id),
      );
      if (users.length === 0) continue;
      users.forEach((id) => seen.add(id));
      const expires = audience.expires?.(ev.facts, at)?.toISOString() ?? null;
      for (const user_id of users) rows.push({ event_id: ev.id, user_id, audience: audience.key, expires_at: expires });
      groups.push({ audience, users });
    }

    for (const part of chunks(rows, 500)) {
      const { error } = await sb
        .from("notification_inbox")
        .upsert(part, { onConflict: "event_id,user_id", ignoreDuplicates: true });
      if (error) throw new Error(`inbox: ${error.message}`);
    }

    // العنوانُ الاحتياطيّ من المخاطَب الأوّل بلا جنس: يُعرَض إن حُذف النوعُ من الدليل يومًا.
    const first = kind.audiences[0];
    const fallback = first ? renderNote(ev.kind, first.key, ev.facts, null).title : null;
    const { error: doneErr } = await sb
      .from("notification_events")
      .update({ dispatched_at: new Date().toISOString(), recipients: rows.length, error: null, fallback })
      .eq("id", ev.id);
    if (doneErr) throw new Error(`mark: ${doneErr.message}`);

    for (const g of groups) {
      if (g.audience.level === "normal") continue;
      await pushGroup(sb, ev, g.audience, g.users).catch((e: unknown) =>
        console.error("[notifications] push failed", { event: ev.id, error: e instanceof Error ? e.message : String(e) }),
      );
    }
    for (const g of groups) {
      if (!g.audience.email) continue;
      await emailGroup(sb, ev, g.audience, g.users).catch((e: unknown) =>
        console.error("[notifications] email failed", { event: ev.id, error: e instanceof Error ? e.message : String(e) }),
      );
    }
    return rows.length;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // تبقى مُطالَبةً (`claimed_at` من المطالبة نفسِها): لا تُعاد قبل خمس دقائق.
    await sb.from("notification_events").update({ error: message.slice(0, 500) }).eq("id", ev.id);
    console.error("[notifications] dispatch failed", { event: ev.id, kind: ev.kind, error: message });
    return null;
  }
}

/**
 * **شاشةُ القفل** — النصُّ بجنس قارئه، فالمستلمون يُقسَمون بجنسهم ويُرسَل لكلّ قسمٍ نصُّه.
 * والوسمُ معرّفُ الواقعة: إشعارٌ واحدٌ على الشاشة لا يتكرّر. والحرِجُ عاجلٌ (`high`).
 *
 * **وشاشةُ القفل محاولةٌ واحدةٌ لا تُعاد**: الصندوقُ هو السجلّ، وما فات الشاشةَ يُقرأ في الجرس.
 * و`pushed_at` يُكتب حين بلغ الإرسالُ جهازًا واحدًا على الأقلّ من قسم الجنس، فهو تقريبٌ للقسم لا
 * شهادةٌ لكلّ فرد (`pushToUsers` يعدّ ولا يسمّي). وفارغٌ = لم يصل شيء (لا جهاز، أو فشل).
 */
async function pushGroup(sb: NotificationsDb, ev: EventRow, audience: Audience<unknown>, users: string[]) {
  const genders = new Map<string, Gender>();
  for (const part of chunks(users, 200)) {
    const { data } = await sb.from("profiles").select("id, gender").in("id", part);
    for (const p of (data ?? []) as Array<{ id: string; gender: string | null }>) {
      genders.set(p.id, p.gender === "female" ? "female" : p.gender === "male" ? "male" : null);
    }
  }
  const byGender = new Map<Gender, string[]>();
  for (const id of users) {
    const g = genders.get(id) ?? null;
    byGender.set(g, [...(byGender.get(g) ?? []), id]);
  }

  for (const [gender, ids] of byGender) {
    const note = renderNote(ev.kind, audience.key, ev.facts, gender);
    const out = await pushToUsers(
      ids,
      { title: note.title, body: note.body ?? "", url: note.href ?? "/", tag: `n${ev.id}` },
      { urgency: audience.level === "critical" ? "high" : "normal" },
    );
    if (out.unconfigured) return;
    if (out.failed) console.error("[notifications] push partly failed", { event: ev.id, ...out });
    if (out.sent === 0) continue;
    const now = new Date().toISOString();
    for (const part of chunks(ids, 200)) {
      await sb.from("notification_inbox").update({ pushed_at: now }).eq("event_id", ev.id).in("user_id", part);
    }
  }
}

/**
 * **البريد** (٢٠٢٦-١٠-١٧) — لمخاطَبٍ دليلُه يقول `email: true`. رسالةٌ لكلّ مستلمٍ بنصّه وجنسه، تُكتب
 * في صادر البريد (`email_outbox`) ويرسلها مُرسِلُه بإعاداته وسجلّه (`v2/EMAIL-SYSTEM.md`). فهذه
 * القناةُ لا تعرف المزوّد ولا تنتظره.
 *
 * ومفتاحُ التكرار من الواقعة والمخاطَب والمستلم: إعادةُ التوزيع بعد عطلٍ لا تُضاعف رسالة. وأجلُها
 * يومان من الواقعة: بريدٌ يصل بعدهما يكذب على قارئه («أُسند إليك» لمنصبٍ ربما نُزع بعدها)، والجرسُ
 * يحفظ الخبر. ومن لا بريدَ في ملفّه يُتخطّى.
 */
async function emailGroup(sb: NotificationsDb, ev: EventRow, audience: Audience<unknown>, users: string[]) {
  const expires = new Date(new Date(ev.created_at).getTime() + 48 * 3600_000);
  if (expires.getTime() <= Date.now()) return;

  for (const part of chunks(users, 200)) {
    const { data } = await sb.from("profiles").select("id, email, gender").in("id", part);
    for (const p of (data ?? []) as Array<{ id: string; email: string | null; gender: string | null }>) {
      const to = p.email?.trim();
      if (!to) continue;
      const gender: Gender = p.gender === "female" ? "female" : p.gender === "male" ? "male" : null;
      const note = renderNote(ev.kind, audience.key, ev.facts, gender);
      await enqueueEmail("notify.note", to, { title: note.title, body: note.body, href: note.href }, {
        user: p.id,
        dedupe: `n${ev.id}:${audience.key}:${p.id}`,
        expires,
      });
    }
  }
}
