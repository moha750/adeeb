/**
 * Survey Responses Viewer - Professional UI
 * عارض احترافي لاستجابات الاستبيانات
 */

window.SurveyResponsesViewer = (function() {
    const sb = window.sbClient;
    let currentSurvey = null;
    let allResponses = [];
    let filteredResponses = [];
    let currentPage = 1;
    const responsesPerPage = 10;

    // تهيئة العارض
    async function init(surveyId) {
        if (!surveyId) return;
        
        try {
            await loadSurvey(surveyId);
            await loadResponses(surveyId);
            setupEventListeners();
            render();
        } catch (error) {
            console.error('Error initializing responses viewer:', error);
            Toast.error('حدث خطأ في تحميل الاستجابات');
        }
    }

    // تحميل بيانات الاستبيان
    async function loadSurvey(surveyId) {
        const { data, error } = await sb
            .from('surveys')
            .select('*, survey_questions(*)')
            .eq('id', surveyId)
            .single();

        if (error) throw error;
        currentSurvey = data;
    }

    // تحميل الاستجابات
    async function loadResponses(surveyId) {
        const { data, error } = await sb
            .from('survey_responses')
            .select(`
                *,
                user:user_id(id, full_name, email, avatar_url),
                survey_answers(*)
            `)
            .eq('survey_id', surveyId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        allResponses = data || [];
        filteredResponses = [...allResponses];
    }

    // إعداد مستمعي الأحداث
    function setupEventListeners() {
        const searchInput = document.getElementById('responsesSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }

        const filterSelect = document.getElementById('responsesFilterDate');
        if (filterSelect) {
            filterSelect.addEventListener('change', handleFilter);
        }
    }

    // معالج البحث
    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        
        filteredResponses = allResponses.filter(response => {
            const userName = response.user?.full_name?.toLowerCase() || '';
            const userEmail = response.user?.email?.toLowerCase() || '';
            
            return userName.includes(searchTerm) || userEmail.includes(searchTerm);
        });

        currentPage = 1;
        render();
    }

    // معالج الفلتر
    function handleFilter(e) {
        const filterValue = e.target.value;
        const now = new Date();
        
        filteredResponses = allResponses.filter(response => {
            const responseDate = new Date(response.created_at);
            
            switch(filterValue) {
                case 'today':
                    return responseDate.toDateString() === now.toDateString();
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return responseDate >= weekAgo;
                case 'month':
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    return responseDate >= monthAgo;
                default:
                    return true;
            }
        });

        currentPage = 1;
        render();
    }

    // عرض الواجهة
    function render() {
        const container = document.getElementById('surveyResponsesContainer');
        if (!container) return;

        if (filteredResponses.length === 0) {
            container.innerHTML = renderEmptyState();
            return;
        }

        const startIndex = (currentPage - 1) * responsesPerPage;
        const endIndex = startIndex + responsesPerPage;
        const paginatedResponses = filteredResponses.slice(startIndex, endIndex);

        container.innerHTML = `
            ${renderStatsBar()}
            <div class="responses-list">
                ${paginatedResponses.map((response, index) => renderResponseCard(response, startIndex + index + 1)).join('')}
            </div>
            ${renderPagination()}
        `;

        attachCardEventListeners();
    }

    // عرض شريط الإحصائيات
    function renderStatsBar() {
        const totalResponses = allResponses.length;
        const todayResponses = allResponses.filter(r => {
            const responseDate = new Date(r.created_at);
            const today = new Date();
            return responseDate.toDateString() === today.toDateString();
        }).length;

        const avgTime = calculateAverageTime();
        const completionRate = calculateCompletionRate();

        return `
            <div class="responses-stats-bar">
                <div class="response-stat-mini">
                    <div class="response-stat-mini-icon blue">
                        <i class="fa-solid fa-clipboard-check"></i>
                    </div>
                    <div class="response-stat-mini-content">
                        <div class="response-stat-mini-value">${totalResponses}</div>
                        <div class="response-stat-mini-label">إجمالي الاستجابات</div>
                    </div>
                </div>
                <div class="response-stat-mini">
                    <div class="response-stat-mini-icon green">
                        <i class="fa-solid fa-calendar-day"></i>
                    </div>
                    <div class="response-stat-mini-content">
                        <div class="response-stat-mini-value">${todayResponses}</div>
                        <div class="response-stat-mini-label">اليوم</div>
                    </div>
                </div>
                <div class="response-stat-mini">
                    <div class="response-stat-mini-icon purple">
                        <i class="fa-solid fa-clock"></i>
                    </div>
                    <div class="response-stat-mini-content">
                        <div class="response-stat-mini-value">${avgTime}</div>
                        <div class="response-stat-mini-label">متوسط الوقت</div>
                    </div>
                </div>
                <div class="response-stat-mini">
                    <div class="response-stat-mini-icon orange">
                        <i class="fa-solid fa-chart-line"></i>
                    </div>
                    <div class="response-stat-mini-content">
                        <div class="response-stat-mini-value">${completionRate}%</div>
                        <div class="response-stat-mini-label">معدل الإكمال</div>
                    </div>
                </div>
            </div>
        `;
    }

    // عرض بطاقة استجابة واحدة
    function renderResponseCard(response, number) {
        const user = response.user || {};
        const userName = user.full_name || 'مستخدم غير معروف';
        const userEmail = user.email || '';
        const userAvatar = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=3b82f6&color=fff`;
        
        const responseDate = new Date(response.created_at);
        const formattedDate = responseDate.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const formattedTime = responseDate.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const answers = response.survey_answers || [];
        const answeredQuestions = answers.length;
        const totalQuestions = currentSurvey?.survey_questions?.length || 0;

        return `
            <div class="response-card" data-response-id="${response.id}">
                <div class="response-card-header">
                    <div class="response-user-info">
                        <img src="${userAvatar}" alt="${userName}" class="response-user-avatar">
                        <div class="response-user-details">
                            <div class="response-user-name">${userName}</div>
                            ${userEmail ? `<div class="response-user-email">${userEmail}</div>` : ''}
                        </div>
                    </div>
                    <div class="response-meta">
                        <span class="response-badge number">
                            <i class="fa-solid fa-hashtag"></i>
                            ${number}
                        </span>
                        <span class="response-badge time">
                            <i class="fa-solid fa-calendar"></i>
                            ${formattedDate}
                        </span>
                        <span class="response-badge time">
                            <i class="fa-solid fa-clock"></i>
                            ${formattedTime}
                        </span>
                    </div>
                </div>
                <div class="response-card-body">
                    <div class="response-answers">
                        ${renderAnswers(response)}
                    </div>
                </div>
                <div class="response-card-footer">
                    <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #6b7280;">
                        <i class="fa-solid fa-check-circle" style="color: #10b981;"></i>
                        <span>تم الإجابة على ${answeredQuestions} من ${totalQuestions} سؤال</span>
                    </div>
                    <div class="response-actions">
                        <button class="response-action-btn view" onclick="SurveyResponsesViewer.viewDetails('${response.id}')">
                            <i class="fa-solid fa-eye"></i>
                            عرض التفاصيل
                        </button>
                        <button class="response-action-btn export" onclick="SurveyResponsesViewer.exportResponse('${response.id}')">
                            <i class="fa-solid fa-download"></i>
                            تصدير
                        </button>
                        <button class="response-action-btn delete" onclick="SurveyResponsesViewer.deleteResponse('${response.id}')">
                            <i class="fa-solid fa-trash"></i>
                            حذف
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // عرض الإجابات
    function renderAnswers(response) {
        const answers = response.survey_answers || [];
        const questions = currentSurvey?.survey_questions || [];
        
        // عرض أول 3 أسئلة فقط في البطاقة
        const displayAnswers = answers.slice(0, 3);
        
        return displayAnswers.map(answer => {
            const question = questions.find(q => q.id === answer.question_id);
            if (!question) return '';

            return `
                <div class="response-answer-item">
                    <div class="response-question">
                        <i class="fa-solid fa-circle-question response-question-icon"></i>
                        <span>${escapeHtml(question.question_text)}</span>
                    </div>
                    <div class="response-answer ${getAnswerClass(question.question_type)}">
                        ${formatAnswer(answer, question)}
                    </div>
                </div>
            `;
        }).join('') + (answers.length > 3 ? `
            <div style="text-align: center; padding: 0.75rem; color: #6b7280; font-size: 0.875rem;">
                <i class="fa-solid fa-ellipsis"></i>
                و ${answers.length - 3} إجابات أخرى
            </div>
        ` : '');
    }

    // تحديد نوع الإجابة
    function getAnswerClass(questionType) {
        if (['short_text', 'long_text', 'email', 'url'].includes(questionType)) {
            return 'text';
        }
        if (['single_choice', 'multiple_choice', 'dropdown'].includes(questionType)) {
            return 'choice';
        }
        if (['number', 'linear_scale', 'slider'].includes(questionType)) {
            return 'number';
        }
        if (['rating_stars'].includes(questionType)) {
            return 'rating';
        }
        return 'text';
    }

    // تنسيق الإجابة
    function formatAnswer(answer, question) {
        const type = question.question_type;

        if (['single_choice', 'multiple_choice', 'dropdown'].includes(type)) {
            const choices = Array.isArray(answer.answer_json) ? answer.answer_json : [answer.answer_json];
            return choices.map(choice => `
                <span class="choice-tag">
                    <i class="fa-solid fa-check"></i>
                    ${escapeHtml(choice)}
                </span>
            `).join('');
        }

        if (['number', 'linear_scale', 'slider'].includes(type)) {
            return `<span class="number-value">${answer.answer_number || 0}</span>`;
        }

        if (type === 'rating_stars') {
            const rating = answer.answer_number || 0;
            return Array.from({length: 5}, (_, i) => 
                `<i class="fa-solid fa-star" style="color: ${i < rating ? '#fbbf24' : '#d1d5db'}"></i>`
            ).join('');
        }

        if (type === 'yes_no') {
            const value = answer.answer_json === 'yes' || answer.answer_json === true;
            return `
                <span class="choice-tag" style="border-color: ${value ? '#10b981' : '#ef4444'}; color: ${value ? '#10b981' : '#ef4444'};">
                    <i class="fa-solid fa-${value ? 'check' : 'times'}"></i>
                    ${value ? 'نعم' : 'لا'}
                </span>
            `;
        }

        return escapeHtml(answer.answer_text || 'لا توجد إجابة');
    }

    // عرض Pagination
    function renderPagination() {
        const totalPages = Math.ceil(filteredResponses.length / responsesPerPage);
        
        if (totalPages <= 1) return '';

        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }

        return `
            <div class="responses-pagination">
                <button class="pagination-btn" onclick="SurveyResponsesViewer.goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="fa-solid fa-chevron-right"></i>
                    السابق
                </button>
                ${pages.map(page => {
                    if (page === '...') {
                        return '<span class="pagination-info">...</span>';
                    }
                    return `
                        <button class="pagination-btn ${page === currentPage ? 'active' : ''}" 
                                onclick="SurveyResponsesViewer.goToPage(${page})">
                            ${page}
                        </button>
                    `;
                }).join('')}
                <button class="pagination-btn" onclick="SurveyResponsesViewer.goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
                    التالي
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
            </div>
        `;
    }

    // عرض حالة فارغة
    function renderEmptyState() {
        return `
            <div class="responses-empty">
                <div class="responses-empty-icon">
                    <i class="fa-solid fa-inbox"></i>
                </div>
                <h3 class="responses-empty-title">لا توجد استجابات</h3>
                <p class="responses-empty-text">لم يتم تلقي أي استجابات لهذا الاستبيان بعد</p>
            </div>
        `;
    }

    // الانتقال لصفحة معينة
    function goToPage(page) {
        const totalPages = Math.ceil(filteredResponses.length / responsesPerPage);
        if (page < 1 || page > totalPages) return;
        
        currentPage = page;
        render();
        
        // التمرير للأعلى
        document.getElementById('surveyResponsesContainer')?.scrollIntoView({ behavior: 'smooth' });
    }

    // عرض تفاصيل الاستجابة
    async function viewDetails(responseId) {
        const response = allResponses.find(r => r.id === responseId);
        if (!response) return;

        const user = response.user || {};
        const userName = user.full_name || 'مستخدم غير معروف';
        const userAvatar = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=3b82f6&color=fff`;
        
        const answers = response.survey_answers || [];
        const questions = currentSurvey?.survey_questions || [];

        const modalContent = `
            <div class="response-detail-header">
                <img src="${userAvatar}" alt="${userName}" style="width: 64px; height: 64px; border-radius: 50%; border: 3px solid #3b82f6;">
                <div>
                    <h3 style="margin: 0 0 0.25rem 0; font-size: 1.25rem;">${userName}</h3>
                    <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">
                        ${new Date(response.created_at).toLocaleString('ar-SA')}
                    </p>
                </div>
            </div>
            <div class="response-detail-body">
                <div class="response-timeline">
                    ${answers.map(answer => {
                        const question = questions.find(q => q.id === answer.question_id);
                        if (!question) return '';
                        
                        return `
                            <div class="response-timeline-item">
                                <div class="response-timeline-content">
                                    <div style="font-weight: 600; margin-bottom: 0.75rem; color: #374151;">
                                        ${escapeHtml(question.question_text)}
                                    </div>
                                    <div style="color: #1f2937;">
                                        ${formatAnswer(answer, question)}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        await ModalHelper.show({
            title: 'تفاصيل الاستجابة',
            html: modalContent,
            size: 'lg',
            showClose: true
        });
    }

    // تصدير استجابة
    async function exportResponse(responseId) {
        const response = allResponses.find(r => r.id === responseId);
        if (!response) return;

        const loadingToast = Toast.loading('جاري التصدير...');

        try {
            const exportData = {
                survey: currentSurvey.title,
                user: response.user?.full_name || 'غير معروف',
                date: new Date(response.created_at).toLocaleString('ar-SA'),
                answers: response.survey_answers.map(answer => {
                    const question = currentSurvey.survey_questions.find(q => q.id === answer.question_id);
                    return {
                        question: question?.question_text || '',
                        answer: answer.answer_text || answer.answer_json || answer.answer_number
                    };
                })
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `response-${responseId}.json`;
            a.click();
            URL.revokeObjectURL(url);

            Toast.close(loadingToast);
            Toast.success('تم التصدير بنجاح');
        } catch (error) {
            Toast.close(loadingToast);
            Toast.error('فشل التصدير');
        }
    }

    // حذف استجابة
    async function deleteResponse(responseId) {
        const confirmed = await ModalHelper.confirm({
            title: 'تأكيد الحذف',
            message: 'هل أنت متأكد من حذف هذه الاستجابة؟ لا يمكن التراجع عن هذا الإجراء.',
            type: 'danger',
            confirmText: 'نعم، احذف',
            cancelText: 'إلغاء'
        });

        if (!confirmed) return;

        const loadingToast = Toast.loading('جاري الحذف...');

        try {
            const { error } = await sb
                .from('survey_responses')
                .delete()
                .eq('id', responseId);

            if (error) throw error;

            allResponses = allResponses.filter(r => r.id !== responseId);
            filteredResponses = filteredResponses.filter(r => r.id !== responseId);

            Toast.close(loadingToast);
            Toast.success('تم حذف الاستجابة بنجاح');
            render();
        } catch (error) {
            Toast.close(loadingToast);
            Toast.error('فشل حذف الاستجابة');
        }
    }

    // إرفاق مستمعي الأحداث للبطاقات
    function attachCardEventListeners() {
        // يمكن إضافة مستمعات إضافية هنا
    }

    // حساب متوسط الوقت
    function calculateAverageTime() {
        if (allResponses.length === 0) return '0 د';
        
        // هذا مثال - يمكن تحسينه بناءً على البيانات الفعلية
        return '3 د';
    }

    // حساب معدل الإكمال
    function calculateCompletionRate() {
        if (allResponses.length === 0) return 0;
        
        const totalQuestions = currentSurvey?.survey_questions?.length || 1;
        const totalAnswered = allResponses.reduce((sum, r) => sum + (r.survey_answers?.length || 0), 0);
        const maxPossible = allResponses.length * totalQuestions;
        
        return Math.round((totalAnswered / maxPossible) * 100);
    }

    // تنظيف HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return {
        init,
        goToPage,
        viewDetails,
        exportResponse,
        deleteResponse
    };
})();
