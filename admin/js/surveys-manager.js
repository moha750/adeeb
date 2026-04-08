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
                { value: 'short_text', label: 'نص قصير', icon: 'font' },
                { value: 'long_text', label: 'نص طويل', icon: 'align-left' },
                { value: 'single_choice', label: 'اختيار واحد', icon: 'circle-dot' },
                { value: 'multiple_choice', label: 'اختيارات متعددة', icon: 'square-check' },
                { value: 'dropdown', label: 'قائمة منسدلة', icon: 'caret-down' },
                { value: 'linear_scale', label: 'مقياس خطي', icon: 'sliders' },
                { value: 'rating_stars', label: 'تقييم بالنجوم', icon: 'star' },
                { value: 'number', label: 'رقم', icon: 'hashtag' },
                { value: 'email', label: 'بريد إلكتروني', icon: 'envelope' },
                { value: 'phone', label: 'رقم هاتف', icon: 'phone' },
                { value: 'url', label: 'رابط', icon: 'link' },
                { value: 'date', label: 'تاريخ', icon: 'calendar' },
                { value: 'time', label: 'وقت', icon: 'clock' },
                { value: 'datetime', label: 'تاريخ ووقت', icon: 'calendar-plus' },
                { value: 'file_upload', label: 'رفع ملف', icon: 'upload' },
                { value: 'slider', label: 'شريط منزلق', icon: 'sliders-h' },
                { value: 'yes_no', label: 'نعم/لا', icon: 'toggle-on' }
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

            // زر إضافة سؤال (ثابت في HTML)
            const addQuestionBtn = document.getElementById('addQuestionBtn');
            if (addQuestionBtn) {
                addQuestionBtn.addEventListener('click', () => this.addQuestion());
            }

            this.setupSaveButtons();
        }

        setupSaveButtons() {
            const saveDraftBtn = document.getElementById('saveSurveyDraftBtn');
            if (saveDraftBtn) {
                saveDraftBtn.replaceWith(saveDraftBtn.cloneNode(true));
                document.getElementById('saveSurveyDraftBtn')
                    .addEventListener('click', () => this.saveSurvey('draft'));
            }

            const publishBtn = document.getElementById('publishSurveyBtn');
            if (publishBtn) {
                publishBtn.replaceWith(publishBtn.cloneNode(true));
                document.getElementById('publishSurveyBtn')
                    .addEventListener('click', () => this.saveSurvey('active'));
            }
        }

        async loadAllSurveys() {
            try {
                const { data, error } = await sb
                    .from('surveys')
                    .select(`
                        *,
                        created_by_profile:profiles!surveys_created_by_fkey(full_name),
                        committee:committees(committee_name_ar),
                        survey_questions(id)
                    `)
                    .eq('is_archived', false)
                    .eq('is_deleted', false)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // إضافة عدد الأسئلة والإحصائيات لكل استبيان
                const surveysWithStats = await Promise.all((data || []).map(async survey => {
                    // جلب إحصائيات الاستجابات
                    const { data: responses, error: responsesError } = await sb
                        .from('survey_responses')
                        .select('id, status')
                        .eq('survey_id', survey.id);
                    
                    if (responsesError) {
                        console.error('Error loading responses for survey:', survey.id, responsesError);
                    }
                    
                    const totalResponses = responses?.length || 0;
                    const totalCompleted = responses?.filter(r => r.status === 'completed').length || 0;
                    const totalViews = totalResponses; // كل من بدأ الاستبيان
                    
                    return {
                        ...survey,
                        questions_count: survey.survey_questions?.length || 0,
                        total_responses: totalResponses,
                        total_completed: totalCompleted,
                        total_views: totalViews
                    };
                }));
                
                allSurveys = surveysWithStats;
                await this.updateStatistics();
                this.renderSurveysList();
            } catch (error) {
                console.error('Error loading surveys:', error);
                this.showError('حدث خطأ أثناء تحميل الاستبيانات');
            }
        }

        async updateStatistics() {
            const total = allSurveys.length;
            const active = allSurveys.filter(s => this.getActualStatus(s) === 'active').length;
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

            const filtered = allSurveys.filter(survey => {
                const matchesSearch = survey.title.toLowerCase().includes(searchTerm) ||
                                    (survey.description || '').toLowerCase().includes(searchTerm);
                const matchesStatus = !statusFilter || survey.status === statusFilter;

                return matchesSearch && matchesStatus;
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

            // فصل الاستبيانات حسب الحالة الفعلية
            const now = new Date();
            const activeSurveys = [];
            const scheduledSurveys = [];
            const pausedSurveys = [];
            const endedSurveys = [];
            const draftSurveys = [];

            surveys.forEach(survey => {
                const actualStatus = this.getActualStatus(survey);
                if (actualStatus === 'draft') {
                    draftSurveys.push(survey);
                } else if (actualStatus === 'active') {
                    activeSurveys.push(survey);
                } else if (actualStatus === 'scheduled') {
                    scheduledSurveys.push(survey);
                } else if (actualStatus === 'paused') {
                    pausedSurveys.push(survey);
                } else {
                    endedSurveys.push(survey);
                }
            });

            let html = '';

            // قسم الاستبيانات النشطة
            if (activeSurveys.length > 0) {
                html += `
                    <div class="surveys-section">
                        <div class="card card--success">
                            <div class="card-header">
                                <h3><i class="fa-solid fa-circle-play survey-icon--active"></i> الاستبيانات النشطة (${activeSurveys.length})</h3>
                            </div>
                            <div class="card-body">
                                <div class="uc-grid">
                                    ${activeSurveys.map(survey => this.renderSurveyCard(survey)).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            // قسم الاستبيانات المجدولة
            if (scheduledSurveys.length > 0) {
                html += `
                    <div class="surveys-section">
                        <div class="card card--info">
                            <div class="card-header">
                                <h3><i class="fa-solid fa-calendar-days survey-icon--scheduled"></i> الاستبيانات المجدولة (${scheduledSurveys.length})</h3>
                            </div>
                            <div class="card-body">
                                <div class="uc-grid">
                                    ${scheduledSurveys.map(survey => this.renderSurveyCard(survey)).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            // قسم الاستبيانات المتوقفة
            if (pausedSurveys.length > 0) {
                html += `
                    <div class="surveys-section">
                        <div class="card card--warning">
                            <div class="card-header">
                                <h3><i class="fa-solid fa-circle-pause"></i> الاستبيانات المتوقفة (${pausedSurveys.length})</h3>
                            </div>
                            <div class="card-body">
                                <div class="uc-grid">
                                    ${pausedSurveys.map(survey => this.renderSurveyCard(survey)).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            // قسم المسودات
            if (draftSurveys.length > 0) {
                html += `
                    <div class="surveys-section">
                        <div class="card card--neutral">
                            <div class="card-header">
                                <h3><i class="fa-solid fa-file-pen survey-icon--draft"></i> المسودات (${draftSurveys.length})</h3>
                            </div>
                            <div class="card-body">
                                <div class="uc-grid">
                                    ${draftSurveys.map(survey => this.renderSurveyCard(survey)).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            // قسم الاستبيانات المنتهية
            if (endedSurveys.length > 0) {
                html += `
                    <div class="surveys-section surveys-section-ended">
                        <div class="card card--danger">
                            <div class="card-header">
                                <h3><i class="fa-solid fa-circle-stop survey-icon--ended"></i> الاستبيانات المنتهية (${endedSurveys.length})</h3>
                            </div>
                            <div class="card-body">
                                <div class="uc-grid">
                                    ${endedSurveys.map(survey => this.renderSurveyCard(survey)).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            container.innerHTML = html;
        }

        getActualStatus(survey) {
            let actualStatus = survey.status;
            const now = new Date();
            
            if (survey.status === 'paused' && !survey.start_date) {
                return 'paused';
            }
            
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
                        actualStatus = 'scheduled';
                    }
                }
            }
            return actualStatus;
        }

        renderSurveyCard(survey) {
            // التحقق من حالة الاستبيان بناءً على التاريخ
            const actualStatus = this.getActualStatus(survey);

            const statusColors = {
                draft: '#6b7280',
                active: '#10b981',
                paused: '#f59e0b',
                scheduled: '#3b82f6',
                closed: '#ef4444',
                archived: '#64748b'
            };

            const statusLabels = {
                draft: 'مسودة',
                active: 'نشط',
                paused: 'متوقف',
                scheduled: 'مجدول',
                closed: 'منتهية',
                archived: 'مؤرشف'
            };

            const statusIcons = {
                draft:     'fa-file-pen',
                active:    'fa-circle-play',
                paused:    'fa-circle-pause',
                scheduled: 'fa-calendar-days',
                closed:    'fa-circle-stop',
                archived:  'fa-box-archive'
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

            const completionRate = (survey.total_views || 0) > 0 
                ? Math.round(((survey.total_completed || 0) / survey.total_views) * 100) 
                : 0;

            const statusBadgeClass = {
                draft: 'badge-secondary',
                active: 'badge-success',
                paused: 'badge-secondary',
                scheduled: 'badge-info',
                closed: 'badge-secondary',
                archived: 'badge-secondary'
            };

            const statusHeaderClass = {
                draft:     'uc-card__header--neutral',
                active:    'uc-card__header--success',
                paused:    'uc-card__header--warning',
                scheduled: 'uc-card__header--info',
                closed:    'uc-card__header--danger',
                archived:  'uc-card__header--danger'
            };

            const statusCardClass = {
                draft:     'uc-card--neutral',
                active:    'uc-card--success',
                paused:    'uc-card--warning',
                scheduled: 'uc-card--info',
                closed:    'uc-card--danger',
                archived:  'uc-card--danger'
            };

            const surveyUrl = `${window.location.origin}/surveys/survey.html?id=${survey.id}`;

            return `
                <div class="uc-card ${statusCardClass[actualStatus] || ''}" data-survey-id="${survey.id}">
                    <div class="uc-card__header ${statusHeaderClass[actualStatus] || ''}">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon">
                                <i class="fa-solid fa-clipboard-list"></i>
                            </div>
                            <div class="uc-card__header-info">
                                <h3 class="uc-card__title">${this.escapeHtml(survey.title)}</h3>
                                <span class="uc-card__badge">
                                    <i class="fa-solid ${statusIcons[actualStatus] || 'fa-circle-dot'}"></i>
                                    ${statusLabels[actualStatus]}
                                </span>
                                ${actualStatus === 'active' && survey.start_date ? `
                                <span class="uc-card__badge">
                                    <i class="fa-solid fa-calendar-check"></i>
                                    مجدول
                                </span>` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="uc-card__body">
                        ${survey.description ? `
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-align-left"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">الوصف</span>
                                <span class="uc-card__info-value">${this.escapeHtml(survey.description)}</span>
                            </div>
                        </div>` : ''}

                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-calendar"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">تاريخ الإنشاء</span>
                                <span class="uc-card__info-value">${this.formatDate(survey.created_at)}</span>
                            </div>
                        </div>
                        ${survey.start_date ? `
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-calendar-plus"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">تاريخ البدء</span>
                                    <span class="uc-card__info-value">${this.formatDate(survey.start_date)}</span>
                                </div>
                            </div>
                        ` : ''}
                        ${survey.end_date ? `
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-calendar-xmark"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">تاريخ الانتهاء</span>
                                    <span class="uc-card__info-value">${this.formatDate(survey.end_date)}</span>
                                </div>
                            </div>
                        ` : ''}
                        ${survey.created_by_profile ? `
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-user"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">المنشئ</span>
                                    <span class="uc-card__info-value">${this.escapeHtml(survey.created_by_profile.full_name)}</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="uc-card__footer">
                        ${actualStatus === 'active' ? `
                        <button class="btn btn-primary btn-sm" onclick="window.surveysManager.previewSurvey(${survey.id})">
                            <i class="fa-solid fa-eye"></i> معاينة
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="window.surveysManager.copySurveyLink(${survey.id})">
                            <i class="fa-solid fa-copy"></i> نسخ الرابط
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="window.surveysManager.viewResults(${survey.id})">
                            <i class="fa-solid fa-chart-bar"></i> النتائج
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="window.surveysManager.pauseSurvey(${survey.id})">
                            <i class="fa-solid fa-pause-circle"></i> إيقاف
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="window.surveysManager.endSurvey(${survey.id})">
                            <i class="fa-solid fa-stop-circle"></i> إنهاء
                        </button>
                        ` : ''}
                        ${actualStatus === 'scheduled' ? `
                        <button class="btn btn-primary btn-sm" onclick="window.surveysManager.previewSurvey(${survey.id})">
                            <i class="fa-solid fa-eye"></i> معاينة
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="window.surveysManager.copySurveyLink(${survey.id})">
                            <i class="fa-solid fa-copy"></i> نسخ الرابط
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="window.surveysManager.endSurvey(${survey.id})">
                            <i class="fa-solid fa-stop-circle"></i> إنهاء
                        </button>
                        ` : ''}
                        ${actualStatus === 'paused' ? `
                        <button class="btn btn-primary btn-sm" onclick="window.surveysManager.previewSurvey(${survey.id})">
                            <i class="fa-solid fa-eye"></i> معاينة
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="window.surveysManager.copySurveyLink(${survey.id})">
                            <i class="fa-solid fa-copy"></i> نسخ الرابط
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="window.surveysManager.viewResults(${survey.id})">
                            <i class="fa-solid fa-chart-bar"></i> النتائج
                        </button>
                        <button class="btn btn-success btn-sm" onclick="window.surveysManager.enableSurvey(${survey.id})">
                            <i class="fa-solid fa-play-circle"></i> تفعيل
                        </button>
                        ` : ''}
                        ${actualStatus === 'closed' ? `
                        <button class="btn btn-primary btn-sm" onclick="window.surveysManager.viewResults(${survey.id})">
                            <i class="fa-solid fa-chart-bar"></i> النتائج
                        </button>
                        <button class="btn btn-slate" onclick="window.surveysManager.archiveSurvey(${survey.id})">
                            <i class="fa-solid fa-box-archive"></i> أرشفة
                        </button>
                        ` : ''}
                        <button class="btn btn-danger btn-sm" onclick="window.surveysManager.deleteSurvey(${survey.id})">
                            <i class="fa-solid fa-trash"></i> حذف
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
            this._resetCreateForm();
            this.renderQuestions();
            this.setupSaveButtons();

            // إعادة ربط زر إضافة سؤال في حال تجديد الصفحة
            const addBtn = document.getElementById('addQuestionBtn');
            if (addBtn) {
                const fresh = addBtn.cloneNode(true);
                addBtn.replaceWith(fresh);
                fresh.addEventListener('click', () => this.addQuestion());
            }
        }

        _resetCreateForm() {
            const textFields = {
                surveyTitle: '',
                surveyDescription: '',
                surveyStartDate: '',
                surveyEndDate: '',
                welcomeMessage: '',
                thankYouMessage: 'شكراً لمشاركتك في هذا الاستبيان'
            };
            Object.entries(textFields).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el) el.value = val;
            });

            const accessType = document.getElementById('surveyAccessType');
            if (accessType) accessType.value = 'public';

            const checkboxDefaults = {
                allowMultipleResponses: false,
                allowAnonymous: false,
                showProgressBar: true,
                showResults: false
            };
            Object.entries(checkboxDefaults).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el) el.checked = val;
            });
        }

        // احتفظنا بالاسم القديم للتوافق مع أي استدعاء خارجي
        renderSurveyBuilder() {
            this._resetCreateForm();
            this.renderQuestions();
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
            // تمرير إلى آخر سؤال
            setTimeout(() => {
                const container = document.getElementById('questionsContainer');
                if (container) {
                    const last = container.lastElementChild;
                    if (last) last.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 50);
        }

        renderQuestions() {
            const container = document.getElementById('questionsContainer');
            if (!container) return;

            if (surveyQuestions.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2.5rem 1rem;">
                        <div style="width: 56px; height: 56px; border-radius: 16px; background: rgba(61,143,214,0.08); border: 1px solid rgba(61,143,214,0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; font-size: 1.4rem; color: #3d8fd6;">
                            <i class="fa-solid fa-list-check"></i>
                        </div>
                        <p style="font-size: 0.92rem; font-weight: 600; color: #64748b; margin: 0 0 0.3rem;">لم تُضَف أي أسئلة بعد</p>
                        <p style="font-size: 0.8rem; color: #94a3b8; margin: 0;">انقر على "إضافة سؤال" لبدء بناء استبيانك</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = surveyQuestions
                .map((q, i) => this.renderQuestionEditor(q, i))
                .join('');
        }

        renderQuestionEditor(question, index) {
            const isFirst = index === 0;
            const isLast  = index === surveyQuestions.length - 1;
            const qType   = this.questionTypes.find(t => t.value === question.question_type);

            return `
                <div class="form-section" data-question-index="${index}" style="margin-bottom: 0.8rem;">

                    <!-- رأس السؤال -->
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 0.6rem;">
                            <div style="width: 26px; height: 26px; border-radius: 8px; background: linear-gradient(135deg, #3d8fd6, #274060); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; flex-shrink: 0;">
                                ${index + 1}
                            </div>
                            <span class="form-section-label">
                                <i class="fa-solid fa-${qType?.icon || 'question'}"></i>
                                ${qType?.label || 'سؤال'}
                            </span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0;">
                            <button class="btn btn-icon btn-sm btn-slate" type="button"
                                onclick="window.surveysManager.moveQuestion(${index}, -1)"
                                ${isFirst ? 'disabled' : ''} title="تحريك للأعلى">
                                <i class="fa-solid fa-arrow-up"></i>
                            </button>
                            <button class="btn btn-icon btn-sm btn-slate" type="button"
                                onclick="window.surveysManager.moveQuestion(${index}, 1)"
                                ${isLast ? 'disabled' : ''} title="تحريك للأسفل">
                                <i class="fa-solid fa-arrow-down"></i>
                            </button>
                            <button class="btn btn-icon btn-sm btn-primary" type="button"
                                onclick="window.surveysManager.duplicateQuestion(${index})" title="نسخ">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                            <button class="btn btn-icon btn-sm btn-danger" type="button"
                                onclick="window.surveysManager.deleteQuestion(${index})" title="حذف">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>

                    <!-- نص السؤال -->
                    <div class="form-group">
                        <label class="form-label">
                            نص السؤال
                            <span class="required-dot"></span>
                        </label>
                        <input type="text" class="form-input"
                            value="${this.escapeHtml(question.question_text)}"
                            oninput="window.surveysManager.updateQuestion(${index}, 'question_text', this.value)"
                            placeholder="أدخل نص السؤال هنا" />
                    </div>

                    <!-- نوع السؤال + إجباري -->
                    <div style="display:flex; align-items:flex-end; gap:0.75rem;">
                        <div class="form-group" style="flex:1; margin-bottom:0;">
                            <label class="form-label">نوع السؤال</label>
                            <select class="form-select"
                                onchange="window.surveysManager.updateQuestion(${index}, 'question_type', this.value)">
                                ${this.questionTypes.map(t => `
                                    <option value="${t.value}" ${question.question_type === t.value ? 'selected' : ''}>
                                        ${t.label}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div style="flex-shrink:0;">
                            <label class="req-toggle">
                                <input type="checkbox" ${question.is_required ? 'checked' : ''}
                                    onchange="window.surveysManager.updateQuestion(${index}, 'is_required', this.checked)" />
                                <span class="req-toggle-pill">
                                    <span class="req-toggle-dot"></span>
                                    <span>إجباري</span>
                                </span>
                            </label>
                        </div>
                    </div>

                    ${this.renderQuestionOptions(question, index)}
                </div>
            `;
        }

        renderQuestionOptions(question, index) {
            const needsOptions = ['single_choice', 'multiple_choice', 'dropdown'].includes(question.question_type);
            const needsScale   = ['linear_scale', 'rating_stars', 'rating_hearts', 'rating_emojis', 'slider'].includes(question.question_type);

            if (needsOptions) {
                const choices = question.options?.choices || ['', ''];
                return `
                    <div class="form-group">
                        <label class="form-label">الخيارات</label>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.6rem;">
                            ${choices.map((opt, oi) => `
                                <div class="form-addon-group">
                                    <span class="form-addon form-addon-start" style="min-width: 2.4rem; justify-content: center; font-size: 0.78rem;">
                                        ${oi + 1}
                                    </span>
                                    <input type="text" class="form-input"
                                        value="${this.escapeHtml(opt)}"
                                        oninput="window.surveysManager.updateOption(${index}, ${oi}, this.value)"
                                        placeholder="خيار ${oi + 1}" />
                                    <button class="form-addon-btn" type="button"
                                        onclick="window.surveysManager.removeOption(${index}, ${oi})"
                                        ${choices.length <= 2 ? 'disabled style="opacity:0.45;cursor:not-allowed;"' : ''}>
                                        <i class="fa-solid fa-times"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn btn-primary" type="button"
                            onclick="window.surveysManager.addOption(${index})">
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
                            <label class="form-label">الحد الأدنى</label>
                            <input type="number" class="form-input" value="${scale.min}"
                                onchange="window.surveysManager.updateScale(${index}, 'min', this.value)" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">الحد الأقصى</label>
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

        async deleteQuestion(index) {
            const confirmed = await ModalHelper.confirm({
                title: 'حذف السؤال',
                message: 'هل أنت متأكد من حذف هذا السؤال؟',
                type: 'danger',
                confirmText: 'نعم، احذف',
                cancelText: 'إلغاء'
            });
            
            if (confirmed) {
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

                // تحويل التاريخ المحلي إلى ISO مع الحفاظ على التوقيت المحلي
                const convertLocalDateToISO = (dateValue) => {
                    if (!dateValue) return null;
                    // datetime-local يعطي قيمة مثل "2024-01-15T15:00"
                    // نضيف الثواني ونحولها إلى Date object ثم إلى ISO
                    const localDate = new Date(dateValue + ':00');
                    return localDate.toISOString();
                };

                const surveyData = {
                    title,
                    description: document.getElementById('surveyDescription')?.value || null,
                    survey_type: 'general',
                    access_type: document.getElementById('surveyAccessType')?.value || 'public',
                    status,
                    allow_multiple_responses: document.getElementById('allowMultipleResponses')?.checked || false,
                    allow_anonymous: document.getElementById('allowAnonymous')?.checked || false,
                    show_progress_bar: document.getElementById('showProgressBar')?.checked || true,
                    show_results_to_participants: document.getElementById('showResults')?.checked || false,
                    start_date: convertLocalDateToISO(document.getElementById('surveyStartDate')?.value),
                    end_date: convertLocalDateToISO(document.getElementById('surveyEndDate')?.value),
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



        async deleteSurveyPermanently(surveyId) {
            const confirmed = await ModalHelper.confirm({
                title: 'حذف نهائي',
                message: 'هل أنت متأكد من حذف هذا الاستبيان نهائياً؟ سيتم حذف جميع الأسئلة والإجابات والبيانات المرتبطة به ولا يمكن التراجع عن هذا الإجراء.',
                type: 'danger',
                confirmText: 'نعم، احذف نهائياً',
                cancelText: 'إلغاء'
            });

            if (!confirmed) return;

            try {
                // حذف الإجابات أولاً
                const { error: answersError } = await sb
                    .from('survey_answers')
                    .delete()
                    .in('response_id', 
                        (await sb.from('survey_responses').select('id').eq('survey_id', surveyId)).data?.map(r => r.id) || []
                    );

                // حذف الاستجابات
                const { error: responsesError } = await sb
                    .from('survey_responses')
                    .delete()
                    .eq('survey_id', surveyId);

                // حذف الأسئلة
                const { error: questionsError } = await sb
                    .from('survey_questions')
                    .delete()
                    .eq('survey_id', surveyId);

                // حذف الاستبيان
                const { error } = await sb
                    .from('surveys')
                    .delete()
                    .eq('id', surveyId);

                if (error) throw error;

                this.showSuccess('تم حذف الاستبيان وجميع بياناته نهائياً');
                await this.loadAllSurveys();

            } catch (error) {
                console.error('Error permanently deleting survey:', error);
                this.showError('حدث خطأ أثناء حذف الاستبيان');
            }
        }


        async endSurvey(surveyId) {
            const survey = allSurveys.find(s => s.id === surveyId);
            if (!survey) return;

            const confirmed = await ModalHelper.confirm({
                title: 'إنهاء الاستبيان',
                message: `هل أنت متأكد من إنهاء الاستبيان "${this.escapeHtml(survey.title)}" نهائياً؟ لن يتمكن أي شخص من الإجابة عليه بعد ذلك.`,
                type: 'danger',
                confirmText: 'نعم، أنهِ الاستبيان',
                cancelText: 'إلغاء'
            });

            if (!confirmed) return;

            try {
                const { error } = await sb
                    .from('surveys')
                    .update({ 
                        status: 'closed',
                        end_date: new Date().toISOString()
                    })
                    .eq('id', surveyId);

                if (error) throw error;

                this.showSuccess('تم إنهاء الاستبيان بنجاح');
                await this.loadAllSurveys();

            } catch (error) {
                console.error('Error ending survey:', error);
                this.showError('حدث خطأ أثناء إنهاء الاستبيان');
            }
        }

        async pauseSurvey(surveyId) {
            const confirmed = await ModalHelper.confirm({
                title: 'إيقاف الاستبيان',
                message: 'هل أنت متأكد من إيقاف هذا الاستبيان؟ لن يتمكن المستخدمون من الوصول إليه حتى يتم تفعيله مرة أخرى.',
                type: 'warning',
                confirmText: 'نعم، أوقف',
                cancelText: 'إلغاء'
            });

            if (!confirmed) return;

            try {
                const { error } = await sb
                    .from('surveys')
                    .update({ status: 'paused' })
                    .eq('id', surveyId);

                if (error) throw error;

                this.showSuccess('تم إيقاف الاستبيان بنجاح');
                await this.loadAllSurveys();

            } catch (error) {
                console.error('Error pausing survey:', error);
                this.showError('حدث خطأ أثناء إيقاف الاستبيان');
            }
        }

        async enableSurvey(surveyId) {
            try {
                const { error } = await sb
                    .from('surveys')
                    .update({ status: 'active' })
                    .eq('id', surveyId);

                if (error) throw error;

                this.showSuccess('تم تفعيل الاستبيان بنجاح');
                await this.loadAllSurveys();

            } catch (error) {
                console.error('Error enabling survey:', error);
                this.showError('حدث خطأ أثناء تفعيل الاستبيان');
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



        populateSurveyForm(survey) {
            document.getElementById('surveyTitle').value = survey.title || '';
            document.getElementById('surveyDescription').value = survey.description || '';
            
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
            // الطريق الوحيد للوصول لتحليلات الاستبيانات: يفتح تحليلات الاستبيان المحدد مباشرة.
            // نضع surveyId معلّقًا قبل التنقّل حتى يفتحه init() مباشرة دون المرور بأي شاشة قائمة.
            if (window.resultsAnalytics) {
                window.resultsAnalytics.pendingSurveyId = surveyId;
            }
            if (typeof window.navigateToSection === 'function') {
                window.navigateToSection('surveys-results-section');
            }
        }

        async exportSurveyToExcel(surveyId) {
            if (window.resultsAnalytics) {
                await window.resultsAnalytics.loadSurveyAnalytics(surveyId);
                setTimeout(() => window.resultsAnalytics.openExportModal(), 600);
            }
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
            if (!dateString) return 'غير محدد';
            const date = new Date(dateString);
            return date.toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        showSuccess(message) {
            if (window.Toast) {
                window.Toast.success(message);
            } else {
                this.showNotification(message, 'success');
            }
        }

        showError(message) {
            if (window.Toast) {
                window.Toast.error(message);
            } else {
                this.showNotification(message, 'error');
            }
        }

        showInfo(message) {
            if (window.Toast) {
                window.Toast.info(message);
            } else {
                this.showNotification(message, 'info');
            }
        }

        showNotification(message, type = 'info') {
            if (window.Toast) {
                if (type === 'success') window.Toast.success(message);
                else if (type === 'error') window.Toast.error(message);
                else window.Toast.info(message);
                return;
            }

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

        async archiveSurvey(surveyId) {
            const result = await Swal.fire({
                title: 'أرشفة الاستبيان',
                text: 'هل أنت متأكد من أرشفة هذا الاستبيان؟ سيتم نقله إلى قسم الأرشيف.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'نعم، أرشف',
                cancelButtonText: 'إلغاء',
                confirmButtonColor: '#3b82f6'
            });

            if (!result.isConfirmed) return;

            try {
                const { error } = await sb
                    .from('surveys')
                    .update({
                        is_archived: true,
                        archived_at: new Date().toISOString(),
                        archived_by: currentUser.id
                    })
                    .eq('id', surveyId);

                if (error) throw error;

                this.showSuccess('تم أرشفة الاستبيان بنجاح');
                await this.loadAllSurveys();
            } catch (error) {
                console.error('Error archiving survey:', error);
                this.showError('حدث خطأ أثناء أرشفة الاستبيان');
            }
        }

        async deleteSurvey(surveyId) {
            const result = await Swal.fire({
                title: 'حذف الاستبيان',
                text: 'هل أنت متأكد من حذف هذا الاستبيان؟ سيتم نقله إلى الاستبيانات المحذوفة ويُحذف نهائياً بعد 30 يوماً.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'نعم، احذف',
                cancelButtonText: 'إلغاء',
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#94a3b8'
            });

            if (!result.isConfirmed) return;

            try {
                const { error } = await sb
                    .from('surveys')
                    .update({
                        is_deleted: true,
                        deleted_at: new Date().toISOString(),
                        deleted_by: currentUser.id
                    })
                    .eq('id', surveyId);

                if (error) throw error;

                this.showSuccess('تم نقل الاستبيان إلى المحذوفة');
                await this.loadAllSurveys();
            } catch (error) {
                console.error('Error deleting survey:', error);
                this.showError('حدث خطأ أثناء حذف الاستبيان');
            }
        }

        async loadArchivedSurveys() {
            try {
                const { data, error } = await sb
                    .from('surveys')
                    .select(`
                        *,
                        created_by_profile:profiles!surveys_created_by_fkey(full_name),
                        archived_by_profile:profiles!surveys_archived_by_fkey(full_name),
                        committee:committees(committee_name_ar),
                        survey_questions(id)
                    `)
                    .eq('is_archived', true)
                    .eq('is_deleted', false)
                    .order('archived_at', { ascending: false });

                if (error) throw error;
                return data || [];
            } catch (error) {
                console.error('Error loading archived surveys:', error);
                this.showError('حدث خطأ أثناء تحميل الاستبيانات المؤرشفة');
                return [];
            }
        }

        async loadDeletedSurveys() {
            try {
                const { data, error } = await sb
                    .from('surveys')
                    .select(`
                        *,
                        created_by_profile:profiles!surveys_created_by_fkey(full_name),
                        deleted_by_profile:profiles!surveys_deleted_by_fkey(full_name),
                        committee:committees(committee_name_ar),
                        survey_questions(id)
                    `)
                    .eq('is_deleted', true)
                    .order('deleted_at', { ascending: false });

                if (error) throw error;
                return data || [];
            } catch (error) {
                console.error('Error loading deleted surveys:', error);
                this.showError('حدث خطأ أثناء تحميل الاستبيانات المحذوفة');
                return [];
            }
        }

        async restoreSurvey(surveyId) {
            const result = await Swal.fire({
                title: 'استعادة الاستبيان',
                text: 'هل تريد استعادة هذا الاستبيان؟',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'نعم، استعد',
                cancelButtonText: 'إلغاء',
                confirmButtonColor: '#10b981'
            });

            if (!result.isConfirmed) return;

            try {
                const { error } = await sb
                    .from('surveys')
                    .update({
                        is_deleted: false,
                        deleted_at: null,
                        deleted_by: null,
                        permanent_delete_at: null
                    })
                    .eq('id', surveyId);

                if (error) throw error;

                this.showSuccess('تم استعادة الاستبيان بنجاح');
                await this.loadAllSurveys();
            } catch (error) {
                console.error('Error restoring survey:', error);
                this.showError('حدث خطأ أثناء استعادة الاستبيان');
            }
        }

        async unarchiveSurvey(surveyId) {
            const result = await Swal.fire({
                title: 'إلغاء الأرشفة',
                text: 'هل تريد إلغاء أرشفة هذا الاستبيان؟',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'نعم، ألغِ الأرشفة',
                cancelButtonText: 'إلغاء',
                confirmButtonColor: '#10b981'
            });

            if (!result.isConfirmed) return;

            try {
                const { error } = await sb
                    .from('surveys')
                    .update({
                        is_archived: false,
                        archived_at: null,
                        archived_by: null
                    })
                    .eq('id', surveyId);

                if (error) throw error;

                this.showSuccess('تم إلغاء أرشفة الاستبيان بنجاح');
                await this.loadAllSurveys();
            } catch (error) {
                console.error('Error unarchiving survey:', error);
                this.showError('حدث خطأ أثناء إلغاء الأرشفة');
            }
        }

        async deleteSurveyPermanently(surveyId) {
            const result = await Swal.fire({
                title: 'حذف نهائي',
                html: '<strong>تحذير:</strong> هذا الإجراء لا يمكن التراجع عنه!<br>سيتم حذف الاستبيان وجميع بياناته نهائياً.',
                icon: 'error',
                showCancelButton: true,
                confirmButtonText: 'نعم، احذف نهائياً',
                cancelButtonText: 'إلغاء',
                confirmButtonColor: '#dc2626'
            });

            if (!result.isConfirmed) return;

            try {
                const { error } = await sb
                    .from('surveys')
                    .delete()
                    .eq('id', surveyId);

                if (error) throw error;

                this.showSuccess('تم حذف الاستبيان نهائياً');
                await this.loadAllSurveys();
            } catch (error) {
                console.error('Error permanently deleting survey:', error);
                this.showError('حدث خطأ أثناء الحذف النهائي');
            }
        }
    }

    window.surveysManager = new SurveysManager();
})();


