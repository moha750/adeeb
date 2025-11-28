// ============================================
// activate.js - منطق تفعيل حساب إداري
// ============================================

const sb = window.sbClient;

// عناصر DOM
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const successState = document.getElementById('successState');
const formState = document.getElementById('formState');
const errorMessage = document.getElementById('errorMessage');
const errorDetails = document.getElementById('errorDetails');
const adminInfo = document.getElementById('adminInfo');
const activationForm = document.getElementById('activationForm');
const formAlert = document.getElementById('formAlert');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const submitBtn = document.getElementById('submitBtn');
const goToDashboardBtn = document.getElementById('goToDashboardBtn');
const strengthBar = document.getElementById('strengthBar');
const strengthText = document.getElementById('strengthText');

// أزرار إظهار/إخفاء كلمة المرور
const passwordToggle = document.getElementById('passwordToggle');
const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');

let invitationData = null;
let invitationToken = null;

// أسماء المستويات الإدارية
const ADMIN_LEVELS = {
  1: 'رئيس النادي',
  2: 'نائب الرئيس',
  3: 'قائد لجنة',
  4: 'مسؤول إداري',
  5: 'رئيس تنفيذي'
};

// أسماء الصلاحيات بالعربية
const PERMISSIONS_AR = {
  stats: 'الإحصائيات',
  home: 'الصفحة الرئيسية',
  members: 'الأعضاء',
  idea_board: 'لوحة الأفكار',
  profile: 'الملف الشخصي',
  works: 'الأعمال',
  sponsors: 'الرعاة',
  achievements: 'الإنجازات',
  board: 'مجلس الإدارة',
  faq: 'الأسئلة الشائعة',
  schedule: 'الجدول الزمني',
  chat: 'المحادثات',
  todos: 'المهام',
  testimonials: 'الشهادات',
  admins: 'إدارة الإداريين',
  membership_apps: 'طلبات العضوية',
  appointments: 'المواعيد',
  push: 'الإشعارات',
  join: 'الانضمام',
  forms: 'النماذج'
};

// التحقق من الدعوة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
  if (!sb) {
    showError('خطأ في الاتصال', 'لا يمكن الاتصال بقاعدة البيانات');
    return;
  }

  // قراءة التوكن من الرابط
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    showError('رابط غير صالح', 'لم يتم العثور على رمز التفعيل في الرابط');
    return;
  }

  invitationToken = token;
  await verifyInvitation(token);
});

// التحقق من صلاحية الدعوة
async function verifyInvitation(token) {
  try {
    console.log('🔍 Verifying admin invitation...');

    // استدعاء Edge Function للتحقق
    const response = await fetch(`${sb.supabaseUrl}/functions/v1/verify-admin-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sb.supabaseKey}`,
        'apikey': sb.supabaseKey
      },
      body: JSON.stringify({ token })
    });

    const result = await response.json();

    if (!response.ok || !result.valid) {
      showError(
        result.error || 'رابط غير صالح',
        result.details || 'لم يتم العثور على دعوة صالحة بهذا الرمز'
      );
      return;
    }

    console.log('✅ Invitation is valid:', result);

    // حفظ بيانات الدعوة وعرض النموذج
    invitationData = result;
    displayAdminInfo(result.admin, result.invitation);
    showForm();

  } catch (err) {
    console.error('Error verifying invitation:', err);
    showError('حدث خطأ', err.message || 'حدث خطأ أثناء التحقق من الدعوة');
  }
}

