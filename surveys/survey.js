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

            // التحقق من أن الاستبيان خاص بأعضاء أديب
            if (survey.access_type === 'members_only') {
                const { data: { user } } = await sb.auth.getUser();
                
                if (!user) {
                    // المستخدم غير مسجل الدخول
                    showMembersOnlyMessage(survey);
                    return;
                }
                
                // التحقق من أن المستخدم عضو في أديب (لديه profile)
                const { data: profile, error: profileError } = await sb
                    .from('profiles')
                    .select('id, account_status')
                    .eq('id', user.id)
                    .single();
                
                if (profileError || !profile || profile.account_status !== 'active') {
                    // المستخدم ليس عضواً نشطاً في أديب
                    showMembersOnlyMessage(survey);
                    return;
                }
            }

            // التحقق من تاريخ البدء (الاستبيان المجدول)
            if (survey.start_date && new Date(survey.start_date) > new Date()) {
                showScheduledSurvey(survey);
                return;
            }

            if (survey.end_date && new Date(survey.end_date) < new Date()) {
                showError('انتهت صلاحية هذا الاستبيان');
                return;
            }

            currentSurvey = survey;

            // تحديث عنوان الصفحة والـ meta tags ديناميكياً
            updatePageMeta(survey);

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

            // التحقق من إعداد عدم السماح بإجابات متعددة
            if (!survey.allow_multiple_responses) {
                const { data: { user } } = await sb.auth.getUser();
                
                if (user) {
                    // التحقق من وجود استجابة سابقة لهذا المستخدم (مكتملة أو قيد التقدم)
                    const { data: existingResponses } = await sb
                        .from('survey_responses')
                        .select('id, status')
                        .eq('survey_id', surveyId)
                        .eq('user_id', user.id);
                    
                    if (existingResponses && existingResponses.length > 0) {
                        const completedResponse = existingResponses.find(r => r.status === 'completed');
                        if (completedResponse) {
                            // عرض رسالة شكر بدلاً من خطأ
                            showAlreadyAnswered();
                            return;
                        }
                        // إذا كانت هناك استجابة قيد التقدم، نستخدمها بدلاً من إنشاء جديدة
                        const inProgressResponse = existingResponses.find(r => r.status === 'in_progress');
                        if (inProgressResponse) {
                            responseId = inProgressResponse.id;
                            showLoading(false);
                            renderSurvey();
                            return;
                        }
                    }
                }
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

            // إذا كان الاستبيان يسمح بالإجابات المجهولة، لا نسجل هوية المستخدم
            const isAnonymous = currentSurvey.allow_anonymous;
            
            const responseData = {
                survey_id: surveyId,
                // إذا كانت الإجابات مجهولة، لا نسجل user_id
                user_id: isAnonymous ? null : (user?.id || null),
                is_anonymous: isAnonymous || !user,
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

    // عرض العداد التنازلي
    function renderCountdown() {
        return `
            <div id="surveyCountdown" class="survey-countdown" style="
                width: 100%;
                max-width: 800px;
                margin: 0 auto 1rem;
                padding: 16px;
                border-radius: 16px;
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: #fff;
                border: 1px solid rgba(255,255,255,0.18);
                box-shadow: 0 16px 40px rgba(2,6,23,.18);
            ">
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 600; font-size: 1.05rem;">
                    <i class="fa-regular fa-hourglass-half"></i>
                    <span>ينتهي الاستبيان بعد</span>
                </div>
                <div id="countdownTimer" style="display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap; margin-top: 10px;">
                    <div style="min-width: 75px; display: grid; gap: 4px; justify-items: center; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.28); padding: 10px 12px; border-radius: 12px;">
                        <span id="countdownDays" style="font-weight: 700; font-size: 1.4rem;">--</span>
                        <small style="opacity: 0.9;">يوم</small>
                    </div>
                    <div style="min-width: 75px; display: grid; gap: 4px; justify-items: center; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.28); padding: 10px 12px; border-radius: 12px;">
                        <span id="countdownHours" style="font-weight: 700; font-size: 1.4rem;">--</span>
                        <small style="opacity: 0.9;">ساعة</small>
                    </div>
                    <div style="min-width: 75px; display: grid; gap: 4px; justify-items: center; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.28); padding: 10px 12px; border-radius: 12px;">
                        <span id="countdownMinutes" style="font-weight: 700; font-size: 1.4rem;">--</span>
                        <small style="opacity: 0.9;">دقيقة</small>
                    </div>
                    <div style="min-width: 75px; display: grid; gap: 4px; justify-items: center; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.28); padding: 10px 12px; border-radius: 12px;">
                        <span id="countdownSeconds" style="font-weight: 700; font-size: 1.4rem;">--</span>
                        <small style="opacity: 0.9;">ثانية</small>
                    </div>
                </div>
            </div>
        `;
    }

    // بدء العداد التنازلي
    function startCountdown() {
        if (!currentSurvey.end_date) return;

        const endDate = new Date(currentSurvey.end_date).getTime();

        function updateCountdown() {
            const now = new Date().getTime();
            const distance = endDate - now;

            if (distance < 0) {
                // انتهى الوقت
                const countdownEl = document.getElementById('surveyCountdown');
                if (countdownEl) {
                    countdownEl.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                    countdownEl.innerHTML = `
                        <div style="text-align: center; padding: 0.5rem;">
                            <i class="fa-solid fa-clock" style="font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
                            <div style="font-weight: 600;">انتهت صلاحية هذا الاستبيان</div>
                        </div>
                    `;
                }
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            const daysEl = document.getElementById('countdownDays');
            const hoursEl = document.getElementById('countdownHours');
            const minutesEl = document.getElementById('countdownMinutes');
            const secondsEl = document.getElementById('countdownSeconds');

            if (daysEl) daysEl.textContent = days;
            if (hoursEl) hoursEl.textContent = hours;
            if (minutesEl) minutesEl.textContent = minutes;
            if (secondsEl) secondsEl.textContent = seconds;

            setTimeout(updateCountdown, 1000);
        }

        updateCountdown();
    }

    function renderSurvey() {
        const container = document.getElementById('surveyMain');
        
        // إنشاء عداد تنازلي إذا كان هناك تاريخ انتهاء
        const countdownHTML = currentSurvey.end_date ? renderCountdown() : '';
        
        container.innerHTML = `
            ${countdownHTML}
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
        
        // بدء العداد التنازلي إذا كان هناك تاريخ انتهاء
        if (currentSurvey.end_date) {
            startCountdown();
        }
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
                    ${escapeHtml(question.question_text)}
                        ${question.is_required ? '<span class="required">*</span>' : ''}
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
        
        // إذا كان الاستبيان يسمح بعرض النتائج للمشاركين
        const showResultsButton = currentSurvey.show_results_to_participants ? `
            <button onclick="window.surveyApp.showResults()" class="btn btn-secondary" style="margin-top: 1rem; background: linear-gradient(135deg, #8b5cf6, #6366f1); border: none;">
                <i class="fa-solid fa-chart-pie"></i>
                عرض نتائج الاستبيان
            </button>
        ` : '';
        
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
                    ${showResultsButton}
                    <a href="/" class="btn btn-primary" style="margin-top: 1rem;">
                        <i class="fa-solid fa-home"></i>
                        العودة للرئيسية
                    </a>
                </div>
            </div>
        `;
    }

    // عرض رسالة للمستخدم الذي أجاب مسبقاً
    function showAlreadyAnswered() {
        showLoading(false);
        const container = document.getElementById('surveyMain');
        
        // إذا كان الاستبيان يسمح بعرض النتائج للمشاركين
        const showResultsButton = currentSurvey.show_results_to_participants ? `
            <button onclick="window.surveyApp.showResults()" class="btn btn-secondary" style="margin-top: 1rem; background: linear-gradient(135deg, #8b5cf6, #6366f1); border: none;">
                <i class="fa-solid fa-chart-pie"></i>
                عرض نتائج الاستبيان
            </button>
        ` : '';
        
        container.innerHTML = `
            <div class="survey-card">
                <div class="thank-you-container">
                    <div class="thank-you-icon" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                        <i class="fa-solid fa-clipboard-check"></i>
                    </div>
                    <h1 class="thank-you-title">لقد أجبت على هذا الاستبيان مسبقاً</h1>
                    <p class="thank-you-message">
                        شكراً لك! لقد قمت بالإجابة على هذا الاستبيان من قبل. لا يُسمح بإجابات متعددة على هذا الاستبيان.
                    </p>
                    ${showResultsButton}
                    <a href="/" class="btn btn-primary" style="margin-top: 1rem;">
                        <i class="fa-solid fa-home"></i>
                        العودة للرئيسية
                    </a>
                </div>
            </div>
        `;
    }
    
    // عرض نتائج الاستبيان للمشاركين
    async function showResults() {
        const container = document.getElementById('surveyMain');
        container.innerHTML = `
            <div class="survey-card">
                <div style="text-align: center; padding: 2rem;">
                    <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: #3b82f6;"></i>
                    <p style="margin-top: 1rem; color: #6b7280;">جاري تحميل النتائج...</p>
                </div>
            </div>
        `;
        
        try {
            // جلب جميع الإجابات للاستبيان
            const { data: responses, error } = await sb
                .from('survey_responses')
                .select('survey_answers(*)')
                .eq('survey_id', currentSurvey.id)
                .eq('status', 'completed');
            
            if (error) throw error;
            
            // تجميع الإجابات حسب السؤال
            const questionStats = {};
            surveyQuestions.forEach(q => {
                questionStats[q.id] = {
                    question: q,
                    answers: []
                };
            });
            
            responses.forEach(r => {
                (r.survey_answers || []).forEach(a => {
                    if (questionStats[a.question_id]) {
                        questionStats[a.question_id].answers.push(a);
                    }
                });
            });
            
            // عرض النتائج
            container.innerHTML = `
                <div class="survey-card">
                    <h2 style="text-align: center; margin-bottom: 1.5rem; color: #1f2937;">
                        <i class="fa-solid fa-chart-pie" style="color: #8b5cf6;"></i>
                        نتائج الاستبيان
                    </h2>
                    <p style="text-align: center; color: #6b7280; margin-bottom: 2rem;">
                        إجمالي المشاركين: ${responses.length}
                    </p>
                    <div class="results-container">
                        ${Object.values(questionStats).map(stat => renderQuestionResults(stat)).join('')}
                    </div>
                    <div style="text-align: center; margin-top: 2rem;">
                        <a href="/" class="btn btn-primary">
                            <i class="fa-solid fa-home"></i>
                            العودة للرئيسية
                        </a>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading results:', error);
            container.innerHTML = `
                <div class="survey-card">
                    <div class="error-container">
                        <div class="error-icon">
                            <i class="fa-solid fa-exclamation-triangle"></i>
                        </div>
                        <h2 class="error-title">عذراً</h2>
                        <p>حدث خطأ أثناء تحميل النتائج</p>
                        <a href="/" class="btn btn-primary">
                            <i class="fa-solid fa-home"></i>
                            العودة للرئيسية
                        </a>
                    </div>
                </div>
            `;
        }
    }
    
    // عرض نتائج سؤال واحد
    function renderQuestionResults(stat) {
        const question = stat.question;
        const answers = stat.answers;
        const totalAnswers = answers.length;
        
        if (totalAnswers === 0) {
            return `
                <div style="padding: 1rem; margin-bottom: 1rem; background: #f9fafb; border-radius: 8px;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #374151;">${escapeHtml(question.question_text)}</h4>
                    <p style="color: #9ca3af; margin: 0;">لا توجد إجابات</p>
                </div>
            `;
        }
        
        // للأسئلة ذات الخيارات
        if (['single_choice', 'multiple_choice', 'dropdown', 'yes_no'].includes(question.question_type)) {
            const choiceCounts = {};
            answers.forEach(a => {
                const value = Array.isArray(a.answer_json) ? a.answer_json : [a.answer_json];
                value.forEach(v => {
                    choiceCounts[v] = (choiceCounts[v] || 0) + 1;
                });
            });
            
            return `
                <div style="padding: 1rem; margin-bottom: 1rem; background: #f9fafb; border-radius: 8px;">
                    <h4 style="margin: 0 0 1rem 0; color: #374151;">${escapeHtml(question.question_text)}</h4>
                    ${Object.entries(choiceCounts).map(([choice, count]) => {
                        const percentage = Math.round((count / totalAnswers) * 100);
                        return `
                            <div style="margin-bottom: 0.75rem;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                    <span style="color: #4b5563;">${escapeHtml(choice)}</span>
                                    <span style="color: #6b7280;">${count} (${percentage}%)</span>
                                </div>
                                <div style="height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                                    <div style="height: 100%; width: ${percentage}%; background: linear-gradient(90deg, #8b5cf6, #6366f1); border-radius: 4px;"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        // للأسئلة الرقمية والتقييم
        if (['number', 'linear_scale', 'rating_stars', 'rating_hearts', 'slider'].includes(question.question_type)) {
            const values = answers.map(a => a.answer_number || 0).filter(v => v > 0);
            const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 0;
            
            return `
                <div style="padding: 1rem; margin-bottom: 1rem; background: #f9fafb; border-radius: 8px;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #374151;">${escapeHtml(question.question_text)}</h4>
                    <p style="color: #6b7280; margin: 0;">
                        <strong style="color: #8b5cf6; font-size: 1.25rem;">${avg}</strong> متوسط التقييم
                        <span style="margin-right: 1rem;">(${values.length} إجابة)</span>
                    </p>
                </div>
            `;
        }
        
        // للأسئلة النصية
        return `
            <div style="padding: 1rem; margin-bottom: 1rem; background: #f9fafb; border-radius: 8px;">
                <h4 style="margin: 0 0 0.5rem 0; color: #374151;">${escapeHtml(question.question_text)}</h4>
                <p style="color: #6b7280; margin: 0;">${totalAnswers} إجابة نصية</p>
            </div>
        `;
    }

    function showScheduledSurvey(survey) {
        const container = document.getElementById('surveyMain');
        const startDate = new Date(survey.start_date);
        
        container.innerHTML = `
            <div class="survey-card">
                <div class="scheduled-container" style="text-align: center; padding: 2rem;">
                    <div style="width: 80px; height: 80px; margin: 0 auto 1.5rem; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-calendar-clock" style="font-size: 2rem; color: white;"></i>
                    </div>
                    <h2 style="color: #1f2937; margin-bottom: 1rem;">${escapeHtml(survey.title)}</h2>
                    <p style="color: #6b7280; margin-bottom: 1.5rem;">هذا الاستبيان مجدول وسيكون متاحاً قريباً</p>
                    
                    <div id="scheduledCountdown" style="
                        padding: 1.5rem;
                        border-radius: 16px;
                        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                        color: #fff;
                        margin-bottom: 1.5rem;
                    ">
                        <div style="font-weight: 600; font-size: 1rem; margin-bottom: 1rem;">
                            <i class="fa-regular fa-hourglass-half"></i>
                            سيكون متاحاً بعد
                        </div>
                        <div id="countdownTimer" style="display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap;">
                            <div style="min-width: 70px; display: grid; gap: 4px; justify-items: center; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.28); padding: 10px 12px; border-radius: 12px;">
                                <span id="countdownDays" style="font-weight: 700; font-size: 1.4rem;">--</span>
                                <small style="opacity: 0.9;">يوم</small>
                            </div>
                            <div style="min-width: 70px; display: grid; gap: 4px; justify-items: center; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.28); padding: 10px 12px; border-radius: 12px;">
                                <span id="countdownHours" style="font-weight: 700; font-size: 1.4rem;">--</span>
                                <small style="opacity: 0.9;">ساعة</small>
                            </div>
                            <div style="min-width: 70px; display: grid; gap: 4px; justify-items: center; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.28); padding: 10px 12px; border-radius: 12px;">
                                <span id="countdownMinutes" style="font-weight: 700; font-size: 1.4rem;">--</span>
                                <small style="opacity: 0.9;">دقيقة</small>
                            </div>
                            <div style="min-width: 70px; display: grid; gap: 4px; justify-items: center; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.28); padding: 10px 12px; border-radius: 12px;">
                                <span id="countdownSeconds" style="font-weight: 700; font-size: 1.4rem;">--</span>
                                <small style="opacity: 0.9;">ثانية</small>
                            </div>
                        </div>
                    </div>
                    
                    <p style="color: #9ca3af; font-size: 0.9rem;">
                        تاريخ البدء: ${startDate.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    
                    <a href="/" class="btn btn-primary" style="margin-top: 1.5rem;">
                        <i class="fa-solid fa-home"></i>
                        العودة للرئيسية
                    </a>
                </div>
            </div>
        `;
        
        // بدء العداد التنازلي
        startScheduledCountdown(startDate);
    }
    
    function startScheduledCountdown(startDate) {
        const targetTime = startDate.getTime();
        
        function updateCountdown() {
            const now = new Date().getTime();
            const distance = targetTime - now;
            
            if (distance < 0) {
                // الاستبيان أصبح متاحاً - إعادة تحميل الصفحة
                location.reload();
                return;
            }
            
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            const daysEl = document.getElementById('countdownDays');
            const hoursEl = document.getElementById('countdownHours');
            const minutesEl = document.getElementById('countdownMinutes');
            const secondsEl = document.getElementById('countdownSeconds');
            
            if (daysEl) daysEl.textContent = days;
            if (hoursEl) hoursEl.textContent = hours;
            if (minutesEl) minutesEl.textContent = minutes;
            if (secondsEl) secondsEl.textContent = seconds;
            
            setTimeout(updateCountdown, 1000);
        }
        
        updateCountdown();
    }

    function showMembersOnlyMessage(survey) {
        showLoading(false);
        const container = document.getElementById('surveyMain');
        const currentUrl = encodeURIComponent(window.location.href);
        
        container.innerHTML = `
            <div class="survey-card">
                <div class="error-container">
                    <div class="error-icon" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                        <i class="fa-solid fa-lock"></i>
                    </div>
                    <h2 class="error-title">استبيان خاص بأعضاء أديب</h2>
                    <p class="thank-you-message">
                        هذا الاستبيان متاح فقط لأعضاء ومنتسبي نادي أدِيب المسجلين.
                        <br><br>
                        إذا كنت عضواً في أدِيب، يرجى تسجيل الدخول للمتابعة.
                    </p>
                    <a href="../auth/login.html?redirect=${currentUrl}" class="btn btn-primary" style="margin-top: 1rem;">
                        <i class="fa-solid fa-right-to-bracket"></i>
                        تسجيل الدخول
                    </a>
                    <a href="/" class="btn btn-secondary" style="margin-top: 0.5rem; background: #6b7280;">
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

    // تحديث عنوان الصفحة والـ meta tags ديناميكياً
    function updatePageMeta(survey) {
        const title = survey.title ? `${survey.title} — نادي أدِيب` : 'استبيان — نادي أدِيب';
        const description = survey.description || 'شارك في استبيان نادي أدِيب';
        const currentUrl = window.location.href;
        const baseUrl = window.location.origin;
        const imageUrl = `${baseUrl}/survey.png`;
        const logoUrl = `${baseUrl}/adeeb-logo.png`;

        // تحديث عنوان الصفحة
        document.title = title;
        
        // تحديث meta description
        const descMeta = document.querySelector('meta[name="description"]');
        if (descMeta) descMeta.setAttribute('content', description);

        // تحديث Open Graph
        const ogUrl = document.getElementById('ogUrl');
        const ogTitle = document.getElementById('ogTitle');
        const ogDescription = document.getElementById('ogDescription');
        const ogImage = document.getElementById('ogImage');
        
        if (ogUrl) ogUrl.setAttribute('content', currentUrl);
        if (ogTitle) ogTitle.setAttribute('content', title);
        if (ogDescription) ogDescription.setAttribute('content', description);
        if (ogImage) ogImage.setAttribute('content', imageUrl);

        // تحديث Twitter Cards
        const twitterTitle = document.getElementById('twitterTitle');
        const twitterDescription = document.getElementById('twitterDescription');
        const twitterImage = document.getElementById('twitterImage');
        
        if (twitterTitle) twitterTitle.setAttribute('content', title);
        if (twitterDescription) twitterDescription.setAttribute('content', description);
        if (twitterImage) twitterImage.setAttribute('content', imageUrl);
    }

    // تصدير الدوال للاستخدام الخارجي
    window.surveyApp = {
        showResults
    };

    document.addEventListener('DOMContentLoaded', init);
})();
