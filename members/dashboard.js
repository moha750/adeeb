// dashboard.js - منطق لوحة تحكم الأعضاء

const sb = window.sbClient;
let currentMember = null;
let currentUser = null;

// عناصر DOM
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const userMenuBtn = document.getElementById('userMenuBtn');
const userMenuDropdown = document.getElementById('userMenuDropdown');
const logoutBtn = document.getElementById('logoutBtn');
const welcomeName = document.getElementById('welcomeName');
const notificationsBadge = document.getElementById('notificationsBadge');

// عناصر الإحصائيات
const eventsAttended = document.getElementById('eventsAttended');
const certificatesEarned = document.getElementById('certificatesEarned');
const memberCommittee = document.getElementById('memberCommittee');
const profileCompletion = document.getElementById('profileCompletion');

// عناصر الملف الشخصي
const profileAvatar = document.getElementById('profileAvatar');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const accountStatusBadge = document.getElementById('accountStatusBadge');
const committeeBadge = document.getElementById('committeeBadge');
const profilePhone = document.getElementById('profilePhone');
const profileCollege = document.getElementById('profileCollege');
const profileMajor = document.getElementById('profileMajor');
const profileDegree = document.getElementById('profileDegree');
const profileAcademicNumber = document.getElementById('profileAcademicNumber');
const profileBirthDate = document.getElementById('profileBirthDate');
const socialLinks = document.getElementById('socialLinks');

// عناصر معلومات الحساب
const accountCreatedAt = document.getElementById('accountCreatedAt');
const accountLastLogin = document.getElementById('accountLastLogin');
const accountStatus = document.getElementById('accountStatus');

// عناصر اكتمال الملف
const completionValue = document.getElementById('completionValue');
const progressCircle = document.getElementById('progressCircle');
const completionMessage = document.getElementById('completionMessage');
const completeProfileBtn = document.getElementById('completeProfileBtn');

// عناصر النشاط
const activityList = document.getElementById('activityList');

// عناصر المودال
const editProfileModal = document.getElementById('editProfileModal');
const editProfileBtn = document.getElementById('editProfileBtn');
const closeEditModal = document.getElementById('closeEditModal');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editProfileForm = document.getElementById('editProfileForm');

// التحقق من تسجيل الدخول عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
  if (!sb) {
    showError('خطأ في الاتصال بقاعدة البيانات');
    return;
  }

  await checkAuth();
});

// التحقق من المصادقة
async function checkAuth() {
  try {
    const { data: { session }, error } = await sb.auth.getSession();

    if (error || !session) {
      redirectToLogin();
      return;
    }

    currentUser = session.user;

    // التحقق من أن المستخدم عضو وليس إداري
    const { data: memberData, error: memberError } = await sb
      .from('members')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();

    if (memberError || !memberData) {
      // التحقق إذا كان إداري
      const { data: adminData } = await sb
        .from('admins')
        .select('user_id, is_admin')
        .eq('user_id', currentUser.id)
        .eq('is_admin', true)
        .maybeSingle();

      if (adminData) {
        // توجيه للوحة الإدارية
        window.location.href = '../admin/admin.html';
        return;
      }

      showError('لم يتم العثور على بيانات العضوية');
      return;
    }

    // التحقق من حالة الحساب
    if (memberData.account_status !== 'active') {
      showError('حسابك غير نشط. يرجى التواصل مع الإدارة');
      return;
    }

    currentMember = memberData;
    await loadDashboard();

  } catch (err) {
    console.error('Auth check error:', err);
    redirectToLogin();
  }
}

// تحميل بيانات لوحة التحكم
async function loadDashboard() {
  try {
    // تحديث معلومات المستخدم في الشريط العلوي
    updateNavbar();

    // تحميل الإحصائيات
    await loadStatistics();

    // تحميل معلومات الملف الشخصي
    loadProfileInfo();

    // تحميل معلومات الحساب
    loadAccountInfo();

    // تحميل النشاط الأخير
    await loadRecentActivity();

    // تسجيل تسجيل الدخول
    await logActivity('login');

  } catch (err) {
    console.error('Error loading dashboard:', err);
    showError('حدث خطأ أثناء تحميل البيانات');
  }
}