// عرض معلومات الإداري
function displayAdminInfo(admin, invitation) {
  // حساب عدد الصلاحيات
  const permissionsCount = admin.permissions_count || 0;
  const permissionsList = admin.permissions_list || [];

  // تحويل قائمة الصلاحيات إلى HTML
  let permissionsHTML = '';
  if (permissionsList.length > 0) {
    permissionsHTML = `
      <div class="permissions-box">
        <h4>
          <i class="fas fa-key"></i>
          الصلاحيات الممنوحة (${permissionsCount})
        </h4>
        <div class="permissions-grid">
          ${permissionsList.map(perm => `
            <div class="permission-item">
              <i class="fas fa-check-circle"></i>
              <span>${PERMISSIONS_AR[perm] || perm}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // معلومات من أرسل الدعوة
  let invitedByHTML = '';
  if (invitation.invited_by_name) {
    invitedByHTML = `
      <div class="invited-by-box">
        <p>
          <i class="fas fa-user-shield"></i>
          تمت دعوتك بواسطة: <strong>${invitation.invited_by_name}</strong>
          ${invitation.invited_by_position ? `(${invitation.invited_by_position})` : ''}
        </p>
      </div>
    `;
  }

  // حساب الوقت المتبقي
  const hoursRemaining = invitation.hours_remaining || 0;
  const daysRemaining = Math.floor(hoursRemaining / 24);
  let timeRemainingText = '';
  if (daysRemaining > 0) {
    timeRemainingText = `${daysRemaining} ${daysRemaining === 1 ? 'يوم' : 'أيام'}`;
  } else {
    timeRemainingText = `${hoursRemaining} ${hoursRemaining === 1 ? 'ساعة' : 'ساعات'}`;
  }

  const infoHTML = `
    <div class="admin-info-header">
      <i class="fas fa-id-card"></i>
      <h3>معلومات الحساب الإداري</h3>
    </div>
    
    <div class="admin-info-item">
      <i class="fas fa-user"></i>
      <strong>الاسم:</strong> ${admin.full_name || '—'}
    </div>
    
    <div class="admin-info-item">
      <i class="fas fa-envelope"></i>
      <strong>البريد:</strong> ${admin.email || '—'}
    </div>
    
    ${admin.phone ? `
      <div class="admin-info-item">
        <i class="fas fa-phone"></i>
        <strong>الجوال:</strong> ${admin.phone}
      </div>
    ` : ''}
    
    <div class="admin-info-item">
      <i class="fas fa-briefcase"></i>
      <strong>المسمى:</strong> ${admin.position || '—'}
    </div>
    
    <div class="admin-info-item">
      <i class="fas fa-layer-group"></i>
      <strong>المستوى:</strong>
      <span class="admin-level-badge">
        ${admin.admin_level_ar || ADMIN_LEVELS[admin.admin_level] || 'غير محدد'}
      </span>
    </div>
    
    <div class="admin-info-item">
      <i class="fas fa-clock"></i>
      <strong>صالح لمدة:</strong> ${timeRemainingText}
    </div>
    
    ${permissionsHTML}
    ${invitedByHTML}
  `;

  adminInfo.innerHTML = infoHTML;
}

// إظهار/إخفاء كلمة المرور
passwordToggle.addEventListener('click', () => {
  togglePasswordVisibility(passwordInput, passwordToggle);
});

confirmPasswordToggle.addEventListener('click', () => {
  togglePasswordVisibility(confirmPasswordInput, confirmPasswordToggle);
});

function togglePasswordVisibility(input, button) {
  const icon = button.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  }
}

// تقييم قوة كلمة المرور
passwordInput.addEventListener('input', () => {
  const password = passwordInput.value;
  evaluatePasswordStrength(password);
  checkPasswordRequirements(password);
});

function evaluatePasswordStrength(password) {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  strengthBar.className = 'strength-bar-fill';
  
  if (strength <= 2) {
    strengthBar.classList.add('weak');
    strengthText.textContent = 'ضعيفة';
    strengthText.style.color = '#ef4444';
  } else if (strength <= 4) {
    strengthBar.classList.add('medium');
    strengthText.textContent = 'متوسطة';
    strengthText.style.color = '#f59e0b';
  } else {
    strengthBar.classList.add('strong');
    strengthText.textContent = 'قوية جداً';
    strengthText.style.color = '#10b981';
  }
}

