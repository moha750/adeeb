(async () => {
  const sb = window.sbClient;
  const $ = (sel, root = document) => root.querySelector(sel);

  const obCard = $('#obCard');
  const obGate = $('#obGate');
  const obForm = $('#obForm');
  const fullName = $('#fullName');
  const phoneInput = $('#phone');
  const password = $('#password');
  const togglePwdBtn = $('#togglePwd');
  const pwdMeter = $('#pwdMeter');
  const pwdMeterBar = pwdMeter?.querySelector('.bar');
  const pwdHint = $('#pwdHint');
  const reqLen = $('#reqLen');
  const reqCase = $('#reqCase');
  const reqSymbol = $('#reqSymbol');
  const avatarFile = $('#avatarFile');
  const avatarPreview = $('#avatarPreview');
  const avatarFileName = $('#avatarFileName');
  const avatarZone = document.getElementById('avatarZone');
  const avatarClear = document.getElementById('avatarClear');
  const statusEl = $('#status');
  const submitBtn = $('#submitBtn');
  const currentEmailReadout = $('#currentEmailReadout');
  const positionReadout = $('#positionReadout');

  // Wizard elements
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const step4 = document.getElementById('step4');
  const dot1 = document.getElementById('dot1');
  const dot2 = document.getElementById('dot2');
  const dot3 = document.getElementById('dot3');
  const dot4 = document.getElementById('dot4');
  const stepsDots = document.querySelector('.steps-dots');
  const nextBtn = document.getElementById('nextBtn');
  const backBtn = document.getElementById('backBtn');
  const actionsHint = document.getElementById('actionsHint');
  const welcomePosition = document.getElementById('welcomePosition');
  let currentStep = 1;

  function updateStepsUI() {
    // Toggle step visibility
    if (step1) step1.classList.toggle('active', currentStep === 1);
    if (step2) step2.classList.toggle('active', currentStep === 2);
    if (step3) step3.classList.toggle('active', currentStep === 3);
    if (step4) step4.classList.toggle('active', currentStep === 4);
    // Update dots
    if (dot1) {
      dot1.classList.toggle('active', currentStep === 1);
      dot1.classList.toggle('completed', currentStep > 1);
    }
    if (dot2) {
      dot2.classList.toggle('active', currentStep === 2);
      dot2.classList.toggle('completed', currentStep > 2);
    }
    if (dot3) {
      dot3.classList.toggle('active', currentStep === 3);
      dot3.classList.toggle('completed', currentStep > 3);
    }
    if (dot4) {
      dot4.classList.toggle('active', currentStep === 4);
      dot4.classList.toggle('completed', currentStep > 4);
    }
    // Progress line width (0% at step 1, 50% at step 2, 100% at step 3)
    try {
      const dots = [dot1, dot2, dot3, dot4].filter(Boolean);
      const totalSteps = dots.length || 4;
      const ratio = Math.max(0, Math.min(totalSteps - 1, currentStep - 1)) / Math.max(1, (totalSteps - 1));
      const pct = Math.round(ratio * 100);
      stepsDots?.style?.setProperty('--progress', pct + '%');
    } catch {}
    // Buttons
    if (backBtn) backBtn.hidden = currentStep === 1;
    if (nextBtn) nextBtn.hidden = currentStep === 4;
    if (submitBtn) submitBtn.hidden = currentStep !== 4;
    // Hint
    if (actionsHint) {
      actionsHint.textContent = currentStep === 1
        ? 'أدخل اسمك الثلاثي ثم اضغط التالي'
        : (currentStep === 2
          ? 'راجِع البريد والمنصب، وأدخل الجوال وكلمة المرور ثم اضغط التالي'
          : 'اختر صورة شخصية (اختياري) ثم اضغط حفظ وإنهاء');
    }
    // Clear status on step switch
    setStatus('', '');
  }

  function goStep(n) {
    const maxStep = 4;
    currentStep = Math.max(1, Math.min(maxStep, n || 1));
    updateStepsUI();
    // focus first relevant field
    try {
      if (currentStep === 1) {
        // welcome step - no input focus
      } else if (currentStep === 2) {
        fullName?.focus();
      } else if (currentStep === 3) {
        phoneInput?.focus();
      } else if (currentStep === 4) {
        avatarZone?.focus?.();
      }
    } catch {}
  }

  function setStatus(type, msg) {
    if (!statusEl) return;
    statusEl.className = type ? `alert ${type}` : 'muted';
    statusEl.textContent = msg || '';
  }

  // Password strength helpers
  function evaluatePasswordStrength(pwd) {
    // Returns {score:0-5, percent:0-100, label, color}
    let score = 0;
    if (!pwd) return { score: 0, percent: 0, label: 'فارغة', color: '#ef4444' };
    const asciiOnly = /^[\x21-\x7E]+$/.test(pwd); // printable ASCII without space
    const lengthOK = pwd.length >= 8;
    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSymbol = /[^A-Za-z0-9]/.test(pwd);

    score += (lengthOK && asciiOnly) ? 1 : 0;
    score += hasLower ? 1 : 0;
    score += hasUpper ? 1 : 0;
    score += hasNumber ? 1 : 0;
    score += hasSymbol ? 1 : 0;

    const clamp = Math.max(0, Math.min(score, 5));
    const percent = (clamp / 5) * 100;
    let label = 'ضعيفة';
    let color = '#ef4444'; // أحمر للضعيفة
    if (clamp >= 3 && clamp <= 4) { label = 'جيدة'; color = '#eb8b1e'; } // أخضر للجيدة
    if (clamp >= 5) { label = 'قوية'; color = '#16a34a'; } // أخضر أغمق للقوية
    return { score: clamp, percent, label, color };
  }

  function updatePasswordUI() {
    if (!pwdMeterBar || !pwdHint) return;
    const val = password.value;
    const { percent, label, color } = evaluatePasswordStrength(val);
    pwdMeterBar.style.width = `${percent}%`;
    pwdMeterBar.style.backgroundColor = color;
    pwdHint.textContent = val ? `قوة كلمة المرور: ${label}` : '';

    // Update requirements checklist
    try {
      const asciiOnly = /^[\x21-\x7E]+$/.test(val);
      const hasLen = val.length >= 8 && asciiOnly;
      const hasLower = /[a-z]/.test(val);
      const hasUpper = /[A-Z]/.test(val);
      const hasCase = hasLower && hasUpper;
      const hasSymbol = /[^A-Za-z0-9]/.test(val);

      const setReq = (el, ok) => {
        if (!el) return;
        el.classList.toggle('ok', ok);
        el.classList.toggle('bad', !ok);
        const icon = el.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-circle-check', ok);
          icon.classList.toggle('fa-circle-xmark', !ok);
        }
      };

      setReq(reqLen, hasLen);
      setReq(reqCase, hasCase);
      setReq(reqSymbol, hasSymbol);
    } catch {}
  }

  password?.addEventListener('input', updatePasswordUI);

  // Full name: allow letters (Arabic or English) and spaces only
  // When typing, preserve a single trailing space to allow entering the next word
  function sanitizeFullName(val, { preserveTrailingSpace = true } = {}) {
    const input = String(val || '');
    // Keep Arabic letters \u0621-\u064A and English letters A-Za-z and spaces
    let cleaned = input.replace(/[^A-Za-z\u0621-\u064A\s]/g, '');
    // Collapse multiple spaces into single space, but don't trim end if we want to preserve trailing space
    cleaned = cleaned.replace(/\s+/g, ' ');
    // Remove leading spaces only
    cleaned = cleaned.replace(/^\s+/, '');
    // If not preserving trailing space, trim it; otherwise keep a single trailing space if the user is mid-typing
    if (!preserveTrailingSpace) {
      cleaned = cleaned.replace(/\s+$/, '');
    }
    // Limit to 3 words max (ignore an extra trailing space in count)
    const parts = cleaned.trim().split(' ').filter(Boolean);
    if (parts.length > 3) cleaned = parts.slice(0, 3).join(' ');
    return cleaned;
  }

  function isTripleName(val) {
    const cleaned = sanitizeFullName(val, { preserveTrailingSpace: false });
    const parts = cleaned.split(' ').filter(Boolean);
    if (parts.length !== 3) return false;
    return parts.every(p => /^[A-Za-z\u0621-\u064A]+$/.test(p));
  }

  // Full name input: sanitize only (no dynamic notice)
  fullName?.addEventListener('input', () => {
    try {
      const cleaned = sanitizeFullName(fullName.value, { preserveTrailingSpace: true });
      if (fullName.value !== cleaned) {
        const pos = fullName.selectionStart || cleaned.length;
        fullName.value = cleaned;
        try { fullName.setSelectionRange(pos, pos); } catch {}
      }
    } catch {}
  });

  // Phone: allow digits only and validate Saudi format 05XXXXXXXX (10 digits)
  const phoneNotice = document.getElementById('phoneNotice');
  const phoneNoticeText = document.getElementById('phoneNoticeText');
  let phoneNoticeTimer = null;
  function showPhoneNotice(msg) {
    if (!phoneNotice || !phoneNoticeText) return;
    phoneNoticeText.textContent = msg || '';
    phoneNotice.classList.toggle('hidden', !msg);
    if (phoneNoticeTimer) clearTimeout(phoneNoticeTimer);
    if (msg) {
      phoneNoticeTimer = setTimeout(() => {
        if (phoneNoticeText.textContent === msg) {
          phoneNoticeText.textContent = '';
          phoneNotice.classList.add('hidden');
        }
      }, 2500);
    }
  }

  function sanitizePhone(val) {
    return String(val || '').replace(/\D/g, '').slice(0, 10); // digits only, max 10
  }
  function isSaudiPhone(val) {
    return /^05\d{8}$/.test(val);
  }

  phoneInput?.addEventListener('beforeinput', (e) => {
    try {
      const data = e.data;
      if (typeof data === 'string' && /\D/.test(data)) {
        e.preventDefault();
        showPhoneNotice('يُسمح فقط بالأرقام');
      }
    } catch {}
  });

  phoneInput?.addEventListener('input', () => {
    try {
      const cleaned = sanitizePhone(phoneInput.value);
      if (cleaned !== phoneInput.value) {
        const pos = phoneInput.selectionStart || cleaned.length;
        phoneInput.value = cleaned;
        try { phoneInput.setSelectionRange(pos, pos); } catch {}
        if (/\D/.test(phoneInput.value)) showPhoneNotice('يُسمح فقط بالأرقام');
      }
      // Live notice for Saudi format
      if (phoneInput.value && !/^05/.test(phoneInput.value)) {
        showPhoneNotice('الرجاء إدخال رقم سعودي يبدأ بـ 05');
      } else if (phoneInput.value.length > 0 && phoneInput.value.length < 10) {
        showPhoneNotice('أدخل 10 خانات لرقم سعودي صحيح');
      } else {
        showPhoneNotice('');
      }
    } catch {}
  });

  phoneInput?.addEventListener('paste', (e) => {
    try {
      const text = (e.clipboardData || window.clipboardData).getData('text');
      if (/\D/.test(text)) {
        e.preventDefault();
        const cleaned = sanitizePhone(text);
        const start = phoneInput.selectionStart ?? phoneInput.value.length;
        const end = phoneInput.selectionEnd ?? start;
        const newVal = (phoneInput.value.slice(0, start) + cleaned + phoneInput.value.slice(end)).slice(0, 10);
        phoneInput.value = newVal;
        const newPos = start + cleaned.length;
        try { phoneInput.setSelectionRange(newPos, newPos); } catch {}
        showPhoneNotice('يُسمح فقط بالأرقام');
      }
    } catch {}
  });

  // Immediate prevention of non-English characters (allow printable ASCII only, no spaces)
  function isAsciiPrintableNoSpace(str) { return /^[\x21-\x7E]*$/.test(str); }
  function sanitizeAscii(val) { return (val || '').replace(/[^\x21-\x7E]/g, ''); }
  const pwdNotice = document.getElementById('pwdNotice');
  const pwdNoticeText = document.getElementById('pwdNoticeText');
  let noticeTimer = null;
  function showPwdNotice(msg) {
    if (!pwdNotice || !pwdNoticeText) return;
    pwdNoticeText.textContent = msg || '';
    pwdNotice.classList.toggle('hidden', !msg);
    if (noticeTimer) clearTimeout(noticeTimer);
    if (msg) {
      noticeTimer = setTimeout(() => {
        if (pwdNoticeText.textContent === msg) {
          pwdNoticeText.textContent = '';
          pwdNotice.classList.add('hidden');
        }
      }, 2500);
    }
  }

  // Block invalid input before it lands in the field when possible
  password?.addEventListener('beforeinput', (e) => {
    try {
      const data = e.data;
      if (typeof data === 'string' && !isAsciiPrintableNoSpace(data)) {
        e.preventDefault();
        showPwdNotice('يُمنع استخدام أحرف غير إنجليزية');
        return;
      }
      // For insertFromPaste types, we'll sanitize on paste handler below
    } catch {}
  });

  // Sanitize on input as a fallback (covers IME/drag-drop cases)
  password?.addEventListener('input', () => {
    try {
      const cleaned = sanitizeAscii(password.value);
      if (password.value !== cleaned) {
        const pos = password.selectionStart || cleaned.length;
        password.value = cleaned;
        // restore cursor
        try { password.setSelectionRange(pos, pos); } catch {}
        showPwdNotice('يُمنع استخدام أحرف غير إنجليزية');
      }
      updatePasswordUI();
    } catch {}
  });

  // Sanitize pasted content explicitly
  password?.addEventListener('paste', (e) => {
    try {
      const text = (e.clipboardData || window.clipboardData).getData('text');
      if (!isAsciiPrintableNoSpace(text)) {
        e.preventDefault();
        const cleaned = sanitizeAscii(text);
        const start = password.selectionStart ?? password.value.length;
        const end = password.selectionEnd ?? start;
        const newVal = password.value.slice(0, start) + cleaned + password.value.slice(end);
        password.value = newVal;
        const newPos = start + cleaned.length;
        try { password.setSelectionRange(newPos, newPos); } catch {}
        updatePasswordUI();
        showPwdNotice('يُمنع استخدام أحرف غير إنجليزية');
      }
    } catch {}
  });

  togglePwdBtn?.addEventListener('click', () => {
    if (!password) return;
    const isHidden = password.type === 'password';
    password.type = isHidden ? 'text' : 'password';
    const icon = togglePwdBtn.querySelector('i');
    const span = togglePwdBtn.querySelector('span');
    if (icon) {
      icon.classList.toggle('fa-eye', !isHidden);
      icon.classList.toggle('fa-eye-slash', isHidden);
    }
    if (span) span.textContent = isHidden ? 'إخفاء' : 'إظهار';
    togglePwdBtn.setAttribute('aria-label', isHidden ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
  });

  function humanFileSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    const thresh = 1024;
    if (Math.abs(bytes) < thresh) return bytes + ' B';
    const units = ['KB','MB','GB','TB'];
    let u = -1;
    do { bytes /= thresh; ++u; } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1)+' '+units[u];
  }

  function getExtFromName(name, fallback = 'jpg') {
    const m = /\.([a-zA-Z0-9]+)$/.exec(name || '');
    return (m && m[1]) ? m[1].toLowerCase() : fallback;
  }

  function previewAvatar(file) {
    if (!file) { avatarPreview.src = ''; avatarFileName.textContent = ''; return; }
    const url = URL.createObjectURL(file);
    avatarPreview.src = url;
    avatarFileName.textContent = `${file.name} • ${humanFileSize(file.size)}`;
  }

  avatarFile?.addEventListener('change', () => {
    const f = avatarFile.files && avatarFile.files[0];
    previewAvatar(f || null);
  });

  // Make avatar zone clickable to open file dialog
  
  avatarZone?.addEventListener('click', (e) => {
    // Avoid triggering when clicking on the hidden input itself
    if (e.target === avatarFile) return;
    try { avatarFile?.click(); } catch {}
  });

  // Drag and drop support on avatarZone
  ['dragenter', 'dragover'].forEach(evtName => {
    avatarZone?.addEventListener(evtName, (e) => {
      e.preventDefault(); e.stopPropagation();
      avatarZone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(evtName => {
    avatarZone?.addEventListener(evtName, (e) => {
      e.preventDefault(); e.stopPropagation();
      avatarZone.classList.remove('dragover');
    });
  });
  avatarZone?.addEventListener('drop', (e) => {
    try {
      const dt = e.dataTransfer;
      const file = dt && dt.files && dt.files[0];
      if (file && file.type && file.type.startsWith('image/')) {
        // set file to input to reuse existing flow
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        avatarFile.files = dataTransfer.files;
        previewAvatar(file);
      }
    } catch {}
  });

  

  

  async function ensureSession() {
    if (!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    return session || null;
  }

  async function uploadAvatarIfAny(userId) {
    const f = avatarFile?.files?.[0];
    if (!sb || !f) return null;
    const ext = getExtFromName(f.name, 'jpg');
    const path = `avatars/${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from('avatars').upload(path, f, {
      cacheControl: '3600',
      upsert: true,
    });
    if (upErr) throw upErr;
    const { data: pub } = sb.storage.from('avatars').getPublicUrl(path);
    return pub?.publicUrl || null;
  }

  async function init() {
    if (!sb) {
      obGate.hidden = false;
      return;
    }
    try {
      const session = await ensureSession();
      if (!session) {
        obGate.hidden = false;
        return;
      }
      // Have session -> show form and prefill name from metadata/email
      const md = session.user?.user_metadata || {};
      fullName.value = md.display_name || md.name || '';
      if (phoneInput) phoneInput.value = md.phone || '';
      if (currentEmailReadout) {
        const emailVal = session.user?.email || '—';
        if ('value' in currentEmailReadout) {
          currentEmailReadout.value = emailVal;
        } else {
          currentEmailReadout.textContent = emailVal;
        }
      }
      if (positionReadout) positionReadout.textContent = md.position || '—';
      if (welcomePosition) welcomePosition.textContent = md.position || '—';
      if (!avatarPreview.src) {
        const avatar = md.avatar_url || '';
        if (avatar) avatarPreview.src = avatar;
      }
      obCard.hidden = false;
      // No dynamic name notice
      try { updateStepsUI(); } catch {}
    } catch {
      obGate.hidden = false;
    }
  }

  async function isAdmin() {
    try {
      const { data: { session } } = await sb.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return false;
      const { data, error } = await sb
        .from('admins')
        .select('user_id,is_admin')
        .eq('user_id', uid)
        .eq('is_admin', true)
        .maybeSingle();
      if (error || !data) return false;
      return !!data.is_admin;
    } catch { return false; }
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (!sb) return;
    // Final save (should be called at step 3)
    // Validate all required data before saving
    const name = fullName.value.trim();
    const phone = (phoneInput?.value || '').trim();
    const pwd = password.value;
    if (!name) { setStatus('error', 'يرجى إدخال الاسم'); return; }
    if (!isTripleName(name)) {
      setStatus('error', 'يجب إدخال الاسم الثلاثي (الاسم الأول واسم الأب واسم العائلة) بدون أرقام أو رموز');
      try { fullName.focus(); } catch {}
      return;
    }
    // password + phone checks (same as previous logic)
    const asciiOnly = /^[\x21-\x7E]+$/.test(pwd);
    if (!asciiOnly) { setStatus('error', 'يُسمح فقط بالأرقام والحروف والرموز الإنجليزية (بدون مسافات)'); return; }
    if (pwd.length < 8) { setStatus('error', 'طول كلمة المرور لا يقل عن 8 خانات'); return; }
    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    if (!(hasLower && hasUpper)) { setStatus('error', 'كلمة المرور يجب أن تحتوي على حرفين على الأقل: كبير وصغير'); return; }
    const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
    if (!hasSymbol) { setStatus('error', 'كلمة المرور يجب أن تحتوي على رمز واحد على الأقل'); return; }
    try { evaluatePasswordStrength(pwd); } catch {}
    if (phone && !/^05\d{8}$/.test(phone)) { setStatus('error', 'صيغة رقم الجوال غير صحيحة (رقم سعودي يبدأ بـ 05 من 10 خانات)'); return; }

    submitBtn.disabled = true;
    setStatus('', 'جارٍ الحفظ...');
    try {
      const { data: { session } } = await sb.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) { setStatus('error', 'انتهت الجلسة. افتح رابط الدعوة من جديد.'); submitBtn.disabled = false; return; }

      // Upload avatar if chosen
      let avatarUrl = null;
      try { avatarUrl = await uploadAvatarIfAny(uid); } catch (e) {
        console.warn('avatar upload failed', e);
      }

      // Update user profile: password + metadata
      const meta = { display_name: name, name };
      if (phone) meta.phone = phone;
      if (avatarUrl) meta.avatar_url = avatarUrl;
      const { error: updErr } = await sb.auth.updateUser({ password: pwd, data: meta });
      if (updErr) throw updErr;

      // Decide destination
      const admin = await isAdmin();
      const dest = admin ? 'admin.html' : '../blogger/dashboard.html';
      setStatus('success', 'تم حفظ البيانات. سيتم تحويلك الآن...');
      setTimeout(() => { location.replace(dest); }, 600);
    } catch (err) {
      setStatus('error', 'فشل الحفظ: ' + (err?.message || 'غير معروف'));
      submitBtn.disabled = false;
    }
  }

  // Step validations used for navigation
  function validateStep1() {
    const name = fullName.value.trim();
    if (!name) { setStatus('error', 'يرجى إدخال الاسم'); return false; }
    if (!isTripleName(name)) {
      setStatus('error', 'يجب إدخال الاسم الثلاثي (الاسم الأول واسم الأب واسم العائلة) بدون أرقام أو رموز');
      try { fullName.focus(); } catch {}
      return false;
    }
    setStatus('', '');
    return true;
  }

  function validateStep2() {
    const phone = (phoneInput?.value || '').trim();
    const pwd = password.value;
    if (!pwd) { setStatus('error', 'يرجى إدخال كلمة المرور'); return false; }
    const asciiOnly = /^[\x21-\x7E]+$/.test(pwd);
    if (!asciiOnly) { setStatus('error', 'يُسمح فقط بالأرقام والحروف والرموز الإنجليزية (بدون مسافات)'); return false; }
    if (pwd.length < 8) { setStatus('error', 'طول كلمة المرور لا يقل عن 8 خانات'); return false; }
    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    if (!(hasLower && hasUpper)) { setStatus('error', 'كلمة المرور يجب أن تحتوي على حرفين على الأقل: كبير وصغير'); return false; }
    const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
    if (!hasSymbol) { setStatus('error', 'كلمة المرور يجب أن تحتوي على رمز واحد على الأقل'); return false; }
    if (phone && !/^05\d{8}$/.test(phone)) { setStatus('error', 'صيغة رقم الجوال غير صحيحة (رقم سعودي يبدأ بـ 05 من 10 خانات)'); return false; }
    setStatus('', '');
    return true;
  }

  submitBtn?.addEventListener('click', handleSubmit);
  // Next/Back navigation
  nextBtn?.addEventListener('click', () => {
    if (currentStep === 1) {
      // Welcome -> Name (no validation)
      goStep(2);
    } else if (currentStep === 2) {
      // Name validation
      if (validateStep1()) goStep(3);
    } else if (currentStep === 3) {
      // Phone + Password validation
      if (validateStep2()) goStep(4);
    }
  });
  backBtn?.addEventListener('click', () => {
    if (currentStep > 1) goStep(currentStep - 1);
  });

  // Form submit: step 1 -> 2, step 2 -> 3, step 3 -> save
  if (obForm) {
    obForm.addEventListener('submit', (e) => {
      if (currentStep === 1) {
        e.preventDefault();
        goStep(2);
      } else if (currentStep === 2) {
        e.preventDefault();
        if (validateStep1()) goStep(3);
      } else if (currentStep === 3) {
        e.preventDefault();
        if (validateStep2()) goStep(4);
      } else {
        handleSubmit(e);
      }
    });
  }

  await init();
  // Initialize strength meter once on load
  try { updatePasswordUI(); } catch {}
})();