// تحديث شريط التنقل
function updateNavbar() {
  const displayName = currentMember.full_name || currentUser.email;
  const avatarUrl = currentMember.avatar_url || getDefaultAvatar();

  userName.textContent = displayName;
  userAvatar.src = avatarUrl;
  userAvatar.alt = displayName;
  welcomeName.textContent = displayName.split(' ')[0];
}

// تحميل الإحصائيات
async function loadStatistics() {
  try {
    // جلب إحصائيات العضو
    const { data: stats } = await sb
      .from('member_statistics')
      .select('*')
      .eq('member_id', currentMember.id)
      .maybeSingle();

    if (stats) {
      eventsAttended.textContent = stats.total_events_attended || 0;
      certificatesEarned.textContent = stats.total_certificates || 0;
    }

    memberCommittee.textContent = currentMember.committee || 'غير محدد';

    // حساب نسبة اكتمال الملف
    const completion = calculateProfileCompletion();
    profileCompletion.textContent = `${completion}%`;
    completionValue.textContent = completion;

    // تحديث دائرة التقدم
    updateProgressCircle(completion);

  } catch (err) {
    console.error('Error loading statistics:', err);
  }
}

// حساب نسبة اكتمال الملف الشخصي
function calculateProfileCompletion() {
  const fields = [
    'full_name', 'email', 'phone', 'college', 'major', 'degree',
    'birth_date', 'committee', 'academic_number', 'national_id',
    'avatar_url', 'x_handle', 'instagram_handle', 'tiktok_handle', 'linkedin_handle'
  ];

  let filledFields = 0;
  fields.forEach(field => {
    if (currentMember[field] && currentMember[field] !== '') {
      filledFields++;
    }
  });

  return Math.round((filledFields / fields.length) * 100);
}

// تحديث دائرة التقدم
function updateProgressCircle(percentage) {
  const circumference = 2 * Math.PI * 52; // 52 هو نصف القطر
  const offset = circumference - (percentage / 100) * circumference;
  progressCircle.style.strokeDashoffset = offset;

  // تحديث الرسالة
  if (percentage === 100) {
    completionMessage.textContent = 'ممتاز! ملفك الشخصي مكتمل';
    completeProfileBtn.style.display = 'none';
  } else if (percentage >= 75) {
    completionMessage.textContent = 'جيد جداً! أكمل بعض التفاصيل الإضافية';
  } else if (percentage >= 50) {
    completionMessage.textContent = 'جيد! أكمل ملفك للحصول على تجربة أفضل';
  } else {
    completionMessage.textContent = 'أكمل ملفك الشخصي للحصول على تجربة أفضل';
  }
}

// تحميل معلومات الملف الشخصي
function loadProfileInfo() {
  profileAvatar.src = currentMember.avatar_url || getDefaultAvatar();
  profileAvatar.alt = currentMember.full_name;
  profileName.textContent = currentMember.full_name || '—';
  profileEmail.textContent = currentMember.email || '—';

  // حالة الحساب
  const statusMap = {
    'active': { text: 'نشط', class: 'badge-success' },
    'pending': { text: 'قيد الانتظار', class: 'badge-warning' },
    'suspended': { text: 'معلق', class: 'badge-danger' },
    'inactive': { text: 'غير نشط', class: 'badge-secondary' }
  };

  const status = statusMap[currentMember.account_status] || statusMap.pending;
  accountStatusBadge.textContent = status.text;
  accountStatusBadge.className = `badge ${status.class}`;

  committeeBadge.textContent = currentMember.committee || 'غير محدد';

  // التفاصيل
  profilePhone.textContent = currentMember.phone || '—';
  profileCollege.textContent = currentMember.college || '—';
  profileMajor.textContent = currentMember.major || '—';
  profileDegree.textContent = currentMember.degree || '—';
  profileAcademicNumber.textContent = currentMember.academic_number || '—';
  profileBirthDate.textContent = currentMember.birth_date ? formatDate(currentMember.birth_date) : '—';

  // روابط التواصل الاجتماعي
  loadSocialLinks();
}

