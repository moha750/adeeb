// معجمُ أحداث الانتخاب — **مَن فعل ماذا**. القاعدةُ تكتب كلَّ فعلٍ في `election_audit_log`
// بفاعله وحمولته، وهذا الملفُّ يترجمه إلى جملةٍ عربيّة. لا يعتمد على شيءٍ خادميّ، فيستورده
// الخادمُ والعميلُ معًا (سابقةُ `vocab.ts`).
//
// **مصدرٌ واحدٌ بصوتين** (أمرُ المالك ٢٠٢٦-٠٨-١٤): الواقعةُ واحدةٌ والمخاطَبُ اثنان، فلا يصحّ
// نصٌّ واحدٌ لهما — سجلُّ الإدارة يتكلّم **عن** المُترشّح («عدّل المُترشّح بيانه»)، ورحلةُ العضو
// تُقرأ **عنه هو** فتبقى مبنيّةً للمجهول («عُدّل بيان الترشّح») وإلّا خاطبته عن نفسه بضمير الغائب.
// والصوتان هنا في ملفٍّ واحدٍ لا في شاشتين، فلا يفترق قولان عن فعلٍ واحد.
//
// ومَن أرادَ ذكرَ صاحبِ الفعل في سجلّ الإدارة ذكرَه في سطر النسبة تحت الجملة («بواسطة فلان»)،
// إلّا حيث يكون المذكورُ **غيرَ الفاعل** (كالمكلَّف على مقعد) فيدخل في متنها.

import { fmtStamp } from "@/lib/dates";
import { ENDED_SHORT, REJECT_SHORT, STALL } from "./reasons";

/** طبيعةُ الحدث — تقول أيقونتَه ونغمتَه، لا نصَّه. */
export type LogKind =
  | "submit" | "edit" | "approve" | "reject" | "withdraw" | "restore"
  | "open" | "close" | "vote" | "win" | "end"
  | "cancel" | "appoint" | "stall" | "clock" | "archive" | "system";

export type LogTone = "warning" | "info" | "success" | "danger" | "neutral";

/** نغمةُ كلِّ طبيعة — الحكمُ على الفعل لا على صاحبه: ما يَبني أخضرُ وما يَنقض أحمر. */
export const KIND_TONE: Record<LogKind, LogTone> = {
  submit: "info",
  edit: "warning",
  approve: "success",
  reject: "danger",
  withdraw: "danger",
  restore: "info",
  open: "info",
  close: "warning",
  vote: "info",
  win: "success",
  end: "neutral",
  cancel: "danger",
  appoint: "warning",
  stall: "warning",
  clock: "neutral",
  archive: "neutral",
  system: "neutral",
};

/** صفٌّ خامٌ من `election_audit_log` كما تُخرجه دوالُّ القاعدة. */
export type LogRow = { event_type: string; payload: Record<string, unknown> | null };

/** لِمَن تُقال الجملة: غرفةُ الإدارة (عن المُترشّح) أو رحلةُ العضو (عن نفسه). */
export type LogAudience = "admin" | "member";

/** ما يحتاجه المتنُ من خارج الحمولة: اسمُ من يُذكَر في الجملة نفسِها (المكلَّف على مقعد). */
export type DescribeOpts = { audience?: LogAudience; personName?: string | null };

/** ما يُفهَم من الحدث: طبيعتُه وجملتُه وملاحظتُه ومَن وقع عليه — ومَن يُطوى فلا يُعرَض. */
export type LogFacts = {
  kind: LogKind;
  label: string;
  note: string | null;
  /** المرشّحُ الذي وقع عليه الفعل (إن كان الحدثُ فعلًا في مرشّح). */
  candidateId: string | null;
  /**
   * حدثٌ لا يُعرَض: توأمٌ لحدثٍ آخر يقول الشيءَ نفسَه (`winner_declared` مع `declare_winner`)،
   * أو أثرٌ آليٌّ لفعلٍ معروضٍ قبله (أرشفةٌ تلقائيّة)، أو ما يمسّ سرّيّةَ الاقتراع (`vote_cast`).
   */
  hidden: boolean;
};

/** الملاحظةُ أو السبب — القاعدةُ تسمّي الحقلَ بأسماءٍ شتّى، والمقروءُ منها واحد. */
function noteOf(p: Record<string, unknown>): string | null {
  const raw = p["note"] ?? p["note_ar"] ?? p["review_note_ar"] ?? p["reason"] ?? p["reason_ar"];
  const s = typeof raw === "string" ? raw.trim() : "";
  return s || null;
}

