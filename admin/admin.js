// إعدادات Supabase

const supabaseUrl = 'https://ihawihvbhynxexawjajz.supabase.co';

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYXdpaHZiaHlueGV4YXdqYWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MzgyOTksImV4cCI6MjA2MzQxNDI5OX0.19-qWfJUqv8Y5WYkts36dXsx_kxDBCGbJDBnx2hQUNg';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// متغيرات التطبيق

let isEditing = false;

let currentEditingId = null;

let isDraft = false;

let scheduledNewsCheckInterval = null;

let editors = [];

let photographers = [];

let tags = [];

// متغيرات الحفظ التلقائي

let autoSaveInterval;

let autoSaveEnabled = true;

const AUTO_SAVE_INTERVAL = 30000; // 30 ثانية

let lastSavedContent = '';

let lastSavedTitle = '';

let lastSavedImage = null;

// عناصر واجهة المستخدم

const adminContent = document.getElementById('adminContent');

const logoutBtn = document.getElementById('logoutBtn');

const saveDraftBtn = document.getElementById('saveDraftBtn');

const publishBtn = document.querySelector('button[name="publish"]');

// عناصر إدارة الأعضاء
const membersSearch = document.getElementById('membersSearch');
const membersFilter = document.getElementById('membersFilter');
const membersGrid = document.querySelector('.members-grid');
const memberForm = document.getElementById('memberForm');
const memberModal = document.getElementById('memberModal');

// وظائف إدارة الأعضاء

// تحميل قائمة الأعضاء
async function loadMembers(filter = '') {
    try {
        let query = supabaseClient
            .from('members')
            .select('*');

        // تطبيق الفلتر
        if (filter === 'active') {
            query = query.eq('status', 'active');
        } else if (filter === 'inactive') {
            query = query.eq('status', 'inactive');
        }

        const { data, error } = await query;
        
        if (error) throw error;
        
        displayMembers(data);
    } catch (error) {
        console.error('خطأ في تحميل الأعضاء:', error);
        alert('حدث خطأ أثناء تحميل الأعضاء');
    }
}

// عرض الأعضاء في الشبكة
function displayMembers(members) {
    membersGrid.innerHTML = members.map(member => `
        <div class="member-card">
            <div class="member-info">
                <h3>${member.full_name}</h3>
                <div class="member-details">
                    <div class="detail-item">
                        <i class="fas fa-id-card"></i>
                        <span>رقم العضو: ${member.id}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-envelope"></i>
                        <span>البريد الإلكتروني: ${member.email}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-phone"></i>
                        <span>رقم الهاتف: ${member.phone}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-university"></i>
                        <span>التخصص: ${member.college_major}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-graduation-cap"></i>
                        <span>المستوى الدراسي: ${member.academic_level}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-number"></i>
                        <span>رقم الطالب: ${member.academic_number}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-id-card"></i>
                        <span>رقم الهوية: ${member.national_id}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>تاريخ الميلاد: ${member.birth_date}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-users"></i>
                        <span>اللجنة: ${member.committee}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fab fa-twitter"></i>
                        <span>تويتر: ${member.twitter}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fab fa-instagram"></i>
                        <span>إنستغرام: ${member.instagram}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fab fa-tiktok"></i>
                        <span>تيك توك: ${member.tiktok}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-paint-brush"></i>
                        <span>اللون الرئيسي: ${member.primary_color}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-paint-brush"></i>
                        <span>اللون الثانوي: ${member.secondary_color}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-clock"></i>
                        <span>تاريخ الإنشاء: ${new Date(member.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                </div>
            </div>
            <div class="member-actions">
                <button onclick="editMember('${member.id}')" class="edit-btn">
                    <i class="fas fa-edit"></i> تعديل
                </button>
                <button onclick="deleteMember('${member.id}')" class="delete-btn">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </div>
        </div>
    `).join('');
}

// إضافة عضو جديد
async function addMember(memberData) {
    try {
        const { data, error } = await supabaseClient
            .from('members')
            .insert([memberData]);

        if (error) throw error;
        
        alert('تم إضافة العضو بنجاح');
        memberModal.style.display = 'none';
        loadMembers();
    } catch (error) {
        console.error('خطأ في إضافة العضو:', error);
        alert('حدث خطأ أثناء إضافة العضو');
    }
}

// تعديل عضو
async function editMember(memberId) {
    try {
        const { data, error } = await supabaseClient
            .from('members')
            .select('*')
            .eq('id', memberId)
            .single();

        if (error) throw error;

        // ملء النموذج بالبيانات الحالية
        memberForm.elements.memberName.value = data.full_name;
        memberForm.elements.memberEmail.value = data.email;
        memberForm.elements.memberPhone.value = data.phone;
        memberForm.elements.memberAcademicNumber.value = data.academic_number;
        memberForm.elements.memberNationalId.value = data.national_id;
        memberForm.elements.memberCollegeMajor.value = data.college_major;
        memberForm.elements.memberAcademicLevel.value = data.academic_level;
        memberForm.elements.memberBirthDate.value = data.birth_date;
        memberForm.elements.memberCommittee.value = data.committee;
        memberForm.elements.memberTwitter.value = data.twitter;
        memberForm.elements.memberInstagram.value = data.instagram;
        memberForm.elements.memberTiktok.value = data.tiktok;
        memberForm.elements.memberPrimaryColor.value = data.primary_color;
        memberForm.elements.memberSecondaryColor.value = data.secondary_color;

        memberModal.style.display = 'block';
    } catch (error) {
        console.error('خطأ في تحميل بيانات العضو:', error);
        alert('حدث خطأ أثناء تحميل بيانات العضو');
    }
}

// حذف عضو
async function deleteMember(memberId) {
    if (!confirm('هل أنت متأكد من حذف هذا العضو؟')) return;

    try {
        const { error } = await supabaseClient
            .from('members')
            .delete()
            .eq('id', memberId);

        if (error) throw error;
        
        alert('تم حذف العضو بنجاح');
        loadMembers();
    } catch (error) {
        console.error('خطأ في حذف العضو:', error);
        alert('حدث خطأ أثناء حذف العضو');
    }
}

// إضافة مستمعي الأحداث
membersSearch.addEventListener('input', (e) => {
    // البحث عن طريق اسم العضو أو البريد الإلكتروني
    loadMembers();
});

membersFilter.addEventListener('change', (e) => {
    loadMembers(e.target.value);
});

memberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        full_name: memberForm.elements.memberName.value,
        email: memberForm.elements.memberEmail.value,
        phone: memberForm.elements.memberPhone.value,
        academic_number: memberForm.elements.memberAcademicNumber.value,
        national_id: memberForm.elements.memberNationalId.value,
        college_major: memberForm.elements.memberCollegeMajor.value,
        academic_level: memberForm.elements.memberAcademicLevel.value,
        birth_date: memberForm.elements.memberBirthDate.value,
        committee: memberForm.elements.memberCommittee.value,
        twitter: memberForm.elements.memberTwitter.value,
        instagram: memberForm.elements.memberInstagram.value,
        tiktok: memberForm.elements.memberTiktok.value,
        primary_color: memberForm.elements.memberPrimaryColor.value,
        secondary_color: memberForm.elements.memberSecondaryColor.value
    };

    await addMember(formData);
});

// تحميل الأعضاء عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    loadMembers();
});

const draftsContainer = document.getElementById('draftsContainer');

const deleteSelectedDraftsBtn = document.getElementById('deleteSelectedDraftsBtn');

const selectAllDraftsBtn = document.getElementById('selectAllDraftsBtn');

const adminNewsContainer = document.getElementById('adminNewsContainer');

const scheduledNewsContainer = document.getElementById('scheduledNewsContainer');

const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');

const selectAllBtn = document.getElementById('selectAllBtn');

const newsTagsInput = document.getElementById('newsTags');

const tagsContainer = document.getElementById('tagsContainer');

const addTagBtn = document.getElementById('addTagBtn');

const editorsInput = document.getElementById('newsEditors');

const addEditorBtn = document.getElementById('addEditorBtn');

const photographersInput = document.getElementById('newsPhotographers');

const addPhotographerBtn = document.getElementById('addPhotographerBtn');

// ========== نظام المصادقة ==========

logoutBtn.addEventListener('click', async (e) => {

  e.preventDefault();

  await supabaseClient.auth.signOut();

  window.location.href = "../auth/auth.html";

});

async function checkAuth() {

  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {

    window.location.href = "../auth/auth.html";

  } else {

    const { data: profile, error } = await supabaseClient

      .from('profiles')

      .select('role')

      .eq('id', user.id)

      .single();

    if (error) {

      alert('حدث خطأ في تحميل صلاحيات المستخدم');

      await supabaseClient.auth.signOut();

      window.location.href = "../auth/auth.html";

      return;

    }

    window.currentUserRole = profile?.role || 'editor';

    if (window.currentUserRole === 'editor') {

      document.querySelectorAll('.delete').forEach(el => el.style.display = 'none');

      document.querySelector('.menu-item[data-tab="manage-users"]').style.display = 'none';

      document.querySelectorAll('.edit, .menu-item[data-tab="add-news"]').forEach(el => el.style.display = 'inline-flex');

    } else if (window.currentUserRole === 'admin') {

      document.querySelectorAll('.edit, .delete, .menu-item[data-tab="add-news"]').forEach(el => el.style.display = 'inline-flex');

      document.querySelector('.menu-item[data-tab="manage-users"]').style.display = 'inline-flex';

    } else {

      window.currentUserRole = 'editor';

      document.querySelectorAll('.delete').forEach(el => el.style.display = 'none');

      document.querySelector('.menu-item[data-tab="manage-users"]').style.display = 'none';

      document.querySelectorAll('.edit, .menu-item[data-tab="add-news"]').forEach(el => el.style.display = 'inline-flex');

    }

    adminContent.style.display = 'block';

    logoutBtn.style.display = 'inline-block';

    await loadDashboardStats();

    await displayAdminNews();

    await displayDrafts();

    await displayScheduledNews();

    startScheduledNewsChecker();

    if (window.currentUserRole === 'admin') {

      await loadUsers();

      await displayPendingNews();

    }

    // تحميل بيانات الملف الشخصي

    await loadUserProfile();

    startAutoSave();

  }

}

checkAuth();

// ========== نظام المسودات ==========

saveDraftBtn.addEventListener('click', async (e) => {

  e.preventDefault();

  try {

    await saveNewsDraft(false);

  } catch (error) {

    alert('حدث خطأ أثناء حفظ المسودة: ' + error.message);

  }

});

