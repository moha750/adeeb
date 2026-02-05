/**
 * نظام إدارة الأخبار المطور - نادي أدِيب
 * يدمج جميع وظائف إدارة الأخبار مع workflow الجديد
 */

window.NewsManagerEnhanced = (function() {
    const sb = window.sbClient;
    let currentUser = null;
    let currentUserRoles = [];
    let allNews = [];
    let committees = [];

    async function init(user, role) {
        currentUser = user;
        currentUserRoles = role;
        
        await loadCommittees();
        await loadAllNews();
        setupEventListeners();
        
        // تهيئة المديرين الفرعيين
        if (window.NewsWorkflowManager) {
            await window.NewsWorkflowManager.init(user, role);
        }
        if (window.NewsWritersManager) {
            await window.NewsWritersManager.init(user);
        }
    }

    // تحميل اللجان
    async function loadCommittees() {
        try {
            const { data, error } = await sb
                .from('committees')
                .select('id, committee_name_ar')
                .eq('is_active', true)
                .order('committee_name_ar');

            if (error) throw error;
            committees = data || [];
            
            // ملء قوائم اللجان في الفلاتر
            populateCommitteeFilters();
        } catch (error) {
            console.error('Error loading committees:', error);
        }
    }

    // ملء قوائم اللجان
    function populateCommitteeFilters() {
        const filterIds = [
            'inProgressNewsCommitteeFilter',
            'publishedNewsCommitteeFilter'
        ];

        filterIds.forEach(filterId => {
            const filterEl = document.getElementById(filterId);
            if (filterEl) {
                const options = committees.map(c => 
                    `<option value="${c.id}">${c.committee_name_ar}</option>`
                ).join('');
                filterEl.innerHTML = '<option value="">جميع اللجان</option>' + options;
            }
        });
    }

    // تحميل جميع الأخبار
    async function loadAllNews() {
        try {
            const { data, error } = await sb
                .from('news')
                .select(`
                    *,
                    committees (committee_name_ar),
                    created_by_profile:created_by (full_name, avatar_url),
                    assigned_by_profile:assigned_by (full_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            allNews = data || [];
            updateAllStats();
            renderAllSections();
        } catch (error) {
            console.error('Error loading news:', error);
            Toast.error('حدث خطأ في تحميل الأخبار');
        }
    }

    // تحديث جميع الإحصائيات
    function updateAllStats() {
        // إحصائيات المسودات
        const draftsCount = allNews.filter(n => n.workflow_status === 'draft').length;
        const assignedCount = allNews.filter(n => n.workflow_status === 'assigned').length;
        const inProgressCount = allNews.filter(n => n.workflow_status === 'in_progress').length;
        const readyForReviewCount = allNews.filter(n => n.workflow_status === 'ready_for_review').length;

        updateStatElement('newsDraftsCount', draftsCount);
        updateStatElement('newsAssignedCount', assignedCount);
        updateStatElement('newsInProgressCount', inProgressCount);
        updateStatElement('newsReadyForReviewCount', readyForReviewCount);

        // إحصائيات المنشورة
        const publishedNews = allNews.filter(n => n.workflow_status === 'published' || n.status === 'published');
        const publishedCount = publishedNews.length;
        const featuredCount = publishedNews.filter(n => n.is_featured).length;
        const totalViews = publishedNews.reduce((sum, n) => sum + (n.views || 0), 0);
        
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        const thisMonthCount = publishedNews.filter(n => 
            new Date(n.published_at) >= thisMonth
        ).length;

        updateStatElement('publishedNewsCount', publishedCount);
        updateStatElement('featuredNewsCount', featuredCount);
        updateStatElement('totalNewsViews', totalViews);
        updateStatElement('thisMonthNewsCount', thisMonthCount);
    }

    // تحديث عنصر إحصائية
    function updateStatElement(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    // عرض جميع الأقسام
    function renderAllSections() {
        renderDrafts();
        renderInProgress();
        renderReadyForReview();
        renderPublished();
        renderArchived();
    }

    // عرض المسودات
    function renderDrafts() {
        const container = document.getElementById('newsDraftsContainer');
        if (!container) return;

        const drafts = allNews.filter(n => n.workflow_status === 'draft');

        if (drafts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #6b7280;">
                    <i class="fa-solid fa-inbox fa-3x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="font-size: 1.125rem; font-weight: 500;">لا توجد مسودات</p>
                    <p style="font-size: 0.875rem; margin-top: 0.5rem;">ابدأ بإنشاء مسودة خبر جديد</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="items-grid">
                ${drafts.map(news => createDraftCard(news)).join('')}
            </div>
        `;
    }

    // إنشاء بطاقة مسودة
    function createDraftCard(news) {
        const createdDate = new Date(news.created_at).toLocaleDateString('ar-SA');
        
        return `
            <div class="application-card">
                <div class="application-card-header">
                    <div class="applicant-info">
                        <div class="applicant-details">
                            <h4 class="applicant-name">📄 ${news.title}</h4>
                            <p style="margin: 0.5rem 0; font-size: 0.875rem; color: #64748b;">
                                <i class="fa-solid fa-sitemap"></i> ${news.committees?.committee_name_ar || 'غير محدد'}
                            </p>
                        </div>
                    </div>
                </div>
                <div class="application-card-body">
                    <div class="application-info-grid">
                        <div class="info-item">
                            <i class="fa-solid fa-calendar"></i>
                            <div class="info-content">
                                <span class="info-label">تاريخ الإنشاء</span>
                                <span class="info-value">${createdDate}</span>
                            </div>
                        </div>
                        <div class="info-item">
                            <i class="fa-solid fa-tag"></i>
                            <div class="info-content">
                                <span class="info-label">التصنيف</span>
                                <span class="info-value">${getCategoryLabel(news.category)}</span>
                            </div>
                        </div>
                        ${news.review_notes ? `
                            <div class="info-item" style="grid-column: 1 / -1;">
                                <i class="fa-solid fa-note-sticky"></i>
                                <div class="info-content">
                                    <span class="info-label">ملاحظات</span>
                                    <span class="info-value">${news.review_notes}</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="application-card-footer">
                    <span class="badge badge-secondary"><i class="fa-solid fa-file"></i> مسودة</span>
                    <div style="display: flex; gap: 0.5rem; margin-right: auto;">
                        <button class="btn btn--primary btn--sm" onclick="NewsManagerEnhanced.assignWritersToDraft('${news.id}')">
                            <i class="fa-solid fa-users"></i>
                            تعيين كتّاب
                        </button>
                        <button class="btn btn--outline btn--outline-primary btn--sm" onclick="NewsManagerEnhanced.editDraft('${news.id}')">
                            <i class="fa-solid fa-edit"></i>
                            تعديل
                        </button>
                        <button class="btn btn--icon btn--icon-sm btn--danger" onclick="NewsManagerEnhanced.deleteDraft('${news.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // عرض الأخبار قيد الكتابة
    function renderInProgress() {
        const container = document.getElementById('newsInProgressContainer');
        if (!container) return;

        const searchTerm = document.getElementById('inProgressNewsSearchInput')?.value.toLowerCase() || '';
        const committeeFilter = document.getElementById('inProgressNewsCommitteeFilter')?.value || '';

        let inProgressNews = allNews.filter(n => 
            n.workflow_status === 'in_progress' || n.workflow_status === 'assigned'
        );

        if (searchTerm) {
            inProgressNews = inProgressNews.filter(n => 
                n.title?.toLowerCase().includes(searchTerm)
            );
        }

        if (committeeFilter) {
            inProgressNews = inProgressNews.filter(n => 
                n.committee_id == committeeFilter
            );
        }

        if (inProgressNews.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #6b7280;">
                    <i class="fa-solid fa-inbox fa-3x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="font-size: 1.125rem; font-weight: 500;">لا توجد أخبار قيد الكتابة</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="items-grid">
                ${inProgressNews.map(news => createInProgressCard(news)).join('')}
            </div>
        `;
    }

    // إنشاء بطاقة خبر قيد الكتابة
    function createInProgressCard(news) {
        const assignedDate = news.assigned_at ? new Date(news.assigned_at).toLocaleDateString('ar-SA') : '-';
        const statusBadge = news.workflow_status === 'assigned' 
            ? '<span class="badge badge-info"><i class="fa-solid fa-users"></i> معين للكتّاب</span>'
            : '<span class="badge badge-warning"><i class="fa-solid fa-pen"></i> قيد الكتابة</span>';

        return `
            <div class="application-card">
                <div class="application-card-header">
                    <div class="applicant-info">
                        <div class="applicant-details">
                            <h4 class="applicant-name">✍️ ${news.title}</h4>
                            <p style="margin: 0.5rem 0; font-size: 0.875rem; color: #64748b;">
                                <i class="fa-solid fa-sitemap"></i> ${news.committees?.committee_name_ar || 'غير محدد'}
                            </p>
                        </div>
                    </div>
                </div>
                <div class="application-card-body">
                    <div class="application-info-grid">
                        <div class="info-item">
                            <i class="fa-solid fa-calendar"></i>
                            <div class="info-content">
                                <span class="info-label">تاريخ التعيين</span>
                                <span class="info-value">${assignedDate}</span>
                            </div>
                        </div>
                        <div class="info-item">
                            <i class="fa-solid fa-user"></i>
                            <div class="info-content">
                                <span class="info-label">معين من</span>
                                <span class="info-value">${news.assigned_by_profile?.full_name || 'غير محدد'}</span>
                            </div>
                        </div>
                        <div class="info-item">
                            <i class="fa-solid fa-users"></i>
                            <div class="info-content">
                                <span class="info-label">عدد الكتّاب</span>
                                <span class="info-value">${news.assigned_writers?.length || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="application-card-footer">
                    ${statusBadge}
                    <div style="display: flex; gap: 0.5rem; margin-right: auto;">
                        <button class="btn btn--outline btn--outline-primary btn--sm" onclick="NewsManagerEnhanced.viewNewsDetails('${news.id}')">
                            <i class="fa-solid fa-eye"></i>
                            عرض التفاصيل
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // عرض الأخبار الجاهزة للمراجعة
    function renderReadyForReview() {
        const container = document.getElementById('newsReviewContainer');
        if (!container) return;

        const reviewNews = allNews.filter(n => n.workflow_status === 'ready_for_review');

        if (reviewNews.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #6b7280;">
                    <i class="fa-solid fa-inbox fa-3x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="font-size: 1.125rem; font-weight: 500;">لا توجد أخبار جاهزة للمراجعة</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="items-grid">
                ${reviewNews.map(news => createReviewCard(news)).join('')}
            </div>
        `;
    }

    // إنشاء بطاقة خبر للمراجعة
    function createReviewCard(news) {
        const submittedDate = news.submitted_at ? new Date(news.submitted_at).toLocaleDateString('ar-SA') : '-';

        return `
            <div class="application-card">
                <div class="application-card-header">
                    <div class="applicant-info">
                        <div class="applicant-details">
                            <h4 class="applicant-name">✅ ${news.title}</h4>
                            <p style="margin: 0.5rem 0; font-size: 0.875rem; color: #64748b;">
                                <i class="fa-solid fa-sitemap"></i> ${news.committees?.committee_name_ar || 'غير محدد'}
                            </p>
                        </div>
                    </div>
                </div>
                <div class="application-card-body">
                    <div class="application-info-grid">
                        <div class="info-item">
                            <i class="fa-solid fa-calendar"></i>
                            <div class="info-content">
                                <span class="info-label">تاريخ الإرسال</span>
                                <span class="info-value">${submittedDate}</span>
                            </div>
                        </div>
                        <div class="info-item">
                            <i class="fa-solid fa-users"></i>
                            <div class="info-content">
                                <span class="info-label">الكتّاب</span>
                                <span class="info-value">${news.assigned_writers?.length || 0}</span>
                            </div>
                        </div>
                    </div>
                    ${news.summary ? `
                        <div style="margin-top: 1rem; padding: 0.75rem; background: #f9fafb; border-radius: 6px;">
                            <p style="margin: 0; font-size: 0.875rem; color: #4b5563;">${news.summary}</p>
                        </div>
                    ` : ''}
                </div>
                <div class="application-card-footer">
                    <span class="badge badge-success"><i class="fa-solid fa-check-circle"></i> جاهز للمراجعة</span>
                    <div style="display: flex; gap: 0.5rem; margin-right: auto;">
                        <button class="btn btn--primary btn--sm" onclick="NewsManagerEnhanced.publishNews('${news.id}')">
                            <i class="fa-solid fa-paper-plane"></i>
                            نشر
                        </button>
                        <button class="btn btn--outline btn--outline-warning btn--sm" onclick="NewsManagerEnhanced.requestChanges('${news.id}')">
                            <i class="fa-solid fa-edit"></i>
                            طلب تعديلات
                        </button>
                        <button class="btn btn--outline btn--outline-primary btn--sm" onclick="NewsManagerEnhanced.previewNews('${news.id}')">
                            <i class="fa-solid fa-eye"></i>
                            معاينة
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // عرض الأخبار المنشورة
    function renderPublished() {
        const container = document.getElementById('newsPublishedContainer');
        if (!container) return;

        const searchTerm = document.getElementById('publishedNewsSearchInput')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('publishedNewsCategoryFilter')?.value || '';
        const committeeFilter = document.getElementById('publishedNewsCommitteeFilter')?.value || '';

        let publishedNews = allNews.filter(n => 
            n.workflow_status === 'published' || n.status === 'published'
        );

        if (searchTerm) {
            publishedNews = publishedNews.filter(n => 
                n.title?.toLowerCase().includes(searchTerm) ||
                n.summary?.toLowerCase().includes(searchTerm)
            );
        }

        if (categoryFilter) {
            publishedNews = publishedNews.filter(n => n.category === categoryFilter);
        }

        if (committeeFilter) {
            publishedNews = publishedNews.filter(n => n.committee_id == committeeFilter);
        }

        if (publishedNews.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #6b7280;">
                    <i class="fa-solid fa-inbox fa-3x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="font-size: 1.125rem; font-weight: 500;">لا توجد أخبار منشورة</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="items-grid">
                ${publishedNews.map(news => createPublishedCard(news)).join('')}
            </div>
        `;
    }

    // إنشاء بطاقة خبر منشور
    function createPublishedCard(news) {
        const publishedDate = news.published_at ? new Date(news.published_at).toLocaleDateString('ar-SA') : '-';
        const imageUrl = news.image_url || 'https://via.placeholder.com/400x300?text=أديب';

        return `
            <div class="application-card">
                <div class="application-card-header">
                    <img src="${imageUrl}" alt="${news.title}" 
                         style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px 8px 0 0; margin: -1rem -1rem 1rem -1rem;" 
                         onerror="this.src='https://via.placeholder.com/400x300?text=أديب'">
                    <div class="applicant-info">
                        <div class="applicant-details">
                            <h4 class="applicant-name">${news.title}</h4>
                            <p style="margin: 0.5rem 0; font-size: 0.875rem; color: #64748b;">${news.summary || ''}</p>
                        </div>
                    </div>
                </div>
                <div class="application-card-body">
                    <div class="application-info-grid">
                        <div class="info-item">
                            <i class="fa-solid fa-calendar"></i>
                            <div class="info-content">
                                <span class="info-label">تاريخ النشر</span>
                                <span class="info-value">${publishedDate}</span>
                            </div>
                        </div>
                        <div class="info-item">
                            <i class="fa-solid fa-eye"></i>
                            <div class="info-content">
                                <span class="info-label">المشاهدات</span>
                                <span class="info-value">${news.views || 0}</span>
                            </div>
                        </div>
                        ${news.is_featured ? `
                            <div class="info-item">
                                <i class="fa-solid fa-star"></i>
                                <div class="info-content">
                                    <span class="info-label">خبر مميز</span>
                                    <span class="info-value">نعم</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="application-card-footer">
                    <span class="badge badge-success"><i class="fa-solid fa-check-circle"></i> منشور</span>
                    <div style="display: flex; gap: 0.5rem; margin-right: auto;">
                        <button class="btn btn--outline btn--outline-primary btn--sm" onclick="window.open('/news/news-detail.html?id=${news.id}', '_blank')">
                            <i class="fa-solid fa-external-link"></i>
                            عرض في الموقع
                        </button>
                        <button class="btn btn--outline btn--outline-secondary btn--sm" onclick="NewsManagerEnhanced.archiveNews('${news.id}')">
                            <i class="fa-solid fa-archive"></i>
                            أرشفة
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // عرض الأخبار المؤرشفة
    function renderArchived() {
        const container = document.getElementById('newsArchivedContainer');
        if (!container) return;

        const archivedNews = allNews.filter(n => 
            n.workflow_status === 'archived' || n.status === 'archived'
        );

        if (archivedNews.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #6b7280;">
                    <i class="fa-solid fa-inbox fa-3x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="font-size: 1.125rem; font-weight: 500;">لا توجد أخبار مؤرشفة</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="items-grid">
                ${archivedNews.map(news => createArchivedCard(news)).join('')}
            </div>
        `;
    }

    // إنشاء بطاقة خبر مؤرشف
    function createArchivedCard(news) {
        return `
            <div class="application-card" style="opacity: 0.7;">
                <div class="application-card-header">
                    <div class="applicant-info">
                        <div class="applicant-details">
                            <h4 class="applicant-name">📦 ${news.title}</h4>
                        </div>
                    </div>
                </div>
                <div class="application-card-footer">
                    <span class="badge badge-secondary"><i class="fa-solid fa-archive"></i> مؤرشف</span>
                    <div style="display: flex; gap: 0.5rem; margin-right: auto;">
                        <button class="btn btn--outline btn--outline-primary btn--sm" onclick="NewsManagerEnhanced.restoreNews('${news.id}')">
                            <i class="fa-solid fa-undo"></i>
                            استعادة
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // الحصول على تسمية التصنيف
    function getCategoryLabel(category) {
        const categories = {
            'events': 'فعاليات',
            'achievements': 'إنجازات',
            'announcements': 'إعلانات',
            'workshops': 'ورش عمل',
            'meetings': 'اجتماعات',
            'general': 'عام'
        };
        return categories[category] || 'غير محدد';
    }

    // الوظائف التفاعلية
    async function assignWritersToDraft(newsId) {
        try {
            await window.NewsWorkflowManager.assignWriters(newsId);
            await loadAllNews();
        } catch (error) {
            console.error('Error assigning writers:', error);
            Toast.error('حدث خطأ عند تعيين الكتّاب');
        }
    }

    async function editDraft(newsId) {
        try {
            if (window.NewsDraftEditor) {
                await window.NewsDraftEditor.editDraft(newsId);
            } else {
                Toast.error('نظام التعديل غير متاح');
            }
        } catch (error) {
            console.error('Error editing draft:', error);
            Toast.error('حدث خطأ عند تعديل المسودة');
        }
    }

    async function deleteDraft(newsId) {
        try {
            if (window.NewsDraftEditor) {
                await window.NewsDraftEditor.deleteDraft(newsId);
            } else {
                Toast.error('نظام الحذف غير متاح');
            }
        } catch (error) {
            console.error('Error deleting draft:', error);
            Toast.error('حدث خطأ عند حذف المسودة');
        }
    }

    async function publishNews(newsId) {
        try {
            await window.NewsWorkflowManager.reviewAndPublish(newsId, 'publish');
            await loadAllNews();
        } catch (error) {
            console.error('Error publishing news:', error);
            Toast.error('حدث خطأ عند نشر الخبر');
        }
    }

    async function requestChanges(newsId) {
        try {
            await window.NewsWorkflowManager.reviewAndPublish(newsId, 'request_changes');
            await loadAllNews();
        } catch (error) {
            console.error('Error requesting changes:', error);
            Toast.error('حدث خطأ عند طلب التعديلات');
        }
    }

    async function previewNews(newsId) {
        const news = allNews.find(n => n.id === newsId);
        if (!news) return;

        await Swal.fire({
            title: news.title,
            html: `
                <div style="text-align: right;">
                    ${news.image_url ? `<img src="${news.image_url}" style="width: 100%; border-radius: 8px; margin-bottom: 1rem;">` : ''}
                    ${news.summary ? `<p style="font-weight: 600; margin-bottom: 1rem;">${news.summary}</p>` : ''}
                    <div style="text-align: right; line-height: 1.8;">${news.content || 'لا يوجد محتوى'}</div>
                </div>
            `,
            width: '800px',
            showCloseButton: true,
            showConfirmButton: false
        });
    }

    async function archiveNews(newsId) {
        const result = await Swal.fire({
            title: 'تأكيد الأرشفة',
            text: 'هل تريد أرشفة هذا الخبر؟',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'نعم، أرشف',
            cancelButtonText: 'إلغاء'
        });

        if (result.isConfirmed) {
            try {
                const { error } = await sb
                    .from('news')
                    .update({ 
                        workflow_status: 'archived',
                        status: 'archived'
                    })
                    .eq('id', newsId);

                if (error) throw error;

                await Swal.fire({
                    title: 'تمت الأرشفة',
                    text: 'تم أرشفة الخبر بنجاح',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                await loadAllNews();
            } catch (error) {
                console.error('Error archiving news:', error);
                showError('حدث خطأ عند الأرشفة');
            }
        }
    }

    async function restoreNews(newsId) {
        try {
            const { error } = await sb
                .from('news')
                .update({ 
                    workflow_status: 'published',
                    status: 'published'
                })
                .eq('id', newsId);

            if (error) throw error;

            await Swal.fire({
                title: 'تمت الاستعادة',
                text: 'تم استعادة الخبر بنجاح',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });

            await loadAllNews();
        } catch (error) {
            console.error('Error restoring news:', error);
            showError('حدث خطأ عند الاستعادة');
        }
    }

    function viewNewsDetails(newsId) {
        const news = allNews.find(n => n.id === newsId);
        if (!news) return;

        Swal.fire({
            title: `<i class="fa-solid fa-info-circle"></i> تفاصيل الخبر`,
            html: `
                <div style="text-align: right;">
                    <h3 style="margin-bottom: 1rem;">${news.title}</h3>
                    <div style="display: grid; gap: 0.75rem;">
                        <div><strong>اللجنة:</strong> ${news.committees?.committee_name_ar || 'غير محدد'}</div>
                        <div><strong>التصنيف:</strong> ${getCategoryLabel(news.category)}</div>
                        <div><strong>الحالة:</strong> ${getWorkflowStatusLabel(news.workflow_status)}</div>
                        <div><strong>عدد الكتّاب:</strong> ${news.assigned_writers?.length || 0}</div>
                        ${news.assigned_by_profile ? `<div><strong>معين من:</strong> ${news.assigned_by_profile.full_name}</div>` : ''}
                    </div>
                </div>
            `,
            width: '600px',
            showCloseButton: true,
            showConfirmButton: false
        });
    }

    function getWorkflowStatusLabel(status) {
        const labels = {
            'draft': 'مسودة',
            'assigned': 'معين للكتّاب',
            'in_progress': 'قيد الكتابة',
            'ready_for_review': 'جاهز للمراجعة',
            'published': 'منشور',
            'archived': 'مؤرشف'
        };
        return labels[status] || status;
    }

    // إعداد مستمعي الأحداث
    function setupEventListeners() {
        // زر إنشاء مسودة جديدة
        const createDraftBtn = document.getElementById('createNewsDraftBtn');
        if (createDraftBtn) {
            createDraftBtn.addEventListener('click', async () => {
                try {
                    const news = await window.NewsWorkflowManager.createNewsDraft();
                    if (news) await loadAllNews();
                } catch (error) {
                    console.error('Error creating draft:', error);
                    showError('حدث خطأ عند إنشاء المسودة');
                }
            });
        }

        // أزرار التحديث
        const refreshButtons = [
            'refreshInProgressNewsBtn',
            'refreshReviewNewsBtn',
            'refreshPublishedNewsBtn',
            'refreshArchivedNewsBtn'
        ];

        refreshButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', loadAllNews);
            }
        });

        // فلاتر البحث
        const searchInputs = [
            'inProgressNewsSearchInput',
            'publishedNewsSearchInput'
        ];

        searchInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => {
                    if (inputId.includes('inProgress')) renderInProgress();
                    if (inputId.includes('published')) renderPublished();
                });
            }
        });

        // فلاتر القوائم المنسدلة
        const filters = [
            { id: 'inProgressNewsCommitteeFilter', render: renderInProgress },
            { id: 'publishedNewsCategoryFilter', render: renderPublished },
            { id: 'publishedNewsCommitteeFilter', render: renderPublished }
        ];

        filters.forEach(filter => {
            const el = document.getElementById(filter.id);
            if (el) {
                el.addEventListener('change', filter.render);
            }
        });
    }

    // عرض رسالة خطأ
    function showError(message) {
        if (window.Swal) {
            Swal.fire({
                title: 'خطأ',
                text: message,
                icon: 'error'
            });
        } else {
            alert(message);
        }
    }

    // عرض رسالة معلومات
    function showInfo(message) {
        if (window.Swal) {
            Swal.fire({
                title: 'معلومة',
                text: message,
                icon: 'info'
            });
        } else {
            alert(message);
        }
    }

    return {
        init,
        loadAllNews,
        assignWritersToDraft,
        editDraft,
        deleteDraft,
        publishNews,
        requestChanges,
        previewNews,
        archiveNews,
        restoreNews,
        viewNewsDetails
    };
})();
