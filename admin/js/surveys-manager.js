/**
 * نظام إدارة الاستبيانات المتقدم - نادي أدِيب
 * مدير شامل للاستبيانات مع دعم جميع أنواع الأسئلة
 */

(function() {
    const sb = window.sbClient;
    window.currentUser = null;
    window.currentSurvey = null;
    window.allSurveys = [];
    window.surveyQuestions = [];
    let currentUser = null;
    let currentSurvey = null;
    let allSurveys = [];
    let surveyQuestions = [];

    class SurveysManager {
        constructor() {
            this.currentEditingSurvey = null;
            this.questionTypes = this.getQuestionTypes();
        }

        async init(user) {
            currentUser = user;
            await this.loadAllSurveys();
            this.setupEventListeners();
        }

        getQuestionTypes() {
            return [
                { value: 'short_text', label: 'نص قصير', icon: 'fa-font' },
                { value: 'long_text', label: 'نص طويل', icon: 'fa-align-left' },
                { value: 'single_choice', label: 'اختيار واحد', icon: 'fa-circle-dot' },
                { value: 'multiple_choice', label: 'اختيارات متعددة', icon: 'fa-square-check' },
                { value: 'dropdown', label: 'قائمة منسدلة', icon: 'fa-caret-down' },
                { value: 'linear_scale', label: 'مقياس خطي', icon: 'fa-sliders' },
                { value: 'rating_stars', label: 'تقييم بالنجوم', icon: 'fa-star' },
                { value: 'rating_hearts', label: 'تقييم بالقلوب', icon: 'fa-heart' },
                { value: 'rating_emojis', label: 'تقييم بالإيموجي', icon: 'fa-face-smile' },
                { value: 'number', label: 'رقم', icon: 'fa-hashtag' },
                { value: 'email', label: 'بريد إلكتروني', icon: 'fa-envelope' },
                { value: 'phone', label: 'رقم هاتف', icon: 'fa-phone' },
                { value: 'url', label: 'رابط', icon: 'fa-link' },
                { value: 'date', label: 'تاريخ', icon: 'fa-calendar' },
                { value: 'time', label: 'وقت', icon: 'fa-clock' },
                { value: 'datetime', label: 'تاريخ ووقت', icon: 'fa-calendar-clock' },
                { value: 'file_upload', label: 'رفع ملف', icon: 'fa-upload' },
                { value: 'slider', label: 'شريط منزلق', icon: 'fa-sliders-h' },
                { value: 'yes_no', label: 'نعم/لا', icon: 'fa-toggle-on' },
                { value: 'agreement_scale', label: 'مقياس الموافقة', icon: 'fa-thumbs-up' },
                { value: 'nps', label: 'Net Promoter Score', icon: 'fa-chart-line' }
            ];
        }

        setupEventListeners() {
            const createNewBtn = document.getElementById('createNewSurveyBtn');
            if (createNewBtn) {
                createNewBtn.addEventListener('click', () => this.navigateToCreate());
            }

            const refreshBtn = document.getElementById('refreshSurveysBtn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.loadAllSurveys());
            }

            const searchInput = document.getElementById('surveysSearchInput');
            if (searchInput) {
                searchInput.addEventListener('input', () => this.filterSurveys());
            }

            const statusFilter = document.getElementById('surveysStatusFilter');
            if (statusFilter) {
                statusFilter.addEventListener('change', () => this.filterSurveys());
            }

            const typeFilter = document.getElementById('surveysTypeFilter');
            if (typeFilter) {
                typeFilter.addEventListener('change', () => this.filterSurveys());
            }

            // ربط اختيار الاستبيان من قسم الإحصائيات بقسم الاستجابات الفردية
            const selectSurveyForResults = document.getElementById('selectSurveyForResults');
            if (selectSurveyForResults) {
                selectSurveyForResults.addEventListener('change', async (e) => {
                    const surveyId = e.target.value;
                    if (surveyId) {
                        await this.loadSurveyResponses(surveyId);
                    }
                });
            }

            this.setupSaveButtons();
        }

        setupSaveButtons() {
            const saveDraftBtn = document.getElementById('saveSurveyDraftBtn');
            if (saveDraftBtn) {
                saveDraftBtn.replaceWith(saveDraftBtn.cloneNode(true));
                const newSaveDraftBtn = document.getElementById('saveSurveyDraftBtn');
                newSaveDraftBtn.addEventListener('click', () => this.saveSurvey('draft'));
            }

            const publishBtn = document.getElementById('publishSurveyBtn');
            if (publishBtn) {
                publishBtn.replaceWith(publishBtn.cloneNode(true));
                const newPublishBtn = document.getElementById('publishSurveyBtn');
                newPublishBtn.addEventListener('click', () => this.saveSurvey('active'));
            }
        }

        async loadAllSurveys() {
            try {
                const { data, error } = await sb
                    .from('surveys')
                    .select(`
                        *,
                        created_by_profile:profiles!surveys_created_by_fkey(full_name),
                        committee:committees(committee_name_ar)
                    `)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                allSurveys = data || [];
                await this.updateStatistics();
                this.renderSurveysList();
            } catch (error) {
                console.error('Error loading surveys:', error);
                this.showError('حدث خطأ أثناء تحميل الاستبيانات');
            }
        }

        async updateStatistics() {
            const total = allSurveys.length;
            const active = allSurveys.filter(s => s.status === 'active').length;
            const totalResponses = allSurveys.reduce((sum, s) => sum + (s.total_responses || 0), 0);
            const completedResponses = allSurveys.reduce((sum, s) => sum + (s.total_completed || 0), 0);

            document.getElementById('totalSurveysCount').textContent = total;
            document.getElementById('activeSurveysCount').textContent = active;
            document.getElementById('totalResponsesCount').textContent = totalResponses;
            document.getElementById('completedResponsesCount').textContent = completedResponses;
        }

        filterSurveys() {
            const searchTerm = document.getElementById('surveysSearchInput')?.value.toLowerCase() || '';
            const statusFilter = document.getElementById('surveysStatusFilter')?.value || '';
            const typeFilter = document.getElementById('surveysTypeFilter')?.value || '';

            const filtered = allSurveys.filter(survey => {
                const matchesSearch = survey.title.toLowerCase().includes(searchTerm) ||
                                    (survey.description || '').toLowerCase().includes(searchTerm);
                const matchesStatus = !statusFilter || survey.status === statusFilter;
                const matchesType = !typeFilter || survey.survey_type === typeFilter;

                return matchesSearch && matchesStatus && matchesType;
            });

            this.renderSurveysList(filtered);
        }

        renderSurveysList(surveys = allSurveys) {
            const container = document.getElementById('surveysListContainer');
            if (!container) return;

            if (surveys.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-clipboard-question"></i>
                        <h3>لا توجد استبيانات</h3>
                        <p>ابدأ بإنشاء استبيان جديد</p>
                        <button class="btn-primary" onclick="window.surveysManager.navigateToCreate()">
                            <i class="fa-solid fa-plus"></i>
                            إنشاء استبيان
                        </button>
                    </div>
                `;
                return;
            }

            container.innerHTML = surveys.map(survey => this.renderSurveyCard(survey)).join('');
        }

        renderSurveyCard(survey) {
            // التحقق من حالة الاستبيان بناءً على التاريخ
            let actualStatus = survey.status;
            const now = new Date();
            
            if (survey.status === 'active') {
                if (survey.end_date) {
                    const endDate = new Date(survey.end_date);
                    if (now > endDate) {
                        actualStatus = 'closed';
                    }
                }
                if (survey.start_date) {
                    const startDate = new Date(survey.start_date);
                    if (now < startDate) {
                        actualStatus = 'paused';
                    }
                }
            }

            const statusColors = {
                draft: '#6b7280',
                active: '#10b981',
                paused: '#f59e0b',
                closed: '#ef4444',
                archived: '#64748b'
            };

            const statusLabels = {
                draft: 'مسودة',
                active: 'نشط',
                paused: 'متوقف',
                closed: 'مغلق',
                archived: 'مؤرشف'
            };

            const typeLabels = {
                general: 'عام',
                membership: 'عضوية',
                event: 'فعالية',
                feedback: 'تقييم',
                evaluation: 'تقويم',
                poll: 'استطلاع',
                quiz: 'اختبار',
                research: 'بحث'
            };

            const completionRate = survey.total_responses > 0 
                ? Math.round((survey.total_completed / survey.total_responses) * 100) 
                : 0;

            const statusBadgeClass = {
                draft: 'badge-secondary',
                active: 'badge-success',
                paused: 'badge-warning',
                closed: 'badge-danger',
                archived: 'badge-secondary'
            };

            const surveyUrl = `${window.location.origin}/surveys/survey.html?id=${survey.id}`;

            return `
                <div class="application-card" data-survey-id="${survey.id}">
                    <div class="application-card-header">
                        <div class="applicant-info">
                            <div class="applicant-avatar">
                                <i class="fa-solid fa-clipboard-question"></i>
                            </div>
                            <div class="applicant-details">
                                <h3 class="applicant-name">${this.escapeHtml(survey.title)}</h3>
                                <div>
                                    <span class="badge ${statusBadgeClass[actualStatus]}">
                                        ${statusLabels[actualStatus]}
                                    </span>
                                    <span class="badge badge-info">
                                        ${typeLabels[survey.survey_type]}
                                    </span>
                                    ${actualStatus !== survey.status ? '<span class="badge badge-warning" title="تم تحديد الحالة تلقائياً بناءً على التاريخ"><i class="fa-solid fa-clock"></i></span>' : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    ${survey.description ? `
                        <div class="application-card-body">
                            <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 1rem;">${this.escapeHtml(survey.description)}</p>
                        </div>
                    ` : ''}
                    
                    <div class="application-card-body">
                        <div class="application-info-grid">
                            <div class="info-item">
                                <i class="fa-solid fa-eye"></i>
                                <div class="info-content">
                                    <span class="info-label">المشاهدات</span>
                                    <span class="info-value">${survey.total_views || 0}</span>
                                </div>
                            </div>
                            <div class="info-item">
                                <i class="fa-solid fa-users"></i>
                                <div class="info-content">
                                    <span class="info-label">الاستجابات</span>
                                    <span class="info-value">${survey.total_responses || 0}</span>
                                </div>
                            </div>
                            <div class="info-item">
                                <i class="fa-solid fa-check-circle"></i>
                                <div class="info-content">
                                    <span class="info-label">المكتملة</span>
                                    <span class="info-value">${survey.total_completed || 0}</span>
                                </div>
                            </div>
                            <div class="info-item">
                                <i class="fa-solid fa-percentage"></i>
                                <div class="info-content">
                                    <span class="info-label">معدل الإكمال</span>
                                    <span class="info-value">${completionRate}%</span>
                                </div>
                            </div>
                            <div class="info-item">
                                <i class="fa-solid fa-calendar"></i>
                                <div class="info-content">
                                    <span class="info-label">تاريخ الإنشاء</span>
                                    <span class="info-value">${this.formatDate(survey.created_at)}</span>
                                </div>
                            </div>
                            ${survey.created_by_profile ? `
                                <div class="info-item">
                                    <i class="fa-solid fa-user"></i>
                                    <div class="info-content">
                                        <span class="info-label">المنشئ</span>
                                        <span class="info-value">${this.escapeHtml(survey.created_by_profile.full_name)}</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="application-card-footer">
                        <button class="btn-action btn-action-info" onclick="window.surveysManager.previewSurvey(${survey.id})" title="معاينة الاستبيان">
                            <i class="fa-solid fa-eye"></i>
                            معاينة
                        </button>
                        <button class="btn-action btn-action-secondary" onclick="window.surveysManager.copySurveyLink(${survey.id})" title="نسخ رابط الاستبيان">
                            <i class="fa-solid fa-copy"></i>
                            نسخ الرابط
                        </button>
                        <button class="btn-action btn-action-success" onclick="window.surveysManager.shareSurveyModal(${survey.id})" title="نشر على منصات التواصل">
                            <i class="fa-solid fa-share-nodes"></i>
                            نشر
                        </button>
                        <button class="btn-action btn-action-warning" onclick="window.surveysManager.editSurvey(${survey.id})" title="تعديل الاستبيان">
                            <i class="fa-solid fa-edit"></i>
                            تعديل
                        </button>
                        <button class="btn-action btn-action-primary" onclick="window.surveysManager.viewResults(${survey.id})" title="عرض النتائج">
                            <i class="fa-solid fa-chart-bar"></i>
                            النتائج
                        </button>
                    </div>
                </div>
            `;
        }

        navigateToCreate() {
            const section = document.querySelector('[data-section="surveys-create-section"]');
            if (section) {
                section.click();
            }
        }

        async showCreateForm() {
            this.currentEditingSurvey = null;
            surveyQuestions = [];
            this.renderSurveyBuilder();
            
            setTimeout(() => {
                this.setupSaveButtons();
            }, 100);
        }

        renderSurveyBuilder() {
            const container = document.getElementById('surveyBuilderContainer');
            if (!container) return;

            container.innerHTML = `
                <div class="survey-builder-content">
                    <!-- معلومات الاستبيان الأساسية -->
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fa-solid fa-info-circle"></i> معلومات الاستبيان</h3>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <label>عنوان الاستبيان <span class="required">*</span></label>
                                <input type="text" id="surveyTitle" class="form-input" 
                                    placeholder="أدخل عنوان الاستبيان" 
                                    value="${this.currentEditingSurvey?.title || ''}" required />
                            </div>
                            
                            <div class="form-group">
                                <label>الوصف</label>
                                <textarea id="surveyDescription" class="form-input" rows="3" 
                                    placeholder="وصف مختصر للاستبيان">${this.currentEditingSurvey?.description || ''}</textarea>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>نوع الاستبيان</label>
                                    <select id="surveyType" class="form-input">
                                        <option value="general">عام</option>
                                        <option value="membership">عضوية</option>
                                        <option value="event">فعالية</option>
                                        <option value="feedback">تقييم</option>
                                        <option value="evaluation">تقويم</option>
                                        <option value="poll">استطلاع</option>
                                        <option value="quiz">اختبار</option>
                                        <option value="research">بحث</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label>نوع الوصول</label>
                                    <select id="surveyAccessType" class="form-input">
                                        <option value="public">عام (الجميع)</option>
                                        <option value="authenticated">مستخدمون مسجلون</option>
                                        <option value="members_only">أعضاء فقط</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>تاريخ البدء</label>
                                    <input type="datetime-local" id="surveyStartDate" class="form-input" />
                                </div>
                                
                                <div class="form-group">
                                    <label>تاريخ الانتهاء</label>
                                    <input type="datetime-local" id="surveyEndDate" class="form-input" />
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>الإعدادات</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="allowMultipleResponses" />
                                        <span>السماح بإجابات متعددة من نفس المستخدم</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="allowAnonymous" />
                                        <span>السماح بالإجابات المجهولة</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="showProgressBar" checked />
                                        <span>عرض شريط التقدم</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="showResults" />
                                        <span>عرض النتائج للمشاركين</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- الأسئلة -->
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fa-solid fa-question-circle"></i> الأسئلة</h3>
                            <button class="btn-primary" onclick="window.surveysManager.addQuestion()">
                                <i class="fa-solid fa-plus"></i>
                                إضافة سؤال
                            </button>
                        </div>
                        <div class="card-body">
                            <div id="questionsContainer" class="questions-container">
                                ${surveyQuestions.length === 0 ? `
                                    <div class="empty-state-small">
                                        <i class="fa-solid fa-question"></i>
                                        <p>لم تتم إضافة أي أسئلة بعد</p>
                                    </div>
                                ` : this.renderQuestions()}
                            </div>
                        </div>
                    </div>
                    
                    <!-- رسائل مخصصة -->
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fa-solid fa-message"></i> الرسائل المخصصة</h3>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <label>رسالة الترحيب</label>
                                <textarea id="welcomeMessage" class="form-input" rows="2" 
                                    placeholder="رسالة ترحيبية تظهر في بداية الاستبيان"></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label>رسالة الشكر</label>
                                <textarea id="thankYouMessage" class="form-input" rows="2" 
                                    placeholder="رسالة شكر تظهر بعد إكمال الاستبيان">شكراً لمشاركتك في هذا الاستبيان</textarea>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        addQuestion() {
            const newQuestion = {
                id: Date.now(),
                question_text: '',
                question_type: 'short_text',
                is_required: false,
                options: null,
                validation_rules: null
            };

            surveyQuestions.push(newQuestion);
            this.renderQuestions();
        }

        renderQuestions() {
            const container = document.getElementById('questionsContainer');
            if (!container) return '';

            const html = surveyQuestions.map((q, index) => this.renderQuestionEditor(q, index)).join('');
            container.innerHTML = html;
            return html;
        }

        renderQuestionEditor(question, index) {
            const questionType = this.questionTypes.find(t => t.value === question.question_type);
            
            return `
                <div class="question-editor" data-question-index="${index}">
                    <div class="question-editor-header">
                        <span class="question-number">سؤال ${index + 1}</span>
                        <div class="question-actions">
                            <button class="btn-icon" onclick="window.surveysManager.moveQuestion(${index}, -1)" 
                                ${index === 0 ? 'disabled' : ''} title="تحريك لأعلى">
                                <i class="fa-solid fa-arrow-up"></i>
                            </button>
                            <button class="btn-icon" onclick="window.surveysManager.moveQuestion(${index}, 1)" 
                                ${index === surveyQuestions.length - 1 ? 'disabled' : ''} title="تحريك لأسفل">
                                <i class="fa-solid fa-arrow-down"></i>
                            </button>
                            <button class="btn-icon" onclick="window.surveysManager.duplicateQuestion(${index})" title="نسخ">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                            <button class="btn-icon btn-danger" onclick="window.surveysManager.deleteQuestion(${index})" title="حذف">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="question-editor-body">
                        <div class="form-group">
                            <label>نص السؤال <span class="required">*</span></label>
                            <input type="text" class="form-input" 
                                value="${this.escapeHtml(question.question_text)}"
                                onchange="window.surveysManager.updateQuestion(${index}, 'question_text', this.value)"
                                placeholder="أدخل نص السؤال" required />
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>نوع السؤال</label>
                                <select class="form-input" 
                                    onchange="window.surveysManager.updateQuestion(${index}, 'question_type', this.value)">
                                    ${this.questionTypes.map(type => `
                                        <option value="${type.value}" ${question.question_type === type.value ? 'selected' : ''}>
                                            ${type.label}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" 
                                        ${question.is_required ? 'checked' : ''}
                                        onchange="window.surveysManager.updateQuestion(${index}, 'is_required', this.checked)" />
                                    <span>سؤال إجباري</span>
                                </label>
                            </div>
                        </div>
                        
                        ${this.renderQuestionOptions(question, index)}
                    </div>
                </div>
            `;
        }

        renderQuestionOptions(question, index) {
            const needsOptions = ['single_choice', 'multiple_choice', 'dropdown'].includes(question.question_type);
            const needsScale = ['linear_scale', 'rating_stars', 'rating_hearts', 'rating_emojis', 'slider'].includes(question.question_type);
            
            if (needsOptions) {
                const options = question.options?.choices || ['', ''];
                return `
                    <div class="form-group">
                        <label>الخيارات</label>
                        <div class="options-list" id="options-${index}">
                            ${options.map((opt, optIndex) => `
                                <div class="option-item">
                                    <input type="text" class="form-input" value="${this.escapeHtml(opt)}"
                                        onchange="window.surveysManager.updateOption(${index}, ${optIndex}, this.value)"
                                        placeholder="خيار ${optIndex + 1}" />
                                    <button class="btn-icon btn-danger" 
                                        onclick="window.surveysManager.removeOption(${index}, ${optIndex})"
                                        ${options.length <= 2 ? 'disabled' : ''}>
                                        <i class="fa-solid fa-times"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn-outline btn-sm" onclick="window.surveysManager.addOption(${index})">
                            <i class="fa-solid fa-plus"></i>
                            إضافة خيار
                        </button>
                    </div>
                `;
            }
            
            if (needsScale) {
                const scale = question.options?.scale || { min: 1, max: 5 };
                return `
                    <div class="form-row">
                        <div class="form-group">
                            <label>الحد الأدنى</label>
                            <input type="number" class="form-input" value="${scale.min}"
                                onchange="window.surveysManager.updateScale(${index}, 'min', this.value)" />
                        </div>
                        <div class="form-group">
                            <label>الحد الأقصى</label>
                            <input type="number" class="form-input" value="${scale.max}"
                                onchange="window.surveysManager.updateScale(${index}, 'max', this.value)" />
                        </div>
                    </div>
                `;
            }
            
            return '';
        }

        updateQuestion(index, field, value) {
            if (surveyQuestions[index]) {
                surveyQuestions[index][field] = value;
                if (field === 'question_type') {
                    surveyQuestions[index].options = this.getDefaultOptions(value);
                    this.renderQuestions();
                }
            }
        }

        getDefaultOptions(questionType) {
            if (['single_choice', 'multiple_choice', 'dropdown'].includes(questionType)) {
                return { choices: ['خيار 1', 'خيار 2'] };
            }
            if (['linear_scale', 'rating_stars', 'rating_hearts', 'rating_emojis', 'slider'].includes(questionType)) {
                return { scale: { min: 1, max: 5 } };
            }
            return null;
        }

        addOption(questionIndex) {
            if (!surveyQuestions[questionIndex].options) {
                surveyQuestions[questionIndex].options = { choices: [] };
            }
            surveyQuestions[questionIndex].options.choices.push('');
            this.renderQuestions();
        }

        updateOption(questionIndex, optionIndex, value) {
            if (surveyQuestions[questionIndex]?.options?.choices) {
                surveyQuestions[questionIndex].options.choices[optionIndex] = value;
            }
        }

        removeOption(questionIndex, optionIndex) {
            if (surveyQuestions[questionIndex]?.options?.choices) {
                surveyQuestions[questionIndex].options.choices.splice(optionIndex, 1);
                this.renderQuestions();
            }
        }

        updateScale(questionIndex, field, value) {
            if (!surveyQuestions[questionIndex].options) {
                surveyQuestions[questionIndex].options = { scale: {} };
            }
            surveyQuestions[questionIndex].options.scale[field] = parseInt(value);
        }

        moveQuestion(index, direction) {
            const newIndex = index + direction;
            if (newIndex >= 0 && newIndex < surveyQuestions.length) {
                [surveyQuestions[index], surveyQuestions[newIndex]] = 
                [surveyQuestions[newIndex], surveyQuestions[index]];
                this.renderQuestions();
            }
        }

        duplicateQuestion(index) {
            const question = JSON.parse(JSON.stringify(surveyQuestions[index]));
            question.id = Date.now();
            surveyQuestions.splice(index + 1, 0, question);
            this.renderQuestions();
        }

        deleteQuestion(index) {
            if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
                surveyQuestions.splice(index, 1);
                this.renderQuestions();
            }
        }

        async saveSurvey(status) {
            try {
                if (!currentUser || !currentUser.id) {
                    this.showError('خطأ في تحديد المستخدم الحالي');
                    return;
                }

                const title = document.getElementById('surveyTitle')?.value.trim();
                if (!title) {
                    this.showError('يرجى إدخال عنوان الاستبيان');
                    return;
                }

                if (surveyQuestions.length === 0) {
                    this.showError('يرجى إضافة سؤال واحد على الأقل');
                    return;
                }

                const surveyData = {
                    title,
                    description: document.getElementById('surveyDescription')?.value || null,
                    survey_type: document.getElementById('surveyType')?.value || 'general',
                    access_type: document.getElementById('surveyAccessType')?.value || 'public',
                    status,
                    allow_multiple_responses: document.getElementById('allowMultipleResponses')?.checked || false,
                    allow_anonymous: document.getElementById('allowAnonymous')?.checked || false,
                    show_progress_bar: document.getElementById('showProgressBar')?.checked || true,
                    show_results_to_participants: document.getElementById('showResults')?.checked || false,
                    start_date: document.getElementById('surveyStartDate')?.value || null,
                    end_date: document.getElementById('surveyEndDate')?.value || null,
                    welcome_message: document.getElementById('welcomeMessage')?.value || null,
                    thank_you_message: document.getElementById('thankYouMessage')?.value || 'شكراً لمشاركتك',
                    created_by: currentUser.id
                };

                if (status === 'active') {
                    surveyData.published_at = new Date().toISOString();
                }

                let surveyId;
                if (this.currentEditingSurvey) {
                    const { data, error } = await sb
                        .from('surveys')
                        .update(surveyData)
                        .eq('id', this.currentEditingSurvey.id)
                        .select()
                        .single();

                    if (error) throw error;
                    surveyId = data.id;
                } else {
                    const { data, error } = await sb
                        .from('surveys')
                        .insert(surveyData)
                        .select()
                        .single();

                    if (error) throw error;
                    surveyId = data.id;
                }

                await this.saveQuestions(surveyId);

                this.showSuccess(status === 'draft' ? 'تم حفظ المسودة بنجاح' : 'تم نشر الاستبيان بنجاح');
                
                setTimeout(() => {
                    const allSurveysLink = document.querySelector('[data-section="surveys-all-section"]');
                    if (allSurveysLink) allSurveysLink.click();
                }, 1500);

            } catch (error) {
                console.error('Error saving survey:', error);
                this.showError('حدث خطأ أثناء حفظ الاستبيان');
            }
        }

        async saveQuestions(surveyId) {
            await sb.from('survey_questions').delete().eq('survey_id', surveyId);

            const questionsToInsert = surveyQuestions.map((q, index) => ({
                survey_id: surveyId,
                question_text: q.question_text,
                question_type: q.question_type,
                question_order: index,
                is_required: q.is_required,
                options: q.options
            }));

            const { error } = await sb.from('survey_questions').insert(questionsToInsert);
            if (error) throw error;
        }

        async viewSurvey(surveyId) {
            window.open(`/surveys/survey.html?id=${surveyId}`, '_blank');
        }


        async deleteSurvey(surveyId) {
            if (!confirm('هل أنت متأكد من حذف هذا الاستبيان؟ سيتم حذف جميع الأسئلة والإجابات المرتبطة به.')) {
                return;
            }

            try {
                const { error } = await sb
                    .from('surveys')
                    .delete()
                    .eq('id', surveyId);

                if (error) throw error;

                this.showSuccess('تم حذف الاستبيان بنجاح');
                await this.loadAllSurveys();

            } catch (error) {
                console.error('Error deleting survey:', error);
                this.showError('حدث خطأ أثناء حذف الاستبيان');
            }
        }

        async previewSurvey(surveyId) {
            const surveyUrl = `${window.location.origin}/surveys/survey.html?id=${surveyId}`;
            window.open(surveyUrl, '_blank');
        }

        async copySurveyLink(surveyId) {
            const surveyUrl = `${window.location.origin}/surveys/survey.html?id=${surveyId}`;
            
            try {
                await navigator.clipboard.writeText(surveyUrl);
                this.showSuccess('تم نسخ رابط الاستبيان بنجاح');
            } catch (err) {
                this.showCopyLinkModal(surveyUrl);
            }
        }

        showCopyLinkModal(url) {
            const modal = document.createElement('div');
            modal.className = 'modal-backdrop active';
            modal.innerHTML = `
                <div class="modal modal-md active">
                    <div class="modal-header">
                        <h3><i class="fa-solid fa-link"></i> رابط الاستبيان</h3>
                        <button class="modal-close" onclick="this.closest('.modal-backdrop').remove()">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="share-link-container">
                            <input type="text" class="share-link-input" value="${url}" readonly />
                            <button class="share-link-copy" onclick="navigator.clipboard.writeText('${url}').then(() => { window.surveysManager.showSuccess('تم النسخ'); this.closest('.modal-backdrop').remove(); })">
                                <i class="fa-solid fa-copy"></i> نسخ
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            document.body.classList.add('modal-open');
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    document.body.classList.remove('modal-open');
                }
            });
        }

        async shareSurveyModal(surveyId) {
            const survey = allSurveys.find(s => s.id === surveyId);
            if (!survey) return;
            
            const surveyUrl = `${window.location.origin}/surveys/survey.html?id=${surveyId}`;
            const shareText = `شارك في استبيان: ${survey.title}`;
            
            const modal = document.createElement('div');
            modal.className = 'modal-backdrop active';
            modal.innerHTML = `
                <div class="modal modal-md active">
                    <div class="modal-header">
                        <h3><i class="fa-solid fa-share-nodes"></i> نشر الاستبيان</h3>
                        <button class="modal-close" onclick="this.closest('.modal-backdrop').remove(); document.body.classList.remove('modal-open');">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="share-options">
                            <div class="share-option" onclick="window.open('https://wa.me/?text=${encodeURIComponent(shareText + ' ' + surveyUrl)}', '_blank')">
                                <i class="fa-brands fa-whatsapp" style="color: #25D366;"></i>
                                <span>واتساب</span>
                            </div>
                            <div class="share-option" onclick="window.open('https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(surveyUrl)}', '_blank')">
                                <i class="fa-brands fa-x-twitter" style="color: #000000;"></i>
                                <span>تويتر</span>
                            </div>
                            <div class="share-option" onclick="window.open('https://t.me/share/url?url=${encodeURIComponent(surveyUrl)}&text=${encodeURIComponent(shareText)}', '_blank')">
                                <i class="fa-brands fa-telegram" style="color: #0088cc;"></i>
                                <span>تيليجرام</span>
                            </div>
                            <div class="share-option" onclick="window.open('mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(surveyUrl)}', '_blank')">
                                <i class="fa-solid fa-envelope" style="color: #ea4335;"></i>
                                <span>بريد إلكتروني</span>
                            </div>
                        </div>
                        <div class="share-link-container" style="margin-top: 1rem;">
                            <input type="text" class="share-link-input" value="${surveyUrl}" readonly />
                            <button class="share-link-copy" onclick="navigator.clipboard.writeText('${surveyUrl}').then(() => window.surveysManager.showSuccess('تم نسخ الرابط'))">
                                <i class="fa-solid fa-copy"></i> نسخ
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            document.body.classList.add('modal-open');
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    document.body.classList.remove('modal-open');
                }
            });
        }

        async editSurvey(surveyId) {
            // استخدام نظام Modal الجديد للتعديل
            if (window.surveyEditModal) {
                window.surveyEditModal.open(surveyId);
            } else {
                // Fallback للطريقة القديمة إذا لم يكن Modal متاحاً
                try {
                    const survey = allSurveys.find(s => s.id === surveyId);
                    if (!survey) {
                        this.showError('لم يتم العثور على الاستبيان');
                        return;
                    }

                    const { data: questions, error } = await sb
                        .from('survey_questions')
                        .select('*')
                        .eq('survey_id', surveyId)
                        .order('question_order');

                    if (error) throw error;

                    this.currentEditingSurvey = survey;
                    surveyQuestions = questions || [];

                    const createSection = document.querySelector('[data-section="surveys-create-section"]');
                    if (createSection) {
                        createSection.click();
                        
                        setTimeout(() => {
                            this.renderSurveyBuilder();
                            this.populateSurveyForm(survey);
                            this.setupSaveButtons();
                        }, 100);
                    }
                } catch (error) {
                    console.error('Error loading survey for edit:', error);
                    this.showError('حدث خطأ أثناء تحميل الاستبيان');
                }
            }
        }

        populateSurveyForm(survey) {
            document.getElementById('surveyTitle').value = survey.title || '';
            document.getElementById('surveyDescription').value = survey.description || '';
            document.getElementById('surveyType').value = survey.survey_type || 'general';
            document.getElementById('surveyAccessType').value = survey.access_type || 'public';
            
            if (survey.start_date) {
                const startDate = new Date(survey.start_date);
                document.getElementById('surveyStartDate').value = startDate.toISOString().slice(0, 16);
            }
            
            if (survey.end_date) {
                const endDate = new Date(survey.end_date);
                document.getElementById('surveyEndDate').value = endDate.toISOString().slice(0, 16);
            }
            
            document.getElementById('allowMultipleResponses').checked = survey.allow_multiple_responses || false;
            document.getElementById('allowAnonymous').checked = survey.allow_anonymous || false;
            document.getElementById('showProgressBar').checked = survey.show_progress_bar !== false;
            document.getElementById('showResults').checked = survey.show_results_to_participants || false;
            document.getElementById('welcomeMessage').value = survey.welcome_message || '';
            document.getElementById('thankYouMessage').value = survey.thank_you_message || 'شكراً لمشاركتك';
        }

        async viewResults(surveyId) {
            const statisticsSection = document.querySelector('[data-section="surveys-results-statistics-section"]');
            if (statisticsSection) {
                statisticsSection.click();
                
                setTimeout(() => {
                    const selectSurvey = document.getElementById('selectSurveyForResults');
                    if (selectSurvey) {
                        selectSurvey.value = surveyId;
                        selectSurvey.dispatchEvent(new Event('change'));
                    }
                }, 200);
            }
        }

        async loadResults() {
            const select = document.getElementById('selectSurveyForResults');
            const grid = document.getElementById('surveyResultsGrid');
            
            // تحديث القائمة المنسدلة المخفية للتوافق
            if (select) {
                select.innerHTML = '<option value="">-- اختر استبياناً --</option>';
                allSurveys.forEach(survey => {
                    const option = document.createElement('option');
                    option.value = survey.id;
                    option.textContent = survey.title;
                    select.appendChild(option);
                });

                select.addEventListener('change', (e) => {
                    if (e.target.value) {
                        this.loadSurveyResults(parseInt(e.target.value));
                    }
                });
            }

            // عرض بطاقات الاستبيانات المحسنة
            if (grid) {
                this.renderSurveyResultsGrid(grid);
                this.setupResultsFilters();
            }
        }

        renderSurveyResultsGrid(grid) {
            if (allSurveys.length === 0) {
                grid.innerHTML = `
                    <div class="results-empty-state" style="grid-column: 1 / -1;">
                        <div class="results-empty-icon">
                            <i class="fa-solid fa-clipboard-list"></i>
                        </div>
                        <div class="results-empty-title">لا توجد استبيانات</div>
                        <div class="results-empty-text">لم يتم إنشاء أي استبيانات بعد</div>
                    </div>
                `;
                return;
            }

            grid.innerHTML = allSurveys.map(survey => this.renderSurveyResultCard(survey)).join('');
        }

        renderSurveyResultCard(survey) {
            const statusClass = survey.status === 'active' ? 'active' : 
                               survey.status === 'closed' ? 'closed' : 'draft';
            const statusText = survey.status === 'active' ? 'نشط' : 
                              survey.status === 'closed' ? 'مغلق' : 'مسودة';
            
            const totalResponses = survey.total_responses || 0;
            const completedResponses = survey.completed_responses || totalResponses;
            const completionRate = totalResponses > 0 ? Math.round((completedResponses / totalResponses) * 100) : 0;

            return `
                <div class="survey-selector-card" data-survey-id="${survey.id}" data-status="${survey.status}" data-type="${survey.survey_type || 'general'}" onclick="window.surveysManager.selectSurveyForResults(${survey.id})">
                    <div class="survey-selector-header">
                        <h4 class="survey-selector-title">${this.escapeHtml(survey.title)}</h4>
                        <span class="survey-selector-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="survey-selector-stats">
                        <div class="survey-selector-stat">
                            <i class="fa-solid fa-users"></i>
                            <span class="survey-selector-stat-value">${totalResponses}</span>
                            <span class="survey-selector-stat-label">استجابة</span>
                        </div>
                        <div class="survey-selector-stat">
                            <i class="fa-solid fa-check-circle"></i>
                            <span class="survey-selector-stat-value">${completionRate}%</span>
                            <span class="survey-selector-stat-label">معدل الإكمال</span>
                        </div>
                        <div class="survey-selector-stat">
                            <i class="fa-solid fa-question-circle"></i>
                            <span class="survey-selector-stat-value">${survey.questions_count || 0}</span>
                            <span class="survey-selector-stat-label">سؤال</span>
                        </div>
                    </div>
                    <div class="survey-selector-progress">
                        <div class="survey-selector-progress-bar" style="width: ${completionRate}%;"></div>
                    </div>
                </div>
            `;
        }

        selectSurveyForResults(surveyId) {
            // تحديث حالة البطاقات
            document.querySelectorAll('.survey-selector-card').forEach(card => {
                card.classList.remove('selected');
            });
            const selectedCard = document.querySelector(`.survey-selector-card[data-survey-id="${surveyId}"]`);
            if (selectedCard) {
                selectedCard.classList.add('selected');
            }

            // تحديث القائمة المنسدلة المخفية
            const select = document.getElementById('selectSurveyForResults');
            if (select) {
                select.value = surveyId;
            }

            // تحميل النتائج
            this.loadSurveyResults(surveyId);
        }

        setupResultsFilters() {
            const searchInput = document.getElementById('surveyResultsSearch');
            const statusFilter = document.getElementById('surveyResultsStatusFilter');
            const typeFilter = document.getElementById('surveyResultsTypeFilter');

            const filterCards = () => {
                const searchTerm = searchInput?.value.toLowerCase() || '';
                const statusValue = statusFilter?.value || '';
                const typeValue = typeFilter?.value || '';

                document.querySelectorAll('.survey-selector-card').forEach(card => {
                    const title = card.querySelector('.survey-selector-title')?.textContent.toLowerCase() || '';
                    const status = card.dataset.status || '';
                    const type = card.dataset.type || '';

                    const matchesSearch = title.includes(searchTerm);
                    const matchesStatus = !statusValue || status === statusValue;
                    const matchesType = !typeValue || type === typeValue;

                    card.style.display = matchesSearch && matchesStatus && matchesType ? '' : 'none';
                });
            };

            searchInput?.addEventListener('input', filterCards);
            statusFilter?.addEventListener('change', filterCards);
            typeFilter?.addEventListener('change', filterCards);
        }

        async loadSurveyResults(surveyId) {
            if (window.surveysResultsEnhanced) {
                await window.surveysResultsEnhanced.loadSurveyResults(surveyId);
            }
        }

        renderResults(survey, questions, responses) {
            const container = document.getElementById('surveyResultsContainer');
            const completedResponses = responses.filter(r => r.status === 'completed');
            const completionRate = responses.length > 0 
                ? Math.round((completedResponses.length / responses.length) * 100) 
                : 0;

            container.innerHTML = `
                <div class="results-overview">
                    <div class="stats-grid">
                        <div class="stat-card" style="--stat-color: #3d8fd6">
                            <div class="stat-card-wrapper">
                                <div class="stat-icon">
                                    <i class="fa-solid fa-users"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-value">${responses.length}</div>
                                    <div class="stat-label">إجمالي الاستجابات</div>
                                </div>
                            </div>
                        </div>
                        <div class="stat-card" style="--stat-color: #10b981">
                            <div class="stat-badge"><i class="fa-solid fa-check"></i> ${completionRate}%</div>
                            <div class="stat-card-wrapper">
                                <div class="stat-icon">
                                    <i class="fa-solid fa-check-circle"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-value">${completedResponses.length}</div>
                                    <div class="stat-label">استجابات مكتملة</div>
                                </div>
                            </div>
                        </div>
                        <div class="stat-card" style="--stat-color: #8b5cf6">
                            <div class="stat-card-wrapper">
                                <div class="stat-icon">
                                    <i class="fa-solid fa-percentage"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-value">${completionRate}%</div>
                                    <div class="stat-label">معدل الإكمال</div>
                                </div>
                            </div>
                        </div>
                        <div class="stat-card" style="--stat-color: #14b8a6">
                            <div class="stat-card-wrapper">
                                <div class="stat-icon">
                                    <i class="fa-solid fa-eye"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-value">${survey.total_views || 0}</div>
                                    <div class="stat-label">المشاهدات</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="results-questions">
                    ${questions.map(q => this.renderQuestionResults(q, responses)).join('')}
                </div>
            `;
        }

        renderQuestionResults(question, responses) {
            const answers = responses.flatMap(r => 
                r.survey_answers.filter(a => a.question_id === question.id)
            );

            return `
                <div class="card">
                    <div class="card-header">
                        <h3>${this.escapeHtml(question.question_text)}</h3>
                        <span class="badge">${answers.length} إجابة</span>
                    </div>
                    <div class="card-body">
                        ${this.renderAnswersSummary(question, answers)}
                    </div>
                </div>
            `;
        }

        renderAnswersSummary(question, answers) {
            if (answers.length === 0) {
                return '<p class="text-muted">لا توجد إجابات بعد</p>';
            }

            if (['single_choice', 'multiple_choice', 'dropdown'].includes(question.question_type)) {
                return this.renderChoiceResults(answers);
            }

            if (['linear_scale', 'rating_stars', 'slider', 'number'].includes(question.question_type)) {
                return this.renderNumericResults(answers);
            }

            return this.renderTextResults(answers);
        }

        renderChoiceResults(answers) {
            const counts = {};
            answers.forEach(a => {
                const choices = Array.isArray(a.answer_json) ? a.answer_json : [a.answer_json];
                choices.forEach(choice => {
                    counts[choice] = (counts[choice] || 0) + 1;
                });
            });

            const total = answers.length;
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

            return `
                <div class="choice-results">
                    ${sorted.map(([choice, count]) => {
                        const percentage = Math.round((count / total) * 100);
                        return `
                            <div class="choice-result-item">
                                <div class="choice-label">${this.escapeHtml(choice)}</div>
                                <div class="choice-bar">
                                    <div class="choice-bar-fill"></div>
                                </div>
                                <div class="choice-stats">
                                    <span>${count} (${percentage}%)</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        renderNumericResults(answers) {
            const numbers = answers.map(a => parseFloat(a.answer_number)).filter(n => !isNaN(n));
            if (numbers.length === 0) return '<p class="text-muted">لا توجد إجابات رقمية</p>';

            const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
            const min = Math.min(...numbers);
            const max = Math.max(...numbers);

            return `
                <div class="numeric-results">
                    <div class="stat-item">
                        <span class="stat-label">المتوسط:</span>
                        <span class="stat-value">${avg.toFixed(2)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">الحد الأدنى:</span>
                        <span class="stat-value">${min}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">الحد الأقصى:</span>
                        <span class="stat-value">${max}</span>
                    </div>
                </div>
            `;
        }

        renderTextResults(answers) {
            return `
                <div class="text-results">
                    ${answers.slice(0, 10).map(a => `
                        <div class="text-answer">
                            ${this.escapeHtml(a.answer_text || 'لا توجد إجابة')}
                        </div>
                    `).join('')}
                    ${answers.length > 10 ? `<p class="text-muted">وعرض ${answers.length - 10} إجابات أخرى...</p>` : ''}
                </div>
            `;
        }

        async shareSurvey(surveyId) {
            const surveyUrl = `${window.location.origin}/surveys/survey.html?id=${surveyId}`;
            
            if (navigator.clipboard) {
                try {
                    await navigator.clipboard.writeText(surveyUrl);
                    this.showSuccess('تم نسخ رابط الاستبيان');
                } catch (err) {
                    this.showShareDialog(surveyUrl);
                }
            } else {
                this.showShareDialog(surveyUrl);
            }
        }

        showShareDialog(url) {
            alert(`رابط الاستبيان:\n${url}`);
        }

        async loadTemplates() {
            this.showInfo('قريباً: نظام القوالب الجاهزة');
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        showSuccess(message) {
            this.showNotification(message, 'success');
        }

        showError(message) {
            this.showNotification(message, 'error');
        }

        showInfo(message) {
            this.showNotification(message, 'info');
        }

        showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            `;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.classList.add('show');
            }, 10);

            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        async loadSurveyResponses(surveyId) {
            try {
                const { data: responses, error } = await sb
                    .from('survey_responses')
                    .select(`
                        *,
                        user:profiles(full_name, email)
                    `)
                    .eq('survey_id', surveyId)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const container = document.getElementById('surveyResponsesContainer');
                if (!container) return;

                if (!responses || responses.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="fa-solid fa-inbox"></i>
                            <p>لا توجد استجابات لهذا الاستبيان بعد</p>
                        </div>
                    `;
                    return;
                }

                let html = '<div class="responses-list">';
                responses.forEach((response, index) => {
                    const submittedDate = new Date(response.created_at).toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    html += `
                        <div class="card mb-1rem">
                            <div class="card-header">
                                <h3>استجابة #${index + 1}</h3>
                                <div>
                                    <span class="badge badge-info">${response.user?.full_name || 'مستخدم'}</span>
                                    <span class="badge">${submittedDate}</span>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="response-data">
                                    ${this.renderResponseData(response.response_data)}
                                </div>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';

                container.innerHTML = html;
            } catch (error) {
                console.error('Error loading survey responses:', error);
            }
        }

        renderResponseData(responseData) {
            if (!responseData || typeof responseData !== 'object') {
                return '<p>لا توجد بيانات</p>';
            }

            let html = '<div class="response-items">';
            Object.entries(responseData).forEach(([questionId, answer]) => {
                html += `
                    <div class="response-item">
                        <div class="response-question">
                            <strong>السؤال ${questionId}:</strong>
                        </div>
                        <div class="response-answer">
                            ${this.formatAnswer(answer)}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            return html;
        }

        formatAnswer(answer) {
            if (Array.isArray(answer)) {
                return answer.join(', ');
            }
            if (typeof answer === 'object') {
                return JSON.stringify(answer, null, 2);
            }
            return answer || 'لا توجد إجابة';
        }
    }

    window.surveysManager = new SurveysManager();
})();