// تحميل روابط التواصل الاجتماعي
function loadSocialLinks() {
  const links = [];

  if (currentMember.x_handle) {
    links.push({
      icon: 'fa-brands fa-x-twitter',
      url: `https://x.com/${currentMember.x_handle.replace('@', '')}`,
      title: 'تويتر'
    });
  }

  if (currentMember.instagram_handle) {
    links.push({
      icon: 'fa-brands fa-instagram',
      url: `https://instagram.com/${currentMember.instagram_handle.replace('@', '')}`,
      title: 'إنستقرام'
    });
  }

  if (currentMember.tiktok_handle) {
    links.push({
      icon: 'fa-brands fa-tiktok',
      url: `https://tiktok.com/@${currentMember.tiktok_handle.replace('@', '')}`,
      title: 'تيك توك'
    });
  }

  if (currentMember.linkedin_handle) {
    links.push({
      icon: 'fa-brands fa-linkedin',
      url: `https://linkedin.com/in/${currentMember.linkedin_handle}`,
      title: 'لينكد إن'
    });
  }

  if (links.length > 0) {
    socialLinks.innerHTML = links.map(link => `
      <a href="${link.url}" target="_blank" class="social-link" title="${link.title}">
        <i class="${link.icon}"></i>
      </a>
    `).join('');
  } else {
    socialLinks.innerHTML = '<p style="color: var(--gray-500); font-size: 14px;">لم يتم إضافة روابط التواصل الاجتماعي</p>';
  }
}

// تحميل معلومات الحساب
function loadAccountInfo() {
  accountCreatedAt.textContent = currentMember.created_at ? formatDate(currentMember.created_at) : '—';
  accountLastLogin.textContent = currentMember.last_login ? formatDate(currentMember.last_login) : '—';
  accountStatus.textContent = currentMember.account_status === 'active' ? 'نشط' : 'غير نشط';
}

