/**
 * مدير الاستبيانات - نادي أدِيب
 * Surveys Manager - Adeeb Club
 * 
 * REFACTORED: Fixed critical bugs
 * - State management
 * - Data persistence during re-renders
 * - Question type selector
 * - Event delegation
 * - UI/UX improvements
 */

(function() {
    'use strict';

    const sb = window.sbClient;
    let currentUser = null;
    let currentSurveys = [];
    let currentTemplates = [];
    let currentSurvey = null;
    let currentSurveyId = null;
    let editingQuestionIndex = null;

    /**
     * تهيئة مدير الاستبيانات
     */
    async function init(user) {
        currentUser = user;
        await loadSurveys();
        bindEvents();
    }

    /**
     * تحميل جميع الاستبيانات
     */
    async function loadSurveys() {
        try {
            showLoading(true);

            const { data, error } = await sb
                .from('surveys')
                .select(`
                    *,
                    created_by_profile:profiles!surveys_created_by_fkey(full_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            currentSurveys = data || [];
            updateStats();
            renderSurveysList();

        } catch (error) {
            console.error('Error loading surveys:', error);
            showError('حدث خطأ أثناء تحميل الاستبيانات');
        } finally {
            showLoading(false);
        }
    }

    /**
     * تحديث الإحصائيات
     */
    function updateStats() {
        const total = currentSurveys.length;
        const active = currentSurveys.filter(s => s.status === 'active').length;
        const draft = currentSurveys.filter(s => s.status === 'draft').length;
        const totalResponses = currentSurveys.reduce((sum, s) => sum + (s.total_responses || 0), 0);

        document.getElementById('totalSurveysCount').textContent = total;
        document.getElementById('activeSurveysCount').textContent = active;
        document.getElementById('draftSurveysCount').textContent = draft;
        document.getElementById('totalResponsesCount').textContent = totalResponses;
    }

    /**
     * عرض قائمة الاستبيانات (Cards View)
     */
    function renderSurveysList() {
        const container = document.getElementById('surveysListContainer');
        if (!container) return;

        const searchTerm = document.getElementById('surveysSearchInput')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('surveysStatusFilter')?.value || '';
        const typeFilter = document.getElementById('surveysTypeFilter')?.value || '';
        const accessFilter = document.getElementById('surveysAccessFilter')?.value || '';

        let filtered = currentSurveys.filter(survey => {
            const matchesSearch = !searchTerm || 
                survey.title.toLowerCase().includes(searchTerm) ||
                (survey.description && survey.description.toLowerCase().includes(searchTerm));
            const matchesStatus = !statusFilter || survey.status === statusFilter;
            const matchesType = !typeFilter || survey.survey_type === typeFilter;
            const matchesAccess = !accessFilter || survey.access_type === accessFilter;

            return matchesSearch && matchesStatus && matchesType && matchesAccess;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-clipboard-question"></i>
                    <h3>لا توجد استبيانات</h3>
                    <p>ابدأ بإنشاء استبيان جديد</p>
                    <button class="btn-primary" onclick="window.surveysManager.createNewSurvey()">
                        <i class="fa-solid fa-plus"></i>
                        إنشاء استبيان
                    </button>
                </div>
            `;
            return;
        }

        let html = '<div class="applications-cards-grid">';

        filtered.forEach(survey => {
            const statusBadge = getStatusBadge(survey.status);
            const typeBadge = getSurveyTypeLabel(survey.survey_type);
            const accessBadge = survey.access_type === 'public' ? 
                '<span class="badge badge-success">عام</span>' : 
                '<span class="badge badge-info">للأعضاء فقط</span>';
            
            const createdDate = formatDate(survey.created_at);
            const publishedDate = survey.published_at ? formatDate(survey.published_at) : null;
            
            const surveyIcon = {
                'general': 'fa-clipboard-list',
                'membership': 'fa-user-plus',
                'event': 'fa-calendar-check',
                'feedback': 'fa-comment-dots',
                'research': 'fa-microscope',
                'poll': 'fa-poll'
            }[survey.survey_type] || 'fa-clipboard-question';

            html += `
                <div class="application-card">
                    <div class="application-card-header">
                        <div class="applicant-info">
                            <div class="applicant-avatar">
                                <i class="fa-solid ${surveyIcon}"></i>
                            </div>
                            <div class="applicant-details">
                                <h3 class="applicant-name">${escapeHtml(survey.title)}</h3>
                                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                                    ${statusBadge}
                                    ${accessBadge}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="application-card-body">
                        ${survey.description ? `
                            <div class="info-item full-width" style="margin-bottom: 1rem;">
                                <i class="fa-solid fa-align-right"></i>
                                <div class="info-content">
                                    <span class="info-label">الوصف</span>
                                    <span class="info-value">${escapeHtml(survey.description.substring(0, 100))}${survey.description.length > 100 ? '...' : ''}</span>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="application-info-grid">
                            <div class="info-item">
                                <i class="fa-solid fa-tag"></i>
                                <div class="info-content">
                                    <span class="info-label">نوع الاستبيان</span>
                                    <span class="info-value">${typeBadge}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-users"></i>
                                <div class="info-content">
                                    <span class="info-label">عدد المشاركات</span>
                                    <span class="info-value"><strong>${survey.total_responses || 0}</strong>${survey.max_responses ? ` / ${survey.max_responses}` : ''}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-calendar-plus"></i>
                                <div class="info-content">
                                    <span class="info-label">تاريخ الإنشاء</span>
                                    <span class="info-value">${createdDate}</span>
                                </div>
                            </div>
                            
                            ${publishedDate ? `
                                <div class="info-item">
                                    <i class="fa-solid fa-paper-plane"></i>
                                    <div class="info-content">
                                        <span class="info-label">تاريخ النشر</span>
                                        <span class="info-value">${publishedDate}</span>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${survey.start_date ? `
                                <div class="info-item">
                                    <i class="fa-solid fa-clock"></i>
                                    <div class="info-content">
                                        <span class="info-label">تاريخ البدء</span>
                                        <span class="info-value">${formatDate(survey.start_date)}</span>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${survey.end_date ? `
                                <div class="info-item">
                                    <i class="fa-solid fa-calendar-xmark"></i>
                                    <div class="info-content">
                                        <span class="info-label">تاريخ الانتهاء</span>
                                        <span class="info-value">${formatDate(survey.end_date)}</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="application-card-footer">
                        <div class="card-actions-grid">
                            ${survey.status === 'active' || survey.status === 'paused' ? `
                                <button class="btn-action btn-action-primary" onclick="window.surveysManager.viewResults(${survey.id})">
                                    <i class="fa-solid fa-chart-bar"></i>
                                    عرض النتائج
                                </button>
                            ` : ''}
                            
                            ${survey.status === 'active' ? `
                                <button class="btn-action btn-action-success" onclick="window.surveysManager.copyShareLink(${survey.id}, '${escapeHtml(survey.title)}')" title="نسخ رابط المشاركة">
                                    <i class="fa-solid fa-share-nodes"></i>
                                    نسخ الرابط
                                </button>
                            ` : ''}
                            
                            <button class="btn-action btn-action-info" onclick="window.surveysManager.editSurvey(${survey.id})">
                                <i class="fa-solid fa-edit"></i>
                                تعديل
                            </button>
                            
                            <button class="btn-action btn-action-secondary" onclick="window.surveysManager.duplicateSurvey(${survey.id})" title="نسخ الاستبيان">
                                <i class="fa-solid fa-clone"></i>
                                نسخ الاستبيان
                            </button>
                            
                            ${survey.status === 'draft' ? `
                                <button class="btn-action btn-action-success" onclick="window.surveysManager.publishSurvey(${survey.id})">
                                    <i class="fa-solid fa-paper-plane"></i>
                                    نشر
                                </button>
                            ` : ''}
                            
                            ${survey.status === 'active' ? `
                                <button class="btn-action btn-action-warning" onclick="window.surveysManager.toggleSurveyStatus(${survey.id}, 'paused')">
                                    <i class="fa-solid fa-pause"></i>
                                    إيقاف مؤقت
                                </button>
                            ` : ''}
                            
                            ${survey.status === 'paused' ? `
                                <button class="btn-action btn-action-success" onclick="window.surveysManager.toggleSurveyStatus(${survey.id}, 'active')">
                                    <i class="fa-solid fa-play"></i>
                                    إعادة التنشيط
                                </button>
                            ` : ''}
                            
                            <button class="btn-action btn-action-danger" onclick="window.surveysManager.deleteSurvey(${survey.id})">
                                <i class="fa-solid fa-trash"></i>
                                حذف
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * إنشاء استبيان جديد
     */
    async function createNewSurvey() {
        currentSurveyId = null;
        currentSurvey = {
            title: '',
            description: '',
            survey_type: 'general',
            access_type: 'public',
            status: 'draft',
            show_progress_bar: true,
            show_question_numbers: true,
            sections: [],
            questions: []
        };

        showSurveyBuilder();
    }

    /**
     * تعديل استبيان
     */
    async function editSurvey(surveyId) {
        try {
            showLoading(true);

            const { data: survey, error: surveyError } = await sb
                .from('surveys')
                .select('*')
                .eq('id', surveyId)
                .single();

            if (surveyError) throw surveyError;

            const { data: sections, error: sectionsError } = await sb
                .from('survey_sections')
                .select('*')
                .eq('survey_id', surveyId)
                .order('display_order');

            if (sectionsError) throw sectionsError;

            const { data: questions, error: questionsError } = await sb
                .from('survey_questions')
                .select('*')
                .eq('survey_id', surveyId)
                .order('display_order');

            if (questionsError) throw questionsError;

            currentSurveyId = surveyId;
            currentSurvey = {
                ...survey,
                sections: sections || [],
                questions: questions || []
            };

            showSurveyBuilder();

        } catch (error) {
            console.error('Error loading survey:', error);
            showError('حدث خطأ أثناء تحميل الاستبيان');
        } finally {
            showLoading(false);
        }
    }

    /**
     * عرض بناء الاستبيان
     */
    function showSurveyBuilder() {
        hideAllSections();
        document.getElementById('survey-builder-section').style.display = 'block';
        document.getElementById('surveyBuilderTitle').textContent = 
            currentSurveyId ? 'تعديل الاستبيان' : 'إنشاء استبيان جديد';

        renderSurveyBuilder();
    }

    /**
     * حفظ بيانات النموذج في الـ State قبل إعادة الـ render
     */
    function syncFormDataToState() {
        const titleEl = document.getElementById('surveyTitle');
        const descEl = document.getElementById('surveyDescription');
        const typeEl = document.getElementById('surveyType');
        const accessEl = document.getElementById('surveyAccessType');
        const durationEl = document.getElementById('surveyDuration');
        const startDateEl = document.getElementById('surveyStartDate');
        const endDateEl = document.getElementById('surveyEndDate');
        const welcomeEl = document.getElementById('surveyWelcomeMessage');
        const completionEl = document.getElementById('surveyCompletionMessage');
        const progressEl = document.getElementById('surveyShowProgress');
        const numbersEl = document.getElementById('surveyShowNumbers');
        const anonymousEl = document.getElementById('surveyIsAnonymous');

        if (titleEl) currentSurvey.title = titleEl.value;
        if (descEl) currentSurvey.description = descEl.value;
        if (typeEl) currentSurvey.survey_type = typeEl.value;
        if (accessEl) currentSurvey.access_type = accessEl.value;
        if (durationEl) currentSurvey.estimated_duration_minutes = parseInt(durationEl.value) || null;
        if (startDateEl) currentSurvey.start_date = startDateEl.value || null;
        if (endDateEl) currentSurvey.end_date = endDateEl.value || null;
        if (welcomeEl) currentSurvey.welcome_message = welcomeEl.value;
        if (completionEl) currentSurvey.completion_message = completionEl.value;
        if (progressEl) currentSurvey.show_progress_bar = progressEl.checked;
        if (numbersEl) currentSurvey.show_question_numbers = numbersEl.checked;
        if (anonymousEl) currentSurvey.is_anonymous = anonymousEl.checked;
    }

    /**
     * عرض واجهة بناء الاستبيان
     */
    function renderSurveyBuilder() {
        const container = document.getElementById('surveyBuilderContent');
        if (!container) return;

        const html = `
            <div class="survey-builder">
                <!-- معلومات الاستبيان الأساسية -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-info-circle"></i> المعلومات الأساسية</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>عنوان الاستبيان <span class="required">*</span></label>
                                <input type="text" id="surveyTitle" class="form-control" 
                                    value="${escapeHtml(currentSurvey.title || '')}" 
                                    placeholder="أدخل عنوان الاستبيان">
                            </div>
                            <div class="form-group">
                                <label>نوع الاستبيان</label>
                                <select id="surveyType" class="form-control">
                                    <option value="general" ${currentSurvey.survey_type === 'general' ? 'selected' : ''}>عام</option>
                                    <option value="membership" ${currentSurvey.survey_type === 'membership' ? 'selected' : ''}>عضوية</option>
                                    <option value="event" ${currentSurvey.survey_type === 'event' ? 'selected' : ''}>فعالية</option>
                                    <option value="feedback" ${currentSurvey.survey_type === 'feedback' ? 'selected' : ''}>تقييم</option>
                                    <option value="research" ${currentSurvey.survey_type === 'research' ? 'selected' : ''}>بحثي</option>
                                    <option value="poll" ${currentSurvey.survey_type === 'poll' ? 'selected' : ''}>استطلاع رأي</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>الوصف</label>
                            <textarea id="surveyDescription" class="form-control" rows="3" 
                                placeholder="وصف مختصر عن الاستبيان">${escapeHtml(currentSurvey.description || '')}</textarea>
                        </div>

                        <div class="form-grid">
                            <div class="form-group">
                                <label>نوع الوصول</label>
                                <select id="surveyAccessType" class="form-control">
                                    <option value="public" ${currentSurvey.access_type === 'public' ? 'selected' : ''}>عام (للجميع)</option>
                                    <option value="members_only" ${currentSurvey.access_type === 'members_only' ? 'selected' : ''}>للأعضاء فقط</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>المدة المتوقعة (بالدقائق)</label>
                                <input type="number" id="surveyDuration" class="form-control" 
                                    value="${currentSurvey.estimated_duration_minutes || ''}" 
                                    placeholder="10">
                            </div>
                        </div>

                        <div class="form-grid">
                            <div class="form-group">
                                <label>تاريخ البدء</label>
                                <input type="datetime-local" id="surveyStartDate" class="form-control" 
                                    value="${currentSurvey.start_date ? new Date(currentSurvey.start_date).toISOString().slice(0, 16) : ''}">
                            </div>
                            <div class="form-group">
                                <label>تاريخ الانتهاء</label>
                                <input type="datetime-local" id="surveyEndDate" class="form-control" 
                                    value="${currentSurvey.end_date ? new Date(currentSurvey.end_date).toISOString().slice(0, 16) : ''}">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>رسالة الترحيب</label>
                            <textarea id="surveyWelcomeMessage" class="form-control" rows="2" 
                                placeholder="رسالة ترحيبية للمشاركين">${escapeHtml(currentSurvey.welcome_message || '')}</textarea>
                        </div>

                        <div class="form-group">
                            <label>رسالة الإكمال</label>
                            <textarea id="surveyCompletionMessage" class="form-control" rows="2" 
                                placeholder="رسالة شكر بعد إكمال الاستبيان">${escapeHtml(currentSurvey.completion_message || 'شكراً لمشاركتك في الاستبيان!')}</textarea>
                        </div>

                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="surveyShowProgress" ${currentSurvey.show_progress_bar ? 'checked' : ''}>
                                <span>عرض شريط التقدم</span>
                            </label>
                        </div>

                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="surveyShowNumbers" ${currentSurvey.show_question_numbers ? 'checked' : ''}>
                                <span>عرض أرقام الأسئلة</span>
                            </label>
                        </div>

                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="surveyIsAnonymous" ${currentSurvey.is_anonymous ? 'checked' : ''}>
                                <span>استبيان مجهول</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- الأسئلة -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-question-circle"></i> الأسئلة</h3>
                        <button class="btn-primary" id="addQuestionBtn">
                            <i class="fa-solid fa-plus"></i>
                            إضافة سؤال
                        </button>
                    </div>
                    <div class="card-body">
                        <div id="questionsContainer">
                            ${renderQuestions()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        bindBuilderEvents();
    }

    /**
     * ربط أحداث صفحة البناء
     */
    function bindBuilderEvents() {
        const addBtn = document.getElementById('addQuestionBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => openQuestionModal());
        }

        const titleEl = document.getElementById('surveyTitle');
        const descEl = document.getElementById('surveyDescription');
        const typeEl = document.getElementById('surveyType');
        const accessEl = document.getElementById('surveyAccessType');
        const durationEl = document.getElementById('surveyDuration');
        const startDateEl = document.getElementById('surveyStartDate');
        const endDateEl = document.getElementById('surveyEndDate');
        const welcomeEl = document.getElementById('surveyWelcomeMessage');
        const completionEl = document.getElementById('surveyCompletionMessage');
        const progressEl = document.getElementById('surveyShowProgress');
        const numbersEl = document.getElementById('surveyShowNumbers');
        const anonymousEl = document.getElementById('surveyIsAnonymous');

        [titleEl, descEl, typeEl, accessEl, durationEl, startDateEl, endDateEl, welcomeEl, completionEl].forEach(el => {
            if (el) el.addEventListener('change', syncFormDataToState);
            if (el) el.addEventListener('input', syncFormDataToState);
        });

        [progressEl, numbersEl, anonymousEl].forEach(el => {
            if (el) el.addEventListener('change', syncFormDataToState);
        });
    }

    /**
     * عرض الأسئلة
     */
    function renderQuestions() {
        if (!currentSurvey.questions || currentSurvey.questions.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fa-solid fa-question"></i>
                    <p>لم يتم إضافة أسئلة بعد</p>
                    <button class="btn-primary" onclick="window.surveysManager.addQuestion()">
                        <i class="fa-solid fa-plus"></i>
                        إضافة سؤال
                    </button>
                </div>
            `;
        }

        return currentSurvey.questions.map((q, index) => `
            <div class="question-item" data-question-index="${index}">
                <div class="question-header">
                    <span class="question-number">${index + 1}</span>
                    <span class="question-type-badge">${getQuestionTypeLabel(q.question_type)}</span>
                    <div class="question-actions">
                        <button class="btn-icon question-move-up" data-index="${index}" ${index === 0 ? 'disabled' : ''}>
                            <i class="fa-solid fa-arrow-up"></i>
                        </button>
                        <button class="btn-icon question-move-down" data-index="${index}" ${index === currentSurvey.questions.length - 1 ? 'disabled' : ''}>
                            <i class="fa-solid fa-arrow-down"></i>
                        </button>
                        <button class="btn-icon question-edit" data-index="${index}">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-danger question-delete" data-index="${index}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="question-content">
                    <p><strong>${escapeHtml(q.question_text)}</strong> ${q.is_required ? '<span class="required">*</span>' : ''}</p>
                    ${q.help_text ? `<small class="text-muted">${escapeHtml(q.help_text)}</small>` : ''}
                    ${renderQuestionPreview(q)}
                </div>
            </div>
        `).join('');
    }

    /**
     * معاينة السؤال
     */
    function renderQuestionPreview(question) {
        const options = question.options || [];
        
        switch (question.question_type) {
            case 'short_text':
                return '<input type="text" class="form-control" placeholder="إجابة قصيرة" disabled>';
            case 'long_text':
                return '<textarea class="form-control" rows="3" placeholder="إجابة طويلة" disabled></textarea>';
            case 'single_choice':
            case 'dropdown':
                return `
                    <div class="options-preview">
                        ${options.map(opt => `
                            <label class="radio-label">
                                <input type="radio" name="preview_${question.id}" disabled>
                                <span>${escapeHtml(opt.label || opt.value)}</span>
                            </label>
                        `).join('')}
                    </div>
                `;
            case 'multiple_choice':
                return `
                    <div class="options-preview">
                        ${options.map(opt => `
                            <label class="checkbox-label">
                                <input type="checkbox" disabled>
                                <span>${escapeHtml(opt.label || opt.value)}</span>
                            </label>
                        `).join('')}
                    </div>
                `;
            case 'rating_scale':
            case 'linear_scale':
                const settings = question.settings || {};
                const min = settings.min || 1;
                const max = settings.max || 5;
                return `
                    <div class="rating-preview">
                        ${Array.from({length: max - min + 1}, (_, i) => `
                            <button class="rating-btn" disabled>${min + i}</button>
                        `).join('')}
                    </div>
                `;
            case 'yes_no':
                return `
                    <div class="options-preview">
                        <label class="radio-label">
                            <input type="radio" disabled>
                            <span>نعم</span>
                        </label>
                        <label class="radio-label">
                            <input type="radio" disabled>
                            <span>لا</span>
                        </label>
                    </div>
                `;
            default:
                return '';
        }
    }

    /**
     * فتح نافذة إضافة/تعديل سؤال
     */
    function openQuestionModal(questionIndex = null) {
        syncFormDataToState();
        editingQuestionIndex = questionIndex;

        const question = questionIndex !== null ? currentSurvey.questions[questionIndex] : {
            question_text: '',
            question_type: 'short_text',
            is_required: false,
            help_text: '',
            placeholder_text: '',
            options: [],
            settings: {}
        };

        const modalHtml = `
            <div class="custom-modal" id="questionModal" style="display: flex;">
                <div class="custom-modal-overlay" onclick="window.surveysManager.closeQuestionModal()"></div>
                <div class="custom-modal-container" style="max-width: 700px;">
                    <div class="custom-modal-header">
                        <h2 class="custom-modal-title">
                            <i class="fa-solid fa-question-circle"></i>
                            ${questionIndex !== null ? 'تعديل السؤال' : 'إضافة سؤال جديد'}
                        </h2>
                        <button class="custom-modal-close" onclick="window.surveysManager.closeQuestionModal()">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <div class="custom-modal-body">
                        <div class="form-group">
                            <label>نص السؤال <span class="required">*</span></label>
                            <textarea id="questionText" class="form-control" rows="2" 
                                placeholder="أدخل نص السؤال">${escapeHtml(question.question_text)}</textarea>
                        </div>

                        <div class="form-group">
                            <label>نوع السؤال <span class="required">*</span></label>
                            <select id="questionType" class="form-control">
                                <option value="short_text" ${question.question_type === 'short_text' ? 'selected' : ''}>نص قصير</option>
                                <option value="long_text" ${question.question_type === 'long_text' ? 'selected' : ''}>نص طويل</option>
                                <option value="single_choice" ${question.question_type === 'single_choice' ? 'selected' : ''}>اختيار واحد</option>
                                <option value="multiple_choice" ${question.question_type === 'multiple_choice' ? 'selected' : ''}>اختيارات متعددة</option>
                                <option value="dropdown" ${question.question_type === 'dropdown' ? 'selected' : ''}>قائمة منسدلة</option>
                                <option value="star_rating" ${question.question_type === 'star_rating' ? 'selected' : ''}>⭐ مقياس نجوم</option>
                                <option value="rating_scale" ${question.question_type === 'rating_scale' ? 'selected' : ''}>مقياس تقييم (أرقام)</option>
                                <option value="linear_scale" ${question.question_type === 'linear_scale' ? 'selected' : ''}>مقياس خطي</option>
                                <option value="yes_no" ${question.question_type === 'yes_no' ? 'selected' : ''}>نعم/لا</option>
                                <option value="date" ${question.question_type === 'date' ? 'selected' : ''}>تاريخ</option>
                                <option value="email" ${question.question_type === 'email' ? 'selected' : ''}>بريد إلكتروني</option>
                                <option value="phone" ${question.question_type === 'phone' ? 'selected' : ''}>رقم هاتف</option>
                                <option value="number" ${question.question_type === 'number' ? 'selected' : ''}>رقم</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>نص مساعد (اختياري)</label>
                            <input type="text" id="questionHelpText" class="form-control" 
                                value="${escapeHtml(question.help_text || '')}" 
                                placeholder="نص توضيحي يظهر أسفل السؤال">
                        </div>

                        <div class="form-group">
                            <label>نص مؤقت (Placeholder)</label>
                            <input type="text" id="questionPlaceholder" class="form-control" 
                                value="${escapeHtml(question.placeholder_text || '')}" 
                                placeholder="نص يظهر داخل حقل الإجابة">
                        </div>

                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="questionRequired" ${question.is_required ? 'checked' : ''}>
                                <span>سؤال إجباري</span>
                            </label>
                        </div>

                        <div id="questionOptionsContainer" style="display: none;">
                            <div class="form-group">
                                <label>الخيارات</label>
                                <div id="optionsList"></div>
                                <button type="button" class="btn-secondary" id="addOptionBtn" style="margin-top: 0.5rem;">
                                    <i class="fa-solid fa-plus"></i>
                                    إضافة خيار
                                </button>
                            </div>
                        </div>

                        <div id="questionScaleContainer" style="display: none;">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>الحد الأدنى</label>
                                    <input type="number" id="scaleMin" class="form-control" 
                                        value="${question.settings?.min || 1}" min="0">
                                </div>
                                <div class="form-group">
                                    <label>الحد الأقصى</label>
                                    <input type="number" id="scaleMax" class="form-control" 
                                        value="${question.settings?.max || 5}" min="1">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="custom-modal-footer">
                        <button type="button" class="btn-outline" onclick="window.surveysManager.closeQuestionModal()">إلغاء</button>
                        <button type="button" class="btn-primary" id="saveQuestionBtn">
                            <i class="fa-solid fa-save"></i>
                            ${questionIndex !== null ? 'حفظ التعديلات' : 'إضافة السؤال'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('questionModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const typeSelect = document.getElementById('questionType');
        typeSelect.addEventListener('change', updateQuestionTypeFields);
        updateQuestionTypeFields();

        const saveBtn = document.getElementById('saveQuestionBtn');
        saveBtn.addEventListener('click', saveQuestion);

        const addOptionBtn = document.getElementById('addOptionBtn');
        if (addOptionBtn) {
            addOptionBtn.addEventListener('click', () => addQuestionOption());
        }

        if (question.options && question.options.length > 0) {
            question.options.forEach((opt, idx) => {
                addQuestionOption(opt.value || opt.label || opt);
            });
        }
    }

    /**
     * تحديث حقول نوع السؤال
     */
    function updateQuestionTypeFields() {
        const type = document.getElementById('questionType').value;
        const optionsContainer = document.getElementById('questionOptionsContainer');
        const scaleContainer = document.getElementById('questionScaleContainer');

        const needsOptions = ['single_choice', 'multiple_choice', 'dropdown'].includes(type);
        const needsScale = ['rating_scale', 'linear_scale', 'star_rating'].includes(type);

        if (optionsContainer) optionsContainer.style.display = needsOptions ? 'block' : 'none';
        if (scaleContainer) scaleContainer.style.display = needsScale ? 'block' : 'none';
    }

    /**
     * إضافة خيار للسؤال
     */
    function addQuestionOption(value = '') {
        const optionsList = document.getElementById('optionsList');
        if (!optionsList) return;

        const optionIndex = optionsList.children.length;
        const optionHtml = `
            <div class="option-item" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                <input type="text" class="form-control" value="${escapeHtml(value)}" 
                    placeholder="نص الخيار" data-option-index="${optionIndex}">
                <button type="button" class="btn-icon btn-danger" onclick="this.parentElement.remove()">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;

        optionsList.insertAdjacentHTML('beforeend', optionHtml);
    }

    /**
     * حفظ السؤال
     */
    function saveQuestion() {
        const questionText = document.getElementById('questionText').value.trim();
        const questionType = document.getElementById('questionType').value;
        const helpText = document.getElementById('questionHelpText').value.trim();
        const placeholder = document.getElementById('questionPlaceholder').value.trim();
        const isRequired = document.getElementById('questionRequired').checked;

        if (!questionText) {
            showError('يرجى إدخال نص السؤال');
            return;
        }

        const question = {
            question_text: questionText,
            question_type: questionType,
            is_required: isRequired,
            help_text: helpText,
            placeholder_text: placeholder,
            options: [],
            settings: {}
        };

        if (['single_choice', 'multiple_choice', 'dropdown'].includes(questionType)) {
            const optionInputs = document.querySelectorAll('#optionsList input');
            question.options = Array.from(optionInputs)
                .map(input => input.value.trim())
                .filter(val => val)
                .map(val => ({ value: val, label: val }));

            if (question.options.length === 0) {
                showError('يرجى إضافة خيار واحد على الأقل');
                return;
            }
        }

        if (['rating_scale', 'linear_scale', 'star_rating'].includes(questionType)) {
            const min = parseInt(document.getElementById('scaleMin').value) || 1;
            const max = parseInt(document.getElementById('scaleMax').value) || 5;
            
            if (questionType === 'star_rating') {
                question.settings = { max_stars: max };
            } else {
                question.settings = { min, max };
            }
        }

        if (editingQuestionIndex !== null) {
            currentSurvey.questions[editingQuestionIndex] = question;
        } else {
            currentSurvey.questions.push(question);
        }

        closeQuestionModal();
        renderSurveyBuilder();
    }

    /**
     * إغلاق نافذة السؤال
     */
    function closeQuestionModal() {
        const modal = document.getElementById('questionModal');
        if (modal) modal.remove();
        editingQuestionIndex = null;
    }

    /**
     * حفظ الاستبيان
     */
    async function saveSurvey(publish = false) {
        try {
            syncFormDataToState();

            if (!currentSurvey.title || !currentSurvey.title.trim()) {
                showError('يرجى إدخال عنوان الاستبيان');
                return;
            }

            if (currentSurvey.questions.length === 0) {
                showError('يرجى إضافة سؤال واحد على الأقل');
                return;
            }

            showLoading(true);

            const surveyData = {
                title: currentSurvey.title,
                description: currentSurvey.description,
                survey_type: currentSurvey.survey_type,
                access_type: currentSurvey.access_type,
                estimated_duration_minutes: currentSurvey.estimated_duration_minutes,
                start_date: currentSurvey.start_date,
                end_date: currentSurvey.end_date,
                welcome_message: currentSurvey.welcome_message,
                completion_message: currentSurvey.completion_message,
                show_progress_bar: currentSurvey.show_progress_bar,
                show_question_numbers: currentSurvey.show_question_numbers,
                is_anonymous: currentSurvey.is_anonymous,
                status: publish ? 'active' : 'draft',
                created_by: currentUser.id
            };

            if (publish) {
                surveyData.published_at = new Date().toISOString();
            }

            let surveyId = currentSurveyId;

            if (currentSurveyId) {
                const { error } = await sb
                    .from('surveys')
                    .update(surveyData)
                    .eq('id', currentSurveyId);

                if (error) throw error;
            } else {
                const { data, error } = await sb
                    .from('surveys')
                    .insert([surveyData])
                    .select()
                    .single();

                if (error) throw error;
                surveyId = data.id;
                currentSurveyId = surveyId;
            }

            await saveQuestions(surveyId);

            showSuccess(publish ? 'تم نشر الاستبيان بنجاح' : 'تم حفظ الاستبيان كمسودة');
            await loadSurveys();
            backToSurveysList();

        } catch (error) {
            console.error('Error saving survey:', error);
            showError('حدث خطأ أثناء حفظ الاستبيان');
        } finally {
            showLoading(false);
        }
    }

    /**
     * حفظ الأسئلة
     */
    async function saveQuestions(surveyId) {
        await sb.from('survey_questions').delete().eq('survey_id', surveyId);

        if (currentSurvey.questions && currentSurvey.questions.length > 0) {
            const questionsData = currentSurvey.questions.map((q, index) => ({
                survey_id: surveyId,
                question_text: q.question_text,
                question_type: q.question_type,
                is_required: q.is_required || false,
                display_order: index,
                options: q.options && q.options.length > 0 ? q.options : null,
                settings: q.settings && Object.keys(q.settings).length > 0 ? q.settings : null,
                help_text: q.help_text || null,
                placeholder_text: q.placeholder_text || null
            }));

            const { error } = await sb
                .from('survey_questions')
                .insert(questionsData);

            if (error) throw error;
        }
    }

    /**
     * العودة لقائمة الاستبيانات
     */
    function backToSurveysList() {
        hideAllSections();
        document.getElementById('surveys-section').style.display = 'block';
    }

    /**
     * عرض نتائج الاستبيان
     */
    async function viewResults(surveyId) {
        try {
            showLoading(true);

            const { data: survey, error } = await sb
                .from('surveys')
                .select('*')
                .eq('id', surveyId)
                .single();

            if (error) throw error;

            currentSurveyId = surveyId;
            hideAllSections();
            document.getElementById('survey-results-section').style.display = 'block';
            document.getElementById('surveyResultsTitle').textContent = `نتائج: ${survey.title}`;

            await loadSurveyResults(surveyId);

        } catch (error) {
            console.error('Error loading results:', error);
            showError('حدث خطأ أثناء تحميل النتائج');
        } finally {
            showLoading(false);
        }
    }

    /**
     * تحميل نتائج الاستبيان
     */
    async function loadSurveyResults(surveyId) {
        try {
            // جلب الاستجابات
            const { data: responses, error: responsesError } = await sb
                .from('survey_responses')
                .select('*')
                .eq('survey_id', surveyId)
                .eq('status', 'completed');

            if (responsesError) throw responsesError;

            // جلب الأسئلة
            const { data: questions, error: questionsError } = await sb
                .from('survey_questions')
                .select('*')
                .eq('survey_id', surveyId)
                .order('display_order');

            if (questionsError) throw questionsError;

            // جلب الإجابات
            const responseIds = responses.map(r => r.id);
            let answers = [];
            
            if (responseIds.length > 0) {
                const { data: answersData, error: answersError } = await sb
                    .from('survey_answers')
                    .select('*')
                    .in('response_id', responseIds);

                if (answersError) throw answersError;
                answers = answersData || [];
            }

            renderResultsStats(responses);
            renderResultsOverview(questions, responses, answers);
            renderResponsesList(responses, questions, answers);
            renderAnalytics(questions, responses, answers);
            bindResultsTabs();

        } catch (error) {
            console.error('Error loading survey results:', error);
            showError('حدث خطأ أثناء تحميل النتائج');
        }
    }

    /**
     * عرض إحصائيات النتائج
     */
    function renderResultsStats(responses) {
        const container = document.getElementById('surveyResultsStats');
        if (!container) return;

        const completed = responses.length;
        
        // حساب متوسط الوقت من الفرق بين started_at و completed_at
        let totalSeconds = 0;
        let validTimeCount = 0;
        responses.forEach(r => {
            if (r.started_at && r.completed_at) {
                const start = new Date(r.started_at);
                const end = new Date(r.completed_at);
                const diff = (end - start) / 1000; // بالثواني
                if (diff > 0 && diff < 3600) { // أقل من ساعة
                    totalSeconds += diff;
                    validTimeCount++;
                }
            }
        });
        const avgTime = validTimeCount > 0 ? totalSeconds / validTimeCount : 0;
        
        const today = new Date();
        const todayResponses = responses.filter(r => {
            const responseDate = new Date(r.created_at);
            return responseDate.toDateString() === today.toDateString();
        }).length;

        container.innerHTML = `
            <div class="stat-card">
                <i class="fa-solid fa-check-circle stat-icon" style="color: var(--success-color);"></i>
                <div class="stat-info">
                    <h3>إجمالي الاستجابات</h3>
                    <p class="stat-value">${completed}</p>
                </div>
            </div>
            <div class="stat-card">
                <i class="fa-solid fa-calendar-day stat-icon" style="color: var(--accent-blue);"></i>
                <div class="stat-info">
                    <h3>اليوم</h3>
                    <p class="stat-value">${todayResponses}</p>
                </div>
            </div>
            <div class="stat-card">
                <i class="fa-solid fa-clock stat-icon" style="color: var(--warning-color);"></i>
                <div class="stat-info">
                    <h3>متوسط الوقت</h3>
                    <p class="stat-value">${avgTime > 0 ? Math.round(avgTime / 60) : 0} دقيقة</p>
                </div>
            </div>
        `;
    }

    /**
     * عرض النظرة العامة
     */
    function renderResultsOverview(questions, responses, answers) {
        const container = document.getElementById('results-overview');
        if (!container) return;

        if (responses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    <h3>لا توجد استجابات بعد</h3>
                    <p>لم يقم أحد بالإجابة على هذا الاستبيان حتى الآن</p>
                </div>
            `;
            return;
        }

        let html = '<div class="results-questions-grid">';

        questions.forEach(question => {
            const questionAnswers = answers.filter(a => a.question_id === question.id);
            
            html += `
                <div class="result-question-card">
                    <h3 class="result-question-title">${escapeHtml(question.question_text)}</h3>
                    <div class="result-question-stats">
                        <span><i class="fa-solid fa-reply"></i> ${questionAnswers.length} إجابة</span>
                    </div>
                    <div class="result-question-data">
                        ${renderQuestionResults(question, questionAnswers)}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * عرض نتائج سؤال محدد
     */
    function renderQuestionResults(question, answers) {
        if (answers.length === 0) {
            return '<p class="text-muted">لا توجد إجابات</p>';
        }

        switch (question.question_type) {
            case 'single_choice':
            case 'multiple_choice':
            case 'dropdown':
            case 'yes_no':
                return renderChoiceResults(question, answers);
            
            case 'rating_scale':
            case 'linear_scale':
            case 'star_rating':
                return renderScaleResults(answers);
            
            default:
                return renderTextResults(answers);
        }
    }

    /**
     * عرض نتائج الاختيارات
     */
    function renderChoiceResults(question, answers) {
        const counts = {};
        const total = answers.length;

        answers.forEach(answer => {
            const value = answer.answer_value || answer.answer_text;
            if (value) {
                counts[value] = (counts[value] || 0) + 1;
            }
        });

        let html = '<div class="choice-results">';
        Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([choice, count]) => {
            const percentage = Math.round((count / total) * 100);
            html += `
                <div class="choice-result-item">
                    <div class="choice-result-label">
                        <span>${escapeHtml(choice)}</span>
                        <span class="choice-result-count">${count} (${percentage}%)</span>
                    </div>
                    <div class="choice-result-bar">
                        <div class="choice-result-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    /**
     * عرض نتائج المقاييس
     */
    function renderScaleResults(answers) {
        const values = answers
            .map(a => parseFloat(a.answer_value || a.answer_number || 0))
            .filter(v => !isNaN(v));

        if (values.length === 0) {
            return '<p class="text-muted">لا توجد إجابات</p>';
        }

        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        return `
            <div class="scale-results">
                <div class="scale-stat">
                    <span class="scale-stat-label">المتوسط</span>
                    <span class="scale-stat-value">${avg.toFixed(1)}</span>
                </div>
                <div class="scale-stat">
                    <span class="scale-stat-label">الأدنى</span>
                    <span class="scale-stat-value">${min}</span>
                </div>
                <div class="scale-stat">
                    <span class="scale-stat-label">الأعلى</span>
                    <span class="scale-stat-value">${max}</span>
                </div>
            </div>
        `;
    }

    /**
     * عرض نتائج النصوص
     */
    function renderTextResults(answers) {
        let html = '<div class="text-results">';
        answers.slice(0, 5).forEach(answer => {
            const value = answer.answer_value || answer.answer_text;
            if (value) {
                html += `<div class="text-result-item">${escapeHtml(value)}</div>`;
            }
        });
        if (answers.length > 5) {
            html += `<p class="text-muted">و ${answers.length - 5} إجابة أخرى...</p>`;
        }
        html += '</div>';
        return html;
    }

    /**
     * عرض قائمة الاستجابات
     */
    function renderResponsesList(responses, questions, answers) {
        const container = document.getElementById('results-responses');
        if (!container) return;

        if (responses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    <h3>لا توجد استجابات</h3>
                </div>
            `;
            return;
        }

        let html = '<div class="responses-list">';

        responses.forEach((response, index) => {
            const responseAnswers = answers.filter(a => a.response_id === response.id);
            const date = new Date(response.created_at).toLocaleString('ar-SA');

            html += `
                <div class="response-item">
                    <div class="response-header">
                        <h4>استجابة #${index + 1}</h4>
                        <span class="response-date">${date}</span>
                    </div>
                    <div class="response-answers">
                        ${questions.map(q => {
                            const answer = responseAnswers.find(a => a.question_id === q.id);
                            const value = answer ? (answer.answer_value || answer.answer_text || 'لا توجد إجابة') : 'لا توجد إجابة';
                            return `
                                <div class="response-answer">
                                    <strong>${escapeHtml(q.question_text)}</strong>
                                    <p>${escapeHtml(value)}</p>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * عرض التحليلات
     */
    function renderAnalytics(questions, responses, answers) {
        const container = document.getElementById('results-analytics');
        if (!container) return;

        if (responses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-chart-line"></i>
                    <h3>لا توجد بيانات للتحليل</h3>
                    <p>لا توجد استجابات كافية لعرض التحليلات</p>
                </div>
            `;
            return;
        }

        let html = '<div class="analytics-container">';

        // معدل الإكمال
        html += `
            <div class="analytics-card">
                <h3><i class="fa-solid fa-percentage"></i> معدل الإكمال</h3>
                <div class="analytics-stat-large">
                    <span class="stat-number">100%</span>
                    <span class="stat-label">جميع الاستجابات مكتملة</span>
                </div>
            </div>
        `;

        // توزيع الاستجابات حسب الوقت
        const timeDistribution = getTimeDistribution(responses);
        html += `
            <div class="analytics-card">
                <h3><i class="fa-solid fa-clock"></i> توزيع الاستجابات حسب الوقت</h3>
                <div class="time-distribution">
                    ${Object.entries(timeDistribution).map(([period, count]) => `
                        <div class="time-dist-item">
                            <span class="time-period">${period}</span>
                            <div class="time-bar">
                                <div class="time-bar-fill" style="width: ${(count / responses.length * 100)}%"></div>
                            </div>
                            <span class="time-count">${count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // أكثر الأسئلة إجابة
        const questionStats = questions.map(q => ({
            question: q.question_text,
            count: answers.filter(a => a.question_id === q.id).length
        })).sort((a, b) => b.count - a.count);

        html += `
            <div class="analytics-card">
                <h3><i class="fa-solid fa-list-check"></i> إحصائيات الأسئلة</h3>
                <div class="question-stats-list">
                    ${questionStats.slice(0, 5).map((stat, index) => `
                        <div class="question-stat-item">
                            <span class="stat-rank">#${index + 1}</span>
                            <span class="stat-question">${escapeHtml(stat.question.substring(0, 50))}...</span>
                            <span class="stat-count">${stat.count} إجابة</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // معدل الإجابة لكل سؤال
        const avgResponseRate = (answers.length / (questions.length * responses.length) * 100).toFixed(1);
        html += `
            <div class="analytics-card">
                <h3><i class="fa-solid fa-chart-pie"></i> معدل الإجابة</h3>
                <div class="analytics-stat-large">
                    <span class="stat-number">${avgResponseRate}%</span>
                    <span class="stat-label">من الأسئلة تم الإجابة عليها</span>
                </div>
            </div>
        `;

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * حساب توزيع الاستجابات حسب الوقت
     */
    function getTimeDistribution(responses) {
        const distribution = {
            'صباحاً (6-12)': 0,
            'ظهراً (12-6)': 0,
            'مساءً (6-12)': 0,
            'ليلاً (12-6)': 0
        };

        responses.forEach(r => {
            const hour = new Date(r.created_at).getHours();
            if (hour >= 6 && hour < 12) distribution['صباحاً (6-12)']++;
            else if (hour >= 12 && hour < 18) distribution['ظهراً (12-6)']++;
            else if (hour >= 18 && hour < 24) distribution['مساءً (6-12)']++;
            else distribution['ليلاً (12-6)']++;
        });

        return distribution;
    }

    /**
     * ربط أحداث التبويبات
     */
    function bindResultsTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;

                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                document.getElementById(targetTab)?.classList.add('active');
            });
        });
    }

    /**
     * ربط الأحداث
     */
    function bindEvents() {
        document.getElementById('createSurveyBtn')?.addEventListener('click', createNewSurvey);
        document.getElementById('refreshSurveysBtn')?.addEventListener('click', loadSurveys);
        document.getElementById('backToSurveysBtn')?.addEventListener('click', backToSurveysList);
        document.getElementById('backToSurveysFromResultsBtn')?.addEventListener('click', backToSurveysList);
        document.getElementById('refreshResultsBtn')?.addEventListener('click', () => {
            if (currentSurveyId) loadSurveyResults(currentSurveyId);
        });
        document.getElementById('saveSurveyDraftBtn')?.addEventListener('click', () => {
            syncFormDataToState();
            saveSurvey(false);
        });
        document.getElementById('publishSurveyBtn')?.addEventListener('click', () => {
            syncFormDataToState();
            saveSurvey(true);
        });

        document.getElementById('surveysSearchInput')?.addEventListener('input', renderSurveysList);
        document.getElementById('surveysStatusFilter')?.addEventListener('change', renderSurveysList);
        document.getElementById('surveysTypeFilter')?.addEventListener('change', renderSurveysList);
        document.getElementById('surveysAccessFilter')?.addEventListener('change', renderSurveysList);

        document.addEventListener('click', (e) => {
            if (e.target.closest('.question-move-up')) {
                const index = parseInt(e.target.closest('.question-move-up').dataset.index);
                moveQuestionUp(index);
            }
            if (e.target.closest('.question-move-down')) {
                const index = parseInt(e.target.closest('.question-move-down').dataset.index);
                moveQuestionDown(index);
            }
            if (e.target.closest('.question-edit')) {
                const index = parseInt(e.target.closest('.question-edit').dataset.index);
                openQuestionModal(index);
            }
            if (e.target.closest('.question-delete')) {
                const index = parseInt(e.target.closest('.question-delete').dataset.index);
                deleteQuestion(index);
            }
        });
    }

    /**
     * تحريك السؤال لأعلى
     */
    function moveQuestionUp(index) {
        if (index > 0) {
            syncFormDataToState();
            [currentSurvey.questions[index], currentSurvey.questions[index - 1]] = 
            [currentSurvey.questions[index - 1], currentSurvey.questions[index]];
            renderSurveyBuilder();
        }
    }

    /**
     * تحريك السؤال لأسفل
     */
    function moveQuestionDown(index) {
        if (index < currentSurvey.questions.length - 1) {
            syncFormDataToState();
            [currentSurvey.questions[index], currentSurvey.questions[index + 1]] = 
            [currentSurvey.questions[index + 1], currentSurvey.questions[index]];
            renderSurveyBuilder();
        }
    }

    /**
     * حذف سؤال
     */
    function deleteQuestion(index) {
        if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
            syncFormDataToState();
            currentSurvey.questions.splice(index, 1);
            renderSurveyBuilder();
        }
    }

    /**
     * دوال مساعدة
     */
    function getSurveyTypeLabel(type) {
        const types = {
            general: 'عام',
            membership: 'عضوية',
            event: 'فعالية',
            feedback: 'تقييم',
            research: 'بحثي',
            poll: 'استطلاع رأي'
        };
        return types[type] || type;
    }

    function getQuestionTypeLabel(type) {
        const types = {
            short_text: 'نص قصير',
            long_text: 'نص طويل',
            single_choice: 'اختيار واحد',
            multiple_choice: 'اختيارات متعددة',
            dropdown: 'قائمة منسدلة',
            rating_scale: 'مقياس تقييم',
            linear_scale: 'مقياس خطي',
            yes_no: 'نعم/لا',
            date: 'تاريخ',
            email: 'بريد إلكتروني',
            phone: 'رقم هاتف',
            number: 'رقم'
        };
        return types[type] || type;
    }

    function getStatusBadge(status) {
        const badges = {
            draft: '<span class="badge badge-secondary">مسودة</span>',
            active: '<span class="badge badge-success">نشط</span>',
            paused: '<span class="badge badge-warning">متوقف</span>',
            closed: '<span class="badge badge-danger">مغلق</span>',
            archived: '<span class="badge badge-dark">مؤرشف</span>'
        };
        return badges[status] || status;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function hideAllSections() {
        document.querySelectorAll('.admin-section').forEach(section => {
            section.style.display = 'none';
        });
    }

    function showLoading(show) {
        if (window.showLoading) window.showLoading(show);
    }

    function showError(message) {
        if (window.showError) window.showError(message);
    }

    function showSuccess(message) {
        if (window.showSuccess) window.showSuccess(message);
    }

    window.surveysManager = {
        init,
        createNewSurvey,
        editSurvey,
        viewResults,
        saveSurvey,
        backToSurveysList,
        deleteSurvey: async (id) => {
            if (!confirm('هل أنت متأكد من حذف هذا الاستبيان؟')) return;
            try {
                const { error } = await sb.from('surveys').delete().eq('id', id);
                if (error) throw error;
                showSuccess('تم حذف الاستبيان بنجاح');
                await loadSurveys();
            } catch (error) {
                console.error('Error deleting survey:', error);
                showError('حدث خطأ أثناء حذف الاستبيان');
            }
        },
        copyShareLink: async (id, title) => {
            try {
                const surveyUrl = `${window.location.origin}/survey.html?id=${id}`;
                
                await navigator.clipboard.writeText(surveyUrl);
                
                showSuccess(`تم نسخ رابط الاستبيان "${title}" للحافظة`);
            } catch (error) {
                console.error('Error copying share link:', error);
                
                const textarea = document.createElement('textarea');
                textarea.value = `${window.location.origin}/survey.html?id=${id}`;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                
                try {
                    document.execCommand('copy');
                    showSuccess(`تم نسخ رابط الاستبيان "${title}" للحافظة`);
                } catch (fallbackError) {
                    showError('فشل نسخ الرابط. يرجى نسخه يدوياً');
                    prompt('انسخ هذا الرابط:', `${window.location.origin}/survey.html?id=${id}`);
                } finally {
                    document.body.removeChild(textarea);
                }
            }
        },
        duplicateSurvey: async (id) => {
            try {
                showLoading(true);
                
                const { data: originalSurvey, error: fetchError } = await sb
                    .from('surveys')
                    .select('*')
                    .eq('id', id)
                    .single();
                
                if (fetchError) throw fetchError;
                
                const { data: originalQuestions, error: questionsError } = await sb
                    .from('survey_questions')
                    .select('*')
                    .eq('survey_id', id)
                    .order('display_order');
                
                if (questionsError) throw questionsError;
                
                const newSurveyData = {
                    title: `${originalSurvey.title} (نسخة)`,
                    description: originalSurvey.description,
                    survey_type: originalSurvey.survey_type,
                    access_type: originalSurvey.access_type,
                    estimated_duration_minutes: originalSurvey.estimated_duration_minutes,
                    welcome_message: originalSurvey.welcome_message,
                    completion_message: originalSurvey.completion_message,
                    show_progress_bar: originalSurvey.show_progress_bar,
                    show_question_numbers: originalSurvey.show_question_numbers,
                    is_anonymous: originalSurvey.is_anonymous,
                    status: 'draft',
                    created_by: currentUser.id
                };
                
                const { data: newSurvey, error: createError } = await sb
                    .from('surveys')
                    .insert([newSurveyData])
                    .select()
                    .single();
                
                if (createError) throw createError;
                
                if (originalQuestions && originalQuestions.length > 0) {
                    const newQuestions = originalQuestions.map(q => ({
                        survey_id: newSurvey.id,
                        question_text: q.question_text,
                        question_type: q.question_type,
                        is_required: q.is_required,
                        display_order: q.display_order,
                        options: q.options,
                        settings: q.settings,
                        help_text: q.help_text,
                        placeholder_text: q.placeholder_text
                    }));
                    
                    const { error: insertQuestionsError } = await sb
                        .from('survey_questions')
                        .insert(newQuestions);
                    
                    if (insertQuestionsError) throw insertQuestionsError;
                }
                
                showSuccess('تم نسخ الاستبيان بنجاح');
                await loadSurveys();
            } catch (error) {
                console.error('Error duplicating survey:', error);
                showError('حدث خطأ أثناء نسخ الاستبيان');
            } finally {
                showLoading(false);
            }
        },
        publishSurvey: async (id) => {
            try {
                const { error } = await sb
                    .from('surveys')
                    .update({ status: 'active', published_at: new Date().toISOString() })
                    .eq('id', id);
                if (error) throw error;
                showSuccess('تم نشر الاستبيان بنجاح');
                await loadSurveys();
            } catch (error) {
                console.error('Error publishing survey:', error);
                showError('حدث خطأ أثناء نشر الاستبيان');
            }
        },
        toggleSurveyStatus: async (id, newStatus) => {
            try {
                showLoading(true);
                
                const statusMessages = {
                    'active': 'تم تنشيط الاستبيان بنجاح',
                    'paused': 'تم إيقاف الاستبيان مؤقتاً',
                    'closed': 'تم إغلاق الاستبيان'
                };
                
                const { error } = await sb
                    .from('surveys')
                    .update({ status: newStatus })
                    .eq('id', id);
                    
                if (error) throw error;
                
                showSuccess(statusMessages[newStatus] || 'تم تحديث حالة الاستبيان');
                await loadSurveys();
            } catch (error) {
                console.error('Error toggling survey status:', error);
                showError('حدث خطأ أثناء تحديث حالة الاستبيان');
            } finally {
                showLoading(false);
            }
        },
        moveQuestionUp: (index) => {
            if (index > 0) {
                [currentSurvey.questions[index], currentSurvey.questions[index - 1]] = 
                [currentSurvey.questions[index - 1], currentSurvey.questions[index]];
                renderSurveyBuilder();
            }
        },
        moveQuestionDown: (index) => {
            if (index < currentSurvey.questions.length - 1) {
                [currentSurvey.questions[index], currentSurvey.questions[index + 1]] = 
                [currentSurvey.questions[index + 1], currentSurvey.questions[index]];
                renderSurveyBuilder();
            }
        },
        openQuestionModal,
        closeQuestionModal,
        moveQuestionUp,
        moveQuestionDown,
        deleteQuestion
    };

})();
