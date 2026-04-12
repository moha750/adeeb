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
            'inProgressNewsCommitteeFilter'
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
            const [newsResult, commentsResult] = await Promise.all([
                sb
                    .from('news')
                    .select(`
                        *,
                        committees (committee_name_ar),
                        created_by_profile:created_by (full_name, avatar_url),
                        assigned_by_profile:assigned_by (full_name)
                    `)
                    .order('created_at', { ascending: false }),
                sb
                    .from('news_public_comments')
                    .select('news_id, is_approved')
            ]);

            if (newsResult.error) throw newsResult.error;

            const comments = commentsResult.data || [];
            const commentMap = {};
            const approvedMap = {};
            comments.forEach(c => {
                commentMap[c.news_id] = (commentMap[c.news_id] || 0) + 1;
                if (c.is_approved) approvedMap[c.news_id] = (approvedMap[c.news_id] || 0) + 1;
            });

            allNews = (newsResult.data || []).map(n => ({
                ...n,
                comments_count: commentMap[n.id] || 0,
                approved_comments_count: approvedMap[n.id] || 0
            }));

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

        const totalLikes = publishedNews.reduce((sum, n) => sum + (n.likes_count || 0), 0);
        const totalComments = publishedNews.reduce((sum, n) => sum + (n.comments_count || 0), 0);
        const pendingComments = publishedNews.reduce((sum, n) => sum + ((n.comments_count || 0) - (n.approved_comments_count || 0)), 0);

        updateStatElement('publishedNewsCount', publishedCount);
        updateStatElement('featuredNewsCount', featuredCount);
        updateStatElement('totalNewsViews', totalViews);
        updateStatElement('thisMonthNewsCount', thisMonthCount);
        updateStatElement('totalNewsLikes', totalLikes);
        updateStatElement('totalNewsComments', totalComments);
        updateStatElement('pendingNewsComments', pendingComments);

        // إحصائيات المؤرشفة
        const archivedNews = allNews.filter(n => n.workflow_status === 'archived' || n.status === 'archived');
        updateStatElement('archivedNewsCount', archivedNews.length);
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
                    <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                    <p class="empty-state__title">لا توجد مسودات</p>
                    <p class="empty-state__message">ابدأ بإنشاء مسودة خبر جديد</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="uc-grid">
                ${drafts.map(news => createDraftCard(news)).join('')}
            </div>
        `;
    }

    // إنشاء بطاقة مسودة
    function createDraftCard(news) {
        const createdDate = new Date(news.created_at).toLocaleDateString('ar-SA');
        
        return `
            <div class="uc-card">
                <div class="uc-card__header">
                    <div class="uc-card__header-inner">
                        <div class="uc-card__header-info">
                            <h4 class="uc-card__title">📄 ${news.title}</h4>
                            <div>
                                <span class="badge badge-secondary"><i class="fa-solid fa-file"></i> مسودة</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="uc-card__body">
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-calendar"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">تاريخ الإنشاء</span>
                                <span class="uc-card__info-value">${createdDate}</span>
                            </div>
                        </div>
                        ${news.review_notes ? `
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-note-sticky"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">ملاحظات</span>
                                    <span class="uc-card__info-value">${news.review_notes}</span>
                                </div>
                            </div>
                        ` : ''}
                </div>
                <div class="uc-card__footer">
                    <div class="news-card__actions">
                        <button class="btn btn-primary " onclick="NewsManagerEnhanced.assignWritersToDraft('${news.id}')">
                            <i class="fa-solid fa-users"></i>
                            تعيين كتّاب
                        </button>
                        <button class="btn btn-outline " onclick="NewsManagerEnhanced.editDraft('${news.id}')">
                            <i class="fa-solid fa-edit"></i>
                            تعديل
                        </button>
                        <button class="btn btn-icon btn-danger " onclick="NewsManagerEnhanced.deleteDraft('${news.id}')">
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
                    <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                    <p class="empty-state__title">لا توجد أخبار قيد الكتابة</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="uc-grid">
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
            <div class="uc-card">
                <div class="uc-card__header">
                    <div class="uc-card__header-inner">
                        <div class="uc-card__header-info">
                            <h4 class="uc-card__title">✍️ ${news.title}</h4>
                            <div>${statusBadge}</div>
                        </div>
                    </div>
                </div>
                <div class="uc-card__body">
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-calendar"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">تاريخ التعيين</span>
                                <span class="uc-card__info-value">${assignedDate}</span>
                            </div>
                        </div>
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-user"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">معين من</span>
                                <span class="uc-card__info-value">${news.assigned_by_profile?.full_name || 'غير محدد'}</span>
                            </div>
                        </div>
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-users"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">عدد الكتّاب</span>
                                <span class="uc-card__info-value">${news.assigned_writers?.length || 0}</span>
                            </div>
                        </div>
                </div>
                <div class="uc-card__footer">
                    <div class="news-card__actions">
                        <button class="btn btn-outline " onclick="NewsManagerEnhanced.viewNewsDetails('${news.id}')">
                            <i class="fa-solid fa-eye"></i>
                            عرض التفاصيل
                        </button>
                        <button class="btn btn-warning " onclick="NewsManagerEnhanced.editWritersAssignment('${news.id}')">
                            <i class="fa-solid fa-user-pen"></i>
                            تعديل الكتّاب
                        </button>
                        <button class="btn btn-icon btn-danger " onclick="NewsManagerEnhanced.deleteNews('${news.id}')" title="حذف نهائي">
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
                    <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                    <p class="empty-state__title">لا توجد أخبار جاهزة للمراجعة</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="uc-grid">
                ${reviewNews.map(news => createReviewCard(news)).join('')}
            </div>
        `;
    }

    // إنشاء بطاقة خبر للمراجعة
    function createReviewCard(news) {
        const submittedDate = news.submitted_at ? new Date(news.submitted_at).toLocaleDateString('ar-SA') : '-';

        return `
            <div class="uc-card">
                <div class="uc-card__header">
                    <div class="uc-card__header-inner">
                        <div class="uc-card__header-info">
                            <h4 class="uc-card__title">✅ ${news.title}</h4>
                            <div>
                                <span class="badge badge-success"><i class="fa-solid fa-check-circle"></i> جاهز للمراجعة</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="uc-card__body">
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-calendar"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">تاريخ الإرسال</span>
                                <span class="uc-card__info-value">${submittedDate}</span>
                            </div>
                        </div>
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-users"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">الكتّاب</span>
                                <span class="uc-card__info-value">${news.assigned_writers?.length || 0}</span>
                            </div>
                        </div>
                    ${news.summary ? `
                        <div class="info-box info-box--info">
                            <p class="info-box__text">${news.summary}</p>
                        </div>
                    ` : ''}
                </div>
                <div class="uc-card__footer">
                    <div class="news-card__actions">
                        <button class="btn btn-primary " onclick="NewsManagerEnhanced.publishNews('${news.id}')">
                            <i class="fa-solid fa-paper-plane"></i>
                            نشر
                        </button>
                        <button class="btn btn-warning " onclick="NewsManagerEnhanced.requestChanges('${news.id}')">
                            <i class="fa-solid fa-comment-dots"></i>
                            طلب تعديلات
                        </button>
                        <button class="btn btn-primary " onclick="NewsManagerEnhanced.directEditNews('${news.id}')">
                            <i class="fa-solid fa-pen-to-square"></i>
                            تعديل مباشر
                        </button>
                        <button class="btn btn-outline " onclick="NewsManagerEnhanced.previewNews('${news.id}')">
                            <i class="fa-solid fa-eye"></i>
                            معاينة
                        </button>
                        <button class="btn btn-icon btn-danger " onclick="NewsManagerEnhanced.deleteNews('${news.id}')" title="حذف نهائي">
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
        const featuredFilter = document.getElementById('publishedNewsFeaturedFilter')?.value || '';

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

        if (featuredFilter === 'featured') {
            publishedNews = publishedNews.filter(n => n.is_featured);
        } else if (featuredFilter === 'not_featured') {
            publishedNews = publishedNews.filter(n => !n.is_featured);
        }

        if (publishedNews.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                    <p class="empty-state__title">لا توجد أخبار منشورة</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="uc-grid">
                ${publishedNews.map(news => createPublishedCard(news)).join('')}
            </div>
        `;
    }

    // إنشاء بطاقة خبر منشور
    function createPublishedCard(news) {
        const publishedDate = news.published_at ? new Date(news.published_at).toLocaleDateString('ea-EA') : '-';
        const imageUrl = news.image_url || 'https://via.placeholder.com/800x450?text=أديب';
        const category = news.committees?.committee_name_ar || news.category || 'عام';
        const pendingComments = (news.comments_count || 0) - (news.approved_comments_count || 0);

        return `
            <div class="uc-card">
                <div class="uc-card__header uc-card__header--media">
                    <img src="${imageUrl}" alt="${news.title}" class="uc-card__media-img" onerror="this.src='https://via.placeholder.com/800x450?text=أديب'">
                    <div class="uc-card__badges-overlay">
                        <span class="uc-card__badge"><i class="fa-solid fa-check-circle"></i> منشور</span>
                        ${news.is_featured ? '<span class="uc-card__badge" style="background:rgba(245,158,11,0.25);color:#fde68a"><i class="fa-solid fa-star"></i> مميز</span>' : ''}
                    </div>
                    <div class="uc-card__header-inner">
                        <div class="uc-card__header-info">
                            <h4 class="uc-card__title">${news.title}</h4>
                        </div>
                    </div>
                </div>
                <div class="uc-card__body">
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-tag"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">التصنيف</span>
                            <span class="uc-card__info-value">${category}</span>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-calendar"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">تاريخ النشر</span>
                            <span class="uc-card__info-value">${publishedDate}</span>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-eye"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">المشاهدات</span>
                            <span class="uc-card__info-value">${(news.views || 0).toLocaleString('ea-EA')}</span>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-heart"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">الإعجابات</span>
                            <span class="uc-card__info-value">${(news.likes_count || 0).toLocaleString('ea-EA')}</span>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-comments"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">التعليقات${pendingComments > 0 ? ` <span style="color:#d97706;font-weight:700">(${pendingComments} بانتظار الموافقة)</span>` : ''}</span>
                            <span class="uc-card__info-value">${(news.comments_count || 0).toLocaleString('ea-EA')}</span>
                        </div>
                    </div>
                </div>
                <div class="uc-card__footer">
                    <button class="btn btn-primary" onclick="window.open('/news/news-detail.html?id=${news.id}', '_blank')">
                        <i class="fa-solid fa-external-link"></i>
                        عرض الخبر
                    </button>
                    <button class="btn btn-warning" onclick="NewsManagerEnhanced.directEditNews('${news.id}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                        تعديل الخبر
                    </button>
                    <button class="btn ${news.is_featured ? 'btn-violet' : 'btn-success'}" onclick="NewsManagerEnhanced.toggleFeatured('${news.id}')">
                        <i class="fa-solid ${news.is_featured ? 'fa-star-half-stroke' : 'fa-star'}"></i>
                        ${news.is_featured ? 'إلغاء التمييز' : 'جعله مميزاً'}
                    </button>
                    <button class="btn btn-slate" onclick="NewsManagerEnhanced.archiveNews('${news.id}')">
                        <i class="fa-solid fa-archive"></i>
                        أرشفة الخبر
                    </button>
                    <button class="btn btn-danger" onclick="NewsManagerEnhanced.deleteNews('${news.id}')">
                        <i class="fa-solid fa-trash"></i>
                        حذف الخبر
                    </button>
                </div>
            </div>
        `;
    }

    // عرض الأخبار المؤرشفة
    function renderArchived() {
        const container = document.getElementById('newsArchivedContainer');
        if (!container) return;

        const searchTerm = document.getElementById('archivedNewsSearchInput')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('archivedNewsCategoryFilter')?.value || '';
        const featuredFilter = document.getElementById('archivedNewsFeaturedFilter')?.value || '';

        let archivedNews = allNews.filter(n =>
            n.workflow_status === 'archived' || n.status === 'archived'
        );

        if (searchTerm) {
            archivedNews = archivedNews.filter(n =>
                (n.title || '').toLowerCase().includes(searchTerm) ||
                (n.summary || '').toLowerCase().includes(searchTerm)
            );
        }

        if (categoryFilter) {
            archivedNews = archivedNews.filter(n => n.category === categoryFilter);
        }

        if (featuredFilter === 'featured') {
            archivedNews = archivedNews.filter(n => n.is_featured);
        } else if (featuredFilter === 'not_featured') {
            archivedNews = archivedNews.filter(n => !n.is_featured);
        }

        if (archivedNews.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                    <p class="empty-state__title">لا توجد أخبار مؤرشفة</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="uc-grid">
                ${archivedNews.map(news => createArchivedCard(news)).join('')}
            </div>
        `;
    }

    // إنشاء بطاقة خبر مؤرشف
    function createArchivedCard(news) {
        const archivedDate = news.updated_at ? new Date(news.updated_at).toLocaleDateString('ea-EA') : '-';
        const publishedDate = news.published_at ? new Date(news.published_at).toLocaleDateString('ea-EA') : '-';
        const imageUrl = news.image_url || 'https://via.placeholder.com/800x450?text=أديب';
        const category = news.committees?.committee_name_ar || news.category || 'عام';

        return `
            <div class="uc-card uc-card--neutral">
                <div class="uc-card__header uc-card__header--media">
                    <img src="${imageUrl}" alt="${news.title}" class="uc-card__media-img" style="filter: grayscale(0.6);" onerror="this.src='https://via.placeholder.com/800x450?text=أديب'">
                    <div class="uc-card__badges-overlay">
                        <span class="uc-card__badge"><i class="fa-solid fa-box-archive"></i> مؤرشف</span>
                        ${news.is_featured ? '<span class="uc-card__badge"><i class="fa-solid fa-star"></i> مميز</span>' : ''}
                    </div>
                    <div class="uc-card__header-inner">
                        <div class="uc-card__header-info">
                            <h4 class="uc-card__title">${news.title}</h4>
                        </div>
                    </div>
                </div>
                <div class="uc-card__body">
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-tag"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">التصنيف</span>
                            <span class="uc-card__info-value">${category}</span>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-calendar"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">تاريخ النشر</span>
                            <span class="uc-card__info-value">${publishedDate}</span>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-box-archive"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">تاريخ الأرشفة</span>
                            <span class="uc-card__info-value">${archivedDate}</span>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-eye"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">المشاهدات</span>
                            <span class="uc-card__info-value">${(news.views || 0).toLocaleString('ea-EA')}</span>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-heart"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">الإعجابات</span>
                            <span class="uc-card__info-value">${(news.likes_count || 0).toLocaleString('ea-EA')}</span>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-comments"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">التعليقات</span>
                            <span class="uc-card__info-value">${(news.comments_count || 0).toLocaleString('ea-EA')}</span>
                        </div>
                    </div>
                </div>
                <div class="uc-card__footer">
                    <button class="btn btn-warning" onclick="NewsManagerEnhanced.directEditNews('${news.id}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                        تعديل الخبر
                    </button>
                    <button class="btn btn-success" onclick="NewsManagerEnhanced.restoreNews('${news.id}')">
                        <i class="fa-solid fa-rotate-left"></i>
                        استعادة الخبر
                    </button>
                    <button class="btn btn-danger" onclick="NewsManagerEnhanced.deleteNews('${news.id}')">
                        <i class="fa-solid fa-trash"></i>
                        حذف الخبر
                    </button>
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
            if (typeof window.navigateToSection === 'function') {
                window.navigateToSection('news-published-section');
            }
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
                    class: 'btn-outline'
                }
            ]
        });
    }

    // تعديلات مباشرة للمسؤول
    async function directEditNews(newsId) {
        const news = allNews.find(n => n.id === newsId);
        if (!news) return;

        const coverInputId = 'editNewsCoverImage';
        const galleryContainerId = 'editNewsGallery';
        const currentGallery = Array.isArray(news.gallery_images) ? news.gallery_images : [];
        const currentGalleryPhotographers = Array.isArray(news.gallery_photographers) ? news.gallery_photographers : [];

        const escapeAttr = (str) => String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const escapeText = (str) => String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const coverUploaderHTML = window.ImageUploadHelper
            ? window.ImageUploadHelper.createCoverImageUploader({
                inputId: coverInputId,
                currentImageUrl: news.image_url || null,
                folder: 'news',
                required: true,
                aspectRatio: 16/9
            })
            : `<input type="url" id="${coverInputId}_url" class="form-input" value="${escapeAttr(news.image_url)}" placeholder="رابط صورة الغلاف">`;

        const galleryUploaderHTML = window.ImageUploadHelper
            ? window.ImageUploadHelper.createNewsGalleryUploader({
                containerId: galleryContainerId,
                minImages: 2,
                maxImages: 4,
                currentImages: currentGallery,
                currentPhotographers: currentGalleryPhotographers,
                folder: 'news/gallery',
                required: true
            })
            : '';

        const modalHTML = `
            <div style="display: grid; gap: 1.5rem;">
                <div class="form-group">
                    <label class="form-label">
                        <span class="label-icon"><i class="fa-solid fa-heading"></i></span>
                        عنوان الخبر <span class="required-dot">*</span>
                    </label>
                    <input type="text" id="editNewsTitle" class="form-input" value="${escapeAttr(news.title)}"
                        placeholder="أدخل عنوان الخبر" required>
                </div>

                <div class="form-group">
                    <label class="form-label">
                        <span class="label-icon"><i class="fa-solid fa-align-right"></i></span>
                        ملخص الخبر <span class="required-dot">*</span>
                    </label>
                    <textarea id="editNewsSummary" class="form-input" rows="2" style="resize: vertical;"
                        placeholder="ملخص مختصر للخبر" required>${escapeText(news.summary)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">
                        <span class="label-icon"><i class="fa-solid fa-file-lines"></i></span>
                        محتوى الخبر <span class="required-dot">*</span>
                    </label>
                    <textarea id="editNewsContent" class="form-input" rows="8" style="resize: vertical;"
                        placeholder="محتوى الخبر الكامل" required>${escapeText(news.content)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">
                        <span class="label-icon"><i class="fa-solid fa-image"></i></span>
                        صورة غلاف الخبر <span class="required-dot">*</span>
                    </label>
                    <div id="editNewsCoverContainer">${coverUploaderHTML}</div>
                </div>

                <div class="form-group">
                    <label class="form-label">
                        <span class="label-icon"><i class="fa-solid fa-camera"></i></span>
                        اسم مصور الغلاف <span class="required-dot">*</span>
                    </label>
                    <input type="text" id="editNewsCoverPhotographer" class="form-input"
                        value="${escapeAttr(news.cover_photographer)}"
                        placeholder="أدخل اسم مصور صورة الغلاف" required>
                </div>

                <div class="form-group">
                    <label class="form-label">
                        <span class="label-icon"><i class="fa-solid fa-images"></i></span>
                        معرض صور الخبر (2-4 صور إجبارية)
                    </label>
                    <div id="editNewsGalleryContainer">${galleryUploaderHTML}</div>
                </div>
            </div>
        `;

        const modal = await ModalHelper.show({
            title: 'تعديلات مباشرة على الخبر',
            iconClass: 'fa-solid fa-pen-to-square',
            html: modalHTML,
            size: 'lg',
            extraClass: 'modal-form',
            showFooter: true,
            footerButtons: [
                {
                    text: 'إلغاء',
                    class: 'btn-secondary'
                },
                {
                    text: 'حفظ التعديلات',
                    class: 'btn-primary',
                    keepOpen: true,
                    callback: async () => {
                        const title = document.getElementById('editNewsTitle')?.value.trim() || '';
                        const summary = document.getElementById('editNewsSummary')?.value.trim() || '';
                        const content = document.getElementById('editNewsContent')?.value.trim() || '';
                        const coverPhotographer = document.getElementById('editNewsCoverPhotographer')?.value.trim() || '';

                        if (!title) { Toast.warning('يرجى إدخال عنوان الخبر'); return; }
                        if (!summary) { Toast.warning('يرجى إدخال ملخص الخبر'); return; }
                        if (!content) { Toast.warning('يرجى إدخال محتوى الخبر'); return; }

                        const coverImageUrl = window.ImageUploadHelper
                            ? window.ImageUploadHelper.getCoverImageUrl(coverInputId)
                            : document.getElementById(coverInputId + '_url')?.value;

                        if (!coverImageUrl) { Toast.warning('يرجى رفع صورة غلاف الخبر'); return; }
                        if (!coverPhotographer) { Toast.warning('يرجى إدخال اسم مصور صورة الغلاف'); return; }

                        const galleryImages = window.ImageUploadHelper
                            ? window.ImageUploadHelper.getGalleryUrls(galleryContainerId)
                            : [];
                        const galleryPhotographers = window.ImageUploadHelper
                            ? window.ImageUploadHelper.getGalleryPhotographers(galleryContainerId)
                            : [];

                        if (galleryImages.length < 2) {
                            Toast.warning('يجب إضافة صورتين على الأقل في معرض الصور');
                            return;
                        }

                        const missingPhotographerIndex = galleryImages.findIndex((_, i) => !galleryPhotographers[i] || !String(galleryPhotographers[i]).trim());
                        if (missingPhotographerIndex !== -1) {
                            Toast.warning(`يرجى إدخال اسم مصور الصورة رقم ${missingPhotographerIndex + 1} في المعرض`);
                            return;
                        }

                        const loadingToast = Toast.loading('جاري حفظ التعديلات...');
                        try {
                            const { error } = await sb
                                .from('news')
                                .update({
                                    title,
                                    summary,
                                    content,
                                    image_url: coverImageUrl,
                                    cover_photographer: coverPhotographer,
                                    gallery_images: galleryImages,
                                    gallery_photographers: galleryPhotographers,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', newsId);

                            if (error) throw error;

                            Toast.close(loadingToast);
                            Toast.success('تم حفظ التعديلات بنجاح');
                            if (modal && modal.close) modal.close();
                            await loadAllNews();
                        } catch (error) {
                            Toast.close(loadingToast);
                            Toast.error('حدث خطأ في حفظ التعديلات');
                            console.error('Error updating news:', error);
                        }
                    }
                }
            ]
        });

        setTimeout(() => {
            ['editNewsSummary', 'editNewsContent'].forEach(id => {
                const ta = document.getElementById(id);
                if (!ta) return;
                ta.style.height = 'auto';
                const contentHeight = ta.scrollHeight;
                ta.style.minHeight = contentHeight + 'px';
                ta.style.height = (contentHeight + 120) + 'px';
            });
        }, 50);
    }

    async function toggleFeatured(newsId) {
        const news = allNews.find(n => n.id === newsId);
        if (!news) return;

        const makeFeatured = !news.is_featured;
        const loadingToast = Toast.loading(makeFeatured ? 'جاري تمييز الخبر...' : 'جاري إلغاء التمييز...');

        try {
            const { error } = await sb
                .from('news')
                .update({
                    is_featured: makeFeatured,
                    updated_at: new Date().toISOString()
                })
                .eq('id', newsId);

            if (error) throw error;

            Toast.close(loadingToast);
            Toast.success(makeFeatured ? 'تم تمييز الخبر بنجاح' : 'تم إلغاء تمييز الخبر');
            await loadAllNews();
        } catch (error) {
            Toast.close(loadingToast);
            Toast.error('حدث خطأ في تحديث حالة التمييز');
            console.error('Error toggling featured:', error);
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
                    class: 'btn-outline'
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

        // قائمة خيارات بطاقة الخبر (dropdown-menu موحد)
        let newsOptionsDropdown = document.getElementById('newsCardOptionsDropdown');
        if (!newsOptionsDropdown) {
            newsOptionsDropdown = document.createElement('div');
            newsOptionsDropdown.id = 'newsCardOptionsDropdown';
            newsOptionsDropdown.className = 'dropdown-menu';
            newsOptionsDropdown.innerHTML = `
                <button class="btn btn-warning btn-outline btn-block" data-action="archive">
                    <i class="fa-solid fa-archive"></i> أرشفة
                </button>
                <div class="dropdown-divider"></div>
                <button class="btn btn-danger btn-outline btn-block" data-action="delete">
                    <i class="fa-solid fa-trash"></i> حذف نهائي
                </button>
            `;
            document.body.appendChild(newsOptionsDropdown);

            newsOptionsDropdown.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('[data-action]');
                if (!actionBtn) return;
                const newsId = newsOptionsDropdown.dataset.activeNewsId;
                newsOptionsDropdown.classList.remove('show');
                if (!newsId) return;
                if (actionBtn.dataset.action === 'archive') {
                    NewsManagerEnhanced.archiveNews(newsId);
                } else if (actionBtn.dataset.action === 'delete') {
                    NewsManagerEnhanced.deleteNewsPermanently(newsId);
                }
            });

            document.addEventListener('click', (e) => {
                const trigger = e.target.closest('.btn-news-options');
                if (trigger) {
                    e.stopPropagation();
                    const newsId = trigger.dataset.newsId;
                    const wasOpen = newsOptionsDropdown.classList.contains('show') &&
                                    newsOptionsDropdown.dataset.activeNewsId === newsId;
                    newsOptionsDropdown.classList.remove('show');
                    if (wasOpen) return;
                    newsOptionsDropdown.dataset.activeNewsId = newsId;
                    const rect = trigger.getBoundingClientRect();
                    newsOptionsDropdown.style.top = (rect.bottom + 6) + 'px';
                    newsOptionsDropdown.style.left = rect.left + 'px';
                    newsOptionsDropdown.classList.add('show');
                    return;
                }
                if (!e.target.closest('#newsCardOptionsDropdown')) {
                    newsOptionsDropdown.classList.remove('show');
                }
            });
        }

        // فلاتر البحث
        const searchInputs = [
            'inProgressNewsSearchInput',
            'publishedNewsSearchInput',
            'archivedNewsSearchInput'
        ];

        searchInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => {
                    if (inputId.includes('inProgress')) renderInProgress();
                    if (inputId.includes('published')) renderPublished();
                    if (inputId.includes('archived')) renderArchived();
                });
            }
        });

        // فلاتر القوائم المنسدلة
        const filters = [
            { id: 'inProgressNewsCommitteeFilter', render: renderInProgress },
            { id: 'publishedNewsCategoryFilter', render: renderPublished },
            { id: 'publishedNewsFeaturedFilter', render: renderPublished },
            { id: 'archivedNewsCategoryFilter', render: renderArchived },
            { id: 'archivedNewsFeaturedFilter', render: renderArchived }
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
        directEditNews,
        toggleFeatured
    };
})();


