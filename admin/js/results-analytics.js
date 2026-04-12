/**
 * نتائج وتحليلات الاستبيانات — Results & Analytics
 * إعادة بناء كاملة لتجربة المستخدم (مشروع جديد)
 * نادي أدِيب
 */

(function () {
    'use strict';

    const sb = window.sbClient;

    // ───────────────────────── Helpers ─────────────────────────

    const QTYPES = {
        choice:  ['single_choice', 'multiple_choice', 'dropdown'],
        numeric: ['linear_scale', 'rating_stars', 'rating_hearts', 'rating_emojis', 'slider', 'number'],
        bool:    ['yes_no'],
        text:    ['short_text', 'long_text', 'email', 'phone', 'url', 'date', 'time', 'datetime']
    };

    const TYPE_LABELS = {
        short_text: 'نص قصير',
        long_text: 'نص طويل',
        single_choice: 'اختيار واحد',
        multiple_choice: 'اختيارات متعددة',
        dropdown: 'قائمة منسدلة',
        linear_scale: 'مقياس خطي',
        rating_stars: 'تقييم نجوم',
        rating_hearts: 'تقييم قلوب',
        rating_emojis: 'تقييم بالإيموجي',
        number: 'رقم',
        email: 'بريد إلكتروني',
        phone: 'رقم هاتف',
        url: 'رابط',
        date: 'تاريخ',
        time: 'وقت',
        datetime: 'تاريخ ووقت',
        yes_no: 'نعم/لا',
        slider: 'شريط منزلق'
    };

    const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#ec4899', '#6366f1'];

    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function formatDate(dateString, withTime = true) {
        if (!dateString) return '—';
        const date = new Date(dateString);
        const opts = { year: 'numeric', month: 'long', day: 'numeric' };
        if (withTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
        return date.toLocaleDateString('ar-SA', opts);
    }

    function formatDuration(seconds) {
        if (!seconds || seconds <= 0) return '0 ث';
        if (seconds < 60) return `${seconds} ث`;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (m < 60) return s ? `${m} د ${s} ث` : `${m} د`;
        const h = Math.floor(m / 60);
        const mm = m % 60;
        return mm ? `${h} س ${mm} د` : `${h} س`;
    }

    function classifyType(type) {
        if (QTYPES.choice.includes(type))  return 'choice';
        if (QTYPES.numeric.includes(type)) return 'numeric';
        if (QTYPES.bool.includes(type))    return 'bool';
        return 'text';
    }

    function getActualStatus(survey) {
        if (!survey) return 'draft';
        const now = new Date();
        if (survey.status === 'paused') return 'paused';
        if (survey.status === 'active') {
            if (survey.end_date && now > new Date(survey.end_date))   return 'closed';
            if (survey.start_date && now < new Date(survey.start_date)) return 'scheduled';
        }
        return survey.status || 'draft';
    }

    const STATUS_INFO = {
        active:    { label: 'نشط',    icon: 'fa-circle-play',  pulse: true  },
        scheduled: { label: 'مجدول',  icon: 'fa-calendar-day', pulse: false },
        paused:    { label: 'متوقف',  icon: 'fa-circle-pause', pulse: false },
        closed:    { label: 'منتهي',  icon: 'fa-flag-checkered', pulse: false },
        draft:     { label: 'مسودة',  icon: 'fa-file-pen',     pulse: false }
    };

    function showToast(type, message) {
        if (window.toast && typeof window.toast[type] === 'function') {
            window.toast[type](message);
            return;
        }
        const el = document.createElement('div');
        el.className = `notification notification-${type} show`;
        const ic = type === 'success' ? 'fa-check-circle'
                : type === 'error'   ? 'fa-exclamation-circle'
                : 'fa-info-circle';
        el.innerHTML = `<i class="fa-solid ${ic}"></i><span>${escapeHtml(message)}</span>`;
        document.body.appendChild(el);
        setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2800);
    }

    // ───────────────────────── Module ─────────────────────────

    class ResultsAnalytics {
        constructor() {
            this.currentSurvey = null;   // الاستبيان المعروض حالياً
            this.questions = [];         // أسئلة الاستبيان الحالي
            this.responses = [];         // استجابات الاستبيان الحالي
            this.activeTab = 'overview';
            this.responsesFilters = { status: '', search: '', sort: 'newest' };
        }

        // نقطة الدخول من dashboard.js
        // الطريق الوحيد المدعوم للدخول هنا هو زر "النتائج" في كارد استبيان داخل
        // تبويب "جميع الاستبيانات" — والذي يضع pendingSurveyId قبل التنقّل.
        // إن دخل المستخدم بدون pendingSurveyId (مثلاً عبر رابط قديم) نُعيده إلى
        // تبويب "جميع الاستبيانات" لأن صفحة قائمة النتائج لم تعد موجودة.
        async init() {
            const root = document.getElementById('ra-root');
            if (!root) return;

            this.currentSurvey = null;

            if (this.pendingSurveyId) {
                const targetId = this.pendingSurveyId;
                this.pendingSurveyId = null;
                await this.loadSurveyAnalytics(targetId);
                return;
            }

            if (typeof window.navigateToSection === 'function') {
                window.navigateToSection('surveys-all-section');
            }
        }

        // ─────────── جلب البيانات ───────────

        async loadSurveyAnalytics(surveyId) {
            try {
                const root = document.getElementById('ra-root');
                if (root) root.innerHTML = this.renderDetailSkeleton();

                const [surveyRes, questionsRes, responsesRes] = await Promise.all([
                    sb.from('surveys').select('*').eq('id', surveyId).single(),
                    sb.from('survey_questions').select('*').eq('survey_id', surveyId).order('question_order'),
                    sb.from('survey_responses')
                        .select(`*, user:profiles(full_name), survey_answers(*)`)
                        .eq('survey_id', surveyId)
                        .order('created_at', { ascending: false })
                ]);

                if (surveyRes.error) throw surveyRes.error;
                if (!surveyRes.data) throw new Error('Survey not found');

                const survey = surveyRes.data;
                const questions = questionsRes.data;
                const responses = responsesRes.data;

                this.currentSurvey = survey;
                this.questions = questions || [];
                this.responses = this.markAbandoned(responses || []);
                this.activeTab = 'overview';
                this.responsesFilters = { status: '', search: '', sort: 'newest' };

                // تحديد إذا كان المستخدم هو مالك الاستبيان أم مستلم مشاركة
                const effectiveUserId = await window.AuthManager.getEffectiveUserId();
                this.isOwner = (survey.created_by === effectiveUserId);

                // جلب معلومات من شارك الاستبيان (إذا لم يكن المالك)
                if (!this.isOwner) {
                    const { data: shareInfo } = await sb
                        .from('survey_sharing')
                        .select('*, shared_by_profile:profiles!survey_sharing_shared_by_profiles_fkey(full_name)')
                        .eq('survey_id', surveyId)
                        .eq('shared_with', effectiveUserId)
                        .single();
                    this.shareInfo = shareInfo;
                } else {
                    this.shareInfo = null;
                }

                this.renderDetail();
            } catch (err) {
                console.error('[ra] loadSurveyAnalytics', err);
                showToast('error', 'حدث خطأ أثناء تحميل التحليلات');
                if (typeof window.navigateToSection === 'function') {
                    window.navigateToSection('surveys-all-section');
                }
            }
        }

        markAbandoned(responses) {
            const ABANDONED_AFTER_MIN = 60;
            const now = new Date();
            return responses.map(r => {
                if (r.status === 'in_progress') {
                    const startedAt = new Date(r.started_at);
                    const minutes = (now - startedAt) / 60000;
                    if (minutes > ABANDONED_AFTER_MIN) {
                        const lastActivity = r.updated_at || r.started_at;
                        const seconds = Math.floor((new Date(lastActivity) - startedAt) / 1000);
                        return { ...r, status: 'abandoned', time_spent_seconds: r.time_spent_seconds || seconds };
                    }
                }
                if ((r.status === 'in_progress' || r.status === 'abandoned') && !r.time_spent_seconds) {
                    const startedAt = new Date(r.started_at);
                    const lastActivity = r.updated_at || r.started_at;
                    const seconds = Math.floor((new Date(lastActivity) - startedAt) / 1000);
                    return { ...r, time_spent_seconds: seconds };
                }
                return r;
            });
        }

        // ─────────── الواجهة: صفحة تحليلات استبيان ───────────

        renderDetailSkeleton() {
            return `
                <div class="ra ra-detail">
                    <div class="ra-detail__header">
                        <div class="ra-skeleton" style="width:42px;height:42px;border-radius:12px;"></div>
                        <div style="flex:1;">
                            <div class="ra-skeleton" style="width:60%;height:18px;margin-bottom:8px;"></div>
                            <div class="ra-skeleton" style="width:40%;height:12px;"></div>
                        </div>
                    </div>
                    <div class="stats-grid">
                        ${Array(6).fill(0).map(() => `
                            <div class="stat-card">
                                <div class="stat-card-wrapper">
                                    <div class="ra-skeleton" style="height:64px;width:64px;border-radius:16px;"></div>
                                    <div class="stat-content">
                                        <div class="ra-skeleton" style="height:28px;width:60%;margin-bottom:8px;"></div>
                                        <div class="ra-skeleton" style="height:14px;width:40%;"></div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        renderDetail() {
            const root = document.getElementById('ra-root');
            if (!root) return;

            const survey = this.currentSurvey;
            const status = getActualStatus(survey);
            const info = STATUS_INFO[status] || STATUS_INFO.draft;

            const completed = this.responses.filter(r => r.status === 'completed');
            const inProgress = this.responses.filter(r => r.status === 'in_progress');
            const abandoned = this.responses.filter(r => r.status === 'abandoned');

            const totalResponses = this.responses.length;
            const completionRate = totalResponses > 0 ? Math.round((completed.length / totalResponses) * 100) : 0;
            const timeStats = this.computeTimeStats(completed);

            root.innerHTML = `
                <div class="ra ra-detail">
                    <!-- Header -->
                    <div class="ra-detail__header">
                        <button class="ra-back-btn" id="ra-back-btn" type="button" title="رجوع">
                            <i class="fa-solid fa-arrow-right"></i>
                        </button>
                        <div class="ra-detail__title-wrap">
                            <h2 class="ra-detail__title">
                                ${escapeHtml(survey.title || 'استبيان')}
                                <span class="ra-status-pill" data-pulse="${info.pulse ? 1 : 0}" style="--c:${this.statusColor(status)};--c-rgb:${this.statusColorRgb(status)};">
                                    <span class="ra-status-dot"></span>
                                    ${info.label}
                                </span>
                            </h2>
                            <p class="ra-detail__subtitle">${escapeHtml(survey.description || 'لا يوجد وصف')}</p>
                        </div>
                        <div class="ra-detail__actions">
                            <button class="ra-action" id="ra-refresh-detail" type="button">
                                <i class="fa-solid fa-rotate"></i><span>تحديث</span>
                            </button>
                            <button class="ra-action is-primary" id="ra-export-btn" type="button">
                                <i class="fa-solid fa-download"></i><span>تصدير</span>
                            </button>
                        </div>
                    </div>

                    ${!this.isOwner && this.shareInfo ? `
                    <!-- شريط تنبيه: مشارك معك -->
                    <div class="ra-shared-banner">
                        <i class="fa-solid fa-share-nodes"></i>
                        <span>هذا الاستبيان مشارك معك من <strong>${escapeHtml(this.shareInfo.shared_by_profile?.full_name || 'غير معروف')}</strong></span>
                        <span class="ra-shared-banner__perm">
                            <i class="fa-solid ${this.shareInfo.permission_level === 'view_download' ? 'fa-download' : 'fa-eye'}"></i>
                            ${this.shareInfo.permission_level === 'view_download' ? 'عرض + تحميل' : 'عرض فقط'}
                        </span>
                    </div>
                    ` : ''}

                    <!-- KPI stats -->
                    <div class="stats-grid">
                        ${this.renderKpi('#3b82f6', 'fa-users',         totalResponses, 'إجمالي الاستجابات')}
                        ${this.renderKpi('#10b981', 'fa-check-circle',  completed.length, 'مكتملة')}
                        ${this.renderKpi('#f59e0b', 'fa-spinner',       inProgress.length, 'قيد التقدم')}
                        ${this.renderKpi('#ef4444', 'fa-ban',           abandoned.length, 'متروكة')}
                        ${this.renderKpi('#14b8a6', 'fa-percent',       completionRate + '%', 'معدل الإكمال')}
                        ${this.renderKpi('#8b5cf6', 'fa-clock',         timeStats.averageLabel, 'متوسط وقت الإكمال')}
                    </div>

                    <!-- Tabs -->
                    <div class="settings-segmented-nav" role="tablist">
                        <button class="settings-seg-btn ${this.activeTab === 'overview' ? 'active' : ''}" data-tab="overview">
                            <span class="settings-seg-btn__icon"><i class="fa-solid fa-chart-pie"></i></span>
                            <span class="settings-seg-btn__label">نظرة عامة</span>
                        </button>
                        <button class="settings-seg-btn ${this.activeTab === 'questions' ? 'active' : ''}" data-tab="questions">
                            <span class="settings-seg-btn__icon"><i class="fa-solid fa-list-check"></i></span>
                            <span class="settings-seg-btn__label">
                                تحليل الأسئلة
                                <span class="settings-seg-btn__count">${this.questions.length}</span>
                            </span>
                        </button>
                        <button class="settings-seg-btn ${this.activeTab === 'responses' ? 'active' : ''}" data-tab="responses">
                            <span class="settings-seg-btn__icon"><i class="fa-solid fa-comments"></i></span>
                            <span class="settings-seg-btn__label">
                                الاستجابات
                                <span class="settings-seg-btn__count">${totalResponses}</span>
                            </span>
                        </button>
                        <button class="settings-seg-btn ${this.activeTab === 'responses_table' ? 'active' : ''}" data-tab="responses_table">
                            <span class="settings-seg-btn__icon"><i class="fa-solid fa-table"></i></span>
                            <span class="settings-seg-btn__label">
                                الجدول
                                <span class="settings-seg-btn__count">${totalResponses}</span>
                            </span>
                        </button>
                    </div>

                    <div class="tabs-content">
                        <div class="tab-content" data-panel="overview" style="display:${this.activeTab === 'overview' ? 'block' : 'none'};">
                            ${this.renderOverviewPanel(survey, { completed, inProgress, abandoned, completionRate, timeStats })}
                        </div>
                        <div class="tab-content" data-panel="questions" style="display:${this.activeTab === 'questions' ? 'block' : 'none'};">
                            ${this.renderQuestionsPanel()}
                        </div>
                        <div class="tab-content" data-panel="responses" style="display:${this.activeTab === 'responses' ? 'block' : 'none'};">
                            ${this.renderResponsesPanel()}
                        </div>
                        <div class="tab-content" data-panel="responses_table" style="display:${this.activeTab === 'responses_table' ? 'block' : 'none'};">
                            ${this.renderResponsesTablePanel()}
                        </div>
                    </div>
                </div>
            `;

            this.bindDetailEvents();

            requestAnimationFrame(() => {
                this.animateChoiceBars(root);
                this.animateFunnel(root);
                this.animateTimelineBars(root);
            });
        }

        renderKpi(color, icon, value, label) {
            return `
                <div class="stat-card" style="--stat-color: ${color};">
                    <div class="stat-card-wrapper">
                        <div class="stat-icon"><i class="fa-solid ${icon}"></i></div>
                        <div class="stat-content">
                            <div class="stat-value">${value}</div>
                            <div class="stat-label">${label}</div>
                        </div>
                    </div>
                </div>
            `;
        }

        // ─────────── لوحة Overview ───────────

        renderOverviewPanel(survey, stats) {
            const status = getActualStatus(survey);
            const info = STATUS_INFO[status] || STATUS_INFO.draft;
            const total = this.responses.length;
            const completed = stats.completed.length;
            const inProgress = stats.inProgress.length;
            const abandoned = stats.abandoned.length;

            // قمع الإكمال
            const funnelMax = total || 1;
            const funnel = [
                { label: 'بدء',     icon: 'fa-play',    count: total,      pct: 100, color: this.cssVar('--ra-blue') },
                { label: 'مكتملة',  icon: 'fa-check',   count: completed,  pct: Math.round((completed / funnelMax) * 100), color: this.cssVar('--ra-green') },
                { label: 'جارية',   icon: 'fa-spinner', count: inProgress, pct: Math.round((inProgress / funnelMax) * 100), color: this.cssVar('--ra-amber') },
                { label: 'متروكة',  icon: 'fa-ban',     count: abandoned,  pct: Math.round((abandoned / funnelMax) * 100), color: this.cssVar('--ra-red') }
            ];

            const devices = this.computeDevices();
            const timeline = this.computeTimeline();

            return `
                <div class="ra-overview-grid">
                    <div class="ra-overview-col">
                        <!-- قمع الإكمال -->
                        <div class="card ra-panel">
                            <div class="card-header">
                                <h3><i class="fa-solid fa-filter"></i> نسبة الإكمال</h3>
                                <span class="badge badge--info">${total} استجابة</span>
                            </div>
                            <div class="card-body">
                                ${total === 0 ? this.emptyBlock('لم يتم استلام أي استجابات بعد', 'fa-inbox') : `
                                    <div class="ra-funnel">
                                        ${funnel.map(step => `
                                            <div class="ra-funnel-step">
                                                <div class="ra-funnel-step__label"><i class="fa-solid ${step.icon}"></i>${step.label}</div>
                                                <div class="ra-funnel-step__bar">
                                                    <div class="ra-funnel-step__fill"
                                                         style="background:${step.color};width:0%"
                                                         data-target="${step.pct}">${step.pct}%</div>
                                                </div>
                                                <div class="ra-funnel-step__count"><strong>${step.count}</strong> استجابة</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                `}
                            </div>
                        </div>

                        <!-- خط الزمني -->
                        <div class="card card--purple ra-panel">
                            <div class="card-header">
                                <h3><i class="fa-solid fa-chart-column"></i> الاستجابات عبر الوقت</h3>
                                <span class="ra-card-sub">آخر ${timeline.length} يوم</span>
                            </div>
                            <div class="card-body">
                                ${timeline.length === 0 ? this.emptyBlock('لا توجد بيانات كافية', 'fa-chart-line') : `
                                    <div class="ra-timeline">
                                        ${(() => {
                                            const max = Math.max(...timeline.map(d => d.count), 1);
                                            return timeline.map(d => {
                                                const h = Math.round((d.count / max) * 150);
                                                return `
                                                    <div class="ra-timeline-day">
                                                        <div class="ra-timeline-bar"
                                                             data-target="${h}"
                                                             style="height:0px"
                                                             data-tooltip="${d.label}: ${d.count}"></div>
                                                        <div class="ra-timeline-label">${d.shortLabel}</div>
                                                    </div>
                                                `;
                                            }).join('');
                                        })()}
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>

                    <div class="ra-overview-col">
                        <!-- معلومات الاستبيان -->
                        <div class="card card--neutral ra-panel">
                            <div class="card-header">
                                <h3><i class="fa-solid fa-circle-info"></i> معلومات الاستبيان</h3>
                            </div>
                            <div class="card-body">
                                <div class="ra-info-list">
                                    ${this.infoRow('fa-question',         'عدد الأسئلة',     this.questions.length)}
                                    ${this.infoRow('fa-eye',              'المشاهدات',       (survey.total_views || 0).toLocaleString('ar-SA'))}
                                    ${this.infoRow('fa-calendar-plus',    'تاريخ الإنشاء',   formatDate(survey.created_at, false))}
                                    ${survey.start_date ? this.infoRow('fa-calendar-check', 'تاريخ البدء', formatDate(survey.start_date, false)) : ''}
                                    ${survey.end_date   ? this.infoRow('fa-calendar-xmark', 'تاريخ الانتهاء', formatDate(survey.end_date, false)) : ''}
                                </div>
                            </div>
                        </div>

                        <!-- توزيع الأجهزة -->
                        <div class="card card--teal ra-panel">
                            <div class="card-header">
                                <h3><i class="fa-solid fa-mobile-screen-button"></i> الأجهزة المستخدمة</h3>
                            </div>
                            <div class="card-body">
                                ${this.renderDeviceDonut(devices)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        infoRow(icon, label, value) {
            return `
                <div class="ra-info-row">
                    <div class="ra-info-row__icon"><i class="fa-solid ${icon}"></i></div>
                    <div class="ra-info-row__content">
                        <span class="ra-info-row__label">${label}</span>
                        <span class="ra-info-row__value">${escapeHtml(value)}</span>
                    </div>
                </div>
            `;
        }

        emptyBlock(message, icon = 'fa-inbox') {
            return `
                <div class="ra-no-data">
                    <i class="fa-solid ${icon}"></i>
                    <h4>لا توجد بيانات</h4>
                    <p>${escapeHtml(message)}</p>
                </div>
            `;
        }

        renderDeviceDonut(devices) {
            const entries = Object.entries(devices);
            const total = entries.reduce((s, [, v]) => s + v, 0);
            if (total === 0) return this.emptyBlock('لا توجد بيانات أجهزة');

            const colorFor = (k) => {
                const map = {
                    mobile:  this.cssVar('--ra-green'),
                    tablet:  this.cssVar('--ra-amber'),
                    desktop: this.cssVar('--ra-blue'),
                    unknown: '#94a3b8'
                };
                return map[k] || '#94a3b8';
            };
            const labelFor = (k) => ({ mobile: 'جوال', tablet: 'تابلت', desktop: 'سطح مكتب', unknown: 'غير محدد' }[k] || k);

            // بناء conic-gradient
            let acc = 0;
            const stops = entries.map(([key, count]) => {
                const start = (acc / total) * 100;
                acc += count;
                const end = (acc / total) * 100;
                return `${colorFor(key)} ${start}% ${end}%`;
            }).join(', ');

            return `
                <div class="ra-donut">
                    <div class="ra-donut__chart" style="background:conic-gradient(${stops});">
                        <div class="ra-donut__hole">
                            <div class="ra-donut__total">${total}</div>
                            <div class="ra-donut__total-label">استجابة</div>
                        </div>
                    </div>
                    <div class="ra-donut__legend">
                        ${entries.map(([key, count]) => {
                            const pct = Math.round((count / total) * 100);
                            return `
                                <div class="ra-legend-item">
                                    <span class="ra-legend-item__swatch" style="background:${colorFor(key)};"></span>
                                    <span class="ra-legend-item__label">${labelFor(key)}</span>
                                    <span class="ra-legend-item__value">${pct}%</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // ─────────── لوحة الأسئلة ───────────

        renderQuestionsPanel() {
            if (!this.questions.length) return this.emptyBlock('لا توجد أسئلة في هذا الاستبيان', 'fa-clipboard-list');

            return `
                <div class="ra-questions">
                    ${this.questions.map((q, idx) => this.renderQuestionCard(q, idx + 1)).join('')}
                </div>
            `;
        }

        renderQuestionCard(question, order) {
            const answers = this.responses.flatMap(r => (r.survey_answers || []).filter(a => a.question_id === question.id));
            const cls = classifyType(question.question_type);

            let body = '';
            if (answers.length === 0) {
                body = this.emptyBlock('لا توجد إجابات بعد', 'fa-comment-slash');
            } else if (cls === 'choice') {
                body = this.renderChoiceBlock(answers);
            } else if (cls === 'numeric') {
                body = this.renderNumericBlock(answers, question);
            } else if (cls === 'bool') {
                body = this.renderBoolBlock(answers);
            } else {
                body = this.renderTextBlock(answers);
            }

            return `
                <article class="card ra-q-card">
                    <div class="card-header">
                        <h3>
                            <i class="ra-q-num">${order}</i>
                            ${escapeHtml(question.question_text)}
                        </h3>
                    </div>
                    <div class="card-body">
                        <div class="ra-q-meta">
                            <span class="ra-tag ra-tag--blue"><i class="fa-solid fa-tag"></i>${TYPE_LABELS[question.question_type] || question.question_type}</span>
                            <span class="ra-tag"><i class="fa-solid fa-comment"></i>${answers.length} إجابة</span>
                            ${question.is_required ? '<span class="ra-tag ra-tag--green"><i class="fa-solid fa-asterisk"></i>إجباري</span>' : ''}
                        </div>
                        ${body}
                    </div>
                </article>
            `;
        }

        renderChoiceBlock(answers) {
            const counts = {};
            let total = 0;
            answers.forEach(a => {
                const choices = Array.isArray(a.answer_json) ? a.answer_json : (a.answer_json !== null && a.answer_json !== undefined ? [a.answer_json] : []);
                choices.forEach(c => {
                    if (c === null || c === undefined || c === '') return;
                    counts[c] = (counts[c] || 0) + 1;
                    total++;
                });
            });

            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            if (!sorted.length) return this.emptyBlock('لا توجد إجابات صالحة');

            return `
                <div class="ra-choice-list">
                    ${sorted.map(([choice, count], i) => {
                        const pct = Math.round((count / total) * 100);
                        const color = PALETTE[i % PALETTE.length];
                        return `
                            <div class="ra-choice">
                                <div class="ra-choice__label">
                                    <span class="ra-choice__label-text">${escapeHtml(choice)}</span>
                                </div>
                                <div class="ra-choice__count"><strong>${count}</strong>(${pct}%)</div>
                                <div class="ra-choice__bar">
                                    <div class="ra-choice__bar-fill"
                                         data-target="${pct}"
                                         data-leader="${i === 0 ? 1 : 0}"
                                         style="background:${color};"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        renderNumericBlock(answers, question) {
            const values = answers.map(a => a.answer_number).filter(v => v !== null && v !== undefined);
            if (!values.length) return this.emptyBlock('لا توجد إجابات رقمية');

            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);
            const median = this.median(values);

            // توزيع تكراري
            const counts = {};
            values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
            const sortedEntries = Object.entries(counts).sort((a, b) => Number(a[0]) - Number(b[0]));
            const maxCount = Math.max(...Object.values(counts));

            const distribution = sortedEntries.length > 1 ? `
                <div class="ra-choice-list" style="margin-top:0.5rem;">
                    ${sortedEntries.map(([val, cnt], i) => {
                        const pct = Math.round((cnt / values.length) * 100);
                        const barPct = Math.round((cnt / maxCount) * 100);
                        const color = PALETTE[i % PALETTE.length];
                        return `
                            <div class="ra-choice">
                                <div class="ra-choice__label">
                                    <span class="ra-choice__label-text">${val}</span>
                                </div>
                                <div class="ra-choice__count"><strong>${cnt}</strong>(${pct}%)</div>
                                <div class="ra-choice__bar">
                                    <div class="ra-choice__bar-fill" data-target="${barPct}" style="background:${color};"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : '';

            return `
                <div class="ra-numeric">
                    <div class="ra-numeric__cell">
                        <div class="ra-numeric__label">المتوسط</div>
                        <div class="ra-numeric__value">${avg.toFixed(2)}</div>
                    </div>
                    <div class="ra-numeric__cell">
                        <div class="ra-numeric__label">الوسيط</div>
                        <div class="ra-numeric__value">${median.toFixed(2)}</div>
                    </div>
                    <div class="ra-numeric__cell">
                        <div class="ra-numeric__label">الأدنى</div>
                        <div class="ra-numeric__value">${min}</div>
                    </div>
                    <div class="ra-numeric__cell">
                        <div class="ra-numeric__label">الأعلى</div>
                        <div class="ra-numeric__value">${max}</div>
                    </div>
                    <div class="ra-numeric__cell">
                        <div class="ra-numeric__label">العدد</div>
                        <div class="ra-numeric__value">${values.length}</div>
                    </div>
                </div>
                ${distribution}
            `;
        }

        renderBoolBlock(answers) {
            const yes = answers.filter(a => a.answer_boolean === true).length;
            const no = answers.filter(a => a.answer_boolean === false).length;
            const total = yes + no;
            if (!total) return this.emptyBlock('لا توجد إجابات');

            const yesPct = Math.round((yes / total) * 100);
            const noPct = Math.round((no / total) * 100);

            return `
                <div class="ra-choice-list">
                    <div class="ra-choice">
                        <div class="ra-choice__label"><i class="fa-solid fa-check" style="color:var(--ra-green);"></i> نعم</div>
                        <div class="ra-choice__count"><strong>${yes}</strong>(${yesPct}%)</div>
                        <div class="ra-choice__bar">
                            <div class="ra-choice__bar-fill" data-target="${yesPct}" style="background:var(--ra-green);"></div>
                        </div>
                    </div>
                    <div class="ra-choice">
                        <div class="ra-choice__label"><i class="fa-solid fa-xmark" style="color:var(--ra-red);"></i> لا</div>
                        <div class="ra-choice__count"><strong>${no}</strong>(${noPct}%)</div>
                        <div class="ra-choice__bar">
                            <div class="ra-choice__bar-fill" data-target="${noPct}" style="background:var(--ra-red);"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        renderTextBlock(answers) {
            const texts = answers.map(a => a.answer_text).filter(t => t && String(t).trim());
            if (!texts.length) return this.emptyBlock('لا توجد إجابات نصية');

            return `
                <div class="ra-text-answers">
                    ${texts.map(t => `
                        <div class="ra-text-answer">
                            <i class="fa-solid fa-quote-right"></i>
                            <span>${escapeHtml(t)}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // ─────────── لوحة الاستجابات ───────────

        renderResponsesFiltersBar(suffix) {
            const f = this.responsesFilters;
            return `
                <div class="filters-bar">
                    <div class="filter-group">
                        <i class="fa-solid fa-search"></i>
                        <input type="text" id="ra-resp-search-${suffix}" data-resp-filter="search" placeholder="ابحث عن مستجيب..." value="${escapeHtml(f.search)}" />
                    </div>
                    <select class="filter-select" id="ra-resp-status-${suffix}" data-resp-filter="status">
                        <option value="">جميع الحالات</option>
                        <option value="completed"  ${f.status === 'completed'  ? 'selected' : ''}>المكتملة</option>
                        <option value="in_progress" ${f.status === 'in_progress' ? 'selected' : ''}>قيد التقدم</option>
                        <option value="abandoned"  ${f.status === 'abandoned'  ? 'selected' : ''}>المتروكة</option>
                    </select>
                    <select class="filter-select" id="ra-resp-sort-${suffix}" data-resp-filter="sort">
                        <option value="newest"  ${f.sort === 'newest'  ? 'selected' : ''}>الأحدث أولاً</option>
                        <option value="oldest"  ${f.sort === 'oldest'  ? 'selected' : ''}>الأقدم أولاً</option>
                        <option value="fastest" ${f.sort === 'fastest' ? 'selected' : ''}>الأسرع</option>
                        <option value="slowest" ${f.sort === 'slowest' ? 'selected' : ''}>الأبطأ</option>
                    </select>
                </div>
            `;
        }

        renderResponsesPanel() {
            if (!this.responses.length) {
                return this.emptyBlock('لم يتم استلام أي استجابات بعد', 'fa-inbox');
            }

            return `
                ${this.renderResponsesFiltersBar('cards')}
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-comments"></i> الاستجابات</h3>
                    </div>
                    <div class="card-body">
                        <div id="ra-resp-content"></div>
                    </div>
                </div>
            `;
        }

        renderResponsesTablePanel() {
            if (!this.responses.length) {
                return this.emptyBlock('لم يتم استلام أي استجابات بعد', 'fa-inbox');
            }

            return `
                ${this.renderResponsesFiltersBar('table')}
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-table"></i> جدول الاستجابات</h3>
                    </div>
                    <div class="card-body" id="ra-resp-table-content"></div>
                </div>
            `;
        }

        bindResponsesEvents() {
            const apply = () => {
                this.renderResponsesContent();
                this.renderResponsesTableContent();
            };

            document.querySelectorAll('[data-resp-filter]').forEach(el => {
                const key = el.dataset.respFilter;
                const evt = el.tagName === 'SELECT' ? 'change' : 'input';
                el.addEventListener(evt, (e) => {
                    this.responsesFilters[key] = e.target.value;
                    apply();
                });
            });

            // Render initial content for whichever panel is currently visible
            apply();
        }

        getFilteredResponses() {
            let list = [...this.responses];
            const { search, status, sort } = this.responsesFilters;

            if (status) list = list.filter(r => r.status === status);
            if (search) {
                const t = search.toLowerCase();
                list = list.filter(r => (r.user?.full_name || '').toLowerCase().includes(t));
            }
            list.sort((a, b) => {
                if (sort === 'newest')  return new Date(b.created_at) - new Date(a.created_at);
                if (sort === 'oldest')  return new Date(a.created_at) - new Date(b.created_at);
                if (sort === 'fastest') return (a.time_spent_seconds || 0) - (b.time_spent_seconds || 0);
                if (sort === 'slowest') return (b.time_spent_seconds || 0) - (a.time_spent_seconds || 0);
                return 0;
            });
            return list;
        }

        renderResponsesContent() {
            const container = document.getElementById('ra-resp-content');
            if (!container) return;

            const list = this.getFilteredResponses();
            if (!list.length) {
                container.innerHTML = this.emptyBlock('لا توجد استجابات تطابق الفلاتر', 'fa-filter-circle-xmark');
                return;
            }

            container.innerHTML = `
                <div class="uc-grid">
                    ${list.map(r => this.renderResponseCard(r)).join('')}
                </div>
            `;

            this.bindResponseOpenHandlers(container);
        }

        renderResponsesTableContent() {
            const container = document.getElementById('ra-resp-table-content');
            if (!container) return;

            const list = this.getFilteredResponses();
            if (!list.length) {
                container.innerHTML = this.emptyBlock('لا توجد استجابات تطابق الفلاتر', 'fa-filter-circle-xmark');
                return;
            }

            container.innerHTML = this.renderResponsesTable(list);
            this.bindResponseOpenHandlers(container);
        }

        bindResponseOpenHandlers(container) {
            container.querySelectorAll('[data-action="open-response"]').forEach(el => {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = el.dataset.responseId;
                    this.openResponseDetails(id);
                });
            });
        }

        renderResponseCard(response) {
            const status = response.status;
            const statusLabel = status === 'completed' ? 'مكتملة' : status === 'in_progress' ? 'قيد التقدم' : 'متروكة';
            const statusIcon  = status === 'completed' ? 'fa-circle-check' : status === 'in_progress' ? 'fa-hourglass-half' : 'fa-circle-xmark';
            const variant = status === 'completed' ? 'uc-card--success' : status === 'in_progress' ? 'uc-card--warning' : 'uc-card--danger';
            const btnClass = status === 'completed' ? 'btn-success' : status === 'in_progress' ? 'btn-warning' : 'btn-danger';
            const userName = response.user?.full_name || (response.is_anonymous ? 'مستجيب مجهول' : 'غير معروف');
            const initial = (userName || '?').trim().charAt(0).toUpperCase();
            const date = formatDate(response.created_at);
            const duration = formatDuration(response.time_spent_seconds);
            const device = response.device_type || 'غير محدد';
            const deviceIcon = device === 'mobile' ? 'fa-mobile' : device === 'tablet' ? 'fa-tablet' : device === 'desktop' ? 'fa-desktop' : 'fa-circle-question';

            return `
                <article class="uc-card ${variant}">
                    <div class="uc-card__header">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon"><i class="fa-solid fa-user"></i></div>
                            <div class="uc-card__header-info">
                                <h3 class="uc-card__title">${escapeHtml(userName)}</h3>
                                <span class="uc-card__badge"><i class="fa-solid ${statusIcon}"></i>${statusLabel}</span>
                            </div>
                        </div>
                    </div>
                    <div class="uc-card__body">
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-calendar"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">التاريخ</span>
                                <span class="uc-card__info-value">${date}</span>
                            </div>
                        </div>
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-clock"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">المدة</span>
                                <span class="uc-card__info-value">${duration}</span>
                            </div>
                        </div>
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid ${deviceIcon}"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">الجهاز</span>
                                <span class="uc-card__info-value">${this.deviceLabel(device)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="uc-card__footer">
                        <button type="button" class="btn ${btnClass}" data-action="open-response" data-response-id="${response.id}">
                            <i class="fa-solid fa-eye"></i> عرض الإجابات
                        </button>
                    </div>
                </article>
            `;
        }

        renderResponsesTable(list) {
            const questions = this.questions || [];

            const rows = list.map((r, i) => {
                const userName = r.user?.full_name || (r.is_anonymous ? 'مستجيب مجهول' : 'غير معروف');
                const status = r.status;
                const statusLabel = status === 'completed' ? 'مكتملة' : status === 'in_progress' ? 'قيد التقدم' : 'متروكة';
                const statusBadge = status === 'completed' ? 'uc-badge--success' : status === 'in_progress' ? 'uc-badge--warning' : 'uc-badge--danger';

                const answersByQuestion = new Map();
                (r.survey_answers || []).forEach(a => answersByQuestion.set(a.question_id, a));

                const questionCells = questions.map(q => {
                    const a = answersByQuestion.get(q.id);
                    const value = a
                        ? this.formatAnswerForDisplay(a, q)
                        : `<span class="cell-muted"><i class="fa-solid fa-minus"></i></span>`;
                    return `<td>${value}</td>`;
                }).join('');

                return `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${escapeHtml(userName)}</td>
                        <td><span class="uc-badge ${statusBadge}"><i class="fa-solid fa-circle" style="font-size:0.55rem;"></i>${statusLabel}</span></td>
                        <td>${formatDate(r.created_at)}</td>
                        ${questionCells}
                    </tr>
                `;
            }).join('');

            const questionHeaders = questions
                .map(q => `<th title="${escapeHtml(q.question_text)}">${escapeHtml(q.question_text)}</th>`)
                .join('');

            return `
                <div class="data-table-wrap">
                    <div class="data-table-scroll">
                        <table class="data-table data-table--striped data-table--with-index">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>المستجيب</th>
                                    <th>الحالة</th>
                                    <th>التاريخ</th>
                                    ${questionHeaders}
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        // ─────────── مودال تفاصيل الاستجابة ───────────

        openResponseDetails(responseId) {
            const id = typeof responseId === 'string' ? parseInt(responseId, 10) : responseId;
            const response = this.responses.find(r => r.id === id);
            if (!response) return;

            const userName = response.user?.full_name || (response.is_anonymous ? 'مستجيب مجهول' : 'غير معروف');
            const status = response.status;
            const statusLabel = status === 'completed' ? 'مكتملة' : status === 'in_progress' ? 'قيد التقدم' : 'متروكة';
            const statusType  = status === 'completed' ? 'success' : status === 'in_progress' ? 'warning' : 'danger';
            const statusBox   = status === 'completed' ? 'box-success' : status === 'in_progress' ? 'box-warning' : 'box-danger';
            const statusIcon  = status === 'completed' ? 'fa-circle-check' : status === 'in_progress' ? 'fa-hourglass-half' : 'fa-circle-xmark';

            const answersByQuestion = new Map();
            (response.survey_answers || []).forEach(a => answersByQuestion.set(a.question_id, a));

            const answerItems = (this.questions || [])
                .map(q => {
                    const a = answersByQuestion.get(q.id);
                    const valueHtml = a
                        ? this.formatAnswerForDisplay(a, q)
                        : `<span class="modal-detail-empty"><i class="fa-solid fa-ban"></i> لم تتم الإجابة</span>`;
                    return `
                        <div class="modal-detail-item${a ? '' : ' modal-detail-item--empty'}">
                            <span class="modal-detail-label">${escapeHtml(q.question_text)}</span>
                            <span class="modal-detail-value">${valueHtml}</span>
                        </div>
                    `;
                }).join('');

            const html = `
                <div class="modal-info-box ${statusBox}">
                    <i class="fa-solid ${statusIcon}"></i>
                    <span>حالة هذه الاستجابة: <strong>${statusLabel}</strong></span>
                </div>

                <div class="modal-section">
                    <h3><i class="fa-solid fa-id-card"></i> معلومات الاستجابة</h3>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">المستجيب</span>
                            <span class="modal-detail-value">${escapeHtml(userName)}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">الحالة</span>
                            <span class="modal-detail-value">${statusLabel}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">التاريخ</span>
                            <span class="modal-detail-value">${formatDate(response.created_at)}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">المدة</span>
                            <span class="modal-detail-value">${formatDuration(response.time_spent_seconds)}</span>
                        </div>
                    </div>
                </div>

                <hr class="modal-divider">

                <div class="modal-section">
                    <h3><i class="fa-solid fa-comments"></i> الإجابات</h3>
                    ${(this.questions && this.questions.length)
                        ? `<div class="modal-detail-grid">${answerItems}</div>`
                        : this.emptyBlock('لا توجد أسئلة في هذا الاستبيان', 'fa-comment-slash')}
                </div>
            `;

            if (window.ModalHelper && typeof window.ModalHelper.show === 'function') {
                window.ModalHelper.show({
                    title: 'تفاصيل الاستجابة',
                    html,
                    size: 'lg',
                    type: statusType,
                    iconClass: `fa-solid ${statusIcon}`,
                    showClose: true
                });
            } else {
                const modal = document.createElement('div');
                modal.className = 'modal-backdrop active';
                modal.innerHTML = `
                    <div class="modal modal-lg modal-${statusType} active">
                        <div class="modal-header">
                            <div class="modal-icon"><i class="fa-solid ${statusIcon}"></i></div>
                            <div class="modal-header-content">
                                <h2 class="modal-title">تفاصيل الاستجابة</h2>
                            </div>
                            <button class="modal-close" type="button"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="modal-body">${html}</div>
                    </div>
                `;
                document.body.appendChild(modal);
                modal.addEventListener('click', (e) => {
                    if (e.target === modal || e.target.closest('.modal-close')) modal.remove();
                });
            }
        }

        formatAnswerForDisplay(answer, question) {
            const t = question.question_type;
            if (t === 'rating_stars') {
                const v = answer.answer_number || 0;
                const max = question.validation_rules?.max || 5;
                let stars = '';
                for (let i = 1; i <= max; i++) stars += `<i class="fa-${i <= v ? 'solid' : 'regular'} fa-star" style="color:#f59e0b;"></i> `;
                return `<div>${stars} <span style="color:var(--ra-muted);font-size:0.85rem;">(${v} من ${max})</span></div>`;
            }
            if (t === 'rating_hearts') {
                const v = answer.answer_number || 0;
                const max = question.validation_rules?.max || 5;
                let hearts = '';
                for (let i = 1; i <= max; i++) hearts += `<i class="fa-${i <= v ? 'solid' : 'regular'} fa-heart" style="color:#ef4444;"></i> `;
                return `<div>${hearts}</div>`;
            }
            if (t === 'rating_emojis') {
                const v = answer.answer_number || 0;
                const emojis = ['😢', '😞', '😐', '😊', '😍'];
                return `<span style="font-size:1.4rem;">${emojis[v - 1] || '😐'}</span>`;
            }
            if (t === 'yes_no') {
                if (answer.answer_boolean === true)  return `<span class="ra-mini-badge ra-mini-badge--green"><i class="fa-solid fa-check"></i>نعم</span>`;
                if (answer.answer_boolean === false) return `<span class="ra-mini-badge ra-mini-badge--red"><i class="fa-solid fa-xmark"></i>لا</span>`;
                return '<span style="color:var(--ra-muted);">—</span>';
            }
            if (t === 'multiple_choice') {
                const arr = Array.isArray(answer.answer_json) ? answer.answer_json : [answer.answer_json];
                return arr.filter(Boolean).map(c => `<span class="ra-mini-badge">${escapeHtml(c)}</span>`).join('');
            }
            if (t === 'single_choice' || t === 'dropdown') {
                if (answer.answer_json) return `<span class="ra-mini-badge">${escapeHtml(answer.answer_json)}</span>`;
            }
            if (answer.answer_text) return escapeHtml(answer.answer_text);
            if (answer.answer_number !== null && answer.answer_number !== undefined) return `<strong>${answer.answer_number}</strong>`;
            if (answer.answer_date) return escapeHtml(answer.answer_date);
            if (answer.answer_time) return escapeHtml(answer.answer_time);
            if (answer.answer_datetime) return escapeHtml(answer.answer_datetime);
            return '<span style="color:var(--ra-muted);">لا توجد إجابة</span>';
        }

        // ─────────── أحداث Detail ───────────

        bindDetailEvents() {
            document.getElementById('ra-back-btn')?.addEventListener('click', () => {
                // الرجوع إلى تبويب "جميع الاستبيانات" — لم تعد هناك صفحة قائمة نتائج
                this.currentSurvey = null;
                if (typeof window.navigateToSection === 'function') {
                    window.navigateToSection('surveys-all-section');
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            document.getElementById('ra-refresh-detail')?.addEventListener('click', async () => {
                const btn = document.getElementById('ra-refresh-detail');
                btn.querySelector('i')?.classList.add('fa-spin');
                await this.loadSurveyAnalytics(this.currentSurvey.id);
                showToast('success', 'تم تحديث البيانات');
            });

            document.getElementById('ra-export-btn')?.addEventListener('click', () => this.openExportModal());
            // share button removed from header – sharing is now done from survey cards

            // التبويبات
            const raRoot = document.getElementById('ra-root');
            raRoot?.querySelectorAll('.settings-segmented-nav .settings-seg-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.activeTab = btn.dataset.tab;
                    raRoot.querySelectorAll('.settings-segmented-nav .settings-seg-btn').forEach(b => b.classList.remove('active'));
                    raRoot.querySelectorAll('.tabs-content > .tab-content').forEach(p => { p.style.display = 'none'; });
                    btn.classList.add('active');
                    const targetPanel = raRoot.querySelector(`.tabs-content > .tab-content[data-panel="${this.activeTab}"]`);
                    if (targetPanel) targetPanel.style.display = 'block';

                    if (this.activeTab === 'responses' || this.activeTab === 'responses_table') {
                        this.bindResponsesEvents();
                    }

                    requestAnimationFrame(() => {
                        const root = document.getElementById('ra-root');
                        this.animateChoiceBars(root);
                        this.animateFunnel(root);
                        this.animateTimelineBars(root);
                    });
                });
            });

            if (this.activeTab === 'responses' || this.activeTab === 'responses_table') this.bindResponsesEvents();
        }

        // ─────────── حسابات ───────────

        computeTimeStats(completedResponses) {
            const times = completedResponses.map(r => r.time_spent_seconds || 0).filter(t => t > 0);
            if (!times.length) return { averageLabel: '0 ث', average: 0, median: 0, min: 0, max: 0, distribution: [] };
            const sum = times.reduce((a, b) => a + b, 0);
            const avg = sum / times.length;
            return {
                averageLabel: formatDuration(Math.round(avg)),
                average: avg,
                median: this.median(times),
                min: Math.min(...times),
                max: Math.max(...times),
                distribution: times
            };
        }

        computeDevices() {
            const devices = {};
            this.responses.forEach(r => {
                const d = r.device_type || 'unknown';
                devices[d] = (devices[d] || 0) + 1;
            });
            return devices;
        }

        computeTimeline() {
            // آخر 14 يوم — حتى لو كانت الاستجابات قديمة، نعرض الأيام التي توجد فيها استجابات
            if (!this.responses.length) return [];

            // اجمع حسب اليوم (تواريخ ميلادية بسيطة لتجنب تنوع تنسيقات النوافذ)
            const buckets = new Map();
            this.responses.forEach(r => {
                const d = new Date(r.created_at);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                buckets.set(key, (buckets.get(key) || 0) + 1);
            });

            const sorted = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
            const last = sorted.slice(-14);

            return last.map(([key, count]) => {
                const d = new Date(key);
                return {
                    label: d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
                    shortLabel: d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
                    count
                };
            });
        }

        median(values) {
            const sorted = [...values].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
        }

        deviceLabel(device) {
            return ({ mobile: 'جوال', tablet: 'تابلت', desktop: 'سطح مكتب', unknown: 'غير محدد' })[device] || device;
        }

        cssVar(name) {
            return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#3b82f6';
        }

        statusColor(status) {
            const map = {
                active: 'var(--ra-green)', closed: '#6b7280', paused: 'var(--ra-amber)',
                scheduled: 'var(--ra-blue)', draft: '#94a3b8'
            };
            return map[status] || 'var(--ra-blue)';
        }

        statusColorRgb(status) {
            const map = {
                active: 'var(--ra-green-rgb)', closed: '107,114,128', paused: 'var(--ra-amber-rgb)',
                scheduled: 'var(--ra-blue-rgb)', draft: '148,163,184'
            };
            return map[status] || 'var(--ra-blue-rgb)';
        }

        // ─────────── تحريك ───────────

        animateChoiceBars(root) {
            (root || document).querySelectorAll('.ra-choice__bar-fill[data-target]').forEach(el => {
                const v = parseFloat(el.dataset.target) || 0;
                el.style.width = `${Math.max(0, Math.min(100, v))}%`;
            });
        }

        animateFunnel(root) {
            (root || document).querySelectorAll('.ra-funnel-step__fill[data-target]').forEach(el => {
                const v = parseFloat(el.dataset.target) || 0;
                el.style.width = `${Math.max(0, Math.min(100, v))}%`;
            });
        }

        animateTimelineBars(root) {
            (root || document).querySelectorAll('.ra-timeline-bar[data-target]').forEach(el => {
                const v = parseFloat(el.dataset.target) || 0;
                el.style.height = `${v}px`;
            });
        }

        // ─────────── التصدير ───────────

        openExportModal() {
            if (!this.currentSurvey || !this.responses.length) {
                showToast('error', 'لا توجد بيانات للتصدير');
                return;
            }

            const counts = {
                completed:   this.responses.filter(r => r.status === 'completed').length,
                in_progress: this.responses.filter(r => r.status === 'in_progress').length,
                abandoned:   this.responses.filter(r => r.status === 'abandoned').length
            };

            const html = `
                <div class="modal-section">
                    <h3><i class="fa-solid fa-filter"></i> اختر الحالات التي تريد تصديرها إلى ملف CSV</h3>
                    <div class="form-checkbox-group">
                        <label class="form-checkbox">
                            <input type="checkbox" id="ra-exp-all" />
                            <span>
                                <span class="form-checkbox-label">تحديد الكل</span>
                                <span class="form-checkbox-hint">${this.responses.length} استجابة</span>
                            </span>
                        </label>
                        ${this.exportCheckRow('completed',   'مكتملة',     counts.completed,   true)}
                        ${this.exportCheckRow('in_progress', 'قيد التقدم', counts.in_progress, false)}
                        ${this.exportCheckRow('abandoned',   'متروكة',     counts.abandoned,   false)}
                    </div>
                </div>
            `;

            const bindSelectAll = () => {
                const all = document.getElementById('ra-exp-all');
                if (!all) return;
                all.addEventListener('change', () => {
                    document.querySelectorAll('.ra-exp-cb').forEach(cb => cb.checked = all.checked);
                });
            };

            if (window.ModalHelper && typeof window.ModalHelper.show === 'function') {
                let modalRef = null;
                Promise.resolve(window.ModalHelper.show({
                    title: 'تصدير البيانات',
                    iconClass: 'fa-solid fa-download',
                    html,
                    size: 'md',
                    showClose: true,
                    showFooter: true,
                    footerButtons: [
                        { text: 'إلغاء', class: 'btn btn-outline' },
                        {
                            text: '<i class="fa-solid fa-download"></i> تصدير CSV',
                            class: 'btn btn-primary',
                            keepOpen: true,
                            callback: () => {
                                if (this.executeExport()) modalRef?.close?.();
                            }
                        }
                    ]
                })).then(ref => { modalRef = ref; });
                setTimeout(bindSelectAll, 50);
            } else {
                const modal = document.createElement('div');
                modal.className = 'modal-backdrop active';
                modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;display:flex;align-items:center;justify-content:center;';
                modal.innerHTML = `
                    <div style="background:#fff;border-radius:16px;padding:1.5rem;min-width:340px;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                        <h3 style="margin:0 0 1rem;display:flex;align-items:center;gap:0.5rem;">
                            <i class="fa-solid fa-download" style="color:var(--ra-blue);"></i> تصدير البيانات
                        </h3>
                        ${html}
                        <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1rem;">
                            <button class="ra-action" data-cancel>إلغاء</button>
                            <button class="ra-action is-primary" data-confirm><i class="fa-solid fa-download"></i> تصدير CSV</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                modal.addEventListener('click', (e) => {
                    if (e.target === modal || e.target.closest('[data-cancel]')) modal.remove();
                    if (e.target.closest('[data-confirm]')) {
                        if (this.executeExport()) modal.remove();
                    }
                });
                setTimeout(bindSelectAll, 50);
            }
        }

        exportCheckRow(value, label, count, checked) {
            return `
                <label class="form-checkbox">
                    <input type="checkbox" class="ra-exp-cb" value="${value}" ${checked ? 'checked' : ''} />
                    <span>
                        <span class="form-checkbox-label">${label}</span>
                        <span class="form-checkbox-hint">${count} استجابة</span>
                    </span>
                </label>
            `;
        }

        // ─────────── المشاركة ───────────

        async openShareModal() {
            if (!this.currentSurvey) return;

            const surveyId = this.currentSurvey.id;

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

            // ترتيب أبجدي
            availableUsers.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

            const sharesRowsHtml = currentShares.map(s => `
                <tr data-share-id="${s.id}">
                    <td>${escapeHtml(s.shared_with_profile?.full_name || 'غير معروف')}</td>
                    <td>
                        <button class="btn btn-danger btn-sm" data-remove-share="${s.id}" title="إزالة المشاركة">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

            const userOptionsHtml = availableUsers.map(u => {
                const label = u.committee ? `${u.role} - ${u.committee}` : u.role;
                return `<option value="${u.id}">${escapeHtml(u.name)}${label ? ` (${escapeHtml(label)})` : ''}</option>`;
            }).join('');

            const html = `
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
                                <th>العضو</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="ra-shares-tbody">
                            ${sharesRowsHtml || '<tr class="empty-row"><td colspan="2" style="text-align:center;color:var(--text-secondary);">لا توجد مشاركات حالياً</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;

            if (window.ModalHelper && typeof window.ModalHelper.show === 'function') {
                window.ModalHelper.show({
                    title: `مشاركة نتائج: ${escapeHtml(this.currentSurvey.title)}`,
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
                            <h3><i class="fa-solid fa-share-nodes"></i> مشاركة نتائج: ${escapeHtml(this.currentSurvey.title)}</h3>
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
            const self = this;
            setTimeout(() => {
                // إضافة مشاركة عند اختيار مستخدم
                const shareUserSelect = document.getElementById('ra-share-user');
                if (shareUserSelect) {
                    shareUserSelect.addEventListener('change', async () => {
                        const userId = shareUserSelect.value;
                        if (!userId) return;
                        const userName = shareUserSelect.options[shareUserSelect.selectedIndex].text;

                        shareUserSelect.disabled = true;
                        const result = await self.executeShare(userId);
                        shareUserSelect.disabled = false;
                        if (!result) { shareUserSelect.value = ''; return; }

                        // إضافة صف جديد للجدول
                        const tbody = document.getElementById('ra-shares-tbody');
                        if (tbody) {
                            tbody.querySelector('.empty-row')?.remove();
                            const tr = document.createElement('tr');
                            tr.dataset.shareId = result.id;
                            tr.innerHTML = `
                                <td>${escapeHtml(userName)}</td>
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
                const raTbody = document.getElementById('ra-shares-tbody');
                document.querySelectorAll('[data-remove-share]').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const el = e.currentTarget;
                        const shareId = el.dataset.removeShare;
                        await self.removeShare(shareId);
                        el.closest('tr')?.remove();
                        if (raTbody && !raTbody.querySelector('tr')) {
                            raTbody.innerHTML = '<tr class="empty-row"><td colspan="2" style="text-align:center;color:var(--text-secondary);">لا توجد مشاركات حالياً</td></tr>';
                        }
                    });
                });
            }, 80);
        }

        async executeShare(userId) {
            const effectiveUserId = await window.AuthManager.getEffectiveUserId();

            const { data, error } = await sb.from('survey_sharing').insert({
                survey_id: this.currentSurvey.id,
                shared_by: effectiveUserId,
                shared_with: userId
            }).select().single();

            if (error) {
                if (error.code === '23505') {
                    showToast('error', 'تم مشاركة هذا الاستبيان مع هذا المستخدم مسبقاً');
                } else {
                    console.error('[ra] share error', error);
                    showToast('error', 'حدث خطأ أثناء المشاركة');
                }
                return null;
            }

            showToast('success', 'تمت المشاركة بنجاح');
            return data;
        }

        async removeShare(shareId) {
            const { error } = await sb.from('survey_sharing').delete().eq('id', shareId);
            if (error) {
                console.error('[ra] remove share error', error);
                showToast('error', 'حدث خطأ أثناء إزالة المشاركة');
                return;
            }
            showToast('success', 'تم إزالة المشاركة');
        }

        executeExport() {
            const selected = [...document.querySelectorAll('.ra-exp-cb:checked')].map(cb => cb.value);
            if (!selected.length) {
                showToast('error', 'يرجى اختيار حالة واحدة على الأقل');
                return false;
            }

            const rows = this.responses.filter(r => selected.includes(r.status));
            if (!rows.length) {
                showToast('error', 'لا توجد بيانات للحالات المختارة');
                return false;
            }

            let csv = '\uFEFF';
            const headers = ['التاريخ', 'المستجيب', 'الحالة', 'الوقت المستغرق', 'الجهاز'];
            this.questions.forEach(q => headers.push(q.question_text));
            csv += headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\n';

            const statusLabel = { completed: 'مكتملة', in_progress: 'قيد التقدم', abandoned: 'متروكة' };

            rows.forEach(response => {
                const row = [
                    formatDate(response.created_at),
                    response.user?.full_name || (response.is_anonymous ? 'مجهول' : 'غير معروف'),
                    statusLabel[response.status] || response.status,
                    formatDuration(response.time_spent_seconds),
                    this.deviceLabel(response.device_type || 'unknown')
                ];
                this.questions.forEach(q => {
                    const a = (response.survey_answers || []).find(x => x.question_id === q.id);
                    let value = '';
                    if (a) {
                        if (a.answer_text) value = a.answer_text;
                        else if (a.answer_number !== null && a.answer_number !== undefined) value = a.answer_number;
                        else if (a.answer_boolean !== null) value = a.answer_boolean ? 'نعم' : 'لا';
                        else if (a.answer_json) value = Array.isArray(a.answer_json) ? a.answer_json.join('; ') : a.answer_json;
                        else if (a.answer_date) value = a.answer_date;
                        else if (a.answer_time) value = a.answer_time;
                    }
                    row.push(value);
                });
                csv += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${this.currentSurvey.title}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            showToast('success', `تم تصدير ${rows.length} استجابة بنجاح`);
            return true;
        }
    }

    // Singleton + بوابة عامة لـ surveys-manager.js
    window.resultsAnalytics = new ResultsAnalytics();
})();