function checkPasswordRequirements(password) {
  const requirements = {
    'req-length': password.length >= 8,
    'req-upper': /[A-Z]/.test(password),
    'req-lower': /[a-z]/.test(password),
    'req-number': /[0-9]/.test(password),
    'req-special': /[^A-Za-z0-9]/.test(password)
  };

  for (const [id, valid] of Object.entries(requirements)) {
    const element = document.getElementById(id);
    if (valid) {
      element.classList.add('valid');
      element.querySelector('i').className = 'fas fa-check-circle';
    } else {
      element.classList.remove('valid');
      element.querySelector('i').className = 'fas fa-circle';
    }
  }
}

// معالجة إرسال النموذج
activationForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  // التحقق من تطابق كلمات المرور
  if (password !== confirmPassword) {
    showFormAlert('error', 'كلمات المرور غير متطابقة');
    return;
  }

  // التحقق من متطلبات كلمة المرور
  if (!validatePassword(password)) {
    showFormAlert('error', 'كلمة المرور لا تستوفي المتطلبات المطلوبة');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التفعيل...';

  try {
    console.log('🔐 Starting admin account activation...');

    // استدعاء Edge Function للتفعيل
    const response = await fetch(`${sb.supabaseUrl}/functions/v1/activate-admin-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sb.supabaseKey}`,
        'apikey': sb.supabaseKey
      },
      body: JSON.stringify({
        token: invitationToken,
        password: password
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'فشل تفعيل الحساب');
    }

    console.log('✅ Account activated successfully:', result);

    // تسجيل الدخول
    const { error: signInError } = await sb.auth.signInWithPassword({
      email: invitationData.admin.email,
      password: password
    });

    if (signInError) {
      console.warn('⚠️ Auto sign-in failed:', signInError);
      showFormAlert('warning', 'تم تفعيل الحساب بنجاح. يرجى تسجيل الدخول يدوياً.');
      setTimeout(() => {
        window.location.href = '../auth/login.html';
      }, 2000);
      return;
    }

    console.log('✅ Signed in successfully');

    // عرض رسالة النجاح
    showSuccess();

  } catch (err) {
    console.error('❌ Activation error:', err);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-shield-halved"></i> تفعيل الحساب الإداري';
    
    let errorMsg = 'حدث خطأ أثناء تفعيل الحساب';
    
    if (err.message.includes('expired')) {
      errorMsg = 'انتهت صلاحية الدعوة. يرجى طلب دعوة جديدة.';
    } else if (err.message.includes('password')) {
      errorMsg = 'كلمة المرور غير صالحة. يرجى التأكد من استيفاء جميع المتطلبات.';
    } else if (err.message.includes('email')) {
      errorMsg = 'البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول.';
    } else if (err.message) {
      errorMsg = err.message;
    }
    
    showFormAlert('error', errorMsg);
  }
});

// التحقق من صحة كلمة المرور
function validatePassword(password) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

// عرض تنبيه في النموذج
function showFormAlert(type, message) {
  formAlert.innerHTML = `
    <div class="alert ${type}">
      <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  setTimeout(() => {
    formAlert.innerHTML = '';
  }, 5000);
}

// عرض حالة الخطأ
function showError(title, details) {
  loadingState.classList.remove('active');
  formState.classList.remove('active');
  successState.classList.remove('active');
  errorState.classList.add('active');
  
  errorMessage.textContent = title;
  errorDetails.textContent = details;
}

// عرض النموذج
function showForm() {
  loadingState.classList.remove('active');
  errorState.classList.remove('active');
  successState.classList.remove('active');
  formState.classList.add('active');
}

// عرض حالة النجاح
function showSuccess() {
  loadingState.classList.remove('active');
  errorState.classList.remove('active');
  formState.classList.remove('active');
  successState.classList.add('active');
}

// الانتقال إلى لوحة التحكم
goToDashboardBtn.addEventListener('click', () => {
  window.location.href = 'admin.html';
});