const facts = (kind: LogKind, label: string, extra?: Partial<LogFacts>): LogFacts =>
  ({ kind, label, note: null, candidateId: null, hidden: false, ...extra });

/**
 * **ما الذي جرى في التعديل** — بيانًا كان أم ملفًّا، ورفعًا أم حذفًا أم استبدالًا. القاعدةُ
 * تسجّله منذ ترحيل `election_log_records_what_changed`، فتقول الشاشةُ الواقعةَ بعينها بدل
 * «عُدّل الترشّح» الصمّاء (طلب المالك ٢٠٢٦-٠٨-١٤).
 *
 * و`null` لصفٍّ **قديمٍ** لا يحمل هذين المفتاحين: التاريخُ لا يُزوَّر بأثرٍ رجعيّ، فيُقال فيه
 * ما كان معلومًا لا ما نظنّه.
 */
function changePhrase(p: Record<string, unknown>, audience: LogAudience): string | null {
  const statement = p["statement_changed"] === true;
  const file = typeof p["file_change"] === "string" ? (p["file_change"] as string) : null;
  if (!statement && (!file || file === "none")) return file === "none" ? (audience === "member" ? "عدّلت الترشّح" : "عُدّل الترشّح") : null;

  // الملفُّ وحده: فعلٌ تامٌّ يُسمّى بحرفه. ومع البيان: يُعطَف فلا يُقال فعلان في سطرين.
  if (!statement) {
    if (audience === "member") {
      return file === "added" ? "رفعت ملفًا انتخابيًّا"
        : file === "removed" ? "حذفت ملفك الانتخابي"
          : "استبدلت ملفك الانتخابي";
    }
    return file === "added" ? "رفع المرشّح ملفّه الانتخابي"
      : file === "removed" ? "حذف المرشّح ملفّه الانتخابي"
        : "استبدل المرشّح ملفّه الانتخابي بملفّ آخر";
  }
  if (audience === "member") {
    if (!file || file === "none") return "عدّلت البيان الانتخابي";
    return file === "added" ? "عدّلت بيانك الانتخابي ورفعت ملفًا انتخابيًّا"
      : file === "removed" ? "عدّلت بيانك الانتخابي وحذفت ملفك الانتخابي"
        : "عدّلت بيانك الانتخابي واستبدلت ملفك الانتخابي";
  }
  if (!file || file === "none") return "عدّل المرشّح بيانه الانتخابي";
  return file === "added" ? "عدّل المرشّح بيانه وملفّه الانتخابي"
    : file === "removed" ? "عدّل المرشّح بيانه وحذف ملفّه الانتخابي"
      : "عدّل المرشّح بيانه واستبدل ملفّه الانتخابي";
}

/**
 * حدثٌ خامٌ من القاعدة ← جملةٌ تُقرأ. والجملةُ **مبنيّةٌ للمجهول بلا فاعلٍ في متنها**: الفاعلُ
 * يُذكَر بجانبها حيث يُذكَر، ويسقط حيث لا يُذكَر، ولا تنكسر في الحالين.
 */