async function saveNewsDraft(isAutoSave = false) {

  const title = document.getElementById('newsTitle').value.trim();

  const content = document.getElementById('newsContent').innerHTML.trim();

  const imageFile = document.getElementById('newsImageFile').files[0];

  if (!title && !content) {

    if (!isAutoSave) alert('يجب إدخال عنوان أو محتوى للحفظ كمسودة');

    return;

  }

  try {

    if (!isAutoSave) {

      saveDraftBtn.disabled = true;

      saveDraftBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    }

    let imageUrl = lastSavedImage;

    if (imageFile) {

      const compressedFile = await compressImage(imageFile);

      imageUrl = await uploadToCloudinary(compressedFile);

    }

    const { data: { user } } = await supabaseClient.auth.getUser();

    const editorsStr = editors.join(',');

    const photographersStr = photographers.join(',');

    const draftData = {

      title,

      content,

      image_url: imageUrl,

      editors: editorsStr,

      photographers: photographersStr,

      updated_at: new Date(),

      author_id: user.id

    };

    if (isEditing && currentEditingId) {

      const { error } = await supabaseClient

        .from('drafts')

        .update(draftData)

        .eq('id', currentEditingId);

      if (error) throw error;

      if (!isAutoSave) alert('تم تحديث المسودة بنجاح');

    } else {

      draftData.created_at = new Date();

      const { data, error } = await supabaseClient.from('drafts').insert([draftData]).select();

      if (error) throw error;

      if (data && data.length > 0) {

        isEditing = true;

        currentEditingId = data[0].id;

      }

      if (!isAutoSave) alert('تم حفظ المسودة بنجاح');

    }

    if (!isAutoSave) {

      resetForm();

    }

    lastSavedTitle = title;

    lastSavedContent = content;

    lastSavedImage = imageUrl;

    await displayDrafts();

  } catch (error) {

    console.error('Error saving draft:', error);

    if (!isAutoSave) alert('حدث خطأ أثناء حفظ المسودة');

  } finally {

    if (!isAutoSave) {

      saveDraftBtn.disabled = false;

      saveDraftBtn.innerHTML = 'حفظ كمسودة';

    }

  }

}

async function displayDrafts() {

  draftsContainer.innerHTML = '<div class="loading">جاري تحميل المسودات...</div>';

  try {

    const { data: { user } } = await supabaseClient.auth.getUser();

    const { data: drafts, error } = await supabaseClient

      .from('drafts')

      .select('*')

      .eq('author_id', user.id)

      .order('updated_at', { ascending: false });

    if (error) throw error;

    draftsContainer.innerHTML = '';

    if (!drafts || drafts.length === 0) {

      draftsContainer.innerHTML = '<p class="no-items">لا توجد مسودات محفوظة</p>';

      deleteSelectedDraftsBtn.disabled = true;

      return;

    }

    drafts.forEach(draft => {

      const draftEl = document.createElement('div');

      draftEl.className = 'draft-item';

      draftEl.innerHTML = `

<input type="checkbox" class="draft-select-checkbox" data-id="${draft.id}" style="margin-left: 10px;">

<h3>${draft.title || 'بدون عنوان'}</h3>

<p>${draft.content ? draft.content.substring(0, 100) + '...' : 'لا يوجد محتوى'}</p>

${draft.image_url ? `<img src="${draft.image_url}" alt="صورة المسودة" class="draft-image">` : ''}

<div class="draft-meta">

<small>آخر تعديل: ${formatDate(draft.updated_at)}</small>

</div>

<div class="draft-actions">

<button class="edit-btn" data-id="${draft.id}"><i class="fas fa-edit"></i> تعديل</button>

<button class="publish-btn" data-id="${draft.id}"><i class="fas fa-paper-plane"></i> نشر</button>

<button class="delete-btn" data-id="${draft.id}"><i class="fas fa-trash"></i> حذف</button>

</div>

`;

      draftsContainer.appendChild(draftEl);

    });

    draftsContainer.querySelectorAll('.edit-btn').forEach(button => {

      button.addEventListener('click', (e) => {

        const draftId = e.currentTarget.getAttribute('data-id');

        loadDraftToEditor(draftId);

      });

    });

    draftsContainer.querySelectorAll('.publish-btn').forEach(button => {

      button.addEventListener('click', (e) => {

        const draftId = e.currentTarget.getAttribute('data-id');

        publishDraft(draftId);

      });

    });

    draftsContainer.querySelectorAll('.delete-btn').forEach(button => {

      button.addEventListener('click', (e) => {

        const draftId = e.currentTarget.getAttribute('data-id');

        deleteDraft(draftId);

      });

    });

    updateDeleteDraftsBtnState();

  } catch (error) {

    draftsContainer.innerHTML = '<p class="error">حدث خطأ أثناء تحميل المسودات</p>';

  }

}

function updateDeleteDraftsBtnState() {

  const anyChecked = draftsContainer.querySelectorAll('.draft-select-checkbox:checked').length > 0;

  deleteSelectedDraftsBtn.disabled = !anyChecked;

}

draftsContainer.addEventListener('change', (e) => {

  if (e.target.classList.contains('draft-select-checkbox')) {

    updateDeleteDraftsBtnState();

  }

});

selectAllDraftsBtn.addEventListener('click', () => {

  const checkboxes = draftsContainer.querySelectorAll('.draft-select-checkbox');

  const allChecked = Array.from(checkboxes).every(cb => cb.checked);

  checkboxes.forEach(cb => cb.checked = !allChecked);

  updateDeleteDraftsBtnState();

});

