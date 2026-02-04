/**
 * نظام إدارة الأخبار - نادي أدِيب
 */

window.NewsManager = (function() {
    const sb = window.sbClient;
    let currentUser = null;
    let allNews = [];

    async function init(user) {
        currentUser = user;
        await loadNews();
        setupEventListeners();
    }

    async function loadNews() {
        try {
            const { data, error } = await sb
                .from('news')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            allNews = data || [];
            updateStats();
            renderNewsList();
        } catch (error) {
            console.error('Error loading news:', error);
            showError('حدث خطأ في تحميل الأخبار');
        }
    }

    function updateStats() {
        const totalCount = allNews.length;
        const publishedCount = allNews.filter(n => n.status === 'published').length;
        const featuredCount = allNews.filter(n => n.is_featured).length;
        const totalViews = allNews.reduce((sum, n) => sum + (n.views || 0), 0);

        document.getElementById('totalNewsCount').textContent = totalCount;
        document.getElementById('publishedNewsCount').textContent = publishedCount;
        document.getElementById('featuredNewsCount').textContent = featuredCount;
        document.getElementById('totalNewsViews').textContent = totalViews;
    }

    function renderNewsList() {
        const container = document.getElementById('newsListContainer');
        if (!container) return;

        const searchTerm = document.getElementById('newsSearchInput')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('newsStatusFilter')?.value || '';

        let filteredNews = allNews.filter(news => {
            const matchesSearch = !searchTerm || 
                news.title?.toLowerCase().includes(searchTerm) ||
                news.summary?.toLowerCase().includes(searchTerm);
            const matchesStatus = !statusFilter || news.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        if (filteredNews.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #6b7280;">
                    <i class="fa-solid fa-inbox fa-3x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="font-size: 1.125rem; font-weight: 500;">لا توجد أخبار</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="items-grid">
                ${filteredNews.map(news => createNewsCard(news)).join('')}
            </div>
        `;
    }

    function createNewsCard(news) {
        const statusBadge = getStatusBadge(news.status);
        const publishedDate = news.published_at ? new Date(news.published_at).toLocaleDateString('ar-SA') : '-';
        const imageUrl = news.image_url || 'https://via.placeholder.com/400x300?text=أديب';

        return `
            <div class="application-card">
                <div class="application-card-header">
                    <img src="${imageUrl}" alt="${news.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px 8px 0 0; margin: -1rem -1rem 1rem -1rem;" onerror="this.src='https://via.placeholder.com/400x300?text=أديب'">
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
                    ${statusBadge}
                    <div style="display: flex; gap: 0.5rem; margin-right: auto;">
                        <button class="btn btn--icon btn--icon-sm" onclick="NewsManager.editNews('${news.id}')" title="تعديل">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button class="btn btn--icon btn--icon-sm btn--danger" onclick="NewsManager.deleteNews('${news.id}')" title="حذف">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function getStatusBadge(status) {
        const badges = {
            'draft': '<span class="badge badge-secondary"><i class="fa-solid fa-file"></i> مسودة</span>',
            'published': '<span class="badge badge-success"><i class="fa-solid fa-check-circle"></i> منشور</span>',
            'archived': '<span class="badge badge-warning"><i class="fa-solid fa-archive"></i> مؤرشف</span>'
        };
        return badges[status] || badges['draft'];
    }

    async function addNews() {
        const { value: formValues } = await Swal.fire({
            title: '<i class="fa-solid fa-newspaper"></i> إضافة خبر جديد',
            html: `
                <div style="text-align: right;">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">عنوان الخبر</label>
                        <input type="text" id="newsTitle" class="swal2-input" placeholder="عنوان الخبر" style="width: 100%; margin: 0;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">ملخص الخبر</label>
                        <textarea id="newsSummary" class="swal2-textarea" rows="2" placeholder="ملخص مختصر للخبر" style="width: 100%; margin: 0;"></textarea>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">محتوى الخبر</label>
                        <textarea id="newsContent" class="swal2-textarea" rows="5" placeholder="محتوى الخبر الكامل" style="width: 100%; margin: 0;"></textarea>
                    </div>
                    ${window.ImageUploadHelper ? window.ImageUploadHelper.createImageUploadInput({
                        label: 'صورة الخبر',
                        inputId: 'newsImageUpload',
                        previewId: 'newsImagePreview',
                        folder: 'news'
                    }) : `
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">رابط الصورة</label>
                            <input type="url" id="newsImageUrl" class="swal2-input" placeholder="https://example.com/image.jpg" style="width: 100%; margin: 0;">
                        </div>
                    `}
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الكاتب</label>
                        <input type="text" id="newsAuthor" class="swal2-input" placeholder="اسم الكاتب" style="width: 100%; margin: 0;">
                    </div>
                    <div style="margin-bottom: 1rem; display: flex; gap: 1rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="newsIsFeatured">
                            <span>خبر مميز</span>
                        </label>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الحالة</label>
                        <select id="newsStatus" class="swal2-select" style="width: 100%; margin: 0;">
                            <option value="draft">مسودة</option>
                            <option value="published">منشور</option>
                            <option value="archived">مؤرشف</option>
                        </select>
                    </div>
                </div>
            `,
            width: '600px',
            showCancelButton: true,
            confirmButtonText: 'إضافة',
            cancelButtonText: 'إلغاء',
            preConfirm: async () => {
                const title = document.getElementById('newsTitle').value;
                const summary = document.getElementById('newsSummary').value;
                const content = document.getElementById('newsContent').value;
                const author = document.getElementById('newsAuthor').value;
                const isFeatured = document.getElementById('newsIsFeatured').checked;
                const status = document.getElementById('newsStatus').value;

                if (!title || !content) {
                    Swal.showValidationMessage('يرجى إدخال عنوان الخبر والمحتوى');
                    return false;
                }

                // رفع الصورة إذا كان النظام متاحاً
                let imageUrl = null;
                if (window.ImageUploadHelper) {
                    try {
                        imageUrl = await window.ImageUploadHelper.uploadFromInput('newsImageUpload', 'news');
                    } catch (error) {
                        Swal.showValidationMessage('حدث خطأ أثناء رفع الصورة: ' + error.message);
                        return false;
                    }
                } else {
                    imageUrl = document.getElementById('newsImageUrl')?.value;
                }

                return { title, summary, content, imageUrl, author, isFeatured, status };
            }
        });

        if (formValues) {
            try {
                const newsData = {
                    title: formValues.title,
                    summary: formValues.summary,
                    content: formValues.content,
                    image_url: formValues.imageUrl || null,
                    author_name: formValues.author || null,
                    is_featured: formValues.isFeatured,
                    status: formValues.status,
                    created_by: currentUser.id,
                    published_at: formValues.status === 'published' ? new Date().toISOString() : null
                };

                const { error } = await sb.from('news').insert([newsData]);

                if (error) throw error;

                await Swal.fire({
                    title: 'تم بنجاح',
                    text: 'تم إضافة الخبر بنجاح',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                await loadNews();
            } catch (error) {
                console.error('Error adding news:', error);
                Swal.fire({
                    title: 'خطأ',
                    text: 'حدث خطأ أثناء إضافة الخبر',
                    icon: 'error'
                });
            }
        }
    }

    async function editNews(newsId) {
        const news = allNews.find(n => n.id === newsId);
        if (!news) return;

        const { value: formValues } = await Swal.fire({
            title: '<i class="fa-solid fa-edit"></i> تعديل الخبر',
            html: `
                <div style="text-align: right;">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">عنوان الخبر</label>
                        <input type="text" id="newsTitle" class="swal2-input" value="${news.title}" style="width: 100%; margin: 0;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">ملخص الخبر</label>
                        <textarea id="newsSummary" class="swal2-textarea" rows="2" style="width: 100%; margin: 0;">${news.summary || ''}</textarea>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">محتوى الخبر</label>
                        <textarea id="newsContent" class="swal2-textarea" rows="5" style="width: 100%; margin: 0;">${news.content}</textarea>
                    </div>
                    ${window.ImageUploadHelper ? window.ImageUploadHelper.createImageUploadInput({
                        label: 'صورة الخبر',
                        inputId: 'newsImageUpload',
                        previewId: 'newsImagePreview',
                        folder: 'news',
                        currentImageUrl: news.image_url
                    }) : `
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">رابط الصورة</label>
                            <input type="url" id="newsImageUrl" class="swal2-input" value="${news.image_url || ''}" style="width: 100%; margin: 0;">
                        </div>
                    `}
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الكاتب</label>
                        <input type="text" id="newsAuthor" class="swal2-input" value="${news.author_name || ''}" style="width: 100%; margin: 0;">
                    </div>
                    <div style="margin-bottom: 1rem; display: flex; gap: 1rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="newsIsFeatured" ${news.is_featured ? 'checked' : ''}>
                            <span>خبر مميز</span>
                        </label>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الحالة</label>
                        <select id="newsStatus" class="swal2-select" style="width: 100%; margin: 0;">
                            <option value="draft" ${news.status === 'draft' ? 'selected' : ''}>مسودة</option>
                            <option value="published" ${news.status === 'published' ? 'selected' : ''}>منشور</option>
                            <option value="archived" ${news.status === 'archived' ? 'selected' : ''}>مؤرشف</option>
                        </select>
                    </div>
                </div>
            `,
            width: '600px',
            showCancelButton: true,
            confirmButtonText: 'حفظ',
            cancelButtonText: 'إلغاء',
            preConfirm: async () => {
                const title = document.getElementById('newsTitle').value;
                const summary = document.getElementById('newsSummary').value;
                const content = document.getElementById('newsContent').value;
                const author = document.getElementById('newsAuthor').value;
                const isFeatured = document.getElementById('newsIsFeatured').checked;
                const status = document.getElementById('newsStatus').value;

                if (!title || !content) {
                    Swal.showValidationMessage('يرجى إدخال عنوان الخبر والمحتوى');
                    return false;
                }

                // رفع الصورة إذا كان النظام متاحاً
                let imageUrl = news.image_url;
                if (window.ImageUploadHelper) {
                    try {
                        const newImageUrl = await window.ImageUploadHelper.uploadFromInput('newsImageUpload', 'news');
                        if (newImageUrl) imageUrl = newImageUrl;
                    } catch (error) {
                        Swal.showValidationMessage('حدث خطأ أثناء رفع الصورة: ' + error.message);
                        return false;
                    }
                } else {
                    const urlInput = document.getElementById('newsImageUrl');
                    if (urlInput) imageUrl = urlInput.value;
                }

                return { title, summary, content, imageUrl, author, isFeatured, status };
            }
        });

        if (formValues) {
            try {
                const newsData = {
                    title: formValues.title,
                    summary: formValues.summary,
                    content: formValues.content,
                    image_url: formValues.imageUrl || null,
                    author_name: formValues.author || null,
                    is_featured: formValues.isFeatured,
                    status: formValues.status,
                    published_at: formValues.status === 'published' && !news.published_at ? new Date().toISOString() : news.published_at
                };

                const { error } = await sb.from('news').update(newsData).eq('id', newsId);

                if (error) throw error;

                await Swal.fire({
                    title: 'تم بنجاح',
                    text: 'تم تحديث الخبر بنجاح',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                await loadNews();
            } catch (error) {
                console.error('Error updating news:', error);
                Swal.fire({
                    title: 'خطأ',
                    text: 'حدث خطأ أثناء تحديث الخبر',
                    icon: 'error'
                });
            }
        }
    }

    async function deleteNews(newsId) {
        const result = await Swal.fire({
            title: 'تأكيد الحذف',
            text: 'هل أنت متأكد من حذف هذا الخبر؟',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#dc2626'
        });

        if (result.isConfirmed) {
            try {
                const { error } = await sb.from('news').delete().eq('id', newsId);

                if (error) throw error;

                await Swal.fire({
                    title: 'تم الحذف',
                    text: 'تم حذف الخبر بنجاح',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                await loadNews();
            } catch (error) {
                console.error('Error deleting news:', error);
                Swal.fire({
                    title: 'خطأ',
                    text: 'حدث خطأ أثناء حذف الخبر',
                    icon: 'error'
                });
            }
        }
    }

    function setupEventListeners() {
        const addNewsBtn = document.getElementById('addNewsBtn');
        if (addNewsBtn) {
            addNewsBtn.addEventListener('click', addNews);
        }

        const refreshNewsBtn = document.getElementById('refreshNewsBtn');
        if (refreshNewsBtn) {
            refreshNewsBtn.addEventListener('click', loadNews);
        }

        const searchInput = document.getElementById('newsSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', renderNewsList);
        }

        const statusFilter = document.getElementById('newsStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', renderNewsList);
        }
    }

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

    return {
        init,
        loadNews,
        addNews,
        editNews,
        deleteNews
    };
})();
