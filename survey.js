/**
 * نظام عرض الاستبيانات - نادي أدِيب
 * واجهة المستخدم لعرض الاستبيان وتسجيل الإجابات
 */

(function() {
    const sb = window.sbClient;
    let currentSurvey = null;
    let surveyQuestions = [];
    let currentQuestionIndex = 0;
    let userAnswers = {};
    let responseId = null;
    let startTime = Date.now();

    async function init() {
        const urlParams = new URLSearchParams(window.location.search);
        const surveyId = urlParams.get('id');

        if (!surveyId) {
            showError('لم يتم تحديد الاستبيان');
            return;
        }

        await loadSurvey(surveyId);
    }

    async function loadSurvey(surveyId) {
        showLoading(true);

        try {
            const { data: survey, error: surveyError } = await sb
                .from('surveys')
                .select('*')
                .eq('id', surveyId)
                .single();

            if (surveyError) throw surveyError;

            if (!survey) {
                showError('الاستبيان غير موجود');
                return;
            }

            if (survey.status !== 'active') {
                showError('هذا الاستبيان غير متاح حالياً');
                return;
            }

            if (survey.end_date && new Date(survey.end_date) < new Date()) {
                showError('انتهت صلاحية هذا الاستبيان');
                return;
            }

            currentSurvey = survey;

            const { data: questions, error: questionsError } = await sb
                .from('survey_questions')
                .select('*')
                .eq('survey_id', surveyId)
                .order('question_order');

            if (questionsError) throw questionsError;

            surveyQuestions = questions || [];

            if (surveyQuestions.length === 0) {
                showError('هذا الاستبيان لا يحتوي على أسئلة');
                return;
            }

            await updateViewCount(surveyId);
            await createResponse(surveyId);

            showLoading(false);
            renderSurvey();

        } catch (error) {
            console.error('Error loading survey:', error);
            showError('حدث خطأ أثناء تحميل الاستبيان');
            showLoading(false);
        }
    }

    async function updateViewCount(surveyId) {
        try {
            await sb.rpc('increment_survey_views', { survey_id: surveyId });
        } catch (error) {
            console.error('Error updating view count:', error);
        }
    }

    async function createResponse(surveyId) {
        try {
            const { data: { user } } = await sb.auth.getUser();

            const responseData = {
                survey_id: surveyId,
                user_id: user?.id || null,
                is_anonymous: !user || currentSurvey.allow_anonymous,
                status: 'in_progress',
                started_at: new Date().toISOString(),
                ip_address: null,
                device_type: getDeviceType()
            };

            const { data, error } = await sb
                .from('survey_responses')
                .insert(responseData)
                .select()
                .single();

            if (error) throw error;

            responseId = data.id;

        } catch (error) {
            console.error('Error creating response:', error);
        }
    }

    function getDeviceType() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return 'tablet';
        }
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
            return 'mobile';
        }
        return 'desktop';
    }

    function renderSurvey() {
        const container = document.getElementById('surveyMain');
        
        container.innerHTML = `
            <div class="survey-card">
                <h1 class="survey-title">${escapeHtml(currentSurvey.title)}</h1>
                ${currentSurvey.description ? `
                    <p class="survey-description">${escapeHtml(currentSurvey.description)}</p>
                ` : ''}
                
                ${currentSurvey.welcome_message ? `
                    <div class="welcome-message">
                        ${escapeHtml(currentSurvey.welcome_message)}
                    </div>
                ` : ''}
                
                ${currentSurvey.show_progress_bar ? `
                    <div class="progress-bar-container">
                        <div class="progress-label">
                            <span>التقدم</span>
                            <span id="progressText">0%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" id="progressFill" style="width: 0%"></div>
                        </div>
                    </div>
                ` : ''}
                
                <div id="questionContainer"></div>
                
                <div class="navigation-buttons">
                    <button class="btn btn-secondary" id="prevBtn" style="display: none;">
                        <i class="fa-solid fa-arrow-right"></i>
                        السابق
                    </button>
                    <button class="btn btn-primary" id="nextBtn">
                        التالي
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                </div>
            </div>
        `;

        setupNavigationButtons();
        renderQuestion(currentQuestionIndex);
    }

    function renderQuestion(index) {
        const container = document.getElementById('questionContainer');
        const question = surveyQuestions[index];

        if (!question) return;

        const questionNumber = index + 1;
        const totalQuestions = surveyQuestions.length;

        container.innerHTML = `
            <div class="question-container">
                <div class="question-header">
                    <span class="question-number">سؤال ${questionNumber} من ${totalQuestions}</span>
                    <h2 class="question-text">
                        ${question.is_required ? '<span class="required">*</span>' : ''}
                        ${escapeHtml(question.question_text)}
                    </h2>
                    ${question.question_description ? `
                        <p class="question-description">${escapeHtml(question.question_description)}</p>
                    ` : ''}
                </div>
                
                <div class="question-body">
                    ${renderQuestionInput(question)}
                </div>
                
                <div id="questionError"></div>
            </div>
        `;

        restoreAnswer(question);
        updateProgress();
    }

    function renderQuestionInput(question) {
        const savedAnswer = userAnswers[question.id];

        switch (question.question_type) {
            case 'short_text':
                return `<input type="text" class="form-input" id="answer" 
                    placeholder="أدخل إجابتك هنا..." 
                    value="${savedAnswer?.answer_text || ''}" />`;

            case 'long_text':
                return `<textarea class="form-input" id="answer" 
                    placeholder="أدخل إجابتك هنا...">${savedAnswer?.answer_text || ''}</textarea>`;

            case 'email':
                return `<input type="email" class="form-input" id="answer" 
                    placeholder="example@email.com" 
                    value="${savedAnswer?.answer_text || ''}" />`;

            case 'phone':
                return `<input type="tel" class="form-input" id="answer" 
                    placeholder="05xxxxxxxx" 
                    value="${savedAnswer?.answer_text || ''}" />`;

            case 'url':
                return `<input type="url" class="form-input" id="answer" 
                    placeholder="https://example.com" 
                    value="${savedAnswer?.answer_text || ''}" />`;

            case 'number':
                return `<input type="number" class="form-input" id="answer" 
                    placeholder="أدخل رقماً" 
                    value="${savedAnswer?.answer_number || ''}" />`;

            case 'date':
                return `<input type="date" class="form-input" id="answer" 
                    value="${savedAnswer?.answer_date || ''}" />`;

            case 'time':
                return `<input type="time" class="form-input" id="answer" 
                    value="${savedAnswer?.answer_time || ''}" />`;

            case 'datetime':
                return `<input type="datetime-local" class="form-input" id="answer" 
                    value="${savedAnswer?.answer_datetime || ''}" />`;

            case 'single_choice':
                return renderChoices(question, 'radio', savedAnswer);

            case 'multiple_choice':
                return renderChoices(question, 'checkbox', savedAnswer);

            case 'dropdown':
                return renderDropdown(question, savedAnswer);

            case 'rating_stars':
                return renderStarRating(question, savedAnswer);

            case 'linear_scale':
                return renderLinearScale(question, savedAnswer);

            case 'slider':
                return renderSlider(question, savedAnswer);

            case 'yes_no':
                return renderYesNo(question, savedAnswer);

            default:
                return `<input type="text" class="form-input" id="answer" 
                    placeholder="أدخل إجابتك هنا..." />`;
        }
    }

    function renderChoices(question, type, savedAnswer) {
        const choices = question.options?.choices || [];
        const savedValues = savedAnswer?.answer_json || [];

        return `
            <div class="choices-container">
                ${choices.map((choice, index) => {
                    const isChecked = Array.isArray(savedValues) 
                        ? savedValues.includes(choice) 
                        : savedValues === choice;
                    
                    return `
                        <label class="choice-item ${isChecked ? 'selected' : ''}" data-choice="${index}">
                            <input type="${type}" name="answer" value="${escapeHtml(choice)}" 
                                ${isChecked ? 'checked' : ''} />
                            <span class="choice-label">${escapeHtml(choice)}</span>
                        </label>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderDropdown(question, savedAnswer) {
        const choices = question.options?.choices || [];
        const savedValue = savedAnswer?.answer_json || '';

        return `
            <select class="form-input" id="answer">
                <option value="">-- اختر --</option>
                ${choices.map(choice => `
                    <option value="${escapeHtml(choice)}" ${savedValue === choice ? 'selected' : ''}>
                        ${escapeHtml(choice)}
                    </option>
                `).join('')}
            </select>
        `;
    }

    function renderStarRating(question, savedAnswer) {
        const max = question.options?.scale?.max || 5;
        const savedValue = savedAnswer?.answer_number || 0;

        return `
            <div class="rating-container">
                <div class="star-rating" id="starRating">
                    ${Array.from({ length: max }, (_, i) => `
                        <i class="fa-solid fa-star star ${i < savedValue ? 'active' : ''}" 
                            data-value="${i + 1}"></i>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderLinearScale(question, savedAnswer) {
        const min = question.options?.scale?.min || 1;
        const max = question.options?.scale?.max || 5;
        const savedValue = savedAnswer?.answer_number;

        const items = [];
        for (let i = min; i <= max; i++) {
            items.push(`
                <div class="scale-item">
                    <button type="button" class="scale-button ${savedValue === i ? 'selected' : ''}" 
                        data-value="${i}">
                        ${i}
                    </button>
                </div>
            `);
        }

        return `<div class="scale-container">${items.join('')}</div>`;
    }

    function renderSlider(question, savedAnswer) {
        const min = question.options?.scale?.min || 0;
        const max = question.options?.scale?.max || 100;
        const savedValue = savedAnswer?.answer_number || min;

        return `
            <div class="slider-container">
                <input type="range" class="slider-input" id="sliderInput" 
                    min="${min}" max="${max}" value="${savedValue}" />
                <div class="slider-value" id="sliderValue">${savedValue}</div>
            </div>
        `;
    }

    function renderYesNo(question, savedAnswer) {
        const savedValue = savedAnswer?.answer_boolean;

        return `
            <div class="choices-container">
                <label class="choice-item ${savedValue === true ? 'selected' : ''}" data-choice="yes">
                    <input type="radio" name="answer" value="true" ${savedValue === true ? 'checked' : ''} />
                    <span class="choice-label">نعم</span>
                </label>
                <label class="choice-item ${savedValue === false ? 'selected' : ''}" data-choice="no">
                    <input type="radio" name="answer" value="false" ${savedValue === false ? 'checked' : ''} />
                    <span class="choice-label">لا</span>
                </label>
            </div>
        `;
    }

    function restoreAnswer(question) {
        setTimeout(() => {
            const choiceItems = document.querySelectorAll('.choice-item');
            choiceItems.forEach(item => {
                const input = item.querySelector('input');
                if (input) {
                    input.addEventListener('change', () => {
                        choiceItems.forEach(ci => ci.classList.remove('selected'));
                        if (input.checked) {
                            item.classList.add('selected');
                        }
                    });
                }
            });

            const stars = document.querySelectorAll('.star');
            stars.forEach(star => {
                star.addEventListener('click', () => {
                    const value = parseInt(star.dataset.value);
                    stars.forEach((s, i) => {
                        if (i < value) {
                            s.classList.add('active');
                        } else {
                            s.classList.remove('active');
                        }
                    });
                });
            });

            const scaleButtons = document.querySelectorAll('.scale-button');
            scaleButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    scaleButtons.forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                });
            });

            const sliderInput = document.getElementById('sliderInput');
            const sliderValue = document.getElementById('sliderValue');
            if (sliderInput && sliderValue) {
                sliderInput.addEventListener('input', () => {
                    sliderValue.textContent = sliderInput.value;
                });
            }
        }, 100);
    }

    function setupNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentQuestionIndex > 0) {
                    saveCurrentAnswer();
                    currentQuestionIndex--;
                    renderQuestion(currentQuestionIndex);
                    updateNavigationButtons();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', async () => {
                if (validateCurrentAnswer()) {
                    saveCurrentAnswer();
                    
                    if (currentQuestionIndex < surveyQuestions.length - 1) {
                        currentQuestionIndex++;
                        renderQuestion(currentQuestionIndex);
                        updateNavigationButtons();
                    } else {
                        await submitSurvey();
                    }
                }
            });
        }

        updateNavigationButtons();
    }

    function updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (prevBtn) {
            prevBtn.style.display = currentQuestionIndex > 0 ? 'flex' : 'none';
        }

        if (nextBtn) {
            const isLastQuestion = currentQuestionIndex === surveyQuestions.length - 1;
            nextBtn.innerHTML = isLastQuestion 
                ? '<i class="fa-solid fa-check"></i> إرسال'
                : 'التالي <i class="fa-solid fa-arrow-left"></i>';
        }
    }

    function validateCurrentAnswer() {
        const question = surveyQuestions[currentQuestionIndex];
        const errorContainer = document.getElementById('questionError');
        errorContainer.innerHTML = '';

        if (!question.is_required) {
            return true;
        }

        const answer = getCurrentAnswer(question);

        if (!answer || (Array.isArray(answer) && answer.length === 0) || answer === '') {
            errorContainer.innerHTML = `
                <div class="error-message">
                    <i class="fa-solid fa-exclamation-circle"></i>
                    هذا السؤال إجباري، يرجى الإجابة عليه
                </div>
            `;
            return false;
        }

        return true;
    }

    function getCurrentAnswer(question) {
        const answerElement = document.getElementById('answer');

        switch (question.question_type) {
            case 'short_text':
            case 'long_text':
            case 'email':
            case 'phone':
            case 'url':
                return answerElement?.value.trim() || null;

            case 'number':
                return answerElement?.value ? parseFloat(answerElement.value) : null;

            case 'date':
            case 'time':
            case 'datetime':
                return answerElement?.value || null;

            case 'single_choice':
            case 'dropdown':
                const radioChecked = document.querySelector('input[name="answer"]:checked');
                return radioChecked?.value || answerElement?.value || null;

            case 'multiple_choice':
                const checkboxes = document.querySelectorAll('input[name="answer"]:checked');
                return Array.from(checkboxes).map(cb => cb.value);

            case 'rating_stars':
                const activeStars = document.querySelectorAll('.star.active');
                return activeStars.length || null;

            case 'linear_scale':
                const selectedScale = document.querySelector('.scale-button.selected');
                return selectedScale ? parseInt(selectedScale.dataset.value) : null;

            case 'slider':
                const sliderInput = document.getElementById('sliderInput');
                return sliderInput ? parseInt(sliderInput.value) : null;

            case 'yes_no':
                const yesNoChecked = document.querySelector('input[name="answer"]:checked');
                return yesNoChecked ? yesNoChecked.value === 'true' : null;

            default:
                return answerElement?.value || null;
        }
    }

    function saveCurrentAnswer() {
        const question = surveyQuestions[currentQuestionIndex];
        const answer = getCurrentAnswer(question);

        if (answer !== null && answer !== '' && !(Array.isArray(answer) && answer.length === 0)) {
            userAnswers[question.id] = formatAnswer(question, answer);
        }
    }

    function formatAnswer(question, answer) {
        const formatted = {
            question_id: question.id,
            answered_at: new Date().toISOString()
        };

        switch (question.question_type) {
            case 'short_text':
            case 'long_text':
            case 'email':
            case 'phone':
            case 'url':
                formatted.answer_text = answer;
                break;

            case 'number':
            case 'rating_stars':
            case 'linear_scale':
            case 'slider':
                formatted.answer_number = answer;
                break;

            case 'date':
                formatted.answer_date = answer;
                break;

            case 'time':
                formatted.answer_time = answer;
                break;

            case 'datetime':
                formatted.answer_datetime = answer;
                break;

            case 'yes_no':
                formatted.answer_boolean = answer;
                break;

            case 'single_choice':
            case 'dropdown':
            case 'multiple_choice':
                formatted.answer_json = answer;
                break;

            default:
                formatted.answer_text = String(answer);
        }

        return formatted;
    }

    async function submitSurvey() {
        showLoading(true);

        try {
            const answers = Object.values(userAnswers).map(answer => ({
                ...answer,
                response_id: responseId
            }));

            const { error: answersError } = await sb
                .from('survey_answers')
                .insert(answers);

            if (answersError) throw answersError;

            const timeSpent = Math.floor((Date.now() - startTime) / 1000);

            const { error: responseError } = await sb
                .from('survey_responses')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    time_spent_seconds: timeSpent,
                    progress_percentage: 100
                })
                .eq('id', responseId);

            if (responseError) throw responseError;

            showLoading(false);
            showThankYou();

        } catch (error) {
            console.error('Error submitting survey:', error);
            showError('حدث خطأ أثناء إرسال الاستبيان');
            showLoading(false);
        }
    }

    function updateProgress() {
        if (!currentSurvey.show_progress_bar) return;

        const progress = Math.round(((currentQuestionIndex + 1) / surveyQuestions.length) * 100);
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }

        if (progressText) {
            progressText.textContent = `${progress}%`;
        }
    }

    function showThankYou() {
        const container = document.getElementById('surveyMain');
        
        container.innerHTML = `
            <div class="survey-card">
                <div class="thank-you-container">
                    <div class="thank-you-icon">
                        <i class="fa-solid fa-check-circle"></i>
                    </div>
                    <h1 class="thank-you-title">شكراً لمشاركتك!</h1>
                    <p class="thank-you-message">
                        ${currentSurvey.thank_you_message || 'تم إرسال إجاباتك بنجاح. نقدر وقتك ومشاركتك في هذا الاستبيان.'}
                    </p>
                    <a href="index.html" class="btn btn-primary">
                        <i class="fa-solid fa-home"></i>
                        العودة للرئيسية
                    </a>
                </div>
            </div>
        `;
    }

    function showError(message) {
        const container = document.getElementById('surveyMain');
        
        container.innerHTML = `
            <div class="survey-card">
                <div class="error-container">
                    <div class="error-icon">
                        <i class="fa-solid fa-exclamation-triangle"></i>
                    </div>
                    <h2 class="error-title">عذراً</h2>
                    <p class="thank-you-message">${message}</p>
                    <a href="index.html" class="btn btn-primary">
                        <i class="fa-solid fa-home"></i>
                        العودة للرئيسية
                    </a>
                </div>
            </div>
        `;
    }

    function showLoading(show) {
        const loadingBar = document.getElementById('loadingBar');
        if (loadingBar) {
            loadingBar.classList.toggle('active', show);
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    document.addEventListener('DOMContentLoaded', init);
})();