deleteSelectedDraftsBtn.addEventListener('click', async () => {

  const selectedIds = Array.from(draftsContainer.querySelectorAll('.draft-select-checkbox:checked'))

    .map(cb => cb.getAttribute('data-id'));

  if (selectedIds.length === 0) return;

  if (!confirm(`هل تريد حذف ${selectedIds.length} مسودة/مسودات؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;

  try {

    for (const id of selectedIds) {

      await supabaseClient.from('drafts').delete().eq('id', id);

    }

    alert('تم حذف المسودات المحددة بنجاح');

    await displayDrafts();

    if (currentEditingId && selectedIds.includes(currentEditingId)) {

      resetForm();

    }

  } catch (error) {

    alert('حدث خطأ أثناء حذف المسودات');

  }

});

window.loadDraftToEditor = async function (draftId) {

  try {

    const { data: draft, error } = await supabaseClient

      .from('drafts')

      .select('*')

      .eq('id', draftId)

      .single();

    if (error) throw error;

    document.getElementById('newsTitle').value = draft.title || '';

    document.getElementById('newsContent').innerHTML = draft.content || '';

    const imagePreview = document.getElementById('imagePreview');

    imagePreview.innerHTML = draft.image_url ?

      `<img src="${draft.image_url}" alt="صورة المسودة"><button type="button" class="remove-image" onclick="removeSelectedImage()"><i class="fas fa-times"></i> إزالة الصورة</button>` :

      '';

    isEditing = true;

    currentEditingId = draftId;

    isDraft = true;

    publishBtn.innerHTML = '<i class="fas fa-save"></i> تحديث المسودة';

    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));

    document.querySelector('[data-tab="add-news"]').classList.add('active');

    document.querySelectorAll('.tab-content').forEach(section => section.classList.remove('active'));

    document.getElementById('add-news').classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (error) {

    alert('حدث خطأ أثناء تحميل المسودة');

  }

};

window.publishDraft = async function (draftId) {

  if (!confirm('هل تريد نشر هذه المسودة كخبر جديد؟')) return;

  try {

    const { data: draft, error } = await supabaseClient

      .from('drafts')

      .select('*')

      .eq('id', draftId)

      .single();

    if (error) throw error;

    const editorsStr = editors.join(',');

    const photographersStr = photographers.join(',');

    const newsData = {

      title: draft.title,

      content: draft.content,

      image_url: draft.image_url,

      created_at: new Date(),

      updated_at: new Date(),

      editors: editorsStr,

      photographers: photographersStr,

      views_count: 0

    };

    const { error: insertError } = await supabaseClient.from('news').insert([newsData]);

    if (insertError) throw insertError;

    await supabaseClient.from('drafts').delete().eq('id', draftId);

    alert('تم نشر الخبر بنجاح');

    await displayDrafts();

    await displayAdminNews();

  } catch (error) {

    alert('حدث خطأ أثناء النشر');

  }

};

window.deleteDraft = async function (draftId) {

  if (draftId === currentEditingId) {

    if (!confirm('أنت حالياً تعدل هذه المسودة. هل أنت متأكد من حذفها؟')) return;

  } else {

    if (!confirm('هل تريد حذف هذه المسودة؟ هذا الإجراء لا يمكن التراجع عنه.')) return;

  }

  try {

    const { error } = await supabaseClient.from('drafts').delete().eq('id', draftId);

    if (error) throw error;

    await displayDrafts();

    if (currentEditingId === draftId) {

      resetForm();

    }

    document.querySelector('.menu-item[data-tab="drafts"]').click();

  } catch (error) {

    alert('حدث خطأ أثناء الحذف');

  }

};

// ========== نظام الأخبار والإحصائيات ==========

async function displayAdminNews() {

  try {

    adminNewsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> جاري تحميل الأخبار...</div>';

    const { data: newsList, error } = await supabaseClient

      .from('news')

      .select('*')

      .order('created_at', { ascending: false });

    if (error) throw error;

    adminNewsContainer.innerHTML = '';

    if (!newsList || newsList.length === 0) {

      adminNewsContainer.innerHTML = '<p>لا توجد أخبار متاحة</p>';

      deleteSelectedBtn.disabled = true;

      return;

    }

    for (const news of newsList) {

      const stats = await getNewsStats(news.id);

      const newsItem = document.createElement('div');

      newsItem.className = 'admin-news-item';

      newsItem.dataset.id = news.id;

      newsItem.innerHTML = `

<input type="checkbox" class="news-select-checkbox" data-id="${news.id}" style="margin-left: 10px;">

<div class="info">

<h3>${news.title}</h3>

<p>${news.content.substring(0, 100)}...</p>

<small>${formatDate(news.created_at)}</small>

</div>

<div class="stats">

<div class="stat-item">

<i class="fas fa-eye"></i>

<span>${stats.totalViews} مشاهدات</span>

</div>

<div class="stat-item">

<i class="fas fa-users"></i>

<span>${stats.uniqueViews} زائر</span>

</div>

</div>

<div class="actions">

<button class="edit" onclick="startEditNews('${news.id}')"><i class="fas fa-edit"></i> تعديل</button>

<button class="delete" onclick="confirmDeleteNews('${news.id}')"><i class="fas fa-trash"></i> حذف</button>

<button class="details" onclick="showNewsDetails('${news.id}')"><i class="fas fa-chart-bar"></i> التفاصيل</button>

</div>

`;

      const checkbox = newsItem.querySelector('.news-select-checkbox');

      checkbox.addEventListener('change', updateDeleteSelectedBtnState);

      adminNewsContainer.appendChild(newsItem);

    }

    updateDeleteSelectedBtnState();

  } catch (error) {

    adminNewsContainer.innerHTML = '<p class="error">حدث خطأ أثناء تحميل الأخبار</p>';

    deleteSelectedBtn.disabled = true;

  }

}

async function getNewsStats(newsId) {

  try {

    const { data: views, error } = await supabaseClient

      .from('views')

      .select('ip_address')

      .eq('news_id', newsId);

    if (error) throw error;

    const uniqueIPs = new Set(views.map(v => v.ip_address));

    return {

      totalViews: views.length,

      uniqueViews: uniqueIPs.size

    };

  } catch (error) {

    console.error("Error getting stats:", error);

    return { totalViews: 0, uniqueViews: 0 };

  }

}

window.showNewsDetails = async function (newsId) {

  const modal = document.createElement('div');

  modal.className = 'stats-modal';

  document.body.appendChild(modal);

  try {

    modal.innerHTML = '<div class="modal-content"><div class="loading"><i class="fas fa-spinner fa-spin"></i> جاري تحميل التفاصيل...</div></div>';

    const [{ data: news, error: newsError }, { data: views, error: viewsError }] = await Promise.all([

      supabaseClient.from('news').select('*').eq('id', newsId).single(),

      supabaseClient.from('views').select('*').eq('news_id', newsId).order('viewed_at', { ascending: false }).limit(50)

    ]);

    if (newsError) throw newsError;

    if (viewsError) throw viewsError;

    const stats = await getNewsStats(newsId);

    let viewsHTML = '<h3>آخر 50 مشاهدة</h3><div class="views-list">';

    if (views && views.length > 0) {

      views.forEach(view => {

        viewsHTML += `

<div class="view-item">

<div><strong>الوقت:</strong> ${new Date(view.viewed_at).toLocaleString('ar-EG') || 'غير معروف'}</div>

<div><strong>IP:</strong> ${view.ip_address || 'غير معروف'}</div>

<div><strong>النوع:</strong> ${view.user_id ? 'مستخدم مسجل' : 'زائر'}</div>

</div>

`;

      });

    } else {

      viewsHTML += '<p class="no-views">لا توجد بيانات مشاهدات متاحة</p>';

    }

    viewsHTML += '</div>';

    modal.innerHTML = `

<div class="modal-content">

<h2>${news.title}</h2>

<div class="stats-summary">

<div class="stat-box">

<h4>إجمالي المشاهدات</h4>

<p>${stats.totalViews}</p>

</div>

<div class="stat-box">

<h4>الزوار الفريدون</h4>

<p>${stats.uniqueViews}</p>

</div>

</div>

${viewsHTML}

<button class="close-btn" onclick="this.parentElement.parentElement.remove()">

<i class="fas fa-times"></i> إغلاق

</button>

</div>

`;

  } catch (error) {

    modal.innerHTML = `

<div class="modal-content">

<p class="error">حدث خطأ في تحميل التفاصيل</p>

<button class="close-btn" onclick="this.parentElement.parentElement.remove()">

<i class="fas fa-times"></i> إغلاق

</button>

</div>

`;

  }

};

window.startEditNews = async function (id) {

  try {

    const { data: news, error } = await supabaseClient.from('news').select('*').eq('id', id).single();

    if (error) throw error;

    document.getElementById('newsTitle').value = news.title;

    document.getElementById('newsContent').innerHTML = news.content;

    document.getElementById('newsCategory').value = news.category || '';

    tags = news.tags || [];

    renderTags();

    const imagePreview = document.getElementById('imagePreview');

    imagePreview.innerHTML = news.image_url ?

      `<img src="${news.image_url}" alt="الصورة الحالية"><button type="button" class="remove-image" onclick="removeSelectedImage()"><i class="fas fa-times"></i> إزالة الصورة</button>` :

      '';

    isEditing = true;

    currentEditingId = id;

    isDraft = false;

    publishBtn.innerHTML = '<i class="fas fa-save"></i> تحديث الخبر';

    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (error) {

    alert('حدث خطأ أثناء تحميل الخبر للتعديل');

  }

};

window.confirmDeleteNews = async function (id) {

  if (!confirm('هل أنت متأكد من حذف هذا الخبر؟ سيتم حذف جميع الإحصائيات المرتبطة به.')) return;

  try {

    const { error: newsError } = await supabaseClient.from('news').delete().eq('id', id);

    if (newsError) throw newsError;

    const { data: views, error: viewsError } = await supabaseClient.from('views').select('id').eq('news_id', id);

    if (viewsError) throw viewsError;

    for (const view of views) {

      await supabaseClient.from('views').delete().eq('id', view.id);

    }

    if (currentEditingId === id) {

      resetForm();

    }

    alert('تم حذف الخبر وإحصائياته بنجاح');

    await displayAdminNews();

  } catch (error) {

    alert('حدث خطأ أثناء حذف الخبر');

  }

};

// ========== نظام الجدولة ==========

function startScheduledNewsChecker() {

  if (scheduledNewsCheckInterval) clearInterval(scheduledNewsCheckInterval);

  scheduledNewsCheckInterval = setInterval(async () => {

    try {

      const now = new Date().toISOString();

      const { data: scheduledNews, error } = await supabaseClient

        .from('scheduled_news')

        .select('*')

        .lte('scheduled_publish_time', now)

        .eq('status', 'scheduled');

      if (error) throw error;

      if (scheduledNews && scheduledNews.length > 0) {

        for (const newsItem of scheduledNews) {

          const { scheduled_publish_time, status, id, ...newsData } = newsItem;

          const { error: insertError } = await supabaseClient.from('news').insert([{

            ...newsData,

            created_at: new Date(),

            updated_at: new Date(),

            views_count: 0

          }]);

          if (insertError) throw insertError;

          await supabaseClient.from('scheduled_news').update({ status: 'published' }).eq('id', id);

        }

        console.log(`تم نشر ${scheduledNews.length} خبر مجدول تلقائياً`);

        await displayAdminNews();

        await displayScheduledNews();

      }

    } catch (error) {

      console.error('Error publishing scheduled news:', error);

    }

  }, 60000);

}

async function displayScheduledNews() {

  const container = document.getElementById('scheduledNewsContainer');

  if (!container) return;

  container.innerHTML = '<div class="loading">جاري تحميل الأخبار المجدولة...</div>';

  try {

    const { data: scheduledNews, error } = await supabaseClient

      .from('scheduled_news')

      .select('*')

      .eq('status', 'scheduled')

      .order('scheduled_publish_time', { ascending: true });

    if (error) throw error;

    container.innerHTML = '';

    if (!scheduledNews || scheduledNews.length === 0) {

      container.innerHTML = '<p class="no-items">لا توجد أخبار مجدولة</p>';

      return;

    }

    scheduledNews.forEach(news => {

      const newsEl = document.createElement('div');

      newsEl.className = 'scheduled-item';

      newsEl.innerHTML = `

<h3>${news.title || 'بدون عنوان'}</h3>

<p>${news.content ? news.content.substring(0, 100) + '...' : 'لا يوجد محتوى'}</p>

${news.image_url ? `<img src="${news.image_url}" alt="صورة الخبر" class="draft-image">` : ''}

<div class="scheduled-meta">

<span>مجدول للنشر: ${formatDateTime(news.scheduled_publish_time)}</span>

</div>

<div class="scheduled-actions">

<button class="publish-now" onclick="publishScheduledNow('${news.id}')"><i class="fas fa-paper-plane"></i> نشر الآن</button>

<button class="cancel" onclick="cancelScheduledNews('${news.id}')"><i class="fas fa-times"></i> إلغاء الجدولة</button>

</div>

`;

      container.appendChild(newsEl);

    });

  } catch (error) {

    container.innerHTML = '<p class="error">حدث خطأ أثناء تحميل الأخبار المجدولة</p>';

  }

}

window.publishScheduledNow = async function (id) {

  if (!confirm('هل تريد نشر هذا الخبر الآن؟')) return;

  try {

    const { data: newsItem, error } = await supabaseClient.from('scheduled_news').select('*').eq('id', id).single();

    if (error) throw error;

    const { scheduled_publish_time, status, ...newsData } = newsItem;

    const { error: insertError } = await supabaseClient.from('news').insert([{

      ...newsData,

      created_at: new Date(),

      updated_at: new Date(),

      views_count: 0

    }]);

    if (insertError) throw insertError;

    await supabaseClient.from('scheduled_news').update({ status: 'published' }).eq('id', id);

    alert('تم نشر الخبر بنجاح');

    await displayScheduledNews();

    await displayAdminNews();

  } catch (error) {

    alert('حدث خطأ أثناء النشر: ' + error.message);

  }

  document.querySelector('.menu-item[data-tab="scheduled-news"]').click();

};

window.cancelScheduledNews = async function (id) {

  if (!confirm('هل تريد إلغاء جدولة هذا الخبر؟')) return;

  try {

    const { error } = await supabaseClient.from('scheduled_news').delete().eq('id', id);

    if (error) throw error;

    await displayScheduledNews();

  } catch (error) {

    alert('حدث خطأ أثناء الإلغاء: ' + error.message);

  }

};

// ========== نظام الملف الشخصي ==========

async function loadUserProfile() {

  try {

    const { data: { user } } = await supabaseClient.auth.getUser();

    const { data: profile, error } = await supabaseClient

      .from('profiles')

      .select('*')

      .eq('id', user.id)

      .single();

    if (error) throw error;

    const userNameElem = document.getElementById('userName');

    if (userNameElem) {

      userNameElem.textContent = profile.full_name || user.email || 'مستخدم';

    }

    const userAvatarElem = document.getElementById('userAvatar');

    if (userAvatarElem) {

      userAvatarElem.src = profile.avatar_url || 'default-avatar.png';

    }

    const [{ count: newsCount }, { count: draftsCount }] = await Promise.all([

      supabaseClient.from('news').select('*', { count: 'exact', head: true }).eq('author_id', user.id),

      supabaseClient.from('drafts').select('*', { count: 'exact', head: true }).eq('author_id', user.id)

    ]);

    document.getElementById('profileAvatarDisplay').src = profile.avatar_url || 'default-avatar.png';

    document.getElementById('profileName').value = profile.full_name || '';

    document.getElementById('profileEmail').value = profile.email || user.email || '';

    document.getElementById('profileRole').value = profile.role || 'محرر';

    document.getElementById('userNewsCount').textContent = newsCount || 0;

    document.getElementById('userDraftsCount').textContent = draftsCount || 0;

    const createdAt = user.created_at ? new Date(user.created_at) : null;

    if (createdAt) {

      const options = { year: 'numeric', month: 'long' };

      document.getElementById('memberSince').textContent = createdAt.toLocaleDateString('ar-EG', options);

    }

  } catch (error) {

    console.error('خطأ في تحميل الملف الشخصي:', error);

    alert('حدث خطأ أثناء تحميل بيانات الملف الشخصي');

  }

}

function isValidName(name) {

  const regex = /^[\u0621-\u064Aa-zA-Z\s]+$/;

  return regex.test(name);

}

document.getElementById('profileForm').addEventListener('submit', async (e) => {

  e.preventDefault();

  const fullName = document.getElementById('profileName').value.trim();

  const avatarFile = document.getElementById('profileAvatar').files[0];

  if (!isValidName(fullName)) {

    alert("الاسم غير صحيح، يجب أن يحتوي على حروف عربية أو إنجليزية فقط، ودون أرقام أو رموز.");

    return;

  }

  try {

    let avatarUrl = null;

    if (avatarFile) {

      const compressedFile = await compressImage(avatarFile);

      avatarUrl = await uploadToCloudinary(compressedFile);

    }

    const { data: { user } } = await supabaseClient.auth.getUser();

    const updateData = {

      full_name: fullName,

      updated_at: new Date()

    };

    if (avatarUrl) {

      updateData.avatar_url = avatarUrl;

    }

    const { error } = await supabaseClient

      .from('profiles')

      .update(updateData)

      .eq('id', user.id);

    if (error) throw error;

    if (avatarUrl) {

      document.getElementById('userAvatar').src = avatarUrl;

      document.getElementById('profileAvatarDisplay').src = avatarUrl;

    }

    document.getElementById('userName').textContent = fullName || user.email || 'مستخدم';

    alert('تم تحديث الملف الشخصي بنجاح');

  } catch (error) {

    console.error('Error updating profile:', error);

    alert('حدث خطأ أثناء تحديث الملف الشخصي: ' + error.message);

  }

});

function showChangePasswordModal() {

  document.getElementById('passwordModal').style.display = 'flex';

}

function closeModal(modalId) {

  document.getElementById(modalId).style.display = 'none';

  document.getElementById(modalId + 'Form').reset();

}

document.getElementById('newPassword').addEventListener('input', function (e) {

  const password = e.target.value;

  const strengthContainer = e.target.nextElementSibling;

  const strengthBars = strengthContainer.querySelectorAll('.strength-bar');

  const strengthText = strengthContainer.querySelector('.strength-text');

  strengthContainer.className = 'password-strength';

  strengthText.textContent = '';

  if (password.length === 0) return;

  let strength = 0;

  if (password.length >= 8) strength++;

  if (password.length >= 12) strength++;

  if (/[A-Z]/.test(password)) strength++;

  if (/[0-9]/.test(password)) strength++;

  if (/[^A-Za-z0-9]/.test(password)) strength++;

  let strengthLevel = '';

  if (strength <= 2) {

    strengthLevel = 'weak';

    strengthText.textContent = 'ضعيفة';

  } else if (strength <= 4) {

    strengthLevel = 'medium';

    strengthText.textContent = 'متوسطة';

  } else {

    strengthLevel = 'strong';

    strengthText.textContent = 'قوية';

  }

  strengthContainer.classList.add('password-' + strengthLevel);

});

document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {

  e.preventDefault();

  const currentPassword = document.getElementById('currentPassword').value;

  const newPassword = document.getElementById('newPassword').value;

  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {

    alert('كلمة المرور الجديدة وتأكيدها غير متطابقين');

    return;

  }

  try {

    const { error } = await supabaseClient.auth.updateUser({

      password: newPassword

    });

    if (error) throw error;

    alert('تم تغيير كلمة المرور بنجاح');

    closeModal('passwordModal');

  } catch (error) {

    console.error('Error changing password:', error);

    alert('حدث خطأ أثناء تغيير كلمة المرور: ' + error.message);

  }

});

// ========== نظام الوسوم ==========

function renderTags() {

  tagsContainer.innerHTML = '';

  tags.forEach((tag, index) => {

    const tagEl = document.createElement('span');

    tagEl.className = 'tag';

    tagEl.textContent = tag;

    const removeBtn = document.createElement('span');

    removeBtn.className = 'remove-tag';

    removeBtn.textContent = '×';

    removeBtn.onclick = () => {

      tags.splice(index, 1);

      renderTags();

    };

    tagEl.appendChild(removeBtn);

    tagsContainer.appendChild(tagEl);

  });

}

newsTagsInput.addEventListener('keydown', (e) => {

  if (e.key === 'Enter' || e.key === ',') {

    e.preventDefault();

    addNewTag();

  }

});

function addNewTag() {

  let newTag = newsTagsInput.value.trim().replace(/,$/, '');

  if (newTag && !tags.includes(newTag)) {

    tags.push(newTag);

    renderTags();

    newsTagsInput.value = '';

  }

}

addTagBtn.addEventListener('click', addNewTag);

// ========== نظام المحررين والمصورين ==========

function renderEditors() {

  const container = document.getElementById('editorsContainer');

  container.innerHTML = '';

  editors.forEach((editor, index) => {

    const tag = document.createElement('span');

    tag.className = 'tag';

    tag.textContent = editor;

    const removeBtn = document.createElement('span');

    removeBtn.type = 'button';

    removeBtn.innerHTML = '&times;';

    removeBtn.onclick = () => {

      editors.splice(index, 1);

      renderEditors();

    };

    tag.appendChild(removeBtn);

    container.appendChild(tag);

  });

}

function renderPhotographers() {

  const container = document.getElementById('photographersContainer');

  container.innerHTML = '';

  photographers.forEach((photographer, index) => {

    const tag = document.createElement('span');

    tag.className = 'tag';

    tag.textContent = photographer;

    const removeBtn = document.createElement('span');

    removeBtn.type = 'button';

    removeBtn.innerHTML = '&times;';

    removeBtn.onclick = () => {

      photographers.splice(index, 1);

      renderPhotographers();

    };

    tag.appendChild(removeBtn);

    container.appendChild(tag);

  });

}

function addEditor() {

  const value = editorsInput.value.trim();

  if (value) {

    const names = value.split(/,|؛|،/).map(n => n.trim()).filter(Boolean);

    names.forEach(name => {

      if (!editors.includes(name)) editors.push(name);

    });

    editorsInput.value = '';

    renderEditors();

  }

}

function addPhotographer() {

  const value = photographersInput.value.trim();

  if (value) {

    const names = value.split(/,|؛|،/).map(n => n.trim()).filter(Boolean);

    names.forEach(name => {

      if (!photographers.includes(name)) photographers.push(name);

    });

    photographersInput.value = '';

    renderPhotographers();

  }

}

addEditorBtn.addEventListener('click', addEditor);

editorsInput.addEventListener('keydown', (e) => {

  if (e.key === 'Enter' || e.key === ',') {

    e.preventDefault();

    addEditor();

  }

});

addPhotographerBtn.addEventListener('click', addPhotographer);

photographersInput.addEventListener('keydown', (e) => {

  if (e.key === 'Enter' || e.key === ',') {

    e.preventDefault();

    addPhotographer();

  }

});

// ========== دوال مساعدة ==========

function resetForm() {

  document.getElementById('addNewsForm').reset();

  document.getElementById('imagePreview').innerHTML = '';

  document.getElementById('publishDate').value = '';

  isEditing = false;

  currentEditingId = null;

  isDraft = false;

  editors = [];

  photographers = [];

  lastSavedContent = '';

  lastSavedTitle = '';

  lastSavedImage = null;

  tags = [];

  renderTags();

  publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> نشر الخبر';

}

function formatDate(date) {

  if (!date) return 'تاريخ غير معروف';

  const d = new Date(date);

  return d.toLocaleDateString('ar-EG', {

    year: 'numeric',

    month: 'long',

    day: 'numeric',

    hour: '2-digit',

    minute: '2-digit'

  });

}

function formatDateTime(date) {

  if (!date) return 'غير محدد';

  const d = new Date(date);

  return d.toLocaleString('ar-EG', {

    year: 'numeric',

    month: 'long',

    day: 'numeric',

    hour: '2-digit',

    minute: '2-digit'

  });

}

function formatDateTimeLocal(date) {

  const pad = (num) => num.toString().padStart(2, '0');

  return date.getFullYear() + '-' +

    pad(date.getMonth() + 1) + '-' +

    pad(date.getDate()) + 'T' +

    pad(date.getHours()) + ':' +

    pad(date.getMinutes());

}

async function compressImage(file, { quality = 0.7, maxWidth = 800 } = {}) {

  return new Promise((resolve) => {

    const reader = new FileReader();

    reader.onload = function (event) {

      const img = new Image();

      img.src = event.target.result;

      img.onload = function () {

        const canvas = document.createElement('canvas');

        const scale = Math.min(1, maxWidth / img.width);

        canvas.width = img.width * scale;

        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {

          resolve(new File([blob], file.name, {

            type: 'image/jpeg',

            lastModified: Date.now()

          }));

        }, 'image/jpeg', quality);

      };

    };

    reader.readAsDataURL(file);

  });

}

async function uploadToCloudinary(file) {

  const CLOUDINARY_CONFIG = {

    cloudName: 'dgewq10jy',

    uploadPreset: 'adeeb news'

  };

  const formData = new FormData();

  formData.append('file', file);

  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

  try {

    const response = await fetch(

      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,

      { method: 'POST', body: formData }

    );

    if (!response.ok) throw new Error('فشل رفع الصورة');

    const data = await response.json();

    return data.secure_url;

  } catch (error) {

    console.error('Cloudinary upload error:', error);

    throw error;

  }

}

// ========== معاينة الصورة ==========

document.getElementById('newsImageFile').addEventListener('change', function (e) {

  const file = e.target.files[0];

  if (!file) return;

  const previewContainer = document.getElementById('imagePreview');

  previewContainer.innerHTML = '';

  if (!file.type.match('image.*')) {

    previewContainer.innerHTML = '<p class="error">الملف يجب أن يكون صورة</p>';

    e.target.value = '';

    return;

  }

  const reader = new FileReader();

  reader.onload = function (event) {

    previewContainer.innerHTML = `

<img src="${event.target.result}" alt="معاينة الصورة">

<button type="button" class="remove-image" onclick="removeSelectedImage()">

<i class="fas fa-times"></i> إزالة الصورة

</button>

`;

  };

  reader.readAsDataURL(file);

});

window.removeSelectedImage = function () {

  document.getElementById('newsImageFile').value = '';

  document.getElementById('imagePreview').innerHTML = '';

  lastSavedImage = null;

};

// ========== نظام التبويبات ==========

document.addEventListener('DOMContentLoaded', function () {

  const sidebar = document.querySelector('.sidebar');

  const toggleBtn = document.querySelector('.toggle-btn');

  const menuItems = document.querySelectorAll('.menu-item[data-tab]');

  const savedState = localStorage.getItem('sidebarCollapsed');

  if (savedState === 'true') {

    sidebar.classList.add('collapsed');

  }

  toggleBtn.addEventListener('click', () => {

    sidebar.classList.toggle('collapsed');

    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));

  });

  menuItems.forEach(item => {

    item.addEventListener('click', (e) => {

      e.preventDefault();

      const tabId = item.getAttribute('data-tab');

      menuItems.forEach(i => i.classList.remove('active'));

      item.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      document.getElementById(tabId).classList.add('active');

      if (tabId === 'add-news') resetForm();

    });

  });

});

// ========== نظام الأخبار بانتظار الموافقة ==========

async function displayPendingNews() {

  const container = document.getElementById('pendingNewsContainer');

  container.innerHTML = '<div class="loading">جاري تحميل الأخبار بانتظار الموافقة...</div>';

  try {

    const { data: pending, error } = await supabaseClient

      .from('pending_news')

      .select('*')

      .eq('status', 'pending')

      .order('created_at', { ascending: false });

    if (error) throw error;

    container.innerHTML = '';

    if (!pending || pending.length === 0) {

      container.innerHTML = '<p class="no-items">لا توجد أخبار بانتظار الموافقة</p>';

      return;

    }

    pending.forEach(item => {

      const el = document.createElement('div');

      el.className = 'admin-news-item';

      el.innerHTML = `

<h3>${item.title}</h3>

<p>${item.content.substring(0, 100)}...</p>

<div class="actions">

<button class="publish-now" onclick="approveNews('${item.id}')"><i class="fas fa-check"></i> نشر</button>

<button class="delete" onclick="rejectNews('${item.id}')"><i class="fas fa-times"></i> رفض</button>

</div>

`;

      container.appendChild(el);

    });

  } catch (error) {

    container.innerHTML = '<p class="error">حدث خطأ أثناء التحميل</p>';

  }

}

window.approveNews = async function (id) {

  try {

    const { data, error } = await supabaseClient.from('pending_news').select('*').eq('id', id).single();

    if (error) throw error;

    const editorsStr = editors.join(',');

    const photographersStr = photographers.join(',');

    const { error: insertError } = await supabaseClient.from('news').insert([{

      title: data.title,

      content: data.content,

      image_url: data.image_url,

      editors: editorsStr,

      photographers: photographersStr,

      created_at: new Date(),

      updated_at: new Date(),

      views_count: 0

    }]);

    if (insertError) throw insertError;

    await supabaseClient.from('pending_news').update({ status: 'approved' }).eq('id', id);

    alert('تم نشر الخبر');

    await displayPendingNews();

    await displayAdminNews();

  } catch (error) {

    alert('فشل النشر: ' + error.message);

  }

};

window.rejectNews = async function (id) {

  if (!confirm('هل تريد رفض هذا الخبر؟')) return;

  try {

    await supabaseClient.from('pending_news').update({ status: 'rejected' }).eq('id', id);

    await displayPendingNews();

  } catch (error) {

    alert('فشل الرفض: ' + error.message);

  }

};

// ========== نظام الحفظ التلقائي ==========

function startAutoSave() {

  if (autoSaveInterval) clearInterval(autoSaveInterval);

  autoSaveInterval = setInterval(async () => {

    if (!autoSaveEnabled) return;

    const title = document.getElementById('newsTitle').value.trim();

    const content = document.getElementById('newsContent').innerHTML.trim();

    const imageFile = document.getElementById('newsImageFile').files[0];

    if (title === lastSavedTitle && content === lastSavedContent &&

      ((!imageFile && !lastSavedImage) || (imageFile && lastSavedImage && imageFile.name === lastSavedImage.name))) {

      return;

    }

    if (!title && !content && !imageFile) return;

    try {

      console.log('جاري الحفظ التلقائي...');

      await autoSaveDraft();

      lastSavedTitle = title;

      lastSavedContent = content;

      lastSavedImage = imageFile;

      showAutoSaveNotification('تم الحفظ التلقائي بنجاح', 'success');

    } catch (error) {

      console.error('فشل الحفظ التلقائي:', error);

      showAutoSaveNotification('فشل الحفظ التلقائي', 'error');

    }

  }, AUTO_SAVE_INTERVAL);

}

function showAutoSaveNotification(message, type) {

  const existingNotification = document.getElementById('autoSaveNotification');

  if (existingNotification) existingNotification.remove();

  const notification = document.createElement('div');

  notification.id = 'autoSaveNotification';

  notification.className = `auto-save-notification ${type}`;

  notification.innerHTML = `

<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>

<span>${message}</span>

`;

  document.body.appendChild(notification);

  setTimeout(() => {

    notification.classList.add('fade-out');

    setTimeout(() => notification.remove(), 500);

  }, 3000);

}

async function autoSaveDraft() {

  const title = document.getElementById('newsTitle').value.trim();

  const content = document.getElementById('newsContent').innerHTML.trim();

  const imageFile = document.getElementById('newsImageFile').files[0];

  if (!title && !content && !imageFile) return;

  if (title === lastSavedTitle && content === lastSavedContent &&

    ((!imageFile && !lastSavedImage) || (imageFile && lastSavedImage && imageFile.name === lastSavedImage.name))) {

    return;

  }

  try {

    await saveNewsDraft(true);

    lastSavedTitle = title;

    lastSavedContent = content;

    lastSavedImage = imageFile;

    showAutoSaveNotification('تم الحفظ التلقائي بنجاح', 'success');

  } catch (error) {

    console.error('فشل الحفظ التلقائي:', error);

    showAutoSaveNotification('فشل الحفظ التلقائي', 'error');

  }

}

document.getElementById('autoSaveToggle').addEventListener('change', function (e) {

  autoSaveEnabled = e.target.checked;

  if (autoSaveEnabled) {

    showAutoSaveNotification('تم تفعيل الحفظ التلقائي', 'success');

  } else {

    showAutoSaveNotification('تم إيقاف الحفظ التلقائي', 'error');

  }

});

// ========== نظام إدارة المستخدمين ==========

let currentPage = 1;

const usersPerPage = 10;

let filteredUsers = [];

let allUsers = [];

document.querySelector('[data-tab="manage-users"]').addEventListener('click', async () => {

  await loadUsers();

});

document.getElementById('addUserBtn').addEventListener('click', () => {

  document.getElementById('addUserModal').style.display = 'flex';

  document.getElementById('addUserForm').reset();

});

async function loadUsers(page = 1) {

  currentPage = page;

  const tbody = document.getElementById('usersTableBody');

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">جاري التحميل...</td></tr>';

  try {

    if (allUsers.length === 0) {

      const { data: users, error } = await supabaseClient

        .from('profiles')

        .select('id, email, role, full_name, avatar_url, created_at, active');

      if (error) throw error;

      allUsers = users;

    }

    applyFilters();

    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    if (page > totalPages && totalPages > 0) page = totalPages;

    const startIndex = (page - 1) * usersPerPage;

    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

    tbody.innerHTML = '';

    if (paginatedUsers.length === 0) {

      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">لا توجد نتائج</td></tr>';

      return;

    }

    paginatedUsers.forEach(user => {

      const tr = document.createElement('tr');

      tr.innerHTML = `

<td>

<img src="${user.avatar_url || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png'}"

alt="صورة المستخدم" class="user-avatar">

</td>

<td>${user.full_name || 'بدون اسم'}</td>

<td>${user.email || '-'}</td>

<td>${user.role || 'editor'}</td>

<td>

<select class="role-select" data-userid="${user.id}">

<option value="editor" ${user.role === 'editor' ? 'selected' : ''}>محرر</option>

<option value="admin" ${user.role === 'admin' ? 'selected' : ''}>مدير</option>

</select>

</td>

<td>

<span class="user-status ${user.active ? 'status-active' : 'status-inactive'}">

${user.active ? 'نشط' : 'غير نشط'}

</span>

</td>

<td>

<div class="user-actions">

<button class="action-btn edit" title="تعديل المستخدم" onclick="editUser('${user.id}')">

<i class="fas fa-edit"></i>

</button>

<button class="action-btn delete" title="حذف المستخدم" onclick="deleteUser('${user.id}')">

<i class="fas fa-trash"></i>

</button>

<button class="notification-btn" title="إرسال إشعار" onclick="sendNotificationToUser('${user.id}')">

<i class="fas fa-bell"></i>

</button>

</div>

</td>

`;

      tbody.appendChild(tr);

    });

    document.querySelectorAll('.role-select').forEach(select => {

      select.addEventListener('change', async (e) => {

        const newRole = e.target.value;

        const userId = e.target.getAttribute('data-userid');

        try {

          const { error } = await supabaseClient

            .from('profiles')

            .update({ role: newRole })

            .eq('id', userId);

          if (error) throw error;

          const updatedUser = allUsers.find(u => u.id === userId);

          if (updatedUser) updatedUser.role = newRole;

          showSystemMessage('تم تحديث صلاحية المستخدم بنجاح', 'success');

        } catch (error) {

          showSystemMessage('حدث خطأ أثناء تحديث الصلاحية: ' + error.message, 'error');

        }

      });

    });

    updatePaginationInfo(filteredUsers.length, page, totalPages);

  } catch (error) {

    tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">خطأ في تحميل المستخدمين</td></tr>`;

    showSystemMessage('حدث خطأ أثناء تحميل المستخدمين: ' + error.message, 'error');

  }

}

function applyFilters() {

  const searchTerm = document.getElementById('userSearch').value.toLowerCase();

  const roleFilter = document.getElementById('roleFilter').value;

  filteredUsers = allUsers.filter(user => {

    const matchesSearch =

      (user.email && user.email.toLowerCase().includes(searchTerm)) ||

      (user.full_name && user.full_name.toLowerCase().includes(searchTerm));

    const matchesRole = roleFilter ? user.role === roleFilter : true;

    return matchesSearch && matchesRole;

  });

}

function updatePaginationInfo(totalUsers, currentPage, totalPages) {

  const startIndex = (currentPage - 1) * usersPerPage + 1;

  const endIndex = Math.min(startIndex + usersPerPage - 1, totalUsers);

  document.getElementById('paginationInfo').textContent =

    `عرض ${startIndex} إلى ${endIndex} من ${totalUsers}`;

  document.getElementById('currentPage').textContent = currentPage;

  document.getElementById('prevPageBtn').disabled = currentPage <= 1;

  document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;

}

document.getElementById('userSearch').addEventListener('input', () => {

  loadUsers(1);

});

document.getElementById('roleFilter').addEventListener('change', () => {

  loadUsers(1);

});

document.getElementById('prevPageBtn').addEventListener('click', () => {

  if (currentPage > 1) {

    loadUsers(currentPage - 1);

  }

});

document.getElementById('nextPageBtn').addEventListener('click', () => {

  loadUsers(currentPage + 1);

});

window.sendNotificationToUser = function (userId) {

  const user = allUsers.find(u => u.id === userId);

  if (user) {

    const message = `هل تريد إرسال إشعار إلى المستخدم ${user.full_name || user.email}؟`;

    if (confirm(message)) {

      showSystemMessage(`تم إرسال إشعار إلى ${user.email}`, 'success');

    }

  }

};

window.deleteUser = function (userId) {

  const user = allUsers.find(u => u.id === userId);

  if (user) {

    const message = `هل أنت متأكد من حذف المستخدم ${user.full_name || user.email}؟ هذا الإجراء لا يمكن التراجع عنه.`;

    if (confirm(message)) {

      supabaseClient

        .from('profiles')

        .delete()

        .eq('id', userId)

        .then(({ error }) => {

          if (error) throw error;

          allUsers = allUsers.filter(u => u.id !== userId);

          filteredUsers = filteredUsers.filter(u => u.id !== userId);

          showSystemMessage('تم حذف المستخدم بنجاح', 'success');

          loadUsers(currentPage);

        })

        .catch(error => {

          showSystemMessage('حدث خطأ أثناء حذف المستخدم: ' + error.message, 'error');

        });

    }

  }

};

window.editUser = function (userId) {

  const user = allUsers.find(u => u.id === userId);

  if (user) {

    document.getElementById('addUserModal').style.display = 'flex';

    document.getElementById('newUserName').value = user.full_name || '';

    document.getElementById('newUserEmail').value = user.email || '';

    document.getElementById('newUserRole').value = user.role || 'editor';

    document.getElementById('newUserPassword').value = '';

    document.getElementById('confirmUserPassword').value = '';

    document.getElementById('addUserForm').dataset.editingUserId = userId;

  }

};

document.getElementById('addUserForm').addEventListener('submit', async (e) => {

  e.preventDefault();

  const name = document.getElementById('newUserName').value.trim();

  const email = document.getElementById('newUserEmail').value.trim();

  const role = document.getElementById('newUserRole').value;

  const password = document.getElementById('newUserPassword').value;

  const confirmPassword = document.getElementById('confirmUserPassword').value;

  const editingUserId = document.getElementById('addUserForm').dataset.editingUserId;

  if (!name || !email || !password || !confirmPassword) {

    showSystemMessage('جميع الحقول مطلوبة', 'error');

    return;

  }

  if (password !== confirmPassword) {

    showSystemMessage('كلمتا المرور غير متطابقتين', 'error');

    return;

  }

  try {

    if (editingUserId) {

      const { error } = await supabaseClient

        .from('profiles')

        .update({

          full_name: name,

          role: role

        })

        .eq('id', editingUserId);

      if (error) throw error;

      if (password) {

        const { error: authError } = await supabaseClient.auth.updateUser({

          password: password

        });

        if (authError) throw authError;

      }

      const updatedUser = allUsers.find(u => u.id === editingUserId);

      if (updatedUser) {

        updatedUser.full_name = name;

        updatedUser.role = role;

      }

      showSystemMessage('تم تحديث المستخدم بنجاح', 'success');

    } else {

      const { data, error } = await supabaseClient.auth.signUp({

        email: email,

        password: password,

        options: {

          data: {

            full_name: name,

            role: role

          }

        }

      });

      if (error) throw error;

      const newUser = {

        id: data.user.id,

        email: email,

        full_name: name,

        role: role,

        active: true,

        created_at: new Date().toISOString()

      };

      allUsers.push(newUser);

      filteredUsers.push(newUser);

      showSystemMessage('تم إنشاء المستخدم بنجاح', 'success');

    }

    closeModal('addUserModal');

    loadUsers(currentPage);

    delete document.getElementById('addUserForm').dataset.editingUserId;

  } catch (error) {

    showSystemMessage('حدث خطأ: ' + error.message, 'error');

  }

});

function showSystemMessage(message, type) {

  const messageDiv = document.createElement('div');

  messageDiv.className = `system-message ${type}-message`;

  messageDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;

  document.querySelector('main#adminContent').prepend(messageDiv);

  setTimeout(() => {

    messageDiv.remove();

  }, 5000);

}

// ========== نظام لوحة التحكم ==========

async function loadDashboardStats() {

  try {

            // جلب عدد الأعضاء
        const { data, error } = await supabaseClient
            .from('members')
            .select('id', { count: 'exact' });

        if (error) throw error;

        // تحديث إحصائيات الأعضاء في لوحة التحكم
        document.getElementById('membersCount').textContent = data.length;

    const oneWeekAgo = new Date();

    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const oneWeekAgoISO = oneWeekAgo.toISOString();

    const { data: publishedNews, error: newsError } = await supabaseClient

      .from('news')

      .select('id')

      .gte('created_at', oneWeekAgoISO);

    if (newsError) throw newsError;

    const { data: totalViewsData, error: viewsError } = await supabaseClient

      .from('views')

      .select('id');

    if (viewsError) throw viewsError;

    const { data: { user } } = await supabaseClient.auth.getUser();

    const { data: drafts, error: draftsError } = await supabaseClient

      .from('drafts')

      .select('id')

      .eq('author_id', user.id);

    if (draftsError) throw draftsError;

    const { data: allViews, error: allViewsError } = await supabaseClient

      .from('views')

      .select('ip_address');

    if (allViewsError) throw allViewsError;

    const uniqueIPs = new Set(allViews.map(v => v.ip_address));

    document.getElementById('publishedNewsCount').textContent = publishedNews.length;

    document.getElementById('totalViewsCount').textContent = totalViewsData.length;

    document.getElementById('draftsCount').textContent = drafts.length;

    document.getElementById('uniqueVisitorsCount').textContent = uniqueIPs.size;

  } catch (error) {

    console.error('Error loading dashboard stats:', error);

    alert('حدث خطأ أثناء تحميل إحصائيات لوحة التحكم');

  }

}

// ========== نظام النشر ==========

document.getElementById('addNewsForm').addEventListener('submit', async function (e) {

  e.preventDefault();

  const title = document.getElementById('newsTitle').value.trim();

  const content = document.getElementById('newsContent').innerHTML.trim();

  const publishDateValue = document.getElementById('publishDate').value;

  const imageFile = document.getElementById('newsImageFile').files[0];

  if (!title && !content) {

    alert('يجب إدخال عنوان أو محتوى للنشر');

    return;

  }

  try {

    publishBtn.disabled = true;

    publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    let imageUrl = null;

    if (imageFile) {

      const compressedFile = await compressImage(imageFile);

      imageUrl = await uploadToCloudinary(compressedFile);

    }

    const { data: { user } } = await supabaseClient.auth.getUser();

    const editorsStr = editors.join(',');

    const photographersStr = photographers.join(',');

    const newsData = {

      title,

      content,

      image_url: imageUrl,

      editors: editorsStr,

      photographers: photographersStr,

      author_id: user.id,

      updated_at: new Date(),

    };

    if (publishDateValue) {

      newsData.scheduled_publish_time = new Date(publishDateValue).toISOString();

      newsData.status = 'scheduled';

      const { error } = await supabaseClient.from('scheduled_news').insert([newsData]);

      if (error) throw error;

      alert('تم جدولة الخبر للنشر في الوقت المحدد');

    } else {

      newsData.created_at = new Date();

      newsData.status = 'published';

      const { error } = await supabaseClient.from('news').insert([newsData]);

      if (error) throw error;

      alert('تم نشر الخبر فوراً');

    }

    resetForm();

    await displayAdminNews();

    await displayScheduledNews();

  } catch (error) {

    console.error('Error publishing news:', error);

    alert('حدث خطأ أثناء حفظ الخبر: ' + error.message);

  } finally {

    publishBtn.disabled = false;

    publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> نشر الخبر';

  }

});

document.querySelectorAll('.quick-schedule-buttons button').forEach(button => {

  button.addEventListener('click', () => {

    const minutesToAdd = parseInt(button.getAttribute('data-minutes'), 10);

    const now = new Date();

    now.setMinutes(now.getMinutes() + minutesToAdd);

    const localISOTime = formatDateTimeLocal(now);

    document.getElementById('publishDate').value = localISOTime;

  });

});

// ========== متابعة الأحداث ==========

selectAllBtn.addEventListener('click', () => {

  const checkboxes = document.querySelectorAll('.news-select-checkbox');

  checkboxes.forEach(cb => cb.checked = true);

  updateDeleteSelectedBtnState();

});

function updateDeleteSelectedBtnState() {

  const anyChecked = document.querySelectorAll('.news-select-checkbox:checked').length > 0;

  deleteSelectedBtn.disabled = !anyChecked;

}

deleteSelectedBtn.addEventListener('click', deleteSelectedNews);

async function deleteSelectedNews() {

  const checkedBoxes = [...document.querySelectorAll('.news-select-checkbox:checked')];

  if (checkedBoxes.length === 0) {

    alert('لم يتم اختيار أي خبر للحذف.');

    return;

  }

  if (!confirm(`هل أنت متأكد من حذف ${checkedBoxes.length} خبر؟ سيتم حذف جميع الإحصائيات المرتبطة به.`)) return;

  try {

    for (const checkbox of checkedBoxes) {

      const id = checkbox.getAttribute('data-id');

      const { error: ratingsError } = await supabaseClient.from('ratings').delete().eq('news_id', id);

      if (ratingsError) throw ratingsError;

      const { error: viewsError } = await supabaseClient.from('views').delete().eq('news_id', id);

      if (viewsError) throw viewsError;

      const { error: newsError } = await supabaseClient.from('news').delete().eq('id', id);

      if (newsError) throw newsError;

    }

    alert('تم حذف الأخبار المحددة بنجاح.');

    await displayAdminNews();

  } catch (error) {

    alert('حدث خطأ أثناء حذف الأخبار: ' + error.message);

  }

}

async function deleteAllNews() {

  if (!confirm('هل أنت متأكد من حذف كل الأخبار؟ سيتم حذف جميع الأخبار، الإحصائيات، والتقييمات المرتبطة!')) return;

  try {

    const { error: ratingsError } = await supabaseClient.from('ratings').delete().neq('id', 0);

    if (ratingsError) throw ratingsError;

    const { error: viewsError } = await supabaseClient.from('views').delete().neq('id', 0);

    if (viewsError) throw viewsError;

    const { error: newsError } = await supabaseClient.from('news').delete().neq('id', 0);

    if (newsError) throw newsError;

    alert('تم حذف كل الأخبار بنجاح.');

    await displayAdminNews();

  } catch (error) {

    alert('حدث خطأ أثناء حذف كل الأخبار: ' + error.message);

  }

}

// ========== تهيئة المحرر ==========

function initEditor() {

  const editor = document.getElementById('newsContent');

  const toolbarButtons = document.querySelectorAll('.editor-toolbar button');

  editor.addEventListener('input', function () {

    updateCharCounter(this, 'contentCounter', 5000);

  });

  toolbarButtons.forEach(button => {

    button.addEventListener('click', () => {

      const command = button.getAttribute('data-command');

      if (command === 'createLink') {

        const url = prompt('أدخل رابط URL:');

        if (url) document.execCommand(command, false, url);

      } else if (command === 'insertImage') {

        const url = prompt('أدخل رابط الصورة:');

        if (url) document.execCommand(command, false, url);

      } else {

        document.execCommand(command, false, null);

      }

      updateToolbarButtons();

    });

  });

  function updateToolbarButtons() {

    toolbarButtons.forEach(button => {

      const command = button.getAttribute('data-command');

      if (document.queryCommandState(command)) {

        button.classList.add('active-btn');

      } else {

        button.classList.remove('active-btn');

      }

    });

  }

  editor.addEventListener('keyup', updateToolbarButtons);

  editor.addEventListener('mouseup', updateToolbarButtons);

  updateToolbarButtons();

  document.getElementById('newsTitle').addEventListener('input', function () {

    updateCharCounter(this, 'titleCounter', 50);

  });

}

function updateCharCounter(element, counterId, maxLength) {

  const counter = document.getElementById(counterId);

  const length = element.value ? element.value.length : element.innerText.length;

  counter.textContent = `${length}/${maxLength} حرف`;

  counter.classList.remove('warning', 'error');

  if (length > maxLength * 0.8) {

    counter.classList.add('warning');

  }

  if (length > maxLength) {

    counter.classList.add('error');

  }

}

document.addEventListener('DOMContentLoaded', function () {

  initEditor();

  document.getElementById('profileAvatar').addEventListener('change', function (e) {

    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (event) {

      document.getElementById('profileAvatarDisplay').src = event.target.result;

    };

    reader.readAsDataURL(file);

  });

  document.getElementById('addNewsForm').addEventListener('submit', function () {

    document.getElementById('newsContentHidden').value =

      document.getElementById('newsContent').innerHTML;

  });

  const imageUpload = document.getElementById('newsImageFile');

  const uploadContainer = document.querySelector('.image-upload-container');

  imageUpload.addEventListener('change', function (e) {

    const file = e.target.files[0];

    if (!file) return;

    const preview = document.getElementById('imagePreview');

    preview.innerHTML = '';

    if (!file.type.match('image.*')) {

      preview.innerHTML = '<p class="error">الملف يجب أن يكون صورة</p>';

      return;

    }

    const reader = new FileReader();

    reader.onload = function (event) {

      preview.innerHTML = `

<img src="${event.target.result}" alt="معاينة الصورة">

<button type="button" class="remove-image" onclick="removeSelectedImage()">

<i class="fas fa-times"></i> إزالة الصورة

</button>

`;

    };

    reader.readAsDataURL(file);

  });

  uploadContainer.addEventListener('dragover', function (e) {

    e.preventDefault();

    this.classList.add('dragover');

  });

  uploadContainer.addEventListener('dragleave', function () {

    this.classList.remove('dragover');

  });

  uploadContainer.addEventListener('drop', function (e) {

    e.preventDefault();

    this.classList.remove('dragover');

    imageUpload.files = e.dataTransfer.files;

    const event = new Event('change');

    imageUpload.dispatchEvent(event);

  });

});

const insertImageBtn = document.querySelector('button[data-command="insertImage"]');

const imageInput = document.createElement('input');

imageInput.type = 'file';

imageInput.accept = 'image/*';

imageInput.style.display = 'none';

document.body.appendChild(imageInput);

insertImageBtn.addEventListener('click', () => {

  imageInput.click();

});

imageInput.addEventListener('change', async () => {

  const file = imageInput.files[0];

  if (!file) return;

  try {

    const compressedFile = await compressImage(file);

    const imageUrl = await uploadToCloudinary(compressedFile);

    const img = document.createElement('img');

    img.src = imageUrl;

    img.alt = 'صورة في الخبر';

    img.style.maxWidth = '100%';

    const sel = window.getSelection();

    if (!sel.rangeCount) return;

    const range = sel.getRangeAt(0);

    range.deleteContents();

    range.insertNode(img);

    range.setStartAfter(img);

    range.setEndAfter(img);

    sel.removeAllRanges();

    sel.addRange(range);

    imageInput.value = '';

  } catch (error) {

    alert('حدث خطأ أثناء رفع الصورة: ' + error.message);

  }

});

// ========== نظام إدارة التعليقات ==========
let currentCommentsPage = 1;
const commentsPerPage = 10;
let filteredComments = [];
let allComments = [];

async function loadComments(page = 1) {
  currentCommentsPage = page;
  const tbody = document.getElementById('commentsTableBody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">جاري التحميل...</td></tr>';

  try {
    if (allComments.length === 0) {
      const { data: comments, error } = await supabaseClient
        .from('comments')
        .select(`
                    id,
                    content,
                    created_at,
                    user:profiles(id, full_name, avatar_url),
                    news:news(id, title)
                `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      allComments = comments;
    }

    applyCommentsFilters();
    const totalPages = Math.ceil(filteredComments.length / commentsPerPage);
    if (page > totalPages && totalPages > 0) page = totalPages;
    const startIndex = (page - 1) * commentsPerPage;
    const paginatedComments = filteredComments.slice(startIndex, startIndex + commentsPerPage);

    tbody.innerHTML = '';
    if (paginatedComments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">لا توجد تعليقات</td></tr>';
      return;
    }

    paginatedComments.forEach(comment => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
                <td>
                    <div class="user-info">
                        <img src="${comment.user?.avatar_url || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png'}"
                             alt="صورة المستخدم" class="user-avatar">
                        <span>${comment.user?.full_name || 'زائر'}</span>
                    </div>
                </td>
                <td>${comment.news?.title || 'خبر محذوف'}</td>
                <td>${comment.content}</td>
                <td>${formatDate(comment.created_at)}</td>
                <td>
                    <button class="action-btn delete" onclick="deleteComment('${comment.id}')">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </td>
            `;
      tbody.appendChild(tr);
    });

    updateCommentsPaginationInfo(filteredComments.length, page, totalPages);
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">خطأ في تحميل التعليقات</td></tr>';
    showSystemMessage('حدث خطأ أثناء تحميل التعليقات: ' + error.message, 'error');
  }
}

function applyCommentsFilters() {
  const searchTerm = document.getElementById('commentSearch').value.toLowerCase();

  filteredComments = allComments.filter(comment => {
    const contentText = comment.content ?? '';
    const userName = comment.user?.full_name ?? '';
    const newsTitle = comment.news?.title ?? '';

    return contentText.toLowerCase().includes(searchTerm) ||
      userName.toLowerCase().includes(searchTerm) ||
      newsTitle.toLowerCase().includes(searchTerm);
  });
}

function updateCommentsPaginationInfo(totalComments, currentPage, totalPages) {
  const startIndex = (currentPage - 1) * commentsPerPage + 1;
  const endIndex = Math.min(startIndex + commentsPerPage - 1, totalComments);
  document.getElementById('commentsPaginationInfo').textContent =
    `عرض ${startIndex} إلى ${endIndex} من ${totalComments}`;
  document.getElementById('currentCommentsPage').textContent = currentPage;
  document.getElementById('prevCommentsPageBtn').disabled = currentPage <= 1;
  document.getElementById('nextCommentsPageBtn').disabled = currentPage >= totalPages;
}

window.deleteComment = async function (commentId) {
  if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;

  try {
    const { error } = await supabaseClient
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;

    allComments = allComments.filter(c => c.id !== commentId);
    filteredComments = filteredComments.filter(c => c.id !== commentId);

    showSystemMessage('تم حذف التعليق بنجاح', 'success');
    loadComments(currentCommentsPage);
  } catch (error) {
    showSystemMessage('حدث خطأ أثناء حذف التعليق: ' + error.message, 'error');
  }
};

// إضافة مستمعات الأحداث للتبويبات الجديدة
document.querySelector('[data-tab="comments"]').addEventListener('click', async () => {
  await loadComments();
});

// مستمعات البحث
document.getElementById('commentSearch').addEventListener('input', () => {
  loadComments(1);
});

// مستمعات أزرار التصفح
document.getElementById('prevCommentsPageBtn').addEventListener('click', () => {
  if (currentCommentsPage > 1) {
    loadComments(currentCommentsPage - 1);
  }
});

document.getElementById('nextCommentsPageBtn').addEventListener('click', () => {
  loadComments(currentCommentsPage + 1);
});

// ========== نظام إدارة التقييمات ==========
let currentRatingsPage = 1;
const ratingsPerPage = 10;
let filteredRatings = [];
let allRatings = [];

async function loadRatings(page = 1) {
  currentRatingsPage = page;
  const tbody = document.getElementById('ratingsTableBody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">جاري التحميل...</td></tr>';

  try {
    if (allRatings.length === 0) {
      const { data: ratings, error } = await supabaseClient
        .from('ratings')
        .select(`
                    id,
                    rating,
                    created_at,
                    user:profiles(id, full_name, avatar_url),
                    news:news(id, title)
                `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      allRatings = ratings;
    }

    applyRatingsFilters();
    const totalPages = Math.ceil(filteredRatings.length / ratingsPerPage);
    if (page > totalPages && totalPages > 0) page = totalPages;
    const startIndex = (page - 1) * ratingsPerPage;
    const paginatedRatings = filteredRatings.slice(startIndex, startIndex + ratingsPerPage);

    tbody.innerHTML = '';
    if (paginatedRatings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">لا توجد تقييمات</td></tr>';
      return;
    }

    paginatedRatings.forEach(rating => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
                <td>
                    <div class="user-info">
                        <img src="${rating.user?.avatar_url || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png'}"
                             alt="صورة المستخدم" class="user-avatar">
                        <span>${rating.user?.full_name || 'زائر'}</span>
                    </div>
                </td>
                <td>${rating.news?.title || 'خبر محذوف'}</td>
                <td>
                    <div class="star-rating">
                        ${Array(5).fill('').map((_, i) =>
        `<i class="fas fa-star ${i < rating.rating ? 'active' : ''}"></i>`).join('')}
                    </div>
                </td>
                <td>${formatDate(rating.created_at)}</td>
                <td>
                    <button class="action-btn delete" onclick="deleteRating('${rating.id}')">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </td>
            `;
      tbody.appendChild(tr);
    });

    updateRatingsPaginationInfo(filteredRatings.length, page, totalPages);
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">خطأ في تحميل التقييمات</td></tr>';
    showSystemMessage('حدث خطأ أثناء تحميل التقييمات: ' + error.message, 'error');
  }
}

function applyRatingsFilters() {
  const searchTerm = document.getElementById('ratingSearch').value.toLowerCase();
  const ratingFilter = document.getElementById('ratingFilter').value;

  filteredRatings = allRatings.filter(rating => {
    const matchesSearch = (rating.user?.full_name && rating.user.full_name.toLowerCase().includes(searchTerm)) ||
      (rating.news?.title && rating.news.title.toLowerCase().includes(searchTerm));
    const matchesRating = ratingFilter ? rating.rating === parseInt(ratingFilter) : true;
    return matchesSearch && matchesRating;
  });
}

function updateRatingsPaginationInfo(totalRatings, currentPage, totalPages) {
  const startIndex = (currentPage - 1) * ratingsPerPage + 1;
  const endIndex = Math.min(startIndex + ratingsPerPage - 1, totalRatings);
  document.getElementById('ratingsPaginationInfo').textContent =
    `عرض ${startIndex} إلى ${endIndex} من ${totalRatings}`;
  document.getElementById('currentRatingsPage').textContent = currentPage;
  document.getElementById('prevRatingsPageBtn').disabled = currentPage <= 1;
  document.getElementById('nextRatingsPageBtn').disabled = currentPage >= totalPages;
}

window.deleteRating = async function (ratingId) {
  if (!confirm('هل أنت متأكد من حذف هذا التقييم؟')) return;

  try {
    const { error } = await supabaseClient
      .from('ratings')
      .delete()
      .eq('id', ratingId);

    if (error) throw error;

    allRatings = allRatings.filter(r => r.id !== ratingId);
    filteredRatings = filteredRatings.filter(r => r.id !== ratingId);

    showSystemMessage('تم حذف التقييم بنجاح', 'success');
    loadRatings(currentRatingsPage);
  } catch (error) {
    showSystemMessage('حدث خطأ أثناء حذف التقييم: ' + error.message, 'error');
  }
};

// إضافة مستمعات الأحداث للتبويبات الجديدة
// Move all event listeners inside DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('[data-tab="comments"]').addEventListener('click', async () => {
        await loadComments();
    });

    document.querySelector('[data-tab="ratings"]').addEventListener('click', async () => {
        await loadRatings();
    });

    // مستمعات البحث والتصفية
    if (document.getElementById('commentSearch')) {
        document.getElementById('commentSearch').addEventListener('input', () => {
            loadComments(1);
        });
    }

    if (document.getElementById('commentFilter')) {
        document.getElementById('commentFilter').addEventListener('change', () => {
            loadComments(1);
        });
    }

    if (document.getElementById('ratingSearch')) {
        document.getElementById('ratingSearch').addEventListener('input', () => {
            loadRatings(1);
        });
    }

    if (document.getElementById('ratingFilter')) {
        document.getElementById('ratingFilter').addEventListener('change', () => {
            loadRatings(1);
        });
    }
});

