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
                <div style="text-align: center; padding: 3rem; color: #6b7280;">
                    <i class="fa-solid fa-inbox fa-3x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="font-size: 1.125rem; font-weight: 500;">لا توجد أخبار معينة لك</p>
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
                                <span class="info-value">${assignment.assigned_by_profile?.full_name || 'غير محدد'}</span>
                            </div>
                        </div>
                        ${assignment.assignment_notes ? `
                            <div class="info-item" style="grid-column: 1 / -1;">
                                <i class="fa-solid fa-note-sticky"></i>
                                <div class="info-content">
                                    <span class="info-label">تعليمات</span>
                                    <span class="info-value">${assignment.assignment_notes}</span>
                                </div>
                            </div>
                        ` : ''}
                        ${news.review_notes && assignment.status === 'in_progress' ? `
                            <div class="info-item" style="grid-column: 1 / -1; background: #fef3c7; padding: 0.75rem; border-radius: 6px;">
                                <i class="fa-solid fa-exclamation-circle" style="color: #f59e0b;"></i>
                                <div class="info-content">
                                    <span class="info-label" style="color: #92400e;">ملاحظات المراجعة</span>
                                    <span class="info-value" style="color: #92400e;">${news.review_notes}</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    ${assignment.status !== 'completed' ? `
                        <div style="margin-top: 1rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <span style="font-size: 0.875rem; font-weight: 500;">التقدم</span>
                                <span style="font-size: 0.875rem; color: #6b7280;">${progressPercentage}%</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                                <div style="width: ${progressPercentage}%; height: 100%; background: linear-gradient(90deg, #3b82f6, #2563eb); transition: width 0.3s;"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="application-card-footer">
                    ${statusBadge}
                    <div style="display: flex; gap: 0.5rem; margin-right: auto;">
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
        const availableFields = news.available_fields?.fields || [];

        // بناء حقول النموذج بناءً على الصلاحيات
        let formFields = '';

        if (availableFields.includes('content')) {
            formFields += `
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">المحتوى الرئيسي *</label>
                    <textarea id="newsContent" class="swal2-textarea" rows="8" style="width: 100%; margin: 0; font-family: inherit;">${news.content || ''}</textarea>
                </div>
            `;
        }

        if (availableFields.includes('summary')) {
            formFields += `
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الملخص *</label>
                    <textarea id="newsSummary" class="swal2-textarea" rows="3" style="width: 100%; margin: 0;">${news.summary || ''}</textarea>
                </div>
            `;
        }

        if (availableFields.includes('image_url')) {
            formFields += `
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
            `;
        }

        if (availableFields.includes('tags')) {
            formFields += `
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الوسوم (Tags)</label>
                    <input type="text" id="newsTags" class="swal2-input" placeholder="افصل بين الوسوم بفاصلة" value="${(news.tags || []).join(', ')}" style="width: 100%; margin: 0;">
                    <small style="color: #6b7280; font-size: 0.75rem;">مثال: فعالية, ورشة عمل, إنجاز</small>
                </div>
            `;
        }

        const { value: formValues } = await Swal.fire({
            title: `<i class="fa-solid fa-pen"></i> كتابة: ${news.title}`,
            html: `
                <div style="text-align: right;">
                    <div style="background: #f3f4f6; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                        <p style="margin: 0; font-size: 0.875rem; color: #6b7280;">
                            <i class="fa-solid fa-info-circle"></i> يمكنك تعديل الحقول التالية فقط
                        </p>
                    </div>

                    ${formFields}

                    <div style="margin-top: 1rem; padding: 1rem; background: #eff6ff; border-radius: 8px; border-right: 4px solid #3b82f6;">
                        <p style="margin: 0; font-size: 0.875rem; color: #1e40af;">
                            <i class="fa-solid fa-lightbulb"></i> سيتم حفظ عملك تلقائياً. يمكنك العودة لاحقاً لإكمال الكتابة.
                        </p>
                    </div>
                </div>
            `,
            width: '800px',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: '<i class="fa-solid fa-paper-plane"></i> إرسال للمراجعة',
            denyButtonText: '<i class="fa-solid fa-save"></i> حفظ المسودة',
            cancelButtonText: 'إلغاء',
            preConfirm: async () => {
                return await saveNewsContent(assignment, availableFields, true);
            },
            preDeny: async () => {
                return await saveNewsContent(assignment, availableFields, false);
            }
        });

        if (formValues) {
            await loadMyAssignments();
        }
    }

    // حفظ محتوى الخبر
    async function saveNewsContent(assignment, availableFields, submitForReview = false) {
        try {
            const updateData = {};

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

            if (availableFields.includes('tags')) {
                const tagsInput = document.getElementById('newsTags')?.value;
                if (tagsInput) {
                    updateData.tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);
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
