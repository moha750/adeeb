// activate.js - منطق تفعيل حساب العضو

const sb = window.sbClient;

// عناصر DOM
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const successState = document.getElementById('successState');
const formState = document.getElementById('formState');
const errorMessage = document.getElementById('errorMessage');
const errorDetails = document.getElementById('errorDetails');
const memberInfo = document.getElementById('memberInfo');
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

  await verifyInvitation(token);
});

// التحقق من صلاحية الدعوة
async function verifyInvitation(token) {
  try {
    // جلب بيانات الدعوة
    const { data: invitation, error } = await sb
      .from('member_invitations')
      .select(`
        *,
        members (
          id,
          full_name,
          email,
          phone,
          committee,
          college,
          major,
          degree
        )
      `)
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single();

    if (error || !invitation) {
      showError('رابط غير صالح', 'لم يتم العثور على دعوة صالحة بهذا الرمز');
      return;
    }

    // التحقق من انتهاء الصلاحية
    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();

    if (expiresAt < now) {
      showError('انتهت صلاحية الرابط', 'هذا الرابط منتهي الصلاحية. يرجى طلب دعوة جديدة من الإدارة');
      
      // تحديث حالة الدعوة إلى منتهية
      await sb
        .from('member_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);
      
      return;
    }

    // التحقق من أن العضو لم يفعل حسابه مسبقاً
    if (invitation.members.user_id) {
      showError('الحساب مفعل مسبقاً', 'هذا الحساب تم تفعيله من قبل. يمكنك تسجيل الدخول مباشرة');
      return;
    }

    // حفظ بيانات الدعوة وعرض النموذج
    invitationData = invitation;
    displayMemberInfo(invitation.members);
    showForm();

  } catch (err) {
    console.error('Error verifying invitation:', err);
    showError('حدث خطأ', err.message || 'حدث خطأ أثناء التحقق من الدعوة');
  }
}

// عرض معلومات العضو
function displayMemberInfo(member) {
  const infoHTML = `
    <div class="member-info-item">
      <i class="fas fa-user"></i>
      <strong>الاسم:</strong> ${member.full_name || '—'}
    </div>
    <div class="member-info-item">
      <i class="fas fa-envelope"></i>
      <strong>البريد:</strong> ${member.email || '—'}
    </div>
    ${member.committee ? `
      <div class="member-info-item">
        <i class="fas fa-users"></i>
        <strong>اللجنة:</strong> ${member.committee}
      </div>
    ` : ''}
    ${member.college ? `
      <div class="member-info-item">
        <i class="fas fa-building"></i>
        <strong>الكلية:</strong> ${member.college}
      </div>
    ` : ''}
  `;
  memberInfo.innerHTML = infoHTML;
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
    strengthText.textContent = 'قوية';
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
    // إنشاء حساب في Supabase Auth
    // تعطيل تأكيد البريد الإلكتروني لأن العضو مدعو بالفعل
    const { data: authData, error: signUpError } = await sb.auth.signUp({
      email: invitationData.email,
      password: password,
      options: {
        emailRedirectTo: window.location.origin + '/members/dashboard.html',
        data: {
          display_name: invitationData.members.full_name,
          member_id: invitationData.member_id,
          role: 'member'
        }
      }
    });

    if (signUpError) {
      throw signUpError;
    }

    if (!authData.user) {
      throw new Error('فشل إنشاء الحساب');
    }

    // ربط user_id بجدول members
    const { error: updateError } = await sb
      .from('members')
      .update({
        user_id: authData.user.id,
        account_status: 'active',
        account_activated_at: new Date().toISOString()
      })
      .eq('id', invitationData.member_id);

    if (updateError) {
      throw updateError;
    }

    // تحديث حالة الدعوة
    const { error: invitationError } = await sb
      .from('member_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitationData.id);

    if (invitationError) {
      console.warn('Failed to update invitation status:', invitationError);
    }

    // تسجيل النشاط
    try {
      await sb.from('member_activity_log').insert({
        member_id: invitationData.member_id,
        user_id: authData.user.id,
        activity_type: 'account_activated',
        activity_details: { method: 'invitation' }
      });
    } catch (logError) {
      console.warn('Failed to log activity:', logError);
    }

    // عرض رسالة النجاح
    showSuccess();

  } catch (err) {
    console.error('Activation error:', err);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-check"></i> تفعيل الحساب';
    
    let errorMsg = 'حدث خطأ أثناء تفعيل الحساب';
    
    // معالجة أخطاء محددة
    if (err.message.includes('rate limit') || err.message.includes('Too Many Requests') || err.status === 429) {
      errorMsg = 'تم تجاوز الحد المسموح من المحاولات. يرجى الانتظار 5-10 دقائق ثم المحاولة مرة أخرى.';
      // إضافة معلومات إضافية للمطورين
      console.warn('Rate limit exceeded. Please wait before retrying or increase email_sent in supabase/config.toml');
    } else if (err.message.includes('already registered') || err.message.includes('User already registered')) {
      errorMsg = 'هذا البريد الإلكتروني مسجل مسبقاً. يمكنك تسجيل الدخول مباشرة.';
    } else if (err.message.includes('password')) {
      errorMsg = 'كلمة المرور غير صالحة. يرجى التأكد من استيفاء جميع المتطلبات.';
    } else if (err.message.includes('email')) {
      errorMsg = 'البريد الإلكتروني غير صالح';
    } else if (err.message.includes('network') || err.message.includes('fetch')) {
      errorMsg = 'خطأ في الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.';
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
      <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
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
  window.location.href = 'dashboard.html';
});
