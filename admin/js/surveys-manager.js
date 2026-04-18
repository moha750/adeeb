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
                const effectiveUserId = await window.AuthManager.getEffectiveUserId();

                if (!effectiveUserId) {
                    this.showError('يجب تسجيل الدخول لعرض الاستبيانات');
                    return;
                }

                let data;
                const impersonating = await window.AuthManager.isImpersonating();

                if (impersonating) {
                    // وضع التنكر: استخدام RPC لتجاوز RLS
                    const rpcData = await window.AuthManager.impersonateQuery('impersonate_get_user_surveys');
                    data = (rpcData || []).map(s => ({
                        ...s,
                        survey_questions: s.survey_questions || [],
                        created_by_profile: s.created_by_profile || { full_name: null }
                    }));
                } else {
                    // الوضع العادي: استعلام مباشر
                    const { data: normalData, error } = await sb
                        .from('surveys')
                        .select(`
                            *,
                            created_by_profile:profiles!surveys_created_by_fkey(full_name),
                            committee:committees(committee_name_ar),
                            survey_questions(id)
                        `)
                        .not('status', 'in', '("archived","deleted")')
                        .eq('created_by', effectiveUserId)
                        .order('created_at', { ascending: false });

                    if (error) throw error;
                    data = normalData;
                }

                // إضافة عدد الأسئلة والإحصائيات لكل استبيان
                const surveysWithStats = await Promise.all((data || []).map(async survey => {
                    // جلب إحصائيات الاستجابات وعدد المشاركات
                    const [responsesResult, sharesResult] = await Promise.all([
                        sb.from('survey_responses').select('id, status').eq('survey_id', survey.id),
                        sb.from('survey_sharing').select('id', { count: 'exact', head: true }).eq('survey_id', survey.id)
                    ]);

                    if (responsesResult.error) {
                        console.error('Error loading responses for survey:', survey.id, responsesResult.error);
                    }

                    const responses = responsesResult.data;
                    const totalResponses = responses?.length || 0;
                    const totalCompleted = responses?.filter(r => r.status === 'completed').length || 0;
                    const totalViews = totalResponses; // كل من بدأ الاستبيان

                    return {
                        ...survey,
                        questions_count: survey.survey_questions?.length || 0,
                        total_responses: totalResponses,
                        total_completed: totalCompleted,
                        total_views: totalViews,
                        shares_count: sharesResult.count || 0
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

            // "مشارك معي": إخفاء استبيانات المستخدم وإظهار المشاركة فقط
            if (statusFilter === 'shared') {
                this.renderSurveysList([]);
                return;
            }

            const filtered = allSurveys.filter(survey => {
                const matchesSearch = survey.title.toLowerCase().includes(searchTerm) ||
                                    (survey.description || '').toLowerCase().includes(searchTerm);
                const matchesStatus = !statusFilter || this.getActualStatus(survey) === statusFilter;

                return matchesSearch && matchesStatus;
            });

            this.renderSurveysList(filtered);
        }

        renderSurveysList(surveys = allSurveys) {
            const container = document.getElementById('surveysListContainer');
            if (!container) return;

            if (surveys.length === 0) {
                // عرض حالة تحميل مؤقتة ريثما نتحقق من الاستبيانات المشاركة
                container.innerHTML = '<div class="loading-placeholder" style="text-align:center;padding:2rem;color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> جاري التحميل...</div>';
                this.loadSharedSurveys(container).then(() => {
                    // إذا لم تُضف أي مشاركات، نعرض empty-state
                    if (!container.querySelector('.surveys-section-shared')) {
                        container.innerHTML = `
                            <div class="empty-state">
                                <div class="empty-state__icon"><i class="fa-solid fa-clipboard-question"></i></div>
                                <h3 class="empty-state__title">لا توجد استبيانات</h3>
                                <p class="empty-state__message">ابدأ بإنشاء استبيان جديد</p>
                                <div class="empty-state__action">
                                    <button class="btn btn-primary" data-action="navigate-create">
                                        <i class="fa-solid fa-plus"></i>
                                        إنشاء استبيان
                                    </button>
                                </div>
                            </div>
                        `;
                        this.bindSurveyCardEvents(container);
                    }
                });
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
                                <button class="btn btn-success btn-icon btn-outline" title="تحديث" onclick="window.surveysManager && window.surveysManager.loadAllSurveys()">
                                    <i class="fa-solid fa-rotate"></i>
                                </button>
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
                                <button class="btn btn-primary btn-icon btn-outline" title="تحديث" onclick="window.surveysManager && window.surveysManager.loadAllSurveys()">
                                    <i class="fa-solid fa-rotate"></i>
                                </button>
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
                                <button class="btn btn-warning btn-icon btn-outline" title="تحديث" onclick="window.surveysManager && window.surveysManager.loadAllSurveys()">
                                    <i class="fa-solid fa-rotate"></i>
                                </button>
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
                                <button class="btn btn-slate btn-icon btn-outline" title="تحديث" onclick="window.surveysManager && window.surveysManager.loadAllSurveys()">
                                    <i class="fa-solid fa-rotate"></i>
                                </button>
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
                                <button class="btn btn-danger btn-icon btn-outline" title="تحديث" onclick="window.surveysManager && window.surveysManager.loadAllSurveys()">
                                    <i class="fa-solid fa-rotate"></i>
                                </button>
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
            this.bindSurveyCardEvents(container);

            // جلب وعرض الاستبيانات المشاركة مع المستخدم
            this.loadSharedSurveys(container);
        }

        async loadSharedSurveys(container) {
            try {
                const effectiveUserId = await window.AuthManager.getEffectiveUserId();
                if (!effectiveUserId) return;

                let shares;
                const impersonating = await window.AuthManager.isImpersonating();

                if (impersonating) {
                    // وضع التنكر: استخدام RPC لتجاوز RLS
                    shares = await window.AuthManager.impersonateQuery('impersonate_get_shared_surveys');
                } else {
                    // الوضع العادي: استعلام مباشر
                    const { data, error } = await sb
                        .from('survey_sharing')
                        .select(`
                            *,
                            survey:surveys(*),
                            shared_by_profile:profiles!survey_sharing_shared_by_profiles_fkey(full_name)
                        `)
                        .eq('shared_with', effectiveUserId);

                    if (error) { console.error('[surveys] shared surveys error', error); return; }
                    shares = data;
                }

                // فلترة المنتهية الصلاحية
                const now = new Date();
                const validShares = (shares || []).filter(s =>
                    s.survey && (!s.expires_at || new Date(s.expires_at) > now)
                );

                // إزالة حالة التحميل المؤقتة
                const loadingEl = container.querySelector('.loading-placeholder');
                if (loadingEl) loadingEl.remove();

                if (!validShares.length) return;

                // جلب إحصائيات الاستجابات لكل استبيان مشارك
                const sharedSurveysWithStats = await Promise.all(validShares.map(async share => {
                    const { data: responses } = await sb
                        .from('survey_responses')
                        .select('id, status')
                        .eq('survey_id', share.survey.id);

                    const totalResponses = responses?.length || 0;
                    const totalCompleted = responses?.filter(r => r.status === 'completed').length || 0;

                    return { ...share, totalResponses, totalCompleted };
                }));

                const sharedHtml = `
                    <div class="surveys-section surveys-section-shared">
                        <div class="card card--purple">
                            <div class="card-header">
                                <h3><i class="fa-solid fa-share-nodes survey-icon--shared"></i> مشارك معي (${sharedSurveysWithStats.length})</h3>
                            </div>
                            <div class="card-body">
                                <div class="uc-grid">
                                    ${sharedSurveysWithStats.map(s => this.renderSharedSurveyCard(s)).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                // منع التكرار إذا استُدعيت أكثر من مرة بسبب race condition
                const existing = container.querySelector('.surveys-section-shared');
                if (existing) existing.remove();

                container.insertAdjacentHTML('beforeend', sharedHtml);
                this.bindSurveyCardEvents(container);

            } catch (err) {
                console.error('[surveys] loadSharedSurveys', err);
            }
        }

        renderSharedSurveyCard(share) {
            const survey = share.survey;
            const actualStatus = this.getActualStatus(survey);

            const statusLabels = {
                draft: 'مسودة', active: 'نشط', paused: 'متوقف',
                scheduled: 'مجدول', closed: 'منتهية', archived: 'مؤرشف'
            };
            const statusIcons = {
                draft: 'fa-file-pen', active: 'fa-circle-play', paused: 'fa-circle-pause',
                scheduled: 'fa-calendar-days', closed: 'fa-circle-stop', archived: 'fa-box-archive'
            };
            return `
                <div class="uc-card uc-card--purple uc-card--shared-item" data-survey-id="${survey.id}">
                    <div class="uc-card__header uc-card__header--purple">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon">
                                <i class="fa-solid fa-clipboard-list"></i>
                            </div>
                            <div class="uc-card__header-info">
                                <h3 class="uc-card__title">${this.escapeHtml(survey.title)}</h3>
                                <span class="uc-card__badge uc-card__badge--shared">
                                    <i class="fa-solid fa-share-nodes"></i>
                                    مشارك معي
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="uc-card__body">
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid ${statusIcons[actualStatus] || 'fa-circle-dot'}"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">حالة الاستبيان</span>
                                <span class="uc-card__info-value">${statusLabels[actualStatus]}</span>
                            </div>
                        </div>
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-user-tag"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">مشارك من</span>
                                <span class="uc-card__info-value">${this.escapeHtml(share.shared_by_profile?.full_name || 'غير معروف')}</span>
                            </div>
                        </div>
                    </div>

                    <div class="uc-card__footer">
                        <button class="btn btn-violet" data-action="view-details" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-eye"></i> عرض التفاصيل
                        </button>
                        <button class="btn btn-primary" data-action="view-results" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-chart-bar"></i> عرض النتائج
                        </button>
                    </div>
                </div>
            `;
        }

        bindSurveyCardEvents(container) {
            // إزالة المستمع القديم لمنع التراكم عند كل init()
            if (this._cardClickHandler) {
                container.removeEventListener('click', this._cardClickHandler);
            }

            this._cardClickHandler = (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;

                const action = btn.dataset.action;
                const surveyId = Number(btn.dataset.surveyId);

                const actions = {
                    'view-details':    () => this.viewSurveyDetails(surveyId),
                    'preview':         () => this.previewSurvey(surveyId),
                    'share-survey':    () => this.openShareModal(surveyId),
                    'view-results':    () => this.viewResults(surveyId),
                    'pause':           () => this.pauseSurvey(surveyId),
                    'end':             () => this.endSurvey(surveyId),
                    'enable':          () => this.enableSurvey(surveyId),
                    'archive':         () => this.archiveSurvey(surveyId),
                    'delete':          () => this.deleteSurvey(surveyId),
                    'navigate-create': () => this.navigateToCreate(),
                };

                if (actions[action]) actions[action]();
            };

            container.addEventListener('click', this._cardClickHandler);
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
                                ${actualStatus === 'active' && (survey.end_date || (survey.start_date && survey.end_date)) ? `
                                <span class="uc-card__badge">
                                    <i class="fa-solid fa-calendar-check"></i>
                                    مجدول
                                </span>` : ''}
                                ${survey.shares_count > 0 ? `
                                <span class="uc-card__badge uc-card__badge--shared">
                                    <i class="fa-solid fa-share-nodes"></i>
                                    مشارك (${survey.shares_count})
                                </span>` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="uc-card__body">
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-align-left"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">الوصف</span>
                                <span class="uc-card__info-value ${survey.description ? '' : ''}">${survey.description ? this.escapeHtml(survey.description) : 'لا يوجد وصف'}</span>
                            </div>
                        </div>

                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-calendar"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">تاريخ الإنشاء</span>
                                <span class="uc-card__info-value ${survey.created_at ? '' : ''}">${survey.created_at ? this.formatDate(survey.created_at) : 'غير محدد'}</span>
                            </div>
                        </div>

                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-user"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">المنشئ</span>
                                <span class="uc-card__info-value ${survey.created_by_profile?.full_name ? '' : ''}">${survey.created_by_profile?.full_name ? this.escapeHtml(survey.created_by_profile.full_name) : 'غير معروف'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="uc-card__footer">
                        <button class="btn btn-info" data-action="view-details" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-circle-info"></i> عرض التفاصيل
                        </button>
                        ${actualStatus === 'active' ? `
                        <button class="btn btn-primary" data-action="preview" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-eye"></i> معاينة
                        </button>
                        <button class="btn btn-secondary" data-action="share-survey" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-share-nodes"></i> مشاركة
                        </button>
                        <button class="btn btn-primary" data-action="view-results" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-chart-bar"></i> النتائج
                        </button>
                        <button class="btn btn-warning" data-action="pause" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-pause-circle"></i> إيقاف
                        </button>
                        <button class="btn btn-danger" data-action="end" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-stop-circle"></i> إنهاء
                        </button>
                        ` : ''}
                        ${actualStatus === 'scheduled' ? `
                        <button class="btn btn-primary" data-action="preview" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-eye"></i> معاينة
                        </button>
                        <button class="btn btn-secondary" data-action="share-survey" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-share-nodes"></i> مشاركة
                        </button>
                        <button class="btn btn-danger" data-action="end" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-stop-circle"></i> إنهاء
                        </button>
                        ` : ''}
                        ${actualStatus === 'paused' ? `
                        <button class="btn btn-primary" data-action="preview" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-eye"></i> معاينة
                        </button>
                        <button class="btn btn-secondary" data-action="share-survey" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-share-nodes"></i> مشاركة
                        </button>
                        <button class="btn btn-primary" data-action="view-results" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-chart-bar"></i> النتائج
                        </button>
                        <button class="btn btn-success" data-action="enable" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-play-circle"></i> تفعيل
                        </button>
                        ` : ''}
                        ${actualStatus === 'closed' ? `
                        <button class="btn btn-secondary" data-action="share-survey" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-share-nodes"></i> مشاركة
                        </button>
                        <button class="btn btn-primary" data-action="view-results" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-chart-bar"></i> النتائج
                        </button>
                        <button class="btn btn-slate" data-action="archive" data-survey-id="${survey.id}">
                            <i class="fa-solid fa-box-archive"></i> أرشفة
                        </button>
                        ` : ''}
                        <button class="btn btn-danger" data-action="delete" data-survey-id="${survey.id}">
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
                            <button class="btn btn-icon  btn-slate" type="button"
                                onclick="window.surveysManager.moveQuestion(${index}, -1)"
                                ${isFirst ? 'disabled' : ''} title="تحريك للأعلى">
                                <i class="fa-solid fa-arrow-up"></i>
                            </button>
                            <button class="btn btn-icon  btn-slate" type="button"
                                onclick="window.surveysManager.moveQuestion(${index}, 1)"
                                ${isLast ? 'disabled' : ''} title="تحريك للأسفل">
                                <i class="fa-solid fa-arrow-down"></i>
                            </button>
                            <button class="btn btn-icon  btn-primary" type="button"
                                onclick="window.surveysManager.duplicateQuestion(${index})" title="نسخ">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                            <button class="btn btn-icon  btn-danger" type="button"
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

                // التحقق من أن جميع الأسئلة تحتوي على نص
                const emptyQuestion = surveyQuestions.find(q => !q.question_text || !q.question_text.trim());
                if (emptyQuestion) {
                    const idx = surveyQuestions.indexOf(emptyQuestion) + 1;
                    this.showError(`السؤال رقم ${idx} لا يحتوي على نص. يرجى إدخال نص لجميع الأسئلة`);
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

        async viewSurveyDetails(surveyId) {
            let survey = allSurveys.find(s => s.id === surveyId);
            if (!survey) {
                try {
                    const { data, error } = await sb
                        .from('surveys')
                        .select(`*, created_by_profile:profiles!surveys_created_by_fkey(full_name), committee:committees(committee_name_ar), survey_questions(id)`)
                        .eq('id', surveyId)
                        .single();
                    if (error || !data) {
                        this.showError('تعذّر العثور على الاستبيان');
                        return;
                    }
                    survey = data;
                    survey.questions_count = survey.survey_questions?.length || 0;
                } catch {
                    this.showError('تعذّر العثور على الاستبيان');
                    return;
                }
            }

            const actualStatus = this.getActualStatus(survey);
            const statusLabels = {
                draft: 'مسودة', active: 'نشط', paused: 'متوقف',
                scheduled: 'مجدول', closed: 'منتهية', archived: 'مؤرشف', deleted: 'محذوف'
            };
            const statusIcons = {
                draft: 'fa-file-pen', active: 'fa-circle-play', paused: 'fa-circle-pause',
                scheduled: 'fa-calendar-days', closed: 'fa-circle-stop', archived: 'fa-box-archive', deleted: 'fa-trash'
            };
            const statusType = {
                draft: 'secondary', active: 'success', paused: 'warning',
                scheduled: 'info', closed: 'danger', archived: 'info', deleted: 'danger'
            };
            const statusBox = {
                draft: 'box-info', active: 'box-success', paused: 'box-warning',
                scheduled: 'box-info', closed: 'box-danger', archived: 'box-info', deleted: 'box-danger'
            };
            const typeLabels = {
                general: 'عام', membership: 'عضوية', event: 'فعالية',
                feedback: 'تقييم', evaluation: 'تقويم', poll: 'استطلاع',
                quiz: 'اختبار', research: 'بحث'
            };
            const accessLabels = {
                public: 'عام (للجميع)',
                members_only: 'الأعضاء فقط',
                committee_only: 'لجنة محددة',
                private: 'خاص'
            };

            const empty = (val, fallback = 'غير محدد') =>
                (val === null || val === undefined || val === '')
                    ? `<span class="modal-detail-empty"><i class="fa-solid fa-minus"></i> ${fallback}</span>`
                    : this.escapeHtml(String(val));

            const yesNo = (v) => v
                ? `<span style="color:var(--color-success,#10b981);"><i class="fa-solid fa-check"></i> نعم</span>`
                : `<span style="color:var(--text-muted,#94a3b8);"><i class="fa-solid fa-xmark"></i> لا</span>`;

            const completionRate = (survey.total_views || 0) > 0
                ? Math.round(((survey.total_completed || 0) / survey.total_views) * 100)
                : 0;

            const html = `
                <div class="modal-info-box ${statusBox[actualStatus] || 'box-info'}">
                    <i class="fa-solid ${statusIcons[actualStatus] || 'fa-circle-info'}"></i>
                    <span>حالة الاستبيان: <strong>${statusLabels[actualStatus] || actualStatus}</strong></span>
                </div>

                <div class="modal-section">
                    <h3><i class="fa-solid fa-circle-info"></i> معلومات أساسية</h3>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">العنوان</span>
                            <span class="modal-detail-value">${empty(survey.title)}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">النوع</span>
                            <span class="modal-detail-value">${empty(typeLabels[survey.survey_type] || survey.survey_type)}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">المنشئ</span>
                            <span class="modal-detail-value">${empty(survey.created_by_profile?.full_name, 'غير معروف')}</span>
                        </div>
                        <div class="modal-detail-item modal-detail-item--full">
                            <span class="modal-detail-label">الوصف</span>
                            <span class="modal-detail-value">${empty(survey.description, 'لا يوجد وصف')}</span>
                        </div>
                    </div>
                </div>

                <hr class="modal-divider">

                <div class="modal-section">
                    <h3><i class="fa-solid fa-calendar-days"></i> التواريخ</h3>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">تاريخ الإنشاء</span>
                            <span class="modal-detail-value">${survey.created_at ? this.formatDate(survey.created_at) : '<span class="modal-detail-empty"> غير محدد</span>'}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">تاريخ البدء</span>
                            <span class="modal-detail-value">${survey.start_date ? this.formatDate(survey.start_date) : '<span class="modal-detail-empty"> غير محدد</span>'}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">تاريخ الانتهاء</span>
                            <span class="modal-detail-value">${survey.end_date ? this.formatDate(survey.end_date) : '<span class="modal-detail-empty"> غير محدد</span>'}</span>
                        </div>
                    </div>
                </div>

                <hr class="modal-divider">

                <div class="modal-section">
                    <h3><i class="fa-solid fa-chart-bar"></i> الإحصائيات</h3>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">عدد الأسئلة</span>
                            <span class="modal-detail-value">${survey.questions_count || 0}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">إجمالي الاستجابات</span>
                            <span class="modal-detail-value">${survey.total_responses || 0}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">المكتملة</span>
                            <span class="modal-detail-value">${survey.total_completed || 0}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">معدّل الإكمال</span>
                            <span class="modal-detail-value">${completionRate}%</span>
                        </div>
                    </div>
                </div>

                <hr class="modal-divider">

                <div class="modal-section">
                    <h3><i class="fa-solid fa-sliders"></i> الإعدادات</h3>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">نوع الوصول</span>
                            <span class="modal-detail-value">${empty(accessLabels[survey.access_type] || survey.access_type)}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">السماح بالمجهول</span>
                            <span class="modal-detail-value">${yesNo(survey.allow_anonymous)}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">السماح بإجابات متعددة</span>
                            <span class="modal-detail-value">${yesNo(survey.allow_multiple_responses)}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">إظهار شريط التقدّم</span>
                            <span class="modal-detail-value">${yesNo(survey.show_progress_bar !== false)}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">إظهار النتائج للمستجيبين</span>
                            <span class="modal-detail-value">${yesNo(survey.show_results_to_participants)}</span>
                        </div>
                    </div>
                </div>
            `;

            if (window.ModalHelper && typeof window.ModalHelper.show === 'function') {
                window.ModalHelper.show({
                    title: 'تفاصيل الاستبيان',
                    html,
                    size: 'lg',
                    type: statusType[actualStatus] || 'info',
                    iconClass: `fa-solid ${statusIcons[actualStatus] || 'fa-circle-info'}`,
                    showClose: true
                });
            } else {
                const modal = document.createElement('div');
                modal.className = 'modal-backdrop active';
                modal.innerHTML = `
                    <div class="modal modal-lg modal-${statusType[actualStatus] || 'info'} active">
                        <div class="modal-header">
                            <div class="modal-icon"><i class="fa-solid ${statusIcons[actualStatus] || 'fa-circle-info'}"></i></div>
                            <div class="modal-header-content">
                                <h2 class="modal-title">تفاصيل الاستبيان</h2>
                            </div>
                            <button class="modal-close" type="button"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="modal-body">${html}</div>
                    </div>
                `;
                document.body.appendChild(modal);
                document.body.classList.add('modal-open');
                modal.addEventListener('click', (e) => {
                    if (e.target === modal || e.target.closest('.modal-close')) {
                        modal.remove();
                        document.body.classList.remove('modal-open');
                    }
                });
            }
        }

        async openShareModal(surveyId) {
            const survey = allSurveys.find(s => s.id === surveyId);
            if (!survey) return;

            const surveyUrl = `${window.location.origin}/surveys/survey.html?id=${surveyId}`;

            // جلب أدوار لديها صلاحية manage_surveys
            const { data: permRoles } = await sb
                .from('role_permissions')
                .select('role_id, permissions!inner(permission_key)')
                .eq('permissions.permission_key', 'manage_surveys');
            const allowedRoleIds = (permRoles || []).map(r => r.role_id);

            // جلب المشاركات الحالية والمستخدمين المتاحين بالتوازي
            const [sharesRes, usersRes] = await Promise.all([
                sb.from('survey_sharing')
                    .select('*, shared_with_profile:profiles!survey_sharing_shared_with_profiles_fkey(full_name, avatar_url)')
                    .eq('survey_id', surveyId),
                sb.from('user_roles')
                    .select('user_id, role:roles(id, role_name_ar, role_category), committee:committees(committee_name_ar), profiles:profiles!user_roles_user_id_fkey(full_name, avatar_url)')
                    .eq('is_active', true)
                    .in('role_id', allowedRoleIds)
            ]);

            const currentShares = sharesRes.data || [];
            const roleUsers = usersRes.data || [];

            // بناء قائمة مستخدمين فريدة (بدون المالك وبدون من تم مشاركتهم مسبقاً)
            const effectiveUserId = await window.AuthManager.getEffectiveUserId();
            const sharedIds = new Set(currentShares.map(s => s.shared_with));
            const seen = new Set();
            const availableUsers = [];

            for (const ru of roleUsers) {
                if (!ru.user_id || ru.user_id === effectiveUserId || sharedIds.has(ru.user_id) || seen.has(ru.user_id)) continue;
                seen.add(ru.user_id);
                availableUsers.push({
                    id: ru.user_id,
                    name: ru.profiles?.full_name || 'غير معروف',
                    avatar: ru.profiles?.avatar_url,
                    role: ru.role?.role_name_ar || '',
                    committee: ru.committee?.committee_name_ar || ''
                });
            }

            availableUsers.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

            const sharesRowsHtml = currentShares.map(s => `
                <tr data-share-id="${s.id}">
                    <td>${this.escapeHtml(s.shared_with_profile?.full_name || 'غير معروف')}</td>
                    <td>
                        <button class="btn btn-icon btn-danger btn-sm" data-remove-share="${s.id}" title="إزالة المشاركة">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

            const userOptionsHtml = availableUsers.map(u => {
                const label = u.committee ? `${u.role} - ${u.committee}` : u.role;
                return `<option value="${u.id}">${this.escapeHtml(u.name)}${label ? ` (${this.escapeHtml(label)})` : ''}</option>`;
            }).join('');

            const html = `
                <div class="modal-section">
                    <h3><i class="fa-solid fa-link"></i> رابط الاستبيان</h3>
                    <div class="share-link-container">
                        <input type="text" class="share-link-input" id="sm-share-link-input" value="${surveyUrl}" readonly />
                        <button class="btn btn-primary btn-sm" id="sm-copy-link-btn" type="button">
                            <i class="fa-solid fa-copy"></i> نسخ
                        </button>
                    </div>
                </div>

                <hr class="modal-divider">

                <div class="modal-section">
                    <h3><i class="fa-solid fa-user-plus"></i> مشاركة جديدة</h3>

                    <div class="form-group">
                        <label class="form-label"><i class="fa-solid fa-user label-icon"></i> المستخدم</label>
                        <select id="ra-share-user" class="form-select">
                            <option value="">اختر مستخدم...</option>
                            ${userOptionsHtml}
                        </select>
                    </div>

                </div>

                <hr class="modal-divider">

                <div class="modal-section">
                    <h3><i class="fa-solid fa-users"></i> مشارك معهم حالياً</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>المشارك معه</th>
                                <th>إزالة المشاركة</th>
                            </tr>
                        </thead>
                        <tbody id="sm-shares-tbody">
                            ${sharesRowsHtml || '<tr class="empty-row"><td colspan="2" style="text-align:center;color:var(--text-secondary);">لا توجد مشاركات حالياً</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;

            const self = this;

            if (window.ModalHelper && typeof window.ModalHelper.show === 'function') {
                window.ModalHelper.show({
                    title: `مشاركة: ${this.escapeHtml(survey.title)}`,
                    iconClass: 'fa-solid fa-share-nodes',
                    html,
                    size: 'md',
                    showClose: true,
                    showFooter: true,
                    footerButtons: [
                        { text: 'إغلاق', class: 'btn btn-outline', keepOpen: false }
                    ]
                });
            } else {
                const modal = document.createElement('div');
                modal.className = 'modal-backdrop active';
                modal.innerHTML = `
                    <div class="modal modal-md active">
                        <div class="modal-header">
                            <h3><i class="fa-solid fa-share-nodes"></i> مشاركة: ${this.escapeHtml(survey.title)}</h3>
                            <button class="modal-close" data-cancel><i class="fa-solid fa-times"></i></button>
                        </div>
                        <div class="modal-body">
                            ${html}
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-outline" data-cancel>إغلاق</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                document.body.classList.add('modal-open');
                modal.addEventListener('click', (e) => {
                    if (e.target === modal || e.target.closest('[data-cancel]')) {
                        modal.remove();
                        document.body.classList.remove('modal-open');
                    }
                });
            }

            // ربط الأحداث بعد عرض المودال
            setTimeout(() => {
                // زر نسخ الرابط
                const copyBtn = document.getElementById('sm-copy-link-btn');
                const linkInput = document.getElementById('sm-share-link-input');
                if (copyBtn && linkInput) {
                    copyBtn.addEventListener('click', async () => {
                        try {
                            await navigator.clipboard.writeText(linkInput.value);
                            copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> تم النسخ';
                            self.showSuccess('تم نسخ رابط الاستبيان بنجاح');
                            setTimeout(() => { copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> نسخ'; }, 2000);
                        } catch (err) {
                            linkInput.select();
                        }
                    });
                }

                // إضافة مشاركة عند اختيار مستخدم
                const shareUserSelect = document.getElementById('ra-share-user');
                if (shareUserSelect) {
                    shareUserSelect.addEventListener('change', async () => {
                        const userId = shareUserSelect.value;
                        if (!userId) return;
                        const userName = shareUserSelect.options[shareUserSelect.selectedIndex].text;

                        shareUserSelect.disabled = true;
                        const result = await self.executeShare(surveyId, userId);
                        shareUserSelect.disabled = false;
                        if (!result) { shareUserSelect.value = ''; return; }

                        // إضافة صف جديد للجدول
                        const tbody = document.getElementById('sm-shares-tbody');
                        if (tbody) {
                            tbody.querySelector('.empty-row')?.remove();
                            const tr = document.createElement('tr');
                            tr.dataset.shareId = result.id;
                            tr.innerHTML = `
                                <td>${self.escapeHtml(userName)}</td>
                                <td>
                                    <button class="btn btn-danger btn-sm" data-remove-share="${result.id}" title="إزالة المشاركة">
                                        <i class="fa-solid fa-xmark"></i>
                                    </button>
                                </td>
                            `;
                            tr.querySelector('[data-remove-share]').addEventListener('click', async (e) => {
                                const el = e.currentTarget;
                                await self.removeShare(el.dataset.removeShare);
                                el.closest('tr')?.remove();
                                if (!tbody.querySelector('tr')) {
                                    tbody.innerHTML = '<tr class="empty-row"><td colspan="2" style="text-align:center;color:var(--text-secondary);">لا توجد مشاركات حالياً</td></tr>';
                                }
                            });
                            tbody.appendChild(tr);
                        }

                        // إزالة المستخدم من القائمة المنسدلة
                        shareUserSelect.querySelector(`option[value="${userId}"]`)?.remove();
                        shareUserSelect.value = '';
                    });
                }

                // أزرار إزالة المشاركة
                const smTbody = document.getElementById('sm-shares-tbody');
                document.querySelectorAll('[data-remove-share]').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const el = e.currentTarget;
                        const shareId = el.dataset.removeShare;
                        await self.removeShare(shareId);
                        el.closest('tr')?.remove();
                        if (smTbody && !smTbody.querySelector('tr')) {
                            smTbody.innerHTML = '<tr class="empty-row"><td colspan="2" style="text-align:center;color:var(--text-secondary);">لا توجد مشاركات حالياً</td></tr>';
                        }
                    });
                });
            }, 80);
        }

        async executeShare(surveyId, userId) {
            const effectiveUserId = await window.AuthManager.getEffectiveUserId();

            const { data, error } = await sb.from('survey_sharing').insert({
                survey_id: surveyId,
                shared_by: effectiveUserId,
                shared_with: userId
            }).select().single();

            if (error) {
                if (error.code === '23505') {
                    this.showError('تم مشاركة هذا الاستبيان مع هذا المستخدم مسبقاً');
                } else {
                    console.error('[surveys] share error', error);
                    this.showError('حدث خطأ أثناء المشاركة');
                }
                return null;
            }

            this.showSuccess('تمت المشاركة بنجاح');
            return data;
        }

        async removeShare(shareId) {
            const { error } = await sb.from('survey_sharing').delete().eq('id', shareId);
            if (error) {
                console.error('[surveys] remove share error', error);
                this.showError('حدث خطأ أثناء إزالة المشاركة');
                return;
            }
            this.showSuccess('تم إزالة المشاركة');
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
                        status: 'archived',
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
                const now = new Date();
                const permanentDeleteAt = new Date(now);
                permanentDeleteAt.setDate(permanentDeleteAt.getDate() + 30);

                const { error } = await sb
                    .from('surveys')
                    .update({
                        status: 'deleted',
                        deleted_at: now.toISOString(),
                        deleted_by: currentUser.id,
                        permanent_delete_at: permanentDeleteAt.toISOString()
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
                const effectiveUserId = await window.AuthManager.getEffectiveUserId();
                if (!effectiveUserId) return [];

                const { data, error } = await sb
                    .from('surveys')
                    .select(`
                        *,
                        created_by_profile:profiles!surveys_created_by_fkey(full_name),
                        archived_by_profile:profiles!surveys_archived_by_fkey(full_name),
                        committee:committees(committee_name_ar),
                        survey_questions(id)
                    `)
                    .eq('status', 'archived')
                    .eq('created_by', effectiveUserId)
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
                const effectiveUserId = await window.AuthManager.getEffectiveUserId();
                if (!effectiveUserId) return [];

                const { data, error } = await sb
                    .from('surveys')
                    .select(`
                        *,
                        created_by_profile:profiles!surveys_created_by_fkey(full_name),
                        deleted_by_profile:profiles!surveys_deleted_by_fkey(full_name),
                        committee:committees(committee_name_ar),
                        survey_questions(id)
                    `)
                    .eq('status', 'deleted')
                    .eq('created_by', effectiveUserId)
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
                        status: 'draft',
                        deleted_at: null,
                        deleted_by: null,
                        permanent_delete_at: null
                    })
                    .eq('id', surveyId);

                if (error) throw error;

                this.showSuccess('تم استعادة الاستبيان بنجاح');
                await this.loadAllSurveys();
                if (typeof window.navigateToSection === 'function') {
                    window.navigateToSection('surveys-all-section');
                }
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
                        status: 'draft',
                        archived_at: null,
                        archived_by: null
                    })
                    .eq('id', surveyId);

                if (error) throw error;

                this.showSuccess('تم إلغاء أرشفة الاستبيان بنجاح');
                await this.loadAllSurveys();
                if (typeof window.navigateToSection === 'function') {
                    window.navigateToSection('surveys-all-section');
                }
            } catch (error) {
                console.error('Error unarchiving survey:', error);
                this.showError('حدث خطأ أثناء إلغاء الأرشفة');
            }
        }

        async deleteSurveyPermanently(surveyId, skipConfirm = false) {
            if (!skipConfirm) {
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
            }

            try {
                const { error } = await sb
                    .from('surveys')
                    .delete()
                    .eq('id', surveyId);

                if (error) throw error;

                if (!skipConfirm) {
                    this.showSuccess('تم حذف الاستبيان نهائياً');
                    await this.loadAllSurveys();
                }
            } catch (error) {
                console.error('Error permanently deleting survey:', error);
                this.showError('حدث خطأ أثناء الحذف النهائي');
            }
        }
    }

    window.surveysManager = new SurveysManager();
})();