export function describeEvent(row: LogRow, opts: DescribeOpts = {}): LogFacts {
  const audience: LogAudience = opts.audience ?? "member";
  const admin = audience === "admin";
  const p = row.payload ?? {};
  const note = noteOf(p);
  const candidateId = typeof p["candidate_id"] === "string" ? (p["candidate_id"] as string) : null;
  const status = typeof p["new_status"] === "string" ? (p["new_status"] as string) : undefined;
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : null);
  // سببٌ مقنَّنٌ ثمّ ملاحظةُ صاحب القرار: يُقرآن معًا في سطر الملاحظة
  const withCode = (code: string | null) => [code, note].filter(Boolean).join(" ") || null;

  switch (row.event_type) {
    /* ── أفعالٌ في مرشّح ─────────────────────────────────────────────── */
    case "candidacy_submitted":
      return facts("submit", admin ? "تقدّم مرشّح جديد للمقعد" : "تقدّمت للمقعد", { candidateId });
    case "candidate_updated":
      return facts("edit", changePhrase(p, audience) ?? (admin ? "عُدّل الترشّح" : "عدّلت الترشّح"), { candidateId });
    case "candidate_resubmitted": {
      // إعادةُ التقديم بعد «طلب تعديل»: الإدارةُ تُخبَر بما أُصلح (فذلك جوابُ طلبها)، والعضوُ
      // يُقال له الفعلُ مجرَّدًا (أمرُ المالك) — فهو يعلم ما عدّل، وإنّما يُذكَّر بالمحطّة.
      const what = admin ? changePhrase(p, "member") : null;
      return facts("edit", what && what !== "عُدّل الترشّح" ? `أُعيد التقديم، و${what}` : "أُعيد التقديم بعد طلب التعديل", { candidateId });
    }
    case "candidate_withdrawn": return facts("withdraw", admin ? "انسحب المرشّح" : "انسحبت من الترشّح", { candidateId });
    case "candidate_restored": {
      const basis = str("basis");
      const why = basis === "candidate_request" ? "بطلب صاحبه" : basis === "withdrawal_error" ? "لخطأٍ في الانسحاب" : basis === "review_error" ? "لخطأٍ في المراجعة" : null;
      return facts("restore", why ? `أُرجع الترشّح إلى المراجعة ${why}` : "رُدَّ الترشّح إلى المراجعة", { candidateId, note });
    }
    case "candidacy_ended": {
      const why = str("reason");
      return facts("end", admin ? "انتهى الترشّح" : "انتهى ترشّحك", { candidateId, note: why ? ENDED_SHORT[why] ?? null : null });
    }
    case "candidacy_kept_after_move":
      return facts("restore", admin ? "بقي الترشّح بعد نقل منصب صاحبه بغير طلبه" : "بقي ترشّحك بعد نقل منصبك بغير طلبك", { candidateId });

    /* ── التجميد (المادة 16). وطالبُه لا يُذكر للمرشّح: القاعدةُ تنزع `requested_by` من سجلّه ── */
    case "freeze_requested": return facts("stall", "طُلب استبعاد الترشّح، وينتظر موافقة قائد إدارة الموارد البشرية", { candidateId, note });
    case "freeze_declined": return facts("restore", "رُدّ طلب الاستبعاد", { candidateId, note });
    // يسقط الطلبُ إن لم يُوافَق عليه خلال ٢٤ ساعة (الدفعة ٨، ٢٠٢٦-١١-١٩)
    case "freeze_expired": return facts("restore", "سقط طلب الاستبعاد: لم يُوافَق عليه خلال 24 ساعة", { candidateId });
    case "candidate_frozen": {
      const due = fmtStamp(str("answer_due"));
      const label = admin ? "أُمهل المرشّح ليُجيب قبل استبعاده" : "طُلب استبعاد ترشّحك، وبدأت مهلة إجابتك";
      return facts("stall", due ? `${label}، والإجابة قبل ${due}` : label, { candidateId, note });
    }
    case "freeze_answered": {
      const due = fmtStamp(str("decide_due"));
      const label = admin ? "أجاب المرشّح عن طلب الاستبعاد" : "أجبت عن طلب الاستبعاد";
      return facts("submit", due ? `${label}، والقرار قبل ${due}` : label, { candidateId });
    }
    case "freeze_lifted": {
      const out = str("outcome");
      if (out === "auto_lifted") return facts("restore", "بقي الترشّح لمضيّ أجل القرار", { candidateId, note });
      return facts("restore", "بقي الترشّح ولم يُستبعد", { candidateId, note });
    }
    case "candidate_withdrawal_revoked": return facts("restore", "أُلغي السحب، وعاد الترشّح إلى المراجعة", { candidateId, note });
    case "candidate_reviewed":
      if (status === "approved") return facts("approve", admin ? "تمّ اعتماد الترشّح" : "اعتُمد ترشّحك", { candidateId, note });
      // «اعتُذر» لا «رُفض» (المادة 14)، ومعه سببُه من الثلاثة
      if (status === "rejected") {
        const why = str("reject_reason");
        return facts("reject", admin ? "اعتُذر عن الترشّح" : "اعتُذر عن ترشّحك", { candidateId, note: withCode(why ? REJECT_SHORT[why] ?? null : null) });
      }
      if (status === "needs_edit") {
        const due = fmtStamp(str("edit_due"));
        const label = admin ? "طُلب تعديل الترشّح" : "طُلب تعديل ترشّحك";
        return facts("edit", due ? `${label} حتى ${due}` : label, { candidateId, note });
      }
      return facts("edit", admin ? "رُوجِع الترشّح" : "رُوجِع ترشّحك", { candidateId, note });
    // ترشّحٌ رفع وسمَ الانتظار عن مقعدٍ متعثّر — أثرُ «قُدّم الترشّح» نفسِه، فلا يُعاد سطرًا ثانيًا
    case "stall_cleared_by_candidacy": return facts("submit", "عاد المقعد إلى مساره بترشّح", { candidateId, hidden: true });

    /* ── أفعالٌ في الانتخاب نفسِه ────────────────────────────────────── */
    case "election_opened":
    case "election_created": {
      const to = fmtStamp(str("candidacy_end"));
      return facts("open", to ? `فُتح الانتخاب، وباب الترشّح حتى ${to}` : "فُتح الانتخاب");
    }
    case "deadline_changed": {
      const what = p["phase"] === "voting" ? "التصويت" : "باب الترشّح";
      const to = fmtStamp(str("new_end"));
      return facts("clock", to ? `عُدّل موعد إغلاق ${what} إلى ${to}` : `عُدّل موعد إغلاق ${what}`, { note });
    }
    case "candidacy_reopened": {
      const to = fmtStamp(str("new_end") ?? str("candidacy_end"));
      return facts("open", to ? `أُعيد فتح باب الترشّح حتى ${to}` : "أُعيد فتح باب الترشّح", { note });
    }
    case "status_transition": {
      const auto = p["auto"] === true;
      const early = p["early"] === true;
      if (status === "candidacy_open") return facts("open", "أُعيد فتح باب الترشّح", { note });
      if (status === "candidacy_closed") return facts("close", early ? "أُغلق باب الترشّح قبل موعده" : auto ? "أُغلق باب الترشّح في موعده" : "أُغلق باب الترشّح", { note });
      if (status === "voting_open") return facts("vote", "فُتح باب التصويت", { note });
      if (status === "voting_closed") {
        if (p["all_voted"] === true) return facts("close", "أُغلق التصويت: صوّت الجميع");
        if (p["single_left"] === true) return facts("close", "أُغلق التصويت: لم يبقَ إلا مرشّحٌ واحد");
        if (p["none_left"] === true) return facts("close", "أُغلق التصويت: لم يبقَ ترشّحٌ قائم");
        return facts("close", early ? "أُغلق التصويت قبل موعده" : auto ? "أُغلق التصويت في موعده" : "أُغلق باب التصويت", { note });
      }
      return facts("system", "تغيّرت حالة الانتخاب");
    }
    case "votes_voided": {
      const why = str("reason");
      const label = why === "single_left" ? "بطلت الأصوات كلُّها: لم يبقَ إلا مرشّحٌ واحد، فيُعاد تصويتَ ثقة"
        : why === "reopened" ? "بطلت الأصوات كلُّها بإعادة فتح باب الترشّح"
          : "بطلت أصوات من صوّتوا للمرشّح، فيصوّتون من جديد";
      return facts("end", label, { candidateId });
    }
    case "revote_opened": {
      const to = fmtStamp(str("voting_end"));
      const base = p["kind"] === "full" ? "فُتح التصويت من جديد تصويتَ ثقة" : "فُتحت إعادة التصويت لمن بطل صوته";
      return facts("vote", to ? `${base} حتى ${to}` : base, { note });
    }
    case "candidacy_force_closed": return facts("close", "أُغلق باب الترشّح اضطرارًا", { note });
    // المكلَّفُ **ليس فاعلَ الحدث** (الفاعلُ مَن كلّفه)، فاسمُه في متن الجملة لا في سطر النسبة.
    // ويُختصر إلى طرفيه (`firstAndLastOf`) كما في كرت الانتخاب — سطرٌ لا يسع رباعيًّا.
    case "seat_appointed":
      return facts("appoint", opts.personName ? `كُلّف ${opts.personName} بالمقعد` : "كُلّف شاغلٌ للمقعد", { note });
    case "declare_winner": return facts("win", "أُعلن الفائز", { candidateId });
    // الإعلانُ الآليّ لحظة الإغلاق (المادة 28)، وكيف حُسم
    case "winner_declared_auto": {
      const how = str("how") ?? "top";
      const label = how === "after_27" ? "أُعلن الفائز بعد حسم مقاعد القسم"
        : how === "tie_majority" ? "أُعلن الفائز بأغلبيّة المجلس الإداري في التعادل"
          : how === "tie_president" ? "أُعلن الفائز بترجيح رئيس أدِيب في التعادل"
            : how === "tie_earliest" ? "أُعلن الفائز بالأسبقيّة في الترشّح بعد التعادل"
              : "أُعلن الفائز";
      return facts("win", label, { candidateId });
    }
    case "completed_by_appointment":
      return facts("appoint", opts.personName ? `عُيّن ${opts.personName} في المقعد المتعثّر` : "عُيّن شاغلٌ في المقعد المتعثّر", { note });

    /* ── التعادل (المادة 26) ─────────────────────────────────────────── */
    case "tie_opened": return facts("stall", "تعادل المتصدّرون، والقرار للمجلس الإداري خلال 24 ساعة");
    case "tie_choice":
      return facts("vote", p["deferred"] === true ? "ترك عضوٌ في المجلس الأمرَ للأسبق ترشّحًا" : "اختار عضوٌ في المجلس في التعادل", { candidateId, note });
    case "tie_decided": {
      const out = str("outcome");
      const label = out === "majority" ? "حُسم التعادل بأغلبيّة المجلس الإداري"
        : out === "president" ? "حُسم التعادل بترجيح رئيس أدِيب"
          : "حُسم التعادل بالأسبقيّة في الترشّح";
      // الإعلانُ يُكتب في سطره بعد هذا، فيكفي هذا السطرُ قولَ كيف حُسم
      return facts("win", label, { candidateId });
    }
    case "resolve_failed": return facts("system", "تعذّر الإعلان الآليّ، ويُعاد في الدورة التالية", { hidden: !admin });
    // توأمُ الإعلان: تريغرُ الإسناد يكتب سطرًا ثانيًا للفعل نفسِه، فيُطوى ولا يُقال مرّتين
    case "winner_declared": return facts("win", "أُسند المقعد للفائز", { hidden: true });
    case "cancelled": {
      const basis = str("basis");
      return facts("cancel", basis === "stalled" ? "أُلغي الانتخاب لتعثّره" : basis === "defect" ? "أُلغي الانتخاب لخللٍ يمسّ صحّته" : "أُلغي الانتخاب", { note });
    }
    // الأرشفةُ التلقائيّة أثرُ الإعلان لا قرارًا مستقلًّا — تُطوى، وتُعرَض إن كانت بيد أحد
    case "archived": return facts("archive", "أُرشف الانتخاب", { hidden: p["auto"] === true });

    /* ── ما تفعله الكنّاسة بلا فاعل ──────────────────────────────────── */
    case "candidacy_stalled":
      return facts("stall", p["after_close"] === true ? `تعثّر المقعد: ${STALL.no_live_after_close}` : `تعثّر المقعد: ${STALL.no_candidates}`);
    case "election_stalled": {
      const why = str("reason");
      return facts("stall", why && STALL[why] ? `تعثّر المقعد: ${STALL[why]}` : "تعثّر المقعد");
    }
    case "seat_preference_set": return facts("system", admin ? "سجّل المرشّح أفضليّته بين مقاعد القسم" : "سجّلت أفضليّتك بين مقاعد القسم", { hidden: true });
    // حصادُ الكنّاسة صفٌّ عامٌّ بلا انتخاب، فلا يُعرض في سجلّ مقعد
    case "sweep_deadlines": return facts("system", "مرّت الكنّاسة", { hidden: true });
    case "candidacy_auto_extended": return facts("clock", "مُدّدت مهلة الترشّح تلقائيًّا");
    case "election_auto_cancelled_no_competition": return facts("cancel", "أُلغي الانتخاب تلقائيًّا: لا منافسة");

    /* ── الاقتراعُ سرٌّ ───────────────────────────────────────────────
       صوتُ الناخب مكتوبٌ في السجلّ باسمه، وعرضُه يكشف مَن اقترع ومتى. والسرّيّةُ وعدٌ
       قطعناه للناخب («سرّيّ ونهائيّ»)، فلا يُنقَض في شاشةِ سجلّ. والمشاركةُ تُقاس عددًا
       في لوحة الانتخاب لا اسمًا في سطر. */
    case "vote_cast": return facts("vote", "أُدلي بصوت", { hidden: true });

    default: return facts("system", row.event_type);
  }
}