// تحميل النشاط الأخير
async function loadRecentActivity() {
  try {
    const { data: activities, error } = await sb
      .from('member_activity_log')
      .select('*')
      .eq('member_id', currentMember.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (activities && activities.length > 0) {
      activityList.innerHTML = activities.map(activity => {
        const activityInfo = getActivityInfo(activity.activity_type);
        return `
          <div class="activity-item">
            <div class="activity-icon" style="background: ${activityInfo.color}20; color: ${activityInfo.color};">
              <i class="${activityInfo.icon}"></i>
            </div>
            <div class="activity-content">
              <div class="activity-title">${activityInfo.title}</div>
              <div class="activity-time">${formatRelativeTime(activity.created_at)}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error loading activity:', err);
  }
}

// معلومات النشاط
function getActivityInfo(type) {
  const activityMap = {
    'login': { icon: 'fas fa-right-to-bracket', title: 'تسجيل دخول', color: '#10b981' },
    'logout': { icon: 'fas fa-right-from-bracket', title: 'تسجيل خروج', color: '#6b7280' },
    'profile_update': { icon: 'fas fa-user-edit', title: 'تحديث الملف الشخصي', color: '#3b82f6' },
    'password_change': { icon: 'fas fa-key', title: 'تغيير كلمة المرور', color: '#f59e0b' },
    'account_activated': { icon: 'fas fa-check-circle', title: 'تفعيل الحساب', color: '#10b981' }
  };

  return activityMap[type] || { icon: 'fas fa-circle', title: 'نشاط', color: '#6b7280' };
}

// تسجيل النشاط
async function logActivity(activityType, details = null) {
  try {
    await sb.from('member_activity_log').insert({
      member_id: currentMember.id,
      user_id: currentUser.id,
      activity_type: activityType,
      activity_details: details
    });

    // تحديث آخر تسجيل دخول
    if (activityType === 'login') {
      await sb
        .from('members')
        .update({ last_login: new Date().toISOString() })
        .eq('id', currentMember.id);
    }
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}

// قائمة المستخدم
userMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const userMenu = document.querySelector('.user-menu');
  userMenu.classList.toggle('active');
});

document.addEventListener('click', () => {
  const userMenu = document.querySelector('.user-menu');
  userMenu.classList.remove('active');
});

// تسجيل الخروج
logoutBtn.addEventListener('click', async () => {
  try {
    await logActivity('logout');
    await sb.auth.signOut();
    window.location.href = '../auth/login.html';
  } catch (err) {
    console.error('Logout error:', err);
    showError('حدث خطأ أثناء تسجيل الخروج');
  }
});

// فتح مودال التعديل
editProfileBtn.addEventListener('click', () => {
  openEditModal();
});

completeProfileBtn.addEventListener('click', () => {
  openEditModal();
});

// إغلاق المودال
closeEditModal.addEventListener('click', () => {
  closeModal();
});

cancelEditBtn.addEventListener('click', () => {
  closeModal();
});

editProfileModal.querySelector('.modal-overlay').addEventListener('click', () => {
  closeModal();
});

// فتح مودال التعديل
function openEditModal() {
  // ملء النموذج بالبيانات الحالية
  document.getElementById('editFullName').value = currentMember.full_name || '';
  document.getElementById('editEmail').value = currentMember.email || '';
  document.getElementById('editPhone').value = currentMember.phone || '';
  document.getElementById('editCollege').value = currentMember.college || '';
  document.getElementById('editMajor').value = currentMember.major || '';
  document.getElementById('editDegree').value = currentMember.degree || '';
  document.getElementById('editBirthDate').value = currentMember.birth_date || '';
  document.getElementById('editAcademicNumber').value = currentMember.academic_number || '';
  document.getElementById('editNationalId').value = currentMember.national_id || '';
  document.getElementById('editXHandle').value = currentMember.x_handle || '';
  document.getElementById('editInstagramHandle').value = currentMember.instagram_handle || '';
  document.getElementById('editTiktokHandle').value = currentMember.tiktok_handle || '';
  document.getElementById('editLinkedinHandle').value = currentMember.linkedin_handle || '';

  editProfileModal.classList.add('active');
}

// إغلاق المودال
function closeModal() {
  editProfileModal.classList.remove('active');
}

// حفظ التعديلات
editProfileForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = editProfileForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

  try {
    const updatedData = {
      phone: document.getElementById('editPhone').value.trim(),
      college: document.getElementById('editCollege').value.trim(),
      major: document.getElementById('editMajor').value.trim(),
      degree: document.getElementById('editDegree').value,
      birth_date: document.getElementById('editBirthDate').value,
      academic_number: document.getElementById('editAcademicNumber').value.trim(),
      national_id: document.getElementById('editNationalId').value.trim(),
      x_handle: document.getElementById('editXHandle').value.trim(),
      instagram_handle: document.getElementById('editInstagramHandle').value.trim(),
      tiktok_handle: document.getElementById('editTiktokHandle').value.trim(),
      linkedin_handle: document.getElementById('editLinkedinHandle').value.trim()
    };

    const { error } = await sb
      .from('members')
      .update(updatedData)
      .eq('id', currentMember.id);

    if (error) throw error;

    // تحديث البيانات المحلية
    currentMember = { ...currentMember, ...updatedData };

    // تسجيل النشاط
    await logActivity('profile_update');

    // إعادة تحميل البيانات
    loadProfileInfo();
    await loadStatistics();

    // إغلاق المودال
    closeModal();

    // عرض رسالة نجاح
    Swal.fire({
      icon: 'success',
      title: 'تم الحفظ بنجاح',
      text: 'تم تحديث معلومات ملفك الشخصي',
      confirmButtonText: 'حسناً',
      confirmButtonColor: '#667eea'
    });

  } catch (err) {
    console.error('Error updating profile:', err);
    Swal.fire({
      icon: 'error',
      title: 'حدث خطأ',
      text: 'فشل تحديث الملف الشخصي. يرجى المحاولة مرة أخرى',
      confirmButtonText: 'حسناً',
      confirmButtonColor: '#ef4444'
    });
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التغييرات';
  }
});

// دوال مساعدة
function redirectToLogin() {
  window.location.href = '../auth/login.html?redirect=members/dashboard.html';
}

function showError(message) {
  Swal.fire({
    icon: 'error',
    title: 'خطأ',
    text: message,
    confirmButtonText: 'حسناً',
    confirmButtonColor: '#ef4444'
  }).then(() => {
    redirectToLogin();
  });
}

function getDefaultAvatar() {
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23e5e7eb"/%3E%3Ccircle cx="50" cy="40" r="16" fill="%239ca3af"/%3E%3Cpath d="M20 85c5-15 15-20 30-20s25 5 30 20" fill="%239ca3af"/%3E%3C/svg%3E';
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatRelativeTime(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`;
  if (hours > 0) return `منذ ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
  if (minutes > 0) return `منذ ${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}`;
  return 'الآن';
}
