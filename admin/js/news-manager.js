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
                <div class="empty-state">
                    <i class="fa-solid fa-inbox empty-state__icon"></i>
                    <p class="empty-state__title">لا توجد أخبار</p>
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
                    <img src="${imageUrl}" alt="${news.title}" class="news-card__image" onerror="this.src='https://via.placeholder.com/400x300?text=أديب'">
                    <div class="applicant-info">
                        <div class="applicant-details">
                            <h4 class="applicant-name">${news.title}</h4>
                            <p class="news-card__meta">${news.summary || ''}</p>
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
                    <div class="news-card__actions">
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
                <div class="modal-content-rtl">
                    <div class="form-group">
                        <label class="form-label">عنوان الخبر</label>
                        <input type="text" id="newsTitle" class="form-input" placeholder="عنوان الخبر">
                    </div>
                    <div class="form-group">
                        <label class="form-label">ملخص الخبر</label>
                        <textarea id="newsSummary" class="form-input" rows="2" placeholder="ملخص مختصر للخبر"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">محتوى الخبر</label>
                        <textarea id="newsContent" class="form-input" rows="5" placeholder="محتوى الخبر الكامل"></textarea>
                    </div>
                    ${window.ImageUploadHelper ? window.ImageUploadHelper.createImageUploadInput({
                        label: 'صورة الخبر',
                        inputId: 'newsImageUpload',
                        previewId: 'newsImagePreview',
                        folder: 'news'
                    }) : `
                        <div class="form-group">
                            <label class="form-label">رابط الصورة</label>
                            <input type="url" id="newsImageUrl" class="form-input" placeholder="https://example.com/image.jpg">
                        </div>
                    `}
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fa-solid fa-camera"></i>
                            مصور الغلاف <span class="required">*</span>
                        </label>
                        <input type="text" id="newsCoverPhotographer" class="form-input" placeholder="اسم مصور صورة الغلاف" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fa-solid fa-images"></i>
                            مصورو المعرض <span class="required">*</span>
                        </label>
                        <input type="text" id="newsGalleryPhotographers" class="form-input" placeholder="أسماء المصورين (افصل بفاصلة)" required>
                        <small class="form-hint">مثال: أحمد محمد، سارة علي</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">الكاتب</label>
                        <input type="text" id="newsAuthor" class="form-input" placeholder="اسم الكاتب">
                    </div>
                    <div class="form-group">
                        <label class="publish-option">
                            <input type="checkbox" id="newsIsFeatured">
                            <span>خبر مميز</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="form-label">الحالة</label>
                        <select id="newsStatus" class="form-input">
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
                const coverPhotographer = document.getElementById('newsCoverPhotographer').value;
                const galleryPhotographersInput = document.getElementById('newsGalleryPhotographers').value;
                const isFeatured = document.getElementById('newsIsFeatured').checked;
                const status = document.getElementById('newsStatus').value;

                if (!title || !content) {
                    Swal.showValidationMessage('يرجى إدخال عنوان الخبر والمحتوى');
                    return false;
                }

                if (!coverPhotographer || !coverPhotographer.trim()) {
                    Swal.showValidationMessage('يرجى إدخال اسم مصور الغلاف');
                    return false;
                }

                if (!galleryPhotographersInput || !galleryPhotographersInput.trim()) {
                    Swal.showValidationMessage('يرجى إدخال أسماء مصوري المعرض');
                    return false;
                }

                const galleryPhotographers = galleryPhotographersInput.split(/[،,]/).map(p => p.trim()).filter(p => p);

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

                return { title, summary, content, imageUrl, author, coverPhotographer, galleryPhotographers, isFeatured, status };
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
                    cover_photographer: formValues.coverPhotographer,
                    gallery_photographers: formValues.galleryPhotographers,
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
                <div class="modal-content-rtl">
                    <div class="form-group">
                        <label class="form-label">عنوان الخبر</label>
                        <input type="text" id="newsTitle" class="form-input" value="${news.title}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">ملخص الخبر</label>
                        <textarea id="newsSummary" class="form-input" rows="2">${news.summary || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">محتوى الخبر</label>
                        <textarea id="newsContent" class="form-input" rows="5">${news.content}</textarea>
                    </div>
                    ${window.ImageUploadHelper ? window.ImageUploadHelper.createImageUploadInput({
                        label: 'صورة الخبر',
                        inputId: 'newsImageUpload',
                        previewId: 'newsImagePreview',
                        folder: 'news',
                        currentImageUrl: news.image_url
                    }) : `
                        <div class="form-group">
                            <label class="form-label">رابط الصورة</label>
                            <input type="url" id="newsImageUrl" class="form-input" value="${news.image_url || ''}">
                        </div>
                    `}
                    <div class="form-group">
                        <label class="form-label">الكاتب</label>
                        <input type="text" id="newsAuthor" class="form-input" value="${news.author_name || ''}">
                    </div>
                    <div class="form-group">
                        <label class="publish-option">
                            <input type="checkbox" id="newsIsFeatured" ${news.is_featured ? 'checked' : ''}>
                            <span>خبر مميز</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="form-label">الحالة</label>
                        <select id="newsStatus" class="form-input">
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
