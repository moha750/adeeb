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
                <div class="empty-state">
                    <i class="fa-solid fa-inbox empty-state__icon"></i>
                    <p class="empty-state__title">لا توجد مسودات</p>
                    <p class="empty-state__text">ابدأ بإنشاء مسودة خبر جديد</p>
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
                            <div>
                                <span class="badge badge-secondary"><i class="fa-solid fa-file"></i> مسودة</span>
                            </div>
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
                        ${news.review_notes ? `
                            <div class="info-item info-item--full">
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
                    <div class="news-card__actions">
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
                <div class="empty-state">
                    <i class="fa-solid fa-inbox empty-state__icon"></i>
                    <p class="empty-state__title">لا توجد أخبار قيد الكتابة</p>
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
                            <div>${statusBadge}</div>
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
                    <div class="news-card__actions">
                        <button class="btn btn--outline btn--outline-primary btn--sm" onclick="NewsManagerEnhanced.viewNewsDetails('${news.id}')">
                            <i class="fa-solid fa-eye"></i>
                            عرض التفاصيل
                        </button>
                        <button class="btn btn--outline btn--outline-warning btn--sm" onclick="NewsManagerEnhanced.editWritersAssignment('${news.id}')">
                            <i class="fa-solid fa-user-pen"></i>
                            تعديل الكتّاب
                        </button>
                        <button class="btn btn--icon btn--icon-sm btn--danger" onclick="NewsManagerEnhanced.deleteNews('${news.id}')" title="حذف نهائي">
                            <i class="fa-solid fa-trash"></i>
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
                <div class="empty-state">
                    <i class="fa-solid fa-inbox empty-state__icon"></i>
                    <p class="empty-state__title">لا توجد أخبار جاهزة للمراجعة</p>
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
                            <div>
                                <span class="badge badge-success"><i class="fa-solid fa-check-circle"></i> جاهز للمراجعة</span>
                            </div>
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
                        <div class="info-box info-box--info">
                            <p class="info-box__text">${news.summary}</p>
                        </div>
                    ` : ''}
                </div>
                <div class="application-card-footer">
                    <div class="news-card__actions">
                        <button class="btn btn--primary btn--sm" onclick="NewsManagerEnhanced.publishNews('${news.id}')">
                            <i class="fa-solid fa-paper-plane"></i>
                            نشر
                        </button>
                        <button class="btn btn--outline btn--outline-warning btn--sm" onclick="NewsManagerEnhanced.requestChanges('${news.id}')">
                            <i class="fa-solid fa-comment-dots"></i>
                            طلب تعديلات
                        </button>
                        <button class="btn btn--outline btn--outline-info btn--sm" onclick="NewsManagerEnhanced.directEditNews('${news.id}')">
                            <i class="fa-solid fa-pen-to-square"></i>
                            تعديل مباشر
                        </button>
                        <button class="btn btn--outline btn--outline-primary btn--sm" onclick="NewsManagerEnhanced.previewNews('${news.id}')">
                            <i class="fa-solid fa-eye"></i>
                            معاينة
                        </button>
                        <button class="btn btn--icon btn--icon-sm btn--danger" onclick="NewsManagerEnhanced.deleteNews('${news.id}')" title="حذف نهائي">
                            <i class="fa-solid fa-trash"></i>
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
                <div class="empty-state">
                    <i class="fa-solid fa-inbox empty-state__icon"></i>
                    <p class="empty-state__title">لا توجد أخبار منشورة</p>
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
                    <img src="${imageUrl}" alt="${news.title}" class="news-card__image" onerror="this.src='https://via.placeholder.com/400x300?text=أديب'">
                    <div class="applicant-info">
                        <div class="applicant-details">
                            <h4 class="applicant-name">${news.title}</h4>
                            <div>
                                <span class="badge badge-success"><i class="fa-solid fa-check-circle"></i> منشور</span>
                                ${news.is_featured ? '<span class="badge badge-warning"><i class="fa-solid fa-star"></i> مميز</span>' : ''}
                            </div>
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
                    </div>
                </div>
                <div class="application-card-footer">
                    <div class="news-card__actions">
                        <button class="btn btn--outline btn--outline-primary btn--sm" onclick="window.open('/news/news-detail.html?id=${news.id}', '_blank')">
                            <i class="fa-solid fa-external-link"></i>
                            عرض في الموقع
                        </button>
                        <button class="btn btn--outline btn--outline-secondary btn--sm" onclick="NewsManagerEnhanced.archiveNews('${news.id}')">
                            <i class="fa-solid fa-archive"></i>
                            أرشفة
                        </button>
                        <button class="btn btn--icon btn--icon-sm btn--danger" onclick="NewsManagerEnhanced.deleteNewsPermanently('${news.id}')" title="حذف نهائي">
                            <i class="fa-solid fa-trash"></i>
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
                <div class="empty-state">
                    <i class="fa-solid fa-inbox empty-state__icon"></i>
                    <p class="empty-state__title">لا توجد أخبار مؤرشفة</p>
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
            <div class="application-card application-card--archived">
                <div class="application-card-header">
                    <div class="applicant-info">
                        <div class="applicant-details">
                            <h4 class="applicant-name">📦 ${news.title}</h4>
                        </div>
                    </div>
                </div>
                <div class="application-card-footer">
                    <span class="badge badge-secondary"><i class="fa-solid fa-archive"></i> مؤرشف</span>
                    <div class="news-card__actions">
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

        // جلب معرض الصور إن وجد
        let galleryHTML = '';
        if (news.gallery_images && news.gallery_images.length > 0) {
            galleryHTML = `
                <div class="news-gallery">
                    <h4 class="news-gallery__title">معرض الصور:</h4>
                    <div class="news-gallery__grid">
                        ${news.gallery_images.map(img => `
                            <img src="${img}" class="news-gallery__image" onerror="this.style.display='none'">
                        `).join('')}
                    </div>
                </div>
            `;
        }

        await ModalHelper.show({
            title: `📰 ${news.title}`,
            html: `
                <div class="modal-content-rtl">
                    ${news.image_url ? `<img src="${news.image_url}" class="news-preview__image" onerror="this.style.display='none'">` : ''}
                    ${news.summary ? `<p class="news-preview__summary">${news.summary}</p>` : ''}
                    <div class="news-preview__content">${news.content || 'لا يوجد محتوى'}</div>
                    ${galleryHTML}
                </div>
            `,
            size: 'lg',
            showClose: true,
            showFooter: true,
            footerButtons: [
                {
                    text: 'إغلاق',
                    class: 'btn--outline btn--outline-secondary'
                }
            ]
        });
    }

    // تعديلات مباشرة للمسؤول
    async function directEditNews(newsId) {
        const news = allNews.find(n => n.id === newsId);
        if (!news) return;

        const fields = [
            {
                name: 'title',
                type: 'text',
                label: 'عنوان الخبر',
                value: news.title,
                required: true
            },
            {
                name: 'summary',
                type: 'textarea',
                label: 'الملخص',
                value: news.summary || '',
                rows: 3
            },
            {
                name: 'content',
                type: 'textarea',
                label: 'المحتوى',
                value: news.content || '',
                rows: 8
            },
            {
                name: 'image_url',
                type: 'image',
                label: 'صورة الغلاف',
                folder: 'news',
                value: news.image_url || ''
            }
        ];

        try {
            await ModalHelper.form({
                title: '✏️ تعديلات مباشرة على الخبر',
                fields: fields,
                submitText: 'حفظ التعديلات',
                cancelText: 'إلغاء',
                onSubmit: async (formData) => {
                    const loadingToast = Toast.loading('جاري حفظ التعديلات...');

                    try {
                        const updateData = {
                            title: formData.title,
                            summary: formData.summary || null,
                            content: formData.content || null,
                            updated_at: new Date().toISOString()
                        };

                        if (formData.image_url) {
                            updateData.image_url = formData.image_url;
                        }

                        const { error } = await sb
                            .from('news')
                            .update(updateData)
                            .eq('id', newsId);

                        if (error) throw error;

                        Toast.close(loadingToast);
                        Toast.success('تم حفظ التعديلات بنجاح');
                        await loadAllNews();
                    } catch (error) {
                        Toast.close(loadingToast);
                        Toast.error('حدث خطأ في حفظ التعديلات');
                        console.error('Error updating news:', error);
                        throw error;
                    }
                }
            });
        } catch (error) {
            console.error('Error in directEditNews:', error);
        }
    }

    async function archiveNews(newsId) {
        const confirmed = await ModalHelper.confirm({
            title: 'تأكيد الأرشفة',
            message: 'هل تريد أرشفة هذا الخبر؟',
            type: 'warning',
            confirmText: 'نعم، أرشف',
            cancelText: 'إلغاء'
        });

        if (confirmed) {
            const loadingToast = Toast.loading('جاري الأرشفة...');
            try {
                const { error } = await sb
                    .from('news')
                    .update({ 
                        workflow_status: 'archived',
                        status: 'archived'
                    })
                    .eq('id', newsId);

                if (error) throw error;

                Toast.close(loadingToast);
                Toast.success('تم أرشفة الخبر بنجاح');
                await loadAllNews();
            } catch (error) {
                Toast.close(loadingToast);
                Toast.error('حدث خطأ عند الأرشفة');
                console.error('Error archiving news:', error);
            }
        }
    }

    async function restoreNews(newsId) {
        const loadingToast = Toast.loading('جاري الاستعادة...');
        try {
            const { error } = await sb
                .from('news')
                .update({ 
                    workflow_status: 'published',
                    status: 'published'
                })
                .eq('id', newsId);

            if (error) throw error;

            Toast.close(loadingToast);
            Toast.success('تم استعادة الخبر بنجاح');
            await loadAllNews();
        } catch (error) {
            Toast.close(loadingToast);
            Toast.error('حدث خطأ عند الاستعادة');
            console.error('Error restoring news:', error);
        }
    }

    async function viewNewsDetails(newsId) {
        const news = allNews.find(n => n.id === newsId);
        if (!news) return;

        // جلب أسماء الكتّاب المعينين
        let writersHTML = '';
        if (news.assigned_writers?.length > 0) {
            try {
                const { data: writers } = await sb
                    .from('news_writer_assignments')
                    .select('writer_id, assigned_fields, profiles:writer_id(full_name, avatar_url)')
                    .eq('news_id', newsId);

                if (writers && writers.length > 0) {
                    writersHTML = `
                        <div class="info-box info-box--info">
                            <i class="fa-solid fa-users"></i>
                            <strong>الكتّاب المعينون (${writers.length}):</strong>
                            <div class="writers-list">
                                ${writers.map(w => `
                                    <div class="user-select-item">
                                        <img src="${w.profiles?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(w.profiles?.full_name || '')}" class="user-select-avatar">
                                        <div class="user-select-info">
                                            <div class="user-select-name">${w.profiles?.full_name || 'غير معروف'}</div>
                                            <div class="user-select-email">
                                                ${(w.assigned_fields || []).map(f => getFieldLabel(f)).join('، ') || 'جميع الحقول'}
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Error loading writers:', error);
            }
        }

        ModalHelper.show({
            title: '<i class="fa-solid fa-info-circle"></i> تفاصيل الخبر',
            html: `
                <div class="modal-content-rtl">
                    <h3 class="news-details__title">${news.title}</h3>
                    <div class="news-details__grid">
                        <div class="info-box">
                            <i class="fa-solid fa-sitemap"></i>
                            <strong>اللجنة:</strong> ${news.committees?.committee_name_ar || 'غير محدد'}
                        </div>
                        <div class="info-box">
                            <i class="fa-solid fa-tasks"></i>
                            <strong>الحالة:</strong> ${getWorkflowStatusLabel(news.workflow_status)}
                        </div>
                        ${news.assigned_by_profile ? `
                        <div class="info-box">
                            <i class="fa-solid fa-user-check"></i>
                            <strong>معين من:</strong> ${news.assigned_by_profile.full_name}
                        </div>` : ''}
                        ${writersHTML}
                        ${news.review_notes ? `
                        <div class="info-box info-box--warning">
                            <i class="fa-solid fa-sticky-note"></i>
                            <strong>ملاحظات:</strong> ${news.review_notes}
                        </div>` : ''}
                    </div>
                </div>
            `,
            size: 'md',
            showClose: true,
            showFooter: true,
            footerButtons: [
                {
                    text: 'إغلاق',
                    class: 'btn--outline btn--outline-secondary'
                }
            ]
        });
    }

    function getFieldLabel(field) {
        const labels = {
            'title': 'العنوان',
            'content': 'المحتوى',
            'summary': 'الملخص',
            'image_url': 'صورة الغلاف',
            'gallery_images': 'معرض الصور'
        };
        return labels[field] || field;
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

    // تعديل تعيين الكتّاب
    async function editWritersAssignment(newsId) {
        if (window.NewsWorkflowManager) {
            await window.NewsWorkflowManager.editWritersAssignment(newsId);
        }
    }

    // حذف خبر نهائياً
    async function deleteNews(newsId) {
        const confirmed = await ModalHelper.confirm({
            title: 'حذف الخبر نهائياً',
            message: 'هل أنت متأكد من حذف هذا الخبر نهائياً؟ لا يمكن التراجع عن هذا الإجراء.',
            type: 'danger',
            confirmText: 'نعم، احذف نهائياً',
            cancelText: 'إلغاء'
        });

        if (!confirmed) return;

        const loadingToast = Toast.loading('جاري الحذف...');

        try {
            // حذف التعيينات أولاً
            await sb
                .from('news_writer_assignments')
                .delete()
                .eq('news_id', newsId);

            // حذف صلاحيات الحقول
            await sb
                .from('news_field_permissions')
                .delete()
                .eq('news_id', newsId);

            // حذف سجل النشاط
            await sb
                .from('news_activity_log')
                .delete()
                .eq('news_id', newsId);

            // حذف الخبر
            const { error } = await sb
                .from('news')
                .delete()
                .eq('id', newsId);

            if (error) throw error;

            Toast.close(loadingToast);
            Toast.success('تم حذف الخبر نهائياً');
            await loadAllNews();
        } catch (error) {
            Toast.close(loadingToast);
            Toast.error('حدث خطأ في حذف الخبر');
            console.error('Error deleting news:', error);
        }
    }

    // حذف خبر منشور نهائياً (نفس deleteNews)
    async function deleteNewsPermanently(newsId) {
        return deleteNews(newsId);
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
        viewNewsDetails,
        editWritersAssignment,
        deleteNews,
        deleteNewsPermanently,
        directEditNews
    };
})();
