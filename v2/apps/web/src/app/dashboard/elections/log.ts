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
    return file === "added" ? "رفع المُترشّح ملفه الانتخابي"
      : file === "removed" ? "حذف المُترشّح ملفه الانتخابي"
        : "استبدل المُترشّح ملفه الانتخابي بملف آخر";
  }
  if (audience === "member") {
    if (!file || file === "none") return "عدّلت البيان الانتخابي";
    return file === "added" ? "عدّلت بيانك الانتخابي ورفعت ملفًا انتخابيًّا"
      : file === "removed" ? "عدّلت بيانك الانتخابي وحذفت ملفك الانتخابي"
        : "عدّلت بيانك الانتخابي واستبدلت ملفك الانتخابي";
  }
  if (!file || file === "none") return "عدّل المُترشّح بيانه الانتخابي";
  return file === "added" ? "عدّل المُترشّح بيانه وملفه الانتخابي"
    : file === "removed" ? "عدّل المُترشّح بيانه وحذف ملفه الانتخابي"
      : "عدّل المُترشّح بيانه واستبدل ملفه الانتخابي";
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

  switch (row.event_type) {
    /* ── أفعالٌ في مرشّح ─────────────────────────────────────────────── */
    case "candidacy_submitted":
      return facts("submit", admin ? "تقدّم مُترشّح جديد للمنصب" : "تقدّمت للمنصب", { candidateId });
    case "candidate_updated":
      return facts("edit", changePhrase(p, audience) ?? (admin ? "عُدّل الترشّح" : "عدّلت الترشّح"), { candidateId });
    case "candidate_resubmitted": {
      // إعادةُ التقديم بعد «طلب تعديل»: الإدارةُ تُخبَر بما أُصلح (فذلك جوابُ طلبها)، والعضوُ
      // يُقال له الفعلُ مجرَّدًا (أمرُ المالك) — فهو يعلم ما عدّل، وإنّما يُذكَّر بالمحطّة.
      const what = admin ? changePhrase(p, "member") : null;
      return facts("edit", what && what !== "عُدّل الترشّح" ? `أُعيد التقديم، و${what}` : "أُعيد التقديم بعد طلب التعديل", { candidateId });
    }
    case "candidate_withdrawn": return facts("withdraw", admin ? "المُترشّح سحب نفسه" : "سحبت ترشّحك", { candidateId });
    case "candidate_restored": return facts("restore", "رُدَّ الترشّح إلى المراجعة", { candidateId, note });
    case "candidate_withdrawal_revoked": return facts("restore", "أُلغي السحب، وعاد الترشّح إلى المراجعة", { candidateId, note });
    case "candidate_reviewed":
      if (status === "approved") return facts("approve", admin ? "تمّ اعتماد الترشّح" : "اعتُمد ترشّحك", { candidateId, note });
      if (status === "rejected") return facts("reject", admin ? "رُفض الترشّح" : "رُفض ترشّحك", { candidateId, note });
      if (status === "needs_edit") return facts("edit", admin ? "طُلب تعديل الترشّح" : "الإدارة طلبت تعديل ترشّحك", { candidateId, note });
      return facts("edit", admin ? "رُوجِع الترشّح" : "رُوجِع ترشّحك", { candidateId, note });
    // ترشّحٌ رفع وسمَ الانتظار عن مقعدٍ متعثّر — أثرُ «قُدّم الترشّح» نفسِه، فلا يُعاد سطرًا ثانيًا
    case "stall_cleared_by_candidacy": return facts("submit", "عاد المقعد إلى مساره بترشّح", { candidateId, hidden: true });

    /* ── أفعالٌ في الانتخاب نفسِه ────────────────────────────────────── */
    case "status_transition":
      if (status === "candidacy_open") return facts("open", "أُعيد فتح باب الترشّح");
      if (status === "candidacy_closed") return facts("close", "أُغلق باب الترشّح");
      if (status === "voting_open") return facts("vote", "فُتح باب التصويت");
      if (status === "voting_closed") return facts("close", "أُغلق باب التصويت");
      return facts("system", "تغيّرت حالة الانتخاب");
    case "candidacy_force_closed": return facts("close", "أُغلق باب الترشّح اضطرارًا", { note });
    // المكلَّفُ **ليس فاعلَ الحدث** (الفاعلُ مَن كلّفه)، فاسمُه في متن الجملة لا في سطر النسبة.
    // ويُختصر إلى طرفيه (`firstAndLastOf`) كما في كرت الانتخاب — سطرٌ لا يسع رباعيًّا.
    case "seat_appointed":
      return facts("appoint", opts.personName ? `كُلّف ${opts.personName} للمنصب` : "كُلّف شاغلٌ للمقعد", { note });
    case "declare_winner": return facts("win", "أُعلن الفائز", { candidateId });
    // توأمُ الإعلان: تريغرُ الإسناد يكتب سطرًا ثانيًا للفعل نفسِه، فيُطوى ولا يُقال مرّتين
    case "winner_declared": return facts("win", "أُسنِد المنصب للفائز", { hidden: true });
    case "cancelled": return facts("cancel", "أُلغي الانتخاب", { note });
    // الأرشفةُ التلقائيّة أثرُ الإعلان لا قرارًا مستقلًّا — تُطوى، وتُعرَض إن كانت بيد أحد
    case "archived": return facts("archive", "أُرشف الانتخاب", { hidden: p["auto"] === true });

    /* ── ما تفعله الكنّاسة بلا فاعل ──────────────────────────────────── */
    case "candidacy_stalled": return facts("stall", "انقضت المهلة ولا مرشّح");
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
