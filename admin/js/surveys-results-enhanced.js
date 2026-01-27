/**
 * نظام عرض نتائج الاستبيانات المحسّن
 * فصل الإحصائيات عن الاستجابات مع تحليلات متقدمة
 */

(function() {
    const sb = window.sbClient;
    let currentSurveyData = null;
    let currentResponses = [];
    let currentQuestions = [];

    class SurveysResultsEnhanced {
        constructor() {
            this.setupTabsNavigation();
            this.setupExportButtons();
        }

        setupTabsNavigation() {
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab-btn') || e.target.closest('.tab-btn')) {
                    const btn = e.target.classList.contains('tab-btn') ? e.target : e.target.closest('.tab-btn');
                    const tabName = btn.dataset.tab;
                    
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                    
                    btn.classList.add('active');
                    document.getElementById(`${tabName}-tab`)?.classList.add('active');
                }
            });
        }

        setupExportButtons() {
            const exportExcel = document.getElementById('exportExcelBtn');
            const exportCSV = document.getElementById('exportCSVBtn');
            const exportPDF = document.getElementById('exportPDFBtn');

            if (exportExcel) {
                exportExcel.addEventListener('click', () => this.exportToExcel());
            }
            if (exportCSV) {
                exportCSV.addEventListener('click', () => this.exportToCSV());
            }
            if (exportPDF) {
                exportPDF.addEventListener('click', () => this.exportToPDF());
            }
        }

        async loadSurveyResults(surveyId) {
            try {
                const { data: survey, error: surveyError } = await sb
                    .from('surveys')
                    .select('*')
                    .eq('id', surveyId)
                    .single();

                if (surveyError) throw surveyError;

                const { data: questions, error: questionsError } = await sb
                    .from('survey_questions')
                    .select('*')
                    .eq('survey_id', surveyId)
                    .order('question_order');

                if (questionsError) throw questionsError;

                const { data: responses, error: responsesError } = await sb
                    .from('survey_responses')
                    .select(`
                        *,
                        user:profiles(full_name),
                        survey_answers(*)
                    `)
                    .eq('survey_id', surveyId)
                    .order('created_at', { ascending: false });

                if (responsesError) throw responsesError;

                currentSurveyData = survey;
                currentQuestions = questions;
                currentResponses = this.markAbandonedResponses(responses);

                document.getElementById('resultsTabsContainer').style.display = 'block';
                document.getElementById('resultsActions').style.display = 'flex';

                this.renderStatistics();
                this.renderResponses();
                this.renderAnalytics();

            } catch (error) {
                console.error('Error loading results:', error);
                this.showError('حدث خطأ أثناء تحميل النتائج');
            }
        }

        markAbandonedResponses(responses) {
            const ABANDONED_THRESHOLD_MINUTES = 10;
            const now = new Date();

            return responses.map(response => {
                if (response.status === 'in_progress') {
                    const startedAt = new Date(response.started_at);
                    const minutesSinceStart = (now - startedAt) / (1000 * 60);
                    
                    if (minutesSinceStart > ABANDONED_THRESHOLD_MINUTES) {
                        return { ...response, status: 'abandoned' };
                    }
                }
                return response;
            });
        }

        renderStatistics() {
            const container = document.getElementById('surveyStatisticsContainer');
            if (!container) return;

            const completedResponses = currentResponses.filter(r => r.status === 'completed');
            const inProgressResponses = currentResponses.filter(r => r.status === 'in_progress');
            const abandonedResponses = currentResponses.filter(r => r.status === 'abandoned');
            
            const completionRate = currentResponses.length > 0 
                ? Math.round((completedResponses.length / currentResponses.length) * 100) 
                : 0;

            const avgTimeSpent = completedResponses.length > 0
                ? Math.round(completedResponses.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) / completedResponses.length)
                : 0;

            container.innerHTML = `
                <!-- مؤشرات الأداء الرئيسية -->
                <div class="kpi-grid">
                    <div class="kpi-card">
                        <div class="kpi-value">${currentResponses.length}</div>
                        <div class="kpi-label">إجمالي الاستجابات</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-value">${completedResponses.length}</div>
                        <div class="kpi-label">استجابات مكتملة</div>
                        <div class="kpi-change positive">
                            <i class="fa-solid fa-arrow-up"></i>
                            ${completionRate}%
                        </div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-value">${inProgressResponses.length}</div>
                        <div class="kpi-label">قيد التقدم</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-value">${abandonedResponses.length}</div>
                        <div class="kpi-label">متروكة</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-value">${currentSurveyData.total_views || 0}</div>
                        <div class="kpi-label">المشاهدات</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-value">${this.formatTime(avgTimeSpent)}</div>
                        <div class="kpi-label">متوسط الوقت</div>
                    </div>
                </div>

                <!-- إحصائيات الأسئلة -->
                <h3 style="margin: 2rem 0 1rem 0; font-family: fb; color: var(--main-blue);">
                    <i class="fa-solid fa-chart-bar"></i>
                    إحصائيات الأسئلة
                </h3>
                
                <div class="results-questions">
                    ${currentQuestions.map(q => this.renderQuestionStatistics(q)).join('')}
                </div>
            `;
        }

        renderQuestionStatistics(question) {
            const answers = currentResponses.flatMap(r => 
                r.survey_answers.filter(a => a.question_id === question.id)
            );

            return `
                <div class="card" style="margin-bottom: 1.5rem;">
                    <div class="card-header">
                        <h3>${this.escapeHtml(question.question_text)}</h3>
                        <span class="badge">${answers.length} إجابة</span>
                    </div>
                    <div class="card-body">
                        ${this.renderAnswerStatistics(question, answers)}
                    </div>
                </div>
            `;
        }

        renderAnswerStatistics(question, answers) {
            if (answers.length === 0) {
                return '<p class="text-muted" style="text-align: center; padding: 2rem;">لا توجد إجابات بعد</p>';
            }

            if (['single_choice', 'multiple_choice', 'dropdown'].includes(question.question_type)) {
                return this.renderChoiceStatistics(answers);
            }

            if (['linear_scale', 'rating_stars', 'rating_hearts', 'rating_emojis', 'slider', 'number'].includes(question.question_type)) {
                return this.renderNumericStatistics(answers);
            }

            if (question.question_type === 'yes_no') {
                return this.renderYesNoStatistics(answers);
            }

            return this.renderTextStatistics(answers);
        }

        renderChoiceStatistics(answers) {
            const counts = {};
            let total = 0;

            answers.forEach(a => {
                const choices = Array.isArray(a.answer_json) ? a.answer_json : [a.answer_json];
                choices.forEach(choice => {
                    if (choice) {
                        counts[choice] = (counts[choice] || 0) + 1;
                        total++;
                    }
                });
            });

            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

            return `
                <div class="choice-results">
                    ${sorted.map(([choice, count]) => {
                        const percentage = Math.round((count / total) * 100);
                        const barWidth = (count / maxCount) * 100;
                        return `
                            <div class="choice-result-item">
                                <div class="choice-label">${this.escapeHtml(choice)}</div>
                                <div class="choice-bar">
                                    <div class="choice-bar-fill" style="width: ${barWidth}%"></div>
                                </div>
                                <div class="choice-stats">${count} (${percentage}%)</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        renderNumericStatistics(answers) {
            const values = answers.map(a => a.answer_number).filter(v => v !== null && v !== undefined);
            
            if (values.length === 0) {
                return '<p class="text-muted">لا توجد إجابات رقمية</p>';
            }

            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);
            const median = this.calculateMedian(values);

            return `
                <div class="numeric-results">
                    <div class="stat-item">
                        <div class="stat-label">المتوسط</div>
                        <div class="stat-value">${avg.toFixed(2)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">الوسيط</div>
                        <div class="stat-value">${median.toFixed(2)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">الحد الأدنى</div>
                        <div class="stat-value">${min}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">الحد الأقصى</div>
                        <div class="stat-value">${max}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">عدد الإجابات</div>
                        <div class="stat-value">${values.length}</div>
                    </div>
                </div>
            `;
        }

        renderYesNoStatistics(answers) {
            const yesCount = answers.filter(a => a.answer_boolean === true).length;
            const noCount = answers.filter(a => a.answer_boolean === false).length;
            const total = yesCount + noCount;

            if (total === 0) {
                return '<p class="text-muted">لا توجد إجابات</p>';
            }

            const yesPercentage = Math.round((yesCount / total) * 100);
            const noPercentage = Math.round((noCount / total) * 100);

            return `
                <div class="choice-results">
                    <div class="choice-result-item">
                        <div class="choice-label">نعم</div>
                        <div class="choice-bar">
                            <div class="choice-bar-fill" style="width: ${yesPercentage}%"></div>
                        </div>
                        <div class="choice-stats">${yesCount} (${yesPercentage}%)</div>
                    </div>
                    <div class="choice-result-item">
                        <div class="choice-label">لا</div>
                        <div class="choice-bar">
                            <div class="choice-bar-fill" style="width: ${noPercentage}%"></div>
                        </div>
                        <div class="choice-stats">${noCount} (${noPercentage}%)</div>
                    </div>
                </div>
            `;
        }

        renderTextStatistics(answers) {
            const textAnswers = answers.filter(a => a.answer_text && a.answer_text.trim());
            
            if (textAnswers.length === 0) {
                return '<p class="text-muted">لا توجد إجابات نصية</p>';
            }

            return `
                <div style="margin-bottom: 1rem;">
                    <strong>عدد الإجابات النصية: ${textAnswers.length}</strong>
                </div>
                <div class="text-results">
                    ${textAnswers.slice(0, 10).map(a => `
                        <div class="text-answer">${this.escapeHtml(a.answer_text)}</div>
                    `).join('')}
                    ${textAnswers.length > 10 ? `
                        <p class="text-muted" style="text-align: center; margin-top: 1rem;">
                            وهناك ${textAnswers.length - 10} إجابة إضافية...
                        </p>
                    ` : ''}
                </div>
            `;
        }

        renderResponses() {
            const container = document.getElementById('surveyResponsesContainer');
            if (!container) return;

            const completedResponses = currentResponses.filter(r => r.status === 'completed');

            if (completedResponses.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-inbox"></i>
                        <h3>لا توجد استجابات مكتملة</h3>
                        <p>لم يتم استلام أي استجابات مكتملة بعد</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <!-- فلاتر الاستجابات -->
                <div class="responses-filters">
                    <div class="filter-group">
                        <i class="fa-solid fa-search"></i>
                        <input type="text" id="responsesSearchInput" placeholder="البحث في الاستجابات..." />
                    </div>
                    <select id="responsesStatusFilter" class="filter-select">
                        <option value="">جميع الحالات</option>
                        <option value="completed" selected>مكتملة</option>
                        <option value="in_progress">قيد التقدم</option>
                        <option value="abandoned">متروكة</option>
                    </select>
                    <select id="responsesSortFilter" class="filter-select">
                        <option value="newest">الأحدث أولاً</option>
                        <option value="oldest">الأقدم أولاً</option>
                        <option value="fastest">الأسرع</option>
                        <option value="slowest">الأبطأ</option>
                    </select>
                </div>

                <!-- قائمة الاستجابات -->
                <div id="responsesListContainer">
                    ${completedResponses.map(r => this.renderResponseCard(r)).join('')}
                </div>
            `;

            this.setupResponsesFilters();
        }

        renderResponseCard(response) {
            const userName = response.user?.full_name || (response.is_anonymous ? 'مجهول' : 'غير معروف');
            const statusClass = response.status === 'completed' ? 'completed' : 
                               response.status === 'in_progress' ? 'in-progress' : 'abandoned';
            const statusText = response.status === 'completed' ? 'مكتملة' : 
                              response.status === 'in_progress' ? 'قيد التقدم' : 'متروكة';

            return `
                <div class="response-card">
                    <div class="response-card-header">
                        <div>
                            <strong>${userName}</strong>
                            <span class="response-status ${statusClass}">${statusText}</span>
                        </div>
                        <div class="response-card-meta">
                            <div class="meta-item">
                                <i class="fa-solid fa-calendar"></i>
                                ${this.formatDate(response.created_at)}
                            </div>
                            <div class="meta-item">
                                <i class="fa-solid fa-clock"></i>
                                ${this.formatTime(response.time_spent_seconds)}
                            </div>
                            <div class="meta-item">
                                <i class="fa-solid fa-mobile"></i>
                                ${response.device_type || 'غير محدد'}
                            </div>
                        </div>
                    </div>
                    <div class="response-card-answers">
                        ${this.renderResponseAnswers(response)}
                    </div>
                </div>
            `;
        }

        renderResponseAnswers(response) {
            return response.survey_answers.map(answer => {
                const question = currentQuestions.find(q => q.id === answer.question_id);
                if (!question) return '';

                const answerDisplay = this.formatAnswerDisplay(answer, question);

                return `
                    <div class="answer-item">
                        <div class="answer-question">
                            ${this.escapeHtml(question.question_text)}
                            <span class="answer-type-badge">${this.getQuestionTypeLabel(question.question_type)}</span>
                        </div>
                        <div class="answer-value">${answerDisplay}</div>
                    </div>
                `;
            }).join('');
        }

        formatAnswerDisplay(answer, question) {
            const type = question.question_type;

            if (type === 'rating_stars') {
                const rating = answer.answer_number || 0;
                const maxRating = question.validation_rules?.max || 5;
                return this.renderStarsRating(rating, maxRating);
            }

            if (type === 'rating_hearts') {
                const rating = answer.answer_number || 0;
                const maxRating = question.validation_rules?.max || 5;
                return this.renderHeartsRating(rating, maxRating);
            }

            if (type === 'rating_emojis') {
                const rating = answer.answer_number || 0;
                return this.renderEmojisRating(rating);
            }

            if (type === 'linear_scale') {
                const value = answer.answer_number || 0;
                const min = question.validation_rules?.min || 1;
                const max = question.validation_rules?.max || 5;
                return this.renderLinearScale(value, min, max);
            }

            if (type === 'slider') {
                const value = answer.answer_number || 0;
                const min = question.validation_rules?.min || 0;
                const max = question.validation_rules?.max || 100;
                return this.renderSlider(value, min, max);
            }

            if (type === 'yes_no') {
                return this.renderYesNo(answer.answer_boolean);
            }

            if (type === 'single_choice' || type === 'dropdown') {
                return `<span class="choice-badge">${this.escapeHtml(answer.answer_json || '')}</span>`;
            }

            if (type === 'multiple_choice') {
                const choices = Array.isArray(answer.answer_json) ? answer.answer_json : [answer.answer_json];
                return choices.map(c => `<span class="choice-badge">${this.escapeHtml(c)}</span>`).join(' ');
            }

            if (answer.answer_text) return this.escapeHtml(answer.answer_text);
            if (answer.answer_number !== null) return `<strong>${answer.answer_number}</strong>`;
            if (answer.answer_boolean !== null) return answer.answer_boolean ? 'نعم' : 'لا';
            if (answer.answer_json) {
                return Array.isArray(answer.answer_json) 
                    ? answer.answer_json.join(', ') 
                    : this.escapeHtml(String(answer.answer_json));
            }
            if (answer.answer_date) return answer.answer_date;
            if (answer.answer_time) return answer.answer_time;
            if (answer.answer_datetime) return answer.answer_datetime;

            return '<span class="text-muted">لا توجد إجابة</span>';
        }

        renderStarsRating(rating, max) {
            let stars = '';
            for (let i = 1; i <= max; i++) {
                if (i <= rating) {
                    stars += '<i class="fa-solid fa-star" style="color: #fbbf24;"></i>';
                } else {
                    stars += '<i class="fa-regular fa-star" style="color: #d1d5db;"></i>';
                }
            }
            return `
                <div class="rating-display">
                    ${stars}
                    <span class="rating-text">${rating} من ${max}</span>
                </div>
            `;
        }

        renderHeartsRating(rating, max) {
            let hearts = '';
            for (let i = 1; i <= max; i++) {
                if (i <= rating) {
                    hearts += '<i class="fa-solid fa-heart" style="color: #ef4444;"></i>';
                } else {
                    hearts += '<i class="fa-regular fa-heart" style="color: #d1d5db;"></i>';
                }
            }
            return `
                <div class="rating-display">
                    ${hearts}
                    <span class="rating-text">${rating} من ${max}</span>
                </div>
            `;
        }

        renderEmojisRating(rating) {
            const emojis = ['😢', '😞', '😐', '😊', '😍'];
            const labels = ['سيء جداً', 'سيء', 'متوسط', 'جيد', 'ممتاز'];
            const emoji = emojis[rating - 1] || '😐';
            const label = labels[rating - 1] || 'غير محدد';
            
            return `
                <div class="rating-display">
                    <span style="font-size: 2rem;">${emoji}</span>
                    <span class="rating-text">${label} (${rating}/5)</span>
                </div>
            `;
        }

        renderLinearScale(value, min, max) {
            const percentage = ((value - min) / (max - min)) * 100;
            return `
                <div class="scale-display">
                    <div class="scale-bar">
                        <div class="scale-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="scale-text">${value} من ${min} إلى ${max}</span>
                </div>
            `;
        }

        renderSlider(value, min, max) {
            const percentage = ((value - min) / (max - min)) * 100;
            return `
                <div class="scale-display">
                    <div class="scale-bar">
                        <div class="scale-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="scale-text">${value} (${min} - ${max})</span>
                </div>
            `;
        }

        renderYesNo(value) {
            if (value === true) {
                return '<span class="yes-badge"><i class="fa-solid fa-check"></i> نعم</span>';
            } else if (value === false) {
                return '<span class="no-badge"><i class="fa-solid fa-times"></i> لا</span>';
            }
            return '<span class="text-muted">لا توجد إجابة</span>';
        }

        getQuestionTypeLabel(type) {
            const labels = {
                'short_text': 'نص قصير',
                'long_text': 'نص طويل',
                'single_choice': 'اختيار واحد',
                'multiple_choice': 'اختيارات متعددة',
                'dropdown': 'قائمة منسدلة',
                'linear_scale': 'مقياس خطي',
                'rating_stars': 'تقييم نجوم',
                'rating_hearts': 'تقييم قلوب',
                'rating_emojis': 'تقييم إيموجي',
                'number': 'رقم',
                'email': 'بريد إلكتروني',
                'phone': 'هاتف',
                'url': 'رابط',
                'date': 'تاريخ',
                'time': 'وقت',
                'datetime': 'تاريخ ووقت',
                'yes_no': 'نعم/لا',
                'slider': 'شريط تمرير'
            };
            return labels[type] || type;
        }

        renderAnalytics() {
            const container = document.getElementById('surveyAnalyticsContainer');
            if (!container) return;

            const completedResponses = currentResponses.filter(r => r.status === 'completed');
            
            // تحليل الأجهزة
            const deviceStats = this.analyzeDevices(currentResponses);
            
            // تحليل الأوقات
            const timeStats = this.analyzeCompletionTimes(completedResponses);
            
            // تحليل معدل الإكمال حسب الوقت
            const completionTrend = this.analyzeCompletionTrend(currentResponses);

            container.innerHTML = `
                <div class="analytics-grid">
                    <div class="analytics-card">
                        <div class="analytics-card-icon" style="color: var(--accent-blue);">
                            <i class="fa-solid fa-chart-line"></i>
                        </div>
                        <div class="analytics-card-value">${completedResponses.length}</div>
                        <div class="analytics-card-label">استجابات مكتملة</div>
                        <div class="analytics-card-trend up">
                            <i class="fa-solid fa-arrow-up"></i>
                            ${this.calculateGrowth(completedResponses)}%
                        </div>
                    </div>
                    
                    <div class="analytics-card">
                        <div class="analytics-card-icon" style="color: var(--success);">
                            <i class="fa-solid fa-percentage"></i>
                        </div>
                        <div class="analytics-card-value">${this.calculateCompletionRate()}%</div>
                        <div class="analytics-card-label">معدل الإكمال</div>
                    </div>
                    
                    <div class="analytics-card">
                        <div class="analytics-card-icon" style="color: var(--warning);">
                            <i class="fa-solid fa-hourglass-half"></i>
                        </div>
                        <div class="analytics-card-value">${timeStats.average}</div>
                        <div class="analytics-card-label">متوسط وقت الإكمال</div>
                    </div>
                    
                    <div class="analytics-card">
                        <div class="analytics-card-icon" style="color: var(--info);">
                            <i class="fa-solid fa-eye"></i>
                        </div>
                        <div class="analytics-card-value">${currentSurveyData.total_views || 0}</div>
                        <div class="analytics-card-label">إجمالي المشاهدات</div>
                    </div>
                </div>

                <!-- توزيع الأجهزة -->
                <div class="chart-container">
                    <div class="chart-header">
                        <h3 class="chart-title">
                            <i class="fa-solid fa-mobile-screen"></i>
                            توزيع الأجهزة
                        </h3>
                    </div>
                    <div class="chart-body">
                        ${this.renderDeviceChart(deviceStats)}
                    </div>
                </div>

                <!-- معدل الإكمال حسب الوقت -->
                <div class="chart-container">
                    <div class="chart-header">
                        <h3 class="chart-title">
                            <i class="fa-solid fa-chart-area"></i>
                            معدل الإكمال حسب الوقت
                        </h3>
                    </div>
                    <div class="chart-body">
                        ${this.renderCompletionTrendChart(completionTrend)}
                    </div>
                </div>

                <!-- توزيع أوقات الإكمال -->
                <div class="chart-container">
                    <div class="chart-header">
                        <h3 class="chart-title">
                            <i class="fa-solid fa-clock"></i>
                            توزيع أوقات الإكمال
                        </h3>
                    </div>
                    <div class="chart-body">
                        ${this.renderTimeDistributionChart(timeStats)}
                    </div>
                </div>
            `;
        }

        analyzeDevices(responses) {
            const devices = {};
            responses.forEach(r => {
                const device = r.device_type || 'unknown';
                devices[device] = (devices[device] || 0) + 1;
            });
            return devices;
        }

        analyzeCompletionTimes(responses) {
            const times = responses.map(r => r.time_spent_seconds || 0).filter(t => t > 0);
            if (times.length === 0) return { average: '0 ث', median: 0, min: 0, max: 0 };

            const sum = times.reduce((a, b) => a + b, 0);
            const avg = sum / times.length;
            const median = this.calculateMedian(times);
            const min = Math.min(...times);
            const max = Math.max(...times);

            return {
                average: this.formatTime(Math.round(avg)),
                median: Math.round(median),
                min: Math.round(min),
                max: Math.round(max),
                distribution: times
            };
        }

        analyzeCompletionTrend(responses) {
            const trend = {};
            responses.forEach(r => {
                const date = new Date(r.created_at).toLocaleDateString('ar-SA');
                if (!trend[date]) {
                    trend[date] = { total: 0, completed: 0 };
                }
                trend[date].total++;
                if (r.status === 'completed') {
                    trend[date].completed++;
                }
            });
            return trend;
        }

        renderDeviceChart(deviceStats) {
            const total = Object.values(deviceStats).reduce((a, b) => a + b, 0);
            return `
                <div class="choice-results">
                    ${Object.entries(deviceStats).map(([device, count]) => {
                        const percentage = Math.round((count / total) * 100);
                        const deviceIcon = device === 'mobile' ? 'fa-mobile' : 
                                         device === 'tablet' ? 'fa-tablet' : 'fa-desktop';
                        const deviceName = device === 'mobile' ? 'جوال' : 
                                          device === 'tablet' ? 'تابلت' : 
                                          device === 'desktop' ? 'سطح مكتب' : 'غير محدد';
                        return `
                            <div class="choice-result-item">
                                <div class="choice-label">
                                    <i class="fa-solid ${deviceIcon}"></i>
                                    ${deviceName}
                                </div>
                                <div class="choice-bar">
                                    <div class="choice-bar-fill" style="width: ${percentage}%"></div>
                                </div>
                                <div class="choice-stats">${count} (${percentage}%)</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        renderCompletionTrendChart(trend) {
            const dates = Object.keys(trend).sort();
            return `
                <div class="choice-results">
                    ${dates.map(date => {
                        const data = trend[date];
                        const rate = Math.round((data.completed / data.total) * 100);
                        return `
                            <div class="choice-result-item">
                                <div class="choice-label">${date}</div>
                                <div class="choice-bar">
                                    <div class="choice-bar-fill" style="width: ${rate}%"></div>
                                </div>
                                <div class="choice-stats">${data.completed}/${data.total} (${rate}%)</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        renderTimeDistributionChart(timeStats) {
            if (!timeStats.distribution || timeStats.distribution.length === 0) {
                return '<p class="text-muted" style="text-align: center;">لا توجد بيانات كافية</p>';
            }

            const ranges = [
                { label: 'أقل من دقيقة', min: 0, max: 60 },
                { label: '1-3 دقائق', min: 60, max: 180 },
                { label: '3-5 دقائق', min: 180, max: 300 },
                { label: '5-10 دقائق', min: 300, max: 600 },
                { label: 'أكثر من 10 دقائق', min: 600, max: Infinity }
            ];

            const distribution = ranges.map(range => {
                const count = timeStats.distribution.filter(t => t >= range.min && t < range.max).length;
                return { label: range.label, count };
            });

            const maxCount = Math.max(...distribution.map(d => d.count));

            return `
                <div class="choice-results">
                    ${distribution.map(d => {
                        const percentage = timeStats.distribution.length > 0 
                            ? Math.round((d.count / timeStats.distribution.length) * 100) 
                            : 0;
                        const barWidth = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                        return `
                            <div class="choice-result-item">
                                <div class="choice-label">${d.label}</div>
                                <div class="choice-bar">
                                    <div class="choice-bar-fill" style="width: ${barWidth}%"></div>
                                </div>
                                <div class="choice-stats">${d.count} (${percentage}%)</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        setupResponsesFilters() {
            const searchInput = document.getElementById('responsesSearchInput');
            const statusFilter = document.getElementById('responsesStatusFilter');
            const sortFilter = document.getElementById('responsesSortFilter');

            if (searchInput) {
                searchInput.addEventListener('input', () => this.filterResponses());
            }
            if (statusFilter) {
                statusFilter.addEventListener('change', () => this.filterResponses());
            }
            if (sortFilter) {
                sortFilter.addEventListener('change', () => this.filterResponses());
            }
        }

        filterResponses() {
            // سيتم تنفيذها لاحقاً
        }

        calculateMedian(values) {
            const sorted = [...values].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 === 0 
                ? (sorted[mid - 1] + sorted[mid]) / 2 
                : sorted[mid];
        }

        calculateCompletionRate() {
            if (currentResponses.length === 0) return 0;
            const completed = currentResponses.filter(r => r.status === 'completed').length;
            return Math.round((completed / currentResponses.length) * 100);
        }

        calculateGrowth(responses) {
            // حساب النمو بناءً على آخر 7 أيام مقارنة بالـ 7 أيام السابقة
            const now = new Date();
            const last7Days = responses.filter(r => {
                const date = new Date(r.created_at);
                const diffDays = (now - date) / (1000 * 60 * 60 * 24);
                return diffDays <= 7;
            }).length;

            const previous7Days = responses.filter(r => {
                const date = new Date(r.created_at);
                const diffDays = (now - date) / (1000 * 60 * 60 * 24);
                return diffDays > 7 && diffDays <= 14;
            }).length;

            if (previous7Days === 0) return last7Days > 0 ? 100 : 0;
            return Math.round(((last7Days - previous7Days) / previous7Days) * 100);
        }

        formatTime(seconds) {
            if (!seconds || seconds === 0) return '0 ث';
            if (seconds < 60) return `${seconds} ث`;
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            if (minutes < 60) return secs > 0 ? `${minutes} د ${secs} ث` : `${minutes} د`;
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours} س ${mins} د`;
        }

        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        exportToExcel() {
            this.showNotification('info', 'جاري تصدير البيانات إلى Excel...');
            // سيتم تنفيذها لاحقاً
        }

        exportToCSV() {
            if (!currentResponses || currentResponses.length === 0) {
                this.showNotification('error', 'لا توجد بيانات للتصدير');
                return;
            }

            const completedResponses = currentResponses.filter(r => r.status === 'completed');
            
            // إنشاء CSV
            let csv = '\uFEFF'; // BOM for UTF-8
            
            // الهيدر
            const headers = ['التاريخ', 'المستخدم', 'الحالة', 'الوقت المستغرق', 'الجهاز'];
            currentQuestions.forEach(q => {
                headers.push(q.question_text);
            });
            csv += headers.join(',') + '\n';

            // البيانات
            completedResponses.forEach(response => {
                const row = [
                    this.formatDate(response.created_at),
                    response.user?.full_name || (response.is_anonymous ? 'مجهول' : 'غير معروف'),
                    response.status === 'completed' ? 'مكتملة' : 'غير مكتملة',
                    this.formatTime(response.time_spent_seconds),
                    response.device_type || 'غير محدد'
                ];

                currentQuestions.forEach(q => {
                    const answer = response.survey_answers.find(a => a.question_id === q.id);
                    let value = '';
                    if (answer) {
                        if (answer.answer_text) value = answer.answer_text;
                        else if (answer.answer_number !== null) value = answer.answer_number;
                        else if (answer.answer_boolean !== null) value = answer.answer_boolean ? 'نعم' : 'لا';
                        else if (answer.answer_json) {
                            value = Array.isArray(answer.answer_json) 
                                ? answer.answer_json.join('; ') 
                                : answer.answer_json;
                        }
                    }
                    row.push(`"${String(value).replace(/"/g, '""')}"`);
                });

                csv += row.join(',') + '\n';
            });

            // تنزيل الملف
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `survey_${currentSurveyData.id}_${Date.now()}.csv`;
            link.click();

            this.showNotification('success', 'تم تصدير البيانات بنجاح');
        }

        exportToPDF() {
            this.showNotification('info', 'جاري تصدير البيانات إلى PDF...');
            // سيتم تنفيذها لاحقاً
        }

        showNotification(type, message) {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type} show`;
            notification.innerHTML = `
                <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            `;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        showError(message) {
            this.showNotification('error', message);
        }
    }

    window.surveysResultsEnhanced = new SurveysResultsEnhanced();
})();
