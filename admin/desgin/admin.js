// Admin Panel Logic (moved under /admin)
// - Stores data in localStorage under keys: adeeb_works, adeeb_sponsors, adeeb_board
// - Provides basic CRUD via <dialog> forms
// - Export/Import JSON of all data

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // List container elements (must be declared before attaching listeners)
  const worksList = $('#worksList');
  const sponsorsList = $('#sponsorsList');
  const achievementsList = $('#achievementsList');
  const boardList = $('#boardList');
  const membersList = $('#membersList');
  const faqList = $('#faqList');
  const testimonialsList = $('#testimonialsList');
  const formsList = $('#formsList');
  const todosList = $('#todosList');
  const statsGrid = $('#statsGrid');
  const joinStatusLabel = document.getElementById('joinStatusLabel');
  const toggleJoinBtn = document.getElementById('toggleJoinBtn');
  const joinStatusInline = document.getElementById('joinStatusInline');
  const joinSettingsForm = document.getElementById('joinSettingsForm');
  const joinOpenCheckbox = document.getElementById('joinOpenCheckbox');
  const joinControlTypeManual = document.getElementById('joinControlTypeManual');
  const joinControlTypeSchedule = document.getElementById('joinControlTypeSchedule');
  const joinManualGroup = document.getElementById('joinManualGroup');
  const joinScheduleGroup = document.getElementById('joinScheduleGroup');
  const joinScheduleOpenAt = document.getElementById('joinScheduleOpenAt');
  const joinScheduleCloseAt = document.getElementById('joinScheduleCloseAt');
  const joinScheduleModeRange = document.getElementById('joinScheduleModeRange');
  const joinScheduleModeOpenOnly = document.getElementById('joinScheduleModeOpenOnly');
  const joinScheduleModeCloseOnly = document.getElementById('joinScheduleModeCloseOnly');
  const joinClosedTitleInput = document.getElementById('joinClosedTitle');
  const joinClosedMessageInput = document.getElementById('joinClosedMessage');
  const joinClosedButtonInput = document.getElementById('joinClosedButtonText');
  const joinOpenToggleLabel = document.querySelector('#joinManualGroup .toggle-label');
  const joinMembershipCountdown = document.getElementById('joinMembershipCountdown');
  const joinSettingsMsg = document.getElementById('joinSettingsMsg');
  const DEFAULT_JOIN_CLOSED_TITLE = 'التسجيل مغلق';
  const DEFAULT_JOIN_CLOSED_MESSAGE = 'باب التسجيل مغلق حاليًا. تابعنا على منصاتنا لمعرفة موعد الفتح القادم.';
  const DEFAULT_JOIN_CLOSED_BUTTON = 'حسناً';
  const previewClosedMsgBtn = document.getElementById('previewClosedMsgBtn');
  const joinSummaryState = document.getElementById('joinSummaryState');
  const joinSummaryControl = document.getElementById('joinSummaryControl');
  const joinSummaryMode = document.getElementById('joinSummaryMode');
  const joinSummaryTimes = document.getElementById('joinSummaryTimes');
  const joinSummaryTitle = document.getElementById('joinSummaryTitle');
  const joinSummaryMessage = document.getElementById('joinSummaryMessage');
  const joinSummaryButtonText = document.getElementById('joinSummaryButtonText');
  const joinSummaryCountdown = document.getElementById('joinSummaryCountdown');
  const joinTimezoneEl = document.getElementById('joinTimezone');
  // Join hero countdown elements
  const joinCountdownLabel = document.getElementById('joinCountdownLabel');
  const cdDays = document.getElementById('cdDays');
  const cdHours = document.getElementById('cdHours');
  const cdMinutes = document.getElementById('cdMinutes');
  const cdSeconds = document.getElementById('cdSeconds');
  const membershipAppsTableBody = document.getElementById('membershipAppsTableBody');
  const membershipAppsEmpty = document.getElementById('membershipAppsEmpty');
  const membershipRefreshBtn = document.getElementById('membershipRefreshBtn');
  const membershipAppDetailsDialog = document.getElementById('membershipAppDetailsDialog');
  const membershipStatsGrid = document.getElementById('membershipStatsGrid');
  const membershipAppsGroups = document.getElementById('membershipAppsGroups');
  const membershipAppDetailsName = document.getElementById('membershipAppDetailsName');
  const membershipAppDetailsDate = document.getElementById('membershipAppDetailsDate');
  const membershipAppDetailsPhone = document.getElementById('membershipAppDetailsPhone');
  const membershipAppDetailsEmail = document.getElementById('membershipAppDetailsEmail');
  const membershipAppDetailsDegree = document.getElementById('membershipAppDetailsDegree');
  const membershipAppDetailsCollege = document.getElementById('membershipAppDetailsCollege');
  const membershipAppDetailsMajor = document.getElementById('membershipAppDetailsMajor');
  const membershipAppDetailsCommittee = document.getElementById('membershipAppDetailsCommittee');
  const membershipAppDetailsSkills = document.getElementById('membershipAppDetailsSkills');
  const membershipAppDetailsPortfolio = document.getElementById('membershipAppDetailsPortfolio');
  const membershipAppDetailsStatus = document.getElementById('membershipAppDetailsStatus');
  const membershipAppDetailsTwitter = document.getElementById('membershipAppDetailsTwitter');
  const membershipAppDetailsInstagram = document.getElementById('membershipAppDetailsInstagram');
  const membershipAppDetailsLinkedin = document.getElementById('membershipAppDetailsLinkedin');
  const membershipAppStatusSelect = document.getElementById('membershipAppStatusSelect');
  const membershipAppDetailsAbout = document.getElementById('membershipAppDetailsAbout');
  const membershipAppAdminNote = document.getElementById('membershipAppAdminNote');
  const membershipAppAdminNoteSave = document.getElementById('membershipAppAdminNoteSave');
  const membershipAppAdminNoteStatus = document.getElementById('membershipAppAdminNoteStatus');
  const membershipAppAdminNoteAuthor = document.getElementById('membershipAppAdminNoteAuthor');
  const membershipAppNotesList = document.getElementById('membershipAppNotesList');
  const membershipAppNotesCount = document.getElementById('membershipAppNotesCount');
  const membershipAppNoteInput = document.getElementById('membershipAppNoteInput');
  const membershipAppNoteAdd = document.getElementById('membershipAppNoteAdd');
  const membershipAppNotesStatus = document.getElementById('membershipAppNotesStatus');
  const membershipFilters = document.getElementById('membershipFilters');
  const membershipFilterName = document.getElementById('membershipFilterName');
  const membershipFilterStatus = document.getElementById('membershipFilterStatus');
  const membershipFilterPctBand = document.getElementById('membershipFilterPctBand');
  const membershipFilterCommittee = document.getElementById('membershipFilterCommittee');
  const membershipFiltersClear = document.getElementById('membershipFiltersClear');
  const membershipExportBtn = document.getElementById('membershipExportBtn');
  const membershipExportDialog = document.getElementById('membershipExportDialog');
  const membershipExportForm = document.getElementById('membershipExportForm');
  const membershipExportCommittee = document.getElementById('membershipExportCommittee');
  const membershipExportFields = document.getElementById('membershipExportFields');
  // Idea Board (admin) elements
  const ideaBoardTableBody = document.getElementById('ideaBoardTableBody');
  const ideaBoardEmpty = document.getElementById('ideaBoardEmpty');
  const ideaBoardRefreshBtn = document.getElementById('ideaBoardRefreshBtn');
  const ideaBoardList = document.getElementById('ideaBoardList');
  // Idea Details dialog elements
  const ideaDetailsDialog = document.getElementById('ideaDetailsDialog');
  const ideaDetailsTitle = document.getElementById('ideaDetailsTitle');
  const ideaDetailsAuthor = document.getElementById('ideaDetailsAuthor');
  const ideaDetailsDate = document.getElementById('ideaDetailsDate');
  const ideaDetailsTopic = document.getElementById('ideaDetailsTopic');
  const ideaDetailsContent = document.getElementById('ideaDetailsContent');
  const ideaPinToggleBtn = document.getElementById('ideaPinToggleBtn');
  const ideaVisToggleBtn = document.getElementById('ideaVisToggleBtn');
  const ideaDeleteBtn = document.getElementById('ideaDeleteBtn');
  // Idea Topics (admin)
  const ideaTopicsList = document.getElementById('ideaTopicsList');
  const ideaTopicsEmpty = document.getElementById('ideaTopicsEmpty');
  const ideaTopicsRefreshBtn = document.getElementById('ideaTopicsRefreshBtn');
  const addTopicBtn = document.getElementById('addTopicBtn');
  const topicDialog = document.getElementById('topicDialog');
  const topicForm = document.getElementById('topicForm');
  const topicTitleInput = document.getElementById('topicTitle');
  const topicDescInput = document.getElementById('topicDesc');
  const topicImageFileInput = document.getElementById('topicImageFile');
  const topicImagePreview = document.getElementById('topicImagePreview');
  const topicImagePreviewWrap = document.getElementById('topicImagePreviewWrap');
  const topicClearImageBtn = document.getElementById('topicClearImageBtn');
  const topicVisibleInput = document.getElementById('topicVisible');
  // Schedule elements
  const calendarGrid = $('#calendarGrid');
  const calendarDaysHead = $('#calendarDaysHead');
  const calMonthLabel = $('#calMonthLabel');
  const calPrevBtn = $('#calPrevBtn');
  const calNextBtn = $('#calNextBtn');
  const calTodayBtn = $('#calTodayBtn');
  const calIntlBtn = $('#calIntlBtn');
  const intlDaysSection = document.getElementById('intlDaysSection');
  const intlDaysTableBody = document.getElementById('intlDaysTableBody');
  const intlAddCustomBtn = document.getElementById('intlAddCustomBtn');
  const intlCustomDialog = document.getElementById('intlCustomDialog');
  const intlCustomForm = document.getElementById('intlCustomForm');
  const intlCustomDate = document.getElementById('intlCustomDate');
  const intlCustomTitle = document.getElementById('intlCustomTitle');

  // Chat elements
  const chatContactsEl = document.getElementById('chatContacts');
  const chatSearchInput = document.getElementById('chatSearch');
  const chatMessagesEl = document.getElementById('chatMessages');
  const chatComposerForm = document.getElementById('chatComposer');
  const chatInputEl = document.getElementById('chatInput');
  const chatPeerAvatar = document.getElementById('chatPeerAvatar');
  const chatPartnerName = document.getElementById('chatPartnerName');
  const chatPeerMeta = document.getElementById('chatPeerMeta');
  const chatFiltersEl = document.getElementById('chatFilters');
  const chatNoContactsEl = document.getElementById('chatNoContacts');
  const chatTypingEl = document.getElementById('chatTyping');
  const chatLoadMoreBtn = document.getElementById('chatLoadMore');
  const chatEmptyEl = document.getElementById('chatEmpty');
  const chatScrollBottomBtn = document.getElementById('chatScrollBottom');

  // Appointments elements
  const appointmentsList = document.getElementById('appointmentsList');
  const addAppointmentBtn = document.getElementById('addAppointmentBtn');
  const appointmentDialog = document.getElementById('appointmentDialog');
  const appointmentForm = document.getElementById('appointmentForm');
  const appointmentSlots = document.getElementById('appointmentSlots');
  const addSlotBtn = document.getElementById('addSlotBtn');
  const bookingsPanel = document.getElementById('bookingsPanel');
  const bookingAppointmentSelect = document.getElementById('bookingAppointmentSelect');
  const bookingsRefreshBtn = document.getElementById('bookingsRefreshBtn');
  const bookingsExportBtn = document.getElementById('bookingsExportBtn');
  const bookingsCards = document.getElementById('bookingsCards');
  const bookingsEmpty = document.getElementById('bookingsEmpty');

  const KEYS = {
    works: 'adeeb_works',
    sponsors: 'adeeb_sponsors',
    board: 'adeeb_board',
    members: 'adeeb_members',
    faq: 'adeeb_faq',
    achievements: 'adeeb_achievements',
    schedule: 'adeeb_schedule',
    todos: 'adeeb_todos',
    ideas: 'adeeb_ideas_public',
    topics: 'adeeb_idea_topics',
    testimonials: 'adeeb_testimonials',
    membership_apps: 'adeeb_membership_applications',
    appointments: 'adeeb_appointments',
    appointment_bookings: 'adeeb_appointment_bookings',
    settings: 'adeeb_settings',
  };

  // Supabase client (if configured)
  const sb = window.sbClient || null;
  let membershipAppDetailsIndex = -1;

  function siteSettingsGet() {
    try {
      const raw = localStorage.getItem(KEYS.settings);
      const obj = raw ? JSON.parse(raw) : {};
      return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
    } catch { return {}; }
  }

  async function markBookingCompleted(id, done) {
    if (!id) return false;
    if (sb) {
      // Try updating multiple possible columns to maximize compatibility
      try {
        const payload = { is_completed: !!done, status: done ? 'done' : 'pending', completed_at: done ? (new Date()).toISOString() : null };
        let res = await sb.from('appointment_bookings').update(payload).eq('id', id);
        if (res.error) {
          const msg = (res.error.message || '').toLowerCase();
          // Retry with minimal payloads if some columns don't exist
          if (/column|unknown/.test(msg)) {
            res = await sb.from('appointment_bookings').update({ status: done ? 'done' : 'pending' }).eq('id', id);
            if (res.error) {
              res = await sb.from('appointment_bookings').update({ is_completed: !!done }).eq('id', id);
              if (res.error) throw res.error;
            }
          } else {
            throw res.error;
          }
        }
        return true;
      } catch (e) {
        alert('فشل تحديث حالة الحجز: ' + (e?.message || 'غير معروف'));
        return false;
      }
    }
    // Local fallback: mutate stored map
    try {
      const map = (appointmentBookings && typeof appointmentBookings === 'object' && !Array.isArray(appointmentBookings)) ? appointmentBookings : {};
      let changed = false;
      Object.keys(map).forEach(k => {
        const arr = Array.isArray(map[k]) ? map[k] : [];
        arr.forEach(row => {
          if (String(row.id || '') === String(id)) {
            row.is_completed = !!done;
            row.status = done ? 'done' : 'pending';
            row.completed_at = done ? new Date().toISOString() : null;
            changed = true;
          }
        });
      });
      if (changed) { appointmentBookings = map; save(KEYS.appointment_bookings, appointmentBookings); }
      return changed;
    } catch { return false; }
  }

  // Add shared note (visible to all admins)
  membershipAppNoteAdd?.addEventListener('click', async () => {
    const idx = membershipAppDetailsIndex;
    if (!Number.isInteger(idx) || idx < 0 || idx >= (membershipApps?.length || 0)) return;
    const r = membershipApps[idx] || {};
    const appId = r.id;
    const text = (membershipAppNoteInput?.value || '').trim();
    if (!text) {
      if (membershipAppNotesStatus) { membershipAppNotesStatus.style.display = ''; membershipAppNotesStatus.style.color = '#ef4444'; membershipAppNotesStatus.textContent = 'اكتب ملاحظة أولًا'; }
      return;
    }
    if (membershipAppNotesStatus) { membershipAppNotesStatus.style.display = ''; membershipAppNotesStatus.style.color = '#64748b'; membershipAppNotesStatus.textContent = 'جاري الإضافة...'; }
    let savedCloud = false;
    let adminName = 'مستخدم';
    let uid = null;
    try {
      if (sb) {
        const { data: { user } } = await sb.auth.getUser();
        uid = user?.id || null;
        const md = user?.user_metadata || {};
        adminName = md.display_name || user?.email || adminName;
      }
    } catch {}
    if (sb && appId != null && uid) {
      try {
        const payload = { application_id: appId, admin_user_id: uid, admin_name: adminName, note: text };
        let upErr = null;
        try {
          const { error } = await sb.from('membership_app_notes').upsert(payload, { onConflict: 'application_id,admin_user_id' });
          upErr = error || null;
        } catch (e1) { upErr = e1; }
        if (upErr) throw upErr;
        savedCloud = true;
      } catch (e) {
        const msg = e?.message || '';
        if (!/(relation|table|membership_app_notes|does not exist|PGRST)/i.test(msg)) {
          if (membershipAppNotesStatus) { membershipAppNotesStatus.style.display = ''; membershipAppNotesStatus.style.color = '#ef4444'; membershipAppNotesStatus.textContent = 'تعذر الحفظ على الخادم'; }
          return;
        }
      }
    }
    if (!savedCloud) {
      // Local fallback: one note per admin per app
      const now = new Date().toISOString();
      const arr = localNotesGetByApp(appId);
      const key = String(uid || 'local');
      const filtered = arr.filter(n => (n && String(n.admin_user_id || 'local')) !== key);
      filtered.unshift({ application_id: appId, admin_user_id: uid || 'local', admin_name: adminName, note: text, created_at: now });
      localNotesSetByApp(appId, filtered);
    }
    if (membershipAppNoteInput) membershipAppNoteInput.value = '';
    try { await reloadMembershipAppNotes(appId); } catch {}
    if (membershipAppNotesStatus) { membershipAppNotesStatus.style.display = ''; membershipAppNotesStatus.style.color = '#10b981'; membershipAppNotesStatus.textContent = savedCloud ? 'تمت الإضافة ✓' : 'تم الحفظ محليًا'; setTimeout(() => { try { membershipAppNotesStatus.style.display = 'none'; } catch {} }, 2000); }
  });
  function siteSettingsSet(obj) {
    try { localStorage.setItem(KEYS.settings, JSON.stringify(obj && typeof obj === 'object' ? obj : {})); } catch {}
  }
  function updateJoinOpenToggleLabel() {
    try {
      if (!joinOpenToggleLabel) return;
      const checked = !!(joinOpenCheckbox?.checked);
      joinOpenToggleLabel.textContent = checked ? 'إغلاق التسجيل' : 'فتح التسجيل';
    } catch {}
  }
  function escapeHtml(s) {
    try {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    } catch { return ''; }
  }
  function toLocalInputVal(iso) {
    try {
      if (!iso) return '';
      const d = new Date(iso);
      if (isNaN(d)) return '';
      const pad = (n) => String(n).padStart(2, '0');
      const y = d.getFullYear();
      const m = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hh = pad(d.getHours());
      const mm = pad(d.getMinutes());
      return `${y}-${m}-${day}T${hh}:${mm}`;
    } catch { return ''; }
  }
  function toIsoFromLocalInput(val) {
    try {
      if (!val) return null;
      const d = new Date(val);
      if (isNaN(d)) return null;
      return d.toISOString();
    } catch { return null; }
  }
  function formatDateTimeReadable(iso) {
    try {
      if (!iso) return '—';
      const d = new Date(iso);
      if (isNaN(d)) return '—';
      return d.toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  }
  function getCountdownTarget(s) {
    try {
      const control = s.join_control_type || (s.join_schedule_enabled ? 'schedule' : 'manual');
      if (control !== 'schedule') {
        return { label: 'وضع يدوي', target: null };
      }
      const mode = s.join_schedule_mode || 'range';
      const now = Date.now();
      const openTs = s.join_schedule_open_at ? Date.parse(s.join_schedule_open_at) : null;
      const closeTs = s.join_schedule_close_at ? Date.parse(s.join_schedule_close_at) : null;
      if (mode === 'range') {
        if (openTs && now < openTs) return { label: 'يفتح بعد', target: openTs };
        if (openTs && closeTs && now >= openTs && now < closeTs) return { label: 'يغلق بعد', target: closeTs };
        if (closeTs && now < closeTs && !openTs) return { label: 'يغلق بعد', target: closeTs };
        return { label: 'انتهت الفترة', target: null };
      }
      if (mode === 'open_only') {
        if (openTs && now < openTs) return { label: 'يفتح بعد', target: openTs };
        if (openTs && now >= openTs) return { label: 'مفتوح الآن', target: null };
        return { label: '—', target: null };
      }
      // close_only
      if (closeTs && now < closeTs) return { label: 'يغلق بعد', target: closeTs };
      if (closeTs && now >= closeTs) return { label: 'مغلق الآن', target: null };
      return { label: '—', target: null };
    } catch { return { label: '—', target: null }; }
  }
  function setCountdownValues(d, h, m, s) {
    if (cdDays) cdDays.textContent = String(Math.max(0, d)).padStart(2, '0');
    if (cdHours) cdHours.textContent = String(Math.max(0, h)).padStart(2, '0');
    if (cdMinutes) cdMinutes.textContent = String(Math.max(0, m)).padStart(2, '0');
    if (cdSeconds) cdSeconds.textContent = String(Math.max(0, s)).padStart(2, '0');
  }
  function updateJoinCountdownUI() {
    try {
      const s = siteSettingsGet();
      const res = getCountdownTarget(s);
      if (joinCountdownLabel) joinCountdownLabel.textContent = res.label || '—';
      if (res.target && res.target > Date.now()) {
        const diff = Math.max(0, Math.floor((res.target - Date.now()) / 1000));
        const d = Math.floor(diff / 86400);
        const h = Math.floor((diff % 86400) / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const sec = diff % 60;
        setCountdownValues(d, h, m, sec);
      } else {
        // No active countdown
        if (res.label && (res.label.includes('مفتوح') || res.label.includes('مغلق') || res.label.includes('وضع'))) {
          setCountdownValues(0, 0, 0, 0);
        } else {
          if (cdDays) cdDays.textContent = '--';
          if (cdHours) cdHours.textContent = '--';
          if (cdMinutes) cdMinutes.textContent = '--';
          if (cdSeconds) cdSeconds.textContent = '--';
        }
      }
    } catch {}
  }
  function scheduleFieldsUpdate(enabled, mode) {
    try {
      if (!joinScheduleOpenAt || !joinScheduleCloseAt) return;
      const en = !!enabled;
      const m = mode || (joinScheduleModeOpenOnly?.checked ? 'open_only' : (joinScheduleModeCloseOnly?.checked ? 'close_only' : 'range'));
      const openWrap = joinScheduleOpenAt.closest('label');
      const closeWrap = joinScheduleCloseAt.closest('label');
      const tzRow = joinTimezoneEl ? joinTimezoneEl.closest('.full-row') : null;
      if (!en) {
        joinScheduleOpenAt.disabled = true;
        joinScheduleCloseAt.disabled = true;
        if (openWrap) openWrap.style.display = 'none';
        if (closeWrap) closeWrap.style.display = 'none';
        if (tzRow) tzRow.style.display = 'none';
      } else if (m === 'open_only') {
        joinScheduleOpenAt.disabled = false;
        joinScheduleCloseAt.disabled = true;
        if (openWrap) openWrap.style.display = '';
        if (closeWrap) closeWrap.style.display = 'none';
        if (tzRow) tzRow.style.display = '';
      } else if (m === 'close_only') {
        joinScheduleOpenAt.disabled = true;
        joinScheduleCloseAt.disabled = false;
        if (openWrap) openWrap.style.display = 'none';
        if (closeWrap) closeWrap.style.display = '';
        if (tzRow) tzRow.style.display = '';
      } else {
        joinScheduleOpenAt.disabled = false;
        joinScheduleCloseAt.disabled = false;
        if (openWrap) openWrap.style.display = '';
        if (closeWrap) closeWrap.style.display = '';
        if (tzRow) tzRow.style.display = '';
      }
    } catch {}
  }
  function getSelectedScheduleMode() {
    try {
      if (joinScheduleModeOpenOnly?.checked) return 'open_only';
      if (joinScheduleModeCloseOnly?.checked) return 'close_only';
      return 'range';
    } catch { return 'range'; }
  }
  function getSelectedControlType() {
    try { return joinControlTypeSchedule?.checked ? 'schedule' : 'manual'; } catch { return 'manual'; }
  }
  function isJoinOpenEffective(s) {
    try {
      const sched = !!s.join_schedule_enabled;
      const openIso = s.join_schedule_open_at || null;
      const closeIso = s.join_schedule_close_at || null;
      if (sched && (openIso || closeIso)) {
        const now = Date.now();
        const openTs = openIso ? Date.parse(openIso) : null;
        const closeTs = closeIso ? Date.parse(closeIso) : null;
        if (openTs && closeTs) return now >= openTs && now < closeTs;
        if (openTs && !closeTs) return now >= openTs;
        if (!openTs && closeTs) return now < closeTs;
      }
      return s.join_open !== false;
    } catch { return s && s.join_open !== false; }
  }
  async function settingsRemoteFetch() {
    if (!sb) return null;
    try {
      const { data, error } = await sb
        .from('membership_settings')
        .select('id, join_open, join_closed_title, join_closed_message, join_closed_button_text, join_membership_countdown, join_control_type, join_schedule_enabled, join_schedule_mode, join_schedule_open_at, join_schedule_close_at, updated_at')
        .eq('id','default')
        .maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (e) { return null; }
  }
  async function settingsRemoteSave(obj) {
    if (!sb) return;
    try {
      const payload = {
        id: 'default',
        join_open: obj?.join_open !== false,
        join_closed_title: obj?.join_closed_title || null,
        join_closed_message: obj?.join_closed_message || null,
        join_closed_button_text: obj?.join_closed_button_text || null,
        join_membership_countdown: !!obj?.join_membership_countdown,
        join_control_type: obj?.join_control_type || (obj?.join_schedule_enabled ? 'schedule' : 'manual'),
        join_schedule_enabled: obj?.join_control_type ? (obj?.join_control_type === 'schedule') : !!obj?.join_schedule_enabled,
        join_schedule_mode: obj?.join_schedule_mode || 'range',
        join_schedule_open_at: obj?.join_schedule_open_at || null,
        join_schedule_close_at: obj?.join_schedule_close_at || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await sb.from('membership_settings').upsert(payload).select('*').single();
      if (error) throw error;
    } catch (e) { /* ignore for local-only mode */ }
  }
  function refreshJoinUI() {
    const s = siteSettingsGet();
    const isOpen = isJoinOpenEffective(s);
    if (joinStatusLabel) joinStatusLabel.textContent = isOpen ? 'الحالة: مفتوح' : 'الحالة: مغلق';
    if (joinStatusInline) {
      joinStatusInline.textContent = isOpen ? 'الحالة: مفتوح' : 'الحالة: مغلق';
      try {
        joinStatusInline.classList.remove('pill-open','pill-closed');
        joinStatusInline.classList.add(isOpen ? 'pill-open' : 'pill-closed');
      } catch {}
    }
    if (toggleJoinBtn) {
      try {
        toggleJoinBtn.classList.toggle('btn-primary', !isOpen);
        toggleJoinBtn.classList.toggle('btn-outline', isOpen);
      } catch {}
      toggleJoinBtn.innerHTML = isOpen
        ? '<i class="fa-solid fa-toggle-off"></i> إغلاق'
        : '<i class="fa-solid fa-toggle-on"></i> فتح';
    }
  }
  function refreshJoinSummaryUI() {
    try {
      const s = siteSettingsGet();
      const isOpen = isJoinOpenEffective(s);
      if (joinSummaryState) {
        joinSummaryState.textContent = isOpen ? 'مفتوح' : 'مغلق';
        try {
          joinSummaryState.classList.remove('pill-open','pill-closed');
          joinSummaryState.classList.add(isOpen ? 'pill-open' : 'pill-closed');
        } catch {}
      }
      if (joinSummaryControl) joinSummaryControl.textContent = (s.join_control_type === 'schedule' || s.join_schedule_enabled) ? 'جدولة' : 'يدوي';
      const mode = s.join_schedule_mode || 'range';
      if (joinSummaryMode) joinSummaryMode.textContent = (s.join_control_type === 'schedule' || s.join_schedule_enabled)
        ? (mode === 'open_only' ? 'فتح فقط' : mode === 'close_only' ? 'إغلاق فقط' : 'فتح وإغلاق')
        : '—';
      let times = '—';
      if (s.join_control_type === 'schedule' || s.join_schedule_enabled) {
        if (mode === 'range') times = `من: ${formatDateTimeReadable(s.join_schedule_open_at)} · إلى: ${formatDateTimeReadable(s.join_schedule_close_at)}`;
        else if (mode === 'open_only') times = `يفتح: ${formatDateTimeReadable(s.join_schedule_open_at)}`;
        else if (mode === 'close_only') times = `يغلق: ${formatDateTimeReadable(s.join_schedule_close_at)}`;
      }
      if (joinSummaryTimes) joinSummaryTimes.textContent = times;
      if (joinSummaryTitle) joinSummaryTitle.textContent = String(s.join_closed_title || DEFAULT_JOIN_CLOSED_TITLE);
      if (joinSummaryMessage) joinSummaryMessage.textContent = String(s.join_closed_message || DEFAULT_JOIN_CLOSED_MESSAGE);
      if (joinSummaryButtonText) joinSummaryButtonText.textContent = String(s.join_closed_button_text || DEFAULT_JOIN_CLOSED_BUTTON);
      if (joinSummaryCountdown) joinSummaryCountdown.textContent = (s.join_membership_countdown ? 'ظاهر' : 'مخفي');
      if (joinTimezoneEl) {
        try { joinTimezoneEl.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { joinTimezoneEl.textContent = 'UTC'; }
      }
    } catch {}
  }
  toggleJoinBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const s = siteSettingsGet();
    const isOpen = s.join_open !== false;
    s.join_open = !isOpen;
    if (!s.join_closed_title) s.join_closed_title = DEFAULT_JOIN_CLOSED_TITLE;
    if (!s.join_closed_message) s.join_closed_message = DEFAULT_JOIN_CLOSED_MESSAGE;
    if (!s.join_closed_button_text) s.join_closed_button_text = DEFAULT_JOIN_CLOSED_BUTTON;
    siteSettingsSet(s);
    refreshJoinUI();
    refreshJoinFormUI();
    refreshJoinSummaryUI();
    try { settingsRemoteSave(s); } catch {}
  });
  function refreshJoinFormUI() {
    if (!joinOpenCheckbox && !joinClosedTitleInput && !joinClosedMessageInput && !joinScheduleOpenAt && !joinScheduleCloseAt) return;
    const s = siteSettingsGet();
    const isOpen = s.join_open !== false;
    const control = s.join_control_type || (s.join_schedule_enabled ? 'schedule' : 'manual');
    if (joinControlTypeManual) joinControlTypeManual.checked = control !== 'schedule';
    if (joinControlTypeSchedule) joinControlTypeSchedule.checked = control === 'schedule';
    try {
      joinManualGroup?.classList.toggle('collapsed', control === 'schedule');
      joinManualGroup?.setAttribute('aria-hidden', control === 'schedule' ? 'true' : 'false');
      joinScheduleGroup?.classList.toggle('collapsed', control !== 'schedule');
      joinScheduleGroup?.setAttribute('aria-hidden', control !== 'schedule' ? 'true' : 'false');
    } catch {}
    if (joinOpenCheckbox) joinOpenCheckbox.checked = !!isOpen;
    try { updateJoinOpenToggleLabel(); } catch {}
    const mode = s.join_schedule_mode || 'range';
    if (joinScheduleModeRange) joinScheduleModeRange.checked = mode === 'range';
    if (joinScheduleModeOpenOnly) joinScheduleModeOpenOnly.checked = mode === 'open_only';
    if (joinScheduleModeCloseOnly) joinScheduleModeCloseOnly.checked = mode === 'close_only';
    if (joinScheduleOpenAt) joinScheduleOpenAt.value = toLocalInputVal(s.join_schedule_open_at);
    if (joinScheduleCloseAt) joinScheduleCloseAt.value = toLocalInputVal(s.join_schedule_close_at);
    scheduleFieldsUpdate(control === 'schedule', mode);
    if (joinClosedTitleInput) joinClosedTitleInput.value = String(s.join_closed_title || DEFAULT_JOIN_CLOSED_TITLE);
    if (joinClosedMessageInput) joinClosedMessageInput.value = String(s.join_closed_message || DEFAULT_JOIN_CLOSED_MESSAGE);
    if (joinClosedButtonInput) joinClosedButtonInput.value = String(s.join_closed_button_text || DEFAULT_JOIN_CLOSED_BUTTON);
    if (joinMembershipCountdown) joinMembershipCountdown.checked = !!s.join_membership_countdown;
  }
  [joinControlTypeManual, joinControlTypeSchedule].forEach((el) => {
    try {
      el?.addEventListener('change', () => {
        const control = getSelectedControlType();
        try {
          joinManualGroup?.classList.toggle('collapsed', control === 'schedule');
          joinManualGroup?.setAttribute('aria-hidden', control === 'schedule' ? 'true' : 'false');
          joinScheduleGroup?.classList.toggle('collapsed', control !== 'schedule');
          joinScheduleGroup?.setAttribute('aria-hidden', control !== 'schedule' ? 'true' : 'false');
        } catch {}
        scheduleFieldsUpdate(control === 'schedule', getSelectedScheduleMode());
        refreshJoinSummaryUI();
        updateJoinCountdownUI();
      });
    } catch {}
  });
  [joinScheduleModeRange, joinScheduleModeOpenOnly, joinScheduleModeCloseOnly].forEach((el) => {
    try {
      el?.addEventListener('change', () => {
        scheduleFieldsUpdate(getSelectedControlType() === 'schedule', getSelectedScheduleMode());
        try { updateJoinOpenToggleLabel(); } catch {}
        refreshJoinSummaryUI();
        updateJoinCountdownUI();
      });
    } catch {}
  });
  const clearJoinSettingsMsg = () => { if (joinSettingsMsg) { joinSettingsMsg.className = 'muted'; joinSettingsMsg.textContent = ''; } };
  joinScheduleOpenAt?.addEventListener('input', () => { clearJoinSettingsMsg(); refreshJoinSummaryUI(); updateJoinCountdownUI(); });
  joinScheduleCloseAt?.addEventListener('input', () => { clearJoinSettingsMsg(); refreshJoinSummaryUI(); updateJoinCountdownUI(); });
  joinOpenCheckbox?.addEventListener('change', () => { updateJoinOpenToggleLabel(); refreshJoinSummaryUI(); updateJoinCountdownUI(); });
  joinMembershipCountdown?.addEventListener('change', () => { refreshJoinSummaryUI(); });
  joinClosedButtonInput?.addEventListener('input', refreshJoinSummaryUI);
  joinClosedTitleInput?.addEventListener('input', refreshJoinSummaryUI);
  joinClosedMessageInput?.addEventListener('input', refreshJoinSummaryUI);
  previewClosedMsgBtn?.addEventListener('click', () => {
    const title = String(joinClosedTitleInput?.value || DEFAULT_JOIN_CLOSED_TITLE);
    const msg = String(joinClosedMessageInput?.value || DEFAULT_JOIN_CLOSED_MESSAGE);
    const btn = String(joinClosedButtonInput?.value || DEFAULT_JOIN_CLOSED_BUTTON);
    try {
      Swal.fire({ icon: 'info', title, text: msg, confirmButtonText: btn });
    }
    catch { alert(`${title}\n\n${msg}`); }
  });
  joinSettingsForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const s = siteSettingsGet();
    const newOpen = !!(joinOpenCheckbox?.checked);
    const title = String(joinClosedTitleInput?.value || '').trim();
    const msg = String(joinClosedMessageInput?.value || '').trim();
    const btnText = String(joinClosedButtonInput?.value || '').trim();
    const controlType = getSelectedControlType();
    const openIso = toIsoFromLocalInput(joinScheduleOpenAt?.value || '');
    const closeIso = toIsoFromLocalInput(joinScheduleCloseAt?.value || '');
    const mode = getSelectedScheduleMode();
    const titleOrDefault = title || DEFAULT_JOIN_CLOSED_TITLE;
    const msgOrDefault = msg || DEFAULT_JOIN_CLOSED_MESSAGE;
    const btnOrDefault = btnText || DEFAULT_JOIN_CLOSED_BUTTON;
    const showCountdown = !!(joinMembershipCountdown?.checked);
    let openOut = openIso, closeOut = closeIso;
    if (controlType === 'schedule') {
      if (mode === 'open_only') { closeOut = null; }
      if (mode === 'close_only') { openOut = null; }
    }
    const next = {
      ...s,
      join_open: newOpen,
      join_closed_title: titleOrDefault,
      join_closed_message: msgOrDefault,
      join_closed_button_text: btnOrDefault,
      join_membership_countdown: showCountdown,
      join_control_type: controlType,
      join_schedule_enabled: controlType === 'schedule',
      join_schedule_mode: mode,
      join_schedule_open_at: openOut,
      join_schedule_close_at: closeOut,
    };
    siteSettingsSet(next);
    refreshJoinUI();
    refreshJoinFormUI();
    refreshJoinSummaryUI();
    updateJoinCountdownUI();
    if (joinSettingsMsg) { joinSettingsMsg.className = 'muted'; joinSettingsMsg.textContent = 'جارٍ الحفظ...'; }
    try { await settingsRemoteSave(next); if (joinSettingsMsg) { joinSettingsMsg.className = 'muted'; joinSettingsMsg.textContent = 'تم الحفظ'; } }
    catch (err) { if (joinSettingsMsg) { joinSettingsMsg.className = 'alert error'; joinSettingsMsg.textContent = 'فشل الحفظ'; } }
  });
  try {
    refreshJoinUI();
    refreshJoinFormUI();
    refreshJoinSummaryUI();
    updateJoinCountdownUI();
    settingsRemoteFetch()?.then((row) => {
      if (row && typeof row === 'object') {
        const cur = siteSettingsGet();
        const next = {
          ...cur,
          join_open: row.join_open !== false,
          join_closed_title: row.join_closed_title || cur.join_closed_title,
          join_closed_message: row.join_closed_message || cur.join_closed_message,
          join_closed_button_text: row.join_closed_button_text || cur.join_closed_button_text,
          join_membership_countdown: typeof row.join_membership_countdown === 'boolean' ? row.join_membership_countdown : cur.join_membership_countdown,
          join_control_type: row.join_control_type || (row.join_schedule_enabled ? 'schedule' : cur.join_control_type || 'manual'),
          join_schedule_enabled: row.join_control_type ? (row.join_control_type === 'schedule') : !!row.join_schedule_enabled,
          join_schedule_mode: row.join_schedule_mode || cur.join_schedule_mode,
          join_schedule_open_at: row.join_schedule_open_at || cur.join_schedule_open_at,
          join_schedule_close_at: row.join_schedule_close_at || cur.join_schedule_close_at,
        };
        siteSettingsSet(next);
        refreshJoinUI();
        refreshJoinFormUI();
        refreshJoinSummaryUI();
        updateJoinCountdownUI();
      }
    }).catch(() => {});
    if (joinTimezoneEl) { try { joinTimezoneEl.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { joinTimezoneEl.textContent = 'UTC'; } }
  } catch {}

  try { setInterval(() => { try { refreshJoinUI(); refreshJoinSummaryUI(); } catch {} }, 60000); } catch {}
  try { setInterval(() => { try { updateJoinCountdownUI(); } catch {} }, 1000); } catch {}

  function applyMembershipFilters() {
    const list = Array.isArray(membershipApps) ? membershipApps : [];
    const nameQ = (membershipFilterName?.value || '').toString().trim().toLowerCase();
    const statusQ = (membershipFilterStatus?.value || 'all');
    const bandQ = (membershipFilterPctBand?.value || 'all');
    const committeeQ = (membershipFilterCommittee?.value || 'all');
    const normalize = (raw) => {
      const v = (raw || '').toString().trim().toLowerCase();
      if (['accepted','approved','accept','ok','done','مقبول'].includes(v)) return 'accepted';
      if (['rejected','declined','رفض','مرفوض','reject'].includes(v)) return 'rejected';
      if (['interview','interviewing','scheduled','مقابلة','موعد','مُقابلة'].includes(v)) return 'interview';
      if (['review','under_review','in_review','pending_review','مراجعة','قيد المراجعة'].includes(v)) return 'review';
      return 'pending';
    };
    const pctOf = (r) => {
      const fields = ['phone','email','degree','college','major','skills','preferred_committee','portfolio_url','status','social_twitter','social_instagram','social_linkedin','about'];
      let filled = 0;
      for (const k of fields) {
        let v = r[k];
        if (!v && k === 'preferred_committee') v = r.committee;
        if (typeof v === 'string') v = v.trim();
        if (v) filled++;
      }
      return Math.round((filled * 100) / (fields.length || 1));
    };
    const filtered = list.filter((r) => {
      if (nameQ) {
        const n = (r.full_name || r.name || '').toString().toLowerCase();
        if (!n.includes(nameQ)) return false;
      }
      if (statusQ && statusQ !== 'all') {
        if (normalize(r.status) !== statusQ) return false;
      }
      if (committeeQ && committeeQ !== 'all') {
        const c = (r?.preferred_committee || r?.committee || '').toString().trim().replace(/\s+/g, ' ');
        if (c !== committeeQ) return false;
      }
      const p = pctOf(r);
      if (bandQ && bandQ !== 'all') {
        const base = parseInt(bandQ, 10);
        if (base === 100) {
          if (p !== 100) return false;
        } else if (!Number.isNaN(base)) {
          if (p < base || p > (base + 9)) return false;
        }
      }
      return true;
    });
    renderMembershipApps(filtered);
  }

  function refreshMembershipCommitteeFilterOptions() {
    if (!membershipFilterCommittee) return;
    const list = Array.isArray(membershipApps) ? membershipApps : [];
    const set = new Set();
    list.forEach((r) => {
      const raw = (r?.preferred_committee || r?.committee || '').toString().trim();
      if (!raw) return;
      set.add(raw.replace(/\s+/g, ' '));
    });
    const opts = ['all', ...Array.from(set).sort((a, b) => { try { return a.localeCompare(b, 'ar'); } catch { return String(a).localeCompare(String(b)); } })];
    const prev = membershipFilterCommittee.value || 'all';
    membershipFilterCommittee.innerHTML = '';
    opts.forEach((val) => {
      const op = document.createElement('option');
      op.value = val;
      op.textContent = (val === 'all') ? 'كل اللجان' : val;
      membershipFilterCommittee.appendChild(op);
    });
    // Restore selection if still present
    if (opts.includes(prev)) membershipFilterCommittee.value = prev; else membershipFilterCommittee.value = 'all';
  }
  function refreshMembershipExportCommitteeOptions() {
    if (!membershipExportCommittee) return;
    const list = Array.isArray(membershipApps) ? membershipApps : [];
    const set = new Set();
    list.forEach((r) => {
      const raw = (r?.preferred_committee || r?.committee || '').toString().trim();
      if (!raw) return;
      set.add(raw.replace(/\s+/g, ' '));
    });
    const opts = ['all', ...Array.from(set).sort((a, b) => { try { return a.localeCompare(b, 'ar'); } catch { return String(a).localeCompare(String(b)); } })];
    const prev = membershipExportCommittee.value || 'all';
    membershipExportCommittee.innerHTML = '';
    opts.forEach((val) => {
      const op = document.createElement('option');
      op.value = val;
      op.textContent = (val === 'all') ? 'كل اللجان' : val;
      membershipExportCommittee.appendChild(op);
    });
    if (opts.includes(prev)) membershipExportCommittee.value = prev; else membershipExportCommittee.value = 'all';
  }
  function buildMembershipExportFieldsUI() {
    if (!membershipExportFields) return;
    const defs = [
      { key: 'id', label: 'المعرف' },
      { key: 'created_at', label: 'التاريخ' },
      { key: 'full_name', label: 'الاسم' },
      { key: 'phone', label: 'الجوال' },
      { key: 'email', label: 'البريد الإلكتروني' },
      { key: 'degree', label: 'الدرجة العلمية' },
      { key: 'college', label: 'الكلية' },
      { key: 'major', label: 'التخصص' },
      { key: 'skills', label: 'المهارات' },
      { key: 'preferred_committee', label: 'اللجنة' },
      { key: 'portfolio_url', label: 'أعمال سابقة' },
      { key: 'status', label: 'الحالة' },
      { key: 'social_twitter', label: 'تويتر' },
      { key: 'social_instagram', label: 'إنستقرام' },
      { key: 'social_linkedin', label: 'تيك توك' },
      { key: 'about', label: 'نبذة' },
      { key: 'admin_note', label: 'ملاحظة إدارية' },
    ];
    membershipExportFields.innerHTML = '';
    defs.forEach((f) => {
      const id = `export-field-${f.key}`;
      const wrap = document.createElement('label');
      wrap.className = 'checkbox';
      wrap.innerHTML = `<input type="checkbox" id="${id}" name="fields" value="${f.key}" checked> <span>${f.label}</span>`;
      membershipExportFields.appendChild(wrap);
    });
  }
  function membershipCsvEscape(val) {
    try {
      const s = (val == null ? '' : String(val));
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    } catch { return ''; }
  }
  async function performMembershipExport() {
    const list = Array.isArray(membershipApps) ? membershipApps : [];
    const committeeSel = membershipExportCommittee ? membershipExportCommittee.value : 'all';
    const selected = Array.from(membershipExportFields?.querySelectorAll('input[name="fields"]:checked') || []).map((i) => i.value);
    if (!selected.length) return;
    const fieldsMap = {
      id: 'المعرف',
      created_at: 'التاريخ',
      full_name: 'الاسم',
      phone: 'الجوال',
      email: 'البريد الإلكتروني',
      degree: 'الدرجة العلمية',
      college: 'الكلية',
      major: 'التخصص',
      skills: 'المهارات',
      preferred_committee: 'اللجنة',
      portfolio_url: 'أعمال سابقة',
      status: 'الحالة',
      social_twitter: 'تويتر',
      social_instagram: 'إنستقرام',
      social_linkedin: 'تيك توك',
      about: 'نبذة',
      admin_note: 'ملاحظة إدارية',
    };
    const exportList = list.filter((r) => {
      if (!committeeSel || committeeSel === 'all') return true;
      const c = (r?.preferred_committee || r?.committee || '').toString().trim().replace(/\s+/g, ' ');
      return c === committeeSel;
    });

    // Prepare map of my notes keyed by application id if admin_note is selected
    let myNotesMap = {};
    if (selected.includes('admin_note')) {
      try {
        if (sb) {
          const { data: { user } } = await sb.auth.getUser();
          if (user) {
            const ids = exportList.map(r => r.id).filter(v => v != null);
            if (ids.length) {
              try {
                const { data: noteRows, error: noteErr } = await sb
                  .from('membership_app_notes')
                  .select('application_id, note')
                  .eq('admin_user_id', user.id)
                  .in('application_id', ids);
                if (!noteErr && Array.isArray(noteRows)) {
                  myNotesMap = Object.fromEntries(noteRows.map(n => [n.application_id, n.note || '']));
                }
              } catch (e) {
                // table missing -> fallback to local
              }
            }
            if (!Object.keys(myNotesMap).length) {
              try {
                const local = localMyMembershipNotesGet(user.id);
                if (local && typeof local === 'object') myNotesMap = local;
              } catch {}
            }
          }
        }
      } catch {}
    }

    const rows = exportList.map((r) => {
      const obj = {};
      selected.forEach((k) => {
        if (k === 'preferred_committee') obj[k] = (r.preferred_committee || r.committee || '') || '';
        else if (k === 'admin_note') obj[k] = (r.id != null && myNotesMap && Object.prototype.hasOwnProperty.call(myNotesMap, r.id)) ? (myNotesMap[r.id] || '') : (r[k] != null ? r[k] : '');
        else obj[k] = r[k] != null ? r[k] : '';
      });
      return obj;
    });
    const header = selected.map((k) => membershipCsvEscape(fieldsMap[k] || k)).join(',');
    const body = rows.map((row) => selected.map((k) => membershipCsvEscape(row[k])).join(',')).join('\r\n');
    const csv = '\uFEFF' + header + '\r\n' + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const name = `membership_apps_${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.csv`;
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  
  function renderMembershipApps(rows) {
    const container = membershipAppsGroups || document.getElementById('membershipAppsGroups');
    if (!container) return;
    container.innerHTML = '';
    const list = Array.isArray(rows) ? rows : [];
    if (membershipAppsEmpty) membershipAppsEmpty.style.display = list.length ? 'none' : '';
    const groups = new Map();
    list.forEach((r) => {
      const raw = (r?.preferred_committee || r?.committee || '').toString().trim();
      const key = raw.replace(/\s+/g, ' ') || 'بدون لجنة';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });

  
    const labels = Array.from(groups.keys()).sort((a, b) => { try { return a.localeCompare(b, 'ar'); } catch { return String(a).localeCompare(String(b)); } });
    labels.forEach((label) => {
      const items = groups.get(label) || [];
      const panel = el(`
        <div class="panel" style="padding:16px; overflow:auto">
          <div class="panel-head">
            <h3 style="margin:0;font-size:1rem;color:var(--main-blue)"><i class="fa-solid fa-users"></i> ${escapeHtml(label)}</h3>
            <span class="count-badge">${items.length}</span>
          </div>
          <table class="table" style="width:100%; border-collapse:collapse">
            <thead>
              <tr>
                <th style="text-align:right; padding:12px">الاسم</th>
                <th style="text-align:right; padding:12px">الحالة</th>
                <th style="text-align:right; padding:12px">نسبة الإكمال</th>
                <th style="text-align:right; padding:12px">عرض</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      `);
      const tbody = panel.querySelector('tbody');
      items.forEach((r) => {
        const idx = (membershipApps || []).indexOf(r);
        const name = escapeHtml(r.full_name || r.name || '—');
        const rawStatus = (r.status || '').toString().trim().toLowerCase();
        let statusKey = 'pending';
        if (['accepted','approved','accept','ok','done','مقبول'].includes(rawStatus)) statusKey = 'accepted';
        else if (['rejected','declined','رفض','مرفوض','reject'].includes(rawStatus)) statusKey = 'rejected';
        else if (['interview','interviewing','scheduled','مقابلة','موعد','مُقابلة'].includes(rawStatus)) statusKey = 'interview';
        else if (['review','under_review','in_review','pending_review','مراجعة','قيد المراجعة'].includes(rawStatus)) statusKey = 'review';
        const statusLabel = (
          statusKey === 'accepted' ? 'مقبول' :
          statusKey === 'rejected' ? 'مرفوض' :
          statusKey === 'interview' ? 'مُقابلة' :
          statusKey === 'review' ? 'مراجعة' :
          'قيد الانتظار'
        );
        const statusBadge = `<span class="status-badge status-${statusKey}" data-role="status-badge">${statusLabel}</span>`;
        const fields = ['phone','email','degree','college','major','skills','preferred_committee','portfolio_url','status','social_twitter','social_instagram','social_linkedin','about'];
        const total = fields.length;
        let filled = 0;
        for (const k of fields) {
          let v = r[k];
          if (!v && k === 'preferred_committee') v = r.committee;
          if (typeof v === 'string') v = v.trim();
          if (v) filled++;
        }
        const pct = Math.round((filled * 100) / (total || 1));
        const row = el(`
          <tr data-idx="${idx}">
            <td style="padding:12px; min-width:200px" data-label="الاسم">${name}</td>
            <td style="padding:12px" data-label="الحالة">${statusBadge}</td>
            <td style="padding:12px" data-label="نسبة الإكمال">${pct}%</td>
            <td style="padding:12px; white-space:nowrap" data-label="عرض"><button class="btn btn-outline btn-xs" type="button" data-act="view" data-idx="${idx}"><i class="fa-regular fa-eye"></i> عرض</button></td>
          </tr>
        `);
        tbody.appendChild(row);
      });
      container.appendChild(panel);
    });
  }

  function renderMembershipStats(rows) {
    const grid = membershipStatsGrid || document.getElementById('membershipStatsGrid');
    if (!grid) return;
    const list = Array.isArray(rows) ? rows : (Array.isArray(membershipApps) ? membershipApps : []);
    const num = (v) => {
      const n = Number(v || 0);
      try { return n.toLocaleString('ar'); } catch { return String(n); }
    };
    const map = new Map();
    list.forEach((r) => {
      const raw = (r?.preferred_committee || r?.committee || '').toString().trim();
      if (!raw) return;
      const key = raw.replace(/\s+/g, ' ');
      map.set(key, (map.get(key) || 0) + 1);
    });
    const labels = Array.from(map.entries()).sort((a, b) => {
      try { return a[0].localeCompare(b[0], 'ar'); } catch { return String(a[0]).localeCompare(String(b[0])); }
    });
    const committeeItems = labels.slice(0, 6).map(([label, count]) => ({ title: label, value: num(count), icon: 'fa-solid fa-users' }));
    const items = [
      { title: 'إجمالي المتقدمين', value: num(list.length), icon: 'fa-solid fa-users' },
      ...committeeItems,
    ];
    grid.innerHTML = '';
    items.forEach((it, idx) => {
      const node = el(`
        <div class="card${idx === 0 ? ' span-all' : ''}">
          <div class="card__body">
            <div class="card__title"><i class="${it.icon}"></i> ${it.title}</div>
            <div class="stat-number">${it.value}</div>
          </div>
        </div>
      `);
      grid.appendChild(node);
    });
    const normalize = (raw) => {
      const v = (raw || '').toString().trim().toLowerCase();
      if (['accepted','approved','accept','ok','done','مقبول'].includes(v)) return 'accepted';
      if (['rejected','declined','رفض','مرفوض','reject'].includes(v)) return 'rejected';
      if (['interview','interviewing','scheduled','مقابلة','موعد','مُقابلة'].includes(v)) return 'interview';
      if (['review','under_review','in_review','pending_review','مراجعة','قيد المراجعة'].includes(v)) return 'review';
      return 'pending';
    };
    const counts = { pending: 0, review: 0, interview: 0, rejected: 0, accepted: 0 };
    list.forEach((r) => { const k = normalize(r?.status); counts[k] = (counts[k] || 0) + 1; });
    // Row 1: Pending (single card)
    grid.appendChild(el(`
      <div class="span-all">
        <div class="cards-grid status-cards-1">
          <div class="card">
            <div class="card__body">
              <div class="card__title"><i class="fa-solid fa-hourglass-half"></i> قيد الانتظار</div>
              <div class="stat-number">${num(counts.pending)}</div>
            </div>
          </div>
        </div>
      </div>
    `));
    // Row 2: Review | Interview (two cards)
    grid.appendChild(el(`
      <div class="span-all">
        <div class="cards-grid status-cards-2">
          <div class="card">
            <div class="card__body">
              <div class="card__title"><i class="fa-solid fa-magnifying-glass"></i> مراجعة</div>
              <div class="stat-number">${num(counts.review)}</div>
            </div>
          </div>
          <div class="card">
            <div class="card__body">
              <div class="card__title"><i class="fa-solid fa-user-check"></i> مُقابلة</div>
              <div class="stat-number">${num(counts.interview)}</div>
            </div>
          </div>
        </div>
      </div>
    `));
    // Row 3: Rejected | Accepted (two cards)
    grid.appendChild(el(`
      <div class="span-all">
        <div class="cards-grid status-cards-2">
          <div class="card">
            <div class="card__body">
              <div class="card__title"><i class="fa-solid fa-xmark"></i> مرفوض</div>
              <div class="stat-number">${num(counts.rejected)}</div>
            </div>
          </div>
          <div class="card">
            <div class="card__body">
              <div class="card__title"><i class="fa-solid fa-check"></i> مقبول</div>
              <div class="stat-number">${num(counts.accepted)}</div>
            </div>
          </div>
        </div>
      </div>
    `));
  }

  async function loadMembershipApps() {
    let rows = [];
    if (sb) {
    try {
        let rowsData = null;
        try {
          const { data, error } = await sb
            .from('membership_applications')
            .select('id, created_at, full_name, phone, email, degree, college, major, skills, preferred_committee, portfolio_url, status, social_twitter, social_instagram, social_linkedin, about, admin_note')
            .order('created_at', { ascending: false });
          if (error) throw error;
          rowsData = data || [];
        } catch (e1) {
          const msg = e1?.message || '';
          if (/(column\s+admin_note|PGRST205|Could not find\s+the table|could not find)/i.test(msg)) {
            const { data: d2, error: e2 } = await sb
              .from('membership_applications')
              .select('id, created_at, full_name, phone, email, degree, college, major, skills, preferred_committee, portfolio_url, status, social_twitter, social_instagram, social_linkedin, about')
              .order('created_at', { ascending: false });
            if (e2) throw e2;
            rowsData = d2 || [];
          } else {
            throw e1;
          }
        }
        rows = Array.isArray(rowsData) ? rowsData : [];
    } catch (e) {
      console.warn('membership_applications fetch failed', e);
      rows = localMembershipAppsGet();
    }
  } else {
      rows = localMembershipAppsGet();
    }
    membershipApps = rows.slice();
    try { refreshMembershipCommitteeFilterOptions(); } catch {}
    applyMembershipFilters();
    renderMembershipStats(membershipApps);
  }
  membershipRefreshBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await loadMembershipApps(); } catch {}
  });
  membershipFilters?.addEventListener('input', () => { applyMembershipFilters(); });
  membershipFilterStatus?.addEventListener('change', () => { applyMembershipFilters(); });
  membershipFilterPctBand?.addEventListener('change', () => { applyMembershipFilters(); });
  membershipFilterCommittee?.addEventListener('change', () => { applyMembershipFilters(); });
  membershipFiltersClear?.addEventListener('click', () => {
    if (membershipFilterName) membershipFilterName.value = '';
    if (membershipFilterStatus) membershipFilterStatus.value = 'all';
    if (membershipFilterPctBand) membershipFilterPctBand.value = 'all';
    if (membershipFilterCommittee) membershipFilterCommittee.value = 'all';
    applyMembershipFilters();
  });
  membershipExportBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    try { refreshMembershipExportCommitteeOptions(); } catch {}
    try { buildMembershipExportFieldsUI(); } catch {}
    try { openDialog?.(membershipExportDialog); } catch { membershipExportDialog?.showModal?.(); }
  });
  membershipExportForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await performMembershipExport(); } catch {}
    try { membershipExportDialog?.close?.(); } catch {}
  });
  membershipAppsGroups?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act="view"]');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    if (!Number.isInteger(idx) || idx < 0 || idx >= (membershipApps?.length || 0)) return;
    const r = membershipApps[idx] || {};
    try {
      membershipAppDetailsIndex = idx;
      const name = r.full_name || r.name || '—';
      const created = formatArDate(r.created_at || r.createdAt || null) || '—';
      const phone = r.phone || '—';
      const email = r.email || '—';
      const degree = r.degree || '—';
      const college = r.college || '—';
      const major = r.major || '—';
      const skills = r.skills || '—';
      const committee = r.preferred_committee || r.committee || '—';
      const portfolio = (r.portfolio_url || '').toString().trim();
      const rawStatus = (r.status || '').toString().trim().toLowerCase();
      let statusKey = 'pending';
      if (['accepted','approved','accept','ok','done','مقبول'].includes(rawStatus)) statusKey = 'accepted';
      else if (['rejected','declined','رفض','مرفوض','reject'].includes(rawStatus)) statusKey = 'rejected';
      else if (['interview','interviewing','scheduled','مقابلة','موعد','مُقابلة'].includes(rawStatus)) statusKey = 'interview';
      else if (['review','under_review','in_review','pending_review','مراجعة','قيد المراجعة'].includes(rawStatus)) statusKey = 'review';
      const twitter = (r.social_twitter || '').toString().trim();
      const instagram = (r.social_instagram || '').toString().trim();
      const linkedin = (r.social_linkedin || '').toString().trim();
      const about = r.about || '—';
      // Load shared notes visible to all admins
      try { await reloadMembershipAppNotes(r.id); } catch {}
      if (membershipAppDetailsName) membershipAppDetailsName.textContent = name;
      if (membershipAppDetailsDate) membershipAppDetailsDate.textContent = created;
      if (membershipAppDetailsPhone) membershipAppDetailsPhone.textContent = phone;
      if (membershipAppDetailsEmail) membershipAppDetailsEmail.textContent = email;
      if (membershipAppDetailsDegree) membershipAppDetailsDegree.textContent = degree;
      if (membershipAppDetailsCollege) membershipAppDetailsCollege.textContent = college;
      if (membershipAppDetailsMajor) membershipAppDetailsMajor.textContent = major;
      if (membershipAppDetailsCommittee) membershipAppDetailsCommittee.textContent = committee;
      if (membershipAppDetailsSkills) membershipAppDetailsSkills.textContent = skills;
      if (membershipAppDetailsPortfolio) membershipAppDetailsPortfolio.innerHTML = portfolio ? `<a class="btn btn-outline btn-xs" href="${escapeHtml(portfolio)}" target="_blank"><i class="fa-solid fa-arrow-up-right-from-square"></i> فتح</a>` : '—';
      if (membershipAppStatusSelect) membershipAppStatusSelect.value = statusKey;
      if (membershipAppDetailsTwitter) membershipAppDetailsTwitter.innerHTML = twitter ? `<a class="btn btn-outline btn-xs" href="${escapeHtml(twitter)}" target="_blank"><i class=\"fa-solid fa-arrow-up-right-from-square\"></i> فتح</a>` : '—';
      if (membershipAppDetailsInstagram) membershipAppDetailsInstagram.innerHTML = instagram ? `<a class="btn btn-outline btn-xs" href="${escapeHtml(instagram)}" target="_blank"><i class=\"fa-solid fa-arrow-up-right-from-square\"></i> فتح</a>` : '—';
      if (membershipAppDetailsLinkedin) membershipAppDetailsLinkedin.innerHTML = linkedin ? `<a class="btn btn-outline btn-xs" href="${escapeHtml(linkedin)}" target="_blank"><i class=\"fa-solid fa-arrow-up-right-from-square\"></i> فتح</a>` : '—';
      if (membershipAppDetailsAbout) membershipAppDetailsAbout.textContent = about || '—';
      openDialog?.(membershipAppDetailsDialog);
    } catch {}
  });

  membershipAppStatusSelect?.addEventListener('change', async (e) => {
    const idx = membershipAppDetailsIndex;
    if (!Number.isInteger(idx) || idx < 0 || idx >= (membershipApps?.length || 0)) return;
    const r = membershipApps[idx];
    const newKey = membershipAppStatusSelect.value;
    const oldRaw = (r.status || '').toString().trim().toLowerCase();
    r.status = newKey;
    try { save(KEYS.membership_apps, membershipApps); } catch {}
    try {
      if (sb && r.id != null) {
        await sb.from('membership_applications').update({ status: newKey }).eq('id', r.id);
      }
    } catch {
      r.status = oldRaw;
      try { save(KEYS.membership_apps, membershipApps); } catch {}
      try {
        membershipAppStatusSelect.value = (oldRaw === 'accepted' || oldRaw === 'approved' || oldRaw === 'accept' || oldRaw === 'ok' || oldRaw === 'done' || oldRaw === 'مقبول') ? 'accepted'
          : (oldRaw === 'rejected' || oldRaw === 'declined' || oldRaw === 'رفض' || oldRaw === 'مرفوض' || oldRaw === 'reject') ? 'rejected'
          : (oldRaw === 'interview' || oldRaw === 'interviewing' || oldRaw === 'scheduled' || oldRaw === 'مقابلة' || oldRaw === 'موعد' || oldRaw === 'مُقابلة') ? 'interview'
          : (oldRaw === 'review' || oldRaw === 'under_review' || oldRaw === 'in_review' || oldRaw === 'pending_review' || oldRaw === 'مراجعة' || oldRaw === 'قيد المراجعة') ? 'review'
          : 'pending';
      } catch {}
      try { alert('تعذر حفظ الحالة. حاول مرة أخرى.'); } catch {}
      return;
    }
    const row = document.querySelector(`tr[data-idx="${idx}"]`);
    if (row) {
      const badge = row.querySelector('[data-role="status-badge"]');
      if (badge) {
        const label = (newKey === 'accepted') ? 'مقبول' : (newKey === 'rejected') ? 'مرفوض' : (newKey === 'interview') ? 'مُقابلة' : (newKey === 'review') ? 'مراجعة' : 'قيد الانتظار';
        badge.textContent = label;
        badge.className = `status-badge status-${newKey}`;
      }
      const pctCell = row.querySelector('td[data-label="نسبة الإكمال"]');
      if (pctCell) {
        const fields = ['phone','email','degree','college','major','skills','preferred_committee','portfolio_url','status','social_twitter','social_instagram','social_linkedin','about'];
        const total = fields.length;
        let filled = 0;
        for (const k of fields) {
          let v = r[k];
          if (!v && k === 'preferred_committee') v = r.committee;
          if (typeof v === 'string') v = v.trim();
          if (v) filled++;
        }
        const pct = Math.round((filled * 100) / (total || 1));
        pctCell.textContent = `${pct}%`;
      }
    }
    try { applyMembershipFilters(); } catch {}
    try { renderMembershipStats(membershipApps); } catch {}
  });

  membershipAppAdminNoteSave?.addEventListener('click', async () => {
    const idx = membershipAppDetailsIndex;
    if (!Number.isInteger(idx) || idx < 0 || idx >= (membershipApps?.length || 0)) return;
    const r = membershipApps[idx];
    const note = (membershipAppAdminNote?.value || '').toString();
    // show saving state
    if (membershipAppAdminNoteStatus) {
      membershipAppAdminNoteStatus.style.display = '';
      membershipAppAdminNoteStatus.style.color = '#64748b';
      membershipAppAdminNoteStatus.textContent = 'جاري الحفظ...';
    }
    // Update local per-admin notes storage
    let uid = null, adminName = 'مستخدم';
    try {
      if (sb) {
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          uid = user.id;
          const md = user.user_metadata || {};
          adminName = md.display_name || user.email || adminName;
        }
      }
    } catch {}
    if (membershipAppAdminNoteAuthor) {
      try { membershipAppAdminNoteAuthor.textContent = adminName; } catch {}
    }
    if (uid) {
      try {
        const local = localMyMembershipNotesGet(uid);
        local[String(r.id)] = note;
        localMyMembershipNotesSet(uid, local);
      } catch {}
    }
    // Keep UI copy
    r.admin_note = note;
    try { save(KEYS.membership_apps, membershipApps); } catch {}
    let remoteOk = false;
    if (sb && r.id != null && uid) {
      try {
        // Upsert per-admin note
        const payload = { application_id: r.id, admin_user_id: uid, admin_name: adminName, note };
        let upErr = null;
        try {
          const { error } = await sb.from('membership_app_notes').upsert(payload, { onConflict: 'application_id,admin_user_id' });
          upErr = error || null;
        } catch (e1) {
          upErr = e1;
        }
        if (upErr) throw upErr;
        remoteOk = true;
      } catch (e) {
        const msg = e?.message || '';
        // If table/columns don't exist, treat as local-only save
        if (/(membership_app_notes|relation|table|not exist|PGRST)/i.test(msg)) {
          remoteOk = false;
        } else {
          if (membershipAppAdminNoteStatus) {
            membershipAppAdminNoteStatus.style.display = '';
            membershipAppAdminNoteStatus.style.color = '#ef4444';
            membershipAppAdminNoteStatus.textContent = 'تعذر الحفظ على الخادم';
          }
          return;
        }
      }
    }
    if (membershipAppAdminNoteStatus) {
      membershipAppAdminNoteStatus.style.display = '';
      membershipAppAdminNoteStatus.style.color = '#10b981';
      membershipAppAdminNoteStatus.textContent = remoteOk ? 'تم الحفظ ✓' : 'تم الحفظ محليًا';
      setTimeout(() => { try { membershipAppAdminNoteStatus.style.display = 'none'; } catch {} }, 2000);
    }
  });

  // Export membership application to members
  const exportToMembersBtn = document.getElementById('exportToMembersBtn');
  exportToMembersBtn?.addEventListener('click', async () => {
    const idx = membershipAppDetailsIndex;
    if (!Number.isInteger(idx) || idx < 0 || idx >= (membershipApps?.length || 0)) {
      alert('لم يتم تحديد طلب صحيح');
      return;
    }
    const app = membershipApps[idx];
    if (!app) {
      alert('لم يتم العثور على الطلب');
      return;
    }

    // Check if already accepted/exported
    const rawStatus = (app.status || '').toString().trim().toLowerCase();
    if (['accepted','approved','accept','ok','done','مقبول'].includes(rawStatus)) {
      if (!confirm('هذا الطلب مقبول بالفعل. هل تريد تصديره مرة أخرى؟')) {
        return;
      }
    }

    // Confirm export
    const name = app.full_name || app.name || 'هذا المتقدم';
    if (!confirm(`هل تريد تصدير "${name}" إلى أعضاء النادي؟\n\nسيتم نقل البيانات التالية:\n• الاسم\n• الجوال\n• البريد الإلكتروني\n• الدرجة العلمية\n• الكلية\n• التخصص\n• اللجنة${app.social_twitter ? '\n• تويتر' : ''}${app.social_instagram ? '\n• إنستقرام' : ''}${app.social_tiktok ? '\n• تيك توك' : ''}${app.social_linkedin ? '\n• لينكد إن' : ''}`)) {
      return;
    }

    // Prepare member data (only include social media if available)
    const memberData = {
      full_name: app.full_name || app.name || '',
      phone: app.phone || '',
      email: app.email || '',
      degree: app.degree || '',
      college: app.college || '',
      major: app.major || '',
      committee: app.preferred_committee || app.committee || '',
      created_at: new Date().toISOString(),
    };

    // Add social media handles only if they exist
    const twitter = (app.social_twitter || '').toString().trim();
    const instagram = (app.social_instagram || '').toString().trim();
    const tiktok = (app.social_tiktok || '').toString().trim();
    const linkedin = (app.social_linkedin || '').toString().trim();
    
    if (twitter) memberData.x_handle = twitter;
    if (instagram) memberData.instagram_handle = instagram;
    if (tiktok) memberData.tiktok_handle = tiktok;
    if (linkedin) memberData.linkedin_handle = linkedin;

    try {
      // Add to members array
      members.unshift(memberData);
      save(KEYS.members, members);

      // If Supabase is available, save there too
      if (sb) {
        const { error } = await sb.from('members').insert(memberData);
        if (error) throw error;
      }

      // Update application status to accepted
      app.status = 'accepted';
      save(KEYS.membership_apps, membershipApps);
      if (sb && app.id) {
        await sb.from('membership_applications').update({ status: 'accepted' }).eq('id', app.id);
      }

      // Update UI
      if (membershipAppStatusSelect) membershipAppStatusSelect.value = 'accepted';
      renderMembers();
      applyMembershipFilters();
      renderMembershipStats(membershipApps);

      // Show success message
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'success',
          title: 'تم التصدير بنجاح!',
          text: `تم إضافة ${name} إلى أعضاء النادي`,
          confirmButtonText: 'حسناً',
          confirmButtonColor: '#3d8fd6'
        });
      } else {
        alert('تم تصدير العضو بنجاح إلى أعضاء النادي! ✓');
      }
      
      // Close dialog
      try { membershipAppDetailsDialog?.close?.(); } catch {}
    } catch (err) {
      alert('حدث خطأ أثناء التصدير: ' + (err?.message || 'غير معروف'));
      // Rollback on error
      members.shift();
      save(KEYS.members, members);
      renderMembers();
    }
  });

  // ===== Bulk Export to Members =====
  const bulkExportToMembersBtn = document.getElementById('bulkExportToMembersBtn');
  const bulkExportToMembersDialog = document.getElementById('bulkExportToMembersDialog');
  const bulkExportStatusFilter = document.getElementById('bulkExportStatusFilter');
  const bulkExportCommitteeFilter = document.getElementById('bulkExportCommitteeFilter');
  const bulkExportCount = document.getElementById('bulkExportCount');
  const bulkExportList = document.getElementById('bulkExportList');
  const bulkExportToMembersSubmit = document.getElementById('bulkExportToMembersSubmit');

  // Populate committee filter options
  function refreshBulkExportCommitteeOptions() {
    if (!bulkExportCommitteeFilter) return;
    const list = Array.isArray(membershipApps) ? membershipApps : [];
    const committees = new Set();
    list.forEach((r) => {
      const raw = (r?.preferred_committee || r?.committee || '').toString().trim();
      if (raw) committees.add(raw);
    });
    const sorted = Array.from(committees).sort((a, b) => {
      try { return a.localeCompare(b, 'ar'); } catch { return String(a).localeCompare(String(b)); }
    });
    // Keep "all" option and add others
    const currentVal = bulkExportCommitteeFilter.value || 'all';
    bulkExportCommitteeFilter.innerHTML = '<option value="all">كل اللجان</option>';
    sorted.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      bulkExportCommitteeFilter.appendChild(opt);
    });
    bulkExportCommitteeFilter.value = currentVal;
  }

  // Get filtered applications based on status and committee
  function getBulkExportFilteredApps() {
    const list = Array.isArray(membershipApps) ? membershipApps : [];
    const statusFilter = bulkExportStatusFilter?.value || 'accepted';
    const committeeFilter = bulkExportCommitteeFilter?.value || 'all';

    return list.filter((r) => {
      // Filter by status
      const rawStatus = (r.status || '').toString().trim().toLowerCase();
      let statusKey = 'pending';
      if (['accepted','approved','accept','ok','done','مقبول'].includes(rawStatus)) statusKey = 'accepted';
      else if (['rejected','declined','رفض','مرفوض','reject'].includes(rawStatus)) statusKey = 'rejected';
      else if (['interview','interviewing','scheduled','مقابلة','موعد','مُقابلة'].includes(rawStatus)) statusKey = 'interview';
      else if (['review','under_review','in_review','pending_review','مراجعة','قيد المراجعة'].includes(rawStatus)) statusKey = 'review';

      if (statusFilter !== 'all' && statusKey !== statusFilter) return false;

      // Filter by committee
      if (committeeFilter !== 'all') {
        const appCommittee = (r?.preferred_committee || r?.committee || '').toString().trim();
        if (appCommittee !== committeeFilter) return false;
      }

      return true;
    });
  }

  // Update preview of applications to be exported
  function updateBulkExportPreview() {
    const filtered = getBulkExportFilteredApps();
    if (bulkExportCount) bulkExportCount.textContent = filtered.length;
    if (bulkExportList) {
      if (filtered.length === 0) {
        bulkExportList.innerHTML = '<div style="color:#94a3b8;font-style:italic">لا توجد طلبات متوافقة مع الفلاتر المختارة</div>';
      } else {
        const items = filtered.map((r, i) => {
          const name = escapeHtml(r.full_name || r.name || '—');
          const committee = escapeHtml((r?.preferred_committee || r?.committee || 'بدون لجنة').toString().trim());
          return `<div style="padding:6px 0;border-bottom:1px solid #e2e8f0">${i + 1}. ${name} - ${committee}</div>`;
        }).join('');
        bulkExportList.innerHTML = items;
      }
    }
  }

  // Open bulk export dialog
  bulkExportToMembersBtn?.addEventListener('click', () => {
    refreshBulkExportCommitteeOptions();
    updateBulkExportPreview();
    openDialog?.(bulkExportToMembersDialog);
  });

  // Update preview when filters change
  bulkExportStatusFilter?.addEventListener('change', updateBulkExportPreview);
  bulkExportCommitteeFilter?.addEventListener('change', updateBulkExportPreview);

  // Perform bulk export
  bulkExportToMembersSubmit?.addEventListener('click', async () => {
    const filtered = getBulkExportFilteredApps();
    
    if (filtered.length === 0) {
      alert('لا توجد طلبات للتصدير');
      return;
    }

    // Confirm export
    const confirmMsg = `هل تريد تصدير ${filtered.length} طلب(ات) إلى قائمة أعضاء النادي؟\n\nسيتم:\n• إضافة الأعضاء إلى قائمة أعضاء النادي\n• تحديث حالة الطلبات إلى "مقبول"`;
    if (!confirm(confirmMsg)) return;

    // Disable button during export
    if (bulkExportToMembersSubmit) bulkExportToMembersSubmit.disabled = true;

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    try {
      for (const app of filtered) {
        try {
          // Prepare member data
          const memberData = {
            full_name: app.full_name || app.name || '',
            phone: app.phone || '',
            email: app.email || '',
            degree: app.degree || '',
            college: app.college || '',
            major: app.major || '',
            committee: app.preferred_committee || app.committee || '',
            created_at: new Date().toISOString(),
          };

          // Add social media handles only if they exist
          const twitter = (app.social_twitter || '').toString().trim();
          const instagram = (app.social_instagram || '').toString().trim();
          const tiktok = (app.social_tiktok || '').toString().trim();
          const linkedin = (app.social_linkedin || '').toString().trim();
          
          if (twitter) memberData.x_handle = twitter;
          if (instagram) memberData.instagram_handle = instagram;
          if (tiktok) memberData.tiktok_handle = tiktok;
          if (linkedin) memberData.linkedin_handle = linkedin;

          // Add to members array
          members.unshift(memberData);
          save(KEYS.members, members);

          // If Supabase is available, save there too
          if (sb) {
            const { error } = await sb.from('members').insert(memberData);
            if (error) throw error;
          }

          // Update application status to accepted
          app.status = 'accepted';
          if (sb && app.id) {
            await sb.from('membership_applications').update({ status: 'accepted' }).eq('id', app.id);
          }

          successCount++;
        } catch (err) {
          failCount++;
          const name = app.full_name || app.name || 'غير معروف';
          errors.push(`${name}: ${err?.message || 'خطأ غير معروف'}`);
          // Rollback local changes on error
          members.shift();
        }
      }

      // Save updated membership apps
      save(KEYS.membership_apps, membershipApps);

      // Update UI
      renderMembers();
      applyMembershipFilters();
      renderMembershipStats(membershipApps);

      // Show result message
      let resultMsg = `تم التصدير بنجاح!\n\n`;
      resultMsg += `✅ تم تصدير ${successCount} عضو(أعضاء)`;
      if (failCount > 0) {
        resultMsg += `\n❌ فشل تصدير ${failCount} عضو(أعضاء)`;
        if (errors.length > 0) {
          resultMsg += `\n\nالأخطاء:\n${errors.slice(0, 5).join('\n')}`;
          if (errors.length > 5) resultMsg += `\n... و${errors.length - 5} أخطاء أخرى`;
        }
      }

      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: failCount === 0 ? 'success' : 'warning',
          title: failCount === 0 ? 'تم التصدير بنجاح!' : 'تم التصدير مع بعض الأخطاء',
          html: resultMsg.replace(/\n/g, '<br>'),
          confirmButtonText: 'حسناً',
          confirmButtonColor: '#3d8fd6'
        });
      } else {
        alert(resultMsg);
      }

      // Close dialog
      try { bulkExportToMembersDialog?.close?.(); } catch {}
    } catch (err) {
      alert('حدث خطأ أثناء التصدير: ' + (err?.message || 'غير معروف'));
    } finally {
      if (bulkExportToMembersSubmit) bulkExportToMembersSubmit.disabled = false;
    }
  });

  // PWA Install Button
  const installAppBtn = document.getElementById('installAppBtn');
  
  function isIOSLike() {
    try { return /iphone|ipad|ipod/i.test(navigator.userAgent || ''); } catch { return false; }
  }
  function updateInstallButtonVisibility() {
    if (!installAppBtn) return;
    let installed = false;
    try { if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) installed = true; } catch {}
    try { if (typeof navigator !== 'undefined' && 'standalone' in navigator && navigator.standalone) installed = true; } catch {}
    const hasPrompt = (typeof deferredInstallPrompt !== 'undefined' && !!deferredInstallPrompt);
    const ios = isIOSLike();
    const showBtn = (!installed && (hasPrompt || ios));
    installAppBtn.style.display = showBtn ? '' : 'none';
    const hintEl = document.getElementById('installAppHint');
    if (!hintEl) return;
    if (showBtn) { hintEl.style.display = 'none'; hintEl.textContent = ''; return; }
    let reason = '';
    if (installed) {
      reason = 'التطبيق مثبت بالفعل.';
    } else {
      const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '::1';
      const hasMf = !!document.querySelector('link[rel="manifest"]');
      if (!secure) reason = 'يجب فتح الصفحة عبر HTTPS أو localhost لظهور زر التثبيت.';
      else if (!hasMf) reason = 'ملف manifest غير معرف في الصفحة.';
      else if (!hasPrompt && !ios) reason = 'المتصفح لم يجهّز خيار التثبيت بعد. حاول إعادة فتح الصفحة أو التفاعل معها قليلًا.';
    }
    hintEl.textContent = reason;
    hintEl.style.display = reason ? '' : 'none';
    try {
      if (!installed && !hasPrompt && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration('./').then((reg) => {
          if (!reg && !reason) {
            hintEl.textContent = 'لم يتم تسجيل Service Worker بعد.';
            hintEl.style.display = '';
          }
        }).catch(()=>{});
      }
    } catch {}
  }
  installAppBtn?.addEventListener('click', async () => {
    try {
      if (!deferredInstallPrompt) {
        // iOS fallback: show guidance to add to home screen
        if (isIOSLike()) {
          alert('لتثبيت التطبيق على iOS: افتح الصفحة في Safari، ثم اضغط على زر المشاركة واختر "إضافة إلى الشاشة الرئيسية".');
        }
        return;
      }
      installAppBtn.disabled = true;
      const evt = deferredInstallPrompt;
      deferredInstallPrompt = null; // can only be used once
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      // If dismissed, keep the button hidden until another event fires
      updateInstallButtonVisibility();
    } catch {
      // ignore
    } finally {
      if (installAppBtn) installAppBtn.disabled = false;
    }
  });
  window.addEventListener('beforeinstallprompt', (e) => {
    try {
      e.preventDefault();
      deferredInstallPrompt = e;
      updateInstallButtonVisibility();
    } catch {}
  });
  window.addEventListener('appinstalled', () => {
    try {
      deferredInstallPrompt = null;
      updateInstallButtonVisibility();
    } catch {}
  });
  // Initial visibility check
  try { updateInstallButtonVisibility(); } catch {}

  // ===== Push Notifications =====
  const enablePushBtn = document.getElementById('enablePushBtn');
  const pushStatus = document.getElementById('pushStatus');
  let pushSubscription = null;
  
  // VAPID public key (you'll need to generate this - see instructions below)
  const VAPID_PUBLIC_KEY = 'BJnyHxX1YJwwukPoKFXH8BikhTuhmj2EY2Gs1x_Q-eSKuHr74s-9a2AUxvC_5JbmOGM0WH2v6E3YoakuQXkiP2c'; // TODO: Replace with your actual VAPID public key
  
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  
  async function checkPushPermission() {
    if (!('Notification' in window) || !('PushManager' in window)) {
      if (pushStatus) { pushStatus.textContent = 'المتصفح لا يدعم الإشعارات'; pushStatus.style.color = '#ef4444'; pushStatus.style.display = ''; }
      if (enablePushBtn) enablePushBtn.style.display = 'none';
      return;
    }
    const permission = Notification.permission;
    if (enablePushBtn) enablePushBtn.style.display = '';
    const isSubscribed = await checkExistingSubscription();
    if (permission === 'granted') {
      if (pushStatus) {
        pushStatus.textContent = isSubscribed ? 'الإشعارات مفعّلة ✓' : 'الإشعارات مفعّلة ولكن غير مشترك حالياً';
        pushStatus.style.color = isSubscribed ? '#10b981' : '#f59e0b';
        pushStatus.style.display = '';
      }
      if (enablePushBtn) {
        enablePushBtn.innerHTML = isSubscribed ? '<i class="fa-solid fa-bell-slash"></i> إيقاف الإشعارات' : '<i class="fa-solid fa-bell"></i> تفعيل الإشعارات';
        enablePushBtn.classList.toggle('btn-danger', !!isSubscribed);
        enablePushBtn.classList.toggle('btn-outline', !isSubscribed);
        enablePushBtn.disabled = false;
      }
    } else if (permission === 'denied') {
      if (pushStatus) {
        pushStatus.innerHTML = 'الإشعارات محظورة من إعدادات المتصفح. قم بالسماح من إعدادات الموقع ثم أعد المحاولة.';
        pushStatus.style.color = '#ef4444';
        pushStatus.style.display = '';
      }
      if (enablePushBtn) {
        enablePushBtn.disabled = false;
        enablePushBtn.innerHTML = '<i class="fa-solid fa-gear"></i> فتح إعدادات الإشعارات';
        enablePushBtn.classList.add('btn-outline');
        enablePushBtn.classList.remove('btn-danger');
      }
    } else {
      // default
      if (pushStatus) { pushStatus.textContent = 'قم بتفعيل الإشعارات لتلقي التنبيهات المهمة'; pushStatus.style.color = '#64748b'; pushStatus.style.display = ''; }
      if (enablePushBtn) {
        enablePushBtn.disabled = false;
        enablePushBtn.innerHTML = '<i class="fa-solid fa-bell"></i> تفعيل الإشعارات';
        enablePushBtn.classList.add('btn-outline');
        enablePushBtn.classList.remove('btn-danger');
      }
    }
  }
  
  async function checkExistingSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      pushSubscription = await reg.pushManager.getSubscription();
      return !!pushSubscription;
    } catch {
      return false;
    }
  }
  
  async function subscribeToPush() {
    try {
      const reg = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      pushSubscription = await reg.pushManager.getSubscription();
      if (pushSubscription) {
        console.log('Already subscribed:', pushSubscription);
        await savePushSubscription(pushSubscription);
        return pushSubscription;
      }
      
      // Subscribe to push notifications
      pushSubscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      
      console.log('Push subscription:', pushSubscription);
      await savePushSubscription(pushSubscription);
      return pushSubscription;
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      throw error;
    }
  }
  
  async function unsubscribeFromPush() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await removePushSubscription(subscription);
        pushSubscription = null;
      }
    } catch (error) {
      console.error('Failed to unsubscribe from push:', error);
      throw error;
    }
  }
  
  async function savePushSubscription(subscription) {
    if (!sb) return;
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      
      const subscriptionData = subscription.toJSON();
      const { error } = await sb
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionData.endpoint,
          p256dh: subscriptionData.keys?.p256dh,
          auth: subscriptionData.keys?.auth,
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Failed to save push subscription:', error);
      }
    } catch (e) {
      console.error('Failed to save push subscription:', e);
    }
  }
  
  async function removePushSubscription(subscription) {
    if (!sb) return;
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      
      const subscriptionData = subscription.toJSON();
      const { error } = await sb
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', subscriptionData.endpoint);
      
      if (error) {
        console.error('Failed to remove push subscription:', error);
      }
    } catch (e) {
      console.error('Failed to remove push subscription:', e);
    }
  }
  
  enablePushBtn?.addEventListener('click', async () => {
    try {
      enablePushBtn.disabled = true;
      const permission = Notification.permission;
      if (permission === 'default') {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
          await subscribeToPush();
        }
      } else if (permission === 'granted') {
        const hasSubscription = await checkExistingSubscription();
        if (hasSubscription) {
          await unsubscribeFromPush();
        } else {
          await subscribeToPush();
        }
      } else if (permission === 'denied') {
        // Show guidance to open site settings
        if (pushStatus) {
          pushStatus.innerHTML = 'الإشعارات محظورة. افتح إعدادات الموقع من المتصفح واسمح بها ثم أعد المحاولة.';
          pushStatus.style.color = '#ef4444';
          pushStatus.style.display = '';
        }
      }
    } catch (error) {
      console.error('Push notification toggle error:', error);
    } finally {
      enablePushBtn.disabled = false;
      await checkPushPermission();
    }
  });

  // React to permission changes (if supported)
  try {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'notifications' }).then((perm) => {
        perm.onchange = () => { try { checkPushPermission(); } catch {} };
      }).catch(()=>{});
    }
  } catch {}
  
  // Check push permission on page load if profile section is visible
  try {
    const profileSection = document.getElementById('section-profile');
    if (profileSection && !profileSection.hidden) {
      checkPushPermission();
    }
  } catch {}
  
  // ===== Push Notification Sending Interface =====
  const pushNotificationForm = document.getElementById('pushNotificationForm');
  const testPushBtn = document.getElementById('testPushBtn');
  const pushPreviewBtn = document.getElementById('pushPreviewBtn');
  const pushToAll = document.getElementById('pushToAll');
  const pushUserSelect = document.getElementById('pushUserSelect');
  const pushStats = document.getElementById('pushStats');
  const pushStatsContent = document.getElementById('pushStatsContent');
  
  // دالة إرسال الإشعارات عبر Edge Function
  async function sendPushNotification(userIds, title, body, url) {
    try {
      const response = await callFunction('send-push-notification', {
        method: 'POST',
        body: {
          user_ids: userIds, // null = إرسال للجميع
          all_users: !userIds || userIds.length === 0,
          payload: {
            title,
            body,
            url: url || 'https://www.adeeb.club/admin/admin.html',
            icon: 'https://www.adeeb.club/LOGO.png',
            badge: 'https://www.adeeb.club/admin/icons/icon-72x72.png'
          }
        }
      });
      
      return response;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      throw error;
    }
  }
  
  // معالجة تبديل checkbox إرسال للجميع
  pushToAll?.addEventListener('change', () => {
    if (pushUserSelect) {
      pushUserSelect.style.display = pushToAll.checked ? 'none' : '';
    }
  });
  
  // معالجة إرسال النموذج
  pushNotificationForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('pushTitle')?.value?.trim();
    const body = document.getElementById('pushBody')?.value?.trim();
    const url = document.getElementById('pushUrl')?.value?.trim();
    const toAll = document.getElementById('pushToAll')?.checked;
    
    if (!title || !body) {
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: 'يرجى إدخال عنوان ونص الإشعار',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#3d8fd6'
      });
      return;
    }
    
    let userIds = null;
    if (!toAll) {
      const select = document.getElementById('pushUserIds');
      const selected = Array.from(select?.selectedOptions || []).map(opt => opt.value).filter(v => v);
      if (selected.length === 0) {
        Swal.fire({
          icon: 'error',
          title: 'خطأ',
          text: 'يرجى اختيار مستخدمين أو تفعيل الإرسال للجميع',
          confirmButtonText: 'حسناً',
          confirmButtonColor: '#3d8fd6'
        });
        return;
      }
      userIds = selected;
    }
    
    // تأكيد الإرسال
    const result = await Swal.fire({
      icon: 'question',
      title: 'تأكيد الإرسال',
      html: `
        <div style="text-align:right">
          <p><strong>العنوان:</strong> ${escapeHtml(title)}</p>
          <p><strong>النص:</strong> ${escapeHtml(body)}</p>
          ${url ? `<p><strong>الرابط:</strong> ${escapeHtml(url)}</p>` : ''}
          <p><strong>المستلمون:</strong> ${toAll ? 'جميع المستخدمين المشتركين' : `${userIds.length} مستخدم محدد`}</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'إرسال',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#3d8fd6'
    });
    
    if (!result.isConfirmed) return;
    
    // إرسال الإشعار
    try {
      Swal.fire({
        title: 'جاري الإرسال...',
        html: 'يرجى الانتظار',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      const response = await sendPushNotification(userIds, title, body, url);
      
      Swal.fire({
        icon: 'success',
        title: 'تم الإرسال بنجاح',
        html: `
          <div>
            <p>تم إرسال الإشعارات بنجاح</p>
            ${response?.sent ? `<p>✅ نجح: ${response.sent}</p>` : ''}
            ${response?.failed ? `<p>❌ فشل: ${response.failed}</p>` : ''}
          </div>
        `,
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#3d8fd6'
      });
      
      // عرض الإحصائيات
      if (pushStats && pushStatsContent) {
        pushStats.style.display = '';
        pushStatsContent.innerHTML = `
          <div style="display:grid;gap:8px">
            <div>✅ تم الإرسال بنجاح: ${response?.sent || 0}</div>
            ${response?.failed > 0 ? `<div>❌ فشل الإرسال: ${response.failed}</div>` : ''}
            <div>📅 التوقيت: ${new Date().toLocaleString('ar-SA')}</div>
          </div>
        `;
      }
      
      // مسح النموذج
      pushNotificationForm.reset();
      
    } catch (error) {
      console.error('Push notification error:', error);
      Swal.fire({
        icon: 'error',
        title: 'خطأ في الإرسال',
        text: error.message || 'حدث خطأ أثناء إرسال الإشعارات',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#3d8fd6'
      });
    }
  });
  
  // زر الإشعار التجريبي
  testPushBtn?.addEventListener('click', async () => {
    try {
      // تحقق من أن الإشعارات مفعلة
      if (Notification.permission !== 'granted') {
        Swal.fire({
          icon: 'warning',
          title: 'الإشعارات غير مفعلة',
          text: 'يرجى تفعيل الإشعارات أولاً من قسم "ملفي"',
          confirmButtonText: 'حسناً',
          confirmButtonColor: '#3d8fd6'
        });
        return;
      }
      
      testPushBtn.disabled = true;
      
      // إرسال إشعار تجريبي لنفسك فقط
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('غير مسجل الدخول');
      
      const response = await sendPushNotification(
        [user.id],
        '🔔 إشعار تجريبي',
        'هذا إشعار تجريبي من نادي أديب. إذا وصلك هذا الإشعار فالنظام يعمل بنجاح!',
        'https://www.adeeb.club/admin/admin.html'
      );
      
      Swal.fire({
        icon: 'success',
        title: 'تم إرسال الإشعار التجريبي',
        text: 'يجب أن يصلك الإشعار خلال ثوانٍ',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#3d8fd6'
      });
      
    } catch (error) {
      console.error('Test notification error:', error);
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: 'حدث خطأ في إرسال الإشعار التجريبي',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#3d8fd6'
      });
    } finally {
      if (testPushBtn) testPushBtn.disabled = false;
    }
  });
  
  // زر المعاينة
  pushPreviewBtn?.addEventListener('click', () => {
    const title = document.getElementById('pushTitle')?.value?.trim() || 'عنوان الإشعار';
    const body = document.getElementById('pushBody')?.value?.trim() || 'نص الإشعار';
    
    // إظهار إشعار محلي للمعاينة
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: 'https://www.adeeb.club/LOGO.png',
        badge: 'https://www.adeeb.club/admin/icons/icon-72x72.png',
        dir: 'rtl',
        lang: 'ar',
        tag: 'preview'
      });
    } else {
      Swal.fire({
        title,
        text: body,
        imageUrl: 'https://www.adeeb.club/LOGO.png',
        imageWidth: 80,
        imageHeight: 80,
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#3d8fd6'
      });
    }
  });

  // Edge Functions base URL (derived from project URL)
  const FUNCTIONS_BASE = (window.SUPABASE_URL || '').replace('.supabase.co', '.functions.supabase.co');

  async function callFunction(name, { method = 'GET', body = null, returnFormat = 'data' } = {}) {
    if (!sb) throw new Error('Supabase not initialized');
    if (!FUNCTIONS_BASE) throw new Error('Functions base URL not configured');
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('not-authenticated');
    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': window.SUPABASE_ANON_KEY || '',
      'Content-Type': 'application/json',
    };
    const res = await fetch(`${FUNCTIONS_BASE}/${name}`, { method, headers, body: body ? JSON.stringify(body) : null });
    const text = await res.text();
    let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) {
      const msg = json?.message || json?.error || res.statusText || `HTTP ${res.status}`;
      const error = new Error(msg);
      if (returnFormat === 'object') {
        return { data: null, error };
      }
      throw error;
    }
    // للتوافق مع الاستدعاءات الموجودة
    if (returnFormat === 'object') {
      return { data: json, error: null };
    }
    return json;
  }

  // ===== Idea Topics (Admin CRUD) =====
  function localTopicsGet() { try { const raw = localStorage.getItem(KEYS.topics); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
  function localTopicsSet(arr) { try { localStorage.setItem(KEYS.topics, JSON.stringify(Array.isArray(arr) ? arr : [])); } catch {} }
  async function fetchTopicsAdmin() {
    if (sb) {
      try {
        const { data, error } = await sb
          .from('idea_topics')
          .select('id, title, description, image_url, visible, order, created_at')
          .order('order', { ascending: true, nullsFirst: true })
          .order('created_at', { ascending: false });
        if (error) throw error;
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.warn('idea_topics fetch (admin) failed', e);
      }
    }
    return localTopicsGet();
  }
  function renderIdeaTopicsList(rows) {
    if (!ideaTopicsList) return;
    ideaTopicsList.innerHTML = '';
    const list = Array.isArray(rows) ? rows : [];
    if (ideaTopicsEmpty) ideaTopicsEmpty.style.display = list.length ? 'none' : '';
    list.forEach((row, idx) => {
      const node = el(`
        <div class="card draggable-card" data-idx="${idx}" draggable="true">
          <span class="order-chip">#${(row.order ?? (idx+1))}</span>
          <div class="card__media">${row.image_url ? `<img src="${escapeHtml(row.image_url)}" alt="${escapeHtml(row.title||'موضوع')}" onerror="this.style.display='none'"/>` : ''}</div>
          <div class="card__body">
            <div class="card__title"><i class="fa-solid fa-book-open"></i> ${escapeHtml(row.title || '')}</div>
            ${row.description ? `<p class="card__text" style="color:#64748b; line-height:1.6">${escapeHtml(row.description)}</p>` : ''}
            <div class="card__actions">
              <button class="btn btn-outline" data-act="up" data-idx="${idx}"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="btn btn-outline" data-act="down" data-idx="${idx}"><i class="fa-solid fa-arrow-down"></i></button>
              <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-regular fa-trash-can"></i> حذف</button>
            </div>
          </div>
        </div>
      `);
      ideaTopicsList.appendChild(node);
    });
    setupListDnD?.(ideaTopicsList, topics, KEYS.topics, 'idea_topics', loadIdeaTopicsAdmin);
  }
  async function loadIdeaTopicsAdmin() {
    const rows = await fetchTopicsAdmin();
    topics = rows.slice();
    renderIdeaTopicsList(rows);
    // Re-render ideas to reflect updated topic titles/grouping
    try { if (ideaBoardList) renderIdeaBoardSimpleList(lastIdeaRows); } catch {}
  }
  async function uploadTopicImageIfAny() {
    const file = topicImageFileInput?.files && topicImageFileInput.files[0];
    if (!file) return null;
    if (!sb) return null;
    const bucket = 'adeeb-site';
    const ext = (file.name.split('.').pop() || getExtFromType(file.type, 'jpg')).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `topics/topic-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
    const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر الحصول على رابط الصورة');
    return publicUrl;
  }
  addTopicBtn?.addEventListener('click', () => {
    topicEditingIndex = null;
    topicForm?.reset?.();
    if (topicImagePreview) { topicImagePreview.src = ''; }
    if (topicImagePreviewWrap) topicImagePreviewWrap.style.display = 'none';
    openDialog?.(topicDialog);
  });
  topicImageFileInput?.addEventListener('change', () => {
    const file = topicImageFileInput.files && topicImageFileInput.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (topicImagePreview) topicImagePreview.src = url;
      if (topicImagePreviewWrap) topicImagePreviewWrap.style.display = '';
    } else {
      if (topicImagePreviewWrap) topicImagePreviewWrap.style.display = 'none';
    }
  });
  topicClearImageBtn?.addEventListener('click', (e)=>{ e.preventDefault(); if (topicImageFileInput) topicImageFileInput.value = ''; if (topicImagePreviewWrap) topicImagePreviewWrap.style.display='none'; });
  let topicEditingIndex = null;
  ideaTopicsList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (!Number.isInteger(idx) || idx < 0 || idx >= topics.length) return;
    if (act === 'up' || act === 'down') {
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(topics.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = topics.splice(idx, 1);
      topics.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(topics, KEYS.topics, 'idea_topics').then(() => {
        renderIdeaTopicsList(topics);
      });
      return;
    }
    if (act === 'edit') {
      topicEditingIndex = idx;
      const cur = topics[idx];
      if (topicTitleInput) topicTitleInput.value = cur.title || '';
      if (topicDescInput) topicDescInput.value = cur.description || '';
      if (topicVisibleInput) topicVisibleInput.checked = (cur.visible ?? true);
      if (topicImagePreview && cur.image_url) topicImagePreview.src = cur.image_url;
      if (topicImagePreviewWrap) topicImagePreviewWrap.style.display = cur.image_url ? '' : 'none';
      openDialog?.(topicDialog);
      return;
    }
    if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = topics[idx];
      if (sb && cur.id) {
        sb.from('idea_topics').delete().eq('id', cur.id).then(({ error }) => {
          if (error) return alert('فشل الحذف: ' + error.message);
          topics.splice(idx, 1);
          renderIdeaTopicsList(topics);
        });
      } else {
        topics.splice(idx, 1);
        save(KEYS.topics, topics);
        renderIdeaTopicsList(topics);
      }
      return;
    }
  });
  topicForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      title: (topicTitleInput?.value || '').trim(),
      description: (topicDescInput?.value || '').trim() || null,
      visible: !!(topicVisibleInput?.checked),
    };
    if (!data.title) { alert('الرجاء إدخال العنوان'); return; }
    try {
      let finalImageUrl = null;
      const uploaded = await uploadTopicImageIfAny();
      if (uploaded) finalImageUrl = uploaded;
      if (sb) {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
        const payload = { title: data.title, description: data.description, image_url: finalImageUrl, visible: data.visible, order: (topicEditingIndex !== null) ? (topics[topicEditingIndex]?.order ?? null) : null };
        const payloadNoOrder = { title: data.title, description: data.description, image_url: finalImageUrl, visible: data.visible };
        if (topicEditingIndex === null) {
          let row, error;
          ({ data: row, error } = await sb.from('idea_topics').insert(payload).select('*').single());
          if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
            const res2 = await sb.from('idea_topics').insert(payloadNoOrder).select('*').single();
            if (res2.error) return alert('فشل الحفظ: ' + res2.error.message);
            topics.unshift({ ...res2.data, order: payload.order });
          } else if (error) {
            return alert('فشل الحفظ: ' + error.message);
          } else {
            topics.unshift(row);
          }
          renderIdeaTopicsList(topics);
          closeDialog?.(topicDialog);
        } else {
          const id = topics[topicEditingIndex]?.id;
          if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
          let row, error;
          ({ data: row, error } = await sb.from('idea_topics').update(payload).eq('id', id).select('*').single());
          if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
            const res2 = await sb.from('idea_topics').update(payloadNoOrder).eq('id', id).select('*').single();
            if (res2.error) return alert('فشل التحديث: ' + res2.error.message);
            topics[topicEditingIndex] = { ...res2.data, order: payload.order };
          } else if (error) {
            return alert('فشل التحديث: ' + error.message);
          } else {
            topics[topicEditingIndex] = row;
          }
          renderIdeaTopicsList(topics);
          closeDialog?.(topicDialog);
        }
      } else {
        const item = { title: data.title, description: data.description, image_url: finalImageUrl, visible: data.visible, order: (topicEditingIndex !== null) ? (topics[topicEditingIndex]?.order ?? null) : null };
        if (topicEditingIndex === null) topics.unshift(item); else topics[topicEditingIndex] = item;
        save(KEYS.topics, topics);
        renderIdeaTopicsList(topics);
        closeDialog?.(topicDialog);
      }
    } catch (err) {
      alert('فشل الحفظ: ' + (err?.message || 'غير معروف'));
    }
  });
  ideaTopicsRefreshBtn?.addEventListener('click', async (e) => { e.preventDefault(); await loadIdeaTopicsAdmin(); });

  // ===== Schedule (Monthly Calendar) =====
  // Load schedule as a map { 'YYYY-MM-DD': Array<{ title, notes } > }
  let schedule = (() => {
    try {
      const raw = localStorage.getItem(KEYS.schedule);
      const obj = raw ? JSON.parse(raw) : {};
      return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
    } catch (e) { return {}; }
  })();
  function saveSchedule() { try { localStorage.setItem(KEYS.schedule, JSON.stringify(schedule)); } catch {}
  }

  // Normalize legacy schedule values (object -> array)
  function itemsFrom(val) {
    if (Array.isArray(val)) {
      return val.filter(Boolean).map((it) => ({ title: (it?.title || null), notes: (it?.notes || null) }));
    }
    if (val && typeof val === 'object') {
      return [{ title: (val.title || null), notes: (val.notes || null) }];
    }
    return [];
  }
  (function migrateScheduleToArrays() {
    let changed = false;
    for (const k in schedule) {
      if (!Array.isArray(schedule[k])) { schedule[k] = itemsFrom(schedule[k]); changed = true; }
    }
    if (changed) saveSchedule();
  })();

  // Calendar view state (month index 0-11)
  let viewYear = (new Date()).getFullYear();
  let viewMonth = (new Date()).getMonth();

  function arMonthLabel(y, m) {
    try { return new Date(y, m, 1).toLocaleDateString('ar', { month: 'long', year: 'numeric' }); } catch { return `${y}/${m+1}`; }
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function dateKey(y, m, d) { return `${y}-${pad2(m+1)}-${pad2(d)}`; }
  function isSameDate(a, b) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
  function keyFromDate(dt) { return dateKey(dt.getFullYear(), dt.getMonth(), dt.getDate()); }
  function getGridRange(y, m) {
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 1) % 7; // Saturday-first
    const start = new Date(y, m, 1 - offset);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 41);
    return { start, end };
  }

  async function loadScheduleForCurrentGrid() {
    if (!sb) return; // local only
    const { start, end } = getGridRange(viewYear, viewMonth);
    const startKey = keyFromDate(start);
    const endKey = keyFromDate(end);
    try {
      const { data, error } = await sb
        .from('schedule_entries')
        .select('date, title, notes, position')
        .gte('date', startKey)
        .lte('date', endKey)
        .order('date', { ascending: true })
        .order('position', { ascending: true })
      ;
      if (error) throw error;
      // Clear the range
      const keysInRange = [];
      for (let i=0;i<42;i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        keysInRange.push(keyFromDate(d));
      }
      keysInRange.forEach(k => { delete schedule[k]; });
      // Fill from DB
      if (Array.isArray(data)) {
        for (const row of data) {
          const k = String(row.date).slice(0,10);
          const arr = schedule[k] = schedule[k] || [];
          arr.push({ title: row.title || null, notes: row.notes || null, position: row.position ?? null });
        }
      }
      saveSchedule();
      renderSchedule();
    } catch (err) {
      console.error('Failed to load schedule from DB:', err);
    }
  }
  function buildDaysHeadOnce() {
    if (!calendarDaysHead || calendarDaysHead._built) return;
    const days = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    calendarDaysHead.innerHTML = days.map(d => `<div class="day">${d}</div>`).join('');
    calendarDaysHead._built = true;
  }
  function truncate(str, n) { if (!str) return ''; const s = String(str); return s.length>n ? s.slice(0,n)+'…' : s; }

  function renderSchedule() {
    if (!calendarGrid) return;
    buildDaysHeadOnce();
    // Update month label
    if (calMonthLabel) calMonthLabel.textContent = arMonthLabel(viewYear, viewMonth);
    calendarGrid.innerHTML = '';
    const first = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Saturday-first offset: JS getDay(): 0=Sunday..6=Saturday -> offset=(day+1)%7
    const offset = (first.getDay() + 1) % 7;
    const totalCells = 42; // 6 rows * 7 cols
    const startDate = new Date(viewYear, viewMonth, 1 - offset);
    const today = new Date();

    for (let i=0;i<totalCells;i++) {
      const cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const inThisMonth = cur.getMonth() === viewMonth;
      const key = dateKey(cur.getFullYear(), cur.getMonth(), cur.getDate());
      const items = itemsFrom(schedule[key]);
      const cell = document.createElement('div');
      cell.className = 'calendar-cell' + (inThisMonth ? '' : ' other-month') + (isSameDate(cur, today) ? ' today' : '') + (items.length ? ' has-content' : '');
      cell.setAttribute('data-date', key);
      const firstItem = items[0] || null;
      const restCount = Math.max(0, items.length - 1);
      cell.innerHTML = `
        <div class="date-badge">${cur.getDate()}</div>
        ${restCount ? `<span class="count-chip" title="${items.length} عناصر">+${restCount}</span>` : ''}
        ${firstItem ? `<div class="content" title="${((firstItem.title || firstItem.notes || '') + '').replace(/"/g,'&quot;')}">${firstItem.title ? truncate(firstItem.title, 40) : truncate(firstItem.notes || '', 50)}</div>` : ''}
      `;
      calendarGrid.appendChild(cell);
    }
    // Also refresh the International Days table below the grid
    renderIntlDaysTable();
  }

  calPrevBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    viewMonth -= 1; if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    renderSchedule();
    loadScheduleForCurrentGrid();
  });

  // ===== Idea Board (Admin Moderation) =====
  function localIdeasGet() { try { const raw = localStorage.getItem(KEYS.ideas); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
  function localIdeasSet(arr) { try { localStorage.setItem(KEYS.ideas, JSON.stringify(Array.isArray(arr) ? arr : [])); } catch {} }
  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fmtArDateTime(iso){ try { return new Date(iso).toLocaleString('ar'); } catch { return iso || ''; } }

  async function fetchIdeasAdmin() {
    if (sb) {
      try {
        const { data, error } = await sb
          .from('idea_board')
          .select('id, title, content, author_name, image_url, image_key, visible, pinned, created_at, topic_id')
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false });
        if (error) throw error;
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.warn('idea_board fetch (admin) failed', e);
      }
    }
    return localIdeasGet();
  }

  // ===== Idea Board (Admin): Simplified list + details modal =====
  let lastIdeaRows = [];

  function renderIdeaBoardSimpleList(rows) {
    if (!ideaBoardList) return;
    ideaBoardList.innerHTML = '';
    const list = Array.isArray(rows) ? rows : [];
    lastIdeaRows = list.slice();
    if (ideaBoardEmpty) ideaBoardEmpty.style.display = list.length ? 'none' : '';

    // Build groups by topic_id
    const tlist = Array.isArray(topics) ? topics.slice() : [];
    const tmap = new Map(tlist.map(t => [String(t.id), t]));
    const groups = new Map();
    list.forEach((row) => {
      const key = row.topic_id ? String(row.topic_id) : '__none__';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    const sortItems = (arr) => arr.sort((a,b) => {
      const p = (b.pinned === true) - (a.pinned === true);
      if (p) return p;
      try { return new Date(b.created_at) - new Date(a.created_at); } catch { return 0; }
    });

    function renderGroup(title, desc, key) {
      const items = sortItems(groups.get(key) || []);
      if (!items.length) return;
      const wrap = document.createElement('section');
      wrap.className = 'topic-group';
      const safeTitle = escapeHtml(title || 'بدون موضوع');
      wrap.innerHTML = `
        <header class="topic-group__head">
          <div class="topic-group__title">${safeTitle}</div>
          <div class="topic-group__meta">
            <span class="topic-group__count">${items.length}</span>
          </div>
        </header>
        <div class="topic-group__list"></div>
      `;
      const listEl = wrap.querySelector('.topic-group__list');
      items.forEach((row) => {
        const item = document.createElement('div');
        item.className = 'simple-list__item';
        const title = String(row.title || 'فكرة');
        const chips = [
          row.pinned ? '<span class="chip active">مثبّت</span>' : '',
          (row.visible === false) ? '<span class="chip">مخفي</span>' : ''
        ].filter(Boolean).join(' ');
        item.innerHTML = `
          <div class="simple-list__title" title="${escapeHtml(title)}">${escapeHtml(title)} ${chips ? ('&nbsp;' + chips) : ''}</div>
          <div class="simple-list__actions">
            <button class="btn btn-outline btn-xs view-idea" data-id="${row.id}" aria-label="عرض التفاصيل"><i class="fa-solid fa-eye"></i></button>
          </div>
        `;
        listEl.appendChild(item);
      });
      ideaBoardList.appendChild(wrap);
    }

    // Render groups in topics order
    tlist.forEach(t => {
      const key = String(t.id);
      renderGroup(t.title || 'موضوع', t.description || '', key);
    });
    // Render groups not present in topics list (unknown topics)
    groups.forEach((arr, key) => {
      if (key === '__none__') return;
      if (!tmap.has(String(key))) {
        renderGroup('موضوع غير معروف', '', key);
      }
    });
    // Finally, render unassigned group
    if (groups.has('__none__')) {
      renderGroup('بدون موضوع', '', '__none__');
    }
  }

  function openIdeaDetails(row){
    if (!row) return;
    try {
      if (ideaDetailsTitle) ideaDetailsTitle.textContent = row.title || 'فكرة';
      if (ideaDetailsAuthor) ideaDetailsAuthor.textContent = row.author_name || 'مجهول';
      if (ideaDetailsDate) ideaDetailsDate.textContent = fmtArDateTime(row.created_at);
      if (ideaDetailsTopic) {
        let t = '—';
        try {
          const tlist = Array.isArray(topics) ? topics : [];
          const found = tlist.find(tp => String(tp.id) === String(row.topic_id));
          t = found?.title ? String(found.title) : '—';
        } catch {}
        ideaDetailsTopic.textContent = t;
      }
      if (ideaDetailsContent) ideaDetailsContent.textContent = row.content || '';
      // Stash current id on the action buttons for convenience
      const id = row.id;
      if (ideaPinToggleBtn) ideaPinToggleBtn.dataset.id = id;
      if (ideaVisToggleBtn) ideaVisToggleBtn.dataset.id = id;
      if (ideaDeleteBtn) ideaDeleteBtn.dataset.id = id;
      // Update buttons' labels according to state
      try {
        if (ideaPinToggleBtn) ideaPinToggleBtn.innerHTML = row.pinned
          ? '<i class="fa-solid fa-thumbtack"></i> إزالة التثبيت'
          : '<i class="fa-solid fa-thumbtack"></i> تثبيت';
        if (ideaVisToggleBtn) ideaVisToggleBtn.innerHTML = row.visible
          ? '<i class="fa-solid fa-eye-slash"></i> إخفاء'
          : '<i class="fa-solid fa-eye"></i> إظهار';
      } catch {}
      openDialog?.(ideaDetailsDialog);
    } catch {}
  }

  async function loadIdeaBoardAdmin() {
    const rows = await fetchIdeasAdmin();
    renderIdeaBoardSimpleList(rows);
  }

  ideaBoardRefreshBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await loadIdeaBoardAdmin();
  });

  // Delegated: open details from simplified list
  if (ideaBoardList) {
    ideaBoardList.addEventListener('click', (e) => {
      const btn = e.target.closest?.('.view-idea');
      if (!btn) return;
      const id = btn.dataset.id;
      const row = lastIdeaRows.find(r => String(r.id) === String(id));
      if (row) openIdeaDetails(row);
    });
  }

  // Dialog actions

  ideaPinToggleBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const id = ideaPinToggleBtn?.dataset?.id;
    if (!id) return;
    try {
      if (!sb) {
        const arr = localIdeasGet();
        const idx = arr.findIndex(r => String(r.id) === String(id));
        if (idx === -1) return;
        arr[idx].pinned = !arr[idx].pinned;
        localIdeasSet(arr);
        await loadIdeaBoardAdmin();
        // reflect in dialog
        const row = arr[idx];
        openIdeaDetails(row);
        return;
      }
      const { data: row } = await sb.from('idea_board').select('pinned').eq('id', id).maybeSingle();
      const cur = !!(row?.pinned);
      const { error } = await sb.from('idea_board').update({ pinned: !cur }).eq('id', id);
      if (error) throw error;
      await loadIdeaBoardAdmin();
      const updated = lastIdeaRows.find(r => String(r.id) === String(id));
      if (updated) openIdeaDetails(updated);
    } catch (err) {
      alert('فشل العملية: ' + (err?.message || 'غير معروف'));
    }
  });

  ideaVisToggleBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const id = ideaVisToggleBtn?.dataset?.id;
    if (!id) return;
    try {
      if (!sb) {
        const arr = localIdeasGet();
        const idx = arr.findIndex(r => String(r.id) === String(id));
        if (idx === -1) return;
        arr[idx].visible = !arr[idx].visible;
        localIdeasSet(arr);
        await loadIdeaBoardAdmin();
        const row = arr[idx];
        openIdeaDetails(row);
        return;
      }
      const { data: row } = await sb.from('idea_board').select('visible').eq('id', id).maybeSingle();
      const cur = !!(row?.visible);
      const { error } = await sb.from('idea_board').update({ visible: !cur }).eq('id', id);
      if (error) throw error;
      await loadIdeaBoardAdmin();
      const updated = lastIdeaRows.find(r => String(r.id) === String(id));
      if (updated) openIdeaDetails(updated);
    } catch (err) {
      alert('فشل العملية: ' + (err?.message || 'غير معروف'));
    }
  });

  ideaDeleteBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const id = ideaDeleteBtn?.dataset?.id;
    if (!id) return;
    if (!confirm('تأكيد الحذف؟')) return;
    try {
      if (!sb) {
        const arr = localIdeasGet();
        const idx = arr.findIndex(r => String(r.id) === String(id));
        if (idx === -1) return;
        arr.splice(idx, 1);
        localIdeasSet(arr);
        await loadIdeaBoardAdmin();
        closeDialog?.(ideaDetailsDialog);
        return;
      }
      // fetch image key before deletion
      let imgKey = null;
      try {
        const f = await sb.from('idea_board').select('image_key').eq('id', id).maybeSingle();
        imgKey = f?.data?.image_key || null;
      } catch {}
      const { error } = await sb.from('idea_board').delete().eq('id', id);
      if (error) throw error;
      if (imgKey) {
        try { await sb.storage.from('idea-board').remove([imgKey]); } catch {}
      }
      await loadIdeaBoardAdmin();
      closeDialog?.(ideaDetailsDialog);
    } catch (err) {
      alert('فشل العملية: ' + (err?.message || 'غير معروف'));
    }
  });

  function openMemberDetails(idx) {
    const m = members?.[idx];
    if (!m) return;
    const safe = (v) => (v && String(v).trim()) ? String(v) : '—';
    const fmtDate = (v) => {
      try {
        if (!v) return '—';
        const date = new Date(v);
        const monthName = date.toLocaleDateString('ar', { month: 'long' });
        const fullDate = date.toLocaleDateString('ar', { year: 'numeric', month: '2-digit', day: '2-digit' });
        return `ولد في ${monthName} ${fullDate}`;
      } catch { return safe(v); }
    };
    const xh = m.x_handle || '';
    const ig = m.instagram_handle || '';
    const tk = m.tiktok_handle || '';
    const li = m.linkedin_handle || '';
    const xUrl = xh ? `https://x.com/${String(xh).replace(/^@/, '')}` : '';
    const igUrl = ig ? `https://instagram.com/${String(ig).replace(/^@/, '')}` : '';
    const tkUrl = tk ? `https://tiktok.com/@${String(tk).replace(/^@/, '')}` : '';
    const liUrl = li ? `https://linkedin.com/in/${String(li).replace(/^@/, '')}` : '';
    
    const committee = m.committee || 'بدون لجنة';
    const committeeIcon = getCommitteeIcon(committee);
    const isComplete = isMemberDataComplete(m);
    const avatar = (m.avatar || m.avatar_url) || '';
    const defaultAvatar = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e5e7eb"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="32" cy="24" r="12" fill="#94a3b8"/><path d="M12 54c0-10 10-16 20-16s20 6 20 16" fill="#94a3b8"/></svg>');
    
    // Calculate completion percentage
    const fields = ['full_name', 'email', 'phone', 'college', 'major', 'academic_number', 'national_id', 'degree', 'birth_date', 'committee'];
    const filledFields = fields.filter(f => m[f] && String(m[f]).trim()).length;
    const completionPercentage = Math.round((filledFields / fields.length) * 100);
    
    const html = `
      <!-- Header Section -->
      <div style="background:linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); padding:32px 24px; text-align:center; border-bottom:1px solid #e2e8f0">
        <div style="position:relative; display:inline-block; margin-bottom:16px">
          <img src="${avatar || defaultAvatar}" alt="${safe(m.full_name || m.name)}" onerror="this.src='${defaultAvatar}'" style="width:120px; height:120px; border-radius:20px; object-fit:cover; box-shadow:0 4px 16px rgba(0,0,0,0.12); border:4px solid #fff" />
          <div style="position:absolute; bottom:-8px; right:-8px; background:${isComplete ? '#10b981' : '#ef4444'}; width:32px; height:32px; border-radius:50%; border:4px solid #fff; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.15)">
            <i class="fa-solid ${isComplete ? 'fa-check' : 'fa-xmark'}" style="font-size:14px; color:#fff"></i>
          </div>
        </div>
        <h3 style="margin:0 0 12px; font-size:1.5rem; font-weight:700; color:#0f172a">${safe(m.full_name || m.name)}</h3>
        <div style="display:inline-flex; align-items:center; gap:8px; padding:6px 16px; background:#f1f5f9; border-radius:999px; margin-bottom:12px">
          <i class="${committeeIcon}" style="font-size:14px; color:#3d8fd6"></i>
          <span style="font-size:0.9rem; color:#475569; font-weight:600">${safe(committee)}</span>
        </div>
        
        <!-- Completion Progress Bar -->
        <div style="max-width:400px; margin:0 auto 12px">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px">
            <span style="font-size:0.8rem; color:#64748b; font-weight:600">اكتمال البيانات</span>
            <span style="font-size:0.85rem; color:#0f172a; font-weight:700">${completionPercentage}%</span>
          </div>
          <div style="width:100%; height:8px; background:#e2e8f0; border-radius:999px; overflow:hidden; box-shadow:inset 0 1px 3px rgba(0,0,0,0.1)">
            <div style="width:${completionPercentage}%; height:100%; background:linear-gradient(90deg, ${completionPercentage >= 100 ? '#10b981' : completionPercentage >= 70 ? '#3b82f6' : completionPercentage >= 40 ? '#f59e0b' : '#ef4444'}, ${completionPercentage >= 100 ? '#34d399' : completionPercentage >= 70 ? '#60a5fa' : completionPercentage >= 40 ? '#fbbf24' : '#f87171'}); transition:width 0.5s ease, background 0.3s ease; border-radius:999px"></div>
          </div>
        </div>
        
        <div>
          <span style="display:inline-flex; align-items:center; gap:6px; padding:6px 14px; background:${isComplete ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)' : 'linear-gradient(135deg, #fee2e2, #fecaca)'}; color:${isComplete ? '#047857' : '#b91c1c'}; border-radius:8px; font-size:0.85rem; font-weight:600; box-shadow:0 2px 4px rgba(0,0,0,0.08)">
            <i class="fa-solid ${isComplete ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
            ${isComplete ? 'بيانات مكتملة' : 'بيانات غير مكتملة'}
          </span>
        </div>
      </div>

      <!-- Content Section -->
      <div style="padding:24px">
        
        <!-- معلومات الاتصال -->
        ${m.email || m.phone ? `
        <div style="margin-bottom:24px">
          <h4 style="font-size:1rem; font-weight:700; color:#1e293b; margin:0 0 16px; padding-bottom:10px; border-bottom:2px solid #e2e8f0; display:flex; align-items:center; gap:10px">
            <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #10b981, #34d399); display:flex; align-items:center; justify-content:center">
              <i class="fa-solid fa-address-book" style="color:#fff; font-size:14px"></i>
            </div>
            معلومات الاتصال
          </h4>
          <div style="display:grid; gap:14px">
            ${m.email ? `
              <a href="mailto:${m.email}" 
                 class="contact-card-link"
                 style="display:flex; align-items:center; gap:14px; padding:16px; background:linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 2px 4px rgba(0,0,0,0.04); transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); text-decoration:none; cursor:pointer; position:relative; overflow:hidden"
                 onmouseenter="
                   this.style.boxShadow='0 8px 20px rgba(61,143,214,0.25)';
                   this.style.transform='translateY(-3px)';
                   this.style.borderColor='#3d8fd6';
                   this.style.background='linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)';
                   this.querySelector('.email-icon-box').style.transform='scale(1.1) rotate(5deg)';
                   this.querySelector('.email-icon-box').style.boxShadow='0 6px 16px rgba(61,143,214,0.4)';
                   this.querySelector('.email-text').style.color='#3d8fd6';
                   this.querySelector('.email-arrow').style.color='#3d8fd6';
                   this.querySelector('.email-arrow').style.transform='translate(3px, -3px)';
                 "
                 onmouseleave="
                   this.style.boxShadow='0 2px 4px rgba(0,0,0,0.04)';
                   this.style.transform='translateY(0)';
                   this.style.borderColor='#e2e8f0';
                   this.style.background='linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)';
                   this.querySelector('.email-icon-box').style.transform='scale(1) rotate(0deg)';
                   this.querySelector('.email-icon-box').style.boxShadow='0 4px 8px rgba(61,143,214,0.3)';
                   this.querySelector('.email-text').style.color='#1e293b';
                   this.querySelector('.email-arrow').style.color='#cbd5e1';
                   this.querySelector('.email-arrow').style.transform='translate(0, 0)';
                 "
                 onmousedown="this.style.transform='translateY(-1px) scale(0.98)'"
                 onmouseup="this.style.transform='translateY(-3px) scale(1)'">
                <div class="email-icon-box" style="width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg, #3d8fd6, #5ba3e0); display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 8px rgba(61,143,214,0.3); transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1)">
                  <i class="fa-solid fa-envelope" style="font-size:20px; color:#fff"></i>
                </div>
                <div style="flex:1; min-width:0">
                  <div style="font-size:0.7rem; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px">البريد الإلكتروني</div>
                  <div class="email-text" style="font-size:1rem; color:#1e293b; font-weight:600; overflow:hidden; text-overflow:ellipsis; display:block; transition:color 0.3s">${safe(m.email)}</div>
                </div>
                <i class="fa-solid fa-arrow-up-right-from-square email-arrow" style="color:#cbd5e1; font-size:16px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"></i>
              </a>
            ` : ''}
            ${m.phone ? `
              <a href="tel:${m.phone}" 
                 class="contact-card-link"
                 style="display:flex; align-items:center; gap:14px; padding:16px; background:linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 2px 4px rgba(0,0,0,0.04); transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); text-decoration:none; cursor:pointer; position:relative; overflow:hidden"
                 onmouseenter="
                   this.style.boxShadow='0 8px 20px rgba(16,185,129,0.25)';
                   this.style.transform='translateY(-3px)';
                   this.style.borderColor='#10b981';
                   this.style.background='linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)';
                   this.querySelector('.phone-icon-box').style.transform='scale(1.1) rotate(-5deg)';
                   this.querySelector('.phone-icon-box').style.boxShadow='0 6px 16px rgba(16,185,129,0.4)';
                   this.querySelector('.phone-icon').style.animation='phone-ring 0.5s ease-in-out';
                   this.querySelector('.phone-text').style.color='#10b981';
                   this.querySelector('.phone-arrow').style.color='#10b981';
                   this.querySelector('.phone-arrow').style.transform='translate(3px, -3px)';
                 "
                 onmouseleave="
                   this.style.boxShadow='0 2px 4px rgba(0,0,0,0.04)';
                   this.style.transform='translateY(0)';
                   this.style.borderColor='#e2e8f0';
                   this.style.background='linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)';
                   this.querySelector('.phone-icon-box').style.transform='scale(1) rotate(0deg)';
                   this.querySelector('.phone-icon-box').style.boxShadow='0 4px 8px rgba(16,185,129,0.3)';
                   this.querySelector('.phone-icon').style.animation='';
                   this.querySelector('.phone-text').style.color='#1e293b';
                   this.querySelector('.phone-arrow').style.color='#cbd5e1';
                   this.querySelector('.phone-arrow').style.transform='translate(0, 0)';
                 "
                 onmousedown="this.style.transform='translateY(-1px) scale(0.98)'"
                 onmouseup="this.style.transform='translateY(-3px) scale(1)'">
                <div class="phone-icon-box" style="width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg, #10b981, #34d399); display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 8px rgba(16,185,129,0.3); transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1)">
                  <i class="fa-solid fa-phone phone-icon" style="font-size:20px; color:#fff"></i>
                </div>
                <div style="flex:1; min-width:0">
                  <div style="font-size:0.7rem; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px">رقم الجوال</div>
                  <div class="phone-text" style="font-size:1rem; color:#1e293b; font-weight:600; direction:ltr; text-align:right; display:block; transition:color 0.3s">${safe(m.phone)}</div>
                </div>
                <i class="fa-solid fa-arrow-up-right-from-square phone-arrow" style="color:#cbd5e1; font-size:16px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"></i>
              </a>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- المعلومات الشخصية -->
        <div style="margin-bottom:24px">
          <h4 style="font-size:1rem; font-weight:700; color:#1e293b; margin:0 0 16px; padding-bottom:10px; border-bottom:2px solid #e2e8f0; display:flex; align-items:center; gap:10px">
            <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #3b82f6, #60a5fa); display:flex; align-items:center; justify-content:center">
              <i class="fa-solid fa-user" style="color:#fff; font-size:14px"></i>
            </div>
            المعلومات الشخصية
          </h4>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px">
            ${m.national_id ? `
              <div style="padding:16px; background:linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%); border-radius:12px; border:1px solid #bae6fd; box-shadow:0 2px 4px rgba(59,130,246,0.1); transition:all 0.2s" onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(59,130,246,0.2)'" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(59,130,246,0.1)'">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
                  <i class="fa-solid fa-id-card" style="color:#3b82f6; font-size:16px"></i>
                  <div style="font-size:0.7rem; color:#075985; font-weight:700; text-transform:uppercase; letter-spacing:0.5px">رقم الهوية</div>
                </div>
                <div style="font-size:1rem; color:#0c4a6e; font-weight:700">${safe(m.national_id)}</div>
              </div>
            ` : `
              <div style="padding:16px; background:repeating-linear-gradient(45deg, #e0f2fe, #e0f2fe 10px, #dbeafe 10px, #dbeafe 20px); border-radius:12px; border:2px dashed #93c5fd; position:relative; overflow:hidden; transition:all 0.2s; opacity:0.7" onmouseenter="this.style.borderColor='#60a5fa'; this.style.transform='translateY(-2px)'; this.style.opacity='0.85'" onmouseleave="this.style.borderColor='#93c5fd'; this.style.transform='translateY(0)'; this.style.opacity='0.7'">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
                  <i class="fa-solid fa-id-card" style="color:#3b82f6; font-size:16px; opacity:0.6"></i>
                  <div style="font-size:0.7rem; color:#075985; font-weight:700; text-transform:uppercase; letter-spacing:0.5px">رقم الهوية</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px">
                  <i class="fa-solid fa-circle-exclamation" style="color:#0369a1; font-size:14px"></i>
                  <span style="font-size:0.85rem; color:#0c4a6e; font-weight:600">غير مكتمل</span>
                </div>
              </div>
            `}
            ${m.birth_date ? `
              <div style="padding:16px; background:linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%); border-radius:12px; border:1px solid #bae6fd; box-shadow:0 2px 4px rgba(59,130,246,0.1); transition:all 0.2s" onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(59,130,246,0.2)'" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(59,130,246,0.1)'">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
                  <i class="fa-solid fa-calendar-days" style="color:#3b82f6; font-size:16px"></i>
                  <div style="font-size:0.7rem; color:#075985; font-weight:700; text-transform:uppercase; letter-spacing:0.5px">تاريخ الميلاد</div>
                </div>
                <div style="font-size:1rem; color:#0c4a6e; font-weight:700">${fmtDate(m.birth_date)}</div>
              </div>
            ` : `
              <div style="padding:16px; background:repeating-linear-gradient(45deg, #e0f2fe, #e0f2fe 10px, #dbeafe 10px, #dbeafe 20px); border-radius:12px; border:2px dashed #93c5fd; position:relative; overflow:hidden; transition:all 0.2s; opacity:0.7" onmouseenter="this.style.borderColor='#60a5fa'; this.style.transform='translateY(-2px)'; this.style.opacity='0.85'" onmouseleave="this.style.borderColor='#93c5fd'; this.style.transform='translateY(0)'; this.style.opacity='0.7'">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
                  <i class="fa-solid fa-calendar-days" style="color:#3b82f6; font-size:16px; opacity:0.6"></i>
                  <div style="font-size:0.7rem; color:#075985; font-weight:700; text-transform:uppercase; letter-spacing:0.5px">تاريخ الميلاد</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px">
                  <i class="fa-solid fa-circle-exclamation" style="color:#0369a1; font-size:14px"></i>
                  <span style="font-size:0.85rem; color:#0c4a6e; font-weight:600">غير مكتمل</span>
                </div>
              </div>
            `}
          </div>
        </div>

        <!-- المعلومات الأكاديمية -->
        <div style="margin-bottom:24px">
          <h4 style="font-size:1rem; font-weight:700; color:#1e293b; margin:0 0 16px; padding-bottom:10px; border-bottom:2px solid #e2e8f0; display:flex; align-items:center; gap:10px">
            <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #f59e0b, #fbbf24); display:flex; align-items:center; justify-content:center">
              <i class="fa-solid fa-graduation-cap" style="color:#fff; font-size:14px"></i>
            </div>
            المعلومات الأكاديمية
          </h4>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px">
            ${m.degree ? `
              <div style="padding:16px; background:linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%); border-radius:12px; border:1px solid #fde68a; box-shadow:0 2px 4px rgba(245,158,11,0.1); transition:all 0.2s" onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(245,158,11,0.2)'" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(245,158,11,0.1)'">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
                  <i class="fa-solid fa-user-graduate" style="color:#f59e0b; font-size:16px"></i>
                  <div style="font-size:0.7rem; color:#92400e; font-weight:700; text-transform:uppercase; letter-spacing:0.5px">الدرجة العلمية</div>
                </div>
                <div style="font-size:1rem; color:#78350f; font-weight:700">${safe(m.degree)}</div>
              </div>
            ` : `
              <div style="padding:16px; background:repeating-linear-gradient(45deg, #fef3c7, #fef3c7 10px, #fef9c3 10px, #fef9c3 20px); border-radius:12px; border:2px dashed #fde68a; position:relative; overflow:hidden; transition:all 0.2s; opacity:0.7" onmouseenter="this.style.borderColor='#fbbf24'; this.style.transform='translateY(-2px)'; this.style.opacity='0.85'" onmouseleave="this.style.borderColor='#fde68a'; this.style.transform='translateY(0)'; this.style.opacity='0.7'">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
                  <i class="fa-solid fa-user-graduate" style="color:#f59e0b; font-size:16px; opacity:0.6"></i>
                  <div style="font-size:0.7rem; color:#92400e; font-weight:700; text-transform:uppercase; letter-spacing:0.5px">الدرجة العلمية</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px">
                  <i class="fa-solid fa-circle-exclamation" style="color:#b45309; font-size:14px"></i>
                  <span style="font-size:0.85rem; color:#92400e; font-weight:600">غير مكتمل</span>
                </div>
              </div>
            `}
            ${m.college ? `
              <div style="padding:16px; background:linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%); border-radius:12px; border:1px solid #fde68a; box-shadow:0 2px 4px rgba(245,158,11,0.1); transition:all 0.2s" onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(245,158,11,0.2)'" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(245,158,11,0.1)'">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
                  <i class="fa-solid fa-building-columns" style="color:#f59e0b; font-size:16px"></i>
                  <div style="font-size:0.7rem; color:#92400e; font-weight:700; text-transform:uppercase; letter-spacing:0.5px">الكلية</div>
                </div>
                <div style="font-size:1rem; color:#78350f; font-weight:700; line-height:1.4">${safe(m.college)}</div>
              </div>
            ` : `
              <div style="padding:16px; background:repeating-linear-gradient(45deg, #fef3c7, #fef3c7 10px, #fef9c3 10px, #fef9c3 20px); border-radius:12px; border:2px dashed #fde68a; position:relative; overflow:hidden; transition:all 0.2s; opacity:0.7" onmouseenter="this.style.borderColor='#fbbf24'; this.style.transform='translateY(-2px)'; this.style.opacity='0.85'" onmouseleave="this.style.borderColor='#fde68a'; this.style.transform='translateY(0)'; this.style.opacity='0.7'">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
                  <i class="fa-solid fa-building-columns" style="color:#f59e0b; font-size:16px; opacity:0.6"></i>
                  <div style="font-size:0.7rem; color:#92400e; font-weight:700; text-transform:uppercase; letter-spacing:0.5px">الكلية</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px">
                  <i class="fa-solid fa-circle-exclamation" style="color:#b45309; font-size:14px"></i>
                  <span style="font-size:0.85rem; color:#92400e; font-weight:600">غير مكتمل</span>
                </div>
              </div>
            `}
            ${m.major ? `
              <div style="padding:16px; background:linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%); border-radius:12px; border:1px solid #fde68a; box-shadow:0 2px 4px rgba(245,158,11,0.1); transition:all 0.2s" onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(245,158,11,0.2)'" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(245,158,11,0.1)'">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
                  <i class="fa-solid fa-book-open" style="color:#f59e0b; font-size:16px"></i>
                  <div style="font-size:0.7rem; color:#92400e; font-weight:700; text-transform:uppercase; letter-spacing:0.5px">التخصص</div>
                </div>
                <div style="font-size:1rem; color:#78350f; font-weight:700; line-height:1.4">${safe(m.major)}</div>
              </div>
            ` : `
              <div style="padding:16px; background:repeating-linear-gradient(45deg, #fef3c7, #fef3c7 10px, #fef9c3 10px, #fef9c3 20px); border-radius:12px; border:2px dashed #fde68a; position:relative; overflow:hidden; transition:all 0.2s; opacity:0.7" onmouseenter="this.style.borderColor='#fbbf24'; this.style.transform='translateY(-2px)'; this.style.opacity='0.85'" onmouseleave="this.style.borderColor='#fde68a'; this.style.transform='translateY(0)'; this.style.opacity='0.7'">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
                  <i class="fa-solid fa-book-open" style="color:#f59e0b; font-size:16px; opacity:0.6"></i>
                  <div style="font-size:0.7rem; color:#92400e; font-weight:700; text-transform:uppercase; letter-spacing:0.5px">التخصص</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px">
                  <i class="fa-solid fa-circle-exclamation" style="color:#b45309; font-size:14px"></i>
                  <span style="font-size:0.85rem; color:#92400e; font-weight:600">غير مكتمل</span>
                </div>
              </div>
            `}
            ${m.academic_number ? `
              <div style="padding:16px; background:linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%); border-radius:12px; border:1px solid #fde68a; box-shadow:0 2px 4px rgba(245,158,11,0.1); transition:all 0.2s" onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(245,158,11,0.2)'" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(245,158,11,0.1)'">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
                  <i class="fa-solid fa-hashtag" style="color:#f59e0b; font-size:16px"></i>
                  <div style="font-size:0.7rem; color:#92400e; font-weight:700; text-transform:uppercase; letter-spacing:0.5px">الرقم الأكاديمي</div>
                </div>
                <div style="font-size:1rem; color:#78350f; font-weight:700">${safe(m.academic_number)}</div>
              </div>
            ` : `
              <div style="padding:16px; background:repeating-linear-gradient(45deg, #fef3c7, #fef3c7 10px, #fef9c3 10px, #fef9c3 20px); border-radius:12px; border:2px dashed #fde68a; position:relative; overflow:hidden; transition:all 0.2s; opacity:0.7" onmouseenter="this.style.borderColor='#fbbf24'; this.style.transform='translateY(-2px)'; this.style.opacity='0.85'" onmouseleave="this.style.borderColor='#fde68a'; this.style.transform='translateY(0)'; this.style.opacity='0.7'">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
                  <i class="fa-solid fa-hashtag" style="color:#f59e0b; font-size:16px; opacity:0.6"></i>
                  <div style="font-size:0.7rem; color:#92400e; font-weight:700; text-transform:uppercase; letter-spacing:0.5px">الرقم الأكاديمي</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px">
                  <i class="fa-solid fa-circle-exclamation" style="color:#b45309; font-size:14px"></i>
                  <span style="font-size:0.85rem; color:#92400e; font-weight:600">غير مكتمل</span>
                </div>
              </div>
            `}
          </div>
        </div>

        <!-- حسابات التواصل الاجتماعي -->
        <div style="margin-bottom:24px">
          <h4 style="font-size:1rem; font-weight:700; color:#1e293b; margin:0 0 16px; padding-bottom:10px; border-bottom:2px solid #e2e8f0; display:flex; align-items:center; gap:10px">
            <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #8b5cf6, #a78bfa); display:flex; align-items:center; justify-content:center">
              <i class="fa-solid fa-hashtag" style="color:#fff; font-size:14px"></i>
            </div>
            حسابات التواصل الاجتماعي
          </h4>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px">
            ${xUrl ? `
              <a href="${xUrl}" target="_blank" rel="noopener" style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px; background:#000; color:#fff; border-radius:12px; text-decoration:none; transition:all 0.3s; box-shadow:0 2px 8px rgba(0,0,0,0.15)" onmouseenter="this.style.transform='translateY(-4px) scale(1.02)'; this.style.boxShadow='0 8px 20px rgba(0,0,0,0.3)'" onmouseleave="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.15)'">
                <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0">
                  <i class="fa-brands fa-x-twitter" style="font-size:24px"></i>
                  <div style="flex:1; min-width:0">
                    <div style="font-size:0.7rem; opacity:0.7; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px; font-family:'Eras', sans-serif">X (Twitter)</div>
                    <div style="font-weight:700; font-size:0.95rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:'Eras', sans-serif">${safe(xh)}</div>
                  </div>
                </div>
                <i class="fa-solid fa-arrow-up-right" style="font-size:16px; opacity:0.7"></i>
              </a>
            ` : `
              <div style="padding:16px; background:#000; color:#fff; border-radius:12px; position:relative; overflow:hidden; transition:all 0.2s; opacity:0.5" onmouseenter="this.style.transform='translateY(-2px)'; this.style.opacity='0.7'" onmouseleave="this.style.transform='translateY(0)'; this.style.opacity='0.5'">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
                  <i class="fa-brands fa-x-twitter" style="font-size:16px; opacity:0.6"></i>
                  <div style="font-size:0.7rem; color:#a3a3a3; font-weight:700; text-transform:uppercase; letter-spacing:0.5px">X (Twitter)</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px">
                  <i class="fa-solid fa-circle-exclamation" style="color:#737373; font-size:14px"></i>
                  <span style="font-size:0.85rem; color:#d4d4d4; font-weight:600">غير مكتمل</span>
                </div>
              </div>
            `}
            ${igUrl ? `
              <a href="${igUrl}" target="_blank" rel="noopener" style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px; background:linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); color:#fff; border-radius:12px; text-decoration:none; transition:all 0.3s; box-shadow:0 2px 8px rgba(188,24,136,0.3)" onmouseenter="this.style.transform='translateY(-4px) scale(1.02)'; this.style.boxShadow='0 8px 20px rgba(188,24,136,0.5)'" onmouseleave="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 2px 8px rgba(188,24,136,0.3)'">
                <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0">
                  <i class="fa-brands fa-instagram" style="font-size:24px"></i>
                  <div style="flex:1; min-width:0">
                    <div style="font-size:0.7rem; opacity:0.9; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px; font-family:'Eras', sans-serif">Instagram</div>
                    <div style="font-weight:700; font-size:0.95rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:'Eras', sans-serif">${safe(ig)}</div>
                  </div>
                </div>
                <i class="fa-solid fa-arrow-up-right" style="font-size:16px; opacity:0.9"></i>
              </a>
            ` : `
              <div style="padding:16px; background:linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); color:#fff; border-radius:12px; position:relative; overflow:hidden; transition:all 0.2s; opacity:0.5" onmouseenter="this.style.transform='translateY(-2px)'; this.style.opacity='0.7'" onmouseleave="this.style.transform='translateY(0)'; this.style.opacity='0.5'">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
                  <i class="fa-brands fa-instagram" style="font-size:16px; opacity:0.6"></i>
                  <div style="font-size:0.7rem; opacity:0.8; font-weight:700; text-transform:uppercase; letter-spacing:0.5px">Instagram</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px">
                  <i class="fa-solid fa-circle-exclamation" style="color:#fff; font-size:14px; opacity:0.7"></i>
                  <span style="font-size:0.85rem; opacity:0.9; font-weight:600">غير مكتمل</span>
                </div>
              </div>
            `}
            ${tkUrl ? `
              <a href="${tkUrl}" target="_blank" rel="noopener" style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px; background:linear-gradient(135deg, #00f2ea 0%, #ff0050 50%, #000 100%); color:#fff; border-radius:12px; text-decoration:none; transition:all 0.3s; box-shadow:0 2px 8px rgba(0,242,234,0.3)" onmouseenter="this.style.transform='translateY(-4px) scale(1.02)'; this.style.boxShadow='0 8px 20px rgba(0,242,234,0.5)'" onmouseleave="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 2px 8px rgba(0,242,234,0.3)'">
                <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0">
                  <i class="fa-brands fa-tiktok" style="font-size:24px"></i>
                  <div style="flex:1; min-width:0">
                    <div style="font-size:0.7rem; opacity:0.9; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px; font-family:'Eras', sans-serif">TikTok</div>
                    <div style="font-weight:700; font-size:0.95rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:'Eras', sans-serif">${safe(tk)}</div>
                  </div>
                </div>
                <i class="fa-solid fa-arrow-up-right" style="font-size:16px; opacity:0.9"></i>
              </a>
            ` : `
              <div style="padding:16px; background:linear-gradient(135deg, #00f2ea 0%, #ff0050 50%, #000 100%); color:#fff; border-radius:12px; position:relative; overflow:hidden; transition:all 0.2s; opacity:0.5" onmouseenter="this.style.transform='translateY(-2px)'; this.style.opacity='0.7'" onmouseleave="this.style.transform='translateY(0)'; this.style.opacity='0.5'">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
                  <i class="fa-brands fa-tiktok" style="font-size:16px; opacity:0.6"></i>
                  <div style="font-size:0.7rem; opacity:0.8; font-weight:700; text-transform:uppercase; letter-spacing:0.5px">TikTok</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px">
                  <i class="fa-solid fa-circle-exclamation" style="color:#fff; font-size:14px; opacity:0.7"></i>
                  <span style="font-size:0.85rem; opacity:0.9; font-weight:600">غير مكتمل</span>
                </div>
              </div>
            `}
            ${liUrl ? `
              <a href="${liUrl}" target="_blank" rel="noopener" style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px; background:linear-gradient(135deg, #0077b5 0%, #00a0dc 100%); color:#fff; border-radius:12px; text-decoration:none; transition:all 0.3s; box-shadow:0 2px 8px rgba(0,119,181,0.3)" onmouseenter="this.style.transform='translateY(-4px) scale(1.02)'; this.style.boxShadow='0 8px 20px rgba(0,119,181,0.5)'" onmouseleave="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 2px 8px rgba(0,119,181,0.3)'">
                <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0">
                  <i class="fa-brands fa-linkedin" style="font-size:24px"></i>
                  <div style="flex:1; min-width:0">
                    <div style="font-size:0.7rem; opacity:0.9; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px; font-family:'Eras', sans-serif">LinkedIn</div>
                    <div style="font-weight:700; font-size:0.95rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:'Eras', sans-serif">${safe(li)}</div>
                  </div>
                </div>
                <i class="fa-solid fa-arrow-up-right" style="font-size:16px; opacity:0.9"></i>
              </a>
            ` : `
              <div style="padding:16px; background:linear-gradient(135deg, #0077b5 0%, #00a0dc 100%); color:#fff; border-radius:12px; position:relative; overflow:hidden; transition:all 0.2s; opacity:0.5" onmouseenter="this.style.transform='translateY(-2px)'; this.style.opacity='0.7'" onmouseleave="this.style.transform='translateY(0)'; this.style.opacity='0.5'">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">
                  <i class="fa-brands fa-linkedin" style="font-size:16px; opacity:0.6"></i>
                  <div style="font-size:0.7rem; opacity:0.8; font-weight:700; text-transform:uppercase; letter-spacing:0.5px">LinkedIn</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px">
                  <i class="fa-solid fa-circle-exclamation" style="color:#fff; font-size:14px; opacity:0.7"></i>
                  <span style="font-size:0.85rem; opacity:0.9; font-weight:600">غير مكتمل</span>
                </div>
              </div>
            `}
          </div>
        </div>

        <!-- الألوان الشخصية -->
        ${m.primary_color || m.secondary_color ? `
        <div>
          <h4 style="font-size:1rem; font-weight:700; color:#1e293b; margin:0 0 16px; padding-bottom:10px; border-bottom:2px solid #e2e8f0; display:flex; align-items:center; gap:10px">
            <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #ec4899, #f472b6); display:flex; align-items:center; justify-content:center">
              <i class="fa-solid fa-palette" style="color:#fff; font-size:14px"></i>
            </div>
            الألوان الشخصية
          </h4>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:16px">
            ${m.primary_color ? `<div style="padding:20px; background:linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); border-radius:12px; border:1px solid #e2e8f0; text-align:center; box-shadow:0 2px 4px rgba(0,0,0,0.04); transition:all 0.2s" onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.04)'"><div style="position:relative; width:80px; height:80px; margin:0 auto 12px; border-radius:16px; background:${m.primary_color}; border:3px solid #fff; box-shadow:0 4px 12px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.2)"><div style="position:absolute; top:4px; right:4px; width:12px; height:12px; background:rgba(255,255,255,0.4); border-radius:50%; filter:blur(2px)"></div></div><div style="font-size:0.7rem; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:6px">اللون الأساسي</div><code style="display:inline-block; padding:6px 12px; background:#f1f5f9; border-radius:6px; font-size:0.9rem; color:#1e293b; font-weight:700; font-family:monospace">${m.primary_color}</code></div>` : ''}
            ${m.secondary_color ? `<div style="padding:20px; background:linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); border-radius:12px; border:1px solid #e2e8f0; text-align:center; box-shadow:0 2px 4px rgba(0,0,0,0.04); transition:all 0.2s" onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.04)'"><div style="position:relative; width:80px; height:80px; margin:0 auto 12px; border-radius:16px; background:${m.secondary_color}; border:3px solid #fff; box-shadow:0 4px 12px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.2)"><div style="position:absolute; top:4px; right:4px; width:12px; height:12px; background:rgba(255,255,255,0.4); border-radius:50%; filter:blur(2px)"></div></div><div style="font-size:0.7rem; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:6px">اللون الثانوي</div><code style="display:inline-block; padding:6px 12px; background:#f1f5f9; border-radius:6px; font-size:0.9rem; color:#1e293b; font-weight:700; font-family:monospace">${m.secondary_color}</code></div>` : ''}
          </div>
        </div>
        ` : ''}

      </div>
    `;
    if (memberDetailsContent) memberDetailsContent.innerHTML = html;
    openDialog?.(memberDetailsDialog);
  }

  // Member Settings Dialog
  const memberSettingsDialog = document.getElementById('memberSettingsDialog');
  const memberSettingsForm = document.getElementById('memberSettingsForm');
  const addToBoardCheckbox = document.getElementById('addToBoardCouncil');
  const boardPositionOptions = document.getElementById('boardPositionOptions');
  let currentSettingsMember = null;
  let currentBoardPosition = null;

  // Toggle board position options
  addToBoardCheckbox?.addEventListener('change', () => {
    if (boardPositionOptions) {
      boardPositionOptions.style.display = addToBoardCheckbox.checked ? 'block' : 'none';
    }
  });

  async function openMemberSettings(idx) {
    const m = members?.[idx];
    if (!m) return;
    
    currentSettingsMember = m;
    
    // Update member info in dialog
    const nameEl = document.getElementById('settingsMemberName');
    const emailEl = document.getElementById('settingsMemberEmail');
    const avatarEl = document.getElementById('settingsMemberAvatar');
    
    if (nameEl) nameEl.textContent = m.full_name || m.name || 'العضو';
    if (emailEl) emailEl.textContent = m.email || '';
    
    // Update avatar
    if (avatarEl) {
      if (m.avatar_url || m.avatar) {
        avatarEl.innerHTML = `<img src="${m.avatar_url || m.avatar}" alt="${m.full_name || m.name}" style="width:100%; height:100%; border-radius:12px; object-fit:cover" onerror="this.style.display='none'" />`;
      } else {
        avatarEl.innerHTML = `<i class="fa-solid fa-user" style="color:#64748b; font-size:1.5rem"></i>`;
      }
    }
    
    try {
      if (!sb) throw new Error('Supabase غير متصل');
      
      // Fetch current board position
      // First get current council
      const { data: currentCouncilData } = await sb
        .from('board_councils')
        .select('id')
        .eq('is_current', true)
        .maybeSingle();
      
      let boardPosition = null;
      if (currentCouncilData) {
        const { data: pos } = await sb
          .from('board_positions')
          .select(`
            *,
            council:board_councils(*)
          `)
          .eq('member_id', m.id)
          .eq('council_id', currentCouncilData.id)
          .maybeSingle();
        
        boardPosition = pos;
      }
      
      currentBoardPosition = boardPosition;
      
      // Fill form with current data
      if (boardPosition) {
        addToBoardCheckbox.checked = true;
        boardPositionOptions.style.display = 'block';
        document.getElementById('boardPosition').value = boardPosition.position_type || '';
        document.getElementById('positionRank').value = boardPosition.position_rank || 1;
        document.getElementById('positionDepartment').value = boardPosition.department || '';
      } else {
        addToBoardCheckbox.checked = false;
        boardPositionOptions.style.display = 'none';
        document.getElementById('boardPosition').value = '';
        document.getElementById('positionRank').value = 1;
        document.getElementById('positionDepartment').value = '';
      }
      
    } catch (err) {
      console.error('Error loading member settings:', err);
      // Reset form
      addToBoardCheckbox.checked = false;
      boardPositionOptions.style.display = 'none';
    }
    
    // Show dialog
    openDialog?.(memberSettingsDialog);
  }

  // Handle settings form submit
  memberSettingsForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentSettingsMember) return;
    
    const saveBtn = document.getElementById('saveMemberSettingsBtn');
    if (saveBtn) saveBtn.disabled = true;
    
    try {
      if (!sb) throw new Error('Supabase غير متصل');
      
      const addToBoard = addToBoardCheckbox?.checked || false;
      
      // Handle board position
      if (addToBoard) {
        const positionType = document.getElementById('boardPosition')?.value;
        const positionRank = parseInt(document.getElementById('positionRank')?.value) || 1;
        const department = document.getElementById('positionDepartment')?.value || null;
        
        if (!positionType) {
          alert('يرجى اختيار المنصب');
          if (saveBtn) saveBtn.disabled = false;
          return;
        }
        
        // Get or create current council
        let { data: currentCouncil } = await sb
          .from('board_councils')
          .select('id')
          .eq('is_current', true)
          .maybeSingle();
        
        // إذا لم يوجد مجلس حالي، أنشئ واحد تلقائياً
        if (!currentCouncil) {
          const currentYear = new Date().getFullYear();
          const { data: newCouncil, error: councilError } = await sb
            .from('board_councils')
            .insert({
              title: `Board Council ${currentYear}`,
              title_ar: `المجلس الإداري ${currentYear}`,
              start_date: new Date().toISOString().split('T')[0],
              is_active: true,
              is_current: true,
              is_visible: true
            })
            .select('id')
            .single();
          
          if (councilError) {
            console.error('Error creating council:', councilError);
            alert('حدث خطأ في إنشاء المجلس الإداري');
            if (saveBtn) saveBtn.disabled = false;
            return;
          }
          
          currentCouncil = newCouncil;
        }
        
        // Get position titles
        const positionTitles = {
          'president': { ar: 'الرئيس', en: 'President' },
          'vice_president': { ar: 'نائب الرئيس', en: 'Vice President' },
          'leader': { ar: 'القائد', en: 'Leader' },
          'vice_leader': { ar: 'نائب القائد', en: 'Vice Leader' },
          'ceo': { ar: 'الرئيس التنفيذي', en: 'CEO' },
          'secretary': { ar: 'الأمين العام', en: 'Secretary' },
          'treasurer': { ar: 'أمين الصندوق', en: 'Treasurer' },
          'member': { ar: 'عضو', en: 'Member' }
        };
        
        const titles = positionTitles[positionType] || { ar: 'عضو', en: 'Member' };
        
        // Upsert board position
        const { error: boardError } = await sb
          .from('board_positions')
          .upsert({
            council_id: currentCouncil.id,
            member_id: currentSettingsMember.id,
            position_type: positionType,
            position_title: titles.en,
            position_title_ar: titles.ar,
            position_rank: positionRank,
            department: department,
            department_ar: department,
            is_visible: true
          }, {
            onConflict: 'council_id,member_id'
          });
        
        if (boardError) throw boardError;
      } else {
        // Remove from board
        if (currentBoardPosition) {
          const { error: deleteError } = await sb
            .from('board_positions')
            .delete()
            .eq('member_id', currentSettingsMember.id)
            .eq('council_id', currentBoardPosition.council_id);
          
          if (deleteError) throw deleteError;
        }
      }
      
      alert('✅ تم حفظ التغييرات بنجاح');
      memberSettingsDialog?.close();
      
      // Refresh members list
      await loadMembers?.();
      
    } catch (err) {
      console.error('Error saving member settings:', err);
      alert('حدث خطأ: ' + (err?.message || 'غير معروف'));
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });

  // Members CRUD
  const memberDialog = $('#memberDialog');
  const memberForm = $('#memberForm');
  let memberEditingIndex = null;
  // Member image upload elements
  const memberImageFile = document.getElementById('member_image_file');
  const memberImageUrl = document.getElementById('member_image_url');
  const memberImagePreview = document.getElementById('member_image_preview');
  const memberDropzone = document.getElementById('memberDropzone');
  const memberBrowseBtn = document.getElementById('memberBrowseBtn');
  const memberImageActions = document.getElementById('memberImageActions');
  const memberEditImageBtn = document.getElementById('member_edit_image_btn');
  const memberChangeImageBtn = document.getElementById('member_change_image_btn');
  const memberChangeAvatarBtn = document.getElementById('memberChangeAvatarBtn');
  const memberAvatarPlaceholder = document.getElementById('memberAvatarPlaceholder');
  const memberDialogTitle = document.getElementById('memberDialogTitle');
  let memberCroppedFile = null;
  // Member details dialog elements
  const memberDetailsDialog = document.getElementById('memberDetailsDialog');
  const memberDetailsContent = document.getElementById('memberDetailsContent');

  async function handleMemberImageFile(file) {
    if (!file) return;
    if (!(file.type || '').startsWith('image/')) { alert('الملف ليس صورة'); return; }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) { if (!confirm('حجم الصورة يتجاوز 5MB. المتابعة؟')) return; }
    try {
      const cropped = await openImageCropper(file, { aspectRatio: 1, lockAspect: true, maxWidth: 1200, maxHeight: 1200, mimeType: 'image/webp', quality: 0.9 });
      memberCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (memberImagePreview) { 
        memberImagePreview.src = url; 
        memberImagePreview.style.display = 'block'; 
      }
      if (memberAvatarPlaceholder) memberAvatarPlaceholder.style.display = 'none';
      if (memberImageActions) memberImageActions.style.display = 'flex';
      if (memberDropzone) memberDropzone.style.display = 'none';
    } catch (err) {
      if (memberImageFile) memberImageFile.value = '';
    }
  }
  memberImageFile?.addEventListener('change', async () => {
    const file = memberImageFile.files && memberImageFile.files[0];
    await handleMemberImageFile(file);
  });
  memberChangeAvatarBtn?.addEventListener('click', (e) => { 
    e.preventDefault(); 
    e.stopPropagation(); 
    memberImageFile?.click(); 
  });
  memberBrowseBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); memberImageFile?.click(); });
  memberDropzone?.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    if ((e.target instanceof HTMLElement) && e.target.closest('#memberBrowseBtn')) return;
    memberImageFile?.click();
  });
  memberDropzone?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); memberImageFile?.click(); } });
  memberDropzone?.addEventListener('dragover', (e) => { e.preventDefault(); memberDropzone.classList.add('dragover'); });
  memberDropzone?.addEventListener('dragleave', () => { memberDropzone.classList.remove('dragover'); });
  memberDropzone?.addEventListener('drop', async (e) => {
    e.preventDefault(); e.stopPropagation(); memberDropzone.classList.remove('dragover');
    const dt = e.dataTransfer; if (!dt) return;
    let file = null;
    if (dt.files && dt.files.length) file = dt.files[0];
    if (!file && dt.items && dt.items.length) { const item = Array.from(dt.items).find(i => i.kind === 'file'); if (item) file = item.getAsFile(); }
    await handleMemberImageFile(file);
  });
  memberChangeImageBtn?.addEventListener('click', (e) => { e.preventDefault(); memberImageFile?.click(); });
  memberEditImageBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const src = (memberImagePreview && memberImagePreview.src) || (memberImageUrl && memberImageUrl.value) || '';
      if (!src) { alert('لا توجد صورة لتحريرها'); return; }
      const file = await fetchUrlAsFile(src, 'current');
      const cropped = await openImageCropper(file, { aspectRatio: 1, lockAspect: true, maxWidth: 1200, maxHeight: 1200, mimeType: 'image/webp', quality: 0.9 });
      memberCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (memberImagePreview) { memberImagePreview.src = url; memberImagePreview.style.display = 'block'; }
      if (memberImageActions) memberImageActions.style.display = 'flex';
      if (memberDropzone) memberDropzone.style.display = 'none';
    } catch (err) {
      if (String(err?.message || '').includes('crop-cancelled')) return;
      alert('تعذر تحرير الصورة الحالية. جرّب تغيير الصورة بدلًا من ذلك.');
    }
  });

  async function uploadMemberImage() {
    const file = memberCroppedFile || (memberImageFile?.files && memberImageFile.files[0]);
    if (!file) return null;
    if (!sb) return null;
    const bucket = 'adeeb-site';
    const ext = (file.name.split('.').pop() || getExtFromType(file.type, 'jpg')).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `members/member-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
    const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر الحصول على رابط الصورة');
    return publicUrl;
  }

  $('#addMemberBtn')?.addEventListener('click', () => {
    memberEditingIndex = null;
    memberForm?.reset?.();
    if (memberDialogTitle) memberDialogTitle.textContent = 'إضافة عضو جديد';
    if (memberImagePreview) { memberImagePreview.src = ''; memberImagePreview.style.display = 'none'; }
    if (memberAvatarPlaceholder) memberAvatarPlaceholder.style.display = 'block';
    if (memberImageUrl) memberImageUrl.value = '';
    memberCroppedFile = null;
    if (memberDropzone) memberDropzone.style.display = 'none';
    if (memberImageActions) memberImageActions.style.display = 'none';
    
    // إعادة تعيين الألوان إلى القيم الافتراضية
    const defaultPrimaryColor = '#3D8FD6';
    const defaultSecondaryColor = '#274060';
    if (memberForm.primary_color) memberForm.primary_color.value = defaultPrimaryColor;
    if (memberForm.secondary_color) memberForm.secondary_color.value = defaultSecondaryColor;
    if (primaryColorPreview) primaryColorPreview.style.background = defaultPrimaryColor;
    if (primaryColorCode) primaryColorCode.textContent = defaultPrimaryColor;
    if (secondaryColorPreview) secondaryColorPreview.style.background = defaultSecondaryColor;
    if (secondaryColorCode) secondaryColorCode.textContent = defaultSecondaryColor;
    
    // إعادة تعيين ألوان أيقونات القطرة إلى الألوان الافتراضية
    const primaryDropletIcon = memberForm?.querySelector('label span i.fa-droplet[style*="color"]');
    const secondaryDropletIcon = memberForm?.querySelectorAll('label span i.fa-droplet[style*="color"]')[1];
    if (primaryDropletIcon) primaryDropletIcon.style.color = defaultPrimaryColor;
    if (secondaryDropletIcon) secondaryDropletIcon.style.color = defaultSecondaryColor;
    
    openDialog?.(memberDialog);
  });

  membersList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'view') {
      openMemberDetails(idx);
      return;
    }
    if (act === 'settings') {
      openMemberSettings(idx);
      return;
    }
    if (act === 'send-invitation') {
      if (!Number.isInteger(idx) || idx < 0 || idx >= members.length) return;
      const member = members[idx];
      if (member && member.id) {
        sendMemberInvitation(member.id);
      }
      return;
    }
    if (act === 'change-committee') {
      if (!Number.isInteger(idx) || idx < 0 || idx >= members.length) return;
      const member = members[idx];
      const currentCommittee = member.committee || 'بدون لجنة';
      
      // Get all unique committees
      const committees = new Set();
      members.forEach(m => {
        const c = (m.committee || '').toString().trim();
        if (c) committees.add(c);
      });
      const committeesList = Array.from(committees).sort((a, b) => {
        try { return a.localeCompare(b, 'ar'); } catch { return String(a).localeCompare(String(b)); }
      });
      
      // Open custom dialog
      const dialog = $('#changeCommitteeDialog');
      const form = $('#changeCommitteeForm');
      const memberNameEl = $('#changeCommitteeMemberName');
      const currentCommitteeEl = $('#changeCommitteeCurrentCommittee');
      const selectEl = $('#changeCommitteeSelect');
      const newInputDiv = $('#changeCommitteeNewInput');
      const newInputEl = $('#changeCommitteeNewName');
      
      if (!dialog || !form || !selectEl) return;
      
      // Set member info
      if (memberNameEl) memberNameEl.textContent = member.full_name || member.name || 'العضو';
      if (currentCommitteeEl) currentCommitteeEl.textContent = currentCommittee;
      
      // Populate select options
      selectEl.innerHTML = '<option value="">اختر اللجنة</option>';
      committeesList.forEach(c => {
        const option = document.createElement('option');
        option.value = c;
        option.textContent = c;
        if (c === currentCommittee) option.selected = true;
        selectEl.appendChild(option);
      });
      const newOption = document.createElement('option');
      newOption.value = '__new__';
      newOption.textContent = 'لجنة جديدة...';
      selectEl.appendChild(newOption);
      
      // Handle select change
      const handleSelectChange = () => {
        if (selectEl.value === '__new__') {
          newInputDiv.style.display = 'block';
          newInputEl.focus();
          newInputEl.required = true;
        } else {
          newInputDiv.style.display = 'none';
          newInputEl.required = false;
        }
      };
      selectEl.removeEventListener('change', handleSelectChange);
      selectEl.addEventListener('change', handleSelectChange);
      
      // Reset form
      newInputDiv.style.display = 'none';
      newInputEl.value = '';
      newInputEl.required = false;
      
      // Handle form submit
      const handleSubmit = async (e) => {
        e.preventDefault();
        
        let newCommittee = selectEl.value;
        if (newCommittee === '__new__') {
          newCommittee = newInputEl.value.trim();
          if (!newCommittee) {
            newInputEl.focus();
            return;
          }
        }
        
        if (!newCommittee || newCommittee === currentCommittee) {
          dialog.close();
          return;
        }
        
        // Update committee
        member.committee = newCommittee;
        save(KEYS.members, members);
        if (sb && member.id) {
          await sb.from('members').update({ committee: newCommittee }).eq('id', member.id);
        }
        applyMembersFilters();
        
        dialog.close();
        
        // Show success message
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'success',
            title: 'تم التغيير!',
            text: `تم نقل ${member.full_name || member.name} إلى ${newCommittee}`,
            confirmButtonText: 'حسناً',
            confirmButtonColor: '#3d8fd6',
            timer: 2000
          });
        }
      };
      
      form.removeEventListener('submit', handleSubmit);
      form.addEventListener('submit', handleSubmit);
      
      openDialog?.(dialog);
      return;
    }
    if (act === 'up' || act === 'down') {
      if (!Number.isInteger(idx) || idx < 0 || idx >= members.length) return;
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(members.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = members.splice(idx, 1);
      members.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(members, KEYS.members, 'members').then(() => {
        applyMembersFilters();
      });
      return;
    }
    if (act === 'edit') {
      memberEditingIndex = idx;
      const cur = members[idx];
      if (memberDialogTitle) memberDialogTitle.textContent = 'تعديل بيانات العضو';
      memberForm.full_name.value = cur.full_name || cur.name || '';
      memberForm.email.value = cur.email || '';
      memberForm.phone.value = cur.phone || '';
      memberForm.college.value = cur.college || '';
      memberForm.major.value = cur.major || '';
      memberForm.academic_number.value = cur.academic_number || '';
      memberForm.national_id.value = cur.national_id || '';
      // Ensure degree select preserves existing custom values not in the list
      try {
        const selDeg = memberForm.degree;
        const valDeg = cur.degree || '';
        if (selDeg && selDeg.tagName === 'SELECT') {
          const hasDeg = Array.from(selDeg.options || []).some(o => o.value === valDeg);
          if (valDeg && !hasDeg) {
            selDeg.add(new Option(valDeg, valDeg, true, true));
          }
          selDeg.value = valDeg;
        } else if (selDeg) {
          selDeg.value = valDeg;
        }
      } catch {
        memberForm.degree.value = cur.degree || '';
      }
      memberForm.birth_date.value = (cur.birth_date || '').slice(0,10);
      // Ensure committee select preserves existing custom values not in the list
      try {
        const sel = memberForm.committee;
        const val = cur.committee || '';
        if (sel && sel.tagName === 'SELECT') {
          const has = Array.from(sel.options || []).some(o => o.value === val);
          if (val && !has) {
            sel.add(new Option(val, val, true, true));
          }
          sel.value = val;
        } else if (sel) {
          sel.value = val;
        }
      } catch {
        memberForm.committee.value = cur.committee || '';
      }
      memberForm.x_handle.value = cur.x_handle || '';
      memberForm.instagram_handle.value = cur.instagram_handle || '';
      memberForm.tiktok_handle.value = cur.tiktok_handle || '';
      memberForm.linkedin_handle.value = cur.linkedin_handle || '';
      
      // Update color inputs and previews
      const primaryColor = (cur.primary_color || '#3D8FD6').toUpperCase();
      const secondaryColor = (cur.secondary_color || '#274060').toUpperCase();
      memberForm.primary_color.value = primaryColor;
      memberForm.secondary_color.value = secondaryColor;
      
      // تحديث معاينات الألوان وأكواد الألوان
      if (primaryColorPreview) primaryColorPreview.style.background = primaryColor;
      if (primaryColorCode) primaryColorCode.textContent = primaryColor;
      if (secondaryColorPreview) secondaryColorPreview.style.background = secondaryColor;
      if (secondaryColorCode) secondaryColorCode.textContent = secondaryColor;
      
      // تحديث لون أيقونة القطرة لتعكس اللون المختار
      const primaryDropletIcon = memberForm.querySelector('label span i.fa-droplet[style*="color:#3d8fd6"]');
      const secondaryDropletIcon = memberForm.querySelector('label span i.fa-droplet[style*="color:#274060"]');
      if (primaryDropletIcon) primaryDropletIcon.style.color = primaryColor;
      if (secondaryDropletIcon) secondaryDropletIcon.style.color = secondaryColor;
      const imgUrl = (cur.avatar || cur.avatar_url) || '';
      if (memberImageUrl) memberImageUrl.value = imgUrl;
      if (memberImagePreview) {
        if (imgUrl) { memberImagePreview.src = imgUrl; memberImagePreview.style.display = 'block'; }
        else { memberImagePreview.src = ''; memberImagePreview.style.display = 'none'; }
      }
      if (memberAvatarPlaceholder) {
        if (imgUrl) memberAvatarPlaceholder.style.display = 'none';
        else memberAvatarPlaceholder.style.display = 'block';
      }
      if (memberImageFile) memberImageFile.value = '';
      memberCroppedFile = null;
      if (imgUrl) { if (memberDropzone) memberDropzone.style.display = 'none'; if (memberImageActions) memberImageActions.style.display = 'flex'; }
      else { if (memberDropzone) memberDropzone.style.display = 'none'; if (memberImageActions) memberImageActions.style.display = 'none'; }
      openDialog?.(memberDialog);
    } else if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = members[idx];
      if (sb && cur.id) {
        sb.from('members').delete().eq('id', cur.id).then(({ error }) => {
          if (error) return alert('فشل الحذف: ' + error.message);
          members.splice(idx, 1);
          applyMembersFilters();
        });
      } else {
        members.splice(idx, 1);
        save(KEYS.members, members);
        applyMembersFilters();
      }
    }
  });

  // Color picker functionality
  const primaryColorInput = document.getElementById('primaryColorInput');
  const primaryColorPreview = document.getElementById('primaryColorPreview');
  const primaryColorCode = document.getElementById('primaryColorCode');
  const secondaryColorInput = document.getElementById('secondaryColorInput');
  const secondaryColorPreview = document.getElementById('secondaryColorPreview');
  const secondaryColorCode = document.getElementById('secondaryColorCode');

  // تحديث اللون عند التغيير
  if (primaryColorInput && primaryColorPreview && primaryColorCode) {
    const updatePrimary = (val) => {
      const color = (val || primaryColorInput.value || '').toUpperCase();
      if (!color) return;
      primaryColorPreview.style.background = color;
      primaryColorCode.textContent = color;
    };
    primaryColorInput.addEventListener('input', (e) => updatePrimary(e.target.value));
    primaryColorInput.addEventListener('change', (e) => updatePrimary(e.target.value));
  }

  if (secondaryColorInput && secondaryColorPreview && secondaryColorCode) {
    const updateSecondary = (val) => {
      const color = (val || secondaryColorInput.value || '').toUpperCase();
      if (!color) return;
      secondaryColorPreview.style.background = color;
      secondaryColorCode.textContent = color;
    };
    secondaryColorInput.addEventListener('input', (e) => updateSecondary(e.target.value));
    secondaryColorInput.addEventListener('change', (e) => updateSecondary(e.target.value));
  }

  // وظيفة نسخ كود اللون
  function copyColorCode(codeId) {
    const codeElement = document.getElementById(codeId);
    if (!codeElement) return;
    
    const colorCode = codeElement.textContent;
    const btn = document.querySelector(`[data-color-target="${codeId}"]`);
    const btnText = btn?.querySelector('.copy-text');
    const btnIcon = btn?.querySelector('i');
    const originalBtnText = btnText?.textContent || 'نسخ';
    
    // نسخ النص إلى الحافظة
    const fallbackCopy = () => {
      // طريقة بديلة للنسخ تعمل بشكل أفضل على iOS وسياقات غير آمنة
      // المحاولة 1: حقل داخل إطار العرض (Viewport) مع تحديد واضح
      const textArea = document.createElement('textarea');
      textArea.value = colorCode;
      textArea.setAttribute('readonly', '');
      textArea.setAttribute('aria-hidden', 'true');
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      textArea.style.fontSize = '16px'; // لتجنب التكبير على iOS
      textArea.style.padding = '0';
      textArea.style.margin = '0';
      textArea.style.border = '0';
      textArea.style.background = 'transparent';
      document.body.appendChild(textArea);

      // إزالة أي تحديدات سابقة
      try { window.getSelection()?.removeAllRanges(); } catch {}

      // تحديد النص (iOS يتطلب setSelectionRange)
      textArea.focus();
      textArea.select();
      try { textArea.setSelectionRange(0, textArea.value.length); } catch {}

      let ok = false;
      // اعتراض حدث النسخ وحقن البيانات لضمان نجاح النسخ على iOS
      const onCopy = (e) => {
        try {
          e.clipboardData?.setData('text/plain', colorCode);
          ok = true;
          e.preventDefault();
        } catch {}
      };
      document.addEventListener('copy', onCopy, true);
      try {
        ok = document.execCommand('copy') || ok;
      } catch (err) {
        ok = false;
        console.error('فشل نسخ النص: ', err);
      }
      document.removeEventListener('copy', onCopy, true);

      document.body.removeChild(textArea);

      if (!ok) {
        // المحاولة 2: تحديد العنصر المرئي نفسه ثم النسخ
        try {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(codeElement);
          selection.removeAllRanges();
          selection.addRange(range);
          // إعادة استخدام معالج النسخ هنا أيضاً
          const onCopy2 = (e) => {
            try {
              e.clipboardData?.setData('text/plain', colorCode);
              ok = true;
              e.preventDefault();
            } catch {}
          };
          document.addEventListener('copy', onCopy2, true);
          ok = document.execCommand('copy') || ok;
          document.removeEventListener('copy', onCopy2, true);
          selection.removeAllRanges();
        } catch (e) {
          ok = false;
        }
      }

      if (ok) {
        showCopySuccess();
      } else {
        showCopyFailure();
      }
    };
    
    // إظهار تنبيه نجاح النسخ
    const showCopySuccess = () => {
      // تغيير مظهر الزر
      if (btn) {
        // تطبيق تنسيق النجاح باللون الأخضر
        btn.style.background = 'linear-gradient(135deg, #10b981, #34d399)';
        btn.style.borderColor = 'rgba(16, 185, 129, 0.5)';
        btn.style.color = '#fff';
        btn.style.boxShadow = '0 8px 18px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
      }
      
      if (btnText) btnText.textContent = 'تم النسخ';
      if (btnIcon) {
        btnIcon.classList.remove('fa-copy');
        btnIcon.classList.remove('fa-regular');
        btnIcon.classList.add('fa-check');
        btnIcon.classList.add('fa-solid');
      }
      
      // تغيير مظهر كود اللون
      codeElement.style.background = '#ecfdf5';
      codeElement.style.color = '#065f46';
      codeElement.style.borderColor = '#10b981';
      
      // إعادة المظهر الأصلي بعد ثانية
      setTimeout(() => {
        if (btn) {
          btn.style.background = '';
          btn.style.borderColor = '';
          btn.style.color = '';
          btn.style.boxShadow = '';
        }
        
        if (btnText) btnText.textContent = originalBtnText;
        if (btnIcon) {
          btnIcon.classList.remove('fa-check');
          btnIcon.classList.remove('fa-solid');
          btnIcon.classList.add('fa-copy');
          btnIcon.classList.add('fa-regular');
        }
        
        codeElement.style.background = '';
        codeElement.style.color = '';
        codeElement.style.borderColor = '';
      }, 1500);
    };

    // إظهار فشل النسخ وإتاحة نسخ يدوي سريع
    const showCopyFailure = () => {
      if (btn) {
        btn.style.background = 'linear-gradient(135deg, #ef4444, #f87171)';
        btn.style.borderColor = 'rgba(239, 68, 68, 0.5)';
        btn.style.color = '#fff';
        btn.style.boxShadow = '0 8px 18px rgba(239, 68, 68, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
      }
      if (btnText) btnText.textContent = 'لم يتم النسخ';
      if (btnIcon) {
        btnIcon.classList.remove('fa-copy');
        btnIcon.classList.add('fa-triangle-exclamation');
        btnIcon.classList.add('fa-solid');
      }
      try { window.prompt('انسخ هذا الكود:', colorCode); } catch {}
      setTimeout(() => {
        if (btn) {
          btn.style.background = '';
          btn.style.borderColor = '';
          btn.style.color = '';
          btn.style.boxShadow = '';
        }
        if (btnText) btnText.textContent = originalBtnText;
        if (btnIcon) {
          btnIcon.classList.remove('fa-triangle-exclamation');
          btnIcon.classList.remove('fa-solid');
          btnIcon.classList.add('fa-copy');
          btnIcon.classList.add('fa-regular');
        }
      }, 1500);
    };
    
    // محاولة استخدام Clipboard API أولاً
    if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(colorCode)
        .then(showCopySuccess)
        .catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  }

  // إضافة مستمعي أحداث لأزرار النسخ
  document.querySelectorAll('.color-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-color-target');
      if (targetId) copyColorCode(targetId);
    });
  });

  // ملاحظة: فتح منتقي اللون على الجوال يعتمد على label[for] المرتبط بالمدخل
  // لذلك لا حاجة لاستخدام click() برمجياً هنا لضمان عمله على iOS

  memberForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // determine final image url
    let finalImgUrl = (memberImageUrl?.value || '').trim();
    try {
      const uploaded = await uploadMemberImage();
      if (uploaded) finalImgUrl = uploaded;
    } catch (err) {
      return alert('فشل رفع الصورة: ' + (err?.message || 'غير معروف'));
    }
    memberCroppedFile = null;
    const data = {
      full_name: memberForm.full_name.value.trim(),
      email: memberForm.email.value.trim(),
      phone: memberForm.phone.value.trim(),
      college: memberForm.college.value.trim(),
      major: memberForm.major.value.trim(),
      academic_number: memberForm.academic_number.value.trim(),
      national_id: memberForm.national_id.value.trim(),
      degree: memberForm.degree.value.trim(),
      birth_date: memberForm.birth_date.value.trim(),
      committee: memberForm.committee.value.trim(),
      x_handle: memberForm.x_handle.value.trim(),
      instagram_handle: memberForm.instagram_handle.value.trim(),
      tiktok_handle: memberForm.tiktok_handle.value.trim(),
      linkedin_handle: memberForm.linkedin_handle.value.trim(),
      primary_color: memberForm.primary_color.value || null,
      secondary_color: memberForm.secondary_color.value || null,
      avatar: finalImgUrl,
      order: (memberEditingIndex !== null)
        ? (members[memberEditingIndex]?.order ?? null)
        : null,
    };
    if (sb) {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
      const payload = {
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
        college: data.college || null,
        major: data.major || null,
        academic_number: data.academic_number || null,
        national_id: data.national_id || null,
        degree: data.degree || null,
        birth_date: data.birth_date || null,
        committee: data.committee || null,
        x_handle: data.x_handle || null,
        instagram_handle: data.instagram_handle || null,
        tiktok_handle: data.tiktok_handle || null,
        linkedin_handle: data.linkedin_handle || null,
        primary_color: data.primary_color || null,
        secondary_color: data.secondary_color || null,
        avatar_url: data.avatar || null,
        order: data.order,
      };
      const payloadNoOrder = { ...payload }; delete payloadNoOrder.order;
      if (memberEditingIndex === null) {
        let row, error;
        ({ data: row, error } = await sb.from('members').insert(payload).select('*').single());
        if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res2 = await sb.from('members').insert(payloadNoOrder).select('*').single();
          if (res2.error) return alert('فشل الحفظ: ' + res2.error.message);
          members.unshift({ ...res2.data, order: data.order });
        } else if (error) {
          return alert('فشل الحفظ: ' + error.message);
        } else {
          members.unshift(row);
        }
        applyMembersFilters();
        closeDialog?.(memberDialog);
      } else {
        const id = members[memberEditingIndex]?.id;
        if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
        let row, error;
        ({ data: row, error } = await sb.from('members').update(payload).eq('id', id).select('*').single());
        if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res2 = await sb.from('members').update(payloadNoOrder).eq('id', id).select('*').single();
          if (res2.error) return alert('فشل التحديث: ' + res2.error.message);
          members[memberEditingIndex] = { ...res2.data, order: data.order };
        } else if (error) {
          return alert('فشل التحديث: ' + error.message);
        } else {
          members[memberEditingIndex] = row;
        }
        applyMembersFilters();
        closeDialog?.(memberDialog);
      }
    } else {
      if (memberEditingIndex === null) members.unshift(data);
      else members[memberEditingIndex] = data;
      save(KEYS.members, members);
      applyMembersFilters();
      closeDialog?.(memberDialog);
    }
  });
  calNextBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    viewMonth += 1; if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    renderSchedule();
    loadScheduleForCurrentGrid();
  });
  calTodayBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const now = new Date(); viewYear = now.getFullYear(); viewMonth = now.getMonth();
    renderSchedule();
    loadScheduleForCurrentGrid();
  });

  // ===== International Days (Fixed-date subset) =====
  // A curated subset of widely recognized international/UN days (Arabic titles).
  // Only fixed dates are included; variable weekday-based observances are omitted for simplicity.
  const INTL_DAYS_FIXED = {
    '01': [
      ['24', 'اليوم الدولي للتعليم'],
      ['27', 'اليوم الدولي لإحياء ذكرى ضحايا الهولوكوست']
    ],
    '02': [
      ['04', 'اليوم العالمي للسرطان'],
      ['11', 'اليوم الدولي للمرأة والفتاة في ميدان العلوم'],
      ['13', 'اليوم العالمي للإذاعة'],
      ['20', 'اليوم العالمي للعدالة الاجتماعية'],
      ['21', 'اليوم الدولي للغة الأم']
    ],
    '03': [
      ['03', 'اليوم العالمي للحياة البرية'],
      ['08', 'اليوم العالمي للمرأة'],
      ['15', 'اليوم العالمي لحقوق المستهلك'],
      ['20', 'اليوم الدولي للسعادة'],
      ['21', 'اليوم العالمي لمتلازمة داون'],
      ['22', 'اليوم العالمي للمياه'],
      ['23', 'اليوم العالمي للأرصاد الجوية'],
      ['24', 'اليوم العالمي لمكافحة السل'],
      ['27', 'اليوم العالمي للمسرح']
    ],
    '04': [
      ['02', 'اليوم العالمي للتوعية بالتوحد'],
      ['07', 'اليوم العالمي للصحة'],
      ['21', 'اليوم العالمي للإبداع والابتكار'],
      ['22', 'يوم الأرض'],
      ['23', 'اليوم العالمي للكتاب وحقوق المؤلف'],
      ['25', 'اليوم العالمي لمكافحة الملاريا']
    ],
    '05': [
      ['01', 'اليوم العالمي للعمال'],
      ['03', 'اليوم العالمي لحرية الصحافة'],
      ['08', 'اليوم العالمي للصليب الأحمر والهلال الأحمر'],
      ['12', 'اليوم الدولي للممرضات والممرضين'],
      ['15', 'اليوم الدولي للأسر'],
      ['17', 'اليوم العالمي للاتصالات ومجتمع المعلومات'],
      ['20', 'اليوم العالمي للقياس'],
      ['21', 'اليوم العالمي للتنوع الثقافي'],
      ['22', 'اليوم الدولي للتنوع البيولوجي'],
      ['31', 'اليوم العالمي للامتناع عن تعاطي التبغ']
    ],
    '06': [
      ['03', 'اليوم العالمي للدراجة الهوائية'],
      ['05', 'اليوم العالمي للبيئة'],
      ['08', 'اليوم العالمي للمحيطات'],
      ['12', 'اليوم العالمي لمكافحة عمل الأطفال'],
      ['14', 'اليوم العالمي للمتبرعين بالدم'],
      ['20', 'اليوم العالمي للاجئين'],
      ['21', 'اليوم العالمي لليوغا'],
      ['26', 'اليوم الدولي لمكافحة تعاطي المخدرات والاتجار غير المشروع بها']
    ],
    '07': [
      ['11', 'اليوم العالمي للسكان'],
      ['15', 'اليوم العالمي لمهارات الشباب'],
      ['18', 'يوم نيلسون مانديلا الدولي']
    ],
    '08': [
      ['09', 'اليوم الدولي للشعوب الأصلية في العالم'],
      ['12', 'اليوم الدولي للشباب'],
      ['19', 'اليوم العالمي للعمل الإنساني'],
      ['23', 'اليوم الدولي لإحياء ذكرى تجارة الرقيق وإلغائها']
    ],
    '09': [
      ['05', 'اليوم الدولي للعمل الخيري'],
      ['08', 'اليوم الدولي لمحو الأمية'],
      ['15', 'اليوم الدولي للديمقراطية'],
      ['21', 'اليوم الدولي للسلام'],
      ['27', 'اليوم العالمي للسياحة'],
      ['28', 'اليوم الدولي للوصول إلى المعلومات']
    ],
    '10': [
      ['01', 'اليوم الدولي لكبار السن'],
      ['02', 'اليوم الدولي للاعنف'],
      ['05', 'اليوم العالمي للمعلمين'],
      ['10', 'اليوم العالمي للصحة النفسية'],
      ['11', 'اليوم الدولي للطفلة'],
      ['13', 'اليوم الدولي للحد من مخاطر الكوارث'],
      ['15', 'اليوم العالمي لغسل اليدين'],
      ['16', 'اليوم العالمي للأغذية'],
      ['17', 'اليوم الدولي للقضاء على الفقر'],
      ['24', 'يوم الأمم المتحدة'],
      ['31', 'اليوم العالمي للمدن']
    ],
    '11': [
      ['10', 'اليوم العالمي للعلم من أجل السلام والتنمية'],
      ['14', 'اليوم العالمي لمرض السكري'],
      ['16', 'اليوم الدولي للتسامح'],
      ['19', 'اليوم العالمي لدورات المياه'],
      ['20', 'اليوم العالمي للطفل'],
      ['25', 'اليوم الدولي للقضاء على العنف ضد المرأة']
    ],
    '12': [
      ['01', 'اليوم العالمي للإيدز'],
      ['03', 'اليوم الدولي للأشخاص ذوي الإعاقة'],
      ['05', 'اليوم الدولي للمتطوعين'],
      ['10', 'اليوم العالمي لحقوق الإنسان'],
      ['18', 'اليوم العالمي للغة العربية'],
      ['20', 'اليوم الدولي للتضامن الإنساني']
    ]
  };

  function getIntlDaysForMonth(year, monthIdx /* 0-11 */) {
    const mm = String(monthIdx + 1).padStart(2, '0');
    const list = (INTL_DAYS_FIXED[mm] || []).map(([dd, title]) => {
      const d = Number(dd);
      const dt = new Date(year, monthIdx, d);
      if (dt.getMonth() !== monthIdx) return null; // skip invalid dates
      return { key: dateKey(year, monthIdx, d), title };
    }).filter(Boolean);
    return list;
  }

  async function importIntlDaysForVisibleMonth() {
    const intl = getIntlDaysForMonth(viewYear, viewMonth);
    if (!intl.length) { alert('لا توجد أيام عالمية ثابتة لهذا الشهر في القائمة.'); return; }
    const changed = new Set();
    for (const it of intl) {
      const k = it.key;
      const arr = schedule[k] = schedule[k] || [];
      const exists = arr.some(x => (x?.title || '').trim() === it.title.trim());
      if (!exists) {
        arr.push({ title: it.title, notes: null });
        changed.add(k);
      }
    }
    if (!changed.size) { alert('لا توجد عناصر جديدة لإضافتها.'); return; }
    saveSchedule();
    // Sync with Supabase if available and authenticated
    if (sb) {
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
          for (const k of changed) {
            try {
              const arr = itemsFrom(schedule[k]);
              // Delete existing for k
              const { error: delErr } = await sb.from('schedule_entries').delete().eq('date', k);
              if (delErr) throw delErr;
              if (arr.length) {
                const rows = arr.map((it, i) => ({ date: k, title: it.title || null, notes: it.notes || null, position: i + 1 }));
                let res = await sb.from('schedule_entries').insert(rows).select('*');
                if (res.error && /(column\s+position|unknown column|invalid input)/i.test(res.error.message || '')) {
                  const rows2 = arr.map((it) => ({ date: k, title: it.title || null, notes: it.notes || null }));
                  const res2 = await sb.from('schedule_entries').insert(rows2).select('*');
                  if (res2.error) throw res2.error;
                } else if (res.error) {
                  throw res.error;
                }
              }
            } catch (e) {
              console.error('Sync failed for', k, e);
            }
          }
        }
      } catch {}
    }
    renderSchedule();
    renderIntlDaysTable();
    alert('تمت إضافة الأيام العالمية لهذا الشهر');
  }

  calIntlBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await importIntlDaysForVisibleMonth();
  });

  // Open custom international day dialog
  intlAddCustomBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    try {
      if (intlCustomDate) {
        const d = new Date(viewYear, viewMonth, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        intlCustomDate.value = `${yyyy}-${mm}-${dd}`;
      }
      if (intlCustomTitle) intlCustomTitle.value = '';
      if (typeof openDialog === 'function') openDialog(intlCustomDialog);
      else intlCustomDialog?.showModal?.();
    } catch {}
  });

  // Save custom international day
  intlCustomForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dateStr = (intlCustomDate?.value || '').trim();
    const title = (intlCustomTitle?.value || '').trim();
    if (!dateStr || !title) { alert('يرجى إدخال التاريخ والعنوان'); return; }
    const key = dateStr.slice(0, 10);
    const arr = schedule[key] = itemsFrom(schedule[key]);
    const exists = arr.some(x => (x?.title || '').trim() === title);
    if (exists) {
      alert('هذا اليوم موجود مسبقًا في هذا التاريخ');
    } else {
      arr.push({ title, notes: null });
      saveSchedule();
      if (sb) {
        try {
          const { data: { session } } = await sb.auth.getSession();
          if (session) {
            const curArr = itemsFrom(schedule[key]);
            const { error: delErr } = await sb.from('schedule_entries').delete().eq('date', key);
            if (delErr) throw delErr;
            if (curArr.length) {
              const rows = curArr.map((it, i) => ({ date: key, title: it.title || null, notes: it.notes || null, position: i + 1 }));
              let res = await sb.from('schedule_entries').insert(rows).select('*');
              if (res.error && /(column\s+position|unknown column|invalid input)/i.test(res.error.message || '')) {
                const rows2 = curArr.map((it) => ({ date: key, title: it.title || null, notes: it.notes || null }));
                const res2 = await sb.from('schedule_entries').insert(rows2).select('*');
                if (res2.error) throw res2.error;
              } else if (res.error) {
                throw res.error;
              }
            }
          }
        } catch (err) {
          console.error('Failed to sync custom intl day', key, err);
        }
      }
    }
    renderSchedule();
    renderIntlDaysTable();
    try { if (typeof closeDialog === 'function') closeDialog(intlCustomDialog); else intlCustomDialog?.close?.(); } catch {}
  });

  function formatDateShortAr(key) {
    const [y, m, d] = key.split('-').map(Number);
    try { return new Date(y, m - 1, d).toLocaleDateString('ar', { day: 'numeric', month: 'long' }); } catch { return key; }
  }
  // Simple ID generator
  function genId() {
    try { return crypto.randomUUID(); } catch { return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  }

  function renderIntlDaysTable() {
    if (!intlDaysTableBody) return;
    const list = getIntlDaysForMonth(viewYear, viewMonth);
    // Keep header and "Add" button visible; hide only the table when no fixed days
    const wrap = document.getElementById('intlDaysTableWrap');
    if (wrap) wrap.style.display = list.length ? '' : 'none';
    intlDaysTableBody.innerHTML = '';
    list.forEach(({ key, title }) => {
      const exists = itemsFrom(schedule[key]).some(x => (x?.title || '').trim() === title.trim());
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="التاريخ" style="padding:12px">${formatDateShortAr(key)}</td>
        <td data-label="العنوان" style="padding:12px">${title}</td>
        <td data-label="إجراء" style="padding:12px">
          ${exists
            ? `<button class="btn btn-outline" data-act="open" data-date="${key}"><i class="fa-solid fa-eye"></i> فتح اليوم</button>`
            : `<button class="btn btn-outline" data-act="add" data-date="${key}" data-title="${title}"><i class="fa-solid fa-plus"></i> إضافة</button>`
          }
        </td>`;
      intlDaysTableBody.appendChild(tr);
    });
  }

  intlDaysTableBody?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const key = btn.dataset.date;
    const act = btn.dataset.act;
    if (!key || !act) return;
    if (act === 'open') { openDayEditor(key); return; }
    if (act === 'add') {
      const title = (btn.dataset.title || '').trim();
      if (!title) return;
      const arr = schedule[key] = itemsFrom(schedule[key]);
      const exists = arr.some(x => (x?.title || '').trim() === title);
      if (!exists) {
        arr.push({ title, notes: null });
        saveSchedule();
        if (sb) {
          try {
            const { data: { session } } = await sb.auth.getSession();
            if (session) {
              const curArr = itemsFrom(schedule[key]);
              const { error: delErr } = await sb.from('schedule_entries').delete().eq('date', key);
              if (delErr) throw delErr;
              if (curArr.length) {
                const rows = curArr.map((it, i) => ({ date: key, title: it.title || null, notes: it.notes || null, position: i + 1 }));
                let res = await sb.from('schedule_entries').insert(rows).select('*');
                if (res.error && /(column\s+position|unknown column|invalid input)/i.test(res.error.message || '')) {
                  const rows2 = curArr.map((it) => ({ date: key, title: it.title || null, notes: it.notes || null }));
                  const res2 = await sb.from('schedule_entries').insert(rows2).select('*');
                  if (res2.error) throw res2.error;
                } else if (res.error) {
                  throw res.error;
                }
              }
            }
          } catch (err) {
            console.error('Failed to sync intl day add', key, err);
          }
        }
        renderSchedule();
        renderIntlDaysTable();
      }
    }
  });

  // Day dialog handlers
  const scheduleDayDialog = document.getElementById('scheduleDayDialog');
  const scheduleDayForm = document.getElementById('scheduleDayForm');
  const scheduleSelectedDate = document.getElementById('scheduleSelectedDate');
  const dayDeleteBtn = document.getElementById('dayDeleteBtn');
  // Multiple items UI
  const dayItemTitle = document.getElementById('dayItemTitle');
  const dayItemNotes = document.getElementById('dayItemNotes');
  const dayAddBtn = document.getElementById('dayAddBtn');
  const dayCancelEditBtn = document.getElementById('dayCancelEditBtn');
  const dayEditState = document.getElementById('dayEditState');
  const dayItemsList = document.getElementById('dayItemsList');
  let dayItemsTemp = [];
  let dayEditingIndex = -1;

  function resetDayInputs() {
    if (dayItemTitle) dayItemTitle.value = '';
    if (dayItemNotes) dayItemNotes.value = '';
  }
  function setEditing(idx) {
    dayEditingIndex = idx;
    const isEdit = idx >= 0;
    if (dayCancelEditBtn) dayCancelEditBtn.style.display = isEdit ? '' : 'none';
    if (dayEditState) dayEditState.style.display = isEdit ? '' : 'none';
    if (dayAddBtn) dayAddBtn.innerHTML = isEdit ? '<i class="fa-solid fa-check"></i> تحديث' : '<i class="fa-solid fa-plus"></i> إضافة';
  }
  function renderDayItemsList() {
    if (!dayItemsList) return;
    dayItemsList.innerHTML = '';
    dayItemsTemp.forEach((it, idx) => {
      const div = document.createElement('div');
      div.className = 'day-item';
      const titleText = (it.title || '').trim();
      const notesText = (it.notes || '').trim();
      div.innerHTML = `
        <div class="day-item__text">
          ${titleText ? `<div class="day-item__title"><strong>${titleText}</strong></div>` : ''}
          ${notesText ? `<div class="day-item__notes">${notesText.replace(/</g,'&lt;')}</div>` : ''}
        </div>
        <div class="day-item__actions">
          <button type="button" class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i></button>
          <button type="button" class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i></button>
        </div>`;
      dayItemsList.appendChild(div);
    });
  }

  function arFullDateLabel(key) {
    const [y,m,d] = key.split('-').map(Number);
    try { return new Date(y, m-1, d).toLocaleDateString('ar', { weekday:'long', day:'numeric', month:'long', year:'numeric' }); } catch { return key; }
  }

  function openDayEditor(key) {
    if (!scheduleDayForm) return;
    scheduleDayForm.dataset.date = key;
    if (scheduleSelectedDate) scheduleSelectedDate.textContent = arFullDateLabel(key);
    // Load items into temp list
    dayItemsTemp = itemsFrom(schedule[key]).slice();
    renderDayItemsList();
    resetDayInputs();
    setEditing(-1);
    if (dayDeleteBtn) dayDeleteBtn.style.display = dayItemsTemp.length ? '' : 'none';
    openDialog?.(scheduleDayDialog);
  }

  calendarGrid?.addEventListener('click', (e) => {
    const cell = e.target.closest('.calendar-cell');
    if (!cell) return;
    const key = cell.getAttribute('data-date');
    if (!key) return;
    openDayEditor(key);
  });

  scheduleDayForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = scheduleDayForm.dataset.date;
    if (!key) return;
    if (sb) {
      // require auth for write
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { alert('يلزم تسجيل الدخول لإجراء التعديلات'); return; }
      try {
        // Delete all existing for this date
        const { error: delErr } = await sb.from('schedule_entries').delete().eq('date', key);
        if (delErr) throw delErr;
        if (dayItemsTemp.length) {
          const rows = dayItemsTemp.map((it, i) => ({ date: key, title: it.title || null, notes: it.notes || null, position: i + 1 }));
          let insErr = null;
          let res = await sb.from('schedule_entries').insert(rows).select('*');
          if (res.error && /(column\s+position|unknown column|invalid input)/i.test(res.error.message || '')) {
            // Retry without position column
            const rows2 = dayItemsTemp.map((it) => ({ date: key, title: it.title || null, notes: it.notes || null }));
            const res2 = await sb.from('schedule_entries').insert(rows2).select('*');
            insErr = res2.error || null;
          } else {
            insErr = res.error || null;
          }
          if (insErr) throw insErr;
        }
        // update local and UI
        if (!dayItemsTemp.length) delete schedule[key];
        else schedule[key] = itemsFrom(dayItemsTemp);
        saveSchedule();
        renderSchedule();
        closeDialog?.(scheduleDayDialog);
      } catch (err) {
        alert('فشل الحفظ: ' + (err?.message || 'غير معروف'));
      }
    } else {
      // local fallback
      if (!dayItemsTemp.length) {
        if (schedule[key]) delete schedule[key];
      } else {
        schedule[key] = itemsFrom(dayItemsTemp);
      }
      saveSchedule();
      renderSchedule();
      closeDialog?.(scheduleDayDialog);
    }
  });

  dayDeleteBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const key = scheduleDayForm?.dataset.date;
    if (!key) return;
    if (sb) {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { alert('يلزم تسجيل الدخول لإجراء التعديلات'); return; }
      try {
        const { error } = await sb.from('schedule_entries').delete().eq('date', key);
        if (error) throw error;
        delete schedule[key];
        dayItemsTemp = [];
        saveSchedule();
        renderSchedule();
        closeDialog?.(scheduleDayDialog);
      } catch (err) {
        alert('فشل الحذف: ' + (err?.message || 'غير معروف'));
      }
    } else {
      if (schedule[key]) delete schedule[key];
      dayItemsTemp = [];
      saveSchedule();
      renderSchedule();
      closeDialog?.(scheduleDayDialog);
    }
  });

  dayAddBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const t = (dayItemTitle?.value || '').trim();
    const n = (dayItemNotes?.value || '').trim();
    if (!t && !n) { alert('أدخل العنوان أو الملاحظات'); return; }
    const item = { title: t || null, notes: n || null };
    if (dayEditingIndex >= 0) {
      dayItemsTemp[dayEditingIndex] = item;
    } else {
      dayItemsTemp.push(item);
    }
    renderDayItemsList();
    resetDayInputs();
    setEditing(-1);
    if (dayDeleteBtn) dayDeleteBtn.style.display = dayItemsTemp.length ? '' : 'none';
  });

  dayCancelEditBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    resetDayInputs();
    setEditing(-1);
  });

  dayItemsList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (!Number.isInteger(idx) || idx < 0 || idx >= dayItemsTemp.length) return;
    if (act === 'edit') {
      const it = dayItemsTemp[idx];
      if (dayItemTitle) dayItemTitle.value = it.title || '';
      if (dayItemNotes) dayItemNotes.value = it.notes || '';
      setEditing(idx);
    } else if (act === 'del') {
      if (!confirm('تأكيد حذف العنصر؟')) return;
      dayItemsTemp.splice(idx, 1);
      renderDayItemsList();
      if (dayItemsTemp.length === 0) setEditing(-1);
      if (dayDeleteBtn) dayDeleteBtn.style.display = dayItemsTemp.length ? '' : 'none';
    }
  });

  // User badge helpers
  function timeGreeting() {
    const h = new Date().getHours();
    // Arabic greeting to match UI language
    return h < 12 ? 'صباح الخير' : 'مساء الخير';
  }
  function renderUserBadge(user) {
    const host = document.getElementById('adminUserBadge');
    if (!host) return;
    if (!user) { host.innerHTML = ''; return; }
    const md = user.user_metadata || {};
    const name = md.display_name || user.email || 'مستخدم';
    const avatarUrl = md.avatar_url && String(md.avatar_url).trim() ? md.avatar_url : null;
    const svg = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#cbd5e1"/>
        <circle cx="12" cy="10" r="3.2" fill="#64748b"/>
        <path d="M5.5 18.2c1.9-3 5-4.2 6.5-4.2s4.6 1.2 6.5 4.2c-2.1 1.7-4.6 2.8-6.5 2.8s-4.4-1.1-6.5-2.8z" fill="#64748b"/>
      </svg>`;
    host.innerHTML = `
      <div class="avatar">${avatarUrl ? `<img src="${avatarUrl}" alt="${name}" onerror="this.remove()" />` : svg}</div>
      <div class="meta">
        <span class="greet">${timeGreeting()}</span>
        <strong class="name">${name}</strong>
      </div>`;
  }

  function load(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to parse localStorage for', key, e);
      return [];
    }
  }


  // ===== Change Password (Admin) =====
  const adminChangePasswordForm = document.getElementById('adminChangePasswordForm');
  const adminCurrentPasswordInput = document.getElementById('admin_current_password');
  const adminNewPasswordInput = document.getElementById('admin_new_password');
  const adminConfirmPasswordInput = document.getElementById('admin_confirm_password');
  const adminPasswordMsg = document.getElementById('adminPasswordMsg');

  adminChangePasswordForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!sb) return;
    adminPasswordMsg && (adminPasswordMsg.textContent = '');
    const curr = (adminCurrentPasswordInput?.value || '').trim();
    const next = (adminNewPasswordInput?.value || '').trim();
    const conf = (adminConfirmPasswordInput?.value || '').trim();
    if (!curr || !next || !conf) { adminPasswordMsg && (adminPasswordMsg.textContent = 'يرجى تعبئة جميع الحقول'); return; }
    if (next !== conf) { adminPasswordMsg && (adminPasswordMsg.textContent = 'كلمتا المرور غير متطابقتين'); return; }
    if (next.length < 6) { adminPasswordMsg && (adminPasswordMsg.textContent = 'الحد الأدنى 6 أحرف'); return; }
    const btn = adminChangePasswordForm.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.style.opacity = .7; }
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user || !user.email) throw new Error('لا يوجد بريد مسجل');
      const { error: signInErr } = await sb.auth.signInWithPassword({ email: user.email, password: curr });
      if (signInErr) throw new Error('كلمة المرور الحالية غير صحيحة');
      const { error: updErr } = await sb.auth.updateUser({ password: next });
      if (updErr) throw updErr;
      adminPasswordMsg && (adminPasswordMsg.textContent = 'تم تغيير كلمة المرور. سيتم تسجيل الخروج...');
      // تنظيف الحقول
      try { adminCurrentPasswordInput.value = ''; adminNewPasswordInput.value = ''; adminConfirmPasswordInput.value = ''; } catch {}
      // تسجيل الخروج لإعادة الدخول بالكلمة الجديدة
      try { await sb.auth.signOut(); } catch {}
      location.replace('../auth/login.html?redirect=admin/admin.html');
    } catch (err) {
      adminPasswordMsg && (adminPasswordMsg.textContent = 'تعذر التغيير: ' + (err?.message || 'غير معروف'));
    } finally {
      if (btn) { btn.disabled = false; btn.style.opacity = 1; }
    }
  });

  // ===== Change Email (Admin) =====
  const adminChangeEmailForm = document.getElementById('adminChangeEmailForm');
  const adminNewEmailInput = document.getElementById('admin_new_email');
  const adminCurrentPasswordEmailInput = document.getElementById('admin_current_password_email');
  const adminEmailMsg = document.getElementById('adminEmailMsg');

  adminChangeEmailForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!sb) return;
    adminEmailMsg && (adminEmailMsg.textContent = '');
    const newEmail = (adminNewEmailInput?.value || '').trim();
    const currPwd = (adminCurrentPasswordEmailInput?.value || '').trim();
    if (!newEmail || !currPwd) { adminEmailMsg && (adminEmailMsg.textContent = 'يرجى إدخال البريد وكلمة المرور'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { adminEmailMsg && (adminEmailMsg.textContent = 'صيغة البريد غير صحيحة'); return; }
    const btn = adminChangeEmailForm.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.style.opacity = .7; }
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user || !user.email) throw new Error('لا يوجد بريد مسجل');
      const { error: signInErr } = await sb.auth.signInWithPassword({ email: user.email, password: currPwd });
      if (signInErr) throw new Error('كلمة المرور الحالية غير صحيحة');
      const redirectTo = new URL('../auth/login.html', location.origin).href;
      const { error: updErr } = await sb.auth.updateUser({ email: newEmail }, { emailRedirectTo: redirectTo });
      if (updErr) throw updErr;
      adminEmailMsg && (adminEmailMsg.textContent = 'تم إرسال رسالة تأكيد إلى بريدك الجديد. الرجاء فتح الرابط لتأكيد التغيير.');
      try { adminCurrentPasswordEmailInput.value = ''; } catch {}
    } catch (err) {
      adminEmailMsg && (adminEmailMsg.textContent = 'تعذر تغيير البريد: ' + (err?.message || 'غير معروف'));
    } finally {
      if (btn) { btn.disabled = false; btn.style.opacity = 1; }
    }
  });


  function renderAchievements() {
    if (!achievementsList) return;
    achievementsList.innerHTML = '';
    const sorted = [...achievements].sort((a, b) => (a.order || 999) - (b.order || 999));
    sorted.forEach((item, sortedIndex) => {
      const originalIdx = achievements.indexOf(item);
      const iconClass = item.icon || item.icon_class || 'fa-solid fa-trophy';
      const rawCount = (item.count ?? item.count_number ?? 0);
      const number = typeof rawCount === 'number' ? rawCount : Number(rawCount || 0);
      const plus = 'plus' in item ? !!item.plus : ('plus_flag' in item ? !!item.plus_flag : true);
      const displayOrder = (item.order ? Number(item.order) : (sortedIndex + 1));
      const node = el(`
        <div class="card draggable-card" data-idx="${originalIdx}" draggable="true">
          <span class="order-chip">#${displayOrder}</span>
          <div class="card__body" style="display:flex;gap:14px;align-items:center;">
            <div class="card__media" style="width:auto">
              <i class="${iconClass}" style="font-size:28px;color:#0ea5e9"></i>
            </div>
            <div style="flex:1">
              <div class="card__title">${item.label || ''}</div>
              <p class="card__text" style="margin:6px 0;color:#64748b">${number}${plus ? '+' : ''}</p>
              <div class="card__actions" style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
                <button class="btn btn-outline" data-act="up" data-idx="${originalIdx}" title="تحريك لأعلى"><i class="fa-solid fa-arrow-up"></i></button>
                <button class="btn btn-outline" data-act="down" data-idx="${originalIdx}" title="تحريك لأسفل"><i class="fa-solid fa-arrow-down"></i></button>
                <button class="btn btn-outline drag-handle" title="سحب لإعادة الترتيب"><i class="fa-solid fa-grip-vertical"></i></button>
                <button class="btn btn-outline" data-act="edit" data-idx="${originalIdx}"><i class="fa-solid fa-pen"></i> تعديل</button>
                <button class="btn btn-outline" data-act="del" data-idx="${originalIdx}"><i class="fa-solid fa-trash"></i> حذف</button>
              </div>
            </div>
          </div>
        </div>`);
      achievementsList.appendChild(node);
    });
    setupListDnD(achievementsList, achievements, KEYS.achievements, 'achievements', renderAchievements);
  }

  function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Membership applications: local fallback
  function localMembershipAppsGet() {
    try {
      const raw = localStorage.getItem(KEYS.membership_apps);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  // Per-admin membership notes (local fallback)
  function localMyMembershipNotesKey(uid) {
    try { return `adeeb_membership_app_notes_${String(uid || '')}`; } catch { return 'adeeb_membership_app_notes_'; }
  }
  function localMyMembershipNotesGet(uid) {
    try {
      const raw = localStorage.getItem(localMyMembershipNotesKey(uid));
      const obj = raw ? JSON.parse(raw) : {};
      return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
    } catch { return {}; }
  }
  function localMyMembershipNotesSet(uid, map) {
    try { localStorage.setItem(localMyMembershipNotesKey(uid), JSON.stringify(map && typeof map === 'object' ? map : {})); } catch {}
  }

  // ===== Shared notes (visible to all admins) =====
  const LOCAL_SHARED_NOTES_KEY = 'adeeb_membership_shared_notes';
  function localSharedNotesAllGet() {
    try {
      const raw = localStorage.getItem(LOCAL_SHARED_NOTES_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
    } catch { return {}; }
  }
  function localSharedNotesAllSet(all) {
    try { localStorage.setItem(LOCAL_SHARED_NOTES_KEY, JSON.stringify(all && typeof all === 'object' ? all : {})); } catch {}
  }
  function localNotesGetByApp(appId) {
    const all = localSharedNotesAllGet();
    const key = String(appId || '');
    const arr = all[key];
    return Array.isArray(arr) ? arr : [];
  }
  function localNotesSetByApp(appId, arr) {
    const all = localSharedNotesAllGet();
    const key = String(appId || '');
    all[key] = Array.isArray(arr) ? arr : [];
    localSharedNotesAllSet(all);
  }
  function renderMembershipAppNotes(rows, myUid) {
    if (!membershipAppNotesList) return;
    membershipAppNotesList.innerHTML = '';
    const list = Array.isArray(rows) ? rows : [];
    if (membershipAppNotesCount) {
      try { membershipAppNotesCount.textContent = String(list.length); } catch {}
    }
    list.forEach((n) => {
      const name = escapeHtml(n.admin_name || 'مستخدم');
      const when = formatArDate(n.created_at || n.updated_at || null) || '';
      const text = escapeHtml(n.note || '');
      const isMine = myUid && String(n.admin_user_id || '') === String(myUid);
      const node = el(`
        <div class="note-item" data-admin="${String(n.admin_user_id || '')}">
          <div class="note-item__meta">
            <span class="note-item__name">${name}</span>
            <span class="note-item__time">${when}</span>
          </div>
          <div class="note-item__text">${text}</div>
          ${isMine ? `
          <div class="note-item__actions">
            <button type="button" class="btn btn-outline btn-xs" data-act="edit"><i class="fa-solid fa-pen"></i> تعديل</button>
            <button type="button" class="btn btn-outline btn-xs" data-act="delete"><i class="fa-regular fa-trash-can"></i> حذف</button>
          </div>` : ''}
        </div>
      `);
      membershipAppNotesList.appendChild(node);
    });
  }
  async function fetchMembershipAppNotes(appId) {
    const empty = [];
    if (!appId) return empty;
    if (sb) {
      try {
        const { data, error } = await sb
          .from('membership_app_notes')
          .select('application_id, admin_user_id, admin_name, note, created_at')
          .eq('application_id', appId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return Array.isArray(data) ? data : empty;
      } catch (e) {
        const msg = e?.message || '';
        if (/(relation|table|membership_app_notes|does not exist|PGRST)/i.test(msg)) {
          const arr = localNotesGetByApp(appId);
          return arr.slice().sort((a,b) => String(b.created_at||'').localeCompare(String(a.created_at||'')));
        }
        return empty;
      }
    }
    return localNotesGetByApp(appId).slice().sort((a,b) => String(b.created_at||'').localeCompare(String(a.created_at||'')));
  }
  async function reloadMembershipAppNotes(appId) {
    if (!membershipAppNotesList) return;
    if (membershipAppNotesStatus) { membershipAppNotesStatus.style.display = ''; membershipAppNotesStatus.textContent = 'جاري التحميل...'; membershipAppNotesStatus.style.color = '#64748b'; }
    const rows = await fetchMembershipAppNotes(appId);
    let myUid = null;
    try { if (sb) { const { data: { user } } = await sb.auth.getUser(); myUid = user?.id || null; } } catch {}
    renderMembershipAppNotes(rows, myUid);
    if (membershipAppNotesStatus) { membershipAppNotesStatus.style.display = rows.length ? 'none' : ''; membershipAppNotesStatus.textContent = rows.length ? '' : 'لا توجد ملاحظات بعد'; }
  }

  // Edit/Delete handlers for own notes
  membershipAppNotesList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const noteEl = btn.closest('.note-item');
    if (!noteEl) return;
    const owner = String(noteEl.getAttribute('data-admin') || '');
    let myUid = null, adminName = 'مستخدم';
    try {
      if (sb) {
        const { data: { user } } = await sb.auth.getUser();
        myUid = user?.id || null;
        const md = user?.user_metadata || {};
        adminName = md.display_name || user?.email || adminName;
      }
    } catch {}
    const isOwner = (!!myUid && owner === String(myUid)) || (!myUid && owner === 'local');
    if (!isOwner) return; // safety: only owner can act

    const idx = membershipAppDetailsIndex;
    if (!Number.isInteger(idx) || idx < 0 || idx >= (membershipApps?.length || 0)) return;
    const appId = membershipApps[idx]?.id;
    if (appId == null) return;

    if (act === 'delete') {
      const ok = confirm('هل تريد حذف ملاحظتك؟');
      if (!ok) return;
      let cloudDone = false;
      if (sb && myUid) {
        try {
          const { error } = await sb.from('membership_app_notes')
            .delete()
            .eq('application_id', appId)
            .eq('admin_user_id', myUid);
          if (error) throw error;
          cloudDone = true;
        } catch (e) {
          const msg = e?.message || '';
          if (!/(relation|table|membership_app_notes|does not exist|PGRST)/i.test(msg)) {
            if (membershipAppNotesStatus) { membershipAppNotesStatus.style.display = ''; membershipAppNotesStatus.style.color = '#ef4444'; membershipAppNotesStatus.textContent = 'تعذر الحذف من الخادم'; }
            return;
          }
        }
      }
      if (!cloudDone) {
        const arr = localNotesGetByApp(appId).filter((n) => String(n.admin_user_id || 'local') !== (myUid ? String(myUid) : 'local'));
        localNotesSetByApp(appId, arr);
      }
      await reloadMembershipAppNotes(appId);
      if (membershipAppNotesStatus) { membershipAppNotesStatus.style.display = ''; membershipAppNotesStatus.style.color = '#10b981'; membershipAppNotesStatus.textContent = cloudDone ? 'تم الحذف ✓' : 'تم الحذف محليًا'; setTimeout(() => { try { membershipAppNotesStatus.style.display = 'none'; } catch {} }, 1600); }
      return;
    }

    if (act === 'edit') {
      const textEl = noteEl.querySelector('.note-item__text');
      const current = textEl ? textEl.textContent : '';
      const next = prompt('تحرير الملاحظة:', current || '');
      if (next == null) return; // canceled
      const newText = String(next).trim();
      if (!newText) return;
      let cloudDone = false;
      if (sb && myUid) {
        try {
          const { error } = await sb.from('membership_app_notes')
            .update({ note: newText, admin_name: adminName })
            .eq('application_id', appId)
            .eq('admin_user_id', myUid);
          if (error) throw error;
          cloudDone = true;
        } catch (e) {
          const msg = e?.message || '';
          if (!/(relation|table|membership_app_notes|does not exist|PGRST)/i.test(msg)) {
            if (membershipAppNotesStatus) { membershipAppNotesStatus.style.display = ''; membershipAppNotesStatus.style.color = '#ef4444'; membershipAppNotesStatus.textContent = 'تعذر التعديل على الخادم'; }
            return;
          }
        }
      }
      if (!cloudDone) {
        const arr = localNotesGetByApp(appId);
        const key = myUid ? String(myUid) : 'local';
        const updated = arr.map((n) => (String(n.admin_user_id || 'local') === key) ? { ...n, note: newText, admin_name: adminName, created_at: n.created_at || new Date().toISOString() } : n);
        localNotesSetByApp(appId, updated);
      }
      await reloadMembershipAppNotes(appId);
      if (membershipAppNotesStatus) { membershipAppNotesStatus.style.display = ''; membershipAppNotesStatus.style.color = '#10b981'; membershipAppNotesStatus.textContent = cloudDone ? 'تم التعديل ✓' : 'تم الحفظ محليًا'; setTimeout(() => { try { membershipAppNotesStatus.style.display = 'none'; } catch {} }, 1600); }
      return;
    }
  });

  // Initial Data
  let works = load(KEYS.works);
  let sponsors = load(KEYS.sponsors);
  let board = load(KEYS.board);
  let members = load(KEYS.members);
  let topics = load(KEYS.topics);
  let faq = load(KEYS.faq);
  let achievements = load(KEYS.achievements);
  let membershipApps = localMembershipAppsGet();
  let forms = [];
  let testimonials = load(KEYS.testimonials);
  let todos = load(KEYS.todos);
  let appointments = load(KEYS.appointments);
  let appointmentBookings = load(KEYS.appointment_bookings);
  let visitStats = { total: 0, new: 0, returning: 0 };

  // Auth UI controls
  const loginBtn = $('#loginBtn');
  const sidebarLogoutBtn = document.querySelector('[data-logout]');

  // ===== Notifications (Header) =====
  const notifBtn = document.getElementById('notifBtn');
  const notifBadge = document.getElementById('notifBadge');
  const notifDropdown = document.getElementById('notifDropdown');
  const notifList = document.getElementById('notifList');
  const notifEmpty = document.getElementById('notifEmpty');
  const notifMarkAllBtn = document.getElementById('notifMarkAll');
  const notifClearAllBtn = document.getElementById('notifClearAll');
  const NOTIF_KEY = 'adeeb_admin_notifications';
  let notifications = (() => {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  })();
  function saveNotifications() { try { localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications)); } catch {} }
  function notifUnreadCount() { try { return notifications.reduce((a, n) => a + (n && n.unread ? 1 : 0), 0); } catch { return 0; } }
  function renderNotifBadge() {
    if (!notifBadge) return;
    const c = notifUnreadCount();
    if (c > 0) { notifBadge.textContent = String(c); notifBadge.style.display = 'inline-flex'; }
    else { notifBadge.style.display = 'none'; }
  }
  function truncateText(s, n = 120) { const t = String(s || ''); return t.length > n ? t.slice(0, n) + '…' : t; }
  function getPeerMeta(uid) {
    try {
      const c = (chatContacts || []).find(x => x && x.user_id === uid);
      if (c) return { name: c.name || 'مستخدم', avatar_url: c.avatar_url || null, position: c.position || '' };
    } catch {}
    return { name: 'مستخدم', avatar_url: null, position: '' };
  }
  function renderNotificationsList() {
    if (!notifList || !notifEmpty) return;
    notifList.innerHTML = '';
    const list = notifications.slice(0, 50);
    if (!list.length) { notifEmpty.style.display = ''; return; }
    notifEmpty.style.display = 'none';
    list.forEach((n, idx) => {
      const meta = getPeerMeta(n.sender_id);
      const avatarInner = meta.avatar_url ? `<img src="${meta.avatar_url}" alt="${meta.name}" onerror="this.remove()" />` : '';
      const item = document.createElement('div');
      item.className = 'notif-item' + (n.unread ? ' unread' : '');
      item.innerHTML = `
        <div class="avatar">${avatarInner}</div>
        <div class="meta">
          <div class="title">${n.title || ''}</div>
          ${n.text ? `<div class="sub">${truncateText(n.text, 140)}</div>` : ''}
        </div>
        <div class="notif-acts">
          <button class="btn btn-outline small" data-act="open" data-idx="${idx}"><i class="fa-solid fa-arrow-left"></i></button>
          <button class="btn btn-outline small" data-act="dismiss" data-idx="${idx}"><i class="fa-regular fa-trash-can"></i></button>
        </div>`;
      notifList.appendChild(item);
    });
  }
  function openNotifDropdown(forceOpen) {
    if (!notifDropdown || !notifBtn) return;
    const willOpen = typeof forceOpen === 'boolean' ? forceOpen : !!notifDropdown.hidden;
    notifDropdown.hidden = !willOpen;
    notifBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  }
  function addNotification(n) {
    notifications.unshift({ ...n, id: n.id || ('loc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)), unread: true });
    saveNotifications();
    renderNotifBadge();
    if (notifDropdown && !notifDropdown.hidden) renderNotificationsList();
  }
  function notifyChatMessage(row) {
    const meta = getPeerMeta(row.sender_id);
    addNotification({
      type: 'chat',
      sender_id: row.sender_id,
      title: `رسالة جديدة من ${meta.name}`,
      text: String(row.content || ''),
      created_at: row.created_at || new Date().toISOString(),
    });
  }
  // Events
  notifBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openNotifDropdown(); if (!notifDropdown.hidden) renderNotificationsList(); });
  document.addEventListener('click', (e) => { const wrap = e.target.closest && e.target.closest('.notif-wrap'); if (!wrap) openNotifDropdown(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') openNotifDropdown(false); });
  notifMarkAllBtn?.addEventListener('click', (e) => { e.preventDefault(); notifications.forEach(n => n.unread = false); saveNotifications(); renderNotifBadge(); renderNotificationsList(); });
  notifClearAllBtn?.addEventListener('click', (e) => { e.preventDefault(); notifications = []; saveNotifications(); renderNotifBadge(); renderNotificationsList(); });
  notifList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (!Number.isInteger(idx) || idx < 0 || idx >= notifications.length) return;
    const n = notifications[idx];
    if (act === 'dismiss') {
      notifications.splice(idx, 1);
      saveNotifications(); renderNotifBadge(); renderNotificationsList();
      return;
    }
    if (act === 'open') {
      (async () => {
        try {
          n.unread = false; saveNotifications(); renderNotifBadge(); renderNotificationsList();
          if (n.type === 'chat' && n.sender_id) {
            if (!hasPermBySectionId('#section-chat')) { alert('لا تملك صلاحية الوصول لتبويب المحادثات'); return; }
            const link = document.querySelector('.admin-menu__item[href="#section-chat"]');
            if (link) link.dispatchEvent(new Event('click', { bubbles: true }));
            else {
              document.querySelectorAll('.admin-section').forEach(sec => sec.hidden = true);
              const target = document.getElementById('section-chat'); if (target) target.hidden = false;
            }
            openNotifDropdown(false);
            try { await initChatSection?.(); } catch {}
            try { await openChatWith?.(n.sender_id); } catch {}
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } catch {}
      })();
    }
  });
  // Initialize badge on load
  try { renderNotifBadge(); } catch {}

  async function refreshAuthUI() {
    if (!sb) return; // no supabase
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      loginBtn && (loginBtn.style.display = 'none');
      renderUserBadge(session.user);
      try { await applyCurrentUserPermissions(); } catch {}
      try { await chatEnsureAuth?.(); chatEnsureRealtime?.(); } catch {}
    } else {
      loginBtn && (loginBtn.style.display = 'inline-flex');
      renderUserBadge(null);
    }
  }

  async function getAdminExtra(userId) {
    if (!sb || !userId) return { position: null, phone: null, created_at: null };
    let position = null, phone = null, created_at = null;
    try {
      const { data: row, error } = await sb
        .from('admins')
        .select('position, created_at, phone')
        .eq('user_id', userId)
        .maybeSingle();
      if (!error && row) {
        position = row.position ?? position;
        phone = row.phone ?? phone;
        created_at = row.created_at ?? created_at;
      }
    } catch {}
    // Try public profile for phone/position if available in the view
    try {
      if (!position || !phone) {
        const { data: pr2, error: e2 } = await sb
          .from('auth_users_public')
          .select('user_id, phone, position')
          .eq('user_id', userId)
          .maybeSingle();
        if (!e2 && pr2) {
          position = position ?? pr2.position ?? null;
          phone = phone ?? pr2.phone ?? null;
        }
      }
    } catch {}
    return { position, phone, created_at };
  }

  function formatArDate(val) {
    try { return val ? new Date(val).toLocaleString('ar') : '—'; } catch { return '—'; }
  }

  // ===== Admin Tabs Permissions =====
  const SECTION_PERMISSIONS = {
    '#section-works': 'works',
    '#section-sponsors': 'sponsors',
    '#section-achievements': 'achievements',
    '#section-forms': 'forms',
    '#section-board': 'board',
    '#section-members': 'members',
    '#section-membership-apps': 'membership_apps',
    '#section-faq': 'faq',
    '#section-schedule': 'schedule',
    '#section-appointments': 'appointments',
    '#section-idea-board': 'idea_board',
    '#section-chat': 'chat',
    '#section-todos': 'todos',
    '#section-testimonials': 'testimonials',
    '#section-join': 'join',
    '#section-push': 'push',
  };
  function defaultAdminPerms() {
    return { works: true, sponsors: true, achievements: true, forms: true, board: true, members: true, membership_apps: true, faq: true, schedule: true, appointments: true, idea_board: true, chat: true, todos: true, testimonials: true, join: true, push: true };
  }
  function normalizePermsShape(perms) {
    const base = defaultAdminPerms();
    try { return { ...base, ...(perms || {}) }; } catch { return base; }
  }
  async function getAdminPerms(userId) {
    if (!sb || !userId) return null;
    try {
      // Prefer reading from public view (exposes other users' perms). Fallbacks handled by caller.
      const { data, error } = await sb
        .from('auth_users_public')
        .select('user_id, admin_perms')
        .eq('user_id', userId)
        .maybeSingle();
      if (error || !data) return null;
      let perms = data.admin_perms;
      if (!perms) return null;
      if (typeof perms === 'string') { try { perms = JSON.parse(perms); } catch {} }
      if (perms && typeof perms === 'object') return perms;
      return null;
    } catch { return null; }
  }
  let currentUserAdminPerms = null;
  function hasPermBySectionId(id) {
    if (!id) return true;
    const key = SECTION_PERMISSIONS[id];
    if (!key) return true; // sections without explicit mapping are allowed
    const perms = currentUserAdminPerms || defaultAdminPerms();
    return !!perms[key];
  }
  // Special-case: access to Site Management (الرئيسية/إدارة الموقع) depends on having at least
  // one permission for its cards (works, sponsors, achievements, board, join, faq, testimonials, blog)
  function hasAnySiteCardPerm() {
    try {
      const targets = [
        '#section-works',
        '#section-sponsors',
        '#section-achievements',
        '#section-forms',
        '#section-testimonials'
      ];
      return targets.some((sid) => hasPermBySectionId(sid));
    } catch { return true; }
  }
  async function applyCurrentUserPermissions() {
    if (!sb) return;
    try {
      const { data: { user } } = await sb.auth.getUser();
      const uid = user?.id;
      if (!uid) return;
      const perms = await getAdminPerms(uid);
      if (perms) {
        currentUserAdminPerms = normalizePermsShape(perms);
      } else {
        const lvl = await getCallerLevel();
        currentUserAdminPerms = normalizePermsShape(fallbackPermsForLevel(lvl));
      }
      // Hide disallowed sidebar items
      document.querySelectorAll('.admin-menu__item').forEach((link) => {
        const id = link.getAttribute('href');
        if (!hasPermBySectionId(id)) link.style.display = 'none';
        else link.style.display = '';
      });
      // Hide disallowed dashboard cards (buttons with data-go)
      document.querySelectorAll('[data-go]').forEach((btn) => {
        const id = btn.getAttribute('data-go');
        const card = btn.closest('.card');
        if (card) card.style.display = hasPermBySectionId(id) ? '' : 'none';
      });
      // Hide Site Management tab and section entirely if user has no perms for any of its cards
      const homeLink = document.querySelector('.admin-menu__item[href="#section-home"]');
      const homeSection = document.getElementById('section-home');
      const canHome = hasAnySiteCardPerm();
      if (homeLink) homeLink.style.display = canHome ? '' : 'none';
      // Do not force-show Home; only hide it if user can't access it
      if (homeSection) { if (!canHome) homeSection.hidden = true; }
    } catch {}
  }

  // ===== Admin Levels (1: President, 2: Vice, 3: Committee Leader, 4: Admin Officer, 5: Executive) =====
  const ADMIN_LEVELS = { president: 1, vice: 2, committee_leader: 3, admin_officer: 4, executive: 5 };
  function levelLabel(l) { 
    if (l === 1) return 'رئيس أديب';
    if (l === 2) return 'نائب الرئيس';
    if (l === 3) return 'قائد لجنة';
    if (l === 4) return 'مسؤول إداري';
    if (l === 5) return 'رئيس تنفيذي';
    return 'إداري';
  }
  function normalizeAr(s) {
    if (!s) return '';
    let t = String(s);
    // remove diacritics and tatweel
    t = t.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, '').replace(/\u0640/g, '');
    // normalize hamza forms to alif
    t = t.replace(/[أإآ]/g, 'ا');
    // normalize dashes/spaces
    t = t.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    return t;
  }
  function levelFromPositionAr(position) {
    if (!position) return ADMIN_LEVELS.executive;
    const p = normalizeAr(position);
    
    // الرتبة الأولى: رئيس أديب
    if (p.includes('رئيس') && p.includes('اديب')) return ADMIN_LEVELS.president;
    // للتوافق مع النظام القديم
    if (p.includes('رئيس') && p.includes('النادي')) return ADMIN_LEVELS.president;
    
    // الرتبة الثانية: نائب الرئيس
    if (p.includes('نائب') && p.includes('الرئيس')) return ADMIN_LEVELS.vice;
    
    // الرتبة الثالثة: قائد لجنة
    if (p.includes('قائد') && !p.includes('تنفيذ')) return ADMIN_LEVELS.committee_leader;
    
    // الرتبة الرابعة: مسؤول إداري
    if (p.includes('مسؤول')) return ADMIN_LEVELS.admin_officer;
    
    // الرتبة الخامسة: رئيس تنفيذي
    if (p.includes('رئيس') && p.includes('تنفيذ')) return ADMIN_LEVELS.executive;
    
    // افتراضي: رئيس تنفيذي (أقل رتبة)
    return ADMIN_LEVELS.executive;
  }
  function fallbackPermsForLevel(lv) {
    // رئيس أديب (1): كل الصلاحيات
    // نائب الرئيس (2): كل الصلاحيات
    // قائد لجنة (3): كل شيء ما عدا إدارة الإداريين
    // مسؤول إداري (4): كل شيء ما عدا إدارة الإداريين
    // رئيس تنفيذي (5): كل شيء ما عدا إدارة الإداريين
    const base = { works: true, sponsors: true, achievements: true, forms: true, board: true, members: true, membership_apps: true, faq: true, schedule: true, appointments: true, idea_board: true, chat: true, todos: true, admins: true, testimonials: true, join: true, push: true };
    // الرئيس ونائبه فقط لهم صلاحية إدارة الإداريين
    if (lv >= ADMIN_LEVELS.committee_leader) return { ...base, admins: false };
    return base;
  }
  async function getAdminLevelPublic(userId) {
    if (!sb || !userId) return ADMIN_LEVELS.executive;
    try {
      const { data, error } = await sb
        .from('auth_users_public')
        .select('user_id, admin_level, position')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) return ADMIN_LEVELS.executive;
      const lv = Number(data?.admin_level);
      if (Number.isFinite(lv) && lv >= 1 && lv <= 5) return lv;
      // fallback: derive from position (from view), else from admins table
      let pos = (data?.position || null);
      if (!pos) {
        try {
          const { data: row2 } = await sb.from('admins').select('position').eq('user_id', userId).maybeSingle();
          pos = row2?.position || null;
        } catch {}
      }
      return levelFromPositionAr(pos);
    } catch { return ADMIN_LEVELS.executive; }
  }
  async function getCallerLevel() {
    if (!sb) return ADMIN_LEVELS.executive;
    try {
      const { data: { user } } = await sb.auth.getUser();
      const mdLv = Number(user?.user_metadata?.admin_level);
      if (Number.isFinite(mdLv)) return mdLv;
      // fallback to mapping from public view (may derive from position too)
      return await getAdminLevelPublic(user?.id);
    } catch { return ADMIN_LEVELS.executive; }
  }
  function evalAdminActions(callerLevel, targetLevel, callerId, targetId) {
    // لا يمكن لأحد إدارة رئيس أديب
    if (targetLevel === ADMIN_LEVELS.president) {
      return { canEditPerms: false, canRemove: false, canEditLevel: false };
    }
    const isSelf = callerId && targetId && callerId === targetId;
    
    // رئيس أديب (1): يمكنه إدارة الجميع ما عدا نفسه
    if (callerLevel === ADMIN_LEVELS.president) {
      return { canEditPerms: !isSelf, canRemove: !isSelf, canEditLevel: !isSelf };
    }
    
    // نائب الرئيس (2): يمكنه إدارة قادة اللجان والمسؤولين والرؤساء التنفيذيين فقط
    if (callerLevel === ADMIN_LEVELS.vice) {
      const can = targetLevel >= ADMIN_LEVELS.committee_leader && !isSelf;
      return { canEditPerms: can, canRemove: can, canEditLevel: false };
    }
    
    // قائد لجنة (3) ومن دونه: لا يمكنهم إدارة أي إداري
    if (callerLevel >= ADMIN_LEVELS.committee_leader) {
      return { canEditPerms: false, canRemove: false, canEditLevel: false };
    }
    
    return { canEditPerms: false, canRemove: false, canEditLevel: false };
  }

  async function showAdminDetails(userId) {
    const pr = adminsProfilesMap.get(userId) || {};
    const row = adminsList.find(r => r && r.user_id === userId) || {};
    const name = (pr.display_name && String(pr.display_name).trim()) || 'مستخدم';
    const avatarUrl = (pr.avatar_url && String(pr.avatar_url).trim()) ? pr.avatar_url : '';
    const email = row.email || '—';
    const created = row.created_at || null;
    const extra = await getAdminExtra(userId);
    const position = extra.position || '—';
    const phone = extra.phone || '—';
    const createdAt = formatArDate(created || extra.created_at || null);
    // Resolve hierarchy (caller vs target)
    const targetLevel = await getAdminLevelPublic(userId);
    // Fallback permissions bound to level if no explicit admin_perms found
    const perms = await getAdminPerms(userId) || fallbackPermsForLevel(targetLevel);
    const { data: { user: caller } } = await sb.auth.getUser();
    const callerId = caller?.id || null;
    const callerLevel = await getCallerLevel();
    const { canEditPerms, canRemove, canEditLevel } = evalAdminActions(callerLevel, targetLevel, callerId, userId);
    adminDetailsCurrentUserId = userId;

    const safe = (s) => (s ? String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');
    const avatar = avatarUrl
      ? `<img src="${avatarUrl}" alt="${name}" onerror="this.remove()" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:4px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.15)" />`
      : `<div style="width:80px;height:80px;border-radius:50%;overflow:hidden;background:linear-gradient(135deg, #e2e8f0, #cbd5e1);display:grid;place-items:center;border:4px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.15)">
           <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
             <circle cx="12" cy="12" r="10" fill="#cbd5e1"/>
             <circle cx="12" cy="10" r="3.2" fill="#64748b"/>
             <path d="M5.5 18.2c1.9-3 5-4.2 6.5-4.2s4.6 1.2 6.5 4.2c-2.1 1.7-4.6 2.8-6.5 2.8s-4.4-1.1-6.5-2.8z" fill="#64748b"/>
           </svg>
         </div>`;
    
    // تحديد لون الرتبة
    const levelColor = targetLevel === 1 ? '#f59e0b' : targetLevel === 2 ? '#3b82f6' : targetLevel === 3 ? '#10b981' : targetLevel === 4 ? '#8b5cf6' : '#6366f1';
    const levelBg = targetLevel === 1 ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : targetLevel === 2 ? 'linear-gradient(135deg, #dbeafe, #bfdbfe)' : targetLevel === 3 ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)' : targetLevel === 4 ? 'linear-gradient(135deg, #ede9fe, #ddd6fe)' : 'linear-gradient(135deg, #e0e7ff, #c7d2fe)';

    // أيقونة الرتبة
    const levelIcon = targetLevel === 1 ? 'fa-crown' : targetLevel === 2 ? 'fa-medal' : targetLevel === 3 ? 'fa-star' : targetLevel === 4 ? 'fa-shield-halved' : 'fa-flag';
    
    const html = `
      <!-- رأس البطاقة مع الصورة والمعلومات الأساسية -->
      <div style="position:relative; text-align:center; padding:32px 24px 24px; background:linear-gradient(135deg, ${levelColor}08 0%, #ffffff 100%); border-radius:16px; border:2px solid ${levelColor}20; box-shadow:0 4px 16px ${levelColor}15; overflow:hidden">
        <!-- خلفية زخرفية -->
        <div style="position:absolute; top:-50px; right:-50px; width:150px; height:150px; background:${levelBg}; border-radius:50%; opacity:0.3; filter:blur(40px)"></div>
        <div style="position:absolute; bottom:-30px; left:-30px; width:100px; height:100px; background:${levelBg}; border-radius:50%; opacity:0.2; filter:blur(30px)"></div>
        
        <!-- الصورة الشخصية -->
        <div style="position:relative; display:inline-block; margin-bottom:16px">
          ${avatar}
          <!-- أيقونة الرتبة على الصورة -->
          <div style="position:absolute; bottom:-8px; right:-8px; width:36px; height:36px; background:${levelColor}; border-radius:50%; display:flex; align-items:center; justify-content:center; border:3px solid #fff; box-shadow:0 4px 12px ${levelColor}40">
            <i class="fa-solid ${levelIcon}" style="color:#fff; font-size:14px"></i>
          </div>
        </div>
        
        <!-- الاسم -->
        <h3 style="font-size:1.5rem; font-weight:800; color:#1e293b; margin:0 0 12px; font-family:fb; text-shadow:0 2px 4px rgba(0,0,0,0.05)">${safe(name)}</h3>
        
        <!-- badge الرتبة والمنصب -->
        <div style="display:inline-flex; align-items:center; gap:8px; padding:10px 24px; background:${levelBg}; border-radius:24px; font-size:0.95rem; font-weight:700; color:${levelColor}; margin-bottom:20px; box-shadow:0 2px 8px ${levelColor}25; border:1px solid ${levelColor}30">
          <i class="fa-solid ${levelIcon}" style="font-size:0.9rem"></i>
          <span>${safe(position !== '—' ? position : levelLabel(targetLevel))}</span>
        </div>
        
        <!-- زر بدء المحادثة -->
        <div style="position:relative; z-index:1">
          <button type="button" class="btn btn-primary" id="startChatWithAdminBtn" 
                  style="width:100%; max-width:320px; padding:12px 24px; font-size:1rem; font-weight:600; box-shadow:0 4px 12px rgba(59,130,246,0.3); transition:all 0.3s"
                  onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(59,130,246,0.4)'"
                  onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(59,130,246,0.3)'">
            <i class="fa-solid fa-comments" style="margin-left:8px"></i>
            <span>بدء محادثة</span>
          </button>
        </div>
      </div>

      <!-- الرتبة الإدارية -->
        <div style="margin-bottom:24px; padding:16px; background:${levelBg}; border-radius:12px; border:1px solid ${levelColor}40; box-shadow:0 2px 4px ${levelColor}20">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:${canEditLevel ? '16px' : '0'}">
            <div style="width:48px; height:48px; border-radius:12px; background:${levelColor}; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 8px ${levelColor}40">
              <i class="fa-solid fa-crown" style="font-size:20px; color:#fff"></i>
            </div>
            <div style="flex:1">
              <div style="font-size:0.7rem; color:${levelColor}; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px; opacity:0.8">الرتبة الحالية</div>
              <div style="font-size:1.1rem; color:${levelColor}; font-weight:700">${levelLabel(targetLevel)}</div>
            </div>
          </div>
          <div id="levelEditor" style="${canEditLevel ? '' : 'display:none'}">
            <div style="padding-top:16px; border-top:1px solid ${levelColor}30">
              <label style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px">
                <span style="font-size:0.85rem; font-weight:700; color:${levelColor}; display:flex; align-items:center; gap:6px">
                  <div style="width:24px; height:24px; border-radius:6px; background:${levelBg}; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px ${levelColor}30">
                    <i class="fa-solid fa-layer-group" style="font-size:0.7rem; color:${levelColor}"></i>
                  </div>
                  <span>تعديل الرتبة</span>
                </span>
                <select id="adminLevelSelect" style="padding:12px 14px; border-radius:10px; border:2px solid ${levelColor}; font-size:0.95rem; background:#fff; color:#1e293b; font-weight:600; transition:all 0.3s; box-shadow:0 2px 6px ${levelColor}20" onfocus="this.style.borderColor='${levelColor}'; this.style.boxShadow='0 4px 12px ${levelColor}40'" onblur="this.style.borderColor='${levelColor}'; this.style.boxShadow='0 2px 6px ${levelColor}20'">
                  <option value="2">نائب الرئيس</option>
                  <option value="3">قائد لجنة</option>
                  <option value="4">مسؤول إداري</option>
                  <option value="5">رئيس تنفيذي</option>
                </select>
              </label>
              
              <label style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px">
                <span style="font-size:0.85rem; font-weight:700; color:${levelColor}; display:flex; align-items:center; gap:6px">
                  <div style="width:24px; height:24px; border-radius:6px; background:${levelBg}; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px ${levelColor}30">
                    <i class="fa-solid fa-briefcase" style="font-size:0.7rem; color:${levelColor}"></i>
                  </div>
                  <span>تعديل المنصب</span>
                </span>
                <select id="adminPositionSelect" style="padding:12px 14px; border-radius:10px; border:2px solid ${levelColor}; font-size:0.95rem; background:#fff; color:#1e293b; font-weight:600; transition:all 0.3s; box-shadow:0 2px 6px ${levelColor}20" onfocus="this.style.borderColor='${levelColor}'; this.style.boxShadow='0 4px 12px ${levelColor}40'" onblur="this.style.borderColor='${levelColor}'; this.style.boxShadow='0 2px 6px ${levelColor}20'">
                  <option value="">اختر المنصب</option>
                </select>
              </label>
              
              <div style="display:flex;gap:8px;align-items:center">
                <button type="button" id="adminLevelSaveBtn" 
                        style="flex:1; padding:12px 20px; border-radius:10px; border:none; background:${levelColor}; color:#fff; font-size:1rem; font-weight:700; cursor:pointer; transition:all 0.3s; box-shadow:0 4px 12px ${levelColor}40; font-family:fb"
                        onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px ${levelColor}50'"
                        onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px ${levelColor}40'"
                        onmousedown="this.style.transform='translateY(0) scale(0.98)'"
                        onmouseup="this.style.transform='translateY(-2px) scale(1)'">
                  <i class="fa-regular fa-floppy-disk" style="margin-left:6px"></i>
                  حفظ التعديلات
                </button>
              </div>
              <div id="adminLevelMsg" style="margin-top:12px; text-align:center"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- معلومات الاتصال -->
      <div style="margin-bottom:24px">
        <h4 style="font-size:1rem; font-weight:700; color:#1e293b; margin:0 0 16px; padding-bottom:10px; border-bottom:2px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between">
          <div style="display:flex; align-items:center; gap:10px">
            <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #10b981, #34d399); display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(16,185,129,0.3)">
              <i class="fa-solid fa-address-card" style="color:#fff; font-size:14px"></i>
            </div>
            <span>معلومات الاتصال</span>
          </div>
          <div style="font-size:0.75rem; color:#64748b; font-weight:500">
            <i class="fa-solid fa-circle-info" style="font-size:0.7rem; margin-left:4px"></i>
            انقر للتواصل
          </div>
        </h4>
        <div style="display:grid; gap:14px">
          ${email && email !== '—' ? `
            <a href="mailto:${email}" 
               class="contact-card-link"
               style="display:flex; align-items:center; gap:14px; padding:16px; background:linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 2px 4px rgba(0,0,0,0.04); transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); text-decoration:none; cursor:pointer; position:relative; overflow:hidden"
               onmouseenter="
                 this.style.boxShadow='0 8px 20px rgba(61,143,214,0.25)';
                 this.style.transform='translateY(-3px)';
                 this.style.borderColor='#3d8fd6';
                 this.style.background='linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)';
                 this.querySelector('.email-icon-box').style.transform='scale(1.1) rotate(5deg)';
                 this.querySelector('.email-icon-box').style.boxShadow='0 6px 16px rgba(61,143,214,0.4)';
                 this.querySelector('.email-text').style.color='#3d8fd6';
                 this.querySelector('.email-arrow').style.color='#3d8fd6';
                 this.querySelector('.email-arrow').style.transform='translate(3px, -3px)';
               "
               onmouseleave="
                 this.style.boxShadow='0 2px 4px rgba(0,0,0,0.04)';
                 this.style.transform='translateY(0)';
                 this.style.borderColor='#e2e8f0';
                 this.style.background='linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)';
                 this.querySelector('.email-icon-box').style.transform='scale(1) rotate(0deg)';
                 this.querySelector('.email-icon-box').style.boxShadow='0 4px 8px rgba(61,143,214,0.3)';
                 this.querySelector('.email-text').style.color='#1e293b';
                 this.querySelector('.email-arrow').style.color='#cbd5e1';
                 this.querySelector('.email-arrow').style.transform='translate(0, 0)';
               "
               onmousedown="this.style.transform='translateY(-1px) scale(0.98)'"
               onmouseup="this.style.transform='translateY(-3px) scale(1)'">
              <div class="email-icon-box" style="width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg, #3d8fd6, #5ba3e0); display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 8px rgba(61,143,214,0.3); transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1)">
                <i class="fa-solid fa-envelope" style="font-size:20px; color:#fff"></i>
              </div>
              <div style="flex:1; min-width:0">
                <div style="font-size:0.7rem; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px">البريد الإلكتروني</div>
                <div class="email-text" style="font-size:1rem; color:#1e293b; font-weight:600; overflow:hidden; text-overflow:ellipsis; display:block; transition:color 0.3s">${safe(email)}</div>
              </div>
              <i class="fa-solid fa-arrow-up-right-from-square email-arrow" style="color:#cbd5e1; font-size:16px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"></i>
            </a>
          ` : ''}
          ${phone && phone !== '—' ? `
            <a href="tel:${phone}" 
               class="contact-card-link"
               style="display:flex; align-items:center; gap:14px; padding:16px; background:linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 2px 4px rgba(0,0,0,0.04); transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); text-decoration:none; cursor:pointer; position:relative; overflow:hidden"
               onmouseenter="
                 this.style.boxShadow='0 8px 20px rgba(16,185,129,0.25)';
                 this.style.transform='translateY(-3px)';
                 this.style.borderColor='#10b981';
                 this.style.background='linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)';
                 this.querySelector('.phone-icon-box').style.transform='scale(1.1) rotate(-5deg)';
                 this.querySelector('.phone-icon-box').style.boxShadow='0 6px 16px rgba(16,185,129,0.4)';
                 this.querySelector('.phone-icon').style.animation='phone-ring 0.5s ease-in-out';
                 this.querySelector('.phone-text').style.color='#10b981';
                 this.querySelector('.phone-arrow').style.color='#10b981';
                 this.querySelector('.phone-arrow').style.transform='translate(3px, -3px)';
               "
               onmouseleave="
                 this.style.boxShadow='0 2px 4px rgba(0,0,0,0.04)';
                 this.style.transform='translateY(0)';
                 this.style.borderColor='#e2e8f0';
                 this.style.background='linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)';
                 this.querySelector('.phone-icon-box').style.transform='scale(1) rotate(0deg)';
                 this.querySelector('.phone-icon-box').style.boxShadow='0 4px 8px rgba(16,185,129,0.3)';
                 this.querySelector('.phone-icon').style.animation='';
                 this.querySelector('.phone-text').style.color='#1e293b';
                 this.querySelector('.phone-arrow').style.color='#cbd5e1';
                 this.querySelector('.phone-arrow').style.transform='translate(0, 0)';
               "
               onmousedown="this.style.transform='translateY(-1px) scale(0.98)'"
               onmouseup="this.style.transform='translateY(-3px) scale(1)'">
              <div class="phone-icon-box" style="width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg, #10b981, #34d399); display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 8px rgba(16,185,129,0.3); transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1)">
                <i class="fa-solid fa-phone phone-icon" style="font-size:20px; color:#fff"></i>
              </div>
              <div style="flex:1; min-width:0">
                <div style="font-size:0.7rem; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px">رقم الجوال</div>
                <div class="phone-text" style="font-size:1rem; color:#1e293b; font-weight:600; direction:ltr; text-align:right; display:block; transition:color 0.3s">${safe(phone)}</div>
              </div>
              <i class="fa-solid fa-arrow-up-right-from-square phone-arrow" style="color:#cbd5e1; font-size:16px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"></i>
            </a>
          ` : `
            <div style="display:flex; align-items:center; gap:14px; padding:16px; background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius:12px; border:1px dashed #cbd5e1; opacity:0.7; position:relative; overflow:hidden">
              <div style="width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg, #e2e8f0, #cbd5e1); display:flex; align-items:center; justify-content:center; flex-shrink:0">
                <i class="fa-solid fa-envelope" style="font-size:20px; color:#94a3b8; opacity:0.6"></i>
              </div>
              <div style="flex:1; min-width:0">
                <div style="font-size:0.7rem; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px">البريد الإلكتروني</div>
                <div style="font-size:0.9rem; color:#64748b; font-weight:600; display:flex; align-items:center; gap:6px">
                  <i class="fa-solid fa-circle-exclamation" style="font-size:0.8rem"></i>
                  <span>غير متوفر</span>
                </div>
              </div>
            </div>
          `}
          ${phone && phone !== '—' ? `
            <a href="tel:${phone}" 
               class="contact-card-link"
               style="display:flex; align-items:center; gap:14px; padding:16px; background:linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 2px 4px rgba(0,0,0,0.04); transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); text-decoration:none; cursor:pointer; position:relative; overflow:hidden"
               onmouseenter="
                 this.style.boxShadow='0 8px 20px rgba(16,185,129,0.25)';
                 this.style.transform='translateY(-3px)';
                 this.style.borderColor='#10b981';
                 this.style.background='linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)';
                 this.querySelector('.phone-icon-box').style.transform='scale(1.1) rotate(-5deg)';
                 this.querySelector('.phone-icon-box').style.boxShadow='0 6px 16px rgba(16,185,129,0.4)';
                 this.querySelector('.phone-icon').style.animation='phone-ring 0.5s ease-in-out';
                 this.querySelector('.phone-text').style.color='#10b981';
                 this.querySelector('.phone-arrow').style.color='#10b981';
                 this.querySelector('.phone-arrow').style.transform='translate(3px, -3px)';
               "
               onmouseleave="
                 this.style.boxShadow='0 2px 4px rgba(0,0,0,0.04)';
                 this.style.transform='translateY(0)';
                 this.style.borderColor='#e2e8f0';
                 this.style.background='linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)';
                 this.querySelector('.phone-icon-box').style.transform='scale(1) rotate(0deg)';
                 this.querySelector('.phone-icon-box').style.boxShadow='0 4px 8px rgba(16,185,129,0.3)';
                 this.querySelector('.phone-icon').style.animation='';
                 this.querySelector('.phone-text').style.color='#1e293b';
                 this.querySelector('.phone-arrow').style.color='#cbd5e1';
                 this.querySelector('.phone-arrow').style.transform='translate(0, 0)';
               "
               onmousedown="this.style.transform='translateY(-1px) scale(0.98)'"
               onmouseup="this.style.transform='translateY(-3px) scale(1)'">
              <div class="phone-icon-box" style="width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg, #10b981, #34d399); display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 8px rgba(16,185,129,0.3); transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1)">
                <i class="fa-solid fa-phone phone-icon" style="font-size:20px; color:#fff"></i>
              </div>
              <div style="flex:1; min-width:0">
                <div style="font-size:0.7rem; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px">رقم الجوال</div>
                <div class="phone-text" style="font-size:1rem; color:#1e293b; font-weight:600; direction:ltr; text-align:right; display:block; transition:color 0.3s">${safe(phone)}</div>
              </div>
              <i class="fa-solid fa-arrow-up-right-from-square phone-arrow" style="color:#cbd5e1; font-size:16px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"></i>
            </a>
          ` : `
            <div style="display:flex; align-items:center; gap:14px; padding:16px; background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius:12px; border:1px dashed #cbd5e1; opacity:0.7; position:relative; overflow:hidden">
              <div style="width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg, #e2e8f0, #cbd5e1); display:flex; align-items:center; justify-content:center; flex-shrink:0">
                <i class="fa-solid fa-phone" style="font-size:20px; color:#94a3b8; opacity:0.6"></i>
              </div>
              <div style="flex:1; min-width:0">
                <div style="font-size:0.7rem; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px">رقم الجوال</div>
                <div style="font-size:0.9rem; color:#64748b; font-weight:600; display:flex; align-items:center; gap:6px">
                  <i class="fa-solid fa-circle-exclamation" style="font-size:0.8rem"></i>
                  <span>غير متوفر</span>
                </div>
              </div>
            </div>
          `}
        </div>
      </div>

      <!-- معلومات الحساب -->
      <div style="margin-bottom:24px">
        <h4 style="font-size:1rem; font-weight:700; color:#1e293b; margin:0 0 16px; padding-bottom:10px; border-bottom:2px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between">
          <div style="display:flex; align-items:center; gap:10px">
            <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #8b5cf6, #a78bfa); display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(139,92,246,0.3)">
              <i class="fa-solid fa-info-circle" style="color:#fff; font-size:14px"></i>
            </div>
            <span>معلومات الحساب</span>
          </div>
          <div style="font-size:0.75rem; color:#8b5cf6; font-weight:600; background:#f3e8ff; padding:4px 12px; border-radius:12px">
            <i class="fa-solid fa-database" style="font-size:0.7rem; margin-left:4px"></i>
            بيانات النظام
          </div>
        </h4>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:14px">
          <div style="position:relative; padding:18px; background:linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); border-radius:14px; border:1px solid #d8b4fe; box-shadow:0 2px 6px rgba(139,92,246,0.12); transition:all 0.3s; overflow:hidden" onmouseenter="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 6px 16px rgba(139,92,246,0.25)'" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(139,92,246,0.12)'">
            <div style="position:absolute; top:-10px; right:-10px; width:60px; height:60px; background:#8b5cf6; border-radius:50%; opacity:0.1"></div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px; position:relative">
              <div style="width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg, #8b5cf6, #a78bfa); display:flex; align-items:center; justify-content:center; box-shadow:0 4px 8px rgba(139,92,246,0.3)">
                <i class="fa-solid fa-calendar-plus" style="color:#fff; font-size:18px"></i>
              </div>
              <div style="font-size:0.75rem; color:#6b21a8; font-weight:700; text-transform:uppercase; letter-spacing:0.8px">تاريخ الإنشاء</div>
            </div>
            <div style="font-size:1.05rem; color:#581c87; font-weight:700; padding-right:4px">${createdAt}</div>
          </div>
          <div style="position:relative; padding:18px; background:linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); border-radius:14px; border:1px solid #d8b4fe; box-shadow:0 2px 6px rgba(139,92,246,0.12); transition:all 0.3s; overflow:hidden" onmouseenter="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 6px 16px rgba(139,92,246,0.25)'" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(139,92,246,0.12)'">
            <div style="position:absolute; top:-10px; right:-10px; width:60px; height:60px; background:#8b5cf6; border-radius:50%; opacity:0.1"></div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px; position:relative">
              <div style="width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg, #8b5cf6, #a78bfa); display:flex; align-items:center; justify-content:center; box-shadow:0 4px 8px rgba(139,92,246,0.3)">
                <i class="fa-solid fa-fingerprint" style="color:#fff; font-size:18px"></i>
              </div>
              <div style="font-size:0.75rem; color:#6b21a8; font-weight:700; text-transform:uppercase; letter-spacing:0.8px">المعرّف الفريد</div>
            </div>
            <div style="font-size:0.75rem; color:#581c87; font-weight:600; direction:ltr; text-align:right; word-break:break-all; font-family:monospace; background:#fff; padding:8px 10px; border-radius:8px; border:1px solid #d8b4fe">${userId}</div>
          </div>
        </div>
      </div>
      <!-- الصلاحيات -->
      <div id="adminPermsSection">
        <h4 style="font-size:1rem; font-weight:700; color:#1e293b; margin:0 0 16px; padding-bottom:10px; border-bottom:2px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between">
          <div style="display:flex; align-items:center; gap:10px">
            <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #f59e0b, #fbbf24); display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(245,158,11,0.3)">
              <i class="fa-solid fa-lock" style="color:#fff; font-size:14px"></i>
            </div>
            <span>الصلاحيات</span>
          </div>
          <div id="permsCounter" style="font-size:0.75rem; color:#f59e0b; font-weight:600; background:#fef3c7; padding:4px 12px; border-radius:12px">
            <i class="fa-solid fa-check-circle" style="font-size:0.7rem; margin-left:4px"></i>
            <span id="permsCountText">جاري التحميل...</span>
          </div>
        </h4>
        <div class="perm-grid" id="adminPermsGrid" style="background:linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%); padding:18px; border-radius:14px; border:1px solid #e2e8f0; box-shadow:0 2px 6px rgba(0,0,0,0.04)">
          <label class="perm"><input type="checkbox" id="perm-works" /><span class="name">إدارة الأعمال</span><span class="switch" aria-hidden="true"></span></label>
          <label class="perm"><input type="checkbox" id="perm-sponsors" /><span class="name">إدارة الرعاة</span><span class="switch" aria-hidden="true"></span></label>
          <label class="perm"><input type="checkbox" id="perm-achievements" /><span class="name">إدارة الإنجازات</span><span class="switch" aria-hidden="true"></span></label>
          <label class="perm"><input type="checkbox" id="perm-board" /><span class="name">المجلس الإداري</span><span class="switch" aria-hidden="true"></span></label>
          <label class="perm"><input type="checkbox" id="perm-members" /><span class="name">أعضاء النادي</span><span class="switch" aria-hidden="true"></span></label>
          <label class="perm"><input type="checkbox" id="perm-membership_apps" /><span class="name">طلبات العضوية</span><span class="switch" aria-hidden="true"></span></label>
          <label class="perm"><input type="checkbox" id="perm-forms" /><span class="name">الاستبيانات</span><span class="switch" aria-hidden="true"></span></label>
          <label class="perm"><input type="checkbox" id="perm-faq" /><span class="name">الأسئلة الشائعة</span><span class="switch" aria-hidden="true"></span></label>
          <label class="perm"><input type="checkbox" id="perm-idea_board" /><span class="name">سبورة أدِيب</span><span class="switch" aria-hidden="true"></span></label>
          <label class="perm"><input type="checkbox" id="perm-chat" /><span class="name">المحادثات</span><span class="switch" aria-hidden="true"></span></label>
          <label class="perm"><input type="checkbox" id="perm-schedule" /><span class="name">جدول أدِيب</span><span class="switch" aria-hidden="true"></span></label>
          <label class="perm"><input type="checkbox" id="perm-appointments" /><span class="name">حجز المواعيد</span><span class="switch" aria-hidden="true"></span></label>
          <label class="perm"><input type="checkbox" id="perm-todos" /><span class="name">المهام</span><span class="switch" aria-hidden="true"></span></label>
          <label class="perm"><input type="checkbox" id="perm-testimonials" /><span class="name">آراء الأعضاء</span><span class="switch" aria-hidden="true"></span></label>
          <label class="perm"><input type="checkbox" id="perm-join" /><span class="name">زر "انضم إلينا"</span><span class="switch" aria-hidden="true"></span></label>
          <label class="perm"><input type="checkbox" id="perm-push" /><span class="name">إرسال الإشعارات</span><span class="switch" aria-hidden="true"></span></label>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:16px;flex-wrap:wrap">
          <button type="button" class="btn btn-outline" id="permsSelectAll" style="flex:1; min-width:120px"><i class="fa-solid fa-check-double"></i> تحديد الكل</button>
          <button type="button" class="btn btn-outline" id="permsClearAll" style="flex:1; min-width:120px"><i class="fa-solid fa-xmark"></i> مسح الكل</button>
          <button type="button" class="btn btn-primary" id="adminPermsSaveBtn" style="flex:2; min-width:150px"><i class="fa-regular fa-floppy-disk"></i> حفظ الصلاحيات</button>
        </div>
        <div id="adminPermsMsg" style="margin-top:8px; text-align:center"></div>
      </div>`;
    if (adminDetailsBody) adminDetailsBody.innerHTML = html;
    // Initialize permissions UI
    try {
      // Start chat button
      document.getElementById('startChatWithAdminBtn')?.addEventListener('click', async () => {
        try {
          if (!hasPermBySectionId('#section-chat')) { alert('لا تملك صلاحية الوصول لتبويب المحادثات'); return; }
          // Switch to chat tab
          const link = document.querySelector('.admin-menu__item[href="#section-chat"]');
          if (link) {
            link.dispatchEvent(new Event('click', { bubbles: true }));
          } else {
            // Fallback: directly show the section
            document.querySelectorAll('.admin-section').forEach(sec => sec.hidden = true);
            const target = document.getElementById('section-chat'); if (target) target.hidden = false;
          }
          closeDialog?.(adminDetailsDialog);
          // Ensure chat is initialized then open conversation
          try { await initChatSection?.(); } catch {}
          try { await openChatWith?.(userId); } catch {}
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {}
      });

      const setPerm = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
      setPerm('perm-works', perms.works);
      setPerm('perm-sponsors', perms.sponsors);
      setPerm('perm-achievements', perms.achievements);
      setPerm('perm-board', perms.board);
      setPerm('perm-members', perms.members);
      setPerm('perm-membership_apps', perms.membership_apps);
      setPerm('perm-forms', perms.forms);
      setPerm('perm-faq', perms.faq);
      setPerm('perm-idea_board', perms.idea_board);
      setPerm('perm-chat', perms.chat);
      setPerm('perm-schedule', perms.schedule);
      setPerm('perm-appointments', perms.appointments);
      setPerm('perm-todos', perms.todos);
      setPerm('perm-testimonials', perms.testimonials);
      setPerm('perm-join', perms.join);
      setPerm('perm-push', perms.push);

      // دالة تحديث عداد الصلاحيات
      const updatePermsCounter = () => {
        const total = adminDetailsBody?.querySelectorAll('#adminPermsGrid input[type="checkbox"]').length || 0;
        const checked = adminDetailsBody?.querySelectorAll('#adminPermsGrid input[type="checkbox"]:checked').length || 0;
        const counterText = document.getElementById('permsCountText');
        if (counterText) {
          counterText.textContent = checked + ' من ' + total + ' مفعّلة';
        }
      };
      
      // تحديث العداد عند التحميل
      updatePermsCounter();
      
      // تحديث العداد عند تغيير أي صلاحية
      adminDetailsBody?.querySelectorAll('#adminPermsGrid input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', updatePermsCounter);
      });

      document.getElementById('permsSelectAll')?.addEventListener('click', () => {
        adminDetailsBody?.querySelectorAll('#adminPermsGrid input[type="checkbox"]:not(:disabled)')
          .forEach(cb => cb.checked = true);
        updatePermsCounter();
      });
      document.getElementById('permsClearAll')?.addEventListener('click', () => {
        adminDetailsBody?.querySelectorAll('#adminPermsGrid input[type="checkbox"]').forEach(cb => cb.checked = false);
        updatePermsCounter();
      });
      document.getElementById('adminPermsSaveBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('adminPermsSaveBtn');
        const msg = document.getElementById('adminPermsMsg');
        const gather = () => ({
          works: !!document.getElementById('perm-works')?.checked,
          sponsors: !!document.getElementById('perm-sponsors')?.checked,
          achievements: !!document.getElementById('perm-achievements')?.checked,
          board: !!document.getElementById('perm-board')?.checked,
          members: !!document.getElementById('perm-members')?.checked,
          membership_apps: !!document.getElementById('perm-membership_apps')?.checked,
          forms: !!document.getElementById('perm-forms')?.checked,
          faq: !!document.getElementById('perm-faq')?.checked,
          idea_board: !!document.getElementById('perm-idea_board')?.checked,
          chat: !!document.getElementById('perm-chat')?.checked,
          schedule: !!document.getElementById('perm-schedule')?.checked,
          appointments: !!document.getElementById('perm-appointments')?.checked,
          todos: !!document.getElementById('perm-todos')?.checked,
          testimonials: !!document.getElementById('perm-testimonials')?.checked,
          join: !!document.getElementById('perm-join')?.checked,
          push: !!document.getElementById('perm-push')?.checked,
        });
        try {
          if (msg) { msg.className = ''; msg.textContent = ''; msg.style.cssText = ''; }
          if (btn) { btn.disabled = true; btn.style.opacity = .7; }
          await callFunction('set-admin-perms', { method: 'POST', body: { user_id: adminDetailsCurrentUserId, perms: gather() } });
          if (msg) { 
            msg.textContent = '✓ تم حفظ الصلاحيات بنجاح'; 
            msg.style.cssText = 'color:#10b981; font-weight:600; padding:8px 16px; background:#d1fae5; border-radius:8px; display:inline-block';
          }
        } catch (err) {
          if (msg) { 
            msg.textContent = '✗ فشل الحفظ: ' + (err?.message || 'غير معروف'); 
            msg.style.cssText = 'color:#ef4444; font-weight:600; padding:8px 16px; background:#fee2e2; border-radius:8px; display:inline-block';
          }
        } finally {
          if (btn) { btn.disabled = false; btn.style.opacity = 1; }
        }
      });
      // Disable permissions UI if not allowed
      adminDetailsBody?.querySelectorAll('#adminPermsGrid input[type="checkbox"]').forEach(cb => { cb.disabled = !canEditPerms; });
      const savePermBtn = document.getElementById('adminPermsSaveBtn');
      if (savePermBtn) savePermBtn.style.display = canEditPerms ? '' : 'none';
      const selectAllBtn = document.getElementById('permsSelectAll');
      const clearAllBtn = document.getElementById('permsClearAll');
      if (selectAllBtn) selectAllBtn.style.display = canEditPerms ? '' : 'none';
      if (clearAllBtn) clearAllBtn.style.display = canEditPerms ? '' : 'none';

      // دالة لتحديث قائمة المناصب حسب الرتبة
      const updatePositionsByLevel = (level) => {
        const positionSelect = document.getElementById('adminPositionSelect');
        if (!positionSelect) return;
        
        // تعريف المناصب لكل رتبة
        const positionsByLevel = {
          2: [ // نائب الرئيس
            'نائب الرئيس - شطر الطالبات',
            'نائب الرئيس - شطر الطلاب'
          ],
          3: [ // قائد لجنة
            'قائد التأليف',
            'قائد الرواة',
            'قائد السفراء',
            'قائد الإنتاج',
            'قائد التصميم',
            'قائد التسويق',
            'قائد الفعاليات'
          ],
          4: [ // مسؤول إداري
            'مسؤول الأرشيف',
            'مسؤول الموارد البشرية'
          ],
          5: [ // رئيس تنفيذي
            'رئيس تنفيذ مرافئ',
            'رئيس تنفيذ وجيز'
          ]
        };
        
        const positions = positionsByLevel[level] || [];
        positionSelect.innerHTML = '<option value="">اختر المنصب</option>';
        positions.forEach(pos => {
          const option = document.createElement('option');
          option.value = pos;
          option.textContent = pos;
          positionSelect.appendChild(option);
        });
        
        // تعيين المنصب الحالي إذا كان متطابقاً مع الرتبة
        if (positions.includes(position)) {
          positionSelect.value = position;
        }
      };

      // Init level editor
      const levelSelect = document.getElementById('adminLevelSelect');
      const positionSelect = document.getElementById('adminPositionSelect');
      
      if (levelSelect) {
        levelSelect.value = String(Math.min(Math.max(targetLevel, 2), 5));
        updatePositionsByLevel(targetLevel);
        
        // تحديث المناصب عند تغيير الرتبة
        levelSelect.addEventListener('change', (e) => {
          const selectedLevel = Number(e.target.value);
          updatePositionsByLevel(selectedLevel);
        });
      }
      
      document.getElementById('adminLevelSaveBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('adminLevelSaveBtn');
        const msg = document.getElementById('adminLevelMsg');
        const newLevel = Number(document.getElementById('adminLevelSelect')?.value || 5);
        const newPosition = document.getElementById('adminPositionSelect')?.value || '';
        
        if (newLevel === 1) { 
          if (msg) { 
            msg.textContent = '✗ لا يمكن تعيين رئيس أديب من هنا'; 
            msg.style.cssText = 'color:#ef4444; font-weight:600; padding:8px 16px; background:#fee2e2; border-radius:8px; display:inline-block';
          } 
          return; 
        }
        
        if (!newPosition) {
          if (msg) { 
            msg.textContent = '✗ يرجى اختيار المنصب'; 
            msg.style.cssText = 'color:#ef4444; font-weight:600; padding:8px 16px; background:#fee2e2; border-radius:8px; display:inline-block';
          } 
          return;
        }
        
        try {
          if (msg) { msg.className = ''; msg.textContent = ''; msg.style.cssText = ''; }
          if (btn) { btn.disabled = true; btn.style.opacity = .7; }
          
          // حفظ الرتبة
          await callFunction('set-admin-level', { method: 'POST', body: { user_id: adminDetailsCurrentUserId, admin_level: newLevel } });
          
          // حفظ المنصب مباشرة في جدول admins
          if (newPosition) {
            const { error: posError } = await sb
              .from('admins')
              .update({ position: newPosition, admin_level: newLevel })
              .eq('user_id', adminDetailsCurrentUserId);
            
            if (posError) throw posError;
          }
          
          if (msg) { 
            msg.textContent = '✓ تم حفظ الرتبة والمنصب بنجاح'; 
            msg.style.cssText = 'color:#10b981; font-weight:600; padding:8px 16px; background:#d1fae5; border-radius:8px; display:inline-block';
          }
          
          // تحديث القائمة المحلية
          const adminRow = adminsList.find(a => a && a.user_id === adminDetailsCurrentUserId);
          if (adminRow) {
            adminRow.position = newPosition;
          }
          
          // تحديث العرض
          setTimeout(() => {
            showAdminDetails(adminDetailsCurrentUserId);
          }, 1500);
        } catch (err) {
          if (msg) { 
            msg.textContent = '✗ فشل الحفظ: ' + (err?.message || 'غير معروف'); 
            msg.style.cssText = 'color:#ef4444; font-weight:600; padding:8px 16px; background:#fee2e2; border-radius:8px; display:inline-block';
          }
        } finally {
          if (btn) { btn.disabled = false; btn.style.opacity = 1; }
        }
      });
    } catch {}
    // Hide/disable remove button based on hierarchy
    try {
      const btnRemove = document.getElementById('adminRemoveBtn');
      if (btnRemove) btnRemove.style.display = canRemove ? '' : 'none';
    } catch {}
    // Hide/disable remove button and perms block based on hierarchy
    try {
      const btnRemove = document.getElementById('adminRemoveBtn');
      if (btnRemove) btnRemove.style.display = canRemove ? '' : 'none';
      if (targetLevel === ADMIN_LEVELS.president) {
        const permsSection = document.getElementById('adminPermsSection');
        if (permsSection) permsSection.style.display = 'none';
      }
    } catch {}
    openDialog?.(adminDetailsDialog);
  }

  loginBtn?.addEventListener('click', () => {
    // Navigate to dedicated login page with redirect back to admin
    const url = new URL('../auth/login.html', location.href);
    url.searchParams.set('redirect', 'admin/admin.html');
    location.href = url.toString();
  });

  // Achievements CRUD
  const achievementDialog = $('#achievementDialog');
  const achievementForm = $('#achievementForm');
  let achievementEditingIndex = null;

  $('#addAchievementBtn')?.addEventListener('click', () => {
    achievementEditingIndex = null;
    achievementForm.reset();
    // defaults
    achievementForm.plus.checked = true;
    openDialog(achievementDialog);
  });

  achievementsList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'up' || act === 'down') {
      if (!Number.isInteger(idx) || idx < 0 || idx >= achievements.length) return;
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(achievements.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = achievements.splice(idx, 1);
      achievements.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(achievements, KEYS.achievements, 'achievements').then(() => {
        renderAchievements();
      });
      return;
    }
    if (act === 'edit') {
      achievementEditingIndex = idx;
      const cur = achievements[idx];
      achievementForm.label.value = cur.label || '';
      achievementForm.icon.value = cur.icon || cur.icon_class || '';
      const rawCount = (cur.count ?? cur.count_number ?? 0);
      achievementForm.count.value = typeof rawCount === 'number' ? rawCount : Number(rawCount || 0);
      achievementForm.plus.checked = 'plus' in cur ? !!cur.plus : ('plus_flag' in cur ? !!cur.plus_flag : true);
      openDialog(achievementDialog);
    } else if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = achievements[idx];
      if (sb && cur.id) {
        sb.from('achievements').delete().eq('id', cur.id).then(({ error }) => {
          if (error) return alert('فشل الحذف: ' + error.message);
          achievements.splice(idx, 1);
          renderAchievements();
        });
      } else {
        achievements.splice(idx, 1);
        save(KEYS.achievements, achievements);
        renderAchievements();
      }
    }
  });

  achievementForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      label: achievementForm.label.value.trim(),
      icon: achievementForm.icon.value.trim(),
      count: achievementForm.count.value ? Number(achievementForm.count.value) : 0,
      plus: !!achievementForm.plus.checked,
    };
    if (sb) {
      sb.auth.getSession().then(({ data: { session } }) => {
        if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
        const payload = {
          label: data.label,
          icon_class: data.icon || null,
          count_number: data.count,
          plus_flag: data.plus,
        };
        if (achievementEditingIndex === null) {
          sb.from('achievements').insert(payload).select('*').single().then(({ data: row, error }) => {
            if (error) return alert('فشل الحفظ: ' + error.message);
            achievements.unshift(row);
            renderAchievements();
            closeDialog(achievementDialog);
          });
        } else {
          const id = achievements[achievementEditingIndex]?.id;
          if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
          sb.from('achievements').update(payload).eq('id', id).select('*').single().then(({ data: row, error }) => {
            if (error) return alert('فشل التحديث: ' + error.message);
            achievements[achievementEditingIndex] = row;
            renderAchievements();
            closeDialog(achievementDialog);
          });
        }
      });
    } else {
      if (achievementEditingIndex === null) achievements.unshift(data);
      else achievements[achievementEditingIndex] = data;
      save(KEYS.achievements, achievements);
      renderAchievements();
      closeDialog(achievementDialog);
    }
  });

  async function doLogout() {
    if (!sb) {
      // Fallback: just go to login
      const url = new URL('../auth/login.html', location.href);
      url.searchParams.set('redirect', 'admin/admin.html');
      location.replace(url.toString());
      return;
    }
    await sb.auth.signOut();
    await refreshAuthUI();
    const url = new URL('../auth/login.html', location.href);
    url.searchParams.set('redirect', 'admin/admin.html');
    location.replace(url.toString());
  }

  sidebarLogoutBtn?.addEventListener('click', doLogout);

  // Sidebar toggle (mobile)
  const sidebar = $('#sidebar');
  const toggleSidebarBtn = $('#toggleSidebar');
  const closeSidebarBtn = $('#closeSidebarBtn');
  // Backdrop element for off-canvas sidebar (mobile only styles)
  const sidebarBackdrop = document.createElement('div');
  sidebarBackdrop.className = 'sidebar-backdrop';
  document.body.appendChild(sidebarBackdrop);

  const isMobile = () => window.matchMedia('(max-width: 992px)').matches;
  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add('open');
    if (isMobile()) {
      sidebarBackdrop.classList.add('show');
      document.body.classList.add('no-scroll');
    }
  }
  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('show');
    document.body.classList.remove('no-scroll');
  }
  function toggleSidebar() {
    if (!sidebar) return;
    if (sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
  }

  toggleSidebarBtn?.addEventListener('click', toggleSidebar);
  closeSidebarBtn?.addEventListener('click', closeSidebar);
  sidebarBackdrop.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });
  window.addEventListener('resize', () => {
    if (!isMobile()) closeSidebar();
  });

  // Menu navigation
  $$('.admin-menu__item').forEach((link) => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = link.getAttribute('href');
      if (!id) return;
      // Block navigating to Site Management if user lacks all its card permissions
      if (id === '#section-home' && !hasAnySiteCardPerm()) { alert('لا تملك صلاحية الوصول لهذا التبويب'); return; }
      if (!hasPermBySectionId(id)) { alert('لا تملك صلاحية الوصول لهذا التبويب'); return; }

      // set active
      $$('.admin-menu__item').forEach((l) => l.classList.remove('active'));
      link.classList.add('active');

      // show/hide sections
      $$('.admin-section').forEach((sec) => (sec.hidden = true));
      const target = $(id);
      if (target) target.hidden = false;

      // If profile tab is opened, load admin profile info
      if (id === '#section-profile') {
        try { adminLoadProfileIntoForm?.(); } catch {}
        try { updateInstallButtonVisibility?.(); } catch {}
        try { checkPushPermission?.(); } catch {}
      }

      // If schedule tab is opened, render the calendar
      if (id === '#section-schedule') {
        try { renderSchedule?.(); } catch {}
        try { loadScheduleForCurrentGrid?.(); } catch {}
      }

      // If appointments tab is opened, load from Supabase then render (fallback to local)
      if (id === '#section-appointments') {
        try { loadAppointmentsAdmin?.(); } catch { try { renderAppointments?.(); } catch {} }
        try { refreshBookingsPanel?.(); } catch {}
      }

      // If stats tab is opened, render statistics
      if (id === '#section-stats') {
        try { await fetchVisitStats?.(); } catch {}
        try { renderStats?.(); } catch {}
      }

      // If chat tab is opened, init chat
      if (id === '#section-chat') {
        try { initChatSection?.(); } catch {}
      }

      // If to-dos tab is opened, render tasks
      if (id === '#section-todos') {
        try { renderTodos?.(); } catch {}
      }

      // If idea board tab is opened, load ideas
      if (id === '#section-idea-board') {
        try { loadIdeaBoardAdmin?.(); } catch {}
        try { loadIdeaTopicsAdmin?.(); } catch {}
      }

      // If members tab is opened, render members
      if (id === '#section-members') {
        try { renderMembers?.(); } catch {}
      }
      // If membership apps tab is opened, load applications
      if (id === '#section-membership-apps') {
        try { await loadMembershipApps?.(); } catch {}
      }
      // If testimonials tab is opened, render testimonials
      if (id === '#section-testimonials') {
        try { renderTestimonials?.(); } catch {}
      }

      // Close sidebar after navigating on mobile
      if (isMobile()) closeSidebar();
    });
  });

  // Dashboard card navigation (from إدارة الموقع cards)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-go]');
    if (!btn) return;
    const id = btn.getAttribute('data-go');
    if (!id) return;
    if (!hasPermBySectionId(id)) { alert('لا تملك صلاحية الوصول لهذا التبويب'); return; }
    // hide all and show target
    $$('.admin-section').forEach((sec) => (sec.hidden = true));
    const target = $(id);
    if (target) target.hidden = false;

    // If navigating via dashboard card to schedule, render it
    if (id === '#section-schedule') {
      try { renderSchedule?.(); } catch {}
      try { loadScheduleForCurrentGrid?.(); } catch {}
    }
    // If navigating via dashboard card to appointments, load it from Supabase
    if (id === '#section-appointments') {
      try { loadAppointmentsAdmin?.(); } catch { try { renderAppointments?.(); } catch {} }
      try { refreshBookingsPanel?.(); } catch {}
    }
    // If navigating via dashboard card to chat, init it
    if (id === '#section-chat') {
      try { initChatSection?.(); } catch {}
    }
    // If navigating via dashboard card to to-dos, render them
    if (id === '#section-todos') {
      try { renderTodos?.(); } catch {}
    }
    // If navigating via dashboard card to idea board, load it
    if (id === '#section-idea-board') {
      try { loadIdeaBoardAdmin?.(); } catch {}
    }
    // If navigating via dashboard card to members, render them
    if (id === '#section-members') {
      try { renderMembers?.(); } catch {}
    }
    // If navigating to membership apps, load them
    if (id === '#section-membership-apps') {
      try { loadMembershipApps?.(); } catch {}
    }
    // If navigating via dashboard card to testimonials, render them
    if (id === '#section-testimonials') {
      try { renderTestimonials?.(); } catch {}
    }
    // keep sidebar active on the single Home tab
    if (isMobile()) closeSidebar();
    // optional: scroll to top for better context
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ===== Admin Chat Logic =====
  let chatInitialized = false;
  let chatMyId = null;
  let chatActivePeerId = null;
  let chatContacts = [];
  let chatRtChannel = null;
  let chatTypingChannel = null;
  let chatTypingTimeout = null;
  let chatTypingDebounce = null;
  let chatFilter = 'all';
  let chatUnreadMap = new Map(); // user_id -> count
  const chatPageSize = 50;
  let chatHistoryOldest = null; // ISO string
  let chatHistoryLoadedAll = false;

  function chatTimeLabel(ts) {
    try { return new Date(ts).toLocaleString('ar', { hour: '2-digit', minute: '2-digit' }); } catch { return ts; }
  }
  function chatRenderContacts(filter = '') {
    if (!chatContactsEl) return;
    const q = (filter || '').trim();
    const qn = normalizeAr?.(q) || q;
    chatContactsEl.innerHTML = '';
    let list = chatContacts;
    // apply search
    if (q) {
      list = list.filter(c => {
        const n = normalizeAr?.(c.name || '') || (c.name || '');
        const p = normalizeAr?.(c.position || '') || (c.position || '');
        return n.includes(qn) || p.includes(qn);
      });
    }
    // apply filter chips
    if (chatFilter === 'high') {
      list = list.filter(c => c.level === ADMIN_LEVELS.president || c.level === ADMIN_LEVELS.vice);
    } else if (chatFilter === 'admins') {
      list = list.filter(c => c.level >= ADMIN_LEVELS.committee_leader);
    }
    // empty state toggle
    if (chatNoContactsEl) chatNoContactsEl.style.display = list.length ? 'none' : '';
    list.forEach(c => {
      const div = document.createElement('div');
      div.className = 'chat-contact' + (c.user_id === chatActivePeerId ? ' active' : '');
      div.dataset.uid = c.user_id;
      const avatar = c.avatar_url
        ? `<img src="${c.avatar_url}" alt="${c.name}" onerror="this.remove()" />`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
             <circle cx="12" cy="12" r="10" fill="#cbd5e1"/>
             <circle cx="12" cy="10" r="3.2" fill="#64748b"/>
             <path d="M5.5 18.2c1.9-3 5-4.2 6.5-4.2s4.6 1.2 6.5 4.2c-2.1 1.7-4.6 2.8-6.5 2.8s-4.4-1.1-6.5-2.8z" fill="#64748b"/>
           </svg>`;
      const unread = Number(chatUnreadMap.get(c.user_id) || 0);
      const badge = unread > 0 ? `<div class="badge" aria-label="غير مقروء">${unread}</div>` : '';
      div.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="meta">
          <div class="name">${c.name || 'مستخدم'}</div>
          ${c.position ? `<div class="sub">${c.position}</div>` : ''}
        </div>${badge}`;
      chatContactsEl.appendChild(div);
    });
  }
  function chatRenderHeader(peer) {
    if (chatPartnerName) chatPartnerName.textContent = peer?.name || '—';
    if (chatPeerMeta) chatPeerMeta.textContent = peer?.position || '';
    if (chatPeerAvatar) {
      if (peer?.avatar_url) {
        chatPeerAvatar.innerHTML = `<img src="${peer.avatar_url}" alt="${peer.name || ''}" onerror="this.remove()" />`;
      } else {
        chatPeerAvatar.innerHTML = '';
      }
    }
  }
  function chatAppendMessage(row, isMine) {
    if (!chatMessagesEl) return;
    const div = document.createElement('div');
    div.className = 'msg' + (isMine ? ' me' : '');
    const contentRaw = String(row.content || '');
    const html = chatRenderMessageContent(contentRaw);
    div.innerHTML = `${html}<span class="time">${chatTimeLabel(row.created_at)}</span>`;
    chatMessagesEl.appendChild(div);
  }
  function chatClearMessages() { if (chatMessagesEl) chatMessagesEl.innerHTML = ''; }
  function chatScrollToBottom() { try { chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight; } catch {} }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function linkifyText(s) {
    const esc = escapeHtml(s);
    return esc.replace(/(https?:\/\/[^\s<>]+)/g, (m) => `<a href="${m}" target="_blank" rel="noopener">${m}</a>`);
  }
  function chatRenderMessageContent(content) {
    if (content.startsWith('image:')) {
      const url = content.slice(6).trim();
      if (/^https?:\/\//.test(url)) {
        return `<img src="${url}" alt="image" loading="lazy" />`;
      }
    }
    return linkifyText(content);
  }

  function isNearBottom(el, thresh = 24) {
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < thresh;
  }
  function toggleScrollBottomBtn() {
    if (!chatMessagesEl || !chatScrollBottomBtn) return;
    const show = !isNearBottom(chatMessagesEl, 24);
    chatScrollBottomBtn.style.display = show ? '' : 'none';
  }

  async function chatEnsureAuth() {
    if (!sb) throw new Error('no-supabase');
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('not-authenticated');
    chatMyId = user.id;
    return user;
  }
  async function chatLoadContacts() {
    if (!sb) return;
    try {
      // Use Edge Function to bypass RLS on public.admins and get current admins
      let rows = [];
      try { rows = await callFunction('list-admins', { method: 'GET' }); } catch (e) { throw e; }
      const ids = Array.from(new Set((rows || []).map(r => r && r.user_id).filter(Boolean)));
      const filtered = ids.filter(id => id !== chatMyId);
      if (!filtered.length) { chatContacts = []; chatRenderContacts(); return; }
      let profiles = null; let perr = null;
      try {
        const q = await sb
          .from('auth_users_public')
          .select('user_id, display_name, avatar_url, position, admin_level')
          .in('user_id', filtered);
        profiles = q.data; perr = q.error || null;
      } catch (e) { perr = e; }
      if (perr) {
        // Fallback: select without admin_level if column doesn't exist in the view
        try {
          const q2 = await sb
            .from('auth_users_public')
            .select('user_id, display_name, avatar_url, position')
            .in('user_id', filtered);
          profiles = q2.data; perr = q2.error || null;
        } catch (e2) { perr = e2; }
        if (perr) throw perr;
      }
      const map = new Map((profiles || []).map(pr => [pr.user_id, pr]));
      chatContacts = filtered.map(uid => {
        const pr = map.get(uid) || {};
        const rawLv = Number(pr.admin_level);
        const level = Number.isFinite(rawLv) ? rawLv : levelFromPositionAr(pr.position || '');
        return {
          user_id: uid,
          name: pr.display_name || 'مستخدم',
          avatar_url: pr.avatar_url || null,
          position: pr.position || '',
          level
        };
      });
      chatRenderContacts(chatSearchInput?.value || '');
    } catch (err) {
      console.error('chat contacts load failed', err);
      chatContacts = [];
      chatRenderContacts();
    }
  }
  async function chatLoadLatest(peerId) {
    if (!sb || !peerId || !chatMyId) return [];
    const or = `and(sender_id.eq.${chatMyId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${chatMyId})`;
    const { data, error } = await sb
      .from('admin_messages')
      .select('id,sender_id,recipient_id,content,created_at')
      .or(or)
      .order('created_at', { ascending: false })
      .limit(chatPageSize);
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    // determine oldest timestamp loaded
    chatHistoryLoadedAll = rows.length < chatPageSize;
    const sortedAsc = rows.slice().reverse();
    chatHistoryOldest = sortedAsc.length ? sortedAsc[0].created_at : null;
    return sortedAsc;
  }
  async function chatLoadOlder() {
    if (!sb || !chatActivePeerId || !chatMyId || !chatHistoryOldest || chatHistoryLoadedAll) return [];
    const or = `and(sender_id.eq.${chatMyId},recipient_id.eq.${chatActivePeerId}),and(sender_id.eq.${chatActivePeerId},recipient_id.eq.${chatMyId})`;
    const { data, error } = await sb
      .from('admin_messages')
      .select('id,sender_id,recipient_id,content,created_at')
      .or(or)
      .lt('created_at', chatHistoryOldest)
      .order('created_at', { ascending: false })
      .limit(chatPageSize);
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) { chatHistoryLoadedAll = true; return []; }
    const sortedAsc = rows.slice().reverse();
    chatHistoryOldest = sortedAsc[0]?.created_at || chatHistoryOldest;
    if (rows.length < chatPageSize) chatHistoryLoadedAll = true;
    return sortedAsc;
  }
  async function openChatWith(peerId) {
    chatActivePeerId = peerId;
    // active class
    try {
      chatContactsEl?.querySelectorAll('.chat-contact').forEach(el => {
        el.classList.toggle('active', el.dataset.uid === String(peerId));
      });
    } catch {}
    const peer = chatContacts.find(c => c.user_id === peerId) || null;
    chatRenderHeader(peer);
    chatClearMessages();
    if (chatEmptyEl) chatEmptyEl.style.display = 'none';
    try {
      chatHistoryLoadedAll = false; chatHistoryOldest = null;
      const rows = await chatLoadLatest(peerId);
      rows.forEach(r => chatAppendMessage(r, r.sender_id === chatMyId));
      chatScrollToBottom();
      // clear unread for this peer
      chatUnreadMap.delete(peerId);
      chatRenderContacts(chatSearchInput?.value || '');
      // toggle load more
      if (chatLoadMoreBtn) chatLoadMoreBtn.style.display = chatHistoryLoadedAll ? 'none' : '';
    } catch (err) {
      alert('تعذر تحميل المحادثة: ' + (err?.message || 'غير معروف'));
    }
  }
  function chatEnsureRealtime() {
    if (!sb || !chatMyId) return;
    if (chatRtChannel) return;
    chatRtChannel = sb.channel(`admin-messages-${chatMyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_messages', filter: `recipient_id=eq.${chatMyId}` }, (payload) => {
        const row = payload?.new || {};
        // Append only if this conversation is open
        if (row && row.sender_id && row.sender_id === chatActivePeerId) {
          chatAppendMessage(row, false);
          chatScrollToBottom();
        } else {
          // increase unread counter for sender
          const cur = Number(chatUnreadMap.get(row.sender_id) || 0);
          chatUnreadMap.set(row.sender_id, cur + 1);
          chatRenderContacts(chatSearchInput?.value || '');
          try { notifyChatMessage?.(row); } catch {}
        }
      })
      .subscribe();

    // Typing indicator broadcast (Realtime channel)
    if (!chatTypingChannel) {
      chatTypingChannel = sb.channel('admin-chat-typing')
        .on('broadcast', { event: 'typing' }, (payload) => {
          const p = payload?.payload || {};
          if (p && p.recipient_id === chatMyId) {
            // show typing only when open on that sender
            if (p.sender_id && p.sender_id === chatActivePeerId) {
              if (chatTypingEl) {
                chatTypingEl.style.display = '';
                clearTimeout(chatTypingTimeout);
                chatTypingTimeout = setTimeout(() => { chatTypingEl.style.display = 'none'; }, 2500);
              }
            } else {
              // could mark a subtle hint on contact (skipped)
            }
          }
        })
        .subscribe();
    }
  }
  async function initChatSection() {
    if (!sb) return;
    try {
      await chatEnsureAuth();
      await chatLoadContacts();
      if (!chatInitialized) {
        // Bind contacts click
        chatContactsEl?.addEventListener('click', (e) => {
          const el = e.target.closest('.chat-contact');
          if (!el) return;
          const uid = el.dataset.uid;
          if (uid) openChatWith(uid);
        });
        // Search filter
        chatSearchInput?.addEventListener('input', () => {
          chatRenderContacts(chatSearchInput.value);
        });
        // Filter chips
        chatFiltersEl?.addEventListener('click', (e) => {
          const btn = e.target.closest('.chip');
          if (!btn) return;
          chatFiltersEl.querySelectorAll('.chip').forEach(ch => ch.classList.remove('active'));
          btn.classList.add('active');
          chatFilter = btn.getAttribute('data-filter') || 'all';
          chatRenderContacts(chatSearchInput?.value || '');
        });
        // Load older history
        chatLoadMoreBtn?.addEventListener('click', async () => {
          try {
            if (!chatActivePeerId) return;
            const atTop = chatMessagesEl ? chatMessagesEl.scrollTop : 0;
            const prevHeight = chatMessagesEl ? chatMessagesEl.scrollHeight : 0;
            const rows = await chatLoadOlder();
            if (rows.length) {
              const frag = document.createDocumentFragment();
              rows.forEach(r => {
                const div = document.createElement('div');
                div.className = 'msg' + (r.sender_id === chatMyId ? ' me' : '');
                div.innerHTML = `
                  <div class="msg__text">${chatRenderMessageContent(String(r.content || ''))}</div>
                  <span class="time">${chatTimeLabel(r.created_at)}</span>`;
                frag.appendChild(div);
              });
              if (chatMessagesEl) {
                chatMessagesEl.insertBefore(frag, chatMessagesEl.firstChild);
                // keep scroll position stable
                const newHeight = chatMessagesEl.scrollHeight;
                chatMessagesEl.scrollTop = (newHeight - prevHeight) + atTop;
              }
            }
            if (chatLoadMoreBtn) chatLoadMoreBtn.style.display = chatHistoryLoadedAll ? 'none' : '';
          } catch (err) {
            alert('تعذر تحميل رسائل أقدم: ' + (err?.message || 'غير معروف'));
          }
        });
        // Scroll behavior
        chatMessagesEl?.addEventListener('scroll', toggleScrollBottomBtn);
        chatScrollBottomBtn?.addEventListener('click', () => chatScrollToBottom());
        // Typing: broadcast while typing (debounced)
        chatInputEl?.addEventListener('input', () => {
          if (!chatActivePeerId || !chatTypingChannel) return;
          clearTimeout(chatTypingDebounce);
          chatTypingDebounce = setTimeout(() => {
            try {
              chatTypingChannel.send({ type: 'broadcast', event: 'typing', payload: { sender_id: chatMyId, recipient_id: chatActivePeerId } });
            } catch {}
          }, 200);
        });
        // Send
        chatComposerForm?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const txt = (chatInputEl?.value || '').trim();
          if (!txt) return;
          if (!chatActivePeerId) { alert('اختر جهة اتصال لبدء المحادثة'); return; }
          try {
            const { data: { session } } = await sb.auth.getSession();
            if (!session) { alert('يلزم تسجيل الدخول'); return; }
            const payload = { sender_id: chatMyId, recipient_id: chatActivePeerId, content: txt };
            const { data: row, error } = await sb.from('admin_messages').insert(payload).select('*').single();
            if (error) throw error;
            chatAppendMessage(row || payload, true);
            chatScrollToBottom();
            if (chatInputEl) chatInputEl.value = '';
          } catch (err) {
            alert('تعذر إرسال الرسالة: ' + (err?.message || 'غير معروف'));
          }
        });
        chatInitialized = true;
      }
      chatEnsureRealtime();
      // Open first contact by default
      if (chatContacts.length && !chatActivePeerId) openChatWith(chatContacts[0].user_id);
      if (!chatContacts.length && chatEmptyEl) chatEmptyEl.style.display = '';
    } catch (err) {
      console.warn('chat init failed', err);
    }
  }


  // Renderers

  function el(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }

  async function fetchVisitStats() {
    if (!sb) { visitStats = { total: 0, new: 0, returning: 0 }; return; }
    try {
      const [tot, ret, neu] = await Promise.all([
        sb.from('site_visits').select('*', { count: 'exact', head: true }),
        sb.from('site_visits').select('*', { count: 'exact', head: true }).eq('is_returning', true),
        sb.from('site_visits').select('*', { count: 'exact', head: true }).eq('is_returning', false),
      ]);
      visitStats = {
        total: Number(tot?.count || 0),
        returning: Number(ret?.count || 0),
        new: Number(neu?.count || 0),
      };
    } catch (e) {
      console.warn('visit stats fetch failed', e);
      visitStats = { total: 0, new: 0, returning: 0 };
    }
  }

  function renderStats() {
    if (!statsGrid) return;
    const num = (v) => {
      const n = Number(v || 0);
      try { return n.toLocaleString('ar'); } catch { return String(n); }
    };
    const vs = visitStats || { total: 0, new: 0, returning: 0 };
    // Build committee cards from members' committee field
    const committeeItems = (() => {
      try {
        const map = new Map();
        (members || []).forEach((m) => {
          const raw = (m?.committee || '').trim();
          if (!raw) return;
          const key = raw.replace(/\s+/g, ' ');
          map.set(key, (map.get(key) || 0) + 1);
        });
        // sort by Arabic label
        const labels = Array.from(map.entries()).sort((a, b) => {
          try { return a[0].localeCompare(b[0], 'ar'); } catch { return String(a[0]).localeCompare(String(b[0])); }
        });
        return labels.map(([label, count]) => ({
          title: `أعضاء ${label}`,
          value: num(count),
          icon: 'fa-solid fa-users',
        }));
      } catch {
        return [];
      }
    })();
    const items = [
      { title: 'أعضاء النادي', value: num((members || []).length), icon: 'fa-solid fa-users-rectangle' },
      { title: 'زيارات الموقع', value: num(vs.total), icon: 'fa-solid fa-eye' },
      { title: 'زائرون جدد', value: num(vs.new), icon: 'fa-solid fa-user-plus' },
      { title: 'زائرون عائدون', value: num(vs.returning), icon: 'fa-solid fa-user-clock' },
      ...committeeItems,
    ];
    statsGrid.innerHTML = '';
    items.forEach((it) => {
      const node = el(`
        <div class="card">
          <div class="card__body">
            <div class="card__title"><i class="${it.icon}"></i> ${it.title}</div>
            <div class="stat-number">${it.value}</div>
          </div>
        </div>
      `);
      statsGrid.appendChild(node);
    });
  }

  // Reordering helpers
  async function normalizeAndPersistOrder(list, storageKey, tableName) {
    // Normalize order to 1..N
    list.forEach((item, i) => { item.order = i + 1; });
    // Save locally
    save(storageKey, list);
    // Persist to Supabase if available and ids exist
    if (sb && tableName) {
      try {
        const updates = list
          .filter(it => it && typeof it.id !== 'undefined' && it.id !== null)
          .map(it => sb.from(tableName).update({ order: it.order }).eq('id', it.id));
        if (updates.length) await Promise.all(updates);
      } catch (e) {
        console.warn('Failed to persist order to Supabase for', tableName, e);
      }
    }
  }

  function setupListDnD(containerEl, arrayRef, storageKey, tableName, renderFn) {
    if (!containerEl) return;
    if (containerEl._dndSetup) return; // avoid double-binding
    containerEl._dndSetup = true;
    let dragIdx = null;

    containerEl.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.draggable-card');
      if (!card) return;
      // allow dragging only from handle if exists
      const handle = e.target.closest('.drag-handle');
      if (!handle && e.target.closest('.card__actions')) {
        // If started from actions but not handle, block to avoid unintended drags when clicking buttons
        e.preventDefault();
        return;
      }
      dragIdx = Number(card.dataset.idx);
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragIdx.toString()); } catch {}
    });

    containerEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      const overCard = e.target.closest('.draggable-card');
      if (!overCard) return;
      overCard.classList.add('drag-over');
      e.dataTransfer.dropEffect = 'move';
    });

    containerEl.addEventListener('dragleave', (e) => {
      const card = e.target.closest('.draggable-card');
      if (card) card.classList.remove('drag-over');
    });

    containerEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      const targetCard = e.target.closest('.draggable-card');
      containerEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      const from = dragIdx;
      const to = targetCard ? Number(targetCard.dataset.idx) : null;
      dragIdx = null;
      if (!Number.isInteger(from) || !Number.isInteger(to)) return;
      if (from === to) return;
      const [moved] = arrayRef.splice(from, 1);
      const insertAt = to >= arrayRef.length ? arrayRef.length : (to < 0 ? 0 : to);
      arrayRef.splice(insertAt, 0, moved);
      await normalizeAndPersistOrder(arrayRef, storageKey, tableName);
      renderFn();
    });

    containerEl.addEventListener('dragend', () => {
      containerEl.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
      containerEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      dragIdx = null;
    });
  }

  function renderWorks() {
    if (!worksList) return;
    worksList.innerHTML = '';
    const sorted = [...works].sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000));
    sorted.forEach((item, sortedIndex) => {
      const idx = works.indexOf(item);
      const displayOrder = (item.order ? Number(item.order) : (sortedIndex + 1));
      const node = el(`
        <div class="card draggable-card" data-idx="${idx}" draggable="true">
          <span class="order-chip">#${displayOrder}</span>
          <div class="card__media">
            <img src="${(item.image || item.image_url) || ''}" alt="${item.title || ''}" />
            ${(item.category) ? `<span class=\"card__badge\">${item.category}</span>` : ''}
          </div>
          <div class="card__body">
            <div class="card__title">${item.title || ''}</div>
            ${(item.link || item.link_url) ? `<a class=\"btn btn-outline\" target=\"_blank\" href=\"${item.link || item.link_url}\"><i class=\"fa-solid fa-link\"></i> رابط</a>` : ''}
            <div class="card__actions">
              <button class="btn btn-outline" data-act="up" data-idx="${idx}" title="تحريك لأعلى"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="btn btn-outline" data-act="down" data-idx="${idx}" title="تحريك لأسفل"><i class="fa-solid fa-arrow-down"></i></button>
              <button class="btn btn-outline drag-handle" title="سحب لإعادة الترتيب"><i class="fa-solid fa-grip-vertical"></i></button>
              <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>`);
      worksList.appendChild(node);
    });
    setupListDnD(worksList, works, KEYS.works, 'works', renderWorks);
  }

  function renderForms() {
    if (!formsList) return;
    formsList.innerHTML = '';
    const list = Array.isArray(forms) ? forms.slice().sort((a, b) => {
      try { return new Date(b.created_at || 0) - new Date(a.created_at || 0); } catch { return 0; }
    }) : [];
    
    if (list.length === 0) {
      formsList.innerHTML = `
        <div style="text-align:center;padding:40px;color:#64748b">
          <i class="fa-regular fa-square-check" style="font-size:48px;margin-bottom:16px;opacity:0.5"></i>
          <h3 style="margin:0 0 8px;font-weight:500">لا توجد استبيانات بعد</h3>
          <p style="margin:0;font-size:0.875rem">ابدأ بإنشاء أول استبيان لك</p>
        </div>`;
      return;
    }
    
    list.forEach((item) => {
      const id = item.id || '';
      const title = escapeHtml(item.title || 'استبيان');
      const desc = escapeHtml(item.description || '');
      const slug = String(item.slug || id);
      const isPub = !!item.is_published;
      const isPublic = !!item.is_public;
      const open = !!item.accepting_responses;
      const responsesCount = item.responses_count || 0;
      const createdDate = item.created_at ? formatArDate(item.created_at) : '';
      
      const node = el(`
        <div class="card" data-id="${id}">
          <div class="card__body">
            <div class="card__title"><i class="fa-regular fa-square-check"></i> ${title}</div>
            ${desc ? `<p class=\"card__text\" style=\"color:#64748b;line-height:1.6;margin:8px 0\">${desc}</p>` : ''}
            
            <div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0;font-size:0.75rem;color:#64748b">
              <span><i class="fa-regular fa-calendar"></i> نُشر في: ${createdDate}</span>
              <span><i class="fa-solid fa-chart-column"></i> ${responsesCount} رد</span>
            </div>
            
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin:12px 0">
              <span class="status-pill ${isPub ? 'status-ok' : ''}">${isPub ? 'منشور' : 'مسودة'}</span>
              <span class="status-pill ${isPublic ? 'status-ok' : ''}">${isPublic ? 'عام' : 'خاص'}</span>
              <span class="status-pill ${open ? 'status-ok' : ''}">${open ? 'يستقبل الردود' : 'مغلق'}</span>
            </div>
            
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
              <!-- الصف الأول: رابط التعبئة + النتائج -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
                <button class="btn btn-primary" data-action="fill" data-slug="${slug}">
                  <i class="fa-regular fa-pen-to-square"></i> رابط التعبئة
                </button>
                <button class="btn btn-primary" data-action="results" data-slug="${slug}">
                  <i class="fa-solid fa-chart-column"></i> النتائج
                </button>
              </div>
              
              <!-- الصف الثاني: نسخ الروابط (معاً) -->
              <div style="display:flex;gap:6px">
                <button class="btn btn-outline" data-action="copy-all" data-slug="${slug}" style="flex:1">
                  <i class="fa-regular fa-copy"></i> نسخ الروابط
                </button>
              </div>
              
              <!-- الصف الثالث: نسخ رابط التعبئة + نسخ رابط النتائج -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
                <button class="btn btn-outline" data-action="copy-fill" data-slug="${slug}">
                  <i class="fa-regular fa-copy"></i> نسخ رابط التعبئة
                </button>
                <button class="btn btn-outline" data-action="copy-results" data-slug="${slug}">
                  <i class="fa-regular fa-copy"></i> نسخ رابط النتائج
                </button>
              </div>
              
              <!-- الصف الرابع: التحكم في الحالة -->
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
                <button class="btn btn-outline" data-action="toggle-open" data-id="${id}">
                  <i class="fa-solid fa-toggle-${open ? 'on' : 'off'}"></i> ${open ? 'إيقاف الردود' : 'تفعيل الردود'}
                </button>
                <button class="btn btn-outline" data-action="toggle-publish" data-id="${id}">
                  <i class="fa-regular fa-newspaper"></i> ${isPub ? 'إلغاء النشر' : 'نشر الاستبيان'}
                </button>
                <button class="btn btn-outline" data-action="toggle-public" data-id="${id}">
                  <i class="fa-solid fa-eye${isPublic ? '' : '-slash'}"></i> ${isPublic ? 'جعله خاص' : 'جعله عام'}
                </button>
              </div>
              
              <!-- الصف الخامس: تعديل ونسخ -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
                <button class="btn btn-outline" data-action="edit" data-id="${id}">
                  <i class="fa-solid fa-pen"></i> تعديل
                </button>
                <button class="btn btn-outline" data-action="duplicate" data-id="${id}">
                  <i class="fa-regular fa-copy"></i> نسخ
                </button>
              </div>
              
              <!-- الصف السادس: حذف -->
              <div style="display:flex">
                <button class="btn btn-outline" data-action="delete" data-id="${id}" style="width:100%">
                  <i class="fa-regular fa-trash-can"></i> حذف
                </button>
              </div>
            </div>
          </div>
        </div>`);
      formsList.appendChild(node);
    });
  }

  // Forms actions
  $('#addFormBtn')?.addEventListener('click', () => {
    try {
      const origin = location.origin || (location.protocol + '//' + location.host);
      const url = `${origin}/forms/builder.html`;
      window.open(url, '_blank');
    } catch {}
  });

  formsList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    if (!action) return;
    const id = btn.dataset.id || '';
    const slug = btn.dataset.slug || id;
    const origin = location.origin || (location.protocol + '//' + location.host);
    const fillUrl = `${origin}/forms/fill.html?form=${encodeURIComponent(slug)}`;
    const resUrl = `${origin}/forms/results.html?form=${encodeURIComponent(slug)}`;
    
    // Helper function to show copy success
    const showCopySuccess = (button) => {
      const originalText = button.innerHTML;
      button.innerHTML = '<i class="fa-solid fa-check"></i> تم النسخ';
      button.style.background = '#10b981';
      button.style.borderColor = '#10b981';
      button.style.color = 'white';
      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = '';
        button.style.borderColor = '';
        button.style.color = '';
      }, 2000);
    };
    
    // Helper function to copy text
    const copyText = async (text, button) => {
      try { 
        await navigator.clipboard.writeText(text);
        showCopySuccess(button);
      } catch {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          alert('تم نسخ الرابط');
        } catch {
          alert('تعذر نسخ الرابط');
        }
      }
    };
    
    if (action === 'fill') { window.open(fillUrl, '_blank'); return; }
    if (action === 'results') { window.open(resUrl, '_blank'); return; }
    
    // نسخ رابط التعبئة فقط
    if (action === 'copy-fill') {
      await copyText(fillUrl, btn);
      return;
    }
    
    // نسخ رابط النتائج فقط
    if (action === 'copy-results') {
      await copyText(resUrl, btn);
      return;
    }
    
    // نسخ كلا الرابطين معاً
    if (action === 'copy-all') {
      const text = `رابط التعبئة:\n${fillUrl}\n\nرابط النتائج:\n${resUrl}`;
      await copyText(text, btn);
      return;
    }
    if (!sb) { alert('Supabase غير مفعّل.'); return; }
    const idx = Array.isArray(forms) ? forms.findIndex((x) => String(x.id || '') === String(id)) : -1;
    if (idx < 0) return;
    const row = forms[idx];
    if (action === 'toggle-open') {
      const next = !row.accepting_responses;
      const { error } = await sb.from('forms').update({ accepting_responses: next }).eq('id', id);
      if (error) { 
        alert(`تعذر ${next ? 'تفعيل' : 'إيقاف'} استقبال الردود: ${error.message}`); 
        return; 
      }
      row.accepting_responses = next; 
      renderForms(); 
      return;
    }
    if (action === 'toggle-publish') {
      const next = !row.is_published;
      const { error } = await sb.from('forms').update({ is_published: next }).eq('id', id);
      if (error) { 
        alert(`تعذر ${next ? 'نشر' : 'إلغاء نشر'} الاستبيان: ${error.message}`); 
        return; 
      }
      row.is_published = next; 
      renderForms(); 
      return;
    }
    if (action === 'toggle-public') {
      const next = !row.is_public;
      const { error } = await sb.from('forms').update({ is_public: next }).eq('id', id);
      if (error) { 
        alert(`تعذر ${next ? 'جعل الاستبيان عاماً' : 'جعل الاستبيان خاصاً'}: ${error.message}`); 
        return; 
      }
      row.is_public = next; 
      renderForms(); 
      return;
    }
    if (action === 'edit') {
      // فتح صفحة التعديل مع معرف الاستبيان
      const editUrl = `${origin}/forms/builder.html?edit=${encodeURIComponent(id)}`;
      window.open(editUrl, '_blank');
      return;
    }
    if (action === 'duplicate') {
      // نسخ الاستبيان
      if(!confirm('هل تريد نسخ هذا الاستبيان؟\n\nسيتم إنشاء نسخة جديدة بنفس الأسئلة والإعدادات.')){
        return;
      }
      
      try {
        const session = await sb.auth.getSession();
        if(!session?.data?.session){
          alert('يجب تسجيل الدخول أولاً');
          return;
        }
        
        // تحميل بيانات الاستبيان الأصلي
        const { data: originalForm, error: formError } = await sb
          .from('forms')
          .select('*')
          .eq('id', id)
          .single();
        
        if(formError || !originalForm){
          alert('تعذر تحميل الاستبيان');
          return;
        }
        
        // تحميل الأسئلة
        const { data: originalQuestions, error: qError } = await sb
          .from('form_questions')
          .select('*')
          .eq('form_id', id)
          .order('order_index', { ascending: true });
        
        if(qError){
          alert('تعذر تحميل الأسئلة');
          return;
        }
        
        // إنشاء نسخة جديدة
        const newSlug = originalForm.slug + '-copy-' + Math.random().toString(36).slice(2,6);
        const newFormData = {
          owner_id: session.data.session.user.id,
          title: originalForm.title + ' (نسخة)',
          description: originalForm.description,
          slug: newSlug,
          is_public: originalForm.is_public,
          is_published: false,
          accepting_responses: false
        };
        
        const { data: newForm, error: insertError } = await sb
          .from('forms')
          .insert(newFormData)
          .select('id')
          .single();
        
        if(insertError || !newForm){
          alert('تعذر إنشاء النسخة');
          return;
        }
        
        // نسخ الأسئلة
        if(originalQuestions && originalQuestions.length > 0){
          const newQuestions = originalQuestions.map(q => ({
            form_id: newForm.id,
            order_index: q.order_index,
            type: q.type,
            label: q.label,
            required: q.required,
            options: q.options
          }));
          
          const { error: qInsertError } = await sb
            .from('form_questions')
            .insert(newQuestions);
          
          if(qInsertError){
            alert('تم إنشاء الاستبيان لكن فشل نسخ الأسئلة');
            return;
          }
        }
        
        // تحديث القائمة
        await loadForms();
        alert('✓ تم نسخ الاستبيان بنجاح!\n\nيمكنك الآن تعديل النسخة الجديدة بأمان.');
        
      } catch(e){
        console.error('خطأ في نسخ الاستبيان:', e);
        alert('حدث خطأ أثناء النسخ: ' + (e.message || 'خطأ غير معروف'));
      }
      return;
    }
    if (action === 'delete') {
      const formTitle = row.title || 'الاستبيان';
      if (!confirm(`هل أنت متأكد من حذف "${formTitle}"؟\n\nسيتم حذف الاستبيان وجميع الردود المرتبطة به نهائياً.`)) return;
      const { error } = await sb.from('forms').delete().eq('id', id);
      if (error) { 
        alert(`تعذر حذف الاستبيان: ${error.message}`); 
        return; 
      }
      forms.splice(idx, 1); 
      renderForms(); 
      return;
    }
  });

  // ===== Admin Profile (My Profile) =====
  const adminProfileForm = document.getElementById('adminProfileForm');
  const adminDisplayNameInput = document.getElementById('admin_display_name');
  const adminPositionInput = document.getElementById('admin_position');
  const adminPhoneInput = document.getElementById('admin_phone');
  const adminAvatarFileInput = document.getElementById('admin_avatar_file');
  const adminProfileMsg = document.getElementById('adminProfileMsg');
  const adminAvatarPreview = document.getElementById('adminAvatarPreview');
  const adminProfileUserName = document.getElementById('adminProfileUserName');
  const adminProfileEmail = document.getElementById('adminProfileEmail');

  function updateAdminProfilePreview() {
    if (!sb) return;
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const md = user.user_metadata || {};
      const name = md.display_name || user.email || 'مستخدم';
      const avatarUrl = md.avatar_url && String(md.avatar_url).trim() ? md.avatar_url : null;
      if (adminProfileUserName) adminProfileUserName.textContent = name;
      if (adminProfileEmail) adminProfileEmail.textContent = user.email || '';
      if (adminAvatarPreview) {
        if (avatarUrl) {
          adminAvatarPreview.innerHTML = `<img src="${avatarUrl}" alt="${name}" onerror="this.remove()" />`;
        } else {
          adminAvatarPreview.innerHTML = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="#cbd5e1"/>
              <circle cx="12" cy="10" r="3.2" fill="#64748b"/>
              <path d="M5.5 18.2c1.9-3 5-4.2 6.5-4.2s4.6 1.2 6.5 4.2c-2.1 1.7-4.6 2.8-6.5 2.8s-4.4-1.1-6.5-2.8z" fill="#64748b"/>
            </svg>`;
        }
      }
    }).catch(() => {});
  }

  function adminLoadProfileIntoForm() {
    if (!sb) return;
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const md = user.user_metadata || {};
      if (adminDisplayNameInput) adminDisplayNameInput.value = md.display_name || md.name || '';
      if (adminPositionInput) adminPositionInput.value = md.position || '';
      if (adminPhoneInput) adminPhoneInput.value = md.phone || '';
      if (adminProfileEmail) adminProfileEmail.textContent = user.email || '';
      // Fill current email in the change-email panel
      const adminCurrentEmailDisplay = document.getElementById('admin_current_email_display');
      if (adminCurrentEmailDisplay) adminCurrentEmailDisplay.value = user.email || '';
      updateAdminProfilePreview();
    }).catch(() => {});
  }

  // Local preview for avatar file selection
  adminAvatarFileInput?.addEventListener('change', function () {
    const file = this.files && this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      if (adminAvatarPreview) {
        adminAvatarPreview.innerHTML = `<img src="${e.target.result}" alt="معاينة الصورة" />`;
      }
    };
    reader.readAsDataURL(file);
  });

  async function uploadAdminAvatarFile(user) {
    const file = adminAvatarFileInput?.files && adminAvatarFileInput.files[0];
    if (!file) return null;
    if (!sb || !user) return null;
    const bucket = 'avatars';
    const ext = (file.name.split('.').pop() || getExtFromType(file.type, 'jpg')).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `${user.id}/avatar-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
    const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر الحصول على رابط الصورة');
    return publicUrl;
  }

  adminProfileForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!sb) return;
    if (adminProfileMsg) adminProfileMsg.textContent = '';
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { alert('يلزم تسجيل الدخول'); return; }
      const payload = {
        display_name: (adminDisplayNameInput?.value || '').trim() || null,
        // position is locked by admin; don't allow updating here
        phone: (adminPhoneInput?.value || '').trim() || null,
      };
      payload.name = payload.display_name; // Back-compat
      let avatarUrl = user.user_metadata?.avatar_url || null;
      try {
        const newUrl = await uploadAdminAvatarFile(user);
        if (newUrl) avatarUrl = newUrl;
      } catch (upErr) {
        if (adminProfileMsg) adminProfileMsg.textContent = 'فشل رفع الصورة: ' + (upErr?.message || 'غير معروف');
        return;
      }
      payload.avatar_url = avatarUrl;
      const btn = adminProfileForm.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.style.opacity = .7; }
      const { error } = await sb.auth.updateUser({ data: payload });
      if (error) throw error;
      // Refresh and update UI
      try {
        const { data: { user: fresh } } = await sb.auth.getUser();
        if (fresh) renderUserBadge(fresh);
      } catch {}
      updateAdminProfilePreview();
      if (adminAvatarFileInput) adminAvatarFileInput.value = '';
      if (adminProfileMsg) adminProfileMsg.textContent = 'تم حفظ الملف بنجاح';
    } catch (err) {
      if (adminProfileMsg) adminProfileMsg.textContent = 'تعذر الحفظ: ' + (err?.message || 'غير معروف');
    } finally {
      const btn = adminProfileForm?.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = false; btn.style.opacity = 1; }
    }
  });

  // Image cropping helpers (Cropper.js)
  const imageCropDialog = document.getElementById('imageCropDialog');
  const cropperImage = document.getElementById('cropperImage');
  const cropConfirmBtn = document.getElementById('cropConfirmBtn');
  const cropCancelBtn = document.getElementById('cropCancelBtn');
  const cropAspectSelect = document.getElementById('cropAspectSelect');
  const cropZoomIn = document.getElementById('cropZoomIn');
  const cropZoomOut = document.getElementById('cropZoomOut');
  const cropRotateL = document.getElementById('cropRotateL');
  const cropRotateR = document.getElementById('cropRotateR');
  const cropFlipH = document.getElementById('cropFlipH');
  const cropFlipV = document.getElementById('cropFlipV');
  const cropReset = document.getElementById('cropReset');
  const cropBusy = document.getElementById('cropBusy');
  let activeCropper = null;
  let flipState = { x: 1, y: 1 };

  function destroyActiveCropper() {
    try { activeCropper?.destroy?.(); } catch {}
    activeCropper = null;
  }

  function dataUrlFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function getExtFromType(type, fallbackExt = 'jpg') {
    if (!type) return fallbackExt;
    if (type.includes('png')) return 'png';
    if (type.includes('webp')) return 'webp';
    if (type.includes('gif')) return 'gif';
    if (type.includes('svg')) return 'svg';
    return 'jpg';
  }

  function openImageCropper(file, opts = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!imageCropDialog || !cropperImage || typeof Cropper === 'undefined') {
          // If Cropper not loaded for any reason, fallback: resolve original file
          resolve(file);
          return;
        }
        // Load image preview
        cropperImage.src = await dataUrlFromFile(file);
        // Open dialog
        if (!imageCropDialog.open) imageCropDialog.showModal();
        // Init Cropper
        destroyActiveCropper();
        flipState = { x: 1, y: 1 };
        const initialAspect = (opts.aspectRatio && !Number.isNaN(opts.aspectRatio)) ? opts.aspectRatio : NaN;
        const lockAspect = !!opts.lockAspect;
        if (cropAspectSelect) {
          // preset dropdown based on requested aspect
          const map = { 1: '1', [4/3]: '4/3', [16/9]: '16/9' };
          const val = map[initialAspect] || 'auto';
          cropAspectSelect.value = val;
          // lock aspect selection if requested
          cropAspectSelect.disabled = lockAspect;
        }
        activeCropper = new Cropper(cropperImage, {
          viewMode: 1,
          aspectRatio: initialAspect,
          dragMode: 'move',
          autoCropArea: 1,
          responsive: true,
          background: false,
        });

        const onCancel = () => {
          cleanup();
          reject(new Error('crop-cancelled'));
        };
        const onConfirm = async (e) => {
          e?.preventDefault?.();
          try {
            cropBusy && (cropBusy.style.display = 'inline');
            const cropData = activeCropper.getData(true);
            const naturalW = Math.round(cropData.width);
            const naturalH = Math.round(cropData.height);
            const maxW = Number.isFinite(opts.maxWidth) ? opts.maxWidth : naturalW;
            const maxH = Number.isFinite(opts.maxHeight) ? opts.maxHeight : naturalH;
            // Scale to fit within maxW x maxH
            const scale = Math.min(1, maxW / naturalW, maxH / naturalH);
            const targetW = Math.max(1, Math.round(naturalW * scale));
            const targetH = Math.max(1, Math.round(naturalH * scale));
            const canvas = activeCropper.getCroppedCanvas({
              width: targetW,
              height: targetH,
              imageSmoothingEnabled: true,
              imageSmoothingQuality: 'high',
            });
            const type = opts.mimeType || (file.type && /^image\//.test(file.type) ? file.type : 'image/jpeg');
            const quality = typeof opts.quality === 'number' ? opts.quality : 0.92;
            canvas.toBlob((blob) => {
              if (!blob) {
                onCancel();
                return;
              }
              // Create a File-like object for upload
              const ext = getExtFromType(type);
              const croppedFile = new File([blob], `crop-${Date.now()}.${ext}`, { type });
              cleanup();
              resolve(croppedFile);
            }, type, quality);
          } catch (err) {
            cleanup();
            reject(err);
          }
        };
        function cleanup() {
          try { imageCropDialog.close(); } catch {}
          destroyActiveCropper();
          cropConfirmBtn?.removeEventListener('click', onConfirm);
          cropCancelBtn?.removeEventListener('click', onCancel);
          cropAspectSelect?.removeEventListener('change', onAspectChange);
          cropZoomIn?.removeEventListener('click', onZoomIn);
          cropZoomOut?.removeEventListener('click', onZoomOut);
          cropRotateL?.removeEventListener('click', onRotateL);
          cropRotateR?.removeEventListener('click', onRotateR);
          cropFlipH?.removeEventListener('click', onFlipH);
          cropFlipV?.removeEventListener('click', onFlipV);
          cropReset?.removeEventListener('click', onReset);
          if (cropBusy) cropBusy.style.display = 'none';
        }
        const onAspectChange = () => {
          if (!activeCropper) return;
          const val = cropAspectSelect.value;
          let ar = NaN;
          if (val === '1') ar = 1;
          else if (val === '4/3') ar = 4/3;
          else if (val === '16/9') ar = 16/9;
          activeCropper.setAspectRatio(ar);
        };
        const onZoomIn = () => activeCropper && activeCropper.zoom(0.1);
        const onZoomOut = () => activeCropper && activeCropper.zoom(-0.1);
        const onRotateL = () => activeCropper && activeCropper.rotate(-90);
        const onRotateR = () => activeCropper && activeCropper.rotate(90);
        const onFlipH = () => { if (!activeCropper) return; flipState.x *= -1; activeCropper.scaleX(flipState.x); };
        const onFlipV = () => { if (!activeCropper) return; flipState.y *= -1; activeCropper.scaleY(flipState.y); };
        const onReset = () => { if (!activeCropper) return; activeCropper.reset(); flipState = { x: 1, y: 1 }; };
        if (!lockAspect) cropAspectSelect?.addEventListener('change', onAspectChange);
        cropZoomIn?.addEventListener('click', onZoomIn);
        cropZoomOut?.addEventListener('click', onZoomOut);
        cropRotateL?.addEventListener('click', onRotateL);
        cropRotateR?.addEventListener('click', onRotateR);
        cropFlipH?.addEventListener('click', onFlipH);
        cropFlipV?.addEventListener('click', onFlipV);
        cropReset?.addEventListener('click', onReset);
        cropConfirmBtn?.addEventListener('click', onConfirm);
        cropCancelBtn?.addEventListener('click', onCancel);
        imageCropDialog.addEventListener('close', () => {
          // Ensure cropper destroyed
          destroyActiveCropper();
        }, { once: true });
      } catch (err) {
        reject(err);
      }
    });
  }

  function renderSponsors() {
    if (!sponsorsList) return;
    sponsorsList.innerHTML = '';
    const sorted = [...sponsors].sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000));
    sorted.forEach((item, sortedIndex) => {
      const idx = sponsors.indexOf(item);
      const displayOrder = (item.order ? Number(item.order) : (sortedIndex + 1));
      const node = el(`
        <div class="card draggable-card" data-idx="${idx}" draggable="true">
          <span class="order-chip">#${displayOrder}</span>
          <div class="card__media">
            <img src="${(item.logo || item.logo_url) || ''}" alt="${item.name || ''}" />
            ${item.badge ? `<span class="card__badge">${item.badge}</span>` : ''}
          </div>
          <div class="card__body">
            <div class="card__title">${item.name || ''}</div>
            ${item.description ? `<p class="card__text">${item.description}</p>` : ''}
            ${(item.link || item.link_url) ? `<a class=\"btn btn-outline\" target=\"_blank\" href=\"${item.link || item.link_url}\"><i class=\"fa-solid fa-arrow-up-right-from-square\"></i> موقع</a>` : ''}
            <div class="card__actions">
              <button class="btn btn-outline" data-act="up" data-idx="${idx}" title="تحريك لأعلى"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="btn btn-outline" data-act="down" data-idx="${idx}" title="تحريك لأسفل"><i class="fa-solid fa-arrow-down"></i></button>
              <button class="btn btn-outline drag-handle" title="سحب لإعادة الترتيب"><i class="fa-solid fa-grip-vertical"></i></button>
              <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>`);
      sponsorsList.appendChild(node);
    });
    setupListDnD(sponsorsList, sponsors, KEYS.sponsors, 'sponsors', renderSponsors);
  }

  function renderBoard() {
    if (!boardList) return;
    boardList.innerHTML = '';
    const sorted = [...board].sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000));
    sorted.forEach((item, sortedIndex) => {
      const idx = board.indexOf(item);
      const displayOrder = (item.order ? Number(item.order) : (sortedIndex + 1));
      const node = el(`
        <div class="card draggable-card" data-idx="${idx}" draggable="true">
          <span class="order-chip">#${displayOrder}</span>
          <div class="card__media">
            <img src="${(item.image || item.image_url) || ''}" alt="${item.name || ''}" />
            ${(item.position) ? `<span class="card__badge">${item.position}</span>` : ''}
          </div>
          <div class="card__body">
            <div class="card__title">${item.name || ''}</div>
            <div class="card__actions">
              ${(item.twitter || item.twitter_url) ? `<a class="btn btn-outline" target="_blank" href="${item.twitter || item.twitter_url}"><i class="fab fa-twitter"></i> تويتر</a>` : ''}
              ${(item.linkedin || item.linkedin_url) ? `<a class="btn btn-outline" target="_blank" href="${item.linkedin || item.linkedin_url}"><i class="fab fa-linkedin"></i> لينكدإن</a>` : ''}
              ${item.email ? `<a class="btn btn-outline" href="mailto:${item.email}"><i class="fa-solid fa-envelope"></i> بريد</a>` : ''}
            </div>
            <div class="card__actions">
              <button class="btn btn-outline" data-act="up" data-idx="${idx}" title="تحريك لأعلى"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="btn btn-outline" data-act="down" data-idx="${idx}" title="تحريك لأسفل"><i class="fa-solid fa-arrow-down"></i></button>
              <button class="btn btn-outline drag-handle" title="سحب لإعادة الترتيب"><i class="fa-solid fa-grip-vertical"></i></button>
              <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>`);
      boardList.appendChild(node);
    });
    setupListDnD(boardList, board, KEYS.board, 'board_members', renderBoard);
  }

  // Get committee icon
  function getCommitteeIcon(committeeName) {
    const name = (committeeName || '').toString().trim();
    const iconMap = {
      'المجلس الإداري': 'fa-solid fa-user-tie',
      'بدون لجنة': 'fa-solid fa-user-slash',
      'لجنة الإنتاج': 'fa-solid fa-clapperboard',
      'لجنة التأليف': 'fa-solid fa-feather',
      'لجنة التسويق': 'fa-solid fa-bullhorn',
      'لجنة التصميم': 'fa-solid fa-palette',
      'لجنة الرواة': 'fa-solid fa-microphone-lines',
      'لجنة السفراء': 'fa-solid fa-handshake',
      'لجنة الفعاليات': 'fa-solid fa-calendar-days'
    };
    return iconMap[name] || 'fa-solid fa-people-group';
  }

  // Render members statistics
  function renderMembersStats() {
    const grid = document.getElementById('membersStatsGrid');
    if (!grid) return;
    
    const total = members.length;
    const complete = members.filter(m => isMemberDataComplete(m)).length;
    const incomplete = total - complete;
    const completePercent = total > 0 ? Math.round((complete * 100) / total) : 0;
    const incompletePercent = total > 0 ? Math.round((incomplete * 100) / total) : 0;
    
    // Count activated vs non-activated accounts
    const activated = members.filter(m => m.user_id && m.account_status === 'active').length;
    const notActivated = total - activated;
    const activatedPercent = total > 0 ? Math.round((activated * 100) / total) : 0;
    const notActivatedPercent = total > 0 ? Math.round((notActivated * 100) / total) : 0;
    
    // Count by committee
    const committeeMap = new Map();
    members.forEach(m => {
      const committee = (m.committee || '').toString().trim() || 'بدون لجنة';
      committeeMap.set(committee, (committeeMap.get(committee) || 0) + 1);
    });
    
    const num = (v) => {
      const n = Number(v || 0);
      try { return n.toLocaleString('ar'); } catch { return String(n); }
    };
    
    grid.innerHTML = '';
    
    // كارت إجمالي الأعضاء
    const totalCard = el(`
      <div class="stat-card stat-card--total">
        <div class="stat-card__header">
          <div class="stat-card__icon">
            <i class="fa-solid fa-users"></i>
          </div>
          <div class="stat-card__title">إجمالي أعضاء النادي</div>
        </div>
        <div class="stat-card__body">
          <div class="stat-card__value">${num(total)}</div>
          <div class="stat-card__subtitle">
            <i class="fa-solid fa-chart-line"></i>
            عضو مسجل في نادي أديب
          </div>
        </div>
      </div>
    `);
    grid.appendChild(totalCard);
    
    // كارت البيانات المكتملة
    const completeCard = el(`
      <div class="stat-card stat-card--complete">
        <span class="stat-card__badge">${completePercent}%</span>
        <div class="stat-card__header">
          <div class="stat-card__icon">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <div class="stat-card__title">بيانات مكتملة</div>
        </div>
        <div class="stat-card__body">
          <div class="stat-card__value">${num(complete)}</div>
          <div class="stat-card__subtitle">
            <i class="fa-solid fa-clipboard-check"></i>
            من أصل ${num(total)} عضو
          </div>
          <div class="stat-card__progress">
            <div class="stat-card__progress-bar" style="width: ${completePercent}%"></div>
          </div>
        </div>
      </div>
    `);
    grid.appendChild(completeCard);
    
    // كارت البيانات غير المكتملة
    const incompleteCard = el(`
      <div class="stat-card stat-card--incomplete">
        <span class="stat-card__badge">${incompletePercent}%</span>
        <div class="stat-card__header">
          <div class="stat-card__icon">
            <i class="fa-solid fa-circle-xmark"></i>
          </div>
          <div class="stat-card__title">بيانات غير مكتملة</div>
        </div>
        <div class="stat-card__body">
          <div class="stat-card__value">${num(incomplete)}</div>
          <div class="stat-card__subtitle">
            <i class="fa-solid fa-triangle-exclamation"></i>
            تحتاج إلى استكمال
          </div>
          <div class="stat-card__progress">
            <div class="stat-card__progress-bar" style="width: ${incompletePercent}%"></div>
          </div>
        </div>
      </div>
    `);
    grid.appendChild(incompleteCard);
    
    // كارت الحسابات المفعلة
    const activatedCard = el(`
      <div class="stat-card stat-card--activated">
        <span class="stat-card__badge">${activatedPercent}%</span>
        <div class="stat-card__header">
          <div class="stat-card__icon">
            <i class="fa-solid fa-user-check"></i>
          </div>
          <div class="stat-card__title">حسابات مفعلة</div>
        </div>
        <div class="stat-card__body">
          <div class="stat-card__value">${num(activated)}</div>
          <div class="stat-card__subtitle">
            <i class="fa-solid fa-shield-check"></i>
            حساب نشط ومفعل
          </div>
          <div class="stat-card__progress">
            <div class="stat-card__progress-bar" style="width: ${activatedPercent}%"></div>
          </div>
        </div>
      </div>
    `);
    grid.appendChild(activatedCard);
    
    // كارت الحسابات غير المفعلة
    const notActivatedCard = el(`
      <div class="stat-card stat-card--not-activated">
        <span class="stat-card__badge">${notActivatedPercent}%</span>
        <div class="stat-card__header">
          <div class="stat-card__icon">
            <i class="fa-solid fa-user-clock"></i>
          </div>
          <div class="stat-card__title">حسابات غير مفعلة</div>
        </div>
        <div class="stat-card__body">
          <div class="stat-card__value">${num(notActivated)}</div>
          <div class="stat-card__subtitle">
            <i class="fa-solid fa-hourglass-half"></i>
            بانتظار التفعيل
          </div>
          <div class="stat-card__progress">
            <div class="stat-card__progress-bar" style="width: ${notActivatedPercent}%"></div>
          </div>
        </div>
      </div>
    `);
    grid.appendChild(notActivatedCard);
    
    // قسم اللجان
    const sortedCommittees = Array.from(committeeMap.entries())
      .sort((a, b) => b[1] - a[1]); // ترتيب تنازلي حسب عدد الأعضاء
    
    if (sortedCommittees.length > 0) {
      // حساب إجمالي أعضاء اللجان (للعرض)
      const totalInCommittees = sortedCommittees.reduce((sum, [, count]) => sum + count, 0);
      
      const committeesSection = el(`
        <div class="committees-section">
          <div class="committees-section__header">
            <div class="committees-section__title">
              <i class="fa-solid fa-sitemap"></i>
              توزيع الأعضاء على اللجان
            </div>
            <span class="committees-section__count">${sortedCommittees.length} لجنة</span>
          </div>
          <div class="committees-grid"></div>
        </div>
      `);
      
      const committeesGrid = committeesSection.querySelector('.committees-grid');
      
      sortedCommittees.forEach(([committee, count], index) => {
        const icon = getCommitteeIcon(committee);
        const percent = total > 0 ? Math.round((count * 100) / total) : 0;
        const card = el(`
          <div class="stat-card stat-card--committee" style="animation-delay: ${0.35 + (index * 0.05)}s">
            <div class="stat-card__header">
              <div class="stat-card__icon">
                <i class="${icon}"></i>
              </div>
              <div class="stat-card__title">${escapeHtml(committee)}</div>
            </div>
            <div class="stat-card__body">
              <div class="stat-card__value">${num(count)}</div>
              <div class="stat-card__subtitle">
                <i class="fa-solid fa-chart-pie"></i>
                ${percent}% من إجمالي الأعضاء
              </div>
            </div>
          </div>
        `);
        committeesGrid.appendChild(card);
      });
      
      grid.appendChild(committeesSection);
    }
  }

  // Check if member data is complete (all required fields filled)
  function isMemberDataComplete(member) {
    const requiredFields = [
      'full_name',
      'committee',
      'email',
      'phone',
      'academic_number',
      'national_id',
      'college',
      'major',
      'degree',
      'birth_date',
      'primary_color',
      'secondary_color'
    ];
    
    for (const field of requiredFields) {
      const value = member[field];
      if (!value || (typeof value === 'string' && !value.trim())) {
        return false;
      }
    }
    return true;
  }

  // Apply filters to members list
  function applyMembersFilters() {
    const nameFilter = (document.getElementById('membersFilterName')?.value || '').trim().toLowerCase();
    const committeeFilter = document.getElementById('membersFilterCommittee')?.value || 'all';
    const completionFilter = document.getElementById('membersFilterCompletion')?.value || 'all';
    
    let filtered = [...members];
    
    // Filter by name, membership number, phone, or national ID
    if (nameFilter) {
      filtered = filtered.filter(m => {
        const fullName = (m.full_name || '').toLowerCase();
        const membershipNumber = (m.membership_number || '').toString().toLowerCase();
        const phone = (m.phone || '').toString().toLowerCase();
        const nationalId = (m.national_id || '').toString().toLowerCase();
        return fullName.includes(nameFilter) || 
               membershipNumber.includes(nameFilter) ||
               phone.includes(nameFilter) ||
               nationalId.includes(nameFilter);
      });
    }
    
    // Filter by committee
    if (committeeFilter !== 'all') {
      filtered = filtered.filter(m => {
        const committee = (m.committee || '').toString().trim();
        return committee === committeeFilter;
      });
    }
    
    // Filter by completion
    if (completionFilter === 'complete') {
      filtered = filtered.filter(m => isMemberDataComplete(m));
    } else if (completionFilter === 'incomplete') {
      filtered = filtered.filter(m => !isMemberDataComplete(m));
    }
    
    renderMembersStats();
    renderMembers(filtered);
  }

  // Refresh committee filter options
  function refreshMembersCommitteeFilterOptions() {
    const select = document.getElementById('membersFilterCommittee');
    if (!select) return;
    
    const committees = new Set();
    members.forEach(m => {
      const committee = (m.committee || '').toString().trim();
      if (committee) committees.add(committee);
    });
    
    const current = select.value;
    select.innerHTML = '<option value="all">الكل</option>';
    
    Array.from(committees).sort((a, b) => {
      try { return a.localeCompare(b, 'ar'); } catch { return String(a).localeCompare(String(b)); }
    }).forEach(committee => {
      const opt = document.createElement('option');
      opt.value = committee;
      opt.textContent = committee;
      select.appendChild(opt);
    });
    
    if (current && Array.from(select.options).some(o => o.value === current)) {
      select.value = current;
    }
  }

  function renderMembers(filteredMembers = null) {
    if (!membersList) return;
    membersList.innerHTML = '';
    
    // Use filtered members or all members
    const membersToRender = filteredMembers !== null ? filteredMembers : members;
    
    // Group by committee
    const byCommittee = new Map();
    const sortedGlobal = [...membersToRender].sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000));
    for (const m of sortedGlobal) {
      const key = (m.committee && String(m.committee).trim()) ? String(m.committee).trim() : 'بدون لجنة';
      if (!byCommittee.has(key)) byCommittee.set(key, []);
      byCommittee.get(key).push(m);
    }
    // Render each committee block with cards
    for (const [committeeName, items] of byCommittee) {
      const committeeIcon = getCommitteeIcon(committeeName);
      const block = el(`
        <div class="panel" style="grid-column:1 / -1; padding:20px; background:linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06)">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; padding-bottom:12px; border-bottom:2px solid #e2e8f0">
            <h3 style="margin:0; font-family:fb; color:var(--main-blue); display:flex; align-items:center; gap:10px; font-size:1.1rem">
              <i class="${committeeIcon}" style="font-size:1.2rem"></i> ${committeeName}
            </h3>
            <span style="background:#3d8fd6; color:#fff; padding:4px 12px; border-radius:999px; font-size:0.85rem; font-weight:600">${items.length} عضو</span>
          </div>
          <div class="members-cards-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap:16px"></div>
        </div>`);
      const cardsGrid = block.querySelector('.members-cards-grid');
      items.forEach((item, sortedIndex) => {
        const idx = members.indexOf(item);
        const name = item.full_name || item.name || '';
        const email = item.email || '';
        const phone = item.phone || '';
        const avatar = (item.avatar || item.avatar_url) || '';
        const defaultAvatar = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e5e7eb"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="32" cy="24" r="12" fill="#94a3b8"/><path d="M12 54c0-10 10-16 20-16s20 6 20 16" fill="#94a3b8"/></svg>');
        const isComplete = isMemberDataComplete(item);
        const completionBadge = isComplete 
          ? '<span style="background:#10b981;color:#fff;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:4px"><i class="fa-solid fa-circle-check"></i> مكتمل</span>'
          : '<span style="background:#ef4444;color:#fff;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:4px"><i class="fa-solid fa-circle-xmark"></i> غير مكتمل</span>';
        
        const committee = item.committee || 'بدون لجنة';
        const committeeIcon = getCommitteeIcon(committee);
        const college = item.college || '';
        const major = item.major || '';
        
        const card = el(`
          <div class="member-card" data-idx="${idx}" style="background:linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border-radius:16px; padding:0; box-shadow:0 4px 12px rgba(0,0,0,0.08); transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border:1px solid #e2e8f0; position:relative; overflow:hidden">
            <div style="position:absolute; top:0; right:0; width:100%; height:5px; background:linear-gradient(90deg, #3d8fd6 0%, #5ba3e0 50%, #7ec8f0 100%)"></div>
            
            <div style="padding:20px 20px 16px">
              <div style="display:flex; align-items:flex-start; gap:16px; margin-bottom:16px">
                <div style="position:relative">
                  <img src="${avatar || defaultAvatar}" alt="${name}" onerror="this.src='${defaultAvatar}'" style="width:72px; height:72px; border-radius:16px; object-fit:cover; box-shadow:0 4px 12px rgba(0,0,0,0.15); flex-shrink:0; border:3px solid #fff" />
                  <div style="position:absolute; bottom:-6px; right:-6px; background:${item.user_id ? '#10b981' : '#ef4444'}; width:24px; height:24px; border-radius:50%; border:3px solid #fff; display:flex; align-items:center; justify-content:center" title="${item.user_id ? 'الحساب مفعّل' : 'الحساب غير مفعّل'}">
                    <i class="fa-solid ${item.user_id ? 'fa-check' : 'fa-xmark'}" style="font-size:10px; color:#fff"></i>
                  </div>
                </div>
                
                <div style="flex:1; min-width:0">
                  <div style="font-size:1.1rem; font-weight:700; color:#0f172a; margin-bottom:8px; line-height:1.3">
                    ${escapeHtml(name)}
                  </div>
                  <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px; padding:4px 10px; background:#f1f5f9; border-radius:8px; width:fit-content">
                    <i class="${committeeIcon}" style="font-size:12px; color:#3d8fd6"></i>
                    <span style="font-size:0.8rem; color:#475569; font-weight:600">${escapeHtml(committee)}</span>
                  </div>
                  ${completionBadge}
                </div>
              </div>
              
              <div style="display:grid; gap:8px; margin-bottom:16px">
                ${email ? `
                  <div style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0">
                    <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #3d8fd6, #5ba3e0); display:flex; align-items:center; justify-content:center; flex-shrink:0">
                      <i class="fa-solid fa-envelope" style="font-size:14px; color:#fff"></i>
                    </div>
                    <div style="flex:1; min-width:0">
                      <div style="font-size:0.7rem; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px">البريد الإلكتروني</div>
                      <div style="font-size:0.85rem; color:#1e293b; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${escapeHtml(email)}</div>
                    </div>
                  </div>
                ` : ''}
                ${phone ? `
                  <div style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0">
                    <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #10b981, #34d399); display:flex; align-items:center; justify-content:center; flex-shrink:0">
                      <i class="fa-solid fa-phone" style="font-size:14px; color:#fff"></i>
                    </div>
                    <div style="flex:1; min-width:0">
                      <div style="font-size:0.7rem; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px">رقم الجوال</div>
                      <div style="font-size:0.85rem; color:#1e293b; font-weight:500; direction:ltr; text-align:right">${escapeHtml(phone)}</div>
                    </div>
                  </div>
                ` : ''}
                ${college || major ? `
                  <div style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0">
                    <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #f59e0b, #fbbf24); display:flex; align-items:center; justify-content:center; flex-shrink:0">
                      <i class="fa-solid fa-graduation-cap" style="font-size:14px; color:#fff"></i>
                    </div>
                    <div style="flex:1; min-width:0">
                      <div style="font-size:0.7rem; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px">التخصص</div>
                      <div style="font-size:0.85rem; color:#1e293b; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${escapeHtml(major || college || 'غير محدد')}</div>
                    </div>
                  </div>
                ` : ''}
              </div>
              
              <!-- أزرار الإجراءات السريعة (تظهر في الشبكة ذات العمودين) -->
              <div class="member-inline-actions" style="display:none; gap:6px; margin-bottom:8px">
                ${!item.user_id ? `
                <button class="btn btn-sm member-icon-btn" data-act="send-invitation" data-idx="${idx}" title="إرسال دعوة تفعيل" style="flex:1; padding:8px; border-radius:8px; background:#fff; border:1px solid #d1fae5; color:#10b981; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 2px 4px rgba(0,0,0,0.06); transition:all 0.2s; font-size:0.8rem; font-weight:600">
                  <i class="fa-solid fa-envelope" style="font-size:12px"></i>
                  <span>إرسال دعوة</span>
                </button>
                ` : `
                <button class="btn btn-sm member-icon-btn" disabled title="الحساب مفعّل" style="flex:1; padding:8px; border-radius:8px; background:#f0fdf4; border:1px solid #bbf7d0; color:#10b981; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 2px 4px rgba(0,0,0,0.06); cursor:not-allowed; opacity:0.6; font-size:0.8rem; font-weight:600">
                  <i class="fa-solid fa-check-circle" style="font-size:12px"></i>
                  <span>مفعّل</span>
                </button>
                `}
                <button class="btn btn-sm member-icon-btn" data-act="change-committee" data-idx="${idx}" title="تغيير اللجنة" style="flex:1; padding:8px; border-radius:8px; background:#fff; border:1px solid #e2e8f0; color:#64748b; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 2px 4px rgba(0,0,0,0.06); transition:all 0.2s; font-size:0.8rem; font-weight:600">
                  <i class="fa-solid fa-arrow-right-arrow-left" style="font-size:12px"></i>
                  <span>تغيير اللجنة</span>
                </button>
                <button class="btn btn-sm member-delete-btn member-icon-btn" data-act="del" data-idx="${idx}" title="حذف" style="flex:1; padding:8px; border-radius:8px; background:#fff; border:1px solid #fecaca; color:#ef4444; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 2px 4px rgba(0,0,0,0.06); transition:all 0.2s; font-size:0.8rem; font-weight:600">
                  <i class="fa-solid fa-trash" style="font-size:12px"></i>
                  <span>حذف</span>
                </button>
              </div>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0; border-top:1px solid #e2e8f0; background:#fafbfc">
              <button class="btn btn-sm member-action-btn" data-act="view" data-idx="${idx}" style="border:none; border-radius:0 0 0 16px; padding:12px; font-size:0.85rem; font-weight:600; background:transparent; color:#3d8fd6; border-right:1px solid #e2e8f0; transition:all 0.2s">
                <i class="fa-regular fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm member-action-btn" data-act="edit" data-idx="${idx}" style="border:none; padding:12px; font-size:0.85rem; font-weight:600; background:transparent; color:#64748b; border-right:1px solid #e2e8f0; transition:all 0.2s">
                <i class="fa-solid fa-pen"></i> تعديل
              </button>
              <button class="btn btn-sm member-action-btn" data-act="settings" data-idx="${idx}" style="border:none; border-radius:0 0 16px 0; padding:12px; font-size:0.85rem; font-weight:600; background:transparent; color:#10b981; transition:all 0.2s">
                <i class="fa-solid fa-gear"></i> إعدادات
              </button>
            </div>
            
            <!-- أزرار الإجراءات العلوية (تظهر في الشبكة ذات العمود الواحد) -->
            <div class="member-top-actions" style="position:absolute; top:16px; left:16px; display:flex; gap:6px">
              ${!item.user_id ? `
              <button class="btn btn-sm member-icon-btn" data-act="send-invitation" data-idx="${idx}" title="إرسال دعوة تفعيل" style="width:36px; height:36px; padding:0; border-radius:10px; background:#fff; border:1px solid #d1fae5; color:#10b981; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.06); transition:all 0.2s">
                <i class="fa-solid fa-envelope" style="font-size:14px"></i>
              </button>
              ` : `
              <button class="btn btn-sm member-icon-btn" disabled title="الحساب مفعّل" style="width:36px; height:36px; padding:0; border-radius:10px; background:#f0fdf4; border:1px solid #bbf7d0; color:#10b981; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.06); cursor:not-allowed; opacity:0.6">
                <i class="fa-solid fa-check-circle" style="font-size:14px"></i>
              </button>
              `}
              <button class="btn btn-sm member-icon-btn" data-act="change-committee" data-idx="${idx}" title="تغيير اللجنة" style="width:36px; height:36px; padding:0; border-radius:10px; background:#fff; border:1px solid #e2e8f0; color:#64748b; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.06); transition:all 0.2s">
                <i class="fa-solid fa-arrow-right-arrow-left" style="font-size:14px"></i>
              </button>
              <button class="btn btn-sm member-delete-btn member-icon-btn" data-act="del" data-idx="${idx}" title="حذف" style="width:36px; height:36px; padding:0; border-radius:10px; background:#fff; border:1px solid #fecaca; color:#ef4444; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.06); transition:all 0.2s">
                <i class="fa-solid fa-trash" style="font-size:14px"></i>
              </button>
            </div>
          </div>`);
        
        // Hover effect for card
        card.addEventListener('mouseenter', () => {
          card.style.transform = 'translateY(-6px)';
          card.style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.transform = 'translateY(0)';
          card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
        });
        
        // Hover effects for action buttons
        const actionBtns = card.querySelectorAll('.member-action-btn');
        actionBtns.forEach(btn => {
          btn.addEventListener('mouseenter', () => {
            btn.style.background = btn.dataset.act === 'view' ? '#3d8fd6' : '#64748b';
            btn.style.color = '#fff';
          });
          btn.addEventListener('mouseleave', () => {
            btn.style.background = 'transparent';
            btn.style.color = btn.dataset.act === 'view' ? '#3d8fd6' : '#64748b';
          });
        });
        
        // Hover effect for delete button
        const deleteBtn = card.querySelector('.member-delete-btn');
        if (deleteBtn) {
          deleteBtn.addEventListener('mouseenter', () => {
            deleteBtn.style.background = '#ef4444';
            deleteBtn.style.color = '#fff';
            deleteBtn.style.borderColor = '#ef4444';
            deleteBtn.style.transform = 'scale(1.1)';
          });
          deleteBtn.addEventListener('mouseleave', () => {
            deleteBtn.style.background = '#fff';
            deleteBtn.style.color = '#ef4444';
            deleteBtn.style.borderColor = '#fecaca';
            deleteBtn.style.transform = 'scale(1)';
          });
        }
        
        // Hover effect for change committee button
        const changeCommitteeBtn = card.querySelector('[data-act="change-committee"]');
        if (changeCommitteeBtn) {
          changeCommitteeBtn.addEventListener('mouseenter', () => {
            changeCommitteeBtn.style.background = '#3d8fd6';
            changeCommitteeBtn.style.color = '#fff';
            changeCommitteeBtn.style.borderColor = '#3d8fd6';
            changeCommitteeBtn.style.transform = 'scale(1.1)';
          });
          changeCommitteeBtn.addEventListener('mouseleave', () => {
            changeCommitteeBtn.style.background = '#fff';
            changeCommitteeBtn.style.color = '#64748b';
            changeCommitteeBtn.style.borderColor = '#e2e8f0';
            changeCommitteeBtn.style.transform = 'scale(1)';
          });
        }
        
        // Hover effect for send invitation button (top actions)
        const sendInvitationBtnTop = card.querySelector('.member-top-actions [data-act="send-invitation"]');
        if (sendInvitationBtnTop) {
          sendInvitationBtnTop.addEventListener('mouseenter', () => {
            sendInvitationBtnTop.style.background = '#10b981';
            sendInvitationBtnTop.style.color = '#fff';
            sendInvitationBtnTop.style.borderColor = '#10b981';
            sendInvitationBtnTop.style.transform = 'scale(1.1)';
          });
          sendInvitationBtnTop.addEventListener('mouseleave', () => {
            sendInvitationBtnTop.style.background = '#fff';
            sendInvitationBtnTop.style.color = '#10b981';
            sendInvitationBtnTop.style.borderColor = '#d1fae5';
            sendInvitationBtnTop.style.transform = 'scale(1)';
          });
        }
        
        // Hover effects for inline action buttons
        const inlineActionBtns = card.querySelectorAll('.member-inline-actions .member-icon-btn');
        inlineActionBtns.forEach(btn => {
          if (btn.disabled) return;
          
          btn.addEventListener('mouseenter', () => {
            const act = btn.dataset.act;
            if (act === 'send-invitation') {
              btn.style.background = '#10b981';
              btn.style.color = '#fff';
              btn.style.borderColor = '#10b981';
            } else if (act === 'change-committee') {
              btn.style.background = '#3d8fd6';
              btn.style.color = '#fff';
              btn.style.borderColor = '#3d8fd6';
            } else if (act === 'del') {
              btn.style.background = '#ef4444';
              btn.style.color = '#fff';
              btn.style.borderColor = '#ef4444';
            }
            btn.style.transform = 'translateY(-2px)';
            btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.12)';
          });
          
          btn.addEventListener('mouseleave', () => {
            const act = btn.dataset.act;
            btn.style.background = '#fff';
            if (act === 'send-invitation') {
              btn.style.color = '#10b981';
              btn.style.borderColor = '#d1fae5';
            } else if (act === 'change-committee') {
              btn.style.color = '#64748b';
              btn.style.borderColor = '#e2e8f0';
            } else if (act === 'del') {
              btn.style.color = '#ef4444';
              btn.style.borderColor = '#fecaca';
            }
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.06)';
          });
        });
        
        cardsGrid.appendChild(card);
      });
      membersList.appendChild(block);
      
      // Add ResizeObserver to toggle button positions based on grid columns
      const resizeObserver = new ResizeObserver(() => {
        const gridComputedStyle = window.getComputedStyle(cardsGrid);
        const gridTemplateColumns = gridComputedStyle.gridTemplateColumns;
        const columnCount = gridTemplateColumns.split(' ').length;
        
        // Get all cards in this grid
        const cards = cardsGrid.querySelectorAll('.member-card');
        cards.forEach(card => {
          const topActions = card.querySelector('.member-top-actions');
          const inlineActions = card.querySelector('.member-inline-actions');
          
          if (columnCount === 1) {
            // Single column: show top actions, hide inline actions
            if (topActions) topActions.style.display = 'flex';
            if (inlineActions) inlineActions.style.display = 'none';
          } else {
            // Multiple columns: hide top actions, show inline actions
            if (topActions) topActions.style.display = 'none';
            if (inlineActions) inlineActions.style.display = 'flex';
          }
        });
      });
      
      resizeObserver.observe(cardsGrid);
    }
    // no DnD in simplified grouped view
    
    // Refresh committee filter options after rendering
    refreshMembersCommitteeFilterOptions();
  }

  // ============================================
  // Member Invitations System
  // ============================================
  
  // إرسال دعوة لعضو واحد
  async function sendMemberInvitation(memberId) {
    const member = members.find(m => m.id === memberId);
    
    if (!member) {
      return Swal.fire('خطأ', 'لم يتم العثور على العضو', 'error');
    }
    
    if (!member.email) {
      return Swal.fire('خطأ', 'البريد الإلكتروني مطلوب لإرسال الدعوة', 'error');
    }
    
    if (member.user_id) {
      return Swal.fire('تنبيه', 'هذا العضو فعّل حسابه مسبقاً', 'info');
    }
    
    try {
      // عرض رسالة تحميل
      Swal.fire({
        title: 'جاري إرسال الدعوة...',
        html: 'يرجى الانتظار، جاري إرسال البريد الإلكتروني...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });
      
      // استدعاء Edge Function لإرسال الدعوة
      const { data, error } = await callFunction('send-member-invitation', {
        method: 'POST',
        body: {
          member_id: memberId,
          email: member.email,
          full_name: member.full_name || member.name || 'عضو',
          committee: member.committee || null
        },
        returnFormat: 'object'
      });
      
      if (error) throw error;
      
      if (!data || !data.success) {
        throw new Error(data?.message || 'فشل إرسال الدعوة');
      }
      
      // عرض رسالة النجاح مع خيار عرض الرابط
      Swal.fire({
        title: '✅ تم إرسال الدعوة بنجاح!',
        html: `
          <div style="text-align:right;direction:rtl;padding:20px;">
            <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:16px;margin-bottom:20px;">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                <i class="fa-solid fa-user" style="color:#10b981;font-size:20px;"></i>
                <div>
                  <div style="font-weight:700;color:#0f172a;font-size:1.1rem;">${escapeHtml(member.full_name || 'عضو')}</div>
                  <div style="color:#64748b;font-size:0.9rem;margin-top:4px;">${escapeHtml(member.email)}</div>
                </div>
              </div>
              ${member.committee ? `
                <div style="display:inline-flex;align-items:center;gap:6px;background:#fff;padding:6px 12px;border-radius:8px;font-size:0.85rem;">
                  <i class="fa-solid fa-users" style="color:#3d8fd6;"></i>
                  <span style="color:#475569;font-weight:600;">${escapeHtml(member.committee)}</span>
                </div>
              ` : ''}
            </div>
            
            <div style="background:#dcfce7;border:2px solid #86efac;border-radius:12px;padding:16px;margin-bottom:16px;text-align:center;">
              <div style="font-size:3rem;margin-bottom:8px;">📧</div>
              <p style="margin:0;color:#166534;font-size:1.1rem;font-weight:600;">تم إرسال البريد الإلكتروني!</p>
              <p style="margin:8px 0 0;color:#15803d;font-size:0.9rem;">تحقق من صندوق الوارد أو البريد المزعج</p>
            </div>
            
            <div style="background:#e0f2fe;border-right:4px solid #0ea5e9;padding:12px 16px;border-radius:8px;">
              <div style="display:flex;align-items:start;gap:8px;">
                <i class="fa-solid fa-info-circle" style="color:#0284c7;margin-top:2px;"></i>
                <div style="color:#075985;font-size:0.85rem;line-height:1.6;">
                  <strong>ملاحظة:</strong><br>
                  • تم إرسال رابط التفعيل للبريد الإلكتروني<br>
                  • الرابط صالح لمدة 7 أيام<br>
                  • يمكن استخدامه مرة واحدة فقط
                </div>
              </div>
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'حسناً',
        showDenyButton: true,
        denyButtonText: '🔗 عرض الرابط',
        confirmButtonColor: '#10b981',
        denyButtonColor: '#3d8fd6',
        width: '600px'
      }).then(async (result) => {
        if (result.isDenied) {
          // عرض الرابط إذا طلب المستخدم ذلك
          const { data: invitationData } = await sb
            .from('member_invitations')
            .select('invitation_token')
            .eq('member_id', memberId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (invitationData?.invitation_token) {
            const invitationUrl = `${window.location.origin}/members/activate.html?token=${invitationData.invitation_token}`;
            
            Swal.fire({
              title: 'رابط التفعيل',
              html: `
                <div style="text-align:right;direction:rtl;padding:10px;">
                  <p style="margin-bottom:12px;color:#64748b;font-size:0.9rem;">يمكنك نسخ الرابط وإرساله يدوياً:</p>
                  <textarea 
                    id="invitationLinkCopy" 
                    style="width:100%;padding:14px;border:2px solid #3d8fd6;border-radius:10px;font-size:13px;direction:ltr;text-align:left;font-family:monospace;background:#f8fafc;resize:none;line-height:1.6;"
                    rows="3"
                    readonly
                  >${invitationUrl}</textarea>
                </div>
              `,
              icon: 'info',
              confirmButtonText: '📋 نسخ',
              showCancelButton: true,
              cancelButtonText: 'إغلاق',
              confirmButtonColor: '#3d8fd6',
              didOpen: () => {
                document.getElementById('invitationLinkCopy')?.select();
              }
            }).then((copyResult) => {
              if (copyResult.isConfirmed) {
                navigator.clipboard.writeText(invitationUrl).then(() => {
                  Swal.fire({
                    icon: 'success',
                    title: 'تم النسخ!',
                    text: 'تم نسخ الرابط للحافظة',
                    timer: 1500,
                    showConfirmButton: false
                  });
                }).catch(() => {
                  Swal.fire('تنبيه', 'فشل النسخ التلقائي', 'warning');
                });
              }
            });
          }
        }
      });
      
    } catch (err) {
      console.error('Error sending invitation:', err);
      Swal.fire({
        icon: 'error',
        title: 'فشل إنشاء الدعوة',
        text: err.message || 'حدث خطأ غير متوقع',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#ef4444'
      });
    }
  }
  
  // إرسال دعوات جماعية
  async function sendBulkInvitations(filterType = 'all', filterValue = null) {
    try {
      // تحديد الأعضاء المستهدفين
      let targetMembers = members.filter(m => !m.user_id && m.email);
      
      if (filterType === 'committee' && filterValue) {
        targetMembers = targetMembers.filter(m => m.committee === filterValue);
      }
      
      if (targetMembers.length === 0) {
        return Swal.fire({
          icon: 'info',
          title: 'لا يوجد أعضاء',
          text: 'لا يوجد أعضاء غير مفعلين لإرسال دعوات لهم',
          confirmButtonText: 'حسناً'
        });
      }
      
      // تأكيد الإرسال
      const result = await Swal.fire({
        title: 'تأكيد الإرسال الجماعي',
        html: `
          <div style="text-align:right;direction:rtl;padding:10px;">
            <p style="font-size:1.1rem;margin-bottom:16px;">
              هل تريد إرسال دعوات تفعيل لـ <strong style="color:#10b981;">${targetMembers.length}</strong> عضو؟
            </p>
            ${filterType === 'committee' ? `
              <div style="background:#f0f9ff;border:2px solid #bae6fd;border-radius:8px;padding:12px;margin-bottom:12px;">
                <i class="fa-solid fa-users" style="color:#0284c7;"></i>
                <strong>اللجنة:</strong> ${escapeHtml(filterValue)}
              </div>
            ` : ''}
            <div style="background:#fef3c7;border-right:4px solid #f59e0b;padding:12px;border-radius:8px;font-size:0.9rem;">
              <i class="fa-solid fa-exclamation-triangle" style="color:#f59e0b;"></i>
              سيتم إنشاء ${targetMembers.length} دعوة جديدة
            </div>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'نعم، أرسل الدعوات',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b'
      });
      
      if (!result.isConfirmed) return;
      
      // عرض رسالة تحميل
      Swal.fire({
        title: 'جاري إرسال الدعوات...',
        html: `<div style="text-align:center;">
          <div style="font-size:3rem;margin-bottom:10px;">📧</div>
          <p>يرجى الانتظار...</p>
          <p style="color:#64748b;font-size:0.9rem;">جاري إرسال ${targetMembers.length} دعوة عبر البريد الإلكتروني</p>
          <div id="bulkProgress" style="margin-top:16px;color:#64748b;font-size:0.85rem;"></div>
        </div>`,
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });
      
      // إرسال الدعوات واحدة تلو الأخرى
      let successCount = 0;
      let failedCount = 0;
      const failedMembers = [];
      
      for (let i = 0; i < targetMembers.length; i++) {
        const member = targetMembers[i];
        const progressEl = document.getElementById('bulkProgress');
        if (progressEl) {
          progressEl.textContent = `جاري الإرسال: ${i + 1} من ${targetMembers.length}`;
        }
        
        try {
          const { data, error } = await callFunction('send-member-invitation', {
            method: 'POST',
            body: {
              member_id: member.id,
              email: member.email,
              full_name: member.full_name || member.name || 'عضو',
              committee: member.committee || null
            },
            returnFormat: 'object'
          });
          
          if (error || !data?.success) {
            failedCount++;
            failedMembers.push(member.full_name || member.email);
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Failed to send invitation to ${member.email}:`, err);
          failedCount++;
          failedMembers.push(member.full_name || member.email);
        }
        
        // تأخير بسيط لتجنب تجاوز حد الطلبات
        if (i < targetMembers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // عرض النتائج
      Swal.fire({
        icon: successCount > 0 ? 'success' : 'error',
        title: successCount > 0 ? '✅ تم إرسال الدعوات!' : '❌ فشل الإرسال',
        html: `
          <div style="text-align:right;direction:rtl;padding:20px;">
            <div style="font-size:3rem;margin-bottom:16px;text-align:center;">
              ${successCount > 0 ? '🎉' : '😞'}
            </div>
            
            ${successCount > 0 ? `
            <div style="background:#dcfce7;border:2px solid #86efac;border-radius:12px;padding:16px;margin-bottom:16px;">
              <p style="margin:0;color:#166534;font-size:1.1rem;font-weight:600;text-align:center;">
                ✅ تم إرسال <strong>${successCount}</strong> دعوة بنجاح
              </p>
              <p style="margin:8px 0 0;color:#15803d;font-size:0.9rem;text-align:center;">
                تم إرسال رسائل البريد الإلكتروني للأعضاء
              </p>
            </div>
            ` : ''}
            
            ${failedCount > 0 ? `
            <div style="background:#fee2e2;border:2px solid #fca5a5;border-radius:12px;padding:16px;margin-bottom:16px;">
              <p style="margin:0 0 8px;color:#991b1b;font-size:1rem;font-weight:600;">
                ⚠️ فشل إرسال ${failedCount} دعوة
              </p>
              <details style="margin-top:8px;">
                <summary style="cursor:pointer;color:#dc2626;font-size:0.9rem;">عرض الأعضاء الذين فشل إرسال دعواتهم</summary>
                <ul style="margin:8px 0;padding-right:20px;color:#7f1d1d;font-size:0.85rem;text-align:right;">
                  ${failedMembers.map(name => `<li>${escapeHtml(name)}</li>`).join('')}
                </ul>
              </details>
            </div>
            ` : ''}
            
            <div style="background:#e0f2fe;border-right:4px solid #0ea5e9;padding:12px 16px;border-radius:8px;">
              <div style="display:flex;align-items:start;gap:8px;">
                <i class="fa-solid fa-info-circle" style="color:#0284c7;margin-top:2px;"></i>
                <div style="color:#075985;font-size:0.85rem;line-height:1.6;">
                  <strong>ملاحظة:</strong><br>
                  • تم إرسال رسائل البريد الإلكتروني للأعضاء<br>
                  • الروابط صالحة لمدة 7 أيام<br>
                  ${failedCount > 0 ? '• يمكنك إعادة المحاولة للأعضاء الذين فشل إرسال دعواتهم' : ''}
                </div>
              </div>
            </div>
          </div>
        `,
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#10b981',
        width: '600px'
      });
      
    } catch (err) {
      console.error('Error sending bulk invitations:', err);
      Swal.fire({
        icon: 'error',
        title: 'فشل إنشاء الدعوات',
        text: err.message || 'حدث خطأ غير متوقع',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#ef4444'
      });
    }
  }
  
  // عرض استعلام SQL للحصول على روابط الدعوات
  function showInvitationsQuery(filterType = 'all', filterValue = null) {
    let whereClause = "mi.status = 'pending' AND mi.created_at > NOW() - INTERVAL '1 hour'";
    if (filterType === 'committee' && filterValue) {
      whereClause += ` AND m.committee = '${filterValue.replace(/'/g, "''")}'`;
    }
    
    const query = `-- الحصول على روابط الدعوات المنشأة حديثاً
SELECT 
  m.full_name as "الاسم",
  m.email as "البريد",
  m.committee as "اللجنة",
  'https://www.adeeb.club/members/activate.html?token=' || mi.invitation_token as "رابط_التفعيل",
  mi.expires_at as "تاريخ_الانتهاء"
FROM member_invitations mi
JOIN members m ON m.id = mi.member_id
WHERE ${whereClause}
ORDER BY m.committee, m.full_name;`;
    
    Swal.fire({
      title: 'استعلام SQL',
      html: `
        <div style="text-align:right;direction:rtl;padding:10px;">
          <p style="margin-bottom:12px;color:#64748b;">انسخ هذا الاستعلام وشغّله في Supabase SQL Editor:</p>
          <textarea 
            id="sqlQuery" 
            style="width:100%;padding:14px;border:2px solid #3d8fd6;border-radius:10px;font-size:12px;direction:ltr;text-align:left;font-family:monospace;background:#1e293b;color:#e2e8f0;resize:none;line-height:1.6;"
            rows="12"
            readonly
          >${query}</textarea>
        </div>
      `,
      icon: 'info',
      confirmButtonText: '📋 نسخ الاستعلام',
      showCancelButton: true,
      cancelButtonText: 'إغلاق',
      confirmButtonColor: '#3d8fd6',
      width: '700px',
      didOpen: () => {
        document.getElementById('sqlQuery').select();
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const textarea = document.getElementById('sqlQuery');
        textarea.select();
        navigator.clipboard.writeText(query).then(() => {
          Swal.fire({
            icon: 'success',
            title: 'تم النسخ!',
            text: 'تم نسخ الاستعلام للحافظة',
            timer: 2000,
            showConfirmButton: false
          });
        });
      }
    });
  }
  
  // قائمة خيارات الدعوات الجماعية
  function showBulkInvitationsMenu() {
    // الحصول على اللجان الفريدة
    const committees = [...new Set(members.filter(m => m.committee).map(m => m.committee))].sort();
    
    const committeeOptions = committees.map(c => 
      `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
    ).join('');
    
    Swal.fire({
      title: 'إرسال دعوات جماعية',
      html: `
        <div style="text-align:right;direction:rtl;padding:20px;">
          <div style="margin-bottom:20px;">
            <label style="display:block;font-weight:600;margin-bottom:8px;color:#0f172a;">
              <i class="fa-solid fa-filter"></i> اختر طريقة الإرسال:
            </label>
            <select id="bulkInvitationType" style="width:100%;padding:12px;border:2px solid #e2e8f0;border-radius:8px;font-size:1rem;">
              <option value="all">جميع الأعضاء غير المفعلين</option>
              <option value="committee">حسب اللجنة</option>
            </select>
          </div>
          
          <div id="committeeSelectContainer" style="display:none;margin-bottom:20px;">
            <label style="display:block;font-weight:600;margin-bottom:8px;color:#0f172a;">
              <i class="fa-solid fa-users"></i> اختر اللجنة:
            </label>
            <select id="committeeSelect" style="width:100%;padding:12px;border:2px solid #e2e8f0;border-radius:8px;font-size:1rem;">
              ${committeeOptions}
            </select>
          </div>
          
          <div style="background:#e0f2fe;border-right:4px solid #0ea5e9;padding:12px;border-radius:8px;font-size:0.9rem;">
            <i class="fa-solid fa-info-circle" style="color:#0284c7;"></i>
            سيتم إرسال دعوات فقط للأعضاء الذين لم يفعلوا حساباتهم بعد
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'متابعة',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      didOpen: () => {
        const typeSelect = document.getElementById('bulkInvitationType');
        const committeeContainer = document.getElementById('committeeSelectContainer');
        
        typeSelect.addEventListener('change', () => {
          if (typeSelect.value === 'committee') {
            committeeContainer.style.display = 'block';
          } else {
            committeeContainer.style.display = 'none';
          }
        });
      },
      preConfirm: () => {
        const type = document.getElementById('bulkInvitationType').value;
        const committee = document.getElementById('committeeSelect')?.value;
        return { type, committee };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const { type, committee } = result.value;
        sendBulkInvitations(type, type === 'committee' ? committee : null);
      }
    });
  }

  // Members filter event listeners
  document.getElementById('membersFilterName')?.addEventListener('input', applyMembersFilters);
  document.getElementById('membersFilterCommittee')?.addEventListener('change', applyMembersFilters);
  document.getElementById('membersFilterCompletion')?.addEventListener('change', applyMembersFilters);
  document.getElementById('membersClearFilters')?.addEventListener('click', () => {
    const nameFilter = document.getElementById('membersFilterName');
    const committeeFilter = document.getElementById('membersFilterCommittee');
    const completionFilter = document.getElementById('membersFilterCompletion');
    if (nameFilter) nameFilter.value = '';
    if (committeeFilter) committeeFilter.value = 'all';
    if (completionFilter) completionFilter.value = 'all';
    renderMembers();
  });
  
  // Bulk invitations button
  document.getElementById('membersBulkInvitationsBtn')?.addEventListener('click', () => {
    showBulkInvitationsMenu();
  });

  // Members export functionality
  function membersCsvEscape(val) {
    try {
      const s = String(val != null ? val : '').replace(/"/g, '""');
      return /[",\r\n]/.test(s) ? `"${s}"` : s;
    } catch { return ''; }
  }

  function exportMembersToCSV() {
    const list = Array.isArray(members) ? members : [];
    if (!list.length) {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'info',
          title: 'لا توجد بيانات',
          text: 'لا يوجد أعضاء لتصديرهم',
          confirmButtonText: 'حسناً',
          confirmButtonColor: '#3d8fd6'
        });
      }
      return;
    }

    const fieldsMap = {
      id: 'المعرف',
      membership_number: 'رقم العضوية',
      full_name: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      phone: 'رقم الجوال',
      national_id: 'رقم الهوية',
      academic_number: 'الرقم الجامعي',
      degree: 'الدرجة العلمية',
      college: 'الكلية',
      major: 'التخصص',
      birth_date: 'تاريخ الميلاد',
      committee: 'اللجنة',
      position: 'المنصب',
      join_date: 'تاريخ الانضمام',
      status: 'الحالة',
      social_twitter: 'تويتر',
      social_instagram: 'إنستقرام',
      social_linkedin: 'لينكد إن',
      social_tiktok: 'تيك توك',
      bio: 'النبذة',
      skills: 'المهارات',
      notes: 'ملاحظات'
    };

    const fields = Object.keys(fieldsMap);
    const rows = list.map((member) => {
      const obj = {};
      fields.forEach((field) => {
        obj[field] = member[field] != null ? member[field] : '';
      });
      return obj;
    });

    const header = fields.map((k) => membersCsvEscape(fieldsMap[k] || k)).join(',');
    const body = rows.map((row) => fields.map((k) => membersCsvEscape(row[k])).join(',')).join('\r\n');
    const csv = '\uFEFF' + header + '\r\n' + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const name = `members_${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.csv`;
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: 'تم التصدير!',
        text: `تم تصدير ${list.length} عضو بنجاح`,
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#3d8fd6',
        timer: 2000
      });
    }
  }

  document.getElementById('membersExportBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    exportMembersToCSV();
  });
  
  function renderTestimonials() {
    if (!testimonialsList) return;
    testimonialsList.innerHTML = '';
    const sorted = [...testimonials].sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000));
    sorted.forEach((item, sortedIndex) => {
      const idx = testimonials.indexOf(item);
      const displayOrder = (item.order ? Number(item.order) : (sortedIndex + 1));
      const name = item.member_name || item.name || 'عضو';
      const committee = (item.committee || '').toString().trim();
      const neutralAvatar = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e5e7eb"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="32" cy="24" r="12" fill="#94a3b8"/><path d="M12 54c0-10 10-16 20-16s20 6 20 16" fill="#94a3b8"/></svg>');
      const avatar = ((item.avatar || item.avatar_url) || '').toString().trim() || neutralAvatar;
      const rating = Math.max(0, Math.min(5, Number(item.rating || 0)));
      const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
      const text = (item.text || '').toString();
      const snippet = text.length > 200 ? (text.slice(0, 200) + '...') : text;
      const visible = (item.visible === undefined) ? true : !!item.visible;
      const node = el(`
        <div class="card draggable-card" data-idx="${idx}" draggable="true">
          <span class="order-chip">#${displayOrder}</span>
          <div class="card__body" style="display:flex;gap:14px;align-items:flex-start;">
            <div class="card__media" style="width:auto">
              <img src="${avatar}" alt="${name}" style="width:56px; height:56px; border-radius:50%; object-fit:cover; background:#f1f5f9" onerror="this.onerror=null;this.src='${neutralAvatar}'" />
            </div>
            <div style="flex:1">
              <div class="card__title" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <span>${name}</span>
                ${committee ? `<span class="chip">${committee}</span>` : ''}
                ${!visible ? `<span style="background:#ef4444;color:#fff;border-radius:999px;padding:0 8px;font-size:12px">مخفي</span>` : ''}
              </div>
              <div class="muted" style="margin:4px 0">${stars}</div>
              ${snippet ? `<p class="card__text" style="margin:6px 0;color:#64748b;white-space:pre-wrap">${snippet}</p>` : ''}
              <div class="card__actions" style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
                <button class="btn btn-outline" data-act="up" data-idx="${idx}" title="تحريك لأعلى"><i class="fa-solid fa-arrow-up"></i></button>
                <button class="btn btn-outline" data-act="down" data-idx="${idx}" title="تحريك لأسفل"><i class="fa-solid fa-arrow-down"></i></button>
                <button class="btn btn-outline drag-handle" title="سحب لإعادة الترتيب"><i class="fa-solid fa-grip-vertical"></i></button>
                <button class="btn btn-outline" data-act="vis" data-idx="${idx}" title="إظهار/إخفاء"><i class="fa-regular fa-eye"></i></button>
                <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
                <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
              </div>
            </div>
          </div>
        </div>`);
      testimonialsList.appendChild(node);
    });
    setupListDnD(testimonialsList, testimonials, KEYS.testimonials, 'testimonials', renderTestimonials);
  }
  
  function renderFaq() {
    if (!faqList) return;
    faqList.innerHTML = '';
    const sorted = [...faq].sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000));
    sorted.forEach((item, sortedIndex) => {
      const idx = faq.indexOf(item);
      const node = el(`
        <div class="card draggable-card" data-idx="${idx}" draggable="true">
          <span class="order-chip">#${item.order ? Number(item.order) : (sortedIndex + 1)}</span>
          <div class="card__body">
            <div class="card__title">${item.question || ''}</div>
            <p class="card__text" style="margin: 10px 0; color: #666; line-height: 1.5;">${(item.answer || '').substring(0, 150)}${(item.answer || '').length > 150 ? '...' : ''}</p>
            <div class="card__actions">
              <button class="btn btn-outline" data-act="up" data-idx="${idx}" title="تحريك لأعلى"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="btn btn-outline" data-act="down" data-idx="${idx}" title="تحريك لأسفل"><i class="fa-solid fa-arrow-down"></i></button>
              <button class="btn btn-outline drag-handle" title="سحب لإعادة الترتيب"><i class="fa-solid fa-grip-vertical"></i></button>
              <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>`);
      faqList.appendChild(node);
    });
    setupListDnD(faqList, faq, KEYS.faq, 'faq', renderFaq);
  }

  function renderTodos() {
    if (!todosList) return;
    todosList.innerHTML = '';
    const sorted = [...todos].sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000));
    sorted.forEach((item, sortedIndex) => {
      const idx = todos.indexOf(item);
      const displayOrder = item.order ? Number(item.order) : (sortedIndex + 1);
      const status = (item.status || 'pending');
      const isDone = status === 'done';
      const due = (item.due || '').trim();
      const dueLabel = due ? (formatDateShortAr?.(due) || due) : null;
      const statusLabel = status === 'done' ? 'منجزة' : (status === 'in_progress' ? 'قيد التنفيذ' : 'قيد الانتظار');
      const node = el(`
        <div class="card draggable-card ${isDone ? 'todo-done' : ''}" data-idx="${idx}" draggable="true">
          <span class="order-chip">#${displayOrder}</span>
          <div class="card__body">
            <div class="card__title">${item.title || ''}</div>
            ${dueLabel ? `<div class="muted">موعد: ${dueLabel}</div>` : ''}
            ${item.notes ? `<p class="card__text" style="margin:6px 0;color:#64748b">${item.notes}</p>` : ''}
            <div class="card__actions" style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
              <span class="status-chip">${statusLabel}</span>
              <button class="btn btn-outline" data-act="toggle-done" data-idx="${idx}" title="تبديل الإنجاز"><i class="fa-solid fa-check"></i></button>
              <button class="btn btn-outline" data-act="up" data-idx="${idx}" title="تحريك لأعلى"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="btn btn-outline" data-act="down" data-idx="${idx}" title="تحريك لأسفل"><i class="fa-solid fa-arrow-down"></i></button>
              <button class="btn btn-outline drag-handle" title="سحب لإعادة الترتيب"><i class="fa-solid fa-grip-vertical"></i></button>
              <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>`);
      todosList.appendChild(node);
    });
    setupListDnD(todosList, todos, KEYS.todos, null, renderTodos);
  }

  // ===== To-Dos CRUD =====
  const todoDialog = document.getElementById('todoDialog');
  const todoForm = document.getElementById('todoForm');
  const addTodoBtn = document.getElementById('addTodoBtn');
  let todoEditingIndex = null;

  addTodoBtn?.addEventListener('click', () => {
    todoEditingIndex = null;
    try { todoForm?.reset(); } catch {}
    // defaults
    try { if (todoForm?.status) todoForm.status.value = 'pending'; } catch {}
    openDialog?.(todoDialog);
  });

  todosList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (!Number.isInteger(idx) || idx < 0 || idx >= todos.length) return;
    if (act === 'toggle-done') {
      const cur = todos[idx] || {};
      const curStatus = cur.status || 'pending';
      cur.status = (curStatus === 'done') ? 'pending' : 'done';
      save(KEYS.todos, todos);
      renderTodos();
      return;
    }
    if (act === 'up' || act === 'down') {
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(todos.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = todos.splice(idx, 1);
      todos.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(todos, KEYS.todos, null).then(() => {
        renderTodos();
      });
      return;
    }
    if (act === 'edit') {
      todoEditingIndex = idx;
      const cur = todos[idx];
      if (todoForm) {
        todoForm.title.value = cur.title || '';
        todoForm.notes.value = cur.notes || '';
        todoForm.due.value = cur.due ? String(cur.due).substring(0,10) : '';
        todoForm.status.value = cur.status || 'pending';
      }
      openDialog?.(todoDialog);
      return;
    }
    if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      todos.splice(idx, 1);
      save(KEYS.todos, todos);
      renderTodos();
      return;
    }
  });

  todoForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!todoForm) return;
    const data = {
      title: (todoForm.title.value || '').trim(),
      notes: (todoForm.notes.value || '').trim() || null,
      due: (todoForm.due.value || '').trim() || null,
      status: (todoForm.status.value || 'pending'),
      // Keep order when editing to avoid resetting drag order
      order: (todoEditingIndex !== null)
        ? (todos[todoEditingIndex]?.order ?? null)
        : null,
    };
    if (!data.title) { alert('الرجاء إدخال العنوان'); return; }
    if (todoEditingIndex === null) todos.unshift(data); else todos[todoEditingIndex] = data;
    save(KEYS.todos, todos);
    renderTodos();
    closeDialog?.(todoDialog);
  });

  // ===== Appointments (حجز المواعيد) =====
  let appointmentEditingIndex = null;

  function slotRowTemplate(slot, idx) {
    const date = slot?.date || '';
    const day = slot?.day || '';
    const start = slot?.start || slot?.time || '';
    const end = slot?.end || '';
    return `
      <div class="slot-row" data-idx="${idx}" style="display:grid; gap:8px; grid-template-columns: 1fr 1fr 1fr 1fr auto; align-items:end">
        <label>التاريخ<input type="date" name="slot_date_${idx}" value="${date}" /></label>
        <label>اليوم<input type="text" name="slot_day_${idx}" value="${day}" placeholder="مثال: الأحد" /></label>
        <label>بداية الوقت<input type="time" step="600" name="slot_start_${idx}" value="${start}" /></label>
        <label>نهاية الوقت<input type="time" step="600" name="slot_end_${idx}" value="${end}" /></label>
        <button type="button" class="btn btn-outline" data-act="del-slot" data-idx="${idx}"><i class="fa-solid fa-trash"></i></button>
      </div>`;
  }

  function rebuildSlotsEditor(slots) {
    if (!appointmentSlots) return;
    const list = Array.isArray(slots) ? slots : [];
    appointmentSlots.innerHTML = list.map((s, i) => slotRowTemplate(s, i)).join('');
  }

  async function loadAppointmentsAdmin() {
    try {
      if (sb) {
        const { data, error } = await sb
          .from('appointments')
          .select('*')
          .order('order', { ascending: true });
        if (error) throw error;
        appointments = (data || []).map(r => ({
          id: r.id,
          title: r.title || '',
          slots: Array.isArray(r.slots) ? r.slots : (r.slots ? r.slots : []),
          order: r.order ?? null,
          created_at: r.created_at || null,
        }));
        try { save(KEYS.appointments, appointments); } catch {}
        renderAppointments();
        try { populateBookingAppointmentSelect(); } catch {}
        return;
      }
    } catch (e) {
      console.warn('Failed to load appointments from Supabase', e);
    }
    // Fallback to local storage
    try { appointments = load(KEYS.appointments); } catch {}
    renderAppointments();
    try { populateBookingAppointmentSelect(); } catch {}
  }

  function renderAppointments() {
    if (!appointmentsList) return;
    appointmentsList.innerHTML = '';
    const sorted = [...appointments].sort((a,b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000));
    sorted.forEach((item, sortedIndex) => {
      const idx = appointments.indexOf(item);
      const displayOrder = item.order ? Number(item.order) : (sortedIndex + 1);
      const title = item.title || '';
      const slots = Array.isArray(item.slots) ? item.slots : [];
      const slotsLabel = slots.length ? `${slots.length} موعد` : 'بدون أوقات';
      const node = el(`
        <div class="card draggable-card" data-idx="${idx}" draggable="true">
          <span class="order-chip">#${displayOrder}</span>
          <div class="card__body">
            <div class="card__title">${title}</div>
            <div class="muted">${slotsLabel}</div>
            <div class="card__actions" style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
              <a class="btn btn-outline" data-act="open" data-idx="${idx}" title="فتح صفحة الحجز" href="../appointments/appointments.html?id=${item.id}" target="_blank"><i class="fa-solid fa-link"></i> صفحة الحجز</a>
              <button class="btn btn-outline" data-act="up" data-idx="${idx}" title="تحريك لأعلى"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="btn btn-outline" data-act="down" data-idx="${idx}" title="تحريك لأسفل"><i class="fa-solid fa-arrow-down"></i></button>
              <button class="btn btn-outline drag-handle" title="سحب لإعادة الترتيب"><i class="fa-solid fa-grip-vertical"></i></button>
              <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>`);
      appointmentsList.appendChild(node);
    });
    setupListDnD(appointmentsList, appointments, KEYS.appointments, 'appointments', renderAppointments);
  }

  let currentBookingsList = [];

  function findAppointmentById(id) {
    try { return (appointments || []).find(a => a && a.id === id) || null; } catch { return null; }
  }

  function populateBookingAppointmentSelect() {
    if (!bookingAppointmentSelect) return;
    const prev = bookingAppointmentSelect.value || 'all';
    const opts = [{ value: 'all', label: 'جميع المواعيد' }];
    (appointments || []).forEach(a => { if (a && a.id) opts.push({ value: a.id, label: a.title || a.id }); });
    bookingAppointmentSelect.innerHTML = '';
    opts.forEach(o => {
      const op = document.createElement('option');
      op.value = o.value;
      op.textContent = o.label;
      bookingAppointmentSelect.appendChild(op);
    });
    try { bookingAppointmentSelect.value = opts.some(o => o.value === prev) ? prev : 'all'; } catch {}
  }

  function buildBookingDisplay(row) {
    const appt = findAppointmentById(row.appointment_id);
    const slot = (appt && Array.isArray(appt.slots)) ? appt.slots[Number(row.slot_index) || 0] : null;
    const day = (slot && slot.day) ? slot.day : '';
    const date = (slot && slot.date) ? slot.date : '';
    const apptTitle = appt ? (appt.title || appt.id || '—') : (row.appointment_id || '—');
    const statusRaw = (row.status || row.state || '').toString().trim().toLowerCase();
    const completed = !!(row.is_completed || row.completed || row.completed_at || ['done','completed','complete','finished','تم'].includes(statusRaw));
    return {
      id: row.id,
      name: row.name || '—',
      phone: row.phone || '—',
      dayDate: [day, date].filter(Boolean).join(' '),
      time: `${row.time_start || ''}${row.time_end ? ' - ' + row.time_end : ''}`,
      apptTitle,
      createdLabel: typeof formatDateTimeReadable === 'function' ? formatDateTimeReadable(row.created_at) : (row.created_at || '—'),
      appointment_id: row.appointment_id,
      completed,
    };
  }

  function bookingSortValue(row) {
    try {
      const appt = findAppointmentById(row.appointment_id);
      const slot = (appt && Array.isArray(appt.slots)) ? appt.slots[Number(row.slot_index) || 0] : null;
      const d = (slot && slot.date) ? String(slot.date) : null;
      const t = (row && row.time_start) ? String(row.time_start).padStart(5, '0') : '00:00';
      if (d) {
        const iso = `${d}T${t}`;
        const ts = Date.parse(iso);
        if (!Number.isNaN(ts)) return ts;
      }
    } catch {}
    try {
      const ts2 = Date.parse(row.created_at || '');
      if (!Number.isNaN(ts2)) return ts2;
    } catch {}
    return Number.MAX_SAFE_INTEGER;
  }

  function renderBookings() {
    if (!bookingsCards) return;
    const sel = bookingAppointmentSelect ? (bookingAppointmentSelect.value || 'all') : 'all';
    const list = Array.isArray(currentBookingsList) ? currentBookingsList : [];
    const filtered = list.filter(r => !sel || sel === 'all' || String(r.appointment_id) === String(sel));
    if (!filtered.length) {
      bookingsCards.innerHTML = '';
      if (bookingsEmpty) bookingsEmpty.style.display = '';
      return;
    }
    if (bookingsEmpty) bookingsEmpty.style.display = 'none';
    bookingsCards.innerHTML = '';
    const sorted = filtered.slice().sort((a, b) => bookingSortValue(a) - bookingSortValue(b));
    sorted.forEach(r => {
      const d = buildBookingDisplay(r);
      const completedStyle = d.completed ? 'opacity:.7; background:#f0fdf4; border-color:#10b981' : '';
      const titleStyle = d.completed ? 'text-decoration:line-through' : '';
      const btnLabel = d.completed ? 'إلغاء الشطب' : 'تم';
      const btnIcon = d.completed ? 'fa-rotate-left' : 'fa-check';
      const btnVariant = d.completed ? 'btn-outline' : 'btn-primary';
      const node = el(`
        <div class="card" data-id="${r.id || ''}" style="${completedStyle}">
          <div class="card__body">
            <div class="card__title" style="${titleStyle}">الاسم: ${d.name}</div>
            <div class="muted">رقم الجوال: ${d.phone || '—'}</div>
            <div class="muted">نوع الموعد: ${d.apptTitle || '—'}</div>
            <div class="muted">اليوم التاريخ: ${d.dayDate || '—'}</div>
            <div class="muted">الوقت: ${d.time || '—'}</div>
            <div class="muted">انشئ: ${d.createdLabel || '—'}</div>
            <div class="card__actions" style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
              <button type="button" class="btn ${btnVariant} btn-xs" data-act="toggle-done-booking" data-id="${r.id || ''}" data-done="${d.completed ? '1':'0'}"><i class="fa-solid ${btnIcon}"></i> ${btnLabel}</button>
              <button type="button" class="btn btn-outline btn-xs" data-act="del-booking" data-id="${r.id || ''}"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>`);
      bookingsCards.appendChild(node);
    });
  }

  async function loadAppointmentBookingsAdmin() {
    if (sb) {
      try {
        const { data, error } = await sb
          .from('appointment_bookings')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.warn('Failed to load appointment_bookings from Supabase', e);
      }
    }
    try {
      const map = (appointmentBookings && typeof appointmentBookings === 'object' && !Array.isArray(appointmentBookings)) ? appointmentBookings : {};
      const list = [];
      Object.keys(map).forEach(k => {
        const arr = Array.isArray(map[k]) ? map[k] : [];
        arr.forEach(row => list.push(row));
      });
      list.sort((a, b) => {
        try { return (new Date(b.created_at)) - (new Date(a.created_at)); } catch { return 0; }
      });
      return list;
    } catch { return []; }
  }

  async function refreshBookingsPanel() {
    if (!bookingsPanel) return;
    try { currentBookingsList = await loadAppointmentBookingsAdmin(); } catch { currentBookingsList = []; }
    try { populateBookingAppointmentSelect(); } catch {}
    renderBookings();
  }

  async function deleteBookingById(id) {
    if (!id) return false;
    if (sb) {
      try {
        const { error } = await sb.from('appointment_bookings').delete().eq('id', id);
        if (error) throw error;
        return true;
      } catch (e) {
        alert('فشل حذف الحجز: ' + (e?.message || 'غير معروف'));
        return false;
      }
    }
    try {
      let changed = false;
      const map = (appointmentBookings && typeof appointmentBookings === 'object' && !Array.isArray(appointmentBookings)) ? appointmentBookings : {};
      Object.keys(map).forEach(k => {
        const arr = Array.isArray(map[k]) ? map[k] : [];
        const next = arr.filter(row => String(row.id || '') !== String(id));
        if (next.length !== arr.length) { map[k] = next; changed = true; }
      });
      if (changed) {
        appointmentBookings = map;
        save(KEYS.appointment_bookings, appointmentBookings);
      }
      return changed;
    } catch { return false; }
  }

  function bookingsCsvEscape(val) {
    try { return membershipCsvEscape ? membershipCsvEscape(val) : String(val ?? ''); } catch { return String(val ?? ''); }
  }

  function performBookingsExport() {
    const sel = bookingAppointmentSelect ? (bookingAppointmentSelect.value || 'all') : 'all';
    const list = Array.isArray(currentBookingsList) ? currentBookingsList : [];
    const filtered = list.filter(r => !sel || sel === 'all' || String(r.appointment_id) === String(sel));
    if (!filtered.length) return;
    const rows = filtered.slice().sort((a, b) => bookingSortValue(a) - bookingSortValue(b)).map(r => {
      const d = buildBookingDisplay(r);
      return {
        name: d.name,
        phone: d.phone,
        appointment: d.apptTitle,
        day_date: d.dayDate,
        time_start: r.time_start || '',
        time_end: r.time_end || '',
        created_at: r.created_at || '',
        status: d.completed ? 'مكتمل' : 'قيد الانتظار',
      };
    });
    const headers = [
      { key: 'name', label: 'الاسم' },
      { key: 'phone', label: 'الجوال' },
      { key: 'appointment', label: 'الموعد' },
      { key: 'day_date', label: 'اليوم/التاريخ' },
      { key: 'time_start', label: 'من' },
      { key: 'time_end', label: 'إلى' },
      { key: 'created_at', label: 'تاريخ الإنشاء' },
      { key: 'status', label: 'الحالة' },
    ];
    const header = headers.map(h => bookingsCsvEscape(h.label)).join(',');
    const body = rows.map(row => headers.map(h => bookingsCsvEscape(row[h.key])).join(',')).join('\r\n');
    const csv = '\uFEFF' + header + '\r\n' + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const name = `appointment_bookings_${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.csv`;
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }

  bookingAppointmentSelect?.addEventListener('change', () => { try { renderBookings(); } catch {} });
  bookingsRefreshBtn?.addEventListener('click', (e) => { e.preventDefault(); try { refreshBookingsPanel(); } catch {} });
  bookingsExportBtn?.addEventListener('click', (e) => { e.preventDefault(); try { performBookingsExport(); } catch {} });
  bookingsCards?.addEventListener('click', async (e) => {
    const btnDel = e.target.closest('button[data-act="del-booking"]');
    const btnToggle = e.target.closest('button[data-act="toggle-done-booking"]');
    if (btnDel) {
      const id = btnDel.getAttribute('data-id');
      if (!id) return;
      if (!confirm('تأكيد حذف الحجز؟')) return;
      const ok = await deleteBookingById(id);
      if (ok) try { await refreshBookingsPanel(); } catch {}
      return;
    }
    if (btnToggle) {
      const id = btnToggle.getAttribute('data-id');
      const done = btnToggle.getAttribute('data-done') === '1' ? false : true; // toggle
      if (!id) return;
      const ok = await markBookingCompleted(id, done);
      if (ok) try { await refreshBookingsPanel(); } catch {}
      return;
    }
  });

  addAppointmentBtn?.addEventListener('click', () => {
    appointmentEditingIndex = null;
    try { appointmentForm?.reset(); } catch {}
    rebuildSlotsEditor([]);
    openDialog?.(appointmentDialog);
  });

  appointmentSlots?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act="del-slot"]');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const rows = Array.from(appointmentSlots.querySelectorAll('.slot-row'));
    if (idx >= 0 && idx < rows.length) {
      rows[idx].remove();
      // reindex
      const cur = Array.from(appointmentSlots.querySelectorAll('.slot-row'));
      cur.forEach((row, i) => { row.dataset.idx = String(i); });
    }
  });

  addSlotBtn?.addEventListener('click', () => {
    const count = appointmentSlots ? appointmentSlots.querySelectorAll('.slot-row').length : 0;
    const div = document.createElement('div');
    div.innerHTML = slotRowTemplate({ date: '', day: '', start: '', end: '' }, count);
    const row = div.firstElementChild;
    if (appointmentSlots && row) appointmentSlots.appendChild(row);
  });

  appointmentSlots?.addEventListener('change', (e) => {
    const t = e.target;
    if (!t || !t.name) return;
    const m = String(t.name).match(/^slot_date_(\d+)$/);
    if (!m) return;
    const idx = Number(m[1]);
    const val = t.value || '';
    if (!val) return;
    let dayName = '';
    try {
      const d = new Date(val + 'T00:00:00');
      const days = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
      dayName = days[d.getDay()] || '';
    } catch {}
    const dayInput = appointmentSlots.querySelector(`input[name="slot_day_${idx}"]`);
    if (dayInput && dayName) dayInput.value = dayName;
  });

  appointmentsList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (!Number.isInteger(idx) || idx < 0 || idx >= appointments.length) return;
    if (act === 'up' || act === 'down') {
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(appointments.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = appointments.splice(idx, 1);
      appointments.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(appointments, KEYS.appointments, null).then(() => {
        renderAppointments();
      });
      return;
    }
    if (act === 'edit') {
      appointmentEditingIndex = idx;
      const cur = appointments[idx];
      if (appointmentForm) {
        appointmentForm.title.value = cur.title || '';
        const src = Array.isArray(cur.slots) ? cur.slots : [];
        const norm = src.map(s => ({ date: s?.date || '', day: s?.day || '', start: s?.start || s?.time || '', end: s?.end || '' }));
        rebuildSlotsEditor(norm);
      }
      openDialog?.(appointmentDialog);
      return;
    }
    if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = appointments[idx];
      if (sb && cur?.id) {
        try {
          const { error } = await sb.from('appointments').delete().eq('id', cur.id);
          if (error) throw error;
        } catch (err) {
          alert('فشل الحذف: ' + (err?.message || 'غير معروف'));
          return;
        }
      }
      appointments.splice(idx, 1);
      save(KEYS.appointments, appointments);
      renderAppointments();
      return;
    }
  });

  appointmentForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!appointmentForm) return;
    const title = (appointmentForm.title.value || '').trim();
    if (!title) { alert('الرجاء إدخال العنوان'); return; }
    // Collect slots from editor
    const rows = Array.from(appointmentSlots?.querySelectorAll('.slot-row') || []);
    const slots = rows.map((row, i) => {
      const date = row.querySelector(`input[name="slot_date_${i}"]`)?.value?.trim() || '';
      const day = row.querySelector(`input[name="slot_day_${i}"]`)?.value?.trim() || '';
      const start = row.querySelector(`input[name="slot_start_${i}"]`)?.value?.trim() || '';
      const end = row.querySelector(`input[name="slot_end_${i}"]`)?.value?.trim() || '';
      return { date, day, start, end };
    }).filter(s => s.date && s.start && s.end && s.start < s.end);
    const payload = {
      id: appointmentEditingIndex === null ? genId() : (appointments[appointmentEditingIndex]?.id || genId()),
      title,
      slots,
      order: (appointmentEditingIndex !== null) ? (appointments[appointmentEditingIndex]?.order ?? null) : null,
      created_at: (appointmentEditingIndex !== null) ? (appointments[appointmentEditingIndex]?.created_at || null) : new Date().toISOString(),
    };
    if (sb) {
      try {
        if (appointmentEditingIndex === null) {
          const payloadNoOrder = { id: payload.id, title: payload.title, slots: payload.slots, created_at: payload.created_at };
          let row, error;
          ({ data: row, error } = await sb.from('appointments').insert(payload).select('*').single());
          if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
            const res2 = await sb.from('appointments').insert(payloadNoOrder).select('*').single();
            if (res2.error) throw res2.error;
            appointments.unshift({ ...res2.data, order: payload.order });
          } else if (error) {
            throw error;
          } else {
            appointments.unshift(row);
          }
          // Normalize order after inserting at top
          await normalizeAndPersistOrder(appointments, KEYS.appointments, 'appointments');
        } else {
          const id = appointments[appointmentEditingIndex]?.id;
          if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
          const payloadNoOrder = { title: payload.title, slots: payload.slots };
          let row, error;
          ({ data: row, error } = await sb.from('appointments').update(payload).eq('id', id).select('*').single());
          if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
            const res2 = await sb.from('appointments').update(payloadNoOrder).eq('id', id).select('*').single();
            if (res2.error) throw res2.error;
            appointments[appointmentEditingIndex] = { ...res2.data, order: payload.order };
          } else if (error) {
            throw error;
          } else {
            appointments[appointmentEditingIndex] = row;
          }
        }
        save(KEYS.appointments, appointments);
        renderAppointments();
        closeDialog?.(appointmentDialog);
        return;
      } catch (err) {
        alert('فشل الحفظ: ' + (err?.message || 'غير معروف'));
        return;
      }
    }
    // Fallback to local storage
    if (appointmentEditingIndex === null) appointments.unshift(payload); else appointments[appointmentEditingIndex] = payload;
    save(KEYS.appointments, appointments);
    renderAppointments();
    closeDialog?.(appointmentDialog);
  });

  // Dialog helpers
  function openDialog(dialog) {
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    // prevent background scroll while any dialog is open
    document.body.classList.add('no-scroll');
    // التمرير إلى أعلى النموذج
    const dialogBody = dialog.querySelector('.dialog-body');
    if (dialogBody) {
      dialogBody.scrollTop = 0;
    }
  }
  function closeDialog(dialog) {
    if (!dialog) return;
    if (dialog.open) dialog.close();
    // remove no-scroll only if no other dialogs are still open
    const anyOpen = Array.from(document.querySelectorAll('.admin-dialog')).some(d => d.open);
    if (!anyOpen) document.body.classList.remove('no-scroll');
  }

  // Ensure no-scroll is removed when dialogs are closed directly (e.g., via inline close buttons)
  Array.from(document.querySelectorAll('.admin-dialog')).forEach(dlg => {
    dlg.addEventListener('close', () => {
      const anyOpen = Array.from(document.querySelectorAll('.admin-dialog')).some(d => d.open);
      if (!anyOpen) document.body.classList.remove('no-scroll');
    });
  });

  // Works CRUD
  const workDialog = $('#workDialog');
  const workForm = $('#workForm');
  let workEditingIndex = null; // number | null
  // Works image upload elements
  const workImageFile = document.getElementById('work_image_file');
  const workImageUrl = document.getElementById('work_image_url');
  const workImagePreview = document.getElementById('work_image_preview');
  const workDropzone = document.getElementById('workDropzone');
  const workBrowseBtn = document.getElementById('workBrowseBtn');
  const workImageHelp = document.getElementById('work_image_help');
  const workImageActions = document.getElementById('workImageActions');
  const workEditImageBtn = document.getElementById('work_edit_image_btn');
  const workChangeImageBtn = document.getElementById('work_change_image_btn');
  let workCroppedFile = null; // File | null

  // Reusable: handle a selected/dropped file -> crop -> preview
  async function handleWorkImageFile(file) {
    if (!file) return;
    // Basic validation (type + size hint ~5MB)
    if (!(file.type || '').startsWith('image/')) {
      alert('الملف ليس صورة');
      return;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      if (!confirm('حجم الصورة يتجاوز 5MB. هل تريد المتابعة على أي حال؟')) return;
    }
    try {
      const cropped = await openImageCropper(file, { aspectRatio: 16/9, lockAspect: true, maxWidth: 1600, maxHeight: 1600, mimeType: 'image/webp', quality: 0.9 });
      workCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (workImagePreview) {
        workImagePreview.src = url;
        workImagePreview.style.display = 'block';
      }
      // When a new file is chosen, prefer showing actions instead of dropzone (useful during edit)
      if (workImageActions) workImageActions.style.display = 'flex';
      if (workDropzone) workDropzone.style.display = 'none';
      if (workImageHelp) workImageHelp.style.display = 'none';
    } catch (err) {
      // if cancelled, clear selection
      if (workImageFile) workImageFile.value = '';
    }
  }

  // Utility: fetch an image URL and return a File for cropping
  async function fetchUrlAsFile(url, filenameBase = 'image') {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    const ext = getExtFromType(blob.type || 'image/jpeg', 'jpg');
    return new File([blob], `${filenameBase}.${ext}`, { type: blob.type || 'image/jpeg' });
  }

  // Input change -> handle
  workImageFile?.addEventListener('change', async () => {
    const file = workImageFile.files && workImageFile.files[0];
    await handleWorkImageFile(file);
  });

  // Dropzone interactions (click, keyboard, drag & drop)
  // Explicit browse click (span with id=workBrowseBtn)
  workBrowseBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    workImageFile?.click();
  });
  // Clicking the dropzone itself
  workDropzone?.addEventListener('click', (e) => {
    // Prevent implicit label->file input activation to avoid double dialogs
    e.preventDefault();
    e.stopPropagation();
    // If clicking the inner browse span, the handler above already runs, so no need here
    if ((e.target instanceof HTMLElement) && e.target.closest('#workBrowseBtn')) return;
    workImageFile?.click();
  });
  workDropzone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      workImageFile?.click();
    }
  });
  workDropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    workDropzone.classList.add('dragover');
  });
  workDropzone?.addEventListener('dragleave', () => {
    workDropzone.classList.remove('dragover');
  });
  workDropzone?.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    workDropzone.classList.remove('dragover');
    const dt = e.dataTransfer;
    if (!dt) return;
    let file = null;
    if (dt.files && dt.files.length) file = dt.files[0];
    if (!file && dt.items && dt.items.length) {
      const item = Array.from(dt.items).find(i => i.kind === 'file');
      if (item) file = item.getAsFile();
    }
    await handleWorkImageFile(file);
  });

  // Image actions in edit mode
  workChangeImageBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    workImageFile?.click();
  });

  workEditImageBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const src = (workImagePreview && workImagePreview.src) || (workImageUrl && workImageUrl.value) || '';
      if (!src) { alert('لا توجد صورة لتحريرها'); return; }
      const file = await fetchUrlAsFile(src, 'current');
      const cropped = await openImageCropper(file, { aspectRatio: 16/9, lockAspect: true, maxWidth: 1600, maxHeight: 1600, mimeType: 'image/webp', quality: 0.9 });
      workCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (workImagePreview) { workImagePreview.src = url; workImagePreview.style.display = 'block'; }
      if (workImageActions) workImageActions.style.display = 'flex';
      if (workDropzone) workDropzone.style.display = 'none';
      if (workImageHelp) workImageHelp.style.display = 'none';
    } catch (err) {
      if (String(err?.message || '').includes('crop-cancelled')) return; // ignore cancel
      alert('تعذر تحرير الصورة الحالية. جرّب تغيير الصورة بدلًا من ذلك.');
    }
  });

  // Helper: upload selected Works image file to Supabase Storage and return public URL
  async function uploadSelectedWorkImage() {
    const file = workCroppedFile || (workImageFile?.files && workImageFile.files[0]);
    if (!file) return null; // nothing to upload
    if (!sb) return null; // cannot upload without Supabase
    const bucket = 'adeeb-site'; // dedicated site bucket
    const ext = (file.name.split('.').pop() || getExtFromType(file.type, 'jpg')).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `works/work-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`; // store under works/
    const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر الحصول على رابط الصورة');
    return publicUrl;
  }

  $('#addWorkBtn')?.addEventListener('click', () => {
    workEditingIndex = null;
    workForm.reset();
    // clear preview and hidden url when adding
    if (workImagePreview) { workImagePreview.src = ''; workImagePreview.style.display = 'none'; }
    if (workImageUrl) workImageUrl.value = '';
    workCroppedFile = null;
    // Show dropzone in add mode, hide actions
    if (workDropzone) workDropzone.style.display = '';
    if (workImageActions) workImageActions.style.display = 'none';
    if (workImageHelp) workImageHelp.style.display = '';
    openDialog(workDialog);
  });

  worksList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'up' || act === 'down') {
      if (!Number.isInteger(idx) || idx < 0 || idx >= works.length) return;
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(works.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = works.splice(idx, 1);
      works.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(works, KEYS.works, 'works').then(() => {
        renderWorks();
      });
      return;
    }
    if (act === 'edit') {
      workEditingIndex = idx;
      const cur = works[idx];
      workForm.title.value = cur.title || '';
      workForm.category.value = cur.category || '';
      if (workForm.order) workForm.order.value = cur.order || '';
      // fill hidden url and preview instead of URL input
      const imgUrl = (cur.image || cur.image_url) || '';
      if (workImageUrl) workImageUrl.value = imgUrl;
      if (workImagePreview) {
        if (imgUrl) { workImagePreview.src = imgUrl; workImagePreview.style.display = 'block'; }
        else { workImagePreview.src = ''; workImagePreview.style.display = 'none'; }
      }
      // clear any selected file
      if (workImageFile) workImageFile.value = '';
      workCroppedFile = null;
      workForm.link.value = (cur.link || cur.link_url) || '';
      // In edit mode: if we have an image, hide dropzone and show actions; otherwise, show dropzone
      if (imgUrl) {
        if (workDropzone) workDropzone.style.display = 'none';
        if (workImageActions) workImageActions.style.display = 'flex';
        if (workImageHelp) workImageHelp.style.display = 'none';
      } else {
        if (workDropzone) workDropzone.style.display = '';
        if (workImageActions) workImageActions.style.display = 'none';
        if (workImageHelp) workImageHelp.style.display = '';
      }
      openDialog(workDialog);
    } else if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = works[idx];
      if (sb && cur.id) {
        sb.from('works').delete().eq('id', cur.id).then(({ error }) => {
          if (error) return alert('فشل الحذف: ' + error.message);
          works.splice(idx, 1);
          renderWorks();
        });
      } else {
        works.splice(idx, 1);
        save(KEYS.works, works);
        renderWorks();
      }
    }
  });

  workForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Determine final image URL: upload if a new file is selected, else use hidden value
    let finalImageUrl = (workImageUrl?.value || '').trim();
    try {
      const uploaded = await uploadSelectedWorkImage();
      if (uploaded) finalImageUrl = uploaded;
    } catch (upErr) {
      return alert('فشل رفع الصورة: ' + (upErr?.message || 'غير معروف'));
    }
    workCroppedFile = null;
    // Determine order to keep when editing: if item has no order, compute from current sorted position
    let orderToKeep = null;
    if (workEditingIndex !== null) {
      const existingOrder = works[workEditingIndex]?.order ?? null;
      if (existingOrder === null || existingOrder === undefined) {
        const sortedForOrder = [...works].sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000));
        const curItem = works[workEditingIndex];
        const pos = sortedForOrder.indexOf(curItem);
        orderToKeep = pos >= 0 ? (pos + 1) : null;
      } else {
        orderToKeep = existingOrder;
      }
    }
    const data = {
      title: workForm.title.value.trim(),
      category: workForm.category.value.trim(),
      image: finalImageUrl,
      link: workForm.link.value.trim(),
      order: orderToKeep,
    };
    if (sb) {
      // require auth for write
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
      const payload = { title: data.title, category: data.category || null, image_url: data.image || null, link_url: data.link || null, order: data.order };
      const payloadNoOrder = { title: data.title, category: data.category || null, image_url: data.image || null, link_url: data.link || null };
      if (workEditingIndex === null) {
        let row, error;
        ({ data: row, error } = await sb.from('works').insert(payload).select('*').single());
        if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res2 = await sb.from('works').insert(payloadNoOrder).select('*').single();
          if (res2.error) return alert('فشل الحفظ: ' + res2.error.message);
          works.unshift({ ...res2.data, order: data.order });
        } else if (error) {
          return alert('فشل الحفظ: ' + error.message);
        } else {
          works.unshift(row);
        }
        renderWorks();
        closeDialog(workDialog);
      } else {
        const id = works[workEditingIndex]?.id;
        if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
        let row, error;
        ({ data: row, error } = await sb.from('works').update(payload).eq('id', id).select('*').single());
        if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res2 = await sb.from('works').update(payloadNoOrder).eq('id', id).select('*').single();
          if (res2.error) return alert('فشل التحديث: ' + res2.error.message);
          works[workEditingIndex] = { ...res2.data, order: data.order };
        } else if (error) {
          return alert('فشل التحديث: ' + error.message);
        } else {
          works[workEditingIndex] = row;
        }
        renderWorks();
        closeDialog(workDialog);
      }
    } else {
      if (workEditingIndex === null) {
        works.unshift(data);
      } else {
        works[workEditingIndex] = data;
      }
      save(KEYS.works, works);
      renderWorks();
      closeDialog(workDialog);
    }
  });

  // Sponsors CRUD
  const sponsorDialog = $('#sponsorDialog');
  const sponsorForm = $('#sponsorForm');
  let sponsorEditingIndex = null;
  // Sponsor logo upload elements
  const sponsorLogoFile = document.getElementById('sponsor_logo_file');
  const sponsorLogoUrl = document.getElementById('sponsor_logo_url');
  const sponsorLogoPreview = document.getElementById('sponsor_logo_preview');
  const sponsorDropzone = document.getElementById('sponsorDropzone');
  const sponsorBrowseBtn = document.getElementById('sponsorBrowseBtn');
  const sponsorImageActions = document.getElementById('sponsorImageActions');
  const sponsorEditLogoBtn = document.getElementById('sponsor_edit_logo_btn');
  const sponsorChangeLogoBtn = document.getElementById('sponsor_change_logo_btn');
  let sponsorCroppedFile = null;

  // Reusable: handle sponsor logo file (crop 1:1) -> preview
  async function handleSponsorLogoFile(file) {
    if (!file) return;
    if (!(file.type || '').startsWith('image/')) { alert('الملف ليس صورة'); return; }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) { if (!confirm('حجم الشعار يتجاوز 5MB. المتابعة؟')) return; }
    try {
      const preferPng = /png/i.test(file.type || '') || /\.(png)$/i.test(file.name || '');
      const cropped = await openImageCropper(file, { aspectRatio: 1, lockAspect: true, maxWidth: 800, maxHeight: 800, mimeType: preferPng ? 'image/png' : 'image/webp', quality: preferPng ? 1.0 : 0.9 });
      sponsorCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (sponsorLogoPreview) { sponsorLogoPreview.src = url; sponsorLogoPreview.style.display = 'block'; }
      // Toggle UI like Works: show actions, hide dropzone
      if (sponsorImageActions) sponsorImageActions.style.display = 'flex';
      if (sponsorDropzone) sponsorDropzone.style.display = 'none';
    } catch (err) {
      if (sponsorLogoFile) sponsorLogoFile.value = '';
    }
  }
  // Input change -> handle
  sponsorLogoFile?.addEventListener('change', async () => {
    const file = sponsorLogoFile.files && sponsorLogoFile.files[0];
    await handleSponsorLogoFile(file);
  });

  // Dropzone interactions for sponsor
  sponsorBrowseBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); sponsorLogoFile?.click(); });
  sponsorDropzone?.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    if ((e.target instanceof HTMLElement) && e.target.closest('#sponsorBrowseBtn')) return;
    sponsorLogoFile?.click();
  });
  sponsorDropzone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sponsorLogoFile?.click(); }
  });
  sponsorDropzone?.addEventListener('dragover', (e) => { e.preventDefault(); sponsorDropzone.classList.add('dragover'); });
  sponsorDropzone?.addEventListener('dragleave', () => { sponsorDropzone.classList.remove('dragover'); });
  sponsorDropzone?.addEventListener('drop', async (e) => {
    e.preventDefault(); e.stopPropagation(); sponsorDropzone.classList.remove('dragover');
    const dt = e.dataTransfer; if (!dt) return;
    let file = null;
    if (dt.files && dt.files.length) file = dt.files[0];
    if (!file && dt.items && dt.items.length) { const item = Array.from(dt.items).find(i => i.kind === 'file'); if (item) file = item.getAsFile(); }
    await handleSponsorLogoFile(file);
  });

  // Sponsor image actions
  sponsorChangeLogoBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    sponsorLogoFile?.click();
  });

  sponsorEditLogoBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const src = (sponsorLogoPreview && sponsorLogoPreview.src) || (sponsorLogoUrl && sponsorLogoUrl.value) || '';
      if (!src) { alert('لا يوجد شعار لتحريره'); return; }
      const file = await fetchUrlAsFile(src, 'current-logo');
      const preferPng = /png/i.test(file.type || '') || /\.(png)$/i.test(file.name || '');
      const cropped = await openImageCropper(file, { aspectRatio: 1, lockAspect: true, maxWidth: 800, maxHeight: 800, mimeType: preferPng ? 'image/png' : 'image/webp', quality: preferPng ? 1.0 : 0.9 });
      sponsorCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (sponsorLogoPreview) { sponsorLogoPreview.src = url; sponsorLogoPreview.style.display = 'block'; }
      if (sponsorImageActions) sponsorImageActions.style.display = 'flex';
      if (sponsorDropzone) sponsorDropzone.style.display = 'none';
    } catch (err) {
      if (String(err?.message || '').includes('crop-cancelled')) return;
      alert('تعذر تحرير الشعار الحالي. جرّب تغيير الشعار بدلًا من ذلك.');
    }
  });

  // Upload sponsor logo to Supabase Storage
  async function uploadSponsorLogo() {
    const file = sponsorCroppedFile || (sponsorLogoFile?.files && sponsorLogoFile.files[0]);
    if (!file) return null;
    if (!sb) return null;
    const bucket = 'adeeb-site';
    const ext = (file.name.split('.').pop() || getExtFromType(file.type, 'png')).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'png';
    const path = `sponsors/sponsor-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
    const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر الحصول على رابط الشعار');
    return publicUrl;
  }

  $('#addSponsorBtn')?.addEventListener('click', () => {
    sponsorEditingIndex = null;
    sponsorForm.reset();
    if (sponsorLogoPreview) { sponsorLogoPreview.src = ''; sponsorLogoPreview.style.display = 'none'; }
    if (sponsorLogoUrl) sponsorLogoUrl.value = '';
    sponsorCroppedFile = null;
    // Show dropzone in add mode, hide actions
    if (sponsorDropzone) sponsorDropzone.style.display = '';
    if (sponsorImageActions) sponsorImageActions.style.display = 'none';
    openDialog(sponsorDialog);
  });

  sponsorsList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'up' || act === 'down') {
      if (!Number.isInteger(idx) || idx < 0 || idx >= sponsors.length) return;
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(sponsors.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = sponsors.splice(idx, 1);
      sponsors.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(sponsors, KEYS.sponsors, 'sponsors').then(() => {
        renderSponsors();
      });
      return;
    }
    if (act === 'edit') {
      sponsorEditingIndex = idx;
      const cur = sponsors[idx];
      sponsorForm.name.value = cur.name || '';
      sponsorForm.badge.value = cur.badge || '';
      sponsorForm.description.value = cur.description || '';
      if (sponsorForm.order) sponsorForm.order.value = cur.order || '';
      const logoUrl = (cur.logo || cur.logo_url) || '';
      if (sponsorLogoUrl) sponsorLogoUrl.value = logoUrl;
      if (sponsorLogoPreview) {
        if (logoUrl) { sponsorLogoPreview.src = logoUrl; sponsorLogoPreview.style.display = 'block'; }
        else { sponsorLogoPreview.src = ''; sponsorLogoPreview.style.display = 'none'; }
      }
      if (sponsorLogoFile) sponsorLogoFile.value = '';
      sponsorCroppedFile = null;
      sponsorForm.link.value = (cur.link || cur.link_url) || '';
      // Toggle actions/dropzone depending on existing image
      if (logoUrl) {
        if (sponsorDropzone) sponsorDropzone.style.display = 'none';
        if (sponsorImageActions) sponsorImageActions.style.display = 'flex';
      } else {
        if (sponsorDropzone) sponsorDropzone.style.display = '';
        if (sponsorImageActions) sponsorImageActions.style.display = 'none';
      }
      openDialog(sponsorDialog);
    } else if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = sponsors[idx];
      if (sb && cur.id) {
        sb.from('sponsors').delete().eq('id', cur.id).then(({ error }) => {
          if (error) return alert('فشل الحذف: ' + error.message);
          sponsors.splice(idx, 1);
          renderSponsors();
        });
      } else {
        sponsors.splice(idx, 1);
        save(KEYS.sponsors, sponsors);
        renderSponsors();
      }
    }
  });

  sponsorForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // determine final logo url
    let finalLogoUrl = (sponsorLogoUrl?.value || '').trim();
    try {
      const uploaded = await uploadSponsorLogo();
      if (uploaded) finalLogoUrl = uploaded;
    } catch (err) {
      return alert('فشل رفع الشعار: ' + (err?.message || 'غير معروف'));
    }
    sponsorCroppedFile = null;
    const data = {
      name: sponsorForm.name.value.trim(),
      badge: sponsorForm.badge.value.trim(),
      description: sponsorForm.description.value.trim(),
      logo: finalLogoUrl,
      link: sponsorForm.link.value.trim(),
      // Keep existing order when editing so we don't reset it to null
      order: (sponsorEditingIndex !== null)
        ? (sponsors[sponsorEditingIndex]?.order ?? null)
        : null,
    };
    if (sb) {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
      const payload = { name: data.name, badge: data.badge || null, description: data.description || null, logo_url: data.logo || null, link_url: data.link || null, order: data.order };
      const payloadNoDesc = { name: data.name, badge: data.badge || null, logo_url: data.logo || null, link_url: data.link || null, order: data.order };
      const payloadNoDescNoOrder = { name: data.name, badge: data.badge || null, logo_url: data.logo || null, link_url: data.link || null };
      if (sponsorEditingIndex === null) {
        let row, error;
        ({ data: row, error } = await sb.from('sponsors').insert(payload).select('*').single());
        if (error && /(column\s+description|invalid input|unknown column)/i.test(error.message || '')) {
          const res2 = await sb.from('sponsors').insert(payloadNoDesc).select('*').single();
          if (res2.error) return alert('فشل الحفظ: ' + res2.error.message);
          sponsors.unshift({ ...res2.data, description: data.description || '' });
        } else if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res3 = await sb.from('sponsors').insert(payloadNoDescNoOrder).select('*').single();
          if (res3.error) return alert('فشل الحفظ: ' + res3.error.message);
          sponsors.unshift({ ...res3.data, description: data.description || '', order: data.order });
        } else if (error) {
          return alert('فشل الحفظ: ' + error.message);
        } else {
          sponsors.unshift({ ...row, description: data.description || '' });
        }
        renderSponsors();
        closeDialog(sponsorDialog);
      } else {
        const id = sponsors[sponsorEditingIndex]?.id;
        if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
        let row, error;
        ({ data: row, error } = await sb.from('sponsors').update(payload).eq('id', id).select('*').single());
        if (error && /(column\s+description|invalid input|unknown column)/i.test(error.message || '')) {
          const res2 = await sb.from('sponsors').update(payloadNoDesc).eq('id', id).select('*').single();
          if (res2.error) return alert('فشل التحديث: ' + res2.error.message);
          sponsors[sponsorEditingIndex] = { ...res2.data, description: data.description || '' };
        } else if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res3 = await sb.from('sponsors').update(payloadNoDescNoOrder).eq('id', id).select('*').single();
          if (res3.error) return alert('فشل التحديث: ' + res3.error.message);
          sponsors[sponsorEditingIndex] = { ...res3.data, description: data.description || '', order: data.order };
        } else if (error) {
          return alert('فشل التحديث: ' + error.message);
        } else {
          sponsors[sponsorEditingIndex] = { ...row, description: data.description || '' };
        }
        renderSponsors();
        closeDialog(sponsorDialog);
      }
    } else {
      if (sponsorEditingIndex === null) sponsors.unshift(data);
      else sponsors[sponsorEditingIndex] = data;
      save(KEYS.sponsors, sponsors);
      renderSponsors();
      closeDialog(sponsorDialog);
    }
  });

  // Board CRUD
  const boardDialog = $('#boardDialog');
  const boardForm = $('#boardForm');
  let boardEditingIndex = null;
  // Board image upload elements
  const boardImageFile = document.getElementById('board_image_file');
  const boardImageUrl = document.getElementById('board_image_url');
  const boardImagePreview = document.getElementById('board_image_preview');
  const boardDropzone = document.getElementById('boardDropzone');
  const boardBrowseBtn = document.getElementById('boardBrowseBtn');
  const boardImageActions = document.getElementById('boardImageActions');
  const boardEditImageBtn = document.getElementById('board_edit_image_btn');
  const boardChangeImageBtn = document.getElementById('board_change_image_btn');
  let boardCroppedFile = null;

  // Reusable: handle board image file (crop 1:1) -> preview
  async function handleBoardImageFile(file) {
    if (!file) return;
    if (!(file.type || '').startsWith('image/')) { alert('الملف ليس صورة'); return; }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) { if (!confirm('حجم الصورة يتجاوز 5MB. المتابعة؟')) return; }
    try {
      const cropped = await openImageCropper(file, { aspectRatio: 1, lockAspect: true, maxWidth: 1200, maxHeight: 1200, mimeType: 'image/webp', quality: 0.9 });
      boardCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (boardImagePreview) { boardImagePreview.src = url; boardImagePreview.style.display = 'block'; }
      if (boardImageActions) boardImageActions.style.display = 'flex';
      if (boardDropzone) boardDropzone.style.display = 'none';
    } catch (err) {
      if (boardImageFile) boardImageFile.value = '';
    }
  }
  // Input change -> handle
  boardImageFile?.addEventListener('change', async () => {
    const file = boardImageFile.files && boardImageFile.files[0];
    await handleBoardImageFile(file);
  });
  // Dropzone interactions for board
  boardBrowseBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); boardImageFile?.click(); });
  boardDropzone?.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    if ((e.target instanceof HTMLElement) && e.target.closest('#boardBrowseBtn')) return;
    boardImageFile?.click();
  });
  boardDropzone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); boardImageFile?.click(); }
  });
  boardDropzone?.addEventListener('dragover', (e) => { e.preventDefault(); boardDropzone.classList.add('dragover'); });
  boardDropzone?.addEventListener('dragleave', () => { boardDropzone.classList.remove('dragover'); });
  boardDropzone?.addEventListener('drop', async (e) => {
    e.preventDefault(); e.stopPropagation(); boardDropzone.classList.remove('dragover');
    const dt = e.dataTransfer; if (!dt) return;
    let file = null;
    if (dt.files && dt.files.length) file = dt.files[0];
    if (!file && dt.items && dt.items.length) { const item = Array.from(dt.items).find(i => i.kind === 'file'); if (item) file = item.getAsFile(); }
    await handleBoardImageFile(file);
  });

  // Board image actions
  boardChangeImageBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    boardImageFile?.click();
  });

  boardEditImageBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const src = (boardImagePreview && boardImagePreview.src) || (boardImageUrl && boardImageUrl.value) || '';
      if (!src) { alert('لا توجد صورة لتحريرها'); return; }
      const file = await fetchUrlAsFile(src, 'current');
      const cropped = await openImageCropper(file, { aspectRatio: 1, lockAspect: true, maxWidth: 1200, maxHeight: 1200, mimeType: 'image/webp', quality: 0.9 });
      boardCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (boardImagePreview) { boardImagePreview.src = url; boardImagePreview.style.display = 'block'; }
      if (boardImageActions) boardImageActions.style.display = 'flex';
      if (boardDropzone) boardDropzone.style.display = 'none';
    } catch (err) {
      if (String(err?.message || '').includes('crop-cancelled')) return;
      alert('تعذر تحرير الصورة الحالية. جرّب تغيير الصورة بدلًا من ذلك.');
    }
  });

  // Upload board member image to Supabase Storage
  async function uploadBoardImage() {
    const file = boardCroppedFile || (boardImageFile?.files && boardImageFile.files[0]);
    if (!file) return null;
    if (!sb) return null;
    const bucket = 'adeeb-site';
    const ext = (file.name.split('.').pop() || getExtFromType(file.type, 'jpg')).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `board/member-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
    const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر الحصول على رابط الصورة');
    return publicUrl;
  }

  $('#addBoardBtn')?.addEventListener('click', () => {
    boardEditingIndex = null;
    boardForm.reset();
    if (boardImagePreview) { boardImagePreview.src = ''; boardImagePreview.style.display = 'none'; }
    if (boardImageUrl) boardImageUrl.value = '';
    boardCroppedFile = null;
    if (boardDropzone) boardDropzone.style.display = '';
    if (boardImageActions) boardImageActions.style.display = 'none';
    openDialog(boardDialog);
  });

  boardList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'up' || act === 'down') {
      if (!Number.isInteger(idx) || idx < 0 || idx >= board.length) return;
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(board.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = board.splice(idx, 1);
      board.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(board, KEYS.board, 'board_members').then(() => {
        renderBoard();
      });
      return;
    }
    if (act === 'edit') {
      boardEditingIndex = idx;
      const cur = board[idx];
      boardForm.name.value = cur.name || '';
      boardForm.position.value = cur.position || '';
      if (boardForm.order) boardForm.order.value = cur.order || '';
      const imgUrl = (cur.image || cur.image_url) || '';
      if (boardImageUrl) boardImageUrl.value = imgUrl;
      if (boardImagePreview) {
        if (imgUrl) { boardImagePreview.src = imgUrl; boardImagePreview.style.display = 'block'; }
        else { boardImagePreview.src = ''; boardImagePreview.style.display = 'none'; }
      }
      if (boardImageFile) boardImageFile.value = '';
      boardCroppedFile = null;
      boardForm.twitter.value = (cur.twitter || cur.twitter_url) || '';
      boardForm.linkedin.value = (cur.linkedin || cur.linkedin_url) || '';
      boardForm.email.value = cur.email || '';
      if (imgUrl) {
        if (boardDropzone) boardDropzone.style.display = 'none';
        if (boardImageActions) boardImageActions.style.display = 'flex';
      } else {
        if (boardDropzone) boardDropzone.style.display = '';
        if (boardImageActions) boardImageActions.style.display = 'none';
      }
      openDialog(boardDialog);
    } else if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = board[idx];
      if (sb && cur.id) {
        sb.from('board_positions').delete().eq('id', cur.id).then(({ error }) => {
          if (error) return alert('فشل الحذف: ' + error.message);
          board.splice(idx, 1);
          renderBoard();
        });
      } else {
        board.splice(idx, 1);
        save(KEYS.board, board);
        renderBoard();
      }
    }
  });

  boardForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // determine final image url
    let finalImgUrl = (boardImageUrl?.value || '').trim();
    try {
      const uploaded = await uploadBoardImage();
      if (uploaded) finalImgUrl = uploaded;
    } catch (err) {
      return alert('فشل رفع الصورة: ' + (err?.message || 'غير معروف'));
    }
    boardCroppedFile = null;
    const data = {
      name: boardForm.name.value.trim(),
      position: boardForm.position.value.trim(),
      image: finalImgUrl,
      twitter: boardForm.twitter.value.trim(),
      linkedin: boardForm.linkedin.value.trim(),
      email: boardForm.email.value.trim(),
      // Keep existing order when editing so we don't reset it to null
      order: (boardEditingIndex !== null)
        ? (board[boardEditingIndex]?.order ?? null)
        : null,
    };
    if (sb) {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
      const payload = {
        name: data.name,
        position: data.position,
        image_url: data.image || null,
        twitter_url: data.twitter || null,
        linkedin_url: data.linkedin || null,
        email: data.email || null,
        order: data.order,
      };
      const payloadNoOrder = { ...payload }; delete payloadNoOrder.order;
      if (boardEditingIndex === null) {
        let row, error;
        ({ data: row, error } = await sb.from('board_positions').insert(payload).select('*').single());
        if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res2 = await sb.from('board_positions').insert(payloadNoOrder).select('*').single();
          if (res2.error) return alert('فشل الحفظ: ' + res2.error.message);
          board.unshift({ ...res2.data, order: data.order });
        } else if (error) {
          return alert('فشل الحفظ: ' + error.message);
        } else {
          board.unshift(row);
        }
        renderBoard();
        closeDialog(boardDialog);
      } else {
        const id = board[boardEditingIndex]?.id;
        if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
        let row, error;
        ({ data: row, error } = await sb.from('board_positions').update(payload).eq('id', id).select('*').single());
        if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res2 = await sb.from('board_positions').update(payloadNoOrder).eq('id', id).select('*').single();
          if (res2.error) return alert('فشل التحديث: ' + res2.error.message);
          board[boardEditingIndex] = { ...res2.data, order: data.order };
        } else if (error) {
          return alert('فشل التحديث: ' + error.message);
        } else {
          board[boardEditingIndex] = row;
        }
        renderBoard();
        closeDialog(boardDialog);
      }
    } else {
      if (boardEditingIndex === null) board.unshift(data);
      else board[boardEditingIndex] = data;
      save(KEYS.board, board);
      renderBoard();
      closeDialog(boardDialog);
    }
  });

  // FAQ CRUD
  const faqDialog = $('#faqDialog');
  const faqForm = $('#faqForm');
  let faqEditingIndex = null;

  $('#addFaqBtn')?.addEventListener('click', () => {
    faqEditingIndex = null;
    faqForm.reset();
    openDialog(faqDialog);
  });

  faqList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'up' || act === 'down') {
      if (!Number.isInteger(idx) || idx < 0 || idx >= faq.length) return;
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(faq.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = faq.splice(idx, 1);
      faq.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(faq, KEYS.faq, 'faq').then(() => {
        renderFaq();
      });
      return;
    }
    if (act === 'edit') {
      faqEditingIndex = idx;
      const cur = faq[idx];
      faqForm.question.value = cur.question || '';
      faqForm.answer.value = cur.answer || '';
      if (faqForm.order) faqForm.order.value = cur.order || '';
      openDialog(faqDialog);
    } else if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = faq[idx];
      if (sb && cur.id) {
        sb.from('faq').delete().eq('id', cur.id).then(({ error }) => {
          if (error) return alert('فشل الحذف: ' + error.message);
          faq.splice(idx, 1);
          renderFaq();
        });
      } else {
        faq.splice(idx, 1);
        save(KEYS.faq, faq);
        renderFaq();
      }
    }
  });

  faqForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      question: faqForm.question.value.trim(),
      answer: faqForm.answer.value.trim(),
      // Keep existing order when editing so we don't reset it to null
      order: (faqEditingIndex !== null)
        ? (faq[faqEditingIndex]?.order ?? null)
        : null,
    };
    if (sb) {
      sb.auth.getSession().then(({ data: { session } }) => {
        if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
        const payload = {
          question: data.question,
          answer: data.answer,
          order: data.order,
        };
        const payloadNoOrder = { question: data.question, answer: data.answer };
        if (faqEditingIndex === null) {
          sb.from('faq').insert(payload).select('*').single().then(async ({ data: row, error }) => {
            if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
              const { data: row2, error: e2 } = await sb.from('faq').insert(payloadNoOrder).select('*').single();
              if (e2) return alert('فشل الحفظ: ' + e2.message);
              faq.unshift({ ...row2, order: data.order });
            } else if (error) {
              return alert('فشل الحفظ: ' + error.message);
            } else {
              faq.unshift(row);
            }
            renderFaq();
            closeDialog(faqDialog);
          });
        } else {
          const id = faq[faqEditingIndex]?.id;
          if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
          sb.from('faq').update(payload).eq('id', id).select('*').single().then(async ({ data: row, error }) => {
            if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
              const { data: row2, error: e2 } = await sb.from('faq').update(payloadNoOrder).eq('id', id).select('*').single();
              if (e2) return alert('فشل التحديث: ' + e2.message);
              faq[faqEditingIndex] = { ...row2, order: data.order };
            } else if (error) {
              return alert('فشل التحديث: ' + error.message);
            } else {
              faq[faqEditingIndex] = row;
            }
            renderFaq();
            closeDialog(faqDialog);
          });
        }
      });
    } else {
      if (faqEditingIndex === null) faq.unshift(data);
      else faq[faqEditingIndex] = data;
      save(KEYS.faq, faq);
      renderFaq();
      closeDialog(faqDialog);
    }
  });

  // ===== Testimonials CRUD =====
  const testimonialDialog = document.getElementById('testimonialDialog');
  const testimonialForm = document.getElementById('testimonialForm');
  const addTestimonialBtn = document.getElementById('addTestimonialBtn');
  let testimonialEditingIndex = null;
  // Image upload elements
  const testimonialImageFile = document.getElementById('testimonial_image_file');
  const testimonialImageUrl = document.getElementById('testimonial_image_url');
  const testimonialImagePreview = document.getElementById('testimonial_image_preview');
  const testimonialDropzone = document.getElementById('testimonialDropzone');
  const testimonialBrowseBtn = document.getElementById('testimonialBrowseBtn');
  const testimonialImageActions = document.getElementById('testimonialImageActions');
  const testimonialEditImageBtn = document.getElementById('testimonial_edit_image_btn');
  const testimonialChangeImageBtn = document.getElementById('testimonial_change_image_btn');
  let testimonialCroppedFile = null;

  async function handleTestimonialImageFile(file) {
    if (!file) return;
    if (!(file.type || '').startsWith('image/')) { alert('الملف ليس صورة'); return; }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) { if (!confirm('حجم الصورة يتجاوز 5MB. المتابعة؟')) return; }
    try {
      const cropped = await openImageCropper(file, { aspectRatio: 1, lockAspect: true, maxWidth: 1200, maxHeight: 1200, mimeType: 'image/webp', quality: 0.9 });
      testimonialCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (testimonialImagePreview) { testimonialImagePreview.src = url; testimonialImagePreview.style.display = 'block'; }
      if (testimonialImageActions) testimonialImageActions.style.display = 'flex';
      if (testimonialDropzone) testimonialDropzone.style.display = 'none';
    } catch (err) {
      if (testimonialImageFile) testimonialImageFile.value = '';
    }
  }
  testimonialImageFile?.addEventListener('change', async () => {
    const file = testimonialImageFile.files && testimonialImageFile.files[0];
    await handleTestimonialImageFile(file);
  });
  testimonialBrowseBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); testimonialImageFile?.click(); });
  testimonialDropzone?.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    if ((e.target instanceof HTMLElement) && e.target.closest('#testimonialBrowseBtn')) return;
    testimonialImageFile?.click();
  });
  testimonialDropzone?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); testimonialImageFile?.click(); } });
  testimonialDropzone?.addEventListener('dragover', (e) => { e.preventDefault(); testimonialDropzone.classList.add('dragover'); });
  testimonialDropzone?.addEventListener('dragleave', () => { testimonialDropzone.classList.remove('dragover'); });
  testimonialDropzone?.addEventListener('drop', async (e) => {
    e.preventDefault(); e.stopPropagation(); testimonialDropzone.classList.remove('dragover');
    const dt = e.dataTransfer; if (!dt) return;
    let file = null;
    if (dt.files && dt.files.length) file = dt.files[0];
    if (!file && dt.items && dt.items.length) { const item = Array.from(dt.items).find(i => i.kind === 'file'); if (item) file = item.getAsFile(); }
    await handleTestimonialImageFile(file);
  });
  testimonialChangeImageBtn?.addEventListener('click', (e) => { e.preventDefault(); testimonialImageFile?.click(); });
  testimonialEditImageBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const src = (testimonialImagePreview && testimonialImagePreview.src) || (testimonialImageUrl && testimonialImageUrl.value) || '';
      if (!src) { alert('لا توجد صورة لتحريرها'); return; }
      const file = await fetchUrlAsFile(src, 'current');
      const cropped = await openImageCropper(file, { aspectRatio: 1, lockAspect: true, maxWidth: 1200, maxHeight: 1200, mimeType: 'image/webp', quality: 0.9 });
      testimonialCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (testimonialImagePreview) { testimonialImagePreview.src = url; testimonialImagePreview.style.display = 'block'; }
      if (testimonialImageActions) testimonialImageActions.style.display = 'flex';
      if (testimonialDropzone) testimonialDropzone.style.display = 'none';
    } catch (err) {
      if (String(err?.message || '').includes('crop-cancelled')) return;
      alert('تعذر تحرير الصورة الحالية. جرّب تغيير الصورة بدلًا من ذلك.');
    }
  });

  async function uploadTestimonialImage() {
    const file = testimonialCroppedFile || (testimonialImageFile?.files && testimonialImageFile.files[0]);
    if (!file) return null;
    if (!sb) return null;
    const bucket = 'adeeb-site';
    const ext = (file.name.split('.').pop() || getExtFromType(file.type, 'jpg')).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `testimonials/testimonial-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
    const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر الحصول على رابط الصورة');
    return publicUrl;
  }

  addTestimonialBtn?.addEventListener('click', () => {
    testimonialEditingIndex = null;
    try { testimonialForm?.reset?.(); } catch {}
    try { if (testimonialForm?.rating) testimonialForm.rating.value = '5'; } catch {}
    try { if (testimonialForm?.visible) testimonialForm.visible.checked = true; } catch {}
    if (testimonialImagePreview) { testimonialImagePreview.src = ''; testimonialImagePreview.style.display = 'none'; }
    if (testimonialImageUrl) testimonialImageUrl.value = '';
    testimonialCroppedFile = null;
    if (testimonialDropzone) testimonialDropzone.style.display = '';
    if (testimonialImageActions) testimonialImageActions.style.display = 'none';
    if (typeof openDialog === 'function') openDialog(testimonialDialog); else testimonialDialog?.showModal?.();
  });

  // Fallback delegated handler in case direct binding missed for any reason
  document.getElementById('section-testimonials')?.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('#addTestimonialBtn');
    if (!btn) return;
    try {
      testimonialEditingIndex = null;
      try { testimonialForm?.reset?.(); } catch {}
      try { if (testimonialForm?.rating) testimonialForm.rating.value = '5'; } catch {}
      try { if (testimonialForm?.visible) testimonialForm.visible.checked = true; } catch {}
      if (testimonialImagePreview) { testimonialImagePreview.src = ''; testimonialImagePreview.style.display = 'none'; }
      if (testimonialImageUrl) testimonialImageUrl.value = '';
      testimonialCroppedFile = null;
      if (testimonialDropzone) testimonialDropzone.style.display = '';
      if (testimonialImageActions) testimonialImageActions.style.display = 'none';
      if (typeof openDialog === 'function') openDialog(testimonialDialog); else testimonialDialog?.showModal?.();
    } catch {}
  });

  testimonialsList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (!Number.isInteger(idx) || idx < 0 || idx >= testimonials.length) return;
    if (act === 'up' || act === 'down') {
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(testimonials.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = testimonials.splice(idx, 1);
      testimonials.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(testimonials, KEYS.testimonials, 'testimonials').then(() => {
        renderTestimonials();
      });
      return;
    }
    if (act === 'vis') {
      const cur = testimonials[idx];
      const curVis = (cur.visible === undefined) ? true : !!cur.visible;
      const nextVis = !curVis;
      if (sb && cur.id) {
        const { data: row, error } = await sb.from('testimonials').update({ visible: nextVis }).eq('id', cur.id).select('*').single();
        if (error) return alert('فشل التحديث: ' + error.message);
        testimonials[idx] = row || { ...cur, visible: nextVis };
        renderTestimonials();
      } else {
        cur.visible = nextVis;
        save(KEYS.testimonials, testimonials);
        renderTestimonials();
      }
      return;
    }
    if (act === 'edit') {
      testimonialEditingIndex = idx;
      const cur = testimonials[idx];
      if (testimonialForm) {
        testimonialForm.member_name.value = cur.member_name || cur.name || '';
        try {
          const sel = testimonialForm.committee;
          const val = cur.committee || '';
          if (sel && sel.tagName === 'SELECT') {
            const has = Array.from(sel.options || []).some(o => o.value === val);
            if (val && !has) {
              const opt = document.createElement('option');
              opt.value = val;
              opt.textContent = val;
              sel.appendChild(opt);
            }
            sel.value = val;
          } else {
            testimonialForm.committee.value = val;
          }
        } catch {
          testimonialForm.committee.value = cur.committee || '';
        }
        testimonialForm.rating.value = String(cur.rating ?? '5');
        testimonialForm.text.value = cur.text || '';
        try { testimonialForm.visible.checked = (cur.visible === undefined) ? true : !!cur.visible; } catch {}
      }
      const imgUrl = (cur.avatar || cur.avatar_url) || '';
      if (testimonialImageUrl) testimonialImageUrl.value = imgUrl;
      if (testimonialImagePreview) {
        if (imgUrl) { testimonialImagePreview.src = imgUrl; testimonialImagePreview.style.display = 'block'; }
        else { testimonialImagePreview.src = ''; testimonialImagePreview.style.display = 'none'; }
      }
      if (testimonialImageFile) testimonialImageFile.value = '';
      testimonialCroppedFile = null;
      if (imgUrl) { if (testimonialDropzone) testimonialDropzone.style.display = 'none'; if (testimonialImageActions) testimonialImageActions.style.display = 'flex'; }
      else { if (testimonialDropzone) testimonialDropzone.style.display = ''; if (testimonialImageActions) testimonialImageActions.style.display = 'none'; }
      openDialog?.(testimonialDialog);
      return;
    }
    if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = testimonials[idx];
      if (sb && cur.id) {
        sb.from('testimonials').delete().eq('id', cur.id).then(({ error }) => {
          if (error) return alert('فشل الحذف: ' + error.message);
          testimonials.splice(idx, 1);
          renderTestimonials();
        });
      } else {
        testimonials.splice(idx, 1);
        save(KEYS.testimonials, testimonials);
        renderTestimonials();
      }
      return;
    }
  });

  testimonialForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // determine final image url
    let finalImgUrl = (testimonialImageUrl?.value || '').trim();
    try {
      const uploaded = await uploadTestimonialImage();
      if (uploaded) finalImgUrl = uploaded;
    } catch (err) {
      return alert('فشل رفع الصورة: ' + (err?.message || 'غير معروف'));
    }
    testimonialCroppedFile = null;
    const data = {
      member_name: (testimonialForm.member_name.value || '').trim(),
      committee: (testimonialForm.committee.value || '').trim() || null,
      rating: testimonialForm.rating.value ? Number(testimonialForm.rating.value) : 5,
      text: (testimonialForm.text.value || '').trim(),
      visible: !!testimonialForm.visible.checked,
      avatar: finalImgUrl || null,
      // Keep existing order when editing so we don't reset it to null
      order: (testimonialEditingIndex !== null)
        ? (testimonials[testimonialEditingIndex]?.order ?? null)
        : null,
    };
    if (!data.member_name || !data.text) { alert('يرجى إدخال الاسم والنص'); return; }
    if (sb) {
      if (testimonialEditingIndex === null) {
        // insert with fallback if `order` column is missing
        const payload = {
          member_name: data.member_name,
          committee: data.committee,
          rating: data.rating,
          text: data.text,
          visible: data.visible,
          avatar_url: data.avatar,
          order: data.order,
        };
        const payloadNoOrder = {
          member_name: data.member_name,
          committee: data.committee,
          rating: data.rating,
          text: data.text,
          visible: data.visible,
          avatar_url: data.avatar,
        };
        let row, error;
        ({ data: row, error } = await sb.from('testimonials').insert(payload).select('*').single());
        if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res2 = await sb.from('testimonials').insert(payloadNoOrder).select('*').single();
          if (res2.error) return alert('فشل الحفظ: ' + res2.error.message);
          testimonials.unshift({ ...res2.data, order: data.order });
        } else if (error) {
          return alert('فشل الحفظ: ' + error.message);
        } else {
          testimonials.unshift(row);
        }
        renderTestimonials();
        closeDialog?.(testimonialDialog);
      } else {
        // update by id with fallback if `order` column is missing
        const id = testimonials[testimonialEditingIndex]?.id;
        if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
        const payload = {
          member_name: data.member_name,
          committee: data.committee,
          rating: data.rating,
          text: data.text,
          visible: data.visible,
          avatar_url: data.avatar,
          order: data.order,
        };
        const payloadNoOrder = {
          member_name: data.member_name,
          committee: data.committee,
          rating: data.rating,
          text: data.text,
          visible: data.visible,
          avatar_url: data.avatar,
        };
        let row, error;
        ({ data: row, error } = await sb.from('testimonials').update(payload).eq('id', id).select('*').single());
        if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res2 = await sb.from('testimonials').update(payloadNoOrder).eq('id', id).select('*').single();
          if (res2.error) return alert('فشل التحديث: ' + res2.error.message);
          testimonials[testimonialEditingIndex] = { ...res2.data, order: data.order };
        } else if (error) {
          return alert('فشل التحديث: ' + error.message);
        } else {
          testimonials[testimonialEditingIndex] = row;
        }
        renderTestimonials();
        closeDialog?.(testimonialDialog);
      }
    } else {
      if (testimonialEditingIndex === null) testimonials.unshift(data);
      else testimonials[testimonialEditingIndex] = data;
      save(KEYS.testimonials, testimonials);
      renderTestimonials();
      closeDialog?.(testimonialDialog);
    }
  });

  // Export / Import
  $('#exportData')?.addEventListener('click', () => {
    const data = {
      works,
      sponsors,
      achievements,
      board,
      members,
      faq,
      testimonials,
      schedule,
      todos,
      topics,
      settings: siteSettingsGet(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'adeeb-data.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  $('#importData')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data.works)) {
        works = data.works; save(KEYS.works, works); renderWorks();
      }
      if (Array.isArray(data.sponsors)) {
        sponsors = data.sponsors; save(KEYS.sponsors, sponsors); renderSponsors();
      }
      if (Array.isArray(data.achievements)) {
        achievements = data.achievements; save(KEYS.achievements, achievements); renderAchievements();
      }
      if (Array.isArray(data.board)) {
        board = data.board; save(KEYS.board, board); renderBoard();
      }
      if (Array.isArray(data.members)) {
        members = data.members; save(KEYS.members, members); renderMembersStats(); renderMembers();
      }
      if (Array.isArray(data.faq)) {
        faq = data.faq; save(KEYS.faq, faq); renderFaq();
      }
      if (Array.isArray(data.testimonials)) {
        testimonials = data.testimonials; save(KEYS.testimonials, testimonials); renderTestimonials();
      }
      if (Array.isArray(data.topics)) {
        topics = data.topics; save(KEYS.topics, topics); renderIdeaTopicsList(topics);
      }
      if (data.schedule && typeof data.schedule === 'object' && !Array.isArray(data.schedule)) {
        schedule = data.schedule; saveSchedule(); renderSchedule();
      }
      if (Array.isArray(data.todos)) {
        todos = data.todos; save(KEYS.todos, todos); renderTodos();
      }
      if (data.settings && typeof data.settings === 'object') {
        siteSettingsSet(data.settings);
        refreshJoinUI();
      }
      alert('تم الاستيراد بنجاح');
    } catch (err) {
      alert('فشل الاستيراد: ملف غير صالح');
      console.error(err);
    } finally {
      e.target.value = '';
    }
  });
  // تم إزالة منطق الترحيل/الترصيد من لوحة التحكم

  // ========== Admins Management (list/add/remove) ==========
  const adminsHighCouncilTable = document.getElementById('adminsHighCouncilTable');
  const adminsAdminCouncilTable = document.getElementById('adminsAdminCouncilTable');
  const adminsExecutiveCouncilTable = document.getElementById('adminsExecutiveCouncilTable');
  const addAdminForm = document.getElementById('addAdminForm');
  const newAdminEmail = document.getElementById('newAdminEmail');
  const adminsStatus = document.getElementById('adminsStatus');
  const invitePermsGrid = document.getElementById('invitePermsGrid');
  const invPermsSelectAllBtn = document.getElementById('invPermsSelectAll');
  const invPermsClearAllBtn = document.getElementById('invPermsClearAll');
  const newAdminPositionEl = document.getElementById('newAdminPosition');

  // Invitation permissions helpers
  function setInvitePerm(id, val) { const el = document.getElementById(id); if (el) el.checked = !!val; }
  function applyInvitePermsForLevel(level) {
    try {
      const base = normalizePermsShape(fallbackPermsForLevel(level));
      setInvitePerm('inv-perm-works', base.works);
      setInvitePerm('inv-perm-sponsors', base.sponsors);
      setInvitePerm('inv-perm-achievements', base.achievements);
      setInvitePerm('inv-perm-board', base.board);
      setInvitePerm('inv-perm-members', base.members);
      setInvitePerm('inv-perm-membership_apps', base.membership_apps);
      setInvitePerm('inv-perm-forms', base.forms);
      setInvitePerm('inv-perm-faq', base.faq);
      setInvitePerm('inv-perm-idea_board', base.idea_board);
      setInvitePerm('inv-perm-chat', base.chat);
      setInvitePerm('inv-perm-schedule', base.schedule);
      setInvitePerm('inv-perm-appointments', base.appointments);
      setInvitePerm('inv-perm-todos', base.todos);
      setInvitePerm('inv-perm-testimonials', base.testimonials);
      setInvitePerm('inv-perm-join', base.join);
      setInvitePerm('inv-perm-push', base.push);
    } catch {}
  }
  invPermsSelectAllBtn?.addEventListener('click', () => {
    try { invitePermsGrid?.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true); } catch {}
  });
  invPermsClearAllBtn?.addEventListener('click', () => {
    try { invitePermsGrid?.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false); } catch {}
  });
  newAdminPositionEl?.addEventListener('change', () => {
    try {
      const position = (newAdminPositionEl?.value || '').trim();
      const level = levelFromPositionAr(position || null);
      applyInvitePermsForLevel(level);
    } catch {}
  });
  // Initialize defaults on load (executive-level fallback)
  try { applyInvitePermsForLevel(ADMIN_LEVELS.executive); } catch {}

  // Auto-update council based on selected position
  const newAdminPositionSelect = document.getElementById('newAdminPosition');
  const newAdminCouncilInput = document.getElementById('newAdminCouncil');
  
  newAdminPositionSelect?.addEventListener('change', () => {
    const selectedOption = newAdminPositionSelect.options[newAdminPositionSelect.selectedIndex];
    const council = selectedOption?.getAttribute('data-council') || '';
    if (newAdminCouncilInput) newAdminCouncilInput.value = council;
  });

  addAdminForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (newAdminEmail?.value || '').trim();
    const position = (document.getElementById('newAdminPosition')?.value || '').trim();
    const admin_level = levelFromPositionAr(position || null);
    if (!email) return;
    adminsStatus && (adminsStatus.className = 'muted', adminsStatus.textContent = 'جاري إرسال الدعوة...');
    try {
      // Dynamic redirect: use current origin (works for local Live Server and production)
      const baseOrigin = location.origin;
      const redirectTo = (baseOrigin.includes('localhost') || baseOrigin.includes('127.0.0.1'))
        ? 'https://www.adeeb.club/admin/onboarding.html'
        : `${baseOrigin}/admin/onboarding.html`;
      // Gather invitation permissions (optional)
      const invGather = () => ({
        works: !!document.getElementById('inv-perm-works')?.checked,
        sponsors: !!document.getElementById('inv-perm-sponsors')?.checked,
        achievements: !!document.getElementById('inv-perm-achievements')?.checked,
        board: !!document.getElementById('inv-perm-board')?.checked,
        members: !!document.getElementById('inv-perm-members')?.checked,
        membership_apps: !!document.getElementById('inv-perm-membership_apps')?.checked,
        forms: !!document.getElementById('inv-perm-forms')?.checked,
        faq: !!document.getElementById('inv-perm-faq')?.checked,
        idea_board: !!document.getElementById('inv-perm-idea_board')?.checked,
        chat: !!document.getElementById('inv-perm-chat')?.checked,
        schedule: !!document.getElementById('inv-perm-schedule')?.checked,
        appointments: !!document.getElementById('inv-perm-appointments')?.checked,
        todos: !!document.getElementById('inv-perm-todos')?.checked,
        testimonials: !!document.getElementById('inv-perm-testimonials')?.checked,
        join: !!document.getElementById('inv-perm-join')?.checked,
        push: !!document.getElementById('inv-perm-push')?.checked,
      });
      const invitedPerms = invitePermsGrid ? invGather() : null;
      await callFunction('invite-admin', { method: 'POST', body: { email, position: position || null, admin_level, redirectTo, perms: invitedPerms || undefined } });
      if (newAdminEmail) newAdminEmail.value = '';
      const posEl = document.getElementById('newAdminPosition'); if (posEl) posEl.value = '';
      if (adminsStatus) { adminsStatus.className = 'alert success'; adminsStatus.textContent = `تم إرسال الدعوة وتعيين المستوى حسب المسمى. صفحة الإكمال: ${redirectTo}`; }
    } catch (err) {
      if (adminsStatus) { adminsStatus.className = 'alert error'; adminsStatus.textContent = 'فشل إرسال الدعوة: ' + (err?.message || 'غير معروف'); }
    }
  });

  // Fetch from Supabase on load if available
  async function loadFromSupabase() {
    if (!sb) return false;
    try {
      const [
        { data: w, error: ew },
        { data: s, error: es },
        { data: b, error: eb },
        { data: m, error: em },
        { data: f, error: ef },
        { data: apps, error: eapps }
      ] = await Promise.all([
        sb.from('works').select('*').order('order', { ascending: true, nullsFirst: true }).order('created_at', { ascending: false }),
        sb.from('sponsors').select('*').order('order', { ascending: true, nullsFirst: true }).order('created_at', { ascending: false }),
        sb.from('board_positions_detailed').select('*').order('display_order', { ascending: true, nullsFirst: true }).order('created_at', { ascending: false }),
        sb.from('members').select('*').order('order', { ascending: true, nullsFirst: true }).order('created_at', { ascending: false }),
        sb.from('faq').select('*').order('order', { ascending: true }),
        sb.from('membership_applications').select('id, created_at, full_name, phone, email, degree, college, major, skills, preferred_committee, portfolio_url, status').order('created_at', { ascending: false }),
      ]);
      if (ew) throw ew; if (es) throw es; if (eb) throw eb; if (em) throw em; if (ef) throw ef; if (eapps) throw eapps;
      works = w || [];
      sponsors = s || [];
      board = b || [];
      members = m || [];
      faq = f || [];
      membershipApps = apps || [];

      // Try achievements separately; ignore 404 table-not-found
      try {
        const { data: a, error: ea } = await sb.from('achievements').select('*').order('order', { ascending: true });
        if (ea) throw ea;
        achievements = a || [];
      } catch (e2) {
        // PostgREST code PGRST205 indicates table not found in schema cache
        if (e2?.code === 'PGRST205' || /Could not find the table '.+achievements'/.test(e2?.message || '')) {
          console.warn('Achievements table missing, falling back to localStorage');
        } else {
          console.warn('Achievements fetch failed', e2);
        }
      }

      // Fetch testimonials by created_at only; sort by `order` client-side
      try {
        const { data: tRows, error: et } = await sb
          .from('testimonials')
          .select('*')
          .order('created_at', { ascending: false });
        if (et) throw et;
        testimonials = tRows || [];
      } catch (e3) {
        if (e3?.code === 'PGRST205' || /Could not find the table '.+testimonials'/.test(e3?.message || '')) {
          console.warn('Testimonials table missing, falling back to localStorage');
        } else {
          console.warn('Testimonials fetch failed', e3);
        }
      }

      try {
        const { data: fms, error: efms } = await sb
          .from('forms')
          .select(`
            id,owner_id,title,description,slug,is_public,is_published,accepting_responses,created_at,
            form_responses(count)
          `)
          .order('created_at', { ascending: false });
        if (efms) throw efms;
        forms = (fms || []).map(form => ({
          ...form,
          responses_count: form.form_responses?.[0]?.count || 0
        }));
      } catch (e4) {
        console.warn('Forms fetch failed', e4);
        // Fallback: fetch forms without responses count
        try {
          const { data: fms2, error: efms2 } = await sb
            .from('forms')
            .select('id,owner_id,title,description,slug,is_public,is_published,accepting_responses,created_at')
            .order('created_at', { ascending: false });
          if (efms2) throw efms2;
          forms = (fms2 || []).map(form => ({ ...form, responses_count: 0 }));
        } catch (e5) {
          console.warn('Forms fallback fetch failed', e5);
        }
      }

      return true;
    } catch (err) {
      console.error('Supabase fetch failed', err);
      return false;
    }
  }

  // ==================== رسائل التواصل ====================
  // دالة لتنظيف النصوص من HTML tags
  const safe = (s) => (s ? String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');
  
  let contactMessages = [];
  
  async function loadContactMessages() {
    try {
      if (sb) {
        const { data, error } = await sb
          .from('contact_messages')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        contactMessages = data || [];
      }
    } catch (e) {
      console.error('خطأ في تحميل رسائل التواصل:', e);
    }
  }
  
  function renderContactMessagesStats() {
    const statsContainer = $('#contactMessagesStats');
    if (!statsContainer) return;
    
    const total = contactMessages.length;
    const newCount = contactMessages.filter(m => m.status === 'new').length;
    const readCount = contactMessages.filter(m => m.status === 'read').length;
    const repliedCount = contactMessages.filter(m => m.status === 'replied').length;
    const archivedCount = contactMessages.filter(m => m.status === 'archived').length;
    
    statsContainer.innerHTML = `
      <div class="card">
        <div class="card__body">
          <div class="card__title"><i class="fa-solid fa-envelope"></i> إجمالي الرسائل</div>
          <div class="card__value">${total}</div>
        </div>
      </div>
      <div class="card">
        <div class="card__body">
          <div class="card__title"><i class="fa-solid fa-envelope-open"></i> رسائل جديدة</div>
          <div class="card__value" style="color:#3b82f6">${newCount}</div>
        </div>
      </div>
      <div class="card">
        <div class="card__body">
          <div class="card__title"><i class="fa-solid fa-eye"></i> مقروءة</div>
          <div class="card__value" style="color:#10b981">${readCount}</div>
        </div>
      </div>
      <div class="card">
        <div class="card__body">
          <div class="card__title"><i class="fa-solid fa-reply"></i> تم الرد</div>
          <div class="card__value" style="color:#8b5cf6">${repliedCount}</div>
        </div>
      </div>
      <div class="card">
        <div class="card__body">
          <div class="card__title"><i class="fa-solid fa-archive"></i> مؤرشفة</div>
          <div class="card__value" style="color:#64748b">${archivedCount}</div>
        </div>
      </div>
    `;
  }
  
  function renderContactMessages(filter = '') {
    const container = $('#contactMessagesList');
    if (!container) return;
    
    const filtered = filter ? contactMessages.filter(m => m.status === filter) : contactMessages;
    
    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state">لا توجد رسائل</div>';
      return;
    }
    
    const statusLabels = {
      new: { text: 'جديدة', color: '#3b82f6' },
      read: { text: 'مقروءة', color: '#10b981' },
      replied: { text: 'تم الرد', color: '#8b5cf6' },
      archived: { text: 'مؤرشفة', color: '#64748b' }
    };
    
    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>البريد الإلكتروني</th>
            <th>الموضوع</th>
            <th>الحالة</th>
            <th>التاريخ</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(msg => {
            const status = statusLabels[msg.status] || { text: msg.status, color: '#64748b' };
            const date = new Date(msg.created_at).toLocaleDateString('ar-SA', { 
              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            });
            return `
              <tr>
                <td style="font-weight:600">${safe(msg.name)}</td>
                <td><a href="mailto:${safe(msg.email)}" style="color:#3d8fd6">${safe(msg.email)}</a></td>
                <td>${safe(msg.subject || '-')}</td>
                <td><span style="padding:4px 12px;border-radius:12px;background:${status.color}20;color:${status.color};font-size:0.85rem;font-weight:600">${status.text}</span></td>
                <td style="color:#64748b;font-size:0.9rem">${date}</td>
                <td>
                  <button class="btn btn-outline small" onclick="viewContactMessage('${msg.id}')">
                    <i class="fa-solid fa-eye"></i> عرض
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }
  
  window.viewContactMessage = async function(id) {
    const msg = contactMessages.find(m => m.id === id);
    if (!msg) return;
    
    const statusOptions = {
      new: 'جديدة',
      read: 'مقروءة',
      replied: 'تم الرد',
      archived: 'مؤرشفة'
    };
    
    const result = await Swal.fire({
      title: 'تفاصيل الرسالة',
      html: `
        <div style="text-align:right;padding:20px">
          <div style="margin-bottom:16px">
            <strong>الاسم:</strong> ${safe(msg.name)}
          </div>
          <div style="margin-bottom:16px">
            <strong>البريد الإلكتروني:</strong> <a href="mailto:${safe(msg.email)}">${safe(msg.email)}</a>
          </div>
          <div style="margin-bottom:16px">
            <strong>الموضوع:</strong> ${safe(msg.subject || '-')}
          </div>
          <div style="margin-bottom:16px">
            <strong>الرسالة:</strong>
            <div style="background:#f8fafc;padding:12px;border-radius:8px;margin-top:8px;white-space:pre-wrap">${safe(msg.message)}</div>
          </div>
          <div style="margin-bottom:16px">
            <strong>الحالة:</strong>
            <select id="msgStatus" class="swal2-input" style="width:auto;display:inline-block;margin:0">
              ${Object.entries(statusOptions).map(([key, label]) => 
                `<option value="${key}" ${msg.status === key ? 'selected' : ''}>${label}</option>`
              ).join('')}
            </select>
          </div>
          ${msg.admin_note ? `
            <div style="margin-bottom:16px">
              <strong>ملاحظة إدارية:</strong>
              <div style="background:#fef3c7;padding:12px;border-radius:8px;margin-top:8px">${safe(msg.admin_note)}</div>
            </div>
          ` : ''}
          <div>
            <strong>إضافة ملاحظة:</strong>
            <textarea id="msgNote" class="swal2-textarea" placeholder="ملاحظة إدارية (اختياري)">${safe(msg.admin_note || '')}</textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'حفظ',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#3d8fd6',
      width: '600px',
      preConfirm: () => {
        return {
          status: document.getElementById('msgStatus').value,
          note: document.getElementById('msgNote').value
        };
      }
    });
    
    if (result.isConfirmed && sb) {
      try {
        const { error } = await sb
          .from('contact_messages')
          .update({ 
            status: result.value.status,
            admin_note: result.value.note || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
        
        if (error) throw error;
        
        msg.status = result.value.status;
        msg.admin_note = result.value.note;
        
        renderContactMessagesStats();
        renderContactMessages($('#contactStatusFilter')?.value || '');
        
        Swal.fire({
          icon: 'success',
          title: 'تم الحفظ',
          text: 'تم تحديث الرسالة بنجاح',
          confirmButtonColor: '#3d8fd6'
        });
      } catch (e) {
        Swal.fire({
          icon: 'error',
          title: 'خطأ',
          text: 'فشل تحديث الرسالة: ' + e.message
        });
      }
    }
  };
  
  // ==================== النشرة البريدية ====================
  let newsletterSubscriptions = [];
  
  async function loadNewsletterSubscriptions() {
    try {
      if (sb) {
        const { data, error } = await sb
          .from('newsletter_subscriptions')
          .select('*')
          .order('subscribed_at', { ascending: false });
        if (error) throw error;
        newsletterSubscriptions = data || [];
      }
    } catch (e) {
      console.error('خطأ في تحميل اشتراكات النشرة:', e);
    }
  }
  
  function renderNewsletterStats() {
    const statsContainer = $('#newsletterStats');
    if (!statsContainer) return;
    
    const total = newsletterSubscriptions.length;
    const active = newsletterSubscriptions.filter(s => s.status === 'active').length;
    const unsubscribed = newsletterSubscriptions.filter(s => s.status === 'unsubscribed').length;
    
    statsContainer.innerHTML = `
      <div class="card">
        <div class="card__body">
          <div class="card__title"><i class="fa-solid fa-newspaper"></i> إجمالي الاشتراكات</div>
          <div class="card__value">${total}</div>
        </div>
      </div>
      <div class="card">
        <div class="card__body">
          <div class="card__title"><i class="fa-solid fa-check-circle"></i> نشط</div>
          <div class="card__value" style="color:#10b981">${active}</div>
        </div>
      </div>
      <div class="card">
        <div class="card__body">
          <div class="card__title"><i class="fa-solid fa-times-circle"></i> ملغي</div>
          <div class="card__value" style="color:#ef4444">${unsubscribed}</div>
        </div>
      </div>
    `;
  }
  
  function renderNewsletterList(filter = '') {
    const container = $('#newsletterList');
    if (!container) return;
    
    const filtered = filter ? newsletterSubscriptions.filter(s => s.status === filter) : newsletterSubscriptions;
    
    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state">لا توجد اشتراكات</div>';
      return;
    }
    
    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>البريد الإلكتروني</th>
            <th>الحالة</th>
            <th>تاريخ الاشتراك</th>
            <th>تاريخ الإلغاء</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(sub => {
            const statusColor = sub.status === 'active' ? '#10b981' : '#ef4444';
            const statusText = sub.status === 'active' ? 'نشط' : 'ملغي';
            const subDate = new Date(sub.subscribed_at).toLocaleDateString('ar-SA', { 
              year: 'numeric', month: 'short', day: 'numeric' 
            });
            const unsubDate = sub.unsubscribed_at ? new Date(sub.unsubscribed_at).toLocaleDateString('ar-SA', { 
              year: 'numeric', month: 'short', day: 'numeric' 
            }) : '-';
            
            return `
              <tr>
                <td style="font-weight:600">${safe(sub.email)}</td>
                <td><span style="padding:4px 12px;border-radius:12px;background:${statusColor}20;color:${statusColor};font-size:0.85rem;font-weight:600">${statusText}</span></td>
                <td style="color:#64748b;font-size:0.9rem">${subDate}</td>
                <td style="color:#64748b;font-size:0.9rem">${unsubDate}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }
  
  // Event Listeners
  const refreshContactBtn = $('#refreshContactMessages');
  if (refreshContactBtn) {
    refreshContactBtn.addEventListener('click', async () => {
      await loadContactMessages();
      renderContactMessagesStats();
      renderContactMessages($('#contactStatusFilter')?.value || '');
    });
  }
  
  const contactStatusFilter = $('#contactStatusFilter');
  if (contactStatusFilter) {
    contactStatusFilter.addEventListener('change', (e) => {
      renderContactMessages(e.target.value);
    });
  }
  
  const refreshNewsletterBtn = $('#refreshNewsletter');
  if (refreshNewsletterBtn) {
    refreshNewsletterBtn.addEventListener('click', async () => {
      await loadNewsletterSubscriptions();
      renderNewsletterStats();
      renderNewsletterList($('#newsletterStatusFilter')?.value || '');
    });
  }
  
  const newsletterStatusFilter = $('#newsletterStatusFilter');
  if (newsletterStatusFilter) {
    newsletterStatusFilter.addEventListener('change', (e) => {
      renderNewsletterList(e.target.value);
    });
  }
  
  const exportNewsletterBtn = $('#exportNewsletterEmails');
  if (exportNewsletterBtn) {
    exportNewsletterBtn.addEventListener('click', () => {
      const activeEmails = newsletterSubscriptions
        .filter(s => s.status === 'active')
        .map(s => s.email);
      
      if (activeEmails.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'لا توجد بيانات',
          text: 'لا توجد اشتراكات نشطة للتصدير',
          confirmButtonColor: '#3d8fd6'
        });
        return;
      }
      
      const emailsText = activeEmails.join('\n');
      const blob = new Blob([emailsText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter-emails-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      
      Swal.fire({
        icon: 'success',
        title: 'تم التصدير',
        text: `تم تصدير ${activeEmails.length} بريد إلكتروني`,
        confirmButtonColor: '#3d8fd6'
      });
    });
  }

  (async () => {
    if (sb) {
      await refreshAuthUI();
      sb.auth.onAuthStateChange(() => {
        refreshAuthUI();
      });
    }

    await loadFromSupabase();
    // Apply permissions to hide disallowed tabs/cards
    try { await applyCurrentUserPermissions(); } catch {}
    // Always render after attempting to load (even if arrays are empty)
    renderWorks();
    renderSponsors();
    renderBoard();
    renderMembersStats();
    renderMembers();
    renderFaq();
    renderTestimonials();
    renderAchievements();
    renderForms();
    renderTodos();
    try { await fetchVisitStats(); } catch {}
    renderStats();
    
    // Load contact messages and newsletter
    await loadContactMessages();
    await loadNewsletterSubscriptions();
    renderContactMessagesStats();
    renderContactMessages();
    renderNewsletterStats();
    renderNewsletterList();
    
    // Load news
    await loadNews();
    renderNewsStats();
    renderNewsList();
    
    // If profile tab is active/visible on load, initialize it
    try {
      const prof = document.getElementById('section-profile');
      if (location.hash === '#section-profile' || (prof && !prof.hidden)) {
        adminLoadProfileIntoForm?.();
        try { updateInstallButtonVisibility?.(); } catch {}
        try { checkPushPermission?.(); } catch {}
      }
    } catch {}
  })();

  // ===== NEWS MANAGEMENT =====
  let newsList = [];
  let currentNewsFilter = '';

  // Simple notification function
  function showNotification(message, type = 'info') {
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6'
    };
    const color = colors[type] || colors.info;
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: fb, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Load news from Supabase
  async function loadNews() {
    try {
      const { data, error } = await sb
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      newsList = data || [];
    } catch (error) {
      console.error('Error loading news:', error);
      newsList = [];
    }
  }

  // Render news statistics with enhanced design
  function renderNewsStats() {
    const statsContainer = document.getElementById('newsStats');
    if (!statsContainer) return;
    
    const total = newsList.length;
    const published = newsList.filter(n => n.status === 'published').length;
    const draft = newsList.filter(n => n.status === 'draft').length;
    const archived = newsList.filter(n => n.status === 'archived').length;
    const featured = newsList.filter(n => n.is_featured).length;
    const totalViews = newsList.reduce((sum, n) => sum + (n.views || 0), 0);
    
    const stats = [
      {
        icon: 'fa-newspaper',
        value: total,
        label: 'إجمالي الأخبار',
        gradient: 'linear-gradient(135deg, var(--accent-blue), var(--main-blue))',
        borderColor: 'rgba(61, 143, 214, 0.3)'
      },
      {
        icon: 'fa-circle-check',
        value: published,
        label: 'منشور',
        gradient: 'linear-gradient(135deg, #10b981, #059669)',
        borderColor: 'rgba(16, 185, 129, 0.3)'
      },
      {
        icon: 'fa-file-pen',
        value: draft,
        label: 'مسودة',
        gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
        borderColor: 'rgba(245, 158, 11, 0.3)'
      },
      {
        icon: 'fa-box-archive',
        value: archived,
        label: 'مؤرشف',
        gradient: 'linear-gradient(135deg, #64748b, #475569)',
        borderColor: 'rgba(100, 116, 139, 0.3)'
      },
      {
        icon: 'fa-star',
        value: featured,
        label: 'مميز',
        gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
        borderColor: 'rgba(251, 191, 36, 0.3)'
      },
      {
        icon: 'fa-eye',
        value: totalViews,
        label: 'إجمالي المشاهدات',
        gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        borderColor: 'rgba(139, 92, 246, 0.3)'
      }
    ];
    
    statsContainer.innerHTML = stats.map(stat => `
      <div class="stat-card" style="border-color: ${stat.borderColor}; --card-gradient: ${stat.gradient}">
        <div class="stat-card__icon" style="background: ${stat.gradient}">
          <i class="fa-solid ${stat.icon}"></i>
        </div>
        <div class="stat-card__content">
          <div class="stat-card__value">${stat.value}</div>
          <div class="stat-card__label">${stat.label}</div>
        </div>
      </div>
    `).join('');
  }

  // Render news list as cards
  function renderNewsList(filter = '') {
    const container = document.getElementById('newsList');
    if (!container) return;
    
    let filtered = [...newsList];
    if (filter) {
      filtered = filtered.filter(n => n.status === filter);
    }
    
    // Apply search filter if exists
    const searchInput = document.getElementById('newsFilterSearch');
    if (searchInput && searchInput.value.trim()) {
      const searchTerm = searchInput.value.trim().toLowerCase();
      filtered = filtered.filter(n => 
        n.title?.toLowerCase().includes(searchTerm) ||
        n.summary?.toLowerCase().includes(searchTerm) ||
        (Array.isArray(n.authors) && n.authors.some(a => a.toLowerCase().includes(searchTerm)))
      );
    }
    
    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state muted" style="text-align:center;padding:40px 20px;color:var(--muted)"><i class="fa-solid fa-newspaper" style="font-size:48px;margin-bottom:12px;opacity:0.3"></i><p>لا توجد أخبار</p></div>';
      return;
    }
    
    const statusLabels = {
      published: { text: 'منشور', color: '#10b981', icon: 'fa-check-circle' },
      draft: { text: 'مسودة', color: '#f59e0b', icon: 'fa-clock' },
      archived: { text: 'مؤرشف', color: '#64748b', icon: 'fa-box-archive' }
    };
    
    container.innerHTML = `
    <div class="news-cards-grid">
      ${filtered.map(news => {
        const status = statusLabels[news.status] || { text: news.status, color: '#64748b', icon: 'fa-circle' };
        const publishedDate = news.published_at ? new Date(news.published_at).toLocaleDateString('ar-SA', {
          year: 'numeric', month: 'short', day: 'numeric'
        }) : 'غير منشور';
        const authors = news.authors || (news.author_name ? [news.author_name] : ['نادي أديب']);
        const authorsDisplay = authors.length > 1 
          ? `${safe(authors[0])} <span style="color:#64748b;font-size:0.85em">(+${authors.length - 1})</span>`
          : safe(authors[0]);
        
        // Get cover image URL
        const coverImage = news.image_url || 'https://via.placeholder.com/400x250?text=لا+توجد+صورة';
        const excerpt = news.summary ? (news.summary.length > 120 ? news.summary.substring(0, 120) + '...' : news.summary) : 'لا يوجد ملخص';
        
        return `
          <div class="news-card" style="background:linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border-radius:16px; padding:0; box-shadow:0 4px 12px rgba(0,0,0,0.08); transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border:1px solid #e2e8f0; position:relative; overflow:hidden">
            <div style="position:absolute; top:0; right:0; width:100%; height:5px; background:${status.color}"></div>
            
            <div style="padding:20px 20px 16px">
              <div style="display:flex; align-items:flex-start; gap:16px; margin-bottom:16px">
                <div style="position:relative">
                  <img src="${coverImage}" alt="${safe(news.title)}" onerror="this.src='https://via.placeholder.com/400x250?text=لا+توجد+صورة'" style="width:100px; height:100px; border-radius:16px; object-fit:cover; box-shadow:0 4px 12px rgba(0,0,0,0.15); flex-shrink:0; border:3px solid #fff" />
                  ${news.is_featured ? '<div style="position:absolute; bottom:-8px; right:-8px; background:linear-gradient(135deg, #fbbf24, #f59e0b); width:32px; height:32px; border-radius:50%; border:3px solid #fff; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(251,191,36,0.4)"><i class="fa-solid fa-star" style="font-size:12px; color:#fff"></i></div>' : ''}
                </div>
                
                <div style="flex:1; min-width:0; padding-left:30px">
                  <div style="font-size:1.1rem; font-weight:700; color:#0f172a; margin-bottom:8px; line-height:1.3">
                    ${safe(news.title)}
                  </div>
                  <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px; padding:4px 10px; background:#f1f5f9; border-radius:8px; width:fit-content">
                    <i class="fa-solid ${status.icon}" style="font-size:12px; color:${status.color}"></i>
                    <span style="font-size:0.8rem; color:#475569; font-weight:600">${status.text}</span>
                  </div>
                  <p style="font-size:0.85rem; color:#64748b; margin:0; line-height:1.6; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden">
                    ${safe(excerpt)}
                  </p>
                </div>
              </div>
              
              <div style="display:grid; gap:8px; margin-bottom:16px">
                <div style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0">
                  <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #3d8fd6, #5ba3e0); display:flex; align-items:center; justify-content:center; flex-shrink:0">
                    <i class="fa-solid fa-user" style="font-size:14px; color:#fff"></i>
                  </div>
                  <div style="flex:1; min-width:0">
                    <div style="font-size:0.7rem; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px">الكاتب</div>
                    <div style="font-size:0.85rem; color:#1e293b; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${authorsDisplay}</div>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0">
                  <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #10b981, #34d399); display:flex; align-items:center; justify-content:center; flex-shrink:0">
                    <i class="fa-solid fa-calendar" style="font-size:14px; color:#fff"></i>
                  </div>
                  <div style="flex:1; min-width:0">
                    <div style="font-size:0.7rem; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px">تاريخ النشر</div>
                    <div style="font-size:0.85rem; color:#1e293b; font-weight:500">${publishedDate}</div>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0">
                  <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #8b5cf6, #7c3aed); display:flex; align-items:center; justify-content:center; flex-shrink:0">
                    <i class="fa-solid fa-eye" style="font-size:14px; color:#fff"></i>
                  </div>
                  <div style="flex:1; min-width:0">
                    <div style="font-size:0.7rem; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px">المشاهدات</div>
                    <div style="font-size:0.85rem; color:#1e293b; font-weight:500">${news.views || 0} مشاهدة</div>
                  </div>
                </div>
              </div>
              
              <div style="position:absolute; top:16px; left:16px; display:flex; gap:6px">
                <button class="btn btn-sm news-delete-btn" onclick="deleteNews('${news.id}')" title="حذف الخبر" style="width:36px; height:36px; padding:0; border-radius:10px; background:#fff; border:1px solid #fecaca; color:#ef4444; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.06); transition:all 0.2s">
                  <i class="fa-solid fa-trash" style="font-size:14px"></i>
                </button>
              </div>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0; border-top:1px solid #e2e8f0; background:#fafbfc">
              <button class="btn btn-sm news-action-btn" onclick="window.open('../news/news-detail.html?id=${news.id}&preview=true', '_blank')" style="border:none; border-radius:0 0 0 16px; padding:12px; font-size:0.85rem; font-weight:600; background:transparent; color:#3d8fd6; border-left:1px solid #e2e8f0; transition:all 0.2s">
                <i class="fa-regular fa-eye"></i> معاينة
              </button>
              <button class="btn btn-sm news-action-btn" onclick="editNews('${news.id}')" style="border:none; border-radius:0 0 16px 0; padding:12px; font-size:0.85rem; font-weight:600; background:transparent; color:#64748b; transition:all 0.2s">
                <i class="fa-solid fa-pen"></i> تعديل كامل
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  }

  // Open news dialog for adding
  function openAddNewsDialog() {
    const dialog = document.getElementById('newsDialog');
    const form = document.getElementById('newsForm');
    const title = document.getElementById('newsDialogTitle');
    
    form.reset();
    document.getElementById('news_id').value = '';
    title.textContent = 'إضافة خبر جديد';
    
    // Reset authors to single field
    resetAuthorsFields();
    
    // Reset cover image and images
    resetCoverImage();
    resetNewsImages();
    
    // Set default author
    const user = sb.auth.getUser();
    if (user?.data?.user) {
      const adminData = adminsList.find(a => a.user_id === user.data.user.id);
      if (adminData?.display_name) {
        const firstAuthorInput = document.querySelector('.author-name-input');
        if (firstAuthorInput) firstAuthorInput.value = adminData.display_name;
      }
    }
    
    dialog.showModal();
  }
  
  // News images array and cover image
  let newsImages = [];
  let newsCoverImage = null;
  let currentImageUploadIndex = null;
  
  // Reset cover image
  function resetCoverImage() {
    newsCoverImage = null;
    document.getElementById('news_cover_image_url').value = '';
    document.getElementById('news_cover_image_file').value = '';
    document.getElementById('coverImageUploadArea').style.display = 'block';
    document.getElementById('coverImagePreviewArea').style.display = 'none';
    document.getElementById('removeCoverImageBtn').style.display = 'none';
  }
  
  // Show cover image preview
  function showCoverImagePreview(url) {
    newsCoverImage = url;
    document.getElementById('news_cover_image_url').value = url;
    document.getElementById('coverImagePreview').src = url;
    document.getElementById('coverImageUploadArea').style.display = 'none';
    document.getElementById('coverImagePreviewArea').style.display = 'block';
    document.getElementById('removeCoverImageBtn').style.display = 'block';
  }
  
  // Reset images
  function resetNewsImages() {
    newsImages = [];
    renderNewsImages();
    document.getElementById('uploadProgress').style.display = 'none';
  }
  
  // Render news images
  function renderNewsImages() {
    const container = document.getElementById('newsImagesContainer');
    const addBtn = document.getElementById('addNewsImageBtn');
    
    // Update add button state
    if (addBtn) {
      addBtn.disabled = newsImages.length >= 4;
      addBtn.style.opacity = newsImages.length >= 4 ? '0.5' : '1';
      addBtn.style.cursor = newsImages.length >= 4 ? 'not-allowed' : 'pointer';
    }
    
    if (newsImages.length === 0) {
      container.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px">لم يتم إضافة صور بعد. يجب إضافة من 2 إلى 4 صور.</p>';
      return;
    }
    
    container.innerHTML = newsImages.map((img, index) => `
      <div class="news-image-item" style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#f8fafc">
        <div style="display:flex;gap:12px;align-items:start">
          <img src="${img.url}" alt="صورة ${index + 1}" style="width:120px;height:80px;object-fit:cover;border-radius:6px;flex-shrink:0" />
          <div style="flex:1;min-width:0">
            <label style="display:block;margin-bottom:4px;font-size:0.9rem;font-weight:600;color:#475569">
              اسم المصور <span style="color:#ef4444">*</span>
            </label>
            <input 
              type="text" 
              class="photographer-input" 
              data-index="${index}" 
              value="${img.photographer || ''}" 
              placeholder="أدخل اسم المصور" 
              style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.9rem"
            />
          </div>
          <button 
            type="button" 
            class="btn btn-outline small remove-news-image-btn" 
            data-index="${index}" 
            style="padding:8px 12px;color:#ef4444;flex-shrink:0"
            title="حذف الصورة"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
    
    // Add event listeners for photographer inputs
    container.querySelectorAll('.photographer-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.index);
        newsImages[index].photographer = e.target.value.trim();
      });
    });
    
    // Add event listeners for remove buttons
    container.querySelectorAll('.remove-news-image-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        newsImages.splice(index, 1);
        renderNewsImages();
      });
    });
  }
  
  // Handle image file selection
  async function handleImageUpload(file) {
    if (!file) return null;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showNotification('يرجى اختيار ملف صورة صحيح', 'error');
      return null;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'error');
      return null;
    }
    
    try {
      // Show progress
      const progressDiv = document.getElementById('uploadProgress');
      const progressBar = document.getElementById('uploadProgressBar');
      const progressText = document.getElementById('uploadProgressText');
      progressDiv.style.display = 'block';
      progressBar.style.width = '0%';
      progressText.textContent = 'جاري الرفع...';
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const fileExt = file.name.split('.').pop();
      const fileName = `news_${timestamp}_${randomStr}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data, error } = await sb.storage
        .from('news-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = sb.storage
        .from('news-images')
        .getPublicUrl(fileName);
      
      progressBar.style.width = '100%';
      progressText.textContent = 'تم الرفع بنجاح!';
      
      setTimeout(() => {
        progressDiv.style.display = 'none';
      }, 1000);
      
      return urlData.publicUrl;
      
    } catch (error) {
      console.error('Error uploading image:', error);
      showNotification('حدث خطأ في رفع الصورة', 'error');
      document.getElementById('uploadProgress').style.display = 'none';
      return null;
    }
  }
  
  // Add image to news images array
  function addNewsImage(url) {
    if (newsImages.length >= 4) {
      showNotification('لا يمكن إضافة أكثر من 4 صور', 'error');
      return;
    }
    newsImages.push({ url, photographer: '' });
    renderNewsImages();
  }
  
  // Reset authors fields to single field
  function resetAuthorsFields() {
    const container = document.getElementById('authorsContainer');
    container.innerHTML = `
      <div class="author-field" style="display:flex;gap:8px;margin-bottom:8px">
        <input type="text" class="author-name-input" placeholder="اسم الكاتب" style="flex:1" />
        <button type="button" class="btn btn-outline small remove-author-btn" style="padding:8px 12px;color:#ef4444;display:none">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;
    updateRemoveButtons();
  }
  
  // Add new author field
  function addAuthorField(authorName = '') {
    const container = document.getElementById('authorsContainer');
    const newField = document.createElement('div');
    newField.className = 'author-field';
    newField.style.cssText = 'display:flex;gap:8px;margin-bottom:8px';
    newField.innerHTML = `
      <input type="text" class="author-name-input" placeholder="اسم الكاتب" value="${safe(authorName)}" style="flex:1" />
      <button type="button" class="btn btn-outline small remove-author-btn" style="padding:8px 12px;color:#ef4444">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    container.appendChild(newField);
    updateRemoveButtons();
  }
  
  // Update visibility of remove buttons
  function updateRemoveButtons() {
    const fields = document.querySelectorAll('.author-field');
    fields.forEach((field, index) => {
      const removeBtn = field.querySelector('.remove-author-btn');
      if (removeBtn) {
        removeBtn.style.display = fields.length > 1 ? 'block' : 'none';
      }
    });
  }
  
  // Get all author names
  function getAuthorNames() {
    const inputs = document.querySelectorAll('.author-name-input');
    const names = Array.from(inputs)
      .map(input => input.value.trim())
      .filter(name => name.length > 0);
    return names.length > 0 ? names : ['نادي أديب'];
  }

  // Edit news
  async function editNews(newsId) {
    const news = newsList.find(n => n.id === newsId);
    if (!news) return;
    
    const dialog = document.getElementById('newsDialog');
    const title = document.getElementById('newsDialogTitle');
    
    title.textContent = 'تعديل الخبر';
    
    document.getElementById('news_id').value = news.id;
    document.getElementById('news_title').value = news.title || '';
    document.getElementById('news_content').value = news.content || '';
    document.getElementById('news_status').value = news.status || 'draft';
    document.getElementById('news_is_featured').checked = news.is_featured || false;
    document.getElementById('news_photographer').value = news.photographer || '';
    
    // Load cover image
    resetCoverImage();
    if (news.image_url) {
      showCoverImagePreview(news.image_url);
    }
    
    // Load additional images
    resetNewsImages();
    if (news.images && Array.isArray(news.images) && news.images.length > 0) {
      newsImages = news.images.map(img => ({ ...img }));
      renderNewsImages();
    }
    
    // Load authors
    resetAuthorsFields();
    const authors = news.authors || (news.author_name ? [news.author_name] : ['نادي أديب']);
    const firstAuthorInput = document.querySelector('.author-name-input');
    if (firstAuthorInput && authors.length > 0) {
      firstAuthorInput.value = authors[0];
    }
    for (let i = 1; i < authors.length; i++) {
      addAuthorField(authors[i]);
    }
    
    dialog.showModal();
  }

  // Delete news
  async function deleteNews(newsId) {
    const news = newsList.find(n => n.id === newsId);
    if (!news) return;
    
    const confirmed = confirm(`هل أنت متأكد من حذف الخبر "${news.title}"؟`);
    if (!confirmed) return;
    
    try {
      const { error } = await sb
        .from('news')
        .delete()
        .eq('id', newsId);
      
      if (error) throw error;
      
      await loadNews();
      renderNewsStats();
      renderNewsList(currentNewsFilter);
      
      showNotification('تم حذف الخبر بنجاح', 'success');
    } catch (error) {
      console.error('Error deleting news:', error);
      showNotification('حدث خطأ في حذف الخبر', 'error');
    }
  }

  // Make functions globally accessible for onclick handlers
  window.editNews = editNews;
  window.deleteNews = deleteNews;

  // Event Listeners for News Management
  document.getElementById('addNewsBtn')?.addEventListener('click', openAddNewsDialog);
  
  // Cover image upload
  document.getElementById('news_cover_image_file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = await handleImageUpload(file);
      if (url) {
        showCoverImagePreview(url);
      }
      e.target.value = '';
    }
  });
  
  // Remove cover image button
  document.getElementById('removeCoverImageBtn')?.addEventListener('click', () => {
    resetCoverImage();
  });
  
  // Add news image button
  document.getElementById('addNewsImageBtn')?.addEventListener('click', () => {
    if (newsImages.length >= 4) {
      showNotification('لا يمكن إضافة أكثر من 4 صور', 'error');
      return;
    }
    document.getElementById('news_image_file_hidden').click();
  });
  
  // Image upload
  document.getElementById('news_image_file_hidden')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = await handleImageUpload(file);
      if (url) {
        addNewsImage(url);
      }
      // Reset file input
      e.target.value = '';
    }
  });
  
  // Add author button
  document.getElementById('addAuthorBtn')?.addEventListener('click', () => {
    addAuthorField();
  });
  
  // Remove author buttons (event delegation)
  document.getElementById('authorsContainer')?.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.remove-author-btn');
    if (removeBtn) {
      const field = removeBtn.closest('.author-field');
      if (field) {
        field.remove();
        updateRemoveButtons();
      }
    }
  });

  document.getElementById('refreshNews')?.addEventListener('click', async () => {
    await loadNews();
    renderNewsStats();
    renderNewsList(currentNewsFilter);
    showNotification('تم تحديث الأخبار', 'success');
  });

  document.getElementById('newsStatusFilter')?.addEventListener('change', (e) => {
    currentNewsFilter = e.target.value;
    applyNewsFilters();
  });

  // Advanced news filters
  document.getElementById('newsFilterSearch')?.addEventListener('input', () => {
    applyNewsFilters();
  });

  document.getElementById('newsFeaturedFilter')?.addEventListener('change', () => {
    applyNewsFilters();
  });

  document.getElementById('newsClearFilters')?.addEventListener('click', () => {
    document.getElementById('newsFilterSearch').value = '';
    document.getElementById('newsStatusFilter').value = '';
    document.getElementById('newsFeaturedFilter').value = '';
    currentNewsFilter = '';
    renderNewsList('');
  });

  // Apply all news filters
  function applyNewsFilters() {
    let filtered = [...newsList];
    
    // Status filter
    const statusFilter = document.getElementById('newsStatusFilter')?.value;
    if (statusFilter) {
      filtered = filtered.filter(n => n.status === statusFilter);
    }
    
    // Featured filter
    const featuredFilter = document.getElementById('newsFeaturedFilter')?.value;
    if (featuredFilter === 'featured') {
      filtered = filtered.filter(n => n.is_featured === true);
    } else if (featuredFilter === 'not-featured') {
      filtered = filtered.filter(n => !n.is_featured);
    }
    
    // Search filter
    const searchTerm = document.getElementById('newsFilterSearch')?.value?.trim()?.toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(n => 
        n.title?.toLowerCase().includes(searchTerm) ||
        n.summary?.toLowerCase().includes(searchTerm) ||
        (Array.isArray(n.authors) && n.authors.some(a => a.toLowerCase().includes(searchTerm)))
      );
    }
    
    // Render filtered results
    renderFilteredNews(filtered);
  }

  // Render filtered news (similar to renderNewsList but takes pre-filtered array)
  function renderFilteredNews(filtered) {
    const container = document.getElementById('newsList');
    if (!container) return;
    
    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state muted" style="text-align:center;padding:40px 20px;color:var(--muted)"><i class="fa-solid fa-newspaper" style="font-size:48px;margin-bottom:12px;opacity:0.3"></i><p>لا توجد نتائج</p></div>';
      return;
    }
    
    const statusLabels = {
      published: { text: 'منشور', color: '#10b981', icon: 'fa-check-circle' },
      draft: { text: 'مسودة', color: '#f59e0b', icon: 'fa-clock' },
      archived: { text: 'مؤرشف', color: '#64748b', icon: 'fa-box-archive' }
    };
    
    container.innerHTML = `
    <div class="news-cards-grid">
      ${filtered.map(news => {
        const status = statusLabels[news.status] || { text: news.status, color: '#64748b', icon: 'fa-circle' };
        const publishedDate = news.published_at ? new Date(news.published_at).toLocaleDateString('ar-SA', {
          year: 'numeric', month: 'short', day: 'numeric'
        }) : 'غير منشور';
        const authors = news.authors || (news.author_name ? [news.author_name] : ['نادي أديب']);
        const authorsDisplay = authors.length > 1 
          ? `${safe(authors[0])} <span style="color:#64748b;font-size:0.85em">(+${authors.length - 1})</span>`
          : safe(authors[0]);
        
        const coverImage = news.image_url || 'https://via.placeholder.com/400x250?text=لا+توجد+صورة';
        const excerpt = news.summary ? (news.summary.length > 120 ? news.summary.substring(0, 120) + '...' : news.summary) : 'لا يوجد ملخص';
        
        return `
          <div class="news-card" style="background:linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border-radius:16px; padding:0; box-shadow:0 4px 12px rgba(0,0,0,0.08); transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border:1px solid #e2e8f0; position:relative; overflow:hidden">
            <div style="position:absolute; top:0; right:0; width:100%; height:5px; background:${status.color}"></div>
            
            <div style="padding:20px 20px 16px">
              <div style="display:flex; align-items:flex-start; gap:16px; margin-bottom:16px">
                <div style="position:relative">
                  <img src="${coverImage}" alt="${safe(news.title)}" onerror="this.src='https://via.placeholder.com/400x250?text=لا+توجد+صورة'" style="width:100px; height:100px; border-radius:16px; object-fit:cover; box-shadow:0 4px 12px rgba(0,0,0,0.15); flex-shrink:0; border:3px solid #fff" />
                  ${news.is_featured ? '<div style="position:absolute; bottom:-8px; right:-8px; background:linear-gradient(135deg, #fbbf24, #f59e0b); width:32px; height:32px; border-radius:50%; border:3px solid #fff; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(251,191,36,0.4)"><i class="fa-solid fa-star" style="font-size:12px; color:#fff"></i></div>' : ''}
                </div>
                
                <div style="flex:1; min-width:0; padding-left:60px">
                  <div style="font-size:1.1rem; font-weight:700; color:#0f172a; margin-bottom:8px; line-height:1.3">
                    ${safe(news.title)}
                  </div>
                  <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px; padding:4px 10px; background:#f1f5f9; border-radius:8px; width:fit-content">
                    <i class="fa-solid ${status.icon}" style="font-size:12px; color:${status.color}"></i>
                    <span style="font-size:0.8rem; color:#475569; font-weight:600">${status.text}</span>
                  </div>
                  <p style="font-size:0.85rem; color:#64748b; margin:0; line-height:1.6; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden">
                    ${safe(excerpt)}
                  </p>
                </div>
              </div>
              
              <div style="display:grid; gap:8px; margin-bottom:16px">
                <div style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0">
                  <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #3d8fd6, #5ba3e0); display:flex; align-items:center; justify-content:center; flex-shrink:0">
                    <i class="fa-solid fa-user" style="font-size:14px; color:#fff"></i>
                  </div>
                  <div style="flex:1; min-width:0">
                    <div style="font-size:0.7rem; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px">الكاتب</div>
                    <div style="font-size:0.85rem; color:#1e293b; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${authorsDisplay}</div>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0">
                  <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #10b981, #34d399); display:flex; align-items:center; justify-content:center; flex-shrink:0">
                    <i class="fa-solid fa-calendar" style="font-size:14px; color:#fff"></i>
                  </div>
                  <div style="flex:1; min-width:0">
                    <div style="font-size:0.7rem; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px">تاريخ النشر</div>
                    <div style="font-size:0.85rem; color:#1e293b; font-weight:500">${publishedDate}</div>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0">
                  <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #8b5cf6, #7c3aed); display:flex; align-items:center; justify-content:center; flex-shrink:0">
                    <i class="fa-solid fa-eye" style="font-size:14px; color:#fff"></i>
                  </div>
                  <div style="flex:1; min-width:0">
                    <div style="font-size:0.7rem; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px">المشاهدات</div>
                    <div style="font-size:0.85rem; color:#1e293b; font-weight:500">${news.views || 0} مشاهدة</div>
                  </div>
                </div>
              </div>
              
              <div style="position:absolute; top:16px; left:16px; display:flex; gap:6px">
                <button class="btn btn-sm news-delete-btn" onclick="deleteNews('${news.id}')" title="حذف الخبر" style="width:36px; height:36px; padding:0; border-radius:10px; background:#fff; border:1px solid #fecaca; color:#ef4444; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.06); transition:all 0.2s">
                  <i class="fa-solid fa-trash" style="font-size:14px"></i>
                </button>
              </div>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0; border-top:1px solid #e2e8f0; background:#fafbfc">
              <button class="btn btn-sm news-action-btn" onclick="window.open('../news/news-detail.html?id=${news.id}&preview=true', '_blank')" style="border:none; border-radius:0 0 0 16px; padding:12px; font-size:0.85rem; font-weight:600; background:transparent; color:#3d8fd6; border-left:1px solid #e2e8f0; transition:all 0.2s">
                <i class="fa-regular fa-eye"></i> معاينة
              </button>
              <button class="btn btn-sm news-action-btn" onclick="editNews('${news.id}')" style="border:none; border-radius:0 0 16px 0; padding:12px; font-size:0.85rem; font-weight:600; background:transparent; color:#64748b; transition:all 0.2s">
                <i class="fa-solid fa-pen"></i> تعديل كامل
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  }

  document.getElementById('newsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newsId = document.getElementById('news_id').value;
    const title = document.getElementById('news_title').value.trim();
    const content = document.getElementById('news_content').value.trim();
    const authors = getAuthorNames();
    const status = document.getElementById('news_status').value;
    const isFeatured = document.getElementById('news_is_featured').checked;
    const photographer = document.getElementById('news_photographer').value.trim();
    
    if (!title || !content) {
      showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    
    // Validate cover image
    if (!newsCoverImage) {
      showNotification('يرجى إضافة صورة الغلاف', 'error');
      return;
    }
    
    // Validate additional images
    if (newsImages.length < 2 || newsImages.length > 4) {
      showNotification('يجب إضافة من 2 إلى 4 صور للخبر', 'error');
      return;
    }
    
    // Validate photographer names
    const missingPhotographers = newsImages.some(img => !img.photographer || img.photographer.trim() === '');
    if (missingPhotographers) {
      showNotification('يرجى إدخال اسم المصور لجميع الصور', 'error');
      return;
    }
    
    // Generate summary from content (first 75 characters)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    const summary = textContent.substring(0, 75).trim() + (textContent.length > 75 ? '...' : '');
    
    try {
      const user = await sb.auth.getUser();
      const newsData = {
        title,
        summary,
        content,
        image_url: newsCoverImage, // Cover image
        photographer: photographer || null, // Cover image photographer
        images: newsImages, // Array of additional images with photographers
        author_id: user?.data?.user?.id || null,
        author_name: authors[0], // First author for backward compatibility
        authors: authors, // Array of all authors
        status,
        is_featured: isFeatured,
        published_at: status === 'published' ? new Date().toISOString() : null
      };
      
      if (newsId) {
        // Update existing news
        const { error } = await sb
          .from('news')
          .update(newsData)
          .eq('id', newsId);
        
        if (error) throw error;
        showNotification('تم تحديث الخبر بنجاح', 'success');
      } else {
        // Insert new news
        const { error } = await sb
          .from('news')
          .insert([newsData]);
        
        if (error) throw error;
        showNotification('تم إضافة الخبر بنجاح', 'success');
      }
      
      document.getElementById('newsDialog').close();
      await loadNews();
      renderNewsStats();
      renderNewsList(currentNewsFilter);
      
    } catch (error) {
      console.error('Error saving news:', error);
      showNotification('حدث خطأ في حفظ الخبر', 'error');
    }
  });

  // ============================================
  // Membership Archive System
  // ============================================
  const ARCHIVE_KEY = 'adeeb_membership_archive';
  let archivePeriods = [];
  let currentArchivePeriod = null;

  // Get archive periods from storage
  function getArchivePeriods() {
    try {
      const raw = localStorage.getItem(ARCHIVE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // Save archive periods to storage
  function saveArchivePeriods(periods) {
    try {
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(periods));
    } catch (e) {
      console.error('Failed to save archive periods:', e);
    }
  }

  // Load and render archive periods
  async function loadArchivePeriods() {
    archivePeriods = getArchivePeriods();
    renderArchivePeriods();
  }

  // Render archive periods grid
  function renderArchivePeriods() {
    const grid = document.getElementById('archivePeriodsGrid');
    const empty = document.getElementById('archivePeriodsEmpty');
    
    if (!grid || !empty) return;

    if (archivePeriods.length === 0) {
      grid.style.display = 'none';
      empty.style.display = 'block';
      return;
    }

    grid.style.display = 'grid';
    empty.style.display = 'none';

    grid.innerHTML = archivePeriods.map((period, idx) => {
      const stats = period.stats || {};
      const total = stats.total || 0;
      const accepted = stats.accepted || 0;
      const rejected = stats.rejected || 0;
      const pending = stats.pending || 0;

      return `
        <div class="card">
          <div class="card__body">
            <div class="card__title">
              <i class="fa-solid fa-archive"></i> ${escapeHtml(period.name)}
            </div>
            <div style="margin:12px 0;font-size:0.9rem;color:#64748b">
              <div style="margin-bottom:6px">
                <i class="fa-regular fa-calendar"></i> 
                ${formatDateReadable(period.startDate)} - ${formatDateReadable(period.endDate)}
              </div>
              <div>
                <i class="fa-solid fa-clock"></i> 
                حُفظت في: ${formatDateTimeReadable(period.createdAt)}
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:12px 0">
              <div style="padding:8px;background:#f0f9ff;border-radius:6px;text-align:center">
                <div style="font-size:1.5rem;font-weight:700;color:#3d8fd6">${total}</div>
                <div style="font-size:0.75rem;color:#64748b">إجمالي الطلبات</div>
              </div>
              <div style="padding:8px;background:#f0fdf4;border-radius:6px;text-align:center">
                <div style="font-size:1.5rem;font-weight:700;color:#10b981">${accepted}</div>
                <div style="font-size:0.75rem;color:#64748b">مقبول</div>
              </div>
            </div>
            <div class="card__actions">
              <button class="btn btn-primary" onclick="viewArchivePeriod(${idx})">
                <i class="fa-solid fa-eye"></i> عرض التفاصيل
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Format date for display
  function formatDateReadable(dateStr) {
    try {
      if (!dateStr) return '—';
      const d = new Date(dateStr);
      if (isNaN(d)) return '—';
      return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return '—';
    }
  }

  // Show create period dialog
  window.showCreateArchivePeriod = function() {
    const dialog = document.getElementById('archiveCreateDialog');
    if (!dialog) return;

    // Load current membership stats
    updateArchiveCurrentStats();

    // Set default dates (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const startInput = document.getElementById('archivePeriodStartDate');
    const endInput = document.getElementById('archivePeriodEndDate');
    
    if (startInput) startInput.value = firstDay.toISOString().split('T')[0];
    if (endInput) endInput.value = lastDay.toISOString().split('T')[0];

    dialog.showModal();
  };

  // Update current stats in create dialog
  function updateArchiveCurrentStats() {
    const statsEl = document.getElementById('archiveCurrentStats');
    if (!statsEl) return;

    const apps = membershipApps || [];
    const total = apps.length;
    const accepted = apps.filter(a => a.status === 'accepted').length;
    const rejected = apps.filter(a => a.status === 'rejected').length;
    const pending = apps.filter(a => a.status === 'pending').length;
    const review = apps.filter(a => a.status === 'review').length;
    const interview = apps.filter(a => a.status === 'interview').length;

    statsEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        <div><strong>الإجمالي:</strong> ${total}</div>
        <div><strong>مقبول:</strong> ${accepted}</div>
        <div><strong>مرفوض:</strong> ${rejected}</div>
        <div><strong>قيد الانتظار:</strong> ${pending}</div>
        <div><strong>مراجعة:</strong> ${review}</div>
        <div><strong>مُقابلة:</strong> ${interview}</div>
      </div>
    `;
  }

  // Export applications to Excel
  function exportApplicationsToExcel(apps, periodName) {
    if (!window.XLSX) {
      alert('مكتبة Excel غير محملة. يرجى إعادة تحميل الصفحة.');
      return;
    }

    // Prepare data for Excel
    const data = apps.map(app => ({
      'الاسم الثلاثي': app.full_name || '',
      'الجوال': app.phone || '',
      'البريد الإلكتروني': app.email || '',
      'الدرجة العلمية': app.degree || '',
      'الكلية': app.college || '',
      'التخصص': app.major || '',
      'اللجنة المفضلة': app.preferred_committee || '',
      'المهارات': app.skills || '',
      'الأعمال السابقة': app.portfolio_url || '',
      'تويتر': app.social_twitter || '',
      'إنستقرام': app.social_instagram || '',
      'لينكد إن': app.social_linkedin || '',
      'النبذة': app.about || '',
      'الحالة': app.status || '',
      'تاريخ التقديم': app.created_at ? new Date(app.created_at).toLocaleString('ar-EG') : ''
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths
    const colWidths = [
      { wch: 25 }, // الاسم
      { wch: 15 }, // الجوال
      { wch: 25 }, // البريد
      { wch: 15 }, // الدرجة
      { wch: 20 }, // الكلية
      { wch: 20 }, // التخصص
      { wch: 20 }, // اللجنة
      { wch: 30 }, // المهارات
      { wch: 30 }, // الأعمال
      { wch: 20 }, // تويتر
      { wch: 20 }, // إنستقرام
      { wch: 20 }, // لينكد إن
      { wch: 40 }, // النبذة
      { wch: 15 }, // الحالة
      { wch: 20 }  // التاريخ
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'طلبات العضوية');

    // Generate filename
    const filename = `${periodName.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  }

  // Handle create period form submission
  document.getElementById('archiveCreateForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('archivePeriodName')?.value.trim();
    const startDate = document.getElementById('archivePeriodStartDate')?.value;
    const endDate = document.getElementById('archivePeriodEndDate')?.value;
    const notes = document.getElementById('archivePeriodNotes')?.value.trim();

    if (!name || !startDate || !endDate) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    // Get current membership applications
    const apps = membershipApps || [];
    
    if (apps.length === 0) {
      alert('لا توجد طلبات عضوية لأرشفتها');
      return;
    }

    const stats = {
      total: apps.length,
      accepted: apps.filter(a => a.status === 'accepted').length,
      rejected: apps.filter(a => a.status === 'rejected').length,
      pending: apps.filter(a => a.status === 'pending').length,
      review: apps.filter(a => a.status === 'review').length,
      interview: apps.filter(a => a.status === 'interview').length
    };

    // Export to Excel first
    exportApplicationsToExcel(apps, name);

    // Create period object (without storing full applications to save space)
    const period = {
      id: Date.now().toString(),
      name,
      startDate,
      endDate,
      notes,
      createdAt: new Date().toISOString(),
      stats,
      applicationsCount: apps.length,
      applications: apps // Keep for re-export if needed
    };

    // Save to archive
    archivePeriods.unshift(period);
    saveArchivePeriods(archivePeriods);

    // Clear current applications from database if using Supabase
    if (sb) {
      try {
        const appIds = apps.map(a => a.id).filter(id => id != null);
        if (appIds.length > 0) {
          await sb.from('membership_applications').delete().in('id', appIds);
        }
      } catch (e) {
        console.warn('Failed to delete applications from database:', e);
      }
    }

    // Clear local storage
    membershipApps = [];
    save(KEYS.membership_apps, membershipApps);

    // Close dialog and refresh
    document.getElementById('archiveCreateDialog')?.close();
    await loadArchivePeriods();
    await loadMembershipApps();

    alert('تم أرشفة الفترة بنجاح!\n\n✓ تم تصدير البيانات كملف Excel\n✓ تم حذف الطلبات من قاعدة البيانات\n✓ تم حفظ معلومات الفترة في السجل');
  });

  // View archive period details
  window.viewArchivePeriod = function(index) {
    if (index < 0 || index >= archivePeriods.length) return;
    
    currentArchivePeriod = archivePeriods[index];
    const period = currentArchivePeriod;

    // Update dialog content
    document.getElementById('archivePeriodDetailsTitle').textContent = period.name;
    document.getElementById('archiveDetailName').textContent = period.name;
    document.getElementById('archiveDetailStartDate').textContent = formatDateReadable(period.startDate);
    document.getElementById('archiveDetailEndDate').textContent = formatDateReadable(period.endDate);
    document.getElementById('archiveDetailCreatedAt').textContent = formatDateTimeReadable(period.createdAt);
    document.getElementById('archiveDetailNotes').textContent = period.notes || 'لا توجد ملاحظات';

    const stats = period.stats || {};
    document.getElementById('archiveDetailStats').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        <div><strong>الإجمالي:</strong> ${stats.total || 0}</div>
        <div><strong>مقبول:</strong> ${stats.accepted || 0}</div>
        <div><strong>مرفوض:</strong> ${stats.rejected || 0}</div>
        <div><strong>قيد الانتظار:</strong> ${stats.pending || 0}</div>
        <div><strong>مراجعة:</strong> ${stats.review || 0}</div>
        <div><strong>مُقابلة:</strong> ${stats.interview || 0}</div>
      </div>
    `;

    document.getElementById('archivePeriodDetailsDialog')?.showModal();
  };

  // Export archive period data as Excel
  document.getElementById('archiveExportBtn')?.addEventListener('click', () => {
    if (!currentArchivePeriod) return;

    const apps = currentArchivePeriod.applications || [];
    if (apps.length === 0) {
      alert('لا توجد بيانات طلبات لتصديرها');
      return;
    }

    exportApplicationsToExcel(apps, currentArchivePeriod.name);
    alert('تم تصدير البيانات كملف Excel بنجاح');
  });

  // Delete archive period
  document.getElementById('archiveDeleteBtn')?.addEventListener('click', async () => {
    if (!currentArchivePeriod) return;

    const confirmed = confirm(`هل أنت متأكد من حذف الفترة "${currentArchivePeriod.name}"؟\n\nتأكد من تصدير البيانات أولاً لأن هذا الإجراء لا يمكن التراجع عنه.`);
    if (!confirmed) return;

    // Remove from array
    archivePeriods = archivePeriods.filter(p => p.id !== currentArchivePeriod.id);
    saveArchivePeriods(archivePeriods);

    // Close dialog and refresh
    document.getElementById('archivePeriodDetailsDialog')?.close();
    await loadArchivePeriods();

    alert('تم حذف الفترة بنجاح');
    currentArchivePeriod = null;
  });

  // Initialize archive button
  document.getElementById('archiveCreatePeriodBtn')?.addEventListener('click', showCreateArchivePeriod);

  // Load archive periods when section is opened
  const originalGoTo = window.goTo;
  window.goTo = function(id) {
    if (originalGoTo) originalGoTo(id);
    if (id === '#section-membership-archive') {
      loadArchivePeriods();
    }
  };

})();