// مستمعات أزرار التصفح
document.getElementById('prevCommentsPageBtn').addEventListener('click', () => {
  if (currentCommentsPage > 1) {
    loadComments(currentCommentsPage - 1);
  }
});

document.getElementById('nextCommentsPageBtn').addEventListener('click', () => {
  loadComments(currentCommentsPage + 1);
});

document.getElementById('prevRatingsPageBtn').addEventListener('click', () => {
  if (currentRatingsPage > 1) {
    loadRatings(currentRatingsPage - 1);
  }
});

document.getElementById('nextRatingsPageBtn').addEventListener('click', () => {
  loadRatings(currentRatingsPage + 1);
});
















// متغيرات إدارة الأعضاء
let currentMembersPage = 1;
const membersPerPage = 10;
let allMembers = [];
let filteredMembers = [];

// تحميل الأعضاء
async function loadMembers(page = 1) {
    currentMembersPage = page;
    const tableBody = document.getElementById("membersTableBody");
    tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">جاري تحميل الأعضاء...</td></tr>';
    
    try {
        if (allMembers.length === 0) {
            const { data, error } = await supabaseClient.from("members").select("*");
            if (error) throw error;
            allMembers = data;
        }
        
        applyMembersFilters();
        const totalPages = Math.ceil(filteredMembers.length / membersPerPage);
        if (page > totalPages && totalPages > 0) {
            page = totalPages;
        }
        
        const startIndex = (page - 1) * membersPerPage;
        const paginatedMembers = filteredMembers.slice(startIndex, startIndex + membersPerPage);
        
        if (paginatedMembers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">لا توجد أعضاء مسجلين</td></tr>';
            return;
        }
        
        tableBody.innerHTML = '';
        paginatedMembers.forEach(member => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>
                    <img src="${member.avatar_url || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png'}" 
                         class="member-avatar" alt="صورة العضو">
                </td>
                <td>${member.full_name}</td>
                <td>${member.email}</td>
                <td>${member.academic_number}</td>
                <td>${member.college_major}</td>
                <td>المرحلة ${member.academic_level}</td>
                <td>${member.committee || '-'}</td>
                <td>
                    <div class="member-actions">
                        <button class="edit" onclick="editMember('${member.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete" onclick="deleteMember('${member.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        updateMembersPaginationInfo(filteredMembers.length, page, totalPages);
    } catch (error) {
        console.error("Error loading members:", error);
        tableBody.innerHTML = '<tr><td colspan="9" style="color:red; text-align:center;">حدث خطأ أثناء تحميل الأعضاء</td></tr>';
        showSystemMessage("حدث خطأ أثناء تحميل الأعضاء: " + error.message, "error");
    }
}

// تطبيق عوامل التصفية
function applyMembersFilters() {
    const searchTerm = document.getElementById("membersSearch").value.toLowerCase();
    const levelFilter = document.getElementById("membersAcademicLevel").value;
    
    filteredMembers = allMembers.filter(member => {
        const matchesSearch = member.full_name.toLowerCase().includes(searchTerm) || 
                             member.email.toLowerCase().includes(searchTerm) ||
                             member.academic_number.includes(searchTerm);
        

        const matchesLevel = !levelFilter || member.academic_level === levelFilter;
        
        return matchesSearch && matchesLevel;
    });
}

// تحديث معلومات الترقيم
function updateMembersPaginationInfo(totalItems, currentPage, totalPages) {
    const startItem = (currentPage - 1) * membersPerPage + 1;
    const endItem = Math.min(startItem + membersPerPage - 1, totalItems);
    
    document.getElementById("membersPaginationInfo").textContent = `عرض ${startItem} إلى ${endItem} من ${totalItems}`;
    document.getElementById("currentMembersPage").textContent = currentPage;
    document.getElementById("prevMembersPageBtn").disabled = currentPage <= 1;
    document.getElementById("nextMembersPageBtn").disabled = currentPage >= totalPages;
}

// إضافة عضو جديد
async function addMember(memberData) {
    try {
        // تحميل الصورة إذا تم اختيارها
        let avatarUrl = null;
        const avatarFile = document.getElementById("memberAvatar").files[0];
        if (avatarFile) {
            const compressedImage = await compressImage(avatarFile);
            avatarUrl = await uploadToCloudinary(compressedImage);
        }
        
        // إعداد بيانات العضو
        const member = {
            ...memberData,
            avatar_url: avatarUrl,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabaseClient.from("members").insert([member]);
        if (error) throw error;
        
        showSystemMessage("تم إضافة العضو بنجاح", "success");
        closeModal("memberModal");
        allMembers = []; // إعادة تحميل القائمة
        loadMembers(currentMembersPage);
    } catch (error) {
        console.error("Error adding member:", error);
        showSystemMessage("حدث خطأ أثناء إضافة العضو: " + error.message, "error");
    }
}

// تعديل عضو
async function editMember(memberId) {
    try {
        const { data: member, error } = await supabaseClient
            .from("members")
            .select("*")
            .eq("id", memberId)
            .single();
        
        if (error) throw error;
        
        // تعبئة النموذج ببيانات العضو
        document.getElementById("memberName").value = member.full_name;
        document.getElementById("memberEmail").value = member.email;
        document.getElementById("memberPhone").value = member.phone;
        document.getElementById("memberAcademicNumber").value = member.academic_number;
        document.getElementById("memberNationalId").value = member.national_id;
        document.getElementById("memberCollegeMajor").value = member.college_major;
        document.getElementById("memberAcademicLevel").value = member.academic_level;
        document.getElementById("memberBirthDate").value = member.birth_date;
        document.getElementById("memberCommittee").value = member.committee || "";
        document.getElementById("memberTwitter").value = member.twitter || "";
        document.getElementById("memberInstagram").value = member.instagram || "";
        document.getElementById("memberTiktok").value = member.tiktok || "";
        document.getElementById("memberPrimaryColor").value = member.primary_color || "#3d8fd6";
        document.getElementById("memberSecondaryColor").value = member.secondary_color || "#274060";
        
        // تغيير عنوان النموذج
        document.getElementById("memberModalTitle").innerHTML = '<i class="fas fa-edit"></i> تعديل العضو';
        document.getElementById("memberForm").dataset.editingMemberId = memberId;
        
        // فتح النموذج
        document.getElementById("memberModal").style.display = "flex";
    } catch (error) {
        console.error("Error loading member data:", error);
        showSystemMessage("حدث خطأ أثناء تحميل بيانات العضو: " + error.message, "error");
    }
}

// حفظ التعديلات على العضو
async function updateMember(memberId, memberData) {
    try {
        // تحميل الصورة إذا تم اختيارها
        let avatarUrl = memberData.avatar_url;
        const avatarFile = document.getElementById("memberAvatar").files[0];
        if (avatarFile) {
            const compressedImage = await compressImage(avatarFile);
            avatarUrl = await uploadToCloudinary(compressedImage);
        }
        
        // إعداد بيانات العضو
        const member = {
            ...memberData,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
        };
        
        const { error } = await supabaseClient
            .from("members")
            .update(member)
            .eq("id", memberId);
        
        if (error) throw error;
        
        showSystemMessage("تم تحديث بيانات العضو بنجاح", "success");
        closeModal("memberModal");
        allMembers = []; // إعادة تحميل القائمة
        loadMembers(currentMembersPage);
    } catch (error) {
        console.error("Error updating member:", error);
        showSystemMessage("حدث خطأ أثناء تحديث بيانات العضو: " + error.message, "error");
    }
}

// حذف عضو
async function deleteMember(memberId) {
    if (!confirm("هل أنت متأكد من حذف هذا العضو؟ هذا الإجراء لا يمكن التراجع عنه.")) return;
    
    try {
        const { error } = await supabaseClient
            .from("members")
            .delete()
            .eq("id", memberId);
        
        if (error) throw error;
        
        showSystemMessage("تم حذف العضو بنجاح", "success");
        allMembers = allMembers.filter(m => m.id !== memberId);
        filteredMembers = filteredMembers.filter(m => m.id !== memberId);
        loadMembers(currentMembersPage);
    } catch (error) {
        console.error("Error deleting member:", error);
        showSystemMessage("حدث خطأ أثناء حذف العضو: " + error.message, "error");
    }
}

// تصدير بيانات الأعضاء
async function exportMembers() {
    try {
        // يمكن تطوير هذه الدالة لتصدير إلى Excel أو CSV
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // العناوين
        csvContent += "الاسم,البريد الإلكتروني,رقم الطالب,التخصص,المستوى,اللجنة,الحالة\n";
        
        // البيانات
        filteredMembers.forEach(member => {
            const row = [
                member.full_name,
                member.email,
                member.academic_number,
                member.college_major,
                `المرحلة ${member.academic_level}`,
                member.committee || '-',
            ].join(",");
            
            csvContent += row + "\n";
        });
        
        // إنشاء ملف للتحميل
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "أعضاء_أدِيب_" + new Date().toLocaleDateString("ar-SA") + ".csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSystemMessage("تم تصدير بيانات الأعضاء بنجاح", "success");
    } catch (error) {
        console.error("Error exporting members:", error);
        showSystemMessage("حدث خطأ أثناء تصدير البيانات: " + error.message, "error");
    }
}

// إعداد معالج الأحداث
document.addEventListener("DOMContentLoaded", () => {
    // تحميل الأعضاء عند فتح القسم
    document.querySelector('[data-tab="members"]').addEventListener("click", () => {
        loadMembers();
    });
    
    // البحث والتصفية
    document.getElementById("membersSearch").addEventListener("input", () => {
        loadMembers(1);
    });
    
    document.getElementById("membersFilter").addEventListener("change", () => {
        loadMembers(1);
    });
    
    document.getElementById("membersAcademicLevel").addEventListener("change", () => {
        loadMembers(1);
    });
    
    // التصفح بين الصفحات
    document.getElementById("prevMembersPageBtn").addEventListener("click", () => {
        if (currentMembersPage > 1) {
            loadMembers(currentMembersPage - 1);
        }
    });
    
    document.getElementById("nextMembersPageBtn").addEventListener("click", () => {
        loadMembers(currentMembersPage + 1);
    });
    
    // إضافة عضو جديد
    document.getElementById("addMemberBtn").addEventListener("click", () => {
        document.getElementById("memberModal").style.display = "flex";
        document.getElementById("memberModalTitle").innerHTML = '<i class="fas fa-user-plus"></i> إضافة عضو جديد';
        document.getElementById("memberForm").reset();
        delete document.getElementById("memberForm").dataset.editingMemberId;
    });
    
    // تصدير البيانات
    document.getElementById("exportMembersBtn").addEventListener("click", exportMembers);
    
    // معالج تقديم النموذج
    document.getElementById("memberForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const memberData = {
            full_name: document.getElementById("memberName").value.trim(),
            email: document.getElementById("memberEmail").value.trim(),
            phone: document.getElementById("memberPhone").value.trim(),
            academic_number: document.getElementById("memberAcademicNumber").value.trim(),
            national_id: document.getElementById("memberNationalId").value.trim(),
            college_major: document.getElementById("memberCollegeMajor").value.trim(),
            academic_level: document.getElementById("memberAcademicLevel").value,
            birth_date: document.getElementById("memberBirthDate").value,
            committee: document.getElementById("memberCommittee").value || null,
            status: document.getElementById("memberStatus").value,
            twitter: document.getElementById("memberTwitter").value.trim() || null,
            instagram: document.getElementById("memberInstagram").value.trim() || null,
            tiktok: document.getElementById("memberTiktok").value.trim() || null,
            primary_color: document.getElementById("memberPrimaryColor").value,
            secondary_color: document.getElementById("memberSecondaryColor").value
        };
        
        const memberId = document.getElementById("memberForm").dataset.editingMemberId;
        
        if (memberId) {
            await updateMember(memberId, memberData);
        } else {
            await addMember(memberData);
        }
    });
});