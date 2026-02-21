/**
 * نظام إدارة الكتّاب للأخبار - نادي أدِيب
 * يدير واجهة الكتّاب وتفاعلهم مع الأخبار المعينة لهم
 */

window.NewsWritersManager = (function() {
    const sb = window.sbClient;
    let currentUser = null;
    let myAssignments = [];

    async function init(user) {
        currentUser = user;
        await loadMyAssignments();
        setupEventListeners();
    }

    // تحميل الأخبار المعينة للكاتب
    async function loadMyAssignments() {
        try {
            const { data, error } = await sb
                .from('news_writer_assignments')
                .select(`
                    *,
                    news:news_id (
                        id,
                        title,
                        summary,
                        content,
                        image_url,
                        cover_photographer,
                        gallery_images,
                        gallery_photographers,
                        tags,
                        category,
                        workflow_status,
                        available_fields,
                        review_notes,
                        committees (committee_name_ar)
                    ),
                    assigned_by_profile:assigned_by (
                        full_name,
                        avatar_url
                    )
                `)
                .eq('writer_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            myAssignments = data || [];
            updateAssignmentsStats();
            renderMyAssignments();
        } catch (error) {
            console.error('Error loading assignments:', error);
            showError('حدث خطأ في تحميل الأخبار المعينة لك');
        }
    }

    // تحديث إحصائيات التعيينات
    function updateAssignmentsStats() {
        const pendingCount = myAssignments.filter(a => a.status === 'pending').length;
        const inProgressCount = myAssignments.filter(a => a.status === 'in_progress').length;
        const completedCount = myAssignments.filter(a => a.status === 'completed').length;
        const totalCount = myAssignments.length;

        const pendingEl = document.getElementById('myAssignmentsPendingCount');
        const inProgressEl = document.getElementById('myAssignmentsInProgressCount');
        const completedEl = document.getElementById('myAssignmentsCompletedCount');
        const totalEl = document.getElementById('myAssignmentsTotalCount');

        if (pendingEl) pendingEl.textContent = pendingCount;
        if (inProgressEl) inProgressEl.textContent = inProgressCount;
        if (completedEl) completedEl.textContent = completedCount;
        if (totalEl) totalEl.textContent = totalCount;
    }

    // عرض قائمة التعيينات
    function renderMyAssignments() {
        const container = document.getElementById('myAssignmentsContainer');
        if (!container) return;

        const statusFilter = document.getElementById('myAssignmentsStatusFilter')?.value || '';
        
        let filteredAssignments = myAssignments;
        if (statusFilter) {
            filteredAssignments = myAssignments.filter(a => a.status === statusFilter);
        }

        if (filteredAssignments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox empty-state__icon"></i>
                    <p class="empty-state__title">لا توجد أخبار معينة لك</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="items-grid">
                ${filteredAssignments.map(assignment => createAssignmentCard(assignment)).join('')}
            </div>
        `;
    }

    // إنشاء بطاقة تعيين
    function createAssignmentCard(assignment) {
        const news = assignment.news;
        const statusBadge = getAssignmentStatusBadge(assignment.status);
        const progressPercentage = calculateProgress(assignment);
        const assignedDate = new Date(assignment.assigned_at).toLocaleDateString('ar-SA');

        return `
            <div class="application-card">
                <div class="application-card-header">
                    <div class="applicant-info">
                        <div class="applicant-details">
                            <h4 class="applicant-name">📰 ${news.title}</h4>
                            <p class="news-card__meta">
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
                                <span class="info-value">${assignment.assigned_by_profile?.full_name || 'غير محدد'}</span>
                            </div>
                        </div>
                        ${assignment.assignment_notes ? `
                            <div class="info-item info-item--full">
                                <i class="fa-solid fa-note-sticky"></i>
                                <div class="info-content">
                                    <span class="info-label">تعليمات</span>
                                    <span class="info-value">${assignment.assignment_notes}</span>
                                </div>
                            </div>
                        ` : ''}
                        ${news.review_notes && assignment.status === 'in_progress' ? `
                            <div class="info-item info-item--full info-box--warning">
                                <i class="fa-solid fa-exclamation-circle"></i>
                                <div class="info-content">
                                    <span class="info-label">ملاحظات المراجعة</span>
                                    <span class="info-value">${news.review_notes}</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    ${assignment.status !== 'completed' ? `
                        <div class="progress-container">
                            <div class="progress-header">
                                <span class="progress-label">التقدم</span>
                                <span class="progress-text">${progressPercentage}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-bar__fill" data-width="${progressPercentage}"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="application-card-footer">
                    ${statusBadge}
                    <div class="news-card__actions">
                        ${assignment.status === 'pending' ? `
                            <button class="btn btn--primary btn--sm" onclick="NewsWritersManager.startWriting('${assignment.id}')">
                                <i class="fa-solid fa-play"></i>
                                بدء الكتابة
                            </button>
                        ` : assignment.status === 'in_progress' ? `
                            <button class="btn btn--primary btn--sm" onclick="NewsWritersManager.continueWriting('${assignment.id}')">
                                <i class="fa-solid fa-pen"></i>
                                متابعة الكتابة
                            </button>
                        ` : `
                            <button class="btn btn--outline btn--outline-primary btn--sm" onclick="NewsWritersManager.viewNews('${news.id}')">
                                <i class="fa-solid fa-eye"></i>
                                عرض
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    // حساب نسبة التقدم
    function calculateProgress(assignment) {
        if (assignment.status === 'completed') return 100;
        if (assignment.status === 'pending') return 0;
        
        // حساب بسيط بناءً على الحقول المملوءة
        const news = assignment.news;
        const availableFields = news.available_fields?.fields || [];
        let filledFields = 0;

        availableFields.forEach(field => {
            if (news[field] && news[field].toString().trim().length > 0) {
                filledFields++;
            }
        });

        return availableFields.length > 0 
            ? Math.round((filledFields / availableFields.length) * 100)
            : 50;
    }

    // الحصول على شارة حالة التعيين
    function getAssignmentStatusBadge(status) {
        const badges = {
            'pending': '<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> في الانتظار</span>',
            'in_progress': '<span class="badge badge-info"><i class="fa-solid fa-pen"></i> قيد الكتابة</span>',
            'completed': '<span class="badge badge-success"><i class="fa-solid fa-check-circle"></i> مكتمل</span>',
            'declined': '<span class="badge badge-danger"><i class="fa-solid fa-times-circle"></i> مرفوض</span>'
        };
        return badges[status] || badges['pending'];
    }

    // بدء الكتابة
    async function startWriting(assignmentId) {
        try {
            const { error } = await sb
                .from('news_writer_assignments')
                .update({
                    status: 'in_progress',
                    started_at: new Date().toISOString()
                })
                .eq('id', assignmentId);

            if (error) throw error;

            await loadMyAssignments();
            
            const assignment = myAssignments.find(a => a.id === assignmentId);
            if (assignment) {
                await openWritingEditor(assignment);
            }
        } catch (error) {
            console.error('Error starting writing:', error);
            showError('حدث خطأ عند بدء الكتابة');
        }
    }

    // متابعة الكتابة
    async function continueWriting(assignmentId) {
        const assignment = myAssignments.find(a => a.id === assignmentId);
        if (assignment) {
            await openWritingEditor(assignment);
        }
    }

    // فتح محرر الكتابة
    async function openWritingEditor(assignment) {
        const news = assignment.news;
        // استخدام الحقول المعينة للكاتب من التعيين أو من الخبر
        const writerFields = assignment.assigned_fields || [];
        const availableFields = writerFields.length > 0 ? writerFields : (news.available_fields?.fields || []);

        // بناء حقول النموذج بناءً على الصلاحيات
        let formFields = '';

        if (availableFields.includes('title')) {
            formFields += `
                <div class="form-group">
                    <label class="form-label">عنوان الخبر *</label>
                    <input type="text" id="newsTitle" value="${escapeHtml(news.title || '')}" class="form-input">
                </div>
            `;
        }

        if (availableFields.includes('content')) {
            formFields += `
                <div class="form-group">
                    <label class="form-label">المحتوى الرئيسي *</label>
                    <textarea id="newsContent" rows="10" class="form-input">${escapeHtml(news.content || '')}</textarea>
                </div>
            `;
        }

        if (availableFields.includes('summary')) {
            formFields += `
                <div class="form-group">
                    <label class="form-label">الملخص *</label>
                    <textarea id="newsSummary" rows="3" class="form-input">${escapeHtml(news.summary || '')}</textarea>
                </div>
            `;
        }

        if (availableFields.includes('image_url')) {
            formFields += `
                <div class="form-group">
                    <label class="form-label">صورة الغلاف</label>
                    <div id="coverImageContainer">
                        ${news.image_url ? `<img src="${news.image_url}" class="news-preview__image" id="coverImagePreview">` : ''}
                        <input type="file" id="coverImageInput" accept="image/*" class="form-input">
                        <input type="hidden" id="newsImageUrl" value="${news.image_url || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label form-label--secondary">
                            <i class="fa-solid fa-camera"></i>
                            اسم مصور الغلاف
                        </label>
                        <input type="text" id="coverPhotographer" 
                               value="${escapeHtml(news.cover_photographer || '')}"
                               placeholder="أدخل اسم المصور..."
                               class="form-input">
                    </div>
                </div>
            `;
        }

        if (availableFields.includes('gallery_images')) {
            const currentGallery = news.gallery_images || [];
            const currentPhotographers = news.gallery_photographers || [];
            formFields += `
                <div class="form-group">
                    <label class="form-label">
                        <i class="fa-solid fa-images"></i>
                        معرض الصور (2-4 صور)
                    </label>
                    <div id="galleryContainer" class="gallery-upload-container">
                        <div id="galleryPreview" class="news-gallery__grid">
                            ${currentGallery.map((img, idx) => `
                                <div class="gallery-item">
                                    <img src="${img}" class="news-gallery__image">
                                    <button type="button" onclick="this.parentElement.remove()" class="gallery-item__remove">
                                        <i class="fa-solid fa-times"></i>
                                    </button>
                                    <input type="hidden" class="gallery-image-url" value="${img}">
                                </div>
                            `).join('')}
                        </div>
                        <input type="file" id="galleryInput" accept="image/*" multiple class="form-input">
                        <p class="form-hint">
                            <i class="fa-solid fa-info-circle"></i> يمكنك إضافة من 2 إلى 4 صور للمعرض
                        </p>
                    </div>
                    <div class="form-group">
                        <label class="form-label form-label--secondary">
                            <i class="fa-solid fa-camera"></i>
                            أسماء مصوري المعرض (افصل بين الأسماء بفاصلة)
                        </label>
                        <input type="text" id="galleryPhotographers" 
                               value="${escapeHtml(currentPhotographers.join('، '))}"
                               placeholder="مثال: أحمد محمد، سارة علي..."
                               class="form-input">
                    </div>
                </div>
            `;
        }

        const modalHTML = `
            <div class="modal-content-rtl">
                <div class="info-box info-box--info">
                    <p class="info-box__text">
                        <i class="fa-solid fa-info-circle"></i> الحقول المتاحة لك: <strong>${availableFields.map(f => getFieldLabel(f)).join('، ')}</strong>
                    </p>
                </div>

                ${formFields}

                <div class="info-box info-box--success">
                    <p class="info-box__text">
                        <i class="fa-solid fa-lightbulb"></i> يمكنك حفظ المسودة والعودة لاحقاً لإكمال الكتابة.
                    </p>
                </div>
            </div>
        `;

        const modal = await ModalHelper.show({
            title: `✍️ كتابة: ${news.title}`,
            html: modalHTML,
            size: 'lg',
            showClose: true,
            showFooter: true,
            footerButtons: [
                {
                    text: 'إلغاء',
                    class: 'btn--outline btn--outline-secondary'
                },
                {
                    text: '<i class="fa-solid fa-save"></i> حفظ المسودة',
                    class: 'btn--outline btn--outline-primary',
                    callback: async () => {
                        const saved = await saveNewsContentNew(assignment, availableFields, false);
                        if (saved) {
                            await loadMyAssignments();
                            if (modal && modal.close) modal.close();
                        }
                    },
                    keepOpen: true
                },
                {
                    text: '<i class="fa-solid fa-paper-plane"></i> إرسال للمراجعة',
                    class: 'btn--primary',
                    callback: async () => {
                        const saved = await saveNewsContentNew(assignment, availableFields, true);
                        if (saved) {
                            await loadMyAssignments();
                            if (modal && modal.close) modal.close();
                        }
                    },
                    keepOpen: true
                }
            ]
        });

        // إعداد رفع الصور بعد فتح المودال
        setTimeout(() => {
            setupImageUploads();
        }, 100);
    }

    // إعداد رفع الصور
    function setupImageUploads() {
        // رفع صورة الغلاف
        const coverInput = document.getElementById('coverImageInput');
        if (coverInput) {
            coverInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file && window.ImageUploadHelper) {
                    const loadingToast = Toast.loading('جاري رفع الصورة...');
                    try {
                        const url = await window.ImageUploadHelper.uploadFile(file, 'news');
                        if (url) {
                            document.getElementById('newsImageUrl').value = url;
                            let preview = document.getElementById('coverImagePreview');
                            if (!preview) {
                                preview = document.createElement('img');
                                preview.id = 'coverImagePreview';
                                preview.style.cssText = 'max-width: 200px; border-radius: 8px; margin-bottom: 0.5rem;';
                                document.getElementById('coverImageContainer').prepend(preview);
                            }
                            preview.src = url;
                            Toast.close(loadingToast);
                            Toast.success('تم رفع الصورة بنجاح');
                        }
                    } catch (error) {
                        Toast.close(loadingToast);
                        Toast.error('فشل رفع الصورة');
                    }
                }
            });
        }

        // رفع صور المعرض
        const galleryInput = document.getElementById('galleryInput');
        if (galleryInput) {
            galleryInput.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                const galleryPreview = document.getElementById('galleryPreview');
                const currentCount = galleryPreview.querySelectorAll('.gallery-item').length;
                
                if (currentCount + files.length > 4) {
                    Toast.warning('الحد الأقصى للمعرض هو 4 صور');
                    return;
                }

                for (const file of files) {
                    if (window.ImageUploadHelper) {
                        const loadingToast = Toast.loading('جاري رفع الصورة...');
                        try {
                            const url = await window.ImageUploadHelper.uploadFile(file, 'news-gallery');
                            if (url) {
                                const itemHTML = `
                                    <div class="gallery-item">
                                        <img src="${url}" class="news-gallery__image">
                                        <button type="button" onclick="this.parentElement.remove()" class="gallery-item__remove">
                                            <i class="fa-solid fa-times"></i>
                                        </button>
                                        <input type="hidden" class="gallery-image-url" value="${url}">
                                    </div>
                                `;
                                galleryPreview.insertAdjacentHTML('beforeend', itemHTML);
                                Toast.close(loadingToast);
                            }
                        } catch (error) {
                            Toast.close(loadingToast);
                            Toast.error('فشل رفع الصورة');
                        }
                    }
                }
                galleryInput.value = '';
            });
        }
    }

    // دالة مساعدة للحصول على تسمية الحقل
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

    // دالة مساعدة لتنظيف HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // حفظ محتوى الخبر (النسخة الجديدة)
    async function saveNewsContentNew(assignment, availableFields, submitForReview = false) {
        const loadingToast = Toast.loading(submitForReview ? 'جاري الإرسال للمراجعة...' : 'جاري الحفظ...');
        
        try {
            const updateData = {};
            const modalElement = document.querySelector('.modal.active');

            // التحقق من الحقول المطلوبة قبل الإرسال للمراجعة
            if (availableFields.includes('title')) {
                const title = modalElement.querySelector('#newsTitle')?.value;
                if (submitForReview && (!title || !title.trim())) {
                    Toast.close(loadingToast);
                    Toast.warning('يرجى إدخال عنوان الخبر');
                    return false;
                }
                updateData.title = title;
            }

            if (availableFields.includes('content')) {
                const content = modalElement.querySelector('#newsContent')?.value;
                if (submitForReview && (!content || !content.trim())) {
                    Toast.close(loadingToast);
                    Toast.warning('يرجى إدخال المحتوى الرئيسي');
                    return false;
                }
                updateData.content = content;
            }

            if (availableFields.includes('summary')) {
                const summary = modalElement.querySelector('#newsSummary')?.value;
                if (submitForReview && (!summary || !summary.trim())) {
                    Toast.close(loadingToast);
                    Toast.warning('يرجى إدخال الملخص');
                    return false;
                }
                updateData.summary = summary;
            }

            if (availableFields.includes('image_url')) {
                const imageUrl = modalElement.querySelector('#newsImageUrl')?.value;
                if (imageUrl) updateData.image_url = imageUrl;
                
                // حفظ اسم مصور الغلاف
                const coverPhotographer = modalElement.querySelector('#coverPhotographer')?.value?.trim();
                if (coverPhotographer) updateData.cover_photographer = coverPhotographer;
            }

            if (availableFields.includes('gallery_images')) {
                const galleryUrls = Array.from(modalElement.querySelectorAll('.gallery-image-url'))
                    .map(input => input.value)
                    .filter(url => url);
                
                if (submitForReview && galleryUrls.length < 2) {
                    Toast.close(loadingToast);
                    Toast.warning('يرجى إضافة صورتين على الأقل للمعرض');
                    return false;
                }
                updateData.gallery_images = galleryUrls;
                
                // حفظ أسماء مصوري المعرض
                const galleryPhotographersInput = modalElement.querySelector('#galleryPhotographers')?.value?.trim();
                if (galleryPhotographersInput) {
                    updateData.gallery_photographers = galleryPhotographersInput.split(/[،,]/).map(p => p.trim()).filter(p => p);
                }
            }

            // تحديث الخبر
            const { error: newsError } = await sb
                .from('news')
                .update(updateData)
                .eq('id', assignment.news_id);

            if (newsError) throw newsError;

            // تحديث حالة التعيين
            const assignmentUpdate = {
                last_edited_at: new Date().toISOString()
            };

            if (submitForReview) {
                assignmentUpdate.status = 'completed';
                assignmentUpdate.completed_at = new Date().toISOString();

                await window.NewsWorkflowManager.submitForReview(assignment.news_id, currentUser.id);
            }

            const { error: assignError } = await sb
                .from('news_writer_assignments')
                .update(assignmentUpdate)
                .eq('id', assignment.id);

            if (assignError) throw assignError;

            Toast.close(loadingToast);
            Toast.success(submitForReview ? 'تم إرسال الخبر للمراجعة بنجاح' : 'تم حفظ التغييرات بنجاح');
            return true;
        } catch (error) {
            Toast.close(loadingToast);
            Toast.error('حدث خطأ أثناء الحفظ');
            console.error('Error saving news:', error);
            return false;
        }
    }

    // حفظ محتوى الخبر
    async function saveNewsContent(assignment, availableFields, submitForReview = false) {
        try {
            const updateData = {};

            if (availableFields.includes('title')) {
                const title = document.getElementById('newsTitle')?.value;
                if (!title && submitForReview) {
                    Swal.showValidationMessage('يرجى إدخال عنوان الخبر');
                    return false;
                }
                updateData.title = title;
            }

            if (availableFields.includes('content')) {
                const content = document.getElementById('newsContent')?.value;
                if (!content && submitForReview) {
                    Swal.showValidationMessage('يرجى إدخال المحتوى الرئيسي');
                    return false;
                }
                updateData.content = content;
            }

            if (availableFields.includes('summary')) {
                const summary = document.getElementById('newsSummary')?.value;
                if (!summary && submitForReview) {
                    Swal.showValidationMessage('يرجى إدخال الملخص');
                    return false;
                }
                updateData.summary = summary;
            }

            if (availableFields.includes('image_url')) {
                if (window.ImageUploadHelper) {
                    const imageUrl = await window.ImageUploadHelper.uploadFromInput('newsImageUpload', 'news');
                    if (imageUrl) updateData.image_url = imageUrl;
                } else {
                    const imageUrl = document.getElementById('newsImageUrl')?.value;
                    if (imageUrl) updateData.image_url = imageUrl;
                }
            }

            // تحديث الخبر
            const { error: newsError } = await sb
                .from('news')
                .update(updateData)
                .eq('id', assignment.news_id);

            if (newsError) throw newsError;

            // تحديث حالة التعيين
            const assignmentUpdate = {
                last_edited_at: new Date().toISOString()
            };

            if (submitForReview) {
                assignmentUpdate.status = 'completed';
                assignmentUpdate.completed_at = new Date().toISOString();

                // استخدام workflow manager لإرسال للمراجعة مع تمرير userId
                await window.NewsWorkflowManager.submitForReview(assignment.news_id, currentUser.id);

                Toast.success('تم إرسال الخبر للمراجعة بنجاح', 'تم الإرسال');
            } else {
                Toast.success('تم حفظ التغييرات بنجاح', 'تم الحفظ');
            }

            const { error: assignError } = await sb
                .from('news_writer_assignments')
                .update(assignmentUpdate)
                .eq('id', assignment.id);

            if (assignError) throw assignError;

            return true;
        } catch (error) {
            console.error('Error saving news:', error);
            Toast.error('حدث خطأ أثناء الحفظ: ' + error.message);
            return false;
        }
    }

    // عرض الخبر
    async function viewNews(newsId) {
        window.open(`/news/news-detail.html?id=${newsId}`, '_blank');
    }

    // إعداد مستمعي الأحداث
    function setupEventListeners() {
        const statusFilter = document.getElementById('myAssignmentsStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', renderMyAssignments);
        }

        const refreshBtn = document.getElementById('refreshMyAssignmentsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadMyAssignments);
        }
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

    return {
        init,
        loadMyAssignments,
        startWriting,
        continueWriting,
        viewNews
    };
})();
