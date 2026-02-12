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
            this.setupBackButton();
        }

        setupTabsNavigation() {
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab-btn') || e.target.closest('.tab-btn')) {
                    const btn = e.target.classList.contains('tab-btn') ? e.target : e.target.closest('.tab-btn');
                    const tabName = btn.dataset.tab;
                    
                    // تحديث التبويبات النشطة
                    const tabsContainer = btn.closest('.tabs-nav');
                    if (tabsContainer) {
                        tabsContainer.querySelectorAll('.tab-btn').forEach(b => {
                            b.classList.remove('active');
                            b.style.borderBottom = 'none';
                            b.style.color = '#6b7280';
                        });
                        btn.classList.add('active');
                        btn.style.borderBottom = '3px solid #3b82f6';
                        btn.style.color = '#3b82f6';
                    }
                    
                    // إخفاء جميع المحتويات وإظهار المحتوى المطلوب
                    document.querySelectorAll('.tab-content').forEach(p => p.style.display = 'none');
                    const targetTab = document.getElementById(`${tabName}-tab`);
                    if (targetTab) {
                        targetTab.style.display = 'block';
                        // عرض جدول الاستجابات عند التبديل إليه
                        if (tabName === 'responses-table') {
                            this.renderResponsesTable();
                        }
                    }
                }
            });
        }

        setupExportButtons() {
            // زر التصدير الجديد في الهيدر
            const exportBtn = document.getElementById('exportSurveyDataBtn');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this.exportToCSV());
            }
        }

        setupBackButton() {
            // زر الرجوع الجديد في الهيدر
            const backBtn = document.getElementById('backToSurveysListHeader');
            if (backBtn) {
                backBtn.addEventListener('click', () => this.backToSurveysList());
            }
            
            // زر الرجوع القديم (للتوافق)
            const oldBackBtn = document.getElementById('backToSurveysList');
            if (oldBackBtn) {
                oldBackBtn.addEventListener('click', () => this.backToSurveysList());
            }
        }

        backToSurveysList() {
            // إعادة العنوان الأصلي
            const titleText = document.getElementById('resultsTitleText');
            const subtitle = document.getElementById('resultsSubtitle');
            if (titleText) titleText.textContent = 'نتائج وتحليلات الاستبيانات';
            if (subtitle) subtitle.textContent = 'عرض الإحصائيات والاستجابات والتحليلات المتقدمة';
            
            // إخفاء أزرار الهيدر
            const headerActions = document.getElementById('resultsHeaderActions');
            if (headerActions) headerActions.style.display = 'none';
            
            // إظهار قائمة الاستبيانات وإخفاء التبويبات
            const selectorContainer = document.getElementById('surveySelectorContainer');
            const tabsContainer = document.getElementById('resultsTabsContainer');
            if (selectorContainer) selectorContainer.style.display = 'block';
            if (tabsContainer) tabsContainer.style.display = 'none';
            
            // إعادة تعيين البيانات
            currentSurveyData = null;
            currentResponses = [];
            currentQuestions = [];
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
                document.getElementById('surveySelectorContainer').style.display = 'none';
                
                // إظهار أزرار الهيدر وتحديث العنوان
                const headerActions = document.getElementById('resultsHeaderActions');
                if (headerActions) headerActions.style.display = 'flex';
                
                const titleText = document.getElementById('resultsTitleText');
                if (titleText) titleText.textContent = survey.title;
                
                const subtitle = document.getElementById('resultsSubtitle');
                if (subtitle) subtitle.textContent = survey.description || 'عرض نتائج وتحليلات الاستبيان';

                this.renderStatistics();
                this.renderResponses();
                this.renderAnalytics();
                this.renderResponsesTable();

            } catch (error) {
                console.error('Error loading results:', error);
                this.showError('حدث خطأ أثناء تحميل النتائج');
            }
        }

        markAbandonedResponses(responses) {
            const ABANDONED_THRESHOLD_MINUTES = 60; // ساعة واحدة
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

            // قسم الإحصائيات يعرض فقط إحصائيات الأسئلة
            container.innerHTML = `
                <!-- إحصائيات الأسئلة -->
                <h3>
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
                <div class="card">
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
                return '<p class="text-muted">لا توجد إجابات بعد</p>';
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
                                    <div class="choice-bar-fill"></div>
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
                            <div class="choice-bar-fill"></div>
                        </div>
                        <div class="choice-stats">${yesCount} (${yesPercentage}%)</div>
                    </div>
                    <div class="choice-result-item">
                        <div class="choice-label">لا</div>
                        <div class="choice-bar">
                            <div class="choice-bar-fill"></div>
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
                <div>
                    <strong>عدد الإجابات النصية: ${textAnswers.length}</strong>
                </div>
                <div class="text-results">
                    ${textAnswers.slice(0, 10).map(a => `
                        <div class="text-answer">${this.escapeHtml(a.answer_text)}</div>
                    `).join('')}
                    ${textAnswers.length > 10 ? `
                        <p class="text-muted">
                            وهناك ${textAnswers.length - 10} إجابة إضافية...
                        </p>
                    ` : ''}
                </div>
            `;
        }

        renderResponses() {
            const container = document.getElementById('surveyResponsesContainer');
            if (!container) return;

            // عرض جميع الاستجابات وليس فقط المكتملة
            const allResponses = currentResponses;

            if (allResponses.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-inbox"></i>
                        <h3>لا توجد استجابات</h3>
                        <p>لم يتم استلام أي استجابات بعد</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <!-- فلاتر الاستجابات -->
                <div class="filters-bar mb-2rem">
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
                <div id="responsesListContainer" class="applications-cards-grid">
                    ${allResponses.map(r => this.renderResponseCard(r)).join('')}
                </div>
            `;

            this.setupResponsesFilters();
        }

        renderResponseCard(response) {
            const userName = response.user?.full_name || (response.is_anonymous ? 'المستجيب' : 'غير معروف');
            const statusClass = response.status === 'completed' ? 'badge-success' : 
                               response.status === 'in_progress' ? 'badge-warning' : 'badge-danger';
            const statusText = response.status === 'completed' ? 'مكتملة' : 
                              response.status === 'in_progress' ? 'قيد التقدم' : 'متروكة';

            return `
                <div class="application-card">
                    <div class="application-card-header">
                        <div class="applicant-info">
                            <div class="applicant-avatar">
                                <i class="fa-solid fa-user"></i>
                            </div>
                            <div class="applicant-details">
                                <h3 class="applicant-name">${this.escapeHtml(userName)}</h3>
                                <span class="badge ${statusClass}">${statusText}</span>
                            </div>
                        </div>
                    </div>

                    <div class="application-card-body">
                        <div class="application-info-grid">
                            <div class="info-item">
                                <i class="fa-solid fa-calendar"></i>
                                <div class="info-content">
                                    <span class="info-label">تاريخ الإرسال</span>
                                    <span class="info-value">${this.formatDate(response.created_at)}</span>
                                </div>
                            </div>

                            <div class="info-item">
                                <i class="fa-solid fa-clock"></i>
                                <div class="info-content">
                                    <span class="info-label">وقت الإكمال</span>
                                    <span class="info-value">${this.formatTime(response.time_spent_seconds)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="application-card-footer">
                        <button class="btn btn--info btn--sm" onclick="window.surveysResultsEnhanced.viewResponseDetails('${response.id}')">
                            <i class="fa-solid fa-eye"></i>
                            عرض التفاصيل
                        </button>
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
                    stars += '<i class="fa-solid fa-star"></i>';
                } else {
                    stars += '<i class="fa-regular fa-star"></i>';
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
                    hearts += '<i class="fa-solid fa-heart"></i>';
                } else {
                    hearts += '<i class="fa-regular fa-heart"></i>';
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
                    <span>${emoji}</span>
                    <span class="rating-text">${label} (${rating}/5)</span>
                </div>
            `;
        }

        renderResponsesTable() {
            const container = document.getElementById('surveyResponsesTableContainer');
            if (!container) return;

            if (!currentResponses || currentResponses.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-table"></i>
                        <p>لا توجد استجابات لعرضها</p>
                    </div>
                `;
                return;
            }

            const completedResponses = currentResponses.filter(r => r.status === 'completed');

            container.innerHTML = `
                <div class="card">
                    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0;">
                            <i class="fa-solid fa-table"></i>
                            جدول الاستجابات (${completedResponses.length} استجابة مكتملة)
                        </h3>
                    </div>
                    <div class="card-body" style="overflow-x: auto;">
                        <table class="table" style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f8fafc;">
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0; white-space: nowrap;">#</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0; white-space: nowrap;">المستجيب</th>
                                    ${currentQuestions.map(q => `
                                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0; min-width: 150px;" title="${this.escapeHtml(q.question_text)}">
                                            ${this.escapeHtml(q.question_text.length > 30 ? q.question_text.substring(0, 30) + '...' : q.question_text)}
                                        </th>
                                    `).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${completedResponses.map((response, index) => {
                                    const userName = response.user?.full_name || (response.is_anonymous ? 'المستجيب' : 'غير معروف');
                                    return `
                                        <tr style="border-bottom: 1px solid #e2e8f0;">
                                            <td style="padding: 10px; text-align: right;">${index + 1}</td>
                                            <td style="padding: 10px; text-align: right; white-space: nowrap;">${this.escapeHtml(userName)}</td>
                                            ${currentQuestions.map(q => {
                                                const answer = response.survey_answers.find(a => a.question_id === q.id);
                                                const answerText = this.getAnswerTextForTable(answer, q);
                                                return `<td style="padding: 10px; text-align: right;">${answerText}</td>`;
                                            }).join('')}
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        getAnswerTextForTable(answer, question) {
            if (!answer) return '<span style="color: #94a3b8;">-</span>';
            
            if (answer.answer_text) {
                const text = answer.answer_text;
                return this.escapeHtml(text.length > 50 ? text.substring(0, 50) + '...' : text);
            }
            if (answer.answer_number !== null && answer.answer_number !== undefined) {
                return answer.answer_number;
            }
            if (answer.answer_boolean !== null && answer.answer_boolean !== undefined) {
                return answer.answer_boolean ? '<span style="color: #10b981;">نعم</span>' : '<span style="color: #ef4444;">لا</span>';
            }
            if (answer.answer_json) {
                if (Array.isArray(answer.answer_json)) {
                    return this.escapeHtml(answer.answer_json.join('، '));
                }
                return this.escapeHtml(JSON.stringify(answer.answer_json));
            }
            return '<span style="color: #94a3b8;">-</span>';
        }

        renderLinearScale(value, min, max) {
            const percentage = ((value - min) / (max - min)) * 100;
            return `
                <div class="scale-display">
                    <div class="scale-bar">
                        <div class="scale-fill"></div>
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
                        <div class="scale-fill"></div>
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
            const inProgressResponses = currentResponses.filter(r => r.status === 'in_progress');
            const abandonedResponses = currentResponses.filter(r => r.status === 'abandoned');
            
            // تحليل الأجهزة
            const deviceStats = this.analyzeDevices(currentResponses);
            
            // تحليل الأوقات
            const timeStats = this.analyzeCompletionTimes(completedResponses);
            
            // تحليل معدل الإكمال حسب الوقت
            const completionTrend = this.analyzeCompletionTrend(currentResponses);
            
            const completionRate = this.calculateCompletionRate();
            const growth = this.calculateGrowth(completedResponses);

            container.innerHTML = `
                <!-- كروت الإحصائيات الرئيسية - تم نقلها من قسم الإحصائيات -->
                <div class="stats-grid mb-2rem">
                    <div class="stat-card" style="--stat-color: #3b82f6;">
                        <div class="stat-card-wrapper">
                            <div class="stat-icon">
                                <i class="fa-solid fa-users"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${currentResponses.length}</div>
                                <div class="stat-label">إجمالي الاستجابات</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stat-card" style="--stat-color: #10b981;">
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
                    
                    <div class="stat-card" style="--stat-color: #f59e0b;">
                        <div class="stat-card-wrapper">
                            <div class="stat-icon">
                                <i class="fa-solid fa-spinner"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${inProgressResponses.length}</div>
                                <div class="stat-label">قيد التقدم</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stat-card" style="--stat-color: #ef4444;">
                        <div class="stat-card-wrapper">
                            <div class="stat-icon">
                                <i class="fa-solid fa-ban"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${abandonedResponses.length}</div>
                                <div class="stat-label">متروكة</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="stats-grid mb-2rem">
                    <div class="stat-card" style="--stat-color: #14b8a6;">
                        <div class="stat-card-wrapper">
                            <div class="stat-icon">
                                <i class="fa-solid fa-eye"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${currentSurveyData.total_views || 0}</div>
                                <div class="stat-label">المشاهدات</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stat-card" style="--stat-color: #8b5cf6;">
                        <div class="stat-card-wrapper">
                            <div class="stat-icon">
                                <i class="fa-solid fa-clock"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${timeStats.average}</div>
                                <div class="stat-label">متوسط الوقت</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stat-card" style="--stat-color: #6366f1;">
                        <div class="stat-card-wrapper">
                            <div class="stat-icon">
                                <i class="fa-solid fa-chart-pie"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${completionRate}%</div>
                                <div class="stat-label">معدل الإكمال</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- توزيع الأجهزة -->
                <div class="card mb-2rem">
                    <div class="card-header">
                        <h3>
                            <i class="fa-solid fa-mobile-screen"></i>
                            توزيع الأجهزة
                        </h3>
                    </div>
                    <div class="card-body">
                        ${this.renderDeviceChart(deviceStats)}
                    </div>
                </div>

                <!-- معدل الإكمال حسب الوقت -->
                <div class="card mb-2rem">
                    <div class="card-header">
                        <h3>
                            <i class="fa-solid fa-chart-area"></i>
                            معدل الإكمال حسب الوقت
                        </h3>
                    </div>
                    <div class="card-body">
                        ${this.renderCompletionTrendChart(completionTrend)}
                    </div>
                </div>

                <!-- توزيع أوقات الإكمال -->
                <div class="card mb-2rem">
                    <div class="card-header">
                        <h3>
                            <i class="fa-solid fa-clock"></i>
                            توزيع أوقات الإكمال
                        </h3>
                    </div>
                    <div class="card-body">
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
            if (total === 0) return '<p class="text-muted">لا توجد بيانات</p>';
            
            const deviceColors = {
                'mobile': '#10b981',
                'tablet': '#f59e0b',
                'desktop': '#3d8fd6',
                'unknown': '#64748b'
            };
            
            return `
                <div class="results-choices-list">
                    ${Object.entries(deviceStats).map(([device, count]) => {
                        const percentage = Math.round((count / total) * 100);
                        const deviceIcon = device === 'mobile' ? 'fa-mobile' : 
                                         device === 'tablet' ? 'fa-tablet' : 'fa-desktop';
                        const deviceName = device === 'mobile' ? 'جوال' : 
                                          device === 'tablet' ? 'تابلت' : 
                                          device === 'desktop' ? 'سطح مكتب' : 'غير محدد';
                        const color = deviceColors[device] || '#64748b';
                        return `
                            <div class="results-choice-item">
                                <div class="results-choice-label">
                                    <i class="fa-solid ${deviceIcon} device-icon" data-color="${color}"></i>
                                    ${deviceName}
                                </div>
                                <div class="results-choice-bar-container">
                                    <div class="results-choice-bar" data-width="${percentage}" data-color="${color}">
                                        <span class="results-choice-bar-text">${percentage}%</span>
                                    </div>
                                </div>
                                <div class="results-choice-stats"><strong>${count}</strong></div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        renderCompletionTrendChart(trend) {
            const dates = Object.keys(trend).sort();
            if (dates.length === 0) return '<p class="text-muted">لا توجد بيانات</p>';
            
            return `
                <div class="results-choices-list">
                    ${dates.map(date => {
                        const data = trend[date];
                        const rate = Math.round((data.completed / data.total) * 100);
                        const color = rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444';
                        return `
                            <div class="results-choice-item">
                                <div class="results-choice-label">
                                    <i class="fa-solid fa-calendar-day icon--blue"></i>
                                    ${date}
                                </div>
                                <div class="results-choice-bar-container">
                                    <div class="results-choice-bar" data-width="${rate}" data-color="${color}">
                                        <span class="results-choice-bar-text">${rate}%</span>
                                    </div>
                                </div>
                                <div class="results-choice-stats"><strong>${data.completed}</strong>/${data.total}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        renderTimeDistributionChart(timeStats) {
            if (!timeStats.distribution || timeStats.distribution.length === 0) {
                return '<p class="text-muted">لا توجد بيانات كافية</p>';
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
                <div class="results-choices-list">
                    ${distribution.map(d => {
                        const percentage = timeStats.distribution.length > 0 
                            ? Math.round((d.count / timeStats.distribution.length) * 100) 
                            : 0;
                        const barWidth = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                        return `
                            <div class="results-choice-item">
                                <div class="results-choice-label">
                                    <i class="fa-solid fa-stopwatch icon--purple"></i>
                                    ${d.label}
                                </div>
                                <div class="results-choice-bar-container">
                                    <div class="results-choice-bar results-choice-bar--purple" data-width="${barWidth}">
                                        <span class="results-choice-bar-text">${percentage}%</span>
                                    </div>
                                </div>
                                <div class="results-choice-stats"><strong>${d.count}</strong></div>
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
            const searchTerm = document.getElementById('responsesSearchInput')?.value?.toLowerCase() || '';
            const statusFilter = document.getElementById('responsesStatusFilter')?.value || '';
            const sortFilter = document.getElementById('responsesSortFilter')?.value || 'newest';

            let filtered = [...currentResponses];

            // فلترة بالبحث
            if (searchTerm) {
                filtered = filtered.filter(r => {
                    const userName = r.user?.full_name || '';
                    return userName.toLowerCase().includes(searchTerm);
                });
            }

            // فلترة بالحالة
            if (statusFilter) {
                filtered = filtered.filter(r => r.status === statusFilter);
            }

            // الترتيب
            filtered.sort((a, b) => {
                if (sortFilter === 'newest') {
                    return new Date(b.created_at) - new Date(a.created_at);
                } else if (sortFilter === 'oldest') {
                    return new Date(a.created_at) - new Date(b.created_at);
                } else if (sortFilter === 'fastest') {
                    return (a.time_spent_seconds || 0) - (b.time_spent_seconds || 0);
                } else if (sortFilter === 'slowest') {
                    return (b.time_spent_seconds || 0) - (a.time_spent_seconds || 0);
                }
                return 0;
            });

            // إعادة عرض البطاقات
            const container = document.getElementById('responsesListContainer');
            if (container) {
                container.innerHTML = filtered.map(r => this.renderResponseCard(r)).join('');
            }
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

        viewResponseDetails(responseId) {
            // تحويل responseId إلى number للمقارنة الصحيحة
            const numericId = typeof responseId === 'string' ? parseInt(responseId, 10) : responseId;
            const response = currentResponses.find(r => r.id === numericId);
            if (!response) {
                console.error('Response not found:', responseId, 'Available:', currentResponses.map(r => r.id));
                return;
            }
            
            const userName = response.user?.full_name || (response.is_anonymous ? 'المستجيب' : 'غير معروف');
            const statusClass = response.status === 'completed' ? 'badge-success' : 
                               response.status === 'in_progress' ? 'badge-warning' : 'badge-danger';
            const statusText = response.status === 'completed' ? 'مكتملة' : 
                              response.status === 'in_progress' ? 'قيد التقدم' : 'متروكة';
            
            let answersHtml = '';
            response.survey_answers.forEach(answer => {
                const question = currentQuestions.find(q => q.id === answer.question_id);
                if (!question) return;
                
                const answerDisplay = this.formatAnswerDisplay(answer, question);
                
                answersHtml += `
                    <div class="response-answer-item">
                        <label>
                            <i class="fa-solid fa-question-circle"></i>
                            ${this.escapeHtml(question.question_text)}
                        </label>
                        <div class="value">${answerDisplay}</div>
                    </div>
                `;
            });
            
            const modalContent = `
                <style>
                    .response-detail-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 1rem;
                        margin-bottom: 1.5rem;
                        padding: 1rem;
                        background: #f8fafc;
                        border-radius: 12px;
                    }
                    .response-detail-item {
                        display: flex;
                        flex-direction: column;
                        gap: 0.25rem;
                    }
                    .response-detail-item label {
                        font-size: 0.8rem;
                        color: #64748b;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }
                    .response-detail-item .value {
                        font-weight: 600;
                        color: #1e293b;
                    }
                    .response-answers-section {
                        margin-top: 1.5rem;
                    }
                    .response-answers-title {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 1.1rem;
                        font-weight: 600;
                        color: #1e293b;
                        margin-bottom: 1rem;
                        padding-bottom: 0.5rem;
                        border-bottom: 2px solid #e2e8f0;
                    }
                    .response-answer-item {
                        padding: 1rem;
                        background: #fff;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        margin-bottom: 0.75rem;
                    }
                    .response-answer-item label {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 0.9rem;
                        color: #3b82f6;
                        margin-bottom: 0.5rem;
                        font-weight: 500;
                    }
                    .response-answer-item .value {
                        color: #1e293b;
                        line-height: 1.6;
                    }
                </style>
                <div class="response-detail-grid">
                    <div class="response-detail-item">
                        <label><i class="fa-solid fa-user"></i> المستجيب</label>
                        <div class="value">${this.escapeHtml(userName)}</div>
                    </div>
                    <div class="response-detail-item">
                        <label><i class="fa-solid fa-flag"></i> الحالة</label>
                        <div class="value"><span class="badge ${statusClass}">${statusText}</span></div>
                    </div>
                    <div class="response-detail-item">
                        <label><i class="fa-solid fa-calendar"></i> تاريخ الإرسال</label>
                        <div class="value">${this.formatDate(response.created_at)}</div>
                    </div>
                    <div class="response-detail-item">
                        <label><i class="fa-solid fa-clock"></i> وقت الإكمال</label>
                        <div class="value">${this.formatTime(response.time_spent_seconds)}</div>
                    </div>
                </div>
                
                <div class="response-answers-section">
                    <h3 class="response-answers-title">
                        <i class="fa-solid fa-list-check"></i>
                        الإجابات
                    </h3>
                    ${answersHtml}
                </div>
            `;
            
            // فتح النافذة المنبثقة
            if (window.ModalHelper && typeof window.ModalHelper.show === 'function') {
                window.ModalHelper.show({
                    title: 'تفاصيل الاستجابة',
                    html: modalContent,
                    size: 'lg',
                    showClose: true
                });
            } else {
                // Fallback
                const modal = document.createElement('div');
                modal.className = 'modal-backdrop active';
                modal.innerHTML = `
                    <div class="modal modal-lg active">
                        <div class="modal-header">
                            <h3>تفاصيل الاستجابة</h3>
                            <button class="modal-close" onclick="this.closest('.modal-backdrop').remove(); document.body.classList.remove('modal-open');">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">${modalContent}</div>
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
        }
    }

    window.surveysResultsEnhanced = new SurveysResultsEnhanced();
})();
