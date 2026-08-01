// حالة باب التسجيل — منطقٌ نقيٌّ واحد يفكّ إعدادات membership_settings، يستورده الخادم والعميل.
// لا تعتمد على شيء خادميّ ولا على الوقت الضمنيّ: الوقت يُمرَّر (now) فتبقى الدالّة نقيّةً قابلةً للاختبار.

/** شكل الإعدادات المقروء من membership_settings (الصفّ الوحيد 'default'). */
export interface RegistrationSettings {
  join_open: boolean | null;
  join_membership_countdown: boolean | null;
  join_schedule_enabled: boolean | null;
  /** 'range' = نافذة بين فتحٍ وإغلاق · 'close_only' = مفتوح حتّى موعد الإغلاق فقط. */
  join_schedule_mode: string | null;
  join_schedule_open_at: string | null;
  join_schedule_close_at: string | null;
  join_closed_title: string | null;
  join_closed_message: string | null;
  join_closed_button_text: string | null;
  cycle_title: string | null;
}

/**
 * هل الباب العامّ مفتوح الآن؟ — البوّابة اليدويّة (join_open) تحكم أوّلًا، ثمّ الجدولة إن فُعّلت.
 * قناة الدعوة الخاصّة (?invite=CODE) لا تمرّ من هنا: تُصدَّق عبر validate_invitation وتتجاوز الإغلاق العامّ.
 */
export function isRegistrationOpen(s: RegistrationSettings, now: Date): boolean {
  if (!s.join_open) return false;
  if (!s.join_schedule_enabled) return true;

  const open = s.join_schedule_open_at ? new Date(s.join_schedule_open_at) : null;
  const close = s.join_schedule_close_at ? new Date(s.join_schedule_close_at) : null;

  if (s.join_schedule_mode === "range") {
    if (open && now < open) return false; // لم يحن موعد الفتح بعد
    if (close && now >= close) return false; // انقضى موعد الإغلاق
    return true;
  }

  // 'close_only' (وأيّ وضعٍ آخر احتياطًا): مفتوحٌ حتّى موعد الإغلاق إن وُجد
  if (close && now >= close) return false;
  return true;
}

/** موعد الفتح القادم للعدّاد التنازليّ — يُعرض في شاشة الإغلاق فقط إن كان في المستقبل. */
export function nextOpenAt(s: RegistrationSettings, now: Date): Date | null {
  if (!s.join_membership_countdown || !s.join_schedule_open_at) return null;
  const open = new Date(s.join_schedule_open_at);
  return open > now ? open : null;
}
